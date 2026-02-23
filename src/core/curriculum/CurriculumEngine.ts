/**
 * CurriculumEngine — AI-powered session planner
 *
 * Takes a LearnerProfile + mastered skills → generates a daily session plan
 * with warm-up, lesson, and challenge exercises. Replaces static lesson
 * ordering with dynamic, adaptive paths.
 *
 * Pure TypeScript — no React imports.
 */

import type { LearnerProfileData } from '../../stores/learnerProfileStore';
import type { SkillMasteryRecord } from '../../stores/types';
import {
  SKILL_TREE,
  getAvailableSkills,
  getSkillById,
  getSkillDepth,
  getSkillsNeedingReview,
  type SkillNode,
} from './SkillTree';
import { getExercise, getLessons, getLessonExercises } from '../../content/ContentLoader';
import { midiToNoteName } from '../music/MusicTheory';

// ============================================================================
// Types
// ============================================================================

export type SessionType = 'new-material' | 'review' | 'challenge' | 'mixed';

export interface ExerciseRef {
  exerciseId: string;
  source: 'static' | 'ai' | 'ai-with-fallback';
  skillNodeId: string;
  reason: string;
  fallbackExerciseId?: string;  // Static exercise ID for offline fallback
}

export interface SessionPlan {
  sessionType: SessionType;
  warmUp: ExerciseRef[];
  lesson: ExerciseRef[];
  challenge: ExerciseRef[];
  reasoning: string[];
}

// ============================================================================
// Session Plan Generation
// ============================================================================

/**
 * Select what type of session to generate based on the learner's state.
 *
 * - Every 5th session is a challenge day
 * - If 3+ skills have decayed, prioritize review
 * - If 1-2 skills decayed, mix review with new material
 * - Otherwise, teach new material
 */
export function selectSessionType(
  masteredSkills: string[],
  skillMasteryData: Record<string, SkillMasteryRecord>,
  totalExercisesCompleted: number
): SessionType {
  // Every 5th session is a challenge day (exercises 5, 10, 15, ...)
  if (totalExercisesCompleted > 0 && totalExercisesCompleted % 5 === 0) return 'challenge';

  const decayed = getSkillsNeedingReview(masteredSkills, skillMasteryData);
  if (decayed.length >= 3) return 'review';
  if (decayed.length >= 1) return 'mixed';

  return 'new-material';
}

/**
 * Generate a practice session plan based on the learner's current profile
 * and mastered skills.
 *
 * Session types:
 * - new-material: warm-up + lesson (next skill) + challenge
 * - review: warm-up + review exercises from decayed skills + 1 new-material
 * - challenge: warm-up + challenge exercises from deepest skills + tempo push
 * - mixed: 1 review exercise + 1 new skill exercise + 1 challenge
 */
export function generateSessionPlan(
  profile: LearnerProfileData,
  masteredSkills: string[]
): SessionPlan {
  const reasoning: string[] = [];
  const recentSet = new Set(profile.recentExerciseIds ?? []);
  const sessionType = selectSessionType(
    masteredSkills,
    profile.skillMasteryData ?? {},
    profile.totalExercisesCompleted
  );

  let warmUp: ExerciseRef[];
  let lesson: ExerciseRef[];
  let challenge: ExerciseRef[];

  switch (sessionType) {
    case 'review': {
      reasoning.push(`Review day: ${getSkillsNeedingReview(masteredSkills, profile.skillMasteryData ?? {}).length} skills need refreshing`);
      warmUp = generateWarmUp(profile, masteredSkills, reasoning, recentSet);
      lesson = generateReviewLesson(profile, masteredSkills, reasoning, recentSet);
      // Add 1 new-material exercise at end
      const newMaterial = generateLesson(profile, masteredSkills, [], recentSet);
      if (newMaterial.length > 0) {
        lesson.push(newMaterial[0]);
        reasoning.push(`Plus new material: ${newMaterial[0].reason}`);
      }
      challenge = generateChallenge(profile, masteredSkills, reasoning, recentSet);
      break;
    }
    case 'challenge': {
      reasoning.push('Challenge day!');
      warmUp = generateWarmUp(profile, masteredSkills, reasoning, recentSet);
      lesson = generateLesson(profile, masteredSkills, reasoning, recentSet);
      challenge = generateChallenge(profile, masteredSkills, reasoning, recentSet);
      // Add extra challenge exercise
      const extraChallenge = generateChallenge(profile, masteredSkills, [], recentSet);
      if (extraChallenge.length > 0 && !challenge.some((c) => c.exerciseId === extraChallenge[0].exerciseId)) {
        challenge.push(extraChallenge[0]);
      }
      break;
    }
    case 'mixed': {
      reasoning.push('Today: new material + review');
      warmUp = generateWarmUp(profile, masteredSkills, reasoning, recentSet);
      // 1 review exercise
      const reviewExercises = generateReviewLesson(profile, masteredSkills, reasoning, recentSet);
      // 1 new skill exercise
      const newExercises = generateLesson(profile, masteredSkills, reasoning, recentSet);
      lesson = [];
      if (reviewExercises.length > 0) lesson.push(reviewExercises[0]);
      if (newExercises.length > 0) lesson.push(newExercises[0]);
      challenge = generateChallenge(profile, masteredSkills, reasoning, recentSet);
      break;
    }
    default: {
      // new-material
      warmUp = generateWarmUp(profile, masteredSkills, reasoning, recentSet);
      lesson = generateLesson(profile, masteredSkills, reasoning, recentSet);
      challenge = generateChallenge(profile, masteredSkills, reasoning, recentSet);
      break;
    }
  }

  return { sessionType, warmUp, lesson, challenge, reasoning };
}

/**
 * Get the next skill the learner should work on.
 * Uses BFS through the skill tree, prioritizing lower-depth nodes.
 */
export function getNextSkillToLearn(masteredSkills: string[]): SkillNode | null {
  const available = getAvailableSkills(masteredSkills);
  if (available.length === 0) return null;

  // Sort by depth (shallowest first), then by category priority
  const categoryPriority: Record<string, number> = {
    'note-finding': 0,
    intervals: 1,
    rhythm: 2,
    scales: 3,
    'black-keys': 4,
    'key-signatures': 5,
    chords: 6,
    'hand-independence': 7,
    arpeggios: 8,
    expression: 9,
    'sight-reading': 10,
    songs: 11,
  };

  return available.sort((a, b) => {
    const depthDiff = getSkillDepth(a.id) - getSkillDepth(b.id);
    if (depthDiff !== 0) return depthDiff;
    return (categoryPriority[a.category] ?? 99) - (categoryPriority[b.category] ?? 99);
  })[0];
}

/**
 * Check if a static anchor lesson should be unlocked based on mastered skills.
 * Anchor lessons are milestone lessons (1-6) that serve as checkpoints.
 */
export function shouldUnlockAnchorLesson(
  _profile: LearnerProfileData,
  masteredSkills: string[]
): string | null {
  const lessonPrereqs: Record<string, string[]> = {
    'lesson-01': [],
    'lesson-02': ['find-middle-c', 'keyboard-geography', 'white-keys'],
    'lesson-03': ['rh-cde', 'rh-cdefg'],
    'lesson-04': ['c-position-review', 'lh-scale-descending', 'steady-bass'],
    'lesson-05': ['both-hands-review'],
    'lesson-06': ['scale-review', 'both-hands-review'],
    // Tier 7-8 (future content — unreachable until lessons are added to ContentLoader)
    'lesson-07': ['beginner-songs', 'intermediate-songs'],
    'lesson-08': ['find-black-keys', 'half-steps-whole-steps'],
    'lesson-09': ['g-major-hands'],
    // Tier 9
    'lesson-10': ['key-signature-reading'],
    'lesson-11': ['a-minor-melodies'],
    'lesson-12': ['minor-vs-major'],
    // Tier 10
    'lesson-13': ['minor-songs'],
    'lesson-14': ['minor-triads', 'major-triads-root'],
    'lesson-15': ['progression-i-v-vi-iv'],
    // Tier 11
    'lesson-16': ['chord-transitions'],
    'lesson-17': ['syncopation-intro'],
    'lesson-18': ['6-8-time'],
    // Tier 12-13
    'lesson-19': ['mixed-rhythms'],
    'lesson-20': ['hands-arpeggio'],
    'lesson-21': ['expressive-songs'],
    // Tier 14-15
    'lesson-22': ['bb-major-scale', 'd-major-scale'],
    'lesson-23': ['sight-reading-mixed'],
    'lesson-24': ['intermediate-pop', 'intermediate-classical'],
  };

  const masteredSet = new Set(masteredSkills);
  const lessons = getLessons();

  for (const lesson of lessons) {
    const prereqs = lessonPrereqs[lesson.id] ?? [];
    const allMet = prereqs.every((p) => masteredSet.has(p));
    if (allMet) {
      // Check if the lesson has unmastered exercises
      const exercises = getLessonExercises(lesson.id);
      const hasUnmastered = exercises.some((ex) => {
        const skillNodes = SKILL_TREE.filter((n) =>
          n.targetExerciseIds.includes(ex.id)
        );
        return skillNodes.some((n) => !masteredSet.has(n.id));
      });
      if (hasUnmastered) return lesson.id;
    }
  }
  return null;
}

// ============================================================================
// Internal Generators
// ============================================================================

function generateWarmUp(
  profile: LearnerProfileData,
  masteredSkills: string[],
  reasoning: string[],
  recentSet: Set<string> = new Set()
): ExerciseRef[] {
  const refs: ExerciseRef[] = [];

  // Strategy 1: AI warm-up targeting weak notes from a mastered skill
  if (profile.weakNotes.length > 0 && masteredSkills.length > 0) {
    // Find the mastered skill whose notes overlap with weak notes
    for (const skillId of [...masteredSkills].reverse()) {
      const skill = getSkillById(skillId);
      if (skill) {
        refs.push(makeAIRef(skill, `Warm-up targets weak notes: ${profile.weakNotes.slice(0, 3).map(midiToNoteName).join(', ')}`, recentSet));
        reasoning.push(
          `Warm-up targets weak notes: ${profile.weakNotes.slice(0, 3).map(midiToNoteName).join(', ')}`
        );
        break;
      }
    }
  }

  // Strategy 2: AI review of a recently mastered skill
  if (refs.length < 2 && masteredSkills.length > 0) {
    const recentSkillId = masteredSkills[masteredSkills.length - 1];
    const recentSkill = getSkillById(recentSkillId);
    if (recentSkill && !refs.some((r) => r.skillNodeId === recentSkillId)) {
      refs.push(makeAIRef(recentSkill, `Review recently learned: ${recentSkill.name}`, recentSet));
      reasoning.push(`Warm-up reviews recent skill: ${recentSkill.name}`);
    }
  }

  // Fallback: AI exercise for the root skill (find-middle-c)
  if (refs.length === 0) {
    const rootSkill = getSkillById('find-middle-c');
    if (rootSkill) {
      refs.push(makeAIRef(rootSkill, 'Basic warm-up: Find Middle C', recentSet));
    } else {
      refs.push({
        exerciseId: 'lesson-01-ex-01',
        source: 'static',
        skillNodeId: 'find-middle-c',
        reason: 'Basic warm-up: Find Middle C',
      });
    }
    reasoning.push('Warm-up fallback: Find Middle C');
  }

  return refs;
}

function generateLesson(
  _profile: LearnerProfileData,
  masteredSkills: string[],
  reasoning: string[],
  _recentSet: Set<string> = new Set()
): ExerciseRef[] {
  const refs: ExerciseRef[] = [];
  const nextSkill = getNextSkillToLearn(masteredSkills);

  if (!nextSkill) {
    reasoning.push('All skills mastered — lesson uses AI-generated review');
    // Pick the deepest mastered skill for a varied review
    const deepest = [...masteredSkills]
      .map((id) => getSkillById(id))
      .filter(Boolean)
      .sort((a, b) => getSkillDepth(b!.id) - getSkillDepth(a!.id))[0];
    if (deepest) {
      refs.push(makeAIRef(deepest, 'All skills mastered, generating review exercise', _recentSet));
    } else {
      refs.push({
        exerciseId: 'ai-generated',
        source: 'ai',
        skillNodeId: 'review',
        reason: 'All skills mastered, generating review exercise',
      });
    }
    return refs;
  }

  reasoning.push(`Lesson focuses on: ${nextSkill.name} (${nextSkill.category})`);

  // AI-first: generate exercise for this skill, with static fallback
  refs.push(makeAIRef(nextSkill, `Learn: ${nextSkill.name}`, _recentSet));

  // Add a parallel skill's AI exercise if available
  if (refs.length < 2) {
    const available = getAvailableSkills(masteredSkills);
    const parallel = available.find((s) => s.id !== nextSkill.id);
    if (parallel) {
      refs.push(makeAIRef(parallel, `Also working on: ${parallel.name}`, _recentSet));
      reasoning.push(`Parallel skill added: ${parallel.name}`);
    }
  }

  return refs;
}

function generateReviewLesson(
  profile: LearnerProfileData,
  masteredSkills: string[],
  reasoning: string[],
  recentSet: Set<string> = new Set()
): ExerciseRef[] {
  const refs: ExerciseRef[] = [];
  const decayed = getSkillsNeedingReview(masteredSkills, profile.skillMasteryData ?? {});

  for (const skill of decayed.slice(0, 3)) {
    // AI-first review: generate fresh exercise for the decayed skill
    refs.push(makeAIRef(skill, `Review: ${skill.name} (skill needs refreshing)`, recentSet));
  }

  if (refs.length > 0) {
    reasoning.push(`Reviewing ${refs.length} decayed skill${refs.length > 1 ? 's' : ''}: ${refs.map((r) => r.skillNodeId).join(', ')}`);
  }

  return refs;
}

function generateChallenge(
  profile: LearnerProfileData,
  masteredSkills: string[],
  reasoning: string[],
  _recentSet: Set<string> = new Set()
): ExerciseRef[] {
  const refs: ExerciseRef[] = [];

  // Find the deepest available skill for a challenge
  const available = getAvailableSkills(masteredSkills);
  const deeper = available
    .sort((a, b) => getSkillDepth(b.id) - getSkillDepth(a.id));

  if (deeper.length > 0) {
    const challengeSkill = deeper[0];
    refs.push(makeAIRef(challengeSkill, `Challenge: ${challengeSkill.name}`, _recentSet));
    reasoning.push(`Challenge targets advanced skill: ${challengeSkill.name}`);
  }

  // Fallback: AI-generated challenge at higher tempo using the most recently mastered skill
  if (refs.length === 0) {
    const tempoStr = `${profile.tempoRange.max + 10} BPM`;
    const deepestMastered = [...masteredSkills]
      .map((id) => getSkillById(id))
      .filter(Boolean)
      .sort((a, b) => getSkillDepth(b!.id) - getSkillDepth(a!.id))[0];
    if (deepestMastered) {
      refs.push(makeAIRef(deepestMastered, `Tempo challenge at ${tempoStr}`, _recentSet));
    } else {
      refs.push({
        exerciseId: 'ai-generated',
        source: 'ai',
        skillNodeId: 'tempo-challenge',
        reason: `Tempo challenge at ${tempoStr}`,
      });
    }
    reasoning.push(`Challenge: AI exercise at elevated tempo (${tempoStr})`);
  }

  return refs;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build an AI-first exercise reference for a skill node.
 * Attaches the best static exercise ID as fallback for offline use.
 */
function makeAIRef(
  skill: SkillNode,
  reason: string,
  recentSet: Set<string> = new Set()
): ExerciseRef {
  const fallback = skill.targetExerciseIds.find((id) => !recentSet.has(id) && getExercise(id))
    ?? skill.targetExerciseIds.find((id) => getExercise(id));
  return {
    exerciseId: `ai-skill-${skill.id}`,
    source: 'ai-with-fallback',
    skillNodeId: skill.id,
    reason,
    fallbackExerciseId: fallback ?? undefined,
  };
}


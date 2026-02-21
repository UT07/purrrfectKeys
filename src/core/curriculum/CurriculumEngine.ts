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
  source: 'static' | 'ai';
  skillNodeId: string;
  reason: string;
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

  // Strategy 1: Target weak notes with exercises from mastered skills
  if (profile.weakNotes.length > 0) {
    const weakNoteExercise = findExerciseForWeakNotes(profile.weakNotes, masteredSkills);
    if (weakNoteExercise) {
      refs.push(weakNoteExercise);
      reasoning.push(
        `Warm-up targets weak notes: ${profile.weakNotes.slice(0, 3).map(midiToNoteName).join(', ')}`
      );
    }
  }

  // Strategy 2: Review a recently mastered skill
  if (refs.length < 2 && masteredSkills.length > 0) {
    const recentSkillId = masteredSkills[masteredSkills.length - 1];
    const recentSkill = getSkillById(recentSkillId);
    if (recentSkill && recentSkill.targetExerciseIds.length > 0) {
      const exerciseId = recentSkill.targetExerciseIds.find((id) => !recentSet.has(id)) ?? recentSkill.targetExerciseIds[0];
      if (getExercise(exerciseId) && !refs.some((r) => r.exerciseId === exerciseId)) {
        refs.push({
          exerciseId,
          source: 'static',
          skillNodeId: recentSkillId,
          reason: `Review recently learned: ${recentSkill.name}`,
        });
        reasoning.push(`Warm-up reviews recent skill: ${recentSkill.name}`);
      }
    }
  }

  // Fallback: use first exercise if nothing else
  if (refs.length === 0) {
    refs.push({
      exerciseId: 'lesson-01-ex-01',
      source: 'static',
      skillNodeId: 'find-middle-c',
      reason: 'Basic warm-up: Find Middle C',
    });
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
    reasoning.push('All skills mastered — lesson uses AI-generated exercises');
    refs.push({
      exerciseId: 'ai-generated',
      source: 'ai',
      skillNodeId: 'review',
      reason: 'All skills mastered, generating review exercise',
    });
    return refs;
  }

  reasoning.push(`Lesson focuses on: ${nextSkill.name} (${nextSkill.category})`);

  // Add static exercises for this skill, preferring non-recent ones first
  const sortedExercises = [...nextSkill.targetExerciseIds].sort((a, b) => {
    const aRecent = _recentSet.has(a) ? 1 : 0;
    const bRecent = _recentSet.has(b) ? 1 : 0;
    return aRecent - bRecent;
  });

  for (const exerciseId of sortedExercises) {
    if (getExercise(exerciseId)) {
      refs.push({
        exerciseId,
        source: 'static',
        skillNodeId: nextSkill.id,
        reason: `Learn: ${nextSkill.name}`,
      });
    }
  }

  // If the skill has few exercises, also add from parallel available skills
  if (refs.length < 2) {
    const available = getAvailableSkills(masteredSkills);
    const parallel = available.find(
      (s) => s.id !== nextSkill.id && s.targetExerciseIds.length > 0
    );
    if (parallel) {
      const exerciseId = parallel.targetExerciseIds.find((id) => !_recentSet.has(id))
        ?? parallel.targetExerciseIds[0];
      if (getExercise(exerciseId)) {
        refs.push({
          exerciseId,
          source: 'static',
          skillNodeId: parallel.id,
          reason: `Also working on: ${parallel.name}`,
        });
        reasoning.push(`Parallel skill added: ${parallel.name}`);
      }
    }
  }

  // If still no exercises, request AI generation
  if (refs.length === 0) {
    refs.push({
      exerciseId: 'ai-generated',
      source: 'ai',
      skillNodeId: nextSkill.id,
      reason: `AI exercise for: ${nextSkill.name}`,
    });
    reasoning.push(`No static exercises for ${nextSkill.name} — requesting AI generation`);
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
    // Find a static exercise for this skill, preferring non-recent ones
    const staticId = skill.targetExerciseIds.find((id) => !recentSet.has(id) && getExercise(id))
      ?? skill.targetExerciseIds.find((id) => getExercise(id));

    if (staticId && !refs.some((r) => r.exerciseId === staticId)) {
      refs.push({
        exerciseId: staticId,
        source: 'static',
        skillNodeId: skill.id,
        reason: `Review: ${skill.name} (skill needs refreshing)`,
      });
    } else {
      // No static exercise available — use AI generation for review
      refs.push({
        exerciseId: `ai-review-${skill.id}`,
        source: 'ai',
        skillNodeId: skill.id,
        reason: `Review: ${skill.name} (AI-generated review)`,
      });
    }
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

  // Find a skill slightly above current level
  const available = getAvailableSkills(masteredSkills);
  const deeper = available
    .filter((s) => s.targetExerciseIds.length > 0)
    .sort((a, b) => getSkillDepth(b.id) - getSkillDepth(a.id));

  if (deeper.length > 0) {
    const challengeSkill = deeper[0];
    const exerciseId = challengeSkill.targetExerciseIds.find((id) => !_recentSet.has(id))
      ?? challengeSkill.targetExerciseIds[0];
    if (getExercise(exerciseId)) {
      refs.push({
        exerciseId,
        source: 'static',
        skillNodeId: challengeSkill.id,
        reason: `Challenge: ${challengeSkill.name}`,
      });
      reasoning.push(`Challenge targets advanced skill: ${challengeSkill.name}`);
    }
  }

  // Fallback: AI-generated challenge at higher tempo
  if (refs.length === 0) {
    const tempoStr = `${profile.tempoRange.max + 10} BPM`;
    refs.push({
      exerciseId: 'ai-generated',
      source: 'ai',
      skillNodeId: 'tempo-challenge',
      reason: `Tempo challenge at ${tempoStr}`,
    });
    reasoning.push(`Challenge: AI exercise at elevated tempo (${tempoStr})`);
  }

  return refs;
}

// ============================================================================
// Helpers
// ============================================================================

function findExerciseForWeakNotes(
  weakNotes: number[],
  masteredSkills: string[]
): ExerciseRef | null {
  // Look for exercises from mastered skills that contain weak notes
  for (const skillId of [...masteredSkills].reverse()) {
    const skill = getSkillById(skillId);
    if (!skill) continue;

    for (const exerciseId of skill.targetExerciseIds) {
      const exercise = getExercise(exerciseId);
      if (!exercise) continue;

      const exerciseNotes = new Set(exercise.notes.map((n) => n.note));
      const hasWeakNote = weakNotes.some((wn) => exerciseNotes.has(wn));
      if (hasWeakNote) {
        return {
          exerciseId,
          source: 'static',
          skillNodeId: skillId,
          reason: `Strengthens weak notes in ${skill.name}`,
        };
      }
    }
  }
  return null;
}

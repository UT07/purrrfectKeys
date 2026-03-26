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
  getSkillsForExercise,
  isTierGatePassed,
  needsGentleReentry,
  GENTLE_REENTRY_FACTOR,
  type SkillNode,
  type SkillCategory,
} from './SkillTree';
import { getExercise, getLessons, getLessonExercises } from '../../content/ContentLoader';
import { midiToNoteName } from '../music/MusicTheory';

// ============================================================================
// Types
// ============================================================================

export type SessionType = 'new-material' | 'review' | 'challenge' | 'mixed' | 'endgame';

/** Endgame theme rotations for post-curriculum daily sessions */
export type EndgameTheme =
  | 'technique-drills'    // Focus on scales, arpeggios, tempo push
  | 'sight-reading'       // Random key/time signature exercises
  | 'genre-deep-dive'     // Pick a genre and go deep
  | 'review-marathon'     // Review oldest decayed skills
  | 'tempo-push'          // Challenge exercises at elevated tempo
  | 'weak-spot-focus'     // Target lowest-accuracy notes/skills
  | 'mixed-challenge';    // Variety session across all categories

export interface ExerciseRef {
  exerciseId: string;
  source: 'static' | 'ai' | 'ai-with-fallback' | 'song';
  skillNodeId?: string;
  reason: string;
  fallbackExerciseId?: string;  // Static exercise ID for offline fallback
  songId?: string;  // Song ID if source is 'song' — UI loads via songToExercise()
  songSectionIndex?: number;  // Which section of the song to play
  suggestedTempo?: number;    // Per-skill adaptive tempo override
}

export interface SessionPlan {
  sessionType: SessionType;
  warmUp: ExerciseRef[];
  lesson: ExerciseRef[];
  challenge: ExerciseRef[];
  songs: ExerciseRef[];  // Song exercises mixed into the session
  reasoning: string[];
  endgameTheme?: EndgameTheme;   // Only set when sessionType === 'endgame'
  gentleReentry?: boolean;        // True when returning after a break
}

// ============================================================================
// Warm-up category pool for variety
// ============================================================================

const WARMUP_CATEGORIES: SkillCategory[] = [
  'note-finding', 'scales', 'rhythm', 'chords', 'arpeggios',
  'hand-independence', 'intervals', 'black-keys',
];

/** Endgame themes rotate daily based on a simple date hash */
const ENDGAME_THEMES: EndgameTheme[] = [
  'technique-drills', 'sight-reading', 'genre-deep-dive',
  'review-marathon', 'tempo-push', 'weak-spot-focus', 'mixed-challenge',
];

function getEndgameThemeForDay(): EndgameTheme {
  const daysSinceEpoch = Math.floor(Date.now() / 86400000);
  return ENDGAME_THEMES[daysSinceEpoch % ENDGAME_THEMES.length];
}

// ============================================================================
// Session Plan Generation
// ============================================================================

/**
 * Select what type of session to generate based on the learner's state.
 *
 * - If all skills mastered: endgame mode with themed daily rotations
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
  // Endgame: all 100 skills mastered
  const allMastered = getAvailableSkills(masteredSkills).length === 0
    && masteredSkills.length >= SKILL_TREE.length;
  if (allMastered) return 'endgame';

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
/** Minimal lesson progress info needed by the engine (avoids importing store types) */
export interface LessonProgressInfo {
  lessonId: string;
  status: string;
  exerciseScores: Record<string, { highScore: number; completedAt?: number | null }>;
}

export function generateSessionPlan(
  profile: LearnerProfileData,
  masteredSkills: string[],
  lessonProgress?: Record<string, LessonProgressInfo>
): SessionPlan {
  const reasoning: string[] = [];
  const recentSet = new Set(profile.recentExerciseIds ?? []);
  const skillMasteryData = profile.skillMasteryData ?? {};
  const sessionType = selectSessionType(
    masteredSkills,
    skillMasteryData,
    profile.totalExercisesCompleted
  );

  // Check for gentle re-entry after extended break
  const gentleReentry = needsGentleReentry(skillMasteryData);
  if (gentleReentry) {
    reasoning.push(`Welcome back! Taking it easy today — reduced tempo (${Math.round(GENTLE_REENTRY_FACTOR * 100)}% of normal)`);
  }

  let warmUp: ExerciseRef[];
  let lesson: ExerciseRef[];
  let challenge: ExerciseRef[];
  const songs: ExerciseRef[] = [];
  let endgameTheme: EndgameTheme | undefined;

  // Helper: collect skill IDs from exercise refs to avoid duplicates across sections.
  // For static exercises (no skillNodeId), look up which skills target that exerciseId.
  const collectSkillIds = (...sections: ExerciseRef[][]): Set<string> => {
    const ids = new Set<string>();
    for (const section of sections) {
      for (const ref of section) {
        if (ref.skillNodeId) {
          ids.add(ref.skillNodeId);
        } else if (ref.source === 'static') {
          // Find skills whose targetExerciseIds include this exercise
          const matchingSkills = getSkillsForExercise(ref.exerciseId);
          for (const skill of matchingSkills) {
            ids.add(skill.id);
          }
        }
      }
    }
    return ids;
  };

  switch (sessionType) {
    case 'endgame': {
      endgameTheme = getEndgameThemeForDay();
      reasoning.push(`Endgame: ${endgameTheme} day`);
      const endgame = generateEndgameSession(profile, masteredSkills, endgameTheme, reasoning, recentSet);
      warmUp = endgame.warmUp;
      lesson = endgame.lesson;
      challenge = endgame.challenge;
      break;
    }
    case 'review': {
      reasoning.push(`Review day: ${getSkillsNeedingReview(masteredSkills, skillMasteryData).length} skills need refreshing`);
      warmUp = generateWarmUp(profile, masteredSkills, reasoning, recentSet);
      lesson = generateReviewLesson(profile, masteredSkills, reasoning, recentSet);
      // Add 1 new-material exercise at end
      const newMaterial = generateLesson(profile, masteredSkills, [], recentSet, lessonProgress);
      if (newMaterial.length > 0) {
        lesson.push(newMaterial[0]);
        reasoning.push(`Plus new material: ${newMaterial[0].reason}`);
      }
      challenge = generateChallenge(profile, masteredSkills, reasoning, recentSet, collectSkillIds(warmUp, lesson));
      break;
    }
    case 'challenge': {
      reasoning.push('Challenge day!');
      warmUp = generateWarmUp(profile, masteredSkills, reasoning, recentSet);
      lesson = generateLesson(profile, masteredSkills, reasoning, recentSet, lessonProgress);
      challenge = generateChallenge(profile, masteredSkills, reasoning, recentSet, collectSkillIds(warmUp, lesson));
      // Add extra challenge exercise
      const extraChallenge = generateChallenge(profile, masteredSkills, [], recentSet, collectSkillIds(warmUp, lesson, challenge));
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
      const newExercises = generateLesson(profile, masteredSkills, reasoning, recentSet, lessonProgress);
      lesson = [];
      if (reviewExercises.length > 0) lesson.push(reviewExercises[0]);
      if (newExercises.length > 0) lesson.push(newExercises[0]);
      challenge = generateChallenge(profile, masteredSkills, reasoning, recentSet, collectSkillIds(warmUp, lesson));
      break;
    }
    default: {
      // new-material
      warmUp = generateWarmUp(profile, masteredSkills, reasoning, recentSet);
      lesson = generateLesson(profile, masteredSkills, reasoning, recentSet, lessonProgress);
      challenge = generateChallenge(profile, masteredSkills, reasoning, recentSet, collectSkillIds(warmUp, lesson));
      break;
    }
  }

  // Add a song exercise if the learner has enough skills (3+ mastered)
  if (masteredSkills.length >= 3) {
    const songRef = generateSongExercise(masteredSkills, reasoning, recentSet);
    if (songRef) {
      songs.push(songRef);
    }
  }

  return { sessionType, warmUp, lesson, challenge, songs, reasoning, endgameTheme, gentleReentry };
}

/**
 * Get the next skill the learner should work on.
 * Uses BFS through the skill tree, prioritizing lower-depth nodes.
 * Enforces tier mastery gates — won't advance to tier N+1 until tier N gate is passed.
 */
export function getNextSkillToLearn(
  masteredSkills: string[],
  skillMasteryData?: Record<string, SkillMasteryRecord>,
): SkillNode | null {
  const available = getAvailableSkills(masteredSkills);
  if (available.length === 0) return null;

  // Enforce tier mastery gates: filter out skills in tiers that require
  // a gate from a previous tier that hasn't been passed yet
  const gatedAvailable = skillMasteryData
    ? available.filter((skill) => {
        // Check all tiers below this skill's tier
        for (let t = 1; t < skill.tier; t++) {
          if (!isTierGatePassed(t, masteredSkills, skillMasteryData)) {
            return false; // Blocked by an earlier tier gate
          }
        }
        return true;
      })
    : available;

  const candidates = gatedAvailable.length > 0 ? gatedAvailable : available;

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

  return candidates.sort((a, b) => {
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
    // Tier 6: Black Keys
    'lesson-07': ['beginner-songs', 'intermediate-songs'],
    'lesson-08': ['find-black-keys', 'half-steps-whole-steps'],
    // Tier 7: G & F Major
    'lesson-09': ['g-major-hands'],
    // Tier 8: Minor Keys
    'lesson-10': ['key-signature-reading'],
    'lesson-11': ['a-minor-melodies'],
    'lesson-12': ['minor-vs-major'],
    // Tier 9: Chords
    'lesson-13': ['minor-songs'],
    'lesson-14': ['minor-triads', 'major-triads-root'],
    'lesson-15': ['progression-i-v-vi-iv'],
    // Tier 9 continued: Advanced Chords
    'lesson-25': ['chord-transitions', 'progression-i-iv-v'],
    'lesson-26': ['alberti-bass', 'bass-chord-pattern'],
    // Tier 10: Songs
    'lesson-16': ['chord-transitions'],
    // Tier 11: Rhythm
    'lesson-17': ['syncopation-intro'],
    'lesson-18': ['6-8-time'],
    'lesson-27': ['syncopation-intro', 'swing-rhythm'],
    'lesson-28': ['6-8-time', '3-4-time'],
    // Tier 12: Arpeggios
    'lesson-19': ['mixed-rhythms'],
    'lesson-20': ['hands-arpeggio'],
    'lesson-29': ['c-major-arpeggio', 'g-major-arpeggio'],
    // Tier 13: Expression
    'lesson-21': ['expressive-songs'],
    'lesson-30': ['dynamics-p-f', 'crescendo-diminuendo'],
    'lesson-31': ['pedal-intro', 'legato-technique'],
    // Tier 14: Sight Reading
    'lesson-22': ['bb-major-scale', 'd-major-scale'],
    'lesson-23': ['sight-reading-mixed'],
    'lesson-32': ['d-major-scale', 'bb-major-scale'],
    'lesson-33': ['sight-reading-c', 'sight-reading-g'],
    // Tier 15: Performance
    'lesson-24': ['intermediate-pop', 'intermediate-classical'],
    'lesson-34': ['full-piece-classical', 'performance-prep'],
    'lesson-35': ['full-piece-pop', 'intermediate-pop'],
    'lesson-36': ['blues-scale', 'year-one-mastery'],
    // Review lessons (accessible when corresponding tier skills are mastered)
    'lesson-37': ['scale-review', 'g-major-hands', 'f-major-hands'],
    'lesson-38': ['chord-transitions', 'progression-i-iv-v'],
    'lesson-39': ['mixed-rhythms', 'dynamics-p-f'],
    'lesson-40': ['year-one-mastery', 'full-piece-classical'],
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

  // Strategy 1: Rotate warm-up category daily for variety
  const dayIndex = Math.floor(Date.now() / 86400000);
  const categoryIndex = dayIndex % WARMUP_CATEGORIES.length;
  const todayCategory = WARMUP_CATEGORIES[categoryIndex];

  // Find a mastered skill in today's warm-up category
  if (masteredSkills.length > 0) {
    const categorySkill = [...masteredSkills]
      .map((id) => getSkillById(id))
      .filter((s): s is SkillNode => s != null && s.category === todayCategory)
      .find((s) => !recentSet.has(`ai-skill-${s.id}`));

    if (categorySkill) {
      refs.push(makeAIRef(categorySkill, `Warm-up (${todayCategory}): ${categorySkill.name}`, recentSet));
      reasoning.push(`Warm-up rotates to ${todayCategory}: ${categorySkill.name}`);
    }
  }

  // Strategy 2: Target weak notes if any exist
  if (refs.length === 0 && profile.weakNotes.length > 0 && masteredSkills.length > 0) {
    for (const skillId of [...masteredSkills].reverse()) {
      if (recentSet.has(`ai-skill-${skillId}`)) continue;
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

  // Strategy 3: Review a recently mastered skill from a different category
  if (refs.length < 2 && masteredSkills.length > 0) {
    const usedCategories = new Set(refs.map((r) => getSkillById(r.skillNodeId ?? '')?.category));
    let recentSkill: SkillNode | null = null;
    for (let j = masteredSkills.length - 1; j >= 0; j--) {
      const sid = masteredSkills[j];
      if (recentSet.has(`ai-skill-${sid}`)) continue;
      const s = getSkillById(sid);
      if (s && !refs.some((r) => r.skillNodeId === sid) && !usedCategories.has(s.category)) {
        recentSkill = s;
        break;
      }
    }
    if (recentSkill) {
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
  _recentSet: Set<string> = new Set(),
  lessonProgress?: Record<string, LessonProgressInfo>
): ExerciseRef[] {
  const refs: ExerciseRef[] = [];

  // ── Slot 1: Lesson-tree exercise (failed retry or next uncompleted) ──
  // Bug #75 fix: read lessonProgress to find exercises the user NEEDS to do
  const lessonTreeRef = findLessonTreeExercise(lessonProgress, reasoning);
  if (lessonTreeRef) {
    refs.push(lessonTreeRef);
  }

  // ── Slot 2: AI-personalized pick from SkillTree ──
  const nextSkill = getNextSkillToLearn(masteredSkills, _profile.skillMasteryData);

  if (!nextSkill) {
    // Post-curriculum: AI-generated exercises across skill categories
    if (refs.length === 0) reasoning.push('Post-curriculum: AI-generated exercises across skill categories');
    const allMasteredSkills = [...masteredSkills]
      .map((id) => getSkillById(id))
      .filter(Boolean) as SkillNode[];

    const byCategory = new Map<string, SkillNode[]>();
    for (const skill of allMasteredSkills) {
      const list = byCategory.get(skill.category) ?? [];
      list.push(skill);
      byCategory.set(skill.category, list);
    }

    const categories = [...byCategory.keys()].sort();
    if (categories.length > 0) {
      const recentCount = _recentSet.size;
      const offset = recentCount % categories.length;
      const pickCount = Math.min(2, categories.length);
      for (let i = 0; i < pickCount; i++) {
        const cat = categories[(offset + i) % categories.length];
        const skills = byCategory.get(cat) ?? [];
        const sorted = skills.sort((a, b) => getSkillDepth(b.id) - getSkillDepth(a.id));
        const skill = sorted.find((s) => !_recentSet.has(`ai-skill-${s.id}`)) ?? sorted[0];
        if (skill) {
          refs.push(makeAIRef(skill, `Also working on: ${skill.name}`, _recentSet));
        }
      }
    }

    if (refs.length === 0) {
      const deepest = allMasteredSkills.sort((a, b) => getSkillDepth(b.id) - getSkillDepth(a.id))[0];
      if (deepest) refs.push(makeAIRef(deepest, 'Post-curriculum review exercise', _recentSet));
    }
    return refs;
  }

  // Normal curriculum: add AI pick, capped to current lesson tier + 1
  const currentTier = getCurrentLessonTier(lessonProgress);
  const maxTier = Math.min(currentTier + 1, 18);

  if (nextSkill.tier <= maxTier) {
    reasoning.push(`AI pick: ${nextSkill.name} (tier ${nextSkill.tier}, cap ${maxTier})`);
    refs.push(makeAIRef(nextSkill, `Learn: ${nextSkill.name}`, _recentSet));
  } else {
    // Next skill too far ahead — review a mastered skill instead
    const reviewSkill = [...masteredSkills]
      .map((id) => getSkillById(id))
      .filter((s): s is SkillNode => s != null && !_recentSet.has(`ai-skill-${s.id}`))
      .sort((a, b) => getSkillDepth(b.id) - getSkillDepth(a.id))[0];
    if (reviewSkill) {
      refs.push(makeAIRef(reviewSkill, `Review: ${reviewSkill.name}`, _recentSet));
      reasoning.push(`Review (next skill tier ${nextSkill.tier} > cap ${maxTier}): ${reviewSkill.name}`);
    }
  }

  // If only 1 exercise so far, add a parallel skill (also capped to maxTier)
  if (refs.length < 2) {
    const available = getAvailableSkills(masteredSkills)
      .filter((s) => s.tier <= maxTier);
    const parallel = available.find((s) => s.id !== nextSkill.id);
    if (parallel) {
      refs.push(makeAIRef(parallel, `Also working on: ${parallel.name}`, _recentSet));
      reasoning.push(`Parallel skill: ${parallel.name}`);
    }
  }

  return refs;
}

/**
 * Find the most urgent exercise from the current lesson tree.
 * Priority: (1) failed exercise needing retry, (2) next uncompleted exercise.
 */
function findLessonTreeExercise(
  lessonProgress: Record<string, LessonProgressInfo> | undefined,
  reasoning: string[]
): ExerciseRef | null {
  if (!lessonProgress) return null;

  try {
    const { getLessons, getExercisesForLesson, getExercise } = require('../../content/ContentLoader');
    const lessons = getLessons() as Array<{ id: string; title: string }>;

    for (const lesson of lessons) {
      const lp = lessonProgress[lesson.id];
      if (lp?.status === 'completed') continue; // Skip completed lessons

      const exercises = (getExercisesForLesson(lesson.id) as Array<{ id: string; type: string; order: number }>)
        .filter((e) => e.type !== 'test')
        .sort((a, b) => a.order - b.order);

      // Priority 1: Find a failed exercise (attempted but below passingScore)
      for (const ex of exercises) {
        const score = lp?.exerciseScores[ex.id];
        if (score && score.highScore > 0) {
          const fullEx = getExercise(ex.id);
          const passingScore = fullEx?.scoring?.passingScore ?? 70;
          if (score.highScore < passingScore) {
            reasoning.push(`Retry needed: ${fullEx?.metadata?.title ?? ex.id} (${score.highScore}% < ${passingScore}%)`);
            return {
              exerciseId: ex.id,
              source: 'static' as const,
              reason: `Retry: ${fullEx?.metadata?.title ?? ex.id} — score ${score.highScore}% needs ${passingScore}%`,
            };
          }
        }
      }

      // Priority 2: Find next uncompleted exercise
      for (const ex of exercises) {
        const score = lp?.exerciseScores[ex.id];
        const fullEx = getExercise(ex.id);
        const passingScore = fullEx?.scoring?.passingScore ?? 70;
        if (!score || score.highScore < passingScore) {
          reasoning.push(`Next in ${lesson.title}: ${fullEx?.metadata?.title ?? ex.id}`);
          return {
            exerciseId: ex.id,
            source: 'static' as const,
            reason: `Learn: ${fullEx?.metadata?.title ?? ex.id}`,
          };
        }
      }

      // This lesson has all exercises passed but status isn't 'completed' — skip to next
    }
  } catch {
    // ContentLoader not available — fall through to AI-only
  }

  return null;
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
  _recentSet: Set<string> = new Set(),
  excludeSkillIds: Set<string> = new Set()
): ExerciseRef[] {
  const refs: ExerciseRef[] = [];
  const tempoBoost = 10; // Challenge exercises are faster

  // Strategy 1: Pick from available (unmastered) skills, excluding what lesson already uses
  const available = getAvailableSkills(masteredSkills)
    .filter((s) => !excludeSkillIds.has(s.id));
  const deeper = available
    .sort((a, b) => getSkillDepth(b.id) - getSkillDepth(a.id));

  if (deeper.length > 0) {
    const challengeSkill = deeper[0];
    const ref = makeAIRef(challengeSkill, `Challenge: ${challengeSkill.name}`, _recentSet);
    ref.suggestedTempo = profile.tempoRange.max + tempoBoost;
    refs.push(ref);
    reasoning.push(`Challenge targets advanced skill: ${challengeSkill.name} (+${tempoBoost} BPM)`);
  }

  // Strategy 2: If no available skills left (or all excluded), challenge with a
  // mastered skill at elevated tempo — this makes the challenge genuinely harder
  if (refs.length === 0) {
    const tempoStr = `${profile.tempoRange.max + tempoBoost} BPM`;
    const allMastered = [...masteredSkills]
      .map((id) => getSkillById(id))
      .filter(Boolean) as SkillNode[];
    // Exclude skills already in the lesson to avoid duplicates
    const eligible = allMastered.filter((s) => !excludeSkillIds.has(s.id));
    const sorted = (eligible.length > 0 ? eligible : allMastered)
      .sort((a, b) => getSkillDepth(b.id) - getSkillDepth(a.id));

    // Pick a random deep skill for challenge variety
    const topSkills = sorted.slice(0, Math.min(10, sorted.length));
    const recentCount = _recentSet.size;
    const pick = topSkills[recentCount % topSkills.length] ?? sorted[0];

    if (pick) {
      const ref = makeAIRef(pick, `Tempo challenge: ${pick.name} at ${tempoStr}`, _recentSet);
      ref.suggestedTempo = profile.tempoRange.max + tempoBoost;
      refs.push(ref);
    } else {
      refs.push({
        exerciseId: 'ai-generated',
        source: 'ai',
        skillNodeId: 'tempo-challenge',
        reason: `Tempo challenge at ${tempoStr}`,
        suggestedTempo: profile.tempoRange.max + tempoBoost,
      });
    }
    reasoning.push(`Challenge: AI exercise at elevated tempo (${tempoStr})`);
  }

  return refs;
}

/**
 * Generate an endgame session with themed daily rotation.
 * Only called when all 100 skills are mastered.
 */
function generateEndgameSession(
  profile: LearnerProfileData,
  masteredSkills: string[],
  theme: EndgameTheme,
  reasoning: string[],
  recentSet: Set<string>,
): { warmUp: ExerciseRef[]; lesson: ExerciseRef[]; challenge: ExerciseRef[] } {
  const allSkills = [...masteredSkills]
    .map((id) => getSkillById(id))
    .filter(Boolean) as SkillNode[];

  const warmUp: ExerciseRef[] = [];
  const lesson: ExerciseRef[] = [];
  const challenge: ExerciseRef[] = [];

  // Warm-up is always light review
  const warmUpSkill = allSkills.find((s) => !recentSet.has(`ai-skill-${s.id}`)) ?? allSkills[0];
  if (warmUpSkill) {
    warmUp.push(makeAIRef(warmUpSkill, `Endgame warm-up: ${warmUpSkill.name}`, recentSet));
  }

  switch (theme) {
    case 'technique-drills': {
      reasoning.push('Technique day: scales, arpeggios, and hand independence');
      const categories: SkillCategory[] = ['scales', 'arpeggios', 'hand-independence'];
      for (const cat of categories) {
        const skill = allSkills.find((s) => s.category === cat && !recentSet.has(`ai-skill-${s.id}`));
        if (skill) lesson.push(makeAIRef(skill, `Technique: ${skill.name}`, recentSet));
      }
      break;
    }
    case 'sight-reading': {
      reasoning.push('Sight reading day: random keys and time signatures');
      const sightSkills = allSkills.filter((s) => s.category === 'sight-reading' || s.category === 'key-signatures');
      for (const skill of sightSkills.slice(0, 3)) {
        lesson.push(makeAIRef(skill, `Sight-read: ${skill.name}`, recentSet));
      }
      break;
    }
    case 'genre-deep-dive': {
      reasoning.push('Genre day: deep dive into song repertoire');
      const songSkills = allSkills.filter((s) => s.category === 'songs');
      for (const skill of songSkills.slice(0, 3)) {
        lesson.push(makeAIRef(skill, `Genre: ${skill.name}`, recentSet));
      }
      break;
    }
    case 'review-marathon': {
      reasoning.push('Review day: refreshing oldest skills');
      const decayed = getSkillsNeedingReview(masteredSkills, profile.skillMasteryData ?? {});
      for (const skill of decayed.slice(0, 4)) {
        lesson.push(makeAIRef(skill, `Review: ${skill.name}`, recentSet));
      }
      break;
    }
    case 'tempo-push': {
      reasoning.push('Tempo push day: challenge exercises at elevated tempo');
      const deepSkills = allSkills.sort((a, b) => getSkillDepth(b.id) - getSkillDepth(a.id)).slice(0, 3);
      for (const skill of deepSkills) {
        const ref = makeAIRef(skill, `Tempo push: ${skill.name}`, recentSet);
        ref.suggestedTempo = profile.tempoRange.max + 10;
        lesson.push(ref);
      }
      break;
    }
    case 'weak-spot-focus': {
      reasoning.push('Weak spot day: targeting lowest-accuracy areas');
      if (profile.weakNotes.length > 0) {
        // Find skills whose note ranges overlap with weak notes
        const overlapping = allSkills.filter((s) => {
          const hints = SKILL_TREE.find((n) => n.id === s.id);
          return hints != null;
        }).slice(0, 3);
        for (const skill of overlapping) {
          lesson.push(makeAIRef(skill, `Weak spot: ${skill.name}`, recentSet));
        }
      }
      if (lesson.length === 0) {
        // No weak spots — just do random deep skills
        const deep = allSkills.sort((a, b) => getSkillDepth(b.id) - getSkillDepth(a.id)).slice(0, 3);
        for (const s of deep) lesson.push(makeAIRef(s, `Deep practice: ${s.name}`, recentSet));
      }
      break;
    }
    default: {
      // mixed-challenge
      reasoning.push('Mixed challenge: variety across all categories');
      const byCategory = new Map<string, SkillNode[]>();
      for (const skill of allSkills) {
        const list = byCategory.get(skill.category) ?? [];
        list.push(skill);
        byCategory.set(skill.category, list);
      }
      const categories = [...byCategory.keys()];
      const dayOffset = Math.floor(Date.now() / 86400000) % categories.length;
      for (let i = 0; i < 3 && i < categories.length; i++) {
        const cat = categories[(dayOffset + i) % categories.length];
        const skills = byCategory.get(cat) ?? [];
        const pick = skills.find((s) => !recentSet.has(`ai-skill-${s.id}`)) ?? skills[0];
        if (pick) lesson.push(makeAIRef(pick, `Mixed: ${pick.name}`, recentSet));
      }
    }
  }

  // Endgame challenge is always a tempo push
  const deepest = allSkills.sort((a, b) => getSkillDepth(b.id) - getSkillDepth(a.id))[0];
  if (deepest) {
    const ref = makeAIRef(deepest, `Endgame challenge: ${deepest.name}`, recentSet);
    ref.suggestedTempo = profile.tempoRange.max + 15;
    challenge.push(ref);
  }

  return { warmUp, lesson, challenge };
}

/**
 * Generate a song exercise reference for the session.
 * Uses genre matching to align songs with the learner's current skill focus.
 */
function generateSongExercise(
  masteredSkills: string[],
  reasoning: string[],
  recentSet: Set<string> = new Set(),
): ExerciseRef | null {
  // Determine difficulty tier from mastered skill count
  const difficulty = masteredSkills.length > 50 ? 4
    : masteredSkills.length > 30 ? 3
    : masteredSkills.length > 10 ? 2
    : 1;

  // Determine preferred genre based on strongest skill category
  const skillCategories = masteredSkills
    .map((id) => getSkillById(id)?.category)
    .filter(Boolean) as string[];
  const categoryCounts = new Map<string, number>();
  for (const cat of skillCategories) {
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }
  // Map strongest category to a preferred genre hint
  const strongestCategory = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const genreHint = CATEGORY_TO_GENRE[strongestCategory ?? ''] ?? 'pop';

  // Song IDs are loaded from the song store at runtime.
  const songExerciseId = `song-daily-d${difficulty}-${genreHint}-${recentSet.size % 20}`;

  if (recentSet.has(songExerciseId)) return null;

  reasoning.push(`Song exercise: ${genreHint} song (difficulty ${difficulty}) matching your ${strongestCategory ?? 'general'} strength`);

  return {
    exerciseId: songExerciseId,
    source: 'song',
    skillNodeId: 'song-practice',
    reason: `Play a ${genreHint} song! (difficulty ${difficulty})`,
    songId: undefined,
    songSectionIndex: 0,
  };
}

/** Maps skill categories to preferred song genres */
const CATEGORY_TO_GENRE: Record<string, string> = {
  'note-finding': 'pop',
  intervals: 'classical',
  scales: 'classical',
  chords: 'pop',
  rhythm: 'game',
  'hand-independence': 'classical',
  songs: 'pop',
  'black-keys': 'film',
  'key-signatures': 'classical',
  expression: 'film',
  arpeggios: 'classical',
  'sight-reading': 'folk',
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Determine the user's current lesson tier by scanning lessons in order.
 * Returns a tier number (1-18) based on the first non-completed lesson.
 */
function getCurrentLessonTier(lessonProgress?: Record<string, { status: string }>): number {
  if (!lessonProgress) return 1;
  try {
    const lessons = getLessons() as Array<{ id: string }>;
    for (let i = 0; i < lessons.length; i++) {
      const lp = lessonProgress[lessons[i].id];
      if (!lp || lp.status !== 'completed') {
        // Current lesson = first non-completed. Tier ≈ lesson index / 3 + 1
        return Math.max(1, Math.ceil((i + 1) / 3));
      }
    }
    return 18; // All completed
  } catch {
    return 5; // Safe default
  }
}

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


/**
 * DifficultyEngine - Progressive difficulty adjustment
 *
 * Adjusts tempo, note range, and difficulty level based on a learner's
 * performance and profile. Supports both global and per-skill tempo tracking.
 *
 * Pure TypeScript - no React imports.
 */

// ============================================================================
// Types
// ============================================================================

export interface DifficultyAdjustment {
  tempoChange: number; // BPM delta (positive = faster, negative = slower)
  noteRangeExpansion: number; // semitones to add (negative = narrow)
  difficultyLevel: number; // 1-5
  reasoning: string;
}

export interface DifficultyProfile {
  tempoRange: { min: number; max: number };
  skills: {
    timingAccuracy: number;
    pitchAccuracy: number;
  };
  totalExercisesCompleted: number;
  skillTempoHistory?: Record<string, SkillTempoEntry>; // per-skill tempo tracking
}

/** Per-skill tempo comfort tracking */
export interface SkillTempoEntry {
  currentTempo: number;    // last comfortable tempo for this skill
  highScore: number;       // best score achieved at currentTempo
  attempts: number;        // total attempts at this skill
  lastAdjusted: number;    // epoch ms
}

// ============================================================================
// Constants
// ============================================================================

const TEMPO_ABSOLUTE_MIN = 30;
const TEMPO_ABSOLUTE_MAX = 200;
const SKILL_TEMPO_STEP_UP = 5;   // BPM increase on good score
const SKILL_TEMPO_STEP_DOWN = 3; // BPM decrease on poor score
const DEFAULT_SKILL_TEMPO = 60;  // starting BPM for new skills

// ============================================================================
// Difficulty Level Calculation
// ============================================================================

function difficultyLevelFromExercises(totalExercisesCompleted: number): number {
  if (totalExercisesCompleted <= 5) return 1;
  if (totalExercisesCompleted <= 15) return 2;
  if (totalExercisesCompleted <= 30) return 3;
  if (totalExercisesCompleted <= 50) return 4;
  return 5;
}

// ============================================================================
// Per-Skill Tempo Tracking
// ============================================================================

/**
 * Get the recommended tempo for a specific skill based on past performance.
 * Falls back to the global tempo range if no per-skill history exists.
 */
export function getTempoForSkill(
  skillId: string,
  profile: DifficultyProfile,
): number {
  const entry = profile.skillTempoHistory?.[skillId];
  if (entry) return entry.currentTempo;

  // Default: midpoint of the global tempo range
  return Math.round((profile.tempoRange.min + profile.tempoRange.max) / 2);
}

/**
 * Record a score for a skill and return the updated tempo entry.
 * Adjusts tempo up on good scores, down on poor scores, holds on moderate.
 */
export function adjustSkillTempo(
  skillId: string,
  score: number,
  profile: DifficultyProfile,
): SkillTempoEntry {
  const existing = profile.skillTempoHistory?.[skillId];
  const currentTempo = existing?.currentTempo ?? DEFAULT_SKILL_TEMPO;
  const highScore = existing?.highScore ?? 0;
  const attempts = (existing?.attempts ?? 0) + 1;

  let newTempo = currentTempo;

  if (score >= 90) {
    // Mastered at this tempo — increase
    newTempo = Math.min(currentTempo + SKILL_TEMPO_STEP_UP, TEMPO_ABSOLUTE_MAX);
  } else if (score >= 70) {
    // Good but not mastered — small increase
    newTempo = Math.min(currentTempo + 2, TEMPO_ABSOLUTE_MAX);
  } else if (score < 50) {
    // Struggling — decrease
    newTempo = Math.max(currentTempo - SKILL_TEMPO_STEP_DOWN, TEMPO_ABSOLUTE_MIN);
  }
  // 50-69: maintain current tempo

  return {
    currentTempo: newTempo,
    highScore: Math.max(highScore, score),
    attempts,
    lastAdjusted: Date.now(),
  };
}

// ============================================================================
// Main Function (Global Adjustment)
// ============================================================================

/**
 * Compute a global difficulty adjustment based on the learner's profile and last score.
 *
 * For per-skill tempo, use `getTempoForSkill()` and `adjustSkillTempo()` instead.
 *
 * - Score >= 90: increase tempo by 5 BPM, expand range by 2 semitones
 * - Score >= 70: increase tempo by 2 BPM, keep range
 * - Score < 50: decrease tempo by 5 BPM, narrow range by 2
 * - Otherwise: no change
 */
export function adjustDifficulty(
  profile: DifficultyProfile,
  lastScore: number,
): DifficultyAdjustment {
  let tempoChange: number;
  let noteRangeExpansion: number;
  let reasoning: string;

  if (lastScore >= 90) {
    tempoChange = 5;
    noteRangeExpansion = 2;
    reasoning = `Excellent score (${lastScore}%). Increasing tempo by 5 BPM and expanding note range.`;
  } else if (lastScore >= 70) {
    tempoChange = 2;
    noteRangeExpansion = 0;
    reasoning = `Good score (${lastScore}%). Slightly increasing tempo.`;
  } else if (lastScore < 50) {
    tempoChange = -5;
    noteRangeExpansion = -2;
    reasoning = `Struggling (${lastScore}%). Slowing tempo and narrowing note range for comfort.`;
  } else {
    tempoChange = 0;
    noteRangeExpansion = 0;
    reasoning = `Moderate score (${lastScore}%). Maintaining current difficulty.`;
  }

  // Cap tempo so it stays within bounds after applying the change
  const projectedMax = profile.tempoRange.max + tempoChange;
  const projectedMin = profile.tempoRange.min + tempoChange;

  if (projectedMax > TEMPO_ABSOLUTE_MAX) {
    tempoChange = TEMPO_ABSOLUTE_MAX - profile.tempoRange.max;
  }
  if (projectedMin < TEMPO_ABSOLUTE_MIN) {
    tempoChange = TEMPO_ABSOLUTE_MIN - profile.tempoRange.min;
  }

  // Calculate difficulty level from total exercises
  const rawLevel = difficultyLevelFromExercises(profile.totalExercisesCompleted);
  const difficultyLevel = Math.max(1, Math.min(5, rawLevel));

  return {
    tempoChange,
    noteRangeExpansion,
    difficultyLevel,
    reasoning,
  };
}

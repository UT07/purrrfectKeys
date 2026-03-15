/**
 * Exercise Analytics — Flag problematic exercises
 *
 * Tracks per-exercise success rates and flags exercises that consistently
 * produce low scores (likely too hard, poorly designed, or broken).
 *
 * Pure TypeScript — no React imports.
 */

// ============================================================================
// Types
// ============================================================================

export interface ExerciseScoreEntry {
  score: number;       // 0-100
  timestamp: number;   // epoch ms
}

export interface ExerciseAnalyticsData {
  scores: Record<string, ExerciseScoreEntry[]>; // exerciseId → score history
}

export interface FlaggedExercise {
  exerciseId: string;
  avgScore: number;
  attempts: number;
  failRate: number;     // 0-1, proportion of scores below passing
  reason: string;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_ATTEMPTS_TO_FLAG = 3;
const FAIL_RATE_THRESHOLD = 0.7;       // Flag if >70% of attempts fail
const LOW_AVG_SCORE_THRESHOLD = 50;    // Flag if avg score below 50
const MAX_SCORE_HISTORY = 20;          // Keep last 20 scores per exercise

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Record a score for an exercise.
 * Returns the updated analytics data (immutable update).
 */
export function recordExerciseScore(
  data: ExerciseAnalyticsData,
  exerciseId: string,
  score: number,
): ExerciseAnalyticsData {
  const existing = data.scores[exerciseId] ?? [];
  const updated = [
    ...existing,
    { score, timestamp: Date.now() },
  ].slice(-MAX_SCORE_HISTORY); // Keep only recent scores

  return {
    scores: { ...data.scores, [exerciseId]: updated },
  };
}

/**
 * Get all exercises that should be flagged for review.
 * An exercise is flagged when:
 * - It has been attempted at least MIN_ATTEMPTS_TO_FLAG times
 * - AND either the fail rate > 70% OR the average score < 50
 */
export function getFlaggedExercises(
  data: ExerciseAnalyticsData,
  passingScore: number = 70,
): FlaggedExercise[] {
  const flagged: FlaggedExercise[] = [];

  for (const [exerciseId, entries] of Object.entries(data.scores)) {
    if (entries.length < MIN_ATTEMPTS_TO_FLAG) continue;

    const scores = entries.map((e) => e.score);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const failCount = scores.filter((s) => s < passingScore).length;
    const failRate = failCount / scores.length;

    const reasons: string[] = [];
    if (failRate > FAIL_RATE_THRESHOLD) {
      reasons.push(`${Math.round(failRate * 100)}% fail rate`);
    }
    if (avgScore < LOW_AVG_SCORE_THRESHOLD) {
      reasons.push(`avg score ${Math.round(avgScore)}%`);
    }

    if (reasons.length > 0) {
      flagged.push({
        exerciseId,
        avgScore: Math.round(avgScore),
        attempts: entries.length,
        failRate,
        reason: reasons.join(', '),
      });
    }
  }

  return flagged.sort((a, b) => a.avgScore - b.avgScore);
}

/**
 * Check if a specific exercise should be flagged.
 */
export function isExerciseFlagged(
  data: ExerciseAnalyticsData,
  exerciseId: string,
  passingScore: number = 70,
): boolean {
  const entries = data.scores[exerciseId];
  if (!entries || entries.length < MIN_ATTEMPTS_TO_FLAG) return false;

  const scores = entries.map((e) => e.score);
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  const failRate = scores.filter((s) => s < passingScore).length / scores.length;

  return failRate > FAIL_RATE_THRESHOLD || avgScore < LOW_AVG_SCORE_THRESHOLD;
}

/**
 * Get improvement trend for an exercise (are scores going up or down?).
 * Returns a number: positive = improving, negative = declining, 0 = stable.
 */
export function getExerciseTrend(
  data: ExerciseAnalyticsData,
  exerciseId: string,
): number {
  const entries = data.scores[exerciseId];
  if (!entries || entries.length < 3) return 0;

  // Compare average of first half vs second half
  const mid = Math.floor(entries.length / 2);
  const firstHalf = entries.slice(0, mid).map((e) => e.score);
  const secondHalf = entries.slice(mid).map((e) => e.score);

  const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;

  return Math.round(avgSecond - avgFirst);
}

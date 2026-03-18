/**
 * MMR (Matchmaking Rating) Calculator
 *
 * Composite formula:
 * MMR = (weightedAvgScore × difficultyMultiplier × consistencyBonus) + breadthBonus
 *
 * - weightedAvgScore: EMA of last 30 exercise scores
 * - difficultyMultiplier: 1.0× (tier 1) → 3.55× (tier 18)
 * - consistencyBonus: up to 1.2× for low score variance
 * - breadthBonus: 25 points per unique exercise type (max 6 = 150)
 */

const MAX_RECENT_SCORES = 30;
const MAX_BREADTH_TYPES = 6;
const BREADTH_BONUS_PER_TYPE = 25;

export function exponentialMovingAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  const recent = scores.slice(-MAX_RECENT_SCORES);
  const alpha = 2 / (recent.length + 1);
  let ema = recent[0];
  for (let i = 1; i < recent.length; i++) {
    ema = alpha * recent[i] + (1 - alpha) * ema;
  }
  return ema;
}

export function calculateMMR(
  recentScores: number[],
  avgTierPlayed: number,
  exerciseTypesCompleted: string[],
): number {
  if (recentScores.length === 0) return 0;

  const weightedAvg = exponentialMovingAverage(recentScores);
  const difficultyMultiplier = 1.0 + (avgTierPlayed - 1) * 0.15;

  // Coefficient of variation = stddev / mean
  const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const variance = recentScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / recentScores.length;
  const stddev = Math.sqrt(variance);
  const cv = mean > 0 ? stddev / mean : 0;
  const consistencyBonus = 1.0 + (1 - Math.min(cv, 1)) * 0.2;

  const breadthCount = Math.min(exerciseTypesCompleted.length, MAX_BREADTH_TYPES);
  const breadthBonus = breadthCount * BREADTH_BONUS_PER_TYPE;

  return Math.round(weightedAvg * difficultyMultiplier * consistencyBonus + breadthBonus);
}

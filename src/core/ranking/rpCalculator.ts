/**
 * RP (Ranking Points) Calculator
 *
 * RP = baseRP × performanceMultiplier
 * - baseRP = 10 + (exerciseTier × 2)
 * - performanceMultiplier = score / 70
 */

export function calculateRP(score: number, exerciseTier: number): number {
  if (score <= 0) return 0;
  const clampedTier = Math.max(1, Math.min(18, exerciseTier));
  const baseRP = 10 + clampedTier * 2;
  const performanceMultiplier = score / 70;
  return Math.round(baseRP * performanceMultiplier);
}

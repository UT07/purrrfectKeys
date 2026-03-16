/**
 * RP (Ranking Points) Calculator
 *
 * RP = baseRP × performanceMultiplier
 * - baseRP = 10 + (exerciseTier × 2)
 * - performanceMultiplier = score / 70
 */

export function calculateRP(score: number, exerciseTier: number): number {
  if (score <= 0) return 0;
  const baseRP = 10 + exerciseTier * 2;
  const performanceMultiplier = score / 70;
  return Math.round(baseRP * performanceMultiplier);
}

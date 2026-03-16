/**
 * Promotion Engine
 *
 * Manages promotion series and demotion grace:
 * - Promotion: Cross rank threshold → 2/3 exercises at 70%+ to confirm
 * - Demotion: Drop below floor → 3-exercise grace counter, resets on recovery
 */

import type { RankedTier } from '../../stores/types';
import { getTierFloor, RANK_CONFIGS } from './rankThresholds';

export interface PromotionSeries {
  wins: number;
  losses: number;
  active: boolean;
}

const PROMOTION_WINS_NEEDED = 2;
const PROMOTION_MAX_GAMES = 3;
const DEMOTION_GRACE_INITIAL = 3;

export function shouldStartPromotion(
  oldTier: RankedTier,
  newTier: RankedTier,
  currentSeries: PromotionSeries | null,
): boolean {
  if (currentSeries?.active) return false;
  const oldIndex = RANK_CONFIGS.findIndex((r) => r.tier === oldTier);
  const newIndex = RANK_CONFIGS.findIndex((r) => r.tier === newTier);
  return newIndex > oldIndex;
}

export function recordPromotionResult(
  series: PromotionSeries,
  passed: boolean,
): { series: PromotionSeries; promoted: boolean; failed: boolean } {
  const updated = { ...series };
  if (passed) {
    updated.wins++;
  } else {
    updated.losses++;
  }

  const promoted = updated.wins >= PROMOTION_WINS_NEEDED;
  const failed = updated.losses > PROMOTION_MAX_GAMES - PROMOTION_WINS_NEEDED;

  if (promoted || failed) {
    updated.active = false;
  }

  return { series: updated, promoted, failed };
}

export function createPromotionSeries(): PromotionSeries {
  return { wins: 0, losses: 0, active: true };
}

export function shouldDemote(
  mmr: number,
  currentTier: RankedTier,
  graceRemaining: number,
): boolean {
  if (currentTier === 'novice') return false;
  const floor = getTierFloor(currentTier);
  return mmr < floor && graceRemaining <= 0;
}

export function updateDemotionGrace(
  mmr: number,
  currentTier: RankedTier,
  currentGrace: number,
): number {
  const floor = getTierFloor(currentTier);
  if (mmr >= floor) {
    // Above floor — reset grace
    return DEMOTION_GRACE_INITIAL;
  }
  // Below floor — decrement grace (min 0)
  return Math.max(0, currentGrace - 1);
}

export function getDemotionGraceInitial(): number {
  return DEMOTION_GRACE_INITIAL;
}

export function getTierAfterDemotion(currentTier: RankedTier): RankedTier {
  const index = RANK_CONFIGS.findIndex((r) => r.tier === currentTier);
  if (index <= 0) return 'novice';
  return RANK_CONFIGS[index - 1].tier;
}

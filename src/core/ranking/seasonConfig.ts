/**
 * Season Configuration
 *
 * Defines season timing, soft MMR reset, and battle pass reward tiers.
 * Seasons run weekly (Monday 00:00 UTC → Sunday 23:59 UTC).
 */

import type { RankedTier } from '../../stores/types';

// ─────────────────────────────────────────────────
// Season Timing
// ─────────────────────────────────────────────────

/** Season duration in days */
export const SEASON_DURATION_DAYS = 7;

/** Soft MMR reset factor: newMMR = oldMMR × DECAY + BASELINE × (1 - DECAY) */
export const MMR_RESET_DECAY = 0.8;
export const MMR_RESET_BASELINE = 500;

/**
 * Calculate soft-reset MMR for a new season.
 * Pulls extreme MMRs toward the baseline while preserving relative skill.
 */
export function softResetMMR(currentMmr: number): number {
  return Math.round(currentMmr * MMR_RESET_DECAY + MMR_RESET_BASELINE * (1 - MMR_RESET_DECAY));
}

// ─────────────────────────────────────────────────
// League Placement Rewards (gems by rank position)
// ─────────────────────────────────────────────────

export interface PlacementReward {
  minRank: number;
  maxRank: number;
  gems: number;
  label: string;
}

/** Gem rewards by league placement (within a 30-person league) */
export const PLACEMENT_REWARDS: readonly PlacementReward[] = [
  { minRank: 1, maxRank: 1, gems: 100, label: '1st Place' },
  { minRank: 2, maxRank: 2, gems: 75, label: '2nd Place' },
  { minRank: 3, maxRank: 3, gems: 50, label: '3rd Place' },
  { minRank: 4, maxRank: 5, gems: 30, label: 'Top 5' },
  { minRank: 6, maxRank: 10, gems: 20, label: 'Top 10' },
  { minRank: 11, maxRank: 15, gems: 10, label: 'Top 15' },
  { minRank: 16, maxRank: 30, gems: 5, label: 'Participation' },
] as const;

/**
 * Get gem reward for a given league placement rank.
 */
export function gemsForPlacement(rank: number): number {
  for (const r of PLACEMENT_REWARDS) {
    if (rank >= r.minRank && rank <= r.maxRank) return r.gems;
  }
  return 0;
}

// ─────────────────────────────────────────────────
// Tier Bonus — Extra gems for competing at higher tiers
// ─────────────────────────────────────────────────

const TIER_GEM_BONUS: Record<RankedTier, number> = {
  novice: 0,
  apprentice: 5,
  performer: 10,
  virtuoso: 20,
  maestro: 35,
  prodigy: 50,
  luminary: 75,
  legend: 100,
  grandmaster: 150,
};

export function tierGemBonus(tier: RankedTier): number {
  return TIER_GEM_BONUS[tier];
}

// ─────────────────────────────────────────────────
// Battle Pass
// ─────────────────────────────────────────────────

export interface BattlePassTier {
  tier: number;
  xpRequired: number;     // cumulative XP needed to reach this tier
  freeReward: BattlePassReward | null;
  premiumReward: BattlePassReward | null;
}

export interface BattlePassReward {
  type: 'gems' | 'accessory' | 'title' | 'xp_boost';
  amount?: number;       // for gems / xp_boost multiplier
  itemId?: string;       // for accessory / title
  label: string;
}

/** XP per battle pass tier — grows linearly */
const BP_BASE_XP = 100;
const BP_XP_PER_TIER = 50;

export function xpForBattlePassTier(tier: number): number {
  if (tier <= 0) return BP_BASE_XP;
  return BP_BASE_XP + (tier - 1) * BP_XP_PER_TIER;
}

/** Cumulative XP to reach a given battle pass tier */
export function cumulativeXpForTier(tier: number): number {
  if (tier <= 0) return 0;
  // Sum of arithmetic series: n/2 × (2a + (n-1)d) where a=BP_BASE_XP, d=BP_XP_PER_TIER
  return Math.round((tier / 2) * (2 * BP_BASE_XP + (tier - 1) * BP_XP_PER_TIER));
}

/** Total battle pass tiers per season */
export const BATTLE_PASS_MAX_TIER = 30;

/** Generate all battle pass tiers with rewards */
export function generateBattlePassTiers(): BattlePassTier[] {
  const tiers: BattlePassTier[] = [];

  for (let i = 1; i <= BATTLE_PASS_MAX_TIER; i++) {
    const freeReward = getBattlePassFreeReward(i);
    const premiumReward = getBattlePassPremiumReward(i);

    tiers.push({
      tier: i,
      xpRequired: cumulativeXpForTier(i),
      freeReward,
      premiumReward,
    });
  }

  return tiers;
}

function getBattlePassFreeReward(tier: number): BattlePassReward | null {
  // Every tier has a free reward to keep the track feeling full
  if (tier % 5 === 0) {
    return { type: 'gems', amount: 25, label: '25 Gems' };
  }
  if (tier % 3 === 0) {
    return { type: 'gems', amount: 15, label: '15 Gems' };
  }
  if (tier % 2 === 0) {
    return { type: 'gems', amount: 10, label: '10 Gems' };
  }
  return { type: 'gems', amount: 5, label: '5 Gems' };
}

function getBattlePassPremiumReward(tier: number): BattlePassReward | null {
  if (tier === BATTLE_PASS_MAX_TIER) {
    return { type: 'title', itemId: 'season-champion', label: 'Season Champion Title' };
  }
  if (tier % 10 === 0) {
    return { type: 'accessory', itemId: `bp-accessory-t${tier}`, label: `Tier ${tier} Accessory` };
  }
  if (tier % 5 === 0) {
    return { type: 'gems', amount: 50, label: '50 Gems' };
  }
  if (tier % 3 === 0) {
    return { type: 'gems', amount: 30, label: '30 Gems' };
  }
  if (tier % 2 === 0) {
    return { type: 'xp_boost', amount: 1.5, label: '1.5x XP Boost' };
  }
  return null;
}

// ─────────────────────────────────────────────────
// Season Date Utilities
// ─────────────────────────────────────────────────

/**
 * Get the Monday (start) and Sunday (end) of the current season week.
 */
export function getCurrentSeasonDates(): { start: string; end: string } {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysFromMonday = utcDay === 0 ? 6 : utcDay - 1;

  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

/**
 * Compute season number from a reference start date.
 * Season 1 starts 2026-03-16 (Phase 14 launch week).
 */
const SEASON_EPOCH = new Date('2026-03-16T00:00:00Z').getTime();

export function seasonNumberFromDate(date: Date = new Date()): number {
  const elapsed = date.getTime() - SEASON_EPOCH;
  if (elapsed < 0) return 1;
  return Math.floor(elapsed / (SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000)) + 1;
}

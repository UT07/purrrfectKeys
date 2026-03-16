/**
 * Rank Thresholds
 *
 * Maps MMR ranges to ranked tiers and divisions.
 * 9 tiers × 3 divisions = 27 positions (Grandmaster has no divisions).
 */

import type { RankedTier } from '../../stores/types';

export interface RankConfig {
  tier: RankedTier;
  label: string;
  color: string;
  mmrFloor: number;
  mmrCeiling: number;
}

export const RANK_CONFIGS: RankConfig[] = [
  { tier: 'novice',      label: 'Novice',      color: '#A0AEC0', mmrFloor: 0,    mmrCeiling: 199 },
  { tier: 'apprentice',  label: 'Apprentice',  color: '#CD7F32', mmrFloor: 200,  mmrCeiling: 399 },
  { tier: 'performer',   label: 'Performer',   color: '#C0C0C0', mmrFloor: 400,  mmrCeiling: 599 },
  { tier: 'virtuoso',    label: 'Virtuoso',    color: '#FFD700', mmrFloor: 600,  mmrCeiling: 799 },
  { tier: 'maestro',     label: 'Maestro',     color: '#4FC3F7', mmrFloor: 800,  mmrCeiling: 999 },
  { tier: 'prodigy',     label: 'Prodigy',     color: '#BA68C8', mmrFloor: 1000, mmrCeiling: 1199 },
  { tier: 'luminary',    label: 'Luminary',    color: '#F06292', mmrFloor: 1200, mmrCeiling: 1399 },
  { tier: 'legend',      label: 'Legend',      color: '#FF6E40', mmrFloor: 1400, mmrCeiling: 1599 },
  { tier: 'grandmaster', label: 'Grandmaster', color: '#B9F2FF', mmrFloor: 1600, mmrCeiling: Infinity },
];

export function tierFromMMR(mmr: number): RankedTier {
  for (let i = RANK_CONFIGS.length - 1; i >= 0; i--) {
    if (mmr >= RANK_CONFIGS[i].mmrFloor) return RANK_CONFIGS[i].tier;
  }
  return 'novice';
}

export function divisionFromMMR(mmr: number, tier: RankedTier): 1 | 2 | 3 {
  if (tier === 'grandmaster') return 1;
  const config = RANK_CONFIGS.find((r) => r.tier === tier);
  if (!config) return 3;

  const range = config.mmrCeiling - config.mmrFloor + 1;
  const divisionSize = range / 3;
  const offset = mmr - config.mmrFloor;

  if (offset >= divisionSize * 2) return 1; // top division
  if (offset >= divisionSize) return 2;
  return 3; // bottom division
}

export function mmrToNextThreshold(mmr: number): number {
  const config = RANK_CONFIGS.find((r) => mmr >= r.mmrFloor && mmr <= r.mmrCeiling);
  if (!config || config.tier === 'grandmaster') return 0;
  return config.mmrCeiling + 1 - mmr;
}

export function getRankConfig(tier: RankedTier): RankConfig {
  return RANK_CONFIGS.find((r) => r.tier === tier) ?? RANK_CONFIGS[0];
}

export function getTierFloor(tier: RankedTier): number {
  return getRankConfig(tier).mmrFloor;
}

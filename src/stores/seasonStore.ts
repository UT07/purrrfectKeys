/**
 * Season Store — Manages season state, battle pass progression, and season history
 *
 * Tracks:
 * - Current season number and dates
 * - Battle pass XP and tier progression
 * - Claimed rewards (free and premium)
 * - Season history records
 */

import { create } from 'zustand';
import type { SeasonState, SeasonRecord, RankedTier } from './types';
import { PersistenceManager, STORAGE_KEYS, createDebouncedSave } from './persistence';
import {
  seasonNumberFromDate,
  getCurrentSeasonDates,
  cumulativeXpForTier,
  BATTLE_PASS_MAX_TIER,
  gemsForPlacement,
  tierGemBonus,
} from '../core/ranking/seasonConfig';

// ─────────────────────────────────────────────────
// Default state
// ─────────────────────────────────────────────────

const { start, end } = getCurrentSeasonDates();

const defaultSeasonState: SeasonState = {
  currentSeason: seasonNumberFromDate(),
  seasonStartDate: start,
  seasonEndDate: end,
  placementComplete: false,
  placementScores: [],
  battlePassTier: 0,
  battlePassXp: 0,
  claimedRewards: [],
  peakTier: 'novice' as RankedTier,
  seasonHistory: [],
};

// ─────────────────────────────────────────────────
// Store interface
// ─────────────────────────────────────────────────

interface SeasonStoreActions {
  /** Add battle pass XP and auto-advance tiers */
  addBattlePassXp: (xp: number) => void;

  /** Claim a battle pass reward by key (e.g., "free-3" or "premium-10") */
  claimReward: (rewardKey: string) => void;

  /** Check if a reward has been claimed */
  hasClaimedReward: (rewardKey: string) => boolean;

  /** Record placement match score */
  recordPlacementScore: (score: number) => void;

  /** End the current season and create a history record */
  endSeason: (finalMmr: number, finalTier: RankedTier, finalDivision: number, gemsEarned: number) => SeasonRecord;

  /** Start a new season (called after endSeason) */
  startNewSeason: () => void;

  /** Update peak tier if current tier is higher */
  updatePeakTier: (tier: RankedTier) => void;

  /** Calculate rewards for a given placement */
  calculateSeasonRewards: (rank: number, tier: RankedTier) => number;

  /** Reset store */
  reset: () => void;
}

type SeasonStoreState = SeasonState & SeasonStoreActions;

// ─────────────────────────────────────────────────
// Tier ordering for comparison
// ─────────────────────────────────────────────────

const TIER_ORDER: RankedTier[] = [
  'novice', 'apprentice', 'performer', 'virtuoso',
  'maestro', 'prodigy', 'luminary', 'legend', 'grandmaster',
];

function tierIndex(tier: RankedTier): number {
  return TIER_ORDER.indexOf(tier);
}

// ─────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────

const debouncedSave = createDebouncedSave<SeasonState>(STORAGE_KEYS.SEASON);

// ─────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────

export const useSeasonStore = create<SeasonStoreState>((set, get) => ({
  ...defaultSeasonState,

  addBattlePassXp: (xp: number) => {
    set((state) => {
      const newXp = state.battlePassXp + xp;
      let newTier = state.battlePassTier;

      // Advance tiers
      while (newTier < BATTLE_PASS_MAX_TIER) {
        const nextTierXp = cumulativeXpForTier(newTier + 1);
        if (newXp >= nextTierXp) {
          newTier++;
        } else {
          break;
        }
      }

      return { battlePassXp: newXp, battlePassTier: newTier };
    });
    debouncedSave(get());
  },

  claimReward: (rewardKey: string) => {
    set((state) => ({
      claimedRewards: [...state.claimedRewards, rewardKey],
    }));
    debouncedSave(get());
  },

  hasClaimedReward: (rewardKey: string) => {
    return get().claimedRewards.includes(rewardKey);
  },

  recordPlacementScore: (score: number) => {
    set((state) => {
      const scores = [...state.placementScores, score];
      return {
        placementScores: scores,
        placementComplete: scores.length >= 3,
      };
    });
    debouncedSave(get());
  },

  endSeason: (finalMmr: number, _finalTier: RankedTier, finalDivision: number, gemsEarned: number) => {
    const state = get();
    const record: SeasonRecord = {
      seasonNumber: state.currentSeason,
      peakTier: state.peakTier,
      peakDivision: finalDivision,
      finalMmr,
      battlePassTier: state.battlePassTier,
      gemsEarned,
      exclusivesEarned: state.claimedRewards.filter(k => k.startsWith('premium-')),
    };

    set((s) => ({
      seasonHistory: [...s.seasonHistory, record],
    }));
    debouncedSave(get());

    return record;
  },

  startNewSeason: () => {
    const { start: newStart, end: newEnd } = getCurrentSeasonDates();
    const newSeasonNumber = seasonNumberFromDate();

    set(() => ({
      currentSeason: newSeasonNumber,
      seasonStartDate: newStart,
      seasonEndDate: newEnd,
      placementComplete: false,
      placementScores: [],
      battlePassTier: 0,
      battlePassXp: 0,
      claimedRewards: [],
      peakTier: 'novice' as RankedTier,
      // Keep seasonHistory
    }));
    debouncedSave(get());
  },

  updatePeakTier: (tier: RankedTier) => {
    const current = get().peakTier;
    if (tierIndex(tier) > tierIndex(current)) {
      set({ peakTier: tier });
      debouncedSave(get());
    }
  },

  calculateSeasonRewards: (rank: number, tier: RankedTier) => {
    return gemsForPlacement(rank) + tierGemBonus(tier);
  },

  reset: () => {
    set(defaultSeasonState);
    debouncedSave(get());
  },
}));

// ─────────────────────────────────────────────────
// Hydration
// ─────────────────────────────────────────────────

export async function hydrateSeasonStore(): Promise<void> {
  const saved = await PersistenceManager.loadState<SeasonState>(
    STORAGE_KEYS.SEASON,
    defaultSeasonState,
  );

  // Check if we need a season rollover
  const currentSeason = seasonNumberFromDate();
  if (saved.currentSeason < currentSeason) {
    // Season has advanced — keep history, reset current season state
    useSeasonStore.setState({
      ...defaultSeasonState,
      seasonHistory: saved.seasonHistory,
      currentSeason,
    });
  } else {
    useSeasonStore.setState(saved);
  }
}

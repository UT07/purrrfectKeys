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
  generateBattlePassTiers,
} from '../core/ranking/seasonConfig';
import type { BattlePassReward } from '../core/ranking/seasonConfig';
import { logger } from '../utils/logger';

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

  /** Claim a battle pass reward by key (e.g., "free-3" or "premium-10") — records only */
  claimReward: (rewardKey: string) => void;

  /**
   * Claim and deliver a battle pass reward.
   * Dispatches gems to gemStore, accessories to catEvolutionStore, etc.
   * Returns the reward that was delivered, or null if already claimed / not available.
   */
  claimBattlePassReward: (tier: number, track: 'free' | 'premium') => BattlePassReward | null;

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

/** Claim pending season placement rewards from Firestore on app open */
export async function claimPendingSeasonRewards(uid: string): Promise<void> {
  try {
    const { doc, getDoc, deleteDoc } = require('firebase/firestore');
    const { db } = require('../services/firebase/config');
    const rewardRef = doc(db, 'users', uid, 'seasonRewards', 'pending');
    const snap = await getDoc(rewardRef);
    if (!snap.exists()) return;

    const data = snap.data() as { gems?: number; claimedAt?: number };
    if (data.claimedAt) return; // Already processed

    // Mark claimed BEFORE delivering gems to prevent double-delivery on crash
    const { updateDoc } = require('firebase/firestore');
    await updateDoc(rewardRef, { claimedAt: Date.now() });

    // Deliver gems
    if (data.gems && data.gems > 0) {
      const { useGemStore } = require('./gemStore');
      useGemStore.getState().claimReward(`season-placement-${Date.now()}`, data.gems);
    }

    // Clean up the reward doc
    await deleteDoc(rewardRef);
    logger.log('[seasonStore] Claimed pending season rewards:', data.gems, 'gems');
  } catch (err) {
    logger.warn('[seasonStore] Failed to claim pending season rewards:', err);
  }
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

  claimBattlePassReward: (tier: number, track: 'free' | 'premium') => {
    const rewardKey = `${track}-${tier}`;
    const state = get();

    // Guard: already claimed
    if (state.claimedRewards.includes(rewardKey)) return null;

    // Guard: tier not yet reached
    if (tier > state.battlePassTier) return null;

    // Look up the reward definition
    const tiers = generateBattlePassTiers();
    const tierDef = tiers.find((t) => t.tier === tier);
    if (!tierDef) return null;

    const reward = track === 'free' ? tierDef.freeReward : tierDef.premiumReward;
    if (!reward) return null;

    // Record claim
    set((s) => ({
      claimedRewards: [...s.claimedRewards, rewardKey],
    }));
    debouncedSave(get());

    // Deliver reward to the appropriate store
    try {
      switch (reward.type) {
        case 'gems': {
          const { useGemStore } = require('./gemStore');
          useGemStore.getState().claimReward(rewardKey, reward.amount ?? 0);
          break;
        }
        case 'accessory': {
          const { useCatEvolutionStore } = require('./catEvolutionStore');
          if (reward.itemId) {
            useCatEvolutionStore.getState().unlockAccessory?.(reward.itemId);
          }
          break;
        }
        case 'title': {
          const { useSettingsStore } = require('./settingsStore');
          if (reward.itemId) {
            useSettingsStore.getState().addTitle?.(reward.itemId);
          }
          break;
        }
        case 'xp_boost': {
          const { useSettingsStore } = require('./settingsStore');
          useSettingsStore.getState().setXpBoostMultiplier?.(reward.amount ?? 1);
          break;
        }
      }
    } catch (err) {
      // Store not available (tests or init timing) — reward key is still recorded
      logger.warn('[seasonStore] Failed to deliver battle pass reward:', rewardKey, err);
    }

    return reward;
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

    // Soft-reset MMR and zero RP for the new season
    try {
      const { useRankStore } = require('./rankStore');
      const { softResetMMR } = require('../core/ranking/seasonConfig');
      const current = useRankStore.getState().rating;
      const resetRating = { ...current, mmr: softResetMMR(current.mmr), rp: 0, promotionSeries: null };
      useRankStore.setState({ rating: resetRating });
    } catch {
      // rankStore may not be initialized yet
    }

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
    // Also soft-reset MMR and zero RP
    try {
      const { useRankStore } = require('./rankStore');
      const { softResetMMR } = require('../core/ranking/seasonConfig');
      const current = useRankStore.getState().rating;
      const resetRating = { ...current, mmr: softResetMMR(current.mmr), rp: 0, promotionSeries: null };
      useRankStore.setState({ rating: resetRating });
    } catch {
      // rankStore may not be initialized yet during early hydration
    }

    useSeasonStore.setState({
      ...defaultSeasonState,
      seasonHistory: saved.seasonHistory,
      currentSeason,
    });
  } else {
    useSeasonStore.setState(saved);
  }
}

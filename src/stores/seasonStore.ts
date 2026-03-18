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
    const { collection, query, where, getDocs, updateDoc, deleteDoc } = require('firebase/firestore');
    const { db } = require('../services/firebase/config');

    // Cloud Function writes reward docs with auto-generated IDs — query for unclaimed ones
    const rewardsCol = collection(db, 'users', uid, 'seasonRewards');
    const q = query(rewardsCol, where('claimedAt', '==', null));
    const snap = await getDocs(q);

    if (snap.empty) return;

    let totalGems = 0;
    for (const rewardDoc of snap.docs) {
      const data = rewardDoc.data() as { gems?: number; claimedAt?: number };
      if (data.claimedAt) continue; // Already processed

      // Mark claimed BEFORE delivering gems to prevent double-delivery on crash
      await updateDoc(rewardDoc.ref, { claimedAt: Date.now() });

      // Deliver gems
      if (data.gems && data.gems > 0) {
        const { useGemStore } = require('./gemStore');
        useGemStore.getState().claimReward(`season-${rewardDoc.id}`, data.gems);
        totalGems += data.gems;
      }

      // Clean up the reward doc
      await deleteDoc(rewardDoc.ref);
    }

    if (totalGems > 0) {
      logger.log('[seasonStore] Claimed pending season rewards:', totalGems, 'gems');
    }
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

    // Atomic check-and-claim inside a single set() to prevent TOCTOU race
    let alreadyClaimed = false;
    let tierNotReached = false;
    set((s) => {
      if (s.claimedRewards.includes(rewardKey)) {
        alreadyClaimed = true;
        return s;
      }
      if (tier > s.battlePassTier) {
        tierNotReached = true;
        return s;
      }
      // Record claim atomically
      return { claimedRewards: [...s.claimedRewards, rewardKey] };
    });

    if (alreadyClaimed || tierNotReached) return null;

    // Look up the reward definition
    const tiers = generateBattlePassTiers();
    const tierDef = tiers.find((t) => t.tier === tier);
    if (!tierDef) return null;

    const reward = track === 'free' ? tierDef.freeReward : tierDef.premiumReward;
    if (!reward) return null;

    // Deliver reward AFTER recording claim (claim is already recorded above)
    try {
      switch (reward.type) {
        case 'gems': {
          const { useGemStore } = require('./gemStore');
          useGemStore.getState().claimReward(rewardKey, reward.amount ?? 0);
          break;
        }
        case 'accessory': {
          logger.warn(`[Season] Accessory reward "${reward.itemId}" not yet deliverable — skipping`);
          break;
        }
        case 'title': {
          logger.warn(`[Season] Title reward "${reward.itemId}" not yet deliverable — skipping`);
          break;
        }
        case 'xp_boost': {
          logger.warn(`[Season] XP boost reward not yet deliverable — skipping`);
          break;
        }
      }
    } catch (err) {
      logger.warn('[seasonStore] Failed to deliver battle pass reward:', rewardKey, err);
      // Remove the claim record so the reward can be retried
      set((s) => ({
        claimedRewards: s.claimedRewards.filter((k) => k !== rewardKey),
      }));
      debouncedSave(get());
      return null;
    }

    debouncedSave(get());
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

    // Soft-reset MMR and zero RP for the new season, recalculate tier/division
    try {
      const { useRankStore } = require('./rankStore');
      const { softResetMMR } = require('../core/ranking/seasonConfig');
      const { tierFromMMR, divisionFromMMR } = require('../core/ranking/rankThresholds');
      const current = useRankStore.getState().rating;
      const newMmr = softResetMMR(current.mmr);
      const newTier = tierFromMMR(newMmr);
      const newDivision = divisionFromMMR(newMmr, newTier);
      const resetRating = {
        ...current,
        mmr: newMmr,
        tier: newTier,
        division: newDivision,
        rp: 0,
        promotionSeries: null,
        demotionGrace: 3,
      };
      useRankStore.setState({ rating: resetRating });
    } catch (err) {
      logger.warn('[seasonStore] rankStore not available for startNewSeason MMR reset:', err);
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
    PersistenceManager.deleteState(STORAGE_KEYS.SEASON);
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
    // Season has advanced — create a history record, then reset

    // 1. Archive the completed season before resetting
    let finalMmr = 500;
    try {
      const { useRankStore } = require('./rankStore');
      finalMmr = useRankStore.getState().rating.mmr;
    } catch (err) {
      logger.warn('[seasonStore] Could not read MMR for season record:', err);
    }

    const seasonRecord: SeasonRecord = {
      seasonNumber: saved.currentSeason,
      peakTier: saved.peakTier,
      peakDivision: 1, // division tracking is within-season only
      finalMmr,
      battlePassTier: saved.battlePassTier,
      gemsEarned: 0, // actual gem amount comes from reward docs
      exclusivesEarned: saved.claimedRewards.filter(k => k.startsWith('premium-')),
    };
    const updatedHistory = [...saved.seasonHistory, seasonRecord];

    // 2. Soft-reset MMR and zero RP
    try {
      const { useRankStore } = require('./rankStore');
      const { softResetMMR } = require('../core/ranking/seasonConfig');
      const { tierFromMMR, divisionFromMMR } = require('../core/ranking/rankThresholds');
      const current = useRankStore.getState().rating;
      const newMmr = softResetMMR(current.mmr);
      const newTier = tierFromMMR(newMmr);
      const newDivision = divisionFromMMR(newMmr, newTier);
      const resetRating = { ...current, mmr: newMmr, rp: 0, promotionSeries: null, tier: newTier, division: newDivision };
      useRankStore.setState({ rating: resetRating });
    } catch (err) {
      logger.warn('[seasonStore] rankStore not available for MMR reset:', err);
    }

    // 3. Reset season state, preserving history
    useSeasonStore.setState({
      ...defaultSeasonState,
      seasonHistory: updatedHistory,
      currentSeason,
    });
    debouncedSave(useSeasonStore.getState());
  } else {
    useSeasonStore.setState(saved);
  }
}

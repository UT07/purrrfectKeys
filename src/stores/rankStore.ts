/**
 * Rank Store
 *
 * Manages the player's competitive rating:
 * - MMR calculation from exercise performance
 * - Tier and division tracking
 * - Promotion series state machine
 * - Demotion grace counter
 * - Persisted via AsyncStorage
 */

import { create } from 'zustand';
import type { PlayerRating, RankedTier } from './types';
import { PersistenceManager, STORAGE_KEYS, createDebouncedSave } from './persistence';
import { calculateMMR } from '../core/ranking/mmrCalculator';
import { tierFromMMR, divisionFromMMR, RANK_CONFIGS } from '../core/ranking/rankThresholds';
import { calculateRP } from '../core/ranking/rpCalculator';
import {
  shouldStartPromotion,
  createPromotionSeries,
  recordPromotionResult,
  shouldDemote,
  updateDemotionGrace,
  getDemotionGraceInitial,
  getTierAfterDemotion,
} from '../core/ranking/promotionEngine';
import { logger } from '../utils/logger';

const MAX_RECENT_SCORES = 30;

export interface PendingRankChange {
  fromTier: RankedTier;
  toTier: RankedTier;
  isPromotion: boolean;
}

export interface RankStoreState {
  rating: PlayerRating;
  pendingRankChange: PendingRankChange | null;

  // Actions
  updateAfterExercise: (score: number, exerciseTier: number, exerciseType: string) => void;
  clearPendingRankChange: () => void;
  clearPromotionSeries: () => void;
  reset: () => void;
}

const defaultRating: PlayerRating = {
  mmr: 0,
  tier: 'novice',
  division: 3,
  rp: 0,
  peakMmr: 0,
  peakTier: 'novice',
  recentScores: [],
  exerciseTypesCompleted: [],
  promotionSeries: null,
  demotionGrace: getDemotionGraceInitial(),
};

type RankData = { rating: PlayerRating };

const debouncedSave = createDebouncedSave<RankData>(STORAGE_KEYS.RANK, 500);

export const useRankStore = create<RankStoreState>((set, get) => ({
  rating: { ...defaultRating },
  pendingRankChange: null,

  updateAfterExercise: (score: number, exerciseTier: number, exerciseType: string) => {
    const current = get().rating;

    // Update recent scores (keep last 30)
    const recentScores = [...current.recentScores, score].slice(-MAX_RECENT_SCORES);

    // Update exercise types (unique set)
    const exerciseTypesCompleted = current.exerciseTypesCompleted.includes(exerciseType)
      ? current.exerciseTypesCompleted
      : [...current.exerciseTypesCompleted, exerciseType];

    // Recalculate MMR
    const mmr = calculateMMR(recentScores, exerciseTier, exerciseTypesCompleted);

    // Add RP
    const rpGained = calculateRP(score, exerciseTier);
    const rp = current.rp + rpGained;

    // Determine tier/division from new MMR
    const newTier = tierFromMMR(mmr);
    const division = divisionFromMMR(mmr, newTier);

    // Peak tracking
    const peakMmr = Math.max(mmr, current.peakMmr);
    const peakTier = mmr >= current.peakMmr ? newTier : current.peakTier;

    // Promotion logic
    let promotionSeries = current.promotionSeries;
    let tier: RankedTier = current.tier;

    if (promotionSeries?.active) {
      // In active promotion series — record result
      const passed = score >= 70;
      const result = recordPromotionResult(promotionSeries, passed);
      promotionSeries = result.series;
      if (result.promoted) {
        tier = newTier; // Confirm promotion
      } else if (result.failed) {
        // Stay at current tier
        promotionSeries = null;
      }
    } else if (shouldStartPromotion(current.tier, newTier, promotionSeries)) {
      // Start new promotion series
      promotionSeries = createPromotionSeries();
      // Don't change tier yet — wait for series completion
    } else {
      tier = newTier;
    }

    // Demotion logic
    let demotionGrace = updateDemotionGrace(mmr, tier, current.demotionGrace);
    if (shouldDemote(mmr, tier, demotionGrace)) {
      tier = getTierAfterDemotion(tier);
      demotionGrace = getDemotionGraceInitial();
    }

    const updated: PlayerRating = {
      mmr,
      tier,
      division,
      rp,
      peakMmr,
      peakTier,
      recentScores,
      exerciseTypesCompleted,
      promotionSeries,
      demotionGrace,
    };

    set({ rating: updated });
    debouncedSave({ rating: updated });

    // Detect tier change — set pending rank change for overlay + post to feed
    if (tier !== current.tier) {
      const tierIdx = (t: RankedTier) => RANK_CONFIGS.findIndex((r) => r.tier === t);
      const isPromotion = tierIdx(tier) > tierIdx(current.tier);

      // Set pending rank change so ExercisePlayer shows the overlay
      set({
        pendingRankChange: {
          fromTier: current.tier,
          toTier: tier,
          isPromotion,
        },
      });

      try {
        const { postRichFeedItem, buildRichFeedItem } = require('../services/firebase/feedService');
        const { auth } = require('../services/firebase/config');
        const user = auth.currentUser;
        if (user && !user.isAnonymous) {
          const { useSettingsStore } = require('./settingsStore');
          const catId = useSettingsStore.getState().selectedCatId ?? '';
          const feedItem = buildRichFeedItem(
            isPromotion ? 'rank_promotion' : 'rank_demotion',
            {
              uid: user.uid,
              displayName: user.displayName ?? 'Player',
              catId,
              rankTier: tier,
              rankDivision: division,
            },
            {
              previousTier: current.tier,
              newTier: tier,
              previousDivision: current.division,
              newDivision: division,
              mmr,
            },
            { isEngagementTrigger: isPromotion },
          );
          postRichFeedItem(user.uid, feedItem)
            .catch((err: Error) => logger.warn('[rankStore] postRichFeedItem failed:', err?.message));
        }
      } catch (err) {
        logger.warn('[rankStore] Post rank change feed failed:', (err as Error)?.message);
      }
    }
  },

  clearPendingRankChange: () => {
    set({ pendingRankChange: null });
  },

  clearPromotionSeries: () => {
    const current = get().rating;
    const updated = { ...current, promotionSeries: null };
    set({ rating: updated });
    debouncedSave({ rating: updated });
  },

  reset: () => {
    set({ rating: { ...defaultRating } });
    PersistenceManager.deleteState(STORAGE_KEYS.RANK);
  },
}));

/** Hydrate rank store from AsyncStorage on app launch */
export async function hydrateRankStore(): Promise<void> {
  const data = await PersistenceManager.loadState<RankData>(STORAGE_KEYS.RANK, {
    rating: { ...defaultRating },
  });
  useRankStore.setState({
    rating: data.rating ?? { ...defaultRating },
  });
}

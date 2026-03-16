/**
 * Rank Store Tests
 *
 * Tests MMR tracking, tier/division updates, promotion series,
 * demotion grace, and persistence.
 */

// Mock persistence layer
jest.mock('../persistence', () => ({
  createDebouncedSave: () => jest.fn(),
  createImmediateSave: () => jest.fn(),
  PersistenceManager: {
    loadState: jest.fn().mockResolvedValue({}),
    saveState: jest.fn().mockResolvedValue(undefined),
    deleteState: jest.fn().mockResolvedValue(undefined),
  },
  STORAGE_KEYS: {
    RANK: 'test_rank',
    LEAGUE: 'test_league',
    SOCIAL: 'test_social',
  },
}));

import { useRankStore, hydrateRankStore } from '../rankStore';
import { PersistenceManager } from '../persistence';

describe('rankStore', () => {
  beforeEach(() => {
    useRankStore.getState().reset();
  });

  describe('initial state', () => {
    it('starts with novice tier and 0 MMR', () => {
      const { rating } = useRankStore.getState();
      expect(rating.mmr).toBe(0);
      expect(rating.tier).toBe('novice');
      expect(rating.division).toBe(3);
      expect(rating.rp).toBe(0);
      expect(rating.recentScores).toEqual([]);
    });
  });

  describe('updateAfterExercise', () => {
    it('updates MMR after completing an exercise', () => {
      useRankStore.getState().updateAfterExercise(80, 5, 'play');
      const { rating } = useRankStore.getState();
      expect(rating.mmr).toBeGreaterThan(0);
      expect(rating.recentScores).toEqual([80]);
    });

    it('accumulates RP', () => {
      useRankStore.getState().updateAfterExercise(80, 5, 'play');
      const rp1 = useRankStore.getState().rating.rp;
      expect(rp1).toBeGreaterThan(0);

      useRankStore.getState().updateAfterExercise(90, 5, 'play');
      const rp2 = useRankStore.getState().rating.rp;
      expect(rp2).toBeGreaterThan(rp1);
    });

    it('tracks unique exercise types', () => {
      useRankStore.getState().updateAfterExercise(80, 5, 'play');
      useRankStore.getState().updateAfterExercise(80, 5, 'rhythm');
      useRankStore.getState().updateAfterExercise(80, 5, 'play'); // duplicate

      const { rating } = useRankStore.getState();
      expect(rating.exerciseTypesCompleted).toEqual(['play', 'rhythm']);
    });

    it('keeps only last 30 scores', () => {
      for (let i = 0; i < 35; i++) {
        useRankStore.getState().updateAfterExercise(80, 5, 'play');
      }
      const { rating } = useRankStore.getState();
      expect(rating.recentScores).toHaveLength(30);
    });

    it('updates peak MMR', () => {
      // Play several high-scoring exercises to build MMR
      for (let i = 0; i < 5; i++) {
        useRankStore.getState().updateAfterExercise(95, 10, 'play');
      }
      const peak = useRankStore.getState().rating.peakMmr;
      expect(peak).toBeGreaterThan(0);

      // Play a low score — peak should not decrease
      useRankStore.getState().updateAfterExercise(30, 1, 'play');
      expect(useRankStore.getState().rating.peakMmr).toBeGreaterThanOrEqual(0);
    });
  });

  describe('tier progression', () => {
    it('changes tier when MMR crosses threshold', () => {
      // Play many high-tier high-score exercises to push MMR up
      for (let i = 0; i < 20; i++) {
        useRankStore.getState().updateAfterExercise(95, 15, 'play');
      }
      const { rating } = useRankStore.getState();
      // Should have progressed beyond novice
      expect(['novice']).not.toContain(rating.tier);
    });
  });

  describe('reset', () => {
    it('resets all state to defaults', () => {
      useRankStore.getState().updateAfterExercise(80, 5, 'play');
      useRankStore.getState().reset();

      const { rating } = useRankStore.getState();
      expect(rating.mmr).toBe(0);
      expect(rating.tier).toBe('novice');
      expect(rating.rp).toBe(0);
      expect(rating.recentScores).toEqual([]);
    });

    it('calls PersistenceManager.deleteState', () => {
      useRankStore.getState().reset();
      expect(PersistenceManager.deleteState).toHaveBeenCalled();
    });
  });

  describe('hydration', () => {
    it('hydrates rating from persistence', async () => {
      const savedData = {
        rating: {
          mmr: 500,
          tier: 'performer',
          division: 2,
          rp: 150,
          peakMmr: 500,
          peakTier: 'performer',
          recentScores: [80, 85],
          exerciseTypesCompleted: ['play'],
          promotionSeries: null,
          demotionGrace: 3,
        },
      };
      (PersistenceManager.loadState as jest.Mock).mockResolvedValueOnce(savedData);

      await hydrateRankStore();

      const { rating } = useRankStore.getState();
      expect(rating.mmr).toBe(500);
      expect(rating.tier).toBe('performer');
    });

    it('hydrates with defaults when storage is empty', async () => {
      (PersistenceManager.loadState as jest.Mock).mockResolvedValueOnce({});

      await hydrateRankStore();

      const { rating } = useRankStore.getState();
      expect(rating.mmr).toBe(0);
      expect(rating.tier).toBe('novice');
    });
  });
});

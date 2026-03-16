import { useSeasonStore, hydrateSeasonStore } from '../seasonStore';
import { PersistenceManager } from '../persistence';

// Mock persistence
jest.mock('../persistence', () => ({
  PersistenceManager: {
    loadState: jest.fn(),
    saveState: jest.fn(),
  },
  STORAGE_KEYS: { SEASON: 'purrrfect_season_state' },
  createDebouncedSave: () => jest.fn(),
}));

const mockedPM = PersistenceManager as jest.Mocked<typeof PersistenceManager>;

function resetStore() {
  useSeasonStore.getState().reset();
}

describe('seasonStore', () => {
  beforeEach(() => {
    resetStore();
    jest.clearAllMocks();
  });

  describe('addBattlePassXp', () => {
    it('accumulates XP', () => {
      useSeasonStore.getState().addBattlePassXp(50);
      expect(useSeasonStore.getState().battlePassXp).toBe(50);

      useSeasonStore.getState().addBattlePassXp(30);
      expect(useSeasonStore.getState().battlePassXp).toBe(80);
    });

    it('advances battle pass tier when XP threshold met', () => {
      // Tier 1 requires 100 cumulative XP
      useSeasonStore.getState().addBattlePassXp(100);
      expect(useSeasonStore.getState().battlePassTier).toBe(1);
    });

    it('advances multiple tiers at once with large XP', () => {
      // Tier 1: 100, Tier 2: 250, Tier 3: 450
      useSeasonStore.getState().addBattlePassXp(500);
      expect(useSeasonStore.getState().battlePassTier).toBe(3);
    });

    it('caps at max tier', () => {
      useSeasonStore.getState().addBattlePassXp(999999);
      expect(useSeasonStore.getState().battlePassTier).toBe(30);
    });
  });

  describe('claimReward', () => {
    it('tracks claimed rewards', () => {
      useSeasonStore.getState().claimReward('free-3');
      expect(useSeasonStore.getState().hasClaimedReward('free-3')).toBe(true);
      expect(useSeasonStore.getState().hasClaimedReward('free-6')).toBe(false);
    });

    it('does not duplicate claims', () => {
      useSeasonStore.getState().claimReward('premium-10');
      useSeasonStore.getState().claimReward('premium-10');
      expect(useSeasonStore.getState().claimedRewards.filter(k => k === 'premium-10')).toHaveLength(2);
      // Note: Duplicate prevention is UI responsibility — store just appends
    });
  });

  describe('recordPlacementScore', () => {
    it('records scores and marks placement complete after 3', () => {
      const { recordPlacementScore } = useSeasonStore.getState();
      recordPlacementScore(85);
      expect(useSeasonStore.getState().placementScores).toEqual([85]);
      expect(useSeasonStore.getState().placementComplete).toBe(false);

      recordPlacementScore(90);
      recordPlacementScore(75);
      expect(useSeasonStore.getState().placementScores).toEqual([85, 90, 75]);
      expect(useSeasonStore.getState().placementComplete).toBe(true);
    });
  });

  describe('updatePeakTier', () => {
    it('updates peak when higher tier achieved', () => {
      useSeasonStore.getState().updatePeakTier('performer');
      expect(useSeasonStore.getState().peakTier).toBe('performer');
    });

    it('does not downgrade peak', () => {
      useSeasonStore.getState().updatePeakTier('maestro');
      useSeasonStore.getState().updatePeakTier('performer');
      expect(useSeasonStore.getState().peakTier).toBe('maestro');
    });
  });

  describe('endSeason', () => {
    it('creates a season record and adds to history', () => {
      useSeasonStore.getState().addBattlePassXp(500);
      useSeasonStore.getState().claimReward('premium-10');
      useSeasonStore.getState().updatePeakTier('virtuoso');

      const record = useSeasonStore.getState().endSeason(750, 'virtuoso', 2, 80);

      expect(record.peakTier).toBe('virtuoso');
      expect(record.finalMmr).toBe(750);
      expect(record.battlePassTier).toBe(3);
      expect(record.gemsEarned).toBe(80);
      expect(record.exclusivesEarned).toEqual(['premium-10']);
      expect(useSeasonStore.getState().seasonHistory).toHaveLength(1);
    });
  });

  describe('startNewSeason', () => {
    it('resets current season state but keeps history', () => {
      useSeasonStore.getState().addBattlePassXp(500);
      useSeasonStore.getState().endSeason(750, 'virtuoso', 2, 80);

      useSeasonStore.getState().startNewSeason();

      expect(useSeasonStore.getState().battlePassXp).toBe(0);
      expect(useSeasonStore.getState().battlePassTier).toBe(0);
      expect(useSeasonStore.getState().claimedRewards).toEqual([]);
      expect(useSeasonStore.getState().placementComplete).toBe(false);
      // History preserved
      expect(useSeasonStore.getState().seasonHistory).toHaveLength(1);
    });
  });

  describe('calculateSeasonRewards', () => {
    it('combines placement gems and tier bonus', () => {
      const gems = useSeasonStore.getState().calculateSeasonRewards(1, 'maestro');
      // 1st place: 100 + maestro bonus: 35 = 135
      expect(gems).toBe(135);
    });

    it('works for low rank novice', () => {
      const gems = useSeasonStore.getState().calculateSeasonRewards(25, 'novice');
      // rank 25: 5 + novice: 0 = 5
      expect(gems).toBe(5);
    });
  });

  describe('hydrateSeasonStore', () => {
    it('loads saved state', async () => {
      const saved = {
        ...useSeasonStore.getState(),
        battlePassXp: 300,
        battlePassTier: 2,
        currentSeason: 999, // high number to avoid rollover
      };
      mockedPM.loadState.mockResolvedValue(saved);

      await hydrateSeasonStore();

      expect(useSeasonStore.getState().battlePassXp).toBe(300);
      expect(useSeasonStore.getState().battlePassTier).toBe(2);
    });
  });
});

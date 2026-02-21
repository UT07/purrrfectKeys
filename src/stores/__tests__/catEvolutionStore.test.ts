/**
 * Cat Evolution Store Tests
 *
 * Tests evolution stage transitions, ability unlocking, cat ownership,
 * daily reward calendar, Chonky Monké legendary unlock, and starter initialization.
 */

import { useCatEvolutionStore, stageFromXp, xpToNextStage } from '../catEvolutionStore';

// Mock persistence layer
jest.mock('../persistence', () => ({
  PersistenceManager: {
    saveState: jest.fn().mockResolvedValue(undefined),
    loadState: jest.fn().mockResolvedValue({}),
    deleteState: jest.fn().mockResolvedValue(undefined),
  },
  STORAGE_KEYS: {
    CAT_EVOLUTION: 'test_cat_evolution',
  },
  createDebouncedSave: () => jest.fn(),
}));

describe('catEvolutionStore', () => {
  beforeEach(() => {
    useCatEvolutionStore.getState().reset();
  });

  describe('stageFromXp (pure function)', () => {
    it('returns baby for 0 XP', () => {
      expect(stageFromXp(0)).toBe('baby');
    });

    it('returns baby for XP below 500', () => {
      expect(stageFromXp(499)).toBe('baby');
    });

    it('returns teen at exactly 500 XP', () => {
      expect(stageFromXp(500)).toBe('teen');
    });

    it('returns teen for XP between 500 and 1999', () => {
      expect(stageFromXp(1000)).toBe('teen');
      expect(stageFromXp(1999)).toBe('teen');
    });

    it('returns adult at exactly 2000 XP', () => {
      expect(stageFromXp(2000)).toBe('adult');
    });

    it('returns adult for XP between 2000 and 4999', () => {
      expect(stageFromXp(3500)).toBe('adult');
      expect(stageFromXp(4999)).toBe('adult');
    });

    it('returns master at exactly 5000 XP', () => {
      expect(stageFromXp(5000)).toBe('master');
    });

    it('returns master for XP above 5000', () => {
      expect(stageFromXp(99999)).toBe('master');
    });
  });

  describe('xpToNextStage (pure function)', () => {
    it('returns teen stage info for baby', () => {
      const result = xpToNextStage(200);
      expect(result).toEqual({ nextStage: 'teen', xpNeeded: 300 });
    });

    it('returns adult stage info for teen', () => {
      const result = xpToNextStage(800);
      expect(result).toEqual({ nextStage: 'adult', xpNeeded: 1200 });
    });

    it('returns master stage info for adult', () => {
      const result = xpToNextStage(3000);
      expect(result).toEqual({ nextStage: 'master', xpNeeded: 2000 });
    });

    it('returns null for master (max stage)', () => {
      expect(xpToNextStage(5000)).toBeNull();
      expect(xpToNextStage(10000)).toBeNull();
    });
  });

  describe('initializeStarterCat', () => {
    it('sets initial cat ownership and selection', () => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
      const state = useCatEvolutionStore.getState();

      expect(state.selectedCatId).toBe('mini-meowww');
      expect(state.ownedCats).toEqual(['mini-meowww']);
      expect(state.evolutionData['mini-meowww']).toBeDefined();
      expect(state.evolutionData['mini-meowww'].currentStage).toBe('baby');
      expect(state.evolutionData['mini-meowww'].xpAccumulated).toBe(0);
    });

    it('does nothing if already initialized', () => {
      useCatEvolutionStore.getState().initializeStarterCat('jazzy');
      useCatEvolutionStore.getState().initializeStarterCat('luna');

      const state = useCatEvolutionStore.getState();
      expect(state.selectedCatId).toBe('jazzy');
      expect(state.ownedCats).toEqual(['jazzy']);
    });
  });

  describe('selectCat', () => {
    it('switches to an owned cat', () => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
      useCatEvolutionStore.getState().unlockCat('jazzy');
      useCatEvolutionStore.getState().selectCat('jazzy');

      expect(useCatEvolutionStore.getState().selectedCatId).toBe('jazzy');
    });

    it('ignores selection of unowned cat', () => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
      useCatEvolutionStore.getState().selectCat('biscuit');

      expect(useCatEvolutionStore.getState().selectedCatId).toBe('mini-meowww');
    });
  });

  describe('unlockCat', () => {
    it('adds cat to owned list with default evolution data', () => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
      useCatEvolutionStore.getState().unlockCat('biscuit');

      const state = useCatEvolutionStore.getState();
      expect(state.ownedCats).toContain('biscuit');
      expect(state.evolutionData['biscuit']).toBeDefined();
      expect(state.evolutionData['biscuit'].currentStage).toBe('baby');
    });

    it('does not duplicate if already owned', () => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
      useCatEvolutionStore.getState().unlockCat('biscuit');
      useCatEvolutionStore.getState().unlockCat('biscuit');

      expect(
        useCatEvolutionStore.getState().ownedCats.filter(id => id === 'biscuit'),
      ).toHaveLength(1);
    });
  });

  describe('addEvolutionXp', () => {
    beforeEach(() => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
    });

    it('accumulates XP on a cat', () => {
      useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 100);
      expect(useCatEvolutionStore.getState().evolutionData['mini-meowww'].xpAccumulated).toBe(100);
    });

    it('returns null when no evolution occurs', () => {
      const result = useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 100);
      expect(result).toBeNull();
    });

    it('triggers teen evolution at 500 XP and returns new stage', () => {
      const result = useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 500);
      expect(result).toBe('teen');
      expect(useCatEvolutionStore.getState().evolutionData['mini-meowww'].currentStage).toBe('teen');
    });

    it('triggers adult evolution at 2000 XP', () => {
      useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 500); // teen
      const result = useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 1500); // adult
      expect(result).toBe('adult');
    });

    it('triggers master evolution at 5000 XP', () => {
      useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 2000);
      const result = useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 3000);
      expect(result).toBe('master');
    });

    it('can skip stages if enough XP given at once', () => {
      const result = useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 5000);
      expect(result).toBe('master');
      expect(useCatEvolutionStore.getState().evolutionData['mini-meowww'].currentStage).toBe('master');
    });

    it('unlocks abilities on evolution', () => {
      useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 500); // teen
      const abilities = useCatEvolutionStore.getState().evolutionData['mini-meowww'].abilitiesUnlocked;
      // Mini Meowww has baby ability (mm-note-preview) and teen ability (mm-timing-window)
      expect(abilities).toContain('mm-note-preview');
      expect(abilities).toContain('mm-timing-window');
    });

    it('unlocks all abilities at master', () => {
      useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 5000);
      const abilities = useCatEvolutionStore.getState().evolutionData['mini-meowww'].abilitiesUnlocked;
      expect(abilities).toContain('mm-note-preview');
      expect(abilities).toContain('mm-timing-window');
      expect(abilities).toContain('mm-xp-boost');
      expect(abilities).toContain('mm-perfect-shield');
      expect(abilities).toHaveLength(4);
    });

    it('records evolvedAt timestamp on evolution', () => {
      const before = Date.now();
      useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 500);
      const data = useCatEvolutionStore.getState().evolutionData['mini-meowww'];

      expect(data.evolvedAt.baby).toBeDefined();
      expect(data.evolvedAt.teen).toBeGreaterThanOrEqual(before);
      expect(data.evolvedAt.adult).toBeNull();
      expect(data.evolvedAt.master).toBeNull();
    });

    it('returns null for unknown cat', () => {
      const result = useCatEvolutionStore.getState().addEvolutionXp('nonexistent', 100);
      expect(result).toBeNull();
    });
  });

  describe('getActiveAbilities', () => {
    it('returns empty for no selected cat', () => {
      const abilities = useCatEvolutionStore.getState().getActiveAbilities();
      expect(abilities).toEqual([]);
    });

    it('returns unlocked abilities for selected cat', () => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
      useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 500);

      const abilities = useCatEvolutionStore.getState().getActiveAbilities();
      expect(abilities).toContain('mm-note-preview');
      expect(abilities).toContain('mm-timing-window');
    });

    it('only returns abilities for the selected cat', () => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
      useCatEvolutionStore.getState().unlockCat('jazzy');
      useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 5000);
      useCatEvolutionStore.getState().addEvolutionXp('jazzy', 5000);
      useCatEvolutionStore.getState().selectCat('jazzy');

      const abilities = useCatEvolutionStore.getState().getActiveAbilities();
      expect(abilities).toContain('jz-slow-start');
      expect(abilities).not.toContain('mm-note-preview');
    });
  });

  describe('claimDailyReward', () => {
    it('claims the current day reward', () => {
      const reward = useCatEvolutionStore.getState().claimDailyReward(1);
      expect(reward).toEqual({ type: 'gems', amount: 10 });
    });

    it('marks day as claimed', () => {
      useCatEvolutionStore.getState().claimDailyReward(1);
      const day1 = useCatEvolutionStore.getState().dailyRewards.days.find(d => d.day === 1);
      expect(day1?.claimed).toBe(true);
    });

    it('advances current day after claiming', () => {
      useCatEvolutionStore.getState().claimDailyReward(1);
      expect(useCatEvolutionStore.getState().dailyRewards.currentDay).toBe(2);
    });

    it('returns null for already claimed day', () => {
      useCatEvolutionStore.getState().claimDailyReward(1);
      const result = useCatEvolutionStore.getState().claimDailyReward(1);
      expect(result).toBeNull();
    });

    it('returns null for wrong day (not current day)', () => {
      const result = useCatEvolutionStore.getState().claimDailyReward(3);
      expect(result).toBeNull();
    });

    it('completes full 7-day calendar', () => {
      for (let day = 1; day <= 7; day++) {
        const reward = useCatEvolutionStore.getState().claimDailyReward(day);
        expect(reward).not.toBeNull();
      }
      // After day 7, currentDay should be 8 (week complete)
      expect(useCatEvolutionStore.getState().dailyRewards.currentDay).toBe(8);
    });

    it('day 7 reward is a chest', () => {
      // Claim days 1-6 first
      for (let day = 1; day <= 6; day++) {
        useCatEvolutionStore.getState().claimDailyReward(day);
      }
      const reward = useCatEvolutionStore.getState().claimDailyReward(7);
      expect(reward).toEqual({ type: 'chest', amount: 50 });
    });
  });

  describe('resetDailyRewards', () => {
    it('resets all days to unclaimed', () => {
      useCatEvolutionStore.getState().claimDailyReward(1);
      useCatEvolutionStore.getState().claimDailyReward(2);
      useCatEvolutionStore.getState().resetDailyRewards();

      const state = useCatEvolutionStore.getState();
      expect(state.dailyRewards.currentDay).toBe(1);
      expect(state.dailyRewards.days.every(d => !d.claimed)).toBe(true);
    });
  });

  describe('Chonky Monké legendary unlock', () => {
    it('is not eligible with low streak and few skills', () => {
      const eligible = useCatEvolutionStore.getState().checkChonkyEligibility(50, 20);
      expect(eligible).toBe(false);
    });

    it('is eligible with 300+ day streak', () => {
      const eligible = useCatEvolutionStore.getState().checkChonkyEligibility(300, 0);
      expect(eligible).toBe(true);
    });

    it('is eligible with 100+ skills mastered', () => {
      const eligible = useCatEvolutionStore.getState().checkChonkyEligibility(0, 100);
      expect(eligible).toBe(true);
    });

    it('tracks progress flags correctly', () => {
      useCatEvolutionStore.getState().checkChonkyEligibility(300, 50);
      const progress = useCatEvolutionStore.getState().chonkyUnlockProgress;
      expect(progress.daysStreakReached).toBe(true);
      expect(progress.skillsMasteredReached).toBe(false);
    });

    it('unlockChonky adds to owned cats', () => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
      useCatEvolutionStore.getState().unlockChonky();

      const state = useCatEvolutionStore.getState();
      expect(state.ownedCats).toContain('chonky-monke');
      expect(state.evolutionData['chonky-monke']).toBeDefined();
      expect(state.evolutionData['chonky-monke'].currentStage).toBe('baby');
    });

    it('unlockChonky is idempotent', () => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
      useCatEvolutionStore.getState().unlockChonky();
      useCatEvolutionStore.getState().unlockChonky();

      expect(
        useCatEvolutionStore.getState().ownedCats.filter(id => id === 'chonky-monke'),
      ).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('clears all evolution data', () => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
      useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 1000);
      useCatEvolutionStore.getState().claimDailyReward(1);
      useCatEvolutionStore.getState().reset();

      const state = useCatEvolutionStore.getState();
      expect(state.selectedCatId).toBe('');
      expect(state.ownedCats).toEqual([]);
      expect(state.evolutionData).toEqual({});
      expect(state.dailyRewards.currentDay).toBe(1);
    });
  });

  describe('multi-cat evolution', () => {
    it('evolves different cats independently', () => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
      useCatEvolutionStore.getState().unlockCat('jazzy');

      useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 500); // teen
      useCatEvolutionStore.getState().addEvolutionXp('jazzy', 2000); // adult

      const mmData = useCatEvolutionStore.getState().evolutionData['mini-meowww'];
      const jzData = useCatEvolutionStore.getState().evolutionData['jazzy'];

      expect(mmData.currentStage).toBe('teen');
      expect(jzData.currentStage).toBe('adult');
    });

    it('abilities are specific to each cat', () => {
      useCatEvolutionStore.getState().initializeStarterCat('mini-meowww');
      useCatEvolutionStore.getState().unlockCat('luna');

      useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 500);
      useCatEvolutionStore.getState().addEvolutionXp('luna', 500);

      const mmAbilities = useCatEvolutionStore.getState().evolutionData['mini-meowww'].abilitiesUnlocked;
      const lnAbilities = useCatEvolutionStore.getState().evolutionData['luna'].abilitiesUnlocked;

      expect(mmAbilities).toContain('mm-timing-window');
      expect(mmAbilities).not.toContain('ln-extra-retries');
      expect(lnAbilities).toContain('ln-extra-retries');
      expect(lnAbilities).not.toContain('mm-timing-window');
    });
  });
});

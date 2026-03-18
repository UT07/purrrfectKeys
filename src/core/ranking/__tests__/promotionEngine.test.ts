import {
  shouldStartPromotion,
  recordPromotionResult,
  createPromotionSeries,
  shouldDemote,
  updateDemotionGrace,
  getDemotionGraceInitial,
  getTierAfterDemotion,
} from '../promotionEngine';

describe('Promotion Engine', () => {
  describe('shouldStartPromotion', () => {
    it('returns true when tier changes upward', () => {
      expect(shouldStartPromotion('novice', 'apprentice', null)).toBe(true);
    });
    it('returns false when already in a series', () => {
      const activeSeries = createPromotionSeries();
      expect(shouldStartPromotion('novice', 'apprentice', activeSeries)).toBe(false);
    });
    it('returns false when tier stays the same', () => {
      expect(shouldStartPromotion('novice', 'novice', null)).toBe(false);
    });
    it('returns false when tier goes down', () => {
      expect(shouldStartPromotion('apprentice', 'novice', null)).toBe(false);
    });
  });

  describe('recordPromotionResult', () => {
    it('records a win', () => {
      const series = createPromotionSeries();
      const { series: updated, promoted, failed } = recordPromotionResult(series, true);
      expect(updated.wins).toBe(1);
      expect(promoted).toBe(false);
      expect(failed).toBe(false);
    });
    it('promotes at 2 wins', () => {
      let series = createPromotionSeries();
      ({ series } = recordPromotionResult(series, true));
      const { series: final, promoted } = recordPromotionResult(series, true);
      expect(promoted).toBe(true);
      expect(final.active).toBe(false);
    });
    it('fails at 2 losses', () => {
      let series = createPromotionSeries();
      ({ series } = recordPromotionResult(series, false));
      const { series: final, failed } = recordPromotionResult(series, false);
      expect(failed).toBe(true);
      expect(final.active).toBe(false);
    });
    it('allows mixed results — 2 wins 1 loss = promote', () => {
      let series = createPromotionSeries();
      ({ series } = recordPromotionResult(series, true));
      ({ series } = recordPromotionResult(series, false));
      const { promoted } = recordPromotionResult(series, true);
      expect(promoted).toBe(true);
    });
  });

  describe('demotion grace', () => {
    it('should not demote novice players', () => {
      expect(shouldDemote(0, 'novice', 0)).toBe(false);
    });
    it('should not demote when grace remaining', () => {
      expect(shouldDemote(100, 'apprentice', 2)).toBe(false);
    });
    it('should demote when below floor and grace exhausted', () => {
      expect(shouldDemote(100, 'apprentice', 0)).toBe(true);
    });
    it('should not demote when MMR above floor even with no grace', () => {
      expect(shouldDemote(250, 'apprentice', 0)).toBe(false);
    });
  });

  describe('updateDemotionGrace', () => {
    it('resets grace when above floor', () => {
      const grace = updateDemotionGrace(300, 'apprentice', 1);
      expect(grace).toBe(getDemotionGraceInitial());
    });
    it('decrements grace when below floor', () => {
      const grace = updateDemotionGrace(150, 'apprentice', 3);
      expect(grace).toBe(2);
    });
    it('does not go below 0', () => {
      const grace = updateDemotionGrace(150, 'apprentice', 0);
      expect(grace).toBe(0);
    });
  });

  describe('getTierAfterDemotion', () => {
    it('returns previous tier', () => {
      expect(getTierAfterDemotion('apprentice')).toBe('novice');
      expect(getTierAfterDemotion('maestro')).toBe('virtuoso');
    });
    it('returns novice for novice', () => {
      expect(getTierAfterDemotion('novice')).toBe('novice');
    });
  });
});

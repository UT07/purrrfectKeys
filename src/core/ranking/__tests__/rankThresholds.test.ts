import {
  tierFromMMR,
  divisionFromMMR,
  mmrToNextThreshold,
  getRankConfig,
  getTierFloor,
} from '../rankThresholds';

describe('Rank Thresholds', () => {
  describe('tierFromMMR', () => {
    it('returns novice for MMR 0', () => {
      expect(tierFromMMR(0)).toBe('novice');
    });
    it('returns novice for MMR 199', () => {
      expect(tierFromMMR(199)).toBe('novice');
    });
    it('returns apprentice for MMR 200', () => {
      expect(tierFromMMR(200)).toBe('apprentice');
    });
    it('returns performer for MMR 500', () => {
      expect(tierFromMMR(500)).toBe('performer');
    });
    it('returns maestro for MMR 800', () => {
      expect(tierFromMMR(800)).toBe('maestro');
    });
    it('returns grandmaster for MMR 1600', () => {
      expect(tierFromMMR(1600)).toBe('grandmaster');
    });
    it('returns grandmaster for MMR 1800', () => {
      expect(tierFromMMR(1800)).toBe('grandmaster');
    });
    it('returns grandmaster for very high MMR', () => {
      expect(tierFromMMR(5000)).toBe('grandmaster');
    });
  });

  describe('divisionFromMMR', () => {
    it('returns division 3 for bottom of tier', () => {
      expect(divisionFromMMR(0, 'novice')).toBe(3);
    });
    it('returns division 1 for top of tier', () => {
      expect(divisionFromMMR(199, 'novice')).toBe(1);
    });
    it('returns division 2 for middle of tier', () => {
      // Apprentice: 200-399. Division size ≈ 66.7. Offset 100 → division 2
      expect(divisionFromMMR(300, 'apprentice')).toBe(2);
    });
    it('always returns 1 for grandmaster', () => {
      expect(divisionFromMMR(1600, 'grandmaster')).toBe(1);
      expect(divisionFromMMR(3000, 'grandmaster')).toBe(1);
    });
  });

  describe('mmrToNextThreshold', () => {
    it('returns distance to next tier', () => {
      expect(mmrToNextThreshold(0)).toBe(200); // 0 → 200 (apprentice)
    });
    it('returns 1 when at top of tier', () => {
      expect(mmrToNextThreshold(199)).toBe(1); // 199 → 200
    });
    it('returns 0 for grandmaster', () => {
      expect(mmrToNextThreshold(1800)).toBe(0);
    });
  });

  describe('getRankConfig', () => {
    it('returns correct config for a tier', () => {
      const config = getRankConfig('virtuoso');
      expect(config.label).toBe('Virtuoso');
      expect(config.color).toBe('#FFD700');
      expect(config.mmrFloor).toBe(600);
    });
  });

  describe('getTierFloor', () => {
    it('returns 0 for novice', () => {
      expect(getTierFloor('novice')).toBe(0);
    });
    it('returns 1600 for grandmaster', () => {
      expect(getTierFloor('grandmaster')).toBe(1600);
    });
  });
});

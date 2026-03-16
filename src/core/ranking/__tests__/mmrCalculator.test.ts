import { calculateMMR, exponentialMovingAverage } from '../mmrCalculator';

describe('MMR Calculator', () => {
  describe('exponentialMovingAverage', () => {
    it('returns the score itself for a single entry', () => {
      expect(exponentialMovingAverage([85])).toBe(85);
    });
    it('weights recent scores higher', () => {
      const scores = [50, 50, 50, 50, 90]; // recent 90 should pull average up
      const ema = exponentialMovingAverage(scores);
      expect(ema).toBeGreaterThan(55);
    });
    it('handles empty array', () => {
      expect(exponentialMovingAverage([])).toBe(0);
    });
    it('caps at 30 most recent scores', () => {
      const scores = Array(50).fill(80);
      scores.push(100); // only last 30 should matter
      expect(exponentialMovingAverage(scores)).toBeCloseTo(exponentialMovingAverage(scores.slice(-30)), 1);
    });
  });

  describe('calculateMMR', () => {
    it('returns 0 for empty inputs', () => {
      expect(calculateMMR([], 1, [])).toBe(0);
    });
    it('increases with higher scores', () => {
      const low = calculateMMR([50, 50, 50], 5, ['play']);
      const high = calculateMMR([90, 90, 90], 5, ['play']);
      expect(high).toBeGreaterThan(low);
    });
    it('increases with higher difficulty tier', () => {
      const lowTier = calculateMMR([80, 80], 3, ['play']);
      const highTier = calculateMMR([80, 80], 12, ['play']);
      expect(highTier).toBeGreaterThan(lowTier);
    });
    it('rewards consistency (low variance)', () => {
      const consistent = calculateMMR([80, 80, 80, 80], 5, ['play']);
      const inconsistent = calculateMMR([60, 100, 60, 100], 5, ['play']);
      expect(consistent).toBeGreaterThan(inconsistent);
    });
    it('adds breadth bonus for multiple exercise types', () => {
      const oneType = calculateMMR([80], 5, ['play']);
      const threeTypes = calculateMMR([80], 5, ['play', 'rhythm', 'earTraining']);
      expect(threeTypes - oneType).toBeCloseTo(50, 0); // 2 extra × 25 = 50
    });
    it('caps breadth bonus at 6 types', () => {
      const six = calculateMMR([80], 5, ['a', 'b', 'c', 'd', 'e', 'f']);
      const eight = calculateMMR([80], 5, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
      expect(eight).toBe(six);
    });
  });
});

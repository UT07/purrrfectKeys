import { calculateRP } from '../rpCalculator';

describe('RP Calculator', () => {
  it('returns 0 for score of 0', () => {
    expect(calculateRP(0, 5)).toBe(0);
  });
  it('returns 0 for negative score', () => {
    expect(calculateRP(-10, 5)).toBe(0);
  });
  it('returns baseline RP at score 70 tier 1', () => {
    // baseRP = 10 + 1*2 = 12, performance = 70/70 = 1 → 12
    expect(calculateRP(70, 1)).toBe(12);
  });
  it('scales with score above 70', () => {
    // baseRP = 10 + 5*2 = 20, performance = 100/70 ≈ 1.43 → 29
    expect(calculateRP(100, 5)).toBe(29);
  });
  it('scales with difficulty tier', () => {
    // baseRP = 10 + 18*2 = 46, performance = 70/70 = 1 → 46
    expect(calculateRP(70, 18)).toBe(46);
  });
  it('gives proportionally less RP for low scores', () => {
    // baseRP = 10 + 5*2 = 20, performance = 40/70 ≈ 0.57 → 11
    expect(calculateRP(40, 5)).toBe(11);
  });
  it('RP increases with both score and tier', () => {
    const lowBoth = calculateRP(50, 1);
    const highBoth = calculateRP(95, 15);
    expect(highBoth).toBeGreaterThan(lowBoth);
  });
});

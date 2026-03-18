import {
  softResetMMR,
  MMR_RESET_BASELINE,
  gemsForPlacement,
  tierGemBonus,
  xpForBattlePassTier,
  cumulativeXpForTier,
  generateBattlePassTiers,
  BATTLE_PASS_MAX_TIER,
  seasonNumberFromDate,
  getCurrentSeasonDates,
} from '../seasonConfig';

describe('softResetMMR', () => {
  it('pulls high MMR toward baseline', () => {
    const result = softResetMMR(1600);
    // 1600 * 0.8 + 500 * 0.2 = 1280 + 100 = 1380
    expect(result).toBe(1380);
  });

  it('pushes low MMR toward baseline', () => {
    const result = softResetMMR(100);
    // 100 * 0.8 + 500 * 0.2 = 80 + 100 = 180
    expect(result).toBe(180);
  });

  it('keeps baseline MMR unchanged', () => {
    const result = softResetMMR(MMR_RESET_BASELINE);
    expect(result).toBe(MMR_RESET_BASELINE);
  });

  it('preserves 0 MMR approximately', () => {
    const result = softResetMMR(0);
    // 0 * 0.8 + 500 * 0.2 = 100
    expect(result).toBe(100);
  });
});

describe('gemsForPlacement', () => {
  it('awards 100 gems for 1st place', () => {
    expect(gemsForPlacement(1)).toBe(100);
  });

  it('awards 75 gems for 2nd place', () => {
    expect(gemsForPlacement(2)).toBe(75);
  });

  it('awards 50 gems for 3rd place', () => {
    expect(gemsForPlacement(3)).toBe(50);
  });

  it('awards 30 gems for top 5', () => {
    expect(gemsForPlacement(4)).toBe(30);
    expect(gemsForPlacement(5)).toBe(30);
  });

  it('awards 20 gems for top 10', () => {
    expect(gemsForPlacement(6)).toBe(20);
    expect(gemsForPlacement(10)).toBe(20);
  });

  it('awards 10 gems for top 15', () => {
    expect(gemsForPlacement(11)).toBe(10);
    expect(gemsForPlacement(15)).toBe(10);
  });

  it('awards 5 gems for participation (16-30)', () => {
    expect(gemsForPlacement(16)).toBe(5);
    expect(gemsForPlacement(30)).toBe(5);
  });

  it('returns 0 for out-of-range rank', () => {
    expect(gemsForPlacement(31)).toBe(0);
    expect(gemsForPlacement(0)).toBe(0);
  });
});

describe('tierGemBonus', () => {
  it('returns 0 for novice', () => {
    expect(tierGemBonus('novice')).toBe(0);
  });

  it('scales with tier', () => {
    expect(tierGemBonus('apprentice')).toBe(5);
    expect(tierGemBonus('maestro')).toBe(35);
    expect(tierGemBonus('grandmaster')).toBe(150);
  });
});

describe('Battle Pass XP', () => {
  it('tier 1 requires base XP', () => {
    expect(xpForBattlePassTier(1)).toBe(100);
  });

  it('XP grows linearly per tier', () => {
    expect(xpForBattlePassTier(2)).toBe(150);
    expect(xpForBattlePassTier(3)).toBe(200);
  });

  it('cumulative XP is sum of all tiers', () => {
    // tier 1: 100, tier 2: 150 → cumulative at 2 = 250
    expect(cumulativeXpForTier(1)).toBe(100);
    expect(cumulativeXpForTier(2)).toBe(250);
    // tier 3: 200 → cumulative = 450
    expect(cumulativeXpForTier(3)).toBe(450);
  });
});

describe('generateBattlePassTiers', () => {
  const tiers = generateBattlePassTiers();

  it('generates correct number of tiers', () => {
    expect(tiers).toHaveLength(BATTLE_PASS_MAX_TIER);
  });

  it('tiers have increasing XP requirements', () => {
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].xpRequired).toBeGreaterThan(tiers[i - 1].xpRequired);
    }
  });

  it('has free rewards every 3 tiers', () => {
    const freeRewardTiers = tiers.filter(t => t.freeReward !== null);
    expect(freeRewardTiers.length).toBe(10); // 30 / 3
    for (const t of freeRewardTiers) {
      expect(t.tier % 3).toBe(0);
    }
  });

  it('has premium rewards every 2 tiers', () => {
    const premiumRewardTiers = tiers.filter(t => t.premiumReward !== null);
    expect(premiumRewardTiers.length).toBe(15); // 30 / 2
  });

  it('tier 30 premium reward is season champion title', () => {
    const tier30 = tiers[29];
    expect(tier30.premiumReward?.type).toBe('title');
    expect(tier30.premiumReward?.itemId).toBe('season-champion');
  });
});

describe('seasonNumberFromDate', () => {
  it('returns 1 for launch week', () => {
    const launchDay = new Date('2026-03-16T12:00:00Z');
    expect(seasonNumberFromDate(launchDay)).toBe(1);
  });

  it('returns 2 for second week', () => {
    const week2 = new Date('2026-03-23T12:00:00Z');
    expect(seasonNumberFromDate(week2)).toBe(2);
  });

  it('returns 1 for dates before epoch', () => {
    const before = new Date('2026-01-01T00:00:00Z');
    expect(seasonNumberFromDate(before)).toBe(1);
  });
});

describe('getCurrentSeasonDates', () => {
  it('returns start and end as ISO date strings', () => {
    const { start, end } = getCurrentSeasonDates();
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // end should be 6 days after start
    const startDate = new Date(start + 'T00:00:00Z');
    const endDate = new Date(end + 'T00:00:00Z');
    const diffDays = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(6);
  });
});

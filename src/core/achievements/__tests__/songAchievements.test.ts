/**
 * Song Achievement Tests
 *
 * Tests the 5 song-related condition types and 6 song achievements.
 */

import {
  isConditionMet,
  checkAchievements,
  getAchievementsByCategory,
  type AchievementContext,
  type AchievementCondition,
} from '../achievements';

// ---------------------------------------------------------------------------
// Helper: minimal context with all zeros / false
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<AchievementContext> = {}): AchievementContext {
  return {
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    lessonsCompleted: 0,
    perfectScores: 0,
    totalExercisesCompleted: 0,
    totalNotesPlayed: 0,
    catsUnlocked: 0,
    highScoreExercises: 0,
    sessionExercises: 0,
    exercisesWithSameCat: 0,
    isEarlyPractice: false,
    isLatePractice: false,
    hasCatSelected: false,
    anyCatEvolvedTeen: false,
    anyCatEvolvedAdult: false,
    anyCatEvolvedMaster: false,
    abilitiesUnlocked: 0,
    catsOwned: 0,
    hasChonky: false,
    isChonkyMaster: false,
    totalGemsEarned: 0,
    totalGemsSpent: 0,
    hasCheckedLockedCat: false,
    dailyRewardStreak: 0,
    dailyRewardsTotal: 0,
    fastestExerciseSeconds: 0,
    isLateNightPractice: false,
    isEarlyMorningPractice: false,
    sessionMinutes: 0,
    songsBronzePlus: 0,
    songsSilverPlus: 0,
    hasAnySongPlatinum: false,
    classicalSongsBronzePlus: 0,
    genresCoveredBronzePlus: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// isConditionMet — song conditions
// ---------------------------------------------------------------------------

describe('isConditionMet — song conditions', () => {
  it('songs_bronze_count: true when count meets threshold', () => {
    const cond: AchievementCondition = { type: 'songs_bronze_count', threshold: 1 };
    expect(isConditionMet(cond, makeContext({ songsBronzePlus: 1 }))).toBe(true);
    expect(isConditionMet(cond, makeContext({ songsBronzePlus: 0 }))).toBe(false);
  });

  it('songs_bronze_count: true when count exceeds threshold', () => {
    const cond: AchievementCondition = { type: 'songs_bronze_count', threshold: 25 };
    expect(isConditionMet(cond, makeContext({ songsBronzePlus: 30 }))).toBe(true);
    expect(isConditionMet(cond, makeContext({ songsBronzePlus: 24 }))).toBe(false);
  });

  it('song_platinum_any: true when has platinum', () => {
    const cond: AchievementCondition = { type: 'song_platinum_any', threshold: 1 };
    expect(isConditionMet(cond, makeContext({ hasAnySongPlatinum: true }))).toBe(true);
    expect(isConditionMet(cond, makeContext({ hasAnySongPlatinum: false }))).toBe(false);
  });

  it('songs_by_genre: true when enough genres covered', () => {
    const cond: AchievementCondition = { type: 'songs_by_genre', threshold: 3 };
    expect(isConditionMet(cond, makeContext({ genresCoveredBronzePlus: 3 }))).toBe(true);
    expect(isConditionMet(cond, makeContext({ genresCoveredBronzePlus: 2 }))).toBe(false);
  });

  it('songs_classical_count: true when enough classical songs', () => {
    const cond: AchievementCondition = { type: 'songs_classical_count', threshold: 10 };
    expect(isConditionMet(cond, makeContext({ classicalSongsBronzePlus: 10 }))).toBe(true);
    expect(isConditionMet(cond, makeContext({ classicalSongsBronzePlus: 9 }))).toBe(false);
  });

  it('songs_silver_count: true when enough silver songs', () => {
    const cond: AchievementCondition = { type: 'songs_silver_count', threshold: 50 };
    expect(isConditionMet(cond, makeContext({ songsSilverPlus: 50 }))).toBe(true);
    expect(isConditionMet(cond, makeContext({ songsSilverPlus: 49 }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkAchievements — song category
// ---------------------------------------------------------------------------

describe('checkAchievements — song achievements', () => {
  it('returns first-song-mastered on first bronze', () => {
    const ctx = makeContext({ songsBronzePlus: 1 });
    const unlocked = checkAchievements(ctx, new Set());
    expect(unlocked).toContain('first-song-mastered');
  });

  it('does not re-trigger already-unlocked', () => {
    const ctx = makeContext({ songsBronzePlus: 1 });
    const unlocked = checkAchievements(ctx, new Set(['first-song-mastered']));
    expect(unlocked).not.toContain('first-song-mastered');
  });

  it('returns genre-explorer when 3 genres covered', () => {
    const ctx = makeContext({ songsBronzePlus: 3, genresCoveredBronzePlus: 3 });
    const unlocked = checkAchievements(ctx, new Set());
    expect(unlocked).toContain('genre-explorer');
  });

  it('returns platinum-pianist on first platinum', () => {
    const ctx = makeContext({ hasAnySongPlatinum: true, songsBronzePlus: 1, songsSilverPlus: 1 });
    const unlocked = checkAchievements(ctx, new Set());
    expect(unlocked).toContain('platinum-pianist');
  });

  it('song-collector requires 25 bronze+', () => {
    const ctx25 = makeContext({ songsBronzePlus: 25 });
    const ctx24 = makeContext({ songsBronzePlus: 24 });
    expect(checkAchievements(ctx25, new Set())).toContain('song-collector');
    expect(checkAchievements(ctx24, new Set())).not.toContain('song-collector');
  });

  it('classical-connoisseur requires 10 classical songs', () => {
    const ctx = makeContext({ classicalSongsBronzePlus: 10, songsBronzePlus: 10 });
    const unlocked = checkAchievements(ctx, new Set());
    expect(unlocked).toContain('classical-connoisseur');
  });

  it('melody-master requires 50 silver+', () => {
    const ctx = makeContext({ songsSilverPlus: 50, songsBronzePlus: 50 });
    const unlocked = checkAchievements(ctx, new Set());
    expect(unlocked).toContain('melody-master');
  });
});

// ---------------------------------------------------------------------------
// Category filter
// ---------------------------------------------------------------------------

describe('song achievement category', () => {
  it('getAchievementsByCategory returns 6 song achievements', () => {
    const songAchievements = getAchievementsByCategory('song');
    expect(songAchievements).toHaveLength(6);
    const ids = songAchievements.map((a) => a.id);
    expect(ids).toContain('first-song-mastered');
    expect(ids).toContain('genre-explorer');
    expect(ids).toContain('classical-connoisseur');
    expect(ids).toContain('platinum-pianist');
    expect(ids).toContain('song-collector');
    expect(ids).toContain('melody-master');
  });
});

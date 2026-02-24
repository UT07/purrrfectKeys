/**
 * Achievement Definitions and Condition Checking Tests
 * Tests pure TypeScript logic - no React dependencies
 */

import {
  ACHIEVEMENTS,
  checkAchievements,
  isConditionMet,
  getAchievementById,
  getAchievementsByCategory,
} from '../achievements';
import type { AchievementContext, AchievementCondition } from '../achievements';

/** Helper: create a default context with all zeros */
function defaultContext(overrides: Partial<AchievementContext> = {}): AchievementContext {
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
    // Evolution
    hasCatSelected: false,
    anyCatEvolvedTeen: false,
    anyCatEvolvedAdult: false,
    anyCatEvolvedMaster: false,
    abilitiesUnlocked: 0,
    catsOwned: 0,
    hasChonky: false,
    isChonkyMaster: false,
    // Gems
    totalGemsEarned: 0,
    totalGemsSpent: 0,
    hasCheckedLockedCat: false,
    // Daily rewards
    dailyRewardStreak: 0,
    dailyRewardsTotal: 0,
    // Time
    fastestExerciseSeconds: 0,
    isLateNightPractice: false,
    isEarlyMorningPractice: false,
    sessionMinutes: 0,
    // Songs
    songsBronzePlus: 0,
    songsSilverPlus: 0,
    hasAnySongPlatinum: false,
    classicalSongsBronzePlus: 0,
    genresCoveredBronzePlus: 0,
    ...overrides,
  };
}

describe('Achievement Definitions', () => {
  it('should have at least 56 achievements', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(56);
  });

  it('should have unique IDs', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid categories for all achievements', () => {
    const validCategories = [
      'milestone', 'streak', 'score', 'xp', 'practice', 'collection',
      'evolution', 'gems', 'daily-reward', 'time', 'song',
    ];
    for (const achievement of ACHIEVEMENTS) {
      expect(validCategories).toContain(achievement.category);
    }
  });

  it('should have positive XP rewards for all achievements', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.xpReward).toBeGreaterThan(0);
    }
  });

  it('should have non-empty titles and descriptions', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(achievement.title.length).toBeGreaterThan(0);
      expect(achievement.description.length).toBeGreaterThan(0);
    }
  });
});

describe('getAchievementById', () => {
  it('should return achievement for valid ID', () => {
    const achievement = getAchievementById('first-exercise');
    expect(achievement).toBeDefined();
    expect(achievement?.title).toBe('First Note');
  });

  it('should return undefined for invalid ID', () => {
    const achievement = getAchievementById('does-not-exist');
    expect(achievement).toBeUndefined();
  });
});

describe('getAchievementsByCategory', () => {
  it('should return achievements filtered by category', () => {
    const streakAchievements = getAchievementsByCategory('streak');
    expect(streakAchievements.length).toBeGreaterThanOrEqual(4);
    for (const a of streakAchievements) {
      expect(a.category).toBe('streak');
    }
  });

  it('should return empty array for non-existent category', () => {
    // Cast to bypass type checking for this edge case test
    const result = getAchievementsByCategory('nonexistent' as 'milestone');
    expect(result).toEqual([]);
  });
});

describe('isConditionMet', () => {
  it('should check lessons_completed condition', () => {
    const condition: AchievementCondition = { type: 'lessons_completed', threshold: 5 };
    expect(isConditionMet(condition, defaultContext({ lessonsCompleted: 4 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ lessonsCompleted: 5 }))).toBe(true);
    expect(isConditionMet(condition, defaultContext({ lessonsCompleted: 10 }))).toBe(true);
  });

  it('should check exercises_completed condition', () => {
    const condition: AchievementCondition = { type: 'exercises_completed', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ totalExercisesCompleted: 0 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ totalExercisesCompleted: 1 }))).toBe(true);
  });

  it('should check current_streak condition', () => {
    const condition: AchievementCondition = { type: 'current_streak', threshold: 7 };
    expect(isConditionMet(condition, defaultContext({ currentStreak: 6 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ currentStreak: 7 }))).toBe(true);
    expect(isConditionMet(condition, defaultContext({ currentStreak: 30 }))).toBe(true);
  });

  it('should check perfect_scores condition', () => {
    const condition: AchievementCondition = { type: 'perfect_scores', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ perfectScores: 0 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ perfectScores: 1 }))).toBe(true);
  });

  it('should check high_score_count condition', () => {
    const condition: AchievementCondition = { type: 'high_score_count', threshold: 10 };
    expect(isConditionMet(condition, defaultContext({ highScoreExercises: 9 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ highScoreExercises: 10 }))).toBe(true);
  });

  it('should check total_xp condition', () => {
    const condition: AchievementCondition = { type: 'total_xp', threshold: 1000 };
    expect(isConditionMet(condition, defaultContext({ totalXp: 999 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ totalXp: 1000 }))).toBe(true);
  });

  it('should check level condition', () => {
    const condition: AchievementCondition = { type: 'level', threshold: 5 };
    expect(isConditionMet(condition, defaultContext({ level: 4 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ level: 5 }))).toBe(true);
  });

  it('should check total_notes_played condition', () => {
    const condition: AchievementCondition = { type: 'total_notes_played', threshold: 100 };
    expect(isConditionMet(condition, defaultContext({ totalNotesPlayed: 99 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ totalNotesPlayed: 100 }))).toBe(true);
  });

  it('should check cats_unlocked condition', () => {
    const condition: AchievementCondition = { type: 'cats_unlocked', threshold: 3 };
    expect(isConditionMet(condition, defaultContext({ catsUnlocked: 2 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ catsUnlocked: 3 }))).toBe(true);
  });

  it('should check session_exercises condition', () => {
    const condition: AchievementCondition = { type: 'session_exercises', threshold: 10 };
    expect(isConditionMet(condition, defaultContext({ sessionExercises: 9 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ sessionExercises: 10 }))).toBe(true);
  });

  it('should check exercises_with_same_cat condition', () => {
    const condition: AchievementCondition = { type: 'exercises_with_same_cat', threshold: 50 };
    expect(isConditionMet(condition, defaultContext({ exercisesWithSameCat: 49 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ exercisesWithSameCat: 50 }))).toBe(true);
  });

  it('should check early_practice condition', () => {
    const condition: AchievementCondition = { type: 'early_practice', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ isEarlyPractice: false }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ isEarlyPractice: true }))).toBe(true);
  });

  it('should check late_practice condition', () => {
    const condition: AchievementCondition = { type: 'late_practice', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ isLatePractice: false }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ isLatePractice: true }))).toBe(true);
  });

  // Evolution conditions
  it('should check cat_selected condition', () => {
    const condition: AchievementCondition = { type: 'cat_selected', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ hasCatSelected: false }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ hasCatSelected: true }))).toBe(true);
  });

  it('should check cat_evolved_teen condition', () => {
    const condition: AchievementCondition = { type: 'cat_evolved_teen', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ anyCatEvolvedTeen: false }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ anyCatEvolvedTeen: true }))).toBe(true);
  });

  it('should check cat_evolved_adult condition', () => {
    const condition: AchievementCondition = { type: 'cat_evolved_adult', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ anyCatEvolvedAdult: false }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ anyCatEvolvedAdult: true }))).toBe(true);
  });

  it('should check cat_evolved_master condition', () => {
    const condition: AchievementCondition = { type: 'cat_evolved_master', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ anyCatEvolvedMaster: false }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ anyCatEvolvedMaster: true }))).toBe(true);
  });

  it('should check abilities_unlocked condition', () => {
    const condition: AchievementCondition = { type: 'abilities_unlocked', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ abilitiesUnlocked: 0 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ abilitiesUnlocked: 1 }))).toBe(true);
  });

  it('should check cats_owned condition', () => {
    const condition: AchievementCondition = { type: 'cats_owned', threshold: 3 };
    expect(isConditionMet(condition, defaultContext({ catsOwned: 2 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ catsOwned: 3 }))).toBe(true);
  });

  it('should check has_chonky condition', () => {
    const condition: AchievementCondition = { type: 'has_chonky', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ hasChonky: false }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ hasChonky: true }))).toBe(true);
  });

  it('should check chonky_master condition', () => {
    const condition: AchievementCondition = { type: 'chonky_master', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ isChonkyMaster: false }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ isChonkyMaster: true }))).toBe(true);
  });

  // Gem conditions
  it('should check total_gems_earned condition', () => {
    const condition: AchievementCondition = { type: 'total_gems_earned', threshold: 100 };
    expect(isConditionMet(condition, defaultContext({ totalGemsEarned: 99 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ totalGemsEarned: 100 }))).toBe(true);
  });

  it('should check total_gems_spent condition', () => {
    const condition: AchievementCondition = { type: 'total_gems_spent', threshold: 1000 };
    expect(isConditionMet(condition, defaultContext({ totalGemsSpent: 999 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ totalGemsSpent: 1000 }))).toBe(true);
  });

  it('should check checked_locked_cat condition', () => {
    const condition: AchievementCondition = { type: 'checked_locked_cat', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ hasCheckedLockedCat: false }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ hasCheckedLockedCat: true }))).toBe(true);
  });

  // Daily reward conditions
  it('should check daily_rewards_streak condition', () => {
    const condition: AchievementCondition = { type: 'daily_rewards_streak', threshold: 7 };
    expect(isConditionMet(condition, defaultContext({ dailyRewardStreak: 6 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ dailyRewardStreak: 7 }))).toBe(true);
  });

  it('should check daily_rewards_total condition', () => {
    const condition: AchievementCondition = { type: 'daily_rewards_total', threshold: 30 };
    expect(isConditionMet(condition, defaultContext({ dailyRewardsTotal: 29 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ dailyRewardsTotal: 30 }))).toBe(true);
  });

  // Time conditions
  it('should check fast_exercise condition', () => {
    const condition: AchievementCondition = { type: 'fast_exercise', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ fastestExerciseSeconds: 0 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ fastestExerciseSeconds: 31 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ fastestExerciseSeconds: 30 }))).toBe(true);
    expect(isConditionMet(condition, defaultContext({ fastestExerciseSeconds: 15 }))).toBe(true);
  });

  it('should check late_night_practice condition', () => {
    const condition: AchievementCondition = { type: 'late_night_practice', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ isLateNightPractice: false }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ isLateNightPractice: true }))).toBe(true);
  });

  it('should check early_morning_practice condition', () => {
    const condition: AchievementCondition = { type: 'early_morning_practice', threshold: 1 };
    expect(isConditionMet(condition, defaultContext({ isEarlyMorningPractice: false }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ isEarlyMorningPractice: true }))).toBe(true);
  });

  it('should check session_minutes condition', () => {
    const condition: AchievementCondition = { type: 'session_minutes', threshold: 60 };
    expect(isConditionMet(condition, defaultContext({ sessionMinutes: 59 }))).toBe(false);
    expect(isConditionMet(condition, defaultContext({ sessionMinutes: 60 }))).toBe(true);
  });
});

describe('checkAchievements', () => {
  it('should return empty array when no conditions are met', () => {
    const result = checkAchievements(defaultContext(), new Set());
    expect(result).toEqual([]);
  });

  it('should return newly unlocked achievement IDs', () => {
    const context = defaultContext({ totalExercisesCompleted: 1 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('first-exercise');
  });

  it('should not return already-unlocked achievements', () => {
    const context = defaultContext({ totalExercisesCompleted: 1 });
    const alreadyUnlocked = new Set(['first-exercise']);
    const result = checkAchievements(context, alreadyUnlocked);
    expect(result).not.toContain('first-exercise');
  });

  it('should unlock multiple achievements at once', () => {
    const context = defaultContext({
      totalExercisesCompleted: 10,
      lessonsCompleted: 1,
      totalNotesPlayed: 100,
    });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('first-exercise');
    expect(result).toContain('ten-exercises');
    expect(result).toContain('first-lesson');
    expect(result).toContain('notes-100');
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  it('should handle partial unlocks correctly', () => {
    const context = defaultContext({
      totalExercisesCompleted: 10,
      lessonsCompleted: 1,
    });
    const alreadyUnlocked = new Set(['first-exercise', 'first-lesson']);
    const result = checkAchievements(context, alreadyUnlocked);
    expect(result).not.toContain('first-exercise');
    expect(result).not.toContain('first-lesson');
    expect(result).toContain('ten-exercises');
  });

  it('should unlock streak achievements when streak is high enough', () => {
    const context = defaultContext({ currentStreak: 7 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('streak-3');
    expect(result).toContain('streak-7');
    expect(result).not.toContain('streak-14');
  });

  it('should unlock level achievements', () => {
    const context = defaultContext({ level: 10, totalXp: 5000 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('level-5');
    expect(result).toContain('level-10');
    expect(result).toContain('xp-1000');
  });

  it('should unlock cat collection achievements', () => {
    const context = defaultContext({ catsUnlocked: 3 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('cats-3');
    expect(result).not.toContain('cats-all');
  });

  it('should unlock all cat achievements when all 8 are unlocked', () => {
    const context = defaultContext({ catsUnlocked: 8 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('cats-3');
    expect(result).toContain('cats-all');
  });

  it('should unlock session marathon when 10+ exercises in one session', () => {
    const context = defaultContext({ sessionExercises: 10 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('session-marathon');
  });

  it('should unlock early bird when practicing before 8am', () => {
    const context = defaultContext({ isEarlyPractice: true });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('early-bird');
    expect(result).not.toContain('night-owl');
  });

  it('should unlock night owl when practicing after 10pm', () => {
    const context = defaultContext({ isLatePractice: true });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('night-owl');
    expect(result).not.toContain('early-bird');
  });

  it('should unlock cat companion achievements', () => {
    const context = defaultContext({ exercisesWithSameCat: 100 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('cat-duo');
    expect(result).toContain('best-friends');
  });

  it('should unlock century streak', () => {
    const context = defaultContext({ currentStreak: 100 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('streak-3');
    expect(result).toContain('streak-7');
    expect(result).toContain('streak-14');
    expect(result).toContain('streak-30');
    expect(result).toContain('streak-100');
  });

  // Evolution achievements
  it('should unlock first-steps when cat is selected', () => {
    const context = defaultContext({ hasCatSelected: true });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('first-steps');
  });

  it('should unlock evolution achievements progressively', () => {
    const context = defaultContext({
      hasCatSelected: true,
      anyCatEvolvedTeen: true,
      anyCatEvolvedAdult: true,
      anyCatEvolvedMaster: true,
      abilitiesUnlocked: 3,
    });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('first-steps');
    expect(result).toContain('growing-up');
    expect(result).toContain('full-potential');
    expect(result).toContain('true-master');
    expect(result).toContain('ability-unlocked');
  });

  it('should not unlock adult evolution without teen', () => {
    const context = defaultContext({
      anyCatEvolvedTeen: false,
      anyCatEvolvedAdult: false,
    });
    const result = checkAchievements(context, new Set());
    expect(result).not.toContain('growing-up');
    expect(result).not.toContain('full-potential');
  });

  // Collection — evolution-themed achievements
  it('should unlock cat ownership achievements', () => {
    const context = defaultContext({ catsOwned: 6 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('cat-collector');
    expect(result).toContain('cat-enthusiast');
    expect(result).not.toContain('catch-em-all');
  });

  it('should unlock catch-em-all with 12 cats', () => {
    const context = defaultContext({ catsOwned: 12 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('cat-collector');
    expect(result).toContain('cat-enthusiast');
    expect(result).toContain('catch-em-all');
  });

  it('should unlock chonky achievements', () => {
    const context = defaultContext({ hasChonky: true, isChonkyMaster: true });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('the-chonk');
    expect(result).toContain('ultimate-chonk');
  });

  // Gem achievements
  it('should unlock gem earning achievements', () => {
    const context = defaultContext({ totalGemsEarned: 1000 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('gem-hunter');
    expect(result).toContain('gem-hoarder');
    expect(result).not.toContain('gem-lord');
  });

  it('should unlock gem spending achievement', () => {
    const context = defaultContext({ totalGemsSpent: 1000 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('big-spender');
  });

  it('should unlock window-shopping achievement', () => {
    const context = defaultContext({ hasCheckedLockedCat: true });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('window-shopping');
  });

  // Daily reward achievements
  it('should unlock daily devotion for 7-day reward streak', () => {
    const context = defaultContext({ dailyRewardStreak: 7 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('daily-devotion');
  });

  it('should unlock reward-collector for 30 total rewards', () => {
    const context = defaultContext({ dailyRewardsTotal: 30 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('reward-collector');
  });

  // Time achievements
  it('should unlock speed-demon for fast exercise', () => {
    const context = defaultContext({ fastestExerciseSeconds: 25 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('speed-demon');
  });

  it('should not unlock speed-demon when exercise is too slow', () => {
    const context = defaultContext({ fastestExerciseSeconds: 45 });
    const result = checkAchievements(context, new Set());
    expect(result).not.toContain('speed-demon');
  });

  it('should unlock late-night and early-morning practice achievements', () => {
    const lateContext = defaultContext({ isLateNightPractice: true });
    const lateResult = checkAchievements(lateContext, new Set());
    expect(lateResult).toContain('night-owl-late');

    const earlyContext = defaultContext({ isEarlyMorningPractice: true });
    const earlyResult = checkAchievements(earlyContext, new Set());
    expect(earlyResult).toContain('early-bird-dawn');
  });

  it('should unlock marathon-session for 60+ minutes', () => {
    const context = defaultContext({ sessionMinutes: 60 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('marathon-session');
  });

  it('should not unlock marathon-session for less than 60 minutes', () => {
    const context = defaultContext({ sessionMinutes: 59 });
    const result = checkAchievements(context, new Set());
    expect(result).not.toContain('marathon-session');
  });

  // Extended milestone achievements
  it('should unlock centurion for 100 exercises', () => {
    const context = defaultContext({ totalExercisesCompleted: 100 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('centurion');
    expect(result).toContain('fifty-exercises');
  });

  it('should unlock dedication for 30-day streak', () => {
    const context = defaultContext({ currentStreak: 30 });
    const result = checkAchievements(context, new Set());
    expect(result).toContain('dedication');
    expect(result).toContain('streak-30');
  });
});

/**
 * Achievement Definitions
 * Pure TypeScript - no React imports
 *
 * Defines all achievements, their conditions, and checking logic.
 * Achievements are grouped into categories: milestone, streak, score, xp, practice, collection.
 */

/**
 * Achievement condition types
 */
export type AchievementConditionType =
  | 'lessons_completed'
  | 'exercises_completed'
  | 'current_streak'
  | 'perfect_scores'
  | 'high_score_count'
  | 'total_xp'
  | 'level'
  | 'total_notes_played'
  | 'cats_unlocked'
  | 'session_exercises'
  | 'exercises_with_same_cat'
  | 'early_practice'
  | 'late_practice'
  | 'cat_selected'
  | 'cat_evolved_teen'
  | 'cat_evolved_adult'
  | 'cat_evolved_master'
  | 'abilities_unlocked'
  | 'cats_owned'
  | 'has_chonky'
  | 'chonky_master'
  | 'total_gems_earned'
  | 'total_gems_spent'
  | 'checked_locked_cat'
  | 'daily_rewards_streak'
  | 'daily_rewards_total'
  | 'fast_exercise'
  | 'late_night_practice'
  | 'early_morning_practice'
  | 'session_minutes';

export interface AchievementCondition {
  type: AchievementConditionType;
  threshold: number;
}

export type AchievementCategory =
  | 'milestone'
  | 'streak'
  | 'score'
  | 'xp'
  | 'practice'
  | 'collection'
  | 'evolution'
  | 'gems'
  | 'daily-reward'
  | 'time';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // MaterialCommunityIcons name
  category: AchievementCategory;
  condition: AchievementCondition;
  xpReward: number;
}

/**
 * Context provided when checking achievements.
 * Aggregates the relevant stats from various stores.
 */
export interface AchievementContext {
  totalXp: number;
  level: number;
  currentStreak: number;
  lessonsCompleted: number;
  perfectScores: number;
  totalExercisesCompleted: number;
  totalNotesPlayed: number;
  catsUnlocked: number;
  highScoreExercises: number; // exercises scored 90%+
  sessionExercises: number; // exercises in current session
  exercisesWithSameCat: number; // exercises with one cat companion
  isEarlyPractice: boolean; // practiced before 8am today
  isLatePractice: boolean; // practiced after 10pm today

  // Evolution context
  hasCatSelected: boolean; // has selected a starter cat
  anyCatEvolvedTeen: boolean; // any cat reached teen stage (500 XP)
  anyCatEvolvedAdult: boolean; // any cat reached adult stage (2000 XP)
  anyCatEvolvedMaster: boolean; // any cat reached master stage (5000 XP)
  abilitiesUnlocked: number; // total abilities unlocked across all cats
  catsOwned: number; // total cats owned (distinct from catsUnlocked)
  hasChonky: boolean; // owns Chonky Monke
  isChonkyMaster: boolean; // Chonky Monke at master stage

  // Gem context
  totalGemsEarned: number;
  totalGemsSpent: number;
  hasCheckedLockedCat: boolean; // viewed a locked cat's price

  // Daily reward context
  dailyRewardStreak: number; // consecutive daily rewards claimed
  dailyRewardsTotal: number; // total daily rewards claimed ever

  // Time context
  fastestExerciseSeconds: number; // fastest exercise completion time in seconds
  isLateNightPractice: boolean; // practiced after 11pm
  isEarlyMorningPractice: boolean; // practiced before 7am
  sessionMinutes: number; // minutes in current session
}

/**
 * All achievements in the app (56 total)
 */
export const ACHIEVEMENTS: Achievement[] = [
  // === Milestones (6) ===
  {
    id: 'first-exercise',
    title: 'First Note',
    description: 'Complete your first exercise',
    icon: 'music-note',
    category: 'milestone',
    condition: { type: 'exercises_completed', threshold: 1 },
    xpReward: 10,
  },
  {
    id: 'first-lesson',
    title: 'First Lesson',
    description: 'Complete your first lesson',
    icon: 'book-check',
    category: 'milestone',
    condition: { type: 'lessons_completed', threshold: 1 },
    xpReward: 25,
  },
  {
    id: 'ten-exercises',
    title: 'Practice Makes Purrrfect',
    description: 'Complete 10 exercises',
    icon: 'repeat',
    category: 'milestone',
    condition: { type: 'exercises_completed', threshold: 10 },
    xpReward: 50,
  },
  {
    id: 'twenty-exercises',
    title: 'Dedicated Learner',
    description: 'Complete 20 exercises',
    icon: 'arm-flex',
    category: 'milestone',
    condition: { type: 'exercises_completed', threshold: 20 },
    xpReward: 75,
  },
  {
    id: 'fifty-exercises',
    title: 'Half Century',
    description: 'Complete 50 exercises',
    icon: 'medal',
    category: 'milestone',
    condition: { type: 'exercises_completed', threshold: 50 },
    xpReward: 150,
  },
  {
    id: 'five-lessons',
    title: 'Getting Serious',
    description: 'Complete 5 lessons',
    icon: 'school',
    category: 'milestone',
    condition: { type: 'lessons_completed', threshold: 5 },
    xpReward: 100,
  },
  {
    id: 'all-lessons',
    title: 'Curriculum Complete',
    description: 'Complete all 6 lessons',
    icon: 'certificate',
    category: 'milestone',
    condition: { type: 'lessons_completed', threshold: 6 },
    xpReward: 250,
  },

  // === Streaks (5) ===
  {
    id: 'streak-3',
    title: '3-Day Streak',
    description: 'Practice for 3 days in a row',
    icon: 'fire',
    category: 'streak',
    condition: { type: 'current_streak', threshold: 3 },
    xpReward: 30,
  },
  {
    id: 'streak-7',
    title: 'Week Warrior',
    description: 'Practice for 7 days in a row',
    icon: 'fire',
    category: 'streak',
    condition: { type: 'current_streak', threshold: 7 },
    xpReward: 75,
  },
  {
    id: 'streak-14',
    title: 'Two-Week Streak',
    description: 'Practice for 14 days in a row',
    icon: 'fire',
    category: 'streak',
    condition: { type: 'current_streak', threshold: 14 },
    xpReward: 150,
  },
  {
    id: 'streak-30',
    title: 'Monthly Maestro',
    description: 'Practice for 30 days in a row',
    icon: 'fire',
    category: 'streak',
    condition: { type: 'current_streak', threshold: 30 },
    xpReward: 300,
  },
  {
    id: 'streak-100',
    title: 'Century',
    description: 'Practice for 100 days in a row',
    icon: 'trophy-award',
    category: 'streak',
    condition: { type: 'current_streak', threshold: 100 },
    xpReward: 500,
  },

  // === Scores (5) ===
  {
    id: 'first-perfect',
    title: 'Purrrfection',
    description: 'Get a perfect score on any exercise',
    icon: 'star-circle',
    category: 'score',
    condition: { type: 'perfect_scores', threshold: 1 },
    xpReward: 50,
  },
  {
    id: 'five-perfects',
    title: 'Gold Standard',
    description: 'Get 5 perfect scores',
    icon: 'star-shooting',
    category: 'score',
    condition: { type: 'perfect_scores', threshold: 5 },
    xpReward: 100,
  },
  {
    id: 'ten-perfects',
    title: 'Flawless',
    description: 'Get 10 perfect scores',
    icon: 'diamond-stone',
    category: 'score',
    condition: { type: 'perfect_scores', threshold: 10 },
    xpReward: 200,
  },
  {
    id: 'high-score-10',
    title: 'Consistent Player',
    description: 'Score 90%+ on 10 exercises',
    icon: 'chart-line',
    category: 'score',
    condition: { type: 'high_score_count', threshold: 10 },
    xpReward: 75,
  },
  {
    id: 'high-score-20',
    title: 'High Achiever',
    description: 'Score 90%+ on 20 exercises',
    icon: 'chart-areaspline',
    category: 'score',
    condition: { type: 'high_score_count', threshold: 20 },
    xpReward: 150,
  },

  // === XP & Levels (5) ===
  {
    id: 'level-5',
    title: 'Rising Star',
    description: 'Reach Level 5',
    icon: 'trending-up',
    category: 'xp',
    condition: { type: 'level', threshold: 5 },
    xpReward: 50,
  },
  {
    id: 'level-10',
    title: 'Keyboard Master',
    description: 'Reach Level 10',
    icon: 'trophy',
    category: 'xp',
    condition: { type: 'level', threshold: 10 },
    xpReward: 100,
  },
  {
    id: 'level-20',
    title: 'Grand Master',
    description: 'Reach Level 20',
    icon: 'crown',
    category: 'xp',
    condition: { type: 'level', threshold: 20 },
    xpReward: 200,
  },
  {
    id: 'xp-1000',
    title: 'XP Collector',
    description: 'Earn 1,000 total XP',
    icon: 'lightning-bolt',
    category: 'xp',
    condition: { type: 'total_xp', threshold: 1000 },
    xpReward: 50,
  },
  {
    id: 'xp-5000',
    title: 'XP Hoarder',
    description: 'Earn 5,000 total XP',
    icon: 'lightning-bolt-circle',
    category: 'xp',
    condition: { type: 'total_xp', threshold: 5000 },
    xpReward: 100,
  },

  // === Practice (7) ===
  {
    id: 'notes-100',
    title: 'Busy Paws',
    description: 'Play 100 notes total',
    icon: 'piano',
    category: 'practice',
    condition: { type: 'total_notes_played', threshold: 100 },
    xpReward: 25,
  },
  {
    id: 'notes-500',
    title: 'Note Machine',
    description: 'Play 500 notes total',
    icon: 'piano',
    category: 'practice',
    condition: { type: 'total_notes_played', threshold: 500 },
    xpReward: 75,
  },
  {
    id: 'notes-1000',
    title: 'Thousand Keys',
    description: 'Play 1,000 notes total',
    icon: 'music-note-eighth',
    category: 'practice',
    condition: { type: 'total_notes_played', threshold: 1000 },
    xpReward: 100,
  },
  {
    id: 'notes-5000',
    title: 'Key Crusher',
    description: 'Play 5,000 notes total',
    icon: 'music-note-whole',
    category: 'practice',
    condition: { type: 'total_notes_played', threshold: 5000 },
    xpReward: 200,
  },
  {
    id: 'session-marathon',
    title: 'Marathon',
    description: 'Play 10 exercises in one session',
    icon: 'run-fast',
    category: 'practice',
    condition: { type: 'session_exercises', threshold: 10 },
    xpReward: 75,
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Practice before 8am',
    icon: 'weather-sunset-up',
    category: 'practice',
    condition: { type: 'early_practice', threshold: 1 },
    xpReward: 30,
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Practice after 10pm',
    icon: 'weather-night',
    category: 'practice',
    condition: { type: 'late_practice', threshold: 1 },
    xpReward: 30,
  },

  // === Collection (4) ===
  {
    id: 'cats-3',
    title: 'Cat Collector',
    description: 'Unlock 3 cat characters',
    icon: 'cat',
    category: 'collection',
    condition: { type: 'cats_unlocked', threshold: 3 },
    xpReward: 50,
  },
  {
    id: 'cats-all',
    title: 'Cat Whisperer',
    description: 'Unlock all 8 cat characters',
    icon: 'cat',
    category: 'collection',
    condition: { type: 'cats_unlocked', threshold: 8 },
    xpReward: 200,
  },
  {
    id: 'best-friends',
    title: 'Best Friends',
    description: 'Play 100 exercises with the same cat companion',
    icon: 'heart',
    category: 'collection',
    condition: { type: 'exercises_with_same_cat', threshold: 100 },
    xpReward: 100,
  },
  {
    id: 'cat-duo',
    title: 'Purrrfect Duo',
    description: 'Play 50 exercises with the same cat companion',
    icon: 'handshake',
    category: 'collection',
    condition: { type: 'exercises_with_same_cat', threshold: 50 },
    xpReward: 50,
  },

  // === Evolution (5) ===
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Select your first cat during onboarding',
    icon: 'paw',
    category: 'evolution',
    condition: { type: 'cat_selected', threshold: 1 },
    xpReward: 10,
  },
  {
    id: 'growing-up',
    title: 'Growing Up',
    description: 'Evolve any cat to Teen stage',
    icon: 'arrow-up-bold-circle',
    category: 'evolution',
    condition: { type: 'cat_evolved_teen', threshold: 1 },
    xpReward: 50,
  },
  {
    id: 'full-potential',
    title: 'Full Potential',
    description: 'Evolve any cat to Adult stage',
    icon: 'arrow-up-bold-hexagon-outline',
    category: 'evolution',
    condition: { type: 'cat_evolved_adult', threshold: 1 },
    xpReward: 100,
  },
  {
    id: 'true-master',
    title: 'True Master',
    description: 'Evolve any cat to Master stage',
    icon: 'star-four-points',
    category: 'evolution',
    condition: { type: 'cat_evolved_master', threshold: 1 },
    xpReward: 200,
  },
  {
    id: 'ability-unlocked',
    title: 'Ability Unlocked',
    description: 'Unlock your first ability',
    icon: 'flash',
    category: 'evolution',
    condition: { type: 'abilities_unlocked', threshold: 1 },
    xpReward: 25,
  },

  // === Collection — Evolution-themed (5) ===
  {
    id: 'cat-collector',
    title: 'Cat Collector',
    description: 'Own 3 cats',
    icon: 'cat',
    category: 'collection',
    condition: { type: 'cats_owned', threshold: 3 },
    xpReward: 50,
  },
  {
    id: 'cat-enthusiast',
    title: 'Cat Enthusiast',
    description: 'Own 6 cats',
    icon: 'cat',
    category: 'collection',
    condition: { type: 'cats_owned', threshold: 6 },
    xpReward: 100,
  },
  {
    id: 'catch-em-all',
    title: "Catch 'Em All",
    description: 'Own all 12 cats',
    icon: 'pokeball',
    category: 'collection',
    condition: { type: 'cats_owned', threshold: 12 },
    xpReward: 300,
  },
  {
    id: 'the-chonk',
    title: 'The Chonk',
    description: 'Unlock Chonky Monke (legendary)',
    icon: 'emoticon-cool',
    category: 'collection',
    condition: { type: 'has_chonky', threshold: 1 },
    xpReward: 200,
  },
  {
    id: 'ultimate-chonk',
    title: 'Ultimate Chonk',
    description: 'Evolve Chonky Monke to Master stage',
    icon: 'crown',
    category: 'collection',
    condition: { type: 'chonky_master', threshold: 1 },
    xpReward: 500,
  },

  // === Gems (5) ===
  {
    id: 'gem-hunter',
    title: 'Gem Hunter',
    description: 'Earn 100 gems total',
    icon: 'diamond-stone',
    category: 'gems',
    condition: { type: 'total_gems_earned', threshold: 100 },
    xpReward: 25,
  },
  {
    id: 'gem-hoarder',
    title: 'Gem Hoarder',
    description: 'Earn 1,000 gems total',
    icon: 'diamond-stone',
    category: 'gems',
    condition: { type: 'total_gems_earned', threshold: 1000 },
    xpReward: 75,
  },
  {
    id: 'gem-lord',
    title: 'Gem Lord',
    description: 'Earn 5,000 gems total',
    icon: 'treasure-chest',
    category: 'gems',
    condition: { type: 'total_gems_earned', threshold: 5000 },
    xpReward: 200,
  },
  {
    id: 'big-spender',
    title: 'Big Spender',
    description: 'Spend 1,000 gems total',
    icon: 'cash-multiple',
    category: 'gems',
    condition: { type: 'total_gems_spent', threshold: 1000 },
    xpReward: 50,
  },
  {
    id: 'window-shopping',
    title: 'Window Shopping',
    description: "Check a locked cat's price",
    icon: 'storefront',
    category: 'gems',
    condition: { type: 'checked_locked_cat', threshold: 1 },
    xpReward: 5,
  },

  // === Daily Rewards (2) ===
  {
    id: 'daily-devotion',
    title: 'Daily Devotion',
    description: 'Claim 7 daily rewards in a row (full week)',
    icon: 'calendar-check',
    category: 'daily-reward',
    condition: { type: 'daily_rewards_streak', threshold: 7 },
    xpReward: 100,
  },
  {
    id: 'reward-collector',
    title: 'Reward Collector',
    description: 'Claim 30 daily rewards total',
    icon: 'gift',
    category: 'daily-reward',
    condition: { type: 'daily_rewards_total', threshold: 30 },
    xpReward: 150,
  },

  // === Time-Based (4) ===
  {
    id: 'speed-demon',
    title: 'Speed Demon',
    description: 'Complete an exercise in under 30 seconds',
    icon: 'timer-outline',
    category: 'time',
    condition: { type: 'fast_exercise', threshold: 1 },
    xpReward: 30,
  },
  {
    id: 'night-owl-late',
    title: 'Night Owl',
    description: 'Practice after 11 PM',
    icon: 'owl',
    category: 'time',
    condition: { type: 'late_night_practice', threshold: 1 },
    xpReward: 30,
  },
  {
    id: 'early-bird-dawn',
    title: 'Early Bird',
    description: 'Practice before 7 AM',
    icon: 'weather-sunset-up',
    category: 'time',
    condition: { type: 'early_morning_practice', threshold: 1 },
    xpReward: 30,
  },
  {
    id: 'marathon-session',
    title: 'Marathon',
    description: 'Practice for 60+ minutes in one session',
    icon: 'clock-alert',
    category: 'time',
    condition: { type: 'session_minutes', threshold: 60 },
    xpReward: 75,
  },

  // === Milestone — Extended (2) ===
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Complete 100 exercises',
    icon: 'shield-star',
    category: 'milestone',
    condition: { type: 'exercises_completed', threshold: 100 },
    xpReward: 200,
  },
  {
    id: 'dedication',
    title: 'Dedication',
    description: 'Maintain a 30-day streak',
    icon: 'fire',
    category: 'streak',
    condition: { type: 'current_streak', threshold: 30 },
    xpReward: 300,
  },
];

/**
 * Get an achievement by ID
 */
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Get all achievements in a category
 */
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

/**
 * Check if a single achievement condition is met
 */
export function isConditionMet(condition: AchievementCondition, context: AchievementContext): boolean {
  switch (condition.type) {
    case 'lessons_completed':
      return context.lessonsCompleted >= condition.threshold;
    case 'exercises_completed':
      return context.totalExercisesCompleted >= condition.threshold;
    case 'current_streak':
      return context.currentStreak >= condition.threshold;
    case 'perfect_scores':
      return context.perfectScores >= condition.threshold;
    case 'high_score_count':
      return context.highScoreExercises >= condition.threshold;
    case 'total_xp':
      return context.totalXp >= condition.threshold;
    case 'level':
      return context.level >= condition.threshold;
    case 'total_notes_played':
      return context.totalNotesPlayed >= condition.threshold;
    case 'cats_unlocked':
      return context.catsUnlocked >= condition.threshold;
    case 'session_exercises':
      return context.sessionExercises >= condition.threshold;
    case 'exercises_with_same_cat':
      return context.exercisesWithSameCat >= condition.threshold;
    case 'early_practice':
      return context.isEarlyPractice ? 1 >= condition.threshold : false;
    case 'late_practice':
      return context.isLatePractice ? 1 >= condition.threshold : false;

    // Evolution conditions
    case 'cat_selected':
      return context.hasCatSelected ? 1 >= condition.threshold : false;
    case 'cat_evolved_teen':
      return context.anyCatEvolvedTeen ? 1 >= condition.threshold : false;
    case 'cat_evolved_adult':
      return context.anyCatEvolvedAdult ? 1 >= condition.threshold : false;
    case 'cat_evolved_master':
      return context.anyCatEvolvedMaster ? 1 >= condition.threshold : false;
    case 'abilities_unlocked':
      return context.abilitiesUnlocked >= condition.threshold;
    case 'cats_owned':
      return context.catsOwned >= condition.threshold;
    case 'has_chonky':
      return context.hasChonky ? 1 >= condition.threshold : false;
    case 'chonky_master':
      return context.isChonkyMaster ? 1 >= condition.threshold : false;

    // Gem conditions
    case 'total_gems_earned':
      return context.totalGemsEarned >= condition.threshold;
    case 'total_gems_spent':
      return context.totalGemsSpent >= condition.threshold;
    case 'checked_locked_cat':
      return context.hasCheckedLockedCat ? 1 >= condition.threshold : false;

    // Daily reward conditions
    case 'daily_rewards_streak':
      return context.dailyRewardStreak >= condition.threshold;
    case 'daily_rewards_total':
      return context.dailyRewardsTotal >= condition.threshold;

    // Time conditions
    case 'fast_exercise':
      return context.fastestExerciseSeconds > 0 && context.fastestExerciseSeconds <= 30
        ? 1 >= condition.threshold
        : false;
    case 'late_night_practice':
      return context.isLateNightPractice ? 1 >= condition.threshold : false;
    case 'early_morning_practice':
      return context.isEarlyMorningPractice ? 1 >= condition.threshold : false;
    case 'session_minutes':
      return context.sessionMinutes >= condition.threshold;

    default:
      return false;
  }
}

/**
 * Check all achievements against context, returning IDs of newly unlocked ones.
 * Already-unlocked achievement IDs should be passed in to avoid re-triggering.
 */
export function checkAchievements(
  context: AchievementContext,
  alreadyUnlocked: ReadonlySet<string>
): string[] {
  const newlyUnlocked: string[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (alreadyUnlocked.has(achievement.id)) {
      continue;
    }
    if (isConditionMet(achievement.condition, context)) {
      newlyUnlocked.push(achievement.id);
    }
  }

  return newlyUnlocked;
}

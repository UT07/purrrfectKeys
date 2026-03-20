/**
 * User progress and gamification state management with MMKV persistence
 *
 * Manages:
 * - XP tracking and level progression
 * - Daily/weekly streaks with freeze mechanics
 * - Lesson and exercise completion history
 * - Daily goal tracking
 *
 * All state is automatically persisted to MMKV
 */

import { create } from 'zustand';
import type { LessonProgress, ExerciseProgress } from '@/core/exercises/types';
import type { ProgressStoreState, StreakData, DailyGoalData } from './types';
import { PersistenceManager, STORAGE_KEYS, createDebouncedSave } from './persistence';
import { levelFromXp } from '@/core/progression/XpSystem';
import { useGemStore } from './gemStore';
import { useCatEvolutionStore } from './catEvolutionStore';
import {
  getDailyChallengeForDate,
  isDailyChallengeComplete,
  getWeeklyChallengeForWeek,
  isWeeklyChallengeDay,
  isWeeklyChallengeComplete,
  getMonthlyChallengeForMonth,
  isMonthlyChallengeActive,
} from '@/core/challenges/challengeSystem';
import type { ExerciseChallengeContext } from '@/core/challenges/challengeSystem';
import { useLearnerProfileStore } from './learnerProfileStore';
import { useSettingsStore } from './settingsStore';
import { useLeagueStore } from './leagueStore';
import { addLeagueXp } from '@/services/firebase/leagueService';
import { postActivity } from '@/services/firebase/socialService';
import { auth } from '@/services/firebase/config';
import { logger } from '@/utils/logger';
import { analyticsEvents, updateUserAnalyticsProperties } from '@/services/analytics/PostHog';

/** Fire-and-forget with one retry after 2s delay. Logs failures but never throws. */
function fireAndRetry(fn: () => Promise<unknown>, label: string): void {
  fn().catch(() => {
    setTimeout(() => {
      fn().catch((err) => {
        logger.warn(`[progressStore] ${label} failed after retry:`, (err as Error)?.message);
      });
    }, 2000);
  });
}

// BUG-008 fix: Use local date string so streak day boundary matches user's wall clock
function localToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const defaultStreakData: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastPracticeDate: '', // Empty so first exercise triggers streak
  freezesAvailable: 1,
  freezesUsed: 0,
  weeklyPractice: [false, false, false, false, false, false, false],
};

const defaultDailyGoal: DailyGoalData = {
  date: localToday(),
  minutesTarget: 10,
  minutesPracticed: 0,
  exercisesTarget: 3,
  exercisesCompleted: 0,
  isComplete: false,
};

/** Data-only shape of progress state (excludes actions) */
type ProgressData = Pick<
  ProgressStoreState,
  'totalXp' | 'level' | 'streakData' | 'lessonProgress' | 'dailyGoalData' | 'tierTestResults' | 'streakMilestonesClaimed'
>;

const defaultData: ProgressData = {
  totalXp: 0,
  level: 1,
  streakData: defaultStreakData,
  lessonProgress: {},
  dailyGoalData: {},
  tierTestResults: {},
  streakMilestonesClaimed: [],
};

// Create debounced save function
const debouncedSave = createDebouncedSave(STORAGE_KEYS.PROGRESS, 1000);

export const useProgressStore = create<ProgressStoreState>((set, get) => ({
  ...defaultData,

  addXp: (amount: number) => {
    const oldLevel = get().level;
    set((state) => {
      const newTotalXp = state.totalXp + amount;
      return {
        totalXp: newTotalXp,
        level: levelFromXp(newTotalXp),
      };
    });
    const newLevel = get().level;

    // Analytics: track XP earned and level-ups
    analyticsEvents.progress.xpEarned(amount, 'addXp');
    if (newLevel > oldLevel) {
      analyticsEvents.progress.levelUp(newLevel, get().totalXp);
    }
    updateUserAnalyticsProperties({
      level: newLevel,
      currentStreak: get().streakData.currentStreak,
    });

    // Post level-up activity (fire-and-forget with logged failure)
    if (newLevel > oldLevel && auth.currentUser && !auth.currentUser.isAnonymous) {
      postActivity(auth.currentUser.uid, {
        id: `level-up-${newLevel}-${Date.now()}`,
        friendUid: auth.currentUser.uid,
        friendDisplayName: auth.currentUser.displayName ?? 'Player',
        friendCatId: useSettingsStore.getState().selectedCatId ?? 'mini-meowww',
        type: 'level_up',
        detail: `Reached level ${newLevel}`,
        timestamp: Date.now(),
      }).catch((err) => logger.warn('[progressStore] postActivity (addXp) failed:', (err as Error)?.message));
    }

    debouncedSave(get);
  },

  setLevel: (level: number) => {
    set({ level });
    debouncedSave(get);
  },

  updateStreakData: (data: Partial<StreakData>) => {
    const oldStreak = get().streakData.currentStreak;
    set((state) => ({
      streakData: { ...state.streakData, ...data },
    }));
    const newStreak = get().streakData.currentStreak;

    // Analytics: track streak changes
    if (data.currentStreak !== undefined) {
      if (newStreak > oldStreak) {
        analyticsEvents.progress.streakAchieved(newStreak);
      } else if (newStreak === 0 && oldStreak > 0) {
        analyticsEvents.progress.streakBroken(oldStreak);
      }
    }

    debouncedSave(get);
  },

  updateLessonProgress: (lessonId: string, progress: LessonProgress) => {
    set((state) => ({
      lessonProgress: {
        ...state.lessonProgress,
        [lessonId]: progress,
      },
    }));
    debouncedSave(get);
  },

  updateExerciseProgress: (lessonId: string, exerciseId: string, progress: ExerciseProgress) => {
    // Capture prev status BEFORE set() to detect first-time completion
    const prevStatus = get().lessonProgress[lessonId]?.status;

    set((state) => {
      const lesson = state.lessonProgress[lessonId] ?? {
        lessonId,
        status: 'in_progress' as const,
        exerciseScores: {},
        bestScore: 0,
        totalAttempts: 0,
        totalTimeSpentSeconds: 0,
      };

      const updatedScores = {
        ...lesson.exerciseScores,
        [exerciseId]: progress,
      };

      // Auto-detect lesson completion: if all non-test exercises have a passing
      // score, mark the lesson as completed. Uses the exercise index to know
      // how many exercises exist in the lesson.
      let newStatus = lesson.status;
      if (lesson.status !== 'completed') {
        try {
          const { getExercisesForLesson, getExercise } = require('../content/ContentLoader');
          const lessonExercises = getExercisesForLesson(lessonId);
          const nonTestExercises = lessonExercises.filter(
            (e: { type: string }) => e.type !== 'test',
          );
          if (nonTestExercises.length > 0) {
            const allPassed = nonTestExercises.every((ex: { id: string }) => {
              const exScore = updatedScores[ex.id];
              const fullExercise = getExercise(ex.id);
              const passingScore = fullExercise?.scoring?.passingScore ?? 70;
              return exScore && exScore.highScore >= passingScore;
            });
            if (allPassed) {
              newStatus = 'completed';
            }
          }
        } catch (err) {
          logger.warn('[progressStore] ContentLoader not available for lesson completion check:', err);
        }
      }

      return {
        lessonProgress: {
          ...state.lessonProgress,
          [lessonId]: {
            ...lesson,
            status: newStatus,
            exerciseScores: updatedScores,
            ...(newStatus === 'completed' && !lesson.completedAt
              ? { completedAt: Date.now() }
              : {}),
          },
        },
      };
    });

    // Award cat XP for first-time lesson completion (outside set() to avoid transaction issues)
    const newStatus = get().lessonProgress[lessonId]?.status;
    if (newStatus === 'completed' && prevStatus !== 'completed') {
      try {
        const catId = useSettingsStore.getState().selectedCatId || useCatEvolutionStore.getState().selectedCatId;
        if (catId) {
          useCatEvolutionStore.getState().addEvolutionXp(catId, 200);
        }
      } catch (err) {
        logger.warn('[progressStore] lesson completion cat XP failed:', (err as Error)?.message);
      }
    }

    debouncedSave(get);
  },

  getLessonProgress: (lessonId: string) => {
    const state = get();
    return state.lessonProgress[lessonId] || null;
  },

  getExerciseProgress: (lessonId: string, exerciseId: string) => {
    const state = get();
    const lesson = state.lessonProgress[lessonId];
    if (!lesson) {
      return null;
    }
    return lesson.exerciseScores[exerciseId] || null;
  },

  recordPracticeSession: (duration: number) => {
    const today = localToday();
    // BUG-011/024 fix: Read user's preferred daily goal from settings
    const userMinutesTarget = useSettingsStore.getState().dailyGoalMinutes ?? 10;
    set((state) => {
      const dailyGoal = state.dailyGoalData[today] || {
        ...defaultDailyGoal,
        date: today,
        minutesTarget: userMinutesTarget,
      };
      // Ensure existing entries also use updated target
      const minutesTarget = dailyGoal.minutesTarget || userMinutesTarget;

      return {
        dailyGoalData: {
          ...state.dailyGoalData,
          [today]: {
            ...dailyGoal,
            minutesTarget,
            minutesPracticed: dailyGoal.minutesPracticed + duration,
            isComplete:
              dailyGoal.minutesPracticed + duration >= minutesTarget &&
              dailyGoal.exercisesCompleted >= dailyGoal.exercisesTarget,
          },
        },
      };
    });
    debouncedSave(get);
  },

  recordExerciseCompletion: (_exerciseId: string, _score: number, xpEarned: number, challengeContext?: ExerciseChallengeContext) => {
    const today = localToday();
    const userMinutesTarget = useSettingsStore.getState().dailyGoalMinutes ?? 10;

    // ── Daily challenge check (before XP so we can apply xpMultiplier) ──
    // Re-read state at the moment of the check to ensure we see the latest
    // value of lastDailyChallengeDate (defensive against rapid calls)
    let xpMultiplier = 1;

    if (useCatEvolutionStore.getState().lastDailyChallengeDate !== today) {
      const masteredSkills = useLearnerProfileStore.getState().masteredSkills ?? [];
      const challenge = getDailyChallengeForDate(today, masteredSkills);
      const ctx: ExerciseChallengeContext = challengeContext ?? {
        score: _score,
        maxCombo: 0,
        perfectNotes: 0,
        playbackSpeed: 1.0,
        minutesPracticedToday: 0,
      };
      if (isDailyChallengeComplete(challenge, ctx)) {
        useCatEvolutionStore.getState().completeDailyChallengeAndClaim();
        if (challenge.reward.gems > 0) {
          useGemStore.getState().earnGems(challenge.reward.gems, 'daily-challenge');
        }
        // BUG-010 fix: actually apply the xpMultiplier from challenge reward
        xpMultiplier = Math.max(xpMultiplier, challenge.reward.xpMultiplier ?? 1);
      }
    }

    // ── BUG-014 fix: Weekly challenge validation ──
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const weekStartISO = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    if (isWeeklyChallengeDay(weekStartISO)) {
      const weeklyChallenge = getWeeklyChallengeForWeek(weekStartISO);
      const ctx: ExerciseChallengeContext = challengeContext ?? {
        score: _score, maxCombo: 0, perfectNotes: 0, playbackSpeed: 1.0, minutesPracticedToday: 0,
      };
      if (isWeeklyChallengeComplete(weeklyChallenge, ctx)) {
        const weeklyKey = `weekly-${weekStartISO}`;
        const gemState = useGemStore.getState();
        if (!gemState.hasClaimedReward(weeklyKey)) {
          gemState.claimReward(weeklyKey, weeklyChallenge.reward.gems);
          xpMultiplier = Math.max(xpMultiplier, weeklyChallenge.reward.xpMultiplier ?? 1);
        }
      }
    }

    // ── BUG-014 fix: Monthly challenge validation ──
    const monthISO = today.slice(0, 7); // "2026-02"
    if (isMonthlyChallengeActive(monthISO)) {
      const monthlyChallenge = getMonthlyChallengeForMonth(monthISO);
      // Monthly requires N exercises within 48h window — count today's completions
      const monthlyKey = `monthly-${monthISO}`;
      const gemState = useGemStore.getState();
      if (!gemState.hasClaimedReward(monthlyKey)) {
        // Count exercises completed today toward monthly goal
        const todayGoal = get().dailyGoalData[today];
        const exercisesToday = (todayGoal?.exercisesCompleted ?? 0) + 1;
        if (exercisesToday >= monthlyChallenge.exercisesRequired) {
          gemState.claimReward(monthlyKey, monthlyChallenge.reward.gems);
          xpMultiplier = Math.max(xpMultiplier, monthlyChallenge.reward.xpMultiplier ?? 1);
        }
      }
    }

    // ── Apply XP with multiplier ──
    const effectiveXp = Math.round(xpEarned * xpMultiplier);
    const oldLevel = get().level;

    let dailyGoalJustCompleted = false;

    set((state) => {
      const dailyGoal = state.dailyGoalData[today] || {
        ...defaultDailyGoal,
        date: today,
        minutesTarget: userMinutesTarget,
      };
      const minutesTarget = dailyGoal.minutesTarget || userMinutesTarget;
      const wasDailyGoalComplete = dailyGoal.isComplete;
      const newTotalXp = state.totalXp + effectiveXp;
      const newExercisesCompleted = dailyGoal.exercisesCompleted + 1;
      const nowComplete =
        dailyGoal.minutesPracticed >= minutesTarget &&
        newExercisesCompleted >= dailyGoal.exercisesTarget;

      dailyGoalJustCompleted = nowComplete && !wasDailyGoalComplete;

      return {
        totalXp: newTotalXp,
        level: levelFromXp(newTotalXp),
        dailyGoalData: {
          ...state.dailyGoalData,
          [today]: {
            ...dailyGoal,
            minutesTarget,
            exercisesCompleted: newExercisesCompleted,
            isComplete: nowComplete,
          },
        },
      };
    });

    // Bonus gems when the full daily goal (minutes + exercises) is met
    if (dailyGoalJustCompleted) {
      useGemStore.getState().earnGems(10, 'daily-goal');
      analyticsEvents.rewards.dailyGoalCompleted();
    }

    // Analytics: track XP earned and level-ups from exercise completion
    analyticsEvents.progress.xpEarned(effectiveXp, 'exercise_completion');
    const postExLevel = get().level;
    if (postExLevel > oldLevel) {
      analyticsEvents.progress.levelUp(postExLevel, get().totalXp);
    }
    updateUserAnalyticsProperties({
      level: postExLevel,
      currentStreak: get().streakData.currentStreak,
    });

    // BUG-023 fix: Streak gem milestones — only award once per milestone
    const streak = get().streakData.currentStreak;
    const claimed = get().streakMilestonesClaimed ?? [];
    const STREAK_MILESTONES: { streak: number; gems: number }[] = [
      { streak: 7, gems: 50 },
      { streak: 30, gems: 200 },
      { streak: 100, gems: 500 },
    ];
    for (const m of STREAK_MILESTONES) {
      if (streak >= m.streak && !claimed.includes(m.streak)) {
        useGemStore.getState().earnGems(m.gems, `${m.streak}-day-streak`);
        set((state) => ({
          streakMilestonesClaimed: [...(state.streakMilestonesClaimed ?? []), m.streak],
        }));
        // Award cat XP for streak milestone
        try {
          const catId = useSettingsStore.getState().selectedCatId || useCatEvolutionStore.getState().selectedCatId;
          if (catId) {
            const streakCatXp = m.streak === 7 ? 100 : m.streak === 30 ? 250 : 500;
            useCatEvolutionStore.getState().addEvolutionXp(catId, streakCatXp);
          }
        } catch (err) {
          logger.warn('[progressStore] streak milestone cat XP failed:', (err as Error)?.message);
        }
      }
    }

    debouncedSave(get);

    // ── League XP update (fire-and-forget) ──
    const leagueMembership = useLeagueStore.getState().membership;
    if (leagueMembership && auth.currentUser && !auth.currentUser.isAnonymous) {
      const newWeeklyXp = leagueMembership.weeklyXp + effectiveXp;
      useLeagueStore.getState().updateWeeklyXp(newWeeklyXp);
      fireAndRetry(
        () => addLeagueXp(leagueMembership.leagueId, auth.currentUser!.uid, effectiveXp),
        'addLeagueXp',
      );
    }

    // ── MMR / Rank update ──
    try {
      const { useRankStore } = require('./rankStore');
      const exerciseTier = challengeContext?.exerciseTier ?? 3;
      const exerciseType = challengeContext?.exerciseType ?? 'play';
      useRankStore.getState().updateAfterExercise(_score, exerciseTier, exerciseType);

      // Update season peak tier + battle pass XP
      const { useSeasonStore } = require('./seasonStore');
      const rankState = useRankStore.getState();
      useSeasonStore.getState().updatePeakTier(rankState.rating.tier);
      useSeasonStore.getState().addBattlePassXp(effectiveXp);
    } catch (err) {
      logger.warn('[progressStore] MMR/rank update failed:', (err as Error)?.message);
    }

    // ── Guild XP update (fire-and-forget) ──
    try {
      const { useGuildStore } = require('./guildStore');
      const guild = useGuildStore.getState().currentGuild;
      if (guild && auth.currentUser && !auth.currentUser.isAnonymous) {
        const { addGuildMemberXp } = require('../services/firebase/guildService');
        useGuildStore.getState().updateMemberXp(auth.currentUser.uid, effectiveXp);
        fireAndRetry(
          () => addGuildMemberXp(guild.id, auth.currentUser!.uid, effectiveXp),
          'addGuildMemberXp',
        );
      }
    } catch (err) {
      logger.warn('[progressStore] Guild XP update failed:', err);
    }

    // ── Post level-up activity (fire-and-forget with logged failure) ──
    const newLevel = get().level;
    if (newLevel > oldLevel && auth.currentUser && !auth.currentUser.isAnonymous) {
      postActivity(auth.currentUser.uid, {
        id: `level-up-${newLevel}-${Date.now()}`,
        friendUid: auth.currentUser.uid,
        friendDisplayName: auth.currentUser.displayName ?? 'Player',
        friendCatId: useSettingsStore.getState().selectedCatId ?? 'mini-meowww',
        type: 'level_up',
        detail: `Reached level ${newLevel}`,
        timestamp: Date.now(),
      }).catch((err) => logger.warn('[progressStore] postActivity (record) failed:', (err as Error)?.message));
    }
  },

  updateDailyGoal: (date: string, data: Partial<DailyGoalData>) => {
    set((state) => ({
      dailyGoalData: {
        ...state.dailyGoalData,
        [date]: {
          ...(state.dailyGoalData[date] || { ...defaultDailyGoal, date }),
          ...data,
        },
      },
    }));
    debouncedSave(get);
  },

  recordTierTestResult: (tier: number, passed: boolean, score: number) => {
    const key = `tier-${tier}`;
    set((state) => {
      const existing = state.tierTestResults[key];
      return {
        tierTestResults: {
          ...state.tierTestResults,
          [key]: {
            passed: existing?.passed || passed,
            score: Math.max(existing?.score ?? 0, score),
            attempts: (existing?.attempts ?? 0) + 1,
          },
        },
      };
    });
    debouncedSave(get);
  },

  pruneDailyGoalData: () => {
    const MAX_AGE_DAYS = 90;
    const data = get().dailyGoalData;
    const keys = Object.keys(data);
    if (keys.length === 0) return;

    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - MAX_AGE_DAYS);
    const pruned: Record<string, DailyGoalData> = {};
    let removedCount = 0;

    for (const dateKey of keys) {
      // Parse YYYY-MM-DD — use parts to avoid timezone issues with Date.parse
      const parts = dateKey.split('-');
      if (parts.length !== 3) {
        pruned[dateKey] = data[dateKey];
        continue;
      }
      const entryDate = new Date(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10),
      );
      if (entryDate >= cutoff) {
        pruned[dateKey] = data[dateKey];
      } else {
        removedCount++;
      }
    }

    if (removedCount > 0) {
      set({ dailyGoalData: pruned });
      debouncedSave(get);
      logger.log(`[progressStore] Pruned ${removedCount} dailyGoalData entries older than ${MAX_AGE_DAYS} days`);
    }
  },

  reset: () => {
    set({
      totalXp: 0,
      level: 1,
      streakData: defaultStreakData,
      lessonProgress: {},
      dailyGoalData: {},
      tierTestResults: {},
      streakMilestonesClaimed: [],
    });
    PersistenceManager.deleteState(STORAGE_KEYS.PROGRESS);
  },
}));

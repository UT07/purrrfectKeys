/**
 * Daily Plan Cache — persists the session plan to AsyncStorage so it
 * survives app reloads, tab switches, and sign-out/sign-in cycles.
 *
 * Keyed by DATE ONLY. The plan is generated once per day and never
 * regenerates mid-day — not even when skills change (+1 from completing
 * an exercise). Sign-out calls clearDailyPlanCache() so the next
 * sign-in generates a fresh plan with the synced skill set.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionPlan } from './CurriculumEngine';
import { generateSessionPlan } from './CurriculumEngine';
import { useLearnerProfileStore } from '../../stores/learnerProfileStore';
import { getTodayDateString } from '../../utils/time';
import { logger } from '../../utils/logger';

const CACHE_KEY = 'purrrfect_keys_daily_plan';

interface CachedPlan {
  date: string;
  plan: SessionPlan;
}

let memoryCache: CachedPlan | null = null;

/**
 * Get today's session plan. Returns cached plan if it exists for today.
 * Only generates a new plan on a new day or after cache was cleared (sign-out).
 *
 * If auth sync is still in progress (isLoading=true) and skills are empty,
 * returns a minimal placeholder plan instead of caching a beginner plan
 * that would persist all day. The real plan generates after sync completes.
 */
export function getDailyPlan(): SessionPlan {
  const today = getTodayDateString();

  // Cache hit — same day, return existing plan (even if skills changed)
  if (memoryCache?.date === today) {
    return memoryCache.plan;
  }

  // Guard: if auth is loading and skills are empty, the stores haven't been
  // populated by sync yet. Don't generate + cache a beginner plan.
  const profile = useLearnerProfileStore.getState();
  try {
    const { useAuthStore } = require('../../stores/authStore');
    const isLoading = useAuthStore.getState().isLoading;
    if (isLoading && profile.masteredSkills.length === 0) {
      logger.log('[DailyPlanCache] Auth still loading with 0 skills — deferring plan generation');
      // Return a minimal empty plan (will regenerate on next getDailyPlan() call after sync)
      return { sessionType: 'new-material', warmUp: [], lesson: [], challenge: [], songs: [], reasoning: ['Waiting for sync...'] };
    }
  } catch { /* authStore not available — proceed normally */ }
  const plan = generateSessionPlan(
    {
      noteAccuracy: profile.noteAccuracy,
      noteAttempts: profile.noteAttempts,
      skills: profile.skills,
      tempoRange: profile.tempoRange,
      weakNotes: profile.weakNotes,
      weakSkills: profile.weakSkills,
      totalExercisesCompleted: profile.totalExercisesCompleted,
      lastAssessmentDate: profile.lastAssessmentDate,
      assessmentScore: profile.assessmentScore,
      masteredSkills: profile.masteredSkills,
      skillMasteryData: profile.skillMasteryData,
      recentExerciseIds: profile.recentExerciseIds,
    },
    profile.masteredSkills,
  );

  memoryCache = { date: today, plan };
  logger.log(`[DailyPlanCache] Generated plan: ${plan.warmUp.length} warm-up, ${plan.lesson.length} lesson, ${plan.challenge.length} challenge`);

  // Persist to AsyncStorage in the background
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache)).catch(() => {});

  return plan;
}

/**
 * Hydrate the daily plan cache from AsyncStorage on app startup.
 */
export async function hydrateDailyPlanCache(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed: CachedPlan = JSON.parse(raw);
    const today = getTodayDateString();

    if (parsed.date === today) {
      memoryCache = parsed;
      logger.log('[DailyPlanCache] Restored plan from storage');
    }
  } catch {
    // Ignore — will regenerate on next access
  }
}

/**
 * Clear the cached plan. Called on sign-out to prevent stale plans
 * from being reused after re-sign-in with different skill state.
 */
export function clearDailyPlanCache(): void {
  memoryCache = null;
  AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
}

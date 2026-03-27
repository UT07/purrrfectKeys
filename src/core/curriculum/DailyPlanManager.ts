/**
 * DailyPlanManager — unified plan lifecycle with completion tracking
 *
 * Replaces the old dailyPlanCache.ts with a self-contained plan manager that:
 * 1. Generates a daily plan (one per day, stable until all exercises complete)
 * 2. Tracks per-exercise completion status within the plan itself
 * 3. Persists to AsyncStorage and syncs to Firestore
 *
 * Pure TypeScript — store imports are lazy `require()` to avoid circular deps.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ExerciseRef, SessionType } from './CurriculumEngine';
import { generateSessionPlan } from './CurriculumEngine';
import { getTodayDateString } from '../../utils/time';
import { logger } from '../../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface PlanExercise extends ExerciseRef {
  status: 'pending' | 'passed' | 'failed';
  score: number | null;
  completedAt: number | null;
}

export interface DailyPlan {
  date: string;
  sessionType: SessionType;
  warmUp: PlanExercise[];
  lesson: PlanExercise[];
  challenge: PlanExercise[];
  songs: PlanExercise[];
  reasoning: string[];
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'purrrfect_keys_daily_plan_v5'; // v5: fix skillNodeId matching + React re-render
const TAG = '[DailyPlanManager]';

// ============================================================================
// In-memory cache
// ============================================================================

let _plan: DailyPlan | null = null;

// ============================================================================
// Helpers
// ============================================================================

function exerciseRefToPlanExercise(ref: ExerciseRef): PlanExercise {
  return {
    ...ref,
    status: 'pending',
    score: null,
    completedAt: null,
  };
}

/**
 * Pre-populate plan exercises with existing scores from lessonProgress.
 * This way exercises the user already attempted show orange/green from the start.
 */
function prePopulateScores(exercises: PlanExercise[]): void {
  try {
    const { useProgressStore } = require('../../stores/progressStore');
    const lessonProgress = useProgressStore.getState().lessonProgress;
    if (!lessonProgress) return;

    for (const ex of exercises) {
      // Check static exercise scores across all lessons
      if (ex.source === 'static') {
        for (const lp of Object.values(lessonProgress)) {
          const score = (lp as any).exerciseScores?.[ex.exerciseId];
          if (score?.highScore > 0) {
            const { getExercise } = require('../../content/ContentLoader');
            const fullEx = getExercise(ex.exerciseId);
            const passingScore = fullEx?.scoring?.passingScore ?? 70;
            ex.score = score.highScore;
            ex.status = score.highScore >= passingScore ? 'passed' : 'failed';
            ex.completedAt = score.completedAt ?? null;
            break;
          }
        }
      }
      // Check AI exercise scores in _ai_exercises bucket
      if ((ex.source === 'ai' || ex.source === 'ai-with-fallback') && ex.skillNodeId) {
        const aiScores = (lessonProgress as any)['_ai_exercises']?.exerciseScores;
        const aiKey = `ai-skill-${ex.skillNodeId}`;
        const score = aiScores?.[aiKey];
        if (score?.highScore > 0) {
          ex.score = score.highScore;
          ex.status = score.completedAt != null ? 'passed' : 'failed';
          ex.completedAt = score.completedAt ?? null;
        }
      }
    }
  } catch {
    // progressStore not available — leave as pending
  }
}

function convertSessionToPlan(
  date: string,
  sessionType: SessionType,
  warmUp: ExerciseRef[],
  lesson: ExerciseRef[],
  challenge: ExerciseRef[],
  songs: ExerciseRef[],
  reasoning: string[],
): DailyPlan {
  const plan: DailyPlan = {
    date,
    sessionType,
    warmUp: warmUp.map(exerciseRefToPlanExercise),
    lesson: lesson.map(exerciseRefToPlanExercise),
    challenge: challenge.map(exerciseRefToPlanExercise),
    songs: (songs ?? []).map(exerciseRefToPlanExercise),
    reasoning,
  };

  // Pre-populate with existing scores so previously attempted exercises show orange/green
  prePopulateScores([...plan.warmUp, ...plan.lesson, ...plan.challenge, ...plan.songs]);

  return plan;
}

/** All non-song sections. Songs are optional and don't count toward "plan complete". */
function getNonSongExercises(plan: DailyPlan): PlanExercise[] {
  return [...plan.warmUp, ...plan.lesson, ...plan.challenge];
}

function isPlanComplete(plan: DailyPlan): boolean {
  const exercises = getNonSongExercises(plan);
  if (exercises.length === 0) return false;
  return exercises.every((ex) => ex.status !== 'pending');
}

function countCompletions(plan: DailyPlan): number {
  const allExercises = [...plan.warmUp, ...plan.lesson, ...plan.challenge, ...plan.songs];
  return allExercises.filter((ex) => ex.status !== 'pending').length;
}

/** Create a minimal empty plan used when stores are not yet ready. */
function createEmptyPlan(): DailyPlan {
  return {
    date: getTodayDateString(),
    sessionType: 'new-material',
    warmUp: [],
    lesson: [],
    challenge: [],
    songs: [],
    reasoning: ['Waiting for sync...'],
  };
}

function savePlanToStorage(plan: DailyPlan): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plan)).catch(() => {});
}

/**
 * Find a PlanExercise matching by exerciseId first, then by skillNodeId.
 * Returns the match and which section it belongs to.
 */
function findExerciseInPlan(
  plan: DailyPlan,
  exerciseId: string,
  skillId: string | null,
): PlanExercise | null {
  const allSections: PlanExercise[][] = [plan.warmUp, plan.lesson, plan.challenge, plan.songs];

  // First pass: match by exerciseId
  for (const section of allSections) {
    const match = section.find((ex) => ex.exerciseId === exerciseId);
    if (match) return match;
  }

  // Second pass: match by skillNodeId (AI exercises may have different IDs)
  if (skillId) {
    for (const section of allSections) {
      const match = section.find((ex) => ex.skillNodeId === skillId);
      if (match) return match;
    }
  }

  return null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get today's daily plan. Returns cached plan if it exists for today and is
 * not fully complete. Generates a fresh plan on a new day or when the
 * current plan is done.
 *
 * Guards against auth loading with 0 skills — returns an empty plan that
 * will regenerate on the next call after sync completes.
 */
export function getDailyPlan(): DailyPlan {
  const today = getTodayDateString();

  // Cache hit: same day and plan still has pending exercises
  if (_plan && _plan.date === today && !isPlanComplete(_plan)) {
    return _plan;
  }

  // If plan is complete but same day, generate a fresh one (user finished everything)
  if (_plan && _plan.date === today && isPlanComplete(_plan)) {
    logger.log(`${TAG} Plan complete — generating fresh plan for continued practice`);
  }

  // Lazy require to avoid circular dependencies
  const { useAuthStore } = require('../../stores/authStore');
  const { useLearnerProfileStore } = require('../../stores/learnerProfileStore');
  const { useProgressStore } = require('../../stores/progressStore');

  // Guard: don't cache a beginner plan while auth sync is in progress
  const isLoading = useAuthStore.getState().isLoading;
  const profile = useLearnerProfileStore.getState();
  if (isLoading && profile.masteredSkills.length === 0) {
    logger.log(`${TAG} Auth still loading with 0 skills — deferring plan generation`);
    return createEmptyPlan();
  }

  const lessonProgress = useProgressStore.getState().lessonProgress;

  const session = generateSessionPlan(
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
    lessonProgress,
  );

  _plan = convertSessionToPlan(
    today,
    session.sessionType,
    session.warmUp,
    session.lesson,
    session.challenge,
    session.songs,
    session.reasoning,
  );

  logger.log(
    `${TAG} Generated plan: ${_plan.warmUp.length} warm-up, ` +
    `${_plan.lesson.length} lesson, ${_plan.challenge.length} challenge, ` +
    `${_plan.songs.length} songs (${session.sessionType})`,
  );

  savePlanToStorage(_plan);

  // Fire-and-forget push to Firestore
  pushPlanToFirestore(_plan);

  return _plan;
}

/**
 * Update completion status for an exercise in the current plan.
 * Finds the matching PlanExercise by exerciseId first, then by skillNodeId.
 * Preserves the best score (never overwrites a higher score with a lower one).
 */
export function updatePlanCompletion(
  exerciseId: string,
  skillId: string | null,
  score: number,
  passed: boolean,
): void {
  if (!_plan) {
    logger.warn(`${TAG} updatePlanCompletion called with no active plan`);
    return;
  }

  const match = findExerciseInPlan(_plan, exerciseId, skillId);
  if (!match) {
    logger.log(
      `${TAG} Exercise ${exerciseId} (skill=${skillId}) not found in plan — ` +
      'may be a replay or free play',
    );
    return;
  }

  // Preserve best score
  const previousScore = match.score ?? 0;
  if (score > previousScore) {
    match.score = score;
  }

  match.status = passed ? 'passed' : 'failed';
  match.completedAt = Date.now();

  logger.log(
    `${TAG} Updated: ${exerciseId} → ${match.status} (score=${match.score}, ` +
    `best=${Math.max(score, previousScore)})`,
  );

  // Create new plan reference so React detects the change on re-render
  _plan = { ..._plan };

  // Save immediately — completion data is critical
  savePlanToStorage(_plan);

  // Fire-and-forget push to Firestore
  pushPlanToFirestore(_plan);
}

/**
 * Hydrate the daily plan from AsyncStorage on app startup.
 * Only restores if the cached plan's date matches today.
 */
export async function hydrateDailyPlan(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed: DailyPlan = JSON.parse(raw);
    const today = getTodayDateString();

    if (parsed.date === today) {
      _plan = parsed;
      logger.log(
        `${TAG} Restored plan from storage (${countCompletions(parsed)} completions)`,
      );
    } else {
      logger.log(`${TAG} Stored plan is stale (${parsed.date} !== ${today}) — will regenerate`);
    }
  } catch {
    // Ignore — will regenerate on next getDailyPlan() call
  }
}

/**
 * Pull the daily plan from Firestore and adopt it if the cloud copy
 * has more completions than the local copy. This handles cross-device
 * scenarios where the user completed exercises on another device.
 */
export async function pullPlanFromFirestore(): Promise<void> {
  try {
    const { getDailyPlanFromFirestore } = require('../../services/firebase/firestore');
    const { auth } = require('../../services/firebase/config');

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const remotePlan: DailyPlan | null = await getDailyPlanFromFirestore(uid);
    if (!remotePlan) return;

    const today = getTodayDateString();
    if (remotePlan.date !== today) return;

    const remoteCompletions = countCompletions(remotePlan);
    const localCompletions = _plan ? countCompletions(_plan) : 0;

    if (remoteCompletions > localCompletions) {
      _plan = remotePlan;
      savePlanToStorage(remotePlan);
      logger.log(
        `${TAG} Adopted cloud plan (${remoteCompletions} completions > local ${localCompletions})`,
      );
    } else {
      logger.log(
        `${TAG} Keeping local plan (${localCompletions} completions >= cloud ${remoteCompletions})`,
      );
    }
  } catch (err) {
    logger.warn(`${TAG} pullPlanFromFirestore failed:`, (err as Error)?.message);
  }
}

/**
 * Clear the cached plan. Called on sign-out to prevent stale plans
 * from being reused after re-sign-in with different skill state.
 */
export function clearDailyPlan(): void {
  _plan = null;
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

/**
 * Get the current in-memory plan without triggering generation.
 * Returns null if no plan is cached. Useful for UI reads that should
 * not have side effects.
 */
export function peekDailyPlan(): DailyPlan | null {
  return _plan;
}

// ============================================================================
// Internal: Firestore sync (fire-and-forget)
// ============================================================================

function pushPlanToFirestore(plan: DailyPlan): void {
  try {
    const { saveDailyPlan } = require('../../services/firebase/firestore');
    const { auth } = require('../../services/firebase/config');

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    saveDailyPlan(uid, plan).catch((err: Error) => {
      logger.warn(`${TAG} Firestore push failed:`, err?.message);
    });
  } catch {
    // Firestore module not available — offline mode
  }
}

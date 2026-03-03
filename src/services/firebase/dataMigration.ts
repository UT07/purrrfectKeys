/**
 * Data Migration Service
 * Migrates local progress from AsyncStorage to Firestore on first sign-in
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';
import { useProgressStore } from '../../stores/progressStore';
import { auth } from './config';
import { createGamificationData, addXp, createLessonProgress, getGamificationData, getAllLessonProgress } from './firestore';
import type { ExerciseProgress as FirestoreExerciseProgress } from './firestore';
import { logger } from '../../utils/logger';

const MIGRATION_KEY = 'purrrfect_keys_migrated';

/**
 * Check if local data has already been migrated to cloud
 */
export async function hasMigrated(): Promise<boolean> {
  const value = await AsyncStorage.getItem(MIGRATION_KEY);
  return value === 'true';
}

/**
 * Migrate local progress data to Firestore.
 * Should be called after a user signs in (non-anonymous).
 * Idempotent — checks migration flag before proceeding.
 */
export async function migrateLocalToCloud(): Promise<{ migrated: boolean; error?: string }> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    return { migrated: false, error: 'No authenticated user' };
  }

  // Skip if already migrated
  const alreadyMigrated = await hasMigrated();
  if (alreadyMigrated) {
    return { migrated: false };
  }

  try {
    const progressState = useProgressStore.getState();

    // If local state is empty (all stores were reset), skip migration
    const hasLocalProgress = progressState.totalXp > 0 ||
      Object.keys(progressState.lessonProgress).length > 0;
    if (!hasLocalProgress) {
      logger.log('[DataMigration] No local progress to migrate — skipping');
      await AsyncStorage.setItem(MIGRATION_KEY, 'true');
      return { migrated: false };
    }

    // 1. Migrate XP — merge with existing remote data (highest wins)
    const remoteGamification = await getGamificationData(uid).catch(() => null);
    if (progressState.totalXp > 0) {
      if (!remoteGamification) {
        await createGamificationData(uid);
        await addXp(uid, progressState.totalXp, 'migration');
      } else if (progressState.totalXp > remoteGamification.xp) {
        // Local has more XP — add the difference
        await addXp(uid, progressState.totalXp - remoteGamification.xp, 'migration');
      }
      // If remote has more XP, pullRemoteProgress() will handle it
    }

    // 2. Migrate lesson progress — only push lessons that don't exist remotely
    //    or where local scores are higher. pullRemoteProgress() merges the rest.
    const remoteLessons = await getAllLessonProgress(uid).catch(() => []);
    const remoteLessonMap = new Map(remoteLessons.map((l) => [l.lessonId, l]));

    for (const [lessonId, lessonProgress] of Object.entries(progressState.lessonProgress)) {
      const remoteLesson = remoteLessonMap.get(lessonId);

      // Skip if remote already has this lesson with a better or equal best score
      if (remoteLesson && (remoteLesson.bestScore ?? 0) >= (lessonProgress.bestScore ?? 0)) {
        continue;
      }

      // Convert local ExerciseProgress (number timestamps) to Firestore format (Timestamps)
      const firestoreScores: Record<string, FirestoreExerciseProgress> = {};
      for (const [exId, exProgress] of Object.entries(lessonProgress.exerciseScores)) {
        firestoreScores[exId] = {
          exerciseId: exProgress.exerciseId,
          highScore: exProgress.highScore,
          stars: exProgress.stars,
          attempts: exProgress.attempts,
          lastAttemptAt: Timestamp.fromMillis(exProgress.lastAttemptAt || Date.now()),
          averageScore: exProgress.averageScore,
        };
      }

      await createLessonProgress(uid, lessonId, {
        lessonId,
        status: lessonProgress.status,
        exerciseScores: firestoreScores,
        bestScore: lessonProgress.bestScore,
        totalAttempts: lessonProgress.totalAttempts ?? 0,
        totalTimeSpentSeconds: lessonProgress.totalTimeSpentSeconds ?? 0,
      });
    }

    // 3. Mark as migrated
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    logger.log('[DataMigration] Successfully migrated local data to cloud');

    return { migrated: true };
  } catch (error) {
    logger.warn('[DataMigration] Migration failed:', (error as Error)?.message);
    return { migrated: false, error: (error as Error)?.message ?? 'Unknown error' };
  }
}

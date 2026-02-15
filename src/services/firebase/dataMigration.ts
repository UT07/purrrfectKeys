/**
 * Data Migration Service
 * Migrates local progress from AsyncStorage to Firestore on first sign-in
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProgressStore } from '../../stores/progressStore';
import { auth } from './config';
import { createGamificationData, addXp, createLessonProgress } from './firestore';

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

    // 1. Migrate XP and level
    if (progressState.totalXp > 0) {
      await createGamificationData(uid);
      await addXp(uid, progressState.totalXp, 'migration');
    }

    // 2. Migrate lesson progress
    for (const [lessonId, lessonProgress] of Object.entries(progressState.lessonProgress)) {
      await createLessonProgress(uid, lessonId, {
        lessonId,
        status: lessonProgress.status,
        exerciseScores: lessonProgress.exerciseScores as any,
        bestScore: lessonProgress.bestScore,
        totalAttempts: lessonProgress.totalAttempts ?? 0,
        totalTimeSpentSeconds: lessonProgress.totalTimeSpentSeconds ?? 0,
      });
    }

    // 3. Mark as migrated
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    console.log('[DataMigration] Successfully migrated local data to cloud');

    return { migrated: true };
  } catch (error) {
    console.warn('[DataMigration] Migration failed:', (error as Error)?.message);
    return { migrated: false, error: (error as Error)?.message ?? 'Unknown error' };
  }
}

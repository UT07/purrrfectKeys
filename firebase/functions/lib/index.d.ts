/**
 * Firebase Cloud Functions Index
 * Exports all Cloud Functions for deployment
 */
import * as admin from 'firebase-admin';
export * from './generateCoachFeedback';
export * from './deleteUserData';
export * from './generateExercise';
export * from './generateSong';
export * from './dailySightReading';
export * from './weeklyNewSongs';
/**
 * Cloud Function: Sync Progress
 * Handles bidirectional sync of user progress with conflict resolution
 */
export declare const syncProgress: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    serverChanges: admin.firestore.DocumentData[];
    newSyncTimestamp: number;
    conflicts: Record<string, any>[];
    synced: boolean;
}>, unknown>;
/**
 * Cloud Function: Complete Exercise
 * Awards XP, updates progress, checks achievements
 */
export declare const completeExercise: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    xpEarned: number;
    newLevel: number | undefined;
    achievementsUnlocked: string[];
}>, unknown>;
/**
 * Cloud Function: Get Exercise Recommendations
 * Suggests next exercises based on user performance
 */
export declare const getExerciseRecommendations: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    exerciseId: string;
    reason: string;
}[]>, unknown>;
/**
 * Cloud Function: Get Weekly Summary
 * Generates weekly insights and goals
 */
export declare const getWeeklySummary: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    exercisesCompleted: number;
    minutesPracticed: number;
    xpEarned: number;
    improvements: string[];
    nextWeekGoals: string[];
}>, unknown>;
//# sourceMappingURL=index.d.ts.map
/**
 * Firebase Cloud Functions Index
 * Exports all Cloud Functions for deployment
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export all functions
export * from './generateCoachFeedback';
export * from './deleteUserData';
export * from './generateExercise';
export * from './generateSong';
export * from './dailySightReading';
export * from './weeklyNewSongs';
export * from './weeklyLeagueRewards';
export * from './weeklyLeagueAssignment';
export * from './seasonEndRewards';

// ============================================================================
// Additional Cloud Functions
// ============================================================================

/**
 * Cloud Function: Sync Progress
 * Handles bidirectional sync of user progress with conflict resolution
 */
export const syncProgress = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Must be authenticated',
      );
    }

    const uid = request.auth.uid;
    const data = request.data as {
      lastSyncTimestamp: number;
      localChanges: Array<Record<string, any>>;
    };

    try {
      const { lastSyncTimestamp, localChanges } = data;

      // Get server changes since last sync
      const changesRef = admin
        .firestore()
        .collection(`users/${uid}/syncLog`);

      const serverChanges = await changesRef
        .where('timestamp', '>', admin.firestore.Timestamp.fromMillis(lastSyncTimestamp))
        .get();

      const serverChangesList = serverChanges.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => doc.data());

      // Detect conflicts (same type + exercise within 5 seconds)
      const conflicts: Array<Record<string, any>> = [];

      const toMillis = (ts: any): number => {
        if (typeof ts === 'number') return ts;
        if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
        return 0;
      };

      for (const localChange of localChanges) {
        const conflict = serverChangesList.find(
          (sc: Record<string, any>) =>
            sc.type === localChange.type &&
            sc.exerciseId === localChange.exerciseId &&
            Math.abs(toMillis(sc.timestamp) - toMillis(localChange.timestamp)) < 5000,
        );

        if (conflict) {
          conflicts.push({
            field: localChange.type,
            localValue: localChange,
            serverValue: conflict,
            resolution: 'server',
            resolvedValue: conflict,
          });
        }
      }

      // Apply only non-conflicting local changes (server wins on conflicts)
      // Limit to 400 changes per call to stay under Firestore batch limit of 500
      const conflictIds = new Set(
        conflicts.map((c: Record<string, any>) => c.localValue?.id).filter(Boolean),
      );
      const SYNC_BATCH_LIMIT = 400;
      const changesToApply = localChanges
        .filter((change) => change.id && !conflictIds.has(change.id))
        .slice(0, SYNC_BATCH_LIMIT);

      const batch = admin.firestore().batch();
      for (const change of changesToApply) {
        const docRef = changesRef.doc(change.id);
        // Whitelist only expected fields to prevent arbitrary data injection
        batch.set(docRef, {
          id: change.id,
          type: typeof change.type === 'string' ? change.type.slice(0, 50) : 'unknown',
          exerciseId: typeof change.exerciseId === 'string' ? change.exerciseId.slice(0, 100) : undefined,
          xpAmount: typeof change.xpAmount === 'number' ? change.xpAmount : undefined,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          synced: true,
          syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();

      return {
        serverChanges: serverChangesList,
        newSyncTimestamp: Date.now(),
        conflicts,
        synced: true,
      };
    } catch (error) {
      logger.error('Sync error', { uid, error: String(error) });
      throw new HttpsError(
        'internal',
        'Sync failed',
      );
    }
  },
);

/**
 * Cloud Function: Complete Exercise
 * Awards XP, updates progress, checks achievements
 */
export const completeExercise = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Must be authenticated',
      );
    }

    const uid = request.auth.uid;
    const raw = request.data as Record<string, unknown>;
    if (typeof raw?.exerciseId !== 'string' || !raw.exerciseId) {
      throw new HttpsError('invalid-argument', 'exerciseId must be a non-empty string');
    }
    const exerciseId = raw.exerciseId;
    const isPerfect = raw.isPerfect === true;

    try {
      const db = admin.firestore();
      const userRef = db.collection('users').doc(uid);
      const gamRef = userRef.collection('gamification').doc('data');

      // Calculate XP reward
      const XP_REWARDS = {
        exerciseComplete: 10,
        exerciseFirstTime: 25,
        exercisePerfect: 50,
      };

      let xpEarned = XP_REWARDS.exerciseComplete;

      // Bonus for first time
      const progressDoc = await userRef.collection('progress').doc(exerciseId).get();
      if (!progressDoc.exists || progressDoc.data()?.totalAttempts === 0) {
        xpEarned += XP_REWARDS.exerciseFirstTime;
      }

      // Bonus for perfect score
      if (isPerfect) {
        xpEarned += XP_REWARDS.exercisePerfect;
      }

      // Use a transaction to atomically read-compute-write XP and level,
      // preventing race conditions when two completions fire concurrently.
      const { newXp, newLevel, oldLevel } = await db.runTransaction(async (transaction) => {
        const gamDoc = await transaction.get(gamRef);
        const gamData = gamDoc.data() || {};
        const txNewXp = (gamData.xp || 0) + xpEarned;
        const txNewLevel = calculateLevel(txNewXp);
        const txOldLevel = gamData.level || 1;

        transaction.set(gamRef, {
          xp: txNewXp,
          level: txNewLevel,
          lastExerciseAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return { newXp: txNewXp, newLevel: txNewLevel, oldLevel: txOldLevel };
      });

      // Log XP change and sync log outside the transaction (non-critical)
      const batch = db.batch();
      batch.set(db.collection(`users/${uid}/xpLog`).doc(), {
        amount: xpEarned,
        source: 'exercise_complete',
        newTotal: newXp,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.set(db.collection(`users/${uid}/syncLog`).doc(), {
        type: 'xp_earned',
        exerciseId,
        xpAmount: xpEarned,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        synced: false,
      });
      await batch.commit();

      const achievements: string[] = [];

      // Check for achievements
      if (newLevel > oldLevel) {
        achievements.push(`level_${newLevel}`);
      }

      if (newXp >= 1000 && (newXp - xpEarned) < 1000) {
        achievements.push('xp_1000');
      }

      return {
        xpEarned,
        newLevel: newLevel > oldLevel ? newLevel : undefined,
        achievementsUnlocked: achievements,
      };
    } catch (error) {
      logger.error('Exercise completion error', {
        uid,
        exerciseId,
        error: String(error),
      });
      throw new HttpsError('internal', 'Failed to complete exercise');
    }
  },
);

/**
 * Cloud Function: Get Exercise Recommendations
 * Suggests next exercises based on user performance
 */
export const getExerciseRecommendations = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Must be authenticated',
      );
    }

    const uid = request.auth.uid;

    try {
      const db = admin.firestore();
      const userRef = db.collection('users').doc(uid);

      // Get user progress
      const progressDocs = await userRef.collection('progress').get();

      const recommendations = [];

      // Analyze weaknesses
      let weakestSkill = null;
      let lowestScore = 100;

      for (const doc of progressDocs.docs) {
        const progress = doc.data();
        if (progress.bestScore < lowestScore) {
          lowestScore = progress.bestScore;
          weakestSkill = doc.id;
        }
      }

      if (weakestSkill) {
        recommendations.push({
          exerciseId: weakestSkill,
          reason: 'You had trouble with this one - let\'s practice it more!',
        });
      }

      // Recommend next in sequence
      const nextLesson = Math.min(progressDocs.docs.length + 1, 30);
      recommendations.push({
        exerciseId: `lesson_${nextLesson}`,
        reason: 'Ready for the next challenge?',
      });

      return recommendations;
    } catch (error) {
      logger.error('Recommendations error', { uid, error: String(error) });
      return [];
    }
  },
);

/**
 * Cloud Function: Get Weekly Summary
 * Generates weekly insights and goals
 */
export const getWeeklySummary = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Must be authenticated',
      );
    }

    const uid = request.auth.uid;

    try {
      const db = admin.firestore();
      const userRef = db.collection('users').doc(uid);

      // Get this week's progress
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const syncLogs = await userRef
        .collection('syncLog')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(oneWeekAgo))
        .get();

      let exercisesCompleted = 0;
      let totalXp = 0;

      for (const doc of syncLogs.docs) {
        const logData = doc.data();
        if (logData.type === 'exercise_completed') {
          exercisesCompleted++;
        } else if (logData.type === 'xp_earned') {
          totalXp += logData.xpAmount || 0;
        }
      }

      // Estimate minutes (10 min per exercise average)
      const minutesPracticed = exercisesCompleted * 10;

      const improvements = [];
      if (exercisesCompleted >= 5) {
        improvements.push('Great consistency this week!');
      }
      if (totalXp >= 500) {
        improvements.push('Significant progress made!');
      }

      const nextWeekGoals = [];
      if (exercisesCompleted < 5) {
        nextWeekGoals.push('Aim for 5+ exercises');
      }
      nextWeekGoals.push('Complete one new skill');
      nextWeekGoals.push('Maintain your streak');

      return {
        exercisesCompleted,
        minutesPracticed,
        xpEarned: totalXp,
        improvements,
        nextWeekGoals,
      };
    } catch (error) {
      logger.error('Weekly summary error', { uid, error: String(error) });
      return {
        exercisesCompleted: 0,
        minutesPracticed: 0,
        xpEarned: 0,
        improvements: [],
        nextWeekGoals: [],
      };
    }
  },
);

/**
 * Calculate user level from total XP
 */
function calculateLevel(totalXp: number): number {
  let level = 1;
  let xpRequired = 0;

  while (xpRequired + Math.floor(100 * Math.pow(1.5, level - 1)) <= totalXp) {
    xpRequired += Math.floor(100 * Math.pow(1.5, level - 1));
    level++;
  }

  return level;
}

"use strict";
/**
 * Firebase Cloud Functions Index
 * Exports all Cloud Functions for deployment
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWeeklySummary = exports.getExerciseRecommendations = exports.completeExercise = exports.syncProgress = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
// Initialize Firebase Admin SDK
admin.initializeApp();
// Export all functions
__exportStar(require("./generateCoachFeedback"), exports);
__exportStar(require("./deleteUserData"), exports);
__exportStar(require("./generateExercise"), exports);
__exportStar(require("./generateSong"), exports);
__exportStar(require("./dailySightReading"), exports);
__exportStar(require("./weeklyNewSongs"), exports);
// ============================================================================
// Additional Cloud Functions
// ============================================================================
/**
 * Cloud Function: Sync Progress
 * Handles bidirectional sync of user progress with conflict resolution
 */
exports.syncProgress = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const uid = request.auth.uid;
    const data = request.data;
    try {
        const { lastSyncTimestamp, localChanges } = data;
        // Get server changes since last sync
        const changesRef = admin
            .firestore()
            .collection(`users/${uid}/syncLog`);
        const serverChanges = await changesRef
            .where('timestamp', '>', admin.firestore.Timestamp.fromMillis(lastSyncTimestamp))
            .get();
        const serverChangesList = serverChanges.docs.map((doc) => doc.data());
        // Detect conflicts (same type + exercise within 5 seconds)
        const conflicts = [];
        for (const localChange of localChanges) {
            const conflict = serverChangesList.find((sc) => sc.type === localChange.type &&
                sc.exerciseId === localChange.exerciseId &&
                Math.abs(sc.timestamp.toMillis() - localChange.timestamp.toMillis()) < 5000);
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
        // Apply local changes
        const batch = admin.firestore().batch();
        for (const change of localChanges) {
            const docRef = changesRef.doc(change.id);
            batch.set(docRef, {
                ...change,
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
    }
    catch (error) {
        firebase_functions_1.logger.error('Sync error', { uid, error: String(error) });
        throw new https_1.HttpsError('internal', 'Sync failed');
    }
});
/**
 * Cloud Function: Complete Exercise
 * Awards XP, updates progress, checks achievements
 */
exports.completeExercise = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const uid = request.auth.uid;
    const data = request.data;
    const { exerciseId, isPerfect } = data;
    try {
        const db = admin.firestore();
        const userRef = db.collection('users').doc(uid);
        // Get current gamification data
        const gamDoc = await userRef.collection('gamification').doc('data').get();
        const gamData = gamDoc.data() || {};
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
        // Calculate new level
        const newXp = (gamData.xp || 0) + xpEarned;
        const newLevel = calculateLevel(newXp);
        const oldLevel = gamData.level || 1;
        // Update gamification
        const batch = db.batch();
        batch.set(userRef.collection('gamification').doc('data'), {
            xp: newXp,
            level: newLevel,
            lastExerciseAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        // Log XP change
        batch.set(db.collection(`users/${uid}/xpLog`).doc(), {
            amount: xpEarned,
            source: 'exercise_complete',
            newTotal: newXp,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Log to sync log
        batch.set(db.collection(`users/${uid}/syncLog`).doc(), {
            type: 'xp_earned',
            exerciseId,
            xpAmount: xpEarned,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            synced: false,
        });
        await batch.commit();
        const achievements = [];
        // Check for achievements
        if (newLevel > oldLevel) {
            achievements.push(`level_${newLevel}`);
        }
        if (newXp >= 1000 && (gamData.xp || 0) < 1000) {
            achievements.push('xp_1000');
        }
        return {
            xpEarned,
            newLevel: newLevel > oldLevel ? newLevel : undefined,
            achievementsUnlocked: achievements,
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('Exercise completion error', {
            uid,
            exerciseId,
            error: String(error),
        });
        throw new https_1.HttpsError('internal', 'Failed to complete exercise');
    }
});
/**
 * Cloud Function: Get Exercise Recommendations
 * Suggests next exercises based on user performance
 */
exports.getExerciseRecommendations = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
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
    }
    catch (error) {
        firebase_functions_1.logger.error('Recommendations error', { uid, error: String(error) });
        return [];
    }
});
/**
 * Cloud Function: Get Weekly Summary
 * Generates weekly insights and goals
 */
exports.getWeeklySummary = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
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
            }
            else if (logData.type === 'xp_earned') {
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
    }
    catch (error) {
        firebase_functions_1.logger.error('Weekly summary error', { uid, error: String(error) });
        return {
            exercisesCompleted: 0,
            minutesPracticed: 0,
            xpEarned: 0,
            improvements: [],
            nextWeekGoals: [],
        };
    }
});
/**
 * Calculate user level from total XP
 */
function calculateLevel(totalXp) {
    let level = 1;
    let xpRequired = 0;
    while (xpRequired + Math.floor(100 * Math.pow(1.5, level - 1)) <= totalXp) {
        xpRequired += Math.floor(100 * Math.pow(1.5, level - 1));
        level++;
    }
    return level;
}
//# sourceMappingURL=index.js.map
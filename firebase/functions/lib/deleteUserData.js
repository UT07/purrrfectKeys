"use strict";
/**
 * Cloud Function: Delete User Data
 * Recursively deletes all user subcollections and cleans up cross-collection references.
 * Called from client authStore.deleteAccount() before deleting the Firebase Auth account.
 *
 * Subcollections deleted:
 *   users/{uid}/progress, gamification, xpLog, syncLog, settings,
 *   friends, activity, songMastery, songRequests
 *
 * Cross-collection cleanup:
 *   - friendCodes/{code} where uid == caller
 *   - leagues/{leagueId}/members/{uid}
 *   - challenges/{id} where fromUid or toUid == caller
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserAllData = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const USER_SUBCOLLECTIONS = [
    'progress',
    'gamification',
    'xpLog',
    'syncLog',
    'settings',
    'friends',
    'activity',
    'songMastery',
    'songRequests',
];
/**
 * Delete all documents in a collection (batch delete, max 500 per batch).
 */
async function deleteCollection(db, collectionPath) {
    const collectionRef = db.collection(collectionPath);
    let deleted = 0;
    // Process in batches of 500 (Firestore batch limit)
    let snapshot = await collectionRef.limit(500).get();
    while (snapshot.size > 0) {
        const batch = db.batch();
        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
        }
        await batch.commit();
        deleted += snapshot.size;
        if (snapshot.size < 500)
            break;
        snapshot = await collectionRef.limit(500).get();
    }
    return deleted;
}
/**
 * Callable Cloud Function: deleteUserAllData
 * Deletes all user data from Firestore. Must be called by the authenticated user.
 */
exports.deleteUserAllData = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated to delete account data');
    }
    const uid = request.auth.uid;
    const db = admin.firestore();
    firebase_functions_1.logger.info('Starting user data deletion', { uid });
    try {
        let totalDeleted = 0;
        // 1. Delete all user subcollections
        for (const subcollection of USER_SUBCOLLECTIONS) {
            const path = `users/${uid}/${subcollection}`;
            const count = await deleteCollection(db, path);
            if (count > 0) {
                firebase_functions_1.logger.info(`Deleted ${count} docs from ${path}`);
            }
            totalDeleted += count;
        }
        // 2. Delete the user profile document
        await db.doc(`users/${uid}`).delete();
        totalDeleted += 1;
        // 3. Clean up friendCodes where uid == this user
        const friendCodesSnap = await db
            .collection('friendCodes')
            .where('uid', '==', uid)
            .get();
        if (!friendCodesSnap.empty) {
            const batch = db.batch();
            for (const doc of friendCodesSnap.docs) {
                batch.delete(doc.ref);
            }
            await batch.commit();
            totalDeleted += friendCodesSnap.size;
            firebase_functions_1.logger.info(`Deleted ${friendCodesSnap.size} friend codes`);
        }
        // 4. Clean up league memberships
        const memberSnap = await db
            .collectionGroup('members')
            .where('uid', '==', uid)
            .get();
        if (!memberSnap.empty) {
            const batch = db.batch();
            for (const doc of memberSnap.docs) {
                batch.delete(doc.ref);
                const leagueRef = doc.ref.parent.parent;
                if (leagueRef) {
                    batch.update(leagueRef, {
                        memberCount: admin.firestore.FieldValue.increment(-1),
                    });
                }
            }
            await batch.commit();
            totalDeleted += memberSnap.size;
            firebase_functions_1.logger.info(`Deleted ${memberSnap.size} league memberships`);
        }
        // 5. Clean up challenges where user is participant
        const fromSnap = await db
            .collection('challenges')
            .where('fromUid', '==', uid)
            .get();
        const toSnap = await db
            .collection('challenges')
            .where('toUid', '==', uid)
            .get();
        const challengeIds = new Set();
        const challengeBatch = db.batch();
        for (const doc of [...fromSnap.docs, ...toSnap.docs]) {
            if (!challengeIds.has(doc.id)) {
                challengeIds.add(doc.id);
                challengeBatch.delete(doc.ref);
            }
        }
        if (challengeIds.size > 0) {
            await challengeBatch.commit();
            totalDeleted += challengeIds.size;
            firebase_functions_1.logger.info(`Deleted ${challengeIds.size} challenges`);
        }
        // 6. Clean up usernames where uid == this user
        const usernamesSnap = await db
            .collection('usernames')
            .where('uid', '==', uid)
            .get();
        if (!usernamesSnap.empty) {
            const batch = db.batch();
            for (const doc of usernamesSnap.docs) {
                batch.delete(doc.ref);
            }
            await batch.commit();
            totalDeleted += usernamesSnap.size;
            firebase_functions_1.logger.info(`Deleted ${usernamesSnap.size} usernames`);
        }
        // 7. Remove this user from other users' friend lists
        const friendOfSnap = await db
            .collectionGroup('friends')
            .where('uid', '==', uid)
            .get();
        if (!friendOfSnap.empty) {
            const batch = db.batch();
            for (const doc of friendOfSnap.docs) {
                batch.delete(doc.ref);
            }
            await batch.commit();
            totalDeleted += friendOfSnap.size;
            firebase_functions_1.logger.info(`Removed from ${friendOfSnap.size} friend lists`);
        }
        firebase_functions_1.logger.info('User data deletion complete', { uid, totalDeleted });
        return { success: true, deletedDocuments: totalDeleted };
    }
    catch (error) {
        firebase_functions_1.logger.error('User data deletion failed', { uid, error: String(error) });
        throw new https_1.HttpsError('internal', 'Failed to delete user data');
    }
});
//# sourceMappingURL=deleteUserData.js.map
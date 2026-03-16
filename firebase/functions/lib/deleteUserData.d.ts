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
/**
 * Callable Cloud Function: deleteUserAllData
 * Deletes all user data from Firestore. Must be called by the authenticated user.
 */
export declare const deleteUserAllData: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    deletedDocuments: number;
}>, unknown>;
//# sourceMappingURL=deleteUserData.d.ts.map
/**
 * Cloud Function: Weekly New Songs
 *
 * Scheduled function that runs every Monday at 09:00 UTC.
 * Generates 10 new songs using Gemini 2.0 Flash and saves them to Firestore.
 * Checks existing song titles to avoid duplicates.
 */
export declare const weeklyNewSongs: import("firebase-functions/v2/scheduler").ScheduleFunction;
//# sourceMappingURL=weeklyNewSongs.d.ts.map
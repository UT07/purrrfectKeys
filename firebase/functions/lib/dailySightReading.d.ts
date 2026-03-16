/**
 * Cloud Function: Daily Sight-Reading Challenge
 * Generates a fresh sight-reading exercise each day using Gemini 2.0 Flash.
 * Cached per day — all users get the same exercise for a given date.
 * Rate-limited to 5 requests per user per day.
 */
import * as admin from 'firebase-admin';
interface SightReadingExercise {
    notes: Array<{
        note: number;
        startBeat: number;
        durationBeats: number;
        hand?: string;
    }>;
    settings: {
        tempo: number;
        timeSignature: [number, number];
        keySignature: string;
    };
    metadata: {
        title: string;
        difficulty: number;
        skills: string[];
    };
    scoring: {
        passingScore: number;
        timingToleranceMs: number;
        starThresholds: number[];
    };
}
export declare const dailySightReading: import("firebase-functions/v2/https").CallableFunction<any, Promise<SightReadingExercise | admin.firestore.DocumentData | undefined>, unknown>;
export {};
//# sourceMappingURL=dailySightReading.d.ts.map
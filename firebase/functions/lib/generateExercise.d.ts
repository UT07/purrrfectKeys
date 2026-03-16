/**
 * Cloud Function: Generate AI Exercise
 * Generates piano exercises using Gemini 2.0 Flash, moving the API key server-side.
 * Rate-limited to 30 requests per user per day.
 */
interface AIExercise {
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
    metadata?: {
        title?: string;
        difficulty?: number;
        skills?: string[];
    };
    scoring?: {
        passingScore?: number;
        timingToleranceMs?: number;
        starThresholds?: number[];
    };
}
export declare const generateExercise: import("firebase-functions/v2/https").CallableFunction<any, Promise<AIExercise>, unknown>;
export {};
//# sourceMappingURL=generateExercise.d.ts.map
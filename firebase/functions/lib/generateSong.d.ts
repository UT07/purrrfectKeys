/**
 * Cloud Function: Generate Song
 * Generates simplified piano arrangements using Gemini 2.0 Flash.
 * Rate-limited to 5 requests per user per day.
 *
 * Note: ABC parsing (abcjs) is not available in Cloud Functions,
 * so we validate the raw Gemini response and return it for client-side assembly.
 */
interface GeneratedSongABC {
    title: string;
    artist: string;
    genre: string;
    difficulty: number;
    attribution: string;
    sections: Array<{
        label: string;
        melodyABC: string;
        accompanimentABC?: string;
    }>;
    tempo: number;
    key: string;
}
export declare const generateSong: import("firebase-functions/v2/https").CallableFunction<any, Promise<GeneratedSongABC>, unknown>;
export {};
//# sourceMappingURL=generateSong.d.ts.map
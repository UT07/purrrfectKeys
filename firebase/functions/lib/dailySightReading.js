"use strict";
/**
 * Cloud Function: Daily Sight-Reading Challenge
 * Generates a fresh sight-reading exercise each day using Gemini 2.0 Flash.
 * Cached per day — all users get the same exercise for a given date.
 * Rate-limited to 5 requests per user per day.
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
exports.dailySightReading = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
// ============================================================================
// Constants
// ============================================================================
const MIDI_MIN = 48; // C3
const MIDI_MAX = 84; // C6
const MAX_NOTES = 32;
const VALID_DURATIONS = new Set([0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]);
const MAX_REQUESTS_PER_DAY = 5;
// Difficulty rotates through the week (Mon=1 → Sun=3, cycling 1-3)
const DAY_DIFFICULTY = {
    0: 2, // Sunday
    1: 1, // Monday
    2: 1, // Tuesday
    3: 2, // Wednesday
    4: 2, // Thursday
    5: 3, // Friday
    6: 3, // Saturday
};
// Key signatures rotate weekly
const WEEKLY_KEYS = ['C major', 'G major', 'F major', 'D major', 'Bb major', 'A major', 'Eb major'];
// ============================================================================
// Validation
// ============================================================================
function validateExercise(exercise) {
    if (exercise == null || typeof exercise !== 'object')
        return false;
    const ex = exercise;
    if (!Array.isArray(ex.notes) || ex.notes.length === 0 || ex.notes.length > MAX_NOTES)
        return false;
    if (ex.settings == null || typeof ex.settings !== 'object')
        return false;
    const settings = ex.settings;
    if (typeof settings.tempo !== 'number' || settings.tempo < 40 || settings.tempo > 160)
        return false;
    const notes = ex.notes;
    for (const n of notes) {
        if (typeof n.note !== 'number' || n.note < MIDI_MIN || n.note > MIDI_MAX)
            return false;
        if (typeof n.startBeat !== 'number' || n.startBeat < 0)
            return false;
        if (typeof n.durationBeats !== 'number' || !VALID_DURATIONS.has(n.durationBeats))
            return false;
    }
    return true;
}
// ============================================================================
// Prompt Builder
// ============================================================================
function buildSightReadingPrompt(difficulty, keySignature, dateStr) {
    const noteCount = difficulty <= 1 ? 12 : difficulty <= 2 ? 18 : 24;
    const tempo = difficulty <= 1 ? 60 : difficulty <= 2 ? 80 : 100;
    const hand = difficulty <= 2 ? 'right' : 'both';
    return `Generate a daily sight-reading piano exercise for ${dateStr}.

SKILL OBJECTIVE: Train the student to read and play music at first sight. The exercise should be unfamiliar — avoid common scale patterns or well-known melodies.

Profile:
- Difficulty: ${difficulty}/5
- Target note count: ${noteCount}

Requirements:
- Tempo: ${tempo} BPM
- Time signature: 4/4
- Key signature: ${keySignature}
- Hand: "${hand}"
- All MIDI notes between 48-84 (C3 to C6)
- Use varied intervals: mix stepwise motion with thirds and occasional fourths
- Include rhythmic variety: quarter notes, half notes, eighth notes, dotted quarters
- Structure in 4-bar phrases
- End on the tonic note
- durationBeats must be: 0.25, 0.5, 0.75, 1, 1.5, 2, 3, or 4
- First note starts on beat 0

Return ONLY valid JSON (no markdown):
{ "notes": [{"note": <midi>, "startBeat": <number>, "durationBeats": <number>, "hand": "${hand}"}], "settings": {"tempo": ${tempo}, "timeSignature": [4,4], "keySignature": "${keySignature}"}, "metadata": {"title": "Daily Sight-Reading ${dateStr}", "difficulty": ${difficulty}, "skills": ["sight-reading"]}, "scoring": {"passingScore": ${difficulty <= 2 ? 60 : 70}, "timingToleranceMs": ${difficulty <= 2 ? 75 : 50}, "starThresholds": [70, 85, 95]} }`;
}
// ============================================================================
// Cloud Function
// ============================================================================
exports.dailySightReading = (0, https_1.onCall)({ region: 'us-central1', secrets: ['GEMINI_API_KEY'] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const uid = request.auth.uid;
    const db = admin.firestore();
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // e.g. "2026-03-11"
    // Check per-day cache first
    const cacheRef = db.collection('dailySightReading').doc(dateStr);
    const cached = await cacheRef.get();
    if (cached.exists) {
        firebase_functions_1.logger.info('Serving cached sight-reading exercise', { dateStr });
        return cached.data();
    }
    // Rate limit per user
    const rateLimitRef = db.collection('rateLimit').doc(uid).collection('sightReading').doc(dateStr);
    const rateLimitDoc = await rateLimitRef.get();
    const count = rateLimitDoc.exists ? (rateLimitDoc.data()?.count ?? 0) : 0;
    if (count >= MAX_REQUESTS_PER_DAY) {
        throw new https_1.HttpsError('resource-exhausted', 'Daily sight-reading limit reached');
    }
    await rateLimitRef.set({ count: count + 1, updatedAt: Date.now() }, { merge: true });
    // Generate
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
        throw new https_1.HttpsError('failed-precondition', 'Gemini API key not configured');
    }
    const difficulty = DAY_DIFFICULTY[today.getDay()] ?? 2;
    const weekOfYear = Math.ceil(((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7);
    const keySignature = WEEKLY_KEYS[weekOfYear % WEEKLY_KEYS.length];
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.8, // Slightly higher for variety
        },
    });
    const prompt = buildSightReadingPrompt(difficulty, keySignature, dateStr);
    try {
        let exercise = null;
        // First attempt
        const result = await model.generateContent(prompt);
        const parsed = JSON.parse(result.response.text());
        if (validateExercise(parsed)) {
            exercise = parsed;
        }
        // Retry once
        if (!exercise) {
            const retryPrompt = prompt + '\n\nPrevious attempt was invalid. Ensure all MIDI notes are 48-84 and durations are standard values.';
            const retryResult = await model.generateContent(retryPrompt);
            const retryParsed = JSON.parse(retryResult.response.text());
            if (validateExercise(retryParsed)) {
                exercise = retryParsed;
            }
        }
        if (!exercise) {
            throw new https_1.HttpsError('internal', 'Sight-reading generation failed validation');
        }
        // Cache for the whole day
        await cacheRef.set({
            ...exercise,
            generatedAt: Date.now(),
            dateStr,
        });
        firebase_functions_1.logger.info('Daily sight-reading generated', { dateStr, difficulty, keySignature });
        return exercise;
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        firebase_functions_1.logger.error('Sight-reading generation error', { uid, error: String(error) });
        throw new https_1.HttpsError('internal', 'Failed to generate sight-reading exercise');
    }
});
//# sourceMappingURL=dailySightReading.js.map
"use strict";
/**
 * Cloud Function: Generate Song
 * Generates simplified piano arrangements using Gemini 2.0 Flash.
 * Rate-limited to 5 requests per user per day.
 *
 * Note: ABC parsing (abcjs) is not available in Cloud Functions,
 * so we validate the raw Gemini response and return it for client-side assembly.
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
exports.generateSong = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
const posthogClient_1 = require("./posthogClient");
// ============================================================================
// Constants
// ============================================================================
const MAX_REQUESTS_PER_DAY = 5;
// ============================================================================
// Validation
// ============================================================================
function validateGeneratedSong(raw) {
    if (raw === null || raw === undefined || typeof raw !== 'object')
        return false;
    const obj = raw;
    if (typeof obj.title !== 'string' || obj.title.length === 0)
        return false;
    if (typeof obj.artist !== 'string')
        return false;
    if (typeof obj.genre !== 'string')
        return false;
    if (typeof obj.difficulty !== 'number' || obj.difficulty < 1 || obj.difficulty > 5)
        return false;
    if (typeof obj.attribution !== 'string')
        return false;
    if (typeof obj.tempo !== 'number' || obj.tempo < 30 || obj.tempo > 240)
        return false;
    if (typeof obj.key !== 'string')
        return false;
    if (!Array.isArray(obj.sections) || obj.sections.length === 0)
        return false;
    for (const section of obj.sections) {
        if (typeof section !== 'object' || section === null || section === undefined)
            return false;
        const s = section;
        if (typeof s.label !== 'string' || s.label.length === 0)
            return false;
        if (typeof s.melodyABC !== 'string' || s.melodyABC.length === 0)
            return false;
    }
    return true;
}
// ============================================================================
// Prompt Builder
// ============================================================================
function difficultyGuide(d) {
    switch (d) {
        case 1: return 'whole/half notes only, C major, very slow';
        case 2: return 'quarter notes, C/G major, simple rhythms';
        case 3: return 'eighth notes OK, any major key, moderate tempo';
        case 4: return 'sixteenth notes, minor keys OK, faster tempo';
        case 5: return 'complex rhythms, any key, performance tempo';
        default: return 'moderate difficulty';
    }
}
function buildSongPrompt(params) {
    const artistHint = params.artist ? ` by ${params.artist}` : '';
    return `Generate a simplified beginner piano arrangement of "${params.title}"${artistHint}.

Return JSON with this exact structure:
{
  "title": "Song Title",
  "artist": "Original Artist",
  "genre": "pop|classical|folk|film|game|holiday",
  "difficulty": ${params.difficulty},
  "attribution": "AI arrangement — simplified for learning",
  "tempo": <BPM 60-160>,
  "key": "<key signature letter, e.g. C, G, F, Am>",
  "sections": [
    {
      "label": "Verse 1",
      "melodyABC": "X:1\\nT:Verse 1\\nM:4/4\\nL:1/8\\nK:C\\n<ABC notes here>|",
      "accompanimentABC": "X:1\\nT:Verse 1 LH\\nM:4/4\\nL:1/4\\nK:C\\n<optional LH notes>|"
    }
  ]
}

RULES:
- Each section's melodyABC must be complete, valid ABC notation with X:, T:, M:, L:, K: headers
- Keep MIDI range 48-84 (C3 to C6)
- Melody should be right hand, mostly stepwise motion
- Accompaniment (optional) should be left hand, simple chords or bass notes
- Split into 2-4 sections (verse, chorus, bridge, etc.)
- Each section should be 4-16 bars
- Difficulty ${params.difficulty}/5: ${difficultyGuide(params.difficulty)}
- Use common time signatures (4/4 or 3/4)
- For well-known songs, preserve the recognizable melody
- Attribution must always say "AI arrangement"`;
}
// ============================================================================
// Rate Limiting
// ============================================================================
async function checkAndIncrementRateLimit(uid) {
    const today = new Date().toISOString().split('T')[0];
    const db = admin.firestore();
    const rateLimitRef = db
        .collection('rateLimit')
        .doc(uid)
        .collection('songs')
        .doc(today);
    return db.runTransaction(async (transaction) => {
        const doc = await transaction.get(rateLimitRef);
        const count = doc.exists ? (doc.data()?.count ?? 0) : 0;
        if (count >= MAX_REQUESTS_PER_DAY) {
            return false;
        }
        transaction.set(rateLimitRef, { count: count + 1, updatedAt: Date.now() }, { merge: true });
        return true;
    });
}
// ============================================================================
// Cloud Function
// ============================================================================
exports.generateSong = (0, https_1.onCall)({ region: 'us-central1', secrets: ['GEMINI_API_KEY'] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated to generate songs');
    }
    const uid = request.auth.uid;
    const data = request.data;
    // Rate limit check
    const withinLimit = await checkAndIncrementRateLimit(uid);
    if (!withinLimit) {
        throw new https_1.HttpsError('resource-exhausted', 'Daily song generation limit reached (5/day)');
    }
    try {
        const apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
            throw new https_1.HttpsError('failed-precondition', 'Gemini API key not configured');
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.8,
            },
        });
        const prompt = buildSongPrompt(data);
        // First attempt
        const aiStart = Date.now();
        let validatedSong = await attemptGeneration(model, prompt);
        (0, posthogClient_1.captureAIGeneration)({
            distinctId: uid,
            model: 'gemini-2.5-flash',
            provider: 'google',
            latencySeconds: (Date.now() - aiStart) / 1000,
            isError: validatedSong === null,
        });
        // Retry once with stronger guidance on failure
        if (!validatedSong) {
            const retryPrompt = prompt +
                '\n\nPrevious attempt failed. Ensure each section has valid ABC notation with all required headers (X:, T:, M:, L:, K:).';
            const retryStart = Date.now();
            validatedSong = await attemptGeneration(model, retryPrompt);
            (0, posthogClient_1.captureAIGeneration)({
                distinctId: uid,
                model: 'gemini-2.5-flash',
                provider: 'google',
                latencySeconds: (Date.now() - retryStart) / 1000,
                isError: validatedSong === null,
            });
        }
        if (!validatedSong) {
            throw new https_1.HttpsError('internal', 'Both song generation attempts failed validation');
        }
        firebase_functions_1.logger.info('Song generated', {
            userId: uid,
            title: data.title,
            difficulty: data.difficulty,
        });
        return validatedSong;
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        firebase_functions_1.logger.error('Song generation error', {
            userId: uid,
            error: String(error),
        });
        throw new https_1.HttpsError('internal', 'Failed to generate song');
    }
});
async function attemptGeneration(model, prompt) {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    if (validateGeneratedSong(parsed)) {
        return parsed;
    }
    return null;
}
//# sourceMappingURL=generateSong.js.map
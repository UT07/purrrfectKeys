"use strict";
/**
 * Cloud Function: Generate AI Exercise
 * Generates piano exercises using Gemini 2.0 Flash, moving the API key server-side.
 * Rate-limited to 30 requests per user per day.
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
exports.generateExercise = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
const posthogClient_1 = require("./posthogClient");
// ============================================================================
// Constants
// ============================================================================
const MIDI_MIN = 36;
const MIDI_MAX = 96;
const MAX_NOTES = 64;
const MAX_INTERVAL_FAST_TEMPO = 24;
const MAX_INTERVAL_ANY_TEMPO = 36;
const FAST_TEMPO_THRESHOLD = 120;
const TEMPO_MIN = 30;
const TEMPO_MAX = 200;
const VALID_DURATIONS = new Set([0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]);
const MAX_EXERCISE_BEATS = 128;
const MAX_REQUESTS_PER_DAY = 30;
// ============================================================================
// Validation
// ============================================================================
function validateAIExercise(exercise, allowedMidi) {
    if (exercise == null || typeof exercise !== 'object') {
        return false;
    }
    const ex = exercise;
    if (!Array.isArray(ex.notes) || ex.notes.length === 0) {
        return false;
    }
    if (ex.notes.length > MAX_NOTES) {
        return false;
    }
    if (ex.settings == null || typeof ex.settings !== 'object') {
        return false;
    }
    const settings = ex.settings;
    if (typeof settings.tempo !== 'number' ||
        settings.tempo < TEMPO_MIN ||
        settings.tempo > TEMPO_MAX) {
        return false;
    }
    if (!Array.isArray(settings.timeSignature) || settings.timeSignature.length !== 2) {
        return false;
    }
    const [beats, beatValue] = settings.timeSignature;
    if (typeof beats !== 'number' || typeof beatValue !== 'number' || beats <= 0 || beatValue <= 0) {
        return false;
    }
    const tempo = settings.tempo;
    const notes = ex.notes;
    for (let i = 0; i < notes.length; i++) {
        const n = notes[i];
        if (typeof n.note !== 'number' || n.note < MIDI_MIN || n.note > MIDI_MAX) {
            return false;
        }
        if (allowedMidi && allowedMidi.length > 0 && !allowedMidi.includes(n.note)) {
            return false;
        }
        if (typeof n.startBeat !== 'number' || n.startBeat < 0) {
            return false;
        }
        if (typeof n.durationBeats !== 'number' || n.durationBeats <= 0) {
            return false;
        }
        if (!VALID_DURATIONS.has(n.durationBeats)) {
            const closest = Array.from(VALID_DURATIONS).find((d) => Math.abs(d - n.durationBeats) < 0.05);
            if (!closest)
                return false;
        }
        if (i > 0) {
            const prevNote = notes[i - 1].note;
            const interval = Math.abs(n.note - prevNote);
            if (interval > MAX_INTERVAL_ANY_TEMPO) {
                return false;
            }
            if (tempo > FAST_TEMPO_THRESHOLD && interval > MAX_INTERVAL_FAST_TEMPO) {
                return false;
            }
        }
    }
    const lastNote = notes[notes.length - 1];
    const totalBeats = lastNote.startBeat + lastNote.durationBeats;
    if (totalBeats > MAX_EXERCISE_BEATS || totalBeats <= 0) {
        return false;
    }
    return true;
}
// ============================================================================
// Prompt Builder
// ============================================================================
function calculateTempo(params) {
    const midTempo = (params.tempoRange.min + params.tempoRange.max) / 2;
    const difficultyScale = 0.6 + (params.difficulty / 5) * 0.4;
    return Math.round(midTempo * difficultyScale);
}
function keySignatureForDifficulty(difficulty) {
    switch (difficulty) {
        case 1:
        case 2:
            return 'C major';
        case 3:
            return 'G major';
        case 4:
            return 'F major';
        default:
            return 'mixed';
    }
}
function buildPrompt(params) {
    const hints = params.generationHints;
    const tempo = calculateTempo(params);
    const keySignature = hints?.keySignature ?? params.keySignature ?? keySignatureForDifficulty(params.difficulty);
    const difficulty = hints?.minDifficulty ?? params.difficulty;
    const hand = hints?.hand ?? 'right';
    const totalBeats = Math.ceil(params.noteCount * 1.5);
    let prompt = `Generate a piano exercise as JSON for a student with this profile:
- Weak notes (MIDI): ${JSON.stringify(params.weakNotes)} (focus extra repetitions on these)
- Timing accuracy: ${Math.round(params.skills.timingAccuracy * 100)}%
- Comfortable tempo: ${params.tempoRange.min}-${params.tempoRange.max} BPM
- Difficulty: ${difficulty}/5
- Target note count: ${params.noteCount}`;
    if (hints) {
        prompt += `\n- SKILL OBJECTIVE: ${hints.promptHint}`;
        if (hints.targetMidi && hints.targetMidi.length > 0) {
            prompt += `\n- Use ONLY these MIDI notes: ${JSON.stringify(hints.targetMidi)}`;
        }
        prompt += `\n- Hand: ${hand}`;
        if (hints.exerciseTypes && hints.exerciseTypes.length > 0) {
            prompt += `\n- Exercise style: ${hints.exerciseTypes.join(' or ')}`;
        }
    }
    if (params.skillContext) {
        prompt += `\n- Skill focus: ${params.skillContext}`;
    }
    if (params.exerciseType) {
        const typeDescriptions = {
            warmup: 'This is a warm-up exercise. Keep it simple, focus on familiar patterns and weak areas.',
            lesson: 'This is a lesson exercise. Introduce the target skill progressively with clear patterns.',
            challenge: 'This is a challenge exercise. Push slightly beyond their comfort zone with faster tempo or wider intervals.',
        };
        prompt += `\n- Exercise purpose: ${typeDescriptions[params.exerciseType]}`;
    }
    prompt += `

Requirements:
- Tempo: ${tempo} BPM (middle of their range, scaled by difficulty)
- Time signature: 4/4
- Key signature: ${keySignature}
- All MIDI notes between 48-84 (C3 to C6)
- All notes should use hand: "${hand}"
- Include at least 2 repetitions of each weak note
- Exercise should span approximately ${totalBeats} beats (${Math.ceil(totalBeats / 4)} measures of 4/4)

Musical quality rules (IMPORTANT):
- Structure in 4-bar phrases with question-and-answer patterns
- End each phrase on a stable scale degree (tonic or dominant)
- End the exercise on the tonic note of the key
- Use rhythmic variety: mix quarter notes (1 beat), half notes (2 beats), eighth notes (0.5 beats), and dotted quarters (1.5 beats). Do NOT use only quarter notes.
- Use mostly stepwise motion (seconds) with occasional thirds and one or two wider skips per phrase
- durationBeats must be a standard musical value: 0.25, 0.5, 0.75, 1, 1.5, 2, 3, or 4
- startBeat values must not cause overlapping notes for the same hand
- First note should start on beat 0

Return ONLY valid JSON (no markdown, no explanation):
{ "notes": [{"note": <midi>, "startBeat": <number>, "durationBeats": <number>, "hand": "${hand}"}], "settings": {"tempo": ${tempo}, "timeSignature": [4,4], "keySignature": "${keySignature}"}, "metadata": {"title": "<descriptive title>", "difficulty": ${difficulty}, "skills": ["<relevant-skill>"]}, "scoring": {"passingScore": ${difficulty <= 2 ? 60 : difficulty <= 4 ? 70 : 80}, "timingToleranceMs": ${difficulty <= 2 ? 75 : difficulty <= 4 ? 50 : 30}, "starThresholds": [70, 85, 95]} }`;
    return prompt;
}
// ============================================================================
// Rate Limiting
// ============================================================================
/**
 * Atomically check and increment rate limit in a single transaction.
 * Returns true if within limit (and increments), false if limit reached.
 */
async function checkAndIncrementRateLimit(uid, subcollection = 'exercises') {
    const today = new Date().toISOString().split('T')[0];
    const db = admin.firestore();
    const rateLimitRef = db
        .collection('rateLimit')
        .doc(uid)
        .collection(subcollection)
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
exports.generateExercise = (0, https_1.onCall)({ region: 'us-central1', secrets: ['GEMINI_API_KEY'] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated to generate exercises');
    }
    const uid = request.auth.uid;
    const data = request.data;
    // Atomic rate limit check + increment
    const withinLimit = await checkAndIncrementRateLimit(uid, 'exercises');
    if (!withinLimit) {
        throw new https_1.HttpsError('resource-exhausted', 'Daily exercise generation limit reached (30/day)');
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
                temperature: 0.7,
            },
        });
        const prompt = buildPrompt(data);
        const allowedMidi = data.generationHints?.targetMidi;
        // First attempt
        const aiStart = Date.now();
        let exercise = await attemptGeneration(model, prompt, allowedMidi);
        (0, posthogClient_1.captureAIGeneration)({
            distinctId: uid,
            model: 'gemini-2.5-flash',
            provider: 'google',
            latencySeconds: (Date.now() - aiStart) / 1000,
            isError: exercise === null,
        });
        // Retry once with stronger guidance on failure
        if (!exercise) {
            const midiHint = allowedMidi?.length
                ? ` Use ONLY these MIDI notes: ${JSON.stringify(allowedMidi)}.`
                : '';
            const retryPrompt = prompt +
                `\n\nPrevious attempt was invalid. Ensure all MIDI notes are 36-96 and intervals are reasonable.${midiHint}`;
            const retryStart = Date.now();
            exercise = await attemptGeneration(model, retryPrompt, allowedMidi);
            (0, posthogClient_1.captureAIGeneration)({
                distinctId: uid,
                model: 'gemini-2.5-flash',
                provider: 'google',
                latencySeconds: (Date.now() - retryStart) / 1000,
                isError: exercise === null,
            });
        }
        if (!exercise) {
            throw new https_1.HttpsError('internal', 'Both generation attempts failed validation');
        }
        firebase_functions_1.logger.info('Exercise generated', {
            userId: uid,
            difficulty: data.difficulty,
            noteCount: data.noteCount,
        });
        return exercise;
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        firebase_functions_1.logger.error('Exercise generation error', {
            userId: uid,
            error: String(error),
        });
        throw new https_1.HttpsError('internal', 'Failed to generate exercise');
    }
});
async function attemptGeneration(model, prompt, allowedMidi) {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    if (validateAIExercise(parsed, allowedMidi)) {
        return parsed;
    }
    return null;
}
//# sourceMappingURL=generateExercise.js.map
/**
 * Cloud Function: Daily Sight-Reading Challenge
 * Generates a fresh sight-reading exercise each day using Gemini 2.0 Flash.
 * Cached per day — all users get the same exercise for a given date.
 * Rate-limited to 5 requests per user per day.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Constants
// ============================================================================

const MIDI_MIN = 48; // C3
const MIDI_MAX = 84; // C6
const MAX_NOTES = 32;
const VALID_DURATIONS = new Set([0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]);
const MAX_REQUESTS_PER_DAY = 5;

// Difficulty rotates through the week (Mon=1 → Sun=3, cycling 1-3)
const DAY_DIFFICULTY: Record<number, number> = {
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

function validateExercise(exercise: unknown): exercise is SightReadingExercise {
  if (exercise == null || typeof exercise !== 'object') return false;
  const ex = exercise as Record<string, unknown>;

  if (!Array.isArray(ex.notes) || ex.notes.length === 0 || ex.notes.length > MAX_NOTES) return false;
  if (ex.settings == null || typeof ex.settings !== 'object') return false;

  const settings = ex.settings as Record<string, unknown>;
  if (typeof settings.tempo !== 'number' || settings.tempo < 40 || settings.tempo > 160) return false;

  const notes = ex.notes as Array<Record<string, unknown>>;
  for (const n of notes) {
    if (typeof n.note !== 'number' || n.note < MIDI_MIN || n.note > MIDI_MAX) return false;
    if (typeof n.startBeat !== 'number' || n.startBeat < 0) return false;
    if (typeof n.durationBeats !== 'number' || !VALID_DURATIONS.has(n.durationBeats as number)) return false;
  }

  return true;
}

// ============================================================================
// Prompt Builder
// ============================================================================

function buildSightReadingPrompt(difficulty: number, keySignature: string, dateStr: string): string {
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

export const dailySightReading = onCall(
  { region: 'us-central1', secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // e.g. "2026-03-11"

    // Check per-day cache first
    const cacheRef = db.collection('dailySightReading').doc(dateStr);
    const cached = await cacheRef.get();
    if (cached.exists) {
      logger.info('Serving cached sight-reading exercise', { dateStr });
      return cached.data();
    }

    // Rate limit per user — use transaction to prevent race condition
    const rateLimitRef = db.collection('rateLimit').doc(uid).collection('sightReading').doc(dateStr);
    const withinLimit = await db.runTransaction(async (transaction) => {
      const rateLimitDoc = await transaction.get(rateLimitRef);
      const count = rateLimitDoc.exists ? (rateLimitDoc.data()?.count ?? 0) : 0;
      if (count >= MAX_REQUESTS_PER_DAY) return false;
      transaction.set(rateLimitRef, { count: count + 1, updatedAt: Date.now() }, { merge: true });
      return true;
    });
    if (!withinLimit) {
      throw new HttpsError('resource-exhausted', 'Daily sight-reading limit reached');
    }

    // Generate
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'Gemini API key not configured');
    }

    const difficulty = DAY_DIFFICULTY[today.getDay()] ?? 2;
    const weekOfYear = Math.ceil(
      ((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7,
    );
    const keySignature = WEEKLY_KEYS[weekOfYear % WEEKLY_KEYS.length];

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8, // Slightly higher for variety
      },
    });

    const prompt = buildSightReadingPrompt(difficulty, keySignature, dateStr);

    try {
      let exercise: SightReadingExercise | null = null;

      // First attempt
      const result = await model.generateContent(prompt);
      try {
        const parsed = JSON.parse(result.response.text());
        if (validateExercise(parsed)) {
          exercise = parsed;
        }
      } catch {
        logger.warn('Gemini returned invalid JSON for sight-reading (attempt 1)');
      }

      // Retry once
      if (!exercise) {
        const retryPrompt = prompt + '\n\nPrevious attempt was invalid. Ensure all MIDI notes are 48-84 and durations are standard values.';
        const retryResult = await model.generateContent(retryPrompt);
        try {
          const retryParsed = JSON.parse(retryResult.response.text());
          if (validateExercise(retryParsed)) {
            exercise = retryParsed;
          }
        } catch {
          logger.warn('Gemini returned invalid JSON for sight-reading (attempt 2)');
        }
      }

      if (!exercise) {
        throw new HttpsError('internal', 'Sight-reading generation failed validation');
      }

      // Cache for the whole day
      await cacheRef.set({
        ...exercise,
        generatedAt: Date.now(),
        dateStr,
      });

      logger.info('Daily sight-reading generated', { dateStr, difficulty, keySignature });
      return exercise;
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('Sight-reading generation error', { uid, error: String(error) });
      throw new HttpsError('internal', 'Failed to generate sight-reading exercise');
    }
  },
);

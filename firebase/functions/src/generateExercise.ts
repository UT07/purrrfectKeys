/**
 * Cloud Function: Generate AI Exercise
 * Generates piano exercises using Gemini 2.0 Flash, moving the API key server-side.
 * Rate-limited to 30 requests per user per day.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { captureAIGeneration } from './posthogClient';

// ============================================================================
// Type Definitions (mirrored from client geminiExerciseService.ts)
// ============================================================================

interface GenerationHints {
  keySignature?: string;
  targetMidi?: number[];
  hand?: 'left' | 'right' | 'both';
  exerciseTypes?: ('scale' | 'melody' | 'chord' | 'rhythm' | 'arpeggio')[];
  minDifficulty?: number;
  maxDifficulty?: number;
  promptHint: string;
}

interface GenerationParams {
  weakNotes: number[];
  tempoRange: { min: number; max: number };
  difficulty: number;
  noteCount: number;
  skills: {
    timingAccuracy: number;
    pitchAccuracy: number;
    sightReadSpeed: number;
    chordRecognition: number;
  };
  targetSkillId?: string;
  skillContext?: string;
  exerciseType?: 'warmup' | 'lesson' | 'challenge';
  keySignature?: string;
  generationHints?: GenerationHints;
}

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

function validateAIExercise(exercise: unknown, allowedMidi?: number[]): exercise is AIExercise {
  if (exercise == null || typeof exercise !== 'object') {
    return false;
  }

  const ex = exercise as Record<string, unknown>;

  const MIN_NOTES = 4;
  if (!Array.isArray(ex.notes) || ex.notes.length < MIN_NOTES) {
    return false;
  }

  if (ex.notes.length > MAX_NOTES) {
    return false;
  }

  if (ex.settings == null || typeof ex.settings !== 'object') {
    return false;
  }

  const settings = ex.settings as Record<string, unknown>;

  if (
    typeof settings.tempo !== 'number' ||
    settings.tempo < TEMPO_MIN ||
    settings.tempo > TEMPO_MAX
  ) {
    return false;
  }

  if (!Array.isArray(settings.timeSignature) || settings.timeSignature.length !== 2) {
    return false;
  }
  const [beats, beatValue] = settings.timeSignature as unknown[];
  if (typeof beats !== 'number' || typeof beatValue !== 'number' || beats <= 0 || beatValue <= 0) {
    return false;
  }

  const tempo = settings.tempo;
  const notes = ex.notes as Array<Record<string, unknown>>;

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];

    if (typeof n.note !== 'number' || n.note < MIDI_MIN || n.note > MIDI_MAX) {
      return false;
    }

    if (allowedMidi && allowedMidi.length > 0 && !allowedMidi.includes(n.note as number)) {
      return false;
    }

    if (typeof n.startBeat !== 'number' || n.startBeat < 0) {
      return false;
    }

    if (typeof n.durationBeats !== 'number' || n.durationBeats <= 0) {
      return false;
    }

    if (!VALID_DURATIONS.has(n.durationBeats as number)) {
      const closest = Array.from(VALID_DURATIONS).find(
        (d) => Math.abs(d - (n.durationBeats as number)) < 0.05,
      );
      if (!closest) return false;
      // Snap to the nearest valid duration to avoid subtle timing mismatches
      n.durationBeats = closest;
    }

    if (i > 0) {
      const prevNote = notes[i - 1].note as number;
      const interval = Math.abs(n.note as number - prevNote);

      if (interval > MAX_INTERVAL_ANY_TEMPO) {
        return false;
      }

      if (tempo > FAST_TEMPO_THRESHOLD && interval > MAX_INTERVAL_FAST_TEMPO) {
        return false;
      }
    }
  }

  const lastNote = notes[notes.length - 1];
  const totalBeats = (lastNote.startBeat as number) + (lastNote.durationBeats as number);
  if (totalBeats > MAX_EXERCISE_BEATS || totalBeats <= 0) {
    return false;
  }

  return true;
}

// ============================================================================
// Prompt Builder
// ============================================================================

function calculateTempo(params: GenerationParams): number {
  const midTempo = (params.tempoRange.min + params.tempoRange.max) / 2;
  const difficultyScale = 0.6 + (params.difficulty / 5) * 0.4;
  return Math.round(midTempo * difficultyScale);
}

function keySignatureForDifficulty(difficulty: number): string {
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

function buildPrompt(params: GenerationParams): string {
  const hints = params.generationHints;
  const tempo = calculateTempo(params);
  const keySignature =
    hints?.keySignature ?? params.keySignature ?? keySignatureForDifficulty(params.difficulty);
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
    const typeDescriptions: Record<string, string> = {
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
async function checkAndIncrementRateLimit(uid: string, subcollection: string = 'exercises'): Promise<boolean> {
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
// Input Sanitization
// ============================================================================

const VALID_HANDS = new Set(['left', 'right', 'both']);
const VALID_KEY_SIGNATURES = new Set([
  'C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab', 'Db',
  'Am', 'Em', 'Bm', 'F#m', 'C#m', 'Dm', 'Gm', 'Cm', 'Fm',
]);
const VALID_EXERCISE_TYPES = new Set(['scale', 'melody', 'chord', 'rhythm', 'arpeggio']);
const VALID_EXERCISE_PURPOSES = new Set(['warmup', 'lesson', 'challenge']);

/** Strip control chars and truncate to prevent prompt injection */
function sanitizeString(input: unknown, maxLen = 200): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\n\r\t]/g, ' ').replace(/[^\x20-\x7E]/g, '').slice(0, maxLen);
}

function validateAndSanitizeParams(raw: unknown): GenerationParams {
  if (raw == null || typeof raw !== 'object') {
    throw new HttpsError('invalid-argument', 'Missing request data');
  }
  const data = raw as Record<string, unknown>;

  const difficulty = typeof data.difficulty === 'number'
    ? Math.max(1, Math.min(5, Math.round(data.difficulty))) : 3;
  const noteCount = typeof data.noteCount === 'number'
    ? Math.max(4, Math.min(64, Math.round(data.noteCount))) : 16;

  const rawTempo = data.tempoRange as Record<string, unknown> | undefined;
  const tempoRange = {
    min: typeof rawTempo?.min === 'number' ? Math.max(40, Math.min(200, rawTempo.min)) : 60,
    max: typeof rawTempo?.max === 'number' ? Math.max(40, Math.min(200, rawTempo.max)) : 120,
  };

  const rawSkills = data.skills as Record<string, unknown> | undefined;
  const clampSkill = (v: unknown) => typeof v === 'number' ? Math.max(0, Math.min(1, v)) : 0.5;
  const skills = {
    timingAccuracy: clampSkill(rawSkills?.timingAccuracy),
    pitchAccuracy: clampSkill(rawSkills?.pitchAccuracy),
    sightReadSpeed: clampSkill(rawSkills?.sightReadSpeed),
    chordRecognition: clampSkill(rawSkills?.chordRecognition),
  };

  const weakNotes = Array.isArray(data.weakNotes)
    ? (data.weakNotes as unknown[]).filter((n): n is number => typeof n === 'number' && n >= 21 && n <= 108).slice(0, 20)
    : [];

  const rawHints = data.generationHints as Record<string, unknown> | undefined;
  let generationHints: GenerationHints | undefined;
  if (rawHints) {
    const hand = typeof rawHints.hand === 'string' && VALID_HANDS.has(rawHints.hand)
      ? rawHints.hand as 'left' | 'right' | 'both' : undefined;
    const exerciseTypes = Array.isArray(rawHints.exerciseTypes)
      ? (rawHints.exerciseTypes as unknown[]).filter((t): t is string => typeof t === 'string' && VALID_EXERCISE_TYPES.has(t)) as GenerationHints['exerciseTypes']
      : undefined;
    const keySignature = typeof rawHints.keySignature === 'string' && VALID_KEY_SIGNATURES.has(rawHints.keySignature)
      ? rawHints.keySignature : undefined;
    const targetMidi = Array.isArray(rawHints.targetMidi)
      ? (rawHints.targetMidi as unknown[]).filter((n): n is number => typeof n === 'number' && n >= 21 && n <= 108).slice(0, 30)
      : undefined;
    generationHints = {
      promptHint: sanitizeString(rawHints.promptHint),
      hand,
      exerciseTypes,
      keySignature,
      targetMidi,
      minDifficulty: typeof rawHints.minDifficulty === 'number' ? Math.max(1, Math.min(5, Math.round(rawHints.minDifficulty))) : undefined,
      maxDifficulty: typeof rawHints.maxDifficulty === 'number' ? Math.max(1, Math.min(5, Math.round(rawHints.maxDifficulty))) : undefined,
    };
  }

  const exerciseType = typeof data.exerciseType === 'string' && VALID_EXERCISE_PURPOSES.has(data.exerciseType)
    ? data.exerciseType as 'warmup' | 'lesson' | 'challenge' : undefined;
  const keySignature = typeof data.keySignature === 'string' && VALID_KEY_SIGNATURES.has(data.keySignature)
    ? data.keySignature : undefined;

  return {
    weakNotes,
    tempoRange,
    difficulty,
    noteCount,
    skills,
    targetSkillId: typeof data.targetSkillId === 'string' ? sanitizeString(data.targetSkillId, 100) : undefined,
    skillContext: sanitizeString(data.skillContext),
    exerciseType,
    keySignature,
    generationHints,
  };
}

// ============================================================================
// Cloud Function
// ============================================================================

export const generateExercise = onCall(
  { region: 'us-central1', secrets: ['GEMINI_API_KEY'] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Must be authenticated to generate exercises',
      );
    }

    const uid = request.auth.uid;
    const data = validateAndSanitizeParams(request.data);

    // Atomic rate limit check + increment
    const withinLimit = await checkAndIncrementRateLimit(uid, 'exercises');
    if (!withinLimit) {
      throw new HttpsError(
        'resource-exhausted',
        'Daily exercise generation limit reached (30/day)',
      );
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (!apiKey) {
        throw new HttpsError(
          'failed-precondition',
          'Gemini API key not configured',
        );
      }

      const genAI = new GoogleGenerativeAI(apiKey);
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
      captureAIGeneration({
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
        const retryPrompt =
          prompt +
          `\n\nPrevious attempt was invalid. Ensure all MIDI notes are 36-96 and intervals are reasonable.${midiHint}`;
        const retryStart = Date.now();
        exercise = await attemptGeneration(model, retryPrompt, allowedMidi);
        captureAIGeneration({
          distinctId: uid,
          model: 'gemini-2.5-flash',
          provider: 'google',
          latencySeconds: (Date.now() - retryStart) / 1000,
          isError: exercise === null,
        });
      }

      if (!exercise) {
        throw new HttpsError(
          'internal',
          'Both generation attempts failed validation',
        );
      }

      logger.info('Exercise generated', {
        userId: uid,
        difficulty: data.difficulty,
        noteCount: data.noteCount,
      });

      return exercise;
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('Exercise generation error', {
        userId: uid,
        error: String(error),
      });
      throw new HttpsError(
        'internal',
        'Failed to generate exercise',
      );
    }
  },
);

// ============================================================================
// Internal Helpers
// ============================================================================

interface GenerativeModel {
  generateContent(prompt: string): Promise<{
    response: { text(): string };
  }>;
}

async function attemptGeneration(
  model: GenerativeModel,
  prompt: string,
  allowedMidi?: number[],
): Promise<AIExercise | null> {
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    logger.warn('Gemini returned invalid JSON for exercise generation');
    return null;
  }

  if (validateAIExercise(parsed, allowedMidi)) {
    return parsed;
  }

  return null;
}

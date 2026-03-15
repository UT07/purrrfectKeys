/**
 * Exercise Validation Functions
 *
 * Validates generated exercise JSON for correctness, playability, and consistency.
 * Used by both batch-generate-exercises.ts and validate-exercises.ts.
 *
 * Usage as standalone:
 *   npx tsx scripts/validate-exercise.ts content/exercises/lesson-07/exercise-01-*.json
 *   npx tsx scripts/validate-exercise.ts --all
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// Types (standalone — no imports from src/ to avoid React/Expo deps)
// ============================================================================

export interface NoteEvent {
  note: number;
  startBeat: number;
  durationBeats: number;
  hand?: 'left' | 'right';
  finger?: 1 | 2 | 3 | 4 | 5;
  optional?: boolean;
}

export interface Exercise {
  id: string;
  version: number;
  metadata: {
    title: string;
    description: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    estimatedMinutes: number;
    skills: string[];
    prerequisites: string[];
  };
  settings: {
    tempo: number;
    timeSignature: [number, number];
    keySignature: string;
    countIn: number;
    metronomeEnabled: boolean;
    loopEnabled: boolean;
  };
  notes: NoteEvent[];
  scoring: {
    timingToleranceMs: number;
    timingGracePeriodMs: number;
    velocitySensitive: boolean;
    passingScore: number;
    starThresholds: [number, number, number];
  };
  hints: {
    beforeStart: string;
    commonMistakes: Array<{
      pattern: string;
      advice: string;
      triggerCondition?: {
        type: 'timing' | 'pitch' | 'sequence';
        threshold: number;
      };
    }>;
    successMessage: string;
  };
  display: {
    showFingerNumbers: boolean;
    showNoteNames: boolean;
    highlightHands: boolean;
    showPianoRoll: boolean;
    showStaffNotation: boolean;
  };
}

export interface ValidationResult {
  exerciseId: string;
  filePath?: string;
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  field: string;
  message: string;
}

// ============================================================================
// Constants
// ============================================================================

const PIANO_MIN_NOTE = 21;  // A0
const PIANO_MAX_NOTE = 108; // C8
const PRACTICAL_MIN_NOTE = 36; // C2 — below this is unusual for exercises
const PRACTICAL_MAX_NOTE = 96; // C7 — above this is unusual for exercises
const VALID_DURATIONS = new Set([0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]);
const DURATION_TOLERANCE = 0.05; // AI sometimes returns 0.49 instead of 0.5
const MAX_EXERCISE_BEATS = 128;
const MIN_NOTES = 4;
const MAX_NOTES = 64;
const MAX_INTERVAL_ANY_TEMPO = 36;
const MAX_INTERVAL_FAST_TEMPO = 24;
const FAST_TEMPO_THRESHOLD = 120;
const MAX_CHORD_SPAN_EASY = 12; // Max semitones for a single-hand chord at difficulty <= 3

/** Valid key signature names */
const VALID_KEY_SIGNATURES = new Set([
  // Major keys
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Gb',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Cb',
  // Minor keys
  'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm',
  // Enharmonic equivalents / alternate spellings
  'C#', 'A#m',
]);

/** Valid time signature denominators (must be a power of 2) */
const VALID_BEAT_VALUES = new Set([2, 4, 8, 16]);

/** Reasonable BPM ranges by difficulty level */
const TEMPO_RANGES: Record<number, { min: number; max: number }> = {
  1: { min: 40, max: 80 },
  2: { min: 50, max: 100 },
  3: { min: 60, max: 120 },
  4: { min: 70, max: 150 },
  5: { min: 80, max: 200 },
};

// ============================================================================
// Core Validation
// ============================================================================

/**
 * Validate a single exercise, returning all errors and warnings.
 */
export function validateExercise(exercise: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let exerciseId = '<unknown>';

  if (exercise == null || typeof exercise !== 'object') {
    errors.push({ field: 'root', message: 'Exercise must be a non-null object' });
    return { exerciseId, valid: false, errors, warnings };
  }

  const ex = exercise as Record<string, unknown>;
  exerciseId = typeof ex.id === 'string' ? ex.id : '<unknown>';

  // --- Required top-level fields ---
  validateRequiredFields(ex, errors);

  // --- ID format ---
  if (typeof ex.id === 'string') {
    if (!ex.id.match(/^lesson-\d{2}-(ex-\d{2}|test)$/)) {
      errors.push({
        field: 'id',
        message: `ID format invalid. Expected lesson-XX-ex-XX or lesson-XX-test, got "${ex.id}"`,
      });
    }
  }

  // --- Version ---
  if (typeof ex.version !== 'number' || ex.version < 1) {
    errors.push({ field: 'version', message: 'Version must be a positive integer' });
  }

  // --- Metadata ---
  if (ex.metadata && typeof ex.metadata === 'object') {
    validateMetadata(ex.metadata as Record<string, unknown>, errors, warnings);
  }

  // --- Settings ---
  if (ex.settings && typeof ex.settings === 'object') {
    const settings = ex.settings as Record<string, unknown>;
    validateSettings(settings, errors, warnings, ex.metadata as Record<string, unknown> | undefined);
  }

  // --- Notes ---
  const difficulty = getDifficulty(ex);
  if (Array.isArray(ex.notes)) {
    validateNotes(
      ex.notes as Array<Record<string, unknown>>,
      (ex.settings as Record<string, unknown> | undefined)?.tempo as number | undefined,
      difficulty,
      errors,
      warnings,
    );
  }

  // --- Scoring ---
  if (ex.scoring && typeof ex.scoring === 'object') {
    validateScoring(ex.scoring as Record<string, unknown>, errors, warnings);
  }

  // --- Hints ---
  if (ex.hints && typeof ex.hints === 'object') {
    validateHints(ex.hints as Record<string, unknown>, errors, warnings);
  }

  // --- Display ---
  if (ex.display && typeof ex.display === 'object') {
    const display = ex.display as Record<string, unknown>;
    for (const key of ['showFingerNumbers', 'showNoteNames', 'highlightHands', 'showPianoRoll', 'showStaffNotation']) {
      if (key in display && typeof display[key] !== 'boolean') {
        warnings.push({ field: `display.${key}`, message: `Expected boolean, got ${typeof display[key]}` });
      }
    }
  }

  // --- Pedagogical cross-checks ---
  if (ex.metadata && ex.settings && ex.scoring && ex.notes) {
    validatePedagogicalConsistency(
      ex.metadata as Record<string, unknown>,
      ex.settings as Record<string, unknown>,
      ex.scoring as Record<string, unknown>,
      ex.notes as Array<Record<string, unknown>>,
      errors,
      warnings,
    );
  }

  return {
    exerciseId,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Sub-validators
// ============================================================================

function getDifficulty(ex: Record<string, unknown>): number | undefined {
  if (ex.metadata && typeof ex.metadata === 'object') {
    const meta = ex.metadata as Record<string, unknown>;
    if (typeof meta.difficulty === 'number') return meta.difficulty;
  }
  return undefined;
}

function validateRequiredFields(ex: Record<string, unknown>, errors: ValidationIssue[]): void {
  const requiredTopLevel = ['id', 'version', 'metadata', 'settings', 'notes', 'scoring', 'hints', 'display'];
  for (const field of requiredTopLevel) {
    if (!(field in ex) || ex[field] == null) {
      errors.push({ field, message: `Missing required field: ${field}` });
    }
  }

  if (typeof ex.id !== 'string') {
    errors.push({ field: 'id', message: 'id must be a string' });
  }

  if (!Array.isArray(ex.notes)) {
    errors.push({ field: 'notes', message: 'notes must be an array' });
  }
}

function validateMetadata(meta: Record<string, unknown>, errors: ValidationIssue[], warnings: ValidationIssue[]): void {
  if (typeof meta.title !== 'string' || meta.title.length === 0) {
    errors.push({ field: 'metadata.title', message: 'Title is required and must be non-empty' });
  }
  if (typeof meta.description !== 'string' || meta.description.length === 0) {
    errors.push({ field: 'metadata.description', message: 'Description is required and must be non-empty' });
  }
  if (typeof meta.difficulty !== 'number' || meta.difficulty < 1 || meta.difficulty > 5) {
    errors.push({ field: 'metadata.difficulty', message: `Difficulty must be 1-5, got ${meta.difficulty}` });
  }
  if (typeof meta.estimatedMinutes !== 'number' || meta.estimatedMinutes <= 0) {
    errors.push({ field: 'metadata.estimatedMinutes', message: 'estimatedMinutes must be positive' });
  }
  if (!Array.isArray(meta.skills) || meta.skills.length === 0) {
    warnings.push({ field: 'metadata.skills', message: 'skills array is empty or missing' });
  }
  if (!Array.isArray(meta.prerequisites)) {
    warnings.push({ field: 'metadata.prerequisites', message: 'prerequisites should be an array' });
  }
}

function validateSettings(
  settings: Record<string, unknown>,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  metadata?: Record<string, unknown>,
): void {
  // Tempo (30-240 BPM)
  if (typeof settings.tempo !== 'number' || settings.tempo < 30 || settings.tempo > 240) {
    errors.push({ field: 'settings.tempo', message: `Tempo must be 30-240, got ${settings.tempo}` });
  } else if (metadata && typeof metadata.difficulty === 'number') {
    const range = TEMPO_RANGES[metadata.difficulty as number];
    if (range && (settings.tempo < range.min || settings.tempo > range.max)) {
      warnings.push({
        field: 'settings.tempo',
        message: `Tempo ${settings.tempo} seems ${settings.tempo < range.min ? 'slow' : 'fast'} for difficulty ${metadata.difficulty} (expected ${range.min}-${range.max})`,
      });
    }
  }

  // Time signature
  if (!Array.isArray(settings.timeSignature) || settings.timeSignature.length !== 2) {
    errors.push({ field: 'settings.timeSignature', message: 'timeSignature must be [numerator, denominator]' });
  } else {
    const [numerator, denominator] = settings.timeSignature as [unknown, unknown];
    if (typeof numerator !== 'number' || typeof denominator !== 'number') {
      errors.push({ field: 'settings.timeSignature', message: 'Time signature values must be numbers' });
    } else {
      if (numerator < 1 || numerator > 12 || !Number.isInteger(numerator)) {
        errors.push({
          field: 'settings.timeSignature',
          message: `Time signature numerator must be an integer 1-12, got ${numerator}`,
        });
      }
      if (!VALID_BEAT_VALUES.has(denominator)) {
        errors.push({
          field: 'settings.timeSignature',
          message: `Time signature denominator must be a power of 2 (2, 4, 8, 16), got ${denominator}`,
        });
      }
    }
  }

  // Key signature — must be a recognized key name
  if (typeof settings.keySignature !== 'string' || settings.keySignature.length === 0) {
    errors.push({ field: 'settings.keySignature', message: 'keySignature is required' });
  } else if (!VALID_KEY_SIGNATURES.has(settings.keySignature as string)) {
    errors.push({
      field: 'settings.keySignature',
      message: `Invalid key signature "${settings.keySignature}". Valid keys: ${[...VALID_KEY_SIGNATURES].join(', ')}`,
    });
  }

  // Count-in
  if (typeof settings.countIn !== 'number' || settings.countIn < 0 || settings.countIn > 8) {
    warnings.push({ field: 'settings.countIn', message: `countIn should be 0-8, got ${settings.countIn}` });
  }

  // Booleans
  if (typeof settings.metronomeEnabled !== 'boolean') {
    warnings.push({ field: 'settings.metronomeEnabled', message: 'metronomeEnabled should be boolean' });
  }
}

function validateNotes(
  notes: Array<Record<string, unknown>>,
  tempo: number | undefined,
  difficulty: number | undefined,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  if (notes.length < MIN_NOTES) {
    errors.push({ field: 'notes', message: `Exercise must have at least ${MIN_NOTES} notes, got ${notes.length}` });
  }
  if (notes.length > MAX_NOTES) {
    errors.push({ field: 'notes', message: `Exercise has ${notes.length} notes, max is ${MAX_NOTES}` });
  }

  // Track per-hand note ranges for overlap detection
  const handNotes: Record<string, Array<{ start: number; end: number; idx: number; note: number }>> = {
    left: [],
    right: [],
    none: [],
  };

  const lastNotePerHand: Record<string, number> = {};

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    const prefix = `notes[${i}]`;

    // MIDI range
    if (typeof n.note !== 'number') {
      errors.push({ field: prefix, message: 'note must be a number' });
      continue;
    }
    if (n.note < PIANO_MIN_NOTE || n.note > PIANO_MAX_NOTE) {
      errors.push({ field: prefix, message: `MIDI note ${n.note} outside piano range (${PIANO_MIN_NOTE}-${PIANO_MAX_NOTE})` });
    } else if (n.note < PRACTICAL_MIN_NOTE || n.note > PRACTICAL_MAX_NOTE) {
      warnings.push({ field: prefix, message: `MIDI note ${n.note} is in extreme register (practical range: ${PRACTICAL_MIN_NOTE}-${PRACTICAL_MAX_NOTE})` });
    }

    // Start beat
    if (typeof n.startBeat !== 'number' || n.startBeat < 0) {
      errors.push({ field: prefix, message: `startBeat must be >= 0, got ${n.startBeat}` });
    }

    // Duration
    if (typeof n.durationBeats !== 'number' || n.durationBeats <= 0) {
      errors.push({ field: prefix, message: `durationBeats must be positive, got ${n.durationBeats}` });
    } else {
      // Check if duration is a standard musical value (with tolerance for AI rounding)
      const isValid = Array.from(VALID_DURATIONS).some(
        (d) => Math.abs(d - (n.durationBeats as number)) < DURATION_TOLERANCE,
      );
      if (!isValid) {
        warnings.push({
          field: prefix,
          message: `durationBeats ${n.durationBeats} is not a standard musical value (0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4)`,
        });
      }
    }

    // Hand assignment
    const hand = typeof n.hand === 'string' ? n.hand : 'none';
    if (n.hand != null && n.hand !== 'left' && n.hand !== 'right') {
      errors.push({ field: prefix, message: `hand must be "left" or "right", got "${n.hand}"` });
    }

    // Interval check from previous note in the same hand
    const prevNote = lastNotePerHand[hand];
    if (prevNote !== undefined && typeof n.note === 'number') {
      const interval = Math.abs(n.note - prevNote);
      if (interval > MAX_INTERVAL_ANY_TEMPO) {
        errors.push({ field: prefix, message: `Interval of ${interval} semitones exceeds maximum of ${MAX_INTERVAL_ANY_TEMPO}` });
      } else if (tempo && tempo > FAST_TEMPO_THRESHOLD && interval > MAX_INTERVAL_FAST_TEMPO) {
        warnings.push({
          field: prefix,
          message: `Interval of ${interval} semitones is large for tempo ${tempo} BPM (max recommended: ${MAX_INTERVAL_FAST_TEMPO})`,
        });
      }
    }
    if (typeof n.note === 'number') {
      lastNotePerHand[hand] = n.note;
    }

    // Track for overlap and chord span detection
    if (typeof n.startBeat === 'number' && typeof n.durationBeats === 'number') {
      handNotes[hand]?.push({
        start: n.startBeat,
        end: n.startBeat + n.durationBeats,
        idx: i,
        note: n.note as number,
      });
    }
  }

  // Check note overlaps within the same hand (chords are ok — same startBeat)
  for (const [hand, ranges] of Object.entries(handNotes)) {
    if (ranges.length < 2) continue;
    // Sort by start time, then by note
    const sorted = [...ranges].sort((a, b) => a.start - b.start || a.note - b.note);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      // Allow chords (same startBeat)
      if (Math.abs(curr.start - prev.start) < 0.01) continue;
      // Check if previous note extends past current note's start
      if (prev.end > curr.start + 0.01) {
        warnings.push({
          field: `notes[${prev.idx}]->[${curr.idx}]`,
          message: `Overlapping notes in ${hand} hand: note at beat ${prev.start} (dur ${(prev.end - prev.start).toFixed(2)}) overlaps with note at beat ${curr.start}`,
        });
      }
    }
  }

  // Hand stretch: check chord spans (notes on same startBeat in same hand)
  if (difficulty !== undefined && difficulty <= 3) {
    for (const [hand, ranges] of Object.entries(handNotes)) {
      if (hand === 'none' || ranges.length < 2) continue;
      // Group notes by startBeat
      const byBeat = new Map<number, number[]>();
      for (const r of ranges) {
        const beatKey = Math.round(r.start * 100) / 100; // normalize floats
        const existing = byBeat.get(beatKey) || [];
        existing.push(r.note);
        byBeat.set(beatKey, existing);
      }
      for (const [beat, chordNotes] of byBeat) {
        if (chordNotes.length < 2) continue;
        const span = Math.max(...chordNotes) - Math.min(...chordNotes);
        if (span > MAX_CHORD_SPAN_EASY) {
          errors.push({
            field: `notes (${hand} hand, beat ${beat})`,
            message: `Chord span of ${span} semitones exceeds ${MAX_CHORD_SPAN_EASY} (octave) for difficulty ${difficulty}`,
          });
        }
      }
    }
  }

  // Total exercise length
  if (notes.length > 0) {
    const validNotes = notes.filter(
      (n) => typeof n.startBeat === 'number' && typeof n.durationBeats === 'number',
    );
    if (validNotes.length > 0) {
      const lastNote = validNotes.reduce((a, b) =>
        (a.startBeat as number) + (a.durationBeats as number) >
        (b.startBeat as number) + (b.durationBeats as number)
          ? a
          : b,
      );
      const totalBeats = (lastNote.startBeat as number) + (lastNote.durationBeats as number);
      if (totalBeats > MAX_EXERCISE_BEATS) {
        errors.push({ field: 'notes', message: `Exercise is ${totalBeats} beats long, max is ${MAX_EXERCISE_BEATS}` });
      }
      if (totalBeats <= 0) {
        errors.push({ field: 'notes', message: 'Exercise has zero or negative total length' });
      }
    }
  }

  // Check first note starts at beat 0
  if (notes.length > 0 && typeof notes[0].startBeat === 'number' && notes[0].startBeat > 0.01) {
    warnings.push({ field: 'notes[0]', message: `First note starts at beat ${notes[0].startBeat}, expected 0` });
  }

  // Check consistent hand assignments (warn if mixed "none" and assigned)
  const hasHandAssignment = notes.some((n) => n.hand === 'left' || n.hand === 'right');
  const hasMissing = notes.some((n) => n.hand == null);
  if (hasHandAssignment && hasMissing) {
    warnings.push({
      field: 'notes',
      message: 'Some notes have hand assignment and some do not — should be consistent',
    });
  }
}

function validateScoring(scoring: Record<string, unknown>, errors: ValidationIssue[], warnings: ValidationIssue[]): void {
  // Passing score
  if (typeof scoring.passingScore !== 'number' || scoring.passingScore < 0 || scoring.passingScore > 100) {
    errors.push({ field: 'scoring.passingScore', message: `passingScore must be 0-100, got ${scoring.passingScore}` });
  }

  // Star thresholds
  if (!Array.isArray(scoring.starThresholds) || scoring.starThresholds.length !== 3) {
    errors.push({ field: 'scoring.starThresholds', message: 'starThresholds must be an array of 3 numbers' });
  } else {
    const [s1, s2, s3] = scoring.starThresholds as [unknown, unknown, unknown];
    if (typeof s1 !== 'number' || typeof s2 !== 'number' || typeof s3 !== 'number') {
      errors.push({ field: 'scoring.starThresholds', message: 'starThresholds values must be numbers' });
    } else {
      if (s1 > s2 || s2 > s3) {
        errors.push({ field: 'scoring.starThresholds', message: `Star thresholds must be ascending: [${s1}, ${s2}, ${s3}]` });
      }
      if (typeof scoring.passingScore === 'number' && s1 < scoring.passingScore) {
        errors.push({
          field: 'scoring.starThresholds',
          message: `First star threshold (${s1}) must be >= passingScore (${scoring.passingScore})`,
        });
      }
    }
  }

  // Timing tolerances
  if (typeof scoring.timingToleranceMs === 'number') {
    if (scoring.timingToleranceMs < 10 || scoring.timingToleranceMs > 150) {
      warnings.push({
        field: 'scoring.timingToleranceMs',
        message: `timingToleranceMs ${scoring.timingToleranceMs} seems unusual (typical: 25-100ms)`,
      });
    }
  }

  if (typeof scoring.timingGracePeriodMs === 'number') {
    if (scoring.timingGracePeriodMs < 50 || scoring.timingGracePeriodMs > 400) {
      warnings.push({
        field: 'scoring.timingGracePeriodMs',
        message: `timingGracePeriodMs ${scoring.timingGracePeriodMs} seems unusual (typical: 100-250ms)`,
      });
    }
  }
}

function validateHints(hints: Record<string, unknown>, errors: ValidationIssue[], warnings: ValidationIssue[]): void {
  if (typeof hints.beforeStart !== 'string' || hints.beforeStart.length === 0) {
    warnings.push({ field: 'hints.beforeStart', message: 'beforeStart hint is empty or missing' });
  }
  if (typeof hints.successMessage !== 'string' || hints.successMessage.length === 0) {
    warnings.push({ field: 'hints.successMessage', message: 'successMessage is empty or missing' });
  }
  if (!Array.isArray(hints.commonMistakes)) {
    warnings.push({ field: 'hints.commonMistakes', message: 'commonMistakes should be an array' });
  }
}

// ============================================================================
// Pedagogical consistency validation
// ============================================================================

/** Skills that require specific time signatures */
const COMPOUND_TIME_SKILLS = new Set([
  'compound-time', '6-8-time', '6-8-time-basics', '12-8-time',
  'compound-meters', 'mixed-meter', 'irregular-time',
]);

/** Skills that require velocity-sensitive scoring */
const DYNAMICS_SKILLS = new Set([
  'dynamics-p-f', 'dynamics', 'crescendo-diminuendo', 'expression',
  'dynamic-contrast', 'forte-piano', 'pianissimo', 'fortissimo',
  'dynamics-control', 'musical-expression',
]);

/** Skills that indicate left-hand content */
const LEFT_HAND_SKILLS = new Set([
  'lh-c-position', 'lh-g-position', 'left-hand', 'lh-melody',
  'lh-bass-patterns', 'lh-independence', 'bass-line',
  'accompaniment-patterns', 'alberti-bass',
]);

/** Skills that indicate both-hands content */
const BOTH_HANDS_SKILLS = new Set([
  'hands-together-basic', 'hands-together', 'both-hands',
  'hand-independence', 'hand-coordination', 'two-hand-playing',
  'contrary-motion', 'parallel-motion',
]);

/** Key signature → expected notes (white keys only for major keys) */
const KEY_SIGNATURE_NOTES: Record<string, Set<number>> = {
  'C': new Set([0, 2, 4, 5, 7, 9, 11]),       // C D E F G A B
  'G': new Set([0, 2, 4, 6, 7, 9, 11]),        // includes F#
  'D': new Set([1, 2, 4, 6, 7, 9, 11]),        // includes C#, F#
  'F': new Set([0, 2, 4, 5, 7, 9, 10]),        // includes Bb
  'A': new Set([1, 2, 4, 6, 8, 9, 11]),        // includes C#, F#, G#
  'E': new Set([1, 3, 4, 6, 8, 9, 11]),        // includes C#, D#, F#, G#
  'Bb': new Set([0, 2, 3, 5, 7, 9, 10]),       // includes Bb, Eb
  'Eb': new Set([0, 2, 3, 5, 7, 8, 10]),       // includes Bb, Eb, Ab
  'Ab': new Set([0, 1, 3, 5, 7, 8, 10]),       // includes Bb, Eb, Ab, Db
};

function validatePedagogicalConsistency(
  metadata: Record<string, unknown>,
  settings: Record<string, unknown>,
  scoring: Record<string, unknown>,
  notes: Array<Record<string, unknown>>,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  const skills = Array.isArray(metadata.skills) ? metadata.skills as string[] : [];
  const timeSignature = settings.timeSignature as [number, number] | undefined;
  const keySignature = settings.keySignature as string | undefined;
  const velocitySensitive = scoring.velocitySensitive as boolean | undefined;
  const description = (metadata.description as string || '').toLowerCase();
  const title = (metadata.title as string || '').toLowerCase();

  // 1. Compound time skills must have non-4/4 time signature
  const hasCompoundTimeSkill = skills.some(s => COMPOUND_TIME_SKILLS.has(s));
  const descMentionsCompound = /6\/8|12\/8|compound|waltz|3\/4/.test(description) || /6\/8|12\/8|compound/.test(title);
  if ((hasCompoundTimeSkill || descMentionsCompound) && timeSignature) {
    const [num, den] = timeSignature;
    const isCompound = (num === 6 && den === 8) || (num === 12 && den === 8) || (num === 3 && den === 4) || (num === 9 && den === 8);
    if (!isCompound && num === 4 && den === 4) {
      errors.push({
        field: 'pedagogical',
        message: `Exercise teaches compound time (skills: [${skills.filter(s => COMPOUND_TIME_SKILLS.has(s)).join(',')}]) but time signature is [${num},${den}] — should be [6,8], [3,4], [12,8], etc.`,
      });
    }
  }

  // 2. Dynamics skills must have velocitySensitive = true
  const hasDynamicsSkill = skills.some(s => DYNAMICS_SKILLS.has(s));
  const descMentionsDynamics = /dynamics|forte|piano|crescendo|diminuendo|loud|soft|p and f/.test(description);
  if ((hasDynamicsSkill || descMentionsDynamics) && velocitySensitive === false) {
    errors.push({
      field: 'pedagogical',
      message: `Exercise teaches dynamics (skills: [${skills.filter(s => DYNAMICS_SKILLS.has(s)).join(',')}]) but velocitySensitive is false — dynamics cannot be scored`,
    });
  }

  // 3. Left-hand skills should have left-hand notes
  const hasLeftHandSkill = skills.some(s => LEFT_HAND_SKILLS.has(s));
  const hasLeftHandNotes = notes.some(n => n.hand === 'left');
  if (hasLeftHandSkill && !hasLeftHandNotes && notes.length > 0) {
    warnings.push({
      field: 'pedagogical',
      message: `Exercise has left-hand skills [${skills.filter(s => LEFT_HAND_SKILLS.has(s)).join(',')}] but no notes marked hand="left"`,
    });
  }

  // 4. Both-hands skills should have both left and right hand notes
  const hasBothHandsSkill = skills.some(s => BOTH_HANDS_SKILLS.has(s));
  const hasRightHandNotes = notes.some(n => n.hand === 'right');
  if (hasBothHandsSkill && notes.length > 0) {
    if (!hasLeftHandNotes && !hasRightHandNotes) {
      warnings.push({
        field: 'pedagogical',
        message: `Exercise has both-hands skills but no hand assignments on notes`,
      });
    } else if (!hasLeftHandNotes) {
      warnings.push({
        field: 'pedagogical',
        message: `Exercise has both-hands skills but no left-hand notes`,
      });
    } else if (!hasRightHandNotes) {
      warnings.push({
        field: 'pedagogical',
        message: `Exercise has both-hands skills but no right-hand notes`,
      });
    }
  }

  // 5. Key signature consistency — check if notes actually fit the declared key
  if (keySignature && KEY_SIGNATURE_NOTES[keySignature] && notes.length > 0) {
    const expectedPitchClasses = KEY_SIGNATURE_NOTES[keySignature];
    let outOfKeyCount = 0;
    const totalNotes = notes.filter(n => typeof n.note === 'number').length;
    for (const n of notes) {
      if (typeof n.note !== 'number') continue;
      const pitchClass = n.note % 12;
      if (!expectedPitchClasses.has(pitchClass)) {
        outOfKeyCount++;
      }
    }
    const outOfKeyPct = totalNotes > 0 ? (outOfKeyCount / totalNotes) * 100 : 0;
    // If > 40% of notes are outside the key, it's likely wrong
    if (outOfKeyPct > 40 && totalNotes >= 8) {
      warnings.push({
        field: 'pedagogical',
        message: `${outOfKeyCount}/${totalNotes} notes (${Math.round(outOfKeyPct)}%) are outside the declared key of ${keySignature} — key signature may be wrong`,
      });
    }
  }

  // 6. Difficulty vs note complexity
  const difficulty = metadata.difficulty as number | undefined;
  if (difficulty !== undefined && notes.length > 0) {
    const midiNotes = notes.filter(n => typeof n.note === 'number').map(n => n.note as number);
    const uniquePitches = new Set(midiNotes.map(n => n % 12));
    const hasBlackKeys = midiNotes.some(n => [1, 3, 6, 8, 10].includes(n % 12));

    // Difficulty 1 with black keys is suspicious
    if (difficulty === 1 && hasBlackKeys) {
      warnings.push({
        field: 'pedagogical',
        message: `Difficulty 1 exercise uses black keys (sharps/flats) — beginners typically play only white keys`,
      });
    }

    // Difficulty 1-2 with > 7 unique pitch classes is complex
    if (difficulty <= 2 && uniquePitches.size > 7) {
      warnings.push({
        field: 'pedagogical',
        message: `Difficulty ${difficulty} exercise uses ${uniquePitches.size} unique pitch classes — may be too complex for this level`,
      });
    }
  }
}

// ============================================================================
// Cross-exercise validation (difficulty progression within lessons)
// ============================================================================

interface LessonManifest {
  id: string;
  exercises: Array<{ id: string; order: number }>;
}

/**
 * Validate difficulty progression within each lesson.
 * Exercises within a lesson should not decrease in difficulty.
 */
function validateDifficultyProgression(
  exerciseMap: Map<string, { difficulty: number; filePath: string }>,
  lessonsDir: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!fs.existsSync(lessonsDir)) return issues;

  const lessonFiles = fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.json'));

  for (const lessonFile of lessonFiles) {
    try {
      const content = fs.readFileSync(path.join(lessonsDir, lessonFile), 'utf-8');
      const lesson: LessonManifest = JSON.parse(content);

      if (!Array.isArray(lesson.exercises)) continue;

      // Sort exercises by their order within the lesson
      const ordered = [...lesson.exercises]
        .filter((e) => typeof e.order === 'number')
        .sort((a, b) => a.order - b.order);

      let prevDifficulty: number | null = null;
      let prevId: string | null = null;

      for (const entry of ordered) {
        const info = exerciseMap.get(entry.id);
        if (!info) continue; // exercise file not found, skip

        if (prevDifficulty !== null && info.difficulty < prevDifficulty) {
          issues.push({
            field: `lesson ${lesson.id}`,
            message: `Difficulty decreased from ${prevDifficulty} (${prevId}) to ${info.difficulty} (${entry.id})`,
          });
        }

        prevDifficulty = info.difficulty;
        prevId = entry.id;
      }
    } catch {
      // Skip unparseable lesson files
    }
  }

  return issues;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npx tsx scripts/validate-exercise.ts --all');
    console.log('  npx tsx scripts/validate-exercise.ts <file1.json> [file2.json ...]');
    process.exit(0);
  }

  const isAll = args.includes('--all');
  let files: string[];

  if (isAll) {
    const exercisesDir = path.join(__dirname, '../content/exercises');
    files = findJsonFiles(exercisesDir);
  } else {
    files = args.filter((a) => !a.startsWith('--'));
  }

  if (files.length === 0) {
    console.log('No exercise files found.');
    process.exit(0);
  }

  console.log(`\n=== Exercise Validator ===\n`);
  console.log(`Validating ${files.length} file(s)...\n`);

  let totalErrors = 0;
  let totalWarnings = 0;
  let passCount = 0;
  let failCount = 0;

  // Collect exercise metadata for cross-exercise checks
  const exerciseMap = new Map<string, { difficulty: number; filePath: string }>();

  const results: Array<{ file: string; result: ValidationResult }> = [];

  for (const file of files) {
    const absPath = path.isAbsolute(file) ? file : path.resolve(file);
    if (!fs.existsSync(absPath)) {
      console.log(`  SKIP  ${path.basename(file)} (not found)`);
      continue;
    }

    try {
      const content = fs.readFileSync(absPath, 'utf-8');
      const parsed = JSON.parse(content);
      const result = validateExercise(parsed);
      result.filePath = absPath;
      results.push({ file: absPath, result });

      // Track for cross-exercise checks
      if (typeof parsed.id === 'string' && parsed.metadata?.difficulty) {
        exerciseMap.set(parsed.id, {
          difficulty: parsed.metadata.difficulty,
          filePath: absPath,
        });
      }
    } catch (e) {
      console.log(`  FAIL  ${path.basename(file)}: ${e instanceof Error ? e.message : String(e)}`);
      totalErrors++;
      failCount++;
    }
  }

  // Run cross-exercise checks when validating all
  let progressionIssues: ValidationIssue[] = [];
  if (isAll) {
    const lessonsDir = path.join(__dirname, '../content/lessons');
    progressionIssues = validateDifficultyProgression(exerciseMap, lessonsDir);
  }

  // Print per-exercise results
  for (const { result } of results) {
    const shortName = result.exerciseId !== '<unknown>'
      ? result.exerciseId
      : path.basename(result.filePath || '');

    if (result.valid && result.warnings.length === 0) {
      console.log(`  PASS  ${shortName}`);
      passCount++;
    } else if (result.valid) {
      console.log(`  WARN  ${shortName} (${result.warnings.length} warning${result.warnings.length !== 1 ? 's' : ''})`);
      for (const w of result.warnings) {
        console.log(`        [${w.field}] ${w.message}`);
      }
      passCount++;
    } else {
      console.log(`  FAIL  ${shortName} (${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}, ${result.warnings.length} warning${result.warnings.length !== 1 ? 's' : ''})`);
      for (const e of result.errors) {
        console.log(`    ERROR  [${e.field}] ${e.message}`);
      }
      for (const w of result.warnings) {
        console.log(`    WARN   [${w.field}] ${w.message}`);
      }
      failCount++;
    }

    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  // Print progression issues
  if (progressionIssues.length > 0) {
    console.log(`\n--- Difficulty Progression ---\n`);
    for (const issue of progressionIssues) {
      console.log(`  WARN  [${issue.field}] ${issue.message}`);
    }
    totalWarnings += progressionIssues.length;
  }

  // Summary
  console.log(`\n--- Summary ---`);
  console.log(`  Files:    ${files.length}`);
  console.log(`  Passed:   ${passCount}`);
  console.log(`  Failed:   ${failCount}`);
  console.log(`  Errors:   ${totalErrors}`);
  console.log(`  Warnings: ${totalWarnings}`);

  process.exit(totalErrors > 0 ? 1 : 0);
}

function findJsonFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsonFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

// Run CLI if executed directly
if (require.main === module) {
  main();
}

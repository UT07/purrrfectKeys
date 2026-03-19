/**
 * Exercise validation and scoring engine
 * Pure TypeScript - no React imports
 * Core business logic for scoring exercises
 */

import type {
  Exercise,
  MidiNoteEvent,
  NoteEvent,
  ExerciseScore,
  NoteScore,
  ExerciseScoreBreakdown,
} from './types';

const SCORE_WEIGHTS = {
  accuracy: 0.35, // Did you play the right notes?
  timing: 0.30, // Did you play them at the right time?
  completeness: 0.10, // Did you play all the notes?
  extraNotes: 0.10, // Penalty for extra notes (inverted)
  duration: 0.15, // Did you hold notes for the right length?
};

/**
 * Calculate timing score based on offset from expected timing
 */
export function calculateTimingScore(
  offsetMs: number,
  tolerance: number,
  gracePeriod: number
): number {
  const absOffset = Math.abs(offsetMs);

  if (absOffset <= tolerance) {
    return 100; // Perfect
  }

  if (absOffset <= gracePeriod) {
    // Linear interpolation between perfect and good
    // Guard: if tolerance === gracePeriod, the range collapses — treat as perfect
    const range = gracePeriod - tolerance;
    if (range <= 0) return 100;
    return 100 - ((absOffset - tolerance) / range) * 30;
  }

  if (absOffset <= gracePeriod * 2) {
    // Exponential decay for "okay" timing
    return 70 * Math.exp(-(absOffset - gracePeriod) / gracePeriod);
  }

  return 0; // Missed
}

/**
 * Calculate duration score based on how close the held duration is to expected
 * Returns 0-100. Touch users (no durationMs) get a neutral 100 (no penalty).
 */
export function calculateDurationScore(
  actualMs: number | undefined,
  expectedMs: number
): number {
  if (actualMs == null || actualMs <= 0 || expectedMs <= 0) {
    return 100; // No penalty for tap-only (touch keyboard) — duration not measurable
  }
  const ratio = actualMs / expectedMs;
  // Perfect zone: 0.7x - 1.3x of expected
  if (ratio >= 0.7 && ratio <= 1.3) return 100;
  // Partial credit: linear falloff
  if (ratio < 0.7 && ratio >= 0.4) return ((ratio - 0.4) / 0.3) * 100;
  if (ratio > 1.3 && ratio <= 2.0) return ((2.0 - ratio) / 0.7) * 100;
  return 0;
}

/**
 * Match played notes to expected notes within a time window
 */
function matchNotes(
  expectedNotes: NoteEvent[],
  playedNotes: MidiNoteEvent[],
  tempoMs: number // milliseconds per beat
): Map<number, { event: MidiNoteEvent; playedIndex: number }> {
  const matched = new Map<number, { event: MidiNoteEvent; playedIndex: number }>();
  const usedPlayedIndices = new Set<number>();

  // For each expected note, find the best matching played note
  for (let i = 0; i < expectedNotes.length; i++) {
    const expected = expectedNotes[i];
    const expectedTimeMs = expected.startBeat * tempoMs;

    let bestMatch: { index: number; distance: number } | null = null;
    const maxTimeDistance = tempoMs * 1.5; // ±1.5 beats — wide enough to always find the closest note

    for (let j = 0; j < playedNotes.length; j++) {
      if (usedPlayedIndices.has(j)) continue;

      const played = playedNotes[j];
      if (played.note === expected.note) {
        const timeDistance = Math.abs(played.timestamp - expectedTimeMs);
        if (timeDistance < maxTimeDistance) {
          if (!bestMatch || timeDistance < bestMatch.distance) {
            bestMatch = { index: j, distance: timeDistance };
          }
        }
      }
    }

    if (bestMatch) {
      matched.set(i, { event: playedNotes[bestMatch.index], playedIndex: bestMatch.index });
      usedPlayedIndices.add(bestMatch.index);
    }
  }

  return matched;
}

/**
 * Score individual notes
 */
function scoreNotes(
  exercise: Exercise,
  expectedNotes: NoteEvent[],
  playedNotes: MidiNoteEvent[],
  tempoMs: number
): NoteScore[] {
  const matched = matchNotes(expectedNotes, playedNotes, tempoMs);
  const noteScores: NoteScore[] = [];
  const usedPlayedIndices = new Set<number>();

  // Score each expected note
  for (let i = 0; i < expectedNotes.length; i++) {
    const expected = expectedNotes[i];
    const match = matched.get(i);

    if (match) {
      const { event: played, playedIndex } = match;
      usedPlayedIndices.add(playedIndex);
      const expectedTimeMs = expected.startBeat * tempoMs;
      const timingOffsetMs = played.timestamp - expectedTimeMs;

      const timingScore = calculateTimingScore(
        timingOffsetMs,
        exercise.scoring.timingToleranceMs,
        exercise.scoring.timingGracePeriodMs
      );

      // Duration scoring: compare actual hold time to expected
      const expectedDurationMs = expected.durationBeats * tempoMs;
      const durationScore = calculateDurationScore(played.durationMs, expectedDurationMs);

      // velocityScore is computed per-note for future use but not included in
      // the current SCORE_WEIGHTS breakdown. Enable by adding a 'velocity' weight.
      const velocityScore = Math.max(0, 100 - Math.abs(played.velocity - 64) / 0.64);

      noteScores.push({
        expected,
        played,
        timingOffsetMs,
        timingScore,
        durationScore,
        velocityScore,
        isCorrectPitch: true,
        isExtraNote: false,
        isMissedNote: false,
      });
    } else {
      // Missed note
      noteScores.push({
        expected,
        played: null,
        timingOffsetMs: 0,
        timingScore: 0,
        velocityScore: 0,
        isCorrectPitch: false,
        isExtraNote: false,
        isMissedNote: true,
      });
    }
  }

  // Mark extra notes
  for (let i = 0; i < playedNotes.length; i++) {
    if (!usedPlayedIndices.has(i)) {
      noteScores.push({
        expected: { note: 0, startBeat: 0, durationBeats: 0 },
        played: playedNotes[i],
        timingOffsetMs: 0,
        timingScore: 0,
        velocityScore: 0,
        isCorrectPitch: false,
        isExtraNote: true,
        isMissedNote: false,
      });
    }
  }

  return noteScores;
}

/**
 * Calculate score breakdown percentages
 */
function calculateBreakdown(
  noteScores: NoteScore[],
  totalExpected: number
): ExerciseScoreBreakdown {
  // BUG-009 fix: Guard against division by zero when totalExpected is 0
  if (noteScores.length === 0 || totalExpected === 0) {
    return {
      accuracy: 0,
      timing: 0,
      completeness: 0,
      extraNotes: noteScores.length === 0 ? 0 : Math.round(100 / (1 + noteScores.filter((n) => n.isExtraNote).length * 0.5)),
      duration: 0,
    };
  }

  // Accuracy: correct pitch notes / total expected
  const correctNotes = noteScores.filter((n) => n.isCorrectPitch && !n.isExtraNote).length;
  const accuracy = (correctNotes / totalExpected) * 100;

  // Timing: average timing score across ALL expected notes (missed = 0)
  // This ensures missing notes drags timing down instead of being invisible.
  const expectedNoteScores = noteScores.filter((n) => !n.isExtraNote);
  const timing =
    expectedNoteScores.length > 0
      ? expectedNoteScores.reduce((sum, n) => sum + n.timingScore, 0) / expectedNoteScores.length
      : 0;

  // Completeness: notes played / total expected
  const playedCount = noteScores.filter((n) => !n.isMissedNote && !n.isExtraNote).length;
  const completeness = (playedCount / totalExpected) * 100;

  // Extra notes penalty: smooth decay so additional extra notes always increase penalty
  // Formula: 100 / (1 + extraCount * 0.5) — ranges from 100 (0 extras) to ~7 (25 extras)
  const extraCount = noteScores.filter((n) => n.isExtraNote).length;
  const extraNotes = extraCount === 0 ? 100 : Math.round(100 / (1 + extraCount * 0.5));

  // Duration: average duration score across ALL expected notes (missed = 0)
  const duration =
    expectedNoteScores.length > 0
      ? expectedNoteScores.reduce((sum, n) => sum + (n.durationScore ?? (n.isMissedNote ? 0 : 100)), 0) / expectedNoteScores.length
      : 0;

  return {
    accuracy: Math.round(accuracy),
    timing: Math.round(timing),
    completeness: Math.round(completeness),
    extraNotes: Math.round(extraNotes),
    duration: Math.round(duration),
  };
}

/**
 * Main scoring function
 */
export function scoreExercise(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore: number = 0
): ExerciseScore {
  // Convert tempo to milliseconds per beat
  // Assuming quarter note = 1 beat
  // Guard: treat invalid/zero tempo as 60 BPM to prevent Infinity/NaN
  const safeTempo = exercise.settings.tempo > 0 ? exercise.settings.tempo : 60;
  const msPerBeat = (60 * 1000) / safeTempo;

  // Score all notes — timing tolerances come from the exercise definition.
  // Input-method-specific adjustments (e.g., wider windows for touch/mic)
  // are applied by the caller (useExercisePlayback) before invoking this function.
  const noteScores = scoreNotes(exercise, exercise.notes, playedNotes, msPerBeat);

  // Optional notes should not penalize the player when missed. Exclude them
  // from the scoring denominator (completeness, timing, accuracy, duration).
  // They remain in the matching pool and appear in `details` for UI display,
  // but only required notes affect the final score.
  const requiredNotes = exercise.notes.filter((n) => !n.optional);
  const scoringNoteScores = noteScores.filter(
    (ns) => ns.isExtraNote || !ns.expected.optional,
  );

  // Calculate breakdown using required notes only for denominator
  const breakdown = calculateBreakdown(scoringNoteScores, requiredNotes.length);

  // Weighted overall score
  const overall =
    breakdown.accuracy * SCORE_WEIGHTS.accuracy +
    breakdown.timing * SCORE_WEIGHTS.timing +
    breakdown.completeness * SCORE_WEIGHTS.completeness +
    breakdown.extraNotes * SCORE_WEIGHTS.extraNotes +
    breakdown.duration * SCORE_WEIGHTS.duration;

  // Determine stars
  const starThresholds = exercise.scoring.starThresholds;
  let stars: 0 | 1 | 2 | 3 = 0;
  if (overall >= starThresholds[0]) stars = 1;
  if (overall >= starThresholds[1]) stars = 2;
  if (overall >= starThresholds[2]) stars = 3;

  // Calculate XP earned
  const baseXp = 10;
  const accuracyBonus = (breakdown.accuracy / 100) * 10;
  const timingBonus = (breakdown.timing / 100) * 10;
  const firstTimeBonus = previousHighScore === 0 ? 25 : 0;
  const perfectBonus = stars === 3 ? 50 : 0;

  const xpEarned = Math.floor(baseXp + accuracyBonus + timingBonus + firstTimeBonus + perfectBonus);

  const isPassed = overall >= exercise.scoring.passingScore;
  const isNewHighScore = overall > previousHighScore;

  return {
    overall: Math.round(overall),
    stars,
    breakdown,
    details: noteScores,
    missedNotes: noteScores.filter((n) => n.isMissedNote).length,
    extraNotes: noteScores.filter((n) => n.isExtraNote).length,
    perfectNotes: noteScores.filter((n) => n.isCorrectPitch && !n.isExtraNote && n.timingScore >= 90).length,
    goodNotes: noteScores.filter((n) => n.isCorrectPitch && !n.isExtraNote && n.timingScore >= 50 && n.timingScore < 90).length,
    okNotes: noteScores.filter((n) => n.isCorrectPitch && !n.isExtraNote && n.timingScore > 0 && n.timingScore < 50).length,
    xpEarned,
    isPassed,
    isNewHighScore,
  };
}

/**
 * Validate that an exercise definition is valid
 */
export function validateExercise(exercise: Exercise): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!exercise.id) errors.push('Exercise must have an id');
  if (!exercise.metadata.title) errors.push('Exercise must have a title');
  if (exercise.notes.length === 0) errors.push('Exercise must have at least one note');
  if (exercise.settings.tempo <= 0) errors.push('Tempo must be positive');
  if (exercise.scoring.passingScore < 0 || exercise.scoring.passingScore > 100) {
    errors.push('Passing score must be between 0 and 100');
  }

  // Validate MIDI note range
  for (let i = 0; i < exercise.notes.length; i++) {
    const note = exercise.notes[i];
    if (note.note < 21 || note.note > 108) {
      errors.push(`Note ${i}: MIDI note ${note.note} is outside piano range (21-108)`);
    }
    if (note.startBeat < 0) {
      errors.push(`Note ${i}: startBeat cannot be negative`);
    }
    if (note.durationBeats <= 0) {
      errors.push(`Note ${i}: durationBeats must be positive`);
    }
  }

  // Validate star thresholds
  const [one, two, three] = exercise.scoring.starThresholds;
  if (!(one < two && two < three)) {
    errors.push('Star thresholds must be in ascending order');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get note sequence from expected notes
 */
export function getExpectedNoteSequence(exercise: Exercise): number[] {
  return exercise.notes.map((n) => n.note);
}

// Re-export the type-aware scoring dispatcher
export { scoreExerciseByType } from './scoringStrategies';


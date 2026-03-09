/**
 * Type-specific scoring strategies.
 * Each wraps the base scoreExercise with type-appropriate adjustments.
 *
 * Pure TypeScript — no React imports.
 */

import { scoreExercise, calculateTimingScore, calculateDurationScore } from './ExerciseValidator';
import type {
  Exercise,
  ExerciseScore,
  MidiNoteEvent,
  NoteEvent,
  NoteScore,
  ExerciseScoreBreakdown,
} from './types';
import { getExerciseType } from './types';

// ── Score weights (same as ExerciseValidator) ────────────────────────────
const SCORE_WEIGHTS = {
  accuracy: 0.35,
  timing: 0.30,
  completeness: 0.10,
  extraNotes: 0.10,
  duration: 0.15,
};

// ── Rhythm scoring ──────────────────────────────────────────────────────

/**
 * Match played notes to expected notes by TIME only (pitch is ignored).
 * Returns a Map<expectedIndex, playedNote>.
 */
function matchNotesByTimeOnly(
  expectedNotes: NoteEvent[],
  playedNotes: MidiNoteEvent[],
  tempoMs: number
): Map<number, MidiNoteEvent> {
  const matched = new Map<number, MidiNoteEvent>();
  const usedPlayedIndices = new Set<number>();

  // Sort expected by startBeat (should already be, but be safe)
  const sortedExpected = expectedNotes
    .map((n, i) => ({ n, i }))
    .sort((a, b) => a.n.startBeat - b.n.startBeat);

  // Sort played by timestamp
  const sortedPlayed = playedNotes
    .map((n, i) => ({ n, i }))
    .sort((a, b) => a.n.timestamp - b.n.timestamp);

  const maxTimeDistance = tempoMs * 1.5; // ±1.5 beats

  for (const { n: expected, i: expIdx } of sortedExpected) {
    const expectedTimeMs = expected.startBeat * tempoMs;

    let bestMatch: { playedIdx: number; distance: number } | null = null;

    for (const { n: played, i: playIdx } of sortedPlayed) {
      if (usedPlayedIndices.has(playIdx)) continue;

      const timeDistance = Math.abs(played.timestamp - expectedTimeMs);
      if (timeDistance < maxTimeDistance) {
        if (!bestMatch || timeDistance < bestMatch.distance) {
          bestMatch = { playedIdx: playIdx, distance: timeDistance };
        }
      }
    }

    if (bestMatch) {
      matched.set(expIdx, playedNotes[bestMatch.playedIdx]);
      usedPlayedIndices.add(bestMatch.playedIdx);
    }
  }

  return matched;
}

/**
 * Build an ExerciseScore from scored note details.
 * Shared helper for non-standard scorers (rhythm).
 */
function buildScoreFromNotes(
  exercise: Exercise,
  noteScores: NoteScore[],
  totalExpected: number,
  previousHighScore: number
): ExerciseScore {
  // Calculate breakdown
  const breakdown = calculateBreakdownFromNotes(noteScores, totalExpected);

  // Weighted overall score
  const overall =
    breakdown.accuracy * SCORE_WEIGHTS.accuracy +
    breakdown.timing * SCORE_WEIGHTS.timing +
    breakdown.completeness * SCORE_WEIGHTS.completeness +
    breakdown.extraNotes * SCORE_WEIGHTS.extraNotes +
    breakdown.duration * SCORE_WEIGHTS.duration;

  // Stars
  const starThresholds = exercise.scoring.starThresholds;
  let stars: 0 | 1 | 2 | 3 = 0;
  if (overall >= starThresholds[0]) stars = 1;
  if (overall >= starThresholds[1]) stars = 2;
  if (overall >= starThresholds[2]) stars = 3;

  // XP
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
 * Calculate breakdown from note scores (mirrors ExerciseValidator's calculateBreakdown).
 */
function calculateBreakdownFromNotes(
  noteScores: NoteScore[],
  totalExpected: number
): ExerciseScoreBreakdown {
  if (noteScores.length === 0 || totalExpected === 0) {
    return {
      accuracy: 0,
      timing: 0,
      completeness: 0,
      extraNotes: noteScores.length === 0
        ? 0
        : Math.max(0, 100 - noteScores.filter((n) => n.isExtraNote).length * 10),
      duration: 0,
    };
  }

  const correctNotes = noteScores.filter((n) => n.isCorrectPitch && !n.isExtraNote).length;
  const accuracy = (correctNotes / totalExpected) * 100;

  const expectedNoteScores = noteScores.filter((n) => !n.isExtraNote);
  const timing =
    expectedNoteScores.length > 0
      ? expectedNoteScores.reduce((sum, n) => sum + n.timingScore, 0) / expectedNoteScores.length
      : 0;

  const playedCount = noteScores.filter((n) => !n.isMissedNote && !n.isExtraNote).length;
  const completeness = (playedCount / totalExpected) * 100;

  const extraCount = noteScores.filter((n) => n.isExtraNote).length;
  const extraNotes = Math.max(0, 100 - extraCount * 10);

  const duration =
    expectedNoteScores.length > 0
      ? expectedNoteScores.reduce(
          (sum, n) => sum + (n.durationScore ?? (n.isMissedNote ? 0 : 100)),
          0
        ) / expectedNoteScores.length
      : 0;

  return {
    accuracy: Math.round(accuracy),
    timing: Math.round(timing),
    completeness: Math.round(completeness),
    extraNotes: Math.round(extraNotes),
    duration: Math.round(duration),
  };
}

// ── Public scoring functions ────────────────────────────────────────────

/**
 * Score a rhythm exercise: pitch is IGNORED, only timing matters.
 * Accuracy is always 100% (any key tap counts). Only timing, completeness,
 * extra notes, and duration contribute to the score.
 */
export function scoreRhythmExercise(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore: number = 0
): ExerciseScore {
  const msPerBeat = (60 * 1000) / exercise.settings.tempo;

  // Wider timing tolerance for rhythm exercises
  const timingToleranceMs = Math.max(exercise.scoring.timingToleranceMs, 60);
  const timingGracePeriodMs = Math.max(exercise.scoring.timingGracePeriodMs, 160);

  // Match by time only (ignore pitch)
  const matched = matchNotesByTimeOnly(exercise.notes, playedNotes, msPerBeat);
  const usedPlayedIndices = new Set<number>();
  const noteScores: NoteScore[] = [];

  // Score each expected note
  for (let i = 0; i < exercise.notes.length; i++) {
    const expected = exercise.notes[i];
    const played = matched.get(i);

    if (played) {
      usedPlayedIndices.add(playedNotes.indexOf(played));
      const expectedTimeMs = expected.startBeat * msPerBeat;
      const timingOffsetMs = played.timestamp - expectedTimeMs;

      const timingScore = calculateTimingScore(
        timingOffsetMs,
        timingToleranceMs,
        timingGracePeriodMs
      );

      const expectedDurationMs = expected.durationBeats * msPerBeat;
      const durationScore = calculateDurationScore(played.durationMs, expectedDurationMs);

      noteScores.push({
        expected,
        played,
        timingOffsetMs,
        timingScore,
        durationScore,
        isCorrectPitch: true, // Always true for rhythm — pitch doesn't matter
        isExtraNote: false,
        isMissedNote: false,
      });
    } else {
      noteScores.push({
        expected,
        played: null,
        timingOffsetMs: 0,
        timingScore: 0,
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
        isCorrectPitch: false,
        isExtraNote: true,
        isMissedNote: false,
      });
    }
  }

  return buildScoreFromNotes(exercise, noteScores, exercise.notes.length, previousHighScore);
}

/**
 * Score a chord identification exercise: standard scoring but with
 * wider timing tolerance to account for pressing multiple keys.
 */
export function scoreChordIdExercise(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore: number = 0
): ExerciseScore {
  // Create an adjusted exercise with wider timing windows for chords
  const adjustedExercise: Exercise = {
    ...exercise,
    scoring: {
      ...exercise.scoring,
      timingToleranceMs: Math.max(exercise.scoring.timingToleranceMs, 100),
      timingGracePeriodMs: Math.max(exercise.scoring.timingGracePeriodMs, 250),
    },
  };

  return scoreExercise(adjustedExercise, playedNotes, previousHighScore);
}

/**
 * Score an ear training exercise: identical to standard scoring.
 * The difference is in the UI (play audio first, then user replicates).
 */
export function scoreEarTrainingExercise(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore: number = 0
): ExerciseScore {
  return scoreExercise(exercise, playedNotes, previousHighScore);
}

/**
 * Score a sight reading exercise: identical to standard scoring.
 * Tighter tolerances come from the exercise JSON, not the scorer.
 */
export function scoreSightReadingExercise(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore: number = 0
): ExerciseScore {
  return scoreExercise(exercise, playedNotes, previousHighScore);
}

/**
 * Score a call-and-response exercise: identical to standard scoring.
 * The UI handles the call/response phases; scoring evaluates the response.
 */
export function scoreCallResponseExercise(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore: number = 0
): ExerciseScore {
  return scoreExercise(exercise, playedNotes, previousHighScore);
}

// ── Dispatcher ──────────────────────────────────────────────────────────

/**
 * Score an exercise using the appropriate strategy for its type.
 * This is the main entry point — consumers should call this instead
 * of scoreExercise() directly when dealing with typed exercises.
 */
export function scoreExerciseByType(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore: number = 0
): ExerciseScore {
  const type = getExerciseType(exercise);

  switch (type) {
    case 'rhythm':
      return scoreRhythmExercise(exercise, playedNotes, previousHighScore);
    case 'chordId':
      return scoreChordIdExercise(exercise, playedNotes, previousHighScore);
    case 'earTraining':
      return scoreEarTrainingExercise(exercise, playedNotes, previousHighScore);
    case 'sightReading':
      return scoreSightReadingExercise(exercise, playedNotes, previousHighScore);
    case 'callResponse':
      return scoreCallResponseExercise(exercise, playedNotes, previousHighScore);
    case 'play':
    default:
      return scoreExercise(exercise, playedNotes, previousHighScore);
  }
}

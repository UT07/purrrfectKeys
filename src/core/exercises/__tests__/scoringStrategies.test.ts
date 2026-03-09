/**
 * Tests for type-specific scoring strategies
 */

import {
  scoreRhythmExercise,
  scoreChordIdExercise,
  scoreEarTrainingExercise,
  scoreSightReadingExercise,
  scoreCallResponseExercise,
  scoreExerciseByType,
} from '../scoringStrategies';
import { scoreExercise } from '../ExerciseValidator';
import type { Exercise, MidiNoteEvent } from '../types';

// Base exercise fixture — 120 BPM → 500ms per beat
const makeExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'test-exercise',
  version: 1,
  metadata: {
    title: 'Test Exercise',
    description: 'A test exercise',
    difficulty: 1,
    estimatedMinutes: 5,
    skills: ['test'],
    prerequisites: [],
  },
  settings: {
    tempo: 120,
    timeSignature: [4, 4],
    keySignature: 'C',
    countIn: 0,
    metronomeEnabled: false,
  },
  notes: [
    { note: 60, startBeat: 0, durationBeats: 1 },
    { note: 62, startBeat: 1, durationBeats: 1 },
    { note: 64, startBeat: 2, durationBeats: 1 },
  ],
  scoring: {
    timingToleranceMs: 50,
    timingGracePeriodMs: 100,
    passingScore: 70,
    starThresholds: [70, 85, 95],
  },
  hints: {
    beforeStart: 'Test hint',
    commonMistakes: [],
    successMessage: 'Success!',
  },
  ...overrides,
});

// Helper to create a played note
const note = (
  midiNote: number,
  timestamp: number,
  velocity = 100
): MidiNoteEvent => ({
  type: 'noteOn',
  note: midiNote,
  velocity,
  timestamp,
  channel: 0,
});

describe('scoringStrategies', () => {
  describe('scoreRhythmExercise', () => {
    it('gives 100% accuracy regardless of pitch played', () => {
      const exercise = makeExercise({ type: 'rhythm' });
      // Play wrong pitches but at the right times
      // Expected: C4(0ms), D4(500ms), E4(1000ms)
      // Played: A4, B4, F4 at the right times
      const played: MidiNoteEvent[] = [
        note(69, 0),    // A4 instead of C4
        note(71, 500),  // B4 instead of D4
        note(65, 1000), // F4 instead of E4
      ];

      const score = scoreRhythmExercise(exercise, played);
      expect(score.breakdown.accuracy).toBe(100);
    });

    it('penalizes bad timing even with correct pitch', () => {
      const exercise = makeExercise({ type: 'rhythm' });
      // Play correct pitches but very late
      const played: MidiNoteEvent[] = [
        note(60, 400),  // 400ms late
        note(62, 900),  // 400ms late
        note(64, 1400), // 400ms late
      ];

      const score = scoreRhythmExercise(exercise, played);
      // Timing should be significantly penalized
      expect(score.breakdown.timing).toBeLessThan(50);
      // But accuracy is still 100% (rhythm ignores pitch)
      expect(score.breakdown.accuracy).toBe(100);
    });

    it('counts missed notes when no tap at expected time', () => {
      const exercise = makeExercise({ type: 'rhythm' });
      // Only play one note out of three
      const played: MidiNoteEvent[] = [
        note(60, 0),
      ];

      const score = scoreRhythmExercise(exercise, played);
      expect(score.missedNotes).toBe(2);
      expect(score.breakdown.completeness).toBeLessThanOrEqual(34); // 1/3
    });

    it('uses wider timing tolerance than standard', () => {
      const exercise = makeExercise({
        type: 'rhythm',
        scoring: {
          timingToleranceMs: 30, // narrower than rhythm minimum of 60
          timingGracePeriodMs: 80, // narrower than rhythm minimum of 160
          passingScore: 70,
          starThresholds: [70, 85, 95],
        },
      });

      // Play at 55ms offset — would fail 30ms tolerance but passes 60ms rhythm tolerance
      const played: MidiNoteEvent[] = [
        note(60, 55),
        note(62, 555),
        note(64, 1055),
      ];

      const score = scoreRhythmExercise(exercise, played);
      // With rhythm's wider tolerance of 60ms, 55ms should be perfect
      expect(score.breakdown.timing).toBe(100);
    });

    it('handles empty played notes', () => {
      const exercise = makeExercise({ type: 'rhythm' });
      const score = scoreRhythmExercise(exercise, []);
      expect(score.missedNotes).toBe(3);
      expect(score.overall).toBeLessThan(50);
    });
  });

  describe('scoreChordIdExercise', () => {
    it('scores chord when all notes played within window', () => {
      // Chord: C-E-G all on beat 0
      const exercise = makeExercise({
        type: 'chordId',
        notes: [
          { note: 60, startBeat: 0, durationBeats: 2 },
          { note: 64, startBeat: 0, durationBeats: 2 },
          { note: 67, startBeat: 0, durationBeats: 2 },
        ],
        scoring: {
          timingToleranceMs: 50,
          timingGracePeriodMs: 100,
          passingScore: 70,
          starThresholds: [70, 85, 95],
        },
      });

      // Player presses all three notes within 90ms spread
      const played: MidiNoteEvent[] = [
        note(60, 0),
        note(64, 40),
        note(67, 90),
      ];

      const score = scoreChordIdExercise(exercise, played);
      // With chord tolerance of 100ms, all notes within 90ms should score well
      expect(score.breakdown.accuracy).toBe(100);
      expect(score.overall).toBeGreaterThan(70);
    });

    it('handles partial chord (some notes missing)', () => {
      const exercise = makeExercise({
        type: 'chordId',
        notes: [
          { note: 60, startBeat: 0, durationBeats: 2 },
          { note: 64, startBeat: 0, durationBeats: 2 },
          { note: 67, startBeat: 0, durationBeats: 2 },
        ],
      });

      // Only play 2 of 3 chord notes
      const played: MidiNoteEvent[] = [
        note(60, 0),
        note(64, 30),
      ];

      const score = scoreChordIdExercise(exercise, played);
      expect(score.missedNotes).toBe(1);
      expect(score.breakdown.completeness).toBeLessThanOrEqual(67); // 2/3
    });

    it('uses wider timing tolerance than standard', () => {
      const exercise = makeExercise({
        type: 'chordId',
        notes: [
          { note: 60, startBeat: 0, durationBeats: 2 },
          { note: 64, startBeat: 0, durationBeats: 2 },
          { note: 67, startBeat: 0, durationBeats: 2 },
        ],
        scoring: {
          timingToleranceMs: 30, // narrower than chord minimum of 100
          timingGracePeriodMs: 80, // narrower than chord minimum of 250
          passingScore: 70,
          starThresholds: [70, 85, 95],
        },
      });

      // Last chord note pressed at 95ms — would fail 30ms but passes 100ms chord tolerance
      const played: MidiNoteEvent[] = [
        note(60, 0),
        note(64, 50),
        note(67, 95),
      ];

      const score = scoreChordIdExercise(exercise, played);
      expect(score.breakdown.timing).toBe(100);
    });
  });

  describe('pass-through scorers', () => {
    it('earTraining scorer returns same result as standard scoreExercise', () => {
      const exercise = makeExercise({ type: 'earTraining' });
      const played: MidiNoteEvent[] = [
        note(60, 0),
        note(62, 500),
        note(64, 1000),
      ];

      const earResult = scoreEarTrainingExercise(exercise, played);
      const stdResult = scoreExercise(exercise, played);

      expect(earResult.overall).toBe(stdResult.overall);
      expect(earResult.breakdown).toEqual(stdResult.breakdown);
    });

    it('sightReading scorer returns same result as standard scoreExercise', () => {
      const exercise = makeExercise({ type: 'sightReading' });
      const played: MidiNoteEvent[] = [
        note(60, 0),
        note(62, 500),
        note(64, 1000),
      ];

      const srResult = scoreSightReadingExercise(exercise, played);
      const stdResult = scoreExercise(exercise, played);

      expect(srResult.overall).toBe(stdResult.overall);
      expect(srResult.breakdown).toEqual(stdResult.breakdown);
    });

    it('callResponse scorer returns same result as standard scoreExercise', () => {
      const exercise = makeExercise({ type: 'callResponse' });
      const played: MidiNoteEvent[] = [
        note(60, 0),
        note(62, 500),
        note(64, 1000),
      ];

      const crResult = scoreCallResponseExercise(exercise, played);
      const stdResult = scoreExercise(exercise, played);

      expect(crResult.overall).toBe(stdResult.overall);
      expect(crResult.breakdown).toEqual(stdResult.breakdown);
    });
  });

  describe('scoreExerciseByType', () => {
    const played: MidiNoteEvent[] = [
      note(60, 0),
      note(62, 500),
      note(64, 1000),
    ];

    it('dispatches to rhythm scorer for type=rhythm', () => {
      const exercise = makeExercise({ type: 'rhythm' });
      // Play wrong pitches — rhythm scorer should still give 100% accuracy
      const wrongPitchPlayed: MidiNoteEvent[] = [
        note(69, 0),
        note(71, 500),
        note(65, 1000),
      ];

      const score = scoreExerciseByType(exercise, wrongPitchPlayed);
      expect(score.breakdown.accuracy).toBe(100);
    });

    it('dispatches to standard scorer for type=play', () => {
      const exercise = makeExercise({ type: 'play' });
      const stdResult = scoreExercise(exercise, played);
      const result = scoreExerciseByType(exercise, played);

      expect(result.overall).toBe(stdResult.overall);
      expect(result.breakdown).toEqual(stdResult.breakdown);
    });

    it('dispatches to standard scorer for undefined type', () => {
      const exercise = makeExercise(); // no type → defaults to 'play'
      const stdResult = scoreExercise(exercise, played);
      const result = scoreExerciseByType(exercise, played);

      expect(result.overall).toBe(stdResult.overall);
      expect(result.breakdown).toEqual(stdResult.breakdown);
    });

    it('dispatches to chord scorer for type=chordId', () => {
      const exercise = makeExercise({
        type: 'chordId',
        notes: [
          { note: 60, startBeat: 0, durationBeats: 2 },
          { note: 64, startBeat: 0, durationBeats: 2 },
          { note: 67, startBeat: 0, durationBeats: 2 },
        ],
        scoring: {
          timingToleranceMs: 30, // below chord minimum
          timingGracePeriodMs: 80, // below chord minimum
          passingScore: 70,
          starThresholds: [70, 85, 95],
        },
      });

      // Play chord with 95ms spread — only passes with chord's wider tolerance
      const chordPlayed: MidiNoteEvent[] = [
        note(60, 0),
        note(64, 50),
        note(67, 95),
      ];

      const score = scoreExerciseByType(exercise, chordPlayed);
      // Chord scorer's 100ms tolerance means 95ms is perfect
      expect(score.breakdown.timing).toBe(100);
    });

    it('dispatches to earTraining scorer for type=earTraining', () => {
      const exercise = makeExercise({ type: 'earTraining' });
      const stdResult = scoreExercise(exercise, played);
      const result = scoreExerciseByType(exercise, played);

      expect(result.overall).toBe(stdResult.overall);
    });

    it('dispatches to sightReading scorer for type=sightReading', () => {
      const exercise = makeExercise({ type: 'sightReading' });
      const stdResult = scoreExercise(exercise, played);
      const result = scoreExerciseByType(exercise, played);

      expect(result.overall).toBe(stdResult.overall);
    });

    it('dispatches to callResponse scorer for type=callResponse', () => {
      const exercise = makeExercise({ type: 'callResponse' });
      const stdResult = scoreExercise(exercise, played);
      const result = scoreExerciseByType(exercise, played);

      expect(result.overall).toBe(stdResult.overall);
    });
  });
});

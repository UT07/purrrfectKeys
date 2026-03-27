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

  describe('AI exercise scoring (Bug #103)', () => {
    it('scores correctly at very low tempo (39 BPM)', () => {
      // Simulates AI exercise at 39 BPM (common for difficulty 1 with default tempo range)
      // 39 BPM → 1538ms per beat
      const exercise = makeExercise({
        settings: {
          tempo: 39,
          timeSignature: [4, 4],
          keySignature: 'C',
          countIn: 4,
          metronomeEnabled: true,
        },
        notes: [
          { note: 60, startBeat: 0, durationBeats: 1, hand: 'right' as const },
          { note: 62, startBeat: 1, durationBeats: 0.5, hand: 'right' as const },
          { note: 64, startBeat: 1.5, durationBeats: 1.5, hand: 'right' as const },
          { note: 60, startBeat: 3, durationBeats: 1, hand: 'right' as const },
        ],
        scoring: {
          timingToleranceMs: 75,
          timingGracePeriodMs: 200,
          passingScore: 60,
          starThresholds: [70, 85, 95],
        },
      });

      const msPerBeat = 60000 / 39; // ~1538ms
      // Played notes with timestamps relative to beat 0 (already adjusted)
      const played: MidiNoteEvent[] = [
        note(60, 10),                      // beat 0, 10ms late
        note(62, msPerBeat + 20),          // beat 1, 20ms late
        note(64, msPerBeat * 1.5 - 10),   // beat 1.5, 10ms early
        note(60, msPerBeat * 3 + 5),      // beat 3, 5ms late
      ];

      const score = scoreExerciseByType(exercise, played);
      expect(score.breakdown.timing).toBeGreaterThan(90);
      expect(score.breakdown.accuracy).toBe(100);
      expect(score.breakdown.completeness).toBe(100);
      expect(score.overall).toBeGreaterThan(80);
    });

    it('scores correctly with touch playback speed (0.6x) applied to AI tempo', () => {
      // AI tempo 39 * 0.6 = 23.4 → rounded to 23 BPM
      // Timing windows scaled by 1/0.6 ≈ 1.667x
      const exercise = makeExercise({
        settings: {
          tempo: 23, // 39 * 0.6 rounded
          timeSignature: [4, 4],
          keySignature: 'C',
          countIn: 4,
          metronomeEnabled: true,
        },
        notes: [
          { note: 60, startBeat: 0, durationBeats: 1, hand: 'right' as const },
          { note: 62, startBeat: 1, durationBeats: 1, hand: 'right' as const },
          { note: 64, startBeat: 2, durationBeats: 1, hand: 'right' as const },
          { note: 60, startBeat: 3, durationBeats: 1, hand: 'right' as const },
        ],
        scoring: {
          timingToleranceMs: 133, // 80 * (1/0.6) rounded
          timingGracePeriodMs: 333, // 200 * (1/0.6) rounded
          passingScore: 60,
          starThresholds: [70, 85, 95],
        },
      });

      const msPerBeat = 60000 / 23; // ~2609ms
      const played: MidiNoteEvent[] = [
        note(60, 50),                   // beat 0, 50ms late
        note(62, msPerBeat + 30),       // beat 1, 30ms late
        note(64, msPerBeat * 2 - 20),   // beat 2, 20ms early
        note(60, msPerBeat * 3 + 10),   // beat 3, 10ms late
      ];

      const score = scoreExerciseByType(exercise, played);
      expect(score.breakdown.timing).toBeGreaterThan(90);
      expect(score.breakdown.accuracy).toBe(100);
      expect(score.overall).toBeGreaterThan(80);
    });

    it('simulates full handleCompletion timestamp conversion for AI exercise', () => {
      // This test simulates the exact conversion that useExercisePlayback.handleCompletion does:
      // adjustedTimestamp = n.timestamp - beat0EpochMs - compensation
      // where beat0EpochMs = startTimeRef + countInMs
      const aiTempo = 39;
      const playbackSpeed = 0.6;
      const effectiveTempo = Math.round(aiTempo * playbackSpeed); // 23
      const windowScale = 1 / playbackSpeed; // 1.667

      const exercise = makeExercise({
        settings: {
          tempo: effectiveTempo,
          timeSignature: [4, 4],
          keySignature: 'C',
          countIn: 4,
          metronomeEnabled: true,
        },
        notes: [
          { note: 60, startBeat: 0, durationBeats: 1, hand: 'right' as const },
          { note: 62, startBeat: 1, durationBeats: 1, hand: 'right' as const },
          { note: 64, startBeat: 2, durationBeats: 1, hand: 'right' as const },
          { note: 65, startBeat: 3, durationBeats: 1, hand: 'right' as const },
        ],
        scoring: {
          timingToleranceMs: Math.round(80 * windowScale),
          timingGracePeriodMs: Math.round(200 * windowScale),
          passingScore: 60,
          starThresholds: [70, 85, 95],
        },
      });

      const msPerBeat = 60000 / effectiveTempo;
      const countInMs = 4 * msPerBeat;
      const TOUCH_COMPENSATION = 20;

      // Simulate: startTimeRef = 1000000 (arbitrary epoch time)
      const startTime = 1000000;
      const beat0Epoch = startTime + countInMs;

      // User plays at correct times (epoch timestamps)
      const epochNotes: MidiNoteEvent[] = [
        note(60, beat0Epoch + 15),               // beat 0, 15ms late
        note(62, beat0Epoch + msPerBeat + 25),    // beat 1, 25ms late
        note(64, beat0Epoch + msPerBeat * 2 - 10), // beat 2, 10ms early
        note(65, beat0Epoch + msPerBeat * 3 + 5),  // beat 3, 5ms late
      ];

      // Apply handleCompletion conversion: timestamp - beat0Epoch - compensation
      const adjustedNotes = epochNotes.map((n) => ({
        ...n,
        timestamp: n.timestamp - beat0Epoch - TOUCH_COMPENSATION,
      }));

      const score = scoreExerciseByType(exercise, adjustedNotes);
      // All notes should be within tolerance after proper conversion
      expect(score.breakdown.accuracy).toBe(100);
      expect(score.breakdown.timing).toBeGreaterThan(80);
      expect(score.breakdown.completeness).toBe(100);
      expect(score.missedNotes).toBe(0);
      expect(score.overall).toBeGreaterThan(70);
    });

    it('validates AI exercise durationBeats close-to-valid values are usable', () => {
      // Gemini might return 0.49 instead of 0.5 — validator passes it but doesn't snap
      const exercise = makeExercise({
        settings: {
          tempo: 60,
          timeSignature: [4, 4],
          keySignature: 'C',
          countIn: 4,
          metronomeEnabled: true,
        },
        notes: [
          { note: 60, startBeat: 0, durationBeats: 0.99 },  // close to 1
          { note: 62, startBeat: 1, durationBeats: 0.49 },  // close to 0.5
          { note: 64, startBeat: 1.5, durationBeats: 1.51 }, // close to 1.5
          { note: 60, startBeat: 3, durationBeats: 2.01 },  // close to 2
        ],
        scoring: {
          timingToleranceMs: 80,
          timingGracePeriodMs: 200,
          passingScore: 60,
          starThresholds: [70, 85, 95],
        },
      });

      // 60 BPM → 1000ms per beat
      const played: MidiNoteEvent[] = [
        note(60, 0),
        note(62, 1000),
        note(64, 1500),
        note(60, 3000),
      ];

      const score = scoreExerciseByType(exercise, played);
      // Even with slightly off durationBeats, timing and accuracy should work
      expect(score.breakdown.accuracy).toBe(100);
      expect(score.breakdown.timing).toBe(100);
      expect(score.missedNotes).toBe(0);
    });
  });
});

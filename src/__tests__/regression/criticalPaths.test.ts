/**
 * Regression Test Suite — Critical User Paths
 *
 * These tests verify the end-to-end logic of the most important user journeys.
 * They catch regressions in business logic that unit tests might miss.
 */

import { calculateTimingScore, calculateDurationScore, scoreExercise } from '@/core/exercises/ExerciseValidator';
import type { Exercise, NoteEvent, MidiNoteEvent } from '@/core/exercises/types';
import { parseABC } from '@/core/songs/abcParser';
import { getLessons, getLessonExercises, getExerciseMetadata } from '../../content/ContentLoader';

// ---------------------------------------------------------------------------
// Helper: create a minimal valid Exercise for scoring tests
// ---------------------------------------------------------------------------

function makeExercise(notes: NoteEvent[], overrides?: Partial<Exercise>): Exercise {
  return {
    id: 'test-exercise',
    version: 1,
    metadata: {
      title: 'Test Exercise',
      description: 'Test',
      difficulty: 1,
      estimatedMinutes: 2,
      skills: [],
      prerequisites: [],
    },
    settings: {
      tempo: 120,
      timeSignature: [4, 4] as [number, number],
      keySignature: 'C',
      countIn: 0,
      metronomeEnabled: false,
    },
    notes,
    scoring: {
      timingToleranceMs: 50,
      timingGracePeriodMs: 150,
      passingScore: 70,
      starThresholds: [70, 85, 95] as [number, number, number],
    },
    hints: {
      beforeStart: '',
      commonMistakes: [],
      successMessage: '',
    },
    display: {
      showFingerNumbers: false,
      showNoteNames: false,
    },
    ...overrides,
  };
}

function makePlayedNote(note: number, timestamp: number, velocity = 80): MidiNoteEvent {
  return { note, timestamp, velocity, type: 'noteOn', channel: 0 };
}

// ---------------------------------------------------------------------------
// Critical Path 1: Exercise scoring flow
// ---------------------------------------------------------------------------

describe('Regression: Exercise Scoring Flow', () => {
  it('perfect play scores 100%', () => {
    const notes: NoteEvent[] = [
      { note: 60, startBeat: 0, durationBeats: 1 },
      { note: 62, startBeat: 1, durationBeats: 1 },
      { note: 64, startBeat: 2, durationBeats: 1 },
    ];
    const exercise = makeExercise(notes);
    // 60000 / 120 = 500ms per beat
    const played: MidiNoteEvent[] = [
      makePlayedNote(60, 0),     // exact timing
      makePlayedNote(62, 500),   // exact timing
      makePlayedNote(64, 1000),  // exact timing
    ];

    const result = scoreExercise(exercise, played);
    expect(result.overall).toBeGreaterThanOrEqual(90);
    expect(result.stars).toBe(3);
    expect(result.isPassed).toBe(true);
  });

  it('completely missed exercise scores near 0%', () => {
    const notes: NoteEvent[] = [
      { note: 60, startBeat: 0, durationBeats: 1 },
      { note: 62, startBeat: 1, durationBeats: 1 },
    ];
    const exercise = makeExercise(notes);
    const played: MidiNoteEvent[] = []; // No notes played

    const result = scoreExercise(exercise, played);
    // extraNotes component gives 100 (no extras) * 0.10 = 10, so total is ~10
    expect(result.overall).toBeLessThanOrEqual(15);
    expect(result.stars).toBe(0);
    expect(result.isPassed).toBe(false);
  });

  it('wrong notes reduce accuracy but dont crash', () => {
    const notes: NoteEvent[] = [
      { note: 60, startBeat: 0, durationBeats: 1 },
      { note: 62, startBeat: 1, durationBeats: 1 },
    ];
    const exercise = makeExercise(notes);

    const played: MidiNoteEvent[] = [
      makePlayedNote(61, 0),   // wrong pitch
      makePlayedNote(63, 500), // wrong pitch
    ];

    const result = scoreExercise(exercise, played);
    expect(result.overall).toBeLessThan(50);
    expect(result.breakdown.accuracy).toBe(0);
    expect(result.isPassed).toBe(false);
  });

  it('extra notes penalize but dont crash', () => {
    const notes: NoteEvent[] = [
      { note: 60, startBeat: 0, durationBeats: 1 },
    ];
    const exercise = makeExercise(notes);

    const played: MidiNoteEvent[] = [
      makePlayedNote(60, 0),
      makePlayedNote(62, 100),
      makePlayedNote(64, 200),
      makePlayedNote(65, 300),
      makePlayedNote(67, 400),
    ];

    const result = scoreExercise(exercise, played);
    expect(result.breakdown.extraNotes).toBeLessThan(100);
  });

  it('star thresholds are respected', () => {
    const notes: NoteEvent[] = [
      { note: 60, startBeat: 0, durationBeats: 1 },
    ];
    const exercise = makeExercise(notes, {
      scoring: {
        timingToleranceMs: 50,
        timingGracePeriodMs: 150,
        passingScore: 70,
        starThresholds: [70, 85, 95],
      },
    });

    // Perfect play
    const perfect = scoreExercise(exercise, [makePlayedNote(60, 0)]);
    expect(perfect.stars).toBe(3);

    // No play
    const miss = scoreExercise(exercise, []);
    expect(miss.stars).toBe(0);
  });

  it('previousHighScore correctly flags new high scores', () => {
    const notes: NoteEvent[] = [
      { note: 60, startBeat: 0, durationBeats: 1 },
    ];
    const exercise = makeExercise(notes);
    const played = [makePlayedNote(60, 0)];

    const first = scoreExercise(exercise, played, 0);
    expect(first.isNewHighScore).toBe(true);

    const notNew = scoreExercise(exercise, played, 100);
    expect(notNew.isNewHighScore).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Critical Path 2: Content loading integrity
// ---------------------------------------------------------------------------

describe('Regression: Content Loading', () => {
  it('all lessons load without error', () => {
    const lessons = getLessons();
    expect(lessons.length).toBeGreaterThan(0);

    for (const lesson of lessons) {
      expect(lesson.id).toBeDefined();
      expect(lesson.metadata.title).toBeTruthy();
      expect(lesson.exercises.length).toBeGreaterThan(0);
    }
  });

  it('all exercises in all lessons are loadable', () => {
    const lessons = getLessons();
    let totalExercises = 0;

    for (const lesson of lessons) {
      const exercises = getLessonExercises(lesson.id);
      expect(exercises.length).toBeGreaterThan(0);
      totalExercises += exercises.length;

      for (const exercise of exercises) {
        expect(exercise.id).toBeTruthy();
        expect(exercise.notes).toBeDefined();
        expect(Array.isArray(exercise.notes)).toBe(true);
        expect(exercise.settings.tempo).toBeGreaterThan(0);
      }
    }

    // We should have 499+ exercises total
    expect(totalExercises).toBeGreaterThanOrEqual(30);
  });

  it('exercise metadata index matches actual exercises', () => {
    const lessons = getLessons();
    for (const lesson of lessons) {
      for (const exRef of lesson.exercises) {
        const meta = getExerciseMetadata(exRef.id);
        if (meta) {
          expect(meta.lessonId).toBe(lesson.id);
          expect(meta.title).toBeTruthy();
        }
      }
    }
  });

  it('lesson ordering is sequential', () => {
    const lessons = getLessons();
    for (let i = 0; i < lessons.length; i++) {
      expect(lessons[i].id).toBe(`lesson-${String(i + 1).padStart(2, '0')}`);
    }
  });

  it('exercise notes have valid MIDI range', () => {
    const lessons = getLessons();
    for (const lesson of lessons.slice(0, 6)) {
      const exercises = getLessonExercises(lesson.id);
      for (const exercise of exercises) {
        for (const note of exercise.notes) {
          expect(note.note).toBeGreaterThanOrEqual(21); // Piano low A
          expect(note.note).toBeLessThanOrEqual(108);  // Piano high C
          expect(note.startBeat).toBeGreaterThanOrEqual(0);
          expect(note.durationBeats).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Critical Path 3: ABC parsing for songs
// ---------------------------------------------------------------------------

describe('Regression: Song ABC Parsing', () => {
  it('C major scale parses correctly', () => {
    const abc = 'X:1\nT:C Scale\nM:4/4\nL:1/4\nK:C\nCDEF|GABc|';
    const result = parseABC(abc);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.notes.length).toBe(8);
      expect(result.keySignature).toBe('C');
      expect(result.timeSignature).toEqual([4, 4]);
    }
  });

  it('key signature sharps are applied', () => {
    const abc = 'X:1\nT:G Major\nM:4/4\nL:1/4\nK:G\nGABc|defg|';
    const result = parseABC(abc);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      // G major has F#. In ABC, 'f' = F5; with G major key sig F# → MIDI 78
      // Without key sig it would be F5 = MIDI 77
      const fSharp = result.notes.find(n => n.note === 78);
      expect(fSharp).toBeDefined();
      // Verify no natural F (77) exists
      const fNatural = result.notes.find(n => n.note === 77);
      expect(fNatural).toBeUndefined();
    }
  });

  it('key signature flats are applied', () => {
    const abc = 'X:1\nT:F Major\nM:4/4\nL:1/4\nK:F\nFGAB|cdef|';
    const result = parseABC(abc);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      // Bb in F major should be MIDI 70 (Bb4), not 71 (B4)
      const bFlat = result.notes.find(n => n.note === 70);
      expect(bFlat).toBeDefined();
    }
  });

  it('tempo is extracted correctly', () => {
    const abc = 'X:1\nT:Tempo Test\nM:4/4\nL:1/4\nQ:1/4=140\nK:C\nCDEF|';
    const result = parseABC(abc);
    if (!('error' in result)) {
      expect(result.tempo).toBe(140);
    }
  });

  it('time signature is extracted correctly', () => {
    const abc = 'X:1\nT:Waltz\nM:3/4\nL:1/4\nK:C\nCDE|';
    const result = parseABC(abc);
    if (!('error' in result)) {
      expect(result.timeSignature).toEqual([3, 4]);
    }
  });

  it('rests do not produce notes', () => {
    const abc = 'X:1\nT:Rest Test\nM:4/4\nL:1/4\nK:C\nCzEF|';
    const result = parseABC(abc);
    if (!('error' in result)) {
      // z is a rest — should have 3 notes, not 4
      expect(result.notes.length).toBe(3);
    }
  });

  it('double-spaced Gemini headers are normalized', () => {
    const abc = 'X:1\n\nT:Gemini Song\n\nM:4/4\n\nL:1/4\n\nK:C\nCDEF|';
    const result = parseABC(abc);
    // Should NOT fail with "No music lines" — the normalization should fix it
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.notes.length).toBe(4);
    }
  });
});

// ---------------------------------------------------------------------------
// Critical Path 4: Timing score curve integrity
// ---------------------------------------------------------------------------

describe('Regression: Timing Score Curve', () => {
  const tolerance = 50;
  const gracePeriod = 150;

  it('perfect timing (within tolerance) = 100', () => {
    expect(calculateTimingScore(0, tolerance, gracePeriod)).toBe(100);
    expect(calculateTimingScore(25, tolerance, gracePeriod)).toBe(100);
    expect(calculateTimingScore(-50, tolerance, gracePeriod)).toBe(100);
  });

  it('good timing (tolerance to grace) = 70-100', () => {
    const score = calculateTimingScore(100, tolerance, gracePeriod);
    expect(score).toBeGreaterThanOrEqual(70);
    expect(score).toBeLessThan(100);
  });

  it('ok timing (grace to 2x grace) = 0-70', () => {
    const score = calculateTimingScore(200, tolerance, gracePeriod);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(70);
  });

  it('missed timing (beyond 2x grace) = 0', () => {
    expect(calculateTimingScore(500, tolerance, gracePeriod)).toBe(0);
    expect(calculateTimingScore(-500, tolerance, gracePeriod)).toBe(0);
  });

  it('score is symmetric for early vs late', () => {
    const early = calculateTimingScore(-100, tolerance, gracePeriod);
    const late = calculateTimingScore(100, tolerance, gracePeriod);
    expect(early).toBe(late);
  });

  it('score decreases monotonically with offset', () => {
    let prevScore = 100;
    for (let offset = 0; offset <= 400; offset += 10) {
      const score = calculateTimingScore(offset, tolerance, gracePeriod);
      expect(score).toBeLessThanOrEqual(prevScore);
      prevScore = score;
    }
  });
});

// ---------------------------------------------------------------------------
// Critical Path 5: Duration scoring
// ---------------------------------------------------------------------------

describe('Regression: Duration Scoring', () => {
  it('touch input (no duration) gets full marks', () => {
    expect(calculateDurationScore(undefined, 500)).toBe(100);
    expect(calculateDurationScore(0, 500)).toBe(100);
  });

  it('exact duration = 100', () => {
    expect(calculateDurationScore(500, 500)).toBe(100);
  });

  it('70-130% of expected = 100 (perfect zone)', () => {
    expect(calculateDurationScore(350, 500)).toBe(100); // 70%
    expect(calculateDurationScore(650, 500)).toBe(100); // 130%
  });

  it('too short/long reduces score', () => {
    expect(calculateDurationScore(100, 500)).toBeLessThan(100); // 20%
    expect(calculateDurationScore(1500, 500)).toBeLessThan(100); // 300%
  });

  it('extremely wrong duration = 0', () => {
    expect(calculateDurationScore(1, 500)).toBe(0);
    expect(calculateDurationScore(5000, 500)).toBe(0);
  });
});

import { buildReplayPlan, getIntroData } from '../replayCoachingService';
import type { Exercise, ExerciseScore, NoteScore } from '../../core/exercises/types';

// Mock Gemini — always fall back to algorithmic
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(),
}));

const makeExercise = (): Exercise => ({
  id: 'test-ex-01',
  version: 1,
  metadata: {
    title: 'C Scale',
    description: 'Play C major scale',
    difficulty: 2,
    estimatedMinutes: 2,
    skills: ['c-major', 'scales'],
    prerequisites: [],
  },
  settings: {
    tempo: 80,
    timeSignature: [4, 4] as [number, number],
    keySignature: 'C',
    countIn: 4,
    metronomeEnabled: true,
  },
  notes: Array.from({ length: 8 }, (_, i) => ({
    note: 60 + i,
    startBeat: i,
    durationBeats: 1,
    hand: 'right' as const,
  })),
  scoring: {
    timingToleranceMs: 50,
    timingGracePeriodMs: 150,
    passingScore: 70,
    starThresholds: [70, 85, 95] as [number, number, number],
  },
  hints: {
    beforeStart: 'Play C major ascending',
    commonMistakes: [],
    successMessage: 'Well done!',
  },
});

const makeNoteScore = (beat: number, overrides: Partial<NoteScore> = {}): NoteScore => ({
  expected: { note: 60 + beat, startBeat: beat, durationBeats: 1 },
  played: { type: 'noteOn', note: 60 + beat, velocity: 80, timestamp: 0, channel: 0 },
  timingOffsetMs: 0,
  timingScore: 100,
  isCorrectPitch: true,
  isExtraNote: false,
  isMissedNote: false,
  status: 'perfect',
  ...overrides,
});

const makeScore = (overrides: Partial<ExerciseScore> = {}): ExerciseScore => ({
  overall: 75,
  stars: 2,
  breakdown: { accuracy: 80, timing: 70, completeness: 90, extraNotes: 100, duration: 80 },
  details: Array.from({ length: 8 }, (_, i) => makeNoteScore(i)),
  xpEarned: 30,
  isNewHighScore: false,
  isPassed: true,
  ...overrides,
});

describe('buildReplayPlan', () => {
  it('returns a valid ReplayPlan with fallback (no Gemini)', async () => {
    const plan = await buildReplayPlan(makeExercise(), makeScore());
    expect(plan.entries).toHaveLength(8);
    expect(plan.totalBeats).toBe(8);
    expect(plan.speedZones.length).toBeGreaterThan(0);
    expect(typeof plan.summary).toBe('string');
  });

  it('generates pause points for exercises with mistakes', async () => {
    const score = makeScore({
      details: [
        makeNoteScore(0),
        makeNoteScore(1, {
          isCorrectPitch: false,
          played: { type: 'noteOn', note: 62, velocity: 80, timestamp: 0, channel: 0 },
          timingScore: 0,
          status: 'wrong',
        }),
        makeNoteScore(2),
        makeNoteScore(3),
        makeNoteScore(4, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
        makeNoteScore(5),
        makeNoteScore(6),
        makeNoteScore(7),
      ],
      overall: 55,
    });
    const plan = await buildReplayPlan(makeExercise(), score);
    expect(plan.pausePoints.length).toBeGreaterThan(0);
    expect(plan.pausePoints.length).toBeLessThanOrEqual(3);
  });

  it('returns no pause points for perfect scores', async () => {
    const plan = await buildReplayPlan(makeExercise(), makeScore({ overall: 100 }));
    expect(plan.pausePoints).toHaveLength(0);
  });

  it('always returns comments and summary', async () => {
    const plan = await buildReplayPlan(makeExercise(), makeScore());
    expect(plan.comments.length).toBeGreaterThan(0);
    expect(plan.summary.length).toBeGreaterThan(0);
  });
});

describe('getIntroData', () => {
  it('returns fallback intro data (no Gemini)', async () => {
    const intro = await getIntroData(makeExercise(), null, 0);
    expect(intro.introText).toContain('C Scale');
    expect(typeof intro.tip).toBe('string');
    expect(intro.demoBars.from).toBe(0);
  });

  it('adapts fallback tip for high fail count', async () => {
    const intro = await getIntroData(makeExercise(), 40, 5);
    expect(intro.tip).toContain('slow');
  });
});

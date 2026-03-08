/**
 * Integration Test: Salsa Coaching Loop (Replay Flow)
 *
 * Tests the full replay coaching pipeline:
 * - buildReplayPlan produces valid plans from exercise scores
 * - Pause points correctly target worst-performing notes
 * - Note color mapping from NoteScore
 * - AI response parsing and capping
 * - Intro data fallback when no API key is available
 */

import { buildReplayPlan, getIntroData } from '../../services/replayCoachingService';
import {
  buildReplayEntries,
  scoreToColor,
} from '../../core/exercises/replayTypes';
import { parseReplayResponse } from '../../services/ai/ReplayPromptBuilder';
import type {
  Exercise,
  ExerciseScore,
  NoteScore,
  NoteEvent,
} from '../../core/exercises/types';

// Mock Gemini -- forces algorithmic fallback (no API key in test env)
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(),
}));

// --- Helpers ---

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'replay-test-ex',
    version: 1,
    metadata: {
      title: 'C-D-E-F-G-A-B-C',
      description: 'Play one octave of C major',
      difficulty: 2,
      estimatedMinutes: 2,
      skills: ['c-major', 'right-hand'],
      prerequisites: [],
    },
    settings: {
      tempo: 120,
      timeSignature: [4, 4] as [number, number],
      keySignature: 'C',
      countIn: 4,
      metronomeEnabled: true,
    },
    notes: Array.from({ length: 8 }, (_, i): NoteEvent => ({
      note: 60 + i,
      startBeat: i,
      durationBeats: 1,
      hand: 'right',
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
      successMessage: 'Great job!',
    },
    ...overrides,
  };
}

function makeNoteScore(beat: number, overrides: Partial<NoteScore> = {}): NoteScore {
  return {
    expected: { note: 60 + beat, startBeat: beat, durationBeats: 1 },
    played: { type: 'noteOn', note: 60 + beat, velocity: 80, timestamp: 0, channel: 0 },
    timingOffsetMs: 0,
    timingScore: 100,
    isCorrectPitch: true,
    isExtraNote: false,
    isMissedNote: false,
    status: 'perfect',
    ...overrides,
  };
}

function makeScore(overrides: Partial<ExerciseScore> = {}): ExerciseScore {
  return {
    overall: 75,
    stars: 2,
    breakdown: { accuracy: 80, timing: 70, completeness: 90, extraNotes: 100, duration: 80 },
    details: Array.from({ length: 8 }, (_, i) => makeNoteScore(i)),
    xpEarned: 30,
    isNewHighScore: false,
    isPassed: true,
    ...overrides,
  };
}

// --- Tests ---

describe('Salsa Coaching Loop — Replay Flow Integration', () => {
  describe('buildReplayPlan produces valid plan from exercise score with mistakes', () => {
    it('returns correct entry count, totalBeats, pausePoints range, speedZones, summary, and comments', async () => {
      const details: NoteScore[] = [
        makeNoteScore(0), // correct
        makeNoteScore(1), // correct
        makeNoteScore(2, {
          isMissedNote: true,
          played: null,
          timingScore: 0,
          status: 'missed',
        }),
        makeNoteScore(3), // correct
        makeNoteScore(4), // correct
        makeNoteScore(5, {
          isCorrectPitch: false,
          played: { type: 'noteOn', note: 68, velocity: 80, timestamp: 0, channel: 0 },
          timingScore: 0,
          status: 'wrong',
        }),
        makeNoteScore(6), // correct
        makeNoteScore(7), // correct
      ];

      const score = makeScore({ details, overall: 60 });
      const plan = await buildReplayPlan(makeExercise(), score);

      expect(plan.entries).toHaveLength(8);
      expect(plan.totalBeats).toBeGreaterThan(0);
      expect(plan.pausePoints.length).toBeGreaterThanOrEqual(1);
      expect(plan.pausePoints.length).toBeLessThanOrEqual(3);
      expect(Array.isArray(plan.speedZones)).toBe(true);
      expect(plan.speedZones.length).toBeGreaterThan(0);
      expect(typeof plan.summary).toBe('string');
      expect(plan.summary.length).toBeGreaterThan(0);
      expect(Array.isArray(plan.comments)).toBe(true);
    });
  });

  describe('buildReplayPlan produces plan with no pause points for perfect score', () => {
    it('returns zero pause points when all notes are correct with high timing scores', async () => {
      const perfectDetails = Array.from({ length: 8 }, (_, i) =>
        makeNoteScore(i, { timingScore: 100, status: 'perfect' }),
      );
      const score = makeScore({ details: perfectDetails, overall: 100 });
      const plan = await buildReplayPlan(makeExercise(), score);

      expect(plan.pausePoints).toHaveLength(0);
    });
  });

  describe('pause points target the worst notes', () => {
    it('places pause points at beat positions matching missed and wrong-pitch notes', async () => {
      const details: NoteScore[] = [
        makeNoteScore(0),
        makeNoteScore(1),
        makeNoteScore(2),
        makeNoteScore(3),
        makeNoteScore(4, {
          isMissedNote: true,
          played: null,
          timingScore: 0,
          status: 'missed',
        }),
        makeNoteScore(5),
        makeNoteScore(6),
        makeNoteScore(7),
      ];

      const score = makeScore({ details, overall: 65 });
      const plan = await buildReplayPlan(makeExercise(), score);

      // The missed note at beat 4 should produce a pause point at that beat
      const pauseBeatPositions = plan.pausePoints.map((pp) => pp.beatPosition);
      expect(pauseBeatPositions).toContain(4);
    });

    it('targets wrong pitch notes with highest priority', async () => {
      // Wrong pitch at beat 1, missed at beat 5 (>= 4 beats apart)
      const details: NoteScore[] = [
        makeNoteScore(0),
        makeNoteScore(1, {
          isCorrectPitch: false,
          played: { type: 'noteOn', note: 63, velocity: 80, timestamp: 0, channel: 0 },
          timingScore: 0,
          status: 'wrong',
        }),
        makeNoteScore(2),
        makeNoteScore(3),
        makeNoteScore(4),
        makeNoteScore(5, {
          isMissedNote: true,
          played: null,
          timingScore: 0,
          status: 'missed',
        }),
        makeNoteScore(6),
        makeNoteScore(7),
      ];

      const score = makeScore({ details, overall: 55 });
      const plan = await buildReplayPlan(makeExercise(), score);

      const pauseBeatPositions = plan.pausePoints.map((pp) => pp.beatPosition);
      // Wrong pitch (priority 1) at beat 1 should appear first
      expect(pauseBeatPositions[0]).toBe(1);
    });
  });

  describe('buildReplayEntries correctly maps NoteScore colors', () => {
    it('maps missed to grey, wrong pitch to red, good timing to green, poor timing to yellow', () => {
      const details: NoteScore[] = [
        // Missed note -> grey
        makeNoteScore(0, {
          isMissedNote: true,
          played: null,
          timingScore: 0,
          status: 'missed',
        }),
        // Wrong pitch -> red
        makeNoteScore(1, {
          isCorrectPitch: false,
          played: { type: 'noteOn', note: 63, velocity: 80, timestamp: 0, channel: 0 },
          timingScore: 0,
          status: 'wrong',
        }),
        // Good timing (>= 70) -> green
        makeNoteScore(2, {
          timingScore: 85,
          status: 'good',
        }),
        // Poor timing (30-69) -> yellow
        makeNoteScore(3, {
          timingScore: 45,
          status: 'ok',
        }),
        // Very poor timing (< 30) -> red
        makeNoteScore(4, {
          timingScore: 10,
          status: 'late',
        }),
      ];

      // Verify scoreToColor directly
      expect(scoreToColor(details[0])).toBe('grey');
      expect(scoreToColor(details[1])).toBe('red');
      expect(scoreToColor(details[2])).toBe('green');
      expect(scoreToColor(details[3])).toBe('yellow');
      expect(scoreToColor(details[4])).toBe('red');

      // Verify buildReplayEntries propagates colors correctly
      const entries = buildReplayEntries(details);
      expect(entries[0].color).toBe('grey');
      expect(entries[1].color).toBe('red');
      expect(entries[2].color).toBe('green');
      expect(entries[3].color).toBe('yellow');
      expect(entries[4].color).toBe('red');
    });

    it('maps extra notes to purple via scoreToColor', () => {
      const extraNote = makeNoteScore(0, {
        isExtraNote: true,
      });
      expect(scoreToColor(extraNote)).toBe('purple');
    });

    it('filters out extra notes from replay entries', () => {
      const details: NoteScore[] = [
        makeNoteScore(0),
        makeNoteScore(1, { isExtraNote: true }),
        makeNoteScore(2),
      ];
      const entries = buildReplayEntries(details);
      // Extra notes are excluded from replay entries
      expect(entries).toHaveLength(2);
    });
  });

  describe('parseReplayResponse handles valid JSON', () => {
    it('parses a well-formed JSON string into ReplayAIResponse', () => {
      const validJson = JSON.stringify({
        pausePoints: [
          {
            beatPosition: 4,
            type: 'wrong_pitch',
            explanation: 'You played D4 instead of C4.',
            showCorrectFromBeat: 0,
            showCorrectToBeat: 8,
          },
        ],
        continuousComments: [
          { beatPosition: 0, text: 'Good start!' },
          { beatPosition: 4, text: 'Watch here!' },
        ],
        summary: 'Nice effort! Focus on the middle section.',
      });

      const result = parseReplayResponse(validJson);
      expect(result).not.toBeNull();
      expect(result!.pausePoints).toHaveLength(1);
      expect(result!.pausePoints[0].beatPosition).toBe(4);
      expect(result!.pausePoints[0].type).toBe('wrong_pitch');
      expect(result!.continuousComments).toHaveLength(2);
      expect(result!.summary).toBe('Nice effort! Focus on the middle section.');
    });

    it('handles JSON wrapped in markdown code fences', () => {
      const wrappedJson = '```json\n{"pausePoints":[],"continuousComments":[],"summary":"Great!"}\n```';
      const result = parseReplayResponse(wrappedJson);
      expect(result).not.toBeNull();
      expect(result!.summary).toBe('Great!');
    });

    it('returns null for invalid JSON', () => {
      expect(parseReplayResponse('not json at all')).toBeNull();
    });

    it('returns null for JSON missing required fields', () => {
      const incomplete = JSON.stringify({ pausePoints: [] });
      expect(parseReplayResponse(incomplete)).toBeNull();
    });
  });

  describe('parseReplayResponse caps at 3 pause points and 5 comments', () => {
    it('truncates excess pause points to 3 and comments to 5', () => {
      const overflowJson = JSON.stringify({
        pausePoints: [
          { beatPosition: 0, type: 'general', explanation: 'PP1', showCorrectFromBeat: 0, showCorrectToBeat: 4 },
          { beatPosition: 4, type: 'general', explanation: 'PP2', showCorrectFromBeat: 0, showCorrectToBeat: 8 },
          { beatPosition: 8, type: 'general', explanation: 'PP3', showCorrectFromBeat: 4, showCorrectToBeat: 12 },
          { beatPosition: 12, type: 'general', explanation: 'PP4', showCorrectFromBeat: 8, showCorrectToBeat: 16 },
          { beatPosition: 16, type: 'general', explanation: 'PP5', showCorrectFromBeat: 12, showCorrectToBeat: 20 },
        ],
        continuousComments: [
          { beatPosition: 0, text: 'Go!' },
          { beatPosition: 2, text: 'Nice!' },
          { beatPosition: 4, text: 'Keep it up!' },
          { beatPosition: 6, text: 'Almost!' },
          { beatPosition: 8, text: 'Great!' },
          { beatPosition: 10, text: 'Wow!' },
          { beatPosition: 12, text: 'Strong!' },
          { beatPosition: 14, text: 'Finish!' },
        ],
        summary: 'Good work overall.',
      });

      const result = parseReplayResponse(overflowJson);
      expect(result).not.toBeNull();
      expect(result!.pausePoints).toHaveLength(3);
      expect(result!.continuousComments).toHaveLength(5);
    });
  });

  describe('getIntroData returns fallback when no API key', () => {
    it('returns introText and tip as non-empty strings', async () => {
      const exercise = makeExercise();
      const intro = await getIntroData(exercise, null, 0);

      expect(typeof intro.introText).toBe('string');
      expect(intro.introText.length).toBeGreaterThan(0);
      expect(typeof intro.tip).toBe('string');
      expect(intro.tip.length).toBeGreaterThan(0);
    });

    it('includes the exercise title in the intro text', async () => {
      const exercise = makeExercise();
      const intro = await getIntroData(exercise, null, 0);

      expect(intro.introText).toContain(exercise.metadata.title);
    });

    it('provides demoBars starting at 0', async () => {
      const exercise = makeExercise();
      const intro = await getIntroData(exercise, null, 0);

      expect(intro.demoBars.from).toBe(0);
      expect(intro.demoBars.to).toBeGreaterThan(0);
    });

    it('adapts tip for high fail count', async () => {
      const exercise = makeExercise();
      const intro = await getIntroData(exercise, 40, 5);

      expect(intro.tip).toContain('slow');
    });
  });
});

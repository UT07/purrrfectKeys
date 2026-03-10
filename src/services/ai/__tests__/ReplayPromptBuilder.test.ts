import {
  buildReplayPrompt,
  buildIntroPrompt,
  parseReplayResponse,
  parseIntroResponse,
} from '../ReplayPromptBuilder';
import type { NoteScore } from '../../../core/exercises/types';

const makeNoteScore = (beat: number, overrides: Partial<NoteScore> = {}): NoteScore => ({
  expected: { note: 60, startBeat: beat, durationBeats: 1 },
  played: { type: 'noteOn', note: 60, velocity: 80, timestamp: 0, channel: 0 },
  timingOffsetMs: 0,
  timingScore: 100,
  isCorrectPitch: true,
  isExtraNote: false,
  isMissedNote: false,
  status: 'perfect',
  ...overrides,
});

describe('buildReplayPrompt', () => {
  it('includes actual note names and score', () => {
    const details = [makeNoteScore(0), makeNoteScore(1)];
    const prompt = buildReplayPrompt('C Scale', 2, details, 85);
    // Prompt uses actual note names from details, not the exercise title
    expect(prompt).toContain('C4');
    expect(prompt).toContain('85%');
  });

  it('marks missed notes', () => {
    const details = [makeNoteScore(0, { isMissedNote: true, played: null })];
    const prompt = buildReplayPrompt('Test', 1, details, 50);
    expect(prompt).toContain('MISSED');
  });

  it('marks wrong pitch notes', () => {
    const details = [makeNoteScore(0, {
      isCorrectPitch: false,
      played: { type: 'noteOn', note: 62, velocity: 80, timestamp: 0, channel: 0 },
    })];
    const prompt = buildReplayPrompt('Test', 1, details, 50);
    expect(prompt).toContain('WRONG PITCH');
    expect(prompt).toContain('D4');
  });

  it('filters out extra notes', () => {
    const details = [
      makeNoteScore(0),
      makeNoteScore(2, { isExtraNote: true }),
    ];
    const prompt = buildReplayPrompt('Test', 1, details, 80);
    expect(prompt).not.toContain('Beat 2');
  });
});

describe('buildIntroPrompt', () => {
  it('includes exercise metadata', () => {
    const prompt = buildIntroPrompt('C Scale', 2, ['c-major', 'scales'], 16, null, 0);
    expect(prompt).toContain('C Scale');
    expect(prompt).toContain('c-major');
    expect(prompt).toContain('first attempt');
  });

  it('mentions fail count when >= 3', () => {
    const prompt = buildIntroPrompt('Hard Ex', 4, ['chords'], 32, 45, 5);
    expect(prompt).toContain('failed this exercise 5 times');
  });

  it('includes previous score', () => {
    const prompt = buildIntroPrompt('Review', 2, ['scales'], 16, 72, 1);
    expect(prompt).toContain('72%');
  });
});

describe('parseReplayResponse', () => {
  it('parses valid JSON', () => {
    const json = JSON.stringify({
      pausePoints: [{ beatPosition: 4, type: 'wrong_pitch', explanation: 'test', showCorrectFromBeat: 2, showCorrectToBeat: 6 }],
      continuousComments: [{ beatPosition: 0, text: 'Nice!' }],
      summary: 'Good job',
    });
    const result = parseReplayResponse(json);
    expect(result).not.toBeNull();
    expect(result!.pausePoints).toHaveLength(1);
    expect(result!.summary).toBe('Good job');
  });

  it('handles markdown-wrapped JSON', () => {
    const wrapped = '```json\n{"pausePoints":[],"continuousComments":[],"summary":"ok"}\n```';
    const result = parseReplayResponse(wrapped);
    expect(result).not.toBeNull();
  });

  it('caps pause points at 3', () => {
    const json = JSON.stringify({
      pausePoints: Array.from({ length: 5 }, (_, i) => ({
        beatPosition: i * 4, type: 'general', explanation: 'x',
        showCorrectFromBeat: 0, showCorrectToBeat: 4,
      })),
      continuousComments: [],
      summary: 'ok',
    });
    const result = parseReplayResponse(json);
    expect(result!.pausePoints).toHaveLength(3);
  });

  it('returns null for invalid JSON', () => {
    expect(parseReplayResponse('not json')).toBeNull();
    expect(parseReplayResponse('{"pausePoints": "wrong"}')).toBeNull();
  });
});

describe('parseIntroResponse', () => {
  it('parses valid JSON', () => {
    const json = JSON.stringify({
      introText: 'Learn C scale',
      tip: 'Keep wrist relaxed',
      highlightBeats: [4, 8],
      demoBars: { from: 0, to: 8 },
    });
    const result = parseIntroResponse(json);
    expect(result).not.toBeNull();
    expect(result!.introText).toBe('Learn C scale');
  });

  it('returns null for missing fields', () => {
    expect(parseIntroResponse('{"introText": "hi"}')).toBeNull();
  });
});

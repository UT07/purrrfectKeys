import {
  selectAlgorithmicPausePoints,
  generateFallbackComments,
  generateFallbackSummary,
} from '../replayFallback';
import type { NoteScore } from '../../core/exercises/types';

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

describe('selectAlgorithmicPausePoints', () => {
  it('returns empty for perfect scores', () => {
    const details = Array.from({ length: 10 }, (_, i) => makeNoteScore(i));
    expect(selectAlgorithmicPausePoints(details)).toHaveLength(0);
  });

  it('selects wrong pitch notes first', () => {
    const details = [
      makeNoteScore(0),
      makeNoteScore(4, {
        isCorrectPitch: false,
        played: { type: 'noteOn', note: 62, velocity: 80, timestamp: 0, channel: 0 },
        timingScore: 0,
        status: 'wrong',
      }),
      makeNoteScore(8, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
      makeNoteScore(12),
    ];
    const points = selectAlgorithmicPausePoints(details);
    expect(points.length).toBeGreaterThanOrEqual(1);
    expect(points[0].type).toBe('wrong_pitch');
    expect(points[0].explanation).toContain('D4');
    expect(points[0].explanation).toContain('C4');
  });

  it('caps at 3 pause points', () => {
    const details = Array.from({ length: 20 }, (_, i) =>
      makeNoteScore(i, {
        isMissedNote: true,
        played: null,
        timingScore: 0,
        status: 'missed',
      }),
    );
    expect(selectAlgorithmicPausePoints(details).length).toBeLessThanOrEqual(3);
  });

  it('ensures pause points are at least 4 beats apart', () => {
    const details = [
      makeNoteScore(0, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
      makeNoteScore(1, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
      makeNoteScore(2, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
      makeNoteScore(8, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
      makeNoteScore(16),
    ];
    const points = selectAlgorithmicPausePoints(details);
    for (let i = 1; i < points.length; i++) {
      expect(Math.abs(points[i].beatPosition - points[i - 1].beatPosition)).toBeGreaterThanOrEqual(4);
    }
  });

  it('generates timing explanations', () => {
    const details = [
      makeNoteScore(0, { timingOffsetMs: 150, timingScore: 30, status: 'late' }),
      makeNoteScore(8),
    ];
    const points = selectAlgorithmicPausePoints(details);
    expect(points[0].type).toBe('timing_drag');
    expect(points[0].explanation).toContain('late');
  });

  it('skips issues in the last 2 beats', () => {
    const details = [
      makeNoteScore(0),
      makeNoteScore(8),
      makeNoteScore(9, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
    ];
    // Last note at beat 9, maxBeat = 10, so beat 9 > 10-2=8, should be skipped
    const points = selectAlgorithmicPausePoints(details);
    expect(points).toHaveLength(0);
  });
});

describe('generateFallbackComments', () => {
  it('returns up to 5 comments', () => {
    const details = Array.from({ length: 20 }, (_, i) => makeNoteScore(i));
    const comments = generateFallbackComments(details, 20);
    expect(comments.length).toBeLessThanOrEqual(5);
    expect(comments[0].text).toBe('Good start!');
  });

  it('distributes comments evenly', () => {
    const comments = generateFallbackComments([], 20);
    const beats = comments.map((c) => c.beatPosition);
    // Should be spread across the exercise, not bunched up
    expect(beats[beats.length - 1]).toBeGreaterThan(10);
  });
});

describe('generateFallbackSummary', () => {
  it('returns celebratory text for high scores', () => {
    const details = Array.from({ length: 5 }, (_, i) => makeNoteScore(i));
    expect(generateFallbackSummary(details, 98)).toContain('flawless');
  });

  it('mentions specific issues for lower scores', () => {
    const details = [
      makeNoteScore(0, { isMissedNote: true, played: null }),
      makeNoteScore(4, { isCorrectPitch: false, played: { type: 'noteOn', note: 62, velocity: 80, timestamp: 0, channel: 0 } }),
    ];
    const summary = generateFallbackSummary(details, 45);
    expect(summary).toContain('wrong note');
    expect(summary).toContain('missed note');
  });
});

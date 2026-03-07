import {
  scoreToColor,
  buildReplayEntries,
  buildSpeedZones,
  type ReplayScheduleEntry,
  type PausePoint,
} from '../replayTypes';
import type { NoteScore } from '../types';

const makeNoteScore = (overrides: Partial<NoteScore> = {}): NoteScore => ({
  expected: { note: 60, startBeat: 0, durationBeats: 1 },
  played: { type: 'noteOn', note: 60, velocity: 80, timestamp: 0, channel: 0 },
  timingOffsetMs: 0,
  timingScore: 100,
  isCorrectPitch: true,
  isExtraNote: false,
  isMissedNote: false,
  status: 'perfect',
  ...overrides,
});

describe('scoreToColor', () => {
  it('returns green for perfect/good notes', () => {
    expect(scoreToColor(makeNoteScore({ timingScore: 100 }))).toBe('green');
    expect(scoreToColor(makeNoteScore({ timingScore: 70 }))).toBe('green');
  });

  it('returns yellow for ok notes', () => {
    expect(scoreToColor(makeNoteScore({ timingScore: 50 }))).toBe('yellow');
    expect(scoreToColor(makeNoteScore({ timingScore: 30 }))).toBe('yellow');
  });

  it('returns red for poor timing or wrong pitch', () => {
    expect(scoreToColor(makeNoteScore({ timingScore: 20 }))).toBe('red');
    expect(scoreToColor(makeNoteScore({ isCorrectPitch: false }))).toBe('red');
  });

  it('returns grey for missed notes', () => {
    expect(scoreToColor(makeNoteScore({ isMissedNote: true, played: null }))).toBe('grey');
  });

  it('returns purple for extra notes', () => {
    expect(scoreToColor(makeNoteScore({ isExtraNote: true }))).toBe('purple');
  });
});

describe('buildReplayEntries', () => {
  it('maps NoteScore[] to ReplayScheduleEntry[]', () => {
    const details: NoteScore[] = [
      makeNoteScore({ timingScore: 100, timingOffsetMs: 5, status: 'perfect' }),
      makeNoteScore({
        expected: { note: 62, startBeat: 1, durationBeats: 1 },
        isMissedNote: true,
        played: null,
        timingScore: 0,
        status: 'missed',
      }),
    ];

    const entries = buildReplayEntries(details);
    expect(entries).toHaveLength(2);
    expect(entries[0].play).toBe(true);
    expect(entries[0].jitterMs).toBe(5);
    expect(entries[0].color).toBe('green');
    expect(entries[1].play).toBe(false);
    expect(entries[1].color).toBe('grey');
  });

  it('filters out extra notes', () => {
    const details: NoteScore[] = [
      makeNoteScore({}),
      makeNoteScore({ isExtraNote: true }),
    ];
    expect(buildReplayEntries(details)).toHaveLength(1);
  });

  it('captures playedNote for wrong pitch', () => {
    const details: NoteScore[] = [
      makeNoteScore({
        isCorrectPitch: false,
        played: { type: 'noteOn', note: 62, velocity: 80, timestamp: 0, channel: 0 },
      }),
    ];
    const entries = buildReplayEntries(details);
    expect(entries[0].playedNote).toBe(62);
  });
});

describe('buildSpeedZones', () => {
  it('returns single normal zone for short exercises', () => {
    const entries: ReplayScheduleEntry[] = Array.from({ length: 10 }, (_, i) => ({
      note: { note: 60, startBeat: i, durationBeats: 1 },
      play: true,
      jitterMs: 0,
      status: 'perfect' as const,
      color: 'green' as const,
    }));
    const zones = buildSpeedZones(entries, [], 10);
    expect(zones).toHaveLength(1);
    expect(zones[0].zone).toBe('normal');
  });

  it('creates fast zones for long exercises with all-green sections', () => {
    const entries: ReplayScheduleEntry[] = Array.from({ length: 40 }, (_, i) => ({
      note: { note: 60, startBeat: i, durationBeats: 1 },
      play: true,
      jitterMs: 0,
      status: 'perfect' as const,
      color: 'green' as const,
    }));
    const zones = buildSpeedZones(entries, [], 40);
    expect(zones.some((z) => z.zone === 'fast')).toBe(true);
  });

  it('keeps ±4 beats around pause points as normal', () => {
    const entries: ReplayScheduleEntry[] = Array.from({ length: 40 }, (_, i) => ({
      note: { note: 60, startBeat: i, durationBeats: 1 },
      play: true,
      jitterMs: 0,
      status: 'perfect' as const,
      color: 'green' as const,
    }));
    const pausePoints: PausePoint[] = [
      { beatPosition: 20, type: 'wrong_pitch', explanation: '', showCorrectFromBeat: 18, showCorrectToBeat: 22 },
    ];
    const zones = buildSpeedZones(entries, pausePoints, 40);
    const zoneAt20 = zones.find((z) => z.fromBeat <= 20 && z.toBeat > 20);
    expect(zoneAt20?.zone).toBe('normal');
  });
});

/**
 * Tests for DemoPlaybackService
 *
 * Tests the demo playback system that auto-plays exercises at reduced tempo
 * with passing-threshold quality (85% notes, slight timing jitter).
 */

import { DemoPlaybackService, generateDemoSchedule } from '../demoPlayback';
import type { NoteEvent } from '@/core/exercises/types';

// Mock audio engine matching the IAudioEngine interface shape
const createMockAudioEngine = () => ({
  playNote: jest.fn().mockReturnValue({ note: 0, startTime: 0, release: jest.fn() }),
  releaseNote: jest.fn(),
});

// ============================================================================
// generateDemoSchedule
// ============================================================================

describe('generateDemoSchedule', () => {
  const notes: NoteEvent[] = [
    { note: 60, startBeat: 0, durationBeats: 1 },
    { note: 64, startBeat: 1, durationBeats: 1 },
    { note: 67, startBeat: 2, durationBeats: 1 },
    { note: 72, startBeat: 3, durationBeats: 1 },
  ];

  it('includes all notes in the schedule', () => {
    const schedule = generateDemoSchedule(notes);
    expect(schedule).toHaveLength(notes.length);
  });

  it('each entry references the original note', () => {
    const schedule = generateDemoSchedule(notes);
    schedule.forEach((entry, i) => {
      expect(entry.note).toBe(notes[i]);
    });
  });

  it('generates a schedule with ~85% play rate over many runs', () => {
    // Run enough times to smooth out randomness
    const runs = 20;
    const results = Array.from({ length: runs }, () => generateDemoSchedule(notes));
    const avgPlayedRatio =
      results.reduce(
        (sum, schedule) => sum + schedule.filter((s) => s.play).length / notes.length,
        0,
      ) / runs;

    // Should be roughly 85% +/- 15%
    expect(avgPlayedRatio).toBeGreaterThan(0.6);
    expect(avgPlayedRatio).toBeLessThan(1.0);
  });

  it('adds timing jitter to some played notes', () => {
    // Run enough times — at least one run should have jitter
    const anyJitter = Array.from({ length: 10 }, () =>
      generateDemoSchedule(notes).some((s) => s.play && s.jitterMs !== 0),
    ).some(Boolean);
    expect(anyJitter).toBe(true);
  });

  it('jitter values are within +-40ms range', () => {
    // Generate many schedules and check all jitter values
    for (let i = 0; i < 50; i++) {
      const schedule = generateDemoSchedule(notes);
      for (const entry of schedule) {
        expect(entry.jitterMs).toBeGreaterThanOrEqual(-40);
        expect(entry.jitterMs).toBeLessThanOrEqual(40);
      }
    }
  });

  it('skipped notes have zero jitter', () => {
    // Generate many schedules
    for (let i = 0; i < 20; i++) {
      const schedule = generateDemoSchedule(notes);
      for (const entry of schedule) {
        if (!entry.play) {
          expect(entry.jitterMs).toBe(0);
        }
      }
    }
  });

  it('handles empty notes array', () => {
    const schedule = generateDemoSchedule([]);
    expect(schedule).toHaveLength(0);
  });

  it('handles single note', () => {
    const schedule = generateDemoSchedule([notes[0]]);
    expect(schedule).toHaveLength(1);
    expect(schedule[0].note).toBe(notes[0]);
    expect(typeof schedule[0].play).toBe('boolean');
    expect(typeof schedule[0].jitterMs).toBe('number');
  });
});

// ============================================================================
// DemoPlaybackService
// ============================================================================

describe('DemoPlaybackService', () => {
  let mockAudioEngine: ReturnType<typeof createMockAudioEngine>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockAudioEngine = createMockAudioEngine();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const makeExercise = (overrides: Record<string, unknown> = {}) => ({
    id: 'test-exercise',
    notes: [
      { note: 60, startBeat: 0, durationBeats: 1 },
      { note: 64, startBeat: 1, durationBeats: 1 },
      { note: 67, startBeat: 2, durationBeats: 1 },
    ] as NoteEvent[],
    settings: {
      tempo: 120,
      countIn: 0,
      timeSignature: [4, 4] as [number, number],
      keySignature: 'C',
      metronomeEnabled: false,
    },
    ...overrides,
  });

  // ---------- Lifecycle ----------

  it('starts and reports isPlaying = true', () => {
    const service = new DemoPlaybackService();
    service.start(makeExercise() as never, mockAudioEngine, 0.6);
    expect(service.isPlaying).toBe(true);
  });

  it('is not playing by default', () => {
    const service = new DemoPlaybackService();
    expect(service.isPlaying).toBe(false);
  });

  it('stops cleanly and reports isPlaying = false', () => {
    const service = new DemoPlaybackService();
    service.start(makeExercise() as never, mockAudioEngine, 0.6);
    service.stop();
    expect(service.isPlaying).toBe(false);
  });

  it('stop is safe to call when not playing', () => {
    const service = new DemoPlaybackService();
    expect(() => service.stop()).not.toThrow();
    expect(service.isPlaying).toBe(false);
  });

  it('can be restarted after stop', () => {
    const service = new DemoPlaybackService();
    service.start(makeExercise() as never, mockAudioEngine, 0.6);
    service.stop();
    service.start(makeExercise() as never, mockAudioEngine, 0.6);
    expect(service.isPlaying).toBe(true);
  });

  // ---------- Beat updates ----------

  it('calls onBeatUpdate with advancing beat values', () => {
    const exercise = makeExercise({
      notes: [{ note: 60, startBeat: 0, durationBeats: 4 }] as NoteEvent[],
    });
    const service = new DemoPlaybackService();
    const onBeatUpdate = jest.fn();
    service.start(exercise as never, mockAudioEngine, 0.6, onBeatUpdate);

    // At 120 BPM * 0.6 speed = 72 BPM effective
    // 60000 / 72 = 833.33ms per beat
    jest.advanceTimersByTime(833);

    expect(onBeatUpdate).toHaveBeenCalled();
    const lastBeat = onBeatUpdate.mock.calls[onBeatUpdate.mock.calls.length - 1][0];
    expect(lastBeat).toBeGreaterThan(0);
  });

  it('beat increases monotonically over time', () => {
    const exercise = makeExercise({
      notes: [{ note: 60, startBeat: 0, durationBeats: 8 }] as NoteEvent[],
    });
    const service = new DemoPlaybackService();
    const beats: number[] = [];
    const onBeatUpdate = jest.fn((beat: number) => beats.push(beat));
    service.start(exercise as never, mockAudioEngine, 1.0, onBeatUpdate);

    // Advance by 500ms at 120 BPM = 1 beat
    jest.advanceTimersByTime(500);

    // Beats should be monotonically increasing
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i]).toBeGreaterThanOrEqual(beats[i - 1]);
    }
  });

  it('uses speedMultiplier to adjust tempo', () => {
    const exercise = makeExercise({
      notes: [{ note: 60, startBeat: 0, durationBeats: 8 }] as NoteEvent[],
    });

    // Play at full speed
    const fullSpeedBeats: number[] = [];
    const service1 = new DemoPlaybackService();
    service1.start(exercise as never, mockAudioEngine, 1.0, (b) => fullSpeedBeats.push(b));
    jest.advanceTimersByTime(500);
    service1.stop();

    // Play at half speed
    const halfSpeedBeats: number[] = [];
    const service2 = new DemoPlaybackService();
    service2.start(exercise as never, mockAudioEngine, 0.5, (b) => halfSpeedBeats.push(b));
    jest.advanceTimersByTime(500);
    service2.stop();

    const lastFull = fullSpeedBeats[fullSpeedBeats.length - 1];
    const lastHalf = halfSpeedBeats[halfSpeedBeats.length - 1];

    // Full speed should have progressed roughly 2x further than half speed
    expect(lastFull).toBeGreaterThan(lastHalf * 1.5);
  });

  it('defaults speedMultiplier to 0.6', () => {
    const exercise = makeExercise({
      notes: [{ note: 60, startBeat: 0, durationBeats: 8 }] as NoteEvent[],
    });
    const beats: number[] = [];
    const service = new DemoPlaybackService();
    // Call start without speedMultiplier — should default to 0.6
    service.start(exercise as never, mockAudioEngine, undefined, (b) => beats.push(b));

    // At 120 BPM * 0.6 = 72 effective BPM → 833ms per beat
    jest.advanceTimersByTime(833);

    const lastBeat = beats[beats.length - 1];
    // Should be approximately 1 beat at 72 BPM after 833ms
    expect(lastBeat).toBeGreaterThan(0.8);
    expect(lastBeat).toBeLessThan(1.3);

    service.stop();
  });

  // ---------- Active notes callback ----------

  it('calls onActiveNotes callback', () => {
    const exercise = makeExercise({
      notes: [{ note: 60, startBeat: 0, durationBeats: 2 }] as NoteEvent[],
    });
    const service = new DemoPlaybackService();
    const onActiveNotes = jest.fn();
    service.start(exercise as never, mockAudioEngine, 0.6, jest.fn(), onActiveNotes);

    // Advance into the note
    jest.advanceTimersByTime(100);

    // onActiveNotes should have been called (even if the set is empty due to 85% random chance)
    expect(onActiveNotes).toHaveBeenCalled();
    // Every call should receive a Set
    for (const call of onActiveNotes.mock.calls) {
      expect(call[0]).toBeInstanceOf(Set);
    }
  });

  // ---------- Audio engine interaction ----------

  it('plays notes through the audio engine', () => {
    // Use a large note set to increase chance of at least one being in the 85%
    const notes: NoteEvent[] = Array.from({ length: 20 }, (_, i) => ({
      note: 60 + i,
      startBeat: i * 0.25,
      durationBeats: 0.25,
    }));
    const exercise = makeExercise({ notes });
    const service = new DemoPlaybackService();
    service.start(exercise as never, mockAudioEngine, 1.0);

    // Advance well into the exercise
    jest.advanceTimersByTime(3000);

    // At 120 BPM, 3 seconds = 6 beats, all 20 notes fit in 5 beats
    // With 85% play rate, expect ~17 note-on calls
    expect(mockAudioEngine.playNote.mock.calls.length).toBeGreaterThan(0);

    service.stop();
  });

  it('uses velocity 0.7 for demo notes', () => {
    const notes: NoteEvent[] = Array.from({ length: 10 }, (_, i) => ({
      note: 60 + i,
      startBeat: i * 0.5,
      durationBeats: 0.5,
    }));
    const exercise = makeExercise({ notes });
    const service = new DemoPlaybackService();
    service.start(exercise as never, mockAudioEngine, 1.0);

    jest.advanceTimersByTime(5000);

    // All playNote calls should use velocity 0.7
    for (const call of mockAudioEngine.playNote.mock.calls) {
      expect(call[1]).toBe(0.7);
    }

    service.stop();
  });

  it('releases notes after their duration expires', () => {
    const notes: NoteEvent[] = Array.from({ length: 10 }, (_, i) => ({
      note: 60 + i,
      startBeat: i * 0.5,
      durationBeats: 0.25,
    }));
    const exercise = makeExercise({ notes });
    const service = new DemoPlaybackService();
    service.start(exercise as never, mockAudioEngine, 1.0);

    // Advance well past all notes
    jest.advanceTimersByTime(5000);

    // Every played note should eventually be released
    expect(mockAudioEngine.releaseNote.mock.calls.length).toBe(
      mockAudioEngine.playNote.mock.calls.length,
    );

    service.stop();
  });

  // ---------- Auto-stop ----------

  it('auto-stops when exercise ends', () => {
    const exercise = makeExercise({
      notes: [{ note: 60, startBeat: 0, durationBeats: 1 }] as NoteEvent[],
    });
    const service = new DemoPlaybackService();
    service.start(exercise as never, mockAudioEngine, 1.0);

    // totalBeats = max(1, 4) = 4 (minimum 4 beats)
    // Auto-stop at totalBeats + 1 = 5 beats
    // At 120 BPM, 1 beat = 500ms, need >5 beats = >2500ms
    jest.advanceTimersByTime(3000);

    expect(service.isPlaying).toBe(false);
  });

  // ---------- Cleanup ----------

  it('cleans up interval on stop (no further callbacks)', () => {
    const exercise = makeExercise({
      notes: [{ note: 60, startBeat: 0, durationBeats: 8 }] as NoteEvent[],
    });
    const onBeatUpdate = jest.fn();
    const service = new DemoPlaybackService();
    service.start(exercise as never, mockAudioEngine, 0.6, onBeatUpdate);

    jest.advanceTimersByTime(100);
    const callCountBeforeStop = onBeatUpdate.mock.calls.length;

    service.stop();

    jest.advanceTimersByTime(500);
    const callCountAfterStop = onBeatUpdate.mock.calls.length;

    // No new calls after stop
    expect(callCountAfterStop).toBe(callCountBeforeStop);
  });

  it('starting a new playback cleans up the previous one', () => {
    const exercise = makeExercise({
      notes: [{ note: 60, startBeat: 0, durationBeats: 8 }] as NoteEvent[],
    });
    const onBeatUpdate1 = jest.fn();
    const onBeatUpdate2 = jest.fn();
    const service = new DemoPlaybackService();

    service.start(exercise as never, mockAudioEngine, 0.6, onBeatUpdate1);
    jest.advanceTimersByTime(100);

    // Start again with a different callback
    service.start(exercise as never, mockAudioEngine, 0.6, onBeatUpdate2);
    const callCount1AtRestart = onBeatUpdate1.mock.calls.length;

    jest.advanceTimersByTime(200);

    // First callback should not receive any more updates
    expect(onBeatUpdate1.mock.calls.length).toBe(callCount1AtRestart);
    // Second callback should have received updates
    expect(onBeatUpdate2.mock.calls.length).toBeGreaterThan(0);

    service.stop();
  });
});

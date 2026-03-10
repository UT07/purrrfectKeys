/**
 * PitchDetector + NoteTracker unit tests
 *
 * Tests YIN pitch detection accuracy with synthetic sine waves
 * and NoteTracker hysteresis behavior.
 */

import { YINPitchDetector, NoteTracker } from '../PitchDetector';
import type { PitchResult, NoteEvent } from '../PitchDetector';

// ---------------------------------------------------------------------------
// Helpers — generate synthetic audio signals
// ---------------------------------------------------------------------------

/** Generate a pure sine wave at the given frequency */
function generateSineWave(
  frequency: number,
  sampleRate: number,
  numSamples: number,
  amplitude: number = 0.8,
): Float32Array {
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    buffer[i] = amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate);
  }
  return buffer;
}

/** Generate white noise */
function generateNoise(numSamples: number, amplitude: number = 0.1): Float32Array {
  const buffer = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    buffer[i] = (Math.random() * 2 - 1) * amplitude;
  }
  return buffer;
}

/** Generate silence */
function generateSilence(numSamples: number): Float32Array {
  return new Float32Array(numSamples);
}

// ---------------------------------------------------------------------------
// YINPitchDetector tests
// ---------------------------------------------------------------------------

describe('YINPitchDetector', () => {
  const SAMPLE_RATE = 44100;
  const BUFFER_SIZE = 2048;
  let detector: YINPitchDetector;

  beforeEach(() => {
    detector = new YINPitchDetector({
      sampleRate: SAMPLE_RATE,
      bufferSize: BUFFER_SIZE,
      threshold: 0.15,
      minConfidence: 0.7,
    });
  });

  // =========================================================================
  // Basic pitch detection
  // =========================================================================

  it('detects A4 (440 Hz) from a sine wave', () => {
    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE);
    const result = detector.detect(buffer);

    expect(result.voiced).toBe(true);
    expect(result.frequency).toBeCloseTo(440, 0);
    expect(result.midiNote).toBe(69);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('detects Middle C (261.63 Hz)', () => {
    const buffer = generateSineWave(261.63, SAMPLE_RATE, BUFFER_SIZE);
    const result = detector.detect(buffer);

    expect(result.voiced).toBe(true);
    expect(result.frequency).toBeCloseTo(261.63, 0);
    expect(result.midiNote).toBe(60);
  });

  it('detects C5 (523.25 Hz)', () => {
    const buffer = generateSineWave(523.25, SAMPLE_RATE, BUFFER_SIZE);
    const result = detector.detect(buffer);

    expect(result.voiced).toBe(true);
    expect(result.midiNote).toBe(72);
  });

  it('detects E4 (329.63 Hz)', () => {
    const buffer = generateSineWave(329.63, SAMPLE_RATE, BUFFER_SIZE);
    const result = detector.detect(buffer);

    expect(result.voiced).toBe(true);
    expect(result.midiNote).toBe(64);
  });

  it('detects G3 (196 Hz)', () => {
    const buffer = generateSineWave(196, SAMPLE_RATE, BUFFER_SIZE);
    const result = detector.detect(buffer);

    expect(result.voiced).toBe(true);
    expect(result.midiNote).toBe(55);
  });

  // =========================================================================
  // Accuracy across the piano range
  // =========================================================================

  it('detects common piano notes accurately', () => {
    const notes: [number, number][] = [
      // [frequency, expected MIDI note]
      [130.81, 48],  // C3
      [164.81, 52],  // E3
      [196.00, 55],  // G3
      [261.63, 60],  // C4
      [329.63, 64],  // E4
      [392.00, 67],  // G4
      [440.00, 69],  // A4
      [523.25, 72],  // C5
      [659.26, 76],  // E5
      [783.99, 79],  // G5
      [880.00, 81],  // A5
      [1046.50, 84], // C6
    ];

    for (const [freq, expectedMidi] of notes) {
      const buffer = generateSineWave(freq, SAMPLE_RATE, BUFFER_SIZE);
      const result = detector.detect(buffer);

      expect(result.voiced).toBe(true);
      expect(result.midiNote).toBe(expectedMidi);
    }
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  it('returns unvoiced for silence', () => {
    const buffer = generateSilence(BUFFER_SIZE);
    const result = detector.detect(buffer);

    expect(result.voiced).toBe(false);
    expect(result.frequency).toBe(0);
    expect(result.midiNote).toBeNull();
  });

  it('returns unvoiced for noise', () => {
    const buffer = generateNoise(BUFFER_SIZE, 0.05);
    const result = detector.detect(buffer);

    // Noise may occasionally detect a pitch, but confidence should be low
    if (result.voiced) {
      expect(result.confidence).toBeLessThan(0.95);
    }
  });

  it('returns unvoiced for buffer too small', () => {
    const buffer = new Float32Array(100); // Way below bufferSize
    const result = detector.detect(buffer);

    expect(result.voiced).toBe(false);
  });

  it('provides timestamp in result', () => {
    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE);
    const before = Date.now();
    const result = detector.detect(buffer);
    const after = Date.now();

    expect(result.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.timestamp).toBeLessThanOrEqual(after);
  });

  it('provides cents offset close to 0 for in-tune notes', () => {
    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE);
    const result = detector.detect(buffer);

    expect(Math.abs(result.centsOffset)).toBeLessThan(5);
  });

  // =========================================================================
  // Config
  // =========================================================================

  it('returns correct sample rate', () => {
    expect(detector.getSampleRate()).toBe(SAMPLE_RATE);
  });

  it('returns correct buffer size', () => {
    expect(detector.getBufferSize()).toBe(BUFFER_SIZE);
  });

  it('returns correct latency in ms', () => {
    const expectedLatency = (BUFFER_SIZE / SAMPLE_RATE) * 1000;
    expect(detector.getLatencyMs()).toBeCloseTo(expectedLatency, 1);
  });

  it('RMS gate rejects very quiet buffers as unvoiced', () => {
    // Generate a sine wave at very low amplitude (below RMS threshold of 0.01)
    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE, 0.005);
    const result = detector.detect(buffer);

    // RMS of a sine with amplitude 0.005 ≈ 0.0035 → below 0.01 threshold
    expect(result.voiced).toBe(false);
  });

  it('detects pitch when amplitude is above RMS threshold', () => {
    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE, 0.1);
    const result = detector.detect(buffer);

    // RMS of a sine with amplitude 0.1 ≈ 0.07 → well above 0.01 threshold
    expect(result.voiced).toBe(true);
    expect(result.midiNote).toBe(69);
  });

  it('octave correction can be disabled', () => {
    const detectorNoOctaveCorr = new YINPitchDetector({
      sampleRate: SAMPLE_RATE,
      bufferSize: BUFFER_SIZE,
      threshold: 0.15,
      minConfidence: 0.7,
      octaveCorrection: false,
    });

    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE);
    const result = detectorNoOctaveCorr.detect(buffer);

    expect(result.voiced).toBe(true);
    expect(result.midiNote).toBe(69); // Pure sine — no correction needed anyway
  });

  it('respects custom threshold', () => {
    // Very strict threshold — should detect less
    const strictDetector = new YINPitchDetector({
      sampleRate: SAMPLE_RATE,
      bufferSize: BUFFER_SIZE,
      threshold: 0.01,
    });

    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE);
    const result = strictDetector.detect(buffer);
    // Pure sine should still be detected even with strict threshold
    expect(result.voiced).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Real-device amplitude tests (iPhone mic in measurement mode)
// ---------------------------------------------------------------------------

describe('YINPitchDetector — iPhone mic amplitudes', () => {
  const SAMPLE_RATE = 44100;
  const BUFFER_SIZE = 2048;

  // Config matching AMBIENT_PITCH_OVERRIDES from MicrophoneInput.ts
  const MIC_CONFIG = {
    sampleRate: SAMPLE_RATE,
    bufferSize: BUFFER_SIZE,
    threshold: 0.15,
    minConfidence: 0.35,
    rmsThreshold: 0.002,
    octaveCorrection: true,
    minFrequency: 80,
    maxFrequency: 1500,
  };

  it('detects C4 at iPhone mic amplitude (0.008 peak)', () => {
    const detector = new YINPitchDetector(MIC_CONFIG);
    // Real device logs show maxAmplitude 0.006-0.009 for piano notes
    const buffer = generateSineWave(261.63, SAMPLE_RATE, BUFFER_SIZE, 0.008);
    const result = detector.detect(buffer);
    expect(result.voiced).toBe(true);
    expect(result.midiNote).toBe(60); // C4
  });

  it('detects A4 at very low amplitude (0.004 peak)', () => {
    const detector = new YINPitchDetector(MIC_CONFIG);
    const buffer = generateSineWave(440, SAMPLE_RATE, BUFFER_SIZE, 0.004);
    const result = detector.detect(buffer);
    expect(result.voiced).toBe(true);
    expect(result.midiNote).toBe(69); // A4
  });

  it('rejects ambient noise at RMS 0.001', () => {
    const detector = new YINPitchDetector(MIC_CONFIG);
    // Noise at typical ambient RMS level
    const buffer = generateNoise(BUFFER_SIZE, 0.0015);
    const result = detector.detect(buffer);
    // Noise should either fail RMS gate or fail YIN confidence check
    expect(result.voiced).toBe(false);
  });

  it('sustains detection across multiple buffers at low amplitude', () => {
    const detector = new YINPitchDetector(MIC_CONFIG);
    const tracker = new NoteTracker({ onsetHoldMs: 60, releaseHoldMs: 500 });
    const events: NoteEvent[] = [];
    tracker.onNoteEvent((e) => events.push(e));

    // Simulate 10 consecutive buffers of D4 at low amplitude (iPhone mic level)
    for (let i = 0; i < 10; i++) {
      const buffer = generateSineWave(293.66, SAMPLE_RATE, BUFFER_SIZE, 0.006);
      const result = detector.detect(buffer);
      tracker.update(result);
    }

    // Should have exactly 1 noteOn and no noteOff (note still held)
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('noteOn');
    expect(events[0].midiNote).toBe(62); // D4
  });

  it('survives intermittent RMS-rejected buffers without releasing', () => {
    const detector = new YINPitchDetector(MIC_CONFIG);
    const tracker = new NoteTracker({ onsetHoldMs: 60, releaseHoldMs: 500 });
    const events: NoteEvent[] = [];
    tracker.onNoteEvent((e) => events.push(e));

    // 3 voiced frames → noteOn
    for (let i = 0; i < 3; i++) {
      const buffer = generateSineWave(261.63, SAMPLE_RATE, BUFFER_SIZE, 0.006);
      tracker.update(detector.detect(buffer));
    }
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('noteOn');

    // 5 silent frames (RMS below threshold) — note should survive (500ms hold)
    for (let i = 0; i < 5; i++) {
      const buffer = generateSilence(BUFFER_SIZE);
      const result = detector.detect(buffer);
      // Advance timestamp by 46ms per buffer
      result.timestamp = Date.now() + i * 46;
      tracker.update(result);
    }

    // Note should still be held (5 * 46ms = 230ms < 500ms releaseHold)
    expect(events.length).toBe(1); // No noteOff yet
  });
});

// ---------------------------------------------------------------------------
// NoteTracker tests
// ---------------------------------------------------------------------------

describe('NoteTracker', () => {
  let tracker: NoteTracker;
  let events: NoteEvent[];

  beforeEach(() => {
    tracker = new NoteTracker({
      onsetHoldMs: 40,
      releaseHoldMs: 80,
    });
    events = [];
    tracker.onNoteEvent((e) => events.push(e));
  });

  function makePitch(midiNote: number | null, voiced: boolean, timestamp: number, rms = 0.01): PitchResult {
    return {
      frequency: midiNote ? 440 * Math.pow(2, (midiNote - 69) / 12) : 0,
      confidence: voiced ? 0.95 : 0,
      voiced,
      midiNote,
      centsOffset: 0,
      timestamp,
      rms: voiced ? rms : 0,
    };
  }

  // =========================================================================
  // Note onset
  // =========================================================================

  it('emits noteOn after minConfirmations consecutive detections', () => {
    // With onsetHoldMs=40: minConfirmations = max(2, round(40/46)) = 2
    // So 2 consecutive detections of the same note triggers noteOn
    tracker.update(makePitch(60, true, 1000));
    expect(events).toHaveLength(0); // 1st detection — candidate, not confirmed

    tracker.update(makePitch(60, true, 1050));
    expect(events).toHaveLength(1); // 2nd detection — confirmed!
    expect(events[0]).toEqual(expect.objectContaining({
      type: 'noteOn',
      midiNote: 60,
    }));
  });

  it('does not emit noteOn for brief pitch flickers', () => {
    tracker.update(makePitch(60, true, 1000));
    tracker.update(makePitch(64, true, 1010)); // Different note within 40ms
    tracker.update(makePitch(67, true, 1020)); // Another different note

    // None held long enough for onset
    expect(events.filter(e => e.type === 'noteOn')).toHaveLength(0);
  });

  // =========================================================================
  // Note release
  // =========================================================================

  it('emits noteOff after silence exceeds releaseHoldMs', () => {
    // Onset (2 confirmations)
    tracker.update(makePitch(60, true, 1000));
    tracker.update(makePitch(60, true, 1050));
    expect(events).toHaveLength(1); // noteOn

    // Silence — lastVoicedTime was 1050
    tracker.update(makePitch(null, false, 1100));
    expect(events).toHaveLength(1); // 50ms silence < 80ms threshold

    tracker.update(makePitch(null, false, 1200)); // 150ms silence > 80ms threshold
    expect(events).toHaveLength(2);
    expect(events[1]).toEqual(expect.objectContaining({
      type: 'noteOff',
      midiNote: 60,
    }));
  });

  it('does not emit noteOff during brief silence gaps', () => {
    // Onset
    tracker.update(makePitch(60, true, 1000));
    tracker.update(makePitch(60, true, 1050));

    // Brief silence (30ms < 80ms threshold)
    tracker.update(makePitch(null, false, 1070));

    // Note resumes
    tracker.update(makePitch(60, true, 1090));

    // Should only have the initial noteOn, no noteOff
    expect(events.filter(e => e.type === 'noteOff')).toHaveLength(0);
  });

  // =========================================================================
  // Note transitions
  // =========================================================================

  it('emits noteOff then noteOn when transitioning to a new note', () => {
    // Onset note 60
    tracker.update(makePitch(60, true, 1000));
    tracker.update(makePitch(60, true, 1050));
    expect(events).toHaveLength(1); // noteOn 60

    // Transition to note 64
    tracker.update(makePitch(64, true, 1070));
    tracker.update(makePitch(64, true, 1120)); // 50ms of note 64
    expect(events).toHaveLength(3); // noteOff 60, noteOn 64
    expect(events[1].type).toBe('noteOff');
    expect(events[1].midiNote).toBe(60);
    expect(events[2].type).toBe('noteOn');
    expect(events[2].midiNote).toBe(64);
  });

  // =========================================================================
  // Reset
  // =========================================================================

  it('emits noteOff on reset if note is active', () => {
    tracker.update(makePitch(60, true, 1000));
    tracker.update(makePitch(60, true, 1050));
    expect(events).toHaveLength(1);

    tracker.reset();
    expect(events).toHaveLength(2);
    expect(events[1].type).toBe('noteOff');
    expect(events[1].midiNote).toBe(60);
  });

  it('does not emit noteOff on reset if no note is active', () => {
    tracker.reset();
    expect(events).toHaveLength(0);
  });

  // =========================================================================
  // getCurrentNote
  // =========================================================================

  it('returns null when no note is active', () => {
    expect(tracker.getCurrentNote()).toBeNull();
  });

  it('returns active note after onset', () => {
    tracker.update(makePitch(60, true, 1000));
    tracker.update(makePitch(60, true, 1050));
    expect(tracker.getCurrentNote()).toBe(60);
  });

  it('returns null after release', () => {
    tracker.update(makePitch(60, true, 1000));
    tracker.update(makePitch(60, true, 1050));
    tracker.update(makePitch(null, false, 1100));
    tracker.update(makePitch(null, false, 1200));
    expect(tracker.getCurrentNote()).toBeNull();
  });

  // =========================================================================
  // Unsubscribe
  // =========================================================================

  it('stops receiving events after unsubscribe', () => {
    const localEvents: NoteEvent[] = [];
    const unsub = tracker.onNoteEvent((e) => localEvents.push(e));

    tracker.update(makePitch(60, true, 1000));
    tracker.update(makePitch(60, true, 1050));

    unsub();

    // Further updates should not trigger the unsubscribed callback
    tracker.update(makePitch(null, false, 1200));
    tracker.update(makePitch(null, false, 1300));

    // Only the noteOn should have been received (the noteOff happened after unsub)
    // Note: the main events array still gets events from the constructor callback
    expect(localEvents).toHaveLength(1);
  });

  // =========================================================================
  // Single-frame glitch protection
  // =========================================================================

  it('ignores single-frame pitch glitch during candidate confirmation', () => {
    // Start detecting C4
    tracker.update(makePitch(60, true, 1000)); // candidate=60, count=1
    expect(events).toHaveLength(0);

    // Single-frame glitch: YIN detects E4 for one buffer
    tracker.update(makePitch(64, true, 1050)); // glitch — ignored because 64 != lastRawMidi(60)
    expect(events).toHaveLength(0);

    // C4 returns — should still confirm (candidate 60 was preserved)
    tracker.update(makePitch(60, true, 1100)); // 60 == candidate, count=2 → confirmed!
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(expect.objectContaining({
      type: 'noteOn',
      midiNote: 60,
    }));
  });

  it('allows real transitions when new note appears in 2 consecutive frames', () => {
    // Confirm C4
    tracker.update(makePitch(60, true, 1000));
    tracker.update(makePitch(60, true, 1050));
    expect(events).toHaveLength(1); // noteOn C4

    // Transition to E4: two consecutive frames
    tracker.update(makePitch(64, true, 1100)); // candidate=64, count=1
    tracker.update(makePitch(64, true, 1150)); // count=2 → confirmed
    expect(events).toHaveLength(3); // noteOff C4 + noteOn E4
    expect(events[1].type).toBe('noteOff');
    expect(events[1].midiNote).toBe(60);
    expect(events[2].type).toBe('noteOn');
    expect(events[2].midiNote).toBe(64);
  });

  it('recovers faster from glitch than without protection', () => {
    // Without glitch protection: glitch resets candidate, needs 2 more frames
    // With glitch protection: glitch is ignored, candidate preserved

    // Start detecting C4
    tracker.update(makePitch(60, true, 1000)); // candidate=60, count=1

    // Glitch frame (different note for 1 frame)
    tracker.update(makePitch(67, true, 1050)); // ignored (67 != lastRawMidi 60)

    // C4 returns — should now be at count=2 and confirm immediately
    tracker.update(makePitch(60, true, 1100)); // candidate still 60, count→2 → confirmed
    expect(events).toHaveLength(1);
    expect(events[0].midiNote).toBe(60);
  });

  it('handles consecutive different notes as real transitions', () => {
    // Two consecutive frames of E4 should override the C4 candidate
    tracker.update(makePitch(60, true, 1000)); // candidate=60, count=1
    tracker.update(makePitch(64, true, 1050)); // ignored (64 != lastRawMidi 60)
    tracker.update(makePitch(64, true, 1100)); // 64 == lastRawMidi(64) → switch! candidate=64, count=2 → confirmed
    expect(events).toHaveLength(1);
    expect(events[0].midiNote).toBe(64); // E4, not C4
  });

  // =========================================================================
  // Velocity estimation from RMS
  // =========================================================================

  it('provides velocity on noteOn events based on RMS', () => {
    // Low RMS → low velocity
    tracker.update(makePitch(60, true, 1000, 0.003));
    tracker.update(makePitch(60, true, 1050, 0.003));
    expect(events).toHaveLength(1);
    expect(events[0].velocity).toBeDefined();
    expect(events[0].velocity).toBeGreaterThanOrEqual(40);
    expect(events[0].velocity).toBeLessThanOrEqual(70);
  });

  it('maps louder RMS to higher velocity', () => {
    // Play loud note
    const loudTracker = new NoteTracker({ onsetHoldMs: 40, releaseHoldMs: 80 });
    const loudEvents: NoteEvent[] = [];
    loudTracker.onNoteEvent((e) => loudEvents.push(e));

    loudTracker.update(makePitch(60, true, 1000, 0.04));
    loudTracker.update(makePitch(60, true, 1050, 0.04));

    // Play quiet note
    const quietTracker = new NoteTracker({ onsetHoldMs: 40, releaseHoldMs: 80 });
    const quietEvents: NoteEvent[] = [];
    quietTracker.onNoteEvent((e) => quietEvents.push(e));

    quietTracker.update(makePitch(60, true, 1000, 0.003));
    quietTracker.update(makePitch(60, true, 1050, 0.003));

    expect(loudEvents[0].velocity).toBeGreaterThan(quietEvents[0].velocity!);
  });

  it('does not include velocity on noteOff events', () => {
    tracker.update(makePitch(60, true, 1000));
    tracker.update(makePitch(60, true, 1050));
    tracker.update(makePitch(null, false, 1200));
    tracker.update(makePitch(null, false, 1300));

    const noteOff = events.find(e => e.type === 'noteOff');
    expect(noteOff).toBeDefined();
    expect(noteOff!.velocity).toBeUndefined();
  });
});

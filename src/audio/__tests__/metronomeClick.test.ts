/**
 * Tests for metronome click functionality across audio engines.
 *
 * Verifies:
 * - playMetronomeClick exists and is callable on engine implementations
 * - Beat tracking logic: fires on integer beats, uses correct frequency,
 *   respects volume=0, doesn't fire during count-in
 */

import { MockAudioEngine } from '../AudioEngine.mock';

describe('Metronome click', () => {
  describe('MockAudioEngine', () => {
    it('should have playMetronomeClick method', () => {
      const engine = new MockAudioEngine();
      expect(typeof engine.playMetronomeClick).toBe('function');
    });

    it('should not throw when called before initialization', () => {
      const engine = new MockAudioEngine();
      expect(() => engine.playMetronomeClick()).not.toThrow();
    });

    it('should not throw when called with frequency and volume', async () => {
      const engine = new MockAudioEngine();
      await engine.initialize();
      expect(() => engine.playMetronomeClick(1500, 0.3)).not.toThrow();
      expect(() => engine.playMetronomeClick(1000, 0.8)).not.toThrow();
    });

    it('should accept optional parameters', () => {
      const engine = new MockAudioEngine();
      // No args
      expect(() => engine.playMetronomeClick()).not.toThrow();
      // Frequency only
      expect(() => engine.playMetronomeClick(1500)).not.toThrow();
      // Both args
      expect(() => engine.playMetronomeClick(1000, 0.5)).not.toThrow();
    });
  });
});

describe('Metronome beat tracking logic', () => {
  /**
   * Extracts the pure beat-tracking logic from useExercisePlayback
   * so it can be tested without rendering React components.
   * This mirrors the exact logic in the playback interval.
   */
  function shouldFireMetronomeClick(
    beat: number,
    lastMetronomeBeat: number,
    metronomeEnabled: boolean,
    metronomeVolume: number,
    timeSignatureTop = 4,
  ): { shouldFire: boolean; newLastBeat: number; isDownbeat: boolean; frequency: number } {
    if (!metronomeEnabled || beat < 0 || metronomeVolume <= 0) {
      return { shouldFire: false, newLastBeat: lastMetronomeBeat, isDownbeat: false, frequency: 0 };
    }

    const currentWholeBeat = Math.floor(beat);
    if (currentWholeBeat >= 0 && currentWholeBeat > lastMetronomeBeat) {
      const isDownbeat = currentWholeBeat % timeSignatureTop === 0;
      const frequency = isDownbeat ? 1500 : 1000;
      return { shouldFire: true, newLastBeat: currentWholeBeat, isDownbeat, frequency };
    }

    return { shouldFire: false, newLastBeat: lastMetronomeBeat, isDownbeat: false, frequency: 0 };
  }

  it('should fire on beat 0 (first beat after count-in)', () => {
    const result = shouldFireMetronomeClick(0.0, -999, true, 0.5);
    expect(result.shouldFire).toBe(true);
    expect(result.newLastBeat).toBe(0);
  });

  it('should fire on each new integer beat', () => {
    let lastBeat = -999;

    // Beat 0
    const r0 = shouldFireMetronomeClick(0.0, lastBeat, true, 0.5);
    expect(r0.shouldFire).toBe(true);
    lastBeat = r0.newLastBeat;

    // Beat 0.5 — same integer beat, should NOT fire
    const r05 = shouldFireMetronomeClick(0.5, lastBeat, true, 0.5);
    expect(r05.shouldFire).toBe(false);

    // Beat 1.0 — new integer beat, should fire
    const r1 = shouldFireMetronomeClick(1.0, lastBeat, true, 0.5);
    expect(r1.shouldFire).toBe(true);
    lastBeat = r1.newLastBeat;

    // Beat 2.3 — new integer beat 2, should fire
    const r2 = shouldFireMetronomeClick(2.3, lastBeat, true, 0.5);
    expect(r2.shouldFire).toBe(true);
    expect(r2.newLastBeat).toBe(2);
  });

  it('should use 1500Hz for downbeats and 1000Hz for other beats in 4/4 time', () => {
    // Beat 0 — downbeat
    const r0 = shouldFireMetronomeClick(0.0, -999, true, 0.5);
    expect(r0.isDownbeat).toBe(true);
    expect(r0.frequency).toBe(1500);

    // Beat 1 — not a downbeat
    const r1 = shouldFireMetronomeClick(1.0, 0, true, 0.5);
    expect(r1.isDownbeat).toBe(false);
    expect(r1.frequency).toBe(1000);

    // Beat 2 — not a downbeat
    const r2 = shouldFireMetronomeClick(2.0, 1, true, 0.5);
    expect(r2.isDownbeat).toBe(false);
    expect(r2.frequency).toBe(1000);

    // Beat 3 — not a downbeat
    const r3 = shouldFireMetronomeClick(3.0, 2, true, 0.5);
    expect(r3.isDownbeat).toBe(false);
    expect(r3.frequency).toBe(1000);

    // Beat 4 — downbeat
    const r4 = shouldFireMetronomeClick(4.0, 3, true, 0.5);
    expect(r4.isDownbeat).toBe(true);
    expect(r4.frequency).toBe(1500);

    // Beat 8 — downbeat
    const r8 = shouldFireMetronomeClick(8.0, 7, true, 0.5);
    expect(r8.isDownbeat).toBe(true);
    expect(r8.frequency).toBe(1500);
  });

  it('should use correct downbeats in 3/4 time', () => {
    // Beat 0 — downbeat
    const r0 = shouldFireMetronomeClick(0.0, -999, true, 0.5, 3);
    expect(r0.isDownbeat).toBe(true);
    expect(r0.frequency).toBe(1500);

    // Beat 1 — not a downbeat
    const r1 = shouldFireMetronomeClick(1.0, 0, true, 0.5, 3);
    expect(r1.isDownbeat).toBe(false);

    // Beat 2 — not a downbeat
    const r2 = shouldFireMetronomeClick(2.0, 1, true, 0.5, 3);
    expect(r2.isDownbeat).toBe(false);

    // Beat 3 — downbeat (3/4 cycle)
    const r3 = shouldFireMetronomeClick(3.0, 2, true, 0.5, 3);
    expect(r3.isDownbeat).toBe(true);
    expect(r3.frequency).toBe(1500);
  });

  it('should NOT fire during count-in (negative beats)', () => {
    const r1 = shouldFireMetronomeClick(-2.0, -999, true, 0.5);
    expect(r1.shouldFire).toBe(false);

    const r2 = shouldFireMetronomeClick(-0.5, -999, true, 0.5);
    expect(r2.shouldFire).toBe(false);

    const r3 = shouldFireMetronomeClick(-0.01, -999, true, 0.5);
    expect(r3.shouldFire).toBe(false);
  });

  it('should NOT fire when metronomeEnabled is false', () => {
    const result = shouldFireMetronomeClick(1.0, 0, false, 0.5);
    expect(result.shouldFire).toBe(false);
  });

  it('should NOT fire when metronomeVolume is 0', () => {
    const result = shouldFireMetronomeClick(1.0, 0, true, 0);
    expect(result.shouldFire).toBe(false);
  });

  it('should handle rapid beat progression at 120 BPM', () => {
    let lastBeat = -999;

    // Simulate 16ms interval ticks at 120 BPM (2 beats/sec)
    // Each tick advances by ~0.032 beats
    const beatsPerTick = (16 / 60000) * 120;
    let beat = 0;
    let fireCount = 0;

    for (let tick = 0; tick < 200; tick++) {
      const result = shouldFireMetronomeClick(beat, lastBeat, true, 0.5);
      if (result.shouldFire) {
        fireCount++;
        lastBeat = result.newLastBeat;
      }
      beat += beatsPerTick;
    }

    // At 120 BPM with 200 ticks of 16ms, we cover 3.2 seconds = ~6.4 beats
    // Should fire approximately 7 times (beats 0, 1, 2, 3, 4, 5, 6)
    expect(fireCount).toBeGreaterThanOrEqual(6);
    expect(fireCount).toBeLessThanOrEqual(7);
  });

  it('should not skip beats at very high tempos (200 BPM)', () => {
    let lastBeat = -999;
    const beatsPerTick = (16 / 60000) * 200; // ~0.053 beats per tick
    let beat = 0;
    let fireCount = 0;

    for (let tick = 0; tick < 500; tick++) {
      const result = shouldFireMetronomeClick(beat, lastBeat, true, 0.5);
      if (result.shouldFire) {
        fireCount++;
        lastBeat = result.newLastBeat;
      }
      beat += beatsPerTick;
    }

    // 500 ticks * 16ms = 8 seconds at 200 BPM = ~26.7 beats
    // Should fire 27 times (beats 0-26)
    expect(fireCount).toBeGreaterThanOrEqual(26);
    expect(fireCount).toBeLessThanOrEqual(28);
  });

  it('should reset properly when lastMetronomeBeat is -999 (start/loop)', () => {
    const result = shouldFireMetronomeClick(0.0, -999, true, 0.5);
    expect(result.shouldFire).toBe(true);
    expect(result.newLastBeat).toBe(0);
  });

  it('should not double-fire on the same beat', () => {
    // Fire on beat 3
    const r1 = shouldFireMetronomeClick(3.0, 2, true, 0.5);
    expect(r1.shouldFire).toBe(true);
    expect(r1.newLastBeat).toBe(3);

    // Same beat again (sub-beat increment)
    const r2 = shouldFireMetronomeClick(3.5, r1.newLastBeat, true, 0.5);
    expect(r2.shouldFire).toBe(false);

    // Same integer beat
    const r3 = shouldFireMetronomeClick(3.99, r1.newLastBeat, true, 0.5);
    expect(r3.shouldFire).toBe(false);
  });
});

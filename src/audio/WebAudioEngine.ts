/**
 * Web Audio Engine Implementation
 * Uses react-native-audio-api (Web Audio API compatible) with oscillator-based synthesis
 *
 * Strategy: Synthesized piano-like sound using additive synthesis
 * - Fundamental frequency + harmonics (2x, 3x, 4x, 5x) with decreasing amplitude
 * - ADSR envelope per note (attack=10ms, decay=100ms, sustain=0.3, release=200ms)
 * - Each note creates fresh OscillatorNode + GainNode chains (no pooling race conditions)
 * - MAX_POLYPHONY = 10 with oldest-note eviction
 *
 * MIDI note to frequency: 440 * 2^((note - 69) / 12)
 *
 * This engine is designed for use with react-native-audio-api but uses
 * standard Web Audio API types. It is conditionally imported and will
 * gracefully fail if react-native-audio-api is not available (e.g., in Expo Go).
 */

import type { IAudioEngine, NoteHandle, AudioContextState } from './types';

const DEFAULT_VOLUME = 0.8;
const MAX_POLYPHONY = 10;
const MIN_NOTE_DURATION = 0.05; // 50ms minimum before release

/**
 * ADSR envelope configuration for piano-like timbre
 * All times in seconds
 */
const ADSR = {
  attack: 0.01,   // 10ms — fast attack for percussive piano feel
  decay: 0.1,     // 100ms — quick decay to sustain level
  sustain: 0.3,   // 30% of peak — piano notes fade quickly
  release: 0.2,   // 200ms — smooth release to avoid clicks
};

/**
 * Harmonic amplitudes for piano-like timbre
 * Index 0 = fundamental, 1 = 2nd harmonic, etc.
 * Real piano has strong fundamental with quickly decaying overtones
 */
const HARMONIC_AMPLITUDES = [1.0, 0.5, 0.25, 0.1, 0.05];

/**
 * Convert MIDI note number to frequency in Hz
 * A4 (MIDI 69) = 440 Hz, each semitone = 2^(1/12)
 */
function midiToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * State for a single active note
 * Tracks all oscillators and the shared gain envelope for cleanup
 */
interface ActiveNote {
  note: number;
  oscillators: OscillatorNode[];
  envelope: GainNode;
  startTime: number;
  releaseCallback: () => void;
}

/**
 * WebAudioEngine — Oscillator-based synthesized piano
 * Implements IAudioEngine using pure Web Audio API nodes (no samples needed)
 */
export class WebAudioEngine implements IAudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = DEFAULT_VOLUME;
  private activeNotes: Map<number, ActiveNote> = new Map();

  /**
   * Initialize the AudioContext and master gain chain
   * Creates a single AudioContext that will be reused for all notes
   */
  /**
   * Initialize the AudioContext and master gain chain.
   *
   * IMPORTANT: This file should only be imported when react-native-audio-api
   * is installed in node_modules. The factory in createAudioEngine.ts controls
   * when this class is used. Do NOT add require('react-native-audio-api') here —
   * Metro resolves requires at bundle time and will crash if the package is missing.
   *
   * Instead, this uses the global AudioContext which react-native-audio-api
   * polyfills when the native module is loaded.
   */
  async initialize(): Promise<void> {
    if (this.context) {
      console.warn('[WebAudioEngine] Already initialized');
      return;
    }

    try {
      // react-native-audio-api polyfills the global AudioContext when its
      // native module is loaded. If it's not available, this will throw.
      if (typeof AudioContext === 'undefined') {
        throw new Error('AudioContext is not available — react-native-audio-api may not be installed');
      }

      this.context = new AudioContext({
        sampleRate: 44100,
      });

      // Create master gain for volume control
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.context.destination);

      console.log('[WebAudioEngine] Initialized successfully (oscillator synthesis)');
    } catch (error) {
      console.error('[WebAudioEngine] Initialization failed:', error);
      // Clean up partial state
      this.context = null;
      this.masterGain = null;
      throw new Error(
        `WebAudioEngine initialization failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Suspend audio context (e.g., when app backgrounds)
   */
  async suspend(): Promise<void> {
    if (this.context && this.context.state === 'running') {
      try {
        await this.context.suspend();
      } catch (error) {
        console.error('[WebAudioEngine] Suspend failed:', error);
      }
    }
  }

  /**
   * Resume audio context after suspend
   */
  async resume(): Promise<void> {
    if (this.context && this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch (error) {
        console.error('[WebAudioEngine] Resume failed:', error);
      }
    }
  }

  /**
   * Dispose of all audio resources
   * Stops all notes, disconnects nodes, and closes the AudioContext
   */
  dispose(): void {
    this.releaseAllNotes();

    if (this.context) {
      try {
        this.context.close();
      } catch (error) {
        console.error('[WebAudioEngine] Error closing AudioContext:', error);
      }
      this.context = null;
    }

    this.masterGain = null;
    this.activeNotes.clear();
    console.log('[WebAudioEngine] Disposed');
  }

  /**
   * Play a note using additive oscillator synthesis
   *
   * Creates a bank of oscillators (fundamental + harmonics) connected
   * through a shared GainNode envelope, then into the master gain.
   *
   * Signal chain per note:
   *   OscillatorNode(f0) ─┐
   *   OscillatorNode(2f0) ─┤
   *   OscillatorNode(3f0) ─┼─▶ GainNode (ADSR) ─▶ masterGain ─▶ destination
   *   OscillatorNode(4f0) ─┤
   *   OscillatorNode(5f0) ─┘
   *
   * Returns a NoteHandle for later release
   */
  playNote(note: number, velocity: number = 0.8): NoteHandle {
    if (!this.context || !this.masterGain) {
      throw new Error('WebAudioEngine not initialized. Call initialize() first');
    }

    const normalizedVelocity = Math.max(0.0, Math.min(1.0, velocity));
    const now = this.context.currentTime;
    const fundamentalFreq = midiToFrequency(note);

    // Enforce polyphony limit — evict oldest note if at capacity
    if (this.activeNotes.size >= MAX_POLYPHONY) {
      let oldestNote = -1;
      let oldestTime = Infinity;
      for (const [n, active] of this.activeNotes) {
        if (active.startTime < oldestTime) {
          oldestTime = active.startTime;
          oldestNote = n;
        }
      }
      if (oldestNote >= 0) {
        this.stopNote(oldestNote);
      }
    }

    // Stop any existing note at the same pitch (re-trigger)
    if (this.activeNotes.has(note)) {
      this.stopNote(note);
    }

    // Create ADSR envelope gain node
    const envelope = this.context.createGain();
    const attackEnd = now + ADSR.attack;
    const decayEnd = attackEnd + ADSR.decay;
    const sustainLevel = normalizedVelocity * ADSR.sustain;

    // Attack: 0.001 -> peak velocity
    envelope.gain.setValueAtTime(0.001, now);
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.001, normalizedVelocity),
      attackEnd
    );

    // Decay: peak velocity -> sustain level
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.001, sustainLevel),
      decayEnd
    );

    // Connect envelope to master gain
    envelope.connect(this.masterGain);

    // Create oscillator bank: fundamental + harmonics
    const oscillators: OscillatorNode[] = [];

    for (let h = 0; h < HARMONIC_AMPLITUDES.length; h++) {
      const harmonicNumber = h + 1;
      const harmonicFreq = fundamentalFreq * harmonicNumber;

      // Skip harmonics above Nyquist frequency (22050 Hz at 44100 sample rate)
      if (harmonicFreq > 22000) break;

      const osc = this.context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = harmonicFreq;

      // Individual gain for this harmonic's amplitude
      const harmonicGain = this.context.createGain();
      harmonicGain.gain.value = HARMONIC_AMPLITUDES[h] / HARMONIC_AMPLITUDES.length;

      // Connect: oscillator -> harmonic gain -> envelope
      osc.connect(harmonicGain);
      harmonicGain.connect(envelope);

      osc.start(now);
      oscillators.push(osc);
    }

    // Create release callback
    const releaseCallback = (): void => {
      this.doRelease(note, oscillators, envelope, now);
    };

    // Create NoteHandle
    const handle: NoteHandle = {
      note,
      startTime: now,
      release: releaseCallback,
    };

    // Track active note
    this.activeNotes.set(note, {
      note,
      oscillators,
      envelope,
      startTime: now,
      releaseCallback,
    });

    return handle;
  }

  /**
   * Release envelope and stop oscillators for a note
   * Applies the release phase of the ADSR to avoid clicks
   */
  private doRelease(
    note: number,
    oscillators: OscillatorNode[],
    envelope: GainNode,
    startTime: number
  ): void {
    if (!this.context) return;

    const now = this.context.currentTime;
    const minDuration = startTime + MIN_NOTE_DURATION;
    const releaseStart = Math.max(now, minDuration);
    const releaseEnd = releaseStart + ADSR.release;

    try {
      // Cancel any scheduled envelope changes
      envelope.gain.cancelScheduledValues(releaseStart);

      // Set current value to prevent discontinuity
      envelope.gain.setValueAtTime(
        Math.max(0.001, envelope.gain.value),
        releaseStart
      );

      // Release: fade to near-zero
      envelope.gain.exponentialRampToValueAtTime(0.001, releaseEnd);

      // Stop all oscillators after release completes
      for (const osc of oscillators) {
        try {
          osc.stop(releaseEnd + 0.01);
        } catch {
          // Already stopped
        }
      }
    } catch (error) {
      console.error('[WebAudioEngine] Error during note release:', error);
      // Force stop oscillators on error
      for (const osc of oscillators) {
        try {
          osc.stop();
        } catch {
          // Already stopped
        }
      }
    }

    // Remove from active notes after release completes
    setTimeout(() => {
      this.activeNotes.delete(note);
    }, (ADSR.release + 0.05) * 1000);
  }

  /**
   * Immediately stop a note (for eviction or re-trigger, not user release)
   * Stops oscillators directly without a release envelope
   */
  private stopNote(note: number): void {
    const active = this.activeNotes.get(note);
    if (!active) return;

    for (const osc of active.oscillators) {
      try {
        osc.stop();
      } catch {
        // Already stopped
      }
    }

    this.activeNotes.delete(note);
  }

  /**
   * Release a specific note via its handle
   */
  releaseNote(handle: NoteHandle): void {
    const noteState = this.activeNotes.get(handle.note);
    if (noteState) {
      handle.release();
    }
  }

  /**
   * Release all active notes immediately (for pause/stop/cleanup)
   */
  releaseAllNotes(): void {
    for (const [, active] of this.activeNotes) {
      for (const osc of active.oscillators) {
        try {
          osc.stop();
        } catch {
          // Already stopped
        }
      }
    }
    this.activeNotes.clear();
  }

  /**
   * Set master volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0.0, Math.min(1.0, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  /**
   * Get estimated output latency in milliseconds
   * Oscillator synthesis has very low latency since no samples need loading
   */
  getLatency(): number {
    if (!this.context) return 0;
    // outputLatency is in seconds on platforms that support it
    const outputLatency = (this.context as AudioContext & { outputLatency?: number }).outputLatency;
    if (typeof outputLatency === 'number') {
      return outputLatency * 1000;
    }
    // Default estimate: oscillator synthesis is faster than sample-based
    return 10;
  }

  /**
   * Check if the engine is ready for playback
   */
  isReady(): boolean {
    return this.context !== null && this.masterGain !== null;
  }

  /**
   * Get current AudioContext state
   */
  getState(): AudioContextState {
    if (!this.context) return 'closed';
    return this.context.state as AudioContextState;
  }

  /**
   * Get count of currently active notes (for debugging/monitoring)
   */
  getActiveNoteCount(): number {
    return this.activeNotes.size;
  }

  /**
   * Get memory usage — oscillator synthesis uses minimal memory (no samples)
   */
  getMemoryUsage(): { samples: number; total: number } {
    return { samples: 0, total: 0 };
  }
}

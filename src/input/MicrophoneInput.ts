/**
 * MicrophoneInput — High-level microphone-based note input
 *
 * Composes AudioCapture (mic streaming) + YINPitchDetector (pitch detection)
 * + NoteTracker (hysteresis) to emit MidiNoteEvent via the same interface
 * as MidiInput. This allows seamless integration with useExercisePlayback
 * and the scoring engine without any changes.
 *
 * Usage:
 *   const mic = new MicrophoneInput();
 *   await mic.initialize();
 *   mic.onNoteEvent((event) => { ... });
 *   await mic.start();
 *   // ... later
 *   await mic.stop();
 *   mic.dispose();
 */

import type { MidiNoteEvent } from '../core/exercises/types';
import { AudioCapture, requestMicrophonePermission } from './AudioCapture';
import { YINPitchDetector, NoteTracker } from './PitchDetector';
import type { PitchDetectorConfig, NoteTrackerConfig } from './PitchDetector';
import { PolyphonicDetector } from './PolyphonicDetector';
import { MultiNoteTracker } from './MultiNoteTracker';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MicNoteCallback = (event: MidiNoteEvent) => void;

export interface MicrophoneInputConfig {
  /** Pitch detector configuration */
  pitch?: Partial<PitchDetectorConfig>;
  /** Note tracker (hysteresis) configuration */
  tracker?: Partial<NoteTrackerConfig>;
  /** Default velocity for mic-detected notes (0-127, default: 80) */
  defaultVelocity: number;
  /** Extra timing compensation in ms added to timestamps (default: 0) */
  latencyCompensationMs: number;
  /** Detection mode: monophonic (YIN) or polyphonic (ONNX Basic Pitch) */
  mode?: 'monophonic' | 'polyphonic';
}

const DEFAULT_CONFIG: MicrophoneInputConfig = {
  defaultVelocity: 80,
  latencyCompensationMs: 0,
};

/**
 * Tuned pitch detection preset for ambient mic detection.
 *
 * The RMS gate (rmsThreshold) rejects silence before expensive YIN runs.
 * Octave correction prevents YIN from locking onto the 2nd harmonic
 * (common with piano low notes where the fundamental is weaker).
 * Thresholds are slightly relaxed from defaults for speaker-to-mic SNR.
 */
const AMBIENT_PITCH_OVERRIDES: Partial<PitchDetectorConfig> = {
  threshold: 0.20,       // Default 0.15 — slightly relaxed for room noise
  minConfidence: 0.45,   // Default 0.7 — lowered from 0.6 for phone mic → speaker audio (room echo reduces confidence to 0.5-0.65)
  rmsThreshold: 0.012,   // Default 0.01 — slightly above ambient noise, lowered from 0.015 to detect softer piano notes
  octaveCorrection: true, // Critical for piano — YIN often detects harmonics
  minFrequency: 80,      // Default 50 — E2, covers beginner piano range. Also reduces maxTau from 882→551
  maxFrequency: 1500,    // Default 2000 — ~G6, covers all beginner exercises
};

/**
 * Tuned tracker preset for ambient mic detection.
 * 2 consecutive detections required for onset (minConfirmations = max(2, round(60/46)) = 2).
 * Longer release hold accounts for speaker resonance decay.
 */
const AMBIENT_TRACKER_OVERRIDES: Partial<NoteTrackerConfig> = {
  onsetHoldMs: 60,       // Default 40 — drives minConfirmations=2 at ~46ms/buffer
  releaseHoldMs: 120,    // Default 80 — speaker resonance sustains longer
};

// ---------------------------------------------------------------------------
// MicrophoneInput
// ---------------------------------------------------------------------------

export class MicrophoneInput {
  private readonly config: MicrophoneInputConfig;
  private readonly capture: AudioCapture;
  private readonly detector: YINPitchDetector;
  private readonly tracker: NoteTracker;
  private polyDetector: PolyphonicDetector | null = null;
  private multiTracker: MultiNoteTracker | null = null;
  private mode: 'monophonic' | 'polyphonic';
  private callbacks: Set<MicNoteCallback> = new Set();
  private unsubCapture: (() => void) | null = null;
  private unsubTracker: (() => void) | null = null;
  private unsubMultiTracker: (() => void) | null = null;
  private isActive = false;
  private detectionCount = 0;
  private voicedCount = 0;
  private polyBusy = false; // BUG-016 fix: back-pressure flag for async polyphonic detection
  private monoBusy = false; // Back-pressure flag for monophonic YIN (prevents JS thread stacking)
  private readonly pendingBuffer: Float32Array; // Pre-allocated buffer for deferred YIN detection

  constructor(config?: Partial<MicrophoneInputConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.mode = config?.mode ?? 'monophonic';

    const sampleRate = this.config.pitch?.sampleRate ?? 44100;
    const bufferSize = this.config.pitch?.bufferSize ?? 2048;

    this.capture = new AudioCapture({ sampleRate, bufferSize });
    this.pendingBuffer = new Float32Array(bufferSize);

    // Merge user overrides with ambient presets for better speaker-to-mic detection
    const pitchConfig = {
      sampleRate,
      bufferSize,
      ...AMBIENT_PITCH_OVERRIDES,
      ...this.config.pitch,
    };
    const trackerConfig = {
      ...AMBIENT_TRACKER_OVERRIDES,
      ...this.config.tracker,
    };

    this.detector = new YINPitchDetector(pitchConfig);
    this.tracker = new NoteTracker(trackerConfig);

    logger.log(
      `[MicrophoneInput] Created in ${this.mode} mode, pitchConfig: threshold=${pitchConfig.threshold}, ` +
      `minConfidence=${pitchConfig.minConfidence}, trackerConfig: onsetHold=${trackerConfig.onsetHoldMs}ms`
    );
  }

  /** Get the current detection mode */
  getMode(): 'monophonic' | 'polyphonic' {
    return this.mode;
  }

  /**
   * Initialize microphone capture and pitch detection pipeline.
   * Does NOT request permission — call requestMicrophonePermission() first.
   */
  async initialize(): Promise<void> {
    await this.capture.initialize();

    // Try polyphonic mode if requested
    if (this.mode === 'polyphonic') {
      try {
        this.polyDetector = new PolyphonicDetector();
        await this.polyDetector.initialize();
        this.multiTracker = new MultiNoteTracker({ onsetHoldMs: 30, releaseHoldMs: 60 });
        logger.log('[MicrophoneInput] Polyphonic detection initialized (ONNX Basic Pitch)');
      } catch (err) {
        logger.warn('[MicrophoneInput] Polyphonic detection unavailable, falling back to monophonic:', err);
        this.polyDetector?.dispose();
        this.polyDetector = null;
        this.multiTracker = null;
        this.mode = 'monophonic';
      }
    }

    if (this.mode === 'polyphonic' && this.polyDetector && this.multiTracker) {
      // Wire: AudioCapture → PolyphonicDetector → MultiNoteTracker → callbacks
      // BUG-016 fix: Drop incoming buffers when ONNX inference is still running
      // to prevent unbounded promise pile-up and latency growth
      this.unsubCapture = this.capture.onAudioBuffer((samples) => {
        this.detectionCount++;
        if (this.polyBusy) return; // Drop buffer — previous inference still running
        this.polyBusy = true;
        this.polyDetector!.detect(samples).then((frames) => {
          this.polyBusy = false;
          for (const frame of frames) {
            if (frame.notes.length > 0) this.voicedCount++;
            this.multiTracker!.update(frame);
          }
        }).catch(() => {
          this.polyBusy = false;
        });
      });

      this.unsubMultiTracker = this.multiTracker.onNoteEvent((noteEvent) => {
        this._emitNoteEvent(noteEvent);
      });

      logger.log('[MicrophoneInput] Pipeline: AudioCapture → PolyphonicDetector → MultiNoteTracker');
    } else {
      // Wire: AudioCapture → YIN → NoteTracker → callbacks (monophonic)
      // PERF: YIN's O(n²) computeDifference blocks JS for ~10-20ms per buffer.
      // We copy samples into a pre-allocated buffer and defer detect() to the
      // next microtask via setTimeout(0). This keeps the audio callback fast
      // (~0.1ms for buffer copy) and lets React process state updates between
      // detections. Back-pressure flag drops buffers if detection is slow.
      this.unsubCapture = this.capture.onAudioBuffer((samples) => {
        this.detectionCount++;
        if (this.monoBusy) return; // Drop buffer — previous detection still running
        this.monoBusy = true;

        // Fast O(n) copy into pre-allocated buffer (~0.1ms for 2048 samples)
        this.pendingBuffer.set(samples.subarray(0, this.pendingBuffer.length));

        // Defer expensive YIN detection to next microtask
        setTimeout(() => {
          const result = this.detector.detect(this.pendingBuffer);
          this.monoBusy = false;
          if (result.voiced) this.voicedCount++;

          if (this.detectionCount % 100 === 0) {
            logger.log(
              `[MicrophoneInput] Detection stats: ${this.voicedCount}/${this.detectionCount} voiced ` +
              `(${((this.voicedCount / this.detectionCount) * 100).toFixed(1)}%), ` +
              `currentNote=${this.tracker.getCurrentNote()}`
            );
          }

          this.tracker.update(result);
        }, 0);
      });

      this.unsubTracker = this.tracker.onNoteEvent((noteEvent) => {
        this._emitNoteEvent(noteEvent);
      });

      logger.log('[MicrophoneInput] Pipeline: AudioCapture → YIN → NoteTracker');
    }
  }

  private _emitNoteEvent(noteEvent: import('./PitchDetector').NoteEvent): void {
    const midiEvent: MidiNoteEvent = {
      type: noteEvent.type,
      note: noteEvent.midiNote,
      velocity: noteEvent.type === 'noteOn' ? this.config.defaultVelocity : 0,
      timestamp: noteEvent.timestamp - this.config.latencyCompensationMs,
      channel: 0,
      inputSource: 'mic',
    };

    for (const cb of this.callbacks) {
      cb(midiEvent);
    }
  }

  /**
   * Start listening for notes via microphone.
   */
  async start(): Promise<void> {
    if (this.isActive) return;
    this.isActive = true;
    this.detectionCount = 0;
    this.voicedCount = 0;
    await this.capture.start();
    logger.log('[MicrophoneInput] Started listening');
  }

  /**
   * Stop listening.
   */
  async stop(): Promise<void> {
    if (!this.isActive) return;
    this.isActive = false;
    this.tracker.reset();
    this.multiTracker?.reset();
    await this.capture.stop();
    logger.log(
      `[MicrophoneInput] Stopped. Final stats: ${this.voicedCount}/${this.detectionCount} voiced`
    );
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    this.stop();
    this.unsubCapture?.();
    this.unsubTracker?.();
    this.unsubMultiTracker?.();
    this.polyDetector?.dispose();
    this.capture.dispose();
    this.callbacks.clear();
    this.unsubCapture = null;
    this.unsubTracker = null;
    this.unsubMultiTracker = null;
    this.polyDetector = null;
    this.multiTracker = null;
  }

  /**
   * Register callback for note events (same shape as MidiInput.onNoteEvent).
   * Returns an unsubscribe function.
   */
  onNoteEvent(callback: MicNoteCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /** Whether the mic is currently active */
  getIsActive(): boolean {
    return this.isActive;
  }

  /** Get estimated latency of the full pipeline in ms */
  getEstimatedLatencyMs(): number {
    // Buffer fill time + detection time + tracker onset hold
    return this.capture.getLatencyMs() + 5 + (this.config.tracker?.onsetHoldMs ?? 60);
  }
}

/**
 * Request mic permission and create a ready-to-use MicrophoneInput.
 * Returns null if permission denied.
 */
export async function createMicrophoneInput(
  config?: Partial<MicrophoneInputConfig>
): Promise<MicrophoneInput | null> {
  logger.log('[MicrophoneInput] Requesting mic permission...');
  const granted = await requestMicrophonePermission();
  if (!granted) {
    logger.warn(
      '[MicrophoneInput] Mic permission denied. ' +
      'Check that NSMicrophoneUsageDescription is set in Info.plist ' +
      'and the user has granted permission in Settings.'
    );
    return null;
  }

  logger.log('[MicrophoneInput] Permission granted, creating MicrophoneInput...');
  try {
    const mic = new MicrophoneInput(config);
    await mic.initialize();
    logger.log('[MicrophoneInput] Ready');
    return mic;
  } catch (error) {
    logger.error('[MicrophoneInput] Failed to create MicrophoneInput:', error);
    return null;
  }
}

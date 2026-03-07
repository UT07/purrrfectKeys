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
import { AmbientNoiseCalibrator } from './AmbientNoiseCalibrator';
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
 * Tuned pitch detection preset for microphone input (real instrument → phone mic).
 *
 * The RMS gate (rmsThreshold) rejects silence before expensive YIN runs.
 * Octave correction prevents YIN from locking onto the 2nd harmonic
 * (common with piano low notes where the fundamental is weaker).
 *
 * These settings are tuned for REAL instrument input (piano/keyboard near phone mic),
 * NOT for phone-speaker-to-mic echo. Speaker echo is handled by echo dedup in
 * useExercisePlayback, not by relaxing detection thresholds.
 */
const AMBIENT_PITCH_OVERRIDES: Partial<PitchDetectorConfig> = {
  threshold: 0.15,       // Default 0.15 — standard YIN threshold; tighter = fewer false positives
  minConfidence: 0.55,   // Default 0.7 — slightly relaxed for phone mic SNR, but high enough to reject noise
  rmsThreshold: 0.012,   // Default 0.01 — slightly above default to gate background noise
  octaveCorrection: true, // Essential for piano: low notes have stronger 2nd harmonic than fundamental
  minFrequency: 80,      // Default 50 — E2, covers beginner piano range. Also reduces maxTau from 882→551
  maxFrequency: 1500,    // Default 2000 — ~G6, covers all beginner exercises
};

/**
 * Tuned tracker preset for mic detection.
 * 2 consecutive detections required for onset (minConfirmations = max(2, round(60/46)) = 2).
 */
const AMBIENT_TRACKER_OVERRIDES: Partial<NoteTrackerConfig> = {
  onsetHoldMs: 60,       // ~1.3 buffers at 46ms → minConfirmations clamps to 2.
                         // Combined with gap tolerance, this allows detection within ~92-138ms.
  releaseHoldMs: 100,    // Short enough to release notes promptly, long enough to survive
                         // 1-2 unvoiced frames from transient noise during sustained notes.
};

// ---------------------------------------------------------------------------
// MicrophoneInput
// ---------------------------------------------------------------------------

export class MicrophoneInput {
  private readonly config: MicrophoneInputConfig;
  private readonly capture: AudioCapture;
  private readonly detector: YINPitchDetector;
  private readonly tracker: NoteTracker;
  private readonly calibrator: AmbientNoiseCalibrator;
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
  private hasCalibrated = false; // Only auto-calibrate once per session
  private calibrationUnsub: (() => void) | null = null;

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
    this.calibrator = new AmbientNoiseCalibrator();

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

    // Auto-calibrate RMS threshold from ambient noise (once per session).
    // Collect ~0.5s of audio buffers, compute average RMS, set threshold to 2.5x ambient.
    // Runs in background — detection is already active with default thresholds.
    if (!this.hasCalibrated && this.mode === 'monophonic') {
      this.hasCalibrated = true;
      this._runAmbientCalibration();
    }
  }

  /**
   * Collect ~0.5s of ambient audio and auto-tune the YIN RMS threshold.
   * Runs asynchronously while detection continues with default thresholds.
   */
  private _runAmbientCalibration(): void {
    const calibrationBuffers: Float32Array[] = [];
    const startTime = Date.now();
    const CALIBRATION_MS = 500;

    // Tap into the audio stream for calibration
    const unsub = this.capture.onAudioBuffer((samples) => {
      if (Date.now() - startTime < CALIBRATION_MS) {
        calibrationBuffers.push(new Float32Array(samples));
      } else {
        unsub();
        this.calibrationUnsub = null;
        // Compute calibration result
        if (calibrationBuffers.length > 0) {
          let totalRMS = 0;
          for (const buf of calibrationBuffers) {
            totalRMS += this.calibrator.computeRMS(buf);
          }
          const avgRMS = totalRMS / calibrationBuffers.length;
          // Set RMS threshold to 2x ambient (lowered from 2.5x — softer notes
          // from phone speakers were being rejected). Cap at 0.02 to prevent
          // noisy environments from setting an unreachable threshold.
          const adaptiveThreshold = Math.min(0.02, Math.max(0.004, avgRMS * 2.0));
          this.detector.setRmsThreshold(adaptiveThreshold);
          logger.log(
            `[MicrophoneInput] Ambient calibration: avgRMS=${avgRMS.toFixed(4)}, ` +
            `adaptive rmsThreshold=${adaptiveThreshold.toFixed(4)} (${calibrationBuffers.length} buffers)`
          );
        }
      }
    });
    this.calibrationUnsub = unsub;
  }

  /**
   * Stop listening.
   */
  async stop(): Promise<void> {
    if (!this.isActive) return;
    // Clean up any in-progress calibration subscription
    this.calibrationUnsub?.();
    this.calibrationUnsub = null;
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

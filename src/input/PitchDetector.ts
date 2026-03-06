/**
 * YIN Pitch Detection Algorithm — pure TypeScript implementation
 *
 * Detects fundamental frequency (pitch) from monophonic audio buffers.
 * Designed for real-time piano note detection via microphone.
 *
 * Algorithm steps:
 * 1. RMS gate — reject buffers below noise floor
 * 2. Compute autocorrelation difference function
 * 3. Cumulative mean normalized difference
 * 4. Absolute threshold search
 * 5. Parabolic interpolation for sub-sample accuracy
 * 6. Octave error correction via harmonic check
 *
 * All buffers are pre-allocated to avoid GC pressure in the audio path.
 *
 * Reference: de Cheveigné, A. & Kawahara, H. (2002)
 * "YIN, a fundamental frequency estimator for speech and music"
 */

import { frequencyToNearestMidi, frequencyCentsOffset } from '../core/music/pitchUtils';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PitchResult {
  /** Detected frequency in Hz, 0 if unvoiced */
  frequency: number;
  /** Detection confidence 0.0–1.0 */
  confidence: number;
  /** Whether a stable pitch was detected */
  voiced: boolean;
  /** MIDI note number (nearest integer), null if unvoiced */
  midiNote: number | null;
  /** Cents offset from nearest MIDI note (-50 to +50) */
  centsOffset: number;
  /** Timestamp (Date.now()) of detection */
  timestamp: number;
}

export interface PitchDetectorConfig {
  /** Audio sample rate in Hz (default: 44100) */
  sampleRate: number;
  /** Analysis buffer size in samples (default: 2048). Larger = lower min freq but higher latency */
  bufferSize: number;
  /** YIN threshold — lower = stricter pitch detection (default: 0.15) */
  threshold: number;
  /** Minimum confidence to consider a detection valid (default: 0.7) */
  minConfidence: number;
  /** Minimum detectable frequency in Hz (default: 50, ~G1) */
  minFrequency: number;
  /** Maximum detectable frequency in Hz (default: 2000, ~B6) */
  maxFrequency: number;
  /** RMS threshold for silence gating (default: 0.01). Buffers below this are ignored. */
  rmsThreshold: number;
  /** Enable octave error correction (default: true) */
  octaveCorrection: boolean;
}

const DEFAULT_CONFIG: PitchDetectorConfig = {
  sampleRate: 44100,
  bufferSize: 2048,
  threshold: 0.15,
  minConfidence: 0.7,
  minFrequency: 50,
  maxFrequency: 2000,
  rmsThreshold: 0.01,
  octaveCorrection: true,
};

// ---------------------------------------------------------------------------
// YIN Pitch Detector
// ---------------------------------------------------------------------------

export class YINPitchDetector {
  private readonly config: PitchDetectorConfig;
  private readonly halfSize: number;
  private readonly yinBuffer: Float32Array;
  private readonly minTau: number;
  private readonly maxTau: number;
  /** Pre-allocated result object — reused every detect() call to avoid GC pressure */
  private readonly _result: PitchResult;
  /** Diagnostic counters for logging (non-critical) */
  private _rmsRejectCount = 0;
  private _confRejectCount = 0;
  private _detectCount = 0;
  /** 3-sample median filter for frequency stability (eliminates single-frame outliers) */
  private readonly _freqHistory: [number, number, number] = [0, 0, 0];
  private _freqHistoryIdx = 0;
  /** Runtime-adjustable RMS threshold (updated by ambient calibration) */
  private _rmsThreshold: number;

  constructor(config?: Partial<PitchDetectorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.halfSize = Math.floor(this.config.bufferSize / 2);
    this._rmsThreshold = this.config.rmsThreshold;

    // Pre-allocate YIN difference buffer (CRITICAL: no allocation in detect())
    this.yinBuffer = new Float32Array(this.halfSize);

    // Convert frequency bounds to lag (tau) bounds
    // tau = sampleRate / frequency
    this.minTau = Math.max(2, Math.floor(this.config.sampleRate / this.config.maxFrequency));
    this.maxTau = Math.min(this.halfSize - 1, Math.floor(this.config.sampleRate / this.config.minFrequency));

    // Pre-allocate result object (mutated in detect() to avoid GC pressure)
    this._result = { frequency: 0, confidence: 0, voiced: false, midiNote: null, centsOffset: 0, timestamp: 0 };
  }

  /** Update RMS threshold at runtime (used by ambient noise calibration) */
  setRmsThreshold(threshold: number): void {
    this._rmsThreshold = Math.max(0.001, threshold);
    logger.log(`[PitchDetector] RMS threshold updated to ${this._rmsThreshold.toFixed(4)}`);
  }

  /** Get current RMS threshold */
  getRmsThreshold(): number {
    return this._rmsThreshold;
  }

  /**
   * Detect pitch from an audio buffer.
   * Buffer must be at least `bufferSize` samples.
   * Returns PitchResult with frequency, confidence, and MIDI note.
   */
  detect(audioBuffer: Float32Array): PitchResult {
    const r = this._result;
    r.timestamp = Date.now();

    if (audioBuffer.length < this.config.bufferSize) {
      r.frequency = 0; r.confidence = 0; r.voiced = false; r.midiNote = null; r.centsOffset = 0;
      return r;
    }

    this._detectCount++;

    // Step 0: RMS gate — reject silent/quiet buffers before expensive YIN
    const rms = this.computeRMS(audioBuffer);
    if (rms < this._rmsThreshold) {
      this._rmsRejectCount++;
      // Log every 200 rejections for diagnostics (not every frame — too noisy)
      if (this._rmsRejectCount % 200 === 0) {
        logger.log(
          `[PitchDetector] RMS silence: ${this._rmsRejectCount}/${this._detectCount} rejected ` +
          `(rms=${rms.toFixed(4)} < ${this._rmsThreshold.toFixed(4)})`
        );
      }
      r.frequency = 0; r.confidence = 0; r.voiced = false; r.midiNote = null; r.centsOffset = 0;
      return r;
    }

    // Step 1: Difference function
    this.computeDifference(audioBuffer);

    // Step 2: Cumulative mean normalized difference
    this.cumulativeMeanNormalize();

    // Step 3: Absolute threshold — find first dip below threshold
    const tauEstimate = this.findThresholdTau();

    if (tauEstimate < 0) {
      r.frequency = 0; r.confidence = 0; r.voiced = false; r.midiNote = null; r.centsOffset = 0;
      return r;
    }

    // Step 4: Parabolic interpolation for sub-sample accuracy
    let refinedTau = this.parabolicInterpolation(tauEstimate);
    let frequency = this.config.sampleRate / refinedTau;
    const confidence = 1 - this.yinBuffer[tauEstimate];

    if (confidence < this.config.minConfidence) {
      this._confRejectCount++;
      // Log every 50 confidence rejections with the detected frequency (helps diagnose missed notes)
      if (this._confRejectCount % 50 === 0) {
        logger.log(
          `[PitchDetector] Low confidence: ${this._confRejectCount}/${this._detectCount} rejected ` +
          `(conf=${confidence.toFixed(2)} < ${this.config.minConfidence}, freq=${frequency.toFixed(1)}Hz)`
        );
      }
      r.frequency = 0; r.confidence = confidence; r.voiced = false; r.midiNote = null; r.centsOffset = 0;
      return r;
    }

    // Step 5: Octave error correction — check if the detected pitch is
    // actually a harmonic of a lower fundamental. Piano's 2nd harmonic is
    // often stronger than the fundamental for low notes.
    if (this.config.octaveCorrection) {
      const corrected = this.correctOctaveError(refinedTau, tauEstimate);
      if (corrected !== refinedTau) {
        refinedTau = corrected;
        frequency = this.config.sampleRate / refinedTau;
      }
    }

    // Step 6: Median filter — smooth out single-frame frequency outliers.
    // Only apply when all 3 history entries map to the SAME MIDI note.
    // This stabilizes within-note frequency jitter without blending across notes.
    const currentMidi = frequencyToNearestMidi(frequency);
    this._freqHistory[this._freqHistoryIdx] = frequency;
    this._freqHistoryIdx = (this._freqHistoryIdx + 1) % 3;
    if (
      this._freqHistory[0] > 0 && this._freqHistory[1] > 0 && this._freqHistory[2] > 0 &&
      frequencyToNearestMidi(this._freqHistory[0]) === currentMidi &&
      frequencyToNearestMidi(this._freqHistory[1]) === currentMidi &&
      frequencyToNearestMidi(this._freqHistory[2]) === currentMidi
    ) {
      frequency = this._median3(this._freqHistory[0], this._freqHistory[1], this._freqHistory[2]);
    }

    r.frequency = frequency;
    r.confidence = confidence;
    r.voiced = true;
    r.midiNote = frequencyToNearestMidi(frequency);
    r.centsOffset = frequencyCentsOffset(frequency);
    return r;
  }

  /** Fast median of 3 values (no allocation) */
  private _median3(a: number, b: number, c: number): number {
    if (a > b) {
      if (b > c) return b;
      return a > c ? c : a;
    }
    if (a > c) return a;
    return b > c ? c : b;
  }

  /**
   * Compute RMS (root mean square) amplitude of the buffer.
   * Used for silence gating — no point running YIN on noise.
   */
  private computeRMS(buffer: Float32Array): number {
    let sum = 0;
    const len = Math.min(buffer.length, this.config.bufferSize);
    for (let i = 0; i < len; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / len);
  }

  /**
   * Step 1: Compute the difference function d(tau).
   * d(tau) = sum_{j=0}^{W-1} (x[j] - x[j + tau])^2
   *
   * PERF: Only compute up to maxTau+1 — values beyond the detectable
   * frequency range are never read. With minFrequency=80 Hz this cuts
   * the outer loop from 1024 to ~552, saving ~46% of O(n²) work.
   */
  private computeDifference(buffer: Float32Array): void {
    const limit = this.maxTau + 1;
    for (let tau = 0; tau < limit; tau++) {
      let sum = 0;
      for (let j = 0; j < this.halfSize; j++) {
        const delta = buffer[j] - buffer[j + tau];
        sum += delta * delta;
      }
      this.yinBuffer[tau] = sum;
    }
  }

  /**
   * Step 2: Cumulative mean normalized difference function.
   * d'(tau) = d(tau) / ((1/tau) * sum_{j=1}^{tau} d(j))
   * d'(0) = 1
   */
  private cumulativeMeanNormalize(): void {
    const limit = this.maxTau + 1;
    this.yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < limit; tau++) {
      runningSum += this.yinBuffer[tau];
      if (runningSum === 0) {
        this.yinBuffer[tau] = 1;
      } else {
        this.yinBuffer[tau] = this.yinBuffer[tau] * tau / runningSum;
      }
    }
  }

  /**
   * Step 3: Find the first tau where d'(tau) dips below the threshold,
   * then follow the valley to its minimum.
   */
  private findThresholdTau(): number {
    for (let tau = this.minTau; tau < this.maxTau; tau++) {
      if (this.yinBuffer[tau] < this.config.threshold) {
        // Walk down to the bottom of the valley
        while (tau + 1 < this.maxTau && this.yinBuffer[tau + 1] < this.yinBuffer[tau]) {
          tau++;
        }
        return tau;
      }
    }
    return -1; // No pitch found
  }

  /**
   * Step 4: Parabolic interpolation around the estimated tau
   * for sub-sample accuracy.
   */
  private parabolicInterpolation(tau: number): number {
    if (tau <= 0 || tau >= this.halfSize - 1) {
      return tau;
    }

    const s0 = this.yinBuffer[tau - 1];
    const s1 = this.yinBuffer[tau];
    const s2 = this.yinBuffer[tau + 1];

    const denominator = 2 * (2 * s1 - s2 - s0);
    if (denominator === 0) return tau;

    const adjustment = (s2 - s0) / denominator;
    return tau + adjustment;
  }

  /**
   * Step 5: Octave error correction.
   *
   * YIN can lock onto the 2nd harmonic (octave above) instead of the
   * fundamental, especially for piano low notes where the 2nd harmonic
   * has more energy. We check if there's a valid valley at 2x tau
   * (octave below). If that valley is reasonably deep, the detected
   * pitch was likely a harmonic — correct to the fundamental.
   */
  private correctOctaveError(refinedTau: number, rawTau: number): number {
    // If the original valley is very deep (CMNDF near zero), the detected
    // frequency is almost certainly the true fundamental — not a harmonic.
    const originalVal = this.yinBuffer[rawTau];
    if (originalVal < this.config.threshold * 0.3) return refinedTau;

    // Check tau*2 (one octave below) and tau*3 (two octaves below / fifth).
    // Piano fundamentals below C3 often have 2nd or 3rd harmonic stronger
    // than the fundamental, causing YIN to lock onto the harmonic.
    let bestCorrectedTau = refinedTau;
    let bestCorrectedVal = originalVal;

    for (const multiplier of [2, 3]) {
      const candidateTau = rawTau * multiplier;
      if (candidateTau >= this.maxTau) continue;

      // Find the best valley near candidateTau (±3 samples for tolerance)
      let bestTau = candidateTau;
      let bestVal = this.yinBuffer[candidateTau] ?? 1;
      for (let t = Math.max(this.minTau, candidateTau - 3); t <= Math.min(this.maxTau - 1, candidateTau + 3); t++) {
        if (this.yinBuffer[t] < bestVal) {
          bestVal = this.yinBuffer[t];
          bestTau = t;
        }
      }

      // The multiplied valley must be below threshold AND within 1.5x of the original.
      // For 3x correction, be slightly more conservative (1.3x) to avoid false corrections.
      const ratio = multiplier === 2 ? 1.5 : 1.3;
      if (bestVal < this.config.threshold && bestVal < bestCorrectedVal * ratio) {
        bestCorrectedTau = this.parabolicInterpolation(bestTau);
        bestCorrectedVal = bestVal;
      }
    }

    return bestCorrectedTau;
  }

  /** Get the configured sample rate */
  getSampleRate(): number {
    return this.config.sampleRate;
  }

  /** Get the configured buffer size */
  getBufferSize(): number {
    return this.config.bufferSize;
  }

  /** Get latency of one detection cycle in milliseconds */
  getLatencyMs(): number {
    return (this.config.bufferSize / this.config.sampleRate) * 1000;
  }
}

// ---------------------------------------------------------------------------
// Note tracker — adds hysteresis to prevent rapid note flickering
// ---------------------------------------------------------------------------

export interface NoteTrackerConfig {
  /** Minimum time (ms) a note must be sustained before emitting noteOn (default: 40) */
  onsetHoldMs: number;
  /** Minimum time (ms) of silence before emitting noteOff (default: 80) */
  releaseHoldMs: number;
  /** Maximum cents deviation to consider same note (default: 40) */
  sameCentsThreshold: number;
}

const DEFAULT_TRACKER_CONFIG: NoteTrackerConfig = {
  onsetHoldMs: 40,
  releaseHoldMs: 80,
  sameCentsThreshold: 40,
};

export interface NoteEvent {
  type: 'noteOn' | 'noteOff';
  midiNote: number;
  confidence: number;
  timestamp: number;
}

/**
 * Tracks pitch detections over time and emits stable noteOn/noteOff events.
 * Prevents rapid flickering by requiring sustained detection before onset
 * and sustained silence before release.
 *
 * Uses a confirmation counter instead of pure time-based onset: the candidate
 * note must be detected N consecutive times (default: 2) before triggering.
 * This is more reliable than time-based onset because buffer arrival timing
 * can be irregular.
 */
export class NoteTracker {
  private readonly config: NoteTrackerConfig;
  private currentNote: number | null = null;
  private candidateNote: number | null = null;
  private candidateCount = 0;
  private lastVoicedTime = 0;
  private callback: ((event: NoteEvent) => void) | null = null;
  /** Minimum consecutive detections before onset (derived from onsetHoldMs) */
  private readonly minConfirmations: number;

  constructor(config?: Partial<NoteTrackerConfig>) {
    this.config = { ...DEFAULT_TRACKER_CONFIG, ...config };
    // At ~46ms per buffer (2048/44100), 2 confirmations = ~92ms.
    // Clamp to minimum 2 to reject single-buffer flukes.
    this.minConfirmations = Math.max(2, Math.round(this.config.onsetHoldMs / 46));
  }

  /** Register callback for note events */
  onNoteEvent(callback: (event: NoteEvent) => void): () => void {
    this.callback = callback;
    return () => { this.callback = null; };
  }

  /** Feed a new pitch detection result */
  update(result: PitchResult): void {
    const now = result.timestamp;

    if (result.voiced && result.midiNote !== null) {
      this.lastVoicedTime = now;

      if (result.midiNote === this.currentNote) {
        // Same note sustained — reset candidate
        this.candidateNote = null;
        this.candidateCount = 0;
        return;
      }

      if (result.midiNote === this.candidateNote) {
        // Same candidate again — increment confirmation counter
        this.candidateCount++;
        if (this.candidateCount >= this.minConfirmations) {
          // Confirmed! Emit noteOff for previous, noteOn for new
          if (this.currentNote !== null) {
            this.emit({ type: 'noteOff', midiNote: this.currentNote, confidence: 0, timestamp: now });
          }
          this.currentNote = result.midiNote;
          this.candidateNote = null;
          this.candidateCount = 0;
          this.emit({ type: 'noteOn', midiNote: this.currentNote, confidence: result.confidence, timestamp: now });
        }
      } else {
        // New candidate — start fresh
        this.candidateNote = result.midiNote;
        this.candidateCount = 1;
      }
    } else {
      // Unvoiced — check for release
      this.candidateNote = null;
      this.candidateCount = 0;
      if (this.currentNote !== null && now - this.lastVoicedTime >= this.config.releaseHoldMs) {
        this.emit({ type: 'noteOff', midiNote: this.currentNote, confidence: 0, timestamp: now });
        this.currentNote = null;
      }
    }
  }

  /** Force release any active note */
  reset(): void {
    if (this.currentNote !== null) {
      this.emit({ type: 'noteOff', midiNote: this.currentNote, confidence: 0, timestamp: Date.now() });
    }
    this.currentNote = null;
    this.candidateNote = null;
    this.candidateCount = 0;
    this.lastVoicedTime = 0;
  }

  /** Get currently active note (or null) */
  getCurrentNote(): number | null {
    return this.currentNote;
  }

  private emit(event: NoteEvent): void {
    if (event.type === 'noteOn') {
      logger.log(`[NoteTracker] noteOn: MIDI ${event.midiNote} (conf=${event.confidence.toFixed(2)})`);
    }
    this.callback?.(event);
  }
}

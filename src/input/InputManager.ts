/**
 * InputManager — Unified input source manager
 *
 * Provides a single note event interface regardless of input source (MIDI, Mic, Touch).
 * Priority order for 'auto' mode: MIDI > Mic > Touch.
 *
 * Usage:
 *   const manager = new InputManager({ preferred: 'auto' });
 *   await manager.initialize();
 *   manager.onNoteEvent((event) => { ... });
 *   await manager.start();
 *   // ... later
 *   await manager.stop();
 *   manager.dispose();
 */

import type { MidiNoteEvent } from '../core/exercises/types';
import { getMidiInput } from './MidiInput';
import type { MidiInput } from './MidiInput';
import { MicrophoneInput, createMicrophoneInput } from './MicrophoneInput';
import { configureAudioSessionForRecording, isMicPermissionCached } from './AudioCapture';
import { useSettingsStore } from '../stores/settingsStore';
import { logger } from '../utils/logger';

/** Race a promise against a timeout. Resolves to the promise value or the fallback on timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.then((v) => { clearTimeout(timer); return v; }),
    new Promise<T>((resolve) => {
      timer = setTimeout(() => {
        logger.warn(`[InputManager] ${label} timed out after ${ms}ms — using fallback`);
        resolve(fallback);
      }, ms);
    }),
  ]);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InputMethod = 'auto' | 'midi' | 'mic' | 'touch';
export type ActiveInputMethod = 'midi' | 'mic' | 'touch';
export type InputNoteCallback = (event: MidiNoteEvent) => void;

export interface InputManagerConfig {
  /** Which input method to use (default: 'auto') */
  preferred: InputMethod;
  /** Default velocity for mic-detected notes (default: 80) */
  micDefaultVelocity?: number;
  /** Extra timing compensation for mic pipeline in ms (default: 0) */
  micLatencyCompensationMs?: number;
}

const DEFAULT_CONFIG: InputManagerConfig = {
  preferred: 'auto',
  micDefaultVelocity: 80,
  micLatencyCompensationMs: 0,
};

/**
 * Timing tolerance multiplier per input method.
 * Mic detection has ~120ms pipeline latency — widen scoring windows accordingly.
 */
export const INPUT_TIMING_MULTIPLIERS: Record<ActiveInputMethod, number> = {
  midi: 1.0,
  touch: 1.0,
  mic: 1.5,
};

/**
 * Base latency compensation per input method (ms).
 * Subtracted from played-note timestamps before scoring.
 */
export const INPUT_LATENCY_COMPENSATION_MS: Record<string, number> = {
  midi: 0,
  touch: 20,
  mic: 100,
  mic_poly: 120, // Polyphonic adds ~20ms for ONNX inference overhead
};

// ---------------------------------------------------------------------------
// InputManager
// ---------------------------------------------------------------------------

export class InputManager {
  private config: InputManagerConfig;
  private midiInput: MidiInput;
  private micInput: MicrophoneInput | null = null;
  private callbacks: Set<InputNoteCallback> = new Set();
  private unsubMidi: (() => void) | null = null;
  private unsubMic: (() => void) | null = null;
  private unsubMidiConnection: (() => void) | null = null;
  private _activeMethod: ActiveInputMethod = 'touch';
  private isStarted = false;
  private isInitialized = false;

  constructor(config?: Partial<InputManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.midiInput = getMidiInput();
  }

  /** Reason why mic failed (if it did). Exposed for UI to show user feedback. */
  private _micFailureReason: string | null = null;

  /** Get reason why mic failed to initialize (null if no failure) */
  getMicFailureReason(): string | null {
    return this._micFailureReason;
  }

  /**
   * Initialize available input sources and determine active method.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const preferred = this.config.preferred;
    this._micFailureReason = null;
    logger.log(`[InputManager] Initializing with preferred=${preferred}`);

    // Try MIDI first (always init — it's a no-op if no hardware)
    try {
      await this.midiInput.initialize();
    } catch (error) {
      logger.warn('[InputManager] MIDI init failed (non-fatal):', error);
    }

    const midiAvailable = this.midiInput.isReady() &&
      (await this.midiInput.getConnectedDevices()).length > 0;
    logger.log(`[InputManager] MIDI available: ${midiAvailable}`);

    // Determine active method.
    // Priority: MIDI (if available) > Mic (if permission cached) > Touch
    // Auto mode now includes mic IF permission was previously granted and cached.
    // This avoids: (1) blocking permission dialog, (2) the defaultToSpeaker option
    // in configureAudioSessionForRecording() routes audio to speaker (not earpiece).
    if (preferred === 'midi' || (preferred === 'auto' && midiAvailable)) {
      this._activeMethod = 'midi';
      // Auto-connect to the first available MIDI device so messages flow immediately
      await this._autoConnectMidi();
      logger.log('[InputManager] Selected: midi');
    } else if (preferred === 'mic' || (preferred === 'auto' && !midiAvailable && isMicPermissionCached())) {
      // Mic mode: explicit request OR auto mode with cached permission.
      try {
        logger.log(`[InputManager] Configuring mic (preferred=${preferred}, cachedPermission=${isMicPermissionCached()})...`);
        configureAudioSessionForRecording();

        // Auto mode always uses monophonic (fast YIN init, <1s). Explicit mic uses user's setting.
        const detectionMode = preferred === 'auto'
          ? 'monophonic'
          : (useSettingsStore.getState().micDetectionMode ?? 'monophonic');
        this.micInput = await withTimeout(
          createMicrophoneInput({
            defaultVelocity: this.config.micDefaultVelocity ?? 80,
            latencyCompensationMs: this.config.micLatencyCompensationMs ?? 0,
            mode: detectionMode,
          }),
          10000,
          null,
          'createMicrophoneInput',
        );
        if (this.micInput) {
          this._activeMethod = 'mic';
          logger.log(`[InputManager] Selected: mic (${detectionMode} mode, pipeline ready)`);
        } else {
          this._activeMethod = 'touch';
          this._micFailureReason = 'Microphone permission denied or timed out. Grant access in Settings > Purrrfect Keys.';
          logger.warn('[InputManager] Mic failed → falling back to touch. Reason:', this._micFailureReason);
        }
      } catch (error) {
        this._activeMethod = 'touch';
        this._micFailureReason = `Microphone initialization error: ${(error as Error).message}`;
        logger.error('[InputManager] Mic init error → falling back to touch:', error);
      }
    } else {
      // 'auto' without MIDI and no cached mic permission, or 'touch' — use touch keyboard
      this._activeMethod = 'touch';
      logger.log('[InputManager] Selected: touch');
    }

    // Wire up event forwarding
    this._wireEvents();
    this.isInitialized = true;
    logger.log(`[InputManager] Initialized. Active method: ${this._activeMethod}`);
  }

  /**
   * Start listening for note events from the active input method.
   */
  async start(): Promise<void> {
    if (this.isStarted) return;
    this.isStarted = true;

    if (this._activeMethod === 'mic' && this.micInput) {
      await this.micInput.start();
    }
    // MIDI is always "listening" once initialized
  }

  /**
   * Stop listening for note events.
   */
  async stop(): Promise<void> {
    if (!this.isStarted) return;
    this.isStarted = false;

    if (this._activeMethod === 'mic' && this.micInput) {
      await this.micInput.stop();
    }
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    this.stop();
    this.unsubMidi?.();
    this.unsubMic?.();
    this.unsubMidiConnection?.();
    this.micInput?.dispose();
    this.callbacks.clear();
    this.unsubMidi = null;
    this.unsubMic = null;
    this.unsubMidiConnection = null;
    this.micInput = null;
    this.isInitialized = false;
  }

  /**
   * Register callback for note events from the active input source.
   * Returns an unsubscribe function.
   */
  onNoteEvent(callback: InputNoteCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /** Currently active input method */
  get activeMethod(): ActiveInputMethod {
    return this._activeMethod;
  }

  /** Whether the manager has been initialized */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /** Whether the manager is currently listening */
  getIsStarted(): boolean {
    return this.isStarted;
  }

  /** Get timing tolerance multiplier for the current input method */
  getTimingMultiplier(): number {
    return INPUT_TIMING_MULTIPLIERS[this._activeMethod];
  }

  /** Get latency compensation in ms for the current input method */
  getLatencyCompensationMs(): number {
    if (this._activeMethod === 'mic') {
      const detectionMode = useSettingsStore.getState().micDetectionMode ?? 'monophonic';
      return detectionMode === 'polyphonic'
        ? INPUT_LATENCY_COMPENSATION_MS.mic_poly
        : INPUT_LATENCY_COMPENSATION_MS.mic;
    }
    return INPUT_LATENCY_COMPENSATION_MS[this._activeMethod];
  }

  /**
   * Switch to a different input method at runtime.
   * Stops current input, switches, and restarts if was previously started.
   */
  async switchMethod(method: InputMethod): Promise<void> {
    const wasStarted = this.isStarted;
    await this.stop();

    // Unsubscribe current
    this.unsubMidi?.();
    this.unsubMic?.();
    this.unsubMidiConnection?.();
    this.unsubMidi = null;
    this.unsubMic = null;
    this.unsubMidiConnection = null;

    this.config.preferred = method;

    // Re-determine active method
    this._micFailureReason = null;
    if (method === 'midi') {
      this._activeMethod = 'midi';
      await this._autoConnectMidi();
    } else if (method === 'mic') {
      if (!this.micInput) {
        try {
          configureAudioSessionForRecording();
          const detectionMode = useSettingsStore.getState().micDetectionMode ?? 'monophonic';
          this.micInput = await withTimeout(
            createMicrophoneInput({
              defaultVelocity: this.config.micDefaultVelocity ?? 80,
              latencyCompensationMs: this.config.micLatencyCompensationMs ?? 0,
              mode: detectionMode,
            }),
            10000,
            null,
            'switchMethod:createMicrophoneInput',
          );
        } catch (error) {
          this._micFailureReason = `Mic init error: ${(error as Error).message}`;
          logger.error('[InputManager] switchMethod mic error:', error);
        }
      }
      if (this.micInput) {
        this._activeMethod = 'mic';
      } else {
        this._activeMethod = 'touch';
        if (!this._micFailureReason) {
          this._micFailureReason = 'Microphone permission denied. Grant access in Settings.';
        }
        logger.warn('[InputManager] switchMethod: mic failed → touch.', this._micFailureReason);
      }
    } else if (method === 'touch') {
      this._activeMethod = 'touch';
    } else {
      // 'auto' — re-run detection (MIDI > Mic > Touch)
      const midiAvailable = this.midiInput.isReady() &&
        (await this.midiInput.getConnectedDevices()).length > 0;
      if (midiAvailable) {
        this._activeMethod = 'midi';
        await this._autoConnectMidi();
      } else if (this.micInput) {
        this._activeMethod = 'mic';
      } else if (isMicPermissionCached()) {
        // Permission was previously granted — init mic without OS dialog
        try {
          configureAudioSessionForRecording();
          this.micInput = await withTimeout(
            createMicrophoneInput({
              defaultVelocity: this.config.micDefaultVelocity ?? 80,
              latencyCompensationMs: this.config.micLatencyCompensationMs ?? 0,
              mode: 'monophonic', // Auto mode uses fast monophonic
            }),
            10000,
            null,
            'switchMethod:auto:createMicrophoneInput',
          );
          this._activeMethod = this.micInput ? 'mic' : 'touch';
        } catch {
          this._activeMethod = 'touch';
        }
      } else {
        this._activeMethod = 'touch';
      }
    }

    this._wireEvents();

    if (wasStarted) {
      await this.start();
    }
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  /**
   * Auto-connect to the first available MIDI device.
   * Without this, NativeMidiInput.activeInput stays null and no MIDI messages flow.
   */
  private async _autoConnectMidi(): Promise<void> {
    try {
      const devices = await this.midiInput.getConnectedDevices();
      if (devices.length > 0) {
        const device = devices[0];
        await this.midiInput.connectDevice(device.id);
        logger.log(`[InputManager] Auto-connected MIDI device: ${device.name} (${device.id})`);
      }
    } catch (error) {
      logger.warn('[InputManager] MIDI auto-connect failed:', error);
    }
  }

  private _wireEvents(): void {
    // Always subscribe to MIDI (in case device is connected mid-session)
    if (!this.unsubMidi) {
      this.unsubMidi = this.midiInput.onNoteEvent((event) => {
        if (this._activeMethod !== 'midi') return;
        this._emitNote(event);
      });
    }

    // Hot-plug: auto-connect newly connected MIDI devices and switch to MIDI
    if (!this.unsubMidiConnection) {
      this.unsubMidiConnection = this.midiInput.onDeviceConnection((device, connected) => {
        if (connected) {
          logger.log(`[InputManager] MIDI device hot-plugged: ${device.name}`);
          // Auto-connect and switch to MIDI if not already
          this.midiInput.connectDevice(device.id).then(() => {
            if (this._activeMethod !== 'midi') {
              this._activeMethod = 'midi';
              logger.log('[InputManager] Switched to MIDI (hot-plug)');
            }
          }).catch((err) => {
            logger.warn('[InputManager] Hot-plug connect failed:', err);
          });
        } else {
          logger.log(`[InputManager] MIDI device disconnected: ${device.name}`);
          // If all MIDI devices disconnected, fall back to touch
          this.midiInput.getConnectedDevices().then((devices) => {
            if (devices.length === 0 && this._activeMethod === 'midi') {
              this._activeMethod = 'touch';
              logger.log('[InputManager] No MIDI devices — falling back to touch');
            }
          }).catch(() => {});
        }
      });
    }

    // Subscribe to mic if available
    if (this.micInput && !this.unsubMic) {
      this.unsubMic = this.micInput.onNoteEvent((event) => {
        if (this._activeMethod !== 'mic') return;
        this._emitNote(event);
      });
    }
  }

  private _emitNote(event: MidiNoteEvent): void {
    for (const cb of this.callbacks) {
      cb(event);
    }
  }
}

/**
 * Create and initialize an InputManager with the given preferred method.
 */
export async function createInputManager(
  preferred: InputMethod = 'auto'
): Promise<InputManager> {
  const manager = new InputManager({ preferred });
  await manager.initialize();
  return manager;
}

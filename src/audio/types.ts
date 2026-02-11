/**
 * Audio engine type definitions
 * Platform-agnostic types for audio playback control
 */

export interface NoteHandle {
  note: number;
  startTime: number;
  release: () => void;
}

export type AudioContextState = 'suspended' | 'running' | 'closed';

export interface IAudioEngine {
  // Lifecycle
  initialize(): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  dispose(): void;

  // Playback
  playNote(note: number, velocity?: number): NoteHandle;
  releaseNote(handle: NoteHandle): void;
  releaseAllNotes(): void;

  // Configuration
  setVolume(volume: number): void;
  getLatency(): number;

  // Status
  isReady(): boolean;
  getState(): AudioContextState;
}

/**
 * ADSR Envelope configuration
 * Attack: 0-100ms
 * Decay: 50-500ms
 * Sustain: 0.0-1.0 (sustain level as fraction of peak)
 * Release: 50-500ms
 */
export interface ADSRConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface SampleInfo {
  note: number;
  buffer: AudioBuffer;
  duration: number;
}

export interface NoteState {
  note: number;
  source: AudioBufferSourceNode;
  gain: GainNode;
  startTime: number;
  baseNote: number;
}

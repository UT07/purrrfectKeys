/**
 * Audio engine abstraction layer
 * Platform-agnostic interface for audio playback
 */

export interface AudioEngineState {
  isInitialized: boolean;
  isPlaying: boolean;
  currentTime: number;
}

export interface PlayNoteOptions {
  velocity?: number; // 0-127
  duration?: number; // milliseconds
}

export interface AudioEngine {
  // Initialization
  initialize(): Promise<void>;
  dispose(): Promise<void>;

  // Playback control
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  reset(): void;

  // Note playing
  playNote(midiNote: number, options?: PlayNoteOptions): Promise<void>;
  releaseNote(midiNote: number): Promise<void>;

  // Metronome
  playMetronomeClick(frequency?: number): Promise<void>;

  // State
  getState(): AudioEngineState;
  setVolume(volume: number): void;
  getVolume(): number;
}

/**
 * No-op implementation for testing
 */
export class NoOpAudioEngine implements AudioEngine {
  state: AudioEngineState = {
    isInitialized: false,
    isPlaying: false,
    currentTime: 0,
  };

  volume = 0.8;

  async initialize(): Promise<void> {
    this.state.isInitialized = true;
  }

  async dispose(): Promise<void> {
    this.state.isInitialized = false;
  }

  async play(): Promise<void> {
    this.state.isPlaying = true;
  }

  async pause(): Promise<void> {
    this.state.isPlaying = false;
  }

  async stop(): Promise<void> {
    this.state.isPlaying = false;
    this.state.currentTime = 0;
  }

  reset(): void {
    this.state.currentTime = 0;
  }

  async playNote(_midiNote: number, _options?: PlayNoteOptions): Promise<void> {
    // No-op
  }

  async releaseNote(_midiNote: number): Promise<void> {
    // No-op
  }

  async playMetronomeClick(_frequency?: number): Promise<void> {
    // No-op
  }

  getState(): AudioEngineState {
    return this.state;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.volume;
  }
}

// Default instance
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    // For now, use NoOp. Will be replaced with react-native-audio-api impl
    audioEngineInstance = new NoOpAudioEngine();
  }
  return audioEngineInstance;
}

export function setAudioEngine(engine: AudioEngine): void {
  audioEngineInstance = engine;
}

/**
 * Factory function that creates the best available IAudioEngine implementation.
 *
 * Selection order:
 * 1. WebAudioEngine (react-native-audio-api oscillator synthesis) — preferred
 *    True polyphony, no sample loading, low latency
 * 2. ExpoAudioEngine (expo-av) — fallback for Expo Go / when react-native-audio-api is unavailable
 *
 * Usage:
 *   const engine = createAudioEngine();
 *   await engine.initialize();
 */
export { createAudioEngine } from './createAudioEngine';

/**
 * Mock Audio Engine for development/testing
 * Simulates audio playback without requiring native modules
 */

import type { IAudioEngine, NoteHandle, AudioContextState } from './types';

export class MockAudioEngine implements IAudioEngine {
  private initialized = false;
  private volume = 0.8;
  private activeNotes = new Map<number, number>();

  async initialize(): Promise<void> {
    console.log('[MockAudioEngine] Initializing...');
    this.initialized = true;
  }

  async suspend(): Promise<void> {
    console.log('[MockAudioEngine] Suspended');
  }

  async resume(): Promise<void> {
    console.log('[MockAudioEngine] Resumed');
  }

  dispose(): void {
    console.log('[MockAudioEngine] Disposed');
    this.initialized = false;
    this.activeNotes.clear();
  }

  playNote(note: number, velocity: number = 0.8): NoteHandle {
    console.log(`[MockAudioEngine] Playing note ${note} with velocity ${velocity}`);

    const startTime = Date.now();
    this.activeNotes.set(note, startTime);

    return {
      note,
      startTime: startTime / 1000,
      release: () => this.doRelease(note),
    };
  }

  private doRelease(note: number): void {
    console.log(`[MockAudioEngine] Releasing note ${note}`);
    this.activeNotes.delete(note);
  }

  releaseNote(handle: NoteHandle): void {
    handle.release();
  }

  releaseAllNotes(): void {
    console.log('[MockAudioEngine] Releasing all notes');
    this.activeNotes.clear();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    console.log(`[MockAudioEngine] Volume set to ${this.volume}`);
  }

  getLatency(): number {
    return 15; // Mock 15ms latency
  }

  isReady(): boolean {
    return this.initialized;
  }

  getState(): AudioContextState {
    return this.initialized ? 'running' : 'closed';
  }

  getActiveNoteCount(): number {
    return this.activeNotes.size;
  }

  getMemoryUsage(): { samples: number; total: number } {
    return { samples: 0, total: 0 };
  }
}

let mockAudioEngineInstance: MockAudioEngine | null = null;

export function getAudioEngine(): MockAudioEngine {
  if (!mockAudioEngineInstance) {
    mockAudioEngineInstance = new MockAudioEngine();
  }
  return mockAudioEngineInstance;
}

export function resetAudioEngine(): void {
  if (mockAudioEngineInstance) {
    mockAudioEngineInstance.dispose();
  }
  mockAudioEngineInstance = null;
}

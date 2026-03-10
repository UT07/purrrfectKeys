/**
 * Expo Audio Engine — Round-Robin Sound Pool with Real Piano Samples
 *
 * Uses expo-av with a round-robin pool of Audio.Sound objects per note.
 * Each note gets VOICES_PER_NOTE sound objects. On each play, we cycle
 * to the next voice using replayAsync() which atomically resets and plays.
 * This eliminates the stop/play race condition that caused dropped notes.
 * Notes sustain until released (key up stops the sound).
 *
 * Samples: 5 octave-spaced piano recordings (C2-C6) from FluidR3 GM soundfont.
 * Notes between samples use playback rate shifting: rate = 2^((note - baseNote) / 12)
 * Maximum pitch shift is ±6 semitones, which preserves natural timbre.
 *
 * Falls back to procedural WAV synthesis if sample loading fails.
 */

import { Audio, AVPlaybackSource } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import type { IAudioEngine, NoteHandle, AudioContextState } from './types';
import { logger } from '../utils/logger';

const VOICES_PER_NOTE = 3; // Round-robin voices per note (3 prevents clicks from rapid re-triggers)

/**
 * Real piano sample sources — statically required for Metro bundling.
 * FluidR3 GM Acoustic Grand Piano, 44.1kHz stereo MP3, ~25KB each.
 * Octave-spaced: each note covers ±6 semitones via pitch shifting.
 */
const SAMPLE_SOURCES: { midiNote: number; source: AVPlaybackSource }[] = [
  { midiNote: 36, source: require('../../assets/samples/piano-c2.mp3') },
  { midiNote: 48, source: require('../../assets/samples/piano-c3.mp3') },
  { midiNote: 60, source: require('../../assets/samples/piano-c4.mp3') },
  { midiNote: 72, source: require('../../assets/samples/piano-c5.mp3') },
  { midiNote: 84, source: require('../../assets/samples/piano-c6.mp3') },
];

/**
 * Find the nearest sample source for a given MIDI note.
 * Returns the sample source and the playback rate needed to pitch-shift.
 */
function getNearestSample(note: number): { source: AVPlaybackSource; baseNote: number; rate: number } {
  let nearest = SAMPLE_SOURCES[0];
  let minDistance = Math.abs(note - nearest.midiNote);

  for (const sample of SAMPLE_SOURCES) {
    const distance = Math.abs(note - sample.midiNote);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = sample;
    }
  }

  const rate = Math.pow(2, (note - nearest.midiNote) / 12);
  return { source: nearest.source, baseNote: nearest.midiNote, rate };
}

// ── Procedural fallback (used only if real samples fail to load) ──────────

const FALLBACK_BASE_NOTE = 60;
const FALLBACK_FREQUENCY = 261.63;
const FALLBACK_SAMPLE_RATE = 44100;
const FALLBACK_DURATION = 5.0;

function generateFallbackWav(): ArrayBuffer {
  const numSamples = Math.floor(FALLBACK_SAMPLE_RATE * FALLBACK_DURATION);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = FALLBACK_SAMPLE_RATE * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, FALLBACK_SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const freq = FALLBACK_FREQUENCY;
  for (let i = 0; i < numSamples; i++) {
    const t = i / FALLBACK_SAMPLE_RATE;
    const envelope = Math.exp(-t * 1.0);
    const attack = Math.min(1.0, t / 0.01);
    const fundamental = Math.sin(2 * Math.PI * freq * t);
    const harmonic2 = 0.5 * Math.sin(2 * Math.PI * freq * 2 * t);
    const harmonic3 = 0.25 * Math.sin(2 * Math.PI * freq * 3 * t);
    const harmonic4 = 0.1 * Math.sin(2 * Math.PI * freq * 4 * t);
    const sample = (fundamental + harmonic2 + harmonic3 + harmonic4) / 1.85;
    const amplitude = sample * envelope * attack * 0.8;
    const clamped = Math.max(-1, Math.min(1, amplitude));
    view.setInt16(headerSize + i * 2, Math.floor(clamped * 32767), true);
  }

  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;

    output += alphabet[(triple >> 18) & 0x3f];
    output += alphabet[(triple >> 12) & 0x3f];
    output += i + 1 < bytes.length ? alphabet[(triple >> 6) & 0x3f] : '=';
    output += i + 2 < bytes.length ? alphabet[triple & 0x3f] : '=';
  }

  return output;
}

/**
 * Round-robin voice pool for a single note.
 * Contains VOICES_PER_NOTE sound objects that cycle on each play.
 */
interface NoteVoicePool {
  sounds: Audio.Sound[];
  nextVoice: number; // Index of the next voice to use
}

// Notes to pre-load: C3 through C5 — covers all lesson ranges
const PRELOAD_NOTES = [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
                       60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72];

/** Base frequency for the metronome click WAV. Pitch-shifted via playback rate. */
const METRONOME_BASE_FREQ = 1000;
const METRONOME_CLICK_DURATION = 0.035; // 35ms — crisp percussive tick

/**
 * Generate a short sine-wave click WAV buffer at the base frequency.
 * Used for the metronome click sound. Pitch-shifted via playback rate.
 */
function generateMetronomeClickWav(): ArrayBuffer {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * METRONOME_CLICK_DURATION);
  const bitsPerSample = 16;
  const byteRate = sampleRate * (bitsPerSample / 8);
  const dataSize = numSamples * 2;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Exponential decay for crisp percussive feel, instant attack
    const envelope = Math.exp(-t * 90) * Math.min(1.0, t / 0.001);
    const sample = Math.sin(2 * Math.PI * METRONOME_BASE_FREQ * t) * envelope * 0.3;
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(headerSize + i * 2, Math.floor(clamped * 32767), true);
  }

  return buffer;
}

export class ExpoAudioEngine implements IAudioEngine {
  private initialized = false;
  private volume = 0.5;
  /** Legacy: single fallback source when real samples fail */
  private fallbackSource: AVPlaybackSource | null = null;
  /** Whether we're using real multi-sample sources (true) or single fallback WAV (false) */
  private useRealSamples = false;
  private voicePools: Map<number, NoteVoicePool> = new Map();
  private activeNotes: Set<number> = new Set();
  /** Track which voice is currently playing for each note, so release can stop it */
  private activeVoices: Map<number, Audio.Sound> = new Map();
  /** Pre-loaded metronome click sound (base frequency, pitch-shifted via rate) */
  private metronomeSound: Audio.Sound | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const totalStart = Date.now();

    try {
      // Audio session is configured by createAudioEngine.ts:ensureAudioModeConfigured()
      // which uses AudioManager (sync) to avoid racing with mic PlayAndRecord mode.
      // Do NOT call Audio.setAudioModeAsync() here — it would clobber the session.

      // Try loading real piano samples first
      let samplesAvailable = false;
      try {
        // Test that at least the Middle C sample can be loaded
        const testSound = await Audio.Sound.createAsync(
          SAMPLE_SOURCES[2].source, // C4 (Middle C)
          { shouldPlay: false }
        );
        await testSound.sound.unloadAsync();
        samplesAvailable = true;
        this.useRealSamples = true;
        logger.log(`[ExpoAudioEngine] Real piano samples available (FluidR3 GM)`);
      } catch (sampleError) {
        logger.warn(`[ExpoAudioEngine] Real samples unavailable, falling back to procedural:`, sampleError);
      }

      // Fallback: generate procedural WAV if real samples failed
      if (!samplesAvailable) {
        const wavStart = Date.now();
        const wavBuffer = generateFallbackWav();
        logger.log(`[ExpoAudioEngine] Fallback WAV generated: ${wavBuffer.byteLength} bytes (${Date.now() - wavStart}ms)`);

        const writeStart = Date.now();
        const base64 = arrayBufferToBase64(wavBuffer);
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) {
          throw new Error('FileSystem.cacheDirectory is null');
        }
        const fileUri = cacheDir + 'piano-tone.wav';
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        logger.log(`[ExpoAudioEngine] Fallback WAV written: ${fileUri}, exists=${fileInfo.exists} (${Date.now() - writeStart}ms)`);

        this.fallbackSource = { uri: fileUri };
      }

      // Pre-create round-robin voice pools
      const poolStart = Date.now();
      await this.preloadVoicePools();
      const poolMs = Date.now() - poolStart;

      // Pre-load metronome click sound
      await this.preloadMetronomeClick();

      this.initialized = true;

      // Pool health report
      const loadedCount = this.voicePools.size;
      const expectedCount = PRELOAD_NOTES.length;
      const totalVoices = loadedCount * VOICES_PER_NOTE;
      const sampleType = this.useRealSamples ? 'FluidR3 GM piano' : 'procedural synthesis';
      logger.log(
        `[ExpoAudioEngine] Pool health: ${loadedCount}/${expectedCount} notes loaded, ` +
        `${totalVoices} total voices (${poolMs}ms) [${sampleType}]`
      );

      const totalMs = Date.now() - totalStart;
      logger.log(`[ExpoAudioEngine] Initialized in ${totalMs}ms (${loadedCount} notes x ${VOICES_PER_NOTE} voices)`);

      await this.warmUpAudio();
    } catch (error) {
      console.error('[ExpoAudioEngine] Initialization failed:', error);
      throw error;
    }
  }

  private async warmUpAudio(): Promise<void> {
    const warmStart = Date.now();
    try {
      const pool = this.voicePools.get(60);
      if (pool) {
        await pool.sounds[0].replayAsync({
          positionMillis: 0,
          volume: 0.01,
          shouldPlay: true,
        });
        setTimeout(() => {
          pool.sounds[0].stopAsync().catch(() => {});
        }, 50);
        logger.log(`[ExpoAudioEngine] Audio warm-up complete (${Date.now() - warmStart}ms)`);
      } else {
        logger.warn('[ExpoAudioEngine] Warm-up skipped: no pool for note 60');
      }
    } catch (error) {
      logger.warn(`[ExpoAudioEngine] Warm-up failed after ${Date.now() - warmStart}ms (non-critical):`, error);
    }
  }

  /**
   * Pre-load the metronome click WAV as an Audio.Sound object.
   * Generates a short sine-wave WAV at METRONOME_BASE_FREQ (1000Hz),
   * writes it to cache, and creates a reusable Audio.Sound.
   * Pitch shifting for downbeat (1500Hz) is done via playback rate.
   */
  private async preloadMetronomeClick(): Promise<void> {
    try {
      const wavBuffer = generateMetronomeClickWav();
      const base64 = arrayBufferToBase64(wavBuffer);
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) return;

      const fileUri = cacheDir + 'metronome-click.wav';
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: false, volume: 0.3 }
      );
      this.metronomeSound = sound;
      logger.log('[ExpoAudioEngine] Metronome click preloaded');
    } catch (error) {
      logger.warn('[ExpoAudioEngine] Metronome click preload failed (non-critical):', error);
    }
  }

  /**
   * Play a short metronome click.
   * @param frequency Click pitch in Hz (1500 for downbeat, 1000 for other beats)
   * @param volume Click volume 0-1 (metronomeVolume from settings)
   */
  playMetronomeClick(frequency = 1000, volume = 0.3): void {
    if (!this.metronomeSound) return;

    const clampedVol = Math.max(0, Math.min(1, volume));
    // Pitch-shift: rate = requestedFreq / baseFreq (e.g. 1500/1000 = 1.5x for downbeat)
    const rate = Math.max(0.25, Math.min(4.0, frequency / METRONOME_BASE_FREQ));

    this.metronomeSound.replayAsync({
      positionMillis: 0,
      volume: clampedVol,
      rate,
      shouldPlay: true,
    }).catch(() => {
      // Non-critical — metronome click failure should not crash playback
    });
  }

  /**
   * Create VOICES_PER_NOTE Audio.Sound objects per note, each pre-configured
   * with the correct playback rate. On play, we just call replayAsync().
   *
   * With real samples: each note uses the nearest octave-spaced sample (C2-C6)
   * and pitch-shifts via playbackRate. Max shift is ±6 semitones.
   *
   * With fallback: all notes use the single procedural C4 WAV, shifted by rate.
   */
  private async preloadVoicePools(): Promise<void> {
    if (!this.useRealSamples && !this.fallbackSource) return;

    const loadPromises = PRELOAD_NOTES.map(async (note) => {
      try {
        let source: AVPlaybackSource;
        let rate: number;

        if (this.useRealSamples) {
          // Real samples: find nearest octave sample and compute pitch shift
          const nearest = getNearestSample(note);
          source = nearest.source;
          rate = nearest.rate;
        } else {
          // Fallback: single procedural WAV at C4, pitch-shift everything
          source = this.fallbackSource!;
          rate = Math.pow(2, (note - FALLBACK_BASE_NOTE) / 12);
        }

        const clampedRate = Math.max(0.25, Math.min(4.0, rate));
        const sounds: Audio.Sound[] = [];

        for (let v = 0; v < VOICES_PER_NOTE; v++) {
          const { sound } = await Audio.Sound.createAsync(
            source,
            {
              shouldPlay: false,
              volume: this.volume,
              rate: clampedRate,
              shouldCorrectPitch: false,
            }
          );
          // Clean up activeNotes when a pooled voice finishes naturally
          // (prevents polyphonyScale from permanently decreasing)
          sound.setOnPlaybackStatusUpdate((status) => {
            if ('didJustFinish' in status && status.didJustFinish) {
              this.activeNotes.delete(note);
              this.activeVoices.delete(note);
            }
          });
          sounds.push(sound);
        }

        this.voicePools.set(note, { sounds, nextVoice: 0 });
      } catch (error) {
        logger.warn(`[ExpoAudioEngine] Failed to pre-load note ${note}:`, error);
      }
    });

    await Promise.all(loadPromises);

    const loadedCount = this.voicePools.size;
    const expectedCount = PRELOAD_NOTES.length;
    if (loadedCount < expectedCount) {
      const missingNotes = PRELOAD_NOTES.filter(n => !this.voicePools.has(n));
      console.error(
        `[ExpoAudioEngine] WARNING: Only ${loadedCount}/${expectedCount} note pools loaded. ` +
        `Missing notes: [${missingNotes.join(', ')}]. Audio may be unreliable on these notes.`
      );
    }
  }

  async suspend(): Promise<void> {
    for (const [, pool] of this.voicePools) {
      for (const sound of pool.sounds) {
        sound.stopAsync().catch(() => {});
      }
    }
  }

  async resume(): Promise<void> {
    // One-shot sounds, nothing to resume
  }

  dispose(): void {
    for (const [, pool] of this.voicePools) {
      for (const sound of pool.sounds) {
        sound.unloadAsync().catch(() => {});
      }
    }
    this.voicePools.clear();
    this.activeNotes.clear();
    this.activeVoices.clear();
    this.fallbackSource = null;
    this.useRealSamples = false;
    if (this.metronomeSound) {
      this.metronomeSound.unloadAsync().catch(() => {});
      this.metronomeSound = null;
    }
    this.initialized = false;
    logger.log('[ExpoAudioEngine] Disposed');
  }

  /**
   * Play a note using the round-robin voice pool.
   *
   * Key design: replayAsync() is a SINGLE atomic bridge call that resets
   * position and starts playback. No race condition between stop + play.
   * Round-robin ensures rapid re-triggers of the same note always have
   * a fresh voice available (voice 0 may still be fading while voice 1 plays).
   */
  playNote(note: number, velocity: number = 0.8): NoteHandle {
    if (!this.initialized) {
      logger.warn(`[ExpoAudioEngine] playNote(${note}) skipped: not initialized, pools=${this.voicePools.size}`);
      return {
        note,
        startTime: Date.now() / 1000,
        release: () => {},
      };
    }

    const clampedVelocity = Math.max(0.1, Math.min(1.0, velocity));
    const startTime = Date.now() / 1000;
    // Scale volume down when many notes are active to prevent digital clipping.
    // Using 1/sqrt(n) keeps perceived loudness roughly constant as polyphony increases.
    const activeCount = this.activeNotes.size + 1; // +1 for the note about to play
    const polyphonyScale = Math.min(1.0, 1.0 / Math.sqrt(activeCount));
    const vol = clampedVelocity * this.volume * polyphonyScale;

    const pool = this.voicePools.get(note);
    if (pool) {
      // Round-robin: pick the next voice and advance the index
      const voice = pool.sounds[pool.nextVoice];
      pool.nextVoice = (pool.nextVoice + 1) % pool.sounds.length;

      // Track which voice is playing this note so release can stop it
      this.activeVoices.set(note, voice);

      // Fire-and-forget: replayAsync atomically resets and plays
      voice.replayAsync({
        positionMillis: 0,
        volume: vol,
        shouldPlay: true,
      }).catch(() => {
        // If replay fails, try the other voice
        const fallbackVoice = pool.sounds[pool.nextVoice];
        this.activeVoices.set(note, fallbackVoice);
        fallbackVoice.replayAsync({
          positionMillis: 0,
          volume: vol,
          shouldPlay: true,
        }).catch(() => {});
      });

      this.activeNotes.add(note);
    } else {
      // Non-pooled note: create on the fly (higher latency)
      if (this.useRealSamples) {
        const nearest = getNearestSample(note);
        const clampedRate = Math.max(0.25, Math.min(4.0, nearest.rate));
        this.createAndPlaySound(note, clampedRate, clampedVelocity, nearest.source);
      } else if (this.fallbackSource) {
        const rate = Math.pow(2, (note - FALLBACK_BASE_NOTE) / 12);
        const clampedRate = Math.max(0.25, Math.min(4.0, rate));
        this.createAndPlaySound(note, clampedRate, clampedVelocity, this.fallbackSource);
      }
    }

    return {
      note,
      startTime,
      release: () => this.doRelease(note),
    };
  }

  private async createAndPlaySound(
    note: number,
    rate: number,
    velocity: number,
    source: AVPlaybackSource
  ): Promise<void> {
    try {
      // Apply polyphony scaling to match pooled path behavior
      const activeCount = this.activeNotes.size;
      const polyphonyScale = activeCount > 0 ? Math.min(1.0, 1.0 / Math.sqrt(activeCount)) : 1.0;
      const vol = velocity * this.volume * polyphonyScale;

      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          shouldPlay: true,
          volume: vol,
          rate,
          shouldCorrectPitch: false,
        }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          this.activeVoices.delete(note);
          sound.unloadAsync().catch(() => {});
          this.activeNotes.delete(note);
        }
      });

      this.activeNotes.add(note);
      this.activeVoices.set(note, sound);
    } catch (error) {
      console.error(`[ExpoAudioEngine] Failed to play note ${note}:`, error);
    }
  }

  private doRelease(note: number): void {
    this.activeNotes.delete(note);

    // Fade out before stopping to prevent click artifacts.
    // Without this, stopAsync() abruptly cuts the waveform at a non-zero
    // amplitude, producing a DC offset "click" that's especially noticeable
    // when the mic is active (PlayAndRecord mode amplifies speaker artifacts).
    const voice = this.activeVoices.get(note);
    if (voice) {
      this.activeVoices.delete(note);
      // Micro-fade: ramp volume to 0 over 5ms, then stop
      voice.setVolumeAsync(0).then(() => {
        setTimeout(() => {
          voice.stopAsync().catch(() => {});
        }, 5);
      }).catch(() => {
        // Fallback: just stop if volume ramp fails
        voice.stopAsync().catch(() => {});
      });
    }
  }

  releaseNote(handle: NoteHandle): void {
    this.doRelease(handle.note);
  }

  releaseAllNotes(): void {
    for (const [, pool] of this.voicePools) {
      for (const sound of pool.sounds) {
        // Micro-fade each voice to prevent clicks
        sound.setVolumeAsync(0).then(() => {
          setTimeout(() => {
            sound.stopAsync().catch(() => {});
          }, 5);
        }).catch(() => {
          sound.stopAsync().catch(() => {});
        });
      }
    }
    this.activeNotes.clear();
    this.activeVoices.clear();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    // Propagate to all pre-loaded voice pools so future replayAsync() calls
    // use the new volume without waiting for the next playNote() call.
    for (const [, pool] of this.voicePools) {
      for (const sound of pool.sounds) {
        sound.setVolumeAsync(this.volume).catch(() => {});
      }
    }
  }

  getLatency(): number {
    return 20;
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

let expoAudioEngineInstance: ExpoAudioEngine | null = null;

export function getAudioEngine(): ExpoAudioEngine {
  if (!expoAudioEngineInstance) {
    expoAudioEngineInstance = new ExpoAudioEngine();
  }
  return expoAudioEngineInstance;
}

export function resetAudioEngine(): void {
  if (expoAudioEngineInstance) {
    expoAudioEngineInstance.dispose();
  }
  expoAudioEngineInstance = null;
}

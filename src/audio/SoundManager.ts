import { Audio } from 'expo-av';
import type { AVPlaybackSource } from 'expo-av';

import { logger } from '../utils/logger';

let Haptics: typeof import('expo-haptics') | null = null;
try {
  Haptics = require('expo-haptics');
} catch {
  Haptics = null;
}

/**
 * All available sound effect names.
 * Organized by category: UI, Gameplay, Rewards, Cat.
 */
export type SoundName =
  // UI
  | 'button_press'
  | 'toggle_on'
  | 'toggle_off'
  | 'swipe'
  | 'back_navigate'
  // Gameplay
  | 'note_correct'
  | 'note_perfect'
  | 'note_miss'
  | 'combo_5'
  | 'combo_10'
  | 'combo_20'
  | 'combo_break'
  | 'countdown_tick'
  | 'countdown_go'
  // Rewards
  | 'star_earn'
  | 'gem_clink'
  | 'xp_tick'
  | 'level_up'
  | 'chest_open'
  | 'evolution_start'
  | 'exercise_complete'
  // Cat
  | 'meow_greeting'
  | 'purr_happy'
  | 'meow_sad'
  | 'meow_celebrate';

/** Haptic feedback type for each sound category */
type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'none';

const SOUND_HAPTICS: Record<SoundName, HapticType> = {
  // UI — light taps
  button_press: 'light',
  toggle_on: 'light',
  toggle_off: 'light',
  swipe: 'light',
  back_navigate: 'light',
  // Gameplay
  note_correct: 'light',
  note_perfect: 'medium',
  note_miss: 'warning',
  combo_5: 'medium',
  combo_10: 'medium',
  combo_20: 'heavy',
  combo_break: 'warning',
  countdown_tick: 'light',
  countdown_go: 'medium',
  // Rewards
  star_earn: 'success',
  gem_clink: 'light',
  xp_tick: 'none',
  level_up: 'heavy',
  chest_open: 'medium',
  evolution_start: 'heavy',
  exercise_complete: 'success',
  // Cat
  meow_greeting: 'light',
  purr_happy: 'none',
  meow_sad: 'none',
  meow_celebrate: 'medium',
};

/**
 * Static require registry for CC0 sound assets (Kenney.nl).
 * Each require() is resolved at bundle time by Metro.
 */
const SOUND_ASSETS: Record<SoundName, AVPlaybackSource> = {
  // UI
  button_press: require('../../assets/sounds/button_press.wav'),
  toggle_on: require('../../assets/sounds/toggle_on.wav'),
  toggle_off: require('../../assets/sounds/toggle_off.wav'),
  swipe: require('../../assets/sounds/swipe.wav'),
  back_navigate: require('../../assets/sounds/back_navigate.wav'),
  // Gameplay
  note_correct: require('../../assets/sounds/note_correct.wav'),
  note_perfect: require('../../assets/sounds/note_perfect.wav'),
  note_miss: require('../../assets/sounds/note_miss.wav'),
  combo_5: require('../../assets/sounds/combo_5.wav'),
  combo_10: require('../../assets/sounds/combo_10.wav'),
  combo_20: require('../../assets/sounds/combo_20.wav'),
  combo_break: require('../../assets/sounds/combo_break.wav'),
  countdown_tick: require('../../assets/sounds/countdown_tick.wav'),
  countdown_go: require('../../assets/sounds/countdown_go.wav'),
  // Rewards
  star_earn: require('../../assets/sounds/star_earn.wav'),
  gem_clink: require('../../assets/sounds/gem_clink.wav'),
  xp_tick: require('../../assets/sounds/xp_tick.wav'),
  level_up: require('../../assets/sounds/level_up.wav'),
  chest_open: require('../../assets/sounds/chest_open.wav'),
  evolution_start: require('../../assets/sounds/evolution_start.wav'),
  exercise_complete: require('../../assets/sounds/exercise_complete.wav'),
  // Cat (placeholder — swap with real cat sounds from Freesound)
  meow_greeting: require('../../assets/sounds/meow_greeting.wav'),
  purr_happy: require('../../assets/sounds/purr_happy.wav'),
  meow_sad: require('../../assets/sounds/meow_sad.wav'),
  meow_celebrate: require('../../assets/sounds/meow_celebrate.wav'),
};

interface LoadedSound {
  sound: Audio.Sound;
}

/**
 * SoundManager — fire-and-forget UI sound effects + haptic feedback.
 * Loads real CC0 audio files from assets/sounds/ (Kenney.nl).
 * Separate from the piano AudioEngine (different volume, different purpose).
 */
export class SoundManager {
  private sounds: Map<SoundName, LoadedSound> = new Map();
  private enabled = true;
  private volume = 0.35;
  private preloaded = false;

  /**
   * When true, per-note gameplay sounds (note_correct, note_perfect, note_miss)
   * are suppressed. Combo tier sounds still play.
   * Set this for long exercises (songs, 20+ notes) where per-note SFX is annoying.
   */
  private suppressNoteSFX = false;

  /** Timestamp of last haptic trigger — throttle to max 3 per 333ms */
  private lastHapticTime = 0;
  private static readonly HAPTIC_MIN_INTERVAL_MS = 80;

  /** Per-sound debounce: prevents the same sound from playing twice within 150ms */
  private lastPlayTime: Map<SoundName, number> = new Map();
  private static readonly SOUND_DEBOUNCE_MS = 150;

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  getVolume(): number {
    return this.volume;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setSuppressNoteSFX(suppress: boolean): void {
    this.suppressNoteSFX = suppress;
  }

  isSuppressNoteSFX(): boolean {
    return this.suppressNoteSFX;
  }

  async preload(): Promise<void> {
    if (this.preloaded) return;

    // Audio session is configured by createAudioEngine.ts:ensureAudioModeConfigured()
    // which uses AudioManager (sync) to avoid racing with mic PlayAndRecord mode.
    // Do NOT call Audio.setAudioModeAsync() here — it would clobber the session.

    const entries = Object.entries(SOUND_ASSETS) as [SoundName, AVPlaybackSource][];

    // Use Promise.all with per-entry catch (Hermes doesn't support Promise.allSettled)
    await Promise.all(
      entries.map(async ([name, source]) => {
        try {
          const { sound } = await Audio.Sound.createAsync(
            source,
            { volume: this.volume, shouldPlay: false },
          );
          this.sounds.set(name, { sound });
        } catch (err) {
          logger.warn(`[SoundManager] Failed to preload '${name}':`, err);
        }
      }),
    );

    this.preloaded = true;
    logger.log(`[SoundManager] Preloaded ${this.sounds.size}/${entries.length} sounds`);
  }

  /**
   * Fire-and-forget: play sound + trigger haptic.
   * If sound asset isn't loaded, still fires haptic.
   */
  play(name: SoundName): void {
    if (!this.enabled) return;

    // In long exercises, suppress per-note gameplay sounds (haptics still fire)
    const isNoteSFX = name === 'note_correct' || name === 'note_perfect' || name === 'note_miss';
    if (isNoteSFX && this.suppressNoteSFX) {
      this.triggerHaptic(name);
      return;
    }

    // Per-sound debounce: prevent the same sound from playing twice within 150ms
    // (XPTransitionOverlay + AchievementToast both trigger star_earn, etc.)
    const now = Date.now();
    const lastPlay = this.lastPlayTime.get(name) ?? 0;
    if (now - lastPlay < SoundManager.SOUND_DEBOUNCE_MS) return;
    this.lastPlayTime.set(name, now);

    // Always fire haptic (even if sound not loaded)
    this.triggerHaptic(name);

    // Play audio if available
    const loaded = this.sounds.get(name);
    if (loaded) {
      loaded.sound.replayAsync().catch(() => {});
    }
  }

  private triggerHaptic(name: SoundName): void {
    if (!Haptics) return;
    const type = SOUND_HAPTICS[name];
    if (type === 'none') return;

    // Throttle haptics to prevent motor burnout during rapid combo gameplay
    const now = Date.now();
    if (now - this.lastHapticTime < SoundManager.HAPTIC_MIN_INTERVAL_MS) return;
    this.lastHapticTime = now;
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        break;
    }
  }

  dispose(): void {
    for (const { sound } of this.sounds.values()) {
      sound.unloadAsync().catch(() => {});
    }
    this.sounds.clear();
    this.lastPlayTime.clear();
    this.preloaded = false;
  }
}

/** Singleton instance — import this everywhere */
export const soundManager = new SoundManager();

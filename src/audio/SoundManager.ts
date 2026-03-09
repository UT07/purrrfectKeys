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
  private volume = 0.7;
  private preloaded = false;

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

  async preload(): Promise<void> {
    if (this.preloaded) return;

    // Audio session is configured by createAudioEngine.ts:ensureAudioModeConfigured()
    // which uses AudioManager (sync) to avoid racing with mic PlayAndRecord mode.
    // Do NOT call Audio.setAudioModeAsync() here — it would clobber the session.

    const entries = Object.entries(SOUND_ASSETS) as [SoundName, AVPlaybackSource][];

    const results = await Promise.allSettled(
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

    // Log failures but don't crash
    for (const r of results) {
      if (r.status === 'rejected') {
        logger.warn('[SoundManager] Preload rejected:', r.reason);
      }
    }

    this.preloaded = true;
    logger.log(`[SoundManager] Preloaded ${this.sounds.size}/${entries.length} sounds`);
  }

  /**
   * Fire-and-forget: play sound + trigger haptic.
   * If sound asset isn't loaded, still fires haptic.
   */
  play(name: SoundName): void {
    if (!this.enabled) return;

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
      case 'none':
        break;
    }
  }

  dispose(): void {
    for (const { sound } of this.sounds.values()) {
      sound.unloadAsync().catch(() => {});
    }
    this.sounds.clear();
    this.preloaded = false;
  }
}

/** Singleton instance — import this everywhere */
export const soundManager = new SoundManager();

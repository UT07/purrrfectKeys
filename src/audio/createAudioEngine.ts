/**
 * Audio Engine Factory
 *
 * Creates the best available IAudioEngine implementation.
 *
 * Selection order:
 * 1. WebAudioEngine (react-native-audio-api oscillator synthesis) — preferred
 *    Uses JSI for low-latency audio (<7ms). Available in Dev Builds where
 *    react-native-audio-api's native module is loaded.
 *    Optimized: 3-harmonic synthesis, pre-warmed pipeline, O(1) eviction.
 *
 * 2. ExpoAudioEngine (expo-av) — fallback
 *    Uses async bridge with round-robin voice pools. Higher latency (~20-30ms)
 *    but works everywhere including Expo Go.
 *
 * Detection: We try to instantiate WebAudioEngine. If the native module isn't
 * available (e.g., Expo Go), the import or constructor will throw, and we
 * fall back to ExpoAudioEngine.
 */

import { Platform } from 'react-native';
import type { IAudioEngine } from './types';
import { ExpoAudioEngine } from './ExpoAudioEngine';
import { logger } from '../utils/logger';

/**
 * Singleton instance managed by the factory
 */
let factoryInstance: IAudioEngine | null = null;
let lastAudioMode: 'playback' | 'playAndRecord' | null = null;
/** Last requested recording flag — replayed when recovering the session. */
let lastAllowRecording = false;
/** Active while iOS reports an interruption in progress. */
let interruptionActive = false;
/** Subscriptions held so recovery can be installed exactly once. */
let recoverySubscriptions: Array<{ remove: () => void }> = [];
let recoveryInstalled = false;

/**
 * Try to create a WebAudioEngine. Returns null if react-native-audio-api
 * is not available (e.g., running in Expo Go without the native module).
 */
function tryCreateWebAudioEngine(): IAudioEngine | null {
  const start = Date.now();
  try {
    // Dynamic require so Metro includes the module only if it's in node_modules,
    // and the import doesn't crash at bundle time if the native module is missing.
     
    const { WebAudioEngine } = require('./WebAudioEngine');
    const engine = new WebAudioEngine();
    logger.log(`[createAudioEngine] WebAudioEngine created in ${Date.now() - start}ms`);
    return engine;
  } catch (error) {
    logger.warn(
      `[createAudioEngine] WebAudioEngine unavailable after ${Date.now() - start}ms:`,
      (error as Error).message
    );
    return null;
  }
}

/**
 * Configure iOS audio session for playback and optional recording.
 *
 * Uses react-native-audio-api's AudioManager (SYNCHRONOUS) instead of expo-av's
 * Audio.setAudioModeAsync (async) to avoid a race condition:
 *
 *   createAudioEngine() fires ensureAudioModeConfigured() → starts ASYNC expo-av call
 *   InputManager calls configureAudioSessionForRecording() → SYNC AudioManager call
 *   The async expo-av call resolves later → OVERWRITES PlayAndRecord back to Playback
 *   → Mic input dies silently
 *
 * Both expo-av and react-native-audio-api share the same iOS AVAudioSession singleton
 * but maintain separate internal state. Using AudioManager for ALL session config
 * eliminates the cross-library conflict entirely.
 *
 * Falls back to expo-av only when AudioManager is unavailable (e.g., Expo Go).
 */
export async function ensureAudioModeConfigured(allowRecording = false): Promise<void> {
  // Skip if already configured in the requested mode
  const requestedMode = allowRecording ? 'playAndRecord' : 'playback';
  lastAllowRecording = allowRecording;
  if (lastAudioMode === requestedMode) return;

  lastAudioMode = requestedMode;

  // Primary: use AudioManager from react-native-audio-api (SYNCHRONOUS — no race condition)
  try {
     
    const { AudioManager } = require('react-native-audio-api');
    // When recording: use 'measurement' mode to disable Apple's voice processing
    // (AGC, noise suppression, echo cancellation) which crushes gain for non-speech
    // signals like piano. Without measurement mode, mic amplitude is ~0.001 even
    // with piano playing nearby — far below the RMS gate threshold.
    const iosMode = allowRecording ? 'measurement' : 'default';
    AudioManager.setAudioSessionOptions({
      iosCategory: allowRecording ? 'playAndRecord' : 'playback',
      iosMode,
      iosOptions: allowRecording
        ? ['defaultToSpeaker', 'allowBluetooth']
        : ['defaultToSpeaker'],
      iosAllowHaptics: true,
    });
    logger.log(
      `[createAudioEngine] Audio session configured via AudioManager ` +
      `(category=${allowRecording ? 'playAndRecord' : 'playback'}, mode=${iosMode})`
    );
    return;
  } catch (audioManagerError) {
    logger.warn('[createAudioEngine] AudioManager unavailable, falling back to expo-av:', audioManagerError);
  }

  // Fallback: expo-av (async — only used when react-native-audio-api is not available)
  try {
    const { Audio } = require('expo-av');
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: allowRecording,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      ...(allowRecording ? { interruptionModeIOS: 1 } : {}),
    });
    logger.log(
      `[createAudioEngine] iOS audio mode configured via expo-av ` +
      `(allowsRecordingIOS=${allowRecording})`
    );
  } catch (error) {
    logger.warn('[createAudioEngine] Audio mode configuration failed:', error);
  }
}

/**
 * Clear the cached audio-session mode so the next `ensureAudioModeConfigured`
 * actually reconfigures instead of short-circuiting.
 *
 * Needed because iOS deactivates the AVAudioSession on interruption without
 * telling our cache. Without this the cache still reads 'playback', every
 * later call early-returns, and audio stays dead until the app is killed.
 */
export function invalidateAudioMode(): void {
  lastAudioMode = null;
}

/**
 * Reconfigure and reactivate the audio session in whichever mode was last
 * requested. Safe to call repeatedly; never throws.
 */
async function recoverAudioSession(reason: string): Promise<void> {
  if (interruptionActive) {
    logger.log(`[audioRecovery] ${reason} — interruption still active, deferring`);
    return;
  }
  try {
    invalidateAudioMode();
    await ensureAudioModeConfigured(lastAllowRecording);
    try {
       
      const { AudioManager } = require('react-native-audio-api');
      await AudioManager.setAudioSessionActivity(true);
    } catch {
      // expo-av fallback path has no explicit activation step.
    }
    logger.log(`[audioRecovery] session recovered after ${reason}`);
  } catch (error) {
    logger.warn(`[audioRecovery] recovery failed after ${reason}:`, error);
  }
}

/**
 * Wire audio-session recovery to the events that silently kill playback:
 * interruptions (call, Siri, alarm), route changes (headphones unplugged),
 * and returning from the background.
 *
 * Idempotent — calling twice does not stack listeners.
 */
export function installAudioSessionRecovery(): void {
  if (recoveryInstalled) return;
  recoveryInstalled = true;

  try {
     
    const { AudioManager } = require('react-native-audio-api');
    AudioManager.observeAudioInterruptions(true);

    recoverySubscriptions.push(
      AudioManager.addSystemEventListener(
        'interruption',
        (e: { type: 'began' | 'ended'; shouldResume: boolean }) => {
          if (e.type === 'began') {
            interruptionActive = true;
            invalidateAudioMode();
            logger.log('[audioRecovery] interruption began');
            return;
          }
          interruptionActive = false;
          if (e.shouldResume) void recoverAudioSession('interruption ended');
        }
      )
    );

    recoverySubscriptions.push(
      AudioManager.addSystemEventListener('routeChange', (e: { reason: string }) => {
        void recoverAudioSession(`route change (${e.reason})`);
      })
    );
  } catch (error) {
    logger.warn('[audioRecovery] AudioManager events unavailable:', error);
  }

  try {
     
    const { AppState } = require('react-native');
    let previous: string = AppState.currentState;
    const sub = AppState.addEventListener('change', (next: string) => {
      if (previous !== 'active' && next === 'active') {
        void recoverAudioSession('app foregrounded');
      }
      previous = next;
    });
    if (sub && typeof sub.remove === 'function') recoverySubscriptions.push(sub);
  } catch (error) {
    logger.warn('[audioRecovery] AppState unavailable:', error);
  }
}

/** Tear down recovery listeners (tests, teardown). */
export function uninstallAudioSessionRecovery(): void {
  recoverySubscriptions.forEach((s) => {
    try {
      s.remove();
    } catch {
      /* already removed */
    }
  });
  recoverySubscriptions = [];
  recoveryInstalled = false;
  interruptionActive = false;
}

/**
 * Create the best available audio engine.
 *
 * Prefers WebAudioEngine (low-latency oscillator synthesis via JSI)
 * when react-native-audio-api is available. Falls back to ExpoAudioEngine
 * (expo-av with round-robin voice pools) for Expo Go.
 *
 * Subsequent calls return the same instance (singleton pattern).
 */
export function createAudioEngine(): IAudioEngine {
  if (factoryInstance) {
    return factoryInstance;
  }

  const selectionStart = Date.now();

  // Configure iOS audio session eagerly for playback.
  // This uses AudioManager (synchronous) so there's no async race with
  // InputManager's configureAudioSessionForRecording() — both use the same
  // synchronous AudioManager API, so the last call wins deterministically.
  // If mic is later needed, useExercisePlayback reconfigures to playAndRecord.
  ensureAudioModeConfigured();

  // Log device/platform info for debugging audio latency across environments
  logger.log(
    `[createAudioEngine] Platform: ${Platform.OS} ${Platform.Version ?? 'unknown'}, ` +
    `isTV=${Platform.isTV}`
  );

  const webEngine = tryCreateWebAudioEngine();
  if (webEngine) {
    factoryInstance = webEngine;
    const estimatedLatency = webEngine.getLatency();
    logger.log(
      `[createAudioEngine] Selected WebAudioEngine (JSI, 3-harmonic, pre-warmed) ` +
      `in ${Date.now() - selectionStart}ms — estimated latency: ${estimatedLatency}ms`
    );
  } else {
    factoryInstance = new ExpoAudioEngine();
    const estimatedLatency = factoryInstance.getLatency();
    logger.log(
      `[createAudioEngine] Selected ExpoAudioEngine (expo-av fallback) ` +
      `in ${Date.now() - selectionStart}ms — estimated latency: ${estimatedLatency}ms`
    );
  }

  return factoryInstance;
}

/**
 * Reset the factory singleton (for testing or engine switching)
 * Disposes the current engine before clearing the reference
 */
export function resetAudioEngineFactory(): void {
  if (factoryInstance) {
    factoryInstance.dispose();
    factoryInstance = null;
    logger.log('[createAudioEngine] Factory reset — engine disposed');
  }
  lastAudioMode = null;
}

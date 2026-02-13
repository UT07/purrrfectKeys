/**
 * Audio Engine Factory
 *
 * Creates the best available IAudioEngine implementation.
 *
 * Currently uses ExpoAudioEngine (expo-av) with sound pooling.
 * When react-native-audio-api is installed (Dev Build), update this factory
 * to prefer WebAudioEngine for oscillator synthesis and true polyphony.
 *
 * NOTE: Do NOT use require('react-native-audio-api') here or in any bundled
 * file unless the package is in node_modules. Metro resolves require() at
 * bundle time — a missing package gets replaced with an undefined module ID,
 * causing a fatal error that corrupts subsequent requires even inside try/catch.
 */

import type { IAudioEngine } from './types';
import { ExpoAudioEngine } from './ExpoAudioEngine';

/**
 * Singleton instance managed by the factory
 */
let factoryInstance: IAudioEngine | null = null;

/**
 * Create the best available audio engine.
 *
 * Currently returns ExpoAudioEngine (expo-av based).
 * When react-native-audio-api is installed via Dev Build,
 * this factory should be updated to try WebAudioEngine first.
 *
 * Subsequent calls return the same instance (singleton pattern).
 */
export function createAudioEngine(): IAudioEngine {
  if (factoryInstance) {
    return factoryInstance;
  }

  factoryInstance = new ExpoAudioEngine();
  console.log('[createAudioEngine] Using ExpoAudioEngine (expo-av)');
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
  }
}

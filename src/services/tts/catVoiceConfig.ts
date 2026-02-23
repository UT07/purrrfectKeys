/**
 * Per-cat voice configuration for TTS
 *
 * Each cat has unique pitch, rate, language, and (on iOS) voice identifier
 * that give it a distinct personality when speaking.
 *
 * iOS voice IDs: Use enhanced/premium Siri voices for natural speech.
 * Omit `voice` to use system default. expo-speech uses the `voice` property
 * to select a specific voice by identifier.
 */

export interface CatVoiceSettings {
  pitch: number;   // 0.5-2.0 (1.0 = normal)
  rate: number;    // 0.5-2.0 (1.0 = normal)
  language: string; // BCP-47 language tag
  voice?: string;  // Platform voice identifier (iOS: com.apple.voice.*)
}

const CAT_VOICE_MAP: Record<string, CatVoiceSettings> = {
  // Mini Meowww — friendly beginner companion, warm and clear
  'mini-meowww': { pitch: 1.05, rate: 0.92, language: 'en-US', voice: 'com.apple.voice.enhanced.en-US.Samantha' },

  // Jazzy — smooth, laid-back, slightly deeper voice
  jazzy: { pitch: 0.9, rate: 0.88, language: 'en-US', voice: 'com.apple.voice.enhanced.en-US.Nicky' },

  // Luna — mystical, slightly ethereal higher pitch
  luna: { pitch: 1.1, rate: 0.92, language: 'en-US', voice: 'com.apple.voice.enhanced.en-US.Samantha' },

  // Chonky — goofy, enthusiastic, faster pace
  chonky: { pitch: 0.95, rate: 1.0, language: 'en-US', voice: 'com.apple.voice.enhanced.en-US.Tom' },

  // Professor Whiskers — dignified, measured, clear
  'professor-whiskers': { pitch: 0.9, rate: 0.88, language: 'en-GB', voice: 'com.apple.voice.enhanced.en-GB.Daniel' },

  // Neko — energetic, bright, slightly faster
  neko: { pitch: 1.05, rate: 0.95, language: 'en-US', voice: 'com.apple.voice.enhanced.en-US.Samantha' },

  // Salsa — sassy, confident, medium pace
  salsa: { pitch: 1.0, rate: 0.92, language: 'en-US', voice: 'com.apple.voice.enhanced.en-US.Nicky' },

  // Mochi — cute, gentle, softer delivery
  mochi: { pitch: 1.1, rate: 0.88, language: 'en-US', voice: 'com.apple.voice.enhanced.en-US.Samantha' },
};

const DEFAULT_VOICE: CatVoiceSettings = {
  pitch: 1.0,
  rate: 0.92,
  language: 'en-US',
  voice: 'com.apple.voice.enhanced.en-US.Samantha',
};

/** Get voice settings for a specific cat. Falls back to default. */
export function getCatVoiceSettings(catId: string): CatVoiceSettings {
  return CAT_VOICE_MAP[catId] ?? DEFAULT_VOICE;
}

/** Get all available cat IDs with voice settings. */
export function getAvailableCatVoices(): string[] {
  return Object.keys(CAT_VOICE_MAP);
}

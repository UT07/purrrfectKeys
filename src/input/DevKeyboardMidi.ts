/**
 * Dev-mode laptop keyboard → MIDI note mapping
 * Maps keyboard keys A-K (+ sharps on W/E/R/T/Y) to MIDI notes C4-C5
 * Only active in __DEV__ mode
 *
 * Layout:
 *   W  E     R  T  Y        (black keys: C#4 D#4 F#4 G#4 A#4)
 *  A  S  D  F  G  H  J  K   (white keys: C4 D4 E4 F4 G4 A4 B4 C5)
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/** Map from lowercase keyboard key to MIDI note number */
export const KEY_TO_MIDI: Record<string, number> = {
  'a': 60, // C4
  'w': 61, // C#4
  's': 62, // D4
  'e': 63, // D#4
  'd': 64, // E4
  'f': 65, // F4
  'r': 66, // F#4
  'g': 67, // G4
  't': 68, // G#4
  'h': 69, // A4
  'y': 70, // A#4
  'j': 71, // B4
  'k': 72, // C5
};

type NoteCallback = (note: number, velocity: number, isNoteOn: boolean) => void;

/**
 * Hook that maps laptop keyboard events to MIDI note callbacks.
 * Only active when __DEV__ is true and Platform.OS is 'web' or iOS simulator.
 */
export function useDevKeyboardMidi(onNote: NoteCallback): void {
  const activeKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!__DEV__) return;

    // Web: use DOM keyboard events
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.repeat) return;
        const key = e.key.toLowerCase();
        const midiNote = KEY_TO_MIDI[key];
        if (midiNote != null && !activeKeys.current.has(key)) {
          activeKeys.current.add(key);
          onNote(midiNote, 100, true);
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        const midiNote = KEY_TO_MIDI[key];
        if (midiNote != null && activeKeys.current.has(key)) {
          activeKeys.current.delete(key);
          onNote(midiNote, 0, false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        activeKeys.current.clear();
      };
    }

    // iOS/Android: no native keyboard events available in React Native
    // MIDI testing on device requires a physical MIDI keyboard
    return undefined;
  }, [onNote]);
}

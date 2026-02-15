/**
 * Tests for dev-mode laptop MIDI keyboard mapping
 */

import { KEY_TO_MIDI } from '../DevKeyboardMidi';

describe('DevKeyboardMidi', () => {
  describe('KEY_TO_MIDI mapping', () => {
    it('should map A to middle C (60)', () => {
      expect(KEY_TO_MIDI['a']).toBe(60);
    });

    it('should map K to C5 (72)', () => {
      expect(KEY_TO_MIDI['k']).toBe(72);
    });

    it('should map W to C#4 (61)', () => {
      expect(KEY_TO_MIDI['w']).toBe(61);
    });

    it('should map all white keys in order', () => {
      const whiteKeys = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];
      const expectedNotes = [60, 62, 64, 65, 67, 69, 71, 72];
      const actualNotes = whiteKeys.map((k) => KEY_TO_MIDI[k]);
      expect(actualNotes).toEqual(expectedNotes);
    });

    it('should map all black keys (sharps)', () => {
      const blackKeys = ['w', 'e', 'r', 't', 'y'];
      const expectedNotes = [61, 63, 66, 68, 70];
      const actualNotes = blackKeys.map((k) => KEY_TO_MIDI[k]);
      expect(actualNotes).toEqual(expectedNotes);
    });

    it('should have 13 keys total (one octave + C5)', () => {
      expect(Object.keys(KEY_TO_MIDI)).toHaveLength(13);
    });

    it('should not map unmapped keys', () => {
      expect(KEY_TO_MIDI['z']).toBeUndefined();
      expect(KEY_TO_MIDI['x']).toBeUndefined();
      expect(KEY_TO_MIDI['1']).toBeUndefined();
    });
  });
});

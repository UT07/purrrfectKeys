/**
 * Comprehensive tests for Music Theory utilities
 */

import {
  midiToNoteName,
  noteNameToMidi,
  beatToMs,
  msToBeat,
  midiToFrequency,
  frequencyToMidi,
  getInterval,
  intervalName,
  isNoteInScale,
  getScaleNotes,
  getPitchClass,
  getOctave,
  areEnharmonic,
  isValidMidiNote,
  getNoteWithEnharmonic,
} from '../MusicTheory';

describe('MusicTheory', () => {
  describe('Note Name Conversion', () => {
    describe('midiToNoteName', () => {
      it('should convert middle C correctly', () => {
        expect(midiToNoteName(60)).toBe('C4');
      });

      it('should convert A440 correctly', () => {
        expect(midiToNoteName(69)).toBe('A4');
      });

      it('should handle sharps', () => {
        expect(midiToNoteName(61)).toBe('C#4');
      });

      it('should handle octave changes', () => {
        expect(midiToNoteName(48)).toBe('C3');
        expect(midiToNoteName(72)).toBe('C5');
      });

      it('should handle low notes', () => {
        expect(midiToNoteName(21)).toBe('A0');
      });

      it('should handle high notes', () => {
        expect(midiToNoteName(108)).toBe('C8');
      });
    });

    describe('noteNameToMidi', () => {
      it('should convert middle C correctly', () => {
        expect(noteNameToMidi('C4')).toBe(60);
      });

      it('should convert A440 correctly', () => {
        expect(noteNameToMidi('A4')).toBe(69);
      });

      it('should handle sharps', () => {
        expect(noteNameToMidi('C#4')).toBe(61);
      });

      it('should handle flats', () => {
        expect(noteNameToMidi('Db4')).toBe(61); // Enharmonic to C#
      });

      it('should throw on invalid notes', () => {
        expect(() => noteNameToMidi('H4')).toThrow();
      });

      it('should round trip correctly', () => {
        for (let midi = 21; midi <= 108; midi++) {
          const noteName = midiToNoteName(midi);
          expect(noteNameToMidi(noteName)).toBe(midi);
        }
      });
    });
  });

  describe('Timing Calculations', () => {
    describe('beatToMs and msToBeat', () => {
      it('should convert beats to milliseconds at 60 BPM', () => {
        const ms = beatToMs(1, 60);
        expect(ms).toBe(1000); // 1 beat = 1 second at 60 BPM
      });

      it('should convert beats to milliseconds at 120 BPM', () => {
        const ms = beatToMs(1, 120);
        expect(ms).toBe(500); // 1 beat = 0.5 seconds at 120 BPM
      });

      it('should handle fractional beats', () => {
        const ms = beatToMs(0.5, 60);
        expect(ms).toBe(500);
      });

      it('should convert back correctly', () => {
        const ms = beatToMs(4, 80);
        const beats = msToBeat(ms, 80);
        expect(beats).toBe(4);
      });

      it('should round trip for various tempos', () => {
        const tempos = [60, 80, 120, 140, 160];
        const beats = [0.5, 1, 2, 4];

        for (const tempo of tempos) {
          for (const beat of beats) {
            const ms = beatToMs(beat, tempo);
            const roundTrip = msToBeat(ms, tempo);
            expect(roundTrip).toBeCloseTo(beat, 5);
          }
        }
      });
    });
  });

  describe('Frequency Conversion', () => {
    describe('midiToFrequency', () => {
      it('should convert A4 to 440 Hz', () => {
        const freq = midiToFrequency(69);
        expect(freq).toBeCloseTo(440, 0);
      });

      it('should convert middle C to ~262 Hz', () => {
        const freq = midiToFrequency(60);
        expect(freq).toBeCloseTo(261.63, 1);
      });

      it('should double frequency for octave up', () => {
        const low = midiToFrequency(60); // C4
        const high = midiToFrequency(72); // C5
        expect(high).toBeCloseTo(low * 2, 1);
      });
    });

    describe('frequencyToMidi', () => {
      it('should convert 440 Hz to A4', () => {
        expect(frequencyToMidi(440)).toBe(69);
      });

      it('should round trip correctly', () => {
        for (let midi = 21; midi <= 108; midi++) {
          const freq = midiToFrequency(midi);
          expect(frequencyToMidi(freq)).toBe(midi);
        }
      });
    });
  });

  describe('Interval Calculations', () => {
    describe('getInterval', () => {
      it('should calculate unison', () => {
        expect(getInterval(60, 60)).toBe(0);
      });

      it('should calculate semitones up', () => {
        expect(getInterval(60, 67)).toBe(7); // Perfect fifth
      });

      it('should calculate semitones down', () => {
        expect(getInterval(67, 60)).toBe(-7);
      });

      it('should handle octaves', () => {
        expect(getInterval(60, 72)).toBe(12);
      });
    });

    describe('intervalName', () => {
      it('should name unison', () => {
        expect(intervalName(0)).toBe('unison');
      });

      it('should name perfect fourth', () => {
        expect(intervalName(5)).toBe('perfect fourth');
      });

      it('should name perfect fifth', () => {
        expect(intervalName(7)).toBe('perfect fifth');
      });

      it('should name octave', () => {
        expect(intervalName(12)).toBe('octave');
      });

      it('should name major third', () => {
        expect(intervalName(4)).toBe('major third');
      });
    });
  });

  describe('Scale Functions', () => {
    describe('isNoteInScale', () => {
      it('should recognize C major scale notes', () => {
        const cMajor = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
        for (const offset of cMajor) {
          expect(isNoteInScale(60 + offset, 0, 'major')).toBe(true);
        }
      });

      it('should reject non-scale notes', () => {
        expect(isNoteInScale(61, 0, 'major')).toBe(false); // C# not in C major
        expect(isNoteInScale(63, 0, 'major')).toBe(false); // D# not in C major
      });

      it('should handle different scales', () => {
        // A minor: A B C D E F G
        expect(isNoteInScale(69, 9, 'minor')).toBe(true); // A
        expect(isNoteInScale(71, 9, 'minor')).toBe(true); // B
        expect(isNoteInScale(70, 9, 'minor')).toBe(false); // A#
      });

      it('should handle pentatonic scale', () => {
        // C pentatonic: C D E G A
        const pentatonicNotes = [0, 2, 4, 7, 9];
        for (const offset of pentatonicNotes) {
          expect(isNoteInScale(60 + offset, 0, 'pentatonic')).toBe(true);
        }
        expect(isNoteInScale(65, 0, 'pentatonic')).toBe(false); // F not in C pentatonic
      });
    });

    describe('getScaleNotes', () => {
      it('should get C major notes within range', () => {
        const notes = getScaleNotes(0, 'major', 60, 72);
        expect(notes).toContain(60); // C4
        expect(notes).toContain(72); // C5
        expect(notes.length).toBeGreaterThan(0);
      });

      it('should respect range boundaries', () => {
        const notes = getScaleNotes(0, 'major', 60, 65);
        expect(Math.min(...notes)).toBeGreaterThanOrEqual(60);
        expect(Math.max(...notes)).toBeLessThanOrEqual(65);
      });
    });
  });

  describe('Pitch Class Functions', () => {
    describe('getPitchClass', () => {
      it('should get pitch class for C notes', () => {
        expect(getPitchClass(60)).toBe(0);
        expect(getPitchClass(72)).toBe(0);
      });

      it('should get pitch class for A notes', () => {
        expect(getPitchClass(69)).toBe(9);
        expect(getPitchClass(57)).toBe(9);
      });

      it('should handle all pitch classes', () => {
        for (let i = 0; i < 12; i++) {
          expect(getPitchClass(60 + i)).toBe(i);
        }
      });
    });

    describe('getOctave', () => {
      it('should get octave for C4', () => {
        expect(getOctave(60)).toBe(4);
      });

      it('should get octave for low notes', () => {
        expect(getOctave(21)).toBe(0); // A0
      });

      it('should get octave for high notes', () => {
        expect(getOctave(108)).toBe(8); // C8
      });
    });

    describe('areEnharmonic', () => {
      it('should recognize enharmonic notes', () => {
        expect(areEnharmonic(60, 60)).toBe(true); // Same note
        expect(areEnharmonic(61, 61)).toBe(true); // Same note
      });

      it('should work with enharmonic spelling (same MIDI pitch)', () => {
        // In MIDI, C# and Db are the same note (61)
        expect(areEnharmonic(61, 61)).toBe(true);
      });

      it('should reject different notes', () => {
        expect(areEnharmonic(60, 61)).toBe(false);
        expect(areEnharmonic(60, 62)).toBe(false);
      });
    });
  });

  describe('Validation Functions', () => {
    describe('isValidMidiNote', () => {
      it('should validate piano range', () => {
        expect(isValidMidiNote(21)).toBe(true); // A0
        expect(isValidMidiNote(108)).toBe(true); // C8
        expect(isValidMidiNote(60)).toBe(true); // C4
      });

      it('should reject below piano range', () => {
        expect(isValidMidiNote(20)).toBe(false);
        expect(isValidMidiNote(0)).toBe(false);
      });

      it('should reject above piano range', () => {
        expect(isValidMidiNote(109)).toBe(false);
        expect(isValidMidiNote(127)).toBe(false);
      });
    });
  });

  describe('Enharmonic Functions', () => {
    describe('getNoteWithEnharmonic', () => {
      it('should return note and enharmonic', () => {
        const result = getNoteWithEnharmonic(61);
        expect(result.note).toBe('C#4');
        expect(result.enharmonic).toBe('Db4');
      });

      it('should work for all pitch classes', () => {
        for (let midi = 21; midi <= 108; midi++) {
          const result = getNoteWithEnharmonic(midi);
          expect(result.note).toBeDefined();
          expect(result.enharmonic).toBeDefined();
        }
      });
    });
  });
});

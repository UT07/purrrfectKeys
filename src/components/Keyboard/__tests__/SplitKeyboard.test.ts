/**
 * SplitKeyboard Tests
 * Tests split point derivation, keyboard range computation,
 * and note partitioning logic.
 */

import { deriveSplitPoint, computeKeyboardRange } from '../SplitKeyboard';
import type { NoteEvent } from '@/core/exercises/types';

describe('SplitKeyboard', () => {
  describe('deriveSplitPoint', () => {
    it('defaults to middle C (60) when no hand annotations', () => {
      const notes: NoteEvent[] = [
        { note: 48, startBeat: 0, durationBeats: 1 },
        { note: 60, startBeat: 1, durationBeats: 1 },
        { note: 72, startBeat: 2, durationBeats: 1 },
      ];
      expect(deriveSplitPoint(notes)).toBe(60);
    });

    it('derives split point from hand annotations', () => {
      const notes: NoteEvent[] = [
        { note: 48, startBeat: 0, durationBeats: 1, hand: 'left' },
        { note: 55, startBeat: 1, durationBeats: 1, hand: 'left' },
        { note: 60, startBeat: 0, durationBeats: 1, hand: 'right' },
        { note: 67, startBeat: 1, durationBeats: 1, hand: 'right' },
      ];
      // Split = floor((55 + 60) / 2) = 57
      expect(deriveSplitPoint(notes)).toBe(57);
    });

    it('defaults to 60 when only left hand notes exist', () => {
      const notes: NoteEvent[] = [
        { note: 48, startBeat: 0, durationBeats: 1, hand: 'left' },
        { note: 52, startBeat: 1, durationBeats: 1, hand: 'left' },
      ];
      expect(deriveSplitPoint(notes)).toBe(60);
    });

    it('defaults to 60 when only right hand notes exist', () => {
      const notes: NoteEvent[] = [
        { note: 60, startBeat: 0, durationBeats: 1, hand: 'right' },
        { note: 67, startBeat: 1, durationBeats: 1, hand: 'right' },
      ];
      expect(deriveSplitPoint(notes)).toBe(60);
    });

    it('handles empty notes array', () => {
      expect(deriveSplitPoint([])).toBe(60);
    });

    it('handles mixed annotated and unannotated notes', () => {
      const notes: NoteEvent[] = [
        { note: 36, startBeat: 0, durationBeats: 1, hand: 'left' },
        { note: 48, startBeat: 1, durationBeats: 1 }, // No hand annotation
        { note: 72, startBeat: 0, durationBeats: 1, hand: 'right' },
      ];
      // Split = floor((36 + 72) / 2) = 54
      expect(deriveSplitPoint(notes)).toBe(54);
    });
  });

  describe('computeKeyboardRange', () => {
    it('returns default range for empty notes', () => {
      const range = computeKeyboardRange([]);
      expect(range).toEqual({ startNote: 48, octaveCount: 2 });
    });

    it('starts on a C boundary', () => {
      const range = computeKeyboardRange([65, 70]); // F4 to Bb4
      expect(range.startNote % 12).toBe(0); // Starts on C
    });

    it('has at least 2 octaves', () => {
      const range = computeKeyboardRange([60, 62]); // C4 to D4
      expect(range.octaveCount).toBeGreaterThanOrEqual(2);
    });

    it('clamps to 4 octaves maximum', () => {
      const range = computeKeyboardRange([21, 96]); // Very wide range
      expect(range.octaveCount).toBeLessThanOrEqual(4);
    });

    it('does not go below MIDI 21', () => {
      const range = computeKeyboardRange([22, 30]);
      expect(range.startNote).toBeGreaterThanOrEqual(21);
    });

    it('covers all input notes', () => {
      const notes = [48, 55, 60, 67, 72];
      const range = computeKeyboardRange(notes);
      const endNote = range.startNote + range.octaveCount * 12 - 1;

      for (const note of notes) {
        expect(note).toBeGreaterThanOrEqual(range.startNote);
        expect(note).toBeLessThanOrEqual(endNote);
      }
    });

    it('handles single note', () => {
      const range = computeKeyboardRange([60]);
      expect(range.startNote).toBeLessThanOrEqual(60);
      const endNote = range.startNote + range.octaveCount * 12 - 1;
      expect(endNote).toBeGreaterThanOrEqual(60);
    });
  });
});

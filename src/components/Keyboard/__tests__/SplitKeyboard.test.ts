/**
 * SplitKeyboard Tests
 * Tests split point derivation and note partitioning logic.
 */

import { deriveSplitPoint } from '../SplitKeyboard';
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
});

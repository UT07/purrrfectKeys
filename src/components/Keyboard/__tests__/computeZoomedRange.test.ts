/**
 * computeZoomedRange Tests
 * Tests smart 2-octave keyboard range calculation with sticky behavior.
 */

import {
  computeZoomedRange,
  computeStickyRange,
  type KeyboardRange,
} from '../computeZoomedRange';

describe('computeZoomedRange', () => {
  it('returns 2 octaves centered on active notes', () => {
    const result = computeZoomedRange([60, 64, 67]); // C4, E4, G4
    expect(result.octaveCount).toBe(2);
    expect(result.startNote % 12).toBe(0); // Snapped to C
    expect(result.startNote).toBeLessThanOrEqual(60);
    expect(result.startNote + 24).toBeGreaterThanOrEqual(67);
  });

  it('snaps startNote to nearest C', () => {
    const result = computeZoomedRange([65, 69, 72]); // F4, A4, C5
    expect(result.startNote % 12).toBe(0);
  });

  it('handles single note', () => {
    const result = computeZoomedRange([60]); // C4
    expect(result.octaveCount).toBe(2);
    expect(result.startNote).toBeLessThanOrEqual(60);
    const endNote = result.startNote + result.octaveCount * 12 - 1;
    expect(endNote).toBeGreaterThanOrEqual(60);
  });

  it('floors at MIDI 21 (A0)', () => {
    const result = computeZoomedRange([24, 28]); // C1, E1
    expect(result.startNote).toBeGreaterThanOrEqual(21);
  });

  it('handles empty array with sensible default', () => {
    const result = computeZoomedRange([]);
    expect(result.octaveCount).toBe(2);
    expect(result.startNote).toBe(48); // Default C3
  });

  it('respects custom maxOctaves parameter', () => {
    const result = computeZoomedRange([48, 72], 3); // Wide range needing 3 octaves
    expect(result.octaveCount).toBe(3);
    expect(result.startNote % 12).toBe(0);
  });

  it('covers all active notes within the range', () => {
    const notes = [55, 60, 67]; // G3, C4, G4
    const result = computeZoomedRange(notes);
    const rangeEnd = result.startNote + result.octaveCount * 12 - 1;
    for (const note of notes) {
      expect(note).toBeGreaterThanOrEqual(result.startNote);
      expect(note).toBeLessThanOrEqual(rangeEnd);
    }
  });

  it('handles notes at the top of the keyboard', () => {
    const result = computeZoomedRange([96, 100]); // C7, E7
    expect(result.octaveCount).toBe(2);
    expect(result.startNote % 12).toBe(0);
    expect(result.startNote).toBeLessThanOrEqual(96);
    expect(result.startNote + 24).toBeGreaterThanOrEqual(100);
  });

  it('handles notes very close together', () => {
    const result = computeZoomedRange([60, 61, 62]); // C4, C#4, D4
    expect(result.octaveCount).toBe(2);
    expect(result.startNote % 12).toBe(0);
    expect(result.startNote).toBeLessThanOrEqual(60);
  });
});

describe('computeStickyRange', () => {
  it('does not shift range if notes are within current range', () => {
    const current: KeyboardRange = { startNote: 48, octaveCount: 2 }; // C3-C5 (48-71)
    const result = computeStickyRange([52, 55, 60], current);
    expect(result.startNote).toBe(48); // No change
    expect(result.octaveCount).toBe(2);
  });

  it('shifts range when note is >=3 semitones outside', () => {
    const current: KeyboardRange = { startNote: 48, octaveCount: 2 }; // C3-C5 (48-71)
    const result = computeStickyRange([75], current); // 75 is 4 semitones above 71
    expect(result.startNote).toBeGreaterThan(48); // Range shifted up
    expect(result.startNote + 24).toBeGreaterThanOrEqual(75);
  });

  it('does not shift for notes 1-2 semitones outside range', () => {
    const current: KeyboardRange = { startNote: 48, octaveCount: 2 }; // C3-C5 (48-71)
    const result = computeStickyRange([72], current); // 1 semitone outside
    expect(result.startNote).toBe(48); // Sticky -- no change
    expect(result.octaveCount).toBe(2);
  });

  it('returns currentRange for empty notes', () => {
    const current: KeyboardRange = { startNote: 60, octaveCount: 2 };
    const result = computeStickyRange([], current);
    expect(result).toEqual(current);
  });

  it('shifts when notes are below range by threshold', () => {
    const current: KeyboardRange = { startNote: 60, octaveCount: 2 }; // C4-C6 (60-83)
    const result = computeStickyRange([55], current); // 5 semitones below 60
    expect(result.startNote).toBeLessThan(60); // Range shifted down
    expect(result.startNote).toBeLessThanOrEqual(55);
  });

  it('does not shift when notes are 1-2 semitones below range', () => {
    const current: KeyboardRange = { startNote: 60, octaveCount: 2 }; // C4-C6 (60-83)
    const result = computeStickyRange([58], current); // 2 semitones below 60
    expect(result.startNote).toBe(60); // Sticky -- no change
  });

  it('respects custom stickyThreshold', () => {
    const current: KeyboardRange = { startNote: 48, octaveCount: 2 }; // C3-C5 (48-71)
    // 3 semitones outside with threshold 5 should NOT shift
    const result = computeStickyRange([75], current, 5); // 4 semitones outside, threshold 5
    expect(result.startNote).toBe(48); // No change

    // 5 semitones outside with threshold 5 SHOULD shift
    const result2 = computeStickyRange([77], current, 5); // 6 semitones outside, threshold 5
    expect(result2.startNote).toBeGreaterThan(48); // Shifted
  });

  it('preserves octaveCount from currentRange', () => {
    const current: KeyboardRange = { startNote: 48, octaveCount: 2 };
    const result = computeStickyRange([52, 60], current);
    expect(result.octaveCount).toBe(2);
  });
});

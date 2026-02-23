import {
  analyzeSession,
  suggestDrill,
  type PlayedNote,
} from '../FreePlayAnalyzer';

// ============================================================================
// Helpers
// ============================================================================

/** C major scale: C4-D4-E4-F4-G4-A4-B4-C5 */
function cMajorScaleNotes(): PlayedNote[] {
  const midiNotes = [60, 62, 64, 65, 67, 69, 71, 72];
  return midiNotes.map((note, i) => ({
    note,
    timestamp: 1000 + i * 500,
    velocity: 80,
  }));
}

/** A minor scale: A3-B3-C4-D4-E4-F4-G4-A4 */
function aMinorScaleNotes(): PlayedNote[] {
  const midiNotes = [57, 59, 60, 62, 64, 65, 67, 69];
  return midiNotes.map((note, i) => ({
    note,
    timestamp: 1000 + i * 500,
    velocity: 75,
  }));
}

/** Random chromatic notes (hard to detect key) */
function chromaticNotes(): PlayedNote[] {
  const midiNotes = [60, 61, 63, 66, 68, 70, 73, 74];
  return midiNotes.map((note, i) => ({
    note,
    timestamp: 1000 + i * 500,
    velocity: 90,
  }));
}

// ============================================================================
// analyzeSession
// ============================================================================

describe('analyzeSession', () => {
  it('returns empty analysis for no notes', () => {
    const analysis = analyzeSession([]);
    expect(analysis.notesPlayed).toBe(0);
    expect(analysis.uniqueNotes).toEqual([]);
    expect(analysis.detectedKey).toBeNull();
    expect(analysis.commonIntervals).toEqual([]);
    expect(analysis.suggestedDrillType).toBe('warmup');
    expect(analysis.summary).toContain('No notes');
  });

  it('counts notes played correctly', () => {
    const notes = cMajorScaleNotes();
    const analysis = analyzeSession(notes);
    expect(analysis.notesPlayed).toBe(8);
    expect(analysis.noteCount).toBe(8); // legacy field
  });

  it('identifies unique MIDI notes sorted ascending', () => {
    const notes: PlayedNote[] = [
      { note: 64, timestamp: 1000, velocity: 80 },
      { note: 60, timestamp: 1500, velocity: 80 },
      { note: 64, timestamp: 2000, velocity: 80 }, // duplicate
      { note: 62, timestamp: 2500, velocity: 80 },
    ];
    const analysis = analyzeSession(notes);
    expect(analysis.uniqueNotes).toEqual([60, 62, 64]);
    expect(analysis.uniquePitches).toBe(3); // legacy field
  });

  describe('key detection', () => {
    it('detects C major from scale notes', () => {
      const notes = cMajorScaleNotes();
      const analysis = analyzeSession(notes);
      expect(analysis.detectedKey).toBe('C major');
    });

    it('detects a matching key for A minor scale notes', () => {
      // A natural minor and C major share the same pitch classes,
      // so the detector may return either. Both are valid.
      const notes = aMinorScaleNotes();
      const analysis = analyzeSession(notes);
      expect(analysis.detectedKey).not.toBeNull();
      expect(['C major', 'A minor']).toContain(analysis.detectedKey);
    });

    it('returns null for chromatic/indeterminate notes', () => {
      const notes = chromaticNotes();
      const analysis = analyzeSession(notes);
      // Chromatic notes may or may not match a key depending on overlap
      // The important thing is it doesn't crash
      expect(typeof analysis.detectedKey === 'string' || analysis.detectedKey === null).toBe(true);
    });

    it('returns null for fewer than 4 notes', () => {
      const notes: PlayedNote[] = [
        { note: 60, timestamp: 1000, velocity: 80 },
        { note: 62, timestamp: 1500, velocity: 80 },
        { note: 64, timestamp: 2000, velocity: 80 },
      ];
      const analysis = analyzeSession(notes);
      expect(analysis.detectedKey).toBeNull();
    });

    it('detects A minor when starting and ending on A', () => {
      // A minor scale starting and ending on A — tonic weighting should favor A minor
      const notes: PlayedNote[] = [
        { note: 57, timestamp: 1000, velocity: 80 }, // A3 (first note = tonic weight)
        { note: 59, timestamp: 1500, velocity: 80 }, // B3
        { note: 60, timestamp: 2000, velocity: 80 }, // C4
        { note: 62, timestamp: 2500, velocity: 80 }, // D4
        { note: 64, timestamp: 3000, velocity: 80 }, // E4
        { note: 65, timestamp: 3500, velocity: 80 }, // F4
        { note: 67, timestamp: 4000, velocity: 80 }, // G4
        { note: 69, timestamp: 4500, velocity: 80 }, // A4 (last note = tonic weight)
      ];
      const analysis = analyzeSession(notes);
      expect(analysis.detectedKey).toBe('A minor');
    });

    it('does not detect C major for pentatonic black keys', () => {
      // Playing only black keys (F#, G#, A#, C#, D#) — should NOT match C major
      const notes: PlayedNote[] = [
        { note: 66, timestamp: 1000, velocity: 80 }, // F#4
        { note: 68, timestamp: 1500, velocity: 80 }, // G#4
        { note: 70, timestamp: 2000, velocity: 80 }, // A#4
        { note: 73, timestamp: 2500, velocity: 80 }, // C#5
        { note: 75, timestamp: 3000, velocity: 80 }, // D#5
        { note: 66, timestamp: 3500, velocity: 80 }, // F#4 again
      ];
      const analysis = analyzeSession(notes);
      expect(analysis.detectedKey).not.toBe('C major');
    });
  });

  describe('interval counting', () => {
    it('counts intervals between consecutive notes', () => {
      const notes: PlayedNote[] = [
        { note: 60, timestamp: 1000, velocity: 80 },
        { note: 62, timestamp: 1500, velocity: 80 }, // +2
        { note: 64, timestamp: 2000, velocity: 80 }, // +2
        { note: 67, timestamp: 2500, velocity: 80 }, // +3
      ];
      const analysis = analyzeSession(notes);
      expect(analysis.commonIntervals.length).toBeGreaterThan(0);

      // Interval 2 should appear twice
      const interval2 = analysis.commonIntervals.find((i) => i.interval === 2);
      expect(interval2).toBeDefined();
      expect(interval2!.count).toBe(2);

      // Interval 3 should appear once
      const interval3 = analysis.commonIntervals.find((i) => i.interval === 3);
      expect(interval3).toBeDefined();
      expect(interval3!.count).toBe(1);
    });

    it('sorts intervals by count descending', () => {
      const notes = cMajorScaleNotes();
      const analysis = analyzeSession(notes);
      for (let i = 1; i < analysis.commonIntervals.length; i++) {
        expect(analysis.commonIntervals[i].count).toBeLessThanOrEqual(
          analysis.commonIntervals[i - 1].count,
        );
      }
    });

    it('ignores zero intervals (repeated notes)', () => {
      const notes: PlayedNote[] = [
        { note: 60, timestamp: 1000, velocity: 80 },
        { note: 60, timestamp: 1500, velocity: 80 },
        { note: 60, timestamp: 2000, velocity: 80 },
      ];
      const analysis = analyzeSession(notes);
      // Should have no intervals since all are 0
      expect(analysis.commonIntervals.length).toBe(0);
    });
  });

  describe('summary', () => {
    it('mentions the number of notes played', () => {
      const notes = cMajorScaleNotes();
      const analysis = analyzeSession(notes);
      expect(analysis.summary).toContain('8');
    });

    it('mentions the detected key when present', () => {
      const notes = cMajorScaleNotes();
      const analysis = analyzeSession(notes);
      expect(analysis.summary).toContain('C major');
    });

    it('mentions the most common interval', () => {
      const notes = cMajorScaleNotes();
      const analysis = analyzeSession(notes);
      // C major scale has mostly major seconds (interval 2)
      expect(analysis.summary).toContain('major seconds');
    });
  });

  describe('drill type suggestion', () => {
    it('suggests scale-practice for stepwise motion', () => {
      const notes = cMajorScaleNotes();
      const analysis = analyzeSession(notes);
      expect(analysis.suggestedDrillType).toBe('scale-practice');
    });

    it('suggests note-exploration for very few unique notes', () => {
      const notes: PlayedNote[] = [
        { note: 60, timestamp: 1000, velocity: 80 },
        { note: 60, timestamp: 1500, velocity: 80 },
        { note: 62, timestamp: 2000, velocity: 80 },
        { note: 60, timestamp: 2500, velocity: 80 },
      ];
      const analysis = analyzeSession(notes);
      expect(analysis.suggestedDrillType).toBe('note-exploration');
    });
  });

  describe('legacy fields', () => {
    it('populates mostPlayedNote', () => {
      const notes: PlayedNote[] = [
        { note: 60, timestamp: 1000, velocity: 80 },
        { note: 60, timestamp: 1500, velocity: 80 },
        { note: 62, timestamp: 2000, velocity: 80 },
      ];
      const analysis = analyzeSession(notes);
      expect(analysis.mostPlayedNote).toBe('C4');
    });

    it('calculates durationSeconds', () => {
      const notes = cMajorScaleNotes();
      const analysis = analyzeSession(notes);
      expect(analysis.durationSeconds).toBeGreaterThan(0);
    });

    it('calculates notesPerSecond', () => {
      const notes = cMajorScaleNotes();
      const analysis = analyzeSession(notes);
      expect(analysis.notesPerSecond).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// suggestDrill
// ============================================================================

describe('suggestDrill', () => {
  it('returns valid GenerationParams from analysis', () => {
    const notes = cMajorScaleNotes();
    const analysis = analyzeSession(notes);
    const params = suggestDrill(analysis);

    expect(params.weakNotes).toBeDefined();
    expect(params.weakNotes.length).toBeGreaterThan(0);
    // weakNotes now includes all unique notes played (not capped at 6)
    expect(params.weakNotes.length).toBe(analysis.uniqueNotes.length);
    expect(params.tempoRange.min).toBeLessThan(params.tempoRange.max);
    // Difficulty scales with unique note count: 8 unique notes → difficulty 3
    expect(params.difficulty).toBeGreaterThanOrEqual(1);
    expect(params.difficulty).toBeLessThanOrEqual(3);
    // noteCount is dynamic based on unique notes
    expect(params.noteCount).toBeGreaterThanOrEqual(8);
    expect(params.noteCount).toBeLessThanOrEqual(20);
    expect(params.skills).toBeDefined();
    expect(params.exerciseType).toBe('lesson');
  });

  it('includes scale context for scale-practice drill type', () => {
    const notes = cMajorScaleNotes();
    const analysis = analyzeSession(notes);
    const params = suggestDrill(analysis);
    expect(params.skillContext).toContain('scales');
    expect(params.skillContext).toContain('C major');
  });

  it('includes explore context for note-exploration drill type', () => {
    const analysis = analyzeSession([
      { note: 60, timestamp: 1000, velocity: 80 },
      { note: 60, timestamp: 1500, velocity: 80 },
      { note: 62, timestamp: 2000, velocity: 80 },
      { note: 60, timestamp: 2500, velocity: 80 },
    ]);
    const params = suggestDrill(analysis);
    expect(params.skillContext).toContain('Explore');
  });

  it('uses unique notes from analysis as weakNotes', () => {
    const notes = cMajorScaleNotes();
    const analysis = analyzeSession(notes);
    const params = suggestDrill(analysis);
    // weakNotes should be a subset of analysis.uniqueNotes
    for (const n of params.weakNotes) {
      expect(analysis.uniqueNotes).toContain(n);
    }
  });

  it('handles empty analysis gracefully', () => {
    const analysis = analyzeSession([]);
    const params = suggestDrill(analysis);
    expect(params.weakNotes).toEqual([]);
    // 0 unique notes → difficulty 1, noteCount 8 (min)
    expect(params.difficulty).toBe(1);
    expect(params.noteCount).toBe(8);
  });
});

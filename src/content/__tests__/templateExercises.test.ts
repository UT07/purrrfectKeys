import type { Exercise } from '@/core/exercises/types';
import { getTemplateExercise } from '../templateExercises';

describe('templateExercises', () => {
  it('returns a valid Exercise for each difficulty', () => {
    for (const d of [1, 2, 3] as const) {
      const ex = getTemplateExercise(d);
      expect(ex).toBeDefined();
      expect(ex.id).toMatch(/^tmpl-/);
    }
  });

  it('returned exercise has correct structure', () => {
    const ex: Exercise = getTemplateExercise(1);
    expect(ex.id).toBeTruthy();
    expect(ex.version).toBe(1);
    expect(ex.metadata).toBeDefined();
    expect(ex.metadata.title).toBeTruthy();
    expect(ex.metadata.description).toBeTruthy();
    expect(ex.metadata.difficulty).toBeGreaterThanOrEqual(1);
    expect(ex.metadata.difficulty).toBeLessThanOrEqual(5);
    expect(ex.metadata.estimatedMinutes).toBeGreaterThan(0);
    expect(ex.metadata.skills).toEqual(expect.any(Array));
    expect(ex.settings).toBeDefined();
    expect(ex.settings.tempo).toBeGreaterThan(0);
    expect(ex.settings.timeSignature).toEqual([4, 4]);
    expect(ex.settings.countIn).toBe(4);
    expect(ex.notes.length).toBeGreaterThan(0);
    expect(ex.scoring).toBeDefined();
    expect(ex.scoring.starThresholds).toHaveLength(3);
    expect(ex.hints).toBeDefined();
    expect(ex.hands).toBeDefined();
  });

  it('difficulty 1 exercises have tempo 50-60', () => {
    for (let i = 0; i < 20; i++) {
      const ex = getTemplateExercise(1);
      expect(ex.settings.tempo).toBeGreaterThanOrEqual(50);
      expect(ex.settings.tempo).toBeLessThanOrEqual(60);
    }
  });

  it('difficulty 2 exercises have tempo 70-80', () => {
    for (let i = 0; i < 20; i++) {
      const ex = getTemplateExercise(2);
      expect(ex.settings.tempo).toBeGreaterThanOrEqual(70);
      expect(ex.settings.tempo).toBeLessThanOrEqual(80);
    }
  });

  it('difficulty 3 exercises have tempo 90-100', () => {
    for (let i = 0; i < 20; i++) {
      const ex = getTemplateExercise(3);
      expect(ex.settings.tempo).toBeGreaterThanOrEqual(90);
      expect(ex.settings.tempo).toBeLessThanOrEqual(100);
    }
  });

  it('exercises target weak notes when provided', () => {
    const weakNotes = [61, 63]; // Db4, Eb4
    let foundWeak = false;
    // Run multiple times since template selection has randomness
    for (let i = 0; i < 30; i++) {
      const ex = getTemplateExercise(1, weakNotes);
      if (ex.notes.some((n) => weakNotes.includes(n.note))) {
        foundWeak = true;
        break;
      }
    }
    expect(foundWeak).toBe(true);
  });

  it('returns different exercises on repeated calls with same params', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const ex = getTemplateExercise(1);
      ids.add(ex.id);
    }
    // With 5 templates per tier, repeated random picks should yield at least 2 unique
    expect(ids.size).toBeGreaterThanOrEqual(2);
  });

  it('exercise notes have valid MIDI range (36-96)', () => {
    for (const d of [1, 2, 3] as const) {
      for (let i = 0; i < 10; i++) {
        const ex = getTemplateExercise(d, [61, 70]);
        for (const n of ex.notes) {
          expect(n.note).toBeGreaterThanOrEqual(36);
          expect(n.note).toBeLessThanOrEqual(96);
        }
      }
    }
  });

  it('exercise notes have valid startBeat and durationBeats', () => {
    for (const d of [1, 2, 3] as const) {
      const ex = getTemplateExercise(d);
      for (const n of ex.notes) {
        expect(n.startBeat).toBeGreaterThanOrEqual(0);
        expect(n.durationBeats).toBeGreaterThan(0);
      }
    }
  });

  it('returns exercise even with empty weak notes', () => {
    const ex = getTemplateExercise(2, []);
    expect(ex).toBeDefined();
    expect(ex.notes.length).toBeGreaterThan(0);
  });
});

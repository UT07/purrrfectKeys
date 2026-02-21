/**
 * Learner Profile Store Tests
 * Tests per-note accuracy tracking, skill dimensions, tempo range adjustment,
 * weak area detection, and rolling average convergence
 */

import { useLearnerProfileStore } from '../learnerProfileStore';

describe('Learner Profile Store', () => {
  beforeEach(() => {
    useLearnerProfileStore.getState().reset();
  });

  it('initializes with empty profile', () => {
    const state = useLearnerProfileStore.getState();
    expect(state.noteAccuracy).toEqual({});
    expect(state.noteAttempts).toEqual({});
    expect(state.skills).toEqual({
      timingAccuracy: 0.5,
      pitchAccuracy: 0.5,
      sightReadSpeed: 0.5,
      chordRecognition: 0.5,
    });
    expect(state.tempoRange).toEqual({ min: 40, max: 80 });
    expect(state.weakNotes).toEqual([]);
    expect(state.weakSkills).toEqual([]);
    expect(state.totalExercisesCompleted).toBe(0);
    expect(state.lastAssessmentDate).toBe('');
    expect(state.assessmentScore).toBe(0);
  });

  it('updates note accuracy with rolling average', () => {
    const { updateNoteAccuracy } = useLearnerProfileStore.getState();

    // First attempt: accuracy = exact input value
    updateNoteAccuracy(60, 1.0);
    expect(useLearnerProfileStore.getState().noteAccuracy[60]).toBe(1.0);
    expect(useLearnerProfileStore.getState().noteAttempts[60]).toBe(1);

    // Second attempt: rolling average of 1.0 and 0.0 with weight 2
    // newAccuracy = 1.0 + (0.0 - 1.0) / 2 = 0.5
    updateNoteAccuracy(60, 0.0);
    expect(useLearnerProfileStore.getState().noteAccuracy[60]).toBe(0.5);
    expect(useLearnerProfileStore.getState().noteAttempts[60]).toBe(2);

    // Third attempt: rolling average with weight 3
    // newAccuracy = 0.5 + (0.8 - 0.5) / 3 = 0.6
    updateNoteAccuracy(60, 0.8);
    expect(useLearnerProfileStore.getState().noteAccuracy[60]).toBeCloseTo(0.6, 5);
    expect(useLearnerProfileStore.getState().noteAttempts[60]).toBe(3);
  });

  it('calculates weak notes (below 70%)', () => {
    const { updateNoteAccuracy, recalculateWeakAreas } = useLearnerProfileStore.getState();

    updateNoteAccuracy(60, 0.9);  // Above threshold
    updateNoteAccuracy(61, 0.5);  // Below threshold
    updateNoteAccuracy(62, 0.3);  // Below threshold
    recalculateWeakAreas();

    const { weakNotes } = useLearnerProfileStore.getState();
    expect(weakNotes).toContain(61);
    expect(weakNotes).toContain(62);
    expect(weakNotes).not.toContain(60);
    // Sorted by accuracy ascending: 62 (0.3) should come before 61 (0.5)
    expect(weakNotes[0]).toBe(62);
    expect(weakNotes[1]).toBe(61);
  });

  it('updates skill dimensions clamped between 0 and 1', () => {
    const { updateSkill } = useLearnerProfileStore.getState();

    updateSkill('timingAccuracy', 0.85);
    expect(useLearnerProfileStore.getState().skills.timingAccuracy).toBe(0.85);

    // Clamp above 1
    updateSkill('pitchAccuracy', 1.5);
    expect(useLearnerProfileStore.getState().skills.pitchAccuracy).toBe(1);

    // Clamp below 0
    updateSkill('sightReadSpeed', -0.3);
    expect(useLearnerProfileStore.getState().skills.sightReadSpeed).toBe(0);
  });

  it('does not adjust tempo range in recordExerciseResult (DifficultyEngine owns tempo)', () => {
    const { recordExerciseResult } = useLearnerProfileStore.getState();

    // High score should NOT change tempo — DifficultyEngine handles that externally
    recordExerciseResult({ tempo: 75, score: 0.9, noteResults: [] });
    const { tempoRange } = useLearnerProfileStore.getState();
    expect(tempoRange.max).toBe(80); // unchanged
    expect(tempoRange.min).toBe(40); // unchanged
  });

  it('does not adjust tempo range even with low score (DifficultyEngine owns tempo)', () => {
    const { recordExerciseResult } = useLearnerProfileStore.getState();

    // Low score should NOT change tempo — DifficultyEngine handles that externally
    recordExerciseResult({ tempo: 45, score: 0.4, noteResults: [] });
    const { tempoRange } = useLearnerProfileStore.getState();
    expect(tempoRange.min).toBe(40); // unchanged
    expect(tempoRange.max).toBe(80); // unchanged
  });

  it('preserves tempo range at custom boundaries after recordExerciseResult', () => {
    // Set custom tempo range
    useLearnerProfileStore.setState({ tempoRange: { min: 30, max: 198 } });

    const { recordExerciseResult } = useLearnerProfileStore.getState();

    // recordExerciseResult should NOT touch tempoRange
    recordExerciseResult({ tempo: 195, score: 0.95, noteResults: [] });
    expect(useLearnerProfileStore.getState().tempoRange.max).toBe(198); // unchanged

    useLearnerProfileStore.setState({ tempoRange: { min: 32, max: 80 } });
    recordExerciseResult({ tempo: 35, score: 0.3, noteResults: [] });
    expect(useLearnerProfileStore.getState().tempoRange.min).toBe(32); // unchanged
  });

  it('increments totalExercisesCompleted', () => {
    const { recordExerciseResult } = useLearnerProfileStore.getState();

    recordExerciseResult({ tempo: 60, score: 0.8, noteResults: [] });
    expect(useLearnerProfileStore.getState().totalExercisesCompleted).toBe(1);

    useLearnerProfileStore.getState().recordExerciseResult({ tempo: 60, score: 0.8, noteResults: [] });
    expect(useLearnerProfileStore.getState().totalExercisesCompleted).toBe(2);

    useLearnerProfileStore.getState().recordExerciseResult({ tempo: 60, score: 0.8, noteResults: [] });
    expect(useLearnerProfileStore.getState().totalExercisesCompleted).toBe(3);
  });

  it('identifies weak skills (below 60%)', () => {
    const store = useLearnerProfileStore.getState();
    store.updateSkill('timingAccuracy', 0.4);   // Below threshold
    store.updateSkill('pitchAccuracy', 0.8);     // Above threshold
    store.updateSkill('sightReadSpeed', 0.55);   // Below threshold
    store.updateSkill('chordRecognition', 0.7);  // Above threshold
    useLearnerProfileStore.getState().recalculateWeakAreas();

    const { weakSkills } = useLearnerProfileStore.getState();
    expect(weakSkills).toContain('timingAccuracy');
    expect(weakSkills).toContain('sightReadSpeed');
    expect(weakSkills).not.toContain('pitchAccuracy');
    expect(weakSkills).not.toContain('chordRecognition');
  });

  it('resets all state to defaults', () => {
    const store = useLearnerProfileStore.getState();

    // Populate state with non-default values
    store.updateNoteAccuracy(60, 0.9);
    store.updateNoteAccuracy(61, 0.3);
    store.updateSkill('timingAccuracy', 0.9);
    store.recordExerciseResult({ tempo: 75, score: 0.95, noteResults: [] });

    // Verify state is populated
    expect(useLearnerProfileStore.getState().totalExercisesCompleted).toBeGreaterThan(0);
    expect(Object.keys(useLearnerProfileStore.getState().noteAccuracy).length).toBeGreaterThan(0);

    // Reset
    useLearnerProfileStore.getState().reset();

    const state = useLearnerProfileStore.getState();
    expect(state.noteAccuracy).toEqual({});
    expect(state.noteAttempts).toEqual({});
    expect(state.skills).toEqual({
      timingAccuracy: 0.5,
      pitchAccuracy: 0.5,
      sightReadSpeed: 0.5,
      chordRecognition: 0.5,
    });
    expect(state.tempoRange).toEqual({ min: 40, max: 80 });
    expect(state.weakNotes).toEqual([]);
    expect(state.weakSkills).toEqual([]);
    expect(state.totalExercisesCompleted).toBe(0);
    expect(state.lastAssessmentDate).toBe('');
    expect(state.assessmentScore).toBe(0);
  });

  it('rolling average converges with many updates', () => {
    // Feed 30 updates of 1.0 to a note
    for (let i = 0; i < 30; i++) {
      useLearnerProfileStore.getState().updateNoteAccuracy(60, 1.0);
    }
    // After many 1.0 inputs, accuracy should be very close to 1.0
    expect(useLearnerProfileStore.getState().noteAccuracy[60]).toBeCloseTo(1.0, 2);

    // Now feed several 0.0 values; rolling window (20) should shift the average
    for (let i = 0; i < 20; i++) {
      useLearnerProfileStore.getState().updateNoteAccuracy(60, 0.0);
    }
    // After 20 zero-accuracy updates with window size 20, average should drop significantly
    const accuracy = useLearnerProfileStore.getState().noteAccuracy[60];
    expect(accuracy).toBeLessThan(0.5);

    // Attempt count should be 50 total
    expect(useLearnerProfileStore.getState().noteAttempts[60]).toBe(50);
  });

  it('recordExerciseResult updates notes and weak areas in one call', () => {
    const { recordExerciseResult } = useLearnerProfileStore.getState();

    recordExerciseResult({
      tempo: 60,
      score: 0.75,
      noteResults: [
        { midiNote: 60, accuracy: 0.9 },  // Above weak threshold
        { midiNote: 64, accuracy: 0.4 },  // Below weak threshold
        { midiNote: 67, accuracy: 0.6 },  // Below weak threshold
      ],
    });

    const state = useLearnerProfileStore.getState();

    // Note accuracy should be set
    expect(state.noteAccuracy[60]).toBe(0.9);
    expect(state.noteAccuracy[64]).toBe(0.4);
    expect(state.noteAccuracy[67]).toBe(0.6);

    // Attempt counts should be set
    expect(state.noteAttempts[60]).toBe(1);
    expect(state.noteAttempts[64]).toBe(1);
    expect(state.noteAttempts[67]).toBe(1);

    // Weak notes should be recalculated (64 and 67 are below 0.7)
    expect(state.weakNotes).toContain(64);
    expect(state.weakNotes).toContain(67);
    expect(state.weakNotes).not.toContain(60);

    // Total exercises should be incremented
    expect(state.totalExercisesCompleted).toBe(1);
  });
});

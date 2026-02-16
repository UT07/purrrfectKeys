import { useLearnerProfileStore } from '../learnerProfileStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe('learnerProfileStore', () => {
  beforeEach(() => {
    useLearnerProfileStore.getState().reset();
  });

  it('initializes with empty profile', () => {
    const state = useLearnerProfileStore.getState();
    expect(state.noteAccuracy).toEqual({});
    expect(state.skills.timingAccuracy).toBe(0.5);
    expect(state.tempoRange).toEqual({ min: 40, max: 80 });
    expect(state.weakNotes).toEqual([]);
    expect(state.totalExercisesCompleted).toBe(0);
  });

  it('updates note accuracy with rolling average', () => {
    const { updateNoteAccuracy } = useLearnerProfileStore.getState();
    updateNoteAccuracy(60, 1.0);
    expect(useLearnerProfileStore.getState().noteAccuracy[60]).toBe(1.0);

    updateNoteAccuracy(60, 0.0);
    expect(useLearnerProfileStore.getState().noteAccuracy[60]).toBe(0.5);
  });

  it('calculates weak notes (below 70%)', () => {
    const { updateNoteAccuracy, recalculateWeakAreas } = useLearnerProfileStore.getState();
    updateNoteAccuracy(60, 0.9);
    updateNoteAccuracy(61, 0.5);
    updateNoteAccuracy(62, 0.3);
    recalculateWeakAreas();

    const { weakNotes } = useLearnerProfileStore.getState();
    expect(weakNotes).toContain(61);
    expect(weakNotes).toContain(62);
    expect(weakNotes).not.toContain(60);
  });

  it('updates skill dimensions', () => {
    const { updateSkill } = useLearnerProfileStore.getState();
    updateSkill('timingAccuracy', 0.85);
    expect(useLearnerProfileStore.getState().skills.timingAccuracy).toBe(0.85);
  });

  it('adjusts tempo range on exercise completion', () => {
    const { recordExerciseResult } = useLearnerProfileStore.getState();
    recordExerciseResult({ tempo: 90, score: 0.9, noteResults: [] });
    const { tempoRange } = useLearnerProfileStore.getState();
    // Initial max is 80, algo expands by 5 when score > 0.85 and tempo >= max-10
    expect(tempoRange.max).toBeGreaterThan(80);
  });

  it('increments totalExercisesCompleted', () => {
    const { recordExerciseResult } = useLearnerProfileStore.getState();
    recordExerciseResult({ tempo: 60, score: 0.8, noteResults: [] });
    expect(useLearnerProfileStore.getState().totalExercisesCompleted).toBe(1);
  });

  it('identifies weak skills (below 60%)', () => {
    const store = useLearnerProfileStore.getState();
    store.updateSkill('timingAccuracy', 0.4);
    store.updateSkill('pitchAccuracy', 0.8);
    store.recalculateWeakAreas();

    const { weakSkills } = useLearnerProfileStore.getState();
    expect(weakSkills).toContain('timingAccuracy');
    expect(weakSkills).not.toContain('pitchAccuracy');
  });
});

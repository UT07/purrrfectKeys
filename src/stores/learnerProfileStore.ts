import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NoteResult {
  midiNote: number;
  accuracy: number;
}

interface ExerciseResult {
  tempo: number;
  score: number;
  noteResults: NoteResult[];
}

interface Skills {
  timingAccuracy: number;
  pitchAccuracy: number;
  sightReadSpeed: number;
  chordRecognition: number;
}

interface LearnerProfileState {
  noteAccuracy: Record<number, number>;
  noteAttempts: Record<number, number>;
  skills: Skills;
  tempoRange: { min: number; max: number };
  weakNotes: number[];
  weakSkills: string[];
  totalExercisesCompleted: number;
  lastAssessmentDate: string;
  assessmentScore: number;

  updateNoteAccuracy: (midiNote: number, accuracy: number) => void;
  updateSkill: (skill: keyof Skills, value: number) => void;
  recalculateWeakAreas: () => void;
  recordExerciseResult: (result: ExerciseResult) => void;
  reset: () => void;
}

const INITIAL_SKILLS: Skills = {
  timingAccuracy: 0.5,
  pitchAccuracy: 0.5,
  sightReadSpeed: 0.5,
  chordRecognition: 0.5,
};

const WEAK_NOTE_THRESHOLD = 0.7;
const WEAK_SKILL_THRESHOLD = 0.6;
const ROLLING_WINDOW = 20;

export const useLearnerProfileStore = create<LearnerProfileState>()(
  persist(
    (set, get) => ({
      noteAccuracy: {},
      noteAttempts: {},
      skills: { ...INITIAL_SKILLS },
      tempoRange: { min: 40, max: 80 },
      weakNotes: [],
      weakSkills: [],
      totalExercisesCompleted: 0,
      lastAssessmentDate: '',
      assessmentScore: 0,

      updateNoteAccuracy: (midiNote: number, accuracy: number) => {
        const { noteAccuracy, noteAttempts } = get();
        const prevAccuracy = noteAccuracy[midiNote] ?? accuracy;
        const attempts = (noteAttempts[midiNote] ?? 0) + 1;
        const weight = Math.min(attempts, ROLLING_WINDOW);
        const newAccuracy = prevAccuracy + (accuracy - prevAccuracy) / weight;

        set({
          noteAccuracy: { ...noteAccuracy, [midiNote]: newAccuracy },
          noteAttempts: { ...noteAttempts, [midiNote]: attempts },
        });
      },

      updateSkill: (skill: keyof Skills, value: number) => {
        const { skills } = get();
        set({ skills: { ...skills, [skill]: Math.max(0, Math.min(1, value)) } });
      },

      recalculateWeakAreas: () => {
        const { noteAccuracy, skills } = get();
        const weakNotes = Object.entries(noteAccuracy)
          .filter(([, acc]) => acc < WEAK_NOTE_THRESHOLD)
          .map(([note]) => Number(note))
          .sort((a, b) => (noteAccuracy[a] ?? 0) - (noteAccuracy[b] ?? 0));

        const weakSkills = (Object.entries(skills) as [keyof Skills, number][])
          .filter(([, val]) => val < WEAK_SKILL_THRESHOLD)
          .map(([skill]) => skill);

        set({ weakNotes, weakSkills });
      },

      recordExerciseResult: (result: ExerciseResult) => {
        const state = get();

        for (const nr of result.noteResults) {
          state.updateNoteAccuracy(nr.midiNote, nr.accuracy);
        }

        const { tempoRange } = get();
        let newMax = tempoRange.max;
        let newMin = tempoRange.min;
        if (result.score > 0.85 && result.tempo >= tempoRange.max - 10) {
          newMax = Math.min(200, tempoRange.max + 5);
        }
        if (result.score < 0.6 && result.tempo <= tempoRange.min + 10) {
          newMin = Math.max(30, tempoRange.min - 5);
        }

        set({
          tempoRange: { min: newMin, max: newMax },
          totalExercisesCompleted: state.totalExercisesCompleted + 1,
        });

        get().recalculateWeakAreas();
      },

      reset: () => {
        set({
          noteAccuracy: {},
          noteAttempts: {},
          skills: { ...INITIAL_SKILLS },
          tempoRange: { min: 40, max: 80 },
          weakNotes: [],
          weakSkills: [],
          totalExercisesCompleted: 0,
          lastAssessmentDate: '',
          assessmentScore: 0,
        });
      },
    }),
    {
      name: 'keysense_learner_profile',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

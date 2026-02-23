/**
 * Learner Profile Store
 *
 * Tracks per-note accuracy, skill dimensions, tempo comfort zone, and weak areas.
 * Updated after every exercise to build a profile for adaptive learning.
 *
 * All state is automatically persisted to AsyncStorage via PersistenceManager.
 */

import { create } from 'zustand';
import type { ExerciseResult, Skills, LearnerProfileState, SkillMasteryRecord } from './types';
import { PersistenceManager, STORAGE_KEYS, createDebouncedSave } from './persistence';
import { getSkillById, DECAY_HALF_LIFE_DAYS, DECAY_THRESHOLD } from '../core/curriculum/SkillTree';
import { useGemStore } from './gemStore';

const WEAK_NOTE_THRESHOLD = 0.7;
const WEAK_SKILL_THRESHOLD = 0.6;
const ROLLING_WINDOW = 20;
const MAX_RECENT_EXERCISES = 10;

const INITIAL_SKILLS: Skills = {
  timingAccuracy: 0.5,
  pitchAccuracy: 0.5,
  sightReadSpeed: 0.5,
  chordRecognition: 0.5,
};

/** Data-only shape of learner profile state (excludes actions) */
export type LearnerProfileData = Pick<
  LearnerProfileState,
  | 'noteAccuracy'
  | 'noteAttempts'
  | 'skills'
  | 'tempoRange'
  | 'weakNotes'
  | 'weakSkills'
  | 'totalExercisesCompleted'
  | 'lastAssessmentDate'
  | 'assessmentScore'
  | 'masteredSkills'
  | 'skillMasteryData'
  | 'recentExerciseIds'
>;

const defaultData: LearnerProfileData = {
  noteAccuracy: {},
  noteAttempts: {},
  skills: { ...INITIAL_SKILLS },
  tempoRange: { min: 40, max: 80 },
  weakNotes: [],
  weakSkills: [],
  totalExercisesCompleted: 0,
  lastAssessmentDate: '',
  assessmentScore: 0,
  masteredSkills: [],
  skillMasteryData: {},
  recentExerciseIds: [],
};

// Create debounced save function
const debouncedSave = createDebouncedSave(STORAGE_KEYS.LEARNER_PROFILE, 1000);

export const useLearnerProfileStore = create<LearnerProfileState>((set, get) => ({
  ...defaultData,

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
    debouncedSave(get());
  },

  updateSkill: (skill: keyof Skills, value: number) => {
    const { skills } = get();
    set({ skills: { ...skills, [skill]: Math.max(0, Math.min(1, value)) } });
    debouncedSave(get());
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
    debouncedSave(get());
  },

  recordExerciseResult: (result: ExerciseResult) => {
    const state = get();

    // Batch all note accuracy updates into a single set() call
    // (previously called set() per note + 2 more, causing N+2 re-renders)
    const updatedNoteAccuracy = { ...state.noteAccuracy };
    const updatedNoteAttempts = { ...state.noteAttempts };

    for (const nr of result.noteResults) {
      const prevAccuracy = updatedNoteAccuracy[nr.midiNote] ?? nr.accuracy;
      const attempts = (updatedNoteAttempts[nr.midiNote] ?? 0) + 1;
      const weight = Math.min(attempts, ROLLING_WINDOW);
      const newAccuracy = prevAccuracy + (nr.accuracy - prevAccuracy) / weight;
      updatedNoteAccuracy[nr.midiNote] = newAccuracy;
      updatedNoteAttempts[nr.midiNote] = attempts;
    }

    // Single atomic state update
    set({
      noteAccuracy: updatedNoteAccuracy,
      noteAttempts: updatedNoteAttempts,
      totalExercisesCompleted: state.totalExercisesCompleted + 1,
    });

    // Recalculate weak areas based on updated accuracy
    get().recalculateWeakAreas();
  },

  markSkillMastered: (skillId: string) => {
    const { masteredSkills, skillMasteryData } = get();
    if (masteredSkills.includes(skillId)) return;
    const now = Date.now();
    const existing = skillMasteryData[skillId];
    set({
      masteredSkills: [...masteredSkills, skillId],
      skillMasteryData: {
        ...skillMasteryData,
        [skillId]: {
          masteredAt: now,
          lastPracticedAt: now,
          completionCount: existing?.completionCount ?? 1,
          decayScore: 1.0,
        },
      },
    });

    // Gem reward for mastering a skill
    useGemStore.getState().earnGems(15, 'skill-mastered');

    debouncedSave(get());
  },

  recordSkillPractice: (skillId: string, passed: boolean) => {
    const { skillMasteryData } = get();
    const now = Date.now();
    const existing = skillMasteryData[skillId];
    const newCount = (existing?.completionCount ?? 0) + (passed ? 1 : 0);

    const updatedRecord: SkillMasteryRecord = {
      masteredAt: existing?.masteredAt ?? 0,
      lastPracticedAt: now,
      completionCount: newCount,
      decayScore: 1.0, // refreshed by practice
    };

    set({
      skillMasteryData: { ...skillMasteryData, [skillId]: updatedRecord },
    });

    // Auto-master if completionCount meets the node's requiredCompletions
    if (passed) {
      const node = getSkillById(skillId);
      if (node && newCount >= node.requiredCompletions) {
        get().markSkillMastered(skillId);
      }
    }

    debouncedSave(get());
  },

  calculateDecayedSkills: (): string[] => {
    const { masteredSkills, skillMasteryData } = get();
    const now = Date.now();
    const msPerDay = 86400000;

    return masteredSkills.filter((id) => {
      const record = skillMasteryData[id];
      if (!record) return false;
      const daysSince = (now - record.lastPracticedAt) / msPerDay;
      const decay = Math.max(0, 1 - daysSince / DECAY_HALF_LIFE_DAYS);
      return decay < DECAY_THRESHOLD;
    });
  },

  addRecentExercise: (exerciseId: string) => {
    const { recentExerciseIds } = get();
    const updated = [exerciseId, ...recentExerciseIds.filter((id) => id !== exerciseId)]
      .slice(0, MAX_RECENT_EXERCISES);
    set({ recentExerciseIds: updated });
    debouncedSave(get());
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
      masteredSkills: [],
      skillMasteryData: {},
      recentExerciseIds: [],
    });
    PersistenceManager.deleteState(STORAGE_KEYS.LEARNER_PROFILE);
  },
}));

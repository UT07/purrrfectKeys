/**
 * Content Loader
 * Static registry for exercise and lesson JSON content.
 * Metro requires static require() strings — no dynamic imports.
 *
 * The EXERCISE_INDEX (loaded from content/exercise-index.json) provides
 * lightweight metadata for all exercises without loading full content.
 * Use getExerciseMetadata() / getExercisesForLesson() / getExercisesBySkill()
 * for fast lookups. Use getExercise() when you need the full Exercise object.
 */

import type { Exercise, ExerciseType } from '../core/exercises/types';
import { logger } from '../utils/logger';

// ============================================================================
// Lesson manifest type (matches content/lessons/*.json structure)
// ============================================================================

export interface LessonManifest {
  id: string;
  version: number;
  metadata: {
    title: string;
    description: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    estimatedMinutes: number;
    skills: string[];
  };
  exercises: Array<{
    id: string;
    title: string;
    order: number;
    required: boolean;
    test?: boolean;
  }>;
  unlockRequirement: {
    type: string;
    lessonId: string;
  } | null;
  xpReward: number;
  estimatedMinutes: number;
}

// ============================================================================
// Exercise index types (matches content/exercise-index.json)
// ============================================================================

export interface ExerciseIndexEntry {
  id: string;
  lessonId: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  skills: string[];
  type: ExerciseType | 'test';
  order: number;
}

export interface LessonIndexEntry {
  id: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  exerciseCount: number;
  unlockRequirement: { type: string; lessonId: string } | null;
}

interface ExerciseIndexFile {
  version: number;
  generatedAt: string;
  exercises: ExerciseIndexEntry[];
  lessons: LessonIndexEntry[];
}

// ============================================================================
// Exercise index (lightweight metadata — no full exercise content)
// ============================================================================

const EXERCISE_INDEX: ExerciseIndexFile = require('../../content/exercise-index.json');

// Pre-built lookup maps for O(1) access
const _exerciseMetadataById: Map<string, ExerciseIndexEntry> = new Map();
const _exercisesByLesson: Map<string, ExerciseIndexEntry[]> = new Map();
const _exercisesBySkill: Map<string, ExerciseIndexEntry[]> = new Map();
const _exercisesByType: Map<string, ExerciseIndexEntry[]> = new Map();
const _lessonIndexById: Map<string, LessonIndexEntry> = new Map();

// Build lookup maps once at module load
for (const entry of EXERCISE_INDEX.exercises) {
  _exerciseMetadataById.set(entry.id, entry);

  // By lesson
  const lessonList = _exercisesByLesson.get(entry.lessonId) ?? [];
  lessonList.push(entry);
  _exercisesByLesson.set(entry.lessonId, lessonList);

  // By skill
  for (const skill of entry.skills) {
    const skillList = _exercisesBySkill.get(skill) ?? [];
    skillList.push(entry);
    _exercisesBySkill.set(skill, skillList);
  }

  // By type
  const typeList = _exercisesByType.get(entry.type) ?? [];
  typeList.push(entry);
  _exercisesByType.set(entry.type, typeList);
}

for (const lesson of EXERCISE_INDEX.lessons) {
  _lessonIndexById.set(lesson.id, lesson);
}

// ============================================================================
// Static exercise registry (Metro-compatible)
// ============================================================================

const EXERCISE_REGISTRY: Record<string, Exercise> = {
  // Lesson 01
  'lesson-01-ex-01': require('../../content/exercises/lesson-01/exercise-01-find-middle-c.json'),
  'lesson-01-ex-02': require('../../content/exercises/lesson-01/exercise-02-keyboard-geography.json'),
  'lesson-01-ex-03': require('../../content/exercises/lesson-01/exercise-03-white-keys.json'),
  'lesson-01-test': require('../../content/exercises/lesson-01/exercise-test.json'),

  // Lesson 02
  'lesson-02-ex-01': require('../../content/exercises/lesson-02/exercise-01-cde-simple.json'),
  'lesson-02-ex-02': require('../../content/exercises/lesson-02/exercise-02-cdefg.json'),
  'lesson-02-ex-03': require('../../content/exercises/lesson-02/exercise-03-c-major-octave.json'),
  'lesson-02-ex-04': require('../../content/exercises/lesson-02/exercise-04-mary-snippet.json'),
  'lesson-02-ex-05': require('../../content/exercises/lesson-02/exercise-05-broken-c-chord.json'),
  'lesson-02-ex-06': require('../../content/exercises/lesson-02/exercise-06-twinkle-twinkle.json'),
  'lesson-02-ex-07': require('../../content/exercises/lesson-02/exercise-07-eighth-note-drill.json'),
  'lesson-02-ex-08': require('../../content/exercises/lesson-02/exercise-08-c-position-review.json'),
  'lesson-02-test': require('../../content/exercises/lesson-02/exercise-test.json'),

  // Lesson 03
  'lesson-03-ex-01': require('../../content/exercises/lesson-03/exercise-01-left-c-position.json'),
  'lesson-03-ex-02': require('../../content/exercises/lesson-03/exercise-02-left-scale-down.json'),
  'lesson-03-ex-03': require('../../content/exercises/lesson-03/exercise-03-bass-notes.json'),
  'lesson-03-ex-04': require('../../content/exercises/lesson-03/exercise-04-broken-f-chord-left.json'),
  'lesson-03-ex-05': require('../../content/exercises/lesson-03/exercise-05-steady-bass-pattern.json'),
  'lesson-03-test': require('../../content/exercises/lesson-03/exercise-test.json'),

  // Lesson 04
  'lesson-04-ex-01': require('../../content/exercises/lesson-04/exercise-01-hands-melody-bass.json'),
  'lesson-04-ex-02': require('../../content/exercises/lesson-04/exercise-02-mary-full-version.json'),
  'lesson-04-ex-03': require('../../content/exercises/lesson-04/exercise-03-hand-independence-drill.json'),
  'lesson-04-ex-04': require('../../content/exercises/lesson-04/exercise-04-ode-to-joy-intro.json'),
  'lesson-04-ex-05': require('../../content/exercises/lesson-04/exercise-05-blocked-c-f-chords.json'),
  'lesson-04-ex-06': require('../../content/exercises/lesson-04/exercise-06-both-hands-review.json'),
  'lesson-04-test': require('../../content/exercises/lesson-04/exercise-test.json'),

  // Lesson 05
  'lesson-05-ex-01': require('../../content/exercises/lesson-05/exercise-01-scale-technique.json'),
  'lesson-05-ex-02': require('../../content/exercises/lesson-05/exercise-02-parallel-scales.json'),
  'lesson-05-ex-03': require('../../content/exercises/lesson-05/exercise-03-scale-speed-drill.json'),
  'lesson-05-ex-04': require('../../content/exercises/lesson-05/exercise-04-scale-review.json'),
  'lesson-05-test': require('../../content/exercises/lesson-05/exercise-test.json'),

  // Lesson 06
  'lesson-06-ex-01': require('../../content/exercises/lesson-06/exercise-01-jingle-bells.json'),
  'lesson-06-ex-02': require('../../content/exercises/lesson-06/exercise-02-happy-birthday.json'),
  'lesson-06-ex-03': require('../../content/exercises/lesson-06/exercise-03-amazing-grace.json'),
  'lesson-06-ex-04': require('../../content/exercises/lesson-06/exercise-04-let-it-go-snippet.json'),
  'lesson-06-test': require('../../content/exercises/lesson-06/exercise-test.json'),
};

// ============================================================================
// Static lesson registry
// ============================================================================

const LESSON_REGISTRY: Record<string, LessonManifest> = {
  'lesson-01': require('../../content/lessons/lesson-01.json'),
  'lesson-02': require('../../content/lessons/lesson-02.json'),
  'lesson-03': require('../../content/lessons/lesson-03.json'),
  'lesson-04': require('../../content/lessons/lesson-04.json'),
  'lesson-05': require('../../content/lessons/lesson-05.json'),
  'lesson-06': require('../../content/lessons/lesson-06.json'),
};

// Ordered list of lesson IDs (determines display order)
const LESSON_ORDER = [
  'lesson-01',
  'lesson-02',
  'lesson-03',
  'lesson-04',
  'lesson-05',
  'lesson-06',
];

// ============================================================================
// Public API
// ============================================================================

export function getExercise(exerciseId: string): Exercise | null {
  return EXERCISE_REGISTRY[exerciseId] ?? null;
}

export function getLessons(): LessonManifest[] {
  return LESSON_ORDER.map((id) => LESSON_REGISTRY[id]).filter(Boolean);
}

export function getLesson(lessonId: string): LessonManifest | null {
  return LESSON_REGISTRY[lessonId] ?? null;
}

export function getLessonExercises(lessonId: string): Exercise[] {
  const lesson = LESSON_REGISTRY[lessonId];
  if (!lesson) return [];

  const nonTestExercises = lesson.exercises
    .filter((e) => !e.test)
    .sort((a, b) => a.order - b.order);

  const exercises: Exercise[] = [];
  for (const entry of nonTestExercises) {
    const exercise = EXERCISE_REGISTRY[entry.id];
    if (exercise) {
      exercises.push(exercise);
    } else {
      logger.warn(`[ContentLoader] Missing exercise "${entry.id}" in lesson "${lessonId}" — not found in registry`);
    }
  }
  return exercises;
}

/**
 * Get the next exercise in the lesson, skipping test exercises in normal progression.
 * Test exercises are only reached via explicit testMode navigation.
 */
export function getNextExerciseId(
  lessonId: string,
  currentExerciseId: string
): string | null {
  const lesson = LESSON_REGISTRY[lessonId];
  if (!lesson) return null;

  // Filter out test exercises from normal progression
  const nonTestExercises = [...lesson.exercises]
    .filter((e) => !e.test)
    .sort((a, b) => a.order - b.order);

  const currentIndex = nonTestExercises.findIndex((e) => e.id === currentExerciseId);
  if (currentIndex === -1 || currentIndex >= nonTestExercises.length - 1) return null;

  return nonTestExercises[currentIndex + 1].id;
}

export function getLessonIdForExercise(exerciseId: string): string | null {
  for (const [lessonId, lesson] of Object.entries(LESSON_REGISTRY)) {
    if (lesson.exercises.some((e) => e.id === exerciseId)) {
      return lessonId;
    }
  }
  return null;
}

/**
 * Get the test exercise for a lesson, if one exists.
 */
export function getTestExercise(lessonId: string): Exercise | null {
  const lesson = LESSON_REGISTRY[lessonId];
  if (!lesson) return null;

  const testEntry = lesson.exercises.find((e) => e.test);
  if (!testEntry) return null;

  return EXERCISE_REGISTRY[testEntry.id] ?? null;
}

/**
 * Check if an exercise is a mastery test.
 */
export function isTestExercise(exerciseId: string): boolean {
  for (const lesson of Object.values(LESSON_REGISTRY)) {
    const entry = lesson.exercises.find((e) => e.id === exerciseId);
    if (entry) return !!entry.test;
  }
  return false;
}

/**
 * Get non-test exercises for a lesson (the regular practice exercises).
 */
export function getNonTestExercises(lessonId: string): Exercise[] {
  // Delegates to getLessonExercises (same logic, with missing-exercise warnings)
  return getLessonExercises(lessonId);
}

/**
 * Check if the user has completed all curriculum lessons.
 * Returns true when every lesson has status 'completed' in the progress store.
 */
export function isPostCurriculum(lessonProgress: Record<string, { status: string }>): boolean {
  return LESSON_ORDER.every(
    (lessonId) => lessonProgress[lessonId]?.status === 'completed'
  );
}

// ============================================================================
// Index-based API (scalable metadata lookups — no full exercise loading)
// ============================================================================

/**
 * Get lightweight metadata for an exercise from the index.
 * Returns null if the exercise is not in the index.
 * This is much cheaper than getExercise() — no full JSON parse.
 */
export function getExerciseMetadata(exerciseId: string): ExerciseIndexEntry | null {
  return _exerciseMetadataById.get(exerciseId) ?? null;
}

/**
 * Get exercise metadata list for all exercises in a lesson.
 * Returns entries sorted by order. Includes test exercises.
 */
export function getExercisesForLesson(lessonId: string): ExerciseIndexEntry[] {
  const entries = _exercisesByLesson.get(lessonId);
  if (!entries) return [];
  return [...entries].sort((a, b) => a.order - b.order);
}

/**
 * Get all lessons from the index (lightweight — no full manifest loading).
 * Returns lessons in index order (which matches LESSON_ORDER).
 */
export function getAllLessons(): LessonIndexEntry[] {
  return [...EXERCISE_INDEX.lessons];
}

/**
 * Get total lesson count from the index.
 */
export function getLessonCount(): number {
  return EXERCISE_INDEX.lessons.length;
}

/**
 * Get all exercises that teach a given skill.
 * Matches against the skills array in exercise metadata.
 */
export function getExercisesBySkill(skillId: string): ExerciseIndexEntry[] {
  return _exercisesBySkill.get(skillId) ?? [];
}

/**
 * Get all exercises of a given type ('play' or 'test').
 */
export function getExercisesByType(type: ExerciseType | 'test'): ExerciseIndexEntry[] {
  return _exercisesByType.get(type) ?? [];
}

/**
 * Get a lesson from the index by ID (lightweight — no full manifest).
 */
export function getLessonFromIndex(lessonId: string): LessonIndexEntry | null {
  return _lessonIndexById.get(lessonId) ?? null;
}

/**
 * Get the exercise index version number.
 */
export function getExerciseIndexVersion(): number {
  return EXERCISE_INDEX.version;
}

/**
 * Get the lesson ID for an exercise using the index (O(1) lookup).
 * Falls back to the lesson registry scan if not found in index.
 */
export function getLessonIdForExerciseFromIndex(exerciseId: string): string | null {
  const entry = _exerciseMetadataById.get(exerciseId);
  if (entry) return entry.lessonId;
  // Fall back to registry scan for exercises not in index (e.g. AI-generated)
  return getLessonIdForExercise(exerciseId);
}

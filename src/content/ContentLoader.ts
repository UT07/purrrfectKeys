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
import { loadExerciseFromRegistry } from './ContentLoaderRegistry.generated';
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
// Exercise registry — delegates to auto-generated lazy-loading registry
// All exercises (lessons 1-24+) are loaded via ContentLoaderRegistry.generated.ts
// ============================================================================

// Cache for loaded exercises (populated on first access per exercise)
const _exerciseCache: Record<string, Exercise> = {};

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
  'lesson-07': require('../../content/lessons/lesson-07.json'),
  'lesson-08': require('../../content/lessons/lesson-08.json'),
  'lesson-09': require('../../content/lessons/lesson-09.json'),
  'lesson-10': require('../../content/lessons/lesson-10.json'),
  'lesson-11': require('../../content/lessons/lesson-11.json'),
  'lesson-12': require('../../content/lessons/lesson-12.json'),
  'lesson-13': require('../../content/lessons/lesson-13.json'),
  'lesson-14': require('../../content/lessons/lesson-14.json'),
  'lesson-15': require('../../content/lessons/lesson-15.json'),
  'lesson-16': require('../../content/lessons/lesson-16.json'),
  'lesson-17': require('../../content/lessons/lesson-17.json'),
  'lesson-18': require('../../content/lessons/lesson-18.json'),
  'lesson-19': require('../../content/lessons/lesson-19.json'),
  'lesson-20': require('../../content/lessons/lesson-20.json'),
  'lesson-21': require('../../content/lessons/lesson-21.json'),
  'lesson-22': require('../../content/lessons/lesson-22.json'),
  'lesson-23': require('../../content/lessons/lesson-23.json'),
  'lesson-24': require('../../content/lessons/lesson-24.json'),
  'lesson-25': require('../../content/lessons/lesson-25.json'),
  'lesson-26': require('../../content/lessons/lesson-26.json'),
  'lesson-27': require('../../content/lessons/lesson-27.json'),
  'lesson-28': require('../../content/lessons/lesson-28.json'),
  'lesson-29': require('../../content/lessons/lesson-29.json'),
  'lesson-30': require('../../content/lessons/lesson-30.json'),
  'lesson-31': require('../../content/lessons/lesson-31.json'),
  'lesson-32': require('../../content/lessons/lesson-32.json'),
  'lesson-33': require('../../content/lessons/lesson-33.json'),
  'lesson-34': require('../../content/lessons/lesson-34.json'),
  'lesson-35': require('../../content/lessons/lesson-35.json'),
  'lesson-36': require('../../content/lessons/lesson-36.json'),
  'lesson-37': require('../../content/lessons/lesson-37.json'),
  'lesson-38': require('../../content/lessons/lesson-38.json'),
  'lesson-39': require('../../content/lessons/lesson-39.json'),
  'lesson-40': require('../../content/lessons/lesson-40.json'),
  'lesson-41': require('../../content/lessons/lesson-41.json'),
  'lesson-42': require('../../content/lessons/lesson-42.json'),
  'lesson-43': require('../../content/lessons/lesson-43.json'),
  'lesson-44': require('../../content/lessons/lesson-44.json'),
  'lesson-45': require('../../content/lessons/lesson-45.json'),
  'lesson-46': require('../../content/lessons/lesson-46.json'),
  'lesson-47': require('../../content/lessons/lesson-47.json'),
  'lesson-48': require('../../content/lessons/lesson-48.json'),
  'lesson-49': require('../../content/lessons/lesson-49.json'),
  'lesson-50': require('../../content/lessons/lesson-50.json'),
};

// Ordered list of lesson IDs (determines display order)
const LESSON_ORDER = [
  'lesson-01', 'lesson-02', 'lesson-03', 'lesson-04', 'lesson-05', 'lesson-06',
  'lesson-07', 'lesson-08', 'lesson-09', 'lesson-10', 'lesson-11', 'lesson-12',
  'lesson-13', 'lesson-14', 'lesson-15', 'lesson-16', 'lesson-17', 'lesson-18',
  'lesson-19', 'lesson-20', 'lesson-21', 'lesson-22', 'lesson-23', 'lesson-24',
  'lesson-25', 'lesson-26', 'lesson-27', 'lesson-28', 'lesson-29', 'lesson-30',
  'lesson-31', 'lesson-32', 'lesson-33', 'lesson-34', 'lesson-35', 'lesson-36',
  'lesson-37', 'lesson-38', 'lesson-39', 'lesson-40',
  'lesson-41', 'lesson-42', 'lesson-43', 'lesson-44', 'lesson-45',
  'lesson-46', 'lesson-47', 'lesson-48', 'lesson-49', 'lesson-50',
];

// ============================================================================
// Public API
// ============================================================================

export function getExercise(exerciseId: string): Exercise | null {
  // Check cache first
  if (_exerciseCache[exerciseId]) return _exerciseCache[exerciseId];

  // Load from generated registry (lazy — only loads JSON on first access)
  const exercise = loadExerciseFromRegistry(exerciseId);
  if (exercise) {
    _exerciseCache[exerciseId] = exercise;
    return exercise;
  }

  return null;
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
    const exercise = getExercise(entry.id);
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

// Pre-built exerciseId→lessonId map for O(1) lookup (built once at module load)
const _exerciseToLessonCache: Map<string, string> = new Map();
for (const [lessonId, lesson] of Object.entries(LESSON_REGISTRY)) {
  for (const ex of lesson.exercises) {
    _exerciseToLessonCache.set(ex.id, lessonId);
  }
}

export function getLessonIdForExercise(exerciseId: string): string | null {
  return _exerciseToLessonCache.get(exerciseId) ?? null;
}

/**
 * Get the test exercise for a lesson, if one exists.
 */
export function getTestExercise(lessonId: string): Exercise | null {
  const lesson = LESSON_REGISTRY[lessonId];
  if (!lesson) return null;

  const testEntry = lesson.exercises.find((e) => e.test);
  if (!testEntry) return null;

  return getExercise(testEntry.id);
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

/**
 * Content Loader Tests
 * Verifies exercise/lesson loading from JSON content files
 */

import {
  getExercise,
  getLessons,
  getLesson,
  getLessonExercises,
  getNextExerciseId,
  getLessonIdForExercise,
} from '../ContentLoader';

describe('ContentLoader', () => {
  describe('getExercise', () => {
    it('should load lesson-01-ex-01 from JSON', () => {
      const exercise = getExercise('lesson-01-ex-01');
      expect(exercise).not.toBeNull();
      expect(exercise!.id).toBe('lesson-01-ex-01');
      expect(exercise!.metadata.title).toBe('Find Middle C');
    });

    it('should return null for non-existent exercise', () => {
      expect(getExercise('non-existent')).toBeNull();
    });

    it('should have valid scoring config', () => {
      const exercise = getExercise('lesson-01-ex-01');
      expect(exercise!.scoring.passingScore).toBe(60);
      expect(exercise!.scoring.starThresholds).toEqual([70, 85, 95]);
      expect(exercise!.scoring.timingToleranceMs).toBeGreaterThan(0);
    });

    it('should have at least one note', () => {
      const exercise = getExercise('lesson-01-ex-01');
      expect(exercise!.notes.length).toBeGreaterThan(0);
    });

    it('should have valid MIDI note numbers', () => {
      const exercise = getExercise('lesson-01-ex-01');
      for (const note of exercise!.notes) {
        expect(note.note).toBeGreaterThanOrEqual(21);
        expect(note.note).toBeLessThanOrEqual(108);
      }
    });
  });

  describe('getLessons', () => {
    it('should return all lessons in order', () => {
      const lessons = getLessons();
      expect(lessons.length).toBeGreaterThanOrEqual(6);
      expect(lessons[0].id).toBe('lesson-01');
      expect(lessons[1].id).toBe('lesson-02');
    });

    it('should have metadata for each lesson', () => {
      const lessons = getLessons();
      for (const lesson of lessons) {
        expect(lesson.metadata.title).toBeTruthy();
        expect(lesson.metadata.description).toBeTruthy();
        expect(lesson.metadata.difficulty).toBeGreaterThanOrEqual(1);
        expect(lesson.metadata.difficulty).toBeLessThanOrEqual(5);
      }
    });

    it('should have exercises for each lesson', () => {
      const lessons = getLessons();
      for (const lesson of lessons) {
        expect(lesson.exercises.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getLesson', () => {
    it('should load lesson-01', () => {
      const lesson = getLesson('lesson-01');
      expect(lesson).not.toBeNull();
      expect(lesson!.id).toBe('lesson-01');
      expect(lesson!.metadata.title).toBe('Getting Started');
    });

    it('should return null for non-existent lesson', () => {
      expect(getLesson('non-existent')).toBeNull();
    });

    it('should have xpReward', () => {
      const lesson = getLesson('lesson-01');
      expect(lesson!.xpReward).toBe(120);
    });
  });

  describe('getLessonExercises', () => {
    it('should return exercises for lesson-01 in order', () => {
      const exercises = getLessonExercises('lesson-01');
      expect(exercises.length).toBe(3);
      expect(exercises[0].id).toBe('lesson-01-ex-01');
      expect(exercises[1].id).toBe('lesson-01-ex-02');
      expect(exercises[2].id).toBe('lesson-01-ex-03');
    });

    it('should return empty array for non-existent lesson', () => {
      expect(getLessonExercises('non-existent')).toEqual([]);
    });

    it('should return actual Exercise objects', () => {
      const exercises = getLessonExercises('lesson-01');
      for (const ex of exercises) {
        expect(ex.id).toBeTruthy();
        expect(ex.notes).toBeDefined();
        expect(ex.scoring).toBeDefined();
      }
    });
  });

  describe('getNextExerciseId', () => {
    it('should return next exercise in lesson', () => {
      expect(getNextExerciseId('lesson-01', 'lesson-01-ex-01')).toBe('lesson-01-ex-02');
      expect(getNextExerciseId('lesson-01', 'lesson-01-ex-02')).toBe('lesson-01-ex-03');
    });

    it('should return null for last exercise', () => {
      expect(getNextExerciseId('lesson-01', 'lesson-01-ex-03')).toBeNull();
    });

    it('should return null for non-existent exercise', () => {
      expect(getNextExerciseId('lesson-01', 'non-existent')).toBeNull();
    });

    it('should return null for non-existent lesson', () => {
      expect(getNextExerciseId('non-existent', 'lesson-01-ex-01')).toBeNull();
    });
  });

  describe('getLessonIdForExercise', () => {
    it('should find lesson for exercise', () => {
      expect(getLessonIdForExercise('lesson-01-ex-01')).toBe('lesson-01');
      expect(getLessonIdForExercise('lesson-01-ex-03')).toBe('lesson-01');
      expect(getLessonIdForExercise('lesson-02-ex-01')).toBe('lesson-02');
    });

    it('should return null for non-existent exercise', () => {
      expect(getLessonIdForExercise('non-existent')).toBeNull();
    });
  });

  describe('Lesson 1 content integrity', () => {
    it('should have 3 exercises that match lesson manifest', () => {
      const lesson = getLesson('lesson-01');
      const exercises = getLessonExercises('lesson-01');

      expect(lesson!.exercises.length).toBe(3);
      expect(exercises.length).toBe(3);

      // Every manifest entry should resolve to an actual exercise
      for (const entry of lesson!.exercises) {
        const ex = getExercise(entry.id);
        expect(ex).not.toBeNull();
        expect(ex!.id).toBe(entry.id);
      }
    });

    it('should have lesson-01 as first lesson with no unlock requirement', () => {
      const lesson = getLesson('lesson-01');
      expect(lesson!.unlockRequirement).toBeNull();
    });

    it('should have lesson-02 requiring lesson-01 completion', () => {
      const lesson = getLesson('lesson-02');
      expect(lesson!.unlockRequirement).toEqual({
        type: 'lesson-complete',
        lessonId: 'lesson-01',
      });
    });
  });
});

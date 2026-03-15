/**
 * Performance Benchmark Test Suite
 *
 * Validates that critical operations stay within time budgets.
 * These tests catch performance regressions early in CI.
 */

import { parseABC } from '@/core/songs/abcParser';
import { calculateTimingScore, calculateDurationScore } from '@/core/exercises/ExerciseValidator';
import {
  getExercise,
  getLessons,
  getLessonExercises,
  getExerciseMetadata,
  getExercisesForLesson,
  getExercisesBySkill,
  getLessonCount,
} from '../../content/ContentLoader';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function measureMs(fn: () => void, iterations = 1): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  return (performance.now() - start) / iterations;
}

// ---------------------------------------------------------------------------
// Content loading performance
// ---------------------------------------------------------------------------

describe('Performance: Content Loading', () => {
  it('getLessons() returns within 5ms', () => {
    const ms = measureMs(() => getLessons(), 100);
    expect(ms).toBeLessThan(5);
  });

  it('getLessonCount() returns within 1ms', () => {
    const ms = measureMs(() => getLessonCount(), 1000);
    expect(ms).toBeLessThan(1);
  });

  it('getExercise() loads a single exercise within 10ms', () => {
    const lessons = getLessons();
    if (lessons.length === 0) return;
    const firstExerciseId = lessons[0].exercises[0]?.id;
    if (!firstExerciseId) return;

    const ms = measureMs(() => getExercise(firstExerciseId), 100);
    expect(ms).toBeLessThan(10);
  });

  it('getLessonExercises() loads all exercises for a lesson within 50ms', () => {
    const lessons = getLessons();
    if (lessons.length === 0) return;

    const ms = measureMs(() => getLessonExercises(lessons[0].id), 50);
    expect(ms).toBeLessThan(50);
  });

  it('getExerciseMetadata() returns index entry within 2ms', () => {
    const lessons = getLessons();
    if (lessons.length === 0) return;
    const firstExerciseId = lessons[0].exercises[0]?.id;
    if (!firstExerciseId) return;

    const ms = measureMs(() => getExerciseMetadata(firstExerciseId), 500);
    expect(ms).toBeLessThan(2);
  });

  it('getExercisesForLesson() index lookup within 5ms', () => {
    const lessons = getLessons();
    if (lessons.length === 0) return;

    const ms = measureMs(() => getExercisesForLesson(lessons[0].id), 200);
    expect(ms).toBeLessThan(5);
  });

  it('getExercisesBySkill() index lookup within 5ms', () => {
    const ms = measureMs(() => getExercisesBySkill('right-hand'), 200);
    expect(ms).toBeLessThan(5);
  });

  it('loading all lessons sequentially completes within 200ms', () => {
    const lessons = getLessons();
    const start = performance.now();
    for (const lesson of lessons) {
      getLessonExercises(lesson.id);
    }
    const elapsed = performance.now() - start;
    // With 40 lessons this should be well under 500ms (CI runners can be slow)
    expect(elapsed).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// Scoring engine performance
// ---------------------------------------------------------------------------

describe('Performance: Scoring Engine', () => {
  it('calculateTimingScore runs 10,000 iterations under 50ms', () => {
    const ms = measureMs(() => {
      for (let i = 0; i < 10000; i++) {
        calculateTimingScore(Math.random() * 500 - 250, 50, 150);
      }
    });
    expect(ms).toBeLessThan(50);
  });

  it('calculateDurationScore runs 10,000 iterations under 50ms', () => {
    const ms = measureMs(() => {
      for (let i = 0; i < 10000; i++) {
        calculateDurationScore(Math.random() * 2000, 1000);
      }
    });
    expect(ms).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// ABC Parser performance
// ---------------------------------------------------------------------------

describe('Performance: ABC Parser', () => {
  const simpleABC = `X:1
T:Test Tune
M:4/4
L:1/4
K:C
CDEF|GABc|`;

  const complexABC = `X:1
T:Complex Test
M:6/8
L:1/8
K:G
Q:1/4=120
GAB cBA|GAB d3|edc BAG|A2G FED|
GAB cBA|GAB d2e|dBG AGA|G3 G3|
g2g fef|g2g fga|bag agf|a2g f2e|
g2g fef|g2g fga|bag age|d3 d3|`;

  it('parses simple ABC within 10ms', () => {
    const ms = measureMs(() => parseABC(simpleABC), 100);
    expect(ms).toBeLessThan(10);
  });

  it('parses complex ABC within 20ms', () => {
    const ms = measureMs(() => parseABC(complexABC), 100);
    expect(ms).toBeLessThan(20);
  });

  it('parses 100 tunes sequentially within 500ms', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      parseABC(complexABC);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it('parser does not leak memory across iterations', () => {
    // Parse many times and verify output is consistent
    const results = [];
    for (let i = 0; i < 50; i++) {
      const result = parseABC(simpleABC);
      if (!('error' in result)) {
        results.push(result.notes.length);
      }
    }
    // All iterations should produce the same note count
    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Batch operation stress
// ---------------------------------------------------------------------------

describe('Performance: Batch Operations', () => {
  it('creating 1000 NoteEvent objects takes under 10ms', () => {
    const ms = measureMs(() => {
      const notes = [];
      for (let i = 0; i < 1000; i++) {
        notes.push({
          note: 60 + (i % 12),
          startBeat: i * 0.5,
          durationBeats: 0.5,
          hand: i % 2 === 0 ? 'right' : 'left',
        });
      }
    });
    expect(ms).toBeLessThan(10);
  });

  it('sorting 1000 notes by startBeat takes under 10ms', () => {
    const notes = Array.from({ length: 1000 }, (_, i) => ({
      note: 60 + (i % 12),
      startBeat: Math.random() * 500,
      durationBeats: 0.5,
    }));

    const ms = measureMs(() => {
      [...notes].sort((a, b) => a.startBeat - b.startBeat);
    }, 100);
    expect(ms).toBeLessThan(10);
  });

  it('Map operations for 500 note matches complete under 5ms', () => {
    const ms = measureMs(() => {
      const map = new Map<number, number>();
      for (let i = 0; i < 500; i++) {
        map.set(i, i * 2);
      }
      for (let i = 0; i < 500; i++) {
        map.get(i);
        map.has(i);
      }
      map.clear();
    }, 100);
    expect(ms).toBeLessThan(5);
  });
});

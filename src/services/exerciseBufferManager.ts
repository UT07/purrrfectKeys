/**
 * Exercise Buffer Manager
 *
 * Manages a FIFO queue of pre-generated AI exercises stored in AsyncStorage.
 * After each exercise completion, the app checks the buffer and triggers
 * background generation if it's running low. This decouples AI generation
 * latency from the user experience.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AIExercise, GenerationParams } from './geminiExerciseService';
import { generateExercise } from './geminiExerciseService';

// ============================================================================
// Constants
// ============================================================================

/** Desired buffer size — fillBuffer will generate up to this many */
export const BUFFER_TARGET = 5;

/** Trigger a fill when the buffer drops below this threshold */
export const BUFFER_MIN_THRESHOLD = 3;

/** Hard cap — evict oldest exercises when exceeding this */
export const BUFFER_MAX_SIZE = 10;

const STORAGE_KEY = 'keysense_exercise_buffer';

// ============================================================================
// Internal Helpers
// ============================================================================

async function loadBuffer(): Promise<AIExercise[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    console.warn('[ExerciseBuffer] Failed to load buffer from storage');
    return [];
  }
}

async function saveBuffer(buffer: AIExercise[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get next exercise from buffer (FIFO — dequeue from front).
 * Returns null if the buffer is empty.
 */
export async function getNextExercise(): Promise<AIExercise | null> {
  try {
    const buffer = await loadBuffer();
    if (buffer.length === 0) {
      return null;
    }

    const exercise = buffer.shift()!;
    await saveBuffer(buffer);
    return exercise;
  } catch (error) {
    console.warn(
      '[ExerciseBuffer] Failed to get next exercise:',
      (error as Error)?.message ?? error
    );
    return null;
  }
}

/**
 * Add an exercise to the back of the buffer.
 * If the buffer exceeds BUFFER_MAX_SIZE, the oldest exercises are evicted.
 */
export async function addExercise(exercise: AIExercise): Promise<void> {
  try {
    const buffer = await loadBuffer();
    buffer.push(exercise);

    // Trim from front if we exceed the max
    while (buffer.length > BUFFER_MAX_SIZE) {
      buffer.shift();
    }

    await saveBuffer(buffer);
  } catch (error) {
    console.warn(
      '[ExerciseBuffer] Failed to add exercise:',
      (error as Error)?.message ?? error
    );
  }
}

/**
 * Get current buffer size.
 */
export async function getBufferSize(): Promise<number> {
  const buffer = await loadBuffer();
  return buffer.length;
}

/**
 * Fill buffer up to target size using AI generation.
 * Silently handles failures (null results from generateExercise).
 */
export async function fillBuffer(params: GenerationParams): Promise<void> {
  try {
    const buffer = await loadBuffer();
    let currentSize = buffer.length;

    while (currentSize < BUFFER_TARGET) {
      try {
        const exercise = await generateExercise(params);
        if (exercise) {
          buffer.push(exercise);
          currentSize++;
        } else {
          // Generation returned null — skip but keep trying
          currentSize++; // Prevent infinite loop
        }
      } catch {
        console.warn('[ExerciseBuffer] Single generation attempt failed, continuing');
        currentSize++; // Prevent infinite loop
      }
    }

    await saveBuffer(buffer);
  } catch (error) {
    console.warn(
      '[ExerciseBuffer] Failed to fill buffer:',
      (error as Error)?.message ?? error
    );
  }
}

/**
 * Clear entire buffer.
 */
export async function clearBuffer(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn(
      '[ExerciseBuffer] Failed to clear buffer:',
      (error as Error)?.message ?? error
    );
  }
}

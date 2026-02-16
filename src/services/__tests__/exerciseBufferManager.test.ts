/**
 * Tests for Exercise Buffer Manager
 */

// ============================================================================
// Mocks
// ============================================================================

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../geminiExerciseService', () => ({
  generateExercise: jest.fn(),
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateExercise } from '../geminiExerciseService';
import type { AIExercise } from '../geminiExerciseService';
import {
  getNextExercise,
  addExercise,
  getBufferSize,
  fillBuffer,
  clearBuffer,
  BUFFER_TARGET,
  BUFFER_MAX_SIZE,
} from '../exerciseBufferManager';

// ============================================================================
// Helpers
// ============================================================================

const makeExercise = (id: number): AIExercise => ({
  notes: [{ note: 60 + id, startBeat: 0, durationBeats: 1 }],
  settings: { tempo: 80, timeSignature: [4, 4] as [number, number], keySignature: 'C' },
});

const STORAGE_KEY = 'keysense_exercise_buffer';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;
const mockGenerateExercise = generateExercise as jest.Mock;

// ============================================================================
// Tests
// ============================================================================

describe('exerciseBufferManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);
  });

  // --------------------------------------------------------------------------
  // getNextExercise
  // --------------------------------------------------------------------------

  describe('getNextExercise', () => {
    it('returns null when buffer is empty', async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await getNextExercise();

      expect(result).toBeNull();
    });

    it('returns first exercise and removes it from buffer', async () => {
      const exercises = [makeExercise(1), makeExercise(2), makeExercise(3)];
      mockGetItem.mockResolvedValue(JSON.stringify(exercises));

      const result = await getNextExercise();

      expect(result).toEqual(makeExercise(1));
      expect(mockSetItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify([makeExercise(2), makeExercise(3)])
      );
    });
  });

  // --------------------------------------------------------------------------
  // addExercise
  // --------------------------------------------------------------------------

  describe('addExercise', () => {
    it('adds exercise to end of buffer', async () => {
      const existing = [makeExercise(1), makeExercise(2)];
      mockGetItem.mockResolvedValue(JSON.stringify(existing));
      const newExercise = makeExercise(3);

      await addExercise(newExercise);

      expect(mockSetItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify([makeExercise(1), makeExercise(2), makeExercise(3)])
      );
    });

    it('trims oldest when buffer exceeds max size', async () => {
      const exercises = Array.from({ length: BUFFER_MAX_SIZE }, (_, i) => makeExercise(i));
      mockGetItem.mockResolvedValue(JSON.stringify(exercises));

      await addExercise(makeExercise(99));

      const savedBuffer = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedBuffer).toHaveLength(BUFFER_MAX_SIZE);
      // First exercise (id 0) should be evicted, second exercise (id 1) is now first
      expect(savedBuffer[0]).toEqual(makeExercise(1));
      // Last exercise should be the newly added one
      expect(savedBuffer[savedBuffer.length - 1]).toEqual(makeExercise(99));
    });
  });

  // --------------------------------------------------------------------------
  // getBufferSize
  // --------------------------------------------------------------------------

  describe('getBufferSize', () => {
    it('returns current count', async () => {
      const exercises = [makeExercise(1), makeExercise(2), makeExercise(3), makeExercise(4)];
      mockGetItem.mockResolvedValue(JSON.stringify(exercises));

      const size = await getBufferSize();

      expect(size).toBe(4);
    });

    it('returns 0 for empty buffer', async () => {
      mockGetItem.mockResolvedValue(null);

      const size = await getBufferSize();

      expect(size).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // fillBuffer
  // --------------------------------------------------------------------------

  describe('fillBuffer', () => {
    const params = {
      weakNotes: [60],
      tempoRange: { min: 80, max: 120 },
      difficulty: 3,
      noteCount: 8,
      skills: {
        timingAccuracy: 0.7,
        pitchAccuracy: 0.8,
        sightReadSpeed: 0.6,
        chordRecognition: 0.5,
      },
    };

    it('generates exercises up to target', async () => {
      const existing = [makeExercise(0)];
      mockGetItem.mockResolvedValue(JSON.stringify(existing));

      // Need BUFFER_TARGET - 1 = 4 more exercises
      mockGenerateExercise
        .mockResolvedValueOnce(makeExercise(1))
        .mockResolvedValueOnce(makeExercise(2))
        .mockResolvedValueOnce(makeExercise(3))
        .mockResolvedValueOnce(makeExercise(4));

      await fillBuffer(params);

      expect(mockGenerateExercise).toHaveBeenCalledTimes(BUFFER_TARGET - 1);
      const savedBuffer = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedBuffer).toHaveLength(BUFFER_TARGET);
    });

    it('handles generation failures gracefully', async () => {
      const existing = [makeExercise(0)];
      mockGetItem.mockResolvedValue(JSON.stringify(existing));

      // Two nulls, then successes — nulls don't add to buffer but loop continues
      mockGenerateExercise
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeExercise(1))
        .mockResolvedValueOnce(makeExercise(2));

      await fillBuffer(params);

      // Called 4 times (BUFFER_TARGET - 1 iterations)
      expect(mockGenerateExercise).toHaveBeenCalledTimes(BUFFER_TARGET - 1);
      // Only successful ones get added: original + 2 successes = 3
      const savedBuffer = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedBuffer).toHaveLength(3);
    });

    it('does nothing when buffer is already at target', async () => {
      const exercises = Array.from({ length: BUFFER_TARGET }, (_, i) => makeExercise(i));
      mockGetItem.mockResolvedValue(JSON.stringify(exercises));

      await fillBuffer(params);

      expect(mockGenerateExercise).not.toHaveBeenCalled();
      // Buffer is saved as-is (no changes)
      const savedBuffer = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(savedBuffer).toHaveLength(BUFFER_TARGET);
    });
  });

  // --------------------------------------------------------------------------
  // clearBuffer
  // --------------------------------------------------------------------------

  describe('clearBuffer', () => {
    it('removes all exercises', async () => {
      await clearBuffer();

      expect(mockRemoveItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });
});

/**
 * Tests for Gemini AI Exercise Generation Service
 */

// ============================================================================
// Mocks
// ============================================================================

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  validateAIExercise,
  buildPrompt,
  generateExercise,
} from '../geminiExerciseService';
import type { GenerationParams, AIExercise } from '../geminiExerciseService';

// ============================================================================
// Helpers
// ============================================================================

function createValidExercise(overrides: Partial<AIExercise> = {}): AIExercise {
  return {
    notes: [
      { note: 60, startBeat: 0, durationBeats: 1, hand: 'right' },
      { note: 62, startBeat: 1, durationBeats: 1, hand: 'right' },
      { note: 64, startBeat: 2, durationBeats: 1, hand: 'right' },
      { note: 65, startBeat: 3, durationBeats: 1, hand: 'right' },
    ],
    settings: {
      tempo: 100,
      timeSignature: [4, 4],
      keySignature: 'C major',
    },
    metadata: {
      title: 'Test Exercise',
      difficulty: 2,
      skills: ['melody'],
    },
    scoring: {
      passingScore: 70,
      timingToleranceMs: 200,
      starThresholds: [70, 85, 95],
    },
    ...overrides,
  };
}

function createDefaultParams(): GenerationParams {
  return {
    weakNotes: [60, 64],
    tempoRange: { min: 80, max: 120 },
    difficulty: 3,
    noteCount: 12,
    skills: {
      timingAccuracy: 0.75,
      pitchAccuracy: 0.8,
      sightReadSpeed: 0.6,
      chordRecognition: 0.5,
    },
  };
}

function mockApiResponse(data: unknown): void {
  mockGenerateContent.mockResolvedValueOnce({
    response: { text: () => JSON.stringify(data) },
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('geminiExerciseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  });

  // --------------------------------------------------------------------------
  // validateAIExercise
  // --------------------------------------------------------------------------

  describe('validateAIExercise', () => {
    it('accepts valid exercise JSON', () => {
      const exercise = createValidExercise();
      expect(validateAIExercise(exercise)).toBe(true);
    });

    it('rejects notes outside playable range (below 36)', () => {
      const exercise = createValidExercise({
        notes: [
          { note: 35, startBeat: 0, durationBeats: 1 },
          { note: 60, startBeat: 1, durationBeats: 1 },
        ],
      });
      expect(validateAIExercise(exercise)).toBe(false);
    });

    it('rejects notes outside playable range (above 96)', () => {
      const exercise = createValidExercise({
        notes: [
          { note: 60, startBeat: 0, durationBeats: 1 },
          { note: 97, startBeat: 1, durationBeats: 1 },
        ],
      });
      expect(validateAIExercise(exercise)).toBe(false);
    });

    it('rejects impossible intervals at fast tempo (>120 BPM, >24 semitones)', () => {
      const exercise = createValidExercise({
        notes: [
          { note: 48, startBeat: 0, durationBeats: 1 },
          { note: 73, startBeat: 1, durationBeats: 1 }, // 25 semitone interval
        ],
        settings: {
          tempo: 140,
          timeSignature: [4, 4],
          keySignature: 'C major',
        },
      });
      expect(validateAIExercise(exercise)).toBe(false);
    });

    it('allows intervals up to 24 semitones at fast tempo', () => {
      const exercise = createValidExercise({
        notes: [
          { note: 48, startBeat: 0, durationBeats: 1 },
          { note: 72, startBeat: 1, durationBeats: 1 }, // exactly 24 semitones
        ],
        settings: {
          tempo: 140,
          timeSignature: [4, 4],
          keySignature: 'C major',
        },
      });
      expect(validateAIExercise(exercise)).toBe(true);
    });

    it('rejects intervals > 36 semitones at any tempo', () => {
      const exercise = createValidExercise({
        notes: [
          { note: 40, startBeat: 0, durationBeats: 1 },
          { note: 77, startBeat: 1, durationBeats: 1 }, // 37 semitone interval
        ],
        settings: {
          tempo: 60,
          timeSignature: [4, 4],
          keySignature: 'C major',
        },
      });
      expect(validateAIExercise(exercise)).toBe(false);
    });

    it('rejects empty notes array', () => {
      const exercise = createValidExercise({ notes: [] });
      expect(validateAIExercise(exercise)).toBe(false);
    });

    it('rejects missing settings', () => {
      const exercise = { notes: [{ note: 60, startBeat: 0, durationBeats: 1 }] };
      expect(validateAIExercise(exercise)).toBe(false);
    });

    it('accepts edge case with notes at boundaries (36 and 96)', () => {
      const exercise = createValidExercise({
        notes: [
          { note: 36, startBeat: 0, durationBeats: 1 },
          { note: 60, startBeat: 1, durationBeats: 1 },
          { note: 96, startBeat: 2, durationBeats: 1 },
        ],
        settings: {
          tempo: 60, // slow tempo allows the 36-semitone jump
          timeSignature: [4, 4],
          keySignature: 'C major',
        },
      });
      expect(validateAIExercise(exercise)).toBe(true);
    });

    it('rejects negative startBeat', () => {
      const exercise = createValidExercise({
        notes: [{ note: 60, startBeat: -1, durationBeats: 1 }],
      });
      expect(validateAIExercise(exercise)).toBe(false);
    });

    it('rejects zero durationBeats', () => {
      const exercise = createValidExercise({
        notes: [{ note: 60, startBeat: 0, durationBeats: 0 }],
      });
      expect(validateAIExercise(exercise)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // buildPrompt
  // --------------------------------------------------------------------------

  describe('buildPrompt', () => {
    it('includes weak notes in output', () => {
      const params = createDefaultParams();
      const prompt = buildPrompt(params);

      expect(prompt).toContain('[60,64]');
      expect(prompt).toContain('Weak notes');
    });

    it('calculates tempo from range and difficulty', () => {
      const params = createDefaultParams();
      // midTempo = (80 + 120) / 2 = 100
      // difficultyScale = 0.6 + (3/5) * 0.4 = 0.84
      // expected tempo = Math.round(100 * 0.84) = 84
      const prompt = buildPrompt(params);

      expect(prompt).toContain('Tempo: 84 BPM');
    });

    it('uses C major for difficulty 1', () => {
      const params = createDefaultParams();
      params.difficulty = 1;
      const prompt = buildPrompt(params);

      expect(prompt).toContain('Key signature: C major');
    });

    it('includes timing accuracy as percentage', () => {
      const params = createDefaultParams();
      const prompt = buildPrompt(params);

      expect(prompt).toContain('Timing accuracy: 75%');
    });

    it('injects GenerationHints promptHint into prompt', () => {
      const params = createDefaultParams();
      params.generationHints = {
        promptHint: 'Play C-D-E ascending with right hand',
        targetMidi: [60, 62, 64],
        hand: 'right',
        exerciseTypes: ['melody'],
        keySignature: 'C major',
        minDifficulty: 1,
      };

      const prompt = buildPrompt(params);

      expect(prompt).toContain('SKILL OBJECTIVE: Play C-D-E ascending with right hand');
      expect(prompt).toContain('Use ONLY these MIDI notes: [60,62,64]');
      expect(prompt).toContain('Hand: right');
      expect(prompt).toContain('Exercise style: melody');
    });

    it('uses GenerationHints keySignature over difficulty default', () => {
      const params = createDefaultParams();
      params.difficulty = 1; // would default to 'C major'
      params.generationHints = {
        promptHint: 'G major scale',
        keySignature: 'G major',
      };

      const prompt = buildPrompt(params);

      expect(prompt).toContain('Key signature: G major');
    });

    it('uses GenerationHints minDifficulty over params difficulty', () => {
      const params = createDefaultParams();
      params.difficulty = 5;
      params.generationHints = {
        promptHint: 'Simple exercise',
        minDifficulty: 2,
      };

      const prompt = buildPrompt(params);

      expect(prompt).toContain('Difficulty: 2/5');
    });

    it('omits targetMidi line when not provided in hints', () => {
      const params = createDefaultParams();
      params.generationHints = {
        promptHint: 'General exercise',
        hand: 'both',
      };

      const prompt = buildPrompt(params);

      expect(prompt).toContain('SKILL OBJECTIVE: General exercise');
      expect(prompt).not.toContain('Use ONLY these MIDI notes');
      expect(prompt).toContain('Hand: both');
    });
  });

  // --------------------------------------------------------------------------
  // generateExercise
  // --------------------------------------------------------------------------

  describe('generateExercise', () => {
    it('calls API and returns parsed exercise', async () => {
      const validExercise = createValidExercise();
      mockApiResponse(validExercise);

      const result = await generateExercise(createDefaultParams());

      expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-key');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(result).toEqual(validExercise);
    });

    it('returns null on API failure', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('API rate limit'));

      const result = await generateExercise(createDefaultParams());

      expect(result).toBeNull();
    });

    it('retries on validation failure then succeeds', async () => {
      const invalidExercise = { notes: [], settings: { tempo: 100 } };
      const validExercise = createValidExercise();

      mockApiResponse(invalidExercise);
      mockApiResponse(validExercise);

      const result = await generateExercise(createDefaultParams());

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toEqual(validExercise);

      // Verify the retry prompt includes the correction instruction
      const retryPrompt = mockGenerateContent.mock.calls[1][0] as string;
      expect(retryPrompt).toContain('Previous attempt was invalid');
    });

    it('returns null when both attempts fail validation', async () => {
      const invalid1 = { notes: [], settings: { tempo: 100 } };
      const invalid2 = { notes: [], settings: { tempo: 100 } };

      mockApiResponse(invalid1);
      mockApiResponse(invalid2);

      const result = await generateExercise(createDefaultParams());

      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(result).toBeNull();
    });

    it('returns null when API key is not set', async () => {
      process.env.EXPO_PUBLIC_GEMINI_API_KEY = '';

      const result = await generateExercise(createDefaultParams());

      expect(result).toBeNull();
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });
});

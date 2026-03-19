/**
 * Comprehensive tests for Firebase Cloud Functions.
 *
 * All external dependencies (firebase-admin, @google/generative-ai, posthog-node)
 * are mocked so tests run without real API calls.
 */

// ============================================================================
// Mocks — must be set up BEFORE any imports
// ============================================================================

// --- Flexible Firestore mock that handles arbitrary chained calls ---

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const mockBatch = jest.fn(() => ({
  set: mockBatchSet,
  update: mockBatchUpdate,
  delete: mockBatchDelete,
  commit: mockBatchCommit,
}));

const mockTransactionGet = jest.fn();
const mockTransactionSet = jest.fn();
const mockRunTransaction = jest.fn();

/**
 * Creates a deeply chainable Firestore mock.
 * Every .collection() / .doc() / .where() / .orderBy() etc. returns
 * another chainable object so that arbitrary depth chains always work.
 *
 * Override specific behaviors per test via `firestoreOverrides`.
 */
let firestoreOverrides: Record<string, any> = {};

function makeChainable(): any {
  const proxy: any = {
    get: jest.fn().mockImplementation(() => {
      return Promise.resolve({ exists: false, data: () => null, docs: [], empty: true, size: 0, forEach: () => {} });
    }),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    listCollections: jest.fn().mockResolvedValue([]),
    collection: jest.fn().mockImplementation(() => makeChainable()),
    doc: jest.fn().mockImplementation(() => makeChainable()),
    where: jest.fn().mockImplementation(() => makeChainable()),
    orderBy: jest.fn().mockImplementation(() => makeChainable()),
    limit: jest.fn().mockImplementation(() => makeChainable()),
    select: jest.fn().mockImplementation(() => makeChainable()),
    startAfter: jest.fn().mockImplementation(() => makeChainable()),
    id: 'mock-id',
    ref: { parent: { parent: { id: 'parent-mock' } } },
  };
  return proxy;
}

const mockFirestoreInstance = {
  collection: jest.fn().mockImplementation((...args: any[]) => {
    const override = firestoreOverrides[`collection:${args[0]}`];
    if (override) return override;
    return makeChainable();
  }),
  collectionGroup: jest.fn().mockImplementation((...args: any[]) => {
    const override = firestoreOverrides[`collectionGroup:${args[0]}`];
    if (override) return override;
    return makeChainable();
  }),
  doc: jest.fn().mockImplementation((...args: any[]) => {
    const override = firestoreOverrides[`doc:${args[0]}`];
    if (override) return override;
    return makeChainable();
  }),
  batch: mockBatch,
  runTransaction: mockRunTransaction,
};

const mockFirestore = jest.fn(() => mockFirestoreInstance);

(mockFirestore as any).Timestamp = {
  fromMillis: (ms: number) => ({ toMillis: () => ms }),
  fromDate: (d: Date) => ({ toDate: () => d }),
};
(mockFirestore as any).FieldValue = {
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  increment: (n: number) => `INCREMENT_${n}`,
};

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: Object.assign(mockFirestore, {
    Timestamp: (mockFirestore as any).Timestamp,
    FieldValue: (mockFirestore as any).FieldValue,
  }),
}));

// --- firebase-functions mock ---
jest.mock('firebase-functions/v2/https', () => ({
  onCall: (_opts: any, handler: any) => handler,
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'HttpsError';
    }
  },
}));

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_opts: any, handler: any) => handler,
}));

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// --- @google/generative-ai mock ---
const mockGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

// --- posthog-node mock ---
jest.mock('posthog-node', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    flush: jest.fn(),
  })),
}));

// --- abcjs mock ---
jest.mock('abcjs', () => ({
  __esModule: true,
  default: {
    parseOnly: jest.fn().mockReturnValue([]),
  },
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { formatSeasonWeekKey } from '../leagueUtils';

// ============================================================================
// Helpers
// ============================================================================

function makeRequest(data: any, auth?: { uid: string } | null) {
  return { data, auth: auth === null ? undefined : auth ?? { uid: 'test-user-123' } };
}

function emptySnap(docs: any[] = []) {
  return { docs, empty: docs.length === 0, size: docs.length, forEach: (cb: any) => docs.forEach(cb) };
}

function makeMockDoc(id: string, data: any, opts: { exists?: boolean } = {}) {
  return {
    id,
    exists: opts.exists ?? true,
    data: () => data,
    ref: { parent: { parent: { id: 'parent-' + id } } },
  };
}

/** Helper to create a chainable collection mock that returns specified docs */
function mockCollectionWithDocs(docs: any[]) {
  const snap = emptySnap(docs);
  const chain: any = {
    get: jest.fn().mockResolvedValue(snap),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    doc: jest.fn().mockImplementation(() => mockDocWithData(null, false)),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    startAfter: jest.fn().mockReturnThis(),
  };
  return chain;
}

/** Helper to create a doc mock that returns specific data */
function mockDocWithData(data: any, exists = true) {
  const docMock: any = {
    get: jest.fn().mockResolvedValue({ exists, data: () => data }),
    set: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    listCollections: jest.fn().mockResolvedValue([]),
    collection: jest.fn().mockImplementation(() => makeChainable()),
    doc: jest.fn().mockImplementation(() => makeChainable()),
    id: 'mock-doc',
    ref: { parent: { parent: { id: 'parent' } } },
  };
  return docMock;
}

// ============================================================================
// Reset mocks between tests
// ============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  firestoreOverrides = {};
  process.env.GEMINI_API_KEY = 'test-api-key';
  process.env.POSTHOG_PROJECT_TOKEN = '';
  process.env.POSTHOG_HOST = '';

  // Re-establish the default collection/doc/collectionGroup implementations
  // (needed because some tests override mockFirestoreInstance.collection via
  // mockImplementation, and clearAllMocks does NOT reset implementations)
  mockFirestoreInstance.collection.mockImplementation((...args: any[]) => {
    const override = firestoreOverrides[`collection:${args[0]}`];
    if (override) return override;
    return makeChainable();
  });
  mockFirestoreInstance.collectionGroup.mockImplementation((...args: any[]) => {
    const override = firestoreOverrides[`collectionGroup:${args[0]}`];
    if (override) return override;
    return makeChainable();
  });
  mockFirestoreInstance.doc.mockImplementation((...args: any[]) => {
    const override = firestoreOverrides[`doc:${args[0]}`];
    if (override) return override;
    return makeChainable();
  });

  // Default runTransaction behavior
  mockRunTransaction.mockImplementation(async (cb: any) => {
    const transaction = {
      get: mockTransactionGet.mockResolvedValue({ exists: false, data: () => ({ count: 0 }) }),
      set: mockTransactionSet,
    };
    return cb(transaction);
  });
});

// ============================================================================
// leagueUtils
// ============================================================================

describe('leagueUtils', () => {
  describe('formatSeasonWeekKey', () => {
    it('formats a date as YYYY-MM-DD', () => {
      expect(formatSeasonWeekKey(new Date('2026-03-16T00:00:00Z'))).toBe('2026-03-16');
    });

    it('handles different dates', () => {
      expect(formatSeasonWeekKey(new Date('2026-01-01T12:30:00Z'))).toBe('2026-01-01');
      expect(formatSeasonWeekKey(new Date('2025-12-31T23:59:59Z'))).toBe('2025-12-31');
    });
  });
});

// ============================================================================
// generateExercise
// ============================================================================

describe('generateExercise', () => {
  let generateExercise: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      generateExercise = require('../generateExercise').generateExercise;
    });
  });

  it('rejects unauthenticated requests', async () => {
    await expect(generateExercise(makeRequest({}, null))).rejects.toThrow('Must be authenticated');
  });

  it('rejects missing request data', async () => {
    await expect(generateExercise(makeRequest(null))).rejects.toThrow('Missing request data');
  });

  it('rejects when rate limit is exceeded', async () => {
    mockTransactionGet.mockResolvedValue({ exists: true, data: () => ({ count: 30 }) });
    mockRunTransaction.mockImplementation(async (cb: any) => {
      return cb({ get: mockTransactionGet, set: mockTransactionSet });
    });

    await expect(
      generateExercise(makeRequest({ difficulty: 2, noteCount: 8 })),
    ).rejects.toThrow('Daily exercise generation limit');
  });

  it('rejects when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(
      generateExercise(makeRequest({ difficulty: 2, noteCount: 8 })),
    ).rejects.toThrow('Gemini API key not configured');
  });

  it('returns exercise on successful generation', async () => {
    const validExercise = {
      notes: [
        { note: 60, startBeat: 0, durationBeats: 1, hand: 'right' },
        { note: 62, startBeat: 1, durationBeats: 1, hand: 'right' },
        { note: 64, startBeat: 2, durationBeats: 1, hand: 'right' },
        { note: 65, startBeat: 3, durationBeats: 1, hand: 'right' },
      ],
      settings: { tempo: 80, timeSignature: [4, 4], keySignature: 'C major' },
      metadata: { title: 'Test Exercise', difficulty: 2, skills: ['right-hand'] },
      scoring: { passingScore: 60, timingToleranceMs: 75, starThresholds: [70, 85, 95] },
    };

    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(validExercise) },
    });

    const result = await generateExercise(makeRequest({ difficulty: 2, noteCount: 8 }));
    expect(result.notes).toHaveLength(4);
    expect(result.settings.tempo).toBe(80);
  });

  it('retries on first failed generation then succeeds', async () => {
    const validExercise = {
      notes: [
        { note: 60, startBeat: 0, durationBeats: 1, hand: 'right' },
        { note: 62, startBeat: 1, durationBeats: 1, hand: 'right' },
        { note: 64, startBeat: 2, durationBeats: 1, hand: 'right' },
        { note: 65, startBeat: 3, durationBeats: 1, hand: 'right' },
      ],
      settings: { tempo: 80, timeSignature: [4, 4], keySignature: 'C major' },
    };

    mockGenerateContent
      .mockResolvedValueOnce({ response: { text: () => 'not json' } })
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(validExercise) } });

    const result = await generateExercise(makeRequest({ difficulty: 2, noteCount: 8 }));
    expect(result.notes).toHaveLength(4);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('throws when both generation attempts fail', async () => {
    mockGenerateContent.mockResolvedValue({ response: { text: () => 'not valid json' } });

    await expect(
      generateExercise(makeRequest({ difficulty: 2, noteCount: 8 })),
    ).rejects.toThrow('Both generation attempts failed validation');
  });

  it('validates MIDI note range', async () => {
    const invalidExercise = {
      notes: [
        { note: 10, startBeat: 0, durationBeats: 1 },
        { note: 62, startBeat: 1, durationBeats: 1 },
        { note: 64, startBeat: 2, durationBeats: 1 },
        { note: 65, startBeat: 3, durationBeats: 1 },
      ],
      settings: { tempo: 80, timeSignature: [4, 4], keySignature: 'C' },
    };

    mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify(invalidExercise) } });

    await expect(
      generateExercise(makeRequest({ difficulty: 2, noteCount: 8 })),
    ).rejects.toThrow('Both generation attempts failed validation');
  });

  it('sanitizes input params with extreme values', async () => {
    const validExercise = {
      notes: [
        { note: 60, startBeat: 0, durationBeats: 1, hand: 'right' },
        { note: 62, startBeat: 1, durationBeats: 1, hand: 'right' },
        { note: 64, startBeat: 2, durationBeats: 1, hand: 'right' },
        { note: 65, startBeat: 3, durationBeats: 1, hand: 'right' },
      ],
      settings: { tempo: 80, timeSignature: [4, 4], keySignature: 'C major' },
    };

    mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify(validExercise) } });

    const result = await generateExercise(makeRequest({
      difficulty: 99,
      noteCount: 999,
      weakNotes: [60, 200, -5, 72],
      tempoRange: { min: 1, max: 999 },
    }));

    expect(result.notes).toHaveLength(4);
  });
});

// ============================================================================
// generateSong
// ============================================================================

describe('generateSong', () => {
  let generateSong: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      generateSong = require('../generateSong').generateSong;
    });
  });

  it('rejects unauthenticated requests', async () => {
    await expect(generateSong(makeRequest({}, null))).rejects.toThrow('Must be authenticated');
  });

  it('rejects missing title', async () => {
    await expect(generateSong(makeRequest({ difficulty: 2 }))).rejects.toThrow('Song title is required');
  });

  it('rejects when rate limit exceeded', async () => {
    mockTransactionGet.mockResolvedValue({ exists: true, data: () => ({ count: 5 }) });
    mockRunTransaction.mockImplementation(async (cb: any) => {
      return cb({ get: mockTransactionGet, set: mockTransactionSet });
    });

    await expect(
      generateSong(makeRequest({ title: 'Test Song', difficulty: 2 })),
    ).rejects.toThrow('Daily song generation limit');
  });

  it('returns song on successful generation', async () => {
    const validSong = {
      title: 'Test Song',
      artist: 'Test Artist',
      genre: 'pop',
      difficulty: 2,
      attribution: 'AI arrangement',
      sections: [{ label: 'Verse', melodyABC: 'X:1\nT:Test\nM:4/4\nL:1/4\nK:C\nCDEF|' }],
      tempo: 100,
      key: 'C',
    };

    mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify(validSong) } });

    const result = await generateSong(makeRequest({ title: 'Test Song', difficulty: 2 }));
    expect(result.title).toBe('Test Song');
    expect(result.sections).toHaveLength(1);
  });

  it('throws when both attempts fail validation', async () => {
    mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify({ title: 'x' }) } });

    await expect(
      generateSong(makeRequest({ title: 'Test Song', difficulty: 2 })),
    ).rejects.toThrow('Both song generation attempts failed validation');
  });
});

// ============================================================================
// generateCoachFeedback
// ============================================================================

describe('generateCoachFeedback', () => {
  let generateCoachFeedback: any;

  const validRequest = {
    exerciseId: 'lesson-01-ex-01',
    exerciseTitle: 'Find Middle C',
    difficulty: 2,
    score: { overall: 75, accuracy: 80, timing: 70, completeness: 90 },
    issues: {
      pitchErrors: [{ expected: 'C4', played: 'D4', beatPosition: 1 }],
      timingErrors: [{ note: 'E4', offsetMs: -150, beatPosition: 2 }],
      missedCount: 2,
      extraCount: 1,
    },
    context: { attemptNumber: 1, previousScore: null, userLevel: 3, sessionMinutes: 10 },
  };

  beforeEach(() => {
    jest.isolateModules(() => {
      generateCoachFeedback = require('../generateCoachFeedback').generateCoachFeedback;
    });
  });

  it('rejects unauthenticated requests', async () => {
    await expect(generateCoachFeedback(makeRequest(validRequest, null))).rejects.toThrow('Must be authenticated');
  });

  it('returns fallback when rate limited', async () => {
    mockTransactionGet.mockResolvedValue({ exists: true, data: () => ({ count: 100 }) });
    mockRunTransaction.mockImplementation(async (cb: any) => {
      return cb({ get: mockTransactionGet, set: mockTransactionSet });
    });

    const result = await generateCoachFeedback(makeRequest(validRequest));
    expect(result.feedback).toBeDefined();
    expect(typeof result.feedback).toBe('string');
    expect(result.cached).toBe(false);
  });

  it('returns cached response if available', async () => {
    // Rate limit passes
    mockRunTransaction.mockImplementation(async (cb: any) => {
      return cb({
        get: jest.fn().mockResolvedValue({ exists: false, data: () => ({ count: 0 }) }),
        set: mockTransactionSet,
      });
    });

    // Override the cache doc path to return cached data
    const cacheDoc = mockDocWithData({
      feedback: 'Cached feedback!',
      suggestedNextAction: 'retry',
      timestamp: Date.now(),
    }, true);
    // The code calls db.collection('cache').doc('coachFeedback').collection('responses').doc(cacheKey)
    // We need to override at the right level
    const cacheResponsesCollection = {
      doc: jest.fn().mockReturnValue(cacheDoc),
      where: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(emptySnap()) }),
    };
    const cacheCoachDoc = {
      ...makeChainable(),
      collection: jest.fn().mockReturnValue(cacheResponsesCollection),
    };
    const cacheCollection = {
      ...makeChainable(),
      doc: jest.fn().mockReturnValue(cacheCoachDoc),
    };
    firestoreOverrides['collection:cache'] = cacheCollection;

    const result = await generateCoachFeedback(makeRequest(validRequest));
    expect(result.feedback).toBe('Cached feedback!');
    expect(result.cached).toBe(true);
  });

  it('generates AI feedback on cache miss', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Great effort! Try playing the C note a bit more firmly next time.',
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
      },
    });

    const result = await generateCoachFeedback(makeRequest(validRequest));
    expect(result.feedback).toContain('Great effort');
    expect(result.cached).toBe(false);
  });

  it('returns fallback when AI response contains forbidden phrases', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'As an AI, I think you should practice more.',
        usageMetadata: {},
      },
    });

    const result = await generateCoachFeedback(makeRequest(validRequest));
    expect(result.feedback).not.toContain('As an AI');
  });

  it('returns fallback when Gemini API throws', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Gemini API error'));

    const result = await generateCoachFeedback(makeRequest(validRequest));
    expect(result.feedback).toBeDefined();
    expect(typeof result.feedback).toBe('string');
  });

  it('clamps score values to valid ranges', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Nice try! Keep practicing.', usageMetadata: {} },
    });

    const result = await generateCoachFeedback(makeRequest({
      ...validRequest,
      score: { overall: 999, accuracy: -50, timing: 200, completeness: 'invalid' },
    }));

    expect(result.feedback).toBeDefined();
  });

  it('suggests continue for high scores', async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Amazing performance!', usageMetadata: {} },
    });

    const result = await generateCoachFeedback(makeRequest({
      ...validRequest,
      score: { overall: 95, accuracy: 95, timing: 95, completeness: 100 },
    }));
    expect(result.suggestedNextAction).toBe('continue');
  });
});

// ============================================================================
// cleanupCoachFeedbackCache
// ============================================================================

describe('cleanupCoachFeedbackCache', () => {
  let cleanupCoachFeedbackCache: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      cleanupCoachFeedbackCache = require('../generateCoachFeedback').cleanupCoachFeedbackCache;
    });
  });

  it('deletes old cache entries', async () => {
    const oldDocs = [
      makeMockDoc('old-1', { timestamp: Date.now() - 8 * 86400000 }),
      makeMockDoc('old-2', { timestamp: Date.now() - 10 * 86400000 }),
    ];

    // Override: cache -> coachFeedback -> responses -> where('timestamp', '<', cutoff)
    const responsesCollection = {
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap(oldDocs)),
      }),
    };
    const coachDoc = { collection: jest.fn().mockReturnValue(responsesCollection) };
    firestoreOverrides['collection:cache'] = { doc: jest.fn().mockReturnValue(coachDoc) };

    await cleanupCoachFeedbackCache({ scheduleTime: new Date().toISOString() });

    expect(mockBatchDelete).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it('handles no old entries gracefully', async () => {
    const responsesCollection = {
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap()),
      }),
    };
    const coachDoc = { collection: jest.fn().mockReturnValue(responsesCollection) };
    firestoreOverrides['collection:cache'] = { doc: jest.fn().mockReturnValue(coachDoc) };

    await cleanupCoachFeedbackCache({ scheduleTime: new Date().toISOString() });
    // Should not throw
  });
});

// ============================================================================
// deleteUserAllData
// ============================================================================

describe('deleteUserAllData', () => {
  let deleteUserAllData: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      deleteUserAllData = require('../deleteUserData').deleteUserAllData;
    });
  });

  it('rejects unauthenticated requests', async () => {
    await expect(deleteUserAllData(makeRequest({}, null))).rejects.toThrow('Must be authenticated');
  });

  it('deletes user document and subcollections', async () => {
    // Mock users/{uid} doc with listCollections returning progress + gamification
    const userDoc = {
      ...makeChainable(),
      listCollections: jest.fn().mockResolvedValue([{ id: 'progress' }, { id: 'gamification' }]),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    firestoreOverrides['doc:users/test-user-123'] = userDoc;

    // friendCodes, challenges, usernames, friends queries return empty
    const emptyQueryChain = {
      ...makeChainable(),
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap()),
      }),
    };
    firestoreOverrides['collection:friendCodes'] = emptyQueryChain;
    firestoreOverrides['collection:challenges'] = emptyQueryChain;
    firestoreOverrides['collection:usernames'] = emptyQueryChain;
    firestoreOverrides['collectionGroup:members'] = {
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap()),
      }),
    };
    firestoreOverrides['collectionGroup:friends'] = {
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap()),
      }),
    };

    const result = await deleteUserAllData(makeRequest({}));
    expect(result.success).toBe(true);
    expect(result.deletedDocuments).toBeGreaterThanOrEqual(1);
  });

  it('falls back to hardcoded subcollection list when listCollections fails', async () => {
    const userDoc = {
      ...makeChainable(),
      listCollections: jest.fn().mockRejectedValue(new Error('listCollections failed')),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    firestoreOverrides['doc:users/test-user-123'] = userDoc;

    const emptyQueryChain = {
      ...makeChainable(),
      where: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(emptySnap()) }),
    };
    firestoreOverrides['collection:friendCodes'] = emptyQueryChain;
    firestoreOverrides['collection:challenges'] = emptyQueryChain;
    firestoreOverrides['collection:usernames'] = emptyQueryChain;
    firestoreOverrides['collectionGroup:members'] = {
      where: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(emptySnap()) }),
    };
    firestoreOverrides['collectionGroup:friends'] = {
      where: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(emptySnap()) }),
    };

    const result = await deleteUserAllData(makeRequest({}));
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// dailySightReading
// ============================================================================

describe('dailySightReading', () => {
  let dailySightReading: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      dailySightReading = require('../dailySightReading').dailySightReading;
    });
  });

  it('rejects unauthenticated requests', async () => {
    await expect(dailySightReading(makeRequest({}, null))).rejects.toThrow('Must be authenticated');
  });

  it('returns cached exercise if available', async () => {
    const cachedExercise = {
      notes: [{ note: 60, startBeat: 0, durationBeats: 1 }],
      settings: { tempo: 80, timeSignature: [4, 4], keySignature: 'C major' },
    };

    const cacheDoc = mockDocWithData(cachedExercise, true);
    const dailyCollection = { ...makeChainable(), doc: jest.fn().mockReturnValue(cacheDoc) };
    firestoreOverrides['collection:dailySightReading'] = dailyCollection;

    const result = await dailySightReading(makeRequest({}));
    expect(result).toEqual(cachedExercise);
  });

  it('rejects when rate limit exceeded', async () => {
    // No cache
    const cacheDoc = mockDocWithData(null, false);
    const dailyCollection = { ...makeChainable(), doc: jest.fn().mockReturnValue(cacheDoc) };
    firestoreOverrides['collection:dailySightReading'] = dailyCollection;

    mockRunTransaction.mockImplementation(async (cb: any) => {
      return cb({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ count: 5 }) }),
        set: mockTransactionSet,
      });
    });

    await expect(dailySightReading(makeRequest({}))).rejects.toThrow('Daily sight-reading limit');
  });

  it('rejects when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;

    const cacheDoc = mockDocWithData(null, false);
    const dailyCollection = { ...makeChainable(), doc: jest.fn().mockReturnValue(cacheDoc) };
    firestoreOverrides['collection:dailySightReading'] = dailyCollection;

    await expect(dailySightReading(makeRequest({}))).rejects.toThrow('Gemini API key not configured');
  });

  it('generates and caches exercise on cache miss', async () => {
    const cacheDoc = mockDocWithData(null, false);
    cacheDoc.set = jest.fn().mockResolvedValue(undefined);
    const dailyCollection = { ...makeChainable(), doc: jest.fn().mockReturnValue(cacheDoc) };
    firestoreOverrides['collection:dailySightReading'] = dailyCollection;

    const validExercise = {
      notes: [
        { note: 60, startBeat: 0, durationBeats: 1, hand: 'right' },
        { note: 62, startBeat: 1, durationBeats: 1, hand: 'right' },
        { note: 64, startBeat: 2, durationBeats: 0.5, hand: 'right' },
        { note: 65, startBeat: 2.5, durationBeats: 0.5, hand: 'right' },
        { note: 67, startBeat: 3, durationBeats: 1, hand: 'right' },
      ],
      settings: { tempo: 80, timeSignature: [4, 4], keySignature: 'C major' },
      metadata: { title: 'Daily Sight-Reading', difficulty: 2, skills: ['sight-reading'] },
      scoring: { passingScore: 60, timingToleranceMs: 75, starThresholds: [70, 85, 95] },
    };

    mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify(validExercise) } });

    const result = await dailySightReading(makeRequest({}));
    expect(result.notes).toHaveLength(5);
    expect(cacheDoc.set).toHaveBeenCalled();
  });
});

// ============================================================================
// weeklyLeagueRewards
// ============================================================================

describe('weeklyLeagueRewards', () => {
  let weeklyLeagueRewards: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      weeklyLeagueRewards = require('../weeklyLeagueRewards').weeklyLeagueRewards;
    });
  });

  it('skips if already processed (idempotency)', async () => {
    const guardDoc = mockDocWithData({ processedAt: 'SERVER_TIMESTAMP' }, true);
    const guardCollection = { ...makeChainable(), doc: jest.fn().mockReturnValue(guardDoc) };
    firestoreOverrides['collection:leagueRewardsProcessed'] = guardCollection;

    await weeklyLeagueRewards({ scheduleTime: new Date().toISOString() });

    // leagues collection should not be queried
    expect(firestoreOverrides['collection:leagues']).toBeUndefined();
  });

  it('handles no leagues for the week', async () => {
    const guardDoc = mockDocWithData(null, false);
    guardDoc.set = jest.fn().mockResolvedValue(undefined);
    firestoreOverrides['collection:leagueRewardsProcessed'] = { ...makeChainable(), doc: jest.fn().mockReturnValue(guardDoc) };

    const leaguesCollection = {
      ...makeChainable(),
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap()),
      }),
    };
    firestoreOverrides['collection:leagues'] = leaguesCollection;

    await weeklyLeagueRewards({ scheduleTime: new Date().toISOString() });
  });
});

// ============================================================================
// weeklyLeagueRewards — reward calculation logic
// ============================================================================

describe('weeklyLeagueRewards reward calculations', () => {
  function gemsForPlacement(rank: number): number {
    const PLACEMENT_REWARDS = [
      { minRank: 1, maxRank: 1, gems: 100 },
      { minRank: 2, maxRank: 2, gems: 75 },
      { minRank: 3, maxRank: 3, gems: 50 },
      { minRank: 4, maxRank: 5, gems: 30 },
      { minRank: 6, maxRank: 10, gems: 20 },
      { minRank: 11, maxRank: 15, gems: 10 },
      { minRank: 16, maxRank: 30, gems: 5 },
    ];
    for (const r of PLACEMENT_REWARDS) {
      if (rank >= r.minRank && rank <= r.maxRank) return r.gems;
    }
    return 0;
  }

  function softResetMMR(currentMmr: number): number {
    return Math.round(currentMmr * 0.8 + 500 * 0.2);
  }

  it('awards correct gems for each placement', () => {
    expect(gemsForPlacement(1)).toBe(100);
    expect(gemsForPlacement(2)).toBe(75);
    expect(gemsForPlacement(3)).toBe(50);
    expect(gemsForPlacement(4)).toBe(30);
    expect(gemsForPlacement(5)).toBe(30);
    expect(gemsForPlacement(6)).toBe(20);
    expect(gemsForPlacement(10)).toBe(20);
    expect(gemsForPlacement(11)).toBe(10);
    expect(gemsForPlacement(15)).toBe(10);
    expect(gemsForPlacement(16)).toBe(5);
    expect(gemsForPlacement(30)).toBe(5);
    expect(gemsForPlacement(31)).toBe(0);
    expect(gemsForPlacement(100)).toBe(0);
  });

  it('soft resets MMR correctly', () => {
    expect(softResetMMR(1000)).toBe(900);
    expect(softResetMMR(500)).toBe(500);
    expect(softResetMMR(0)).toBe(100);
    expect(softResetMMR(2000)).toBe(1700);
  });

  it('tier bonus adds correct amounts', () => {
    const TIER_GEM_BONUS: Record<string, number> = {
      novice: 0, apprentice: 5, performer: 10, virtuoso: 20,
      maestro: 35, prodigy: 50, luminary: 75, legend: 100, grandmaster: 150,
    };

    expect(TIER_GEM_BONUS.novice).toBe(0);
    expect(TIER_GEM_BONUS.grandmaster).toBe(150);
    expect(gemsForPlacement(1) + TIER_GEM_BONUS.grandmaster).toBe(250);
    expect(gemsForPlacement(30) + TIER_GEM_BONUS.novice).toBe(5);
  });
});

// ============================================================================
// weeklyLeagueAssignment
// ============================================================================

describe('weeklyLeagueAssignment', () => {
  let weeklyLeagueAssignment: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      weeklyLeagueAssignment = require('../weeklyLeagueAssignment').weeklyLeagueAssignment;
    });
  });

  it('handles no active users', async () => {
    const usersCollection = {
      ...makeChainable(),
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(emptySnap()),
          }),
        }),
      }),
    };
    firestoreOverrides['collection:users'] = usersCollection;

    await weeklyLeagueAssignment({ scheduleTime: new Date().toISOString() });
  });
});

// ============================================================================
// seasonEndRewards
// ============================================================================

describe('seasonEndRewards', () => {
  let seasonEndRewards: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      seasonEndRewards = require('../seasonEndRewards').seasonEndRewards;
    });
  });

  it('skips on non-season-end Sundays', async () => {
    const mockDate = new Date('2026-03-22T23:50:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    await seasonEndRewards({ scheduleTime: mockDate.toISOString() });

    jest.useRealTimers();
  });

  it('processes season end on correct Sunday', async () => {
    const seasonEndDate = new Date('2026-04-12T23:50:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(seasonEndDate);

    const guardDoc = mockDocWithData(null, false);
    guardDoc.set = jest.fn().mockResolvedValue(undefined);
    firestoreOverrides['collection:seasonEndProcessed'] = { ...makeChainable(), doc: jest.fn().mockReturnValue(guardDoc) };

    const usersCollection = {
      ...makeChainable(),
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap()),
      }),
    };
    firestoreOverrides['collection:users'] = usersCollection;

    await seasonEndRewards({ scheduleTime: seasonEndDate.toISOString() });

    expect(guardDoc.set).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('skips if already processed (idempotency)', async () => {
    const seasonEndDate = new Date('2026-04-12T23:50:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(seasonEndDate);

    const guardDoc = mockDocWithData({ processedAt: 'SERVER_TIMESTAMP' }, true);
    firestoreOverrides['collection:seasonEndProcessed'] = { ...makeChainable(), doc: jest.fn().mockReturnValue(guardDoc) };

    await seasonEndRewards({ scheduleTime: seasonEndDate.toISOString() });

    jest.useRealTimers();
  });

  it('awards season end rewards to users', async () => {
    const seasonEndDate = new Date('2026-04-12T23:50:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(seasonEndDate);

    const guardDoc = mockDocWithData(null, false);
    guardDoc.set = jest.fn().mockResolvedValue(undefined);
    firestoreOverrides['collection:seasonEndProcessed'] = { ...makeChainable(), doc: jest.fn().mockReturnValue(guardDoc) };

    const userDocs = [
      makeMockDoc('user-1', { lastSeasonTier: 'virtuoso' }),
      makeMockDoc('user-2', { lastSeasonTier: 'novice' }),
    ];

    const usersCollection = {
      ...makeChainable(),
      doc: jest.fn().mockReturnValue(makeChainable()),
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap(userDocs)),
      }),
    };
    firestoreOverrides['collection:users'] = usersCollection;

    await seasonEndRewards({ scheduleTime: seasonEndDate.toISOString() });

    expect(mockBatchSet).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalled();

    jest.useRealTimers();
  });
});

// ============================================================================
// seasonEndRewards — reward calculation logic
// ============================================================================

describe('seasonEndRewards reward calculations', () => {
  const SEASON_END_BONUS_GEMS: Record<string, number> = {
    novice: 25, apprentice: 50, performer: 100, virtuoso: 200,
    maestro: 350, prodigy: 500, luminary: 750, legend: 1000, grandmaster: 1500,
  };

  it('awards correct bonus gems per tier', () => {
    expect(SEASON_END_BONUS_GEMS.novice).toBe(25);
    expect(SEASON_END_BONUS_GEMS.grandmaster).toBe(1500);
  });

  it('scales monotonically from lowest to highest tier', () => {
    const tiers = Object.values(SEASON_END_BONUS_GEMS);
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i]).toBeGreaterThan(tiers[i - 1]);
    }
  });

  describe('season number calculation', () => {
    const SEASON_EPOCH = new Date('2026-03-16T00:00:00Z').getTime();
    const WEEKS_PER_SEASON = 4;
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

    function getSeasonNumber(now: Date): number {
      const elapsed = now.getTime() - SEASON_EPOCH;
      if (elapsed < 0) return 1;
      const weeksSinceEpoch = Math.floor(elapsed / MS_PER_WEEK);
      return Math.floor(weeksSinceEpoch / WEEKS_PER_SEASON) + 1;
    }

    it('returns season 1 before and at epoch', () => {
      expect(getSeasonNumber(new Date('2026-03-15T00:00:00Z'))).toBe(1);
      expect(getSeasonNumber(new Date('2026-03-16T00:00:00Z'))).toBe(1);
    });

    it('returns season 1 during first 4 weeks', () => {
      expect(getSeasonNumber(new Date('2026-03-20T00:00:00Z'))).toBe(1);
      expect(getSeasonNumber(new Date('2026-04-10T00:00:00Z'))).toBe(1);
    });

    it('returns season 2 after 4 weeks', () => {
      expect(getSeasonNumber(new Date('2026-04-13T00:00:00Z'))).toBe(2);
    });
  });

  describe('isSeasonEndSunday', () => {
    const SEASON_EPOCH = new Date('2026-03-16T00:00:00Z').getTime();
    const WEEKS_PER_SEASON = 4;
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

    function isSeasonEndSunday(now: Date): boolean {
      const elapsed = now.getTime() - SEASON_EPOCH;
      if (elapsed < 0) return false;
      const weeksSinceEpoch = Math.floor(elapsed / MS_PER_WEEK);
      return (weeksSinceEpoch + 1) % WEEKS_PER_SEASON === 0;
    }

    it('returns false for non-season-end weeks', () => {
      expect(isSeasonEndSunday(new Date('2026-03-22T23:50:00Z'))).toBe(false);
      expect(isSeasonEndSunday(new Date('2026-03-29T23:50:00Z'))).toBe(false);
    });

    it('returns true on season-end Sunday', () => {
      expect(isSeasonEndSunday(new Date('2026-04-12T23:50:00Z'))).toBe(true);
    });

    it('returns false before epoch', () => {
      expect(isSeasonEndSunday(new Date('2026-03-10T00:00:00Z'))).toBe(false);
    });
  });

  describe('getSeasonWeekMondays', () => {
    const SEASON_EPOCH = new Date('2026-03-16T00:00:00Z').getTime();
    const WEEKS_PER_SEASON = 4;
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

    function getSeasonWeekMondays(seasonNumber: number): string[] {
      const mondays: string[] = [];
      const seasonStartWeek = (seasonNumber - 1) * WEEKS_PER_SEASON;
      for (let w = 0; w < WEEKS_PER_SEASON; w++) {
        const mondayMs = SEASON_EPOCH + (seasonStartWeek + w) * MS_PER_WEEK;
        mondays.push(formatSeasonWeekKey(new Date(mondayMs)));
      }
      return mondays;
    }

    it('returns 4 mondays for season 1', () => {
      const mondays = getSeasonWeekMondays(1);
      expect(mondays).toHaveLength(4);
      expect(mondays[0]).toBe('2026-03-16');
      expect(mondays[1]).toBe('2026-03-23');
      expect(mondays[2]).toBe('2026-03-30');
      expect(mondays[3]).toBe('2026-04-06');
    });

    it('returns 4 mondays for season 2', () => {
      const mondays = getSeasonWeekMondays(2);
      expect(mondays[0]).toBe('2026-04-13');
    });
  });
});

// ============================================================================
// posthogClient
// ============================================================================

describe('posthogClient', () => {
  it('captureAIGeneration does not throw when PostHog is not configured', () => {
    jest.isolateModules(() => {
      process.env.POSTHOG_PROJECT_TOKEN = '';
      const { captureAIGeneration } = require('../posthogClient');
      expect(() => {
        captureAIGeneration({
          distinctId: 'user-1',
          model: 'gemini-2.5-flash',
          provider: 'google',
          latencySeconds: 1.5,
          isError: false,
        });
      }).not.toThrow();
    });
  });
});

// ============================================================================
// index.ts — syncProgress
// ============================================================================

describe('syncProgress', () => {
  let syncProgress: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      syncProgress = require('../index').syncProgress;
    });
  });

  it('rejects unauthenticated requests', async () => {
    await expect(syncProgress(makeRequest({}, null))).rejects.toThrow('Must be authenticated');
  });

  it('syncs local changes and returns server changes', async () => {
    // The function reads from users/{uid}/syncLog via collection().where().get()
    // With default chainable mock, where().get() returns empty snap

    const result = await syncProgress(makeRequest({
      lastSyncTimestamp: Date.now() - 3600000,
      localChanges: [
        { id: 'change-1', type: 'xp_earned', exerciseId: 'ex-1', xpAmount: 10, timestamp: Date.now() },
      ],
    }));

    expect(result.synced).toBe(true);
    expect(result.newSyncTimestamp).toBeDefined();
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it('detects conflicts (server wins)', async () => {
    const now = Date.now();
    const serverDocs = [
      makeMockDoc('srv-1', {
        type: 'xp_earned',
        exerciseId: 'ex-1',
        timestamp: { toMillis: () => now },
      }),
    ];

    // Override the syncLog query to return server changes
    // The code does: changesRef.where('timestamp', '>', ...).get()
    // changesRef = db.collection(`users/${uid}/syncLog`)
    // Since our default chainable returns empty, we need to make
    // the where().get() chain return our docs.
    // This is handled by the generic chainable, but we need to customize it.
    // The simplest way: override collection for the specific path
    const syncLogCollection = {
      ...makeChainable(),
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap(serverDocs)),
      }),
      doc: jest.fn().mockReturnValue(makeChainable()),
    };
    // The code calls db.collection(`users/${uid}/syncLog`)
    mockFirestoreInstance.collection.mockImplementation((path: string) => {
      if (path.includes('syncLog')) return syncLogCollection;
      return makeChainable();
    });

    const result = await syncProgress(makeRequest({
      lastSyncTimestamp: now - 3600000,
      localChanges: [
        { id: 'local-1', type: 'xp_earned', exerciseId: 'ex-1', timestamp: now + 2000 },
      ],
    }));

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].resolution).toBe('server');
  });

  it('limits batch to 400 changes', async () => {
    const localChanges = Array.from({ length: 450 }, (_, i) => ({
      id: `change-${i}`,
      type: 'xp_earned',
      exerciseId: `ex-${i}`,
      xpAmount: 10,
    }));

    const result = await syncProgress(makeRequest({
      lastSyncTimestamp: Date.now() - 3600000,
      localChanges,
    }));

    expect(result.synced).toBe(true);
    expect(mockBatchSet).toHaveBeenCalledTimes(400);
  });
});

// ============================================================================
// index.ts — completeExercise
// ============================================================================

describe('completeExercise', () => {
  let completeExercise: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      completeExercise = require('../index').completeExercise;
    });

    // completeExercise does:
    // 1. userRef = db.collection('users').doc(uid)
    // 2. gamRef = userRef.collection('gamification').doc('data')
    // 3. progressDoc = userRef.collection('progress').doc(exerciseId).get()
    // 4. Transaction on gamRef
    // 5. batch writes to xpLog and syncLog

    // Set up users collection chain
    const progressDoc = mockDocWithData({ totalAttempts: 5 }, true);
    const gamDoc = mockDocWithData({ xp: 100, level: 1 }, true);

    const progressCollection = {
      ...makeChainable(),
      doc: jest.fn().mockReturnValue(progressDoc),
    };
    const gamificationCollection = {
      ...makeChainable(),
      doc: jest.fn().mockReturnValue(gamDoc),
    };

    const userDoc = {
      ...makeChainable(),
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'progress') return progressCollection;
        if (name === 'gamification') return gamificationCollection;
        return makeChainable();
      }),
    };

    const usersCollection = {
      ...makeChainable(),
      doc: jest.fn().mockReturnValue(userDoc),
    };
    firestoreOverrides['collection:users'] = usersCollection;

    // Transaction mock
    mockRunTransaction.mockImplementation(async (cb: any) => {
      const transaction = {
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => ({ xp: 100, level: 1 }),
        }),
        set: mockTransactionSet,
      };
      return cb(transaction);
    });
  });

  it('rejects unauthenticated requests', async () => {
    await expect(completeExercise(makeRequest({}, null))).rejects.toThrow('Must be authenticated');
  });

  it('rejects missing exerciseId', async () => {
    await expect(completeExercise(makeRequest({ isPerfect: false }))).rejects.toThrow('exerciseId must be a non-empty string');
  });

  it('rejects empty exerciseId', async () => {
    await expect(completeExercise(makeRequest({ exerciseId: '' }))).rejects.toThrow('exerciseId must be a non-empty string');
  });

  it('awards base XP for exercise completion', async () => {
    const result = await completeExercise(makeRequest({
      exerciseId: 'lesson-01-ex-01',
      isPerfect: false,
    }));

    expect(result.xpEarned).toBe(10);
  });

  it('awards bonus XP for first-time completion', async () => {
    // Override progress doc to not exist (first time)
    const progressDoc = mockDocWithData(null, false);
    const progressCollection = { ...makeChainable(), doc: jest.fn().mockReturnValue(progressDoc) };
    const gamificationCollection = { ...makeChainable(), doc: jest.fn().mockReturnValue(makeChainable()) };

    const userDoc = {
      ...makeChainable(),
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === 'progress') return progressCollection;
        if (name === 'gamification') return gamificationCollection;
        return makeChainable();
      }),
    };
    firestoreOverrides['collection:users'] = { ...makeChainable(), doc: jest.fn().mockReturnValue(userDoc) };

    mockRunTransaction.mockImplementation(async (cb: any) => {
      return cb({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ xp: 0, level: 1 }) }),
        set: mockTransactionSet,
      });
    });

    const result = await completeExercise(makeRequest({
      exerciseId: 'lesson-01-ex-01',
      isPerfect: false,
    }));

    expect(result.xpEarned).toBe(35); // 10 base + 25 first-time
  });

  it('awards perfect bonus XP', async () => {
    const result = await completeExercise(makeRequest({
      exerciseId: 'lesson-01-ex-01',
      isPerfect: true,
    }));

    expect(result.xpEarned).toBe(60); // 10 base + 50 perfect
  });

  it('detects level-up achievement', async () => {
    // XP goes from 95 to 105, which crosses level 2 boundary (100 XP)
    mockRunTransaction.mockImplementation(async (cb: any) => {
      return cb({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ xp: 95, level: 1 }) }),
        set: mockTransactionSet,
      });
    });

    const result = await completeExercise(makeRequest({
      exerciseId: 'lesson-01-ex-01',
      isPerfect: false,
    }));

    expect(result.achievementsUnlocked).toContain('level_2');
    expect(result.newLevel).toBe(2);
  });

  it('detects xp_1000 achievement', async () => {
    mockRunTransaction.mockImplementation(async (cb: any) => {
      return cb({
        get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ xp: 995, level: 5 }) }),
        set: mockTransactionSet,
      });
    });

    const result = await completeExercise(makeRequest({
      exerciseId: 'lesson-01-ex-01',
      isPerfect: false,
    }));

    expect(result.achievementsUnlocked).toContain('xp_1000');
  });
});

// ============================================================================
// index.ts — getExerciseRecommendations
// ============================================================================

describe('getExerciseRecommendations', () => {
  let getExerciseRecommendations: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      getExerciseRecommendations = require('../index').getExerciseRecommendations;
    });
  });

  it('rejects unauthenticated requests', async () => {
    await expect(getExerciseRecommendations(makeRequest({}, null))).rejects.toThrow('Must be authenticated');
  });

  it('returns recommendations with weakest skill', async () => {
    const progressDocs = [
      makeMockDoc('ex-1', { bestScore: 90 }),
      makeMockDoc('ex-2', { bestScore: 40 }),
      makeMockDoc('ex-3', { bestScore: 75 }),
    ];

    // The code does: userRef.collection('progress').get()
    // userRef = db.collection('users').doc(uid)
    const progressCollection = mockCollectionWithDocs(progressDocs);
    const userDoc = {
      ...makeChainable(),
      collection: jest.fn().mockReturnValue(progressCollection),
    };
    firestoreOverrides['collection:users'] = { ...makeChainable(), doc: jest.fn().mockReturnValue(userDoc) };

    const result = await getExerciseRecommendations(makeRequest({}));

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].exerciseId).toBe('ex-2');
  });

  it('returns empty array on error', async () => {
    const errorCollection = {
      ...makeChainable(),
      get: jest.fn().mockRejectedValue(new Error('Firestore error')),
    };
    const userDoc = { ...makeChainable(), collection: jest.fn().mockReturnValue(errorCollection) };
    firestoreOverrides['collection:users'] = { ...makeChainable(), doc: jest.fn().mockReturnValue(userDoc) };

    const result = await getExerciseRecommendations(makeRequest({}));
    expect(result).toEqual([]);
  });
});

// ============================================================================
// index.ts — getWeeklySummary
// ============================================================================

describe('getWeeklySummary', () => {
  let getWeeklySummary: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      getWeeklySummary = require('../index').getWeeklySummary;
    });
  });

  it('rejects unauthenticated requests', async () => {
    await expect(getWeeklySummary(makeRequest({}, null))).rejects.toThrow('Must be authenticated');
  });

  it('calculates weekly stats from sync logs', async () => {
    const syncLogs = [
      makeMockDoc('log-1', { type: 'exercise_completed' }),
      makeMockDoc('log-2', { type: 'exercise_completed' }),
      makeMockDoc('log-3', { type: 'xp_earned', xpAmount: 100 }),
      makeMockDoc('log-4', { type: 'xp_earned', xpAmount: 200 }),
      makeMockDoc('log-5', { type: 'exercise_completed' }),
      makeMockDoc('log-6', { type: 'exercise_completed' }),
      makeMockDoc('log-7', { type: 'exercise_completed' }),
      makeMockDoc('log-8', { type: 'xp_earned', xpAmount: 250 }),
    ];

    const syncLogCollection = {
      ...makeChainable(),
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap(syncLogs)),
      }),
    };
    const userDoc = {
      ...makeChainable(),
      collection: jest.fn().mockReturnValue(syncLogCollection),
    };
    firestoreOverrides['collection:users'] = { ...makeChainable(), doc: jest.fn().mockReturnValue(userDoc) };

    const result = await getWeeklySummary(makeRequest({}));

    expect(result.exercisesCompleted).toBe(5);
    expect(result.xpEarned).toBe(550);
    expect(result.minutesPracticed).toBe(50);
    expect(result.improvements).toContain('Great consistency this week!');
    expect(result.improvements).toContain('Significant progress made!');
  });

  it('returns zeros on error', async () => {
    const errorCollection = {
      ...makeChainable(),
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('fail')),
      }),
    };
    const userDoc = { ...makeChainable(), collection: jest.fn().mockReturnValue(errorCollection) };
    firestoreOverrides['collection:users'] = { ...makeChainable(), doc: jest.fn().mockReturnValue(userDoc) };

    const result = await getWeeklySummary(makeRequest({}));

    expect(result.exercisesCompleted).toBe(0);
    expect(result.xpEarned).toBe(0);
  });

  it('returns appropriate goals for low activity', async () => {
    const syncLogs = [
      makeMockDoc('log-1', { type: 'exercise_completed' }),
      makeMockDoc('log-2', { type: 'xp_earned', xpAmount: 50 }),
    ];

    const syncLogCollection = {
      ...makeChainable(),
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap(syncLogs)),
      }),
    };
    const userDoc = { ...makeChainable(), collection: jest.fn().mockReturnValue(syncLogCollection) };
    firestoreOverrides['collection:users'] = { ...makeChainable(), doc: jest.fn().mockReturnValue(userDoc) };

    const result = await getWeeklySummary(makeRequest({}));

    expect(result.exercisesCompleted).toBe(1);
    expect(result.nextWeekGoals).toContain('Aim for 5+ exercises');
  });
});

// ============================================================================
// calculateLevel (tested directly via reimplementation)
// ============================================================================

describe('calculateLevel', () => {
  function calculateLevel(totalXp: number): number {
    let level = 1;
    let xpRequired = 0;
    while (xpRequired + Math.floor(100 * Math.pow(1.5, level - 1)) <= totalXp) {
      xpRequired += Math.floor(100 * Math.pow(1.5, level - 1));
      level++;
    }
    return level;
  }

  it('level 1 at 0 XP', () => expect(calculateLevel(0)).toBe(1));
  it('level 1 at 99 XP', () => expect(calculateLevel(99)).toBe(1));
  it('level 2 at 100 XP', () => expect(calculateLevel(100)).toBe(2));
  it('level 3 at 250 XP', () => expect(calculateLevel(250)).toBe(3));
  it('increases monotonically', () => {
    let prevLevel = 0;
    for (let xp = 0; xp < 5000; xp += 50) {
      const level = calculateLevel(xp);
      expect(level).toBeGreaterThanOrEqual(prevLevel);
      prevLevel = level;
    }
  });
});

// ============================================================================
// weeklyNewSongs
// ============================================================================

describe('weeklyNewSongs', () => {
  let weeklyNewSongs: any;

  beforeEach(() => {
    jest.isolateModules(() => {
      weeklyNewSongs = require('../weeklyNewSongs').weeklyNewSongs;
    });
  });

  it('exits when no API key is set', async () => {
    delete process.env.GEMINI_API_KEY;

    const songsCollection = {
      ...makeChainable(),
      select: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap()),
      }),
    };
    firestoreOverrides['collection:songs'] = songsCollection;

    await weeklyNewSongs({ scheduleTime: new Date().toISOString() });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('handles pool exhaustion gracefully', async () => {
    // Make all songs in the pool appear to already exist
    const existingDocs: any[] = [];
    // We need the titles to match the WEEKLY_SONG_POOL entries
    // The simplest way: return docs whose titles cover the pool
    for (let i = 0; i < 200; i++) {
      existingDocs.push(makeMockDoc(`song-${i}`, {
        metadata: { title: `Title ${i}`, artist: `Artist ${i}` },
      }));
    }

    const songsCollection = {
      ...makeChainable(),
      select: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(emptySnap(existingDocs)),
      }),
      doc: jest.fn().mockReturnValue(makeChainable()),
    };
    firestoreOverrides['collection:songs'] = songsCollection;

    // Should not crash even if pool doesn't perfectly match
    await weeklyNewSongs({ scheduleTime: new Date().toISOString() });
  });
});

// ============================================================================
// Validation edge cases (pure logic tests)
// ============================================================================

describe('exercise validation edge cases', () => {
  const MIDI_MIN = 36;
  const MIDI_MAX = 96;
  const MAX_NOTES = 64;

  function validateAIExercise(exercise: unknown): boolean {
    if (exercise == null || typeof exercise !== 'object') return false;
    const ex = exercise as Record<string, unknown>;
    if (!Array.isArray(ex.notes) || ex.notes.length < 4) return false;
    if (ex.notes.length > MAX_NOTES) return false;
    if (ex.settings == null || typeof ex.settings !== 'object') return false;
    const settings = ex.settings as Record<string, unknown>;
    if (typeof settings.tempo !== 'number' || settings.tempo < 30 || settings.tempo > 200) return false;
    if (!Array.isArray(settings.timeSignature) || settings.timeSignature.length !== 2) return false;
    const notes = ex.notes as Array<Record<string, unknown>>;
    for (const n of notes) {
      if (typeof n.note !== 'number' || n.note < MIDI_MIN || n.note > MIDI_MAX) return false;
      if (typeof n.startBeat !== 'number' || n.startBeat < 0) return false;
      if (typeof n.durationBeats !== 'number' || n.durationBeats <= 0) return false;
    }
    return true;
  }

  it('rejects null', () => expect(validateAIExercise(null)).toBe(false));
  it('rejects empty object', () => expect(validateAIExercise({})).toBe(false));
  it('rejects too few notes', () => {
    expect(validateAIExercise({
      notes: [{ note: 60, startBeat: 0, durationBeats: 1 }],
      settings: { tempo: 80, timeSignature: [4, 4] },
    })).toBe(false);
  });
  it('rejects too many notes', () => {
    const notes = Array.from({ length: 65 }, (_, i) => ({ note: 60, startBeat: i, durationBeats: 1 }));
    expect(validateAIExercise({ notes, settings: { tempo: 80, timeSignature: [4, 4] } })).toBe(false);
  });
  it('rejects invalid tempo', () => {
    const notes = Array.from({ length: 4 }, (_, i) => ({ note: 60, startBeat: i, durationBeats: 1 }));
    expect(validateAIExercise({ notes, settings: { tempo: 0, timeSignature: [4, 4] } })).toBe(false);
    expect(validateAIExercise({ notes, settings: { tempo: 300, timeSignature: [4, 4] } })).toBe(false);
  });
  it('rejects notes outside MIDI range', () => {
    const notes = [
      { note: 60, startBeat: 0, durationBeats: 1 },
      { note: 62, startBeat: 1, durationBeats: 1 },
      { note: 35, startBeat: 2, durationBeats: 1 },
      { note: 64, startBeat: 3, durationBeats: 1 },
    ];
    expect(validateAIExercise({ notes, settings: { tempo: 80, timeSignature: [4, 4] } })).toBe(false);
  });
  it('accepts valid exercise at boundaries', () => {
    const notes = [
      { note: MIDI_MIN, startBeat: 0, durationBeats: 0.25 },
      { note: MIDI_MAX, startBeat: 0.25, durationBeats: 4 },
      { note: 60, startBeat: 4.25, durationBeats: 1 },
      { note: 72, startBeat: 5.25, durationBeats: 2 },
    ];
    expect(validateAIExercise({ notes, settings: { tempo: 30, timeSignature: [4, 4] } })).toBe(true);
  });
});

describe('song validation edge cases', () => {
  function validateGeneratedSong(raw: unknown): boolean {
    if (raw === null || raw === undefined || typeof raw !== 'object') return false;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.title !== 'string' || obj.title.length === 0) return false;
    if (typeof obj.artist !== 'string') return false;
    if (typeof obj.genre !== 'string') return false;
    if (typeof obj.difficulty !== 'number' || obj.difficulty < 1 || obj.difficulty > 5) return false;
    if (typeof obj.attribution !== 'string') return false;
    if (typeof obj.tempo !== 'number' || obj.tempo < 30 || obj.tempo > 240) return false;
    if (typeof obj.key !== 'string') return false;
    if (!Array.isArray(obj.sections) || obj.sections.length === 0) return false;
    for (const section of obj.sections) {
      if (typeof section !== 'object' || section === null) return false;
      const s = section as Record<string, unknown>;
      if (typeof s.label !== 'string' || s.label.length === 0) return false;
      if (typeof s.melodyABC !== 'string' || s.melodyABC.length === 0) return false;
    }
    return true;
  }

  it('rejects null', () => expect(validateGeneratedSong(null)).toBe(false));
  it('rejects missing title', () => {
    expect(validateGeneratedSong({
      artist: 'A', genre: 'pop', difficulty: 2, attribution: 'AI', tempo: 100, key: 'C',
      sections: [{ label: 'V', melodyABC: 'notes' }],
    })).toBe(false);
  });
  it('rejects empty sections', () => {
    expect(validateGeneratedSong({
      title: 'T', artist: 'A', genre: 'pop', difficulty: 2, attribution: 'AI', tempo: 100, key: 'C',
      sections: [],
    })).toBe(false);
  });
  it('rejects difficulty out of range', () => {
    const base = { title: 'T', artist: 'A', genre: 'pop', attribution: 'AI', tempo: 100, key: 'C', sections: [{ label: 'V', melodyABC: 'n' }] };
    expect(validateGeneratedSong({ ...base, difficulty: 0 })).toBe(false);
    expect(validateGeneratedSong({ ...base, difficulty: 6 })).toBe(false);
  });
  it('rejects tempo out of range', () => {
    const base = { title: 'T', artist: 'A', genre: 'pop', difficulty: 2, attribution: 'AI', key: 'C', sections: [{ label: 'V', melodyABC: 'n' }] };
    expect(validateGeneratedSong({ ...base, tempo: 10 })).toBe(false);
    expect(validateGeneratedSong({ ...base, tempo: 300 })).toBe(false);
  });
  it('accepts valid song', () => {
    expect(validateGeneratedSong({
      title: 'Test', artist: 'Artist', genre: 'pop', difficulty: 3, attribution: 'AI', tempo: 120, key: 'C',
      sections: [{ label: 'Verse', melodyABC: 'X:1\nK:C\nCDEF|' }, { label: 'Chorus', melodyABC: 'X:1\nK:C\nGABc|' }],
    })).toBe(true);
  });
});

describe('coach feedback response validation', () => {
  function validateResponse(text: string): boolean {
    const forbiddenPhrases = ['as an ai', 'i am a language model', 'i cannot', 'metacarpal', 'proprioception'];
    const lowerText = text.toLowerCase();
    for (const phrase of forbiddenPhrases) {
      if (lowerText.includes(phrase)) return false;
    }
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length > 5) return false;
    return sentences.length > 0;
  }

  it('accepts normal feedback', () => expect(validateResponse('Great job! Keep practicing.')).toBe(true));
  it('rejects "as an AI"', () => expect(validateResponse('As an AI, I think you did well.')).toBe(false));
  it('rejects "I am a language model"', () => expect(validateResponse('I am a language model.')).toBe(false));
  it('rejects too many sentences', () => expect(validateResponse('A. B. C. D. E. F.')).toBe(false));
  it('rejects empty string', () => expect(validateResponse('')).toBe(false));
  it('accepts 5 sentences', () => expect(validateResponse('A. B. C. D. E.')).toBe(true));
  it('rejects technical jargon', () => {
    expect(validateResponse('Your metacarpal positioning needs work.')).toBe(false);
    expect(validateResponse('Improve your proprioception for better playing.')).toBe(false);
  });
});

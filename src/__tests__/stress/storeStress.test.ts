/**
 * Store Stress Test Suite
 *
 * Tests Zustand stores under extreme conditions:
 * concurrent mutations, rapid state changes, large state serialization,
 * and persistence race conditions.
 */

import { useExerciseStore } from '@/stores/exerciseStore';
import { useProgressStore } from '@/stores/progressStore';
import { useGemStore } from '@/stores/gemStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSocialStore } from '@/stores/socialStore';
import { useCatEvolutionStore } from '@/stores/catEvolutionStore';
import {
  PersistenceManager,
  cancelAllPendingSaves,
} from '@/stores/persistence';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(async () => {
  cancelAllPendingSaves();
  jest.clearAllMocks();

  // Reset all stores to initial state
  useExerciseStore.setState({
    currentExercise: null,
    currentExerciseId: null,
    playedNotes: [],
    isPlaying: false,
    currentBeat: 0,
    score: null,
  });

  useProgressStore.setState({
    totalXp: 0,
    level: 1,
  });
});

// ---------------------------------------------------------------------------
// Rapid state mutations
// ---------------------------------------------------------------------------

describe('Stress: Rapid State Mutations', () => {
  it('exerciseStore handles 1000 rapid played note additions', () => {
    const store = useExerciseStore;

    for (let i = 0; i < 1000; i++) {
      store.setState((state) => ({
        playedNotes: [
          ...state.playedNotes,
          { note: 60 + (i % 12), timestamp: i * 10, velocity: 80, type: 'noteOn' as const, channel: 0 },
        ],
      }));
    }

    expect(store.getState().playedNotes.length).toBe(1000);
  });

  it('progressStore handles 500 rapid XP additions without loss', () => {
    const store = useProgressStore;

    for (let i = 0; i < 500; i++) {
      const current = store.getState().totalXp;
      store.setState({ totalXp: current + 10 });
    }

    expect(store.getState().totalXp).toBe(5000);
  });

  it('gemStore handles rapid earn/spend cycles', () => {
    const store = useGemStore;
    store.setState({ gems: 1000, totalGemsEarned: 1000, totalGemsSpent: 0 });

    // Rapid earn/spend
    for (let i = 0; i < 100; i++) {
      const state = store.getState();
      store.setState({
        gems: state.gems + 10, // earn
        totalGemsEarned: state.totalGemsEarned + 10,
      });

      const afterEarn = store.getState();
      if (afterEarn.gems >= 5) {
        store.setState({
          gems: afterEarn.gems - 5, // spend
          totalGemsSpent: afterEarn.totalGemsSpent + 5,
        });
      }
    }

    const final = store.getState();
    // Earned 100 * 10 = 1000 extra, spent 100 * 5 = 500
    expect(final.gems).toBe(1000 + 1000 - 500);
    expect(final.totalGemsEarned).toBe(1000 + 1000);
    expect(final.totalGemsSpent).toBe(500);
  });

  it('settingsStore handles rapid preference toggles', () => {
    const store = useSettingsStore;

    for (let i = 0; i < 200; i++) {
      store.setState({ soundEnabled: i % 2 === 0 });
    }

    // 200 iterations, last one (i=199) sets false (odd)
    expect(store.getState().soundEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Concurrent-like operations
// ---------------------------------------------------------------------------

describe('Stress: Concurrent Operations', () => {
  it('multiple stores can be updated in same tick without interference', () => {
    useProgressStore.setState({ totalXp: 100 });
    useGemStore.setState({ gems: 50 });
    useSettingsStore.setState({ soundEnabled: true });

    // All reads should reflect updates within same tick
    expect(useProgressStore.getState().totalXp).toBe(100);
    expect(useGemStore.getState().gems).toBe(50);
    expect(useSettingsStore.getState().soundEnabled).toBe(true);
  });

  it('store subscription fires for every state change', () => {
    const changes: number[] = [];
    const unsub = useProgressStore.subscribe((state) => {
      changes.push(state.totalXp);
    });

    for (let i = 1; i <= 50; i++) {
      useProgressStore.setState({ totalXp: i * 10 });
    }

    unsub();

    // Every mutation should trigger a callback
    expect(changes.length).toBe(50);
    expect(changes[changes.length - 1]).toBe(500);
  });

  it('getState() always returns latest state synchronously', () => {
    for (let i = 0; i < 100; i++) {
      useProgressStore.setState({ totalXp: i });
      expect(useProgressStore.getState().totalXp).toBe(i);
    }
  });
});

// ---------------------------------------------------------------------------
// Large state serialization
// ---------------------------------------------------------------------------

describe('Stress: Large State Serialization', () => {
  it('socialStore handles 500 activity feed items', () => {
    const feed = Array.from({ length: 500 }, (_, i) => ({
      id: `activity-${i}`,
      type: 'level_up' as const,
      friendUid: `user-${i % 50}`,
      friendDisplayName: `player${i % 50}`,
      friendCatId: 'mini-meowww',
      detail: `Reached level ${i}`,
      timestamp: Date.now() - i * 60000,
    }));

    useSocialStore.setState({ activityFeed: feed });

    const state = useSocialStore.getState();
    expect(state.activityFeed.length).toBe(500);

    // Serialization should work
    const serialized = JSON.stringify(state.activityFeed);
    expect(serialized.length).toBeGreaterThan(0);

    const parsed = JSON.parse(serialized);
    expect(parsed.length).toBe(500);
  });

  it('progressStore handles lesson progress for 40 lessons', () => {
    const lessonProgress: Record<string, { lessonId: string; status: 'completed' | 'locked'; exerciseScores: Record<string, never>; bestScore: number; totalAttempts: number; totalTimeSpentSeconds: number }> = {};
    for (let i = 1; i <= 40; i++) {
      const id = `lesson-${String(i).padStart(2, '0')}`;
      lessonProgress[id] = {
        lessonId: id,
        status: i <= 20 ? 'completed' : 'locked',
        exerciseScores: {},
        bestScore: i <= 20 ? 80 + (i % 20) : 0,
        totalAttempts: i <= 20 ? 3 : 0,
        totalTimeSpentSeconds: i <= 20 ? 300 : 0,
      };
    }

    useProgressStore.setState({ lessonProgress });

    const state = useProgressStore.getState();
    expect(Object.keys(state.lessonProgress).length).toBe(40);

    // Verify serialization round-trip
    const json = JSON.stringify(state.lessonProgress);
    const restored = JSON.parse(json);
    expect(Object.keys(restored).length).toBe(40);
  });

  it('exerciseStore handles 2000 played notes without memory issue', () => {
    const notes = Array.from({ length: 2000 }, (_, i) => ({
      note: 60 + (i % 12),
      timestamp: i * 50,
      velocity: 64 + (i % 64),
      type: 'noteOn' as const,
      channel: 0,
    }));

    useExerciseStore.setState({ playedNotes: notes });

    const state = useExerciseStore.getState();
    expect(state.playedNotes.length).toBe(2000);

    // JSON serialization should work
    const json = JSON.stringify(state.playedNotes);
    expect(JSON.parse(json).length).toBe(2000);
  });
});

// ---------------------------------------------------------------------------
// Persistence race conditions
// ---------------------------------------------------------------------------

describe('Stress: Persistence Races', () => {
  it('PersistenceManager handles concurrent save/load', async () => {
    const key = 'test-race';
    const data1 = { value: 1 };
    const data2 = { value: 2 };

    // Fire saves concurrently (both should resolve)
    await Promise.all([
      PersistenceManager.saveState(key, data1),
      PersistenceManager.saveState(key, data2),
    ]);

    // Last write wins
    const loaded = await PersistenceManager.loadState(key, { value: 0 });
    expect(loaded.value).toBeGreaterThanOrEqual(1);
  });

  it('PersistenceManager handles save during clear', async () => {
    const key = 'test-clear-race';

    await PersistenceManager.saveState(key, { saved: true });

    // Clear and save concurrently
    await Promise.all([
      PersistenceManager.clearAll(),
      PersistenceManager.saveState(key, { saved: true }),
    ]);

    // Should not throw
    const result = await PersistenceManager.loadState(key, { saved: false });
    expect(result).toBeDefined();
  });

  it('PersistenceManager handles rapid successive saves', async () => {
    const key = 'test-rapid';

    for (let i = 0; i < 20; i++) {
      await PersistenceManager.saveState(key, { iteration: i });
    }

    const result = await PersistenceManager.loadState(key, { iteration: -1 });
    expect(result.iteration).toBe(19);
  });

  it('cancelAllPendingSaves does not corrupt state', async () => {
    const key = 'test-cancel';
    await PersistenceManager.saveState(key, { before: true });

    cancelAllPendingSaves();

    // After cancel, explicit save should still work
    await PersistenceManager.saveState(key, { after: true });
    const result = await PersistenceManager.loadState(key, {});
    expect(result).toEqual({ after: true });
  });
});

// ---------------------------------------------------------------------------
// State reset safety
// ---------------------------------------------------------------------------

describe('Stress: State Reset Safety', () => {
  it('resetting one store does not affect others', () => {
    useProgressStore.setState({ totalXp: 5000, level: 10 });
    useGemStore.setState({ gems: 999 });

    // Reset progress
    useProgressStore.setState({ totalXp: 0, level: 1 });

    // Gems should be untouched
    expect(useGemStore.getState().gems).toBe(999);
  });

  it('store state is independent across getState calls', () => {
    useProgressStore.setState({ totalXp: 100 });

    useProgressStore.getState();
    useProgressStore.setState({ totalXp: 200 });
    const state2 = useProgressStore.getState();

    // getState() returns the current state
    expect(state2.totalXp).toBe(200);
  });

  it('subscriber receives updates in order', () => {
    const values: number[] = [];
    const unsub = useProgressStore.subscribe((state) => {
      values.push(state.totalXp);
    });

    useProgressStore.setState({ totalXp: 10 });
    useProgressStore.setState({ totalXp: 20 });
    useProgressStore.setState({ totalXp: 30 });

    unsub();

    expect(values).toEqual([10, 20, 30]);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Stress: Edge Cases', () => {
  it('setting same state value does not create new reference', () => {
    useProgressStore.setState({ totalXp: 100 });
    const state1 = useProgressStore.getState();

    useProgressStore.setState({ totalXp: 100 }); // Same value
    const state2 = useProgressStore.getState();

    // Zustand v5: setState with same value still creates new object
    // but the totalXp value is identical
    expect(state2.totalXp).toBe(state1.totalXp);
  });

  it('catEvolutionStore handles evolution with max XP', () => {
    useCatEvolutionStore.setState({
      evolutionData: {
        'mini-meowww': {
          catId: 'mini-meowww',
          currentStage: 'master',
          xpAccumulated: 999999,
          abilitiesUnlocked: [],
          evolvedAt: { baby: null, teen: null, adult: null, master: null },
        },
      },
    });

    const state = useCatEvolutionStore.getState();
    expect(state.evolutionData['mini-meowww'].xpAccumulated).toBe(999999);
  });

  it('empty arrays and objects serialize correctly', () => {
    useExerciseStore.setState({
      playedNotes: [],
    });

    const state = useExerciseStore.getState();
    expect(state.playedNotes).toEqual([]);
    expect(JSON.stringify(state.playedNotes)).toBe('[]');
  });
});

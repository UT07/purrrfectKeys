/**
 * AsyncStorage Persistence Layer
 * Handles automated state synchronization with AsyncStorage (Expo Go compatible)
 *
 * Features:
 * - Type-safe serialization/deserialization
 * - Auto-save with debouncing
 * - State hydration on app launch
 * - Schema migration support
 * - Development logging
 *
 * NOTE: Using AsyncStorage instead of MMKV for Expo Go compatibility.
 * For production builds, consider switching to MMKV for better performance.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

/**
 * Storage wrapper with sync-like interface for compatibility
 */
export const storage = {
  setString: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },
  getString: async (key: string): Promise<string | undefined> => {
    const value = await AsyncStorage.getItem(key);
    return value ?? undefined;
  },
  setNumber: async (key: string, value: number): Promise<void> => {
    await AsyncStorage.setItem(key, value.toString());
  },
  getNumber: async (key: string): Promise<number | undefined> => {
    const value = await AsyncStorage.getItem(key);
    return value ? parseFloat(value) : undefined;
  },
  delete: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },
  clearAll: async (): Promise<void> => {
    await AsyncStorage.clear();
  },
};

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  EXERCISE: 'keysense_exercise_state',
  PROGRESS: 'keysense_progress_state',
  SETTINGS: 'keysense_settings_state',
  ACHIEVEMENTS: 'purrrfect_achievements_state',
  LEARNER_PROFILE: 'keysense_learner_profile',
  EXERCISE_BUFFER: 'keysense_exercise_buffer',
  MIGRATION_VERSION: 'keysense_migration_version',
  CLOUD_MIGRATION: 'purrrfect_keys_migrated',
  GEMS: 'purrrfect_gems_state',
  CAT_EVOLUTION: 'purrrfect_cat_evolution_state',
  SONGS: 'purrrfect_songs_state',
  SOCIAL: 'purrrfect_social_state',
  LEAGUE: 'purrrfect_league_state',
  RANK: 'purrrfect_rank_state',
  SEASON: 'purrrfect_season_state',
  GUILD: 'purrrfect_guild_state',
  SYNC_QUEUE: 'keysense_sync_queue',
  LAST_SYNC: 'keysense_last_sync',
  DAILY_PLAN: 'purrrfect_keys_daily_plan_v5',
} as const;

/**
 * Schema version for migrations
 */
export const MIGRATION_VERSION = 1;

/**
 * Generic persistence utilities
 */
export class PersistenceManager {
  /**
   * Save state to AsyncStorage
   */
  static async saveState<T>(key: string, state: T): Promise<void> {
    try {
      const serialized = JSON.stringify(state);
      await storage.setString(key, serialized);

      if (process.env.NODE_ENV === 'development') {
        logger.log(`[PERSIST] Saved ${key}:`, state);
      }
    } catch (error) {
      logger.warn(`[PERSIST] Failed to save ${key}:`, error);
    }
  }

  /**
   * Load state from AsyncStorage
   */
  static async loadState<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const serialized = await storage.getString(key);
      if (!serialized) {
        return defaultValue;
      }

      const parsed = JSON.parse(serialized) as T;

      if (process.env.NODE_ENV === 'development') {
        logger.log(`[PERSIST] Loaded ${key}:`, parsed);
      }

      return parsed;
    } catch (error) {
      logger.warn(`[PERSIST] Failed to load ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Delete state from AsyncStorage
   */
  static async deleteState(key: string): Promise<void> {
    try {
      await storage.delete(key);

      if (process.env.NODE_ENV === 'development') {
        logger.log(`[PERSIST] Deleted ${key}`);
      }
    } catch (error) {
      logger.warn(`[PERSIST] Failed to delete ${key}:`, error);
    }
  }

  /**
   * Clear all KeySense data
   */
  static async clearAll(): Promise<void> {
    // Hermes doesn't support Promise.allSettled — use Promise.all with per-key catch
    const failures: unknown[] = [];
    await Promise.all(
      Object.values(STORAGE_KEYS).map(key =>
        typeof key === 'string'
          ? storage.delete(key).catch((err: unknown) => { failures.push(err); })
          : Promise.resolve()
      )
    );

    if (failures.length > 0) {
      logger.warn(`[PERSIST] Failed to clear ${failures.length} keys:`, failures);
    } else if (process.env.NODE_ENV === 'development') {
      logger.log('[PERSIST] Cleared all KeySense data');
    }
  }

  /**
   * Get migration version
   */
  static async getMigrationVersion(): Promise<number> {
    try {
      const version = await storage.getNumber(STORAGE_KEYS.MIGRATION_VERSION);
      return version ?? 0;
    } catch (error) {
      logger.warn('[PERSIST] Failed to get migration version:', error);
      return 0;
    }
  }

  /**
   * Set migration version
   */
  static async setMigrationVersion(version: number): Promise<void> {
    try {
      await storage.setNumber(STORAGE_KEYS.MIGRATION_VERSION, version);
    } catch (error) {
      logger.warn('[PERSIST] Failed to set migration version:', error);
    }
  }
}

/**
 * Registry of all active debounced saves.
 * Stores both the timer ID and the save callback so we can either
 * cancel (on sign-out/deletion) or flush (on app background).
 */
interface PendingSave {
  timerId: NodeJS.Timeout;
  execute: () => Promise<void>;
}
const pendingSaves: Map<string, PendingSave> = new Map();

/**
 * Cancel all pending debounced saves across all stores.
 * MUST be called before clearAll() during account deletion / sign-out
 * to prevent race conditions where old data is re-written after clearing.
 */
export function cancelAllPendingSaves(): void {
  for (const { timerId } of pendingSaves.values()) {
    clearTimeout(timerId);
  }
  pendingSaves.clear();
}

/**
 * Flush all pending debounced saves immediately.
 * Call this when the app transitions to background/inactive to prevent data loss.
 */
export async function flushAllPendingSaves(): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const { timerId, execute } of pendingSaves.values()) {
    clearTimeout(timerId);
    promises.push(execute().catch(err => console.error('[PERSIST] Flush save failed:', err)));
  }
  pendingSaves.clear();
  // Hermes doesn't support Promise.allSettled — promises already have .catch()
  await Promise.all(promises);
}

/**
 * Immediate save helper
 * Bypasses debouncing for critical state that must persist immediately
 * (e.g., daily challenge completion, gem transactions)
 */
export function createImmediateSave<T>(key: string): (stateOrGetter: T | (() => T)) => Promise<void> {
  return async (stateOrGetter: T | (() => T)) => {
    // Cancel any pending debounced save for this key to prevent it from
    // overwriting the immediate save with stale state
    const pending = pendingSaves.get(key);
    if (pending) {
      clearTimeout(pending.timerId);
      pendingSaves.delete(key);
    }
    try {
      // Accept both state objects and getter functions (Zustand's get)
      const state = typeof stateOrGetter === 'function'
        ? (stateOrGetter as () => T)()
        : stateOrGetter;
      await PersistenceManager.saveState(key, state);
    } catch (err) {
      console.error('[PERSIST] Immediate save failed:', err);
    }
  };
}

/**
 * Debounced save helper
 * Prevents excessive writes to storage
 *
 * Accepts either a state snapshot or a getState() callback.
 * When a callback is provided, the LATEST state is read at flush time,
 * avoiding stale-closure bugs where rapid mutations cause old state
 * to overwrite newer state.
 */
export function createDebouncedSave<T>(
  key: string,
  delayMs: number = 1000
): (stateOrGetter: T | (() => T)) => void {
  return (stateOrGetter: T | (() => T)) => {
    const existing = pendingSaves.get(key);
    if (existing) {
      clearTimeout(existing.timerId);
    }

    // Always read the latest state at flush time to avoid stale closures.
    // If a plain state object is passed, we still capture it — but the
    // caller is encouraged to pass a getState callback instead.
    const getLatest = typeof stateOrGetter === 'function'
      ? (stateOrGetter as () => T)
      : () => stateOrGetter;

    const execute = () => PersistenceManager.saveState(key, getLatest());
    const timerId = setTimeout(() => {
      pendingSaves.delete(key);
      execute().catch(err =>
        console.error('[PERSIST] Debounced save failed:', err)
      );
    }, delayMs);
    pendingSaves.set(key, { timerId, execute });
  };
}

/**
 * Zustand persist middleware for automatic state hydration and saving
 * Usage: create(..., persist(...))
 */
export function createPersistMiddleware<T>(
  key: string,
  defaultValue: T,
  options: {
    debounceMs?: number;
    version?: number;
    migrate?: (state: unknown, version: number) => Awaited<T>;
  } = {}
) {
  const { debounceMs = 1000, version = 1, migrate } = options;

  return (config: any) => {
    // Initialize state asynchronously
    let initialState = defaultValue;

    // Load initial state in background
    (async () => {
      try {
        const currentVersion = await PersistenceManager.getMigrationVersion();
        let loadedState = await PersistenceManager.loadState<T>(key, defaultValue);

        // Run migrations if needed
        if (migrate && currentVersion < version) {
          loadedState = migrate(loadedState, currentVersion);
          await PersistenceManager.setMigrationVersion(version);
        }

        initialState = loadedState;
      } catch (error) {
        console.error('[PERSIST] Failed to load initial state:', error);
      }
    })();

    const debouncedSave = createDebouncedSave(key, debounceMs);

    return (set: any, get: any, api: any) => {
      const setWithPersist = (partial: any, replace?: boolean) => {
        set(partial, replace);
        const newState = get();
        debouncedSave(newState);
      };

      return {
        ...config(setWithPersist, get, api),
        ...initialState,
      };
    };
  };
}

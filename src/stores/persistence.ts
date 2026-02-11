/**
 * MMKV Persistence Layer
 * Handles automated state synchronization with React Native MMKV
 *
 * Features:
 * - Type-safe serialization/deserialization
 * - Auto-save with debouncing
 * - State hydration on app launch
 * - Schema migration support
 * - Development logging
 */

import { MMKV } from 'react-native-mmkv';

/**
 * Singleton MMKV instance
 */
export const storage = new MMKV();

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  EXERCISE: 'keysense_exercise_state',
  PROGRESS: 'keysense_progress_state',
  SETTINGS: 'keysense_settings_state',
  MIGRATION_VERSION: 'keysense_migration_version',
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
   * Save state to MMKV
   */
  static saveState<T>(key: string, state: T): void {
    try {
      const serialized = JSON.stringify(state);
      storage.setString(key, serialized);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[PERSIST] Saved ${key}:`, state);
      }
    } catch (error) {
      console.error(`[PERSIST] Failed to save ${key}:`, error);
    }
  }

  /**
   * Load state from MMKV
   */
  static loadState<T>(key: string, defaultValue: T): T {
    try {
      const serialized = storage.getString(key);
      if (!serialized) {
        return defaultValue;
      }

      const parsed = JSON.parse(serialized) as T;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[PERSIST] Loaded ${key}:`, parsed);
      }

      return parsed;
    } catch (error) {
      console.error(`[PERSIST] Failed to load ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Delete state from MMKV
   */
  static deleteState(key: string): void {
    try {
      storage.delete(key);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[PERSIST] Deleted ${key}`);
      }
    } catch (error) {
      console.error(`[PERSIST] Failed to delete ${key}:`, error);
    }
  }

  /**
   * Clear all KeySense data
   */
  static clearAll(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        if (typeof key === 'string') {
          storage.delete(key);
        }
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[PERSIST] Cleared all KeySense data');
      }
    } catch (error) {
      console.error('[PERSIST] Failed to clear all data:', error);
    }
  }

  /**
   * Get migration version
   */
  static getMigrationVersion(): number {
    try {
      const version = storage.getNumber(STORAGE_KEYS.MIGRATION_VERSION);
      return version ?? 0;
    } catch (error) {
      console.error('[PERSIST] Failed to get migration version:', error);
      return 0;
    }
  }

  /**
   * Set migration version
   */
  static setMigrationVersion(version: number): void {
    try {
      storage.setNumber(STORAGE_KEYS.MIGRATION_VERSION, version);
    } catch (error) {
      console.error('[PERSIST] Failed to set migration version:', error);
    }
  }
}

/**
 * Debounced save helper
 * Prevents excessive writes to storage
 */
export function createDebouncedSave<T>(
  key: string,
  delayMs: number = 1000
): (state: T) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (state: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      PersistenceManager.saveState(key, state);
      timeoutId = null;
    }, delayMs);
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
    migrate?: (state: unknown, version: number) => T;
  } = {}
) {
  const { debounceMs = 1000, version = 1, migrate } = options;

  return (config: any) => {
    const currentVersion = PersistenceManager.getMigrationVersion();
    let initialState = PersistenceManager.loadState<T>(key, defaultValue);

    // Run migrations if needed
    if (migrate && currentVersion < version) {
      initialState = migrate(initialState, currentVersion);
      PersistenceManager.setMigrationVersion(version);
    }

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

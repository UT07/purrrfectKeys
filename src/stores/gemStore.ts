/**
 * Gem Currency Store
 *
 * Manages the in-app gem economy:
 * - Balance tracking with transaction audit trail
 * - Earning gems from exercises, streaks, achievements, daily goals
 * - Spending gems to unlock cats
 * - Persisted to AsyncStorage via debounced save
 */

import { create } from 'zustand';
import type { GemTransaction } from './types';
import { PersistenceManager, STORAGE_KEYS, createDebouncedSave } from './persistence';

const MAX_TRANSACTIONS = 50;

export interface GemStoreState {
  gems: number;
  totalGemsEarned: number;
  totalGemsSpent: number;
  transactions: GemTransaction[];

  // Actions
  earnGems: (amount: number, source: string) => void;
  spendGems: (amount: number, item: string) => boolean;
  canAfford: (amount: number) => boolean;
  reset: () => void;
}

type GemData = Pick<GemStoreState, 'gems' | 'totalGemsEarned' | 'totalGemsSpent' | 'transactions'>;

const defaultData: GemData = {
  gems: 0,
  totalGemsEarned: 0,
  totalGemsSpent: 0,
  transactions: [],
};

const debouncedSave = createDebouncedSave<GemData>(STORAGE_KEYS.GEMS, 500);

export const useGemStore = create<GemStoreState>((set, get) => ({
  ...defaultData,

  earnGems: (amount: number, source: string) => {
    if (amount <= 0) return;
    set((state) => {
      const newBalance = state.gems + amount;
      const transaction: GemTransaction = {
        amount,
        source,
        timestamp: Date.now(),
        balance: newBalance,
      };
      const transactions = [transaction, ...state.transactions].slice(0, MAX_TRANSACTIONS);
      return {
        gems: newBalance,
        totalGemsEarned: state.totalGemsEarned + amount,
        transactions,
      };
    });
    debouncedSave(get());
  },

  spendGems: (amount: number, item: string) => {
    const state = get();
    if (amount <= 0 || state.gems < amount) return false;

    set((prev) => {
      const newBalance = prev.gems - amount;
      const transaction: GemTransaction = {
        amount: -amount,
        source: item,
        timestamp: Date.now(),
        balance: newBalance,
      };
      const transactions = [transaction, ...prev.transactions].slice(0, MAX_TRANSACTIONS);
      return {
        gems: newBalance,
        totalGemsSpent: prev.totalGemsSpent + amount,
        transactions,
      };
    });
    debouncedSave(get());
    return true;
  },

  canAfford: (amount: number) => {
    return get().gems >= amount;
  },

  reset: () => {
    set(defaultData);
    PersistenceManager.deleteState(STORAGE_KEYS.GEMS);
  },
}));

/** Hydrate gem store from AsyncStorage on app launch */
export async function hydrateGemStore(): Promise<void> {
  const data = await PersistenceManager.loadState<GemData>(STORAGE_KEYS.GEMS, defaultData);
  useGemStore.setState(data);
}

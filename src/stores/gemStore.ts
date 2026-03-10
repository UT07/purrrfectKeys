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
import { PersistenceManager, STORAGE_KEYS, createDebouncedSave, createImmediateSave } from './persistence';

const MAX_TRANSACTIONS = 50;

export interface GemStoreState {
  gems: number;
  totalGemsEarned: number;
  totalGemsSpent: number;
  transactions: GemTransaction[];
  /** Permanent set of one-time reward keys (weekly-2026-03-02, monthly-2026-03, etc.) */
  claimedRewards: string[];

  // Actions
  earnGems: (amount: number, source: string) => void;
  spendGems: (amount: number, item: string) => boolean;
  canAfford: (amount: number) => boolean;
  hasClaimedReward: (key: string) => boolean;
  claimReward: (key: string, gems: number) => void;
  reset: () => void;
}

type GemData = Pick<GemStoreState, 'gems' | 'totalGemsEarned' | 'totalGemsSpent' | 'transactions' | 'claimedRewards'>;

const defaultData: GemData = {
  gems: 0,
  totalGemsEarned: 0,
  totalGemsSpent: 0,
  transactions: [],
  claimedRewards: [],
};

const debouncedSave = createDebouncedSave<GemData>(STORAGE_KEYS.GEMS, 500);
/** Immediate save for critical operations (reward claims) — prevents double-claiming on crash */
const immediateSave = createImmediateSave<GemData>(STORAGE_KEYS.GEMS);

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
    if (amount <= 0) return false;

    // Atomic check-and-update inside a single set() to prevent TOCTOU race
    // (e.g., double-tap on buy button reading same balance twice)
    let success = false;
    set((state) => {
      if (state.gems < amount) return state; // insufficient balance — no change
      success = true;
      const newBalance = state.gems - amount;
      const transaction: GemTransaction = {
        amount: -amount,
        source: item,
        timestamp: Date.now(),
        balance: newBalance,
      };
      const transactions = [transaction, ...state.transactions].slice(0, MAX_TRANSACTIONS);
      return {
        gems: newBalance,
        totalGemsSpent: state.totalGemsSpent + amount,
        transactions,
      };
    });
    if (success) {
      debouncedSave(get());
    }
    return success;
  },

  canAfford: (amount: number) => {
    return get().gems >= amount;
  },

  hasClaimedReward: (key: string) => {
    return get().claimedRewards.includes(key);
  },

  claimReward: (key: string, gems: number) => {
    // Atomic check-and-claim inside a single set() to prevent TOCTOU race
    let alreadyClaimed = false;
    set((state) => {
      if (state.claimedRewards.includes(key)) {
        alreadyClaimed = true;
        return state;
      }
      const newBalance = state.gems + gems;
      const transaction: GemTransaction = {
        amount: gems,
        source: key,
        timestamp: Date.now(),
        balance: newBalance,
      };
      return {
        gems: newBalance,
        totalGemsEarned: state.totalGemsEarned + gems,
        claimedRewards: [...state.claimedRewards, key],
        transactions: [transaction, ...state.transactions].slice(0, MAX_TRANSACTIONS),
      };
    });
    if (!alreadyClaimed) {
      immediateSave(get());
    }
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

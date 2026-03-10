/**
 * League Store
 *
 * Manages league membership and standings:
 * - Current league membership (tier, weekly XP, rank)
 * - Standings leaderboard (transient, not persisted)
 * - Only membership is persisted to AsyncStorage
 */

import { create } from 'zustand';
import type { LeagueMembership, LeagueTier } from './types';
import { PersistenceManager, STORAGE_KEYS, createDebouncedSave } from './persistence';

/**
 * Get the Monday of the current week as ISO date (YYYY-MM-DD).
 * Must match leagueService.getCurrentWeekMonday() logic (UTC-based).
 */
function getCurrentWeekMonday(): string {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0=Sunday ... 6=Saturday
  const daysFromMonday = utcDay === 0 ? 6 : utcDay - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

/**
 * If the persisted membership belongs to a previous week, reset weeklyXp to 0.
 * This prevents stale XP from last week showing in the current week's leaderboard.
 */
function resetWeeklyXpIfStale(membership: LeagueMembership | null): LeagueMembership | null {
  if (!membership) return null;
  const currentMonday = getCurrentWeekMonday();
  if (membership.weekStart !== currentMonday) {
    return { ...membership, weeklyXp: 0, weekStart: currentMonday };
  }
  return membership;
}

export interface LeagueStandingEntry {
  uid: string;
  displayName: string;
  selectedCatId: string;
  weeklyXp: number;
  rank: number;
}

export type TierTransition = 'promoted' | 'demoted' | 'same' | null;

export interface LeagueStoreState {
  membership: LeagueMembership | null;
  previousTier: LeagueTier | null;
  tierTransition: TierTransition;
  standings: LeagueStandingEntry[];
  isLoadingStandings: boolean;

  // Actions
  setMembership: (membership: LeagueMembership | null) => void;
  setStandings: (standings: LeagueStandingEntry[]) => void;
  setLoadingStandings: (loading: boolean) => void;
  updateWeeklyXp: (xp: number) => void;
  clearTierTransition: () => void;
  reset: () => void;
}

type LeagueData = Pick<LeagueStoreState, 'membership' | 'previousTier'>;

const defaultData: LeagueData = {
  membership: null,
  previousTier: null,
};

const TIER_ORDER: readonly LeagueTier[] = ['bronze', 'silver', 'gold', 'diamond'];

function computeTierTransition(oldTier: LeagueTier | null, newTier: LeagueTier | null): TierTransition {
  if (oldTier == null || newTier == null || oldTier === newTier) return null;
  const oldIndex = TIER_ORDER.indexOf(oldTier);
  const newIndex = TIER_ORDER.indexOf(newTier);
  if (newIndex > oldIndex) return 'promoted';
  if (newIndex < oldIndex) return 'demoted';
  return null;
}

const defaultState: Omit<LeagueStoreState, 'setMembership' | 'setStandings' | 'setLoadingStandings' | 'updateWeeklyXp' | 'clearTierTransition' | 'reset'> = {
  membership: null,
  previousTier: null,
  tierTransition: null,
  standings: [],
  isLoadingStandings: false,
};

const debouncedSave = createDebouncedSave<LeagueData>(STORAGE_KEYS.LEAGUE, 500);

export const useLeagueStore = create<LeagueStoreState>((set, get) => ({
  ...defaultState,

  setMembership: (membership: LeagueMembership | null) => {
    const current = get().membership;
    const oldTier = current?.tier ?? null;
    const newTier = membership?.tier ?? null;
    const transition = computeTierTransition(oldTier, newTier);
    set({
      membership,
      previousTier: oldTier ?? get().previousTier,
      tierTransition: transition,
    });
    debouncedSave({ membership, previousTier: oldTier ?? get().previousTier });
  },

  setStandings: (standings: LeagueStandingEntry[]) => {
    set({ standings });
  },

  setLoadingStandings: (loading: boolean) => {
    set({ isLoadingStandings: loading });
  },

  updateWeeklyXp: (xp: number) => {
    const { membership, previousTier } = get();
    if (!membership) return;
    // Reset XP if we've crossed into a new week since the membership was stored
    const fresh = resetWeeklyXpIfStale(membership);
    if (!fresh) return;
    const updated = { ...fresh, weeklyXp: xp };
    set({ membership: updated });
    debouncedSave({ membership: updated, previousTier });
  },

  clearTierTransition: () => {
    set({ tierTransition: null });
  },

  reset: () => {
    set(defaultState);
    PersistenceManager.deleteState(STORAGE_KEYS.LEAGUE);
  },
}));

/** Hydrate league store from AsyncStorage on app launch */
export async function hydrateLeagueStore(): Promise<void> {
  const data = await PersistenceManager.loadState<LeagueData>(STORAGE_KEYS.LEAGUE, defaultData);
  // Reset weekly XP if the persisted membership belongs to a previous week
  const membership = resetWeeklyXpIfStale(data.membership ?? null);
  useLeagueStore.setState({
    membership,
    previousTier: data.previousTier ?? null,
    tierTransition: null,
    standings: [],
    isLoadingStandings: false,
  });
}

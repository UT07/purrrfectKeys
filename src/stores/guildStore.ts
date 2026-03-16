/**
 * Guild Store
 *
 * Manages guild state:
 * - Current guild membership
 * - Guild member list
 * - Active guild wars
 * - Persisted via AsyncStorage
 */

import { create } from 'zustand';
import type { Guild, GuildMember, GuildWar } from './types';
import { PersistenceManager, STORAGE_KEYS, createDebouncedSave } from './persistence';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuildStoreState {
  currentGuild: Guild | null;
  members: GuildMember[];
  activeWars: GuildWar[];
  isLoading: boolean;

  // Actions
  setCurrentGuild: (guild: Guild | null) => void;
  setMembers: (members: GuildMember[]) => void;
  setActiveWars: (wars: GuildWar[]) => void;
  setLoading: (loading: boolean) => void;
  updateMemberXp: (uid: string, xpAmount: number) => void;
  removeMember: (uid: string) => void;
  updateMemberRole: (uid: string, role: GuildMember['role']) => void;
  addWarPoints: (warId: string, guildId: string, points: number) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

type GuildData = {
  currentGuild: Guild | null;
};

const debouncedSave = createDebouncedSave<GuildData>(STORAGE_KEYS.GUILD, 500);

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGuildStore = create<GuildStoreState>((set, get) => ({
  currentGuild: null,
  members: [],
  activeWars: [],
  isLoading: false,

  setCurrentGuild: (guild) => {
    set({ currentGuild: guild });
    debouncedSave({ currentGuild: guild });
  },

  setMembers: (members) => set({ members }),

  setActiveWars: (wars) => set({ activeWars: wars }),

  setLoading: (loading) => set({ isLoading: loading }),

  updateMemberXp: (uid, xpAmount) => {
    set((state) => ({
      members: state.members.map((m) =>
        m.uid === uid
          ? { ...m, weeklyXp: m.weeklyXp + xpAmount, totalGuildXp: m.totalGuildXp + xpAmount }
          : m,
      ),
    }));
  },

  removeMember: (uid) => {
    set((state) => ({
      members: state.members.filter((m) => m.uid !== uid),
      currentGuild: state.currentGuild
        ? { ...state.currentGuild, memberCount: state.currentGuild.memberCount - 1 }
        : null,
    }));
    debouncedSave({ currentGuild: get().currentGuild });
  },

  updateMemberRole: (uid, role) => {
    set((state) => ({
      members: state.members.map((m) =>
        m.uid === uid ? { ...m, role } : m,
      ),
    }));
  },

  addWarPoints: (warId, guildId, points) => {
    set((state) => ({
      activeWars: state.activeWars.map((w) => {
        if (w.id !== warId) return w;
        if (w.guildAId === guildId) {
          return { ...w, guildAWarPoints: w.guildAWarPoints + points };
        }
        if (w.guildBId === guildId) {
          return { ...w, guildBWarPoints: w.guildBWarPoints + points };
        }
        return w;
      }),
    }));
  },

  reset: () => {
    set({
      currentGuild: null,
      members: [],
      activeWars: [],
      isLoading: false,
    });
    PersistenceManager.deleteState(STORAGE_KEYS.GUILD);
  },
}));

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

/** Hydrate guild store from AsyncStorage on app launch */
export async function hydrateGuildStore(): Promise<void> {
  const data = await PersistenceManager.loadState<GuildData>(STORAGE_KEYS.GUILD, {
    currentGuild: null,
  });
  useGuildStore.setState({
    currentGuild: data.currentGuild ?? null,
  });
}

/**
 * Guild Store Tests
 *
 * Tests for guild state management:
 * - Current guild tracking
 * - Member list management
 * - Guild war state updates
 * - Persistence and hydration
 */

import { useGuildStore, hydrateGuildStore } from '../guildStore';
import type { Guild, GuildMember, GuildWar } from '../types';
import { PersistenceManager } from '../persistence';

// Mock persistence
jest.mock('../persistence', () => ({
  PersistenceManager: {
    loadState: jest.fn().mockResolvedValue({}),
    saveState: jest.fn().mockResolvedValue(undefined),
    deleteState: jest.fn().mockResolvedValue(undefined),
  },
  STORAGE_KEYS: {
    GUILD: 'purrrfect_guild_state',
  },
  createDebouncedSave: jest.fn(() => jest.fn()),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGuild(overrides?: Partial<Guild>): Guild {
  return {
    id: 'guild-1',
    name: 'Test Guild',
    icon: '🐱',
    description: 'A test guild',
    joinPolicy: 'open',
    leaderUid: 'leader-1',
    level: 1,
    guildXp: 0,
    memberCount: 3,
    weeklyXp: 0,
    minWeeklyXp: 0,
    bannerColor: '#6B21A8',
    createdAt: 1000,
    ...overrides,
  };
}

function makeMember(overrides?: Partial<GuildMember>): GuildMember {
  return {
    uid: 'member-1',
    displayName: 'Player 1',
    catId: 'luna',
    rankTier: 'novice',
    role: 'member',
    weeklyXp: 0,
    totalGuildXp: 0,
    joinedAt: 1000,
    lastActiveAt: 1000,
    warStrikes: 0,
    ...overrides,
  };
}

function makeWar(overrides?: Partial<GuildWar>): GuildWar {
  return {
    id: 'war-1',
    guildAId: 'guild-1',
    guildBId: 'guild-2',
    guildAName: 'Alpha',
    guildBName: 'Beta',
    startedAt: 1000,
    endsAt: 87400000,
    status: 'active',
    guildAWarPoints: 0,
    guildBWarPoints: 0,
    winnerId: null,
    mvpUid: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('guildStore', () => {
  beforeEach(() => {
    useGuildStore.setState({
      currentGuild: null,
      members: [],
      activeWars: [],
      isLoading: false,
    });
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------

  it('starts with null guild and empty arrays', () => {
    const state = useGuildStore.getState();
    expect(state.currentGuild).toBeNull();
    expect(state.members).toEqual([]);
    expect(state.activeWars).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Guild management
  // -----------------------------------------------------------------------

  describe('setCurrentGuild', () => {
    it('sets the current guild', () => {
      const guild = makeGuild();
      useGuildStore.getState().setCurrentGuild(guild);
      expect(useGuildStore.getState().currentGuild).toEqual(guild);
    });

    it('clears the current guild', () => {
      useGuildStore.getState().setCurrentGuild(makeGuild());
      useGuildStore.getState().setCurrentGuild(null);
      expect(useGuildStore.getState().currentGuild).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Member management
  // -----------------------------------------------------------------------

  describe('setMembers', () => {
    it('sets the member list', () => {
      const members = [makeMember({ uid: 'a' }), makeMember({ uid: 'b' })];
      useGuildStore.getState().setMembers(members);
      expect(useGuildStore.getState().members).toHaveLength(2);
    });
  });

  describe('updateMemberXp', () => {
    it('increments both weeklyXp and totalGuildXp', () => {
      useGuildStore.getState().setMembers([
        makeMember({ uid: 'a', weeklyXp: 100, totalGuildXp: 500 }),
        makeMember({ uid: 'b', weeklyXp: 50, totalGuildXp: 200 }),
      ]);

      useGuildStore.getState().updateMemberXp('a', 25);

      const members = useGuildStore.getState().members;
      expect(members[0].weeklyXp).toBe(125);
      expect(members[0].totalGuildXp).toBe(525);
      expect(members[1].weeklyXp).toBe(50); // unchanged
    });
  });

  describe('removeMember', () => {
    it('removes member and decrements guild count', () => {
      useGuildStore.getState().setCurrentGuild(makeGuild({ memberCount: 3 }));
      useGuildStore.getState().setMembers([
        makeMember({ uid: 'a' }),
        makeMember({ uid: 'b' }),
        makeMember({ uid: 'c' }),
      ]);

      useGuildStore.getState().removeMember('b');

      expect(useGuildStore.getState().members).toHaveLength(2);
      expect(useGuildStore.getState().members.find((m) => m.uid === 'b')).toBeUndefined();
      expect(useGuildStore.getState().currentGuild?.memberCount).toBe(2);
    });
  });

  describe('updateMemberRole', () => {
    it('updates role for target member only', () => {
      useGuildStore.getState().setMembers([
        makeMember({ uid: 'a', role: 'member' }),
        makeMember({ uid: 'b', role: 'member' }),
      ]);

      useGuildStore.getState().updateMemberRole('a', 'co_leader');

      const members = useGuildStore.getState().members;
      expect(members[0].role).toBe('co_leader');
      expect(members[1].role).toBe('member'); // unchanged
    });
  });

  // -----------------------------------------------------------------------
  // Guild wars
  // -----------------------------------------------------------------------

  describe('setActiveWars', () => {
    it('sets active wars list', () => {
      const wars = [makeWar({ id: 'w1' }), makeWar({ id: 'w2' })];
      useGuildStore.getState().setActiveWars(wars);
      expect(useGuildStore.getState().activeWars).toHaveLength(2);
    });
  });

  describe('addWarPoints', () => {
    it('adds points for guildA', () => {
      useGuildStore.getState().setActiveWars([makeWar({ id: 'w1', guildAId: 'guild-1' })]);

      useGuildStore.getState().addWarPoints('w1', 'guild-1', 15);

      expect(useGuildStore.getState().activeWars[0].guildAWarPoints).toBe(15);
      expect(useGuildStore.getState().activeWars[0].guildBWarPoints).toBe(0);
    });

    it('adds points for guildB', () => {
      useGuildStore.getState().setActiveWars([makeWar({ id: 'w1', guildBId: 'guild-2' })]);

      useGuildStore.getState().addWarPoints('w1', 'guild-2', 10);

      expect(useGuildStore.getState().activeWars[0].guildBWarPoints).toBe(10);
    });

    it('does not modify other wars', () => {
      useGuildStore.getState().setActiveWars([
        makeWar({ id: 'w1', guildAId: 'guild-1' }),
        makeWar({ id: 'w2', guildAId: 'guild-1' }),
      ]);

      useGuildStore.getState().addWarPoints('w1', 'guild-1', 5);

      expect(useGuildStore.getState().activeWars[0].guildAWarPoints).toBe(5);
      expect(useGuildStore.getState().activeWars[1].guildAWarPoints).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  describe('setLoading', () => {
    it('toggles loading state', () => {
      useGuildStore.getState().setLoading(true);
      expect(useGuildStore.getState().isLoading).toBe(true);

      useGuildStore.getState().setLoading(false);
      expect(useGuildStore.getState().isLoading).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Reset
  // -----------------------------------------------------------------------

  describe('reset', () => {
    it('clears all guild state', () => {
      useGuildStore.getState().setCurrentGuild(makeGuild());
      useGuildStore.getState().setMembers([makeMember()]);
      useGuildStore.getState().setActiveWars([makeWar()]);

      useGuildStore.getState().reset();

      const state = useGuildStore.getState();
      expect(state.currentGuild).toBeNull();
      expect(state.members).toEqual([]);
      expect(state.activeWars).toEqual([]);
      expect(state.isLoading).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Hydration
  // -----------------------------------------------------------------------

  describe('hydrateGuildStore', () => {
    it('loads persisted guild from storage', async () => {
      const guild = makeGuild();
      (PersistenceManager.loadState as jest.Mock).mockResolvedValueOnce({
        currentGuild: guild,
      });

      await hydrateGuildStore();

      expect(useGuildStore.getState().currentGuild).toEqual(guild);
    });

    it('handles missing data gracefully', async () => {
      (PersistenceManager.loadState as jest.Mock).mockResolvedValueOnce({});

      await hydrateGuildStore();

      expect(useGuildStore.getState().currentGuild).toBeNull();
    });
  });
});

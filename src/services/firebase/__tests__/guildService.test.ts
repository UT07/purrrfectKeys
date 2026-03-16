/**
 * Guild Service Tests
 *
 * Tests Firestore interactions for:
 * - Guild creation and settings
 * - Membership: join, leave, kick, promote, demote
 * - Guild member XP tracking
 * - Guild wars: start, add points, complete
 * - Search and browsing
 */

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'mock-doc-ref'),
  collection: jest.fn(() => 'mock-col-ref'),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  setDoc: jest.fn().mockResolvedValue(undefined),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  query: jest.fn((...args: unknown[]) => args),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  increment: jest.fn((val: number) => ({ _type: 'increment', val })),
  runTransaction: jest.fn(async (_db: unknown, fn: (t: Record<string, unknown>) => Promise<unknown>) => {
    const mockTransaction = {
      get: jest.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'guild-1',
          name: 'Test Guild',
          joinPolicy: 'open',
          memberCount: 5,
          leaderUid: 'leader-uid',
          guildAId: 'guild-a',
          guildBId: 'guild-b',
          guildAWarPoints: 10,
          guildBWarPoints: 5,
          status: 'active',
        }),
      }),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    return fn(mockTransaction);
  }),
}));

jest.mock('../config', () => ({
  db: 'mock-db',
}));

import {
  createGuild,
  getGuild,
  updateGuildSettings,
  searchGuilds,
  getOpenGuilds,
  joinGuild,
  leaveGuild,
  kickMember,
  promoteMember,
  demoteMember,
  getGuildMembers,
  addGuildMemberXp,
  startGuildWar,
  addWarPoints,
  completeGuildWar,
  getActiveWars,
  getWarHistory,
} from '../guildService';

import {
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';

const mockedSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockedGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockedGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockedUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockedRunTransaction = runTransaction as jest.MockedFunction<typeof runTransaction>;

describe('guildService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Guild CRUD
  // -----------------------------------------------------------------------

  describe('createGuild', () => {
    it('creates guild and adds creator as leader', async () => {
      const guild = await createGuild(
        { uid: 'user-1', displayName: 'Alice', catId: 'luna', rankTier: 'performer' },
        { name: 'Cat Lords', icon: '🐱', description: 'Best guild', joinPolicy: 'open', bannerColor: '#6B21A8' },
      );

      expect(guild.name).toBe('Cat Lords');
      expect(guild.leaderUid).toBe('user-1');
      expect(guild.memberCount).toBe(1);
      expect(guild.level).toBe(1);
      expect(guild.joinPolicy).toBe('open');
      expect(mockedSetDoc).toHaveBeenCalledTimes(2); // guild + member
    });
  });

  describe('getGuild', () => {
    it('returns null for non-existent guild', async () => {
      mockedGetDoc.mockResolvedValueOnce({ exists: () => false } as ReturnType<typeof getDoc> extends Promise<infer T> ? T : never);
      const result = await getGuild('non-existent');
      expect(result).toBeNull();
    });

    it('returns guild data when found', async () => {
      const mockGuild = { id: 'g1', name: 'Test Guild', memberCount: 5 };
      mockedGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockGuild,
      } as ReturnType<typeof getDoc> extends Promise<infer T> ? T : never);

      const result = await getGuild('g1');
      expect(result).toEqual(mockGuild);
    });
  });

  describe('updateGuildSettings', () => {
    it('updates guild document with partial data', async () => {
      await updateGuildSettings('guild-1', { name: 'New Name', joinPolicy: 'closed' });
      expect(mockedUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', { name: 'New Name', joinPolicy: 'closed' });
    });
  });

  describe('searchGuilds', () => {
    it('returns matching guilds', async () => {
      const mockGuilds = [{ name: 'Cat Lords' }, { name: 'Cat Masters' }];
      mockedGetDocs.mockResolvedValueOnce({
        docs: mockGuilds.map((g) => ({ data: () => g })),
      } as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never);

      const results = await searchGuilds('Cat');
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Cat Lords');
    });
  });

  describe('getOpenGuilds', () => {
    it('returns open guilds sorted by member count', async () => {
      const mockGuilds = [{ name: 'Big Guild', memberCount: 25 }, { name: 'Small Guild', memberCount: 3 }];
      mockedGetDocs.mockResolvedValueOnce({
        docs: mockGuilds.map((g) => ({ data: () => g })),
      } as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never);

      const results = await getOpenGuilds();
      expect(results).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // Membership
  // -----------------------------------------------------------------------

  describe('joinGuild', () => {
    it('adds user as member via transaction', async () => {
      const member = await joinGuild('guild-1', {
        uid: 'user-2',
        displayName: 'Bob',
        catId: 'jazzy',
        rankTier: 'novice',
      });

      expect(member.uid).toBe('user-2');
      expect(member.role).toBe('member');
      expect(member.weeklyXp).toBe(0);
      expect(mockedRunTransaction).toHaveBeenCalledTimes(1);
    });

    it('rejects join for closed guild', async () => {
      (runTransaction as jest.Mock).mockImplementationOnce(async (_db: unknown, fn: (t: Record<string, unknown>) => Promise<unknown>) => {
        return fn({
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ joinPolicy: 'closed', memberCount: 5 }),
          }),
          set: jest.fn(),
          update: jest.fn(),
        });
      });

      await expect(
        joinGuild('guild-1', { uid: 'u', displayName: 'X', catId: 'c', rankTier: 'novice' }),
      ).rejects.toThrow('Guild is closed');
    });

    it('rejects join for full guild', async () => {
      (runTransaction as jest.Mock).mockImplementationOnce(async (_db: unknown, fn: (t: Record<string, unknown>) => Promise<unknown>) => {
        return fn({
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ joinPolicy: 'open', memberCount: 30 }),
          }),
          set: jest.fn(),
          update: jest.fn(),
        });
      });

      await expect(
        joinGuild('guild-1', { uid: 'u', displayName: 'X', catId: 'c', rankTier: 'novice' }),
      ).rejects.toThrow('Guild is full');
    });
  });

  describe('leaveGuild', () => {
    it('removes member and decrements count', async () => {
      await leaveGuild('guild-1', 'user-2');
      expect(mockedRunTransaction).toHaveBeenCalledTimes(1);
    });

    it('prevents leader from leaving', async () => {
      (runTransaction as jest.Mock).mockImplementationOnce(async (_db: unknown, fn: (t: Record<string, unknown>) => Promise<unknown>) => {
        return fn({
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ leaderUid: 'leader-uid', memberCount: 5 }),
          }),
          update: jest.fn(),
          delete: jest.fn(),
        });
      });

      await expect(leaveGuild('guild-1', 'leader-uid')).rejects.toThrow('Leader must transfer leadership');
    });
  });

  describe('kickMember', () => {
    it('removes member via transaction', async () => {
      await kickMember('guild-1', 'target-uid');
      expect(mockedRunTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('promoteMember', () => {
    it('promotes to co_leader', async () => {
      await promoteMember('guild-1', 'user-2', 'co_leader');
      expect(mockedUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', { role: 'co_leader' });
    });

    it('transfers leadership via transaction', async () => {
      await promoteMember('guild-1', 'user-2', 'leader', 'current-leader');
      expect(mockedRunTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('demoteMember', () => {
    it('demotes to member', async () => {
      await demoteMember('guild-1', 'user-2');
      expect(mockedUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', { role: 'member' });
    });
  });

  describe('getGuildMembers', () => {
    it('returns members ordered by weeklyXp', async () => {
      const mockMembers = [
        { uid: 'a', weeklyXp: 500 },
        { uid: 'b', weeklyXp: 300 },
      ];
      mockedGetDocs.mockResolvedValueOnce({
        docs: mockMembers.map((m) => ({ data: () => m })),
      } as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never);

      const members = await getGuildMembers('guild-1');
      expect(members).toHaveLength(2);
      expect(members[0].uid).toBe('a');
    });
  });

  describe('addGuildMemberXp', () => {
    it('increments member and guild XP via transaction', async () => {
      await addGuildMemberXp('guild-1', 'user-1', 50);
      expect(mockedRunTransaction).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Guild Wars
  // -----------------------------------------------------------------------

  describe('startGuildWar', () => {
    it('creates a war document', async () => {
      const war = await startGuildWar(
        { id: 'guild-a', name: 'Alpha' },
        { id: 'guild-b', name: 'Beta' },
      );

      expect(war.guildAId).toBe('guild-a');
      expect(war.guildBId).toBe('guild-b');
      expect(war.status).toBe('active');
      expect(war.guildAWarPoints).toBe(0);
      expect(war.guildBWarPoints).toBe(0);
      expect(mockedSetDoc).toHaveBeenCalledTimes(1);
    });

    it('sets custom duration', async () => {
      const war = await startGuildWar(
        { id: 'guild-a', name: 'A' },
        { id: 'guild-b', name: 'B' },
        48 * 60 * 60 * 1000,
      );

      expect(war.endsAt - war.startedAt).toBe(48 * 60 * 60 * 1000);
    });
  });

  describe('addWarPoints', () => {
    it('adds points via transaction', async () => {
      await addWarPoints('war-1', 'guild-a', 10);
      expect(mockedRunTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('completeGuildWar', () => {
    it('completes war and determines winner', async () => {
      const war = await completeGuildWar('war-1', 'mvp-uid');

      expect(war.status).toBe('completed');
      expect(war.winnerId).toBe('guild-a'); // 10 > 5 from mock
      expect(war.mvpUid).toBe('mvp-uid');
    });
  });

  describe('getActiveWars', () => {
    it('queries both sides for active wars', async () => {
      const mockWar = { id: 'war-1', guildAId: 'guild-1', status: 'active' };
      mockedGetDocs
        .mockResolvedValueOnce({ docs: [{ data: () => mockWar }] } as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never)
        .mockResolvedValueOnce({ docs: [] } as unknown as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never);

      const wars = await getActiveWars('guild-1');
      expect(wars).toHaveLength(1);
    });
  });

  describe('getWarHistory', () => {
    it('merges and sorts completed wars from both sides', async () => {
      const war1 = { id: 'w1', guildAId: 'guild-1', status: 'completed', startedAt: 100 };
      const war2 = { id: 'w2', guildBId: 'guild-1', status: 'completed', startedAt: 200 };

      mockedGetDocs
        .mockResolvedValueOnce({ docs: [{ data: () => war1 }] } as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never)
        .mockResolvedValueOnce({ docs: [{ data: () => war2 }] } as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never);

      const history = await getWarHistory('guild-1');
      expect(history).toHaveLength(2);
      expect(history[0].startedAt).toBe(200); // most recent first
    });
  });
});

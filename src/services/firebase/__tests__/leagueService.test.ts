/**
 * League Service Tests
 *
 * Tests the pure utility functions in leagueService:
 * - getCurrentWeekMonday() date format and correctness
 */

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn((n: number) => n),
}));

jest.mock('../config', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid' } },
}));

import {
  getCurrentWeekMonday,
  assignToLeague,
  getLeagueStandings,
  addLeagueXp,
} from '../leagueService';
import { doc, setDoc, getDocs, updateDoc, increment, collection } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('leagueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrentWeekMonday', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      const monday = getCurrentWeekMonday();
      expect(monday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns a Monday (day 1 in UTC)', () => {
      const monday = getCurrentWeekMonday();
      const date = new Date(monday + 'T00:00:00Z');
      expect(date.getUTCDay()).toBe(1);
    });

    it('returns a date in the past or today', () => {
      const monday = getCurrentWeekMonday();
      const mondayDate = new Date(monday + 'T00:00:00Z');
      const now = new Date();

      expect(mondayDate.getTime()).toBeLessThanOrEqual(now.getTime());
    });

    it('returns the same Monday within a single week', () => {
      const first = getCurrentWeekMonday();
      const second = getCurrentWeekMonday();
      expect(first).toBe(second);
    });

    it('returns a date at most 6 days before today', () => {
      const monday = getCurrentWeekMonday();
      const mondayDate = new Date(monday + 'T00:00:00Z');
      const now = new Date();

      const diffMs = now.getTime() - mondayDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeLessThan(7);
      expect(diffDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe('assignToLeague', () => {
    it('creates a new league when none have space', async () => {
      // No open leagues found
      (getDocs as jest.Mock).mockResolvedValue({ empty: true, docs: [] });
      // Mock collection() to return a ref with an id
      (collection as jest.Mock).mockReturnValue('leagues-col');
      (doc as jest.Mock).mockReturnValue({ id: 'new-league-123' });
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const membership = await assignToLeague('user-1', 'Alice', 'luna', 'bronze');

      expect(membership.tier).toBe('bronze');
      expect(membership.weeklyXp).toBe(0);
      // setDoc called twice: once for league doc, once for member doc
      expect(setDoc).toHaveBeenCalledTimes(2);
      // updateDoc called once: increment memberCount
      expect(updateDoc).toHaveBeenCalledTimes(1);
    });

    it('joins existing league with space', async () => {
      const mockLeagueSnap = {
        empty: false,
        docs: [
          {
            id: 'existing-league',
            data: () => ({
              tier: 'bronze',
              weekStart: getCurrentWeekMonday(),
              memberCount: 15,
              createdAt: Date.now(),
            }),
          },
        ],
      };
      (getDocs as jest.Mock).mockResolvedValue(mockLeagueSnap);
      (doc as jest.Mock).mockReturnValue({ id: 'existing-league' });
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const membership = await assignToLeague('user-2', 'Bob', 'jazzy');

      expect(membership.leagueId).toBe('existing-league');
      expect(membership.rank).toBe(16); // memberCount + 1
      // setDoc called once: member doc (no league creation)
      expect(setDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('getLeagueStandings', () => {
    it('returns members ranked by weeklyXp descending', async () => {
      const mockMembers = [
        { uid: 'u1', displayName: 'Alice', selectedCatId: 'luna', weeklyXp: 300, joinedAt: 1000 },
        { uid: 'u2', displayName: 'Bob', selectedCatId: 'jazzy', weeklyXp: 200, joinedAt: 2000 },
        { uid: 'u3', displayName: 'Carol', selectedCatId: 'mini-meowww', weeklyXp: 100, joinedAt: 3000 },
      ];
      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockMembers.map((m) => ({ data: () => m })),
      });

      const standings = await getLeagueStandings('league-abc');

      expect(standings).toHaveLength(3);
      expect(standings[0].rank).toBe(1);
      expect(standings[0].uid).toBe('u1');
      expect(standings[1].rank).toBe(2);
      expect(standings[2].rank).toBe(3);
    });

    it('returns empty array for empty league', async () => {
      (getDocs as jest.Mock).mockResolvedValue({ docs: [] });

      const standings = await getLeagueStandings('empty-league');
      expect(standings).toEqual([]);
    });
  });

  describe('addLeagueXp', () => {
    it('calls updateDoc with increment for the member', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await addLeagueXp('league-abc', 'user-1', 50);

      expect(updateDoc).toHaveBeenCalledTimes(1);
      expect(increment).toHaveBeenCalledWith(50);
    });
  });
});

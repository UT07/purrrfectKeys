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

import { getCurrentWeekMonday } from '../leagueService';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('leagueService', () => {
  describe('getCurrentWeekMonday', () => {
    it('returns a string in YYYY-MM-DD format', () => {
      const monday = getCurrentWeekMonday();
      expect(monday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns a Monday (day 1 in UTC)', () => {
      const monday = getCurrentWeekMonday();
      const date = new Date(monday + 'T00:00:00Z');
      // getUTCDay(): 0=Sunday, 1=Monday
      expect(date.getUTCDay()).toBe(1);
    });

    it('returns a date in the past or today', () => {
      const monday = getCurrentWeekMonday();
      const mondayDate = new Date(monday + 'T00:00:00Z');
      const now = new Date();

      expect(mondayDate.getTime()).toBeLessThanOrEqual(now.getTime());
    });

    it('returns the same Monday within a single week', () => {
      // Calling twice should return the same value (deterministic within same week)
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

      // Monday should be at most 6 days ago (Sunday case)
      expect(diffDays).toBeLessThan(7);
      expect(diffDays).toBeGreaterThanOrEqual(0);
    });
  });
});

/**
 * Social Service Tests
 *
 * Tests the pure utility functions in socialService:
 * - generateFriendCode() character set and length
 * - Code uniqueness across many generations
 */

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  collection: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
}));

jest.mock('../config', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid' } },
}));

import { generateFriendCode } from '../socialService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const EXCLUDED_CHARS = ['I', 'O', '0', '1'];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('socialService', () => {
  describe('generateFriendCode', () => {
    it('generates a 6-character code', () => {
      const code = generateFriendCode();
      expect(code).toHaveLength(6);
    });

    it('only uses characters from the allowed alphabet', () => {
      // Generate many codes and check every character
      for (let i = 0; i < 100; i++) {
        const code = generateFriendCode();
        for (const char of code) {
          expect(VALID_CHARS).toContain(char);
        }
      }
    });

    it('never includes ambiguous characters (I, O, 0, 1)', () => {
      for (let i = 0; i < 200; i++) {
        const code = generateFriendCode();
        for (const excluded of EXCLUDED_CHARS) {
          expect(code).not.toContain(excluded);
        }
      }
    });

    it('generates mostly unique codes (>90% unique in 100 iterations)', () => {
      const codes = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        codes.add(generateFriendCode());
      }

      // With 31^6 = ~887 million possible codes, collisions in 100 should be extremely rare
      const uniqueRatio = codes.size / iterations;
      expect(uniqueRatio).toBeGreaterThan(0.9);
    });

    it('generates only uppercase letters and digits', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateFriendCode();
        expect(code).toMatch(/^[A-Z2-9]+$/);
      }
    });
  });
});

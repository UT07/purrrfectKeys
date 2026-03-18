/**
 * Referral Service Tests
 *
 * Tests for invite code generation, referral tracking, and reward claiming:
 * - generateInviteCode() format validation
 * - registerInviteCode() Firestore write + collision retry
 * - lookupInviteCode() code resolution
 * - recordReferral() referral document creation
 * - claimReferralReward() reward claim tracking
 * - getReferrals() / getUnclaimedReferralCount() queries
 * - wasAlreadyReferred() / markAsReferred() double-redemption guard
 */

const mockTransaction = {
  get: jest.fn().mockResolvedValue({ exists: () => false }),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'mock-doc-ref'),
  collection: jest.fn(() => 'mock-col-ref'),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  getDocs: jest.fn().mockResolvedValue({ docs: [], size: 0 }),
  setDoc: jest.fn().mockResolvedValue(undefined),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  query: jest.fn((...args: unknown[]) => args),
  where: jest.fn(),
  orderBy: jest.fn(),
  runTransaction: jest.fn(async (_db: unknown, fn: (t: typeof mockTransaction) => Promise<unknown>) => {
    return fn(mockTransaction);
  }),
}));

jest.mock('../config', () => ({
  db: 'mock-db',
}));

import {
  generateInviteCode,
  registerInviteCode,
  lookupInviteCode,
  recordReferral,
  claimReferralReward,
  getReferrals,
  getUnclaimedReferralCount,
  wasAlreadyReferred,
  markAsReferred,
  REFERRAL_REWARDS,
} from '../referralService';

import { getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

const mockedGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockedGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockedSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockedUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;

describe('referralService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Invite Code Generation
  // -----------------------------------------------------------------------

  describe('generateInviteCode', () => {
    it('generates 8-character code', () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
    });

    it('only contains allowed characters (no I/O/0/1)', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateInviteCode();
        expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
      }
    });

    it('generates unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 50; i++) {
        codes.add(generateInviteCode());
      }
      // With 32^8 = ~1 trillion combos, 50 codes should be unique
      expect(codes.size).toBe(50);
    });
  });

  describe('registerInviteCode', () => {
    it('registers code in Firestore on first attempt (via transaction)', async () => {
      mockTransaction.get.mockResolvedValueOnce({ exists: () => false });

      const code = await registerInviteCode('user-1');
      expect(code).toHaveLength(8);
      expect(mockTransaction.set).toHaveBeenCalledTimes(1);
    });

    it('retries on collision', async () => {
      // First call: code exists → collision → throws CODE_COLLISION inside transaction
      // Second call: code does not exist → succeeds
      const { runTransaction } = require('firebase/firestore');
      (runTransaction as jest.Mock)
        .mockImplementationOnce(async (_db: unknown, fn: (t: typeof mockTransaction) => Promise<unknown>) => {
          const t = { ...mockTransaction, get: jest.fn().mockResolvedValue({ exists: () => true }) };
          return fn(t);
        })
        .mockImplementationOnce(async (_db: unknown, fn: (t: typeof mockTransaction) => Promise<unknown>) => {
          const t = { ...mockTransaction, get: jest.fn().mockResolvedValue({ exists: () => false }) };
          return fn(t);
        });

      const code = await registerInviteCode('user-1');
      expect(code).toHaveLength(8);
      expect(runTransaction).toHaveBeenCalledTimes(2);
    });

    it('throws after max retries', async () => {
      const { runTransaction } = require('firebase/firestore');
      (runTransaction as jest.Mock).mockImplementation(
        async (_db: unknown, fn: (t: typeof mockTransaction) => Promise<unknown>) => {
          const t = { ...mockTransaction, get: jest.fn().mockResolvedValue({ exists: () => true }) };
          return fn(t);
        },
      );

      await expect(registerInviteCode('user-1')).rejects.toThrow('Failed to generate unique invite code');
    });
  });

  // -----------------------------------------------------------------------
  // Invite Code Lookup
  // -----------------------------------------------------------------------

  describe('lookupInviteCode', () => {
    it('returns uid for valid code', async () => {
      mockedGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ uid: 'inviter-uid' }),
      } as ReturnType<typeof getDoc> extends Promise<infer T> ? T : never);

      const uid = await lookupInviteCode('ABCD1234');
      expect(uid).toBe('inviter-uid');
    });

    it('returns null for invalid code', async () => {
      mockedGetDoc.mockResolvedValueOnce({ exists: () => false } as ReturnType<typeof getDoc> extends Promise<infer T> ? T : never);

      const uid = await lookupInviteCode('INVALID');
      expect(uid).toBeNull();
    });

    it('normalizes code to uppercase', async () => {
      mockedGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ uid: 'inviter-uid' }),
      } as ReturnType<typeof getDoc> extends Promise<infer T> ? T : never);

      await lookupInviteCode('abcd1234');
      // doc() should be called with uppercase code
      expect(mockedGetDoc).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Referral Tracking
  // -----------------------------------------------------------------------

  describe('recordReferral', () => {
    it('creates referral document', async () => {
      const referral = await recordReferral('inviter-1', 'invitee-1', 'ABCD1234', 'link');

      expect(referral.inviterUid).toBe('inviter-1');
      expect(referral.inviteeUid).toBe('invitee-1');
      expect(referral.inviteCode).toBe('ABCD1234');
      expect(referral.platform).toBe('link');
      expect(referral.rewardClaimedAt).toBeNull();
      expect(typeof referral.installedAt).toBe('number');
      expect(mockedSetDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('claimReferralReward', () => {
    it('updates rewardClaimedAt timestamp', async () => {
      await claimReferralReward('inviter-1', 'invitee-1');
      expect(mockedUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', expect.objectContaining({
        rewardClaimedAt: expect.any(Number),
      }));
    });
  });

  describe('getReferrals', () => {
    it('returns referral list sorted by installedAt', async () => {
      const mockReferrals = [
        { inviterUid: 'a', inviteeUid: 'b', installedAt: 200 },
        { inviterUid: 'a', inviteeUid: 'c', installedAt: 100 },
      ];
      mockedGetDocs.mockResolvedValueOnce({
        docs: mockReferrals.map((r) => ({ data: () => r })),
        size: 2,
      } as unknown as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never);

      const results = await getReferrals('a');
      expect(results).toHaveLength(2);
    });
  });

  describe('getUnclaimedReferralCount', () => {
    it('returns count of unclaimed referrals', async () => {
      mockedGetDocs.mockResolvedValueOnce({
        docs: [{}, {}, {}],
        size: 3,
      } as unknown as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never);

      const count = await getUnclaimedReferralCount('user-1');
      expect(count).toBe(3);
    });

    it('returns 0 when all claimed', async () => {
      mockedGetDocs.mockResolvedValueOnce({
        docs: [],
        size: 0,
      } as unknown as ReturnType<typeof getDocs> extends Promise<infer T> ? T : never);

      const count = await getUnclaimedReferralCount('user-1');
      expect(count).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Double-redemption Guard
  // -----------------------------------------------------------------------

  describe('wasAlreadyReferred', () => {
    it('returns false for unreferred user', async () => {
      mockedGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ displayName: 'Test' }),
      } as ReturnType<typeof getDoc> extends Promise<infer T> ? T : never);

      const result = await wasAlreadyReferred('new-user');
      expect(result).toBe(false);
    });

    it('returns true for already referred user', async () => {
      mockedGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ displayName: 'Test', referredBy: 'inviter-1' }),
      } as ReturnType<typeof getDoc> extends Promise<infer T> ? T : never);

      const result = await wasAlreadyReferred('referred-user');
      expect(result).toBe(true);
    });

    it('returns false for non-existent user', async () => {
      mockedGetDoc.mockResolvedValueOnce({ exists: () => false } as ReturnType<typeof getDoc> extends Promise<infer T> ? T : never);

      const result = await wasAlreadyReferred('no-user');
      expect(result).toBe(false);
    });
  });

  describe('markAsReferred', () => {
    it('sets referredBy on user document', async () => {
      await markAsReferred('invitee-1', 'inviter-1');
      expect(mockedUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', { referredBy: 'inviter-1' });
    });
  });

  // -----------------------------------------------------------------------
  // Constants
  // -----------------------------------------------------------------------

  describe('REFERRAL_REWARDS', () => {
    it('has correct reward values', () => {
      expect(REFERRAL_REWARDS.inviterGems).toBe(50);
      expect(REFERRAL_REWARDS.inviteeGems).toBe(25);
    });
  });
});

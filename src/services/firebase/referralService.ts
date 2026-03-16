/**
 * Referral Service — Contact invites and referral reward tracking
 *
 * Firestore paths:
 *   inviteCodes/{code}                    — { uid, createdAt } mapping
 *   users/{uid}/referrals/{inviteeUid}    — Referral document (tracks reward status)
 *
 * Flow:
 * 1. User generates an invite code (8-char alphanumeric)
 * 2. Shares via SMS/WhatsApp/social/QR/link
 * 3. Invitee installs and redeems code during onboarding
 * 4. Both inviter and invitee receive gem rewards
 */

import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from './config';
import type { Referral } from '../../stores/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 to avoid confusion
const MAX_CODE_RETRIES = 5;

export const REFERRAL_REWARDS = {
  inviterGems: 50,
  inviteeGems: 25,
} as const;

// ---------------------------------------------------------------------------
// Invite Code Generation
// ---------------------------------------------------------------------------

/**
 * Generate a random 8-character invite code.
 */
export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * INVITE_CODE_ALPHABET.length);
    code += INVITE_CODE_ALPHABET[index];
  }
  return code;
}

/**
 * Register an invite code for a user. Retries on collision.
 * Stores at inviteCodes/{code} -> { uid, createdAt }.
 */
export async function registerInviteCode(uid: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const code = generateInviteCode();
    const codeRef = doc(db, 'inviteCodes', code);
    const existing = await getDoc(codeRef);

    if (!existing.exists()) {
      await setDoc(codeRef, { uid, createdAt: Date.now() });
      return code;
    }
  }

  throw new Error('Failed to generate unique invite code after maximum retries');
}

/**
 * Look up who owns an invite code.
 */
export async function lookupInviteCode(code: string): Promise<string | null> {
  const normalized = code.toUpperCase().trim();
  const codeRef = doc(db, 'inviteCodes', normalized);
  const snap = await getDoc(codeRef);

  if (!snap.exists()) return null;
  return (snap.data() as { uid: string }).uid;
}

// ---------------------------------------------------------------------------
// Referral Tracking
// ---------------------------------------------------------------------------

/**
 * Record a referral when an invitee redeems an invite code.
 * Creates referral doc under both inviter and invitee.
 */
export async function recordReferral(
  inviterUid: string,
  inviteeUid: string,
  inviteCode: string,
  platform: Referral['platform'],
): Promise<Referral> {
  const now = Date.now();

  const referral: Referral = {
    inviterUid,
    inviteeUid,
    inviteCode,
    installedAt: now,
    rewardClaimedAt: null,
    platform,
  };

  // Store under inviter's referrals subcollection
  const inviterRef = doc(db, 'users', inviterUid, 'referrals', inviteeUid);
  await setDoc(inviterRef, referral);

  return referral;
}

/**
 * Mark referral rewards as claimed.
 */
export async function claimReferralReward(
  inviterUid: string,
  inviteeUid: string,
): Promise<void> {
  const ref = doc(db, 'users', inviterUid, 'referrals', inviteeUid);
  await updateDoc(ref, { rewardClaimedAt: Date.now() });
}

/**
 * Get all referrals for a user (as inviter).
 */
export async function getReferrals(uid: string): Promise<Referral[]> {
  const col = collection(db, 'users', uid, 'referrals');
  const q = query(col, orderBy('installedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Referral);
}

/**
 * Get unclaimed referral count (for badge/notification display).
 */
export async function getUnclaimedReferralCount(uid: string): Promise<number> {
  const col = collection(db, 'users', uid, 'referrals');
  const q = query(col, where('rewardClaimedAt', '==', null));
  const snap = await getDocs(q);
  return snap.size;
}

/**
 * Check if a user was already referred (prevent double-redemption).
 */
export async function wasAlreadyReferred(inviteeUid: string): Promise<boolean> {
  // Check if this invitee appears in any inviter's referrals
  // For efficiency, we store a marker on the invitee's user document
  const userRef = doc(db, 'users', inviteeUid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) return false;
  const data = snap.data() as Record<string, unknown>;
  return !!data.referredBy;
}

/**
 * Mark invitee as referred (prevents double-redemption).
 */
export async function markAsReferred(
  inviteeUid: string,
  inviterUid: string,
): Promise<void> {
  const userRef = doc(db, 'users', inviteeUid);
  await updateDoc(userRef, { referredBy: inviterUid });
}

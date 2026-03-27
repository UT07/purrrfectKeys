/**
 * Social Service — Firestore CRUD for friends, friend codes, activity feed, challenges
 *
 * Firestore paths:
 *   friendCodes/{code}                   — { uid } mapping for 6-char alphanumeric codes
 *   users/{uid}/friends/{friendUid}      — FriendConnection document
 *   users/{uid}/activity/{activityId}    — ActivityFeedItem document
 *   challenges/{challengeId}             — FriendChallenge document
 */

import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { db } from './config';
import type { FriendConnection, ActivityFeedItem, FriendChallenge } from '../../stores/types';

// ---------------------------------------------------------------------------
// Friend Code Alphabet — excludes ambiguous chars: I, O, 0, 1
// ---------------------------------------------------------------------------

const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const FRIEND_CODE_LENGTH = 6;
const MAX_CODE_RETRIES = 5;

// ---------------------------------------------------------------------------
// Username Validation
// ---------------------------------------------------------------------------

const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/;

/** Validate username format: 3-20 chars, lowercase alphanumeric + underscore + hyphen */
export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

// ---------------------------------------------------------------------------
// Friend Code Operations
// ---------------------------------------------------------------------------

/**
 * Generate a random 6-character alphanumeric friend code.
 * Uses a restricted alphabet (no I/O/0/1) to avoid ambiguity.
 * Uses Math.random() — friend codes are short-lived lookup keys,
 * not security-critical tokens, so cryptographic randomness is unnecessary.
 */
export function generateFriendCode(): string {
  let code = '';
  for (let i = 0; i < FRIEND_CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * FRIEND_CODE_ALPHABET.length);
    code += FRIEND_CODE_ALPHABET[index];
  }
  return code;
}

/**
 * Register a friend code for a user. Retries up to 5 times on collision.
 * Writes to friendCodes/{code} -> { uid }.
 * Returns the successfully registered code.
 */
export async function registerFriendCode(uid: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const code = generateFriendCode();
    const codeRef = doc(db, 'friendCodes', code);

    try {
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(codeRef);
        if (existing.exists()) {
          throw new Error('CODE_COLLISION');
        }
        transaction.set(codeRef, { uid });
      });
      return code;
    } catch (err) {
      if ((err as Error)?.message === 'CODE_COLLISION') continue;
      throw err;
    }
  }

  throw new Error('Failed to generate unique friend code after maximum retries');
}

// ---------------------------------------------------------------------------
// Username Operations
// ---------------------------------------------------------------------------

/**
 * Check if a username is available.
 * Reads usernames/{username_lowercase} to see if it exists.
 */
export async function checkUsernameAvailable(username: string, currentUid?: string): Promise<boolean> {
  const normalized = username.toLowerCase();
  if (!isValidUsername(normalized)) return false;

  const usernameRef = doc(db, 'usernames', normalized);
  const snap = await getDoc(usernameRef);
  if (!snap.exists()) return true;
  // If the username belongs to the current user, it's "available" (they can keep it)
  if (currentUid && snap.data()?.uid === currentUid) return true;
  return false;
}

/**
 * Register a username for a user. Writes to:
 *   usernames/{username} -> { uid, createdAt }
 *   users/{uid}.username  -> username
 *
 * Throws if username is already taken or invalid.
 */
export async function registerUsername(
  uid: string,
  username: string,
  displayName: string,
): Promise<void> {
  const normalized = username.toLowerCase();
  if (!isValidUsername(normalized)) {
    throw new Error('Invalid username format');
  }

  const usernameRef = doc(db, 'usernames', normalized);
  const userRef = doc(db, 'users', uid);

  // Use a transaction to atomically check availability and claim the username.
  // This prevents TOCTOU races where two users check the same name simultaneously.
  // Also allows re-claiming if the username belongs to the same user (idempotent)
  // or if the old owner no longer has a Firestore profile (orphaned anonymous account).
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(usernameRef);
    if (existing.exists()) {
      const existingUid = existing.data()?.uid;
      if (existingUid === uid) {
        // Already owned by this user — just update the user profile
        transaction.update(userRef, { username: normalized, displayName });
        return;
      }
      // Check if the existing owner's profile still exists (not an orphaned account)
      const oldOwnerRef = doc(db, 'users', existingUid);
      const oldOwner = await transaction.get(oldOwnerRef);
      if (oldOwner.exists()) {
        throw new Error('Username already taken');
      }
      // Old owner's profile doesn't exist — re-claim the username
    }

    transaction.set(usernameRef, { uid, createdAt: Date.now() });
    transaction.update(userRef, { username: normalized, displayName });
  });
}

/**
 * Look up a uid from a username or legacy friend code.
 * Tries username lookup first (if input looks like a username),
 * then falls back to legacy friend code lookup.
 * Returns the uid if found, or null.
 */
export async function lookupFriendCode(code: string): Promise<string | null> {
  const trimmed = code.trim();

  // Try username lookup first (lowercase, 3-20 chars)
  const asUsername = trimmed.toLowerCase();
  if (isValidUsername(asUsername)) {
    const usernameRef = doc(db, 'usernames', asUsername);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) {
      const data = usernameSnap.data() as { uid: string };
      return data.uid;
    }
  }

  // Fall back to legacy 6-char friend code
  const asCode = trimmed.toUpperCase();
  const codeRef = doc(db, 'friendCodes', asCode);
  const snap = await getDoc(codeRef);

  if (!snap.exists()) return null;

  const data = snap.data() as { uid: string };
  return data.uid;
}

/**
 * Get a user's public profile (display name + selected cat).
 * Used when sending friend requests to populate the outgoing connection.
 *
 * Reads displayName from the user doc root, and selectedCatId from the
 * gamification/catEvolution subcollection (where syncService stores it).
 */
export async function getUserPublicProfile(
  uid: string,
): Promise<{ displayName: string; selectedCatId: string } | null> {
  const userRef = doc(db, 'users', uid);
  const catRef = doc(db, 'users', uid, 'gamification', 'catEvolution');

  const [userSnap, catSnap] = await Promise.all([
    getDoc(userRef),
    // catEvolution is owner-read-only — gracefully handle permission denied
    // when viewing another user's profile for friend requests
    getDoc(catRef).catch(() => null),
  ]);

  if (!userSnap.exists()) return null;

  const userData = userSnap.data();
  const catData = catSnap != null && catSnap.exists() ? catSnap.data() : null;

  return {
    displayName: (userData.displayName as string) || 'Player',
    selectedCatId: (catData?.selectedCatId as string) || (userData.settings?.selectedCatId as string) || '',
  };
}

// ---------------------------------------------------------------------------
// Friend Connection Operations
// ---------------------------------------------------------------------------

/**
 * Send a friend request. Writes to both users' friends subcollections:
 *   users/{fromUid}/friends/{toUid}   — status: pending_outgoing
 *   users/{toUid}/friends/{fromUid}   — status: pending_incoming
 */
export async function sendFriendRequest(
  fromUid: string,
  toUid: string,
  fromDisplayName: string,
  fromCatId: string,
  toDisplayName: string,
  toCatId: string,
): Promise<void> {
  if (fromUid === toUid) {
    throw new Error('Cannot send friend request to yourself');
  }

  const now = Date.now();

  const outgoingRef = doc(db, 'users', fromUid, 'friends', toUid);
  const incomingRef = doc(db, 'users', toUid, 'friends', fromUid);

  const outgoing: FriendConnection = {
    uid: toUid,
    displayName: toDisplayName,
    selectedCatId: toCatId,
    status: 'pending_outgoing',
    connectedAt: now,
  };

  const incoming: FriendConnection = {
    uid: fromUid,
    displayName: fromDisplayName,
    selectedCatId: fromCatId,
    status: 'pending_incoming',
    connectedAt: now,
  };

  const batch = writeBatch(db);
  batch.set(outgoingRef, outgoing);
  batch.set(incomingRef, incoming);
  await batch.commit();
}

/**
 * Accept a pending friend request. Updates both sides to 'accepted'.
 */
export async function acceptFriendRequest(
  myUid: string,
  friendUid: string,
): Promise<void> {
  const myRef = doc(db, 'users', myUid, 'friends', friendUid);
  const friendRef = doc(db, 'users', friendUid, 'friends', myUid);

  const now = Date.now();

  const batch = writeBatch(db);
  batch.update(myRef, { status: 'accepted', connectedAt: now });
  batch.update(friendRef, { status: 'accepted', connectedAt: now });
  await batch.commit();
}

/**
 * Remove a friend connection. Deletes documents on both sides.
 */
export async function removeFriendConnection(
  myUid: string,
  friendUid: string,
): Promise<void> {
  const myRef = doc(db, 'users', myUid, 'friends', friendUid);
  const friendRef = doc(db, 'users', friendUid, 'friends', myUid);

  const batch = writeBatch(db);
  batch.delete(myRef);
  batch.delete(friendRef);
  await batch.commit();
}

/**
 * Get all friend connections for a user.
 */
export async function getFriends(uid: string): Promise<FriendConnection[]> {
  const friendsCol = collection(db, 'users', uid, 'friends');
  const snap = await getDocs(friendsCol);

  return snap.docs.map((d) => d.data() as FriendConnection);
}

// ---------------------------------------------------------------------------
// Activity Feed Operations
// ---------------------------------------------------------------------------

/**
 * Post an activity item to a user's activity feed.
 * Writes to users/{uid}/activity/{item.id}.
 */
export async function postActivity(
  uid: string,
  item: ActivityFeedItem,
): Promise<void> {
  const activityRef = doc(db, 'users', uid, 'activity', item.id);
  await setDoc(activityRef, item);
}

/**
 * Get recent activity items from a friend's feed.
 * Returns items ordered by timestamp descending, limited to maxItems.
 */
export async function getFriendActivity(
  friendUid: string,
  maxItems: number = 20,
): Promise<ActivityFeedItem[]> {
  const activityCol = collection(db, 'users', friendUid, 'activity');
  const q = query(activityCol, orderBy('timestamp', 'desc'), limit(maxItems));
  const snap = await getDocs(q);

  return snap.docs.map((d) => d.data() as ActivityFeedItem);
}

// ---------------------------------------------------------------------------
// Friend Challenge Operations
// ---------------------------------------------------------------------------

/**
 * Create a friend challenge.
 * Writes to challenges/{challenge.id}.
 */
export async function createChallenge(challenge: FriendChallenge): Promise<void> {
  const challengeRef = doc(db, 'challenges', challenge.id);
  await setDoc(challengeRef, challenge);
}

/**
 * Get all challenges involving a user (as sender or receiver).
 * Queries by fromUid and toUid separately, then deduplicates.
 */
export async function getChallengesForUser(uid: string): Promise<FriendChallenge[]> {
  const challengesCol = collection(db, 'challenges');

  const fromQuery = query(challengesCol, where('fromUid', '==', uid));
  const toQuery = query(challengesCol, where('toUid', '==', uid));

  const [fromSnap, toSnap] = await Promise.all([
    getDocs(fromQuery),
    getDocs(toQuery),
  ]);

  const challengeMap = new Map<string, FriendChallenge>();

  for (const d of fromSnap.docs) {
    const challenge = d.data() as FriendChallenge;
    challengeMap.set(challenge.id, challenge);
  }
  for (const d of toSnap.docs) {
    const challenge = d.data() as FriendChallenge;
    challengeMap.set(challenge.id, challenge);
  }

  return Array.from(challengeMap.values());
}

/**
 * Update a challenge with the recipient's score and mark as completed.
 */
export async function updateChallengeResult(
  challengeId: string,
  toScore: number,
): Promise<void> {
  const challengeRef = doc(db, 'challenges', challengeId);
  await updateDoc(challengeRef, {
    toScore,
    status: 'completed',
  });
}

/**
 * Resolve gem stake for a completed challenge.
 * Determines the winner (higher score wins, tie goes to challenger),
 * updates the challenge doc with winnerUid/winnerGems/resolvedAt,
 * and returns the result so the caller can award gems locally.
 *
 * Uses a Firestore transaction to atomically read-check-write, preventing
 * duplicate resolution if two clients call this concurrently (race condition).
 *
 * Returns null if the challenge has no stake or was already resolved.
 */
export async function resolveChallengeGemStake(
  challengeId: string,
  fromScore: number,
  toScore: number,
  fromUid: string,
  toUid: string,
): Promise<{ winnerUid: string; winnerGems: number } | null> {
  const challengeRef = doc(db, 'challenges', challengeId);

  let result: { winnerUid: string; winnerGems: number } | null = null;

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(challengeRef);

    if (!snap.exists()) return;

    const challenge = snap.data() as FriendChallenge;
    if (!challenge.gemStake || challenge.gemStake <= 0) return;
    if (challenge.resolvedAt) return; // Already resolved — idempotent guard

    // Higher score wins; tie goes to challenger (fromUid)
    const winnerUid = toScore > fromScore ? toUid : fromUid;
    const winnerGems = challenge.gemStake * 2;

    transaction.update(challengeRef, {
      winnerUid,
      winnerGems,
      resolvedAt: Date.now(),
    });

    result = { winnerUid, winnerGems };
  });

  return result;
}

/**
 * Delete all challenges between two users.
 * Called when a friend connection is removed.
 */
export async function deleteChallengesBetweenUsers(
  uidA: string,
  uidB: string,
): Promise<void> {
  const challengesCol = collection(db, 'challenges');

  // Query challenges where uidA sent to uidB or uidB sent to uidA
  const abQuery = query(
    challengesCol,
    where('fromUid', '==', uidA),
    where('toUid', '==', uidB),
  );
  const baQuery = query(
    challengesCol,
    where('fromUid', '==', uidB),
    where('toUid', '==', uidA),
  );

  const [abSnap, baSnap] = await Promise.all([
    getDocs(abQuery),
    getDocs(baQuery),
  ]);

  if (abSnap.empty && baSnap.empty) return;

  const batch = writeBatch(db);
  for (const d of abSnap.docs) batch.delete(d.ref);
  for (const d of baSnap.docs) batch.delete(d.ref);
  await batch.commit();
}

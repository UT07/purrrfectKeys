/**
 * Guild Service — Firestore CRUD for guilds, members, and guild wars
 *
 * Firestore paths:
 *   guilds/{guildId}                    — Guild document
 *   guilds/{guildId}/members/{uid}      — Member document
 *   guildWars/{warId}                   — Guild war document
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
  limit,
  increment,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { Guild, GuildMember, GuildWar, RankedTier } from '../../stores/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_GUILD_MEMBERS = 30;

// ---------------------------------------------------------------------------
// Guild CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new guild. The creator becomes the leader.
 */
export async function createGuild(
  creator: { uid: string; displayName: string; catId: string; rankTier: RankedTier },
  guildData: { name: string; icon: string; description: string; joinPolicy: Guild['joinPolicy']; bannerColor: string },
): Promise<Guild> {
  const guildRef = doc(collection(db, 'guilds'));
  const now = Date.now();

  const guild: Guild = {
    id: guildRef.id,
    name: guildData.name,
    icon: guildData.icon,
    description: guildData.description,
    joinPolicy: guildData.joinPolicy,
    leaderUid: creator.uid,
    level: 1,
    guildXp: 0,
    memberCount: 1,
    weeklyXp: 0,
    minWeeklyXp: 0,
    bannerColor: guildData.bannerColor,
    createdAt: now,
  };

  // Denormalized lowercase name for case-insensitive search
  const guildWithSearch = { ...guild, nameLowerCase: guildData.name.toLowerCase() };

  const member: GuildMember = {
    uid: creator.uid,
    displayName: creator.displayName,
    catId: creator.catId,
    rankTier: creator.rankTier,
    role: 'leader',
    weeklyXp: 0,
    totalGuildXp: 0,
    joinedAt: now,
    lastActiveAt: now,
    warStrikes: 0,
  };

  const batch = writeBatch(db);
  batch.set(guildRef, guildWithSearch);
  batch.set(doc(db, 'guilds', guildRef.id, 'members', creator.uid), member);
  await batch.commit();

  return guild;
}

/**
 * Get a guild by ID.
 */
export async function getGuild(guildId: string): Promise<Guild | null> {
  const snap = await getDoc(doc(db, 'guilds', guildId));
  if (!snap.exists()) return null;
  return snap.data() as Guild;
}

/**
 * Update guild settings (name, description, joinPolicy, icon, bannerColor, minWeeklyXp).
 */
export async function updateGuildSettings(
  guildId: string,
  updates: Partial<Pick<Guild, 'name' | 'description' | 'joinPolicy' | 'icon' | 'bannerColor' | 'minWeeklyXp'>>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firestoreUpdates: Record<string, any> = { ...updates };
  if (updates.name) {
    firestoreUpdates.nameLowerCase = updates.name.toLowerCase();
  }
  await updateDoc(doc(db, 'guilds', guildId), firestoreUpdates);
}

/**
 * Search guilds by name prefix (case-insensitive via nameLowerCase field).
 *
 * Requires guilds to store a `nameLowerCase` field alongside `name`.
 * createGuild() and updateGuildSettings() maintain this field automatically.
 */
export async function searchGuilds(namePrefix: string, maxResults: number = 20): Promise<Guild[]> {
  const col = collection(db, 'guilds');
  const lower = namePrefix.toLowerCase();
  const end = lower + '\uf8ff';
  const q = query(
    col,
    where('nameLowerCase', '>=', lower),
    where('nameLowerCase', '<=', end),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Guild);
}

/**
 * Get open guilds (joinPolicy == 'open') for browsing.
 */
export async function getOpenGuilds(maxResults: number = 20): Promise<Guild[]> {
  const col = collection(db, 'guilds');
  const q = query(
    col,
    where('joinPolicy', '==', 'open'),
    orderBy('memberCount', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Guild);
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

/**
 * Join a guild. Validates join policy and capacity.
 */
export async function joinGuild(
  guildId: string,
  user: { uid: string; displayName: string; catId: string; rankTier: RankedTier },
): Promise<GuildMember> {
  const guildRef = doc(db, 'guilds', guildId);

  return runTransaction(db, async (transaction) => {
    const guildSnap = await transaction.get(guildRef);
    if (!guildSnap.exists()) throw new Error('Guild not found');

    const guild = guildSnap.data() as Guild;
    if (guild.joinPolicy === 'closed') throw new Error('Guild is closed');
    if (guild.joinPolicy === 'invite_only') throw new Error('Guild is invite-only');
    if (guild.memberCount >= MAX_GUILD_MEMBERS) throw new Error('Guild is full');

    const now = Date.now();
    const member: GuildMember = {
      uid: user.uid,
      displayName: user.displayName,
      catId: user.catId,
      rankTier: user.rankTier,
      role: 'member',
      weeklyXp: 0,
      totalGuildXp: 0,
      joinedAt: now,
      lastActiveAt: now,
      warStrikes: 0,
    };

    transaction.update(guildRef, { memberCount: increment(1) });
    transaction.set(doc(db, 'guilds', guildId, 'members', user.uid), member);

    return member;
  });
}

/**
 * Leave a guild. Leaders cannot leave — must transfer leadership first.
 */
export async function leaveGuild(guildId: string, uid: string): Promise<void> {
  const guildRef = doc(db, 'guilds', guildId);

  await runTransaction(db, async (transaction) => {
    const guildSnap = await transaction.get(guildRef);
    if (!guildSnap.exists()) throw new Error('Guild not found');

    const guild = guildSnap.data() as Guild;
    if (guild.leaderUid === uid) throw new Error('Leader must transfer leadership before leaving');

    transaction.update(guildRef, { memberCount: increment(-1) });
    transaction.delete(doc(db, 'guilds', guildId, 'members', uid));
  });
}

/**
 * Kick a member from a guild. Only leader/co_leader can kick.
 */
export async function kickMember(guildId: string, targetUid: string, callerUid: string): Promise<void> {
  if (!callerUid) throw new Error('callerUid is required to kick a member');
  const guildRef = doc(db, 'guilds', guildId);

  await runTransaction(db, async (transaction) => {
    const guildSnap = await transaction.get(guildRef);
    if (!guildSnap.exists()) throw new Error('Guild not found');

    // Verify caller has authority to kick (leader or co_leader)
    const callerRef = doc(db, 'guilds', guildId, 'members', callerUid);
    const callerSnap = await transaction.get(callerRef);
    if (!callerSnap.exists()) throw new Error('Caller is not a member');
    const callerRole = (callerSnap.data() as GuildMember).role;
    if (callerRole !== 'leader' && callerRole !== 'co_leader') {
      throw new Error('Only leaders and co-leaders can kick members');
    }

    const guild = guildSnap.data() as Guild;
    if (targetUid === guild.leaderUid) throw new Error('Cannot kick the guild leader');

    transaction.update(guildRef, { memberCount: increment(-1) });
    transaction.delete(doc(db, 'guilds', guildId, 'members', targetUid));
  });
}

/**
 * Promote a member to co_leader or transfer leadership.
 */
export async function promoteMember(
  guildId: string,
  targetUid: string,
  newRole: 'co_leader' | 'leader',
  currentLeaderUid?: string,
): Promise<void> {
  const memberRef = doc(db, 'guilds', guildId, 'members', targetUid);

  if (newRole === 'leader' && currentLeaderUid) {
    // Transfer leadership: demote current leader to co_leader
    const guildRef = doc(db, 'guilds', guildId);
    const currentLeaderRef = doc(db, 'guilds', guildId, 'members', currentLeaderUid);

    await runTransaction(db, async (transaction) => {
      transaction.update(guildRef, { leaderUid: targetUid });
      transaction.update(currentLeaderRef, { role: 'co_leader' });
      transaction.update(memberRef, { role: 'leader' });
    });
  } else {
    await updateDoc(memberRef, { role: newRole });
  }
}

/**
 * Demote a co_leader back to member.
 */
export async function demoteMember(guildId: string, targetUid: string): Promise<void> {
  await updateDoc(doc(db, 'guilds', guildId, 'members', targetUid), { role: 'member' });
}

/**
 * Get all members of a guild, ordered by weeklyXp descending.
 */
export async function getGuildMembers(guildId: string): Promise<GuildMember[]> {
  const col = collection(db, 'guilds', guildId, 'members');
  const q = query(col, orderBy('weeklyXp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as GuildMember);
}

/**
 * Add XP to a guild member (after exercise completion).
 */
export async function addGuildMemberXp(
  guildId: string,
  uid: string,
  xpAmount: number,
): Promise<void> {
  if (!Number.isFinite(xpAmount) || xpAmount <= 0) return;
  const memberRef = doc(db, 'guilds', guildId, 'members', uid);
  const guildRef = doc(db, 'guilds', guildId);

  await runTransaction(db, async (transaction) => {
    transaction.update(memberRef, {
      weeklyXp: increment(xpAmount),
      totalGuildXp: increment(xpAmount),
      lastActiveAt: Date.now(),
    });
    transaction.update(guildRef, {
      weeklyXp: increment(xpAmount),
      guildXp: increment(xpAmount),
    });
  });
}

/**
 * Find which guild a user belongs to (if any).
 *
 * Looks up the guildId stored on the user's profile document.
 * Falls back to null if not found.
 *
 * TODO: Write guildId to user profile doc on join/create, clear on leave.
 * For now, the guildStore persists locally and this is a server-side fallback.
 */
export async function getUserGuild(uid: string): Promise<Guild | null> {
  // Check user profile for guildId
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;

  const guildId = userDoc.data()?.guildId as string | undefined;
  if (!guildId) return null;

  return getGuild(guildId);
}

// ---------------------------------------------------------------------------
// Guild Wars
// ---------------------------------------------------------------------------

/**
 * Start a guild war between two guilds.
 */
export async function startGuildWar(
  guildA: { id: string; name: string },
  guildB: { id: string; name: string },
  durationMs: number = 24 * 60 * 60 * 1000, // 24 hours default
): Promise<GuildWar> {
  const warRef = doc(collection(db, 'guildWars'));
  const now = Date.now();

  const war: GuildWar = {
    id: warRef.id,
    guildAId: guildA.id,
    guildBId: guildB.id,
    guildAName: guildA.name,
    guildBName: guildB.name,
    startedAt: now,
    endsAt: now + durationMs,
    status: 'active',
    guildAWarPoints: 0,
    guildBWarPoints: 0,
    winnerId: null,
    mvpUid: null,
  };

  await setDoc(warRef, war);
  return war;
}

/**
 * Add war points for a guild in an active war.
 */
export async function addWarPoints(
  warId: string,
  guildId: string,
  points: number,
): Promise<void> {
  if (!Number.isFinite(points) || points <= 0) return;
  const warRef = doc(db, 'guildWars', warId);

  await runTransaction(db, async (transaction) => {
    const warSnap = await transaction.get(warRef);
    if (!warSnap.exists()) throw new Error('War not found');

    const war = warSnap.data() as GuildWar;
    if (war.status !== 'active') throw new Error('War is not active');

    const field = war.guildAId === guildId ? 'guildAWarPoints' : 'guildBWarPoints';
    transaction.update(warRef, { [field]: increment(points) });
  });
}

/**
 * Complete a guild war and determine the winner.
 */
export async function completeGuildWar(warId: string, mvpUid?: string): Promise<GuildWar> {
  const warRef = doc(db, 'guildWars', warId);

  return runTransaction(db, async (transaction) => {
    const warSnap = await transaction.get(warRef);
    if (!warSnap.exists()) throw new Error('War not found');

    const war = warSnap.data() as GuildWar;
    const winnerId = war.guildAWarPoints > war.guildBWarPoints
      ? war.guildAId
      : war.guildBWarPoints > war.guildAWarPoints
        ? war.guildBId
        : null; // tie

    const updates: Partial<GuildWar> = {
      status: 'completed',
      winnerId,
      mvpUid: mvpUid ?? null,
    };

    transaction.update(warRef, updates);
    return { ...war, ...updates } as GuildWar;
  });
}

/**
 * Get active wars for a guild.
 */
export async function getActiveWars(guildId: string): Promise<GuildWar[]> {
  const col = collection(db, 'guildWars');
  // Check both sides
  const qA = query(col, where('guildAId', '==', guildId), where('status', '==', 'active'));
  const qB = query(col, where('guildBId', '==', guildId), where('status', '==', 'active'));

  const [snapA, snapB] = await Promise.all([getDocs(qA), getDocs(qB)]);

  const wars: GuildWar[] = [
    ...snapA.docs.map((d) => d.data() as GuildWar),
    ...snapB.docs.map((d) => d.data() as GuildWar),
  ];

  return wars;
}

/**
 * Get war history for a guild (completed wars).
 */
export async function getWarHistory(guildId: string, maxResults: number = 10): Promise<GuildWar[]> {
  const col = collection(db, 'guildWars');
  const qA = query(
    col,
    where('guildAId', '==', guildId),
    where('status', '==', 'completed'),
    orderBy('startedAt', 'desc'),
    limit(maxResults),
  );
  const qB = query(
    col,
    where('guildBId', '==', guildId),
    where('status', '==', 'completed'),
    orderBy('startedAt', 'desc'),
    limit(maxResults),
  );

  const [snapA, snapB] = await Promise.all([getDocs(qA), getDocs(qB)]);

  const wars = [
    ...snapA.docs.map((d) => d.data() as GuildWar),
    ...snapB.docs.map((d) => d.data() as GuildWar),
  ];

  return wars.sort((a, b) => b.startedAt - a.startedAt).slice(0, maxResults);
}

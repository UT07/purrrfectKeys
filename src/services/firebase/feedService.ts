/**
 * Feed Service — Firestore CRUD for rich activity feed + emoji reactions
 *
 * Firestore paths:
 *   users/{uid}/richFeed/{itemId}  — RichFeedItem documents
 *
 * Reactions are stored inline on each feed item:
 *   reactions: { "🔥": ["uid1", "uid2"], "👏": ["uid3"] }
 */

import {
  doc,
  collection,
  setDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './config';
import type { RichFeedItem, ReactionType, RankedTier } from '../../stores/types';

// ---------------------------------------------------------------------------
// Post rich feed items
// ---------------------------------------------------------------------------

/**
 * Post a rich feed item to the actor's own feed collection.
 * Friends will pull from this collection when loading their feed.
 */
export async function postRichFeedItem(
  uid: string,
  item: RichFeedItem,
): Promise<void> {
  const feedRef = doc(db, 'users', uid, 'richFeed', item.id);
  await setDoc(feedRef, item);
}

/**
 * Build a RichFeedItem with sensible defaults.
 */
export function buildRichFeedItem(
  type: RichFeedItem['type'],
  actor: {
    uid: string;
    displayName: string;
    catId: string;
    rankTier: RankedTier;
    rankDivision: number;
  },
  payload: Record<string, unknown>,
  options?: {
    isEngagementTrigger?: boolean;
    targetUid?: string;
  },
): RichFeedItem {
  return {
    id: `${type}-${actor.uid}-${Date.now()}`,
    type,
    actorUid: actor.uid,
    actorDisplayName: actor.displayName,
    actorCatId: actor.catId,
    actorRankTier: actor.rankTier,
    actorRankDivision: actor.rankDivision,
    payload,
    timestamp: Date.now(),
    reactions: {},
    isEngagementTrigger: options?.isEngagementTrigger ?? false,
    targetUid: options?.targetUid,
  };
}

// ---------------------------------------------------------------------------
// Read feed items from friends
// ---------------------------------------------------------------------------

/**
 * Fetch recent rich feed items from a single friend.
 */
export async function getFriendRichFeed(
  friendUid: string,
  maxItems: number = 20,
): Promise<RichFeedItem[]> {
  const feedCol = collection(db, 'users', friendUid, 'richFeed');
  const q = query(feedCol, orderBy('timestamp', 'desc'), limit(maxItems));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as RichFeedItem);
}

/**
 * Aggregate rich feed items from multiple friends.
 * Fetches per-friend, merges, sorts by timestamp descending, caps at maxTotal.
 */
export async function getAggregatedRichFeed(
  friendUids: string[],
  perFriend: number = 10,
  maxTotal: number = 50,
): Promise<RichFeedItem[]> {
  if (friendUids.length === 0) return [];

  // Use Promise.all + per-entry catch (Hermes may not support Promise.allSettled)
  const results = await Promise.all(
    friendUids.map((uid) => getFriendRichFeed(uid, perFriend).catch(() => [] as RichFeedItem[])),
  );

  return results
    .flat()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxTotal);
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

/**
 * Toggle a reaction on a feed item.
 * If the user already reacted with this emoji, remove it. Otherwise, add it.
 *
 * @param itemOwnerUid - UID of the user who owns the feed item
 * @param itemId - ID of the feed item
 * @param reaction - Emoji reaction type
 * @param reactorUid - UID of the user toggling the reaction
 * @param currentlyReacted - Whether the reactor has already reacted (avoids a read)
 */
export async function toggleReaction(
  itemOwnerUid: string,
  itemId: string,
  reaction: ReactionType,
  reactorUid: string,
  currentlyReacted: boolean,
): Promise<void> {
  const feedRef = doc(db, 'users', itemOwnerUid, 'richFeed', itemId);

  if (currentlyReacted) {
    await updateDoc(feedRef, {
      [`reactions.${reaction}`]: arrayRemove(reactorUid),
    });
  } else {
    await updateDoc(feedRef, {
      [`reactions.${reaction}`]: arrayUnion(reactorUid),
    });
  }
}

/**
 * Check if a user has reacted to a feed item with a specific emoji.
 */
export function hasReacted(
  item: RichFeedItem,
  reaction: ReactionType,
  uid: string,
): boolean {
  return item.reactions[reaction]?.includes(uid) ?? false;
}

/**
 * Get total reaction count for a feed item across all emoji types.
 */
export function getTotalReactions(item: RichFeedItem): number {
  return Object.values(item.reactions).reduce(
    (sum, uids) => sum + (uids?.length ?? 0),
    0,
  );
}

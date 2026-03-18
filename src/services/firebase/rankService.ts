/**
 * Rank Service — Firestore CRUD for player ratings + season rewards
 *
 * Rating data is stored directly on the user document: users/{uid}
 * Fields: mmr, tier, division, rp, peakMmr, peakTier
 *
 * Season rewards are in: users/{uid}/seasonRewards/{rewardId}
 */

import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';
import type { PlayerRating, RankedTier } from '../../stores/types';

/**
 * Save player rating fields to the user's Firestore document.
 */
export async function savePlayerRating(uid: string, rating: PlayerRating): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    mmr: rating.mmr,
    tier: rating.tier,
    division: rating.division,
    rp: rating.rp,
    peakMmr: rating.peakMmr,
    peakTier: rating.peakTier,
  });
}

/**
 * Get a player's rating from their Firestore document.
 * Returns null if no rating data exists.
 */
export async function getPlayerRating(uid: string): Promise<Partial<PlayerRating> | null> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;

  const data = snap.data();
  if (data.mmr == null) return null;

  return {
    mmr: data.mmr,
    tier: data.tier as RankedTier,
    division: data.division,
    rp: data.rp ?? 0,
    peakMmr: data.peakMmr ?? data.mmr,
    peakTier: (data.peakTier ?? data.tier) as RankedTier,
  };
}

/**
 * Find players within an MMR band for league matching.
 * Returns UIDs of players with MMR in [mmr - range, mmr + range].
 */
export async function getPlayersInMMRBand(
  mmr: number,
  range: number = 100,
): Promise<string[]> {
  const usersCol = collection(db, 'users');
  const q = query(
    usersCol,
    where('mmr', '>=', mmr - range),
    where('mmr', '<=', mmr + range),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.id);
}

/**
 * Claim unclaimed season rewards for a user.
 * Returns total gems earned from unclaimed rewards.
 */
export interface SeasonRewardDoc {
  weekStart: string;
  leagueId: string;
  tier: string;
  rank: number;
  totalMembers: number;
  totalGems: number;
  claimedAt: number | null;
}

export async function claimSeasonRewards(uid: string): Promise<{ totalGems: number; rewards: SeasonRewardDoc[] }> {
  const rewardsCol = collection(db, 'users', uid, 'seasonRewards');
  const q = query(rewardsCol, where('claimedAt', '==', null));
  const snap = await getDocs(q);

  if (snap.empty) return { totalGems: 0, rewards: [] };

  let totalGems = 0;
  const rewards: SeasonRewardDoc[] = [];

  for (const rewardDoc of snap.docs) {
    const data = rewardDoc.data() as SeasonRewardDoc;
    totalGems += data.totalGems;
    rewards.push(data);

    // Mark as claimed
    await updateDoc(doc(db, 'users', uid, 'seasonRewards', rewardDoc.id), {
      claimedAt: Date.now(),
    });
  }

  return { totalGems, rewards };
}

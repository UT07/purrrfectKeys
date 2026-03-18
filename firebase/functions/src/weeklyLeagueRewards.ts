/**
 * Cloud Function: Weekly League Rewards & Season Transition
 *
 * Scheduled function that runs every Sunday at 23:55 UTC (just before season end).
 * For each active league this week:
 *   1. Calculates final standings
 *   2. Awards gems to members based on placement + tier bonus
 *   3. Applies soft MMR reset for each player
 *   4. Marks the league as completed
 *
 * This automates the entire season lifecycle — no manual intervention needed.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { formatSeasonWeekKey } from './leagueUtils';

// ─────────────────────────────────────────────────
// Constants (mirrored from client-side seasonConfig.ts)
// ─────────────────────────────────────────────────

const PLACEMENT_REWARDS = [
  { minRank: 1, maxRank: 1, gems: 100 },
  { minRank: 2, maxRank: 2, gems: 75 },
  { minRank: 3, maxRank: 3, gems: 50 },
  { minRank: 4, maxRank: 5, gems: 30 },
  { minRank: 6, maxRank: 10, gems: 20 },
  { minRank: 11, maxRank: 15, gems: 10 },
  { minRank: 16, maxRank: 30, gems: 5 },
];

const TIER_GEM_BONUS: Record<string, number> = {
  novice: 0,
  apprentice: 5,
  performer: 10,
  virtuoso: 20,
  maestro: 35,
  prodigy: 50,
  luminary: 75,
  legend: 100,
  grandmaster: 150,
};

const MMR_RESET_DECAY = 0.8;
const MMR_RESET_BASELINE = 500;

function gemsForPlacement(rank: number): number {
  for (const r of PLACEMENT_REWARDS) {
    if (rank >= r.minRank && rank <= r.maxRank) return r.gems;
  }
  return 0;
}

function softResetMMR(currentMmr: number): number {
  return Math.round(currentMmr * MMR_RESET_DECAY + MMR_RESET_BASELINE * (1 - MMR_RESET_DECAY));
}

function getCurrentWeekMonday(): string {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysFromMonday = utcDay === 0 ? 6 : utcDay - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return formatSeasonWeekKey(monday);
}

// ─────────────────────────────────────────────────
// Cloud Function
// ─────────────────────────────────────────────────

export const weeklyLeagueRewards = onSchedule(
  {
    schedule: 'every sunday 23:55',
    timeZone: 'UTC',
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '256MiB',
  },
  async () => {
    const db = admin.firestore();
    const weekStart = getCurrentWeekMonday();

    logger.info(`[weeklyLeagueRewards] Processing leagues for week ${weekStart}`);

    // Find all leagues for this week
    const leaguesSnap = await db
      .collection('leagues')
      .where('weekStart', '==', weekStart)
      .get();

    if (leaguesSnap.empty) {
      logger.info('[weeklyLeagueRewards] No leagues found for this week');
      return;
    }

    let totalLeagues = 0;
    let totalRewards = 0;
    let totalGemsDistributed = 0;

    for (const leagueDoc of leaguesSnap.docs) {
      try {
        const leagueData = leagueDoc.data();
        const leagueId = leagueDoc.id;
        const tier = leagueData.tier as string;

        // Get members sorted by weeklyXp descending
        const membersSnap = await db
          .collection('leagues')
          .doc(leagueId)
          .collection('members')
          .orderBy('weeklyXp', 'desc')
          .get();

        if (membersSnap.empty) continue;

        totalLeagues++;

        // Pre-fetch user docs to get actual MMR values (not stored on member doc)
        const userDocs = await Promise.all(
          membersSnap.docs.map((m) => db.collection('users').doc(m.id).get()),
        );
        const userMmrMap = new Map<string, number>();
        for (const userDoc of userDocs) {
          if (userDoc.exists) {
            const userData = userDoc.data()!;
            // MMR stored under rating.mmr (PlayerRating shape) or top-level mmr (legacy)
            const mmr = userData.rating?.mmr ?? userData.mmr ?? 500;
            userMmrMap.set(userDoc.id, mmr);
          }
        }

        const batch = db.batch();

        membersSnap.docs.forEach((memberDoc, index) => {
          const rank = index + 1;
          const uid = memberDoc.id;
          const placementGems = gemsForPlacement(rank);
          const tierBonus = TIER_GEM_BONUS[tier] ?? 0;
          const totalGems = placementGems + tierBonus;

          // Write reward record to user's rewards subcollection
          const rewardRef = db.collection('users').doc(uid).collection('seasonRewards').doc();
          batch.set(rewardRef, {
            weekStart,
            leagueId,
            tier,
            rank,
            totalMembers: membersSnap.size,
            placementGems,
            tierBonus,
            gems: totalGems,
            weeklyXp: memberDoc.data().weeklyXp,
            claimedAt: null, // client claims on next app open
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Apply soft MMR reset on user document
          const userRef = db.collection('users').doc(uid);
          const currentMmr = userMmrMap.get(uid) ?? 500;
          batch.update(userRef, {
            mmr: softResetMMR(currentMmr),
            lastSeasonRank: rank,
            lastSeasonTier: tier,
            lastSeasonWeek: weekStart,
          });

          totalRewards++;
          totalGemsDistributed += totalGems;
        });

        // Mark league as completed
        batch.update(leagueDoc.ref, {
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        await batch.commit();
      } catch (err) {
        logger.error(`[weeklyLeagueRewards] Failed to process league ${leagueDoc.id}:`, err);
        // Continue processing remaining leagues
      }
    }

    logger.info(
      `[weeklyLeagueRewards] Done: ${totalLeagues} leagues, ${totalRewards} rewards, ${totalGemsDistributed} gems distributed`,
    );
  },
);

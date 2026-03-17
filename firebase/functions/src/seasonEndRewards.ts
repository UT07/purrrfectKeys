/**
 * Cloud Function: Season-End Bonus Rewards
 *
 * Scheduled function that runs every Sunday at 23:50 UTC.
 * On every 4th Sunday (season boundary), it awards bonus gems to all users
 * based on their peak rank across the 4-week season.
 *
 * This runs 5 minutes BEFORE weeklyLeagueRewards (23:55 UTC) so that
 * season-end bonuses are written before the weekly function resets
 * lastSeasonTier/lastSeasonWeek for the new week.
 *
 * Reward tiers:
 *   Novice: 25 gems      Maestro: 350 gems     Legend: 1,000 gems
 *   Apprentice: 50 gems   Prodigy: 500 gems     Grandmaster: 1,500 gems
 *   Performer: 100 gems   Luminary: 750 gems
 *   Virtuoso: 200 gems
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

// ─────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────

/** Season epoch: Monday 2026-03-16 — all season numbering starts here */
const SEASON_EPOCH = new Date('2026-03-16T00:00:00Z').getTime();

/** Each season spans 4 weekly rounds */
const WEEKS_PER_SEASON = 4;

/** Milliseconds in one week */
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Bonus gems awarded at season end based on peak tier */
const SEASON_END_BONUS_GEMS: Record<string, number> = {
  novice: 25,
  apprentice: 50,
  performer: 100,
  virtuoso: 200,
  maestro: 350,
  prodigy: 500,
  luminary: 750,
  legend: 1000,
  grandmaster: 1500,
};

/** Max Firestore batch size */
const BATCH_LIMIT = 500;

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

/**
 * Compute the current season number (1-indexed).
 * Season 1 covers weeks 1–4 since the epoch, season 2 covers weeks 5–8, etc.
 */
function getSeasonNumber(now: Date = new Date()): number {
  const elapsed = now.getTime() - SEASON_EPOCH;
  if (elapsed < 0) return 1;
  const weeksSinceEpoch = Math.floor(elapsed / MS_PER_WEEK);
  return Math.floor(weeksSinceEpoch / WEEKS_PER_SEASON) + 1;
}

/**
 * Check whether this Sunday is the last Sunday of a 4-week season.
 * The season boundary falls on every 4th Sunday after the epoch.
 */
function isSeasonEndSunday(now: Date = new Date()): boolean {
  const elapsed = now.getTime() - SEASON_EPOCH;
  if (elapsed < 0) return false;
  const weeksSinceEpoch = Math.floor(elapsed / MS_PER_WEEK);
  // Week 0 ends on the first Sunday, week 3 on the 4th Sunday (season 1 end), etc.
  return (weeksSinceEpoch + 1) % WEEKS_PER_SEASON === 0;
}

/**
 * Get the Monday date strings for all 4 weeks in the current season.
 * Used to match users whose lastSeasonWeek falls within this season.
 */
function getSeasonWeekMondays(seasonNumber: number): string[] {
  const mondays: string[] = [];
  const seasonStartWeek = (seasonNumber - 1) * WEEKS_PER_SEASON;

  for (let w = 0; w < WEEKS_PER_SEASON; w++) {
    const mondayMs = SEASON_EPOCH + (seasonStartWeek + w) * MS_PER_WEEK;
    const monday = new Date(mondayMs);
    mondays.push(monday.toISOString().split('T')[0]);
  }

  return mondays;
}

// ─────────────────────────────────────────────────
// Cloud Function
// ─────────────────────────────────────────────────

export const seasonEndRewards = onSchedule(
  {
    schedule: 'every sunday 23:50',
    timeZone: 'UTC',
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '256MiB',
  },
  async () => {
    const now = new Date();

    // Gate: only run on the last Sunday of a 4-week season
    if (!isSeasonEndSunday(now)) {
      logger.info(
        '[seasonEndRewards] Not a season-end Sunday — skipping',
      );
      return;
    }

    const seasonNumber = getSeasonNumber(now);
    const seasonWeeks = getSeasonWeekMondays(seasonNumber);
    const db = admin.firestore();

    logger.info(
      `[seasonEndRewards] Processing season ${seasonNumber} end rewards. ` +
        `Season weeks: ${seasonWeeks.join(', ')}`,
    );

    // Query all users who participated in this season.
    // lastSeasonWeek is set by weeklyLeagueRewards to the Monday of each week.
    // We look for users whose lastSeasonWeek is any week in this season.
    // Firestore 'in' queries support up to 30 values, so 4 is fine.
    const usersSnap = await db
      .collection('users')
      .where('lastSeasonWeek', 'in', seasonWeeks)
      .get();

    if (usersSnap.empty) {
      logger.info('[seasonEndRewards] No users found for this season');
      return;
    }

    logger.info(
      `[seasonEndRewards] Found ${usersSnap.size} users to reward`,
    );

    let totalRewards = 0;
    let totalGemsDistributed = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (const userDoc of usersSnap.docs) {
      try {
        const userData = userDoc.data();
        const uid = userDoc.id;
        const peakTier = (userData.lastSeasonTier as string) || 'novice';
        const gems = SEASON_END_BONUS_GEMS[peakTier] ?? SEASON_END_BONUS_GEMS.novice;

        // Write reward doc to users/{uid}/seasonRewards
        const rewardRef = db
          .collection('users')
          .doc(uid)
          .collection('seasonRewards')
          .doc();

        batch.set(rewardRef, {
          gems,
          seasonNumber,
          peakTier,
          type: 'season_end',
          claimedAt: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        totalRewards++;
        totalGemsDistributed += gems;
        batchCount++;

        // Commit when batch limit reached
        if (batchCount >= BATCH_LIMIT) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      } catch (err) {
        logger.error(
          `[seasonEndRewards] Failed to create reward for user ${userDoc.id}:`,
          err,
        );
        // Continue processing remaining users
      }
    }

    // Commit any remaining writes
    if (batchCount > 0) {
      await batch.commit();
    }

    logger.info(
      `[seasonEndRewards] Done: season ${seasonNumber}, ` +
        `${totalRewards} rewards created, ${totalGemsDistributed} total gems`,
    );
  },
);

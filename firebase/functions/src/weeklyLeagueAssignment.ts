/**
 * Cloud Function: Weekly League Auto-Assignment
 *
 * Scheduled function that runs every Monday at 00:05 UTC.
 * Automatically assigns all active players to new leagues for the week.
 *
 * "Active" = any user who has signed in within the last 14 days.
 *
 * This ensures players are placed in leagues even if they don't open
 * the app right at the start of the week. The client-side `ensureSocialSetup`
 * still runs as a fallback for edge cases.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LEAGUE_SIZE = 30;
const ACTIVE_DAYS_THRESHOLD = 14;

function getCurrentWeekMonday(): string {
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysFromMonday = utcDay === 0 ? 6 : utcDay - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Cloud Function
// ---------------------------------------------------------------------------

export const weeklyLeagueAssignment = onSchedule(
  {
    schedule: 'every monday 00:05',
    timeZone: 'UTC',
    region: 'us-central1',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    const db = admin.firestore();
    const weekStart = getCurrentWeekMonday();

    logger.info(`[weeklyLeagueAssignment] Starting for week ${weekStart}`);

    // Find active users (signed in within last 14 days)
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - ACTIVE_DAYS_THRESHOLD);

    const usersSnap = await db
      .collection('users')
      .where('lastSignInAt', '>=', cutoffDate.getTime())
      .get();

    if (usersSnap.empty) {
      logger.info('[weeklyLeagueAssignment] No active users found');
      return;
    }

    logger.info(`[weeklyLeagueAssignment] Found ${usersSnap.size} active users`);

    // Group users by tier for assignment
    const tierGroups: Record<string, Array<{ uid: string; displayName: string; catId: string }>> = {};

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      // Skip anonymous users
      if (data.isAnonymous) continue;

      const tier = data.tier || 'novice';
      if (!tierGroups[tier]) tierGroups[tier] = [];
      tierGroups[tier].push({
        uid: userDoc.id,
        displayName: data.displayName || 'Player',
        catId: data.selectedCatId || 'mini-meowww',
      });
    }

    let totalAssigned = 0;
    let totalLeagues = 0;

    for (const [tier, users] of Object.entries(tierGroups)) {
      // Find or create leagues for this tier/week
      const existingLeagues = await db
        .collection('leagues')
        .where('weekStart', '==', weekStart)
        .where('tier', '==', tier)
        .get();

      // Track which users already have a league this week
      const alreadyAssigned = new Set<string>();
      for (const leagueDoc of existingLeagues.docs) {
        const membersSnap = await db
          .collection('leagues')
          .doc(leagueDoc.id)
          .collection('members')
          .get();

        for (const memberDoc of membersSnap.docs) {
          alreadyAssigned.add(memberDoc.id);
        }
      }

      // Filter to only unassigned users
      const unassigned = users.filter((u) => !alreadyAssigned.has(u.uid));
      if (unassigned.length === 0) continue;

      // Chunk unassigned users into league-sized groups
      for (let i = 0; i < unassigned.length; i += MAX_LEAGUE_SIZE) {
        const chunk = unassigned.slice(i, i + MAX_LEAGUE_SIZE);

        // Find a league with space, or create new
        let leagueId: string | null = null;
        let currentCount = 0;

        for (const leagueDoc of existingLeagues.docs) {
          const leagueData = leagueDoc.data();
          if (leagueData.memberCount < MAX_LEAGUE_SIZE) {
            const spaceAvailable = MAX_LEAGUE_SIZE - leagueData.memberCount;
            if (spaceAvailable >= chunk.length) {
              leagueId = leagueDoc.id;
              currentCount = leagueData.memberCount;
              break;
            }
          }
        }

        const batch = db.batch();

        if (!leagueId) {
          // Create new league
          const newLeagueRef = db.collection('leagues').doc();
          leagueId = newLeagueRef.id;
          currentCount = 0;

          batch.set(newLeagueRef, {
            tier,
            weekStart,
            memberCount: chunk.length,
            createdAt: Date.now(),
          });
          totalLeagues++;
        } else {
          // Update existing league count
          const leagueRef = db.collection('leagues').doc(leagueId);
          batch.update(leagueRef, {
            memberCount: admin.firestore.FieldValue.increment(chunk.length),
          });
        }

        // Add members
        for (const user of chunk) {
          const memberRef = db
            .collection('leagues')
            .doc(leagueId)
            .collection('members')
            .doc(user.uid);

          batch.set(memberRef, {
            uid: user.uid,
            displayName: user.displayName,
            selectedCatId: user.catId,
            weeklyXp: 0,
            joinedAt: Date.now(),
          });
          totalAssigned++;
        }

        await batch.commit();
      }
    }

    logger.info(
      `[weeklyLeagueAssignment] Done: ${totalAssigned} users assigned, ${totalLeagues} new leagues created`,
    );
  },
);

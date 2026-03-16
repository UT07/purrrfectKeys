/**
 * Fix Duplicate Usernames Migration
 *
 * Scans all users for username fields, detects duplicates, and:
 *   1. Claims the username in `usernames/{name}` for the earliest user (by createdAt)
 *   2. Clears the username from duplicate users' profiles
 *
 * Also backfills `usernames/` collection for any user whose username isn't claimed yet.
 *
 * Usage:
 *   node scripts/fix-duplicate-usernames.js [--dry-run]
 *
 * Prerequisites:
 *   - gcloud auth application-default login
 *   - Or GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account JSON
 */

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'keysense-app' });
const db = admin.firestore();

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log(`\n=== Fix Duplicate Usernames ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  // Step 1: Read all users with usernames
  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} total users\n`);

  // Map: username -> [{ uid, createdAt }]
  const usernameMap = new Map();

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const username = data.username;
    if (!username || typeof username !== 'string' || username.length < 3) continue;

    const normalized = username.toLowerCase();
    const entry = {
      uid: userDoc.id,
      username: normalized,
      displayName: data.displayName || normalized,
      createdAt: data.createdAt || data.hasCompletedOnboarding ? 0 : Date.now(),
    };

    if (!usernameMap.has(normalized)) {
      usernameMap.set(normalized, []);
    }
    usernameMap.get(normalized).push(entry);
  }

  console.log(`Found ${usernameMap.size} unique usernames across users\n`);

  // Step 2: Check existing usernames collection
  const existingUsernamesSnap = await db.collection('usernames').get();
  const existingUsernames = new Map();
  for (const d of existingUsernamesSnap.docs) {
    existingUsernames.set(d.id, d.data());
  }
  console.log(`Existing usernames/ collection has ${existingUsernames.size} entries\n`);

  let claimedCount = 0;
  let duplicatesCleared = 0;
  let alreadyClaimedCount = 0;

  for (const [username, users] of usernameMap) {
    // Sort by createdAt ascending — earliest user wins
    users.sort((a, b) => a.createdAt - b.createdAt);

    const winner = users[0];
    const losers = users.slice(1);

    if (losers.length > 0) {
      console.log(`\n⚠️  DUPLICATE: "${username}" claimed by ${users.length} users`);
      console.log(`   Winner: ${winner.uid} (${winner.displayName})`);
      for (const loser of losers) {
        console.log(`   Loser:  ${loser.uid} (${loser.displayName}) — will clear username`);
      }
    }

    // Check if already properly claimed in usernames/ collection
    const existing = existingUsernames.get(username);
    if (existing && existing.uid === winner.uid) {
      alreadyClaimedCount++;
      // Just need to clear losers
    } else {
      // Claim for winner
      console.log(`   Claiming "${username}" for ${winner.uid}`);
      if (!DRY_RUN) {
        await db.doc(`usernames/${username}`).set({
          uid: winner.uid,
          createdAt: Date.now(),
        });
      }
      claimedCount++;
    }

    // Clear username from losers
    for (const loser of losers) {
      console.log(`   Clearing username from ${loser.uid}`);
      if (!DRY_RUN) {
        await db.doc(`users/${loser.uid}`).update({
          username: admin.firestore.FieldValue.delete(),
        });
      }
      duplicatesCleared++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Usernames claimed in usernames/ collection: ${claimedCount}`);
  console.log(`  Already correctly claimed: ${alreadyClaimedCount}`);
  console.log(`  Duplicate usernames cleared from user profiles: ${duplicatesCleared}`);
  console.log(`  ${DRY_RUN ? '(DRY RUN — no changes made)' : 'Done!'}\n`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

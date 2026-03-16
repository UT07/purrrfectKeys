const admin = require('firebase-admin');

// Initialize with default credentials (uses gcloud auth)
admin.initializeApp({ projectId: 'keysense-app' });
const db = admin.firestore();

const uid = 'SG1LqVohypeu2O870FWM4ZhAdAN2';

async function checkAll() {
  console.log(`\n=== Checking Firestore data for uid: ${uid} ===\n`);

  // 1. User profile
  const profile = await db.doc(`users/${uid}`).get();
  console.log('--- users/{uid} ---');
  console.log(profile.exists ? JSON.stringify(profile.data(), null, 2) : 'NOT FOUND');

  // 2. Gamification
  const gamification = await db.doc(`users/${uid}/gamification/progress`).get();
  console.log('\n--- gamification/progress ---');
  console.log(gamification.exists ? JSON.stringify(gamification.data(), null, 2) : 'NOT FOUND');

  // 3. Lesson progress
  const lessons = await db.collection(`users/${uid}/lessonProgress`).get();
  console.log(`\n--- lessonProgress (${lessons.size} docs) ---`);
  lessons.forEach(doc => console.log(`  ${doc.id}: ${JSON.stringify(doc.data())}`));

  // 4. Cat evolution
  const cats = await db.doc(`users/${uid}/gamification/catEvolution`).get();
  console.log('\n--- gamification/catEvolution ---');
  console.log(cats.exists ? JSON.stringify(cats.data(), null, 2) : 'NOT FOUND');

  // 5. Gems
  const gems = await db.doc(`users/${uid}/gamification/gems`).get();
  console.log('\n--- gamification/gems ---');
  console.log(gems.exists ? JSON.stringify(gems.data(), null, 2) : 'NOT FOUND');

  // 6. Social
  const social = await db.doc(`users/${uid}/social/profile`).get();
  console.log('\n--- social/profile ---');
  console.log(social.exists ? JSON.stringify(social.data(), null, 2) : 'NOT FOUND');

  // 7. Friends
  const friends = await db.collection(`users/${uid}/friends`).get();
  console.log(`\n--- friends (${friends.size} docs) ---`);
  friends.forEach(doc => console.log(`  ${doc.id}`));

  // 8. Achievements
  const achievements = await db.doc(`users/${uid}/gamification/achievements`).get();
  console.log('\n--- gamification/achievements ---');
  console.log(achievements.exists ? JSON.stringify(achievements.data(), null, 2) : 'NOT FOUND');

  // 9. Song mastery
  const songs = await db.collection(`users/${uid}/songMastery`).get();
  console.log(`\n--- songMastery (${songs.size} docs) ---`);
  songs.forEach(doc => console.log(`  ${doc.id}: score=${doc.data().bestScore}`));

  // 10. Learner profile
  const learner = await db.doc(`users/${uid}/gamification/learnerProfile`).get();
  console.log('\n--- gamification/learnerProfile ---');
  console.log(learner.exists ? JSON.stringify(learner.data(), null, 2).slice(0, 500) : 'NOT FOUND');

  // Also check the other account for comparison
  const uid2 = 'mmgRoBJq9MUujSGXHBH6bf0MI6o2';
  console.log(`\n\n=== Checking other account (utkarsh45689) uid: ${uid2} ===\n`);

  const profile2 = await db.doc(`users/${uid2}`).get();
  console.log('--- users/{uid} ---');
  console.log(profile2.exists ? JSON.stringify(profile2.data(), null, 2) : 'NOT FOUND');

  const gam2 = await db.doc(`users/${uid2}/gamification/progress`).get();
  console.log('\n--- gamification/progress ---');
  console.log(gam2.exists ? JSON.stringify(gam2.data(), null, 2) : 'NOT FOUND');

  const lessons2 = await db.collection(`users/${uid2}/lessonProgress`).get();
  console.log(`\n--- lessonProgress (${lessons2.size} docs) ---`);

  const cats2 = await db.doc(`users/${uid2}/gamification/catEvolution`).get();
  console.log('\n--- gamification/catEvolution ---');
  console.log(cats2.exists ? JSON.stringify(cats2.data(), null, 2) : 'NOT FOUND');

  const gems2 = await db.doc(`users/${uid2}/gamification/gems`).get();
  console.log('\n--- gamification/gems ---');
  console.log(gems2.exists ? JSON.stringify(gems2.data(), null, 2) : 'NOT FOUND');
}

checkAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

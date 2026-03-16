#!/usr/bin/env node
/**
 * Upload songs to Firestore using Firebase Admin SDK.
 *
 * Prerequisites:
 *   gcloud auth application-default login --project keysense-app
 *
 * Usage (from firebase/functions/):
 *   node upload-songs.js --input /tmp/songs.json [--dry-run]
 */

const admin = require('firebase-admin');
const { readFileSync } = require('fs');

const PROJECT_ID = 'keysense-app';
const BATCH_SIZE = 20;

async function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const dryRun = args.includes('--dry-run');

  if (inputIdx < 0 || !args[inputIdx + 1]) {
    console.error('Usage: node upload-songs.js --input <songs.json> [--dry-run]');
    process.exit(1);
  }

  const inputFile = args[inputIdx + 1];
  const songs = JSON.parse(readFileSync(inputFile, 'utf8'));
  console.log(`Loaded ${songs.length} songs from ${inputFile}`);
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Dry run: ${dryRun}\n`);

  if (dryRun) {
    for (const song of songs) {
      console.log(`  songs/${song.id} — ${song.metadata.title} (${song.metadata.genre}, diff ${song.metadata.difficulty})`);
    }
    console.log(`\nWould upload ${songs.length} documents to songs/ collection`);
    return;
  }

  // Initialize Admin SDK with Application Default Credentials
  admin.initializeApp({
    projectId: PROJECT_ID,
    credential: admin.credential.applicationDefault(),
  });
  const db = admin.firestore();

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < songs.length; i += BATCH_SIZE) {
    const batchSongs = songs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    let batchCount = 0;

    for (const song of batchSongs) {
      const ref = db.collection('songs').doc(song.id);

      try {
        const existing = await ref.get();
        if (existing.exists) {
          console.log(`  Skip (exists): ${song.id}`);
          skipped++;
          continue;
        }
      } catch {
        // If we can't read, try to write anyway
      }

      batch.set(ref, song);
      console.log(`  Queue: ${song.id} — ${song.metadata.title}`);
      batchCount++;
    }

    if (batchCount === 0) continue;

    try {
      await batch.commit();
      uploaded += batchCount;
      console.log(`  ✓ Batch committed (${Math.min(i + BATCH_SIZE, songs.length)}/${songs.length})`);
    } catch (err) {
      console.error(`  ✗ Batch failed: ${err.message || err}`);
      failed += batchCount;
    }
  }

  console.log(`\nDone! Uploaded: ${uploaded}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});

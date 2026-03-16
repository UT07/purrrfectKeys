#!/usr/bin/env node
/**
 * Upload songs to Firestore using Admin SDK (bypasses security rules).
 *
 * Usage:
 *   cd firebase/functions
 *   node upload-songs-admin.js /tmp/gemini-songs.json /tmp/batch2-songs.json
 *
 * Uses Application Default Credentials (ADC). Run `gcloud auth application-default login` first.
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize with ADC
admin.initializeApp({
  projectId: process.env.GCLOUD_PROJECT || 'keysense-app',
});

const db = admin.firestore();

async function main() {
  const inputFiles = process.argv.slice(2);
  if (inputFiles.length === 0) {
    console.error('Usage: node upload-songs-admin.js <file1.json> [file2.json] ...');
    process.exit(1);
  }

  let allSongs = [];
  for (const file of inputFiles) {
    const songs = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`Loaded ${songs.length} songs from ${file}`);
    allSongs = allSongs.concat(songs);
  }

  // Deduplicate by ID
  const seen = new Set();
  const unique = [];
  for (const song of allSongs) {
    if (!seen.has(song.id)) {
      seen.add(song.id);
      unique.push(song);
    }
  }
  console.log(`Total unique songs: ${unique.length}`);

  // Check existing songs
  const existingSnap = await db.collection('songs').select().get();
  const existingIds = new Set(existingSnap.docs.map((d) => d.id));
  console.log(`Already in Firestore: ${existingIds.size}`);

  const toUpload = unique.filter((s) => !existingIds.has(s.id));
  console.log(`New songs to upload: ${toUpload.length}`);

  if (toUpload.length === 0) {
    console.log('Nothing to upload.');
    return;
  }

  // Upload in batches of 500 (Firestore batch limit)
  const BATCH_SIZE = 450;
  let uploaded = 0;

  for (let i = 0; i < toUpload.length; i += BATCH_SIZE) {
    const chunk = toUpload.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const song of chunk) {
      // Ensure top-level genre field for Firestore queries
      if (!song.genre && song.metadata?.genre) {
        song.genre = song.metadata.genre;
      }
      // Add createdAt if missing
      if (!song.createdAt) {
        song.createdAt = admin.firestore.FieldValue.serverTimestamp();
      }

      const ref = db.collection('songs').doc(song.id);
      batch.set(ref, song, { merge: true });
    }

    await batch.commit();
    uploaded += chunk.length;
    console.log(`Uploaded ${uploaded}/${toUpload.length}`);
  }

  console.log(`\nDone! Uploaded ${uploaded} songs.`);
  console.log(`Total in Firestore: ${existingIds.size + uploaded}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

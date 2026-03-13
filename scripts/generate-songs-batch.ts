/**
 * Batch Song Generator — reads from external JSON song list
 *
 * Usage:
 *   export $(grep -v '^#' .env.local | xargs)
 *   npx tsx scripts/generate-songs-batch.ts --input scripts/song-list-batch2.json [--output /tmp/batch2-songs.json] [--dry-run]
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildSongPrompt,
  validateGeneratedSong,
  assembleSong,
} from '../src/core/songs/songAssembler';
import type { SongRequestParams, Song } from '../src/core/songs/songTypes';
import { writeFileSync, existsSync, readFileSync } from 'fs';

interface GenerativeModel {
  generateContent(prompt: string): Promise<{
    response: { text(): string };
  }>;
}

async function generateSong(
  model: GenerativeModel,
  params: SongRequestParams,
): Promise<Song | null> {
  const prompt = buildSongPrompt(params);
  let song = await attemptGeneration(model, prompt);
  if (!song) {
    const retryPrompt =
      prompt +
      '\n\nPrevious attempt failed. Ensure each section has valid ABC notation with all required headers (X:, T:, M:, L:, K:).';
    song = await attemptGeneration(model, retryPrompt);
  }
  return song;
}

async function attemptGeneration(
  model: GenerativeModel,
  prompt: string,
): Promise<Song | null> {
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed: unknown = JSON.parse(text);
  if (!validateGeneratedSong(parsed)) return null;
  return assembleSong(parsed, 'gemini');
}

function loadExistingSongs(outputPath: string): Song[] {
  if (existsSync(outputPath)) {
    try {
      return JSON.parse(readFileSync(outputPath, 'utf-8')) as Song[];
    } catch {
      return [];
    }
  }
  return [];
}

function songAlreadyGenerated(existing: Song[], title: string): boolean {
  const normalised = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  return existing.some((s) => {
    const existingNorm = s.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    return existingNorm === normalised || existingNorm.includes(normalised) || normalised.includes(existingNorm);
  });
}

const DELAY_BETWEEN_SONGS_MS = 1500;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const inputIdx = args.indexOf('--input');
  const outputIdx = args.indexOf('--output');

  if (inputIdx < 0 || !args[inputIdx + 1]) {
    console.error('Usage: npx tsx scripts/generate-songs-batch.ts --input <songs.json> [--output <out.json>] [--dry-run]');
    process.exit(1);
  }

  const inputFile = args[inputIdx + 1];
  const outputFile = outputIdx >= 0 ? args[outputIdx + 1] : '/tmp/batch-songs.json';

  const songList: SongRequestParams[] = JSON.parse(readFileSync(inputFile, 'utf-8'));

  console.log(`Batch Song Generator`);
  console.log(`====================`);
  console.log(`Input: ${inputFile} (${songList.length} songs)`);
  console.log(`Output: ${outputFile}`);
  console.log(`Dry run: ${dryRun}\n`);

  if (dryRun) {
    for (let i = 0; i < songList.length; i++) {
      const s = songList[i];
      console.log(`  ${i + 1}. ${s.title}${s.artist ? ` — ${s.artist}` : ''} (difficulty ${s.difficulty})`);
    }
    console.log(`\nTotal: ${songList.length} songs`);
    return;
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: EXPO_PUBLIC_GEMINI_API_KEY not set.');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.8,
    },
  });

  const existingSongs = loadExistingSongs(outputFile);
  if (existingSongs.length > 0) {
    console.log(`Resuming — ${existingSongs.length} songs already in ${outputFile}\n`);
  }

  const allSongs = [...existingSongs];
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < songList.length; i++) {
    const params = songList[i];

    if (songAlreadyGenerated(allSongs, params.title)) {
      console.log(`[${i + 1}/${songList.length}] Skipping (already done): ${params.title}`);
      skippedCount++;
      continue;
    }

    console.log(`[${i + 1}/${songList.length}] Generating: ${params.title}...`);

    try {
      const song = await generateSong(model, params);
      if (song) {
        console.log(`  ✓ ${song.id} — ${song.sections.length} sections, ${song.metadata.durationSeconds}s, genre: ${song.metadata.genre}`);
        allSongs.push(song);
        successCount++;
        writeFileSync(outputFile, JSON.stringify(allSongs, null, 2));
      } else {
        console.log(`  ✗ Generation returned null`);
        failCount++;
      }
    } catch (err) {
      console.error(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
      failCount++;
    }

    if (i < songList.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_SONGS_MS));
    }
  }

  console.log(`\nDone! Generated: ${successCount}, Failed: ${failCount}, Skipped: ${skippedCount}`);
  console.log(`Total songs in output: ${allSongs.length}`);
  console.log(`Written to: ${outputFile}`);
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});

#!/usr/bin/env npx tsx
/**
 * Fix Songs: Parse ABC → Layers
 *
 * Some Gemini-generated songs were uploaded with raw ABC notation
 * (melodyABC/accompanimentABC) instead of parsed layers (melody/accompaniment/full).
 * This script parses the ABC and updates the documents in Firestore.
 *
 * Usage:
 *   gcloud auth application-default login --project keysense-app
 *   npx tsx scripts/fix-songs-parse-abc.ts [--dry-run]
 */

import * as admin from 'firebase-admin';
import { parseABC } from '../src/core/songs/abcParser';
import type { NoteEvent } from '../src/core/exercises/types';

const PROJECT_ID = 'keysense-app';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: PROJECT_ID,
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

interface RawSection {
  label: string;
  melodyABC: string;
  accompanimentABC?: string;
  id?: string;
  startBeat?: number;
  endBeat?: number;
  difficulty?: number;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  console.log('\n=== Fix Songs: Parse ABC → Layers ===\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE (will update Firestore)'}\n`);

  const snap = await db.collection('songs').get();
  console.log(`Total songs in Firestore: ${snap.size}`);

  let needsFix = 0;
  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  const docs: { id: string; data: admin.firestore.DocumentData }[] = [];
  snap.forEach(doc => docs.push({ id: doc.id, data: doc.data() }));

  // Filter to songs that have melodyABC but no layers
  const toFix = docs.filter(d => {
    const sec = d.data.sections?.[0];
    return sec?.melodyABC && !sec?.layers;
  });

  needsFix = toFix.length;
  console.log(`Songs needing ABC → layers conversion: ${needsFix}\n`);

  for (const { id, data } of toFix) {
    const title = data.metadata?.title || id;
    const sections = data.sections as RawSection[];

    try {
      const parsedSections = [];
      let sectionOk = true;

      for (let i = 0; i < sections.length; i++) {
        const raw = sections[i];

        // Parse melody
        const melodyResult = parseABC(raw.melodyABC);
        if ('error' in melodyResult) {
          console.log(`  FAIL ${title} — section "${raw.label}" melody parse error: ${melodyResult.error}`);
          sectionOk = false;
          break;
        }

        const melodyNotes: NoteEvent[] = melodyResult.notes.map(n => ({
          ...n,
          hand: 'right' as const,
        }));

        // Parse accompaniment (optional)
        let accompNotes: NoteEvent[] | undefined;
        if (raw.accompanimentABC) {
          const accompResult = parseABC(raw.accompanimentABC);
          if (!('error' in accompResult)) {
            accompNotes = accompResult.notes.map(n => ({
              ...n,
              hand: 'left' as const,
            }));
          }
        }

        // Build full layer
        const fullNotes = accompNotes
          ? [...melodyNotes, ...accompNotes].sort((a, b) => a.startBeat - b.startBeat)
          : melodyNotes;

        // Calculate section bounds
        const allNotes = fullNotes.length > 0 ? fullNotes : melodyNotes;
        const startBeat = allNotes.length > 0
          ? Math.min(...allNotes.map(n => n.startBeat))
          : 0;
        const endBeat = allNotes.length > 0
          ? Math.max(...allNotes.map(n => n.startBeat + n.durationBeats))
          : 0;

        parsedSections.push({
          id: raw.id || `section-${i}`,
          label: raw.label,
          startBeat,
          endBeat,
          difficulty: raw.difficulty || data.metadata?.difficulty || 2,
          layers: {
            melody: melodyNotes,
            ...(accompNotes ? { accompaniment: accompNotes } : {}),
            full: fullNotes,
          },
        });
      }

      if (!sectionOk || parsedSections.length === 0) {
        failed++;
        continue;
      }

      // Check we actually got notes
      const totalNotes = parsedSections.reduce(
        (sum, s) => sum + s.layers.melody.length, 0,
      );
      if (totalNotes === 0) {
        console.log(`  FAIL ${title} — parsed 0 melody notes`);
        failed++;
        continue;
      }

      if (dryRun) {
        const noteCount = parsedSections.reduce(
          (sum, s) => sum + s.layers.full.length, 0,
        );
        console.log(`  OK   ${title}: ${parsedSections.length} sections, ${noteCount} notes`);
      } else {
        await db.collection('songs').doc(id).update({
          sections: parsedSections,
        });
        console.log(`  FIX  ${title}: ${parsedSections.length} sections updated`);
      }

      fixed++;
    } catch (err) {
      console.log(`  ERR  ${title}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  skipped = snap.size - needsFix;

  console.log('\n--- Summary ---');
  console.log(`  Total songs:     ${snap.size}`);
  console.log(`  Needed fix:      ${needsFix}`);
  console.log(`  Fixed:           ${fixed}`);
  console.log(`  Failed to parse: ${failed}`);
  console.log(`  Already correct: ${skipped}`);

  if (dryRun) {
    console.log('\n  (Dry run — no Firestore updates. Remove --dry-run to apply.)');
  }
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(2);
});

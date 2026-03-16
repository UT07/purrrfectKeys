#!/usr/bin/env npx tsx
/**
 * Fix Pedagogical Issues in Generated Exercises
 *
 * Fixes two categories found by validate-exercise.ts:
 * 1. Compound time skills with [4,4] time signature → fix to appropriate compound time
 * 2. Dynamics skills with velocitySensitive=false → set to true
 *
 * Usage:
 *   npx tsx scripts/fix-exercise-pedagogy.ts [--dry-run]
 */

import fs from 'fs';
import path from 'path';

const EXERCISES_DIR = path.join(__dirname, '../content/exercises');

// Skills that require compound/non-4/4 time signatures
const COMPOUND_TIME_SKILLS = new Set([
  'compound-time', '6-8-time', '6-8-time-basics', '12-8-time',
  'compound-meters', 'mixed-meter', 'irregular-time',
]);

// Skills that require velocity-sensitive scoring
const DYNAMICS_SKILLS = new Set([
  'dynamics-p-f', 'dynamics', 'crescendo-diminuendo', 'expression',
  'dynamic-contrast', 'forte-piano', 'pianissimo', 'fortissimo',
  'dynamics-control', 'musical-expression',
]);

// Description patterns that indicate compound time
const COMPOUND_DESC_PATTERN = /6\/8|12\/8|compound|waltz|3\/4|lilting|jig|triplet feel/i;

// Description patterns that indicate dynamics
const DYNAMICS_DESC_PATTERN = /dynamics|forte|piano|crescendo|diminuendo|loud|soft|p and f|expression|dynamic/i;

interface Exercise {
  id: string;
  metadata: {
    title: string;
    description: string;
    skills: string[];
    [key: string]: unknown;
  };
  settings: {
    tempo: number;
    timeSignature: [number, number];
    [key: string]: unknown;
  };
  scoring: {
    velocitySensitive: boolean;
    [key: string]: unknown;
  };
  notes: Array<{
    note: number;
    startBeat: number;
    durationBeats: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

function findJsonFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findJsonFiles(fullPath));
    else if (entry.name.endsWith('.json')) results.push(fullPath);
  }
  return results.sort();
}

/**
 * Determine the best compound time signature for an exercise based on its skills and description.
 */
function pickCompoundTimeSignature(ex: Exercise): [number, number] {
  const skills = ex.metadata.skills;
  const desc = (ex.metadata.description + ' ' + ex.metadata.title).toLowerCase();

  // Specific skill mappings
  if (skills.includes('6-8-time') || skills.includes('6-8-time-basics') || /6\/8|jig|lilting/.test(desc)) {
    return [6, 8];
  }
  if (skills.includes('12-8-time') || /12\/8/.test(desc)) {
    return [12, 8];
  }
  if (/waltz|3\/4/.test(desc)) {
    return [3, 4];
  }
  if (skills.includes('mixed-meter') || skills.includes('irregular-time')) {
    // For mixed meter, use 5/4 or 7/8 — pick based on note count heuristic
    const totalBeats = ex.notes.length > 0
      ? Math.max(...ex.notes.map(n => n.startBeat + n.durationBeats))
      : 0;
    if (totalBeats % 5 === 0 || /5\/4/.test(desc)) return [5, 4];
    if (/7\/8/.test(desc)) return [7, 8];
    return [5, 4]; // Default mixed meter
  }
  if (skills.includes('compound-time') || skills.includes('compound-meters')) {
    return [6, 8]; // Default compound
  }

  return [6, 8]; // Fallback
}

/**
 * Rescale note beats from 4/4 to compound time.
 * Notes in 4/4 use quarter-note beats. In 6/8, the beat unit is a dotted quarter (3 eighth notes).
 * We scale beats by 1.5x (4/4 quarter = 1 beat → 6/8 dotted quarter = 1.5 eighth-note beats).
 */
function rescaleNotesForCompoundTime(
  notes: Exercise['notes'],
  _oldTimeSig: [number, number],
  newTimeSig: [number, number],
): Exercise['notes'] {
  // If changing from simple to compound, we need to adjust beat values
  // In 6/8: the "beat" is a dotted quarter note = 1.5 × eighth note
  // The notes were generated assuming 4/4 quarter-note beats
  // We preserve the relative spacing but adjust durations for the compound feel

  if (newTimeSig[1] === 8) {
    // Convert quarter-note beats to compound eighth-note groupings
    // Scale factor: each "beat" in 4/4 maps to 1.5 eighth notes in 6/8
    return notes.map(n => ({
      ...n,
      startBeat: Math.round(n.startBeat * 1.5 * 100) / 100,
      durationBeats: Math.round(n.durationBeats * 1.5 * 100) / 100,
    }));
  }

  // For 3/4 or 5/4, no scaling needed (same beat unit: quarter note)
  return notes;
}

function main(): void {
  const dryRun = process.argv.includes('--dry-run');
  const files = findJsonFiles(EXERCISES_DIR);

  console.log(`\n=== Exercise Pedagogy Fixer ===\n`);
  console.log(`Found ${files.length} exercise files`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE (will modify files)'}\n`);

  let timeSignatureFixed = 0;
  let dynamicsFixed = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const ex: Exercise = JSON.parse(content);
      let modified = false;

      // Fix 1: Compound time signature
      const hasCompoundSkill = ex.metadata.skills.some(s => COMPOUND_TIME_SKILLS.has(s));
      const descMentionsCompound = COMPOUND_DESC_PATTERN.test(ex.metadata.description) || COMPOUND_DESC_PATTERN.test(ex.metadata.title);

      if ((hasCompoundSkill || descMentionsCompound) && ex.settings.timeSignature[0] === 4 && ex.settings.timeSignature[1] === 4) {
        const newTimeSig = pickCompoundTimeSignature(ex);
        const oldTimeSig = ex.settings.timeSignature;

        if (!dryRun) {
          ex.notes = rescaleNotesForCompoundTime(ex.notes, oldTimeSig, newTimeSig);
          ex.settings.timeSignature = newTimeSig;
        }

        console.log(`  FIX  ${ex.id}: timeSignature [4,4] → [${newTimeSig}]`);
        timeSignatureFixed++;
        modified = true;
      }

      // Fix 2: Dynamics scoring
      const hasDynamicsSkill = ex.metadata.skills.some(s => DYNAMICS_SKILLS.has(s));
      const descMentionsDynamics = DYNAMICS_DESC_PATTERN.test(ex.metadata.description) || DYNAMICS_DESC_PATTERN.test(ex.metadata.title);

      if ((hasDynamicsSkill || descMentionsDynamics) && ex.scoring.velocitySensitive === false) {
        if (!dryRun) {
          ex.scoring.velocitySensitive = true;
        }

        console.log(`  FIX  ${ex.id}: velocitySensitive false → true`);
        dynamicsFixed++;
        modified = true;
      }

      // Write back
      if (modified && !dryRun) {
        fs.writeFileSync(file, JSON.stringify(ex, null, 2) + '\n', 'utf-8');
      }

      if (!modified) skipped++;
    } catch (e) {
      console.log(`  SKIP ${path.basename(file)}: ${e instanceof Error ? e.message : String(e)}`);
      skipped++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`  Time signature fixes: ${timeSignatureFixed}`);
  console.log(`  Dynamics fixes:       ${dynamicsFixed}`);
  console.log(`  Unchanged:            ${skipped}`);
  console.log(`  Total files:          ${files.length}`);

  if (dryRun) {
    console.log(`\n  (Dry run — no files were modified. Remove --dry-run to apply fixes.)`);
  }
}

main();

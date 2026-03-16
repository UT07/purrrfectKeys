#!/usr/bin/env npx tsx
/**
 * Song Content Verification Script (Admin SDK version)
 *
 * Downloads all songs from Firestore using Admin SDK and runs comprehensive validation:
 * 1. Structural integrity (note ranges, durations, beat alignment, sections)
 * 2. Musical plausibility (impossible intervals, empty phrases, duration outliers)
 * 3. Reference melody verification (for well-known songs)
 * 4. Source-specific checks (AI-generated, TheSession, PDMX)
 *
 * Usage:
 *   gcloud auth application-default login --project keysense-app
 *   npx tsx scripts/verify-songs-admin.ts [--source gemini|thesession|pdmx] [--verbose]
 */

import * as admin from 'firebase-admin';

const PROJECT_ID = 'keysense-app';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: PROJECT_ID,
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NoteEvent {
  note: number;
  startBeat: number;
  durationBeats: number;
  hand?: 'left' | 'right';
}

interface SongSection {
  id: string;
  label: string;
  startBeat: number;
  endBeat: number;
  difficulty: number;
  layers: {
    melody: NoteEvent[];
    accompaniment?: NoteEvent[];
    full: NoteEvent[];
  };
}

interface Song {
  id: string;
  version: number;
  type: string;
  source: string;
  metadata: {
    title: string;
    artist: string;
    genre: string;
    difficulty: number;
    durationSeconds: number;
    attribution: string;
  };
  sections: SongSection[];
  settings: {
    tempo: number;
    timeSignature: [number, number];
    keySignature: string;
  };
  scoring: {
    timingToleranceMs: number;
    timingGracePeriodMs: number;
    velocitySensitive: boolean;
    passingScore: number;
    starThresholds: [number, number, number];
  };
}

type Severity = 'error' | 'warning' | 'info';

interface Issue {
  songId: string;
  songTitle: string;
  source: string;
  section?: string;
  severity: Severity;
  category: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Reference melodies
// ---------------------------------------------------------------------------

const REFERENCE_MELODIES: Record<string, number[]> = {
  'twinkle twinkle little star': [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60],
  'mary had a little lamb': [64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67],
  'happy birthday': [60, 60, 62, 60, 65, 64, 60, 60, 62, 60, 67, 65],
  'london bridge': [67, 69, 67, 65, 64, 65, 67, 62, 64, 65, 64, 65, 67],
  'row row row your boat': [60, 60, 60, 62, 64, 64, 62, 64, 65, 67],
  'ode to joy': [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62],
  'amazing grace': [60, 65, 67, 69, 67, 69, 67, 65, 60],
  'jingle bells': [64, 64, 64, 64, 64, 64, 64, 67, 60, 62, 64],
  'fur elise': [76, 75, 76, 75, 76, 71, 74, 72, 69],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PIANO_MIN = 21;
const PIANO_MAX = 108;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

const issues: Issue[] = [];

function addIssue(song: Song, severity: Severity, category: string, message: string, section?: string): void {
  issues.push({ songId: song.id, songTitle: song.metadata.title, source: song.source, section, severity, category, message });
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

function validateStructure(song: Song): void {
  if (!song.sections || song.sections.length === 0) {
    addIssue(song, 'error', 'structure', 'Song has no sections');
    return;
  }

  for (const section of song.sections) {
    if (!section.layers) {
      addIssue(song, 'error', 'structure', 'Section has no layers object', section.label ?? section.id);
      continue;
    }
    if (!section.layers.melody || section.layers.melody.length === 0) {
      addIssue(song, 'error', 'structure', 'Melody layer is empty', section.label ?? section.id);
    }
    if (!section.layers.full || section.layers.full.length === 0) {
      addIssue(song, 'error', 'structure', 'Full layer is empty', section.label ?? section.id);
    }
    if (section.startBeat >= section.endBeat) {
      addIssue(song, 'error', 'structure', `startBeat (${section.startBeat}) >= endBeat (${section.endBeat})`, section.label);
    }

    for (const [layerName, notes] of Object.entries(section.layers)) {
      if (!notes || !Array.isArray(notes)) continue;
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i] as NoteEvent;
        const ctx = `${section.label}/${layerName}[${i}]`;
        if (note.note < PIANO_MIN || note.note > PIANO_MAX) {
          addIssue(song, 'error', 'notes', `Note ${midiToName(note.note)} (${note.note}) outside piano range`, ctx);
        }
        if (note.durationBeats <= 0) {
          addIssue(song, 'error', 'notes', `Duration ${note.durationBeats} is not positive`, ctx);
        }
        if (note.durationBeats > 16) {
          addIssue(song, 'warning', 'notes', `Duration ${note.durationBeats} beats is unusually long`, ctx);
        }
        if (note.startBeat < 0) {
          addIssue(song, 'error', 'notes', `startBeat ${note.startBeat} is negative`, ctx);
        }
      }
    }
  }

  if (song.settings.tempo < 30 || song.settings.tempo > 240) {
    addIssue(song, 'error', 'structure', `Tempo ${song.settings.tempo} outside valid range 30-240`);
  }
  if (song.scoring.passingScore > song.scoring.starThresholds[0]) {
    addIssue(song, 'error', 'structure', `Passing score (${song.scoring.passingScore}) > first star threshold (${song.scoring.starThresholds[0]})`);
  }
}

function validateMusicalContent(song: Song): void {
  if (!song.sections) return;
  for (const section of song.sections) {
    if (!section.layers) continue;
    const melody = section.layers.melody;
    if (!melody || melody.length < 2) continue;
    const sorted = [...melody].sort((a, b) => a.startBeat - b.startBeat);

    // Impossible interval jumps
    for (let i = 1; i < sorted.length; i++) {
      const interval = Math.abs(sorted[i].note - sorted[i - 1].note);
      if (interval > 24) {
        addIssue(song, 'warning', 'musical',
          `Jump of ${interval} semitones (${midiToName(sorted[i - 1].note)} → ${midiToName(sorted[i].note)})`,
          section.label);
      }
    }

    // Range span
    const midiValues = sorted.map(n => n.note);
    const range = Math.max(...midiValues) - Math.min(...midiValues);
    if (range > 36) {
      addIssue(song, 'warning', 'musical', `Melody spans ${range} semitones (${Math.ceil(range / 12)} octaves)`, section.label);
    }

    // Repeated notes
    let maxRepeat = 0, currentRepeat = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].note === sorted[i - 1].note) { currentRepeat++; maxRepeat = Math.max(maxRepeat, currentRepeat); }
      else currentRepeat = 1;
    }
    if (maxRepeat >= 8 && sorted.length > 10) {
      addIssue(song, 'warning', 'musical', `${maxRepeat} consecutive repeated notes`, section.label);
    }

    // Too few pitches
    const uniquePitches = new Set(sorted.map(n => n.note));
    if (uniquePitches.size < 3 && sorted.length >= 10) {
      addIssue(song, 'warning', 'musical', `Only ${uniquePitches.size} unique pitches in ${sorted.length} notes`, section.label);
    }
  }
}

function validateReferenceMelody(song: Song): void {
  const titleLower = song.metadata.title.toLowerCase().replace(/\(.*?\)/g, '').trim();
  const reference = REFERENCE_MELODIES[titleLower];
  if (!reference) return;

  const firstSection = song.sections[0];
  if (!firstSection?.layers.melody?.length) return;

  const melodyNotes = [...firstSection.layers.melody].sort((a, b) => a.startBeat - b.startBeat).map(n => n.note);

  const refIntervals = [];
  for (let i = 1; i < reference.length && i < 12; i++) refIntervals.push(reference[i] - reference[i - 1]);
  const actualIntervals = [];
  for (let i = 1; i < melodyNotes.length && i < 12; i++) actualIntervals.push(melodyNotes[i] - melodyNotes[i - 1]);

  const compareLen = Math.min(refIntervals.length, actualIntervals.length);
  if (compareLen < 4) return;

  let matches = 0;
  for (let i = 0; i < compareLen; i++) {
    if (refIntervals[i] === actualIntervals[i]) matches++;
  }
  const matchRate = matches / compareLen;

  if (matchRate < 0.3) {
    addIssue(song, 'error', 'reference', `Melody does NOT match known reference (${Math.round(matchRate * 100)}% interval match)`);
  } else if (matchRate < 0.6) {
    addIssue(song, 'warning', 'reference', `Melody partially matches reference (${Math.round(matchRate * 100)}% interval match)`);
  }
}

function validateSourceSpecific(song: Song): void {
  if (song.source === 'gemini' && song.metadata.attribution && !song.metadata.attribution.toLowerCase().includes('ai')) {
    addIssue(song, 'warning', 'source', 'AI-generated song missing "AI" in attribution');
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sourceFilter = args.indexOf('--source') >= 0 ? args[args.indexOf('--source') + 1] : null;
  const verbose = args.includes('--verbose');

  console.log('\n=== Purrrfect Keys Song Verification (Admin SDK) ===\n');

  console.log('Fetching songs from Firestore...');
  const songsSnap = await db.collection('songs').get();
  const songs: Song[] = [];
  songsSnap.forEach(doc => {
    const data = doc.data() as Song;
    if (!data.id) data.id = doc.id;
    songs.push(data);
  });

  console.log(`Fetched ${songs.length} songs\n`);

  // Diagnostic: dump structure of first song with missing layers
  if (verbose) {
    const brokenSong = songs.find(s => s.source === 'gemini' && s.sections?.some(sec => !(sec as Record<string, unknown>).layers));
    if (brokenSong) {
      const sec = brokenSong.sections[0];
      console.log(`--- Diagnostic: "${brokenSong.metadata?.title}" section[0] keys:`, Object.keys(sec));
      console.log(`    Section sample:`, JSON.stringify(sec).slice(0, 500));
      console.log();
    }
  }

  const filtered = sourceFilter ? songs.filter(s => s.source === sourceFilter) : songs;
  console.log(`Verifying ${filtered.length} songs${sourceFilter ? ` (source: ${sourceFilter})` : ''}...\n`);

  for (const song of filtered) {
    if (!song.metadata) {
      addIssue(song, 'error', 'structure', 'Song has no metadata');
      continue;
    }
    if (!song.settings) {
      addIssue(song, 'error', 'structure', 'Song has no settings');
      continue;
    }
    if (!song.scoring) {
      addIssue(song, 'error', 'structure', 'Song has no scoring');
      continue;
    }
    validateStructure(song);
    validateMusicalContent(song);
    validateReferenceMelody(song);
    validateSourceSpecific(song);
  }

  // Report
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  const bySource: Record<string, number> = {};
  const byGenre: Record<string, number> = {};
  for (const s of filtered) {
    bySource[s.source] = (bySource[s.source] || 0) + 1;
    byGenre[s.metadata.genre] = (byGenre[s.metadata.genre] || 0) + 1;
  }

  console.log('--- Song Catalogue ---');
  console.log(`Total songs: ${filtered.length}`);
  console.log(`By source: ${Object.entries(bySource).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`By genre: ${Object.entries(byGenre).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log();

  console.log('--- Verification Results ---');
  console.log(`Errors:   ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);
  console.log(`Info:     ${infos.length}`);
  console.log();

  if (errors.length > 0) {
    console.log('=== ERRORS ===');
    for (const issue of errors) {
      const section = issue.section ? ` [${issue.section}]` : '';
      console.log(`  ✗ ${issue.songTitle} (${issue.source})${section}`);
      console.log(`    ${issue.category}: ${issue.message}`);
    }
    console.log();
  }

  if (warnings.length > 0) {
    console.log('=== WARNINGS ===');
    for (const issue of warnings) {
      const section = issue.section ? ` [${issue.section}]` : '';
      console.log(`  ⚠ ${issue.songTitle} (${issue.source})${section}`);
      console.log(`    ${issue.category}: ${issue.message}`);
    }
    console.log();
  }

  if (verbose && infos.length > 0) {
    console.log('=== INFO ===');
    for (const issue of infos) {
      console.log(`  ℹ ${issue.songTitle}: ${issue.message}`);
    }
    console.log();
  }

  const songIssueCount = new Map<string, { errors: number; warnings: number }>();
  for (const issue of [...errors, ...warnings]) {
    const counts = songIssueCount.get(issue.songId) || { errors: 0, warnings: 0 };
    if (issue.severity === 'error') counts.errors++;
    else counts.warnings++;
    songIssueCount.set(issue.songId, counts);
  }

  const cleanSongs = filtered.length - songIssueCount.size;
  console.log(`--- Summary ---`);
  console.log(`Clean songs (no errors/warnings): ${cleanSongs}/${filtered.length} (${Math.round(cleanSongs / filtered.length * 100)}%)`);

  if (songIssueCount.size > 0 && songIssueCount.size <= 30) {
    console.log(`\nSongs with issues:`);
    const sortedIssues = [...songIssueCount.entries()].sort((a, b) => b[1].errors - a[1].errors);
    for (const [songId, counts] of sortedIssues) {
      const song = filtered.find(s => s.id === songId);
      const title = song?.metadata.title || songId;
      const parts = [];
      if (counts.errors > 0) parts.push(`${counts.errors} error(s)`);
      if (counts.warnings > 0) parts.push(`${counts.warnings} warning(s)`);
      console.log(`  ${counts.errors > 0 ? '✗' : '⚠'} ${title}: ${parts.join(', ')}`);
    }
  }

  console.log();
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(2);
});

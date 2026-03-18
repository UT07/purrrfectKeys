/**
 * Cloud Function: Weekly New Songs
 *
 * Scheduled function that runs every Friday at 09:00 UTC.
 * Generates 10 new songs using Gemini 2.0 Flash and saves them to Firestore.
 * Checks existing song titles to avoid duplicates.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import abcjs from 'abcjs';

// ============================================================================
// Types
// ============================================================================

interface GeneratedSongABC {
  title: string;
  artist: string;
  genre: string;
  difficulty: number;
  attribution: string;
  sections: Array<{
    label: string;
    melodyABC: string;
    accompanimentABC?: string;
  }>;
  tempo: number;
  key: string;
}

interface SongSpec {
  title: string;
  artist?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  genre?: string;
}

// ============================================================================
// Song Pool — diverse genres and difficulties for weekly rotation
// ============================================================================

const WEEKLY_SONG_POOL: SongSpec[] = [
  // Pop / Modern
  { title: 'Memories', artist: 'Maroon 5', difficulty: 2 },
  { title: 'Perfect', artist: 'Ed Sheeran', difficulty: 2 },
  { title: 'Believer', artist: 'Imagine Dragons', difficulty: 3 },
  { title: 'Thunder', artist: 'Imagine Dragons', difficulty: 2 },
  { title: 'Happier', artist: 'Marshmello', difficulty: 2 },
  { title: 'Señorita', artist: 'Shawn Mendes & Camila Cabello', difficulty: 2 },
  { title: 'Circles', artist: 'Post Malone', difficulty: 2 },
  { title: 'Unstoppable', artist: 'Sia', difficulty: 3 },
  { title: 'Chandelier', artist: 'Sia', difficulty: 3 },
  { title: 'Shallow', artist: 'Lady Gaga', difficulty: 3 },
  { title: 'Die With a Smile', artist: 'Lady Gaga & Bruno Mars', difficulty: 3 },
  { title: 'APT', artist: 'Rose & Bruno Mars', difficulty: 2 },
  { title: 'Espresso', artist: 'Sabrina Carpenter', difficulty: 2 },
  { title: 'Birds of a Feather', artist: 'Billie Eilish', difficulty: 2 },
  { title: 'Good Luck Babe', artist: 'Chappell Roan', difficulty: 3 },
  { title: 'Cruel Summer', artist: 'Taylor Swift', difficulty: 3 },
  { title: 'Anti-Hero', artist: 'Taylor Swift', difficulty: 2 },
  { title: 'Vampire', artist: 'Olivia Rodrigo', difficulty: 3 },
  { title: 'Elastic Heart', artist: 'Sia', difficulty: 3 },
  { title: 'Let Her Go', artist: 'Passenger', difficulty: 2 },
  { title: 'A Thousand Years', artist: 'Christina Perri', difficulty: 2 },
  { title: 'Stay With Me', artist: 'Sam Smith', difficulty: 2 },
  { title: 'All of Me', artist: 'John Legend', difficulty: 3 },
  { title: 'Photograph', artist: 'Ed Sheeran', difficulty: 2 },
  { title: 'Starboy', artist: 'The Weeknd', difficulty: 3 },
  { title: 'Save Your Tears', artist: 'The Weeknd', difficulty: 2 },
  { title: 'Peaches', artist: 'Justin Bieber', difficulty: 2 },
  { title: 'Uptown Funk', artist: 'Bruno Mars', difficulty: 3 },
  { title: 'Just the Way You Are', artist: 'Bruno Mars', difficulty: 2 },
  { title: 'Counting Stars', artist: 'OneRepublic', difficulty: 3 },

  // Classical
  { title: 'Nocturne Op. 9 No. 2', artist: 'Chopin', difficulty: 4 },
  { title: 'Waltz in A minor', artist: 'Chopin', difficulty: 3 },
  { title: 'Spring from Four Seasons', artist: 'Vivaldi', difficulty: 3 },
  { title: 'Arabesque No. 1', artist: 'Debussy', difficulty: 4 },
  { title: 'Hungarian Dance No. 5', artist: 'Brahms', difficulty: 4 },
  { title: 'Swan Lake Theme', artist: 'Tchaikovsky', difficulty: 3 },
  { title: 'Habanera from Carmen', artist: 'Bizet', difficulty: 3 },
  { title: 'In the Hall of the Mountain King', artist: 'Grieg', difficulty: 3 },
  { title: 'Air on the G String', artist: 'Bach', difficulty: 2 },
  { title: 'Rondo Alla Turca', artist: 'Mozart', difficulty: 4 },

  // Film / TV
  { title: 'Interstellar Main Theme', artist: 'Hans Zimmer', difficulty: 3 },
  { title: 'Time (Inception)', artist: 'Hans Zimmer', difficulty: 3 },
  { title: 'The Godfather Theme', artist: 'Nino Rota', difficulty: 2 },
  { title: 'Mia & Sebastian\'s Theme', artist: 'La La Land', difficulty: 3 },
  { title: 'Hedwig\'s Theme', artist: 'John Williams', difficulty: 3 },
  { title: 'The Imperial March', artist: 'John Williams', difficulty: 2 },
  { title: 'Jurassic Park Theme', artist: 'John Williams', difficulty: 3 },
  { title: 'My Heart Will Go On', artist: 'Titanic', difficulty: 3 },
  { title: 'Moon River', artist: 'Breakfast at Tiffany\'s', difficulty: 2 },
  { title: 'Somewhere Over the Rainbow', difficulty: 2 },

  // Game
  { title: 'Minecraft Theme (Sweden)', artist: 'C418', difficulty: 2 },
  { title: 'Tetris Theme (Korobeiniki)', difficulty: 2 },
  { title: 'Super Mario Bros Theme', artist: 'Nintendo', difficulty: 3 },
  { title: 'Legend of Zelda Main Theme', artist: 'Nintendo', difficulty: 3 },
  { title: 'Undertale - Megalovania', artist: 'Toby Fox', difficulty: 4 },
  { title: 'Pokemon Center Theme', artist: 'Pokemon', difficulty: 2 },
  { title: 'Wii Sports Theme', artist: 'Nintendo', difficulty: 2 },
  { title: 'Stardew Valley Overture', artist: 'ConcernedApe', difficulty: 2 },
  { title: 'Final Fantasy Victory Fanfare', artist: 'Square Enix', difficulty: 2 },
  { title: 'Halo Theme', artist: 'Martin O\'Donnell', difficulty: 3 },

  // Jazz / Blues
  { title: 'Fly Me to the Moon', difficulty: 3, genre: 'jazz' },
  { title: 'Take Five', artist: 'Dave Brubeck', difficulty: 4, genre: 'jazz' },
  { title: 'Autumn Leaves', difficulty: 3, genre: 'jazz' },
  { title: 'Blue Monk', artist: 'Thelonious Monk', difficulty: 3, genre: 'jazz' },
  { title: 'Summertime', artist: 'Gershwin', difficulty: 3, genre: 'jazz' },

  // Holiday
  { title: 'Jingle Bells', difficulty: 1, genre: 'holiday' },
  { title: 'Silent Night', difficulty: 1, genre: 'holiday' },
  { title: 'We Wish You a Merry Christmas', difficulty: 1, genre: 'holiday' },
  { title: 'O Christmas Tree', difficulty: 1, genre: 'holiday' },
  { title: 'Joy to the World', difficulty: 2, genre: 'holiday' },

  // Kids / Nursery
  { title: 'Baby Shark', difficulty: 1, genre: 'kids' },
  { title: 'Old MacDonald Had a Farm', difficulty: 1, genre: 'kids' },
  { title: 'Itsy Bitsy Spider', difficulty: 1, genre: 'kids' },
  { title: 'Wheels on the Bus', difficulty: 1, genre: 'kids' },
  { title: 'Baa Baa Black Sheep', difficulty: 1, genre: 'kids' },

  // R&B / Soul
  { title: 'Ain\'t No Sunshine', artist: 'Bill Withers', difficulty: 2 },
  { title: 'Lean on Me', artist: 'Bill Withers', difficulty: 2 },
  { title: 'Stand By Me', artist: 'Ben E. King', difficulty: 2 },
  { title: 'What a Wonderful World', artist: 'Louis Armstrong', difficulty: 2 },
  { title: 'Hallelujah', artist: 'Leonard Cohen', difficulty: 2 },

  // Anime
  { title: 'Unravel (Tokyo Ghoul)', artist: 'TK', difficulty: 3 },
  { title: 'Blue Bird (Naruto)', difficulty: 3 },
  { title: 'Gurenge (Demon Slayer)', artist: 'LiSA', difficulty: 3 },
  { title: 'A Cruel Angel\'s Thesis (Evangelion)', difficulty: 3 },
  { title: 'My Neighbor Totoro Theme', artist: 'Joe Hisaishi', difficulty: 2 },
  { title: 'Merry-Go-Round of Life (Howl\'s Moving Castle)', artist: 'Joe Hisaishi', difficulty: 3 },
  { title: 'One Summer\'s Day (Spirited Away)', artist: 'Joe Hisaishi', difficulty: 3 },

  // K-Pop
  { title: 'Dynamite', artist: 'BTS', difficulty: 2 },
  { title: 'Love Dive', artist: 'IVE', difficulty: 2 },
  { title: 'Super Shy', artist: 'NewJeans', difficulty: 2 },
  { title: 'How You Like That', artist: 'BLACKPINK', difficulty: 3 },
];

// ============================================================================
// Helpers
// ============================================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function difficultyGuide(d: number): string {
  switch (d) {
    case 1: return 'whole/half notes only, C major, very slow';
    case 2: return 'quarter notes, C/G major, simple rhythms';
    case 3: return 'eighth notes OK, any major key, moderate tempo';
    case 4: return 'sixteenth notes, minor keys OK, faster tempo';
    case 5: return 'complex rhythms, any key, performance tempo';
    default: return 'moderate difficulty';
  }
}

function buildPrompt(spec: SongSpec): string {
  const artistHint = spec.artist ? ` by ${spec.artist}` : '';

  return `Generate a simplified beginner piano arrangement of "${spec.title}"${artistHint}.

Return JSON with this exact structure:
{
  "title": "Song Title",
  "artist": "Original Artist",
  "genre": "pop|classical|folk|film|game|holiday|jazz|blues|kids|hymn|anime|kpop",
  "difficulty": ${spec.difficulty},
  "attribution": "AI arrangement — simplified for learning",
  "tempo": <BPM 60-160>,
  "key": "<key signature letter, e.g. C, G, F, Am>",
  "sections": [
    {
      "label": "Verse 1",
      "melodyABC": "X:1\\nT:Verse 1\\nM:4/4\\nL:1/8\\nK:C\\n<ABC notes here>|",
      "accompanimentABC": "X:1\\nT:Verse 1 LH\\nM:4/4\\nL:1/4\\nK:C\\n<optional LH notes>|"
    }
  ]
}

RULES:
- Each section's melodyABC must be complete, valid ABC notation with X:, T:, M:, L:, K: headers
- Keep MIDI range 48-84 (C3 to C6)
- Melody should be right hand, mostly stepwise motion
- Accompaniment (optional) should be left hand, simple chords or bass notes
- Split into 2-4 sections (verse, chorus, bridge, etc.)
- Each section should be 4-16 bars
- Difficulty ${spec.difficulty}/5: ${difficultyGuide(spec.difficulty)}
- Use common time signatures (4/4 or 3/4)
- For well-known songs, preserve the recognizable melody
- Attribution must always say "AI arrangement"`;
}

function validateSong(raw: unknown): raw is GeneratedSongABC {
  if (raw === null || raw === undefined || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== 'string' || obj.title.length === 0) return false;
  if (typeof obj.artist !== 'string') return false;
  if (typeof obj.genre !== 'string') return false;
  if (typeof obj.difficulty !== 'number' || obj.difficulty < 1 || obj.difficulty > 5) return false;
  if (typeof obj.attribution !== 'string') return false;
  if (typeof obj.tempo !== 'number' || obj.tempo < 30 || obj.tempo > 240) return false;
  if (typeof obj.key !== 'string') return false;
  if (!Array.isArray(obj.sections) || obj.sections.length === 0) return false;
  for (const section of obj.sections) {
    if (typeof section !== 'object' || section === null || section === undefined) return false;
    const s = section as Record<string, unknown>;
    if (typeof s.label !== 'string' || s.label.length === 0) return false;
    if (typeof s.melodyABC !== 'string' || s.melodyABC.length === 0) return false;
  }
  return true;
}

// ============================================================================
// Main Scheduled Function
// ============================================================================

export const weeklyNewSongs = onSchedule(
  {
    schedule: 'every friday 09:00',
    timeZone: 'UTC',
    region: 'us-central1',
    secrets: ['GEMINI_API_KEY'],
    timeoutSeconds: 540, // 9 minutes (max for scheduled functions)
    memory: '512MiB',
  },
  async () => {
    const db = admin.firestore();
    const SONGS_PER_WEEK = 10;

    logger.info('Weekly song generation started');

    // Step 1: Get all existing song titles to avoid duplicates
    const existingSnap = await db.collection('songs')
      .select('metadata.title', 'metadata.artist')
      .get();

    const existingTitles = new Set<string>();
    existingSnap.forEach(doc => {
      const data = doc.data();
      const title = data.metadata?.title?.toLowerCase() || '';
      const artist = data.metadata?.artist?.toLowerCase() || '';
      // Normalize: "title - artist" to catch variations
      existingTitles.add(title);
      existingTitles.add(`${title}|${artist}`);
      // Also add the slug to catch ID-based duplicates
      existingTitles.add(slugify(title));
    });

    logger.info(`Existing songs: ${existingSnap.size}, unique title keys: ${existingTitles.size}`);

    // Step 2: Filter pool to only songs we haven't generated yet
    const candidates = WEEKLY_SONG_POOL.filter(spec => {
      const titleLower = spec.title.toLowerCase();
      const artistLower = (spec.artist || '').toLowerCase();
      // Check multiple forms to catch duplicates
      return !existingTitles.has(titleLower)
        && !existingTitles.has(`${titleLower}|${artistLower}`)
        && !existingTitles.has(slugify(spec.title));
    });

    if (candidates.length === 0) {
      logger.info('No new songs to generate — pool exhausted. Consider adding more songs to WEEKLY_SONG_POOL.');
      return;
    }

    // Step 3: Pick songs for this week (deterministic shuffle based on week number)
    const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const shuffled = [...candidates].sort((a, b) => {
      const hashA = simpleHash(`${weekNum}-${a.title}`) % 10000;
      const hashB = simpleHash(`${weekNum}-${b.title}`) % 10000;
      return hashA - hashB;
    });
    const toGenerate = shuffled.slice(0, SONGS_PER_WEEK);

    logger.info(`Generating ${toGenerate.length} new songs (${candidates.length} candidates remaining)`);

    // Step 4: Generate with Gemini
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      logger.error('GEMINI_API_KEY not set — aborting');
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      },
    });

    let generated = 0;
    let failed = 0;

    for (const spec of toGenerate) {
      try {
        const prompt = buildPrompt(spec);
        const result = await model.generateContent(prompt);
        let parsed: unknown;
        try {
          parsed = JSON.parse(result.response.text());
        } catch {
          logger.warn(`Gemini returned invalid JSON for "${spec.title}" (attempt 1)`);
          parsed = null;
        }

        if (!parsed || !validateSong(parsed)) {
          // Retry once
          const retryPrompt = prompt +
            '\n\nPrevious attempt failed validation. Ensure all sections have valid ABC notation with X:, T:, M:, L:, K: headers.';
          const retryResult = await model.generateContent(retryPrompt);
          let retryParsed: unknown;
          try {
            retryParsed = JSON.parse(retryResult.response.text());
          } catch {
            logger.warn(`Gemini returned invalid JSON for "${spec.title}" (attempt 2)`);
            retryParsed = null;
          }

          if (!retryParsed || !validateSong(retryParsed)) {
            logger.warn(`Failed to generate valid song: ${spec.title}`);
            failed++;
            continue;
          }

          await saveSong(db, retryParsed, weekNum, existingTitles);
          generated++;
          continue;
        }

        await saveSong(db, parsed, weekNum, existingTitles);
        generated++;
      } catch (err) {
        logger.error(`Error generating "${spec.title}": ${err}`);
        failed++;
      }
    }

    logger.info(`Weekly song generation complete: ${generated} generated, ${failed} failed, ${existingSnap.size + generated} total in Firestore`);
  },
);

// ============================================================================
// Helpers
// ============================================================================

async function saveSong(
  db: admin.firestore.Firestore,
  raw: GeneratedSongABC,
  weekNum: number,
  existingTitles: Set<string>,
): Promise<void> {
  const slug = slugify(raw.title);
  // Deterministic ID: re-runs for the same week overwrite rather than duplicate
  const id = `weekly-${slug}-w${weekNum}`;

  // Final duplicate check (race condition guard)
  if (existingTitles.has(raw.title.toLowerCase())) {
    logger.warn(`Skipping duplicate: ${raw.title}`);
    return;
  }

  // Parse ABC sections into layers
  const parsedSections = parseSectionsToLayers(raw.sections, raw.difficulty);
  if (!parsedSections) {
    logger.warn(`Skipping ${raw.title}: failed to parse ABC sections`);
    return;
  }

  const songDoc = {
    id,
    version: 1,
    type: 'song',
    source: 'gemini',
    metadata: {
      title: raw.title,
      artist: raw.artist || 'Traditional',
      genre: normalizeGenre(raw.genre),
      difficulty: Math.min(5, Math.max(1, raw.difficulty)),
      attribution: raw.attribution || 'AI arrangement — simplified for learning',
    },
    sections: parsedSections,
    settings: {
      tempo: raw.tempo,
      timeSignature: [4, 4],
      keySignature: raw.key || 'C',
      countIn: 4,
      metronomeEnabled: true,
      loopEnabled: false,
    },
    scoring: {
      timingToleranceMs: 50,
      timingGracePeriodMs: 150,
      passingScore: 70,
      starThresholds: [70, 85, 95],
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    generatedBy: 'weekly-scheduler',
  };

  await db.collection('songs').doc(id).set(songDoc);
  existingTitles.add(raw.title.toLowerCase());
  logger.info(`Saved: ${raw.title} (${id})`);
}

// ---------------------------------------------------------------------------
// ABC → Layers parsing (mirrors src/core/songs/abcParser.ts logic)
// ---------------------------------------------------------------------------

interface NoteEvent {
  note: number;
  startBeat: number;
  durationBeats: number;
  hand?: 'left' | 'right';
}

const DIATONIC_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const LETTER_TO_INDEX: Record<string, number> = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };

function abcPitchToMidi(
  pitch: number,
  accidental: string | undefined,
  keyAccidentals: Map<number, number>,
): number {
  const octaveOffset = Math.floor(pitch / 7);
  const diatonicStep = ((pitch % 7) + 7) % 7;
  let midi = 60 + octaveOffset * 12 + DIATONIC_SEMITONES[diatonicStep];
  if (accidental === 'sharp') midi += 1;
  else if (accidental === 'flat') midi -= 1;
  else if (accidental === 'natural') { /* no key sig */ }
  else if (keyAccidentals.has(diatonicStep)) midi += keyAccidentals.get(diatonicStep)!;
  return midi;
}

function buildKeyAccidentals(accidentals: Array<{ acc: string; note: string }>): Map<number, number> {
  const map = new Map<number, number>();
  for (const ka of accidentals) {
    const idx = LETTER_TO_INDEX[ka.note.toLowerCase()];
    if (idx === undefined) continue;
    if (ka.acc === 'sharp') map.set(idx, 1);
    else if (ka.acc === 'flat') map.set(idx, -1);
  }
  return map;
}

function parseABCToNotes(abcString: string): NoteEvent[] | null {
  if (!abcString || abcString.trim().length === 0) return null;

  // Normalize double newlines (Gemini often produces \n\n between headers)
  const normalized = abcString.replace(/\n{2,}/g, '\n');

  let tunes;
  try {
    tunes = abcjs.parseOnly(normalized);
  } catch {
    return null;
  }

  if (!tunes || !tunes[0]?.lines?.length) return null;

  const tune = tunes[0];
  const firstStaff = tune.lines[0]?.staff?.[0];
  const keyAccidentals = buildKeyAccidentals(firstStaff?.key?.accidentals ?? []);

  let timeSignature: [number, number] = [4, 4];
  if (firstStaff?.meter?.value?.[0]) {
    const num = parseInt(String(firstStaff.meter.value[0].num), 10);
    const den = parseInt(String(firstStaff.meter.value[0].den), 10);
    if (!isNaN(num) && !isNaN(den) && num > 0 && den > 0) timeSignature = [num, den];
  }
  const beatValue = timeSignature[1];

  const notes: NoteEvent[] = [];
  let currentBeat = 0;
  const activeTies = new Map<number, number>();

  for (const line of tune.lines) {
    if (!line.staff) continue;
    for (const staff of line.staff) {
      if (!staff.voices) continue;
      for (const voice of staff.voices) {
        for (const element of voice) {
          if (element.el_type !== 'note') continue;
          const beatsForElement = element.duration * beatValue;
          if (!element.pitches || element.pitches.length === 0) {
            currentBeat += beatsForElement;
            continue;
          }
          for (const p of element.pitches) {
            const midi = abcPitchToMidi(p.pitch, p.accidental, keyAccidentals);
            if (p.endTie && activeTies.has(midi)) {
              const tiedIdx = activeTies.get(midi)!;
              notes[tiedIdx].durationBeats += beatsForElement;
              if (p.startTie) activeTies.set(midi, tiedIdx);
              else activeTies.delete(midi);
              continue;
            }
            notes.push({ note: midi, startBeat: currentBeat, durationBeats: beatsForElement });
            if (p.startTie) activeTies.set(midi, notes.length - 1);
          }
          currentBeat += beatsForElement;
        }
      }
    }
  }

  return notes.length > 0 ? notes : null;
}

function parseSectionsToLayers(rawSections: GeneratedSongABC['sections'], difficulty: number) {
  const parsed = [];
  for (let i = 0; i < rawSections.length; i++) {
    const raw = rawSections[i];
    const melodyNotes = parseABCToNotes(raw.melodyABC);
    if (!melodyNotes) {
      logger.warn(`Failed to parse melody for section "${raw.label}"`);
      return null;
    }
    const melody = melodyNotes.map(n => ({ ...n, hand: 'right' as const }));

    let accomp: NoteEvent[] | undefined;
    if (raw.accompanimentABC) {
      const accompNotes = parseABCToNotes(raw.accompanimentABC);
      if (accompNotes) accomp = accompNotes.map(n => ({ ...n, hand: 'left' as const }));
    }

    const full = accomp
      ? [...melody, ...accomp].sort((a, b) => a.startBeat - b.startBeat)
      : melody;

    const allNotes = full.length > 0 ? full : melody;
    const startBeat = Math.min(...allNotes.map(n => n.startBeat));
    const endBeat = Math.max(...allNotes.map(n => n.startBeat + n.durationBeats));

    parsed.push({
      id: `section-${i}`,
      label: raw.label,
      startBeat,
      endBeat,
      difficulty: Math.min(5, Math.max(1, difficulty)),
      layers: {
        melody,
        ...(accomp ? { accompaniment: accomp } : {}),
        full,
      },
    });
  }
  return parsed;
}

function normalizeGenre(genre: string): string {
  const g = genre.toLowerCase();
  if (g.includes('classic')) return 'classical';
  if (g.includes('folk')) return 'folk';
  if (g.includes('film') || g.includes('movie') || g.includes('soundtrack')) return 'film';
  if (g.includes('game') || g.includes('video')) return 'game';
  if (g.includes('holiday') || g.includes('christmas')) return 'holiday';
  if (g.includes('jazz')) return 'jazz';
  if (g.includes('blues')) return 'blues';
  if (g.includes('kids') || g.includes('nursery') || g.includes('children')) return 'kids';
  if (g.includes('hymn') || g.includes('gospel') || g.includes('spiritual')) return 'hymn';
  if (g.includes('anime')) return 'anime';
  if (g.includes('kpop') || g.includes('k-pop')) return 'kpop';
  return 'pop';
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

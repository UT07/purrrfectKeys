/**
 * Batch Song Generator (Gemini)
 *
 * Generates simplified piano arrangements for well-known songs using
 * Gemini 2.0 Flash. Calls the Gemini API directly (no Firebase needed)
 * and outputs Song JSON to a file.
 *
 * Usage: npx tsx scripts/generate-songs.ts [--dry-run] [--start 0] [--count 10] [--output songs.json]
 *
 * Prerequisites:
 * - EXPO_PUBLIC_GEMINI_API_KEY env var (source from .env.local)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildSongPrompt,
  validateGeneratedSong,
  assembleSong,
} from '../src/core/songs/songAssembler';
import type { SongRequestParams, Song } from '../src/core/songs/songTypes';
import { writeFileSync, existsSync, readFileSync } from 'fs';

// ---------------------------------------------------------------------------
// Curated song list — songs likely in public domain or AI-arrangeable
// ---------------------------------------------------------------------------

const SONG_LIST: SongRequestParams[] = [
  // Classical (difficulty 2-4)
  { title: 'Fur Elise', artist: 'Beethoven', difficulty: 3 },
  { title: 'Moonlight Sonata (simplified)', artist: 'Beethoven', difficulty: 4 },
  { title: 'Canon in D (simplified)', artist: 'Pachelbel', difficulty: 3 },
  { title: 'Clair de Lune (simplified)', artist: 'Debussy', difficulty: 4 },
  { title: 'Prelude in C Major', artist: 'J.S. Bach', difficulty: 3 },
  { title: 'Minuet in G', artist: 'J.S. Bach', difficulty: 2 },
  { title: 'Turkish March', artist: 'Mozart', difficulty: 4 },
  { title: 'Ode to Joy', artist: 'Beethoven', difficulty: 1 },
  { title: 'The Entertainer', artist: 'Scott Joplin', difficulty: 3 },
  { title: 'Gymnopédie No. 1', artist: 'Erik Satie', difficulty: 2 },

  // Pop / Contemporary — HIGH RETENTION (difficulty 1-4)
  // Classic / Traditional Pop
  { title: 'Happy Birthday', difficulty: 1 },
  { title: 'Twinkle Twinkle Little Star', difficulty: 1 },
  { title: 'Mary Had a Little Lamb', difficulty: 1 },
  { title: 'London Bridge', difficulty: 1 },
  { title: 'Row Row Row Your Boat', difficulty: 1 },
  { title: 'Amazing Grace', difficulty: 2 },
  { title: 'Greensleeves', difficulty: 2 },
  { title: 'Auld Lang Syne', difficulty: 2 },
  { title: 'When the Saints Go Marching In', difficulty: 2 },
  { title: 'Scarborough Fair', difficulty: 2 },

  // Modern Pop Hits (high recognition → high retention)
  { title: 'Shape of You (simplified)', artist: 'Ed Sheeran', difficulty: 2 },
  { title: 'Thinking Out Loud (simplified)', artist: 'Ed Sheeran', difficulty: 2 },
  { title: 'Shallow (simplified)', artist: 'Lady Gaga & Bradley Cooper', difficulty: 3 },
  { title: 'Dance Monkey (simplified)', artist: 'Tones and I', difficulty: 2 },
  { title: 'Blinding Lights (simplified)', artist: 'The Weeknd', difficulty: 3 },
  { title: 'Drivers License (simplified)', artist: 'Olivia Rodrigo', difficulty: 2 },
  { title: 'Flowers (simplified)', artist: 'Miley Cyrus', difficulty: 2 },
  { title: 'As It Was (simplified)', artist: 'Harry Styles', difficulty: 2 },
  { title: 'Heat Waves (simplified)', artist: 'Glass Animals', difficulty: 2 },
  { title: 'Levitating (simplified)', artist: 'Dua Lipa', difficulty: 3 },
  { title: 'Watermelon Sugar (simplified)', artist: 'Harry Styles', difficulty: 2 },
  { title: 'Say So (simplified)', artist: 'Doja Cat', difficulty: 2 },
  { title: 'Sunflower (simplified)', artist: 'Post Malone', difficulty: 2 },
  { title: 'lovely (simplified)', artist: 'Billie Eilish & Khalid', difficulty: 2 },
  { title: 'Ocean Eyes (simplified)', artist: 'Billie Eilish', difficulty: 2 },

  // Pop Classics / Evergreen Hits
  { title: 'Piano Man (simplified)', artist: 'Billy Joel', difficulty: 3 },
  { title: 'Tiny Dancer (simplified)', artist: 'Elton John', difficulty: 3 },
  { title: 'Your Song (simplified)', artist: 'Elton John', difficulty: 2 },
  { title: 'Crocodile Rock (simplified)', artist: 'Elton John', difficulty: 3 },
  { title: 'Hey Jude (simplified)', artist: 'The Beatles', difficulty: 2 },
  { title: 'Here Comes the Sun (simplified)', artist: 'The Beatles', difficulty: 2 },
  { title: 'Bohemian Rhapsody (simplified)', artist: 'Queen', difficulty: 4 },
  { title: 'Viva la Vida (simplified)', artist: 'Coldplay', difficulty: 3 },
  { title: 'Fix You (simplified)', artist: 'Coldplay', difficulty: 2 },
  { title: 'Rolling in the Deep (simplified)', artist: 'Adele', difficulty: 3 },
  { title: 'Rocket Man (simplified)', artist: 'Elton John', difficulty: 3 },
  { title: 'Dancing Queen (simplified)', artist: 'ABBA', difficulty: 3 },
  { title: 'Mamma Mia (simplified)', artist: 'ABBA', difficulty: 2 },

  // Current / TikTok Era
  { title: 'Die For You (simplified)', artist: 'The Weeknd', difficulty: 2 },
  { title: 'Anti-Hero (simplified)', artist: 'Taylor Swift', difficulty: 2 },
  { title: 'Cruel Summer (simplified)', artist: 'Taylor Swift', difficulty: 3 },
  { title: 'Love Story (simplified)', artist: 'Taylor Swift', difficulty: 2 },
  { title: 'Shake It Off (simplified)', artist: 'Taylor Swift', difficulty: 2 },
  { title: 'Espresso (simplified)', artist: 'Sabrina Carpenter', difficulty: 2 },
  { title: 'Starboy (simplified)', artist: 'The Weeknd', difficulty: 3 },
  { title: 'Believer (simplified)', artist: 'Imagine Dragons', difficulty: 3 },
  { title: 'Radioactive (simplified)', artist: 'Imagine Dragons', difficulty: 3 },
  { title: 'Thunder (simplified)', artist: 'Imagine Dragons', difficulty: 2 },

  // Film (difficulty 2-4)
  { title: 'Hedwig\'s Theme (simplified)', artist: 'John Williams', difficulty: 3 },
  { title: 'The Imperial March (simplified)', artist: 'John Williams', difficulty: 3 },
  { title: 'My Heart Will Go On (simplified)', artist: 'James Horner', difficulty: 3 },
  { title: 'Somewhere Over the Rainbow', difficulty: 2 },
  { title: 'Moon River', artist: 'Henry Mancini', difficulty: 2 },
  { title: 'The Pink Panther Theme', artist: 'Henry Mancini', difficulty: 3 },
  { title: 'Concerning Hobbits (simplified)', artist: 'Howard Shore', difficulty: 2 },
  { title: 'Mia & Sebastian\'s Theme (simplified)', artist: 'Justin Hurwitz', difficulty: 3 },
  { title: 'City of Stars (simplified)', artist: 'Justin Hurwitz', difficulty: 3 },
  { title: 'Raiders March (simplified)', artist: 'John Williams', difficulty: 3 },

  // Game (difficulty 2-4)
  { title: 'Tetris Theme (Korobeiniki)', difficulty: 2 },
  { title: 'Super Mario Bros Theme (simplified)', artist: 'Koji Kondo', difficulty: 3 },
  { title: 'Zelda Main Theme (simplified)', artist: 'Koji Kondo', difficulty: 3 },
  { title: 'Minecraft - Sweden (simplified)', artist: 'C418', difficulty: 2 },
  { title: 'Undertale - Megalovania (simplified)', artist: 'Toby Fox', difficulty: 4 },
  { title: 'Pokemon Center Theme (simplified)', difficulty: 3 },
  { title: 'Animal Crossing Main Theme (simplified)', difficulty: 2 },
  { title: 'Wii Sports Theme (simplified)', difficulty: 2 },
  { title: 'Final Fantasy Prelude (simplified)', artist: 'Nobuo Uematsu', difficulty: 3 },
  { title: 'Chrono Trigger Main Theme (simplified)', artist: 'Yasunori Mitsuda', difficulty: 3 },

  // Holiday (difficulty 1-3)
  { title: 'Jingle Bells', difficulty: 1 },
  { title: 'Silent Night', difficulty: 1 },
  { title: 'We Wish You a Merry Christmas', difficulty: 1 },
  { title: 'Deck the Halls', difficulty: 2 },
  { title: 'O Christmas Tree', difficulty: 2 },
  { title: 'Joy to the World', difficulty: 2 },
  { title: 'Frosty the Snowman', difficulty: 2 },
  { title: 'Rudolph the Red-Nosed Reindeer', difficulty: 2 },
  { title: 'Winter Wonderland', difficulty: 3 },
  { title: 'Let It Snow', difficulty: 3 },

  // === Expansion batch (75 more songs) ===

  // Classical - additional (difficulty 2-5)
  { title: 'Für Elise (full)', artist: 'Beethoven', difficulty: 4 },
  { title: 'Rondo Alla Turca', artist: 'Mozart', difficulty: 4 },
  { title: 'Arabesque No. 1 (simplified)', artist: 'Debussy', difficulty: 4 },
  { title: 'Nocturne Op. 9 No. 2 (simplified)', artist: 'Chopin', difficulty: 4 },
  { title: 'Waltz in A minor', artist: 'Chopin', difficulty: 3 },
  { title: 'Sonata Facile K.545 (1st mvt simplified)', artist: 'Mozart', difficulty: 3 },
  { title: 'Invention No. 1 in C', artist: 'J.S. Bach', difficulty: 4 },
  { title: 'Invention No. 8 in F', artist: 'J.S. Bach', difficulty: 4 },
  { title: 'Prelude in C Minor Op. 28 No. 20', artist: 'Chopin', difficulty: 3 },
  { title: 'Rêverie (simplified)', artist: 'Debussy', difficulty: 3 },
  { title: 'Maple Leaf Rag (simplified)', artist: 'Scott Joplin', difficulty: 4 },
  { title: 'Solace (simplified)', artist: 'Scott Joplin', difficulty: 3 },
  { title: 'Solfeggietto', artist: 'C.P.E. Bach', difficulty: 4 },
  { title: 'Comptine d\'un autre été (simplified)', artist: 'Yann Tiersen', difficulty: 3 },
  { title: 'River Flows in You (simplified)', artist: 'Yiruma', difficulty: 3 },

  // Pop / Contemporary — more hits (difficulty 1-3)
  { title: 'Can You Feel the Love Tonight (simplified)', artist: 'Elton John', difficulty: 2 },
  { title: 'Lean on Me (simplified)', artist: 'Bill Withers', difficulty: 2 },
  { title: 'Yesterday (simplified)', artist: 'The Beatles', difficulty: 2 },
  { title: 'Let It Be (simplified)', artist: 'The Beatles', difficulty: 2 },
  { title: 'Imagine (simplified)', artist: 'John Lennon', difficulty: 2 },
  { title: 'Hallelujah (simplified)', artist: 'Leonard Cohen', difficulty: 2 },
  { title: 'A Thousand Years (simplified)', artist: 'Christina Perri', difficulty: 3 },
  { title: 'All of Me (simplified)', artist: 'John Legend', difficulty: 3 },
  { title: 'Someone Like You (simplified)', artist: 'Adele', difficulty: 3 },
  { title: 'Perfect (simplified)', artist: 'Ed Sheeran', difficulty: 2 },
  { title: 'Clocks (simplified)', artist: 'Coldplay', difficulty: 3 },
  { title: 'The Scientist (simplified)', artist: 'Coldplay', difficulty: 2 },
  { title: 'Stay With Me (simplified)', artist: 'Sam Smith', difficulty: 2 },
  { title: 'Don\'t Stop Believin\' (simplified)', artist: 'Journey', difficulty: 2 },
  { title: 'Sweet Caroline (simplified)', artist: 'Neil Diamond', difficulty: 2 },
  { title: 'Stand By Me (simplified)', artist: 'Ben E. King', difficulty: 2 },
  { title: 'What a Wonderful World (simplified)', artist: 'Louis Armstrong', difficulty: 2 },
  { title: 'I Will Always Love You (simplified)', artist: 'Whitney Houston', difficulty: 3 },
  { title: 'Unchained Melody (simplified)', artist: 'Righteous Brothers', difficulty: 2 },
  { title: 'Bridge Over Troubled Water (simplified)', artist: 'Simon & Garfunkel', difficulty: 3 },
  { title: 'Landslide (simplified)', artist: 'Fleetwood Mac', difficulty: 2 },
  { title: 'Dreams (simplified)', artist: 'Fleetwood Mac', difficulty: 2 },
  { title: 'Mr. Brightside (simplified)', artist: 'The Killers', difficulty: 3 },
  { title: 'Wonderwall (simplified)', artist: 'Oasis', difficulty: 2 },
  { title: 'Budapest (simplified)', artist: 'George Ezra', difficulty: 2 },
  { title: 'Photograph (simplified)', artist: 'Ed Sheeran', difficulty: 2 },
  { title: 'Just the Way You Are (simplified)', artist: 'Bruno Mars', difficulty: 2 },
  { title: 'Count on Me (simplified)', artist: 'Bruno Mars', difficulty: 2 },
  { title: 'Uptown Girl (simplified)', artist: 'Billy Joel', difficulty: 3 },
  { title: 'She Will Be Loved (simplified)', artist: 'Maroon 5', difficulty: 2 },

  // Film / TV - additional (difficulty 2-4)
  { title: 'Schindler\'s List Theme (simplified)', artist: 'John Williams', difficulty: 3 },
  { title: 'Jurassic Park Theme (simplified)', artist: 'John Williams', difficulty: 3 },
  { title: 'The Godfather Waltz (simplified)', artist: 'Nino Rota', difficulty: 3 },
  { title: 'Forrest Gump Theme (simplified)', artist: 'Alan Silvestri', difficulty: 2 },
  { title: 'Game of Thrones Theme (simplified)', artist: 'Ramin Djawadi', difficulty: 3 },
  { title: 'Interstellar First Step (simplified)', artist: 'Hans Zimmer', difficulty: 3 },
  { title: 'Up - Married Life (simplified)', artist: 'Michael Giacchino', difficulty: 3 },
  { title: 'Spirited Away - One Summer\'s Day (simplified)', artist: 'Joe Hisaishi', difficulty: 3 },
  { title: 'Howl\'s Moving Castle Theme (simplified)', artist: 'Joe Hisaishi', difficulty: 3 },
  { title: 'Cinema Paradiso Theme (simplified)', artist: 'Ennio Morricone', difficulty: 3 },
  { title: 'Amelie Waltz (simplified)', artist: 'Yann Tiersen', difficulty: 3 },
  { title: 'Pirates of the Caribbean (simplified)', artist: 'Klaus Badelt', difficulty: 3 },
  { title: 'The Mandalorian Theme (simplified)', artist: 'Ludwig Göransson', difficulty: 3 },
  { title: 'Succession Theme (simplified)', artist: 'Nicholas Britell', difficulty: 4 },
  { title: 'Downton Abbey Theme (simplified)', artist: 'John Lunn', difficulty: 2 },

  // Game - additional (difficulty 2-4)
  { title: 'Stardew Valley - Spring (simplified)', artist: 'ConcernedApe', difficulty: 2 },
  { title: 'Hollow Knight - City of Tears (simplified)', artist: 'Christopher Larkin', difficulty: 3 },
  { title: 'Ori and the Blind Forest Theme (simplified)', artist: 'Gareth Coker', difficulty: 3 },
  { title: 'Halo Theme (simplified)', artist: 'Martin O\'Donnell', difficulty: 3 },
  { title: 'Kingdom Hearts - Dearly Beloved', artist: 'Yoko Shimomura', difficulty: 2 },
  { title: 'Skyrim - Dragonborn (simplified)', artist: 'Jeremy Soule', difficulty: 3 },
  { title: 'Celeste - First Steps (simplified)', artist: 'Lena Raine', difficulty: 3 },
  { title: 'Persona 5 - Beneath the Mask (simplified)', artist: 'Shoji Meguro', difficulty: 3 },
  { title: 'Kirby - Green Greens', difficulty: 2 },
  { title: 'Donkey Kong Country - Aquatic Ambiance (simplified)', artist: 'David Wise', difficulty: 3 },

  // Jazz Standards (difficulty 3-4)
  { title: 'Autumn Leaves (simplified)', difficulty: 3 },
  { title: 'Fly Me to the Moon (simplified)', difficulty: 3 },
  { title: 'Blue Moon (simplified)', difficulty: 2 },
  { title: 'Take Five (simplified)', artist: 'Dave Brubeck', difficulty: 4 },
  { title: 'Misty (simplified)', artist: 'Erroll Garner', difficulty: 3 },

  // Kids / Nursery (difficulty 1)
  { title: 'Old MacDonald Had a Farm', difficulty: 1 },
  { title: 'Baa Baa Black Sheep', difficulty: 1 },
  { title: 'Hot Cross Buns', difficulty: 1 },
  { title: 'Three Blind Mice', difficulty: 1 },
  { title: 'Frère Jacques', difficulty: 1 },
  { title: 'Yankee Doodle', difficulty: 1 },
  { title: 'Pop Goes the Weasel', difficulty: 1 },
  { title: 'This Old Man', difficulty: 1 },
  { title: 'If You\'re Happy and You Know It', difficulty: 1 },
  { title: 'Itsy Bitsy Spider', difficulty: 1 },

  // Blues (difficulty 2-4)
  { title: 'St. Louis Blues (simplified)', artist: 'W.C. Handy', difficulty: 3 },
  { title: 'Stormy Monday (simplified)', artist: 'T-Bone Walker', difficulty: 3 },
  { title: '12-Bar Blues in C', difficulty: 2 },
  { title: 'Sweet Home Chicago (simplified)', artist: 'Robert Johnson', difficulty: 3 },
  { title: 'Ain\'t No Sunshine (simplified)', artist: 'Bill Withers', difficulty: 2 },
  { title: 'The Thrill Is Gone (simplified)', artist: 'B.B. King', difficulty: 3 },
  { title: 'Georgia On My Mind (simplified)', artist: 'Ray Charles', difficulty: 3 },
  { title: 'Feeling Good (simplified)', artist: 'Nina Simone', difficulty: 3 },
  { title: 'Hit the Road Jack (simplified)', artist: 'Ray Charles', difficulty: 2 },
  { title: 'I Got You (I Feel Good) (simplified)', artist: 'James Brown', difficulty: 3 },

  // Hymn / Spiritual (difficulty 1-3)
  { title: 'Amazing Grace (hymn)', difficulty: 1 },
  { title: 'How Great Thou Art', difficulty: 2 },
  { title: 'Be Thou My Vision', difficulty: 2 },
  { title: 'It Is Well with My Soul', difficulty: 2 },
  { title: 'Great Is Thy Faithfulness', difficulty: 3 },
  { title: 'Holy Holy Holy', difficulty: 2 },
  { title: 'A Mighty Fortress Is Our God', difficulty: 2 },
  { title: 'Abide with Me', difficulty: 2 },
  { title: 'Ave Maria (simplified)', artist: 'Schubert', difficulty: 3 },
  { title: 'Jesu Joy of Man\'s Desiring (simplified)', artist: 'J.S. Bach', difficulty: 3 },

  // More Jazz (difficulty 2-4)
  { title: 'Summertime (simplified)', artist: 'George Gershwin', difficulty: 3 },
  { title: 'All of Me (jazz standard, simplified)', difficulty: 3 },
  { title: 'Georgia on My Mind (jazz, simplified)', artist: 'Hoagy Carmichael', difficulty: 3 },
  { title: 'My Funny Valentine (simplified)', difficulty: 3 },
  { title: 'The Girl from Ipanema (simplified)', artist: 'Tom Jobim', difficulty: 3 },
  { title: 'So What (simplified)', artist: 'Miles Davis', difficulty: 3 },
  { title: 'Round Midnight (simplified)', artist: 'Thelonious Monk', difficulty: 4 },
  { title: 'Body and Soul (simplified)', difficulty: 3 },
  { title: 'Moon River (jazz arrangement)', artist: 'Henry Mancini', difficulty: 2 },
  { title: 'In a Sentimental Mood (simplified)', artist: 'Duke Ellington', difficulty: 3 },

  // More Pop / Modern (difficulty 1-3)
  { title: 'Happier Than Ever (simplified)', artist: 'Billie Eilish', difficulty: 2 },
  { title: 'drivers license (simplified)', artist: 'Olivia Rodrigo', difficulty: 2 },
  { title: 'Good 4 U (simplified)', artist: 'Olivia Rodrigo', difficulty: 3 },
  { title: 'Peaches (simplified)', artist: 'Justin Bieber', difficulty: 2 },
  { title: 'Butter (simplified)', artist: 'BTS', difficulty: 2 },
  { title: 'Dynamite (simplified)', artist: 'BTS', difficulty: 2 },
  { title: 'Save Your Tears (simplified)', artist: 'The Weeknd', difficulty: 2 },
  { title: 'Memories (simplified)', artist: 'Maroon 5', difficulty: 2 },
  { title: 'Señorita (simplified)', artist: 'Shawn Mendes & Camila Cabello', difficulty: 2 },
  { title: 'Havana (simplified)', artist: 'Camila Cabello', difficulty: 2 },
  { title: 'Golden Hour (simplified)', artist: 'JVKE', difficulty: 2 },
  { title: 'Glimpse of Us (simplified)', artist: 'Joji', difficulty: 2 },
  { title: 'Until I Found You (simplified)', artist: 'Stephen Sanchez', difficulty: 2 },
  { title: 'Die With a Smile (simplified)', artist: 'Lady Gaga & Bruno Mars', difficulty: 2 },
  { title: 'APT. (simplified)', artist: 'ROSÉ & Bruno Mars', difficulty: 2 },
];

// ---------------------------------------------------------------------------
// Gemini generation (standalone — no Firebase)
// ---------------------------------------------------------------------------

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

  // First attempt
  let song = await attemptGeneration(model, prompt);
  if (!song) {
    // Retry with guidance
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

  if (!validateGeneratedSong(parsed)) {
    return null;
  }

  return assembleSong(parsed, 'gemini');
}

// ---------------------------------------------------------------------------
// Resume support
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const DELAY_BETWEEN_SONGS_MS = 2000;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const startIdx = args.indexOf('--start');
  const countIdx = args.indexOf('--count');
  const outputIdx = args.indexOf('--output');
  const start = startIdx >= 0 ? parseInt(args[startIdx + 1], 10) : 0;
  const count = countIdx >= 0 ? parseInt(args[countIdx + 1], 10) : SONG_LIST.length;
  const outputFile = outputIdx >= 0 ? args[outputIdx + 1] : '/tmp/gemini-songs.json';

  const songs = SONG_LIST.slice(start, start + count);

  console.log(`Song Generation Script`);
  console.log(`======================`);
  console.log(`Total songs in list: ${SONG_LIST.length}`);
  console.log(`Processing range: ${start} to ${start + songs.length - 1}`);
  console.log(`Output: ${outputFile}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('');

  if (dryRun) {
    console.log('Dry run — listing songs that would be generated:\n');
    for (let i = 0; i < songs.length; i++) {
      const s = songs[i];
      console.log(
        `  ${start + i + 1}. ${s.title}${s.artist ? ` — ${s.artist}` : ''} (difficulty ${s.difficulty})`,
      );
    }
    console.log(`\nTotal: ${songs.length} songs`);
    return;
  }

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Error: EXPO_PUBLIC_GEMINI_API_KEY is not set.');
    console.error('Run: source .env.local && npx tsx scripts/generate-songs.ts');
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

  // Load existing songs for resume support
  const existingSongs = loadExistingSongs(outputFile);
  if (existingSongs.length > 0) {
    console.log(`Resuming — ${existingSongs.length} songs already in ${outputFile}\n`);
  }

  const allSongs = [...existingSongs];
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < songs.length; i++) {
    const params = songs[i];
    const idx = start + i + 1;

    if (songAlreadyGenerated(allSongs, params.title)) {
      console.log(`[${idx}/${start + songs.length}] Skipping (already done): ${params.title}`);
      skippedCount++;
      continue;
    }

    console.log(`[${idx}/${start + songs.length}] Generating: ${params.title}...`);

    try {
      const song = await generateSong(model, params);
      if (song) {
        console.log(`  ✓ ${song.id} — ${song.sections.length} sections, ${song.metadata.durationSeconds}s`);
        allSongs.push(song);
        successCount++;
        // Save after each success for resume support
        writeFileSync(outputFile, JSON.stringify(allSongs, null, 2));
      } else {
        console.log(`  ✗ Generation returned null (validation or ABC parse failed)`);
        failCount++;
      }
    } catch (err) {
      console.error(`  ✗ Error: ${err instanceof Error ? err.message : String(err)}`);
      failCount++;
    }

    if (i < songs.length - 1) {
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

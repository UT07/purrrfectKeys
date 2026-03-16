"use strict";
/**
 * Cloud Function: Weekly New Songs
 *
 * Scheduled function that runs every Monday at 09:00 UTC.
 * Generates 10 new songs using Gemini 2.0 Flash and saves them to Firestore.
 * Checks existing song titles to avoid duplicates.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.weeklyNewSongs = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
// ============================================================================
// Song Pool — diverse genres and difficulties for weekly rotation
// ============================================================================
const WEEKLY_SONG_POOL = [
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
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}
function difficultyGuide(d) {
    switch (d) {
        case 1: return 'whole/half notes only, C major, very slow';
        case 2: return 'quarter notes, C/G major, simple rhythms';
        case 3: return 'eighth notes OK, any major key, moderate tempo';
        case 4: return 'sixteenth notes, minor keys OK, faster tempo';
        case 5: return 'complex rhythms, any key, performance tempo';
        default: return 'moderate difficulty';
    }
}
function buildPrompt(spec) {
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
function validateSong(raw) {
    if (raw === null || raw === undefined || typeof raw !== 'object')
        return false;
    const obj = raw;
    if (typeof obj.title !== 'string' || obj.title.length === 0)
        return false;
    if (typeof obj.artist !== 'string')
        return false;
    if (typeof obj.genre !== 'string')
        return false;
    if (typeof obj.difficulty !== 'number' || obj.difficulty < 1 || obj.difficulty > 5)
        return false;
    if (typeof obj.attribution !== 'string')
        return false;
    if (typeof obj.tempo !== 'number' || obj.tempo < 30 || obj.tempo > 240)
        return false;
    if (typeof obj.key !== 'string')
        return false;
    if (!Array.isArray(obj.sections) || obj.sections.length === 0)
        return false;
    for (const section of obj.sections) {
        if (typeof section !== 'object' || section === null || section === undefined)
            return false;
        const s = section;
        if (typeof s.label !== 'string' || s.label.length === 0)
            return false;
        if (typeof s.melodyABC !== 'string' || s.melodyABC.length === 0)
            return false;
    }
    return true;
}
// ============================================================================
// Main Scheduled Function
// ============================================================================
exports.weeklyNewSongs = (0, scheduler_1.onSchedule)({
    schedule: 'every friday 09:00',
    timeZone: 'UTC',
    region: 'us-central1',
    secrets: ['GEMINI_API_KEY'],
    timeoutSeconds: 540, // 9 minutes (max for scheduled functions)
    memory: '512MiB',
}, async () => {
    const db = admin.firestore();
    const SONGS_PER_WEEK = 10;
    firebase_functions_1.logger.info('Weekly song generation started');
    // Step 1: Get all existing song titles to avoid duplicates
    const existingSnap = await db.collection('songs')
        .select('metadata.title', 'metadata.artist')
        .get();
    const existingTitles = new Set();
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
    firebase_functions_1.logger.info(`Existing songs: ${existingSnap.size}, unique title keys: ${existingTitles.size}`);
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
        firebase_functions_1.logger.info('No new songs to generate — pool exhausted. Consider adding more songs to WEEKLY_SONG_POOL.');
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
    firebase_functions_1.logger.info(`Generating ${toGenerate.length} new songs (${candidates.length} candidates remaining)`);
    // Step 4: Generate with Gemini
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
        firebase_functions_1.logger.error('GEMINI_API_KEY not set — aborting');
        return;
    }
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
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
            const text = result.response.text();
            const parsed = JSON.parse(text);
            if (!validateSong(parsed)) {
                // Retry once
                const retryPrompt = prompt +
                    '\n\nPrevious attempt failed validation. Ensure all sections have valid ABC notation with X:, T:, M:, L:, K: headers.';
                const retryResult = await model.generateContent(retryPrompt);
                const retryText = retryResult.response.text();
                const retryParsed = JSON.parse(retryText);
                if (!validateSong(retryParsed)) {
                    firebase_functions_1.logger.warn(`Failed to generate valid song: ${spec.title}`);
                    failed++;
                    continue;
                }
                await saveSong(db, retryParsed, existingTitles);
                generated++;
                continue;
            }
            await saveSong(db, parsed, existingTitles);
            generated++;
        }
        catch (err) {
            firebase_functions_1.logger.error(`Error generating "${spec.title}": ${err}`);
            failed++;
        }
    }
    firebase_functions_1.logger.info(`Weekly song generation complete: ${generated} generated, ${failed} failed, ${existingSnap.size + generated} total in Firestore`);
});
// ============================================================================
// Helpers
// ============================================================================
async function saveSong(db, raw, existingTitles) {
    const slug = slugify(raw.title);
    const id = `weekly-${slug}-${Date.now().toString(36)}`;
    // Final duplicate check (race condition guard)
    if (existingTitles.has(raw.title.toLowerCase())) {
        firebase_functions_1.logger.warn(`Skipping duplicate: ${raw.title}`);
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
        sections: raw.sections,
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
    firebase_functions_1.logger.info(`Saved: ${raw.title} (${id})`);
}
function normalizeGenre(genre) {
    const g = genre.toLowerCase();
    if (g.includes('classic'))
        return 'classical';
    if (g.includes('folk'))
        return 'folk';
    if (g.includes('film') || g.includes('movie') || g.includes('soundtrack'))
        return 'film';
    if (g.includes('game') || g.includes('video'))
        return 'game';
    if (g.includes('holiday') || g.includes('christmas'))
        return 'holiday';
    if (g.includes('jazz'))
        return 'jazz';
    if (g.includes('blues'))
        return 'blues';
    if (g.includes('kids') || g.includes('nursery') || g.includes('children'))
        return 'kids';
    if (g.includes('hymn') || g.includes('gospel') || g.includes('spiritual'))
        return 'hymn';
    if (g.includes('anime'))
        return 'anime';
    if (g.includes('kpop') || g.includes('k-pop'))
        return 'kpop';
    return 'pop';
}
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}
//# sourceMappingURL=weeklyNewSongs.js.map
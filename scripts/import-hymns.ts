/**
 * Public Domain Hymn Importer
 *
 * Converts well-known public domain hymns to Song objects using ABC notation.
 * All hymns are pre-18th/19th century compositions in the public domain.
 *
 * Usage: npx tsx scripts/import-hymns.ts [--output /tmp/hymns.json]
 */

import { parseABC } from '../src/core/songs/abcParser';
import type { Song, SongSection } from '../src/core/songs/songTypes';
import { writeFileSync } from 'fs';

// ---------------------------------------------------------------------------
// Hymn catalog — all public domain, ABC notation included
// ---------------------------------------------------------------------------

interface HymnEntry {
  id: string;
  title: string;
  composer: string;
  year: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  abc: string;
}

const HYMN_CATALOG: HymnEntry[] = [
  {
    id: 'hymn-amazing-grace',
    title: 'Amazing Grace',
    composer: 'John Newton',
    year: '1779',
    difficulty: 2,
    abc: `X:1
T:Amazing Grace
M:3/4
L:1/4
Q:1/4=90
K:G
D|G2 B|A2 G|E2 D|G2 B|A2 d|B2 G|B2 A|G2 D|
G2 B|A2 G|E2 D|G2 B|A2 d|B2||`,
  },
  {
    id: 'hymn-abide-with-me',
    title: 'Abide With Me',
    composer: 'William H. Monk',
    year: '1861',
    difficulty: 2,
    abc: `X:1
T:Abide With Me
M:4/4
L:1/4
Q:1/4=80
K:Eb
E|E D E F|G2 G A|B2 A G|F2 E E|
E D E F|G2 G A|B2 c B|A2 G||`,
  },
  {
    id: 'hymn-be-thou-my-vision',
    title: 'Be Thou My Vision',
    composer: 'Irish Traditional',
    year: '8th century',
    difficulty: 2,
    abc: `X:1
T:Be Thou My Vision
M:3/4
L:1/4
Q:1/4=100
K:Eb
E|E F G|B2 B|c2 B|G2 E|E F G|B2 B|c2 B|G2 E|
G B c|e2 c|B G E|G2 E|E F G|B2 B|c2 B|G2||`,
  },
  {
    id: 'hymn-come-thou-fount',
    title: 'Come Thou Fount',
    composer: 'John Wyeth',
    year: '1813',
    difficulty: 2,
    abc: `X:1
T:Come Thou Fount
M:3/4
L:1/4
Q:1/4=100
K:D
A|d2 d|c A F|A2 A|d2 d|e2 d|c A F|A2 A|d2||`,
  },
  {
    id: 'hymn-fairest-lord-jesus',
    title: 'Fairest Lord Jesus',
    composer: 'Silesian Folk Song',
    year: '1677',
    difficulty: 2,
    abc: `X:1
T:Fairest Lord Jesus
M:4/4
L:1/4
Q:1/4=90
K:F
C|F G A F|G2 A B|c2 A F|G2 F C|
F G A F|G2 A B|c2 A G|F3||`,
  },
  {
    id: 'hymn-holy-holy-holy',
    title: 'Holy Holy Holy',
    composer: 'John B. Dykes',
    year: '1861',
    difficulty: 2,
    abc: `X:1
T:Holy Holy Holy
M:4/4
L:1/4
Q:1/4=90
K:D
D|D F A F|D2 F A|B2 A F|E2 D D|
D F A F|D2 F A|B2 A F|E2 D||`,
  },
  {
    id: 'hymn-how-great-thou-art',
    title: 'How Great Thou Art',
    composer: 'Swedish Folk Melody',
    year: '1885',
    difficulty: 3,
    abc: `X:1
T:How Great Thou Art
M:4/4
L:1/4
Q:1/4=85
K:Bb
B|B c d c|B2 A F|G2 A B|c3 B|
B c d c|B2 A F|G2 F E|F3||`,
  },
  {
    id: 'hymn-it-is-well',
    title: 'It Is Well With My Soul',
    composer: 'Philip P. Bliss',
    year: '1876',
    difficulty: 2,
    abc: `X:1
T:It Is Well
M:4/4
L:1/4
Q:1/4=85
K:C
G|E2 C D|E2 F G|A2 G F|E2 C G|
E2 C D|E2 F G|A2 B c|c3||`,
  },
  {
    id: 'hymn-joyful-joyful',
    title: 'Joyful Joyful We Adore Thee',
    composer: 'Beethoven',
    year: '1824',
    difficulty: 2,
    abc: `X:1
T:Joyful Joyful (Ode to Joy)
M:4/4
L:1/4
Q:1/4=100
K:D
F F G A|A G F E|D D E F|F2 E2|
F F G A|A G F E|D D E F|E2 D2||`,
  },
  {
    id: 'hymn-nearer-my-god',
    title: 'Nearer My God to Thee',
    composer: 'Lowell Mason',
    year: '1856',
    difficulty: 2,
    abc: `X:1
T:Nearer My God to Thee
M:4/4
L:1/4
Q:1/4=85
K:G
D|G G A B|B A G E|D D G A|G2 F D|
G G A B|B A G E|D E G A|G3||`,
  },
  {
    id: 'hymn-old-rugged-cross',
    title: 'The Old Rugged Cross',
    composer: 'George Bennard',
    year: '1912',
    difficulty: 2,
    abc: `X:1
T:The Old Rugged Cross
M:3/4
L:1/4
Q:1/4=90
K:Bb
F|B2 B|d2 c|B2 A|G2 F|B2 B|d2 c|B3-|B2||`,
  },
  {
    id: 'hymn-rock-of-ages',
    title: 'Rock of Ages',
    composer: 'Thomas Hastings',
    year: '1830',
    difficulty: 2,
    abc: `X:1
T:Rock of Ages
M:3/4
L:1/4
Q:1/4=90
K:Bb
F|B2 c|d2 c|B2 A|G2 F|B2 c|d2 B|c3-|c2||`,
  },
  {
    id: 'hymn-what-a-friend',
    title: 'What a Friend We Have in Jesus',
    composer: 'Charles C. Converse',
    year: '1868',
    difficulty: 2,
    abc: `X:1
T:What a Friend
M:4/4
L:1/4
Q:1/4=85
K:F
C|F F G A|A G F E|F F G A|G3 C|
F F G A|A G F E|F G A G|F3||`,
  },
  {
    id: 'hymn-blessed-assurance',
    title: 'Blessed Assurance',
    composer: 'Phoebe P. Knapp',
    year: '1873',
    difficulty: 2,
    abc: `X:1
T:Blessed Assurance
M:3/4
L:1/4
Q:1/4=90
K:D
A|d2 A|F2 D|A2 d|c2 A|d2 A|F2 D|E3-|E2||`,
  },
  {
    id: 'hymn-great-is-thy-faithfulness',
    title: 'Great Is Thy Faithfulness',
    composer: 'William M. Runyan',
    year: '1923',
    difficulty: 3,
    abc: `X:1
T:Great Is Thy Faithfulness
M:3/4
L:1/4
Q:1/4=85
K:D
D|F A d|c B A|G F E|D2 D|F A d|c B A|B3-|B2||`,
  },
  {
    id: 'hymn-in-the-garden',
    title: 'In The Garden',
    composer: 'C. Austin Miles',
    year: '1912',
    difficulty: 2,
    abc: `X:1
T:In The Garden
M:3/4
L:1/4
Q:1/4=90
K:Ab
E|A2 c|B2 A|G2 E|A2 c|B2 A|G3-|G2||`,
  },
  {
    id: 'hymn-all-creatures',
    title: 'All Creatures of Our God and King',
    composer: 'Geistliche Kirchengesäng',
    year: '1623',
    difficulty: 2,
    abc: `X:1
T:All Creatures
M:3/4
L:1/4
Q:1/4=100
K:D
D|F F G|A2 A|B2 A|G F E|D2 D|F F G|A2 A|d3||`,
  },
  {
    id: 'hymn-doxology',
    title: 'Doxology (Praise God From Whom)',
    composer: 'Louis Bourgeois',
    year: '1551',
    difficulty: 1,
    abc: `X:1
T:Doxology
M:4/4
L:1/4
Q:1/4=90
K:G
G|G G A B|B A G F|E E F G|G2 F D|
G G A B|B A G F|E F G A|G3||`,
  },
  {
    id: 'hymn-were-you-there',
    title: 'Were You There',
    composer: 'African American Spiritual',
    year: 'Traditional',
    difficulty: 2,
    abc: `X:1
T:Were You There
M:4/4
L:1/4
Q:1/4=70
K:F
C|F2 F A|G2 E C|F2 A c|c3 A|
G2 F E|F2 A G|F3||`,
  },
  {
    id: 'hymn-swing-low',
    title: 'Swing Low Sweet Chariot',
    composer: 'African American Spiritual',
    year: 'Traditional',
    difficulty: 2,
    abc: `X:1
T:Swing Low
M:4/4
L:1/4
Q:1/4=80
K:F
C|F2 A c|c2 A F|G2 A G|F2 C C|
F2 A c|c2 A F|G2 A G|F3||`,
  },
  {
    id: 'hymn-deep-river',
    title: 'Deep River',
    composer: 'African American Spiritual',
    year: 'Traditional',
    difficulty: 3,
    abc: `X:1
T:Deep River
M:4/4
L:1/4
Q:1/4=60
K:Eb
B,|E2 G B|A2 G E|F2 E D|E3 B,|
E2 G B|A G F E|G2 F E|E3||`,
  },
  {
    id: 'hymn-go-tell-mountain',
    title: 'Go Tell It On The Mountain',
    composer: 'African American Spiritual',
    year: 'Traditional',
    difficulty: 2,
    abc: `X:1
T:Go Tell It
M:4/4
L:1/4
Q:1/4=100
K:F
C|F F A A|G2 F C|F F A A|G3 C|
F A c c|A2 F A|G F E F|F3||`,
  },
  {
    id: 'hymn-battle-hymn',
    title: 'Battle Hymn of the Republic',
    composer: 'William Steffe',
    year: '1856',
    difficulty: 2,
    abc: `X:1
T:Battle Hymn
M:4/4
L:1/4
Q:1/4=100
K:Bb
F|B B B d|c2 B A|G G A B|B2 A F|
B B B d|c2 B A|G G A B|B3||`,
  },
  {
    id: 'hymn-onward-christian',
    title: 'Onward Christian Soldiers',
    composer: 'Arthur Sullivan',
    year: '1871',
    difficulty: 2,
    abc: `X:1
T:Onward Christian Soldiers
M:4/4
L:1/4
Q:1/4=100
K:Eb
E|E F G G|A2 G F|E E F G|F3 E|
E F G G|A2 G F|E F G A|G3||`,
  },
  {
    id: 'hymn-leaning',
    title: 'Leaning on the Everlasting Arms',
    composer: 'Anthony J. Showalter',
    year: '1887',
    difficulty: 2,
    abc: `X:1
T:Leaning
M:4/4
L:1/4
Q:1/4=100
K:G
D|G G B B|A2 G E|D D G B|A3 D|
G G B B|A2 G E|D E G A|G3||`,
  },
  {
    id: 'hymn-savior-like-shepherd',
    title: 'Savior Like a Shepherd Lead Us',
    composer: 'William B. Bradbury',
    year: '1859',
    difficulty: 2,
    abc: `X:1
T:Savior Like a Shepherd
M:4/4
L:1/4
Q:1/4=85
K:Eb
E|G G A B|B2 A G|F F G A|G3 E|
G G A B|B2 A G|F G A B|G3||`,
  },
  {
    id: 'hymn-ave-maria-bach',
    title: 'Ave Maria (Bach/Gounod)',
    composer: 'Bach/Gounod',
    year: '1853',
    difficulty: 3,
    abc: `X:1
T:Ave Maria
M:4/4
L:1/8
Q:1/4=60
K:C
E2 G2 c2 e2|d2 B2 G2 E2|C2 E2 G2 c2|B2 G2 F2 D2|
E2 G2 c2 e2|d2 B2 G2 E2|F2 A2 c2 e2|d2 B2 G4||`,
  },
  {
    id: 'hymn-morning-has-broken',
    title: 'Morning Has Broken',
    composer: 'Gaelic Melody',
    year: 'Traditional',
    difficulty: 2,
    abc: `X:1
T:Morning Has Broken
M:3/4
L:1/4
Q:1/4=100
K:C
C|E G c|d2 c|B G E|C2 C|E G c|d2 c|B3-|B2||`,
  },
  {
    id: 'hymn-simple-gifts',
    title: 'Simple Gifts',
    composer: 'Elder Joseph Brackett',
    year: '1848',
    difficulty: 2,
    abc: `X:1
T:Simple Gifts
M:4/4
L:1/4
Q:1/4=100
K:F
C|F A A c|c A F E|F A c c|A2 F C|
F A A c|c A F E|D F A G|F3||`,
  },
  {
    id: 'hymn-wayfaring-stranger',
    title: 'Wayfaring Stranger',
    composer: 'American Folk Hymn',
    year: 'Traditional',
    difficulty: 2,
    abc: `X:1
T:Wayfaring Stranger
M:4/4
L:1/4
Q:1/4=75
K:Dm
A,|D D F A|A2 G F|E2 D C|D3 A,|
D D F A|A2 G F|E E F E|D3||`,
  },
  {
    id: 'hymn-steal-away',
    title: 'Steal Away',
    composer: 'African American Spiritual',
    year: 'Traditional',
    difficulty: 2,
    abc: `X:1
T:Steal Away
M:4/4
L:1/4
Q:1/4=70
K:F
C|F F A G|F2 C C|F F A c|A3 G|
F F A G|F2 C F|A G F E|F3||`,
  },
  {
    id: 'hymn-when-the-roll',
    title: 'When The Roll Is Called Up Yonder',
    composer: 'James M. Black',
    year: '1893',
    difficulty: 2,
    abc: `X:1
T:When The Roll Is Called
M:4/4
L:1/4
Q:1/4=100
K:Ab
E|A A B c|c2 B A|G G A B|A3 E|
A A B c|c2 B A|G A B A|A3||`,
  },
  {
    id: 'hymn-church-one-foundation',
    title: "The Church's One Foundation",
    composer: 'Samuel S. Wesley',
    year: '1864',
    difficulty: 2,
    abc: `X:1
T:The Church's One Foundation
M:4/4
L:1/4
Q:1/4=90
K:Eb
E|E G B G|A2 G F|E E G B|A3 G|
F F A G|F2 E D|E F G A|G3||`,
  },
  {
    id: 'hymn-god-of-grace',
    title: 'God of Grace and God of Glory',
    composer: 'John Hughes',
    year: '1907',
    difficulty: 2,
    abc: `X:1
T:God of Grace (CWM Rhondda)
M:4/4
L:1/4
Q:1/4=90
K:G
D|G G A B|B2 A G|G F E D|G3 D|
G G A B|B2 A G|E2 F G|G3||`,
  },
  {
    id: 'hymn-stand-up-for-jesus',
    title: 'Stand Up Stand Up for Jesus',
    composer: 'George J. Webb',
    year: '1837',
    difficulty: 2,
    abc: `X:1
T:Stand Up for Jesus
M:4/4
L:1/4
Q:1/4=100
K:Bb
F|B B c d|d2 c B|A A B c|B3 F|
B B c d|d2 c B|A B c A|B3||`,
  },
  {
    id: 'hymn-for-the-beauty',
    title: 'For The Beauty of The Earth',
    composer: 'Conrad Kocher',
    year: '1838',
    difficulty: 2,
    abc: `X:1
T:For The Beauty of The Earth
M:4/4
L:1/4
Q:1/4=90
K:F
F|A A G F|G2 A B|c2 A F|G3 F|
A A G F|G2 A B|c2 A G|F3||`,
  },
  {
    id: 'hymn-let-us-break-bread',
    title: 'Let Us Break Bread Together',
    composer: 'African American Spiritual',
    year: 'Traditional',
    difficulty: 2,
    abc: `X:1
T:Let Us Break Bread
M:4/4
L:1/4
Q:1/4=75
K:F
F|A2 c A|G2 F E|F2 A c|c3 A|
G2 F E|F2 A G|F3||`,
  },
  {
    id: 'hymn-praise-to-the-lord',
    title: 'Praise to the Lord the Almighty',
    composer: 'Stralsund Gesangbuch',
    year: '1665',
    difficulty: 2,
    abc: `X:1
T:Praise to the Lord
M:3/4
L:1/4
Q:1/4=100
K:G
G|B2 d|B2 G|A2 F|G2 D|G A B|c2 B|A3-|A2||`,
  },
  {
    id: 'hymn-my-country-tis',
    title: "My Country 'Tis of Thee (America)",
    composer: 'Traditional',
    year: '1831',
    difficulty: 1,
    abc: `X:1
T:America
M:3/4
L:1/4
Q:1/4=100
K:F
F|F G A|A G A|B2 B|c2 c|c B A|A G F|G A G|F2||`,
  },
  {
    id: 'hymn-when-i-survey',
    title: 'When I Survey the Wondrous Cross',
    composer: 'Lowell Mason (Hamburg)',
    year: '1824',
    difficulty: 2,
    abc: `X:1
T:When I Survey
M:4/4
L:1/4
Q:1/4=80
K:Bb
F|B B c d|d2 c B|A A G F|G3 F|
B B c d|d2 c B|A B c A|B3||`,
  },
  {
    id: 'hymn-crown-him',
    title: 'Crown Him With Many Crowns',
    composer: 'George J. Elvey',
    year: '1868',
    difficulty: 2,
    abc: `X:1
T:Crown Him With Many Crowns
M:4/4
L:1/4
Q:1/4=100
K:D
D|D F A d|c2 B A|B2 A G|F3 D|
D F A d|c2 B A|G A B A|D3||`,
  },
  {
    id: 'hymn-oh-happy-day',
    title: 'Oh Happy Day',
    composer: 'Edward F. Rimbault',
    year: '1855',
    difficulty: 2,
    abc: `X:1
T:Oh Happy Day
M:4/4
L:1/4
Q:1/4=100
K:F
C|F G A F|G2 A B|c2 A F|G3 C|
F G A F|G2 A B|c A G F|F3||`,
  },
  {
    id: 'hymn-down-by-the-riverside',
    title: 'Down By The Riverside',
    composer: 'African American Spiritual',
    year: 'Traditional',
    difficulty: 2,
    abc: `X:1
T:Down By The Riverside
M:4/4
L:1/4
Q:1/4=110
K:G
D|G G B B|A2 G G|B B d d|c2 B G|
A A B A|G2 E D|G G B A|G3||`,
  },
  {
    id: 'hymn-joshua-fit',
    title: 'Joshua Fit The Battle of Jericho',
    composer: 'African American Spiritual',
    year: 'Traditional',
    difficulty: 2,
    abc: `X:1
T:Joshua Fit The Battle
M:4/4
L:1/4
Q:1/4=110
K:Dm
A,|D D E F|A2 G F|E E F E|D3 A,|
D D F A|A2 G F|E F E D|D3||`,
  },
  {
    id: 'hymn-eternal-father',
    title: 'Eternal Father Strong To Save (Navy Hymn)',
    composer: 'John B. Dykes',
    year: '1861',
    difficulty: 2,
    abc: `X:1
T:Eternal Father
M:4/4
L:1/4
Q:1/4=85
K:C
C|E E F G|G2 F E|D D E F|E3 C|
E E F G|A2 G F|E F G E|C3||`,
  },
  {
    id: 'hymn-amazing-love',
    title: 'And Can It Be (Amazing Love)',
    composer: 'Thomas Campbell',
    year: '1825',
    difficulty: 3,
    abc: `X:1
T:And Can It Be
M:4/4
L:1/4
Q:1/4=90
K:G
D|G G A B|B2 A G|G F E D|G3 B|
d d c B|A2 G F|G A B A|G3||`,
  },
  {
    id: 'hymn-drink-to-me-only',
    title: 'Drink To Me Only With Thine Eyes',
    composer: 'Traditional English',
    year: '17th century',
    difficulty: 2,
    abc: `X:1
T:Drink To Me Only
M:3/4
L:1/4
Q:1/4=90
K:F
C|F2 G|A2 A|B2 A|G2 F|A2 B|c2 A|G3-|G2||`,
  },
  {
    id: 'hymn-were-marching',
    title: 'We Are Marching in the Light of God',
    composer: 'South African Traditional',
    year: 'Traditional',
    difficulty: 2,
    abc: `X:1
T:We Are Marching
M:4/4
L:1/4
Q:1/4=110
K:D
D|D F A A|B2 A F|D F A A|G2 F D|
E F G A|A2 G F|D F E D|D3||`,
  },
  {
    id: 'hymn-kumbaya',
    title: 'Kumbaya',
    composer: 'African American Spiritual',
    year: 'Traditional',
    difficulty: 1,
    abc: `X:1
T:Kumbaya
M:3/4
L:1/4
Q:1/4=80
K:D
A,|D2 F|A2 A|B2 A|F2 D|E2 F|A2 F|D3-|D2||`,
  },
];

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

function hymnToSong(hymn: HymnEntry): Song | null {
  const parsed = parseABC(hymn.abc);

  if ('error' in parsed) {
    console.warn(`  Skipping "${hymn.title}": ${parsed.error}`);
    return null;
  }

  if (parsed.notes.length < 4) {
    console.warn(`  Skipping "${hymn.title}": too few notes (${parsed.notes.length})`);
    return null;
  }

  const tempo = parsed.tempo || 90;
  const ts = parsed.timeSignature || [4, 4];

  // All notes in a single section for hymns (most are 1-2 verses)
  const lastNote = parsed.notes[parsed.notes.length - 1];
  const totalBeats = lastNote.startBeat + lastNote.durationBeats;
  const durationSeconds = Math.round((totalBeats / tempo) * 60);

  const sections: SongSection[] = [
    {
      id: 'section-0',
      label: 'Hymn',
      startBeat: 0,
      endBeat: totalBeats,
      difficulty: hymn.difficulty,
      layers: {
        melody: parsed.notes,
        full: parsed.notes,
      },
    },
  ];

  return {
    id: hymn.id,
    version: 1,
    type: 'song',
    source: 'pdmx', // Using pdmx as source type for non-Gemini, non-TheSession
    metadata: {
      title: hymn.title,
      artist: hymn.composer,
      genre: 'folk', // Hymns categorized under folk
      difficulty: hymn.difficulty,
      durationSeconds,
      attribution: `${hymn.composer} (${hymn.year}), public domain`,
    },
    sections,
    settings: {
      tempo,
      timeSignature: ts,
      keySignature: parsed.keySignature || 'C',
      countIn: 4,
      metronomeEnabled: true,
      loopEnabled: true,
    },
    scoring: {
      timingToleranceMs: 50,
      timingGracePeriodMs: 150,
      passingScore: 70,
      starThresholds: [70, 85, 95],
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const outputIdx = args.indexOf('--output');
  const outputFile = outputIdx >= 0 ? args[outputIdx + 1] : '/tmp/hymns.json';

  console.log(`Hymn Import Script`);
  console.log(`==================`);
  console.log(`Total hymns in catalog: ${HYMN_CATALOG.length}`);
  console.log(`Output: ${outputFile}`);

  const songs: Song[] = [];

  for (const hymn of HYMN_CATALOG) {
    console.log(`Converting: ${hymn.title}...`);
    const song = hymnToSong(hymn);
    if (song) {
      songs.push(song);
      console.log(`  OK: ${song.sections[0].layers.melody.length} notes, ${song.metadata.durationSeconds}s, key=${song.settings.keySignature}`);
    }
  }

  console.log(`\nConverted ${songs.length}/${HYMN_CATALOG.length} hymns successfully.`);

  writeFileSync(outputFile, JSON.stringify(songs, null, 2));
  console.log(`Written to ${outputFile}`);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});

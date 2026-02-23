/**
 * Fun Facts Content
 * Curated collection of music fun facts for the Purrrfect Keys piano learning app.
 * Facts are categorized and difficulty-tagged for targeted display.
 */

export type FunFactCategory =
  | 'history'
  | 'theory'
  | 'composer'
  | 'instrument'
  | 'science'
  | 'culture';

export type FunFactDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface FunFact {
  id: string;
  text: string;
  category: FunFactCategory;
  difficulty: FunFactDifficulty;
  source?: string;
}

/**
 * Category display configuration: label and color for UI chips.
 */
export const CATEGORY_COLORS: Record<FunFactCategory, { bg: string; text: string; label: string }> = {
  history: { bg: 'rgba(255, 152, 0, 0.15)', text: '#FFB74D', label: 'History' },
  theory: { bg: 'rgba(33, 150, 243, 0.15)', text: '#64B5F6', label: 'Theory' },
  composer: { bg: 'rgba(220, 20, 60, 0.15)', text: '#FF6B8A', label: 'Composer' },
  instrument: { bg: 'rgba(76, 175, 80, 0.15)', text: '#81C784', label: 'Instrument' },
  science: { bg: 'rgba(0, 188, 212, 0.15)', text: '#4DD0E1', label: 'Science' },
  culture: { bg: 'rgba(233, 30, 99, 0.15)', text: '#F48FB1', label: 'Culture' },
};

// =============================================================================
// Fun Facts Collection (60+ facts)
// =============================================================================

export const FUN_FACTS: FunFact[] = [
  // ===== HISTORY (12) =====
  {
    id: 'hist-01',
    text: 'The piano was invented by Bartolomeo Cristofori in Italy around the year 1700. He wanted an instrument that could play both soft and loud.',
    category: 'history',
    difficulty: 'beginner',
  },
  {
    id: 'hist-02',
    text: 'Beethoven was almost completely deaf when he composed his famous 9th Symphony, one of the greatest musical works ever written.',
    category: 'history',
    difficulty: 'beginner',
  },
  {
    id: 'hist-03',
    text: 'The first public piano recital was performed by Johann Christian Bach (J.S. Bach\'s youngest son) in London in 1768.',
    category: 'history',
    difficulty: 'intermediate',
  },
  {
    id: 'hist-04',
    text: 'Before the piano existed, composers wrote for the harpsichord, which could not change volume based on how hard you pressed the keys.',
    category: 'history',
    difficulty: 'beginner',
  },
  {
    id: 'hist-05',
    text: 'The word "piano" is short for "pianoforte," which means "soft-loud" in Italian, describing the instrument\'s ability to vary volume.',
    category: 'history',
    difficulty: 'beginner',
  },
  {
    id: 'hist-06',
    text: 'The first piano had only 54 keys. Modern pianos have 88 keys, a range that was standardized in the late 1800s.',
    category: 'history',
    difficulty: 'beginner',
  },
  {
    id: 'hist-07',
    text: 'During the 1800s, the piano became so popular that almost every middle-class European home had one. It was considered essential for a proper education.',
    category: 'history',
    difficulty: 'intermediate',
  },
  {
    id: 'hist-08',
    text: 'The oldest surviving piano was built by Cristofori in 1720 and is now in the Metropolitan Museum of Art in New York.',
    category: 'history',
    difficulty: 'intermediate',
  },
  {
    id: 'hist-09',
    text: 'Ragtime music, made famous by Scott Joplin in the early 1900s, helped make the piano the most popular instrument in America.',
    category: 'history',
    difficulty: 'intermediate',
  },
  {
    id: 'hist-10',
    text: 'The upright piano was invented in 1826 to save space in smaller homes, making piano ownership accessible to more people.',
    category: 'history',
    difficulty: 'beginner',
  },
  {
    id: 'hist-11',
    text: 'In the 1800s, piano duels were a popular form of entertainment where two pianists competed to see who could play more brilliantly.',
    category: 'history',
    difficulty: 'advanced',
  },
  {
    id: 'hist-12',
    text: 'The famous Steinway piano company, founded in 1853, has built pianos for the White House since 1903.',
    category: 'history',
    difficulty: 'intermediate',
  },

  // ===== THEORY (12) =====
  {
    id: 'theo-01',
    text: 'A piano has 88 keys: 52 white keys and 36 black keys. Together they cover over 7 full octaves of musical range.',
    category: 'theory',
    difficulty: 'beginner',
  },
  {
    id: 'theo-02',
    text: 'The distance between two notes is called an "interval." The smallest interval on a piano is a half step, which is from one key to the very next key.',
    category: 'theory',
    difficulty: 'beginner',
  },
  {
    id: 'theo-03',
    text: 'The C major scale uses only white keys, making it the easiest scale to learn on the piano.',
    category: 'theory',
    difficulty: 'beginner',
  },
  {
    id: 'theo-04',
    text: 'An octave spans 8 white keys and contains 12 notes total (counting both white and black keys). The notes then repeat at a higher pitch.',
    category: 'theory',
    difficulty: 'beginner',
  },
  {
    id: 'theo-05',
    text: 'The black keys on a piano are arranged in groups of 2 and 3, which helps you find any note without looking at labels.',
    category: 'theory',
    difficulty: 'beginner',
  },
  {
    id: 'theo-06',
    text: 'A chord is three or more notes played together. The most basic chord, C major, uses just three white keys: C, E, and G.',
    category: 'theory',
    difficulty: 'beginner',
  },
  {
    id: 'theo-07',
    text: 'Middle C is called C4 because it sits in the 4th octave of the piano. It is the note closest to the center of the keyboard.',
    category: 'theory',
    difficulty: 'beginner',
  },
  {
    id: 'theo-08',
    text: 'A sharp (#) raises a note by a half step, and a flat (b) lowers it by a half step. This means C# and Db are actually the same key on the piano!',
    category: 'theory',
    difficulty: 'intermediate',
  },
  {
    id: 'theo-09',
    text: 'There are 12 major scales and 12 minor scales, one starting on each of the 12 notes. Each has its own unique mood and character.',
    category: 'theory',
    difficulty: 'intermediate',
  },
  {
    id: 'theo-10',
    text: 'Time signatures tell you how many beats are in each measure. The most common is 4/4, which means 4 beats per measure.',
    category: 'theory',
    difficulty: 'intermediate',
  },
  {
    id: 'theo-11',
    text: 'The circle of fifths is a visual tool that shows how all 12 major and minor keys are related to each other.',
    category: 'theory',
    difficulty: 'advanced',
  },
  {
    id: 'theo-12',
    text: 'A perfect fifth interval (like C to G) sounds so pleasing because the frequencies of the two notes have a simple 3:2 ratio.',
    category: 'theory',
    difficulty: 'advanced',
  },

  // ===== COMPOSER (11) =====
  {
    id: 'comp-01',
    text: 'Mozart composed his first piece of music at the age of 5, and by age 8 he had written his first symphony.',
    category: 'composer',
    difficulty: 'beginner',
  },
  {
    id: 'comp-02',
    text: 'Chopin wrote almost exclusively for solo piano. His pieces are beloved for their beauty and are still among the most performed piano works.',
    category: 'composer',
    difficulty: 'beginner',
  },
  {
    id: 'comp-03',
    text: 'Franz Liszt was the first "rock star" pianist. Fans would fight over his broken piano strings and discarded cigar butts as souvenirs.',
    category: 'composer',
    difficulty: 'intermediate',
  },
  {
    id: 'comp-04',
    text: 'Johann Sebastian Bach had 20 children, and several of them became famous musicians and composers in their own right.',
    category: 'composer',
    difficulty: 'beginner',
  },
  {
    id: 'comp-05',
    text: 'Beethoven would pour cold water over his head before composing, believing it stimulated his brain and creativity.',
    category: 'composer',
    difficulty: 'intermediate',
  },
  {
    id: 'comp-06',
    text: 'Clara Schumann was one of the most accomplished pianists of the 1800s, performing across Europe while also composing and raising eight children.',
    category: 'composer',
    difficulty: 'intermediate',
  },
  {
    id: 'comp-07',
    text: 'Sergei Rachmaninoff had enormous hands that could span 12 white keys (almost two octaves). This influenced the wide stretches in his compositions.',
    category: 'composer',
    difficulty: 'intermediate',
  },
  {
    id: 'comp-08',
    text: 'Debussy broke traditional music rules by using whole-tone scales and unusual harmonies, creating a dreamy style called Impressionism.',
    category: 'composer',
    difficulty: 'advanced',
  },
  {
    id: 'comp-09',
    text: 'Tchaikovsky wrote the music for three of the most famous ballets: Swan Lake, The Nutcracker, and Sleeping Beauty.',
    category: 'composer',
    difficulty: 'beginner',
  },
  {
    id: 'comp-10',
    text: 'Elton John has sold over 300 million records and performed more than 4,000 concerts worldwide during his career.',
    category: 'composer',
    difficulty: 'beginner',
  },
  {
    id: 'comp-11',
    text: 'Billy Joel learned piano at age 4 and went on to become one of the best-selling music artists of all time with hits like "Piano Man."',
    category: 'composer',
    difficulty: 'beginner',
  },

  // ===== INSTRUMENT (11) =====
  {
    id: 'inst-01',
    text: 'A grand piano has about 230 strings inside, each under tremendous tension. The total tension of all strings can exceed 20 tons!',
    category: 'instrument',
    difficulty: 'beginner',
  },
  {
    id: 'inst-02',
    text: 'A concert grand piano can weigh over 990 pounds (450 kg) and is typically about 9 feet (2.7 meters) long.',
    category: 'instrument',
    difficulty: 'beginner',
  },
  {
    id: 'inst-03',
    text: 'The piano is both a string instrument and a percussion instrument. When you press a key, a felt-covered hammer strikes the strings inside.',
    category: 'instrument',
    difficulty: 'beginner',
  },
  {
    id: 'inst-04',
    text: 'Each piano key is connected to a complex mechanism of about 10,000 moving parts called the "action," which translates your finger press into sound.',
    category: 'instrument',
    difficulty: 'intermediate',
  },
  {
    id: 'inst-05',
    text: 'The sustain pedal (right pedal) lifts all the dampers off the strings at once, allowing notes to ring out and blend together.',
    category: 'instrument',
    difficulty: 'beginner',
  },
  {
    id: 'inst-06',
    text: 'Piano strings are made of high-carbon steel. The bass strings are wrapped in copper wire to add weight and produce lower pitches.',
    category: 'instrument',
    difficulty: 'intermediate',
  },
  {
    id: 'inst-07',
    text: 'A piano soundboard is typically made of spruce wood, chosen for its ability to vibrate freely and amplify sound naturally.',
    category: 'instrument',
    difficulty: 'intermediate',
  },
  {
    id: 'inst-08',
    text: 'The first electric piano was built in 1929. The Fender Rhodes, introduced in the 1960s, became iconic in jazz and pop music.',
    category: 'instrument',
    difficulty: 'intermediate',
  },
  {
    id: 'inst-09',
    text: 'A piano needs to be tuned at least once or twice a year. Professional concert pianos are tuned before every performance.',
    category: 'instrument',
    difficulty: 'beginner',
  },
  {
    id: 'inst-10',
    text: 'The most expensive piano ever sold was a Steinway called "The Pictures" decorated by artist Paul Wyse, which sold for $3.22 million.',
    category: 'instrument',
    difficulty: 'intermediate',
  },
  {
    id: 'inst-11',
    text: 'Digital pianos use recordings of real grand pianos, sampled note by note at different velocities, to produce realistic sound.',
    category: 'instrument',
    difficulty: 'beginner',
  },

  // ===== SCIENCE (11) =====
  {
    id: 'sci-01',
    text: 'Middle C vibrates at approximately 261.6 Hz, meaning the string moves back and forth about 262 times per second.',
    category: 'science',
    difficulty: 'beginner',
  },
  {
    id: 'sci-02',
    text: 'Playing piano activates more areas of the brain simultaneously than almost any other activity, strengthening connections between both hemispheres.',
    category: 'science',
    difficulty: 'beginner',
  },
  {
    id: 'sci-03',
    text: 'Studies show that learning piano improves memory, spatial reasoning, and language skills, even after just a few months of practice.',
    category: 'science',
    difficulty: 'beginner',
  },
  {
    id: 'sci-04',
    text: 'The A above Middle C (A4) vibrates at exactly 440 Hz. This frequency is the international standard for tuning all instruments.',
    category: 'science',
    difficulty: 'intermediate',
  },
  {
    id: 'sci-05',
    text: 'When you play a note on the piano, it does not produce just one frequency. It creates a rich mix of overtones called harmonics.',
    category: 'science',
    difficulty: 'intermediate',
  },
  {
    id: 'sci-06',
    text: 'Music triggers the release of dopamine in the brain, the same chemical associated with pleasure, food, and other rewards.',
    category: 'science',
    difficulty: 'beginner',
  },
  {
    id: 'sci-07',
    text: 'Professional pianists develop a thicker corpus callosum, the bridge connecting the two halves of the brain, improving coordination and processing speed.',
    category: 'science',
    difficulty: 'intermediate',
  },
  {
    id: 'sci-08',
    text: 'Sound travels through air at about 343 meters per second. That is why you hear a piano note almost instantly after pressing the key.',
    category: 'science',
    difficulty: 'beginner',
  },
  {
    id: 'sci-09',
    text: 'Each octave doubles the frequency. A4 is 440 Hz, A5 is 880 Hz, and A3 is 220 Hz. This doubling pattern is why octaves sound so similar.',
    category: 'science',
    difficulty: 'intermediate',
  },
  {
    id: 'sci-10',
    text: 'The human ear can detect pitch differences as small as 5 Hz, which is why even slightly out-of-tune pianos sound "off" to most people.',
    category: 'science',
    difficulty: 'intermediate',
  },
  {
    id: 'sci-11',
    text: 'A piano hammer strikes and bounces off the string in about 3 milliseconds. The shorter the contact time, the brighter the tone.',
    category: 'science',
    difficulty: 'advanced',
  },

  // ===== CULTURE (11) =====
  {
    id: 'cult-01',
    text: 'The piano is the most popular instrument in the world. An estimated 18 million Americans currently play the piano.',
    category: 'culture',
    difficulty: 'beginner',
  },
  {
    id: 'cult-02',
    text: '"Happy Birthday" is one of the most performed songs in the world, and its simple melody makes it one of the first songs many pianists learn.',
    category: 'culture',
    difficulty: 'beginner',
  },
  {
    id: 'cult-03',
    text: 'The longest piano marathon by a single person lasted over 103 hours (more than 4 days!) and was set in 2017.',
    category: 'culture',
    difficulty: 'beginner',
  },
  {
    id: 'cult-04',
    text: 'Japan has more pianos per capita than almost any other country. Piano education is deeply valued in Japanese culture.',
    category: 'culture',
    difficulty: 'intermediate',
  },
  {
    id: 'cult-05',
    text: 'The world\'s fastest pianist, Lubomyr Melnyk, can play over 19 notes per second using a technique he calls "continuous music."',
    category: 'culture',
    difficulty: 'intermediate',
  },
  {
    id: 'cult-06',
    text: 'Piano bar culture became popular in the 1940s and 1950s, combining live piano music with social dining and cocktails.',
    category: 'culture',
    difficulty: 'intermediate',
  },
  {
    id: 'cult-07',
    text: 'In many countries, street pianos painted by local artists are placed in public spaces for anyone to play, spreading joy to passersby.',
    category: 'culture',
    difficulty: 'beginner',
  },
  {
    id: 'cult-08',
    text: 'The lullaby "Twinkle Twinkle Little Star" uses a melody that Mozart also used in his famous "Twelve Variations" (K. 265).',
    category: 'culture',
    difficulty: 'beginner',
  },
  {
    id: 'cult-09',
    text: 'Piano competitions like the Van Cliburn and Chopin International attract the world\'s most talented young pianists every few years.',
    category: 'culture',
    difficulty: 'intermediate',
  },
  {
    id: 'cult-10',
    text: 'Playing piano together (piano duets) has been a social activity since the 1700s. Mozart and his sister Nannerl famously performed duets across Europe.',
    category: 'culture',
    difficulty: 'intermediate',
  },
  {
    id: 'cult-11',
    text: 'The piano appears in more musical genres than any other instrument, from classical and jazz to rock, pop, hip-hop, and electronic music.',
    category: 'culture',
    difficulty: 'beginner',
  },
];

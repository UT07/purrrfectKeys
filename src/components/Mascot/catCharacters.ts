/**
 * Cat Character Avatar System
 * 8 unique music-themed cat characters with backstories, skills, and unlock levels
 */

export type CatVariant = 'default' | 'tuxedo';

export interface CatCharacter {
  id: string;
  name: string;
  emoji: string;
  backstory: string;
  musicSkill: string;
  personality: string;
  color: string;
  unlockLevel: number;
  variant?: CatVariant;
}

export const CAT_CHARACTERS: CatCharacter[] = [
  {
    id: 'mini-meowww',
    name: 'Mini Meowww',
    emoji: '🐱✨',
    backstory:
      'The tiniest tuxedo cat you\'ve ever seen — she fits in a teacup but has the confidence of a concert pianist. She snuck into Juilliard in someone\'s coat pocket and graduated top of her class before anyone noticed. Her paws are so small she can only play one key at a time, but she makes every single note count.',
    musicSkill: 'Precision & Expression',
    personality: 'Tiny but Mighty',
    color: '#DC143C',
    unlockLevel: 1,
    variant: 'tuxedo',
  },
  {
    id: 'jazzy',
    name: 'Jazzy',
    emoji: '\uD83D\uDE0E\uD83C\uDFB7',
    backstory:
      'A cool alley cat from New Orleans who taught herself saxophone on the rooftops at midnight. The neighborhood dogs howled along at first, but now they quietly gather below to listen. She once improvised a solo so smooth that a pigeon fell asleep mid-flight.',
    musicSkill: 'Jazz Improvisation',
    personality: 'Cool & Smooth',
    color: '#9B59B6',
    unlockLevel: 2,
  },
  {
    id: 'chonky-monke',
    name: 'Chonky Monké',
    emoji: '🍊🐈',
    backstory:
      'An absolute UNIT of an orange & white cat who weighs 22 pounds and is proud of every single one. He learned piano by sitting on the keys — turns out when you\'re that chonky, you hit perfect chords every time. His signature move is the "Belly Slam Fortissimo" where he flops onto the keyboard for a dramatic finale. Has his own trading card.',
    musicSkill: 'Power Chords & Bass',
    personality: 'Absolute Unit',
    color: '#FF8C00',
    unlockLevel: 3,
  },
  {
    id: 'luna',
    name: 'Luna',
    emoji: '\uD83D\uDC08\uD83C\uDF19',
    backstory:
      'A mysterious black cat who only plays haunting melodies under the full moon. Legend says she learned piano from a ghost in an abandoned concert hall. Nobody has ever heard her play the same piece twice, and those who listen swear the music follows them home.',
    musicSkill: 'Moonlight Compositions',
    personality: 'Mysterious',
    color: '#5B6EAE',
    unlockLevel: 5,
  },
  {
    id: 'biscuit',
    name: 'Biscuit',
    emoji: '\uD83D\uDE3B\uD83C\uDF6A',
    backstory:
      'A fluffy persian who refuses to play in any key except C major because "it feels like warm cookies fresh from the oven." She practices exclusively on a pink grand piano and takes a nap between every piece. Her recitals always include a snack break.',
    musicSkill: 'C Major Specialist',
    personality: 'Cozy & Warm',
    color: '#F39C9C',
    unlockLevel: 8,
  },
  {
    id: 'vinyl',
    name: 'Vinyl',
    emoji: '\uD83E\uDDD0\uD83C\uDFB6',
    backstory:
      'A hipster cat with tiny round glasses who owns 3,000 vinyl records and insists everything sounds better on analog. He DJs underground warehouse parties for cats and somehow always finds the most obscure B-sides. He calls mainstream music "basic meow-sic."',
    musicSkill: 'DJ & Mixing',
    personality: 'Hipster',
    color: '#1ABC9C',
    unlockLevel: 12,
  },
  {
    id: 'aria',
    name: 'Aria',
    emoji: '\uD83D\uDC08\uD83C\uDFB5',
    backstory:
      'An elegant siamese with perfect pitch who trained at La Scala in Milan. She can shatter a wine glass with a high C and once sang a duet with a nightingale that made the entire garden weep. She considers herself a "vocal athlete" and does warm-ups at 5 AM.',
    musicSkill: 'Opera & Perfect Pitch',
    personality: 'Elegant',
    color: '#FFD700',
    unlockLevel: 15,
  },
  {
    id: 'tempo',
    name: 'Tempo',
    emoji: '\uD83D\uDE3C\u26A1',
    backstory:
      'A hyperactive ginger kitten who can play any song at double speed without missing a single note. Scientists tried to study his paws but he moved too fast for the cameras. He has been banned from three music schools for "unauthorized tempo modifications."',
    musicSkill: 'Speed Playing',
    personality: 'Hyperactive',
    color: '#E74C3C',
    unlockLevel: 20,
  },
];

/** Get a cat character by its ID */
export function getCatById(id: string): CatCharacter | undefined {
  return CAT_CHARACTERS.find((cat) => cat.id === id);
}

/** Get the default cat (lowest unlock level) */
export function getDefaultCat(): CatCharacter {
  return CAT_CHARACTERS[0];
}

/** Get all cats available at a given level */
export function getUnlockedCats(level: number): CatCharacter[] {
  return CAT_CHARACTERS.filter((cat) => cat.unlockLevel <= level);
}

/** Check if a specific cat is unlocked at the given level */
export function isCatUnlocked(catId: string, level: number): boolean {
  const cat = getCatById(catId);
  if (!cat) return false;
  return cat.unlockLevel <= level;
}

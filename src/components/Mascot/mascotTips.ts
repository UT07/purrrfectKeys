/**
 * Mascot Tips & Encouragements
 * Pool of tips, facts, and encouragements for Salsa the piano mascot
 */

export type MascotMood = 'happy' | 'encouraging' | 'excited' | 'teaching' | 'celebrating';
export type TipCategory = 'encouragement' | 'music-fact' | 'technique-tip' | 'fun-fact' | 'practice-tip';

export interface MascotTip {
  id: string;
  category: TipCategory;
  text: string;
  mood: MascotMood;
  minLevel?: number;
}

const TIPS: MascotTip[] = [
  // === Encouragements (15) ===
  { id: 'enc-01', category: 'encouragement', text: "You're doing great! Keep it up!", mood: 'happy' },
  { id: 'enc-02', category: 'encouragement', text: 'Every pianist started where you are!', mood: 'encouraging' },
  { id: 'enc-03', category: 'encouragement', text: 'Progress is progress, no matter how small.', mood: 'encouraging' },
  { id: 'enc-04', category: 'encouragement', text: 'I believe in you! One note at a time.', mood: 'happy' },
  { id: 'enc-05', category: 'encouragement', text: "Don't give up! The best is yet to come.", mood: 'encouraging' },
  { id: 'enc-06', category: 'encouragement', text: 'You just made music! How cool is that?', mood: 'excited' },
  { id: 'enc-07', category: 'encouragement', text: 'Each practice session makes you stronger.', mood: 'happy' },
  { id: 'enc-08', category: 'encouragement', text: "Mistakes are just practice in disguise!", mood: 'encouraging' },
  { id: 'enc-09', category: 'encouragement', text: "Look how far you've come already!", mood: 'excited' },
  { id: 'enc-10', category: 'encouragement', text: 'Your future self will thank you for practicing today.', mood: 'encouraging' },
  { id: 'enc-11', category: 'encouragement', text: "You're building a skill that lasts a lifetime!", mood: 'happy' },
  { id: 'enc-12', category: 'encouragement', text: 'Keep those fingers moving! You got this.', mood: 'excited' },
  { id: 'enc-13', category: 'encouragement', text: 'The hardest part is starting. You already did that!', mood: 'encouraging' },
  { id: 'enc-14', category: 'encouragement', text: 'Small steps lead to big melodies.', mood: 'happy' },
  { id: 'enc-15', category: 'encouragement', text: "Remember: even Beethoven had to start with scales!", mood: 'encouraging' },

  // === Music Facts (10) ===
  { id: 'mf-01', category: 'music-fact', text: 'The piano has 88 keys: 52 white and 36 black!', mood: 'teaching' },
  { id: 'mf-02', category: 'music-fact', text: 'Middle C is called C4 because it is in the 4th octave.', mood: 'teaching' },
  { id: 'mf-03', category: 'music-fact', text: 'The piano was invented in Italy around 1700 by Bartolomeo Cristofori.', mood: 'teaching' },
  { id: 'mf-04', category: 'music-fact', text: 'A standard piano has over 230 strings inside!', mood: 'teaching' },
  { id: 'mf-05', category: 'music-fact', text: 'The word "piano" is short for "pianoforte," meaning soft-loud.', mood: 'teaching' },
  { id: 'mf-06', category: 'music-fact', text: 'The black keys play sharps and flats.', mood: 'teaching' },
  { id: 'mf-07', category: 'music-fact', text: 'An octave spans 8 white keys and contains 12 notes total.', mood: 'teaching' },
  { id: 'mf-08', category: 'music-fact', text: 'The C major scale uses only white keys!', mood: 'teaching', minLevel: 2 },
  { id: 'mf-09', category: 'music-fact', text: 'A440 means the A above Middle C vibrates 440 times per second.', mood: 'teaching', minLevel: 3 },
  { id: 'mf-10', category: 'music-fact', text: 'The sustain pedal lifts all the dampers off the strings at once.', mood: 'teaching', minLevel: 2 },

  // === Technique Tips (10) ===
  { id: 'tt-01', category: 'technique-tip', text: 'Keep your wrists relaxed and fingers curved.', mood: 'teaching' },
  { id: 'tt-02', category: 'technique-tip', text: 'Sit with your elbows at keyboard height for the best posture.', mood: 'teaching' },
  { id: 'tt-03', category: 'technique-tip', text: 'Press keys with your fingertips, not your flat fingers.', mood: 'teaching' },
  { id: 'tt-04', category: 'technique-tip', text: 'Keep your thumb relaxed, not tucked under your hand.', mood: 'teaching' },
  { id: 'tt-05', category: 'technique-tip', text: 'Let your arms guide your hands across the keys.', mood: 'teaching', minLevel: 2 },
  { id: 'tt-06', category: 'technique-tip', text: 'Count out loud to keep steady rhythm.', mood: 'teaching' },
  { id: 'tt-07', category: 'technique-tip', text: 'Look at the sheet music, not your hands, when you can.', mood: 'teaching', minLevel: 3 },
  { id: 'tt-08', category: 'technique-tip', text: 'Breathe! Tension is the enemy of good playing.', mood: 'teaching' },
  { id: 'tt-09', category: 'technique-tip', text: 'Use the weight of your arm, not just finger strength.', mood: 'teaching', minLevel: 2 },
  { id: 'tt-10', category: 'technique-tip', text: 'Imagine holding a small ball in your hand for proper hand shape.', mood: 'teaching' },

  // === Fun Facts (10) ===
  { id: 'ff-01', category: 'fun-fact', text: 'Mozart wrote his first composition at age 5!', mood: 'excited' },
  { id: 'ff-02', category: 'fun-fact', text: 'The longest piano piece ever is over 8 hours long!', mood: 'excited' },
  { id: 'ff-03', category: 'fun-fact', text: "A concert grand piano can weigh over 990 pounds!", mood: 'excited' },
  { id: 'ff-04', category: 'fun-fact', text: 'Elton John has played over 4,000 concerts!', mood: 'excited' },
  { id: 'ff-05', category: 'fun-fact', text: 'The first electric piano was built in 1929.', mood: 'teaching' },
  { id: 'ff-06', category: 'fun-fact', text: 'Chopin composed mostly for solo piano and nothing else.', mood: 'teaching' },
  { id: 'ff-07', category: 'fun-fact', text: 'The fastest pianist can play over 19 notes per second!', mood: 'excited' },
  { id: 'ff-08', category: 'fun-fact', text: 'A piano key must be pressed about 50 grams of force to sound.', mood: 'teaching' },
  { id: 'ff-09', category: 'fun-fact', text: '"Happy Birthday" is one of the most played piano songs ever.', mood: 'happy' },
  { id: 'ff-10', category: 'fun-fact', text: 'The piano is both a string and a percussion instrument!', mood: 'excited' },

  // === Practice Tips (10) ===
  { id: 'pt-01', category: 'practice-tip', text: 'Practice slowly first, then gradually increase speed.', mood: 'teaching' },
  { id: 'pt-02', category: 'practice-tip', text: 'Short daily sessions beat one long weekly session.', mood: 'teaching' },
  { id: 'pt-03', category: 'practice-tip', text: 'Warm up with scales before tackling tough pieces.', mood: 'teaching', minLevel: 2 },
  { id: 'pt-04', category: 'practice-tip', text: 'If you keep making the same mistake, isolate that measure.', mood: 'teaching' },
  { id: 'pt-05', category: 'practice-tip', text: 'Set a timer for focused practice. Even 10 minutes helps!', mood: 'encouraging' },
  { id: 'pt-06', category: 'practice-tip', text: 'End your practice on a positive note, literally!', mood: 'happy' },
  { id: 'pt-07', category: 'practice-tip', text: 'Hands separately first, then put them together.', mood: 'teaching', minLevel: 3 },
  { id: 'pt-08', category: 'practice-tip', text: 'Record yourself to hear what you really sound like.', mood: 'teaching', minLevel: 2 },
  { id: 'pt-09', category: 'practice-tip', text: 'Take breaks when you feel frustrated. Fresh ears hear better!', mood: 'encouraging' },
  { id: 'pt-10', category: 'practice-tip', text: 'Clap the rhythm before playing the notes.', mood: 'teaching' },
];

/**
 * Get a random tip, optionally filtered by category and user level
 */
export function getRandomTip(options?: {
  category?: TipCategory;
  minLevel?: number;
}): MascotTip {
  let filtered = TIPS;

  if (options?.category) {
    filtered = filtered.filter((t) => t.category === options.category);
  }

  if (options?.minLevel !== undefined) {
    filtered = filtered.filter(
      (t) => t.minLevel === undefined || t.minLevel <= options.minLevel!
    );
  }

  if (filtered.length === 0) {
    // Fallback to any tip if no matches
    filtered = TIPS;
  }

  return filtered[Math.floor(Math.random() * filtered.length)];
}

/**
 * Get a tip appropriate for the given score percentage
 */
export function getTipForScore(score: number): MascotTip {
  if (score >= 95) {
    return getRandomTip({ category: 'encouragement' });
  }
  if (score >= 80) {
    // Mix of encouragements and fun facts for good scores
    const categories: TipCategory[] = ['encouragement', 'fun-fact'];
    const category = categories[Math.floor(Math.random() * categories.length)];
    return getRandomTip({ category });
  }
  if (score >= 60) {
    return getRandomTip({ category: 'technique-tip' });
  }
  return getRandomTip({ category: 'practice-tip' });
}

/**
 * Get a tip celebrating a streak milestone
 */
export function getTipForStreak(streak: number): MascotTip {
  if (streak >= 30) {
    return {
      id: 'streak-30',
      category: 'encouragement',
      text: `${streak}-day streak! You have incredible dedication. Keep the music going!`,
      mood: 'celebrating',
    };
  }
  if (streak >= 14) {
    return {
      id: 'streak-14',
      category: 'encouragement',
      text: `${streak} days in a row! Two weeks of practice is when real progress shows.`,
      mood: 'celebrating',
    };
  }
  if (streak >= 7) {
    return {
      id: 'streak-7',
      category: 'encouragement',
      text: `${streak}-day streak! A full week of practice. You are on fire!`,
      mood: 'celebrating',
    };
  }
  if (streak >= 3) {
    return {
      id: 'streak-3',
      category: 'encouragement',
      text: `${streak} days in a row! You are building a great habit!`,
      mood: 'excited',
    };
  }
  return {
    id: 'streak-1',
    category: 'encouragement',
    text: 'Welcome back! Every practice session counts.',
    mood: 'happy',
  };
}

export { TIPS };

/**
 * Loading Tips Content
 * Practice tips Salsa the coach cat shares during exercise loading screens.
 * Covers posture, technique, rhythm, and motivation.
 */

const LOADING_TIPS: string[] = [
  // Posture
  'Relax your shoulders before you play — tension is the enemy of speed!',
  'Sit up straight with your feet flat on the floor. Good posture = good playing.',
  'Keep your wrists level with the keyboard, not drooping or raised too high.',
  'Your elbows should be roughly at keyboard height — adjust your bench if needed.',

  // Technique
  'Curve your fingers like you\'re holding a tennis ball.',
  'Use the weight of your arm, not finger strength, to press keys.',
  'Practice tricky passages with just one hand before combining both.',
  'Lift your fingers just enough to clear the keys — no need for big movements.',
  'Play each note clearly before speeding up. Clarity first, speed second.',

  // Rhythm
  'Try counting out loud: 1-2-3-4. It helps your brain lock into the rhythm.',
  'Tap the rhythm on a table before playing the notes. Rhythm first, pitch second!',
  'Use the metronome as a friend, not a foe. It keeps you honest.',
  'If a passage feels rushed, slow down by half and build back up gradually.',

  // Motivation
  'Slow practice makes fast progress. Start slow, nail it, then speed up.',
  'Even 5 minutes of focused practice beats 30 minutes of distracted noodling.',
  'Mistakes are data, not failures. Each one shows you what to work on next.',
  'Professional pianists still practice scales every day. Basics matter!',
  'Your brain builds muscle memory while you sleep — so practice before bed!',
  'Stuck on a tough section? Take a break and come back. Fresh eyes (and fingers) help.',
  'Every pianist started exactly where you are right now. Keep going!',
];

/**
 * Returns a random loading tip from Salsa the coach.
 */
export function getRandomLoadingTip(): string {
  return LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
}

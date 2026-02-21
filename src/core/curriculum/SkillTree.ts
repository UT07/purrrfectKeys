/**
 * SkillTree — Directed Acyclic Graph of piano skills
 *
 * Defines the learning path from individual notes through intervals, scales,
 * chords, and songs. Each node has prerequisites, mapped exercises, and a
 * mastery threshold. Pure TypeScript — no React imports.
 */

import type { SkillMasteryRecord } from '../../stores/types';

/** Skill decay: half-life in days before a mastered skill needs review */
export const DECAY_HALF_LIFE_DAYS = 14;

/** Decay score below this triggers a review session */
export const DECAY_THRESHOLD = 0.5;

// ============================================================================
// Types
// ============================================================================

export type SkillCategory =
  | 'note-finding'
  | 'intervals'
  | 'scales'
  | 'chords'
  | 'rhythm'
  | 'hand-independence'
  | 'songs'
  | 'black-keys'
  | 'key-signatures'
  | 'expression'
  | 'arpeggios'
  | 'sight-reading';

export interface SkillNode {
  id: string;
  name: string;
  category: SkillCategory;
  prerequisites: string[];
  targetExerciseIds: string[];
  masteryThreshold: number; // 0-1, score needed to consider mastered
  description: string;
  tier: number;                  // 1-15, groups nodes into monthly chunks
  requiredCompletions: number;   // default 1, harder skills need 3-5
}

// ============================================================================
// Skill Tree Definition
// ============================================================================

export const SKILL_TREE: SkillNode[] = [
  // ── Tier 1: Note Finding (Lesson 1) ─────────────────────────────────────
  {
    id: 'find-middle-c',
    name: 'Find Middle C',
    category: 'note-finding',
    prerequisites: [],
    targetExerciseIds: ['lesson-01-ex-01'],
    masteryThreshold: 0.7,
    description: 'Locate and play Middle C (C4) on the keyboard',
    tier: 1,
    requiredCompletions: 1,
  },
  {
    id: 'keyboard-geography',
    name: 'Keyboard Geography',
    category: 'note-finding',
    prerequisites: ['find-middle-c'],
    targetExerciseIds: ['lesson-01-ex-02'],
    masteryThreshold: 0.7,
    description: 'Navigate the white keys around Middle C',
    tier: 1,
    requiredCompletions: 1,
  },
  {
    id: 'white-keys',
    name: 'White Keys',
    category: 'note-finding',
    prerequisites: ['keyboard-geography'],
    targetExerciseIds: ['lesson-01-ex-03'],
    masteryThreshold: 0.7,
    description: 'Play all white keys in the C4 octave',
    tier: 1,
    requiredCompletions: 1,
  },

  // ── Tier 2: Right Hand Melodies (Lesson 2) ───────────────────────────────
  {
    id: 'rh-cde',
    name: 'C-D-E Right Hand',
    category: 'intervals',
    prerequisites: ['white-keys'],
    targetExerciseIds: ['lesson-02-ex-01'],
    masteryThreshold: 0.7,
    description: 'Play C-D-E ascending with right hand',
    tier: 2,
    requiredCompletions: 1,
  },
  {
    id: 'rh-cdefg',
    name: 'C Position (C-G)',
    category: 'intervals',
    prerequisites: ['rh-cde'],
    targetExerciseIds: ['lesson-02-ex-02'],
    masteryThreshold: 0.7,
    description: 'Play five-finger C position with right hand',
    tier: 2,
    requiredCompletions: 1,
  },
  {
    id: 'c-major-octave',
    name: 'C Major Octave',
    category: 'scales',
    prerequisites: ['rh-cdefg'],
    targetExerciseIds: ['lesson-02-ex-03'],
    masteryThreshold: 0.7,
    description: 'Play the full C major scale ascending',
    tier: 2,
    requiredCompletions: 1,
  },
  {
    id: 'simple-melodies',
    name: 'Simple Melodies',
    category: 'songs',
    prerequisites: ['rh-cdefg'],
    targetExerciseIds: ['lesson-02-ex-04', 'lesson-02-ex-06'],
    masteryThreshold: 0.7,
    description: 'Play simple right-hand melodies (Mary, Twinkle)',
    tier: 2,
    requiredCompletions: 1,
  },
  {
    id: 'eighth-notes',
    name: 'Eighth Notes',
    category: 'rhythm',
    prerequisites: ['rh-cde'],
    targetExerciseIds: ['lesson-02-ex-07'],
    masteryThreshold: 0.7,
    description: 'Play eighth-note rhythms accurately',
    tier: 2,
    requiredCompletions: 1,
  },
  {
    id: 'broken-chords-rh',
    name: 'Broken Chords (RH)',
    category: 'chords',
    prerequisites: ['rh-cdefg'],
    targetExerciseIds: ['lesson-02-ex-05'],
    masteryThreshold: 0.7,
    description: 'Play broken C chord with right hand',
    tier: 2,
    requiredCompletions: 1,
  },
  {
    id: 'c-position-review',
    name: 'C Position Review',
    category: 'intervals',
    prerequisites: ['c-major-octave', 'eighth-notes'],
    targetExerciseIds: ['lesson-02-ex-08'],
    masteryThreshold: 0.8,
    description: 'Comprehensive C position review',
    tier: 3,
    requiredCompletions: 1,
  },

  // ── Tier 3: Left Hand Basics (Lesson 3) ──────────────────────────────────
  {
    id: 'lh-c-position',
    name: 'Left Hand C Position',
    category: 'note-finding',
    prerequisites: ['white-keys'],
    targetExerciseIds: ['lesson-03-ex-01'],
    masteryThreshold: 0.7,
    description: 'Play C position with left hand',
    tier: 3,
    requiredCompletions: 1,
  },
  {
    id: 'lh-scale-descending',
    name: 'Left Hand Scale Down',
    category: 'scales',
    prerequisites: ['lh-c-position'],
    targetExerciseIds: ['lesson-03-ex-02'],
    masteryThreshold: 0.7,
    description: 'Play descending C major scale with left hand',
    tier: 3,
    requiredCompletions: 1,
  },
  {
    id: 'bass-notes',
    name: 'Bass Notes',
    category: 'note-finding',
    prerequisites: ['lh-c-position'],
    targetExerciseIds: ['lesson-03-ex-03'],
    masteryThreshold: 0.7,
    description: 'Play bass register notes with left hand',
    tier: 3,
    requiredCompletions: 1,
  },
  {
    id: 'broken-chords-lh',
    name: 'Broken Chords (LH)',
    category: 'chords',
    prerequisites: ['lh-scale-descending'],
    targetExerciseIds: ['lesson-03-ex-04'],
    masteryThreshold: 0.7,
    description: 'Play broken F chord with left hand',
    tier: 3,
    requiredCompletions: 1,
  },
  {
    id: 'steady-bass',
    name: 'Steady Bass Pattern',
    category: 'rhythm',
    prerequisites: ['bass-notes'],
    targetExerciseIds: ['lesson-03-ex-05'],
    masteryThreshold: 0.7,
    description: 'Maintain a steady bass rhythm pattern',
    tier: 3,
    requiredCompletions: 1,
  },

  // ── Tier 4: Both Hands Together (Lesson 4) ───────────────────────────────
  {
    id: 'hands-together-basic',
    name: 'Hands Together Basic',
    category: 'hand-independence',
    prerequisites: ['c-position-review', 'lh-scale-descending'],
    targetExerciseIds: ['lesson-04-ex-01'],
    masteryThreshold: 0.7,
    description: 'Play simple melody + bass simultaneously',
    tier: 4,
    requiredCompletions: 2,
  },
  {
    id: 'hands-melody-full',
    name: 'Full Two-Hand Melody',
    category: 'hand-independence',
    prerequisites: ['hands-together-basic'],
    targetExerciseIds: ['lesson-04-ex-02'],
    masteryThreshold: 0.7,
    description: 'Play a full melody with both hands (Mary Had a Little Lamb)',
    tier: 4,
    requiredCompletions: 2,
  },
  {
    id: 'hand-independence-drill',
    name: 'Hand Independence Drill',
    category: 'hand-independence',
    prerequisites: ['hands-together-basic'],
    targetExerciseIds: ['lesson-04-ex-03'],
    masteryThreshold: 0.75,
    description: 'Different rhythms in each hand simultaneously',
    tier: 4,
    requiredCompletions: 2,
  },
  {
    id: 'two-hand-songs',
    name: 'Two-Hand Songs',
    category: 'songs',
    prerequisites: ['hands-melody-full'],
    targetExerciseIds: ['lesson-04-ex-04'],
    masteryThreshold: 0.7,
    description: 'Play arranged songs with both hands (Ode to Joy)',
    tier: 5,
    requiredCompletions: 2,
  },
  {
    id: 'blocked-chords',
    name: 'Blocked Chords',
    category: 'chords',
    prerequisites: ['broken-chords-rh', 'broken-chords-lh'],
    targetExerciseIds: ['lesson-04-ex-05'],
    masteryThreshold: 0.7,
    description: 'Play C and F chords in blocked form',
    tier: 4,
    requiredCompletions: 2,
  },
  {
    id: 'both-hands-review',
    name: 'Both Hands Review',
    category: 'hand-independence',
    prerequisites: ['hand-independence-drill', 'blocked-chords'],
    targetExerciseIds: ['lesson-04-ex-06'],
    masteryThreshold: 0.8,
    description: 'Comprehensive both-hands review',
    tier: 5,
    requiredCompletions: 2,
  },

  // ── Tier 5: Scales & Technique (Lesson 5) ────────────────────────────────
  {
    id: 'scale-technique',
    name: 'Scale Technique',
    category: 'scales',
    prerequisites: ['c-major-octave', 'lh-scale-descending'],
    targetExerciseIds: ['lesson-05-ex-01'],
    masteryThreshold: 0.75,
    description: 'Proper thumb-under technique for scales',
    tier: 5,
    requiredCompletions: 2,
  },
  {
    id: 'parallel-scales',
    name: 'Parallel Scales',
    category: 'scales',
    prerequisites: ['scale-technique', 'hands-together-basic'],
    targetExerciseIds: ['lesson-05-ex-02'],
    masteryThreshold: 0.75,
    description: 'Play scales in parallel motion with both hands',
    tier: 5,
    requiredCompletions: 2,
  },
  {
    id: 'scale-speed',
    name: 'Scale Speed',
    category: 'scales',
    prerequisites: ['parallel-scales'],
    targetExerciseIds: ['lesson-05-ex-03'],
    masteryThreshold: 0.75,
    description: 'Increase scale speed while maintaining accuracy',
    tier: 6,
    requiredCompletions: 2,
  },
  {
    id: 'scale-review',
    name: 'Scale Review',
    category: 'scales',
    prerequisites: ['scale-speed'],
    targetExerciseIds: ['lesson-05-ex-04'],
    masteryThreshold: 0.8,
    description: 'Comprehensive scale technique review',
    tier: 6,
    requiredCompletions: 2,
  },

  // ── Tier 6: Popular Songs (Lesson 6) ───────────────────────────────────
  {
    id: 'beginner-songs',
    name: 'Beginner Songs',
    category: 'songs',
    prerequisites: ['both-hands-review'],
    targetExerciseIds: ['lesson-06-ex-01', 'lesson-06-ex-02'],
    masteryThreshold: 0.7,
    description: 'Play well-known songs (Jingle Bells, Happy Birthday)',
    tier: 6,
    requiredCompletions: 2,
  },
  {
    id: 'intermediate-songs',
    name: 'Intermediate Songs',
    category: 'songs',
    prerequisites: ['beginner-songs', 'scale-technique'],
    targetExerciseIds: ['lesson-06-ex-03', 'lesson-06-ex-04'],
    masteryThreshold: 0.75,
    description: 'Play more complex arrangements (Amazing Grace, Let It Go)',
    tier: 6,
    requiredCompletions: 2,
  },

  // ── Tier 7: Black Keys & Sharps/Flats (Lesson 7) ────────────────────────
  {
    id: 'find-black-keys',
    name: 'Find Black Keys',
    category: 'black-keys',
    prerequisites: ['white-keys'],
    targetExerciseIds: ['lesson-07-ex-01'],
    masteryThreshold: 0.7,
    description: 'Locate groups of 2 and 3 black keys',
    tier: 7,
    requiredCompletions: 1,
  },
  {
    id: 'sharp-notes-rh',
    name: 'Sharp Notes (RH)',
    category: 'black-keys',
    prerequisites: ['find-black-keys', 'rh-cdefg'],
    targetExerciseIds: ['lesson-07-ex-02'],
    masteryThreshold: 0.7,
    description: 'Play F#, C#, G# with right hand',
    tier: 7,
    requiredCompletions: 2,
  },
  {
    id: 'flat-notes-lh',
    name: 'Flat Notes (LH)',
    category: 'black-keys',
    prerequisites: ['find-black-keys', 'lh-c-position'],
    targetExerciseIds: ['lesson-07-ex-03'],
    masteryThreshold: 0.7,
    description: 'Play Bb, Eb with left hand',
    tier: 7,
    requiredCompletions: 2,
  },
  {
    id: 'chromatic-scale',
    name: 'Chromatic Scale',
    category: 'black-keys',
    prerequisites: ['sharp-notes-rh', 'flat-notes-lh'],
    targetExerciseIds: ['lesson-07-ex-04'],
    masteryThreshold: 0.7,
    description: 'Chromatic scale one octave ascending and descending',
    tier: 7,
    requiredCompletions: 2,
  },
  {
    id: 'half-steps-whole-steps',
    name: 'Half & Whole Steps',
    category: 'intervals',
    prerequisites: ['find-black-keys'],
    targetExerciseIds: ['lesson-07-ex-05'],
    masteryThreshold: 0.7,
    description: 'Distinguish half steps and whole steps by ear and touch',
    tier: 7,
    requiredCompletions: 1,
  },
  {
    id: 'black-key-melodies',
    name: 'Black Key Melodies',
    category: 'black-keys',
    prerequisites: ['chromatic-scale'],
    targetExerciseIds: ['lesson-07-ex-06'],
    masteryThreshold: 0.7,
    description: 'Simple melodies using sharps and flats',
    tier: 7,
    requiredCompletions: 2,
  },

  // ── Tier 8: G Major & F Major (Lessons 8-9) ─────────────────────────────
  {
    id: 'g-major-scale-rh',
    name: 'G Major Scale (RH)',
    category: 'key-signatures',
    prerequisites: ['half-steps-whole-steps', 'scale-technique'],
    targetExerciseIds: ['lesson-08-ex-01'],
    masteryThreshold: 0.75,
    description: 'G major scale right hand with F#',
    tier: 8,
    requiredCompletions: 2,
  },
  {
    id: 'g-major-scale-lh',
    name: 'G Major Scale (LH)',
    category: 'key-signatures',
    prerequisites: ['g-major-scale-rh', 'lh-scale-descending'],
    targetExerciseIds: ['lesson-08-ex-02'],
    masteryThreshold: 0.75,
    description: 'G major scale left hand',
    tier: 8,
    requiredCompletions: 2,
  },
  {
    id: 'g-major-hands',
    name: 'G Major Both Hands',
    category: 'key-signatures',
    prerequisites: ['g-major-scale-lh', 'hands-together-basic'],
    targetExerciseIds: ['lesson-08-ex-03'],
    masteryThreshold: 0.75,
    description: 'G major scale both hands together',
    tier: 8,
    requiredCompletions: 3,
  },
  {
    id: 'g-major-melodies',
    name: 'G Major Melodies',
    category: 'key-signatures',
    prerequisites: ['g-major-scale-rh'],
    targetExerciseIds: ['lesson-08-ex-04', 'lesson-08-ex-05'],
    masteryThreshold: 0.7,
    description: 'Melodies in G major',
    tier: 8,
    requiredCompletions: 2,
  },
  {
    id: 'f-major-scale-rh',
    name: 'F Major Scale (RH)',
    category: 'key-signatures',
    prerequisites: ['half-steps-whole-steps', 'scale-technique'],
    targetExerciseIds: ['lesson-09-ex-01'],
    masteryThreshold: 0.75,
    description: 'F major scale right hand with Bb',
    tier: 8,
    requiredCompletions: 2,
  },
  {
    id: 'f-major-scale-lh',
    name: 'F Major Scale (LH)',
    category: 'key-signatures',
    prerequisites: ['f-major-scale-rh', 'lh-scale-descending'],
    targetExerciseIds: ['lesson-09-ex-02'],
    masteryThreshold: 0.75,
    description: 'F major scale left hand',
    tier: 8,
    requiredCompletions: 2,
  },
  {
    id: 'f-major-hands',
    name: 'F Major Both Hands',
    category: 'key-signatures',
    prerequisites: ['f-major-scale-lh', 'hands-together-basic'],
    targetExerciseIds: ['lesson-09-ex-03'],
    masteryThreshold: 0.75,
    description: 'F major scale both hands together',
    tier: 8,
    requiredCompletions: 3,
  },
  {
    id: 'key-signature-reading',
    name: 'Key Signature Reading',
    category: 'key-signatures',
    prerequisites: ['g-major-melodies', 'f-major-scale-rh'],
    targetExerciseIds: ['lesson-09-ex-04', 'lesson-09-ex-05'],
    masteryThreshold: 0.7,
    description: 'Identify C, G, F major by key signature pattern',
    tier: 8,
    requiredCompletions: 2,
  },

  // ── Tier 9: Minor Keys (Lessons 10-11) ───────────────────────────────────
  {
    id: 'a-minor-natural',
    name: 'A Natural Minor',
    category: 'scales',
    prerequisites: ['scale-technique', 'key-signature-reading'],
    targetExerciseIds: ['lesson-10-ex-01'],
    masteryThreshold: 0.75,
    description: 'A natural minor scale (all white keys)',
    tier: 9,
    requiredCompletions: 2,
  },
  {
    id: 'a-minor-melodies',
    name: 'A Minor Melodies',
    category: 'songs',
    prerequisites: ['a-minor-natural'],
    targetExerciseIds: ['lesson-10-ex-02', 'lesson-10-ex-03'],
    masteryThreshold: 0.7,
    description: 'Melodies in A minor',
    tier: 9,
    requiredCompletions: 2,
  },
  {
    id: 'd-minor-scale',
    name: 'D Minor Scale',
    category: 'scales',
    prerequisites: ['a-minor-natural', 'flat-notes-lh'],
    targetExerciseIds: ['lesson-11-ex-01'],
    masteryThreshold: 0.75,
    description: 'D natural minor scale with Bb',
    tier: 9,
    requiredCompletions: 2,
  },
  {
    id: 'd-minor-melodies',
    name: 'D Minor Melodies',
    category: 'songs',
    prerequisites: ['d-minor-scale'],
    targetExerciseIds: ['lesson-11-ex-02'],
    masteryThreshold: 0.7,
    description: 'Melodies in D minor',
    tier: 9,
    requiredCompletions: 2,
  },
  {
    id: 'e-minor-scale',
    name: 'E Minor Scale',
    category: 'scales',
    prerequisites: ['a-minor-natural', 'sharp-notes-rh'],
    targetExerciseIds: ['lesson-11-ex-03'],
    masteryThreshold: 0.75,
    description: 'E natural minor scale with F#',
    tier: 9,
    requiredCompletions: 2,
  },
  {
    id: 'minor-vs-major',
    name: 'Minor vs Major',
    category: 'intervals',
    prerequisites: ['a-minor-melodies'],
    targetExerciseIds: ['lesson-10-ex-04'],
    masteryThreshold: 0.7,
    description: 'Compare major and minor tonality by ear',
    tier: 9,
    requiredCompletions: 1,
  },
  {
    id: 'harmonic-minor',
    name: 'Harmonic Minor',
    category: 'scales',
    prerequisites: ['a-minor-natural', 'sharp-notes-rh'],
    targetExerciseIds: ['lesson-10-ex-05'],
    masteryThreshold: 0.75,
    description: 'A harmonic minor scale with raised G#',
    tier: 9,
    requiredCompletions: 2,
  },
  {
    id: 'minor-songs',
    name: 'Minor Key Songs',
    category: 'songs',
    prerequisites: ['a-minor-melodies', 'd-minor-melodies'],
    targetExerciseIds: ['lesson-11-ex-04', 'lesson-11-ex-05'],
    masteryThreshold: 0.7,
    description: 'Songs in minor keys',
    tier: 9,
    requiredCompletions: 2,
  },

  // ── Tier 10: Chord Progressions (Lessons 13-15) ─────────────────────────
  {
    id: 'major-triads-root',
    name: 'Major Triads (Root)',
    category: 'chords',
    prerequisites: ['blocked-chords', 'key-signature-reading'],
    targetExerciseIds: ['lesson-13-ex-01'],
    masteryThreshold: 0.75,
    description: 'Play C, F, G root position major triads',
    tier: 10,
    requiredCompletions: 3,
  },
  {
    id: 'minor-triads',
    name: 'Minor Triads',
    category: 'chords',
    prerequisites: ['major-triads-root', 'a-minor-natural'],
    targetExerciseIds: ['lesson-13-ex-02'],
    masteryThreshold: 0.75,
    description: 'Play Am, Dm, Em minor triads',
    tier: 10,
    requiredCompletions: 3,
  },
  {
    id: 'chord-inversions-intro',
    name: 'Chord Inversions',
    category: 'chords',
    prerequisites: ['major-triads-root'],
    targetExerciseIds: ['lesson-13-ex-03'],
    masteryThreshold: 0.75,
    description: 'First inversion of major and minor triads',
    tier: 10,
    requiredCompletions: 3,
  },
  {
    id: 'progression-i-iv-v',
    name: 'I-IV-V Progression',
    category: 'chords',
    prerequisites: ['major-triads-root'],
    targetExerciseIds: ['lesson-13-ex-04', 'lesson-14-ex-01'],
    masteryThreshold: 0.75,
    description: 'Classic I-IV-V chord progression in C major',
    tier: 10,
    requiredCompletions: 3,
  },
  {
    id: 'progression-i-vi-iv-v',
    name: 'I-vi-IV-V Progression',
    category: 'chords',
    prerequisites: ['progression-i-iv-v', 'minor-triads'],
    targetExerciseIds: ['lesson-14-ex-02'],
    masteryThreshold: 0.75,
    description: 'Classic 50s doo-wop progression',
    tier: 10,
    requiredCompletions: 3,
  },
  {
    id: 'progression-i-v-vi-iv',
    name: 'I-V-vi-IV (Axis)',
    category: 'chords',
    prerequisites: ['progression-i-iv-v', 'minor-triads'],
    targetExerciseIds: ['lesson-14-ex-03'],
    masteryThreshold: 0.75,
    description: 'Modern pop "Axis" progression',
    tier: 10,
    requiredCompletions: 3,
  },
  {
    id: 'bass-chord-pattern',
    name: 'Bass-Chord Pattern',
    category: 'hand-independence',
    prerequisites: ['progression-i-iv-v', 'steady-bass'],
    targetExerciseIds: ['lesson-14-ex-04'],
    masteryThreshold: 0.75,
    description: 'Left hand broken chord accompaniment pattern',
    tier: 10,
    requiredCompletions: 3,
  },
  {
    id: 'alberti-bass',
    name: 'Alberti Bass',
    category: 'hand-independence',
    prerequisites: ['bass-chord-pattern'],
    targetExerciseIds: ['lesson-14-ex-05'],
    masteryThreshold: 0.75,
    description: 'Alberti bass pattern (C-G-E-G)',
    tier: 10,
    requiredCompletions: 3,
  },
  {
    id: 'chord-songs',
    name: 'Chord Songs',
    category: 'songs',
    prerequisites: ['progression-i-v-vi-iv', 'bass-chord-pattern'],
    targetExerciseIds: ['lesson-15-ex-01', 'lesson-15-ex-02'],
    masteryThreshold: 0.7,
    description: 'Songs with chord accompaniment',
    tier: 10,
    requiredCompletions: 3,
  },
  {
    id: 'chord-transitions',
    name: 'Chord Transitions',
    category: 'chords',
    prerequisites: ['chord-inversions-intro', 'progression-i-vi-iv-v'],
    targetExerciseIds: ['lesson-15-ex-03', 'lesson-15-ex-04', 'lesson-15-ex-05'],
    masteryThreshold: 0.75,
    description: 'Smooth voice-leading transitions between chords',
    tier: 10,
    requiredCompletions: 3,
  },

  // ── Tier 11: Advanced Rhythm (Lessons 16-18) ────────────────────────────
  {
    id: 'dotted-quarter-notes',
    name: 'Dotted Quarters',
    category: 'rhythm',
    prerequisites: ['eighth-notes', 'key-signature-reading'],
    targetExerciseIds: ['lesson-16-ex-01'],
    masteryThreshold: 0.75,
    description: 'Dotted quarter note rhythms (1.5 beats)',
    tier: 11,
    requiredCompletions: 2,
  },
  {
    id: 'syncopation-intro',
    name: 'Syncopation',
    category: 'rhythm',
    prerequisites: ['dotted-quarter-notes'],
    targetExerciseIds: ['lesson-16-ex-02', 'lesson-16-ex-03'],
    masteryThreshold: 0.75,
    description: 'Off-beat accents and syncopated rhythms',
    tier: 11,
    requiredCompletions: 3,
  },
  {
    id: 'triplet-rhythm',
    name: 'Triplets',
    category: 'rhythm',
    prerequisites: ['eighth-notes'],
    targetExerciseIds: ['lesson-17-ex-01'],
    masteryThreshold: 0.75,
    description: 'Triplet eighth note rhythms',
    tier: 11,
    requiredCompletions: 3,
  },
  {
    id: '3-4-time',
    name: '3/4 Time (Waltz)',
    category: 'rhythm',
    prerequisites: ['dotted-quarter-notes'],
    targetExerciseIds: ['lesson-17-ex-02', 'lesson-17-ex-03'],
    masteryThreshold: 0.75,
    description: 'Waltz time — three beats per measure',
    tier: 11,
    requiredCompletions: 2,
  },
  {
    id: '6-8-time',
    name: '6/8 Time',
    category: 'rhythm',
    prerequisites: ['triplet-rhythm'],
    targetExerciseIds: ['lesson-17-ex-04'],
    masteryThreshold: 0.75,
    description: 'Compound meter — two groups of three',
    tier: 11,
    requiredCompletions: 3,
  },
  {
    id: 'ties-across-barline',
    name: 'Tied Notes',
    category: 'rhythm',
    prerequisites: ['syncopation-intro'],
    targetExerciseIds: ['lesson-16-ex-04'],
    masteryThreshold: 0.7,
    description: 'Notes tied across bar lines',
    tier: 11,
    requiredCompletions: 2,
  },
  {
    id: 'swing-rhythm',
    name: 'Swing Feel',
    category: 'rhythm',
    prerequisites: ['triplet-rhythm', 'syncopation-intro'],
    targetExerciseIds: ['lesson-18-ex-01'],
    masteryThreshold: 0.75,
    description: 'Swing eighth notes (long-short feel)',
    tier: 11,
    requiredCompletions: 3,
  },
  {
    id: 'rhythm-reading',
    name: 'Rhythm Reading',
    category: 'rhythm',
    prerequisites: ['3-4-time', '6-8-time'],
    targetExerciseIds: ['lesson-18-ex-02', 'lesson-18-ex-03'],
    masteryThreshold: 0.75,
    description: 'Clap and play written rhythms accurately',
    tier: 11,
    requiredCompletions: 2,
  },
  {
    id: 'mixed-rhythms',
    name: 'Mixed Rhythms',
    category: 'rhythm',
    prerequisites: ['rhythm-reading', 'swing-rhythm', 'ties-across-barline'],
    targetExerciseIds: ['lesson-18-ex-04', 'lesson-18-ex-05'],
    masteryThreshold: 0.8,
    description: 'Combining all rhythm types in one exercise',
    tier: 11,
    requiredCompletions: 3,
  },

  // ── Tier 12: Arpeggios & Patterns (Lesson 19) ──────────────────────────
  {
    id: 'c-major-arpeggio',
    name: 'C Major Arpeggio',
    category: 'arpeggios',
    prerequisites: ['scale-review', 'chord-inversions-intro'],
    targetExerciseIds: ['lesson-19-ex-01'],
    masteryThreshold: 0.75,
    description: 'C major arpeggio across 2 octaves',
    tier: 12,
    requiredCompletions: 3,
  },
  {
    id: 'g-major-arpeggio',
    name: 'G Major Arpeggio',
    category: 'arpeggios',
    prerequisites: ['c-major-arpeggio', 'g-major-scale-rh'],
    targetExerciseIds: ['lesson-19-ex-02'],
    masteryThreshold: 0.75,
    description: 'G major arpeggio across 2 octaves',
    tier: 12,
    requiredCompletions: 3,
  },
  {
    id: 'minor-arpeggios',
    name: 'Minor Arpeggios',
    category: 'arpeggios',
    prerequisites: ['c-major-arpeggio', 'a-minor-natural'],
    targetExerciseIds: ['lesson-19-ex-03'],
    masteryThreshold: 0.75,
    description: 'Am, Dm arpeggios',
    tier: 12,
    requiredCompletions: 3,
  },
  {
    id: 'arpeggio-patterns',
    name: 'Arpeggio Patterns',
    category: 'arpeggios',
    prerequisites: ['c-major-arpeggio'],
    targetExerciseIds: ['lesson-19-ex-04'],
    masteryThreshold: 0.75,
    description: 'Accomp patterns (1-3-5-8)',
    tier: 12,
    requiredCompletions: 3,
  },
  {
    id: 'broken-chord-patterns',
    name: 'Broken Chord Patterns',
    category: 'arpeggios',
    prerequisites: ['alberti-bass', 'arpeggio-patterns'],
    targetExerciseIds: ['lesson-19-ex-05'],
    masteryThreshold: 0.75,
    description: 'Waltz bass and stride patterns',
    tier: 12,
    requiredCompletions: 3,
  },
  {
    id: 'hands-arpeggio',
    name: 'Arpeggios Both Hands',
    category: 'arpeggios',
    prerequisites: ['g-major-arpeggio', 'minor-arpeggios'],
    targetExerciseIds: ['lesson-19-ex-06'],
    masteryThreshold: 0.8,
    description: 'Arpeggios both hands in parallel motion',
    tier: 12,
    requiredCompletions: 3,
  },
  {
    id: 'arpeggio-songs',
    name: 'Arpeggio Songs',
    category: 'songs',
    prerequisites: ['broken-chord-patterns', 'hands-arpeggio'],
    targetExerciseIds: ['lesson-19-ex-07'],
    masteryThreshold: 0.7,
    description: 'Songs using arpeggio patterns',
    tier: 12,
    requiredCompletions: 3,
  },

  // ── Tier 13: Expression & Dynamics (Lesson 20) ─────────────────────────
  {
    id: 'dynamics-p-f',
    name: 'Piano & Forte',
    category: 'expression',
    prerequisites: ['intermediate-songs'],
    targetExerciseIds: ['lesson-20-ex-01'],
    masteryThreshold: 0.7,
    description: 'Play piano (soft) and forte (loud)',
    tier: 13,
    requiredCompletions: 2,
  },
  {
    id: 'crescendo-diminuendo',
    name: 'Crescendo & Diminuendo',
    category: 'expression',
    prerequisites: ['dynamics-p-f'],
    targetExerciseIds: ['lesson-20-ex-02'],
    masteryThreshold: 0.7,
    description: 'Gradual volume swells and fades',
    tier: 13,
    requiredCompletions: 2,
  },
  {
    id: 'staccato-technique',
    name: 'Staccato',
    category: 'expression',
    prerequisites: ['dynamics-p-f'],
    targetExerciseIds: ['lesson-20-ex-03'],
    masteryThreshold: 0.75,
    description: 'Short detached notes',
    tier: 13,
    requiredCompletions: 2,
  },
  {
    id: 'legato-technique',
    name: 'Legato',
    category: 'expression',
    prerequisites: ['dynamics-p-f'],
    targetExerciseIds: ['lesson-20-ex-04'],
    masteryThreshold: 0.75,
    description: 'Smooth connected playing',
    tier: 13,
    requiredCompletions: 2,
  },
  {
    id: 'accents-emphasis',
    name: 'Accents',
    category: 'expression',
    prerequisites: ['staccato-technique', 'syncopation-intro'],
    targetExerciseIds: ['lesson-20-ex-05'],
    masteryThreshold: 0.7,
    description: 'Emphasizing individual notes within a phrase',
    tier: 13,
    requiredCompletions: 2,
  },
  {
    id: 'pedal-intro',
    name: 'Sustain Pedal',
    category: 'expression',
    prerequisites: ['legato-technique', 'chord-transitions'],
    targetExerciseIds: ['lesson-20-ex-06'],
    masteryThreshold: 0.7,
    description: 'Basic sustain pedal technique',
    tier: 13,
    requiredCompletions: 2,
  },
  {
    id: 'phrasing',
    name: 'Musical Phrasing',
    category: 'expression',
    prerequisites: ['crescendo-diminuendo', 'legato-technique'],
    targetExerciseIds: ['lesson-20-ex-07'],
    masteryThreshold: 0.75,
    description: 'Shaping musical phrases with dynamics and breathing',
    tier: 13,
    requiredCompletions: 3,
  },
  {
    id: 'expressive-songs',
    name: 'Expressive Songs',
    category: 'songs',
    prerequisites: ['phrasing', 'pedal-intro'],
    targetExerciseIds: ['lesson-20-ex-08'],
    masteryThreshold: 0.7,
    description: 'Songs with dynamic markings',
    tier: 13,
    requiredCompletions: 3,
  },

  // ── Tier 14: More Keys & Sight Reading (Lessons 21-22) ─────────────────
  {
    id: 'd-major-scale',
    name: 'D Major Scale',
    category: 'key-signatures',
    prerequisites: ['g-major-hands', 'sharp-notes-rh'],
    targetExerciseIds: ['lesson-21-ex-01', 'lesson-21-ex-02'],
    masteryThreshold: 0.75,
    description: 'D major scale with 2 sharps (F#, C#)',
    tier: 14,
    requiredCompletions: 3,
  },
  {
    id: 'bb-major-scale',
    name: 'Bb Major Scale',
    category: 'key-signatures',
    prerequisites: ['f-major-hands', 'flat-notes-lh'],
    targetExerciseIds: ['lesson-21-ex-03', 'lesson-21-ex-04'],
    masteryThreshold: 0.75,
    description: 'Bb major scale with 2 flats (Bb, Eb)',
    tier: 14,
    requiredCompletions: 3,
  },
  {
    id: 'relative-minor',
    name: 'Relative Minor',
    category: 'key-signatures',
    prerequisites: ['a-minor-natural', 'key-signature-reading'],
    targetExerciseIds: ['lesson-21-ex-05'],
    masteryThreshold: 0.7,
    description: 'Find the relative minor of any major key',
    tier: 14,
    requiredCompletions: 2,
  },
  {
    id: 'sight-reading-c',
    name: 'Sight Reading (C)',
    category: 'sight-reading',
    prerequisites: ['scale-review', 'rhythm-reading'],
    targetExerciseIds: ['lesson-22-ex-01', 'lesson-22-ex-02'],
    masteryThreshold: 0.7,
    description: 'Read and play C major melodies at sight',
    tier: 14,
    requiredCompletions: 3,
  },
  {
    id: 'sight-reading-g',
    name: 'Sight Reading (G)',
    category: 'sight-reading',
    prerequisites: ['sight-reading-c', 'g-major-melodies'],
    targetExerciseIds: ['lesson-22-ex-03'],
    masteryThreshold: 0.7,
    description: 'Read and play G major melodies at sight',
    tier: 14,
    requiredCompletions: 3,
  },
  {
    id: 'sight-reading-mixed',
    name: 'Sight Reading (Mixed)',
    category: 'sight-reading',
    prerequisites: ['sight-reading-g', 'f-major-hands'],
    targetExerciseIds: ['lesson-22-ex-04'],
    masteryThreshold: 0.75,
    description: 'Mixed-key sight reading exercises',
    tier: 14,
    requiredCompletions: 3,
  },
  {
    id: 'interval-recognition',
    name: 'Interval Recognition',
    category: 'intervals',
    prerequisites: ['minor-vs-major', 'sight-reading-c'],
    targetExerciseIds: ['lesson-22-ex-05'],
    masteryThreshold: 0.7,
    description: 'Identify 2nds, 3rds, 5ths, octaves by ear and on page',
    tier: 14,
    requiredCompletions: 2,
  },
  {
    id: 'key-fluency',
    name: 'Key Fluency',
    category: 'key-signatures',
    prerequisites: ['d-major-scale', 'bb-major-scale', 'relative-minor'],
    targetExerciseIds: ['lesson-12-ex-01', 'lesson-12-ex-02', 'lesson-12-ex-03'],
    masteryThreshold: 0.75,
    description: 'Quick key identification and modulation',
    tier: 14,
    requiredCompletions: 3,
  },

  // ── Tier 15: Performance & Intermediate Repertoire (Lessons 23-24) ─────
  {
    id: 'performance-prep',
    name: 'Performance Prep',
    category: 'expression',
    prerequisites: ['expressive-songs', 'sight-reading-mixed'],
    targetExerciseIds: ['lesson-23-ex-01'],
    masteryThreshold: 0.75,
    description: 'Playing through without stopping — performance mindset',
    tier: 15,
    requiredCompletions: 3,
  },
  {
    id: 'rubato-intro',
    name: 'Rubato',
    category: 'expression',
    prerequisites: ['phrasing', 'performance-prep'],
    targetExerciseIds: ['lesson-23-ex-02'],
    masteryThreshold: 0.7,
    description: 'Expressive timing flexibility',
    tier: 15,
    requiredCompletions: 3,
  },
  {
    id: 'intermediate-classical',
    name: 'Classical Pieces',
    category: 'songs',
    prerequisites: ['performance-prep', 'arpeggio-songs'],
    targetExerciseIds: ['lesson-23-ex-03'],
    masteryThreshold: 0.75,
    description: 'Minuet in G, Fur Elise intro',
    tier: 15,
    requiredCompletions: 3,
  },
  {
    id: 'intermediate-pop',
    name: 'Pop Arrangements',
    category: 'songs',
    prerequisites: ['performance-prep', 'chord-songs'],
    targetExerciseIds: ['lesson-23-ex-04'],
    masteryThreshold: 0.75,
    description: 'Let It Be, Imagine intro arrangements',
    tier: 15,
    requiredCompletions: 3,
  },
  {
    id: 'blues-scale',
    name: 'Blues Scale',
    category: 'scales',
    prerequisites: ['chromatic-scale', 'swing-rhythm'],
    targetExerciseIds: ['lesson-23-ex-05'],
    masteryThreshold: 0.75,
    description: 'Blues scale and basic improvisation',
    tier: 15,
    requiredCompletions: 3,
  },
  {
    id: 'full-piece-classical',
    name: 'Classical Performance',
    category: 'songs',
    prerequisites: ['intermediate-classical', 'rubato-intro'],
    targetExerciseIds: ['lesson-24-ex-01', 'lesson-24-ex-02'],
    masteryThreshold: 0.8,
    description: 'Complete classical piece performance',
    tier: 15,
    requiredCompletions: 5,
  },
  {
    id: 'full-piece-pop',
    name: 'Pop Performance',
    category: 'songs',
    prerequisites: ['intermediate-pop', 'pedal-intro'],
    targetExerciseIds: ['lesson-24-ex-03'],
    masteryThreshold: 0.8,
    description: 'Complete pop song arrangement',
    tier: 15,
    requiredCompletions: 5,
  },
  {
    id: 'repertoire-building',
    name: 'Repertoire Building',
    category: 'songs',
    prerequisites: ['full-piece-classical', 'full-piece-pop', 'blues-scale'],
    targetExerciseIds: ['lesson-24-ex-04'],
    masteryThreshold: 0.75,
    description: 'Building a performance set of 3+ pieces',
    tier: 15,
    requiredCompletions: 5,
  },
  {
    id: 'year-one-mastery',
    name: 'Year One Mastery',
    category: 'songs',
    prerequisites: ['repertoire-building', 'key-fluency', 'mixed-rhythms'],
    targetExerciseIds: ['lesson-24-ex-05'],
    masteryThreshold: 0.8,
    description: 'Comprehensive review of all Year One skills',
    tier: 15,
    requiredCompletions: 5,
  },
];

// ============================================================================
// Query Functions
// ============================================================================

/** Look up a skill node by ID. Returns null if not found. */
export function getSkillById(id: string): SkillNode | null {
  return SKILL_TREE.find((node) => node.id === id) ?? null;
}

/**
 * Return all skill nodes whose prerequisites have ALL been mastered.
 * If `masteredIds` is empty, returns root nodes (no prerequisites).
 */
export function getAvailableSkills(masteredIds: string[]): SkillNode[] {
  const masteredSet = new Set(masteredIds);
  return SKILL_TREE.filter(
    (node) =>
      !masteredSet.has(node.id) &&
      node.prerequisites.every((prereq) => masteredSet.has(prereq))
  );
}

/** Return all skill nodes that list a given exercise ID as a target. */
export function getSkillsForExercise(exerciseId: string): SkillNode[] {
  return SKILL_TREE.filter((node) =>
    node.targetExerciseIds.includes(exerciseId)
  );
}

/** Return all skill nodes in a given category. */
export function getSkillsByCategory(category: SkillCategory): SkillNode[] {
  return SKILL_TREE.filter((node) => node.category === category);
}

/**
 * Validate that the skill tree is a valid DAG (no cycles).
 * Returns true if valid, throws Error with cycle description if not.
 */
export function validateSkillTree(): boolean {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const nodeMap = new Map(SKILL_TREE.map((n) => [n.id, n]));

  function dfs(nodeId: string): void {
    if (inStack.has(nodeId)) {
      throw new Error(`Cycle detected involving skill: ${nodeId}`);
    }
    if (visited.has(nodeId)) return;

    inStack.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (node) {
      for (const prereq of node.prerequisites) {
        dfs(prereq);
      }
    }
    inStack.delete(nodeId);
    visited.add(nodeId);
  }

  for (const node of SKILL_TREE) {
    dfs(node.id);
  }
  return true;
}

/**
 * Return the topological depth of a skill node (longest path from a root).
 * Root nodes have depth 0.
 */
export function getSkillDepth(skillId: string): number {
  const nodeMap = new Map(SKILL_TREE.map((n) => [n.id, n]));
  const cache = new Map<string, number>();

  function depth(id: string): number {
    if (cache.has(id)) return cache.get(id)!;
    const node = nodeMap.get(id);
    if (!node || node.prerequisites.length === 0) {
      cache.set(id, 0);
      return 0;
    }
    const d = 1 + Math.max(...node.prerequisites.map(depth));
    cache.set(id, d);
    return d;
  }

  return depth(skillId);
}

/**
 * Return mastered skills where decay score has fallen below the threshold,
 * sorted by decay score ascending (worst first).
 *
 * Decay formula: decayScore = max(0, 1 - daysSince / DECAY_HALF_LIFE_DAYS)
 */
export function getSkillsNeedingReview(
  masteredSkills: string[],
  skillMasteryData: Record<string, SkillMasteryRecord>,
): SkillNode[] {
  const now = Date.now();
  const msPerDay = 86400000;

  return SKILL_TREE
    .filter((node) => {
      if (!masteredSkills.includes(node.id)) return false;
      const record = skillMasteryData[node.id];
      if (!record) return false;
      const daysSince = (now - record.lastPracticedAt) / msPerDay;
      const decay = Math.max(0, 1 - daysSince / DECAY_HALF_LIFE_DAYS);
      return decay < DECAY_THRESHOLD;
    })
    .sort((a, b) => {
      const decayA = skillMasteryData[a.id]?.lastPracticedAt ?? 0;
      const decayB = skillMasteryData[b.id]?.lastPracticedAt ?? 0;
      // Oldest practiced first (most decayed)
      return decayA - decayB;
    });
}

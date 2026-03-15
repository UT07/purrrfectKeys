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

/** Days of inactivity before applying gentler re-entry (slower tempo, easier exercises) */
export const GENTLE_REENTRY_DAYS = 7;

/** Factor to reduce difficulty on gentle re-entry (0.8 = 80% of normal tempo) */
export const GENTLE_REENTRY_FACTOR = 0.8;

/** Minimum mastery score (0-100) required to advance past each tier */
export const TIER_MASTERY_GATES: Record<number, number> = {
  1: 70,  // Tier 1 → 2: basic note finding
  2: 70,  // Tier 2 → 3: RH melodies
  3: 75,  // Tier 3 → 4: LH basics
  4: 75,  // Tier 4 → 5: both hands
  5: 80,  // Tier 5 → 6: scales/technique
  6: 80,  // Tier 6 → 7: black keys
  7: 80,  // Tier 7 → 8: G/F major
  8: 85,  // Tier 8 → 9: key signatures
  9: 85,  // Tier 9 → 10: minor keys
  10: 85, // Tier 10 → 11: chords
  11: 85, // Tier 11 → 12: rhythm
  12: 85, // Tier 12 → 13: arpeggios
  13: 90, // Tier 13 → 14: expression
  14: 90, // Tier 14 → 15: sight reading
};

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

/**
 * Hints passed to the AI exercise generator so it produces skill-appropriate content.
 * Each skill node has an entry in GENERATION_HINTS keyed by skill ID.
 */
export interface GenerationHints {
  keySignature?: string;
  targetMidi?: number[];
  hand?: 'left' | 'right' | 'both';
  exerciseTypes?: ('scale' | 'melody' | 'chord' | 'rhythm' | 'arpeggio')[];
  minDifficulty?: number;
  maxDifficulty?: number;
  promptHint: string;  // Goes directly into the Gemini prompt
}

/** Look up generation hints for a skill node. */
export function getGenerationHints(skillId: string): GenerationHints | null {
  return GENERATION_HINTS[skillId] ?? null;
}

// ============================================================================
// Generation Hints (per skill node — drives AI exercise content)
// ============================================================================

const GENERATION_HINTS: Record<string, GenerationHints> = {
  // ── Tier 1 ──
  'find-middle-c': { targetMidi: [60], hand: 'right', exerciseTypes: ['melody'], minDifficulty: 1, maxDifficulty: 1, promptHint: 'Play Middle C repeatedly with right hand thumb, 4-8 notes, very slow tempo 50-55 BPM' },
  'keyboard-geography': { targetMidi: [60, 62, 64, 65, 67], hand: 'right', keySignature: 'C major', exerciseTypes: ['melody'], minDifficulty: 1, maxDifficulty: 1, promptHint: 'Navigate white keys C4-G4 in simple patterns, quarter notes, tempo 50-55' },
  'white-keys': { targetMidi: [60, 62, 64, 65, 67, 69, 71, 72], hand: 'right', keySignature: 'C major', exerciseTypes: ['scale', 'melody'], minDifficulty: 1, maxDifficulty: 1, promptHint: 'Play all white keys in one octave C4-C5, ascending and descending, tempo 50-55' },

  // ── Tier 2 ──
  'rh-cde': { targetMidi: [60, 62, 64], hand: 'right', keySignature: 'C major', exerciseTypes: ['melody'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Ascending and descending C-D-E patterns, quarter notes, tempo 55-65' },
  'rh-cdefg': { targetMidi: [60, 62, 64, 65, 67], hand: 'right', keySignature: 'C major', exerciseTypes: ['melody', 'scale'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Five-finger C position (C-G) patterns and simple melodies, tempo 55-65' },
  'c-major-octave': { targetMidi: [60, 62, 64, 65, 67, 69, 71, 72], hand: 'right', keySignature: 'C major', exerciseTypes: ['scale'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Full C major scale ascending one octave, quarter notes, tempo 55-65' },
  'simple-melodies': { targetMidi: [60, 62, 64, 65, 67], hand: 'right', keySignature: 'C major', exerciseTypes: ['melody'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Simple recognizable melody using C-D-E-F-G, quarter and half notes, tempo 60-70' },
  'eighth-notes': { targetMidi: [60, 62, 64, 65, 67], hand: 'right', keySignature: 'C major', exerciseTypes: ['rhythm'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Eighth-note rhythms on C-D-E-F-G, mix of quarters and eighths, tempo 60-70' },
  'broken-chords-rh': { targetMidi: [60, 64, 67], hand: 'right', keySignature: 'C major', exerciseTypes: ['chord'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Broken C major chord (C-E-G) ascending/descending, quarter notes, tempo 55-65' },
  'c-position-review': { targetMidi: [60, 62, 64, 65, 67, 69, 71, 72], hand: 'right', keySignature: 'C major', exerciseTypes: ['melody', 'scale'], minDifficulty: 2, maxDifficulty: 2, promptHint: 'Review exercise combining scale passages and melodic patterns in C, tempo 65-75' },

  // ── Tier 3 ──
  'lh-c-position': { targetMidi: [48, 50, 52, 53, 55], hand: 'left', keySignature: 'C major', exerciseTypes: ['melody'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Left hand C position (C3-G3) simple patterns, quarter notes, tempo 50-60' },
  'lh-scale-descending': { targetMidi: [48, 50, 52, 53, 55, 57, 59, 60], hand: 'left', keySignature: 'C major', exerciseTypes: ['scale'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Descending C major scale with left hand from C4 to C3, tempo 50-60' },
  'bass-notes': { targetMidi: [36, 38, 40, 41, 43, 45, 47, 48], hand: 'left', keySignature: 'C major', exerciseTypes: ['melody'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Bass register notes C2-C3 with left hand, simple patterns, tempo 50-55' },
  'broken-chords-lh': { targetMidi: [48, 52, 55, 53, 57, 60], hand: 'left', keySignature: 'C major', exerciseTypes: ['chord'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Broken F chord (F-A-C) and C chord with left hand, tempo 55-65' },
  'steady-bass': { targetMidi: [48, 52, 55], hand: 'left', keySignature: 'C major', exerciseTypes: ['rhythm'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Steady bass rhythm pattern with quarter notes on C3, E3, G3, tempo 60-70' },

  // ── Tier 4 ──
  'hands-together-basic': { targetMidi: [48, 52, 55, 60, 62, 64], hand: 'both', keySignature: 'C major', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Simple melody in right hand (C-D-E) with bass notes in left (C3, G3), tempo 55-65' },
  'hands-melody-full': { targetMidi: [48, 52, 55, 60, 62, 64, 65, 67], hand: 'both', keySignature: 'C major', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Full two-hand melody like Mary Had a Little Lamb, simple bass accompaniment, tempo 60-70' },
  'hand-independence-drill': { targetMidi: [48, 50, 52, 60, 62, 64], hand: 'both', keySignature: 'C major', exerciseTypes: ['rhythm'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Different rhythms in each hand: right hand eighths while left plays quarters, tempo 60-70' },
  'blocked-chords': { targetMidi: [48, 52, 55, 53, 57, 60], hand: 'both', keySignature: 'C major', exerciseTypes: ['chord'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Blocked C and F major chords, both hands, half notes, tempo 55-65' },

  // ── Tier 5 ──
  'two-hand-songs': { targetMidi: [48, 52, 55, 60, 62, 64, 65, 67], hand: 'both', keySignature: 'C major', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Arranged song with melody in right hand and simple chord accompaniment in left, tempo 65-75' },
  'both-hands-review': { targetMidi: [48, 52, 55, 60, 62, 64, 65, 67], hand: 'both', keySignature: 'C major', exerciseTypes: ['melody', 'chord'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Comprehensive both-hands review combining melody, chords, and rhythm, tempo 65-75' },
  'scale-technique': { targetMidi: [60, 62, 64, 65, 67, 69, 71, 72], hand: 'right', keySignature: 'C major', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'C major scale with proper thumb-under technique, 2 octaves, tempo 65-80' },
  'parallel-scales': { targetMidi: [48, 50, 52, 53, 55, 60, 62, 64, 65, 67], hand: 'both', keySignature: 'C major', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'C major scale in parallel motion both hands, tempo 65-80' },

  // ── Tier 6 ──
  'scale-speed': { targetMidi: [60, 62, 64, 65, 67, 69, 71, 72], hand: 'right', keySignature: 'C major', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Fast C major scale with eighth notes, focus on evenness and speed, tempo 80-100' },
  'scale-review': { targetMidi: [48, 50, 52, 60, 62, 64, 65, 67, 69, 71, 72], hand: 'both', keySignature: 'C major', exerciseTypes: ['scale'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Comprehensive scale review: ascending/descending, both hands, varied rhythms, tempo 75-90' },
  'beginner-songs': { hand: 'both', keySignature: 'C major', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Well-known beginner song arrangement (Jingle Bells style) with both hands, tempo 70-85' },
  'intermediate-songs': { hand: 'both', keySignature: 'C major', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Intermediate song arrangement with melody, chords, and some passing tones, tempo 75-90' },

  // ── Tier 7 ──
  'find-black-keys': { targetMidi: [61, 63, 66, 68, 70], hand: 'right', exerciseTypes: ['melody'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Locate and play groups of 2 and 3 black keys, simple patterns, tempo 50-60' },
  'sharp-notes-rh': { targetMidi: [61, 63, 66, 68, 70], hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Play F#, C#, G# in melodic patterns with right hand, tempo 60-70' },
  'flat-notes-lh': { targetMidi: [46, 49, 51, 54, 56], hand: 'left', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Play Bb, Eb with left hand in simple patterns, tempo 55-65' },
  'chromatic-scale': { targetMidi: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72], hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Chromatic scale one octave C4-C5 ascending and descending, tempo 60-70' },
  'half-steps-whole-steps': { targetMidi: [60, 61, 62, 64], hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 2, promptHint: 'Patterns alternating half steps and whole steps to develop interval awareness, tempo 55-65' },
  'black-key-melodies': { targetMidi: [61, 63, 66, 68, 70], hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Pentatonic-style melody using only black keys, tempo 60-75' },

  // ── Tier 8 ──
  'g-major-scale-rh': { keySignature: 'G major', targetMidi: [67, 69, 71, 72, 74, 76, 78, 79], hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'G major scale right hand with F#, one octave, tempo 65-80' },
  'g-major-scale-lh': { keySignature: 'G major', targetMidi: [55, 57, 59, 60, 62, 64, 66, 67], hand: 'left', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'G major scale left hand, one octave, tempo 60-75' },
  'g-major-hands': { keySignature: 'G major', hand: 'both', exerciseTypes: ['scale'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'G major scale both hands in parallel, tempo 65-80' },
  'g-major-melodies': { keySignature: 'G major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Simple melody in G major with F# accidental, tempo 65-80' },
  'f-major-scale-rh': { keySignature: 'F major', targetMidi: [65, 67, 69, 70, 72, 74, 76, 77], hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'F major scale right hand with Bb, one octave, tempo 65-80' },
  'f-major-scale-lh': { keySignature: 'F major', hand: 'left', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'F major scale left hand, one octave, tempo 60-75' },
  'f-major-hands': { keySignature: 'F major', hand: 'both', exerciseTypes: ['scale'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'F major scale both hands together, tempo 65-80' },
  'key-signature-reading': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Melody that modulates between C, G, and F major to practice key signature reading, tempo 65-75' },

  // ── Tier 9 ──
  'a-minor-natural': { keySignature: 'A minor', targetMidi: [57, 59, 60, 62, 64, 65, 67, 69], hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'A natural minor scale (all white keys), one octave, tempo 60-75' },
  'a-minor-melodies': { keySignature: 'A minor', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Melody in A minor with expressive phrasing, tempo 65-75' },
  'd-minor-scale': { keySignature: 'D minor', hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'D natural minor scale with Bb, one octave, tempo 60-75' },
  'd-minor-melodies': { keySignature: 'D minor', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Melody in D minor, quarter and eighth notes, tempo 65-75' },
  'e-minor-scale': { keySignature: 'E minor', hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'E natural minor scale with F#, one octave, tempo 60-75' },
  'minor-vs-major': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 2, promptHint: 'Exercise comparing C major and A minor phrases side by side, tempo 60-70' },
  'harmonic-minor': { keySignature: 'A minor', targetMidi: [57, 59, 60, 62, 64, 65, 68, 69], hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'A harmonic minor scale with raised G#, one octave, tempo 60-75' },
  'minor-songs': { keySignature: 'A minor', hand: 'both', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Song in a minor key with simple left hand accompaniment, tempo 65-80' },

  // ── Tier 10 ──
  'major-triads-root': { keySignature: 'C major', hand: 'both', exerciseTypes: ['chord'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'C, F, G root position major triads, blocked and broken, tempo 60-75' },
  'minor-triads': { keySignature: 'A minor', hand: 'both', exerciseTypes: ['chord'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Am, Dm, Em minor triads, blocked and broken, tempo 60-75' },
  'chord-inversions-intro': { keySignature: 'C major', hand: 'right', exerciseTypes: ['chord'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'First and second inversions of C, F, G triads, tempo 55-70' },
  'progression-i-iv-v': { keySignature: 'C major', hand: 'both', exerciseTypes: ['chord'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'I-IV-V chord progression in C major (C-F-G), whole notes then half notes, tempo 60-75' },
  'progression-i-vi-iv-v': { keySignature: 'C major', hand: 'both', exerciseTypes: ['chord'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'I-vi-IV-V progression (C-Am-F-G) with smooth voice leading, tempo 65-80' },
  'progression-i-v-vi-iv': { keySignature: 'C major', hand: 'both', exerciseTypes: ['chord'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Axis of Awesome progression (C-G-Am-F) with bass in left hand, tempo 70-85' },
  'bass-chord-pattern': { keySignature: 'C major', hand: 'left', exerciseTypes: ['chord', 'rhythm'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Left hand broken chord accompaniment (bass-chord-chord pattern), tempo 65-80' },
  'alberti-bass': { keySignature: 'C major', hand: 'left', exerciseTypes: ['arpeggio'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Alberti bass pattern C-G-E-G in eighth notes, tempo 70-85' },
  'chord-songs': { keySignature: 'C major', hand: 'both', exerciseTypes: ['melody', 'chord'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Song with melody in right hand and chord accompaniment in left, tempo 70-85' },
  'chord-transitions': { keySignature: 'C major', hand: 'both', exerciseTypes: ['chord'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Smooth voice-leading transitions between inversions of C, F, G, Am, tempo 60-75' },

  // ── Tier 11 ──
  'dotted-quarter-notes': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Dotted quarter note rhythms (1.5 beats) mixed with eighths, tempo 65-80' },
  'syncopation-intro': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Off-beat accents and syncopated rhythms, tempo 70-85' },
  'triplet-rhythm': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Triplet eighth note groups mixed with regular eighths, tempo 65-80' },
  '3-4-time': { keySignature: 'C major', hand: 'both', exerciseTypes: ['rhythm', 'melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Waltz-time melody in 3/4, quarter notes with left hand on beat 1, tempo 80-100' },
  '6-8-time': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Compound meter 6/8, two groups of three eighth notes per bar, tempo 45-55 (dotted quarter)' },
  'ties-across-barline': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Notes tied across bar lines creating held notes, tempo 65-80' },
  'swing-rhythm': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm', 'melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Swing eighth notes (long-short feel) in a bluesy melody, tempo 80-100' },
  'rhythm-reading': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Mixed rhythm patterns: quarters, eighths, dotted notes on simple melodies, tempo 70-85' },
  'mixed-rhythms': { keySignature: 'C major', hand: 'both', exerciseTypes: ['rhythm', 'melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Combined rhythm types: syncopation, triplets, dotted notes in one exercise, tempo 75-90' },

  // ── Tier 12 ──
  'c-major-arpeggio': { keySignature: 'C major', hand: 'right', exerciseTypes: ['arpeggio'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'C major arpeggio across 2 octaves, ascending and descending, tempo 65-85' },
  'g-major-arpeggio': { keySignature: 'G major', hand: 'right', exerciseTypes: ['arpeggio'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'G major arpeggio across 2 octaves, tempo 65-85' },
  'minor-arpeggios': { keySignature: 'A minor', hand: 'right', exerciseTypes: ['arpeggio'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Am and Dm arpeggios across 2 octaves, tempo 65-80' },
  'arpeggio-patterns': { keySignature: 'C major', hand: 'right', exerciseTypes: ['arpeggio'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Accompaniment arpeggio patterns (1-3-5-8 and variations), tempo 70-85' },
  'broken-chord-patterns': { keySignature: 'C major', hand: 'left', exerciseTypes: ['arpeggio', 'chord'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Waltz bass and stride patterns in left hand, tempo 75-90' },
  'hands-arpeggio': { keySignature: 'C major', hand: 'both', exerciseTypes: ['arpeggio'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Arpeggios both hands in parallel motion across 2 octaves, tempo 65-85' },
  'arpeggio-songs': { keySignature: 'C major', hand: 'both', exerciseTypes: ['arpeggio', 'melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Song using arpeggio patterns for accompaniment with melody on top, tempo 70-85' },

  // ── Tier 13 ──
  'dynamics-p-f': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Melody alternating between piano (soft) and forte (loud) sections, tempo 65-80' },
  'crescendo-diminuendo': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody', 'scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Scale passage with crescendo up and diminuendo down, tempo 65-80' },
  'staccato-technique': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Short detached staccato notes in a bouncy melody, tempo 70-85' },
  'legato-technique': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Smooth connected legato melody requiring finger overlap, tempo 60-75' },
  'accents-emphasis': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm', 'melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Melody with accented notes on specific beats, tempo 70-85' },
  'pedal-intro': { keySignature: 'C major', hand: 'both', exerciseTypes: ['chord', 'melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Simple chord changes requiring sustain pedal for smooth transitions, tempo 60-75' },
  'phrasing': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Musical phrase with breathing points, dynamics shaping, and direction, tempo 65-80' },
  'expressive-songs': { keySignature: 'C major', hand: 'both', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Expressive song with dynamic markings, legato phrases, and pedal, tempo 65-80' },

  // ── Tier 14 ──
  'd-major-scale': { keySignature: 'D major', hand: 'both', exerciseTypes: ['scale'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'D major scale with F# and C#, both hands, tempo 65-85' },
  'bb-major-scale': { keySignature: 'Bb major', hand: 'both', exerciseTypes: ['scale'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Bb major scale with Bb and Eb, both hands, tempo 65-85' },
  'relative-minor': { keySignature: 'A minor', hand: 'right', exerciseTypes: ['scale', 'melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Exercise switching between C major and its relative A minor, tempo 65-75' },
  'sight-reading-c': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'New melody in C major for sight reading practice, simple rhythm, tempo 55-70' },
  'sight-reading-g': { keySignature: 'G major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'New melody in G major for sight reading, remember F#, tempo 55-70' },
  'sight-reading-mixed': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Sight reading exercise that switches between C, G, and F major sections, tempo 55-70' },
  'interval-recognition': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Melodic intervals: 2nds, 3rds, 5ths, octaves in sequence, tempo 55-70' },
  'key-fluency': { hand: 'both', exerciseTypes: ['scale', 'melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Quick key changes between D major, Bb major, and their relative minors, tempo 70-85' },

  // ── Tier 15 ──
  'performance-prep': { hand: 'both', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Complete piece to play through without stopping, mixed dynamics and rhythms, tempo 70-90' },
  'rubato-intro': { hand: 'right', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Expressive melody with rubato markings — flexible timing within phrases, tempo 60-75' },
  'intermediate-classical': { hand: 'both', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Classical-style piece (minuet or sonatina), both hands, with ornamentation, tempo 75-95' },
  'intermediate-pop': { hand: 'both', exerciseTypes: ['melody', 'chord'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Pop song arrangement with melody, chord patterns, and pedal, tempo 75-95' },
  'blues-scale': { keySignature: 'C major', hand: 'right', exerciseTypes: ['scale', 'melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'C blues scale (C-Eb-F-Gb-G-Bb) with swing feel, tempo 80-100' },
  'full-piece-classical': { hand: 'both', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Complete classical piece performance with dynamics, phrasing, and pedal, tempo 75-100' },
  'full-piece-pop': { hand: 'both', exerciseTypes: ['melody', 'chord'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Complete pop song with verse/chorus structure, chord patterns, tempo 80-100' },
  'repertoire-building': { hand: 'both', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Mixed-style piece combining classical and pop elements, tempo 75-95' },
  'year-one-mastery': { hand: 'both', exerciseTypes: ['melody', 'scale', 'chord', 'arpeggio'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Comprehensive review piece testing scales, chords, arpeggios, dynamics, and both hands, tempo 80-100' },

  // ── Tier 16 ──
  'e-major-scale': { targetMidi: [64, 66, 68, 69, 71, 73, 75, 76], hand: 'both', keySignature: 'E major', exerciseTypes: ['scale', 'melody'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'E major scale (F#, G#, C#, D#) both hands, tempo 70-90' },
  'a-major-scale': { targetMidi: [57, 59, 61, 62, 64, 66, 68, 69], hand: 'both', keySignature: 'A major', exerciseTypes: ['scale', 'melody'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'A major scale (F#, C#, G#) both hands, tempo 70-90' },
  'eb-major-scale': { targetMidi: [63, 65, 67, 68, 70, 72, 74, 75], hand: 'both', keySignature: 'Eb major', exerciseTypes: ['scale', 'melody'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'Eb major scale (Bb, Eb, Ab) both hands, tempo 70-90' },
  'modulation-technique': { hand: 'both', exerciseTypes: ['melody', 'chord'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'Piece that modulates between keys using pivot chords, tempo 75-90' },
  'relative-key-fluency': { hand: 'both', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'Melody that switches between relative major and minor keys, tempo 70-85' },

  // ── Tier 17 ──
  'seventh-chords': { hand: 'both', exerciseTypes: ['chord'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'Major 7th, minor 7th, dominant 7th chords — blocked and arpeggiated, tempo 65-80' },
  'sus-and-add-chords': { hand: 'both', exerciseTypes: ['chord'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'Sus2, sus4, and add9 chords in progressions, tempo 65-80' },
  'advanced-progressions': { hand: 'both', exerciseTypes: ['chord', 'melody'], minDifficulty: 4, maxDifficulty: 5, promptHint: 'Jazz ii-V-I, circle of fifths, modal interchange progressions with both hands, tempo 70-90' },
  'comping-patterns': { hand: 'both', exerciseTypes: ['chord', 'rhythm'], minDifficulty: 3, maxDifficulty: 5, promptHint: 'Rhythmic accompaniment patterns: pop comping, jazz voicings, ballad arpeggio, tempo 70-95' },
  'compound-time': { hand: 'both', exerciseTypes: ['melody', 'rhythm'], minDifficulty: 3, maxDifficulty: 4, promptHint: '6/8 or 12/8 time signature melodies with flowing triplet subdivision, tempo 60-80' },
  'swing-and-shuffle': { hand: 'both', exerciseTypes: ['melody', 'rhythm'], minDifficulty: 3, maxDifficulty: 5, promptHint: 'Swing eighth notes, shuffle bass patterns, boogie-woogie left hand, tempo 80-120' },
  'cross-rhythms': { hand: 'both', exerciseTypes: ['rhythm'], minDifficulty: 4, maxDifficulty: 5, promptHint: '3 against 2 and 4 against 3 polyrhythms between hands, tempo 60-80' },
  'mixed-meter': { hand: 'both', exerciseTypes: ['rhythm', 'melody'], minDifficulty: 4, maxDifficulty: 5, promptHint: 'Pieces in 5/4, 7/8, or alternating time signatures, tempo 70-90' },

  // ── Tier 18 ──
  'baroque-repertoire': { hand: 'both', exerciseTypes: ['melody'], minDifficulty: 4, maxDifficulty: 5, promptHint: 'Bach-style inventions, minuets, or dance movements with counterpoint, tempo 70-100' },
  'romantic-repertoire': { hand: 'both', exerciseTypes: ['melody'], minDifficulty: 4, maxDifficulty: 5, promptHint: 'Romantic-era character pieces with rubato, dynamics, pedaling, tempo 60-90' },
  'contemporary-repertoire': { hand: 'both', exerciseTypes: ['melody', 'chord'], minDifficulty: 4, maxDifficulty: 5, promptHint: 'Modern minimalist or atmospheric pieces with sustained chords and patterns, tempo 60-85' },
  'film-score-performance': { hand: 'both', exerciseTypes: ['melody', 'chord'], minDifficulty: 4, maxDifficulty: 5, promptHint: 'Dramatic film score arrangement with pedal, dynamics, and climactic build, tempo 60-90' },
  'advanced-sight-reading': { hand: 'both', exerciseTypes: ['melody'], minDifficulty: 4, maxDifficulty: 5, promptHint: 'Sight-reading exercise in sharp or flat keys with varied rhythms, both hands, tempo 65-85' },
  'improvisation-basics': { hand: 'both', keySignature: 'C major', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 5, promptHint: 'Guided improvisation: blues scale or pentatonic melody over simple chord progression, tempo 70-90' },
  'year-two-mastery': { hand: 'both', exerciseTypes: ['melody', 'scale', 'chord', 'arpeggio'], minDifficulty: 4, maxDifficulty: 5, promptHint: 'Advanced capstone piece: multiple keys, chord voicings, mixed rhythms, dynamics, both hands, tempo 80-110' },
};

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

  // ── Tier 6: Black Keys & Sharps/Flats (Lesson 7) ────────────────────────
  {
    id: 'find-black-keys',
    name: 'Find Black Keys',
    category: 'black-keys',
    prerequisites: ['white-keys'],
    targetExerciseIds: ['lesson-07-ex-01'],
    masteryThreshold: 0.7,
    description: 'Locate groups of 2 and 3 black keys',
    tier: 6,
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
    tier: 6,
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
    tier: 6,
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
    tier: 6,
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
    tier: 6,
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
    tier: 6,
    requiredCompletions: 2,
  },

  // ── Tier 7: G Major & F Major (Lessons 8-9) ─────────────────────────────
  {
    id: 'g-major-scale-rh',
    name: 'G Major Scale (RH)',
    category: 'key-signatures',
    prerequisites: ['half-steps-whole-steps', 'scale-technique'],
    targetExerciseIds: ['lesson-08-ex-01'],
    masteryThreshold: 0.75,
    description: 'G major scale right hand with F#',
    tier: 7,
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
    tier: 7,
    requiredCompletions: 2,
  },
  {
    id: 'g-major-hands',
    name: 'G Major Both Hands',
    category: 'key-signatures',
    prerequisites: ['g-major-scale-lh', 'hands-together-basic'],
    targetExerciseIds: ['lesson-08-ex-03', 'lesson-37-ex-02', 'lesson-37-ex-08'],
    masteryThreshold: 0.75,
    description: 'G major scale both hands together',
    tier: 7,
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
    tier: 7,
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
    tier: 7,
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
    tier: 7,
    requiredCompletions: 2,
  },
  {
    id: 'f-major-hands',
    name: 'F Major Both Hands',
    category: 'key-signatures',
    prerequisites: ['f-major-scale-lh', 'hands-together-basic'],
    targetExerciseIds: ['lesson-09-ex-03', 'lesson-37-ex-03', 'lesson-37-ex-09'],
    masteryThreshold: 0.75,
    description: 'F major scale both hands together',
    tier: 7,
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
    tier: 7,
    requiredCompletions: 2,
  },

  // ── Tier 8: Minor Keys (Lessons 10-11) ───────────────────────────────────
  {
    id: 'a-minor-natural',
    name: 'A Natural Minor',
    category: 'scales',
    prerequisites: ['scale-technique', 'key-signature-reading'],
    targetExerciseIds: ['lesson-10-ex-01'],
    masteryThreshold: 0.75,
    description: 'A natural minor scale (all white keys)',
    tier: 8,
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
    tier: 8,
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
    tier: 8,
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
    tier: 8,
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
    tier: 8,
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
    tier: 8,
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
    tier: 8,
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
    tier: 8,
    requiredCompletions: 2,
  },

  // ── Tier 9: Chord Progressions (Lessons 13-15) ─────────────────────────
  {
    id: 'major-triads-root',
    name: 'Major Triads (Root)',
    category: 'chords',
    prerequisites: ['blocked-chords', 'key-signature-reading'],
    targetExerciseIds: ['lesson-13-ex-01', 'lesson-25-ex-04', 'lesson-25-ex-09', 'lesson-25-ex-14', 'lesson-25-test'],
    masteryThreshold: 0.75,
    description: 'Play C, F, G root position major triads',
    tier: 9,
    requiredCompletions: 3,
  },
  {
    id: 'minor-triads',
    name: 'Minor Triads',
    category: 'chords',
    prerequisites: ['major-triads-root', 'a-minor-natural'],
    targetExerciseIds: ['lesson-13-ex-02', 'lesson-25-ex-05', 'lesson-25-ex-10', 'lesson-25-ex-15'],
    masteryThreshold: 0.75,
    description: 'Play Am, Dm, Em minor triads',
    tier: 9,
    requiredCompletions: 3,
  },
  {
    id: 'chord-inversions-intro',
    name: 'Chord Inversions',
    category: 'chords',
    prerequisites: ['major-triads-root'],
    targetExerciseIds: ['lesson-13-ex-03', 'lesson-38-ex-04', 'lesson-38-ex-09'],
    masteryThreshold: 0.75,
    description: 'First inversion of major and minor triads',
    tier: 9,
    requiredCompletions: 3,
  },
  {
    id: 'progression-i-iv-v',
    name: 'I-IV-V Progression',
    category: 'chords',
    prerequisites: ['major-triads-root'],
    targetExerciseIds: ['lesson-13-ex-04', 'lesson-14-ex-01', 'lesson-25-ex-01', 'lesson-25-ex-06', 'lesson-25-ex-11', 'lesson-25-ex-16', 'lesson-38-ex-02', 'lesson-38-ex-07', 'lesson-38-ex-12'],
    masteryThreshold: 0.75,
    description: 'Classic I-IV-V chord progression in C major',
    tier: 9,
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
    tier: 9,
    requiredCompletions: 3,
  },
  {
    id: 'progression-i-v-vi-iv',
    name: 'I-V-vi-IV (Axis)',
    category: 'chords',
    prerequisites: ['progression-i-iv-v', 'minor-triads'],
    targetExerciseIds: ['lesson-14-ex-03', 'lesson-25-ex-02', 'lesson-25-ex-07', 'lesson-25-ex-12', 'lesson-25-ex-17', 'lesson-38-ex-03', 'lesson-38-ex-08', 'lesson-38-test'],
    masteryThreshold: 0.75,
    description: 'Modern pop "Axis" progression',
    tier: 9,
    requiredCompletions: 3,
  },
  {
    id: 'bass-chord-pattern',
    name: 'Bass-Chord Pattern',
    category: 'hand-independence',
    prerequisites: ['progression-i-iv-v', 'steady-bass'],
    targetExerciseIds: ['lesson-14-ex-04', 'lesson-26-ex-02', 'lesson-26-ex-06', 'lesson-26-ex-10', 'lesson-26-ex-14', 'lesson-26-ex-18'],
    masteryThreshold: 0.75,
    description: 'Left hand broken chord accompaniment pattern',
    tier: 9,
    requiredCompletions: 3,
  },
  {
    id: 'alberti-bass',
    name: 'Alberti Bass',
    category: 'hand-independence',
    prerequisites: ['bass-chord-pattern'],
    targetExerciseIds: ['lesson-14-ex-05', 'lesson-26-ex-01', 'lesson-26-ex-05', 'lesson-26-ex-09', 'lesson-26-ex-13', 'lesson-26-ex-17', 'lesson-38-ex-05', 'lesson-38-ex-10'],
    masteryThreshold: 0.75,
    description: 'Alberti bass pattern (C-G-E-G)',
    tier: 9,
    requiredCompletions: 3,
  },
  {
    id: 'chord-songs',
    name: 'Chord Songs',
    category: 'songs',
    prerequisites: ['progression-i-v-vi-iv', 'bass-chord-pattern'],
    targetExerciseIds: ['lesson-15-ex-01', 'lesson-15-ex-02', 'lesson-26-ex-04', 'lesson-26-ex-08', 'lesson-26-ex-12', 'lesson-26-ex-16'],
    masteryThreshold: 0.7,
    description: 'Songs with chord accompaniment',
    tier: 9,
    requiredCompletions: 3,
  },
  {
    id: 'chord-transitions',
    name: 'Chord Transitions',
    category: 'chords',
    prerequisites: ['chord-inversions-intro', 'progression-i-vi-iv-v'],
    targetExerciseIds: ['lesson-15-ex-03', 'lesson-15-ex-04', 'lesson-15-ex-05', 'lesson-25-ex-03', 'lesson-25-ex-08', 'lesson-25-ex-13', 'lesson-25-ex-18', 'lesson-31-ex-03', 'lesson-31-ex-07', 'lesson-31-ex-11', 'lesson-31-ex-15', 'lesson-31-test', 'lesson-38-ex-01', 'lesson-38-ex-06', 'lesson-38-ex-11'],
    masteryThreshold: 0.75,
    description: 'Smooth voice-leading transitions between chords',
    tier: 9,
    requiredCompletions: 3,
  },

  // ── Tier 10: Popular Songs (Lesson 6) ───────────────────────────────────
  {
    id: 'beginner-songs',
    name: 'Beginner Songs',
    category: 'songs',
    prerequisites: ['both-hands-review'],
    targetExerciseIds: ['lesson-06-ex-01', 'lesson-06-ex-02'],
    masteryThreshold: 0.7,
    description: 'Play well-known songs (Jingle Bells, Happy Birthday)',
    tier: 10,
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
    tier: 10,
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
    tier: 10,
    requiredCompletions: 2,
  },
  {
    id: 'scale-review',
    name: 'Scale Review',
    category: 'scales',
    prerequisites: ['scale-speed'],
    targetExerciseIds: ['lesson-05-ex-04', 'lesson-37-ex-01', 'lesson-37-ex-07', 'lesson-37-test'],
    masteryThreshold: 0.8,
    description: 'Comprehensive scale technique review',
    tier: 10,
    requiredCompletions: 2,
  },

  // ── Tier 11: Advanced Rhythm (Lessons 16-18) ────────────────────────────
  {
    id: 'dotted-quarter-notes',
    name: 'Dotted Quarters',
    category: 'rhythm',
    prerequisites: ['eighth-notes', 'key-signature-reading'],
    targetExerciseIds: ['lesson-16-ex-01', 'lesson-28-ex-04', 'lesson-28-ex-08', 'lesson-28-ex-12', 'lesson-28-ex-16'],
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
    targetExerciseIds: ['lesson-16-ex-02', 'lesson-16-ex-03', 'lesson-27-ex-01', 'lesson-27-ex-06', 'lesson-27-ex-11', 'lesson-27-ex-16'],
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
    targetExerciseIds: ['lesson-17-ex-01', 'lesson-27-ex-04', 'lesson-27-ex-09', 'lesson-27-ex-14', 'lesson-27-test'],
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
    targetExerciseIds: ['lesson-17-ex-02', 'lesson-17-ex-03', 'lesson-28-ex-02', 'lesson-28-ex-06', 'lesson-28-ex-10', 'lesson-28-ex-14', 'lesson-28-ex-18'],
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
    targetExerciseIds: ['lesson-17-ex-04', 'lesson-28-ex-01', 'lesson-28-ex-05', 'lesson-28-ex-09', 'lesson-28-ex-13', 'lesson-28-ex-17'],
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
    targetExerciseIds: ['lesson-16-ex-04', 'lesson-28-ex-03', 'lesson-28-ex-07', 'lesson-28-ex-11', 'lesson-28-ex-15', 'lesson-28-test'],
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
    targetExerciseIds: ['lesson-18-ex-01', 'lesson-27-ex-02', 'lesson-27-ex-07', 'lesson-27-ex-12', 'lesson-27-ex-17'],
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
    targetExerciseIds: ['lesson-18-ex-02', 'lesson-18-ex-03', 'lesson-27-ex-05', 'lesson-27-ex-10', 'lesson-27-ex-15'],
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
    targetExerciseIds: ['lesson-18-ex-04', 'lesson-18-ex-05', 'lesson-27-ex-03', 'lesson-27-ex-08', 'lesson-27-ex-13', 'lesson-27-ex-18', 'lesson-39-ex-01', 'lesson-39-ex-06', 'lesson-39-ex-11'],
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
    targetExerciseIds: ['lesson-19-ex-01', 'lesson-29-ex-01', 'lesson-29-ex-06', 'lesson-29-ex-11', 'lesson-29-ex-16'],
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
    targetExerciseIds: ['lesson-19-ex-02', 'lesson-29-ex-02', 'lesson-29-ex-07', 'lesson-29-ex-12', 'lesson-29-ex-17'],
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
    targetExerciseIds: ['lesson-19-ex-03', 'lesson-29-ex-03', 'lesson-29-ex-08', 'lesson-29-ex-13', 'lesson-29-ex-18'],
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
    targetExerciseIds: ['lesson-19-ex-04', 'lesson-29-ex-04', 'lesson-29-ex-09', 'lesson-29-ex-14', 'lesson-29-test'],
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
    targetExerciseIds: ['lesson-19-ex-05', 'lesson-26-ex-03', 'lesson-26-ex-07', 'lesson-26-ex-11', 'lesson-26-ex-15', 'lesson-26-test'],
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
    targetExerciseIds: ['lesson-19-ex-06', 'lesson-29-ex-05', 'lesson-29-ex-10', 'lesson-29-ex-15'],
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
    targetExerciseIds: ['lesson-20-ex-01', 'lesson-30-ex-01', 'lesson-30-ex-07', 'lesson-30-ex-13', 'lesson-30-test', 'lesson-39-ex-02', 'lesson-39-ex-07', 'lesson-39-ex-12'],
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
    targetExerciseIds: ['lesson-20-ex-02', 'lesson-30-ex-02', 'lesson-30-ex-08', 'lesson-30-ex-14'],
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
    targetExerciseIds: ['lesson-20-ex-03', 'lesson-30-ex-03', 'lesson-30-ex-09', 'lesson-30-ex-15'],
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
    targetExerciseIds: ['lesson-20-ex-04', 'lesson-30-ex-04', 'lesson-30-ex-10', 'lesson-30-ex-16', 'lesson-31-ex-02', 'lesson-31-ex-06', 'lesson-31-ex-10', 'lesson-31-ex-14', 'lesson-31-ex-18'],
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
    targetExerciseIds: ['lesson-20-ex-05', 'lesson-30-ex-05', 'lesson-30-ex-11', 'lesson-30-ex-17'],
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
    targetExerciseIds: ['lesson-20-ex-06', 'lesson-31-ex-01', 'lesson-31-ex-05', 'lesson-31-ex-09', 'lesson-31-ex-13', 'lesson-31-ex-17', 'lesson-39-ex-04', 'lesson-39-ex-09'],
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
    targetExerciseIds: ['lesson-20-ex-07', 'lesson-30-ex-06', 'lesson-30-ex-12', 'lesson-30-ex-18', 'lesson-39-ex-03', 'lesson-39-ex-08', 'lesson-39-test'],
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
    targetExerciseIds: ['lesson-20-ex-08', 'lesson-31-ex-04', 'lesson-31-ex-08', 'lesson-31-ex-12', 'lesson-31-ex-16'],
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
    targetExerciseIds: ['lesson-21-ex-01', 'lesson-21-ex-02', 'lesson-32-ex-01', 'lesson-32-ex-05', 'lesson-32-ex-09', 'lesson-32-ex-13', 'lesson-32-ex-17', 'lesson-37-ex-04', 'lesson-37-ex-10'],
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
    targetExerciseIds: ['lesson-21-ex-03', 'lesson-21-ex-04', 'lesson-32-ex-02', 'lesson-32-ex-06', 'lesson-32-ex-10', 'lesson-32-ex-14', 'lesson-32-ex-18', 'lesson-37-ex-05', 'lesson-37-ex-11'],
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
    targetExerciseIds: ['lesson-21-ex-05', 'lesson-32-ex-04', 'lesson-32-ex-08', 'lesson-32-ex-12', 'lesson-32-ex-16'],
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
    targetExerciseIds: ['lesson-22-ex-01', 'lesson-22-ex-02', 'lesson-33-ex-01', 'lesson-33-ex-05', 'lesson-33-ex-09', 'lesson-33-ex-13', 'lesson-33-ex-17'],
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
    targetExerciseIds: ['lesson-22-ex-03', 'lesson-33-ex-02', 'lesson-33-ex-06', 'lesson-33-ex-10', 'lesson-33-ex-14', 'lesson-33-ex-18'],
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
    targetExerciseIds: ['lesson-22-ex-04', 'lesson-33-ex-03', 'lesson-33-ex-07', 'lesson-33-ex-11', 'lesson-33-ex-15', 'lesson-33-test'],
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
    targetExerciseIds: ['lesson-22-ex-05', 'lesson-33-ex-04', 'lesson-33-ex-08', 'lesson-33-ex-12', 'lesson-33-ex-16'],
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
    targetExerciseIds: ['lesson-12-ex-01', 'lesson-12-ex-02', 'lesson-12-ex-03', 'lesson-32-ex-03', 'lesson-32-ex-07', 'lesson-32-ex-11', 'lesson-32-ex-15', 'lesson-32-test', 'lesson-36-ex-04', 'lesson-36-ex-08', 'lesson-36-ex-12', 'lesson-36-ex-16', 'lesson-37-ex-06', 'lesson-37-ex-12'],
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
    targetExerciseIds: ['lesson-23-ex-01', 'lesson-34-ex-02', 'lesson-34-ex-06', 'lesson-34-ex-10', 'lesson-34-ex-14', 'lesson-34-ex-18', 'lesson-40-ex-05', 'lesson-40-ex-10'],
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
    targetExerciseIds: ['lesson-23-ex-02', 'lesson-34-ex-03', 'lesson-34-ex-07', 'lesson-34-ex-11', 'lesson-34-ex-15', 'lesson-34-test', 'lesson-39-ex-05', 'lesson-39-ex-10'],
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
    targetExerciseIds: ['lesson-23-ex-03', 'lesson-35-ex-03', 'lesson-35-ex-07', 'lesson-35-ex-11', 'lesson-35-ex-15', 'lesson-35-test'],
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
    targetExerciseIds: ['lesson-23-ex-04', 'lesson-35-ex-02', 'lesson-35-ex-06', 'lesson-35-ex-10', 'lesson-35-ex-14', 'lesson-35-ex-18'],
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
    targetExerciseIds: ['lesson-23-ex-05', 'lesson-35-ex-04', 'lesson-35-ex-08', 'lesson-35-ex-12', 'lesson-35-ex-16', 'lesson-36-ex-01', 'lesson-36-ex-05', 'lesson-36-ex-09', 'lesson-36-ex-13', 'lesson-36-ex-17'],
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
    targetExerciseIds: ['lesson-24-ex-01', 'lesson-24-ex-02', 'lesson-34-ex-01', 'lesson-34-ex-05', 'lesson-34-ex-09', 'lesson-34-ex-13', 'lesson-34-ex-17', 'lesson-40-ex-02', 'lesson-40-ex-07', 'lesson-40-ex-12'],
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
    targetExerciseIds: ['lesson-24-ex-03', 'lesson-35-ex-01', 'lesson-35-ex-05', 'lesson-35-ex-09', 'lesson-35-ex-13', 'lesson-35-ex-17', 'lesson-40-ex-03', 'lesson-40-ex-08', 'lesson-40-test'],
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
    targetExerciseIds: ['lesson-24-ex-04', 'lesson-34-ex-04', 'lesson-34-ex-08', 'lesson-34-ex-12', 'lesson-34-ex-16', 'lesson-36-ex-03', 'lesson-36-ex-07', 'lesson-36-ex-11', 'lesson-36-ex-15', 'lesson-36-test', 'lesson-40-ex-04', 'lesson-40-ex-09'],
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
    targetExerciseIds: ['lesson-24-ex-05', 'lesson-36-ex-02', 'lesson-36-ex-06', 'lesson-36-ex-10', 'lesson-36-ex-14', 'lesson-36-ex-18', 'lesson-40-ex-01', 'lesson-40-ex-06', 'lesson-40-ex-11'],
    masteryThreshold: 0.8,
    description: 'Comprehensive review of all Year One skills',
    tier: 15,
    requiredCompletions: 5,
  },

  // ── Tier 16: Advanced Keys & Modulation (Lessons 41-42) ─────────────────
  {
    id: 'e-major-scale',
    name: 'E Major Scale',
    category: 'scales',
    prerequisites: ['g-major-hands', 'f-major-hands'],
    targetExerciseIds: ['lesson-41-ex-01', 'lesson-41-ex-02', 'lesson-41-ex-03'],
    masteryThreshold: 0.75,
    description: 'E major scale with 4 sharps — both hands',
    tier: 16,
    requiredCompletions: 3,
  },
  {
    id: 'a-major-scale',
    name: 'A Major Scale',
    category: 'scales',
    prerequisites: ['e-major-scale'],
    targetExerciseIds: ['lesson-41-ex-04', 'lesson-41-ex-05', 'lesson-41-ex-06'],
    masteryThreshold: 0.75,
    description: 'A major scale with 3 sharps — both hands',
    tier: 16,
    requiredCompletions: 3,
  },
  {
    id: 'eb-major-scale',
    name: 'Eb Major Scale',
    category: 'scales',
    prerequisites: ['bb-major-scale'],
    targetExerciseIds: ['lesson-41-ex-07', 'lesson-41-ex-08', 'lesson-41-ex-09'],
    masteryThreshold: 0.75,
    description: 'Eb major scale with 3 flats — both hands',
    tier: 16,
    requiredCompletions: 3,
  },
  {
    id: 'modulation-technique',
    name: 'Key Changes',
    category: 'intervals',
    prerequisites: ['key-fluency', 'e-major-scale', 'eb-major-scale'],
    targetExerciseIds: ['lesson-42-ex-01', 'lesson-42-ex-02', 'lesson-42-ex-03', 'lesson-42-ex-04'],
    masteryThreshold: 0.75,
    description: 'Smooth key changes using pivot chords and common tones',
    tier: 16,
    requiredCompletions: 3,
  },
  {
    id: 'relative-key-fluency',
    name: 'Relative Key Fluency',
    category: 'intervals',
    prerequisites: ['relative-minor', 'modulation-technique'],
    targetExerciseIds: ['lesson-42-ex-05', 'lesson-42-ex-06', 'lesson-42-ex-07', 'lesson-42-ex-08', 'lesson-42-ex-09'],
    masteryThreshold: 0.75,
    description: 'Navigate between relative major and minor keys fluently',
    tier: 16,
    requiredCompletions: 3,
  },

  // ── Tier 17: Advanced Chords & Rhythm (Lessons 43-46) ───────────────────
  {
    id: 'seventh-chords',
    name: 'Seventh Chords',
    category: 'chords',
    prerequisites: ['chord-inversions-intro', 'progression-i-v-vi-iv'],
    targetExerciseIds: ['lesson-43-ex-01', 'lesson-43-ex-02', 'lesson-43-ex-03', 'lesson-43-ex-04'],
    masteryThreshold: 0.75,
    description: 'Major 7th, minor 7th, and dominant 7th chords',
    tier: 17,
    requiredCompletions: 3,
  },
  {
    id: 'sus-and-add-chords',
    name: 'Sus & Add Chords',
    category: 'chords',
    prerequisites: ['seventh-chords'],
    targetExerciseIds: ['lesson-43-ex-05', 'lesson-43-ex-06', 'lesson-43-ex-07'],
    masteryThreshold: 0.75,
    description: 'Suspended 2nd, suspended 4th, and add9 chords',
    tier: 17,
    requiredCompletions: 3,
  },
  {
    id: 'advanced-progressions',
    name: 'Advanced Progressions',
    category: 'chords',
    prerequisites: ['seventh-chords', 'sus-and-add-chords'],
    targetExerciseIds: ['lesson-44-ex-01', 'lesson-44-ex-02', 'lesson-44-ex-03', 'lesson-44-ex-04', 'lesson-44-ex-05'],
    masteryThreshold: 0.75,
    description: 'Jazz-influenced and contemporary chord progressions',
    tier: 17,
    requiredCompletions: 3,
  },
  {
    id: 'comping-patterns',
    name: 'Comping Patterns',
    category: 'chords',
    prerequisites: ['advanced-progressions'],
    targetExerciseIds: ['lesson-44-ex-06', 'lesson-44-ex-07', 'lesson-44-ex-08', 'lesson-44-ex-09'],
    masteryThreshold: 0.75,
    description: 'Rhythmic accompaniment patterns for pop and jazz styles',
    tier: 17,
    requiredCompletions: 3,
  },
  {
    id: 'compound-time',
    name: 'Compound Time',
    category: 'rhythm',
    prerequisites: ['6-8-time', 'triplet-rhythm'],
    targetExerciseIds: ['lesson-45-ex-01', 'lesson-45-ex-02', 'lesson-45-ex-03', 'lesson-45-ex-04'],
    masteryThreshold: 0.75,
    description: '6/8 and 12/8 time signatures with flowing subdivisions',
    tier: 17,
    requiredCompletions: 3,
  },
  {
    id: 'swing-and-shuffle',
    name: 'Swing & Shuffle',
    category: 'rhythm',
    prerequisites: ['swing-rhythm', 'compound-time'],
    targetExerciseIds: ['lesson-45-ex-05', 'lesson-45-ex-06', 'lesson-45-ex-07'],
    masteryThreshold: 0.75,
    description: 'Swing feel, shuffle patterns, and jazz rhythms',
    tier: 17,
    requiredCompletions: 3,
  },
  {
    id: 'cross-rhythms',
    name: 'Cross Rhythms',
    category: 'rhythm',
    prerequisites: ['syncopation-intro', 'swing-and-shuffle'],
    targetExerciseIds: ['lesson-46-ex-01', 'lesson-46-ex-02', 'lesson-46-ex-03', 'lesson-46-ex-04'],
    masteryThreshold: 0.8,
    description: '3 against 4, hemiola, and other cross-rhythm patterns',
    tier: 17,
    requiredCompletions: 3,
  },
  {
    id: 'mixed-meter',
    name: 'Mixed Meter',
    category: 'rhythm',
    prerequisites: ['cross-rhythms', 'compound-time'],
    targetExerciseIds: ['lesson-46-ex-05', 'lesson-46-ex-06', 'lesson-46-ex-07', 'lesson-46-ex-08', 'lesson-46-ex-09'],
    masteryThreshold: 0.8,
    description: 'Alternating time signatures and metric modulation',
    tier: 17,
    requiredCompletions: 3,
  },

  // ── Tier 18: Intermediate Repertoire & Capstone (Lessons 47-50) ─────────
  {
    id: 'baroque-repertoire',
    name: 'Baroque Repertoire',
    category: 'songs',
    prerequisites: ['full-piece-classical', 'modulation-technique'],
    targetExerciseIds: ['lesson-47-ex-01', 'lesson-47-ex-02', 'lesson-47-ex-03', 'lesson-47-ex-04', 'lesson-47-ex-05'],
    masteryThreshold: 0.8,
    description: 'Bach inventions and baroque dance forms',
    tier: 18,
    requiredCompletions: 3,
  },
  {
    id: 'romantic-repertoire',
    name: 'Romantic Repertoire',
    category: 'songs',
    prerequisites: ['rubato-intro', 'baroque-repertoire'],
    targetExerciseIds: ['lesson-47-ex-06', 'lesson-47-ex-07', 'lesson-47-ex-08', 'lesson-47-ex-09'],
    masteryThreshold: 0.8,
    description: 'Chopin, Schumann, and romantic-era character pieces',
    tier: 18,
    requiredCompletions: 3,
  },
  {
    id: 'contemporary-repertoire',
    name: 'Contemporary Pieces',
    category: 'songs',
    prerequisites: ['full-piece-pop', 'advanced-progressions'],
    targetExerciseIds: ['lesson-48-ex-01', 'lesson-48-ex-02', 'lesson-48-ex-03', 'lesson-48-ex-04', 'lesson-48-ex-05'],
    masteryThreshold: 0.8,
    description: 'Film scores, minimalism, and modern arrangements',
    tier: 18,
    requiredCompletions: 3,
  },
  {
    id: 'film-score-performance',
    name: 'Film Score Performance',
    category: 'songs',
    prerequisites: ['contemporary-repertoire', 'pedal-intro'],
    targetExerciseIds: ['lesson-48-ex-06', 'lesson-48-ex-07', 'lesson-48-ex-08', 'lesson-48-ex-09'],
    masteryThreshold: 0.8,
    description: 'Complete film score arrangements with pedal and dynamics',
    tier: 18,
    requiredCompletions: 3,
  },
  {
    id: 'advanced-sight-reading',
    name: 'Advanced Sight Reading',
    category: 'sight-reading',
    prerequisites: ['sight-reading-mixed', 'modulation-technique'],
    targetExerciseIds: ['lesson-49-ex-01', 'lesson-49-ex-02', 'lesson-49-ex-03', 'lesson-49-ex-04', 'lesson-49-ex-05'],
    masteryThreshold: 0.8,
    description: 'Sight reading in multiple keys with complex rhythms',
    tier: 18,
    requiredCompletions: 3,
  },
  {
    id: 'improvisation-basics',
    name: 'Improvisation',
    category: 'songs',
    prerequisites: ['blues-scale', 'advanced-progressions', 'swing-and-shuffle'],
    targetExerciseIds: ['lesson-49-ex-06', 'lesson-49-ex-07', 'lesson-49-ex-08', 'lesson-49-ex-09'],
    masteryThreshold: 0.75,
    description: 'Basic improvisation over chord changes — blues and pop',
    tier: 18,
    requiredCompletions: 3,
  },
  {
    id: 'year-two-mastery',
    name: 'Year Two Mastery',
    category: 'songs',
    prerequisites: ['baroque-repertoire', 'romantic-repertoire', 'contemporary-repertoire', 'advanced-sight-reading', 'improvisation-basics'],
    targetExerciseIds: ['lesson-50-ex-01', 'lesson-50-ex-02', 'lesson-50-ex-03', 'lesson-50-ex-04', 'lesson-50-ex-05', 'lesson-50-ex-06', 'lesson-50-ex-07', 'lesson-50-ex-08', 'lesson-50-ex-09'],
    masteryThreshold: 0.85,
    description: 'Grand capstone — demonstrate all Year Two skills in a concert program',
    tier: 18,
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

/**
 * Get all skill nodes in a specific tier.
 */
export function getSkillsByTier(tier: number): SkillNode[] {
  return SKILL_TREE.filter((node) => node.tier === tier);
}

/**
 * Compute the average mastery score across all skills in a tier.
 * Returns 0 if no skills in the tier are mastered, 100 if all are fully mastered.
 */
export function getTierMasteryScore(
  tier: number,
  masteredSkills: string[],
  skillMasteryData: Record<string, SkillMasteryRecord>,
): number {
  const tierSkills = getSkillsByTier(tier);
  if (tierSkills.length === 0) return 100;

  const masteredSet = new Set(masteredSkills);
  let totalScore = 0;

  for (const skill of tierSkills) {
    if (masteredSet.has(skill.id)) {
      const record = skillMasteryData[skill.id];
      // Mastered skill: score based on completion count vs required
      const completionRatio = record
        ? Math.min(record.completionCount / skill.requiredCompletions, 1)
        : 1;
      totalScore += completionRatio * 100;
    }
    // Unmastered skills contribute 0
  }

  return Math.round(totalScore / tierSkills.length);
}

/**
 * Check if the learner has passed the mastery gate for a tier.
 * A tier gate is passed when the average mastery score meets the threshold.
 */
export function isTierGatePassed(
  tier: number,
  masteredSkills: string[],
  skillMasteryData: Record<string, SkillMasteryRecord>,
): boolean {
  const gate = TIER_MASTERY_GATES[tier];
  if (gate == null) return true; // No gate for this tier
  const score = getTierMasteryScore(tier, masteredSkills, skillMasteryData);
  return score >= gate;
}

/**
 * Calculate days since last practice for any skill.
 * Returns Infinity if never practiced.
 */
export function daysSinceLastPractice(
  skillMasteryData: Record<string, SkillMasteryRecord>,
): number {
  const records = Object.values(skillMasteryData);
  if (records.length === 0) return Infinity;
  const lastPracticed = Math.max(...records.map((r) => r.lastPracticedAt));
  return (Date.now() - lastPracticed) / 86400000;
}

/**
 * Check if the learner needs gentle re-entry after a break.
 */
export function needsGentleReentry(
  skillMasteryData: Record<string, SkillMasteryRecord>,
): boolean {
  return daysSinceLastPractice(skillMasteryData) >= GENTLE_REENTRY_DAYS;
}

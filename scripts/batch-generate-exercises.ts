#!/usr/bin/env npx tsx
/**
 * Batch Exercise Generator
 *
 * Generates piano exercises in batch using Google Gemini AI. Reads lesson specs,
 * generates exercises in parallel (rate-limited), validates each one, retries
 * failures, and writes exercise JSON files + lesson manifests.
 *
 * Usage:
 *   npx tsx scripts/batch-generate-exercises.ts --spec scripts/lesson-specs.json --lessons 7-12
 *   npx tsx scripts/batch-generate-exercises.ts --spec scripts/lesson-specs.json --lessons 7
 *   npx tsx scripts/batch-generate-exercises.ts --spec scripts/lesson-specs.json --dry-run --verbose
 *
 * Prerequisites:
 *   - GEMINI_API_KEY env var (or EXPO_PUBLIC_GEMINI_API_KEY as fallback)
 *   - Install: npm i @google/generative-ai (already installed)
 *
 * Flags:
 *   --spec <path>       Path to lesson specs JSON (default: scripts/lesson-specs.json)
 *   --lessons <range>   Lesson range to generate, e.g. "7-16" or "7" (default: all in spec)
 *   --dry-run           Validate spec and show plan without generating or writing files
 *   --verbose           Detailed logging of prompts, responses, and validation
 *   --concurrency <n>   Max parallel Gemini requests (default: 3)
 *   --retries <n>       Max retries per exercise on validation failure (default: 2)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { validateExercise, type Exercise, type ValidationResult } from './validate-exercise';

// ============================================================================
// Types
// ============================================================================

interface ExerciseSpec {
  skillId: string;
  type: 'play' | 'rhythm';
  title: string;
  description: string;
  difficulty: number;
}

interface LessonSpec {
  lessonNumber: number;
  title: string;
  description: string;
  tier: number;
  difficulty: number;
  exerciseCount: number;
  skills: string[];
  exercises: ExerciseSpec[];
  unlockRequirement: { type: string; lessonId: string } | null;
  xpReward: number;
}

interface SpecFile {
  $comment?: string;
  lessons: LessonSpec[];
}

interface GenerationHints {
  keySignature?: string;
  targetMidi?: number[];
  hand?: 'left' | 'right' | 'both';
  exerciseTypes?: string[];
  minDifficulty?: number;
  maxDifficulty?: number;
  promptHint?: string;
}

interface CLIArgs {
  specPath: string;
  lessonRange: { start: number; end: number } | null;
  dryRun: boolean;
  verbose: boolean;
  concurrency: number;
  maxRetries: number;
}

interface GenerationResult {
  exerciseId: string;
  success: boolean;
  exercise?: Exercise;
  error?: string;
  attempts: number;
}

// ============================================================================
// Generation Hints (inline copy from SkillTree to avoid React/Expo deps)
// ============================================================================

const GENERATION_HINTS: Record<string, GenerationHints> = {
  // Tier 6: Black Keys
  'find-black-keys': { targetMidi: [61, 63, 66, 68, 70], hand: 'right', exerciseTypes: ['melody'], minDifficulty: 1, maxDifficulty: 2, promptHint: 'Locate and play groups of 2 and 3 black keys, simple patterns, tempo 50-60' },
  'sharp-notes-rh': { targetMidi: [61, 63, 66, 68, 70], hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Play F#, C#, G# in melodic patterns with right hand, tempo 60-70' },
  'flat-notes-lh': { targetMidi: [46, 49, 51, 54, 56], hand: 'left', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Play Bb, Eb with left hand in simple patterns, tempo 55-65' },
  'chromatic-scale': { targetMidi: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72], hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Chromatic scale one octave C4-C5 ascending and descending, tempo 60-70' },
  'half-steps-whole-steps': { targetMidi: [60, 61, 62, 64], hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 2, promptHint: 'Patterns alternating half steps and whole steps to develop interval awareness, tempo 55-65' },
  'black-key-melodies': { targetMidi: [61, 63, 66, 68, 70], hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Pentatonic-style melody using only black keys, tempo 60-75' },

  // Tier 7: G & F Major
  'g-major-scale-rh': { keySignature: 'G major', targetMidi: [67, 69, 71, 72, 74, 76, 78, 79], hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'G major scale right hand with F#, one octave, tempo 65-80' },
  'g-major-scale-lh': { keySignature: 'G major', targetMidi: [55, 57, 59, 60, 62, 64, 66, 67], hand: 'left', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'G major scale left hand, one octave, tempo 60-75' },
  'g-major-hands': { keySignature: 'G major', hand: 'both', exerciseTypes: ['scale'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'G major scale both hands in parallel, tempo 65-80' },
  'g-major-melodies': { keySignature: 'G major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Simple melody in G major with F# accidental, tempo 65-80' },
  'f-major-scale-rh': { keySignature: 'F major', targetMidi: [65, 67, 69, 70, 72, 74, 76, 77], hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'F major scale right hand with Bb, one octave, tempo 65-80' },
  'f-major-scale-lh': { keySignature: 'F major', hand: 'left', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'F major scale left hand, one octave, tempo 60-75' },
  'f-major-hands': { keySignature: 'F major', hand: 'both', exerciseTypes: ['scale'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'F major scale both hands together, tempo 65-80' },
  'key-signature-reading': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Melody that modulates between C, G, and F major to practice key signature reading, tempo 65-75' },

  // Tier 8: Minor Keys
  'a-minor-natural': { keySignature: 'A minor', targetMidi: [57, 59, 60, 62, 64, 65, 67, 69], hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'A natural minor scale (all white keys), one octave, tempo 60-75' },
  'a-minor-melodies': { keySignature: 'A minor', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Melody in A minor with expressive phrasing, tempo 65-75' },
  'd-minor-scale': { keySignature: 'D minor', hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'D natural minor scale with Bb, one octave, tempo 60-75' },
  'd-minor-melodies': { keySignature: 'D minor', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Melody in D minor, quarter and eighth notes, tempo 65-75' },
  'e-minor-scale': { keySignature: 'E minor', hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'E natural minor scale with F#, one octave, tempo 60-75' },
  'minor-vs-major': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 2, promptHint: 'Exercise comparing C major and A minor phrases side by side, tempo 60-70' },
  'harmonic-minor': { keySignature: 'A minor', targetMidi: [57, 59, 60, 62, 64, 65, 68, 69], hand: 'right', exerciseTypes: ['scale'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'A harmonic minor scale with raised G#, one octave, tempo 60-75' },
  'minor-songs': { keySignature: 'A minor', hand: 'both', exerciseTypes: ['melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Song in a minor key with simple left hand accompaniment, tempo 65-80' },

  // Tier 9: Chords
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

  // Tier 11: Rhythm
  'dotted-quarter-notes': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Dotted quarter note rhythms (1.5 beats) mixed with eighths, tempo 65-80' },
  'syncopation-intro': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Off-beat accents and syncopated rhythms, tempo 70-85' },
  'ties-across-barline': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Notes tied across bar lines creating held notes, tempo 65-80' },
  'triplet-rhythm': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Triplet eighth note rhythms — three notes per beat — on C-D-E-F-G, tempo 65-80' },
  '3-4-time': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm', 'melody'], minDifficulty: 2, maxDifficulty: 3, promptHint: 'Waltz time 3/4 — three beats per measure — simple melody, tempo 75-95' },
  '6-8-time': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm', 'melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Compound meter 6/8 — two groups of three — flowing melody, tempo 55-70 (dotted quarter = beat)' },
  'swing-rhythm': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm', 'melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Swing eighth notes (long-short feel) on C pentatonic notes, tempo 80-100' },
  'rhythm-reading': { keySignature: 'C major', hand: 'right', exerciseTypes: ['rhythm'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Written rhythms to play — mix of quarter, eighth, dotted, tied notes, tempo 70-85' },
  'mixed-rhythms': { keySignature: 'C major', hand: 'both', exerciseTypes: ['rhythm', 'melody'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'Combine dotted rhythms, syncopation, ties, and triplets in one piece, tempo 70-85' },

  // Tier 12: Arpeggios
  'c-major-arpeggio': { keySignature: 'C major', hand: 'right', exerciseTypes: ['arpeggio'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'C major arpeggio across 2 octaves, ascending and descending, tempo 65-85' },
  'g-major-arpeggio': { keySignature: 'G major', hand: 'right', exerciseTypes: ['arpeggio'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'G major arpeggio across 2 octaves, tempo 65-85' },
  'minor-arpeggios': { keySignature: 'A minor', hand: 'right', exerciseTypes: ['arpeggio'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Am and Dm arpeggios across 2 octaves, tempo 65-80' },
  'arpeggio-patterns': { keySignature: 'C major', hand: 'right', exerciseTypes: ['arpeggio'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Accompaniment arpeggio patterns (1-3-5-8 and variations), tempo 70-85' },
  'broken-chord-patterns': { keySignature: 'C major', hand: 'left', exerciseTypes: ['arpeggio', 'chord'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Waltz bass and stride patterns in left hand, tempo 75-90' },
  'hands-arpeggio': { keySignature: 'C major', hand: 'both', exerciseTypes: ['arpeggio'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Arpeggios both hands in parallel motion across 2 octaves, tempo 65-85' },
  'arpeggio-songs': { keySignature: 'C major', hand: 'both', exerciseTypes: ['arpeggio', 'melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Song using arpeggio patterns for accompaniment with melody on top, tempo 70-85' },

  // Tier 13: Expression & Dynamics
  'dynamics-p-f': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Melody alternating between piano (soft) and forte (loud) passages, tempo 65-80' },
  'crescendo-diminuendo': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Melody with gradual volume swells (crescendo) and fades (diminuendo), tempo 60-75' },
  'staccato-technique': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Short detached staccato notes in playful patterns, tempo 70-90' },
  'legato-technique': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Smooth connected legato playing with overlapping note durations, tempo 60-75' },
  'accents-emphasis': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody', 'rhythm'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Melody with specific notes accented for emphasis, tempo 70-85' },
  'pedal-intro': { keySignature: 'C major', hand: 'both', exerciseTypes: ['chord', 'melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Chord progression using sustained notes to simulate pedal technique, tempo 55-70' },
  'phrasing': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'Shape 4-bar phrases with dynamics and breathing points, tempo 60-75' },
  'expressive-songs': { keySignature: 'C major', hand: 'both', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'Song with dynamic markings requiring expression and phrasing, tempo 65-80' },

  // Tier 14: More Keys & Sight Reading
  'd-major-scale': { keySignature: 'D major', targetMidi: [62, 64, 66, 67, 69, 71, 73, 74], hand: 'right', exerciseTypes: ['scale'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'D major scale with F# and C#, one octave, tempo 65-80' },
  'bb-major-scale': { keySignature: 'Bb major', targetMidi: [58, 60, 62, 63, 65, 67, 69, 70], hand: 'right', exerciseTypes: ['scale'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Bb major scale with Bb and Eb, one octave, tempo 65-80' },
  'relative-minor': { keySignature: 'C major', hand: 'right', exerciseTypes: ['scale', 'melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Exercise comparing C major and A minor scales, then G major and E minor, tempo 65-75' },
  'sight-reading-c': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'New unseen melody in C major for sight reading practice, stepwise motion with some skips, tempo 60-70' },
  'sight-reading-g': { keySignature: 'G major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'New unseen melody in G major for sight reading, remember the F#, tempo 60-70' },
  'sight-reading-mixed': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'Sight reading exercise that switches between C, G, and F major sections, tempo 60-70' },
  'interval-recognition': { keySignature: 'C major', hand: 'right', exerciseTypes: ['melody'], minDifficulty: 3, maxDifficulty: 3, promptHint: 'Melody built on specific intervals (2nds, 3rds, 5ths, octaves) for recognition, tempo 60-70' },
  'key-fluency': { keySignature: 'C major', hand: 'right', exerciseTypes: ['scale', 'melody'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'Quick key changes between C, G, F, D, Bb major — each phrase in a different key, tempo 65-80' },

  // Tier 15: Performance & Intermediate Repertoire
  'performance-prep': { keySignature: 'C major', hand: 'both', exerciseTypes: ['melody'], minDifficulty: 4, maxDifficulty: 4, promptHint: 'Complete 16-bar piece to play through without stopping, tempo 70-85' },
  'rubato-intro': { keySignature: 'C major', hand: 'both', exerciseTypes: ['melody'], minDifficulty: 4, maxDifficulty: 4, promptHint: 'Expressive piece with flexible timing — some notes held longer for effect, tempo 60-75' },
  'intermediate-classical': { keySignature: 'C major', hand: 'both', exerciseTypes: ['melody'], minDifficulty: 4, maxDifficulty: 4, promptHint: 'Classical-style piece (like Minuet or Sonatina) with balanced phrases, tempo 80-100' },
  'intermediate-pop': { keySignature: 'C major', hand: 'both', exerciseTypes: ['melody', 'chord'], minDifficulty: 4, maxDifficulty: 4, promptHint: 'Pop-style arrangement with melody over chord progression, tempo 72-88' },
  'blues-scale': { keySignature: 'C major', targetMidi: [60, 63, 65, 66, 67, 70, 72], hand: 'right', exerciseTypes: ['scale', 'melody'], minDifficulty: 3, maxDifficulty: 4, promptHint: 'C blues scale (C-Eb-F-F#-G-Bb) with swing feel, tempo 80-100' },
  'full-piece-classical': { keySignature: 'C major', hand: 'both', exerciseTypes: ['melody'], minDifficulty: 4, maxDifficulty: 5, promptHint: 'Complete classical piece — 24-32 bars with repeats, clear phrase structure, tempo 80-100' },
  'full-piece-pop': { keySignature: 'C major', hand: 'both', exerciseTypes: ['melody', 'chord'], minDifficulty: 4, maxDifficulty: 5, promptHint: 'Complete pop song arrangement — verse and chorus, chord accompaniment, tempo 72-88' },
  'repertoire-building': { keySignature: 'G major', hand: 'both', exerciseTypes: ['melody'], minDifficulty: 4, maxDifficulty: 5, promptHint: 'Concert piece in G major with varied sections — a mini-repertoire showpiece, tempo 80-100' },
  'year-one-mastery': { keySignature: 'C major', hand: 'both', exerciseTypes: ['melody', 'chord', 'scale'], minDifficulty: 4, maxDifficulty: 5, promptHint: 'Comprehensive review combining scales, chords, arpeggios, and melody in a single piece, tempo 75-95' },
};

// ============================================================================
// Prompt Builder
// ============================================================================

function buildExercisePrompt(
  spec: ExerciseSpec,
  lesson: LessonSpec,
  exerciseNumber: number,
  isTest: boolean,
): string {
  const hints = GENERATION_HINTS[spec.skillId];
  const hand = hints?.hand ?? 'right';
  const keySignature = hints?.keySignature ?? 'C major';
  const difficulty = spec.difficulty;
  const noteCount = isTest ? 16 : (difficulty <= 2 ? 8 : 12);
  const tempoRange = hints?.promptHint?.match(/tempo (\d+)-(\d+)/);
  const tempoMin = tempoRange ? parseInt(tempoRange[1], 10) : 55 + difficulty * 10;
  const tempoMax = tempoRange ? parseInt(tempoRange[2], 10) : 65 + difficulty * 15;
  const tempo = Math.round((tempoMin + tempoMax) / 2);
  const totalBeats = Math.ceil(noteCount * 1.5);

  let prompt = `Generate a piano exercise as JSON for a student.

Exercise context:
- Lesson ${lesson.lessonNumber}: "${lesson.title}"
- Exercise ${exerciseNumber}: "${spec.title}"
- Description: ${spec.description}
- Difficulty: ${difficulty}/5
- Exercise type: ${spec.type}`;

  if (isTest) {
    prompt += `
- This is a MASTERY TEST — combine skills from the entire lesson
- Should be slightly harder than the regular exercises
- Test should cover the main skills: ${lesson.skills.join(', ')}`;
  }

  if (hints?.promptHint) {
    prompt += `\n- SKILL OBJECTIVE: ${hints.promptHint}`;
  }

  if (hints?.targetMidi && hints.targetMidi.length > 0) {
    prompt += `\n- Use ONLY these MIDI notes: ${JSON.stringify(hints.targetMidi)}`;
  }

  prompt += `

Requirements:
- Tempo: ${tempo} BPM
- Time signature: 4/4
- Key signature: ${keySignature}
- All MIDI notes between 36-96 (C2 to C7)
- All notes should use hand: "${hand}"${hand === 'both' ? ' (assign each note to "left" or "right" as appropriate)' : ''}
- Target note count: ${noteCount} notes
- Exercise should span approximately ${totalBeats} beats (${Math.ceil(totalBeats / 4)} measures of 4/4)

Musical quality rules (IMPORTANT):
- Structure in ${Math.ceil(totalBeats / 16)}-bar phrases with question-and-answer patterns
- End each phrase on a stable scale degree (tonic or dominant)
- End the exercise on the tonic note of the key
- Use rhythmic variety: mix quarter notes (1 beat), half notes (2 beats), eighth notes (0.5 beats), and dotted quarters (1.5 beats). Do NOT use only quarter notes.
- Use mostly stepwise motion (seconds) with occasional thirds and one or two wider skips per phrase
- durationBeats must be a standard musical value: 0.25, 0.5, 0.75, 1, 1.5, 2, 3, or 4
- startBeat values must not cause overlapping notes for the same hand
- First note should start on beat 0

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "notes": [{"note": <midi_number>, "startBeat": <number>, "durationBeats": <number>, "hand": "${hand === 'both' ? 'left" or "right' : hand}"}],
  "settings": {"tempo": ${tempo}, "timeSignature": [4,4], "keySignature": "${keySignature}"},
  "metadata": {"title": "${spec.title}", "difficulty": ${difficulty}, "skills": ${JSON.stringify(lesson.skills.slice(0, 3))}},
  "scoring": {"passingScore": ${difficulty <= 2 ? 60 : 70}, "timingToleranceMs": ${difficulty <= 2 ? 75 : difficulty <= 4 ? 50 : 30}, "starThresholds": [${difficulty <= 2 ? '70, 85, 95' : '75, 88, 96'}]}
}`;

  return prompt;
}

// ============================================================================
// AI Response → Exercise JSON
// ============================================================================

function assembleExercise(
  aiResponse: Record<string, unknown>,
  exerciseId: string,
  spec: ExerciseSpec,
  lesson: LessonSpec,
  isTest: boolean,
): Exercise {
  const hints = GENERATION_HINTS[spec.skillId];
  const hand = hints?.hand ?? 'right';
  const difficulty = spec.difficulty as 1 | 2 | 3 | 4 | 5;
  const aiMeta = aiResponse.metadata as Record<string, unknown> | undefined;
  const aiSettings = aiResponse.settings as Record<string, unknown> | undefined;
  const aiScoring = aiResponse.scoring as Record<string, unknown> | undefined;
  const aiNotes = aiResponse.notes as Array<Record<string, unknown>> | undefined;

  // Snap durations to nearest valid value
  const notes = (aiNotes ?? []).map((n) => {
    const dur = n.durationBeats as number;
    const validDurations = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
    const snapped = validDurations.reduce((best, d) =>
      Math.abs(d - dur) < Math.abs(best - dur) ? d : best,
    );

    const noteObj: Record<string, unknown> = {
      note: n.note,
      startBeat: n.startBeat,
      durationBeats: snapped,
      hand: n.hand ?? hand,
    };
    if (n.finger != null) noteObj.finger = n.finger;
    return noteObj;
  });

  const passingScore = isTest ? 70 : (difficulty <= 2 ? 60 : 70);

  return {
    id: exerciseId,
    version: 1,
    metadata: {
      title: isTest ? `Lesson ${lesson.lessonNumber} Mastery Test` : spec.title,
      description: isTest
        ? `Prove your ${lesson.title.toLowerCase()} skills -- play from memory!`
        : spec.description,
      difficulty,
      estimatedMinutes: isTest ? 3 : 2,
      skills: (aiMeta?.skills as string[]) ?? lesson.skills.slice(0, 3),
      prerequisites: [],
    },
    settings: {
      tempo: (aiSettings?.tempo as number) ?? 70,
      timeSignature: (aiSettings?.timeSignature as [number, number]) ?? [4, 4],
      keySignature: (aiSettings?.keySignature as string) ?? 'C',
      countIn: 4,
      metronomeEnabled: true,
      loopEnabled: !isTest,
    },
    notes: notes as Exercise['notes'],
    scoring: {
      timingToleranceMs: (aiScoring?.timingToleranceMs as number) ?? (difficulty <= 2 ? 75 : 50),
      timingGracePeriodMs: difficulty <= 2 ? 200 : 150,
      velocitySensitive: false,
      passingScore,
      starThresholds: (aiScoring?.starThresholds as [number, number, number]) ??
        (isTest ? [75, 88, 96] : [70, 85, 95]),
    },
    hints: {
      beforeStart: isTest
        ? 'Mastery test -- play from memory! No green hints this time.'
        : hints?.promptHint
          ? `Focus on: ${hints.promptHint.split(',')[0].toLowerCase()}.`
          : `Practice ${spec.title.toLowerCase()} carefully. Keep your wrist relaxed.`,
      commonMistakes: isTest ? [] : [
        {
          pattern: 'rushing',
          advice: 'Listen to the metronome. Each note should land exactly on a beat.',
          triggerCondition: { type: 'timing' as const, threshold: -100 },
        },
        {
          pattern: 'dragging',
          advice: 'Stay with the metronome — try counting the beats out loud.',
          triggerCondition: { type: 'timing' as const, threshold: 100 },
        },
      ],
      successMessage: isTest
        ? `You've mastered ${lesson.title}! Ready for the next lesson.`
        : `Great work on ${spec.title}! Keep practicing to improve your score.`,
    },
    display: {
      showFingerNumbers: isTest ? false : difficulty <= 2,
      showNoteNames: isTest ? false : difficulty <= 3,
      highlightHands: hand === 'both',
      showPianoRoll: true,
      showStaffNotation: false,
    },
  };
}

// ============================================================================
// Gemini API Client
// ============================================================================

class GeminiClient {
  private model: ReturnType<InstanceType<typeof GoogleGenerativeAI>['getGenerativeModel']>;
  private requestCount = 0;
  private lastRequestTime = 0;
  private minRequestInterval = 1200; // ms between requests (to stay within rate limits)

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });
  }

  async generate(prompt: string): Promise<Record<string, unknown>> {
    // Rate limiting: wait if too soon since last request
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await sleep(this.minRequestInterval - elapsed);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text) as Record<string, unknown>;
  }

  getRequestCount(): number {
    return this.requestCount;
  }
}

// ============================================================================
// Concurrency Control
// ============================================================================

class Semaphore {
  private queue: Array<() => void> = [];
  private active = 0;

  constructor(private readonly limit: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.limit) {
      this.active++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Generation Pipeline
// ============================================================================

async function generateSingleExercise(
  client: GeminiClient,
  spec: ExerciseSpec,
  lesson: LessonSpec,
  exerciseNumber: number,
  exerciseId: string,
  isTest: boolean,
  maxRetries: number,
  verbose: boolean,
): Promise<GenerationResult> {
  const prompt = buildExercisePrompt(spec, lesson, exerciseNumber, isTest);

  if (verbose) {
    console.log(`\n--- Prompt for ${exerciseId} ---`);
    console.log(prompt.slice(0, 500) + '...\n');
  }

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const retryHint = attempt > 1
        ? '\n\nPrevious attempt was invalid. Ensure all MIDI notes are 36-96, durations are standard musical values (0.25, 0.5, 0.75, 1, 1.5, 2, 3, or 4), and intervals are reasonable.'
        : '';

      const aiResponse = await client.generate(prompt + retryHint);

      if (verbose) {
        console.log(`  [${exerciseId}] Attempt ${attempt}: Got AI response with ${(aiResponse.notes as unknown[])?.length ?? 0} notes`);
      }

      // Assemble into full exercise format
      const exercise = assembleExercise(aiResponse, exerciseId, spec, lesson, isTest);

      // Validate
      const validation = validateExercise(exercise);
      if (validation.valid) {
        if (verbose && validation.warnings.length > 0) {
          console.log(`  [${exerciseId}] Valid with ${validation.warnings.length} warnings`);
        }
        return { exerciseId, success: true, exercise, attempts: attempt };
      }

      // Log validation errors
      if (verbose) {
        console.log(`  [${exerciseId}] Attempt ${attempt} FAILED validation:`);
        for (const err of validation.errors) {
          console.log(`    ERROR: [${err.field}] ${err.message}`);
        }
      }

      if (attempt <= maxRetries) {
        if (verbose) console.log(`  [${exerciseId}] Retrying (${attempt}/${maxRetries})...`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (verbose) {
        console.log(`  [${exerciseId}] Attempt ${attempt} ERROR: ${msg}`);
      }

      if (attempt > maxRetries) {
        return { exerciseId, success: false, error: msg, attempts: attempt };
      }
    }
  }

  return { exerciseId, success: false, error: 'All attempts failed validation', attempts: maxRetries + 1 };
}

async function generateLessonExercises(
  client: GeminiClient,
  lesson: LessonSpec,
  semaphore: Semaphore,
  args: CLIArgs,
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];
  const promises: Promise<void>[] = [];

  const lessonStr = String(lesson.lessonNumber).padStart(2, '0');

  for (let i = 0; i < lesson.exercises.length; i++) {
    const spec = lesson.exercises[i];
    const exerciseNumber = i + 1;
    const exStr = String(exerciseNumber).padStart(2, '0');
    const exerciseId = `lesson-${lessonStr}-ex-${exStr}`;

    const task = async () => {
      await semaphore.acquire();
      try {
        const result = await generateSingleExercise(
          client,
          spec,
          lesson,
          exerciseNumber,
          exerciseId,
          false,
          args.maxRetries,
          args.verbose,
        );
        results.push(result);
      } finally {
        semaphore.release();
      }
    };

    promises.push(task());
  }

  // Generate mastery test
  const testId = `lesson-${lessonStr}-test`;
  const testSpec: ExerciseSpec = {
    skillId: lesson.skills[0],
    type: 'play',
    title: `Lesson ${lesson.lessonNumber} Mastery Test`,
    description: `Comprehensive test of all ${lesson.title.toLowerCase()} skills`,
    difficulty: Math.min(5, lesson.difficulty + 1) as 1 | 2 | 3 | 4 | 5,
  };

  const testTask = async () => {
    await semaphore.acquire();
    try {
      const result = await generateSingleExercise(
        client,
        testSpec,
        lesson,
        99,
        testId,
        true,
        args.maxRetries,
        args.verbose,
      );
      results.push(result);
    } finally {
      semaphore.release();
    }
  };

  promises.push(testTask());
  await Promise.all(promises);

  return results;
}

// ============================================================================
// File I/O
// ============================================================================

function writeExerciseFile(exercise: Exercise, verbose: boolean): string {
  const match = exercise.id.match(/^lesson-(\d{2})/);
  if (!match) throw new Error(`Invalid exercise ID: ${exercise.id}`);

  const lessonDir = path.join(__dirname, `../content/exercises/lesson-${match[1]}`);
  fs.mkdirSync(lessonDir, { recursive: true });

  // Build filename from exercise ID
  const isTest = exercise.id.endsWith('-test');
  const slugTitle = exercise.metadata.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = isTest
    ? 'exercise-test.json'
    : `exercise-${exercise.id.split('-ex-')[1]}-${slugTitle}.json`;

  const filepath = path.join(lessonDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(exercise, null, 2) + '\n');

  if (verbose) {
    console.log(`  Wrote: ${path.relative(path.join(__dirname, '..'), filepath)}`);
  }

  return filepath;
}

function writeLessonManifest(lesson: LessonSpec, results: GenerationResult[], verbose: boolean): string {
  const lessonStr = String(lesson.lessonNumber).padStart(2, '0');
  const lessonId = `lesson-${lessonStr}`;

  const exercises: Array<{
    id: string;
    title: string;
    order: number;
    required: boolean;
    test?: boolean;
  }> = [];

  // Add regular exercises (sorted by ID)
  const regularResults = results
    .filter((r) => r.success && r.exercise && !r.exerciseId.endsWith('-test'))
    .sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));

  for (let i = 0; i < regularResults.length; i++) {
    const r = regularResults[i];
    exercises.push({
      id: r.exerciseId,
      title: r.exercise!.metadata.title,
      order: i + 1,
      required: true,
    });
  }

  // Add mastery test
  const testResult = results.find((r) => r.success && r.exerciseId.endsWith('-test'));
  if (testResult?.exercise) {
    exercises.push({
      id: testResult.exerciseId,
      title: 'Mastery Test',
      order: 99,
      required: true,
      test: true,
    });
  }

  const manifest = {
    id: lessonId,
    version: 1,
    metadata: {
      title: lesson.title,
      description: lesson.description,
      difficulty: lesson.difficulty,
      estimatedMinutes: Math.round(exercises.length * 2.5),
      skills: lesson.skills,
    },
    exercises,
    unlockRequirement: lesson.unlockRequirement,
    xpReward: lesson.xpReward,
    estimatedMinutes: Math.round(exercises.length * 2.5),
  };

  const lessonsDir = path.join(__dirname, '../content/lessons');
  fs.mkdirSync(lessonsDir, { recursive: true });
  const filepath = path.join(lessonsDir, `${lessonId}.json`);
  fs.writeFileSync(filepath, JSON.stringify(manifest, null, 2) + '\n');

  if (verbose) {
    console.log(`  Wrote manifest: ${path.relative(path.join(__dirname, '..'), filepath)}`);
  }

  return filepath;
}

// ============================================================================
// CLI Parsing
// ============================================================================

function parseArgs(): CLIArgs {
  const argv = process.argv.slice(2);
  const args: CLIArgs = {
    specPath: path.join(__dirname, 'lesson-specs.json'),
    lessonRange: null,
    dryRun: false,
    verbose: false,
    concurrency: 3,
    maxRetries: 2,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--spec':
        args.specPath = argv[++i];
        break;
      case '--lessons': {
        const val = argv[++i];
        if (val.includes('-')) {
          const [start, end] = val.split('-').map(Number);
          args.lessonRange = { start, end };
        } else {
          const n = Number(val);
          args.lessonRange = { start: n, end: n };
        }
        break;
      }
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--verbose':
        args.verbose = true;
        break;
      case '--concurrency':
        args.concurrency = Math.max(1, Math.min(10, Number(argv[++i])));
        break;
      case '--retries':
        args.maxRetries = Math.max(0, Math.min(5, Number(argv[++i])));
        break;
      case '--help':
        printUsage();
        process.exit(0);
    }
  }

  return args;
}

function printUsage(): void {
  console.log(`
Batch Exercise Generator for Purrrfect Keys

Usage:
  npx tsx scripts/batch-generate-exercises.ts [options]

Options:
  --spec <path>       Path to lesson specs JSON (default: scripts/lesson-specs.json)
  --lessons <range>   Lesson range, e.g. "7-12" or "7" (default: all in spec)
  --dry-run           Show plan without generating or writing files
  --verbose           Detailed logging
  --concurrency <n>   Max parallel Gemini requests (default: 3)
  --retries <n>       Max retries per exercise (default: 2)
  --help              Show this message

Environment:
  GEMINI_API_KEY                 API key for Google Gemini (required unless --dry-run)
  EXPO_PUBLIC_GEMINI_API_KEY     Fallback API key

Examples:
  npx tsx scripts/batch-generate-exercises.ts --lessons 7-12 --verbose
  npx tsx scripts/batch-generate-exercises.ts --dry-run
  npx tsx scripts/batch-generate-exercises.ts --lessons 7 --retries 3
`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('\n=== Purrrfect Keys Batch Exercise Generator ===\n');

  // Load spec
  const specPath = path.isAbsolute(args.specPath) ? args.specPath : path.resolve(args.specPath);
  if (!fs.existsSync(specPath)) {
    console.error(`Spec file not found: ${specPath}`);
    process.exit(1);
  }

  const spec: SpecFile = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

  // Filter lessons
  let lessons = spec.lessons;
  if (args.lessonRange) {
    lessons = lessons.filter(
      (l) => l.lessonNumber >= args.lessonRange!.start && l.lessonNumber <= args.lessonRange!.end,
    );
  }

  if (lessons.length === 0) {
    console.error('No lessons match the specified range.');
    process.exit(1);
  }

  // Display plan
  const totalExercises = lessons.reduce((sum, l) => sum + l.exercises.length + 1, 0); // +1 for mastery test
  console.log(`Plan:`);
  console.log(`  Lessons: ${lessons.map((l) => l.lessonNumber).join(', ')}`);
  console.log(`  Total exercises to generate: ${totalExercises} (${totalExercises - lessons.length} regular + ${lessons.length} mastery tests)`);
  console.log(`  Concurrency: ${args.concurrency}`);
  console.log(`  Max retries: ${args.maxRetries}`);
  console.log(`  Dry run: ${args.dryRun}`);
  console.log();

  for (const lesson of lessons) {
    console.log(`  Lesson ${lesson.lessonNumber}: "${lesson.title}" — ${lesson.exercises.length} exercises + 1 test (tier ${lesson.tier}, difficulty ${lesson.difficulty})`);
    if (args.verbose) {
      for (let i = 0; i < lesson.exercises.length; i++) {
        const ex = lesson.exercises[i];
        console.log(`    ${i + 1}. [${ex.skillId}] ${ex.title} (${ex.type}, diff ${ex.difficulty})`);
      }
      console.log(`    T. Mastery Test`);
    }
  }
  console.log();

  // Validate spec
  const specErrors: string[] = [];
  for (const lesson of lessons) {
    for (const ex of lesson.exercises) {
      if (!GENERATION_HINTS[ex.skillId]) {
        specErrors.push(`Lesson ${lesson.lessonNumber}: Unknown skillId "${ex.skillId}" for exercise "${ex.title}"`);
      }
      if (ex.difficulty < 1 || ex.difficulty > 5) {
        specErrors.push(`Lesson ${lesson.lessonNumber}: Invalid difficulty ${ex.difficulty} for "${ex.title}"`);
      }
    }
    if (lesson.exercises.length === 0) {
      specErrors.push(`Lesson ${lesson.lessonNumber}: No exercises defined`);
    }
  }

  if (specErrors.length > 0) {
    console.error('Spec validation errors:');
    for (const err of specErrors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log('Spec validation: PASSED');

  if (args.dryRun) {
    console.log('\n--- DRY RUN complete. No files written. ---\n');
    process.exit(0);
  }

  // Initialize Gemini client
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERROR: GEMINI_API_KEY (or EXPO_PUBLIC_GEMINI_API_KEY) environment variable is required.');
    console.error('Set it with: export GEMINI_API_KEY=your-key');
    process.exit(1);
  }

  const client = new GeminiClient(apiKey);
  const semaphore = new Semaphore(args.concurrency);

  // Generate exercises for each lesson
  const startTime = Date.now();
  let totalSuccess = 0;
  let totalFailed = 0;
  const allFilesWritten: string[] = [];

  for (const lesson of lessons) {
    console.log(`\nGenerating Lesson ${lesson.lessonNumber}: "${lesson.title}"...`);

    const results = await generateLessonExercises(client, lesson, semaphore, args);

    // Report results for this lesson
    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    console.log(`  Results: ${successes.length} succeeded, ${failures.length} failed`);

    for (const fail of failures) {
      console.log(`  FAILED: ${fail.exerciseId} — ${fail.error} (${fail.attempts} attempts)`);
    }

    // Write exercise files
    for (const result of successes) {
      if (result.exercise) {
        const filepath = writeExerciseFile(result.exercise, args.verbose);
        allFilesWritten.push(filepath);
      }
    }

    // Write lesson manifest
    if (successes.length > 0) {
      const manifestPath = writeLessonManifest(lesson, results, args.verbose);
      allFilesWritten.push(manifestPath);
    }

    totalSuccess += successes.length;
    totalFailed += failures.length;
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Generation Complete ===`);
  console.log(`  Time:        ${elapsed}s`);
  console.log(`  API calls:   ${client.getRequestCount()}`);
  console.log(`  Succeeded:   ${totalSuccess}/${totalExercises}`);
  console.log(`  Failed:      ${totalFailed}/${totalExercises}`);
  console.log(`  Files:       ${allFilesWritten.length} written`);

  if (totalFailed > 0) {
    console.log(`\n  WARNING: ${totalFailed} exercise(s) failed generation. Re-run with --verbose for details.`);
  }

  console.log(`\nNext steps:`);
  console.log(`  1. Review generated files in content/exercises/`);
  console.log(`  2. Run: npx tsx scripts/validate-exercise.ts --all`);
  console.log(`  3. Update src/content/ContentLoader.ts to register new lessons`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

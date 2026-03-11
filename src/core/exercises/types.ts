/**
 * Core exercise type definitions
 * These are platform-agnostic and contain no React imports
 */

/** Original 6 exercise interaction types */
export type ClassicExerciseType = 'play' | 'rhythm' | 'earTraining' | 'chordId' | 'sightReading' | 'callResponse';

/** New interaction types (Phase 3) */
export type InteractionExerciseType = 'fillInTheBlank' | 'spotTheError' | 'intervalQuiz' | 'chordBuilder' | 'keySignatureId';

/** Gamified wrapper types (Phase 3) */
export type GamifiedExerciseType = 'bossBattle' | 'duet' | 'speedRun' | 'endlessMode' | 'teacherChallenge';

/** Creative types (Phase 3) */
export type CreativeExerciseType = 'improvisation';

/** All exercise types */
export type ExerciseType = ClassicExerciseType | InteractionExerciseType | GamifiedExerciseType | CreativeExerciseType;

export interface NoteEvent {
  note: number; // MIDI note number (0-127)
  startBeat: number; // Beat position (float for subdivisions)
  durationBeats: number; // Note length in beats
  hand?: 'left' | 'right';
  finger?: 1 | 2 | 3 | 4 | 5;
  optional?: boolean; // Extra credit, not required for passing
}

export interface ExerciseScoringConfig {
  timingToleranceMs: number; // ±ms for "perfect"
  timingGracePeriodMs: number; // ±ms for "good"
  passingScore: number; // 0-100
  starThresholds: [number, number, number]; // 1-star, 2-star, 3-star thresholds
}

export interface ExerciseMetadata {
  title: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: number;
  skills: string[]; // e.g., ["right-hand", "c-major", "quarter-notes"]
  prerequisites: string[]; // Exercise IDs
}

export interface ExerciseSettings {
  tempo: number; // BPM
  timeSignature: [number, number]; // e.g., [4, 4]
  keySignature: string; // e.g., "C", "G", "F"
  countIn: number; // Beats before start
  metronomeEnabled: boolean;
  loopEnabled?: boolean; // Allow looping for practice
}

export interface CommonMistake {
  pattern: string;
  advice: string;
  triggerCondition?: {
    type: 'timing' | 'pitch' | 'sequence';
    threshold: number;
  };
}

export interface ExerciseHints {
  beforeStart: string;
  commonMistakes: CommonMistake[];
  successMessage: string;
}

export interface DisplaySettings {
  showFingerNumbers: boolean;
  showNoteNames: boolean;
  highlightHands?: boolean;
  showPianoRoll?: boolean;
  showStaffNotation?: boolean;
}

// ---------------------------------------------------------------------------
// Type-specific configs (Phase 3 exercise types)
// ---------------------------------------------------------------------------

/** Fill-in-the-Blank: melody with gaps the user must complete */
export interface FillInTheBlankConfig {
  type: 'fillInTheBlank';
  /** Indices into the notes array that are blanks (user must fill) */
  blankNoteIndices: number[];
  /** Play the full melody first as reference? */
  playReferenceFirst: boolean;
}

/** Spot the Error: hear a melody with one wrong note, identify it */
export interface SpotTheErrorConfig {
  type: 'spotTheError';
  /** Index of the note that is intentionally wrong */
  errorNoteIndex: number;
  /** The wrong MIDI note that is played (the "error") */
  errorNote: number;
  /** 4 MIDI note choices shown to user (one is the error) */
  choices: number[];
}

/** Interval Quiz: identify or play an interval */
export interface IntervalQuizConfig {
  type: 'intervalQuiz';
  /** 'identify' = hear interval, pick name. 'play' = see name, play it */
  mode: 'identify' | 'play';
  /** Root MIDI note */
  rootNote: number;
  /** Interval name (e.g., 'minor3rd', 'perfect5th') */
  intervalName: string;
  /** Semitone distance */
  semitones: number;
  /** Multiple choice options (for 'identify' mode) */
  choices?: string[];
}

/** Chord Builder: construct a chord note by note */
export interface ChordBuilderConfig {
  type: 'chordBuilder';
  /** Root MIDI note */
  rootNote: number;
  /** Chord type label (e.g., "Cm7", "Dmaj") */
  chordLabel: string;
  /** Expected MIDI notes in the chord (correct answer) */
  expectedNotes: number[];
}

/** Key Signature ID: identify the key from a passage or play the scale */
export interface KeySignatureIdConfig {
  type: 'keySignatureId';
  /** 'identify' = hear passage, pick key. 'play' = see key, play scale */
  mode: 'identify' | 'play';
  /** Correct key (e.g., "G major", "D minor") */
  correctKey: string;
  /** Multiple choice options (for 'identify' mode) */
  choices?: string[];
}

/** Boss Battle: tier-end epic challenge with modifiers */
export interface BossBattleConfig {
  type: 'bossBattle';
  /** Which tier this boss guards (1-15) */
  tier: number;
  /** Boss cat character ID */
  bossId: string;
  /** Modifiers that activate at health thresholds */
  modifiers: BossModifier[];
  /** Player lives (default 3) */
  lives: number;
}

export interface BossModifier {
  /** Health % below which this modifier activates */
  activateAtHealthPct: number;
  type: 'tempoRamp' | 'darkKeys' | 'mirrorNotes' | 'noLabels';
}

/** Duet: your cat plays one hand, you play the other */
export interface DuetConfig {
  type: 'duet';
  /** Which hand the player plays */
  playerHand: 'left' | 'right';
  /** Notes the AI/cat plays (for audio playback) */
  companionNotes: NoteEvent[];
}

/** Speed Run: timed chain of exercises */
export interface SpeedRunConfig {
  type: 'speedRun';
  /** IDs of the child exercises in sequence */
  exerciseChain: string[];
  /** Time limit in seconds */
  timeLimitSeconds: number;
}

/** Endless Mode: progressive difficulty until you fail */
export interface EndlessModeConfig {
  type: 'endlessMode';
  /** Starting tempo */
  startTempo: number;
  /** Tempo increase per round */
  tempoStepBpm: number;
  /** Note pattern generator seed or category */
  patternCategory: string;
}

/** Teacher Challenge: Salsa sets a specific technique goal */
export interface TeacherChallengeConfig {
  type: 'teacherChallenge';
  /** What the teacher is challenging (e.g., "play faster", "play softer") */
  challengeType: 'tempo' | 'dynamics' | 'legato' | 'accuracy';
  /** Target metric value */
  targetValue: number;
  /** Salsa dialogue prompt */
  salsaPrompt: string;
}

/** Improvisation: free play over a chord progression */
export interface ImprovisationConfig {
  type: 'improvisation';
  /** Chord progression (chord names per bar) */
  chordProgression: string[];
  /** Scale to highlight (dimmed keys outside scale) */
  scale: string;
  /** Number of bars */
  bars: number;
  /** Backing track notes (for playback) */
  backingTrack?: NoteEvent[];
}

/** Discriminated union of all type-specific configs */
export type ExerciseTypeConfig =
  | FillInTheBlankConfig
  | SpotTheErrorConfig
  | IntervalQuizConfig
  | ChordBuilderConfig
  | KeySignatureIdConfig
  | BossBattleConfig
  | DuetConfig
  | SpeedRunConfig
  | EndlessModeConfig
  | TeacherChallengeConfig
  | ImprovisationConfig;

// ---------------------------------------------------------------------------
// Exercise
// ---------------------------------------------------------------------------

export interface Exercise {
  id: string;
  version: number;
  type?: ExerciseType; // undefined defaults to 'play' for backward compat
  metadata: ExerciseMetadata;
  settings: ExerciseSettings;
  notes: NoteEvent[];
  scoring: ExerciseScoringConfig;
  hints: ExerciseHints;
  display?: DisplaySettings;
  hands?: 'left' | 'right' | 'both';
  /** Type-specific config for Phase 3 exercise types */
  typeConfig?: ExerciseTypeConfig;
}

// Scored note details
export interface NoteScore {
  expected: NoteEvent;
  played: MidiNoteEvent | null;
  timingOffsetMs: number; // Negative = early, positive = late
  timingScore: number; // 0-100
  durationScore?: number; // 0-100 — how close to expected note duration
  velocityScore?: number; // 0-100 (optional, for dynamics exercises)
  isCorrectPitch: boolean;
  isExtraNote: boolean; // Played but not expected
  isMissedNote: boolean; // Expected but not played
  status?: 'perfect' | 'good' | 'ok' | 'early' | 'late' | 'missed' | 'wrong';
}

export interface ExerciseScoreBreakdown {
  accuracy: number; // % correct notes
  timing: number; // Average timing score
  completeness: number; // % of notes attempted
  extraNotes: number; // Penalty for wrong notes (0-100)
  duration: number; // Average duration accuracy (0-100)
}

// Alias for backwards compatibility
export type ScoreBreakdown = ExerciseScoreBreakdown;

// Config type for scoring functions
export interface ScoringConfig extends ExerciseScoringConfig {}

export interface ExerciseScore {
  overall: number; // 0-100
  stars: 0 | 1 | 2 | 3;
  breakdown: ExerciseScoreBreakdown;
  details: NoteScore[];
  perfectNotes?: number;
  goodNotes?: number;
  okNotes?: number;
  missedNotes?: number;
  extraNotes?: number;
  xpEarned: number;
  isNewHighScore: boolean;
  isPassed: boolean;
}

// MIDI note input
export interface MidiNoteEvent {
  type: 'noteOn' | 'noteOff';
  note: number; // MIDI note number (0-127)
  velocity: number; // 0-127
  timestamp: number; // High-resolution timestamp
  channel: number; // MIDI channel (usually 0)
  durationMs?: number; // Time held (noteOff - noteOn), only for noteOn events used in scoring
  inputSource?: 'touch' | 'midi' | 'mic'; // Origin of the event — used for latency compensation
}

// Progress tracking
export interface ExerciseProgress {
  exerciseId: string;
  highScore: number;
  stars: 0 | 1 | 2 | 3;
  attempts: number;
  lastAttemptAt: number; // timestamp
  averageScore: number;
  completedAt?: number; // timestamp
}

export interface LessonProgress {
  lessonId: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  exerciseScores: Record<string, ExerciseProgress>;
  bestScore: number;
  completedAt?: number;
  totalAttempts: number;
  totalTimeSpentSeconds: number;
}

// Timing calculation result
export interface TimingResult {
  score: number; // 0-100
  status: 'perfect' | 'good' | 'ok' | 'early' | 'late' | 'missed';
}

/** Resolve exercise type (backward-compatible default to 'play') */
export function getExerciseType(exercise: Exercise): ExerciseType {
  return exercise.type ?? 'play';
}

/**
 * Map a skill category string to its corresponding ExerciseType.
 * Categories not listed here default to standard 'play' exercises.
 */
const CATEGORY_EXERCISE_TYPE_MAP: Record<string, ExerciseType> = {
  rhythm: 'rhythm',
  chords: 'chordId',
  'sight-reading': 'sightReading',
  'ear-training': 'earTraining',
  arpeggios: 'play',
  expression: 'play',
  performance: 'play',
};

export function exerciseTypeForCategory(category: string | undefined): ExerciseType | undefined {
  if (!category) return undefined;
  return CATEGORY_EXERCISE_TYPE_MAP[category];
}

/**
 * Resolve exercise type from an explicit param or a skill ID lookup.
 * Used by both ExercisePlayer and navigation callers.
 */
export function resolveExerciseTypeFromSkill(
  explicitType: ExerciseType | null | undefined,
  skillCategory: string | undefined,
): ExerciseType | undefined {
  if (explicitType) return explicitType;
  return exerciseTypeForCategory(skillCategory);
}

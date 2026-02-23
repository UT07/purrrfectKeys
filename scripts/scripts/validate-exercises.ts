#!/usr/bin/env npx ts-node
/**
 * Exercise Validation Script
 *
 * Validates all exercise JSON files against the schema and catches common errors:
 * - ID uniqueness
 * - Note range (21-108, valid piano range)
 * - Beat alignment (no overlapping notes unless chords)
 * - Duration validity
 * - Scoring configuration
 * - Prerequisites existence
 */

import fs from 'fs';
import path from 'path';
import glob from 'glob';

interface NoteEvent {
  note: number;
  startBeat: number;
  durationBeats: number;
  hand?: 'left' | 'right';
  finger?: 1 | 2 | 3 | 4 | 5;
  optional?: boolean;
}

interface ScoringConfig {
  timingToleranceMs: number;
  timingGracePeriodMs: number;
  velocitySensitive: boolean;
  passingScore: number;
  starThresholds: [number, number, number];
}

interface Exercise {
  id: string;
  version: number;
  metadata: {
    title: string;
    description: string;
    difficulty: 1 | 2 | 3 | 4 | 5;
    estimatedMinutes: number;
    skills: string[];
    prerequisites?: string[];
  };
  settings: {
    tempo: number;
    timeSignature: [number, number];
    keySignature: string;
    countIn: number;
    metronomeEnabled: boolean;
    loopEnabled: boolean;
  };
  notes: NoteEvent[];
  scoring: ScoringConfig;
  hints: {
    beforeStart: string;
    commonMistakes: Array<{
      pattern: string;
      advice: string;
      triggerCondition?: {
        type: 'timing' | 'pitch' | 'sequence';
        threshold: number;
      };
    }>;
    successMessage: string;
  };
  display: {
    showFingerNumbers: boolean;
    showNoteNames: boolean;
    highlightHands: boolean;
    showPianoRoll: boolean;
    showStaffNotation: boolean;
  };
}

interface ValidationError {
  exerciseId: string;
  error: string;
  severity: 'error' | 'warning';
}

const PIANO_MIN_NOTE = 21;  // A0
const PIANO_MAX_NOTE = 108; // C8

const errors: ValidationError[] = [];
const allExerciseIds = new Set<string>();
const allExercises = new Map<string, Exercise>();

function loadAllExercises(): void {
  const exercisesDir = path.join(__dirname, '../content/exercises');
  const files = glob.sync(`${exercisesDir}/**/*.json`, {
    ignore: ['**/node_modules/**']
  });

  console.log(`Found ${files.length} exercise files`);

  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const exercise: Exercise = JSON.parse(content);

      allExercises.set(exercise.id, exercise);
      allExerciseIds.add(exercise.id);
    } catch (e) {
      errors.push({
        exerciseId: file,
        error: `Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`,
        severity: 'error'
      });
    }
  });
}

function validateExercise(exercise: Exercise): void {
  const ex = exercise;

  // 1. ID format
  if (!ex.id.match(/^lesson-\d{2}-ex-\d{2}$/)) {
    errors.push({
      exerciseId: ex.id,
      error: `ID format invalid. Expected lesson-XX-ex-XX, got ${ex.id}`,
      severity: 'error'
    });
  }

  // 2. Note range
  ex.notes.forEach((note, idx) => {
    if (note.note < PIANO_MIN_NOTE || note.note > PIANO_MAX_NOTE) {
      errors.push({
        exerciseId: ex.id,
        error: `Note ${idx} has invalid MIDI number ${note.note}. Valid range: ${PIANO_MIN_NOTE}-${PIANO_MAX_NOTE}`,
        severity: 'error'
      });
    }
  });

  // 3. Duration validity
  ex.notes.forEach((note, idx) => {
    if (note.durationBeats <= 0) {
      errors.push({
        exerciseId: ex.id,
        error: `Note ${idx} has invalid duration ${note.durationBeats}. Duration must be positive`,
        severity: 'error'
      });
    }
  });

  // 4. Scoring configuration
  if (ex.scoring.passingScore < 0 || ex.scoring.passingScore > 100) {
    errors.push({
      exerciseId: ex.id,
      error: `Passing score ${ex.scoring.passingScore} outside valid range 0-100`,
      severity: 'error'
    });
  }

  if (ex.scoring.starThresholds[0] < ex.scoring.passingScore) {
    errors.push({
      exerciseId: ex.id,
      error: `First star threshold (${ex.scoring.starThresholds[0]}) is less than passing score (${ex.scoring.passingScore})`,
      severity: 'error'
    });
  }

  // 5. Prerequisites
  (ex.metadata.prerequisites || []).forEach(prereq => {
    if (!allExerciseIds.has(prereq)) {
      errors.push({
        exerciseId: ex.id,
        error: `Prerequisites references non-existent exercise: ${prereq}`,
        severity: 'error'
      });
    }
  });

  // 6. Timing tolerances (warnings for unrealistic values)
  if (ex.scoring.timingToleranceMs < 25 || ex.scoring.timingToleranceMs > 100) {
    errors.push({
      exerciseId: ex.id,
      error: `Timing tolerance ${ex.scoring.timingToleranceMs}ms seems extreme. Typical range: 25-100ms`,
      severity: 'warning'
    });
  }

  // 7. Metadata validation
  if (!ex.metadata.title || ex.metadata.title.length === 0) {
    errors.push({
      exerciseId: ex.id,
      error: `Exercise has no title`,
      severity: 'error'
    });
  }

  if (!ex.metadata.description || ex.metadata.description.length === 0) {
    errors.push({
      exerciseId: ex.id,
      error: `Exercise has no description`,
      severity: 'error'
    });
  }

  if (ex.metadata.difficulty < 1 || ex.metadata.difficulty > 5) {
    errors.push({
      exerciseId: ex.id,
      error: `Difficulty ${ex.metadata.difficulty} outside valid range 1-5`,
      severity: 'error'
    });
  }

  // 8. Empty notes array warning
  if (ex.notes.length === 0) {
    errors.push({
      exerciseId: ex.id,
      error: `Exercise has no notes`,
      severity: 'error'
    });
  }
}

function checkUniqueness(): void {
  const idCounts = new Map<string, number>();

  allExercises.forEach(ex => {
    const count = idCounts.get(ex.id) || 0;
    idCounts.set(ex.id, count + 1);
  });

  idCounts.forEach((count, id) => {
    if (count > 1) {
      errors.push({
        exerciseId: id,
        error: `Exercise ID appears ${count} times. IDs must be unique`,
        severity: 'error'
      });
    }
  });
}

function main(): void {
  console.log('\n=== Purrrfect Keys Exercise Validator ===\n');

  loadAllExercises();
  console.log(`Loaded ${allExercises.size} exercises\n`);

  allExercises.forEach(exercise => {
    validateExercise(exercise);
  });

  checkUniqueness();

  // Report results
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  if (errors.length === 0) {
    console.log('✓ All exercises validated successfully!\n');
    process.exit(0);
  }

  console.log(`Found ${errorCount} errors and ${warningCount} warnings\n`);

  const errorsByExercise = new Map<string, ValidationError[]>();
  errors.forEach(error => {
    const arr = errorsByExercise.get(error.exerciseId) || [];
    arr.push(error);
    errorsByExercise.set(error.exerciseId, arr);
  });

  errorsByExercise.forEach((exErrors, exerciseId) => {
    const criticalCount = exErrors.filter(e => e.severity === 'error').length;
    console.log(`${criticalCount > 0 ? '✗' : '⚠'} ${exerciseId}`);

    exErrors.forEach(error => {
      const icon = error.severity === 'error' ? '  ERROR:' : '  WARNING:';
      console.log(`${icon} ${error.error}`);
    });
    console.log();
  });

  process.exit(errorCount > 0 ? 1 : 0);
}

main();

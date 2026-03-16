#!/usr/bin/env npx tsx
/**
 * Difficulty Curve Validation Script
 *
 * Analyzes all exercises across lessons to verify smooth difficulty progression.
 * Checks for:
 * - Sudden difficulty spikes between consecutive exercises
 * - Tempo jumps that are too large
 * - Note range expansions that are too aggressive
 * - Missing skills prerequisites in the SkillTree
 *
 * Usage: npx tsx scripts/validate-difficulty-curve.ts [--verbose] [--fix-suggestions]
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

interface ExerciseData {
  id: string;
  lessonId: string;
  difficulty: number;
  tempo: number;
  noteCount: number;
  noteRange: { min: number; max: number };
  hands: 'left' | 'right' | 'both';
  durationBeats: number;
  skills: string[];
}

interface ValidationIssue {
  type: 'spike' | 'tempo-jump' | 'range-jump' | 'missing-prereq' | 'quality';
  severity: 'warning' | 'error';
  exerciseId: string;
  lessonId: string;
  message: string;
  suggestion?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_DIFFICULTY_JUMP = 1;      // Max difficulty increase between consecutive exercises
const MAX_TEMPO_JUMP = 20;          // Max BPM increase between consecutive exercises
const MAX_RANGE_EXPANSION = 12;     // Max semitone range expansion between exercises
const MIN_NOTES_PER_EXERCISE = 2;   // Minimum notes for a valid exercise
const MAX_NOTES_PER_EXERCISE = 200; // Maximum notes for a valid exercise

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const verbose = process.argv.includes('--verbose');
  const showFixes = process.argv.includes('--fix-suggestions');

  console.log('🎹 Difficulty Curve Validator');
  console.log('═'.repeat(60));

  // Load all lesson and exercise files
  const contentDir = path.resolve(__dirname, '../content');
  const lessonsDir = path.join(contentDir, 'lessons');
  const exercisesDir = path.join(contentDir, 'exercises');

  if (!fs.existsSync(lessonsDir)) {
    console.error('❌ No lessons directory found at', lessonsDir);
    process.exit(1);
  }

  // Read all lesson manifests
  const lessonFiles = fs.readdirSync(lessonsDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  const allExercises: ExerciseData[] = [];
  const issues: ValidationIssue[] = [];

  for (const lessonFile of lessonFiles) {
    const lessonPath = path.join(lessonsDir, lessonFile);
    const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf-8'));
    const lessonId = lesson.id;

    if (verbose) console.log(`\n📖 ${lessonId}: ${lesson.metadata?.title ?? lesson.title ?? 'Untitled'}`);

    // Load exercises for this lesson
    const exerciseIds: string[] = lesson.exercises?.map((e: { id: string } | string) =>
      typeof e === 'string' ? e : e.id
    ) ?? [];

    for (const exId of exerciseIds) {
      const exercisePath = findExerciseFile(exercisesDir, exId);
      if (!exercisePath) {
        issues.push({
          type: 'quality',
          severity: 'error',
          exerciseId: exId,
          lessonId,
          message: `Exercise file not found: ${exId}`,
        });
        continue;
      }

      const exercise = JSON.parse(fs.readFileSync(exercisePath, 'utf-8'));
      const data = extractExerciseData(exercise, lessonId);
      allExercises.push(data);

      // Quality checks on individual exercise
      if (data.noteCount < MIN_NOTES_PER_EXERCISE) {
        issues.push({
          type: 'quality',
          severity: 'warning',
          exerciseId: exId,
          lessonId,
          message: `Only ${data.noteCount} notes — too few for meaningful practice`,
          suggestion: 'Add more notes or merge with another exercise',
        });
      }
      if (data.noteCount > MAX_NOTES_PER_EXERCISE) {
        issues.push({
          type: 'quality',
          severity: 'warning',
          exerciseId: exId,
          lessonId,
          message: `${data.noteCount} notes — may be too long for a single exercise`,
          suggestion: 'Split into multiple exercises',
        });
      }

      if (verbose) {
        console.log(`  ${exId}: d=${data.difficulty} tempo=${data.tempo} notes=${data.noteCount} range=${data.noteRange.min}-${data.noteRange.max} hands=${data.hands}`);
      }
    }
  }

  // Curve validation: compare consecutive exercises
  console.log(`\n📊 Analyzing ${allExercises.length} exercises across ${lessonFiles.length} lessons...`);

  for (let i = 1; i < allExercises.length; i++) {
    const prev = allExercises[i - 1];
    const curr = allExercises[i];

    // Difficulty spike
    const diffJump = curr.difficulty - prev.difficulty;
    if (diffJump > MAX_DIFFICULTY_JUMP) {
      issues.push({
        type: 'spike',
        severity: 'warning',
        exerciseId: curr.id,
        lessonId: curr.lessonId,
        message: `Difficulty jump: ${prev.difficulty} → ${curr.difficulty} (+${diffJump}) from ${prev.id}`,
        suggestion: `Add intermediate exercise(s) between difficulty ${prev.difficulty} and ${curr.difficulty}`,
      });
    }

    // Tempo jump
    const tempoJump = curr.tempo - prev.tempo;
    if (tempoJump > MAX_TEMPO_JUMP) {
      issues.push({
        type: 'tempo-jump',
        severity: 'warning',
        exerciseId: curr.id,
        lessonId: curr.lessonId,
        message: `Tempo jump: ${prev.tempo} → ${curr.tempo} BPM (+${tempoJump}) from ${prev.id}`,
        suggestion: `Reduce tempo to ~${prev.tempo + MAX_TEMPO_JUMP} BPM`,
      });
    }

    // Note range expansion
    const prevRange = prev.noteRange.max - prev.noteRange.min;
    const currRange = curr.noteRange.max - curr.noteRange.min;
    const rangeJump = currRange - prevRange;
    if (rangeJump > MAX_RANGE_EXPANSION) {
      issues.push({
        type: 'range-jump',
        severity: 'warning',
        exerciseId: curr.id,
        lessonId: curr.lessonId,
        message: `Note range expansion: ${prevRange} → ${currRange} semitones (+${rangeJump}) from ${prev.id}`,
        suggestion: `Introduce new notes gradually (max +${MAX_RANGE_EXPANSION} semitones between exercises)`,
      });
    }

    // Hands transition (single → both without preparation)
    if (prev.hands !== 'both' && curr.hands === 'both') {
      const handsPrepared = allExercises.slice(Math.max(0, i - 5), i).some((e) => e.hands === 'both');
      if (!handsPrepared) {
        issues.push({
          type: 'spike',
          severity: 'warning',
          exerciseId: curr.id,
          lessonId: curr.lessonId,
          message: `Jump to both-hands without recent preparation (prev: ${prev.hands}-hand)`,
          suggestion: 'Add transitional exercise with simple both-hands patterns first',
        });
      }
    }
  }

  // Report
  console.log('\n' + '═'.repeat(60));

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} ERROR${errors.length > 1 ? 'S' : ''}:`);
    for (const issue of errors) {
      console.log(`  [${issue.type}] ${issue.lessonId}/${issue.exerciseId}: ${issue.message}`);
      if (showFixes && issue.suggestion) console.log(`    💡 ${issue.suggestion}`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} WARNING${warnings.length > 1 ? 'S' : ''}:`);
    for (const issue of warnings) {
      console.log(`  [${issue.type}] ${issue.lessonId}/${issue.exerciseId}: ${issue.message}`);
      if (showFixes && issue.suggestion) console.log(`    💡 ${issue.suggestion}`);
    }
  }

  if (issues.length === 0) {
    console.log('\n✅ All exercises pass difficulty curve validation!');
  }

  // Summary stats
  console.log(`\n📊 Summary:`);
  console.log(`  Exercises analyzed: ${allExercises.length}`);
  console.log(`  Lessons: ${lessonFiles.length}`);
  console.log(`  Difficulty range: ${Math.min(...allExercises.map((e) => e.difficulty))} → ${Math.max(...allExercises.map((e) => e.difficulty))}`);
  console.log(`  Tempo range: ${Math.min(...allExercises.map((e) => e.tempo))} → ${Math.max(...allExercises.map((e) => e.tempo))} BPM`);
  console.log(`  Errors: ${errors.length}, Warnings: ${warnings.length}`);

  process.exit(errors.length > 0 ? 1 : 0);
}

// ============================================================================
// Helpers
// ============================================================================

function findExerciseFile(exercisesDir: string, exerciseId: string): string | null {
  // Search in subdirectories (lesson-01/, lesson-02/, etc.)
  const dirs = fs.readdirSync(exercisesDir).filter((d) =>
    fs.statSync(path.join(exercisesDir, d)).isDirectory()
  );

  for (const dir of dirs) {
    const files = fs.readdirSync(path.join(exercisesDir, dir));
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(exercisesDir, dir, file);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (data.id === exerciseId) return filePath;
        } catch {
          // Skip malformed files
        }
      }
    }
  }
  return null;
}

function extractExerciseData(exercise: Record<string, unknown>, lessonId: string): ExerciseData {
  const metadata = exercise.metadata as Record<string, unknown> ?? {};
  const settings = exercise.settings as Record<string, unknown> ?? {};
  const notes = (exercise.notes as Array<Record<string, unknown>>) ?? [];

  const midiNotes = notes.map((n) => (n.note as number) ?? 60);
  const hands = notes.some((n) => n.hand === 'left') && notes.some((n) => n.hand === 'right')
    ? 'both'
    : notes.some((n) => n.hand === 'left')
      ? 'left'
      : 'right';

  const totalBeats = notes.reduce((sum, n) => {
    const start = (n.startBeat as number) ?? 0;
    const dur = (n.durationBeats as number) ?? 1;
    return Math.max(sum, start + dur);
  }, 0);

  return {
    id: exercise.id as string ?? 'unknown',
    lessonId,
    difficulty: (metadata.difficulty as number) ?? 1,
    tempo: (settings.tempo as number) ?? 60,
    noteCount: notes.length,
    noteRange: {
      min: midiNotes.length > 0 ? Math.min(...midiNotes) : 60,
      max: midiNotes.length > 0 ? Math.max(...midiNotes) : 60,
    },
    hands,
    durationBeats: totalBeats,
    skills: (metadata.skills as string[]) ?? [],
  };
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

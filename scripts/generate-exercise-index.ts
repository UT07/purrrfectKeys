/**
 * Generate Exercise Index
 *
 * Scans all content/exercises/ and content/lessons/ JSON files and produces
 * a master index at content/exercise-index.json with metadata for every
 * exercise and lesson.
 *
 * Usage: npx tsx scripts/generate-exercise-index.ts [--dry-run] [--verbose]
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// ---------------------------------------------------------------------------
// Types (mirrors the index schema consumed by ContentLoader)
// ---------------------------------------------------------------------------

interface ExerciseIndexEntry {
  id: string;
  lessonId: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  skills: string[];
  type: 'play' | 'test';
  order: number;
}

interface LessonIndexEntry {
  id: string;
  title: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  exerciseCount: number;
  unlockRequirement: { type: string; lessonId: string } | null;
}

interface ExerciseIndex {
  version: number;
  generatedAt: string;
  exercises: ExerciseIndexEntry[];
  lessons: LessonIndexEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = resolve(__dirname, '..');
const EXERCISES_DIR = join(ROOT, 'content', 'exercises');
const LESSONS_DIR = join(ROOT, 'content', 'lessons');
const OUTPUT_PATH = join(ROOT, 'content', 'exercise-index.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

function log(msg: string): void {
  console.log(msg);
}

function verbose(msg: string): void {
  if (VERBOSE) console.log(`  [verbose] ${msg}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readJson(path: string): any {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  log('=== Exercise Index Generator ===\n');

  // 1. Discover lesson directories
  const lessonDirs = readdirSync(EXERCISES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('lesson-'))
    .map((d) => d.name)
    .sort();

  log(`Found ${lessonDirs.length} lesson directories: ${lessonDirs.join(', ')}`);

  // 2. Load lesson manifests and build a map of exercise -> lesson metadata
  //    (test flag, order) from the lesson manifests
  interface LessonManifestEntry {
    id: string;
    title: string;
    order: number;
    required: boolean;
    test?: boolean;
  }

  interface LessonManifest {
    id: string;
    version: number;
    metadata: {
      title: string;
      description: string;
      difficulty: 1 | 2 | 3 | 4 | 5;
      estimatedMinutes: number;
      skills: string[];
    };
    exercises: LessonManifestEntry[];
    unlockRequirement: { type: string; lessonId: string } | null;
    xpReward: number;
    estimatedMinutes: number;
  }

  const lessonManifests: Map<string, LessonManifest> = new Map();
  const exerciseToLesson: Map<string, { lessonId: string; order: number; isTest: boolean }> =
    new Map();

  for (const lessonDir of lessonDirs) {
    const lessonId = lessonDir; // e.g. "lesson-01"
    const manifestPath = join(LESSONS_DIR, `${lessonId}.json`);
    if (!existsSync(manifestPath)) {
      log(`  WARNING: No manifest found for ${lessonId} at ${manifestPath}`);
      continue;
    }

    const manifest: LessonManifest = readJson(manifestPath);
    lessonManifests.set(lessonId, manifest);

    for (const entry of manifest.exercises) {
      exerciseToLesson.set(entry.id, {
        lessonId,
        order: entry.order,
        isTest: !!entry.test,
      });
    }

    verbose(`Loaded manifest for ${lessonId}: ${manifest.exercises.length} exercises`);
  }

  // 3. Scan all exercise JSON files and build index entries
  const exercises: ExerciseIndexEntry[] = [];
  const seenIds = new Set<string>();
  const errors: string[] = [];

  for (const lessonDir of lessonDirs) {
    const dirPath = join(EXERCISES_DIR, lessonDir);
    const exerciseFiles = readdirSync(dirPath)
      .filter((f) => f.endsWith('.json'))
      .sort();

    for (const file of exerciseFiles) {
      const filePath = join(dirPath, file);
      try {
        const exercise = readJson(filePath);

        // Validate required fields
        if (!exercise.id) {
          errors.push(`${filePath}: missing 'id' field`);
          continue;
        }
        if (!exercise.metadata?.title) {
          errors.push(`${filePath}: missing 'metadata.title'`);
          continue;
        }
        if (!exercise.metadata?.difficulty) {
          errors.push(`${filePath}: missing 'metadata.difficulty'`);
          continue;
        }

        // Check for duplicate IDs
        if (seenIds.has(exercise.id)) {
          errors.push(`Duplicate exercise ID: ${exercise.id} (in ${filePath})`);
          continue;
        }
        seenIds.add(exercise.id);

        // Look up lesson association
        const lessonInfo = exerciseToLesson.get(exercise.id);
        if (!lessonInfo) {
          errors.push(
            `Exercise ${exercise.id} (${filePath}) not referenced in any lesson manifest`
          );
          continue;
        }

        const entry: ExerciseIndexEntry = {
          id: exercise.id,
          lessonId: lessonInfo.lessonId,
          title: exercise.metadata.title,
          difficulty: exercise.metadata.difficulty,
          skills: exercise.metadata.skills ?? [],
          type: lessonInfo.isTest ? 'test' : 'play',
          order: lessonInfo.order,
        };

        exercises.push(entry);
        verbose(`  ${exercise.id}: "${exercise.metadata.title}" (${entry.type}, order ${entry.order})`);
      } catch (e) {
        errors.push(`Failed to parse ${filePath}: ${e}`);
      }
    }
  }

  // Sort exercises: by lessonId, then order
  exercises.sort((a, b) => {
    if (a.lessonId !== b.lessonId) return a.lessonId.localeCompare(b.lessonId);
    return a.order - b.order;
  });

  // 4. Build lesson index entries
  const lessons: LessonIndexEntry[] = [];

  for (const lessonDir of lessonDirs) {
    const manifest = lessonManifests.get(lessonDir);
    if (!manifest) continue;

    // Count non-test exercises
    const exerciseCount = manifest.exercises.filter((e) => !e.test).length;

    lessons.push({
      id: manifest.id,
      title: manifest.metadata.title,
      difficulty: manifest.metadata.difficulty,
      exerciseCount,
      unlockRequirement: manifest.unlockRequirement,
    });
  }

  // 5. Validate cross-references
  // Check that all manifest exercise references have corresponding JSON files
  for (const [exerciseId, info] of exerciseToLesson) {
    if (!seenIds.has(exerciseId)) {
      errors.push(
        `Lesson manifest ${info.lessonId} references exercise "${exerciseId}" but no JSON file found`
      );
    }
  }

  // Check unlock requirements point to valid lessons
  for (const lesson of lessons) {
    if (lesson.unlockRequirement) {
      const reqLessonId = lesson.unlockRequirement.lessonId;
      if (!lessonManifests.has(reqLessonId)) {
        errors.push(
          `Lesson ${lesson.id} requires ${reqLessonId} but that lesson was not found`
        );
      }
    }
  }

  // 6. Report
  log(`\nResults:`);
  log(`  Exercises: ${exercises.length}`);
  log(`  Lessons:   ${lessons.length}`);

  if (errors.length > 0) {
    log(`\n  ERRORS (${errors.length}):`);
    for (const err of errors) {
      log(`    - ${err}`);
    }
    process.exit(1);
  }

  log(`  Errors:    0`);

  // 7. Write output
  const index: ExerciseIndex = {
    version: 2,
    generatedAt: new Date().toISOString(),
    exercises,
    lessons,
  };

  const output = JSON.stringify(index, null, 2) + '\n';

  if (DRY_RUN) {
    log(`\n[dry-run] Would write ${output.length} bytes to ${OUTPUT_PATH}`);
    log(`\nExercise index preview:\n`);
    log(output);
  } else {
    writeFileSync(OUTPUT_PATH, output, 'utf-8');
    log(`\nWrote ${OUTPUT_PATH} (${output.length} bytes)`);
  }

  log('\nDone.');
}

main();

/**
 * Content Loading Performance Benchmark
 *
 * Measures load times for exercise-index.json and individual exercise files.
 * Extrapolates performance for larger content libraries (600 exercises).
 *
 * Usage:
 *   npx tsx scripts/perf-benchmark.ts
 */

import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.resolve(__dirname, '..', 'content');
const INDEX_PATH = path.join(CONTENT_DIR, 'exercise-index.json');
const EXERCISES_DIR = path.join(CONTENT_DIR, 'exercises');
const PROJECTED_COUNT = 600;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileSizeKB(filePath: string): string {
  const bytes = fs.statSync(filePath).size;
  return (bytes / 1024).toFixed(1);
}

function collectExerciseFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectExerciseFiles(full));
    } else if (entry.name.endsWith('.json')) {
      files.push(full);
    }
  }
  return files.sort();
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

function benchmarkIndexLoad(): { timeMs: number; exerciseCount: number } {
  // Clear require cache so we measure a cold load
  delete require.cache[require.resolve(INDEX_PATH)];

  const start = performance.now();
  const index = require(INDEX_PATH);
  const timeMs = performance.now() - start;

  return { timeMs, exerciseCount: index.exercises?.length ?? 0 };
}

function benchmarkExerciseLoads(files: string[]): {
  avgMs: number;
  totalMs: number;
  count: number;
} {
  // Clear caches
  for (const f of files) {
    delete require.cache[require.resolve(f)];
  }

  const start = performance.now();
  for (const f of files) {
    require(f);
  }
  const totalMs = performance.now() - start;

  return {
    avgMs: files.length > 0 ? totalMs / files.length : 0,
    totalMs,
    count: files.length,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('=== Purrrfect Keys Performance Benchmark ===\n');

  // 1. Index load
  const indexResult = benchmarkIndexLoad();
  console.log(
    `Exercise index: ${indexResult.timeMs.toFixed(1)}ms (${indexResult.exerciseCount} exercises)`
  );

  // 2. Individual exercise files
  const exerciseFiles = collectExerciseFiles(EXERCISES_DIR);
  const exerciseResult = benchmarkExerciseLoads(exerciseFiles);
  console.log(
    `Single exercise load: ${exerciseResult.avgMs.toFixed(1)}ms avg (${exerciseResult.count} files)`
  );
  console.log(`All exercises sequential: ${exerciseResult.totalMs.toFixed(1)}ms`);

  // 3. Projection
  const projectedMs =
    exerciseResult.count > 0
      ? (exerciseResult.totalMs / exerciseResult.count) * PROJECTED_COUNT
      : 0;
  console.log(
    `Projected ${PROJECTED_COUNT} exercises: ~${projectedMs.toFixed(0)}ms`
  );

  // 4. Memory info
  console.log(`\nMemory:`);
  console.log(`  exercise-index.json = ${fileSizeKB(INDEX_PATH)}KB`);

  // Total exercise content on disk
  let totalExerciseBytes = 0;
  for (const f of exerciseFiles) {
    totalExerciseBytes += fs.statSync(f).size;
  }
  console.log(`  All exercise files = ${(totalExerciseBytes / 1024).toFixed(1)}KB (${exerciseFiles.length} files)`);
  console.log(`  Avg exercise file = ${(totalExerciseBytes / exerciseFiles.length / 1024).toFixed(1)}KB`);

  // Runtime memory: load all exercises and measure heap
  const heapBefore = process.memoryUsage().heapUsed;
  const allExercises = [];
  for (const f of exerciseFiles) {
    delete require.cache[require.resolve(f)];
    allExercises.push(require(f));
  }
  const heapAfter = process.memoryUsage().heapUsed;
  const heapDeltaMB = (heapAfter - heapBefore) / (1024 * 1024);
  console.log(`  Heap delta (${exerciseFiles.length} exercises loaded) = ${heapDeltaMB.toFixed(1)}MB`);

  // Serialized size of all exercises
  const serialized = JSON.stringify(allExercises);
  console.log(`  Serialized (all exercises) = ${(serialized.length / 1024).toFixed(1)}KB`);
}

main();

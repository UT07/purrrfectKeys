# Performance Baseline

**Measured:** March 16, 2026
**Content:** 599 exercises, 50 lessons, 582 songs, 120 skill nodes
**Environment:** Jest (Node.js), macOS — times represent JS execution, not device rendering

## Content Loading

| Operation | Measured | Budget | Notes |
|-----------|----------|--------|-------|
| `getLessons()` | <1ms | 5ms | Returns cached lesson array |
| `getLessonCount()` | <1ms | 1ms | Array length check |
| `getExercise(id)` | <1ms | 10ms | Lazy-loaded via registry, cached after first load |
| `getLessonExercises(id)` | <1ms | 50ms | Loads all exercises for one lesson |
| `getExerciseMetadata(id)` | <1ms | 2ms | O(1) Map lookup on pre-built index |
| `getExercisesForLesson(id)` | <1ms | 5ms | O(1) Map lookup |
| `getExercisesBySkill(skill)` | <1ms | 5ms | O(1) Map lookup |
| All 50 lessons sequential | ~173ms | 500ms | Cold load of all lesson exercises |
| All 599 exercises sequential | ~98ms | 200ms | Measured via `scripts/perf-benchmark.ts` |

### Content Index

| Metric | Value |
|--------|-------|
| `exercise-index.json` size | 148.6KB |
| Exercise count in index | 499 (metadata entries) |
| Exercise files on disk | 599 |
| Average exercise load time | 0.2ms |
| Projected load time at 600 exercises | ~98ms |

## Scoring Engine

| Operation | Measured (10K iterations) | Budget |
|-----------|--------------------------|--------|
| `calculateTimingScore()` | ~3ms | 200ms |
| `calculateDurationScore()` | ~2ms | 200ms |

Per-call: ~0.3μs. Well within real-time budget (called once per note during playback).

## Exercise Completion Flow

| Operation | Measured | Budget | Notes |
|-----------|----------|--------|-------|
| Single `recordExerciseCompletion()` | ~1ms | 50ms | Zustand set + challenge checks |
| 100 sequential completions | ~2ms | 500ms | No degradation with repeated calls |

The full `handleExerciseCompletion` callback in ExercisePlayer performs ~15 store operations:
1. `recordPracticeSession` — daily goal minutes
2. `recordExerciseCompletion` — XP, daily/weekly/monthly challenges, gems, streaks
3. Lesson progress update — exercise scores, lesson status, completion check
4. Cloud sync (fire-and-forget) — `syncManager.syncAfterExercise()`
5. Learner profile — note accuracy, skill mastery, recent exercises
6. Difficulty adjustment — tempo range update
7. Streak calculation — `XpSystem.recordPracticeSession()`
8. Achievement checks — perfect scores, high scores, notes played
9. Gem rewards — first-completion, score-based, ability bonuses, chest loot
10. Cat evolution XP — stage transition detection

`__DEV__` performance instrumentation via `perfTrace('ExerciseCompletion')` logs timing for each phase. In dev builds, look for `[PerfTrace: ExerciseCompletion]` in the console.

## ABC Parser

| Operation | Measured | Budget |
|-----------|----------|--------|
| Simple ABC (8 notes) | <1ms | 10ms |
| Complex ABC (32 notes) | <1ms | 20ms |
| 100 complex tunes sequential | ~16ms | 500ms |

## Memory

| Metric | Measured | Budget |
|--------|----------|--------|
| Full metadata index (serialized) | ~100KB | 500KB |
| 50 exercises (full content, serialized) | ~500KB | 2MB |
| State after 200 exercise completions | <50KB | 50KB |

### Runtime Memory (from `scripts/perf-benchmark.ts`)

| Metric | Value |
|--------|-------|
| All exercise files on disk | 1,774KB (599 files, 3.0KB avg) |
| Heap delta loading all 599 exercises | 4.0MB |
| Serialized (all exercises) | 1,180KB |

### Cache behavior
- Exercises are cached after first load (reference equality confirmed)
- `_exerciseCache` is an unbounded `Record<string, Exercise>` — at 599 exercises fully loaded, ~4MB heap
- In practice, most sessions load 5-20 exercises, keeping cache under 200KB

## Audio Latency Budgets (Target — Device)

| Path | Target | Measurement Method |
|------|--------|-------------------|
| Touch → Sound | <20ms | `scripts/measure-latency.ts` |
| MIDI → Sound | <15ms | Hardware MIDI + `AudioContext.outputLatency` |
| Mic → Pitch (monophonic) | <150ms | YIN buffer fill + processing |
| Mic → Pitch (polyphonic) | <150ms | ONNX inference + hysteresis |

See `agent_docs/audio-pipeline.md` for detailed latency breakdowns.

## Batch Operations

| Operation | Measured | Budget |
|-----------|----------|--------|
| Create 1,000 NoteEvent objects | <1ms | 10ms |
| Sort 1,000 notes by startBeat | <1ms | 10ms |
| 500 Map set/get/has cycles | <1ms | 5ms |

## How to Re-measure

```bash
# Jest benchmarks (CI-safe, deterministic)
npm run test:perf

# Content loading benchmark (standalone script)
npx tsx scripts/perf-benchmark.ts

# Audio latency (requires device)
npm run measure:latency
```

## Regression Detection

Performance benchmarks run on every `npm test` execution and in CI. Thresholds are set with 3-5x headroom to avoid flakiness while still catching major regressions (>10x slowdown).

Key files:
- `src/__tests__/performance/benchmarks.test.ts` — 23 benchmarks
- `scripts/perf-benchmark.ts` — standalone content loading profiler
- `src/utils/perfTrace.ts` — `__DEV__`-only instrumentation utility

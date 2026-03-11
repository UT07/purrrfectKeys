# Phase 3 + Phase 2.5 Implementation Plan

**Design spec:** `docs/superpowers/specs/2026-03-11-phase3-content-explosion-design.md`
**Branch:** `feat/phase3-content-explosion`
**PR target:** `master`

---

## Step 1: Performance Benchmark Infrastructure (2.5.1)

**Goal:** Create tooling to measure current performance baselines.

**Files to create:**
- `scripts/perf-benchmark.ts` — Automated timing measurements

**Files to modify:**
- `src/screens/ExercisePlayer/ExercisePlayer.tsx` — Add `performance.now()` instrumentation behind `__DEV__` flag
- `src/stores/progressStore.ts` — Time `recordExerciseCompletion()` flow

**What to measure:**
1. App startup → HomeScreen render (wrap in `AppLoadingTimer`)
2. Exercise JSON load time (`ContentLoader.getExercise()`)
3. Post-exercise flow: last note → CompletionModal visible
4. `recordExerciseCompletion()` breakdown (each async step)
5. ExpoAudioEngine.initialize() duration

**Implementation:**
```typescript
// scripts/perf-benchmark.ts
// Node script that imports ContentLoader and benchmarks:
// - Loading all 30 exercises sequentially
// - Loading exercise-index.json
// - Simulating 600 exercise index lookups
```

**Tests:** None needed (dev tooling).
**Commit message:** `perf: add performance benchmark infrastructure`

---

## Step 2: Performance Baseline + Post-Exercise Fix (2.5.2, 2.5.3)

**Goal:** Document current metrics, then fix the post-exercise delay.

**Files to create:**
- `docs/performance-baseline.md` — Current metrics snapshot

**Files to modify:**
- `src/stores/progressStore.ts` — Parallelize `recordExerciseCompletion()`:
  - Currently: XP → achievements → league XP → activity feed → gems (sequential awaits)
  - Fix: `Promise.all()` for independent writes, defer non-critical (activity feed, analytics)
- `src/screens/ExercisePlayer/CompletionModal.tsx` — Don't await AI coaching; show modal immediately, stream coaching text in when ready
- `src/services/ai/CoachingService.ts` — Make coaching call fire-and-forget with callback

**Key insight:** The user feels post-exercise delay. The fix is:
1. Show CompletionModal immediately with score (local calculation, instant)
2. Fire Firestore writes + AI coaching in parallel, in background
3. Coaching text appears with a subtle fade-in when the API responds

**Tests:** Update CompletionModal tests to verify it renders without waiting for coaching.
**Commit message:** `perf: parallelize post-exercise writes and defer AI coaching`

---

## Step 3: ExercisePlayer Render Audit (2.5.5)

**Goal:** Ensure 60fps during gameplay with ComboGlow active.

**Files to modify:**
- `src/components/PianoRoll/VerticalPianoRoll.tsx` — Audit re-renders, add `React.memo` boundaries
- `src/components/common/ComboGlow.tsx` — Verify Reanimated worklet runs on UI thread (not JS)
- `src/components/common/ComboMeter.tsx` — Memo with shallow comparison
- `src/components/Keyboard/Keyboard.tsx` — Verify per-key memo works (Zustand selector pattern)
- `src/screens/ExercisePlayer/ExercisePlayer.tsx` — Profile re-render count per frame

**Approach:**
1. Add `React.Profiler` wrapper in dev mode
2. Use `useRenderCount` dev hook to identify hot components
3. Fix any component re-rendering on every frame

**Tests:** None needed (dev profiling).
**Commit message:** `perf: optimize ExercisePlayer render performance`

---

## Step 4: Extend ExerciseType Union + Base Infrastructure (3.1a)

**Goal:** Add the 11 new exercise types to the type system and ExerciseValidator.

**Files to modify:**
- `src/core/exercises/types.ts`:
  - Extend `ExerciseType` union:
    ```typescript
    export type ExerciseType =
      | 'play' | 'rhythm' | 'earTraining' | 'chordId' | 'sightReading' | 'callResponse'
      // New interaction types
      | 'fillInTheBlank' | 'spotTheError' | 'intervalQuiz' | 'chordBuilder' | 'keySignatureId'
      // Gamified wrappers
      | 'bossBattle' | 'duet' | 'speedRun' | 'endlessMode' | 'teacherChallenge'
      // Creative
      | 'improvisation';
    ```
  - Add new interfaces: `FillInTheBlankConfig`, `SpotTheErrorConfig`, `IntervalQuizConfig`, `ChordBuilderConfig`, `KeySignatureIdConfig`
  - Add `BossBattleConfig` (modifiers, lives), `DuetConfig` (cat part, player part), `SpeedRunConfig` (exercise chain), `EndlessModeConfig` (difficulty ramp), `TeacherChallengeConfig` (technique goal), `ImprovisationConfig` (chord progression, scale)
  - Add optional `typeConfig` field to `Exercise` interface

- `src/core/exercises/ExerciseValidator.ts`:
  - Add validation branches for new types (most delegate to existing scoring with modified rules)
  - `fillInTheBlank`: Score only gap positions
  - `spotTheError`: Binary correct/wrong
  - `intervalQuiz`: Binary correct/wrong
  - `chordBuilder`: Incremental scoring per correct note
  - `keySignatureId`: Binary correct/wrong
  - Wrappers use existing scoring + wrapper-specific logic

- `src/content/ContentLoader.ts`:
  - Update `ExerciseIndexEntry.type` to include new types

**Tests to create:**
- `src/core/exercises/__tests__/ExerciseValidator.fillInTheBlank.test.ts`
- `src/core/exercises/__tests__/ExerciseValidator.spotTheError.test.ts`
- `src/core/exercises/__tests__/ExerciseValidator.intervalQuiz.test.ts`
- `src/core/exercises/__tests__/ExerciseValidator.chordBuilder.test.ts`
- `src/core/exercises/__tests__/ExerciseValidator.keySignatureId.test.ts`

**Commit message:** `feat: add 11 new exercise types to type system and validator`

---

## Step 5: New Interaction Type UIs (3.1b)

**Goal:** Build the 5 new interaction type screen variants in ExercisePlayer.

**Files to create:**
- `src/screens/ExercisePlayer/variants/FillInTheBlankPlayer.tsx`
- `src/screens/ExercisePlayer/variants/SpotTheErrorPlayer.tsx`
- `src/screens/ExercisePlayer/variants/IntervalQuizPlayer.tsx`
- `src/screens/ExercisePlayer/variants/ChordBuilderPlayer.tsx`
- `src/screens/ExercisePlayer/variants/KeySignatureIdPlayer.tsx`

**Files to modify:**
- `src/screens/ExercisePlayer/ExercisePlayer.tsx` — Route to variant based on `exercise.type`
- `src/components/PianoRoll/VerticalPianoRoll.tsx` — Add "gap" rendering for fill-in-the-blank (greyed bars)
- `src/components/Keyboard/Keyboard.tsx` — Add "highlight 4 keys" mode for spot-the-error

**Design notes:**
- Each variant wraps the existing ExercisePlayer layout but customizes the interaction model
- They share: Keyboard, PianoRoll, TopBar, CompletionModal
- They differ: instructions overlay, input handling, visual feedback

**Tests:**
- `src/screens/ExercisePlayer/variants/__tests__/FillInTheBlankPlayer.test.tsx` (etc.)

**Commit message:** `feat: implement 5 new interaction type UIs`

---

## Step 6: Gamified Wrapper System (3.1c)

**Goal:** Build the 5 gamified wrapper modes.

**Files to create:**
- `src/core/exercises/wrappers/BossBattleEngine.ts` — Modifier system (tempo ramp, dark keys, flip)
- `src/core/exercises/wrappers/DuetEngine.ts` — Cat part playback + split scoring
- `src/core/exercises/wrappers/SpeedRunEngine.ts` — Timer + exercise chain
- `src/core/exercises/wrappers/EndlessModeEngine.ts` — Progressive difficulty, personal best
- `src/core/exercises/wrappers/TeacherChallengeEngine.ts` — Technique goal evaluation
- `src/screens/ExercisePlayer/wrappers/BossBattleOverlay.tsx` — Boss cat UI, lives, modifiers
- `src/screens/ExercisePlayer/wrappers/SpeedRunOverlay.tsx` — Timer UI, exercise counter
- `src/screens/ExercisePlayer/wrappers/EndlessModeOverlay.tsx` — Streak counter, personal best

**Files to modify:**
- `src/screens/ExercisePlayer/ExercisePlayer.tsx` — Detect wrapper type, apply wrapper engine
- `src/core/rewards/chestSystem.ts` — Boss battle rare loot chest rewards

**Key insight:** Wrappers are NOT separate screens. They're overlays/modifiers on ExercisePlayer:
- Boss Battle: wraps any exercise type + adds modifiers
- Duet: wraps play exercises + adds cat accompaniment
- Speed Run: chains 5 exercises + adds timer
- Endless Mode: generates exercises on-the-fly + tracks streak
- Teacher Challenge: wraps any exercise + adds technique goal overlay

**Tests:**
- `src/core/exercises/wrappers/__tests__/BossBattleEngine.test.ts` (etc. — pure TS)

**Commit message:** `feat: implement 5 gamified wrapper engines and overlays`

---

## Step 7: Improvisation Mode (3.1d)

**Goal:** Build the creative improvisation exercise type.

**Files to create:**
- `src/core/exercises/ImprovisationScorer.ts` — Score: % in-key, rhythmic variety, chord tone usage
- `src/screens/ExercisePlayer/variants/ImprovisationPlayer.tsx` — Free play with chord backing + dimmed out-of-key keys

**Files to modify:**
- `src/components/Keyboard/Keyboard.tsx` — Add "dim out-of-key" mode (opacity per key based on scale)
- `src/audio/ExpoAudioEngine.ts` — Add chord backing track playback (or generate from chord progression)

**Tests:**
- `src/core/exercises/__tests__/ImprovisationScorer.test.ts`

**Commit message:** `feat: implement improvisation exercise type with in-key scoring`

---

## Step 8: Batch Exercise Generation Pipeline (3.2)

**Goal:** Build the tooling to generate 570 exercises programmatically.

**Files to create/modify:**
- `scripts/batch-generate-exercises.ts` (exists as stub, flesh out):
  - Read `scripts/lesson-specs.json` (exercise specifications per lesson)
  - Call Gemini Flash to generate exercise JSON per spec
  - Validate each generated exercise
  - Write to `content/exercises/lesson-NN/`
  - Generate/update `content/exercise-index.json`
- `scripts/lesson-specs.json` (exists as stub, flesh out):
  - 40 lessons × skill targets × exercise types × difficulty curves
- `scripts/validate-exercise.ts` (exists as stub, flesh out):
  - MIDI range check (21-108)
  - Beat alignment (no overlaps unless chords)
  - Key signature coherence
  - Difficulty progression within lesson
  - Hand stretch validation (<= octave for beginners)

**Commit message:** `feat: build batch exercise generation pipeline`

---

## Step 9: Generate 570 Exercises (3.3)

**Goal:** Run the pipeline and produce the exercise content.

**Process:**
1. Define lesson specs for all 40 lessons in `lesson-specs.json`
2. Run `scripts/batch-generate-exercises.ts` — generates exercises in batches
3. Run `scripts/validate-exercise.ts` on all output
4. Regenerate `content/exercise-index.json` with all 600 entries
5. Spot-check 10% of exercises for playability
6. Update `src/content/ContentLoader.ts` static require registry for lessons 1-6 (existing), lazy load 7-40

**Files created:** ~570 JSON files in `content/exercises/lesson-07/` through `content/exercises/lesson-40/`
**Files modified:** `content/exercise-index.json`, `content/lessons/lesson-07.json` through `content/lessons/lesson-40.json`

**Commit message:** `content: generate 570 exercises across 40 lessons (17 types)`

---

## Step 10: ContentLoader Lazy Loading (2.5.4 / 3.11)

**Goal:** Scale ContentLoader from 30 to 600+ without startup impact.

**Files to modify:**
- `src/content/ContentLoader.ts`:
  - Keep static `require()` for lessons 1-6 (30 exercises — instant, no regression)
  - Add dynamic loading for lessons 7-40 (570 exercises):
    ```typescript
    // LRU cache for dynamically loaded exercises
    const exerciseCache = new Map<string, Exercise>();
    const MAX_CACHE = 50;

    export async function getExercise(id: string): Promise<Exercise> {
      // Check static registry first (lessons 1-6)
      if (EXERCISE_REGISTRY[id]) return EXERCISE_REGISTRY[id];
      // Check cache
      if (exerciseCache.has(id)) return exerciseCache.get(id)!;
      // Dynamic load
      const meta = getExerciseMetadata(id);
      if (!meta) throw new Error(`Unknown exercise: ${id}`);
      const exercise = await loadExerciseDynamic(meta.lessonId, id);
      // LRU evict if needed
      if (exerciseCache.size >= MAX_CACHE) {
        const oldest = exerciseCache.keys().next().value;
        exerciseCache.delete(oldest);
      }
      exerciseCache.set(id, exercise);
      return exercise;
    }
    ```
  - Add `preloadLesson(lessonId)` to batch-load an upcoming lesson
  - Keep `getExerciseMetadata()` synchronous (index already loaded)

- `src/stores/exerciseStore.ts` — Update `startExercise()` to handle async `getExercise()`
- `src/screens/ExercisePlayer/ExerciseLoadingScreen.tsx` — Already exists, naturally covers async load time

**Tests:**
- `src/content/__tests__/ContentLoader.lazy.test.ts` — LRU eviction, preload, cache hit/miss

**Commit message:** `feat: lazy-load exercises 7-40 with LRU cache (keeps 1-6 static)`

---

## Step 11: Song Library Expansion (3.4, 3.5)

**Goal:** Import 375 new songs to reach 500+ total.

**Scripts to run/modify:**
- `scripts/import-thesession.ts` — Run for 150 more folk/Celtic tunes
- `scripts/import-pdmx.py` — Expand to 100 more classical pieces (Chopin, Debussy, Schumann)
- `scripts/generate-songs.ts` — Generate 75 pop/film/game songs via Gemini
- New: `scripts/import-hymns.ts` — Import 50 public domain hymns

**Each song gets:**
- `requiredSkills: string[]` — auto-tagged from key signature + complexity
- `tier: number` — auto-classified from difficulty analysis
- `difficulty: 'easy' | 'medium' | 'hard'` — 3 arrangements per popular song

**Validation:** Run `scripts/verify-songs.ts` on all 500+
**Commit message:** `content: expand song library to 500+ (folk, classical, pop, hymns)`

---

## Step 12: Song-Curriculum Integration (3.6)

**Goal:** Songs appear as exercises within lessons, gated by skill mastery.

**Files to modify:**
- `src/core/songs/songTypes.ts` — Add `requiredSkills: string[]` and `tier: number` to Song interface
- `src/services/songService.ts` — Add `getSongsForTier(tier)` and `getUnlockedSongs(masteredSkills)` queries
- `src/core/curriculum/CurriculumEngine.ts` — Add song exercises to `generateSessionPlan()`:
  - After warmup + lesson selection, check for unlocked songs at current tier
  - Insert 1-2 song exercises into `lesson` array if available
- `src/screens/LevelMapScreen.tsx` — Add reward nodes between tier clusters showing unlocked songs
- `src/stores/songStore.ts` — Add `unlockedSongIds` derived from learnerProfile mastered skills

**Tests:**
- `src/core/curriculum/__tests__/CurriculumEngine.songs.test.ts`

**Commit message:** `feat: integrate songs into curriculum with skill-gated unlocks`

---

## Step 13: Learning Path System (3.7, 3.8, 3.9)

**Goal:** 5 learning paths with shared trunk + path-specific variants.

**Files to create:**
- `content/paths/piano-basics.json` — Default path manifest
- `content/paths/pop-film.json` — Song-heavy, chord-first
- `content/paths/classical.json` — Technique + repertoire
- `content/paths/jazz-blues.json` — Voicings + improv
- `content/paths/kids.json` — Simplified + gamified
- `src/core/curriculum/LearningPath.ts` — Path types + loader
- `src/screens/PathSelectionScreen.tsx` — Path picker UI (5 cards with descriptions)

**Files to modify:**
- `src/core/curriculum/CurriculumEngine.ts` — Read active path, swap exercises per manifest
- `src/screens/OnboardingScreen.tsx` — Add path selection step (after cat selection)
- `src/stores/settingsStore.ts` — Add `learningPath: LearningPathId` setting
- `src/screens/LevelMapScreen.tsx` — Show path-specific nodes
- `src/screens/ProfileScreen.tsx` — Path switcher in settings section

**Path manifest format:**
```json
{
  "id": "pop-film",
  "name": "Pop & Film",
  "description": "Learn to play songs you know and love",
  "icon": "music-note",
  "branchesAt": "lesson-05",
  "lessonOverrides": {
    "lesson-05": { "swap": { "lesson-05-ex-03": "lesson-05-pop-ex-03" } },
    "lesson-06": { "swap": { "lesson-06-ex-02": "lesson-06-pop-ex-02" } }
  },
  "additionalSongs": ["song-let-it-be-easy", "song-clocks-easy"],
  "emphasizeSkills": ["chords", "chord-progressions", "lead-sheets"]
}
```

**Tests:**
- `src/core/curriculum/__tests__/LearningPath.test.ts`
- `src/core/curriculum/__tests__/CurriculumEngine.paths.test.ts`

**Commit message:** `feat: implement 5 learning paths with shared trunk architecture`

---

## Step 14: Daily Challenge Expansion (3.10)

**Goal:** Add Speed Run and Teacher Challenge to daily challenge system.

**Files to modify:**
- `src/core/challenges/challengeSystem.ts`:
  - Add `'speed-run'` and `'teacher-challenge'` to `DailyChallengeType`
  - Add generators for new types
  - Speed Run: pick 5 exercises from current tier, set time target
  - Teacher Challenge: pick technique goal (tempo, dynamics, legato) + exercise

**Files to create:**
- `src/screens/SpeedRunScreen.tsx` — 5-exercise timed chain UI
- `src/screens/TeacherChallengeScreen.tsx` — Technique goal + Salsa commentary

**Tests:**
- Update `src/core/challenges/__tests__/challengeSystem.test.ts`

**Commit message:** `feat: add Speed Run and Teacher Challenge daily challenge types`

---

## Step 15: LevelMap Visual Updates (3.12)

**Goal:** Add reward, boss, and song nodes to the level map.

**Files to modify:**
- `src/screens/LevelMapScreen.tsx`:
  - New node types: `reward` (song unlock), `boss` (boss battle), `song` (song exercise)
  - Boss nodes: larger, red border, boss cat icon
  - Reward nodes: between tier clusters, gift icon
  - Song nodes: music note icon
  - Path indicator badge per node

**Tests:** Snapshot tests for new node variants.
**Commit message:** `feat: add reward, boss, and song nodes to LevelMap`

---

## Step 16: Song Search + Validation CI (3.13, 3.14)

**Goal:** Improve song search and add CI validation for all content.

**Files to modify:**
- `src/stores/songStore.ts` — Add client-side fuzzy search (for offline) + Firestore text search
- `src/screens/SongLibraryScreen.tsx` — Improved search UX with filters

**Files to create/modify:**
- `.github/workflows/ci.yml` — Add exercise + song validation step:
  ```yaml
  validate-content:
    name: Validate Content
    runs-on: ubuntu-latest
    steps:
      - run: npx ts-node scripts/validate-exercise.ts --all
      - run: npx ts-node scripts/verify-songs.ts --local
  ```

**Commit message:** `feat: improve song search and add content validation to CI`

---

## Step 17: Memory Profiling + Final Polish (2.5.6)

**Goal:** Verify memory stays bounded with 600+ exercises.

**What to check:**
- LRU cache eviction works correctly (max 50 exercises in memory)
- Audio pool doesn't grow unbounded
- Exercise-index.json memory footprint (~50KB, acceptable)
- Firestore listener cleanup on screen unmount

**Commit message:** `perf: verify memory bounds with expanded content library`

---

## PR Strategy

Each step above is a separate commit on `feat/phase3-content-explosion`. When all steps are done:

1. Ensure all tests pass: `npm run typecheck && npm run test`
2. Create PR to `master` with summary of all changes
3. The existing CI workflow will validate: typecheck + lint + test + content validation

For very large steps (3.3 — 570 exercises), consider splitting into sub-branches:
- `feat/phase3-exercises-tier1-6`
- `feat/phase3-exercises-tier7-15`

This keeps PRs reviewable.

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| Generated exercises have playability issues | Spot-check 10%, automated validation, human review of tier 1-3 |
| 600 exercise JSONs bloat app bundle | Lazy loading + only bundle metadata index (50KB) + lessons 1-6 |
| Gemini rate limits during batch generation | Batch with 1s delay between calls, retry with backoff |
| New exercise types break existing scoring | New types have dedicated validator branches, existing types untouched |
| Learning path manifests get out of sync | CI validates all path references resolve to real exercises |
| Song import quality varies | verify-songs.ts catches invalid ABC, bad note ranges, missing metadata |

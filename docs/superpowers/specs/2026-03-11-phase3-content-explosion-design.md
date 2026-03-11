# Phase 3: Content Explosion + Phase 2.5: Performance Audit

**Date:** 2026-03-11
**Status:** Approved (revised after spec review)
**Parallel tracks:** Phase 2.5 (performance) runs alongside Phase 3 (content)
**Phase split:** Phase 3a (content scaling, existing types) → Phase 3b (new exercise types)

---

## Executive Summary

Phase 3 scales Purrrfect Keys from 30 exercises to 600+, from 124 songs to 500+, adds 5 learning paths, and introduces 11 new exercise types (17 total). All content is pre-generated and bundled for offline-first operation.

Phase 2.5 runs in parallel: profile current performance, establish baselines, and fix bottlenecks before the content load multiplies them.

**Phase split rationale:** The 11 new exercise types each require unique data schemas, scoring strategies, and UI components. To avoid blocking content scaling on type implementations, Phase 3 is split:
- **Phase 3a:** Scale to 600+ exercises using existing 6 types, lazy loading, songs, paths. Can start immediately.
- **Phase 3b:** Implement 11 new exercise types with full schema definitions. Depends on 3a infrastructure.

---

## Phase 2.5: Performance Audit

### Problem

The app feels slow during gameplay and after exercise completion. No performance testing infrastructure exists. Adding 20x more content without addressing this will compound the issue.

### Profiling Targets

| Area | What to Measure | Tool | Target |
|------|----------------|------|--------|
| Gameplay FPS | ExercisePlayer render during active play | React DevTools Profiler, `requestAnimationFrame` counter | Sustained 60fps |
| Post-exercise delay | Time from last note to CompletionModal visible | `performance.now()` spans | <500ms |
| Startup time | App launch to HomeScreen interactive | Expo startup trace | <2s (cold), <500ms (warm) |
| Content loading | Time to load exercise JSON + initialize | Custom benchmarks | <50ms per exercise |
| Memory | Peak RSS during exercise playback | Xcode Instruments | <200MB |
| Firestore reads | Reads per 30-min session | Firebase debug logging | <200 reads |
| Audio init | ExpoAudioEngine.initialize() duration | Timer | <1s |

### Likely Bottlenecks (to investigate)

1. **Post-exercise Firestore writes**: `recordExerciseCompletion()` does progress sync, XP update, achievement check, league XP update, activity feed post, and gem earn — possibly all sequential
2. **AI coaching call**: Gemini API call blocks CompletionModal render
3. **ContentLoader static require()**: All 30 exercises loaded synchronously at import time — will not scale to 500+
4. **PianoRoll re-renders**: Transform-based scroll may be triggering unnecessary child re-renders
5. **ComboGlow/ComboMeter**: Full-screen animated overlay during every combo — check if it drops frames

### Deliverables

| # | Deliverable | Description |
|---|------------|-------------|
| 2.5.1 | `scripts/perf-benchmark.ts` | Automated timing for startup, exercise load, completion flow |
| 2.5.2 | Performance baseline doc | Current metrics snapshot before Phase 3 |
| 2.5.3 | Post-exercise optimization | Parallelize Firestore writes, defer non-critical work |
| 2.5.4 | ContentLoader lazy loading | Shared with Phase 3 task 3.11 — metadata index + on-demand loading |
| 2.5.5 | ExercisePlayer render audit | Identify and fix unnecessary re-renders, memo boundaries |
| 2.5.6 | Memory profiling | Audio pool sizing, content cache limits |

### Success Criteria

- Post-exercise delay <500ms (currently estimated 1-2s)
- Startup time doesn't increase when content scales from 30 to 600 exercises
- Gameplay maintains 60fps with ComboGlow active
- Memory stays under 200MB during extended play sessions

---

## Phase 3: Content Explosion

### Content Volume

| Category | Current | Target | Method |
|----------|---------|--------|--------|
| Exercises | 30 | 600+ | Pre-generated via batch scripts |
| Songs | 124 | 500+ | Import scripts + Gemini generation |
| Learning paths | 1 | 5 | JSON manifests over shared exercise pool |
| Exercise types | 6 | 17 | 11 new types (5 interactions, 5 wrappers, 1 creative) |

### Exercise Architecture

#### 17 Exercise Types

**Existing 6 (unchanged):**
1. Play — see notes, play them
2. Rhythm — tap timing patterns
3. Ear Training — listen, play back
4. Chord ID — see name, play chord
5. Sight Reading — staff notation, no hints
6. Call & Response — Salsa plays, you copy

**New Interaction Types (5):**

7. **Fill-in-the-Blank** — Melody plays with gaps. Player fills missing notes. PianoRoll shows greyed-out placeholder bars. Skills: melodic prediction, pattern recognition.

8. **Spot the Error** — Hear a melody with one wrong note. Tap where the error was. Multiple choice: 4 highlighted keys. Skills: critical listening, pitch accuracy.

9. **Interval Quiz** — Hear two notes, identify the interval (minor 3rd, perfect 5th, etc.) by tapping a button. Or: given interval name, play it from root. Skills: interval recognition, theory.

10. **Chord Builder** — Given root + chord type (e.g. "Build Cm7"), construct note by note. Visual feedback shows correct notes as added. Skills: chord theory, voicings.

11. **Key Signature ID** — Hear a short passage, identify the key (4-option multiple choice). Or: see key signature on staff, play the scale. Skills: key recognition, scales.

**Gamified Wrappers (5):**

12. **Boss Battle** — Tier-end epic challenge. Boss cat throws modifiers: tempo ramps, keys go dark, notes flip. 3 lives. Defeat = rare loot chest. Appears: end of each tier (15 total).

13. **Duet** — Cat plays left hand, you play right (or vice versa). Cat complexity matches evolution stage. Cooperative scoring. Appears: bonus exercises in lessons.

14. **Speed Run** — 5 short exercises, clock ticking. Stars based on time + accuracy. Leaderboard per tier. Appears: daily challenges.

15. **Endless Mode** — Progressive difficulty, no mistakes allowed. Notes get faster, patterns harder. Personal best tracking. Appears: unlocked per tier as reward.

16. **Teacher Challenge** — Salsa says "Can you play this faster/louder/smoother?" Specific technique goals with cat personality commentary. Appears: daily sessions.

17. **Improvisation** — Given chord progression + scale, play freely for 8-16 bars. Scoring: % in-key, rhythmic variety, chord tone usage. Keys outside scale dimmed. Unlocked at tier 10+.

#### Exercise JSON Schema Extensions (Phase 3b)

Each new type extends the base `Exercise` interface with a `typeConfig` field. The existing `notes: NoteEvent[]` array is reused where possible.

```typescript
// Added to Exercise interface:
interface Exercise {
  // ... existing fields ...
  typeConfig?: ExerciseTypeConfig; // New — type-specific configuration
}

type ExerciseTypeConfig =
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

// --- New Interaction Types ---

interface FillInTheBlankConfig {
  kind: 'fillInTheBlank';
  gapIndices: number[];       // Indices into notes[] that are hidden
  playFullFirst: boolean;     // Play full melody before gaps appear
}
// Scoring: only gap positions scored. notes[] contains ALL notes; gapIndices marks blanks.

interface SpotTheErrorConfig {
  kind: 'spotTheError';
  wrongNoteIndex: number;     // Which note in notes[] is wrong
  correctNote: number;        // What the right MIDI note should be
  options: number[];          // 4 MIDI notes to highlight as choices
}
// Scoring: binary — tapped correct key = 100%, wrong = 0%.

interface IntervalQuizConfig {
  kind: 'intervalQuiz';
  mode: 'identify' | 'play'; // Identify: hear interval, pick name. Play: see name, play it.
  intervalName: string;       // e.g. "minor 3rd", "perfect 5th"
  rootNote: number;           // MIDI note of the root
  targetNote: number;         // MIDI note of the interval
  options?: string[];         // Multiple choice options for 'identify' mode
}
// Scoring: binary for identify. For play: standard pitch matching from root+interval.

interface ChordBuilderConfig {
  kind: 'chordBuilder';
  rootNote: number;           // MIDI note of chord root
  chordType: string;          // e.g. "major", "minor", "7", "m7", "dim"
  expectedNotes: number[];    // Correct MIDI notes for the chord
  maxAttempts: number;        // Notes allowed before scoring
}
// Scoring: incremental — each correct note adds to score. Order doesn't matter.

interface KeySignatureIdConfig {
  kind: 'keySignatureId';
  mode: 'listen' | 'read';   // Listen: hear passage, pick key. Read: see staff, play scale.
  correctKey: string;         // e.g. "G major", "D minor"
  options: string[];          // 4 key choices for 'listen' mode
  passage?: NoteEvent[];      // Short passage to play (listen mode)
  scaleNotes?: number[];      // Expected scale notes (read mode)
}
// Scoring: binary for listen. Standard pitch matching for read/play-scale.

// --- Gamified Wrappers ---

interface BossBattleConfig {
  kind: 'bossBattle';
  bossName: string;           // e.g. "Dissonance Dragon"
  lives: number;              // Default 3
  modifiers: BossModifier[];  // Applied progressively
  lootTier: 'common' | 'rare' | 'epic' | 'legendary';
}
interface BossModifier {
  triggerAtPercent: number;    // 0-100, when in the exercise this activates
  type: 'tempoRamp' | 'darkKeys' | 'flipNotes' | 'narrowWindow';
  value: number;              // tempoRamp: BPM increase. darkKeys: % keys hidden.
}
// Scoring: standard scoring + lives system. Miss 3 notes = lose a life.

interface DuetConfig {
  kind: 'duet';
  catPart: NoteEvent[];       // Notes the cat plays (auto-played by audio engine)
  playerPart: NoteEvent[];    // Notes the player must play (scored)
  catHand: 'left' | 'right';
}
// Scoring: only playerPart scored. catPart plays automatically. notes[] = playerPart.

interface SpeedRunConfig {
  kind: 'speedRun';
  exerciseIds: string[];      // 5 exercise IDs to chain
  timeLimitSeconds: number;   // Total time for all 5
  starThresholdSeconds: [number, number, number]; // Time-based star thresholds
}
// Scoring: aggregate accuracy across 5 exercises + time bonus.

interface EndlessModeConfig {
  kind: 'endlessMode';
  startTempo: number;         // Starting BPM
  tempoIncrement: number;     // BPM added per round
  patternPool: string[];      // Exercise IDs to draw from
  personalBestKey: string;    // Storage key for tracking best streak
}
// Scoring: rounds survived. One miss = game over.

interface TeacherChallengeConfig {
  kind: 'teacherChallenge';
  goal: 'faster' | 'louder' | 'softer' | 'legato' | 'staccato';
  targetValue: number;        // Goal-specific (BPM for faster, velocity for louder)
  salsaDialogue: string[];    // Commentary lines from Salsa
}
// Scoring: standard + technique goal bonus (0-20 points).

// --- Creative ---

interface ImprovisationConfig {
  kind: 'improvisation';
  chordProgression: Array<{ chord: string; durationBeats: number }>;
  scale: string;              // e.g. "C major", "A minor pentatonic"
  scaleNotes: number[];       // MIDI notes in the scale (for key dimming)
  bars: number;               // 8 or 16
  backingTrack?: string;      // Optional backing track asset ID
}
// Scoring: % notes in-key (40%), rhythmic variety (30%), chord tone usage (30%).
// No "expected notes" — entirely freeform. Uses ImprovisationScorer.
```

#### Exercise Distribution (600+)

| Block | Lessons | Core Exercises | Bonus | Boss Battles | Total |
|-------|---------|---------------|-------|-------------|-------|
| Beginner (Tier 1-3) | 1-6 | 60 | 12 | 3 | 75 |
| Early Intermediate (Tier 4-6) | 7-12 | 72 | 15 | 3 | 90 |
| Intermediate (Tier 7-9) | 13-20 | 96 | 18 | 3 | 117 |
| Upper Intermediate (Tier 10-12) | 21-28 | 96 | 18 | 3 | 117 |
| Advanced (Tier 13-14) | 29-36 | 96 | 18 | 2 | 116 |
| Mastery (Tier 15) | 37-40 | 48 | 12 | 1 | 61 |
| **Standalone** | — | ~50 drills | — | — | 50 |
| **Total** | 40 | 518 | 93 | 15 | **626** |

Each lesson contains:
- 8-10 core exercises (mix of types, progressive difficulty)
- 2-3 bonus exercises (duets, song exercises)
- 1-2 song exercises integrated into curriculum
- Boss battle at tier end

Plus ~150 path-specific exercise variants layered on top.

### Lesson Structure (per lesson)

```
Lesson N: [Title]
├── Core exercises (8-10)
│   ├── 2-3 Play exercises (fundamentals)
│   ├── 1-2 Rhythm exercises
│   ├── 1 Ear Training or Call & Response
│   ├── 1 new type (Fill-in-Blank, Interval Quiz, etc.)
│   └── 1 Sight Reading (tier 5+)
├── Bonus exercises (2-3)
│   ├── 1 Duet with cat companion
│   └── 1-2 Song exercises (unlocked by mastered skills)
└── [Boss Battle at tier-end lessons]
```

### Song-Curriculum Integration

Songs are NOT siloed in the Song Library tab. They appear as exercises within lessons:

- **Skill-gated unlocks**: Songs have `requiredSkills: string[]` metadata. Mastering C major position unlocks "Twinkle Twinkle" (Easy). Mastering both-hands unlocks "Let It Be" (Easy).
- **Tier-appropriate**: Tier 1-3 get nursery rhymes/folk, Tier 4-6 get easy pop, Tier 7-9 get classical/film, Tier 10+ get full arrangements.
- **LevelMap reward nodes**: Between lesson clusters, reward nodes show unlocked songs. Visual motivation to progress.
- **CurriculumEngine integration**: `generateSessionPlan()` mixes song exercises into daily sessions when earned.

### Song Library Expansion (500+)

| Source | Count | Method |
|--------|-------|--------|
| Existing | 124 | Already in Firestore |
| TheSession.org | +150 | `import-thesession.ts` (existing script, run again) |
| IMSLP/music21 | +100 | `import-pdmx.py` (existing script, expand corpus) |
| Gemini generation | +75 | `generate-songs.ts` (existing script, new prompts) |
| Public domain hymns | +50 | New import script |

Each popular song has 3 difficulty arrangements (Easy/Medium/Hard). All validated via `scripts/verify-songs.ts`.

### 5 Learning Paths

**Architecture: Shared trunk, different seasoning.**

70% of exercises are shared across all paths. 30% are path-specific variants that emphasize different skills.

| Path | Focus | Branches at | Path-Specific Content |
|------|-------|-------------|----------------------|
| **Piano Basics** | Default, well-rounded | — | Standard curriculum |
| **Pop & Film** | Songs you know | Lesson 5 | Chord-first approach, more song exercises, lead sheets |
| **Classical** | Technique & repertoire | Lesson 5 | Scales/arpeggios emphasis, Bach/Mozart/Beethoven pieces |
| **Jazz & Blues** | Chord voicings, improv | Lesson 10 | 7th chords, swing rhythm, blues scale, improvisation earlier |
| **Kids** | Simplified, gamified | Lesson 1 | Shorter exercises, more cat interactions, nursery rhymes, bigger visual cues |

**Implementation:**
- Each path is a JSON manifest: `content/paths/<path-id>.json`
- Manifest references exercises from the shared pool + path-exclusive exercises
- Path selection happens during onboarding (after cat selection) and can be changed in settings
- `CurriculumEngine` reads active path manifest to determine exercise ordering and session composition
- Shared trunk lessons (1-4 for most paths, 1-9 for Jazz) use identical exercises
- Path-specific lessons swap ~30% of exercises for variants that match the path focus

**Path manifest schema:**
```json
{
  "id": "pop-film",
  "name": "Pop & Film",
  "description": "Learn to play songs you know and love",
  "icon": "music-note",
  "branchesAtLesson": 5,
  "sharedLessons": ["lesson-01", "lesson-02", "lesson-03", "lesson-04"],
  "lessonOverrides": {
    "lesson-05": {
      "swap": {
        "lesson-05-ex-03": "lesson-05-pop-ex-03",
        "lesson-05-ex-07": "lesson-05-pop-ex-07"
      },
      "addBonus": ["lesson-05-pop-bonus-song-01"]
    }
  },
  "additionalSongIds": ["song-let-it-be-easy", "song-clocks-easy"],
  "emphasizeSkills": ["chords", "chord-progressions"],
  "deemphasizeSkills": ["scales", "arpeggios"]
}
```

**CurriculumEngine path integration:**
- `generateSessionPlan()` gains an optional `pathId` parameter
- Reads path manifest → applies `lessonOverrides` when selecting exercises
- `emphasizeSkills` increases selection weight for matching exercises
- Falls back to default (Piano Basics) if path not set

**Song-as-exercise data flow:**
Songs appear as exercises within lessons by converting song sections to Exercise format:
- `SongPlayerScreen` sections already have `NoteEvent[]`-compatible data
- A `songToExercise(song, sectionIndex)` utility converts a song section into an `Exercise` object
- Exercise type = `'play'` (reuses existing scoring — no new type needed)
- `exercise.metadata.source = 'song'` flag distinguishes song exercises in UI (music note icon)
- Songs are loaded through `songStore` but wrapped as Exercise for ExercisePlayer
- This keeps the Song and Exercise data models separate while reusing scoring infrastructure

### SkillTree Extension

Current SkillTree has 100 nodes across 15 tiers with `shouldUnlockAnchorLesson()` mapping lessons 1-24. Phase 3 adds lessons 25-40.

**Required changes:**
- Extend `shouldUnlockAnchorLesson()` to map lessons 25-40 to tier prerequisites
- Add ~30 new skill nodes for advanced topics (jazz voicings, improvisation, performance pieces)
- Each new lesson maps to 2-3 skill nodes as prerequisites
- Existing 100 nodes remain unchanged — new nodes extend the DAG

**Mapping (lessons 25-40 → tiers):**
- Lessons 25-28 → Tier 11-12 (Rhythm, Arpeggios)
- Lessons 29-32 → Tier 13 (Expression)
- Lessons 33-36 → Tier 14 (Sight Reading)
- Lessons 37-40 → Tier 15 (Performance)

### Content Generation Pipeline

All content is pre-generated and bundled. No runtime generation needed for core content.

#### Exercise Generation

```
scripts/batch-generate-exercises.ts
├── Input: lesson-specs.json (40 lessons × skill targets × exercise types)
├── Process: Gemini Flash generates exercise JSON per spec
├── Validation: scripts/validate-exercise.ts (MIDI range, beat alignment, scoring)
├── Output: content/exercises/lesson-NN/exercise-NN-MM.json
└── Review: Manual spot-check of generated exercises (playability)
```

**Quality gates:**
1. Schema validation (required fields, types)
2. Music theory validation (notes in key, beats align to time signature)
3. Difficulty progression (exercises within a lesson increase in difficulty)
4. Cross-lesson coherence (no skill gaps between lessons)
5. Playability check (no impossible hand stretches, reasonable tempo)

#### Song Import Pipeline

Existing scripts (`import-thesession.ts`, `import-pdmx.py`, `generate-songs.ts`) extended with:
- Batch mode for 100+ songs per run
- Difficulty auto-classification based on note range, tempo, hand complexity
- `requiredSkills` auto-tagging based on key signature, chord complexity, note range
- Dedup check against existing Firestore songs
- 3-arrangement generation (Easy strips to melody, Medium adds basic harmony, Hard is full)

### ContentLoader Architecture (Lazy Loading)

Current: Static `require()` for all exercises at import time.
New: Metadata index + code-generated require registry.

**Metro limitation:** Metro requires static `require()` strings — no dynamic `import()`. Two viable approaches:

**Approach A (chosen): Code-generated require registry.**
A build-time script generates a `ContentLoaderRegistry.ts` file with all `require()` calls. Exercises are loaded on-demand by calling the registry function.

```typescript
// scripts/generate-content-registry.ts — RUN AT BUILD TIME
// Scans content/exercises/ and generates:

// src/content/ContentLoaderRegistry.generated.ts (auto-generated, do not edit)
const EXERCISE_LOADERS: Record<string, () => Exercise> = {
  'lesson-01-ex-01': () => require('../../content/exercises/lesson-01/exercise-01.json'),
  'lesson-01-ex-02': () => require('../../content/exercises/lesson-01/exercise-02.json'),
  // ... 600 entries — each is a lazy thunk, not loaded until called
  'lesson-40-ex-10': () => require('../../content/exercises/lesson-40/exercise-10.json'),
};
export function loadExercise(id: string): Exercise | null {
  const loader = EXERCISE_LOADERS[id];
  return loader ? loader() : null;
}
```

**Key insight:** Metro resolves `require()` statically but the thunk `() => require(...)` is only _executed_ on demand. The JSON files are bundled but not parsed until the thunk is called. This gives us lazy loading within Metro's constraints.

**Alternative B: `require.context()` (Expo SDK 52+).** Available but less explicit — harder to tree-shake and debug. Keep as fallback if registry approach hits issues.

```typescript
// Alternative using require.context()
const ctx = require.context('../../content/exercises', true, /\.json$/);
function loadExercise(id: string): Exercise | null {
  const path = exerciseIdToPath(id); // e.g. './lesson-01/exercise-01.json'
  return ctx(path);
}
```

**Cache strategy:**
- LRU cache, max 50 exercises in memory
- Current lesson's exercises pre-loaded when lesson starts
- Next lesson pre-fetched after completing current
- Index file (`exercise-index.json`) loaded once at startup, kept in memory (~50KB for 600 exercises)
- Index uses existing array format (matches current `ExerciseIndexEntry[]`)

### Daily & Weekly Content

| Feature | Frequency | Source | Reward |
|---------|-----------|--------|--------|
| Daily Sight-Reading | Daily at midnight UTC | Random from exercise pool, 3 difficulty variants | Gems + leaderboard |
| Weekly Featured Song | Monday | Curated highlight from song library | 3x gem multiplier |
| Teacher Challenge | Daily | Salsa-generated technique goal | XP + cat personality commentary |
| Speed Run | Daily | 5-exercise timed chain from current tier | Stars + tier leaderboard |

Daily challenges use the existing `challengeSystem.ts` framework (deterministic date-hash). New challenge types (Speed Run, Teacher Challenge) are added as challenge generators.

### LevelMap Updates

Current zigzag path with lesson nodes. Phase 3 additions:

- **Reward nodes** between lesson clusters: Song unlocks, Endless Mode unlocks, cosmetic rewards
- **Boss nodes** at tier ends: Visually distinct (larger, red border, boss cat icon)
- **Path indicator**: Small badge on each node showing which learning path variant it belongs to
- **Song exercise nodes**: Music note icon instead of standard exercise icon
- Exercise types shown as small icons on each node

---

## Implementation Sequencing

### Phase 2.5 Tasks (Performance — parallel track)

| # | Task | Depends On | Estimate |
|---|------|-----------|----------|
| 2.5.1 | Performance benchmark script | — | S |
| 2.5.2 | Baseline profiling + doc | 2.5.1 | M |
| 2.5.3 | Post-exercise optimization | 2.5.2 | M |
| 2.5.4 | ContentLoader lazy loading | 2.5.2 | L (shared with 3.11) |
| 2.5.5 | ExercisePlayer render audit | 2.5.2 | M |
| 2.5.6 | Memory profiling + fixes | 2.5.2 | S |

### Phase 3a Tasks (Content scaling — existing types)

| # | Task | Depends On | Estimate |
|---|------|-----------|----------|
| 3a.1 | Content registry code-gen script | — | M |
| 3a.2 | ContentLoader lazy loading + LRU cache | 3a.1, 2.5.4 | L |
| 3a.3 | Batch exercise generation pipeline (6 existing types) | — | L |
| 3a.4 | Lesson specs for 40 lessons | — | L |
| 3a.5 | Generate + validate 570 new exercises | 3a.3, 3a.4 | XL |
| 3a.6 | SkillTree extension (lessons 25-40) | — | M |
| 3a.7 | Import 300+ new songs | — | L |
| 3a.8 | Generate 75 new songs via Gemini | — | M |
| 3a.9 | Song-curriculum linking (requiredSkills + songToExercise) | 3a.7, 3a.8 | M |
| 3a.10 | 5 learning path manifests | 3a.5 | L |
| 3a.11 | Path selection UI (onboarding + settings) | 3a.10 | M |
| 3a.12 | CurriculumEngine path routing | 3a.10 | M |
| 3a.13 | LevelMap reward/boss/song nodes | 3a.9 | M |
| 3a.14 | Song search improvements | 3a.7 | M |
| 3a.15 | Exercise + song validation CI | 3a.5, 3a.7 | S |

### Phase 3b Tasks (New exercise types — after 3a infrastructure)

| # | Task | Depends On | Estimate |
|---|------|-----------|----------|
| 3b.1 | ExerciseType union + typeConfig schemas | — | M |
| 3b.2 | Fill-in-the-Blank (validator + UI) | 3b.1 | L |
| 3b.3 | Spot the Error (validator + UI) | 3b.1 | M |
| 3b.4 | Interval Quiz (validator + UI) | 3b.1 | M |
| 3b.5 | Chord Builder (validator + UI) | 3b.1 | L |
| 3b.6 | Key Signature ID (validator + UI) | 3b.1 | M |
| 3b.7 | Boss Battle engine + overlay | 3b.1 | XL |
| 3b.8 | Duet engine (cat accompaniment) | 3b.1 | L |
| 3b.9 | Speed Run (exercise chaining + timer) | 3b.1 | L |
| 3b.10 | Endless Mode (progressive difficulty) | 3b.1 | L |
| 3b.11 | Teacher Challenge (technique goals) | 3b.1 | M |
| 3b.12 | Improvisation (freeform scoring) | 3b.1 | XL |
| 3b.13 | Daily challenge expansion (Speed Run, Teacher) | 3b.9, 3b.11 | M |
| 3b.14 | Generate exercises for new types | 3b.2-3b.12, 3a.3 | XL |

### Execution Order

**Week 1-2 (parallel start):**
- 2.5.1 + 2.5.2: Baseline profiling
- 3a.1 + 3a.2: Content registry + lazy loading
- 3a.3 + 3a.4: Build generation pipeline + lesson specs
- 3a.7 + 3a.8: Song imports (independent)

**Week 3-4:**
- 2.5.3 + 2.5.5: Fix bottlenecks found in profiling
- 3a.5: Generate 570 exercises (needs pipeline + specs done)
- 3a.6: SkillTree extension
- 3a.9: Song-curriculum linking

**Week 5-6:**
- 3a.10 + 3a.11 + 3a.12: Learning paths
- 3a.13: LevelMap updates
- 3a.14 + 3a.15: Search + validation CI
- 3b.1: Start new type schemas (begin Phase 3b)

**Week 7-10 (Phase 3b):**
- 3b.2-3b.6: New interaction types (parallel development)
- 3b.7-3b.12: Gamified wrappers + creative types
- 3b.13-3b.14: Daily challenges + content for new types

---

## Audit Checklist

### Performance (Phase 2.5)
- [ ] Gameplay FPS >=60 sustained during active play
- [ ] Post-exercise delay <500ms
- [ ] Startup time <2s cold, <500ms warm
- [ ] Memory <200MB during extended play
- [ ] Firestore reads <200 per 30-min session
- [ ] Baseline metrics documented

### Content (Phase 3)
- [ ] 600+ exercises accessible and playable
- [ ] All 17 exercise types implemented and tested
- [ ] 500+ songs in library
- [ ] Songs appear as exercises within lessons
- [ ] All 5 learning paths selectable and route correctly
- [ ] Daily challenges generate correctly for new types
- [ ] Weekly featured song highlights
- [ ] LevelMap shows reward, boss, and song nodes
- [ ] ContentLoader lazy loads (not all at startup)
- [ ] Exercise validation passes for all 600+
- [ ] Song validation passes for all 500+
- [ ] App size stays under 100MB (bundled exercises ~1.2MB, songs in Firestore not bundled)
- [ ] Offline-first: exercises bundled, songs cached after first load
- [ ] 0 TypeScript errors, 0 test failures

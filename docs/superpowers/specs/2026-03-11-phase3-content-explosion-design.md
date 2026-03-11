# Phase 3: Content Explosion + Phase 2.5: Performance Audit

**Date:** 2026-03-11
**Status:** Approved
**Parallel tracks:** Phase 2.5 (performance) runs alongside Phase 3 (content)

---

## Executive Summary

Phase 3 scales Purrrfect Keys from 30 exercises to 600+, from 124 songs to 500+, adds 5 learning paths, and introduces 11 new exercise types (17 total). All content is pre-generated and bundled for offline-first operation.

Phase 2.5 runs in parallel: profile current performance, establish baselines, and fix bottlenecks before the content load multiplies them.

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
New: Metadata index + on-demand loading.

```typescript
// content/exercise-index.json — loaded once at startup (~50KB for 600 exercises)
{
  "exercises": {
    "lesson-01-ex-01": {
      "title": "Find Middle C",
      "lesson": "lesson-01",
      "tier": 1,
      "difficulty": 1,
      "types": ["play"],
      "skills": ["note-finding", "c-major"]
    },
    // ... 600 entries, metadata only (no notes array)
  }
}

// Full exercise loaded on demand
ContentLoader.getExercise("lesson-01-ex-01")
  → checks in-memory cache
  → if miss: dynamic import(`content/exercises/lesson-01/exercise-01.json`)
  → cache and return
```

**Cache strategy:**
- LRU cache, max 50 exercises in memory
- Current lesson's exercises pre-loaded when lesson starts
- Next lesson pre-fetched after completing current
- Index file loaded once, kept in memory permanently

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

### Phase 3 Tasks (Content — main track)

| # | Task | Depends On | Estimate |
|---|------|-----------|----------|
| 3.1 | New exercise type implementations (11 types) | — | XL |
| 3.2 | Batch exercise generation pipeline | — | L |
| 3.3 | Generate + validate 570 new exercises | 3.1, 3.2 | XL |
| 3.4 | Import 300+ new songs | — | L |
| 3.5 | Generate 75 new songs via Gemini | — | M |
| 3.6 | Song-curriculum linking (requiredSkills) | 3.4, 3.5 | M |
| 3.7 | 5 learning path manifests | 3.3 | L |
| 3.8 | Path selection UI (onboarding + settings) | 3.7 | M |
| 3.9 | CurriculumEngine path routing | 3.7 | M |
| 3.10 | Daily challenge expansion (Speed Run, Teacher) | 3.1 | M |
| 3.11 | ContentLoader lazy loading | 2.5.4 | L |
| 3.12 | LevelMap reward/boss/song nodes | 3.6 | M |
| 3.13 | Song search improvements | 3.4 | M |
| 3.14 | Exercise + song validation CI | 3.3, 3.4 | S |

### Execution Order

**Week 1-2 (parallel start):**
- 2.5.1 + 2.5.2: Baseline profiling
- 3.1: Start new exercise type implementations
- 3.2: Build batch generation pipeline
- 3.4 + 3.5: Song imports (independent)

**Week 3-4:**
- 2.5.3 + 2.5.5: Fix bottlenecks found in profiling
- 2.5.4 / 3.11: ContentLoader lazy loading (shared)
- 3.3: Generate exercises (needs 3.1 + 3.2 done)
- 3.6: Song-curriculum linking

**Week 5-6:**
- 3.7 + 3.8 + 3.9: Learning paths
- 3.10: Daily challenge expansion
- 3.12: LevelMap updates
- 3.13 + 3.14: Search + validation CI

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
- [ ] App size stays under 150MB
- [ ] Offline-first: exercises bundled, songs cached after first load
- [ ] 0 TypeScript errors, 0 test failures

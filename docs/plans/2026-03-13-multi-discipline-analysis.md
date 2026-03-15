# Multi-Discipline Music Platform — Pre-Implementation Analysis

**Created:** March 13, 2026
**Branch:** `feat/multi-discipline-platform` (from `master`)
**Status:** ANALYSIS ONLY — no code changes yet
**Depends on:** Phases 1-12 of UNIFIED-PLAN.md (App Store launch)

> This document is the deep technical analysis that MUST be completed before any code is written. It covers every file that needs to change, every risk, every dependency, and every correction to the original plan.

---

## 1. Where We Are Today

### Current Development State

| Phase | Name | Status | Blocking? |
|-------|------|--------|-----------|
| 1 | Foundation Cleanup | In Progress | YES — TS errors, device verification |
| 2 | Exercise Types + UI | Nearly Complete | Mostly done, PlayScreen redesign done |
| 3 | Content Explosion | In Progress (`feat/phase3-content-explosion`, 16 commits ahead of master) | YES — 499 exercises exist, but 5 learning paths, song integration, daily challenges still pending |
| 4 | Cat Progression Rebalance | Not Started | NO — independent |
| 5 | Arena + Music Guilds | Not Started | NO — but needs Phase 4 |
| 6 | Cat Studio | Not Started | NO — needs Phase 4 |
| 7 | "Play First" Onboarding | Not Started | YES — needs Phase 3 (learning paths) |
| 8 | Retention Engine | Not Started | NO |
| 9 | Analytics + Crash Reporting | Not Started | Should wire early |
| 10 | System Design Hardening | Not Started | YES — must be before launch |
| 11 | App Store Launch | Not Started | YES — the gate |
| 12 | Monetization | Not Started | Post-launch |

### Current Codebase Numbers (master)

- 139 test suites, 2,831 tests, 0 failures
- 0 TypeScript errors
- 100 skill nodes (piano), 15 tiers
- 30 static exercises (lessons 1-6), AI-generated for tiers 7-15
- 12 cat profiles, 48 accessories defined
- 124 songs in Firestore

### Key Branches

- `master` — stable, deployed
- `feat/phase3-content-explosion` — 16 commits ahead, 499 exercises, not merged
- `feat/neon-arcade-redesign` — exists
- `ui-production-revamp` — exists
- `feat/multi-discipline-platform` — THIS branch (analysis only, from master)

---

## 2. Prerequisites — What Must Be Done First

The production-path-and-web-expansion plan explicitly states **"execution post-v1 launch."** The UNIFIED-PLAN has 12 phases before launch. Here is what's blocking:

### Critical Path to Production Path Work

```
Phase 1 (Foundation) ──must──> Phase 2 (Exercise Types) ──must──> Phase 3 (Content)
                                                                        │
Phase 3 must finish BEFORE multi-discipline because:                    │
  - Learning paths (Phase 3.5-3.7) will influence how                  │
    DisciplineConfig models path selection                              │
  - ContentLoader lazy loading migration (Phase 3.11) must              │
    be done before adding a second content tree                         │
  - Exercise index structure changes affect both disciplines            │
                                                                        ▼
Phases 4-6 (Cat Rebalance, Arena, Cat Studio) ──────────────────────────│
  These are INDEPENDENT of multi-discipline. Can be done                │
  before or after. But they affect shared systems (XP, gems, social)    │
  that multi-discipline also touches.                                   │
                                                                        ▼
Phase 7 (Onboarding) ──────────────────────────────────────────────────│
  CRITICAL: If we add discipline selection to onboarding,               │
  this must be designed TOGETHER with the "Play First" flow.            │
  The plan adds "Step 0: What do you want to learn?" which              │
  changes the onboarding structure.                                     │
                                                                        ▼
Phases 8-10 (Retention, Analytics, Hardening) ─────────────────────────│
  These add infrastructure that multi-discipline should build on,       │
  not duplicate. Analytics events need `discipline` property.           │
  MMKV migration (Phase 10.2) affects persistence layer.                │
                                                                        ▼
Phase 11 (App Store Launch) ───────────────────────────────────────────│
  THE GATE. Ship Piano v1 first.                                        │
                                                                        ▼
Phase 12 (Monetization) ──then──> Multi-Discipline Phases A-E
```

### EXCEPTION: Phase 0 (Refactoring) CAN Be Done Now

Phase 0 is pure refactoring that:
- Creates `DisciplineConfig` interface (new file, additive)
- Extracts `SkillTreeOps` (new file, existing exports become thin wrappers)
- Refactors `CurriculumEngine` to accept config param (backward-compat wrappers)
- Adds `activeDiscipline` to settingsStore (new field, no breaking changes)
- Adds ContentLoader factory (additive function, no changes to existing API)

**This is safe to do on any branch because it's purely additive and backward-compatible.** All existing tests must still pass. It de-risks everything that comes later.

However, Phase 0 should be done AFTER `feat/phase3-content-explosion` is merged to master, because that branch modifies `SkillTree.ts` (202 line diff) and would create merge conflicts.

---

## 3. Corrections to the Original Plan

### Correction 1: Web Version Scope

**Original plan says:** "Build the web version Production-first, since it has zero hardware dependencies. Piano web follows later."

**User correction:** Web version should cover the WHOLE app (Piano + Production), not just Production.

**Impact:** This significantly increases Phase E scope:
- Web Audio API engine needed from day 1 (not "later")
- WebMIDI support needed from day 1
- Piano keyboard component needs web-responsive version
- VerticalPianoRoll needs web rendering (CSS transforms work on web)
- All exercise types (piano's 6 + production's 9) must work on web simultaneously

**Revised Phase E approach:**
- Still use React Native Web + Next.js
- WebAudioEngine already exists (`src/audio/WebAudioEngine.ts`) — needs web adaptation
- SoundManager needs web adaptation (haptics → visual feedback)
- All 15 exercise types must be web-compatible
- Piano keyboard needs responsive layout (full-width on desktop)
- MIDI: Web MIDI API for hardware, QWERTY keyboard mapping for software

### Correction 2: Plan Doc Claims CurriculumEngine Is Path-Agnostic (It's Not)

**Plan Part 2.5 says:** "CurriculumEngine.ts — Already path-agnostic — just needs Production skill tree plugged in"

**Reality:** 14+ direct references to global `SKILL_TREE`:
- Line 106: `masteredSkills.length >= SKILL_TREE.length` (hardcodes 100 skills)
- Lines 251-264: `categoryPriority` map with 12 piano-only categories
- Lines 421-434: Fallback to `'find-middle-c'` and `'lesson-01-ex-01'`
- Line 346: `SKILL_TREE.filter(...)` in `shouldUnlockAnchorLesson`
- Line 653: `SKILL_TREE.find(...)` in `generateEndgameSession`
- `WARMUP_CATEGORIES` (line 70-73): Piano-only list
- `CATEGORY_TO_GENRE` (lines 744-757): Piano-only mapping
- `ENDGAME_THEMES` (lines 76-79): Piano-specific themes

**Fix:** DisciplineConfig injection (Phase 0.4) — all these become `config.X`

### Correction 3: Store Restructuring Would Break Everything

**Plan Part 2.2 proposes:**
```typescript
disciplineProgress: Record<Discipline, DisciplineProgress>
```
Wrapping existing `lessonProgress` inside `disciplineProgress.piano.lessonProgress`.

**This would break:**
- 30+ references to `lessonProgress` across stores, screens, sync
- All sync logic in `syncService.ts` and `firestore.ts`
- All test files mocking progress store
- Persistence migration would be non-trivial

**Fix (already in implementation plan):** Additive parallel fields:
```typescript
// Existing — untouched
lessonProgress: Record<string, LessonProgress>

// New — only for production
productionLessonProgress: Record<string, LessonProgress>
productionMasteredSkills: string[]
```

### Correction 4: Content Directory Restructuring

**Plan Part 1.6 proposes:** Rename `content/` root to `content/piano-path/`

**This would break:** Every `require()` path in ContentLoader, ContentLoaderRegistry.generated.ts, and all 499 exercise references.

**Fix:** Keep existing content at `content/exercises/` and `content/lessons/`. Add production content at `content/production-path/exercises/` and `content/production-path/lessons/`. No renames.

---

## 4. Complete File Impact Analysis

### Phase 0: Files Changed (Refactoring)

| File | Change | Risk | Lines Affected |
|------|--------|------|----------------|
| **NEW** `src/core/curriculum/DisciplineConfig.ts` | New file — types + interface | None | ~50 |
| **NEW** `src/core/curriculum/pianoConfig.ts` | Wraps existing constants | None | ~30 |
| **NEW** `src/core/curriculum/SkillTreeOps.ts` | Parameterized utility fns | None | ~200 |
| `src/core/curriculum/SkillTree.ts` | Existing exports → thin wrappers | LOW | ~20 lines changed |
| `src/core/curriculum/CurriculumEngine.ts` | Add config param to fns, keep wrapper overloads | MEDIUM | ~80 lines changed |
| `src/stores/settingsStore.ts` | Add `activeDiscipline`, `unlockedDisciplines` | LOW | ~15 lines |
| `src/stores/types.ts` | Add `Discipline` type, settings types | LOW | ~10 lines |
| `src/content/ContentLoader.ts` | Add `getDisciplineContentLoader()` factory | LOW | ~30 lines |

**Total Phase 0 risk: LOW.** All existing exports preserved. All tests must pass unchanged.

### Phase 0: Files That Must NOT Change

These 24 files import from SkillTree/CurriculumEngine. **None of them should need changes in Phase 0** because we keep backward-compatible wrappers:

**Screens (5):** ExercisePlayer.tsx, HomeScreen.tsx, DailySessionScreen.tsx, TierIntroScreen.tsx, ProfileScreen.tsx
**Stores (1):** learnerProfileStore.ts
**Content (2):** templateExercises.ts, exerciseBufferManager.ts
**Services (1):** geminiExerciseService.ts
**Core (2):** challengeSystem.ts, tierMasteryTest.ts
**Tests (8):** SkillTree.test.ts, CurriculumEngine.test.ts, SessionTypes.test.ts, SkillDecay.test.ts, tierMasteryTest.test.ts, bugHunter.test.ts, adaptiveLearning.test.ts, yearLongProgression.test.ts

### Phases A-E: Full Impact Map

| Phase | New Files | Modified Files | New Tests | Est. Lines |
|-------|-----------|---------------|-----------|------------|
| A (Content) | ~15 | 2 | ~200 tests | ~3000 |
| B (Components) | ~20 | 3 | ~300 tests | ~5000 |
| C (App Integration) | ~8 | 12 | ~200 tests | ~3000 |
| D (Export) | ~3 | 3 | ~50 tests | ~800 |
| E (Web) | ~30 | 10 | ~200 tests | ~8000 |

---

## 5. Dependency Graph: What Imports What

### SkillTree.ts Import Chain (24 files)

```
SkillTree.ts
├── CurriculumEngine.ts (14 refs to SKILL_TREE + 6 utility fns)
│   ├── HomeScreen.tsx (generateSessionPlan, getNextSkillToLearn)
│   ├── DailySessionScreen.tsx (generateSessionPlan, getNextSkillToLearn)
│   └── Tests: CurriculumEngine.test, SessionTypes.test, bugHunter.test,
│            adaptiveLearning.test, yearLongProgression.test
├── ExercisePlayer.tsx (SKILL_TREE, getSkillsForExercise, getSkillById, etc.)
├── HomeScreen.tsx (SKILL_TREE, getSkillById)
├── DailySessionScreen.tsx (getSkillsNeedingReview, getSkillById, SKILL_TREE)
├── TierIntroScreen.tsx (SKILL_TREE, getGenerationHints)
├── ProfileScreen.tsx (SKILL_TREE)
├── learnerProfileStore.ts (getSkillById, DECAY_HALF_LIFE_DAYS, DECAY_THRESHOLD)
├── templateExercises.ts (getGenerationHints, getSkillById)
├── exerciseBufferManager.ts (getGenerationHints)
├── geminiExerciseService.ts (type GenerationHints)
├── challengeSystem.ts (SKILL_TREE, type SkillCategory)
├── tierMasteryTest.ts (SKILL_TREE)
└── learningPaths.ts (type SkillCategory)
```

### ContentLoader.ts Import Chain (11 files)

```
ContentLoader.ts
├── CurriculumEngine.ts (getExercise, getLessons, getLessonExercises)
├── ExercisePlayer.tsx (getExercise, getNextExerciseId, getLessonIdForExercise, etc.)
├── HomeScreen.tsx (getLessons, getExercise)
├── LevelMapScreen.tsx (getAllLessons, getExercisesForLesson)
├── TierIntroScreen.tsx (getExercise, getLessonIdForExercise)
├── PostExerciseScreen.tsx (getLessonIdForExercise)
├── DailySessionScreen.tsx (getExercise)
├── CompletionModal.tsx (getLessonIdForExercise)
├── useExercisePlayback.ts (getLessonIdForExercise)
└── Tests: ContentLoader.test, freshUserExperience.test
```

---

## 6. Risk Assessment

### HIGH Risk Areas

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Store restructuring breaks sync | P0 | Use additive fields, NOT wrapping (Correction 3) |
| CurriculumEngine refactor breaks sessions | P0 | Backward-compat wrappers; all 8 test files must pass |
| Content directory rename breaks require() | P0 | Don't rename (Correction 4) |
| Merge conflicts with phase3 branch | P1 | Merge phase3 to master FIRST, then rebase this branch |
| Bundle size with 1000+ exercises | P1 | Lazy loading, separate index files per discipline |
| Web version scope creep (full app, not production-only) | P1 | Phase E MVP: core loop only, then iterate |

### MEDIUM Risk Areas

| Risk | Severity | Mitigation |
|------|----------|-----------|
| AudioContext limits on iOS | P2 | SynthEngine shares context with ExpoAudioEngine |
| Step sequencer performance (16x8 grid) | P2 | useSharedValue for cell state, avoid React re-renders |
| OfflineAudioContext unavailable in RN | P2 | Fallback: record real-time playback |
| Production exercises need audio examples | P2 | Bundle small clips (~2-8s each), lazy load |

### LOW Risk Areas

| Risk | Severity | Mitigation |
|------|----------|-----------|
| FL Studio trademark | P3 | Own UIs, "DAW-agnostic concepts" framing, disclaimer |
| New exercise types need new scoring | P3 | Simpler scoring than piano (quiz = correct/incorrect) |
| Web MIDI availability | P3 | Graceful fallback to touch/keyboard |

---

## 7. Testing Strategy

### Phase 0 Verification

```bash
# MUST pass with ZERO changes to test files:
npm run typecheck    # 0 errors
npm run test         # all 2831+ tests pass
npm run lint         # 0 errors

# Manual verification:
# DailySessionScreen generates identical piano sessions before/after refactor
```

### Phase A-E New Test Suites

| Suite | What It Tests | Est. Tests |
|-------|--------------|------------|
| ProductionSkillTree.test.ts | DAG validation, no cycles, tier ordering | ~30 |
| ProductionValidator.test.ts | Quiz, build, mix, match scoring | ~80 |
| SkillTreeOps.test.ts | Parameterized utility functions | ~40 |
| DisciplineConfig.test.ts | Config creation, validation | ~10 |
| StepSequencer.test.tsx | Grid interaction, pattern comparison | ~30 |
| MixerSliders.test.tsx | Slider accuracy scoring | ~20 |
| SynthEngine.test.ts | Oscillator + filter + envelope | ~30 |
| midiExport.test.ts | MIDI file generation, valid output | ~15 |
| wavExport.test.ts | WAV header + PCM data | ~15 |

---

## 8. Implementation Order (When Ready)

### Recommended Sequence

```
1. MERGE feat/phase3-content-explosion → master (resolves SkillTree.ts diff)
2. Complete Phases 1-12 (App Store launch)
3. Phase 0: Refactoring (1-2 weeks) — CAN start during Phase 4-6 window
4. Phase A: Production Content + Types (3-4 weeks)
5. Phase B: Interactive Components + Synth Teaching (2-3 weeks)
6. Phase C: App Integration (2-3 weeks)
7. Phase D: Export System (1 week)
8. Phase E: Web Version — FULL APP (4-6 weeks)
```

### Phase 0 Can Start Earlier

Phase 0 (refactoring for path-agnosticism) is safe to do during the Phases 4-6 window because:
- It's purely additive (no breaking changes)
- It doesn't depend on any specific phase
- It only modifies core curriculum files, not UI
- BUT it must wait until `feat/phase3-content-explosion` is merged (to avoid SkillTree.ts conflicts)

---

## 9. Open Questions (Need Your Decision)

1. **Phase 0 timing:** Do you want to do Phase 0 refactoring now (after merging phase3), or wait until after App Store launch?

2. **Web framework:** React Native Web + Next.js is proposed. Alternatives: pure Next.js + React (more web-native but 0% code sharing), Expo for Web (simpler but limited). The RN Web approach shares ~90% of logic but has gotchas with animations/audio.

3. **Production content creation:** Will you write the 200 static exercises (tiers 1-6) manually, or use Gemini batch generation for all of them?

4. **Monetization gate for Production:** Option A (Production = Premium), Option B (tier-based gating both paths), or Option C (Production = upsell)? This affects onboarding flow design.

5. **MIDI export library:** `midi-writer-js` (MIT, well-maintained) vs building from scratch. The library is 12KB minified.

6. **Synth teaching scope:** Full Serum-style wavetable display, or simplified oscillator + filter + ADSR only for v1?

---

## 10. Summary

**Bottom line:** The multi-discipline platform is a major expansion that should happen AFTER v1 launch. The codebase has the right architecture for it (Zustand, pure TS core, modular exercise system), but the CurriculumEngine/SkillTree/ContentLoader need refactoring first (Phase 0).

**What to do now:**
1. Finish current work (merge phase3 to master)
2. Complete Phases 1-12 → App Store
3. Then execute Phase 0 → A → B → C → D → E

**What NOT to do:**
- Don't restructure stores (use additive fields)
- Don't rename content directories
- Don't start production content before Phase 0 refactoring
- Don't build web before mobile multi-discipline is working

# Purrrfect Keys — System Knowledgebase

**Last Updated:** March 23, 2026
**Purpose:** Ground truth for how all systems work together. Read this before making changes.

---

## How the Daily Practice Plan Works

The daily session plan is the core user experience — "Today's Practice" on HomeScreen and DailySessionScreen.

**Flow:**
1. `dailyPlanCache.ts` generates a plan via `CurriculumEngine.generateSessionPlan()` once per day
2. Plan is persisted to AsyncStorage keyed by DATE ONLY — never regenerates mid-day
3. Both HomeScreen and DailySessionScreen call `getDailyPlan()` which returns the same cached plan
4. On sign-out, `clearDailyPlanCache()` is called (via `resetAllStores()`) so next sign-in gets a fresh plan
5. Completion tracking uses `mergedCompletedKeys` in DailySessionScreen (local session + lessonProgress cross-check)

**Visual indicators:**
- Green checkmark + green title/border = passed (score >= exercise's passingScore)
- Orange warning + orange title/border = attempted but below threshold
- Play button changes: play (new) → refresh (retry) → replay (passed)

**Key files:**
- `src/core/curriculum/dailyPlanCache.ts` — AsyncStorage-backed cache, date-keyed
- `src/core/curriculum/CurriculumEngine.ts` — Plan generation (4 session types: new-material, review, challenge, mixed)
- `src/screens/HomeScreen.tsx` — Inline "Today's Practice" with `HomePracticeSections`
- `src/screens/DailySessionScreen.tsx` — Full "See All" view with `SessionExerciseCard`

**Critical rule:** NEVER add `masteredSkills` or any per-exercise-completion state as a `useMemo` dependency for plan generation. The plan must be stable for the entire day.

---

## How Cross-Device Sync Works

**Architecture:** Offline-first with periodic Firestore sync.

**Push path (local → Firestore):**
- `syncManager.flushQueue()` — runs every 5 minutes via periodic sync
- `syncManager.pushAllProgressData()` — called on sign-in and before sign-out
- Pushes: XP/level/streak (gamification), lesson progress, cats + daily rewards, gems, learner profile, achievements, rank, season, settings, progress extras (dailyGoalData, tierTestResults, streakMilestonesClaimed)

**Pull path (Firestore → local):**
- `syncManager.pullRemoteProgress()` — called on sign-in (BEFORE migration)
- Merge strategy: "highest wins" for XP, scores, MMR. Union for mastered skills, owned cats, achievements.
- ALL fetches in Promise.all have `.catch()` so one failure doesn't kill the pull

**Sign-in order (critical):**
1. `pullRemoteProgress()` — get authoritative cloud state
2. `migrateLocalToCloud()` — push any local-only data
3. `pushAllProgressData()` — ensure cloud has latest
4. `startPeriodicSync()` — begin 5-min flush cycle

**Sign-out order:**
1. `stopPeriodicSync()`
2. `pushAllProgressData()` (for non-anonymous accounts, data is already in Firestore)
3. `PersistenceManager.clearAll()` (non-anonymous only)
4. `resetAllStores()` (includes `clearDailyPlanCache()`)

**What syncs (12 data types):**
| Store | Push | Pull | Merge Strategy |
|-------|------|------|---------------|
| XP/Level/Streak | gamification doc | gamification doc | Higher wins |
| Lesson Progress | per-lesson docs | per-lesson docs | Higher score per exercise |
| Cat Evolution | catEvolution doc | catEvolution doc | Union owned, higher XP |
| Daily Rewards | catEvolution doc | catEvolution doc | Restore if local is default |
| Gems | gems doc | gems doc | Higher balance |
| Learner Profile | learnerProfile doc | learnerProfile doc | Union mastered skills |
| Achievements | achievements doc | achievements doc | Union unlocked |
| Rank (MMR) | rank doc | rank doc | Higher MMR |
| Season/Battle Pass | season doc | season doc | Higher BP XP |
| Settings | settings doc | settings doc | Remote fills empty local |
| Daily Goal Data | progressExtra doc | progressExtra doc | Higher minutes per day |
| Streak Milestones | progressExtra doc | progressExtra doc | Union claimed |

---

## How the Scoring Engine Works

**5-dimension weighted scoring:**
- Accuracy (35%) — right notes played
- Timing (30%) — played on beat (within timingToleranceMs = perfect, gracePeriodMs = good/early/late)
- Completeness (10%) — notes played / total expected
- Extra Notes (10%) — exponential penalty: 100 * 0.85^extraCount
- Duration (15%) — held for correct length

**Visual feedback alignment (Bug #19 fix):**
- Within `timingToleranceMs` → "PERFECT" (matches 100% timing score)
- Within `gracePeriodMs * 0.5` → "GOOD"
- Within `gracePeriodMs` → "EARLY" / "LATE"
- Beyond → "OK"

**Rhythm/tap exercises (Bug #93 fix):**
- Tap zone sends MIDI note 60 for every tap
- `handleKeyDown` skips pitch matching when `exerciseType === 'rhythm'`
- Only timing matters, not which note is played

**Key files:**
- `src/core/exercises/ExerciseValidator.ts` — scoring engine (pure TS)
- `src/screens/ExercisePlayer/ExercisePlayer.tsx` — visual feedback in `handleKeyDown`

---

## How Cat Evolution & Abilities Work

**Evolution stages:** Baby → Teen (2,000 XP) → Adult (8,000 XP) → Master (25,000 XP)

**Ability unlocking (Bug #96 fix):**
- Baby-stage abilities unlock immediately on cat purchase/initialization
- `unlockCat()`, `initializeStarterCat()`, `unlockChonky()` all call `unlockAbilitiesForStage()`
- Hydration reconcile fills abilities for pre-fix cats with empty arrays
- Abilities disabled in mastery test mode (`testModeRef.current` guard)

**Daily rewards:**
- 7-day calendar (Mon-Sun), gem/XP rewards per day
- Must complete daily challenge before claiming
- Now synced to Firestore (in catEvolution doc) — survives sign-out/sign-in

**Key files:**
- `src/stores/catEvolutionStore.ts` — evolution, abilities, daily rewards
- `src/core/abilities/AbilityEngine.ts` — applies abilities to exercise config

---

## How Audio Works

**Two engines (factory pattern):**
- `WebAudioEngine` — JSI-based via react-native-audio-api, <10ms latency (preferred)
- `ExpoAudioEngine` — expo-av with round-robin voice pools, FluidR3 GM piano samples
- `createAudioEngine()` tries WebAudio first, falls back to Expo

**ExpoAudioEngine specifics:**
- 2 voices per note (VOICES_PER_NOTE), round-robin cycling
- Pre-loads C2-C6 (5 octave-spaced samples), ±6 semitone pitch shift via playbackRate
- `setVolume()` only updates stored volume — does NOT propagate to playing sounds (Bug #26 fix)

**TTS pipeline:**
- ElevenLabs (primary, 13 per-cat neural voices) → expo-speech (fallback)
- Lazy `require()` for expo-file-system and expo-av (prevents Jest breakage)

---

## How Auth Works

**Providers:** Anonymous (default) → Email/Google/Apple sign-in (upgrade)

**Key behaviors:**
- `onAuthStateChanged` guards against transient null during token refresh (Bug #55 fix)
- 8-second timeout on `initAuth()` — enters offline guest mode if Firebase unreachable
- `_signInSyncPending` flag keeps `isLoading: true` until post-sign-in sync completes
- HomeScreen hides stats/practice sections while `isAuthLoading` to prevent stale data flash

---

## How the Exercise Player Works

**Stale closure prevention:**
- `skillIdParamRef` and `testModeRef` are refs updated on every render (Bug #3 fix)
- `abilityConfig` reads from refs, returns `null` in test mode (Bug #53 fix)
- Achievement context uses `get()` for fresh state reads (Bug #30 fix)

**Exercise types — CRITICAL GAP:**
- Only 2 gameplay modes exist: keyboard play-along and rhythm tap
- ALL 599 exercises use these same 2 modes regardless of skill category
- Phase 13 "Content Explosion" expanded quantity (599 exercises) but NOT variety
- Labels like "Chord ID", "Ear Training" were removed — all now honestly say "Play Along"
- Exercise type variety (F2) is the **single biggest gap** before a shippable product
- AI exercise pipeline has integrity issues (F10): title mismatches, broken scoring, false "new record"

---

## Bug Fix Status (Mar 23)

**71 fixed / 22 open bugs + 9 feature items**

Remaining open categories:
- Exercise type variety (#79, F2) — deep multi-week feature
- Cat SVG visual issues (#20, #82) — #82 blocked on Figma
- Dependency vulnerabilities (#73a-e) — npm overrides needed
- Device-verification-only (#86, #87, #89, #90) — code exists, needs testing
- Investigation needed (#62 wrong key, #75 random exercises, #80 ScoreRing, #95 level count)
- Edge cases (#40, #41, #48) — lower priority

Full list: `docs/plans/CONFIRMED-BUGS.md`

---

## Key Architectural Rules

1. **Audio buffer processing NEVER in JavaScript** — pre-allocate buffers
2. **Business logic is pure TypeScript** — no React imports in `/src/core/`
3. **Daily plan cache is date-only** — never invalidate mid-day
4. **Sync order: pull → migrate → push** — never push stale data over cloud
5. **immediateSave for critical state** — gems, onboarding, selected cat, accessories
6. **debouncedSave for non-critical state** — settings, league, progress
7. **All Zustand callbacks use getState()** — never read from closure variables
8. **Pitch matching skipped for rhythm exercises** — only timing matters
9. **Cat abilities disabled in test mode** — testModeRef guard
10. **LogBox.ignoreLogs for third-party errors** — Sentry timestamp, PostHog flush

# Purrrfect Keys — Master Plan

**Last Updated:** February 24, 2026
**Goal:** Production-quality piano learning app on App Store & Play Store
**Target Launch:** June 8, 2026 (16-week roadmap from Feb 17)
**Codebase Health:** 0 TypeScript errors, 2,413 tests passing, 103 suites

> **This is the single source of truth.** All other plan files in `docs/plans/` are historical archives. Do not reference them for current status.

---

## Status Overview

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| Phase 1 | Core Loop | **COMPLETE** | Exercise Player, scoring, XP, streaks, AI coach, 30 exercises |
| Phase 2 | Gamification & Polish | **COMPLETE** | LevelMap, theme, audio rewrite, mascot system, transitions |
| Phase 3 | Firebase Auth + Sync | **COMPLETE** | Auth (4 providers), cloud sync, offline queue, cross-device |
| Phase 4+ | Adaptive Learning + UI Overhaul | **COMPLETE** | Design tokens, learner profile, Gemini generation, SplitKeyboard, 32 achievements |
| Phase 5 | Adaptive Learning Revamp | **COMPLETE** | SkillTree (100 nodes), CurriculumEngine, voice coaching, weak spots, difficulty engine |
| Phase 5.2 | 365-Day Curriculum | **COMPLETE** | 15 tiers, skill decay, multi-session mastery, session types |
| Phase 6 | Avatar Evolution & Gamification | **COMPLETE** | 4-stage evolution, gems, 12 abilities, cat collection, EvolutionReveal |
| Phase 6.5 | AI Coach Fix + Wiring | **COMPLETE** | 10 coach bugs, FreePlay key detection, gamification wiring |
| Phase 7 | UI Revamp + Game Feel | **COMPLETE** | Concert Hall palette, composable SVG cats, Salsa NPC, custom tab bar, micro-interactions |
| Phase 7.5 | All-AI Exercise Generation | **COMPLETE** | All 6 batches done — skill-aware AI generation for all tiers |
| — | Gem Bug Fix | **COMPLETE** | immediateSave, auto-claim, toast feedback, reward display |
| — | Cat Gallery Redesign | **COMPLETE** | Unified swipeable gallery with abilities, buy flow, evolution data |
| Phase 8 | Audio Input (Mic) | **COMPLETE** | YIN pitch detection, InputManager, MicSetup, onboarding + Free Play wired |
| Phase 9 | Music Library | **COMPLETE** | Song types, ABC parser, mastery tiers, Firestore service, Gemini generation, browse/search UI, section-based playback, 6 achievements, 124 songs in Firestore |
| Phase 10 | Social & Leaderboards | **PLANNED** | Friends, weekly leagues (Bronze→Diamond), challenges, share cards, push notifications |
| Phase 11 | QA + Launch + Audit | **PLANNED** | Comprehensive audit, beta testing, App Store submission, monitoring |
| — | Sound Design | **PLANNED** | UI sounds, celebrations, cat audio (can be done alongside any phase) |
| — | Rive Animations | **PLANNED** | .riv files (needs Rive editor guidance, nice-to-have) |

---

## Completed Phases (Summary)

### Phase 1: Core Loop
Exercise Player with PianoRoll + Keyboard, 5-dimensional scoring engine, nearest-note matching, XP/levels/streaks, AI Coach (Gemini 2.0 Flash), ContentLoader for 30 JSON exercises across 6 lessons, ExpoAudioEngine with round-robin voice pools, MIDI input architecture.

### Phase 2: Gamification & Polish
LevelMapScreen (Duolingo-style), Concert Hall dark theme, profile editing, all 30 exercises validated, audio engine rewrite (JSI WebAudio + Expo fallback), mascot system (12 cats), ScoreRing, PressableScale, transition screens, multi-touch keyboard.

### Phase 3: Firebase Auth + Sync
Firebase Auth (Email, Google, Apple, Anonymous), SyncManager with offline queue + Firestore pull/merge, cross-device sync ("highest wins"), local-to-cloud migration, auth resilience (guest fallback, 8s timeout).

### Phase 4+: Adaptive Learning + UI Overhaul
22 tasks: design tokens, learner profile store, cat dialogue engine (12 cats x 14 triggers), Gemini exercise generation + buffer manager, skill assessment screen, screen redesigns, SplitKeyboard, 32 achievements, cat quest service.

### Phase 5 + 5.2: Adaptive Learning Revamp + 365-Day Curriculum (~90% + 100%)
SkillTree DAG (100 nodes, 15 tiers, 12 categories), CurriculumEngine (4 session types), skill decay (14-day half-life), AI generation for tiers 7-15, DailySessionScreen, VoiceCoachingService + TTSService, WeakSpotDetector, DifficultyEngine, FreePlayAnalyzer, 150+ new tests.

### Phase 6 + 6.5: Avatar Evolution & Gamification + AI Coach Fix
4-stage evolution (Baby/Teen/Adult/Master), gem currency, 12 abilities via AbilityEngine, CatCollectionScreen, EvolutionReveal animation, GemEarnPopup, onboarding cat selection. AI Coach: 10 bugs fixed (pitchErrors, missedCount, cache, temperature), FreePlay expanded to 48 scales, gamification fully wired.

### Phase 7: UI Revamp + Game Feel & Polish
Concert Hall palette (black + crimson), typography/shadow/animation/glow token systems, composable SVG cat system (12 profiles), Reanimated pose system (7 poses), SalsaCoach NPC, high-impact screen redesigns (Home, CompletionModal, DailySession, Profile), custom tab bar, ExerciseLoadingScreen, hardcoded hex tokenization, cat character renames (Vinyl→Ballymakawww, Noodle→Shibu, Pixel→Bella).

---

## Phase 7.5: All-AI Exercise Generation (COMPLETE)

**Problem:** Only 36 static exercises (~45 min of gameplay). Daily players exhaust content in 2-3 days. Tiers 1-6 are hardwired to static JSON; only tiers 7-15 use AI.

**Goal:** Every exercise from tier 1 onward is AI-generated. Static JSON becomes offline fallback only.

All 6 batches completed: skill mastery for AI exercises, GenerationHints for 100 SkillTree nodes, skill-aware buffer/generation pipeline, CurriculumEngine AI-first for all tiers, LevelMap/LessonIntro AI integration, offline bootstrap + template integration.

---

## Gem Bug Fix + Cat Gallery Redesign (COMPLETE — Feb 23)

### Gem Redemption Bug Fix
- **Root cause:** Race condition between `completeDailyChallenge()` and `claimDailyReward()` — 500ms debounced save loses `lastDailyChallengeDate`
- **Fix:** `createImmediateSave` utility (0ms persistence), `completeDailyChallengeAndClaim()` atomic action, toast feedback on failed claims, reward display on DailyChallengeCard

### Cat Gallery Redesign
- **Unified gallery:** Merged `CatSwitchScreen` + `CatCollectionScreen` into single swipeable Subway Surfers-style gallery
- **Features:** 88%-width cards with evolution stage badge, ability icons, buy flow modal, gem balance header
- **Navigation:** `CatCollection` route now renders `CatSwitchScreen`; `CatCollectionScreen` deprecated

---

## Phase 8: Audio Input — Microphone Pitch Detection (COMPLETE)

**Problem:** 95%+ of target users don't own MIDI keyboards. Without mic input, the app is a screen-tap trainer.

**Goal:** Low-latency single-note pitch detection via device microphone. Target: <150ms.

**Completed (Feb 23):** All 4 batches (8A-8D) built and wired.

- `PitchDetector.ts` — Pure TS YIN algorithm, pre-allocated buffers, sub-sample parabolic interpolation
- `NoteTracker` — Hysteresis (40ms onset, 80ms release) prevents rapid flickering
- `AudioCapture.ts` — react-native-audio-api AudioRecorder wrapper
- `MicrophoneInput.ts` — Composes AudioCapture + PitchDetector + NoteTracker → MidiNoteEvent
- `InputManager.ts` — Unified MIDI > Mic > Touch factory with runtime switching
- `MicSetupScreen.tsx` — Permission wizard with privacy assurances
- `useExercisePlayback` — Integrated with InputManager, per-method latency compensation
- `OnboardingScreen` — 3-option input selection (MIDI / Mic / Touch)
- `PlayScreen` — Free Play wired with InputManager for mic/MIDI alongside touch
- `pitchUtils.ts` — frequencyToNearestMidi, frequencyCentsOffset

### Remaining Polish (nice-to-have, not blocking)
1. Real-device accuracy testing (>95% target)
2. Ambient noise calibration tuning
3. Polyphonic detection research (stretch goal)

---

## Sound Design (PLANNED)

**Problem:** App is silent outside piano note playback. No button sounds, celebrations, feedback, or cat sounds.

### Scope (~20-30 audio assets)
- Button press sounds (tap, toggle, select)
- Celebration sounds (star earned, combo hit, exercise complete, level up)
- Feedback sounds (correct/wrong note, miss)
- Cat sounds (meow greeting, purr reward)
- Countdown ticks

### Design Direction
Hybrid approach: piano-derived sounds for gameplay feedback + cat sounds for mascot interactions.

### Implementation
1. Source/create short .wav assets (<1s each)
2. Create `SoundManager` service (preload + play pattern)
3. Wire into PressableScale, CompletionModal, AchievementToast, ExerciseBuddy, CountInAnimation
4. Separate volume control in settings
5. Respect device silent mode

---

## Rive Animations (PLANNED — Needs Guidance)

**Current state:** SVG composable system with Reanimated poses is functional. `RiveCatAvatar.tsx` placeholder exists but no .riv files.

**What's needed:**
- Rive editor workflow guidance (user has no experience)
- Design + animate 3 cat states minimum: idle, celebrate, teach
- Decision: animate all 12 cats individually vs parameterized rig
- `rive-react-native` integration

**Not a blocker** — current SVG animations work well. This is a quality multiplier.

---

## Phase 9: Music Library (COMPLETE)

**Design doc:** `docs/plans/2026-02-24-phase9-music-library-design.md`

**Goal:** Transform from exercise-only to full piano learning platform with 120+ songs.

**Completed (Feb 24):** All 11 batches + content import. 21 new files, 9 modified, 59 new tests. **124 songs uploaded to Firestore.**

**3-Source Content Pipeline (124 songs):**
- **Gemini Flash** (37 songs) — `scripts/generate-songs.ts` (50 curated pop/film/game/holiday, 37 successful). Pure functions extracted to `src/core/songs/songAssembler.ts` for Node.js reuse.
- **TheSession.org API** (50 songs) — `scripts/import-thesession.ts` (20 reels + 15 waltzes + 15 jigs). Two-step API: search → individual tune detail for ABC notation.
- **PDMX/music21** (38 songs) — `scripts/import-pdmx.py` (12 Beethoven, 13 Mozart, 5 Haydn, 5 Bach, Handel, Joplin, Chopin). Iconic string quartet movements + Mozart K.545 Piano Sonata.
- **Upload:** `scripts/upload-songs-to-firestore.ts` — batch upload via Firebase client SDK, skip-existing, dry-run support.

**Genre breakdown:** 55 folk, 47 classical, 10 film, 7 game, 6 holiday

**Core infrastructure:**
- `songTypes.ts` — Song, SongSection, SongSummary, SongFilter, SongMastery, MasteryTier
- `abcParser.ts` — ABC notation → NoteEvent[] via `abcjs`, handles keys/accidentals/ties/chords/tuplets
- `songAssembler.ts` — Pure generation functions (buildSongPrompt, validateGeneratedSong, assembleSong) — no Firebase deps
- `songMastery.ts` — Tier computation (none→bronze→silver→gold→platinum), best-score merge, gem rewards
- `songService.ts` — Firestore CRUD (songs collection + per-user mastery subcollection + rate limiting)
- `songGenerationService.ts` — Gemini 2.0 Flash runtime generation, 5/day rate limit, imports from songAssembler
- `songStore.ts` — Zustand store with persistence, filters, loading states

**UI:**
- `SongLibraryScreen.tsx` — Genre carousel, search (400ms debounce), difficulty filter, song cards, request FAB
- `SongPlayerScreen.tsx` — Section pills, layer toggle (melody/full), loop, `sectionToExercise()` → ExercisePlayer
- Songs tab (5 tabs: Home, Learn, Songs, Play, Profile)

**Gamification:**
- 6 new achievements (first-song-mastered, genre-explorer, classical-connoisseur, platinum-pianist, song-collector, melody-master)
- Gem rewards on tier upgrade: bronze=10, silver=20, gold=40, platinum=75
- 16 integration tests covering full mastery progression flow

---

## Phase 10: Social & Leaderboards (PLANNED)

**Design doc:** `docs/plans/2026-02-24-phase10-social-leaderboards-design.md`

**Goal:** Social features that drive daily engagement — friends, leagues, challenges, sharing.

**Key features:**
- **Friends system:** 6-char friend codes, deep links, friend list with activity feed
- **Activity feed:** Shows friend milestones with user display name + equipped cat avatar (e.g., "[Avatar] Sarah mastered Fur Elise!")
- **Weekly leagues:** Duolingo-style Bronze → Silver → Gold → Diamond, 30-person groups, promotion/demotion
- **Friend challenges:** Challenge a friend to beat your score, 48h window, push notification
- **Share cards:** Shareable images for scores, streaks, evolution, league rank (via `react-native-view-shot`)
- **Push notifications:** FCM (remote) + local scheduled (streak reminders, daily practice)
- **Firebase backend:** Firestore collections + Cloud Functions for league rotation + social notifications
- "Social" tab replaces "Play" tab (Free Play moves to HomeScreen button)

**Exit Criteria:**
- Friend system with code/link adding + activity feed
- Weekly leagues with promotion/demotion + leaderboard UI
- Friend challenges with 48h window
- Push notifications (local + remote)
- Shareable cards
- ~50+ new tests

---

## Phase 11: QA + Launch + Comprehensive Audit (PLANNED)

### QA Sprint
- AI quality audit (100 exercises, 20+ coaching scenarios)
- Mic input testing (5+ environments)
- Music Library content review (all 120+ songs)
- Performance profiling (every screen, target devices)
- Full 30-day simulated journey
- Gamification balance (XP curve, gem rates, evolution milestones)
- Edge cases (kill mid-exercise, airplane mode, background/foreground)
- Social feature testing (leagues, challenges, notifications)
- Accessibility (VoiceOver, dynamic type, color contrast, reduced motion)
- Security (Firebase rules, API keys, input sanitization)
- Comprehensive codebase audit

### Beta Release
- App Store assets (icon, screenshots, description, privacy policy)
- EAS production builds (iOS + Android)
- TestFlight + internal testing (5-10 testers, 5-day window)
- Critical bug fixes from beta feedback

### Launch
- Final fixes
- App Store + Play Store submission
- Launch monitoring (Crashlytics, analytics)
- Post-launch hotfix plan
- Reassess and plan next steps

**Launch is 100% free** — monetization (3-tier freemium) designed post-launch.

---

## Execution Priority

```
[DONE]     Phase 7.5: All-AI Exercises     ✓
[DONE]     Gem Bug Fix + Cat Gallery       ✓
[DONE]     Phase 8: Audio Input (Mic)      ✓ (device testing remaining)
[DONE]     Phase 9: Music Library          ✓ (124 songs in Firestore)
[NOW]      Phase 10: Social & Leaderboards ← friends, leagues, challenges
[NEXT]     Phase 11: QA + Launch + Audit   ← comprehensive audit, then ship
[PARALLEL] Sound Design                    ← can prototype alongside any phase
[PARALLEL] Rive Animations                 ← nice-to-have, SVG system is functional
```

---

## Timeline (Weeks from Feb 17)

```
WEEK  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
      ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
PH5   ████████████                 DONE
PH6            ████████████        DONE
PH7                     ████████   DONE
PH7.5                      ██     DONE
GEMS+CAT                     █     DONE
PH8                        ████████     DONE
PH9                           ██████     DONE (124 songs uploaded)
PH10                              ████████  ← NOW  Social
PH11                                    ████████  QA + Launch
```

We are currently in **Week 6** (Feb 24). Phases 1-9 complete. Phase 10 (Social & Leaderboards) is next.

---

## Known Technical Constraints

1. **react-native-screens** pinned to 4.4.0 (Fabric codegen bug with RN 0.76)
2. **Native MIDI module** not installed (needs RN 0.77+). VMPK + IAC Driver ready for testing
3. **Native audio engine** (react-native-audio-api) requires RN 0.77+ for codegen. ExpoAudioEngine is primary
4. **Jest worker teardown warning** — timer leak, non-blocking
5. **~45 open GitHub issues** — to be triaged during QA sprint

---

## Archived Plan Files

The following files are **historical archives only** — do not use for current status:

| File | Original Purpose | Date |
|------|-----------------|------|
| `2026-02-13-adaptive-learning-design.md` | Phase 5 design (superseded by Phase 5 implementation) | Feb 13 |
| `2026-02-13-phase2-completion-design.md` | Phase 2 completion design | Feb 13 |
| `2026-02-13-phase2-implementation.md` | Phase 2 implementation tasks | Feb 13 |
| `2026-02-15-phase2-polish-design.md` | Keysie avatar + polish design | Feb 15 |
| `2026-02-15-phase2-polish-implementation.md` | Keysie avatar implementation | Feb 15 |
| `2026-02-15-firebase-auth-sync-design.md` | Phase 3 auth design | Feb 15 |
| `2026-02-15-firebase-auth-sync-implementation.md` | Phase 3 auth implementation | Feb 15 |
| `2026-02-15-gamification-polish-sprint.md` | Gamification sprint tasks | Feb 15 |
| `2026-02-16-gamification-adaptive-design.md` | Phase 4+ design | Feb 16 |
| `2026-02-16-gamification-adaptive-implementation.md` | Phase 4+ implementation | Feb 16 |
| `2026-02-16-gameplay-ux-rework-design.md` | Vertical PianoRoll design | Feb 16 |
| `2026-02-16-gameplay-ux-rework-implementation.md` | Vertical PianoRoll implementation | Feb 16 |
| `2026-02-17-16-week-roadmap.md` | Original 16-week roadmap (task details still useful for Phases 8-10) | Feb 17 |
| `2026-02-22-next-priorities.md` | Priority analysis (merged into this plan) | Feb 22 |

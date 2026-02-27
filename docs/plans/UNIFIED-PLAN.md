# Purrrfect Keys — Unified Plan

**Last Updated:** February 27, 2026
**Goal:** Production-quality piano learning app on App Store & Play Store
**Target Launch:** June 8, 2026 (16-week roadmap from Feb 17)
**Codebase Health:** 0 TypeScript errors, 2,621 tests passing, 121 suites

> **This is the single source of truth.** All historical plan files have been moved to `docs/plans/archive/`. The only other active plan file is `docs/plans/2026-02-27-arcade-concert-hall-implementation.md` (the task-by-task execution plan for Phase 10).

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
| Phase 7 | UI Revamp + Game Feel | **COMPLETE** | Concert Hall palette, composable SVG cats, Salsa NPC, custom tab bar |
| Phase 7.5 | All-AI Exercise Generation | **COMPLETE** | Skill-aware AI generation for all tiers |
| — | Gem Bug Fix | **COMPLETE** | immediateSave, auto-claim, toast feedback |
| — | Cat Gallery Redesign | **COMPLETE** | Unified swipeable gallery with abilities, buy flow |
| Phase 8 | Audio Input (Mic) | **COMPLETE** | YIN pitch detection, polyphonic ONNX Basic Pitch, InputManager |
| Phase 9 | Music Library | **COMPLETE** | 124 songs in Firestore, browse/search UI, mastery tiers |
| Phase 9.5 | UX Overhaul | **COMPLETE** | Assessment fix, HomeScreen redesign, mastery tests |
| Phase 10 | Arcade Concert Hall Revamp | **COMPLETE** | Sound design, combo escalation, loot reveals, screen redesigns |
| Phase 10.5 | Social & Leaderboards | **COMPLETE** | Friends, leagues, challenges, share cards, notifications |
| **Phase 11** | **QA + Launch + Audit** | **UP NEXT** | Beta testing, App Store submission |

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

### Phase 5 + 5.2: Adaptive Learning Revamp + 365-Day Curriculum
SkillTree DAG (100 nodes, 15 tiers, 12 categories), CurriculumEngine (4 session types), skill decay (14-day half-life), AI generation for tiers 7-15, DailySessionScreen, VoiceCoachingService + TTSService, WeakSpotDetector, DifficultyEngine, FreePlayAnalyzer, 150+ new tests.

### Phase 6 + 6.5: Avatar Evolution & Gamification + AI Coach Fix
4-stage evolution (Baby/Teen/Adult/Master), gem currency, 12 abilities via AbilityEngine, CatCollectionScreen, EvolutionReveal animation, GemEarnPopup, onboarding cat selection. AI Coach: 10 bugs fixed, FreePlay expanded to 48 scales, gamification fully wired.

### Phase 7: UI Revamp + Game Feel & Polish
Concert Hall palette (black + crimson), typography/shadow/animation/glow token systems, composable SVG cat system (12 profiles), Reanimated pose system (7 poses), SalsaCoach NPC, screen redesigns (Home, CompletionModal, DailySession, Profile), custom tab bar, ExerciseLoadingScreen, cat character renames (Vinyl→Ballymakawww, Noodle→Shibu, Pixel→Bella).

### Phase 7.5: All-AI Exercise Generation
Every exercise from tier 1 onward is AI-generated. Static JSON became offline fallback only. All 6 batches: skill mastery, GenerationHints for 100 SkillTree nodes, skill-aware buffer/generation pipeline, CurriculumEngine AI-first, LevelMap/LessonIntro AI integration, offline bootstrap.

### Gem Bug Fix + Cat Gallery Redesign (Feb 23)
Race condition fix: `createImmediateSave` utility, `completeDailyChallengeAndClaim()` atomic action. Unified gallery: merged CatSwitchScreen + CatCollectionScreen, 88%-width swipeable cards, ability icons, buy flow modal, gem balance header.

### Phase 8: Audio Input — Microphone Pitch Detection (Feb 23-26)
**Monophonic:** YINPitchDetector (pure TS), NoteTracker hysteresis, AudioCapture (react-native-audio-api), MicrophoneInput, InputManager (MIDI > Mic > Touch), MicSetupScreen, onboarding 3-option input, Free Play wired.
**Polyphonic:** PolyphonicDetector (ONNX Basic Pitch, 88 note bins), MultiNoteTracker (per-note hysteresis), AmbientNoiseCalibrator (RMS-based threshold tuning). Falls back to YIN if ONNX fails.
**Latency:** Mono=100ms compensation, Poly=120ms. Both get 1.5x timing tolerance for mic input.

### Phase 9: Music Library (Feb 24)
124 songs in Firestore (37 Gemini + 50 TheSession folk + 38 PDMX classical). Song types, ABC parser (abcjs), mastery tiers (none→bronze→silver→gold→platinum), Firestore CRUD, Gemini generation, SongLibraryScreen (genre carousel, search), SongPlayerScreen (section→Exercise conversion), 6 achievements, gem rewards on tier upgrade.

### Phase 9.5: UX Overhaul (Feb 27)
Assessment skill seeding fix, challenge→AI exercise wiring, mastery tests for all 15 tiers, HomeScreen feed-style redesign with MusicLibrarySpotlight and ReviewChallengeCard.

---

## Phase 10: Arcade Concert Hall Revamp (IN PROGRESS)

**Execution plan:** `docs/plans/2026-02-27-arcade-concert-hall-implementation.md` (24 tasks, 10 batches)

**Goal:** Transform from functional dark-mode Duolingo into Duolingo x Clash Royale hybrid — 3D cats, dramatic game-feel, full sound design, loot reveals.

**Visual target:** Duolingo's clear progression + Clash Royale's dopamine delivery (particles, reveals, screen shake, loot, sound on everything)

### Core Philosophy: "Arcade Concert Hall"

**Duolingo DNA:** Clear skill tree, streak psychology, session structure, celebration moments, daily goal ring-fill.

**Clash Royale / Brawl Stars DNA:** Chest/loot reveals, screen shake on combos, particle trails on rewards, buttons that breathe (idle pulse), card rarity aesthetics, sound on EVERYTHING.

### Retention-Ordered Priority

| Priority | Workstream | Impact |
|----------|-----------|--------|
| **P0** | Auth + Onboarding | 40%+ first-session retention |
| **P0** | 3D Cat Avatar system | Core differentiator |
| **P1** | HomeScreen command center | Daily return driver |
| **P1** | ExercisePlayer + CompletionModal | Core loop dopamine |
| **P1** | Sound Design system | Multiplier on all visuals |
| **P2** | LevelMap Trophy Road | Progression visibility |
| **P2** | DailySession + SongLibrary | Session + content quality |
| **P3** | CatSwitch + Profile | Collection + vanity retention |

### Key Deliverables

#### 1. Sound Design System (~30 assets)

**SoundManager** (`src/audio/SoundManager.ts`): Singleton service separate from piano AudioEngine. Uses expo-av round-robin pools + expo-haptics pairing. Fire-and-forget API: `soundManager.play('button_press')`.

**Sound categories:**
- **UI (5):** button_press, toggle_on, toggle_off, swipe, back_navigate
- **Gameplay (9):** note_correct, note_perfect, note_miss, combo_5, combo_10, combo_20, combo_break, countdown_tick, countdown_go
- **Rewards (6):** star_earn, gem_clink, xp_tick, level_up, chest_open, evolution_start
- **Cat (4):** meow_greeting, purr_happy, meow_sad, meow_celebrate

**Sourcing:** Piano-derived + royalty-free + synthesized. Format: .wav, 44.1kHz, mono, normalized.

All sounds paired with `expo-haptics` feedback. PressableScale auto-plays `button_press` + Light haptic.

#### 2. Combo Escalation System

5-tier visual escalation during gameplay:

| Combo | Tier | Color | Effects |
|-------|------|-------|---------|
| 0-4 | NORMAL | — | Standard gameplay |
| 5-9 | GOOD | #FFD700 gold | Glow intensifies, golden keyboard border |
| 10-14 | FIRE | #FF6B35 orange | Screen border glow, fire trail, "FIRE!" text |
| 15-19 | SUPER | #FF1744 crimson | Screen shake, gold notes, "SUPER!" slam |
| 20+ | LEGENDARY | rainbow | Heavy shake, golden storm, "LEGENDARY!" |

**Components:** `ComboMeter` (tier badge + scale animation), `ComboGlow` (animated background overlay with tier-specific gradients).

#### 3. CompletionModal → "Loot Reveal"

Timed 10-phase sequence (Clash Royale chest-opening energy):
1. **0.0s** — Screen dims, cat slides to center
2. **0.3s** — "EXERCISE COMPLETE!" SLAM text (0→120%→100% + impact sound)
3. **0.8s** — Score ring fills (2s), number counts up
4. **2.3s** — Stars appear ONE BY ONE with starburst + escalating sound
5. **3.5s** — "NEW RECORD!" banner (if applicable)
6. **4.0s** — Gems rain down into counter (each with clink sound)
7. **4.8s** — XP bar fills (level up = FLASH + fanfare)
8. **5.5s** — Cat reaction (celebrate/curious/sad based on score)
9. **6.0s** — AI coaching tip (calm contrast)
10. **6.5s** — Action buttons: "Open Reward Chest" / "Next Exercise" / "Try Again"

**Reward Chest System:**

| Performance | Chest | Reward |
|-------------|-------|--------|
| 3 stars + first time | Epic (purple glow) | 25 gems + cat XP boost |
| 3 stars (repeat) | Rare (blue glow) | 10 gems |
| 2 stars first time | Common (grey) | 5 gems |
| Below 2 stars | No chest | Just XP |

#### 4. 3D Cat Avatar System

**Technology:** Blender (low-poly ~5K faces) → react-three-fiber + @react-three/drei (native) → .glb with Draco compression (~200-400KB per cat)

**CatAvatar3D component:** Wraps react-three-fiber Canvas with SVG CatAvatar fallback when expo-gl unavailable. Props: `catId`, `evolutionStage`, `pose`, `size`, `interactive`.

**Performance budget:** ONE 3D canvas per screen max, 30fps, lazy-load models. ExerciseBuddy: tiny (80x80px), HomeScreen: largest (~200x200px).

**13 models:** 12 playable + Salsa NPC. Shared bone rig, per-cat mesh/texture, 4 evolution variants, 7 animations (idle, celebrate, teach, sleep, sad, play, curious).

**Fallback:** Current SVG composable system for devices without WebGL.

#### 5. Game Card Design System

**Rarity levels:** common (grey border), rare (blue glow), epic (purple glow), legendary (rainbow shimmer).

**GameCard component:** Wraps PressableScale with rarity border gradients + 3D tilt on press.

**Applied to:** HomeScreen action cards, DailySession exercise cards, SongLibrary song cards, CompletionModal reward cards.

#### 6. Screen-by-Screen Revamp

**AuthScreen → "Cinematic Intro":** 3D Salsa playing mini piano, floating musical notes particles, "Purrrfect Keys" shimmer title, tagline "Learn piano. Grow cats.", 3D-depth buttons with press animation + haptic + sound.

**OnboardingScreen → "Choose Your Starter":** Pokemon-starter energy — 3D Salsa walks in, animated skill meter, 3D piano keyboard plays actual notes, 3 starter cats on 3D pedestals, Duolingo-style goal picker.

**HomeScreen → "Command Center":** 3D cat hero (tap to pet → purr + hearts), animated 3D streak flame, Apple Watch-style ring fill, game cards with rarity borders + 3D tilt, pulsing Continue Learning CTA, shaking Daily Challenge chest.

**LevelMapScreen → "Trophy Road":** Themed environments per tier (grassy→city→concert hall→space), 3D-style landmarks instead of circles, glowing beacon on current node, animated dotted path fills gold, cat walks along path.

**DailySessionScreen:** Exercise cards as game cards (rarity borders, difficulty stars), section headers with animated icons, progress indicator.

**SongLibraryScreen → "Music Shop":** Album-art thumbnails, metallic mastery badges, genre carousel with 3D card stack, "NEW" pulsing badges.

**CatSwitchScreen → "Cat Collection":** 3D models on rotating pedestals, evolution preview, rarity borders, ability unlock glow.

**ProfileScreen → "Player Card":** Large 3D cat centerpiece, game-style stat badges, achievement grid with shimmer, dramatic streak flame.

### Technology Stack (New Dependencies)

- `react-three-fiber` + `@react-three/drei` — 3D cat rendering
- `expo-gl` — WebGL context for react-three-fiber
- `three` — Three.js core
- `@shopify/react-native-skia` — Particle effects (optional, can use Reanimated)

### Implementation Batches (24 tasks)

| Batch | Tasks | Focus |
|-------|-------|-------|
| 1 | 1-3 | SoundManager foundation + PressableScale wiring |
| 2 | 4-5 | Design tokens (combo tiers, rarity) + GameCard component |
| 3 | 6-9 | ExercisePlayer combo escalation (ComboMeter, ComboGlow, keyboard, sound wiring) |
| 4 | 10-12 | CompletionModal loot reveal (timed sequence, chest system, chest animation) |
| 5 | 13 | HomeScreen command center redesign |
| 6 | 14 | AuthScreen cinematic intro |
| 7 | 15-17 | 3D Cat Avatar infrastructure (CatAvatar3D, HomeScreen integration, ExerciseBuddy) |
| 8 | 18 | LevelMap Trophy Road |
| 9 | 19-22 | Remaining screens (Onboarding, DailySession, SongLibrary, CatSwitch + Profile) |
| 10 | 23-24 | Verification + docs update |

Full task details: `docs/plans/2026-02-27-arcade-concert-hall-implementation.md`

---

## Phase 10.5: Social & Leaderboards (COMPLETE)

**Goal:** Social features that drive daily engagement — friends, leagues, challenges, sharing.

### Friends System

Each user gets a unique 6-character alphanumeric friend code. Adding methods: manual code entry, deep link (`purrrfectkeys.app/add/ABC123`), QR code (stretch).

**Activity feed:** Shows friend milestones with user display name + equipped cat avatar. Items expire after 7 days.

### Weekly Leagues

Duolingo-style competitive leagues with 30-person groups:

| League | Promote | Demote |
|--------|---------|--------|
| Bronze | Top 10 → Silver | — |
| Silver | Top 10 → Gold | Bottom 5 → Bronze |
| Gold | Top 10 → Diamond | Bottom 5 → Silver |
| Diamond | — | Bottom 5 → Gold |

Resets every Monday 00:00 UTC. Cloud Function `rotateLeagues()`. Opt-in.

### Friend Challenges

Challenge a friend to beat your score on a specific exercise or song. 48h window. Winner gets 10 gems, loser gets 5. Push notification via FCM.

### Share Cards

Shareable image cards via `react-native-view-shot`: score card, streak card, evolution card, league card. Native share sheet.

### Push Notifications

| Trigger | Priority | Type |
|---------|----------|------|
| Daily reminder | Normal | Local |
| Streak at risk | High | Local |
| Challenge received | High | Remote (FCM) |
| League promotion | Normal | Remote |
| Friend milestone | Low | Remote |
| Evolution approaching | Normal | Local |

**Implementation:** `@react-native-firebase/messaging` (FCM) + `expo-notifications` (local).

### Firebase Backend

```
Firestore Collections:
  users/{uid}/friends          (friend connections)
  users/{uid}/activity         (activity feed items)
  leagues/{leagueId}           (weekly league data)
  challenges/{challengeId}     (friend-to-friend)
  friendCodes/{code}           (lookup table → uid)

Cloud Functions:
  onWeekEnd → rotateLeagues()  (Monday 00:00 UTC)
  onXpChange → updateLeague()  (real-time standings)
  onChallenge → sendNotif()    (push notification)
  onMilestone → notifyFriends()(activity feed broadcast)
```

### New Files

| File | Purpose |
|------|---------|
| `src/stores/socialStore.ts` | Friends, activity feed, challenges |
| `src/stores/leagueStore.ts` | League standings, rank, promotion |
| `src/services/firebase/socialService.ts` | Firestore CRUD for friends, challenges |
| `src/services/firebase/leagueService.ts` | League queries, weekly XP |
| `src/services/notificationService.ts` | FCM + local notifications |
| `src/screens/SocialScreen.tsx` | Friends list + activity feed |
| `src/screens/LeaderboardScreen.tsx` | League standings UI |
| `src/screens/ChallengeScreen.tsx` | Active/pending challenges |
| `src/screens/AddFriendScreen.tsx` | Friend code + share link |
| `src/components/ShareCard.tsx` | Shareable images |
| `firebase/functions/leagueRotation.ts` | Weekly promote/demote |
| `firebase/functions/socialNotifications.ts` | Push on social events |

### Navigation Change

Replace "Play" tab with "Social" tab. Free Play moves to HomeScreen button.
Tab order: Home, Learn, Songs, Social, Profile.

### Exit Criteria

- Friend system with code/link adding + activity feed
- Weekly leagues (Bronze → Diamond) with promotion/demotion + leaderboard UI
- Friend challenges with 48h window
- Shareable cards
- Push notifications (local + remote via FCM)
- Cloud Functions for league rotation + social notifications
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
[DONE]     Phases 1-10.5             ✓ All complete (3D cats deferred)
[NEXT]     Phase 11: QA + Launch     ← comprehensive audit, then ship
```

---

## Timeline (Weeks from Feb 17)

```
WEEK  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
      ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
PH1-9.5                              DONE
PH10-ACH                         ████████████  DONE
PH10.5-SOC                                ████  DONE
PH11                                      ████████  ← NEXT
```

Currently in **Week 6** (Feb 27). Phases 1-9.5 complete. Phase 10 ACH starting now.

---

## Known Technical Constraints

1. **react-native-screens** pinned to 4.4.0 (Fabric codegen bug with RN 0.76)
2. **Native MIDI module** not installed (needs RN 0.77+). VMPK + IAC Driver ready
3. **Native audio engine** (react-native-audio-api) requires RN 0.77+. ExpoAudioEngine is primary
4. **Jest worker teardown warning** — timer leak, non-blocking
5. **~45 open GitHub issues** — to be triaged during QA sprint

---

## 3D Assets Production Plan

### Phase A: Cat Models (can start immediately, parallel)
- 13 low-poly Blender models (~5K faces each)
- Shared bone rig (head, spine, tail, 4 legs, ears, jaw)
- 4 evolution variants per cat
- 7 animations each (idle, celebrate, teach, sleep, sad, play, curious)
- Export as .glb with Draco compression
- Total: ~5-8MB lazy-loaded

### Phase B: Gameplay 3D Assets
- Note gems (3 variants: quarter/half/whole)
- Particle textures (starburst, gem trail, combo flame)
- Chest models (common/rare/epic)

### Phase C: UI 3D Elements
- Gem currency model (spinning diamond)
- Trophy models per league tier
- Crown/accessories for evolved cats

### Phase D: Environments
- LevelMap tier backgrounds (5 themed)
- Auth screen floating piano/notes scene

# Purrrfect Keys — Unified Plan

**Last Updated:** March 3, 2026
**Goal:** Working piano learning app on a real device, then beta with specialists
**Codebase Health:** 0 TypeScript errors, 2,717 tests passing, 129 suites
**Current Priority:** Make the existing app work on a physical device

> **This is the single source of truth.** All historical plans are in `docs/plans/archive/`.
> Active design docs: `premium-svg-cats-*.md`, `salsa-coaching-loop-*.md` (approved, not yet implemented).

---

## Strategy

**Phase A (NOW):** Fix what's broken. Make the core loop work on a real device.
**Phase B (NEXT):** Premium SVG cats + Salsa coaching loop + real piano samples.
**Phase C (LATER):** Content expansion, retention mechanics, analytics, beta distribution.
**Phase D (POST-BETA):** Monetization informed by real usage data.

---

## Status Overview (Honest)

| Phase | Name | Code Status | Device-Verified? | Real Status |
|-------|------|-------------|-----------------|-------------|
| Phase 1 | Core Loop | Done | Simulator only | **WORKING** — exercises, scoring, XP, streaks |
| Phase 2 | Gamification & Polish | Done | Simulator only | **WORKING** — LevelMap, theme, transitions |
| Phase 3 | Firebase Auth + Sync | Done | Partial (sign-in tested) | **WORKING** — but Firestore rules incomplete |
| Phase 4+ | Adaptive Learning + UI | Done | Simulator only | **WORKING** — design tokens, learner profile |
| Phase 5 | Adaptive Learning Revamp | Done | Simulator only | **WORKING** — SkillTree, CurriculumEngine |
| Phase 6 | Avatar Evolution | Done | Simulator only | **WORKING** — evolution, gems, abilities |
| Phase 7 | UI Revamp | Done | Simulator only | **WORKING** — SVG cats, Salsa NPC, palette |
| Phase 8 | Audio Input (Mic) | Done | **NO — crashes on device** | **BROKEN** — ONNX native module missing, untested |
| Phase 9 | Music Library | Done | Simulator only | **NEEDS FIREBASE** — 124 songs in Firestore only |
| Phase 10 | Arcade Concert Hall | Done | Simulator only | **PARTIALLY WORKING** — sounds are synth beeps, not real |
| Phase 10.5 | Social & Leaderboards | Done | **NO** | **BROKEN** — Firebase rules/indexes not deployed |
| ~~3D Cats~~ | ~~3D Cat Integration~~ | Done | **NO** | **ELIMINATED** — causes GL crashes, removing |
| Phase 11 | QA + Launch | In progress | Partially | **IN PROGRESS** — CI works, IPA build broken |

### What "Done" Actually Means

"Done" = code written, TypeScript compiles, tests pass in Jest with mocks. It does NOT mean:
- Tested on a physical device
- Firebase backend deployed
- Works end-to-end with real data
- Sounds like a real piano (it sounds like synth beeps)

---

## Phase 11A: Make It Work On Device (CURRENT PRIORITY)

This is what we're doing NOW. Nothing else until this is done.

### IPA Build Fix
- [ ] Add `EXPO_TOKEN` to GitHub repository secrets
- [ ] Verify EAS Build succeeds (preview IPA for iOS)
- [ ] Get working IPA onto test device

### Firebase Deployment
- [ ] Deploy Firestore security rules (`firebase deploy --only firestore:rules`)
- [ ] Create composite indexes for songs, leagues, songMastery queries
- [ ] Deploy Cloud Functions (`firebase deploy --only functions`)
- [ ] Set `GEMINI_API_KEY` as Firebase secret
- [ ] Verify from second account: cannot read another user's data

### Mic Crash Fix
- [ ] Disable ONNX polyphonic detection path (requires native module not in standard builds)
- [ ] Test YIN monophonic detection on device
- [ ] Fix audio session configuration for mic input
- [ ] Verify: open app → select mic input → do exercise → mic detects notes
- [ ] Graceful fallback to touch when mic fails

### 3D Cat Elimination
- [ ] Remove `react-three-fiber`, `@react-three/drei`, `three`, `expo-gl` from dependencies
- [ ] Remove `src/components/Mascot/3d/` directory
- [ ] Remove `assets/models/*.glb` files (saves ~4MB)
- [ ] Update all screens to use SVG `CatAvatar` exclusively (no `Cat3DCanvas`)
- [ ] Remove 3D-specific jest mocks from `jest.setup.js`
- [ ] Remove `glb`/`gltf` from metro.config.js asset extensions
- [ ] Update design-system.md to remove 3D cat section
- [ ] Verify app boots and all screens render without GL errors

### Core Loop Device Test
- [ ] Build dev client with native modules
- [ ] Test: app launch → onboarding → first exercise → scoring → completion
- [ ] Test: touch input → sound plays (<20ms perceived latency)
- [ ] Test: pause/resume mid-exercise
- [ ] Test: CompletionModal shows score + AI coaching
- [ ] Verify no crashes in 10-minute session

### Reference: `docs/MANUAL-VERIFICATION-CHECKLIST.md`
The full pre-launch verification runbook. Sections A (Firebase), B (CI/CD), D (Device Testing) are the immediate priority.

---

## Phase 11B: Make It Sound & Look Good (NEXT)

Only after Phase 11A is complete and verified on device.

### Real Piano Samples
- [ ] Download Salamander Grand Piano (CC-BY-3.0, free)
- [ ] Process: 3 velocity layers, every 3rd semitone, OGG/M4A, ~12MB total
- [ ] Integrate into ExpoAudioEngine (replace synthetic WAV generation)
- [ ] Integrate into WebAudioEngine (AudioBuffer decoding)
- [ ] Test on device: sounds like a real piano

### Premium SVG Cats
**Design:** `docs/plans/2026-03-03-premium-svg-cats-design.md`
**Implementation:** `docs/plans/2026-03-03-premium-svg-cats-implementation.md`

Replace geometric-primitive SVG cats with hand-crafted bezier paths:
- 8-layer composite eyes (eyelid, sclera, iris, pupil, catch lights)
- Organic head/body shapes (no Circle/Ellipse for major forms)
- 9 gradients (expanded from 5), consistent lighting
- Curved tapered whiskers, toe beans, anime-style nose
- 3 new profile fields: `pupilType`, `fang`, `hairTuftSize`
- 8-batch implementation (highest visual impact first)
- Pure `react-native-svg` — no new dependencies, works everywhere

### Crash Reporting
- [ ] Install `@sentry/react-native` (better Expo support than Crashlytics)
- [ ] Wire to ErrorBoundary.tsx
- [ ] Add non-fatal tracking for: mic failures, AI fallbacks, ONNX failures

---

## Phase 12: Salsa Coaching Loop (AFTER 11B)

**Design:** `docs/plans/2026-03-03-salsa-coaching-loop-design.md`
**Implementation:** `docs/plans/2026-03-03-salsa-coaching-loop-implementation.md`

### Pre-Exercise Intro
3 adaptive tiers based on context:
- **Brief** (5-8s): Returning, last score ≥ 70%. One targeted tip.
- **Walkthrough** (15-20s): First attempt. Skill intro + 4-bar demo + tip.
- **Extended** (20-30s): 3+ consecutive fails. Hardest section demo.

### Post-Exercise Replay
- Color-coded PianoRoll replay (green/yellow/red/grey/purple)
- Timeline scrub bar with colored dots and draggable playhead
- Auto-pause on 2-3 worst mistakes (AI-selected via Gemini)
- Salsa explains mistake → demos correct version → resumes
- Keyboard in read-only mode with dual-highlight

### Depends On
- Working ExercisePlayer (Phase 11A)
- Working DemoPlaybackService (exists)
- Working Gemini AI pipeline (Cloud Functions from Phase 11A)

---

## Phase 13: Content & Retention (AFTER 12)

### Content Expansion
- Expand from 36 to 100+ exercises (batch AI generation + hand review)
- Expand from 124 to 300+ songs (TheSession, PDMX, Gemini imports)
- Add exercise types: Rhythm, Ear Training, Chord ID

### Retention Mechanics
- Cat mood ↔ streak connection (6 tiers)
- "Come back" re-engagement flow (sad cat + quick review)
- Streak freeze purchase (30 gems)

### Analytics
- 5 PostHog funnels (onboarding, session depth, retention, content quality, coaching)
- Beta feedback channel (ProfileScreen → Firestore `feedback` collection)

---

## Phase 14: Beta Distribution (AFTER 13)

- TestFlight upload (up to 100 internal testers)
- App icon, screenshots, metadata
- Privacy policy at public URL (draft exists: `docs/privacy-policy.md`)
- 5-day beta window with specialists
- Priority fixes from feedback

---

## Phase 15: Monetization (POST-BETA)

Deferred until after specialist feedback. Planned:
- RevenueCat subscription ($9.99/mo or $59.99/yr)
- Gem IAP for cosmetics
- Informed by real usage data from beta

---

## Completed Phases (Summary)

### Phase 1: Core Loop
Exercise Player with PianoRoll + Keyboard, 5-dimensional scoring engine, nearest-note matching, XP/levels/streaks, AI Coach (Gemini 2.0 Flash), ContentLoader for 30 JSON exercises across 6 lessons, ExpoAudioEngine with round-robin voice pools, MIDI input architecture.

### Phase 2: Gamification & Polish
LevelMapScreen (Duolingo-style), Concert Hall dark theme, profile editing, all 30 exercises validated, audio engine rewrite (JSI WebAudio + Expo fallback), mascot system (12 SVG cats), ScoreRing, PressableScale, transition screens, multi-touch keyboard.

### Phase 3: Firebase Auth + Sync
Firebase Auth (Email, Google, Apple, Anonymous), SyncManager with offline queue + Firestore pull/merge, cross-device sync ("highest wins"), local-to-cloud migration, auth resilience (guest fallback, 8s timeout).

### Phase 4+: Adaptive Learning + UI Overhaul
Design tokens, learner profile store, cat dialogue engine (12 cats x 14 triggers), Gemini exercise generation + buffer manager, skill assessment screen, screen redesigns, SplitKeyboard, 32 achievements.

### Phase 5: Adaptive Learning Revamp + 365-Day Curriculum
SkillTree DAG (100 nodes, 15 tiers, 12 categories), CurriculumEngine (4 session types), skill decay, AI generation for tiers 7-15, DailySessionScreen, VoiceCoachingService + TTSService, WeakSpotDetector, DifficultyEngine, FreePlayAnalyzer.

### Phase 6: Avatar Evolution & Gamification + AI Coach Fix
4-stage evolution, gem currency, 12 abilities via AbilityEngine, CatCollectionScreen, EvolutionReveal, GemEarnPopup, onboarding cat selection. AI Coach: 10 bugs fixed, FreePlay expanded to 48 scales.

### Phase 7: UI Revamp + Game Feel & Polish
Concert Hall palette, composable SVG cat system (12 profiles), Reanimated pose system, SalsaCoach NPC, screen redesigns, custom tab bar, ExerciseLoadingScreen, All-AI exercise generation.

### Phase 8: Audio Input (Mic) — CODE DONE, DEVICE BROKEN
YIN pitch detection, ONNX polyphonic detection (code only — crashes on device), InputManager (MIDI > Mic > Touch), MicSetupScreen. Needs device testing and ONNX path disabled.

### Phase 9: Music Library
124 songs in Firestore (37 Gemini + 50 TheSession + 38 PDMX). Song types, ABC parser, mastery tiers, SongLibraryScreen, SongPlayerScreen. Requires deployed Firestore to function.

### Phase 10: Arcade Concert Hall
SoundManager (procedural synthesis — needs real .wav files), combo escalation, loot reveal sequence, GameCard rarity system, screen redesigns.

### Phase 10.5: Social & Leaderboards — CODE DONE, FIREBASE NOT DEPLOYED
socialStore, leagueStore, socialService, leagueService, SocialScreen, LeaderboardScreen, AddFriendScreen, FriendsScreen, ShareCard, notifications. All depend on Firestore rules/indexes being deployed.

### Phase 11: QA + Launch (IN PROGRESS)
Account deletion Cloud Function, 3 Gemini Cloud Functions, CI/CD (ci.yml + build.yml), environment audit, MIDI hardware integration, audio session race condition fix, ElevenLabs TTS (13 cat voices), Maestro E2E scaffolding. IPA build broken (missing EXPO_TOKEN).

---

## Known Technical Constraints

1. **react-native-screens** pinned to 4.4.0 (Fabric codegen bug with RN 0.76)
2. **Native MIDI module**: `@motiz88/react-native-midi` installed — needs dev build for hardware
3. **Audio engine**: ExpoAudioEngine primary (synthetic sounds). Needs Salamander samples.
4. **ONNX Basic Pitch**: Code written, model downloaded — crashes on device. Disable until dev build.
5. **Cloud Functions**: 4 written, 0 deployed
6. **Sound assets**: Zero .wav/.mp3 files in repo. All procedural synthesis.
7. **Songs**: All in Firestore, zero in repo. No offline song access.
8. **ElevenLabs TTS**: Needs `EXPO_PUBLIC_ELEVENLABS_API_KEY` in environment. Falls back to expo-speech.
9. **Firestore rules**: Missing for songs, social, leagues collections. Security hole.
10. **Jest worker teardown warning**: Timer leak, non-blocking.

---

## Active Documents

| Document | Purpose |
|----------|---------|
| **This file** (`UNIFIED-PLAN.md`) | Single source of truth for all phases |
| `docs/MANUAL-VERIFICATION-CHECKLIST.md` | Hands-on pre-launch runbook |
| `docs/system-design-analysis.md` | Architecture assessment + 30 recommendations |
| `docs/design-system.md` | Design tokens, component inventory |
| `docs/privacy-policy.md` | App Store submission ready |
| `docs/PRD.md` | Product requirements (needs Section 4+7 update) |
| `docs/plans/2026-03-03-premium-svg-cats-design.md` | Approved cat art redesign |
| `docs/plans/2026-03-03-premium-svg-cats-implementation.md` | Task-by-task cat implementation |
| `docs/plans/2026-03-03-salsa-coaching-loop-design.md` | Approved coaching loop design |
| `docs/plans/2026-03-03-salsa-coaching-loop-implementation.md` | Task-by-task coaching implementation |
| `docs/plans/2026-03-03-beta-launch-master-design.md` | Long-term vision: 500+ exercises, 5 paths, onboarding, retention, analytics (execute after device fixes) |

All other plan files are in `docs/plans/archive/`.

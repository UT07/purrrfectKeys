# Purrrfect Keys — Unified Master Plan

**Last Updated:** March 15, 2026
**Vision:** The best piano learning app on the App Store. Industry game-changer.
**Codebase Health:** 0 TypeScript errors, 2,953 tests passing, 145 suites
**Current Phase:** Phase 13 — Content Explosion (VERIFICATION)

> **This is the single source of truth.** Every feature, every phase, every audit.
> Historical plans are in `docs/plans/archive/`.
> System design analysis: `docs/system-design-analysis.md`
> Production path expansion: `docs/plans/production-path-and-web-expansion.md`

---

## Phase Numbering

Phases 1–10.5 were the original build-out. QA is a continuous parallel track, not a numbered phase. New work continues sequentially from **Phase 11**.

```
╔══════════════════════════════════════════════════════════╗
║  COMPLETED (Legacy Phases 1–10.5)                        ║
║  Core Loop, Gamification, Auth, Adaptive Learning,       ║
║  Curriculum, Avatar Evolution, UI Revamp, Audio Input,   ║
║  Music Library, Arcade Concert Hall, Social v1           ║
╠══════════════════════════════════════════════════════════╣
║  🔄 QA & DEVICE VERIFICATION — ONGOING PARALLEL TRACK   ║
║  Not a numbered phase. Always active.                    ║
╠══════════════════════════════════════════════════════════╣
║  PHASE 11: Foundation Cleanup              ✅ DONE       ║
║  PHASE 12: Exercise Types + UI             ✅ DONE       ║
║  PHASE 13: Content Explosion               ← NOW        ║
║  PHASE 14: Cat Progression Rebalance                     ║
║  PHASE 15: The Arena + Music Guilds                      ║
║  PHASE 16: Cat Studio                                    ║
║  PHASE 17: "Play First" Onboarding                       ║
║  PHASE 18: Retention Engine                              ║
║  PHASE 19: Analytics + Crash Reporting                   ║
║  PHASE 20: System Design Hardening                       ║
║  PHASE 21: App Store Launch (Limited Users)               ║
║  PHASE 22: Monetization (Subscriptions + Gems + Stripe)  ║
║  PHASE 23: Feedback Automation Pipeline                  ║
║  PHASE 24+: Production Path (Post-v1 Expansion)         ║
╚══════════════════════════════════════════════════════════╝
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                  │
│  Expo SDK 52  •  TypeScript 5.x  •  Zustand  •  Reanimated 3       │
├─────────────────────────────────────────────────────────────────────┤
│  Audio: ExpoAudioEngine (FluidR3 GM samples, round-robin pools)    │
│  Input: MIDI > Mic (YIN + ONNX Basic Pitch) > Touch               │
│  AI:    Gemini 2.0 Flash via Cloud Functions (client fallback)     │
│  TTS:   ElevenLabs (13 neural voices) → expo-speech fallback       │
│  State: 15 Zustand stores → AsyncStorage (migrate to MMKV)        │
├─────────────────────────────────────────────────────────────────────┤
│                              FIREBASE                                │
│  Auth (Anonymous/Email/Google/Apple)  •  Firestore  •  Functions   │
│  9 Cloud Functions  •  Firestore Rules  •  Composite Indexes       │
├─────────────────────────────────────────────────────────────────────┤
│                            SERVICES                                  │
│  PostHog (analytics)  •  ElevenLabs (TTS)  •  Gemini (AI)         │
│  EAS Build (CI/CD)  •  TestFlight/Play Store                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## What's Done

### Legacy Phases (1–10.5)

| Phase | Name | Key Deliverables |
|-------|------|------------------|
| 1 | Core Loop | ExercisePlayer, 5D scoring, XP/levels/streaks |
| 2 | Gamification | LevelMap, theme, transitions |
| 3 | Firebase Auth | Email/Google/Apple/Anonymous, cross-device sync |
| 4 | Adaptive Learning | Design tokens, learner profile |
| 5 | Curriculum | SkillTree DAG (120 nodes, 18 tiers), CurriculumEngine (4 session types) |
| 6 | Avatar Evolution | 4-stage evolution, gems, 12 abilities, 12 cat profiles |
| 7 | UI Revamp | Composable SVG cats, SalsaCoach NPC, design tokens |
| 8 | Audio Input | YIN + ONNX polyphonic, InputManager, measurement mode |
| 9 | Music Library | 582 songs (Firestore), ABC parser, mastery tiers |
| 10 | Arcade Concert Hall | SoundManager, combo escalation, loot reveal, FluidR3 GM samples |
| 10.5 | Social v1 | Friends, leagues, challenges, activity feed |

### New Phases (11–12)

| Phase | Name | Key Deliverables |
|-------|------|------------------|
| 11 | Foundation Cleanup | TS errors fixed, username sync, device verification, CI/CD |
| 12 | Exercise Types + UI | 6 types (play/rhythm/earTraining/chordId/sightReading/callResponse), type-specific scoring + UI, PlayScreen arcade redesign, social overhaul |
| 13 | Content Explosion | 599 exercises across 50 lessons, 582 songs, 120 skill nodes (18 tiers), 5 learning paths, "Review with Salsa" replay coaching |

### QA & Device Verification — Ongoing Parallel Track

This is NOT a numbered phase. It runs continuously alongside all feature work.

**Philosophy:** Every feature branch must pass the quality gates before merge. QA is not a phase you "enter" — it's the operating standard. The CI pipeline enforces automated checks; device verification is manual and tracked below.

**Automated Quality Gates (CI — runs on every push/PR):**

| Gate | Tool | Status |
|------|------|--------|
| TypeScript | `npm run typecheck` | ✅ 0 errors |
| Tests | `npm run test` | ✅ 145 suites, 2,953 tests, 0 failures |
| Lint | `npm run lint` | ✅ 0 errors (~531 warnings, non-blocking) |
| Build | EAS Build (preview channel) | ✅ iOS + Android configured |

**Infrastructure (Deploy Once, Verify Periodically):**

| Component | Status |
|-----------|--------|
| Firestore rules | ✅ Deployed (Mar 15) |
| Firestore indexes | ✅ Deployed |
| Cloud Functions | ✅ 11 functions deployed (nodejs22, us-central1) |
| CI/CD (GitHub Actions) | ✅ Active (ci.yml + build.yml) |
| Piano samples | ✅ FluidR3 GM (C2-C6, 132KB) |
| ElevenLabs TTS | ✅ 13 per-cat neural voices |
| Firebase Auth | ✅ Anonymous + Email + Google + Apple |
| Account deletion | ✅ Cloud Function + client fallback |
| Cross-device sync | ✅ Bidirectional push/pull with "highest wins" merge |

**Cloud Functions Deployed:**

| Function | Trigger | Purpose |
|----------|---------|---------|
| syncProgress | callable | Cross-device progress sync |
| completeExercise | callable | Server-side exercise completion |
| getExerciseRecommendations | callable | AI exercise recommendations |
| getWeeklySummary | callable | Weekly progress summary |
| generateCoachFeedback | callable | Gemini AI coaching |
| generateExercise | callable | Gemini AI exercise generation |
| generateSong | callable | Gemini AI song generation |
| dailySightReading | callable | Daily sight-reading challenge |
| deleteUserAllData | callable | GDPR account deletion |
| cleanupCoachFeedbackCache | scheduled | Cache cleanup |

**Manual Device Verification (tracked per feature):**

- [x] Mic polyphonic chord detection (verified Mar 8)
- [ ] Core loop (onboarding → exercise → scoring → XP)
- [ ] Piano sound (FluidR3 GM samples on device)
- [ ] PianoRoll cascade + hit line
- [ ] SplitKeyboard
- [ ] Pause/resume
- [ ] AI coaching in CompletionModal
- [ ] Songs tab
- [ ] Social features
- [ ] Auth persistence
- [ ] 10-minute stability
- [ ] 50 lessons navigable end-to-end
- [ ] Learning path switching
- [ ] Review with Salsa replay coaching

---

## Phase 13: Content Explosion ← NOW

**Goal:** 500+ exercises, 500+ songs, 5 learning paths. Content is king.
**Generation done. Quality verification in progress.**

### Final Numbers

| Metric | Target | Actual |
|--------|--------|--------|
| Exercises | 500+ | **599** across 50 lessons |
| Songs in Firestore | 500+ | **582** (37 Gemini + 50 TheSession + 38 PDMX + batches 1-3) |
| Skill nodes | 100 | **120** across 18 tiers |
| Learning paths | 5 | **5** (Piano Basics, Pop & Film, Classical, Jazz & Blues, Kids) |
| Exercise types | 6 | **6** (play, rhythm, earTraining, chordId, sightReading, callResponse) |

### Exercise Library (599)

| Block | Lessons | Exercises | Skills |
|-------|---------|-----------|--------|
| Beginner | 1-6 | 36 static | Note finding, C position, simple melodies, both hands |
| Early Intermediate | 7-12 | ~72 AI | Black keys, G/F/D major, sharps/flats, dotted rhythms |
| Intermediate | 13-20 | ~96 AI | Minor keys, chords & inversions, arpeggios, pedaling |
| Upper Intermediate | 21-28 | ~96 AI | Chord progressions, accompaniment, syncopation, 6/8 time |
| Advanced | 29-40 | ~144 AI | Modulation, jazz voicings, classical technique, ornaments |
| Extended | 41-50 | ~155 AI | New keys, advanced chords, compound time, performance repertoire |

### Tasks (All Complete)

| # | Task | Status |
|---|------|--------|
| 13.1 | Batch exercise generation (50 lessons, 599 exercises) | ✅ |
| 13.2 | Exercise type assignment across all exercises | ✅ |
| 13.3 | Exercise index + lazy loading (ContentLoaderRegistry.generated.ts) | ✅ |
| 13.4 | Song generation (batches 1-3) | ✅ |
| 13.5 | Upload all songs to Firestore (Admin SDK) | ✅ 582 songs |
| 13.6 | SkillTree expansion (100 → 120 nodes, 15 → 18 tiers) | ✅ |
| 13.7 | Create 5 learning path manifests | ✅ |
| 13.8 | LevelMap rewrite (50 nodes + path filtering + path selector) | ✅ |
| 13.9 | Path selection in onboarding (7-step flow) | ✅ |
| 13.10 | Song-curriculum linking (`requiredSkills` + `skillCategory`) | ✅ |
| 13.11 | Daily Sight-Reading Challenge Cloud Function | ✅ |
| 13.12 | Weekly Featured Song UI (HomeScreen card) | ✅ |
| 13.13 | "Review with Salsa" replay coaching button in PostExerciseScreen | ✅ |
| 13.14 | Tier 16-18 exercise generation hints | ✅ |
| 13.15 | ContentLoader extended to 50 lessons | ✅ |
| 13.16 | **Content quality verification** — exercises: 599/599 pass (134 auto-fixed), songs: 91% clean (177 ABC→layers fixed, 1 unfixable), ABC parser normalized | ✅ |
| 13.17 | **Merge to master** | ⬜ Ready (manual spot-checks recommended) |

---

## Phase 14: Cat Progression Rebalance

**Goal:** Make cat evolution a meaningful months-long journey, not a week-long sprint.

### New Progression Model

| Stage | New XP | Target Time |
|-------|--------|-------------|
| Baby → Teen | 2,000 | 2-3 weeks daily |
| Teen → Adult | 8,000 | 2-3 months daily |
| Adult → Master | 25,000 | 6+ months daily |

### New XP Sources

Exercise completion (10-85), song mastery tier up (50-200), daily challenge (25-75), weekly challenge (150), streak milestones (100-500), new skill mastered (100), lesson completed first time (200).

### Milestone Rewards

Teen: 200 gems + Common accessories. Adult: 500 gems + Rare/Epic. Master: 1000 gems + Legendary + exclusive.

### Tasks

| # | Task |
|---|------|
| 14.1 | Update `EVOLUTION_XP_THRESHOLDS` |
| 14.2 | Add new XP sources |
| 14.3 | Milestone reward system |
| 14.4 | Grandfather existing users |
| 14.5 | Update progress displays |

---

## Phase 15: The Arena + Music Guilds

**Goal:** Social becomes the #1 retention driver.

### The Arena (Social Tab Redesign)
- Arena entrance animation (tier-specific skins)
- Battle log (challenge cards with cat vs cat)
- Reaction system on activity feed
- Friend profile cards

### Music Guilds (Bands)
- Create/join band (150 gems, max 8-12 members)
- Band leaderboard (aggregate weekly XP)
- Band chat (emoji-only, kid-safe)
- Band vs band weekly challenges
- Band banner + roles

### Social Quick Actions
- Challenge from CompletionModal
- Share score card
- QR code friend discovery
- League promotion/demotion animations

---

## Phase 16: Cat Studio

**Goal:** Full Bitmoji-style accessory equip. 48 items, 6 categories.

Categories: Hats, Glasses, Outfits, Capes/Back, Collars/Neck, Effects.
Evolution-gated: Baby=none, Teen=Common, Adult=Rare/Epic, Master=Legendary.
State: `settingsStore.equippedAccessories` + `ownedAccessories`. Data already in `src/data/accessories.ts`.

---

## Phase 17: "Play First" Onboarding

**Goal:** User plays piano within 15 seconds.

```
STEP 1 (0-15s):  "Play your first note!"  → highlighted Middle C → confetti
STEP 2 (15-45s): "Now a melody!"          → guided C-D-E-F-G
STEP 3 (45-75s): "A real song!"           → 8-note Twinkle Twinkle with scoring
STEP 4 (75-90s): Choose cat + learning path
STEP 5 (90-110s): Quick setup (experience + input + goal)
```

---

## Phase 18: Retention Engine

**Goal:** Users come back daily.

- Cat mood ↔ streak (0 days=sad, 7+=excited, 30+=legendary rainbow aura)
- Streak freeze (30 gems, max 3 stockpiled)
- Re-engagement: push after 3+ days, sad cat return screen
- Weekly featured song (3x gem multiplier)

---

## Phase 19: Analytics + Crash Reporting

**Goal:** Full visibility before launch.

- PostHog: 5 funnels (onboarding, session depth, retention, content quality, coaching)
- Crashlytics: `@react-native-firebase/crashlytics` + ErrorBoundary
- In-app feedback: ProfileScreen → Firestore `feedback` collection

---

## Phase 20: System Design Hardening

**Goal:** Production-grade security and performance.

| # | Fix |
|---|-----|
| 20.1 | Move ALL Gemini calls through Cloud Functions |
| 20.2 | AsyncStorage → MMKV migration |
| 20.3 | Sync queue deduplication + compaction |
| 20.4 | Song search at scale (Algolia or Firestore text search) |
| 20.5 | Cloud Functions rate limiting |
| 20.6 | Offline indicator banner |
| 20.7 | Node.js 20 → 22 upgrade (before 2026-04-30 deprecation) |

---

## Phase 21: App Store Launch (Limited Users)

**Goal:** Ship to real users. iOS first.

### TestFlight Beta (2 weeks)
- 50-100 testers (piano teachers + students)
- Crash reporting + PostHog + feedback channel active
- Fix critical bugs from beta

### App Store Submission
- App icon, screenshots (6.7", 6.5", 5.5")
- Privacy URL, support URL, privacy manifest
- Production Firebase + production API keys

---

## Phase 22: Monetization

**Goal:** Sustainable revenue. Subscriptions for content, gems for cosmetics.

### Subscription (RevenueCat)

| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | Lessons 1-6, 10 songs/week, 1 cat, touch input, local-only |
| Pro | $9.99/mo or $59.99/yr | Everything unlimited, all cats, cloud sync, AI coaching, all paths |

### Gem IAP (Cosmetics Only)

| Pack | Price |
|------|-------|
| 100 gems | $0.99 |
| 600 gems | $4.99 |
| 1,500 gems | $9.99 |

Gems buy: accessories, streak freezes, band creation. **Never gameplay advantage.**

### Stripe (Web — Phase 24+)
- Web subscriptions via Stripe (no 30% App Store cut)
- Same tier structure, synced via Firebase

### Implementation
- RevenueCat SDK integration (iOS + Android)
- Paywall triggers (content gates, cat collection, AI coaching)
- Server-side receipt validation (Cloud Function)
- Gem purchase + restore flow
- Subscription status cached locally
- A/B test: paywall placement and pricing

---

## Phase 23: Feedback Automation Pipeline

**Goal:** Turn user feedback into actionable bug reports automatically.

### Pipeline
1. In-app "Send Feedback" → Firestore `feedback` collection
2. Cloud Function processes new feedback → creates GitHub issue (via GitHub API)
3. Crash reports (Crashlytics) → auto-triage by severity
4. PostHog session recordings for UX bug reproduction
5. Weekly digest: top feedback themes, crash-free rate, retention metrics

### Automation
- GitHub issue auto-labeling (bug/feature/UX) via Gemini classification
- Slack channel for high-severity crashes
- User response: "Thanks, we fixed this in v{X}" auto-notification

---

## Phase 24+: Production Path (Post-v1 Expansion)

**Full design:** `docs/plans/production-path-and-web-expansion.md`

Expand from piano-only to multi-discipline music education (Duolingo multi-language model).

### Critical Findings (Verified in Codebase)

These must be fixed before Production Path work begins:

1. **CurriculumEngine is NOT path-agnostic** — 14+ direct `SKILL_TREE` references, hardcoded piano fallbacks. Fix: `DisciplineConfig` injection.
2. **SkillTree is piano-only** — 100 nodes as global constant, piano-specific generation hints. Fix: parameterized `SkillTreeOps` module.
3. **ContentLoader has no abstraction** — hardcoded `require()` calls, no factory. Fix: `getDisciplineContentLoader(discipline)`.
4. **Store restructuring would break everything** — Don't wrap `lessonProgress` in `disciplineProgress`. Fix: additive parallel keys (`productionLessonProgress`).
5. **ExercisePlayer IS extensible** — 6+ types via type-based branching, modular scoring. Can add production types.

### Phases (Post-v1)

| Phase | Name | Duration |
|-------|------|----------|
| 24.0 | Refactor for path-agnosticism (DisciplineConfig, SkillTreeOps, ContentLoader factory) | 1-2 weeks |
| 24.1 | Production content + types (120-150 skill nodes, 9 exercise types, 200 exercises) | 4-6 weeks |
| 24.2 | Interactive components (StepSequencer, synth UI, mixer, drag-and-drop) | 2-3 weeks |
| 24.3 | App integration (navigation, stores, Firestore collections) | 2-3 weeks |
| 24.4 | Export system (MIDI + WAV via midi-writer-js + OfflineAudioContext) | 1 week |
| 24.5 | Web version (Next.js + React Native Web, Stripe payments) | 8-12 weeks |

### Synth Teaching (Plugin/Serum-style)
Build our OWN simplified UIs (never screenshot actual plugins). Teaches concepts like "what Serum does" without trademark issues. All components play real audio via Web Audio API.

Components: OscillatorSelector, FilterKnob, EnvelopeEditor, WavetableDisplay, EffectsChainBuilder, FrequencyChart, WaveformVisualizer.

Exercise types: synth-build, filter-match, effects-chain-order, patch-from-scratch.

---

## Post-Phase Audit Template

After EVERY phase:

```bash
npm run typecheck        # Must be 0 errors
npm run test             # Must be 0 failures
npm run lint             # Must be 0 errors (warnings OK)
```

### CI/CD Health
- GitHub Actions green on master
- EAS `preview` build succeeds
- No new lint errors introduced

### System Design
- No hardcoded secrets in client code
- Firestore rules match all collections
- Offline-first: core loop works without network
- New features have test coverage

---

## Priority Order (The Path to Launch)

```
1. Piano app: stable, polished, industry game-changer
   ✅ Phase 13 (Content Explosion) — DONE
   └── Phases 14-18 (Progression, Social, Studio, Onboarding, Retention) — NEXT

   QA runs in parallel at ALL TIMES (CI gates + device verification)

2. Ship to limited users
   └── Phase 19 (Analytics) — visibility before launch
   └── Phase 20 (Hardening) — security + performance
   └── Phase 21 (App Store Launch) — TestFlight → App Store

3. Make money
   └── Phase 22 (Monetization) — RevenueCat + Gem IAP + Stripe

4. Close the feedback loop
   └── Phase 23 (Feedback Automation) — user bugs → GitHub issues

5. Expand the platform
   └── Phase 24+ (Production Path, Web, Multi-discipline)
```

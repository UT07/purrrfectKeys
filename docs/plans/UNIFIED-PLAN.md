# Purrrfect Keys — Unified Master Plan

**Last Updated:** March 16, 2026
**Vision:** The best piano learning app on the App Store. Industry game-changer.
**Codebase Health:** 0 TypeScript errors, 3,043 tests passing, 149 suites
**Current Phase:** Phase 14 — Social Revamp (Competitive League + Guilds)

> **This is the single source of truth.** Every feature, every phase, every audit.
> Historical plans are in `docs/plans/archive/`.
> System design analysis: `docs/system-design-analysis.md`
> Production path expansion: `docs/plans/production-path-and-web-expansion.md`

---

## Phase Numbering

Phases 1–10.5 were the original build-out. QA is a continuous parallel track, not a numbered phase. New work continues sequentially from **Phase 11**.

```
╔══════════════════════════════════════════════════════════════╗
║  COMPLETED (Legacy Phases 1–10.5)                            ║
║  Core Loop, Gamification, Auth, Adaptive Learning,           ║
║  Curriculum, Avatar Evolution, UI Revamp, Audio Input,       ║
║  Music Library, Arcade Concert Hall, Social v1               ║
╠══════════════════════════════════════════════════════════════╣
║  🔄 QA & DEVICE VERIFICATION — ONGOING PARALLEL TRACK       ║
║  Not a numbered phase. Always active.                        ║
╠══════════════════════════════════════════════════════════════╣
║  PHASE 11: Foundation Cleanup                    ✅ DONE     ║
║  PHASE 12: Exercise Types + UI                   ✅ DONE     ║
║  PHASE 13: Content Explosion                     ⚠️ PARTIAL  ║
║     (599 exercises generated but ALL same play-along type.    ║
║      Exercise type variety is a separate deep feature — F2)   ║
║  PHASE 14: Social Revamp — Competitive League    ✅ DONE     ║
║  PHASE 15: Cat Progression + Cat Studio                      ║
║  PHASE 16: "Play First" Onboarding                           ║
║  PHASE 17: System Design Hardening (was 20)      ← MOVED UP ║
║     (MMKV, TanStack Query, Cloud Function caching,           ║
║      Gemini via CF, sync compaction, offline indicator)       ║
║  PHASE 18: UI/UX Revamp (was 17)                             ║
║     (Unified cat avatar with 3 concentric rings:              ║
║      XP ring + cat evolution ring + MMR rank ring.            ║
║      Tap to see progress details. Merge profile/dashboard.)   ║
║  PHASE 19: Retention Engine (was 18)                         ║
║  PHASE 20: Analytics + Crash Reporting           ✅ DONE     ║
║  PHASE 21: Web Version                                       ║
║  PHASE 22: Monetization + Production Path (parallel)         ║
║  PHASE 23: App Store Launch (v1 live, production continues)  ║
╚══════════════════════════════════════════════════════════════╝
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
| Tests | `npm run test` | ✅ 149 suites, 3,043 tests, 0 failures |
| Performance | `npm run test:perf` | ✅ 17 benchmarks |
| Security | `npm run test:security` | ✅ 24 tests (sanitization, exposure, auth) |
| Regression | `npm run test:regression` | ✅ 29 critical path tests |
| Stress | `npm run test:stress` | ✅ 20 store concurrency tests |
| Coverage | `npm run test:coverage` | ✅ Thresholds: 40% branch, 45% func, 50% lines |
| Nightly Security Scan | `.github/workflows/security.yml` | ✅ Dependency audit + secret scan |
| Sentry Monitoring | `MonitoringService` | ✅ Crash reporting + performance traces |
| Lint | `npm run lint` | ✅ 0 errors (~531 warnings, non-blocking) |
| Build | EAS Build (preview channel) | ✅ iOS + Android configured |

**Infrastructure (Deploy Once, Verify Periodically):**

| Component | Status |
|-----------|--------|
| Firestore rules | ✅ Deployed (Mar 15) |
| Firestore indexes | ✅ Deployed |
| Cloud Functions | ✅ 11 functions deployed (nodejs22, us-central1) |
| CI/CD (GitHub Actions) | ✅ 5-stage pipeline (ci.yml) + EAS Build (build.yml) |
| Sentry DSN | ✅ Configured (local + EAS secrets) |
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

## Phase 13: Content Explosion ✅ DONE

**Goal:** 500+ exercises, 500+ songs, 5 learning paths. Content is king.
**Complete. All content generated, verified, and merged.**

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

## Phase 14: Social Revamp — Valorant-Style Competitive League ← NEXT

**Goal:** Social becomes the #1 retention driver. Ranked competitive play, gem-only cat economy, guilds.

### Ranked League System (Music-Themed Tiers)

9 ranks, each with 3 divisions (except Grandmaster). Inspired by Valorant's competitive model.

```
╔═══════════════════════════════════════════════════════════╗
║  GRANDMASTER  ♛  Top 1% — no divisions, exclusive aura   ║
╠═══════════════════════════════════════════════════════════╣
║  LEGEND        III → II → I                               ║
║  LUMINARY      III → II → I                               ║
║  PRODIGY       III → II → I                               ║
║  MAESTRO       III → II → I                               ║
║  VIRTUOSO      III → II → I                               ║
║  PERFORMER     III → II → I                               ║
║  APPRENTICE    III → II → I                               ║
║  NOVICE        III → II → I    ← Everyone starts here     ║
╚═══════════════════════════════════════════════════════════╝
```

**Ranking Points (RP):**
- Earned from exercise scores, challenge completions, song mastery
- Weekly RP contributes to rank progression
- Promotion series at division boundaries (win 2/3 to promote)
- Demotion protection: 3-exercise grace period at new division floor
- Soft reset between seasons (drop ~2 divisions)

**Seasonal System:**
- Seasons last 4 weeks
- 5 placement exercises at season start
- End-of-season rewards based on peak rank
- Season history + badges on profile

### Gem Economy (Gems-Only Cat Unlocks)

**Cats are purchased exclusively with gems. No real-money cat purchases.**

| Cat Tier | Count | Price | Casual (~700/mo) | Competitive (~4,000/mo) |
|----------|-------|-------|-------------------|-------------------------|
| Free | 1 | Onboarding pick | — | — |
| Common | 4 | 500 gems | ~3 weeks | ~4 days |
| Rare | 3 | 1,500 gems | ~2 months | ~2 weeks |
| Epic | 3 | 3,000 gems | ~4 months | ~3 weeks |
| Legendary | 1 | 5,000 gems | ~7 months | ~5 weeks |

**Weekly League Gem Payouts (most lucrative source):**

| Rank | Weekly Gems | Monthly |
|------|-------------|---------|
| Novice | 15 | 60 |
| Apprentice | 30 | 120 |
| Performer | 60 | 240 |
| Virtuoso | 100 | 400 |
| Maestro | 150 | 600 |
| Prodigy | 225 | 900 |
| Luminary | 325 | 1,300 |
| Legend | 450 | 1,800 |
| Grandmaster | 600 | 2,400 |

**Other Gem Sources:**

| Source | Gems |
|--------|------|
| Daily challenge | 10-25 |
| Weekly challenge | 50-100 |
| Monthly challenge | 150-300 |
| Friend challenge win | 15-30 |
| Exercise first completion | 5 |
| 3-star exercise | 10 |
| Song mastery tier up | 25-75 |
| Streak milestones (7/30/100 days) | 50/200/500 |

**Season-End Bonus (by peak rank):**

| Peak Rank | Bonus Gems |
|-----------|------------|
| Novice | 25 |
| Apprentice | 50 |
| Performer | 100 |
| Virtuoso | 200 |
| Maestro | 350 |
| Prodigy | 500 |
| Luminary | 750 |
| Legend | 1,000 |
| Grandmaster | 1,500 + exclusive accessory |

### The Arena (Social Tab Redesign)
- Arena entrance animation (rank-specific skins)
- Battle log (challenge cards with cat vs cat)
- Rank badge on profile + leaderboard
- Promotion/demotion cinematic animations
- Reaction system on activity feed
- Friend profile cards with rank display

### Music Guilds (Bands)
- Create/join band (150 gems, max 8-12 members)
- Band leaderboard (aggregate weekly XP)
- Band chat (emoji-only, kid-safe)
- Band vs band weekly challenges
- Band banner + roles (Leader, Co-leader, Member)
- Band-exclusive challenges with bonus gem multiplier

### Social Quick Actions
- Challenge from CompletionModal (with gem stake option)
- Share score card (with rank badge) to social media (Instagram, TikTok, Twitter/X)
- QR code friend discovery
- League promotion/demotion animations

### Contact Invites & Social Sharing
- Connect contacts (expo-contacts) to find friends already using the app
- Invite friends via SMS/WhatsApp/social media with deep link
- Share achievements, scores, and cat evolutions to Instagram Stories, TikTok, Twitter/X
- Referral rewards: both inviter and invitee earn gems on first exercise completion

### Tasks

| # | Task |
|---|------|
| 14.1 | Ranked league system (9 tiers, RP calculation, promotion/demotion) |
| 14.2 | Season system (4-week seasons, placement, soft reset, history) |
| 14.3 | Gem economy overhaul (cats = gems only, remove direct purchases) |
| 14.4 | Weekly league gem payouts (Cloud Function: `weeklyLeagueRewards`) |
| 14.5 | Season-end rewards (Cloud Function: `seasonEndRewards`) |
| 14.6 | Arena UI redesign (entrance, battle log, rank badges) |
| 14.7 | Promotion/demotion cinematic animations |
| 14.8 | Music Guilds (create/join, leaderboard, chat, challenges) |
| 14.9 | Friend challenge gem stakes |
| 14.10 | Rank badge integration (profile, leaderboard, activity feed) |
| 14.11 | QR code friend discovery |
| 14.12 | Contact-based friend discovery (expo-contacts) |
| 14.13 | Social media sharing (Instagram/TikTok/X share cards) |
| 14.14 | Invite system with deep links + referral gem rewards |
| 14.15 | Firestore: `leagues/`, `guilds/`, `seasons/`, `referrals/` collections + rules |

---

## Phase 15: Cat Progression + Cat Studio

**Goal:** Make cat evolution a meaningful journey AND give players full accessory customization.

### Cat Progression Rebalance

| Stage | New XP | Target Time |
|-------|--------|-------------|
| Baby → Teen | 2,000 | 2-3 weeks daily |
| Teen → Adult | 8,000 | 2-3 months daily |
| Adult → Master | 25,000 | 6+ months daily |

**Cat XP Sources:**
Exercise completion (10-85), song mastery tier up (50-200), daily challenge (25-75), weekly challenge (150), streak milestones (100-500), new skill mastered (100), lesson completed first time (200).

**Evolution Milestone Rewards:**
- Teen: 200 gems + Common accessories unlocked
- Adult: 500 gems + Rare/Epic accessories unlocked
- Master: 1,000 gems + Legendary accessories unlocked + exclusive effect

### Cat Studio (Accessory System)

**Goal:** Full Bitmoji-style accessory equip. 48 items, 6 categories.

Categories: Hats, Glasses, Outfits, Capes/Back, Collars/Neck, Effects.

**Accessory Prices:**

| Rarity | Price | Evolution Gate |
|--------|-------|----------------|
| Common | 50-100 gems | Teen+ |
| Rare | 200-400 gems | Adult+ |
| Epic | 600-1,000 gems | Adult+ |
| Legendary | 1,500-2,500 gems | Master only |

State: `settingsStore.equippedAccessories` + `ownedAccessories`. Data already in `src/data/accessories.ts`.

### Tasks

| # | Task |
|---|------|
| 15.1 | Update `EVOLUTION_XP_THRESHOLDS` in catEvolutionStore |
| 15.2 | New cat XP sources wired to exercise/challenge/streak flows |
| 15.3 | Evolution milestone gem rewards |
| 15.4 | Grandfather existing users (recalculate stages from current XP) |
| 15.5 | Cat Studio UI (equip screen, preview, purchase confirmation) |
| 15.6 | Accessory rendering on CatAvatar SVG |
| 15.7 | Evolution-gated accessory shop |
| 15.8 | Update progress displays (gallery, profile, social cards) |

---

## Phase 16: "Play First" Onboarding

**Goal:** User plays piano within 15 seconds.

```
STEP 1 (0-15s):  "Play your first note!"  → highlighted Middle C → confetti
STEP 2 (15-45s): "Now a melody!"          → guided C-D-E-F-G
STEP 3 (45-75s): "A real song!"           → 8-note Twinkle Twinkle with scoring
STEP 4 (75-90s): Choose cat + learning path
STEP 5 (90-110s): Quick setup (experience + input + goal)
```

### Tasks

| # | Task |
|---|------|
| 16.1 | Interactive piano intro (Middle C highlight + confetti) |
| 16.2 | Guided melody sequence (C-D-E-F-G with visual cues) |
| 16.3 | Mini-exercise (Twinkle Twinkle with simplified scoring) |
| 16.4 | Cat selection + learning path picker |
| 16.5 | Experience/input/goal quick setup |

---

## Phase 17: UI/UX Revamp

**Goal:** Full visual overhaul + sound design. Every screen polished to App Store flagship quality.

### Scope
- Audit all screens against design system tokens
- Accessibility pass (P0 labels, contrast, reduce-motion support)
- Animation polish (micro-interactions, transitions, loading states)
- Empty states and error states for all screens
- Responsive layout improvements
- Dark mode refinement
- Typography and spacing consistency

### Sound Pack
- Complete set of UI sound effects (button taps, navigation, rewards, errors, combo escalation)
- Exercise sounds (correct note, wrong note, perfect streak, combo break, star earned)
- Ambient/background mood audio (optional, per-screen)
- Victory/completion fanfares (exercise complete, lesson complete, evolution, chest open)
- **Mute toggle in Settings** (separate toggles: SFX, Music, Haptics)
- All sounds via `SoundManager` — preloaded pools, no latency on first play

### Key Screens
- HomeScreen: hero section, daily summary, quick actions
- ExercisePlayer: in-exercise UI, feedback overlays, completion flow
- LevelMap: node animations, path rendering, tier transitions
- SongLibrary: browse, search, mastery display
- Social/Arena: rank display, challenge cards, guild UI
- Profile: stats dashboard, settings, cat showcase
- Cat Studio: accessory preview, purchase flow

### Tasks

| # | Task |
|---|------|
| 17.1 | Full accessibility audit + fix P0/P1 issues from UX audit doc |
| 17.2 | Empty/loading/error states for all screens |
| 17.3 | Animation polish pass (micro-interactions, transitions) |
| 17.4 | Typography + spacing consistency audit |
| 17.5 | Dark mode refinement |
| 17.6 | Reduce-motion support (`AccessibilityInfo` + `prefers-reduced-motion`) |
| 17.7 | Screen-by-screen visual QA against design system |
| 17.8 | Sound pack: source/create all SFX + fanfares |
| 17.9 | Sound mute toggles in Settings (SFX, Music, Haptics as separate controls) |
| 17.10 | Wire sound pack into SoundManager with preloaded pools |

---

## Phase 18: Retention Engine

**Goal:** Users come back daily. Push notifications drive re-engagement.

### Core Retention Mechanics
- Cat mood ↔ streak (0 days=sad, 7+=excited, 30+=legendary rainbow aura)
- Streak freeze (30 gems, max 3 stockpiled)
- Re-engagement: push after 3+ days, sad cat return screen
- Weekly featured song (3x gem multiplier)

### Push Notifications (FCM)
- **Daily reminder**: configurable time, personalized message with cat name
- **Streak at risk**: "Your 14-day streak expires in 2 hours! [Cat name] is worried!"
- **Challenge received**: real-time push when friend sends a challenge
- **League results**: weekly summary of rank changes, gem earnings
- **New content**: weekly featured songs, new exercises
- **Re-engagement**: 3-day, 7-day, 14-day with escalating sadness from cat
- **Permission prompt**: defer push notification permission to after first 3 exercises (not on first launch)
- Settings: granular notification toggles (daily reminder, social, challenges, promotions)

### Tasks

| # | Task |
|---|------|
| 18.1 | Cat mood system (streak-based mood transitions) |
| 18.2 | Streak freeze purchase + stockpile (gemStore integration) |
| 18.3 | FCM setup (expo-notifications + Firebase Cloud Messaging) |
| 18.4 | Push notification categories (daily, social, streak, content, re-engagement) |
| 18.5 | Notification permission flow (deferred to after 3rd exercise) |
| 18.6 | Granular notification toggles in Settings |
| 18.7 | Re-engagement push sequence (3/7/14-day with cat mood) |
| 18.8 | Sad cat return screen (emotional re-onboarding) |
| 18.9 | Weekly featured song gem multiplier |

---

## Phase 19: Analytics + Crash Reporting

**Goal:** Full visibility before hardening.

- PostHog: 5 funnels (onboarding, session depth, retention, content quality, coaching)
- Crashlytics: `@react-native-firebase/crashlytics` + ErrorBoundary
- In-app feedback: ProfileScreen → Firestore `feedback` collection
- Feedback automation: Cloud Function → GitHub issue creation via Gemini classification

### Tasks

| # | Task |
|---|------|
| 19.1 | PostHog funnels (5 key funnels) |
| 19.2 | Crashlytics integration + ErrorBoundary |
| 19.3 | In-app feedback form + Firestore collection |
| 19.4 | Feedback → GitHub issue automation (Cloud Function) |
| 19.5 | Weekly digest (crash-free rate, retention, top feedback) |

---

## Phase 20: System Design Hardening

**Goal:** Production-grade security, performance, and multi-layer caching.

### Core Hardening

| # | Fix |
|---|-----|
| 20.1 | Move ALL Gemini calls through Cloud Functions |
| 20.2 | AsyncStorage → MMKV migration (10-100x faster hydration, sync reads) |
| 20.3 | Sync queue deduplication + compaction |
| 20.4 | Song search at scale (Algolia or Firestore text search) |
| 20.5 | Cloud Functions rate limiting |
| 20.6 | Offline indicator banner |
| 20.7 | Node.js 20 → 22 upgrade (before 2026-04-30 deprecation) |

### Caching & Performance Layer

| # | Layer | Current | Target |
|---|-------|---------|--------|
| 20.8 | Local storage | AsyncStorage (async JSON.parse, ~50-100ms/store) | MMKV (sync, ~1ms/store) — eliminates flash of stale data on startup |
| 20.9 | Network cache | Direct Firestore reads (no dedup) | TanStack Query / React Query — stale-while-revalidate, request dedup, background refresh |
| 20.10 | Server-side | Direct Firestore reads on every call | Cloud Function proxy + Firestore caching for hot paths (leaderboards, song library, weekly challenges) |
| 20.11 | Content cache | Lazy require() for 599 exercises | Pre-warm content index on startup, bundle split for lesson groups |

---

## Phase 21: Web Version

**Goal:** Full Purrrfect Keys experience on the web. Next.js + React Native Web.

**Full design:** `docs/plans/production-path-and-web-expansion.md`

### Scope
- Next.js app with React Native Web
- WebAudioEngine + Web MIDI API from day 1
- Stripe payments (no 30% App Store cut)
- Shared Firebase backend (auth, Firestore, Cloud Functions)
- Responsive layout (desktop + tablet + mobile web)
- Same subscription tiers, synced via Firebase

### Tasks

| # | Task |
|---|------|
| 21.1 | Next.js project setup with React Native Web |
| 21.2 | WebAudioEngine (Web Audio API piano synthesis) |
| 21.3 | Web MIDI API integration |
| 21.4 | Stripe subscription + gem IAP integration |
| 21.5 | Responsive layouts (desktop/tablet/mobile) |
| 21.6 | Auth flow (Firebase web SDK) |
| 21.7 | Cross-platform feature parity verification |

---

## Phase 22: Monetization + Production Path (Parallel Tracks)

**Goal:** Revenue + multi-discipline expansion, running in parallel.

### Track A: Monetization

**Subscription (RevenueCat — mobile / Stripe — web):**

| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | Lessons 1-6, 10 songs/week, 1 cat, touch input, local-only |
| Pro | $9.99/mo or $59.99/yr | Everything unlimited, all cats earnable, cloud sync, AI coaching, all paths |

**Gem IAP (Cosmetics Only):**

| Pack | Price |
|------|-------|
| 100 gems | $0.99 |
| 600 gems | $4.99 |
| 1,500 gems | $9.99 |

Gems buy: accessories, streak freezes, band creation. **Never gameplay advantage.** Cats are earned through gameplay gems, not purchased directly.

### Track B: Production Path

**Full design:** `docs/plans/production-path-and-web-expansion.md`

Expand from piano-only to multi-discipline music education (Duolingo multi-language model).

**Critical Prerequisites (must fix first):**

1. **CurriculumEngine is NOT path-agnostic** — 14+ direct `SKILL_TREE` references. Fix: `DisciplineConfig` injection.
2. **SkillTree is piano-only** — global constant with piano-specific hints. Fix: parameterized `SkillTreeOps` module.
3. **ContentLoader has no abstraction** — hardcoded `require()` calls. Fix: `getDisciplineContentLoader(discipline)`.
4. **Store restructuring would break everything** — Fix: additive parallel keys (`productionLessonProgress`).
5. **ExercisePlayer IS extensible** — 6+ types via type-based branching. Can add production types.

**Sub-phases:**

| # | Name | Duration |
|---|------|----------|
| 22.B.0 | Refactor for path-agnosticism | 1-2 weeks |
| 22.B.1 | Production content + types (120-150 skill nodes, 9 exercise types) | 4-6 weeks |
| 22.B.2 | Interactive components (StepSequencer, synth UI, mixer) | 2-3 weeks |
| 22.B.3 | App integration (navigation, stores, Firestore) | 2-3 weeks |
| 22.B.4 | Export system (MIDI + WAV) | 1 week |

**Synth Teaching (Plugin/Serum-style):**
Build our OWN simplified UIs (never screenshot actual plugins). All components play real audio via Web Audio API.

Components: OscillatorSelector, FilterKnob, EnvelopeEditor, WavetableDisplay, EffectsChainBuilder, FrequencyChart, WaveformVisualizer.

### Tasks

| # | Task |
|---|------|
| 22.1 | RevenueCat SDK integration (iOS + Android) |
| 22.2 | Stripe integration (web) |
| 22.3 | Paywall triggers + A/B testing |
| 22.4 | Server-side receipt validation (Cloud Function) |
| 22.5 | Gem IAP purchase + restore flow |
| 22.6 | Production Path: path-agnosticism refactor |
| 22.7 | Production Path: content + exercise types |
| 22.8 | Production Path: interactive components |
| 22.9 | Production Path: app integration |

---

## Phase 23: App Store Launch + Marketing

**Goal:** Ship to real users. v1 goes live. Build organic + paid growth. Don't break the bank.

### TestFlight Beta (2 weeks)
- 50-100 testers (piano teachers + students)
- Crash reporting + PostHog + feedback channel active
- Fix critical bugs from beta

### App Store + Play Store Submission
- App icon, screenshots (6.7", 6.5", 5.5")
- Privacy URL, support URL, privacy manifest
- Production Firebase + production API keys
- Play Store listing + review

### Marketing Strategy (Budget-Friendly)

**Organic Content (Free)**
- TikTok/Reels: 15-30s clips of cat evolution + piano gameplay (3-5x/week, automated via templates)
- "Before/After" format: beginner → 30 days later (user progress showcase)
- Cat personality content: daily cat quotes, cat mood reactions to music
- Piano tips content: "Can you play this?" challenges with app demo
- User-generated content: encourage sharing via in-app ShareCard (referral rewards)

**Automated Social Campaigns**
- Pre-schedule 30 days of content using Buffer/Later (free tier)
- Template library: 10 video templates with cat animations + piano audio
- Auto-post user milestones (with permission) — "Just hit 100-day streak!"
- Cross-post to Instagram, TikTok, Twitter/X, YouTube Shorts

**Paid Ads (Low Budget — $5-20/day)**
- Apple Search Ads: target "piano learning", "piano practice", "learn piano" ($5-10/day)
- TikTok Spark Ads: boost top-performing organic content ($5-10/day)
- Focus on: cat evolution clips (hook) + gameplay (demonstrate value) + social proof
- A/B test: cat-focused ads vs piano-focused ads vs social/competitive focused
- Kill underperformers after 3 days, scale winners

**Influencer Outreach (Free/Barter)**
- Piano teachers on YouTube/TikTok: free Pro account in exchange for review
- Music education bloggers: guest post or mention
- Cat-themed accounts: cross-promotion with cat content

**Launch Week Push**
- Product Hunt launch
- Reddit posts (r/piano, r/pianolearning, r/musictheory, r/learnmusic)
- Discord piano communities
- Press release to music education outlets

**Metrics to Track**
- Cost per install (CPI) — target: <$1.50
- Day 1/7/30 retention — target: 60%/30%/15%
- Organic vs paid install ratio — target: 3:1 organic
- Share/invite conversion rate
- App Store rating (target: 4.5+ stars)

### Post-Launch
- Production Path development continues alongside live app
- User feedback → iteration cycle
- Feature flags for gradual rollout of production path content
- Scale ad spend based on LTV:CPI ratio (only if >3:1)

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
1. Social-first competitive experience
   ✅ Phase 13 (Content Explosion) — DONE
   ✅ Phase 14 (Social Revamp — Competitive League + Guilds) — DONE
   └── Phase 15 (Cat Progression + Cat Studio)

   QA runs in parallel at ALL TIMES (CI gates + device verification)

2. Onboard then harden
   └── Phase 16 (Play First Onboarding) — hook users instantly
   └── Phase 17 (System Design Hardening) — MMKV, caching, sync, performance
       (Moved up: eliminates stale data flash, laggy hydration, loading screens)

3. Polish and retain
   └── Phase 18 (UI/UX Revamp) — flagship visual quality (benefits from MMKV speed)
   └── Phase 19 (Retention Engine) — daily engagement loops
   ✅ Phase 20 (Analytics + Crash Reporting) — DONE

4. Go web
   └── Phase 21 (Web Version) — Next.js + Stripe (no 30% cut)

5. Monetize + expand (parallel)
   └── Phase 22 (Monetization + Production Path) — revenue + multi-discipline
   └── Production path continues post-launch

6. Ship it
   └── Phase 23 (App Store Launch) — TestFlight → App Store → Play Store
```

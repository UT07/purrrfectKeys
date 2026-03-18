# Next Phases Design — Path to Soft Launch & Beyond

**Date:** 2026-03-18
**Status:** Approved
**Goal:** Sequence remaining phases efficiently, soft launch via TestFlight (50-100 testers), then parallel monetization + bug bash before App Store submission.

---

## Current State

**Completed:** Phases 1-14, old Phase 19 (Analytics — done early, using Sentry + PostHog, NOT Crashlytics)
**Codebase:** 160 test suites, 3,253 tests, 0 TS errors, 0 lint errors
**Content:** 599 exercises, 582 songs, 120 skill nodes, 5 learning paths
**Infrastructure:** 11 Cloud Functions deployed (nodejs22), Firestore rules deployed, CI/CD pipeline active, Sentry + PostHog integrated
**Cloud Functions already on Node.js 22** — no upgrade needed.

**Key gaps before soft launch:**
- Cat evolution XP thresholds too easy (Master at 5,000 — should be 25,000)
- Cat Studio exists but needs evolution-gating and polish
- Onboarding is functional but not "play first" (current: 7-step form wizard)
- 8 P0 + 12 P1 accessibility issues from UX audit
- No push notifications (FCM/Expo Push not integrated)
- No streak freeze mechanic
- No energy system (free tier limiter)
- AsyncStorage (not MMKV) — slow startup, async hydration
- Some Gemini calls still client-side (API key exposure risk)
- ~12 device verification items unchecked
- No infra stress testing (Cloud Functions, Firestore under load)
- Account deletion (`deleteUserData`) not verified with Phase 14 data (guilds, ranks, seasons)
- Song search won't scale past ~1,000 songs (no Algolia/full-text search yet — deferred, not blocking for 582 songs)

---

## Phase Numbering

Old Phases 1-14 and old Phase 19 (Analytics) are complete. The new sequence starts fresh from **Phase 15**. Old phase numbers 15-23 in UNIFIED-PLAN.md are superseded by this document.

| New # | Corresponds to Old # | Name |
|-------|---------------------|------|
| 15 | Old 15 | Cat Progression + Cat Studio |
| 16 | Old 16 | "Play First" Onboarding |
| 17 | Old 17 + Old 18 | UI/UX Revamp + Retention Engine (parallel) |
| 18 | Old 20 | System Hardening + QA Gate |
| — | — | SOFT LAUNCH (TestFlight) |
| 19 | New (no old equivalent) | Bug Bash + Monetization (parallel) |
| 20 | Old 23 | App Store Launch |
| 21+ | Old 21, 22 | Web Version, Production Path (post-launch) |

Old Phase 19 (Analytics) = **DONE** (Sentry + PostHog, not Crashlytics — UNIFIED-PLAN.md reference to Crashlytics is outdated).

---

## QA — Continuous Parallel Track

**QA is not a phase. It runs alongside every phase, with escalating rigor as we approach soft launch.**

### Existing QA Infrastructure (Active)

| Component | Status | Details |
|-----------|--------|---------|
| CI pipeline | Active | 5-stage: typecheck → lint → tests → security audit → bundle size |
| `test:perf` | Active | 17 performance benchmarks |
| `test:security` | Active | 24 security tests (sanitization, exposure, auth) |
| `test:regression` | Active | 29 critical path tests |
| `test:stress` | Active | 20 store concurrency tests |
| Coverage gates | Active | 40% branch, 45% func, 50% lines |
| Nightly security scan | Active | Dependency audit + secret scan (security.yml) |
| Sentry | Active | Crash reporting + performance traces + JS error boundaries |
| PostHog | Active | Analytics + feature flags + funnels |

### QA Additions (Build During Phases, Gate at Phase 18)

| Component | Build When | Gate When | Details |
|-----------|-----------|-----------|---------|
| `test:infra` | Phase 15 (first new feature) | Phase 18 | Cloud Functions load test (Artillery/k6 → Firestore + Functions) |
| `test:e2e` | Phase 16 (onboarding rewrite) | Phase 18 | Detox/Maestro E2E on CI (critical path flows) |
| Device verification | Every phase (manual) | Phase 18 (all items) | Manual checklist — see Phase 18 for full list |
| Load simulation | Phase 17 (retention has scheduled jobs) | Phase 18 | 100 concurrent users, Firestore contention, push throughput |

### Per-Phase QA Requirements

Every phase merge must:
1. Pass CI gates (typecheck + lint + test, 0 errors)
2. Add tests for new features (maintain coverage thresholds)
3. Run on device (at least one manual verification pass)
4. No new Sentry errors introduced

### Infra Stress Test Tooling (`test:infra`)

**Build as a reusable script, not a one-off.** Lives in `scripts/infra-stress-test.ts`.

**What it tests:**
- Cloud Functions: concurrent callable invocations (generateExercise, syncProgress, completeExercise)
- Firestore: concurrent reads/writes to hot paths (leagueStandings, exerciseScores, activityFeed, guildMembers)
- Auth: concurrent anonymous + email sign-in
- Rate limiting: verify functions reject above threshold
- Sync: concurrent push/pull from multiple "devices"
- Account deletion: verify `deleteUserData` cleans up Phase 14 data (guilds, ranks, seasons, battlePass)

**Targets:**
- Cloud Functions: <2s p95 latency at 50 concurrent calls
- Firestore writes: <500ms p95 at 100 concurrent writes
- No data corruption under contention (verify with read-after-write checks)
- Graceful degradation (error responses, not crashes) above limits

**Tooling:** Artillery or k6 for HTTP load generation, custom Jest suite for Firestore contention patterns. Runs against a dedicated Firebase test project (not production).

---

## Phase Sequence

```
Phase 15: Cat Progression + Cat Studio
Phase 16: "Play First" Onboarding
Phase 17: UI/UX Revamp + Retention Engine (parallel tracks)
Phase 18: System Hardening + QA Gate
═══════ SOFT LAUNCH (TestFlight — 50-100 testers) ═══════
Phase 19: Bug Bash + Monetization (parallel streams)
Phase 20: App Store Launch
Phase 21+: Web Version, Production Path (post-launch)
```

---

## Phase 15: Cat Progression + Cat Studio

**Goal:** Make cat evolution a meaningful journey with full accessory customization.

**Rationale for grouping:** All cat work together — evolution mechanics, studio UI, and accessory rendering are tightly coupled. Evolution gates determine which accessories are available.

**QA for this phase:** Build `test:infra` tooling skeleton. Add unit tests for XP calculations, evolution stage transitions, accessory purchase logic. Device-test Cat Studio UI on iPhone.

### Cat Progression Rebalance

| Stage | New XP Threshold | Old Threshold | Target Time |
|-------|-----------------|---------------|-------------|
| Baby → Teen | 2,000 | 500 | 2-3 weeks daily |
| Teen → Adult | 8,000 | 2,000 | 2-3 months daily |
| Adult → Master | 25,000 | 5,000 | 6+ months daily |

**New XP sources:** Exercise completion (10-85), song mastery tier up (50-200), daily challenge (25-75), weekly challenge (150), streak milestones (100-500), new skill mastered (100), lesson first-time completion (200).

**Evolution milestone rewards:** Teen (200 gems), Adult (500 gems), Master (1,000 gems + exclusive effect).

**No grandfathering needed:** App is in pre-launch development with no active users. Update thresholds directly in `EVOLUTION_XP_THRESHOLDS` — no migration logic required.

### Cat Studio (Polish + Evolution-Gating)

`CatStudioScreen.tsx` already exists with basic equip/preview UI. `settingsStore.ts` already has `equippedAccessories` and `ownedAccessories` fields.

**Work needed:** Evolution-gated shop (lock items by stage), purchase confirmation with gem deduction, category filtering, visual polish to match design system.

**48 accessories** across 6 categories (Hats, Glasses, Outfits, Capes/Back, Collars/Neck, Effects). Data already exists in `src/data/accessories.ts`.

**Accessory prices by rarity:**

| Rarity | Price | Evolution Gate |
|--------|-------|----------------|
| Common | 50-100 gems | Teen+ |
| Rare | 200-400 gems | Adult+ |
| Epic | 600-1,000 gems | Adult+ |
| Legendary | 1,500-2,500 gems | Master only |

**Key files to modify:**
- `src/stores/catEvolutionStore.ts` — update `EVOLUTION_XP_THRESHOLDS`, new XP source wiring
- `src/screens/CatStudioScreen.tsx` — evolution-gating, purchase flow polish, category tabs
- `src/components/Mascot/CatAvatar.tsx` — ensure accessory rendering works at all sizes (profile, social cards, exercise buddy)

### Tasks

| # | Task |
|---|------|
| 15.1 | Update `EVOLUTION_XP_THRESHOLDS` in catEvolutionStore (direct update, no migration needed) |
| 15.2 | Wire new cat XP sources (exercise, challenge, streak, skill, lesson flows) |
| 15.3 | Evolution milestone gem rewards (Teen=200, Adult=500, Master=1,000) |
| 15.4 | Cat Studio: evolution-gated accessory shop (lock by stage, show lock badge + requirement) |
| 15.5 | Cat Studio: purchase confirmation modal with gem balance check |
| 15.6 | Cat Studio: category tabs + filtering polish |
| 15.7 | Verify accessory rendering on CatAvatar at all sizes (gallery, profile, social cards, exercise buddy) |
| 15.8 | Build `test:infra` tooling skeleton (Artillery/k6 config, Firebase test project setup) |

---

## Phase 16: "Play First" Onboarding

**Goal:** User plays piano within 15 seconds of first launch.

**Current onboarding:** 7-step form wizard (experience level, input method, goal, cat selection, learning path). Functional but not engaging — user doesn't touch the piano until after completing the wizard.

**QA for this phase:** Wire Detox/Maestro E2E for onboarding flow on CI. This is the most critical user path — must be regression-tested automatically.

### Flow

```
STEP 1 (0-15s):  "Play your first note!"  → highlighted Middle C → confetti
STEP 2 (15-45s): "Now a melody!"          → guided C-D-E-F-G with visual cues
STEP 3 (45-75s): "A real song!"           → 8-note Twinkle Twinkle with simplified scoring
STEP 4 (75-90s): Choose your cat companion (1 of 3 starters)
STEP 5 (90-110s): Quick setup (experience level + input method + daily goal + learning path)
```

Steps 1-3 use the existing Keyboard component with simplified interaction (no full ExercisePlayer). Step 4 reuses existing cat selection. Step 5 consolidates the current multi-step wizard into a single compact screen.

**Migration:** Users who already completed the old onboarding flow skip the new one (check `hasCompletedOnboarding` flag in settingsStore).

### Tasks

| # | Task |
|---|------|
| 16.1 | Interactive piano intro (Middle C highlight + confetti on press) |
| 16.2 | Guided melody sequence (C-D-E-F-G with visual cues, no scoring) |
| 16.3 | Mini-exercise (Twinkle Twinkle with simplified pass/fail scoring) |
| 16.4 | Cat selection screen (pick 1 of 3 starters — reuse existing) |
| 16.5 | Consolidated quick setup screen (experience + input + goal + path) |
| 16.6 | Old onboarding skip logic (existing users bypass new flow) |
| 16.7 | E2E test: onboarding critical path (Detox/Maestro, wired to CI) |

---

## Phase 17: UI/UX Revamp + Retention Engine (Parallel Tracks)

**Goal:** App Store-quality visuals AND daily engagement loops, built in parallel.

**Rationale for parallelism:** These are independent workstreams — visual polish doesn't depend on push notifications, and retention mechanics don't depend on accessibility fixes. They can be developed and tested independently.

**Potential merge conflict zones:** `ProfileScreen` (Track A adds accessibility; Track B adds notification toggles) and `HomeScreen` (Track A adds empty states; Track B adds re-engagement UI). Manageable with coordination — merge Track A first for each shared file.

**QA for this phase:** Expand `test:infra` with push notification throughput testing. Accessibility tests (contrast ratio checks, label coverage). Device verification for push notifications on physical device.

### Track A — Visual Polish

**Inputs:** UX audit doc (`docs/superpowers/specs/2026-03-13-ux-accessibility-audit.md`), design system (`docs/design-system.md`).

| # | Task |
|---|------|
| 17.A1 | Fix all P0 accessibility issues (8 items — missing labels on interactive elements) |
| 17.A2 | Fix all P1 accessibility issues (12 items — empty/loading states, contrast, reduce-motion) |
| 17.A3 | Reduce-motion support (`AccessibilityInfo` + `prefers-reduced-motion` checks) |
| 17.A4 | Empty/loading/error states for ALL screens (standardized pattern) |
| 17.A5 | Screen-by-screen visual QA against design tokens |
| 17.A6 | Animation polish pass (micro-interactions, transitions, timing) |
| 17.A7 | Typography + spacing consistency audit |
| 17.A8 | Sound pack: source/create all remaining SFX + fanfares |
| 17.A9 | Sound mute toggles in Settings (SFX, Music, Haptics as separate controls) |
| 17.A10 | Wire sound pack into SoundManager with preloaded pools |

### Track B — Retention Engine

| # | Task |
|---|------|
| 17.B1 | Cat mood ↔ streak system (0 days=sad, 7+=excited, 30+=legendary aura) |
| 17.B2 | Streak freeze purchase (30 gems, max 3 stockpiled, gemStore integration) |
| 17.B3 | Expo Push Notifications setup (expo-notifications + Expo push tokens, NOT raw FCM — integrates with existing local notification service) |
| 17.B4 | Push notification categories (daily reminder, social, streak at risk, content, re-engagement) |
| 17.B5 | Android notification channels (required for Android 8+) |
| 17.B6 | Notification permission flow (deferred to after 3rd exercise, not first launch) |
| 17.B7 | Granular notification toggles in Settings |
| 17.B8 | Re-engagement push sequence (3/7/14-day escalating sadness from cat) |
| 17.B9 | Sad cat return screen (emotional re-onboarding after absence) |
| 17.B10 | Weekly featured song gem multiplier (3x gems for featured song mastery) |

---

## Phase 18: System Hardening + QA Gate

**Goal:** Production-grade security, performance, and verified quality. Everything must pass before soft launch.

**This is the hard gate.** No TestFlight build until all items here are green.

### Hardening Tasks

| # | Task |
|---|------|
| 18.1 | Move ALL remaining Gemini calls through Cloud Functions (no client-side API keys) |
| 18.2 | AsyncStorage → MMKV migration (see migration plan below) |
| 18.3 | Sync queue deduplication + compaction |
| 18.4 | Cloud Functions rate limiting |
| 18.5 | Offline indicator banner (verify `OfflineBanner` wiring on all screens) |
| 18.6 | Security audit pass (API key exposure, Firestore rules edge cases, input sanitization) |
| 18.7 | Verify `deleteUserData` cleans up Phase 14 data (guilds, ranks, seasons, battlePass) |
| 18.8 | Privacy policy URL + support URL (required for TestFlight external beta) |
| 18.9 | Terms of Service / EULA |
| 18.10 | `PrivacyInfo.xcprivacy` manifest (Apple requirement — declare AsyncStorage/MMKV, analytics SDKs, device identifiers) |

### MMKV Migration Plan

**Why:** AsyncStorage is async and slow (~200-400ms to hydrate 14 stores on launch). MMKV is synchronous and ~30x faster (~10-20ms).

**How:**
1. Install `react-native-mmkv`
2. Update `src/stores/persistence.ts` — swap `storage` wrapper from AsyncStorage to MMKV (same `getString/setString` interface)
3. Add one-time migration in `PersistenceManager.hydrateAndMigrate()`: on first launch after update, read all keys from AsyncStorage, write to MMKV, then delete from AsyncStorage
4. `createDebouncedSave` and `createImmediateSave` patterns stay the same — MMKV's sync API just means the `setItem` call returns instantly instead of awaiting
5. Test: verify hydration on cold start, verify data survives app kill, verify migration from AsyncStorage

### QA Gate (Must Pass Before Soft Launch)

| # | Check | Target |
|---|-------|--------|
| 18.Q1 | Device verification — complete checklist (see below) | All items verified |
| 18.Q2 | `test:infra` — Cloud Functions load test | <2s p95 at 50 concurrent |
| 18.Q3 | `test:infra` — Firestore contention test | <500ms p95 at 100 concurrent |
| 18.Q4 | `test:e2e` — critical path E2E on CI | Onboarding + exercise + scoring |
| 18.Q5 | Full QA suite green (`npm run test:qa`) | 0 failures |
| 18.Q6 | Sentry: 0 unresolved P0 errors | Clean dashboard |
| 18.Q7 | PostHog funnels collecting data | 5 key funnels active |
| 18.Q8 | 10-minute stability test on device (no crashes, no memory leaks) | Pass |
| 18.Q9 | 50 lessons navigable end-to-end on device | Verified |
| 18.Q10 | EAS `preview` build succeeds (iOS + Android) | Build green |
| 18.Q11 | Account deletion verified with Phase 14 data | All collections cleaned |
| 18.Q12 | Privacy manifest reviewed | No App Store rejection risks |

### Device Verification Checklist (18.Q1)

| # | Item | Status |
|---|------|--------|
| D1 | Core loop: onboarding → exercise → scoring → XP award | |
| D2 | Piano sound: FluidR3 GM samples play correctly on device | |
| D3 | PianoRoll: cascade animation + hit line alignment | |
| D4 | SplitKeyboard: two-handed exercises render correctly | |
| D5 | Pause/resume: exercise state preserved | |
| D6 | AI coaching: Gemini feedback in CompletionModal | |
| D7 | Songs tab: browse, play, mastery tracking | |
| D8 | Social features: friends, challenges, leagues, guilds | |
| D9 | Auth persistence: sign out → sign in → data intact | |
| D10 | 10-minute stability: no crashes, no memory leaks | |
| D11 | 50 lessons navigable end-to-end | |
| D12 | Learning path switching | |
| D13 | "Review with Salsa" replay coaching | |
| D14 | Cat Studio: equip, preview, purchase | |
| D15 | Push notifications: receive on device | |
| D16 | Streak freeze: purchase and use | |
| D17 | Energy system: exercise limit enforced | |
| D18 | Mic polyphonic chord detection | Verified (Mar 8) |

---

## Soft Launch — TestFlight Beta

**Target:** 50-100 testers
**Sources:** Piano teachers, students, Reddit (r/piano, r/pianolearning), Discord piano communities, friends/family
**Duration:** 2 weeks minimum

**Prerequisites (before external TestFlight beta with 50+ testers):**
- Privacy policy URL hosted
- Support URL hosted
- All Phase 18 QA gate items green

**Beta infrastructure:**
- Crash reporting active (Sentry)
- Analytics active (PostHog — funnels already configured)
- In-app feedback form (ProfileScreen → Firestore `feedback` collection — build if not exists)
- TestFlight build via EAS (`preview` channel)

**Success criteria before proceeding to App Store:**
- Crash-free rate > 99%
- Day-1 retention > 50%
- Day-7 retention > 25%
- No P0 bugs from beta feedback
- Average session length > 5 minutes

---

## Phase 19: Bug Bash + Monetization (Parallel Streams)

**Runs during and after TestFlight beta.**

### Stream A — Beta Feedback Fixes

- Triage and fix bugs reported by beta testers
- Performance issues surfaced by real-world usage
- UX friction points identified through PostHog funnels
- Prioritize by user impact (P0 → P1 → P2)
- Re-run `test:infra` after significant fixes to verify no regressions

### Stream B — Monetization

| # | Task |
|---|------|
| 19.B1 | RevenueCat SDK integration (iOS + Android) |
| 19.B2 | Subscription tiers (Free vs Pro — $9.99/mo or $59.99/yr) |
| 19.B3 | Energy system (5 exercises/day free, mistakes drain faster, gem refill option) |
| 19.B4 | Paywall triggers + UI (after lesson 6, on premium features, energy depleted) |
| 19.B5 | Server-side receipt validation (Cloud Function) |
| 19.B6 | Gem IAP purchase flow (100/$0.99, 600/$4.99, 1500/$9.99) |
| 19.B7 | Restore purchases flow |
| 19.B8 | A/B test paywall variants (PostHog feature flags) |

**Energy System:**
- Free users get 5 exercise attempts per day
- Each mistake-heavy attempt (score < 50%) costs 2 energy instead of 1
- Energy refills daily at midnight (local time)
- Gem refill: 50 gems = 5 energy (emergency refill)
- Pro users: unlimited energy
- Visual: energy bar on HomeScreen + "out of energy" modal with upgrade CTA

**Free tier limits:**
- Lessons 1-6 (of 50)
- 10 songs/week
- 5 exercises/day (energy system)
- 1 cat (starter)
- Touch input only
- Local-only (no cloud sync)

**Pro unlocks:**
- All 50 lessons, unlimited songs
- Unlimited energy
- All cats earnable via gems
- MIDI + mic input
- Cloud sync
- AI coaching
- All learning paths

---

## Phase 20: App Store Launch

| # | Task |
|---|------|
| 20.1 | App icon (1024x1024) |
| 20.2 | Screenshots (6.7", 6.5", 5.5" — iPhone 15 Pro Max, iPhone 14, iPhone SE) |
| 20.3 | App preview video (30s gameplay + cat evolution + social features) |
| 20.4 | App Store description + keywords |
| 20.5 | Production Firebase project + production API keys |
| 20.6 | App Store submission (Apple review) |
| 20.7 | Play Store listing + submission |
| 20.8 | Marketing push (see marketing strategy section below) |

### Marketing Strategy (Budget-Friendly)

**Organic Content (Free):**
- TikTok/Reels: 15-30s clips of cat evolution + piano gameplay (3-5x/week)
- "Before/After" format: beginner → 30 days later
- Cat personality content: daily cat quotes, cat mood reactions
- User-generated content via in-app ShareCard (referral rewards)

**Paid Ads (Low Budget — $5-20/day):**
- Apple Search Ads: target "piano learning", "learn piano" ($5-10/day)
- TikTok Spark Ads: boost top-performing organic content ($5-10/day)
- A/B test: cat-focused ads vs piano-focused vs social/competitive

**Launch Week Push:**
- Product Hunt launch
- Reddit posts (r/piano, r/pianolearning, r/musictheory)
- Discord piano communities
- Piano teacher outreach (free Pro accounts for reviews)

**Metrics to Track:**
- Cost per install (CPI) — target: <$1.50
- Day 1/7/30 retention — target: 60%/30%/15%
- Organic vs paid install ratio — target: 3:1 organic

---

## Phase 21+: Post-Launch

- **Phase 21: Web Version** — Next.js + React Native Web, Stripe payments (no 30% App Store cut)
- **Phase 22: Production Path** — Multi-discipline expansion (music production theory, FL Studio literacy)
- Continued iteration based on user feedback and analytics
- Feature flags for gradual rollout of new content

---

## Key Decisions

1. **Cat work grouped together** (Phase 15) — evolution + studio are tightly coupled
2. **Onboarding is its own phase** (Phase 16) — small but critical, first impression
3. **UI/UX + Retention run parallel** (Phase 17) — independent workstreams, no dependencies
4. **Hardening + QA gate combined** (Phase 18) — last gate before soft launch, must-pass checklist
5. **QA is continuous, not a phase** — tooling built incrementally (15→16→17), hard gate at 18
6. **Infra stress testing is reusable** — `test:infra` script + dedicated Firebase test project, not one-off
7. **Analytics already done** — Sentry + PostHog integrated (NOT Crashlytics — UNIFIED-PLAN reference outdated)
8. **Monetization deferred to post-soft-launch** — validate product-market fit before adding paywalls
9. **Energy system included** — 5/day free, mistake-based drain, gem refill, Pro unlimited
10. **Soft launch target: 50-100 testers** — piano community recruits, 2-week minimum beta
11. **No grandfathering needed** — no active users, update XP thresholds directly
12. **MMKV migration with data migration** — one-time AsyncStorage → MMKV copy on first launch after update
13. **Expo Push Notifications** (not raw FCM) — integrates with existing expo-notifications local setup
14. **Privacy manifest required** — `PrivacyInfo.xcprivacy` for App Store compliance

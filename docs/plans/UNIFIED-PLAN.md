# Purrrfect Keys — Unified Master Plan (Final Version)

**Last Updated:** March 10, 2026
**Vision:** The best piano learning app on the App Store. Not a beta, not an MVP — the real thing.
**Codebase Health:** 0 TypeScript errors, 2,880 tests passing, 141 suites
**Current Phase:** Phase 2 — Exercise Types + UI (nearing completion)

> **This is the single source of truth.** Every feature, every phase, every audit.
> Historical plans are in `docs/plans/archive/`.
> System design analysis: `docs/system-design-analysis.md`

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

## The Full Roadmap

```
╔══════════════════════════════════════════════════════════════════════╗
║  PHASE 1: FOUNDATION CLEANUP                          ← NOW        ║
║  Fix pre-existing TS errors, username sync, device verification     ║
║  ➜ AUDIT                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  PHASE 2: EXERCISE TYPES + UI                                       ║
║  Complete 6 exercise types (UI branching + AI generation)           ║
║  ➜ AUDIT                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  PHASE 3: CONTENT EXPLOSION                                         ║
║  500+ exercises, 500+ songs, 5 learning paths, daily challenges     ║
║  ➜ AUDIT                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  PHASE 4: CAT PROGRESSION REBALANCE                                 ║
║  3-5x higher thresholds, milestone rewards, XP sources expansion    ║
║  ➜ AUDIT                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  PHASE 5: THE ARENA + MUSIC GUILDS                                  ║
║  Social tab → Arena entrance, battle log, bands, reactions          ║
║  ➜ AUDIT                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  PHASE 6: CAT STUDIO                                                ║
║  Full Bitmoji-style accessory equip (48 items, 6 categories)       ║
║  ➜ AUDIT                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  PHASE 7: "PLAY FIRST" ONBOARDING                                   ║
║  Hands-on piano in first 30s, cat + path selection, 2-min total    ║
║  ➜ AUDIT                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  PHASE 8: RETENTION ENGINE                                           ║
║  Cat mood ↔ streak, streak freeze, re-engagement, weekly featured  ║
║  ➜ AUDIT                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  PHASE 9: ANALYTICS + CRASH REPORTING                                ║
║  PostHog 5 funnels, Crashlytics, in-app feedback, error tracking   ║
║  ➜ AUDIT                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  PHASE 10: SYSTEM DESIGN HARDENING                                   ║
║  API key → Cloud Functions, MMKV migration, sync dedup, Firestore  ║
║  ➜ AUDIT                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  PHASE 11: APP STORE LAUNCH                                          ║
║  TestFlight → App Store review → Go live (iOS first, then Android) ║
║  ➜ AUDIT                                                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  PHASE 12: MONETIZATION                                              ║
║  RevenueCat subscription, gem IAP, paywall, A/B testing            ║
║  ➜ AUDIT                                                            ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## What's Done (Phases 1-11 Legacy + Premium SVG Cats + Salsa Coaching)

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|------------------|
| 1 | Core Loop | ✅ Done | ExercisePlayer, 5D scoring, XP/levels/streaks |
| 2 | Gamification | ✅ Done | LevelMap, theme, transitions |
| 3 | Firebase Auth | ✅ Deployed | Email/Google/Apple/Anonymous, cross-device sync |
| 4 | Adaptive Learning | ✅ Done | Design tokens, learner profile |
| 5 | Curriculum | ✅ Done | SkillTree DAG (100 nodes), CurriculumEngine (4 session types) |
| 6 | Avatar Evolution | ✅ Done | 4-stage evolution, gems, 12 abilities, 12 cat profiles |
| 7 | UI Revamp | ✅ Done | Composable SVG cats, SalsaCoach NPC, design tokens |
| 8 | Audio Input | ✅ Verified | YIN + ONNX polyphonic, InputManager, measurement mode |
| 9 | Music Library | ✅ Deployed | 124 songs, ABC parser, mastery tiers |
| 10 | Arcade Concert Hall | ✅ Done | SoundManager, combo escalation, loot reveal, FluidR3 GM samples |
| 10.5 | Social v1 | ✅ Deployed | Friends, leagues, challenges, activity feed |
| 11 | QA + Launch Prep | ✅ Code Complete | 9 Cloud Functions, CI/CD, account deletion |
| — | Premium SVG Cats | ✅ Done | 13 cat profiles, 18-layer rendering, 9 gradients |
| — | Salsa Coaching | ✅ Done | Pre/post coaching, replay, metronome, bonus drills, Gemini AI |
| — | Exercise Types | ✅ Done | 6 types (play/rhythm/earTraining/chordId/sightReading/callResponse), scoring strategies, UI branching, AI generation |
| — | Social Overhaul | ✅ In Progress | Challenge from score, friend activity strip, share card, league transitions, QR friend discovery |

### Infrastructure Status

| Component | Status | Notes |
|-----------|--------|-------|
| Firestore rules | ✅ Deployed | All collections covered |
| Firestore indexes | ✅ Deployed | Composite indexes for song queries |
| Cloud Functions | ⚠️ Written | 9 functions, deployment needs verification |
| CI/CD (GitHub Actions) | ✅ Active | `ci.yml` (typecheck+lint+test), `build.yml` (EAS) |
| Piano samples | ✅ Bundled | FluidR3 GM (C2-C6, 132KB) |
| ElevenLabs TTS | ✅ Configured | 13 per-cat neural voices, API key in EAS secrets |
| DeviceLog | ✅ Active | On-device debugging, 6/11 subsystems |
| GitHub issues | ✅ Clear | 0 open |

### Device Verification

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

---

## Phase 1: Foundation Cleanup

**Goal:** Fix all pre-existing issues before building new features. Clean house.

### Tasks

| # | Task | Priority |
|---|------|----------|
| 1.1 | Fix ProfileScreen TypeScript errors (`journeyGrid`, `JourneyStat` missing) | P0 |
| 1.2 | Fix 20 failing ProfileScreen tests | P0 |
| 1.3 | Username sync to Firebase: `setDisplayName()` → `updateProfile()` + Firestore `users/{uid}` | P0 |
| 1.4 | Complete device verification checklist (9 remaining items) | P0 |
| 1.5 | Verify Cloud Functions deployment (`firebase functions:list`) | P1 |
| 1.6 | Fix DeviceLog tag mismatches (`MidiInput` → `MIDI`, `SyncService` → `SyncManager`) | P2 |
| 1.7 | UI Production Revamp: Sound assets (CC0 files replacing procedural synth) | P1 |
| 1.8 | UI Production Revamp: PressableScale migration (~120 instances) | P1 |
| 1.9 | UI Production Revamp: Token cleanup (inline rgba → glowColor, raw sizes → TYPOGRAPHY/SPACING) | P2 |

### Phase 1 Audit Checklist

**App:**
- [ ] 0 TypeScript errors
- [ ] 0 test failures
- [ ] All device verification items pass on physical device
- [ ] Username displays and edits correctly, syncs to Firebase
- [ ] All screens use design tokens (no inline colors/fonts)
- [ ] All buttons use PressableScale with haptic + sound

**CI/CD:**
- [ ] `npm run typecheck` passes in GitHub Actions
- [ ] `npm run test` passes in GitHub Actions
- [ ] `npm run lint` passes with 0 errors (warnings OK)
- [ ] EAS `preview` build succeeds
- [ ] Feature branch → auto-build dev client on push

**System Design:**
- [ ] Cloud Functions confirmed deployed and callable
- [ ] Firestore rules match all collections used by app
- [ ] No hardcoded secrets in client code (audit grep for API keys)

---

## Phase 2: Exercise Types + UI

**Goal:** Complete all 6 exercise types with type-specific UI and AI generation.

### Completed Tasks

- ✅ `ExerciseType` union on `Exercise` interface (`'play' | 'rhythm' | 'earTraining' | 'chordId' | 'sightReading' | 'callResponse'`)
- ✅ `scoringStrategies.ts` with type-specific scoring (rhythm ignores pitch, chord ID has wider timing)
- ✅ `scoreExerciseByType()` wired into `useExercisePlayback`
- ✅ ExercisePlayer UI branching per type (`RhythmTapZone`, `ListenPhaseOverlay`, `ChordPrompt`, `SightReadingOverlay`, `CallResponseOverlay`)
- ✅ AI exercise generation prompts for all 6 types (`interactionType` in `GenerationParams`)
- ✅ Social overhaul: Challenge from score screen, friend activity strip, share score card, league transitions, QR code friend discovery

### Type-Specific UI Summary

| Type | What Changes in ExercisePlayer |
|------|-------------------------------|
| **Play** | No change (existing) |
| **Rhythm** | PianoRoll shows timing bars only (no pitch). Large RhythmTapZone replaces keyboard. |
| **Ear Training** | ListenPhaseOverlay: plays audio → "Now play it back!" → standard keyboard |
| **Chord ID** | ChordPrompt: large chord name display → user plays correct notes → validate |
| **Sight Reading** | Hide PianoRoll note names, show VexFlow staff notation, no finger numbers |
| **Call & Response** | Demo phase (Salsa plays 2-4 bars) → response phase (user plays back) |

### Phase 2 Audit Checklist

**App:**
- [x] All 6 exercise types playable end-to-end (UI components + wiring + template fallbacks)
- [x] Scoring works correctly for each type (rhythm ignores pitch, chordId wider timing, etc.)
- [x] AI generates valid exercises for each type via Gemini (`interactionType` passed through)
- [x] Existing 30 exercises still work (backward compat: `type` field is optional, defaults to 'play')
- [x] CompletionModal shows correct feedback per type (uses score data from type-specific scorers)
- [x] 0 TypeScript errors, 141 test suites / 2,883 tests passing

**CI/CD:**
- [x] New test suites for exercise types pass in CI
- [x] Build succeeds with new components

**System Design:**
- [x] Exercise type field is optional (backward compatible)
- [x] AI generation has rate limiting per user (checkRateLimit in geminiExerciseService)
- [x] Offline fallback exists for each exercise type (6 type-specific templates + hints-based generation)

### PlayScreen Redesign (Free Play + Song Mode)

**Design Spec:** `docs/plans/2026-03-10-playscreen-redesign-design.md`

Complete redesign of the PlayScreen from landscape-locked split-keyboard layout into a neon arcade studio.

**Key Changes:**
- Single continuous keyboard (no L/R split) with smart auto-range + octave `<` `>` arrows
- 7 practice tools via slim left sidebar (metronome, chord display, scale overlay, loop recorder, key/scale selector, tempo trainer, session stats)
- Toggle tools (direct effect) vs floating widget tools (draggable cards, max 2 open)
- Song mode: vertical falling notes (reuse `VerticalPianoRoll`), section pills, now-line, key highlighting — no scoring
- Neon arcade visuals: glow keys, particle bursts, light beams, aurora background
- Landscape default, portrait opt-in via toggle button (saved in settingsStore)

**Tasks:**
- [x] 2.10 — Unified keyboard with octave arrows + smart auto-range
- [x] 2.11 — Tool sidebar component + floating widget system
- [x] 2.12 — Metronome widget (BPM dial, tap tempo, time sig)
- [x] 2.13 — Chord display (real-time detection in viz area)
- [x] 2.14 — Scale overlay + key selector (dim out-of-key notes)
- [x] 2.15 — Loop recorder widget (record/overdub/play)
- [x] 2.16 — Tempo trainer widget (progressive BPM)
- [x] 2.17 — Session stats widget (notes, time, analysis, drill button)
- [x] 2.18 — Song mode with VerticalPianoRoll + section pills + now-line
- [x] 2.19 — Neon arcade visuals (key glow, particles, aurora background, light beams)
- [x] 2.20 — Portrait mode toggle + orientation preference persistence
- [x] 2.21 — PlayScreen audit: all tools work, song mode works, no crashes, 0 TS errors

---

## Phase 3: Content Explosion

**Goal:** 500+ exercises, 500+ songs, 5 learning paths. Content is king.

### Exercise Library (500+)

| Block | Lessons | Exercises | Skills |
|-------|---------|-----------|--------|
| Beginner | 1-6 | 60 | Note finding, C position, simple melodies, both hands |
| Early Intermediate | 7-12 | 72 | Black keys, G/F/D major, sharps/flats, dotted rhythms |
| Intermediate | 13-20 | 96 | Minor keys, chords & inversions, arpeggios, pedaling |
| Upper Intermediate | 21-28 | 96 | Chord progressions, accompaniment, syncopation, 6/8 time |
| Advanced | 29-36 | 96 | Modulation, jazz voicings, classical technique, ornaments |
| Mastery | 37-40 | 48 | Performance pieces, improvisation, sight-reading drills |

**Total:** ~468 structured + ~50 standalone drills = **500+**

All 6 exercise types distributed across blocks. Existing 30 exercises kept as-is.

### Song Library (500+)

| Source | Count | Genre | Method |
|--------|-------|-------|--------|
| Existing | 124 | Mixed | Already in Firestore |
| TheSession.org | +150 | Folk/Celtic | `import-thesession.ts` |
| IMSLP/music21 | +100 | Classical | `import-pdmx.py` |
| Gemini generation | +75 | Pop/Film/Game | `generate-songs.ts` |
| Public domain hymns | +50 | Standards | New import script |

Each popular song in 3 difficulty arrangements (Easy/Medium/Hard).

### 5 Learning Paths

| Path | Focus | Branches at | Unique Content |
|------|-------|-------------|----------------|
| **Piano Basics** | Default, well-rounded | — | Standard curriculum |
| **Pop & Film** | Play songs you know | Lesson 5 | Song-heavy, chord-first |
| **Classical** | Technique & repertoire | Lesson 5 | Scales, arpeggios, Bach/Mozart/Beethoven |
| **Jazz & Blues** | Chord voicings, improv | Lesson 10 | 7th chords, swing, blues scale, lead sheets |
| **Kids** | Simplified, gamified | Lesson 1 | Shorter exercises, more cat interactions, nursery rhymes |

Each path is a JSON manifest referencing exercises from the shared pool + path-exclusive exercises.

### Songs Integrated Throughout Curriculum

Songs are NOT a separate silo. They appear as **exercises within the learning path**:

**Song exercises in lessons:** Each tier includes 1-2 songs as exercises. CurriculumEngine mixes song exercises into daily sessions alongside regular exercises.
- Tier 1-3: Nursery rhymes, simple folk songs (Twinkle Twinkle, Mary Had a Little Lamb)
- Tier 4-6: Easy pop arrangements (Let It Be, Imagine, Clocks)
- Tier 7-9: Intermediate classical/film (Für Elise, Hedwig's Theme)
- Tier 10-12: Full arrangements with both hands
- Tier 13-15: Performance-level pieces

**Song skill rewards:** Mastering skills unlocks new songs:
- Master C major position → unlock "Twinkle Twinkle" (Easy)
- Master both-hands → unlock "Let It Be" (Easy)
- Master black keys → unlock "Bohemian Rhapsody" (Easy)

**Implementation:**
- Add `requiredSkills: string[]` and `tier: number` to song metadata
- Create a `songExercise` exercise type or convert song sections to Exercise format
- CurriculumEngine's `generateSessionPlan()` includes song exercises when player has earned them
- Show locked songs on LevelMap as reward nodes
- SongPlayerScreen sections can route back to ExercisePlayer for scoring

### Daily Fresh Content

- **Daily Sight-Reading Challenge:** Cloud Function at midnight UTC, 3 difficulty variants, global leaderboard per tier, gem rewards
- **Weekly Featured Song:** One song highlighted every Monday, 3x gem multiplier, friend score comparison
- **AI Practice Sessions:** CurriculumEngine pulls from 500+ pool — never repeats

### ContentLoader Migration

Static `require()` doesn't scale to 500+. Migrate to:
- Bundled JSON index file (`content/exercise-index.json`) with all metadata ← partly done
- Individual exercise files loaded on demand (lazy require or fetch)
- Firestore backup for remote content updates without app releases

### Tasks

| # | Task |
|---|------|
| 3.1 | Batch exercise generation pipeline (`scripts/batch-generate-exercises.ts`) |
| 3.2 | Generate + review 470 new exercises across all blocks and types |
| 3.3 | Import 275+ new songs (TheSession + IMSLP + hymns) |
| 3.4 | Generate 75 new songs via Gemini |
| 3.5 | Create 5 learning path manifests |
| 3.6 | Path selection UI (onboarding + settings) |
| 3.7 | CurriculumEngine path routing |
| 3.8 | Song-curriculum linking (`requiredSkills` field) |
| 3.9 | Daily Sight-Reading Challenge Cloud Function |
| 3.10 | Weekly Featured Song selection + UI |
| 3.11 | ContentLoader lazy loading migration |
| 3.12 | Song search improvements (Firestore text search or Algolia) |

### Phase 3 Audit Checklist

**App:**
- [ ] 500+ exercises accessible and playable
- [ ] 500+ songs accessible and playable
- [ ] All 5 learning paths selectable and route correctly
- [ ] Daily challenge generates and displays
- [ ] Weekly featured song highlights
- [ ] Songs unlock based on skill mastery
- [ ] ContentLoader handles 500+ exercises without startup lag
- [ ] 0 TypeScript errors, 0 test failures

**CI/CD:**
- [ ] Exercise validation script passes for all 500+ exercises
- [ ] Build succeeds (app size stays under 100MB)
- [ ] Daily challenge Cloud Function deploysable

**System Design:**
- [ ] Content loading is lazy (not all 500+ loaded at startup)
- [ ] Song search scales to 1000+ without client-side filtering
- [ ] Firestore reads per session stay reasonable (<500 reads)
- [ ] Offline-first: exercises bundled, songs cached after first load

---

## Phase 4: Cat Progression Rebalance

**Goal:** Make cat evolution a meaningful months-long journey, not a week-long sprint.

### The Problem

Current thresholds are trivially reachable:

| Stage | Current XP | Exercises to Reach | Time |
|-------|-----------|-------------------|------|
| Baby → Teen | 500 | ~6-10 | 1 session |
| Teen → Adult | 2,000 | ~25-35 | 3-5 days |
| Adult → Master | 5,000 | ~60-80 | 1-2 weeks |

### New Progression Model

| Stage | New XP | Target Time | Feel |
|-------|--------|-------------|------|
| Baby → Teen | 2,000 | 2-3 weeks daily | "Getting started" |
| Teen → Adult | 8,000 | 2-3 months daily | "Dedicated learner" |
| Adult → Master | 25,000 | 6+ months daily | "True mastery" |

### New XP Sources (Beyond Exercises)

| Source | XP Per | Frequency |
|--------|--------|-----------|
| Exercise completion | 10-85 | Per exercise |
| Song mastery tier up | 50-200 | Per achievement |
| Daily challenge complete | 25-75 | Daily |
| Weekly challenge complete | 150 | Weekly |
| Guild contribution (band XP) | 10-30 | Per exercise while in guild |
| Streak milestone (7/14/30/60/90) | 100-500 | One-time |
| New skill mastered | 100 | Per skill |
| Lesson completed (first time) | 200 | Per lesson |

### Milestone Rewards

| Stage Reached | Reward |
|---------------|--------|
| Teen | 200 gems + unlock Common accessories + evolution celebration |
| Adult | 500 gems + unlock Rare/Epic accessories + new cat pose |
| Master | 1000 gems + unlock Legendary accessories + exclusive accessory + crown |

### Tasks

| # | Task |
|---|------|
| 4.1 | Update `EVOLUTION_XP_THRESHOLDS` in `stores/types.ts` |
| 4.2 | Add new XP sources (song mastery, guild contribution, streak milestones, lesson completion) |
| 4.3 | Add milestone reward system (gems + accessories on evolution) |
| 4.4 | Update all tests for new thresholds |
| 4.5 | Update ProfileScreen/HomeScreen/CatSwitchScreen progress displays |
| 4.6 | Data migration: existing users keep their current stage (grandfather existing progress) |

### Phase 4 Audit Checklist

**App:**
- [ ] Evolution thresholds match new values
- [ ] Existing users don't lose their current stage
- [ ] New XP sources all fire correctly
- [ ] Milestone rewards grant on stage transition
- [ ] Progress bars/displays show correct ranges
- [ ] 0 TypeScript errors, 0 test failures

**CI/CD:**
- [ ] Migration logic tested
- [ ] All evolution-related test suites pass

**System Design:**
- [ ] Backward compatible: old persisted data works with new thresholds
- [ ] No inflation: XP sources don't create runaway progression
- [ ] Evolution XP is per-cat (not shared) — verified

---

## Phase 5: The Arena + Music Guilds

**Goal:** Transform social from a checkbox feature into the #1 retention driver. Friends, competition, and band identity make users come back daily.

### Part 1: The Arena (Social Tab Redesign)

#### Arena Entrance Animation
- Tab tap → screen dims → arena gates slide open → camera zooms through → cat walks to center
- 1.5s animation, skippable by tap
- Tier-specific arena skin:
  - Bronze: small practice room
  - Silver: rehearsal studio
  - Gold: concert hall
  - Diamond: stadium with crowd

#### League Card (Hero Section)
- Animated tier border (pulsing with tier color)
- Your rank, weekly XP, time remaining
- "View Standings" → Leaderboard

#### Battle Log (Clash Royale-style)
- Challenges displayed as battle cards:
  - Your cat (left) vs opponent cat (right), facing each other
  - Score comparison bar (animated fill)
  - Win/Loss crown display

#### Friend Activity Feed (Enhanced)
- Activity items show friend's cat avatar with accessories
- **Reaction system:** Tap activity → send reaction (clap, fire, heart, wow)
- Floating emoji bubbles on reaction

#### Friend Profile Cards
- Tap friend → cat with accessories, evolution stage, achievements
- Prominent "Challenge" button
- League tier, streak, level visible

### Part 2: Music Guilds (Bands)

**Full guild feature as it would be in the final app:**

#### Create / Join a Band
- Create: name + icon + accent color (150 gems)
- Join: browse open bands or enter invite code
- Max 8-12 members per band
- Leave: any time, cooldown before rejoin

#### Band Features
- **Band Leaderboard:** Aggregated weekly XP from all members
- **Band Chat:** Emoji reactions only — no free text (kid-safe)
- **Band Challenges:** Band vs band weekly score race (matched by aggregate level)
- **Band Banner:** Customizable icon + accent color, shown next to member names
- **Band Roles:** Leader (1), Officers (2), Members
- **Band XP:** Every member exercise contributes to band total

#### Firestore Data Model

```
guilds/{guildId}
  name: string
  icon: string (emoji)
  accentColor: string
  createdBy: string (uid)
  memberCount: number
  weeklyXp: number
  members/{uid}
    role: 'leader' | 'officer' | 'member'
    joinedAt: timestamp
    weeklyXpContribution: number
  chat/{messageId}
    senderUid: string
    senderName: string
    emoji: string
    timestamp: number
  challenges/{challengeId}
    opponentGuildId: string
    status: 'active' | 'completed'
    startDate: string
    endDate: string
    scores: { [guildId]: number }
```

### Part 3: Social Quick Actions (from Exercise Flow)

| Feature | Location | Action |
|---------|----------|--------|
| Challenge a Friend | CompletionModal | Select friend → sends challenge with your score |
| Share Score Card | CompletionModal | Image share via expo-sharing |
| Friend Activity Strip | HomeScreen | Compact horizontal scroll of recent friend activity |
| QR Code Add Friend | AddFriendScreen | QR display + camera scan |
| League Transitions | LeaderboardScreen | Promotion/demotion animations with confetti |

### Tasks

| # | Task |
|---|------|
| 5.1 | Arena entrance animation (Reanimated + tier skins) |
| 5.2 | Battle log component (challenge cards with cat vs cat) |
| 5.3 | Reaction system on activity feed |
| 5.4 | Friend profile cards |
| 5.5 | `guildService.ts` — Firestore CRUD for guilds |
| 5.6 | `guildStore.ts` — Zustand store for band state |
| 5.7 | `GuildScreen.tsx` — Create/join/manage band |
| 5.8 | `GuildChatScreen.tsx` — Emoji-only chat |
| 5.9 | Band challenges (matching + scoring + results) |
| 5.10 | Band leaderboard (aggregate XP display) |
| 5.11 | Challenge from CompletionModal |
| 5.12 | Share score card from CompletionModal |
| 5.13 | Friend activity strip on HomeScreen |
| 5.14 | QR code friend discovery |
| 5.15 | League promotion/demotion animations |
| 5.16 | Firestore rules + indexes for guilds collection |
| 5.17 | Tests for all guild service + store + screens |

### Phase 5 Audit Checklist

**App:**
- [ ] Arena entrance animation plays on Social tab
- [ ] Battle log shows challenge history correctly
- [ ] Reaction system works (send + receive reactions)
- [ ] Create/join/leave band works end-to-end
- [ ] Band chat sends and receives emoji reactions
- [ ] Band challenges create, score, and resolve correctly
- [ ] Challenge from CompletionModal sends challenge to friend
- [ ] Share card generates image and opens share sheet
- [ ] QR code displays friend code and scanner works
- [ ] League transitions animate on promotion/demotion
- [ ] 0 TypeScript errors, 0 test failures

**CI/CD:**
- [ ] All new test suites pass in CI
- [ ] Build succeeds

**System Design:**
- [ ] Firestore rules secure guild data (only members can read chat, only leader can delete)
- [ ] Guild member count kept in sync (denormalized count field)
- [ ] Band chat uses pagination (not loading all messages at once)
- [ ] Rate limiting on chat messages (prevent spam even with emoji-only)
- [ ] Guild matching algorithm for band challenges is fair (±20% aggregate level)

---

## Phase 6: Cat Studio

**Goal:** Full Bitmoji-style accessory equip UI. Cats become personal expression, not just collectibles. Lower priority than social — users need friends before fashion.

### Layout

```
┌─────────────────────────────────┐
│  [<Back]   Cat Studio    [Gems] │
├─────────────────────────────────┤
│     ┌───────────────────┐       │
│     │   SVG Cat Preview │       │  Live preview of equipped accessories
│     │   (animated,      │       │  Tap = pose change
│     │    shows equipped) │       │
│     └───────────────────┘       │
│                                 │
│  [Cat Selector: horizontal scroll]
│  Active cat = lifted + glow     │
│                                 │
├─────────────────────────────────┤
│  Category tabs (swipeable):     │
│  [Hats] [Glasses] [Outfits]    │
│  [Capes] [Collars] [Effects]   │
│                                 │
│  Accessory grid (3 columns):    │
│  Owned = full color             │
│  Locked = silhouette + gem cost │
│  Tap = live preview on cat      │
│  Buy = confirm modal            │
└─────────────────────────────────┘
```

### 6 Accessory Categories (48 items)

| Category | Items | Price Range |
|----------|-------|-------------|
| Hats | Crown, Beret, Top Hat, Santa Hat, Pirate Hat, Wizard Hat, Cat Ears Headband, Bow | 10-150 gems |
| Glasses | Sunglasses, Monocle, Round Glasses, Star Glasses, Heart Glasses | 10-75 gems |
| Outfits | Tuxedo, Hawaiian Shirt, Hoodie, Superhero Cape+Suit, Royal Robe | 25-150 gems |
| Capes/Back | Cape, Wings, Backpack, Guitar Case, Music Notes Trail | 20-100 gems |
| Collars/Neck | Bowtie, Scarf, Necklace, Bandana, Medal | 10-50 gems |
| Effects | Sparkle aura, Fire aura, Rainbow trail, Musical notes cloud, Star halo | 50-200 gems |

### Evolution-Gated Access

| Stage | Accessible Tiers |
|-------|-----------------|
| Baby | No accessories |
| Teen | Common (10-25 gems) |
| Adult | Rare + Epic (30-100 gems) |
| Master | Legendary (150+ gems) + 1 exclusive free per cat |

### Technical Implementation

- **State:** `settingsStore.equippedAccessories: Record<string, string>` (category → accessory ID)
- **State:** `settingsStore.ownedAccessories: string[]`
- **Rendering:** SVG overlay accessories at predefined anchor points on CatAvatar
- **Data:** `src/data/accessories.ts` already has 48 items across 6 categories
- **Persistence:** Synced to Firestore with rest of settings
- **Display everywhere:** Home, Exercise, Completion, Social, Profile, Leaderboard

### Tasks

| # | Task |
|---|------|
| 6.1 | Add `equippedAccessories` and `ownedAccessories` to settingsStore |
| 6.2 | Create `CatStudioScreen.tsx` (replaces CatSwitchScreen route) |
| 6.3 | Build accessory grid component with buy/equip/preview flow |
| 6.4 | SVG accessory rendering on CatAvatar (overlay at anchor points) |
| 6.5 | Evolution-gated access logic |
| 6.6 | Show equipped accessories on ALL cat displays (Home, Exercise, Social, etc.) |
| 6.7 | Sync accessories to Firestore |
| 6.8 | Tests for accessory store, purchase flow, evolution gating |

### Phase 6 Audit Checklist

**App:**
- [ ] Cat Studio screen fully functional (browse, preview, buy, equip)
- [ ] Accessories display on CatAvatar in all locations
- [ ] Evolution gating enforced (can't buy Legendary as Teen)
- [ ] Gem balance deducted correctly on purchase
- [ ] Accessory state persists across app restart
- [ ] 0 TypeScript errors, 0 test failures

**CI/CD:**
- [ ] CatStudio tests pass in CI
- [ ] Build succeeds with new screen

**System Design:**
- [ ] Accessories synced to Firestore for cross-device
- [ ] Accessory data is lightweight (IDs, not images)
- [ ] No orphaned purchases if app crashes mid-transaction (atomic set)

---

## Phase 7: "Play First" Onboarding

**Goal:** User plays piano within 15 seconds. Hooks them before asking a single settings question.

```
STEP 1 (0-15s):   "Play your first note!"   → highlighted Middle C → confetti
STEP 2 (15-45s):  "Now a melody!"           → guided C-D-E-F-G with falling notes
STEP 3 (45-75s):  "A real song!"            → 8-note Twinkle Twinkle with scoring
STEP 4 (75-90s):  Choose your cat + learning path
STEP 5 (90-110s): Quick setup               → experience + input + goal (one screen)
HOME SCREEN — user has already succeeded at piano
```

### Key Principles
- Steps 1-3 reuse existing `Keyboard.tsx` and `VerticalPianoRoll.tsx`
- Tutorial exercises use simplified ExercisePlayer (everything is "Great!")
- Salsa coaches through each step with TTS
- Total: ~2 minutes, but user has PLAYED PIANO
- Cat selection + path selection combined in one step

### Phase 7 Audit Checklist

**App:**
- [ ] New user hits piano within 15 seconds
- [ ] All 5 onboarding steps work end-to-end
- [ ] Cat + path selection saves correctly
- [ ] Anonymous auth created seamlessly in background
- [ ] Salsa TTS works during onboarding
- [ ] Skip not available until Step 3 (ensure engagement)

**CI/CD:**
- [ ] Onboarding flow tests pass in CI

**System Design:**
- [ ] Anonymous auth created before any Firestore writes
- [ ] Onboarding state persists if app crashes mid-flow
- [ ] No network required for Steps 1-3 (offline-first)

---

## Phase 8: Retention Engine

**Goal:** Users come back every day because their cat needs them, their streak matters, and there's always something fresh.

### Cat Mood ↔ Streak Connection

| Streak | Cat Behavior | Visual |
|--------|-------------|--------|
| 0 (broken) | Sad pose, sleepy eyes | `sad` animation, dim accessories |
| 1-2 days | Neutral | `idle` animation |
| 3-6 days | Happy, playful | `play` animation, slight glow |
| 7-13 days | Excited, bouncy | `celebrate` micro-bursts, warm glow |
| 14-29 days | Peak energy | Particle effects, gold tint |
| 30+ days | Legendary | Rainbow aura, crown auto-equipped |

### Re-engagement System

- Push notification after 3+ days: "{catName} misses you!"
- Return screen: full-screen sad cat + personalized dialogue
- Quick review session via CurriculumEngine
- Streak recovery: 50-gem retroactive freeze purchase (one-time per break)

### Streak Freeze

- Purchasable: 30 gems (covers 1 missed day)
- Visual: StreakFlame with ice crystal overlay
- 8 PM notification: "Your {streak}-day streak ends at midnight!"
- Max 3 freezes stockpiled

### Weekly Featured Song

- Highlighted every Monday from 500+ library
- 3x gem multiplier for first completion
- Friend score comparison on SocialScreen
- HomeScreen spotlight card

### Phase 8 Audit Checklist

**App:**
- [ ] Cat mood visually changes with streak tier
- [ ] Streak freeze purchase and consumption work
- [ ] Push notifications fire at correct times
- [ ] Re-engagement screen shows for returning users (3+ day gap)
- [ ] Weekly featured song rotates and displays correctly

**CI/CD:**
- [ ] Notification scheduling tested
- [ ] Streak freeze logic tested

**System Design:**
- [ ] Push notifications use expo-notifications (local) for streaks
- [ ] Server-side push for re-engagement (Cloud Function + FCM)
- [ ] Streak freeze is atomic (can't use same freeze twice)

---

## Phase 9: Analytics + Crash Reporting

**Goal:** Know everything about how users interact. Wire BEFORE launch.

### PostHog Funnels (5)

1. **Onboarding → Activation:** first_open → play_first_note → play_melody → play_song → cat_selected → onboarding_complete → first_exercise
2. **Session Depth:** session_start → exercise_started → exercise_completed → replay_triggered → next_exercise
3. **Retention Cohorts:** D1/D3/D7/D14/D30 segmented by experience level, input method, cat
4. **Content Quality:** Per exercise/song: completion rate, avg score, retry rate, skip rate
5. **Salsa Coaching Effectiveness:** replay_triggered → replay_completed → exercise_retried → score_improved

### Crash Reporting

- `@react-native-firebase/crashlytics`
- Wired to ErrorBoundary.tsx
- Non-fatal tracking: AI fallbacks, mic failures, ONNX issues, sync failures

### In-App Feedback

- "Send Feedback" button in ProfileScreen
- Posts to Firestore `feedback` collection (app version, device, user level, OS, text)

### Phase 9 Audit Checklist

**App:**
- [ ] All 5 PostHog funnels receiving events
- [ ] Crashlytics receiving crash reports
- [ ] Non-fatal errors tracked
- [ ] Feedback submission works
- [ ] No PII in analytics events

**CI/CD:**
- [ ] PostHog project verified in dashboard
- [ ] Crashlytics symbols uploaded in build pipeline

**System Design:**
- [ ] Analytics event names follow naming convention
- [ ] No high-cardinality custom properties (e.g., exercise ID as property not event name)
- [ ] GDPR: analytics respects opt-out preference

---

## Phase 10: System Design Hardening

**Goal:** Production-grade security, performance, and reliability.

### Priority Fixes (from `docs/system-design-analysis.md`)

| # | Issue | Fix |
|---|-------|-----|
| 10.1 | **Gemini API key on client** | Move ALL Gemini calls through Cloud Functions (already have 3, wire the rest) |
| 10.2 | **AsyncStorage → MMKV** | Migrate persistence layer to MMKV for 30x faster reads |
| 10.3 | **Sync queue deduplication** | Compact queue: merge entries for same exercise before flush |
| 10.4 | **Song search at scale** | Add Firestore full-text search or Algolia integration |
| 10.5 | **Firestore multi-region** | Recreate database in `nam5` before launch (US multi-region HA) |
| 10.6 | **Rate limiting** | Cloud Functions enforce per-user rate limits (15/hr coaching, 5/hr generation) |
| 10.7 | **Offline indicator** | Show "Offline — progress saved locally" banner when no network |
| 10.8 | **Sync conflict resolution** | Verify "highest wins" merge for all data types, add conflict logging |
| 10.9 | **Queue size** | Increase offline queue from 100 → 500 with compaction |
| 10.10 | **Node.js 20 → 22** | Upgrade Cloud Functions runtime before deprecation (2026-04-30) |

### Phase 10 Audit Checklist

**App:**
- [ ] No API keys in client bundle (verified via decompilation check)
- [ ] MMKV migration complete, startup time measured (<500ms cold start)
- [ ] Offline mode works for all core features
- [ ] Sync queue compacts correctly
- [ ] Offline indicator shows/hides

**CI/CD:**
- [ ] MMKV native module builds on both platforms
- [ ] Cloud Functions deploy with new rate limits

**System Design:**
- [ ] All Gemini calls go through Cloud Functions
- [ ] Firestore in multi-region configuration
- [ ] Cloud Functions on Node.js 22
- [ ] Rate limiting enforced server-side
- [ ] No single points of failure for core loop (offline-first verified)

---

## Phase 11: App Store Launch

**Goal:** Ship to App Store. iOS first, Android follows.

### TestFlight Beta (2 weeks)

- Upload preview build to App Store Connect
- 50-100 testers (piano teachers + students)
- Crash reporting active, PostHog tracking, feedback channel open
- Fix critical bugs from beta feedback

### App Store Submission

| Asset | Spec | Status |
|-------|------|--------|
| App icon | 1024x1024 PNG | Needed |
| Screenshots | 6.7", 6.5", 5.5" — 6 per size | Needed |
| Title | "Purrrfect Keys: Learn Piano" | Ready |
| Subtitle | "Play, Learn & Evolve with Cats" | Ready |
| Privacy URL | Hosted page | Need to host |
| Support URL | Landing page or GitHub | Need to set up |

### Technical Requirements

- NSMicrophoneUsageDescription ✅
- Export compliance (usesNonExemptEncryption: false) ✅
- Privacy manifest (iOS 17+) — needs creation
- ATT prompt if PostHog uses IDFA — check
- Privacy policy — needs hosting

### Phase 11 Audit Checklist

**App:**
- [ ] TestFlight beta completed (2 weeks, 50+ testers)
- [ ] All critical beta bugs fixed
- [ ] App runs 30+ minutes without crash on 3+ device models
- [ ] All screens look correct on iPhone SE, iPhone 15, iPhone 15 Pro Max
- [ ] Dark mode works everywhere (or is consistently disabled)

**CI/CD:**
- [ ] Production build signed and uploaded
- [ ] Automated build pipeline produces submission-ready IPA
- [ ] Source maps uploaded to Crashlytics for symbolication

**System Design:**
- [ ] Firebase in production mode (not emulator)
- [ ] Cloud Functions deployed and responding
- [ ] Firestore security rules reviewed (no public writes)
- [ ] API keys are production keys (not development)
- [ ] Rate limits are production values

---

## Phase 12: Monetization

**Goal:** Sustainable revenue from the value we've built.

### Subscription (RevenueCat)

| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | Lessons 1-6, 10 songs/week, 1 cat, touch input, local-only |
| Pro | $9.99/mo or $59.99/yr | Everything unlimited, all cats, cloud sync, AI coaching, all paths |

### Gem IAP (Cosmetics)

| Pack | Price |
|------|-------|
| 100 gems | $0.99 |
| 600 gems | $4.99 |
| 1,500 gems | $9.99 |

Gems buy: accessories, streak freezes, band creation. Never gameplay advantage.

### Phase 12 Audit Checklist

**App:**
- [ ] RevenueCat SDK integrated
- [ ] Paywall shows at correct triggers
- [ ] Subscription purchase/restore works
- [ ] Gem IAP purchase/restore works
- [ ] Free tier users can still play core content
- [ ] Receipt validation server-side

**CI/CD:**
- [ ] StoreKit configuration for testing
- [ ] Revenue events tracked in PostHog

**System Design:**
- [ ] Server-side receipt validation (Cloud Function)
- [ ] Subscription status cached locally (MMKV)
- [ ] Graceful degradation if RevenueCat is down
- [ ] No gameplay-affecting purchases (cosmetics only for gems)

---

## Post-Phase Audit Template

After EVERY phase, run this complete audit:

### App Health
```bash
npm run typecheck        # Must be 0 errors
npm run test             # Must be 0 failures
npm run lint             # Must be 0 errors (warnings OK)
```

### CI/CD Health
```bash
# Verify GitHub Actions
gh run list --limit 5    # All green

# Verify EAS Build
eas build:list --limit 3 # Latest build succeeded

# Verify Cloud Functions
firebase functions:list  # All functions deployed
```

### System Design Review
- [ ] No new API keys exposed in client code
- [ ] No new single points of failure introduced
- [ ] Offline-first still works for core loop
- [ ] Firestore reads per session reasonable (<500)
- [ ] New Firestore collections have security rules
- [ ] New data is synced cross-device if needed
- [ ] No N+1 query patterns introduced
- [ ] Performance: no new >16ms frame drops in critical paths

### Device Verification (spot check)
- [ ] Feature works on physical iOS device
- [ ] No new crash paths
- [ ] Audio still works after feature (no session conflicts)

---

## Dependency Graph

```
PHASE 1 (Foundation Cleanup) ─────────────────────────────────────────
  │  Fix TS errors, username sync, device verification, UI polish
  │
PHASE 2 (Exercise Types) ─────────────────────────────────────────────
  │  Complete 6 exercise types (UI + AI generation)
  │
PHASE 3 (Content Explosion) ──────────────────────────────────────────
  │  500+ exercises, 500+ songs, 5 paths, daily challenges
  │
PHASE 4 (Cat Progression) ────────────────────────────────────────────
  │  Rebalance thresholds, new XP sources, milestone rewards
  │
  ├── PHASE 5 + PHASE 6 can run in parallel ──────────────────────────
  │                                │
  │  PHASE 5 (Arena + Guilds) PHASE 6 (Cat Studio)
  │  Social redesign, bands,  Accessories, equip UI
  │  battles                       │
  └────────────────┬───────────────┘
                   │
PHASE 7 (Onboarding) ────────────────────────────────────────────────
  │  "Play First" + cat + path selection (needs paths from Phase 3)
  │
PHASE 8 (Retention) ─────────────────────────────────────────────────
  │  Cat mood, streak freeze, re-engagement, weekly featured
  │
PHASE 9 (Analytics) ── can start early, wire throughout ─────────────
  │  PostHog funnels, Crashlytics, feedback
  │
PHASE 10 (System Design) ────────────────────────────────────────────
  │  Security hardening, MMKV, sync improvements
  │
PHASE 11 (App Store Launch) ─────────────────────────────────────────
  │  TestFlight → App Store
  │
PHASE 12 (Monetization) ─────────────────────────────────────────────
  RevenueCat, subscription, gem IAP
```

### Key Dependencies
- Phase 3 (Content) needs Phase 2 (exercise types) for type diversity
- Phase 5 (Arena+Guilds) depends on Phase 4 (band XP feeds into cat evolution)
- Phase 6 (Cat Studio) depends on Phase 4 (evolution gating uses new thresholds)
- Phase 7 (Onboarding) needs Phase 3 (learning paths) for path selection step
- Phase 9 (Analytics) should start wiring EARLY — ideally begin during Phase 5-6
- Phase 10 (System Design) should be done BEFORE Phase 11 (launch)

---

## Current Numbers

| Metric | Count |
|--------|-------|
| Test suites | 139 |
| Tests passing | 2,831 |
| TypeScript errors | 0 (after Phase 1 fix) |
| Exercises (static) | 30 |
| Exercises (AI tiers 7-15) | Unlimited (on demand) |
| Songs in Firestore | 124 |
| Skill tree nodes | 100 |
| Cat profiles | 12 (+1 Salsa NPC) |
| Accessories defined | 48 (6 categories) |
| Cloud Functions | 9 |
| Piano samples | 5 (FluidR3 GM, C2-C6) |

---

## Known Technical Constraints

1. **react-native-screens** pinned to 4.4.0 (Fabric codegen bug with RN 0.76)
2. **Native MIDI**: `@motiz88/react-native-midi` installed — needs dev build for testing
3. **ONNX Basic Pitch**: Verified on device. Competitive differentiator — do NOT disable.
4. **Songs**: 124 in Firestore, zero offline. Needs caching strategy for Phase 10.
5. **ElevenLabs TTS**: 13 per-cat neural voices. Falls back to expo-speech gracefully.
6. **Node.js 20**: Cloud Functions runtime deprecated 2026-04-30. Upgrade in Phase 10.
7. **Jest worker teardown**: Timer leak warning, non-blocking.

---

## Active Design Documents

| Document | Phase | Purpose |
|----------|-------|---------|
| **This file** | All | Single source of truth |
| [`salsa-coaching-loop-design.md`](2026-03-03-salsa-coaching-loop-design.md) | Done | Coaching loop spec |
| [`ui-production-revamp-design.md`](2026-03-08-ui-production-revamp-design.md) | 1 | UI polish spec |
| [`beta-launch-master-design.md`](2026-03-03-beta-launch-master-design.md) | 3-12 | Vision doc: content, retention, analytics, monetization |
| [`production-readiness-design.md`](archive/2026-03-01-production-readiness-design.md) | 5-6 | Cat Studio, Arena, visual identity |
| [`exercise-types-and-social-overhaul.md`](2026-03-09-exercise-types-and-social-overhaul.md) | 2+5 | 6 exercise types + social features |
| [`premium-svg-cats-design.md`](2026-03-03-premium-svg-cats-design.md) | Done | Cat art spec (completed) |
| `docs/system-design-analysis.md` | 10 | Architecture review, 30 recommendations |
| `docs/MANUAL-VERIFICATION-CHECKLIST.md` | 1 | Device testing runbook |
| `docs/design-system.md` | — | Design tokens, component inventory |
| `docs/PRD.md` | — | Product requirements |

All other plan files are in `docs/plans/archive/`.

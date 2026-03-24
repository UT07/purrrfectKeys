# Purrrfect Keys — Knowledge Base

> Comprehensive reference for the entire codebase, architectural decisions, and product design.
> Use this as the single entry point for understanding any part of the system.

---

## Table of Contents

1. [Product Vision & Philosophy](#1-product-vision--philosophy)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack Decisions](#3-tech-stack-decisions)
4. [Audio Pipeline](#4-audio-pipeline)
5. [Exercise System](#5-exercise-system)
6. [Scoring Engine](#6-scoring-engine)
7. [Adaptive Learning System](#7-adaptive-learning-system)
8. [Cat Companion System](#8-cat-companion-system)
9. [Gamification & Economy](#9-gamification--economy)
10. [Social & Competitive](#10-social--competitive)
11. [Music Library](#11-music-library)
12. [AI Coaching](#12-ai-coaching)
13. [State Management](#13-state-management)
14. [Navigation](#14-navigation)
15. [Input System](#15-input-system)
16. [Firebase & Cloud Functions](#16-firebase--cloud-functions)
17. [Authentication](#17-authentication)
18. [Design System](#18-design-system)
19. [Content Pipeline](#19-content-pipeline)
20. [Testing Strategy](#20-testing-strategy)
21. [CI/CD & Build](#21-cicd--build)
22. [Monitoring & Analytics](#22-monitoring--analytics)
23. [Key Design Decisions Log](#23-key-design-decisions-log)
24. [File Reference Index](#24-file-reference-index)

---

## 1. Product Vision & Philosophy

**What is Purrrfect Keys?** A Duolingo-style piano learning app that makes learning piano as addictive as a mobile game. It combines real-time performance scoring, AI-driven adaptive curriculum, and collectible cat companions that evolve as the player improves.

**Target audience:** Complete beginners to early intermediate pianists. Ages 12-35, mobile-first, casual-to-committed learners.

**Core design pillars:**

| Pillar | Implementation |
|--------|---------------|
| **Learn by doing** | Every interaction involves playing notes, not reading theory |
| **AI from Day 1** | CurriculumEngine personalizes sessions from the first exercise |
| **Dopamine loops** | Combo escalation, loot reveals, cat evolution, streak flames |
| **Offline-first** | Core learning loop works without network. AI coaching is enhancement, not requirement |
| **Multiple input methods** | MIDI keyboard (best), microphone (good), touch screen (fallback) |

**Why cats?** Companion characters create emotional attachment that drives retention. Each cat has unique personality, voice, and gameplay-affecting abilities — giving players a reason to collect and evolve them.

**Why not just another Flowkey/Simply Piano?**
- Those apps are passive video followers. Purrrfect Keys scores every note in real-time.
- Adaptive curriculum (not fixed lesson order) based on learner profile.
- Game mechanics (combos, loot, evolution) make practice genuinely fun.
- Social features (leagues, challenges) add competitive motivation.

---

## 2. Architecture Overview

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native (Expo SDK 52)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Screens (26)  ──►  Stores (17 Zustand)  ──►  Services    │
│       │                     │                      │        │
│       └─────────────────────┼──────────────────────┘        │
│                             │                               │
│                    Core Logic (Pure TS)                      │
│              exercises / curriculum / music /                │
│              songs / challenges / abilities                  │
│                             │                               │
│         ┌───────────────────┼───────────────────┐           │
│     Audio Engine      MIDI Input         Pitch Detector     │
│    (JSI WebAudio)   (Web MIDI API)      (YIN + ONNX)       │
│    (expo-av pool)                                           │
└─────────────────────────────────────────────────────────────┘
          │                    │                    │
    ┌─────┴─────┐     ┌──────┴──────┐     ┌──────┴──────┐
    │ Speakers  │     │MIDI Keyboard│     │ Microphone  │
    └───────────┘     └─────────────┘     └─────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Firebase Backend  │
                    │  Auth, Firestore,  │
                    │  Cloud Functions   │
                    └───────────────────┘
```

### Layer Responsibilities

| Layer | Rule | Why |
|-------|------|-----|
| `src/core/` | Pure TypeScript. NO React imports. | 100% testable without UI framework. Business logic is portable. |
| `src/stores/` | Zustand stores. Only layer that mutates state. | Single source of truth. Prevents prop-drilling. |
| `src/screens/` | React components. Thin — delegates to stores. | Screens orchestrate UI, don't contain business logic. |
| `src/audio/` | Audio engine abstraction + implementations. | Isolates platform-specific audio from business logic. |
| `src/input/` | Input handling (MIDI, mic, touch). | Unified interface regardless of input method. |
| `src/services/` | External integrations (Firebase, Gemini, TTS). | Network boundaries are explicit. Fallbacks built in. |
| `content/` | JSON exercise/lesson definitions. | Content is data, not code. Version-controlled. |

### Decision: Why Not Expo Router?

We use React Navigation (native stack + bottom tabs) instead of Expo Router because:
1. Native stack transitions are smoother for the exercise player
2. Exercise screen needs custom animation (slide from bottom)
3. Auth flow uses conditional rendering (not file-based routing)
4. More control over navigation state for screen tracking (PostHog, Sentry)

### Decision: Why Zustand Over Redux/Context?

1. **Minimal boilerplate** — stores are 50-100 lines, not 200+ with Redux
2. **Selector-based re-renders** — components only re-render when their specific slice changes
3. **No provider wrapping** — stores work outside React (in services, utils)
4. **`getState()` in callbacks** — avoids stale closures in `useCallback`
5. **Persistence** — simple AsyncStorage adapter with debounced saves

---

## 3. Tech Stack Decisions

| Choice | Decision | Why | Alternatives Considered |
|--------|----------|-----|------------------------|
| **Framework** | React Native (Expo) | Cross-platform, managed workflow, OTA updates | Flutter (less mature ecosystem for audio), Native (2x development) |
| **Audio playback** | react-native-audio-api (JSI) + expo-av fallback | <1ms JSI bridge overhead. expo-av fallback for compatibility | expo-av only (too slow for real-time), bare RN (lose Expo benefits) |
| **Pitch detection** | YIN (mono) + ONNX Basic Pitch (poly) | YIN is fast and proven. ONNX enables chord detection — key differentiator | Aubio (C library, harder to integrate), Web Audio API analyzer (inaccurate) |
| **State** | Zustand v5 | Minimal API, works outside React, great TS support | Redux Toolkit (too verbose), Jotai (atomic model doesn't fit) |
| **Navigation** | React Navigation 6 | Native stack performance, deep customization | Expo Router (less control over transitions) |
| **Backend** | Firebase (Auth + Firestore + Functions) | Serverless, generous free tier, real-time listeners | Supabase (less mature RN SDK), Custom (too much infra for solo dev) |
| **AI** | Gemini 2.0 Flash | Cheap ($0.02/1K calls), fast, good at structured feedback | GPT-4 (expensive), Claude (expensive for per-exercise calls) |
| **TTS** | ElevenLabs + expo-speech fallback | Neural voices sound natural; expo-speech works offline | Amazon Polly (less natural), Google TTS (no RN SDK) |
| **Animation** | react-native-reanimated 3 | Worklet-based (runs on UI thread), spring physics | Animated API (runs on JS thread, jank), Lottie (pre-baked only) |
| **Analytics** | PostHog | Self-hostable, feature flags, session replay | Mixpanel (expensive), Amplitude (expensive), Firebase Analytics (limited) |
| **Error tracking** | Sentry | Best RN support, performance monitoring | Bugsnag (less feature-rich), Crashlytics (Firebase-only) |
| **Testing** | Jest + RTL | Standard RN testing stack, 3,253 tests | Vitest (no RN support), Detox (E2E only) |

---

## 4. Audio Pipeline

### Two Audio Paths

**Path 1: Playback (Touch/MIDI → Sound)**
- Target: <20ms total latency
- Engine: `ExpoAudioEngine` with round-robin voice pools (50 pre-loaded sounds)
- Piano samples: FluidR3 GM (5 notes C2-C6, 132KB total), ±6 semitone pitch shift
- Pattern: 2 voices per note (`VOICES_PER_NOTE = 2`), cycling prevents cut-off

**Path 2: Detection (Microphone → Pitch → Feedback)**
- Monophonic: YIN algorithm, ~120ms latency, -100ms compensation
- Polyphonic: ONNX Basic Pitch, ~145ms latency, -120ms compensation, max 6 voices
- Fallback chain: ONNX → YIN → disabled

### Decision: Why Two Audio Engines?

`WebAudioEngine` (react-native-audio-api) uses JSI for <1ms bridge overhead — ideal for real-time playback. But it requires native rebuilds and has compatibility issues on some devices.

`ExpoAudioEngine` (expo-av) is more compatible but slower. Uses `replayAsync()` for atomic stop+play with round-robin voice pools to prevent note cut-off.

The factory `createAudioEngine()` tries WebAudio first, falls back to Expo.

### Decision: Why ONNX for Polyphonic Detection?

Competitors (Simply Piano, Flowkey) only support monophonic detection. ONNX Basic Pitch enables chord detection from microphone input — a significant differentiator. The model runs on-device (no cloud inference), keeping latency acceptable at ~145ms.

### Key Files

| File | Purpose |
|------|---------|
| `src/audio/createAudioEngine.ts` | Factory: WebAudio → Expo fallback |
| `src/audio/ExpoAudioEngine.ts` | expo-av with round-robin voice pools |
| `src/audio/WebAudioEngine.ts` | JSI-based Web Audio API |
| `src/audio/SoundManager.ts` | UI sound effects + haptics (20+ sounds) |
| `src/input/PitchDetector.ts` | YIN algorithm + NoteTracker |
| `src/input/PolyphonicDetector.ts` | ONNX Basic Pitch wrapper |
| `src/input/MultiNoteTracker.ts` | Multi-note hysteresis (onset/release) |

---

## 5. Exercise System

### Exercise Data Model

Exercises are JSON files in `content/exercises/`. Each defines what to play, how to score, and what hints to show. There are **599 exercises** across **50 lessons**.

```
content/exercises/
├── lesson-01/  (5 exercises — static, hand-crafted)
├── ...
├── lesson-06/  (5 exercises — static)
├── lesson-07/  (AI-generated via Gemini)
├── ...
└── lesson-50/  (AI-generated)
```

Lessons 1-6 (30 exercises) are hand-crafted. Lessons 7-50 (569 exercises) are AI-generated using `scripts/batch-generate-exercises.ts` with skill-specific generation hints.

### Exercise Loading

`ContentLoader.ts` uses a static `require()` registry (`ContentLoaderRegistry.generated.ts`) with lazy thunks. Each exercise is loaded on demand via `getExercise(id)`.

**Decision: Why static require() instead of dynamic import()?**
Metro bundler doesn't support dynamic `require()` with variable paths. The generated registry creates explicit `() => require('./path')` thunks — Metro resolves these at build time while keeping runtime loading lazy.

### Exercise Types (17 total)

| Category | Types |
|----------|-------|
| Classic (6) | noteIdentification, rhythm, sightReading, chordId, earTraining, callResponse |
| Interaction (5) | freePlay, accompaniment, duet, teachBack, improvisation |
| Gamified (5) | speedRun, memoryChallenge, endurance, accuracyChallenge, comboChallenge |
| Creative (1) | composition |

### Key Files

| File | Purpose |
|------|---------|
| `src/core/exercises/types.ts` | Exercise, NoteEvent, ExerciseType definitions |
| `src/core/exercises/ExerciseValidator.ts` | Core scoring logic (pure TS) |
| `src/content/ContentLoader.ts` | Exercise/lesson loading with static registry |
| `src/content/ContentLoaderRegistry.generated.ts` | Auto-generated lazy require() thunks |
| `src/screens/ExercisePlayer/ExercisePlayer.tsx` | Main gameplay screen |

---

## 6. Scoring Engine

### Five-Dimensional Scoring

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| Accuracy | 35% | Did you play the right MIDI notes? |
| Timing | 30% | How close to the expected beat position? |
| Completeness | 10% | What % of expected notes did you attempt? |
| Extra Notes | 10% | Penalty for wrong/extra notes (inverted: 100 = no extras) |
| Duration | 15% | Did you hold notes for the correct length? |

### Timing Score Curve

```
100% ████████
          ████
 70%          ████████
                      ████
 40%                      ████████
                                  ████
  0% ____________________________________████
     0   25   75      150          300       ms
         ↑    ↑        ↑            ↑
      perfect good     ok        missed
```

### Input Latency Compensation

| Input Method | Compensation | Timing Tolerance Multiplier |
|-------------|-------------|---------------------------|
| MIDI | 0ms | 1.0x |
| Touch | 20ms | 1.0x |
| Mic (mono) | 100ms | 1.5x |
| Mic (poly) | 120ms | 1.5x |

### Decision: Why ±1.5 Beat Match Window?

The original 0.7-beat window was too narrow — notes at the end of a measure could match to notes in the next measure. The 1.5-beat window is wide enough to always find the nearest expected note, while the timing score curve handles precision grading.

### Key Files

| File | Purpose |
|------|---------|
| `src/core/exercises/ExerciseValidator.ts` | `validateNote()`, `matchNotes()`, `calculateScore()` |
| `src/hooks/useExercisePlayback.ts` | Playback timing, note event handling, completion |
| `agent_docs/scoring-algorithm.md` | Detailed algorithm documentation |

---

## 7. Adaptive Learning System

### Skill Tree

A directed acyclic graph (DAG) of **120 skill nodes** across **18 tiers** and **12 categories**:

| Tier Range | Content |
|-----------|---------|
| 1-5 | Note Finding, Right Hand, Left Hand, Both Hands, Scales |
| 6-10 | Black Keys, G & F Major, Minor Keys, Chords, Songs |
| 11-15 | Rhythm, Arpeggios, Expression, Sight Reading, Performance |
| 16-18 | New Keys & Modulation, Advanced Chords & Rhythm, Performance & Repertoire |

Each skill node has prerequisites (edges in the DAG), mastery requirements (1-5 completions), and a **14-day decay half-life** — unused skills gradually lose mastery, triggering review sessions.

### Curriculum Engine

`CurriculumEngine` generates personalized sessions based on the learner profile:

| Session Type | When Selected | Content |
|-------------|---------------|---------|
| **new-material** | Unmastered skills available | 1 warm-up + 3 new exercises + 1 challenge |
| **review** | 3+ decayed skills | Decayed skills sorted by staleness |
| **challenge** | >10 mastered skills | Harder exercises from mastered skills |
| **mixed** | Default | Mix of new, review, and challenge |

### Decision: Why Skill Decay?

Without decay, users who pause for 2 weeks return to advanced material they've forgotten. The 14-day half-life ensures:
1. Review sessions are auto-triggered for stale skills
2. The daily session always contains relevant content
3. Users re-engage with fundamentals before advancing

### Key Files

| File | Purpose |
|------|---------|
| `src/core/curriculum/SkillTree.ts` | DAG definition, 120 nodes, tier/category organization |
| `src/core/curriculum/CurriculumEngine.ts` | Session planning, skill selection algorithms |
| `src/core/curriculum/WeakSpotDetector.ts` | Pattern-based weakness identification |
| `src/core/curriculum/DifficultyEngine.ts` | Progressive BPM adjustment |
| `src/stores/learnerProfileStore.ts` | Per-note accuracy, skill mastery, tempo range |
| `src/screens/DailySessionScreen.tsx` | "Today's Practice" UI |

---

## 8. Cat Companion System

### 12 Cat Characters

| Cat | Tier | Price | Personality | Signature Ability |
|-----|------|-------|-------------|-------------------|
| Mini Meowww | Starter | Free | Tiny but Mighty | Precision Focus |
| Jazzy | Starter | Free | Cool & Smooth | Tempo Flex |
| Luna | Starter | Free | Mysterious | Moonlight Mode |
| Biscuit | Common | 500g | Cozy & Warm | Warm-Up Boost |
| Ballymakawww | Common | 500g | Irish Charmer | Replay Mastery |
| Aria | Common | 500g | Elegant | Perfect Pitch |
| Tempo | Common | 500g | Hyperactive | Speed Demon |
| Professor Whiskers | Rare | 1,500g | Scholarly | Study Streak |
| Shibu | Rare | 1,500g | Zen | Patience Mode |
| Bella | Epic | 3,000g | Fashionista | Beat Drop |
| Maestro | Epic | 3,000g | Distinguished | Conductor's Baton |
| Chonky Monke | Legendary | 5,000g | Absolute Unit | Combo Shield |

### Evolution System

4 stages per cat: **Baby → Teen → Adult → Master**

| Stage | XP Required | Visual Changes | Ability Unlocks |
|-------|------------|----------------|-----------------|
| Baby | 0 | Basic appearance | None |
| Teen | 500 | Slight growth | 1st ability |
| Adult | 2,000 | Full size | 2nd ability |
| Master | 5,000 | Crown + glow | All abilities |

Cat XP is earned from exercise completion (`score.xpEarned` flows to `addEvolutionXp()`).

### SVG Avatar System

Cats are composable SVGs (not images or 3D models). Each cat has a profile in `catProfiles.ts` defining body shape, ear/tail variants, eye style, colors, and blush.

**Decision: Why SVG instead of 3D?**
We originally built 3D GLB models with Three.js (react-three-fiber), but eliminated them in Mar 2026 because:
1. GL context crashes on physical devices (multiple contexts exhausted GPU)
2. 3D rendering is heavy for a learning app (battery drain, heat)
3. SVG renders perfectly at any size with zero overhead
4. Composable SVG parts allow accessories and evolution visual changes

### Cat Studio (Accessories)

48 accessories across 6 categories (hats, glasses, outfits, capes, collars, effects). Each has a `minStage` requirement for evolution gating. `CatStudioScreen` provides the full shop experience.

### Key Files

| File | Purpose |
|------|---------|
| `src/stores/catEvolutionStore.ts` | Evolution logic, XP tracking, stage computation |
| `src/components/Mascot/CatAvatar.tsx` | Composable SVG avatar (8 moods, 4 sizes) |
| `src/components/Mascot/svg/catProfiles.ts` | Per-cat visual profiles |
| `src/components/Mascot/svg/CatParts.tsx` | Composable body/ears/eyes/tail components |
| `src/components/Mascot/animations/catAnimations.ts` | Reanimated pose configs |
| `src/screens/CatStudioScreen.tsx` | Accessory shop with evolution gating |
| `src/screens/CatSwitchScreen.tsx` | Cat gallery with evolution progress |
| `src/data/accessories.ts` | 48 accessories with prices and minStage |
| `src/content/catDialogue.ts` | 12 cats x 40+ personality messages |

---

## 9. Gamification & Economy

### Gem Economy

Gems are the primary currency. Earned through gameplay, spent on cats and accessories.

**Earning sources:**
| Source | Amount |
|--------|--------|
| Exercise completion | 1-5 per star |
| Song mastery tier-up | 10-75 per tier |
| Daily challenge | 10 |
| Weekly challenge | 50 |
| Monthly challenge | 150 |
| Streak milestones | 25-200 |
| Achievements | 10-100 |
| League placement | 5-100 |

**Spending:**
| Item | Cost Range |
|------|-----------|
| Common cats | 500g |
| Rare cats | 1,500g |
| Epic cats | 3,000g |
| Legendary cat | 5,000g |
| Accessories | 10-150g |

### Challenge System

`src/core/challenges/challengeSystem.ts` generates deterministic challenges using a date-based hash:

| Type | Frequency | Reward |
|------|-----------|--------|
| Daily | Every day | 10 gems + 1.5x XP |
| Weekly | Every Monday | 50 gems + 3x XP |
| Monthly | 1st of month (48h window) | 150 gems + 3x XP |

7 daily challenge types: accuracy, speed, combo, endurance, perfect, sight-reading, variety.

### Combo System

Consecutive correct notes build combos with escalating tiers:

| Tier | Combo | Visual | Haptic |
|------|-------|--------|--------|
| Normal | 1-4 | None | Light tap |
| Good | 5-9 | Yellow glow | Medium |
| Fire | 10-14 | Orange fire border | Strong |
| Super | 15-19 | Skull icon, screen shake | Impact |
| Legendary | 20+ | Crown icon, full glow | Heavy impact |

### Key Files

| File | Purpose |
|------|---------|
| `src/stores/gemStore.ts` | Gem balance, earn/spend, transaction log |
| `src/stores/progressStore.ts` | XP, levels, streaks, daily goals |
| `src/stores/achievementStore.ts` | 32+ achievements across 6 categories |
| `src/core/challenges/challengeSystem.ts` | Deterministic challenge generation |
| `src/core/rewards/chestSystem.ts` | Loot chest rewards (common→legendary) |
| `src/components/common/ComboMeter.tsx` | Combo tier display |
| `src/components/common/ComboGlow.tsx` | Full-screen combo border effect |
| `src/audio/SoundManager.ts` | Sound effects + haptic feedback |

---

## 10. Social & Competitive

### Friend System

- **Friend codes:** 6-character alphanumeric, registered atomically in Firestore `usernames/` collection
- **Friend requests:** Send/accept/reject flow via `socialService.ts`
- **Activity feed:** Aggregated events (level-ups, evolutions, achievements) from friends
- **Friend challenges:** Head-to-head exercise competitions with score comparison

### League System

Weekly competitive leagues with 30 players per group:

| Tier | Promotion | Demotion | Weekly Gem Payout |
|------|-----------|----------|------------------|
| Novice | Top 5 → Apprentice | — | 15 |
| Apprentice | Top 5 → Journeyman | Bottom 5 → Novice | 25 |
| Journeyman | Top 5 → Virtuoso | Bottom 5 → Apprentice | 40 |
| ... | ... | ... | ... |
| Grandmaster | — | Bottom 5 → Maestro | 600 |

9 tiers total: Novice, Apprentice, Journeyman, Virtuoso, Maestro, Legend, Champion, Grandmaster.

### Decision: Why 30-Player Groups?

Smaller groups (10) feel empty — not enough competition. Larger groups (100+) make it impossible to place well. 30 provides visible movement while keeping top-5 achievable with consistent daily practice.

### Key Files

| File | Purpose |
|------|---------|
| `src/stores/socialStore.ts` | Friends, feed, challenges, friend codes |
| `src/stores/leagueStore.ts` | League membership, standings |
| `src/services/firebase/socialService.ts` | Firestore CRUD for social features |
| `src/services/firebase/leagueService.ts` | League assignment, XP updates |
| `src/screens/SocialScreen.tsx` | Social tab hub |
| `src/screens/LeaderboardScreen.tsx` | Weekly standings |
| `src/screens/FriendsScreen.tsx` | Friends list + activity feed |
| `src/components/ShareCard.tsx` | Shareable score/streak images |

---

## 11. Music Library

### Content: 582 Songs

| Source | Count | Method |
|--------|-------|--------|
| Gemini AI | 494 | `scripts/generate-songs.ts` |
| TheSession.org | 50 | `scripts/import-thesession.ts` (folk tunes) |
| PDMX (music21) | 38 | `scripts/import-pdmx.py` (classical composers) |

6 genres: Pop, Classical, Folk, Film/TV, Game, Holiday.

### ABC Notation

Songs use ABC notation parsed by `abcjs`. Each song has sections with melody/accompaniment layers.

**Decision: Why ABC instead of MIDI/MusicXML?**
1. ABC is text-based — easy to generate with AI, store in Firestore, diff in git
2. Much smaller than MIDI or MusicXML
3. `abcjs` library handles rendering and playback
4. Gemini generates valid ABC more reliably than MIDI bytes

### Mastery Progression

| Tier | Score Threshold | Gem Reward |
|------|----------------|-----------|
| None | — | — |
| Bronze | 70+ | 10 |
| Silver | 80+ | 20 |
| Gold | 90+ | 40 |
| Platinum | 95+ | 75 |

### Key Files

| File | Purpose |
|------|---------|
| `src/core/songs/songTypes.ts` | Song, SongSection, MasteryTier types |
| `src/core/songs/abcParser.ts` | ABC → NoteEvent[] conversion |
| `src/core/songs/songMastery.ts` | Mastery tier computation |
| `src/services/songService.ts` | Firestore CRUD for songs |
| `src/stores/songStore.ts` | Song browsing, mastery state |
| `src/screens/SongLibraryScreen.tsx` | Genre carousel, search, filters |
| `src/screens/SongPlayerScreen.tsx` | Section-based playback |

---

## 12. AI Coaching

### Gemini 2.0 Flash Integration

Post-exercise AI coaching generates personalized feedback based on scoring data:

| Score Range | Coaching Style |
|-------------|---------------|
| 90-100% | Celebration + next-level challenge suggestion |
| 70-89% | Encouragement + one specific improvement tip |
| <70% | Patience + focus on the biggest issue only |

### Voice Coaching

Two-tier TTS pipeline:
1. **ElevenLabs** (primary) — 13 unique neural voices, one per cat character
2. **expo-speech** (fallback) — works offline, configurable pitch/rate per cat

### Decision: Why Not Real-Time Coaching?

Real-time AI feedback during exercise play would:
1. Add latency to the audio loop (API calls take 200ms+)
2. Distract from note accuracy
3. Be expensive at per-note granularity

Instead, AI coaching happens post-exercise — analyzing the completed score and providing 2-3 focused sentences.

### Offline Fallback

100+ pre-generated coaching templates in `src/content/offlineCoachingTemplates.ts` ensure coaching works without network. Templates are selected based on score range and issue type.

### Key Files

| File | Purpose |
|------|---------|
| `src/services/ai/GeminiCoach.ts` | Gemini API client |
| `src/services/ai/CoachingService.ts` | Prompt construction + caching |
| `src/services/ai/VoiceCoachingService.ts` | Cat personality integration |
| `src/services/tts/TTSService.ts` | ElevenLabs + expo-speech |
| `src/services/tts/catVoiceConfig.ts` | Per-cat voice parameters |
| `src/content/offlineCoachingTemplates.ts` | 100+ offline fallback strings |

---

## 13. State Management

### 17 Zustand Stores

| Store | Persistence | Purpose |
|-------|------------|---------|
| `exerciseStore` | No | Current exercise session state |
| `progressStore` | Debounced (500ms) | XP, levels, streaks, lesson progress |
| `settingsStore` | Debounced | Preferences, selected cat, volume |
| `learnerProfileStore` | Debounced | Per-note accuracy, skill mastery |
| `catEvolutionStore` | Debounced | Cat XP, evolution stages, abilities |
| `gemStore` | Immediate (0ms) | Gem balance (critical — must persist before navigation) |
| `achievementStore` | Debounced | Achievement tracking |
| `authStore` | No | Firebase auth state |
| `songStore` | Debounced | Song mastery, browsing state |
| `socialStore` | No | Friends, feed (server-authoritative) |
| `leagueStore` | No | League standings (server-authoritative) |
| `seasonStore` | Debounced | Battle pass, ranked seasons |
| `rankStore` | Debounced | Competitive rank (MMR, tier) |
| `guildStore` | No | Guild membership (server-authoritative) |
| `battlePassStore` | Debounced | Battle pass tier progress |

### Persistence Patterns

```typescript
// Normal state — 500ms debounce prevents excessive writes
const save = createDebouncedSave('progress-store');

// Critical state — 0ms delay for gems (must persist before screen transition)
const save = createImmediateSave('gem-store');
```

### Cross-Store Communication

Stores use lazy `require()` to avoid circular dependencies:

```typescript
// Inside catEvolutionStore.ts
try {
  const { useGemStore } = require('./gemStore');
  useGemStore.getState().earnGems(200, 'evolution-milestone');
} catch (err) { /* silent */ }
```

This pattern is used consistently across progressStore, catEvolutionStore, and gemStore.

### Decision: Why AsyncStorage Over MMKV?

AsyncStorage works with Expo managed workflow without native rebuilds. MMKV is faster but requires `expo-dev-client`. Since persistence is debounced (500ms), the async nature isn't a bottleneck. **Note (Mar 23):** MMKV migration is planned for Phase 20 — app feels laggy during hydration with 15+ async JSON.parse calls. MMKV would make hydration near-instant (~1ms vs ~50-100ms per store).

### Daily Plan Cache (Added Mar 23)

The daily session plan ("Today's Practice") is persisted to AsyncStorage via `src/core/curriculum/dailyPlanCache.ts`:

- **Keyed by date ONLY** — generates once per day, never regenerates mid-day
- Both HomeScreen and DailySessionScreen call the same `getDailyPlan()` function
- Sign-out calls `clearDailyPlanCache()` so next sign-in gets fresh plan
- Hydrated on app startup in `App.tsx` alongside other stores
- **Critical rule:** NEVER add `masteredSkills` or per-exercise state as useMemo dependency for plan generation

Visual completion indicators:
- Green checkmark + border = passed (score >= passingScore)
- Orange warning + border = attempted but below threshold
- Play button changes: play → refresh (retry) → replay (passed)

### Cross-Device Sync (Updated Mar 23)

Full bidirectional sync via `src/services/firebase/syncService.ts`:

**Sign-in order (critical):**
1. `pullRemoteProgress()` — get authoritative cloud state FIRST
2. `migrateLocalToCloud()` — push any local-only data
3. `pushAllProgressData()` — ensure cloud has latest
4. `startPeriodicSync()` — 5-minute flush cycle

**12 data types synced:** XP/level/streak, lesson progress, cats + daily rewards, gems, learner profile, achievements, rank (MMR), season/battle pass, settings, daily goal data, tier test results, streak milestones.

**Merge strategy:** "highest wins" for scores/XP/MMR. Union for mastered skills, owned cats, achievements. Remote fills empty local for settings.

### Bug Tracker (Mar 23)

Full bug list with fix status: `docs/plans/CONFIRMED-BUGS.md`
- **71 fixed** / **~22 open** (of which ~5 are deep feature gaps, not code bugs)
- Key fixes: sync order, daily plan persistence, tap timing, cat abilities, scoring feedback alignment

---

## 14. Navigation

### Structure

```
RootStack (NativeStack)
├── Auth (unauthenticated)
│   ├── AuthScreen
│   └── EmailAuthScreen
└── Authenticated
    ├── MainTabs (BottomTab)
    │   ├── Home → HomeScreen
    │   ├── Learn → LevelMapScreen
    │   ├── Songs → SongLibraryScreen
    │   ├── Social → SocialScreen
    │   └── Profile → ProfileScreen
    ├── Exercise (slide_from_bottom)
    ├── PostExercise (fade)
    ├── TierIntro / LessonIntro
    ├── SkillAssessment / DailySession
    ├── SongPlayer / MidiSetup / MicSetup
    ├── CatSwitch / CatStudio
    ├── Leaderboard / Friends / AddFriend
    ├── BattlePass / Guild
    └── Account / DebugLog
```

### Custom Tab Bar

`CustomTabBar.tsx` renders animated icons with a red badge for the Social tab (pending challenges/friend requests).

### Key File

| File | Purpose |
|------|---------|
| `src/navigation/AppNavigator.tsx` | All route definitions, `RootStackParamList` type |
| `src/navigation/CustomTabBar.tsx` | Bottom tab bar with animated icons |

---

## 15. Input System

### InputManager

Unified input factory that selects the best available input method:

**Priority:** MIDI > Microphone > Touch Screen

| Method | Latency | Compensation | Tolerance |
|--------|---------|-------------|-----------|
| MIDI | <5ms | 0ms | 1.0x |
| Touch | ~20ms | -20ms | 1.0x |
| Mic (mono) | ~120ms | -100ms | 1.5x |
| Mic (poly) | ~145ms | -120ms | 1.5x |

### MIDI Integration

`NativeMidiInput` uses `@motiz88/react-native-midi` (Web MIDI API pattern). Falls back to `NoOpMidiInput` when native module isn't available. Requires dev build for hardware testing.

### Microphone Pipeline

```
Microphone → AudioCapture (react-native-audio-api)
  → RMS gate (0.002 threshold)
  → YIN pitch detection OR ONNX Basic Pitch
  → NoteTracker/MultiNoteTracker (hysteresis)
  → MidiNoteEvent (same interface as MIDI)
  → ExerciseValidator
```

**Decision: Why `measurement` audio session mode?**
iOS's `default` mode applies voice processing (compression, noise gate) that crushes piano audio. `measurement` mode gives raw unprocessed audio — essential for accurate pitch detection from a musical instrument.

### Key Files

| File | Purpose |
|------|---------|
| `src/input/InputManager.ts` | Unified factory, latency compensation |
| `src/input/MidiInput.ts` | MIDI device handling |
| `src/input/MicrophoneInput.ts` | Mic capture + detector routing |
| `src/input/PitchDetector.ts` | YIN mono detection + NoteTracker |
| `src/input/PolyphonicDetector.ts` | ONNX Basic Pitch wrapper |

---

## 16. Firebase & Cloud Functions

### Firestore Collections

| Collection | Purpose | Key Rules |
|-----------|---------|-----------|
| `users/{uid}` | User profile, username, settings | Owner read/write only |
| `users/{uid}/progress` | Lesson progress, scores | Owner only |
| `users/{uid}/songs` | Song mastery data | Owner only |
| `users/{uid}/friends` | Friend list | Owner + friend (for accept) |
| `users/{uid}/activityFeed` | Social events | Owner only |
| `usernames/{name}` | Username → UID lookup | Anyone can read, owner creates |
| `friendCodes/{code}` | 6-char code → UID lookup | Anyone can read |
| `leagues/{leagueId}` | Weekly league standings | Members can read |
| `guilds/{guildId}` | Guild data | Members can read/write |
| `songs/{songId}` | Song content (ABC notation) | Anyone can read |

### 12 Cloud Functions (nodejs22, us-central1)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `syncProgress` | Callable | Bidirectional progress sync |
| `completeExercise` | Callable | Record completion + update league XP |
| `getExerciseRecommendations` | Callable | AI-powered exercise suggestions |
| `getWeeklySummary` | Callable | Weekly progress report |
| `generateCoachFeedback` | Callable | Gemini coaching with caching |
| `cleanupCoachFeedbackCache` | Scheduled | Cache TTL enforcement |
| `deleteUserAllData` | Callable | GDPR-compliant data deletion |
| `generateExercise` | Callable | Gemini exercise generation |
| `generateSong` | Callable | Gemini song generation |
| `dailySightReading` | Scheduled | Daily sight-reading challenge |
| `weeklyNewSongs` | Scheduled | Weekly Gemini song generation |
| `weeklyLeagueProcess` | Scheduled | League promotions/demotions |

### Decision: Why Cloud Functions Over Direct Firestore?

Server-side functions for:
1. **Security** — Gemini API keys stay server-side
2. **Atomicity** — League XP updates, guild operations need transactions
3. **GDPR compliance** — Account deletion traverses 9+ subcollections
4. **Scheduled tasks** — Daily challenges, weekly leagues can't run client-side

---

## 17. Authentication

### Auth Flow

```
App Launch → Anonymous Auth (automatic)
         → Email/Password linking (optional)
         → Google Sign-In linking (optional)
         → Apple Sign-In linking (optional)
```

**Decision: Why anonymous-first?**
Players can start playing immediately without friction. Account linking is offered later for:
1. Cross-device sync
2. Friend features
3. Leaderboard identity

### Apple Sign-In Nonce Pattern

```
Raw nonce → Firebase (as rawNonce)
SHA256(rawNonce) → Apple's signInAsync (as nonce)
```

This is a subtle but critical security requirement — Apple validates the hash, Firebase stores the raw value.

### Key Files

| File | Purpose |
|------|---------|
| `src/stores/authStore.ts` | Auth state, sign-in methods, account deletion |
| `src/screens/AuthScreen.tsx` | Sign-in UI |
| `src/screens/EmailAuthScreen.tsx` | Email/password form |

---

## 18. Design System

### Theme Tokens

Defined in `src/theme/tokens.ts`:

| Token Category | Examples |
|---------------|---------|
| COLORS | `deepPurple`, `surface`, `accent`, `success/warning/error` |
| TYPOGRAPHY | Font sizes, weights, line heights |
| SHADOWS | Elevation levels (sm, md, lg) |
| GRADIENTS | Purple gradients, rarity gradients |
| GLOW | Neon glow effects for combo tiers |
| SPACING | 4/8dp scale (xs, sm, md, lg, xl) |
| BORDER_RADIUS | Consistent radius scale |
| ANIMATION_CONFIG | Spring configs, duration presets |
| RARITY | Common/Rare/Epic/Legendary colors |
| COMBO_TIERS | Fire/Skull/Crown tier definitions |

### Visual Style

Warm dark purple theme with gaming aesthetic. Inspired by Duolingo's game feel but with a darker, more "gamer" palette.

### Key Files

| File | Purpose |
|------|---------|
| `src/theme/tokens.ts` | All design tokens |
| `docs/design-system.md` | Design system documentation |
| `src/components/common/GameCard.tsx` | Rarity-bordered cards |
| `src/components/common/PressableScale.tsx` | Animated press feedback |

---

## 19. Content Pipeline

### Exercise Generation

```
scripts/batch-generate-exercises.ts
  → Gemini 2.0 Flash (with skill-specific hints)
  → JSON validation (scripts/validate-exercise.ts)
  → Save to content/exercises/lesson-XX/
  → scripts/generate-content-registry.ts
  → ContentLoaderRegistry.generated.ts
```

### Song Generation

```
scripts/generate-songs.ts (standalone)
  → Gemini 2.0 Flash (ABC notation)
  → ABC validation (abcjs parse)
  → Firestore upload (scripts/upload-songs-to-firestore.ts)
```

### Content Quality

| Content | Count | Quality |
|---------|-------|---------|
| Exercises | 599 | 100% pass validation (134 auto-fixed) |
| Songs | 582 | 91% clean (177 ABC→layers fixed) |

---

## 20. Testing Strategy

### 3,253 Tests Across 160 Suites

| Layer | Tool | Location | Count |
|-------|------|----------|-------|
| Core logic | Jest | `src/core/**/__tests__/` | ~800 |
| Stores | Jest | `src/stores/__tests__/` | ~600 |
| Components | RTL | `src/components/**/__tests__/` | ~400 |
| Screens | RTL | `src/screens/__tests__/` | ~500 |
| Integration | Jest | `src/__tests__/integration/` | ~200 |
| Services | Jest | `src/services/**/__tests__/` | ~300 |
| Performance | Jest | `src/__tests__/performance/` | ~100 |
| Security | Jest | `src/__tests__/security/` | ~100 |
| Regression | Jest | `src/__tests__/regression/` | ~100 |
| Stress | Jest | `src/__tests__/stress/` | ~150 |

### QA Suites

```bash
npm run test:perf       # Content loading, scoring throughput
npm run test:security   # Input sanitization, data exposure, auth
npm run test:regression # Critical path regression
npm run test:stress     # Store concurrency, rapid mutations
npm run test:qa         # All QA suites at once
```

### Testing Conventions

1. Mock `useSettingsStore` with `getState: () => mockState` pattern
2. Reset mock state in `beforeEach`
3. When adding exports to `persistence.ts`, update ~7 mock files
4. Use deterministic dates for time-dependent tests
5. Coverage thresholds: branches 40%, functions 45%, lines 50%, statements 50%

---

## 21. CI/CD & Build

### GitHub Actions

| Workflow | Trigger | Steps |
|----------|---------|-------|
| `ci.yml` | Push to master, feat/** | Typecheck → Lint → Test |
| `build.yml` | Version tags | EAS Build (iOS + Android parallel) |

### EAS Build

| Profile | Channel | Use |
|---------|---------|-----|
| `preview` | `preview` | Internal testing (AdHoc distribution) |
| `production` | `production` | App Store / Play Store |

### Known Build Considerations

1. `react-native-screens` pinned to 4.4.0 (4.19+ has Fabric codegen bug)
2. `plugins/strip-push-entitlement.js` strips `aps-environment` for AdHoc builds
3. `plugins/exclude-midi-android.js` excludes MIDI from Android autolinking
4. ONNX Runtime version 1.21.0 (gradle plugin fix)

---

## 22. Monitoring & Analytics

### Sentry

- Crash reporting with source maps
- Performance tracing (screen transitions, API calls)
- Navigation breadcrumbs (automatic via `registerNavigationContainer`)
- Errors forwarded to PostHog as `$exception` events

### PostHog

- Screen tracking (automatic via `onStateChange` callback)
- Touch autocapture with `testID` props
- Feature flags (future use)
- Analytics events for exercise completion, evolution, gem transactions

### Key Files

| File | Purpose |
|------|---------|
| `src/services/monitoring/SentryService.ts` | Sentry wrapper |
| `src/config/posthog.ts` | PostHog client configuration |

---

## 23. Key Design Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Audio engine | Dual engine (JSI + expo-av) | Performance + compatibility |
| State management | Zustand | Minimal boilerplate, works outside React |
| Navigation | React Navigation | Better control than Expo Router |
| Cat rendering | SVG composable | 3D eliminated (GPU crashes on device) |
| AI coaching | Post-exercise only | Real-time would add latency + cost |
| Content format | JSON exercises | Data, not code. Version-controlled. |
| Song notation | ABC | Text-based, AI-friendly, small size |
| Pitch detection | YIN + ONNX | Mono + poly coverage, on-device inference |
| Auth | Anonymous-first | Zero friction to start playing |
| Persistence | AsyncStorage + debounce | Works with Expo managed workflow |
| Backend | Firebase | Serverless, generous free tier |
| TTS | ElevenLabs + expo-speech | Neural voices + offline fallback |
| Skill decay | 14-day half-life | Prevents returning to forgotten material |
| League size | 30 players | Visible competition, achievable placement |
| Gem economy | Gameplay-only earning | No IAP for gems; monetization via energy/premium |
| Friend codes | 6-char alphanumeric | Simple to share verbally |
| Audio session | `measurement` mode for mic | Raw audio, no voice processing |

---

## 24. File Reference Index

### Critical Files (Start Here)

| File | Lines | What You'll Learn |
|------|-------|-------------------|
| `src/screens/ExercisePlayer/ExercisePlayer.tsx` | ~1300 | The core gameplay loop |
| `src/core/exercises/ExerciseValidator.ts` | ~400 | How scoring works |
| `src/stores/progressStore.ts` | ~500 | XP, streaks, lesson tracking |
| `src/stores/catEvolutionStore.ts` | ~500 | Cat evolution mechanics |
| `src/audio/ExpoAudioEngine.ts` | ~300 | How piano sounds play |
| `src/core/curriculum/CurriculumEngine.ts` | ~400 | How sessions are personalized |
| `src/navigation/AppNavigator.tsx` | ~340 | All screens and routes |
| `src/theme/tokens.ts` | ~200 | Visual design system |

### By Feature Area

| Area | Key Files |
|------|-----------|
| **Exercise play** | ExercisePlayer.tsx, ExerciseValidator.ts, useExercisePlayback.ts, exerciseStore.ts |
| **Audio** | createAudioEngine.ts, ExpoAudioEngine.ts, SoundManager.ts |
| **Input** | InputManager.ts, MidiInput.ts, PitchDetector.ts, PolyphonicDetector.ts |
| **Curriculum** | SkillTree.ts, CurriculumEngine.ts, WeakSpotDetector.ts, DifficultyEngine.ts |
| **Cats** | catEvolutionStore.ts, CatAvatar.tsx, catProfiles.ts, CatParts.tsx, accessories.ts |
| **Gamification** | gemStore.ts, achievementStore.ts, challengeSystem.ts, chestSystem.ts |
| **Songs** | songStore.ts, abcParser.ts, songMastery.ts, SongPlayerScreen.tsx |
| **Social** | socialStore.ts, leagueStore.ts, socialService.ts, SocialScreen.tsx |
| **AI** | GeminiCoach.ts, CoachingService.ts, VoiceCoachingService.ts, TTSService.ts |
| **Auth** | authStore.ts, AuthScreen.tsx, syncService.ts |
| **Content** | ContentLoader.ts, ContentLoaderRegistry.generated.ts, catDialogue.ts |

---

## Related Documentation

| Document | Path | Purpose |
|----------|------|---------|
| CLAUDE.md | `/CLAUDE.md` | Development conventions for AI assistants |
| PRD | `/docs/PRD.md` | Product requirements |
| Design System | `/docs/design-system.md` | Visual tokens and components |
| Unified Plan | `/docs/plans/UNIFIED-PLAN.md` | Phase roadmap (source of truth) |
| QA Plan | `/docs/QA-TEST-PLAN.md` | Test infrastructure |
| Architecture | `/agent_docs/architecture.md` | System diagrams and data flow |
| Audio Pipeline | `/agent_docs/audio-pipeline.md` | Latency budgets |
| Scoring | `/agent_docs/scoring-algorithm.md` | Timing curves and weights |
| Stabilization | `/agent_docs/stabilization-report.md` | All historical bug fixes |

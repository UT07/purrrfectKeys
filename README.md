# Purrrfect Keys

> AI-powered piano learning app with real-time feedback, adaptive curriculum, MIDI support, and collectible cat companions that evolve as you learn.

[![CI](https://github.com/UT07/purrrfectKeys/actions/workflows/ci.yml/badge.svg)](https://github.com/UT07/purrrfectKeys/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React_Native-0.76-61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_SDK-52-000020)](https://expo.dev/)
[![Tests](https://img.shields.io/badge/Tests-3253%20passing-brightgreen)]()

---

## Overview

Purrrfect Keys is a Duolingo-style piano learning app that combines real-time performance analysis with AI-driven adaptive learning. An AI curriculum engine personalizes every practice session from Day 1, scoring your playing across five dimensions and delivering coaching through collectible cat companions that evolve as you improve.

**What makes it different:**
- AI curriculum engine that builds a personalized learning path from your first note
- 120-node skill tree with 18 tiers spanning a full year of daily practice
- JSI-based audio engine with <20ms touch-to-sound latency
- 5-dimensional scoring (accuracy, timing, completeness, precision, duration)
- 582-song music library across 6 genres with mastery progression
- Pokemon-style cat evolution with gameplay-relevant abilities
- Weekly leagues, guilds, friend challenges, and shareable achievement cards
- Arcade-style combo escalation with sound effects and haptic feedback
- ElevenLabs neural voice coaching with 13 unique per-cat voices
- Offline-first -- core learning loop works without network

---

## Features

### Core Experience
- 50 structured lessons with 599 exercises spanning 18 tiers (beginner to advanced)
- Batch AI exercise generation pipeline via Gemini Flash with validation + retry
- Real-time vertical piano roll with falling notes (Synthesia-style)
- Touch keyboard with haptic feedback and latency compensation
- MIDI keyboard support (USB + Bluetooth)
- Microphone input with YIN pitch detection and ONNX polyphonic detection
- Portrait exercise player with dynamic note/keyboard range
- Free play mode with post-play key/scale analysis and drill generation
- Demo playback mode with visual-only note demonstration
- 5 learning paths: Piano Basics, Pop & Film, Classical, Jazz & Blues, Kids

### Music Library (582 Songs)
- **6 genres:** Pop, Classical, Folk, Film/TV, Game, Holiday
- **Content sources:** 494 AI-generated (Gemini), 50 folk tunes (TheSession.org), 38 classical (Beethoven, Mozart, Bach, Haydn)
- **ABC notation** parsing via abcjs with section-based playback
- **Mastery tiers:** None → Bronze (70+) → Silver (80+) → Gold (90+) → Platinum (95+)
- **Gem rewards** per mastery tier (10/20/40/75 gems)
- Section-by-section playback with melody/accompaniment layer toggle

### Adaptive Learning
- **17 Exercise Types** -- 6 classic + 5 interaction + 5 gamified + 1 creative
- **SkillTree** -- DAG of 120 skill nodes across 18 tiers, 12 categories
- **CurriculumEngine** -- AI session planner with 4 session types (new-material, review, challenge, mixed)
- **Skill Decay** -- 14-day half-life model; stale skills trigger automatic review sessions
- **Multi-Session Mastery** -- harder skills require 3-5 successful completions
- **DailySessionScreen** -- "Today's Practice" with AI-picked warm-up/lesson/challenge
- **WeakSpotDetector** -- pattern-based detection (note/transition/timing/hand weaknesses)
- **DifficultyEngine** -- progressive difficulty: 5 BPM per mastered exercise
- **FreePlayAnalyzer** -- detects key/scale from free play across all 48 major/minor keys

### Audio Input
- **MIDI keyboards** -- USB + Bluetooth via @motiz88/react-native-midi (Web MIDI API)
- **Monophonic mic** -- YIN pitch detection (~120ms latency)
- **Polyphonic mic** -- ONNX Basic Pitch model, 88 note bins, max 6-voice polyphony (~145ms latency)
- **Ambient calibration** -- RMS-based noise measurement for auto-tuning detection thresholds
- **InputManager** -- unified factory (MIDI > Mic > Touch) with per-method latency compensation

### Voice Coaching
- **ElevenLabs** neural TTS (primary) with 13 unique per-cat voices
- **expo-speech** fallback for offline or when API key unavailable
- Gemini 2.0 Flash generates personalized feedback from learner profile + score details
- 100+ offline coaching templates for Gemini fallback
- Content-aware cache (2-hour TTL) for response variety

### Arcade Concert Hall
- **SoundManager** -- 20+ UI sounds with haptic mapping, fire-and-forget playback
- **Combo escalation** -- Normal → Good (5+) → Fire (10+) → Super (15+) → Legendary (20+)
- **ComboGlow** -- full-screen animated border synced to combo tier
- **Loot reveals** -- 10-phase timed animation (slam text → score ring → stars → gems → XP bar)
- **GameCard** -- rarity-bordered card component (common/rare/epic/legendary)
- **Reward chests** -- tied to star ratings and first-completion bonuses

### Avatar Evolution & Gamification
- **12 Cat Characters** -- 3 starters + 8 gem-purchasable + 1 legendary
- **Cat Evolution** -- 4 stages (Baby → Teen → Adult → Master) with XP thresholds
- **12 Cat Abilities** -- gameplay-relevant effects (wider timing, combo shield, XP boost, etc.)
- **Composable SVG avatars** -- 4 body shapes, 3 ear/tail variants, 4 eye styles, Reanimated poses
- **Evolution Reveal** -- Pokemon-style full-screen animation on stage transitions
- **Gem Currency** -- earned from scores, streaks, achievements; spent to unlock cats and accessories
- **48 Accessories** -- hats, glasses, outfits, capes, collars, effects with rarity tiers
- **32+ Achievements** across 6 categories
- **Daily/Weekly/Monthly Challenges** -- deterministic date-based with gem + XP rewards

### Social & Competitive
- **Friend codes** -- 6-character alphanumeric codes for adding friends
- **Weekly leagues** -- 30-person groups across 9 tiers (Novice → Grandmaster)
- **Guilds** -- cooperative groups with shared challenges
- **Battle Pass** -- 30-tier seasonal progression with free + premium rewards
- **Activity feed** -- level-ups, evolutions, achievements from friends
- **Friend challenges** -- head-to-head exercise competitions
- **ShareCard** -- shareable score/streak/evolution image cards via react-native-view-shot
- **Local notifications** -- daily practice reminders, streak-at-risk alerts
- **Referral system** -- invite friends for bonus gems

### Infrastructure
- Firebase Authentication (anonymous, email, Google Sign-In, Apple Sign-In)
- 12 Cloud Functions (Gemini AI exercises/songs/coaching, account deletion, progress sync, league processing)
- Cross-device sync with offline queue, Firestore pull/merge, conflict resolution
- GDPR-compliant account deletion (Cloud Function + client-side fallback)
- Progress persistence via AsyncStorage with debounced saves
- Sentry error tracking + PostHog analytics
- GitHub Actions CI/CD (typecheck + lint + test on push, EAS Build on tags)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo SDK 52+) |
| Language | TypeScript 5.x (strict mode) |
| Audio | react-native-audio-api via JSI (<1ms bridge overhead) |
| Audio Fallback | expo-av with round-robin voice pools (50 pre-loaded sounds) |
| Pitch Detection | YIN (monophonic) + ONNX Basic Pitch (polyphonic) |
| State | Zustand v5 with AsyncStorage persistence |
| Navigation | React Navigation 6 (native stack + bottom tabs) |
| Animation | react-native-reanimated 3 |
| Backend | Firebase (Auth, Firestore, Cloud Functions 2nd Gen) |
| AI | Google Gemini 2.0 Flash |
| TTS | ElevenLabs (primary) + expo-speech (fallback) |
| Analytics | PostHog + Sentry |
| Testing | Jest + React Testing Library (3,253 tests, 160 suites) |
| CI/CD | GitHub Actions + EAS Build |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npx expo`)
- iOS Simulator or Android Emulator
- (Optional) USB/Bluetooth MIDI keyboard
- (Optional) Microphone for pitch detection input

### Installation

```bash
git clone https://github.com/UT07/purrrfectKeys.git
cd purrrfect-keys
npm install --legacy-peer-deps
```

### Environment Variables

Create `.env.local` at the project root:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_POSTHOG_API_KEY=your_posthog_key
EXPO_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_key
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### Development

```bash
npx expo start              # Start dev server
npm run ios                  # Run on iOS simulator
npm run android              # Run on Android emulator
```

### Quality Checks

```bash
npm run typecheck    # TypeScript validation (0 errors)
npm run test         # Jest tests (3,253 passing, 160 suites)
npm run lint         # ESLint + Prettier
npm run lint:fix     # Auto-fix linting issues
npm run test:qa      # Full QA suite (perf + security + regression + stress)
```

---

## Architecture

```
src/
  core/              Pure TypeScript business logic (no React imports)
    exercises/       Exercise validation, 5-dimensional scoring
    music/           Music theory (notes, scales, chords, intervals)
    progression/     XP calculation, level unlocks, streak tracking
    achievements/    Achievement definitions and checking
    curriculum/      SkillTree (120 nodes), CurriculumEngine, WeakSpotDetector, DifficultyEngine
    abilities/       AbilityEngine — applies cat abilities to exercise config
    songs/           Song types, ABC parser, mastery calculation
    challenges/      Daily/weekly/monthly challenge generation
    rewards/         Chest loot system (common/rare/epic/legendary)
    ranking/         Ranked seasons, MMR, battle pass config
  audio/             Audio engine (JSI Web Audio + Expo fallback factory)
    SoundManager     UI sound effects + haptic feedback mapping
  input/             MIDI + Microphone + Touch input handling
    MidiInput        Hardware MIDI via Web MIDI API
    PitchDetector    YIN monophonic pitch detection
    PolyphonicDetector  ONNX Basic Pitch polyphonic detection
    InputManager     Unified factory (MIDI > Mic > Touch)
  hooks/             React hooks (useExercisePlayback, etc.)
  stores/            Zustand state management (17 stores)
  screens/           26 screen components
    ExercisePlayer/  Core exercise experience (scoring + completion + coaching)
  components/        Reusable UI
    Keyboard/        Touch piano (dynamic range, split keyboard, smart zooming)
    PianoRoll/       Vertical falling-note display (Synthesia-style)
    Mascot/          Composable SVG cat avatars (12 cats, 8 moods, Reanimated poses)
    transitions/     EvolutionReveal, ExerciseCard, LessonComplete, AchievementToast
    common/          GameCard, ComboMeter, ComboGlow, ScoreRing, PressableScale
    arena/           RankHeroCard, LeaguePills, ActivityFeed (competitive UI)
  navigation/        React Navigation setup (stack + bottom tabs + custom tab bar)
  services/          External integrations
    firebase/        Auth, Firestore sync, social, leagues, guilds, referrals
    ai/              Gemini coaching (GeminiCoach, CoachingService, VoiceCoachingService)
    tts/             ElevenLabs (primary) + expo-speech (fallback), per-cat voice config
    monitoring/      Sentry + PostHog unified monitoring
    FreePlayAnalyzer Key detection (48 scales) + drill generation
    demoPlayback     Visual-only note demonstration
    notificationService  Local notifications (daily reminders, streak alerts)
  content/           Exercise loader, cat dialogue (12 cats x 40+ msgs), offline coaching templates
  theme/             Design tokens (colors, gradients, rarity, combo tiers, animation config)
  data/              Static data (accessories, cat profiles)

content/
  exercises/         JSON exercise definitions (50 lessons, 599 exercises)
  lessons/           Lesson metadata and sequencing

scripts/
  batch-generate-exercises.ts   Gemini-powered batch exercise generator
  generate-content-registry.ts  Metro-compatible lazy-loading code-gen
  perf-benchmark.ts             Content loading performance benchmarks
  validate-exercise.ts          Exercise JSON validator
  generate-songs.ts             Batch Gemini song generation
  import-thesession.ts          TheSession.org folk tune importer
  import-pdmx.py                music21 corpus importer (classical)

firebase/
  functions/         Cloud Functions (12 functions, nodejs22, us-central1)
  firestore.rules    Security rules for all collections
  firestore.indexes  Composite indexes for queries
```

**Design principles:**
1. Audio code lives in native modules via JSI -- never process audio buffers in JS
2. Business logic is pure TypeScript in `/src/core/` -- testable without React
3. Offline-first -- core loop works without network
4. Exercise definitions are JSON -- content is data, not code
5. Singleton audio engine persists across screen navigations
6. AI is the teacher -- curriculum adapts from Day 1 based on learner profile

---

## Scoring System

Exercises are scored on five weighted dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Accuracy | 35% | Correct notes played |
| Timing | 30% | Per-note ms offset from expected beat position |
| Completeness | 10% | Percentage of expected notes covered |
| Extra Notes | 10% | Penalty for wrong/extra notes played |
| Duration | 15% | Note hold accuracy |

Input-specific latency compensation: MIDI 0ms, Touch 20ms, Mic (mono) 100ms, Mic (poly) 120ms. Mic input receives 1.5x timing tolerance multiplier.

Stars awarded at configurable thresholds (typically 70/85/95). XP earned: 10 base + 10/star + 25 first-completion + 20 perfect bonus.

---

## Cat Characters

12 cats (3 starters + 8 gem-purchasable + 1 legendary):

| Cat | Tier | Personality | Signature Ability |
|-----|------|-------------|-------------------|
| Mini Meowww | Starter | Tiny but Mighty | Precision Focus |
| Jazzy | Starter | Cool & Smooth | Tempo Flex |
| Luna | Starter | Mysterious | Moonlight Mode |
| Biscuit | Common | Cozy & Warm | Warm-Up Boost |
| Ballymakawww | Common | Irish Charmer | Replay Mastery |
| Aria | Common | Elegant | Perfect Pitch |
| Tempo | Common | Hyperactive | Speed Demon |
| Professor Whiskers | Rare | Scholarly | Study Streak |
| Shibu | Rare | Zen | Patience Mode |
| Bella | Epic | Fashionista | Beat Drop |
| Maestro | Epic | Distinguished | Conductor's Baton |
| Chonky Monke | Legendary | Absolute Unit | Combo Shield |

Each cat evolves through 4 stages (Baby → Teen → Adult → Master) with XP thresholds. Evolution unlocks new abilities and visual changes. Each cat has a unique ElevenLabs neural voice for coaching. 48 accessories available in the Cat Studio shop.

---

## Development Status

| Phase | Name | Status |
|-------|------|--------|
| 1-4 | Core Loop, Gamification, Auth, UI Overhaul | Complete |
| 5 | Adaptive Learning Revamp | Complete |
| 6 | Avatar Evolution & Gamification | Complete |
| 7 | Game Feel & Polish + UI Revamp | Complete |
| 8 | Audio Input (Mic + Polyphonic Detection) | Complete |
| 9 | Music Library (582 songs) | Complete |
| 10 | Arcade Concert Hall | Complete |
| 11 | QA + Launch Prep | Complete |
| 12 | Foundation Cleanup | Complete |
| 13 | Content Explosion (599 exercises, 50 lessons, 120 skills) | Complete |
| 14 | Social Revamp (Leagues, Guilds, Battle Pass, Referrals) | Complete |
| **15** | **Cat Progression + Cat Studio** | **Planning** |
| 16 | Onboarding & First Session | Planned |
| 17 | UI/UX Revamp + Accessibility | Planned |
| 18 | Retention & Re-engagement | Planned |
| 19 | Analytics & Monitoring (Sentry + PostHog) | Complete |
| 20 | Hardening & Performance | Planned |
| 21-23 | Web, Monetization, App Store Launch | Planned |

**Codebase health:** 0 TypeScript errors, 160 test suites, 3,253 tests passing, 429 source files, ~140K lines

See [UNIFIED-PLAN.md](docs/plans/UNIFIED-PLAN.md) for the full roadmap and phase details.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Knowledge Base](docs/KNOWLEDGE-BASE.md) | Comprehensive reference for the entire app — architecture, decisions, systems |
| [CLAUDE.md](CLAUDE.md) | Development conventions and AI assistant guide |
| [PRD](docs/PRD.md) | Product Requirements Document |
| [Design System](docs/design-system.md) | Design tokens, visual standards, component inventory |
| [Unified Plan](docs/plans/UNIFIED-PLAN.md) | Unified roadmap — single source of truth for all phases |
| [QA Test Plan](docs/QA-TEST-PLAN.md) | Test infrastructure and strategy |
| [Manual Testing Playbook](docs/MANUAL-TESTING-PLAYBOOK.md) | Comprehensive manual testing checklist for all features |
| [Architecture](agent_docs/architecture.md) | System design and data flow diagrams |
| [Audio Pipeline](agent_docs/audio-pipeline.md) | Latency budgets, playback/detection paths |
| [Exercise Format](agent_docs/exercise-format.md) | Exercise JSON schema and examples |
| [Scoring Algorithm](agent_docs/scoring-algorithm.md) | Timing curves, weights, note matching |
| [MIDI Integration](agent_docs/midi-integration.md) | MIDI device handling and testing |
| [AI Coaching](agent_docs/ai-coaching.md) | Gemini coaching integration and prompts |
| [Stabilization Report](agent_docs/stabilization-report.md) | Full changelog of all fixes |

---

## License

Proprietary. All rights reserved.

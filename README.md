# Purrrfect Keys

> AI-powered piano learning app with real-time feedback, adaptive curriculum, MIDI support, and collectible cat companions that evolve as you learn.

[![CI](https://github.com/UT07/purrrfectKeys/actions/workflows/ci.yml/badge.svg)](https://github.com/UT07/purrrfectKeys/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React_Native-0.76-61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_SDK-52-000020)](https://expo.dev/)
[![Tests](https://img.shields.io/badge/Tests-2722%20passing-brightgreen)]()

---

## Overview

Purrrfect Keys is a Duolingo-style piano learning app that combines real-time performance analysis with AI-driven adaptive learning. An AI curriculum engine personalizes every practice session from Day 1, scoring your playing across five dimensions and delivering coaching through collectible cat companions that evolve as you improve.

**What makes it different:**
- AI curriculum engine that builds a personalized learning path from your first note
- 100-node skill tree with 15 tiers spanning a full year of daily practice
- JSI-based audio engine with <20ms touch-to-sound latency
- 5-dimensional scoring (accuracy, timing, completeness, precision, duration)
- 124-song music library across 6 genres with mastery progression
- Pokemon-style cat evolution with gameplay-relevant abilities
- Weekly leagues, friend challenges, and shareable achievement cards
- Arcade-style combo escalation with sound effects and haptic feedback
- ElevenLabs neural voice coaching with 13 unique per-cat voices
- Offline-first -- core learning loop works without network

---

## Features

### Core Experience
- 6 structured lessons with 30 exercises (beginner to intermediate)
- AI-generated exercises for tiers 7-15 via Gemini Flash
- Real-time vertical piano roll with falling notes (Synthesia-style)
- Touch keyboard with haptic feedback and latency compensation
- MIDI keyboard support (USB + Bluetooth)
- Microphone input with YIN pitch detection and ONNX polyphonic detection
- Portrait exercise player with dynamic note/keyboard range
- Free play mode with post-play key/scale analysis and drill generation
- Demo playback mode with visual-only note demonstration

### Music Library (124 Songs)
- **6 genres:** Pop, Classical, Folk, Film/TV, Game, Holiday
- **Content sources:** 37 AI-generated (Gemini), 50 folk tunes (TheSession.org), 38 classical (Beethoven, Mozart, Bach, Haydn)
- **ABC notation** parsing via abcjs with section-based playback
- **Mastery tiers:** None → Bronze (70+) → Silver (80+) → Gold (90+) → Platinum (95+)
- **Gem rewards** per mastery tier (10/20/40/75 gems)
- Section-by-section playback with melody/accompaniment layer toggle

### Adaptive Learning
- **SkillTree** -- DAG of 100 skill nodes across 15 tiers, 12 categories
- **CurriculumEngine** -- AI session planner with 4 session types (new-material, review, challenge, mixed)
- **Skill Decay** -- 14-day half-life model; stale skills trigger automatic review sessions
- **Multi-Session Mastery** -- harder skills require 3-5 successful completions
- **DailySessionScreen** -- "Today's Practice" with AI-picked warm-up/lesson/challenge
- **WeakSpotDetector** -- pattern-based detection (note/transition/timing/hand weaknesses)
- **DifficultyEngine** -- progressive difficulty: 5 BPM per mastered exercise
- **FreePlayAnalyzer** -- detects key/scale from free play across all 48 major/minor keys

### Audio Input
- **MIDI keyboards** -- USB + Bluetooth via @motiz88/react-native-midi (Web MIDI API)
- **Monophonic mic** -- YIN pitch detection (C++ TurboModule, ~120ms latency)
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
- **Gem Currency** -- earned from scores, streaks, achievements; spent to unlock cats
- **32+ Achievements** across 6 categories
- **Daily/Weekly/Monthly Challenges** -- deterministic date-based with gem + XP rewards

### Social & Leaderboards
- **Friend codes** -- 6-character alphanumeric codes for adding friends
- **Weekly leagues** -- 30-person groups per tier (Bronze/Silver/Gold/Diamond)
- **Activity feed** -- level-ups, evolutions, achievements from friends
- **Friend challenges** -- head-to-head exercise competitions
- **ShareCard** -- shareable score/streak/evolution image cards via react-native-view-shot
- **Local notifications** -- daily practice reminders, streak-at-risk alerts

### Infrastructure
- Firebase Authentication (anonymous, email, Google Sign-In, Apple Sign-In)
- 9 Cloud Functions (Gemini AI exercises/songs/coaching, account deletion, progress sync)
- Cross-device sync with offline queue, Firestore pull/merge, conflict resolution
- GDPR-compliant account deletion (Cloud Function + client-side fallback)
- Progress persistence via AsyncStorage with debounced saves
- PostHog analytics integration
- GitHub Actions CI/CD (typecheck + lint + test on push, EAS Build on master)

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
| Analytics | PostHog |
| Testing | Jest + React Testing Library (2,722 tests, 129 suites) |
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
npm run test         # Jest tests (2,722 passing, 129 suites)
npm run lint         # ESLint + Prettier
npm run lint:fix     # Auto-fix linting issues
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
    curriculum/      SkillTree (100 nodes), CurriculumEngine, WeakSpotDetector, DifficultyEngine
    abilities/       AbilityEngine — applies cat abilities to exercise config
    songs/           Song types, ABC parser, mastery calculation
    challenges/      Daily/weekly/monthly challenge generation
    rewards/         Chest loot system (common/rare/epic/legendary)
  audio/             Audio engine (JSI Web Audio + Expo fallback factory)
    SoundManager     UI sound effects + haptic feedback mapping
  input/             MIDI + Microphone + Touch input handling
    MidiInput        Hardware MIDI via Web MIDI API
    PitchDetector    YIN monophonic pitch detection
    PolyphonicDetector  ONNX Basic Pitch polyphonic detection
    InputManager     Unified factory (MIDI > Mic > Touch)
  hooks/             React hooks (useExercisePlayback, etc.)
  stores/            Zustand state management (15 stores)
    exerciseStore    Current exercise session
    progressStore    XP, levels, streaks, lesson progress
    settingsStore    User preferences, selected cat
    learnerProfile   Per-note accuracy, skills, tempo range, skill decay
    catEvolution     Evolution stages, XP per cat, abilities
    gemStore         Gem balance, earn/spend transactions
    achievementStore Achievement tracking and unlock checking
    authStore        Firebase auth state
    songStore        Song browsing, mastery, filters
    socialStore      Friends, activity feed, challenges
    leagueStore      Weekly league membership + standings
  screens/           20+ screen components
    ExercisePlayer/  Core exercise experience (scoring + completion + coaching)
  components/        Reusable UI
    Keyboard/        Touch piano (dynamic range, split keyboard, smart zooming)
    PianoRoll/       Vertical falling-note display (Synthesia-style)
    Mascot/          Composable SVG cat avatars (12 cats, 8 moods, Reanimated poses)
    transitions/     EvolutionReveal, ExerciseCard, LessonComplete, AchievementToast
    common/          GameCard, ComboMeter, ComboGlow, ScoreRing, PressableScale
  navigation/        React Navigation setup (stack + bottom tabs + custom tab bar)
  services/          External integrations
    firebase/        Auth, Firestore sync, social, leagues, data migration
    ai/              Gemini coaching (GeminiCoach, CoachingService, VoiceCoachingService)
    tts/             ElevenLabs (primary) + expo-speech (fallback), per-cat voice config
    FreePlayAnalyzer Key detection (48 scales) + drill generation
    songService      Firestore CRUD for songs + per-user mastery
    demoPlayback     Visual-only note demonstration
    notificationService  Local notifications (daily reminders, streak alerts)
  content/           Exercise loader, cat dialogue (12 cats x 40+ msgs), offline coaching templates
  theme/             Design tokens (colors, gradients, rarity, combo tiers, animation config)

content/
  exercises/         JSON exercise definitions (6 lessons, 30 exercises)
  lessons/           Lesson metadata and sequencing

firebase/
  functions/         Cloud Functions (Gemini AI, account deletion, progress sync)
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

| Cat | Type | Personality | Signature Ability |
|-----|------|-------------|-------------------|
| Mini Meowww | Starter | Tiny but Mighty | Precision Focus |
| Jazzy | Starter | Cool & Smooth | Tempo Flex |
| Luna | Starter | Mysterious | Moonlight Mode |
| Biscuit | 500 gems | Cozy & Warm | Warm-Up Boost |
| Ballymakawww | 750 gems | Irish Charmer | Replay Mastery |
| Aria | 1000 gems | Elegant | Perfect Pitch |
| Tempo | 1000 gems | Hyperactive | Speed Demon |
| Professor Whiskers | 1500 gems | Scholarly | Study Streak |
| Shibu | 1500 gems | Zen | Patience Mode |
| Bella | 2000 gems | Fashionista | Beat Drop |
| Maestro | 2000 gems | Distinguished | Conductor's Baton |
| Chonky Monke | Legendary | Absolute Unit | Combo Shield |

Each cat evolves through 4 stages (Baby → Teen → Adult → Master) with XP thresholds (0/500/2000/5000). Evolution unlocks new abilities and visual changes. Each cat has a unique ElevenLabs neural voice for coaching.

---

## Development Status

| Phase | Name | Status |
|-------|------|--------|
| 1-4 | Core Loop, Gamification, Auth, UI Overhaul | Complete |
| 5 | Adaptive Learning Revamp | Complete |
| 6 | Avatar Evolution & Gamification | Complete |
| 7 | Game Feel & Polish + UI Revamp | Complete |
| 8 | Audio Input (Mic + Polyphonic Detection) | Complete |
| 9 | Music Library (124 songs) | Complete |
| 10 | Arcade Concert Hall | Complete |
| 10.5 | Social & Leaderboards | Complete |
| **11** | **QA + Launch** | **In Progress** |

**Codebase health:** 0 TypeScript errors, 129 test suites, 2,722 tests passing

See [UNIFIED-PLAN.md](docs/plans/UNIFIED-PLAN.md) for the full roadmap and phase details.

---

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Development conventions and AI assistant guide |
| [docs/PRD.md](docs/PRD.md) | Product Requirements Document |
| [docs/design-system.md](docs/design-system.md) | Design system and visual standards |
| [docs/plans/UNIFIED-PLAN.md](docs/plans/UNIFIED-PLAN.md) | Unified roadmap (single source of truth) |
| [agent_docs/architecture.md](agent_docs/architecture.md) | System design and data flow |
| [agent_docs/audio-pipeline.md](agent_docs/audio-pipeline.md) | Audio latency budgets |
| [agent_docs/exercise-format.md](agent_docs/exercise-format.md) | Exercise JSON schema |
| [agent_docs/scoring-algorithm.md](agent_docs/scoring-algorithm.md) | Scoring logic details |
| [agent_docs/midi-integration.md](agent_docs/midi-integration.md) | MIDI device handling |
| [agent_docs/ai-coaching.md](agent_docs/ai-coaching.md) | Gemini coaching integration |
| [agent_docs/stabilization-report.md](agent_docs/stabilization-report.md) | Full changelog |

---

## License

Proprietary. All rights reserved.

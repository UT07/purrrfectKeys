# Purrrfect Keys

> AI-powered piano learning app with real-time feedback, adaptive curriculum, MIDI support, and collectible cat companions.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React_Native-0.76-61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo_SDK-52-000020)](https://expo.dev/)
[![Tests](https://img.shields.io/badge/Tests-1991%20passing-brightgreen)]()

---

## Overview

Purrrfect Keys is a Duolingo-style piano learning app that combines real-time performance analysis with AI-driven adaptive learning. An AI curriculum engine personalizes every practice session from Day 1, scoring your playing across five dimensions and delivering coaching through collectible cat companions that evolve as you improve.

**What makes it different:**
- AI curriculum engine that builds a personalized learning path from your first note
- 100-node skill tree with 15 tiers spanning a full year of daily practice
- JSI-based audio engine with <20ms touch-to-sound latency
- 5-dimensional scoring (accuracy, timing, completeness, precision, duration)
- Pokemon-style cat evolution with gameplay-relevant abilities
- Dual currency system (XP for progression, Gems for unlocking)
- Voice coaching with per-cat personality via TTS
- Offline-first -- core learning loop works without network
- Free play mode with real-time key detection and AI drill generation

---

## Features

### Core Experience
- 6 structured lessons with 30 exercises (beginner to intermediate)
- AI-generated exercises for tiers 7-15 via Gemini Flash (no static JSON needed)
- Real-time vertical piano roll with falling notes (Synthesia-style)
- Touch keyboard with haptic feedback and latency compensation
- MIDI keyboard support (USB + Bluetooth)
- Portrait exercise player with dynamic note/keyboard range
- Free play mode with post-play key/scale analysis and "Generate Drill" CTA
- Demo playback mode with visual-only note demonstration

### Adaptive Learning (Phase 5)
- **SkillTree** -- DAG of 100 skill nodes across 15 tiers, 12 categories
- **CurriculumEngine** -- AI session planner with 4 session types (new-material, review, challenge, mixed)
- **Skill Decay** -- 14-day half-life model; stale skills trigger automatic review sessions
- **Multi-Session Mastery** -- harder skills require 3-5 successful completions
- **DailySessionScreen** -- "Today's Practice" with AI-picked warm-up/lesson/challenge
- **WeakSpotDetector** -- pattern-based detection (note/transition/timing/hand weaknesses)
- **DifficultyEngine** -- progressive difficulty: 5 BPM per mastered exercise
- **FreePlayAnalyzer** -- detects key/scale from free play across all 24 major/minor keys with tonic weighting

### Voice Coaching
- Gemini 2.0 Flash generates personalized feedback from learner profile + score details
- Per-cat voice settings via expo-speech TTS (8 cats x pitch/rate/language)
- 100+ offline coaching templates (~15 per category) for Gemini fallback
- Pre-exercise tips and post-exercise feedback with specific note/beat references
- Content-aware cache (2-hour TTL) for response variety

### Avatar Evolution & Gamification (Phase 6)
- **Cat Evolution** -- 4 stages (Baby → Teen → Adult → Master) with XP thresholds
- **12 Cat Abilities** -- gameplay-relevant effects (wider timing, combo shield, XP boost, etc.)
- **Gem Currency** -- earned from high scores, streaks, achievements; spent to unlock cats
- **Evolution Reveal** -- Pokemon-style full-screen animation on stage transitions
- **Cat Collection Screen** -- gallery with per-cat evolution progress, ability codex
- **Onboarding Cat Selection** -- pick 1 of 3 starters, others locked with gem prices
- **32+ Achievements** across 6 categories
- **Daily Challenge** -- surprise exercise with 2x XP reward
- 8 collectible cat characters with backstories, moods, and personality-driven dialogue

### Infrastructure
- Firebase Authentication (anonymous, email, Google Sign-In, Apple Sign-In)
- Cross-device sync with offline queue, Firestore pull/merge, conflict resolution
- Progress persistence via AsyncStorage with debounced saves
- PostHog analytics integration
- Detox E2E test suite (15 suites)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo SDK 52+) |
| Language | TypeScript 5.x (strict mode) |
| Audio | react-native-audio-api via JSI (<1ms bridge overhead) |
| Audio Fallback | expo-av with round-robin voice pools (50 pre-loaded sounds) |
| State | Zustand v5 with AsyncStorage persistence |
| Navigation | React Navigation 6 (native stack + bottom tabs) |
| Animation | react-native-reanimated 3 |
| Backend | Firebase (Auth, Firestore, Cloud Functions) |
| AI | Google Gemini 2.0 Flash |
| TTS | expo-speech (per-cat voice config) |
| Analytics | PostHog |
| Testing | Jest + React Testing Library (1,991 tests, 84 suites) |
| E2E | Detox (15 suites) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npx expo`)
- iOS Simulator or Android Emulator
- (Optional) USB/Bluetooth MIDI keyboard

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
POSTHOG_API_KEY=your_posthog_key
```

### Development

```bash
npx expo start --port 8081   # Start dev server
npm run ios                   # Run on iOS simulator
npm run android               # Run on Android emulator
```

### Quality Checks

```bash
npm run typecheck    # TypeScript validation (0 errors)
npm run test         # Jest tests (1,991 passing, 84 suites)
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
  audio/             Audio engine (JSI Web Audio + Expo fallback factory)
  input/             MIDI device handling + dev keyboard MIDI simulator
  hooks/             React hooks (useExercisePlayback, etc.)
  stores/            Zustand state management (12 stores)
    exerciseStore    Current exercise session
    progressStore    XP, levels, streaks, lesson progress
    settingsStore    User preferences, selected cat
    learnerProfile   Per-note accuracy, skills, tempo range, skill decay
    catEvolution     Evolution stages, XP per cat, abilities
    gemStore         Gem balance, earn/spend transactions
    achievementStore Achievement tracking and unlock checking
    authStore        Firebase auth state
  screens/           15 screen components
    ExercisePlayer/  Core exercise experience (scoring + completion + coaching)
  components/        Reusable UI
    Keyboard/        Touch piano (dynamic range, split keyboard, smart zooming)
    PianoRoll/       Vertical falling-note display (Synthesia-style)
    Mascot/          Cat avatars (SVG pixel art, 5 moods, evolution stages)
    transitions/     EvolutionReveal, ExerciseCard, LessonComplete, AchievementToast
    common/          ScoreRing, PressableScale, buttons, cards
    GemEarnPopup     Gem reward animation
  navigation/        React Navigation setup (stack + bottom tabs)
  services/          External integrations
    firebase/        Auth, Firestore sync, data migration
    ai/              Gemini coaching (GeminiCoach, CoachingService, VoiceCoachingService)
    tts/             Text-to-speech (expo-speech, per-cat voice config)
    FreePlayAnalyzer Key detection (24 scales) + drill generation
    geminiExercise   AI exercise generation via Gemini Flash
    demoPlayback     Visual-only note demonstration
  content/           Exercise loader, cat dialogue (8 cats x 40 msgs), offline coaching templates
  theme/             Design tokens (colors, gradients, spacing, animation config)

content/
  exercises/         JSON exercise definitions (6 lessons, 30 exercises)
  lessons/           Lesson metadata and sequencing
```

**Design principles:**
1. Audio code lives in native modules via JSI — never process audio buffers in JS
2. Business logic is pure TypeScript in `/src/core/` — testable without React
3. Offline-first — core loop works without network
4. Exercise definitions are JSON — content is data, not code
5. Singleton audio engine persists across screen navigations
6. AI is the teacher — curriculum adapts from Day 1 based on learner profile

---

## Scoring System

Exercises are scored on five weighted dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Accuracy | 40% | Correct notes played |
| Timing | 35% | Per-note ms offset from expected beat position |
| Completeness | 15% | Percentage of expected notes covered |
| Extra Notes | 10% | Penalty for wrong/extra notes played |
| Duration | bonus | Note hold accuracy (optional, for sustained exercises) |

Touch input receives 20ms latency compensation and minimum 60ms/160ms timing tolerances.

Stars awarded at configurable thresholds (typically 60/80/95). XP earned: 10 base + 10/star + 25 first-completion + 20 perfect bonus.

---

## Cat Characters

12 cats (3 starters + 9 unlockable via gems):

| Cat | Type | Personality | Signature Ability |
|-----|------|-------------|-------------------|
| Mini Meowww | Starter | Tiny but Mighty | Precision Focus |
| Jazzy | Starter | Cool & Smooth | Tempo Flex |
| Chonky Monke | Starter | Absolute Unit | Combo Shield |
| Luna | 500 gems | Mysterious | Moonlight Mode |
| Biscuit | 500 gems | Cozy & Warm | Warm-Up Boost |
| Vinyl | 750 gems | Hipster | Replay Mastery |
| Aria | 1000 gems | Elegant | Perfect Pitch |
| Tempo | 1000 gems | Hyperactive | Speed Demon |
| Professor Whiskers | 1500 gems | Scholarly | Study Streak |
| Neko | 1500 gems | Zen | Patience Mode |
| DJ Scratch | 2000 gems | Party Animal | Beat Drop |
| Maestro | 2000 gems | Distinguished | Conductor's Baton |

Each cat evolves through 4 stages (Baby → Teen → Adult → Master) with XP thresholds (0/500/2000/5000). Evolution unlocks new abilities and visual changes.

---

## Development Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Core Loop | Complete |
| 2 | Gamification & Polish | Complete |
| 3 | Firebase Auth + Sync | Complete |
| 4+ | Adaptive Learning + UI Overhaul | Complete (22/22 tasks) |
| QA | Bug Fix Sprint | Complete (10+ issues) |
| **5** | **Adaptive Learning Revamp** | **Complete (18/18 tasks)** |
| **5.2** | **365-Day Curriculum Expansion** | **Complete** |
| **6** | **Avatar Evolution & Gamification** | **Complete (stores, types, UI, abilities)** |
| **6.5** | **AI Coach Fix + Wiring + FreePlay Fix** | **Complete (10 coach bugs, key detection, wiring)** |
| 7 | Game Feel & Polish + UI Revamp | Next |
| 8 | Audio Input (Mic) | R&D parallel |
| 9 | Social & Leaderboards | Planned |
| 10 | QA + Launch | Planned |

**Codebase health:** 0 TypeScript errors, 84 test suites, 1,991 tests passing

**Target launch:** June 8, 2026. See [16-week roadmap](docs/plans/2026-02-17-16-week-roadmap.md).

---

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Development conventions and AI assistant guide |
| [docs/PRD.md](docs/PRD.md) | Product Requirements Document |
| [docs/design-system.md](docs/design-system.md) | Design system and visual standards |
| [agent_docs/architecture.md](agent_docs/architecture.md) | System design and data flow |
| [agent_docs/audio-pipeline.md](agent_docs/audio-pipeline.md) | Audio latency budgets |
| [agent_docs/exercise-format.md](agent_docs/exercise-format.md) | Exercise JSON schema |
| [agent_docs/scoring-algorithm.md](agent_docs/scoring-algorithm.md) | Scoring logic details |
| [agent_docs/midi-integration.md](agent_docs/midi-integration.md) | MIDI device handling |
| [agent_docs/ai-coaching.md](agent_docs/ai-coaching.md) | Gemini coaching integration |
| [agent_docs/stabilization-report.md](agent_docs/stabilization-report.md) | Full changelog |
| [docs/plans/2026-02-17-16-week-roadmap.md](docs/plans/2026-02-17-16-week-roadmap.md) | 16-week development roadmap |

---

## License

Proprietary. All rights reserved.

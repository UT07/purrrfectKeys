# Purrrfect Keys — Production Path & Web Expansion Plan

**Created:** March 13, 2026
**Status:** PLANNING (execution post-v1 launch, Phase 0 refactoring after `feat/phase3-content-explosion` merge)
**Author:** Architecture planning session
**Last updated:** March 15, 2026

> **Context:** Expand Purrrfect Keys from a piano learning app to a multi-discipline music education platform. Add a "Music Production" learning path alongside Piano (like Duolingo's multiple languages), plus a web version of the app.

---

## Vision

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PURRRFECT KEYS PLATFORM                        │
│                                                                     │
│   ┌───────────────────┐         ┌───────────────────────────────┐  │
│   │   🎹 PIANO PATH   │         │   🎛️ PRODUCTION PATH          │  │
│   │                   │         │                               │  │
│   │  Learn to play    │         │  Learn to produce             │  │
│   │  MIDI + Mic input │         │  Theory + DAW literacy        │  │
│   │  Real-time scoring│         │  Quiz + Interactive exercises │  │
│   │  Mobile-first     │         │  Mobile + Web                 │  │
│   │                   │         │                               │  │
│   │  100 skill nodes  │         │  ~120 skill nodes             │  │
│   │  40 lessons       │         │  ~50 lessons                  │  │
│   │  499 exercises    │         │  ~600 exercises               │  │
│   └───────────────────┘         └───────────────────────────────┘  │
│                                                                     │
│   Shared: Auth, Cats, Gems, Social, Leaderboards, AI Coaching      │
│   Platform: iOS + Android + Web                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Production Learning Path

### 1.1 What Is It?

A second "language" in the Duolingo model. Users who reach a certain piano proficiency (e.g., Tier 5 / "Scales" mastery) OR who explicitly choose Production during onboarding can access a full music production curriculum covering:

1. **Music Theory for Producers** — Not classical theory, but producer-oriented: chord progressions for beats, scale modes for melodies, song structure (intro/verse/chorus/bridge/outro), rhythm patterns, sampling theory
2. **DAW Literacy (FL Studio)** — The FL Studio interface, channel rack, piano roll, mixer, playlist, automation, plugins (Sytrus, Serum concepts, Gross Beat), rendering/exporting
3. **Sound Design Fundamentals** — Oscillators, filters, envelopes (ADSR), LFOs, effects chains (reverb, delay, compression, EQ, distortion)
4. **Beat Making** — Drum patterns (808s, hi-hats, kicks, snares), trap/hip-hop/EDM patterns, swing/groove, velocity patterns
5. **Arrangement & Mixing** — Track layering, frequency spectrum management, panning, volume automation, gain staging, reference tracks
6. **Genre Studies** — Lo-fi, trap, EDM, R&B, pop production techniques

### 1.2 How It Differs from Piano Path

| Aspect | Piano Path | Production Path |
|--------|-----------|-----------------|
| **Hardware required** | MIDI keyboard or mic | None (optional MIDI for melody/chord input) |
| **Audio engine** | Real-time playback + scoring | Playback-only (examples, A/B comparisons, pattern preview) |
| **Input method** | Play notes in real-time against a clock | Place notes on a grid, adjust sliders, answer questions |
| **Scoring model** | Timing + pitch accuracy (5D scoring) | Pattern accuracy + knowledge correctness + proximity-to-target |
| **Exercise types** | Play, rhythm tap, ear training, etc. | Build (grid), mix (sliders), quiz, identify, arrange, match, label |
| **Visual focus** | Piano keyboard + falling notes | Step sequencer, mixer, EQ curve, arrangement timeline, piano roll (for composing) |
| **Cat integration** | Cat reacts to playing (cheerleader) | Cat explains concepts & gives tips (mentor/tutor) |
| **Metronome** | External click to play along with | None — the DAW grid IS the metronome. BPM selector instead. |
| **Timing tolerance** | ±25-75ms (human performance) | Grid position accuracy (correct step or not) |
| **Theory approach** | Staff notation, key signatures | Piano roll grid, chord charts, frequency spectrum |
| **Web support** | Limited (needs audio input) | Full (no hardware dependency) |

### 1.2.1 What Piano Features DON'T Apply to Production

These features from the Piano path should NOT be carried over:

| Piano Feature | Why It Doesn't Work |
|---|---|
| **Metronome** | The DAW grid IS the rhythm framework. Producers snap to grid, not play to a click. |
| **Timing tolerance (±50ms early/late)** | Everything is grid-quantized. No "early/late" — only correct position or wrong position. |
| **Real-time scoring on subjective tasks** | Mixing/mastering are subjective arts. Can't objectively score a mix. Use A/B reference matching instead. |
| **Finger numbers / hand position** | Production is mouse/controller-based. No physical technique to teach. |
| **Note-by-note progression** | Production thinks in **patterns**, not individual notes. Build element by element (kick → snare → hi-hat → bass). |
| **Staff notation** | Producers use piano roll, never sheet music. Theory via piano roll + frequency charts. |
| **Combo counter (real-time)** | No real-time performance. Combo = consecutive correct answers within an exercise. |

### 1.2.2 What DOES Transfer (Corrected Feature Mapping)

| Piano Feature | Production Equivalent |
|---|---|
| **Salsa Coach (pre-exercise)** | "Let me explain sidechain compression..." — concept introduction |
| **Salsa Coach (post-exercise)** | "Your EQ had too much boost at 2kHz — try cutting instead" |
| **AI Coaching (Gemini)** | Mix analysis feedback, concept clarification, "why this answer is wrong" |
| **Replay/Demo mode** | Watch a beat being built step-by-step on the grid |
| **XP / Levels** | Identical — global XP from both disciplines |
| **Cat Evolution** | Identical — production XP evolves your cats |
| **Gems** | Same earn rates from production exercises |
| **Streaks** | Any learning counts — practice = practice |
| **Daily Session** | "Today: Review 808 tuning → Learn sidechain → Build a lo-fi beat" |
| **Loot Chests** | Same system after lesson completion |
| **Leagues/Social** | Same — XP feeds global leaderboard with discipline badge |
| **Achievements** | Production-specific set + shared cross-discipline |
| **Piano Roll** | We already have one! Producers use piano rolls daily. Interaction flips: "draw what you hear" instead of "play what you see" |
| **Review (skill decay)** | "Review forgotten concepts" — quiz on decayed knowledge |
| **Bonus Drills** | Extra quizzes / mini-builds after exercises |

### 1.3 Unlock Mechanism

Two entry points:
1. **During onboarding** — New step 0: "What do you want to learn?" → Piano / Production / Both
2. **In-app unlock** — After reaching Piano Tier 5 (Scales mastery), a "NEW: Music Production" card appears on HomeScreen. Tapping it opens Production onboarding.

Users can switch between paths freely (like switching languages in Duolingo). Progress is independent per path.

### 1.4 Production Skill Tree (~150 Nodes, 15 Tiers)

The skill tree follows the actual producer workflow: foundation → rhythm → melody → sound → arrangement → mix → master → genre specialization.

```
FOUNDATION (Tiers 1-2)
─────────────────────
Tier 1:  Production Basics
         - What is a DAW, audio vs MIDI, BPM, time signatures
         - File formats (WAV, MP3, FLAC, MIDI)
         - Mono vs stereo, sample rate, bit depth
         - The producer workflow overview

Tier 2:  DAW Literacy (FL Studio)
         - Channel Rack, Piano Roll, Playlist, Browser, Mixer
         - Creating patterns, placing on timeline
         - Basic keyboard shortcuts
         - Saving, exporting, project organization

RHYTHM (Tiers 3-4)
──────────────────
Tier 3:  Drum Programming Basics
         - Four-on-the-floor kick pattern
         - Backbeat snare (2 and 4)
         - Hi-hat subdivisions (8ths, 16ths)
         - Velocity and dynamics (ghost notes, accents)
         - Quantization: on-grid vs off-grid

Tier 4:  Advanced Rhythm
         - Swing and groove (55-65% shuffle)
         - Hi-hat rolls (32nds, triplets)
         - Drum layering (kick: body + click + sub)
         - Breakbeat chopping and re-sequencing
         - Polyrhythms and syncopation
         - The dembow rhythm (reggaeton/Latin)

MELODY & HARMONY (Tiers 5-6)
────────────────────────────
Tier 5:  Melody for Producers
         - Scales in the piano roll (major, minor, pentatonic)
         - Writing melodies: stepwise motion, leaps, repetition
         - Counter-melodies and arpeggios
         - Using scale lock / scale highlighting in DAW

Tier 6:  Chords & Harmony
         - Triads and inversions (on piano roll grid, NOT staff)
         - Common progressions (I-V-vi-IV, ii-V-I, etc.)
         - Extended chords for R&B/neo-soul (7ths, 9ths, 13ths)
         - Chord voicing and spacing
         - Key and mode selection per genre

BASS & LOW END (Tier 7)
──────────────────────
Tier 7:  Bass Design
         - 808 bass: tuning, decay, glide/portamento
         - Sub bass: mono below 200Hz, sidechain to kick
         - Reese bass (detuned saws — DnB/dubstep)
         - Acid bass (TB-303 filter sweeps — acid techno)
         - Bass-kick relationship: when to layer vs sidechain

SOUND DESIGN (Tiers 8-9)
────────────────────────
Tier 8:  Synthesis Fundamentals
         - Oscillators: sine, saw, square, triangle, noise
         - Filters: low-pass, high-pass, band-pass, resonance
         - Envelopes: ADSR (amplitude + filter envelopes)
         - LFOs: modulating pitch, filter, volume over time
         - Basic patch creation (pad, lead, pluck, bass)

Tier 9:  Advanced Sound Design
         - FM synthesis (carriers, modulators, ratios)
         - Wavetable synthesis (Serum-style)
         - Sampling: chopping, time-stretching, pitch-shifting
         - Layering and resampling
         - Sound design for dubstep/riddim (growls, wobbles)
         - Granular synthesis (ambient/experimental)

ARRANGEMENT (Tier 10)
────────────────────
Tier 10: Song Structure & Arrangement
         - Sections: intro, verse, pre-chorus, chorus/drop, bridge, breakdown, outro
         - Genre-specific structures (pop: 3:30, EDM: 6:00, hip-hop: 3:00)
         - Addition and subtraction: building/stripping energy
         - Transitions: risers, sweeps, crashes, fills, silence
         - Automation as an arrangement tool (filter sweeps, volume rides)
         - The "8-bar loop syndrome" and how to break out of it

MIXING (Tiers 11-12)
───────────────────
Tier 11: Mixing Fundamentals
         - Gain staging (-18 to -12 dBFS per channel)
         - Level balancing (start with kick + bass)
         - Panning: stereo field placement (kick/bass/vocal = center)
         - EQ: cutting vs boosting, high-pass filtering non-bass elements
         - Compression: attack, release, ratio, threshold, makeup gain
         - Sends vs inserts (shared reverb/delay buses)

Tier 12: Advanced Mixing
         - Sidechain compression (kick ducking bass/pads)
         - Parallel compression (NY compression)
         - Reverb types and usage (room, hall, plate, spring)
         - Delay types (stereo, ping-pong, dotted 1/8th)
         - Saturation and harmonic distortion
         - Automation: volume rides, effect throws, parameter movement
         - Reference track comparison workflow
         - Mixing for different playback systems

MASTERING & RELEASE (Tier 13)
────────────────────────────
Tier 13: Mastering & Distribution
         - Mastering chain: EQ → multiband comp → limiter
         - LUFS targets (-14 Spotify, -16 Apple Music)
         - Stereo width and imaging
         - Checking on multiple systems (monitors, headphones, phone)
         - Exporting: WAV vs MP3, stems, dithering
         - Distribution (DistroKid, TuneCore) and metadata

GENRE SPECIALIZATION (Tiers 14-15)
─────────────────────────────────
Tier 14: Genre Production — Hip Hop & Pop
         - Boom bap (sample chopping, MPC workflow, swing)
         - Trap (808 glide, hi-hat rolls, half-time feel)
         - Drill (UK/Chicago/NY: sliding 808s, bounce kicks)
         - Lo-fi hip hop (vinyl crackle, bitcrushing, jazz chords)
         - Phonk (distorted 808, cowbell melodies, Memphis chops)
         - Pop production (Max Martin rules: chorus in 50s, one new element per section)
         - R&B/Neo-soul (Rhodes, extended chords, warm saturation)

Tier 15: Genre Production — Electronic & Global
         - House (deep/tech/progressive: four-on-the-floor, groove)
         - Techno (minimal/Detroit/acid/industrial/melodic)
         - Trance (progressive/psytrance/uplifting: supersaws, long builds)
         - Drum & Bass (breakbeat chopping, Reese bass, 170+ BPM)
         - Dubstep/Riddim (wobble bass, Serum sound design, half-time)
         - Future Bass (supersaw chords, vocal chops, LFO wobble)
         - Afrobeats/Amapiano (polyrhythms, log drum bass)
         - Reggaeton (dembow rhythm, rolling 808)
         - UK Garage/2-step (bounce kicks, vocal chops, shuffle)
         - Ambient/Downtempo (granular, generative, field recordings)
         - Hardstyle (distorted kick design, reverse bass)
```

### 1.5 Production Exercise Types

These are the NEW exercise types needed (none overlap with Piano's 6 types):

| Type | Interaction | Scoring | Example |
|------|------------|---------|---------|
| **quiz** | Multiple choice (4 options) | Correct/incorrect + speed bonus | "Which waveform is this?" [plays audio] |
| **identify** | Listen + classify | Accuracy | "Is this EQ cutting or boosting the high end?" |
| **arrange** | Drag & drop blocks into order | Correct sequence | "Arrange these sections: Intro, Verse, Chorus, Bridge, Outro" |
| **match** | Connect pairs | All correct = pass | "Match each effect to its description" (Reverb↔Space, Compression↔Dynamics) |
| **build** | Step sequencer / grid interaction | Pattern accuracy | "Recreate this drum pattern" [shows grid, user taps cells] |
| **mix** | Slider/knob adjustment | Proximity to target | "Set the EQ to match this frequency curve" |
| **spot-the-difference** | A/B audio comparison | Identify the change | "Which version has reverb added?" |
| **fill-in-the-blank** | Complete a sequence/chain | Correctness | "The signal chain is: Oscillator → [?] → Amplifier → Output" (answer: Filter) |
| **label** | Tap regions on a screenshot | Accuracy | "Label these parts of the FL Studio mixer" |

### 1.6 Production Content Structure

> **IMPORTANT:** Do NOT rename or move existing `content/` directories. The piano content
> uses 499 static `require()` paths in ContentLoaderRegistry — renaming would break all of them.
> Instead, add the production-path directory alongside the existing structure.

```
content/
├── exercises/               # EXISTING — Piano exercises (DO NOT RENAME)
│   ├── lesson-01/
│   ├── ...
│   └── lesson-40/
├── lessons/                 # EXISTING — Piano lesson manifests (DO NOT RENAME)
├── exercise-index.json      # EXISTING — Piano exercise index
│
└── production-path/         # NEW — Production content lives here
    ├── lessons/
    │   ├── prod-lesson-01.json  (Production Basics)
    │   ├── prod-lesson-02.json  (FL Studio Tour)
    │   ├── ...
    │   └── prod-lesson-50.json
    ├── exercises/
    │   ├── prod-lesson-01/
    │   │   ├── exercise-01.json  (quiz: "What is a DAW?")
    │   │   ├── exercise-02.json  (match: audio formats)
    │   │   └── ...
    │   └── prod-lesson-50/
    ├── exercise-index.json  # Separate index for production exercises
    └── assets/               # DAW screenshots, audio examples
        ├── screenshots/      # FL Studio UI captures (annotated)
        ├── audio-examples/   # Short audio clips for A/B exercises
        └── diagrams/         # Signal flow, frequency charts
```

### 1.7 Production Exercise JSON Schema Extension

```typescript
// Extends the existing Exercise interface
interface ProductionExercise extends BaseExercise {
  path: 'production';
  exerciseType: 'quiz' | 'identify' | 'arrange' | 'match' | 'build' | 'mix' | 'spot-the-difference' | 'fill-in-the-blank' | 'label';

  // Type-specific content
  content: QuizContent | IdentifyContent | ArrangeContent | MatchContent
         | BuildContent | MixContent | SpotDiffContent | FillBlankContent | LabelContent;
}

interface QuizContent {
  question: string;
  options: string[];           // 4 choices
  correctIndex: number;
  explanation: string;         // Shown after answer
  audioClip?: string;          // Optional audio to play
  image?: string;              // Optional screenshot/diagram
  timeLimit?: number;          // Seconds (0 = no limit)
}

interface BuildContent {
  gridSize: [number, number];  // e.g., [16, 4] = 16 steps x 4 instruments
  instruments: string[];       // ["Kick", "Snare", "Hi-Hat", "808"]
  targetPattern: boolean[][];  // The correct pattern
  referenceAudio: string;      // Audio of the target pattern
  bpm: number;
}

interface MixContent {
  parameters: MixParameter[];  // Sliders to adjust
  targetValues: number[];      // Correct values
  tolerance: number;           // ±% for "correct"
  audioSource: string;         // Audio that changes with adjustments
}

interface LabelContent {
  image: string;               // Screenshot to label
  regions: LabelRegion[];      // Tappable areas
  correctLabels: string[];     // Expected label for each region
}

// ... other content types follow similar patterns
```

### 1.8 Scoring for Production Exercises

```typescript
// Much simpler than Piano's 5D scoring
interface ProductionExerciseScore {
  overall: number;              // 0-100
  stars: 0 | 1 | 2 | 3;
  breakdown: {
    accuracy: number;           // Did they get it right?
    speed: number;              // Bonus for fast answers (quiz/identify)
    completeness: number;       // % of items answered
  };
  xpEarned: number;
  isPassed: boolean;
}

// Star thresholds (same as Piano for consistency)
// ⭐ 70%  ⭐⭐ 85%  ⭐⭐⭐ 95%
```

---

## Part 2: Architectural Changes

### 2.1 Discipline System (Top-Level Concept)

```typescript
// New type: top-level discipline
type Discipline = 'piano' | 'production';

// In settingsStore
interface SettingsStoreState {
  // ... existing fields ...
  activeDiscipline: Discipline;           // Currently viewing
  unlockedDisciplines: Discipline[];      // ['piano'] initially, ['piano', 'production'] after unlock
  hasSeenProductionIntro: boolean;        // One-time onboarding
}
```

### 2.2 Store Strategy: Additive Parallel Fields

**Option chosen: Additive parallel fields (NOT store wrapping)**

> **CRITICAL:** Do NOT wrap existing piano fields inside a `disciplineProgress` or
> `disciplineProfiles` record. This would break 30+ references across stores, sync logic,
> all tests, and the persistence layer. Instead, add NEW fields for production alongside
> existing piano fields. Piano data stays exactly where it is.

```typescript
// progressStore.ts — ADD new fields, keep ALL existing fields unchanged
interface ProgressStoreState {
  // EXISTING — DO NOT MOVE OR RENAME
  xp: number;                              // Piano XP (keep as-is for backward compat)
  level: number;
  streakData: StreakData;                   // One streak across all learning
  lessonProgress: Record<string, LessonProgress>;       // Piano lessons
  exerciseHighScores: Record<string, number>;            // Piano scores
  tierTestResults: Record<string, TierTestResult>;       // Piano tier tests

  // NEW — Production fields at same level (additive, not wrapping)
  productionLessonProgress: Record<string, LessonProgress>;
  productionExerciseHighScores: Record<string, number>;
  productionTierTestResults: Record<string, TierTestResult>;

  // NEW — Combined XP (piano xp + production xp)
  totalXp: number;                          // Global XP from both paths
}

// learnerProfileStore.ts — ADD new fields, keep ALL existing fields unchanged
interface LearnerProfileState {
  // EXISTING — Piano-specific (DO NOT MOVE)
  noteAccuracy: Record<number, number>;
  tempoRange: { min: number; max: number };
  masteredSkills: string[];
  skillMasteryData: Record<string, SkillMasteryRecord>;
  totalExercisesCompleted: number;

  // NEW — Production-specific (additive)
  productionMasteredSkills: string[];
  productionSkillMasteryData: Record<string, SkillMasteryRecord>;
  productionConceptAccuracy: Record<string, number>;  // "eq-basics" → 0.85
  productionTotalExercisesCompleted: number;
}
```

This approach means:
- Zero migration needed for existing piano users
- All 30+ references to `lessonProgress`, `masteredSkills`, etc. continue working
- Sync logic stays the same — just add new fields with `?? {}` / `?? []` defaults
- Tests don't break — production fields are optional and default to empty

### 2.3 ContentLoader Extension

```typescript
// ContentLoader.ts additions
export function getLessonsByDiscipline(discipline: Discipline): LessonManifest[] { ... }
export function getExercisesByDiscipline(discipline: Discipline): ExerciseIndexEntry[] { ... }
export function getDisciplineSkillTree(discipline: Discipline): SkillNode[] { ... }

// exercise-index.json gains a `discipline` field
interface ExerciseIndexEntry {
  // ... existing fields ...
  discipline: Discipline;  // NEW: 'piano' | 'production'
}
```

### 2.4 Navigation Changes

```typescript
// AppNavigator.tsx — RootStackParamList additions
type RootStackParamList = {
  // ... existing routes ...

  // New: Discipline selection
  DisciplineSelect: undefined;                    // "What do you want to learn?"
  ProductionOnboarding: undefined;                // Production-specific onboarding

  // New: Production-specific screens
  ProductionExercisePlayer: {                     // Different player (no keyboard)
    exerciseId: string;
    lessonId?: string;
  };
  ProductionLevelMap: undefined;                  // Separate level map for Production
  DAWReference: { topic: string };                // FL Studio reference viewer

  // Modified: existing screens become discipline-aware
  // HomeScreen → shows content for activeDiscipline
  // DailySessionScreen → curriculum from active discipline's engine
};
```

### 2.5 New Components Needed

```
src/
├── components/
│   ├── production/                    # NEW: Production-specific components
│   │   ├── QuizCard.tsx              # Multiple choice UI
│   │   ├── IdentifyPlayer.tsx        # Audio A/B player with classify
│   │   ├── ArrangeBlocks.tsx         # Drag-and-drop arrangement
│   │   ├── MatchPairs.tsx            # Connect-the-pairs UI
│   │   ├── StepSequencer.tsx         # Grid-based beat builder
│   │   ├── MixerSliders.tsx          # Virtual mixer controls
│   │   ├── SpotDifference.tsx        # A/B toggle with selection
│   │   ├── FillBlank.tsx             # Inline blank picker
│   │   ├── LabelOverlay.tsx          # Image with tappable regions
│   │   ├── DAWScreenshot.tsx         # Annotated screenshot viewer
│   │   ├── SignalFlowDiagram.tsx     # Interactive signal chain
│   │   ├── WaveformVisualizer.tsx    # Waveform/spectrum display
│   │   └── FrequencyChart.tsx        # EQ visualization
│   │
│   └── common/
│       └── DisciplineSwitcher.tsx    # Tab/pill UI to switch Piano↔Production
│
├── screens/
│   ├── production/                    # NEW: Production screens
│   │   ├── ProductionExercisePlayer.tsx   # Main exercise screen (no keyboard)
│   │   ├── ProductionLevelMap.tsx         # Level map with Production tiers
│   │   ├── ProductionDailySession.tsx     # Daily session for Production
│   │   └── DAWReferenceScreen.tsx         # FL Studio reference wiki
│   │
│   └── DisciplineSelectScreen.tsx    # NEW: "Piano or Production?" chooser
│
├── core/
│   ├── production/                    # NEW: Production business logic
│   │   ├── ProductionSkillTree.ts    # ~120 nodes, 12 tiers
│   │   ├── ProductionValidator.ts    # Scoring for quiz/match/build/etc.
│   │   ├── ProductionTypes.ts        # Type definitions
│   │   └── __tests__/
│   │
│   └── curriculum/
│       ├── DisciplineConfig.ts       # NEW: Discipline config interface
│       ├── SkillTreeOps.ts           # NEW: Parameterized skill tree utilities
│       ├── pianoConfig.ts            # NEW: Piano config (wraps existing constants)
│       ├── productionConfig.ts       # NEW: Production config
│       └── CurriculumEngine.ts       # REFACTORED in Phase 0 — currently has
│                                     # 14+ hardcoded SKILL_TREE references,
│                                     # piano-only category maps, and hardcoded
│                                     # fallbacks to 'find-middle-c'. Phase 0
│                                     # refactors to accept DisciplineConfig param.
│                                     # Existing functions become thin wrappers
│                                     # passing PIANO_CONFIG (zero breaking changes).
```

### 2.6 Shared Systems (No Changes Needed)

These systems work across both disciplines without modification:

| System | Why It Works |
|--------|-------------|
| **Cat companions** | Cats are learning companions, not piano-specific. Same cats, same evolution. |
| **Gems & store** | Earn gems from any exercise type. Same gem economy. |
| **Social & leagues** | XP is global. Friends see all your progress. |
| **Streaks** | Practice = practice, regardless of discipline. |
| **Achievements** | Add Production achievements, same unlock system. |
| **AI coaching** | Gemini coaching works on any score data. Adjust prompt for Production context. |
| **Auth & sync** | Same user, same Firebase doc. Add discipline data to sync. |
| **Analytics** | Same PostHog events, add `discipline` property. |

### 2.7 What MIDI Does in Production Path

MIDI keyboards are still useful in Production — not for real-time scored playback, but for:
- **Melody input exercises**: "Play the melody you hear" (simpler scoring, wider tolerance)
- **Chord exploration**: "Play a minor 7th chord" (interactive learning, not scored timing)
- **Step sequencer**: MIDI keys map to drum pads for beat-building exercises
- **Optional**: Users without MIDI use on-screen taps — no penalty

The key difference: MIDI input in Production is **optional and non-graded** (except in explicitly musical exercises that cross over from Piano skills).

---

## Part 3: Web Version

### 3.1 Strategy

Build the web version as the **full app from day 1** — both Piano and Production paths, same experience as mobile. The web version is NOT a Production-only MVP; users should be able to do everything on web that they can on mobile.

```
The web version ships with:
- Both learning paths (Piano + Production)
- Piano: Web Audio API playback + WebMIDI input + QWERTY keyboard mapping
- Production: All 9 exercise types, step sequencer, mixer, etc.
- Full social features, cats, gems, leaderboards
- Cross-device sync via same Firestore backend
```

> **Framework decision (CONFIRMED):** React Native Web + Next.js. Full feature parity required.

### 3.2 Technical Approach

**Framework:** React Native Web (already in dependencies) + Next.js for SSR/SEO

Why not pure React web? Because:
- 90%+ of components, stores, and core logic are already cross-platform
- Zustand stores work identically on web
- Navigation can map to react-navigation web or Next.js pages
- Shared types, validators, curriculum engine — zero rewrite

**What needs adaptation for web:**
| Area | Mobile | Web |
|------|--------|-----|
| Navigation | React Navigation stacks | React Navigation web linking OR Next.js pages |
| Audio playback | ExpoAudioEngine / WebAudioEngine | Web Audio API (WebAudioEngine already exists!) |
| Audio input | Native mic + ONNX | Web Audio API + navigator.mediaDevices |
| MIDI input | @motiz88/react-native-midi | Web MIDI API (navigator.requestMIDIAccess) |
| Storage | AsyncStorage / MMKV | localStorage / IndexedDB |
| Animations | Reanimated 3 | CSS transitions / Framer Motion / Reanimated web |
| Haptics | expo-haptics | N/A (ignore gracefully) |
| Push notifications | expo-notifications | Web Push API / firebase-messaging |
| File system | expo-file-system | Browser File API / IndexedDB |
| TTS | ElevenLabs + expo-speech | ElevenLabs + Web Speech API |

### 3.3 Web Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          WEB CLIENT                                  │
│  React Native Web  •  Next.js (optional SSR)  •  Zustand           │
├─────────────────────────────────────────────────────────────────────┤
│  Shared Core:                                                       │
│    src/core/*          — Scoring, curriculum, skill tree            │
│    src/stores/*        — Zustand (same stores, web persistence)     │
│    src/services/ai/*   — Gemini coaching (Cloud Functions)          │
│    src/content/*       — ContentLoader (same JSON exercises)        │
│                                                                     │
│  Web-Specific:                                                      │
│    src/web/audio/      — Web Audio API engine                       │
│    src/web/midi/       — Web MIDI API input                         │
│    src/web/storage/    — localStorage adapter                       │
│    src/web/components/ — Web-optimized UI (responsive, keyboard)    │
│    src/web/pages/      — Next.js page routes                        │
├─────────────────────────────────────────────────────────────────────┤
│                          FIREBASE (SAME)                             │
│  Auth (Email/Google)  •  Firestore  •  Cloud Functions              │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 Web-Specific UI Considerations

- **Responsive layout**: Sidebar navigation on desktop, bottom tabs on mobile web
- **Keyboard shortcuts**: Play exercises with computer keyboard (QWERTY → notes mapping)
- **Larger canvas**: Piano keyboard spans full width on desktop; step sequencer gets more grid space
- **No haptics**: Replace with visual feedback (pulse animations, color flashes)
- **Right-click menus**: Context menus for exercise options (restart, skip, hint)
- **Browser MIDI**: Chrome supports Web MIDI API natively — MIDI keyboards work out of the box

### 3.5 Web Launch Scope (Full App)

The web version launches with full feature parity — same experience as mobile:

**Both Paths:**
- [x] Sign up / sign in (Firebase Auth web SDK)
- [x] Discipline selection (Piano / Production / Both)
- [x] Level maps for both paths
- [x] All exercise types (Piano: 6 types, Production: 9 types)
- [x] Progress tracking (synced with mobile via Firestore)
- [x] Cat companions (SVG renders identically on web)
- [x] Gem system, streaks, achievements
- [x] Social features (friends, leaderboards, challenges)
- [x] AI coaching (Gemini via Cloud Functions)
- [x] Daily sessions for both paths

**Piano on Web:**
- [x] Piano keyboard component (responsive, full-width on desktop)
- [x] QWERTY keyboard mapping (computer keyboard → notes)
- [x] WebMIDI input (Chrome native, polyfill for others)
- [x] Web Audio API playback (WebAudioEngine already exists)
- [x] PianoRoll / VerticalPianoRoll (falling notes)
- [ ] Mic input via `navigator.mediaDevices` (post-launch enhancement)

**Production on Web:**
- [x] All 9 exercise types
- [x] Step sequencer, mixer sliders, EQ visualizer
- [x] Audio playback via Web Audio API
- [x] MIDI/WAV export

---

## Part 4: Implementation Timeline

### Phase 0: Refactoring for Path-Agnosticism (1-2 weeks, after merging `feat/phase3-content-explosion`)

> **PREREQUISITE:** Must merge `feat/phase3-content-explosion` into master first.
> SkillTree.ts has a 202-line diff on that branch that would conflict with Phase 0 changes.

Pure refactoring — no new features, no production content. Makes the codebase ready for any discipline.

| Step | Deliverable |
|------|------------|
| 0.1 | `DisciplineConfig` interface (`src/core/curriculum/DisciplineConfig.ts`) |
| 0.2 | `pianoConfig.ts` wrapping existing SKILL_TREE, GENERATION_HINTS, TIER_MASTERY_GATES |
| 0.3 | `SkillTreeOps.ts` — all 12 utility functions accept `skillTree` parameter; existing exports become thin wrappers |
| 0.4 | Refactor CurriculumEngine — replace 14 SKILL_TREE refs with `config.skillTree`, replace hardcoded `'find-middle-c'` with `config.defaultRootSkillId` |
| 0.5 | Add `activeDiscipline`, `unlockedDisciplines` to settingsStore |
| 0.6 | Add `getDisciplineContentLoader(discipline)` factory to ContentLoader |

**Verification:** All 2,951+ tests pass, 0 TypeScript errors, piano gameplay unchanged.

### Pre-Launch (Current → App Store)

Continue existing roadmap: Phases 1-12 (Foundation → Monetization). Phase 0 can run in parallel during Phases 4-6 window since it's pure refactoring with no feature changes.

### Post-Launch Phase A: Production Content Creation (4-6 weeks)

**Goal:** Create the Production skill tree, curriculum, and first 200 exercises.

| Week | Deliverable |
|------|------------|
| 1 | Production skill tree design (120 nodes, 12 tiers, DAG validation) |
| 1 | Production exercise type system (9 types, validators, scoring) |
| 2 | Tier 1-3 exercises written (60 exercises: Production Basics, FL Studio, Drums) |
| 3 | Tier 4-6 exercises (60 exercises: Melody, Sound Design, Sampling) |
| 4 | Tier 7-9 exercises (60 exercises: Arrangement, Mixing, Effects) |
| 5 | Tier 10-12 exercises (60 exercises: Advanced Sound Design, Genre, Mastering) |
| 5 | AI generation pipeline for Production exercises (Gemini prompts) |
| 6 | Content review, screenshot assets, audio example recordings |

**Content creation approach:**
- Tiers 1-4: Fully static JSON (foundational concepts, specific FL Studio UI)
- Tiers 5-12: Mix of static (key concepts) + AI-generated (variations, practice quizzes)
- Screenshots: Captured from FL Studio with annotation overlay
- Audio examples: Short clips (2-8 seconds) demonstrating concepts

### Post-Launch Phase B: App Integration (3-4 weeks)

| Week | Deliverable |
|------|------------|
| 1 | Discipline system: settingsStore, ContentLoader, store namespacing |
| 1 | DisciplineSelectScreen, Production onboarding flow |
| 2 | ProductionExercisePlayer (quiz, identify, match, fill-blank) |
| 2 | ProductionExercisePlayer (arrange, build, mix, label, spot-diff) |
| 3 | ProductionLevelMap, ProductionDailySession |
| 3 | HomeScreen discipline awareness, DisciplineSwitcher |
| 4 | AI coaching for Production, achievements, testing |
| 4 | QA, device testing, TestFlight/Play Store update |

### Post-Launch Phase C: Web Version — Full App (6-8 weeks)

| Week | Deliverable |
|------|------------|
| 1 | Web project setup (Next.js + React Native Web), shared core imports |
| 1 | Web auth (Firebase web SDK), web storage adapter (localStorage/IndexedDB) |
| 2 | Web UI shell (responsive layout, sidebar nav desktop / bottom tabs mobile) |
| 2 | Piano keyboard component for web (responsive, QWERTY mapping, WebMIDI) |
| 3 | Piano exercise player on web (PianoRoll, scoring, Web Audio playback) |
| 3 | Production exercise player components (all 9 types) |
| 4 | Both LevelMaps, daily sessions, DisciplineSwitcher, progress sync |
| 4 | Cat companions (SVG), gem system, streaks, achievements |
| 5 | Social features (friends, leaderboard, challenges) on web |
| 5 | AI coaching, ElevenLabs TTS (works natively on web) |
| 6 | MIDI/WAV export, step sequencer, mixer, EQ visualizer |
| 7 | Web-specific polish (keyboard shortcuts, responsive, right-click menus) |
| 8 | QA, cross-browser testing (Chrome/Firefox/Safari), deploy to production |

### Post-Launch Phase D: Monetization Integration (2 weeks)

| Week | Deliverable |
|------|------------|
| 1 | Subscription tiers include Production access |
| 1 | Web payment integration (Stripe for web, RevenueCat for mobile) |
| 2 | Discipline-specific premium content gating |
| 2 | A/B test: Production as free hook vs premium upsell |

---

## Part 5: Monetization — FINALIZED DECISIONS

> **Status:** Decided (March 2026). These are the final monetization decisions for v1 launch.

### Core Model: Energy System (Duolingo Hearts Model)

**All lesson content is FREE.** No tier-gating, no paywall on lessons or exercises. Every user can access all 40 piano lessons and (eventually) all production lessons. The monetization lever is **play frequency**, not content access.

#### Energy System
- Users have a limited number of **energy points** (e.g., 5 hearts/lives)
- Each exercise attempt costs 1 energy
- Energy regenerates over time (e.g., 1 per 30 minutes)
- Running out of energy → wait, or go Premium
- **Premium subscribers get unlimited energy** — the primary conversion driver

#### What's Free vs Premium

| Feature | Free | Premium |
|---------|------|---------|
| **All lessons & exercises** | Yes (all tiers, all paths) | Yes |
| **Energy** | Limited (5 hearts, regenerates) | Unlimited |
| **Learning paths** | Pick ONE (Piano or Production) | Both paths |
| **Song Library** | Limited preview (5 songs?) | Full access (124+ songs) |
| **Cat companions** | Unlock with gems (earned via gameplay) | Same — gems earned via gameplay |
| **Gems** | Earn through gameplay | Same |
| **Social & Leaderboards** | Full access | Full access |
| **AI Coaching (Gemini)** | Limited (3/day?) | Unlimited |
| **ElevenLabs TTS** | expo-speech fallback | Full neural voices |

#### Key Decisions

1. **Cats are unlocked with gems. Gems are ONLY earned through gameplay — never purchased with real money.** This creates a competitive flywheel: play leagues → earn gems → unlock cats → cats have abilities that help you score higher → score higher in leagues → earn more gems. The most lucrative gem source is weekly league payouts, making competitive play the primary retention driver.

2. **Free users pick ONE path** during onboarding (Piano or Production). Premium unlocks the second path. This creates a natural upgrade moment: "You've been learning piano — ready to try producing?"

3. **Song Library is a premium feature.** Free users get a small preview set. This is high-value content that justifies the subscription.

4. **No tier-gating.** Unlike Duolingo's paywall at certain levels, ALL educational content is accessible. The limit is how much you can practice per day, not what you can learn.

5. **League gem rewards are the most lucrative gem source.** Weekly payouts scale by tier (Bronze < Silver < Gold < Diamond) and by final rank (top 3 get massive bonuses). This gives users a concrete reason to compete, climb tiers, and stay engaged week after week.

### Pricing (TBD — Benchmark Against)
- Duolingo Super: $12.99/month, $83.99/year
- Simply Piano: $19.99/month, $119.99/year
- Flowkey: $14.99/month, $119.99/year
- **Target range:** $9.99-14.99/month, $59.99-99.99/year (undercut competitors)

### Web-Specific Monetization
- Web uses **Stripe** for subscriptions (no 30% Apple/Google cut)
- Higher margins → can offer web-exclusive discounts
- Web could have a slightly lower price point to capture DAW learners who don't have the mobile app
- Consider: Web-only "Production Pro" tier with FL Studio project file downloads

---

## Part 6: Independent DAW Integrations

Everything in this section is buildable without any partnerships, approvals, or third-party business agreements.

### 6.1 Ableton Link — Real-Time Tempo Sync

**What:** Open source (GPLv2+) protocol that syncs tempo, beat phase, and start/stop across apps on the same local network. Works with 100+ apps including FL Studio Mobile, GarageBand, Korg Gadget, Reason Compact, etc.

**How it works:**
- UDP multicast for peer discovery on local WiFi
- Fully peer-to-peer — no central server or master clock
- Each app captures/commits session state (beat, time, tempo)
- C++ library: [github.com/Ableton/link](https://github.com/Ableton/link)
- iOS SDK: [LinkKit](https://github.com/Ableton/LinkKit) (C/Objective-C API, pre-built library)
- Email `link-devs@ableton.com` for proprietary license — it's a formality, free for all apps

**Integration plan:**
```
Native Module (Swift/Kotlin)
    ↓
React Native bridge (JSI or NativeModules)
    ↓
Exposes to JS:
  - linkEnable() / linkDisable()
  - getNumPeers(): number
  - getTempo(): number
  - setTempo(bpm: number)
  - getBeatAtTime(): number
  - isPlaying(): boolean
  - startStopSyncEnable(enabled: boolean)
```

**Use cases in Purrrfect Keys:**
- Step sequencer exercises sync to user's DAW tempo
- "Practice at your project's BPM" — user's FL Studio Mobile sets tempo, our exercises adapt
- Beat-building output plays in sync with whatever else is running
- Status indicator: "Connected to 2 Link peers" badge in exercise player

**Effort:** 1-2 weeks (native bridge + UI integration)

### 6.2 MIDI File Export

**What:** Export any user-created pattern, exercise performance, or melody as a standard .mid file that opens in every DAW ever made.

**Implementation:**
```typescript
// src/core/production/midiExport.ts
import { MidiWriter } from 'midi-writer-js';  // npm package, MIT license

export function exportPatternAsMidi(
  pattern: boolean[][],       // Step sequencer grid
  instruments: string[],      // Instrument names → MIDI channels
  bpm: number,
  timeSignature: [number, number]
): Uint8Array {
  const track = new MidiWriter.Track();
  track.setTempo(bpm);
  track.setTimeSignature(timeSignature[0], timeSignature[1]);

  // Convert grid pattern to MIDI note events
  for (let row = 0; row < pattern.length; row++) {
    for (let step = 0; step < pattern[row].length; step++) {
      if (pattern[row][step]) {
        track.addEvent(new MidiWriter.NoteEvent({
          pitch: instruments[row], // Map to GM drum map or note
          duration: '16',         // 16th note per step
          startTick: step * 128,  // 128 ticks per 16th
          velocity: 100,
        }));
      }
    }
  }

  const writer = new MidiWriter.Writer([track]);
  return writer.buildFile();
}

export function exportPerformanceAsMidi(
  notes: PlayedNote[],
  bpm: number
): Uint8Array { /* ... */ }
```

**User flow:**
```
Complete exercise → [Export MIDI] button
    ↓
Share sheet: "Save to Files" / "Open in FL Studio" / "Send via AirDrop"
    ↓
User imports .mid into their DAW → sees their beat/melody on the timeline
```

**Also works for Piano path:** Export practice performances, completed exercises, free play sessions.

**Effort:** 2-3 days (midi-writer-js + share sheet integration)

### 6.3 Audiobus SDK (iOS Inter-App Audio/MIDI)

**What:** Free SDK that lets iOS apps send/receive audio and MIDI to/from each other. 200+ compatible apps.

**Integration scope:**
- **MIDI Output**: Purrrfect Keys sends MIDI from step sequencer → GarageBand/FL Studio Mobile receives
- **MIDI Input**: Receive MIDI from other apps for exercises
- **Audio Output** (optional): Route our synthesized audio to other apps for recording

**Developer resources:** [developer.audiob.us](https://developer.audiob.us/) — comprehensive docs, sample apps

**Implementation:**
1. Add Audiobus SDK to iOS native project
2. Register as MIDI sender (and optionally audio sender)
3. Bridge to React Native via NativeModules
4. Add "Send to Audiobus" toggle in exercise player

**Effort:** 2-3 days (SDK is well-documented, ~2 hour integration per their docs, plus RN bridge)

### 6.4 Network MIDI (Built into iOS/macOS)

**What:** CoreMIDI natively supports MIDI over WiFi. Zero external dependencies. User's phone sends MIDI to their Mac/PC DAW on the same network.

**How it works:**
- iOS/macOS: Built into CoreMIDI (RTP-MIDI, Bonjour discovery)
- Windows: rtpMIDI by Tobias Erichsen (free) provides same functionality
- Our existing `@motiz88/react-native-midi` already uses CoreMIDI

**What we need to add:**
```typescript
// Expose network MIDI ports alongside hardware MIDI
interface MidiPort {
  id: string;
  name: string;
  type: 'hardware' | 'network' | 'virtual';
  connected: boolean;
}

// MidiOutput (NEW — currently we only have MidiInput)
interface MidiOutput {
  sendNoteOn(note: number, velocity: number, channel: number): void;
  sendNoteOff(note: number, channel: number): void;
  sendControlChange(cc: number, value: number, channel: number): void;
}
```

**User flow:**
```
iPhone (Purrrfect Keys)  ──WiFi──▶  Mac (FL Studio / Ableton / Logic)
    Step sequencer output            Receives MIDI on "Network Session 1"
    Real-time beat building          Records directly into DAW timeline
```

**Setup for user:**
1. Mac: Audio MIDI Setup → MIDI Network Setup → Create Session → Enable
2. iPhone: Purrrfect Keys Settings → "Send MIDI to Network" → Select session
3. Done — MIDI flows in real-time

**Effort:** 1 week (MidiOutput implementation + network port discovery UI)

### 6.5 DAW Replica Components (Our Own UI)

We build simplified, interactive versions of DAW UI elements for exercises. These are our own components — no trademark issues.

**Components to build:**

```
┌─────────────────────────────────────────────────────────────┐
│  STEP SEQUENCER (Channel Rack replica)                      │
│  ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐        │
│  │● │  │  │  │● │  │  │  │● │  │  │  │● │  │  │  │ Kick   │
│  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │● │  │ Snare  │
│  │● │  │● │  │● │  │● │  │● │  │● │  │● │  │● │  │ HiHat  │
│  │  │  │  │  │  │  │  │● │  │  │  │  │  │  │  │  │ 808    │
│  └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘        │
│  [▶ Play]  BPM: 140  Swing: 0%  [Export MIDI]              │
│                                                             │
│  Implementation: React Native grid of Pressable cells       │
│  Audio: Web Audio API drum synthesis (kick=sine+pitch env,  │
│         snare=noise+filter, hat=filtered noise burst)       │
│  Scoring: Compare user grid to target grid (boolean[][])    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  MIXER (simplified mixer replica)                           │
│                                                             │
│  ┃▓▓▓┃  ┃▓▓ ┃  ┃▓▓▓┃  ┃▓  ┃  ┃▓▓▓┃  ┃▓▓▓┃               │
│  ┃▓▓▓┃  ┃▓▓ ┃  ┃▓▓▓┃  ┃▓  ┃  ┃▓▓▓┃  ┃▓▓▓┃               │
│  ┃▓▓▓┃  ┃▓▓ ┃  ┃▓▓▓┃  ┃▓  ┃  ┃▓▓▓┃  ┃▓▓▓┃               │
│  ──●──  ──●──  ──●──  ──●──  ──●──  ──●──  Pan knobs      │
│  Kick   Snare  HiHat   808   Bass   Synth                  │
│   [S][M] [S][M] [S][M] [S][M] [S][M] [S][M]  Solo/Mute   │
│                                                             │
│  Implementation: Vertical sliders + pan knobs (Reanimated)  │
│  Audio: Web Audio GainNode per channel, StereoPannerNode    │
│  Scoring: Compare slider positions to target (±tolerance)   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  EQ VISUALIZER                                              │
│                                                             │
│       /\                                                    │
│      /  \        ___                                        │
│  ___/    \______/   \___________     Frequency response     │
│                       \                                     │
│                        \_____                               │
│  20Hz   100   500  1K  5K  10K  20kHz                       │
│                                                             │
│  ○ Low Cut   ○ Low Shelf   ○ Peak   ○ High Shelf           │
│  Freq: 200Hz  Gain: +3dB   Q: 1.4                          │
│                                                             │
│  Implementation: SVG path with draggable control points     │
│  Audio: BiquadFilterNode chain on Web Audio API             │
│  Scoring: Match target frequency curve (point-by-point)     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  AUTOMATION LANE                                            │
│                                                             │
│  ●───────●                                                  │
│          │     ●──────────●                                 │
│          ●─────┘          │        ●                        │
│                           ●────────┘                        │
│  ├──────────────────────────────────┤                       │
│  Bar 1       Bar 2       Bar 3     Bar 4                    │
│                                                             │
│  Parameter: Filter Cutoff    [▶ Play with automation]       │
│                                                             │
│  Implementation: SVG with draggable bezier control points   │
│  Audio: AudioParam.linearRampToValueAtTime() scheduling     │
│  Scoring: Compare user curve to target (sample at 16 points)│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SIGNAL FLOW DIAGRAM                                        │
│                                                             │
│  [Oscillator] → [Filter] → [  ?  ] → [Output]              │
│                                ↑                            │
│                          Drag here:                         │
│                    ┌─────┐ ┌─────┐ ┌──────┐                │
│                    │ Amp │ │ LFO │ │Reverb│                │
│                    └─────┘ └─────┘ └──────┘                │
│                                                             │
│  Implementation: Draggable blocks with connection lines     │
│  Scoring: Correct block in correct position                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  WAVEFORM DISPLAY                                           │
│                                                             │
│  ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿         │
│  ────────────────────────────────────────────────            │
│  ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿         │
│                                                             │
│  "What waveform is this?"                                   │
│  ○ Sine   ● Sawtooth   ○ Square   ○ Triangle               │
│                                                             │
│  Implementation: Canvas/SVG waveform renderer               │
│  Audio: OscillatorNode with selectable waveform type        │
│  Scoring: Correct identification                            │
└─────────────────────────────────────────────────────────────┘
```

**Key principle:** Every component plays real audio via Web Audio API. Users hear what they're building — it's not just visual.

**Effort:** 2-3 weeks (6 core components, each 2-3 days)

### 6.6 Web Audio Synthesis Engine for Production

Extend the existing WebAudioEngine to synthesize all sounds needed for Production exercises — no sample licensing required.

```typescript
// src/audio/ProductionAudioEngine.ts

interface ProductionAudioEngine {
  // Drum synthesis
  playKick(params?: { pitch?: number; decay?: number; drive?: number }): void;
  playSnare(params?: { tone?: number; snap?: number; decay?: number }): void;
  playHiHat(params?: { open?: boolean; decay?: number }): void;
  play808(params?: { pitch?: number; slide?: number; decay?: number }): void;

  // Oscillator demo
  playOscillator(type: OscillatorType, freq: number, duration: number): void;

  // Filter demo
  applyFilter(type: BiquadFilterType, freq: number, Q: number, gain: number): void;

  // Effects chain
  createEffectsChain(effects: EffectConfig[]): AudioNode;

  // Full pattern playback
  playPattern(pattern: StepPattern, bpm: number, loop: boolean): PatternHandle;
  stopPattern(handle: PatternHandle): void;
}

// Drum synthesis recipes (all procedural, no samples needed)
const KICK_SYNTH = {
  // Sine oscillator with fast pitch envelope (150Hz → 40Hz in 50ms)
  // + slight distortion via WaveShaperNode
  osc: 'sine', startFreq: 150, endFreq: 40, pitchDecay: 0.05,
  ampDecay: 0.4, drive: 1.5
};

const SNARE_SYNTH = {
  // Noise burst (100ms) + sine tone (200Hz, 80ms)
  // + bandpass filter on noise (1kHz-8kHz)
  noiseDecay: 0.1, toneFreq: 200, toneDecay: 0.08,
  filterLow: 1000, filterHigh: 8000
};

const HIHAT_SYNTH = {
  // High-pass filtered noise (8kHz+)
  // Open: 300ms decay, Closed: 50ms decay
  filterFreq: 8000, closedDecay: 0.05, openDecay: 0.3
};
```

**What this enables:**
- Step sequencer plays real drum sounds (no samples needed)
- Sound design exercises demonstrate synthesis in real-time
- A/B comparison exercises generate both versions procedurally
- Filter/EQ exercises apply real DSP and play the result
- Works identically on mobile (react-native-audio-api) and web (Web Audio API)

**Effort:** 1 week (drum synth + effects chain + pattern sequencer)

### 6.7 MIDI File + Project Stub Generation

Beyond basic MIDI export, generate starter files that open in specific DAWs:

```typescript
// What we can generate independently:
const EXPORT_FORMATS = {
  midi: {
    extension: '.mid',
    description: 'Standard MIDI (works in every DAW)',
    generator: exportAsMidi,          // midi-writer-js
  },
  wav: {
    extension: '.wav',
    description: 'Audio file of your pattern',
    generator: renderToWav,           // OfflineAudioContext → WAV
  },
  // Future: FL Studio Mobile uses .flm (simpler than desktop .flp)
  // Community has partially reverse-engineered this format
};
```

**OfflineAudioContext rendering** (Web Audio API standard):
```typescript
// Render a pattern to WAV without real-time playback
async function renderPatternToWav(pattern: StepPattern, bpm: number): Promise<Blob> {
  const duration = (pattern.steps / (bpm / 60)) * (pattern.stepsPerBeat || 4);
  const offline = new OfflineAudioContext(2, 44100 * duration, 44100);

  // Schedule all pattern events on the offline context
  schedulePattern(offline, pattern, bpm);

  const buffer = await offline.startRendering();
  return audioBufferToWav(buffer);
}
```

**Effort:** 3-4 days (MIDI export + WAV render + share sheet)

### 6.8 Integration Summary & Priority

| # | Integration | Effort | Value | Dependencies |
|---|---|---|---|---|
| 1 | **DAW Replica Components** (step seq, mixer, EQ, automation) | 2-3 weeks | Critical | Web Audio API (already have) |
| 2 | **Production Audio Engine** (drum synth, effects, patterns) | 1 week | Critical | Web Audio API |
| 3 | **MIDI File Export** | 2-3 days | High | midi-writer-js (npm) |
| 4 | **Ableton Link** (tempo sync) | 1-2 weeks | High | LinkKit SDK (free, open source) |
| 5 | **WAV Export** (render pattern to audio) | 2-3 days | Medium | OfflineAudioContext |
| 6 | **Audiobus SDK** (iOS inter-app) | 2-3 days | Medium | Audiobus SDK (free) |
| 7 | **Network MIDI Output** | 1 week | Medium | CoreMIDI (built-in) |

**Total new integration work:** ~7-8 weeks (spread across Phases A-C)

---

## Part 10: FL Studio Integration Details

### 6.1 What We Teach (Not What We Build)

We are **NOT** building a DAW. We are teaching users how to use FL Studio through:

1. **Annotated screenshots** — "This is the Channel Rack. Each row is an instrument."
2. **Interactive replicas** — Simplified versions of FL Studio UI elements for exercises:
   - Step sequencer grid (simplified Channel Rack)
   - Mixer sliders (simplified mixer)
   - Piano roll grid (we already have PianoRoll!)
   - Automation curves (simple bezier editor)
3. **"Try it in FL Studio" prompts** — After learning a concept, prompt users to open FL Studio and try it themselves
4. **Project file downloads** (premium) — FL Studio .flp files that users can open to explore completed examples

### 6.2 Why FL Studio Specifically?

- Most popular DAW for beginners and hip-hop/electronic producers
- Free trial available (all features, can't re-open saved projects)
- Large community and tutorial ecosystem to complement our teaching
- Distinctive, learnable UI that translates well to screenshots
- Strong mobile presence (FL Studio Mobile exists)

### 6.3 Legal Considerations

- FL Studio is a trademark of Image-Line. We cannot use their logo or claim endorsement.
- Screenshots used for education are generally covered under fair use, but we should:
  - Use our own recreated UI elements (not direct screenshots) where possible
  - Include a disclaimer: "Not affiliated with Image-Line"
  - Focus on general production concepts that apply to any DAW
  - Offer DAW-agnostic "core concepts" alongside FL Studio-specific guidance

### 6.4 Future: Multi-DAW Support

Eventually, users could choose their DAW:
- FL Studio (default, most content)
- Ableton Live
- Logic Pro (macOS/iOS users)
- GarageBand (free, Apple ecosystem)

Each DAW gets different screenshots and UI replicas, but the **core production concepts are DAW-agnostic** — the skill tree doesn't change, only the visual context.

---

## Part 8: Cat System in Production Path

### 8.1 Cat Role Changes

In Piano path: Cat is a **cheerleader** (reacts to your playing in real-time).
In Production path: Cat is a **mentor/guide** (explains concepts, gives tips, celebrates milestones).

The cat's personality still matters — Jazzy might say "That 808 slide is smooth!" while Luna says "Interesting harmonic choice in that chord progression." Same personality system, different context.

```typescript
// Cat dialogue triggers for Production
type ProductionDialogueTrigger =
  | 'concept-intro'        // "Alright, let me break down what sidechain compression does..."
  | 'correct-answer'       // "Purrrfect! That's the right frequency range!"
  | 'wrong-answer'         // "Not quite — that's a high-pass filter, not low-pass"
  | 'hint'                 // "Think about what happens when you boost resonance..."
  | 'pattern-feedback'     // "That kick pattern has great bounce! Try adding ghost notes on the snare"
  | 'mix-feedback'         // "Your levels are close — the vocal is sitting a bit low though"
  | 'tier-complete'        // "You've mastered drum programming! Time for melody writing"
  | 'streak-encourage'     // Same as Piano
  | 'daw-tip'              // "Pro tip: F6 in FL Studio opens the Step Sequencer"
  | 'genre-context'        // "In trap, the 808 IS the bass — there's no separate bass instrument"
  | 'common-mistake'       // "A lot of beginners boost EQ — try cutting the mud at 300Hz instead"
  | 'reference-prompt'     // "Before mixing, drag in a reference track so you can A/B compare"
```

### 8.2 Shared Cat Economy

- Same 12 cats, same evolution stages (Baby → Teen → Adult → Master)
- XP earned in Production contributes to cat evolution (same global XP pool)
- Gems earned identically from Production exercises
- Cat abilities have Production equivalents:
  - "Timing Shield" → "Extra Attempt" (forgive one wrong answer in quiz)
  - "Combo Keeper" → "Streak Saver" (maintain answer streak on wrong answer)
  - "Score Boost" → "XP Boost" (same multiplier)
  - "Hint Reveal" → "Hint Reveal" (identical — show a hint during exercise)

### 8.3 Salsa Coach in Production

Salsa (the NPC coach cat) adapts to Production context:

**Pre-exercise:**
- Piano: "Let me show you the melody first" → plays demo
- Production: "Let me walk you through this concept first" → shows annotated example, plays audio

**Post-exercise:**
- Piano: "Your timing on beat 3 was early — try counting along"
- Production: "You placed the snare on beat 3 instead of beat 2 — in most genres the snare lives on beats 2 and 4. That's called the backbeat."

**Key difference:** In Production, Salsa explains the WHY, not just the WHAT. Production is knowledge-heavy — the cat's teaching role is more important than cheerleading.

---

## Part 9: Content Generation Strategy

### 9.1 Static vs AI-Generated

| Tier | Content Type | Rationale |
|------|-------------|-----------|
| 1-2 | 100% Static | DAW interface, core concepts — must be precise and screenshot-specific |
| 3-7 | 80% Static, 20% AI | Drum patterns, melody, bass, synthesis — key concepts static, AI generates pattern variations |
| 8-10 | 60% Static, 40% AI | Sound design, arrangement, mixing — concepts static, AI generates quiz variations and A/B scenarios |
| 11-13 | 50% Static, 50% AI | Advanced mixing, mastering — AI generates ear training and reference matching exercises |
| 14-15 | 30% Static, 70% AI | Genre specialization — AI generates genre-specific drum patterns, chord progressions, and arrangement exercises |

### 9.2 Genre-Specific Exercise Generation

Each genre in Tiers 14-15 needs exercises that teach its signature characteristics:

```typescript
// Example: Generating a trap drum pattern exercise
const TRAP_PATTERN_EXERCISE = {
  type: 'build',
  genre: 'trap',
  content: {
    gridSize: [16, 4],  // 16 steps × 4 instruments
    instruments: ['Kick', 'Clap', 'Hi-Hat (Closed)', '808'],
    bpm: 140,
    swing: 0,  // Trap is usually straight
    targetPattern: [
      // Kick: beats 1 and 3 (in half-time feel)
      [true,false,false,false, false,false,false,false, true,false,false,false, false,false,false,false],
      // Clap: beats 2 and 4
      [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false],
      // Hi-hat: rapid 16ths with velocity variation
      [true,true,true,true, true,true,true,true, true,true,true,true, true,true,true,true],
      // 808: sustained, tuned to key, on beat 1
      [true,false,false,false, false,false,false,false, false,false,false,false, false,false,false,false],
    ],
    velocityPattern: {
      // Hi-hat velocity creates groove even without swing
      2: [100,40,70,40, 100,40,70,40, 100,40,70,40, 100,40,70,40]
    },
    hints: [
      "In trap, the kick and 808 work together — don't put them on the same beat",
      "Hi-hat velocity variation is what gives trap its energy",
      "The clap on 2 and 4 is the backbeat — this is standard across genres"
    ],
    referenceProducers: ["Metro Boomin", "Southside"],
  }
};
```

### 9.3 AI Generation Prompts (Genre-Aware)

```typescript
const PRODUCTION_EXERCISE_PROMPT = `Generate a music production exercise.

SKILL: ${skillNode.name}
TIER: ${skillNode.tier}
TYPE: ${exerciseType}
GENRE: ${genre}  // e.g., "trap", "deep-house", "lo-fi-hip-hop"
DIFFICULTY: ${difficulty}

GENRE CONTEXT:
${GENRE_SPECS[genre]}  // BPM range, drum patterns, bass type, key techniques

Requirements:
- For build: provide target pattern as a grid with velocity values
- For quiz: 4 options, 1 correct, genre-accurate distractors, explanation
- For mix: provide target parameter values within genre-appropriate ranges
- For identify: reference real production techniques, not abstract concepts
- All content must be factually accurate for ${genre} production
- Reference actual techniques used by notable producers in this genre
- Include at least one "common beginner mistake" in the explanation

Output JSON matching the ProductionExercise schema.`;
```

### 9.4 Audio Asset Strategy

Production exercises need real audio. Three tiers of audio generation:

**Tier 1 — Procedural (Web Audio API, no samples needed):**
- Oscillator waveforms (sine, saw, square, triangle)
- Drum synthesis (kick = sine + pitch envelope, snare = noise + filter, hat = filtered noise)
- Filter demonstrations (sweep, resonance, cutoff)
- ADSR envelope demonstrations
- Basic effects (reverb via ConvolverNode, delay, distortion)

**Tier 2 — CC0 Sample Packs (bundled or CDN-hosted):**
- Drum one-shots from Producer Space / Freesound (CC0)
- Loop examples for arrangement exercises
- Genre-specific reference patterns (pre-rendered)
- Estimated: ~500 clips × 3-8 seconds = ~30-50MB total (CDN, lazy-loaded)

**Tier 3 — Studio Library (multitrack stems for Mix Practice):**
- Cambridge MT Mixing Secrets: 345+ songs with stems (educational use)
- Pre-processed into exercise-friendly format (8-bar excerpts, normalized levels)
- Served from CDN, downloaded on demand per exercise
- Estimated: 50 curated songs × ~20MB per song = ~1GB (streamed, not bundled)

### 9.5 Genre Reference Database

Each genre gets a reference card accessible from exercises and the DAW Reference screen:

```typescript
interface GenreReference {
  id: string;                         // 'trap', 'deep-house', etc.
  name: string;
  bpmRange: [number, number];         // [140, 150]
  timeSignature: [number, number];    // [4, 4]
  feel: 'straight' | 'swing' | 'shuffle' | 'half-time';
  keyCharacteristics: string[];       // ["808 glide", "hi-hat rolls", ...]
  drumPattern: {
    kick: boolean[];                  // 16 steps
    snare: boolean[];
    hihat: boolean[];
    percussion?: boolean[];
  };
  bassType: string;                   // "808 with glide"
  melodicCharacter: string;           // "Dark minor-key, sparse"
  arrangementStructure: string[];     // ["Intro", "Hook", "Verse", ...]
  typicalLength: string;              // "2:30-3:30"
  signatureSounds: string[];          // ["Rapid hi-hat rolls", "Sliding 808"]
  notableProducers: string[];         // ["Metro Boomin", "Southside"]
  commonMistakes: string[];           // ["808 out of tune", "Uniform hi-hat velocity"]
}
```

20 genre references covering:
- **Hip Hop:** Boom Bap, Trap, Drill (UK/Chicago/NY), Lo-fi, Phonk, Cloud Rap
- **Electronic:** House (Deep/Tech/Progressive), Techno (5 subgenres), Trance (3 subgenres), DnB/Jungle, Dubstep/Riddim, Future Bass, Hardstyle/Hardcore
- **Pop & Global:** Pop, R&B/Neo-soul, Afrobeats/Amapiano, Reggaeton
- **Other:** Ambient/Downtempo, UK Garage/2-step, Breakbeat

---

## Part 9: Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Content quality for Production | High | Hire music production consultant for Tier 1-6 review |
| FL Studio UI changes | Medium | Use recreation components, not direct screenshots |
| Scope creep (too many DAWs) | High | FL Studio only for v1. DAW-agnostic concepts. |
| Web audio cross-browser | Medium | WebAudioEngine already exists. Test Chrome/Firefox/Safari. |
| Cannibalization (Production users skip Piano) | Low | Different audiences. Cross-promotion between paths. |
| Legal (FL Studio trademark) | Low | "Not affiliated" disclaimer. Fair use for education. |
| Storage/bandwidth for audio examples | Low | CDN for audio, lazy loading, offline cache |

---

## Part 10: Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Production path activation rate | 20% of new users choose Production | PostHog funnel |
| Cross-path adoption | 15% of Piano users try Production | PostHog |
| Production lesson completion | 60% of Tier 1 → 30% of Tier 4 | Firestore queries |
| Web MAU (6 months post-launch) | 5,000 | PostHog |
| Web conversion rate | 5% free → paid | Stripe + PostHog |
| Retention (Production, D7) | 25% | PostHog cohort |
| NPS for Production path | 40+ | In-app survey |

---

## Appendix A: Production Skill Categories

```typescript
type ProductionSkillCategory =
  | 'daw-basics'          // DAW interface, navigation, shortcuts, project setup
  | 'drum-programming'    // Kick/snare/hat patterns, velocity, swing, quantization
  | 'melody-harmony'      // Scales, chords, progressions, piano roll composition
  | 'bass-design'         // 808, sub, Reese, acid, tuning, sidechain
  | 'synthesis'           // Oscillators, filters, ADSR, LFOs, FM, wavetable
  | 'sampling'            // Chopping, stretching, layering, resampling
  | 'arrangement'         // Song structure, transitions, automation, energy flow
  | 'mixing'              // EQ, compression, panning, gain staging, sends/inserts
  | 'effects'             // Reverb, delay, sidechain, saturation, modulation
  | 'mastering'           // Limiting, stereo width, LUFS, export, distribution
  | 'genre-hip-hop'       // Boom bap, trap, drill, lo-fi, phonk, cloud rap
  | 'genre-electronic'    // House, techno, trance, DnB, dubstep, future bass
  | 'genre-pop-global'    // Pop, R&B, afrobeats, reggaeton, UK garage
  | 'ear-training'        // Frequency identification, A/B comparison, reference matching
```

## Appendix B: Firestore Schema Additions

> **Strategy:** Parallel collections for production data. No restructuring of existing piano data.

```
users/{uid}
  → activeDiscipline: 'piano' | 'production'           # NEW field
  → unlockedDisciplines: ['piano'] or ['piano', 'production']  # NEW field
  → (all existing piano fields stay exactly where they are)

users/{uid}/production-lessons/{lessonId}               # NEW collection (parallel to lessons/)
  → same structure as piano lessonProgress
  → status, exerciseScores, bestScore, completedAt

users/{uid}/production-skills/{skillId}                 # NEW collection
  → masteryScore: number
  → lastPracticedDate: string
  → sessionCount: number

leagues/current/{week}/{uid}
  → xp: number (combined from both disciplines)         # UPDATED (was piano-only)
  → discipline: 'piano' | 'production' | 'both'         # NEW field (display badge)

# EXISTING collections — NO CHANGES:
# users/{uid}/lessons/{lessonId}           — Piano lesson progress (untouched)
# users/{uid}/song-mastery/{songId}        — Piano song mastery (untouched)
# friends/, friend-requests/, activity/    — Shared across disciplines (untouched)
```

## Appendix C: Web Deployment

```
Hosting: Vercel (Next.js) or Firebase Hosting
Domain: web.purrrfectkeys.com or app.purrrfectkeys.com
CDN: Cloudflare for audio assets
Auth: Firebase Auth web SDK (same project)
Analytics: PostHog web SDK
Payments: Stripe (no App Store cut!)
```

---

---

## Appendix D: Studio Library (Production Music Library)

The equivalent of Piano's Song Library (124 songs). Users practice mixing, study arrangements, and remix real multitrack stems.

### Three Modes Per Song

**1. Mix Practice** — Get stems, adjust levels/EQ/panning to match a reference.
```
┌─────────────────────────────────────────────────────────────┐
│  🎚️ MIX PRACTICE: "Midnight Drive" — Lo-fi Hip Hop          │
│                                                             │
│  Reference: [▶ A]  Your Mix: [▶ B]  [A/B Toggle]           │
│                                                             │
│  Drums ████████████░░░░  ──●──  Vol: -6dB   Pan: C         │
│  Bass  ██████████░░░░░░  ──●──  Vol: -8dB   Pan: C         │
│  Keys  ████████░░░░░░░░  ──●──  Vol: -12dB  Pan: 30R       │
│  Guitar ██████░░░░░░░░░░  ──●──  Vol: -14dB  Pan: 40L      │
│  Vox   ████████████░░░░  ──●──  Vol: -4dB   Pan: C         │
│                                                             │
│  Score: 78% — Your bass is too loud, vocals too quiet       │
│  Mastery: 🥉 Bronze — Score 90%+ for Silver                 │
└─────────────────────────────────────────────────────────────┘
```

**2. Beat Study** — See the drum pattern, melody MIDI, arrangement blocks.
```
Exercises generated from the song:
  - "Recreate this drum pattern" (build exercise)
  - "Identify the chord progression" (quiz exercise)
  - "Label the arrangement sections" (label exercise)
  - "What key is this song in?" (quiz exercise)
```

**3. Remix Challenge** — Get stems + creative freedom. No scoring. Share to social feed.
```
User remixes the stems however they want → exports → shares to activity feed
Community votes / reactions on remixes (future social feature)
```

### Content Sources (No Licensing Needed)

| Source | Songs | License | Use Case |
|---|---|---|---|
| Cambridge MT Mixing Secrets | 345+ with stems | Educational use | Mix Practice |
| Freesound.org | 700K+ sounds | CC0 / CC-BY | Sound examples, audio quiz assets |
| Producer Space | 2,000+ samples | CC0 Public Domain | Drum samples for exercises |
| muted.io Drum Patterns | Various | Free | Reference patterns + MIDI |
| Hyperbits Toolkit | 1,368 MIDI files | Royalty-free | Chord progression exercises |
| Kunstderfuge | 19,300 classical MIDI | Free | Melody / arrangement study |

### Mix Practice Scoring

```typescript
interface MixPracticeScore {
  overall: number;           // 0-100
  stars: 0 | 1 | 2 | 3;
  breakdown: {
    levelBalance: number;    // How close are your fader positions to reference?
    panAccuracy: number;     // How close are your pan positions?
    eqMatch: number;         // How close is your tonal balance? (spectral comparison)
    dynamicRange: number;    // How close is your compression? (RMS comparison)
  };
  mastery: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
}

// Scoring uses spectral analysis comparison:
// 1. Render user's mix to audio buffer (OfflineAudioContext)
// 2. FFT both user mix and reference
// 3. Compare spectral energy in bands (20-200, 200-2K, 2K-8K, 8K-20K)
// 4. Compare stereo field (correlation, width)
// 5. Score = weighted proximity across all dimensions
```

---

## Appendix E: Competitive Landscape

**There is NO app that combines gamified learning + interactive production exercises + DAW-specific teaching.**

| App | Interactive? | Gamified? | Teaches Production? | Mobile? |
|---|---|---|---|---|
| **Purrrfect Keys Production** (us) | **Yes** | **Yes** | **Yes** | **Yes** |
| Melodics | Yes | Yes | No (instruments only) | Yes |
| SoundGym | Yes | Yes | Partially (ear training only) | No |
| Ableton Learning Music | Yes | No | Partially (basics) | No |
| Soundfly | No (video) | No | Yes | No |
| Producertech | No (video) | No | Yes | No |
| Sonic Academy | No (video) | No | Yes | No |
| Skillshare | No (video) | No | Yes | Yes |
| Duolingo Music | Yes | Yes | No (piano/reading) | Yes |

**The gap:** Every production learning platform is video-based. Every gamified music app teaches instruments. We'd be first-to-market with a gamified, interactive, mobile-first production learning app.

**Market size:** Online music education $4.27B (2025) → $14.75B (2035). Music learning apps $1.85B (2024) → $5.41B (2033).

---

**Next step:** After v1 launches on App Store/Play Store, begin Phase A (Production content creation) while monitoring v1 metrics and user feedback.

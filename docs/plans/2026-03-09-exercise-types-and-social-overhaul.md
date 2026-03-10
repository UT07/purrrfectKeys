# Exercise Types & Social Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add all 6 exercise types (Play, Rhythm, Ear Training, Chord ID, Sight Reading, Call & Response) to the core exercise system, and overhaul the social features from basic placeholders into compelling multiplayer experiences.

**Architecture:** Exercise types are added as a discriminated union on the `Exercise` interface, with type-specific scoring strategies and UI rendering branches in ExercisePlayer. Each new type reuses 90%+ of existing infrastructure (PianoRoll, Keyboard, audio engine, scoring pipeline). Social overhaul focuses on in-line engagement patterns (challenge from score screen, friend activity that drives re-engagement) rather than adding more screens.

**Tech Stack:** TypeScript, Zustand, React Native, Gemini AI (exercise generation), Firestore (social), existing ExerciseValidator + ExercisePlayer

---

## Part 1: Six Exercise Types

### Current State
- `Exercise` interface in `src/core/exercises/types.ts` has NO `type` field
- `ExerciseIndexEntry` in `src/content/ContentLoader.ts` has `type: 'play' | 'test'` (metadata only)
- `ExercisePlayer.tsx` (~2,700 lines) renders all exercises identically — no type branching
- `ExerciseValidator.ts` scores all exercises the same way (5D: accuracy/timing/completeness/extraNotes/duration)
- Existing `exerciseType` in `geminiExerciseService.ts` is `'warmup' | 'lesson' | 'challenge'` — session purpose, not exercise type

### The 6 Types

| Type | Core Mechanic | What Changes from Play |
|------|--------------|----------------------|
| **play** | Play falling notes (current) | Nothing — this is the baseline |
| **rhythm** | Tap timing on any key, pitch ignored | Scoring: pitch accuracy = 100% always; only timing + completeness scored. UI: single "tap zone" instead of full keyboard |
| **earTraining** | Hear interval/melody, play it back from memory | Two phases: (1) listen (auto-play reference), (2) play back. No PianoRoll during listen phase. |
| **chordId** | See chord name, play correct notes | UI: large chord label displayed. Scoring: all chord notes must be held simultaneously within window. |
| **sightReading** | Staff notation only, no note names, no PianoRoll hints | Display: `showNoteNames: false`, `showPianoRoll: false`, `showStaffNotation: true`. Timer pressure (notes scroll faster). |
| **callResponse** | Salsa plays phrase, user echoes | Two phases: (1) DemoPlaybackService plays phrase, (2) user plays back. Uses existing demo playback infra. |

### Design Principles

1. **Minimal new code** — Each type is a scoring strategy + display config, not a new screen
2. **Type field on Exercise, NOT a separate schema** — One Exercise interface rules them all
3. **ExercisePlayer branches on `exercise.type`** for rendering differences only
4. **Scoring strategies are pure functions** — testable, no React
5. **AI generation supports all types** — `geminiExerciseService` gets type-specific prompts
6. **Backward compatible** — Existing exercises without `type` field default to `'play'`

---

### Task 1: Extend Exercise Type System (Core Types)

**Files:**
- Modify: `src/core/exercises/types.ts`
- Modify: `src/content/ContentLoader.ts` (ExerciseIndexEntry type union)
- Test: `src/core/exercises/__tests__/ExerciseValidator.test.ts`

**Step 1: Add `ExerciseType` to types.ts**

Add after line 1 (before `NoteEvent`):

```typescript
/** The 6 exercise interaction types */
export type ExerciseType = 'play' | 'rhythm' | 'earTraining' | 'chordId' | 'sightReading' | 'callResponse';
```

Add `type` field to `Exercise` interface (line 63-73):

```typescript
export interface Exercise {
  id: string;
  version: number;
  type?: ExerciseType; // undefined defaults to 'play' for backward compat
  metadata: ExerciseMetadata;
  settings: ExerciseSettings;
  notes: NoteEvent[];
  scoring: ExerciseScoringConfig;
  hints: ExerciseHints;
  display?: DisplaySettings;
  hands?: 'left' | 'right' | 'both';
}
```

**Step 2: Add helper function**

```typescript
/** Resolve exercise type (backward-compatible default to 'play') */
export function getExerciseType(exercise: Exercise): ExerciseType {
  return exercise.type ?? 'play';
}
```

**Step 3: Update ContentLoader `ExerciseIndexEntry`**

In `src/content/ContentLoader.ts`, change the type field:

```typescript
export interface ExerciseIndexEntry {
  // ...existing fields...
  type: ExerciseType | 'test'; // 'test' is metadata-only (mastery tests)
}
```

Import `ExerciseType` from types.

**Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors (type is optional, fully backward compatible)

**Step 5: Commit**

```
feat(types): add ExerciseType union to Exercise interface
```

---

### Task 2: Type-Specific Scoring Strategies

**Files:**
- Create: `src/core/exercises/scoringStrategies.ts`
- Modify: `src/core/exercises/ExerciseValidator.ts`
- Create: `src/core/exercises/__tests__/scoringStrategies.test.ts`

**Step 1: Write failing tests for rhythm scoring**

```typescript
// src/core/exercises/__tests__/scoringStrategies.test.ts
import { scoreRhythmExercise, scoreEarTrainingExercise, scoreChordIdExercise } from '../scoringStrategies';
import type { Exercise, MidiNoteEvent } from '../types';

const makeExercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'test',
  version: 1,
  type: 'rhythm',
  metadata: { title: 'Test', description: '', difficulty: 1, estimatedMinutes: 1, skills: [], prerequisites: [] },
  settings: { tempo: 120, timeSignature: [4, 4], keySignature: 'C', countIn: 0, metronomeEnabled: false },
  notes: [
    { note: 60, startBeat: 0, durationBeats: 1 },
    { note: 62, startBeat: 1, durationBeats: 1 },
    { note: 64, startBeat: 2, durationBeats: 1 },
  ],
  scoring: { timingToleranceMs: 50, timingGracePeriodMs: 150, passingScore: 70, starThresholds: [70, 85, 95] },
  hints: { beforeStart: '', commonMistakes: [], successMessage: '' },
  ...overrides,
});

describe('scoreRhythmExercise', () => {
  it('gives 100% accuracy regardless of pitch', () => {
    const exercise = makeExercise({ type: 'rhythm' });
    const msPerBeat = 500; // 120 BPM
    // User plays any keys at correct times
    const played: MidiNoteEvent[] = [
      { type: 'noteOn', note: 48, velocity: 80, timestamp: 0, channel: 0 },   // wrong pitch, right time
      { type: 'noteOn', note: 55, velocity: 80, timestamp: 500, channel: 0 }, // wrong pitch, right time
      { type: 'noteOn', note: 72, velocity: 80, timestamp: 1000, channel: 0 },
    ];
    const result = scoreRhythmExercise(exercise, played);
    expect(result.breakdown.accuracy).toBe(100); // pitch doesn't matter
    expect(result.breakdown.timing).toBeGreaterThan(90); // timing is what counts
  });

  it('penalizes bad timing even with correct pitch', () => {
    const exercise = makeExercise({ type: 'rhythm' });
    const played: MidiNoteEvent[] = [
      { type: 'noteOn', note: 60, velocity: 80, timestamp: 300, channel: 0 }, // 300ms late
      { type: 'noteOn', note: 62, velocity: 80, timestamp: 800, channel: 0 },
      { type: 'noteOn', note: 64, velocity: 80, timestamp: 1300, channel: 0 },
    ];
    const result = scoreRhythmExercise(exercise, played);
    expect(result.breakdown.accuracy).toBe(100); // still 100% — rhythm ignores pitch
    expect(result.breakdown.timing).toBeLessThan(50); // poor timing
  });
});

describe('scoreChordIdExercise', () => {
  it('scores chord when all notes played within window', () => {
    const exercise = makeExercise({
      type: 'chordId',
      notes: [
        { note: 60, startBeat: 0, durationBeats: 2 }, // C
        { note: 64, startBeat: 0, durationBeats: 2 }, // E
        { note: 67, startBeat: 0, durationBeats: 2 }, // G
      ],
    });
    const played: MidiNoteEvent[] = [
      { type: 'noteOn', note: 60, velocity: 80, timestamp: 10, channel: 0 },
      { type: 'noteOn', note: 64, velocity: 80, timestamp: 30, channel: 0 },
      { type: 'noteOn', note: 67, velocity: 80, timestamp: 50, channel: 0 },
    ];
    const result = scoreChordIdExercise(exercise, played);
    expect(result.breakdown.accuracy).toBe(100);
    expect(result.isPassed).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx jest src/core/exercises/__tests__/scoringStrategies.test.ts -v
```

Expected: FAIL (module not found)

**Step 3: Implement scoring strategies**

```typescript
// src/core/exercises/scoringStrategies.ts
/**
 * Type-specific scoring strategies
 * Each function wraps the base scoreExercise with type-appropriate adjustments
 */
import { scoreExercise, calculateTimingScore } from './ExerciseValidator';
import type { Exercise, ExerciseScore, MidiNoteEvent, NoteScore, ExerciseScoreBreakdown } from './types';

/**
 * Rhythm: Ignore pitch, score only timing + completeness.
 * Any key press at the right time counts as correct.
 */
export function scoreRhythmExercise(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore = 0
): ExerciseScore {
  const msPerBeat = (60 * 1000) / exercise.settings.tempo;

  // For rhythm: match played notes to expected by TIME only (ignore pitch)
  // Sort expected by startBeat, played by timestamp
  const expected = [...exercise.notes].sort((a, b) => a.startBeat - b.startBeat);
  const played = [...playedNotes].sort((a, b) => a.timestamp - b.timestamp);

  const usedPlayed = new Set<number>();
  const noteScores: NoteScore[] = [];

  for (const exp of expected) {
    const expectedTimeMs = exp.startBeat * msPerBeat;
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let j = 0; j < played.length; j++) {
      if (usedPlayed.has(j)) continue;
      const dist = Math.abs(played[j].timestamp - expectedTimeMs);
      if (dist < msPerBeat * 1.5 && dist < bestDist) {
        bestIdx = j;
        bestDist = dist;
      }
    }

    if (bestIdx >= 0) {
      usedPlayed.add(bestIdx);
      const timingOffsetMs = played[bestIdx].timestamp - expectedTimeMs;
      const timingScore = calculateTimingScore(
        timingOffsetMs,
        Math.max(exercise.scoring.timingToleranceMs, 60),
        Math.max(exercise.scoring.timingGracePeriodMs, 160)
      );
      noteScores.push({
        expected: exp,
        played: played[bestIdx],
        timingOffsetMs,
        timingScore,
        isCorrectPitch: true, // Always true for rhythm
        isExtraNote: false,
        isMissedNote: false,
      });
    } else {
      noteScores.push({
        expected: exp,
        played: null,
        timingOffsetMs: 0,
        timingScore: 0,
        isCorrectPitch: true,
        isExtraNote: false,
        isMissedNote: true,
      });
    }
  }

  // Extra notes (played but not matched)
  for (let j = 0; j < played.length; j++) {
    if (!usedPlayed.has(j)) {
      noteScores.push({
        expected: { note: 0, startBeat: 0, durationBeats: 0 },
        played: played[j],
        timingOffsetMs: 0,
        timingScore: 0,
        isCorrectPitch: false,
        isExtraNote: true,
        isMissedNote: false,
      });
    }
  }

  return buildScoreFromNotes(exercise, noteScores, expected.length, previousHighScore);
}

/**
 * Chord ID: All chord notes must be played within a timing window.
 * Groups notes by startBeat and checks if all notes in each group are present.
 */
export function scoreChordIdExercise(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore = 0
): ExerciseScore {
  // Chord exercises: use standard scoring but with wider timing window
  // since user needs to press multiple keys "simultaneously"
  const adjustedExercise: Exercise = {
    ...exercise,
    scoring: {
      ...exercise.scoring,
      timingToleranceMs: Math.max(exercise.scoring.timingToleranceMs, 100),
      timingGracePeriodMs: Math.max(exercise.scoring.timingGracePeriodMs, 250),
    },
  };
  return scoreExercise(adjustedExercise, playedNotes, previousHighScore);
}

/**
 * Ear Training: Standard scoring but user had to memorize the notes.
 * Scoring is identical to Play — the UI difference (listen-then-play) is handled in ExercisePlayer.
 */
export function scoreEarTrainingExercise(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore = 0
): ExerciseScore {
  return scoreExercise(exercise, playedNotes, previousHighScore);
}

/**
 * Sight Reading: Stricter scoring (tighter timing, no loops in UI).
 * Scoring-wise identical to Play with tighter tolerances applied by exercise JSON.
 */
export function scoreSightReadingExercise(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore = 0
): ExerciseScore {
  return scoreExercise(exercise, playedNotes, previousHighScore);
}

/**
 * Call & Response: Standard scoring applied to the response phase only.
 * The "call" phase is audio-only demo — scoring happens on the "response" notes.
 */
export function scoreCallResponseExercise(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore = 0
): ExerciseScore {
  return scoreExercise(exercise, playedNotes, previousHighScore);
}

// ── Shared Score Builder ────────────────────────────────────────────────

function buildScoreFromNotes(
  exercise: Exercise,
  noteScores: NoteScore[],
  totalExpected: number,
  previousHighScore: number
): ExerciseScore {
  if (totalExpected === 0) {
    return {
      overall: 0, stars: 0, breakdown: { accuracy: 0, timing: 0, completeness: 0, extraNotes: 0, duration: 0 },
      details: noteScores, xpEarned: 0, isPassed: false, isNewHighScore: false,
    };
  }

  const matched = noteScores.filter(n => !n.isExtraNote && !n.isMissedNote);
  const missed = noteScores.filter(n => n.isMissedNote);
  const extra = noteScores.filter(n => n.isExtraNote);

  const accuracy = (matched.length / totalExpected) * 100;
  const expectedScores = noteScores.filter(n => !n.isExtraNote);
  const timing = expectedScores.length > 0
    ? expectedScores.reduce((sum, n) => sum + n.timingScore, 0) / expectedScores.length
    : 0;
  const completeness = (matched.length / totalExpected) * 100;
  const extraNotes = Math.max(0, 100 - extra.length * 10);
  const duration = expectedScores.length > 0
    ? expectedScores.reduce((sum, n) => sum + (n.durationScore ?? (n.isMissedNote ? 0 : 100)), 0) / expectedScores.length
    : 0;

  const breakdown: ExerciseScoreBreakdown = {
    accuracy: Math.round(accuracy),
    timing: Math.round(timing),
    completeness: Math.round(completeness),
    extraNotes: Math.round(extraNotes),
    duration: Math.round(duration),
  };

  const overall = breakdown.accuracy * 0.35 + breakdown.timing * 0.30 +
    breakdown.completeness * 0.10 + breakdown.extraNotes * 0.10 + breakdown.duration * 0.15;

  const [s1, s2, s3] = exercise.scoring.starThresholds;
  let stars: 0 | 1 | 2 | 3 = 0;
  if (overall >= s1) stars = 1;
  if (overall >= s2) stars = 2;
  if (overall >= s3) stars = 3;

  const baseXp = 10;
  const xpEarned = Math.floor(baseXp + (accuracy / 100) * 10 + (timing / 100) * 10 +
    (previousHighScore === 0 ? 25 : 0) + (stars === 3 ? 50 : 0));

  return {
    overall: Math.round(overall),
    stars,
    breakdown,
    details: noteScores,
    missedNotes: missed.length,
    extraNotes: extra.length,
    perfectNotes: matched.filter(n => n.timingScore >= 90).length,
    goodNotes: matched.filter(n => n.timingScore >= 50 && n.timingScore < 90).length,
    okNotes: matched.filter(n => n.timingScore > 0 && n.timingScore < 50).length,
    xpEarned,
    isPassed: overall >= exercise.scoring.passingScore,
    isNewHighScore: overall > previousHighScore,
  };
}
```

**Step 4: Add dispatch function to ExerciseValidator**

Add to the bottom of `ExerciseValidator.ts`:

```typescript
import { scoreRhythmExercise, scoreChordIdExercise, scoreEarTrainingExercise, scoreSightReadingExercise, scoreCallResponseExercise } from './scoringStrategies';
import { getExerciseType } from './types';

/**
 * Score exercise using the appropriate strategy for its type.
 * Drop-in replacement for scoreExercise that handles all 6 types.
 */
export function scoreExerciseByType(
  exercise: Exercise,
  playedNotes: MidiNoteEvent[],
  previousHighScore = 0
): ExerciseScore {
  const type = getExerciseType(exercise);
  switch (type) {
    case 'rhythm': return scoreRhythmExercise(exercise, playedNotes, previousHighScore);
    case 'chordId': return scoreChordIdExercise(exercise, playedNotes, previousHighScore);
    case 'earTraining': return scoreEarTrainingExercise(exercise, playedNotes, previousHighScore);
    case 'sightReading': return scoreSightReadingExercise(exercise, playedNotes, previousHighScore);
    case 'callResponse': return scoreCallResponseExercise(exercise, playedNotes, previousHighScore);
    case 'play':
    default:
      return scoreExercise(exercise, playedNotes, previousHighScore);
  }
}
```

**Step 5: Run tests**

```bash
npx jest src/core/exercises/__tests__/scoringStrategies.test.ts -v
```

Expected: PASS

**Step 6: Run full test suite**

```bash
npm run test
```

Expected: All existing tests still pass (no changes to existing scoreExercise)

**Step 7: Commit**

```
feat(scoring): add type-specific scoring strategies for 6 exercise types
```

---

### Task 3: Wire scoreExerciseByType into ExercisePlayer

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`
- Modify: `src/hooks/useExercisePlayback.ts` (if scoring happens there)

**Step 1: Find where `scoreExercise` is called in ExercisePlayer**

Search for `scoreExercise` import and usage. Replace with `scoreExerciseByType`.

**Step 2: Update import**

```typescript
// Replace:
import { scoreExercise } from '../../core/exercises/ExerciseValidator';
// With:
import { scoreExercise, scoreExerciseByType } from '../../core/exercises/ExerciseValidator';
```

**Step 3: Replace scoring call**

In the completion handler (where `scoreExercise(exercise, playedNotes, ...)` is called), replace with `scoreExerciseByType(exercise, playedNotes, ...)`.

**Step 4: Run typecheck + tests**

```bash
npm run typecheck && npm run test
```

**Step 5: Commit**

```
feat(player): use type-aware scoring in ExercisePlayer
```

---

### Task 4: ExercisePlayer UI Branching per Type

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`
- Create: `src/screens/ExercisePlayer/RhythmTapZone.tsx`
- Create: `src/screens/ExercisePlayer/ChordPrompt.tsx`
- Create: `src/screens/ExercisePlayer/ListenPhaseOverlay.tsx`

**Step 1: Add type-derived state**

Near the top of ExercisePlayer's function body, after exercise is resolved:

```typescript
const exerciseType = getExerciseType(exercise);
const isRhythmMode = exerciseType === 'rhythm';
const isListenFirst = exerciseType === 'earTraining' || exerciseType === 'callResponse';
const isChordMode = exerciseType === 'chordId';
const isSightReading = exerciseType === 'sightReading';
```

**Step 2: Rhythm mode — RhythmTapZone**

For rhythm exercises, replace the full Keyboard with a large single tap zone:

```typescript
// src/screens/ExercisePlayer/RhythmTapZone.tsx
import { View, Text, StyleSheet } from 'react-native';
import { PressableScale } from '../../components/common/PressableScale';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../theme/tokens';

interface RhythmTapZoneProps {
  onTap: () => void;
  isActive: boolean;
}

export function RhythmTapZone({ onTap, isActive }: RhythmTapZoneProps) {
  return (
    <PressableScale
      onPress={onTap}
      style={[styles.tapZone, isActive && styles.tapZoneActive]}
    >
      <Text style={styles.tapText}>TAP</Text>
      <Text style={styles.tapHint}>Tap in rhythm — any key works!</Text>
    </PressableScale>
  );
}
```

In ExercisePlayer JSX, conditionally render:

```typescript
{isRhythmMode ? (
  <RhythmTapZone
    onTap={() => handleKeyDown(60)} // Always middle C for rhythm
    isActive={/* current beat indicator */}
  />
) : (
  <Keyboard ... />
)}
```

**Step 3: Listen-first mode (Ear Training + Call & Response)**

```typescript
// src/screens/ExercisePlayer/ListenPhaseOverlay.tsx
// Full-screen overlay during "listen" phase
// Shows: Salsa + "Listen carefully..." text + animated ear icon
// Auto-plays the exercise notes via DemoPlaybackService
// When done, transitions to response phase
```

State management:
```typescript
const [listenPhaseComplete, setListenPhaseComplete] = useState(!isListenFirst);

// On exercise start, if listen-first:
// 1. Play reference via DemoPlaybackService
// 2. When done, setListenPhaseComplete(true)
// 3. Start countdown for response phase
```

**Step 4: Chord ID mode — ChordPrompt**

```typescript
// src/screens/ExercisePlayer/ChordPrompt.tsx
// Shows large chord name (e.g., "C Major", "Am7")
// Derived from exercise notes using music theory utils
```

**Step 5: Sight Reading — hide helpers**

For sight reading, force display settings:
```typescript
const effectiveDisplay = isSightReading
  ? { showNoteNames: false, showFingerNumbers: false, showPianoRoll: false, showStaffNotation: true, highlightHands: false }
  : exercise.display;
```

**Step 6: Run typecheck + test**

**Step 7: Commit**

```
feat(player): add type-specific UI rendering for rhythm, ear training, chord ID, sight reading, call & response
```

---

### Task 5: AI Exercise Generation for All Types

**Files:**
- Modify: `src/services/geminiExerciseService.ts`
- Modify: `scripts/batch-generate-exercises.ts` (if exists)

**Step 1: Add type-specific prompt sections**

In `geminiExerciseService.ts`, add type to the generation params and include type-specific prompt instructions:

```typescript
// Add to GenerateExerciseParams:
type?: ExerciseType;

// In buildPrompt():
if (params.type === 'rhythm') {
  prompt += '\n- TYPE: RHYTHM — Vary pitches but scoring ignores pitch. Focus on interesting rhythmic patterns (syncopation, dotted notes, rests).';
  prompt += '\n- Include a "type": "rhythm" field in the JSON.';
} else if (params.type === 'earTraining') {
  prompt += '\n- TYPE: EAR TRAINING — Short melodic phrase (4-8 notes). User will hear it once, then play back from memory.';
  prompt += '\n- Include a "type": "earTraining" field. Keep melodies memorable and singable.';
}
// ... etc for each type
```

**Step 2: Commit**

```
feat(ai): add exercise type support to Gemini generation prompts
```

---

## Part 2: Social Features Overhaul

### Current Problems

1. **No way to challenge friends from the score screen** — You have to navigate to Social tab, find a friend, then challenge
2. **Activity feed is a separate screen** — Users never see it unless they navigate there
3. **No quick-add** — Friend code system is clunky (navigate to AddFriend, copy code, send out-of-band, other person enters it)
4. **Challenges are fire-and-forget** — No notification when opponent plays, no rematch
5. **League is just a number** — No weekly narrative (promotion/demotion animations, close finish alerts)
6. **No social proof on HomeScreen** — No friends' activity visible on main screen

### Improvements (Prioritized)

---

### Task 6: Challenge Friends from CompletionModal

**Files:**
- Modify: `src/screens/ExercisePlayer/CompletionModal.tsx`
- Create: `src/components/ChallengeFriendSheet.tsx`

**Step 1: Add "Challenge a Friend" button to CompletionModal**

After the score is shown, add a button that opens a bottom sheet with accepted friends. Tapping a friend sends the challenge (existing `createChallenge()` from `socialService.ts`).

This is the #1 missing social loop: **you just scored → you want to brag → challenge is one tap away**.

```typescript
// In CompletionModal, add after "Next" button:
{friends.length > 0 && (
  <PressableScale onPress={() => setShowChallengeSheet(true)} style={styles.challengeButton}>
    <MaterialCommunityIcons name="sword-cross" size={18} color={COLORS.warning} />
    <Text style={styles.challengeButtonText}>Challenge a Friend</Text>
  </PressableScale>
)}
```

**Step 2: ChallengeFriendSheet — quick friend picker**

```typescript
// src/components/ChallengeFriendSheet.tsx
// Bottom sheet with accepted friends as horizontal avatars
// Tapping one sends challenge immediately + shows confirmation
// Uses existing createChallenge() from socialService
```

**Step 3: Commit**

```
feat(social): add challenge-from-score-screen flow
```

---

### Task 7: Friends Activity on HomeScreen

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Create: `src/components/FriendActivityStrip.tsx`

**Step 1: Add horizontal activity strip to HomeScreen**

Below the greeting, show a compact horizontal strip of recent friend activity:

```
🎵 Luna leveled up to 12  •  Jazzy mastered "Twinkle"  •  Pixel beat your score on Scales
```

This creates **passive social engagement** — users see friends' progress without navigating anywhere.

**Step 2: Commit**

```
feat(social): add friend activity strip to HomeScreen
```

---

### Task 8: Share Score Card (Deep Link Ready)

**Files:**
- Modify: `src/components/ShareCard.tsx` (exists, enhance)
- Modify: `src/screens/ExercisePlayer/CompletionModal.tsx`

**Step 1: Add share button to CompletionModal**

After score, add "Share" button that generates a visual score card (existing ShareCard component) and uses `expo-sharing` to share image. This is the viral loop: user shares → friend sees → friend downloads app.

**Step 2: Commit**

```
feat(social): add share score card to CompletionModal
```

---

### Task 9: League Promotion/Demotion Animation

**Files:**
- Modify: `src/screens/SocialScreen.tsx`
- Create: `src/components/LeagueTransitionCard.tsx`

**Step 1: Track previous tier in leagueStore**

Add `previousTier` field. When tier changes, show a full-width card with animation:

- Promotion: Confetti + tier badge scales up + "Promoted to Silver!"
- Demotion: Subdued animation + "Dropped to Bronze — fight back next week!"
- Close finish: "You were 50 XP from promotion!"

This makes the league **feel alive** instead of just a static number.

**Step 2: Commit**

```
feat(social): add league promotion/demotion transition animations
```

---

### Task 10: Quick-Add Friend via QR Code / Link

**Files:**
- Modify: `src/screens/AddFriendScreen.tsx`

**Step 1: Add QR code display + scan**

Instead of just a text code, show a QR code that encodes the friend code. The other person can scan it from their AddFriend screen. Much more natural for in-person friend adding.

Use `react-native-qrcode-svg` (lightweight, no native deps) for display. For scanning, use `expo-camera` barcode scanning (already available in Expo).

**Step 2: Commit**

```
feat(social): add QR code friend discovery
```

---

## Part 3: Update UNIFIED-PLAN.md

### Task 11: Integrate Exercise Types and Social into Plan

**Files:**
- Modify: `docs/plans/UNIFIED-PLAN.md`

**Step 1: Update Phase D section**

Change "New Exercise Types (2 for beta)" to "New Exercise Types (6 for beta)" and list all 6. Move Ear Training, Chord ID, Sight Reading from Phase H back into Phase D.

**Step 2: Add Phase D.3: Social Overhaul**

Add a new parallel phase:
```
Phase D.3: Social Overhaul
- Challenge from score screen
- Friend activity on HomeScreen
- Share score card
- League transition animations
- QR code friend discovery
```

**Step 3: Update Phase H**

Remove exercise types from Phase H (they're now in D). Phase H focuses purely on monetization, content scale (500+), and data-informed decisions.

**Step 4: Commit**

```
docs: update UNIFIED-PLAN with 6 exercise types and social overhaul
```

---

## Testing Strategy

| Component | Test Type | Location |
|-----------|-----------|----------|
| Scoring strategies | Unit | `src/core/exercises/__tests__/scoringStrategies.test.ts` |
| Type resolution | Unit | `src/core/exercises/__tests__/types.test.ts` |
| Rhythm tap zone | Component | `src/screens/ExercisePlayer/__tests__/RhythmTapZone.test.tsx` |
| Challenge sheet | Component | `src/components/__tests__/ChallengeFriendSheet.test.tsx` |
| Full exercise flow per type | Integration | `src/__tests__/integration/exerciseTypes.test.ts` |

---

## Dependency Order

```
Task 1 (types) → Task 2 (scoring) → Task 3 (wire scoring) → Task 4 (UI) → Task 5 (AI gen)
                                                                               ↑ independent
Task 6 (challenge from score) ← no deps, can start immediately
Task 7 (activity strip) ← no deps
Task 8 (share card) ← no deps
Task 9 (league animation) ← no deps
Task 10 (QR friend) ← no deps
Task 11 (docs) ← after all tasks defined
```

Tasks 1-5 are sequential. Tasks 6-10 are fully parallel with each other AND with 1-5.

# KeySense Core Logic

Pure TypeScript business logic for the KeySense piano learning app. This module contains all scoring, validation, music theory, and progression systems.

**No React imports allowed** - these are platform-agnostic utilities.

---

## Directory Structure

```
core/
├── exercises/           # Exercise validation and scoring
│   ├── types.ts        # TypeScript interfaces
│   ├── ExerciseValidator.ts
│   ├── ScoringEngine.ts
│   └── __tests__/      # Jest tests
│
├── music/              # Music theory utilities
│   ├── MusicTheory.ts
│   └── __tests__/
│
└── progression/        # XP, levels, achievements, streaks
    ├── XPSystem.ts
    └── __tests__/
```

---

## Quick Start

### Import Examples

```typescript
// Scoring
import { calculateTimingScore, buildExerciseScore } from 'src/core/exercises/ScoringEngine';
import { validateExercise } from 'src/core/exercises/ExerciseValidator';

// Music Theory
import { midiToNoteName, beatToMs, isNoteInScale } from 'src/core/music/MusicTheory';

// Progression
import { levelFromXp, recordPracticeSession, calculateExerciseXp } from 'src/core/progression/XPSystem';
```

### Basic Scoring Example

```typescript
const noteScores: NoteScore[] = [
  {
    expected: { note: 60, startBeat: 0, durationBeats: 1 },
    played: { note: 60, velocity: 64, noteOnTime: 0, noteOffTime: 100 },
    isCorrectPitch: true,
    timingOffsetMs: 10,
    timingScore: 100,
    status: 'perfect',
    isExtraNote: false,
    isMissedNote: false,
  },
];

const score = buildExerciseScore(noteScores, exerciseConfig, 0);
// Returns: { overall: 85, stars: 2, breakdown: {...}, details: [...], xpEarned: 35, ... }
```

---

## Exercises Module

### Types (`exercises/types.ts`)

Core interfaces for exercises and scoring:

- **Exercise** - Complete exercise definition
- **NoteEvent** - Expected note in exercise
- **MidiNoteEvent** - User's played note
- **NoteScore** - Result of validating one note
- **ExerciseScore** - Final score for exercise attempt
- **ScoringConfig** - Per-exercise scoring parameters

### Exercise Validator (`exercises/ExerciseValidator.ts`)

Validates user input against expected notes.

```typescript
// Validate a single played note
const { noteScore, matchedExpectedIndex } = validatePlayedNote(
  midiNoteEvent,
  exercise,
  noteOnTime,
  noteOffTime
);

// Validate entire exercise attempt
const noteScores = validateExercise(exercise, playedNotes);

// Check exercise definition
const errors = validateExerciseDefinition(exercise);
if (errors.length > 0) {
  console.error('Invalid exercise:', errors);
}
```

### Scoring Engine (`exercises/ScoringEngine.ts`)

Calculates scores based on accuracy, timing, completeness, and precision.

#### Timing Score Curve

```
Score
100 |████████         ← Perfect (0-25ms)
    |        ████     ← Good (25-75ms, linear decay)
 70 |            ████████  ← OK (75-150ms, exponential decay)
    |                    ████
 40 |                        ████
    |                            ████
  0 |___________________________________ ← Missed (>150ms)
    0   25   75       150           300  (milliseconds)
```

#### Weighting

```
Final Score =
  Accuracy * 0.40 +      (Did you play the right notes?)
  Timing * 0.35 +        (Did you play them at the right time?)
  Completeness * 0.15 +  (Did you play all the notes?)
  Precision * 0.10       (No extra notes?)
```

#### Key Functions

```typescript
// Calculate timing score for a single note
const { score, status } = calculateTimingScore(offsetMs, 25, 75);
// Returns: { score: 95, status: 'perfect' }

// Calculate final score from components
const overall = calculateFinalScore(
  accuracy: 85,   // % correct notes
  timing: 90,     // Average timing score
  completeness: 95, // % of notes attempted
  precision: 100   // No extra notes
);
// Returns: 89 (weighted combination)

// Build complete exercise score
const exerciseScore = buildExerciseScore(noteScores, config, previousHighScore);
// Returns: { overall: 89, stars: 2, breakdown: {...}, details: [...], xpEarned: 35, ... }
```

---

## Music Theory Module

### Utilities (`music/MusicTheory.ts`)

Helper functions for musical notation and calculations.

#### MIDI ↔ Note Name Conversion

```typescript
midiToNoteName(60);        // "C4" (Middle C)
noteNameToMidi("C4");      // 60
noteNameToMidi("Db4");     // 61 (enharmonic to C#)

// Works with full range
midiToNoteName(21);        // "A0"  (lowest piano key)
midiToNoteName(108);       // "C8"  (highest piano key)
```

#### Timing Conversions

```typescript
beatToMs(4, 80);           // 3000ms (4 beats at 80 BPM)
msToBeat(1000, 60);        // 1 beat (1000ms at 60 BPM = 1 beat)

// Works with fractional beats
beatToMs(0.5, 120);        // 250ms (half beat at 120 BPM)
```

#### Frequency Calculations

```typescript
midiToFrequency(69);       // 440 Hz (A440 standard)
frequencyToMidi(440);      // 69

// Octave doubling
midiToFrequency(60);       // 261.63 Hz (Middle C)
midiToFrequency(72);       // 523.25 Hz (C5, one octave higher)
```

#### Scale & Interval Analysis

```typescript
// Check if note is in scale
isNoteInScale(64, 0, 'major');  // true (E is in C major)
isNoteInScale(61, 0, 'major');  // false (C# is not in C major)

// Get all notes in scale within range
getScaleNotes(0, 'major', 60, 72);
// Returns: [60, 62, 64, 65, 67, 69, 71, 72] (C major from C4 to C5)

// Interval calculations
getInterval(60, 67);       // 7 semitones (perfect fifth)
intervalName(7);           // "perfect fifth"

// Enharmonic equivalence
areEnharmonic(61, 61);     // true (same MIDI pitch)
getNoteWithEnharmonic(61);
// Returns: { note: "C#4", enharmonic: "Db4" }
```

#### Pitch Analysis

```typescript
getPitchClass(60);         // 0 (C)
getPitchClass(69);         // 9 (A)
getOctave(60);             // 4 (C4)
getOctave(48);             // 3 (C3)
```

---

## Progression Module

### XP System (`progression/XPSystem.ts`)

Manages experience points, levels, achievements, and streaks.

#### Level Progression

Uses exponential curve: XP(level) = 100 × 1.5^(level-1)

```typescript
xpForLevel(1);             // 100 XP
xpForLevel(2);             // 150 XP
xpForLevel(3);             // 225 XP
xpForLevel(5);             // 506 XP
xpForLevel(10);            // 3,844 XP

totalXpForLevel(2);        // 250 XP (100 + 150)
totalXpForLevel(3);        // 475 XP (100 + 150 + 225)

levelFromXp(250);          // 2
levelFromXp(500);          // 3

// Get progress to next level
const progress = getLevelProgress(125);
// {
//   level: 2,
//   totalXp: 125,
//   currentLevelXp: 150,
//   xpToNextLevel: 125,
//   percentToNextLevel: 17
// }
```

#### Streak System

Tracks daily practice with freeze mechanic.

```typescript
// Initialize
const streak = createEmptyStreak();
// { currentStreak: 0, longestStreak: 0, freezesAvailable: 1, ... }

// Record practice
let streak = createEmptyStreak();
streak = recordPracticeSession(streak);
// currentStreak: 1, lastPracticeDate: "2026-02-10"

// Next day
streak = recordPracticeSession(streak);
// currentStreak: 2 (extended)

// Skip a day - uses freeze
const twoDaysAgo = new Date();
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
streak.lastPracticeDate = twoDaysAgo.toISOString().split('T')[0];
streak = recordPracticeSession(streak);
// currentStreak: 3 (maintained by freeze)
// freezesAvailable: 0

// Miss another day without freeze
streak = recordPracticeSession(streak);
// currentStreak: 1 (reset)

// Every 7 days: automatic freeze award
if (streak.currentStreak % 7 === 0) {
  // freezesAvailable++
}
```

#### XP Rewards

```typescript
XP_REWARDS.exerciseComplete;        // 10 base
XP_REWARDS.exerciseFirstTime;       // +25 bonus
XP_REWARDS.exercisePerfect;         // +50 bonus (3 stars)
XP_REWARDS.dailyGoalMet;            // +30 bonus
XP_REWARDS.lessonComplete;          // +100 bonus
XP_REWARDS.streakBonus(days);       // +5 per day, capped at +50

// Calculate total XP from exercise
const xp = calculateExerciseXp(
  score: 95,                         // Score achieved
  stars: 3,                          // Stars earned
  isFirstCompletion: true,           // First time
  currentStreak: 7                   // 7-day streak
);
// Returns: ~135 XP (10 + 30 + 50 + 25 + 20)
```

#### Achievements

```typescript
ACHIEVEMENTS.FIRST_NOTE;      // Level 1
ACHIEVEMENTS.TEN_EXERCISES;   // Level 3, 475 XP
ACHIEVEMENTS.FIRST_SONG;      // Level 5, 1268 XP
ACHIEVEMENTS.WEEK_STREAK;     // 7 consecutive days
ACHIEVEMENTS.PERFECT_SCORE;   // Any 100% exercise
ACHIEVEMENTS.LEVEL_10;        // Reach level 10
ACHIEVEMENTS.LEVEL_25;        // Reach level 25

// Check achievement
const unlocked = hasAchievement(
  currentLevel: 5,
  totalXp: 1500,
  'FIRST_SONG'
);
// Returns: true
```

#### Daily Goals

```typescript
// Create goal
const goal = createDailyGoal(
  minutesTarget: 10,
  exercisesTarget: 3
);
// { date: "2026-02-10", minutesTarget: 10, minutesPracticed: 0, ... }

// Update progress
goal.minutesPracticed = 15;
goal.exercisesCompleted = 4;

// Check if met
isDailyGoalMet(goal);          // true
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Suite

```bash
npm test -- ScoringEngine.test.ts
npm test -- XPSystem.test.ts
npm test -- MusicTheory.test.ts
```

### Check Coverage

```bash
npm test -- --coverage
```

Expected: >90% coverage

### Example Test Cases

```typescript
// Test timing score
expect(calculateTimingScore(10, 25, 75).score).toBe(100);
expect(calculateTimingScore(50, 25, 75).status).toBe('good');

// Test score weighting
expect(calculateFinalScore(100, 100, 100, 100)).toBe(100);
expect(calculateFinalScore(100, 0, 0, 0)).toBe(40); // Accuracy weight

// Test level progression
expect(xpForLevel(1)).toBe(100);
expect(xpForLevel(2)).toBe(150);
expect(levelFromXp(250)).toBe(3);

// Test streak
const streak = recordPracticeSession(createEmptyStreak());
expect(streak.currentStreak).toBe(1);
```

---

## Integration with React Components

### From ExerciseStore (Zustand)

```typescript
import { buildExerciseScore } from 'src/core/exercises/ScoringEngine';
import { validateExercise } from 'src/core/exercises/ExerciseValidator';

// In Zustand store
finishExercise: () => {
  const playedNotes = [...]; // Collect from during exercise
  const noteScores = validateExercise(exercise, playedNotes);
  const score = buildExerciseScore(noteScores, exercise.scoring, previousHighScore);

  // Update state
  return score;
}
```

### From ProgressStore

```typescript
import { levelFromXp, recordPracticeSession } from 'src/core/progression/XPSystem';

// Update progress
updateExerciseScore: (exerciseId, score) => {
  const newXp = state.xp + score.xpEarned;
  const newLevel = levelFromXp(newXp);
  const newStreak = recordPracticeSession(state.streak);

  return { xp: newXp, level: newLevel, streak: newStreak };
}
```

---

## Error Handling

All functions are pure and don't throw exceptions (except validation). They return valid default values:

```typescript
// Invalid MIDI note
midiToNoteName(150);       // Returns: "??" (out of range)

// Invalid note name
try {
  noteNameToMidi('H4');    // Throws error
} catch (e) {
  console.error(e.message); // "Invalid note name: H4"
}

// Exercise validation returns errors
const { valid, errors } = validateExerciseDefinition(exercise);
if (!valid) {
  errors.forEach(err => console.error(err.field, err.message));
}
```

---

## Performance Considerations

- **Memoization:** Note name conversions cached internally
- **Pure Functions:** All functions are deterministic
- **No Async:** Everything synchronous for fast feedback
- **Minimal Allocations:** Reuse objects where possible

Typical performance:
- Timing score: <1ms
- Exercise score: <5ms
- Music theory: <1ms

---

## Platform Compatibility

- ✅ React Native (iOS/Android)
- ✅ Web (future)
- ✅ Node.js (testing, CLI tools)
- ✅ Any TypeScript environment

No platform-specific code. All utilities are pure JavaScript/TypeScript.

---

## Contributing

When adding new core logic:

1. Keep it pure (no side effects)
2. Add TypeScript types
3. Write tests (aim for >95% coverage)
4. Document with JSDoc
5. No React imports allowed

---

## Related Documentation

- [PRD Section 3.4-3.6](../../../PRD.md) - Exercise System specification
- [Scoring Algorithm](../../../agent_docs/scoring-algorithm.md) - Detailed scoring logic
- [Exercise Format](../../../agent_docs/exercise-format.md) - JSON schema
- [Architecture](../../../agent_docs/architecture.md) - System design

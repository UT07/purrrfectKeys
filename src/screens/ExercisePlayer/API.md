# Exercise Player API Reference

## Components

### ExercisePlayer

Main container component for the exercise learning experience.

#### Props

```typescript
interface ExercisePlayerProps {
  exercise?: Exercise;
  onExerciseComplete?: (score: ExerciseScore) => void;
  onClose?: () => void;
}
```

#### Props Details

- **exercise** (optional)
  - Type: `Exercise`
  - Description: Exercise to play. If not provided, uses store or demo exercise
  - Default: Falls back to `useExerciseStore().currentExercise` or demo

- **onExerciseComplete** (optional)
  - Type: `(score: ExerciseScore) => void`
  - Description: Called when exercise is successfully completed
  - Receives: Final exercise score with breakdown and stats

- **onClose** (optional)
  - Type: `() => void`
  - Description: Called when user exits the exercise
  - Use: Navigate back or cleanup state

#### Example

```typescript
<ExercisePlayer
  exercise={myExercise}
  onExerciseComplete={(score) => {
    if (score.stars >= 2) {
      unlockNextLesson();
    }
  }}
  onClose={() => navigation.goBack()}
/>
```

#### Internal State

The component manages several state objects internally:

```typescript
// Playback state
{
  isPlaying: boolean;      // Exercise is running
  isPaused: boolean;       // Paused by user
  currentBeat: number;     // Current position (can be negative during count-in)
  elapsedTime: number;     // Time in ms
  countInComplete: boolean; // Count-in finished
}

// Input state
{
  playedNotes: MidiNoteEvent[];
  highlightedKeys: Set<number>;  // Currently pressed keys
  expectedNotes: Set<number>;    // Expected to press now
}

// Feedback state
{
  type: 'perfect' | 'good' | 'ok' | 'early' | 'late' | 'miss' | null;
  noteIndex: number;
  timestamp: number;
}
```

---

### ScoreDisplay

Displays real-time exercise progress, score, and combo information.

#### Props

```typescript
interface ScoreDisplayProps {
  exercise: Exercise;
  currentBeat: number;
  combo: number;
  feedback: 'perfect' | 'good' | 'ok' | 'early' | 'late' | 'miss' | null;
  comboAnimValue: Animated.Value;
  testID?: string;
}
```

#### Props Details

- **exercise**
  - Type: `Exercise`
  - Description: Exercise metadata for title and difficulty
  - Required: Yes

- **currentBeat**
  - Type: `number`
  - Description: Current position in beats (can be negative)
  - Example: `2.5` = beat 2.5, `-1` = 1 beat before start

- **combo**
  - Type: `number`
  - Description: Current combo counter
  - Display: Only shows if > 0

- **feedback**
  - Type: Feedback type or null
  - Description: Last note feedback type
  - Updates: Auto-clears after 500ms

- **comboAnimValue**
  - Type: `Animated.Value`
  - Description: Reanimated value for combo animation
  - Usage: Connect to Animated.View `transform`

#### Rendered Elements

- Exercise title
- Difficulty stars (1-5)
- Tempo and time signature
- Current beat display
- Progress bar (0-100%)
- Combo counter with animation (if combo > 0)
- Feedback badge (if feedback active)
- Progress percentage

#### Example

```typescript
const comboScale = useRef(new Animated.Value(1)).current;

<ScoreDisplay
  exercise={exercise}
  currentBeat={beat}
  combo={5}
  feedback="perfect"
  comboAnimValue={comboScale}
/>
```

---

### ExerciseControls

Button controls for exercise playback.

#### Props

```typescript
interface ExerciseControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
  onExit: () => void;
  testID?: string;
}
```

#### Props Details

- **isPlaying**
  - Type: `boolean`
  - Description: Whether exercise is currently running
  - Effect: Toggles between Play/Pause buttons

- **isPaused**
  - Type: `boolean`
  - Description: Whether playback is paused
  - Effect: Changes pause button to Resume

- **onStart**
  - Type: `() => void`
  - Description: Called when play button pressed
  - Use: Start or resume playback

- **onPause**
  - Type: `() => void`
  - Description: Called when pause/resume button pressed
  - Use: Toggle pause state

- **onRestart**
  - Type: `() => void`
  - Description: Called when restart button pressed
  - Use: Reset exercise to start

- **onExit**
  - Type: `() => void`
  - Description: Called when exit button pressed
  - Use: Return to previous screen

#### Button States

- **Before Play**
  - Play button: Enabled
  - Pause button: Hidden
  - Restart button: Hidden
  - Exit button: Enabled

- **During Play**
  - Play button: Hidden
  - Pause button: Enabled
  - Restart button: Enabled
  - Exit button: Enabled

- **Paused**
  - Pause button: Shows "Resume"
  - Restart button: Enabled

#### Example

```typescript
<ExerciseControls
  isPlaying={playing}
  isPaused={paused}
  onStart={() => {
    setPlaybackState({ isPlaying: true, isPaused: false });
  }}
  onPause={() => {
    setPlaybackState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }}
  onRestart={() => {
    resetExercise();
  }}
  onExit={() => {
    navigation.goBack();
  }}
/>
```

---

### HintDisplay

Contextual hints and tips that update based on exercise state.

#### Props

```typescript
interface HintDisplayProps {
  hints: ExerciseHints;
  isPlaying: boolean;
  countInComplete: boolean;
  feedback: 'perfect' | 'good' | 'ok' | 'early' | 'late' | 'miss' | null;
  testID?: string;
}
```

#### Props Details

- **hints**
  - Type: `ExerciseHints`
  - Description: Hints object from exercise
  - Structure:
    ```typescript
    {
      beforeStart: string;           // Shown before play
      commonMistakes: CommonMistake[];
      successMessage: string;
    }
    ```

- **isPlaying**
  - Type: `boolean`
  - Description: Exercise is running

- **countInComplete**
  - Type: `boolean`
  - Description: Count-in phase finished

- **feedback**
  - Type: Feedback type or null
  - Description: Last note feedback

#### Hint Display Logic

| State | Hint |
|-------|------|
| Not playing | `hints.beforeStart` |
| Playing, before count-in | "Get ready..." |
| Playing, perfect feedback | "Perfect timing!" |
| Playing, good feedback | "Good!" |
| Playing, ok feedback | "Try to be more precise" |
| Playing, miss feedback | "Keep focused on the notes" |
| Playing, early feedback | "A bit early, slow down" |
| Playing, late feedback | "A bit late, speed up" |
| Default | "Focus on the piano roll" |

#### Example

```typescript
<HintDisplay
  hints={exercise.hints}
  isPlaying={playing}
  countInComplete={countInComplete}
  feedback={feedback.type}
/>
```

---

### CountInAnimation

Full-screen countdown animation before exercise starts.

#### Props

```typescript
interface CountInAnimationProps {
  countIn: number;
  tempo: number;
  elapsedTime: number;
  testID?: string;
}
```

#### Props Details

- **countIn**
  - Type: `number`
  - Description: Number of beats in count-in
  - Range: 1-8 (typically 4)
  - Example: `4` = "4, 3, 2, 1... Go!"

- **tempo**
  - Type: `number`
  - Description: BPM for beat timing
  - Range: 40-200 (typical)
  - Example: `120` = 500ms per beat

- **elapsedTime**
  - Type: `number`
  - Description: Milliseconds elapsed since playback start
  - Update: Should update every frame (16ms)
  - Example: `500` = 500ms elapsed

#### Display Sequence

1. Shows large animated beat number for each beat
2. Number scales in with spring animation
3. Fades out as next beat approaches
4. After final beat, shows "Ready..."
5. Auto-dismisses after count-in complete

#### Example

```typescript
{isPlaying && !countInComplete && (
  <CountInAnimation
    countIn={4}
    tempo={120}
    elapsedTime={elapsedMs}
  />
)}
```

---

### RealTimeFeedback

Visual feedback for note accuracy.

#### Props

```typescript
interface RealTimeFeedbackProps {
  feedback: {
    type: 'perfect' | 'good' | 'ok' | 'early' | 'late' | 'miss' | null;
    noteIndex: number;
    timestamp: number;
  };
  expectedNotes: Set<number>;
  highlightedKeys: Set<number>;
  testID?: string;
}
```

#### Props Details

- **feedback**
  - Type: Feedback state object
  - `type`: Feedback type (null = no feedback)
  - `noteIndex`: Index in exercise.notes (or -1 if extra note)
  - `timestamp`: When feedback was triggered

- **expectedNotes**
  - Type: `Set<number>`
  - Description: MIDI notes expected to be played now
  - Example: `new Set([60, 64, 67])`

- **highlightedKeys**
  - Type: `Set<number>`
  - Description: MIDI notes currently pressed
  - Example: `new Set([60])`

#### Feedback Badges

```
perfect  → "Perfect!" (green, ✓)
good     → "Good!" (light green, ✓)
ok       → "OK" (orange, ◑)
early    → "Too early" (orange, ⏩)
late     → "Too late" (orange, ⏪)
miss     → "Missed" (red, ✗)
null     → "Ready to play" (blue, ♪)
```

#### Example

```typescript
<RealTimeFeedback
  feedback={feedback}
  expectedNotes={expectedNotes}
  highlightedKeys={highlightedKeys}
/>
```

---

### CompletionModal

Results screen shown after exercise completion.

#### Props

```typescript
interface CompletionModalProps {
  score: ExerciseScore;
  exercise: Exercise;
  onClose: () => void;
  testID?: string;
}
```

#### Props Details

- **score**
  - Type: `ExerciseScore`
  - Description: Final exercise score
  - Contains: overall %, stars, breakdown, XP, etc.

- **exercise**
  - Type: `Exercise`
  - Description: Exercise metadata for display
  - Used: Title, estimated time, etc.

- **onClose**
  - Type: `() => void`
  - Description: Called when user presses Continue
  - Use: Navigate away or reset state

#### Score Details

```typescript
{
  overall: number;           // 0-100%
  stars: 0 | 1 | 2 | 3;
  breakdown: {
    accuracy: number;       // % correct notes
    timing: number;         // avg timing score
    completeness: number;   // % notes attempted
    precision: number;      // penalty for extra notes
  };
  perfectNotes: number;
  goodNotes: number;
  okNotes: number;
  missedNotes: number;
  extraNotes: number;
  xpEarned: number;
  isNewHighScore: boolean;
  isPassed: boolean;
}
```

#### Display Elements

- Exercise title
- Large score circle (0-100%)
- Three stars (empty/filled)
- Result message ("Outstanding!", "Good Effort", etc.)
- Score breakdown with progress bars
- XP earned badge
- New high score badge (if applicable)
- Continue button

#### Example

```typescript
{showCompletion && (
  <CompletionModal
    score={finalScore}
    exercise={exercise}
    onClose={() => {
      setShowCompletion(false);
      navigation.goBack();
    }}
  />
)}
```

---

## Utility Functions

### calculateCurrentBeat

Calculates current beat position from elapsed time and tempo.

```typescript
function calculateCurrentBeat(elapsedMs: number, tempo: number): number
```

**Parameters:**
- `elapsedMs`: Milliseconds elapsed since playback start
- `tempo`: Beats per minute

**Returns:** Beat position as decimal (e.g., 2.5 = beat 2.5)

**Example:**
```typescript
const beat = calculateCurrentBeat(1000, 120);
// Returns: 2 (1000ms at 120 BPM = 2 beats)
```

---

## State Management

### Using with Zustand Store

```typescript
import { useExerciseStore } from '@/stores/exerciseStore';

const store = useExerciseStore();

// Set current exercise
store.setCurrentExercise(exercise);

// Add played note
store.addPlayedNote({
  type: 'noteOn',
  note: 60,
  velocity: 80,
  timestamp: Date.now(),
  channel: 0,
});

// Set final score
store.setScore(exerciseScore);

// Clear session
store.clearSession();
```

---

## Animations

All animations use `react-native-reanimated` with native driver for 60fps performance.

### Combo Animation

```typescript
const comboScale = useRef(new Animated.Value(0)).current;

Animated.sequence([
  Animated.spring(comboScale, {
    toValue: 1.1,
    useNativeDriver: true,
  }),
  Animated.spring(comboScale, {
    toValue: 1,
    useNativeDriver: true,
  }),
]).start();

<Animated.View style={{ transform: [{ scale: comboScale }] }}>
  <Text>{combo}</Text>
</Animated.View>
```

### Modal Entrance

```typescript
const scaleAnim = useRef(new Animated.Value(0.5)).current;

Animated.timing(scaleAnim, {
  toValue: 1,
  duration: 400,
  easing: Easing.out(Easing.cubic),
  useNativeDriver: true,
}).start();
```

---

## Testing

### Unit Test Example

```typescript
import { render } from '@testing-library/react-native';
import { ExercisePlayer } from '@/screens/ExercisePlayer';

it('should render and accept input', async () => {
  const { getByTestId } = render(
    <ExercisePlayer exercise={mockExercise} />
  );

  const playButton = getByTestId('control-play');
  fireEvent.press(playButton);

  expect(getByTestId('exercise-player')).toBeTruthy();
});
```

### Integration Test Example

```typescript
it('should complete exercise and calculate score', async () => {
  const onComplete = jest.fn();

  const { getByTestId } = render(
    <ExercisePlayer
      exercise={mockExercise}
      onExerciseComplete={onComplete}
    />
  );

  // Play exercise, press keys, etc.
  // ...

  await waitFor(() => {
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        overall: expect.any(Number),
        stars: expect.any(Number),
      })
    );
  });
});
```

---

## Accessibility

### ARIA Labels

All interactive elements have accessibility labels:

```typescript
<Button
  accessibilityLabel="Play exercise"
  accessibilityHint="Starts or resumes the exercise"
/>
```

### Screen Reader Announcements

```typescript
AccessibilityInfo.announceForAccessibility('Exercise started');
```

### High Contrast

Feedback colors are chosen for accessibility:
- Green (#4CAF50) for success
- Red (#F44336) for errors
- Orange (#FF9800) for warnings
- Blue (#2196F3) for information

---

## Performance Tips

### 1. Memoize Heavy Components

```typescript
export const MyComponent = React.memo(({ data }) => {
  // Component code
});
```

### 2. Use useCallback for Event Handlers

```typescript
const handlePress = useCallback(() => {
  // Handler code
}, [dependencies]);
```

### 3. Avoid Re-renders

```typescript
// Bad: New object every render
expectedNotes={new Set(notes)}

// Good: Memoized
const expectedNotes = useMemo(() => new Set(notes), [notes]);
```

### 4. Use Native Driver for Animations

```typescript
// Good
Animated.timing(value, {
  toValue: 1,
  useNativeDriver: true,
}).start();

// Bad (forces JS thread)
Animated.timing(value, {
  toValue: 1,
  useNativeDriver: false,
}).start();
```

---

## Related Files

- [Exercise Player Screen](./EXERCISE_PLAYER.md)
- [Scoring Engine](../../core/exercises/ScoringEngine.ts)
- [Exercise Types](../../core/exercises/types.ts)
- [Store Documentation](../../stores/exerciseStore.ts)

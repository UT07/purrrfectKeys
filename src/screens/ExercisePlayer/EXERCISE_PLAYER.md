# Exercise Player Screen

Complete learning experience component for KeySense piano lessons. Handles real-time feedback, scoring, and user engagement.

## Overview

The Exercise Player is the core of the KeySense learning experience. It manages:

- **Playback Control**: Play, pause, restart, and exit exercises
- **Real-Time Feedback**: Visual and haptic feedback for note accuracy
- **Score Tracking**: Live scoring with combo counter
- **Animations**: Smooth 60fps animations with react-native-reanimated
- **Accessibility**: Full screen reader support
- **Offline Support**: Works completely offline

## Components

### ExercisePlayer (Main Screen)

The root component that orchestrates all functionality.

```typescript
import { ExercisePlayer } from '@/screens/ExercisePlayer';

<ExercisePlayer
  exercise={exercise}
  onExerciseComplete={(score) => console.log('Score:', score.overall)}
  onClose={() => navigation.goBack()}
/>
```

**Props:**
- `exercise?`: Exercise object (falls back to store or demo)
- `onExerciseComplete?`: Callback when exercise completes
- `onClose?`: Callback when user exits

**Features:**
- Handles timing and beat calculation
- Manages keyboard input state
- Integrates with Zustand store
- Dispatches haptic feedback
- Implements 60fps playback loop

### ScoreDisplay

Real-time display of progress and scoring information.

```typescript
import { ScoreDisplay } from '@/screens/ExercisePlayer';

<ScoreDisplay
  exercise={exercise}
  currentBeat={beat}
  combo={5}
  feedback="perfect"
  comboAnimValue={animValue}
/>
```

**Props:**
- `exercise`: Exercise metadata and settings
- `currentBeat`: Current position in beats
- `combo`: Current combo counter
- `feedback`: Last note feedback type
- `comboAnimValue`: Reanimated value for combo animation

**Features:**
- Shows title and difficulty stars
- Displays tempo and time signature
- Progress bar with percentage
- Combo counter with animation
- Feedback badge

### ExerciseControls

Control buttons for playback management.

```typescript
import { ExerciseControls } from '@/screens/ExercisePlayer';

<ExerciseControls
  isPlaying={true}
  isPaused={false}
  onStart={handleStart}
  onPause={handlePause}
  onRestart={handleRestart}
  onExit={handleExit}
/>
```

**Props:**
- `isPlaying`: Exercise is currently playing
- `isPaused`: Playback is paused
- `onStart`: Play button callback
- `onPause`: Pause/resume button callback
- `onRestart`: Restart button callback
- `onExit`: Exit button callback

**Features:**
- Play/Resume button
- Pause button (when playing)
- Restart button (when playing)
- Exit button
- Accessibility labels

### HintDisplay

Contextual hints and tips that change based on exercise state.

```typescript
import { HintDisplay } from '@/screens/ExercisePlayer';

<HintDisplay
  hints={exercise.hints}
  isPlaying={true}
  countInComplete={true}
  feedback="perfect"
/>
```

**Props:**
- `hints`: Exercise hints object
- `isPlaying`: Exercise is playing
- `countInComplete`: Count-in phase is done
- `feedback`: Last note feedback type

**Features:**
- Shows pre-start tips
- "Get ready" message during count-in
- Feedback-specific advice (early/late/missed)
- Color-coded by feedback type

### CountInAnimation

Full-screen countdown before exercise starts.

```typescript
import { CountInAnimation } from '@/screens/ExercisePlayer';

{isPlaying && !countInComplete && (
  <CountInAnimation
    countIn={4}
    tempo={120}
    elapsedTime={500}
  />
)}
```

**Props:**
- `countIn`: Number of count-in beats
- `tempo`: BPM for beat timing
- `elapsedTime`: Elapsed time in ms

**Features:**
- Large animated beat numbers
- Haptic feedback on each beat
- "Ready..." message
- Auto-dismisses after count-in

### RealTimeFeedback

Visual feedback for note accuracy during playback.

```typescript
import { RealTimeFeedback } from '@/screens/ExercisePlayer';

<RealTimeFeedback
  feedback={feedback}
  expectedNotes={new Set([60, 64])}
  highlightedKeys={new Set([60])}
/>
```

**Props:**
- `feedback`: Current feedback state
- `expectedNotes`: Set of expected note numbers
- `highlightedKeys`: Set of currently pressed keys

**Features:**
- Feedback badge with icon and text
- "Expected notes" indicator
- Color-coded by feedback type
- Shows correct/incorrect count

### CompletionModal

Results screen shown after exercise completion.

```typescript
import { CompletionModal } from '@/screens/ExercisePlayer';

{showCompletion && (
  <CompletionModal
    score={score}
    exercise={exercise}
    onClose={handleClose}
  />
)}
```

**Props:**
- `score`: Final exercise score
- `exercise`: Exercise metadata
- `onClose`: Close button callback

**Features:**
- Large score display (0-100%)
- Star rating (0-3)
- Result message ("Outstanding!", etc.)
- Score breakdown (accuracy, timing, completeness)
- XP earned
- New high score indicator
- Celebration animations and haptics

## Architecture

### Playback Loop

The main playback loop runs at 60fps (16ms intervals) and:

1. Calculates elapsed time since start
2. Converts to beat position (beat = elapsed * tempo / 60000)
3. Updates expected notes for current beat
4. Checks for exercise completion
5. Updates UI state

```typescript
// In useEffect for playback:
const interval = setInterval(() => {
  const elapsed = Date.now() - startTimeRef.current;
  const beat = (elapsed / 60000) * tempo - countInBeats;
  setPlaybackState(prev => ({
    ...prev,
    currentBeat: beat,
    elapsedTime: elapsed,
  }));
}, 16);
```

### Keyboard Input Handling

When keyboard key is pressed:

1. Check if exercise is playing and count-in is complete
2. Record the note with timestamp
3. Determine if note matches expected notes
4. Generate feedback (perfect/good/ok/miss)
5. Update combo counter
6. Trigger haptic and visual feedback
7. Auto-clear feedback after 500ms

### Scoring Flow

After exercise completes:

1. Collect all played notes with timestamps
2. Match against expected notes using ScoringEngine
3. Calculate timing scores for each note
4. Determine accuracy, completeness, precision
5. Calculate final score and star rating
6. Calculate XP earned
7. Show CompletionModal with results

## State Management

### Playback State

```typescript
interface PlaybackState {
  isPlaying: boolean;      // Exercise is running
  isPaused: boolean;       // Playback paused
  currentBeat: number;     // Current position in beats
  elapsedTime: number;     // Time elapsed in ms
  countInComplete: boolean; // Count-in finished
  startTime: number;       // Timestamp when started
}
```

### Feedback State

```typescript
interface FeedbackState {
  type: 'perfect' | 'good' | 'ok' | 'early' | 'late' | 'miss' | null;
  noteIndex: number;
  timestamp: number;
}
```

## Animations

All animations use react-native-reanimated for 60fps performance:

- **Combo Scale**: Bouncy spring animation when combo increases
- **Feedback Fade**: Feedback badge fades in and out
- **Count-in Beats**: Scale and opacity animation for each beat
- **Modal Entrance**: Scale and fade for completion modal
- **Stars**: Staggered spring animation for star reveal

## Accessibility

- Full screen reader support with announcements
- Semantic labels on all buttons
- High contrast colors for feedback
- Clear visual hierarchy
- Keyboard navigation support (web)

### Announcements

- "Exercise started" - When play button pressed
- "Paused" / "Resumed" - When pause button pressed
- "Exercise restarted" - When restart button pressed
- "Exercise complete! Score: X%" - When exercise finishes

## Performance

### Optimization Techniques

1. **Memoization**: Components memoized with React.memo
2. **useCallback**: Event handlers wrapped in useCallback
3. **Animated Values**: All animations use native driver
4. **Lazy State Updates**: Only update relevant state
5. **Interval Cleanup**: Intervals properly cleared on unmount

### Performance Targets

- **Playback Loop**: 60fps (16ms)
- **Touch to Feedback**: <50ms
- **Keyboard Input**: <20ms
- **Component Renders**: <16ms

## Testing

### Unit Tests

```bash
npm run test -- ExercisePlayer.test.tsx
```

Tests cover:
- Component rendering
- Playback control
- Keyboard input
- Score calculation
- Exercise completion
- Accessibility

### Integration Tests

```bash
npm run test:integration
```

Tests cover:
- Full exercise flow
- Store integration
- Timing accuracy
- Feedback system

### E2E Tests

```bash
npm run test:e2e
```

Tests cover:
- User workflows
- Exercise completion
- Score submission
- Navigation

## Common Issues

### Playback Timing Inaccurate

**Problem**: Beat calculation drifts from expected timing

**Solution**:
- Ensure system time is accurate
- Check tempo setting
- Verify count-in beats

### No Haptic Feedback

**Problem**: Haptic effects not working on device

**Solution**:
- Verify device supports haptics
- Check `hapticEnabled` prop
- On web, haptics are silently skipped

### Keyboard Input Not Registering

**Problem**: Note presses not recorded

**Solution**:
- Verify `isPlaying` is true
- Check count-in is complete
- Ensure keyboard is enabled
- Verify MIDI device is connected (if using MIDI)

### Animations Stuttering

**Problem**: 60fps animations dropping frames

**Solution**:
- Reduce number of animated components
- Use native driver for all animations
- Avoid complex calculations in render
- Profile with React Native Debugger

## Usage Examples

### Basic Exercise

```typescript
import { ExercisePlayer } from '@/screens/ExercisePlayer';

const lessonExercise: Exercise = {
  id: 'lesson-1-exercise-1',
  version: 1,
  metadata: {
    title: 'First Notes',
    description: 'Learn to play C, E, G',
    difficulty: 1,
    estimatedMinutes: 5,
    skills: ['c-major'],
    prerequisites: [],
  },
  settings: {
    tempo: 100,
    timeSignature: [4, 4],
    keySignature: 'C',
    countIn: 4,
    metronomeEnabled: true,
  },
  notes: [
    { note: 60, startBeat: 4, durationBeats: 1 },
    { note: 64, startBeat: 5, durationBeats: 1 },
    { note: 67, startBeat: 6, durationBeats: 1 },
  ],
  scoring: {
    timingToleranceMs: 50,
    timingGracePeriodMs: 150,
    passingScore: 70,
    starThresholds: [70, 85, 95],
  },
  hints: {
    beforeStart: 'Focus on keeping a steady rhythm',
    commonMistakes: [
      {
        pattern: 'rushing',
        advice: 'Try to play with the metronome',
      },
    ],
    successMessage: 'Great job!',
  },
};

export function LessonScreen() {
  return (
    <ExercisePlayer
      exercise={lessonExercise}
      onExerciseComplete={(score) => {
        console.log('Score:', score.overall, 'Stars:', score.stars);
      }}
      onClose={() => {
        navigation.goBack();
      }}
    />
  );
}
```

### From Store

```typescript
import { ExercisePlayer } from '@/screens/ExercisePlayer';
import { useExerciseStore } from '@/stores/exerciseStore';

export function PlayingScreen() {
  const exercise = useExerciseStore(state => state.currentExercise);

  if (!exercise) {
    return <Text>No exercise selected</Text>;
  }

  return (
    <ExercisePlayer
      onExerciseComplete={(score) => {
        // Exercise completed
      }}
      onClose={() => {
        // User exited
      }}
    />
  );
}
```

## Related Documentation

- [Exercise Format](../../../core/exercises/README.md)
- [Scoring Algorithm](../../../core/exercises/ScoringEngine.ts)
- [Store Documentation](../../../stores/README.md)
- [Animation Guide](../../components/ANIMATION_GUIDE.md)

## Future Enhancements

- [ ] Metronome audio
- [ ] Recording playback
- [ ] MIDI visualization
- [ ] Hand position detection
- [ ] Difficulty progression
- [ ] Multiplayer mode
- [ ] Recording and playback
- [ ] AI coach feedback integration

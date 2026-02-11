# Exercise Player

Complete piano learning experience component for KeySense. Handles playback, scoring, real-time feedback, and user engagement with delightful animations and haptic feedback.

## Quick Links

- [Main Documentation](./EXERCISE_PLAYER.md) - Architecture and detailed component reference
- [API Reference](./API.md) - Complete API documentation for all components
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) - Integration examples and best practices
- [Component Source](./ExercisePlayer.tsx) - Main component
- [Tests](./\_\_tests__/) - Unit and integration tests

## Features

✨ **Core Features**
- 60fps smooth playback with accurate beat timing
- Real-time note matching and feedback
- Visual combo counter with animations
- Progress tracking with live score display
- Count-in animation with haptic/audio cues
- Pause, restart, and exit controls

🎨 **Visual Feedback**
- Color-coded feedback (perfect/good/ok/miss)
- Piano roll visualization with active note indicator
- Smooth animations for all state changes
- Star rating display with celebration
- Progress bar with percentage

🎮 **Interaction**
- Touch keyboard support with haptic feedback
- MIDI device support (Keyboard component handles)
- Gesture recognition
- Accessibility for screen readers
- Web keyboard input support

📊 **Scoring & Progress**
- Real-time score calculation
- Detailed breakdown (accuracy, timing, completeness, precision)
- Star rating system (0-3 stars)
- XP tracking
- New high score detection
- Combo counter

🔊 **Feedback**
- Haptic feedback on correct/incorrect notes
- Animated combo counter
- Contextual hints based on exercise state
- Results modal with celebration
- Screen reader announcements

## Getting Started

### Basic Usage

```typescript
import { ExercisePlayer } from '@/screens/ExercisePlayer';

<ExercisePlayer
  exercise={myExercise}
  onExerciseComplete={(score) => {
    console.log('Score:', score.overall, 'Stars:', score.stars);
  }}
  onClose={() => navigation.goBack()}
/>
```

### With Store Integration

```typescript
import { ExercisePlayer } from '@/screens/ExercisePlayer';
import { useExerciseStore } from '@/stores/exerciseStore';

export function ExerciseScreen() {
  const exercise = useExerciseStore(state => state.currentExercise);
  const setScore = useExerciseStore(state => state.setScore);

  return (
    <ExercisePlayer
      onExerciseComplete={(score) => {
        setScore(score);
      }}
      onClose={() => navigation.goBack()}
    />
  );
}
```

## Components

### ExercisePlayer
Main orchestrator component. Handles playback timing, keyboard input, and state management.

### ScoreDisplay
Real-time progress and scoring display. Shows title, progress bar, combo counter, and feedback.

### ExerciseControls
Play, pause, restart, and exit button controls with proper state management.

### HintDisplay
Contextual hints that change based on exercise state (before start, during play, after feedback).

### CountInAnimation
Full-screen countdown animation before exercise starts with haptic cues.

### RealTimeFeedback
Visual feedback indicator showing note accuracy and expected notes.

### CompletionModal
Results screen with celebration, score breakdown, XP, and high score indication.

## Architecture

### Playback Loop
- Updates at 60fps (16ms intervals)
- Calculates beat position from elapsed time and tempo
- Updates expected notes for current position
- Detects exercise completion

### Input Handling
- Captures keyboard note presses
- Matches against expected notes
- Generates immediate feedback
- Updates combo counter
- Triggers haptic feedback

### Scoring
- Collects all played notes with timestamps
- Integrates with ScoringEngine for timing/accuracy analysis
- Calculates final score and star rating
- Determines XP earned
- Checks for new high score

### State Management
- Uses React hooks for local state
- Integrates with Zustand store for persistence
- Manages playback, keyboard input, and feedback state
- All state updates properly tracked

## Performance

### Optimization Techniques
- Components memoized with React.memo
- Event handlers wrapped in useCallback
- Animations use react-native-reanimated native driver
- Heavy computations memoized with useMemo
- Efficient state updates with proper dependencies

### Performance Targets
- Playback: 60fps (16ms per frame)
- Touch feedback: <50ms
- Keyboard input: <20ms
- Component renders: <16ms

### Monitoring
- All intervals and animations properly cleaned up
- No memory leaks from unclosed connections
- Performant re-render strategy
- Optimized animation performance

## Accessibility

- Full screen reader support
- Semantic labels on all interactive elements
- High contrast feedback colors
- Clear visual hierarchy
- Keyboard navigation (web)
- Accessibility announcements for state changes

## Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

Tests cover:
- Component rendering
- Playback control
- Keyboard input
- Score calculation
- Exercise completion
- State management
- Accessibility

## Browser Support

- ✅ iOS (Expo)
- ✅ Android (Expo)
- ✅ Web (limited MIDI support)

## Dependencies

- `react-native` - Core UI framework
- `react-native-reanimated` - 60fps animations
- `expo-haptics` - Haptic feedback
- `zustand` - State management
- `@expo/vector-icons` - Icons

## File Structure

```
ExercisePlayer/
├── ExercisePlayer.tsx          # Main component
├── ScoreDisplay.tsx             # Score display
├── ExerciseControls.tsx         # Control buttons
├── HintDisplay.tsx              # Contextual hints
├── CountInAnimation.tsx         # Count-in animation
├── RealTimeFeedback.tsx         # Feedback display
├── CompletionModal.tsx          # Results modal
├── index.ts                     # Exports
├── __tests__/                   # Tests
│   ├── ExercisePlayer.test.tsx
│   └── ScoreDisplay.test.tsx
├── README.md                    # This file
├── EXERCISE_PLAYER.md           # Detailed documentation
├── API.md                       # API reference
└── IMPLEMENTATION_GUIDE.md      # Integration guide
```

## Common Tasks

### Add Exercise to Player

```typescript
const exercise: Exercise = {
  id: 'my-exercise',
  version: 1,
  metadata: {
    title: 'My Lesson',
    description: 'Learn some notes',
    difficulty: 2,
    estimatedMinutes: 5,
    skills: ['c-major'],
    prerequisites: [],
  },
  settings: {
    tempo: 120,
    timeSignature: [4, 4],
    keySignature: 'C',
    countIn: 4,
    metronomeEnabled: true,
  },
  notes: [
    { note: 60, startBeat: 4, durationBeats: 1 },
    { note: 64, startBeat: 5, durationBeats: 1 },
  ],
  scoring: {
    timingToleranceMs: 50,
    timingGracePeriodMs: 150,
    passingScore: 70,
    starThresholds: [70, 85, 95],
  },
  hints: {
    beforeStart: 'Ready?',
    commonMistakes: [],
    successMessage: 'Great!',
  },
};
```

### Handle Score Submission

```typescript
const handleComplete = async (score: ExerciseScore) => {
  // Update local progress
  updateProgress({
    exerciseId: exercise.id,
    highScore: Math.max(score.overall, prevHighScore),
    stars: Math.max(score.stars, prevStars),
  });

  // Submit to backend
  await submitScore(exercise.id, score);

  // Navigate to results
  navigation.navigate('Results', { score });
};
```

### Customize Feedback Colors

The component uses standard colors defined in component styles. To customize:

```typescript
// In ScoreDisplay.tsx, ExerciseControls.tsx, etc.
const COLORS = {
  primary: '#2196F3',      // Blue
  success: '#4CAF50',      // Green
  warning: '#FF9800',      // Orange
  error: '#F44336',        // Red
  // ... etc
};
```

## Troubleshooting

### Playback not starting
- Verify exercise object is valid
- Check that `isPlaying` prop is properly set
- Ensure count-in beats is greater than 0

### No feedback displayed
- Check `feedback` state is being updated
- Verify expected notes match keyboard input
- Ensure feedback auto-clear timeout isn't interfering

### Animations stuttering
- Check that native driver is enabled
- Reduce number of simultaneous animations
- Profile with React Native Debugger

### Memory warnings
- Ensure intervals are cleaned up in useEffect cleanup
- Check for memory leaks in event handlers
- Profile with Chrome DevTools

## Contributing

1. Follow code style in existing components
2. Maintain 60fps performance target
3. Add tests for new features
4. Update documentation
5. Test on physical devices

## Related Documentation

- [Exercise Format](../../core/exercises/README.md)
- [Scoring Algorithm](../../core/exercises/ScoringEngine.ts)
- [Store Documentation](../../stores/exerciseStore.ts)
- [Keyboard Component](../../components/Keyboard/README.md)
- [Piano Roll Component](../../components/PianoRoll/README.md)

## License

Part of KeySense project. See root LICENSE file.

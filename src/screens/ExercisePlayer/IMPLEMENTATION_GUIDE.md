# Exercise Player Implementation Guide

Complete guide for integrating the Exercise Player into your screens and navigation.

## Quick Start

### 1. Basic Integration

```typescript
import { ExercisePlayer } from '@/screens/ExercisePlayer';
import type { Exercise } from '@/core/exercises/types';

export function LessonScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Lesson'>>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const exercise: Exercise = {
    id: 'lesson-1-ex-1',
    version: 1,
    metadata: {
      title: 'First Notes',
      description: 'Learn C, E, G',
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
      beforeStart: 'Focus on steady rhythm',
      commonMistakes: [
        {
          pattern: 'rushing',
          advice: 'Follow the metronome',
        },
      ],
      successMessage: 'Excellent!',
    },
  };

  return (
    <ExercisePlayer
      exercise={exercise}
      onExerciseComplete={(score) => {
        console.log('Score:', score.overall, 'Stars:', score.stars);
        // Update progress, unlock next lesson, etc.
      }}
      onClose={() => navigation.goBack()}
    />
  );
}
```

### 2. Using from Store

```typescript
import { ExercisePlayer } from '@/screens/ExercisePlayer';
import { useExerciseStore } from '@/stores/exerciseStore';

export function PlayExerciseScreen() {
  const exercise = useExerciseStore((state) => state.currentExercise);
  const clearSession = useExerciseStore((state) => state.clearSession);
  const navigation = useNavigation();

  if (!exercise) {
    return <Text>No exercise loaded</Text>;
  }

  return (
    <ExercisePlayer
      onExerciseComplete={(score) => {
        // Handle completion
        handleScoreSubmission(score);
      }}
      onClose={() => {
        clearSession();
        navigation.goBack();
      }}
    />
  );
}
```

## Advanced Integration

### 1. With Navigation Stack

```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

type LessonStackParamList = {
  LessonList: undefined;
  Exercise: { exerciseId: string };
  Results: { score: ExerciseScore };
};

const Stack = createNativeStackNavigator<LessonStackParamList>();

export function LessonNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="LessonList"
        component={LessonListScreen}
        options={{ title: 'Lessons' }}
      />
      <Stack.Screen
        name="Exercise"
        component={ExercisePlayerScreen}
        options={{
          title: '',
          headerBackTitleVisible: false,
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="Results"
        component={ResultsScreen}
        options={{ title: 'Results' }}
      />
    </Stack.Navigator>
  );
}

function ExercisePlayerScreen({
  route,
  navigation,
}: NativeStackScreenProps<LessonStackParamList, 'Exercise'>) {
  const { exerciseId } = route.params;
  const exercise = loadExercise(exerciseId);

  return (
    <ExercisePlayer
      exercise={exercise}
      onExerciseComplete={(score) => {
        navigation.navigate('Results', { score });
      }}
      onClose={() => navigation.goBack()}
    />
  );
}
```

### 2. With Progress Tracking

```typescript
import { useProgressStore } from '@/stores/progressStore';

export function ExerciseScreenWithProgress() {
  const exercise = loadExercise('lesson-1-ex-1');
  const updateProgress = useProgressStore((s) => s.updateExerciseProgress);
  const navigation = useNavigation();

  const handleComplete = async (score: ExerciseScore) => {
    // Update local progress
    await updateProgress({
      exerciseId: exercise.id,
      highScore: Math.max(score.overall, currentProgress.highScore),
      stars: Math.max(score.stars, currentProgress.stars),
      attempts: currentProgress.attempts + 1,
      lastAttemptAt: Date.now(),
      averageScore: calculateAverage(scores),
    });

    // Maybe submit to Firebase
    await submitScoreToFirebase(exercise.id, score);

    // Show results
    navigation.navigate('Results', { score });
  };

  return (
    <ExercisePlayer
      exercise={exercise}
      onExerciseComplete={handleComplete}
      onClose={() => navigation.goBack()}
    />
  );
}
```

### 3. With Analytics

```typescript
import { trackEvent } from '@/services/analytics';

export function ExerciseScreenWithAnalytics() {
  const exercise = loadExercise('lesson-1-ex-1');

  return (
    <ExercisePlayer
      exercise={exercise}
      onExerciseComplete={(score) => {
        // Track completion event
        trackEvent('exercise_completed', {
          exerciseId: exercise.id,
          score: score.overall,
          stars: score.stars,
          attempts: 1, // or from store
        });

        // Maybe trigger coach feedback
        requestCoachFeedback(exercise.id, score);
      }}
      onClose={() => {
        trackEvent('exercise_exited', {
          exerciseId: exercise.id,
        });
        navigation.goBack();
      }}
    />
  );
}
```

## Common Patterns

### 1. Conditional Rendering

```typescript
export function LessonContent() {
  const [phase, setPhase] = useState<'menu' | 'playing' | 'results'>(
    'menu'
  );
  const [score, setScore] = useState<ExerciseScore | null>(null);
  const exercise = loadExercise('exercise-id');

  switch (phase) {
    case 'menu':
      return (
        <View>
          <Text>{exercise.metadata.title}</Text>
          <Button
            title="Start"
            onPress={() => setPhase('playing')}
          />
        </View>
      );

    case 'playing':
      return (
        <ExercisePlayer
          exercise={exercise}
          onExerciseComplete={(s) => {
            setScore(s);
            setPhase('results');
          }}
          onClose={() => setPhase('menu')}
        />
      );

    case 'results':
      return (
        <ResultsScreen
          score={score!}
          onContinue={() => setPhase('menu')}
        />
      );
  }
}
```

### 2. Multiple Exercises in Sequence

```typescript
export function LessonSequenceScreen() {
  const exercises = loadLessonExercises('lesson-1');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<ExerciseScore[]>([]);

  const handleComplete = (score: ExerciseScore) => {
    setScores([...scores, score]);

    // Move to next exercise or finish
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Lesson complete
      handleLessonComplete(exercises, scores);
    }
  };

  return (
    <View>
      <Text>
        Exercise {currentIndex + 1} of {exercises.length}
      </Text>
      <ExercisePlayer
        exercise={exercises[currentIndex]}
        onExerciseComplete={handleComplete}
        onClose={() => navigation.goBack()}
      />
    </View>
  );
}
```

### 3. Difficulty Progression

```typescript
export function AdaptiveExerciseScreen() {
  const [difficulty, setDifficulty] = useState(1);
  const getExercise = (diff: number) => {
    return loadExerciseWithDifficulty('exercise-id', diff);
  };

  const handleComplete = (score: ExerciseScore) => {
    // Increase difficulty if good score
    if (score.stars >= 2 && difficulty < 5) {
      setDifficulty(difficulty + 1);
      showMessage('Great job! Difficulty increased.');
    } else if (score.stars === 0 && difficulty > 1) {
      // Decrease if poor score
      setDifficulty(difficulty - 1);
      showMessage('Let\'s try an easier version.');
    } else {
      // Success, move on
      navigation.goBack();
    }
  };

  return (
    <ExercisePlayer
      exercise={getExercise(difficulty)}
      onExerciseComplete={handleComplete}
      onClose={() => navigation.goBack()}
    />
  );
}
```

## Best Practices

### 1. Memory Management

```typescript
// DO: Clean up intervals and timeouts
useEffect(() => {
  const interval = setInterval(() => {
    // ...
  }, 16);

  return () => clearInterval(interval); // Cleanup
}, []);

// DON'T: Leave intervals running after unmount
useEffect(() => {
  setInterval(() => {
    // Interval never stops - memory leak!
  }, 16);
}, []);
```

### 2. Animation Performance

```typescript
// DO: Use native driver
Animated.timing(value, {
  toValue: 1,
  useNativeDriver: true, // Runs on native thread
}).start();

// DON'T: Without native driver
Animated.timing(value, {
  toValue: 1,
  useNativeDriver: false, // Runs on JS thread
}).start();
```

### 3. Event Handler Optimization

```typescript
// DO: Use useCallback to avoid recreating functions
const handleKeyDown = useCallback(
  (note: MidiNoteEvent) => {
    // Handle note
  },
  [expectedNotes] // Only recreate if dependencies change
);

// DON'T: Define inline every render
const handleKeyDown = (note: MidiNoteEvent) => {
  // Recreated on every render
};
```

### 4. State Organization

```typescript
// DO: Group related state
interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentBeat: number;
}

const [playbackState, setPlaybackState] = useState<PlaybackState>({
  // ...
});

// DON'T: Separate related states
const [isPlaying, setIsPlaying] = useState(false);
const [isPaused, setIsPaused] = useState(false);
const [currentBeat, setCurrentBeat] = useState(0);
// Can get out of sync!
```

### 5. Error Handling

```typescript
export function SafeExercisePlayer() {
  const [error, setError] = useState<string | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    loadExercise('exercise-id')
      .then(setExercise)
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (!exercise) {
    return <LoadingScreen />;
  }

  return <ExercisePlayer exercise={exercise} />;
}
```

### 6. Performance Monitoring

```typescript
import { usePerformanceMonitor } from '@/utils/performance';

export function MonitoredExercisePlayer(props: ExercisePlayerProps) {
  const { recordMetric } = usePerformanceMonitor();

  const handleComplete = (score: ExerciseScore) => {
    recordMetric('exercise_completion_time', Date.now() - startTime);
    recordMetric('exercise_score', score.overall);
    props.onExerciseComplete?.(score);
  };

  return (
    <ExercisePlayer
      {...props}
      onExerciseComplete={handleComplete}
    />
  );
}
```

## Troubleshooting

### Issue: Playback timing drifts

```typescript
// Problem: setTimeout/setInterval not accurate
const interval = setInterval(() => {
  // Drifts over time
}, 16);

// Solution: Use requestAnimationFrame + track actual elapsed time
let lastTime = Date.now();

const update = () => {
  const now = Date.now();
  const elapsed = now - lastTime;
  const beat = (elapsed / 60000) * tempo;
  // Use beat directly instead of accumulating
  lastTime = now;
  requestAnimationFrame(update);
};

requestAnimationFrame(update);
```

### Issue: Notes not registering

```typescript
// Problem: Check enabled state
const handleKeyDown = (note) => {
  if (!isPlaying || isPaused || !countInComplete) {
    return; // Input disabled
  }
  // Handle note
};

// Solution: Verify all conditions
if (!isPlaying) return; // Not started
if (isPaused) return;   // Paused
if (!countInComplete) return; // Count-in running
// Now safe to handle input
```

### Issue: Memory leak warnings

```typescript
// Problem: Not cleaning up
useEffect(() => {
  const interval = setInterval(() => {
    setPlaybackState(...); // State update on unmounted component
  }, 16);
  // No cleanup!
}, []);

// Solution: Always clean up
useEffect(() => {
  const interval = setInterval(() => {
    setPlaybackState(...);
  }, 16);

  return () => clearInterval(interval); // Cleanup
}, []);
```

### Issue: Animations stuttering

```typescript
// Problem: Heavy operations on animation frame
Animated.timing(value, {
  toValue: 1,
  duration: 300,
  easing: Easing.cubic,
  useNativeDriver: true, // This is correct
}).start();

// But then doing this in render:
const complexCalculation = notes.map(note => {
  // Heavy computation on every render
  return expensiveTransformation(note);
});

// Solution: Memoize heavy calculations
const processedNotes = useMemo(
  () => notes.map(note => expensiveTransformation(note)),
  [notes]
);
```

## Testing Examples

### Unit Testing

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';

it('should handle exercise completion', async () => {
  const onComplete = jest.fn();
  const { getByTestId } = render(
    <ExercisePlayer
      exercise={mockExercise}
      onExerciseComplete={onComplete}
    />
  );

  const playButton = getByTestId('control-play');
  fireEvent.press(playButton);

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

### Integration Testing

```typescript
it('should complete full lesson sequence', async () => {
  const { getByTestId, getByText } = render(
    <LessonSequenceScreen lessonId="lesson-1" />
  );

  // Complete first exercise
  fireEvent.press(getByTestId('control-play'));
  await waitFor(() => getByText('Exercise 2 of 3'));

  // Complete second exercise
  fireEvent.press(getByTestId('control-play'));
  await waitFor(() => getByText('Exercise 3 of 3'));

  // Complete third exercise
  fireEvent.press(getByTestId('control-play'));
  await waitFor(() => getByText('Lesson Complete!'));
});
```

## Resources

- [Exercise Format Specification](../../core/exercises/README.md)
- [Scoring Algorithm Details](../../core/exercises/ScoringEngine.ts)
- [State Management](../../stores/README.md)
- [Navigation Documentation](../navigation/README.md)
- [Animation Guide](../../components/ANIMATION_GUIDE.md)

# State Management (Stores)

KeySense uses Zustand for state management with automatic MMKV persistence to device storage.

## Quick Start

### Import Stores

```typescript
import {
  useExerciseStore,
  useProgressStore,
  useSettingsStore,
} from '@/stores';
```

### Use in Components

```typescript
function ExerciseView() {
  const { currentExercise, isPlaying } = useExerciseStore();
  const { level, totalXp } = useProgressStore();
  const { masterVolume } = useSettingsStore();

  return (
    <View>
      <Text>Level {level}</Text>
      <Text>{currentExercise?.metadata.title}</Text>
    </View>
  );
}
```

### Update State

```typescript
function AudioSettings() {
  const { setMasterVolume, updateAudioSettings } = useSettingsStore();

  // Single setting
  setMasterVolume(0.8);

  // Multiple settings
  updateAudioSettings({
    soundEnabled: true,
    metronomeVolume: 0.5,
  });
}
```

## Store Overview

### Exercise Store
Manages current exercise session state.

**Key Actions:**
- `setCurrentExercise()` - Load an exercise
- `addPlayedNote()` - Record user input
- `setScore()` - Save exercise results
- `clearSession()` - Reset without changing exercise

**See:** `src/stores/exerciseStore.ts`

### Progress Store
Manages user progression and achievements.

**Key Actions:**
- `addXp()` - Award experience points
- `recordExerciseCompletion()` - Mark exercise done
- `updateStreakData()` - Update practice streak
- `getLessonProgress()` - Retrieve lesson status

**See:** `src/stores/progressStore.ts`

### Settings Store
Manages user preferences and configuration.

**Categories:**
- Audio settings (volume, effects)
- Display settings (theme, notation)
- Notification settings (reminders, goals)
- MIDI settings (device configuration)

**See:** `src/stores/settingsStore.ts`

## Hooks

Pre-built hooks for common patterns:

```typescript
import {
  useLevelProgress,        // Level and XP info
  useDailyGoalComplete,    // Today's goal status
  useAudioSettings,        // All audio config
  useUserProfile,          // User level, XP, streaks
  useLearningPreferences,  // Learning configuration
} from '@/stores';
```

**See:** `src/stores/hooks.ts` for all available hooks

## Persistence

All state is automatically saved to device storage:

- Changes are debounced (0.5-1s) before saving
- Persisted on every store update
- Automatically restored on app startup
- Manual control available via `PersistenceManager`

**See:** `src/stores/persistence.ts` for advanced usage

## Testing

Comprehensive test suites included:

```bash
npm run test -- stores
```

- Exercise Store: 300+ lines of tests
- Progress Store: 250+ lines of tests
- Settings Store: 200+ lines of tests
- >80% code coverage

**See:** `src/stores/__tests__/` for examples

## Type Safety

All stores are fully typed with TypeScript strict mode:

```typescript
const store = useExerciseStore();
// store.currentExercise: Exercise | null
// store.addPlayedNote: (note: MidiNoteEvent) => void

// Full autocomplete and type checking in IDE
store.setCurrentExercise(exercise); // ✓ correct
store.setCurrentExercise('id');     // ✗ type error
```

## Best Practices

1. **Use hooks in components** - Better performance and type safety
2. **Batch updates** - Use `updateXxx()` methods for multiple changes
3. **Don't manually save** - Persistence is automatic
4. **Handle null cases** - Exercise and lesson data may be null
5. **Extract derived state** - Use hooks for calculations

## Common Patterns

### Exercise Completion Flow

```typescript
// Load exercise
const exercise = /* from content */;
useExerciseStore.getState().setCurrentExercise(exercise);

// During playback
const { addPlayedNote, setCurrentBeat } = useExerciseStore();
// User plays notes...
addPlayedNote(midiEvent);
setCurrentBeat(currentBeat);

// After exercise
const score = calculateScore(); // from scoring engine
useExerciseStore.getState().setScore(score);

// Record progress
useProgressStore.getState().recordExerciseCompletion(
  exerciseId,
  score.overall,
  score.xpEarned
);
```

### Daily Goal Tracking

```typescript
const { recordPracticeSession, recordExerciseCompletion } = useProgressStore();
const { useTodaysPracticeDuration, useTodaysExercisesCompleted } = useProgressStore();

// During practice
recordPracticeSession(5); // 5 minutes

// After exercise
recordExerciseCompletion(exerciseId, score, xp);

// Check status
const minutes = useTodaysPracticeDuration();
const exercises = useTodaysExercisesCompleted();
const isComplete = useDailyGoalComplete();
```

### User Preferences

```typescript
const settings = useSettingsStore();

// Read
const { masterVolume, preferredHand, darkMode } = settings;

// Write (individual)
settings.setMasterVolume(0.8);
settings.setDarkMode(true);

// Write (batch)
settings.updateDisplaySettings({
  darkMode: true,
  showFingerNumbers: false,
});
```

## API Documentation

Full API reference: **See `STORES_API.md`**

Covers:
- Complete state interfaces
- All store actions with examples
- All hooks with return types
- Best practices and patterns
- Persistence configuration
- Testing strategies
- Troubleshooting guide

## Development

### Enable Debug Logging

Set in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  // Persistence logs automatically enabled
  console.log('[PERSIST]', ...);
}
```

### Reset All Data

```typescript
import { PersistenceManager } from '@/stores';

PersistenceManager.clearAll();
```

### Type Definitions

Store types are in `src/stores/types.ts` - pure TypeScript with no React imports.

## Performance Notes

- Zustand subscriptions are optimized for React
- Persistence writes happen off the main thread
- Large arrays (playedNotes) handled efficiently
- Debouncing prevents excessive writes
- Memory usage < 1MB for typical session

## Future Enhancements

Planned improvements:

- [ ] Schema migrations for data updates
- [ ] Cloud backup/sync
- [ ] Multi-device synchronization
- [ ] Analytics tracking middleware
- [ ] Offline conflict resolution

See `CLAUDE.md` for project architecture and roadmap.

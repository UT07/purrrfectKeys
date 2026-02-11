# State Management Quick Reference

## Import Everything

```typescript
import {
  // Stores
  useExerciseStore,
  useProgressStore,
  useSettingsStore,

  // Hooks
  useLevelProgress,
  useUserProfile,
  useLearningPreferences,
  useAudioSettings,

  // Types
  type ExerciseSessionState,
  type ProgressStoreState,
  type SettingsStoreState,

  // Utilities
  PersistenceManager,
  STORAGE_KEYS,
} from '@/stores';
```

## Exercise Store Cheat Sheet

```typescript
// Load exercise
const { setCurrentExercise } = useExerciseStore();
setCurrentExercise(exercise);

// Record notes
const { addPlayedNote } = useExerciseStore();
addPlayedNote(midiEvent);

// Save score
const { setScore } = useExerciseStore();
setScore(scoreData);

// Status
const { currentExercise, isPlaying, playedNotes } = useExerciseStore();

// Cleanup
const { clearSession, reset } = useExerciseStore();
```

## Progress Store Cheat Sheet

```typescript
// Award XP and track level
const { addXp, setLevel } = useProgressStore();
addXp(50);

// Record session
const { recordPracticeSession, recordExerciseCompletion } = useProgressStore();
recordPracticeSession(10);           // 10 minutes
recordExerciseCompletion(id, 85, 50); // score, XP

// Streak management
const { updateStreakData } = useProgressStore();
updateStreakData({ currentStreak: 5 });

// Lesson tracking
const { updateLessonProgress, getLessonProgress } = useProgressStore();

// Status
const { totalXp, level, streakData } = useProgressStore();
const levelInfo = useLevelProgress();
```

## Settings Store Cheat Sheet

```typescript
// Audio
const { setMasterVolume, setSoundEnabled } = useSettingsStore();
setMasterVolume(0.8);
setSoundEnabled(true);

// Display
const { setDarkMode, setShowFingerNumbers } = useSettingsStore();
setDarkMode(true);

// Notifications
const { setReminderTime, setDailyGoalMinutes } = useSettingsStore();
setReminderTime('09:00');
setDailyGoalMinutes(15);

// Batch updates
const { updateAudioSettings } = useSettingsStore();
updateAudioSettings({
  masterVolume: 0.7,
  soundEnabled: true,
});

// Retrieve
const audio = useAudioSettings();
const display = useDisplaySettings();
```

## Useful Hooks

### User Profile
```typescript
const { level, totalXp, currentStreak, xpToNextLevel } = useUserProfile();
```

### Daily Goals
```typescript
const isComplete = useDailyGoalComplete();
const minutes = useTodaysPracticeDuration();
const exercises = useTodaysExercisesCompleted();
```

### Level Progression
```typescript
const {
  level,
  percentToNextLevel,
  xpToNextLevel,
  xpIntoLevel,
} = useLevelProgress();
```

### Exercise Session
```typescript
const duration = useExerciseSessionDuration();
const noteCount = useExerciseNotesPlayed();
const isActive = useExerciseInProgress();
const percent = useExerciseCompletionPercent();
```

## Common Workflows

### Exercise Completion

```typescript
// 1. Load
useExerciseStore.getState().setCurrentExercise(exercise);

// 2. Play (in playback loop)
useExerciseStore.getState().addPlayedNote(note);
useExerciseStore.getState().setCurrentBeat(beat);

// 3. Score
useExerciseStore.getState().setScore(score);

// 4. Record
useProgressStore.getState().recordExerciseCompletion(
  exerciseId,
  score.overall,
  score.xpEarned
);

// 5. Reset
useExerciseStore.getState().clearSession();
```

### User Profile Display

```typescript
function ProfileScreen() {
  const profile = useUserProfile();
  const levelInfo = useLevelProgress();
  const { currentStreak, longestStreak } = profile;

  return (
    <>
      <Text>Level {profile.level}</Text>
      <ProgressBar value={levelInfo.percentToNextLevel} />
      <Text>🔥 {currentStreak} day streak</Text>
    </>
  );
}
```

### Settings Panel

```typescript
function SettingsPanel() {
  const audio = useAudioSettings();
  const display = useDisplaySettings();
  const { setMasterVolume, setDarkMode } = useSettingsStore();

  return (
    <>
      <Slider value={audio.masterVolume} onChangeValue={setMasterVolume} />
      <Toggle value={display.darkMode} onToggle={setDarkMode} />
    </>
  );
}
```

## Type Reference

### Exercise Score
```typescript
interface ExerciseScore {
  overall: number;              // 0-100
  stars: 0 | 1 | 2 | 3;
  breakdown: {
    accuracy: number;
    timing: number;
    completeness: number;
    precision: number;
  };
  xpEarned: number;
  isPassed: boolean;
  isNewHighScore: boolean;
  // ... more fields
}
```

### Streak Data
```typescript
interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string;     // ISO date
  freezesAvailable: number;
  weeklyPractice: boolean[];
}
```

### Daily Goal
```typescript
interface DailyGoalData {
  date: string;                 // ISO date
  minutesTarget: number;
  minutesPracticed: number;
  exercisesTarget: number;
  exercisesCompleted: number;
  isComplete: boolean;
}
```

## Debugging

### Check Store State
```typescript
// Exercise
console.log(useExerciseStore.getState());

// Progress
console.log(useProgressStore.getState());

// Settings
console.log(useSettingsStore.getState());
```

### Clear All Data
```typescript
import { PersistenceManager } from '@/stores';
PersistenceManager.clearAll();
```

### Check Persisted Data
```typescript
import { PersistenceManager, STORAGE_KEYS } from '@/stores';
const saved = PersistenceManager.loadState(STORAGE_KEYS.PROGRESS, null);
console.log('Saved progress:', saved);
```

## Don't Forget

- ✅ Use hooks in components (better performance)
- ✅ Batch updates when changing multiple settings
- ✅ Handle null cases (exercises, lessons can be null)
- ✅ Persistence is automatic (no manual saves needed)
- ❌ Don't import React in store files
- ❌ Don't manually call PersistenceManager.saveState()
- ❌ Don't store computed values in state

## File Locations

| What | Where |
|------|-------|
| Stores | `src/stores/exerciseStore.ts` etc |
| Hooks | `src/stores/hooks.ts` |
| Types | `src/stores/types.ts` |
| API Docs | `src/stores/STORES_API.md` |
| This Guide | `src/stores/QUICK_REFERENCE.md` |
| Tests | `src/stores/__tests__/` |

## More Info

- **Complete API**: See `STORES_API.md`
- **Getting Started**: See `README.md`
- **Examples**: See hooks in `hooks.ts`
- **Tests**: See `__tests__/` for usage patterns

---

**Pro Tip**: Press Ctrl+Space in your IDE for autocomplete on store actions and hook options!

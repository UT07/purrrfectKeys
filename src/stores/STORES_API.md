# KeySense Store API Documentation

Complete reference for state management stores in KeySense. All stores use Zustand with MMKV persistence.

## Overview

The state management system is organized into three main stores:

1. **Exercise Store** - Current exercise session state
2. **Progress Store** - User progression, XP, streaks, and lessons
3. **Settings Store** - User preferences and configuration

All stores automatically persist state to device storage via MMKV and reload on app startup.

## Exercise Store

Manages the current exercise session including playback state, played notes, and scoring.

### Importing

```typescript
import { useExerciseStore } from '@/stores/exerciseStore';
```

### State

```typescript
interface ExerciseSessionState {
  currentExercise: Exercise | null;          // Currently loaded exercise
  currentExerciseId: string | null;          // ID of current exercise
  playedNotes: MidiNoteEvent[];              // Notes played by user
  isPlaying: boolean;                        // Whether playback is active
  currentBeat: number;                       // Current beat position (float for subdivisions)
  score: ExerciseScore | null;               // Last completed exercise score
  sessionStartTime: number | null;           // When session started (timestamp)
  sessionEndTime: number | null;             // When session ended (timestamp)
}
```

### Actions

#### Loading an Exercise

```typescript
const { setCurrentExercise } = useExerciseStore();

setCurrentExercise(exercise);
// Effects:
// - Sets currentExercise and currentExerciseId
// - Clears playedNotes and score
// - Records session start time
// - Auto-persists to MMKV
```

#### Recording Played Notes

```typescript
const { addPlayedNote } = useExerciseStore();

addPlayedNote({
  type: 'noteOn',
  note: 60,           // MIDI note number
  velocity: 100,      // 0-127
  timestamp: 1000,    // Performance timestamp
  channel: 0
});
// Effects:
// - Appends note to playedNotes array
// - Maintains chronological order
// - Auto-persists after debounce (500ms)
```

#### Managing Playback State

```typescript
const { setIsPlaying } = useExerciseStore();

setIsPlaying(true);   // Start playback
setIsPlaying(false);  // Pause/stop playback
```

#### Updating Position

```typescript
const { setCurrentBeat } = useExerciseStore();

setCurrentBeat(5.5);  // Update playback position
// Note: Beat updates are NOT persisted (transient data)
```

#### Recording Score

```typescript
const { setScore } = useExerciseStore();

setScore({
  overall: 85,
  stars: 2,
  breakdown: {
    accuracy: 90,
    timing: 85,
    completeness: 95,
    precision: 80,
  },
  details: [],
  perfectNotes: 5,
  goodNotes: 3,
  okNotes: 1,
  missedNotes: 0,
  extraNotes: 0,
  xpEarned: 50,
  isNewHighScore: true,
  isPassed: true,
});
// Effects:
// - Records exercise score
// - Sets session end time
// - Auto-persists to MMKV
```

#### Session Management

```typescript
const { clearSession, reset, setSessionTime } = useExerciseStore();

// Clear notes and score but keep current exercise
clearSession();

// Set custom session timing
setSessionTime(startTime, endTime);
setSessionTime(startTime);  // endTime is optional

// Complete reset - clears everything
reset();
// Effects:
// - Deletes all persisted session data
```

### Hooks

```typescript
import {
  useExerciseSessionDuration,
  useExerciseNotesPlayed,
  useExerciseInProgress,
  useExerciseCompletionPercent,
} from '@/stores/hooks';

// Get session duration in seconds
const duration = useExerciseSessionDuration();

// Get number of notes played
const count = useExerciseNotesPlayed();

// Check if exercise is playing
const isActive = useExerciseInProgress();

// Get completion percentage
const percent = useExerciseCompletionPercent();
```

## Progress Store

Manages user progression including XP, levels, streaks, lesson history, and daily goals.

### Importing

```typescript
import { useProgressStore } from '@/stores/progressStore';
```

### State

```typescript
interface ProgressStoreState {
  totalXp: number;                           // Cumulative experience points
  level: number;                             // Current level (1+)
  streakData: StreakData;                    // Daily practice streak info
  lessonProgress: Record<string, LessonProgress>;  // Per-lesson tracking
  dailyGoalData: Record<string, DailyGoalData>;    // Daily practice goals
}

interface StreakData {
  currentStreak: number;                     // Days in current streak
  longestStreak: number;                     // Best streak ever
  lastPracticeDate: string;                  // ISO date of last practice
  freezesAvailable: number;                  // Streak freeze tokens
  freezesUsed: number;                       // Streak freezes used
  weeklyPractice: boolean[];                 // Last 7 days (0 = oldest)
}

interface DailyGoalData {
  date: string;                              // ISO date
  minutesTarget: number;                     // Daily practice goal
  minutesPracticed: number;                  // Minutes practiced so far
  exercisesTarget: number;                   // Daily exercise goal
  exercisesCompleted: number;                // Exercises completed so far
  isComplete: boolean;                       // Goal achieved?
}
```

### Actions

#### XP Management

```typescript
const { addXp, setLevel } = useProgressStore();

// Award XP
addXp(50);
addXp(100);  // Accumulates

// Manually set level (usually for development)
setLevel(5);
```

#### Streak Management

```typescript
const { updateStreakData } = useProgressStore();

updateStreakData({
  currentStreak: 5,
  longestStreak: 10,
  lastPracticeDate: '2024-02-11',
  freezesAvailable: 2,
  weeklyPractice: [false, true, true, true, false, true, true],
});
// Effects:
// - Partial updates (only specified fields change)
// - Auto-persists to MMKV
```

#### Lesson Progress

```typescript
const { updateLessonProgress, getLessonProgress, updateExerciseProgress } = useProgressStore();

// Update entire lesson
const lessonProgress: LessonProgress = {
  lessonId: 'lesson-1',
  status: 'in_progress',
  exerciseScores: {},
  bestScore: 0,
  totalAttempts: 0,
  totalTimeSpentSeconds: 0,
};
updateLessonProgress('lesson-1', lessonProgress);

// Retrieve lesson progress
const progress = getLessonProgress('lesson-1');  // Returns LessonProgress | null

// Update individual exercise within a lesson
const exerciseProgress: ExerciseProgress = {
  exerciseId: 'ex-1',
  highScore: 85,
  stars: 2,
  attempts: 3,
  lastAttemptAt: Date.now(),
  averageScore: 75,
  completedAt: Date.now(),
};
updateExerciseProgress('lesson-1', 'ex-1', exerciseProgress);

// Retrieve exercise progress
const exProgress = getExerciseProgress('lesson-1', 'ex-1');  // Returns ExerciseProgress | null
```

#### Practice Recording

```typescript
const { recordPracticeSession, recordExerciseCompletion } = useProgressStore();

// Record practice session (accumulates daily time)
recordPracticeSession(5);  // 5 minutes
recordPracticeSession(3);  // Adds 3 more (total 8)

// Record exercise completion (awards XP and increments count)
recordExerciseCompletion(
  'exercise-id',
  85,    // Score
  50     // XP earned
);
// Effects:
// - Awards XP to totalXp
// - Increments daily exercise count
// - Updates isComplete if goals met
```

#### Daily Goal Management

```typescript
const { updateDailyGoal } = useProgressStore();

const today = new Date().toISOString().split('T')[0];

updateDailyGoal(today, {
  minutesTarget: 15,
  exercisesTarget: 3,
});
```

#### Reset

```typescript
const { reset } = useProgressStore();

reset();
// Effects:
// - Clears all XP, levels, and progress
// - Resets streaks and daily goals
// - Deletes persisted data
```

### Hooks

```typescript
import {
  useLevelProgress,
  useDailyGoalComplete,
  useTodaysPracticeDuration,
  useTodaysExercisesCompleted,
  useHasActiveStreak,
  useStreakFreezes,
  useUserProfile,
} from '@/stores/hooks';

// Get detailed level progression
const progress = useLevelProgress();
// Returns: {
//   level,
//   totalXp,
//   currentLevelXp,
//   nextLevelXp,
//   xpIntoLevel,
//   xpToNextLevel,
//   percentToNextLevel
// }

// Check if today's goal is complete
const isComplete = useDailyGoalComplete();

// Get minutes practiced today
const minutes = useTodaysPracticeDuration();

// Get exercises completed today
const count = useTodaysExercisesCompleted();

// Check if streak is active
const hasStreak = useHasActiveStreak();

// Get freeze information
const { available, used } = useStreakFreezes();

// Get full user profile
const profile = useUserProfile();
// Returns: {
//   level,
//   totalXp,
//   currentStreak,
//   longestStreak,
//   nextLevelProgress,
//   xpToNextLevel
// }
```

## Settings Store

Manages user preferences across audio, display, notifications, and MIDI configuration.

### Importing

```typescript
import { useSettingsStore } from '@/stores/settingsStore';
```

### State

```typescript
interface SettingsStoreState {
  // Audio Settings
  masterVolume: number;                      // 0-1
  soundEnabled: boolean;
  hapticEnabled: boolean;
  metronomeVolume: number;                   // 0-1
  keyboardVolume: number;                    // 0-1
  audioBufferSize: number;

  // Display Settings
  showFingerNumbers: boolean;
  showNoteNames: boolean;
  preferredHand: 'right' | 'left' | 'both';
  darkMode: boolean;
  showPianoRoll: boolean;
  showStaffNotation: boolean;

  // Notification Settings
  reminderTime: string | null;               // "HH:MM" format
  reminderEnabled: boolean;
  dailyGoalMinutes: number;                  // Minimum 1
  completionNotifications: boolean;

  // MIDI Settings
  lastMidiDeviceId: string | null;
  lastMidiDeviceName: string | null;
  autoConnectMidi: boolean;
}
```

### Individual Setters

#### Audio Settings

```typescript
const {
  setMasterVolume,
  setSoundEnabled,
  setHapticEnabled,
} = useSettingsStore();

setMasterVolume(0.8);      // Clamped to 0-1
setSoundEnabled(false);
setHapticEnabled(true);
```

#### Display Settings

```typescript
const {
  setShowFingerNumbers,
  setShowNoteNames,
  setPreferredHand,
  setDarkMode,
} = useSettingsStore();

setShowFingerNumbers(true);
setShowNoteNames(false);
setPreferredHand('left');  // 'right' | 'left' | 'both'
setDarkMode(true);
```

#### Notification Settings

```typescript
const {
  setReminderTime,
  setDailyGoalMinutes,
} = useSettingsStore();

setReminderTime('09:00');     // 24-hour format
setReminderTime(null);        // Disable reminders
setDailyGoalMinutes(20);      // Minimum 1, auto-clamped
```

#### MIDI Settings

```typescript
const { setLastMidiDevice } = useSettingsStore();

setLastMidiDevice('device-id', 'Yamaha P-125');
setLastMidiDevice(null, null);  // Clear
```

### Batch Setters

For updating multiple related settings at once:

```typescript
const {
  updateAudioSettings,
  updateDisplaySettings,
  updateNotificationSettings,
  updateMidiSettings,
} = useSettingsStore();

// Audio
updateAudioSettings({
  masterVolume: 0.7,
  soundEnabled: true,
  metronomeVolume: 0.4,
  // Only specified fields update; others preserved
});

// Display
updateDisplaySettings({
  darkMode: true,
  showNoteNames: false,
});

// Notifications
updateNotificationSettings({
  reminderTime: '14:30',
  dailyGoalMinutes: 15,
});

// MIDI
updateMidiSettings({
  autoConnectMidi: false,
});
```

### Reset

```typescript
const { reset } = useSettingsStore();

reset();
// Effects:
// - All settings return to defaults
// - Clears persisted data
```

### Hooks

```typescript
import {
  useAudioSettings,
  useDisplaySettings,
  useNotificationSettings,
  useMidiDevice,
  useLearningPreferences,
} from '@/stores/hooks';

// Get all audio settings
const audio = useAudioSettings();
// Returns: {
//   masterVolume,
//   soundEnabled,
//   hapticEnabled,
//   metronomeVolume,
//   keyboardVolume,
//   audioBufferSize
// }

// Get all display settings
const display = useDisplaySettings();
// Returns: {
//   showFingerNumbers,
//   showNoteNames,
//   preferredHand,
//   darkMode,
//   showPianoRoll,
//   showStaffNotation
// }

// Get notification configuration
const notifications = useNotificationSettings();
// Returns: {
//   reminderTime,
//   reminderEnabled,
//   dailyGoalMinutes,
//   completionNotifications
// }

// Get MIDI device info
const midi = useMidiDevice();
// Returns: {
//   deviceId,
//   deviceName,
//   autoConnect
// }

// Get learning preferences
const prefs = useLearningPreferences();
// Returns: {
//   preferredHand,
//   showFingerNumbers,
//   showNoteNames,
//   dailyGoalMinutes
// }
```

## Persistence Layer

### Auto-Persistence

All store changes are automatically debounced and saved to device storage:

- **Exercise Store**: 500ms debounce
- **Progress Store**: 1000ms debounce
- **Settings Store**: 500ms debounce

This prevents excessive disk writes while ensuring data is reliably saved.

### Manual Persistence Management

```typescript
import { PersistenceManager, STORAGE_KEYS } from '@/stores/persistence';

// Manually save state
PersistenceManager.saveState(STORAGE_KEYS.PROGRESS, progressData);

// Manually load state
const saved = PersistenceManager.loadState(
  STORAGE_KEYS.PROGRESS,
  defaultProgressData
);

// Clear specific store data
PersistenceManager.deleteState(STORAGE_KEYS.EXERCISE);

// Clear all KeySense data
PersistenceManager.clearAll();

// Schema migrations
const currentVersion = PersistenceManager.getMigrationVersion();
PersistenceManager.setMigrationVersion(2);
```

## Best Practices

### 1. Use Hooks for Components

Always use the provided hooks in React components instead of direct store access:

```typescript
// Good
function ScoreDisplay() {
  const score = useExerciseStore((state) => state.score);
  return <Text>{score?.overall}</Text>;
}

// Better (with hook)
function UserLevel() {
  const profile = useUserProfile();
  return <Text>Level {profile.level}</Text>;
}
```

### 2. Batch Updates When Possible

```typescript
// Good - but causes 3 debounced saves
setSoundEnabled(false);
setHapticEnabled(true);
setMasterVolume(0.7);

// Better - single debounced save
updateAudioSettings({
  soundEnabled: false,
  hapticEnabled: true,
  masterVolume: 0.7,
});
```

### 3. Handle Null Cases

```typescript
const lesson = getLessonProgress('lesson-1');
if (!lesson) {
  // Handle missing lesson
  return <Text>Lesson not found</Text>;
}
```

### 4. Don't Manually Persist

Stores handle persistence automatically - never call `PersistenceManager.saveState()` directly unless you're implementing migrations.

### 5. Use Derived State

For complex calculations, use the provided hooks:

```typescript
// Instead of
const state = useProgressStore();
const progress = (state.xpIntoLevel / state.currentLevelXp) * 100;

// Use
const levelInfo = useLevelProgress();
const progress = levelInfo.percentToNextLevel;
```

## Testing

All stores include comprehensive test suites. Run tests with:

```bash
npm run test -- stores
```

Example test patterns:

```typescript
import { useExerciseStore } from '@/stores/exerciseStore';

describe('Exercise Store', () => {
  beforeEach(() => {
    useExerciseStore.setState({ /* reset state */ });
  });

  it('should record played notes', () => {
    const note = { type: 'noteOn', note: 60, velocity: 100, timestamp: 1000, channel: 0 };
    useExerciseStore.getState().addPlayedNote(note);
    expect(useExerciseStore.getState().playedNotes).toHaveLength(1);
  });
});
```

## Performance Considerations

- Store subscriptions are automatically optimized by Zustand
- Debounced persistence prevents blocking the main thread
- Large arrays (playedNotes) are handled efficiently by React Native
- Avoid storing computed values - use hooks instead

## Migration Guide (Future Versions)

When updating store schemas:

1. Increment `MIGRATION_VERSION` in persistence.ts
2. Add migration logic to load functions
3. Test with existing data before release
4. Document changes in CHANGELOG.md

Example migration:

```typescript
export function createPersistMiddleware<T>(
  key: string,
  defaultValue: T,
  options: {
    migrate?: (state: unknown, version: number) => T;
  } = {}
) {
  const { migrate } = options;
  const currentVersion = PersistenceManager.getMigrationVersion();

  if (migrate && currentVersion < MIGRATION_VERSION) {
    const oldState = PersistenceManager.loadState(key, defaultValue);
    const newState = migrate(oldState, currentVersion);
    PersistenceManager.setMigrationVersion(MIGRATION_VERSION);
    return newState;
  }
}
```

## Troubleshooting

### State not persisting?
- Check that MMKV is initialized before store usage
- Ensure app doesn't crash before debounce timer completes
- Look at console logs (enabled in development)

### Stale data after app restart?
- Delete the app and reinstall
- Clear app data in settings
- Call `PersistenceManager.clearAll()` in code

### Store actions not triggering updates?
- Check that component is using a hook, not raw state access
- Ensure action is actually being called (add console.log)
- Verify subscription selector isn't returning same reference

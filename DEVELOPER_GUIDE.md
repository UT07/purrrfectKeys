# KeySense Developer Guide

Quick reference for working with the integrated KeySense codebase.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Run Development Server
```bash
npm run start     # Start Expo dev server
npm run ios       # Run on iOS simulator
npm run android   # Run on Android emulator
```

### 3. Run Tests
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run typecheck         # TypeScript validation
```

---

## 📁 Project Structure

```
src/
├── core/                   # Business logic (no React)
│   ├── exercises/          # Exercise validation & scoring
│   │   ├── ExerciseValidator.ts    # Core scoring engine
│   │   ├── ScoringEngine.ts        # Score calculation
│   │   └── types.ts                # Type definitions
│   ├── music/              # Music theory utilities
│   └── progression/        # XP & level calculations
│
├── audio/                  # Audio playback
│   ├── AudioEngine.native.ts       # Audio engine implementation
│   ├── AudioEngine.ts              # Interface definition
│   └── samples/                    # Piano samples
│
├── input/                  # Input handling
│   ├── MidiInput.ts                # MIDI device integration
│   └── PitchDetector.ts            # Microphone fallback
│
├── stores/                 # State management (Zustand)
│   ├── exerciseStore.ts            # Exercise session state
│   ├── progressStore.ts            # User progress
│   └── settingsStore.ts            # App settings
│
├── hooks/                  # React hooks
│   └── useExercisePlayback.ts      # Core integration hook
│
├── screens/                # Screen components
│   └── ExercisePlayer/             # Main exercise screen
│       ├── ExercisePlayer.tsx      # Main component
│       ├── ErrorDisplay.tsx        # Error UI
│       ├── ScoreDisplay.tsx        # Score overlay
│       └── ...
│
├── components/             # Reusable components
│   ├── Keyboard/                   # Piano keyboard
│   └── PianoRoll/                  # Note visualization
│
└── __tests__/              # Tests
    ├── integration/                # Integration tests
    └── unit/                       # Unit tests
```

---

## 🔌 Key Integration Points

### 1. Exercise Playback Hook

**File:** `src/hooks/useExercisePlayback.ts`

**Purpose:** Coordinates MIDI, audio, validation, and state

**Usage:**
```typescript
import { useExercisePlayback } from '@/hooks/useExercisePlayback';

function MyExerciseScreen() {
  const {
    isPlaying,
    currentBeat,
    playedNotes,
    startPlayback,
    pausePlayback,
    playNote,
    releaseNote,
    isMidiReady,
    isAudioReady,
  } = useExercisePlayback({
    exercise: myExercise,
    onComplete: (score) => console.log('Done!', score),
    enableMidi: true,
    enableAudio: true,
  });

  return (
    <View>
      <Button onPress={startPlayback}>Start</Button>
      <Text>Beat: {currentBeat}</Text>
    </View>
  );
}
```

### 2. MIDI Input

**File:** `src/input/MidiInput.ts`

**Usage:**
```typescript
import { getMidiInput } from '@/input/MidiInput';

const midiInput = getMidiInput();

// Initialize
await midiInput.initialize();

// Subscribe to notes
const unsubscribe = midiInput.onNoteEvent((event) => {
  console.log('MIDI Note:', event.note, event.velocity);
});

// Clean up
unsubscribe();
await midiInput.dispose();
```

### 3. Audio Engine

**File:** `src/audio/AudioEngine.native.ts`

**Usage:**
```typescript
import { getAudioEngine } from '@/audio/AudioEngine.native';

const audioEngine = getAudioEngine();

// Initialize
await audioEngine.initialize();

// Play note
const handle = audioEngine.playNote(60, 0.8); // C4, velocity 0.8

// Release note
audioEngine.releaseNote(handle);

// Clean up
audioEngine.dispose();
```

### 4. Exercise Validation

**File:** `src/core/exercises/ExerciseValidator.ts`

**Usage:**
```typescript
import { scoreExercise } from '@/core/exercises/ExerciseValidator';

const score = scoreExercise(
  exercise,
  playedNotes,
  previousHighScore
);

console.log('Score:', score.overall);
console.log('Stars:', score.stars);
console.log('XP:', score.xpEarned);
```

### 5. Exercise Store

**File:** `src/stores/exerciseStore.ts`

**Usage:**
```typescript
import { useExerciseStore } from '@/stores/exerciseStore';

function MyComponent() {
  const store = useExerciseStore();

  // Set exercise
  store.setCurrentExercise(exercise);

  // Add played note
  store.addPlayedNote(midiEvent);

  // Set score
  store.setScore(score);

  // Clear session
  store.clearSession();

  return <View>...</View>;
}
```

---

## 🎯 Common Tasks

### Adding a New Exercise

1. Create JSON file in `content/exercises/lesson-X/`:
```json
{
  "id": "lesson-1-exercise-5",
  "version": 1,
  "metadata": {
    "title": "C Major Scale",
    "description": "Play the C major scale",
    "difficulty": 1,
    "estimatedMinutes": 2,
    "skills": ["scales", "c-major"],
    "prerequisites": []
  },
  "settings": {
    "tempo": 120,
    "timeSignature": [4, 4],
    "keySignature": "C",
    "countIn": 4,
    "metronomeEnabled": true
  },
  "notes": [
    { "note": 60, "startBeat": 0, "durationBeats": 1 }
  ],
  "scoring": {
    "timingToleranceMs": 50,
    "timingGracePeriodMs": 150,
    "passingScore": 70,
    "starThresholds": [70, 85, 95]
  },
  "hints": {
    "beforeStart": "Keep a steady rhythm",
    "commonMistakes": [],
    "successMessage": "Great job!"
  }
}
```

2. Add to lesson manifest in `content/lessons/lesson-X.json`

3. Validate:
```bash
npm run validate:exercises
```

### Modifying Scoring Logic

1. Edit `src/core/exercises/ExerciseValidator.ts`
2. Update algorithm:
```typescript
export function calculateTimingScore(
  offsetMs: number,
  tolerance: number,
  gracePeriod: number
): number {
  // Your custom logic here
}
```

3. Update tests in `src/core/exercises/__tests__/ExerciseValidator.test.ts`
4. Run tests:
```bash
npm run test src/core/exercises
```

### Adding a New Screen

1. Create component in `src/screens/`:
```typescript
import React from 'react';
import { View, Text } from 'react-native';

export const MyNewScreen: React.FC = () => {
  return (
    <View>
      <Text>My New Screen</Text>
    </View>
  );
};
```

2. Add to navigation in `src/navigation/AppNavigator.tsx`

3. Add types to `src/navigation/types.ts`

### Debugging MIDI Issues

1. Check MIDI is initialized:
```typescript
const midiInput = getMidiInput();
console.log('MIDI ready:', midiInput.isReady());
console.log('MIDI state:', midiInput.getState());
```

2. List connected devices:
```typescript
const devices = await midiInput.getConnectedDevices();
console.log('Devices:', devices);
```

3. Test note events:
```typescript
midiInput.onNoteEvent((event) => {
  console.log('MIDI Event:', event);
});
```

### Debugging Audio Issues

1. Check audio engine state:
```typescript
const audioEngine = getAudioEngine();
console.log('Audio ready:', audioEngine.isReady());
console.log('Audio state:', audioEngine.getState());
console.log('Audio latency:', audioEngine.getLatency());
```

2. Test note playback:
```typescript
const handle = audioEngine.playNote(60, 0.8);
setTimeout(() => audioEngine.releaseNote(handle), 1000);
```

3. Check memory usage:
```typescript
console.log('Memory:', audioEngine.getMemoryUsage());
```

---

## 🧪 Testing Guidelines

### Unit Tests

**Test pure business logic:**
```typescript
// src/core/exercises/__tests__/MyLogic.test.ts
import { myFunction } from '../MyLogic';

describe('myFunction', () => {
  it('should calculate correctly', () => {
    expect(myFunction(1, 2)).toBe(3);
  });
});
```

### Integration Tests

**Test component interactions:**
```typescript
// src/__tests__/integration/MyFeature.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MyComponent } from '@/components/MyComponent';

it('handles user input', async () => {
  const { getByTestId } = render(<MyComponent />);
  fireEvent.press(getByTestId('my-button'));
  await waitFor(() => {
    expect(getByTestId('result')).toBeTruthy();
  });
});
```

### E2E Tests (Detox)

**Test full user flows:**
```typescript
// e2e/exercise.e2e.ts
describe('Exercise Flow', () => {
  it('completes an exercise', async () => {
    await element(by.id('start-button')).tap();
    await expect(element(by.id('piano-roll'))).toBeVisible();
    // Play notes...
    await expect(element(by.id('completion-modal'))).toBeVisible();
  });
});
```

---

## 🐛 Common Issues

### TypeScript Errors

**Issue:** `Property 'X' does not exist on type 'Y'`

**Fix:** Check type definitions in `src/core/exercises/types.ts`

### MIDI Not Working

**Issue:** MIDI events not received

**Checklist:**
- [ ] MIDI device connected (USB or Bluetooth)
- [ ] Permissions granted (iOS/Android)
- [ ] `midiInput.initialize()` called
- [ ] Running on physical device (not simulator)

### Audio Not Playing

**Issue:** No sound from keyboard

**Checklist:**
- [ ] `audioEngine.initialize()` called
- [ ] Volume not muted
- [ ] Audio permissions granted
- [ ] Running on physical device
- [ ] Check audio context state: `audioEngine.getState()`

### Slow Performance

**Issue:** Laggy playback or UI

**Checklist:**
- [ ] Use `React.memo()` for components
- [ ] Use `useMemo()` for expensive calculations
- [ ] Check for allocations in audio callbacks
- [ ] Profile with React DevTools

---

## 📖 API Reference

### useExercisePlayback Hook

```typescript
interface UseExercisePlaybackOptions {
  exercise: Exercise;
  onComplete?: (score: ExerciseScore) => void;
  enableMidi?: boolean;
  enableAudio?: boolean;
}

interface UseExercisePlaybackReturn {
  isPlaying: boolean;
  currentBeat: number;
  playedNotes: MidiNoteEvent[];
  startPlayback: () => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  resetPlayback: () => void;
  playNote: (note: number, velocity?: number) => void;
  releaseNote: (note: number) => void;
  isMidiReady: boolean;
  isAudioReady: boolean;
  hasError: boolean;
  errorMessage: string | null;
}
```

### MidiInput Interface

```typescript
interface MidiInput {
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  getConnectedDevices(): Promise<MidiDevice[]>;
  connectDevice(deviceId: string): Promise<void>;
  disconnectDevice(deviceId: string): Promise<void>;
  onNoteEvent(callback: (note: MidiNoteEvent) => void): () => void;
  onDeviceConnection(callback: (device: MidiDevice, connected: boolean) => void): () => void;
  getState(): MidiInputState;
  isReady(): boolean;
}
```

### AudioEngine Interface

```typescript
interface IAudioEngine {
  initialize(): Promise<void>;
  dispose(): void;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  playNote(note: number, velocity?: number): NoteHandle;
  releaseNote(handle: NoteHandle): void;
  releaseAllNotes(): void;
  setVolume(volume: number): void;
  getLatency(): number;
  isReady(): boolean;
  getState(): AudioContextState;
}
```

---

## 🔗 External Resources

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MIDI Specification](https://www.midi.org/specifications)

---

## 💡 Pro Tips

1. **Always test on physical devices** - Simulators have unreliable audio
2. **Use TypeScript strict mode** - Catches errors early
3. **Profile audio code** - Use Chrome DevTools Performance tab
4. **Test with real MIDI keyboards** - Different devices behave differently
5. **Keep exercise JSONs simple** - Start with basic exercises, add complexity later

---

**Happy Coding! 🎹✨**

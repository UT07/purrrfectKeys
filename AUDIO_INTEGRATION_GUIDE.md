# Audio Engine Integration Guide

## Quick Start

### 1. Initialize Audio Engine

```typescript
// In your app initialization (e.g., App.tsx or main screen)
import { getAudioEngine } from '@/audio/AudioEngine.native';

async function initializeApp() {
  const engine = getAudioEngine();

  try {
    await engine.initialize();
    console.log('Audio engine ready');
  } catch (error) {
    console.error('Failed to initialize audio engine:', error);
  }
}
```

### 2. Play a Note (Simple Example)

```typescript
import { getAudioEngine } from '@/audio/AudioEngine.native';

function playMiddleC() {
  const engine = getAudioEngine();

  // Play note 60 (middle C) at 80% volume
  const handle = engine.playNote(60, 0.8);

  // Later, release it
  setTimeout(() => {
    engine.releaseNote(handle);
  }, 1000);
}
```

---

## Integration with Keyboard Component

### Current State

The `Keyboard` component in `/src/components/Keyboard/Keyboard.tsx` has UI logic but no audio.

### Integration Steps

#### Step 1: Add State for Note Handles

```typescript
// src/components/Keyboard/Keyboard.tsx

import { useState } from 'react';
import { getAudioEngine } from '@/audio/AudioEngine.native';
import type { NoteHandle } from '@/audio/types';

export function Keyboard() {
  // Map MIDI note → NoteHandle for releasing
  const [activeNotes, setActiveNotes] = useState<Map<number, NoteHandle>>(
    new Map()
  );

  // ... rest of component
}
```

#### Step 2: Handle Key Press (Audio)

```typescript
const onKeyDown = (midiNote: number) => {
  const engine = getAudioEngine();

  if (!engine.isReady()) {
    console.warn('Audio engine not ready');
    return;
  }

  try {
    // Calculate velocity from visual feedback if available
    // For now, use standard velocity
    const velocity = 0.8;

    const handle = engine.playNote(midiNote, velocity);

    // Store handle for later release
    const newNotes = new Map(activeNotes);
    newNotes.set(midiNote, handle);
    setActiveNotes(newNotes);

    // Update UI to show key pressed
    // (highlights key visually)
    updateKeyVisualState(midiNote, true);
  } catch (error) {
    console.error(`Failed to play note ${midiNote}:`, error);
  }
};
```

#### Step 3: Handle Key Release (Audio)

```typescript
const onKeyUp = (midiNote: number) => {
  const engine = getAudioEngine();
  const handle = activeNotes.get(midiNote);

  if (handle) {
    try {
      engine.releaseNote(handle);

      // Remove from active notes
      const newNotes = new Map(activeNotes);
      newNotes.delete(midiNote);
      setActiveNotes(newNotes);

      // Update UI to show key released
      updateKeyVisualState(midiNote, false);
    } catch (error) {
      console.error(`Failed to release note ${midiNote}:`, error);
    }
  }
};
```

#### Step 4: Wire Touch Events

```typescript
// In your keyboard rendering logic
{keys.map((midiNote) => (
  <KeyboardKey
    key={midiNote}
    note={midiNote}
    onPress={() => onKeyDown(midiNote)}
    onRelease={() => onKeyUp(midiNote)}
    isActive={activeNotes.has(midiNote)}
  />
))}
```

---

## Integration with MIDI Input

### Current State

The `MidiInput` class in `/src/input/MidiInput.ts` has event handling but no audio integration.

### Integration Steps

#### Step 1: Inject Audio Engine

```typescript
// src/input/MidiInput.ts

import { getAudioEngine } from '@/audio/AudioEngine.native';
import type { NoteHandle } from '@/audio/types';

export class MidiInputManager {
  private midiNoteHandles: Map<number, NoteHandle> = new Map();
  private engine = getAudioEngine();

  // ... rest of class
}
```

#### Step 2: Play Notes on MIDI Note-On

```typescript
private handleMidiMessage = (message: MidiMessage): void => {
  const [status, data1, data2] = message.data;
  const messageType = status & 0xF0;
  const channel = status & 0x0F;

  if (messageType === 0x90) {  // Note On
    const midiNote = data1;
    const velocity = data2 / 127;  // Normalize 0-127 → 0-1

    if (velocity > 0) {
      // Play the note
      try {
        const handle = this.engine.playNote(midiNote, velocity);
        this.midiNoteHandles.set(midiNote, handle);

        // Notify listeners (for exercise validation, etc.)
        for (const callback of this.callbacks) {
          callback({
            type: 'noteOn',
            note: midiNote,
            velocity: data2,
            timestamp: message.timestamp,
            channel,
          });
        }
      } catch (error) {
        console.error(`Failed to play MIDI note ${midiNote}:`, error);
      }
    }
  } else if (messageType === 0x80) {  // Note Off
    const midiNote = data1;
    const handle = this.midiNoteHandles.get(midiNote);

    if (handle) {
      try {
        this.engine.releaseNote(handle);
        this.midiNoteHandles.delete(midiNote);

        // Notify listeners
        for (const callback of this.callbacks) {
          callback({
            type: 'noteOff',
            note: midiNote,
            velocity: 0,
            timestamp: message.timestamp,
            channel,
          });
        }
      } catch (error) {
        console.error(`Failed to release MIDI note ${midiNote}:`, error);
      }
    }
  }
};
```

#### Step 3: Handle Sustain Pedal (Optional)

```typescript
// For CC64 (sustain pedal)
if (messageType === 0xB0) {  // Control Change
  if (data1 === 64) {  // Sustain pedal
    const sustainActive = data2 >= 64;

    if (!sustainActive) {
      // Sustain released - release all held notes
      // This is application-specific logic
      // Could notify exercise validator or auto-release notes
    }
  }
}
```

---

## Integration with Exercise Validator

### Current State

The `ExerciseValidator` in `/src/core/exercises/ExerciseValidator.ts` validates notes but doesn't know about audio latency.

### Integration Steps

#### Step 1: Account for Audio Latency

```typescript
// src/core/exercises/ExerciseValidator.ts

import { getAudioEngine } from '@/audio/AudioEngine.native';

export class ExerciseValidator {
  validateNote(event: MidiNoteEvent, expectedNote: NoteEvent): NoteScore {
    const engine = getAudioEngine();

    // Get current audio latency (in milliseconds)
    const audioLatency = engine.getLatency();

    // Adjust event timestamp to account for audio playback latency
    // The user hears the note ~audioLatency ms after they press the key
    const adjustedTimestamp = event.timestamp - audioLatency;

    // Calculate timing offset using adjusted timestamp
    const expectedTimeMs = this.beatToMs(expectedNote.startBeat);
    const timingOffsetMs = adjustedTimestamp - expectedTimeMs;

    // Score as before
    const timingScore = this.calculateTimingScore(
      timingOffsetMs,
      this.config.timingToleranceMs,
      this.config.timingGracePeriodMs
    );

    return {
      expected: expectedNote,
      played: event,
      timingOffsetMs,
      timingScore,
      isCorrectPitch: event.note === expectedNote.note,
      isExtraNote: false,
      isMissedNote: false,
    };
  }
}
```

#### Step 2: Warn About High Latency

```typescript
initializeExercise() {
  const engine = getAudioEngine();
  const latency = engine.getLatency();

  if (latency > 30) {
    console.warn(
      `High audio latency detected: ${latency.toFixed(0)}ms. ` +
      `Scoring may be affected. Consider closing other apps.`
    );

    // Optionally show warning to user
    this.showLatencyWarning(latency);
  }
}
```

---

## Integration with Zustand Stores

### Exercise Store Updates

```typescript
// src/stores/exerciseStore.ts

import { getAudioEngine } from '@/audio/AudioEngine.native';

export interface ExerciseState {
  // ... existing fields

  // Audio-related
  audioLatency: number;  // milliseconds
  audioEngineReady: boolean;
}

export const useExerciseStore = create<ExerciseState>((set) => ({
  // ... existing state

  audioLatency: 0,
  audioEngineReady: false,

  initializeAudio: async () => {
    try {
      const engine = getAudioEngine();
      await engine.initialize();

      set({
        audioEngineReady: engine.isReady(),
        audioLatency: engine.getLatency(),
      });
    } catch (error) {
      console.error('Audio initialization failed:', error);
    }
  },

  handleNoteEvent: (event: MidiNoteEvent) => {
    // Exercise validator will use audio engine directly
    // But store can track for UI purposes
    set((state) => ({
      // ... update state based on note
    }));
  },
}));
```

---

## Usage Patterns

### Pattern 1: Simple Note Play-and-Release

```typescript
function playNote(midiNote: number) {
  const engine = getAudioEngine();
  const handle = engine.playNote(midiNote);

  // Automatically release after some time
  setTimeout(() => {
    engine.releaseNote(handle);
  }, 500);
}
```

### Pattern 2: Held Note (Key Down/Up)

```typescript
class KeyManager {
  private activeNotes = new Map();

  onKeyDown(midiNote: number) {
    const engine = getAudioEngine();
    const handle = engine.playNote(midiNote);
    this.activeNotes.set(midiNote, handle);
  }

  onKeyUp(midiNote: number) {
    const engine = getAudioEngine();
    const handle = this.activeNotes.get(midiNote);

    if (handle) {
      engine.releaseNote(handle);
      this.activeNotes.delete(midiNote);
    }
  }
}
```

### Pattern 3: Chord Playback

```typescript
function playChord(notes: number[], velocity: number = 0.8) {
  const engine = getAudioEngine();

  const handles = notes.map((note) =>
    engine.playNote(note, velocity)
  );

  // Release all at once
  setTimeout(() => {
    handles.forEach((handle) => {
      engine.releaseNote(handle);
    });
  }, 1000);
}

// Usage
playChord([60, 64, 67]);  // C major chord
```

### Pattern 4: Sequence with Timing

```typescript
async function playSequence(notes: Array<{ note: number; duration: number }>) {
  const engine = getAudioEngine();

  for (const { note, duration } of notes) {
    const handle = engine.playNote(note);

    // Wait for duration
    await new Promise((resolve) => setTimeout(resolve, duration));

    // Release and move to next
    engine.releaseNote(handle);
  }
}

// Usage: Play Mary Had a Little Lamb
playSequence([
  { note: 64, duration: 250 },  // E4
  { note: 62, duration: 250 },  // D4
  { note: 60, duration: 250 },  // C4
  { note: 62, duration: 250 },  // D4
  { note: 64, duration: 500 },  // E4
]);
```

---

## Error Handling

### Safe Pattern

```typescript
function safePlayNote(midiNote: number) {
  try {
    const engine = getAudioEngine();

    // Check engine is ready
    if (!engine.isReady()) {
      console.error('Audio engine not ready');
      return;
    }

    // Check MIDI note is valid
    if (midiNote < 0 || midiNote > 127) {
      console.error(`Invalid MIDI note: ${midiNote}`);
      return;
    }

    // Play note
    const handle = engine.playNote(midiNote);
    return handle;
  } catch (error) {
    console.error('Failed to play note:', error);
    return null;
  }
}
```

### Handling Failures Gracefully

```typescript
async function initializeWithFallback() {
  try {
    const engine = getAudioEngine();
    await engine.initialize();

    if (!engine.isReady()) {
      throw new Error('Engine not ready after initialization');
    }

    console.log('✅ Audio engine initialized');
  } catch (error) {
    console.error('❌ Audio initialization failed:', error);

    // Fallback: Show UI with explanation
    showMessage('Audio not available. Try reloading the app.');

    // Allow app to continue (maybe with muted keyboard)
  }
}
```

---

## Testing Integration

### Unit Test Example

```typescript
import { getAudioEngine } from '@/audio/AudioEngine.native';

describe('Keyboard with Audio', () => {
  it('plays audio when key is pressed', async () => {
    const engine = getAudioEngine();
    await engine.initialize();

    const handle = engine.playNote(60);

    expect(handle.note).toBe(60);
    expect(engine.getActiveNoteCount()).toBe(1);

    engine.releaseNote(handle);
    expect(engine.getActiveNoteCount()).toBe(0);
  });

  it('handles rapid key presses', async () => {
    const engine = getAudioEngine();
    await engine.initialize();

    const handles = [];
    for (let i = 0; i < 10; i++) {
      handles.push(engine.playNote(60 + i));
    }

    expect(engine.getActiveNoteCount()).toBe(10);

    handles.forEach((h) => engine.releaseNote(h));
  });
});
```

---

## Debugging

### Check Engine Status

```typescript
function debugAudioEngine() {
  const engine = getAudioEngine();

  console.log({
    ready: engine.isReady(),
    state: engine.getState(),
    latency: engine.getLatency(),
    activeNotes: engine.getActiveNoteCount(),
    memory: engine.getMemoryUsage(),
  });
}
```

### Monitor Latency

```typescript
function monitorLatency() {
  const engine = getAudioEngine();

  const latency = engine.getLatency();
  console.log(`Current latency: ${latency.toFixed(1)}ms`);

  if (latency > 30) {
    console.warn('⚠️  High latency detected!');
  } else if (latency > 20) {
    console.log('⚠️  Slightly elevated latency');
  } else {
    console.log('✅ Good latency');
  }
}
```

---

## Common Issues

### Issue: Engine Not Ready After Initialize

```typescript
// Problem: await engine.initialize() but still not ready

// Solution: Check state explicitly
const engine = getAudioEngine();
await engine.initialize();

if (!engine.isReady()) {
  console.error('Engine not ready, state:', engine.getState());
  // May need user gesture to resume AudioContext
}
```

### Issue: No Sound After MIDI Connection

```typescript
// Problem: MIDI input works but no audio

// Solution: Check audio latency and engine state
if (engine.getLatency() === 0 && engine.getState() === 'suspended') {
  console.log('AudioContext is suspended, need user gesture');
  await engine.resume();
}
```

### Issue: Audio Glitches with Multiple Notes

```typescript
// Problem: Sound gets choppy with many simultaneous notes

// Solution: Limit active notes or check CPU load
if (engine.getActiveNoteCount() > 15) {
  console.warn('Too many simultaneous notes, limiting to 10');
  // Release oldest notes
}
```

---

## Performance Optimization Tips

1. **Reuse Note Handles**
   ```typescript
   // ❌ Bad: Create new handle every time
   playNote(60);
   playNote(60);  // Releases previous 60

   // ✅ Good: Manage handles explicitly
   const handle1 = playNote(60);
   // ... later
   releaseNote(handle1);
   ```

2. **Batch State Updates**
   ```typescript
   // Update UI and audio together
   // Don't trigger multiple re-renders per note
   ```

3. **Monitor Memory**
   ```typescript
   const memory = engine.getMemoryUsage();
   if (memory.total > 45_000_000) {  // 45MB
     console.warn('High memory usage:', memory);
   }
   ```

---

## Next Steps

1. ✅ Audio Engine delivered and documented
2. **Integrate with Keyboard** (Week 3, Day 1-2)
3. **Integrate with MIDI** (Week 3, Day 3-5)
4. **Test end-to-end** (Week 4, Day 1-2)
5. **Measure latency on devices** (Week 4, Day 3-5)
6. **Optimize if needed** (Week 5)

---

**Document Version:** 1.0
**Created:** February 11, 2026
**For:** Phase 1 Integration Team

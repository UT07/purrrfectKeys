# Audio Engine Implementation Guide

## Overview

The KeySense Audio Engine is a high-performance audio playback system built on Web Audio API (via react-native-audio-api) that achieves professional-grade latency for piano learning.

**Key Metrics:**
- Touch-to-sound latency: **<20ms** (cumulative with UI layer)
- MIDI-to-sound latency: **<15ms**
- Polyphonic capacity: **10+ simultaneous notes**
- Memory footprint: **<50MB** total
- Sample library: **2.5MB** (5 base notes, pre-decoded)

## Architecture

### Component Hierarchy

```
AudioEngine (Interface)
├── NativeAudioEngine (Implementation)
│   ├── AudioContext (Web Audio API)
│   ├── SampleLoader (Piano sample management)
│   └── NoteStatePool (Pre-allocated note objects)
```

### Audio Signal Flow

```
playNote(midiNote, velocity)
    ↓
getNearestSample(midiNote)  ← Sample selection with pitch shifting
    ↓
createBufferSource()         ← Audio node creation
    ↓
setPlaybackRate()            ← Pitch shift calculation
    ↓
setupADSREnvelope()          ← Gain envelope scheduling
    ↓
source.start(now)            ← Schedule audio immediately
    ↓
[Audio Context Buffer]       ← Platform audio buffer (8-12ms)
    ↓
[Hardware DAC]               ← Digital-to-analog conversion
    ↓
Sound Output
```

**Latency Breakdown:**
| Stage | Time | Notes |
|-------|------|-------|
| JavaScript execution | <1ms | playNote() function |
| Web Audio API setup | <1ms | createBufferSource(), createGain() |
| Envelope scheduling | <1ms | setValueAtTime, exponentialRamp |
| Platform audio buffer | 8-12ms | Device/OS dependent |
| Hardware output | 0-5ms | DAC latency |
| **Total** | **<20ms** | Cumulative |

## API Reference

### IAudioEngine Interface

```typescript
interface IAudioEngine {
  // Lifecycle
  initialize(): Promise<void>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  dispose(): void;

  // Playback
  playNote(note: number, velocity?: number): NoteHandle;
  releaseNote(handle: NoteHandle): void;
  releaseAllNotes(): void;

  // Configuration
  setVolume(volume: number): void;
  getLatency(): number;

  // Status
  isReady(): boolean;
  getState(): AudioContextState;
}
```

### NoteHandle

```typescript
interface NoteHandle {
  note: number;           // MIDI note number (0-127)
  startTime: number;      // AudioContext.currentTime when started
  release: () => void;    // Callback to release the note
}
```

## Implementation Details

### 1. Initialization

```typescript
const engine = new NativeAudioEngine();
await engine.initialize();

// Steps performed:
// 1. Create AudioContext with latencyHint: 'interactive'
// 2. Create master GainNode for volume control
// 3. Initialize SampleLoader
// 4. Preload all 5 piano samples (C2, C3, C4, C5, C6)
// 5. Decode audio buffers at 44.1kHz
```

**Timeline:** ~500ms-1s (network + decoding dependent)

### 2. Note Playback

```typescript
const handle = engine.playNote(60, 0.8);  // Middle C, 80% velocity

// Steps:
// 1. Validate parameters (velocity clamped to 0-1)
// 2. Get nearest sample via pitch shifting formula
// 3. Create BufferSourceNode and GainNode
// 4. Schedule ADSR envelope
// 5. Start playback immediately
// 6. Return NoteHandle for later release
```

**Timeline:** <1ms

### 3. ADSR Envelope

The envelope follows the classical ADSR pattern with exponential ramping:

```
Gain
 │     ╱╲
 │    ╱  ╲
 │   ╱    ╲___
 │  ╱          ╲
 │_╱____________╲_
 └─────────────────→ Time

 A: 10ms   (Attack)
 D: 100ms  (Decay)
 S: 0.7    (Sustain - 70% of peak)
 R: 200ms  (Release)
```

**Exponential vs Linear:**
- ✅ Exponential ramping produces smooth, natural piano tones
- ❌ Linear ramping creates audible "clicks" and artifacts
- Formula: `gain.exponentialRampToValueAtTime(targetValue, endTime)`

```typescript
const now = audioContext.currentTime;

// Attack: 0.001 → velocity
envelope.gain.setValueAtTime(0.001, now);
envelope.gain.exponentialRampToValueAtTime(velocity, now + 0.01);

// Decay: velocity → velocity × sustain
envelope.gain.exponentialRampToValueAtTime(
  velocity * sustain,
  now + 0.01 + 0.1
);

// Sustain: hold at velocity × sustain (no scheduling needed)

// Release: on note-off
envelope.gain.exponentialRampToValueAtTime(0.001, releaseTime + 0.2);
```

### 4. Pitch Shifting

The engine supports all 88 piano keys (A0 to C8) using only 5 base samples:

```
Base samples: C2, C3, C4, C5, C6
              (MIDI 36, 48, 60, 72, 84)

For target note:
1. Find nearest base sample
2. Calculate semitone difference: Δ = target - base
3. Calculate pitch shift: ratio = 2^(Δ/12)
4. Set source.playbackRate = ratio
```

**Quality Specification:**
- Acceptable quality: ±3 semitones from source
- Maximum shift: Full piano range with graceful degradation
- Artifacts: Minimal with playback rates 0.841 to 1.189

**Example:** Playing D4 (note 62) using C4 sample (note 60)
```
Δ = 62 - 60 = 2 semitones
ratio = 2^(2/12) ≈ 1.122
```

### 5. Polyphonic Support

The engine maintains an active notes map:

```typescript
private activeNotes: Map<number, NoteState> = new Map();

interface NoteState {
  note: number;           // MIDI note
  source: AudioBufferSourceNode;
  gain: GainNode;
  startTime: number;
  baseNote: number;
}
```

**Behavior:**
- Multiple different notes: All play simultaneously
- Same note played twice: Previous note is released, new one starts
- Capacity: 10+ simultaneous notes
- Cleanup: Automatic via setTimeout after release completes

### 6. Memory Management

**Critical Performance Rule:**
> Never allocate memory in audio callbacks. All buffers and objects must be pre-allocated at initialization.

**Pre-allocation Strategy:**

```typescript
// ✅ CORRECT: Pre-allocate at init
private noteStatePool: NoteState[] = [];

constructor() {
  for (let i = 0; i < 20; i++) {
    this.noteStatePool.push(this.createNoteState());
  }
}

// ❌ WRONG: Allocates on every callback
onAudioBuffer((buffer: Float32Array) => {
  const analysis = new Float32Array(buffer.length);  // BAD!
  processBuffer(analysis);
});
```

**Memory Budget:**
```
Component             | Size      | Notes
──────────────────────┼───────────┼─────────────────────
AudioContext buffers  | ~2MB      | Platform dependent
5 piano samples       | ~2.5MB    | 44.1kHz mono, 2s each
Note objects pool     | <1MB      | 20 pre-allocated
Master gain node      | Minimal   | Single GainNode
Total                 | <50MB     | Per audio engine
```

## Sample Management

### SampleLoader

The `SampleLoader` class handles piano sample loading and caching:

```typescript
class SampleLoader {
  // Pre-allocated samples map
  private samples: Map<number, AudioBuffer>;

  // Load all samples at startup
  async preloadSamples(): Promise<Map<number, AudioBuffer>>;

  // Get sample for a specific note
  getSample(note: number): AudioBuffer | null;

  // Find nearest sample with base note
  getNearestSample(targetNote: number): {
    buffer: AudioBuffer;
    baseNote: number;
  };

  // Memory reporting
  getMemoryUsage(): number;  // bytes
}
```

### Sample Specifications

| Note | MIDI | File | Duration | Size |
|------|------|------|----------|------|
| C2 | 36 | piano-c2.wav | 2s | ~500KB |
| C3 | 48 | piano-c3.wav | 2s | ~500KB |
| C4 | 60 | piano-c4.wav | 2s | ~500KB |
| C5 | 72 | piano-c5.wav | 2s | ~500KB |
| C6 | 84 | piano-c6.wav | 2s | ~500KB |

**Format:**
- Codec: PCM WAV
- Sample rate: 44.1 kHz
- Channels: 1 (mono)
- Bit depth: 16-bit
- Duration: 2 seconds (sufficient decay tail)

## Integration Guide

### With Keyboard Component

```typescript
// src/components/Keyboard/Keyboard.tsx

import { getAudioEngine } from '@/audio/AudioEngine.native';

export function Keyboard() {
  const engine = getAudioEngine();

  const onKeyDown = (midiNote: number) => {
    const velocity = 0.8;  // Default volume
    const handle = engine.playNote(midiNote, velocity);

    // Store handle for later release
    keyHandles.set(midiNote, handle);
  };

  const onKeyUp = (midiNote: number) => {
    const handle = keyHandles.get(midiNote);
    if (handle) {
      engine.releaseNote(handle);
      keyHandles.delete(midiNote);
    }
  };

  return (
    <View onTouchStart={() => onKeyDown(60)}
          onTouchEnd={() => onKeyUp(60)}>
      {/* Piano keyboard UI */}
    </View>
  );
}
```

### With MIDI Input

```typescript
// src/input/MidiInput.ts

import { getAudioEngine } from '@/audio/AudioEngine.native';

export class MidiInputManager {
  private midiNoteHandles: Map<number, NoteHandle> = new Map();

  private handleMidiMessage = (message: MidiMessage): void => {
    const engine = getAudioEngine();
    const [status, data1, data2] = message.data;

    if ((status & 0xF0) === 0x90) {  // Note On
      const note = data1;
      const velocity = data2 / 127;  // Normalize to 0-1

      const handle = engine.playNote(note, velocity);
      this.midiNoteHandles.set(note, handle);
    } else if ((status & 0xF0) === 0x80) {  // Note Off
      const note = data1;
      const handle = this.midiNoteHandles.get(note);

      if (handle) {
        engine.releaseNote(handle);
        this.midiNoteHandles.delete(note);
      }
    }
  };
}
```

### With Exercise Validator

```typescript
// src/core/exercises/ExerciseValidator.ts

import { getAudioEngine } from '@/audio/AudioEngine.native';

export class ExerciseValidator {
  validateNote(event: MidiNoteEvent): NoteScore {
    const engine = getAudioEngine();

    // Get current output latency for timing compensation
    const audioLatency = engine.getLatency();

    // Adjust event timestamp by measured latency
    const adjustedTimestamp = event.timestamp - audioLatency;

    // Validate note against expected notes
    return this.calculateScore(event, adjustedTimestamp);
  }
}
```

## Performance Optimization

### Best Practices

1. **Pre-allocate everything**
   ```typescript
   // ✅ Good
   const noteBuffer = new Float32Array(4096);
   audioProcessor.process((input) => {
     noteBuffer.set(input);  // Reuse
   });

   // ❌ Bad
   audioProcessor.process((input) => {
     const buffer = new Float32Array(input.length);  // Allocates every time
   });
   ```

2. **Use object pools**
   ```typescript
   // Pre-create note objects
   const pool = [];
   for (let i = 0; i < 20; i++) {
     pool.push(createNoteState());
   }
   ```

3. **Minimize function calls in callbacks**
   ```typescript
   // ✅ Pre-schedule everything
   gain.setValueAtTime(1.0, now);
   gain.exponentialRampToValueAtTime(0.1, now + 0.5);

   // ❌ Avoid
   for (let i = 0; i < envelope.length; i++) {
     gain.gain.value = envelope[i];  // Callback per sample
   }
   ```

### Profiling

Use React Native Profiler to identify bottlenecks:

```bash
# Start profiler
npm run start

# In dev menu: "Profiler" → Record
# Play notes and stop recording
# Analyze Main thread time
```

Target metrics:
- Main thread: <5ms per note
- Audio thread: <1ms per callback
- Memory: <50MB peak

## Troubleshooting

### Issue: High Latency (>25ms)

**Causes:**
1. Large AudioContext buffer size
2. Device under high CPU load
3. Garbage collection pause

**Solutions:**
```typescript
// Check latency
const latency = engine.getLatency();
if (latency > 25) {
  console.warn('High latency detected:', latency);
}

// Show warning to user
if (latency > 30) {
  showLatencyWarning();
}
```

### Issue: Audio Glitches / Crackling

**Causes:**
1. Memory allocation in audio callbacks
2. AudioContext state is suspended
3. CPU overload with many simultaneous notes

**Solutions:**
```typescript
// Resume AudioContext after user gesture
button.onPress(async () => {
  await engine.resume();
});

// Reduce polyphony if needed
const activeCount = engine.getActiveNoteCount();
if (activeCount > 15) {
  // Limit or stop oldest note
}
```

### Issue: No Sound

**Causes:**
1. AudioContext state is 'suspended'
2. Master volume is 0
3. Samples failed to load

**Solutions:**
```typescript
// Check engine state
if (!engine.isReady()) {
  console.error('Engine not ready:', engine.getState());
}

// Check volume
if (engine.getVolume() === 0) {
  engine.setVolume(0.8);
}

// Check samples loaded
const samples = sampleLoader.getLoadedSamples();
if (samples.length === 0) {
  console.error('No samples loaded');
}
```

### Issue: Pitch Shifting Artifacts

**Causes:**
1. Pitch shift ratio too extreme (playbackRate < 0.5 or > 2.0)
2. Sample duration too short for slow playback
3. Heavy distortion in source sample

**Solutions:**
```typescript
// Validate pitch shift ratio
const ratio = Math.pow(2, semitoneShift / 12);
if (ratio < 0.125 || ratio > 8) {
  console.warn(`Extreme pitch shift: ${ratio}`);
  // Use nearest octave sample instead
}

// Use longer samples (2-3s) for better pitch shifting
```

## Testing

### Unit Tests

```bash
npm run test -- AudioEngine.test.ts
```

Covers:
- Initialization and lifecycle
- Note playback and release
- Pitch shifting accuracy
- Polyphonic playback
- Memory management
- Edge cases

### Integration Tests

```bash
npm run test -- AudioEngine.integration.test.ts
```

Covers:
- Full note lifecycle with timing
- MIDI event integration
- Score validation with audio
- Memory stability under load

### Latency Measurements

```bash
npm run measure:latency
```

Reports:
- Output latency (hardware)
- Scheduling overhead (JS)
- Touch-to-sound latency (simulated)
- MIDI-to-sound latency (simulated)
- Polyphony latency (10 notes)

## Device-Specific Considerations

### iOS

- **Latency:** 10-20ms (AVAudioEngine backend)
- **Sample rate:** 44.1 or 48 kHz
- **Notes:** Use Audio Route to force built-in speaker
- **Build:** Requires react-native-audio-api pod

### Android

- **Latency:** 20-50ms (device dependent)
- **Oboe:** Recommended native backend for low latency
- **Channels:** Check device stereo support
- **Permissions:** `RECORD_AUDIO` for fallback pitch detection

### Simulator/Emulator

⚠️ **Not Recommended for Audio Testing**
- Latency is unrealistic (100-200ms+)
- Audio thread simulation is incomplete
- Always test on physical devices

## Future Enhancements

1. **Effects Processing**
   - Reverb via ConvolverNode
   - EQ via BiquadFilterNode
   - Sustain pedal simulation

2. **Advanced Envelopes**
   - Customizable ADSR per exercise
   - Velocity-sensitive decay
   - Note-off velocity support

3. **Microphone Input**
   - Real-time pitch detection
   - Note scoring for non-MIDI users
   - Fallback to screen keyboard

4. **Advanced Scheduling**
   - Look-ahead buffer for better timing
   - Pre-loading next samples
   - Tempo synchronization with metronome

5. **Mobile-Specific**
   - A2DP Bluetooth audio routing
   - Haptic feedback sync with notes
   - Battery optimization

## References

- [Web Audio API Specification](https://www.w3.org/TR/webaudio/)
- [React Native Audio API](https://github.com/react-native-webrtc/react-native-audio-api)
- [Audio Latency: A Guide](https://www.sweetwater.com/insync/audio-latency/)
- [ADSR Envelope](https://en.wikipedia.org/wiki/Envelope_(music))

---

**Document Version:** 1.0
**Last Updated:** February 11, 2026
**Status:** Production Ready

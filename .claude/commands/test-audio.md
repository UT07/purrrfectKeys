---
name: test-audio
description: Generate or run audio latency tests and diagnostics
allowed-tools: Read, Write, Bash(npm run *)
---

# Audio Testing Commands

Diagnose and measure audio performance in KeySense.

## Available Tests

### 1. Latency Measurement
Measures touch-to-sound and MIDI-to-sound latency.

```bash
npm run test:latency
```

Reports:
- Average latency (target: <20ms)
- P95 latency (target: <25ms)
- Minimum/maximum
- Device info

### 2. Audio Engine Health Check
Verifies audio context state and sample loading.

```bash
npm run test:audio-health
```

Checks:
- AudioContext state (running/suspended)
- All samples loaded
- Buffer sizes correct
- No memory leaks

### 3. MIDI Connection Test
Tests MIDI device detection and event flow.

```bash
npm run test:midi
```

Requires: Physical MIDI device connected

## Creating Custom Audio Tests

When asked to create audio tests, follow this pattern:

```typescript
// scripts/audio-test.ts
import { audioEngine } from '@/audio/AudioEngine';

async function runLatencyTest() {
  const samples = 100;
  const latencies: number[] = [];
  
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    const handle = audioEngine.playNote(60);
    const outputLatency = audioEngine.getLatency();
    latencies.push(outputLatency * 1000);
    
    await sleep(100);
    handle.release();
  }
  
  console.log('Latency Report:');
  console.log(`  Average: ${avg(latencies).toFixed(1)}ms`);
  console.log(`  P95: ${percentile(latencies, 95).toFixed(1)}ms`);
  console.log(`  Min: ${Math.min(...latencies).toFixed(1)}ms`);
  console.log(`  Max: ${Math.max(...latencies).toFixed(1)}ms`);
}
```

## Important Notes

- **Always test on physical devices** - Simulators have unreliable audio
- **Test with headphones** - Speaker latency varies significantly
- **Run multiple times** - Audio performance can vary with device state
- **Check battery** - Low power mode affects audio performance

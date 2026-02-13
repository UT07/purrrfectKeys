# MIDI Testing Guide for KeySense

## Quick Start

**Fastest path to test MIDI input:**
1. Get a physical iOS device (iPhone or iPad)
2. Install **MIDI Wrench** (free) from the App Store
3. Build KeySense with `npx expo run:ios --device`
4. Use MIDI Wrench's virtual keyboard to send notes to KeySense

> **Note:** A Development Build (not Expo Go) is required for native MIDI support. See "Building for MIDI" below.

---

## Current MIDI Status

KeySense's MIDI input (`src/input/MidiInput.ts`) uses a `NativeModules.RNMidi` bridge. Currently:
- **Expo Go:** MIDI module is unavailable → falls back to `NoOpMidiInput` (on-screen keyboard only)
- **Development Build:** Requires building with native MIDI module integrated
- **On-screen keyboard** works in all environments and is the primary input method

---

## Testing Options (Ranked by Practicality)

### Option 1: USB MIDI Keyboard + Physical Device (Best)

**What you need:**
- Any USB MIDI keyboard (even a $30 25-key controller works)
- iPhone/iPad with USB-C, OR Lightning + Camera Connection Kit adapter
- KeySense Development Build

**Setup:**
1. Connect MIDI keyboard to iPhone/iPad via USB-C (or adapter)
2. Open KeySense → the app should detect the MIDI device automatically
3. Navigate to any exercise and play

**Recommended budget keyboards:**
- Akai MPK Mini ($50-60) — 25 keys, velocity-sensitive
- M-Audio Keystation Mini ($40-50) — 32 keys, bus-powered
- Arturia MiniLab ($80-100) — 25 keys, knobs, pads

### Option 2: MIDI Wrench — Free Virtual MIDI on iOS (No Hardware)

**MIDI Wrench** is a free iOS app that creates a virtual MIDI keyboard on the same device.

**App Store:** https://apps.apple.com/us/app/midi-wrench/id589243566

**How it works:**
1. Install MIDI Wrench on the same device as KeySense
2. Open MIDI Wrench — it creates a virtual MIDI source via CoreMIDI
3. Use its built-in virtual piano keyboard to send Note-On/Off messages
4. Switch to KeySense (or use Split View on iPad)
5. KeySense sees the virtual MIDI source and receives notes

**Bonus:** MIDI Wrench also acts as a MIDI monitor — you can verify exactly what MIDI data is being sent/received. Invaluable for debugging.

### Option 3: KeyPad MIDI Controller (Free, More Features)

**KeyPad** by discoDSP is another free virtual MIDI controller for iOS.

**App Store:** https://apps.apple.com/us/app/keypad-midi-controller/id6758680165

**Features:**
- Touch-optimized piano keyboard, drum pads, and XY controls
- Routes MIDI via virtual CoreMIDI connections
- Has its own SoundFont engine (produces sound)
- Can connect wirelessly to Mac via Bonjour

### Option 4: Mac MIDI Keyboard App → Simulator (Fragile)

> **Honest warning:** This route is theoretically possible but practically unreliable. Only pursue this if you absolutely cannot test on a physical device.

**What you need:**
- **MidiKeys** (free, open source Mac app): https://flit.github.io/projects/midikeys/
- Or **VMPK** (free): https://vmpk.sourceforge.io/
- macOS Audio MIDI Setup (built-in)

**The routing chain:**
```
Mac MIDI App → IAC Driver → Network MIDI → iOS Simulator
```

**Steps:**
1. Open **Audio MIDI Setup** (Applications > Utilities)
2. Window → Show MIDI Studio
3. Double-click "IAC Driver" → check "Device is online"
4. Double-click "Network" icon → create a session (e.g., "KeySense Test")
5. Install MidiKeys, set MIDI OUT to IAC Driver
6. The iOS Simulator should appear in the Network directory (requires native MIDINetworkSession code)

**Why this is fragile:**
- The simulator has known bugs with `MIDINetworkSession` (crashes, driver not found)
- Requires enabling `MIDINetworkSession` in native Objective-C code
- USB MIDI devices on the Mac are NOT directly accessible by the simulator
- Bluetooth MIDI is NOT available in the simulator

---

## GarageBand as MIDI Keyboard — Does NOT Work

GarageBand on iOS is a MIDI **receiver** only. It can receive MIDI from external keyboards but does **not** expose a virtual MIDI output source. There is no way to use GarageBand as a MIDI controller for KeySense.

---

## Building KeySense for MIDI (Development Build)

Expo Go does not include native MIDI modules. To test MIDI, you need a Development Build:

```bash
# Install EAS CLI (if not already)
npm install -g eas-cli

# Create a development build for iOS
eas build --profile development --platform ios

# Or build locally (requires Xcode)
npx expo run:ios --device
```

### Native MIDI Module Options

The project currently references `NativeModules.RNMidi`. To actually enable MIDI:

1. **Expo Module (Recommended):** Build a custom Expo Module using CoreMIDI directly. See the [Expo blog post on MIDI-over-Bluetooth](https://expo.dev/blog/building-a-midi-over-bluetooth-app-using-expo-modules) for a template.

2. **@motiz88/react-native-midi:** Expo Module using Web MIDI API, supports iOS via CoreMIDI. Experimental but actively maintained.

3. **MIDIVal + @midival/react-native:** Cross-platform MIDI library with a React Native adapter.

---

## Testing Without MIDI (Development Mode)

For day-to-day development, you don't need MIDI hardware. The on-screen keyboard works in Expo Go and provides the same note events to the exercise scoring engine.

**Programmatic MIDI simulation for tests:**
```typescript
// In integration tests, inject MIDI events directly:
import { midiInput } from '../input/MidiInput';

// Simulate a note being played
midiInput._simulateNoteEvent({
  type: 'noteOn',
  note: 60,  // Middle C
  velocity: 100,
  timestamp: Date.now(),
  channel: 0,
});
```

**The scoring engine doesn't care about the input source** — it receives the same `MidiNoteEvent` regardless of whether it came from a physical MIDI keyboard, virtual MIDI app, or on-screen touch keyboard.

---

## Recommended Testing Workflow

| Phase | Input Method | Environment |
|-------|-------------|-------------|
| UI development | On-screen keyboard | Expo Go + Simulator |
| Scoring logic | Jest tests with mock events | Terminal |
| MIDI integration | MIDI Wrench (free) | Physical device + Dev Build |
| Full MIDI hardware | USB keyboard | Physical device + Dev Build |
| Production validation | USB + Bluetooth keyboards | Physical device + Production build |

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|---------|
| No MIDI devices detected | Running in Expo Go | Build a Development Build |
| MIDI keyboard connected but no sound | Audio not initialized | Ensure ExpoAudioEngine.initialize() completes |
| Notes detected but wrong pitch | MIDI channel mismatch | Check channel filter in MidiInput.ts |
| High latency (>50ms) | Audio buffer too large | Reduce buffer size in AudioEngine config |
| "MIDI network driver not found" in simulator | Known iOS Simulator bug | Use physical device instead |

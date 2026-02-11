# MIDI Input Troubleshooting Guide

## Overview

This guide helps diagnose and fix common MIDI connection issues in KeySense.

## Quick Diagnosis

### Step 1: Check Device Recognition

**Symptom:** "No MIDI devices found"

**iOS:**
1. Open Settings → Bluetooth
2. Verify keyboard is paired (if using Bluetooth MIDI)
3. For USB: Check Apple Camera Connection Kit is properly connected
4. **Important:** Some keyboards require power-on BEFORE connecting to iPad
5. Try connecting in Settings → Bluetooth → Reconnect

**Android:**
1. For USB: Verify OTG cable is properly connected and device recognizes USB peripheral
2. For Bluetooth: Settings → Bluetooth → Pair device
3. Some devices: Enable "USB MIDI Mode" in keyboard settings
4. Try a different USB port or OTG cable if available

**Quick Fix:**
- Power cycle keyboard (turn off/on)
- Restart the app
- Restart the device

---

## Issue #1: Device Connects but No Notes Detected

**Symptoms:**
- Device appears in device list
- "Connection successful" message shown
- But: Playing notes produces no sound

**Root Causes:**
1. Wrong MIDI channel
2. Sustain pedal stuck/hanging
3. Velocity too low
4. MIDI output not enabled on keyboard

**Solutions:**

### iOS
```
Check in keyboard settings:
- USB MIDI mode: ON (if applicable)
- Local Control: ON (some keyboards)
- MIDI Channel: 1 (default)
```

### Android
```
Check keyboard settings:
- MIDI Output: Enabled
- USB MIDI Mode: ON
- Bluetooth MIDI Protocol: BLE (for wireless)
```

### App Level
1. Open Settings → MIDI Diagnostics
2. Enable "MIDI Monitor" to see incoming events
3. Play a single key and check:
   - noteOn event received? ✓
   - Velocity > 0? ✓
   - Channel = 0 or 1? ✓

**Software Reset:**
```
Settings → MIDI → Reset All Devices
This clears cached settings and forces re-detection
```

---

## Issue #2: Latency / Delay Between Key Press and Sound

**Symptom:** Noticeable delay (>50ms) between pressing a key and hearing sound

**Root Causes:**
1. Audio buffer size too large
2. Bluetooth latency (inherently higher than USB)
3. App CPU overload
4. Keyboard sending slow MIDI packets

**Diagnostics:**
1. Settings → MIDI → Performance Monitor
2. Check "MIDI-to-Audio latency"
   - USB: Should be <15ms
   - Bluetooth: 20-50ms is normal
   - If >100ms: Hardware issue

**Solutions:**

**For Bluetooth:**
- Move closer to iPad/phone (interference)
- Turn off other Bluetooth devices
- Use USB connection instead (lower latency)

**For USB:**
- Try different USB port
- Check cable quality (some cheap cables cause issues)
- USB Hub (if using): Remove and connect directly

**App Settings:**
```
Settings → Audio → Buffer Size
Current: [2048 samples] ← Lower = less latency
Try: [1024 samples] if seeing >50ms latency
(Note: Very low buffers may cause audio crackling)
```

**App CPU Load:**
- Close other apps
- Reduce visual effects: Settings → Visual → High Performance Mode
- Restart app

---

## Issue #3: Connection Drops During Use

**Symptom:** MIDI connection suddenly stops working mid-session

**Root Causes:**
1. Keyboard sleep/standby timeout
2. Bluetooth range/interference
3. App crashed (check logs)
4. USB hub power issue

**Solutions:**

### Keyboard Settings
Most keyboards have a "Sleep Mode" or "Auto-Off" timer:
```
Keyboard Settings → Power → Sleep After: [Never or 30 min]
```

### Bluetooth Issues
1. Check interference: Microwave, WiFi 5GHz, cordless phone
2. Move closer to device
3. Forget and re-pair device
4. Try different Bluetooth channel (if keyboard supports it)

### USB Issues
1. Check power: Some keyboards need AC adapter even for USB MIDI
2. Verify cable isn't damaged (try different cable)
3. On Android: Check "USB Preferences" → Select "MIDI" mode

### App Recovery
- Auto-reconnect is enabled by default
- If device reconnects within 30 seconds: No action needed
- If >30 seconds: Manual reconnect required
  - Settings → MIDI → Connected Devices → Tap device

---

## Issue #4: Sustain Pedal Not Working

**Symptom:** Sustain pedal (CC64) has no effect on notes

**Root Causes:**
1. Sustain pedal not connected
2. CC64 not being sent
3. App not listening to sustain

**Diagnostics:**
1. Settings → MIDI → Monitor → Control Changes
2. Press and hold sustain pedal
3. Should see: "CC: 64, Value: 127" (when pressed)
4. And: "CC: 64, Value: 0" (when released)

**Solutions:**

### Keyboard Configuration
```
Some keyboards require:
1. Pedal Mode: CC/Control Change (not Note-On)
2. FC1/FC2 Input: Set to "Expression" or "Sustain"
3. Check physical pedal connection (usually 1/4" jack)
```

### iOS Specific
- Some keyboards need "Local Control: OFF" for pedal to transmit
- Try: Settings → Keyboard → MIDI Options → Local Control: OFF

### App Check
- Settings → MIDI → Sustain Test
- Press sustain: Should light up indicator
- If not lighting: Check MIDI Monitor for CC64 events

---

## Issue #5: Multiple Notes Playing Unexpectedly

**Symptom:** When pressing one key, multiple pitches sound, or notes don't stop

**Root Causes:**
1. Note-off messages not being sent
2. Polyphony limit exceeded
3. MIDI velocity = 0 causing stuck note

**Diagnostics:**
1. Settings → MIDI Monitor
2. Play one key, release
3. Should see:
   - 1 noteOn (velocity > 0)
   - 1 noteOff (velocity = 0) OR Release time elapsed

**Solutions:**

### Keyboard Level
```
Check keyboard settings:
- MIDI Send: All (not "Controller Only")
- Note Off Handling: Standard (not "Note On velocity 0")
- Polyphony: Set to max available
```

### App Level
1. Settings → MIDI → Reset Connected Device
2. Try unplugging and replugging keyboard
3. Force close app and restart

### Extreme Case: Panic Reset
```
Press: Middle C + highest C key (together) for 2+ seconds
This sends MIDI "All Notes Off" command
```

---

## Issue #6: "Device Not Supported" Warning

**Symptom:** Device connects but app shows compatibility warning

**Context:** KeySense pre-validates against known keyboard models

**Known Supported Devices:**
- Yamaha P-125, P-225
- Roland FP-30X, FP-90X
- Casio CDP-S130, PX-870
- M-Audio Hammer 88 Pro
- Korg microKEY 88
- Alesis Q88
- **Most class-compliant USB MIDI keyboards**

**What This Means:**
- App will still work with unsupported devices
- May require manual CC64 setup
- Polyphony/velocity features may vary
- You can safely ignore if device works

**Report New Device:**
```
Help → Report Device
Include: Device name, model, USB/Bluetooth
We'll add it to supported list
```

---

## MIDI Monitor Guide

**Location:** Settings → MIDI → Monitor

**What You'll See:**

```
[12:34:56.123] noteOn    | Note: 60, Velocity: 100, Channel: 0
[12:34:56.234] noteOff   | Note: 60, Channel: 0
[12:34:56.234] CC        | CC: 64, Value: 127, Channel: 0
```

**Interpretation:**
- **Note number:** 60 = Middle C, 61 = C#, 72 = C one octave higher
- **Velocity:** 0-127 (0 = note off in running status)
- **CC:** Controller number (64 = sustain, 1 = modulation, etc.)
- **Value:** 0-127 (for CC: 0-63 = off, 64-127 = on)

**Quick Tests:**

1. **Single Note Test:**
   ```
   Play middle C once
   Should see exactly 2 events:
   - noteOn (60, velocity > 0)
   - noteOff (60)
   ```

2. **Sustain Test:**
   ```
   Play a note, hold sustain, release key, release sustain
   Should see 4 events:
   - noteOn (velocity > 0)
   - CC 64 = 127 (sustain on)
   - noteOff (released key)
   - CC 64 = 0 (sustain released)
   ```

3. **Velocity Test:**
   ```
   Play same key: soft, medium, hard
   Should see different velocity values:
   - Soft:   noteOn (velocity: 40-60)
   - Medium: noteOn (velocity: 80-100)
   - Hard:   noteOn (velocity: 110-127)
   ```

---

## Performance Metrics

**Target Latencies:**
- Native MIDI receipt: <2ms
- JS Event processing: <3ms
- **Total MIDI-to-event:** <5ms

**Check Current Performance:**
- Settings → MIDI → Performance
- Look for "MIDI-to-event latency: XXms"
- Green <10ms ✓
- Yellow 10-20ms ⚠️
- Red >20ms ✗

---

## Advanced: Enabling Debug Logs

**For Developers:**

```typescript
// In MidiInput.ts
const midiInput = getMidiInput();
if (midiInput instanceof NativeMidiInput) {
  midiInput._DEBUG = true; // Enable detailed logging
}
```

**Log Output Location:**
- iOS: Xcode Console
- Android: `adb logcat | grep MIDI`

---

## When All Else Fails

### Reset Sequence
1. Close KeySense app
2. Turn off MIDI keyboard
3. Go to iPhone/Android Settings
4. For USB: Unplug cable
5. For Bluetooth: "Forget" device in Settings → Bluetooth
6. Restart device (iPhone/iPad/Android)
7. Power on keyboard
8. Open KeySense
9. Run Setup Wizard again

### Contact Support
If issues persist, include:
1. Device model (e.g., "Yamaha P-125")
2. Connection type (USB or Bluetooth)
3. iOS/Android version
4. App version
5. Full MIDI Monitor output (from Settings → Export Logs)
6. Screenshot of error message

---

## Hardware Compatibility Matrix

| Device | USB MIDI | Bluetooth | Sustain | Notes |
|--------|----------|-----------|---------|-------|
| **Yamaha P-125** | ✓ | ✓ | ✓ | Requires Camera Kit (iOS) |
| **Yamaha P-225** | ✓ | ✓ | ✓ | Firmware 1.2+ recommended |
| **Roland FP-30X** | ✓ | ✓ | ✓ | Verified on iOS 17+ |
| **Casio CDP-S130** | ✓ | ✗ | ✓ | USB only, no Bluetooth |
| **M-Audio Hammer 88** | ✓ | ✗ | ✓ | AC power required for USB |
| **Korg microKEY** | ✓ | ✓ | ✓ | 25/49/61/88 all supported |
| **Alesis Q88** | ✓ | ✗ | ✓ | Legacy device, fully compatible |

---

## Frequently Asked Questions

**Q: Why is Bluetooth slower than USB?**
A: Bluetooth MIDI uses a slower protocol (BLE at 9.6kbps vs USB at 12Mbps). 20-50ms latency is normal. For lowest latency, use USB.

**Q: Can I use multiple keyboards at once?**
A: Currently, KeySense supports one active MIDI device. Connecting a second device will disconnect the first.

**Q: What if my keyboard isn't in the supported list?**
A: If it sends standard MIDI (noteOn/noteOff/CC64), it should work. The list is just verified models. Try anyway!

**Q: Does the sustain pedal work without expression pedal?**
A: Yes. If your keyboard has expression pedal connected, we'll detect it too, but sustain works independently.

**Q: Can I use the on-screen keyboard instead of MIDI?**
A: Yes! If MIDI doesn't work, tap the keyboard on screen. However, you won't get velocity sensitivity or pedal support.

---

## Performance Tuning

### If Experiencing Audio Crackling with MIDI

**Increase Buffer Size:**
```
Settings → Audio → Buffer Size
[1024] → [2048] or [4096]
Trade-off: Slightly more latency, but stable audio
```

### If MIDI Events Are Skipped

**Check CPU Load:**
1. Settings → Performance Monitor
2. If CPU >80% during playback:
   - Reduce visual animations
   - Close other apps
   - Reduce polyphony/max notes

### Optimizing Bluetooth MIDI

```
1. Disable other Bluetooth devices
2. Move device closer (<3 meters)
3. Reduce WiFi interference: Change WiFi band to 2.4GHz
4. Restart Bluetooth radio:
   - Settings → Bluetooth → Toggle Off/On
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2025 | Initial release - USB and Bluetooth support |

Last updated: February 2025

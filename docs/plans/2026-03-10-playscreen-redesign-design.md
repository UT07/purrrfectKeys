# PlayScreen Redesign — Design Spec

**Date:** 2026-03-10
**Status:** Approved
**Scope:** Complete redesign of PlayScreen (free play + song mode)

## Overview

Redesign the PlayScreen from a landscape-locked split-keyboard layout into a polished neon arcade studio with unified keyboard, 7 practice tools, improved song mode, and optional portrait toggle.

## Core Decisions

| Aspect | Decision |
|---|---|
| Default orientation | Landscape |
| Keyboard | Single continuous, smart auto-range via `computeZoomedRange`, octave `<` `>` arrows |
| Tools | 7 tools via slim left sidebar (40px), toggle or floating widget |
| Song mode | Vertical falling notes (reuse `VerticalPianoRoll`), section pills, now-line, key highlighting |
| Visuals | Neon arcade — glow keys, particle bursts, light beams, aurora background |
| Portrait | Opt-in via `[⛶]` toggle button, taller keys, more viz space |
| Scoring | No scoring in free play — visual guidance + chord detection only |

## Layout: Landscape (Default)

```
┌──────────────────────────────────────────────────────┐
│ [←] Free Play    ♩C4    🎤Mic   [⛶ Portrait]  Stats │  ← Top bar (44px)
├──┬───────────────────────────────────────────────────┤
│🎹│                                                   │
│──│          Visualization Area                       │
│🎵│   (chord name, scale overlay, analysis,           │
│⏱ │    or vertical note preview when song loaded)     │
│🔁│                                                   │
│📊│                                                   │
├──┴───────────────────────────────────────────────────┤
│  [<]  ████ KEYBOARD (smart range, ~3 octaves) ████ [>] │
└──────────────────────────────────────────────────────┘
```

### Top Bar (44px)
- Back button
- "Free Play" title
- Live note display (monospace, glow border)
- Active input badge (MIDI/Mic)
- Portrait toggle button `[⛶]`
- Session stats (note count, detected key)

### Left Sidebar (~40px, dark translucent glass)
- `rgba(14, 14, 14, 0.85)` background
- Icons dim white when inactive, neon glow when active
- Thin glowing separator line between sidebar and viz area

### Keyboard
- Full-width, single continuous keyboard (no L/R split)
- Smart auto-range: `computeZoomedRange()` from song notes or recent playing
- Default: ~3 octaves (C3–C6)
- Octave shift arrows `<` `>` on edges — instant jump, no swiping while playing
- Key height: 140px landscape, 180px portrait
- Neon glow on press (color from `COLORS.noteWheel[midi % 12]`)

### Visualization Area
- Empty state: slow animated aurora/gradient mesh background (dark purple/blue)
- Populated by active tools or song mode
- When notes are played: vertical light beams shoot up from keyboard, color-matched

## Layout: Portrait (Opt-in)

```
┌────────────────────────┐
│ [←] Free Play  [⛶ Land]│
├────────────────────────┤
│                        │
│   Visualization Area   │
│   (taller — more room  │
│    for falling notes)  │
│                        │
├─┬──────────────────────┤
│T│                      │
│O│    KEYBOARD           │
│O│  (2-3 octaves,       │
│L│   180px tall keys)   │
│S│  [<]           [>]   │
└─┴──────────────────────┘
```

- Keyboard gets taller keys (180px vs 140px)
- Tool sidebar shifts to left edge of keyboard area only
- Viz area gets more vertical space
- Orientation is user-controlled — button toggle, never auto-flips
- Preference saved in `settingsStore.freePlayOrientation`

## Tool System

### Sidebar Icons (7 tools)

| Icon | Tool | Type | Behavior |
|------|------|------|----------|
| 🎹 | Chord Display | Toggle | Shows detected chord name in viz area |
| 🎵 | Scale Overlay | Toggle | Highlights scale notes on keyboard keys |
| ⏱ | Metronome | Widget | Floating card: BPM dial, tap tempo, time sig, volume |
| 🔑 | Key Selector | Widget | Floating picker: key (C-B) + scale type, dims out-of-key notes |
| 🔁 | Loop Recorder | Widget | Floating card: record/overdub/play, waveform viz |
| 🏃 | Tempo Trainer | Widget | Floating card: start BPM → target BPM, gradual speedup |
| 📊 | Session Stats | Widget | Floating card: notes played, time, streaks, analysis |

### Tool Types

**Toggle tools** (chord display, scale overlay):
- One tap activates/deactivates
- Directly affects viz area or keyboard
- Icon glows when active

**Widget tools** (metronome, loop recorder, tempo trainer, key selector, stats):
- Opens small floating card (~180px wide) anchored near sidebar
- Draggable within screen bounds
- Tap icon again to dismiss
- Max 2 widgets open at once to avoid clutter

### Widget Details

**Metronome:**
- Circular BPM dial (40–200)
- Tap tempo button
- Time signature selector (2/4, 3/4, 4/4, 6/8)
- Volume slider
- Pulsing neon glow on beat

**Loop Recorder:**
- Record / Overdub / Play buttons
- Loop length indicator
- Clear button
- Mini waveform visualization

**Key Selector:**
- Key row: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
- Scale type row: Major, Minor, Pentatonic, Blues, Chromatic
- Selected key dims out-of-scale notes on keyboard (reduced opacity)

**Tempo Trainer:**
- Start BPM input
- Target BPM input
- Increment (BPM per loop)
- Play/stop button
- Uses metronome internally

**Session Stats:**
- Notes played count
- Session duration
- Key detection (from FreePlayAnalyzer)
- "Generate Drill" button (existing navigation to AI exercise)

## Song Mode

When a song is loaded, the visualization area becomes a vertical piano roll:

```
┌──────────────────────────────────────────────────────┐
│ [←]  "Für Elise" · Am · 72 BPM   [§1][§2][§3]  [✕] │
├──┬───────────────────────────────────────────────────┤
│  │  ┃                                               │
│T │  ┃   ▓▓  ▓▓     ▓▓                               │
│O │  ┃     ▓▓  ▓▓      ▓▓   ← Vertical falling notes │
│O │  ┃  ▓▓        ▓▓     ▓▓    (reuse VerticalPianoRoll)│
│L │  ┃                                               │
│S │  ┃───────────────── now line ─────────────────    │
├──┴──╋───────────────────────────────────────────────┤
│  [<] ████ KEYBOARD (zoomed to song range) ████ [>]  │
└──────────────────────────────────────────────────────┘
```

### Song Mode Behavior
- **Top bar** replaced with song header: title, artist, BPM, key signature
- **Section pills** `[§1][§2][§3]` in header for jumping between sections
- **Close button** `[✕]` to exit song mode back to free play
- **Vertical falling notes** reusing `VerticalPianoRoll` component
- **Now-line** near keyboard edge — pulsing neon glow
- **Key highlighting**: Keys light up as notes cross the now-line
- **No scoring** — low-pressure jam-along. Just visual guidance.
- **Keyboard auto-zooms** to song range via `computeZoomedRange()`
- **Tool sidebar remains available** (e.g., toggle metronome while following song)

### Song Loading
- Song picker accessible from toolbar or top bar "Song" button
- Reuse existing `SongReferencePicker` modal
- On song load: no orientation flip, just viz area transitions to piano roll

## Neon Arcade Visuals

### Key Press Effects
- **Glow**: On press, key fills with note color (`COLORS.noteWheel[midi % 12]`) with soft bloom outward
- **Particle burst**: 5-8 sparks fly upward from pressed key, fade over 300ms
- **Ripple ring**: Expanding circle from key press point, fades out
- Black keys: more intense glow, subtle metallic sheen at rest

### Visualization Area
- **Idle**: Slow-moving gradient mesh / soft aurora waves (dark purple/blue)
- **Playing**: Vertical light beams shoot up from keyboard into viz area, color-matched to note
- **Chord detected**: Large glowing text center-screen (e.g., "Am7"), subtle pulse on detection

### Sidebar
- Dark glass background
- Icons dim white → neon glow when active
- Thin glowing separator line

### Song Mode Additions
- Falling notes have **neon trail** (short gradient tail behind each block)
- Now-line pulses with soft glow
- Correct key press: brief **flash + star particle** on the note block

### Overall Palette
- Dark background (`COLORS.background`)
- Neon accents from existing tokens: `COLORS.primary`, `noteWheel`, `success`, `info`
- No new colors — glow/bloom effects on existing palette
- Consistent with ExercisePlayer, HomeScreen, and LevelMap arcade aesthetic

## Components to Create/Modify

### New Components
- `src/components/FreePlay/ToolSidebar.tsx` — icon strip with toggle/widget launch
- `src/components/FreePlay/FloatingWidget.tsx` — draggable card container
- `src/components/FreePlay/MetronomeWidget.tsx` — BPM dial, tap tempo
- `src/components/FreePlay/LoopRecorderWidget.tsx` — record/overdub/play
- `src/components/FreePlay/KeySelectorWidget.tsx` — key + scale picker
- `src/components/FreePlay/TempoTrainerWidget.tsx` — progressive BPM
- `src/components/FreePlay/SessionStatsWidget.tsx` — notes, time, analysis
- `src/components/FreePlay/ChordDisplay.tsx` — real-time chord detection display
- `src/components/FreePlay/ScaleOverlay.tsx` — keyboard scale highlighting logic
- `src/components/FreePlay/OctaveArrows.tsx` — `<` `>` octave shift buttons
- `src/components/FreePlay/AuroraBackground.tsx` — animated gradient mesh
- `src/components/FreePlay/KeyGlowEffect.tsx` — neon glow + particles on key press

### Modified Components
- `src/screens/PlayScreen.tsx` — complete rewrite with new layout
- `src/components/Keyboard/Keyboard.tsx` — add octave arrow support, scale dimming, glow effects
- `src/components/Keyboard/PianoKey.tsx` — neon glow + particle burst on press
- `src/stores/settingsStore.ts` — add `freePlayOrientation` preference

### Reused Components (no changes)
- `src/components/PianoRoll/VerticalPianoRoll.tsx` — song mode falling notes
- `src/components/Keyboard/computeZoomedRange.ts` — smart octave selection
- `src/components/SongReferencePicker.tsx` — song loading modal
- `src/services/FreePlayAnalyzer.ts` — key/scale detection

## Data / State

### New State in PlayScreen
- `activeTools: Set<ToolId>` — which tools are toggled on
- `openWidgets: ToolId[]` — which floating widgets are open (max 2)
- `keyboardRange: { startNote: number, octaveCount: number }` — current visible range
- `selectedKey: string | null` — for key selector (e.g., "C")
- `selectedScale: string | null` — for scale type (e.g., "minor")
- `metronomeConfig: { bpm: number, timeSignature: string, volume: number }`
- `loopState: { isRecording, isPlaying, layers: RecordedNote[][] }`
- `tempoTrainerConfig: { startBpm, targetBpm, increment }`

### Settings Store Addition
- `freePlayOrientation: 'landscape' | 'portrait'` — persisted preference

## Dependencies
- No new packages required
- All visual effects achievable with `react-native-reanimated` + `react-native-svg`
- Metronome audio: reuse `audioEngineRef` with a click sample or oscillator
- Chord detection: extend existing `FreePlayAnalyzer` or add lightweight chord matcher

## Out of Scope
- Sheet music / staff notation in free play
- Multi-track recording / export
- Social sharing from free play
- AI coaching during free play (existing analysis + drill generation is sufficient)

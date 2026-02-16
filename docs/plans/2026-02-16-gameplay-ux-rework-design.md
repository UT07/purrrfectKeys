# Gameplay UX Rework — Design Document

**Date:** February 16, 2026
**Status:** APPROVED
**Approach:** New VerticalPianoRoll component (Approach A)

---

## 1. Problem Statement

User testing on iPhone 13 Pro revealed critical UX issues:
- Keys too small for two-hand touch play (4-octave horizontal keyboard)
- Horizontal note scrolling (left-to-right) requires mental coordinate rotation to map notes to keys
- No assistance mechanism for stuck users

## 2. Goals

1. **Vertical note flow** (top-to-bottom, Synthesia-style) with 1:1 note-to-key alignment
2. **Bigger, tappable keys** via 2-octave zoomed keyboard with smart auto-scrolling
3. **AI Demo Mode** for stuck users (60% tempo, passing threshold quality)
4. **Ghost Notes** as training wheels after watching a demo
5. **Both portrait and landscape** orientation support

---

## 3. Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| PianoRoll approach | New `VerticalPianoRoll` component | Coordinate systems are fundamentally different; branching in one component = spaghetti |
| Hit line position | 80% from top | Long runway for upcoming notes, hit line near keyboard |
| Key sizing (portrait) | 2 octaves, ~55px white keys | Fills 390pt iPhone 13 Pro width, good balance |
| Key height | 120px portrait, 100px landscape | Big touch targets |
| Demo trigger | Always-visible button + cat prompt at 3 fails | Discoverable + proactive for frustrated users |
| Demo quality | Passing threshold (~85% notes, ~80% timing) | Perfection feels intimidating; "good enough" feels achievable |
| Demo speed | 60% tempo | Slow enough to follow, fast enough to be musical |
| Ghost notes | Optional toggle, auto-fade after 2 successes | Progressive scaffolding, doesn't become a crutch |
| Orientation | Both portrait and landscape | Adaptive flex layout, portrait primary |
| Keyboard wide range | Auto-scroll (sticky range) | Shifts only when note is ≥3 semitones outside visible range, 200ms ease-out |

---

## 4. Vertical PianoRoll

### 4.1 New File: `src/components/PianoRoll/VerticalPianoRoll.tsx`

**Coordinate system:**

```
Current (horizontal):              New (vertical):
──────────────────────             ──────────────────────
X axis = time (beats)              X axis = pitch (MIDI notes)
Y axis = pitch (MIDI notes)        Y axis = time (beats)
translateX = -beat * PxPB          translateY = beat * PxPB
marker at 1/3 width                hit line at 80% from top
note width = duration * PxPB       note height = duration * PxPB
note height = fixed 44px           note width = dynamic (matches key)
```

**Constants:**
- `PIXELS_PER_BEAT = 140` (vertical pixels per beat, same as horizontal)
- `HIT_LINE_RATIO = 0.8` (80% from top)
- Note width: computed dynamically to match keyboard key widths

**Props interface:**
```typescript
interface VerticalPianoRollProps {
  notes: NoteEvent[];
  currentBeat?: number;
  tempo?: number;
  timeSignature?: [number, number];
  containerWidth: number;       // From parent layout
  containerHeight: number;      // From parent layout
  midiMin: number;              // Synced with keyboard visible range
  midiMax: number;              // Synced with keyboard visible range
  ghostNotes?: NoteEvent[];     // Semi-transparent training wheels
  ghostBeatOffset?: number;     // How far ahead ghost notes appear
  testID?: string;
}
```

**Key differences from PianoRoll.tsx:**
1. `translateY` instead of `translateX` for scrolling
2. `calculateNoteX()` maps MIDI → horizontal position (matching keyboard key positions)
3. Beat lines are horizontal instead of vertical
4. Marker (hit line) is a horizontal line at 80% from top
5. Note bars: width = key width, height = duration × PIXELS_PER_BEAT
6. Ghost notes rendered as low-opacity layer below real notes

**Performance:** Same transform-based approach on a content layer. React.memo + useMemo preserved.

### 4.2 Note-to-Key Alignment

The VerticalPianoRoll must align note columns with keyboard keys below. This requires:

```
calculateNoteX(midiNote, containerWidth, midiMin, midiRange):
  1. Determine if note is white or black key
  2. Map to the same X position as the keyboard key
  3. White notes: evenly spaced across containerWidth
  4. Black notes: centered between adjacent white keys, narrower width
```

This alignment is critical — the visual "lane" above each key is where its notes fall.

### 4.3 Visual States

Same 3-state color system:
- **Upcoming** (before hit line): `#5C6BC0` (indigo)
- **Active** (at hit line): `#FF5252` (red) + white glow
- **Past** (above hit line): `rgba(102, 187, 106, 0.4)` (faded green)

---

## 5. Zoomed Keyboard

### 5.1 Smart Range Calculation

New function in ExercisePlayer: `computeZoomedRange()`

```
Input: exercise notes, currentBeat
Output: { startNote, octaveCount }

Algorithm:
1. Look at notes in "active window" (currentBeat - 2 beats to currentBeat + 8 beats)
2. Find min/max MIDI notes in that window
3. Center on midpoint, snap startNote to nearest C
4. Default: 2 octaves
5. "Sticky range" — only shift when note is ≥3 semitones outside current range
6. Animated transition: 200ms ease-out
```

### 5.2 Keyboard Sizing

| Orientation | White Key Width | Key Height | Octaves | Total Width |
|-------------|----------------|------------|---------|-------------|
| Portrait    | ~55px          | 120px      | 2       | ~390px (fills screen) |
| Landscape   | ~60px          | 100px      | 2       | ~840px (fills screen) |

### 5.3 Split Keyboard Updates

When exercise has `hands: 'both'`:
- Each hand gets 1.5-2 octaves
- Key height reduced to 80px per keyboard (160px total)
- Same sticky-range auto-scroll per hand

---

## 6. AI Demo Mode

### 6.1 New Service: `src/services/demoPlayback.ts`

**Purpose:** Auto-play an exercise at passing threshold quality to show users how it should sound.

**Interface:**
```typescript
interface DemoPlaybackService {
  startDemo(exercise: Exercise, audioEngine: AudioEngine): void;
  stopDemo(): void;
  isPlaying: boolean;
  currentBeat: number;  // For driving VerticalPianoRoll
  activeNotes: Set<number>;  // For driving keyboard highlighting
}
```

**Passing threshold simulation:**
- Play ~85% of notes (randomly skip ~15%)
- Add small timing jitter (±20-40ms) to non-perfect notes
- Play at 60% of exercise tempo
- All audio plays through the existing audio engine

### 6.2 Triggering

**Always-visible:** Small "eye" icon button in exercise controls bar. Labeled "Demo" or "Watch".

**Cat prompt (3 fails):**
- `exerciseStore` tracks `failCount` per exercise ID (transient)
- After 3rd consecutive fail, before CompletionModal, cat companion offers demo
- Dialogue: personality-appropriate variant of "Want me to show you?"
- Resets on success or exercise change

### 6.3 Demo UI

During demo playback:
- Banner: "Watching Demo — 60% speed" (top of VerticalPianoRoll)
- Keyboard keys highlight green in sequence
- ExerciseBuddy shows "teaching" reaction
- "Stop" and "Try Now" buttons replace normal controls
- Notes still fall in VerticalPianoRoll at 60% speed
- No scoring, no note recording

### 6.4 Post-Demo Flow

1. Demo ends (or user taps "Try Now")
2. Prompt: "Ready to try? Ghost notes ON" with toggle
3. User starts exercise normally
4. Ghost notes visible if enabled

---

## 7. Ghost Notes

### 7.1 Rendering

Ghost notes appear in VerticalPianoRoll as:
- Same note positions as the exercise, offset 1-2 beats ahead
- 30% opacity, white/silver color (`rgba(255, 255, 255, 0.3)`)
- No glow, no border, no labels
- Rendered in a z-layer below real notes
- Subtle visual guide: "the note you need to play is coming here"

### 7.2 State Management

```typescript
// In exerciseStore
ghostNotesEnabled: boolean;          // Per-exercise toggle
ghostNotesSuccessCount: number;      // Counts successful passes with ghost notes
```

**Auto-fade logic:**
- After 2 successful passes (score ≥ passing threshold) with ghost notes enabled
- Cat companion says: "You've got it! Turning off the training wheels."
- `ghostNotesEnabled` set to false
- User can re-enable manually via toggle

### 7.3 Toggle UI

Small toggle in exercise controls: "Ghost Notes" on/off. Always available once a demo has been watched at least once for this exercise.

---

## 8. Layout (Portrait + Landscape)

### 8.1 Portrait (Primary)

```
┌─────────────────────────┐
│ ← Exercise title    ⋯  │  40px — top bar
│ [Demo] [Speed] [Pause]  │  36px — controls
├─────────────────────────┤
│                         │
│    VerticalPianoRoll    │  flex: 1 (remaining space)
│    (notes fall ↓↓↓)     │
│                         │
│ ─ ─ ─ hit line ─ ─ ─ ─ │  80% from top of PianoRoll
│    [PERFECT! 5x combo]  │  feedback strip
├─────────────────────────┤
│  🐱                    │  ExerciseBuddy (overlaps corner)
│ ┌─┬─┬─┬─┬─┬─┬─┬─┬─┐   │
│ │C│D│E│F│G│A│B│C│D│   │  Keyboard — 2 octaves, 120px tall
│ └─┴─┴─┴─┴─┴─┴─┴─┴─┘   │
└─────────────────────────┘
```

### 8.2 Landscape

```
┌───────────────────────────────────────────────┐
│ ← title  [Demo][Speed][Ghost][Pause]  🐱     │  top bar (single row)
├───────────────────────────────────────────────┤
│                                               │
│           VerticalPianoRoll                   │  flex: 1
│           (notes fall ↓↓↓)                    │
│                                               │
│ ─ ─ ─ ─ ─ ─ ─ hit line ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│  [PERFECT!  5x combo]                         │  feedback strip
├───────────────────────────────────────────────┤
│ │C│D│E│F│G│A│B│C│D│E│F│G│A│B│C│D│           │  Keyboard — 2 oct, 100px
└───────────────────────────────────────────────┘
```

### 8.3 Responsive Implementation

```typescript
const { width, height } = useWindowDimensions();
const isPortrait = height > width;

const keyHeight = isPortrait ? 120 : 100;
const topBarHeight = isPortrait ? 76 : 40;  // Stacked vs single row
const pianoRollHeight = height - topBarHeight - keyHeight;
```

- Remove current landscape lock from ExercisePlayer
- Allow both orientations
- Use `useWindowDimensions()` (re-renders on rotation)
- Flex-based layout adapts naturally

---

## 9. Orientation Handling Changes

**Current:** ExercisePlayer locks to landscape on mount, unlocks on unmount.

**New:** Allow both orientations. Remove `ScreenOrientation.lockAsync()` calls from ExercisePlayer. The app's default orientation settings handle the rest.

**Impact:** The 100ms/300ms delay hacks for orientation locking can be removed entirely.

---

## 10. Master Plan Updates

### New phase in master plan:

**Phase 7.5: Pre-Launch QA Sprint** (between Music Library and App Store Launch)

| Area | Tests | Pass Criteria |
|------|-------|---------------|
| AI Coach Quality | 20 exercises scored, review feedback | 80%+ feedback rated "helpful" |
| AI Exercise Generation | Generate 50 exercises, validate | No broken exercises, difficulty matches |
| Performance | Profile on iPhone 13 Pro + low-end Android | <20ms touch-to-sound, 60fps, <2s loads |
| Gamification | Full lesson 1-6 playthrough | Progression fair, XP/streaks correct |
| UI/UX | All screens walkthrough | No broken layouts, consistent theme |
| Content | Validate all 30+ exercises | No wrong notes, smooth difficulty curve |
| Offline | Full session without network | Core loop works, sync resumes |
| Edge Cases | Kill mid-exercise, rapid nav, etc. | No crashes, state recovery |

---

## 11. Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/components/PianoRoll/VerticalPianoRoll.tsx` | Vertical note flow component |
| `src/services/demoPlayback.ts` | AI demo playback service |
| `src/components/PianoRoll/__tests__/VerticalPianoRoll.test.tsx` | Tests |
| `src/services/__tests__/demoPlayback.test.ts` | Tests |

### Modified Files
| File | Changes |
|------|---------|
| `src/screens/ExercisePlayer/ExercisePlayer.tsx` | Use VerticalPianoRoll, new range calc, demo mode, ghost notes toggle, remove landscape lock, responsive layout |
| `src/stores/exerciseStore.ts` | Add `failCount`, `ghostNotesEnabled`, `ghostNotesSuccessCount`, `demoWatched` |
| `src/components/Keyboard/Keyboard.tsx` | Adjust default key height, ensure works with dynamic range updates |
| `src/screens/ExercisePlayer/ExerciseControls.tsx` | Add Demo button, Ghost Notes toggle |
| `src/screens/ExercisePlayer/CompletionModal.tsx` | Cat prompt for demo after 3 fails |
| `src/content/catDialogue.ts` | Add demo-related dialogue triggers |
| `docs/plans/2026-02-13-master-plan.md` | Add QA Sprint phase |

---

## 12. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Note-to-key alignment off by pixels | Calculate positions from shared MIDI→X function used by both components |
| Auto-scroll keyboard causes visual jumping | Sticky range (≥3 semitone threshold) + 200ms ease-out animation |
| Demo playback timing drift | Use same beat-based timing system as exercise playback |
| Ghost notes confusing instead of helpful | Auto-fade after 2 successes, easy toggle off |
| Portrait keyboard too small for large hands | 55px white keys is industry standard (Simply Piano uses ~50px) |
| Orientation change causes layout flicker | Use `useWindowDimensions()` (no orientation lock needed) |

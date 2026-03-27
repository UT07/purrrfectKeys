# Split Keyboard Redesign: Landscape Two-Hand Mode

**Date:** 2026-03-27
**Status:** Approved
**Branch:** test/stable-baseline

## Problem

Two-hand (split keyboard) exercises are confusing and cramped in portrait mode:
- Two rows of tiny keys are hard to play on a phone screen
- Visual feedback is combined — user can't tell which hand missed
- Piano roll note colors (teal=left, purple=right) don't connect to keyboard rows
- No tempo adjustment for the coordination difficulty jump

## Design

### Layout: Landscape Lock

Two-hand exercises auto-lock to landscape orientation on exercise load using `expo-screen-orientation` (already installed, v8.0.4). Reverts to portrait on exit.

No prompt or animation — the rotation itself signals the mode change (Simply Piano pattern).

### Screen Composition (Landscape)

```
┌─────────────────────────────────────────────────────────┐
│                    PIANO ROLL (~40% height)              │
│  Notes fall top-to-bottom, full width                    │
│  Left-hand notes = teal, Right-hand notes = purple       │
│  (Already implemented in VerticalPianoRoll.tsx)           │
├─────────────────────────────────────────────────────────┤
│  [Feedback: PERFECT ●R]          [Combo: 8x]            │
├──────────────────────────┬──────────────────────────────┤
│   LEFT HAND (teal tint)  │  RIGHT HAND (purple tint)    │
│                          │                              │
│  Single continuous keyboard spanning full width          │
│  Visual split marker at split point (subtle divider)     │
│  Expected keys glow in hand color                        │
│                          │                              │
└──────────────────────────┴──────────────────────────────┘
```

- Piano roll on top (~40% height), full width. Same mental model as portrait.
- Single continuous keyboard on bottom (~60% height), full screen width.
- Left-hand keys get subtle teal background tint.
- Right-hand keys get subtle purple background tint.
- Subtle divider line at the split point — visual only, not a physical gap.

### Note Hints

- Expected (next-to-play) keys get a **colored background glow** matching their hand color:
  - Left-hand expected keys → teal glow
  - Right-hand expected keys → purple glow
- Note names shown in white on glowing keys.
- Creates direct visual connection: teal note falling in piano roll → teal key glowing on keyboard.

### Per-Hand Visual Feedback

- Single centered feedback label (PERFECT / GOOD / EARLY / LATE / MISS).
- Accompanied by a colored badge: teal "L" or purple "R" indicating which hand triggered it.
- Shows the most recent hit from either hand.
- Combo meter stays centered.

### Implementation detail

The `handleKeyDown` function already knows which note was matched (`bestMatch.index`). Look up `exercise.notes[bestMatch.index].hand` to determine "L" or "R" for the badge. If `hand` is undefined, infer from split point (`note < splitPoint ? 'L' : 'R'`).

### Tempo: Auto-Slow First Attempt

- First time playing any two-hand exercise, playback speed is forced to **0.5x**.
- After passing (score >= passingScore), user can choose any speed on subsequent attempts.
- Speed preference persisted per exercise ID in `settingsStore` or `progressStore`.

### Implementation detail

Add a `twoHandSpeedOverrides` record to settings/progress: `Record<string, number>`. On exercise load, if `keyboardMode === 'split'` and no override exists, force `playbackSpeed = 0.5`. After passing, store the user's chosen speed.

### Orientation Management

- `ExercisePlayer` checks `keyboardMode` on mount.
- If `'split'`, call `ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT)`.
- On unmount (or navigation away), call `ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)`.
- Use a `useEffect` cleanup function to ensure portrait is restored even on crash/force-close.

### Keyboard Component Changes

- `SplitKeyboard.tsx` is **retired** for gameplay. Landscape mode uses a single `Keyboard` component spanning the full width.
- The keyboard range is computed from ALL exercise notes (both hands) via `computeZoomedRange`.
- Hand-zone tinting is a new feature on `Keyboard.tsx`:
  - New prop: `handZones?: { splitPoint: number; leftColor: string; rightColor: string }`.
  - Keys below `splitPoint` get `leftColor` tint; keys at/above get `rightColor` tint.
  - Expected-note glow uses the hand color instead of the default green.

### What Stays the Same

- Piano roll hand coloring (teal/purple) — already implemented in `VerticalPianoRoll.tsx` (lines 47-65, 367-384).
- Scoring engine — unchanged.
- Exercise data format — `hand` property on notes, `deriveSplitPoint()` logic.
- Portrait single-keyboard exercises — completely unchanged.
- `SplitKeyboard.tsx` kept in codebase for potential future use (demo mode, replay) but not rendered during gameplay.

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/screens/ExercisePlayer/ExercisePlayer.tsx` | Landscape lock/unlock, force 0.5x speed, per-hand feedback badge, use single Keyboard in landscape instead of SplitKeyboard |
| `src/components/Keyboard/Keyboard.tsx` | Add `handZones` prop for tinted key backgrounds and hand-colored expected-note glow |
| `src/components/Keyboard/PianoKey.tsx` | Render tint overlay and hand-colored glow |
| `src/screens/ExercisePlayer/FeedbackText.tsx` | Add optional `hand` prop for L/R badge |
| `src/stores/settingsStore.ts` or `src/stores/progressStore.ts` | Add `twoHandSpeedOverrides` record |

## Testing

- Verify landscape lock/unlock on two-hand exercise load/exit.
- Verify single-hand exercises remain portrait.
- Verify hand-colored key tints and expected-note glow.
- Verify per-hand feedback badge shows correct hand.
- Verify 0.5x speed forced on first attempt, user speed after passing.
- Verify piano roll hand colors match keyboard hand tints.
- Regression: all existing keyboard/scoring tests still pass.

## Dependencies

- `expo-screen-orientation` v8.0.4 — already installed.
- No new packages needed.

# Split Keyboard Redesign: Landscape Two-Hand Mode

**Date:** 2026-03-27
**Status:** Approved (v2 — reviewed)
**Branch:** test/stable-baseline

## Problem

Two-hand (split keyboard) exercises are confusing and cramped in portrait mode:
- Two rows of tiny keys are hard to play on a phone screen
- Visual feedback is combined — user can't tell which hand missed
- Piano roll note colors (teal=left, purple=right) don't connect to keyboard rows
- No tempo adjustment for the coordination difficulty jump

## Scope

This applies to **ALL two-hand exercises** across the entire app — lesson-04 static exercises, AI-generated two-hand exercises, demo mode, replay with Salsa, and any future two-hand content. Every screen and flow that renders a two-hand exercise must use the new landscape layout.

## Design

### Layout: Landscape Lock

Two-hand exercises auto-lock to landscape orientation on exercise load using `expo-screen-orientation` (already installed, v8.0.4). Reverts to portrait on exit.

No prompt or animation — the rotation itself signals the mode change (Simply Piano pattern).

**Orientation direction:** Use `LANDSCAPE` (allows both left and right landscape) — not locked to one side. Users hold their phone whichever way feels natural.

### Screen Composition (Landscape)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⏸ ↻ ✕ │ Ode to Joy    70%    🔔 👻  0.5x │  ← compact top bar    │
├─────────────────────────────────────────────────────────────────────┤
│                    PIANO ROLL (~40% height)                         │
│  Notes fall top-to-bottom, full width                               │
│  Left-hand notes = teal, Right-hand notes = purple                  │
│  (Already implemented in VerticalPianoRoll.tsx)                      │
├─────────────────────────────────────────────────────────────────────┤
│  ═══════ Beat 4 ═══════  [PERFECT ●R]  [8x]  ═══════════════════  │
├──────────────────────────────┬──────────────────────────────────────┤
│   LEFT HAND (teal tint)      │   RIGHT HAND (purple tint)          │
│                              │                                     │
│   Single continuous keyboard spanning full width                    │
│   Visual split marker at split point (subtle divider)               │
│   Expected keys glow in hand color                                  │
│                              │                                     │
└──────────────────────────────┴──────────────────────────────────────┘
  ↑ safe area inset (notch)                    safe area inset (notch) ↑
```

**Top bar (compact):** Same controls as portrait (pause, restart, close, title, score%, speed) but laid out as a single-row icon bar. Reduced height (~40px) to maximize piano roll + keyboard space.

**Piano roll:** Top ~40% of remaining height, full width. Same mental model as portrait but wider — notes more spread out and easier to read per hand.

**Beat indicator + feedback:** Single row between piano roll and keyboard. Contains beat/progress indicator, feedback label with hand badge, and combo meter.

**Keyboard:** Bottom ~50% of remaining height, full screen width.
- Left-hand keys get subtle teal background tint.
- Right-hand keys get subtle purple background tint.
- Subtle divider line at the split point — visual only, not a physical gap.

**Safe areas:** Use `SafeAreaView` / `useSafeAreaInsets()` to handle iPhone notch/Dynamic Island on both sides in landscape. Keyboard edges must not be clipped by notch.

**ExerciseBuddy (cat mascot):** Hidden in landscape mode. Not enough vertical space — the piano roll and keyboard need every pixel. Cat appears in portrait and on the post-exercise screen as usual.

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

**Implementation:** The `handleKeyDown` function already knows which note was matched (`bestMatch.index`). Look up `exercise.notes[bestMatch.index].hand` to determine "L" or "R" for the badge. If `hand` is undefined, infer from split point (`note < splitPoint ? 'L' : 'R'`).

### Tempo: Auto-Slow First Attempt

- First time playing ANY two-hand exercise, playback speed is forced to **0.5x**.
- This is a **unified setting** — not per-exercise. Once the user passes any two-hand exercise, the 0.5x lock is lifted for ALL two-hand exercises.
- After unlocking, the user's chosen speed applies (persisted globally for two-hand exercises).

**Implementation:** Add `twoHandSpeedUnlocked: boolean` and `twoHandSpeed: number` to `settingsStore`. On exercise load, if `keyboardMode === 'split'` and `!twoHandSpeedUnlocked`, force `playbackSpeed = 0.5`. After passing any two-hand exercise, set `twoHandSpeedUnlocked = true`. Use `immediateSave` for both fields.

### Orientation Management

- `ExercisePlayer` checks `keyboardMode` on mount.
- If `'split'`, call `ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)`.
- On unmount (or navigation away), call `ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)`.
- Use a `useEffect` cleanup function to ensure portrait is restored even on unexpected unmount.

### Post-Exercise Flow

- When a two-hand exercise completes, **rotate back to portrait first**, then show PostExerciseScreen.
- PostExerciseScreen is designed for portrait — no landscape adaptation needed.
- The orientation unlock happens in the exercise completion handler, before navigating to PostExerciseScreen.

### Demo Mode & Replay with Salsa

- Demo mode (`DemoPlaybackService`) and Salsa replay BOTH use the new landscape layout for two-hand exercises.
- The landscape lock applies to the entire ExercisePlayer session, including demo and replay phases.
- `SplitKeyboard.tsx` is fully retired — demo/replay also use the single landscape keyboard with hand-zone tinting.
- `DemoPlaybackService` highlights notes on the single keyboard using the existing `highlightedNotes` prop; hand colors come from `handZones` tinting.

### Keyboard Component Changes

- `SplitKeyboard.tsx` is **retired**. All two-hand rendering uses a single `Keyboard` component in landscape.
- The keyboard range is computed from ALL exercise notes (both hands) via `computeZoomedRange`.
- Target: fit all notes without scrolling. Landscape width (~812px iPhone) comfortably fits 3 octaves of full-sized keys. Use `computeZoomedRange(allNotes, 3)` as default; auto-expand if exercise spans more.
- `scrollable={false}` — no scrolling in landscape two-hand mode.
- Hand-zone tinting is a new feature on `Keyboard.tsx`:
  - New prop: `handZones?: { splitPoint: number; leftColor: string; rightColor: string }`.
  - Keys below `splitPoint` get `leftColor` tint; keys at/above get `rightColor` tint.
  - Expected-note glow uses the hand color instead of the default green.

### Notes Without `hand` Property

Some exercise notes may not have a `hand` field. In these cases:
- Infer hand from split point: `note.note < splitPoint ? 'left' : 'right'`.
- This applies to keyboard tinting, feedback badge, and expected-note glow.
- `deriveSplitPoint()` from `SplitKeyboard.tsx` is reused (moved to a shared utility if needed).

### What Stays the Same

- Piano roll hand coloring (teal/purple) — already implemented in `VerticalPianoRoll.tsx` (lines 47-65, 367-384).
- Scoring engine — unchanged.
- Exercise data format — `hand` property on notes, `deriveSplitPoint()` logic.
- Portrait single-keyboard exercises — completely unchanged.
- Count-in overlay — works as a centered overlay, adapts to landscape automatically.

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/screens/ExercisePlayer/ExercisePlayer.tsx` | Landscape lock/unlock, compact top bar layout, hide ExerciseBuddy, force 0.5x speed, per-hand feedback badge, use single Keyboard in landscape instead of SplitKeyboard, rotate to portrait before PostExerciseScreen |
| `src/components/Keyboard/Keyboard.tsx` | Add `handZones` prop for tinted key backgrounds and hand-colored expected-note glow |
| `src/components/Keyboard/PianoKey.tsx` | Render tint overlay and hand-colored glow |
| `src/screens/ExercisePlayer/FeedbackText.tsx` | Add optional `hand` prop for L/R colored badge |
| `src/stores/settingsStore.ts` | Add `twoHandSpeedUnlocked: boolean` and `twoHandSpeed: number` with `immediateSave` |
| `src/services/demoPlayback.ts` | Ensure demo highlights work with single keyboard + handZones |
| `src/components/Keyboard/SplitKeyboard.tsx` | Mark as deprecated, no longer imported in ExercisePlayer |

## App-Wide Impact

Every flow that can trigger a two-hand exercise must respect the new landscape mode:

| Flow | Action Needed |
|------|--------------|
| HomeScreen → Today's Practice → two-hand exercise | ExercisePlayer handles orientation |
| DailySessionScreen → two-hand exercise | Same — ExercisePlayer handles it |
| LevelMapScreen → lesson-04 exercises | Same |
| AI-generated two-hand exercises | Same — `keyboardMode` detection is note-based |
| "Review with Salsa" replay on two-hand exercise | Landscape stays active during replay |
| Demo mode on two-hand exercise | Landscape stays active during demo |
| PostExerciseScreen after two-hand exercise | Portrait — rotation happens before navigation |

## Testing

- Verify landscape lock/unlock on two-hand exercise load/exit.
- Verify orientation is `LANDSCAPE` (both directions work).
- Verify single-hand exercises remain portrait.
- Verify safe area insets handle notch on both sides.
- Verify compact top bar in landscape.
- Verify ExerciseBuddy hidden in landscape.
- Verify hand-colored key tints and expected-note glow.
- Verify per-hand feedback badge shows correct hand.
- Verify 0.5x speed forced on first two-hand attempt, unlocked after first pass.
- Verify piano roll hand colors match keyboard hand tints.
- Verify demo mode works in landscape with hand-zone tinting.
- Verify Salsa replay works in landscape.
- Verify PostExerciseScreen shows in portrait after two-hand exercise.
- Verify notes without `hand` property fall back to split-point inference.
- Regression: all existing keyboard/scoring tests still pass.

## Dependencies

- `expo-screen-orientation` v8.0.4 — already installed.
- No new packages needed.

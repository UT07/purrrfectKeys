# Split Keyboard Landscape Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cramped portrait split keyboard with a landscape single-keyboard layout for all two-hand exercises.

**Architecture:** ExercisePlayer detects `keyboardMode === 'split'` and locks to landscape via `expo-screen-orientation`. SplitKeyboard is retired; a single `Keyboard` component renders with hand-zone tinting (teal left / purple right). FeedbackText gets a hand badge. Speed is forced to 0.5x until the user passes their first two-hand exercise.

**Tech Stack:** React Native, expo-screen-orientation, react-native-reanimated, Zustand

**Spec:** `docs/superpowers/specs/2026-03-27-split-keyboard-landscape-design.md`

---

### Task 1: Settings Store — Two-Hand Speed Fields

**Files:**
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/services/firebase/syncService.ts:1044-1057`

- [ ] **Step 1: Add fields to settingsStore defaults**

In `src/stores/settingsStore.ts`, add to `defaultSettings` (after line 69):

```typescript
  // Two-hand exercise speed control
  twoHandSpeedUnlocked: false,
  twoHandSpeed: 0.5,
```

- [ ] **Step 2: Add unlockTwoHandSpeed action**

In the store definition (inside `create<SettingsStoreState>((set, get) => ({`), add:

```typescript
  unlockTwoHandSpeed: () => {
    set({ twoHandSpeedUnlocked: true });
    immediateSave({ ...get(), twoHandSpeedUnlocked: true });
  },

  setTwoHandSpeed: (speed: number) => {
    set({ twoHandSpeed: speed });
    immediateSave({ ...get(), twoHandSpeed: speed });
  },
```

- [ ] **Step 3: Add to sync push**

In `src/services/firebase/syncService.ts`, inside `saveSettingsSyncData` call (~line 1044), add after `darkMode`:

```typescript
        twoHandSpeedUnlocked: settings.twoHandSpeedUnlocked ?? false,
        twoHandSpeed: settings.twoHandSpeed ?? 0.5,
```

- [ ] **Step 4: Add to sync pull**

In the settings merge block (~line 752-767), add after the `dailyGoalMinutes` line:

```typescript
          if (remoteSettings.twoHandSpeedUnlocked && !local.twoHandSpeedUnlocked) updates.twoHandSpeedUnlocked = true;
          if (remoteSettings.twoHandSpeed && local.twoHandSpeed === 0.5) updates.twoHandSpeed = remoteSettings.twoHandSpeed;
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/stores/settingsStore.ts src/services/firebase/syncService.ts
git commit -m "feat: add twoHandSpeedUnlocked and twoHandSpeed to settings"
```

---

### Task 2: PianoKey — Hand-Zone Tint Support

**Files:**
- Modify: `src/components/Keyboard/PianoKey.tsx`

- [ ] **Step 1: Add handTintColor prop**

In `PianoKeyProps` interface (~line 65), add:

```typescript
  /** Hand-zone tint color (hex) for two-hand mode */
  handTintColor?: string;
```

- [ ] **Step 2: Render tint overlay**

In the PianoKey component render, add a tint overlay View. Find the outermost `<View>` or `<Animated.View>` that wraps the key. Add inside it, as the first child:

```typescript
{handTintColor && (
  <View
    style={[
      StyleSheet.absoluteFill,
      { backgroundColor: handTintColor, opacity: 0.12, borderRadius: isBlackKey ? 4 : 2 },
    ]}
    pointerEvents="none"
  />
)}
```

- [ ] **Step 3: Use hand color for expected-note glow**

Find where `isExpected` applies styling (the green glow). When `handTintColor` is set, use it instead of the default green. Change the expected border/glow color:

```typescript
const expectedGlowColor = handTintColor ?? COLORS.feedbackGood;
```

Apply `expectedGlowColor` wherever the expected-note highlight color is used.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 5: Run keyboard tests**

Run: `npx jest --testPathPattern="Keyboard|PianoKey" --passWithNoTests`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add src/components/Keyboard/PianoKey.tsx
git commit -m "feat: add handTintColor prop to PianoKey for two-hand zones"
```

---

### Task 3: Keyboard — handZones Prop

**Files:**
- Modify: `src/components/Keyboard/Keyboard.tsx`

- [ ] **Step 1: Add handZones prop to KeyboardProps**

In `KeyboardProps` interface (~line 29), add:

```typescript
  /** Two-hand mode: tint keys by hand zone */
  handZones?: { splitPoint: number; leftColor: string; rightColor: string };
```

- [ ] **Step 2: Pass handTintColor to PianoKey**

Find where `<PianoKey>` is rendered (inside the keys map). Compute the tint color per key:

```typescript
const handTintColor = handZones
  ? (midiNote < handZones.splitPoint ? handZones.leftColor : handZones.rightColor)
  : undefined;
```

Pass `handTintColor={handTintColor}` to each `<PianoKey>`.

- [ ] **Step 3: Pass hand color to expected-note glow**

Where `isExpected` is computed per key, also pass the hand color so the expected glow matches:

```typescript
handTintColor={isExpected && handZones
  ? (midiNote < handZones.splitPoint ? handZones.leftColor : handZones.rightColor)
  : handTintColor}
```

Actually simpler: always pass `handTintColor` — PianoKey uses it for both tint and expected glow.

- [ ] **Step 4: Typecheck and test**

Run: `npm run typecheck && npx jest --testPathPattern="Keyboard" --passWithNoTests`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/components/Keyboard/Keyboard.tsx
git commit -m "feat: add handZones prop to Keyboard for two-hand tinting"
```

---

### Task 4: FeedbackText — Hand Badge

**Files:**
- Modify: `src/screens/ExercisePlayer/FeedbackText.tsx`

- [ ] **Step 1: Add hand prop**

In `FeedbackTextProps` interface (~line 21), add:

```typescript
  /** Which hand triggered this feedback (two-hand mode) */
  hand?: 'left' | 'right';
```

- [ ] **Step 2: Define hand badge colors**

Add constants after the COLOR record:

```typescript
const HAND_BADGE_COLOR: Record<string, string> = {
  left: '#26C6DA',   // teal — matches piano roll left
  right: '#7C4DFF',  // purple — matches piano roll right
};

const HAND_BADGE_LABEL: Record<string, string> = {
  left: 'L',
  right: 'R',
};
```

- [ ] **Step 3: Render badge next to feedback label**

In the `FeedbackText` component render (~line 89), wrap the existing `Animated.Text` in a `View` with `flexDirection: 'row'` and add the badge:

```typescript
export function FeedbackText({ type, trigger, timingOffsetMs, hand }: FeedbackTextProps) {
  const color = COLOR[type] ?? COLORS.feedbackDefault;
  const label = LABEL[type] ?? '';
  const fontSize = getFontSize(type);
  const glowRadius = getGlowRadius(type);

  const offsetLabel =
    (type === 'early' || type === 'late') && timingOffsetMs != null
      ? ` ${Math.abs(Math.round(timingOffsetMs))}ms`
      : '';

  return (
    <Animated.View
      key={trigger}
      entering={getEntering(type)}
      style={styles.badgeRow}
    >
      <Text
        style={[
          styles.text,
          {
            color,
            fontSize,
            textShadowColor: color,
            textShadowRadius: glowRadius,
          },
        ]}
      >
        {label}{offsetLabel}
      </Text>
      {hand && (
        <View style={[styles.handBadge, { backgroundColor: HAND_BADGE_COLOR[hand] }]}>
          <Text style={styles.handBadgeText}>{HAND_BADGE_LABEL[hand]}</Text>
        </View>
      )}
    </Animated.View>
  );
}
```

Add styles:

```typescript
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  handBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
```

- [ ] **Step 4: Import Text and View**

Add `Text` and `View` to the `react-native` import at the top:

```typescript
import { StyleSheet, Platform, View, Text } from 'react-native';
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/screens/ExercisePlayer/FeedbackText.tsx
git commit -m "feat: add hand badge (L/R) to FeedbackText for two-hand mode"
```

---

### Task 5: ExercisePlayer — Landscape Orientation Lock

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`

- [ ] **Step 1: Import ScreenOrientation**

Add at the top imports:

```typescript
import * as ScreenOrientation from 'expo-screen-orientation';
```

- [ ] **Step 2: Add landscape lock useEffect**

After the `keyboardMode` useMemo (~line 732), add:

```typescript
  // Lock to landscape for two-hand exercises, restore portrait on exit
  const [isLandscape, setIsLandscape] = useState(false);
  useEffect(() => {
    if (keyboardMode !== 'split' || showLoadingScreen) return;

    let cancelled = false;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)
      .then(() => { if (!cancelled) setIsLandscape(true); })
      .catch(() => {});

    return () => {
      cancelled = true;
      // Best-effort restore — cleanup can't be async
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      setIsLandscape(false);
    };
  }, [keyboardMode, showLoadingScreen]);
```

- [ ] **Step 3: Await portrait rotation in handleExit**

In `handleExit` (~line 1974), add rotation before navigation:

```typescript
  const handleExit = useCallback(async () => {
    stopPlayback();
    exerciseStore.clearSession();
    // Rotate to portrait before navigating away from landscape
    if (keyboardMode === 'split') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
    setTimeout(() => {
      if (!mountedRef.current) return;
      if (onClose) {
        onClose();
      } else {
        navigation.goBack();
      }
    }, 50);
  }, [stopPlayback, exerciseStore, onClose, navigation, keyboardMode]);
```

- [ ] **Step 4: Await portrait in XP-transition-complete handler**

Find the handler that navigates to PostExerciseScreen after XP overlay. Add the same rotation await before navigation. Search for `navigation.replace('PostExercise'` or `handleXpTransitionComplete`:

```typescript
    // Before navigating to PostExerciseScreen
    if (keyboardMode === 'split') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add src/screens/ExercisePlayer/ExercisePlayer.tsx
git commit -m "feat: landscape lock for two-hand exercises with portrait restore"
```

---

### Task 6: ExercisePlayer — Landscape Layout & Single Keyboard

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`

- [ ] **Step 1: Hide ExerciseBuddy in landscape**

Find where `ExerciseBuddy` is rendered. Wrap it with a landscape check:

```typescript
{!isLandscape && (
  <ExerciseBuddy ... />
)}
```

- [ ] **Step 2: Replace SplitKeyboard with single Keyboard in landscape**

Find the `keyboardMode === 'split'` conditional (~line 3168). Replace the `SplitKeyboard` render with a single `Keyboard` using `handZones`:

```typescript
{keyboardMode === 'split' ? (
  <Keyboard
    startNote={keyboardStartNote}
    octaveCount={keyboardOctaveCount}
    onNoteOn={handleKeyDown}
    onNoteOff={handleKeyUp}
    highlightedNotes={replayHighlightedKeys ?? (isDemoPlaying ? demoActiveNotes : highlightedKeys)}
    expectedNotes={playerMode === 'replay' ? new Set<number>() : expectedNotes}
    enabled={playerMode !== 'replay' && !isMicExclusive}
    hapticEnabled={playerMode !== 'replay'}
    showLabels={!isSightReading && !testModeRef.current}
    scrollable={false}
    focusNote={isPlaying ? undefined : nextExpectedNote}
    keyHeight={singleKeyHeight}
    handZones={{
      splitPoint,
      leftColor: '#26C6DA',
      rightColor: '#7C4DFF',
    }}
    testID="exercise-keyboard"
  />
) : (
```

- [ ] **Step 3: Compute keyboard range from all notes for split mode**

In the keyboard range computation, when `keyboardMode === 'split'`, compute range from ALL notes (not per-hand). Find where `keyboardStartNote` and `keyboardOctaveCount` are derived and ensure the split mode uses all notes:

```typescript
const { startNote: keyboardStartNote, octaveCount: keyboardOctaveCount } = useMemo(() => {
  if (keyboardMode === 'split') {
    // Landscape: single keyboard covering both hands
    return computeZoomedRange(exercise.notes.map(n => n.note));
  }
  return keyboardRange;
}, [keyboardMode, exercise.notes, keyboardRange]);
```

- [ ] **Step 4: Compact top bar in landscape**

Add a style modifier for the top bar when `isLandscape`:

```typescript
<View style={[styles.topBar, isLandscape && styles.topBarLandscape]}>
```

Add style:

```typescript
topBarLandscape: {
  paddingVertical: 4,
  paddingHorizontal: 8,
  minHeight: 40,
},
```

- [ ] **Step 5: Safe area handling**

Import and use `useSafeAreaInsets`:

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

In the component:

```typescript
const insets = useSafeAreaInsets();
```

Apply insets to the keyboard container in landscape:

```typescript
<View style={[
  styles.keyboardContainer,
  isLandscape && { paddingLeft: insets.left, paddingRight: insets.right },
]}>
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add src/screens/ExercisePlayer/ExercisePlayer.tsx
git commit -m "feat: landscape layout with single keyboard and hand zones"
```

---

### Task 7: ExercisePlayer — Per-Hand Feedback & Speed Lock

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`

- [ ] **Step 1: Track feedback hand**

Extend the `FeedbackState` type to include hand. Find where `FeedbackState` is defined:

```typescript
interface FeedbackState {
  type: 'perfect' | 'good' | 'ok' | 'early' | 'late' | 'miss' | null;
  noteIndex: number;
  timestamp: number;
  timingOffsetMs: number;
  hand?: 'left' | 'right';
}
```

- [ ] **Step 2: Set hand in handleKeyDown feedback**

In `handleKeyDown`, where `setFeedback` is called after `bestMatch` (~line 2270), add hand:

```typescript
const matchedHand = curExercise.notes[bestMatch.index]?.hand
  ?? (externalNote.note < splitPoint ? 'left' : 'right');

setFeedback({
  type: feedbackType,
  noteIndex: bestMatch.index,
  timestamp: Date.now(),
  timingOffsetMs: bestMatch.beatDiffSigned * msPerBeat,
  hand: keyboardMode === 'split' ? matchedHand : undefined,
});
```

For miss feedback, infer hand from the played note:

```typescript
setFeedback({
  type: 'miss',
  noteIndex: -1,
  timestamp: Date.now(),
  timingOffsetMs: 0,
  hand: keyboardMode === 'split'
    ? (externalNote.note < splitPoint ? 'left' : 'right')
    : undefined,
});
```

- [ ] **Step 3: Pass hand to FeedbackText**

Find where `<FeedbackText>` is rendered (~line 3121), add the hand prop:

```typescript
<FeedbackText
  type={feedback.type}
  trigger={feedback.timestamp}
  timingOffsetMs={feedback.timingOffsetMs}
  hand={feedback.hand}
/>
```

- [ ] **Step 4: Force 0.5x speed for two-hand**

Near the top of ExercisePlayer, after settings reads, add the speed override:

```typescript
const twoHandSpeedUnlocked = useSettingsStore(s => s.twoHandSpeedUnlocked);
```

In the playback speed logic, when `keyboardMode === 'split'` and `!twoHandSpeedUnlocked`, force 0.5x:

```typescript
const effectivePlaybackSpeed = (keyboardMode === 'split' && !twoHandSpeedUnlocked)
  ? 0.5
  : playbackSpeed;
```

Use `effectivePlaybackSpeed` wherever `playbackSpeed` is passed to the playback hook.

- [ ] **Step 5: Unlock after passing**

In the completion handler, after `score.isPassed` check, unlock two-hand speed:

```typescript
if (score.isPassed && keyboardMode === 'split' && !twoHandSpeedUnlocked) {
  useSettingsStore.getState().unlockTwoHandSpeed();
}
```

- [ ] **Step 6: Lock icon on speed button**

Find the speed selector button render. When `keyboardMode === 'split' && !twoHandSpeedUnlocked`, disable it and show lock indicator:

```typescript
<PressableScale
  disabled={keyboardMode === 'split' && !twoHandSpeedUnlocked}
  style={[styles.speedButton, (keyboardMode === 'split' && !twoHandSpeedUnlocked) && { opacity: 0.5 }]}
>
  <Text style={styles.speedText}>
    {keyboardMode === 'split' && !twoHandSpeedUnlocked ? '🔒 0.5x' : `${effectivePlaybackSpeed}x`}
  </Text>
</PressableScale>
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors

- [ ] **Step 8: Commit**

```bash
git add src/screens/ExercisePlayer/ExercisePlayer.tsx
git commit -m "feat: per-hand feedback badge and 0.5x speed lock for two-hand"
```

---

### Task 8: Remove SplitKeyboard Import & Deprecate

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`
- Modify: `src/components/Keyboard/SplitKeyboard.tsx`

- [ ] **Step 1: Remove SplitKeyboard import from ExercisePlayer**

Remove the import line:

```typescript
// DELETE THIS LINE:
import { SplitKeyboard, deriveSplitPoint } from '../../components/Keyboard/SplitKeyboard';
```

Keep `deriveSplitPoint` — move the import to get it from the utility:

```typescript
import { deriveSplitPoint } from '../../components/Keyboard/SplitKeyboard';
```

Or if we extracted it, import from the new location.

- [ ] **Step 2: Remove focusNoteLeft/focusNoteRight state**

Delete the `focusNoteLeft` and `focusNoteRight` useState hooks and the corresponding setters in the useEffect that updates them. These are no longer needed since we use a single keyboard.

- [ ] **Step 3: Add deprecation comment to SplitKeyboard**

At the top of `src/components/Keyboard/SplitKeyboard.tsx`:

```typescript
/**
 * @deprecated Replaced by landscape single-keyboard layout (March 2026).
 * Two-hand exercises now use Keyboard.tsx with handZones prop in landscape.
 * Kept for reference only — not imported in ExercisePlayer.
 */
```

- [ ] **Step 4: Typecheck and full test**

Run: `npm run typecheck && npx jest --passWithNoTests`
Expected: 0 TypeScript errors, all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/screens/ExercisePlayer/ExercisePlayer.tsx src/components/Keyboard/SplitKeyboard.tsx
git commit -m "refactor: retire SplitKeyboard, use single Keyboard with handZones"
```

---

### Task 9: Integration Test & Polish

**Files:**
- All modified files from Tasks 1-8

- [ ] **Step 1: Run full test suite**

Run: `npm run typecheck && npm run test`
Expected: 0 TypeScript errors, all tests pass

- [ ] **Step 2: Run QA suites**

Run: `npm run test:qa`
Expected: All QA suites pass

- [ ] **Step 3: Manual device verification checklist**

Test on simulator/device:
1. Open a single-hand exercise → stays portrait, no changes
2. Open Ode to Joy (lesson-04-ex-04) → auto-rotates to landscape
3. Piano roll shows teal (left) and purple (right) notes
4. Keyboard shows teal tint on left-hand keys, purple on right
5. Expected notes glow in hand color
6. Play a note → feedback shows "PERFECT" with colored L or R badge
7. Speed locked at 0.5x with lock icon (if first time)
8. Pass the exercise → speed unlocks
9. Close (X) → rotates back to portrait before HomeScreen
10. Complete exercise → CompletionModal in landscape → PostExerciseScreen in portrait
11. Demo mode on two-hand exercise → landscape with hand-colored keys

- [ ] **Step 4: Final commit with any polish**

```bash
git add -A
git commit -m "polish: split keyboard landscape mode integration complete"
```

---

## Review Checkpoints

- **After Task 3:** Keyboard hand-zone tinting works visually (can test in Storybook or a simple render test).
- **After Task 5:** Landscape lock/unlock cycle works — exercise loads in landscape, exit returns to portrait.
- **After Task 7:** Full feature works end-to-end — hand feedback, speed lock, landscape layout.
- **After Task 9:** All tests pass, device verification complete.

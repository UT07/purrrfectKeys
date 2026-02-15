# Gamification Polish Sprint — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Purrrfect Keys feel like a polished, fun game with always-on fun facts between exercises, animated score rings, visible cat mascots, note duration scoring, and a cat avatar switch screen.

**Architecture:** All changes stay within the existing React Native + Zustand + Reanimated stack. Visual polish touches the transition layer (`src/components/transitions/`), mascot system (`src/components/Mascot/`), and scoring engine (`src/core/exercises/`). A new CatSwitchScreen gets added to the navigation stack. Dev-mode MIDI keyboard mapping is added to ExercisePlayer for laptop testing.

**Tech Stack:** React Native, react-native-reanimated 3, react-native-svg, Zustand v5, Jest

---

## Task 1: Always-On Fun Fact Transition + ScoreRing in ExerciseCard

**Why:** Currently fun facts appear only 30% of the time in ExerciseCard. The user wants every exercise-to-exercise transition to show a fun fact. Also, ScoreRing (animated SVG) exists but isn't used — it should replace the static score circle.

**Files:**
- Modify: `src/content/funFactSelector.ts` — remove 30% gate
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx:365-375` — always set fun fact
- Modify: `src/components/transitions/ExerciseCard.tsx` — use ScoreRing, add confetti for 3-star
- Test: `src/content/__tests__/funFacts.test.ts` — update test for removed probability
- Test: `src/components/transitions/__tests__/ExerciseCard.test.tsx` — new test file

**Step 1: Update funFactSelector to always show**

In `src/content/funFactSelector.ts`, change `shouldShowFunFact()` to always return `true`:

```typescript
export function shouldShowFunFact(): boolean {
  return true;
}
```

**Step 2: Update ExercisePlayer to always pass fun fact**

In `src/screens/ExercisePlayer/ExercisePlayer.tsx` lines 365-372, remove the `shouldShowFunFact()` gate:

```typescript
if (score.isPassed && exNextId && !isLessonComplete) {
  // Always show a contextual fun fact between exercises
  setExerciseCardFunFact(getFactForExerciseType(exercise.metadata.skills));
  setShowExerciseCard(true);
} else {
  setShowCompletion(true);
}
```

**Step 3: Wire ScoreRing into ExerciseCard**

In `src/components/transitions/ExerciseCard.tsx`:
1. Import `ScoreRing` from `../common/ScoreRing`
2. Import `ConfettiEffect` from `./ConfettiEffect`
3. Replace the static `scoreCircle` View with `<ScoreRing score={score} size={80} />`
4. Add `{stars === 3 && <ConfettiEffect />}` at the top of the card

```typescript
import { ScoreRing } from '../common/ScoreRing';
import { ConfettiEffect } from './ConfettiEffect';

// In the render, replace:
//   <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
//     <Text ...>{Math.round(score)}</Text><Text>%</Text>
//   </View>
// With:
<ScoreRing score={score} size={80} strokeWidth={4} />
```

**Step 4: Run tests**

```bash
cd /Users/ut/Documents/purrrfectKeys/purrrfect-keys && npx jest --silent
```

**Step 5: Commit**

```bash
git add src/content/funFactSelector.ts src/screens/ExercisePlayer/ExercisePlayer.tsx src/components/transitions/ExerciseCard.tsx
git commit -m "feat: always show fun facts between exercises, wire ScoreRing + confetti into ExerciseCard"
```

---

## Task 2: Make Salsa Green Eyes Visible Everywhere

**Why:** KeysieSvg has green eyes for `encouraging`/`excited`/`teaching` moods, but MascotBubble renders emoji (not SVG) and CatAvatar always passes `mood="happy"` (closed eyes, no iris visible).

**Files:**
- Modify: `src/components/Mascot/MascotBubble.tsx` — replace emoji avatar with KeysieSvg
- Modify: `src/components/Mascot/CatAvatar.tsx` — use `mood="encouraging"` instead of `"happy"`
- Test: `src/components/Mascot/__tests__/KeysieAvatar.test.tsx` — verify green eyes render

**Step 1: Replace emoji with KeysieSvg in MascotBubble**

In `src/components/Mascot/MascotBubble.tsx`:
1. Import `KeysieSvg` from `./KeysieSvg`
2. Remove `MOOD_EXPRESSIONS` record
3. Replace the emoji `<Text>` inside the avatar View with:
```typescript
<KeysieSvg mood={mood} size="small" pixelSize={Math.round(avatarSize * 0.8)} />
```

Keep the mood-tinted circle background and border — just swap the content from emoji to SVG.

**Step 2: Update CatAvatar to show open eyes**

In `src/components/Mascot/CatAvatar.tsx` line 98-99, change:
```typescript
// Before:
<KeysieSvg mood="happy" size="medium" accentColor={cat.color} pixelSize={...} />
// After:
<KeysieSvg mood="encouraging" size="medium" accentColor={cat.color} pixelSize={...} />
```

This makes cats show open green eyes by default (encouraging mood = soft oval eyes with green iris).

**Step 3: Run tests**

```bash
cd /Users/ut/Documents/purrrfectKeys/purrrfect-keys && npx jest --silent
```

**Step 4: Commit**

```bash
git add src/components/Mascot/MascotBubble.tsx src/components/Mascot/CatAvatar.tsx
git commit -m "feat: show Salsa SVG with green eyes in MascotBubble and CatAvatar"
```

---

## Task 3: Mini Meowww Tuxedo Cat Variant

**Why:** Mini Meowww's backstory says "the tiniest tuxedo cat" but the SVG renders as the same grey cat as all others. Need a black body + white chest tuxedo pattern.

**Files:**
- Modify: `src/components/Mascot/KeysieSvg.tsx` — add `variant` prop, render tuxedo body when variant is `'tuxedo'`
- Modify: `src/components/Mascot/catCharacters.ts` — add `variant` field to CatCharacter
- Modify: `src/components/Mascot/CatAvatar.tsx` — pass variant from cat data to KeysieSvg
- Test: `src/components/Mascot/__tests__/KeysieSvg.test.tsx` — test tuxedo variant renders

**Step 1: Add variant to CatCharacter type and Mini Meowww data**

In `src/components/Mascot/catCharacters.ts`:
```typescript
export interface CatCharacter {
  // ... existing fields
  variant?: 'default' | 'tuxedo'; // SVG body variant
}
```

Set Mini Meowww's variant:
```typescript
{
  id: 'mini-meowww',
  // ...existing fields
  variant: 'tuxedo',
}
```

**Step 2: Add tuxedo body to KeysieSvg**

In `src/components/Mascot/KeysieSvg.tsx`:
1. Add `variant?: 'default' | 'tuxedo'` to `KeysieSvgProps`
2. In the body rendering section, when `variant === 'tuxedo'`:
   - Main body color: `#1A1A1A` (near black) instead of `BODY_COLOR` (#3A3A3A)
   - Add a white chest patch: `<Path d="M 42 58 Q 50 52 58 58 L 56 75 Q 50 78 44 75 Z" fill="#F5F5F5" />`
   - Add white paws: two small white circles at the bottom of the legs

**Step 3: Pass variant through CatAvatar**

In `src/components/Mascot/CatAvatar.tsx`:
```typescript
<KeysieSvg
  mood="encouraging"
  size="medium"
  accentColor={cat.color}
  pixelSize={Math.round(dimension * 0.75)}
  variant={cat.variant}
/>
```

**Step 4: Run tests**

```bash
cd /Users/ut/Documents/purrrfectKeys/purrrfect-keys && npx jest --silent
```

**Step 5: Commit**

```bash
git add src/components/Mascot/KeysieSvg.tsx src/components/Mascot/catCharacters.ts src/components/Mascot/CatAvatar.tsx
git commit -m "feat: add tuxedo cat variant for Mini Meowww (black body + white chest)"
```

---

## Task 4: Cat Avatar Switch Screen

**Why:** The user wants a dedicated screen where players can browse all 8 cat characters, see backstories, check unlock status, and switch their active companion with animations.

**Files:**
- Create: `src/screens/CatSwitchScreen.tsx`
- Modify: `src/stores/settingsStore.ts` — ensure `selectedCatId` is persisted and updatable
- Modify: `src/navigation/AppNavigator.tsx` — add CatSwitchScreen to navigation stack
- Modify: `src/screens/ProfileScreen.tsx` (or HomeScreen) — add button to navigate to CatSwitchScreen
- Test: `src/screens/__tests__/CatSwitchScreen.test.tsx`

**Step 1: Verify settingsStore has selectedCatId setter**

In `src/stores/settingsStore.ts`, confirm there's a `setSelectedCat(catId: string)` action. If not, add one that updates `selectedCatId` and persists.

**Step 2: Create CatSwitchScreen**

`src/screens/CatSwitchScreen.tsx` — Full-screen gallery with:
- Horizontal FlatList of cat cards with snap-to-center behavior
- Each card shows: CatAvatar (large), name, personality tagline, music skill, backstory
- Locked cats: greyed out with lock icon and "Unlock at Level X"
- Unlocked but not selected: full color, "Select" button
- Currently selected: crimson border glow, "Selected" badge
- Selecting a cat plays a scale animation + haptic
- Navigation: back button in header

Key design decisions:
- Use `react-native-reanimated` for card entrance animations (staggered fade-in)
- Use `Animated.spring` for selection bounce
- Cat card dimensions: ~280px wide, full height minus safe area
- Background: #0D0D0D with subtle gradient
- Snap behavior: `snapToInterval` or `pagingEnabled` on FlatList

```typescript
import { CAT_CHARACTERS, getUnlockedCats } from '../components/Mascot/catCharacters';
import { CatAvatar } from '../components/Mascot/CatAvatar';
import { useSettingsStore } from '../stores/settingsStore';
import { useProgressStore } from '../stores/progressStore';
```

**Step 3: Add to navigation**

In `src/navigation/AppNavigator.tsx`, add:
```typescript
<Stack.Screen name="CatSwitch" component={CatSwitchScreen} options={{ headerShown: false }} />
```

Update `RootStackParamList`:
```typescript
CatSwitch: undefined;
```

**Step 4: Add navigation trigger**

In ProfileScreen or HomeScreen, add a "My Cats" button/touchable that navigates to CatSwitch.

**Step 5: Run tests**

```bash
cd /Users/ut/Documents/purrrfectKeys/purrrfect-keys && npx jest --silent && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/screens/CatSwitchScreen.tsx src/navigation/AppNavigator.tsx src/stores/settingsStore.ts
git commit -m "feat: add cat avatar switch screen with animated gallery and unlock system"
```

---

## Task 5: Note Duration Scoring

**Why:** Currently scoring only checks note-on timing (tap). The PianoRoll shows different note lengths visually, but holding a key longer/shorter doesn't affect score. Adding duration scoring teaches proper note sustain.

**Files:**
- Modify: `src/core/exercises/types.ts` — add `durationMs` to `MidiNoteEvent`, add `durationScore` to `NoteScore`, add `duration` to `ExerciseScoreBreakdown`
- Modify: `src/core/exercises/ExerciseValidator.ts` — track note-off events, compute duration score, integrate into weighted scoring
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx` — record note-off timestamps for scoring
- Modify: `src/hooks/useExercisePlayback.ts` — pass note-off data to scoring
- Test: `src/core/exercises/__tests__/ExerciseValidator.test.ts` — duration scoring tests

**Step 1: Add duration fields to types**

In `src/core/exercises/types.ts`:

```typescript
export interface MidiNoteEvent {
  type: 'noteOn' | 'noteOff';
  note: number;
  velocity: number;
  timestamp: number;
  channel: number;
  durationMs?: number; // Time held (noteOff.timestamp - noteOn.timestamp)
}

export interface NoteScore {
  // ... existing fields
  durationScore?: number; // 0-100, how close to expected duration
}

export interface ExerciseScoreBreakdown {
  accuracy: number;
  timing: number;
  completeness: number;
  extraNotes: number;
  duration: number; // NEW: average duration accuracy
}
```

**Step 2: Add duration scoring to ExerciseValidator**

In `src/core/exercises/ExerciseValidator.ts`:

1. Update `SCORE_WEIGHTS` — redistribute:
```typescript
const SCORE_WEIGHTS = {
  accuracy: 0.35,
  timing: 0.30,
  completeness: 0.10,
  extraNotes: 0.10,
  duration: 0.15, // NEW
};
```

2. In `scoreNotes()`, after matching a played note, calculate duration score:
```typescript
// Duration scoring: compare actual hold time to expected duration
const expectedDurationMs = expected.durationBeats * msPerBeat;
const actualDurationMs = played.durationMs ?? 0;
let durationScore = 0;
if (actualDurationMs > 0 && expectedDurationMs > 0) {
  const ratio = actualDurationMs / expectedDurationMs;
  // Perfect: 0.7x - 1.3x of expected duration
  if (ratio >= 0.7 && ratio <= 1.3) {
    durationScore = 100;
  } else if (ratio >= 0.4 && ratio <= 2.0) {
    // Partial credit: linear falloff
    durationScore = ratio < 0.7
      ? ((ratio - 0.4) / 0.3) * 100
      : ((2.0 - ratio) / 0.7) * 100;
  }
} else {
  // No duration data (tap only) — give neutral score (70) so it doesn't heavily penalize touch keyboard users
  durationScore = 70;
}
```

3. In `calculateBreakdown()`, add duration calculation:
```typescript
const duration = correctNoteScores.length > 0
  ? correctNoteScores.reduce((sum, n) => sum + (n.durationScore ?? 70), 0) / correctNoteScores.length
  : 0;
```

**Step 3: Track note-off in ExercisePlayer**

In `src/screens/ExercisePlayer/ExercisePlayer.tsx`:
- Add a `noteOnTimestamps` ref: `useRef<Map<number, number>>(new Map())`
- In `handleKeyDown`: record `noteOnTimestamps.current.set(midiNote, Date.now())`
- In `handleKeyUp`: compute `durationMs = Date.now() - noteOnTimestamps.current.get(midiNote)`
- Pass `durationMs` through to the playback hook's note recording

**Step 4: Write tests for duration scoring**

In `src/core/exercises/__tests__/ExerciseValidator.test.ts`, add:
- Test: perfect duration (1.0x expected) → score 100
- Test: acceptable range (0.7x - 1.3x) → score 100
- Test: partial credit (0.5x) → score ~33
- Test: no duration data → neutral 70
- Test: held way too long (3x) → score 0

**Step 5: Run all tests**

```bash
cd /Users/ut/Documents/purrrfectKeys/purrrfect-keys && npx jest --silent && npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/core/exercises/types.ts src/core/exercises/ExerciseValidator.ts src/screens/ExercisePlayer/ExercisePlayer.tsx src/core/exercises/__tests__/ExerciseValidator.test.ts
git commit -m "feat: add note duration scoring (15% weight) — teaches proper note sustain"
```

---

## Task 6: Dev-Mode Laptop MIDI Keyboard

**Why:** The user wants to test MIDI functionality from their laptop without a physical MIDI keyboard. Map laptop keyboard keys to MIDI note events in development mode.

**Files:**
- Create: `src/input/DevKeyboardMidi.ts` — maps keyboard keys to MIDI notes
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx` — enable dev keyboard in __DEV__ mode
- Test: `src/input/__tests__/DevKeyboardMidi.test.ts`

**Step 1: Create DevKeyboardMidi module**

`src/input/DevKeyboardMidi.ts`:

Maps a single octave of laptop keys to piano notes (C4-C5):
```
Keyboard: A  S  D  F  G  H  J  K
Piano:    C4 D4 E4 F4 G4 A4 B4 C5
Sharps:   W  E     R  T  Y
Piano:    C#4 D#4  F#4 G#4 A#4
```

Uses `react-native` `Keyboard` events on web or a custom native module listener.

For iOS dev: Register a hidden `TextInput` that captures key events, or use a development-only native module.

Simplest approach for Expo: use a `useEffect` with web keyboard events when `Platform.OS === 'web'` or when running in simulator with hardware keyboard (keyboard events propagate via React Native's `onKeyPress`).

```typescript
export const KEY_TO_MIDI: Record<string, number> = {
  'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64,
  'f': 65, 'r': 66, 'g': 67, 't': 68, 'h': 69,
  'y': 70, 'j': 71, 'k': 72,
};

export function useDevKeyboardMidi(onNote: (note: number, velocity: number, isNoteOn: boolean) => void) {
  // Only active in __DEV__ mode
  // Listens for keyboard events, maps to MIDI, calls onNote
}
```

**Step 2: Wire into ExercisePlayer**

In ExercisePlayer, behind `__DEV__` guard:
```typescript
if (__DEV__) {
  useDevKeyboardMidi((note, velocity, isNoteOn) => {
    if (isNoteOn) handleKeyDown({ type: 'noteOn', note, velocity, timestamp: Date.now(), channel: 0 });
    else handleKeyUp(note);
  });
}
```

**Step 3: Write tests**

Test the key mapping: `KEY_TO_MIDI['a']` should be 60 (middle C), etc.

**Step 4: Run tests**

```bash
cd /Users/ut/Documents/purrrfectKeys/purrrfect-keys && npx jest --silent && npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/input/DevKeyboardMidi.ts src/screens/ExercisePlayer/ExercisePlayer.tsx src/input/__tests__/DevKeyboardMidi.test.ts
git commit -m "feat: add dev-mode laptop keyboard → MIDI mapping for testing without hardware"
```

---

## Task 7: Final Integration + Push

**Files:**
- All files from Tasks 1-6

**Step 1: Run full test suite**

```bash
cd /Users/ut/Documents/purrrfectKeys/purrrfect-keys && npx tsc --noEmit && npx jest --silent
```

**Step 2: Verify on simulator**

```bash
npx expo start --port 8081
```

Manual checks:
- Complete an exercise → ExerciseCard shows animated ScoreRing + fun fact (always)
- MascotBubble shows SVG cat with green eyes (not emoji)
- CatAvatar shows open green eyes (not closed crescents)
- Navigate to Cat Switch screen → scroll through cats, select one
- Mini Meowww shows tuxedo pattern (black body + white chest)
- Hold notes longer → higher duration score
- (Dev mode) Press A/S/D/F on laptop keyboard → plays C4/D4/E4/F4

**Step 3: Push**

```bash
git push
```

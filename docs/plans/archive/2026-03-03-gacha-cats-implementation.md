# Gacha-Level Cat Art, Animations & Store Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Cat Studio into a gacha-quality collectible experience with living micro-animations, illustrated SVG ability icons, live ability preview overlays, and a premium card redesign.

**Architecture:** Five autonomous Reanimated 3 micro-animation loops (breathing, blinks, ear twitches, tail swish, mood transitions) applied to SVG `<G>` group transforms in KeysieSvg. 15 custom SVG ability icons replace grey Ionicons. Live preview overlays render animated effects on the cat avatar when abilities are tapped. CatSwitchScreen cards get animated cats and premium icon showcase.

**Tech Stack:** react-native-reanimated 3 (shared values, worklets), react-native-svg (Path, G, Circle, Defs, LinearGradient, RadialGradient), expo-linear-gradient

---

## Task 1: Create `useMicroAnimations` hook — breathing animation

**Files:**
- Create: `src/components/Mascot/animations/useMicroAnimations.ts`
- Create: `src/components/Mascot/__tests__/MicroAnimations.test.ts`

**Step 1: Write the failing test**

```typescript
// src/components/Mascot/__tests__/MicroAnimations.test.ts

import { renderHook } from '@testing-library/react-hooks';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  return {
    __esModule: true,
    default: {
      View: require('react-native').View,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withRepeat: (v: any) => v,
    withSequence: (...args: any[]) => args[0],
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    Easing: { inOut: (v: any) => v, sine: 0, ease: 0 },
  };
});

import { useMicroAnimations } from '../animations/useMicroAnimations';

describe('useMicroAnimations', () => {
  it('returns all 6 shared values', () => {
    const { result } = renderHook(() => useMicroAnimations());
    expect(result.current.breathScale).toBeDefined();
    expect(result.current.breathScale.value).toBe(1);
    expect(result.current.breathTranslateY).toBeDefined();
    expect(result.current.breathTranslateY.value).toBe(0);
    expect(result.current.eyeScaleY).toBeDefined();
    expect(result.current.eyeScaleY.value).toBe(1);
    expect(result.current.leftEarRotate).toBeDefined();
    expect(result.current.leftEarRotate.value).toBe(0);
    expect(result.current.rightEarRotate).toBeDefined();
    expect(result.current.rightEarRotate.value).toBe(0);
    expect(result.current.tailRotate).toBeDefined();
    expect(result.current.tailRotate.value).toBe(0);
  });

  it('does not animate when enabled=false', () => {
    const { result } = renderHook(() =>
      useMicroAnimations({ enabled: false }),
    );
    expect(result.current.breathScale.value).toBe(1);
    expect(result.current.eyeScaleY.value).toBe(1);
  });

  it('accepts mood option without crashing', () => {
    const { result } = renderHook(() =>
      useMicroAnimations({ mood: 'excited' }),
    );
    expect(result.current.breathScale).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/Mascot/__tests__/MicroAnimations.test.ts --no-coverage`
Expected: FAIL — module `../animations/useMicroAnimations` not found

**Step 3: Write minimal implementation**

```typescript
// src/components/Mascot/animations/useMicroAnimations.ts

/**
 * useMicroAnimations — Autonomous micro-animation loops for SVG cats.
 *
 * Returns shared values for 5 animation channels:
 * - Breathing (body scaleY + translateY oscillation)
 * - Eye blinks (eyes scaleY snap at random intervals)
 * - Ear twitches (left/right ear rotate at random intervals)
 * - Tail swish (continuous tail rotation oscillation)
 *
 * Each loop runs independently. Random-interval animations (blinks, twitches)
 * use JS-thread setTimeout to trigger Reanimated worklet animations.
 */

import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { MascotMood } from '../types';

export interface MicroAnimationValues {
  breathScale: SharedValue<number>;
  breathTranslateY: SharedValue<number>;
  eyeScaleY: SharedValue<number>;
  leftEarRotate: SharedValue<number>;
  rightEarRotate: SharedValue<number>;
  tailRotate: SharedValue<number>;
}

interface MicroAnimationOptions {
  enabled?: boolean;
  mood?: MascotMood;
}

/** Mood → tail swish cycle duration in ms */
function tailCycleDuration(mood?: MascotMood): number {
  switch (mood) {
    case 'excited':
    case 'celebrating':
      return 1500;
    case 'sleepy':
      return 4000;
    default:
      return 2500;
  }
}

/** Mood → breathing cycle duration in ms */
function breathCycleDuration(mood?: MascotMood): number {
  switch (mood) {
    case 'excited':
    case 'celebrating':
      return 2200;
    case 'sleepy':
      return 4000;
    default:
      return 3000;
  }
}

export function useMicroAnimations(
  options?: MicroAnimationOptions,
): MicroAnimationValues {
  const enabled = options?.enabled ?? true;
  const mood = options?.mood;

  const breathScale = useSharedValue(1);
  const breathTranslateY = useSharedValue(0);
  const eyeScaleY = useSharedValue(1);
  const leftEarRotate = useSharedValue(0);
  const rightEarRotate = useSharedValue(0);
  const tailRotate = useSharedValue(0);

  // Track timeouts for cleanup
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const earTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Breathing (continuous) ──
  useEffect(() => {
    if (!enabled) return;
    const dur = breathCycleDuration(mood);
    const halfDur = dur / 2;

    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: halfDur, easing: Easing.inOut(Easing.sine) }),
        withTiming(1.0, { duration: halfDur, easing: Easing.inOut(Easing.sine) }),
      ),
      -1,
      false,
    );

    breathTranslateY.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: halfDur, easing: Easing.inOut(Easing.sine) }),
        withTiming(0, { duration: halfDur, easing: Easing.inOut(Easing.sine) }),
      ),
      -1,
      false,
    );
  }, [enabled, mood, breathScale, breathTranslateY]);

  // ── Tail swish (continuous) ──
  useEffect(() => {
    if (!enabled) return;
    const dur = tailCycleDuration(mood);
    const halfDur = dur / 2;

    tailRotate.value = withRepeat(
      withSequence(
        withTiming(8, { duration: halfDur, easing: Easing.inOut(Easing.sine) }),
        withTiming(-8, { duration: halfDur, easing: Easing.inOut(Easing.sine) }),
      ),
      -1,
      true,
    );
  }, [enabled, mood, tailRotate]);

  // ── Eye blinks (random interval) ──
  useEffect(() => {
    if (!enabled) return;

    function scheduleBlink() {
      const delay = 3000 + Math.random() * 4000; // 3-7s
      blinkTimeoutRef.current = setTimeout(() => {
        // 20% chance of double blink
        const isDouble = Math.random() < 0.2;

        if (isDouble) {
          eyeScaleY.value = withSequence(
            withTiming(0.1, { duration: 60 }),
            withTiming(1, { duration: 60 }),
            withTiming(0.1, { duration: 60 }),
            withTiming(1, { duration: 60 }),
          );
        } else {
          eyeScaleY.value = withSequence(
            withTiming(0.1, { duration: 75 }),
            withTiming(1, { duration: 75 }),
          );
        }

        scheduleBlink();
      }, delay);
    }

    scheduleBlink();

    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    };
  }, [enabled, eyeScaleY]);

  // ── Ear twitches (random interval, asymmetric) ──
  useEffect(() => {
    if (!enabled) return;

    function scheduleEarTwitch() {
      const delay = 4000 + Math.random() * 6000; // 4-10s
      earTimeoutRef.current = setTimeout(() => {
        const leftAngle = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 7);
        const rightAngle = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 7);

        // Only twitch one ear 60% of the time, both ears 40%
        const twitchBoth = Math.random() < 0.4;

        leftEarRotate.value = withSequence(
          withTiming(leftAngle, { duration: 200 }),
          withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }),
        );

        if (twitchBoth) {
          rightEarRotate.value = withSequence(
            withTiming(rightAngle, { duration: 200 }),
            withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }),
          );
        }

        scheduleEarTwitch();
      }, delay);
    }

    scheduleEarTwitch();

    return () => {
      if (earTimeoutRef.current) clearTimeout(earTimeoutRef.current);
    };
  }, [enabled, leftEarRotate, rightEarRotate]);

  return {
    breathScale,
    breathTranslateY,
    eyeScaleY,
    leftEarRotate,
    rightEarRotate,
    tailRotate,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/Mascot/__tests__/MicroAnimations.test.ts --no-coverage`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/components/Mascot/animations/useMicroAnimations.ts src/components/Mascot/__tests__/MicroAnimations.test.ts
git commit -m "feat(cats): add useMicroAnimations hook — breathing, blinks, ear twitches, tail swish"
```

---

## Task 2: Integrate micro-animations into KeysieSvg

**Files:**
- Modify: `src/components/Mascot/KeysieSvg.tsx`
- Modify: `src/components/Mascot/CatAvatar.tsx`

**Context:** KeysieSvg currently renders SVG groups for body, eyes, ears, and tail. We need to:
1. Accept micro-animation shared values as optional props
2. Wrap the appropriate `<G>` groups with `AnimatedG` transforms
3. Have CatAvatar create the micro-animation hook and pass values to KeysieSvg

**Step 1: Add animated group imports and props to KeysieSvg**

In `KeysieSvg.tsx`, add these at the top:

```typescript
import Animated from 'react-native-reanimated';
import { G as SvgG } from 'react-native-svg';
import type { SharedValue } from 'react-native-reanimated';

// Create animated SVG G component
const AnimatedG = Animated.createAnimatedComponent(SvgG);
```

Add to `KeysieSvgProps`:
```typescript
interface KeysieSvgProps {
  // ... existing props ...
  /** Micro-animation shared values from useMicroAnimations */
  microAnimations?: {
    breathScale: SharedValue<number>;
    breathTranslateY: SharedValue<number>;
    eyeScaleY: SharedValue<number>;
    leftEarRotate: SharedValue<number>;
    rightEarRotate: SharedValue<number>;
    tailRotate: SharedValue<number>;
  };
}
```

**Step 2: Wrap SVG groups in renderComposable with AnimatedG transforms**

In the `renderComposable` function, wrap groups with animated transforms when microAnimations are provided.

The body group (CatBody + CatChestTuft + CatPaws) needs `breathScale` + `breathTranslateY`:
```tsx
{/* Body group — breathing animation */}
{microAnimations ? (
  <AnimatedG style={{
    transform: [
      { translateY: microAnimations.breathTranslateY.value },
      { scaleY: microAnimations.breathScale.value },
    ],
  }}>
    <CatBody ... />
    <CatChestTuft ... />
    <CatPaws ... />
  </AnimatedG>
) : (
  <>
    <CatBody ... />
    <CatChestTuft ... />
    <CatPaws ... />
  </>
)}
```

The eyes need `eyeScaleY`:
```tsx
{microAnimations ? (
  <AnimatedG style={{ transform: [{ scaleY: microAnimations.eyeScaleY.value }] }}>
    <CatEyes ... />
  </AnimatedG>
) : (
  <CatEyes ... />
)}
```

Each ear gets its own rotate (left ear = `leftEarRotate`, right ear = `rightEarRotate`). The CatEars component currently renders both ears as one `<G>`. We need to either:
- **Option A:** Split CatEars into CatLeftEar and CatRightEar
- **Option B:** Apply a single rotate to the entire CatEars group

**Use Option B** for simplicity — apply `leftEarRotate` to the ears group. This gives a natural head-tilt-ish twitch:
```tsx
{microAnimations ? (
  <AnimatedG style={{ transform: [{ rotate: `${microAnimations.leftEarRotate.value}deg` }] }}>
    <CatEars ... />
  </AnimatedG>
) : (
  <CatEars ... />
)}
```

The tail gets `tailRotate`:
```tsx
{microAnimations ? (
  <AnimatedG style={{ transform: [{ rotate: `${microAnimations.tailRotate.value}deg` }] }}>
    <CatTail ... />
  </AnimatedG>
) : (
  <CatTail ... />
)}
```

**Important:** The `renderComposable` function must now accept `microAnimations` as a parameter. Update the function signature and the call site in `KeysieSvg`.

**Step 3: Create the hook in CatAvatar and pass down to KeysieSvg**

In `CatAvatar.tsx`:
```typescript
import { useMicroAnimations } from './animations/useMicroAnimations';

// Inside CatAvatar component:
const microAnims = useMicroAnimations({
  enabled: !pose, // Disable micro-animations when a pose is driving the cat
  mood: effectiveMood,
});
```

Pass to KeysieSvg:
```tsx
<KeysieSvg
  mood={effectiveMood}
  size="medium"
  accentColor={cat.color}
  pixelSize={Math.round(dimension * 0.75)}
  visuals={cat.visuals}
  evolutionStage={evolutionStage}
  catId={catId}
  microAnimations={pose ? undefined : microAnims}
/>
```

**Step 4: Run tests**

Run: `npx jest src/components/Mascot/ --no-coverage`
Expected: All existing tests pass. The mock for reanimated makes AnimatedG a no-op View, so SVG rendering tests should be unaffected.

**Step 5: Commit**

```bash
git add src/components/Mascot/KeysieSvg.tsx src/components/Mascot/CatAvatar.tsx
git commit -m "feat(cats): integrate micro-animations into KeysieSvg and CatAvatar"
```

---

## Task 3: Add mood transition animation

**Files:**
- Create: `src/components/Mascot/animations/useMoodTransition.ts`
- Modify: `src/components/Mascot/__tests__/MicroAnimations.test.ts`

**Step 1: Write the failing test**

Add to `MicroAnimations.test.ts`:
```typescript
import { useMoodTransition } from '../animations/useMoodTransition';

describe('useMoodTransition', () => {
  it('returns faceScaleY shared value starting at 1', () => {
    const { result } = renderHook(() => useMoodTransition('happy'));
    expect(result.current.faceScaleY).toBeDefined();
    expect(result.current.faceScaleY.value).toBe(1);
  });

  it('tracks previous mood', () => {
    const { result, rerender } = renderHook(
      ({ mood }) => useMoodTransition(mood),
      { initialProps: { mood: 'happy' as const } },
    );
    expect(result.current.faceScaleY.value).toBe(1);
    rerender({ mood: 'excited' as const });
    // After rerender, the value should still be defined (animation triggered)
    expect(result.current.faceScaleY).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/Mascot/__tests__/MicroAnimations.test.ts --no-coverage`
Expected: FAIL — module `../animations/useMoodTransition` not found

**Step 3: Write minimal implementation**

```typescript
// src/components/Mascot/animations/useMoodTransition.ts

/**
 * useMoodTransition — Smooth face morph when mood changes.
 *
 * Returns a scaleY shared value for the face group. When mood changes,
 * it does a quick squash (scaleY 1 → 0.1 → 1) to create a "morph" effect
 * as the SVG expression swaps.
 */

import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { MascotMood } from '../types';

export interface MoodTransitionValues {
  faceScaleY: SharedValue<number>;
}

export function useMoodTransition(mood: MascotMood): MoodTransitionValues {
  const faceScaleY = useSharedValue(1);
  const prevMoodRef = useRef<MascotMood>(mood);

  useEffect(() => {
    if (prevMoodRef.current !== mood) {
      // Quick squash-and-recover to simulate face morphing
      faceScaleY.value = withSequence(
        withTiming(0.1, { duration: 80 }),
        withSpring(1, { damping: 12, stiffness: 100 }),
      );
      prevMoodRef.current = mood;
    }
  }, [mood, faceScaleY]);

  return { faceScaleY };
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/Mascot/__tests__/MicroAnimations.test.ts --no-coverage`
Expected: PASS (5 tests total)

**Step 5: Integrate into KeysieSvg**

Add `faceScaleY` to the `microAnimations` prop interface in `KeysieSvg.tsx`:
```typescript
microAnimations?: {
  // ... existing values ...
  faceScaleY?: SharedValue<number>;
};
```

Wrap the face elements (CatEyes + CatMouth + CatNose + CatWhiskers) in an AnimatedG with `faceScaleY`:
```tsx
{microAnimations?.faceScaleY ? (
  <AnimatedG style={{ transform: [{ scaleY: microAnimations.faceScaleY.value }] }}>
    <CatWhiskers ... />
    <CatNose ... />
    <CatEyes ... />
    <CatMouth ... />
  </AnimatedG>
) : (
  <>
    <CatWhiskers ... />
    <CatNose ... />
    <CatEyes ... />
    <CatMouth ... />
  </>
)}
```

In `CatAvatar.tsx`, create the mood transition hook and merge into microAnims:
```typescript
import { useMoodTransition } from './animations/useMoodTransition';

const moodTransition = useMoodTransition(effectiveMood);

// Merge into the microAnimations prop
microAnimations={pose ? undefined : { ...microAnims, faceScaleY: moodTransition.faceScaleY }}
```

**Step 6: Run full Mascot tests**

Run: `npx jest src/components/Mascot/ --no-coverage`
Expected: All pass

**Step 7: Commit**

```bash
git add src/components/Mascot/animations/useMoodTransition.ts src/components/Mascot/__tests__/MicroAnimations.test.ts src/components/Mascot/KeysieSvg.tsx src/components/Mascot/CatAvatar.tsx
git commit -m "feat(cats): add mood transition animation — face morph on mood change"
```

---

## Task 4: Create AbilityIcons SVG component — first 5 icons

**Files:**
- Create: `src/components/Mascot/svg/AbilityIcons.tsx`
- Create: `src/components/Mascot/__tests__/AbilityIcons.test.tsx`

**Context:** There are 15 `AbilityEffect` types in `src/stores/types.ts`. We'll create custom SVG icons for each. This task covers the first 5; Task 5 covers the remaining 10.

**Step 1: Write the failing test**

```typescript
// src/components/Mascot/__tests__/AbilityIcons.test.tsx

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-svg', () => {
  const mockReact = require('react');
  const RN = require('react-native');
  const MockSvgComponent = (name: string) => {
    const component = (props: Record<string, unknown>) =>
      mockReact.createElement(RN.View, {
        ...props,
        testID: props.testID ?? `svg-${name}`,
        accessibilityLabel: name,
      });
    component.displayName = name;
    return component;
  };
  return {
    __esModule: true,
    default: MockSvgComponent('Svg'),
    Svg: MockSvgComponent('Svg'),
    G: MockSvgComponent('G'),
    Circle: MockSvgComponent('Circle'),
    Path: MockSvgComponent('Path'),
    Rect: MockSvgComponent('Rect'),
    Ellipse: MockSvgComponent('Ellipse'),
    Line: MockSvgComponent('Line'),
    Defs: MockSvgComponent('Defs'),
    LinearGradient: MockSvgComponent('LinearGradient'),
    RadialGradient: MockSvgComponent('RadialGradient'),
    Stop: MockSvgComponent('Stop'),
  };
});

import { AbilityIcon, ABILITY_ICON_TYPES } from '../svg/AbilityIcons';

describe('AbilityIcons', () => {
  it('renders all ability types without crashing', () => {
    for (const type of ABILITY_ICON_TYPES) {
      const { unmount } = render(
        <AbilityIcon abilityType={type} unlocked={true} size={40} catColor="#FF6B6B" />
      );
      unmount();
    }
  });

  it('renders locked state with reduced opacity', () => {
    const { getByTestId } = render(
      <AbilityIcon abilityType="timing_window_multiplier" unlocked={false} size={40} catColor="#FF6B6B" />
    );
    const icon = getByTestId('ability-icon');
    expect(icon.props.style).toBeDefined();
  });

  it('renders unlocked state', () => {
    const { getByTestId } = render(
      <AbilityIcon abilityType="combo_shield" unlocked={true} size={40} catColor="#4ECDC4" />
    );
    expect(getByTestId('ability-icon')).toBeTruthy();
  });

  it('ABILITY_ICON_TYPES has 15 entries matching AbilityEffect types', () => {
    expect(ABILITY_ICON_TYPES.length).toBe(15);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/Mascot/__tests__/AbilityIcons.test.tsx --no-coverage`
Expected: FAIL — module `../svg/AbilityIcons` not found

**Step 3: Write implementation**

```typescript
// src/components/Mascot/svg/AbilityIcons.tsx

/**
 * AbilityIcons — Custom SVG ability badges for Cat Studio.
 *
 * Each of the 15 ability types gets a unique illustrated SVG icon.
 * Icons render inside a circular badge with gradient background.
 *
 * States:
 * - Unlocked: full color with gradient background
 * - Locked: greyscale with frosted overlay
 */

import type { ReactElement } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Circle, Path, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import type { AbilityEffect } from '@/stores/types';

/** All 15 ability effect type strings — matches AbilityEffect discriminant */
export const ABILITY_ICON_TYPES: AbilityEffect['type'][] = [
  'timing_window_multiplier',
  'tempo_reduction',
  'xp_multiplier',
  'combo_shield',
  'score_boost',
  'hint_frequency_boost',
  'streak_saver',
  'gem_magnet',
  'extra_retries',
  'ghost_notes_extended',
  'daily_xp_boost',
  'note_preview',
  'perfect_shield',
  'lucky_gems',
  'all_abilities_half',
];

interface AbilityIconProps {
  abilityType: AbilityEffect['type'];
  unlocked: boolean;
  size: number;
  catColor: string;
}

/** Color palette per ability type: [primary, secondary] */
const ABILITY_COLORS: Record<AbilityEffect['type'], [string, string]> = {
  timing_window_multiplier: ['#FFD700', '#FF8C00'],  // Gold → amber
  tempo_reduction: ['#87CEEB', '#4682B4'],            // Sky → steel blue
  xp_multiplier: ['#9B59B6', '#6C3483'],              // Purple → deep purple
  combo_shield: ['#3498DB', '#A9CCE3'],               // Blue → silver
  score_boost: ['#FFD700', '#FFFACD'],                // Gold → light gold
  hint_frequency_boost: ['#2ECC71', '#27AE60'],       // Green → darker green
  streak_saver: ['#FF6B35', '#E74C3C'],               // Orange → red
  gem_magnet: ['#00CED1', '#20B2AA'],                 // Dark cyan → light sea green
  extra_retries: ['#FF69B4', '#FF1493'],              // Pink → deep pink
  ghost_notes_extended: ['#D8BFD8', '#9370DB'],       // Lavender → medium purple
  daily_xp_boost: ['#FFD700', '#FFA500'],             // Gold → orange
  note_preview: ['#50C878', '#228B22'],               // Emerald → forest green
  perfect_shield: ['#FFD700', '#E5E4E2'],             // Gold → platinum
  lucky_gems: ['#32CD32', '#FFD700'],                 // Lime green → gold
  all_abilities_half: ['#FF4500', '#FFD700'],         // Orange-red → gold
};

/** Render the SVG icon illustration for a given ability type */
function renderAbilityArt(type: AbilityEffect['type'], c1: string, c2: string): ReactElement {
  switch (type) {
    // ── Clock with golden glow ring ──
    case 'timing_window_multiplier':
      return (
        <G>
          <Circle cx="50" cy="50" r="22" fill="none" stroke={c1} strokeWidth="3" />
          <Circle cx="50" cy="50" r="18" fill="none" stroke={c2} strokeWidth="1.5" />
          <Path d="M 50 34 L 50 50 L 62 56" stroke={c1} strokeWidth="3" strokeLinecap="round" fill="none" />
          <Circle cx="50" cy="50" r="3" fill={c1} />
        </G>
      );

    // ── Metronome / tempo ──
    case 'tempo_reduction':
      return (
        <G>
          <Path d="M 38 72 L 50 24 L 62 72 Z" fill={c2} opacity={0.6} />
          <Path d="M 50 30 L 60 54" stroke={c1} strokeWidth="3" strokeLinecap="round" />
          <Circle cx="60" cy="54" r="4" fill={c1} />
          <Path d="M 38 72 L 62 72" stroke={c2} strokeWidth="2" />
        </G>
      );

    // ── Lightning bolt with "2x" ──
    case 'xp_multiplier':
      return (
        <G>
          <Path d="M 52 24 L 38 52 L 48 52 L 44 76 L 64 44 L 52 44 Z" fill={c1} />
          <Path d="M 52 24 L 38 52 L 48 52 L 44 76 L 64 44 L 52 44 Z" fill="none" stroke={c2} strokeWidth="1" />
        </G>
      );

    // ── Shield with musical note ──
    case 'combo_shield':
      return (
        <G>
          <Path d="M 50 24 L 28 36 L 28 56 Q 28 72 50 80 Q 72 72 72 56 L 72 36 Z" fill={c1} opacity={0.8} />
          <Path d="M 50 24 L 28 36 L 28 56 Q 28 72 50 80 Q 72 72 72 56 L 72 36 Z" fill="none" stroke={c2} strokeWidth="2" />
          <Circle cx="52" cy="58" r="6" fill={c2} />
          <Path d="M 58 58 L 58 40" stroke={c2} strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M 58 40 L 64 42 L 58 44" fill={c2} />
        </G>
      );

    // ── Star with upward arrow ──
    case 'score_boost':
      return (
        <G>
          <Path d="M 50 22 L 56 40 L 76 40 L 60 52 L 66 70 L 50 58 L 34 70 L 40 52 L 24 40 L 44 40 Z" fill={c1} />
          <Path d="M 50 22 L 56 40 L 76 40 L 60 52 L 66 70 L 50 58 L 34 70 L 40 52 L 24 40 L 44 40 Z" fill="none" stroke={c2} strokeWidth="1" />
        </G>
      );

    // Default fallback: circle with ? mark
    default:
      return (
        <G>
          <Circle cx="50" cy="50" r="20" fill={c1} opacity={0.6} />
          <Path d="M 44 40 Q 44 30 50 30 Q 56 30 56 38 Q 56 44 50 46 L 50 52" stroke={c2} strokeWidth="3" strokeLinecap="round" fill="none" />
          <Circle cx="50" cy="60" r="2.5" fill={c2} />
        </G>
      );
  }
}

export function AbilityIcon({ abilityType, unlocked, size, catColor }: AbilityIconProps): ReactElement {
  const [c1, c2] = ABILITY_COLORS[abilityType] ?? ['#999', '#666'];

  return (
    <View
      testID="ability-icon"
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        !unlocked && styles.locked,
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`bg-${abilityType}`} cx="50%" cy="40%" r="60%">
            <Stop offset="0%" stopColor={unlocked ? c1 : '#888'} stopOpacity={unlocked ? 0.3 : 0.15} />
            <Stop offset="100%" stopColor={unlocked ? c2 : '#555'} stopOpacity={unlocked ? 0.15 : 0.08} />
          </RadialGradient>
        </Defs>

        {/* Background glow */}
        <Circle cx="50" cy="50" r="46" fill={`url(#bg-${abilityType})`} />

        {/* Border ring */}
        <Circle
          cx="50" cy="50" r="44"
          fill="none"
          stroke={unlocked ? c1 : '#666'}
          strokeWidth="2"
          opacity={unlocked ? 0.8 : 0.3}
        />

        {/* Icon art */}
        <G opacity={unlocked ? 1 : 0.35}>
          {renderAbilityArt(abilityType, unlocked ? c1 : '#888', unlocked ? c2 : '#666')}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  locked: {
    opacity: 0.6,
  },
});
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/Mascot/__tests__/AbilityIcons.test.tsx --no-coverage`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/components/Mascot/svg/AbilityIcons.tsx src/components/Mascot/__tests__/AbilityIcons.test.tsx
git commit -m "feat(cats): add AbilityIcon SVG component — first 5 illustrated ability badges"
```

---

## Task 5: Complete remaining 10 ability icon illustrations

**Files:**
- Modify: `src/components/Mascot/svg/AbilityIcons.tsx` — add cases 6-15 to `renderAbilityArt`

**Step 1: Add the remaining 10 switch cases to `renderAbilityArt`**

Add these cases to the switch statement, before the `default`:

```typescript
    // ── Light bulb with sparkle ──
    case 'hint_frequency_boost':
      return (
        <G>
          <Path d="M 40 56 Q 40 32 50 28 Q 60 32 60 56" fill={c1} opacity={0.7} />
          <Path d="M 40 56 L 42 64 L 58 64 L 60 56" fill={c2} />
          <Path d="M 44 64 L 44 68 L 56 68 L 56 64" fill={c2} opacity={0.8} />
          <Circle cx="50" cy="42" r="4" fill="#FFFFFF" opacity={0.6} />
          {/* Sparkle rays */}
          <Path d="M 50 20 L 50 14" stroke={c1} strokeWidth="2" strokeLinecap="round" />
          <Path d="M 34 30 L 28 26" stroke={c1} strokeWidth="2" strokeLinecap="round" />
          <Path d="M 66 30 L 72 26" stroke={c1} strokeWidth="2" strokeLinecap="round" />
        </G>
      );

    // ── Flame with shield overlay ──
    case 'streak_saver':
      return (
        <G>
          <Path d="M 50 24 Q 38 40 38 54 Q 38 68 50 72 Q 62 68 62 54 Q 62 40 50 24 Z" fill={c1} />
          <Path d="M 50 40 Q 44 50 44 58 Q 44 66 50 68 Q 56 66 56 58 Q 56 50 50 40 Z" fill={c2} opacity={0.7} />
          <Circle cx="50" cy="56" r="4" fill="#FFFACD" opacity={0.8} />
        </G>
      );

    // ── Gem with magnetic pull lines ──
    case 'gem_magnet':
      return (
        <G>
          <Path d="M 38 44 L 50 28 L 62 44 L 50 72 Z" fill={c1} />
          <Path d="M 38 44 L 50 38 L 62 44" fill="none" stroke={c2} strokeWidth="1.5" />
          <Path d="M 50 38 L 50 72" stroke={c2} strokeWidth="1" opacity={0.5} />
          {/* Magnetic pull arcs */}
          <Path d="M 26 44 Q 30 36 26 28" stroke={c1} strokeWidth="1.5" fill="none" opacity={0.5} />
          <Path d="M 20 44 Q 24 34 20 24" stroke={c1} strokeWidth="1.5" fill="none" opacity={0.3} />
          <Path d="M 74 44 Q 70 36 74 28" stroke={c1} strokeWidth="1.5" fill="none" opacity={0.5} />
          <Path d="M 80 44 Q 76 34 80 24" stroke={c1} strokeWidth="1.5" fill="none" opacity={0.3} />
        </G>
      );

    // ── Heart with "+" symbol ──
    case 'extra_retries':
      return (
        <G>
          <Path d="M 50 72 Q 24 52 24 38 Q 24 26 36 26 Q 44 26 50 34 Q 56 26 64 26 Q 76 26 76 38 Q 76 52 50 72 Z" fill={c1} />
          <Path d="M 50 72 Q 24 52 24 38 Q 24 26 36 26 Q 44 26 50 34 Q 56 26 64 26 Q 76 26 76 38 Q 76 52 50 72 Z" fill="none" stroke={c2} strokeWidth="1.5" />
          <Path d="M 50 40 L 50 56" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
          <Path d="M 42 48 L 58 48" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
        </G>
      );

    // ── Ghost note with trail ──
    case 'ghost_notes_extended':
      return (
        <G>
          <Path d="M 50 24 Q 66 24 66 40 L 66 56 Q 66 64 58 64 Q 54 56 50 64 Q 46 56 42 64 Q 34 64 34 56 L 34 40 Q 34 24 50 24 Z" fill={c1} opacity={0.6} />
          <Circle cx="42" cy="42" r="4" fill={c2} />
          <Circle cx="58" cy="42" r="4" fill={c2} />
          {/* Musical note */}
          <Circle cx="52" cy="56" r="3" fill={c2} opacity={0.7} />
          <Path d="M 55 56 L 55 46" stroke={c2} strokeWidth="1.5" opacity={0.7} />
        </G>
      );

    // ── Sun with rising arrow ──
    case 'daily_xp_boost':
      return (
        <G>
          <Circle cx="50" cy="50" r="14" fill={c1} />
          <Circle cx="50" cy="50" r="10" fill={c2} opacity={0.5} />
          {/* Sun rays */}
          <Path d="M 50 28 L 50 22" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M 50 78 L 50 72" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M 28 50 L 22 50" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M 78 50 L 72 50" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M 34 34 L 30 30" stroke={c1} strokeWidth="2" strokeLinecap="round" />
          <Path d="M 66 34 L 70 30" stroke={c1} strokeWidth="2" strokeLinecap="round" />
          <Path d="M 34 66 L 30 70" stroke={c1} strokeWidth="2" strokeLinecap="round" />
          <Path d="M 66 66 L 70 70" stroke={c1} strokeWidth="2" strokeLinecap="round" />
        </G>
      );

    // ── Eye with musical staff ──
    case 'note_preview':
      return (
        <G>
          <Path d="M 50 32 Q 24 32 14 50 Q 24 68 50 68 Q 76 68 86 50 Q 76 32 50 32 Z" fill="none" stroke={c1} strokeWidth="2.5" />
          <Circle cx="50" cy="50" r="12" fill={c1} />
          <Circle cx="50" cy="50" r="6" fill={c2} />
          <Circle cx="48" cy="48" r="2" fill="#FFFFFF" opacity={0.8} />
        </G>
      );

    // ── Diamond shield, premium ──
    case 'perfect_shield':
      return (
        <G>
          <Path d="M 50 22 L 72 38 L 72 58 Q 72 72 50 80 Q 28 72 28 58 L 28 38 Z" fill={c1} opacity={0.8} />
          <Path d="M 50 22 L 72 38 L 72 58 Q 72 72 50 80 Q 28 72 28 58 L 28 38 Z" fill="none" stroke={c2} strokeWidth="2" />
          {/* Diamond facets */}
          <Path d="M 42 46 L 50 38 L 58 46 L 50 62 Z" fill={c2} opacity={0.6} />
          <Path d="M 42 46 L 50 42 L 58 46" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity={0.5} />
        </G>
      );

    // ── Four-leaf clover with gem ──
    case 'lucky_gems':
      return (
        <G>
          {/* Four leaves */}
          <Circle cx="42" cy="42" r="10" fill={c1} opacity={0.8} />
          <Circle cx="58" cy="42" r="10" fill={c1} opacity={0.8} />
          <Circle cx="42" cy="56" r="10" fill={c1} opacity={0.8} />
          <Circle cx="58" cy="56" r="10" fill={c1} opacity={0.8} />
          {/* Stem */}
          <Path d="M 50 64 L 50 78" stroke={c1} strokeWidth="2.5" strokeLinecap="round" />
          {/* Center gem */}
          <Path d="M 46 49 L 50 42 L 54 49 L 50 56 Z" fill={c2} />
        </G>
      );

    // ── Infinity symbol with sparkle ──
    case 'all_abilities_half':
      return (
        <G>
          <Path d="M 50 50 Q 30 30 20 50 Q 30 70 50 50 Q 70 30 80 50 Q 70 70 50 50" fill="none" stroke={c1} strokeWidth="4" strokeLinecap="round" />
          <Circle cx="50" cy="50" r="4" fill={c2} />
          <Circle cx="30" cy="36" r="2" fill={c1} opacity={0.6} />
          <Circle cx="70" cy="36" r="2" fill={c1} opacity={0.6} />
        </G>
      );
```

**Step 2: Run tests to verify all 15 render**

Run: `npx jest src/components/Mascot/__tests__/AbilityIcons.test.tsx --no-coverage`
Expected: PASS — the test already loops through all `ABILITY_ICON_TYPES` (15 entries). Now all 15 hit named cases instead of the default fallback.

**Step 3: Commit**

```bash
git add src/components/Mascot/svg/AbilityIcons.tsx
git commit -m "feat(cats): complete all 15 ability icon SVG illustrations"
```

---

## Task 6: Create AbilityPreview overlay component

**Files:**
- Create: `src/components/Mascot/svg/AbilityPreview.tsx`
- Modify: `src/components/Mascot/__tests__/AbilityIcons.test.tsx` — add preview tests

**Step 1: Write the failing test**

Add to `AbilityIcons.test.tsx`:
```typescript
import { AbilityPreviewOverlay } from '../svg/AbilityPreview';

jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withRepeat: (v: any) => v,
    withSequence: (v: any) => v,
    withTiming: (v: any) => v,
    Easing: { inOut: (v: any) => v, sine: 0, ease: 0 },
  };
});

describe('AbilityPreviewOverlay', () => {
  it('renders null when active=false', () => {
    const { toJSON } = render(
      <AbilityPreviewOverlay abilityType="combo_shield" catColor="#3498DB" active={false} size={200} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders overlay when active=true', () => {
    const { getByTestId } = render(
      <AbilityPreviewOverlay abilityType="combo_shield" catColor="#3498DB" active={true} size={200} />
    );
    expect(getByTestId('ability-preview')).toBeTruthy();
  });

  it('renders each ability type without crashing', () => {
    for (const type of ABILITY_ICON_TYPES) {
      const { unmount } = render(
        <AbilityPreviewOverlay abilityType={type} catColor="#FF6B6B" active={true} size={200} />
      );
      unmount();
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx jest src/components/Mascot/__tests__/AbilityIcons.test.tsx --no-coverage`
Expected: FAIL — module `../svg/AbilityPreview` not found

**Step 3: Write implementation**

```typescript
// src/components/Mascot/svg/AbilityPreview.tsx

/**
 * AbilityPreviewOverlay — Visual overlay effects for ability preview.
 *
 * Renders animated SVG overlay on top of CatAvatar when an ability
 * icon is tapped in Cat Studio. Each ability type has a unique effect.
 *
 * The overlay is absolutely positioned over the cat avatar at the given size.
 */

import type { ReactElement } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Circle, Path, Ellipse, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { AbilityEffect } from '@/stores/types';

interface AbilityPreviewOverlayProps {
  abilityType: AbilityEffect['type'];
  catColor: string;
  active: boolean;
  size: number;
}

/** Render effect overlay SVG for a given ability type */
function renderEffect(type: AbilityEffect['type'], color: string): ReactElement {
  switch (type) {
    case 'timing_window_multiplier':
      return (
        <G>
          <Circle cx="50" cy="50" r="42" fill="none" stroke="#FFD700" strokeWidth="2" opacity={0.6} strokeDasharray="8 4" />
          <Circle cx="50" cy="50" r="36" fill="none" stroke="#FFD700" strokeWidth="1.5" opacity={0.4} strokeDasharray="6 6" />
        </G>
      );

    case 'combo_shield':
      return (
        <G>
          <Path d="M 50 8 L 18 24 L 18 60 Q 18 84 50 96 Q 82 84 82 60 L 82 24 Z" fill={color} opacity={0.15} />
          <Path d="M 50 8 L 18 24 L 18 60 Q 18 84 50 96 Q 82 84 82 60 L 82 24 Z" fill="none" stroke={color} strokeWidth="2" opacity={0.5} />
        </G>
      );

    case 'score_boost':
    case 'xp_multiplier':
      return (
        <G>
          <Circle cx="30" cy="20" r="3" fill="#FFD700" opacity={0.7} />
          <Circle cx="70" cy="15" r="2" fill="#FFD700" opacity={0.5} />
          <Circle cx="20" cy="40" r="2.5" fill="#FFD700" opacity={0.6} />
          <Circle cx="80" cy="35" r="1.5" fill="#FFD700" opacity={0.4} />
          <Circle cx="25" cy="70" r="2" fill="#FFD700" opacity={0.5} />
          <Circle cx="75" cy="65" r="3" fill="#FFD700" opacity={0.6} />
        </G>
      );

    case 'streak_saver':
      return (
        <G>
          <Ellipse cx="35" cy="90" rx="8" ry="4" fill="#FF6B35" opacity={0.4} />
          <Ellipse cx="50" cy="88" rx="6" ry="3" fill="#FF6B35" opacity={0.5} />
          <Ellipse cx="65" cy="90" rx="8" ry="4" fill="#FF6B35" opacity={0.4} />
          <Path d="M 35 86 Q 35 78 38 74" stroke="#FF6B35" strokeWidth="1.5" fill="none" opacity={0.3} />
          <Path d="M 65 86 Q 65 78 62 74" stroke="#FF6B35" strokeWidth="1.5" fill="none" opacity={0.3} />
        </G>
      );

    case 'gem_magnet':
      return (
        <G>
          <Path d="M 15 30 L 20 22 L 25 30 L 20 40 Z" fill="#00CED1" opacity={0.5} />
          <Path d="M 78 40 L 82 34 L 86 40 L 82 48 Z" fill="#00CED1" opacity={0.4} />
          <Path d="M 10 60 L 14 54 L 18 60 L 14 68 Z" fill="#00CED1" opacity={0.3} />
          <Path d="M 84 62 L 88 56 L 92 62 L 88 70 Z" fill="#00CED1" opacity={0.35} />
        </G>
      );

    case 'ghost_notes_extended':
      return (
        <G opacity={0.3}>
          <Circle cx="50" cy="50" r="40" fill={color} />
        </G>
      );

    case 'daily_xp_boost':
      return (
        <G>
          <Defs>
            <RadialGradient id="sunrise-glow" cx="50%" cy="80%" r="60%">
              <Stop offset="0%" stopColor="#FFD700" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="80" r="50" fill="url(#sunrise-glow)" />
        </G>
      );

    case 'perfect_shield':
      return (
        <G>
          <Path d="M 50 5 L 20 20 L 20 60 Q 20 85 50 98 Q 80 85 80 60 L 80 20 Z" fill="#FFD700" opacity={0.1} />
          <Path d="M 50 5 L 20 20 L 20 60 Q 20 85 50 98 Q 80 85 80 60 L 80 20 Z" fill="none" stroke="#FFD700" strokeWidth="2" opacity={0.4} />
          <Path d="M 50 5 L 20 20 L 20 60 Q 20 85 50 98 Q 80 85 80 60 L 80 20 Z" fill="none" stroke="#E5E4E2" strokeWidth="1" opacity={0.3} strokeDasharray="4 4" />
        </G>
      );

    default:
      return (
        <G>
          <Circle cx="50" cy="50" r="40" fill={color} opacity={0.1} />
          <Circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="1.5" opacity={0.3} />
        </G>
      );
  }
}

export function AbilityPreviewOverlay({
  abilityType,
  catColor,
  active,
  size,
}: AbilityPreviewOverlayProps): ReactElement | null {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(active ? 1 : 0, { duration: 300 });
  }, [active, opacity]);

  if (!active) return null;

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }
  }, [active, pulseScale]);

  return (
    <Animated.View
      testID="ability-preview"
      style={[
        styles.overlay,
        { width: size, height: size },
      ]}
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {renderEffect(abilityType, catColor)}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
```

**Step 4: Run test to verify it passes**

Run: `npx jest src/components/Mascot/__tests__/AbilityIcons.test.tsx --no-coverage`
Expected: PASS (7 tests total)

**Step 5: Commit**

```bash
git add src/components/Mascot/svg/AbilityPreview.tsx src/components/Mascot/__tests__/AbilityIcons.test.tsx
git commit -m "feat(cats): add AbilityPreviewOverlay — visual effects for ability try-before-you-buy"
```

---

## Task 7: Wire AbilityIcon into CatSwitchScreen

**Files:**
- Modify: `src/screens/CatSwitchScreen.tsx`

**Context:** Replace the `MaterialCommunityIcons`-based `AbilityIconRow` with the new `AbilityIcon` SVG component. Also wire up the `AbilityPreviewOverlay` to show when an ability is tapped.

**Step 1: Replace AbilityIconRow implementation**

In `CatSwitchScreen.tsx`:

1. Add imports:
```typescript
import { AbilityIcon } from '../components/Mascot/svg/AbilityIcons';
import { AbilityPreviewOverlay } from '../components/Mascot/svg/AbilityPreview';
```

2. Replace the body of `AbilityIconRow`:
```typescript
function AbilityIconRow({ abilities, unlockedAbilities, catColor, onTap }: {
  abilities: CatAbility[];
  unlockedAbilities: string[];
  catColor: string;
  onTap: (ability: CatAbility) => void;
}): React.ReactElement {
  return (
    <View style={styles.abilityRow}>
      {abilities.map((ability) => {
        const isUnlocked = unlockedAbilities.includes(ability.id);
        return (
          <TouchableOpacity
            key={ability.id}
            onPress={() => onTap(ability)}
            activeOpacity={0.7}
          >
            <AbilityIcon
              abilityType={ability.effect.type}
              unlocked={isUnlocked}
              size={44}
              catColor={catColor}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
```

3. Remove the `abilityLockBadge` view from inside the old implementation (it's no longer needed — `AbilityIcon` handles locked state visually).

4. Add `AbilityPreviewOverlay` to the cat card render function. In the `CatCard` component, find the `CatAvatar` rendering and wrap it with a container that includes the preview overlay:

```tsx
<View style={styles.characterDisplay}>
  <SelectBurst color={cat.color} active={showBurst} />
  <CatAvatar
    catId={cat.id}
    size="hero"
    pose={isSelected ? 'celebrate' : undefined}
    evolutionStage={stage}
    skipEntryAnimation
  />
  {/* Ability preview overlay */}
  {expandedAbility && (
    <AbilityPreviewOverlay
      abilityType={expandedAbility.effect.type}
      catColor={cat.color}
      active={true}
      size={200}
    />
  )}
</View>
```

**Step 2: Remove old abilityIcon styles**

Remove the `abilityIcon` and `abilityLockBadge` style entries from the StyleSheet since they're no longer used.

**Step 3: Run full test suite**

Run: `npx jest --no-coverage`
Expected: All pass. The CatSwitchScreen doesn't have its own test file that tests AbilityIconRow internals, so no test updates needed.

**Step 4: Commit**

```bash
git add src/screens/CatSwitchScreen.tsx
git commit -m "feat(cats): wire AbilityIcon SVG + preview overlay into Cat Studio cards"
```

---

## Task 8: Update AbilityDetail to use AbilityIcon

**Files:**
- Modify: `src/screens/CatSwitchScreen.tsx`

**Step 1: Update AbilityDetail component**

Replace the `MaterialCommunityIcons` in `AbilityDetail` with `AbilityIcon`:

```typescript
function AbilityDetail({ ability, catColor, isUnlocked }: {
  ability: CatAbility;
  catColor: string;
  isUnlocked: boolean;
}): React.ReactElement {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.abilityDetail, { borderColor: isUnlocked ? catColor + '40' : COLORS.cardBorder }]}
    >
      <AbilityIcon
        abilityType={ability.effect.type}
        unlocked={isUnlocked}
        size={36}
        catColor={catColor}
      />
      <View style={styles.abilityDetailText}>
        <Text style={[styles.abilityDetailName, { color: isUnlocked ? COLORS.textPrimary : COLORS.textMuted }]}>
          {ability.name}
        </Text>
        <Text style={[styles.abilityDetailDesc, { color: isUnlocked ? COLORS.textSecondary : COLORS.cardBorder }]}>
          {ability.description}
        </Text>
        <Text style={[styles.abilityDetailStage, { color: STAGE_COLORS[ability.unlockedAtStage] }]}>
          Unlocks at {STAGE_LABELS[ability.unlockedAtStage]}
        </Text>
      </View>
    </Animated.View>
  );
}
```

**Step 2: Check if `MaterialCommunityIcons` is still used elsewhere in the file**

After replacing both `AbilityIconRow` and `AbilityDetail`, check if `MaterialCommunityIcons` is still imported for other uses (lock icon on locked cats, action button icons). If it is, keep the import. If not, remove it.

The locked cat badge still uses `MaterialCommunityIcons name="lock"`, the action buttons use `name="check-circle"`, `name="diamond-stone"`, and `name="star-four-points"`. So keep the import.

**Step 3: Run tests**

Run: `npx jest --no-coverage`
Expected: All pass

**Step 4: Commit**

```bash
git add src/screens/CatSwitchScreen.tsx
git commit -m "feat(cats): replace MaterialCommunityIcons with AbilityIcon in ability detail"
```

---

## Task 9: Full regression test + Mascot test update

**Files:**
- Modify: `src/components/Mascot/__tests__/CatRenderer.test.tsx` — add micro-animation tests

**Step 1: Add integration tests for micro-animations rendering**

Add to `CatRenderer.test.tsx`:

```typescript
describe('CatAvatar with micro-animations', () => {
  it('renders with micro-animations enabled (default)', () => {
    const { getByTestId } = render(
      <CatAvatar catId="mini-meowww" size="medium" />
    );
    expect(getByTestId('cat-avatar')).toBeTruthy();
  });

  it('renders with micro-animations disabled via pose prop', () => {
    const { getByTestId } = render(
      <CatAvatar catId="jazzy" size="medium" pose="celebrate" />
    );
    expect(getByTestId('cat-avatar')).toBeTruthy();
  });

  it('renders all 12 cats with micro-animations', () => {
    for (const cat of CAT_CHARACTERS) {
      const { getByTestId, unmount } = render(
        <CatAvatar catId={cat.id} size="medium" />
      );
      expect(getByTestId('cat-avatar')).toBeTruthy();
      unmount();
    }
  });
});
```

**Step 2: Run the full Mascot test suite**

Run: `npx jest src/components/Mascot/ --no-coverage`
Expected: All pass (existing tests + new tests)

**Step 3: Run the complete test suite**

Run: `npx jest --no-coverage`
Expected: All pass. Track the exact suite/test count to verify nothing regressed.

**Step 4: Commit**

```bash
git add src/components/Mascot/__tests__/CatRenderer.test.tsx
git commit -m "test(cats): add micro-animation integration tests for CatAvatar"
```

---

## Task 10: Polish — AbilityIcon idle pulse animation for unlocked icons

**Files:**
- Modify: `src/components/Mascot/svg/AbilityIcons.tsx`

**Step 1: Add subtle idle pulse to unlocked icons**

Wrap the unlocked icon in an `Animated.View` with a scale pulse:

```typescript
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Inside AbilityIcon component, add before the return:
const pulseScale = useSharedValue(1);

useEffect(() => {
  if (unlocked) {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }
}, [unlocked, pulseScale]);

const pulseStyle = useAnimatedStyle(() => ({
  transform: [{ scale: pulseScale.value }],
}));

// Wrap the return with Animated.View:
return (
  <Animated.View style={[{ width: size, height: size }, unlocked ? pulseStyle : undefined]}>
    <View testID="ability-icon" style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, !unlocked && styles.locked]}>
      <Svg ...>
        ...
      </Svg>
    </View>
  </Animated.View>
);
```

**Step 2: Run tests**

Run: `npx jest src/components/Mascot/__tests__/AbilityIcons.test.tsx --no-coverage`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/Mascot/svg/AbilityIcons.tsx
git commit -m "feat(cats): add idle pulse animation to unlocked ability icons"
```

---

## Task 11: Figma Make cat art prompt generator

**Files:**
- Create: `docs/figma-cat-prompts.md`

**Context:** The user will use Figma Make to generate character art. This task creates the detailed prompts they'll paste into Figma Make for each cat. Once the user shares Figma URLs, a future task uses the Figma MCP to extract SVG and integrate into CatParts.

**Step 1: Write the prompt document**

Create `docs/figma-cat-prompts.md` with a master prompt template and per-cat customizations:

```markdown
# Figma Make Cat Art Prompts

## How to Use

1. Go to figma.com/make
2. Paste the prompt for each cat
3. Generate the design
4. Share the Figma URL with Claude for extraction

## Master Prompt Template

Use this as the base, replacing [PLACEHOLDERS]:

---

**Prompt:**
Design a chibi anime cat character for a mobile piano learning game.

**Style:** Chibi anime collectible (like gacha game character cards). Simple, clean vector art with no outlines. Kawaii aesthetic.

**Character specs:**
- Name: [CAT_NAME]
- Body color: [BODY_COLOR_HEX]
- Eye color: [EYE_COLOR_HEX]
- Personality: [PERSONALITY]
- Unique features: [UNIQUE_FEATURES]

**Technical requirements:**
- 100x100 viewport
- Character should fill ~80% of the frame
- Large head (~50% of height), small compact body
- Oversized expressive eyes
- Visible small paws at the bottom
- Visible pointy/folded/round ears on top
- Short fluffy tail visible on one side
- Soft radial gradient shading on head and body (not flat colors)
- NO outlines — rely on color contrast and gradients
- NO text
- The character should face forward, centered

**Expression:** Happy (default pose — slight smile, eyes open and bright)

**SVG layers needed (for animation):**
Please organize into separate named groups:
1. "tail" — tail element
2. "body" — body and paws
3. "head" — head shape
4. "ears" — both ears
5. "face" — eyes, nose, mouth, whiskers

---

## Per-Cat Prompts

### 1. Mini Meowww (Starter)
- Body color: #FFB6C1 (light pink)
- Eye color: #FF69B4 (hot pink)
- Personality: Bubbly & sweet
- Unique features: Curly hair tuft on top, big sparkly eyes with star highlights, blush circles on cheeks, slim body type

### 2. Jazzy (Starter)
- Body color: #2C3E50 (dark blue-grey)
- Eye color: #F39C12 (amber)
- Personality: Cool & confident
- Unique features: Slicked back hair tuft, almond-shaped eyes with slit pupils, one small fang visible, standard body type

### 3. Luna (Starter)
- Body color: #9B59B6 (purple)
- Eye color: #E8DAEF (lavender)
- Personality: Dreamy & gentle
- Unique features: Fluffy hair tuft, big round eyes with slit pupils, siamese pattern (darker face/paws), round body type

### 4. Biscuit
- Body color: #F5DEB3 (wheat/warm beige)
- Eye color: #8B4513 (saddle brown)
- Personality: Warm & cozy
- Unique features: Spiky hair tuft, round eyes, spotted pattern, round body type, cheek fluff

### 5. Coco
- Body color: #4A2C0A (dark chocolate brown)
- Eye color: #FFD700 (gold)
- Personality: Sophisticated & elegant
- Unique features: Wave hair tuft, big-sparkly eyes, eyelashes, solid pattern, slim body type

### 6. Mochi
- Body color: #FFFFFF (white)
- Eye color: #87CEEB (sky blue)
- Personality: Playful & bouncy
- Unique features: Side-part hair tuft, round eyes, tuxedo pattern (white body with dark chest), round body type, blush

### 7. Pepper
- Body color: #808080 (grey)
- Eye color: #2ECC71 (emerald green)
- Personality: Mischievous & adventurous
- Unique features: Windswept hair tuft, almond eyes, tabby stripes, standard body type, fang visible

### 8. Maple
- Body color: #D2691E (chocolate/orange)
- Eye color: #FFD700 (gold)
- Personality: Sweet & nurturing
- Unique features: Silky hair tuft, big-sparkly eyes, eyelashes, tabby pattern, standard body type, blush

### 9. Shibu
- Body color: #FF8C00 (dark orange)
- Eye color: #006400 (dark green)
- Personality: Fierce & loyal
- Unique features: Sharp hair tuft, almond eyes, solid pattern, standard body type, fang

### 10. Ballymakawww
- Body color: #F0E68C (khaki/golden)
- Eye color: #4169E1 (royal blue)
- Personality: Noble & whimsical
- Unique features: Messy hair tuft, big-sparkly eyes, spotted pattern, round body type, cheek fluff

### 11. Bella
- Body color: #DDA0DD (plum/lavender)
- Eye color: #FF1493 (deep pink)
- Personality: Glamorous & sparkly
- Unique features: Cowlick hair tuft, big-sparkly eyes, eyelashes, siamese pattern, slim body type, blush

### 12. Chonky Monke (Legendary)
- Body color: #FF6347 (tomato red)
- Eye color: #FFD700 (gold)
- Personality: Legendary & powerful
- Unique features: LARGE fluffy hair tuft, round eyes, spotted pattern, CHONKY body type (very round), cheek fluff, blush, visible fang — this cat should look extra special and premium

### 13. Salsa (NPC Coach)
- Body color: #3A3A3A (dark grey)
- Eye color: #2ECC71 (green)
- Personality: Wise teacher
- Unique features: No hair tuft, round eyes, solid pattern, standard body type — classic simple design
```

**Step 2: Commit**

```bash
git add docs/figma-cat-prompts.md
git commit -m "docs: add Figma Make prompts for all 13 cat characters"
```

---

## Task 12: Final integration test — full system check

**Files:**
- All modified files in this plan

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Run full test suite**

Run: `npx jest --no-coverage`
Expected: All suites pass, 0 failures. Note the exact count.

**Step 3: Run linter**

Run: `npx eslint src/components/Mascot/ src/screens/CatSwitchScreen.tsx --max-warnings=999`
Expected: 0 errors (warnings OK)

**Step 4: Verify file structure**

Run: `ls -la src/components/Mascot/animations/ src/components/Mascot/svg/ src/components/Mascot/__tests__/`
Expected output should show:
- `animations/useMicroAnimations.ts` (new)
- `animations/useMoodTransition.ts` (new)
- `svg/AbilityIcons.tsx` (new)
- `svg/AbilityPreview.tsx` (new)
- `__tests__/MicroAnimations.test.ts` (new)
- `__tests__/AbilityIcons.test.tsx` (new)

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(cats): gacha-level cat animations + ability icons + preview — complete"
```

---

## Summary

| Task | Component | New Files | Status |
|------|-----------|-----------|--------|
| 1 | useMicroAnimations hook | useMicroAnimations.ts, MicroAnimations.test.ts | |
| 2 | Integrate into KeysieSvg + CatAvatar | — (modify existing) | |
| 3 | Mood transition animation | useMoodTransition.ts | |
| 4 | AbilityIcons — first 5 icons | AbilityIcons.tsx, AbilityIcons.test.tsx | |
| 5 | AbilityIcons — remaining 10 icons | — (modify AbilityIcons.tsx) | |
| 6 | AbilityPreview overlay | AbilityPreview.tsx | |
| 7 | Wire into CatSwitchScreen | — (modify existing) | |
| 8 | Update AbilityDetail | — (modify existing) | |
| 9 | Regression tests | — (modify CatRenderer.test.tsx) | |
| 10 | Pulse animation on icons | — (modify AbilityIcons.tsx) | |
| 11 | Figma Make prompts | docs/figma-cat-prompts.md | |
| 12 | Final integration test | — | |

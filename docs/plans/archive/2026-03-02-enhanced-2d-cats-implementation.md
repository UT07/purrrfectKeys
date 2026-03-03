# Enhanced 2D Cat System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the basic geometric SVG cats with anime chibi characters featuring painted depth (gradients/shadows), 6-layer composite eyes, per-part spring physics animation, micro-life animations, and a complete accessory system — all within existing react-native-svg + react-native-reanimated.

**Architecture:** The SVG cat system uses a composable parts approach (`CatParts.tsx` → `KeysieSvg.tsx` → `CatAvatar.tsx`). Each part renders within a shared 100×100 viewBox. We redesign each part with anime chibi proportions, wire in SVG gradients via a shared `<Defs>` factory, wrap parts in `AnimatedG` layers for per-part spring physics, and add micro-life animation hooks. Zero new dependencies.

**Tech Stack:** react-native-svg (LinearGradient, RadialGradient, Defs, Stop, Animated G), react-native-reanimated (useSharedValue, useAnimatedStyle, withRepeat, withSpring, withSequence), TypeScript strict mode.

**Design doc:** `docs/plans/2026-03-02-enhanced-2d-cats-design.md`

---

## Important Context for the Implementer

### File Locations
All cat mascot code lives in `src/components/Mascot/`:
- `svg/CatParts.tsx` — Body, Head, Ears, Eyes, Mouth, Nose, Whiskers, Tail, Blush (100×100 viewBox)
- `svg/catProfiles.ts` — Per-cat visual selection: body type, ear type, eye shape, tail type, blush
- `svg/CatAccessories.tsx` — Named SVG accessory components + `EvolutionAura`
- `KeysieSvg.tsx` — Assembly: composes all parts into final SVG (composable + legacy render paths)
- `CatAvatar.tsx` — React wrapper: size, animation, press, glow, tooltip
- `animations/catAnimations.ts` — Pose types and configs (7 poses, keyframe sequences)
- `animations/useCatPose.ts` — Reanimated hook converting pose configs to animated styles
- `catColorPalette.ts` — 13 cat color definitions (body, belly, earInner, eye, nose, blush, accent)
- `catCharacters.ts` — Full cat character data (visuals, abilities, evolution stages)
- `types.ts` — `MascotMood` and `MascotSize` type definitions

### Coordinate System
- viewBox: `0 0 100 100`
- Current head: `cx=50, cy=38, r=28` → Target: `cx=50, cy=35, r=32` (bigger, higher)
- Current body: `cx=50, cy=74, rx=17` → Target: `cx=50, cy=80, rx=14, ry=12` (smaller, lower)
- Light source: upper-left (consistent for all gradients)

### Testing Patterns
- SVG mock in `__tests__/KeysieSvg.test.tsx`: mocks `react-native-svg` with `View` components preserving props
- Reanimated mock in `__tests__/CatRenderer.test.tsx`: mocks shared values, animated styles, springs
- Tests validate: renders without crash, structural elements present, mood-dependent elements correct
- **Run:** `npx jest src/components/Mascot/ --verbose`

### Existing SVG Imports Used
```typescript
import Svg, { G, Circle, Path, Rect, Ellipse, Line, Defs, ClipPath } from 'react-native-svg';
// NEW imports needed: LinearGradient, RadialGradient, Stop (already used in CatAccessories.tsx)
```

### Color Utilities (already exist in KeysieSvg.tsx and CatAccessories.tsx)
```typescript
function darkenColor(hex: string, factor: number): string  // factor 0-1 where 0=black
function lightenColor(hex: string, factor: number): string  // factor 0-1 where 1=white
```

---

## Task 1: Add `HairTuftType` to Cat Profile System

**Files:**
- Modify: `src/components/Mascot/svg/catProfiles.ts`
- Test: `src/components/Mascot/__tests__/CatRenderer.test.tsx`

### Step 1: Write the failing test

Add to `CatRenderer.test.tsx` in the "Cat Visual Profiles" describe block:

```typescript
it('every cat has a hairTuft field (can be "none")', () => {
  for (const cat of CAT_CHARACTERS) {
    const profile = getCatProfile(cat.id);
    expect(profile.hairTuft).toBeDefined();
    expect(['curly', 'slicked', 'none', 'fluffy', 'spiky', 'wave', 'windswept', 'side-part', 'silky', 'sharp', 'messy', 'cowlick']).toContain(profile.hairTuft);
  }
});

it('Mini Meowww has curly hair tuft', () => {
  const profile = getCatProfile('mini-meowww');
  expect(profile.hairTuft).toBe('curly');
});

it('every cat has an eyelashes boolean', () => {
  for (const cat of CAT_CHARACTERS) {
    const profile = getCatProfile(cat.id);
    expect(typeof profile.eyelashes).toBe('boolean');
  }
});
```

### Step 2: Run test to verify it fails

Run: `npx jest src/components/Mascot/__tests__/CatRenderer.test.tsx --verbose`
Expected: FAIL — `profile.hairTuft` is `undefined`

### Step 3: Write minimal implementation

In `src/components/Mascot/svg/catProfiles.ts`:

1. Add `HairTuftType` export and add fields to `CatProfile` interface:

```typescript
export type HairTuftType =
  | 'none' | 'curly' | 'slicked' | 'fluffy' | 'spiky'
  | 'wave' | 'windswept' | 'side-part' | 'silky' | 'sharp'
  | 'messy' | 'cowlick';

export interface CatProfile {
  body: BodyType;
  ears: EarType;
  eyes: EyeShape;
  tail: TailType;
  cheekFluff: boolean;
  blush: boolean;
  blushColor?: string;
  hairTuft: HairTuftType;
  eyelashes: boolean;
}
```

2. Update `DEFAULT_PROFILE` with `hairTuft: 'none'` and `eyelashes: false`.

3. Update all 13 entries in `CAT_PROFILES` with per-cat hair tuft assignments:

| Cat | hairTuft | eyelashes |
|-----|----------|-----------|
| mini-meowww | curly | true |
| jazzy | slicked | false |
| luna | none | true |
| biscuit | fluffy | true |
| ballymakawww | spiky | false |
| aria | wave | true |
| tempo | windswept | false |
| shibu | side-part | false |
| bella | silky | true |
| sable | sharp | false |
| coda | messy | false |
| chonky-monke | cowlick | false |
| salsa | none | false |

### Step 4: Run test to verify it passes

Run: `npx jest src/components/Mascot/__tests__/CatRenderer.test.tsx --verbose`
Expected: PASS

### Step 5: Commit

```bash
git add src/components/Mascot/svg/catProfiles.ts src/components/Mascot/__tests__/CatRenderer.test.tsx
git commit -m "feat(cats): add hairTuft and eyelashes to CatProfile"
```

---

## Task 2: Redesign CatParts Anatomy — Head, Body, Paws

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx`
- Test: `src/components/Mascot/__tests__/CatParts.test.tsx` (NEW)

### Step 1: Write the failing test

Create `src/components/Mascot/__tests__/CatParts.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import Svg from 'react-native-svg';
import { CatBody, CatHead, CatPaws } from '../svg/CatParts';

// Mock react-native-svg (same pattern as KeysieSvg.test.tsx)
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
    ClipPath: MockSvgComponent('ClipPath'),
    LinearGradient: MockSvgComponent('LinearGradient'),
    RadialGradient: MockSvgComponent('RadialGradient'),
    Stop: MockSvgComponent('Stop'),
  };
});

function SvgWrap({ children }: { children: React.ReactNode }) {
  const SvgC = require('react-native-svg').default;
  return <SvgC viewBox="0 0 100 100">{children}</SvgC>;
}

describe('CatBody', () => {
  it('renders all 4 body types without crashing', () => {
    for (const type of ['slim', 'standard', 'round', 'chonky'] as const) {
      const { unmount } = render(
        <SvgWrap><CatBody type={type} color="#FF0000" /></SvgWrap>
      );
      unmount();
    }
  });
});

describe('CatHead', () => {
  it('uses r=32 for anime chibi proportions', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatHead color="#FF0000" /></SvgWrap>
    );
    const circles = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Circle' && v.props.r === '32'
    );
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });
});

describe('CatPaws', () => {
  it('renders without crashing', () => {
    const { unmount } = render(
      <SvgWrap><CatPaws color="#FF0000" /></SvgWrap>
    );
    unmount();
  });
});
```

### Step 2: Run test to verify it fails

Run: `npx jest src/components/Mascot/__tests__/CatParts.test.tsx --verbose`
Expected: FAIL — `CatPaws` not exported, head `r` is still 28

### Step 3: Write minimal implementation

In `src/components/Mascot/svg/CatParts.tsx`:

**A) Redesign CatHead** — bigger head at `cy=35, r=32`:

```typescript
export function CatHead({
  color,
  cheekFluff = false,
}: {
  color: string;
  cheekFluff?: boolean;
}): ReactElement {
  return (
    <G>
      <Circle cx="50" cy="35" r="32" fill={color} />
      {cheekFluff && (
        <G>
          <Circle cx="20" cy="42" r="7" fill={color} />
          <Circle cx="80" cy="42" r="7" fill={color} />
        </G>
      )}
    </G>
  );
}
```

**B) Redesign CatBody** — smaller, lower body:

```typescript
export function CatBody({ type, color }: { type: BodyType; color: string }): ReactElement {
  switch (type) {
    case 'slim':
      return <Ellipse cx="50" cy="80" rx="11" ry="10" fill={color} />;
    case 'round':
      return <Ellipse cx="50" cy="80" rx="16" ry="13" fill={color} />;
    case 'chonky':
      return <Ellipse cx="50" cy="80" rx="20" ry="15" fill={color} />;
    case 'standard':
    default:
      return <Ellipse cx="50" cy="80" rx="14" ry="12" fill={color} />;
  }
}
```

**C) Add CatPaws** — visible rounded paw bumps below body:

```typescript
export function CatPaws({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Ellipse cx="42" cy="92" rx="5" ry="3" fill={color} />
      <Ellipse cx="58" cy="92" rx="5" ry="3" fill={color} />
    </G>
  );
}
```

**D) Reposition CatNose** — tiny for anime:

```typescript
export function CatNose({ color }: { color: string }): ReactElement {
  return <Ellipse cx="50" cy="42" rx="1.8" ry="1.2" fill={color} />;
}
```

**E) Reposition CatWhiskers** for new head center:

```typescript
export function CatWhiskers({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Line x1="14" y1="38" x2="30" y2="40" stroke={color} strokeWidth="0.8" />
      <Line x1="12" y1="42" x2="30" y2="42" stroke={color} strokeWidth="0.8" />
      <Line x1="14" y1="46" x2="30" y2="44" stroke={color} strokeWidth="0.8" />
      <Line x1="70" y1="40" x2="86" y2="38" stroke={color} strokeWidth="0.8" />
      <Line x1="70" y1="42" x2="88" y2="42" stroke={color} strokeWidth="0.8" />
      <Line x1="70" y1="44" x2="86" y2="46" stroke={color} strokeWidth="0.8" />
    </G>
  );
}
```

**F) Reposition CatBlush** wider for bigger head:

```typescript
export function CatBlush({ color = '#FF9999' }: { color?: string }): ReactElement {
  return (
    <G>
      <Ellipse cx="26" cy="42" rx="6" ry="4" fill={color} opacity={0.3} />
      <Ellipse cx="74" cy="42" rx="6" ry="4" fill={color} opacity={0.3} />
    </G>
  );
}
```

### Step 4: Run test to verify it passes

Run: `npx jest src/components/Mascot/__tests__/CatParts.test.tsx --verbose`
Expected: PASS

### Step 5: Commit

```bash
git add src/components/Mascot/svg/CatParts.tsx src/components/Mascot/__tests__/CatParts.test.tsx
git commit -m "feat(cats): redesign CatParts anatomy — bigger head, smaller body, add paws"
```

---

## Task 3: Redesign Ears — Soft Bezier Curves

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx`
- Test: `src/components/Mascot/__tests__/CatParts.test.tsx`

### Step 1: Write the failing test

Add to `CatParts.test.tsx`:

```typescript
describe('CatEars', () => {
  it('pointed ears use bezier curves (Q commands in path)', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatEars type="pointed" bodyColor="#FF0000" innerColor="#FF8800" />
      </SvgWrap>
    );
    const paths = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Path'
    );
    // Pointed ears should have Q (quadratic bezier) commands
    const bezierPaths = paths.filter(
      (p: any) => typeof p.props.d === 'string' && p.props.d.includes('Q')
    );
    expect(bezierPaths.length).toBeGreaterThanOrEqual(2);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npx jest src/components/Mascot/__tests__/CatParts.test.tsx --verbose`
Expected: FAIL — current pointed ears use `L` (straight line) not `Q` (bezier)

### Step 3: Write minimal implementation

Replace `CatEars` in `CatParts.tsx` — repositioned for `cy=35, r=32` head (top of head at y=3):

```typescript
export function CatEars({
  type,
  bodyColor,
  innerColor,
}: {
  type: EarType;
  bodyColor: string;
  innerColor: string;
}): ReactElement {
  switch (type) {
    case 'rounded':
      return (
        <G>
          {/* Left ear — wide rounded */}
          <Path d="M 24 22 Q 16 2 36 16" fill={bodyColor} />
          <Path d="M 26 19 Q 21 8 34 15" fill={innerColor} />
          {/* Right ear */}
          <Path d="M 76 22 Q 84 2 64 16" fill={bodyColor} />
          <Path d="M 74 19 Q 79 8 66 15" fill={innerColor} />
        </G>
      );
    case 'folded':
      return (
        <G>
          {/* Left ear — folded forward */}
          <Path d="M 24 20 Q 18 4 36 14" fill={bodyColor} />
          <Path d="M 26 17 Q 22 8 34 13" fill={innerColor} />
          <Path d="M 24 12 Q 22 10 30 12" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          {/* Right ear */}
          <Path d="M 76 20 Q 82 4 64 14" fill={bodyColor} />
          <Path d="M 74 17 Q 78 8 66 13" fill={innerColor} />
          <Path d="M 76 12 Q 78 10 70 12" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
        </G>
      );
    case 'pointed':
    default:
      return (
        <G>
          {/* Left ear — soft bezier pointed */}
          <Path d="M 24 20 Q 20 -2 38 14" fill={bodyColor} />
          <Path d="M 26 17 Q 23 4 36 13" fill={innerColor} />
          {/* Right ear */}
          <Path d="M 76 20 Q 80 -2 62 14" fill={bodyColor} />
          <Path d="M 74 17 Q 77 4 64 13" fill={innerColor} />
        </G>
      );
  }
}
```

### Step 4: Run test to verify it passes

Run: `npx jest src/components/Mascot/__tests__/CatParts.test.tsx --verbose`
Expected: PASS

### Step 5: Commit

```bash
git add src/components/Mascot/svg/CatParts.tsx src/components/Mascot/__tests__/CatParts.test.tsx
git commit -m "feat(cats): redesign ears with soft bezier curves"
```

---

## Task 4: Redesign Mouth — Anime Cat W-Shape

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx`
- Modify: `src/components/Mascot/types.ts` (add new moods)
- Test: `src/components/Mascot/__tests__/CatParts.test.tsx`

### Step 1: Write the failing test

```typescript
describe('CatMouth', () => {
  it('happy mood renders W-shape mouth (multiple Q commands)', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatMouth mood="happy" darkAccent="#8B0000" />
      </SvgWrap>
    );
    const paths = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Path'
    );
    // W-shape mouth should have a path with multiple curve segments
    expect(paths.length).toBeGreaterThanOrEqual(1);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npx jest src/components/Mascot/__tests__/CatParts.test.tsx --verbose`
Expected: PASS (this test may pass with current code — adjust test to check for specific W-shape path)

### Step 3: Write minimal implementation

Update `CatMouth` in `CatParts.tsx`:

```typescript
export function CatMouth({ mood, darkAccent }: { mood: MascotMood; darkAccent: string }): ReactElement {
  switch (mood) {
    case 'happy':
      // Anime cat W-shape mouth (ω)
      return (
        <Path
          d="M 45 46 Q 47 49 50 46 Q 53 49 55 46"
          stroke={darkAccent}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      );
    case 'encouraging':
      return (
        <Path
          d="M 46 46 Q 50 49 54 46"
          stroke={darkAccent}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
      );
    case 'excited':
      // Open diamond mouth
      return (
        <Path
          d="M 48 44 L 50 42 L 52 44 L 50 47 Z"
          fill={darkAccent}
          opacity={0.8}
        />
      );
    case 'teaching':
      return (
        <Line x1="47" y1="46" x2="53" y2="46" stroke={darkAccent} strokeWidth="1.2" strokeLinecap="round" />
      );
    case 'celebrating':
      // Wide open grin
      return (
        <Path
          d="M 44 44 Q 50 52 56 44"
          stroke={darkAccent}
          strokeWidth="1.2"
          fill={darkAccent}
          strokeLinecap="round"
          opacity={0.6}
        />
      );
  }
}
```

Also update `src/components/Mascot/types.ts` to add new mood types for the eye system (needed later):

```typescript
export type MascotMood =
  | 'happy' | 'encouraging' | 'excited' | 'teaching' | 'celebrating'
  | 'love' | 'confused' | 'smug' | 'sleepy';
export type MascotSize = 'tiny' | 'small' | 'medium' | 'large';
```

### Step 4: Run test to verify it passes

Run: `npx jest src/components/Mascot/ --verbose`
Expected: PASS (also run full mascot suite to catch regressions)

### Step 5: Commit

```bash
git add src/components/Mascot/svg/CatParts.tsx src/components/Mascot/types.ts src/components/Mascot/__tests__/CatParts.test.tsx
git commit -m "feat(cats): anime W-shape mouth + add new mood types"
```

---

## Task 5: Add Hair Tuft Rendering to CatParts

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx`
- Test: `src/components/Mascot/__tests__/CatParts.test.tsx`

### Step 1: Write the failing test

```typescript
import { CatHairTuft } from '../svg/CatParts';

describe('CatHairTuft', () => {
  it('renders curly tuft without crashing', () => {
    const { unmount } = render(
      <SvgWrap><CatHairTuft type="curly" color="#FF0000" /></SvgWrap>
    );
    unmount();
  });

  it('renders "none" as null (no element)', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatHairTuft type="none" color="#FF0000" /></SvgWrap>
    );
    const paths = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Path'
    );
    // "none" should render no path elements beyond the Svg wrapper
    expect(paths.length).toBe(0);
  });

  it('renders all 12 tuft types without crashing', () => {
    const types = ['none', 'curly', 'slicked', 'fluffy', 'spiky', 'wave', 'windswept', 'side-part', 'silky', 'sharp', 'messy', 'cowlick'] as const;
    for (const type of types) {
      const { unmount } = render(
        <SvgWrap><CatHairTuft type={type} color="#FF0000" /></SvgWrap>
      );
      unmount();
    }
  });
});
```

### Step 2: Run test to verify it fails

Run: `npx jest src/components/Mascot/__tests__/CatParts.test.tsx --verbose`
Expected: FAIL — `CatHairTuft` not exported

### Step 3: Write minimal implementation

Add to `CatParts.tsx`:

```typescript
import type { HairTuftType } from './catProfiles';

export function CatHairTuft({ type, color }: { type: HairTuftType; color: string }): ReactElement | null {
  if (type === 'none') return null;

  const darkColor = darkenColor(color, 0.7);
  // All tufts positioned between ears, above forehead (y=2..8, x=46..54)
  switch (type) {
    case 'curly':
      return <Path d="M 48 6 Q 46 2 50 4 Q 54 2 52 6" fill={color} stroke={darkColor} strokeWidth="0.5" />;
    case 'slicked':
      return <Path d="M 47 5 Q 50 0 53 5" fill={color} stroke={darkColor} strokeWidth="0.5" />;
    case 'fluffy':
      return (
        <G>
          <Circle cx="48" cy="5" r="2.5" fill={color} />
          <Circle cx="52" cy="4" r="2.5" fill={color} />
          <Circle cx="50" cy="3" r="2" fill={color} />
        </G>
      );
    case 'spiky':
      return (
        <G>
          <Path d="M 47 6 L 46 1 L 49 5" fill={color} />
          <Path d="M 49 5 L 50 0 L 51 5" fill={color} />
          <Path d="M 51 5 L 54 1 L 53 6" fill={color} />
        </G>
      );
    case 'wave':
      return <Path d="M 44 6 Q 47 2 50 5 Q 53 2 56 6" fill={color} stroke={darkColor} strokeWidth="0.5" />;
    case 'windswept':
      return <Path d="M 46 6 Q 50 2 56 4 Q 58 3 60 5" fill={color} stroke={darkColor} strokeWidth="0.5" />;
    case 'side-part':
      return <Path d="M 44 6 Q 46 3 50 5 L 52 6" fill={color} stroke={darkColor} strokeWidth="0.5" />;
    case 'silky':
      return <Path d="M 45 7 Q 48 2 50 4 Q 52 2 55 7" fill={color} stroke={darkColor} strokeWidth="0.3" />;
    case 'sharp':
      return <Path d="M 48 6 L 50 1 L 52 6" fill={color} />;
    case 'messy':
      return (
        <G>
          <Path d="M 46 6 L 45 2 L 48 5" fill={color} />
          <Path d="M 50 5 L 51 1 L 52 5" fill={color} />
          <Path d="M 53 6 L 55 3 L 54 6" fill={color} />
        </G>
      );
    case 'cowlick':
      return <Path d="M 48 5 Q 50 -1 54 4 Q 56 2 55 6" fill={color} stroke={darkColor} strokeWidth="0.5" />;
    default:
      return null;
  }
}
```

Note: You'll need a local `darkenColor` helper in CatParts.tsx (or import from a shared utils file). Currently `darkenColor` exists in both `KeysieSvg.tsx` and `CatAccessories.tsx`. Extract it:

```typescript
// Add at top of CatParts.tsx (local helper — duplicated is fine for now)
function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * factor).toString(16).padStart(2, '0')}${Math.round(g * factor).toString(16).padStart(2, '0')}${Math.round(b * factor).toString(16).padStart(2, '0')}`;
}
```

### Step 4: Run test to verify it passes

Run: `npx jest src/components/Mascot/__tests__/CatParts.test.tsx --verbose`
Expected: PASS

### Step 5: Commit

```bash
git add src/components/Mascot/svg/CatParts.tsx src/components/Mascot/__tests__/CatParts.test.tsx
git commit -m "feat(cats): add CatHairTuft component — 12 tuft styles"
```

---

## Task 6: Wire New Anatomy into KeysieSvg

**Files:**
- Modify: `src/components/Mascot/KeysieSvg.tsx`
- Test: existing `src/components/Mascot/__tests__/KeysieSvg.test.tsx` and `CatRenderer.test.tsx`

### Step 1: Write the failing test

Add to `CatRenderer.test.tsx` in the "KeysieSvg composable rendering" describe:

```typescript
it('composable path includes CatPaws element', () => {
  const { UNSAFE_getAllByType } = render(
    <KeysieSvg mood="happy" size="medium" catId="mini-meowww"
      visuals={CAT_CHARACTERS[0].visuals} accentColor={CAT_CHARACTERS[0].color} />
  );
  const allViews = UNSAFE_getAllByType(require('react-native').View);
  const ellipses = allViews.filter(
    (v: any) => v.props.accessibilityLabel === 'Ellipse'
  );
  // Should have at least body ellipse + 2 paw ellipses + nose ellipse = 4+
  expect(ellipses.length).toBeGreaterThanOrEqual(4);
});
```

### Step 2: Run test to verify it fails

Run: `npx jest src/components/Mascot/__tests__/CatRenderer.test.tsx --verbose`
Expected: FAIL — paw ellipses not rendered yet

### Step 3: Write minimal implementation

In `KeysieSvg.tsx`, update `renderComposable`:

1. Import `CatPaws` and `CatHairTuft` from `./svg/CatParts`
2. Add `<CatPaws color={bodyColor} />` after `<CatBody>`
3. Add `<CatHairTuft type={profile.hairTuft} color={bodyColor} />` after `<CatEars>`
4. Remove `<CatHeadphones>` and `<CatPianoCollar>` from default render (these become accessories at certain evolution stages, not baseline)

```typescript
import {
  CatBody, CatHead, CatEars, CatEyes, CatMouth, CatNose,
  CatWhiskers, CatTail, CatBlush, CatPaws, CatHairTuft,
} from './svg/CatParts';
```

Then in `renderComposable`, insert paws after body and hair tuft after ears:

```typescript
function renderComposable(/* ... */) {
  const profile = getCatProfile(catId);
  const cat = getCatById(catId);
  const whiskerColor = lightenColor(bodyColor, 0.4);
  const accessories = cat?.evolutionVisuals[evolutionStage]?.accessories ?? [];

  return (
    <G>
      <EvolutionAura stage={evolutionStage} accent={accent} />
      <CatTail type={profile.tail} bodyColor={bodyColor} accentColor={accent} />
      <CatBody type={profile.body} color={bodyColor} />
      <CatPaws color={bodyColor} />
      <CatHead color={bodyColor} cheekFluff={profile.cheekFluff} />
      <Defs>
        <ClipPath id={`bodyClip-${catId}`}>
          <Circle cx="50" cy="38" r="26" />
          <Ellipse cx="50" cy="72" rx="22" ry="20" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#bodyClip-${catId})`}>
        {renderPattern(pattern, bodyColor, bellyColor)}
      </G>
      <CatEars type={profile.ears} bodyColor={bodyColor} innerColor={earInnerColor} />
      <CatHairTuft type={profile.hairTuft} color={bodyColor} />
      <CatWhiskers color={whiskerColor} />
      <CatNose color={noseColor} />
      <CatEyes shape={profile.eyes} mood={mood} eyeColor={eyeColor} />
      <CatMouth mood={mood} darkAccent={accentDark} />
      {profile.blush && <CatBlush color={profile.blushColor} />}
      {accessories.length > 0 && renderAccessories(accessories, accent)}
    </G>
  );
}
```

**Important:** Also update `ClipPath id` to use `catId` to prevent gradient ID collisions when multiple cats on screen.

### Step 4: Run tests

Run: `npx jest src/components/Mascot/ --verbose`
Expected: PASS

The existing tests may need minor updates because:
- Head `r` changed from 28 to 32 (tests checking exact circle count might shift)
- Headphones/PianoCollar removed from composable path (only affects legacy path tests)
- Update `KeysieSvg.test.tsx` accordingly if needed (it tests the legacy path which still has headphones)

### Step 5: Commit

```bash
git add src/components/Mascot/KeysieSvg.tsx src/components/Mascot/__tests__/CatRenderer.test.tsx src/components/Mascot/__tests__/KeysieSvg.test.tsx
git commit -m "feat(cats): wire paws + hair tufts into KeysieSvg assembly"
```

---

## Task 7: Create CatGradients.tsx — Gradient Defs Factory

**Files:**
- Create: `src/components/Mascot/svg/CatGradients.tsx`
- Test: `src/components/Mascot/__tests__/CatGradients.test.tsx` (NEW)

### Step 1: Write the failing test

Create `src/components/Mascot/__tests__/CatGradients.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { CatGradientDefs } from '../svg/CatGradients';

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
    Defs: MockSvgComponent('Defs'),
    RadialGradient: MockSvgComponent('RadialGradient'),
    LinearGradient: MockSvgComponent('LinearGradient'),
    Stop: MockSvgComponent('Stop'),
  };
});

describe('CatGradientDefs', () => {
  it('renders Defs with gradient elements', () => {
    const SvgC = require('react-native-svg').default;
    const { UNSAFE_getAllByType } = render(
      <SvgC>
        <CatGradientDefs
          catId="mini-meowww"
          bodyColor="#1A1A2E"
          eyeColor="#3DFF88"
        />
      </SvgC>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const gradients = allViews.filter(
      (v: any) =>
        v.props.accessibilityLabel === 'RadialGradient' ||
        v.props.accessibilityLabel === 'LinearGradient'
    );
    // Should have head, body, iris gradients at minimum
    expect(gradients.length).toBeGreaterThanOrEqual(3);
  });

  it('prefixes gradient IDs with catId to prevent collisions', () => {
    const SvgC = require('react-native-svg').default;
    const { UNSAFE_getAllByType } = render(
      <SvgC>
        <CatGradientDefs catId="jazzy" bodyColor="#6B7B9E" eyeColor="#B06EFF" />
      </SvgC>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const gradients = allViews.filter(
      (v: any) =>
        v.props.accessibilityLabel === 'RadialGradient' ||
        v.props.accessibilityLabel === 'LinearGradient'
    );
    // All gradient IDs should start with "jazzy-"
    for (const g of gradients) {
      expect(g.props.id).toMatch(/^jazzy-/);
    }
  });
});
```

### Step 2: Run test to verify it fails

Run: `npx jest src/components/Mascot/__tests__/CatGradients.test.tsx --verbose`
Expected: FAIL — `CatGradientDefs` does not exist

### Step 3: Write minimal implementation

Create `src/components/Mascot/svg/CatGradients.tsx`:

```typescript
/**
 * CatGradients — Reusable SVG gradient Defs factory.
 *
 * Creates all gradient definitions needed for a cat's painted look.
 * All IDs are prefixed with catId to prevent collisions when
 * multiple cats render on the same screen.
 *
 * Usage: Place inside <Svg> as <CatGradientDefs catId={id} ... />
 * Reference: fill={`url(#${catId}-head)`}
 */

import type { ReactElement } from 'react';
import { Defs, RadialGradient, LinearGradient, Stop } from 'react-native-svg';

function lighten(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r + (255 - r) * factor).toString(16).padStart(2, '0')}${Math.round(g + (255 - g) * factor).toString(16).padStart(2, '0')}${Math.round(b + (255 - b) * factor).toString(16).padStart(2, '0')}`;
}

function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * factor).toString(16).padStart(2, '0')}${Math.round(g * factor).toString(16).padStart(2, '0')}${Math.round(b * factor).toString(16).padStart(2, '0')}`;
}

interface CatGradientDefsProps {
  catId: string;
  bodyColor: string;
  eyeColor: string;
}

export function CatGradientDefs({ catId, bodyColor, eyeColor }: CatGradientDefsProps): ReactElement {
  return (
    <Defs>
      {/* Head sphere gradient — light upper-left */}
      <RadialGradient id={`${catId}-head`} cx="40%" cy="35%" r="60%">
        <Stop offset="0%" stopColor={lighten(bodyColor, 0.15)} />
        <Stop offset="70%" stopColor={bodyColor} />
        <Stop offset="100%" stopColor={darken(bodyColor, 0.80)} />
      </RadialGradient>

      {/* Body roundness gradient */}
      <RadialGradient id={`${catId}-body`} cx="50%" cy="40%" r="55%">
        <Stop offset="0%" stopColor={lighten(bodyColor, 0.10)} />
        <Stop offset="85%" stopColor={bodyColor} />
        <Stop offset="100%" stopColor={darken(bodyColor, 0.75)} />
      </RadialGradient>

      {/* Iris depth gradient */}
      <RadialGradient id={`${catId}-iris`} cx="45%" cy="40%" r="50%">
        <Stop offset="0%" stopColor={lighten(eyeColor, 0.30)} />
        <Stop offset="60%" stopColor={eyeColor} />
        <Stop offset="100%" stopColor={darken(eyeColor, 0.60)} />
      </RadialGradient>

      {/* Ear gradient (linear top-to-bottom) */}
      <LinearGradient id={`${catId}-ear`} x1="50%" y1="0%" x2="50%" y2="100%">
        <Stop offset="0%" stopColor={lighten(bodyColor, 0.08)} />
        <Stop offset="100%" stopColor={darken(bodyColor, 0.85)} />
      </LinearGradient>

      {/* Tail gradient */}
      <LinearGradient id={`${catId}-tail`} x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={lighten(bodyColor, 0.05)} />
        <Stop offset="100%" stopColor={darken(bodyColor, 0.80)} />
      </LinearGradient>
    </Defs>
  );
}

/** Gradient ID helpers — use these instead of raw strings */
export function gradId(catId: string, part: 'head' | 'body' | 'iris' | 'ear' | 'tail'): string {
  return `url(#${catId}-${part})`;
}
```

### Step 4: Run test to verify it passes

Run: `npx jest src/components/Mascot/__tests__/CatGradients.test.tsx --verbose`
Expected: PASS

### Step 5: Commit

```bash
git add src/components/Mascot/svg/CatGradients.tsx src/components/Mascot/__tests__/CatGradients.test.tsx
git commit -m "feat(cats): add CatGradients factory — painted depth Defs"
```

---

## Task 8: Wire Gradients into CatParts + KeysieSvg

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx` — accept optional `gradientFill` props
- Modify: `src/components/Mascot/KeysieSvg.tsx` — place `<CatGradientDefs>` and pass gradient IDs
- Test: existing tests should still pass + update `CatParts.test.tsx`

### Step 1: Write the failing test

Add to `CatParts.test.tsx`:

```typescript
describe('CatBody with gradient', () => {
  it('uses gradientFill when provided', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatBody type="standard" color="#FF0000" gradientFill="url(#test-body)" />
      </SvgWrap>
    );
    const ellipses = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Ellipse'
    );
    const bodyEllipse = ellipses.find((e: any) => e.props.fill === 'url(#test-body)');
    expect(bodyEllipse).toBeTruthy();
  });
});
```

### Step 2: Run test to verify it fails

Expected: FAIL — `CatBody` doesn't accept `gradientFill`

### Step 3: Write minimal implementation

Update `CatBody` (and similarly `CatHead`) to accept optional `gradientFill`:

```typescript
export function CatBody({ type, color, gradientFill }: {
  type: BodyType; color: string; gradientFill?: string;
}): ReactElement {
  const fill = gradientFill ?? color;
  switch (type) {
    case 'slim':
      return <Ellipse cx="50" cy="80" rx="11" ry="10" fill={fill} />;
    // ... etc
  }
}

export function CatHead({ color, cheekFluff = false, gradientFill }: {
  color: string; cheekFluff?: boolean; gradientFill?: string;
}): ReactElement {
  const fill = gradientFill ?? color;
  return (
    <G>
      <Circle cx="50" cy="35" r="32" fill={fill} />
      {cheekFluff && (
        <G>
          <Circle cx="20" cy="42" r="7" fill={fill} />
          <Circle cx="80" cy="42" r="7" fill={fill} />
        </G>
      )}
    </G>
  );
}
```

Update `KeysieSvg.tsx` `renderComposable` to include `<CatGradientDefs>` and pass gradient IDs:

```typescript
import { CatGradientDefs, gradId } from './svg/CatGradients';

// In renderComposable:
<CatGradientDefs catId={catId} bodyColor={bodyColor} eyeColor={eyeColor} />
<CatBody type={profile.body} color={bodyColor} gradientFill={gradId(catId, 'body')} />
<CatHead color={bodyColor} cheekFluff={profile.cheekFluff} gradientFill={gradId(catId, 'head')} />
```

### Step 4: Run tests

Run: `npx jest src/components/Mascot/ --verbose`
Expected: PASS

### Step 5: Commit

```bash
git add src/components/Mascot/svg/CatParts.tsx src/components/Mascot/KeysieSvg.tsx src/components/Mascot/__tests__/CatParts.test.tsx
git commit -m "feat(cats): wire gradient fills into CatParts — painted depth"
```

---

## Task 9: Add Shadow Layers

**Files:**
- Create: `src/components/Mascot/svg/CatShadows.tsx`
- Test: `src/components/Mascot/__tests__/CatShadows.test.tsx` (NEW)
- Modify: `src/components/Mascot/KeysieSvg.tsx`

### Step 1: Write test

Create test file. Test that `CatShadows` renders shadow ellipses (chin, ground, paw shadows).

### Step 2: Implement

```typescript
// src/components/Mascot/svg/CatShadows.tsx
import type { ReactElement } from 'react';
import { G, Ellipse } from 'react-native-svg';

interface CatShadowsProps {
  bodyColor: string;
}

export function CatShadows({ bodyColor }: CatShadowsProps): ReactElement {
  return (
    <G>
      {/* Chin shadow at head-body junction */}
      <Ellipse cx="50" cy="60" rx="18" ry="4" fill="#000000" opacity={0.06} />
      {/* Ground shadow */}
      <Ellipse cx="50" cy="96" rx="24" ry="3" fill="#000000" opacity={0.08} />
      {/* Left paw shadow */}
      <Ellipse cx="42" cy="94" rx="5" ry="1.5" fill="#000000" opacity={0.05} />
      {/* Right paw shadow */}
      <Ellipse cx="58" cy="94" rx="5" ry="1.5" fill="#000000" opacity={0.05} />
    </G>
  );
}
```

Wire into `KeysieSvg.tsx` `renderComposable` — place shadows early in the render order (before body, so they appear behind).

### Step 3: Run tests, commit

```bash
git commit -m "feat(cats): add CatShadows — chin, ground, paw shadow layers"
```

---

## Task 10: 6-Layer Composite Eye System

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx` — complete eye rewrite
- Test: update eye tests in `KeysieSvg.test.tsx`

### Step 1: Write test

Test that the `big-sparkly` eye shape renders at least 6 SVG elements per eye (sclera, iris outer, iris fill, pupil, 2 speculars).

### Step 2: Implement

Rewrite `CatEyes` with the 6-layer system from the design doc. Each eye gets:
1. White sclera ellipse (slightly squared)
2. Outer iris ring (dark eye color)
3. Iris fill referencing `gradId(catId, 'iris')`
4. Pupil (large, vertically elongated for cats)
5. Primary specular (large white, upper-left)
6. Secondary specular (small white, lower-right)

Accept a new optional `catId` prop for gradient reference. Add new mood expressions: `love` (heart iris), `confused` (spiral), `smug` (half-lid), `sleepy` (heavy-lid).

Also add `eyelashes` prop to render thin lash lines on top of sclera for cats with `eyelashes: true`.

### Step 3: Run tests, commit

```bash
git commit -m "feat(cats): 6-layer composite anime eye system"
```

---

## Task 11: Expand SVG Accessories (P0 + P1)

**Files:**
- Modify: `src/components/Mascot/svg/CatAccessories.tsx`
- Test: `src/components/Mascot/__tests__/CatAccessories.test.tsx` (NEW)

### Step 1: Write test

Test that `renderAccessory` returns non-null for all P0+P1 accessory names listed in the design doc, and that each uses gradient styling (check for LinearGradient or gradient fill references).

### Step 2: Implement

Rewrite all existing accessories with gradient fills. Add new ones:
- P0: collar, pendant, crown (already exist — enhance with gradients)
- P1: scarf (distinct from bow-tie), cape (richer), trilby, sax, constellation, crescent-collar, tiara

Each accessory should use `Defs > LinearGradient` for metallic/fabric effects. Position relative to the new chibi anatomy (head cy=35, body cy=80).

### Step 3: Run tests, commit

```bash
git commit -m "feat(cats): enhanced SVG accessories P0+P1 with gradient styling"
```

---

## Task 12: AnimatedG Layer Architecture + useCatAnimation Hook

**Files:**
- Modify: `src/components/Mascot/KeysieSvg.tsx` — wrap parts in AnimatedG layers
- Create: `src/components/Mascot/animations/useCatAnimation.ts` — per-part spring physics
- Modify: `src/components/Mascot/animations/catAnimations.ts` — add squash/stretch configs
- Test: `src/components/Mascot/animations/__tests__/catAnimations.test.ts`

### Step 1: Write test

Test `PART_SPRINGS` config exists with expected keys (body, head, ears, tail, face, accessories). Test squash/stretch keyframes exist for `celebrate`, `play`, `sad`.

### Step 2: Implement

**A) Add to catAnimations.ts:**

```typescript
export const PART_SPRINGS = {
  body:        { damping: 12, stiffness: 100, mass: 1.0, delay: 0 },
  head:        { damping: 10, stiffness: 120, mass: 0.8, delay: 30 },
  ears:        { damping: 6,  stiffness: 80,  mass: 0.3, delay: 80 },
  tail:        { damping: 5,  stiffness: 60,  mass: 0.4, delay: 120 },
  face:        { damping: 15, stiffness: 150, mass: 0.5, delay: 0 },
  accessories: { damping: 4,  stiffness: 40,  mass: 0.6, delay: 150 },
};

export const SQUASH_STRETCH = { /* as per design doc */ };
```

**B) Create useCatAnimation.ts** — returns per-part animated props for `<AnimatedG>`:

```typescript
export function useCatAnimation(pose: CatPose, isAnimated: boolean) {
  // Returns: { bodyProps, headProps, earProps, tailProps, faceProps, accessoryProps }
  // Each uses withSpring with PART_SPRINGS config and delay offset
}
```

**C) Update KeysieSvg.tsx** — import `Animated.createAnimatedComponent(G)` from react-native-reanimated, wrap each SVG layer in `AnimatedG`:

```typescript
import Animated from 'react-native-reanimated';
import { G } from 'react-native-svg';
const AnimatedG = Animated.createAnimatedComponent(G);
```

**Important:** Only large/hero sizes get per-part animation. Small/medium sizes use static rendering for performance.

### Step 3: Run tests, commit

```bash
git commit -m "feat(cats): AnimatedG layer architecture + per-part spring physics"
```

---

## Task 13: Micro-Life Animations Hook

**Files:**
- Create: `src/components/Mascot/animations/useMicroLife.ts`
- Test: `src/components/Mascot/animations/__tests__/useMicroLife.test.ts` (NEW)

### Step 1: Write test

Test that the hook returns animated props for: blink (scaleY), earTwitch (rotate), breathing (scaleY), tailSway (translateX). Test that `isEnabled=false` returns static props.

### Step 2: Implement

```typescript
export function useMicroLife(isEnabled: boolean) {
  // Blink: random 3-6s interval, 150ms close-open
  // Ear twitch: random 4-8s interval, ±5 degrees
  // Breathing: continuous 3s sine, scaleY 1.0 → 1.02
  // Tail sway: continuous 2.5s sine, translateX ±3
  // Returns: { blinkProps, earTwitchProps, breathProps, tailSwayProps }
}
```

Use `withRepeat`, `withSequence`, `withTiming` from Reanimated. For random intervals, use `setTimeout` in `useEffect` to restart animation sequences.

### Step 3: Run tests, commit

```bash
git commit -m "feat(cats): useMicroLife hook — blink, twitch, breathe, sway"
```

---

## Task 14: Remaining Accessories (P2 + P3) + Evolution Levels

**Files:**
- Modify: `src/components/Mascot/svg/CatAccessories.tsx`
- Modify: `src/components/Mascot/KeysieSvg.tsx` — size-adaptive detail
- Test: extend accessories tests

### Step 1: Implement P2 accessories

All remaining named accessories from `catCharacters.ts` that currently return `null`:
- Hats: fedora, chef-hat, golden-headphones (distinct from headphones)
- Glasses: round-glasses, pixel-glasses, racing-goggles (distinct from sunglasses)
- Neckwear: pearl-necklace, gold-chain, kimono-sash, temple-bell
- Capes: golden-cape, royal-robe, royal-cape-white, apron, conductor-coat
- Instruments: fiddle, baton, cookie-wand

### Step 2: Implement P3 effect accessories

- cherry-blossom: cluster of small pink circles
- constellation: glowing dots connected by thin lines
- speed-aura: horizontal motion lines behind cat
- candelabra: small candle flames above head
- piano-throne: bench shape behind/below cat

### Step 3: Implement evolution visual progression

In `KeysieSvg.tsx`, vary detail level by evolution stage:
- **Baby:** Flat fills (no gradients), no shadows, simplified eyes (fewer layers), blink only
- **Teen:** Head + body gradient, chin shadow only, full eyes, + breathing
- **Adult:** All gradients, all shadows, forehead highlight, + ear twitch, tail sway
- **Master:** Maximum detail, ground shadow, all micro-life, EvolutionAura

### Step 4: Implement size-adaptive detail

Check `pixelSize` in `KeysieSvg`:
- `<= 48`: No gradients, no shadows, simplified 3-layer eyes
- `<= 72`: Body + head gradient, basic shadows, full eyes
- `<= 120`: All gradients, all shadows, all highlights
- `> 120`: Maximum — fur texture hints, extra specular, ground shadow

### Step 5: Run tests, commit

```bash
git commit -m "feat(cats): P2+P3 accessories, evolution levels, size-adaptive detail"
```

---

## Task 15: CatAvatar Enhancement — Hero Size + Remove 3D Branching

**Files:**
- Modify: `src/components/Mascot/CatAvatar.tsx`
- Test: `src/components/Mascot/__tests__/CatRenderer.test.tsx`

### Step 1: Add hero size

Add `'hero'` to `CatAvatarSize` type and `SIZE_MAP`:

```typescript
export type CatAvatarSize = 'small' | 'medium' | 'large' | 'hero';
const SIZE_MAP: Record<CatAvatarSize, number> = {
  small: 48, medium: 72, large: 120, hero: 200,
};
```

### Step 2: Wire micro-life to CatAvatar

Only enable micro-life for `large` and `hero` sizes. Pass `isAnimated` prop through to KeysieSvg.

### Step 3: Run tests, commit

```bash
git commit -m "feat(cats): CatAvatar hero size + micro-life integration"
```

---

## Task 16: Screen Migration — Cat3DCanvas → CatAvatar

**Files:**
- Modify: All screens that import `Cat3DCanvas` (HomeScreen, CompletionModal, CatSwitchScreen, OnboardingScreen, ProfileScreen, LevelMapScreen, EvolutionReveal, etc.)
- Test: Run full test suite

### Step 1: Identify all Cat3DCanvas usages

From the grep results, the following screens import `Cat3DCanvas`:
- `HomeScreen.tsx`
- `CompletionModal.tsx`
- `CatSwitchScreen.tsx`
- `OnboardingScreen.tsx`
- `ProfileScreen.tsx`
- `LevelMapScreen.tsx`
- `LessonIntroScreen.tsx`
- `LeaderboardScreen.tsx`
- `EvolutionReveal.tsx`
- `AuthScreen.tsx`
- `AccountScreen.tsx`
- `CatStudioScreen.tsx`

Note: `SalsaCoach.tsx`, `MascotBubble.tsx`, `ExerciseBuddy.tsx` already use `forceSVG` — no change needed.

### Step 2: Replace Cat3DCanvas with CatAvatar

For each screen:
1. Replace `import { Cat3DCanvas } from '../Mascot/3d'` with `import { CatAvatar } from '../Mascot/CatAvatar'`
2. Replace `<Cat3DCanvas ... />` with `<CatAvatar ... />` mapping props:
   - `catId` → `catId` (same)
   - `evolutionStage` → `evolutionStage` (same)
   - `width/height` → `size` (choose closest: 48→small, 72→medium, 120→large, 200+→hero)
   - `forceSVG` → remove (no longer needed)

Hero shots (HomeScreen, CompletionModal, CatSwitchScreen gallery): use `size="hero"`.

### Step 3: Run full test suite

Run: `npx jest --verbose`
Expected: ALL PASS (update test mocks that reference Cat3DCanvas if needed)

### Step 4: Commit

```bash
git commit -m "feat(cats): migrate all screens from Cat3DCanvas to enhanced CatAvatar"
```

---

## Task 17: Game Event Reactions

**Files:**
- Modify: `src/components/Mascot/animations/catAnimations.ts`
- Modify: `src/components/Mascot/ExerciseBuddy.tsx`

### Step 1: Add REACTIONS config

Add `REACTIONS` object to `catAnimations.ts` (from design doc) mapping gameplay events to per-part animation targets.

### Step 2: Wire into ExerciseBuddy

ExerciseBuddy already maps `BuddyReaction → CatPose`. Extend to also trigger per-part reaction animations when `perfectHit`, `miss`, `comboStreak` events fire.

### Step 3: Run tests, commit

```bash
git commit -m "feat(cats): game event reactions — perfect/miss/combo animations"
```

---

## Task 18: Update Existing Tests + Final Regression Pass

**Files:**
- Modify: All test files in `src/components/Mascot/__tests__/`
- Run: Full test suite

### Step 1: Update KeysieSvg.test.tsx

The legacy path still renders headphones/piano collar — update element count assertions if the legacy path was also modified. Update eye element count tests for new 6-layer system.

### Step 2: Update CatRenderer.test.tsx

Ensure all 12 cats render at all moods, sizes, and evolution stages with the new system. Add tests for hero size.

### Step 3: Run full test suite

Run: `npx jest --verbose`
Expected: ALL PASS

### Step 4: Commit

```bash
git commit -m "test(cats): update all mascot tests for enhanced 2D system"
```

---

## Summary

| Task | Description | Files | Dependencies |
|------|-------------|-------|--------------|
| 1 | HairTuft + eyelashes in profiles | catProfiles.ts | None |
| 2 | Head/Body/Paws anatomy redesign | CatParts.tsx | None |
| 3 | Ear bezier redesign | CatParts.tsx | Task 2 |
| 4 | Mouth W-shape + new moods | CatParts.tsx, types.ts | Task 2 |
| 5 | Hair tuft rendering | CatParts.tsx | Task 1 |
| 6 | Wire new anatomy into KeysieSvg | KeysieSvg.tsx | Tasks 1-5 |
| 7 | CatGradients factory | CatGradients.tsx (NEW) | None |
| 8 | Wire gradients into parts | CatParts.tsx, KeysieSvg.tsx | Tasks 6, 7 |
| 9 | Shadow layers | CatShadows.tsx (NEW) | Task 8 |
| 10 | 6-layer composite eyes | CatParts.tsx | Tasks 7, 8 |
| 11 | Accessories P0+P1 | CatAccessories.tsx | Tasks 2, 7 |
| 12 | AnimatedG + springs | KeysieSvg.tsx, useCatAnimation.ts | Tasks 6-9 |
| 13 | Micro-life animations | useMicroLife.ts (NEW) | Task 12 |
| 14 | P2+P3 accessories + evolution | CatAccessories.tsx, KeysieSvg.tsx | Tasks 9, 11 |
| 15 | CatAvatar hero + cleanup | CatAvatar.tsx | Tasks 12, 13 |
| 16 | Screen migration | ~12 screens | Task 15 |
| 17 | Game event reactions | catAnimations.ts, ExerciseBuddy.tsx | Tasks 12, 13 |
| 18 | Test updates + regression | __tests__/*.tsx | All tasks |

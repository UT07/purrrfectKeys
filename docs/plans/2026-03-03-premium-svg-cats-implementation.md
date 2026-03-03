# Premium SVG Cat Art Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all geometric-primitive SVG cat parts with hand-crafted bezier paths to achieve chibi anime collectible quality.

**Architecture:** Rewrite each CatPart component's SVG output one at a time within the existing composable architecture. The CatProfile system gains 3 new fields (pupilType, fang, hairTuftSize). The gradient system expands from 5 to 9 definitions. All changes are backward-compatible — the legacy rendering path is untouched.

**Tech Stack:** react-native-svg (Path, G, Circle, Ellipse, Line, Defs, RadialGradient, LinearGradient, Stop, ClipPath), TypeScript.

**Key files overview:**
- `src/components/Mascot/svg/CatParts.tsx` — All composable SVG part components (CatBody, CatHead, CatEars, CatEyes, CatMouth, CatNose, CatWhiskers, CatTail, CatBlush, CatPaws, CatHairTuft, CatHeadphones, CatPianoCollar)
- `src/components/Mascot/svg/catProfiles.ts` — Per-cat visual profile configs (CatProfile interface + CAT_PROFILES record)
- `src/components/Mascot/svg/CatGradients.tsx` — SVG gradient Defs factory (CatGradientDefs + gradId helper)
- `src/components/Mascot/svg/CatShadows.tsx` — Shadow/ambient occlusion layers
- `src/components/Mascot/KeysieSvg.tsx` — Composable renderer (renderComposable function, lines 134-211) + legacy renderer
- `src/components/Mascot/catColorPalette.ts` — Per-cat color definitions (CatColors interface)
- `src/components/Mascot/__tests__/CatRenderer.test.tsx` — Visual profile + rendering tests (129 suites, 2717 tests currently passing)

**Design doc:** `docs/plans/2026-03-03-premium-svg-cats-design.md`

**Test command:** `npx jest src/components/Mascot/__tests__/CatRenderer.test.tsx --no-coverage`

**Full suite command:** `npx jest --no-coverage`

---

### Task 1: Add new CatProfile fields (pupilType, fang, hairTuftSize)

**Files:**
- Modify: `src/components/Mascot/svg/catProfiles.ts`
- Test: `src/components/Mascot/__tests__/CatRenderer.test.tsx`

**Context:** The CatProfile interface needs 3 new fields. All 13 cat profiles (12 playable + salsa) must be updated. Tests must validate the new fields exist for every cat.

**Step 1: Add new fields to CatProfile interface and DEFAULT_PROFILE**

In `src/components/Mascot/svg/catProfiles.ts`:

Add `PupilType` and `HairTuftSize` type exports:
```typescript
export type PupilType = 'round' | 'slit';
export type HairTuftSize = 'small' | 'medium' | 'large';
```

Add 3 fields to the `CatProfile` interface:
```typescript
pupilType: PupilType;
fang: boolean;
hairTuftSize: HairTuftSize;
```

Update `DEFAULT_PROFILE` with defaults:
```typescript
pupilType: 'round',
fang: false,
hairTuftSize: 'small',
```

**Step 2: Set per-cat values for all 13 profiles**

Use this mapping (personality-driven):

| Cat | pupilType | fang | hairTuftSize |
|-----|-----------|------|--------------|
| mini-meowww | round | false | small |
| jazzy | slit | true | medium |
| luna | slit | false | small |
| biscuit | round | false | medium |
| ballymakawww | round | true | medium |
| aria | round | false | medium |
| tempo | slit | true | small |
| shibu | slit | false | small |
| bella | round | false | medium |
| sable | slit | true | medium |
| coda | round | false | medium |
| chonky-monke | round | false | large |
| salsa | round | false | small |

**Step 3: Add tests for new fields**

In `CatRenderer.test.tsx`, add to the `Cat Visual Profiles` describe block:

```typescript
it('every cat has a pupilType field', () => {
  for (const cat of CAT_CHARACTERS) {
    const profile = getCatProfile(cat.id);
    expect(['round', 'slit']).toContain(profile.pupilType);
  }
});

it('every cat has a fang boolean', () => {
  for (const cat of CAT_CHARACTERS) {
    const profile = getCatProfile(cat.id);
    expect(typeof profile.fang).toBe('boolean');
  }
});

it('every cat has a hairTuftSize field', () => {
  for (const cat of CAT_CHARACTERS) {
    const profile = getCatProfile(cat.id);
    expect(['small', 'medium', 'large']).toContain(profile.hairTuftSize);
  }
});

it('Jazzy has slit pupils and a fang', () => {
  const profile = getCatProfile('jazzy');
  expect(profile.pupilType).toBe('slit');
  expect(profile.fang).toBe(true);
});

it('Chonky Monke has large hair tuft', () => {
  const profile = getCatProfile('chonky-monke');
  expect(profile.hairTuftSize).toBe('large');
});
```

**Step 4: Run tests**

Run: `npx jest src/components/Mascot/__tests__/CatRenderer.test.tsx --no-coverage`
Expected: ALL PASS

**Step 5: Run full suite**

Run: `npx jest --no-coverage`
Expected: 129+ suites, 2717+ tests, 0 failures

**Step 6: Commit**

```bash
git add src/components/Mascot/svg/catProfiles.ts src/components/Mascot/__tests__/CatRenderer.test.tsx
git commit -m "feat(cats): add pupilType, fang, hairTuftSize to CatProfile"
```

---

### Task 2: Rewrite CatHead — organic chibi skull shape

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx` (CatHead function, lines ~53-74)
- Modify: `src/components/Mascot/KeysieSvg.tsx` (ClipPath in renderComposable, lines ~176-184)

**Context:** Replace `Circle cx=50 cy=35 r=32` with an organic chibi head shape using cubic bezier paths. The head should be wider at the cheeks, slightly flattened on top, with a tapered chin. Cheek fluff becomes a contour variation (wider bumpy cheeks) instead of separate overlapping circles.

**Step 1: Rewrite CatHead component**

Replace the CatHead function body in `CatParts.tsx`. The new head shape uses `Path` with cubic bezier (`C`) commands in the same ~(50,35) center, ~32 radius coordinate space so ears/eyes/nose/mouth positions remain valid.

```typescript
export function CatHead({
  color,
  cheekFluff = false,
  gradientFill,
}: {
  color: string;
  cheekFluff?: boolean;
  gradientFill?: string;
}): ReactElement {
  const fill = gradientFill ?? color;

  // Organic chibi head — wider at cheeks, flattened forehead, tapered chin.
  // Approximate bounding box: x=18..82, y=3..62 (center ~50,35, ~same as old r=32 circle).
  // Without cheek fluff: smooth rounded shape
  // With cheek fluff: wider bumpy cheeks (extends to x=14..86)
  const headPath = cheekFluff
    ? // Cheek-fluff variant: pronounced round cheeks bulging outward
      'M 50 3 C 68 3 82 10 82 25 C 82 30 84 34 86 38 C 86 44 82 46 78 44 C 76 50 68 58 58 60 C 54 61 46 61 42 60 C 32 58 24 50 22 44 C 18 46 14 44 14 38 C 16 34 18 30 18 25 C 18 10 32 3 50 3 Z'
    : // Standard: clean rounded chibi skull
      'M 50 3 C 70 3 82 14 82 30 C 82 46 70 60 58 62 C 54 63 46 63 42 62 C 30 60 18 46 18 30 C 18 14 30 3 50 3 Z';

  return (
    <G>
      <Path d={headPath} fill={fill} />
    </G>
  );
}
```

**Step 2: Update ClipPath in KeysieSvg renderComposable**

In `KeysieSvg.tsx`, the ClipPath at lines 176-184 uses `Circle cx=50 cy=35 r=32` for the head shape. Replace with a matching organic path:

```typescript
<Defs>
  <ClipPath id={`bodyClip-${catId}`}>
    <Path d="M 50 3 C 70 3 82 14 82 30 C 82 46 70 60 58 62 C 54 63 46 63 42 62 C 30 60 18 46 18 30 C 18 14 30 3 50 3 Z" />
    <Path d={bodyClipPath} />
  </ClipPath>
</Defs>
```

Where `bodyClipPath` is derived from the body type (see Task 3). For now, keep the existing `Ellipse cx=50 cy=80 rx=18 ry=14` as a `Path` equivalent:

```typescript
<Defs>
  <ClipPath id={`bodyClip-${catId}`}>
    <Path d="M 50 3 C 70 3 82 14 82 30 C 82 46 70 60 58 62 C 54 63 46 63 42 62 C 30 60 18 46 18 30 C 18 14 30 3 50 3 Z" />
    <Ellipse cx="50" cy="80" rx="18" ry="14" />
  </ClipPath>
</Defs>
```

**Step 3: Run tests**

Run: `npx jest src/components/Mascot/__tests__/CatRenderer.test.tsx --no-coverage`
Expected: ALL PASS (tests verify rendering doesn't crash, not pixel-perfect output)

**Step 4: Run full suite**

Run: `npx jest --no-coverage`
Expected: 0 failures

**Step 5: Commit**

```bash
git add src/components/Mascot/svg/CatParts.tsx src/components/Mascot/KeysieSvg.tsx
git commit -m "feat(cats): organic chibi head shape with bezier paths"
```

---

### Task 3: Rewrite CatBody — bean/pear shapes + belly patch + chest tuft

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx` (CatBody function, lines ~32-47)

**Context:** Replace the `Ellipse` per body type with organic bean/pear shapes using bezier paths. Add a belly patch (lighter inner path) and a chest tuft (fur wisps at head-body junction). The body center stays at ~(50,80) so paws at cy=92 remain aligned.

**Step 1: Rewrite CatBody with 4 distinct organic shapes + belly patch + chest tuft**

Add a new `bellyColor` prop (passed through from KeysieSvg) and add the chest tuft as a small component.

```typescript
export function CatBody({ type, color, gradientFill, bellyColor }: {
  type: BodyType; color: string; gradientFill?: string; bellyColor?: string;
}): ReactElement {
  const fill = gradientFill ?? color;
  const belly = bellyColor ?? color;

  // Each body type is a unique organic bean/pear path centered at ~(50,80).
  // All paths keep the bottom around y=90 so paws at cy=92 align.
  let bodyPath: string;
  let bellyPath: string;

  switch (type) {
    case 'slim':
      // Tall narrow teardrop with visible waist
      bodyPath = 'M 50 66 C 58 66 61 72 61 78 C 61 84 57 90 50 90 C 43 90 39 84 39 78 C 39 72 42 66 50 66 Z';
      bellyPath = 'M 50 72 C 55 72 57 76 57 80 C 57 84 55 87 50 87 C 45 87 43 84 43 80 C 43 76 45 72 50 72 Z';
      break;
    case 'round':
      // Near-circular with chest bump
      bodyPath = 'M 50 65 C 62 65 68 72 68 80 C 68 87 60 92 50 92 C 40 92 32 87 32 80 C 32 72 38 65 50 65 Z';
      bellyPath = 'M 50 71 C 58 71 62 76 62 81 C 62 86 57 89 50 89 C 43 89 38 86 38 81 C 38 76 42 71 50 71 Z';
      break;
    case 'chonky':
      // Wide bell with pronounced belly overhang, side rolls
      bodyPath = 'M 50 64 C 66 64 74 72 74 80 C 74 88 64 94 50 94 C 36 94 26 88 26 80 C 26 72 34 64 50 64 Z';
      bellyPath = 'M 50 70 C 62 70 67 76 67 82 C 67 88 60 91 50 91 C 40 91 33 88 33 82 C 33 76 38 70 50 70 Z';
      break;
    case 'standard':
    default:
      // Soft pear shape
      bodyPath = 'M 50 66 C 60 66 66 72 66 79 C 66 86 58 91 50 91 C 42 91 34 86 34 79 C 34 72 40 66 50 66 Z';
      bellyPath = 'M 50 72 C 57 72 61 76 61 81 C 61 86 56 88 50 88 C 44 88 39 86 39 81 C 39 76 43 72 50 72 Z';
      break;
  }

  return (
    <G>
      <Path d={bodyPath} fill={fill} />
      {/* Belly patch — lighter inner contour */}
      <Path d={bellyPath} fill={belly} opacity={0.5} />
    </G>
  );
}

/** Chest fur tuft — small fur wisps at head-body junction */
export function CatChestTuft({ color }: { color: string }): ReactElement {
  const dark = darkenColor(color, 0.8);
  return (
    <G>
      <Path d="M 44 63 Q 46 60 48 63" fill={color} stroke={dark} strokeWidth="0.3" />
      <Path d="M 48 62 Q 50 59 52 62" fill={color} stroke={dark} strokeWidth="0.3" />
      <Path d="M 52 63 Q 54 60 56 63" fill={color} stroke={dark} strokeWidth="0.3" />
    </G>
  );
}
```

**Step 2: Update KeysieSvg renderComposable to pass bellyColor and add CatChestTuft**

In `KeysieSvg.tsx` `renderComposable` function:

1. Import `CatChestTuft` from `./svg/CatParts`
2. Pass `bellyColor` to CatBody: `<CatBody type={profile.body} color={bodyColor} gradientFill={gradId(catId, 'body')} bellyColor={bellyColor} />`
3. Add `<CatChestTuft color={bodyColor} />` between CatBody and CatPaws in the render order

**Step 3: Run tests**

Run: `npx jest src/components/Mascot/__tests__/CatRenderer.test.tsx --no-coverage`
Expected: ALL PASS

**Step 4: Run full suite**

Run: `npx jest --no-coverage`
Expected: 0 failures

**Step 5: Commit**

```bash
git add src/components/Mascot/svg/CatParts.tsx src/components/Mascot/KeysieSvg.tsx
git commit -m "feat(cats): organic body shapes with belly patch and chest tuft"
```

---

### Task 4: Rewrite CatEyes — 8-layer composite with pupilType support

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx` (CatEyes function, lines ~150-326)

**Context:** This is the most complex and highest-impact change. Replace the current eye rendering with an 8-layer composite system per eye. Add support for the new `pupilType` prop from CatProfile. The eye positions stay at the same cx=38/62, cy=34 coordinates.

**Step 1: Add pupilType prop to CatEyes and rewrite**

The CatEyes function signature gains `pupilType?: PupilType`. Import the type from `catProfiles.ts`.

Rewrite the shape-specific rendering (the switch at the bottom) and the mood-specific renderings with the 8-layer system. Each eye gets:

1. Eyelid outline (curved Path stroke, varies per shape)
2. Sclera (organic eye-shape Path, fill #FAFAFA, with lid shadow)
3. Iris outer ring (darker circle around iris)
4. Iris body (gradient fill)
5. Pupil (round Circle or slit Ellipse based on pupilType)
6. Iris detail lines (4-6 radial strokes at low opacity)
7. Primary catch light (large oval, upper-left)
8. Secondary catch light (small circle, lower-right)

Create a helper function `renderEye` that takes position (cx, cy), shape params, and pupilType to avoid duplicating the 8-layer stack for left vs right eye.

```typescript
import type { PupilType } from './catProfiles';

/** Render a single 8-layer composite eye */
function renderPremiumEye(
  cx: number, cy: number,
  shape: EyeShape, eyeColor: string,
  irisGradient: string | undefined,
  pupilType: PupilType,
  pupilScale: number,
  lookDown: number,
): ReactElement {
  const darkIris = darkenColor(eyeColor, 0.6);
  // Shape-dependent dimensions
  const isAlmond = shape === 'almond';
  const isBig = shape === 'big-sparkly';
  const scleraRx = isBig ? 8.5 : isAlmond ? 7 : 5.5;
  const scleraRy = isBig ? 8.5 : isAlmond ? 5.5 : 7;
  const irisR = isBig ? 5.5 : 3.5;
  const pupilR = isBig ? 2.2 : 1.4;
  // Catch light positions (offset from center toward upper-left)
  const hlX = cx - 2.5;
  const hlY = cy - 2.5;
  const hl2X = cx + 2.5;
  const hl2Y = cy + 2.5;

  return (
    <G>
      {/* 1. Eyelid outline */}
      <Ellipse cx={cx} cy={cy} rx={(scleraRx + 1) * pupilScale} ry={(scleraRy + 1) * pupilScale}
        fill="none" stroke="#1A1A1A" strokeWidth="0.6" />
      {/* 2. Sclera with lid shadow */}
      <Ellipse cx={cx} cy={cy} rx={scleraRx * pupilScale} ry={scleraRy * pupilScale} fill="#FAFAFA" />
      <Ellipse cx={cx} cy={cy - scleraRy * 0.3} rx={scleraRx * 0.8} ry={scleraRy * 0.3}
        fill="#D0D4E0" opacity={0.25} />
      {/* 3. Iris outer ring */}
      <Circle cx={cx} cy={cy + lookDown} r={(irisR + 0.8) * pupilScale} fill={darkIris} />
      {/* 4. Iris body */}
      <Circle cx={cx} cy={cy + lookDown} r={irisR * pupilScale} fill={irisGradient ?? eyeColor} />
      {/* 5. Pupil */}
      {pupilType === 'slit'
        ? <Ellipse cx={cx} cy={cy + lookDown} rx={pupilR * 0.4} ry={pupilR * 1.6} fill="#0A0A0A" />
        : <Circle cx={cx} cy={cy + lookDown} r={pupilR} fill="#0A0A0A" />
      }
      {/* 6. Iris detail lines — 4 radial strokes */}
      <Line x1={cx} y1={cy + lookDown - irisR * 0.4} x2={cx} y2={cy + lookDown - irisR * 0.9}
        stroke={eyeColor} strokeWidth="0.4" opacity={0.3} strokeLinecap="round" />
      <Line x1={cx + irisR * 0.4} y1={cy + lookDown} x2={cx + irisR * 0.9} y2={cy + lookDown}
        stroke={eyeColor} strokeWidth="0.4" opacity={0.3} strokeLinecap="round" />
      <Line x1={cx} y1={cy + lookDown + irisR * 0.4} x2={cx} y2={cy + lookDown + irisR * 0.9}
        stroke={eyeColor} strokeWidth="0.4" opacity={0.25} strokeLinecap="round" />
      <Line x1={cx - irisR * 0.4} y1={cy + lookDown} x2={cx - irisR * 0.9} y2={cy + lookDown}
        stroke={eyeColor} strokeWidth="0.4" opacity={0.25} strokeLinecap="round" />
      {/* 7. Primary catch light */}
      <Ellipse cx={hlX} cy={hlY} rx={1.8} ry={1.4} fill="#FFFFFF" opacity={0.9} />
      {/* 8. Secondary catch light */}
      <Circle cx={hl2X} cy={hl2Y} r={0.9} fill="#FFFFFF" opacity={0.6} />
    </G>
  );
}
```

Keep all existing mood-specific renderings (happy arched eyes, love hearts, celebrating stars, etc.) but enhance them:
- `happy`: add eyelid curve above the arched smile line
- `celebrating`: add 4 small diamond sparkle paths around each star
- `love`: add subtle gradient inside hearts
- `confused`: use actual spiral path
- `sleepy`: heavy drooping upper eyelid path covering 60%
- `smug`: asymmetric — one eye more closed than the other

For the default (encouraging/excited/teaching) moods, call `renderPremiumEye` for both left (cx=38) and right (cx=62) eyes.

Also update the curved eyelashes renderer to use actual bezier curves instead of straight lines:

```typescript
function renderCurvedEyelashes(leftCx: number, rightCx: number, topY: number): ReactElement {
  return (
    <G>
      {/* Left eye — 3 curved lashes on outer corner */}
      <Path d={`M ${leftCx + 4} ${topY} Q ${leftCx + 6} ${topY - 3} ${leftCx + 5} ${topY - 4}`}
        stroke="#1A1A1A" strokeWidth="0.7" fill="none" strokeLinecap="round" />
      <Path d={`M ${leftCx + 5} ${topY + 1} Q ${leftCx + 8} ${topY - 1} ${leftCx + 7} ${topY - 3}`}
        stroke="#1A1A1A" strokeWidth="0.6" fill="none" strokeLinecap="round" />
      <Path d={`M ${leftCx + 6} ${topY + 2} Q ${leftCx + 9} ${topY} ${leftCx + 8} ${topY - 1}`}
        stroke="#1A1A1A" strokeWidth="0.5" fill="none" strokeLinecap="round" />
      {/* Right eye — mirrored */}
      <Path d={`M ${rightCx - 4} ${topY} Q ${rightCx - 6} ${topY - 3} ${rightCx - 5} ${topY - 4}`}
        stroke="#1A1A1A" strokeWidth="0.7" fill="none" strokeLinecap="round" />
      <Path d={`M ${rightCx - 5} ${topY + 1} Q ${rightCx - 8} ${topY - 1} ${rightCx - 7} ${topY - 3}`}
        stroke="#1A1A1A" strokeWidth="0.6" fill="none" strokeLinecap="round" />
      <Path d={`M ${rightCx - 6} ${topY + 2} Q ${rightCx - 9} ${topY} ${rightCx - 8} ${topY - 1}`}
        stroke="#1A1A1A" strokeWidth="0.5" fill="none" strokeLinecap="round" />
    </G>
  );
}
```

**Step 2: Pass pupilType through from KeysieSvg**

In `KeysieSvg.tsx`, update the CatEyes call in `renderComposable`:
```typescript
<CatEyes shape={profile.eyes} mood={mood} eyeColor={eyeColor} catId={catId}
  eyelashes={profile.eyelashes} pupilType={profile.pupilType} />
```

**Step 3: Run tests**

Run: `npx jest src/components/Mascot/__tests__/CatRenderer.test.tsx --no-coverage`
Expected: ALL PASS (rendering tests don't check pixel-level output, just crash-free rendering at all moods)

**Step 4: Run full suite**

Run: `npx jest --no-coverage`
Expected: 0 failures

**Step 5: Commit**

```bash
git add src/components/Mascot/svg/CatParts.tsx src/components/Mascot/KeysieSvg.tsx
git commit -m "feat(cats): 8-layer composite eyes with pupil types and curved lashes"
```

---

### Task 5: Rewrite CatEars — double contour + inner fur detail

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx` (CatEars function, lines ~82-129)

**Context:** Upgrade each ear type with a double contour (outer stroke), inner fur tufts (wispy beziers), and gradient inner color. Ear positions remain anchored to the head shape.

**Step 1: Rewrite CatEars**

Each ear type gets:
- Outer shape path with `stroke` (thin outline for "drawn" feel)
- Inner ear fill path with gradient reference
- 3-4 inner fur tuft strokes (thin beziers radiating from base)

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
  const innerDark = darkenColor(innerColor, 0.7);

  switch (type) {
    case 'rounded':
      return (
        <G>
          {/* Left ear — Scottish Fold-style rounded */}
          <Path d="M 24 22 Q 16 2 36 16" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          <Path d="M 26 19 Q 21 8 34 15" fill={innerColor} />
          {/* Fold line */}
          <Path d="M 24 16 Q 27 12 32 14" fill="none" stroke={innerDark} strokeWidth="0.5" opacity={0.5} />
          {/* Inner fur tufts */}
          <Path d="M 28 18 Q 26 15 29 14" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.3} />
          <Path d="M 30 17 Q 28 13 31 13" fill="none" stroke={innerDark} strokeWidth="0.3" opacity={0.3} />
          <Path d="M 26 20 Q 24 17 27 16" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.25} />
          {/* Right ear */}
          <Path d="M 76 22 Q 84 2 64 16" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          <Path d="M 74 19 Q 79 8 66 15" fill={innerColor} />
          <Path d="M 76 16 Q 73 12 68 14" fill="none" stroke={innerDark} strokeWidth="0.5" opacity={0.5} />
          <Path d="M 72 18 Q 74 15 71 14" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.3} />
          <Path d="M 70 17 Q 72 13 69 13" fill="none" stroke={innerDark} strokeWidth="0.3" opacity={0.3} />
          <Path d="M 74 20 Q 76 17 73 16" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.25} />
        </G>
      );
    case 'folded':
      return (
        <G>
          {/* Left ear — dramatically folded forward with overlap shadow */}
          <Path d="M 24 20 Q 18 4 36 14" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          <Path d="M 26 17 Q 22 8 34 13" fill={innerColor} />
          {/* Fold overlap */}
          <Path d="M 23 13 Q 22 10 30 12" fill={bodyColor} stroke={bodyColor} strokeWidth="1" />
          {/* Fold shadow */}
          <Path d="M 24 14 Q 25 11 31 13" fill="#000000" opacity={0.08} />
          {/* Inner fur */}
          <Path d="M 28 16 Q 26 14 29 13" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.3} />
          <Path d="M 30 15 Q 28 12 31 12" fill="none" stroke={innerDark} strokeWidth="0.3" opacity={0.25} />
          {/* Right ear */}
          <Path d="M 76 20 Q 82 4 64 14" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          <Path d="M 74 17 Q 78 8 66 13" fill={innerColor} />
          <Path d="M 77 13 Q 78 10 70 12" fill={bodyColor} stroke={bodyColor} strokeWidth="1" />
          <Path d="M 76 14 Q 75 11 69 13" fill="#000000" opacity={0.08} />
          <Path d="M 72 16 Q 74 14 71 13" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.3} />
          <Path d="M 70 15 Q 72 12 69 12" fill="none" stroke={innerDark} strokeWidth="0.3" opacity={0.25} />
        </G>
      );
    case 'pointed':
    default:
      return (
        <G>
          {/* Left ear — sharp pointed with backward curve at tip */}
          <Path d="M 24 20 Q 20 -2 38 14" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          <Path d="M 26 17 Q 23 4 36 13" fill={innerColor} />
          {/* Inner fur tufts */}
          <Path d="M 29 16 Q 27 12 30 11" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.3} />
          <Path d="M 31 14 Q 28 10 32 9" fill="none" stroke={innerDark} strokeWidth="0.3" opacity={0.3} />
          <Path d="M 27 18 Q 25 15 28 14" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.25} />
          {/* Right ear */}
          <Path d="M 76 20 Q 80 -2 62 14" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          <Path d="M 74 17 Q 77 4 64 13" fill={innerColor} />
          <Path d="M 71 16 Q 73 12 70 11" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.3} />
          <Path d="M 69 14 Q 72 10 68 9" fill="none" stroke={innerDark} strokeWidth="0.3" opacity={0.3} />
          <Path d="M 73 18 Q 75 15 72 14" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.25} />
        </G>
      );
  }
}
```

**Step 2: Run tests**

Run: `npx jest src/components/Mascot/__tests__/CatRenderer.test.tsx --no-coverage`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/components/Mascot/svg/CatParts.tsx
git commit -m "feat(cats): premium ears with double contour and inner fur tufts"
```

---

### Task 6: Rewrite CatNose + CatMouth + CatWhiskers

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx` (CatNose ~388-390, CatMouth ~332-369, CatWhiskers ~396-407)

**Context:** Three smaller components upgraded together. Nose becomes an inverted triangle with shine. Mouth gets lip line and fang support. Whiskers become curved and tapered.

**Step 1: Rewrite CatNose — inverted triangle with shine**

```typescript
export function CatNose({ color }: { color: string }): ReactElement {
  return (
    <G>
      {/* Inverted rounded triangle — iconic anime cat nose */}
      <Path d="M 50 41 L 48 44 Q 50 45.5 52 44 Z" fill={color} />
      {/* Nose shine — small highlight upper-left */}
      <Circle cx="49.2" cy="42" r="0.7" fill="#FFFFFF" opacity={0.5} />
    </G>
  );
}
```

**Step 2: Rewrite CatMouth with lip line + fang support**

Add a `fang` prop:

```typescript
export function CatMouth({ mood, darkAccent, fang = false }: {
  mood: MascotMood; darkAccent: string; fang?: boolean;
}): ReactElement {
  // Upper lip line (Y-shape from nose) — always rendered
  const lipLine = (
    <Path d="M 50 44.5 L 50 47 M 50 47 Q 46 50 43 49 M 50 47 Q 54 50 57 49"
      stroke="#FFFFFF" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity={0.6} />
  );

  // Single fang — small triangle on left side
  const fangEl = fang ? (
    <Path d="M 46 49 L 45.5 52 L 47 49.5" fill="#FFFFFF" opacity={0.85} />
  ) : null;

  switch (mood) {
    case 'happy':
    case 'love':
      return (
        <G>
          {lipLine}
          <Path d="M 43 49 Q 46.5 53 50 49 Q 53.5 53 57 49"
            stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {fangEl}
        </G>
      );
    case 'encouraging':
    case 'smug':
      return (
        <G>
          {lipLine}
          <Path d="M 44 49 Q 50 53 56 49" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {fangEl}
        </G>
      );
    case 'excited':
      return (
        <G>
          {lipLine}
          {/* Open mouth with tongue */}
          <Ellipse cx="50" cy="50" rx="5" ry="4" fill={darkAccent} />
          <Ellipse cx="50" cy="52" rx="3" ry="2" fill="#FF8FAA" opacity={0.7} />
          {fang && <Path d="M 46 48 L 45 51 L 47 48.5" fill="#FFFFFF" opacity={0.85} />}
          {fang && <Path d="M 54 48 L 55 51 L 53 48.5" fill="#FFFFFF" opacity={0.85} />}
        </G>
      );
    case 'teaching':
    case 'confused':
      return (
        <G>
          {lipLine}
          <Line x1="44" y1="50" x2="56" y2="50" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          {fangEl}
        </G>
      );
    case 'celebrating':
      return (
        <G>
          {lipLine}
          {/* Wide grin with both fangs */}
          <Path d="M 42 48 Q 50 58 58 48" stroke="#FFFFFF" strokeWidth="1.5" fill={darkAccent} strokeLinecap="round" />
          <Path d="M 45 48.5 L 44.5 51.5 L 46 49" fill="#FFFFFF" opacity={0.85} />
          <Path d="M 55 48.5 L 55.5 51.5 L 54 49" fill="#FFFFFF" opacity={0.85} />
        </G>
      );
    case 'sleepy':
    default:
      return (
        <G>
          {lipLine}
          <Path d="M 44 49 Q 50 52 56 49" stroke="#FFFFFF" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </G>
      );
  }
}
```

**Step 3: Rewrite CatWhiskers — curved tapered beziers with follicle dots**

```typescript
export function CatWhiskers({ color }: { color: string }): ReactElement {
  return (
    <G>
      {/* Left whiskers — curved, tapered (filled path shapes for width variation) */}
      {/* Top */}
      <Path d="M 30 39 Q 22 37 13 38" stroke={color} strokeWidth="0.8" fill="none" strokeLinecap="round" />
      {/* Middle (longest) */}
      <Path d="M 30 42 Q 20 41 10 42" stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round" />
      {/* Bottom */}
      <Path d="M 30 44 Q 22 45 14 47" stroke={color} strokeWidth="0.7" fill="none" strokeLinecap="round" />
      {/* Follicle dots */}
      <Circle cx="30" cy="39" r="0.5" fill={color} opacity={0.4} />
      <Circle cx="30" cy="42" r="0.6" fill={color} opacity={0.4} />
      <Circle cx="30" cy="44" r="0.5" fill={color} opacity={0.4} />

      {/* Right whiskers — mirrored */}
      <Path d="M 70 39 Q 78 37 87 38" stroke={color} strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <Path d="M 70 42 Q 80 41 90 42" stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <Path d="M 70 44 Q 78 45 86 47" stroke={color} strokeWidth="0.7" fill="none" strokeLinecap="round" />
      <Circle cx="70" cy="39" r="0.5" fill={color} opacity={0.4} />
      <Circle cx="70" cy="42" r="0.6" fill={color} opacity={0.4} />
      <Circle cx="70" cy="44" r="0.5" fill={color} opacity={0.4} />
    </G>
  );
}
```

**Step 4: Pass fang prop through from KeysieSvg**

In `KeysieSvg.tsx` `renderComposable`, update the CatMouth call:
```typescript
<CatMouth mood={mood} darkAccent={accentDark} fang={profile.fang} />
```

**Step 5: Run tests**

Run: `npx jest src/components/Mascot/__tests__/CatRenderer.test.tsx --no-coverage`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/components/Mascot/svg/CatParts.tsx src/components/Mascot/KeysieSvg.tsx
git commit -m "feat(cats): premium nose, mouth with fangs, curved whiskers"
```

---

### Task 7: Rewrite CatPaws — toe beans + body-type scaling

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx` (CatPaws function, lines ~375-382)

**Context:** Replace featureless ellipses with rounded paw shapes containing visible toe beans (1 large pad + 2 smaller pads). Add body type prop so paw width scales appropriately. Add earInnerColor for toe bean tint.

**Step 1: Rewrite CatPaws**

```typescript
export function CatPaws({ color, bodyType = 'standard', beanColor }: {
  color: string; bodyType?: BodyType; beanColor?: string;
}): ReactElement {
  // Paw width scales per body type
  const pawW = bodyType === 'chonky' ? 7 : bodyType === 'round' ? 6 : bodyType === 'slim' ? 4 : 5;
  const beanFill = beanColor ?? '#FFB0C0';

  // Left paw center
  const lx = bodyType === 'chonky' ? 40 : 42;
  // Right paw center
  const rx = bodyType === 'chonky' ? 60 : 58;
  const py = 92;

  return (
    <G>
      {/* Left paw */}
      <Ellipse cx={lx} cy={py} rx={pawW} ry={3} fill={color} />
      {/* Toe beans — 1 large pad + 2 small */}
      <Ellipse cx={lx} cy={py + 0.5} rx={2.5} ry={1.5} fill={beanFill} opacity={0.35} />
      <Circle cx={lx - 2} cy={py - 1} r={1} fill={beanFill} opacity={0.3} />
      <Circle cx={lx + 2} cy={py - 1} r={1} fill={beanFill} opacity={0.3} />

      {/* Right paw */}
      <Ellipse cx={rx} cy={py} rx={pawW} ry={3} fill={color} />
      <Ellipse cx={rx} cy={py + 0.5} rx={2.5} ry={1.5} fill={beanFill} opacity={0.35} />
      <Circle cx={rx - 2} cy={py - 1} r={1} fill={beanFill} opacity={0.3} />
      <Circle cx={rx + 2} cy={py - 1} r={1} fill={beanFill} opacity={0.3} />
    </G>
  );
}
```

**Step 2: Pass bodyType and beanColor through from KeysieSvg**

In `KeysieSvg.tsx` `renderComposable`:
```typescript
<CatPaws color={bodyColor} bodyType={profile.body} beanColor={earInnerColor + '80'} />
```

**Step 3: Run tests and commit**

Run: `npx jest --no-coverage` — Expected: 0 failures

```bash
git add src/components/Mascot/svg/CatParts.tsx src/components/Mascot/KeysieSvg.tsx
git commit -m "feat(cats): paws with toe beans and body-type scaling"
```

---

### Task 8: Rewrite CatTail — tapered filled paths with tip detail

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx` (CatTail function, lines ~415-449)

**Context:** Replace single-stroke tails with tapered filled Path shapes (thick at body, thin at tip). Add tip detail variations and fur direction strokes.

**Step 1: Rewrite CatTail**

```typescript
export function CatTail({
  type,
  bodyColor,
  accentColor,
}: {
  type: TailType;
  bodyColor: string;
  accentColor: string;
}): ReactElement {
  const furStroke = darkenColor(bodyColor, 0.8);

  switch (type) {
    case 'straight':
      return (
        <G>
          {/* Tapered filled shape — thick base, thin tip with upward hook */}
          <Path d="M 66 82 Q 72 78 78 70 Q 82 64 84 58 L 85 56 Q 86 54 84 54 L 83 55 Q 80 62 76 68 Q 70 76 64 80 Z"
            fill={bodyColor} />
          {/* Fur direction strokes */}
          <Path d="M 70 76 Q 74 72 77 66" stroke={furStroke} strokeWidth="0.4" fill="none" opacity={0.2} />
          <Path d="M 68 78 Q 72 74 75 69" stroke={furStroke} strokeWidth="0.3" fill="none" opacity={0.15} />
          {/* Pointed tip accent */}
          <Path d="M 84 56 Q 86 52 84 54" fill={accentColor} />
          <Circle cx="84.5" cy="54" r="2.5" fill={accentColor} />
        </G>
      );
    case 'fluffy':
      return (
        <G>
          {/* Wide bushy shape with scalloped edge */}
          <Path d="M 66 82 Q 72 76 78 68 Q 82 62 86 58 Q 90 54 88 50 Q 86 48 82 50 Q 80 52 84 56 Q 82 62 76 68 Q 70 74 64 80 Z"
            fill={bodyColor} />
          {/* Scalloped fluff bumps along outer edge */}
          <Path d="M 86 58 Q 90 56 88 53" fill={bodyColor} stroke={bodyColor} strokeWidth="1.5" />
          <Path d="M 84 54 Q 88 51 86 48" fill={bodyColor} stroke={bodyColor} strokeWidth="1.5" />
          {/* Fur strokes */}
          <Path d="M 72 74 Q 76 70 80 64" stroke={furStroke} strokeWidth="0.4" fill="none" opacity={0.2} />
          <Path d="M 70 76 Q 74 72 78 66" stroke={furStroke} strokeWidth="0.3" fill="none" opacity={0.15} />
          {/* Fluffy tip */}
          <Circle cx="87" cy="50" r="4" fill={bodyColor} />
          <Circle cx="87" cy="50" r="3" fill={accentColor} opacity={0.25} />
        </G>
      );
    case 'curled':
    default:
      return (
        <G>
          {/* Tapered curl — thick base flowing into spiral tip */}
          <Path d="M 66 82 Q 74 76 82 68 Q 88 60 90 54 Q 91 50 88 48 Q 85 46 84 50 Q 83 54 86 52 Q 84 56 80 62 Q 74 72 64 80 Z"
            fill={bodyColor} />
          {/* Fur direction strokes */}
          <Path d="M 72 74 Q 78 68 82 60" stroke={furStroke} strokeWidth="0.4" fill="none" opacity={0.2} />
          {/* Spiral tip accent tuft */}
          <Circle cx="87" cy="48" r="3.5" fill={accentColor} />
          <Circle cx="88.5" cy="47" r="1.5" fill={accentColor} opacity={0.6} />
          <Circle cx="85.5" cy="49" r="1.5" fill={accentColor} opacity={0.4} />
        </G>
      );
  }
}
```

**Step 2: Run tests and commit**

Run: `npx jest --no-coverage` — Expected: 0 failures

```bash
git add src/components/Mascot/svg/CatParts.tsx
git commit -m "feat(cats): tapered tails with fur strokes and tip detail"
```

---

### Task 9: Rewrite CatBlush — anime hash marks

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx` (CatBlush function, lines ~455-462)

**Context:** Replace transparent ellipses with anime-style diagonal hash-mark blush lines.

**Step 1: Rewrite CatBlush**

```typescript
export function CatBlush({ color = '#FF9999' }: { color?: string }): ReactElement {
  // Anime hash-mark blush — 3 short diagonal parallel lines per cheek
  return (
    <G opacity={0.3}>
      {/* Left cheek */}
      <Line x1="22" y1="40" x2="25" y2="43" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      <Line x1="24" y1="39" x2="27" y2="42" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      <Line x1="26" y1="38" x2="29" y2="41" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      {/* Right cheek */}
      <Line x1="71" y1="38" x2="74" y2="41" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      <Line x1="73" y1="39" x2="76" y2="42" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      <Line x1="75" y1="40" x2="78" y2="43" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
    </G>
  );
}
```

**Step 2: Run tests and commit**

Run: `npx jest --no-coverage` — Expected: 0 failures

```bash
git add src/components/Mascot/svg/CatParts.tsx
git commit -m "feat(cats): anime hash-mark blush"
```

---

### Task 10: Rewrite CatHairTuft — richer paths + size scaling + shadows

**Files:**
- Modify: `src/components/Mascot/svg/CatParts.tsx` (CatHairTuft function, lines ~501-549)

**Context:** Each tuft type gets 2-3x more path detail. Add `hairTuftSize` scaling and a shadow layer behind each tuft.

**Step 1: Rewrite CatHairTuft with size scaling and shadow**

Add `size` prop from CatProfile's `hairTuftSize`. Scale factor: small=1.0, medium=1.3, large=1.6. Apply via SVG `transform` on the tuft `G` element.

```typescript
export function CatHairTuft({ type, color, size = 'small' }: {
  type: HairTuftType; color: string; size?: 'small' | 'medium' | 'large';
}): ReactElement | null {
  if (type === 'none') return null;

  const darkColor = darkenColor(color, 0.7);
  const scale = size === 'large' ? 1.6 : size === 'medium' ? 1.3 : 1.0;
  // Scale from center of tuft area (50, 4)
  const transform = scale !== 1.0
    ? `translate(${50 - 50 * scale}, ${4 - 4 * scale}) scale(${scale})`
    : undefined;

  let tuft: ReactElement;

  switch (type) {
    case 'curly':
      tuft = (
        <G>
          {/* Shadow */}
          <Path d="M 47 7 Q 45 3 49 4 Q 51 1 53 5 Q 55 3 53 7" fill="#000000" opacity={0.05} />
          {/* Actual spiral curls */}
          <Path d="M 47 6 Q 45 2 49 3 Q 51 0 53 4 Q 55 2 53 6"
            fill={color} stroke={darkColor} strokeWidth="0.5" />
          <Path d="M 48 5 Q 47 3 50 3.5" fill={color} stroke={darkColor} strokeWidth="0.3" />
        </G>
      );
      break;
    case 'fluffy':
      tuft = (
        <G>
          <Path d="M 46 6 Q 46 4 48 5 Q 48 2 50 4 Q 52 2 52 5 Q 54 4 54 6" fill="#000000" opacity={0.05} />
          {/* Cloud shape — 4-5 overlapping bumps */}
          <Circle cx="47" cy="5" r="2.5" fill={color} />
          <Circle cx="50" cy="3.5" r="2.8" fill={color} />
          <Circle cx="53" cy="5" r="2.5" fill={color} />
          <Circle cx="48.5" cy="4" r="2" fill={color} />
          <Circle cx="51.5" cy="4" r="2" fill={color} />
        </G>
      );
      break;
    case 'spiky':
      tuft = (
        <G>
          <Path d="M 47 7 L 46 2 L 49 6 L 50 0 L 51 6 L 54 2 L 53 7" fill="#000000" opacity={0.05} />
          {/* Sharp spikes with inner highlights */}
          <Path d="M 47 6 L 46 1 L 49 5" fill={color} />
          <Path d="M 49 5 L 50 -1 L 51 5" fill={color} />
          <Path d="M 51 5 L 54 1 L 53 6" fill={color} />
          {/* Inner highlight strokes */}
          <Path d="M 47.5 4 L 47 2" stroke={darkColor} strokeWidth="0.3" opacity={0.3} />
          <Path d="M 50 3 L 50 1" stroke={darkColor} strokeWidth="0.3" opacity={0.3} />
          <Path d="M 52.5 4 L 53 2" stroke={darkColor} strokeWidth="0.3" opacity={0.3} />
        </G>
      );
      break;
    case 'wave':
      tuft = (
        <G>
          <Path d="M 43 7 Q 46 3 50 6 Q 54 3 57 7" fill="#000000" opacity={0.05} />
          <Path d="M 43 6 Q 46 2 50 5 Q 54 2 57 6" fill={color} stroke={darkColor} strokeWidth="0.5" />
          <Path d="M 45 5 Q 48 3 50 4.5" fill="none" stroke={darkColor} strokeWidth="0.3" opacity={0.3} />
        </G>
      );
      break;
    case 'windswept':
      tuft = (
        <G>
          <Path d="M 45 7 Q 49 3 55 5 Q 57 4 59 6" fill="#000000" opacity={0.05} />
          <Path d="M 45 6 Q 49 2 55 4 Q 57 3 59 5" fill={color} stroke={darkColor} strokeWidth="0.5" />
          <Path d="M 47 5 Q 51 3 54 4" fill="none" stroke={darkColor} strokeWidth="0.3" opacity={0.3} />
        </G>
      );
      break;
    case 'slicked':
      tuft = (
        <G>
          <Path d="M 46 6 Q 50 1 54 6" fill="#000000" opacity={0.05} />
          <Path d="M 46 5 Q 50 0 54 5" fill={color} stroke={darkColor} strokeWidth="0.5" />
          <Path d="M 48 4 Q 50 2 52 4" fill="none" stroke={darkColor} strokeWidth="0.3" opacity={0.2} />
        </G>
      );
      break;
    case 'side-part':
      tuft = (
        <G>
          <Path d="M 43 7 Q 45 4 49 6 L 51 7" fill="#000000" opacity={0.05} />
          <Path d="M 43 6 Q 45 3 49 5 L 51 6" fill={color} stroke={darkColor} strokeWidth="0.5" />
        </G>
      );
      break;
    case 'silky':
      tuft = (
        <G>
          <Path d="M 44 8 Q 47 3 49 5 Q 51 3 54 8" fill="#000000" opacity={0.05} />
          <Path d="M 44 7 Q 47 2 49 4 Q 51 2 54 7" fill={color} stroke={darkColor} strokeWidth="0.3" />
          <Path d="M 46 5 Q 48 3 50 4" fill="none" stroke={darkColor} strokeWidth="0.2" opacity={0.2} />
        </G>
      );
      break;
    case 'sharp':
      tuft = (
        <G>
          <Path d="M 47 7 L 50 1 L 53 7" fill="#000000" opacity={0.05} />
          <Path d="M 47 6 L 50 0 L 53 6" fill={color} />
          <Path d="M 49 4 L 50 1.5" stroke={darkColor} strokeWidth="0.3" opacity={0.3} />
        </G>
      );
      break;
    case 'messy':
      tuft = (
        <G>
          <Path d="M 45 7 L 44 3 L 47 6 L 49 2 L 51 6 L 54 4 L 53 7 L 56 5 L 55 7" fill="#000000" opacity={0.05} />
          {/* Asymmetric strands going different directions */}
          <Path d="M 45 6 L 44 2 L 47 5" fill={color} />
          <Path d="M 48 5 L 49 1 L 51 5" fill={color} />
          <Path d="M 52 6 L 54 3 L 53 6" fill={color} />
          <Path d="M 54 6 L 56 4 L 55 6" fill={color} />
        </G>
      );
      break;
    case 'cowlick':
      tuft = (
        <G>
          <Path d="M 47 6 Q 49 0 53 5 Q 55 3 54 7" fill="#000000" opacity={0.05} />
          <Path d="M 47 5 Q 49 -1 53 4 Q 55 2 54 6" fill={color} stroke={darkColor} strokeWidth="0.5" />
          <Path d="M 49 3 Q 51 1 52 3.5" fill="none" stroke={darkColor} strokeWidth="0.3" opacity={0.3} />
        </G>
      );
      break;
    default:
      return null;
  }

  return transform ? <G transform={transform}>{tuft}</G> : tuft;
}
```

**Step 2: Pass hairTuftSize through from KeysieSvg**

In `KeysieSvg.tsx` `renderComposable`:
```typescript
<CatHairTuft type={profile.hairTuft} color={bodyColor} size={profile.hairTuftSize} />
```

**Step 3: Run tests and commit**

Run: `npx jest --no-coverage` — Expected: 0 failures

```bash
git add src/components/Mascot/svg/CatParts.tsx src/components/Mascot/KeysieSvg.tsx
git commit -m "feat(cats): richer hair tufts with shadows and size scaling"
```

---

### Task 11: Expand CatGradientDefs — 4 new gradients

**Files:**
- Modify: `src/components/Mascot/svg/CatGradients.tsx`

**Context:** Add 4 new gradient definitions: belly-patch, nose-shine, paw-pad, rim-light. Update the `gradId` helper to accept the new part names. Tune existing gradients for stronger contrast.

**Step 1: Add new gradients and tune existing ones**

Add a new `earInnerColor` prop to CatGradientDefs:

```typescript
interface CatGradientDefsProps {
  catId: string;
  bodyColor: string;
  eyeColor: string;
  bellyColor?: string;
  earInnerColor?: string;
}
```

Add inside the `<Defs>`:

```typescript
{/* Belly patch — soft lighter area */}
<RadialGradient id={`${catId}-belly`} cx="50%" cy="45%" r="50%">
  <Stop offset="0%" stopColor={lighten(bellyColor ?? bodyColor, 0.20)} />
  <Stop offset="100%" stopColor={bellyColor ?? lighten(bodyColor, 0.08)} />
</RadialGradient>

{/* Nose shine — tiny bright spot */}
<RadialGradient id={`${catId}-nose`} cx="35%" cy="30%" r="50%">
  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
</RadialGradient>

{/* Paw pad — warm pink-ish */}
<RadialGradient id={`${catId}-paw`} cx="50%" cy="40%" r="60%">
  <Stop offset="0%" stopColor={lighten(earInnerColor ?? '#FFB0C0', 0.3)} />
  <Stop offset="100%" stopColor={earInnerColor ?? '#FFB0C0'} />
</RadialGradient>

{/* Rim light — bright edge on right side */}
<LinearGradient id={`${catId}-rim`} x1="80%" y1="20%" x2="100%" y2="50%">
  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
  <Stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.08" />
  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.15" />
</LinearGradient>
```

Tune existing head gradient for stronger contrast:
```typescript
<RadialGradient id={`${catId}-head`} cx="38%" cy="32%" r="60%">
  <Stop offset="0%" stopColor={lighten(bodyColor, 0.22)} />
  <Stop offset="50%" stopColor={bodyColor} />
  <Stop offset="100%" stopColor={darken(bodyColor, 0.70)} />
</RadialGradient>
```

Update `gradId` type:
```typescript
export function gradId(catId: string, part: 'head' | 'body' | 'iris' | 'ear' | 'tail' | 'belly' | 'nose' | 'paw' | 'rim'): string {
```

**Step 2: Pass new props in KeysieSvg**

In `KeysieSvg.tsx` `renderComposable`:
```typescript
<CatGradientDefs catId={catId} bodyColor={bodyColor} eyeColor={eyeColor}
  bellyColor={bellyColor} earInnerColor={earInnerColor} />
```

**Step 3: Run tests and commit**

Run: `npx jest --no-coverage` — Expected: 0 failures

```bash
git add src/components/Mascot/svg/CatGradients.tsx src/components/Mascot/KeysieSvg.tsx
git commit -m "feat(cats): expanded gradient system with belly, nose, paw, rim-light"
```

---

### Task 12: Upgrade CatShadows — ambient occlusion + rim light + fur sheen

**Files:**
- Modify: `src/components/Mascot/svg/CatShadows.tsx`
- Modify: `src/components/Mascot/KeysieSvg.tsx` (add new layers to renderComposable)

**Context:** Replace basic transparent ellipse shadows with contour-following ambient occlusion. Add rim light paths and fur sheen highlights as new components rendered in the composable pipeline.

**Step 1: Upgrade CatShadows**

```typescript
export function CatShadows(): ReactElement {
  return (
    <G>
      {/* Ground shadow — soft ellipse */}
      <Ellipse cx="50" cy="96" rx="26" ry="3.5" fill="#000000" opacity={0.10} />
      {/* Head-body junction shadow — follows neck contour */}
      <Path d="M 36 60 Q 50 65 64 60" fill="none" stroke="#000000" strokeWidth="4" opacity={0.06} strokeLinecap="round" />
      {/* Left paw shadow */}
      <Ellipse cx="42" cy="94" rx="6" ry="1.5" fill="#000000" opacity={0.06} />
      {/* Right paw shadow */}
      <Ellipse cx="58" cy="94" rx="6" ry="1.5" fill="#000000" opacity={0.06} />
    </G>
  );
}
```

**Step 2: Add CatRimLight and CatFurSheen components**

In `CatShadows.tsx` (or a new file if preferred — but same file keeps shadow/light together):

```typescript
/** Rim light — thin bright edge on right side of head and body */
export function CatRimLight({ catId }: { catId: string }): ReactElement {
  return (
    <G>
      {/* Head rim — right edge arc */}
      <Path d="M 72 20 Q 82 30 78 50" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity={0.12} strokeLinecap="round" />
      {/* Body rim — right edge */}
      <Path d="M 62 72 Q 66 78 64 86" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity={0.08} strokeLinecap="round" />
    </G>
  );
}

/** Fur sheen highlight — light catching fur on head and body */
export function CatFurSheen(): ReactElement {
  return (
    <G>
      {/* Head sheen — upper-left arc */}
      <Path d="M 30 18 Q 40 12 55 15" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity={0.12} strokeLinecap="round" />
      {/* Body sheen — small highlight */}
      <Path d="M 42 72 Q 48 70 54 72" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity={0.08} strokeLinecap="round" />
    </G>
  );
}
```

**Step 3: Add new components to renderComposable in KeysieSvg**

Import `CatRimLight` and `CatFurSheen` from `./svg/CatShadows`.

Add in rendering order:
- `<CatFurSheen />` after CatHead (position 8 in render order)
- `<CatRimLight catId={catId} />` after CatBlush (position 17 in render order)

**Step 4: Run tests and commit**

Run: `npx jest --no-coverage` — Expected: 0 failures

```bash
git add src/components/Mascot/svg/CatShadows.tsx src/components/Mascot/KeysieSvg.tsx
git commit -m "feat(cats): ambient occlusion shadows, rim light, fur sheen highlights"
```

---

### Task 13: Final regression test suite + ClipPath update

**Files:**
- Modify: `src/components/Mascot/__tests__/CatRenderer.test.tsx`
- Modify: `src/components/Mascot/KeysieSvg.tsx` (ClipPath)

**Context:** Update the body ClipPath in renderComposable to use the new organic body path shape. Add regression tests verifying the new features: toe beans, fangs, premium eyes, rim light rendering.

**Step 1: Update ClipPath to use organic shapes**

In `KeysieSvg.tsx` `renderComposable`, create body clip paths matching the new body shapes:

```typescript
// Compute body clip path based on body type
const bodyClipPaths: Record<string, string> = {
  slim: 'M 50 66 C 58 66 61 72 61 78 C 61 84 57 90 50 90 C 43 90 39 84 39 78 C 39 72 42 66 50 66 Z',
  standard: 'M 50 66 C 60 66 66 72 66 79 C 66 86 58 91 50 91 C 42 91 34 86 34 79 C 34 72 40 66 50 66 Z',
  round: 'M 50 65 C 62 65 68 72 68 80 C 68 87 60 92 50 92 C 40 92 32 87 32 80 C 32 72 38 65 50 65 Z',
  chonky: 'M 50 64 C 66 64 74 72 74 80 C 74 88 64 94 50 94 C 36 94 26 88 26 80 C 26 72 34 64 50 64 Z',
};
const bodyClipPath = bodyClipPaths[profile.body] ?? bodyClipPaths.standard;
```

Then in the ClipPath:
```typescript
<Defs>
  <ClipPath id={`bodyClip-${catId}`}>
    <Path d="M 50 3 C 70 3 82 14 82 30 C 82 46 70 60 58 62 C 54 63 46 63 42 62 C 30 60 18 46 18 30 C 18 14 30 3 50 3 Z" />
    <Path d={bodyClipPath} />
  </ClipPath>
</Defs>
```

**Step 2: Add regression tests**

In `CatRenderer.test.tsx`, add new tests:

```typescript
describe('Premium SVG art features', () => {
  it('CatBody renders belly patch for all body types', () => {
    const bodyTypes: BodyType[] = ['slim', 'standard', 'round', 'chonky'];
    for (const bt of bodyTypes) {
      const tree = render(
        <KeysieSvg mood="happy" size="medium" catId="mini-meowww"
          visuals={CAT_CHARACTERS[0].visuals} accentColor={CAT_CHARACTERS[0].color} />
      );
      expect(tree.getByTestId('keysie-svg')).toBeTruthy();
    }
  });

  it('cats with fang=true render without crashing', () => {
    // Jazzy has fang=true
    const tree = render(
      <KeysieSvg mood="happy" size="medium" catId="jazzy"
        visuals={CAT_CHARACTERS.find(c => c.id === 'jazzy')!.visuals}
        accentColor={CAT_CHARACTERS.find(c => c.id === 'jazzy')!.color} />
    );
    expect(tree.getByTestId('keysie-svg')).toBeTruthy();
  });

  it('cats with slit pupils render without crashing', () => {
    // Luna has slit pupils
    const tree = render(
      <KeysieSvg mood="encouraging" size="medium" catId="luna"
        visuals={CAT_CHARACTERS.find(c => c.id === 'luna')!.visuals}
        accentColor={CAT_CHARACTERS.find(c => c.id === 'luna')!.color} />
    );
    expect(tree.getByTestId('keysie-svg')).toBeTruthy();
  });

  it('renders all 13 cats at every mood with premium art', () => {
    const allCats = [...CAT_CHARACTERS, { ...SALSA_COACH, visuals: CAT_CHARACTERS[0].visuals }];
    const moods: MascotMood[] = ['happy', 'encouraging', 'excited', 'teaching', 'celebrating', 'love', 'confused', 'smug', 'sleepy'];
    for (const cat of CAT_CHARACTERS) {
      for (const mood of moods) {
        const { getByTestId } = render(
          <KeysieSvg mood={mood} size="medium" catId={cat.id}
            visuals={cat.visuals} accentColor={cat.color} />
        );
        expect(getByTestId('keysie-svg')).toBeTruthy();
      }
    }
  });

  it('Chonky Monke renders with large hair tuft', () => {
    const chonky = CAT_CHARACTERS.find(c => c.id === 'chonky-monke')!;
    const tree = render(
      <KeysieSvg mood="happy" size="medium" catId="chonky-monke"
        visuals={chonky.visuals} accentColor={chonky.color} />
    );
    expect(tree.getByTestId('keysie-svg')).toBeTruthy();
  });
});
```

**Step 3: Run full test suite**

Run: `npx jest --no-coverage`
Expected: ALL PASS, 0 failures, suite count ≥ 129

**Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors from our files (pre-existing Firebase errors may remain)

**Step 5: Commit**

```bash
git add src/components/Mascot/__tests__/CatRenderer.test.tsx src/components/Mascot/KeysieSvg.tsx
git commit -m "feat(cats): final regression tests + organic ClipPaths for premium art"
```

---

## Summary

| Task | Component(s) | Key Change |
|------|-------------|------------|
| 1 | catProfiles.ts | Add pupilType, fang, hairTuftSize fields |
| 2 | CatHead | Organic bezier skull shape |
| 3 | CatBody + CatChestTuft | Bean/pear shapes, belly patch, chest fur |
| 4 | CatEyes | 8-layer composite, pupil types, curved lashes |
| 5 | CatEars | Double contour, inner fur tufts |
| 6 | CatNose + CatMouth + CatWhiskers | Triangle nose, lip line + fangs, curved whiskers |
| 7 | CatPaws | Toe beans, body-type scaling |
| 8 | CatTail | Tapered fills, fur strokes, tip detail |
| 9 | CatBlush | Anime hash marks |
| 10 | CatHairTuft | Richer paths, size scaling, shadows |
| 11 | CatGradientDefs | 4 new gradients (belly, nose, paw, rim) |
| 12 | CatShadows + RimLight + FurSheen | Ambient occlusion, rim light, fur highlights |
| 13 | KeysieSvg + tests | ClipPath update, full regression suite |

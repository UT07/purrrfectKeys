# Enhanced 2D Cat System — Full Redesign

**Date:** 2026-03-02
**Status:** Design approved, pending implementation
**Replaces:** 3D primitive accessories approach
**Approach:** Figma + code enhanced — anime chibi redesign with painted depth and Disney-quality animation

---

## 1. Problem Statement

The current SVG cat avatars are geometrically basic — circles, ellipses, and straight-line triangles. They don't look anime-themed despite the app's chibi aesthetic. The 3D system (GLB models) works for hero shots but has too many constraints (one GL context per screen, 5MB bundle overhead, primitive geometry accessories, device compatibility).

**Decision:** Pivot to a fully enhanced 2D system. Make the SVG cats look premium — painted, expressive, animated — without any 3D dependencies.

## 2. Character Art Redesign

### Current vs Target Proportions

```
CURRENT (geometric)          TARGET (anime chibi)
    /\    /\                     ╱╲    ╱╲
   /  \  /  \                  ╱  ╰╮╭╯  ╲     ← softer ear curves
   ──────────                ╭───────────────╮
  (          )              (                 )   ← bigger head (65-70%)
  (  O    O  )             (  ◉ ◕     ◕ ◉   )   ← HUGE multi-layer eyes
  (    △    )              (      ▾          )   ← tiny nose
  (   ___   )              (     ω           )   ← W-shaped cat mouth
   (________)               ╰─────────────╯
   /        \                  (  ╭──╮  )        ← tiny body
  (  body    )                 ( ╭╯  ╰╮ )
  (__________)                 (╰╯    ╰╯)        ← visible rounded paws
```

### Key Anatomy Changes (100x100 viewBox)

| Part | Current | Target | Why |
|------|---------|--------|-----|
| Head center | cy=38, r=28 | cy=35, r=32 | Bigger head, higher position |
| Body | cy=74, rx=17 | cy=80, rx=14, ry=12 | Smaller, lower body |
| Eyes | r=5-8.5 | r=10-13 | Anime eyes = 40-50% of face |
| Nose | rx=3, ry=2 | rx=1.5, ry=1 | Tiny dot/triangle |
| Mouth | Curve paths | W-shape / 3-shape | Cat mouth |
| Ears | Sharp triangles | Soft bezier curves | Rounded, with inner tufts |
| Paws | None | Small bumps below body | Visible, rounded |
| Eyebrows | None | Optional thin arcs | Expression enhancer |
| Hair tuft | None | Fur tuft between ears | Per-cat personality |

### New Eye System (the soul of anime characters)

Each eye becomes a 6-layer composite:

```
Layer 1: Sclera (white ellipse, slightly squared for anime)
Layer 2: Iris outer ring (dark version of eye color)
Layer 3: Iris fill (RadialGradient: bright center → eye color → dark edge)
Layer 4: Pupil (large, vertically elongated for cats)
Layer 5: Primary specular (large white circle, upper-left)
Layer 6: Secondary specular (small white circle, lower-right)
Optional Layer 7: Colored reflection (accent color, low opacity, bottom of iris)
```

**Per-shape variations** (kept from current system):
- `round`: Standard anime (tall oval sclera)
- `almond`: Narrower, more feline
- `big-sparkly`: Largest, most reflections (Mini Meowww, Biscuit)
- `sleepy`: Half-lidded with visible eyelid arc

**New mood expressions:**
- `happy`: Closed smile arcs (current — works well)
- `celebrating`: Star-shaped iris (current — keep)
- `excited`: Dilated pupils, widened sclera
- `teaching`: Slightly narrowed, focused look
- `encouraging`: Soft, warm expression
- `love`: Heart-shaped iris highlights
- `confused`: Spiral/swirl in one eye
- `smug`: Half-lidded with slight smile

### Mouth Redesign

Replace simple curves with anime cat mouth:

```
HAPPY:    ω       (W-shape — the classic anime cat mouth)
EXCITED:  ◇       (Open diamond)
TEACHING: ─       (Neutral line — keep)
SLEEPY:   ∪       (Slight curve)
SINGING:  ○       (Open circle)
```

### Ear Redesign

Current ears are hard-edged triangles. Redesigned:

```
POINTED:  Soft bezier curves, slight inward curl at tip
          Inner ear: gradient from tip (pink) to base (body color)
          Optional: small tuft of fur at inner base

ROUNDED:  Wider, rounder bezier curves (Scottish Fold inspired)
          Sits lower on head, more visible inner area

FOLDED:   Folds forward at midpoint (keep but soften)
```

### Per-Cat Hair Tufts

Small fur detail between/above ears that gives each cat personality:

| Cat | Tuft Style |
|-----|-----------|
| Mini Meowww | Small curly tuft (cute) |
| Jazzy | Slicked back (cool) |
| Luna | None (sleek) |
| Biscuit | Fluffy poof (round) |
| Ballymakawww | Wild spikes (energetic) |
| Aria | Elegant wave (graceful) |
| Tempo | Windswept (fast) |
| Shibu | Side part (tidy) |
| Bella | Silky drape (elegant) |
| Sable | Sharp tuft (mysterious) |
| Coda | Messy (nerd) |
| Chonky Monke | Banana-shaped cowlick (legendary) |

## 3. Painted Depth (Gradients + Shadows)

### Gradient System

Every body part uses `<Defs>` with gradients. Light source: upper-left (consistent across all parts).

```tsx
<Defs>
  {/* Head sphere gradient */}
  <RadialGradient id={`head-${catId}`} cx="40%" cy="35%" r="60%">
    <Stop offset="0%" stopColor={lighten(bodyColor, 0.15)} />
    <Stop offset="70%" stopColor={bodyColor} />
    <Stop offset="100%" stopColor={darken(bodyColor, 0.20)} />
  </RadialGradient>

  {/* Body roundness gradient */}
  <RadialGradient id={`body-${catId}`} cx="50%" cy="40%" r="55%">
    <Stop offset="0%" stopColor={lighten(bodyColor, 0.10)} />
    <Stop offset="85%" stopColor={bodyColor} />
    <Stop offset="100%" stopColor={darken(bodyColor, 0.25)} />
  </RadialGradient>

  {/* Iris depth gradient */}
  <RadialGradient id={`iris-${catId}`} cx="45%" cy="40%" r="50%">
    <Stop offset="0%" stopColor={lighten(eyeColor, 0.30)} />
    <Stop offset="60%" stopColor={eyeColor} />
    <Stop offset="100%" stopColor={darken(eyeColor, 0.40)} />
  </RadialGradient>

  {/* Specular highlight */}
  <RadialGradient id="specular" cx="50%" cy="50%" r="50%">
    <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.8} />
    <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
  </RadialGradient>
</Defs>
```

### Shadow Layers

```
1. Chin shadow:     Dark ellipse at head-body junction (cx=50, cy=60, opacity=0.08)
2. Body shadow:     Darker gradient at body bottom edge
3. Ear junction:    Darkened overlap where ears meet head
4. Paw shadow:      Small dark ellipse under each paw
5. Ground shadow:   Wide, flat, faded ellipse at the very bottom (cy=95)
```

### Specular Highlights

```
1. Forehead shine:  RadialGradient circle at (cx=42, cy=28), r=6, opacity=0.25
2. Nose glint:      Tiny white circle (r=0.8) on nose upper-left
3. Eye speculars:   Already described in eye system
4. Ear tip shine:   Small highlight at each ear tip
```

## 4. SVG Accessories (Complete Implementation)

All ~35 named accessories get proper SVG implementations. Each uses gradients for painted feel.

### Priority Groups

**P0 — Generic stage accessories (ALL cats use these):**
- `accessory-1` → Collar with pendant
- `accessory-2` → Gem pendant
- `accessory-3` → Crown

**P1 — Starter cat master accessories:**
- bow-tie, scarf, cape, crown (Mini Meowww)
- sunglasses, trilby, sax (Jazzy)
- crescent-collar, tiara, constellation (Luna)

**P2 — Other cat accessories:**
- fedora, flat-cap, chef-hat, beanie, golden-headphones
- monocle, round-glasses, pixel-glasses, racing-goggles
- pearl-necklace, gold-chain, kimono-sash, temple-bell
- golden-cape, royal-robe, royal-cape-white, apron, conductor-coat
- fiddle, baton, cookie-wand

**P3 — Effect accessories:**
- cherry-blossom (petal cluster)
- constellation (glowing star dots)
- speed-aura (motion lines)
- candelabra (tiny candles)
- piano-throne (bench behind cat)

### Accessory Art Style

Accessories follow the same painted style:
- Gold items: LinearGradient (bright gold → deep gold) with metallic specular
- Fabric items: Soft gradients with fold lines (thin dark strokes)
- Glass items: Semi-transparent with reflective highlight gradient
- Instruments: Simplified silhouettes with 1-2 detail accents

## 5. Animation System

### Architecture: Animated SVG Layers

```tsx
const AnimatedG = Animated.createAnimatedComponent(G);

<Svg viewBox="0 0 100 100">
  {/* L0: Background effects */}
  <EvolutionAura stage={stage} accent={accent} />
  <GroundShadow />

  {/* L1: Tail (most trailing physics) */}
  <AnimatedG animatedProps={tailProps}>
    <CatTail />
  </AnimatedG>

  {/* L2: Body (squash/stretch target) */}
  <AnimatedG animatedProps={bodyProps}>
    <CatBody />
    <ChinShadow />
  </AnimatedG>

  {/* L3: Head group (delayed follow-through) */}
  <AnimatedG animatedProps={headProps}>
    <CatHead />
    <ForheadHighlight />
    <Patterns />

    {/* L3a: Ears (own sub-animation for twitch) */}
    <AnimatedG animatedProps={earProps}>
      <CatEars />
    </AnimatedG>

    {/* L3b: Face (expression springs) */}
    <AnimatedG animatedProps={faceProps}>
      <CatEyes />
      {/* L3b-i: Blink overlay */}
      <AnimatedG animatedProps={blinkProps}>
        <BlinkLids />
      </AnimatedG>
      <CatNose />
      <CatMouth />
      <CatWhiskers />
      <CatBlush />
    </AnimatedG>
  </AnimatedG>

  {/* L4: Accessories (physics pendulum) */}
  <AnimatedG animatedProps={accessoryProps}>
    {renderAccessories()}
  </AnimatedG>
</Svg>
```

### Per-Part Spring Physics

```typescript
const PART_SPRINGS = {
  body:        { damping: 12, stiffness: 100, mass: 1.0, delay: 0 },
  head:        { damping: 10, stiffness: 120, mass: 0.8, delay: 30 },
  ears:        { damping: 6,  stiffness: 80,  mass: 0.3, delay: 80 },
  tail:        { damping: 5,  stiffness: 60,  mass: 0.4, delay: 120 },
  face:        { damping: 15, stiffness: 150, mass: 0.5, delay: 0 },
  accessories: { damping: 4,  stiffness: 40,  mass: 0.6, delay: 150 },
};
```

### Squash & Stretch Keyframes

```typescript
const SQUASH_STRETCH = {
  celebrate: [
    { scaleX: 1.05, scaleY: 0.92, ms: 80 },    // anticipation
    { scaleX: 0.90, scaleY: 1.15, ms: 150 },    // stretch (jump)
    { scaleX: 1.20, scaleY: 0.85, ms: 100 },    // squash (land)
    { scaleX: 0.97, scaleY: 1.04, ms: 120 },    // overshoot
    { scaleX: 1.00, scaleY: 1.00, ms: 200 },    // settle
  ],
  play: [
    { scaleX: 1.08, scaleY: 0.88, ms: 100 },    // crouch
    { scaleX: 0.88, scaleY: 1.15, ms: 120 },    // launch
    { scaleX: 0.92, scaleY: 1.10, ms: 100 },    // hang
    { scaleX: 1.12, scaleY: 0.86, ms: 80 },     // land
    { scaleX: 1.00, scaleY: 1.00, ms: 250 },    // settle
  ],
  sad: [
    { scaleX: 1.04, scaleY: 0.96, ms: 400 },    // deflate
    { scaleX: 1.02, scaleY: 0.98, ms: 800 },    // hold
    { scaleX: 1.00, scaleY: 1.00, ms: 500 },    // recover
  ],
};
```

### Micro-Life Animations

| Animation | Target | Interval | Duration | Notes |
|-----------|--------|----------|----------|-------|
| Blink | Eye group scaleY | 3-6s random | 150ms | Rapid close-open |
| Ear twitch | Ear group rotate | 4-8s random | 200ms | ±5 degrees |
| Breathing | Body scaleY | Continuous sine | 3s period | 1.0 → 1.02 |
| Tail sway | Tail translateX | Continuous sine | 2.5s period | ±3 units |
| Whisker wiggle | Whisker translateY | On ear twitch | 150ms | ±0.5 units |
| Specular shimmer | Highlight opacity | Continuous sine | 4s period | 0.2 → 0.4 |
| Blush pulse | Blush opacity | Continuous sine | 5s period | 0.25 → 0.35 |

### Game Event Reactions

```typescript
const REACTIONS = {
  perfectHit: {
    eyes: { scale: 1.3, duration: 200 },
    ears: { rotate: 10, duration: 150 },
    body: { translateY: -5, scaleY: 1.1, duration: 200 },
    settle: 500,
  },
  miss: {
    eyes: { scale: 0.8, duration: 200 },
    ears: { rotate: -5, duration: 200 },
    body: { translateY: 3, scaleY: 0.95, duration: 300 },
    settle: 600,
  },
  comboStreak: {
    tailAmplitude: 2.0,  // double tail wag
    breathRate: 0.7,     // faster breathing
    specularIntensity: 1.5,
  },
};
```

## 6. Evolution Visual Progression

| Stage | Art Complexity | Gradients | Shadows | Highlights | Micro-Anims | Accessories |
|-------|---------------|-----------|---------|------------|-------------|-------------|
| Baby | Simple shapes, minimal detail | 1-stop body | None | None | Blink only | None |
| Teen | Full shapes, first details | Head + body | Chin only | None | + breathing | 1 item |
| Adult | Full detail, richer colors | All parts | All shadows | Forehead + nose | + ears, tail | 2 items |
| Master | Maximum detail, luminous | All + specular | All + ground | All highlights | All active | 3 items + aura |

Baby cats should look INTENTIONALLY simpler — this makes evolution feel rewarding.

## 7. Size-Adaptive Detail

| Size | Pixels | Detail Level | What to Simplify |
|------|--------|-------------|------------------|
| small | 48px | Minimal | No gradients (too small), no shadows, simplified eyes |
| medium | 72px | Standard | Body + head gradient, basic shadows, full eyes |
| large | 120px | Full | All gradients, all shadows, all highlights |
| hero | 200px+ | Maximum | Fur texture lines, extra specular, ground shadow |

## 8. Migration Strategy

### Keep (dormant)
- `3d/Cat3DCanvas.tsx` — functional but not default
- `3d/CatModel3D.tsx` — works, could be "premium 3D mode" toggle
- `3d/cat3DConfig.ts` — body type → model mapping
- GLB files in `assets/models/` — stay bundled

### Modify
- `CatAvatar.tsx` → becomes the ONE renderer everywhere
- Screens using `Cat3DCanvas` with `forceSVG={true}` → already using SVG (no change)
- Screens using `Cat3DCanvas` without `forceSVG` → switch to `CatAvatar`
- `HomeScreen`, `CatSwitchScreen`, `ExercisePlayer` hero shots → use large/hero size CatAvatar

### Delete (later, not now)
- Nothing deleted in this phase — 3D stays dormant

## 9. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `svg/CatParts.tsx` | **Major rewrite** | Redesigned anatomy, gradient support, hair tufts, paws |
| `svg/CatAccessories.tsx` | **Major rewrite** | All ~35 accessories with painted SVG |
| `svg/CatGradients.tsx` | **New** | Reusable gradient Defs factory per cat |
| `svg/CatShadows.tsx` | **New** | Shadow layer components |
| `KeysieSvg.tsx` | **Rewrite** | Animated layer architecture, gradient wiring |
| `CatAvatar.tsx` | **Enhance** | Size-adaptive detail, hero size, remove 3D branching |
| `animations/catAnimations.ts` | **Enhance** | Squash/stretch keyframes, micro-life configs, part springs |
| `animations/useCatPose.ts` | **Rewrite** | Per-part animated props, spring physics |
| `animations/useMicroLife.ts` | **New** | Blink, twitch, breathe, sway hooks |
| `svg/catProfiles.ts` | **Enhance** | Add hair tuft type, eyelash flag |
| `catCharacters.ts` | **Enhance** | Hair tuft assignments per cat |

## 10. Implementation Batches

### Batch 1: Character Art Redesign (Foundation)
- Redesign CatParts.tsx anatomy (bigger head, anime eyes, tiny nose, W mouth, soft ears, paws)
- Add hair tuft system to catProfiles
- Verify all 12 cats render correctly with new anatomy
- Tests pass

### Batch 2: Painted Depth
- CatGradients.tsx factory
- Wire gradients into all CatParts
- Shadow layers (CatShadows.tsx)
- Specular highlights
- Tests pass

### Batch 3: Eye Overhaul
- 6-layer composite eye system
- New mood expressions (love, confused, smug)
- Iris gradient with colored reflection
- Eyelash support for feminine cats
- Tests pass

### Batch 4: SVG Accessories (P0 + P1)
- Generic stage accessories (collar, pendant, crown)
- Starter cat accessories (bow-tie, sunglasses, scarf, cape, tiara, sax)
- All with gradient painted style
- Tests pass

### Batch 5: Animation Architecture
- AnimatedG layer structure in KeysieSvg
- Per-part spring physics (useCatPose rewrite)
- Squash & stretch on celebrate/play/sad
- Follow-through timing
- Tests pass

### Batch 6: Micro-Life Animations
- useMicroLife hook (blink, ear twitch, breathing, tail sway)
- Whisker wiggle, specular shimmer, blush pulse
- Random interval timing
- Tests pass

### Batch 7: Remaining Accessories + Polish
- P2 accessories (hats, glasses, instruments, capes)
- P3 effect accessories (constellation, cherry blossom, speed aura)
- Evolution visual progression (baby=simple → master=full)
- Size-adaptive detail levels
- Tests pass

### Batch 8: Integration + Migration
- Switch all screens from Cat3DCanvas to enhanced CatAvatar
- Game event reactions (perfect/miss/combo)
- Expression spring transitions
- Final visual QA pass
- Tests pass

---

## Dependencies

- `react-native-svg` (already installed) — LinearGradient, RadialGradient, Defs, Stop
- `react-native-reanimated` (already installed) — Animated.createAnimatedComponent(G)
- **Zero new dependencies**

## Risks

1. **Animated SVG performance**: Many animated groups in one SVG could lag on older devices. Mitigation: small/medium sizes skip per-part animation, only large/hero gets full animation.
2. **Gradient ID collisions**: Multiple cats on one screen need unique gradient IDs. Mitigation: prefix all IDs with catId.
3. **Art quality**: Code-drawn SVG may not match hand-drawn quality. Mitigation: Design key shapes in Figma first, export paths, then integrate.

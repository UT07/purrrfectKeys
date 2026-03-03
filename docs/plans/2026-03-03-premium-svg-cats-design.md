# Premium SVG Cat Art Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all geometric-primitive SVG cat parts with hand-crafted bezier paths to achieve chibi anime collectible quality — cats people would spend real money on.

**Architecture:** Full bezier rewrite of every CatPart component within the existing composable architecture. Same 100x100 viewBox, same CatProfile system, same rendering pipeline. Only the SVG path data and gradient definitions change.

**Tech Stack:** react-native-svg Path/G elements, cubic bezier curves, expanded RadialGradient/LinearGradient set.

---

## 1. Coordinate System & Proportions

### Current (geometric primitives)
- Head: `Circle cx=50 cy=35 r=32`
- Body: `Ellipse cx=50 cy=80 rx=11-20 ry=10-15`
- Simple geometric shapes throughout

### New (premium chibi)
- Head: ~65x58 organic shape, center ~(50, 38). Wider than tall, rounder cheeks, subtle chin taper.
- Body: ~28x22 bean/pear shape at ~(50, 78). Visible chest bump, narrower shoulders.
- Head-to-body ratio: ~2.5:1 (more extreme = cuter).
- Ears peek slightly above y=0.
- Paws visible at bottom with toe beans.
- Tail exits body side, curves up behind.
- All shapes use cubic bezier `Path` elements (`C` commands) — no `Circle` or `Ellipse` for major forms.

### Gradient system expansion
- Current: 5 gradients (head, body, iris, ear, tail)
- New: 9 gradients — add belly-patch, paw-pad, nose-shine, rim-light
- Consistent light direction: upper-left (10 o'clock) across all parts
- Rim light on right edge of head/body (opposite light source) — the single biggest visual upgrade for 3D-rendered feel

---

## 2. Head & Body Shapes

### CatHead
- Replace `Circle` with organic chibi skull path (cubic beziers)
- Wider at cheeks, slightly flattened forehead, tapered chin
- Cheek fluff variants become actual contour changes in the head path (not separate overlapping circles)
- Subtle forehead highlight gradient

### CatBody
- Replace `Ellipse` with bean/pear path shapes per body type:
  - `slim`: tall narrow teardrop, visible waist
  - `standard`: soft pear shape
  - `round`: near-circular with chest bump
  - `chonky`: wide bell shape, pronounced belly overhang, visible side rolls
- **Belly patch**: lighter-colored inner path following body contour (not an overlaid ellipse)
- **Chest tuft**: 2-3 overlapping bezier fur wisps at head-body junction

---

## 3. Eyes — 8-Layer Composite

The #1 priority. Eyes sell emotional attachment.

### Layer stack (per eye, back to front):
1. **Eyelid outline** — curved stroke defining eye opening. Shape varies per `EyeShape`.
2. **Sclera** — organic eye-opening shape (not a circle). Slightly off-white (#FAFAFA) with blue-grey shadow at top (upper lid shadow).
3. **Iris outer ring** — darker shade of eye color for depth.
4. **Iris body** — radial gradient, more stops for gem-like quality. Uses existing iris gradient system.
5. **Pupil** — `round` or `slit` per new `pupilType` profile field. Slightly off-center toward light.
6. **Iris detail lines** — 4-6 thin radial strokes from pupil outward at ~30% opacity. Iris fiber texture.
7. **Primary catch light** — large oval, upper-left, white ~90% opacity.
8. **Secondary catch light** — small circle, lower-right, white ~60% opacity.

### Per-profile additions:
- `eyelashes`: 3 curved lash strokes on outer corner (actual curves, not straight lines)
- New field `pupilType: 'round' | 'slit'` — slit for mysterious cats (Sable, Luna), round for cute (Mini-Meowww, Biscuit)

### Mood eye overhaul:
- `happy`: arched smile eyes with eyelid curves on top
- `love`: heart eyes with subtle iris gradient inside
- `celebrating`: star eyes with sparkle burst (4 small diamond paths around each star)
- `confused`: actual spiral path
- `sleepy`: heavy drooping upper eyelid covering 60% of eye, visible lower lid
- `smug`: half-lid, iris peeking through narrow opening, one eyebrow raised (asymmetric)

---

## 4. Ears, Nose, Mouth, Whiskers

### CatEars
- **Double contour** — outer edge with slightly thicker stroke for "drawn" feel
- **Inner ear fur** — 3-4 wispy bezier strokes radiating from base inward
- **Inner ear gradient** — darker at base, lighter at tip (not flat fill)
- Per type distinction:
  - `pointed`: sharp with slight backward curve at tip
  - `rounded`: Scottish Fold-style with visible cartilage fold line
  - `folded`: dramatically folded forward with overlap shadow

### CatNose
- Replace `Ellipse` with **inverted triangle** (iconic anime cat nose — rounded upside-down triangle)
- Small highlight dot on upper-left (nose shine)
- Slightly asymmetric for hand-drawn feel

### CatMouth
- Proper **upper lip line** connecting to nose (the `Y` line down from nose)
- New profile field `fang: boolean` — tiny triangular tooth on one side
- Per-mood upgrades:
  - `excited`: open mouth with tiny curved tongue (pink bezier)
  - `celebrating`: wide grin with both fangs visible
  - w-mouth gets proper curves with lip line

### CatWhiskers
- **Curved** bezier paths (not straight lines)
- **Tapered** width: ~1.0 at root to ~0.3 at tip (filled Path, not stroked Line)
- Middle whisker longest, top/bottom shorter
- **Whisker follicle dot** at root (~0.4 opacity)

---

## 5. Paws, Tail, Blush, Hair Tufts

### CatPaws
- **Rounded rectangle path** per paw with 3 visible **toe beans**:
  - 1 large oval pad at bottom
  - 2 smaller round pads above
- Toe bean color: derived from `earInnerColor` at low opacity (pink-ish)
- Front paws slightly angled outward (sitting pose feel)
- Width scales per body type: chonky=wide stubby, slim=dainty narrow

### CatTail
- **Tapered filled Path** (not stroked line) — thick at body (~6px equiv), thin at tip (~2px)
- Tip detail per type:
  - `curled`: spiral tip with accent-colored tuft (3 overlapping circles)
  - `straight`: slight upward hook, pointed tip
  - `fluffy`: wide bushy shape with scalloped edge (3-4 bumps)
- 2-3 thin fur direction strokes along curve at low opacity

### CatBlush
- Replace transparent ellipses with **anime hash-mark blush** — 3 short diagonal parallel lines per cheek at ~25% opacity
- Color from `blushColor`

### CatHairTuft
- Each type gets 2-3x more path data for richer silhouette
- Tufts cast tiny **shadow** on forehead (1px offset darker path behind)
- New profile field `hairTuftSize: 'small' | 'medium' | 'large'`
- Key upgrades: curly=actual spiral loops, fluffy=4-5 bumps cloud shape, spiky=inner highlight strokes, messy=asymmetric strands

---

## 6. Gradient & Lighting System

### Light direction
Consistent upper-left (10 o'clock) across all parts. Every gradient, highlight, and shadow respects this.

### 9 gradients (expanded from 5):
1. `head` — radial, stronger contrast, highlight upper-left (exists, tune)
2. `body` — radial, highlight above center (exists, tune)
3. `iris` — radial, more stops for gem quality (exists, tune)
4. `ear` — linear top→bottom with bright edge (exists)
5. `tail` — linear along curve (exists)
6. `belly-patch` (NEW) — soft radial on belly area, lighter than body
7. `nose-shine` (NEW) — tiny radial highlight on nose upper-left
8. `paw-pad` (NEW) — subtle pink/warm gradient for toe beans
9. `rim-light` (NEW) — thin bright edge on right side of head/body

### Shadow layers upgrade
- Current: 4 basic transparent ellipses
- New: **ambient occlusion shadows** at body junctions (head-body, paws-ground, ear concavities). Dark paths at 5-8% opacity following contour.

### Fur sheen highlights
- Thin curved Path stroke along head upper contour at ~15% opacity white
- Matching highlight on body
- Simulates light catching fur

---

## 7. New Profile Fields & Rendering Order

### New CatProfile fields (3 additions):
```typescript
pupilType: 'round' | 'slit'                    // round=cute, slit=mysterious
fang: boolean                                    // visible tooth on one side
hairTuftSize: 'small' | 'medium' | 'large'     // scales with evolution/rarity
```

### Rendering order (back to front):
1. Evolution aura (background)
2. Ground shadow
3. Tail (behind body)
4. Body with belly patch
5. Chest fur tuft (head-body junction)
6. Paws with toe beans
7. Head (organic bezier shape)
8. Fur sheen highlight (head)
9. Pattern overlay (clipped to body+head)
10. Ears with inner fur detail
11. Hair tuft with shadow
12. Whiskers (curved, tapered)
13. Nose (triangle with shine)
14. Eyes (8-layer composite)
15. Mouth with optional fang
16. Blush (hash-mark style)
17. Rim light (head + body edges)
18. Evolution accessories

### What stays the same:
- 100x100 viewBox
- CatProfile system (just adding 3 fields)
- CatGradientDefs pattern (expanding)
- All cat IDs, colors, and character data in catCharacters.ts
- catColorPalette.ts colors
- The composable architecture — each component upgraded in isolation
- KeysieSvg composable vs legacy rendering paths
- Test structure (existing tests continue to pass)

---

## 8. Implementation Approach

Upgrade one CatPart component at a time. Each task:
1. Rewrite the component with new bezier paths
2. Verify all 13 cats render correctly (visual + test)
3. Commit

**Batch order (highest visual impact first):**
1. CatHead (organic shape) + CatBody (bean shapes) + chest tuft
2. CatEyes (8-layer composite) + pupilType profile field
3. CatEars (contour + fur detail) + CatNose (triangle)
4. CatMouth (lip line + fang) + CatWhiskers (curved tapered)
5. CatPaws (toe beans) + CatTail (tapered + tips)
6. CatBlush (hash marks) + CatHairTuft (richer paths + size)
7. CatGradientDefs (4 new gradients) + CatShadows (ambient occlusion) + rim light + fur sheen
8. Profile updates (pupilType, fang, hairTuftSize for all 13 cats) + regression tests

---

## Design Constraints

- **No new dependencies** — pure react-native-svg (Path, G, Defs, gradients)
- **No external art assets** — all paths crafted in code
- **Backward compatible** — legacy rendering path untouched, composable path upgraded
- **Performance** — more Path elements per cat but still lightweight SVG (no bitmap textures)
- **Testable** — existing CatRenderer tests validate all cats render without crashing at every mood/stage

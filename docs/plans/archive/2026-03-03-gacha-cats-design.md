# Gacha-Level Cat Art, Animations & Store Overhaul — Design Doc

**Goal:** Transform Cat Studio from flat grey icons and static cats into a gacha-quality collectible experience with state-of-the-art SVG art, living micro-animations, illustrated ability icons, and live try-before-you-buy previews.

**Quality Bar:** Genshin Impact / gacha collectible games — flashy, premium, worth spending currency on.

**Architecture:** Figma Make for character art → Figma MCP extraction → react-native-svg components. Reanimated 3 shared values for autonomous micro-animation loops. Custom SVG ability icons replacing Ionicons. Live preview overlay system for abilities.

**Tech Stack:** react-native-svg, react-native-reanimated 3, Figma MCP, expo-linear-gradient

---

## 1. Art Pipeline: Figma Make → SVG Components

### Problem
Cat SVGs are hand-coded bezier curves in a 100×100 viewBox. This has a hard ceiling on visual quality — no amount of `d="M 36 60 Q 50 65..."` tuning will match designed art.

### Solution
**Figma-first art pipeline:**

1. **Design in Figma Make** — User generates chibi anime cat character frames via figma.com/make (text-to-design AI). Each cat gets a character sheet: base pose + 9 mood expressions.
2. **Extract via Figma MCP** — Use `get_design_context` to pull SVG code from the Figma file.
3. **Convert to react-native-svg** — Transform Figma SVG output into CatParts components. Each SVG part (head, body, ears, eyes, tail, mouth) becomes a separate `<G>` group for independent animation.
4. **Layer for animation** — Split the SVG into animatable layers: body (breathing), eyes (blinks), ears (twitches), tail (swish), mouth (mood expressions).

### Art Requirements Per Cat
- 100×100 viewBox (existing constraint)
- Chibi anime proportions: large head (~50% height), compact body, oversized eyes
- Clean vector paths (no raster effects)
- Per-cat unique features: color palette, markings, accessories, eye style
- 9 mood variants per cat: happy, encouraging, excited, teaching, celebrating, love, confused, smug, sleepy
- Export as named SVG groups so each body part is independently addressable

### Parallel Workflow
Art design and code implementation happen in parallel:
- **Code track:** Build animation engine, store UI, ability icons, preview system — all using current SVG art as placeholder
- **Art track:** User creates Figma Make designs, shares URLs, we extract and integrate
- Art can be swapped in hot without changing any animation or store code

---

## 2. SVG Micro-Animation Engine

### Overview
Five autonomous animation loops that make cats feel alive. Each runs on independent Reanimated shared values so they layer naturally.

### Animation Specs

#### Breathing (continuous)
- **Target:** Body `<G>` group scaleY
- **Range:** 1.0 → 1.03 → 1.0
- **Timing:** 3000ms cycle, `withRepeat(-1)` + `withSequence`
- **Easing:** `Easing.inOut(Easing.sine)` — smooth organic feel
- **Subtlety:** Also shifts body translateY by -1px on inhale (chest rises)

#### Eye Blinks (random interval)
- **Target:** Eyes `<G>` group scaleY
- **Sequence:** 1.0 → 0.1 → 1.0 (close → open)
- **Duration:** 150ms total (fast snap)
- **Interval:** Random 3-7 seconds between blinks
- **Implementation:** `setTimeout` with random delay triggers a `withSequence` animation
- **Double-blink:** 20% chance of rapid double-blink (100ms gap between blinks)

#### Ear Twitches (random interval)
- **Target:** Left ear rotate, right ear rotate (asymmetric for natural feel)
- **Range:** 0° → random(±5° to ±12°) → 0°
- **Duration:** 200ms twitch + 300ms settle
- **Interval:** Random 4-10 seconds
- **Asymmetry:** Left and right ears twitch independently with different angles

#### Tail Swish (continuous)
- **Target:** Tail `<G>` group rotation around base pivot
- **Range:** -8° → +8°
- **Timing:** 2500ms cycle, continuous
- **Easing:** `Easing.inOut(Easing.sine)`
- **Mood modifier:** Faster swish when excited (1500ms), slower when sleepy (4000ms)

#### Mood Transitions (event-driven)
- **Trigger:** When `mood` prop changes
- **Method:** Spring-based settle on all parts simultaneously
- **Spring config:** `{ damping: 12, stiffness: 100 }` — bouncy but controlled
- **Expression crossfade:** Face SVG swaps with a 100ms scaleY squash (face "morphs")

### Architecture

New file: `src/components/Mascot/animations/useMicroAnimations.ts`

```typescript
interface MicroAnimationValues {
  breathScale: SharedValue<number>;
  breathTranslateY: SharedValue<number>;
  eyeScaleY: SharedValue<number>;
  leftEarRotate: SharedValue<number>;
  rightEarRotate: SharedValue<number>;
  tailRotate: SharedValue<number>;
}

function useMicroAnimations(options?: {
  enabled?: boolean;
  mood?: MascotMood;
}): MicroAnimationValues;
```

Each animation loop is a separate `useEffect` that sets up its timing. The hook returns shared values that KeysieSvg applies as `transform` on the appropriate `<G>` groups.

### Performance
- All animations use `useAnimatedStyle` worklets (UI thread, no JS bridge)
- Random intervals use JS-thread `setTimeout` but only to trigger worklet animations
- Total: ~6 active shared values per rendered cat — well within Reanimated's budget
- Cats off-screen don't animate (FlatList recycling handles this naturally)

---

## 3. Ability Icon System

### Problem
Current ability icons are grey `MaterialCommunityIcons` on dark backgrounds. Users can't tell what they're buying and nothing looks premium.

### Solution: Custom SVG Ability Badges

12 illustrated SVG icons, one per ability type:

| Ability | Icon Concept | Colors |
|---------|-------------|--------|
| `timing_forgiveness` | Clock with golden glow ring | Gold/amber gradient |
| `combo_shield` | Shield with musical note | Blue/silver gradient |
| `score_boost` | Star with upward arrow | Gold/white sparkle |
| `xp_multiplier` | Lightning bolt with "2x" | Purple/electric blue |
| `streak_saver` | Flame with shield overlay | Orange/red gradient |
| `gem_magnet` | Gem with magnetic pull lines | Cyan/teal gradient |
| `extra_retries` | Heart with "+" symbol | Pink/red gradient |
| `ghost_notes_extended` | Ghost note with trail | Lavender/translucent |
| `daily_xp_boost` | Sun with rising arrow | Yellow/warm orange |
| `note_preview` | Eye with musical staff | Green/emerald gradient |
| `perfect_shield` | Diamond shield, premium | Gold/diamond sparkle |
| `lucky_gems` | Four-leaf clover with gem | Green/gold gradient |

### Visual States

**Locked:**
- Desaturated/greyscale version of the icon
- Frosted glass overlay (`opacity: 0.4`, white blur)
- Small lock badge in bottom-right corner
- Evolution stage label ("Unlocks at Teen")

**Unlocked:**
- Full color with radial gradient background
- Subtle idle pulse animation (scale 1.0 → 1.05, 2s cycle)
- First-reveal: sparkle burst particle animation (600ms)

**Selected/Active (live preview):**
- Bright glow ring pulsing around icon
- Connected to cat avatar with a subtle light beam

### Implementation

New file: `src/components/Mascot/svg/AbilityIcons.tsx`

Each icon is a self-contained SVG component in the 100×100 viewBox:
```typescript
export function AbilityIcon({ abilityType, unlocked, size, catColor }: AbilityIconProps): ReactElement;
```

The icon SVGs can also be designed in Figma and extracted, but since they're simpler geometric designs (shields, stars, gems), hand-coding them is viable and faster.

---

## 4. Live Preview System

### Flow
1. User taps ability icon on Cat Studio card
2. Ability detail expands (existing behavior)
3. **NEW:** Cat avatar above shows a visual overlay effect for that ability
4. Cat plays a contextual reaction animation (curious head tilt, excited bounce)

### Ability Preview Effects

| Ability | Visual Effect on Cat |
|---------|---------------------|
| `timing_forgiveness` | Golden clock rings orbit around cat |
| `combo_shield` | Translucent shield shimmer wraps body |
| `score_boost` | Star sparkles rise from cat |
| `xp_multiplier` | Purple energy aura pulses |
| `streak_saver` | Flame particles around feet |
| `gem_magnet` | Tiny gem sprites orbit cat |
| `extra_retries` | Heart floats up from cat |
| `ghost_notes_extended` | Cat briefly goes semi-transparent |
| `daily_xp_boost` | Sunrise glow behind cat |
| `note_preview` | Musical notes float above head |
| `perfect_shield` | Diamond facets reflect on body |
| `lucky_gems` | Clover leaves drift around cat |

### Implementation

New file: `src/components/Mascot/svg/AbilityPreview.tsx`

```typescript
export function AbilityPreviewOverlay({
  abilityType: AbilityEffect['type'];
  catColor: string;
  active: boolean;
  size: number;
}): ReactElement | null;
```

Each effect is an SVG overlay rendered on top of the CatAvatar. Uses Reanimated for particle animations and opacity transitions.

---

## 5. Cat Studio Card Redesign

### Current State
- Static cat avatar (no animation)
- Grey ability icons in a flat row
- Basic evolution progress bar
- Functional but not premium

### Gacha Treatment

**Card Layout (top to bottom):**
1. **Rarity-themed background** — particle effects for legendary, gradient shifts for rare, clean for common
2. **Animated cat avatar** — breathing, blinking, tail swishing idle cat
3. **Character banner** — styled name typography + personality tagline
4. **Evolution badge** — glowing stage indicator with progress arc
5. **Ability showcase** — illustrated icons in a premium row, tappable for live preview
6. **Action button** — Select / Buy (with gem price) / Locked

**New Sub-components:**
- `AnimatedCatCard` — wraps CatAvatar with micro-animations enabled
- `AbilityShowcase` — premium icon row with unlock states and tap-to-preview
- `EvolutionBadge` — circular progress with glow and stage icon

---

## 6. File Structure

```
src/components/Mascot/
├── animations/
│   ├── catAnimations.ts          # Existing pose configs (unchanged)
│   ├── useMicroAnimations.ts     # NEW: breathing, blinks, twitches, swish
│   └── useMoodTransition.ts      # NEW: smooth mood crossfade
├── svg/
│   ├── CatParts.tsx              # Existing (art upgraded via Figma pipeline)
│   ├── catProfiles.ts            # Existing (unchanged)
│   ├── CatGradients.tsx          # Existing (unchanged)
│   ├── CatShadows.tsx            # Existing (unchanged)
│   ├── AbilityIcons.tsx          # NEW: 12 illustrated SVG ability badges
│   └── AbilityPreview.tsx        # NEW: visual overlay effects for preview
├── KeysieSvg.tsx                 # Modified: apply micro-animation transforms
├── CatAvatar.tsx                 # Modified: integrate micro-animations hook
└── __tests__/
    ├── MicroAnimations.test.ts   # NEW: animation hook tests
    └── AbilityIcons.test.tsx     # NEW: icon rendering tests
```

---

## 7. Testing Strategy

| Area | Tests |
|------|-------|
| Micro-animations | Hook returns correct shared values, mood changes trigger transitions, random intervals fire |
| Ability icons | All 12 render at locked/unlocked states, correct gradients, sparkle on unlock |
| Live preview | Each ability type renders overlay, overlay hides when deselected |
| Cat Studio cards | Animated cats render without crash, ability tap triggers preview |
| Regression | All existing 235 Mascot tests still pass |

---

## 8. Implementation Order

1. **Micro-animation engine** — `useMicroAnimations` hook + integrate into KeysieSvg
2. **Mood transitions** — `useMoodTransition` hook for smooth expression changes
3. **Ability icons** — 12 SVG ability badges in `AbilityIcons.tsx`
4. **Ability preview overlays** — Visual effects in `AbilityPreview.tsx`
5. **Cat Studio card redesign** — Wire animations + icons + preview into CatSwitchScreen
6. **Figma art integration** — Swap in Figma-designed SVG paths when available
7. **Polish & testing** — Final regression tests, performance tuning

---

## Dependencies
- No new packages needed (Reanimated 3 + react-native-svg already installed)
- Figma Make designs are async/parallel — not a blocker for code implementation
- All changes are additive — no breaking changes to existing components

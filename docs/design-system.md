# Purrrfect Keys — Design System

**Version:** 3.1
**Last Updated:** February 21, 2026
**Status:** Phase 7 Batches 1-6 complete — Concert Hall palette (black + crimson), lava lamp gradient, typography, shadows, composable cat SVG, Salsa NPC

---

## 1. Current Design Tokens

### Colors (Concert Hall: Black + Crimson Red)

```typescript
// src/theme/tokens.ts — Concert Hall palette
COLORS = {
  // Core surfaces (true blacks, neutral — no purple tint)
  background: '#0A0A0A',
  surface: '#141414',
  surfaceElevated: '#1C1C1C',
  surfaceOverlay: 'rgba(0, 0, 0, 0.85)',

  // Primary (crimson)
  primary: '#DC143C',          // Brand crimson
  primaryLight: '#FF2D55',
  primaryDark: '#8B0000',

  // Cards (neutral dark greys)
  cardSurface: '#181818',
  cardBorder: '#2A2A2A',
  cardHighlight: '#222222',

  // Text (clean whites and greys — no lavender)
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',
  textAccent: '#DC143C',

  // Status
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Gamification
  starGold: '#FFD700',
  starEmpty: '#444444',
  gemGold: '#FFD700',
  gemDiamond: '#4FC3F7',
  evolutionGlow: '#FFD54F',    // Warm gold (was purple #E1BEE7)
  evolutionFlash: '#FFFFFF',

  // Gameplay feedback
  feedbackPerfect: '#00E676',  // Bright green
  feedbackGood: '#69F0AE',     // Light green
  feedbackOk: '#FFD740',       // Amber gold
  feedbackEarly: '#40C4FF',    // Light blue
  feedbackLate: '#FFAB40',     // Warm orange
  feedbackMiss: '#FF5252',     // Red
  feedbackDefault: '#757575',  // Grey
  comboGold: '#FFD700',        // Gold

  // Streak flame tiers
  streakFlame: '#FF6B35',      // Base warm orange
  streakFlameWarm: '#FF9800',  // Tier 1 (< 7 days)
  streakFlameMedium: '#FF6B00', // Tier 2 (7-29 days)
  streakFlameHot: '#FF4500',   // Tier 3 (30+ days)
}
```

### Spacing Scale
- xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48

### Border Radius
- sm: 8, md: 12, lg: 16, xl: 24, full: 9999

### Gradients

```typescript
GRADIENTS = {
  dark: ['#141414', '#0A0A0A'],        // Neutral dark surface
  header: ['#1C1C1C', '#0A0A0A'],      // Header bar
  heroGlow: ['#2A0A0A', '#1A0A0A', '#0A0A0A'], // 3-stop dark red hero
  cardWarm: ['#1C1C1C', '#181818'],     // Elevated card
  crimson: ['#DC143C', '#8B0000'],
  gold: ['#FFD700', '#FFA500'],
  success: ['#4CAF50', '#2E7D32'],
  gem: ['#FFD700', '#FF8C00'],
  evolution: ['#FFD54F', '#FF8C00'],    // Warm gold (was purple)

  // Lava Lamp — animated gradient keyframes
  lavaLamp: {
    duration: 8000,  // full cycle time in ms
    palettes: [
      ['#1A0000', '#0A0A0A', '#0A0A0A'],  // deep red bleed at top
      ['#0A0A0A', '#1A0505', '#0A0A0A'],  // crimson ember in center
      ['#0A0A0A', '#0A0A0A', '#1A0000'],  // red glow settling to bottom
      ['#120000', '#0E0303', '#0A0A0A'],  // warm dark red wash
    ],
  },
}
```

### Animated Gradient (Lava Lamp)

The `AnimatedGradientBackground` component (`src/components/common/AnimatedGradientBackground.tsx`) provides a slowly shifting lava-lamp effect. Two `LinearGradient` layers crossfade between the `lavaLamp.palettes`, creating a subtle, always-moving dark red glow. Used on HomeScreen and AuthScreen hero sections.

### Glow System

```typescript
GLOW = {
  crimson: 'rgba(220, 20, 60, 0.3)',
  gold: 'rgba(255, 215, 0, 0.3)',
  dark: 'rgba(28, 28, 28, 0.3)',
  success: 'rgba(76, 175, 80, 0.3)',
}
// + glowColor(hex, opacity) helper
// + shadowGlow(color, radius) for colored shadow effects
```

### Shadows

```typescript
SHADOWS = {
  sm: { shadowOffset: {0,1}, opacity: 0.15, radius: 3 / elevation: 2 },
  md: { shadowOffset: {0,4}, opacity: 0.20, radius: 8 / elevation: 4 },
  lg: { shadowOffset: {0,8}, opacity: 0.25, radius: 16 / elevation: 8 },
}
```

---

## 2. Typography

**System:** Defined typography scale in `TYPOGRAPHY` object (Phase 7 Batch 1).

```typescript
TYPOGRAPHY = {
  display:  { lg: 36/44, md: 28/36, sm: 24/32 },  // Hero text, celebrations
  heading:  { lg: 20/28, md: 18/26, sm: 16/24 },   // Section headers
  body:     { lg: 16/24, md: 14/22, sm: 13/20 },    // Content text
  caption:  { lg: 12/18, md: 11/16, sm: 10/14 },    // Labels, hints
  button:   { lg: 16/24, md: 14/22, sm: 12/18 },    // Button labels
  special:  { score: 48/56, badge: 11/14 uppercase } // Score display, badges
}
```

Font: System default (no custom fonts). Future: consider adding a branded font.

---

## 3. Component Library

### Core Components
| Component | Location | Purpose |
|-----------|----------|---------|
| Button | `components/common/Button.tsx` | Primary/secondary buttons |
| PressableScale | `components/common/PressableScale.tsx` | Animated press feedback |
| ScoreRing | `components/common/ScoreRing.tsx` | Animated SVG circle score indicator |
| CatAvatar | `components/Mascot/CatAvatar.tsx` | Composable SVG cat (8 moods, 4 sizes, evolution stages, per-cat profiles) |
| SalsaCoach | `components/Mascot/SalsaCoach.tsx` | NPC coach cat (grey with green eyes, teaching poses, catchphrases) |
| MascotBubble | `components/Mascot/MascotBubble.tsx` | Speech bubble for cat dialogue |
| ExerciseBuddy | `components/Mascot/ExerciseBuddy.tsx` | In-exercise cat companion |
| Keyboard | `components/Keyboard/Keyboard.tsx` | Interactive piano keyboard |
| SplitKeyboard | `components/Keyboard/SplitKeyboard.tsx` | Two-hand split keyboard |
| VerticalPianoRoll | `components/PianoRoll/VerticalPianoRoll.tsx` | Falling notes display |
| AchievementToast | `components/transitions/AchievementToast.tsx` | XP/level-up notification |
| EvolutionReveal | `components/transitions/EvolutionReveal.tsx` | Full-screen evolution animation |
| GemEarnPopup | `components/GemEarnPopup.tsx` | Gem reward animation |
| ExerciseCard | `components/transitions/ExerciseCard.tsx` | Quick between-exercise transition |
| LessonCompleteScreen | `components/transitions/LessonCompleteScreen.tsx` | Full lesson celebration |
| FunFactCard | `components/FunFact/FunFactCard.tsx` | Music fun fact display |

### Screens (15 total)
| Screen | Purpose |
|--------|---------|
| AuthScreen | Login/signup entry point |
| EmailAuthScreen | Email/password auth form |
| OnboardingScreen | 4-step new user onboarding |
| SkillAssessmentScreen | Initial skill calibration |
| HomeScreen | Main dashboard with Salsa, daily goal, continue learning |
| DailySessionScreen | "Today's Practice" AI-picked session |
| LevelMapScreen | Duolingo-style vertical lesson map |
| LearnScreen | Legacy lesson list (superseded by LevelMap) |
| PlayScreen | Free play keyboard |
| ExercisePlayer | Core exercise experience |
| ProfileScreen | User stats, settings, account |
| AccountScreen | Account management |
| CatCollectionScreen | Cat gallery with evolution + abilities |
| CatSwitchScreen | Quick cat switcher |
| MidiSetupScreen | MIDI device wizard |
| LessonIntroScreen | Pre-lesson objectives |

---

## 4. Cat Avatar System

### Current: Composable SVG System (Phase 7 Batches 3-4)

The cat avatar system was overhauled from a single-silhouette SVG to a composable part-based system:

#### Architecture
- **`CatParts.tsx`** — Reusable SVG components: CatBody (4 shapes: slim/standard/round/chonky), CatHead, CatEars (3 variants: pointed/rounded/folded), CatEyes (4 variants: round/almond/big-sparkly/sleepy), CatMouth (mood-dependent), CatTail (3 variants: curled/straight/fluffy), CatWhiskers, CatNose
- **`catProfiles.ts`** — Maps each cat ID to a unique combination of body/ears/eyes/tail/cheekFluff/blush
- **`CatAccessories.tsx`** — Evolution-stage accessories (BowTie, Sunglasses, Fedora, Crown, Cape, Monocle)
- **`KeysieSvg.tsx`** — Composable renderer: looks up profile → renders parts → adds accessories
- **`catAnimations.ts`** — Pose system with Reanimated: idle/celebrate/teach/sleep/play/curious/sad

#### Cat Roster (12 Playable + 1 NPC)

| Cat | ID | Body | Pattern | Eyes | Personality |
|-----|----|------|---------|------|-------------|
| Mini Meowww | mini-meowww | slim | tuxedo | big-sparkly | Sweet kitten, encouraging |
| Jazzy | jazzy | slim | solid | almond | Cool jazz cat |
| Luna | luna | standard | solid | almond | Mysterious night owl |
| Biscuit | biscuit | round | tabby | round | Warm, nurturing |
| Ballymakawww | ballymakawww | round | tabby | round | Irish folk enthusiast |
| Aria | aria | slim | solid | big-sparkly | Classical diva |
| Tempo | tempo | slim | solid | round | Rhythm specialist |
| Shibu | shibu | slim | siamese | almond | Zen Japanese Bobtail |
| Bella | bella | round | solid | big-sparkly | Regal white Persian |
| Sable | sable | slim | solid | almond | Moody midnight cat |
| Coda | coda | standard | tabby | round | Cheerful finale cat |
| Chonky Monké | chonky-monke | chonky | spotted | round | Legendary meme cat |
| **Salsa (NPC)** | salsa | standard | solid | big-sparkly | Coach — grey with green eyes |

#### Mood System
Moods: happy, neutral, sleepy, excited, sad, teaching, encouraging, curious
- Eyes change shape per mood
- Mouth expressions per mood
- Pose animations via Reanimated (body translateY/scale, head rotate, tail wag, ear twitch)

#### Evolution Stages
baby → teen → adult → master, with XP thresholds. Each stage unlocks accessories and abilities.

### Future: Rive Animated Characters
The `RiveCatAvatar` component exists as placeholder — `.riv` files need Rive editor design work.

---

## 5. Visual Debt Status (Phase 7 Progress)

### Resolved (Batches 1-6)
1. ~~Cat avatars are static pixel art~~ → **FIXED:** Composable SVG part system, 12 unique profiles, Reanimated poses
2. ~~Pure black backgrounds~~ → **FIXED:** Concert Hall palette (black + crimson) with lava lamp animated gradient
3. ~~No typography system~~ → **FIXED:** Full TYPOGRAPHY scale in tokens.ts
4. ~~Cards lack polish~~ → **FIXED:** SHADOWS sm/md/lg, warm card backgrounds, consistent borders
5. ~~Salsa has no persistent presence~~ → **FIXED:** SalsaCoach component on every screen
6. ~~Home screen is cramped~~ → **FIXED:** Hero redesign with Salsa at center, token-based layout
7. ~~Daily challenge card has debug border~~ → **FIXED:** Proper token-based styling
8. ~~Profile screen is plain settings list~~ → **FIXED:** Cat avatar with evolution badge, stats grid
9. ~~Exercise completion feels abrupt~~ → **FIXED:** ExerciseLoadingScreen interstitial + enhanced CompletionModal

### Remaining (Phase 7 Batches 7-10)
10. Auth screens still need Salsa hero illustration and warm gradients (Batch 7)
11. LevelMapScreen needs warm background and shadowed nodes (Batch 7)
12. No screen transition animations (Batch 8)
13. No button press sound effects
14. No loading/skeleton states (Batch 9)
15. No animated progress bars (Batch 9)

### Low Priority
16. No dark/light mode support
17. No reduced motion support
18. No haptic patterns beyond basic impact
19. Fun facts lack illustrations
20. Streak calendar not visualized

---

## 6. Design Principles (Target)

1. **Salsa is the app.** Every screen should feel like Salsa is your companion. She's large, animated, and central — not a tiny icon in the corner.

2. **Concert Hall feel.** Dark theme should feel like a concert hall — true blacks, crimson accents, slowly shifting dark-red lava lamp gradients. No purple hues anywhere.

3. **Playful geometry.** Rounded corners everywhere, organic shapes, gentle curves. Nothing should feel like a spreadsheet.

4. **Motion is meaning.** Every state change has a transition. XP fills, gems sparkle, cats bounce. Static screens feel broken.

5. **One thing per view.** Each screen has one clear primary action. Don't make users scan — guide their eyes.

6. **Celebrate everything.** Correct note? Flash. Combo? Shake. Star earned? Particles. Level up? Full screen. Evolution? Cinematic.

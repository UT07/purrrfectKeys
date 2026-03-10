# UI Production Revamp — Design Document

**Date:** 2026-03-08
**Approach:** Visual-First Revamp (lead with what users see and hear)

## 1. Sound Overhaul (P0)

### Problem
All 24 sounds are procedurally synthesized via `generateUiSounds.ts` (489 lines). They sound annoying and synthetic.

### Solution
Replace all procedural synthesis with real CC0 audio files from Kenney.nl, Freesound, or Mixkit.

**24 SoundName types to replace:**
`tap`, `success`, `error`, `levelUp`, `achievement`, `streak`, `comboBreak`, `comboTier1`, `comboTier2`, `comboTier3`, `comboTier4`, `starEarn`, `gemEarn`, `chestAppear`, `chestOpen`, `chestReveal`, `xpTick`, `countdown`, `exerciseStart`, `exerciseComplete`, `buttonPress`, `swipe`, `catMeow`, `catPurr`

**Action:**
- Source ~30 CC0 .wav files (short, punchy, game-feel)
- Replace `generateUiSounds.ts` with static file loading
- Keep `SoundManager` API identical — just swap the source
- Keep haptic mapping unchanged

## 2. Cross-Cutting Issues

These patterns recur across 10+ screens. Fix them systematically, not per-screen.

### 2a. TouchableOpacity → PressableScale Migration

**Scope:** 13 of 16 screens use TouchableOpacity. Only SocialScreen, LeaderboardScreen, FriendsScreen (partially) use PressableScale.

**Screens affected:** HomeScreen, ProfileScreen, LevelMapScreen, DailySessionScreen, ExercisePlayer, SongLibraryScreen, SongPlayerScreen, CatSwitchScreen, CatStudioScreen, OnboardingScreen, PlayScreen, AccountScreen, MidiSetupScreen

**Total instances:** ~120+ TouchableOpacity across all screens

### 2b. Inline rgba → `glowColor()` or COLORS Token

**Pattern:** `'rgba(255,255,255,0.2)'`, `'rgba(220,20,60,0.1)'`, `'rgba(0,0,0,0.5)'`
**Fix:** Replace with `glowColor(COLORS.xxx, opacity)` helper (already exists in tokens.ts)
**Scope:** ~60+ instances across 12 screens

### 2c. hex+alpha Concatenation → `glowColor()`

**Pattern:** `config.color + '25'`, `cat.color + '15'`, `iconColor + '20'`
**Fix:** Replace with `glowColor(color, 0.15)` (converts hex opacity to proper rgba)
**Scope:** ~25+ instances across SocialScreen, LeaderboardScreen, FriendsScreen, CatSwitchScreen, OnboardingScreen

### 2d. SPACING Arithmetic → Nearest Token

**Pattern:** `SPACING.sm + 2`, `SPACING.md + 4`, `SPACING.lg + 4`
**Fix:** Use nearest SPACING token value directly (or add SPACING.smPlus if needed)
**Scope:** ~20+ instances across OnboardingScreen, FriendsScreen, AccountScreen, SocialScreen

### 2e. Raw fontSize → TYPOGRAPHY Token

**Pattern:** `fontSize: 10`, `fontSize: 11`, `fontSize: 12`, `fontSize: 36`
**Fix:** Use `TYPOGRAPHY.caption.sm`, `TYPOGRAPHY.body.md`, `TYPOGRAPHY.heading.lg`, etc.
**Scope:** ~50+ instances. Worst offenders: CatSwitchScreen (15+), MidiSetupScreen (8+), PlayScreen (8+)

### 2f. Hardcoded Color Values → COLORS Token

**Pattern:** `'#FFF'`, `'#AAAAAA'`, `'#CD7F32'`, `'#FFFFFF'`
**Fix:** Replace with COLORS.textPrimary, COLORS.textMuted, etc. or add new tokens
**Scope:** ~30+ instances. Includes duplicated `LEAGUE_TIER_CONFIG` (SocialScreen + LeaderboardScreen)

### 2g. Missing Haptic Feedback

**Screens without haptics:** AccountScreen, MidiSetupScreen, PlayScreen, SongPlayerScreen, AddFriendScreen
**Fix:** PressableScale handles this automatically for most cases. Add explicit `Haptics.impactAsync()` for destructive actions.

## 3. Component Fixes

### 3a. Card.tsx
- Ensure full design token adoption (COLORS, SPACING, BORDER_RADIUS, SHADOWS)

### 3b. Button.tsx
- Full token adoption
- Add haptic feedback on press (if not using PressableScale wrapper)

### 3c. GameCard.tsx
- Fix purple tint issue — ensure rarity borders render correctly on dark backgrounds

### 3d. New: SkeletonCard Component
- Create shimmer-loading placeholder for async screens
- Replace `ActivityIndicator` used in SongLibraryScreen, MidiSetupScreen, AccountScreen

## 4. Dead Code Deletion

- **LessonIntroScreen** — deprecated, no navigation routes point to it. Delete.

## 5. Screen-by-Screen Design

### 5a. HomeScreen
**Rating:** B+ (good foundation)
- Good: Design tokens adopted, GameCard borders, CatAvatar integration
- Fix: TouchableOpacity → PressableScale, centralize hardcoded colors, replace inline rgba

### 5b. ProfileScreen → Split into Me + Settings
**Rating:** C (needs major work)
- **Me Screen:** Cat avatar hero, XP/level/streak stats, achievements gallery, share card
- **Settings Screen:** Audio/display/input settings, account link, data management
- Fix: Eliminate all hardcoded values, use tokens throughout, add GradientMeshBackground

### 5c. LevelMapScreen
**Rating:** B (solid adventure-style map)
- Good: Winding path, cat companions at tiers, PulsingGlow, FadeInUp stagger
- Fix: TouchableOpacity → PressableScale, replace any remaining hardcoded values

### 5d. DailySessionScreen
**Rating:** B (functional)
- Fix: TouchableOpacity → PressableScale, token cleanup

### 5e. ExercisePlayer + CompletionModal
**Rating:** A- (best screens in app)
- Good: 10-phase loot reveal, combo escalation, sound integration
- Fix: Minor token cleanup, ensure all inline rgba uses glowColor()

### 5f. SongLibraryScreen
**Rating:** B+ (well-designed)
- Good: Genre carousel, mastery badges, gradient headers
- Fix: TouchableOpacity → PressableScale, replace hardcoded genre colors with tokens

### 5g. SongPlayerScreen
**Rating:** B (solid adapter pattern)
- Good: sectionToExercise() adapter, playContextRef snapshot, design tokens
- Fix: 8 TouchableOpacity instances, 9 inline rgba, raw spacing numbers (4, 6, 8)

### 5h. SocialScreen
**Rating:** B (good PressableScale adoption)
- Good: Already uses PressableScale, design tokens adopted
- Fix: `LEAGUE_TIER_CONFIG` hardcoded colors, 10 inline rgba, hex+alpha concatenation, SPACING arithmetic

### 5i. LeaderboardScreen
**Rating:** B+ (polished)
- Good: PressableScale, FadeInUp stagger, LinearGradient pedestals, podium hero
- Fix: Duplicated `LEAGUE_TIER_CONFIG` (extract to shared constant), hex+alpha, raw marginTop values

### 5j. FriendsScreen
**Rating:** B- (mixed quality)
- Good: PressableScale on challenge button
- Fix: Mixed PressableScale/TouchableOpacity (4 remaining TO), `catEmoji()` text emojis should be CatAvatar, SPACING arithmetic, hex+alpha

### 5k. AddFriendScreen
**Rating:** C+ (needs work)
- Fix: All TouchableOpacity (6 instances, 0 PressableScale), hardcoded fontSize: 36 + letterSpacing: 8 in friend code, no haptic feedback, ActivityIndicator

### 5l. CatSwitchScreen
**Rating:** B (good animations, bad typography)
- Good: SelectBurst particles, LegendaryShimmerBorder, StagePlatform, glowColor() usage
- Fix: Worst typography offender (15+ raw fontSize), fontWeight: 'bold' everywhere, STAGE_COLORS hardcoded, 15+ hex+alpha, CARD_SPACING=12 hardcoded

### 5m. CatStudioScreen
**Rating:** B- (functional but inconsistent)
- Good: SVG accessory thumbnails, expo-haptics on interactions, RARITY tokens
- Fix: All TouchableOpacity (8+), THUMBNAIL_COLORS with 40+ hardcoded hex, 9 inline rgba, raw padding numbers

### 5n. OnboardingScreen
**Rating:** A- (best token adoption)
- Good: Uses Button/Card components, TYPOGRAPHY/COLORS/SPACING consistent, Pressable for cat selection, GradientMeshBackground
- Fix: 7 SPACING arithmetic instances, inline rgba for selected option, hex+alpha for cat cards. Low priority.

### 5o. PlayScreen
**Rating:** B- (good architecture, poor tokens)
- Good: Dual-mode layout, InputManager integration, analysis card, songStyles well-tokenized
- Fix: NOTE_COLORS 12 hardcoded hex, 20+ TouchableOpacity, inline rgba everywhere, raw fontSize (10, 11, 12, 18), no haptics

### 5p. AccountScreen
**Rating:** C (weakest screen)
- Fix: 13+ TouchableOpacity, initial-letter avatar → CatAvatar, text back button → icon, borderRadius: 30 hardcoded, SPACING arithmetic, inline rgba, no GradientMeshBackground, no haptics, Alert.alert → custom modal for delete

### 5q. MidiSetupScreen
**Rating:** C- (most outdated)
- Fix: 8+ TouchableOpacity, emoji/text chars for status → icons/CatAvatar, all fontSize hardcoded, all spacing hardcoded, missing TYPOGRAPHY/SPACING imports, Alert.alert → inline errors, no GradientMeshBackground, no haptics

## 6. Shared Constant Extraction

| Constant | Current Location | Proposed |
|----------|-----------------|----------|
| `LEAGUE_TIER_CONFIG` | SocialScreen + LeaderboardScreen (duplicated) | `src/theme/leagueTiers.ts` |
| `NOTE_COLORS` | PlayScreen | `tokens.ts` as `COLORS.noteWheel` |
| `MEDAL_COLORS` | LeaderboardScreen | Merge into `LEAGUE_TIER_CONFIG` |
| `THUMBNAIL_COLORS` | CatStudioScreen | Keep local but use COLORS.xxx for base values |
| `STAGE_COLORS` | CatSwitchScreen | Move to tokens or use existing COLORS |

## 7. Priority Order

1. **P0 — Sound:** Replace generateUiSounds.ts with CC0 audio files
2. **P0 — Cross-cutting:** TouchableOpacity → PressableScale (all 13 screens)
3. **P1 — Cross-cutting:** Inline rgba → glowColor(), hex+alpha → glowColor()
4. **P1 — Cross-cutting:** Raw fontSize → TYPOGRAPHY, raw spacing → SPACING tokens
5. **P1 — Components:** Card/Button token fixes, SkeletonCard, GameCard purple tint
6. **P1 — Screens:** AccountScreen overhaul, MidiSetupScreen overhaul
7. **P2 — Screens:** ProfileScreen split (Me + Settings)
8. **P2 — Shared:** Extract LEAGUE_TIER_CONFIG, NOTE_COLORS to shared locations
9. **P2 — Screens:** AddFriendScreen, FriendsScreen (catEmoji → CatAvatar)
10. **P3 — Polish:** OnboardingScreen SPACING arithmetic, PlayScreen NOTE_COLORS
11. **P3 — Cleanup:** Delete LessonIntroScreen dead code

## 8. Non-Goals

- **Cat SVG redesign** — cats stay as-is per user decision
- **New screens** — no new user-facing screens (ProfileScreen split reuses existing navigation)
- **Backend changes** — purely frontend/UI work
- **Animation overhaul** — keep existing Reanimated animations, just ensure consistency

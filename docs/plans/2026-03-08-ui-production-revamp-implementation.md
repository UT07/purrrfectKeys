# UI Production Revamp — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace procedural sounds with CC0 audio, migrate all screens to design tokens + PressableScale, fix common components, delete dead code.

**Architecture:** Cross-cutting token/component fixes first (they affect every screen), then screen-by-screen cleanup batched by priority. No backend changes. No new screens (ProfileScreen split is deferred as P2).

**Tech Stack:** React Native, Expo SDK 52, Reanimated, expo-av, expo-haptics, design tokens (src/theme/tokens.ts)

---

## Task 1: Delete Dead Code

**Files:**
- Delete: `src/screens/LessonIntroScreen.tsx`
- Delete: `src/screens/__tests__/LessonIntroScreen.test.tsx`

**Step 1: Verify no navigation references**

Run: `grep -r "LessonIntro" src/navigation/ src/screens/ --include="*.tsx" --include="*.ts" -l`
Expected: Only `LessonIntroScreen.tsx` and its test file. No imports from navigation.

**Step 2: Delete the files**

```bash
rm src/screens/LessonIntroScreen.tsx src/screens/__tests__/LessonIntroScreen.test.tsx
```

**Step 3: Clean up any e2e references**

Search `e2e/` for `LessonIntro` and remove any references (these are dead test flows).

**Step 4: Run tests**

Run: `npm run test -- --passWithNoTests 2>&1 | tail -5`
Expected: All tests pass (minus the deleted test file)

**Step 5: Commit**

```bash
git add -u
git commit -m "chore: delete dead LessonIntroScreen code"
```

---

## Task 2: Fix GameCard Purple Tint

**Files:**
- Modify: `src/components/common/GameCard.tsx`

**Step 1: Fix the hardcoded purple background**

In `GameCard.tsx`, replace:
```typescript
backgroundColor: 'rgba(26, 22, 40, 0.85)',
```
with:
```typescript
backgroundColor: COLORS.cardSurface,
```

Add `COLORS` to the import from `../../theme/tokens`.

**Step 2: Run tests**

Run: `npm run test -- --testPathPattern GameCard 2>&1 | tail -5`
Expected: PASS (or no tests — GameCard has no test file)

**Step 3: Commit**

```bash
git add src/components/common/GameCard.tsx
git commit -m "fix: remove purple tint from GameCard background"
```

---

## Task 3: Fix Card.tsx — Design Token Adoption

**Files:**
- Modify: `src/components/common/Card.tsx`

**Step 1: Replace hardcoded values with tokens**

Replace the import section — add tokens:
```typescript
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING } from '../../theme/tokens';
import { PressableScale } from './PressableScale';
```

Replace the PADDING map:
```typescript
const PADDING = {
  none: 0,
  small: SPACING.sm,    // was 8
  medium: SPACING.md,   // was 12 → now 16 (md token)
  large: SPACING.lg,    // was 16 → now 24 (lg token)
};
```

Replace styles:
```typescript
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardSurface,  // was '#1A1A1A'
    borderRadius: BORDER_RADIUS.md,       // was 12
    borderWidth: 1,
    borderColor: COLORS.cardBorder,       // was '#2A2A2A'
  },
  elevated: {
    ...SHADOWS.sm,  // was manual shadow values
  },
});
```

Replace `TouchableOpacity` wrapper with `PressableScale`:
```typescript
if (onPress) {
  return (
    <PressableScale onPress={onPress} testID={testID} style={[styles.card, elevated && styles.elevated, { padding: PADDING[padding] }, style]}>
      {children}
    </PressableScale>
  );
}
```

Remove the Content wrapper pattern — PressableScale wraps children directly.

**Step 2: Remove TouchableOpacity import**

Remove `TouchableOpacity` from the react-native import.

**Step 3: Run tests**

Run: `npm run test -- --testPathPattern Card 2>&1 | tail -10`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/common/Card.tsx
git commit -m "fix: Card component uses design tokens + PressableScale"
```

---

## Task 4: Fix Button.tsx — PressableScale + Haptics

**Files:**
- Modify: `src/components/common/Button.tsx`

**Step 1: Replace TouchableOpacity with PressableScale**

Replace the `TouchableOpacity` import and usage. The Button already has its own Animated.View scale animation via Reanimated — replace the entire scale logic with PressableScale which provides the same thing plus sound+haptic automatically.

Updated component (simplified):
```typescript
import { PressableScale } from './PressableScale';
// Remove: TouchableOpacity from react-native import
// Remove: useSharedValue, useAnimatedStyle, withTiming, Easing from reanimated import
// Remove: scaleValue, handlePressIn, handlePressOut, animatedStyle logic

return (
  <PressableScale
    onPress={handlePress}
    disabled={disabled || loading}
    testID={testID}
    style={[
      styles.button,
      {
        backgroundColor,
        paddingVertical: sizeStyle.paddingVertical,
        paddingHorizontal: sizeStyle.paddingHorizontal,
        borderWidth: variant === 'outline' ? 2 : 0,
        borderColor: variant === 'outline' ? BTN_COLORS.outline : 'transparent',
      },
      style,
    ]}
  >
    {loading ? (
      <ActivityIndicator color={textColor} size="small" />
    ) : (
      <Text style={[styles.buttonText, { fontSize: sizeStyle.fontSize, color: textColor }]}>
        {icon && <>{icon} </>}
        {title}
      </Text>
    )}
  </PressableScale>
);
```

**Step 2: Clean up unused imports**

Remove `Animated`, `useSharedValue`, `useAnimatedStyle`, `withTiming`, `Easing` if no longer used.

**Step 3: Run tests**

Run: `npm run test -- --testPathPattern Button 2>&1 | tail -10`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/common/Button.tsx
git commit -m "fix: Button uses PressableScale for haptics + scale animation"
```

---

## Task 5: Create SkeletonCard Component

**Files:**
- Create: `src/components/common/SkeletonCard.tsx`

**Step 1: Write the component**

```typescript
/**
 * SkeletonCard — shimmer-loading placeholder for async content.
 * Replaces ActivityIndicator across the app.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, BORDER_RADIUS, SPACING, ANIMATION_CONFIG } from '../../theme/tokens';

interface SkeletonCardProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SkeletonCard({
  width = '100%',
  height = 80,
  borderRadius = BORDER_RADIUS.md,
  style,
  testID,
}: SkeletonCardProps): React.JSX.Element {
  const shimmer = useSharedValue(0.3);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(0.6, { duration: ANIMATION_CONFIG.duration.slow * 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <Animated.View
      testID={testID}
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: COLORS.cardSurface,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonLine({
  width = '60%',
  height = 14,
  style,
}: {
  width?: number | string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  return <SkeletonCard width={width} height={height} borderRadius={BORDER_RADIUS.sm} style={style} />;
}
```

**Step 2: Export from barrel**

Add to `src/components/common/index.ts` (if it exists) or just import directly.

**Step 3: Run typecheck**

Run: `npm run typecheck 2>&1 | tail -5`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/common/SkeletonCard.tsx
git commit -m "feat: add SkeletonCard shimmer loading component"
```

---

## Task 6: Extract Shared League Config

**Files:**
- Create: `src/theme/leagueTiers.ts`
- Modify: `src/screens/SocialScreen.tsx`
- Modify: `src/screens/LeaderboardScreen.tsx`

**Step 1: Create shared config**

```typescript
/**
 * League tier configuration — shared between SocialScreen and LeaderboardScreen.
 */
import { COLORS } from './tokens';

export interface LeagueTierConfig {
  label: string;
  color: string;
  icon: string; // MaterialCommunityIcons name
}

export const LEAGUE_TIER_CONFIG: Record<string, LeagueTierConfig> = {
  bronze:  { label: 'Bronze',  color: '#CD7F32', icon: 'shield-outline' },
  silver:  { label: 'Silver',  color: '#C0C0C0', icon: 'shield-half-full' },
  gold:    { label: 'Gold',    color: '#FFD700', icon: 'shield' },
  diamond: { label: 'Diamond', color: '#B9F2FF', icon: 'shield-star' },
};

/** Medal colors for leaderboard podium positions */
export const MEDAL_COLORS = {
  gold: COLORS.starGold,
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;
```

**Step 2: Update SocialScreen**

Replace local `LEAGUE_TIER_CONFIG` with import from `../../theme/leagueTiers`.

**Step 3: Update LeaderboardScreen**

Replace local `LEAGUE_TIER_CONFIG` and `MEDAL_COLORS` with imports from `../../theme/leagueTiers`.

**Step 4: Run tests**

Run: `npm run test -- --testPathPattern "(Social|Leaderboard)" 2>&1 | tail -10`
Expected: PASS

**Step 5: Commit**

```bash
git add src/theme/leagueTiers.ts src/screens/SocialScreen.tsx src/screens/LeaderboardScreen.tsx
git commit -m "refactor: extract LEAGUE_TIER_CONFIG to shared module"
```

---

## Task 7: Add noteWheel Colors to Tokens

**Files:**
- Modify: `src/theme/tokens.ts`
- Modify: `src/screens/PlayScreen.tsx`

**Step 1: Add noteWheel to COLORS**

In `tokens.ts`, add after `comboGold`:
```typescript
  // Note visualization (12-tone color wheel)
  noteWheel: [
    '#FF6B6B', '#FF8E53', '#FFD93D', '#6BCB77',
    '#4ECDC4', '#45B7D1', '#4FC3F7', '#7C83FD',
    '#9B59B6', '#E056A0', '#FF6B6B', '#C0C0C0',
  ] as const,
```

**Step 2: Update PlayScreen**

Replace the local `NOTE_COLORS` array with `COLORS.noteWheel` from tokens import.

**Step 3: Run typecheck**

Run: `npm run typecheck 2>&1 | tail -5`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/theme/tokens.ts src/screens/PlayScreen.tsx
git commit -m "refactor: move NOTE_COLORS to tokens.noteWheel"
```

---

## Task 8: Sound Overhaul — Replace Procedural Synthesis

**Files:**
- Create: `assets/sounds/` directory with CC0 .wav files
- Modify: `src/audio/SoundManager.ts`
- Delete: `src/audio/generateUiSounds.ts` (after replacement confirmed)

**Step 1: Create sound asset directory**

```bash
mkdir -p assets/sounds
```

**Step 2: Source and download CC0 sound files**

Download ~25 short CC0 .wav files from Kenney.nl game audio packs, Freesound, or sfxr.me/jsfxr.

Required files (matching SoundName types):
```
assets/sounds/
├── button_press.wav      # Short click/tap
├── toggle_on.wav         # Switch on
├── toggle_off.wav        # Switch off
├── swipe.wav             # Whoosh
├── back_navigate.wav     # Soft pop-back
├── note_correct.wav      # Bright chime
├── note_perfect.wav      # Sparkling ding
├── note_miss.wav         # Soft buzz/thud
├── combo_5.wav           # Rising tone
├── combo_10.wav          # Power-up
├── combo_20.wav          # Epic riser
├── combo_break.wav       # Record scratch / glass break
├── countdown_tick.wav    # Metronome tick
├── countdown_go.wav      # Start horn / bright stab
├── star_earn.wav         # Star collect ding
├── gem_clink.wav         # Coin/gem clink
├── xp_tick.wav           # Subtle tick
├── level_up.wav          # Fanfare
├── chest_open.wav        # Chest creak
├── evolution_start.wav   # Magic sparkle riser
├── exercise_complete.wav # Victory stinger
├── meow_greeting.wav     # Cat meow (cute)
├── purr_happy.wav        # Cat purr loop
├── meow_sad.wav          # Sad meow
└── meow_celebrate.wav    # Excited meow
```

Each file should be:
- Format: WAV (16-bit, 44.1kHz mono)
- Duration: 0.1s–2s (shorter is better for UI sounds)
- License: CC0 / Public Domain

**Step 3: Update SoundManager to load from assets**

Replace `generateAllSoundUris()` import with a static require map:

```typescript
const SOUND_ASSETS: Record<SoundName, ReturnType<typeof require>> = {
  button_press: require('../../assets/sounds/button_press.wav'),
  toggle_on: require('../../assets/sounds/toggle_on.wav'),
  toggle_off: require('../../assets/sounds/toggle_off.wav'),
  swipe: require('../../assets/sounds/swipe.wav'),
  back_navigate: require('../../assets/sounds/back_navigate.wav'),
  note_correct: require('../../assets/sounds/note_correct.wav'),
  note_perfect: require('../../assets/sounds/note_perfect.wav'),
  note_miss: require('../../assets/sounds/note_miss.wav'),
  combo_5: require('../../assets/sounds/combo_5.wav'),
  combo_10: require('../../assets/sounds/combo_10.wav'),
  combo_20: require('../../assets/sounds/combo_20.wav'),
  combo_break: require('../../assets/sounds/combo_break.wav'),
  countdown_tick: require('../../assets/sounds/countdown_tick.wav'),
  countdown_go: require('../../assets/sounds/countdown_go.wav'),
  star_earn: require('../../assets/sounds/star_earn.wav'),
  gem_clink: require('../../assets/sounds/gem_clink.wav'),
  xp_tick: require('../../assets/sounds/xp_tick.wav'),
  level_up: require('../../assets/sounds/level_up.wav'),
  chest_open: require('../../assets/sounds/chest_open.wav'),
  evolution_start: require('../../assets/sounds/evolution_start.wav'),
  exercise_complete: require('../../assets/sounds/exercise_complete.wav'),
  meow_greeting: require('../../assets/sounds/meow_greeting.wav'),
  purr_happy: require('../../assets/sounds/purr_happy.wav'),
  meow_sad: require('../../assets/sounds/meow_sad.wav'),
  meow_celebrate: require('../../assets/sounds/meow_celebrate.wav'),
};
```

Replace the preload method:
```typescript
async preload(): Promise<void> {
  if (this.preloaded) return;

  const entries = Object.entries(SOUND_ASSETS) as [SoundName, ReturnType<typeof require>][];

  const results = await Promise.allSettled(
    entries.map(async ([name, asset]) => {
      const { sound } = await Audio.Sound.createAsync(
        asset,
        { volume: this.volume, shouldPlay: false },
      );
      this.sounds.set(name, { sound });
    }),
  );

  for (const r of results) {
    if (r.status === 'rejected') {
      logger.warn('[SoundManager] Failed to preload sound:', r.reason);
    }
  }

  this.preloaded = true;
}
```

Remove the `generateAllSoundUris` import.

**Step 4: Delete generateUiSounds.ts**

```bash
rm src/audio/generateUiSounds.ts
```

**Step 5: Update any tests that mock generateUiSounds**

Search for mocks of `generateUiSounds` or `generateAllSoundUris` and update.

Run: `grep -r "generateUiSounds\|generateAllSoundUris" src/ --include="*.ts" --include="*.tsx" -l`

**Step 6: Run tests**

Run: `npm run test 2>&1 | tail -10`
Expected: All pass

**Step 7: Commit**

```bash
git add assets/sounds/ src/audio/SoundManager.ts
git rm src/audio/generateUiSounds.ts
git commit -m "feat: replace procedural sounds with CC0 audio files"
```

---

## Task 9: Cross-Cutting — TouchableOpacity → PressableScale (Batch 1: Low-Risk Screens)

**Files:**
- Modify: `src/screens/MidiSetupScreen.tsx`
- Modify: `src/screens/AddFriendScreen.tsx`
- Modify: `src/screens/AccountScreen.tsx`

These are the lowest-traffic screens, so safest to migrate first.

**Step 1: MidiSetupScreen migration**

For each screen, the pattern is:

1. Add import: `import { PressableScale } from '../components/common/PressableScale';`
2. Remove `TouchableOpacity` from the react-native import
3. Replace every `<TouchableOpacity` with `<PressableScale`
4. Replace every `</TouchableOpacity>` with `</PressableScale>`
5. Remove `activeOpacity={...}` props (PressableScale doesn't use them)

Also for MidiSetupScreen:
- Add `TYPOGRAPHY, SPACING` to token imports
- Replace `fontSize: 28` → `...TYPOGRAPHY.display.md`
- Replace `fontSize: 14` → `...TYPOGRAPHY.body.md`
- Replace `fontSize: 12` → `...TYPOGRAPHY.caption.lg`
- Replace `fontSize: 16` → `...TYPOGRAPHY.heading.sm`
- Replace `padding: 20` → `padding: SPACING.lg`
- Replace `marginBottom: 30` → `marginBottom: SPACING.xl`
- Replace `paddingVertical: 40` → `paddingVertical: SPACING.xxl`
- Replace `marginBottom: 8` → `marginBottom: SPACING.sm`
- Replace `marginBottom: 16` → `marginBottom: SPACING.md`
- Replace `marginRight: 12` → `marginRight: SPACING.md`
- Replace `'#FFFFFF'` → `COLORS.textPrimary`
- Replace back button text `← Back` with MaterialCommunityIcons `arrow-left` icon
- Replace emoji `🎉` with success icon or CatAvatar celebrate pose
- Replace `✓` / `✗` text with MaterialCommunityIcons `check-circle` / `close-circle`

**Step 2: AddFriendScreen migration**

Same TouchableOpacity → PressableScale pattern. Also:
- Replace `fontSize: 36` → `...TYPOGRAPHY.display.lg`
- Replace `letterSpacing: 8` → `letterSpacing: 8` (keep — this is intentional for friend code display)
- Replace ActivityIndicator with SkeletonCard where appropriate

**Step 3: AccountScreen migration**

Same pattern. Also:
- Replace text back button `← Account` with icon button
- Replace `borderRadius: 30` → `borderRadius: BORDER_RADIUS.full`
- Replace `marginTop: 2` → `marginTop: 2` (keep — sub-pixel alignment)
- Replace `paddingVertical: 6` → `paddingVertical: SPACING.sm`
- Replace `SPACING.sm + 4` → `SPACING.md` (sm=8, sm+4=12, md=16 — closest token)
- Replace `'rgba(239, 83, 80, 0.15)'` → `glowColor(COLORS.error, 0.15)`
- Add `glowColor` to token imports

**Step 4: Run tests**

Run: `npm run test -- --testPathPattern "(MidiSetup|AddFriend|Account)" 2>&1 | tail -10`
Expected: PASS

**Step 5: Run typecheck**

Run: `npm run typecheck 2>&1 | tail -5`
Expected: 0 errors

**Step 6: Commit**

```bash
git add src/screens/MidiSetupScreen.tsx src/screens/AddFriendScreen.tsx src/screens/AccountScreen.tsx
git commit -m "refactor: migrate MidiSetup, AddFriend, Account to PressableScale + tokens"
```

---

## Task 10: Cross-Cutting — TouchableOpacity → PressableScale (Batch 2: Song Screens)

**Files:**
- Modify: `src/screens/SongPlayerScreen.tsx`
- Modify: `src/screens/SongLibraryScreen.tsx`

**Step 1: SongPlayerScreen migration**

Replace 8 TouchableOpacity instances with PressableScale. Also:
- Replace 9 inline rgba with `glowColor()`: e.g. `'rgba(255,255,255,0.2)'` → `glowColor('#FFFFFF', 0.2)`
- Replace raw spacing: `paddingHorizontal: 8` → `paddingHorizontal: SPACING.sm`, `paddingVertical: 2` → `paddingVertical: 2` (keep sub-4 values)

**Step 2: SongLibraryScreen migration**

Replace TouchableOpacity instances with PressableScale. Replace hardcoded genre colors with token references where possible.

**Step 3: Run tests**

Run: `npm run test -- --testPathPattern "Song" 2>&1 | tail -10`
Expected: PASS

**Step 4: Commit**

```bash
git add src/screens/SongPlayerScreen.tsx src/screens/SongLibraryScreen.tsx
git commit -m "refactor: migrate SongPlayer, SongLibrary to PressableScale + tokens"
```

---

## Task 11: Cross-Cutting — TouchableOpacity → PressableScale (Batch 3: Play + Cat Screens)

**Files:**
- Modify: `src/screens/PlayScreen.tsx`
- Modify: `src/screens/CatStudioScreen.tsx`
- Modify: `src/screens/CatSwitchScreen.tsx`

**Step 1: PlayScreen migration**

Replace 20+ TouchableOpacity instances. Also:
- Replace inline rgba (8+ instances) with `glowColor()`
- Replace raw fontSize values: `fontSize: 10` → `...TYPOGRAPHY.caption.sm`, `fontSize: 11` → `...TYPOGRAPHY.caption.md`, `fontSize: 18` → `...TYPOGRAPHY.heading.md`
- Replace `'rgba(0,0,0,0.5)'` → `glowColor('#000000', 0.5)`
- Replace `'#fff'` → `COLORS.textPrimary`

**Step 2: CatStudioScreen migration**

Replace 8+ TouchableOpacity instances. Also:
- Replace 9 inline rgba with `glowColor()`
- Replace `'#FFF'` and `'#AAAAAA'` with COLORS tokens
- Replace raw padding numbers (4, 5, 6, 7, 8, 14) with nearest SPACING tokens

**Step 3: CatSwitchScreen migration**

This is the largest migration (15+ raw fontSize). Replace:
- All TouchableOpacity → PressableScale
- `fontSize: 10` → `...TYPOGRAPHY.caption.sm`
- `fontSize: 11` → `...TYPOGRAPHY.caption.md`
- `fontSize: 12` → `...TYPOGRAPHY.caption.lg`
- `fontSize: 13` → `...TYPOGRAPHY.body.sm`
- `fontSize: 14` → `...TYPOGRAPHY.body.md`
- `fontSize: 16` → `...TYPOGRAPHY.heading.sm`
- `fontSize: 20` → `...TYPOGRAPHY.heading.lg`
- `fontSize: 22` → `...TYPOGRAPHY.display.sm`
- `fontSize: 24` → `...TYPOGRAPHY.display.sm`
- `fontWeight: 'bold'` → use TYPOGRAPHY token that includes fontWeight
- Replace 15+ hex+alpha concatenation with `glowColor()`
- Replace `CARD_SPACING = 12` → `SPACING.md` (or keep if layout-specific)
- Replace `borderRadius: 20` → `BORDER_RADIUS.xl`

**Step 4: Run tests**

Run: `npm run test -- --testPathPattern "(Play|Cat)" 2>&1 | tail -10`
Expected: PASS

**Step 5: Run typecheck**

Run: `npm run typecheck 2>&1 | tail -5`
Expected: 0 errors

**Step 6: Commit**

```bash
git add src/screens/PlayScreen.tsx src/screens/CatStudioScreen.tsx src/screens/CatSwitchScreen.tsx
git commit -m "refactor: migrate PlayScreen, CatStudio, CatSwitch to PressableScale + tokens"
```

---

## Task 12: Cross-Cutting — TouchableOpacity → PressableScale (Batch 4: Core Screens)

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/DailySessionScreen.tsx`
- Modify: `src/screens/OnboardingScreen.tsx`
- Modify: `src/screens/ProfileScreen.tsx`

**Step 1: HomeScreen migration**

Replace TouchableOpacity instances. Fix inline rgba and hardcoded colors.

**Step 2: DailySessionScreen migration**

Replace TouchableOpacity instances. Token cleanup.

**Step 3: OnboardingScreen migration**

This screen already uses `Pressable` for cat selection — only fix:
- 7 SPACING arithmetic instances → nearest token
- `'rgba(220, 20, 60, 0.1)'` → `glowColor(COLORS.primary, 0.1)`
- `cat.color + '15'` → `glowColor(cat.color, 0.09)` (hex '15' ≈ 8% opacity)
- `cat.color + '30'` → `glowColor(cat.color, 0.19)` (hex '30' ≈ 19% opacity)

**Step 4: ProfileScreen migration**

Replace TouchableOpacity instances. Fix hardcoded values with tokens.

**Step 5: Run tests**

Run: `npm run test -- --testPathPattern "(Home|Daily|Onboarding|Profile)" 2>&1 | tail -10`
Expected: PASS

**Step 6: Run full test suite**

Run: `npm run typecheck && npm run test 2>&1 | tail -10`
Expected: 0 TS errors, all tests pass

**Step 7: Commit**

```bash
git add src/screens/HomeScreen.tsx src/screens/DailySessionScreen.tsx src/screens/OnboardingScreen.tsx src/screens/ProfileScreen.tsx
git commit -m "refactor: migrate Home, DailySession, Onboarding, Profile to PressableScale + tokens"
```

---

## Task 13: Cross-Cutting — Social Screen Token Cleanup

**Files:**
- Modify: `src/screens/SocialScreen.tsx`
- Modify: `src/screens/LeaderboardScreen.tsx`
- Modify: `src/screens/FriendsScreen.tsx`

These screens already partially use PressableScale. Fix remaining issues.

**Step 1: SocialScreen**

- Replace 10 inline rgba → `glowColor()`
- Replace hex+alpha (`config.color + '25'`) → `glowColor(config.color, 0.15)`
- Replace `SPACING.sm + 2` → `SPACING.sm` (close enough) or `12` (explicit)
- Import `LEAGUE_TIER_CONFIG` from `../../theme/leagueTiers` (delete local copy)

**Step 2: LeaderboardScreen**

- Import `LEAGUE_TIER_CONFIG, MEDAL_COLORS` from `../../theme/leagueTiers` (delete local copies)
- Replace hex+alpha → `glowColor()`
- Replace `marginTop: 2` → keep (sub-pixel alignment)

**Step 3: FriendsScreen**

- Replace 4 remaining TouchableOpacity → PressableScale
- Replace `catEmoji()` function: import `CatAvatar` and render mini avatar instead of text emoji
- Replace `SPACING.sm + 2` and `SPACING.xs + 2` → nearest token
- Replace hex+alpha → `glowColor()`

**Step 4: Run tests**

Run: `npm run test -- --testPathPattern "(Social|Leaderboard|Friends)" 2>&1 | tail -10`
Expected: PASS

**Step 5: Commit**

```bash
git add src/screens/SocialScreen.tsx src/screens/LeaderboardScreen.tsx src/screens/FriendsScreen.tsx
git commit -m "refactor: Social screens token cleanup + shared league config"
```

---

## Task 14: Cross-Cutting — ExercisePlayer Token Cleanup

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`
- Modify: `src/screens/ExercisePlayer/CompletionModal.tsx` (if separate file)

**Step 1: Audit inline rgba usage**

These are the best screens in the app — only fix remaining inline rgba with `glowColor()` and any stray hardcoded values. Do NOT change functional behavior.

**Step 2: Run tests**

Run: `npm run test -- --testPathPattern "Exercise" 2>&1 | tail -10`
Expected: PASS

**Step 3: Commit**

```bash
git add src/screens/ExercisePlayer/
git commit -m "refactor: ExercisePlayer minor token cleanup"
```

---

## Task 15: LevelMapScreen Token Cleanup

**Files:**
- Modify: `src/screens/LevelMapScreen.tsx`

**Step 1: Replace any remaining TouchableOpacity → PressableScale**

**Step 2: Fix any hardcoded colors or spacing**

**Step 3: Run tests**

Run: `npm run test -- --testPathPattern "LevelMap" 2>&1 | tail -10`
Expected: PASS

**Step 4: Commit**

```bash
git add src/screens/LevelMapScreen.tsx
git commit -m "refactor: LevelMapScreen token cleanup"
```

---

## Task 16: Final Verification

**Step 1: Run full typecheck**

Run: `npm run typecheck 2>&1 | tail -10`
Expected: 0 errors

**Step 2: Run full test suite**

Run: `npm run test 2>&1 | tail -10`
Expected: All 122+ suites pass, 0 failures

**Step 3: Run lint**

Run: `npm run lint 2>&1 | tail -10`
Expected: 0 errors (warnings OK)

**Step 4: Verify no TouchableOpacity remains in screens**

Run: `grep -r "TouchableOpacity" src/screens/ --include="*.tsx" -l`
Expected: Empty (no matches). Some may remain in `src/components/` — that's OK if they're in components that will be replaced by PressableScale usage.

**Step 5: Verify no generateUiSounds references remain**

Run: `grep -r "generateUiSounds\|generateAllSoundUris" src/ --include="*.ts" --include="*.tsx"`
Expected: No matches

**Step 6: Commit any remaining fixes**

```bash
git add -u
git commit -m "chore: final verification — all screens migrated to design tokens"
```

---

## Execution Summary

| Task | Description | Priority | Est. Effort |
|------|-------------|----------|-------------|
| 1 | Delete LessonIntroScreen | P3 | trivial |
| 2 | Fix GameCard purple tint | P1 | trivial |
| 3 | Card.tsx tokens + PressableScale | P1 | small |
| 4 | Button.tsx PressableScale + haptics | P1 | small |
| 5 | Create SkeletonCard | P1 | small |
| 6 | Extract LEAGUE_TIER_CONFIG | P2 | small |
| 7 | Add noteWheel to tokens | P2 | trivial |
| 8 | Sound overhaul (CC0 files) | P0 | medium |
| 9 | TO→PS Batch 1: MidiSetup, AddFriend, Account | P0 | medium |
| 10 | TO→PS Batch 2: SongPlayer, SongLibrary | P0 | medium |
| 11 | TO→PS Batch 3: Play, CatStudio, CatSwitch | P0 | large |
| 12 | TO→PS Batch 4: Home, Daily, Onboarding, Profile | P0 | large |
| 13 | Social screens token cleanup | P1 | medium |
| 14 | ExercisePlayer token cleanup | P1 | small |
| 15 | LevelMapScreen token cleanup | P2 | small |
| 16 | Final verification | — | small |

**Total: 16 tasks, ~16 commits**

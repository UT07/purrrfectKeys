# KeySense Responsive Design Guide

Complete guide for handling different screen sizes, orientations, and devices.

---

## Screen Size Breakpoints

### Mobile Phones

**Small Phones (4-5 inches)**
- iPhone SE (3rd gen): 375x667
- iPhone 8: 375x667
- Pixel 5a: 393x851

**Standard Phones (5-5.5 inches)**
- iPhone 13/14: 390x844
- Pixel 6: 412x915
- OnePlus 9: 412x915

**Large Phones (6+ inches)**
- iPhone 14 Pro Max: 430x932
- Pixel 6 Pro: 440x915
- Galaxy S21+: 480x900

### Tablets

**iPad Mini**: 768x1024 (portrait)
**iPad (10.2")**: 810x1080 (portrait)
**iPad Pro (11")**: 834x1194 (portrait)
**iPad Pro (12.9")**: 1024x1366 (portrait)

---

## Keyboard Layout Responsiveness

### Portrait Mode

**Layout**: Full-width keyboard at bottom

```
┌─────────────────────────────┐
│                             │  ← 100% width
│  Exercise Content           │
│                             │
│  (Exercise player)          │
│                             │
├─────────────────────────────┤
│  ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐   │  ← Keyboard
│  │ │█│ │█│ │ │█│ │█│ │   │  ← 100% width
│  └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘   │
└─────────────────────────────┘
```

**Key Heights:**
- Small phones (height < 700): 70px white keys
- Standard phones: 80px white keys
- Large phones: 90-100px white keys
- Tablets: 120px white keys

**Key Widths:**
- Calculated automatically: screenWidth / 7
- Responsive to orientation changes
- Maintains proper white/black key proportions

### Landscape Mode

**Layout**: Keyboard on side or reduced height

```
Exercise       Keyboard
Content        (scrollable)
(shrinks)      ┌─┬─┬─┬─┐
               │ │█│ │█│
               └─┴─┴─┴─┘
```

**Keyboard Height:**
- Calculate: screenHeight * 0.4 (40% of screen)
- Minimum: 60px (never smaller)
- Maximum: 150px (for large tablets)

### Tablet Landscape

**Layout**: Side-by-side with larger keyboard

```
Exercise Content Area      │ Keyboard
(70% width)                │ (30% width,
Multiple octaves           │  scrollable)
visible at once            │
                           │
```

---

## Component Scaling

### PianoKey Sizing

```typescript
// Calculate based on screen width
const screenWidth = Dimensions.get('window').width;
const whiteKeyWidth = screenWidth / 7;  // 7 white keys per octave

// Calculate based on screen height
const screenHeight = Dimensions.get('window').height;
const keyHeight = Math.min(
  100,  // Maximum 100px
  Math.max(
    70,   // Minimum 70px
    screenHeight * 0.15  // 15% of screen height
  )
);
```

### PianoRoll Scaling

```typescript
// Height: 25-40% of available space
const pianoRollHeight = screenHeight * 0.35;

// Note visualization scaling
const pixelsPerBeat = screenWidth / 4;  // 4 beats visible at once
```

### Progress Components

**XPBar:**
- Height: 60px (fixed)
- Padding: 16px (left/right), 12px (top/bottom)
- Font sizes: 14px (label), 20px (level)

**StreakDisplay:**
- Height: 80-100px (scales with content)
- Card padding: 12px
- Icon size: 28-32px

---

## Font Scaling

### Typography Hierarchy

```typescript
const fontSizes = {
  // Headings
  h1: screenWidth < 400 ? 20 : 24,  // Title
  h2: screenWidth < 400 ? 16 : 18,  // Section title
  h3: screenWidth < 400 ? 14 : 16,  // Subsection

  // Body text
  body: screenWidth < 400 ? 12 : 14,
  caption: screenWidth < 400 ? 10 : 12,

  // Labels
  label: screenWidth < 400 ? 11 : 13,
};
```

### Minimum Text Sizes
- Body text: 12px minimum
- Labels: 10px minimum
- Should increase by 1-2px on tablets

---

## Touch Target Sizing

### Accessibility Standards
- Minimum: 44x44dp (Apple) / 48x48dp (Material)
- Preferred: 48x56dp (larger buttons)
- Spacing between targets: 8dp minimum

### KeySense Targets

**Keyboard Keys:**
- White key width: screenWidth / 7 (~50-60px on phones)
- White key height: 70-100px
- Black key width: 60% of white key width
- Spacing: 2px between keys

**Buttons:**
- Play/Pause: 56x56px (minimum)
- Settings: 44x44px (minimum)
- Navigation: 56x56px (preferred)

**Touch Feedback:**
- Highlight color change
- Spring animation scale: 0.95
- Haptic feedback
- No delay (<100ms)

---

## Safe Area Handling

### Notch & Status Bar

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { top, bottom, left, right } = useSafeAreaInsets();

// Apply padding
<View style={{
  paddingTop: top,
  paddingBottom: bottom,
  paddingLeft: left,
  paddingRight: right,
}}>
```

### Component Insets
- Header: Top safe area + 12px padding
- Keyboard: Bottom safe area + 8px padding
- Floating buttons: Bottom safe area + 16px padding

---

## Orientation Handling

### Detect Orientation

```typescript
import { useWindowDimensions } from 'react-native';

export function useOrientation() {
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;
  const isLandscape = width > height;

  return { isPortrait, isLandscape };
}
```

### Responsive Component

```typescript
const { isPortrait } = useOrientation();

return (
  <View style={isPortrait ? styles.portraitLayout : styles.landscapeLayout}>
    {/* Content */}
  </View>
);
```

---

## Responsive Examples

### Keyboard Responsive Hook

```typescript
export function useKeyboardDimensions() {
  const { width, height } = useWindowDimensions();
  const { isPortrait } = useOrientation();

  const keyHeight = useMemo(() => {
    if (isPortrait) {
      return Math.min(
        100,
        Math.max(70, height * 0.12)
      );
    } else {
      return Math.min(80, Math.max(60, height * 0.25));
    }
  }, [width, height, isPortrait]);

  const keyWidth = useMemo(() => {
    return width / 7;  // 7 white keys per octave
  }, [width]);

  return { keyHeight, keyWidth };
}
```

### Exercise Screen Layout

```typescript
export function ExerciseScreen() {
  const { isPortrait } = useOrientation();
  const { width, height } = useWindowDimensions();

  const pianoRollHeight = isPortrait
    ? height * 0.35
    : height * 0.5;

  const keyboardHeight = isPortrait
    ? height * 0.2
    : height * 0.3;

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        {/* Content takes available space */}
      </View>

      <PianoRoll style={{ height: pianoRollHeight }} />
      <Keyboard style={{ height: keyboardHeight }} />
    </SafeAreaView>
  );
}
```

---

## Device-Specific Adjustments

### iPhone (Notch & Dynamic Island)

```typescript
const iPhone12Plus = { width: 428, height: 926 };
const iPhoneSE = { width: 375, height: 667 };
const iPhone14Pro = { width: 393, height: 852 };

// Use safe area + top padding for notch
<View style={{
  paddingTop: top + 8,  // Extra padding for notch area
}}>
```

### Android Landscape (Navigation Bar)

```typescript
// Account for navbar on Android
const bottomPadding = isAndroid && isLandscape
  ? bottom + 30
  : bottom;
```

### Foldable Devices

```typescript
// Detect foldable
const useFoldableLayout = () => {
  const { width, height } = useWindowDimensions();
  const isFoldable = width > 1000 && height > 1000;

  return {
    isFoldable,
    // Use split-screen layout on foldables
  };
};
```

---

## Media Queries & Responsive Styling

### Screen Size Utilities

```typescript
export const responsiveSize = (
  small: number,
  medium: number,
  large: number,
  screenWidth: number
) => {
  if (screenWidth < 400) return small;
  if (screenWidth < 700) return medium;
  return large;
};

// Usage:
const fontSize = responsiveSize(12, 14, 16, screenWidth);
```

### Breakpoint Constants

```typescript
export const BREAKPOINTS = {
  small: 375,    // Small phones
  medium: 600,   // Standard phones
  large: 768,    // Tablets
  xlarge: 1024,  // Large tablets
};

// Usage:
const isTablet = screenWidth >= BREAKPOINTS.large;
```

---

## Testing Responsive Design

### Screen Sizes to Test

- **iPhone SE**: 375x667 (smallest)
- **iPhone 14**: 390x844 (standard)
- **iPhone 14 Pro Max**: 430x932 (large)
- **iPad**: 810x1080 (tablet portrait)
- **iPad Landscape**: 1080x810
- **Galaxy S21**: 412x915 (Android standard)
- **Pixel Tablet**: 1024x1366

### Test Scenarios

- [ ] All text readable on smallest device
- [ ] Touch targets 44px+ on all devices
- [ ] Keyboard playable on all screen sizes
- [ ] Orientation change smooth (no content shift)
- [ ] Notch/safe area respected
- [ ] Landscape mode usable
- [ ] Tablet layout optimized
- [ ] Scroll performance maintained
- [ ] Keyboard scrolls off screen if needed
- [ ] No content cutoff at edges

---

## Performance Considerations

### Optimize for Different Devices

```typescript
// Reduce animation complexity on low-end devices
const useOptimizedAnimations = () => {
  const isLowEnd = useDeviceInfo().isLowEnd;
  const duration = isLowEnd ? 200 : 400;

  return { duration };
};
```

### Scale Content Appropriately

```typescript
// Don't load 4 octaves on small phones
const octaveCount = screenWidth < 400 ? 2 : 4;

// Reduce note count in PianoRoll on small screens
const visibleBeats = screenWidth < 400 ? 4 : 8;
```

---

## Accessibility Considerations

### Text Scaling
- Support system font size preferences
- Minimum 12sp (12px) for body text
- Maximum 2x scaling
- Test with large font settings

### Touch Target Spacing
- 44px × 44px minimum (Apple)
- 48px × 48px preferred
- 8px spacing between targets
- Account for thumb reach on large phones

### High Contrast Mode
- Test with accessibility color contrast settings
- Maintain 4.5:1 contrast ratio for text
- 3:1 for UI components

---

## Common Responsive Patterns

### Flexible Container

```typescript
<View style={{
  flex: 1,
  minHeight: responsiveSize(300, 400, 500, screenWidth),
}}>
  {/* Content scales with available space */}
</View>
```

### Conditional Layout

```typescript
{screenWidth >= BREAKPOINTS.large ? (
  <TwoColumnLayout />
) : (
  <SingleColumnLayout />
)}
```

### Scaling Text

```typescript
const scaledFontSize = responsiveSize(14, 16, 18, screenWidth);
const scaledLineHeight = responsiveSize(20, 24, 28, screenWidth);
```

---

## Debugging Responsive Issues

### Dimension Inspector

```typescript
<Text>
  Screen: {width.toFixed(0)}x{height.toFixed(0)}
  Orientation: {isPortrait ? 'Portrait' : 'Landscape'}
</Text>
```

### Safe Area Debugging

```typescript
<View style={{
  borderWidth: 2,
  borderColor: 'red',
  padding: top,
}}>
  {/* Highlights safe area */}
</View>
```

---

## Resources

- [React Native Dimensions API](https://reactnative.dev/docs/dimensions)
- [React Native Safe Area Context](https://github.com/th3rdEyee/react-native-safe-area-context)
- [Material Design Responsive Layout](https://material.io/design/layout/responsive-layout-grid.html)
- [Apple Human Interface Guidelines - Adaptivity](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout/)

---

**Last Updated:** 2026-02-10
**Version:** 1.0

# KeySense Animation & Performance Guide

## Animation Architecture

All animations use **React Native Reanimated 3** for optimal 60fps performance on target devices.

### Core Principles

1. **Shared Values**: Use `useSharedValue()` for animation state
2. **Worklets**: Keep animation logic on the native thread
3. **No JS Bridge**: Minimize calls between JS and native
4. **Spring Physics**: Prefer springs for natural feel
5. **Frame Budget**: Keep all work under 16ms per frame

---

## Component-Specific Animations

### PianoKey Animations

**Press Animation:**
```typescript
scale.value = withSpring(0.95, {
  damping: 8,      // Less bouncy, more controlled
  mass: 1,         // Standard mass
  overshootClamping: false  // Allow slight overshoot
});

yOffset.value = withSpring(isBlackKey ? -2 : -3, {
  damping: 8,
  mass: 1,
});
```

**Duration:** ~250ms (spring completes quickly)
**Latency:** <5ms (native animation)

**Release Animation:**
- Same spring parameters, animated back to 0
- Creates "bouncy" feel of piano keys

---

### XPBar Animations

**Progress Bar Fill:**
```typescript
Animated.timing(progressAnim, {
  toValue: progress,
  duration: 800,
  useNativeDriver: false  // Needs to update layout
});
```

**Duration:** 800ms linear
**Effect:** Smooth progress bar fill when XP gained

**XP Popup Animation:**
```typescript
Animated.parallel([
  Animated.timing(popAnim, {
    toValue: 1,
    duration: 500,
    useNativeDriver: true  // Purely visual
  }),
  Animated.timing(fadeAnim, {
    toValue: 0,
    duration: 600,
    delay: 200,  // Fade starts after pop ends
    useNativeDriver: true
  })
]);
```

**Duration:** 600ms total
**Effect:** "+XP" text pops up and fades away

---

### StreakDisplay Animations

**Fire Breathing (Loop):**
```typescript
Animated.loop(
  Animated.sequence([
    Animated.timing(fireAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true
    }),
    Animated.timing(fireAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true
    })
  ])
);
```

**Duration:** 800ms per cycle
**Effect:** Fire icon scales 1.0 → 1.2 → 1.0
**Performance:** Low impact (scale transform only)

**Shake Animation (At-Risk):**
```typescript
Animated.loop(
  Animated.sequence([
    Animated.timing(shakeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }),
    Animated.timing(shakeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true
    })
  ])
);

// In style:
translateX: shakeAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 2]  // Shake 2px each side
})
```

**Duration:** 1000ms per cycle
**Effect:** Subtle 2px horizontal shake
**Trigger:** Only when streak at risk AND streak > 0

---

### Exercise Feedback Animation

**Feedback Popup:**
```typescript
Animated.sequence([
  Animated.timing(feedbackAnim, {
    toValue: 1,
    duration: 100,
    useNativeDriver: true
  }),
  Animated.timing(feedbackAnim, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true
  })
])

// Scale effect:
scale: feedbackAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [0.8, 1.2]  // Pop in larger
})
```

**Duration:** 400ms total
**Effect:** Text pops up and shrinks away
**Trigger:** On every key press (correct or incorrect)
**Performance:** <1ms per feedback (shared animation value)

---

## Performance Optimization Techniques

### 1. Use Native Driver When Possible

```typescript
// GOOD - Uses native thread
withSpring(0.95, { ... }, () => {
  // Worklet
})

// OKAY - Minimal layout calculations
Animated.timing(progressAnim, {
  ...,
  useNativeDriver: false  // Only for layout-affecting props
})

// BAD - Avoid in loops
Animated.timing(stateValue, {
  ...,
  useNativeDriver: false
})
```

### 2. Reduce Animation Complexity

**High Complexity:**
- Multiple simultaneous animations
- Color transitions
- Shadow/blur effects
- Position changes during animation

**Low Complexity:**
- Scale transforms
- Opacity changes
- Translate (2D)
- Rotation

### 3. Avoid Layout Thrashing

```typescript
// Good: Calculate once, animate
const progress = useMemo(() =>
  calculateProgress(xp, level),
  [xp, level]
);

// Bad: Calculate during animation
Animated.timing({
  toValue: calculateProgress(xp, level),  // DON'T
  ...
})
```

### 4. Frame Budget Breakdown

**Per-frame budget: 16ms (60fps target)**

- Input processing: <1ms
- JavaScript: <7ms
- Native animation: <8ms
- Render: <8ms
- Headroom: ~1-2ms

**Bottlenecks to avoid:**
- Network requests in render
- Large array operations
- Synchronous file I/O
- Heavy calculations in event handlers

---

## Performance Profiling

### React DevTools Profiler

```typescript
// Wrap component for profiling
<Profiler id="Keyboard" onRender={(id, phase, duration) => {
  console.log(`${id} (${phase}) took ${duration}ms`);
}}>
  <Keyboard {...props} />
</Profiler>
```

### Frame Rate Monitoring

```typescript
import { FrameRateMonitor } from 'react-native-performance';

<FrameRateMonitor
  targetFrameRate={60}
  onFrameRateDrop={(rate) => {
    console.warn(`Frame rate dropped to ${rate}fps`);
  }}
/>
```

### Touch Latency Measurement

```typescript
const handleKeyDown = useCallback((note: number) => {
  const startTime = performance.now();

  // Trigger animation
  scale.value = withSpring(0.95);

  const endTime = performance.now();
  console.log(`Touch-to-animation: ${endTime - startTime}ms`);
}, []);
```

---

## Animation Best Practices

### 1. Spring vs. Timing

**Use Spring For:**
- Natural physics-based motion
- Key press/release animations
- Bounce effects
- Interactive feedback

**Use Timing For:**
- Linear progress bars
- Fade in/out
- Sequential animations
- Delayed animations

### 2. Interpolation Patterns

```typescript
// Smooth easing
interpolate({
  inputRange: [0, 0.5, 1],
  outputRange: [0, 1.2, 1],  // Ease out bounce
  extrapolate: 'clamp'
})

// Color transitions
interpolate({
  inputRange: [0, 1],
  outputRange: ['#FFFFFF', '#FF9800']
})
```

### 3. Loop Management

**Memory-safe loops:**
```typescript
const animationRef = useRef(null);

useEffect(() => {
  animationRef.current = Animated.loop(...);
  return () => {
    animationRef.current?.stop?.();  // Cleanup
  };
}, []);
```

### 4. Gesture Integration

```typescript
// Smooth follow
const translateX = useSharedValue(0);

const gesture = Gesture.Pan()
  .onUpdate(event => {
    translateX.value = event.translationX;
  });
```

---

## Device-Specific Considerations

### iOS Performance
- Smooth animations on A14+ chips
- 120fps ProMotion on iPad Pro
- Lower performance on older iPhones (6s, 7)

### Android Performance
- Variable performance across devices
- High-end: Snapdragon 888+ smooth
- Mid-range: Noticeable frame drops possible
- Low-end: May need reduced animation complexity

### Graceful Degradation

```typescript
const useReducedAnimations = () => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion);
  }, []);

  return reduceMotion;
};

// Use in animations:
const duration = reduceMotion ? 100 : 400;
```

---

## Common Animation Patterns

### Fade In/Out
```typescript
const fadeAnim = useSharedValue(0);

useEffect(() => {
  fadeAnim.value = withTiming(1, {
    duration: 300,
    easing: Easing.inOut(Easing.ease)
  });
}, []);

const style = useAnimatedStyle(() => ({
  opacity: fadeAnim.value
}));
```

### Slide In/Out
```typescript
const slideAnim = useSharedValue(300);

const slideIn = () => {
  slideAnim.value = withSpring(0, { damping: 8 });
};

const style = useAnimatedStyle(() => ({
  transform: [{ translateX: slideAnim.value }]
}));
```

### Pulse/Bounce
```typescript
Animated.loop(
  Animated.sequence([
    Animated.timing(scale, { toValue: 1.1, duration: 500 }),
    Animated.timing(scale, { toValue: 1, duration: 500 })
  ])
);
```

### Rotate
```typescript
Animated.loop(
  Animated.timing(rotate, {
    toValue: 1,
    duration: 3000,
    easing: Easing.linear,
    useNativeDriver: true
  })
);

// In style:
transform: [{
  rotate: rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  })
}]
```

---

## Debugging Animations

### Visual Debugging
```typescript
// Add border to see animation bounds
style={{
  borderWidth: 1,
  borderColor: 'red',  // Remove in production
  ...
}}
```

### Performance Metrics
```typescript
const startTime = performance.now();
// ... animation code ...
const duration = performance.now() - startTime;
console.log(`Animation took ${duration.toFixed(2)}ms`);
```

### Frame Drop Detection
```typescript
let lastFrameTime = performance.now();

const animate = () => {
  const now = performance.now();
  const fps = 1000 / (now - lastFrameTime);

  if (fps < 55) {
    console.warn(`Frame drop detected: ${fps.toFixed(1)}fps`);
  }

  lastFrameTime = now;
  requestAnimationFrame(animate);
};
```

---

## Performance Checklist

### Before Shipping
- [ ] All animations complete within 16ms frame budget
- [ ] Frame rate drops <1% during extended use
- [ ] Touch latency <16ms measured on target devices
- [ ] Animations smooth on iPhone 12 and Pixel 6+
- [ ] No memory leaks from animation loops
- [ ] Reduced motion accessibility respected
- [ ] Hardware acceleration verified
- [ ] No jank during simultaneous animations
- [ ] Scroll performance unaffected
- [ ] Battery impact <1% per 15min session

### Optimization Priority
1. **Critical**: Touch-to-visual feedback (<16ms)
2. **Critical**: 60fps during keyboard input
3. **High**: Memory usage <150MB
4. **High**: Smooth scrolling (60fps)
5. **Medium**: Aesthetic polish animations
6. **Medium**: Accessibility animations

---

## References

- [React Native Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Animated API Docs](https://reactnative.dev/docs/animated)
- [Web Audio API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

**Last Updated:** 2026-02-10
**Version:** 1.0

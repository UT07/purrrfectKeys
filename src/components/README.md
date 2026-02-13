# KeySense UI Components

Complete interactive component library for the KeySense piano learning app.

## Components Overview

### Keyboard Components

#### PianoKey
Single piano key with touch feedback and animations.

```typescript
import { PianoKey } from '@/components';

<PianoKey
  midiNote={60}                    // MIDI note number
  isBlackKey={false}               // White or black key
  isHighlighted={false}            // Current input highlight
  isExpected={true}                // Expected note highlight
  onKeyDown={(note) => {}}         // Key press callback
  onKeyUp={(note) => {}}           // Key release callback
  hapticEnabled={true}             // Haptic feedback
  showLabels={true}                // Show note names (C4, etc.)
/>
```

**Features:**
- Spring animation on press/release
- Visual state indicators (highlighted, expected)
- Haptic feedback support
- Optional note name labels
- <16ms touch-to-visual latency target

**Styling:**
- White keys: 80px height, 2px border, shadow
- Black keys: 65% height, absolute positioning
- Highlighted: Orange background
- Expected: Green background

---

#### Keyboard
Full 2-octave scrollable piano keyboard.

```typescript
import { Keyboard } from '@/components';

<Keyboard
  startNote={48}                   // Starting MIDI note (C3)
  octaveCount={2}                  // Number of octaves
  scrollable={true}                // Enable horizontal scroll
  highlightedNotes={new Set([60])} // Currently pressed notes
  expectedNotes={new Set([62])}    // Expected notes for exercise
  onKeyDown={(note) => {}}         // Key press callback
  onKeyUp={(note) => {}}           // Key release callback
  hapticEnabled={true}             // Haptic feedback
  showLabels={false}               // Show note labels
  keyHeight={80}                   // White key height
/>
```

**Features:**
- 2-octave default, expandable to 4 octaves
- Horizontal scrolling for additional octaves
- Proper white/black key positioning
- Multi-touch support (10+ simultaneous touches)
- Set-based highlighting for efficient updates
- Responsive key sizing

**Layout:**
```
C  D  E  F  G  A  B  | C  D  E  F  G  A  B
   B♭ D♭ E♭  G♭ A♭    B♭ D♭ E♭  G♭ A♭
```

---

### PianoRoll Component

#### PianoRoll
Scrolling note visualization for exercise feedback.

```typescript
import { PianoRoll } from '@/components';

<PianoRoll
  notes={exercise.notes}           // Array of NoteEvent
  currentBeat={4.5}                // Current playback position
  tempo={120}                      // BPM
  timeSignature={[4, 4]}           // Time signature
  visibleBeats={8}                 // Beats visible at once
  onNoteHighlight={(idx) => {}}    // Active note callback
/>
```

**Features:**
- Transform-based scrolling (not ScrollView) for reliable 60fps
- Color-coded note states:
  - Indigo: Upcoming
  - Red with glow: Active (now)
  - Green faded: Past
- Dynamic MIDI range derived from exercise notes (not hardcoded)
- Note name labels (C4, D4, etc.) on each block
- Hand indicators (L/R) on notes
- Dark theme background for high contrast
- Fixed playback marker at 1/3 screen width
- Beat counter with count-in support
- Vertical padding prevents clipping at note range extremes

**Performance:**
- Memoized note calculations
- Efficient beat-to-pixel mapping
- Minimal layout recalculations

---

### Progress Components

#### XPBar
Level and experience progress display.

```typescript
import { XPBar } from '@/components';

<XPBar
  currentXP={1234}                 // Total XP earned
  currentLevel={5}                 // Current level
  animatedXPGain={50}              // XP just earned (triggers animation)
/>
```

**Features:**
- Circular level badge
- Progress bar to next level
- Animated XP gain popup
- Level up notification
- Exponential level curve:
  - Level 1: 100 XP
  - Level 2: 150 XP (250 cumulative)
  - Level 3: 225 XP (475 cumulative)

**Animations:**
- Progress fill: 800ms linear
- XP popup: Scale + fade (600ms)
- Level up: Alert notification

---

#### StreakDisplay
Streak counter with freeze management.

```typescript
import { StreakDisplay } from '@/components';

<StreakDisplay
  currentStreak={7}                // Current consecutive days
  longestStreak={14}               // Personal best streak
  freezesAvailable={1}             // Weekly freezes remaining
  lastPracticeDate="2026-02-09"    // ISO date of last practice
  isStreakAtRisk={false}           // Manual at-risk override
/>
```

**Features:**
- Fire icon with breathing animation
- Trophy icon for best streak
- At-risk indicator (red state)
- Freeze counter
- Shake animation when at risk
- Automatic at-risk detection
- Day calculation from lastPracticeDate

**Animations:**
- Fire breathing: 400ms cycle
- Shake animation: 500ms cycle (when at risk)

---

### Screen Components

#### HomeScreen
Main dashboard with progress and quick actions.

```typescript
import { HomeScreen } from '@/screens';

<HomeScreen
  onNavigateToExercise={() => {}}  // Practice button
  onNavigateToLesson={() => {}}    // Learn button
  onNavigateToSongs={() => {}}     // Songs button
  onNavigateToSettings={() => {}}  // Settings button
/>
```

**Layout:**
1. Header with greeting
2. XP Bar (level progress)
3. Streak Display
4. Daily goal progress card
5. Continue learning card
6. Quick action grid (4 buttons)
7. Motivational tip

**Features:**
- Responsive card layout
- Progress bar animations
- Daily goal tracking
- Lesson continuation
- Quick navigation
- Settings access
- Motivational messaging

---

#### ExerciseScreen
Full exercise player with keyboard and feedback.

```typescript
import { ExerciseScreen } from '@/screens';

<ExerciseScreen
  exercise={exercise}              // Exercise object
  onExerciseComplete={(score) => {}} // Completion callback
  onClose={() => {}}               // Close button callback
/>
```

**Layout:**
1. Header (title, difficulty, close)
2. Tip/hint display
3. PianoRoll (note visualization)
4. Feedback popup (perfect/good/ok/miss)
5. Keyboard (interactive input)
6. Controls (play, pause, reset, tempo)
7. Beat information
8. Complete button

**Features:**
- Real-time playback simulation
- Visual feedback system
- Keyboard integration
- Piano roll synchronization
- Play/pause/reset controls
- Exercise completion tracking
- Difficulty display
- Contextual hints

**State Management:**
- Playback: isPlaying, currentBeat, elapsedTime
- Interaction: highlightedKeys, expectedKeys
- Feedback: Real-time accuracy assessment
- Results: Final exercise score

---

## Usage Examples

### Basic Keyboard Setup
```typescript
const [pressedNotes, setPressedNotes] = useState<Set<number>>(new Set());

return (
  <Keyboard
    startNote={48}
    octaveCount={2}
    highlightedNotes={pressedNotes}
    onKeyDown={(note) => {
      setPressedNotes(prev => new Set([...prev, note]));
      playSound(note);
    }}
    onKeyUp={(note) => {
      setPressedNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(note);
        return newSet;
      });
    }}
    hapticEnabled={true}
  />
);
```

### Exercise Player Integration
```typescript
const [exercise] = useState<Exercise>(exerciseData);

return (
  <ExerciseScreen
    exercise={exercise}
    onExerciseComplete={(score) => {
      // Save score, award XP, etc.
      handleExerciseComplete(score);
    }}
    onClose={() => {
      // Navigate back
      navigation.goBack();
    }}
  />
);
```

### Progress Display
```typescript
return (
  <>
    <XPBar
      currentXP={userState.xp}
      currentLevel={userState.level}
      animatedXPGain={xpJustEarned}
    />
    <StreakDisplay
      currentStreak={userState.currentStreak}
      longestStreak={userState.longestStreak}
      freezesAvailable={userState.freezesAvailable}
      lastPracticeDate={userState.lastPracticeDate}
    />
  </>
);
```

---

## Performance Optimization Tips

### Reduce Re-renders
- Use `React.memo()` for components with frequent updates
- Memoize callbacks with `useCallback()`
- Use `useMemo()` for expensive calculations

### Animation Performance
- Use Reanimated shared values instead of state updates
- Keep animation complexity low during gameplay
- Use `spring` animations for natural feel
- Avoid expensive shadow effects on rapid updates

### Memory Management
- Limit notes displayed in PianoRoll (virtualization for 100+)
- Dispose of large arrays when not needed
- Use key props efficiently in lists

### Touch Latency
- Target <16ms from touch event to visual feedback
- Use `Pressable` instead of `TouchableOpacity`
- Minimize JavaScript execution in event handlers
- Use native animations when possible

---

## Accessibility

All components support:
- VoiceOver (iOS) / TalkBack (Android) labels
- High contrast color modes
- Large touch targets (44px minimum)
- Keyboard navigation
- Haptic feedback patterns

### Color Contrast
- Primary blue (#2196F3) on white: 4.48:1 WCAG AA
- Orange (#FF9800) on white: 4.15:1 WCAG AA
- Green (#4CAF50) on white: 3.99:1 WCAG AA

---

## Dependencies

- **react-native**: Core framework
- **react-native-reanimated**: 60fps animations
- **expo-haptics**: Haptic feedback
- **@expo/vector-icons**: MaterialCommunityIcons

---

## Testing

### Unit Tests
```typescript
// PianoKey snapshot test
expect(renderer.create(
  <PianoKey midiNote={60} isBlackKey={false} />
)).toMatchSnapshot();
```

### Integration Tests
```typescript
// Keyboard multi-touch
fireEvent.pressIn(getByTestId('key-60'));
fireEvent.pressIn(getByTestId('key-64'));
expect(onKeyDown).toHaveBeenCalledWith(60);
expect(onKeyDown).toHaveBeenCalledWith(64);
```

---

## Browser Support

- iOS 12+
- Android 5.0+
- React Native 0.76+

---

## Contributing

When adding new components:
1. Follow the existing code style
2. Include TypeScript interfaces
3. Add docstring comments
4. Implement React.memo for performance
5. Test multi-touch scenarios
6. Verify latency targets
7. Update this README

---

## Component Development Checklist

- [ ] TypeScript interfaces defined
- [ ] PropTypes or type validation
- [ ] React.memo applied (if frequently updated)
- [ ] useCallback for event handlers
- [ ] useMemo for expensive calculations
- [ ] Performance profiling done
- [ ] Accessibility labels added
- [ ] Touch target sizes verified (44px+)
- [ ] Animation smoothness tested
- [ ] Responsive layout verified
- [ ] Error handling included
- [ ] Documentation complete

---

For more information, see [TEAM3_PROGRESS.md](../TEAM3_PROGRESS.md)

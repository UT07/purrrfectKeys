# KeySense Architecture Overview

## Quick Navigation

### Core Business Logic (No React)
- **Scoring Engine**: `src/core/exercises/ExerciseValidator.ts` - Main scoring algorithm
- **Types**: `src/core/exercises/types.ts` - All exercise-related types
- **XP System**: `src/core/progression/XpSystem.ts` - Level progression
- **Music Theory**: `src/core/music/MusicTheory.ts` - Note/scale utilities

### State Management
- **Exercise State**: `src/stores/exerciseStore.ts` - Current session
- **Progress State**: `src/stores/progressStore.ts` - User progression
- **Settings State**: `src/stores/settingsStore.ts` - User preferences

### Abstraction Layers (Ready for Native Implementation)
- **Audio Engine**: `src/audio/AudioEngine.ts` - Playback abstraction
- **MIDI Input**: `src/input/MidiInput.ts` - Input abstraction

### UI Components
- **Keyboard**: `src/components/Keyboard/Keyboard.tsx` - Piano keyboard
- **PianoRoll**: `src/components/PianoRoll/PianoRoll.tsx` - Note display

### Services
- **Firebase**: `src/services/firebase/config.ts` - Firebase setup
- **AI Coaching**: `src/services/ai/CoachingService.ts` - Gemini integration

### Content
- **Exercises**: `content/exercises/` - JSON exercise definitions
- **Lessons**: `content/lessons/` - Lesson manifests

---

## Key Files by Purpose

### To Understand Scoring
1. Read: `src/core/exercises/types.ts` (understand data shapes)
2. Read: `src/core/exercises/ExerciseValidator.ts` (understand algorithm)
3. Test: `src/core/exercises/__tests__/ExerciseValidator.test.ts`

### To Add a New Exercise
1. Create: `content/exercises/lesson-X/exercise-Y.json`
2. Reference: `content/exercises/lesson-1/exercise-1.json` (example)
3. Run: `npm run validate:exercises`

### To Integrate MIDI
1. Reference: `src/input/MidiInput.ts` (interface)
2. Create: `src/input/MidiInput.native.ts` (implementation)
3. Update: `src/input/index.ts` (export)

### To Integrate Audio
1. Reference: `src/audio/AudioEngine.ts` (interface)
2. Create: `src/audio/AudioEngine.native.ts` (implementation)
3. Update: `src/audio/index.ts` (export)

### To Build a New Screen
1. Create: `src/screens/MyScreen.tsx`
2. Add route: `src/navigation/types.ts`
3. Add navigation: `src/navigation/AppNavigator.tsx`

---

## Data Flow

### Exercise Scoring Flow
```
User Input (MIDI/Touch)
    ↓
MidiInput callback
    ↓
exerciseStore.addPlayedNote()
    ↓
scoreExercise() [pure function]
    ↓
exerciseStore.setScore()
    ↓
UI re-renders with score
```

### Progression Flow
```
Exercise Complete
    ↓
Calculate XP earned
    ↓
progressStore.addXp()
    ↓
getLevelFromXp() [pure function]
    ↓
progressStore.setLevel()
    ↓
Update streak data
    ↓
UI shows level up animation
```

---

## Module Boundaries

### Core Module (src/core/)
- **What**: Business logic, algorithms, data models
- **What NOT**: React, UI, native modules, external APIs
- **Testing**: 100% testable with Jest
- **Imports**: Only from other core modules

### Audio Module (src/audio/)
- **What**: Audio playback abstraction
- **What NOT**: UI, other logic
- **Platform Code**: `AudioEngine.native.ts` (React Native only)
- **Interface**: `AudioEngine.ts` (platform-agnostic)

### Input Module (src/input/)
- **What**: MIDI and microphone input abstraction
- **What NOT**: Audio, UI, processing
- **Platform Code**: `MidiInput.native.ts` (React Native only)
- **Interface**: `MidiInput.ts` (platform-agnostic)

### Stores Module (src/stores/)
- **What**: Zustand stores for application state
- **Pattern**: One store per domain
- **Selectors**: Use hooks to subscribe to state

### Components Module (src/components/)
- **What**: React Native UI components
- **Pattern**: One component per file
- **Imports**: From stores, utils, core (via types only)

---

## Type Safety Rules

### ❌ Never Do This
```typescript
// Bad: any type
const data: any = exerciseScore;

// Bad: loose typing
function processNote(note) { ... }

// Bad: core logic in component
export function MyComponent() {
  const score = scoreExercise(...);
}
```

### ✅ Always Do This
```typescript
// Good: explicit types
import type { ExerciseScore } from '@/core/exercises/types';
const data: ExerciseScore = ...;

// Good: full signatures
function processNote(note: NoteEvent): ProcessedNote { ... }

// Good: core logic in pure functions
export function MyComponent() {
  const score = useMemo(() => scoreExercise(...), [...]);
}
```

---

## Configuration Reference

### tsconfig.json
- Extends: `expo/tsconfig.base`
- Strict mode: **enabled**
- Target: ES2020
- Module: ESNext

### jest.config.js
- Preset: `jest-expo`
- Setup: `jest.setup.js`
- Coverage: `src/**/*.ts(x)`

### babel.config.js
- Preset: `babel-preset-expo`
- Plugin: `react-native-reanimated/plugin`
- Plugin: `module-resolver` (for path aliases)

### metro.config.js
- Extends: expo default
- JSON support: enabled (for exercises)

---

## Development Checklist

Before each commit:
```bash
npm run typecheck  # Must pass
npm run lint       # Must pass (auto-fix with npm run lint:fix)
npm run test       # Must pass
```

Before creating a pull request:
```bash
npm run typecheck && npm run lint && npm run test:coverage
```

---

## Common Commands

```bash
# Development
npm run start          # Start dev server
npm run ios            # Run iOS simulator
npm run android        # Run Android emulator

# Quality
npm run typecheck      # Check TypeScript
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix linting
npm run test           # Run Jest
npm run test:watch     # Watch mode

# Building
npm run build:ios      # Build iOS app
npm run build:android  # Build Android app
npm run build:preview  # Build preview

# Content
npm run validate:exercises  # Validate exercise JSON
npm run generate:exercise   # Create new exercise
```

---

## Glossary

| Term | Definition |
|------|-----------|
| MIDI Note | Integer 0-127, where 60 = C4 (middle C) |
| Beat | Relative time unit in exercise (tempo determines ms) |
| Timing Offset | Milliseconds early (negative) or late (positive) |
| Star Threshold | Score needed for 1/2/3 stars |
| XP | Experience points earned from exercises |
| Streak | Consecutive days of practice |
| Freeze | One-time use to prevent streak break |

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Touch → Sound | <20ms |
| MIDI → Sound | <15ms |
| Score calculation | <5ms |
| Level calculation | <1ms |
| App startup | <2s (cold), <500ms (warm) |

---

## File Template

When creating new files, follow this structure:

```typescript
/**
 * File purpose (one line)
 * Longer description if needed (can be multiple lines)
 */

import type { SomeType } from '@/core/...';

/**
 * JSDoc comment for all exported functions
 */
export function myFunction(param: ParamType): ReturnType {
  // implementation
}
```

---

## Contributing Tips

1. **Keep core logic testable** - No React imports in src/core/
2. **Write types first** - Define interfaces before implementation
3. **Document complex logic** - Use JSDoc for scoring algorithms
4. **Test edge cases** - Exercise validator tests should be comprehensive
5. **Use path aliases** - `@/core`, `@/stores`, `@/utils`, etc.

---

Last Updated: February 10, 2026

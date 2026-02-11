---
name: new-component
description: Scaffold a new React Native component with types, styles, and tests
allowed-tools: Read, Write, Bash(npm run typecheck)
---

# Create New Component

Generate a complete React Native component following KeySense conventions.

## Steps

1. **Determine component location**
   - Reusable UI: `src/components/[ComponentName]/`
   - Screen: `src/screens/[ScreenName].tsx`
   - Feature-specific: `src/features/[feature]/components/`

2. **Create component file structure**
   ```
   src/components/ComponentName/
   ├── ComponentName.tsx      # Main component
   ├── ComponentName.styles.ts # StyleSheet (if complex)
   ├── ComponentName.test.tsx  # Tests
   ├── types.ts               # TypeScript types (if complex)
   └── index.ts               # Re-export
   ```

3. **Follow component template**

```typescript
// ComponentName.tsx
import { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface ComponentNameProps {
  // Required props first
  title: string;
  onPress: () => void;
  
  // Optional props with defaults
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  testID?: string;
}

export const ComponentName = memo(function ComponentName({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
}: ComponentNameProps) {
  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress();
    }
  }, [disabled, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        styles.container,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#4CAF50',
  },
  secondary: {
    backgroundColor: '#2196F3',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

4. **Create test file**

```typescript
// ComponentName.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <ComponentName title="Test" onPress={() => {}} />
    );
    expect(getByText('Test')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ComponentName title="Test" onPress={onPress} testID="button" />
    );
    fireEvent.press(getByTestId('button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ComponentName title="Test" onPress={onPress} disabled testID="button" />
    );
    fireEvent.press(getByTestId('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

5. **Create index export**

```typescript
// index.ts
export { ComponentName } from './ComponentName';
export type { ComponentNameProps } from './ComponentName';
```

6. **Run typecheck**
   ```bash
   npm run typecheck
   ```

## Conventions

- Use `memo()` for all components
- Use `useCallback` for event handlers passed to children
- Always include `testID` prop for testing
- Use StyleSheet.create for styles
- Colocate styles unless shared across components
- Export types alongside components

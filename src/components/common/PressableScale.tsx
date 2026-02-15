/**
 * PressableScale Component
 * A drop-in replacement for TouchableOpacity that scales down on press
 * with spring animation.
 */

import React from 'react';
import { Pressable, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  scaleDown?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  testID?: string;
}

export function PressableScale({
  children,
  scaleDown = 0.97,
  style,
  onPress,
  onLongPress,
  disabled,
  testID,
}: PressableScaleProps): React.JSX.Element {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      testID={testID}
      style={[animatedStyle, style]}
      onPressIn={() => {
        scale.value = withSpring(scaleDown, { damping: 15, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 180 });
      }}
    >
      {children}
    </AnimatedPressable>
  );
}

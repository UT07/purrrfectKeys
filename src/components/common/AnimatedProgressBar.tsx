/**
 * AnimatedProgressBar Component
 * Smooth animated progress bar with optional golden pulse on completion.
 * Uses React Native Animated API (not Reanimated) for broad compatibility.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { COLORS } from '../../theme/tokens';

export interface AnimatedProgressBarProps {
  /** Progress value between 0 and 1 */
  progress: number;
  /** Fill color (default: COLORS.primary) */
  color?: string;
  /** Bar height in pixels (default: 8) */
  height?: number;
  /** Whether to animate progress changes (default: true) */
  animated?: boolean;
  /** Show a golden pulse when progress reaches 1.0 (default: true) */
  glowAtEnd?: boolean;
  /** Additional styles for the outer container */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

export function AnimatedProgressBar({
  progress,
  color = COLORS.primary,
  height = 8,
  animated = true,
  glowAtEnd = true,
  style,
  testID,
}: AnimatedProgressBarProps): React.JSX.Element {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const fillAnim = useRef(new Animated.Value(clampedProgress)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(fillAnim, {
        toValue: clampedProgress,
        duration: 400,
        useNativeDriver: false,
      }).start(() => {
        if (clampedProgress >= 1 && glowAtEnd) {
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: false,
            }),
          ]).start();
        }
      });
    } else {
      fillAnim.setValue(clampedProgress);
    }
  }, [clampedProgress, animated, fillAnim, glowAnim, glowAtEnd]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [color, COLORS.starGold],
  });

  const radius = height / 2;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          height,
          borderRadius: radius,
          backgroundColor: COLORS.cardBorder,
        },
        style,
      ]}
    >
      <Animated.View
        testID={testID ? `${testID}-fill` : undefined}
        style={[
          styles.fill,
          {
            width: fillWidth,
            height,
            borderRadius: radius,
            backgroundColor: glowAtEnd ? glowColor : color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

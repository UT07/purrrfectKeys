/**
 * ProgressBar Component
 * Animated progress bar with optional label
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export interface ProgressBarProps {
  progress: number; // 0-1
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  showLabel?: boolean;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * ProgressBar Component
 * Displays progress with optional animation and label
 */
export const ProgressBar = React.memo(
  ({
    progress,
    height = 8,
    backgroundColor = '#333333',
    progressColor = '#DC143C',
    showLabel = false,
    animated = true,
    style,
    testID,
  }: ProgressBarProps) => {
    // Clamp progress between 0 and 1
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const animatedProgress = useSharedValue(clampedProgress);

    useEffect(() => {
      if (animated) {
        animatedProgress.value = withTiming(clampedProgress, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        animatedProgress.value = clampedProgress;
      }
    }, [clampedProgress, animatedProgress, animated]);

    const animatedStyle = useAnimatedStyle(() => ({
      width: `${animatedProgress.value * 100}%`,
    }));

    const percentage = Math.round(clampedProgress * 100);

    return (
      <View style={[styles.container, style]} testID={testID}>
        <View
          style={[
            styles.track,
            {
              height,
              backgroundColor,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.fill,
              {
                height,
                backgroundColor: progressColor,
              },
              animatedStyle,
            ]}
          />
        </View>
        {showLabel && (
          <Text style={styles.label}>{percentage}%</Text>
        )}
      </View>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  track: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginTop: 4,
    textAlign: 'right',
  },
});

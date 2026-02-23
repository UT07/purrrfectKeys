/**
 * Skeleton Loading Components
 * Shimmer loading placeholders for content that is still loading.
 * Uses React Native Animated API for the shimmer effect.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { COLORS, BORDER_RADIUS } from '../../theme/tokens';

export interface SkeletonProps {
  /** Width of the skeleton placeholder */
  width: number | `${number}%`;
  /** Height of the skeleton placeholder */
  height: number;
  /** Border radius (default: BORDER_RADIUS.md) */
  borderRadius?: number;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

export function Skeleton({
  width,
  height,
  borderRadius = BORDER_RADIUS.md,
  style,
  testID,
}: SkeletonProps): React.JSX.Element {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      testID={testID}
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: COLORS.surface,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            backgroundColor: COLORS.surfaceElevated,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

/** Preset skeleton for text lines */
export function SkeletonText({
  style,
  testID,
}: {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}): React.JSX.Element {
  return (
    <Skeleton
      width="100%"
      height={16}
      borderRadius={4}
      style={style}
      testID={testID}
    />
  );
}

/** Preset skeleton for circular avatars / icons */
export function SkeletonCircle({
  size,
  style,
  testID,
}: {
  size: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}): React.JSX.Element {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={9999}
      style={style}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    opacity: 0.3,
  },
});

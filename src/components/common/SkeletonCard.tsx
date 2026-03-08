/**
 * SkeletonCard & SkeletonLine
 * Shimmer-loading placeholder components with pulsing opacity animation.
 */

import React from 'react';
import { type DimensionValue, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, BORDER_RADIUS, ANIMATION_CONFIG } from '../../theme/tokens';

export interface SkeletonCardProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function useShimmer() {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.6, {
        duration: ANIMATION_CONFIG.duration.slow,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
  }, [opacity]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
}

export function SkeletonCard({
  width = '100%',
  height = 80,
  borderRadius = BORDER_RADIUS.md,
  style,
  testID,
}: SkeletonCardProps): React.JSX.Element {
  const animatedStyle = useShimmer();

  return (
    <Animated.View
      testID={testID}
      style={[
        {
          width,
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

export interface SkeletonLineProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SkeletonLine({
  width = '100%',
  height = 14,
  borderRadius = BORDER_RADIUS.sm,
  style,
  testID,
}: SkeletonLineProps): React.JSX.Element {
  const animatedStyle = useShimmer();

  return (
    <Animated.View
      testID={testID}
      style={[
        {
          width,
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

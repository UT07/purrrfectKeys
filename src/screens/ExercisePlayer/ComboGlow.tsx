import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { getComboTier } from '../../theme/tokens';

interface ComboGlowProps {
  combo: number;
}

export function ComboGlow({ combo }: ComboGlowProps): React.ReactElement | null {
  const tier = getComboTier(combo);
  const opacity = useSharedValue(0);

  const shouldShow = tier.name !== 'NORMAL' && combo >= 5;

  useEffect(() => {
    if (shouldShow) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 800 }),
          withTiming(0.3, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [shouldShow, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    borderColor: tier.borderColor,
  }));

  if (!shouldShow) return null;

  return (
    <Animated.View
      testID="combo-glow"
      pointerEvents="none"
      style={[styles.glow, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderRadius: 0,
    zIndex: 5,
  },
});

/**
 * AuroraBackground — Animated gradient mesh for the free play visualization area.
 *
 * Slow-moving aurora waves in dark purple/blue that respond subtly to note input.
 * Uses LinearGradient with animated colors for smooth transitions.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface AuroraBackgroundProps {
  /** Number of notes currently being played — intensifies the aurora */
  activeNoteCount?: number;
}

export function AuroraBackground({
  activeNoteCount = 0,
}: AuroraBackgroundProps): React.ReactElement {
  const phase = useSharedValue(0);
  const intensity = useSharedValue(0);

  // Continuous slow phase animation
  useEffect(() => {
    phase.value = withRepeat(
      withTiming(1, { duration: 12000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [phase]);

  // Intensity responds to active notes
  useEffect(() => {
    intensity.value = withTiming(
      Math.min(activeNoteCount * 0.15, 0.6),
      { duration: 200 },
    );
  }, [activeNoteCount, intensity]);

  const animatedStyle = useAnimatedStyle(() => {
    const baseOpacity = 0.3 + phase.value * 0.15 + intensity.value;
    return {
      opacity: Math.min(baseOpacity, 0.8),
      transform: [
        { scale: 1 + phase.value * 0.05 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <LinearGradient
        colors={['#1A0A2E', '#0D1B3E', '#0A1628', '#0A0A14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      {/* Secondary layer for depth */}
      <LinearGradient
        colors={['transparent', '#1A0520', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.gradient, styles.secondLayer]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  secondLayer: {
    opacity: 0.5,
  },
});

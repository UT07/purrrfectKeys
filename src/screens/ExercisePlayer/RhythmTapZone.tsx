/**
 * RhythmTapZone
 *
 * Replaces the Keyboard for 'rhythm' type exercises.
 * Shows a large tappable drum-pad area. On tap, fires a fixed
 * MIDI note (60 = Middle C) so the existing scoring pipeline
 * evaluates timing without requiring pitch accuracy.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SHADOWS, ANIMATION_CONFIG, glowColor } from '../../theme/tokens';

export interface RhythmTapZoneProps {
  onTap: () => void;
  enabled: boolean;
  testID?: string;
}

export function RhythmTapZone({ onTap, enabled, testID }: RhythmTapZoneProps): React.JSX.Element {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePressIn = useCallback(() => {
    if (!enabled) return;
    scale.value = withSpring(0.92, ANIMATION_CONFIG.springSnappy);
    glowOpacity.value = withTiming(0.8, { duration: ANIMATION_CONFIG.duration.instant });
  }, [enabled, scale, glowOpacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, ANIMATION_CONFIG.springBouncy);
    glowOpacity.value = withTiming(0.3, { duration: ANIMATION_CONFIG.duration.normal });
  }, [scale, glowOpacity]);

  const handlePress = useCallback(() => {
    if (!enabled) return;
    onTap();
    // Quick pulse effect
    scale.value = withSequence(
      withTiming(0.88, { duration: 50 }),
      withSpring(1, ANIMATION_CONFIG.springBouncy),
    );
  }, [enabled, onTap, scale]);

  return (
    <View style={styles.container} testID={testID}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!enabled}
        testID={testID ? `${testID}-pressable` : undefined}
        accessibilityLabel="Tap to the rhythm"
        accessibilityRole="button"
        style={styles.pressable}
      >
        {/* Glow ring */}
        <Animated.View style={[styles.glowRing, animatedGlowStyle]} />

        {/* Main circle */}
        <Animated.View style={[styles.circle, animatedCircleStyle, !enabled && styles.circleDisabled]}>
          <Text style={[styles.tapText, !enabled && styles.tapTextDisabled]}>TAP</Text>
          <Text style={styles.subtitleText}>to the beat</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const CIRCLE_SIZE = 160;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  pressable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: CIRCLE_SIZE + 40,
    height: CIRCLE_SIZE + 40,
    borderRadius: (CIRCLE_SIZE + 40) / 2,
    backgroundColor: glowColor(COLORS.primary, 0.15),
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 3,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  circleDisabled: {
    borderColor: COLORS.textMuted,
    opacity: 0.5,
  },
  tapText: {
    ...TYPOGRAPHY.display.md,
    color: COLORS.primary,
    letterSpacing: 4,
  },
  subtitleText: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  tapTextDisabled: {
    color: COLORS.textMuted,
  },
});

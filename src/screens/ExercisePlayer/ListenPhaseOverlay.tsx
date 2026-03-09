/**
 * ListenPhaseOverlay
 *
 * For 'earTraining' exercises. Shows a full-screen semi-transparent
 * overlay during the "listen" phase (demo playback). Once the demo
 * finishes, transitions to "Now play it back!" and auto-dismisses.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  FadeIn,
  FadeOut,
  Easing,
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, ANIMATION_CONFIG } from '../../theme/tokens';

export interface ListenPhaseOverlayProps {
  isListening: boolean;
  onDismiss: () => void;
  testID?: string;
}

export function ListenPhaseOverlay({
  isListening,
  onDismiss,
  testID,
}: ListenPhaseOverlayProps): React.JSX.Element | null {
  const pulseScale = useSharedValue(1);
  const wave1Opacity = useSharedValue(0.6);
  const wave2Opacity = useSharedValue(0.3);

  // Pulsing ear icon animation
  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
      wave1Opacity.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 600 }),
          withTiming(0.4, { duration: 600 }),
        ),
        -1,
        false,
      );
      wave2Opacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 800 }),
          withTiming(0.2, { duration: 800 }),
        ),
        -1,
        false,
      );
    }
  }, [isListening, pulseScale, wave1Opacity, wave2Opacity]);

  // Auto-dismiss after demo ends
  useEffect(() => {
    if (!isListening) {
      const timer = setTimeout(onDismiss, 1500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isListening, onDismiss]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const wave1Style = useAnimatedStyle(() => ({
    opacity: wave1Opacity.value,
  }));

  const wave2Style = useAnimatedStyle(() => ({
    opacity: wave2Opacity.value,
  }));

  return (
    <View style={styles.overlay} testID={testID}>
      {isListening ? (
        <Animated.View
          entering={FadeIn.duration(ANIMATION_CONFIG.duration.normal)}
          style={styles.content}
          testID={testID ? `${testID}-listening` : undefined}
        >
          {/* Sound wave circles */}
          <View style={styles.iconContainer}>
            <Animated.View style={[styles.waveRing, styles.waveRingOuter, wave2Style]} />
            <Animated.View style={[styles.waveRing, styles.waveRingInner, wave1Style]} />
            <Animated.View style={pulseStyle}>
              <Text style={styles.earIcon}>&#x1F442;</Text>
            </Animated.View>
          </View>

          <Text style={styles.title}>Listen carefully...</Text>
          <Text style={styles.subtitle}>Pay attention to the notes and rhythm</Text>
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeIn.duration(ANIMATION_CONFIG.duration.fast)}
          exiting={FadeOut.duration(ANIMATION_CONFIG.duration.fast)}
          style={styles.content}
          testID={testID ? `${testID}-playback` : undefined}
        >
          <Text style={styles.playbackIcon}>&#x1F3B9;</Text>
          <Text style={styles.title}>Now play it back!</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  content: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveRing: {
    position: 'absolute',
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  waveRingInner: {
    width: 80,
    height: 80,
  },
  waveRingOuter: {
    width: 110,
    height: 110,
  },
  earIcon: {
    fontSize: 48,
  },
  playbackIcon: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

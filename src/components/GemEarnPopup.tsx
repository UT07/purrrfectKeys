/**
 * GemEarnPopup — Floating "+X gems" animation
 *
 * Shows a gem icon with amount that floats upward and fades out.
 * Triggered by gem earning events (exercise completion, daily goals, etc.)
 */

import { useEffect } from 'react';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/tokens';

interface GemEarnPopupProps {
  amount: number;
  /** Called when animation completes (for cleanup) */
  onComplete?: () => void;
  /** Position relative to parent */
  offsetY?: number;
}

export function GemEarnPopup({
  amount,
  onComplete,
  offsetY = 0,
}: GemEarnPopupProps): ReactElement {
  const translateY = useSharedValue(offsetY);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Animate: pop in → float up → fade out
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(600, withTiming(0, { duration: 400 })),
    );
    scale.value = withSequence(
      withTiming(1.3, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 150 }),
    );
    translateY.value = withTiming(offsetY - 60, {
      duration: 1200,
      easing: Easing.out(Easing.quad),
    });

    // Fire onComplete after animation finishes
    if (onComplete) {
      const completeCb = onComplete;
      const timer = setTimeout(() => {
        runOnJS(completeCb)();
      }, 1300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [translateY, opacity, scale, offsetY, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.pill}>
        <MaterialCommunityIcons
          name="diamond-stone"
          size={18}
          color={COLORS.gemGold}
        />
        <Text style={styles.amount}>+{amount}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  amount: {
    color: COLORS.gemGold,
    fontSize: 16,
    fontWeight: '800',
  },
});

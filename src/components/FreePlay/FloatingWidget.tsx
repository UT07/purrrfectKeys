/**
 * FloatingWidget — Draggable floating card container for tool widgets.
 *
 * Anchored near the sidebar by default. Can be dragged within screen bounds.
 * Tap the close button or sidebar icon again to dismiss.
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PressableScale } from '../common/PressableScale';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS, glowColor, shadowGlow } from '../../theme/tokens';

const WIDGET_WIDTH = 200;
const SIDEBAR_WIDTH = 44;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FloatingWidgetProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Vertical index for stacking multiple widgets (0-based) */
  stackIndex?: number;
  testID?: string;
}

export function FloatingWidget({
  title,
  onClose,
  children,
  stackIndex = 0,
  testID,
}: FloatingWidgetProps): React.ReactElement {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      const newX = savedX.value + e.translationX;
      const newY = savedY.value + e.translationY;
      // Clamp to screen bounds
      const maxX = SCREEN_WIDTH - SIDEBAR_WIDTH - WIDGET_WIDTH - 16;
      const maxY = SCREEN_HEIGHT - 200;
      translateX.value = Math.max(0, Math.min(newX, maxX));
      translateY.value = Math.max(-100, Math.min(newY, maxY));
    })
    .onEnd(() => {
      // Snap with spring
      translateX.value = withSpring(translateX.value, { damping: 15 });
      translateY.value = withSpring(translateY.value, { damping: 15 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const initialTop = 8 + stackIndex * 220;

  return (
    <Animated.View
      entering={FadeIn.duration(150).springify()}
      exiting={FadeOut.duration(100)}
      style={[styles.container, { top: initialTop }, animatedStyle]}
      testID={testID}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View style={styles.card}>
          {/* Header — drag handle */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <Text style={styles.title}>{title}</Text>
            <PressableScale
              onPress={onClose}
              scaleDown={0.85}
              soundOnPress={false}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="close"
                size={16}
                color={COLORS.textMuted}
              />
            </PressableScale>
          </View>

          {/* Content */}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SIDEBAR_WIDTH + 8,
    width: WIDGET_WIDTH,
    zIndex: 50,
  },
  card: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.2),
    overflow: 'hidden',
    ...SHADOWS.lg,
    ...(shadowGlow(COLORS.primary, 6) as Record<string, unknown>),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    gap: 6,
  },
  dragHandle: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    opacity: 0.4,
  },
  title: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  content: {
    padding: SPACING.sm,
  },
});

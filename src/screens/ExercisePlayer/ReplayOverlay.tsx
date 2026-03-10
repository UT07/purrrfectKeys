import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PressableScale } from '../../components/common/PressableScale';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  ANIMATION_CONFIG,
  glowColor,
} from '../../theme/tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReplayOverlayProps {
  /** Current mode of the overlay */
  mode: 'hidden' | 'pill' | 'card';
  /** Brief text for pill mode (2-5 words) */
  pillText: string;
  /** Full explanation for card mode */
  cardText: string;
  /** Type of mistake being explained */
  mistakeType?:
    | 'wrong_pitch'
    | 'timing_rush'
    | 'timing_drag'
    | 'missed_notes'
    | 'general';
  /** Called when user taps "Show me" — triggers correct version demo */
  onShowCorrect: () => void;
  /** Called when user taps "Continue" — resumes replay */
  onContinue: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReplayOverlay({
  mode,
  pillText,
  cardText,
  onShowCorrect,
  onContinue,
}: ReplayOverlayProps): React.JSX.Element | null {
  // ── Shared values for animated transitions ────────────────────────────
  const pillOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(40);

  // Drive animations when mode changes
  React.useEffect(() => {
    const timingConfig = { duration: ANIMATION_CONFIG.duration.normal };

    if (mode === 'pill') {
      pillOpacity.value = withTiming(1, timingConfig);
      cardOpacity.value = withTiming(0, timingConfig);
      cardTranslateY.value = withTiming(40, timingConfig);
    } else if (mode === 'card') {
      pillOpacity.value = withTiming(0, timingConfig);
      cardOpacity.value = withTiming(1, timingConfig);
      cardTranslateY.value = withTiming(0, timingConfig);
    } else {
      // hidden
      pillOpacity.value = withTiming(0, timingConfig);
      cardOpacity.value = withTiming(0, timingConfig);
      cardTranslateY.value = withTiming(40, timingConfig);
    }
  }, [mode, pillOpacity, cardOpacity, cardTranslateY]);

  // ── Animated styles ───────────────────────────────────────────────────
  const pillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  // ── Render nothing when fully hidden ──────────────────────────────────
  if (mode === 'hidden') {
    return null;
  }

  // ── Pill mode ─────────────────────────────────────────────────────────
  if (mode === 'pill') {
    return (
      <Animated.View
        style={[styles.pillContainer, pillAnimatedStyle]}
        pointerEvents="none"
      >
        <View style={styles.pill}>
          <Text style={styles.pillText}>{pillText}</Text>
        </View>
      </Animated.View>
    );
  }

  // ── Card mode ─────────────────────────────────────────────────────────
  return (
    <View style={styles.cardWrapper} pointerEvents="box-none">
      {/* Dimmed backdrop */}
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <PressableScale
          style={StyleSheet.absoluteFill}
          onPress={onContinue}
          soundOnPress={false}
          scaleDown={1}
        >
          <View style={StyleSheet.absoluteFill} />
        </PressableScale>
      </Animated.View>

      {/* Card */}
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        <Text style={styles.cardLabel}>Salsa</Text>
        <Text style={styles.cardText}>{cardText}</Text>

        <View style={styles.buttonRow}>
          <PressableScale
            style={styles.secondaryButton}
            onPress={onShowCorrect}
          >
            <Text style={styles.secondaryButtonText}>Show me</Text>
          </PressableScale>

          <PressableScale
            style={styles.primaryButton}
            onPress={onContinue}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </PressableScale>
        </View>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // ── Pill ────────────────────────────────────────────────────────────
  pillContainer: {
    position: 'absolute',
    bottom: 64,
    left: SPACING.md,
    zIndex: 10,
  },
  pill: {
    backgroundColor: glowColor(COLORS.background, 0.75),
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
    ...SHADOWS.sm,
  },
  pillText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.caption.lg,
  },

  // ── Card wrapper (full-screen overlay) ──────────────────────────────
  cardWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: glowColor(COLORS.background, 0.6),
  },

  // ── Card ────────────────────────────────────────────────────────────
  card: {
    width: '80%',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  cardLabel: {
    color: COLORS.primary,
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  cardText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.body.md,
    marginBottom: SPACING.lg,
  },

  // ── Buttons ─────────────────────────────────────────────────────────
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  secondaryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.button.md,
  },
  primaryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.button.md,
  },
});

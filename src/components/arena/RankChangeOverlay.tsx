/**
 * RankChangeOverlay — Full-screen promotion/demotion animation
 *
 * Animation sequence:
 * 1. Dark overlay fades in
 * 2. Old tier badge scales up to center (0.5s)
 * 3. White flash/burst pulse
 * 4. Old badge shrinks + fades, new badge springs in (0.4s)
 * 5. Promotion: sparkle particles + "PROMOTED!" / Demotion: subdued "Division Change"
 * 6. Auto-dismiss after 3s or tap to dismiss
 */

import { useEffect, useCallback, useRef } from 'react';
import type { ReactElement } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import type { RankedTier } from '../../stores/types';
import { COLORS, SPACING, ARENA } from '../../theme/tokens';
import { soundManager } from '../../audio/SoundManager';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TIER_COLORS: Record<RankedTier, string> = {
  novice: ARENA.rank.novice,
  apprentice: ARENA.rank.apprentice,
  performer: ARENA.rank.performer,
  virtuoso: ARENA.rank.virtuoso,
  maestro: ARENA.rank.maestro,
  prodigy: ARENA.rank.prodigy,
  luminary: ARENA.rank.luminary,
  legend: ARENA.rank.legend,
  grandmaster: ARENA.rank.grandmaster,
};

const TIER_LABELS: Record<RankedTier, string> = {
  novice: 'Novice',
  apprentice: 'Apprentice',
  performer: 'Performer',
  virtuoso: 'Virtuoso',
  maestro: 'Maestro',
  prodigy: 'Prodigy',
  luminary: 'Luminary',
  legend: 'Legend',
  grandmaster: 'Grandmaster',
};

const BADGE_SIZE = 120;
const SPARKLE_COUNT = 8;
const AUTO_DISMISS_MS = 3000;

interface RankChangeOverlayProps {
  visible: boolean;
  fromTier: RankedTier;
  toTier: RankedTier;
  isPromotion: boolean;
  onDismiss: () => void;
}

export function RankChangeOverlay({
  visible,
  fromTier,
  toTier,
  isPromotion,
  onDismiss,
}: RankChangeOverlayProps): ReactElement | null {
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shared values
  const overlayOpacity = useSharedValue(0);
  const oldBadgeScale = useSharedValue(0);
  const oldBadgeOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const newBadgeScale = useSharedValue(0);
  const newBadgeOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const sparkleProgress = useSharedValue(0);

  const handleDismiss = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (!visible) {
      // Reset all values when hidden
      overlayOpacity.value = 0;
      oldBadgeScale.value = 0;
      oldBadgeOpacity.value = 0;
      flashOpacity.value = 0;
      newBadgeScale.value = 0;
      newBadgeOpacity.value = 0;
      titleOpacity.value = 0;
      titleTranslateY.value = 20;
      sparkleProgress.value = 0;
      return;
    }

    // Play sound for promotion
    if (isPromotion) {
      soundManager.play('level_up');
    }

    // Step 1: Fade in overlay (0-300ms)
    overlayOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });

    // Step 2: Old badge scales up (300-800ms)
    oldBadgeScale.value = withDelay(
      300,
      withSpring(1, { damping: 15, stiffness: 150 }),
    );
    oldBadgeOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 300 }),
    );

    // Step 3: Flash burst (800-1100ms)
    flashOpacity.value = withDelay(
      800,
      withSequence(
        withTiming(0.8, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 250, easing: Easing.in(Easing.quad) }),
      ),
    );

    // Step 4: Old badge shrinks + fades, new badge springs in (900-1300ms)
    oldBadgeScale.value = withDelay(
      900,
      withTiming(0.3, { duration: 200, easing: Easing.in(Easing.quad) }),
    );
    oldBadgeOpacity.value = withDelay(
      900,
      withTiming(0, { duration: 200 }),
    );

    newBadgeScale.value = withDelay(
      1000,
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    newBadgeOpacity.value = withDelay(
      1000,
      withTiming(1, { duration: 200 }),
    );

    // Step 5: Title text (1200ms)
    titleOpacity.value = withDelay(
      1200,
      withTiming(1, { duration: 300 }),
    );
    titleTranslateY.value = withDelay(
      1200,
      withSpring(0, { damping: 15, stiffness: 150 }),
    );

    // Sparkles for promotion (1000-2000ms)
    if (isPromotion) {
      sparkleProgress.value = withDelay(
        1000,
        withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }),
      );
    }

    // Auto-dismiss timer
    dismissTimer.current = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
  }, [visible, isPromotion, handleDismiss, overlayOpacity, oldBadgeScale, oldBadgeOpacity, flashOpacity, newBadgeScale, newBadgeOpacity, titleOpacity, titleTranslateY, sparkleProgress]);

  // Animated styles
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const oldBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: oldBadgeScale.value }],
    opacity: oldBadgeOpacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const newBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: newBadgeScale.value }],
    opacity: newBadgeOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  if (!visible) return null;

  const fromColor = TIER_COLORS[fromTier];
  const toColor = TIER_COLORS[toTier];

  return (
    <Pressable
      style={styles.container}
      onPress={handleDismiss}
      accessibilityRole="button"
      accessibilityLabel={isPromotion ? 'Promoted! Tap to dismiss' : 'Division changed. Tap to dismiss'}
    >
      {/* Dark overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]} />

      {/* Flash burst */}
      <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />

      {/* Sparkle particles (promotion only) */}
      {isPromotion && (
        <SparkleParticles
          color={toColor}
          progress={sparkleProgress}
        />
      )}

      {/* Old tier badge */}
      <Animated.View style={[styles.badgeContainer, oldBadgeStyle]}>
        <TierBadge tier={fromTier} color={fromColor} />
      </Animated.View>

      {/* New tier badge */}
      <Animated.View style={[styles.badgeContainer, newBadgeStyle]}>
        <TierBadge tier={toTier} color={toColor} isNew />
      </Animated.View>

      {/* Title text */}
      <Animated.View style={[styles.titleContainer, titleStyle]}>
        <Text
          style={[
            styles.titleText,
            { color: isPromotion ? ARENA.promotionText : ARENA.demotionText },
          ]}
        >
          {isPromotion ? 'PROMOTED!' : 'Division Change'}
        </Text>
        <Text style={styles.subtitleText}>
          {TIER_LABELS[fromTier]} → {TIER_LABELS[toTier]}
        </Text>
        <Text style={styles.tapHint}>Tap to continue</Text>
      </Animated.View>
    </Pressable>
  );
}

// ── TierBadge sub-component ──

function TierBadge({
  tier,
  color,
  isNew = false,
}: {
  tier: RankedTier;
  color: string;
  isNew?: boolean;
}): ReactElement {
  const isGrandmaster = tier === 'grandmaster';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color,
          borderColor: isNew ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
          borderWidth: isNew ? 3 : 1,
        },
        isGrandmaster && styles.badgeGrandmaster,
      ]}
    >
      <Text style={styles.badgeText}>
        {TIER_LABELS[tier].charAt(0).toUpperCase()}
      </Text>
      <Text style={styles.badgeLabelText}>
        {TIER_LABELS[tier]}
      </Text>
    </View>
  );
}

// ── SparkleParticles sub-component ──

function SparkleParticles({
  color,
  progress,
}: {
  color: string;
  progress: Animated.SharedValue<number>;
}): ReactElement {
  const sparkles = Array.from({ length: SPARKLE_COUNT }, (_, i) => {
    const angle = (i / SPARKLE_COUNT) * Math.PI * 2;
    return { angle, index: i };
  });

  return (
    <>
      {sparkles.map(({ angle, index }) => (
        <SparkleParticle
          key={index}
          angle={angle}
          color={color}
          progress={progress}
        />
      ))}
    </>
  );
}

function SparkleParticle({
  angle,
  color,
  progress,
}: {
  angle: number;
  color: string;
  progress: Animated.SharedValue<number>;
}): ReactElement {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const radius = interpolate(p, [0, 1], [0, 140]);
    const opacity = interpolate(p, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
    const scale = interpolate(p, [0, 0.5, 1], [0, 1.2, 0.3]);

    return {
      position: 'absolute',
      left: SCREEN_WIDTH / 2 + Math.cos(angle) * radius - 4,
      top: SCREEN_HEIGHT / 2 - 40 + Math.sin(angle) * radius - 4,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: color,
      opacity,
      transform: [{ scale }],
    };
  });

  return <Animated.View style={style} pointerEvents="none" />;
}

RankChangeOverlay.displayName = 'RankChangeOverlay';

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  badgeContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - BADGE_SIZE / 2 - 40,
    left: SCREEN_WIDTH / 2 - BADGE_SIZE / 2,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeGrandmaster: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  badgeText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  badgeLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  titleContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 + BADGE_SIZE / 2,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  tapHint: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
});

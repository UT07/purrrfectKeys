/**
 * StreakFlame — Streak counter styled as a pill badge
 *
 * Matches the Lv/XP badge visual language on HomeScreen.
 * Uses the app's crimson+gold palette instead of clashing orange.
 * Standalone flame mode available via showCount={false}.
 *
 * Three color tiers: warm (1-6d), medium (7-29d), hot (30+d)
 */

import React, { useEffect, useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, glowColor } from '../theme/tokens';

interface StreakFlameProps {
  streak: number;
  showCount?: boolean;
  size?: 'small' | 'medium' | 'large';
}

interface TierColors {
  outer: [string, string];
  inner: [string, string];
  accent: string; // for pill text + border tint
}

// Crimson/gold palette — matches the app's existing tokens
const TIER_WARM: TierColors = {
  outer: ['#DC143C', '#8B0000'],
  inner: ['#FFD700', '#FFA500'],
  accent: COLORS.starGold,
};

const TIER_MEDIUM: TierColors = {
  outer: ['#C62828', '#7F0000'],
  inner: ['#FFD54F', '#FF8F00'],
  accent: '#FFB300',
};

const TIER_HOT: TierColors = {
  outer: ['#B71C1C', '#4A0000'],
  inner: ['#FFD700', '#FF6F00'],
  accent: '#FFD700',
};

const ICON_SIZES = { small: 18, medium: 28, large: 36 } as const;

function getConfig(streak: number, sizeKey: 'small' | 'medium' | 'large' = 'small') {
  const tier = streak >= 30 ? TIER_HOT : streak >= 7 ? TIER_MEDIUM : TIER_WARM;
  const iconSize = ICON_SIZES[sizeKey];
  const pulse = streak >= 30 ? 1.08 : streak >= 7 ? 1.05 : 1.03;
  return { iconSize, tier, pulse };
}

/** Compact flame icon — 2 layers, reads well from 18-36px */
function FlameSvg({ size, colors }: { size: number; colors: TierColors }): React.JSX.Element {
  const h = size * (32 / 24);
  return (
    <Svg width={size} height={h} viewBox="0 0 24 32">
      <Defs>
        <LinearGradient id="fo" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.outer[0]} />
          <Stop offset="1" stopColor={colors.outer[1]} />
        </LinearGradient>
        <LinearGradient id="fi" x1="0" y1="0.2" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.inner[0]} />
          <Stop offset="1" stopColor={colors.inner[1]} />
        </LinearGradient>
      </Defs>

      {/* Outer flame silhouette */}
      <Path
        d="M13 0 Q23 10, 22 18 Q21 30, 12 32 Q3 30, 2 18 Q1 10, 13 0 Z"
        fill="url(#fo)"
      />

      {/* Inner bright core */}
      <Path
        d="M13 8 Q18 15, 17 21 Q16 28, 12 29 Q8 28, 7 21 Q6 15, 13 8 Z"
        fill="url(#fi)"
      />
    </Svg>
  );
}

export function StreakFlame({ streak, showCount = true, size = 'small' }: StreakFlameProps): React.ReactElement | null {
  const config = useMemo(() => getConfig(streak, size), [streak, size]);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (streak <= 0) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(config.pulse, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [streak, scale, config.pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (streak <= 0) return null;

  // Standalone flame (no pill) when showCount is false
  if (!showCount) {
    return (
      <Animated.View style={[styles.standalone, animatedStyle]}>
        <FlameSvg size={config.iconSize} colors={config.tier} />
      </Animated.View>
    );
  }

  // Pill badge — matches Lv/XP badge style on HomeScreen
  return (
    <Animated.View
      style={[
        styles.pill,
        {
          backgroundColor: glowColor(config.tier.accent, 0.1),
          borderColor: glowColor(config.tier.accent, 0.2),
        },
        animatedStyle,
      ]}
    >
      <FlameSvg size={config.iconSize} colors={config.tier} />
      <Text style={[styles.count, { color: config.tier.accent }]}>{streak}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  standalone: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  count: {
    ...TYPOGRAPHY.body.sm,
    fontWeight: '700',
  },
});

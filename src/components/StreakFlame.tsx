/**
 * StreakFlame - Premium multi-layered SVG flame with animated flicker
 *
 * Three visual tiers based on streak length:
 * - Warm (1-6 days): Orange/yellow flame, gentle pulse
 * - Medium (7-29 days): Deep orange flame, moderate pulse
 * - Hot (30+ days): Red/crimson flame, intense pulse with stronger glow
 *
 * The flame uses 3 SVG path layers (outer → middle → core) with
 * gradient fills for a rich, non-flat look.
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, glowColor } from '../theme/tokens';

interface StreakFlameProps {
  streak: number;
  showCount?: boolean;
  size?: 'small' | 'medium' | 'large';
}

interface FlameColors {
  outer: [string, string];     // gradient top → bottom
  middle: [string, string];
  core: [string, string];
  glow: string;
  text: string;
}

const FLAME_WARM: FlameColors = {
  outer: ['#FF8C00', '#FF6B00'],
  middle: ['#FFA726', '#FF8C00'],
  core: ['#FFD54F', '#FFAB40'],
  glow: glowColor('#FF9800', 0.25),
  text: COLORS.streakFlameWarm,
};

const FLAME_MEDIUM: FlameColors = {
  outer: ['#FF5722', '#E64A19'],
  middle: ['#FF7043', '#FF5722'],
  core: ['#FFAB40', '#FF8C00'],
  glow: glowColor('#FF6B00', 0.35),
  text: COLORS.streakFlameMedium,
};

const FLAME_HOT: FlameColors = {
  outer: ['#D32F2F', '#B71C1C'],
  middle: ['#FF5252', '#D32F2F'],
  core: ['#FFAB40', '#FF6D00'],
  glow: glowColor('#FF4500', 0.45),
  text: COLORS.streakFlameHot,
};

function getFlameConfig(streak: number, sizeOverride?: 'small' | 'medium' | 'large') {
  const sizes = { small: 28, medium: 40, large: 56 };
  const iconSize = sizeOverride ? sizes[sizeOverride] : streak >= 30 ? 56 : streak >= 7 ? 40 : 28;
  const colors = streak >= 30 ? FLAME_HOT : streak >= 7 ? FLAME_MEDIUM : FLAME_WARM;
  const intensity = streak >= 30 ? 1.12 : streak >= 7 ? 1.08 : 1.04;

  return { iconSize, colors, intensity };
}

/**
 * Multi-layered SVG flame with 3 path layers + radial glow.
 * viewBox is 24x32 — taller than wide for a natural flame shape.
 */
function FlameSvg({ size, colors }: { size: number; colors: FlameColors }): React.JSX.Element {
  return (
    <Svg width={size} height={size * 1.33} viewBox="0 0 24 32">
      <Defs>
        <LinearGradient id="outerGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.outer[0]} />
          <Stop offset="1" stopColor={colors.outer[1]} />
        </LinearGradient>
        <LinearGradient id="midGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.middle[0]} />
          <Stop offset="1" stopColor={colors.middle[1]} />
        </LinearGradient>
        <LinearGradient id="coreGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.core[0]} />
          <Stop offset="1" stopColor={colors.core[1]} />
        </LinearGradient>
        <RadialGradient id="glowGrad" cx="12" cy="20" rx="14" ry="18" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={colors.outer[0]} stopOpacity="0.3" />
          <Stop offset="1" stopColor={colors.outer[0]} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Ambient glow */}
      <Path d="M-2 8 Q12 -4 26 8 Q26 36 12 36 Q-2 36 -2 8Z" fill="url(#glowGrad)" />

      {/* Outer flame — widest, deepest color */}
      <Path
        d="M12 2 Q16 6 18 10 Q21 15 20 20 Q19 25 17 27 Q14 30 12 30 Q10 30 7 27 Q5 25 4 20 Q3 15 6 10 Q8 6 12 2Z"
        fill="url(#outerGrad)"
      />

      {/* Middle flame — medium width */}
      <Path
        d="M12 6 Q15 9 16.5 13 Q18 17 17 21 Q16 24 14.5 26 Q13 27 12 27 Q11 27 9.5 26 Q8 24 7 21 Q6 17 7.5 13 Q9 9 12 6Z"
        fill="url(#midGrad)"
      />

      {/* Inner core — brightest, narrowest */}
      <Path
        d="M12 11 Q13.5 14 14 16.5 Q14.5 19 14 22 Q13.5 24 12 25 Q10.5 24 10 22 Q9.5 19 10 16.5 Q10.5 14 12 11Z"
        fill="url(#coreGrad)"
      />
    </Svg>
  );
}

export function StreakFlame({ streak, showCount = true, size }: StreakFlameProps): React.ReactElement | null {
  const config = useMemo(() => getFlameConfig(streak, size), [streak, size]);
  const scale = useSharedValue(1);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    if (streak <= 0) return;

    // Flame body: gentle scale pulse
    scale.value = withRepeat(
      withSequence(
        withTiming(config.intensity, { duration: 500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    // Glow: slightly offset timing for organic feel
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.95, { duration: 600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [streak, scale, glowScale, config.intensity]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowScale.value * 0.7,
  }));

  if (streak <= 0) return null;

  const glowDiameter = config.iconSize * 1.8;

  return (
    <View style={styles.container}>
      {/* Glow halo behind the flame */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: config.colors.glow,
            width: glowDiameter,
            height: glowDiameter,
            borderRadius: glowDiameter / 2,
          },
          glowStyle,
        ]}
      />

      {/* Animated flame */}
      <Animated.View style={[styles.flameWrap, flameStyle]}>
        <FlameSvg size={config.iconSize} colors={config.colors} />
      </Animated.View>

      {showCount && (
        <Text style={[styles.count, { color: config.colors.text }]}>{streak}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  count: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '800',
    marginTop: 2,
  },
});

/**
 * ScoreRing Component
 * Animated circular score indicator using SVG.
 * The ring fills clockwise from 0 to score% over 800ms.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export interface ScoreRingProps {
  score: number;
  size: number;
  strokeWidth?: number;
  animated?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 95) return '#FFD700';
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#FF9800';
  return '#F44336';
}

function AnimatedForeground({
  cx,
  cy,
  radius,
  color,
  strokeWidth,
  circumference,
  targetOffset,
}: {
  cx: number;
  cy: number;
  radius: number;
  color: string;
  strokeWidth: number;
  circumference: number;
  targetOffset: number;
}): React.JSX.Element {
  const AnimatedCircle = React.useMemo(
    () => Animated.createAnimatedComponent(Circle),
    [],
  );

  const progress = useSharedValue(circumference);

  useEffect(() => {
    progress.value = withTiming(targetOffset, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, targetOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: progress.value,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={radius}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeDasharray={circumference}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
}

export function ScoreRing({
  score,
  size,
  strokeWidth = 6,
  animated = true,
}: ScoreRingProps): React.JSX.Element {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = (1 - score / 100) * circumference;
  const color = getScoreColor(score);
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]} testID="score-ring">
      <Svg width={size} height={size} style={styles.svg}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#333333"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {animated ? (
          <AnimatedForeground
            cx={center}
            cy={center}
            radius={radius}
            color={color}
            strokeWidth={strokeWidth}
            circumference={circumference}
            targetOffset={targetOffset}
          />
        ) : (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={targetOffset}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <View style={styles.labelContainer}>
        <Text style={[styles.scoreText, { fontSize: size * 0.3, color }]}>
          {score}
        </Text>
        <Text style={[styles.percentText, { fontSize: size * 0.15, color }]}>
          %
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: [{ rotate: '-90deg' }],
  },
  labelContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: 'bold',
  },
  percentText: {
    fontWeight: '600',
  },
});

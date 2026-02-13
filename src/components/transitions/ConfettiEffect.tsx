/**
 * ConfettiEffect Component
 * Simple confetti animation overlay for celebrations
 * Uses react-native-reanimated for performant particle animations
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = ['#DC143C', '#FFD700', '#FFFFFF', '#4CAF50'];
const PARTICLE_COUNT = 25;
const ANIMATION_DURATION = 2500;

interface Particle {
  id: number;
  startX: number;
  endX: number;
  size: number;
  color: string;
  delay: number;
  isSquare: boolean;
}

function generateParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const startX = Math.random() * SCREEN_WIDTH;
    const drift = (Math.random() - 0.5) * 120;
    particles.push({
      id: i,
      startX,
      endX: startX + drift,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 400,
      isSquare: Math.random() > 0.5,
    });
  }
  return particles;
}

interface ConfettiParticleProps {
  particle: Particle;
}

function ConfettiParticle({ particle }: ConfettiParticleProps): React.JSX.Element {
  const translateY = useSharedValue(-particle.size);
  const translateX = useSharedValue(particle.startX);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      particle.delay,
      withTiming(SCREEN_HEIGHT + particle.size, {
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.quad),
      })
    );
    translateX.value = withDelay(
      particle.delay,
      withTiming(particle.endX, {
        duration: ANIMATION_DURATION,
        easing: Easing.inOut(Easing.sin),
      })
    );
    opacity.value = withDelay(
      particle.delay + ANIMATION_DURATION * 0.7,
      withTiming(0, {
        duration: ANIMATION_DURATION * 0.3,
        easing: Easing.out(Easing.cubic),
      })
    );
    rotate.value = withDelay(
      particle.delay,
      withTiming(360 * (Math.random() > 0.5 ? 1 : -1), {
        duration: ANIMATION_DURATION,
        easing: Easing.linear,
      })
    );
  }, [translateY, translateX, opacity, rotate, particle]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.isSquare ? 2 : particle.size / 2,
          backgroundColor: particle.color,
        },
        animatedStyle,
      ]}
    />
  );
}

export interface ConfettiEffectProps {
  testID?: string;
}

/**
 * ConfettiEffect - Overlay with falling colored particles
 * Place as an absolute-positioned overlay above other content
 */
export function ConfettiEffect({ testID }: ConfettiEffectProps): React.JSX.Element {
  const particles = useMemo(() => generateParticles(), []);

  return (
    <Animated.View
      style={styles.container}
      pointerEvents="none"
      testID={testID}
    >
      {particles.map((particle) => (
        <ConfettiParticle key={particle.id} particle={particle} />
      ))}
    </Animated.View>
  );
}

ConfettiEffect.displayName = 'ConfettiEffect';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

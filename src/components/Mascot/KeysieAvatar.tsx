import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { KeysieSvg } from './KeysieSvg';
import type { MascotMood, MascotSize } from './types';

interface KeysieAvatarProps {
  mood: MascotMood;
  size?: MascotSize;
  animated?: boolean;
  showParticles?: boolean;
}

const PARTICLE_COUNT = 5;

function useIdleAnimation(animated: boolean): Animated.AnimateStyle<{ transform: { scale: number }[] }> {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!animated) {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [animated, scale]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
}

function useCelebratingAnimation(animated: boolean): Animated.AnimateStyle<{ transform: { translateY: number }[] }> {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      translateY.value = 0;
      return;
    }
    translateY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 400, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [animated, translateY]);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
}

function useEncouragingAnimation(animated: boolean): Animated.AnimateStyle<{ transform: { rotate: string }[] }> {
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      rotate.value = 0;
      return;
    }
    rotate.value = withSequence(
      withTiming(4, { duration: 250, easing: Easing.inOut(Easing.ease) }),
      withTiming(-4, { duration: 500, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 250, easing: Easing.inOut(Easing.ease) }),
    );
  }, [animated, rotate]);

  return useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));
}

function useTeachingAnimation(animated: boolean): Animated.AnimateStyle<{ transform: { rotate: string }[] }> {
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (!animated) {
      rotate.value = 0;
      return;
    }
    rotate.value = withTiming(-6, { duration: 600, easing: Easing.out(Easing.ease) });
  }, [animated, rotate]);

  return useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));
}

function useExcitedAnimation(animated: boolean): Animated.AnimateStyle<{ transform: { scale: number }[] }> {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!animated) {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 250, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 250, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [animated, scale]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
}

function StarParticles(): ReactElement {
  return (
    <View style={styles.particles} testID="keysie-particles">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <ParticleStar key={i} index={i} />
      ))}
    </View>
  );
}

function ParticleStar({ index }: { index: number }): ReactElement {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const delay = index * 200;
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0, { duration: 600 }),
        ),
        -1,
        false,
      ),
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration: 1000 }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
  }, [index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const horizontalOffset = (index - Math.floor(PARTICLE_COUNT / 2)) * 12;

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: horizontalOffset },
        animatedStyle,
      ]}
    >
      <Text style={styles.starText}>{'\u2B50'}</Text>
    </Animated.View>
  );
}

function useAnimationForMood(mood: MascotMood, animated: boolean): Animated.AnimateStyle<Record<string, unknown>> {
  const idle = useIdleAnimation(animated && mood === 'happy');
  const celebrating = useCelebratingAnimation(animated && mood === 'celebrating');
  const encouraging = useEncouragingAnimation(animated && mood === 'encouraging');
  const teaching = useTeachingAnimation(animated && mood === 'teaching');
  const excited = useExcitedAnimation(animated && mood === 'excited');

  switch (mood) {
    case 'celebrating':
      return celebrating;
    case 'encouraging':
      return encouraging;
    case 'teaching':
      return teaching;
    case 'excited':
      return excited;
    case 'happy':
    default:
      return idle;
  }
}

export function KeysieAvatar({
  mood,
  size = 'medium',
  animated = true,
  showParticles = false,
}: KeysieAvatarProps): ReactElement {
  const animatedStyle = useAnimationForMood(mood, animated);

  return (
    <View style={styles.container}>
      {showParticles && mood === 'celebrating' && <StarParticles />}
      <Animated.View testID="keysie-avatar" style={animatedStyle}>
        <KeysieSvg mood={mood} size={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  particles: {
    position: 'absolute',
    top: -10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 1,
  },
  particle: {
    position: 'absolute',
  },
  starText: {
    fontSize: 10,
  },
});

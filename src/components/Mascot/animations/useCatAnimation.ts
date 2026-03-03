/**
 * useCatAnimation — Per-part spring physics for SVG cat layers.
 *
 * Returns animated transform props for each body part layer.
 * Only active for large/hero sizes (isAnimated=true).
 * When disabled, returns static identity transforms for zero overhead.
 */

import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated';

import type { CatPose } from './catAnimations';
import { PART_SPRINGS, SQUASH_STRETCH } from './catAnimations';
import type { PartName } from './catAnimations';

/** Static identity transform string for non-animated parts */
const IDENTITY_TRANSFORM = '';

/** Animated props shape returned for each part */
export interface PartAnimatedProps {
  transform: string;
}

/** All part animated props returned by the hook */
export interface CatAnimationParts {
  bodyProps: PartAnimatedProps;
  headProps: PartAnimatedProps;
  earProps: PartAnimatedProps;
  tailProps: PartAnimatedProps;
  faceProps: PartAnimatedProps;
  accessoryProps: PartAnimatedProps;
}

/** Static (non-animated) part props */
const STATIC_PROPS: PartAnimatedProps = { transform: IDENTITY_TRANSFORM };

const STATIC_PARTS: CatAnimationParts = {
  bodyProps: STATIC_PROPS,
  headProps: STATIC_PROPS,
  earProps: STATIC_PROPS,
  tailProps: STATIC_PROPS,
  faceProps: STATIC_PROPS,
  accessoryProps: STATIC_PROPS,
};

function usePartSpring(part: PartName, pose: CatPose, isAnimated: boolean) {
  const spring = PART_SPRINGS[part];
  const translateY = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);

  useEffect(() => {
    if (!isAnimated) {
      translateY.value = 0;
      scaleX.value = 1;
      scaleY.value = 1;
      return;
    }

    const springConfig = {
      damping: spring.damping,
      stiffness: spring.stiffness,
      mass: spring.mass,
    };

    // Apply pose-driven translateY with delay
    const poseCfg = SQUASH_STRETCH[pose];
    const partSquash = poseCfg?.[part];

    if (partSquash && partSquash.length > 0) {
      // Squash/stretch sequence
      const seqX = partSquash.map((kf) =>
        withSpring(kf.scaleX, springConfig),
      );
      const seqY = partSquash.map((kf) =>
        withSpring(kf.scaleY, springConfig),
      );
      scaleX.value = withDelay(spring.delay, withSequence(...seqX));
      scaleY.value = withDelay(spring.delay, withSequence(...seqY));
    } else {
      scaleX.value = withDelay(
        spring.delay,
        withSpring(1, springConfig),
      );
      scaleY.value = withDelay(
        spring.delay,
        withSpring(1, springConfig),
      );
    }
  }, [pose, isAnimated, translateY, scaleX, scaleY, spring]);

  return useAnimatedProps(() => ({
    transform: isAnimated
      ? `translate(0, ${translateY.value}) scale(${scaleX.value}, ${scaleY.value})`
      : IDENTITY_TRANSFORM,
  }));
}

export function useCatAnimation(
  pose: CatPose,
  isAnimated: boolean,
): CatAnimationParts {
  const bodyProps = usePartSpring('body', pose, isAnimated);
  const headProps = usePartSpring('head', pose, isAnimated);
  const earProps = usePartSpring('ears', pose, isAnimated);
  const tailProps = usePartSpring('tail', pose, isAnimated);
  const faceProps = usePartSpring('face', pose, isAnimated);
  const accessoryProps = usePartSpring('accessories', pose, isAnimated);

  if (!isAnimated) {
    return STATIC_PARTS;
  }

  return {
    bodyProps,
    headProps,
    earProps,
    tailProps,
    faceProps,
    accessoryProps,
  };
}

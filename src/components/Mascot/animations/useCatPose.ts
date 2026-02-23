/**
 * useCatPose — Reanimated hook that drives CatAvatar animations from pose configs.
 *
 * Converts PoseConfig keyframe sequences into Reanimated shared value animations.
 * Returns an animated style that can be applied to the CatAvatar container.
 */

import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

import type { CatPose, PoseKeyframe } from './catAnimations';
import { POSE_CONFIGS } from './catAnimations';
import type { ViewStyle } from 'react-native';

interface CatPoseStyle {
  transform: ViewStyle['transform'];
}

/** Build a Reanimated animation sequence from keyframes for a single property */
function buildSequence(
  keyframes: PoseKeyframe[],
  property: keyof Pick<PoseKeyframe, 'translateY' | 'scale' | 'rotate'>,
): number {
  const timings = keyframes.map((kf) =>
    withTiming(kf[property], {
      duration: kf.duration,
      easing: Easing.inOut(Easing.ease),
    }),
  );

  if (timings.length === 1) return timings[0];
  return withSequence(...timings);
}

export function useCatPose(pose: CatPose): CatPoseStyle {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  const prevPoseRef = useRef<CatPose>(pose);

  useEffect(() => {
    const config = POSE_CONFIGS[pose];
    const { keyframes, loop } = config;

    if (keyframes.length === 0) return;

    const seqY = buildSequence(keyframes, 'translateY');
    const seqS = buildSequence(keyframes, 'scale');
    const seqR = buildSequence(keyframes, 'rotate');

    if (loop) {
      translateY.value = withRepeat(seqY, -1, true);
      scale.value = withRepeat(seqS, -1, true);
      rotate.value = withRepeat(seqR, -1, true);
    } else {
      translateY.value = seqY;
      scale.value = seqS;
      rotate.value = seqR;
    }

    prevPoseRef.current = pose;
  }, [pose, translateY, scale, rotate]);

  return useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));
}

/**
 * useMoodTransition — Smooth face morph when mood changes.
 *
 * Returns a scaleY shared value for the face group. When mood changes,
 * it does a quick squash (scaleY 1 → 0.1 → 1) to create a "morph" effect
 * as the SVG expression swaps.
 */

import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { MascotMood } from '../types';

export interface MoodTransitionValues {
  faceScaleY: SharedValue<number>;
}

export function useMoodTransition(mood: MascotMood): MoodTransitionValues {
  const faceScaleY = useSharedValue(1);
  const prevMoodRef = useRef<MascotMood>(mood);

  useEffect(() => {
    if (prevMoodRef.current !== mood) {
      // Quick squash-and-recover to simulate face morphing
      faceScaleY.value = withSequence(
        withTiming(0.1, { duration: 80 }),
        withSpring(1, { damping: 12, stiffness: 100 }),
      );
      prevMoodRef.current = mood;
    }
  }, [mood, faceScaleY]);

  return { faceScaleY };
}

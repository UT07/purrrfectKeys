/**
 * useMicroAnimations — Autonomous micro-animation loops for SVG cats.
 *
 * Returns shared values for 5 animation channels:
 * - Breathing (body scaleY + translateY oscillation)
 * - Eye blinks (eyes scaleY snap at random intervals)
 * - Ear twitches (left/right ear rotate at random intervals)
 * - Tail swish (continuous tail rotation oscillation)
 *
 * Each loop runs independently. Random-interval animations (blinks, twitches)
 * use JS-thread setTimeout to trigger Reanimated worklet animations.
 */

import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { MascotMood } from '../types';

export interface MicroAnimationValues {
  breathScale: SharedValue<number>;
  breathTranslateY: SharedValue<number>;
  eyeScaleY: SharedValue<number>;
  leftEarRotate: SharedValue<number>;
  rightEarRotate: SharedValue<number>;
  tailRotate: SharedValue<number>;
}

interface MicroAnimationOptions {
  enabled?: boolean;
  mood?: MascotMood;
}

/** Mood → tail swish cycle duration in ms */
function tailCycleDuration(mood?: MascotMood): number {
  switch (mood) {
    case 'excited':
    case 'celebrating':
      return 1500;
    case 'sleepy':
      return 4000;
    default:
      return 2500;
  }
}

/** Mood → breathing cycle duration in ms */
function breathCycleDuration(mood?: MascotMood): number {
  switch (mood) {
    case 'excited':
    case 'celebrating':
      return 2200;
    case 'sleepy':
      return 4000;
    default:
      return 3000;
  }
}

export function useMicroAnimations(
  options?: MicroAnimationOptions,
): MicroAnimationValues {
  const enabled = options?.enabled ?? true;
  const mood = options?.mood;

  const breathScale = useSharedValue(1);
  const breathTranslateY = useSharedValue(0);
  const eyeScaleY = useSharedValue(1);
  const leftEarRotate = useSharedValue(0);
  const rightEarRotate = useSharedValue(0);
  const tailRotate = useSharedValue(0);

  // Track timeouts for cleanup
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const earTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Breathing (continuous) ──
  useEffect(() => {
    if (!enabled) return;
    const dur = breathCycleDuration(mood);
    const halfDur = dur / 2;

    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: halfDur, easing: Easing.inOut(Easing.sin) }),
        withTiming(1.0, { duration: halfDur, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    breathTranslateY.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: halfDur, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: halfDur, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [enabled, mood, breathScale, breathTranslateY]);

  // ── Tail swish (continuous) ──
  useEffect(() => {
    if (!enabled) return;
    const dur = tailCycleDuration(mood);
    const halfDur = dur / 2;

    tailRotate.value = withRepeat(
      withSequence(
        withTiming(8, { duration: halfDur, easing: Easing.inOut(Easing.sin) }),
        withTiming(-8, { duration: halfDur, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [enabled, mood, tailRotate]);

  // ── Eye blinks (random interval) ──
  useEffect(() => {
    if (!enabled) return;

    function scheduleBlink() {
      const delay = 3000 + Math.random() * 4000; // 3-7s
      blinkTimeoutRef.current = setTimeout(() => {
        // 20% chance of double blink
        const isDouble = Math.random() < 0.2;

        if (isDouble) {
          eyeScaleY.value = withSequence(
            withTiming(0.1, { duration: 60 }),
            withTiming(1, { duration: 60 }),
            withTiming(0.1, { duration: 60 }),
            withTiming(1, { duration: 60 }),
          );
        } else {
          eyeScaleY.value = withSequence(
            withTiming(0.1, { duration: 75 }),
            withTiming(1, { duration: 75 }),
          );
        }

        scheduleBlink();
      }, delay);
    }

    scheduleBlink();

    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    };
  }, [enabled, eyeScaleY]);

  // ── Ear twitches (random interval, asymmetric) ──
  useEffect(() => {
    if (!enabled) return;

    function scheduleEarTwitch() {
      const delay = 4000 + Math.random() * 6000; // 4-10s
      earTimeoutRef.current = setTimeout(() => {
        const leftAngle = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 7);
        const rightAngle = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 7);

        // Only twitch one ear 60% of the time, both ears 40%
        const twitchBoth = Math.random() < 0.4;

        leftEarRotate.value = withSequence(
          withTiming(leftAngle, { duration: 200 }),
          withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }),
        );

        if (twitchBoth) {
          rightEarRotate.value = withSequence(
            withTiming(rightAngle, { duration: 200 }),
            withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }),
          );
        }

        scheduleEarTwitch();
      }, delay);
    }

    scheduleEarTwitch();

    return () => {
      if (earTimeoutRef.current) clearTimeout(earTimeoutRef.current);
    };
  }, [enabled, leftEarRotate, rightEarRotate]);

  return {
    breathScale,
    breathTranslateY,
    eyeScaleY,
    leftEarRotate,
    rightEarRotate,
    tailRotate,
  };
}

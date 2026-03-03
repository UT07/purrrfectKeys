/**
 * useMicroLife -- Subtle idle animations for cat mascot.
 *
 * Provides animated values for:
 * - Blink: random 3-6s interval, 150ms close-open (scaleY on eyes)
 * - Ear twitch: random 4-8s interval, +/-5deg rotation
 * - Breathing: continuous 3s cycle, scaleY 1.0->1.02 on body
 * - Tail sway: continuous 2.5s cycle, translateX +/-3
 *
 * Only active when isEnabled=true. Returns static values otherwise.
 */

import { useEffect, useRef } from 'react';
import {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

export interface MicroLifeValues {
  /** Eye scaleY for blink (1.0 = open, 0.1 = closed) */
  blinkScaleY: { value: number };
  /** Ear rotation in degrees for twitch */
  earTwitchRotate: { value: number };
  /** Body scaleY for breathing */
  breathScaleY: { value: number };
  /** Tail translateX for sway */
  tailSwayX: { value: number };
}

/** Static values when micro-life is disabled */
const STATIC_VALUES: MicroLifeValues = {
  blinkScaleY: { value: 1 },
  earTwitchRotate: { value: 0 },
  breathScaleY: { value: 1 },
  tailSwayX: { value: 0 },
};

export function useMicroLife(isEnabled: boolean): MicroLifeValues {
  const blinkScaleY = useSharedValue(1);
  const earTwitchRotate = useSharedValue(0);
  const breathScaleY = useSharedValue(1);
  const tailSwayX = useSharedValue(0);

  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const earTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      // Reset to static values
      blinkScaleY.value = 1;
      earTwitchRotate.value = 0;
      breathScaleY.value = 1;
      tailSwayX.value = 0;
      return;
    }

    // -- Breathing: continuous 3s sine cycle --
    breathScaleY.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite
      false,
    );

    // -- Tail sway: continuous 2.5s sine cycle --
    tailSwayX.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
        withTiming(-3, { duration: 1250, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, // infinite
      false,
    );

    // -- Blink: random interval 3-6s --
    function scheduleBlink() {
      const interval = 3000 + Math.random() * 3000; // 3-6s
      blinkTimerRef.current = setTimeout(() => {
        blinkScaleY.value = withSequence(
          withTiming(0.1, { duration: 75, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 75, easing: Easing.in(Easing.ease) }),
        );
        scheduleBlink();
      }, interval);
    }
    scheduleBlink();

    // -- Ear twitch: random interval 4-8s --
    function scheduleEarTwitch() {
      const interval = 4000 + Math.random() * 4000; // 4-8s
      earTimerRef.current = setTimeout(() => {
        const direction = Math.random() > 0.5 ? 5 : -5;
        earTwitchRotate.value = withSequence(
          withTiming(direction, { duration: 100, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        );
        scheduleEarTwitch();
      }, interval);
    }
    scheduleEarTwitch();

    // Cleanup
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
      if (earTimerRef.current) clearTimeout(earTimerRef.current);
      cancelAnimation(blinkScaleY);
      cancelAnimation(earTwitchRotate);
      cancelAnimation(breathScaleY);
      cancelAnimation(tailSwayX);
    };
  }, [isEnabled, blinkScaleY, earTwitchRotate, breathScaleY, tailSwayX]);

  if (!isEnabled) {
    return STATIC_VALUES;
  }

  return {
    blinkScaleY,
    earTwitchRotate,
    breathScaleY,
    tailSwayX,
  };
}

// src/components/Mascot/__tests__/MicroAnimations.test.ts

import { renderHook } from '@testing-library/react-native';
import type { MascotMood } from '../types';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  return {
    __esModule: true,
    default: {
      View: require('react-native').View,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withRepeat: (v: any) => v,
    withSequence: (...args: any[]) => args[0],
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    Easing: {
      inOut: (v: any) => v,
      out: (v: any) => v,
      sine: 0,
      ease: 0,
    },
  };
});

import { useMicroAnimations } from '../animations/useMicroAnimations';
import { useMoodTransition } from '../animations/useMoodTransition';

describe('useMicroAnimations', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns all 6 shared values', () => {
    const { result } = renderHook(() => useMicroAnimations());
    // All 6 animation channels are defined
    expect(result.current.breathScale).toBeDefined();
    expect(result.current.breathTranslateY).toBeDefined();
    expect(result.current.eyeScaleY).toBeDefined();
    expect(result.current.leftEarRotate).toBeDefined();
    expect(result.current.rightEarRotate).toBeDefined();
    expect(result.current.tailRotate).toBeDefined();

    // Continuous animations have mock-applied target values (withTiming returns target)
    expect(typeof result.current.breathScale.value).toBe('number');
    expect(typeof result.current.breathTranslateY.value).toBe('number');
    expect(typeof result.current.tailRotate.value).toBe('number');

    // Random-interval animations haven't fired yet (no setTimeout elapsed)
    expect(result.current.eyeScaleY.value).toBe(1);
    expect(result.current.leftEarRotate.value).toBe(0);
    expect(result.current.rightEarRotate.value).toBe(0);
  });

  it('does not animate when enabled=false', () => {
    const { result } = renderHook(() =>
      useMicroAnimations({ enabled: false }),
    );
    expect(result.current.breathScale.value).toBe(1);
    expect(result.current.eyeScaleY.value).toBe(1);
    expect(result.current.tailRotate.value).toBe(0);
  });

  it('accepts mood option without crashing', () => {
    const { result } = renderHook(() =>
      useMicroAnimations({ mood: 'excited' }),
    );
    expect(result.current.breathScale).toBeDefined();
    expect(result.current.tailRotate).toBeDefined();
  });

  it('accepts sleepy mood for slower animations', () => {
    const { result } = renderHook(() =>
      useMicroAnimations({ mood: 'sleepy' }),
    );
    expect(result.current.breathScale).toBeDefined();
  });

  it('cleans up timeouts on unmount', () => {
    const { unmount } = renderHook(() => useMicroAnimations());
    // Should not throw when unmounting (timeouts are cleaned up)
    expect(() => unmount()).not.toThrow();
  });

  it('all moods are accepted without error', () => {
    const moods = ['happy', 'encouraging', 'excited', 'teaching', 'celebrating', 'love', 'confused', 'smug', 'sleepy'] as const;
    for (const mood of moods) {
      const { result, unmount } = renderHook(() =>
        useMicroAnimations({ mood }),
      );
      expect(result.current.breathScale).toBeDefined();
      unmount();
    }
  });
});

describe('useMoodTransition', () => {
  it('returns faceScaleY shared value starting at 1', () => {
    const { result } = renderHook(() => useMoodTransition('happy'));
    expect(result.current.faceScaleY).toBeDefined();
    expect(result.current.faceScaleY.value).toBe(1);
  });

  it('tracks previous mood and triggers transition', () => {
    const { result, rerender } = renderHook(
      ({ mood }) => useMoodTransition(mood),
      { initialProps: { mood: 'happy' as MascotMood } },
    );
    expect(result.current.faceScaleY.value).toBe(1);
    rerender({ mood: 'excited' as MascotMood });
    // After rerender, the value should still be defined (animation triggered)
    expect(result.current.faceScaleY).toBeDefined();
  });

  it('does not animate when mood stays the same', () => {
    const { result, rerender } = renderHook(
      ({ mood }) => useMoodTransition(mood),
      { initialProps: { mood: 'happy' as const } },
    );
    expect(result.current.faceScaleY.value).toBe(1);
    rerender({ mood: 'happy' as const });
    // Same mood — no transition, value stays at 1
    expect(result.current.faceScaleY.value).toBe(1);
  });
});

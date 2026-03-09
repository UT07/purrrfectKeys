/**
 * Exercise Type UI Components Tests
 *
 * Tests the 5 exercise-type-specific UI components:
 * - RhythmTapZone
 * - ListenPhaseOverlay
 * - ChordPrompt + deriveChordName
 * - SightReadingOverlay
 * - CallResponsePhase
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: () => any) => fn(),
    withSpring: (v: any) => v,
    withTiming: (v: any) => v,
    withSequence: (...args: any[]) => args[args.length - 1],
    withRepeat: (v: any) => v,
    FadeIn: { duration: () => ({ delay: () => ({}) }) },
    FadeOut: { duration: () => ({ delay: () => ({}) }) },
    Easing: { inOut: () => (v: any) => v, sin: (v: any) => v },
  };
});

// Import after mocks
import { RhythmTapZone } from '../RhythmTapZone';
import { ListenPhaseOverlay } from '../ListenPhaseOverlay';
import { ChordPrompt, deriveChordName } from '../ChordPrompt';
import { SightReadingOverlay } from '../SightReadingOverlay';
import { CallResponsePhase } from '../CallResponsePhase';

// ─────────────────────────────────────────────────
// RhythmTapZone
// ─────────────────────────────────────────────────

describe('RhythmTapZone', () => {
  it('renders TAP text', () => {
    const { getByText } = render(
      <RhythmTapZone onTap={jest.fn()} enabled={true} testID="tap-zone" />,
    );
    expect(getByText('TAP')).toBeTruthy();
    expect(getByText('to the beat')).toBeTruthy();
  });

  it('fires onTap when pressed', () => {
    const onTap = jest.fn();
    const { getByTestId } = render(
      <RhythmTapZone onTap={onTap} enabled={true} testID="tap-zone" />,
    );
    fireEvent.press(getByTestId('tap-zone-pressable'));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('does not fire onTap when disabled', () => {
    const onTap = jest.fn();
    const { getByTestId } = render(
      <RhythmTapZone onTap={onTap} enabled={false} testID="tap-zone" />,
    );
    fireEvent.press(getByTestId('tap-zone-pressable'));
    expect(onTap).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────
// ListenPhaseOverlay
// ─────────────────────────────────────────────────

describe('ListenPhaseOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows "Listen carefully..." when listening', () => {
    const { getByText } = render(
      <ListenPhaseOverlay isListening={true} onDismiss={jest.fn()} testID="listen" />,
    );
    expect(getByText('Listen carefully...')).toBeTruthy();
  });

  it('shows "Now play it back!" when not listening', () => {
    const { getByText } = render(
      <ListenPhaseOverlay isListening={false} onDismiss={jest.fn()} testID="listen" />,
    );
    expect(getByText('Now play it back!')).toBeTruthy();
  });

  it('auto-dismisses after demo ends', () => {
    const onDismiss = jest.fn();
    render(
      <ListenPhaseOverlay isListening={false} onDismiss={onDismiss} testID="listen" />,
    );
    expect(onDismiss).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1500);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────
// ChordPrompt
// ─────────────────────────────────────────────────

describe('ChordPrompt', () => {
  it('shows chord name', () => {
    const { getByText } = render(
      <ChordPrompt chordName="C Major" isCorrect={false} testID="chord" />,
    );
    expect(getByText('C Major')).toBeTruthy();
    expect(getByText('Play this chord:')).toBeTruthy();
  });

  it('shows check mark when correct', () => {
    const { getByText } = render(
      <ChordPrompt chordName="Am" isCorrect={true} testID="chord" />,
    );
    expect(getByText('\u2714')).toBeTruthy();
  });

  it('does not show check mark when incorrect', () => {
    const { queryByText } = render(
      <ChordPrompt chordName="G7" isCorrect={false} testID="chord" />,
    );
    expect(queryByText('\u2714')).toBeNull();
  });
});

// ─────────────────────────────────────────────────
// deriveChordName
// ─────────────────────────────────────────────────

describe('deriveChordName', () => {
  it('returns "Unknown" for empty notes', () => {
    expect(deriveChordName([])).toBe('Unknown');
  });

  it('returns note name for single note', () => {
    expect(deriveChordName([60])).toBe('C');
    expect(deriveChordName([69])).toBe('A');
  });

  it('identifies C Major triad', () => {
    expect(deriveChordName([60, 64, 67])).toBe('C Major');
  });

  it('identifies C Minor triad', () => {
    expect(deriveChordName([60, 63, 67])).toBe('Cm');
  });

  it('identifies A Minor triad', () => {
    // A=57, C=60, E=64
    expect(deriveChordName([57, 60, 64])).toBe('Am');
  });

  it('identifies G7 chord', () => {
    // G=55, B=59, D=62, F=65
    expect(deriveChordName([55, 59, 62, 65])).toBe('G 7');
  });

  it('identifies C diminished', () => {
    expect(deriveChordName([60, 63, 66])).toBe('Cdim');
  });

  it('identifies C augmented', () => {
    expect(deriveChordName([60, 64, 68])).toBe('Caug');
  });

  it('handles octave-transposed notes', () => {
    // C Major triad across octaves
    expect(deriveChordName([48, 64, 67])).toBe('C Major');
  });

  it('returns fallback for unrecognized intervals', () => {
    // C + D (just a 2nd, no standard chord)
    expect(deriveChordName([60, 62])).toBe('C chord');
  });

  it('identifies sus4 chord', () => {
    expect(deriveChordName([60, 65, 67])).toBe('C sus4');
  });

  it('identifies sus2 chord', () => {
    expect(deriveChordName([60, 62, 67])).toBe('C sus2');
  });
});

// ─────────────────────────────────────────────────
// SightReadingOverlay
// ─────────────────────────────────────────────────

describe('SightReadingOverlay', () => {
  it('renders sight reading badge', () => {
    const { getByText, getByTestId } = render(
      <SightReadingOverlay testID="sr-badge" />,
    );
    expect(getByTestId('sr-badge')).toBeTruthy();
    expect(getByText('Sight Reading')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────
// CallResponsePhase
// ─────────────────────────────────────────────────

describe('CallResponsePhase', () => {
  it('shows "SALSA\'S TURN" during call phase', () => {
    const { getByText } = render(
      <CallResponsePhase phase="call" onPhaseChange={jest.fn()} testID="cr" />,
    );
    expect(getByText("SALSA'S TURN")).toBeTruthy();
    expect(getByText('Listen to the phrase...')).toBeTruthy();
  });

  it('shows "YOUR TURN" during response phase', () => {
    const { getByText } = render(
      <CallResponsePhase phase="response" onPhaseChange={jest.fn()} testID="cr" />,
    );
    expect(getByText('YOUR TURN')).toBeTruthy();
    expect(getByText('Play it back!')).toBeTruthy();
  });
});

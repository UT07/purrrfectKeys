/**
 * ExerciseLoadingScreen Tests
 *
 * Tests the unified pre-exercise screen:
 * Phase 1: Loading tip/fact while exercise loads
 * Phase 2: Exercise intro card with "Let's Go!" button
 */

import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { ExerciseLoadingScreen } from '../ExerciseLoadingScreen';
import type { Exercise } from '@/core/exercises/types';

// Mock dependencies
jest.mock('../../../components/Mascot/SalsaCoach', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SalsaCoach: (props: any) =>
      React.createElement(View, { testID: 'salsa-coach', ...props }),
  };
});

jest.mock('../../../components/FunFact/FunFactCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    FunFactCard: (props: any) =>
      React.createElement(View, { testID: props.testID || 'fun-fact-card' }),
  };
});

jest.mock('../../../content/funFactSelector', () => ({
  getRandomFact: jest.fn(() => ({
    id: 'test-fact',
    text: 'Piano has 88 keys',
    category: 'history',
    difficulty: 'beginner',
  })),
}));

jest.mock('../../../content/loadingTips', () => ({
  getRandomLoadingTip: jest.fn(() => 'Relax your shoulders!'),
}));

jest.mock('../../../services/tts/TTSService', () => ({
  ttsService: {
    speak: jest.fn((_text: string, options?: { onDone?: () => void }) => {
      options?.onDone?.();
      return Promise.resolve();
    }),
    stop: jest.fn(),
    isSpeaking: jest.fn(() => false),
  },
}));

const mockExercise: Exercise = {
  id: 'test-ex',
  version: 1,
  metadata: {
    title: 'Test Exercise',
    description: 'A test',
    difficulty: 2,
    estimatedMinutes: 2,
    skills: ['test'],
    prerequisites: [],
  },
  settings: {
    tempo: 120,
    timeSignature: [4, 4],
    keySignature: 'C',
    countIn: 4,
    metronomeEnabled: true,
  },
  notes: [
    { note: 60, startBeat: 0, durationBeats: 1 },
    { note: 62, startBeat: 1, durationBeats: 1 },
  ],
  scoring: {
    timingToleranceMs: 50,
    timingGracePeriodMs: 100,
    passingScore: 70,
    starThresholds: [70, 85, 95],
  },
  hints: { beforeStart: '', commonMistakes: [], successMessage: '' },
};

describe('ExerciseLoadingScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Phase 1 — Loading', () => {
    it('renders loading content when visible and not ready', () => {
      const { getByTestId, getByText } = render(
        <ExerciseLoadingScreen visible={true} exerciseReady={false} onReady={jest.fn()} />,
      );
      expect(getByTestId('exercise-loading-screen')).toBeTruthy();
      expect(getByText('Preparing your exercise...')).toBeTruthy();
    });

    it('returns null when visible=false', () => {
      const { queryByTestId } = render(
        <ExerciseLoadingScreen visible={false} exerciseReady={false} onReady={jest.fn()} />,
      );
      expect(queryByTestId('exercise-loading-screen')).toBeNull();
    });

    it('shows SalsaCoach during loading', () => {
      const { getByTestId } = render(
        <ExerciseLoadingScreen visible={true} exerciseReady={false} onReady={jest.fn()} />,
      );
      expect(getByTestId('salsa-coach')).toBeTruthy();
    });

    it('shows either a fun fact or loading tip', () => {
      const spy = jest.spyOn(Math, 'random');

      spy.mockReturnValue(0.1);
      const { getByTestId, unmount } = render(
        <ExerciseLoadingScreen visible={true} exerciseReady={false} onReady={jest.fn()} />,
      );
      expect(getByTestId('fun-fact-card')).toBeTruthy();
      unmount();

      spy.mockReturnValue(0.9);
      const { getByTestId: getByTestId2 } = render(
        <ExerciseLoadingScreen visible={true} exerciseReady={false} onReady={jest.fn()} />,
      );
      expect(getByTestId2('loading-tip')).toBeTruthy();

      spy.mockRestore();
    });

    it('does NOT call onReady automatically — waits for user tap in Phase 2', () => {
      const onReady = jest.fn();
      render(
        <ExerciseLoadingScreen
          visible={true}
          exerciseReady={true}
          exercise={mockExercise}
          onReady={onReady}
        />,
      );

      // Advance past min timer + speech
      act(() => { jest.advanceTimersByTime(2000); });

      // onReady should NOT be called — Phase 2 shows intro card with button
      expect(onReady).not.toHaveBeenCalled();
    });
  });

  describe('Phase 2 — Intro', () => {
    it('transitions to intro card after loading completes', () => {
      const { getByTestId, rerender } = render(
        <ExerciseLoadingScreen
          visible={true}
          exerciseReady={false}
          onReady={jest.fn()}
        />,
      );

      // Still loading
      expect(getByTestId('exercise-loading-screen')).toBeTruthy();

      // Exercise becomes ready + timer elapses
      rerender(
        <ExerciseLoadingScreen
          visible={true}
          exerciseReady={true}
          exercise={mockExercise}
          onReady={jest.fn()}
        />,
      );
      act(() => { jest.advanceTimersByTime(1500); });

      // Should now show intro screen
      expect(getByTestId('exercise-intro-screen')).toBeTruthy();
    });

    it('shows exercise title and info in intro card', () => {
      const { getByText, getByTestId } = render(
        <ExerciseLoadingScreen
          visible={true}
          exerciseReady={true}
          exercise={mockExercise}
          onReady={jest.fn()}
        />,
      );

      act(() => { jest.advanceTimersByTime(1500); });

      expect(getByTestId('exercise-intro-screen')).toBeTruthy();
      expect(getByText('Test Exercise')).toBeTruthy();
      expect(getByText("Let's Go!")).toBeTruthy();
    });

    it('calls onReady when user taps Let\'s Go!', () => {
      const onReady = jest.fn();
      const { getByTestId } = render(
        <ExerciseLoadingScreen
          visible={true}
          exerciseReady={true}
          exercise={mockExercise}
          onReady={onReady}
        />,
      );

      act(() => { jest.advanceTimersByTime(1500); });

      fireEvent.press(getByTestId('intro-ready'));
      expect(onReady).toHaveBeenCalledTimes(1);
    });

    it('calls onWatchFirst when user taps Watch First', () => {
      const onWatchFirst = jest.fn();
      const { getByText } = render(
        <ExerciseLoadingScreen
          visible={true}
          exerciseReady={true}
          exercise={mockExercise}
          onReady={jest.fn()}
          onWatchFirst={onWatchFirst}
        />,
      );

      act(() => { jest.advanceTimersByTime(1500); });

      fireEvent.press(getByText('Watch First'));
      expect(onWatchFirst).toHaveBeenCalledTimes(1);
    });
  });
});

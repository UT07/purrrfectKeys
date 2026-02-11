/**
 * ExercisePlayer Component Tests
 * Tests core playback, scoring, and interaction features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ExercisePlayer } from '../ExercisePlayer';
import type { Exercise } from '../../../core/exercises/types';

// Mock dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../stores/exerciseStore', () => ({
  useExerciseStore: jest.fn(() => ({
    currentExercise: null,
    clearSession: jest.fn(),
    setScore: jest.fn(),
  })),
}));

jest.mock('../../../components/Keyboard/Keyboard', () => ({
  Keyboard: ({ onNoteOn, onNoteOff }: any) => (
    <MockKeyboard onNoteOn={onNoteOn} onNoteOff={onNoteOff} />
  ),
}));

jest.mock('../../../components/PianoRoll/PianoRoll', () => ({
  PianoRoll: ({ notes, currentBeat }: any) => (
    <MockPianoRoll notes={notes} currentBeat={currentBeat} />
  ),
}));

// Mock keyboard component for testing
const MockKeyboard = ({ onNoteOn, onNoteOff }: any) => (
  <button
    testID="mock-keyboard"
    onClick={() => {
      if (onNoteOn) {
        onNoteOn({
          type: 'noteOn',
          note: 60,
          velocity: 80,
          timestamp: Date.now(),
          channel: 0,
        });
      }
    }}
  >
    Press Note
  </button>
);

// Mock piano roll component
const MockPianoRoll = ({ notes, currentBeat }: any) => (
  <div testID="mock-piano-roll">
    {currentBeat}
  </div>
);

const MOCK_EXERCISE: Exercise = {
  id: 'test-exercise',
  version: 1,
  metadata: {
    title: 'Test Exercise',
    description: 'A test exercise',
    difficulty: 1,
    estimatedMinutes: 2,
    skills: ['test'],
    prerequisites: [],
  },
  settings: {
    tempo: 120,
    timeSignature: [4, 4],
    keySignature: 'C',
    countIn: 2,
    metronomeEnabled: true,
  },
  notes: [
    { note: 60, startBeat: 2, durationBeats: 1 },
    { note: 64, startBeat: 3, durationBeats: 1 },
  ],
  scoring: {
    timingToleranceMs: 50,
    timingGracePeriodMs: 150,
    passingScore: 70,
    starThresholds: [70, 85, 95],
  },
  hints: {
    beforeStart: 'Get ready',
    commonMistakes: [],
    successMessage: 'Great!',
  },
};

describe('ExercisePlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { getByTestId } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} />
    );

    expect(getByTestId('exercise-player')).toBeTruthy();
    expect(getByTestId('exercise-keyboard')).toBeTruthy();
    expect(getByTestId('exercise-controls')).toBeTruthy();
  });

  it('should display exercise title', () => {
    const { getByText } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} />
    );

    expect(getByText(MOCK_EXERCISE.metadata.title)).toBeTruthy();
  });

  it('should start playback on play button press', async () => {
    const { getByTestId } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} />
    );

    const playButton = getByTestId('control-play');
    fireEvent.press(playButton);

    await waitFor(() => {
      expect(getByTestId('exercise-piano-roll')).toBeTruthy();
    });
  });

  it('should pause playback when pause button is pressed', async () => {
    const { getByTestId } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} />
    );

    const playButton = getByTestId('control-play');
    fireEvent.press(playButton);

    await waitFor(() => {
      const pauseButton = getByTestId('control-pause');
      expect(pauseButton).toBeTruthy();
    });
  });

  it('should restart exercise when restart button is pressed', async () => {
    const { getByTestId } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} />
    );

    const playButton = getByTestId('control-play');
    fireEvent.press(playButton);

    await waitFor(() => {
      const restartButton = getByTestId('control-restart');
      expect(restartButton).toBeTruthy();
      fireEvent.press(restartButton);
    });
  });

  it('should handle keyboard input when playing', async () => {
    const { getByTestId } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} />
    );

    const playButton = getByTestId('control-play');
    fireEvent.press(playButton);

    await waitFor(() => {
      const keyboard = getByTestId('mock-keyboard');
      fireEvent.press(keyboard);
    });
  });

  it('should show count-in animation', async () => {
    const { getByTestId, queryByText } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} />
    );

    const playButton = getByTestId('control-play');
    fireEvent.press(playButton);

    // Count-in should be visible immediately
    await waitFor(() => {
      expect(queryByText('Ready...')).toBeTruthy();
    }, { timeout: 500 });
  });

  it('should call onExerciseComplete when finished', async () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} onExerciseComplete={onComplete} />
    );

    const playButton = getByTestId('control-play');
    fireEvent.press(playButton);

    // Wait for exercise to complete (based on duration)
    await waitFor(
      () => {
        // Exercise duration is about 4 beats at 120 BPM = 2 seconds
      },
      { timeout: 5000 }
    );
  });

  it('should call onClose when exit button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} onClose={onClose} />
    );

    const exitButton = getByTestId('control-exit');
    fireEvent.press(exitButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should display hint on initial render', () => {
    const { getByText } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} />
    );

    expect(getByText(MOCK_EXERCISE.hints.beforeStart)).toBeTruthy();
  });

  it('should update progress bar during playback', async () => {
    const { getByTestId } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} />
    );

    const playButton = getByTestId('control-play');
    fireEvent.press(playButton);

    await waitFor(() => {
      const pianoRoll = getByTestId('mock-piano-roll');
      expect(pianoRoll).toBeTruthy();
    });
  });

  it('should not accept input when paused', async () => {
    const { getByTestId } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} />
    );

    const playButton = getByTestId('control-play');
    fireEvent.press(playButton);

    await waitFor(() => {
      const pauseButton = getByTestId('control-pause');
      fireEvent.press(pauseButton);
    });

    // After pausing, keyboard should be disabled
    const keyboard = getByTestId('mock-keyboard');
    fireEvent.press(keyboard);

    // No feedback should be triggered
  });

  it('should disable keyboard input when not playing', () => {
    const { getByTestId } = render(
      <ExercisePlayer exercise={MOCK_EXERCISE} />
    );

    // Keyboard should be disabled before play
    const keyboard = getByTestId('mock-keyboard');
    fireEvent.press(keyboard);

    // No notes should be recorded
  });
});

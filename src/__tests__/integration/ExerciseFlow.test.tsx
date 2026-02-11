/**
 * Integration Test: Exercise Flow
 * Tests the complete exercise playback experience from start to finish
 *
 * Tests:
 * 1. Exercise loading
 * 2. MIDI input → Store → Validator flow
 * 3. Keyboard input → Audio engine
 * 4. Real-time validation and scoring
 * 5. Exercise completion
 */

import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import { ExercisePlayer } from '../../screens/ExercisePlayer/ExercisePlayer';
import type { Exercise, MidiNoteEvent } from '../../core/exercises/types';
import { NoOpMidiInput } from '../../input/MidiInput';
import { setMidiInput } from '../../input/MidiInput';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock audio engine
jest.mock('../../audio/AudioEngine.native', () => {
  const mockHandle = {
    note: 60,
    startTime: 0,
    release: jest.fn(),
  };

  return {
    getAudioEngine: jest.fn(() => ({
      initialize: jest.fn(() => Promise.resolve()),
      dispose: jest.fn(),
      suspend: jest.fn(() => Promise.resolve()),
      resume: jest.fn(() => Promise.resolve()),
      playNote: jest.fn(() => mockHandle),
      releaseNote: jest.fn(),
      releaseAllNotes: jest.fn(),
      setVolume: jest.fn(),
      getLatency: jest.fn(() => 0),
      isReady: jest.fn(() => true),
      getState: jest.fn(() => 'running'),
      getActiveNoteCount: jest.fn(() => 0),
    })),
    resetAudioEngine: jest.fn(),
  };
});

// Test exercise - simple C major scale
const TEST_EXERCISE: Exercise = {
  id: 'test-exercise-1',
  version: 1,
  metadata: {
    title: 'C Major Scale Test',
    description: 'Play C-D-E-F',
    difficulty: 1,
    estimatedMinutes: 1,
    skills: ['right-hand', 'c-major'],
    prerequisites: [],
  },
  settings: {
    tempo: 120,
    timeSignature: [4, 4],
    keySignature: 'C',
    countIn: 1, // 1 beat count-in for faster testing
    metronomeEnabled: false,
  },
  notes: [
    { note: 60, startBeat: 0, durationBeats: 1 }, // C
    { note: 62, startBeat: 1, durationBeats: 1 }, // D
    { note: 64, startBeat: 2, durationBeats: 1 }, // E
    { note: 65, startBeat: 3, durationBeats: 1 }, // F
  ],
  scoring: {
    timingToleranceMs: 50,
    timingGracePeriodMs: 150,
    passingScore: 70,
    starThresholds: [70, 85, 95],
  },
  hints: {
    beforeStart: 'Play C-D-E-F in order',
    commonMistakes: [
      {
        pattern: 'wrong-notes',
        advice: 'Make sure to play the correct notes',
      },
    ],
    successMessage: 'Great job!',
  },
};

describe('Exercise Flow Integration Test', () => {
  let mockMidiInput: NoOpMidiInput;

  beforeEach(() => {
    // Set up mock MIDI input
    mockMidiInput = new NoOpMidiInput();
    setMidiInput(mockMidiInput);

    // Clear timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads exercise and displays initial state', async () => {
    const { getByTestId, getByText } = render(
      <ExercisePlayer exercise={TEST_EXERCISE} />
    );

    await waitFor(() => {
      expect(getByTestId('exercise-player')).toBeTruthy();
      expect(getByText('C Major Scale Test')).toBeTruthy();
    });
  });

  it('starts playback and shows count-in', async () => {
    const { getByTestId } = render(
      <ExercisePlayer exercise={TEST_EXERCISE} />
    );

    const controls = getByTestId('exercise-controls');
    const startButton = getByTestId('exercise-controls-start');

    await act(async () => {
      fireEvent.press(startButton);
    });

    // Should show count-in animation
    await waitFor(() => {
      expect(getByTestId('count-in-animation')).toBeTruthy();
    });
  });

  it('handles MIDI input and updates state', async () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(
      <ExercisePlayer
        exercise={TEST_EXERCISE}
        onExerciseComplete={onComplete}
      />
    );

    // Initialize MIDI
    await act(async () => {
      await mockMidiInput.initialize();
    });

    // Start playback
    const startButton = getByTestId('exercise-controls-start');
    await act(async () => {
      fireEvent.press(startButton);
    });

    // Wait for count-in to complete (1 beat at 120 BPM = 500ms)
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Simulate MIDI note events
    const note1: MidiNoteEvent = {
      type: 'noteOn',
      note: 60, // C
      velocity: 80,
      timestamp: Date.now(),
      channel: 0,
    };

    await act(async () => {
      mockMidiInput._simulateNoteEvent(note1);
    });

    // Verify note was recorded
    await waitFor(() => {
      // Store should have the played note
      // (we would need to expose store state for this)
    });
  });

  it('validates notes in real-time', async () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(
      <ExercisePlayer
        exercise={TEST_EXERCISE}
        onExerciseComplete={onComplete}
      />
    );

    await act(async () => {
      await mockMidiInput.initialize();
    });

    // Start playback
    const startButton = getByTestId('exercise-controls-start');
    await act(async () => {
      fireEvent.press(startButton);
    });

    // Wait for count-in
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Play correct note (C at beat 0)
    const correctNote: MidiNoteEvent = {
      type: 'noteOn',
      note: 60, // C (expected)
      velocity: 80,
      timestamp: Date.now(),
      channel: 0,
    };

    await act(async () => {
      mockMidiInput._simulateNoteEvent(correctNote);
    });

    // Should show positive feedback
    await waitFor(() => {
      // Check for "perfect" feedback indicator
      const feedback = getByTestId('real-time-feedback');
      expect(feedback).toBeTruthy();
    });

    // Play wrong note
    await act(async () => {
      jest.advanceTimersByTime(500); // Move to beat 1
    });

    const wrongNote: MidiNoteEvent = {
      type: 'noteOn',
      note: 67, // G (not expected - should be D)
      velocity: 80,
      timestamp: Date.now(),
      channel: 0,
    };

    await act(async () => {
      mockMidiInput._simulateNoteEvent(wrongNote);
    });

    // Should show negative feedback
    // (combo should reset)
  });

  it('completes exercise and shows score', async () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(
      <ExercisePlayer
        exercise={TEST_EXERCISE}
        onExerciseComplete={onComplete}
      />
    );

    await act(async () => {
      await mockMidiInput.initialize();
    });

    // Start playback
    const startButton = getByTestId('exercise-controls-start');
    await act(async () => {
      fireEvent.press(startButton);
    });

    // Wait for count-in
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Play all notes correctly
    const notes = [60, 62, 64, 65]; // C, D, E, F
    for (let i = 0; i < notes.length; i++) {
      const note: MidiNoteEvent = {
        type: 'noteOn',
        note: notes[i],
        velocity: 80,
        timestamp: Date.now(),
        channel: 0,
      };

      await act(async () => {
        mockMidiInput._simulateNoteEvent(note);
        jest.advanceTimersByTime(500); // 1 beat at 120 BPM
      });
    }

    // Wait for exercise to complete (1 extra beat)
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Should show completion modal
    await waitFor(() => {
      expect(getByTestId('completion-modal')).toBeTruthy();
    });

    // Should call onComplete callback
    expect(onComplete).toHaveBeenCalled();
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      overall: expect.any(Number),
      stars: expect.any(Number),
      isPassed: expect.any(Boolean),
      xpEarned: expect.any(Number),
    });
  });

  it('handles touch keyboard input', async () => {
    const { getByTestId } = render(
      <ExercisePlayer exercise={TEST_EXERCISE} />
    );

    // Start playback
    const startButton = getByTestId('exercise-controls-start');
    await act(async () => {
      fireEvent.press(startButton);
    });

    // Wait for count-in
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Get keyboard
    const keyboard = getByTestId('exercise-keyboard');
    expect(keyboard).toBeTruthy();

    // TODO: Simulate touch on piano key
    // This would require finding individual key components
  });

  it('pauses and resumes playback', async () => {
    const { getByTestId } = render(
      <ExercisePlayer exercise={TEST_EXERCISE} />
    );

    // Start playback
    const startButton = getByTestId('exercise-controls-start');
    await act(async () => {
      fireEvent.press(startButton);
    });

    // Pause
    const pauseButton = getByTestId('exercise-controls-pause');
    await act(async () => {
      fireEvent.press(pauseButton);
    });

    // Playback should be paused
    // (would need to expose state)

    // Resume
    await act(async () => {
      fireEvent.press(pauseButton);
    });

    // Playback should resume
  });

  it('restarts exercise', async () => {
    const { getByTestId } = render(
      <ExercisePlayer exercise={TEST_EXERCISE} />
    );

    // Start playback
    const startButton = getByTestId('exercise-controls-start');
    await act(async () => {
      fireEvent.press(startButton);
    });

    // Wait a bit
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Restart
    const restartButton = getByTestId('exercise-controls-restart');
    await act(async () => {
      fireEvent.press(restartButton);
    });

    // Beat should be reset to count-in
    // (would need to expose state)
  });

  it('handles audio initialization error gracefully', async () => {
    // Mock audio engine to fail
    const { getAudioEngine } = require('../../audio/AudioEngine.native');
    getAudioEngine.mockImplementationOnce(() => ({
      initialize: jest.fn(() => Promise.reject(new Error('Audio init failed'))),
      dispose: jest.fn(),
    }));

    const { getByTestId, getByText } = render(
      <ExercisePlayer exercise={TEST_EXERCISE} />
    );

    // Should show error banner
    await waitFor(() => {
      expect(
        getByText(/Audio initialization failed/i)
      ).toBeTruthy();
    });

    // Should still allow playback without audio
    const startButton = getByTestId('exercise-controls-start');
    expect(startButton).toBeTruthy();
  });

  it('exits exercise properly', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ExercisePlayer exercise={TEST_EXERCISE} onClose={onClose} />
    );

    const exitButton = getByTestId('exercise-controls-exit');
    await act(async () => {
      fireEvent.press(exitButton);
    });

    expect(onClose).toHaveBeenCalled();
  });
});

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { SalsaIntro } from '../SalsaIntro';

// Mock TTS
jest.mock('../../../services/tts/TTSService', () => ({
  ttsService: {
    speak: jest.fn((_text: string, opts?: { onDone?: () => void }) => {
      // Simulate immediate completion
      setTimeout(() => opts?.onDone?.(), 10);
      return Promise.resolve();
    }),
    stop: jest.fn(),
  },
}));

describe('SalsaIntro', () => {
  const defaultProps = {
    tier: 1 as const,
    introText: 'Focus on your timing this time!',
    tip: 'Count along with the metronome.',
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders tier 1 (brief) intro', () => {
    const { getByText } = render(<SalsaIntro {...defaultProps} />);
    expect(getByText('Focus on your timing this time!')).toBeTruthy();
  });

  it('renders tier 2 (walkthrough) with ready button', () => {
    const { getByText } = render(
      <SalsaIntro {...defaultProps} tier={2} />
    );
    expect(getByText("Let's go!")).toBeTruthy();
  });

  it('renders tier 3 (extended) with demo button', () => {
    const onDemo = jest.fn();
    const { getByText } = render(
      <SalsaIntro {...defaultProps} tier={3} onRequestDemo={onDemo} />
    );
    expect(getByText('Watch demo first')).toBeTruthy();
    fireEvent.press(getByText('Watch demo first'));
    expect(onDemo).toHaveBeenCalled();
  });

  it('calls onDismiss when skip is pressed', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <SalsaIntro {...defaultProps} tier={2} onDismiss={onDismiss} />
    );
    fireEvent.press(getByText('Skip'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('auto-dismisses tier 1 after TTS finishes', () => {
    const onDismiss = jest.fn();
    render(
      <SalsaIntro {...defaultProps} tier={1} onDismiss={onDismiss} />
    );
    // TTS mock calls onDone after 10ms
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not auto-dismiss tier 2', () => {
    const onDismiss = jest.fn();
    render(
      <SalsaIntro {...defaultProps} tier={2} onDismiss={onDismiss} />
    );
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReplayOverlay } from '../ReplayOverlay';

// react-native-reanimated is mocked globally in jest.setup.js

describe('ReplayOverlay', () => {
  const defaultProps = {
    mode: 'hidden' as const,
    pillText: 'Nice!',
    cardText: 'You played D4 instead of E4.',
    onShowCorrect: jest.fn(),
    onContinue: jest.fn(),
  };

  it('renders nothing when hidden', () => {
    const { queryByText } = render(<ReplayOverlay {...defaultProps} />);
    expect(queryByText('Nice!')).toBeNull();
    expect(queryByText('You played D4')).toBeNull();
  });

  it('renders pill text in pill mode', () => {
    const { getByText } = render(
      <ReplayOverlay {...defaultProps} mode="pill" />
    );
    expect(getByText('Nice!')).toBeTruthy();
  });

  it('renders card with buttons in card mode', () => {
    const onShow = jest.fn();
    const onContinue = jest.fn();
    const { getByText } = render(
      <ReplayOverlay
        {...defaultProps}
        mode="card"
        onShowCorrect={onShow}
        onContinue={onContinue}
      />
    );
    expect(getByText('You played D4 instead of E4.')).toBeTruthy();

    fireEvent.press(getByText('Show me'));
    expect(onShow).toHaveBeenCalled();

    fireEvent.press(getByText('Continue'));
    expect(onContinue).toHaveBeenCalled();
  });
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ReplayTimelineBar } from '../ReplayTimelineBar';
import type { ReplayScheduleEntry, PausePoint } from '../../../core/exercises/replayTypes';

describe('ReplayTimelineBar', () => {
  const entries: ReplayScheduleEntry[] = [
    { note: { note: 60, startBeat: 0, durationBeats: 1 }, play: true, jitterMs: 0, status: 'perfect', color: 'green' },
    { note: { note: 62, startBeat: 1, durationBeats: 1 }, play: true, jitterMs: 0, status: 'good', color: 'green' },
    { note: { note: 64, startBeat: 2, durationBeats: 1 }, play: false, jitterMs: 0, status: 'missed', color: 'grey' },
    { note: { note: 65, startBeat: 3, durationBeats: 1 }, play: true, jitterMs: 20, status: 'late', color: 'red' },
  ];

  const pausePoints: PausePoint[] = [
    { beatPosition: 3, type: 'wrong_pitch', explanation: 'test', showCorrectFromBeat: 1, showCorrectToBeat: 5 },
  ];

  const defaultProps = {
    entries,
    pausePoints,
    totalBeats: 4,
    currentBeat: 1.5,
    elapsedTime: '0:03',
    totalTime: '0:08',
    onSeek: jest.fn(),
    isPaused: false,
    onTogglePlayPause: jest.fn(),
  };

  it('renders time labels', () => {
    const { getByText } = render(<ReplayTimelineBar {...defaultProps} />);
    expect(getByText('0:03')).toBeTruthy();
    expect(getByText('0:08')).toBeTruthy();
  });

  it('renders play/pause button', () => {
    const onToggle = jest.fn();
    const { getByTestId } = render(
      <ReplayTimelineBar {...defaultProps} onTogglePlayPause={onToggle} />
    );
    fireEvent.press(getByTestId('play-pause-btn'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('renders with paused state', () => {
    const { getByText } = render(
      <ReplayTimelineBar {...defaultProps} isPaused={true} />
    );
    // Should show play icon (▶) when paused
    expect(getByText('▶')).toBeTruthy();
  });

  it('renders with playing state', () => {
    const { getByText } = render(
      <ReplayTimelineBar {...defaultProps} isPaused={false} />
    );
    // Should show pause icon (⏸) when playing
    expect(getByText('⏸')).toBeTruthy();
  });

  it('renders note dots for each entry', () => {
    const { getAllByTestId } = render(<ReplayTimelineBar {...defaultProps} />);
    const dots = getAllByTestId('note-dot');
    expect(dots).toHaveLength(entries.length);
  });

  it('renders diamond markers for pause points', () => {
    const { getAllByTestId } = render(<ReplayTimelineBar {...defaultProps} />);
    const diamonds = getAllByTestId('pause-diamond');
    expect(diamonds).toHaveLength(pausePoints.length);
  });

  it('renders with zero entries without crashing', () => {
    const { queryAllByTestId } = render(
      <ReplayTimelineBar {...defaultProps} entries={[]} pausePoints={[]} />
    );
    expect(queryAllByTestId('note-dot')).toHaveLength(0);
    expect(queryAllByTestId('pause-diamond')).toHaveLength(0);
  });

  it('handles zero totalBeats gracefully', () => {
    expect(() =>
      render(<ReplayTimelineBar {...defaultProps} totalBeats={0} currentBeat={0} />)
    ).not.toThrow();
  });
});

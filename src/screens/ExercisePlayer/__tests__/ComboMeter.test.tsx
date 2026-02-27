import React from 'react';
import { render } from '@testing-library/react-native';
import { ComboMeter } from '../ComboMeter';

jest.mock('../../../audio/SoundManager', () => ({
  soundManager: { play: jest.fn() },
}));

import { soundManager } from '../../../audio/SoundManager';

describe('ComboMeter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when combo is 0', () => {
    const { queryByTestId } = render(<ComboMeter combo={0} />);
    expect(queryByTestId('combo-meter')).toBeNull();
  });

  it('renders nothing when combo is 2', () => {
    const { queryByTestId } = render(<ComboMeter combo={2} />);
    expect(queryByTestId('combo-meter')).toBeNull();
  });

  it('shows combo count when >= 3', () => {
    const { getByText } = render(<ComboMeter combo={5} />);
    expect(getByText('5x')).toBeTruthy();
  });

  it('shows GOOD label at combo 5', () => {
    const { getByText } = render(<ComboMeter combo={5} />);
    expect(getByText('GOOD!')).toBeTruthy();
  });

  it('shows FIRE label at combo 10', () => {
    const { getByText } = render(<ComboMeter combo={10} />);
    expect(getByText('FIRE!')).toBeTruthy();
  });

  it('shows SUPER label at combo 15', () => {
    const { getByText } = render(<ComboMeter combo={15} />);
    expect(getByText('SUPER!')).toBeTruthy();
  });

  it('shows LEGENDARY label at combo 20+', () => {
    const { getByText } = render(<ComboMeter combo={22} />);
    expect(getByText('LEGENDARY!')).toBeTruthy();
  });

  it('shows combo count at combo 3 without tier label', () => {
    const { getByText, queryByText } = render(<ComboMeter combo={3} />);
    expect(getByText('3x')).toBeTruthy();
    // NORMAL tier has empty label, GOOD starts at 5
    expect(queryByText('GOOD!')).toBeNull();
  });

  it('has testID combo-meter when visible', () => {
    const { getByTestId } = render(<ComboMeter combo={5} />);
    expect(getByTestId('combo-meter')).toBeTruthy();
  });

  it('plays combo_5 sound when reaching GOOD tier', () => {
    const { rerender } = render(<ComboMeter combo={4} />);
    rerender(<ComboMeter combo={5} />);
    expect(soundManager.play).toHaveBeenCalledWith('combo_5');
  });

  it('plays combo_10 sound when reaching FIRE tier', () => {
    const { rerender } = render(<ComboMeter combo={9} />);
    rerender(<ComboMeter combo={10} />);
    expect(soundManager.play).toHaveBeenCalledWith('combo_10');
  });

  it('plays combo_20 sound when reaching LEGENDARY tier', () => {
    const { rerender } = render(<ComboMeter combo={19} />);
    rerender(<ComboMeter combo={20} />);
    expect(soundManager.play).toHaveBeenCalledWith('combo_20');
  });

  it('does not play sound when staying in the same tier', () => {
    const { rerender } = render(<ComboMeter combo={5} />);
    jest.clearAllMocks();
    rerender(<ComboMeter combo={6} />);
    expect(soundManager.play).not.toHaveBeenCalled();
  });

  it('does not play sound for NORMAL tier', () => {
    render(<ComboMeter combo={3} />);
    expect(soundManager.play).not.toHaveBeenCalled();
  });
});

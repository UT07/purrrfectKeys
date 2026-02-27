import React from 'react';
import { render } from '@testing-library/react-native';
import { ComboGlow } from '../ComboGlow';

describe('ComboGlow', () => {
  it('renders nothing for combo 0', () => {
    const { queryByTestId } = render(<ComboGlow combo={0} />);
    expect(queryByTestId('combo-glow')).toBeNull();
  });

  it('renders nothing for NORMAL tier (combo 3)', () => {
    const { queryByTestId } = render(<ComboGlow combo={3} />);
    expect(queryByTestId('combo-glow')).toBeNull();
  });

  it('renders glow border for GOOD tier (combo 5)', () => {
    const { getByTestId } = render(<ComboGlow combo={5} />);
    expect(getByTestId('combo-glow')).toBeTruthy();
  });

  it('renders glow border for FIRE tier (combo 12)', () => {
    const { getByTestId } = render(<ComboGlow combo={12} />);
    expect(getByTestId('combo-glow')).toBeTruthy();
  });

  it('renders glow border for LEGENDARY tier (combo 25)', () => {
    const { getByTestId } = render(<ComboGlow combo={25} />);
    expect(getByTestId('combo-glow')).toBeTruthy();
  });

  it('uses pointerEvents none so it does not block touches', () => {
    const { getByTestId } = render(<ComboGlow combo={10} />);
    const glow = getByTestId('combo-glow');
    expect(glow.props.pointerEvents).toBe('none');
  });
});

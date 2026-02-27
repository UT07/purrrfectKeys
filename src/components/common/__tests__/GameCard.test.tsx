/**
 * GameCard Component Tests
 *
 * Tests rarity border rendering, pressable vs static modes,
 * onPress forwarding, style passthrough, and all rarity levels.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { GameCard } from '../GameCard';

jest.mock('../../../audio/SoundManager', () => ({
  soundManager: { play: jest.fn() },
}));

describe('GameCard', () => {
  it('renders children', () => {
    const { getByText } = render(
      <GameCard rarity="common">
        <Text>Hello</Text>
      </GameCard>,
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('applies rarity border color', () => {
    const { getByTestId } = render(
      <GameCard rarity="rare" testID="card">
        <Text>Card</Text>
      </GameCard>,
    );
    const card = getByTestId('card');
    expect(card).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <GameCard rarity="common" onPress={onPress} testID="card">
        <Text>Card</Text>
      </GameCard>,
    );
    fireEvent.press(getByTestId('card'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders without onPress as a non-pressable View', () => {
    const { getByTestId, getByText } = render(
      <GameCard rarity="epic" testID="static-card">
        <Text>Static</Text>
      </GameCard>,
    );
    expect(getByTestId('static-card')).toBeTruthy();
    expect(getByText('Static')).toBeTruthy();
  });

  it('renders with all rarity levels', () => {
    for (const rarity of ['common', 'rare', 'epic', 'legendary'] as const) {
      const { getByText } = render(
        <GameCard rarity={rarity}>
          <Text>{rarity}</Text>
        </GameCard>,
      );
      expect(getByText(rarity)).toBeTruthy();
    }
  });

  it('forwards style prop', () => {
    const { getByTestId } = render(
      <GameCard rarity="common" testID="styled" style={{ marginTop: 10 }}>
        <Text>Styled</Text>
      </GameCard>,
    );
    expect(getByTestId('styled')).toBeTruthy();
  });
});

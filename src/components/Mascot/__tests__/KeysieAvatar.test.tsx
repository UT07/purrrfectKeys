import React from 'react';
import { render } from '@testing-library/react-native';
import { KeysieAvatar } from '../KeysieAvatar';

jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mockReact = require('react');
  const RN = require('react-native');

  const MockSvgComponent = (name: string) => {
    const component = (props: Record<string, unknown>) =>
      mockReact.createElement(RN.View, { ...props, testID: props.testID ?? name });
    component.displayName = name;
    return component;
  };

  return {
    __esModule: true,
    default: MockSvgComponent('Svg'),
    Svg: MockSvgComponent('Svg'),
    G: MockSvgComponent('G'),
    Circle: MockSvgComponent('Circle'),
    Path: MockSvgComponent('Path'),
    Rect: MockSvgComponent('Rect'),
    Ellipse: MockSvgComponent('Ellipse'),
    Line: MockSvgComponent('Line'),
  };
});

describe('KeysieAvatar', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(<KeysieAvatar mood="happy" />);
    expect(getByTestId('keysie-avatar')).toBeTruthy();
  });

  it('renders at all sizes', () => {
    const sizes = ['tiny', 'small', 'medium', 'large'] as const;
    for (const size of sizes) {
      const { getByTestId } = render(<KeysieAvatar mood="happy" size={size} />);
      expect(getByTestId('keysie-avatar')).toBeTruthy();
    }
  });

  it('shows particles when celebrating with showParticles', () => {
    const { queryByTestId } = render(
      <KeysieAvatar mood="celebrating" showParticles />
    );
    expect(queryByTestId('keysie-particles')).toBeTruthy();
  });

  it('does not show particles when not celebrating', () => {
    const { queryByTestId } = render(
      <KeysieAvatar mood="happy" showParticles />
    );
    expect(queryByTestId('keysie-particles')).toBeNull();
  });
});

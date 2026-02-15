import React from 'react';
import { render } from '@testing-library/react-native';
import { KeysieSvg } from '../KeysieSvg';

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

describe('KeysieSvg', () => {
  it('renders without crashing at each size', () => {
    const sizes = ['tiny', 'small', 'medium', 'large'] as const;
    for (const size of sizes) {
      const { getByTestId } = render(<KeysieSvg size={size} mood="happy" />);
      expect(getByTestId('keysie-svg')).toBeTruthy();
    }
  });

  it('renders all 5 moods', () => {
    const moods = ['happy', 'encouraging', 'excited', 'teaching', 'celebrating'] as const;
    for (const mood of moods) {
      const { getByTestId } = render(<KeysieSvg size="medium" mood={mood} />);
      expect(getByTestId('keysie-svg')).toBeTruthy();
    }
  });
});

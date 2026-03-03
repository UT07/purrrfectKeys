import React from 'react';
import { render } from '@testing-library/react-native';
import { CatGradientDefs } from '../svg/CatGradients';

jest.mock('react-native-svg', () => {
  const mockReact = require('react');
  const RN = require('react-native');
  const MockSvgComponent = (name: string) => {
    const component = (props: Record<string, unknown>) =>
      mockReact.createElement(RN.View, {
        ...props,
        testID: props.testID ?? `svg-${name}`,
        accessibilityLabel: name,
      });
    component.displayName = name;
    return component;
  };
  return {
    __esModule: true,
    default: MockSvgComponent('Svg'),
    Svg: MockSvgComponent('Svg'),
    G: MockSvgComponent('G'),
    Defs: MockSvgComponent('Defs'),
    RadialGradient: MockSvgComponent('RadialGradient'),
    LinearGradient: MockSvgComponent('LinearGradient'),
    Stop: MockSvgComponent('Stop'),
  };
});

describe('CatGradientDefs', () => {
  it('renders Defs with gradient elements', () => {
    const SvgC = require('react-native-svg').default;
    const { UNSAFE_getAllByType } = render(
      <SvgC>
        <CatGradientDefs catId="mini-meowww" bodyColor="#1A1A2E" eyeColor="#3DFF88" />
      </SvgC>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const gradients = allViews.filter(
      (v: any) =>
        v.props.accessibilityLabel === 'RadialGradient' ||
        v.props.accessibilityLabel === 'LinearGradient'
    );
    // Should have head, body, iris gradients at minimum
    expect(gradients.length).toBeGreaterThanOrEqual(3);
  });

  it('prefixes gradient IDs with catId to prevent collisions', () => {
    const SvgC = require('react-native-svg').default;
    const { UNSAFE_getAllByType } = render(
      <SvgC>
        <CatGradientDefs catId="jazzy" bodyColor="#6B7B9E" eyeColor="#B06EFF" />
      </SvgC>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const gradients = allViews.filter(
      (v: any) =>
        v.props.accessibilityLabel === 'RadialGradient' ||
        v.props.accessibilityLabel === 'LinearGradient'
    );
    for (const g of gradients) {
      expect(g.props.id).toMatch(/^jazzy-/);
    }
  });
});

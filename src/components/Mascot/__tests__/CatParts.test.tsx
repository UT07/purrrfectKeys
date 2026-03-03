import React from 'react';
import { render } from '@testing-library/react-native';

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
    Circle: MockSvgComponent('Circle'),
    Path: MockSvgComponent('Path'),
    Rect: MockSvgComponent('Rect'),
    Ellipse: MockSvgComponent('Ellipse'),
    Line: MockSvgComponent('Line'),
    Defs: MockSvgComponent('Defs'),
    ClipPath: MockSvgComponent('ClipPath'),
    LinearGradient: MockSvgComponent('LinearGradient'),
    RadialGradient: MockSvgComponent('RadialGradient'),
    Stop: MockSvgComponent('Stop'),
  };
});

function SvgWrap({ children }: { children: React.ReactNode }) {
  const SvgC = require('react-native-svg').default;
  return <SvgC viewBox="0 0 100 100">{children}</SvgC>;
}

describe('CatBody', () => {
  it('renders all 4 body types without crashing', () => {
    const { CatBody } = require('../svg/CatParts');
    for (const type of ['slim', 'standard', 'round', 'chonky'] as const) {
      const { unmount } = render(
        <SvgWrap><CatBody type={type} color="#FF0000" /></SvgWrap>
      );
      unmount();
    }
  });
});

describe('CatHead', () => {
  it('renders with r=32 for anime chibi proportions', () => {
    const { CatHead } = require('../svg/CatParts');
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatHead color="#FF0000" /></SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const circles = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Circle' && v.props.r === '32'
    );
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });
});

describe('CatPaws', () => {
  it('renders two paw ellipses', () => {
    const { CatPaws } = require('../svg/CatParts');
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatPaws color="#FF0000" /></SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const ellipses = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Ellipse'
    );
    expect(ellipses.length).toBe(2);
  });
});

describe('CatNose', () => {
  it('renders small anime nose', () => {
    const { CatNose } = require('../svg/CatParts');
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatNose color="#FF0000" /></SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const ellipses = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Ellipse'
    );
    expect(ellipses.length).toBe(1);
  });
});

describe('CatWhiskers', () => {
  it('renders 6 whisker lines', () => {
    const { CatWhiskers } = require('../svg/CatParts');
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatWhiskers color="#FFFFFF" /></SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const lines = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Line'
    );
    expect(lines.length).toBe(6);
  });
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { CatShadows } from '../svg/CatShadows';

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
    Ellipse: MockSvgComponent('Ellipse'),
  };
});

function SvgWrap({ children }: { children: React.ReactNode }) {
  const SvgC = require('react-native-svg').default;
  return <SvgC viewBox="0 0 100 100">{children}</SvgC>;
}

describe('CatShadows', () => {
  it('renders 4 shadow ellipses (chin, ground, 2 paw)', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatShadows /></SvgWrap>
    );
    const ellipses = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Ellipse'
    );
    expect(ellipses.length).toBe(4);
  });

  it('all shadows use black fill with low opacity', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatShadows /></SvgWrap>
    );
    const ellipses = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Ellipse'
    );
    for (const e of ellipses) {
      expect(e.props.fill).toBe('#000000');
      expect(e.props.opacity).toBeLessThanOrEqual(0.1);
    }
  });
});

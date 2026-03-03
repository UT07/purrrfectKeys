import React from 'react';
import { render } from '@testing-library/react-native';
import { CatShadows, CatRimLight, CatFurSheen } from '../svg/CatShadows';

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
    Path: MockSvgComponent('Path'),
  };
});

function SvgWrap({ children }: { children: React.ReactNode }) {
  const SvgC = require('react-native-svg').default;
  return <SvgC viewBox="0 0 100 100">{children}</SvgC>;
}

describe('CatShadows', () => {
  it('renders ground shadow, neck contour, and 2 paw shadows', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatShadows /></SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const ellipses = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Ellipse'
    );
    const paths = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Path'
    );
    // 3 ellipses (ground + 2 paw) + 1 neck contour path
    expect(ellipses.length).toBe(3);
    expect(paths.length).toBe(1);
  });

  it('all shadow elements use black fill/stroke with low opacity', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatShadows /></SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const ellipses = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Ellipse'
    );
    for (const e of ellipses) {
      expect(e.props.fill).toBe('#000000');
      expect(e.props.opacity).toBeLessThanOrEqual(0.1);
    }
  });
});

describe('CatRimLight', () => {
  it('renders rim light paths with white stroke', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatRimLight /></SvgWrap>
    );
    const paths = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Path' && v.props.stroke === '#FFFFFF'
    );
    expect(paths.length).toBe(2);
  });
});

describe('CatFurSheen', () => {
  it('renders fur sheen highlight paths', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatFurSheen /></SvgWrap>
    );
    const paths = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Path' && v.props.stroke === '#FFFFFF'
    );
    expect(paths.length).toBe(2);
  });
});

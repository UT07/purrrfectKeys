import React from 'react';
import { render } from '@testing-library/react-native';
import { renderAccessory, EvolutionAura } from '../svg/CatAccessories';

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
    RadialGradient: MockSvgComponent('RadialGradient'),
    LinearGradient: MockSvgComponent('LinearGradient'),
    Stop: MockSvgComponent('Stop'),
  };
});

function SvgWrap({ children }: { children: React.ReactNode }) {
  const SvgC = require('react-native-svg').default;
  return <SvgC viewBox="0 0 100 100">{children}</SvgC>;
}

describe('renderAccessory', () => {
  const P0_ACCESSORIES = ['bow-tie', 'sunglasses', 'crown', 'gem-pendant', 'monocle', 'beanie', 'cape'];
  const P1_ACCESSORIES = ['scarf', 'trilby', 'fedora', 'pearl-necklace', 'gold-chain', 'golden-headphones'];

  it('renders all P0 accessories without crashing', () => {
    for (const name of P0_ACCESSORIES) {
      const result = renderAccessory(name, '#FF0000');
      expect(result).not.toBeNull();
      const { unmount } = render(<SvgWrap>{result!}</SvgWrap>);
      unmount();
    }
  });

  it('renders all P1 accessories without crashing', () => {
    for (const name of P1_ACCESSORIES) {
      const result = renderAccessory(name, '#FF0000');
      expect(result).not.toBeNull();
      const { unmount } = render(<SvgWrap>{result!}</SvgWrap>);
      unmount();
    }
  });

  it('unknown accessory returns null', () => {
    const result = renderAccessory('nonexistent', '#FF0000');
    expect(result).toBeNull();
  });

  it('scarf renders differently from bow-tie', () => {
    const bowTie = renderAccessory('bow-tie', '#FF0000');
    const scarf = renderAccessory('scarf', '#FF0000');
    expect(bowTie).not.toBeNull();
    expect(scarf).not.toBeNull();
  });

  it('fedora renders differently from beanie', () => {
    const beanie = renderAccessory('beanie', '#FF0000');
    const fedora = renderAccessory('fedora', '#FF0000');
    expect(beanie).not.toBeNull();
    expect(fedora).not.toBeNull();
  });

  it('renders alias accessories correctly', () => {
    const aliases = [
      'pink-bow', 'velvet-ribbon', 'pixel-crown', 'tiny-crown',
      'accessory-1', 'accessory-2', 'cape-purple', 'royal-robe',
      'golden-cape', 'chef-hat', 'lightning-collar', 'crescent-collar',
      'round-glasses', 'pixel-glasses', 'racing-goggles', 'royal-cape-white',
    ];
    for (const name of aliases) {
      const result = renderAccessory(name, '#FF0000');
      expect(result).not.toBeNull();
      const { unmount } = render(<SvgWrap>{result!}</SvgWrap>);
      unmount();
    }
  });
});

describe('EvolutionAura', () => {
  it('renders nothing for baby stage', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><EvolutionAura stage="baby" accent="#FF0000" /></SvgWrap>
    );
    const circles = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: { props: { accessibilityLabel?: string } }) => v.props.accessibilityLabel === 'Circle'
    );
    expect(circles.length).toBe(0);
  });

  it('renders nothing for teen stage', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><EvolutionAura stage="teen" accent="#FF0000" /></SvgWrap>
    );
    const circles = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: { props: { accessibilityLabel?: string } }) => v.props.accessibilityLabel === 'Circle'
    );
    expect(circles.length).toBe(0);
  });

  it('renders aura for adult stage', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><EvolutionAura stage="adult" accent="#FF0000" /></SvgWrap>
    );
    const circles = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: { props: { accessibilityLabel?: string } }) => v.props.accessibilityLabel === 'Circle'
    );
    expect(circles.length).toBe(1);
  });

  it('renders aura for master stage', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><EvolutionAura stage="master" accent="#FF0000" /></SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    expect(allViews.length).toBeGreaterThan(3);
  });
});

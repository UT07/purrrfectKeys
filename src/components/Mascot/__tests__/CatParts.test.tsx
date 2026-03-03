import React from 'react';
import { render } from '@testing-library/react-native';
import { CatBody, CatHead, CatEars, CatEyes, CatMouth, CatHairTuft } from '../svg/CatParts';

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
  it('renders organic chibi head path', () => {
    const { CatHead } = require('../svg/CatParts');
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatHead color="#FF0000" /></SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const paths = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Path' && v.props.fill === '#FF0000' && v.props.d?.startsWith('M 50 3')
    );
    expect(paths.length).toBeGreaterThanOrEqual(1);
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

describe('CatEars', () => {
  it('pointed ears use bezier curves (Q commands in path)', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatEars type="pointed" bodyColor="#FF0000" innerColor="#FF8800" /></SvgWrap>
    );
    const paths = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Path'
    );
    const bezierPaths = paths.filter(
      (p: any) => typeof p.props.d === 'string' && p.props.d.includes('Q')
    );
    expect(bezierPaths.length).toBeGreaterThanOrEqual(2);
  });

  it('renders all 3 ear types without crashing', () => {
    for (const type of ['pointed', 'rounded', 'folded'] as const) {
      const { unmount } = render(
        <SvgWrap><CatEars type={type} bodyColor="#FF0000" innerColor="#FF8800" /></SvgWrap>
      );
      unmount();
    }
  });
});

describe('CatMouth', () => {
  it('happy mood renders W-shape mouth path with multiple Q commands', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatMouth mood="happy" darkAccent="#8B0000" /></SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const paths = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Path'
    );
    // W-shape has a path with multiple Q commands for the double curve
    const wPaths = paths.filter(
      (p: any) => typeof p.props.d === 'string' && (p.props.d.match(/Q/g) || []).length >= 2
    );
    expect(wPaths.length).toBe(1);
  });

  it('renders all original moods without crashing', () => {
    for (const mood of ['happy', 'encouraging', 'excited', 'teaching', 'celebrating'] as const) {
      const { unmount } = render(
        <SvgWrap><CatMouth mood={mood} darkAccent="#8B0000" /></SvgWrap>
      );
      unmount();
    }
  });

  it('renders new moods without crashing', () => {
    for (const mood of ['love', 'confused', 'smug', 'sleepy'] as const) {
      const { unmount } = render(
        <SvgWrap><CatMouth mood={mood} darkAccent="#8B0000" /></SvgWrap>
      );
      unmount();
    }
  });
});

describe('CatHairTuft', () => {
  it('renders curly tuft without crashing', () => {
    const { unmount } = render(
      <SvgWrap><CatHairTuft type="curly" color="#FF0000" /></SvgWrap>
    );
    unmount();
  });

  it('renders "none" as null (no path elements)', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap><CatHairTuft type="none" color="#FF0000" /></SvgWrap>
    );
    const paths = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Path'
    );
    expect(paths.length).toBe(0);
  });

  it('renders all 12 tuft types without crashing', () => {
    const types = ['none', 'curly', 'slicked', 'fluffy', 'spiky', 'wave', 'windswept', 'side-part', 'silky', 'sharp', 'messy', 'cowlick'] as const;
    for (const type of types) {
      const { unmount } = render(
        <SvgWrap><CatHairTuft type={type} color="#FF0000" /></SvgWrap>
      );
      unmount();
    }
  });
});

describe('CatBody with gradient', () => {
  it('uses gradientFill when provided', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatBody type="standard" color="#FF0000" gradientFill="url(#test-body)" />
      </SvgWrap>
    );
    const ellipses = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Ellipse'
    );
    const bodyEllipse = ellipses.find((e: any) => e.props.fill === 'url(#test-body)');
    expect(bodyEllipse).toBeTruthy();
  });

  it('falls back to color when no gradientFill', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatBody type="standard" color="#FF0000" />
      </SvgWrap>
    );
    const ellipses = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Ellipse'
    );
    const bodyEllipse = ellipses.find((e: any) => e.props.fill === '#FF0000');
    expect(bodyEllipse).toBeTruthy();
  });
});

describe('CatHead with gradient', () => {
  it('uses gradientFill when provided', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatHead color="#FF0000" gradientFill="url(#test-head)" />
      </SvgWrap>
    );
    const paths = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Path'
    );
    const headPath = paths.find((p: any) => p.props.fill === 'url(#test-head)');
    expect(headPath).toBeTruthy();
  });

  it('falls back to color when no gradientFill', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatHead color="#FF0000" />
      </SvgWrap>
    );
    const paths = UNSAFE_getAllByType(require('react-native').View).filter(
      (v: any) => v.props.accessibilityLabel === 'Path'
    );
    const headPath = paths.find((p: any) => p.props.fill === '#FF0000');
    expect(headPath).toBeTruthy();
  });
});

describe('CatEyes 6-layer system', () => {
  it('big-sparkly renders at least 6 elements per eye (12 total)', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatEyes shape="big-sparkly" mood="encouraging" eyeColor="#3DFF88" />
      </SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const circles = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Circle'
    );
    // 6 layers per eye x 2 eyes = 12+ circles
    expect(circles.length).toBeGreaterThanOrEqual(12);
  });

  it('eyelashes prop renders lash lines', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatEyes shape="round" mood="encouraging" eyeColor="#3DFF88" eyelashes={true} />
      </SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const lines = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Line'
    );
    // At least 6 lash lines (3 per eye)
    expect(lines.length).toBeGreaterThanOrEqual(6);
  });

  it('no eyelashes when prop is false', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatEyes shape="round" mood="encouraging" eyeColor="#3DFF88" eyelashes={false} />
      </SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const lines = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Line'
    );
    // No lash lines when eyelashes=false
    expect(lines.length).toBe(0);
  });

  it('love mood renders heart shapes', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatEyes shape="round" mood="love" eyeColor="#FF6B9D" />
      </SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const paths = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Path'
    );
    // Hearts rendered as paths
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it('confused mood renders spiral eyes with ellipses', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatEyes shape="round" mood="confused" eyeColor="#3DFF88" />
      </SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const ellipses = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Ellipse'
    );
    const paths = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Path'
    );
    // 2 sclera ellipses + 2 spiral paths
    expect(ellipses.length).toBeGreaterThanOrEqual(2);
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it('smug mood renders half-lid eyes', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatEyes shape="round" mood="smug" eyeColor="#3DFF88" />
      </SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const lines = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Line'
    );
    // 2 lid lines (one per eye)
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  it('sleepy mood from MascotMood renders heavy-lid eyes', () => {
    const { unmount } = render(
      <SvgWrap>
        <CatEyes shape="round" mood="sleepy" eyeColor="#3DFF88" />
      </SvgWrap>
    );
    unmount();
  });

  it('round shape still uses Ellipse for sclera (backward compat)', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatEyes shape="round" mood="encouraging" eyeColor="#3DFF88" />
      </SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const ellipses = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Ellipse'
    );
    // round shape uses 2 Ellipse sclera
    expect(ellipses.length).toBeGreaterThanOrEqual(2);
  });

  it('big-sparkly uses catId for iris gradient reference', () => {
    const { UNSAFE_getAllByType } = render(
      <SvgWrap>
        <CatEyes shape="big-sparkly" mood="encouraging" eyeColor="#3DFF88" catId="mini-meowww" />
      </SvgWrap>
    );
    const allViews = UNSAFE_getAllByType(require('react-native').View);
    const circles = allViews.filter(
      (v: any) => v.props.accessibilityLabel === 'Circle'
    );
    const irisCircle = circles.find(
      (c: any) => c.props.fill === 'url(#mini-meowww-iris)'
    );
    expect(irisCircle).toBeTruthy();
  });
});

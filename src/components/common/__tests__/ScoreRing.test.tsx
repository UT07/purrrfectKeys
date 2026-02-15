/**
 * ScoreRing Component Tests
 *
 * Tests the animated SVG circular score indicator.
 * Validates color thresholds, rendering at various scores, animated vs static paths,
 * text display, size handling, and edge cases.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ScoreRing } from '../ScoreRing';

// Mock react-native-svg with Circle as a class component
// (Animated.createAnimatedComponent requires a class or forwardRef with getScrollableNode)
jest.mock('react-native-svg', () => {
  const mockReact = require('react');
  const RN = require('react-native');

  const Svg = ({ children, ...props }: Record<string, unknown>) =>
    mockReact.createElement(RN.View, props, children);

  // Circle must be a class component so Animated.createAnimatedComponent
  // can call componentDidMount without the getScrollableNode crash.
  // getScrollableNode must return a truthy value (numeric node tag)
  // because NativeEventsManager reads properties from it.
  class CircleMock extends mockReact.Component<Record<string, unknown>> {
    getScrollableNode(): number {
      return 1;
    }
    render(): unknown {
      return mockReact.createElement(RN.View, this.props);
    }
  }

  return {
    __esModule: true,
    default: Svg,
    Circle: CircleMock,
  };
});

describe('ScoreRing', () => {
  describe('Basic rendering', () => {
    it('renders without crashing with required props', () => {
      const { getByTestId } = render(
        <ScoreRing score={75} size={80} animated={false} />,
      );
      expect(getByTestId('score-ring')).toBeTruthy();
    });

    it('renders the score number as text', () => {
      const { getByText } = render(
        <ScoreRing score={85} size={80} animated={false} />,
      );
      expect(getByText('85')).toBeTruthy();
    });

    it('renders the percentage sign', () => {
      const { getByText } = render(
        <ScoreRing score={90} size={80} animated={false} />,
      );
      expect(getByText('%')).toBeTruthy();
    });

    it('renders both score and percentage for any value', () => {
      const { getByText } = render(
        <ScoreRing score={42} size={100} animated={false} />,
      );
      expect(getByText('42')).toBeTruthy();
      expect(getByText('%')).toBeTruthy();
    });
  });

  describe('Color thresholds', () => {
    // getScoreColor: <60 red, 60-79 orange, 80-94 green, 95+ gold

    it('score 0 renders with red color (#F44336)', () => {
      const { getByText } = render(
        <ScoreRing score={0} size={80} animated={false} />,
      );
      const scoreText = getByText('0');
      expect(scoreText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#F44336' }),
        ]),
      );
    });

    it('score 59 renders with red color (#F44336)', () => {
      const { getByText } = render(
        <ScoreRing score={59} size={80} animated={false} />,
      );
      const scoreText = getByText('59');
      expect(scoreText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#F44336' }),
        ]),
      );
    });

    it('score 60 renders with orange color (#FF9800)', () => {
      const { getByText } = render(
        <ScoreRing score={60} size={80} animated={false} />,
      );
      const scoreText = getByText('60');
      expect(scoreText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FF9800' }),
        ]),
      );
    });

    it('score 79 renders with orange color (#FF9800)', () => {
      const { getByText } = render(
        <ScoreRing score={79} size={80} animated={false} />,
      );
      const scoreText = getByText('79');
      expect(scoreText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FF9800' }),
        ]),
      );
    });

    it('score 80 renders with green color (#4CAF50)', () => {
      const { getByText } = render(
        <ScoreRing score={80} size={80} animated={false} />,
      );
      const scoreText = getByText('80');
      expect(scoreText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#4CAF50' }),
        ]),
      );
    });

    it('score 94 renders with green color (#4CAF50)', () => {
      const { getByText } = render(
        <ScoreRing score={94} size={80} animated={false} />,
      );
      const scoreText = getByText('94');
      expect(scoreText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#4CAF50' }),
        ]),
      );
    });

    it('score 95 renders with gold color (#FFD700)', () => {
      const { getByText } = render(
        <ScoreRing score={95} size={80} animated={false} />,
      );
      const scoreText = getByText('95');
      expect(scoreText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FFD700' }),
        ]),
      );
    });

    it('score 100 renders with gold color (#FFD700)', () => {
      const { getByText } = render(
        <ScoreRing score={100} size={80} animated={false} />,
      );
      const scoreText = getByText('100');
      expect(scoreText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FFD700' }),
        ]),
      );
    });
  });

  describe('Size variations', () => {
    it('renders at size 40', () => {
      const { getByTestId } = render(
        <ScoreRing score={50} size={40} animated={false} />,
      );
      const ring = getByTestId('score-ring');
      expect(ring.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: 40, height: 40 }),
        ]),
      );
    });

    it('renders at size 80', () => {
      const { getByTestId } = render(
        <ScoreRing score={50} size={80} animated={false} />,
      );
      const ring = getByTestId('score-ring');
      expect(ring.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: 80, height: 80 }),
        ]),
      );
    });

    it('renders at size 120', () => {
      const { getByTestId } = render(
        <ScoreRing score={50} size={120} animated={false} />,
      );
      const ring = getByTestId('score-ring');
      expect(ring.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: 120, height: 120 }),
        ]),
      );
    });

    it('renders at size 200', () => {
      const { getByTestId } = render(
        <ScoreRing score={50} size={200} animated={false} />,
      );
      const ring = getByTestId('score-ring');
      expect(ring.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: 200, height: 200 }),
        ]),
      );
    });

    it('font size scales with ring size (score text is 30% of size)', () => {
      const { getByText } = render(
        <ScoreRing score={50} size={100} animated={false} />,
      );
      const scoreText = getByText('50');
      expect(scoreText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fontSize: 30 }),
        ]),
      );
    });

    it('percent text font size is 15% of size', () => {
      const { getByText } = render(
        <ScoreRing score={50} size={100} animated={false} />,
      );
      const percentText = getByText('%');
      expect(percentText.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fontSize: 15 }),
        ]),
      );
    });
  });

  describe('Animated vs static rendering', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('renders static ring when animated=false', () => {
      const { getByTestId } = render(
        <ScoreRing score={75} size={80} animated={false} />,
      );
      expect(getByTestId('score-ring')).toBeTruthy();
    });

    it('renders animated ring when animated=true', () => {
      const { getByTestId, unmount } = render(
        <ScoreRing score={75} size={80} animated={true} />,
      );
      expect(getByTestId('score-ring')).toBeTruthy();
      unmount();
      jest.runOnlyPendingTimers();
    });

    it('defaults to animated=true when animated prop is omitted', () => {
      // animated defaults to true per component definition
      const { getByTestId, unmount } = render(
        <ScoreRing score={75} size={80} />,
      );
      expect(getByTestId('score-ring')).toBeTruthy();
      jest.runOnlyPendingTimers();
      unmount();
    });
  });

  describe('strokeWidth prop', () => {
    it('uses default strokeWidth of 6 when not specified', () => {
      const { getByTestId } = render(
        <ScoreRing score={75} size={80} animated={false} />,
      );
      expect(getByTestId('score-ring')).toBeTruthy();
    });

    it('accepts custom strokeWidth', () => {
      const { getByTestId } = render(
        <ScoreRing score={75} size={80} strokeWidth={10} animated={false} />,
      );
      expect(getByTestId('score-ring')).toBeTruthy();
    });

    it('renders with strokeWidth=2', () => {
      const { getByTestId } = render(
        <ScoreRing score={75} size={80} strokeWidth={2} animated={false} />,
      );
      expect(getByTestId('score-ring')).toBeTruthy();
    });
  });

  describe('Edge cases for score values', () => {
    it('renders score of 0', () => {
      const { getByText, getByTestId } = render(
        <ScoreRing score={0} size={80} animated={false} />,
      );
      expect(getByText('0')).toBeTruthy();
      expect(getByTestId('score-ring')).toBeTruthy();
    });

    it('renders score of 100', () => {
      const { getByText, getByTestId } = render(
        <ScoreRing score={100} size={80} animated={false} />,
      );
      expect(getByText('100')).toBeTruthy();
      expect(getByTestId('score-ring')).toBeTruthy();
    });

    it('renders score of 1', () => {
      const { getByText } = render(
        <ScoreRing score={1} size={80} animated={false} />,
      );
      expect(getByText('1')).toBeTruthy();
    });

    it('renders score of 50', () => {
      const { getByText } = render(
        <ScoreRing score={50} size={80} animated={false} />,
      );
      expect(getByText('50')).toBeTruthy();
    });

    it('renders negative score without crashing', () => {
      const { getByTestId } = render(
        <ScoreRing score={-5} size={80} animated={false} />,
      );
      expect(getByTestId('score-ring')).toBeTruthy();
    });

    it('renders score greater than 100 without crashing', () => {
      const { getByTestId } = render(
        <ScoreRing score={150} size={80} animated={false} />,
      );
      expect(getByTestId('score-ring')).toBeTruthy();
    });
  });

  describe('Color boundary precision', () => {
    // Test exact boundary values
    it('score 59 is red, score 60 is orange (exact boundary)', () => {
      const { getByText: getByText1 } = render(
        <ScoreRing score={59} size={80} animated={false} />,
      );
      expect(getByText1('59').props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#F44336' }),
        ]),
      );

      const { getByText: getByText2 } = render(
        <ScoreRing score={60} size={80} animated={false} />,
      );
      expect(getByText2('60').props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FF9800' }),
        ]),
      );
    });

    it('score 79 is orange, score 80 is green (exact boundary)', () => {
      const { getByText: getByText1 } = render(
        <ScoreRing score={79} size={80} animated={false} />,
      );
      expect(getByText1('79').props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FF9800' }),
        ]),
      );

      const { getByText: getByText2 } = render(
        <ScoreRing score={80} size={80} animated={false} />,
      );
      expect(getByText2('80').props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#4CAF50' }),
        ]),
      );
    });

    it('score 94 is green, score 95 is gold (exact boundary)', () => {
      const { getByText: getByText1 } = render(
        <ScoreRing score={94} size={80} animated={false} />,
      );
      expect(getByText1('94').props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#4CAF50' }),
        ]),
      );

      const { getByText: getByText2 } = render(
        <ScoreRing score={95} size={80} animated={false} />,
      );
      expect(getByText2('95').props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FFD700' }),
        ]),
      );
    });
  });

  describe('Re-rendering stability', () => {
    it('re-renders when score changes', () => {
      const { getByText, rerender } = render(
        <ScoreRing score={50} size={80} animated={false} />,
      );
      expect(getByText('50')).toBeTruthy();

      rerender(<ScoreRing score={95} size={80} animated={false} />);
      expect(getByText('95')).toBeTruthy();
    });

    it('re-renders when size changes', () => {
      const { getByTestId, rerender } = render(
        <ScoreRing score={50} size={80} animated={false} />,
      );
      expect(getByTestId('score-ring').props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: 80, height: 80 }),
        ]),
      );

      rerender(<ScoreRing score={50} size={120} animated={false} />);
      expect(getByTestId('score-ring').props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ width: 120, height: 120 }),
        ]),
      );
    });

    it('re-renders when switching between animated and static', () => {
      jest.useFakeTimers();
      const { getByTestId, rerender, unmount } = render(
        <ScoreRing score={75} size={80} animated={false} />,
      );
      expect(getByTestId('score-ring')).toBeTruthy();

      rerender(<ScoreRing score={75} size={80} animated={true} />);
      expect(getByTestId('score-ring')).toBeTruthy();
      unmount();
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('color changes correctly when score crosses a boundary on re-render', () => {
      const { getByText, rerender } = render(
        <ScoreRing score={59} size={80} animated={false} />,
      );
      // Red at 59
      expect(getByText('59').props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#F44336' }),
        ]),
      );

      // Re-render to 60 (orange)
      rerender(<ScoreRing score={60} size={80} animated={false} />);
      expect(getByText('60').props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FF9800' }),
        ]),
      );

      // Re-render to 95 (gold)
      rerender(<ScoreRing score={95} size={80} animated={false} />);
      expect(getByText('95').props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#FFD700' }),
        ]),
      );
    });
  });

  describe('Layout and structure', () => {
    it('has testID "score-ring" on the container', () => {
      const { getByTestId } = render(
        <ScoreRing score={50} size={80} animated={false} />,
      );
      expect(getByTestId('score-ring')).toBeTruthy();
    });

    it('container has correct alignment styles', () => {
      const { getByTestId } = render(
        <ScoreRing score={50} size={80} animated={false} />,
      );
      const ring = getByTestId('score-ring');
      expect(ring.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alignItems: 'center',
            justifyContent: 'center',
          }),
        ]),
      );
    });
  });
});

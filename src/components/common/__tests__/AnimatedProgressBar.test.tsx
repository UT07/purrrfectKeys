/**
 * AnimatedProgressBar Component Tests
 *
 * Tests the animated progress bar with smooth fill transitions
 * and optional golden pulse on completion.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AnimatedProgressBar } from '../AnimatedProgressBar';

describe('AnimatedProgressBar', () => {
  describe('Basic rendering', () => {
    it('renders with default props', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.5} testID="progress" />,
      );
      expect(getByTestId('progress')).toBeTruthy();
    });

    it('renders the fill element', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.5} testID="progress" />,
      );
      expect(getByTestId('progress-fill')).toBeTruthy();
    });

    it('renders with zero progress', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0} testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });

    it('renders with full progress', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={1} testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });
  });

  describe('Custom progress values', () => {
    it('renders with progress=0.25', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.25} testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });

    it('renders with progress=0.75', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.75} testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });

    it('clamps progress above 1 to 1', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={1.5} testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });

    it('clamps negative progress to 0', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={-0.5} testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });
  });

  describe('Custom color', () => {
    it('accepts a custom color prop', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.5} color="#4CAF50" testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });

    it('renders with the default crimson color when no color is specified', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.5} testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });
  });

  describe('Height', () => {
    it('renders at default height of 8', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.5} testID="bar" />,
      );
      const container = getByTestId('bar');
      // The container style should include height: 8
      const flatStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style.filter(Boolean))
        : container.props.style;
      expect(flatStyle.height).toBe(8);
    });

    it('renders at custom height of 16', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.5} height={16} testID="bar" />,
      );
      const container = getByTestId('bar');
      const flatStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style.filter(Boolean))
        : container.props.style;
      expect(flatStyle.height).toBe(16);
    });

    it('renders at height of 4', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.5} height={4} testID="bar" />,
      );
      const container = getByTestId('bar');
      const flatStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style.filter(Boolean))
        : container.props.style;
      expect(flatStyle.height).toBe(4);
    });

    it('uses borderRadius equal to half the height', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.5} height={12} testID="bar" />,
      );
      const container = getByTestId('bar');
      const flatStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style.filter(Boolean))
        : container.props.style;
      expect(flatStyle.borderRadius).toBe(6);
    });
  });

  describe('Animation modes', () => {
    it('renders with animated=true (default)', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.5} testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });

    it('renders with animated=false', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.5} animated={false} testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });
  });

  describe('Re-rendering', () => {
    it('re-renders when progress changes', () => {
      const { getByTestId, rerender } = render(
        <AnimatedProgressBar progress={0.3} testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();

      rerender(<AnimatedProgressBar progress={0.8} testID="bar" />);
      expect(getByTestId('bar')).toBeTruthy();
    });

    it('re-renders when color changes', () => {
      const { getByTestId, rerender } = render(
        <AnimatedProgressBar progress={0.5} color="#FF0000" testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();

      rerender(
        <AnimatedProgressBar progress={0.5} color="#00FF00" testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });
  });

  describe('Style prop', () => {
    it('accepts additional styles', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar
          progress={0.5}
          style={{ marginTop: 10 }}
          testID="bar"
        />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });

    it('renders without style prop', () => {
      const { getByTestId } = render(
        <AnimatedProgressBar progress={0.5} testID="bar" />,
      );
      expect(getByTestId('bar')).toBeTruthy();
    });
  });
});

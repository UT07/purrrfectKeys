/**
 * Skeleton Component Tests
 *
 * Tests the shimmer loading skeleton placeholders including
 * the base Skeleton, SkeletonText preset, and SkeletonCircle preset.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Skeleton, SkeletonText, SkeletonCircle } from '../Skeleton';

describe('Skeleton', () => {
  describe('Basic rendering', () => {
    it('renders with given dimensions', () => {
      const { getByTestId } = render(
        <Skeleton width={200} height={40} testID="skeleton" />,
      );
      expect(getByTestId('skeleton')).toBeTruthy();
    });

    it('applies correct width and height styles', () => {
      const { getByTestId } = render(
        <Skeleton width={150} height={30} testID="skeleton" />,
      );
      const element = getByTestId('skeleton');
      const flatStyle = Array.isArray(element.props.style)
        ? Object.assign({}, ...element.props.style.filter(Boolean))
        : element.props.style;
      expect(flatStyle.width).toBe(150);
      expect(flatStyle.height).toBe(30);
    });

    it('accepts string width', () => {
      const { getByTestId } = render(
        <Skeleton width="100%" height={20} testID="skeleton" />,
      );
      const element = getByTestId('skeleton');
      const flatStyle = Array.isArray(element.props.style)
        ? Object.assign({}, ...element.props.style.filter(Boolean))
        : element.props.style;
      expect(flatStyle.width).toBe('100%');
    });

    it('uses default border radius when not specified', () => {
      const { getByTestId } = render(
        <Skeleton width={100} height={20} testID="skeleton" />,
      );
      const element = getByTestId('skeleton');
      const flatStyle = Array.isArray(element.props.style)
        ? Object.assign({}, ...element.props.style.filter(Boolean))
        : element.props.style;
      expect(flatStyle.borderRadius).toBe(12); // BORDER_RADIUS.md
    });

    it('accepts custom border radius', () => {
      const { getByTestId } = render(
        <Skeleton width={100} height={20} borderRadius={8} testID="skeleton" />,
      );
      const element = getByTestId('skeleton');
      const flatStyle = Array.isArray(element.props.style)
        ? Object.assign({}, ...element.props.style.filter(Boolean))
        : element.props.style;
      expect(flatStyle.borderRadius).toBe(8);
    });
  });

  describe('Custom styles', () => {
    it('accepts additional styles', () => {
      const { getByTestId } = render(
        <Skeleton
          width={100}
          height={20}
          style={{ marginBottom: 10 }}
          testID="skeleton"
        />,
      );
      expect(getByTestId('skeleton')).toBeTruthy();
    });
  });
});

describe('SkeletonText', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<SkeletonText testID="skeleton-text" />);
    expect(getByTestId('skeleton-text')).toBeTruthy();
  });

  it('has a height of 16', () => {
    const { getByTestId } = render(<SkeletonText testID="skeleton-text" />);
    const element = getByTestId('skeleton-text');
    const flatStyle = Array.isArray(element.props.style)
      ? Object.assign({}, ...element.props.style.filter(Boolean))
      : element.props.style;
    expect(flatStyle.height).toBe(16);
  });

  it('has a border radius of 4', () => {
    const { getByTestId } = render(<SkeletonText testID="skeleton-text" />);
    const element = getByTestId('skeleton-text');
    const flatStyle = Array.isArray(element.props.style)
      ? Object.assign({}, ...element.props.style.filter(Boolean))
      : element.props.style;
    expect(flatStyle.borderRadius).toBe(4);
  });

  it('accepts additional styles', () => {
    const { getByTestId } = render(
      <SkeletonText style={{ marginTop: 5 }} testID="skeleton-text" />,
    );
    expect(getByTestId('skeleton-text')).toBeTruthy();
  });
});

describe('SkeletonCircle', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(
      <SkeletonCircle size={48} testID="skeleton-circle" />,
    );
    expect(getByTestId('skeleton-circle')).toBeTruthy();
  });

  it('has equal width and height matching size', () => {
    const { getByTestId } = render(
      <SkeletonCircle size={64} testID="skeleton-circle" />,
    );
    const element = getByTestId('skeleton-circle');
    const flatStyle = Array.isArray(element.props.style)
      ? Object.assign({}, ...element.props.style.filter(Boolean))
      : element.props.style;
    expect(flatStyle.width).toBe(64);
    expect(flatStyle.height).toBe(64);
  });

  it('has borderRadius of 9999 for circular shape', () => {
    const { getByTestId } = render(
      <SkeletonCircle size={48} testID="skeleton-circle" />,
    );
    const element = getByTestId('skeleton-circle');
    const flatStyle = Array.isArray(element.props.style)
      ? Object.assign({}, ...element.props.style.filter(Boolean))
      : element.props.style;
    expect(flatStyle.borderRadius).toBe(9999);
  });

  it('accepts additional styles', () => {
    const { getByTestId } = render(
      <SkeletonCircle
        size={48}
        style={{ marginRight: 8 }}
        testID="skeleton-circle"
      />,
    );
    expect(getByTestId('skeleton-circle')).toBeTruthy();
  });
});

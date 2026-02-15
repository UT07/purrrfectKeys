/**
 * FunFactCard Component Tests
 * Validates rendering, category display, and compact mode.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { FunFactCard } from '../FunFactCard';
import type { FunFact } from '../../../content/funFacts';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: View,
      createAnimatedComponent: (component: unknown) => component,
    },
    useSharedValue: (val: number) => ({ value: val }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    withTiming: (val: number) => val,
    withDelay: (_delay: number, val: number) => val,
    Easing: {
      out: (fn: unknown) => fn,
      cubic: (t: number) => t,
    },
  };
});

const mockFact: FunFact = {
  id: 'test-01',
  text: 'The piano was invented by Bartolomeo Cristofori in Italy around the year 1700.',
  category: 'history',
  difficulty: 'beginner',
};

const mockTheoryFact: FunFact = {
  id: 'test-02',
  text: 'A piano has 88 keys: 52 white keys and 36 black keys.',
  category: 'theory',
  difficulty: 'beginner',
};

describe('FunFactCard', () => {
  it('should render the fact text', () => {
    const { getByText } = render(<FunFactCard fact={mockFact} />);
    expect(getByText(mockFact.text)).toBeTruthy();
  });

  it('should render the "Did You Know?" header', () => {
    const { getByText } = render(<FunFactCard fact={mockFact} />);
    expect(getByText('Did You Know?')).toBeTruthy();
  });

  it('should render the category chip by default', () => {
    const { getByText } = render(<FunFactCard fact={mockFact} />);
    expect(getByText('History')).toBeTruthy();
  });

  it('should render the correct category for theory facts', () => {
    const { getByText } = render(<FunFactCard fact={mockTheoryFact} />);
    expect(getByText('Theory')).toBeTruthy();
  });

  it('should hide category chip when showCategory is false', () => {
    const { queryByText } = render(
      <FunFactCard fact={mockFact} showCategory={false} />
    );
    expect(queryByText('History')).toBeNull();
  });

  it('should use the provided testID', () => {
    const { getByTestId } = render(
      <FunFactCard fact={mockFact} testID="my-fun-fact" />
    );
    expect(getByTestId('my-fun-fact')).toBeTruthy();
  });

  it('should use default testID when none provided', () => {
    const { getByTestId } = render(<FunFactCard fact={mockFact} />);
    expect(getByTestId('fun-fact-card')).toBeTruthy();
  });

  it('should render in compact mode without crashing', () => {
    const { getByText } = render(<FunFactCard fact={mockFact} compact />);
    expect(getByText(mockFact.text)).toBeTruthy();
    expect(getByText('Did You Know?')).toBeTruthy();
  });

  it('should accept animationDelay prop', () => {
    const { getByTestId } = render(
      <FunFactCard fact={mockFact} animationDelay={500} />
    );
    expect(getByTestId('fun-fact-card')).toBeTruthy();
  });
});

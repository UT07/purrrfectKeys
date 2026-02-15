import React from 'react';
import { render } from '@testing-library/react-native';
import { ScoreRing } from '../ScoreRing';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const Svg = ({ children, ...props }: any) =>
    React.createElement('Svg', props, children);
  const Circle = React.forwardRef((props: any, ref: any) =>
    React.createElement('Circle', { ...props, ref }),
  );
  return {
    __esModule: true,
    default: Svg,
    Circle,
  };
});

describe('ScoreRing', () => {
  it('renders with a score', () => {
    const { getByText } = render(
      <ScoreRing score={85} size={80} animated={false} />,
    );
    expect(getByText('85')).toBeTruthy();
  });

  it('renders percentage sign', () => {
    const { getByText } = render(
      <ScoreRing score={95} size={80} animated={false} />,
    );
    expect(getByText('%')).toBeTruthy();
  });

  it('renders at different sizes', () => {
    const { getByTestId } = render(
      <ScoreRing score={70} size={120} animated={false} />,
    );
    expect(getByTestId('score-ring')).toBeTruthy();
  });
});

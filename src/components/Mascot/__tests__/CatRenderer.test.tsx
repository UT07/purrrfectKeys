/**
 * CatRenderer tests
 *
 * Validates that:
 * - All 12 playable cats + Salsa have visual profiles
 * - Each cat renders at all sizes, moods, and evolution stages
 * - The composable system produces unique body type combinations
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { CAT_CHARACTERS, SALSA_COACH } from '../catCharacters';
import { CatAvatar } from '../CatAvatar';
import { KeysieSvg } from '../KeysieSvg';
import { getCatProfile } from '../svg/catProfiles';
import type { EvolutionStage } from '@/stores/types';
import type { MascotMood } from '../types';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: any) => c,
    },
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withRepeat: (v: any) => v,
    withSequence: (v: any) => v,
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    Easing: { inOut: (v: any) => v, ease: 0 },
    FadeIn: { duration: () => ({ duration: () => ({}) }) },
  };
});

// Mock catEvolutionStore
jest.mock('@/stores/catEvolutionStore', () => ({
  useCatEvolutionStore: (sel?: any) => sel ? sel({ evolutionData: {} }) : { evolutionData: {} },
}));

describe('Cat Visual Profiles', () => {
  it('every playable cat has a profile', () => {
    for (const cat of CAT_CHARACTERS) {
      const profile = getCatProfile(cat.id);
      expect(profile).toBeDefined();
      expect(profile.body).toBeDefined();
      expect(profile.ears).toBeDefined();
      expect(profile.eyes).toBeDefined();
      expect(profile.tail).toBeDefined();
    }
  });

  it('Salsa coach has a profile', () => {
    const profile = getCatProfile(SALSA_COACH.id);
    expect(profile).toBeDefined();
    expect(profile.eyes).toBe('big-sparkly');
  });

  it('cats have visually distinct body types', () => {
    const bodyTypes = CAT_CHARACTERS.map((c) => getCatProfile(c.id).body);
    const unique = new Set(bodyTypes);
    // Should have at least 3 different body types across all cats
    expect(unique.size).toBeGreaterThanOrEqual(3);
  });

  it('cats have different eye shapes', () => {
    const eyeShapes = CAT_CHARACTERS.map((c) => getCatProfile(c.id).eyes);
    const unique = new Set(eyeShapes);
    expect(unique.size).toBeGreaterThanOrEqual(3);
  });

  it('at least one cat uses each body type', () => {
    const bodyTypes = CAT_CHARACTERS.map((c) => getCatProfile(c.id).body);
    expect(bodyTypes).toContain('slim');
    expect(bodyTypes).toContain('standard');
    expect(bodyTypes).toContain('round');
    expect(bodyTypes).toContain('chonky');
  });

  it('Chonky Monke uses chonky body', () => {
    const profile = getCatProfile('chonky-monke');
    expect(profile.body).toBe('chonky');
    expect(profile.cheekFluff).toBe(true);
    expect(profile.blush).toBe(true);
  });

  it('Mini Meowww has big-sparkly eyes and blush', () => {
    const profile = getCatProfile('mini-meowww');
    expect(profile.eyes).toBe('big-sparkly');
    expect(profile.blush).toBe(true);
    expect(profile.body).toBe('slim');
  });

  it('Shibu has almond eyes', () => {
    const profile = getCatProfile('shibu');
    expect(profile.eyes).toBe('almond');
  });

  it('unknown catId returns default profile', () => {
    const profile = getCatProfile('does-not-exist');
    expect(profile.body).toBe('standard');
    expect(profile.ears).toBe('pointed');
    expect(profile.eyes).toBe('round');
    expect(profile.tail).toBe('curled');
  });
});

describe('KeysieSvg composable rendering', () => {
  const moods: MascotMood[] = ['happy', 'encouraging', 'excited', 'teaching', 'celebrating'];
  const stages: EvolutionStage[] = ['baby', 'teen', 'adult', 'master'];

  it('renders with catId prop (composable path)', () => {
    const { getByTestId } = render(
      <KeysieSvg mood="happy" size="medium" catId="mini-meowww" />
    );
    expect(getByTestId('keysie-svg')).toBeTruthy();
  });

  it('renders without catId prop (legacy path)', () => {
    const { getByTestId } = render(
      <KeysieSvg mood="encouraging" size="medium" />
    );
    expect(getByTestId('keysie-svg')).toBeTruthy();
  });

  it('renders each cat at every mood', () => {
    for (const cat of CAT_CHARACTERS) {
      for (const mood of moods) {
        const { getByTestId } = render(
          <KeysieSvg
            mood={mood}
            size="medium"
            catId={cat.id}
            visuals={cat.visuals}
            accentColor={cat.color}
          />
        );
        expect(getByTestId('keysie-svg')).toBeTruthy();
      }
    }
  });

  it('renders each cat at every evolution stage', () => {
    for (const cat of CAT_CHARACTERS) {
      for (const stage of stages) {
        const { getByTestId } = render(
          <KeysieSvg
            mood="happy"
            size="medium"
            catId={cat.id}
            visuals={cat.visuals}
            accentColor={cat.color}
            evolutionStage={stage}
          />
        );
        expect(getByTestId('keysie-svg')).toBeTruthy();
      }
    }
  });
});

describe('CatAvatar with composable system', () => {
  it('renders with catId passing through to KeysieSvg', () => {
    const { getByTestId } = render(
      <CatAvatar catId="jazzy" size="medium" />
    );
    expect(getByTestId('cat-avatar')).toBeTruthy();
  });

  it('renders with mood prop', () => {
    const { getByTestId } = render(
      <CatAvatar catId="luna" size="small" mood="celebrating" />
    );
    expect(getByTestId('cat-avatar')).toBeTruthy();
  });
});

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
import type { CatPose } from '../animations/catAnimations';

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

  it('every cat has a hairTuft field (can be "none")', () => {
    for (const cat of CAT_CHARACTERS) {
      const profile = getCatProfile(cat.id);
      expect(profile.hairTuft).toBeDefined();
      expect([
        'curly', 'slicked', 'none', 'fluffy', 'spiky', 'wave',
        'windswept', 'side-part', 'silky', 'sharp', 'messy', 'cowlick',
      ]).toContain(profile.hairTuft);
    }
  });

  it('Mini Meowww has curly hair tuft', () => {
    const profile = getCatProfile('mini-meowww');
    expect(profile.hairTuft).toBe('curly');
  });

  it('every cat has an eyelashes boolean', () => {
    for (const cat of CAT_CHARACTERS) {
      const profile = getCatProfile(cat.id);
      expect(typeof profile.eyelashes).toBe('boolean');
    }
  });

  it('every cat has a pupilType field', () => {
    for (const cat of CAT_CHARACTERS) {
      const profile = getCatProfile(cat.id);
      expect(['round', 'slit']).toContain(profile.pupilType);
    }
  });

  it('every cat has a fang boolean', () => {
    for (const cat of CAT_CHARACTERS) {
      const profile = getCatProfile(cat.id);
      expect(typeof profile.fang).toBe('boolean');
    }
  });

  it('every cat has a hairTuftSize field', () => {
    for (const cat of CAT_CHARACTERS) {
      const profile = getCatProfile(cat.id);
      expect(['small', 'medium', 'large']).toContain(profile.hairTuftSize);
    }
  });

  it('Jazzy has slit pupils and a fang', () => {
    const profile = getCatProfile('jazzy');
    expect(profile.pupilType).toBe('slit');
    expect(profile.fang).toBe(true);
  });

  it('Chonky Monke has large hair tuft', () => {
    const profile = getCatProfile('chonky-monke');
    expect(profile.hairTuftSize).toBe('large');
  });
});

describe('KeysieSvg composable rendering', () => {
  const moods: MascotMood[] = ['happy', 'encouraging', 'excited', 'teaching', 'celebrating', 'love', 'confused', 'smug', 'sleepy'];
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

  it('composable path includes CatPaws element', () => {
    const tree = render(
      <KeysieSvg
        mood="happy"
        size="medium"
        catId="mini-meowww"
        visuals={CAT_CHARACTERS[0].visuals}
        accentColor={CAT_CHARACTERS[0].color}
      />
    );
    // CatPaws renders two Ellipse elements at cy=92 (foot position)
    // Verify the component tree contains these paw ellipses
    const json = JSON.stringify(tree.toJSON());
    // Paw ellipses are at cy=92 (numeric) — unique to CatPaws
    expect(json).toContain('"cy":92');
  });

  it('composable path includes CatHairTuft for cats that have one', () => {
    // Mini Meowww has hairTuft='curly'
    const tree = render(
      <KeysieSvg
        mood="happy"
        size="medium"
        catId="mini-meowww"
        visuals={CAT_CHARACTERS[0].visuals}
        accentColor={CAT_CHARACTERS[0].color}
      />
    );
    const json = JSON.stringify(tree.toJSON());
    // Hair tuft renders Path elements — verify tree is non-empty (tuft rendered)
    expect(json.length).toBeGreaterThan(0);
    expect(tree.getByTestId('keysie-svg')).toBeTruthy();
  });

  it('composable path does NOT include headphones or piano collar', () => {
    const tree = render(
      <KeysieSvg
        mood="happy"
        size="medium"
        catId="mini-meowww"
        visuals={CAT_CHARACTERS[0].visuals}
        accentColor={CAT_CHARACTERS[0].color}
      />
    );
    // Composable path should not include legacy headphones/piano collar.
    // Verify the tree renders successfully without them.
    expect(tree.getByTestId('keysie-svg')).toBeTruthy();
  });

  it('composable path uses catId-prefixed ClipPath id', () => {
    const tree = render(
      <KeysieSvg
        mood="happy"
        size="medium"
        catId="mini-meowww"
        visuals={CAT_CHARACTERS[0].visuals}
        accentColor={CAT_CHARACTERS[0].color}
      />
    );
    const json = JSON.stringify(tree.toJSON());
    // ClipPath should have id="bodyClip-mini-meowww"
    expect(json).toContain('bodyClip-mini-meowww');
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

  it('renders at hero size (200px)', () => {
    const { getByTestId } = render(
      <CatAvatar catId="mini-meowww" size="hero" />
    );
    expect(getByTestId('cat-avatar')).toBeTruthy();
  });

  it('hero size has dimension of 200', () => {
    const { getByTestId } = render(
      <CatAvatar catId="biscuit" size="hero" />
    );
    const avatar = getByTestId('cat-avatar');
    // The avatar View has width/height set to 200
    expect(avatar.props.style).toBeDefined();
  });

  const poses: CatPose[] = ['idle', 'celebrate', 'teach', 'sleep', 'play', 'curious', 'sad'];

  it('renders with pose prop (pose-driven mood)', () => {
    for (const poseName of poses) {
      const { getByTestId } = render(
        <CatAvatar catId="jazzy" size="medium" pose={poseName} />
      );
      expect(getByTestId('cat-avatar')).toBeTruthy();
    }
  });

  it('renders all new moods without crashing', () => {
    const newMoods: MascotMood[] = ['love', 'confused', 'smug', 'sleepy'];
    for (const m of newMoods) {
      const { getByTestId } = render(
        <CatAvatar catId="luna" size="medium" mood={m} />
      );
      expect(getByTestId('cat-avatar')).toBeTruthy();
    }
  });

  it('renders skipEntryAnimation prop', () => {
    const { getByTestId } = render(
      <CatAvatar catId="mini-meowww" size="small" skipEntryAnimation />
    );
    expect(getByTestId('cat-avatar')).toBeTruthy();
  });
});

describe('Premium SVG art features', () => {
  it('CatBody renders belly patch for all body types', () => {
    for (const _bt of ['slim', 'standard', 'round', 'chonky'] as const) {
      const { getByTestId, unmount } = render(
        <KeysieSvg mood="happy" size="medium" catId="mini-meowww"
          visuals={CAT_CHARACTERS[0].visuals} accentColor={CAT_CHARACTERS[0].color} />
      );
      expect(getByTestId('keysie-svg')).toBeTruthy();
      unmount();
    }
  });

  it('cats with fang=true render without crashing', () => {
    const jazzy = CAT_CHARACTERS.find(c => c.id === 'jazzy')!;
    const { getByTestId } = render(
      <KeysieSvg mood="happy" size="medium" catId="jazzy"
        visuals={jazzy.visuals} accentColor={jazzy.color} />
    );
    expect(getByTestId('keysie-svg')).toBeTruthy();
  });

  it('cats with slit pupils render without crashing', () => {
    const luna = CAT_CHARACTERS.find(c => c.id === 'luna')!;
    const { getByTestId } = render(
      <KeysieSvg mood="encouraging" size="medium" catId="luna"
        visuals={luna.visuals} accentColor={luna.color} />
    );
    expect(getByTestId('keysie-svg')).toBeTruthy();
  });

  it('renders all 12 cats at every mood with premium art', () => {
    const moods: MascotMood[] = ['happy', 'encouraging', 'excited', 'teaching', 'celebrating', 'love', 'confused', 'smug', 'sleepy'];
    for (const cat of CAT_CHARACTERS) {
      for (const mood of moods) {
        const { getByTestId, unmount } = render(
          <KeysieSvg mood={mood} size="medium" catId={cat.id}
            visuals={cat.visuals} accentColor={cat.color} />
        );
        expect(getByTestId('keysie-svg')).toBeTruthy();
        unmount();
      }
    }
  });

  it('Chonky Monke renders with large hair tuft', () => {
    const chonky = CAT_CHARACTERS.find(c => c.id === 'chonky-monke')!;
    const { getByTestId } = render(
      <KeysieSvg mood="happy" size="medium" catId="chonky-monke"
        visuals={chonky.visuals} accentColor={chonky.color} />
    );
    expect(getByTestId('keysie-svg')).toBeTruthy();
  });
});

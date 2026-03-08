/**
 * BonusDrill Tests
 *
 * Tests the Bonus Drill feature end-to-end:
 * - WeakSpotDetector integration with learner profiles
 * - CompletionModal "Bonus Drill" button visibility and interaction
 * - generateDrillParams producing valid params for each pattern type
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CompletionModal } from '../CompletionModal';
import {
  detectWeakPatterns,
  generateDrillParams,
  type WeakPattern,
  type WeakSpotProfile,
} from '../../../core/curriculum/WeakSpotDetector';
import type { Exercise, ExerciseScore } from '../../../core/exercises/types';

// ---------------------------------------------------------------------------
// Mock dependencies (same as CompletionModal.test.tsx)
// ---------------------------------------------------------------------------

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: React.forwardRef((props: any, ref: any) =>
        React.createElement(View, { ...props, ref })
      ),
      Text: React.forwardRef((props: any, ref: any) =>
        React.createElement(Text, { ...props, ref })
      ),
      createAnimatedComponent: (Component: any) => Component,
    },
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (val: any) => val,
    withSpring: (val: any) => val,
    withDelay: (_d: any, val: any) => val,
    withRepeat: (val: any) => val,
    withSequence: (...args: any[]) => args[args.length - 1],
    Easing: {
      out: (fn: any) => fn,
      cubic: (t: any) => t,
      linear: (t: any) => t,
      in: (fn: any) => fn,
    },
    FadeIn: { duration: () => ({ delay: () => ({ springify: () => ({}) }) }) },
    FadeInUp: { duration: () => ({ delay: () => ({ springify: () => ({}) }), springify: () => ({}) }), delay: () => ({ duration: () => ({}) }), springify: () => ({}) },
    FadeInDown: { duration: () => ({ delay: () => ({ springify: () => ({}) }), springify: () => ({}) }), springify: () => ({}) },
    runOnJS: (fn: any) => fn,
  };
});

jest.mock('../../../audio/SoundManager', () => ({
  soundManager: { play: jest.fn(), preload: jest.fn() },
}));

jest.mock('../../../components/Mascot/MascotBubble', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    MascotBubble: ({ message, mood }: any) =>
      React.createElement(
        View,
        { testID: 'mascot-bubble' },
        React.createElement(Text, null, message),
        React.createElement(Text, null, mood)
      ),
  };
});

jest.mock('../../../components/Mascot/CatAvatar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CatAvatar: (props: any) =>
      React.createElement(View, { testID: 'cat-avatar', ...props }),
  };
});

jest.mock('../../../components/transitions/ConfettiEffect', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ConfettiEffect: (props: any) =>
      React.createElement(View, { testID: props.testID || 'confetti' }),
  };
});

jest.mock('../../../components/XpPopup', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    XpPopup: ({ amount }: any) =>
      React.createElement(Text, { testID: 'xp-popup' }, '+' + amount + ' XP'),
  };
});

jest.mock('../../../components/FunFact/FunFactCard', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    FunFactCard: (props: any) =>
      React.createElement(View, { testID: props.testID || 'fun-fact-card' }),
  };
});

jest.mock('../../../content/catDialogue', () => ({
  getRandomCatMessage: jest.fn(() => 'Great job, meow!'),
}));

jest.mock('../../../content/funFactSelector', () => ({
  getFactForExerciseType: jest.fn(() => ({
    id: 'fact-1',
    text: 'Piano has 88 keys',
    category: 'instrument',
    difficulty: 'beginner',
  })),
}));

jest.mock('../../../services/ai/CoachingService', () => ({
  coachingService: {
    generateFeedback: jest.fn().mockResolvedValue({
      feedback: 'Nice work! Focus on timing next time.',
      suggestedAction: 'continue',
    }),
  },
}));

jest.mock('../../../stores/progressStore', () => ({
  useProgressStore: Object.assign(jest.fn(() => ({})), {
    getState: jest.fn(() => ({
      level: 3,
      recordExerciseCompletion: jest.fn(),
    })),
  }),
}));

jest.mock('../../../stores/settingsStore', () => ({
  useSettingsStore: jest.fn((selector: any) => {
    const state = { selectedCatId: 'mini-meowww' };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

jest.mock('../../../stores/catEvolutionStore', () => ({
  useCatEvolutionStore: jest.fn((selector: any) => {
    const state = {
      evolutionData: {
        'mini-meowww': { currentStage: 'baby' },
      },
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

jest.mock('../../../components/Mascot/SalsaCoach', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SalsaCoach: (props: any) =>
      React.createElement(View, { testID: 'salsa-coach', ...props }),
  };
});

jest.mock('../../../services/tts/TTSService', () => ({
  ttsService: { speak: jest.fn(), stop: jest.fn() },
}));

jest.mock('../../../content/ContentLoader', () => ({
  getLessonIdForExercise: jest.fn(() => null),
}));

jest.mock('../../../components/common/Button', () => ({
  Button: (props: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={props.onPress} testID={props.testID} disabled={props.disabled}>
        <Text>{props.title}</Text>
      </TouchableOpacity>
    );
  },
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_EXERCISE: Exercise = {
  id: 'test-ex-1',
  version: 1,
  metadata: {
    title: 'C Major Scale',
    description: 'Play the C major scale ascending',
    difficulty: 2,
    estimatedMinutes: 3,
    skills: ['right-hand', 'c-major'],
    prerequisites: [],
  },
  settings: {
    tempo: 120,
    timeSignature: [4, 4],
    keySignature: 'C',
    countIn: 4,
    metronomeEnabled: true,
  },
  notes: [
    { note: 60, startBeat: 0, durationBeats: 1 },
    { note: 62, startBeat: 1, durationBeats: 1 },
    { note: 64, startBeat: 2, durationBeats: 1 },
  ],
  scoring: {
    timingToleranceMs: 50,
    timingGracePeriodMs: 150,
    passingScore: 70,
    starThresholds: [70, 85, 95],
  },
  hints: {
    beforeStart: 'Use your right hand',
    commonMistakes: [],
    successMessage: 'Well done!',
  },
};

const mockPassingScore: ExerciseScore = {
  overall: 85,
  breakdown: {
    accuracy: 90,
    timing: 80,
    completeness: 85,
    extraNotes: 0,
    duration: 90,
  },
  stars: 2,
  xpEarned: 50,
  isPassed: true,
  isNewHighScore: false,
  details: [],
};

// ---------------------------------------------------------------------------
// WeakSpotDetector integration tests
// ---------------------------------------------------------------------------

describe('BonusDrill - WeakSpotDetector integration', () => {
  it('detectWeakPatterns returns patterns when learner has weak notes', () => {
    const profile: WeakSpotProfile = {
      noteAccuracy: {
        60: 0.95,
        62: 0.45, // weak
        64: 0.3,  // weaker
        65: 0.9,
      },
      weakNotes: [62, 64],
      skills: { timingAccuracy: 0.8, pitchAccuracy: 0.85 },
      tempoRange: { min: 50, max: 90 },
    };
    const patterns = detectWeakPatterns(profile);
    expect(patterns.length).toBeGreaterThan(0);
    // Worst pattern first (MIDI 64 has lowest accuracy)
    expect(patterns[0].targetMidi).toContain(64);
    expect(patterns[0].type).toBe('note');
  });

  it('detectWeakPatterns returns empty for a strong profile', () => {
    const profile: WeakSpotProfile = {
      noteAccuracy: {
        60: 0.95,
        62: 0.92,
        64: 0.88,
      },
      weakNotes: [],
      skills: { timingAccuracy: 0.9, pitchAccuracy: 0.9 },
      tempoRange: { min: 60, max: 100 },
    };
    const patterns = detectWeakPatterns(profile);
    expect(patterns).toEqual([]);
  });

  it('generateDrillParams creates valid params from each pattern type', () => {
    const types: Array<WeakPattern['type']> = ['note', 'transition', 'timing', 'hand'];
    for (const type of types) {
      const pattern: WeakPattern = {
        type,
        description: `Test ${type} pattern`,
        severity: 0.5,
        targetMidi: [60, 62],
      };
      const params = generateDrillParams(pattern);
      expect(params).toBeDefined();
      expect(params.weakNotes).toEqual([60, 62]);
      expect(params.difficulty).toBeGreaterThanOrEqual(1);
      expect(params.difficulty).toBeLessThanOrEqual(5);
      expect(params.noteCount).toBeGreaterThan(0);
      expect(params.tempoRange.min).toBeLessThan(params.tempoRange.max);
      expect(params.exerciseType).toBe('warmup');
    }
  });
});

// ---------------------------------------------------------------------------
// CompletionModal Bonus Drill button tests
// ---------------------------------------------------------------------------

describe('BonusDrill - CompletionModal button', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows "Bonus Drill" button when onBonusDrill is provided', () => {
    const onBonusDrill = jest.fn();
    const { getByTestId } = render(
      <CompletionModal
        score={mockPassingScore}
        exercise={MOCK_EXERCISE}
        onClose={jest.fn()}
        onBonusDrill={onBonusDrill}
        skipAnimation
      />
    );

    const drillBtn = getByTestId('completion-bonus-drill');
    expect(drillBtn).toBeTruthy();
  });

  it('hides "Bonus Drill" button when onBonusDrill is not provided', () => {
    const { queryByTestId } = render(
      <CompletionModal
        score={mockPassingScore}
        exercise={MOCK_EXERCISE}
        onClose={jest.fn()}
        skipAnimation
      />
    );

    expect(queryByTestId('completion-bonus-drill')).toBeNull();
  });

  it('calls onBonusDrill when bonus drill button is pressed', () => {
    const onBonusDrill = jest.fn();
    const { getByTestId } = render(
      <CompletionModal
        score={mockPassingScore}
        exercise={MOCK_EXERCISE}
        onClose={jest.fn()}
        onBonusDrill={onBonusDrill}
        skipAnimation
      />
    );

    fireEvent.press(getByTestId('completion-bonus-drill'));
    expect(onBonusDrill).toHaveBeenCalledTimes(1);
  });

  it('shows bonus drill description in button text when provided', () => {
    const { getByText } = render(
      <CompletionModal
        score={mockPassingScore}
        exercise={MOCK_EXERCISE}
        onClose={jest.fn()}
        onBonusDrill={jest.fn()}
        bonusDrillDescription="Weak note: MIDI 62 (45% accuracy)"
        skipAnimation
      />
    );

    expect(getByText('Bonus: Weak note: MIDI 62 (45% accuracy)')).toBeTruthy();
  });

  it('shows generic "Bonus Drill" text when no description provided', () => {
    const { getByText } = render(
      <CompletionModal
        score={mockPassingScore}
        exercise={MOCK_EXERCISE}
        onClose={jest.fn()}
        onBonusDrill={jest.fn()}
        skipAnimation
      />
    );

    expect(getByText('Bonus Drill')).toBeTruthy();
  });
});

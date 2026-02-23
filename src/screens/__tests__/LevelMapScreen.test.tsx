/**
 * LevelMapScreen UI Tests
 *
 * Tests the Duolingo-style vertical level map: tier node rendering,
 * state-driven styling (completed / current / locked), navigation on tap,
 * header stats display, back button, and tier progression from SkillTree.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: mockGoBack,
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: {} }),
  NavigationContainer: ({ children }: any) => children,
}));

// ---------------------------------------------------------------------------
// react-native-svg mock (LevelMapScreen uses Svg + Path for connectors)
// ---------------------------------------------------------------------------

jest.mock('react-native-svg', () => {
  const mockReact = require('react');
  const RN = require('react-native');

  const Svg = ({ children, ...props }: any) =>
    mockReact.createElement(RN.View, { ...props, testID: 'svg-container' }, children);

  const Path = (props: any) =>
    mockReact.createElement(RN.View, { ...props, testID: `svg-path-${props.stroke || 'default'}` });

  return { __esModule: true, default: Svg, Svg, Path };
});

// ---------------------------------------------------------------------------
// expo-linear-gradient mock
// ---------------------------------------------------------------------------

jest.mock('expo-linear-gradient', () => {
  const mockReact = require('react');
  const RN = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: any) =>
      mockReact.createElement(RN.View, { ...props, testID: 'linear-gradient' }, children),
  };
});

jest.mock('../../components/Mascot/SalsaCoach', () => {
  const mockReact = require('react');
  const RN = require('react-native');
  return {
    SalsaCoach: (props: any) =>
      mockReact.createElement(RN.View, { testID: 'salsa-coach', ...props }),
  };
});

// ---------------------------------------------------------------------------
// Zustand store mocks
// ---------------------------------------------------------------------------

let mockProgressState: any = {
  totalXp: 500,
  level: 3,
  streakData: { currentStreak: 5, longestStreak: 10, lastPracticeDate: '2026-02-16' },
  lessonProgress: {},
  dailyGoalData: {},
  recordExerciseCompletion: jest.fn(),
  addXp: jest.fn(),
  setLevel: jest.fn(),
  updateStreakData: jest.fn(),
  updateLessonProgress: jest.fn(),
  updateExerciseProgress: jest.fn(),
  getLessonProgress: jest.fn(),
  getExerciseProgress: jest.fn(),
  recordPracticeSession: jest.fn(),
  updateDailyGoal: jest.fn(),
  reset: jest.fn(),
};

jest.mock('../../stores/progressStore', () => ({
  useProgressStore: Object.assign(
    (sel?: any) => (sel ? sel(mockProgressState) : mockProgressState),
    { getState: () => mockProgressState },
  ),
}));

let mockMasteredSkills: string[] = [];

jest.mock('../../stores/learnerProfileStore', () => ({
  useLearnerProfileStore: Object.assign(
    (sel?: any) => {
      const state = { masteredSkills: mockMasteredSkills };
      return sel ? sel(state) : state;
    },
    { getState: () => ({ masteredSkills: mockMasteredSkills }) },
  ),
}));

// ---------------------------------------------------------------------------
// ContentLoader mock — 3 lessons (for tiers 1-3)
// ---------------------------------------------------------------------------

const MOCK_LESSONS = [
  {
    id: 'lesson-01',
    version: 1,
    metadata: { title: 'Hello Piano', description: 'First steps', difficulty: 1, estimatedMinutes: 10, skills: ['notes'] },
    exercises: [
      { id: 'lesson-01-ex-01', title: 'Find Middle C', order: 1, required: true },
      { id: 'lesson-01-ex-02', title: 'Keyboard Geo', order: 2, required: true },
    ],
    unlockRequirement: null,
    xpReward: 50,
    estimatedMinutes: 10,
  },
  {
    id: 'lesson-02',
    version: 1,
    metadata: { title: 'C Major Scale', description: 'Scales intro', difficulty: 2, estimatedMinutes: 15, skills: ['scales'] },
    exercises: [
      { id: 'lesson-02-ex-01', title: 'CDE Simple', order: 1, required: true },
    ],
    unlockRequirement: { type: 'lesson', lessonId: 'lesson-01' },
    xpReward: 75,
    estimatedMinutes: 15,
  },
  {
    id: 'lesson-03',
    version: 1,
    metadata: { title: 'Simple Melodies', description: 'Play songs', difficulty: 2, estimatedMinutes: 20, skills: ['melodies'] },
    exercises: [
      { id: 'lesson-03-ex-01', title: 'Mary Lamb', order: 1, required: true },
    ],
    unlockRequirement: { type: 'lesson', lessonId: 'lesson-02' },
    xpReward: 100,
    estimatedMinutes: 20,
  },
];

jest.mock('../../content/ContentLoader', () => ({
  getLessons: () => MOCK_LESSONS,
  getLessonExercises: (id: string) => {
    const map: Record<string, any[]> = {
      'lesson-01': MOCK_LESSONS[0].exercises,
      'lesson-02': MOCK_LESSONS[1].exercises,
      'lesson-03': MOCK_LESSONS[2].exercises,
    };
    return map[id] ?? [];
  },
  getExercise: (id: string) => {
    // Return a truthy stub for known static exercise IDs so fallback resolution works
    const knownIds = [
      'lesson-01-ex-01', 'lesson-01-ex-02',
      'lesson-02-ex-01',
      'lesson-03-ex-01',
    ];
    return knownIds.includes(id) ? { id } : null;
  },
}));

// ---------------------------------------------------------------------------
// Import component under test AFTER all mocks are set up
// ---------------------------------------------------------------------------

import { LevelMapScreen } from '../LevelMapScreen';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks() {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockProgressState = {
    ...mockProgressState,
    lessonProgress: {},
  };
  mockMasteredSkills = [];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LevelMapScreen', () => {
  beforeEach(resetMocks);

  // =========================================================================
  // Rendering basics
  // =========================================================================

  it('renders the header title "Your Journey"', () => {
    const { getByText } = render(<LevelMapScreen />);
    expect(getByText('Your Journey')).toBeTruthy();
  });

  it('renders tier node titles', () => {
    const { getByText } = render(<LevelMapScreen />);
    // Tier 1 and some later tiers should be present
    expect(getByText('Note Finding')).toBeTruthy();
    expect(getByText('Black Keys')).toBeTruthy();
    expect(getByText('Performance')).toBeTruthy();
  });

  it('renders gradient header', () => {
    const { getByTestId } = render(<LevelMapScreen />);
    expect(getByTestId('linear-gradient')).toBeTruthy();
  });

  it('renders 15 tier nodes', () => {
    const { getByText } = render(<LevelMapScreen />);
    // Spot-check several tiers
    expect(getByText('Note Finding')).toBeTruthy();
    expect(getByText('Right Hand Melodies')).toBeTruthy();
    expect(getByText('Left Hand Basics')).toBeTruthy();
    expect(getByText('Chord Progressions')).toBeTruthy();
    expect(getByText('Sight Reading')).toBeTruthy();
  });

  // =========================================================================
  // Back button
  // =========================================================================

  it('renders back button', () => {
    const { getByTestId } = render(<LevelMapScreen />);
    expect(getByTestId('level-map-back')).toBeTruthy();
  });

  it('back button calls goBack', () => {
    const { getByTestId } = render(<LevelMapScreen />);
    fireEvent.press(getByTestId('level-map-back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // Node states — fresh user (no progress)
  // =========================================================================

  describe('fresh user (no progress)', () => {
    beforeEach(() => {
      mockProgressState.lessonProgress = {};
      mockMasteredSkills = [];
    });

    it('shows tier 1 as current (START chip)', () => {
      const { getByText } = render(<LevelMapScreen />);
      expect(getByText('START')).toBeTruthy();
    });

    it('shows locked hints on later tiers', () => {
      const { getAllByText } = render(<LevelMapScreen />);
      const hints = getAllByText('Complete previous');
      expect(hints.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // Node states — tier 1 completed via lesson progress
  // =========================================================================

  describe('tier 1 completed via lesson progress', () => {
    beforeEach(() => {
      mockProgressState.lessonProgress = {
        'lesson-01': {
          status: 'completed',
          exerciseScores: {
            'lesson-01-ex-01': { completedAt: '2026-02-15', stars: 3 },
            'lesson-01-ex-02': { completedAt: '2026-02-15', stars: 2 },
          },
        },
      };
      mockMasteredSkills = ['find-middle-c', 'keyboard-geography', 'white-keys'];
    });

    it('shows tier 1 as completed (check icon)', () => {
      const { getAllByText } = render(<LevelMapScreen />);
      expect(getAllByText('check-bold').length).toBeGreaterThanOrEqual(1);
    });

    it('shows tier 2 as current', () => {
      const { getByText } = render(<LevelMapScreen />);
      expect(getByText('START')).toBeTruthy();
    });
  });

  // =========================================================================
  // Navigation
  // =========================================================================

  describe('navigation', () => {
    it('navigates to Exercise with aiMode for tier with unmastered skills', () => {
      // Fresh user: tier 1 has unmastered skills → AI exercise
      const { getByText } = render(<LevelMapScreen />);
      fireEvent.press(getByText('Note Finding'));
      expect(mockNavigate).toHaveBeenCalledWith('Exercise', expect.objectContaining({
        aiMode: true,
        skillId: expect.any(String),
      }));
    });

    it('uses static exercise ID as fallback when available', () => {
      const { getByText } = render(<LevelMapScreen />);
      fireEvent.press(getByText('Note Finding'));
      // find-middle-c has targetExerciseIds: ['lesson-01-ex-01'] which exists in mock
      expect(mockNavigate).toHaveBeenCalledWith('Exercise', expect.objectContaining({
        exerciseId: 'lesson-01-ex-01',
        aiMode: true,
      }));
    });

    it('navigates to LessonIntro for completed tier (review)', () => {
      // Tier 1 completed (all skills mastered) → LessonIntro for review
      mockMasteredSkills = ['find-middle-c', 'keyboard-geography', 'white-keys'];
      mockProgressState.lessonProgress = {
        'lesson-01': {
          status: 'completed',
          exerciseScores: {
            'lesson-01-ex-01': { completedAt: '2026-02-15', stars: 3 },
            'lesson-01-ex-02': { completedAt: '2026-02-15', stars: 2 },
          },
        },
      };
      const { getByText } = render(<LevelMapScreen />);
      fireEvent.press(getByText('Note Finding'));
      expect(mockNavigate).toHaveBeenCalledWith('LessonIntro', { lessonId: 'lesson-01' });
    });

    it('does NOT navigate when tapping a locked tier', () => {
      const { getByText } = render(<LevelMapScreen />);
      fireEvent.press(getByText('Black Keys'));
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // SVG connectors
  // =========================================================================

  it('renders SVG connector paths between nodes', () => {
    const { getByTestId } = render(<LevelMapScreen />);
    expect(getByTestId('svg-container')).toBeTruthy();
  });

  // =========================================================================
  // Header stats
  // =========================================================================

  it('displays completed tier count and total skills in header', () => {
    const { getByText } = render(<LevelMapScreen />);
    // Fresh user: 0/15 tiers, 0 skills
    expect(getByText('0/15')).toBeTruthy();
    expect(getByText('0 skills')).toBeTruthy();
  });
});

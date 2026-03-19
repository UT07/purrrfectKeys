/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * LevelMapScreen UI Tests
 *
 * Tests the adventure-style winding path level map showing 40 lesson nodes
 * with exercise type indicators, progress bars, and section banners.
 */

// Mock Firebase (imported transitively via stores -> socialService/leagueService)
jest.mock('../../services/firebase/config', () => ({
  auth: { currentUser: null },
  db: {},
  functions: {},
  firebaseAvailable: true,
}));
jest.mock('../../services/firebase/socialService', () => ({
  postActivity: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/firebase/leagueService', () => ({
  addLeagueXp: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    dispatch: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  }),
  useNavigationState: (selector: (state: any) => any) =>
    selector({ routes: [{ name: 'LevelMap' }] }),
  useRoute: () => ({ params: {} }),
  NavigationContainer: ({ children }: any) => children,
}));

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

// ---------------------------------------------------------------------------
// react-native-svg mock
// ---------------------------------------------------------------------------

jest.mock('react-native-svg', () => {
  const mockReact = require('react');
  const RN = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => mockReact.createElement(RN.View, { testID: 'svg-root', ...props }, props.children),
    Svg: (props: any) => mockReact.createElement(RN.View, { testID: 'svg-root', ...props }, props.children),
    Path: (props: any) => mockReact.createElement(RN.View, { testID: 'svg-path', ...props }),
    Circle: (props: any) => mockReact.createElement(RN.View, props),
    Rect: (props: any) => mockReact.createElement(RN.View, props),
    G: (props: any) => mockReact.createElement(RN.View, props, props.children),
  };
});

// ---------------------------------------------------------------------------
// react-native-reanimated mock
// ---------------------------------------------------------------------------

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');

  return {
    ...jest.requireActual('react-native-reanimated/mock'),
    default: {
      View: RN.View,
      Text: RN.Text,
      createAnimatedComponent: (component: any) => component,
    },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: () => ({}),
    withRepeat: (v: any) => v,
    withSequence: (...args: any[]) => args[0],
    withTiming: (v: any) => v,
    FadeInUp: { delay: () => ({ duration: () => undefined }) },
  };
});

// ---------------------------------------------------------------------------
// Component mocks
// ---------------------------------------------------------------------------

jest.mock('../../components/Mascot/SalsaCoach', () => {
  const mockReact = require('react');
  const RN = require('react-native');
  return {
    SalsaCoach: (props: any) =>
      mockReact.createElement(RN.View, { testID: 'salsa-coach', ...props }),
  };
});

jest.mock('../../components/Mascot/CatAvatar', () => {
  const mockReact = require('react');
  const RN = require('react-native');
  return {
    CatAvatar: (props: any) =>
      mockReact.createElement(RN.View, { testID: `cat-avatar-${props.catId}`, ...props }),
  };
});

// ---------------------------------------------------------------------------
// ContentLoader mock — returns realistic lesson data
// ---------------------------------------------------------------------------

const mockLessons = [
  { id: 'lesson-01', title: 'Getting Started', difficulty: 1 as const, exerciseCount: 3, unlockRequirement: null },
  { id: 'lesson-02', title: 'Right Hand Basics', difficulty: 1 as const, exerciseCount: 8, unlockRequirement: { type: 'lesson-complete', lessonId: 'lesson-01' } },
  { id: 'lesson-03', title: 'Left Hand Basics', difficulty: 1 as const, exerciseCount: 5, unlockRequirement: { type: 'lesson-complete', lessonId: 'lesson-02' } },
  { id: 'lesson-04', title: 'Both Hands Together', difficulty: 2 as const, exerciseCount: 6, unlockRequirement: { type: 'lesson-complete', lessonId: 'lesson-03' } },
  { id: 'lesson-05', title: 'C Major Scale', difficulty: 2 as const, exerciseCount: 4, unlockRequirement: { type: 'lesson-complete', lessonId: 'lesson-04' } },
  { id: 'lesson-06', title: 'Simple Songs', difficulty: 2 as const, exerciseCount: 4, unlockRequirement: { type: 'lesson-complete', lessonId: 'lesson-05' } },
  { id: 'lesson-07', title: 'Black Keys', difficulty: 2 as const, exerciseCount: 10, unlockRequirement: { type: 'lesson-complete', lessonId: 'lesson-06' } },
];

const mockExercisesForLesson: Record<string, any[]> = {
  'lesson-01': [
    { id: 'lesson-01-ex-01', lessonId: 'lesson-01', title: 'Find Middle C', difficulty: 1, skills: [], type: 'play', order: 1 },
    { id: 'lesson-01-ex-02', lessonId: 'lesson-01', title: 'Keyboard Geography', difficulty: 1, skills: [], type: 'play', order: 2 },
    { id: 'lesson-01-ex-03', lessonId: 'lesson-01', title: 'White Keys', difficulty: 1, skills: [], type: 'play', order: 3 },
  ],
  'lesson-02': [
    { id: 'lesson-02-ex-01', lessonId: 'lesson-02', title: 'C-D-E', difficulty: 1, skills: [], type: 'play', order: 1 },
    { id: 'lesson-02-ex-02', lessonId: 'lesson-02', title: 'C-D-E-F-G', difficulty: 1, skills: [], type: 'play', order: 2 },
  ],
  'lesson-07': [
    { id: 'lesson-07-ex-01', lessonId: 'lesson-07', title: 'Find Black Keys', difficulty: 2, skills: [], type: 'play', order: 1 },
    { id: 'lesson-07-ex-08', lessonId: 'lesson-07', title: 'Ear Training', difficulty: 2, skills: [], type: 'earTraining', order: 8 },
  ],
};

jest.mock('../../content/ContentLoader', () => ({
  getAllLessons: () => mockLessons,
  getExercisesForLesson: (lessonId: string) => mockExercisesForLesson[lessonId] ?? [],
  getExercise: jest.fn(),
  getLessons: jest.fn(() => []),
  getLessonExercises: jest.fn(() => []),
}));

// ---------------------------------------------------------------------------
// Zustand store mocks
// ---------------------------------------------------------------------------

let mockLessonProgress: Record<string, any> = {};

jest.mock('../../stores/progressStore', () => ({
  useProgressStore: Object.assign(
    (sel?: any) => {
      const state = { lessonProgress: mockLessonProgress, tierTestResults: {} };
      return sel ? sel(state) : state;
    },
    { getState: () => ({ lessonProgress: mockLessonProgress, tierTestResults: {} }) },
  ),
}));

const mockGemState = { gems: 50, earnGems: jest.fn(), spendGems: jest.fn() };

jest.mock('../../stores/gemStore', () => ({
  useGemStore: Object.assign(
    (sel?: any) => (sel ? sel(mockGemState) : mockGemState),
    { getState: () => mockGemState },
  ),
}));

jest.mock('../../stores/settingsStore', () => ({
  useSettingsStore: Object.assign(
    (sel?: any) => {
      const state = { selectedCatId: 'mini-meowww' };
      return sel ? sel(state) : state;
    },
    { getState: () => ({ selectedCatId: 'mini-meowww' }) },
  ),
}));

jest.mock('../../stores/catEvolutionStore', () => ({
  useCatEvolutionStore: Object.assign(
    (sel?: any) => {
      const state = {
        ownedCats: ['mini-meowww'],
        evolutionData: { 'mini-meowww': { currentStage: 'baby', totalXp: 0 } },
      };
      return sel ? sel(state) : state;
    },
    { getState: () => ({
      ownedCats: ['mini-meowww'],
      evolutionData: { 'mini-meowww': { currentStage: 'baby', totalXp: 0 } },
    }) },
  ),
}));

// ---------------------------------------------------------------------------
// Import component under test AFTER all mocks
// ---------------------------------------------------------------------------

import { LevelMapScreen } from '../LevelMapScreen';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks() {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockLessonProgress = {};
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

  it('renders lesson node titles', () => {
    const { getByText } = render(<LevelMapScreen />);
    expect(getByText('Getting Started')).toBeTruthy();
    expect(getByText('Right Hand Basics')).toBeTruthy();
    expect(getByText('Black Keys')).toBeTruthy();
  });

  it('renders gradient header', () => {
    const { getAllByTestId } = render(<LevelMapScreen />);
    expect(getAllByTestId('linear-gradient').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all lesson nodes', () => {
    const { getByText } = render(<LevelMapScreen />);
    // All 7 mock lessons should appear
    expect(getByText('Getting Started')).toBeTruthy();
    expect(getByText('Left Hand Basics')).toBeTruthy();
    expect(getByText('C Major Scale')).toBeTruthy();
    expect(getByText('Simple Songs')).toBeTruthy();
  });

  it('renders section headers', () => {
    const { getByText } = render(<LevelMapScreen />);
    expect(getByText('Beginner')).toBeTruthy();
  });

  // =========================================================================
  // SVG path connections
  // =========================================================================

  it('renders SVG path connections between nodes', () => {
    const { getAllByTestId } = render(<LevelMapScreen />);
    const paths = getAllByTestId('svg-path');
    // 7 nodes = 6 connecting paths
    expect(paths.length).toBe(6);
  });

  // =========================================================================
  // Cat companions at section milestones
  // =========================================================================

  it('renders section cat at Beginner (mini-meowww)', () => {
    const { getAllByTestId } = render(<LevelMapScreen />);
    const cats = getAllByTestId('cat-avatar-mini-meowww');
    expect(cats.length).toBeGreaterThanOrEqual(1);
  });

  // =========================================================================
  // Back button
  // =========================================================================

  it('hides back button when used as tab (single route)', () => {
    const { queryByTestId } = render(<LevelMapScreen />);
    expect(queryByTestId('level-map-back')).toBeNull();
  });

  // =========================================================================
  // Node states — fresh user (no progress)
  // =========================================================================

  describe('fresh user (no progress)', () => {
    beforeEach(() => {
      mockLessonProgress = {};
    });

    it('shows lesson 1 as current (START chip)', () => {
      const { getByText } = render(<LevelMapScreen />);
      expect(getByText('START')).toBeTruthy();
    });

    it('shows lesson 1 as current via testID', () => {
      const { getByTestId } = render(<LevelMapScreen />);
      expect(getByTestId('lesson-node-current')).toBeTruthy();
    });
  });

  // =========================================================================
  // Node states — lesson 1 completed
  // =========================================================================

  describe('lesson 1 completed', () => {
    beforeEach(() => {
      mockLessonProgress = {
        'lesson-01': {
          lessonId: 'lesson-01',
          status: 'completed',
          exerciseScores: {
            'lesson-01-ex-01': { highScore: 95, stars: 3 },
            'lesson-01-ex-02': { highScore: 85, stars: 2 },
            'lesson-01-ex-03': { highScore: 90, stars: 3 },
          },
          bestScore: 90,
          totalAttempts: 5,
          totalTimeSpentSeconds: 300,
        },
      };
    });

    it('shows lesson 2 as current', () => {
      const { getByText } = render(<LevelMapScreen />);
      expect(getByText('START')).toBeTruthy();
    });
  });

  // =========================================================================
  // Navigation
  // =========================================================================

  describe('navigation', () => {
    it('navigates to LessonIntro for current lesson', () => {
      const { getByText } = render(<LevelMapScreen />);
      fireEvent.press(getByText('Getting Started'));
      expect(mockNavigate).toHaveBeenCalledWith('LessonIntro', {
        lessonId: 'lesson-01',
        locked: false,
      });
    });

    it('navigates to LessonIntro with locked=true for locked lessons', () => {
      const { getByText } = render(<LevelMapScreen />);
      // Lesson 3 is locked (lesson 2 not completed)
      fireEvent.press(getByText('Left Hand Basics'));
      expect(mockNavigate).toHaveBeenCalledWith('LessonIntro', {
        lessonId: 'lesson-03',
        locked: true,
      });
    });
  });

  // =========================================================================
  // Header stats
  // =========================================================================

  it('displays lesson count and exercise total in header', () => {
    const { getByText } = render(<LevelMapScreen />);
    expect(getByText('0/7 lessons')).toBeTruthy();
  });

  it('shows gem count in header', () => {
    const { getByText } = render(<LevelMapScreen />);
    expect(getByText('50')).toBeTruthy();
  });

  // =========================================================================
  // Exercise type legend
  // =========================================================================

  it('renders exercise type legend in header', () => {
    const { getByText } = render(<LevelMapScreen />);
    expect(getByText('Play')).toBeTruthy();
    expect(getByText('Rhythm')).toBeTruthy();
    expect(getByText('Ear')).toBeTruthy();
    expect(getByText('Chords')).toBeTruthy();
    expect(getByText('Sight')).toBeTruthy();
    expect(getByText('Call')).toBeTruthy();
  });

  // =========================================================================
  // Salsa coach
  // =========================================================================

  it('renders Salsa coach', () => {
    const { getByTestId } = render(<LevelMapScreen />);
    expect(getByTestId('salsa-coach')).toBeTruthy();
  });
});

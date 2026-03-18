/**
 * PlayFirstOnboarding Tests
 *
 * Tests the 5-step "Play First" onboarding flow:
 *   1. Play your first note (Middle C)
 *   2. Guided melody (C-D-E-F-G)
 *   3. Mini-exercise (Twinkle Twinkle)
 *   4. Cat + path selection
 *   5. Quick setup (experience + input + goal + username)
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mock setup (MUST come before component import)
// ---------------------------------------------------------------------------

let mockSettingsState: any = {
  hasCompletedOnboarding: false,
  experienceLevel: 'beginner',
  learningGoal: 'songs',
  selectedCatId: 'mini-meowww',
  playbackSpeed: 0.5,
  username: '',
  displayName: '',
  setExperienceLevel: jest.fn(),
  setLearningGoal: jest.fn(),
  setHasCompletedOnboarding: jest.fn(),
  setPlaybackSpeed: jest.fn(),
  setPreferredInputMethod: jest.fn(),
  updateMidiSettings: jest.fn(),
  setSelectedCatId: jest.fn(),
  setSelectedPath: jest.fn(),
  setUsername: jest.fn(),
  setDisplayName: jest.fn(),
  preferredInputMethod: 'touch',
  selectedPath: 'piano-basics',
};

jest.mock('../../stores/settingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector: any) => selector(mockSettingsState),
    {
      getState: () => mockSettingsState,
      setState: (s: any) => {
        Object.assign(mockSettingsState, typeof s === 'function' ? s(mockSettingsState) : s);
      },
    },
  ),
}));

const mockInitializeStarterCat = jest.fn();
jest.mock('../../stores/catEvolutionStore', () => ({
  useCatEvolutionStore: Object.assign(
    (selector: any) => selector({ selectedCatId: '', ownedCats: [] }),
    { getState: () => ({ initializeStarterCat: mockInitializeStarterCat }) },
  ),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      dispatch: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
  };
});

jest.mock('../../services/firebase/socialService', () => ({
  checkUsernameAvailable: jest.fn().mockResolvedValue(true),
  isValidUsername: jest.fn((u: string) => /^[a-z0-9_-]{3,20}$/.test(u)),
  registerUsername: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../components/Mascot/CatAvatar', () => ({
  CatAvatar: (props: any) => {
    const { View, Text } = require('react-native');
    return <View testID={`cat-avatar-${props.catId || 'default'}`}><Text>CatAvatar</Text></View>;
  },
}));

jest.mock('../../components/Mascot/catCharacters', () => ({
  getStarterCats: () => [
    { id: 'mini-meowww', name: 'Mini Meowww', personality: 'Tiny but Mighty', color: '#DC143C', visuals: {} },
    { id: 'jazzy', name: 'Jazzy', personality: 'Cool & Smooth', color: '#9B59B6', visuals: {} },
    { id: 'luna', name: 'Luna', personality: 'Mysterious', color: '#5B6EAE', visuals: {} },
  ],
}));

// Mock Keyboard — capture onNoteOn for simulating key presses
let capturedOnNoteOn: ((event: any) => void) | null = null;
jest.mock('../../components/Keyboard/Keyboard', () => ({
  Keyboard: jest.fn((props: any) => {
    capturedOnNoteOn = props.onNoteOn;
    const { View, Text } = require('react-native');
    return (
      <View testID={props.testID ?? 'mock-keyboard'}>
        <Text>Keyboard</Text>
      </View>
    );
  }),
}));

jest.mock('../../components/transitions/ConfettiEffect', () => ({
  ConfettiEffect: () => {
    const { View } = require('react-native');
    return <View testID="confetti" />;
  },
}));

jest.mock('../../components/effects', () => ({
  GradientMeshBackground: () => null,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: (props: any) => {
    const { View } = require('react-native');
    return <View {...props} />;
  },
}));

jest.mock('../../components/common/Button', () => ({
  Button: (props: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity
        onPress={props.disabled ? undefined : props.onPress}
        testID={props.testID}
        disabled={props.disabled}
        accessibilityState={{ disabled: !!props.disabled }}
      >
        <Text>{props.title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../components/common/PressableScale', () => ({
  PressableScale: (props: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity onPress={props.onPress} testID={props.testID}>{props.children}</TouchableOpacity>;
  },
}));

// Mock audio engine — make it synchronous to avoid timer issues
jest.mock('../../audio/createAudioEngine', () => ({
  createAudioEngine: () => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    playNote: jest.fn().mockReturnValue({ note: 60, startTime: 0, release: jest.fn() }),
    releaseNote: jest.fn(),
    releaseAllNotes: jest.fn(),
    suspend: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn(),
    setVolume: jest.fn(),
    getLatency: jest.fn().mockReturnValue(0),
    isReady: jest.fn().mockReturnValue(true),
    getState: jest.fn().mockReturnValue('running'),
    playMetronomeClick: jest.fn(),
  }),
}));

jest.mock('../../services/exerciseBufferManager', () => ({
  prefillOnboardingBuffer: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/analytics/PostHog', () => ({
  analyticsEvents: { onboarding: { started: jest.fn(), completed: jest.fn() } },
  funnels: { onboarding: { started: jest.fn(), completed: jest.fn() } },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { PlayFirstOnboarding } from '../PlayFirstOnboarding';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetState() {
  mockSettingsState = {
    hasCompletedOnboarding: false,
    experienceLevel: 'beginner',
    learningGoal: 'songs',
    selectedCatId: 'mini-meowww',
    playbackSpeed: 0.5,
    username: '',
    displayName: '',
    setExperienceLevel: jest.fn(),
    setLearningGoal: jest.fn(),
    setHasCompletedOnboarding: jest.fn(),
    setPlaybackSpeed: jest.fn(),
    setPreferredInputMethod: jest.fn(),
    updateMidiSettings: jest.fn(),
    setSelectedCatId: jest.fn(),
    setSelectedPath: jest.fn(),
    setUsername: jest.fn(),
    setDisplayName: jest.fn(),
    preferredInputMethod: 'touch',
    selectedPath: 'piano-basics',
  };
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockInitializeStarterCat.mockClear();
  capturedOnNoteOn = null;
}

function simulateNote(note: number) {
  act(() => {
    capturedOnNoteOn?.({ note, velocity: 100, timestamp: Date.now(), type: 'noteOn' });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlayFirstOnboarding', () => {
  beforeEach(resetState);

  // ---- Step 1: Play Your First Note ----

  describe('Step 1: Play Your First Note', () => {
    it('renders the keyboard and instruction text', () => {
      const { getByText, getByTestId } = render(<PlayFirstOnboarding />);
      expect(getByText('Play your first note!')).toBeTruthy();
      expect(getByText('Tap the glowing key below')).toBeTruthy();
      expect(getByTestId('play-first-keyboard')).toBeTruthy();
    });

    it('shows confetti when Middle C is played', () => {
      const { queryByTestId } = render(<PlayFirstOnboarding />);
      expect(queryByTestId('confetti')).toBeNull();

      simulateNote(60);

      expect(queryByTestId('confetti')).toBeTruthy();
    });

    it('shows success message after playing Middle C', () => {
      const { getByText } = render(<PlayFirstOnboarding />);
      simulateNote(60);
      expect(getByText('Amazing! You played Middle C!')).toBeTruthy();
    });

    it('does NOT show confetti for wrong note', () => {
      const { queryByTestId } = render(<PlayFirstOnboarding />);
      simulateNote(62); // D instead of C
      expect(queryByTestId('confetti')).toBeNull();
    });

    it('auto-advances to step 2 after playing Middle C', async () => {
      const { getByText } = render(<PlayFirstOnboarding />);
      simulateNote(60);

      await waitFor(() => {
        expect(getByText('Now a melody!')).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  // ---- Step 2: Guided Melody ----

  describe('Step 2: Guided Melody', () => {
    async function goToStep2() {
      const result = render(<PlayFirstOnboarding />);
      simulateNote(60);
      await waitFor(() => result.getByText('Now a melody!'), { timeout: 3000 });
      return result;
    }

    it('renders with first expected note C', async () => {
      const { getByText } = await goToStep2();
      expect(getByText('Play C next')).toBeTruthy();
    });

    it('advances through C-D-E-F-G and shows success', async () => {
      const { getByText } = await goToStep2();

      for (const note of [60, 62, 64, 65, 67]) {
        simulateNote(note);
      }

      expect(getByText('You played C-D-E-F-G!')).toBeTruthy();
    });

    it('auto-advances to step 3 after completing melody', async () => {
      const { getByText } = await goToStep2();

      for (const note of [60, 62, 64, 65, 67]) {
        simulateNote(note);
      }

      await waitFor(() => {
        expect(getByText('Twinkle Twinkle')).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  // ---- Step 3: Mini Exercise ----

  describe('Step 3: Mini Exercise', () => {
    async function goToStep3() {
      const result = render(<PlayFirstOnboarding />);
      simulateNote(60);
      await waitFor(() => result.getByText('Now a melody!'), { timeout: 3000 });
      for (const note of [60, 62, 64, 65, 67]) simulateNote(note);
      await waitFor(() => result.getByText('Twinkle Twinkle'), { timeout: 3000 });
      return result;
    }

    it('renders Twinkle Twinkle step with note counter', async () => {
      const { getByText } = await goToStep3();
      expect(getByText('Twinkle Twinkle')).toBeTruthy();
      expect(getByText('Note 1 of 14')).toBeTruthy();
    });

    it('tracks progress as notes are played', async () => {
      const { getByText } = await goToStep3();
      simulateNote(60); // First note
      expect(getByText('Note 2 of 14')).toBeTruthy();
    });

    it('shows score after completing all 14 notes', async () => {
      const { getByText } = await goToStep3();
      const twinkle = [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60];
      for (const note of twinkle) simulateNote(note);

      expect(getByText('Well done!')).toBeTruthy();
      expect(getByText('100% accuracy')).toBeTruthy();
    });
  });

  // ---- Step 4: Cat + Path Selection ----

  describe('Step 4: Cat + Path Selection', () => {
    async function goToStep4() {
      const result = render(<PlayFirstOnboarding />);
      // Fast-forward through steps 1-3
      simulateNote(60);
      await waitFor(() => result.getByText('Now a melody!'), { timeout: 3000 });
      for (const note of [60, 62, 64, 65, 67]) simulateNote(note);
      await waitFor(() => result.getByText('Twinkle Twinkle'), { timeout: 3000 });
      for (const note of [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60]) simulateNote(note);
      await waitFor(() => result.getByText('Choose your companion'), { timeout: 4000 });
      return result;
    }

    it('renders cat and path selection', async () => {
      const { getByText } = await goToStep4();
      expect(getByText('Choose your companion')).toBeTruthy();
      expect(getByText('Pick your path')).toBeTruthy();
      expect(getByText('Mini Meowww')).toBeTruthy();
      expect(getByText('Piano Basics')).toBeTruthy();
    }, 15000);

    it('Next button is disabled until both selected', async () => {
      const { getByTestId } = await goToStep4();
      const nextBtn = getByTestId('onboarding-cat-path-next');
      expect(nextBtn.props.accessibilityState?.disabled).toBe(true);
    }, 15000);

    it('enables Next after selecting cat and path', async () => {
      const { getByTestId } = await goToStep4();
      fireEvent.press(getByTestId('onboarding-cat-mini-meowww'));
      fireEvent.press(getByTestId('onboarding-path-piano-basics'));
      const nextBtn = getByTestId('onboarding-cat-path-next');
      expect(nextBtn.props.accessibilityState?.disabled).toBeFalsy();
    }, 15000);
  });

  // ---- Step 5: Quick Setup ----

  describe('Step 5: Quick Setup', () => {
    async function goToStep5() {
      const result = render(<PlayFirstOnboarding />);
      simulateNote(60);
      await waitFor(() => result.getByText('Now a melody!'), { timeout: 3000 });
      for (const note of [60, 62, 64, 65, 67]) simulateNote(note);
      await waitFor(() => result.getByText('Twinkle Twinkle'), { timeout: 3000 });
      for (const note of [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60]) simulateNote(note);
      await waitFor(() => result.getByText('Choose your companion'), { timeout: 4000 });
      fireEvent.press(result.getByTestId('onboarding-cat-mini-meowww'));
      fireEvent.press(result.getByTestId('onboarding-path-piano-basics'));
      fireEvent.press(result.getByTestId('onboarding-cat-path-next'));
      return result;
    }

    it('renders quick setup fields', async () => {
      const { getByText } = await goToStep5();
      expect(getByText('Quick Setup')).toBeTruthy();
      expect(getByText('Your experience')).toBeTruthy();
      expect(getByText('How will you play?')).toBeTruthy();
      expect(getByText('Your goal')).toBeTruthy();
    }, 20000);

    it('completes onboarding when all required fields are filled', async () => {
      const { getByTestId } = await goToStep5();

      fireEvent.press(getByTestId('onboarding-exp-beginner'));
      fireEvent.press(getByTestId('onboarding-input-touch'));
      fireEvent.press(getByTestId('onboarding-goal-songs'));
      fireEvent.changeText(getByTestId('onboarding-username-input'), 'testuser');

      // Wait for username check to complete
      await waitFor(() => {
        const finishBtn = getByTestId('onboarding-finish');
        expect(finishBtn.props.accessibilityState?.disabled).toBeFalsy();
      }, { timeout: 2000 });

      fireEvent.press(getByTestId('onboarding-finish'));
      expect(mockSettingsState.setHasCompletedOnboarding).toHaveBeenCalledWith(true);
      expect(mockGoBack).toHaveBeenCalled();
    }, 20000);
  });

  // ---- General ----

  it('renders the PlayFirstOnboarding screen', () => {
    const { getByTestId } = render(<PlayFirstOnboarding />);
    expect(getByTestId('play-first-onboarding')).toBeTruthy();
  });

  it('tracks analytics on mount', () => {
    render(<PlayFirstOnboarding />);
    const { analyticsEvents, funnels } = require('../../services/analytics/PostHog');
    expect(analyticsEvents.onboarding.started).toHaveBeenCalled();
    expect(funnels.onboarding.started).toHaveBeenCalled();
  });
});

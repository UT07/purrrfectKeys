/**
 * PlayScreen Tests
 *
 * Tests for the redesigned Neon Arcade Free Play screen:
 * - Landscape orientation lock on mount
 * - Single unified keyboard with octave arrows
 * - Tool sidebar with 7 tools
 * - Chord display toggle
 * - Song loading and song picker
 * - Recording controls via loop recorder widget
 * - Session stats and note display
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks (MUST come before component import)
// ---------------------------------------------------------------------------

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
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
    useFocusEffect: (cb: () => (() => void) | void) => {
      const cleanup = cb();
      if (typeof cleanup === 'function') cleanup();
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

// expo-screen-orientation is globally mocked in jest.setup.js
import * as ScreenOrientation from 'expo-screen-orientation';

// Mock audio engine
const mockPlayNote = jest.fn(() => ({
  note: 60,
  startTime: 0,
  release: jest.fn(),
}));
const mockReleaseNote = jest.fn();
const mockReleaseAllNotes = jest.fn();
const mockInitialize = jest.fn().mockResolvedValue(undefined);

jest.mock('../../audio/createAudioEngine', () => ({
  createAudioEngine: jest.fn(() => ({
    isReady: () => true,
    initialize: mockInitialize,
    playNote: mockPlayNote,
    releaseNote: mockReleaseNote,
    releaseAllNotes: mockReleaseAllNotes,
    playMetronomeClick: jest.fn(),
    dispose: jest.fn(),
  })),
}));

// Capture keyboard props
let capturedKeyboardProps: any = {};
jest.mock('../../components/Keyboard/Keyboard', () => ({
  Keyboard: (props: any) => {
    capturedKeyboardProps = props;
    const { View, Text } = require('react-native');
    return (
      <View testID={props.testID || 'mock-keyboard'}>
        <Text>Keyboard</Text>
      </View>
    );
  },
}));

// Mock VerticalPianoRoll
jest.mock('../../components/PianoRoll/VerticalPianoRoll', () => ({
  VerticalPianoRoll: (props: any) => {
    const { View } = require('react-native');
    return <View testID={props.testID || 'mock-vertical-piano-roll'} />;
  },
}));

// Mock SongReferencePicker
jest.mock('../../components/SongReferencePicker', () => ({
  SongReferencePicker: (props: any) => {
    const { View } = require('react-native');
    return props.visible ? <View testID="song-picker-modal" /> : null;
  },
}));

// Mock FreePlay components
jest.mock('../../components/FreePlay/ToolSidebar', () => ({
  ToolSidebar: (props: any) => {
    const { View } = require('react-native');
    return <View testID="tool-sidebar" {...props} />;
  },
}));
jest.mock('../../components/FreePlay/FloatingWidget', () => ({
  FloatingWidget: (props: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={props.testID}>
        <Text>{props.title}</Text>
        {props.children}
      </View>
    );
  },
}));
jest.mock('../../components/FreePlay/AuroraBackground', () => ({
  AuroraBackground: () => {
    const { View } = require('react-native');
    return <View testID="aurora-background" />;
  },
}));
jest.mock('../../components/FreePlay/OctaveArrows', () => ({
  OctaveArrows: (props: any) => {
    const { View } = require('react-native');
    return <View testID="octave-arrows" {...props} />;
  },
}));
jest.mock('../../components/FreePlay/ChordDisplay', () => ({
  ChordDisplay: (props: any) => {
    const { View } = require('react-native');
    return <View testID={props.testID || 'chord-display'} />;
  },
}));
jest.mock('../../components/FreePlay/MetronomeWidget', () => ({
  MetronomeWidget: () => {
    const { View } = require('react-native');
    return <View testID="metronome-widget" />;
  },
}));
jest.mock('../../components/FreePlay/KeySelectorWidget', () => ({
  KeySelectorWidget: () => {
    const { View } = require('react-native');
    return <View testID="key-selector-widget" />;
  },
  getScaleNotes: () => new Set<number>(),
}));
jest.mock('../../components/FreePlay/SessionStatsWidget', () => ({
  SessionStatsWidget: () => {
    const { View } = require('react-native');
    return <View testID="session-stats-widget" />;
  },
}));
jest.mock('../../components/FreePlay/LoopRecorderWidget', () => ({
  LoopRecorderWidget: () => {
    const { View } = require('react-native');
    return <View testID="loop-recorder-widget" />;
  },
}));
jest.mock('../../components/FreePlay/TempoTrainerWidget', () => ({
  TempoTrainerWidget: () => {
    const { View } = require('react-native');
    return <View testID="tempo-trainer-widget" />;
  },
}));

// Mock InputManager
jest.mock('../../input/InputManager', () => ({
  InputManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn(),
    onNoteEvent: jest.fn(() => jest.fn()),
    activeMethod: 'touch',
    getIsInitialized: () => true,
    getIsStarted: () => false,
    getTimingMultiplier: () => 1.0,
    getLatencyCompensationMs: () => 0,
  })),
  INPUT_TIMING_MULTIPLIERS: { midi: 1.0, touch: 1.0, mic: 1.5 },
  INPUT_LATENCY_COMPENSATION_MS: { midi: 0, touch: 20, mic: 100 },
}));

// Mock settingsStore
jest.mock('../../stores/settingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector: any) => selector({ preferredInputMethod: 'touch', selectedCatId: 'mini-meowww' }),
    { getState: () => ({ preferredInputMethod: 'touch', selectedCatId: 'mini-meowww' }) },
  ),
}));

// Mock songStore
const mockLoadSong = jest.fn();
jest.mock('../../stores/songStore', () => ({
  useSongStore: Object.assign(
    (selector: any) =>
      selector({
        summaries: [],
        isLoadingSummaries: false,
        loadSummaries: jest.fn(),
        currentSong: null,
        isLoadingSong: false,
        loadSong: mockLoadSong,
      }),
    { getState: () => ({ summaries: [], currentSong: null }) },
  ),
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => {
  const { View, Text } = require('react-native');
  return {
    MaterialCommunityIcons: (props: any) => (
      <View testID={`icon-${props.name}`}>
        <Text>{props.name}</Text>
      </View>
    ),
  };
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { PlayScreen } from '../PlayScreen';

// ===========================================================================
// Tests
// ===========================================================================

describe('PlayScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedKeyboardProps = {};
  });

  // -----------------------------------------------------------------------
  // Core rendering
  // -----------------------------------------------------------------------

  describe('Core rendering', () => {
    it('renders the play screen container', () => {
      const { getByTestId } = render(<PlayScreen />);
      expect(getByTestId('play-screen')).toBeTruthy();
    });

    it('shows "Free Play" title', () => {
      const { getByText } = render(<PlayScreen />);
      expect(getByText('Free Play')).toBeTruthy();
    });

    it('shows back button', () => {
      const { getByTestId } = render(<PlayScreen />);
      expect(getByTestId('freeplay-back')).toBeTruthy();
    });

    it('back button calls navigation.goBack', () => {
      const { getByTestId } = render(<PlayScreen />);
      fireEvent.press(getByTestId('freeplay-back'));
      expect(mockGoBack).toHaveBeenCalled();
    });

    it('locks to landscape on mount', () => {
      render(<PlayScreen />);
      expect(ScreenOrientation.lockAsync).toHaveBeenCalledWith(
        ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Unified keyboard
  // -----------------------------------------------------------------------

  describe('Unified keyboard', () => {
    it('renders a single keyboard', () => {
      const { getByTestId } = render(<PlayScreen />);
      expect(getByTestId('freeplay-keyboard')).toBeTruthy();
    });

    it('keyboard starts at C3 (MIDI 48) by default', () => {
      render(<PlayScreen />);
      expect(capturedKeyboardProps.startNote).toBe(48);
    });

    it('keyboard has 3 octaves', () => {
      render(<PlayScreen />);
      expect(capturedKeyboardProps.octaveCount).toBe(3);
    });

    it('keyboard is enabled with haptic and labels', () => {
      render(<PlayScreen />);
      expect(capturedKeyboardProps.enabled).toBe(true);
      expect(capturedKeyboardProps.hapticEnabled).toBe(true);
      expect(capturedKeyboardProps.showLabels).toBe(true);
    });

    it('keyboard has note event callbacks', () => {
      render(<PlayScreen />);
      expect(typeof capturedKeyboardProps.onNoteOn).toBe('function');
      expect(typeof capturedKeyboardProps.onNoteOff).toBe('function');
    });

    it('renders octave bar', () => {
      const { getByTestId } = render(<PlayScreen />);
      expect(getByTestId('freeplay-octave-bar')).toBeTruthy();
    });

    it('renders keyboard container', () => {
      const { getByTestId } = render(<PlayScreen />);
      expect(getByTestId('freeplay-keyboard-container')).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Tool sidebar
  // -----------------------------------------------------------------------

  describe('Tool sidebar', () => {
    it('renders tool sidebar', () => {
      const { getByTestId } = render(<PlayScreen />);
      expect(getByTestId('tool-sidebar')).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Visualization area
  // -----------------------------------------------------------------------

  describe('Visualization area', () => {
    it('renders aurora background', () => {
      const { getByTestId } = render(<PlayScreen />);
      expect(getByTestId('aurora-background')).toBeTruthy();
    });

    it('renders viz area', () => {
      const { getByTestId } = render(<PlayScreen />);
      expect(getByTestId('freeplay-viz-area')).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Note display
  // -----------------------------------------------------------------------

  describe('Note display', () => {
    it('renders note display container', () => {
      const { getByTestId } = render(<PlayScreen />);
      expect(getByTestId('freeplay-note-display-container')).toBeTruthy();
    });

    it('shows em dash when no note is pressed', () => {
      const { getByTestId } = render(<PlayScreen />);
      const display = getByTestId('freeplay-note-display');
      expect(display.props.children).toBe('\u2014');
    });
  });

  // -----------------------------------------------------------------------
  // Song reference
  // -----------------------------------------------------------------------

  describe('Song reference', () => {
    it('shows load song button', () => {
      const { getByTestId } = render(<PlayScreen />);
      expect(getByTestId('freeplay-load-song')).toBeTruthy();
    });

    it('opens song picker modal when button is pressed', () => {
      const { getByTestId } = render(<PlayScreen />);
      fireEvent.press(getByTestId('freeplay-load-song'));
      expect(getByTestId('song-picker-modal')).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Orientation toggle
  // -----------------------------------------------------------------------

  describe('Orientation toggle', () => {
    it('renders orientation toggle button', () => {
      const { getByTestId } = render(<PlayScreen />);
      expect(getByTestId('freeplay-orientation-toggle')).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Session stats
  // -----------------------------------------------------------------------

  describe('Session stats', () => {
    it('shows "0 notes" initially', () => {
      const { getByText } = render(<PlayScreen />);
      expect(getByText('0 notes')).toBeTruthy();
    });
  });
});

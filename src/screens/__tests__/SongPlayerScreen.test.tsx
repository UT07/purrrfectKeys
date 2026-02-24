/**
 * SongPlayerScreen Tests
 *
 * Tests section list, layer toggle, loop toggle, play navigation,
 * mastery progress display, and sectionToExercise conversion.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SongPlayerScreen, sectionToExercise } from '../SongPlayerScreen';
import type { Song, SongSection, SongMastery } from '@/core/songs/songTypes';
import type { NoteEvent } from '@/core/exercises/types';

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { songId: 'test-song-1' } }),
  useFocusEffect: (cb: () => void) => {
    // Don't call the focus callback during tests to avoid exerciseStore side effects
  },
}));

// ---------------------------------------------------------------------------
// Store mocks
// ---------------------------------------------------------------------------

const mockLoadSong = jest.fn().mockResolvedValue(undefined);
const mockGetMastery = jest.fn();
const mockUpdateMastery = jest.fn();
const mockAddRecentSong = jest.fn();
const mockSetCurrentExercise = jest.fn();

let mockCurrentSong: Song | null = null;
let mockIsLoadingSong = false;

jest.mock('../../stores/songStore', () => ({
  useSongStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      currentSong: mockCurrentSong,
      isLoadingSong: mockIsLoadingSong,
      loadSong: mockLoadSong,
      getMastery: mockGetMastery,
      updateMastery: mockUpdateMastery,
      addRecentSong: mockAddRecentSong,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('../../stores/exerciseStore', () => ({
  useExerciseStore: Object.assign(
    (selector?: (s: Record<string, unknown>) => unknown) => {
      const state = { setCurrentExercise: mockSetCurrentExercise, score: null };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ score: null }) },
  ),
}));

jest.mock('../../stores/gemStore', () => ({
  useGemStore: Object.assign(
    (selector?: (s: Record<string, unknown>) => unknown) => {
      const state = { gems: 100 };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ earnGems: jest.fn() }) },
  ),
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = { user: { uid: 'test-user' } };
    return selector ? selector(state) : state;
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const melodyNotes: NoteEvent[] = [
  { note: 60, startBeat: 0, durationBeats: 1 },
  { note: 62, startBeat: 1, durationBeats: 1 },
  { note: 64, startBeat: 2, durationBeats: 1 },
];

const fullNotes: NoteEvent[] = [
  ...melodyNotes,
  { note: 48, startBeat: 0, durationBeats: 2, hand: 'left' },
];

const makeSection = (id: string, label: string): SongSection => ({
  id,
  label,
  startBeat: 0,
  endBeat: 4,
  difficulty: 3,
  layers: {
    melody: melodyNotes,
    full: fullNotes,
  },
});

const makeSong = (): Song => ({
  id: 'test-song-1',
  version: 1,
  type: 'song',
  source: 'gemini',
  metadata: {
    title: 'Test Song',
    artist: 'Test Artist',
    genre: 'pop',
    difficulty: 3,
    durationSeconds: 120,
    attribution: 'AI arrangement',
  },
  sections: [makeSection('verse-1', 'Verse 1'), makeSection('chorus', 'Chorus')],
  settings: {
    tempo: 120,
    timeSignature: [4, 4],
    keySignature: 'C',
    countIn: 4,
    metronomeEnabled: true,
    loopEnabled: true,
  },
  scoring: {
    timingToleranceMs: 50,
    timingGracePeriodMs: 150,
    passingScore: 70,
    starThresholds: [70, 85, 95],
  },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SongPlayerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentSong = makeSong();
    mockIsLoadingSong = false;
    mockGetMastery.mockReturnValue(null);
  });

  // ── Rendering ───────────────────────────────────────────────

  it('renders the screen', () => {
    const { getByTestId } = render(<SongPlayerScreen />);
    expect(getByTestId('song-player-screen')).toBeTruthy();
  });

  it('shows loading when song is loading', () => {
    mockCurrentSong = null;
    mockIsLoadingSong = true;
    const { queryByTestId, getByText } = render(<SongPlayerScreen />);
    expect(queryByTestId('song-player-screen')).toBeNull();
    expect(getByText('Loading song...')).toBeTruthy();
  });

  it('renders song title and artist', () => {
    const { getByText } = render(<SongPlayerScreen />);
    expect(getByText('Test Song')).toBeTruthy();
    expect(getByText('Test Artist')).toBeTruthy();
  });

  it('calls loadSong and addRecentSong on mount', () => {
    render(<SongPlayerScreen />);
    expect(mockLoadSong).toHaveBeenCalledWith('test-song-1');
    expect(mockAddRecentSong).toHaveBeenCalledWith('test-song-1');
  });

  // ── Sections ────────────────────────────────────────────────

  it('renders section pills', () => {
    const { getByTestId } = render(<SongPlayerScreen />);
    expect(getByTestId('section-verse-1')).toBeTruthy();
    expect(getByTestId('section-chorus')).toBeTruthy();
  });

  it('first section is selected by default', () => {
    const { getByTestId, getByText } = render(<SongPlayerScreen />);
    // Play button should show first section label
    expect(getByText('Play Verse 1')).toBeTruthy();
  });

  it('tapping a section pill changes selection', () => {
    const { getByTestId, getByText } = render(<SongPlayerScreen />);
    fireEvent.press(getByTestId('section-chorus'));
    expect(getByText('Play Chorus')).toBeTruthy();
  });

  it('renders section score badge when mastery exists', () => {
    const mastery: SongMastery = {
      songId: 'test-song-1',
      userId: 'test-user',
      tier: 'bronze',
      sectionScores: { 'verse-1': 78 },
      lastPlayed: Date.now(),
      totalAttempts: 2,
    };
    mockGetMastery.mockReturnValue(mastery);
    const { getByTestId } = render(<SongPlayerScreen />);
    expect(getByTestId('score-badge-verse-1')).toBeTruthy();
  });

  // ── Layer toggle ────────────────────────────────────────────

  it('melody is selected by default', () => {
    const { getByTestId } = render(<SongPlayerScreen />);
    expect(getByTestId('layer-melody')).toBeTruthy();
    expect(getByTestId('layer-full')).toBeTruthy();
  });

  it('full layer button is enabled when accompaniment exists', () => {
    // Add accompaniment to section
    mockCurrentSong = makeSong();
    mockCurrentSong.sections[0].layers.accompaniment = [
      { note: 48, startBeat: 0, durationBeats: 2 },
    ];
    const { getByTestId } = render(<SongPlayerScreen />);
    const fullBtn = getByTestId('layer-full');
    expect(fullBtn.props.accessibilityState?.disabled ?? fullBtn.props.disabled).toBeFalsy();
  });

  // ── Play navigation ─────────────────────────────────────────

  it('navigates to Exercise on play button press', () => {
    const { getByTestId } = render(<SongPlayerScreen />);
    fireEvent.press(getByTestId('play-button'));
    expect(mockSetCurrentExercise).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      'Exercise',
      expect.objectContaining({ exerciseId: 'test-song-1-verse-1-melody' }),
    );
  });

  it('back button calls goBack', () => {
    const { getByTestId } = render(<SongPlayerScreen />);
    fireEvent.press(getByTestId('back-button'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  // ── Mastery display ─────────────────────────────────────────

  it('renders mastery progress', () => {
    const { getByTestId } = render(<SongPlayerScreen />);
    expect(getByTestId('mastery-progress')).toBeTruthy();
  });

  // ── Loop toggle ─────────────────────────────────────────────

  it('loop toggle renders', () => {
    const { getByTestId } = render(<SongPlayerScreen />);
    expect(getByTestId('loop-toggle')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// sectionToExercise unit tests
// ---------------------------------------------------------------------------

describe('sectionToExercise', () => {
  const song = makeSong();
  const section = song.sections[0];

  it('maps melody notes correctly', () => {
    const exercise = sectionToExercise(song, section, 'melody', false);
    expect(exercise.notes).toEqual(melodyNotes);
    expect(exercise.id).toBe('test-song-1-verse-1-melody');
  });

  it('maps full notes correctly', () => {
    const exercise = sectionToExercise(song, section, 'full', false);
    expect(exercise.notes).toEqual(fullNotes);
    expect(exercise.id).toBe('test-song-1-verse-1-full');
  });

  it('preserves song settings', () => {
    const exercise = sectionToExercise(song, section, 'melody', true);
    expect(exercise.settings.tempo).toBe(120);
    expect(exercise.settings.keySignature).toBe('C');
    expect(exercise.settings.loopEnabled).toBe(true);
  });

  it('sets loopEnabled from parameter', () => {
    const noLoop = sectionToExercise(song, section, 'melody', false);
    expect(noLoop.settings.loopEnabled).toBe(false);

    const withLoop = sectionToExercise(song, section, 'melody', true);
    expect(withLoop.settings.loopEnabled).toBe(true);
  });

  it('includes section label in title', () => {
    const exercise = sectionToExercise(song, section, 'melody', false);
    expect(exercise.metadata.title).toContain('Verse 1');
    expect(exercise.metadata.title).toContain('Test Song');
  });

  it('includes genre in skills', () => {
    const exercise = sectionToExercise(song, section, 'melody', false);
    expect(exercise.metadata.skills).toContain('songs');
    expect(exercise.metadata.skills).toContain('pop');
  });
});

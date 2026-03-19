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
import type { NoteEvent, ExerciseScore } from '@/core/exercises/types';

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

// focusEffectCallback is set when useFocusEffect is called, allowing
// individual tests to invoke it manually to simulate returning from Exercise.
let focusEffectCallback: (() => void) | null = null;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { songId: 'test-song-1' } }),
  useFocusEffect: (cb: () => void) => {
    // Store the callback so tier-up tests can trigger it manually.
    // Default render tests rely on no side-effects (score is null by default).
    focusEffectCallback = cb;
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

let mockLastCompletedScore: ExerciseScore | null = null;
const mockClearLastCompletedScore = jest.fn();

jest.mock('../../stores/exerciseStore', () => ({
  useExerciseStore: Object.assign(
    (selector?: (s: Record<string, unknown>) => unknown) => {
      const state = { setCurrentExercise: mockSetCurrentExercise, score: null };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        score: null,
        lastCompletedScore: mockLastCompletedScore,
        clearLastCompletedScore: mockClearLastCompletedScore,
      }),
    },
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

const mockAddEvolutionXp = jest.fn();

jest.mock('../../stores/catEvolutionStore', () => ({
  useCatEvolutionStore: Object.assign(
    (selector?: (s: Record<string, unknown>) => unknown) => {
      const state = {};
      return selector ? selector(state) : state;
    },
    { getState: () => ({ addEvolutionXp: mockAddEvolutionXp }) },
  ),
}));

jest.mock('../../stores/settingsStore', () => ({
  useSettingsStore: Object.assign(
    (selector?: (s: Record<string, unknown>) => unknown) => {
      const state = { selectedCatId: 'mini-meowww' };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ selectedCatId: 'mini-meowww' }) },
  ),
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
    mockLastCompletedScore = null;
    focusEffectCallback = null;
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
    const { getByText } = render(<SongPlayerScreen />);
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

  // ── Mastery tier-up: cat XP ──────────────────────────────────

  it('awards cat XP when mastery tier increases to bronze', () => {
    // Song has no prior mastery (none → bronze tier-up)
    mockGetMastery.mockReturnValue(null);

    const { getByTestId } = render(<SongPlayerScreen />);

    // Select Full Song mode so all sections are scored at once
    fireEvent.press(getByTestId('section-full-song'));

    // Step 1: press Play to set playContextRef.current inside the component
    fireEvent.press(getByTestId('play-button'));

    // Step 2: set last score so the focus callback processes it
    // Score of 72 → bronze (all sections scored at 72, min score >= 70)
    mockLastCompletedScore = {
      overall: 72,
      stars: 1,
      details: [],
      breakdown: { accuracy: 72, timing: 72, completeness: 72, extraNotes: 100, duration: 72 },
      perfectNotes: 0,
      goodNotes: 5,
      okNotes: 0,
      missedNotes: 0,
      extraNotes: 0,
      xpEarned: 10,
      isNewHighScore: true,
      isPassed: true,
    } as ExerciseScore;

    // Step 3: simulate returning from Exercise screen (useFocusEffect fires)
    expect(focusEffectCallback).not.toBeNull();
    focusEffectCallback!();

    expect(mockAddEvolutionXp).toHaveBeenCalledWith('mini-meowww', 50);
  });

  it('awards correct cat XP amounts per tier', () => {
    // Gold and Platinum require layer='full'. Silver only requires melody.
    // previousSectionScores are set to reach the tier below, so a tier-up occurs.
    const tierXpMap: Array<{
      tier: string;
      xp: number;
      score: number;
      needFullLayer: boolean;
      prevSectionScores: Record<string, number>;
    }> = [
      { tier: 'silver', xp: 100, score: 82, needFullLayer: false, prevSectionScores: { 'verse-1': 72, chorus: 72 } },
      { tier: 'gold', xp: 150, score: 91, needFullLayer: true, prevSectionScores: { 'verse-1': 82, chorus: 82 } },
      { tier: 'platinum', xp: 200, score: 97, needFullLayer: true, prevSectionScores: { 'verse-1': 91, chorus: 91 } },
    ];

    for (const { tier, xp, score, needFullLayer, prevSectionScores } of tierXpMap) {
      jest.clearAllMocks();
      mockLastCompletedScore = null;
      focusEffectCallback = null;
      mockCurrentSong = makeSong();

      // Pre-existing mastery at the tier below so a tier-up occurs
      const previousTierMap: Record<string, string> = {
        silver: 'bronze',
        gold: 'silver',
        platinum: 'gold',
      };
      const previousTier = previousTierMap[tier];
      mockGetMastery.mockReturnValue({
        songId: 'test-song-1',
        userId: 'test-user',
        tier: previousTier,
        sectionScores: prevSectionScores,
        lastPlayed: Date.now() - 10000,
        totalAttempts: 3,
      } as SongMastery);

      const { getByTestId } = render(<SongPlayerScreen />);

      // Select Full Song mode so all sections are scored simultaneously
      fireEvent.press(getByTestId('section-full-song'));

      // Gold/Platinum require layer='full' — toggle the layer button
      if (needFullLayer) {
        fireEvent.press(getByTestId('layer-full'));
      }

      // Press Play to set playContextRef
      fireEvent.press(getByTestId('play-button'));

      mockLastCompletedScore = {
        overall: score,
        stars: 3,
        details: [],
        breakdown: { accuracy: score, timing: score, completeness: score, extraNotes: 100, duration: score },
        perfectNotes: 5,
        goodNotes: 0,
        okNotes: 0,
        missedNotes: 0,
        extraNotes: 0,
        xpEarned: 30,
        isNewHighScore: true,
        isPassed: true,
      } as ExerciseScore;

      expect(focusEffectCallback).not.toBeNull();
      focusEffectCallback!();

      expect(mockAddEvolutionXp).toHaveBeenCalledWith('mini-meowww', xp);
    }
  });

  it('does NOT award cat XP when tier does not increase', () => {
    // Already at bronze, score stays at bronze — no tier-up
    mockGetMastery.mockReturnValue({
      songId: 'test-song-1',
      userId: 'test-user',
      tier: 'bronze',
      sectionScores: { 'verse-1': 72, chorus: 72 },
      lastPlayed: Date.now() - 10000,
      totalAttempts: 2,
    } as SongMastery);

    const { getByTestId } = render(<SongPlayerScreen />);

    // Full Song mode — both sections will be scored at 72 → still bronze, no upgrade
    fireEvent.press(getByTestId('section-full-song'));

    // Press Play to set playContextRef
    fireEvent.press(getByTestId('play-button'));

    mockLastCompletedScore = {
      overall: 72,
      stars: 1,
      details: [],
      breakdown: { accuracy: 72, timing: 72, completeness: 72, extraNotes: 100, duration: 72 },
      perfectNotes: 0,
      goodNotes: 5,
      okNotes: 0,
      missedNotes: 0,
      extraNotes: 0,
      xpEarned: 10,
      isNewHighScore: false,
      isPassed: true,
    } as ExerciseScore;

    expect(focusEffectCallback).not.toBeNull();
    focusEffectCallback!();

    expect(mockAddEvolutionXp).not.toHaveBeenCalled();
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

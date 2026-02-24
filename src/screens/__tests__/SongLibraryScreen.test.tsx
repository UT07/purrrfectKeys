/**
 * SongLibraryScreen Tests
 *
 * Tests genre pills, difficulty filters, song cards, mastery badges,
 * FAB, request modal, rate limiting, and navigation.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { SongLibraryScreen } from '../SongLibraryScreen';
import type { SongSummary, SongMastery } from '@/core/songs/songTypes';

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// ---------------------------------------------------------------------------
// Store mocks
// ---------------------------------------------------------------------------

const mockSetFilter = jest.fn();
const mockLoadSummaries = jest.fn().mockResolvedValue(undefined);
const mockLoadMoreSummaries = jest.fn();
const mockGetMastery = jest.fn();
const mockRequestSong = jest.fn();
const mockCanRequestSong = jest.fn().mockReturnValue(true);

let mockSummaries: SongSummary[] = [];
let mockIsLoadingSummaries = false;
let mockIsGeneratingSong = false;
let mockGenerationError: string | null = null;
let mockFilter: Record<string, unknown> = {};

jest.mock('../../stores/songStore', () => ({
  useSongStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      summaries: mockSummaries,
      isLoadingSummaries: mockIsLoadingSummaries,
      filter: mockFilter,
      isGeneratingSong: mockIsGeneratingSong,
      generationError: mockGenerationError,
      setFilter: mockSetFilter,
      loadSummaries: mockLoadSummaries,
      loadMoreSummaries: mockLoadMoreSummaries,
      getMastery: mockGetMastery,
      requestSong: mockRequestSong,
      canRequestSong: mockCanRequestSong,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('../../stores/gemStore', () => ({
  useGemStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = { gems: 250 };
    return selector ? selector(state) : state;
  },
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = { user: { uid: 'test-user-1' } };
    return selector ? selector(state) : state;
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeSummary = (overrides: Partial<SongSummary> = {}): SongSummary => ({
  id: 'song-1',
  metadata: {
    title: 'Fur Elise',
    artist: 'Beethoven',
    genre: 'classical',
    difficulty: 3,
    durationSeconds: 120,
    attribution: 'Public domain',
  },
  settings: {
    tempo: 120,
    timeSignature: [4, 4] as [number, number],
    keySignature: 'Am',
  },
  sectionCount: 3,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SongLibraryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSummaries = [];
    mockIsLoadingSummaries = false;
    mockIsGeneratingSong = false;
    mockGenerationError = null;
    mockFilter = {};
    mockGetMastery.mockReturnValue(null);
    mockCanRequestSong.mockReturnValue(true);
  });

  // ── Rendering ───────────────────────────────────────────────

  it('renders the screen', () => {
    const { getByTestId } = render(<SongLibraryScreen />);
    expect(getByTestId('song-library-screen')).toBeTruthy();
  });

  it('renders genre pills', () => {
    const { getByTestId } = render(<SongLibraryScreen />);
    expect(getByTestId('genre-all')).toBeTruthy();
    expect(getByTestId('genre-classical')).toBeTruthy();
    expect(getByTestId('genre-folk')).toBeTruthy();
    expect(getByTestId('genre-pop')).toBeTruthy();
    expect(getByTestId('genre-film')).toBeTruthy();
    expect(getByTestId('genre-game')).toBeTruthy();
    expect(getByTestId('genre-holiday')).toBeTruthy();
  });

  it('renders difficulty pills', () => {
    const { getByTestId } = render(<SongLibraryScreen />);
    for (let i = 1; i <= 5; i++) {
      expect(getByTestId(`difficulty-${i}`)).toBeTruthy();
    }
  });

  it('renders search input', () => {
    const { getByTestId } = render(<SongLibraryScreen />);
    expect(getByTestId('search-input')).toBeTruthy();
  });

  it('renders FAB', () => {
    const { getByTestId } = render(<SongLibraryScreen />);
    expect(getByTestId('request-fab')).toBeTruthy();
  });

  // ── Song cards ──────────────────────────────────────────────

  it('renders song cards with title and artist', () => {
    mockSummaries = [makeSummary()];
    const { getByText } = render(<SongLibraryScreen />);
    expect(getByText('Fur Elise')).toBeTruthy();
    expect(getByText('Beethoven')).toBeTruthy();
  });

  it('renders mastery badge when song has mastery', () => {
    mockSummaries = [makeSummary()];
    const mastery: SongMastery = {
      songId: 'song-1',
      userId: 'test-user-1',
      tier: 'gold',
      sectionScores: { 'section-0': 92 },
      lastPlayed: Date.now(),
      totalAttempts: 3,
    };
    mockGetMastery.mockReturnValue(mastery);
    const { getByTestId } = render(<SongLibraryScreen />);
    expect(getByTestId('mastery-badge')).toBeTruthy();
  });

  it('renders duration formatted', () => {
    mockSummaries = [makeSummary({ metadata: { ...makeSummary().metadata, durationSeconds: 185 } })];
    const { getByText } = render(<SongLibraryScreen />);
    expect(getByText('3:05')).toBeTruthy();
  });

  // ── Filters ─────────────────────────────────────────────────

  it('calls setFilter when genre pill is tapped', () => {
    const { getByTestId } = render(<SongLibraryScreen />);
    fireEvent.press(getByTestId('genre-classical'));
    expect(mockSetFilter).toHaveBeenCalledWith({ genre: 'classical' });
  });

  it('calls setFilter when difficulty pill is tapped', () => {
    const { getByTestId } = render(<SongLibraryScreen />);
    fireEvent.press(getByTestId('difficulty-3'));
    expect(mockSetFilter).toHaveBeenCalledWith({ difficulty: 3 });
  });

  it('debounces search input', async () => {
    jest.useFakeTimers();
    const { getByTestId } = render(<SongLibraryScreen />);
    fireEvent.changeText(getByTestId('search-input'), 'beethoven');

    // Before debounce fires
    expect(mockSetFilter).not.toHaveBeenCalledWith(
      expect.objectContaining({ searchQuery: 'beethoven' }),
    );

    // After debounce
    act(() => { jest.advanceTimersByTime(500); });
    expect(mockSetFilter).toHaveBeenCalledWith({ searchQuery: 'beethoven' });
    jest.useRealTimers();
  });

  // ── Navigation ──────────────────────────────────────────────

  it('navigates to SongPlayer on song card press', () => {
    mockSummaries = [makeSummary()];
    const { getByTestId } = render(<SongLibraryScreen />);
    fireEvent.press(getByTestId('song-card-song-1'));
    expect(mockNavigate).toHaveBeenCalledWith('SongPlayer', { songId: 'song-1' });
  });

  // ── Request modal ───────────────────────────────────────────

  it('opens request modal on FAB press', () => {
    const { getByTestId } = render(<SongLibraryScreen />);
    fireEvent.press(getByTestId('request-fab'));
    expect(getByTestId('request-modal')).toBeTruthy();
  });

  it('shows rate limit warning when canRequestSong is false', () => {
    mockCanRequestSong.mockReturnValue(false);
    const { getByTestId } = render(<SongLibraryScreen />);
    fireEvent.press(getByTestId('request-fab'));
    expect(getByTestId('rate-limit-warning')).toBeTruthy();
  });

  it('submit button is disabled when rate limited', () => {
    mockCanRequestSong.mockReturnValue(false);
    const { getByTestId } = render(<SongLibraryScreen />);
    fireEvent.press(getByTestId('request-fab'));
    const submitBtn = getByTestId('request-submit-button');
    expect(submitBtn.props.accessibilityState?.disabled ?? submitBtn.props.disabled).toBeTruthy();
  });

  // ── Empty / loading states ──────────────────────────────────

  it('shows empty state when no songs', () => {
    mockSummaries = [];
    const { getByText } = render(<SongLibraryScreen />);
    expect(getByText('No songs found')).toBeTruthy();
  });

  it('renders multiple song cards', () => {
    mockSummaries = [
      makeSummary({ id: 'song-a', metadata: { ...makeSummary().metadata, title: 'Song A' } }),
      makeSummary({ id: 'song-b', metadata: { ...makeSummary().metadata, title: 'Song B' } }),
    ];
    const { getByText } = render(<SongLibraryScreen />);
    expect(getByText('Song A')).toBeTruthy();
    expect(getByText('Song B')).toBeTruthy();
  });
});

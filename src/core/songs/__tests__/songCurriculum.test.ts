import {
  songToExercise,
  songToExercises,
  isSongUnlocked,
  getSongsForSkillLevel,
  SONG_SKILL_REQUIREMENTS,
} from '../songCurriculum';
import type { Song } from '../songTypes';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 'test-song-1',
    version: 1,
    type: 'song',
    source: 'gemini',
    metadata: {
      title: 'Test Song',
      artist: 'Test Artist',
      genre: 'pop',
      difficulty: 2,
      durationSeconds: 60,
      attribution: 'Test attribution',
    },
    sections: [
      {
        id: 'section-0',
        label: 'Verse',
        startBeat: 0,
        endBeat: 16,
        difficulty: 2,
        layers: {
          melody: [
            { note: 60, startBeat: 0, durationBeats: 1 },
            { note: 62, startBeat: 1, durationBeats: 1 },
            { note: 64, startBeat: 2, durationBeats: 1 },
            { note: 65, startBeat: 3, durationBeats: 1 },
          ],
          full: [
            { note: 60, startBeat: 0, durationBeats: 1 },
            { note: 62, startBeat: 1, durationBeats: 1 },
            { note: 64, startBeat: 2, durationBeats: 1 },
            { note: 65, startBeat: 3, durationBeats: 1 },
            { note: 48, startBeat: 0, durationBeats: 4 },
          ],
        },
      },
      {
        id: 'section-1',
        label: 'Chorus',
        startBeat: 16,
        endBeat: 32,
        difficulty: 3,
        layers: {
          melody: [
            { note: 67, startBeat: 16, durationBeats: 2 },
            { note: 72, startBeat: 18, durationBeats: 2 },
          ],
          full: [
            { note: 67, startBeat: 16, durationBeats: 2 },
            { note: 72, startBeat: 18, durationBeats: 2 },
          ],
        },
      },
    ],
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
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('songToExercise', () => {
  it('converts first section by default', () => {
    const song = makeSong();
    const exercise = songToExercise(song);

    expect(exercise.id).toBe('song-test-song-1-s0');
    expect(exercise.metadata.title).toContain('Test Song');
    expect(exercise.metadata.title).toContain('Verse');
    expect(exercise.notes).toHaveLength(4);
    expect(exercise.settings.tempo).toBe(120);
    expect(exercise.type).toBe('play');
  });

  it('converts specific section by index', () => {
    const song = makeSong();
    const exercise = songToExercise(song, 1);

    expect(exercise.id).toBe('song-test-song-1-s1');
    expect(exercise.metadata.title).toContain('Chorus');
    expect(exercise.notes).toHaveLength(2);
  });

  it('uses full layer when specified', () => {
    const song = makeSong();
    const exercise = songToExercise(song, 0, 'full');

    expect(exercise.notes).toHaveLength(5); // melody + bass
  });

  it('preserves scoring config from song', () => {
    const song = makeSong();
    const exercise = songToExercise(song);

    expect(exercise.scoring.passingScore).toBe(70);
    expect(exercise.scoring.starThresholds).toEqual([70, 85, 95]);
  });
});

describe('songToExercises', () => {
  it('creates one exercise per section', () => {
    const song = makeSong();
    const exercises = songToExercises(song);

    expect(exercises).toHaveLength(2);
    expect(exercises[0].id).toBe('song-test-song-1-s0');
    expect(exercises[1].id).toBe('song-test-song-1-s1');
  });
});

describe('isSongUnlocked', () => {
  it('difficulty 1 songs are always unlocked', () => {
    const song = makeSong({ metadata: { ...makeSong().metadata, difficulty: 1 } });
    expect(isSongUnlocked(song, [])).toBe(true);
  });

  it('difficulty 2 requires basic skills', () => {
    const song = makeSong({ metadata: { ...makeSong().metadata, difficulty: 2 } });
    const requiredSkills = SONG_SKILL_REQUIREMENTS[2];

    expect(isSongUnlocked(song, [])).toBe(false);
    expect(isSongUnlocked(song, requiredSkills)).toBe(true);
  });

  it('partial skills insufficient', () => {
    const song = makeSong({ metadata: { ...makeSong().metadata, difficulty: 3 } });
    expect(isSongUnlocked(song, ['rh-cde'])).toBe(false);
  });
});

describe('getSongsForSkillLevel', () => {
  it('returns only unlocked songs', () => {
    const songs = [
      makeSong({ id: 'easy', metadata: { ...makeSong().metadata, difficulty: 1 } }),
      makeSong({ id: 'hard', metadata: { ...makeSong().metadata, difficulty: 5 } }),
    ];

    const result = getSongsForSkillLevel(songs, []);
    expect(result.map((s) => s.id)).toContain('easy');
    expect(result.map((s) => s.id)).not.toContain('hard');
  });

  it('excludes recently played songs', () => {
    const songs = [
      makeSong({ id: 'song-a', metadata: { ...makeSong().metadata, difficulty: 1 } }),
      makeSong({ id: 'song-b', metadata: { ...makeSong().metadata, difficulty: 1 } }),
    ];

    const result = getSongsForSkillLevel(songs, [], new Set(['song-a']));
    expect(result.map((s) => s.id)).not.toContain('song-a');
    expect(result.map((s) => s.id)).toContain('song-b');
  });

  it('respects limit', () => {
    const songs = Array.from({ length: 20 }, (_, i) =>
      makeSong({ id: `song-${i}`, metadata: { ...makeSong().metadata, difficulty: 1 } })
    );

    const result = getSongsForSkillLevel(songs, [], new Set(), 3);
    expect(result).toHaveLength(3);
  });
});

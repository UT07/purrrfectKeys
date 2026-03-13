/**
 * Song-Curriculum Integration
 *
 * Bridges the Song Library with the Curriculum Engine:
 * - songToExercise() converts a Song section into a playable Exercise
 * - getSongsForSkillLevel() returns songs appropriate for current mastery
 * - SONG_SKILL_REQUIREMENTS maps difficulty tiers to required skills
 *
 * Pure TypeScript — no React imports.
 */

import type { Exercise, NoteEvent } from '../exercises/types';
import type { Song, SongGenre } from './songTypes';

// ---------------------------------------------------------------------------
// Skill requirements per song difficulty
// ---------------------------------------------------------------------------

/**
 * Maps song difficulty to the skills a learner should have mastered
 * before attempting songs at that level.
 */
export const SONG_SKILL_REQUIREMENTS: Record<number, string[]> = {
  1: [], // Beginner songs — no prerequisites
  2: ['find-middle-c', 'keyboard-geography', 'white-keys', 'rh-cde'],
  3: ['rh-cdefg', 'c-position-review', 'lh-scale-descending', 'steady-bass'],
  4: ['both-hands-review', 'scale-review', 'beginner-songs'],
  5: ['intermediate-songs', 'find-black-keys', 'half-steps-whole-steps'],
};

/**
 * Maps song genres to relevant skill categories for curriculum weighting.
 */
export const GENRE_SKILL_AFFINITY: Record<SongGenre, string[]> = {
  classical: ['scales', 'arpeggios', 'expression', 'sight-reading'],
  pop: ['chords', 'rhythm', 'note-finding'],
  film: ['expression', 'note-finding', 'rhythm'],
  folk: ['note-finding', 'rhythm', 'hand-independence'],
  game: ['rhythm', 'note-finding', 'scales'],
  holiday: ['note-finding', 'rhythm'],
  jazz: ['chords', 'rhythm', 'expression', 'arpeggios'],
  blues: ['chords', 'rhythm', 'expression'],
  kids: ['note-finding', 'rhythm'],
  hymn: ['chords', 'note-finding', 'expression'],
};

// ---------------------------------------------------------------------------
// Song → Exercise conversion
// ---------------------------------------------------------------------------

/**
 * Convert a Song (or one of its sections) into a playable Exercise object.
 *
 * This enables songs to appear as lesson exercises in the curriculum,
 * scored the same way as regular exercises.
 *
 * @param song - The full Song object
 * @param sectionIndex - Which section to play (default: 0 = first section)
 * @param layer - Which layer ('melody' or 'full', default: 'melody')
 */
export function songToExercise(
  song: Song,
  sectionIndex: number = 0,
  layer: 'melody' | 'full' = 'melody',
): Exercise {
  const section = song.sections[sectionIndex] ?? song.sections[0];
  const notes: NoteEvent[] = section.layers[layer] ?? section.layers.melody;

  const sectionLabel = section.label || `Section ${sectionIndex + 1}`;

  return {
    id: `song-${song.id}-s${sectionIndex}`,
    version: song.version,
    type: 'play',
    metadata: {
      title: `${song.metadata.title} — ${sectionLabel}`,
      description: `Play "${song.metadata.title}" by ${song.metadata.artist}. ${song.metadata.attribution}`,
      difficulty: section.difficulty,
      estimatedMinutes: Math.max(1, Math.round(song.metadata.durationSeconds / 60)),
      skills: skillsForSong(song),
      prerequisites: [],
    },
    settings: {
      tempo: song.settings.tempo,
      timeSignature: song.settings.timeSignature,
      keySignature: song.settings.keySignature,
      countIn: song.settings.countIn,
      metronomeEnabled: song.settings.metronomeEnabled,
      loopEnabled: true,
    },
    notes,
    scoring: {
      timingToleranceMs: song.scoring.timingToleranceMs,
      timingGracePeriodMs: song.scoring.timingGracePeriodMs,
      passingScore: song.scoring.passingScore,
      starThresholds: song.scoring.starThresholds,
    },
    hints: {
      beforeStart: `Listen to the ${sectionLabel.toLowerCase()} first, then play along!`,
      commonMistakes: [],
      successMessage: `Great performance of "${song.metadata.title}"!`,
    },
    display: {
      showFingerNumbers: false,
      showNoteNames: song.metadata.difficulty <= 2,
      highlightHands: true,
      showPianoRoll: true,
    },
  };
}

/**
 * Convert ALL sections of a song into separate exercises (for full-song play).
 */
export function songToExercises(
  song: Song,
  layer: 'melody' | 'full' = 'melody',
): Exercise[] {
  return song.sections.map((_, idx) => songToExercise(song, idx, layer));
}

// ---------------------------------------------------------------------------
// Song filtering for curriculum
// ---------------------------------------------------------------------------

/**
 * Check if a song is playable given the learner's mastered skills.
 */
export function isSongUnlocked(
  song: Song,
  masteredSkills: string[],
): boolean {
  const required = SONG_SKILL_REQUIREMENTS[song.metadata.difficulty] ?? [];
  if (required.length === 0) return true;

  const masteredSet = new Set(masteredSkills);
  return required.every((skill) => masteredSet.has(skill));
}

/**
 * Get songs appropriate for the learner's current skill level.
 *
 * @param allSongs - All available songs
 * @param masteredSkills - Skills the learner has mastered
 * @param recentSongIds - Song IDs recently played (to avoid repeats)
 * @param limit - Max songs to return
 */
export function getSongsForSkillLevel(
  allSongs: Song[],
  masteredSkills: string[],
  recentSongIds: Set<string> = new Set(),
  limit: number = 5,
): Song[] {
  return allSongs
    .filter((song) => isSongUnlocked(song, masteredSkills))
    .filter((song) => !recentSongIds.has(song.id))
    .sort((a, b) => {
      // Prefer songs at or slightly above current difficulty
      const maxDifficulty = masteredSkills.length > 20 ? 4 : masteredSkills.length > 10 ? 3 : 2;
      const aDist = Math.abs(a.metadata.difficulty - maxDifficulty);
      const bDist = Math.abs(b.metadata.difficulty - maxDifficulty);
      return aDist - bDist;
    })
    .slice(0, limit);
}

/**
 * Get a song recommendation for a specific genre, matched to skill level.
 */
export function getSongForGenre(
  allSongs: Song[],
  genre: SongGenre,
  masteredSkills: string[],
): Song | null {
  const eligible = allSongs
    .filter((s) => s.metadata.genre === genre && isSongUnlocked(s, masteredSkills));

  if (eligible.length === 0) return null;

  // Pick from middle of difficulty range for best challenge
  const sorted = eligible.sort((a, b) => a.metadata.difficulty - b.metadata.difficulty);
  return sorted[Math.floor(sorted.length / 2)];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive skill tags from a song for exercise metadata.
 */
function skillsForSong(song: Song): string[] {
  const skills: string[] = [];

  // Genre-based skills
  const genreSkills = GENRE_SKILL_AFFINITY[song.metadata.genre] ?? [];
  skills.push(...genreSkills.slice(0, 2));

  // Note range based
  const allNotes = song.sections.flatMap((s) => s.layers.melody.map((n) => n.note));
  if (allNotes.length > 0) {
    const minNote = Math.min(...allNotes);
    const maxNote = Math.max(...allNotes);

    if (minNote < 55) skills.push('left-hand');
    if (maxNote > 65) skills.push('right-hand');
    if (minNote < 55 && maxNote > 65) skills.push('both-hands');

    // Check for accidentals (black keys)
    const hasBlackKeys = allNotes.some((n) => [1, 3, 6, 8, 10].includes(n % 12));
    if (hasBlackKeys) skills.push('black-keys');
  }

  // Difficulty-based
  if (song.metadata.difficulty >= 3) skills.push('intermediate');
  if (song.metadata.difficulty >= 4) skills.push('advanced');

  return [...new Set(skills)];
}

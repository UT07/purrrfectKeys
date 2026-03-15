/**
 * Learning Paths — Themed skill progressions
 *
 * Provides 5 curated learning paths that prioritize different skill categories.
 * The CurriculumEngine uses the active path to weight skill selection.
 *
 * Pure TypeScript — no React imports.
 */

import type { SkillCategory } from './SkillTree';

// ============================================================================
// Types
// ============================================================================

export type LearningPathId = 'classical' | 'pop-songs' | 'technique' | 'theory' | 'sight-reading';

export interface LearningPath {
  id: LearningPathId;
  name: string;
  description: string;
  icon: string;                        // Emoji for UI display
  priorityCategories: SkillCategory[]; // Ordered by importance
  bonusCategories: SkillCategory[];    // Secondary focus
  songGenrePreference: string[];       // Preferred song genres
  tempoTarget: 'relaxed' | 'moderate' | 'aggressive';
}

// ============================================================================
// Path Definitions
// ============================================================================

export const LEARNING_PATHS: Record<LearningPathId, LearningPath> = {
  classical: {
    id: 'classical',
    name: 'Classical Journey',
    description: 'Master scales, arpeggios, and classical repertoire. Build technique through the great composers.',
    icon: '🎼',
    priorityCategories: ['scales', 'arpeggios', 'expression', 'hand-independence'],
    bonusCategories: ['key-signatures', 'sight-reading'],
    songGenrePreference: ['classical', 'film'],
    tempoTarget: 'moderate',
  },
  'pop-songs': {
    id: 'pop-songs',
    name: 'Pop Star',
    description: 'Learn to play your favorite songs! Focus on chords, rhythm, and popular music.',
    icon: '🎤',
    priorityCategories: ['chords', 'rhythm', 'songs', 'note-finding'],
    bonusCategories: ['hand-independence', 'intervals'],
    songGenrePreference: ['pop', 'film', 'game'],
    tempoTarget: 'relaxed',
  },
  technique: {
    id: 'technique',
    name: 'Technical Mastery',
    description: 'Push your speed, accuracy, and hand independence to the limit.',
    icon: '⚡',
    priorityCategories: ['scales', 'arpeggios', 'hand-independence', 'rhythm'],
    bonusCategories: ['black-keys', 'key-signatures'],
    songGenrePreference: ['classical', 'game'],
    tempoTarget: 'aggressive',
  },
  theory: {
    id: 'theory',
    name: 'Music Theory',
    description: 'Understand the building blocks of music: intervals, chords, keys, and harmonic progressions.',
    icon: '📚',
    priorityCategories: ['intervals', 'chords', 'key-signatures', 'black-keys'],
    bonusCategories: ['scales', 'expression'],
    songGenrePreference: ['classical', 'folk'],
    tempoTarget: 'relaxed',
  },
  'sight-reading': {
    id: 'sight-reading',
    name: 'Sight Reader',
    description: 'Read and play music at sight. Train your eyes, ears, and fingers to work together.',
    icon: '👁️',
    priorityCategories: ['sight-reading', 'note-finding', 'key-signatures', 'rhythm'],
    bonusCategories: ['intervals', 'scales'],
    songGenrePreference: ['classical', 'folk', 'film'],
    tempoTarget: 'moderate',
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the priority weight for a skill category based on the active learning path.
 * Higher weight = more likely to be selected in session planning.
 */
export function getCategoryWeight(
  category: SkillCategory,
  pathId: LearningPathId,
): number {
  const path = LEARNING_PATHS[pathId];
  const priorityIndex = path.priorityCategories.indexOf(category);
  if (priorityIndex !== -1) return 3 - priorityIndex * 0.5; // 3.0, 2.5, 2.0, 1.5

  const bonusIndex = path.bonusCategories.indexOf(category);
  if (bonusIndex !== -1) return 1.5 - bonusIndex * 0.25; // 1.5, 1.25

  return 1.0; // Default weight
}

/**
 * Get the list of all learning paths for UI display.
 */
export function getAllPaths(): LearningPath[] {
  return Object.values(LEARNING_PATHS);
}

/**
 * Get a specific learning path by ID.
 */
export function getPath(pathId: LearningPathId): LearningPath {
  return LEARNING_PATHS[pathId];
}

/**
 * Fun Fact Selection Logic
 * Provides intelligent selection of fun facts based on context,
 * with deduplication to avoid showing the same fact twice in a session.
 */

import { FUN_FACTS } from './funFacts';
import type { FunFact, FunFactCategory, FunFactDifficulty } from './funFacts';

// In-memory set of shown fact IDs (resets on app restart)
const shownFactIds = new Set<string>();

/**
 * Reset the shown facts tracker.
 * Called on app restart or when all facts have been shown.
 */
export function resetShownFacts(): void {
  shownFactIds.clear();
}

/**
 * Get a random fun fact with optional filtering.
 * Avoids repeating facts that have already been shown in this session.
 */
export function getRandomFact(options?: {
  category?: FunFactCategory;
  difficulty?: FunFactDifficulty;
  excludeIds?: string[];
}): FunFact {
  let candidates = FUN_FACTS;

  // Apply category filter
  if (options?.category) {
    candidates = candidates.filter((f) => f.category === options.category);
  }

  // Apply difficulty filter
  if (options?.difficulty) {
    candidates = candidates.filter((f) => f.difficulty === options.difficulty);
  }

  // Apply explicit excludeIds
  if (options?.excludeIds && options.excludeIds.length > 0) {
    const excludeSet = new Set(options.excludeIds);
    candidates = candidates.filter((f) => !excludeSet.has(f.id));
  }

  // Exclude already-shown facts
  const unseen = candidates.filter((f) => !shownFactIds.has(f.id));

  // If all matching facts have been shown, reset and use full candidate list
  const pool = unseen.length > 0 ? unseen : candidates;

  // If pool is still empty (no facts match filters at all), fall back to all facts
  if (pool.length === 0) {
    const fallback = FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];
    shownFactIds.add(fallback.id);
    return fallback;
  }

  const selected = pool[Math.floor(Math.random() * pool.length)];
  shownFactIds.add(selected.id);
  return selected;
}

/**
 * Mapping from lesson number to relevant fact categories and difficulty.
 * Used to select facts that are contextually appropriate for each lesson.
 */
const LESSON_FACT_CONFIG: Record<number, { categories: FunFactCategory[]; difficulty: FunFactDifficulty }> = {
  1: { categories: ['instrument', 'history'], difficulty: 'beginner' },
  2: { categories: ['theory', 'instrument'], difficulty: 'beginner' },
  3: { categories: ['theory', 'science'], difficulty: 'beginner' },
  4: { categories: ['composer', 'culture'], difficulty: 'beginner' },
  5: { categories: ['theory', 'science'], difficulty: 'intermediate' },
  6: { categories: ['culture', 'composer'], difficulty: 'intermediate' },
};

/**
 * Get a fun fact relevant to a specific lesson number.
 * Selects from categories and difficulty appropriate for the lesson topic.
 */
export function getFactForLesson(lessonNumber: number): FunFact {
  const config = LESSON_FACT_CONFIG[lessonNumber] ?? LESSON_FACT_CONFIG[1];

  // Try each category in order until we find an unseen fact
  for (const category of config.categories) {
    const candidates = FUN_FACTS.filter(
      (f) => f.category === category && f.difficulty === config.difficulty && !shownFactIds.has(f.id)
    );
    if (candidates.length > 0) {
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      shownFactIds.add(selected.id);
      return selected;
    }
  }

  // Relax difficulty constraint
  for (const category of config.categories) {
    const candidates = FUN_FACTS.filter(
      (f) => f.category === category && !shownFactIds.has(f.id)
    );
    if (candidates.length > 0) {
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      shownFactIds.add(selected.id);
      return selected;
    }
  }

  // Fall back to any random unseen fact
  return getRandomFact();
}

/**
 * Mapping from exercise skills to relevant fact categories.
 */
const SKILL_TO_CATEGORY: Record<string, FunFactCategory[]> = {
  'orientation': ['instrument', 'history'],
  'note-identification': ['theory', 'instrument'],
  'keyboard-navigation': ['instrument', 'theory'],
  'right-hand': ['theory', 'science'],
  'left-hand': ['theory', 'science'],
  'c-major': ['theory', 'composer'],
  'melodies': ['culture', 'composer'],
  'quarter-notes': ['theory', 'history'],
  'eighth-notes': ['theory', 'science'],
  'bass-notes': ['instrument', 'theory'],
  'accompaniment': ['culture', 'composer'],
  'independence': ['science', 'culture'],
  'both-hands': ['science', 'culture'],
  'coordination': ['science', 'instrument'],
  'hand-independence': ['science', 'composer'],
  'songs': ['culture', 'composer'],
  'harmony': ['theory', 'science'],
  'scales': ['theory', 'history'],
  'finger-crossing': ['instrument', 'science'],
  'parallel-motion': ['science', 'theory'],
  'speed': ['culture', 'science'],
  'technique': ['instrument', 'science'],
  'music-styles': ['culture', 'history'],
  'expression': ['composer', 'culture'],
  'rhythm': ['theory', 'science'],
};

/**
 * Get a fun fact relevant to a set of exercise skills.
 * Matches skills to appropriate categories for contextual facts.
 */
export function getFactForExerciseType(skills: string[]): FunFact {
  // Collect all relevant categories from the skills
  const relevantCategories = new Set<FunFactCategory>();
  for (const skill of skills) {
    const categories = SKILL_TO_CATEGORY[skill];
    if (categories) {
      for (const cat of categories) {
        relevantCategories.add(cat);
      }
    }
  }

  // If no skills matched, use a random fact
  if (relevantCategories.size === 0) {
    return getRandomFact();
  }

  // Try to find an unseen fact in matching categories
  const categoryArray = Array.from(relevantCategories);
  for (const category of categoryArray) {
    const candidates = FUN_FACTS.filter(
      (f) => f.category === category && !shownFactIds.has(f.id)
    );
    if (candidates.length > 0) {
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      shownFactIds.add(selected.id);
      return selected;
    }
  }

  // Fall back to any random unseen fact
  return getRandomFact();
}

/**
 * Determine whether a fun fact should be shown.
 * Always returns true — fun facts add delight between exercises.
 */
export function shouldShowFunFact(): boolean {
  return true;
}

/**
 * Fun Facts Tests
 * Validates fun facts data integrity, category distribution,
 * and selection/deduplication logic.
 */

import { FUN_FACTS, CATEGORY_COLORS } from '../funFacts';
import type { FunFactCategory, FunFactDifficulty } from '../funFacts';
import {
  getRandomFact,
  getFactForLesson,
  getFactForExerciseType,
  shouldShowFunFact,
  resetShownFacts,
} from '../funFactSelector';

describe('Fun Facts Data', () => {
  it('should have at least 60 fun facts', () => {
    expect(FUN_FACTS.length).toBeGreaterThanOrEqual(60);
  });

  it('should have unique IDs for all facts', () => {
    const ids = FUN_FACTS.map((f) => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have non-empty text for all facts', () => {
    for (const fact of FUN_FACTS) {
      expect(fact.text.length).toBeGreaterThan(10);
    }
  });

  it('should have valid categories for all facts', () => {
    const validCategories: FunFactCategory[] = [
      'history', 'theory', 'composer', 'instrument', 'science', 'culture',
    ];
    for (const fact of FUN_FACTS) {
      expect(validCategories).toContain(fact.category);
    }
  });

  it('should have valid difficulties for all facts', () => {
    const validDifficulties: FunFactDifficulty[] = [
      'beginner', 'intermediate', 'advanced',
    ];
    for (const fact of FUN_FACTS) {
      expect(validDifficulties).toContain(fact.difficulty);
    }
  });

  describe('Category distribution', () => {
    const categories: FunFactCategory[] = [
      'history', 'theory', 'composer', 'instrument', 'science', 'culture',
    ];

    for (const category of categories) {
      it(`should have at least 10 facts in "${category}" category`, () => {
        const count = FUN_FACTS.filter((f) => f.category === category).length;
        expect(count).toBeGreaterThanOrEqual(10);
      });
    }

    it('should have CATEGORY_COLORS for every category', () => {
      for (const category of categories) {
        expect(CATEGORY_COLORS[category]).toBeDefined();
        expect(CATEGORY_COLORS[category].bg).toBeTruthy();
        expect(CATEGORY_COLORS[category].text).toBeTruthy();
        expect(CATEGORY_COLORS[category].label).toBeTruthy();
      }
    });
  });

  describe('Difficulty distribution', () => {
    it('should have facts at beginner difficulty', () => {
      const count = FUN_FACTS.filter((f) => f.difficulty === 'beginner').length;
      expect(count).toBeGreaterThanOrEqual(20);
    });

    it('should have facts at intermediate difficulty', () => {
      const count = FUN_FACTS.filter((f) => f.difficulty === 'intermediate').length;
      expect(count).toBeGreaterThanOrEqual(15);
    });

    it('should have facts at advanced difficulty', () => {
      const count = FUN_FACTS.filter((f) => f.difficulty === 'advanced').length;
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('Fun Fact Selector', () => {
  beforeEach(() => {
    resetShownFacts();
  });

  describe('getRandomFact', () => {
    it('should return a valid fun fact', () => {
      const fact = getRandomFact();
      expect(fact).toBeDefined();
      expect(fact.id).toBeTruthy();
      expect(fact.text).toBeTruthy();
      expect(fact.category).toBeTruthy();
      expect(fact.difficulty).toBeTruthy();
    });

    it('should filter by category', () => {
      const fact = getRandomFact({ category: 'history' });
      expect(fact.category).toBe('history');
    });

    it('should filter by difficulty', () => {
      const fact = getRandomFact({ difficulty: 'beginner' });
      expect(fact.difficulty).toBe('beginner');
    });

    it('should filter by both category and difficulty', () => {
      const fact = getRandomFact({ category: 'theory', difficulty: 'beginner' });
      expect(fact.category).toBe('theory');
      expect(fact.difficulty).toBe('beginner');
    });

    it('should exclude specified IDs', () => {
      const firstFact = getRandomFact({ category: 'history' });
      resetShownFacts();

      // Exclude the first fact and try many times
      const seen = new Set<string>();
      for (let i = 0; i < 50; i++) {
        resetShownFacts();
        const fact = getRandomFact({
          category: 'history',
          excludeIds: [firstFact.id],
        });
        seen.add(fact.id);
      }
      expect(seen.has(firstFact.id)).toBe(false);
    });

    it('should avoid repeating facts within a session', () => {
      const seen = new Set<string>();
      // Get 10 facts, they should all be unique (since we have 60+)
      for (let i = 0; i < 10; i++) {
        const fact = getRandomFact();
        expect(seen.has(fact.id)).toBe(false);
        seen.add(fact.id);
      }
    });

    it('should reset and reuse facts when all have been shown', () => {
      // Show all facts by getting them one by one
      for (let i = 0; i < FUN_FACTS.length; i++) {
        getRandomFact();
      }
      // The next call should still return a valid fact (reset happened)
      const fact = getRandomFact();
      expect(fact).toBeDefined();
      expect(fact.id).toBeTruthy();
    });

    it('should fall back to any fact when filters match nothing useful', () => {
      // This tests the fallback path with very restrictive filtering
      const fact = getRandomFact({
        category: 'history',
        difficulty: 'advanced',
      });
      // Even if only one or two match, it should return something
      expect(fact).toBeDefined();
      expect(fact.id).toBeTruthy();
    });
  });

  describe('getFactForLesson', () => {
    it('should return a fact for lesson 1', () => {
      const fact = getFactForLesson(1);
      expect(fact).toBeDefined();
      expect(fact.id).toBeTruthy();
    });

    it('should return a fact for lesson 6', () => {
      const fact = getFactForLesson(6);
      expect(fact).toBeDefined();
      expect(fact.id).toBeTruthy();
    });

    it('should return a fact for unknown lesson numbers', () => {
      const fact = getFactForLesson(99);
      expect(fact).toBeDefined();
      expect(fact.id).toBeTruthy();
    });

    it('should prefer relevant categories for lesson 1 (instrument/history)', () => {
      const facts = [];
      for (let i = 0; i < 20; i++) {
        resetShownFacts();
        facts.push(getFactForLesson(1));
      }
      const categories = facts.map((f) => f.category);
      const relevantCount = categories.filter(
        (c) => c === 'instrument' || c === 'history'
      ).length;
      // Most facts should be from relevant categories
      expect(relevantCount).toBeGreaterThan(10);
    });
  });

  describe('getFactForExerciseType', () => {
    it('should return a fact for orientation skills', () => {
      const fact = getFactForExerciseType(['orientation', 'note-identification']);
      expect(fact).toBeDefined();
      expect(fact.id).toBeTruthy();
    });

    it('should return a fact for right-hand skills', () => {
      const fact = getFactForExerciseType(['right-hand', 'c-major']);
      expect(fact).toBeDefined();
      expect(fact.id).toBeTruthy();
    });

    it('should return a fact for unknown skills', () => {
      const fact = getFactForExerciseType(['unknown-skill-xyz']);
      expect(fact).toBeDefined();
      expect(fact.id).toBeTruthy();
    });

    it('should return a fact for empty skills array', () => {
      const fact = getFactForExerciseType([]);
      expect(fact).toBeDefined();
      expect(fact.id).toBeTruthy();
    });
  });

  describe('shouldShowFunFact', () => {
    it('should always return true', () => {
      // Fun facts always show between exercises now
      for (let i = 0; i < 100; i++) {
        expect(shouldShowFunFact()).toBe(true);
      }
    });
  });

  describe('resetShownFacts', () => {
    it('should allow previously shown facts to appear again', () => {
      const firstFact = getRandomFact({ category: 'history', difficulty: 'beginner' });
      resetShownFacts();

      // After reset, the same fact should be eligible again
      const seen = new Set<string>();
      for (let i = 0; i < 100; i++) {
        resetShownFacts();
        const fact = getRandomFact({ category: 'history', difficulty: 'beginner' });
        seen.add(fact.id);
      }
      expect(seen.has(firstFact.id)).toBe(true);
    });
  });
});

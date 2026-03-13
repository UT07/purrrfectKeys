import {
  SKILL_TREE,
  getSkillById,
  getAvailableSkills,
  getSkillsForExercise,
  getSkillsByCategory,
  validateSkillTree,
  getSkillDepth,
  getGenerationHints,
  getSkillsByTier,
  getTierMasteryScore,
  isTierGatePassed,
  daysSinceLastPractice,
  needsGentleReentry,
  TIER_MASTERY_GATES,
} from '../SkillTree';

describe('SkillTree', () => {
  describe('DAG validity', () => {
    it('should be a valid DAG with no cycles', () => {
      expect(validateSkillTree()).toBe(true);
    });

    it('should have unique IDs', () => {
      const ids = SKILL_TREE.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should only reference existing prerequisites', () => {
      const allIds = new Set(SKILL_TREE.map((n) => n.id));
      for (const node of SKILL_TREE) {
        for (const prereq of node.prerequisites) {
          expect(allIds.has(prereq)).toBe(true);
        }
      }
    });

    it('should have at least one root node (no prerequisites)', () => {
      const roots = SKILL_TREE.filter((n) => n.prerequisites.length === 0);
      expect(roots.length).toBeGreaterThan(0);
    });

    it('should have at least one leaf node (not a prerequisite of anything)', () => {
      const allPrereqs = new Set(SKILL_TREE.flatMap((n) => n.prerequisites));
      const leaves = SKILL_TREE.filter((n) => !allPrereqs.has(n.id));
      expect(leaves.length).toBeGreaterThan(0);
    });
  });

  describe('getSkillById', () => {
    it('should return the correct skill node', () => {
      const node = getSkillById('find-middle-c');
      expect(node).not.toBeNull();
      expect(node!.name).toBe('Find Middle C');
      expect(node!.category).toBe('note-finding');
    });

    it('should return null for non-existent ID', () => {
      expect(getSkillById('does-not-exist')).toBeNull();
    });
  });

  describe('getAvailableSkills', () => {
    it('should return root nodes when no skills are mastered', () => {
      const available = getAvailableSkills([]);
      // Root nodes: find-middle-c and lh-c-position (both have no prereqs that aren't roots)
      expect(available.length).toBeGreaterThan(0);
      for (const node of available) {
        expect(node.prerequisites).toEqual([]);
      }
    });

    it('should unlock next tier when prerequisites are mastered', () => {
      const available = getAvailableSkills(['find-middle-c']);
      const ids = available.map((n) => n.id);
      expect(ids).toContain('keyboard-geography');
    });

    it('should not include already mastered skills', () => {
      const available = getAvailableSkills(['find-middle-c']);
      const ids = available.map((n) => n.id);
      expect(ids).not.toContain('find-middle-c');
    });

    it('should not include skills with unmet prerequisites', () => {
      const available = getAvailableSkills(['find-middle-c']);
      const ids = available.map((n) => n.id);
      // 'white-keys' requires 'keyboard-geography' which is not mastered
      expect(ids).not.toContain('white-keys');
    });

    it('should handle full mastery (return empty for fully mastered tree)', () => {
      const allIds = SKILL_TREE.map((n) => n.id);
      const available = getAvailableSkills(allIds);
      expect(available).toEqual([]);
    });

    it('should unlock multi-prerequisite nodes only when all prereqs are met', () => {
      // hands-together-basic requires c-position-review AND lh-scale-descending
      const withoutAll = getAvailableSkills(['c-position-review']);
      expect(withoutAll.map((n) => n.id)).not.toContain('hands-together-basic');

      const withAll = getAvailableSkills(['c-position-review', 'lh-scale-descending']);
      expect(withAll.map((n) => n.id)).toContain('hands-together-basic');
    });
  });

  describe('getSkillsForExercise', () => {
    it('should find skills mapped to a static exercise', () => {
      const skills = getSkillsForExercise('lesson-01-ex-01');
      expect(skills.length).toBe(1);
      expect(skills[0].id).toBe('find-middle-c');
    });

    it('should return empty for unknown exercise', () => {
      expect(getSkillsForExercise('unknown-exercise')).toEqual([]);
    });

    it('should return multiple skills if exercise is mapped to more than one', () => {
      // lesson-02-ex-04 is under simple-melodies
      const skills = getSkillsForExercise('lesson-02-ex-04');
      expect(skills.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getSkillsByCategory', () => {
    it('should return all note-finding skills', () => {
      const skills = getSkillsByCategory('note-finding');
      expect(skills.length).toBeGreaterThan(0);
      for (const skill of skills) {
        expect(skill.category).toBe('note-finding');
      }
    });

    it('should return all songs skills', () => {
      const skills = getSkillsByCategory('songs');
      expect(skills.length).toBeGreaterThan(0);
    });
  });

  describe('getSkillDepth', () => {
    it('should return 0 for root nodes', () => {
      expect(getSkillDepth('find-middle-c')).toBe(0);
    });

    it('should return 1 for direct children of root', () => {
      expect(getSkillDepth('keyboard-geography')).toBe(1);
    });

    it('should return correct depth for deeper nodes', () => {
      // find-middle-c(0) -> keyboard-geography(1) -> white-keys(2)
      expect(getSkillDepth('white-keys')).toBe(2);
    });

    it('should compute depth via longest path for multi-prereq nodes', () => {
      // hands-together-basic has two prerequisite chains of different lengths
      const depth = getSkillDepth('hands-together-basic');
      expect(depth).toBeGreaterThanOrEqual(3);
    });
  });

  describe('skill tree coverage', () => {
    it('should have nodes for all 7 categories', () => {
      const categories = new Set(SKILL_TREE.map((n) => n.category));
      expect(categories).toContain('note-finding');
      expect(categories).toContain('intervals');
      expect(categories).toContain('scales');
      expect(categories).toContain('chords');
      expect(categories).toContain('rhythm');
      expect(categories).toContain('hand-independence');
      expect(categories).toContain('songs');
    });

    it('should map at least one exercise per lesson', () => {
      const allExerciseIds = SKILL_TREE.flatMap((n) => n.targetExerciseIds);
      for (let lesson = 1; lesson <= 6; lesson++) {
        const prefix = `lesson-0${lesson}`;
        const hasExercise = allExerciseIds.some((id) => id.startsWith(prefix));
        expect(hasExercise).toBe(true);
      }
    });

    it('should have mastery thresholds between 0 and 1', () => {
      for (const node of SKILL_TREE) {
        expect(node.masteryThreshold).toBeGreaterThan(0);
        expect(node.masteryThreshold).toBeLessThanOrEqual(1);
      }
    });

    it('should have non-empty names and descriptions', () => {
      for (const node of SKILL_TREE) {
        expect(node.name.length).toBeGreaterThan(0);
        expect(node.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('GenerationHints', () => {
    it('should have a promptHint for every skill node', () => {
      for (const node of SKILL_TREE) {
        const hints = getGenerationHints(node.id);
        expect(hints).not.toBeNull();
        expect(hints!.promptHint.length).toBeGreaterThan(0);
      }
    });

    it('should return null for unknown skill', () => {
      expect(getGenerationHints('nonexistent')).toBeNull();
    });

    it('should have valid hand values', () => {
      for (const node of SKILL_TREE) {
        const hints = getGenerationHints(node.id);
        if (hints?.hand) {
          expect(['left', 'right', 'both']).toContain(hints.hand);
        }
      }
    });

    it('should have valid difficulty ranges', () => {
      for (const node of SKILL_TREE) {
        const hints = getGenerationHints(node.id);
        if (hints?.minDifficulty) {
          expect(hints.minDifficulty).toBeGreaterThanOrEqual(1);
          expect(hints.minDifficulty).toBeLessThanOrEqual(3);
        }
        if (hints?.maxDifficulty) {
          expect(hints.maxDifficulty).toBeGreaterThanOrEqual(1);
          expect(hints.maxDifficulty).toBeLessThanOrEqual(3);
        }
      }
    });

    it('should have targetMidi notes in valid piano range', () => {
      for (const node of SKILL_TREE) {
        const hints = getGenerationHints(node.id);
        if (hints?.targetMidi) {
          for (const midi of hints.targetMidi) {
            expect(midi).toBeGreaterThanOrEqual(21);
            expect(midi).toBeLessThanOrEqual(108);
          }
        }
      }
    });
  });

  describe('Tier Mastery Gates', () => {
    it('should define gates for tiers 1-14', () => {
      for (let tier = 1; tier <= 14; tier++) {
        expect(TIER_MASTERY_GATES[tier]).toBeDefined();
        expect(TIER_MASTERY_GATES[tier]).toBeGreaterThanOrEqual(70);
        expect(TIER_MASTERY_GATES[tier]).toBeLessThanOrEqual(100);
      }
    });

    it('gates should increase or stay stable with tier', () => {
      for (let tier = 2; tier <= 14; tier++) {
        expect(TIER_MASTERY_GATES[tier]).toBeGreaterThanOrEqual(TIER_MASTERY_GATES[tier - 1]);
      }
    });
  });

  describe('getSkillsByTier', () => {
    it('returns skills for tier 1', () => {
      const tier1 = getSkillsByTier(1);
      expect(tier1.length).toBeGreaterThan(0);
      expect(tier1.every((s) => s.tier === 1)).toBe(true);
    });

    it('returns empty for nonexistent tier', () => {
      expect(getSkillsByTier(99)).toHaveLength(0);
    });

    it('every skill belongs to exactly one tier', () => {
      for (const node of SKILL_TREE) {
        const tierSkills = getSkillsByTier(node.tier);
        expect(tierSkills.map((s) => s.id)).toContain(node.id);
      }
    });
  });

  describe('getTierMasteryScore', () => {
    it('returns 0 when no tier skills are mastered', () => {
      const score = getTierMasteryScore(1, [], {});
      expect(score).toBe(0);
    });

    it('returns 100 when all tier skills are mastered', () => {
      const tier1Skills = getSkillsByTier(1);
      const masteredIds = tier1Skills.map((s) => s.id);
      const masteryData: Record<string, { masteredAt: number; lastPracticedAt: number; completionCount: number; decayScore: number }> = {};
      for (const skill of tier1Skills) {
        masteryData[skill.id] = {
          masteredAt: Date.now(),
          lastPracticedAt: Date.now(),
          completionCount: skill.requiredCompletions,
          decayScore: 1.0,
        };
      }
      const score = getTierMasteryScore(1, masteredIds, masteryData);
      expect(score).toBe(100);
    });

    it('returns partial score for partially mastered tier', () => {
      const tier1Skills = getSkillsByTier(1);
      // Master just the first skill
      const masteredIds = [tier1Skills[0].id];
      const masteryData = {
        [tier1Skills[0].id]: {
          masteredAt: Date.now(),
          lastPracticedAt: Date.now(),
          completionCount: tier1Skills[0].requiredCompletions,
          decayScore: 1.0,
        },
      };
      const score = getTierMasteryScore(1, masteredIds, masteryData);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });
  });

  describe('isTierGatePassed', () => {
    it('returns true when tier is fully mastered', () => {
      const tier1Skills = getSkillsByTier(1);
      const masteredIds = tier1Skills.map((s) => s.id);
      const masteryData: Record<string, { masteredAt: number; lastPracticedAt: number; completionCount: number; decayScore: number }> = {};
      for (const skill of tier1Skills) {
        masteryData[skill.id] = {
          masteredAt: Date.now(),
          lastPracticedAt: Date.now(),
          completionCount: skill.requiredCompletions,
          decayScore: 1.0,
        };
      }
      expect(isTierGatePassed(1, masteredIds, masteryData)).toBe(true);
    });

    it('returns false when tier is not mastered enough', () => {
      expect(isTierGatePassed(1, [], {})).toBe(false);
    });

    it('returns true for tier 15 (no gate defined)', () => {
      expect(isTierGatePassed(15, [], {})).toBe(true);
    });
  });

  describe('daysSinceLastPractice', () => {
    it('returns Infinity for empty mastery data', () => {
      expect(daysSinceLastPractice({})).toBe(Infinity);
    });

    it('returns ~0 for recent practice', () => {
      const data = { 'skill-1': { masteredAt: Date.now(), lastPracticedAt: Date.now(), completionCount: 1, decayScore: 1 } };
      expect(daysSinceLastPractice(data)).toBeLessThan(1);
    });
  });

  describe('needsGentleReentry', () => {
    it('returns true for empty mastery data', () => {
      expect(needsGentleReentry({})).toBe(true);
    });

    it('returns false for recent practice', () => {
      const data = { 'skill-1': { masteredAt: Date.now(), lastPracticedAt: Date.now(), completionCount: 1, decayScore: 1 } };
      expect(needsGentleReentry(data)).toBe(false);
    });

    it('returns true for old practice', () => {
      const eightDaysAgo = Date.now() - 8 * 86400000;
      const data = { 'skill-1': { masteredAt: eightDaysAgo, lastPracticedAt: eightDaysAgo, completionCount: 1, decayScore: 0.3 } };
      expect(needsGentleReentry(data)).toBe(true);
    });
  });
});

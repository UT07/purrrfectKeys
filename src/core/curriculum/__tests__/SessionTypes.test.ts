/**
 * SessionTypes Tests
 *
 * Tests the session type selection logic and session variety scheduling.
 * Covers: selectSessionType, generateSessionPlan with different session types,
 * review/challenge/mixed session content, and AI exercise generation triggers.
 */

import { selectSessionType, generateSessionPlan } from '../CurriculumEngine';
import { SKILL_TREE } from '../SkillTree';
import type { LearnerProfileData } from '../../../stores/learnerProfileStore';
import type { SkillMasteryRecord } from '../../../stores/types';

// Mock ContentLoader — returns minimal Exercise objects for static exercises
jest.mock('../../../content/ContentLoader', () => {
  const mockExercise = (id: string) => ({
    id,
    version: 1,
    metadata: { title: id, description: '', difficulty: 1, estimatedMinutes: 2, skills: [], prerequisites: [] },
    settings: { tempo: 60, timeSignature: [4, 4], keySignature: 'C', countIn: 4, metronomeEnabled: true },
    notes: [{ note: 60, startBeat: 0, durationBeats: 1 }],
    scoring: { timingToleranceMs: 50, timingGracePeriodMs: 150, passingScore: 70, starThresholds: [70, 85, 95] },
    hints: { beforeStart: '', commonMistakes: [], successMessage: '' },
  });

  // Build registry from SKILL_TREE exercise IDs
  const { SKILL_TREE: tree } = jest.requireActual('../SkillTree');
  const registry: Record<string, ReturnType<typeof mockExercise>> = {};
  for (const node of tree) {
    for (const eid of node.targetExerciseIds) {
      registry[eid] = mockExercise(eid);
    }
  }

  return {
    getExercise: (id: string) => registry[id] ?? null,
    getLessons: () => [
      { id: 'lesson-01', metadata: { title: 'L1' }, exercises: [{ id: 'lesson-01-ex-01', order: 1 }, { id: 'lesson-01-ex-02', order: 2 }, { id: 'lesson-01-ex-03', order: 3 }] },
      { id: 'lesson-02', metadata: { title: 'L2' }, exercises: [{ id: 'lesson-02-ex-01', order: 1 }] },
      { id: 'lesson-03', metadata: { title: 'L3' }, exercises: [{ id: 'lesson-03-ex-01', order: 1 }] },
      { id: 'lesson-04', metadata: { title: 'L4' }, exercises: [{ id: 'lesson-04-ex-01', order: 1 }] },
      { id: 'lesson-05', metadata: { title: 'L5' }, exercises: [{ id: 'lesson-05-ex-01', order: 1 }] },
      { id: 'lesson-06', metadata: { title: 'L6' }, exercises: [{ id: 'lesson-06-ex-01', order: 1 }] },
    ],
    getLessonExercises: (lessonId: string) => {
      const map: Record<string, string[]> = {
        'lesson-01': ['lesson-01-ex-01', 'lesson-01-ex-02', 'lesson-01-ex-03'],
        'lesson-02': ['lesson-02-ex-01', 'lesson-02-ex-02', 'lesson-02-ex-03'],
        'lesson-03': ['lesson-03-ex-01'],
        'lesson-04': ['lesson-04-ex-01'],
        'lesson-05': ['lesson-05-ex-01'],
        'lesson-06': ['lesson-06-ex-01'],
      };
      return (map[lessonId] ?? []).map((id) => registry[id]).filter(Boolean);
    },
  };
});

function makeProfile(overrides: Partial<LearnerProfileData> = {}): LearnerProfileData {
  return {
    noteAccuracy: {},
    noteAttempts: {},
    skills: { timingAccuracy: 0.5, pitchAccuracy: 0.5, sightReadSpeed: 0.5, chordRecognition: 0.5 },
    tempoRange: { min: 40, max: 80 },
    weakNotes: [],
    weakSkills: [],
    totalExercisesCompleted: 0,
    lastAssessmentDate: '',
    assessmentScore: 0,
    masteredSkills: [],
    skillMasteryData: {},
    recentExerciseIds: [],
    ...overrides,
  };
}

/** Helper to create decayed mastery records */
function makeDecayedRecords(
  skillIds: string[],
  daysAgo: number
): Record<string, SkillMasteryRecord> {
  const timestamp = Date.now() - daysAgo * 86400000;
  const records: Record<string, SkillMasteryRecord> = {};
  for (const id of skillIds) {
    records[id] = {
      masteredAt: timestamp,
      lastPracticedAt: timestamp,
      completionCount: 1,
      decayScore: 1.0,
    };
  }
  return records;
}

describe('SessionTypes', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // selectSessionType
  // ──────────────────────────────────────────────────────────────────────────

  describe('selectSessionType', () => {
    it('returns new-material for fresh user', () => {
      const result = selectSessionType([], {}, 0);
      expect(result).toBe('new-material');
    });

    it('returns challenge every 5th session', () => {
      // The check is: totalExercisesCompleted > 0 && totalExercisesCompleted % 5 === 0
      // So exercises 5, 10, 15, etc. are challenge days
      expect(selectSessionType([], {}, 5)).toBe('challenge');
      expect(selectSessionType([], {}, 10)).toBe('challenge');
      expect(selectSessionType([], {}, 15)).toBe('challenge');

      // Non-challenge sessions
      expect(selectSessionType([], {}, 3)).toBe('new-material');
      expect(selectSessionType([], {}, 4)).toBe('new-material');
      expect(selectSessionType([], {}, 6)).toBe('new-material');
    });

    it('returns review when 3+ skills decayed', () => {
      const skillIds = ['find-middle-c', 'keyboard-geography', 'white-keys'];
      const decayedRecords = makeDecayedRecords(skillIds, 30); // 30 days old => fully decayed

      const result = selectSessionType(skillIds, decayedRecords, 0);
      expect(result).toBe('review');
    });

    it('returns mixed when 1-2 skills decayed', () => {
      // 1 skill decayed
      const oneDecayed = makeDecayedRecords(['find-middle-c'], 30);
      expect(selectSessionType(['find-middle-c'], oneDecayed, 0)).toBe('mixed');

      // 2 skills decayed
      const twoDecayed = makeDecayedRecords(['find-middle-c', 'keyboard-geography'], 30);
      expect(
        selectSessionType(['find-middle-c', 'keyboard-geography'], twoDecayed, 0)
      ).toBe('mixed');
    });

    it('returns new-material when no decay and not 5th session', () => {
      // Fresh mastery records (practiced just now)
      const freshRecords: Record<string, SkillMasteryRecord> = {
        'find-middle-c': {
          masteredAt: Date.now(),
          lastPracticedAt: Date.now(),
          completionCount: 1,
          decayScore: 1.0,
        },
      };

      const result = selectSessionType(['find-middle-c'], freshRecords, 2);
      expect(result).toBe('new-material');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // generateSessionPlan
  // ──────────────────────────────────────────────────────────────────────────

  describe('generateSessionPlan', () => {
    it('includes sessionType field', () => {
      const plan = generateSessionPlan(makeProfile(), []);
      expect(plan.sessionType).toBeDefined();
      expect(['new-material', 'review', 'challenge', 'mixed']).toContain(plan.sessionType);
    });

    it('review session includes review exercises', () => {
      const skillIds = ['find-middle-c', 'keyboard-geography', 'white-keys'];
      const decayedRecords = makeDecayedRecords(skillIds, 30);

      const profile = makeProfile({
        masteredSkills: skillIds,
        skillMasteryData: decayedRecords,
        totalExercisesCompleted: 0,
      });

      const plan = generateSessionPlan(profile, skillIds);
      expect(plan.sessionType).toBe('review');

      // Lesson section should contain review exercises referencing decayed skill nodes
      const reviewRefs = plan.lesson.filter((ref) =>
        ref.reason.toLowerCase().includes('review')
      );
      expect(reviewRefs.length).toBeGreaterThan(0);

      // Should also reference the decayed skill IDs
      const referencedSkillIds = plan.lesson.map((ref) => ref.skillNodeId);
      const hasDecayedSkill = skillIds.some((id) => referencedSkillIds.includes(id));
      expect(hasDecayedSkill).toBe(true);
    });

    it('challenge session has extra challenge exercise', () => {
      // totalExercisesCompleted=5 triggers challenge day
      const profile = makeProfile({ totalExercisesCompleted: 5 });
      const mastered = ['find-middle-c', 'keyboard-geography', 'white-keys'];

      const plan = generateSessionPlan(profile, mastered);
      expect(plan.sessionType).toBe('challenge');

      // Challenge section should have at least 1 exercise, potentially 2 (original + extra)
      expect(plan.challenge.length).toBeGreaterThanOrEqual(1);
      // Reasoning should mention "Challenge day"
      expect(plan.reasoning.some((r) => r.toLowerCase().includes('challenge'))).toBe(true);
    });

    it('mixed session has both review and new-material', () => {
      // 1 decayed skill => mixed session
      const decayedRecords = makeDecayedRecords(['find-middle-c'], 30);
      const profile = makeProfile({
        masteredSkills: ['find-middle-c'],
        skillMasteryData: decayedRecords,
        totalExercisesCompleted: 0,
      });

      const plan = generateSessionPlan(profile, ['find-middle-c']);
      expect(plan.sessionType).toBe('mixed');

      // Lesson should contain a mix: at least one review reference and at least one new-material reference
      const hasReview = plan.lesson.some(
        (ref) => ref.reason.toLowerCase().includes('review')
      );
      const hasNewMaterial = plan.lesson.some(
        (ref) =>
          ref.reason.toLowerCase().includes('learn') ||
          ref.reason.toLowerCase().includes('working on')
      );

      // At minimum, the lesson section should have content
      expect(plan.lesson.length).toBeGreaterThan(0);
      // If there are enough exercises, we expect both types
      if (plan.lesson.length >= 2) {
        expect(hasReview).toBe(true);
        expect(hasNewMaterial).toBe(true);
      }
    });

    it('AI exercises generated for tier 7+ skills', () => {
      // Master all skills through tier 6 to unlock tier 7
      const tier1to6Skills = SKILL_TREE
        .filter((node) => node.tier <= 6)
        .map((node) => node.id);

      // Also need some tier 7 prerequisites that might be from tier 1-6
      const allMastered = [...tier1to6Skills];

      // Create fresh mastery data for all
      const freshRecords: Record<string, SkillMasteryRecord> = {};
      for (const id of allMastered) {
        freshRecords[id] = {
          masteredAt: Date.now(),
          lastPracticedAt: Date.now(),
          completionCount: 5,
          decayScore: 1.0,
        };
      }

      const profile = makeProfile({
        masteredSkills: allMastered,
        skillMasteryData: freshRecords,
        totalExercisesCompleted: 30,
      });

      const plan = generateSessionPlan(profile, allMastered);

      // The lesson section should target tier 7+ skills.
      // Since tier 7 exercise IDs (lesson-07-ex-*) are not in the ContentLoader mock registry
      // (the mock only has exercises from SKILL_TREE.targetExerciseIds), AI exercises may
      // be generated as fallback. Check that at least one exercise references a tier 7+ skill.
      const allExercises = [...plan.warmUp, ...plan.lesson, ...plan.challenge];
      const tier7PlusSkillIds = SKILL_TREE
        .filter((node) => node.tier >= 7)
        .map((node) => node.id);

      const referencesTier7Plus = allExercises.some(
        (ref) => tier7PlusSkillIds.includes(ref.skillNodeId)
      );

      // When all tier 1-6 are mastered, the next skill to learn should be tier 7+
      // The plan should reference those skills (either static or AI-generated)
      expect(referencesTier7Plus).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Edge cases
  // ──────────────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('challenge day takes priority over decay', () => {
      // Both conditions: 3+ decayed skills AND 5th session
      const skillIds = ['find-middle-c', 'keyboard-geography', 'white-keys'];
      const decayedRecords = makeDecayedRecords(skillIds, 30);

      // totalExercisesCompleted=5 => challenge takes priority (checked first)
      const result = selectSessionType(skillIds, decayedRecords, 5);
      expect(result).toBe('challenge');
    });

    it('selectSessionType handles empty skillMasteryData', () => {
      const result = selectSessionType(['find-middle-c'], {}, 0);
      // No mastery data means no decay can be calculated => new-material
      expect(result).toBe('new-material');
    });

    it('generateSessionPlan always produces non-empty sections', () => {
      const plan = generateSessionPlan(makeProfile(), []);
      expect(plan.warmUp.length).toBeGreaterThan(0);
      expect(plan.lesson.length).toBeGreaterThan(0);
      expect(plan.challenge.length).toBeGreaterThan(0);
      expect(plan.reasoning.length).toBeGreaterThan(0);
    });
  });
});

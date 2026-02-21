/**
 * Integration Test: Year-Long Progression Simulation
 *
 * Simulates 365 days of daily practice sessions to verify that:
 * - The CurriculumEngine generates valid sessions every day
 * - All 100 skills can eventually be mastered
 * - Prerequisite ordering is always respected
 * - AI exercises are produced for tier 7+ skills (no static content)
 * - Session type variety emerges over time (new-material, review, challenge, mixed)
 * - Decay triggers review sessions after skills go unpracticed
 */

import {
  generateSessionPlan,
  getNextSkillToLearn,
  selectSessionType,
} from '../../core/curriculum/CurriculumEngine';
import {
  SKILL_TREE,
  getSkillById,
} from '../../core/curriculum/SkillTree';
import type { LearnerProfileData } from '../../stores/learnerProfileStore';
import type { SkillMasteryRecord } from '../../stores/types';

// ---------------------------------------------------------------------------
// Mock ContentLoader
// ---------------------------------------------------------------------------
// Only lessons 1-6 have real static exercises. Lessons 7-24 (tier 7+) do NOT
// have static JSON files, so getExercise() returns null for those IDs. This
// forces the CurriculumEngine to emit AI-generated exercise refs for tier 7+.
// ---------------------------------------------------------------------------

jest.mock('../../content/ContentLoader', () => {
  const mockExercise = (id: string) => ({
    id,
    version: 1,
    metadata: {
      title: id,
      description: '',
      difficulty: 1,
      estimatedMinutes: 2,
      skills: [],
      prerequisites: [],
    },
    settings: {
      tempo: 60,
      timeSignature: [4, 4],
      keySignature: 'C',
      countIn: 4,
      metronomeEnabled: true,
    },
    notes: [{ note: 60, startBeat: 0, durationBeats: 1 }],
    scoring: {
      timingToleranceMs: 50,
      timingGracePeriodMs: 150,
      passingScore: 70,
      starThresholds: [70, 85, 95],
    },
    hints: { beforeStart: '', commonMistakes: [], successMessage: '' },
  });

  // Build registry from SKILL_TREE exercise IDs — but ONLY for lessons 1-6
  const { SKILL_TREE: tree } = jest.requireActual(
    '../../core/curriculum/SkillTree'
  );
  const staticLessons = new Set([
    'lesson-01',
    'lesson-02',
    'lesson-03',
    'lesson-04',
    'lesson-05',
    'lesson-06',
  ]);
  const registry: Record<string, ReturnType<typeof mockExercise>> = {};
  for (const node of tree) {
    for (const eid of (node as { targetExerciseIds: string[] })
      .targetExerciseIds) {
      // Only register exercises whose lesson is in 1-6
      const lessonMatch = eid.match(/^(lesson-\d+)/);
      if (lessonMatch && staticLessons.has(lessonMatch[1])) {
        registry[eid] = mockExercise(eid);
      }
    }
  }

  return {
    getExercise: (id: string) => registry[id] ?? null,
    getLessons: () => [
      {
        id: 'lesson-01',
        metadata: { title: 'L1' },
        exercises: [
          { id: 'lesson-01-ex-01', order: 1 },
          { id: 'lesson-01-ex-02', order: 2 },
          { id: 'lesson-01-ex-03', order: 3 },
        ],
      },
      {
        id: 'lesson-02',
        metadata: { title: 'L2' },
        exercises: [
          { id: 'lesson-02-ex-01', order: 1 },
          { id: 'lesson-02-ex-02', order: 2 },
        ],
      },
      {
        id: 'lesson-03',
        metadata: { title: 'L3' },
        exercises: [{ id: 'lesson-03-ex-01', order: 1 }],
      },
      {
        id: 'lesson-04',
        metadata: { title: 'L4' },
        exercises: [{ id: 'lesson-04-ex-01', order: 1 }],
      },
      {
        id: 'lesson-05',
        metadata: { title: 'L5' },
        exercises: [{ id: 'lesson-05-ex-01', order: 1 }],
      },
      {
        id: 'lesson-06',
        metadata: { title: 'L6' },
        exercises: [{ id: 'lesson-06-ex-01', order: 1 }],
      },
    ],
    getLessonExercises: (lessonId: string) => {
      const map: Record<string, string[]> = {
        'lesson-01': [
          'lesson-01-ex-01',
          'lesson-01-ex-02',
          'lesson-01-ex-03',
        ],
        'lesson-02': [
          'lesson-02-ex-01',
          'lesson-02-ex-02',
          'lesson-02-ex-03',
        ],
        'lesson-03': ['lesson-03-ex-01'],
        'lesson-04': ['lesson-04-ex-01'],
        'lesson-05': ['lesson-05-ex-01'],
        'lesson-06': ['lesson-06-ex-01'],
      };
      return (map[lessonId] ?? [])
        .map((id) => registry[id])
        .filter(Boolean);
    },
    isPostCurriculum: () => false,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProfile(
  overrides: Partial<LearnerProfileData> = {}
): LearnerProfileData {
  return {
    noteAccuracy: {},
    noteAttempts: {},
    skills: {
      timingAccuracy: 0.5,
      pitchAccuracy: 0.5,
      sightReadSpeed: 0.5,
      chordRecognition: 0.5,
    },
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

/**
 * Build a skillMasteryData record where every skill in `skillIds` was last
 * practiced `daysAgo` days ago (from the current Date.now).
 */
function buildDecayedMasteryData(
  skillIds: string[],
  daysAgo: number
): Record<string, SkillMasteryRecord> {
  const msPerDay = 86400000;
  const lastPracticedAt = Date.now() - daysAgo * msPerDay;
  const result: Record<string, SkillMasteryRecord> = {};
  for (const id of skillIds) {
    result[id] = {
      masteredAt: lastPracticedAt - 1000,
      lastPracticedAt,
      completionCount: 3,
      decayScore: Math.max(0, 1 - daysAgo / 14),
    };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Year-Long Progression Simulation', () => {
  it('should generate non-empty sessions for 365 days', () => {
    const masteredSkills: string[] = [];
    const skillMasteryData: Record<string, SkillMasteryRecord> = {};
    let totalExercisesCompleted = 0;
    let aiExerciseCount = 0;
    let staticExerciseCount = 0;

    for (let day = 0; day < 365; day++) {
      const profile = makeProfile({
        masteredSkills: [...masteredSkills],
        skillMasteryData: { ...skillMasteryData },
        totalExercisesCompleted,
      });

      const plan = generateSessionPlan(profile, [...masteredSkills]);

      // Every session must have at least 1 exercise total across sections
      const totalExercises =
        plan.warmUp.length + plan.lesson.length + plan.challenge.length;
      expect(totalExercises).toBeGreaterThanOrEqual(1);

      // Count AI vs static exercises
      const allRefs = [...plan.warmUp, ...plan.lesson, ...plan.challenge];
      for (const ref of allRefs) {
        if (ref.source === 'ai') {
          aiExerciseCount++;
        } else {
          staticExerciseCount++;
        }
      }

      totalExercisesCompleted += allRefs.length;

      // After each session, master the next available skill
      const next = getNextSkillToLearn(masteredSkills);
      if (next) {
        masteredSkills.push(next.id);
        const now = Date.now();
        skillMasteryData[next.id] = {
          masteredAt: now,
          lastPracticedAt: now,
          completionCount: next.requiredCompletions,
          decayScore: 1.0,
        };
      }
    }

    // Over 365 days, we should have mastered many skills
    expect(masteredSkills.length).toBeGreaterThan(0);
    // We should see a mix of AI and static exercises
    expect(staticExerciseCount).toBeGreaterThan(0);
    expect(aiExerciseCount).toBeGreaterThan(0);
  });

  it('should eventually master all 100 skills', () => {
    const mastered: string[] = [];
    let iterations = 0;
    const maxIterations = SKILL_TREE.length + 10; // safety margin

    while (iterations < maxIterations) {
      const next = getNextSkillToLearn(mastered);
      if (!next) break;
      mastered.push(next.id);
      iterations++;
    }

    // All 100 skills must be reachable
    expect(mastered.length).toBe(SKILL_TREE.length);

    // Every skill ID from the tree should be in the mastered list
    const allSkillIds = new Set(SKILL_TREE.map((n) => n.id));
    for (const id of allSkillIds) {
      expect(mastered).toContain(id);
    }
  });

  it('should produce AI exercises for tier 7+ skills', () => {
    // Master all tier 1-6 skills
    const tier1to6 = SKILL_TREE.filter((n) => n.tier <= 6).map((n) => n.id);

    // Build mastery data with fresh timestamps
    const now = Date.now();
    const skillMasteryData: Record<string, SkillMasteryRecord> = {};
    for (const id of tier1to6) {
      skillMasteryData[id] = {
        masteredAt: now,
        lastPracticedAt: now,
        completionCount: 5,
        decayScore: 1.0,
      };
    }

    const profile = makeProfile({
      masteredSkills: [...tier1to6],
      skillMasteryData,
      totalExercisesCompleted: tier1to6.length * 3,
    });

    const plan = generateSessionPlan(profile, [...tier1to6]);

    // The lesson section should target a tier 7+ skill. Since tier 7+
    // exercises don't exist in the mock ContentLoader, they must be AI.
    const lessonAiRefs = plan.lesson.filter((r) => r.source === 'ai');
    expect(lessonAiRefs.length).toBeGreaterThan(0);

    // Verify the AI exercise targets a tier 7+ skill
    for (const ref of lessonAiRefs) {
      // AI-generated refs have skillNodeId that should be a real skill or 'review'
      if (ref.skillNodeId !== 'review') {
        const skill = getSkillById(ref.skillNodeId);
        if (skill) {
          expect(skill.tier).toBeGreaterThanOrEqual(7);
        }
      }
    }
  });

  it('should trigger review sessions after simulated decay', () => {
    // Master 5 skills with old lastPracticedAt dates (15+ days ago)
    const firstFive = SKILL_TREE.slice(0, 5).map((n) => n.id);
    const skillMasteryData = buildDecayedMasteryData(firstFive, 15);

    // selectSessionType should return 'review' or 'mixed' because
    // 5 decayed skills >= 3 threshold for 'review'
    const sessionType = selectSessionType(firstFive, skillMasteryData, 0);
    expect(['review', 'mixed']).toContain(sessionType);
  });

  it('should trigger challenge sessions every 5th exercise', () => {
    // The engine triggers challenge when totalExercisesCompleted > 0 && % 5 === 0
    expect(selectSessionType([], {}, 5)).toBe('challenge');
    expect(selectSessionType([], {}, 10)).toBe('challenge');
    expect(selectSessionType([], {}, 15)).toBe('challenge');

    // Non-challenge counts should NOT produce challenge
    expect(selectSessionType([], {}, 0)).not.toBe('challenge');
    expect(selectSessionType([], {}, 1)).not.toBe('challenge');
    expect(selectSessionType([], {}, 3)).not.toBe('challenge');
    expect(selectSessionType([], {}, 6)).not.toBe('challenge');
  });

  it('should respect prerequisite ordering through full progression', () => {
    const mastered: string[] = [];
    const masteredSet = new Set<string>();
    let iterations = 0;

    while (iterations < SKILL_TREE.length + 10) {
      const next = getNextSkillToLearn(mastered);
      if (!next) break;

      // Every prerequisite of the returned skill MUST already be mastered
      for (const prereq of next.prerequisites) {
        expect(masteredSet.has(prereq)).toBe(true);
      }

      mastered.push(next.id);
      masteredSet.add(next.id);
      iterations++;
    }

    // Confirm we walked the entire tree
    expect(mastered.length).toBe(SKILL_TREE.length);
  });

  it('session type distribution over 365 days should show variety', () => {
    const masteredSkills: string[] = [];
    const skillMasteryData: Record<string, SkillMasteryRecord> = {};
    let totalExercisesCompleted = 0;
    const msPerDay = 86400000;
    const sessionTypeCounts: Record<string, number> = {};

    for (let day = 0; day < 365; day++) {
      // Simulate decay: age all mastery records by 1 day each iteration
      // so that older skills gradually decay and trigger review sessions
      for (const id of Object.keys(skillMasteryData)) {
        skillMasteryData[id] = {
          ...skillMasteryData[id],
          lastPracticedAt: skillMasteryData[id].lastPracticedAt - msPerDay,
        };
      }

      const profile = makeProfile({
        masteredSkills: [...masteredSkills],
        skillMasteryData: { ...skillMasteryData },
        totalExercisesCompleted,
      });

      const plan = generateSessionPlan(profile, [...masteredSkills]);

      // Track session type
      sessionTypeCounts[plan.sessionType] =
        (sessionTypeCounts[plan.sessionType] ?? 0) + 1;

      const allRefs = [...plan.warmUp, ...plan.lesson, ...plan.challenge];
      totalExercisesCompleted += allRefs.length;

      // Master the next available skill and mark it as freshly practiced
      const next = getNextSkillToLearn(masteredSkills);
      if (next) {
        masteredSkills.push(next.id);
        const now = Date.now();
        skillMasteryData[next.id] = {
          masteredAt: now,
          lastPracticedAt: now,
          completionCount: next.requiredCompletions,
          decayScore: 1.0,
        };
      }
    }

    // We should see at least 3 different session types
    const distinctTypes = Object.keys(sessionTypeCounts);
    expect(distinctTypes.length).toBeGreaterThanOrEqual(3);

    // Verify the expected types appear
    expect(sessionTypeCounts['new-material']).toBeGreaterThan(0);
    expect(sessionTypeCounts['challenge']).toBeGreaterThan(0);
    // At least one of 'review' or 'mixed' should appear from decay
    const reviewOrMixed =
      (sessionTypeCounts['review'] ?? 0) + (sessionTypeCounts['mixed'] ?? 0);
    expect(reviewOrMixed).toBeGreaterThan(0);
  });
});

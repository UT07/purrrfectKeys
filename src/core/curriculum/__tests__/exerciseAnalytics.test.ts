import {
  recordExerciseScore,
  getFlaggedExercises,
  isExerciseFlagged,
  getExerciseTrend,
  type ExerciseAnalyticsData,
} from '../exerciseAnalytics';

function emptyData(): ExerciseAnalyticsData {
  return { scores: {} };
}

describe('exerciseAnalytics', () => {
  describe('recordExerciseScore', () => {
    it('records first score for an exercise', () => {
      const data = recordExerciseScore(emptyData(), 'ex-1', 85);
      expect(data.scores['ex-1']).toHaveLength(1);
      expect(data.scores['ex-1'][0].score).toBe(85);
    });

    it('appends subsequent scores', () => {
      let data = emptyData();
      data = recordExerciseScore(data, 'ex-1', 85);
      data = recordExerciseScore(data, 'ex-1', 90);
      expect(data.scores['ex-1']).toHaveLength(2);
    });

    it('caps at 20 scores', () => {
      let data = emptyData();
      for (let i = 0; i < 25; i++) {
        data = recordExerciseScore(data, 'ex-1', 50 + i);
      }
      expect(data.scores['ex-1']).toHaveLength(20);
      // Should keep the most recent
      expect(data.scores['ex-1'][19].score).toBe(74);
    });
  });

  describe('getFlaggedExercises', () => {
    it('does not flag with too few attempts', () => {
      let data = emptyData();
      data = recordExerciseScore(data, 'ex-1', 30);
      data = recordExerciseScore(data, 'ex-1', 40);
      expect(getFlaggedExercises(data)).toHaveLength(0);
    });

    it('flags exercise with high fail rate', () => {
      let data = emptyData();
      for (let i = 0; i < 5; i++) {
        data = recordExerciseScore(data, 'ex-hard', 40); // All fail
      }
      const flagged = getFlaggedExercises(data);
      expect(flagged).toHaveLength(1);
      expect(flagged[0].exerciseId).toBe('ex-hard');
      expect(flagged[0].failRate).toBe(1.0);
    });

    it('flags exercise with low average score', () => {
      let data = emptyData();
      data = recordExerciseScore(data, 'ex-meh', 45);
      data = recordExerciseScore(data, 'ex-meh', 48);
      data = recordExerciseScore(data, 'ex-meh', 42);
      const flagged = getFlaggedExercises(data);
      expect(flagged).toHaveLength(1);
      expect(flagged[0].avgScore).toBeLessThan(50);
    });

    it('does not flag successful exercises', () => {
      let data = emptyData();
      for (let i = 0; i < 5; i++) {
        data = recordExerciseScore(data, 'ex-good', 85 + i);
      }
      expect(getFlaggedExercises(data)).toHaveLength(0);
    });

    it('sorts flagged by avg score ascending', () => {
      let data = emptyData();
      for (let i = 0; i < 4; i++) {
        data = recordExerciseScore(data, 'ex-bad', 30);
        data = recordExerciseScore(data, 'ex-worse', 20);
      }
      const flagged = getFlaggedExercises(data);
      expect(flagged[0].exerciseId).toBe('ex-worse');
    });
  });

  describe('isExerciseFlagged', () => {
    it('returns false for untracked exercise', () => {
      expect(isExerciseFlagged(emptyData(), 'ex-unknown')).toBe(false);
    });

    it('returns true for flagged exercise', () => {
      let data = emptyData();
      for (let i = 0; i < 5; i++) {
        data = recordExerciseScore(data, 'ex-bad', 35);
      }
      expect(isExerciseFlagged(data, 'ex-bad')).toBe(true);
    });
  });

  describe('getExerciseTrend', () => {
    it('returns 0 for insufficient data', () => {
      let data = emptyData();
      data = recordExerciseScore(data, 'ex-1', 80);
      expect(getExerciseTrend(data, 'ex-1')).toBe(0);
    });

    it('returns positive for improving scores', () => {
      let data = emptyData();
      const scores = [50, 55, 60, 70, 80, 90];
      for (const s of scores) {
        data = recordExerciseScore(data, 'ex-improving', s);
      }
      expect(getExerciseTrend(data, 'ex-improving')).toBeGreaterThan(0);
    });

    it('returns negative for declining scores', () => {
      let data = emptyData();
      const scores = [90, 85, 80, 60, 50, 40];
      for (const s of scores) {
        data = recordExerciseScore(data, 'ex-declining', s);
      }
      expect(getExerciseTrend(data, 'ex-declining')).toBeLessThan(0);
    });
  });
});

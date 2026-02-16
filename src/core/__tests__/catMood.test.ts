import { calculateCatMood } from '../catMood';

describe('calculateCatMood', () => {
  const now = new Date('2026-02-16T12:00:00Z');

  it('returns happy when practiced today with good score and active streak', () => {
    const mood = calculateCatMood({
      lastPracticeDate: '2026-02-16',
      recentScore: 0.8,
      currentStreak: 3,
      now,
    });
    expect(mood).toBe('happy');
  });

  it('returns neutral when practiced in last 48h', () => {
    const mood = calculateCatMood({
      lastPracticeDate: '2026-02-15',
      recentScore: 0.5,
      currentStreak: 1,
      now,
    });
    expect(mood).toBe('neutral');
  });

  it('returns sleepy when no practice in 48h+', () => {
    const mood = calculateCatMood({
      lastPracticeDate: '2026-02-13',
      recentScore: 0,
      currentStreak: 0,
      now,
    });
    expect(mood).toBe('sleepy');
  });

  it('returns happy even with low score if practiced today and has streak', () => {
    const mood = calculateCatMood({
      lastPracticeDate: '2026-02-16',
      recentScore: 0.5,
      currentStreak: 5,
      now,
    });
    expect(mood).toBe('happy');
  });

  it('returns neutral when practiced today but low score and no streak', () => {
    const mood = calculateCatMood({
      lastPracticeDate: '2026-02-16',
      recentScore: 0.3,
      currentStreak: 0,
      now,
    });
    expect(mood).toBe('neutral');
  });
});

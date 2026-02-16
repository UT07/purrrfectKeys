export type CatMood = 'happy' | 'neutral' | 'sleepy';

interface MoodInput {
  lastPracticeDate: string; // YYYY-MM-DD
  recentScore: number; // 0.0-1.0
  currentStreak: number;
  now?: Date;
}

export function calculateCatMood(input: MoodInput): CatMood {
  const now = input.now ?? new Date();
  const today = now.toISOString().slice(0, 10);

  if (!input.lastPracticeDate) return 'sleepy';

  const lastPractice = new Date(input.lastPracticeDate + 'T00:00:00Z');
  const hoursSince = (now.getTime() - lastPractice.getTime()) / (1000 * 60 * 60);

  if (hoursSince >= 48) return 'sleepy';

  const practicedToday = input.lastPracticeDate === today;
  if (practicedToday && (input.recentScore >= 0.7 || input.currentStreak >= 3)) {
    return 'happy';
  }

  return 'neutral';
}

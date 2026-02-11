/**
 * Input validation utilities
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): {
  isStrong: boolean;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('At least 8 characters');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Include uppercase letters');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Include numbers');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Include special characters');

  return {
    isStrong: score >= 4,
    feedback,
  };
}

/**
 * Validate MIDI note range
 */
export function isValidMidiNote(note: number): boolean {
  return Number.isInteger(note) && note >= 0 && note <= 127;
}

/**
 * Validate tempo (BPM)
 */
export function isValidTempo(tempo: number): boolean {
  return Number.isInteger(tempo) && tempo >= 20 && tempo <= 300;
}

/**
 * Validate difficulty level
 */
export function isValidDifficulty(difficulty: unknown): difficulty is 1 | 2 | 3 | 4 | 5 {
  return typeof difficulty === 'number' && [1, 2, 3, 4, 5].includes(difficulty);
}

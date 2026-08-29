/**
 * Regression: song list rendered "NaN:NaN" for songs missing durationSeconds
 * (observed on "A Bar Song" during device QA).
 */
import { formatDuration, DURATION_PLACEHOLDER } from '../formatDuration';

describe('formatDuration', () => {
  it('formats a normal duration', () => {
    expect(formatDuration(83)).toBe('1:23');
  });

  it('zero-pads seconds', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(60)).toBe('1:00');
  });

  it('handles sub-minute durations', () => {
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('does not roll minutes over at an hour', () => {
    expect(formatDuration(3600)).toBe('60:00');
  });

  it('rounds fractional seconds', () => {
    expect(formatDuration(83.4)).toBe('1:23');
    expect(formatDuration(83.6)).toBe('1:24');
  });

  describe('never emits NaN', () => {
    it.each([
      ['undefined', undefined],
      ['null', null],
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['-Infinity', -Infinity],
      ['negative', -30],
    ])('returns the placeholder for %s', (_label, value) => {
      const out = formatDuration(value as number | null | undefined);
      expect(out).toBe(DURATION_PLACEHOLDER);
      expect(out).not.toContain('NaN');
    });
  });
});

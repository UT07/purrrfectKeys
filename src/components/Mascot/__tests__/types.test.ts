/**
 * Mascot Types Tests
 *
 * Tests the MascotMood, MascotSize types, and MASCOT_SIZES constant.
 * Validates type exports, size values, and completeness.
 */

import { MASCOT_SIZES } from '../types';
import type { MascotMood, MascotSize } from '../types';

describe('Mascot types', () => {
  describe('MASCOT_SIZES', () => {
    it('has exactly 4 size entries', () => {
      expect(Object.keys(MASCOT_SIZES)).toHaveLength(4);
    });

    it('tiny is 24 pixels', () => {
      expect(MASCOT_SIZES.tiny).toBe(24);
    });

    it('small is 40 pixels', () => {
      expect(MASCOT_SIZES.small).toBe(40);
    });

    it('medium is 56 pixels', () => {
      expect(MASCOT_SIZES.medium).toBe(56);
    });

    it('large is 80 pixels', () => {
      expect(MASCOT_SIZES.large).toBe(80);
    });

    it('contains the keys tiny, small, medium, large', () => {
      const keys = Object.keys(MASCOT_SIZES);
      expect(keys).toContain('tiny');
      expect(keys).toContain('small');
      expect(keys).toContain('medium');
      expect(keys).toContain('large');
    });

    it('all values are positive numbers', () => {
      for (const [_key, value] of Object.entries(MASCOT_SIZES)) {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      }
    });

    it('sizes are in ascending order', () => {
      expect(MASCOT_SIZES.tiny).toBeLessThan(MASCOT_SIZES.small);
      expect(MASCOT_SIZES.small).toBeLessThan(MASCOT_SIZES.medium);
      expect(MASCOT_SIZES.medium).toBeLessThan(MASCOT_SIZES.large);
    });
  });

  describe('MascotMood type', () => {
    it('all moods are valid string values', () => {
      // Test that the type system allows these values by assigning them
      const moods: MascotMood[] = [
        'happy',
        'encouraging',
        'excited',
        'teaching',
        'celebrating',
      ];
      expect(moods).toHaveLength(5);
    });
  });

  describe('MascotSize type', () => {
    it('all sizes are valid string values', () => {
      const sizes: MascotSize[] = ['tiny', 'small', 'medium', 'large'];
      expect(sizes).toHaveLength(4);
    });

    it('each size has a corresponding MASCOT_SIZES entry', () => {
      const sizes: MascotSize[] = ['tiny', 'small', 'medium', 'large'];
      for (const size of sizes) {
        expect(MASCOT_SIZES[size]).toBeDefined();
        expect(typeof MASCOT_SIZES[size]).toBe('number');
      }
    });
  });
});

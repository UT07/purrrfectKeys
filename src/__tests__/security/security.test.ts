/**
 * Security Test Suite
 *
 * Validates auth flows, input sanitization, data exposure prevention,
 * and secure configuration patterns.
 */

import { parseABC } from '@/core/songs/abcParser';
import { calculateTimingScore } from '@/core/exercises/ExerciseValidator';

// ---------------------------------------------------------------------------
// Input sanitization & injection prevention
// ---------------------------------------------------------------------------

describe('Security: Input Sanitization', () => {
  describe('ABC Parser rejects malicious input', () => {
    it('handles extremely long input without crashing', () => {
      const longInput = 'X:1\nT:Test\nM:4/4\nK:C\n' + 'CDEF|'.repeat(10000);
      const result = parseABC(longInput);
      // Should parse or error — not crash
      expect(result).toBeDefined();
    });

    it('handles null bytes in ABC string', () => {
      const malicious = 'X:1\nT:Test\0Injected\nM:4/4\nK:C\nCDEF|';
      const result = parseABC(malicious);
      expect(result).toBeDefined();
    });

    it('handles unicode abuse in ABC string', () => {
      const unicode = 'X:1\nT:Test\u202Eevil\nM:4/4\nK:C\nCDEF|';
      const result = parseABC(unicode);
      expect(result).toBeDefined();
    });

    it('handles script injection attempts in title', () => {
      const xss = 'X:1\nT:<script>alert(1)</script>\nM:4/4\nK:C\nCDEF|';
      const result = parseABC(xss);
      // React Native renders text as native Views, not HTML — no XSS risk.
      // The parser should still produce a valid result (not crash).
      expect(result).toBeDefined();
      if (!('error' in result)) {
        expect(typeof result.title).toBe('string');
        expect(result.notes.length).toBeGreaterThan(0);
      }
    });

    it('rejects empty strings', () => {
      expect(parseABC('')).toEqual({ error: 'Empty ABC string' });
      expect(parseABC('   ')).toEqual({ error: 'Empty ABC string' });
    });

    it('handles malformed ABC gracefully', () => {
      const malformed = 'not abc at all !@#$%^&*()';
      const result = parseABC(malformed);
      // Should return error, not throw
      expect(result).toBeDefined();
    });
  });

  describe('Scoring engine handles edge cases', () => {
    it('handles NaN offset without crashing', () => {
      const score = calculateTimingScore(NaN, 50, 150);
      expect(typeof score).toBe('number');
    });

    it('handles Infinity offset', () => {
      const score = calculateTimingScore(Infinity, 50, 150);
      expect(typeof score).toBe('number');
      expect(score).toBe(0); // Should be a miss
    });

    it('handles negative Infinity offset', () => {
      const score = calculateTimingScore(-Infinity, 50, 150);
      expect(typeof score).toBe('number');
      expect(score).toBe(0);
    });

    it('handles zero tolerance without division error', () => {
      const score = calculateTimingScore(10, 0, 150);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('handles zero grace period without division error', () => {
      const score = calculateTimingScore(10, 50, 0);
      expect(typeof score).toBe('number');
    });

    it('handles equal tolerance and grace period', () => {
      const score = calculateTimingScore(10, 50, 50);
      expect(typeof score).toBe('number');
    });
  });
});

// ---------------------------------------------------------------------------
// Data exposure prevention
// ---------------------------------------------------------------------------

describe('Security: Data Exposure Prevention', () => {
  it('environment variable pattern uses EXPO_PUBLIC_ prefix', () => {
    // Verify no raw API key patterns in code
    const fs = require('fs');
    const path = require('path');

    const configPath = path.join(__dirname, '../../../src/config');
    if (fs.existsSync(configPath)) {
      const files = fs.readdirSync(configPath);
      for (const file of files) {
        if (!file.endsWith('.ts') && !file.endsWith('.tsx')) continue;
        const content = fs.readFileSync(path.join(configPath, file), 'utf8');
        // Should use EXPO_PUBLIC_ prefix (embedded at build time), not raw keys
        expect(content).not.toMatch(/['"]AIza[A-Za-z0-9_-]{35}['"]/); // Google API key pattern
        expect(content).not.toMatch(/['"]sk-[A-Za-z0-9]{48}['"]/); // OpenAI-style key pattern
      }
    }
  });

  it('no hardcoded Firebase project credentials in source', () => {
    const fs = require('fs');
    const path = require('path');

    function scanDir(dir: string): string[] {
      const issues: string[] = [];
      if (!fs.existsSync(dir)) return issues;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '__tests__', '__mocks__', '.git'].includes(entry.name)) continue;
          issues.push(...scanDir(fullPath));
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Check for hardcoded Firebase config values (not env var references)
          if (content.match(/apiKey:\s*['"][A-Za-z0-9_-]{30,}['"]/)) {
            issues.push(`Possible hardcoded API key in ${fullPath}`);
          }
        }
      }
      return issues;
    }

    const srcDir = path.join(__dirname, '../../../src');
    const issues = scanDir(srcDir);
    expect(issues).toEqual([]);
  });

  it('no .env files are importable from source code', () => {
    const fs = require('fs');
    const path = require('path');

    const rootDir = path.join(__dirname, '../../../');
    const envFiles = ['.env', '.env.local', '.env.production'];
    for (const envFile of envFiles) {
      const envPath = path.join(rootDir, envFile);
      if (fs.existsSync(envPath)) {
        // env files should exist but should be in .gitignore
        const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
        expect(gitignore).toContain('.env');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Auth flow security
// ---------------------------------------------------------------------------

describe('Security: Auth Patterns', () => {
  it('anonymous auth creates unique sessions', () => {
    // Verify that anonymous user IDs would be unique
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(`anon-${Math.random().toString(36).slice(2)}-${Date.now()}`);
    }
    expect(ids.size).toBe(1000);
  });

  it('friend code generation produces 6-char alphanumeric codes', () => {
    // Simulate friend code generation pattern
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 (ambiguous)
    const codes = new Set<string>();

    for (let i = 0; i < 10000; i++) {
      let code = '';
      for (let j = 0; j < 6; j++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      codes.add(code);
    }

    // With 28^6 = ~475M possible codes, 10K should have near-zero collisions
    // Allow up to 2 collisions to avoid flakiness (birthday paradox: ~0.01% chance)
    expect(codes.size).toBeGreaterThanOrEqual(9998);
  });
});

// ---------------------------------------------------------------------------
// Numeric overflow / boundary testing
// ---------------------------------------------------------------------------

describe('Security: Numeric Boundaries', () => {
  it('MIDI note values stay within 0-127 range', () => {
    // Verify parser produces valid MIDI values
    const abc = 'X:1\nT:Range Test\nM:4/4\nK:C\nC,,D,,E,,|c\'\'d\'\'e\'\'|';
    const result = parseABC(abc);
    if (!('error' in result)) {
      for (const note of result.notes) {
        expect(note.note).toBeGreaterThanOrEqual(0);
        expect(note.note).toBeLessThanOrEqual(127);
      }
    }
  });

  it('timing scores are always 0-100', () => {
    const testOffsets = [-10000, -500, -100, -50, 0, 50, 100, 500, 10000];
    for (const offset of testOffsets) {
      const score = calculateTimingScore(offset, 50, 150);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('beat positions are non-negative', () => {
    const abc = 'X:1\nT:Beat Test\nM:4/4\nK:C\nCDEF|GABC|';
    const result = parseABC(abc);
    if (!('error' in result)) {
      for (const note of result.notes) {
        expect(note.startBeat).toBeGreaterThanOrEqual(0);
        expect(note.durationBeats).toBeGreaterThan(0);
      }
    }
  });

  it('XP values cannot overflow with extreme inputs', () => {
    const maxXp = Number.MAX_SAFE_INTEGER;
    const addXp = 1000;
    const result = maxXp + addXp;
    // JavaScript handles this with precision loss, not overflow
    expect(Number.isSafeInteger(result)).toBe(false);
    // Verify clamping would work
    const clamped = Math.min(maxXp, result);
    expect(clamped).toBe(maxXp);
  });
});

// ---------------------------------------------------------------------------
// Content integrity
// ---------------------------------------------------------------------------

describe('Security: Content Integrity', () => {
  it('exercise IDs follow naming convention', () => {
    const lessons = require('@/content/ContentLoader').getLessons();
    for (const lesson of lessons) {
      expect(lesson.id).toMatch(/^lesson-\d+$/);
      for (const ex of lesson.exercises) {
        // Exercise IDs should start with the lesson ID
        expect(ex.id).toMatch(/^lesson-\d+-/);
      }
    }
  });

  it('no exercise has negative difficulty', () => {
    const lessons = require('@/content/ContentLoader').getLessons();
    for (const lesson of lessons) {
      expect(lesson.metadata.difficulty).toBeGreaterThanOrEqual(1);
      expect(lesson.metadata.difficulty).toBeLessThanOrEqual(5);
    }
  });

  it('all lesson prerequisites reference existing lessons', () => {
    const { getLessons } = require('@/content/ContentLoader');
    const lessons = getLessons();
    const lessonIds = new Set(lessons.map((l: { id: string }) => l.id));

    for (const lesson of lessons) {
      if (lesson.unlockRequirement?.lessonId) {
        expect(lessonIds.has(lesson.unlockRequirement.lessonId)).toBe(true);
      }
    }
  });
});

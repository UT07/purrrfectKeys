/**
 * Regression Tests — Recurring Bug Patterns
 *
 * These tests codify anti-patterns that have caused bugs in this codebase.
 * Each test verifies that the codebase does NOT contain a known bad pattern.
 * If a test fails, it means a past bug has been reintroduced.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORES_DIR = path.resolve(__dirname, '../../stores');
const SRC_DIR = path.resolve(__dirname, '../..');

/** Read a file's contents, returning empty string if not found */
function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

/** Recursively get all .ts/.tsx files under a directory */
function getSourceFiles(dir: string, extensions = ['.ts', '.tsx']): string[] {
  const results: string[] = [];
  function walk(d: string): void {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
        walk(full);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

/** Get all store files (excluding tests, types, index, hooks, persistence) */
function getStoreFiles(): string[] {
  return fs.readdirSync(STORES_DIR)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
    .filter((f) => !f.startsWith('__'))
    .filter((f) => f !== 'types.ts' && f !== 'index.ts' && f !== 'hooks.ts' && f !== 'persistence.ts')
    .map((f) => path.join(STORES_DIR, f));
}

// ---------------------------------------------------------------------------
// Test 1: UTC vs local timezone — toISOString().split('T')[0] is a known
// source of off-by-one-day bugs for users west of UTC after midnight local.
// Non-test source files should prefer local-date helpers.
// ---------------------------------------------------------------------------
describe('UTC date anti-pattern', () => {
  it('source files (non-test) that use toISOString date keys are tracked', () => {
    const sourceFiles = getSourceFiles(SRC_DIR);
    const violations: string[] = [];

    for (const file of sourceFiles) {
      // Skip test files — they can use any pattern
      if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) continue;
      // Skip the README
      if (file.endsWith('.md')) continue;

      const content = readFile(file);
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('toISOString().split')) {
          violations.push(`${path.relative(SRC_DIR, file)}:${i + 1}`);
        }
      }
    }

    // This is a tracking test. If new uses appear, the developer should
    // verify that UTC is intentional (e.g., server-side date keys) or
    // switch to a local-date helper.
    // Current known uses are documented here. If the count increases,
    // the test forces a review.
    const MAX_KNOWN_USES = 15;
    if (violations.length > MAX_KNOWN_USES) {
       
      console.warn('UTC date pattern locations:', violations);
    }
    expect(violations.length).toBeLessThanOrEqual(MAX_KNOWN_USES);
  });
});

// ---------------------------------------------------------------------------
// Test 2: Zustand set() updaters must not call debouncedSave or
// immediateSave inside the updater callback — it can double-fire in
// strict mode. Save must happen AFTER set() returns.
// ---------------------------------------------------------------------------
describe('Zustand set() side-effect safety', () => {
  it('no debouncedSave or immediateSave calls inside set() updaters', () => {
    const storeFiles = getStoreFiles();
    const violations: string[] = [];

    for (const file of storeFiles) {
      const content = readFile(file);
      const lines = content.split('\n');

      // Track nesting: when we see set((state) => { we are "inside" an updater
      // until we see the matching closing. This is a simple heuristic.
      let insideSetUpdater = false;
      let braceDepth = 0;
      let setStartLine = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect set((state) => { or set((state) => ({
        if (!insideSetUpdater && /set\(\(state\)\s*=>/.test(line)) {
          insideSetUpdater = true;
          setStartLine = i + 1;
          // Count opening braces on this line
          braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          // If it opens and closes on the same line, skip
          if (braceDepth <= 0) {
            insideSetUpdater = false;
          }
          continue;
        }

        if (insideSetUpdater) {
          braceDepth += (line.match(/\{/g) || []).length;
          braceDepth -= (line.match(/\}/g) || []).length;

          // Check for the anti-pattern
          if (/debouncedSave|immediateSave/.test(line) && !/\/\//.test(line.split('debouncedSave')[0]) && !/\/\//.test(line.split('immediateSave')[0])) {
            const rel = path.relative(STORES_DIR, file);
            violations.push(`${rel}:${i + 1} (set() started at line ${setStartLine})`);
          }

          if (braceDepth <= 0) {
            insideSetUpdater = false;
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Test 3: gemStore must use immediateSave, not debouncedSave, for all
// balance-changing operations (earnGems, spendGems, claimReward).
// ---------------------------------------------------------------------------
describe('gemStore persistence safety', () => {
  it('uses immediateSave for balance changes', () => {
    const gemStorePath = path.join(STORES_DIR, 'gemStore.ts');
    const content = readFile(gemStorePath);

    // The gem store should define immediateSave
    expect(content).toContain('createImmediateSave');

    // Find the implementation section (after the create() call, not the type definition)
    const createIdx = content.indexOf('create<GemStoreState>');
    const implSection = content.slice(createIdx);

    // After earnGems set(), there must be immediateSave
    const earnSection = implSection.slice(
      implSection.indexOf('earnGems:'),
      implSection.indexOf('spendGems:')
    );
    expect(earnSection).toContain('immediateSave');
    expect(earnSection).not.toContain('debouncedSave');

    // After spendGems set(), there must be immediateSave
    const spendSection = implSection.slice(
      implSection.indexOf('spendGems:'),
      implSection.indexOf('canAfford:')
    );
    expect(spendSection).toContain('immediateSave');
    expect(spendSection).not.toContain('debouncedSave');
  });
});

// ---------------------------------------------------------------------------
// Test 4: All stores with reset() must be included in resetAllStores()
// in authStore.ts. Missing a store means stale data survives sign-out.
// ---------------------------------------------------------------------------
describe('resetAllStores completeness', () => {
  it('every store with a reset() method is included in resetAllStores()', () => {
    const authContent = readFile(path.join(STORES_DIR, 'authStore.ts'));
    const resetAllSection = authContent.slice(
      authContent.indexOf('function resetAllStores'),
      authContent.indexOf('}', authContent.indexOf('for (const { name, reset } of stores)') + 50)
    );

    const storeFiles = getStoreFiles();

    for (const file of storeFiles) {
      const basename = path.basename(file, '.ts');
      // authStore doesn't reset itself
      if (basename === 'authStore') continue;

      const content = readFile(file);

      // Check if this store exports a hook with a reset method
      const hasReset = /reset\s*[:=]\s*\(\)/.test(content);
      if (!hasReset) continue;

      // Extract the store hook name (e.g., useProgressStore from progressStore.ts)
      const hookMatch = content.match(/export const (use\w+Store)/);
      if (!hookMatch) continue;

      const hookName = hookMatch[1];
      const included = resetAllSection.includes(hookName);

      if (!included) {
        fail(`Store ${basename} has reset() but ${hookName} is NOT in resetAllStores(). Add it to authStore.ts.`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Test 5: CatAvatar pixelSize must be <= 0.65x of container dimension so
// the full cat (including ears) fits within the circular clip boundary.
// The previous 0.75 multiplier caused ears to poke out and look broken.
// ---------------------------------------------------------------------------
describe('CatAvatar sizing', () => {
  it('pixelSize multiplier keeps ears within circle boundary', () => {
    const catAvatarPath = path.join(SRC_DIR, 'components', 'Mascot', 'CatAvatar.tsx');
    const content = readFile(catAvatarPath);

    // Extract the pixelSize multiplier (e.g., dimension * 0.62)
    const match = content.match(/pixelSize=\{Math\.round\(dimension \* ([\d.]+)\)\}/);
    expect(match).not.toBeNull();
    const multiplier = parseFloat(match![1]);
    expect(multiplier).toBeLessThanOrEqual(0.65);
    expect(multiplier).toBeGreaterThanOrEqual(0.5); // not too small either
  });
});

#!/usr/bin/env npx tsx
/**
 * Codebase Health Check
 *
 * Run: npm run health
 *
 * Checks:
 * 1. TypeScript errors
 * 2. Lint errors
 * 3. Test suite count
 * 4. All stores have reset() methods
 * 5. All stores are included in resetAllStores()
 * 6. UTC date anti-pattern usage
 * 7. debouncedSave inside Zustand set() updaters
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const STORES_DIR = path.join(ROOT, 'src', 'stores');
const SRC_DIR = path.join(ROOT, 'src');

let exitCode = 0;
const warnings: string[] = [];
const errors: string[] = [];

function runCmd(cmd: string, args: string[], label: string): { ok: boolean; output: string } {
  try {
    const output = execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' });
    console.log(`  PASS  ${label}`);
    return { ok: true, output };
  } catch (e: unknown) {
    const error = e as { stdout?: string; stderr?: string; status?: number };
    console.log(`  FAIL  ${label}`);
    return { ok: false, output: (error.stdout || '') + (error.stderr || '') };
  }
}

function readFile(filePath: string): string {
  try { return fs.readFileSync(filePath, 'utf-8'); } catch { return ''; }
}

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

function getStoreFiles(): string[] {
  return fs.readdirSync(STORES_DIR)
    .filter((f) => f.endsWith('.ts'))
    .filter((f) => !f.startsWith('__'))
    .filter((f) => !['types.ts', 'index.ts', 'hooks.ts', 'persistence.ts'].includes(f))
    .map((f) => path.join(STORES_DIR, f));
}

// ── Banner ──────────────────────────────────────────────────────────────
console.log('\n=== Purrrfect Keys Health Check ===\n');

// ── 1. TypeScript ───────────────────────────────────────────────────────
console.log('[1/7] TypeScript');
const tsc = runCmd('npx', ['tsc', '--noEmit'], 'Zero TypeScript errors');
if (!tsc.ok) {
  const errorLines = tsc.output.split('\n').filter((l) => l.includes('error TS'));
  errors.push(`TypeScript: ${errorLines.length} error(s)`);
  for (const line of errorLines.slice(0, 5)) {
    console.log(`        ${line.trim()}`);
  }
  exitCode = 1;
}

// ── 2. Lint ─────────────────────────────────────────────────────────────
console.log('\n[2/7] Lint');
const lint = runCmd('npx', ['eslint', '.', '--quiet'], 'Zero lint errors (--quiet = errors only)');
if (!lint.ok) {
  errors.push('ESLint: errors found (run npm run lint for details)');
  exitCode = 1;
}

// ── 3. Test suites ──────────────────────────────────────────────────────
console.log('\n[3/7] Test suites');
const testResult = runCmd('npx', ['jest', '--passWithNoTests', '--json'], 'Jest runs successfully');
if (testResult.ok) {
  try {
    const json = JSON.parse(testResult.output);
    const suites = json.numPassedTestSuites || 0;
    const tests = json.numPassedTests || 0;
    const failed = json.numFailedTests || 0;
    console.log(`        ${suites} suites, ${tests} tests passed, ${failed} failed`);
    if (failed > 0) {
      errors.push(`Jest: ${failed} test(s) failing`);
      exitCode = 1;
    }
  } catch {
    console.log('        (Could not parse Jest JSON output)');
  }
} else {
  errors.push('Jest: failed to run');
  exitCode = 1;
}

// ── 4. Store reset() methods ────────────────────────────────────────────
console.log('\n[4/7] Store reset() completeness');
{
  const storeFiles = getStoreFiles();
  const storesWithReset: string[] = [];
  const storesWithoutReset: string[] = [];

  for (const file of storeFiles) {
    const basename = path.basename(file, '.ts');
    if (basename === 'authStore') continue;

    const content = readFile(file);
    const hasReset = /reset\s*[:=]\s*\(\)/.test(content);
    if (hasReset) {
      storesWithReset.push(basename);
    } else {
      storesWithoutReset.push(basename);
    }
  }

  console.log(`        ${storesWithReset.length} stores have reset(), ${storesWithoutReset.length} without`);
  if (storesWithoutReset.length > 0) {
    warnings.push(`Stores without reset(): ${storesWithoutReset.join(', ')}`);
  }
}

// ── 5. resetAllStores() completeness ────────────────────────────────────
console.log('\n[5/7] resetAllStores() includes all stores');
{
  const authContent = readFile(path.join(STORES_DIR, 'authStore.ts'));
  const resetSection = authContent.slice(
    authContent.indexOf('function resetAllStores'),
    authContent.indexOf('}', authContent.indexOf('for (const { name, reset } of stores)') + 50)
  );

  const storeFiles = getStoreFiles();
  const missing: string[] = [];

  for (const file of storeFiles) {
    const basename = path.basename(file, '.ts');
    if (basename === 'authStore') continue;

    const content = readFile(file);
    const hasReset = /reset\s*[:=]\s*\(\)/.test(content);
    if (!hasReset) continue;

    const hookMatch = content.match(/export const (use\w+Store)/);
    if (!hookMatch) continue;

    if (!resetSection.includes(hookMatch[1])) {
      missing.push(`${basename} (${hookMatch[1]})`);
    }
  }

  if (missing.length === 0) {
    console.log('  PASS  All resettable stores are in resetAllStores()');
  } else {
    console.log('  FAIL  Missing from resetAllStores():', missing.join(', '));
    errors.push(`resetAllStores missing: ${missing.join(', ')}`);
    exitCode = 1;
  }
}

// ── 6. UTC date anti-pattern ────────────────────────────────────────────
console.log('\n[6/7] UTC date anti-pattern (toISOString().split)');
{
  const sourceFiles = getSourceFiles(SRC_DIR);
  const hits: string[] = [];

  for (const file of sourceFiles) {
    if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) continue;
    const content = readFile(file);
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('toISOString().split')) {
        hits.push(`${path.relative(ROOT, file)}:${i + 1}`);
      }
    }
  }

  console.log(`        ${hits.length} usage(s) found in non-test source files`);
  if (hits.length > 0) {
    warnings.push(`UTC date pattern in ${hits.length} location(s) — verify intentional`);
    for (const h of hits) {
      console.log(`        - ${h}`);
    }
  }
}

// ── 7. debouncedSave inside set() updaters ──────────────────────────────
console.log('\n[7/7] debouncedSave/immediateSave inside Zustand set() updaters');
{
  const storeFiles = getStoreFiles();
  const violations: string[] = [];

  for (const file of storeFiles) {
    const content = readFile(file);
    const lines = content.split('\n');

    let insideSetUpdater = false;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!insideSetUpdater && /set\(\(state\)\s*=>/.test(line)) {
        insideSetUpdater = true;
        braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        if (braceDepth <= 0) insideSetUpdater = false;
        continue;
      }

      if (insideSetUpdater) {
        braceDepth += (line.match(/\{/g) || []).length;
        braceDepth -= (line.match(/\}/g) || []).length;

        if (/debouncedSave|immediateSave/.test(line)) {
          const commentIdx = line.indexOf('//');
          const saveIdx = Math.min(
            line.indexOf('debouncedSave') >= 0 ? line.indexOf('debouncedSave') : Infinity,
            line.indexOf('immediateSave') >= 0 ? line.indexOf('immediateSave') : Infinity
          );
          if (commentIdx < 0 || saveIdx < commentIdx) {
            violations.push(`${path.relative(ROOT, file)}:${i + 1}`);
          }
        }

        if (braceDepth <= 0) insideSetUpdater = false;
      }
    }
  }

  if (violations.length === 0) {
    console.log('  PASS  No save calls inside set() updaters');
  } else {
    console.log('  FAIL  Save calls found inside set() updaters:');
    for (const v of violations) {
      console.log(`        - ${v}`);
    }
    errors.push(`Save inside set() updater: ${violations.length} violation(s)`);
    exitCode = 1;
  }
}

// ── Summary ─────────────────────────────────────────────────────────────
console.log('\n=== Summary ===');
if (errors.length === 0 && warnings.length === 0) {
  console.log('All checks passed.\n');
} else {
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) console.log(`  - ${e}`);
  }
  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
  console.log('');
}

process.exit(exitCode);

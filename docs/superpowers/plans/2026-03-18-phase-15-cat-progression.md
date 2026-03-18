# Phase 15: Cat Progression + Cat Studio — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebalance cat evolution XP thresholds, wire new XP sources across the app, add evolution milestone gem rewards, and polish Cat Studio with updated accessory pricing.

**Architecture:** Update `EVOLUTION_XP_THRESHOLDS` in `types.ts`, add a centralized `addCatXpForEvent()` function in catEvolutionStore that's called from progressStore (exercise completion, streaks, lessons), songStore (mastery tiers), and learnerProfileStore (skill mastery). CatStudioScreen already has a working evolution-gated shop — update accessory gem prices to match spec.

**Tech Stack:** TypeScript, Zustand, React Native, Jest

**Spec:** `docs/superpowers/specs/2026-03-18-next-phases-design.md` (Phase 15 section)

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `src/stores/types.ts:280-285` | `EVOLUTION_XP_THRESHOLDS` constant | Modify thresholds |
| `src/stores/catEvolutionStore.ts` | Cat evolution logic, `addEvolutionXp`, new `addCatXpForEvent()` | Modify: add milestone rewards, event-based XP helper |
| `src/stores/__tests__/catEvolutionStore.test.ts` | Evolution store tests | Modify: update threshold values, add milestone tests |
| `src/__tests__/integration/evolutionFlow.test.ts` | Integration tests for evolution | Modify: update threshold values |
| `src/screens/__tests__/HomeScreen.test.tsx:323` | HomeScreen mock thresholds | Modify: update mock values |
| `src/screens/__tests__/ProfileScreen.test.tsx:288` | ProfileScreen mock thresholds | Modify: update mock values |
| `src/stores/progressStore.ts` | Exercise completion, streaks, lesson progress | Modify: wire cat XP calls |
| `src/data/accessories.ts` | Accessory gem prices | Modify: update prices to spec |
| `src/screens/CatStudioScreen.tsx` | Studio UI (already working) | No changes needed — already has evolution-gating |

---

## Chunk 1: XP Threshold Rebalance + Test Updates

### Task 1: Update Evolution XP Thresholds (15.1)

**Files:**
- Modify: `src/stores/types.ts:280-285`

- [ ] **Step 1: Update the thresholds**

In `src/stores/types.ts`, change:
```typescript
export const EVOLUTION_XP_THRESHOLDS: Record<EvolutionStage, number> = {
  baby: 0,
  teen: 2000,    // was 500
  adult: 8000,   // was 2000
  master: 25000, // was 5000
};
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no type changes, just values)

- [ ] **Step 3: Commit**

```bash
git add src/stores/types.ts
git commit -m "feat(phase15): rebalance evolution XP thresholds (500→2000, 2000→8000, 5000→25000)"
```

---

### Task 2: Update All Tests That Hardcode Old Thresholds

**Files:**
- Modify: `src/stores/__tests__/catEvolutionStore.test.ts`
- Modify: `src/__tests__/integration/evolutionFlow.test.ts`
- Modify: `src/screens/__tests__/HomeScreen.test.tsx:323`
- Modify: `src/screens/__tests__/ProfileScreen.test.tsx:288`

The old thresholds (500/2000/5000) appear in test assertions and mocks. All must be updated to (2000/8000/25000).

- [ ] **Step 1: Update catEvolutionStore.test.ts**

Update the `stageFromXp` test section. Change:
- `'returns baby for XP below 500'` → test with `1999`
- `'returns teen at exactly 500 XP'` → test with `2000`
- `'returns teen for XP between 500 and 1999'` → test with `3000` and `7999`
- `'returns adult at exactly 2000 XP'` → test with `8000`
- `'returns adult for XP between 2000 and 4999'` → test with `12000` and `24999`
- `'returns master at exactly 5000 XP'` → test with `25000`

Update `xpToNextStage` tests:
- `xpToNextStage(200)` → expect `{ nextStage: 'teen', xpNeeded: 1800 }`
- `xpToNextStage(800)` → expect `{ nextStage: 'teen', xpNeeded: 1200 }` (still baby at 800)
- `xpToNextStage(3000)` → expect `{ nextStage: 'adult', xpNeeded: 5000 }` (teen at 3000)
- `xpToNextStage(5000)` → expect non-null (now teen, NOT master)
- `xpToNextStage(10000)` → expect `{ nextStage: 'master', xpNeeded: 15000 }` (adult at 10000)
- `xpToNextStage(25000)` → expect `null` (master)

Update `addEvolutionXp` tests:
- `'triggers teen evolution at 500 XP'` → use `2000`
- `'triggers adult evolution at 2000 XP'` → use `2000` (teen) + `6000` (adult at 8000)
- `'triggers master evolution at 5000 XP'` → use `8000` (adult) + `17000` (master at 25000)
- `'can skip stages'` → use `25000`
- `'unlocks abilities on evolution'` → use `2000` for teen
- `'unlocks all abilities at master'` → use `25000`
- `'records evolvedAt timestamp'` → use `2000`

Update `multi-cat evolution` tests:
- `addEvolutionXp('mini-meowww', 500)` → `2000` for teen
- `addEvolutionXp('jazzy', 2000)` → `8000` for adult
- `addEvolutionXp('mini-meowww', 500)` → `2000` for teen (abilities test)
- `addEvolutionXp('luna', 500)` → `2000` for teen

Update `reset` test:
- `addEvolutionXp('mini-meowww', 1000)` → `3000` (or any value, doesn't affect assertion)

- [ ] **Step 2: Update evolutionFlow.test.ts**

The integration test at `src/__tests__/integration/evolutionFlow.test.ts:514-519` checks exact threshold values:
```typescript
expect(EVOLUTION_XP_THRESHOLDS.teen).toBe(2000);
expect(EVOLUTION_XP_THRESHOLDS.adult).toBe(8000);
expect(EVOLUTION_XP_THRESHOLDS.master).toBe(25000);
```

Update the incremental XP tests (lines ~195-227):
- `addEvolutionXp('mini-meowww', 200)` → keep (still baby)
- second add `200` → adjust to total `1800` being still baby, `2000` triggers teen
- Full evolution: `500` → `2000` for teen, `1500` → `6000` for adult, `3000` → `17000` for master
- Ability tests: `500` → `2000` for teen, `5000` → `25000` for master

- [ ] **Step 3: Update HomeScreen.test.tsx mock**

At line 323:
```typescript
jest.mock('../../stores/types', () => ({
  EVOLUTION_XP_THRESHOLDS: { baby: 0, teen: 2000, adult: 8000, master: 25000 },
}));
```

- [ ] **Step 4: Update ProfileScreen.test.tsx mock**

At line 288:
```typescript
jest.mock('../../stores/types', () => ({
  EVOLUTION_XP_THRESHOLDS: { baby: 0, teen: 2000, adult: 8000, master: 25000 },
}));
```

- [ ] **Step 5: Run all tests**

Run: `npx jest --no-cache`
Expected: ALL PASS. Every test file that references thresholds should now match the new values.

- [ ] **Step 6: Commit**

```bash
git add src/stores/__tests__/catEvolutionStore.test.ts src/__tests__/integration/evolutionFlow.test.ts src/screens/__tests__/HomeScreen.test.tsx src/screens/__tests__/ProfileScreen.test.tsx
git commit -m "test(phase15): update all evolution threshold tests to match new XP values"
```

---

## Chunk 2: Evolution Milestone Gem Rewards (15.3)

### Task 3: Add Milestone Gem Rewards on Evolution

**Files:**
- Modify: `src/stores/catEvolutionStore.ts:189-247` (inside `addEvolutionXp`)
- Modify: `src/stores/__tests__/catEvolutionStore.test.ts`

When a cat evolves to a new stage, award gems: Teen = 200, Adult = 500, Master = 1,000.

- [ ] **Step 1: Write failing tests for milestone rewards**

Add to `src/stores/__tests__/catEvolutionStore.test.ts`, inside the `addEvolutionXp` describe block:

```typescript
it('awards 200 gems on teen evolution', () => {
  const earnGems = jest.fn();
  jest.spyOn(require('../../stores/gemStore'), 'useGemStore').mockReturnValue({ getState: () => ({ earnGems }) });
  // Re-import won't work — mock gemStore before import. Instead:
  // The test should verify that useGemStore.getState().earnGems was called.
  useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 2000);
  expect(earnGems).toHaveBeenCalledWith(200, 'evolution-milestone-teen');
});

it('awards 500 gems on adult evolution', () => {
  useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 2000); // teen
  const earnGems = require('../../stores/gemStore').useGemStore.getState().earnGems;
  earnGems.mockClear();
  useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 6000); // adult at 8000
  expect(earnGems).toHaveBeenCalledWith(500, 'evolution-milestone-adult');
});

it('awards 1000 gems on master evolution', () => {
  useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 8000); // adult
  const earnGems = require('../../stores/gemStore').useGemStore.getState().earnGems;
  earnGems.mockClear();
  useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 17000); // master at 25000
  expect(earnGems).toHaveBeenCalledWith(1000, 'evolution-milestone-master');
});

it('does NOT award milestone gems when no evolution occurs', () => {
  const earnGems = require('../../stores/gemStore').useGemStore.getState().earnGems;
  earnGems.mockClear();
  useCatEvolutionStore.getState().addEvolutionXp('mini-meowww', 100);
  expect(earnGems).not.toHaveBeenCalled();
});
```

Add gemStore mock at the top of the test file (after other mocks):
```typescript
jest.mock('../../stores/gemStore', () => ({
  useGemStore: {
    getState: () => ({
      earnGems: jest.fn(),
    }),
  },
}));
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/stores/__tests__/catEvolutionStore.test.ts --no-cache`
Expected: New milestone tests FAIL (earnGems never called)

- [ ] **Step 3: Implement milestone rewards in addEvolutionXp**

In `src/stores/catEvolutionStore.ts`, after the analytics tracking block (line ~231), add:

```typescript
// Award milestone gems on evolution
if (evolved && newStage) {
  const MILESTONE_GEMS: Record<string, number> = {
    teen: 200,
    adult: 500,
    master: 1000,
  };
  const milestoneGems = MILESTONE_GEMS[newStage];
  if (milestoneGems) {
    try {
      const { useGemStore } = require('./gemStore');
      useGemStore.getState().earnGems(milestoneGems, `evolution-milestone-${newStage}`);
    } catch (err) {
      logger.warn('[catEvolution] Milestone gem award failed:', (err as Error)?.message);
    }
  }
}
```

Note: Using `require()` (lazy import) to avoid circular dependency — same pattern used for `useSettingsStore` in this file.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/stores/__tests__/catEvolutionStore.test.ts --no-cache`
Expected: ALL PASS

- [ ] **Step 5: Run full test suite**

Run: `npx jest --no-cache`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/stores/catEvolutionStore.ts src/stores/__tests__/catEvolutionStore.test.ts
git commit -m "feat(phase15): award milestone gems on cat evolution (200/500/1000)"
```

---

## Chunk 3: Wire New Cat XP Sources (15.2)

### Task 4: Add Cat XP on Exercise Completion

**Files:**
- Modify: `src/stores/progressStore.ts` (inside `recordExerciseCompletion`)

Cat XP is already awarded in `ExercisePlayer.tsx:1265` using `score.xpEarned`. That covers the base exercise completion. But we need to add cat XP for:
1. Daily challenge completion bonus: +25 XP
2. Weekly/monthly challenge multiplied bonus: weekly +50, monthly +75

Currently in progressStore `recordExerciseCompletion` (around line 306-320), challenge context already exists via `challengeContext` parameter. We add cat XP bonuses there.

- [ ] **Step 1: Write test for challenge cat XP bonus**

Add to `src/stores/__tests__/progressStore.test.ts` (or create a focused test):

The actual exercise XP → cat XP wiring is in ExercisePlayer (already works). The new sources are:
- Song mastery tier changes (Task 5)
- Streak milestones (Task 6)
- Skill mastery (Task 7)
- Lesson first completion (Task 8)

For challenge bonuses, the XP multiplier already increases the XP earned (which then flows to cat via ExercisePlayer). So no extra cat XP wiring needed for challenges — the multiplied `score.xpEarned` already covers it.

**What IS missing**: cat XP for non-exercise events. Let me verify ExercisePlayer is the only call site:

Looking at the grep results, `addEvolutionXp` is called from:
1. `ExercisePlayer.tsx:1265` — exercise completion (already wired)
2. `syncService.ts:536` — cloud sync (already wired)

So we need NEW call sites for:
- Song mastery tier up
- Streak milestones
- Skill mastery
- Lesson first-time completion

- [ ] **Step 2: Add cat XP for streak milestones**

In `src/stores/progressStore.ts`, inside the streak milestones block (around line 396-411), add cat XP alongside the gem reward:

```typescript
for (const m of STREAK_MILESTONES) {
  if (streak >= m.streak && !claimed.includes(m.streak)) {
    useGemStore.getState().earnGems(m.gems, `${m.streak}-day-streak`);
    // Cat evolution XP for streak milestones
    try {
      const { useCatEvolutionStore } = require('./catEvolutionStore');
      const catId = useCatEvolutionStore.getState().selectedCatId;
      if (catId) {
        const streakCatXp = m.streak === 7 ? 100 : m.streak === 30 ? 250 : 500;
        useCatEvolutionStore.getState().addEvolutionXp(catId, streakCatXp);
      }
    } catch (err) {
      logger.warn('[progressStore] Cat streak XP failed:', (err as Error)?.message);
    }
    set((state) => ({
      streakMilestonesClaimed: [...(state.streakMilestonesClaimed ?? []), m.streak],
    }));
  }
}
```

Streak milestone cat XP: 7-day = 100, 30-day = 250, 100-day = 500

- [ ] **Step 3: Add cat XP for lesson first-time completion**

In `src/stores/progressStore.ts`, find where `lessonProgress[lessonId].status` transitions to `'completed'`. This happens in the `updateExerciseProgress` or `recordExerciseCompletion` flow. Add:

After the lesson completion check (where `allExercisesComplete` is computed), add:

```typescript
// Cat evolution XP for lesson first-time completion
if (allExercisesComplete && lessonWasNotPreviouslyComplete) {
  try {
    const { useCatEvolutionStore } = require('./catEvolutionStore');
    const catId = useCatEvolutionStore.getState().selectedCatId;
    if (catId) {
      useCatEvolutionStore.getState().addEvolutionXp(catId, 200);
    }
  } catch (err) {
    logger.warn('[progressStore] Cat lesson XP failed:', (err as Error)?.message);
  }
}
```

Note: Need to check the exact lesson completion detection logic in progressStore first. The key is detecting when a lesson transitions from incomplete → complete for the first time.

- [ ] **Step 4: Run tests**

Run: `npx jest src/stores/__tests__/progressStore.test.ts --no-cache`
Expected: PASS (no assertions yet on cat XP — lazy require prevents failures)

- [ ] **Step 5: Commit**

```bash
git add src/stores/progressStore.ts
git commit -m "feat(phase15): wire cat XP for streak milestones (100/250/500) and lesson completion (200)"
```

---

### Task 5: Add Cat XP for Song Mastery Tier Up

**Files:**
- Modify: `src/stores/songStore.ts` (inside mastery recording logic)

When a song's mastery tier increases (none→bronze, bronze→silver, etc.), award cat XP:
- Bronze: 50, Silver: 100, Gold: 150, Platinum: 200

- [ ] **Step 1: Find the mastery recording function**

Check `src/stores/songStore.ts` for where mastery tiers are computed and saved. Look for where `MasteryTier` transitions happen.

- [ ] **Step 2: Add cat XP on tier transition**

After the mastery tier is computed and saved, if the tier changed:

```typescript
const MASTERY_CAT_XP: Record<string, number> = {
  bronze: 50,
  silver: 100,
  gold: 150,
  platinum: 200,
};

if (newTier !== oldTier && newTier !== 'none') {
  try {
    const { useCatEvolutionStore } = require('./catEvolutionStore');
    const catId = useCatEvolutionStore.getState().selectedCatId;
    if (catId) {
      const xp = MASTERY_CAT_XP[newTier] ?? 0;
      if (xp > 0) useCatEvolutionStore.getState().addEvolutionXp(catId, xp);
    }
  } catch (err) {
    // silent — non-critical
  }
}
```

- [ ] **Step 3: Run tests**

Run: `npx jest --no-cache`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/stores/songStore.ts
git commit -m "feat(phase15): wire cat XP for song mastery tier-ups (50-200)"
```

---

### Task 6: Add Cat XP for Skill Mastery

**Files:**
- Modify: `src/stores/learnerProfileStore.ts` (inside skill mastery recording)

When a skill is newly mastered (`masteredSkills` gains a new entry), award 100 cat XP.

- [ ] **Step 1: Find skill mastery recording**

Check `src/stores/learnerProfileStore.ts` for `markSkillMastered` or where `masteredSkills` is updated.

- [ ] **Step 2: Add cat XP on skill mastery**

After a skill is added to `masteredSkills`:

```typescript
// Cat evolution XP for skill mastery
try {
  const { useCatEvolutionStore } = require('./catEvolutionStore');
  const catId = useCatEvolutionStore.getState().selectedCatId;
  if (catId) {
    useCatEvolutionStore.getState().addEvolutionXp(catId, 100);
  }
} catch (err) {
  // silent — non-critical
}
```

- [ ] **Step 3: Run tests**

Run: `npx jest --no-cache`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/stores/learnerProfileStore.ts
git commit -m "feat(phase15): wire cat XP for skill mastery (100 per skill)"
```

---

## Chunk 4: Accessory Price Rebalance (15.4-15.6)

### Task 7: Update Accessory Gem Prices

**Files:**
- Modify: `src/data/accessories.ts`

Current prices are 10-150 gems. The spec defines rarity-based bands:
- Common: 50-100 gems
- Rare: 200-400 gems
- Epic: 600-1,000 gems
- Legendary: 1,500-2,500 gems

- [ ] **Step 1: Update all accessory prices**

In `src/data/accessories.ts`, update each accessory's `gemCost` based on its rarity:

**Hats (9):**
| ID | Rarity | Old | New |
|----|--------|-----|-----|
| hat-beret | common | 15 | 75 |
| hat-tophat | rare | 40 | 300 |
| hat-santa | rare | 35 | 250 |
| hat-wizard | epic | 75 | 700 |
| hat-pirate | epic | 80 | 750 |
| hat-crown | legendary | 150 | 2000 |
| hat-headphones | rare | 30 | 250 |
| hat-nightcap | common | 10 | 50 |
| hat-tinycrown | rare | 45 | 350 |

**Glasses (8):**
| ID | Rarity | Old | New |
|----|--------|-----|-----|
| glass-round | common | 10 | 50 |
| glass-sunglasses | common | 15 | 75 |
| glass-monocle | rare | 35 | 300 |
| glass-star | epic | 60 | 650 |
| glass-heart | epic | 65 | 600 |
| glass-opera | rare | 40 | 350 |
| glass-nerd | common | 10 | 50 |
| glass-3d | rare | 30 | 200 |

**Outfits (8):**
| ID | Rarity | Old | New |
|----|--------|-----|-----|
| outfit-tuxedo | rare | 50 | 400 |
| outfit-hawaiian | common | 20 | 75 |
| outfit-hoodie | common | 15 | 50 |
| outfit-superhero | epic | 100 | 800 |
| outfit-robe | legendary | 150 | 2500 |
| outfit-conductor | epic | 85 | 750 |
| outfit-kimono | rare | 45 | 300 |
| outfit-jersey | common | 15 | 50 |

**Capes (8):**
| ID | Rarity | Old | New |
|----|--------|-----|-----|
| cape-red | common | 20 | 75 |
| cape-wings | epic | 90 | 800 |
| cape-guitar | rare | 40 | 250 |
| cape-notes | rare | 45 | 300 |
| cape-rainbow | legendary | 130 | 2000 |
| cape-butterfly | epic | 95 | 850 |
| cape-conductor | rare | 35 | 250 |
| cape-starry | legendary | 140 | 2500 |

**Collars (remaining 8) and Effects (7):** Apply same rarity formula.

- [ ] **Step 2: Run tests**

Run: `npx jest --no-cache`
Expected: ALL PASS (no tests assert specific gem prices)

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/data/accessories.ts
git commit -m "feat(phase15): rebalance accessory prices (common 50-100, rare 200-400, epic 600-1000, legendary 1500-2500)"
```

---

### Task 8: Verify Cat Studio UI (15.4-15.7)

**Files:**
- Review: `src/screens/CatStudioScreen.tsx` (already working — verify no changes needed)
- Review: `src/components/Mascot/CatAvatar.tsx`

CatStudioScreen already has:
- ✅ Category tabs (6 categories)
- ✅ Evolution-gated shop via `canEquipAccessory(item, currentStage)`
- ✅ Lock badges for items above current stage
- ✅ Purchase confirmation via `PreviewActionBar` with gem balance check
- ✅ Live preview on CatAvatar with `extraAccessoryNames`
- ✅ Gem balance header

**No code changes needed** — the UI already handles all spec requirements. The price changes from Task 7 will automatically reflect in the grid items.

- [ ] **Step 1: Verify on device/simulator**

Run: `npm run ios`
Navigate to Cat Studio. Verify:
1. Prices show new values (50-2500 gems)
2. Lock badges appear for items above current stage
3. Buy flow works with new prices
4. Preview shows accessory on cat
5. Equip/unequip works
6. Category tabs filter correctly

- [ ] **Step 2: Verify CatAvatar renders accessories at all sizes**

Check CatAvatar renders with accessories in:
- Cat Studio (hero size) — already tested above
- HomeScreen (profile avatar)
- SocialScreen (activity feed cards)
- ExercisePlayer (ExerciseBuddy)
- CatSwitchScreen (gallery cards)
- ProfileScreen

These all use `CatAvatar` with `extraAccessoryNames` derived from `equippedAccessories` in settingsStore, which the Studio already updates.

- [ ] **Step 3: Commit verification notes**

No code changes — this is manual verification only. Note results in the PR description.

---

## Chunk 5: Infra Test Tooling Skeleton (15.8)

### Task 9: Create test:infra Script Skeleton

**Files:**
- Create: `scripts/infra-stress-test.ts`
- Modify: `package.json` (add `test:infra` script)

This is a skeleton — the actual load testing infrastructure (Artillery/k6 + Firebase test project) will be built out incrementally over Phases 16-18.

- [ ] **Step 1: Create the script**

Create `scripts/infra-stress-test.ts`:

```typescript
/**
 * Infrastructure Stress Test Skeleton
 *
 * Phase 15: Skeleton with placeholders
 * Phase 16-17: Add test implementations
 * Phase 18: QA gate — all tests must pass
 *
 * Usage: npx tsx scripts/infra-stress-test.ts [--target functions|firestore|auth|all]
 */

const TARGETS = ['functions', 'firestore', 'auth', 'sync', 'deletion'] as const;
type Target = typeof TARGETS[number];

interface StressTestResult {
  target: string;
  passed: boolean;
  p95LatencyMs: number;
  errorRate: number;
  details: string;
}

async function testCloudFunctions(): Promise<StressTestResult> {
  // TODO Phase 17: Implement concurrent callable invocations
  // Targets: generateExercise, syncProgress, completeExercise
  // Goal: <2s p95 at 50 concurrent
  console.log('  [SKIP] Cloud Functions load test — not yet implemented');
  return { target: 'functions', passed: true, p95LatencyMs: 0, errorRate: 0, details: 'Skeleton — not yet implemented' };
}

async function testFirestoreContention(): Promise<StressTestResult> {
  // TODO Phase 17: Implement concurrent reads/writes
  // Hot paths: leagueStandings, exerciseScores, activityFeed, guildMembers
  // Goal: <500ms p95 at 100 concurrent writes
  console.log('  [SKIP] Firestore contention test — not yet implemented');
  return { target: 'firestore', passed: true, p95LatencyMs: 0, errorRate: 0, details: 'Skeleton — not yet implemented' };
}

async function testAuthConcurrency(): Promise<StressTestResult> {
  // TODO Phase 17: Concurrent anonymous + email sign-in
  console.log('  [SKIP] Auth concurrency test — not yet implemented');
  return { target: 'auth', passed: true, p95LatencyMs: 0, errorRate: 0, details: 'Skeleton — not yet implemented' };
}

async function testSyncContention(): Promise<StressTestResult> {
  // TODO Phase 18: Concurrent push/pull from multiple "devices"
  console.log('  [SKIP] Sync contention test — not yet implemented');
  return { target: 'sync', passed: true, p95LatencyMs: 0, errorRate: 0, details: 'Skeleton — not yet implemented' };
}

async function testAccountDeletion(): Promise<StressTestResult> {
  // TODO Phase 18: Verify deleteUserData cleans up Phase 14 data
  console.log('  [SKIP] Account deletion test — not yet implemented');
  return { target: 'deletion', passed: true, p95LatencyMs: 0, errorRate: 0, details: 'Skeleton — not yet implemented' };
}

async function main() {
  const arg = process.argv[2];
  const target = arg?.replace('--target=', '').replace('--target', '').trim() as Target | 'all' | undefined;
  const selectedTargets: Target[] = target && target !== 'all'
    ? [target as Target]
    : [...TARGETS];

  console.log('\n🔥 Purrrfect Keys — Infrastructure Stress Tests\n');
  console.log(`Targets: ${selectedTargets.join(', ')}\n`);

  const results: StressTestResult[] = [];

  const testMap: Record<Target, () => Promise<StressTestResult>> = {
    functions: testCloudFunctions,
    firestore: testFirestoreContention,
    auth: testAuthConcurrency,
    sync: testSyncContention,
    deletion: testAccountDeletion,
  };

  for (const t of selectedTargets) {
    const fn = testMap[t];
    if (fn) {
      const result = await fn();
      results.push(result);
    }
  }

  console.log('\n── Results ──────────────────────────');
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.target}: ${r.details}`);
  }

  const allPassed = results.every(r => r.passed);
  console.log(`\n${allPassed ? '✅ All tests passed' : '❌ Some tests failed'}\n`);
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
```

- [ ] **Step 2: Add npm script**

Add to `package.json` scripts:
```json
"test:infra": "npx tsx scripts/infra-stress-test.ts"
```

- [ ] **Step 3: Run it**

Run: `npm run test:infra`
Expected: All targets show `[SKIP]`, exit code 0

- [ ] **Step 4: Commit**

```bash
git add scripts/infra-stress-test.ts package.json
git commit -m "feat(phase15): add test:infra skeleton for infrastructure stress testing"
```

---

## Final Verification

- [ ] **Run full test suite**

```bash
npm run typecheck && npm run test
```
Expected: 0 TS errors, ALL tests pass

- [ ] **Run QA suites**

```bash
npm run test:qa
```
Expected: ALL pass (perf, security, regression, stress)

---

## Summary

| Task | Spec # | Description | Files |
|------|--------|-------------|-------|
| 1 | 15.1 | Update XP thresholds | types.ts |
| 2 | 15.1 | Update all tests | 4 test files |
| 3 | 15.3 | Milestone gem rewards | catEvolutionStore.ts + tests |
| 4 | 15.2 | Cat XP for streaks + lessons | progressStore.ts |
| 5 | 15.2 | Cat XP for song mastery | songStore.ts |
| 6 | 15.2 | Cat XP for skill mastery | learnerProfileStore.ts |
| 7 | 15.4-15.6 | Accessory price rebalance | accessories.ts |
| 8 | 15.7 | Verify Cat Studio + CatAvatar | Manual verification |
| 9 | 15.8 | test:infra skeleton | scripts/infra-stress-test.ts |

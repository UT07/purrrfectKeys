# Daily Plan System Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 5 disconnected daily plan subsystems with a unified DailyPlanManager where the plan tracks its own completion state, persists immediately to AsyncStorage + Firestore, and renders without key-matching overlays.

**Architecture:** `DailyPlanManager` owns the plan lifecycle (generate, update, persist, sync). `CurriculumEngine` generates exercises with tier caps and lesson awareness. UI components read `PlanExercise.status` directly. No `mergedCompletedKeys`, no `_ai_exercises` bucket scanning.

**Tech Stack:** TypeScript, Zustand (progressStore for lesson data), AsyncStorage, Firestore, React Native

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/core/curriculum/DailyPlanManager.ts` | **Create** | Plan lifecycle: generate, get, update completion, persist, sync |
| `src/core/curriculum/CurriculumEngine.ts` | **Modify** | Add `lessonProgress` param, tier cap, return `PlanExercise[]` |
| `src/core/curriculum/dailyPlanCache.ts` | **Delete** | Replaced by DailyPlanManager |
| `src/screens/HomeScreen.tsx` | **Modify** | Read from DailyPlanManager, remove lessonProgress scanning |
| `src/screens/DailySessionScreen.tsx` | **Modify** | Read from DailyPlanManager, remove mergedCompletedKeys |
| `src/screens/ExercisePlayer/ExercisePlayer.tsx` | **Modify** | Call `updatePlanCompletion()` after scoring |
| `src/screens/PostExerciseScreen.tsx` | **Modify** | TTS sequencing (cat → pause → salsa) |
| `src/services/firebase/firestore.ts` | **Modify** | Add `saveDailyPlan` / `getDailyPlanFromFirestore` |
| `src/services/firebase/syncService.ts` | **Modify** | Pull dailyPlan on sign-in |
| `firebase/firestore.rules` | **Modify** | Add `dailyPlan` to gamification docId allowlist |
| `src/App.tsx` | **Modify** | Replace `hydrateDailyPlanCache` with `DailyPlanManager.hydrate` |
| `src/stores/authStore.ts` | **Modify** | Remove `clearDailyPlanCache` from resetAllStores |

---

### Task 1: Create DailyPlanManager with Types

**Files:**
- Create: `src/core/curriculum/DailyPlanManager.ts`

- [ ] **Step 1: Create PlanExercise type and DailyPlan interface**

```typescript
// src/core/curriculum/DailyPlanManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionType, ExerciseRef } from './CurriculumEngine';
import { getTodayDateString } from '../../utils/time';
import { logger } from '../../utils/logger';

const CACHE_KEY = 'purrrfect_keys_daily_plan_v2';

export interface PlanExercise extends ExerciseRef {
  status: 'pending' | 'passed' | 'failed';
  score: number | null;
  completedAt: number | null;
}

export interface DailyPlan {
  date: string;
  sessionType: SessionType;
  warmUp: PlanExercise[];
  lesson: PlanExercise[];
  challenge: PlanExercise[];
  songs: PlanExercise[];
  reasoning: string[];
}

function toPlanExercise(ref: ExerciseRef): PlanExercise {
  return { ...ref, status: 'pending', score: null, completedAt: null };
}

let _plan: DailyPlan | null = null;
```

- [ ] **Step 2: Implement getDailyPlan (generate or return cached)**

```typescript
export function getDailyPlan(): DailyPlan {
  const today = getTodayDateString();

  // Return cached plan if same day and not all complete
  if (_plan?.date === today && !isPlanComplete(_plan)) {
    return _plan;
  }

  // If plan is complete (all non-song exercises done), allow regeneration
  if (_plan?.date === today && isPlanComplete(_plan)) {
    logger.log('[DailyPlanManager] Plan complete — generating fresh plan');
  }

  // Guard: if auth is loading with 0 skills, defer
  try {
    const { useLearnerProfileStore } = require('../../stores/learnerProfileStore');
    const { useAuthStore } = require('../../stores/authStore');
    const profile = useLearnerProfileStore.getState();
    const isLoading = useAuthStore.getState().isLoading;
    if (isLoading && profile.masteredSkills.length === 0) {
      logger.log('[DailyPlanManager] Auth loading — deferring plan generation');
      return emptyPlan(today);
    }
  } catch { /* stores not ready */ }

  // Generate fresh plan
  const plan = generateFreshPlan(today);
  _plan = plan;
  savePlanToStorage(plan);
  logger.log(`[DailyPlanManager] Generated: ${plan.warmUp.length}W ${plan.lesson.length}L ${plan.challenge.length}C`);
  return plan;
}

function emptyPlan(date: string): DailyPlan {
  return {
    date,
    sessionType: 'new-material',
    warmUp: [],
    lesson: [],
    challenge: [],
    songs: [],
    reasoning: ['Waiting for sync...'],
  };
}

function isPlanComplete(plan: DailyPlan): boolean {
  const required = [...plan.warmUp, ...plan.lesson, ...plan.challenge];
  return required.length > 0 && required.every(e => e.status !== 'pending');
}
```

- [ ] **Step 3: Implement generateFreshPlan**

```typescript
function generateFreshPlan(today: string): DailyPlan {
  const { useLearnerProfileStore } = require('../../stores/learnerProfileStore');
  const { useProgressStore } = require('../../stores/progressStore');
  const { generateSessionPlan } = require('./CurriculumEngine');

  const profile = useLearnerProfileStore.getState();
  let lessonProgress: Record<string, any> | undefined;
  try {
    lessonProgress = useProgressStore.getState().lessonProgress;
  } catch { /* not available */ }

  const sessionPlan = generateSessionPlan(
    {
      noteAccuracy: profile.noteAccuracy,
      noteAttempts: profile.noteAttempts,
      skills: profile.skills,
      tempoRange: profile.tempoRange,
      weakNotes: profile.weakNotes,
      weakSkills: profile.weakSkills,
      totalExercisesCompleted: profile.totalExercisesCompleted,
      lastAssessmentDate: profile.lastAssessmentDate,
      assessmentScore: profile.assessmentScore,
      masteredSkills: profile.masteredSkills,
      skillMasteryData: profile.skillMasteryData,
      recentExerciseIds: profile.recentExerciseIds,
    },
    profile.masteredSkills,
    lessonProgress,
  );

  return {
    date: today,
    sessionType: sessionPlan.sessionType,
    warmUp: sessionPlan.warmUp.map(toPlanExercise),
    lesson: sessionPlan.lesson.map(toPlanExercise),
    challenge: sessionPlan.challenge.map(toPlanExercise),
    songs: (sessionPlan.songs ?? []).map(toPlanExercise),
    reasoning: sessionPlan.reasoning,
  };
}
```

- [ ] **Step 4: Implement updatePlanCompletion**

```typescript
export function updatePlanCompletion(
  exerciseId: string,
  skillId: string | null,
  score: number,
  passed: boolean,
): void {
  if (!_plan) return;

  const allExercises = [..._plan.warmUp, ..._plan.lesson, ..._plan.challenge, ..._plan.songs];

  // Match by exerciseId first (static exercises)
  let match = allExercises.find(e => e.exerciseId === exerciseId);

  // If no match, try skillNodeId (AI exercises have dynamic IDs)
  if (!match && skillId) {
    match = allExercises.find(e => e.skillNodeId === skillId);
  }

  if (!match) {
    logger.warn(`[DailyPlanManager] No match for exerciseId=${exerciseId} skillId=${skillId}`);
    return;
  }

  // Only update if new score is higher (preserve best attempt)
  if (match.score != null && score <= match.score && match.status !== 'pending') {
    // Still update status if this attempt passed and previous didn't
    if (passed && match.status === 'failed') {
      match.status = 'passed';
      match.completedAt = match.completedAt ?? Date.now();
    }
    savePlanToStorage(_plan);
    pushPlanToFirestore(_plan);
    return;
  }

  match.status = passed ? 'passed' : 'failed';
  match.score = Math.max(match.score ?? 0, score);
  match.completedAt = match.completedAt ?? (passed ? Date.now() : null);

  logger.log(`[DailyPlanManager] Updated: ${match.exerciseId} → ${match.status} (${match.score}%)`);

  savePlanToStorage(_plan);
  pushPlanToFirestore(_plan);
}
```

- [ ] **Step 5: Implement persistence (save/hydrate/push/pull)**

```typescript
async function savePlanToStorage(plan: DailyPlan): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(plan));
  } catch (err) {
    logger.warn('[DailyPlanManager] AsyncStorage save failed:', err);
  }
}

function pushPlanToFirestore(plan: DailyPlan): void {
  try {
    const { auth } = require('../../services/firebase/config');
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const { saveDailyPlan } = require('../../services/firebase/firestore');
    saveDailyPlan(uid, plan).catch((err: Error) => {
      logger.warn('[DailyPlanManager] Firestore push failed:', err?.message);
    });
  } catch { /* firebase not ready */ }
}

export async function hydrateDailyPlan(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed: DailyPlan = JSON.parse(raw);
    const today = getTodayDateString();
    if (parsed.date === today) {
      _plan = parsed;
      logger.log('[DailyPlanManager] Restored plan from storage');
    }
  } catch {
    // Ignore — will regenerate on next access
  }
}

export async function pullPlanFromFirestore(): Promise<void> {
  try {
    const { auth } = require('../../services/firebase/config');
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const { getDailyPlanFromFirestore } = require('../../services/firebase/firestore');
    const remote: DailyPlan | null = await getDailyPlanFromFirestore(uid);
    if (!remote || remote.date !== getTodayDateString()) return;

    // Merge: cloud wins if it has more completions
    const localCompletions = _plan
      ? [..._plan.warmUp, ..._plan.lesson, ..._plan.challenge].filter(e => e.status !== 'pending').length
      : 0;
    const remoteCompletions = [...remote.warmUp, ...remote.lesson, ...remote.challenge].filter(e => e.status !== 'pending').length;

    if (remoteCompletions > localCompletions) {
      _plan = remote;
      await savePlanToStorage(remote);
      logger.log(`[DailyPlanManager] Adopted cloud plan (${remoteCompletions} completions vs ${localCompletions} local)`);
    }
  } catch (err) {
    logger.warn('[DailyPlanManager] Firestore pull failed:', (err as Error)?.message);
  }
}
```

- [ ] **Step 6: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/core/curriculum/DailyPlanManager.ts
git commit -m "feat: DailyPlanManager — unified plan lifecycle with completion tracking"
```

---

### Task 2: Add Firestore CRUD for DailyPlan

**Files:**
- Modify: `src/services/firebase/firestore.ts`
- Modify: `firebase/firestore.rules`

- [ ] **Step 1: Add saveDailyPlan and getDailyPlanFromFirestore**

Add to `src/services/firebase/firestore.ts`:

```typescript
// ============================================================================
// Daily Plan Operations
// ============================================================================

export async function saveDailyPlan(uid: string, plan: any): Promise<void> {
  const planDoc = doc(db, 'users', uid, 'gamification', 'dailyPlan');
  await setDoc(planDoc, plan, { merge: false }); // Full overwrite — plan is the source of truth
}

export async function getDailyPlanFromFirestore(uid: string): Promise<any | null> {
  const planDoc = doc(db, 'users', uid, 'gamification', 'dailyPlan');
  const snap = await getDoc(planDoc);
  if (!snap.exists()) return null;
  return snap.data();
}
```

- [ ] **Step 2: Add dailyPlan to Firestore rules allowlist**

In `firebase/firestore.rules`, change line 70:

```
docId in ['data', 'catEvolution', 'gems', 'learnerProfile', 'achievements', 'rank', 'season', 'settings', 'progressExtra'];
```

To:

```
docId in ['data', 'catEvolution', 'gems', 'learnerProfile', 'achievements', 'rank', 'season', 'settings', 'progressExtra', 'dailyPlan'];
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/services/firebase/firestore.ts firebase/firestore.rules
git commit -m "feat: Firestore CRUD for dailyPlan + rules allowlist"
```

---

### Task 3: Wire CurriculumEngine — Tier Cap + Lesson Awareness

**Files:**
- Modify: `src/core/curriculum/CurriculumEngine.ts`

- [ ] **Step 1: Add getCurrentLessonTier helper**

Add after the existing helper functions (around line 800):

```typescript
/**
 * Determine the user's current lesson tier by scanning lessons in order.
 * Maps lesson numbers to approximate skill tiers.
 */
function getCurrentLessonTier(lessonProgress?: Record<string, { status: string }>): number {
  if (!lessonProgress) return 1;
  try {
    const { getLessons } = require('../../content/ContentLoader');
    const lessons = getLessons() as Array<{ id: string }>;
    for (let i = 0; i < lessons.length; i++) {
      const lp = lessonProgress[lessons[i].id];
      if (!lp || lp.status !== 'completed') {
        // Current lesson = first non-completed. Tier ≈ lesson index / 3 + 1
        return Math.max(1, Math.ceil((i + 1) / 3));
      }
    }
    return 18; // All completed
  } catch {
    return 5; // Safe default
  }
}
```

- [ ] **Step 2: Add tier cap to generateLesson's AI pick (Slot 2)**

In `generateLesson`, after the `findLessonTreeExercise` slot and before the AI pick, add tier capping. Replace the "Normal curriculum" section:

```typescript
  // Normal curriculum: add AI pick for the next skill to learn.
  // Cap to current lesson tier + 1 to prevent targeting Lesson 7 skills when on Lesson 4.
  const currentTier = getCurrentLessonTier(lessonProgress);
  const maxTier = Math.min(currentTier + 1, 18);

  if (nextSkill.tier <= maxTier) {
    reasoning.push(`AI pick: ${nextSkill.name} (tier ${nextSkill.tier}, cap ${maxTier})`);
    refs.push(makeAIRef(nextSkill, `Learn: ${nextSkill.name}`, _recentSet));
  } else {
    // Next skill too far ahead — review a mastered skill instead
    const reviewSkill = [...masteredSkills]
      .map((id) => getSkillById(id))
      .filter((s): s is SkillNode => s != null && !_recentSet.has(`ai-skill-${s.id}`))
      .sort((a, b) => getSkillDepth(b.id) - getSkillDepth(a.id))[0];
    if (reviewSkill) {
      refs.push(makeAIRef(reviewSkill, `Review: ${reviewSkill.name}`, _recentSet));
      reasoning.push(`Review (next skill tier ${nextSkill.tier} > cap ${maxTier}): ${reviewSkill.name}`);
    }
  }
```

- [ ] **Step 3: Pass lessonProgress to generateChallenge's excludeSkillIds**

Verify that all `generateChallenge` calls pass `collectSkillIds(warmUp, lesson)` — this was done earlier and should still be in the code.

- [ ] **Step 4: Run typecheck + tests**

Run: `npx tsc --noEmit && npx jest --passWithNoTests`
Expected: 0 errors, 3270 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/core/curriculum/CurriculumEngine.ts
git commit -m "fix: tier cap for AI picks + getCurrentLessonTier helper"
```

---

### Task 4: Wire ExercisePlayer to DailyPlanManager

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`

- [ ] **Step 1: Import and call updatePlanCompletion after scoring**

In the `handleExerciseCompletion` callback, right after the existing `progressStore.updateExerciseProgress(...)` call (around line 1038), add:

```typescript
    // Update daily plan completion status (the plan IS the source of truth for dashboard)
    try {
      const { updatePlanCompletion } = require('../../core/curriculum/DailyPlanManager');
      updatePlanCompletion(
        ex.id,                          // exerciseId
        skillIdParamRef.current ?? null, // skillId
        score.overall,                   // score
        score.isPassed,                  // passed
      );
    } catch (err) {
      logger.warn('[ExercisePlayer] Plan completion update failed:', err);
    }
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/screens/ExercisePlayer/ExercisePlayer.tsx
git commit -m "fix: ExercisePlayer calls updatePlanCompletion after scoring"
```

---

### Task 5: Rewrite HomeScreen to Read from DailyPlanManager

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Replace getDailyPlan import and remove completion scanning**

Change import from:
```typescript
import { getDailyPlan } from '../core/curriculum/dailyPlanCache';
```
To:
```typescript
import { getDailyPlan } from '../core/curriculum/DailyPlanManager';
import type { PlanExercise } from '../core/curriculum/DailyPlanManager';
```

- [ ] **Step 2: Simplify sessionPlan usage**

The `sessionPlan` useMemo stays the same — `getDailyPlan()` now returns a `DailyPlan` with `PlanExercise[]` sections.

- [ ] **Step 3: Rewrite HomePracticeSections to use PlanExercise.status**

Replace the entire completion detection logic in `HomePracticeSections` (the `isAttempted`, `highScore`, `isPassed`, `isBelowThreshold` block) with:

```typescript
              // Read completion directly from the plan — no lessonProgress scanning
              const planEx = ref as PlanExercise;
              const isPassed = planEx.status === 'passed';
              const isBelowThreshold = planEx.status === 'failed';
              const isAttempted = isPassed || isBelowThreshold;
              const highScore = planEx.score;
```

Remove all `lessonProgress['_ai_exercises']` lookups from HomePracticeSections.

- [ ] **Step 4: Remove lessonProgress prop from HomePracticeSections**

The component no longer needs `lessonProgress` as a prop. Remove it from the interface and call site.

- [ ] **Step 5: Run typecheck + manual verify**

Run: `npx tsc --noEmit`
Expected: No errors. Verify on device: exercises show correct green/orange/blue.

- [ ] **Step 6: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "fix: HomeScreen reads completion from DailyPlan — no more key matching"
```

---

### Task 6: Rewrite DailySessionScreen to Read from DailyPlanManager

**Files:**
- Modify: `src/screens/DailySessionScreen.tsx`

- [ ] **Step 1: Replace imports and remove mergedCompletedKeys**

Change import from dailyPlanCache to DailyPlanManager. Remove `completedKeys` state, `lastNavigatedKeyRef`, `prevCompletedCountRef`, `mergedCompletedKeys` useMemo, and the `useFocusEffect` that tracks completions.

- [ ] **Step 2: Simplify plan access**

```typescript
const plan = useMemo(() => getDailyPlan(), [focusCounter, isAuthLoading]);
```

- [ ] **Step 3: Update SessionExerciseCard to read from PlanExercise**

The `isPassed`, `isBelowThreshold`, `highScore` props now come directly from the plan:

```typescript
const planEx = ref as PlanExercise;
<SessionExerciseCard
  exerciseRef={ref}
  isPassed={planEx.status === 'passed'}
  isBelowThreshold={planEx.status === 'failed'}
  highScore={planEx.score}
  ...
/>
```

Remove the `lessonProgress` prop scanning in `SessionSection`.

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/screens/DailySessionScreen.tsx
git commit -m "fix: DailySessionScreen reads from DailyPlan — removes mergedCompletedKeys"
```

---

### Task 7: Wire App.tsx and SyncService

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/services/firebase/syncService.ts`
- Modify: `src/stores/authStore.ts`
- Delete: `src/core/curriculum/dailyPlanCache.ts`

- [ ] **Step 1: Replace hydrateDailyPlanCache in App.tsx**

Change:
```typescript
import { hydrateDailyPlanCache } from './core/curriculum/dailyPlanCache';
```
To:
```typescript
import { hydrateDailyPlan } from './core/curriculum/DailyPlanManager';
```

Replace the call in the Promise.all:
```typescript
hydrateDailyPlan().catch((e) => logger.warn('[App] Daily plan hydration failed:', e)),
```

- [ ] **Step 2: Add pullPlanFromFirestore to syncService pullRemoteProgress**

In `syncService.ts`, after the existing `pullRemoteProgress` merge logic (after achievements merge), add:

```typescript
      // Pull daily plan from Firestore (merges with local — more completions wins)
      try {
        const { pullPlanFromFirestore } = require('../../core/curriculum/DailyPlanManager');
        await pullPlanFromFirestore();
      } catch (err) {
        logger.warn('[Sync:pull] Daily plan pull failed:', (err as Error)?.message);
      }
```

- [ ] **Step 3: Remove clearDailyPlanCache from authStore.ts**

In `resetAllStores()`, remove the `clearDailyPlanCache` try/catch block. The plan survives sign-out by design.

- [ ] **Step 4: Delete old dailyPlanCache.ts**

```bash
rm src/core/curriculum/dailyPlanCache.ts
```

- [ ] **Step 5: Run typecheck + full tests**

Run: `npx tsc --noEmit && npx jest --passWithNoTests`
Expected: 0 errors, all tests pass

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire DailyPlanManager into App + sync, delete old dailyPlanCache"
```

---

### Task 8: Post-Exercise TTS Sequencing

**Files:**
- Modify: `src/screens/PostExerciseScreen.tsx`

- [ ] **Step 1: Add Salsa auto-speak after cat dialogue**

Replace the existing auto-play useEffect with the two-phase TTS:

```typescript
  // Phase 1: Cat dialogue (1.5s after screen renders)
  useEffect(() => {
    if (hasAutoPlayed.current || !catDialogue) return;
    hasAutoPlayed.current = true;
    const timer = setTimeout(() => {
      ttsService.speak(catDialogue, { catId: selectedCatId });
    }, 1500);
    return () => { clearTimeout(timer); ttsService.stop(); };
  }, [catDialogue, selectedCatId]);

  // Phase 2: Salsa coaching (5s after screen — gives cat time to finish)
  const hasPlayedCoaching = useRef(false);
  useEffect(() => {
    if (!coachFeedback || coachLoading || hasPlayedCoaching.current) return;
    hasPlayedCoaching.current = true;
    const timer = setTimeout(() => {
      ttsService.speak(coachFeedback, { catId: 'salsa' });
    }, 5000);
    return () => { clearTimeout(timer); };
  }, [coachFeedback, coachLoading]);
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/screens/PostExerciseScreen.tsx
git commit -m "fix: TTS sequencing — cat dialogue first, salsa coaching after 5s gap"
```

---

### Task 9: Downgrade Sync Errors + Final Cleanup

**Files:**
- Modify: `src/services/firebase/syncService.ts`

- [ ] **Step 1: Downgrade logger.error to logger.warn for sync failures**

Replace all `logger.error` calls in syncService.ts with `logger.warn` — sync failures are expected when offline and should not show the red dev modal.

- [ ] **Step 2: Run full test suite + QA**

Run: `npx tsc --noEmit && npx jest --passWithNoTests && npm run test:qa`
Expected: 0 errors, all tests pass, QA suites pass

- [ ] **Step 3: Commit**

```bash
git add src/services/firebase/syncService.ts
git commit -m "fix: sync errors downgraded to warn — no red modal on offline"
```

---

### Task 10: Deploy Firestore Rules

- [ ] **Step 1: Deploy updated rules**

```bash
firebase deploy --only firestore:rules
```

Expected: Successful deployment with `dailyPlan` in the allowlist.

- [ ] **Step 2: Verify on device**

1. Complete an exercise → returns to HomeScreen → green ✓ or orange retry shows immediately
2. Kill app → reopen → same plan with completion markers
3. Sign out → sign in → same plan with completion markers
4. Lesson exercises come from current module, not future lessons
5. Challenge is a different skill from lesson

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Daily Plan System Redesign complete — unified plan with completion tracking"
```

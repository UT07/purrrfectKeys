# Daily Plan System Redesign

**Date:** March 26, 2026
**Scope:** Fix daily plan generation, completion tracking, persistence, and sync
**Branch:** test/stable-baseline
**Problem:** The daily plan system has 5 disconnected subsystems (plan cache, CurriculumEngine, completion overlay, key matching, sync) that keep breaking each other. Quick fixes in one area regress another.

---

## Core Principle

**The plan IS the source of truth.** No separate completion overlay. The plan stores its own completion state. One object, one save path, one lookup path.

---

## 1. Plan Data Structure

```typescript
interface DailyPlan {
  date: string;                    // YYYY-MM-DD (local timezone)
  sessionType: SessionType;        // new-material | review | challenge | mixed | endgame
  warmUp: PlanExercise[];
  lesson: PlanExercise[];
  challenge: PlanExercise[];
  songs: PlanExercise[];
  reasoning: string[];
}

interface PlanExercise extends ExerciseRef {
  // Completion state — updated in-place after each exercise
  status: 'pending' | 'passed' | 'failed';
  score: number | null;            // null = not attempted, 0-100 = attempted
  completedAt: number | null;      // epoch ms
}
```

ExerciseRef fields remain: `exerciseId`, `source`, `skillNodeId?`, `reason`, `fallbackExerciseId?`, `suggestedTempo?`.

---

## 2. Plan Lifecycle

### Generation
- Generates once per day (date-keyed)
- Generates on first access if no cached plan for today
- NEVER regenerates mid-day, even if skills change
- On sign-out: plan is NOT cleared (survives sign-out/sign-in)

### Completion Update
After each exercise:
1. Find the matching `PlanExercise` by `exerciseId` (static) or `skillNodeId` (AI)
2. Update `status`, `score`, `completedAt` in-place
3. Save updated plan to AsyncStorage (immediate)
4. Push to Firestore `users/{uid}/gamification/dailyPlan` (immediate, fire-and-forget)
5. HomeScreen/DailySessionScreen re-render from the plan — no separate lookup needed

### Plan Completion
When all non-song exercises have `status !== 'pending'`:
- Show "Plan Complete" celebration on HomeScreen
- Next `getDailyPlan()` call generates a fresh plan (even same day)
- Songs are optional — don't block plan completion

### Sync
- Push: after every exercise completion (immediate, not periodic)
- Pull: on sign-in, fetch `dailyPlan` doc. If date matches today, use it. Otherwise generate fresh.
- Merge: cloud plan wins if it has more completions than local

---

## 3. Exercise Selection (Hybrid)

### WARM UP (1-2 exercises)
- Source: mastered skills from CurriculumEngine (unchanged)
- Target: weak notes, recent skills needing review
- No tier cap (warm-ups review what you already know)

### LESSON (2 exercises, 1:1 split)
- **Slot 1 — Lesson Tree:** `findLessonTreeExercise()` scans lessons in order:
  - Priority 1: Failed exercise in current lesson (score < passingScore)
  - Priority 2: Next uncompleted exercise in current lesson
  - Priority 3: First exercise of next lesson (if current is complete)
  - Source: `'static'`, with real `exerciseId` from content
  - Navigation: `{ exerciseId, aiMode: false }` — loads static exercise directly

- **Slot 2 — AI Personalized:** `getNextSkillToLearn()` capped to current tier + 1
  - If nextSkill.tier > currentLessonTier + 1: pick a mastered skill for review instead
  - Source: `'ai-with-fallback'`, with `skillNodeId` and `fallbackExerciseId`
  - Navigation: `{ exerciseId: fallbackExerciseId ?? 'ai-mode', aiMode: true, skillId }`

### CHALLENGE (1 exercise)
- Source: `generateChallenge()` with `excludeSkillIds` from warmup + lesson
- MUST be a different skill than anything in lesson section
- Tier: up to currentLessonTier + 2 (stretch goal, harder than lesson)
- Tempo: +10 BPM over user's comfortable range
- If no unique skill available: pick deepest mastered skill at elevated tempo

### Current Lesson Tier Detection
```typescript
function getCurrentLessonTier(lessonProgress): number {
  // Scan lessons in order, find first non-completed
  // Map lesson number to skill tier (lesson 1-3 = tier 1-3, lesson 4-6 = tier 4-5, etc.)
  // Return the tier of the current lesson
}
```

---

## 4. Completion Matching

When user returns from ExercisePlayer:

```typescript
function updatePlanCompletion(plan: DailyPlan, exerciseId: string, skillId: string | null, score: number, passed: boolean): DailyPlan {
  const allExercises = [...plan.warmUp, ...plan.lesson, ...plan.challenge, ...plan.songs];

  // Match by exerciseId first (static exercises)
  let match = allExercises.find(e => e.exerciseId === exerciseId);

  // If no match, try skillNodeId (AI exercises have dynamic IDs)
  if (!match && skillId) {
    match = allExercises.find(e => e.skillNodeId === skillId);
  }

  if (match) {
    match.status = passed ? 'passed' : 'failed';
    match.score = score;
    match.completedAt = Date.now();
  }

  return plan; // mutated in-place, then saved
}
```

No scanning lessonProgress. No key format mismatches. The plan knows its own exercises.

---

## 5. UI Rendering

Both HomeScreen and DailySessionScreen read directly from the plan:

```typescript
// Green checkmark
const isPassed = exercise.status === 'passed';

// Orange retry
const isFailed = exercise.status === 'failed';

// Blue play button
const isPending = exercise.status === 'pending';

// Score display
const scoreText = exercise.score != null ? `Score: ${exercise.score}%` : exercise.reason;
```

No `mergedCompletedKeys`. No `lessonProgress` scanning. No `_ai_exercises` bucket lookups for display.

---

## 6. Persistence & Sync

### AsyncStorage
- Key: `purrrfect_keys_daily_plan`
- Saved: immediately after plan generation AND after every completion update
- Format: `JSON.stringify(plan)`

### Firestore
- Path: `users/{uid}/gamification/dailyPlan`
- Saved: immediately after every completion update (fire-and-forget)
- Pulled: on sign-in, merged with local (more completions wins)

### Sign-out
- Plan stays in AsyncStorage (NOT cleared by resetAllStores)
- Plan in Firestore persists

### Sign-in
- Pull `dailyPlan` doc from Firestore
- If date matches today AND has more completions than local: adopt cloud plan
- Otherwise: keep local plan (or generate fresh if no local)

---

## 7. Post-Exercise TTS

### Sequence
1. **1.5s pause** after XP transition (let sounds settle)
2. **Cat dialogue** speaks (equipped cat, pre-computed from score)
3. **3s pause** (let cat finish)
4. **Salsa coaching** speaks (AI-generated feedback, or fallback if not loaded yet)

### Salsa Accuracy
- Coaching prompt includes: exercise title, score breakdown, specific note errors
- If offline: use `offlineCoachingTemplates.ts` which are score-range-specific
- Never generic "great job" for a 41% score

---

## 8. Files Changed

| File | Change |
|------|--------|
| `src/core/curriculum/dailyPlanCache.ts` | Complete rewrite — plan tracks completion, save/load, Firestore sync |
| `src/core/curriculum/CurriculumEngine.ts` | Add `lessonProgress` param, tier cap for AI picks, return `PlanExercise[]` |
| `src/screens/HomeScreen.tsx` | Read completion from plan directly, remove lessonProgress scanning |
| `src/screens/DailySessionScreen.tsx` | Read completion from plan directly, remove mergedCompletedKeys |
| `src/screens/ExercisePlayer/ExercisePlayer.tsx` | Call `updatePlanCompletion()` after scoring |
| `src/services/firebase/firestore.ts` | Add `saveDailyPlan` / `getDailyPlan` CRUD |
| `src/services/firebase/syncService.ts` | Pull dailyPlan on sign-in |
| `src/screens/PostExerciseScreen.tsx` | TTS sequencing (cat → pause → salsa) |

---

## 9. What This Fixes

| Bug | How |
|-----|-----|
| #75 — Plan disconnected from lessons | Lesson slot reads lessonProgress |
| #109 — AI leaks into future lessons | Tier cap on AI picks |
| Completion not showing (green/orange) | Plan tracks its own completion |
| Challenge = lesson duplicate | excludeSkillIds enforced |
| Completion lost on sign-out/in | Plan persists in Firestore |
| Key mismatch (_ai_exercises) | No key matching — plan knows its exercises |
| Salsa inaccurate/slow | TTS sequencing + prompt accuracy |

---

## 10. What This Does NOT Change

- Exercise scoring (ExerciseValidator) — untouched
- Audio engine — untouched
- Cat evolution/abilities — untouched
- LevelMap/lesson tree — untouched (reads lessonProgress, not the plan)
- Sync queue for exercise scores — still goes to lessonProgress as before
- Exercise content/JSON — untouched

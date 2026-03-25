# Big 3 Bug Fix Design — #75, #62, F10

**Date:** March 25, 2026
**Scope:** Bug fixes only — no new gameplay modes, no new UI components
**Branch:** test/stable-baseline
**Note:** F2 (exercise type variety) is unfinished Phase 13 work, NOT a new feature.
It reopens immediately after this branch merges to master — not deferred to Phase 18.

---

## Bug #75: CurriculumEngine Disconnected From Lesson Tree

### Problem
`generateSessionPlan()` uses only `masteredSkills` + SkillTree DAG. It has zero references to `lessonProgress`. Users with failed exercises in their current lesson get random AI exercises instead of retries.

### Fix
Modify `generateLesson()` in CurriculumEngine.ts to read lessonProgress and apply a hybrid approach:

**Inputs added:** `lessonProgress` from progressStore (passed as parameter, not imported — keeps pure TS).

**Lesson section generation (2-3 slots):**
- Slot 1: Lesson-tree exercise — find current active lesson, pick first failed (score < passingScore) or next uncompleted exercise. Source: `'static'` with real exerciseId.
- Slot 2: AI-personalized pick from existing SkillTree logic (unchanged).
- Slot 3 (if applicable): More urgent source — another failed exercise if multiple failing, otherwise another AI pick.

**How to find "current lesson":**
- Iterate lessons in order (LESSON_ORDER from ContentLoader)
- First lesson where `status !== 'completed'` is the current lesson
- Within that lesson, find exercises where `highScore < passingScore` or no score at all

**Key files:**
- `src/core/curriculum/CurriculumEngine.ts` — modify `generateLesson()` signature + logic
- `src/core/curriculum/dailyPlanCache.ts` — pass lessonProgress to generateSessionPlan
- `src/screens/HomeScreen.tsx` — no changes (reads from cache)
- `src/screens/DailySessionScreen.tsx` — no changes (reads from cache)

**What NOT to change:**
- Warm-up generation (already works fine — reviews mastered skills)
- Challenge generation (already picks deeper skills + tempo boost)
- Session type selection logic
- Daily plan cache mechanism

---

## Bug #62: Note Highlighting Desynced From Scoring

### Problem
Two different beat sources:
- `expectedNotes` effect uses `effectiveBeat` (throttled to ~20fps) with `-0.5` lookahead
- `handleKeyDown` scoring uses `realtimeBeatRef.current` (60fps)

When a note is at the boundary, the highlight shows the NEXT note but scoring still expects the CURRENT note. User presses the highlighted key → "miss."

### Fix
Change the `expectedNotes` effect to use `realtimeBeatRef.current` instead of `effectiveBeat`:

- In the useEffect that computes `expectedNotes` (around line 1742), replace `effectiveBeat - 0.5` with `realtimeBeatRef.current - 0.3`
- Reduce lookahead from 0.5 beats to 0.3 beats — tighter sync with scoring window
- Both highlighting and scoring now read from the same 60fps beat source

**Key file:** `src/screens/ExercisePlayer/ExercisePlayer.tsx`

**Risk:** `realtimeBeatRef` is a ref, not state — the useEffect won't auto-trigger on ref changes. It's currently triggered by `effectiveBeat` dependency. Solution: keep `effectiveBeat` as the trigger but read `realtimeBeatRef.current` inside the effect for the actual calculation. This gives us the 20fps update rate (fine for visual highlighting) with the 60fps-accurate beat value.

---

## F10: AI Exercise Title Mismatch

### Problem
CurriculumEngine selects skill "Hand Independence Drill" → navigates to ExercisePlayer with `skillId` param → Gemini generates an exercise with its own title "C Rhythm Practice" → PostExercise shows "C Rhythm Practice" instead of the skill name.

### Fix
In ExercisePlayer, when displaying the exercise title for AI exercises, prefer the skill node's name over the generated exercise title:

- When `aiMode && skillIdParam`: look up `getSkillById(skillIdParam)?.name`
- Use that as the display title in the top bar and PostExercise cache
- The AI-generated `metadata.title` is kept internally for content but NOT shown to the user
- This ensures the title on DailySession card matches what PostExercise shows

**Key files:**
- `src/screens/ExercisePlayer/ExercisePlayer.tsx` — override display title for AI exercises
- `src/screens/postExerciseCache.ts` — receives the corrected title

---

## Implementation Order

1. **F10 first** (smallest, most visible) — title fix, ~10 lines changed
2. **#62 second** (contained to one effect) — beat source unification, ~5 lines changed
3. **#75 last** (biggest, touches CurriculumEngine) — lesson-aware plan generation

## Testing

- Existing 3,270 tests must pass
- Manual verification: complete exercise from lesson tree → Today's Practice shows it as green + doesn't regenerate unrelated exercises
- Note highlighting: play exercise → highlighted key matches what scoring expects
- AI title: AI exercise shows skill node name, not Gemini's generated name

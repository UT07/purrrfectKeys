# Confirmed Bugs — test/stable-baseline (410085d)

Every bug below is **verified present** in the current codebase via grep/code inspection.
Fix one at a time. User verifies on device. Then commit.

## P0 — Data Loss / Cross-Device Corruption

| # | File:Line | Bug | User Symptom |
|---|-----------|-----|-------------|
| 1 | `authStore.ts:296-303` | `migrateLocalToCloud()` runs BEFORE `pullRemoteProgress()` — pushes stale local data to Firestore on new device | Signing in on second device overwrites cloud data with wrong account's data |
| 2 | `syncService.ts:985` | `convertFirestoreExercise` sets `completedAt: Date.now()` for any `highScore > 0` | After sync, failed exercises (score 40%) show as "completed" with green checkmarks |

## P1 — Broken Features

| # | File:Line | Bug | User Symptom |
|---|-----------|-----|-------------|
| 3 | `HomeScreen.tsx:137` | `toISOString().split('T')[0]` = UTC date; progressStore uses local date | Daily goal shows 0/10 min after midnight for non-UTC users |
| 4 | `HomeScreen.tsx:680` | `isDailyChallengeCompleted()` called as function, not reactive selector | Daily reward calendar doesn't update after completing challenge |
| 5 | `LevelMapScreen.tsx:263` | `foundCurrent ? 'locked' : 'locked'` — dead ternary | Lessons after first locked one are permanently locked; can't progress |
| 6 | `authStore.ts:220-221` | `setDisplayName(authUser.displayName)` unconditional on every cold start | Custom display name overwritten by Google/Apple name on restart |
| 7 | `authStore.ts:86-107` | `rankStore` and `seasonStore` not in `resetAllStores()` | Previous user's rank leaks to next user on same device |

## P2 — Annoying / Economy Bugs

| # | File:Line | Bug | User Symptom |
|---|-----------|-----|-------------|
| 8 | `ExercisePlayer.tsx:881` | `Math.max(1, ...)` clamps practice time to minimum 1 minute | 10-second exercises count as 1 minute; daily goal inflated |
| 9 | `ExercisePlayer.tsx:1247` | `getChestType` called without `isPassed` guard | Chest gems awarded even on failed exercises |
| 10 | `ExerciseValidator.ts:298` | AI exercises get fresh ID each time; `previousHighScore` always 0 | +25 XP first-time bonus on EVERY AI attempt |
| 11 | `HomeScreen.tsx:535` | `__ai__` synthetic key counted in lessons filter | LESSONS counter inflated by AI exercises |
| 12 | `gemStore.ts:69,97` | `earnGems`/`spendGems` use `debouncedSave` (500ms) | Gems lost on force-quit within 500ms of earning |
| 13 | `leagueStore.ts:130` | `debouncedSave` called inside `set()` updater | Can double-save in StrictMode |
| 14 | `progressStore.ts:203` | Lesson completion uses hardcoded `highScore >= 60` | Exercises with `passingScore: 80` marked completed at 65% |
| 15 | `ExercisePlayer.tsx:1971` | Visual "perfect" = `timingToleranceMs * 0.5` but scoring uses full `timingToleranceMs` | Player sees "good" feedback but gets perfect score |
| 16 | `CatAvatar.tsx:263` | `overflow: 'hidden'` clips ears at small sizes and master-stage accessories | Cat ears look stubbed on HomeScreen |
| 17 | `XpSystem.ts:209` | `freezesAvailable++` with no cap | Infinite streak freezes after 700+ day streak |
| 18 | `socialStore.ts:62` | `addFriend` appends without dedup check | Duplicate friend entries on concurrent calls |
| 19 | `socialStore.ts:78` | `removeFriend` doesn't clean up `challenges` array | Stale challenges from removed friend remain |
| 20 | `authStore.ts` | `syncManager.stopPeriodicSync()` never called on signOut | 5-minute sync timer leaks after sign-out |
| 21 | `App.tsx:196-197` | `hydrateSeasonStore` and `hydrateRankStore` run in parallel via `Promise.all` | Season reset can read default MMR (0) if rank hasn't hydrated yet |

## Fix Order

**Phase A — Data Integrity (P0s first)**
1. Fix #1: migrateLocalToCloud guard (check remote exists before pushing)
2. Fix #2: convertFirestoreExercise completedAt (use remote timestamp, not fabricated)

**Phase B — Core UX (P1s)**
3. Fix #3: HomeScreen UTC → local date
4. Fix #4: isDailyChallengeCompleted → reactive selector
5. Fix #5: LevelMap dead ternary
6. Fix #6: displayName guard (only overwrite if default)
7. Fix #7: Add rankStore + seasonStore to resetAllStores

**Phase C — Economy & Polish (P2s)**
8-21. Fix one at a time, verify each.

## Rules
- One fix per commit
- `npm run typecheck && npm run test && npm run test:qa` must pass
- User verifies on device before merging to master
- NO batching, NO parallel agent fixes

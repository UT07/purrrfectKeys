# Confirmed Bugs — test/stable-baseline (c84c698)

Every bug below is **verified present** in the current codebase via grep/code inspection.
Includes bugs found in today's audit + unfixed bugs from PR #141 and #143 audit work.
Fix one at a time. User verifies on device. Then commit.

## P0 — Data Loss / Cross-Device Corruption

| # | File:Line | Bug | User Symptom | Source |
|---|-----------|-----|-------------|--------|
| 1 | `authStore.ts:296-303` | `migrateLocalToCloud()` runs BEFORE `pullRemoteProgress()` — pushes stale local data to Firestore on new device | Signing in on second device overwrites cloud data with wrong account's data | Today |
| 2 | `syncService.ts:985` | `convertFirestoreExercise` sets `completedAt: Date.now()` for any `highScore > 0` | After sync, failed exercises show as "completed" | Today |
| 3 | `ExercisePlayer.tsx` | `handleExerciseCompletion` reads `skillIdParam` and `testMode` from closure, not refs — stale on navigation.replace | Skill mastery/progress recorded for wrong skill after nav | PR #141 (2d1edc7) |

## P1 — Broken Features

| # | File:Line | Bug | User Symptom | Source |
|---|-----------|-----|-------------|--------|
| 4 | `HomeScreen.tsx:137` | `toISOString().split('T')[0]` = UTC date; store uses local | Daily goal shows 0/10 min after midnight for non-UTC users | Today |
| 5 | `HomeScreen.tsx:680` | `isDailyChallengeCompleted()` not reactive | Daily reward calendar doesn't update after challenge completion | Today |
| 6 | `LevelMapScreen.tsx:263` | `foundCurrent ? 'locked' : 'locked'` dead ternary | Lessons after first locked one permanently locked | Today |
| 7 | `authStore.ts:220-221` | `setDisplayName` unconditional on cold start | Custom display name overwritten by Google/Apple name | Today |
| 8 | `authStore.ts:86-107` | `rankStore`, `seasonStore`, `guildStore` not in `resetAllStores()` | Previous user's rank/season/guild leaks to next user | PR #141 (179c724) |
| 9 | Multiple screens | Module-level `Dimensions.get()` in 5+ screens | Wrong layout after rotation or split-screen | PR #141 (215dee9) |
| 10 | `ExercisePlayer.tsx` | `abilityConfig` read from closure in completion callback | Stale ability tolerances in AI mode | PR #141 (908d44e) |
| 11 | `ExercisePlayer.tsx` | Miss flash setTimeout has no mountedRef guard | setState on unmounted component during rapid navigation | PR #141 (2d1edc7) |

## P2 — Economy / Polish / Edge Cases

| # | File:Line | Bug | User Symptom | Source |
|---|-----------|-----|-------------|--------|
| 12 | `ExercisePlayer.tsx:881` | `Math.max(1, ...)` clamps practice time to min 1 minute | 10-second exercises count as 1 minute; daily goal inflated | Today |
| 13 | `ExercisePlayer.tsx:1247` | `getChestType` no `isPassed` guard | Chest gems on failed exercises | Today |
| 14 | `ExerciseValidator.ts:298` | AI exercises: `previousHighScore` always 0 | +25 XP first-time bonus on every AI attempt | Today |
| 15 | `HomeScreen.tsx:535` | `__ai__` key counted in lessons filter | LESSONS counter inflated | Today |
| 16 | `gemStore.ts:69,97` | `earnGems`/`spendGems` use `debouncedSave` | Gems lost on force-quit | Today |
| 17 | `leagueStore.ts:130` | `debouncedSave` inside `set()` updater | Double-save in StrictMode | Today |
| 18 | `progressStore.ts:203` | Lesson completion hardcoded `>= 60` | Wrong passing threshold | Today |
| 19 | `ExercisePlayer.tsx:1971` | Visual "perfect" = `tolerance * 0.5` but scoring uses full | Feedback/score mismatch | Today |
| 20 | `CatAvatar.tsx:263` | `overflow: 'hidden'` clips master-stage accessories | Accessories clipped on small avatars | Today |
| 21 | `XpSystem.ts:209` | `freezesAvailable++` no cap | Infinite streak freezes | Today |
| 22 | `socialStore.ts:62` | `addFriend` no dedup | Duplicate friend entries | Today |
| 23 | `socialStore.ts:78` | `removeFriend` doesn't clean challenges | Stale challenges remain | Today |
| 24 | `authStore.ts` | No `stopPeriodicSync()` on signOut | Sync timer leaks | Today |
| 25 | `App.tsx:196-197` | Season + rank hydrate in parallel | Season reads default MMR if rank not ready | Today |
| 26 | `ExpoAudioEngine` | `setVolume` propagates to playing sounds, overrides per-note velocity | Audible volume jump during polyphony | PR #141 (b0f1330) |
| 27 | `XPTransitionOverlay` | Star2/star3 setTimeout not in tracked timers array | Orphaned sound/haptic effects after unmount | PR #141 (354fe2a) |
| 28 | `MascotBubble/SalsaCoach` | `hasSpokenRef` not reset when message prop changes | New TTS messages silently skipped | PR #141 (354fe2a) |
| 29 | `rankStore` | `pendingRankChange` not cleared in `reset()` | Rank change overlay shows for wrong account | PR #141 (cf4e8d1) |
| 30 | `ExercisePlayer` | Achievement context extras not populated | 19+ achievements can never unlock | PR #141 (24b9bb6) |
| 31 | `SkillTree/learnerProfile` | Skill decay formula linear instead of exponential half-life | 2x too aggressive review nagging | PR #141 (24b9bb6) |
| 32 | `ExercisePlayer` | Streak update after `recordExerciseCompletion` | Streak milestones use stale value | PR #141 (24b9bb6) |
| 33 | `CurriculumEngine` | Brittle circular array slice+concat for category rotation | Can crash or skip categories | PR #141 (7d409fd) |
| 34 | `ExerciseValidator` | Hard-cutoff extra notes penalty (100 - count*10) | Extra note score goes to 0 abruptly | PR #141 (7d409fd) |
| 35 | `progressStore` | `createDebouncedSave` has stale closure (no latestState ref) | Debounced save writes old state | PR #141 (0541709) |
| 36 | `settingsStore` | Non-critical settings use debouncedSave | Onboarding/mic/profile state lost on quick quit | PR #141 (0541709) |
| 37 | `progressStore` | No `dailyGoalData` pruning >90 days | Unbounded storage growth | PR #141 (0541709) |
| 38 | `ExercisePlayer` | No self-challenge prevention (uid check) | User can challenge themselves | PR #141 (0541709) |
| 39 | `Firebase rules` | Friends create rule doesn't verify sender identity | Spoofed friend requests | PR #141 (6f4e746) |
| 40 | `Firebase rules` | Guild member can self-promote role | Privilege escalation | PR #141 (6f4e746) |
| 41 | `socialService` | `resolveChallengeGemStake` not in Firestore transaction | Race condition on challenge resolution | PR #141 (6f4e746) |
| 42 | `notificationService` | `cancelAll` instead of selective cancellation | Clears unrelated notifications | PR #141 (6f4e746) |
| 43 | `NoteTracker` | `lastVoicedTime` updated for any voiced frame | Release delay when confirming next note | PR #141 (b0f1330) |
| 44 | `PolyphonicDetector` | Timestamp captured after ONNX inference | ~50ms timestamp drift | PR #141 (b0f1330) |
| 45 | `Replay coaching` | Pause point at beat 0 freezes replay | Salsa replay stuck | PR #143 (0709efe) |
| 46 | `syncService` | `pullRemoteProgress` missing `.catch()` on fetches | One failing fetch kills entire pull | PR #143 (0709efe) |
| 47 | `ExercisePlayer` | SalsaIntro overlay blocks auto-start | Exercise doesn't auto-start | PR #143 (8a486c6) |
| 48 | `Coaching` | Cloud Function timeout 15s, Gemini 15s | Slow fallback to offline templates | PR #143 (8a486c6) |
| 49 | `catEvolution` | No currentStage reconciliation on hydration when thresholds change | Silent stage demotion | PR #143 (42651e1) |
| 50 | `catEvolution` | Multi-stage XP jump only awards final milestone gems | Missing intermediate gems | PR #143 (42651e1) |
| 51 | `catEvolution` | Equipped accessories not validated against evolution stage on hydration | Impossible accessories equipped | PR #143 (42651e1) |

## Fix Order

**Phase A — Data Integrity (P0: #1-3)**
Cherry-pick the safe parts of these fixes, verify on device.

**Phase B — Core UX (P1: #4-11)**
One fix, one commit, one device test.

**Phase C — Economy & Polish (P2: #12-51)**
One fix at a time, verify each.

## Rules
- One fix per commit
- `npm run typecheck && npm run test && npm run test:qa` must pass
- User verifies on device before merging to master
- NO batching, NO parallel agent fixes
- Cherry-pick from PR #141/#143 where safe; rewrite where the original fix caused regressions

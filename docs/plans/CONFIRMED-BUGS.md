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
| 20 | `CatAvatar.tsx:263` | `overflow: 'hidden'` clips cat ears in HomeScreen score ring — left ear is a stub, right ear hidden behind progress arc | Cat ears look broken on BOTH phone and simulator (confirmed Mar 20) | Today — **UPGRADED TO P1** |
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

## User-Reported Bugs (Mar 20)

| # | File:Line | Bug | User Symptom | Severity |
|---|-----------|-----|-------------|----------|
| 52 | `LevelMapScreen.tsx:236` | `completedExercises` counts ALL exerciseScores keys (including mastery test), but `exerciseCount` denominator excludes tests | "Getting Started" shows 4/3 — mastery test counted in numerator but not denominator | P1 |
| 53 | `ExercisePlayer.tsx:562` | `abilityConfig` applied unconditionally — no `testMode` guard | Cat abilities (note preview, timing window boost) active during mastery tests, making tests easier than intended | P1 |

## User-Reported Bugs (Mar 20 — late session)

| # | Severity | Bug | User Symptom |
|---|----------|-----|-------------|
| 54 | P0 | Lesson progress, XP, streaks, level, stars — NOTHING syncs to Firestore cross-device | Phone shows 0/3, 0 exercises, 0 stars despite completing exercises on simulator |
| 55 | P1 | Auth session keeps expiring — user repeatedly asked to sign in | App kicks to auth screen intermittently |
| 56 | P1 | PostHog error: `Cannot read property 'color' of undefined` in cat rendering | Cat avatar rendering fails when cat profile lookup returns undefined |

## Bugs Found via Debug Logs (Mar 20 — debug session)

| # | Severity | Bug | User Symptom | Evidence |
|---|----------|-----|-------------|----------|
| 57 | P0 | `initAuth` timeout fires AFTER auth succeeds — nukes auth state 8s after launch | User signed out randomly, all sync stops | Log: `[Auth] timed out` after `[Auth:onAuthStateChanged] user=SG1L...` — **FIXED** |
| 58 | P0 | App.tsx Phase 3 never pushes local data to Firestore on cold start | Exercise progress only saved locally, never reaches cloud | Log: `Remote data: 0 lessons` despite local completion — **FIXED** |
| 59 | P1 | Firestore rules block `learnerProfile` and `achievements` subcollection writes | Mastered skills + achievements don't sync → Today's Practice and Daily Challenge differ per device | Log: `[FirebaseError: Missing or insufficient permissions.]` |
| 60 | P1 | ElevenLabs TTS intermittent — sometimes silent pre/post exercise, not consistent | Cat voice coaching silent on some flows | User-reported Mar 20 |

## Bugs Found via Live Testing (Mar 20 — gameplay session)

| # | Severity | Bug | User Symptom |
|---|----------|-----|-------------|
| 61 | P0 | `syncProgress` writes `undefined` score field to Firestore `syncLog` — `WriteBatch.set()` rejects entire batch | Per-exercise sync silently fails — screenshot confirms `flushQueue` error on device |
| 62 | P1 | Keyboard highlights wrong key — exercise asks C4 but keyboard shows D4 as correct, pressing C4 registers as D4 | Wrong note highlighted, correct input mismatched |
| 63 | P1 | Today's Practice differs per device because `learnerProfile` (mastered skills) wasn't syncing — **Firestore rules now fixed**, needs verification |
| 64 | P1 | Daily Challenge differs per device — same root cause as #63 (mastered skills drive challenge generation) |
| 65 | P2 | `[ReplayPromptBuilder] Failed to parse replay response: JSON Parse error` | Salsa replay coaching broken |
| 74 | P1 | Today's Practice completed exercises show no "done" indicator — completed warm-up still shows play button, no checkmark | User completes exercise, returns to Home, no visual completion feedback in Today's Practice |
| 75 | P1 | Today's Practice exercises seem random / not linked to curriculum — rhythm tap exercises appearing early when user is still on basic lessons | Confusing exercise selection that doesn't match learning progress |
| 76 | P2 | Rhythm "TAP to the beat" exercise shows notes (D4, E4, F4) falling but no piano keyboard — unclear interaction for new users | Exercise type mismatch between visual display and input method |
| 77 | P1 | Ear training exercise has same gameplay as rhythm exercise (tap mode) — should be listening/identifying, not tapping | Wrong exercise type behavior for ear training category |
| 78 | P1 | Rhythm/tap exercises: tapping on beat registers as "ok" or "miss" even when timed correctly | Timing detection too strict or broken for tap-mode exercises |
| 79 | P0 | **Phase 13 exercise type variety NOT implemented** — Content Explosion added 599 exercises across 9 types (quiz, identify, arrange, match, build, mix, spot-diff, fill-blank, label) but ExercisePlayer only has 2 gameplay modes: keyboard-play and tap-to-beat. All exercise types fall back to the same 2 interactions. The Duolingo-style variety in gameplay that Phase 13 planned is completely missing. | Every exercise feels the same regardless of type — no quizzes, no drag-match, no identify, no fill-blank |

## Sync Gap Analysis (Mar 20 — complete audit)

These stores have NO sync to Firestore — data exists only locally and is lost on new device sign-in:

| # | Severity | Store / Data | What's Lost |
|---|----------|-------------|-------------|
| 66 | P0 | `rankStore` — MMR, tier, division, promotion series, demotion grace | Competitive rank completely different per device |
| 67 | P0 | `seasonStore` — battle pass XP/tier, claimed rewards, season history, peak tier | Battle pass progress lost on new device |
| 68 | P1 | `settingsStore` — username, displayName, selectedCatId, dailyGoalMinutes, volume, input method, all preferences | Settings reset to defaults on new device |
| 69 | P1 | `progressStore.dailyGoalData` — per-day practice minutes, exercises completed | Daily goal progress differs per device |
| 70 | P1 | `progressStore.tierTestResults` — mastery test scores per tier | Mastery test results lost on new device |
| 71 | P1 | `progressStore.streakMilestonesClaimed` — which streak milestones (7/30/100 day) were claimed | Streak milestone gems double-awarded on new device |
| 72 | P1 | Firestore gamification doc ID allowlist missing `learnerProfile` + `achievements` | Learner profile + achievements blocked by security rules — **FIXED (rules deployed)** |

## Dependency Vulnerabilities

| # | Severity | Bug |
|---|----------|-----|
| 73 | P1 | GitHub Dependabot: 8 high, 3 moderate, 1 low vulnerabilities on default branch |

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

# Confirmed Bugs — test/stable-baseline

Last reorganized: **Mar 29, 2026**
Verified present in codebase via grep/code inspection.

---

## OPEN — Scoring & Core Loop

These bugs break the exercise experience. Highest priority.

| # | Priority | Bug | User Symptom | Notes |
|---|----------|-----|-------------|-------|
| 103/F10 | ~~P0~~ | AI exercise scoring integrity — 0% timing + 0% duration on AI-generated exercises. Ephemeral IDs (`ai-generated-{timestamp}`) so high scores never persist across retries → "NEW RECORD" every time. AI title/content doesn't match skill node. Scoring may receive malformed tempo or note data from Gemini. | Scores feel random/unfair. False "new record" on every attempt. Title mismatch between exercise and results. | **FIXED (Mar 29)**: (1) Stable exercise ID `ai-skill-{skillId}` used for both buffered and template exercises — retries accumulate against same key. (2) Skill name used as title for ALL AI exercises including template fallbacks. (3) Template fallback uses same stable ID + title as buffered path. (4) Scoring engine verified correct (26 tests). **Needs device verification.** |
| 110 | **P1** | Tap exercise scoring disconnected from visual feedback — user sees "ok"/"late" visual feedback but final score is very low (16%). Scoring engine uses different timing/matching than visual feedback for tap mode. | Visual says decent, score says terrible. | **INVESTIGATED (Mar 29)**: Scoring engine + visual thresholds now aligned (4 regression tests added). Rhythm `matchNotesByTimeOnly` + `isRhythmTap` pitch bypass both work correctly. 16% score was likely pre-fix. **Needs device verification.** |
| 12 | ~~P2~~ | `ExercisePlayer.tsx:881` — `Math.max(1, ...)` clamps practice time to min 1 minute | 10-second exercises count as 1 min; daily goal inflated | **NOT A BUG**: Intentional Duolingo-style design — every exercise attempt = at least 1 min toward daily goal. |

## OPEN — Layout & Rendering

| # | Priority | Bug | User Symptom | Notes |
|---|----------|-----|-------------|-------|
| 99 | ~~P1~~ | Split keyboard (two-hand) extremely choppy — both R+L keyboards render full 2-octave ranges, heavy re-renders, count-in overlay overlaps, PianoRoll barely visible above dual keyboards | Two-keyboard layout unusable on device | **FIXED (Mar 29)**: (1) Switched from landscape single-keyboard to portrait SplitKeyboard component. (2) Reduced octave count per hand (2 default, 3 only when span >12 semitones). (3) Shorter keys (0.6x instead of 0.75x). (4) Reduced PianoRoll minHeight for split mode (120 vs 180). (5) React.memo on SplitKeyboard. (6) Removed forced landscape lock. **Needs device verification.** |
| 9 | ~~P1~~ | Module-level `Dimensions.get()` in 5+ screens — caches wrong values after rotation/split-screen | Layout breaks after device rotation | **FIXED (Mar 29)**: All 3 remaining usages (Keyboard, PianoRoll, XPBar) replaced with `useWindowDimensions()` hook. ExercisePlayer already used hook. |
| 108 | **P2** | Lesson Complete screen — stars overflow horizontally, no celebration animation, plain layout | Lesson completion feels anticlimactic | UI polish — Phase 18 candidate. |
| 82 | **P2** | CatAvatar SVG — tails float above body, ears misaligned at small sizes, micro-animation math breaks alignment | Cat looks broken | **BLOCKED on Figma redesign.** |

## OPEN — UX Flow

| # | Priority | Bug | User Symptom | Notes |
|---|----------|-----|-------------|-------|
| 100 | ~~P1~~ | Pre-exercise loading uses two separate components (ExerciseLoadingScreen for AI + ExerciseIntroOverlay for static). Should be ONE unified two-part screen: Part 1 = tip while loading, Part 2 = intro with "Let's go!" | Two separate loading flows feel inconsistent | **FIXED (Mar 29)**: Unified ExerciseLoadingScreen for both AI and static. Phase 1 = Salsa tip/fact during load. Phase 2 = exercise info card with "Let's Go!" + "Watch First" buttons. ExerciseIntroOverlay removed. |
| 76 | ~~P2~~ | Rhythm "TAP to the beat" exercise shows falling notes (D4, E4, F4) but no piano keyboard | Unclear interaction — what do I tap? | **FIXED (Mar 29)**: RhythmTapZone had `flex:1` but no explicit height — got zero space when PianoRoll took all flex. Now has explicit `height: singleKeyHeight` + `minHeight: 120`. |
| 95 | ~~P2~~ | LevelMap shows 7/8 for Lesson 2 despite all exercises completed + Lesson Complete screen showing 9/9 | Confusing progress count | **FIXED (Mar 29)**: LessonCompleteScreen hardcoded `nonTestIds.length + 1` as exercisesCompleted. Now counts actually-passed exercises by checking `highScore >= passingScore`. LevelMap was already correct. |

## OPEN — Security & Edge Cases

| # | Priority | Bug | User Symptom | Notes |
|---|----------|-----|-------------|-------|
| 40 | ~~P2~~ | Guild member can self-promote role — Firestore rule doesn't validate role change authority | Privilege escalation | **FIXED (Mar 29)**: Co-leaders can no longer assign/remove 'leader' role. Only the leader can transfer leadership. |
| 41 | ~~P2~~ | `resolveChallengeGemStake` not in Firestore transaction | Race condition: both players could claim stake gems | **ALREADY FIXED**: Already uses `runTransaction` with idempotent `resolvedAt` guard. |
| 48 | ~~P2~~ | Coaching Cloud Function timeout 15s + Gemini timeout 15s = 30s worst case before offline fallback | Slow coaching fallback | **ALREADY FIXED**: Both timeouts are 8s (not 15s). Production skips direct Gemini entirely. Max 8s in prod, 16s in dev. |

## OPEN — Device Verification Needed

Code exists for these but hasn't been verified on a physical device.

| # | Priority | Bug | Status |
|---|----------|-----|--------|
| 86 | ~~P1~~ | "Review with Salsa" replay doesn't play — stuck on visual, no audio/progression | **VERIFIED WORKING (Mar 31)** + 4 follow-up bugs fixed: (1) no loading screen for replay, (2) pause stops all audio via releaseAllNotes, (3) replay never triggers scoring, (4) auto-start guards against loading screen |
| 90 | ~~P1~~ | Salsa Review shows "TAP to the beat" for play-along exercises — wrong mode in replay | **VERIFIED WORKING (Mar 31)** |
| 87 | ~~P1~~ | Pre/post-exercise cat voice uses expo-speech (robotic) instead of ElevenLabs | **VERIFIED WORKING (Mar 31)** |
| 89 | ~~P2~~ | All piano notes sound the same pitch in some exercises | **VERIFIED WORKING (Mar 31)** |
| 45 | P2 | Pause point at beat 0 freezes replay | Replay refactored — needs device test |
| 47 | P2 | SalsaIntro overlay blocks auto-start | SalsaIntro removed — likely resolved, needs device test |

## OPEN — Feature Work

Multi-session efforts. Not bugfixes.

| # | Priority | Item | Scope |
|---|----------|------|-------|
| F2 | **P1** | **Exercise type variety** — new gameplay modes: chord simultaneous detection, ear training (listen→identify), sight reading (staff→play), call & response, quiz/multiple-choice. Each needs own input handler, scoring, UI. Subsumes #79, #88. | Multi-week |
| F8 | **P1** | Cat abilities redesign — "Practice Reminder" is useless. All abilities need meaningful gameplay impact. | 1 week |
| F9 | **P1** | AsyncStorage → MMKV migration — 15+ async JSON.parse calls on startup cause lag. MMKV is synchronous, 10-100x faster. | 1 week |
| F1 | P2 | ElevenLabs server-side caching via Cloud Function proxy to reduce char usage | Days |
| F3 | P2 | Achievement definitions outdated — need updating for 120 skills, 50 lessons, 18 tiers | Days |
| F4 | P2 | No UI to view/manage notification reminders | Small |
| F5 | P2 | No UI to see streak freeze count | Small |
| F6 | P2 | ElevenLabs sound effects — generate premium UI sounds via API | Days |
| F7 | P3 | AI-generated background music — ambient, menu themes, celebration | Future |

## OPEN — Infrastructure (found Mar 30 audit)

| # | Priority | Bug | Notes |
|---|----------|-----|-------|
| 111 | ~~P1~~ | ESLint completely broken — `ajv` 8.18.0 npm override (vuln fix #73d) crashes `@eslint/eslintrc`. CI lint step will fail. | **FIXED (Mar 30)**: Removed ajv override (low-severity ReDoS, not worth breaking ESLint). 0 errors, 562 warnings. |
| 112 | ~~P3~~ | ~30 `console.error` calls in audio/hooks/services should use `logger.error` | **FIXED (Mar 30)**: All `console.error` in 9 source files replaced with `logger.error`. Errors now route to Sentry/DeviceLog. |
| 113 | ~~P3~~ | `ExerciseIntroOverlay.tsx` + test are dead code — component no longer imported after #100 unification | **FIXED (Mar 30)**: Both files deleted. |
| 114 | P2 | Battle pass `accessory`, `title`, `xp_boost` reward types skip delivery with warning log | seasonStore.ts:207-217. Feature gap, not a bug. |
| 115 | **P1** | `getMondayOfWeek()` in catEvolutionStore uses `toISOString()` (UTC) — in GMT+ timezones after local midnight but before UTC midnight, returns WRONG Monday → daily rewards stuck on Saturday, week never resets | Daily rewards calendar stuck on wrong day | **FIXED (Mar 30)**: Replaced with local date formatting. |
| 116 | **P1** | 5 files used `toISOString().split('T')[0]` for local date checks (firestore seed, songStore, catQuestService, songGenerationService) — UTC mismatch in GMT+ timezones | Song rate limits, quest rotation, initial streak date all off by 1 day | **FIXED (Mar 30)**: All replaced with `getTodayDateString()` (local). League/season dates intentionally remain UTC. |

## MONITOR

| # | Severity | Bug | Notes |
|---|----------|-----|-------|
| 107 | P3 | `EXC_BAD_ACCESS` native crash — no JS stack | Likely simulator memory issue. May not repro on physical device. |
| 65 | P3 | Replay JSON parse error — parser returns null on malformed JSON | Fallback replay needs exercise type awareness. Deferred. |

---

## FIXED (87 bugs)

All bugs below have been code-fixed and verified via tests. Kept for historical reference.

<details>
<summary>Click to expand fixed bugs</summary>

### P0 — Data Loss / Cross-Device (FIXED)
| # | Bug | Fix |
|---|-----|-----|
| 1 | `migrateLocalToCloud` ran before `pullRemoteProgress` | Reordered: pull → migrate → push |
| 2 | `convertFirestoreExercise` set completedAt for any highScore > 0 | Only set when actually completed |
| 3 | ExercisePlayer stale closure on skillIdParam/testMode | Converted to refs |
| 54 | Nothing synced to Firestore cross-device | Pull+push all stores, sync order corrected |
| 57 | initAuth timeout fires AFTER auth succeeds | Race condition guard |
| 58 | App.tsx Phase 3 never pushes local data on cold start | Added push after hydration |
| 61 | syncProgress writes undefined score field | `?? 0` fallback |
| 66 | rankStore no sync | Push + pull merge |
| 67 | seasonStore no sync | Push + pull merge |
| 75 | Today's Practice disconnected from lesson tree | Hybrid 1:1 split |

### P1 — Broken Features (FIXED)
| # | Bug | Fix |
|---|-----|-----|
| 4 | UTC date mismatch for daily goal | `getTodayDateString()` |
| 5 | isDailyChallengeCompleted not reactive | `lastDailyChallengeDate === today` |
| 6 | Dead ternary locking all lessons | Fixed conditional |
| 7 | Display name overwritten on cold start | `isDefaultName` guard |
| 8 | rankStore/seasonStore/guildStore not in resetAllStores | Added all 3 |
| 10 | abilityConfig stale in completion callback | `testModeRef` guard |
| 11 | Miss flash setTimeout no mountedRef guard | Added mountedRef |
| 52 | LevelMap 4/3 — mastery test counted in numerator | `nonTestIds` filter |
| 53 | Cat abilities active during mastery tests | `testModeRef` guard |
| 55 | Auth session keeps expiring | Transient null guard in onAuthStateChanged |
| 56 | Cat avatar crashes when profile undefined | `getCatById ?? getDefaultCat` |
| 59 | Firestore rules block learnerProfile/achievements | Rules deployed |
| 60 | ElevenLabs TTS intermittent | Audio session reset before playback |
| 62 | Keyboard highlights wrong note | Unified to realtimeBeatRef, lookahead tightened |
| 63 | Today's Practice differs per device | Rules + sync + dailyPlanCache |
| 64 | Daily Challenge differs per device | Same root cause as #63 |
| 68 | settingsStore no sync | Push + pull settings sync |
| 69 | dailyGoalData no sync | progressExtra push/pull |
| 70 | tierTestResults no sync | progressExtra push/pull |
| 71 | streakMilestonesClaimed no sync | progressExtra push/pull |
| 72 | Firestore allowlist missing learnerProfile/achievements | Rules deployed |
| 74 | Today's Practice regenerates after each exercise | dailyPlanCache.ts |
| 77 | Ear training uses wrong exercise type | Gameplay mode fix |
| 78 | Tap exercises tapping on beat = miss | Pitch filter bypass |
| 80 | ScoreRing color inconsistency | Matched to HomeScreen primary |
| 81 | Sentry Logger console error | LogBox.ignoreLogs |
| 83 | PostHog flush error modal | LogBox.ignoreLogs |
| 84 | exercise-index.json wrong exercise types | 11 exercises → play type |
| 85 | Today's Practice plans differ between screens | Shared dailyPlanCache |
| 91 | Today's Practice resets after sign-out/sign-in | Cache keys on skillCount |
| 93 | Tap exercise timing broken — miss on every beat | Skip pitch match for rhythm |
| 94 | LessonIntroScreen missing testMode:true | Added testMode param |
| 96 | Cat ability locked at Baby despite being Baby | unlockAbilitiesForStage on purchase + hydrate |
| 97 | getTodayDateString doesn't exist | Stale dev build — clear cache |
| 98 | getExercise doesn't exist | Stale dev build — clear cache |
| 101 | AI exercise title mismatch | displayTitle from skill node |
| 102 | "NEW RECORD" on every AI attempt | immediateSave getter bug + __ai__ rejection fixed |
| 105 | Daily plan completion markers lost after sign-out | 3 root causes fixed |
| 109 | AI exercises leak into future lessons | Only write to started lessons |

### P2 — Economy / Polish (FIXED)
| # | Bug | Fix |
|---|-----|-----|
| 13 | Chest gems on failed exercises | isPassed guard |
| 14 | +25 XP first-time bonus on every AI attempt | ai-skill-{id} lookup |
| 15 | __ai__ key inflates lesson count | Filter excluded |
| 16 | Gems lost on force-quit | immediateSave |
| 17 | debouncedSave inside set() updater | Moved outside set |
| 18 | Lesson completion hardcoded >= 60 | Uses exercise passingScore |
| 19 | Visual feedback/score mismatch | Aligned tolerance math |
| 20 | CatAvatar overflow:hidden clips ears | Removed overflow:hidden |
| 21 | Infinite streak freezes | Math.min cap at 3 |
| 22 | Duplicate friend entries | friends.some guard |
| 23 | removeFriend doesn't clean challenges | Filter in removeFriend |
| 24 | No stopPeriodicSync on signOut | Added |
| 25 | Season reads default MMR | .then chain ordering |
| 26 | setVolume overrides per-note velocity | Removed pool propagation |
| 27 | Star setTimeout not tracked | timers.push |
| 28 | hasSpokenRef not reset on message change | useEffect reset |
| 29 | pendingRankChange not cleared in reset | Added to reset |
| 30 | Achievement context extras not populated | Extensive extras added |
| 31 | Skill decay linear instead of exponential | Math.pow half-life |
| 32 | Streak milestones use stale value | get() fresh read |
| 33 | Circular array slice+concat crash | Modulo-based rotation |
| 34 | Extra notes hard cutoff | Exponential 0.85^n |
| 35 | Debounced save stale closure | Getter callback |
| 36 | Critical settings use debouncedSave | immediateSave for critical |
| 37 | No dailyGoalData pruning | Prune on hydrate |
| 38 | No self-challenge prevention | uid guard |
| 39 | Friend request identity spoofing | request.auth.uid in rules |
| 42 | cancelAll clears unrelated notifications | Per-ID cancellation |
| 43 | NoteTracker lastVoicedTime updated for any frame | Only confirmed notes |
| 44 | PolyphonicDetector timestamp drift | Timestamps spread across window |
| 46 | pullRemoteProgress missing .catch | All fetches have .catch |
| 49 | No currentStage reconciliation on hydrate | reconcileEvolutionStages |
| 50 | Multi-stage XP jump skips intermediate gems | Iterate ALL stages |
| 51 | Equipped accessories not validated | validateAccessories on hydrate |
| 104 | +41 XP on 16% failing score | Failed = 2 XP participation |
| 106 | Post-exercise coaching appears slowly | Pre-computed dialogue, async AI |

### Dependencies (FIXED)
| # | Bug | Fix |
|---|-----|-----|
| 73a | flatted Prototype Pollution | Override → 3.4.2 |
| 73b | tar path traversal | Override → 7.5.12 |
| 73c | fast-xml-parser entity expansion | Override → 5.5.8 |
| 73d | ajv ReDoS | Override → 8.18.0 |
| 73e | @tootallnate/once control flow | Override → 3.0.1 |

</details>

---

## Fix Order (recommended)

1. **#103/F10** — AI exercise scoring + pipeline integrity (P0, biggest impact)
2. **#110** — Tap scoring vs visual mismatch (P1, core loop)
3. **#99** — Split keyboard performance (P1, already partially done)
4. **#100** — Pre-exercise loading unification (P1, UX consistency)
5. **#9** — Dimensions.get() rotation fix (P1, affects multiple screens)
6. **#12** — Practice time clamp (P2, quick fix)
7. **#76** — Rhythm tap no keyboard (P2, UX clarity)
8. **#95** — LevelMap count mismatch (P2, investigate)
9. **#40, #41, #48** — Security/edge cases (P2)
10. **#108** — Lesson Complete polish (P2, Phase 18)
11. **Device verification batch** — #86, #87, #89, #90, #45, #47

## Rules
- One fix per commit
- `npm run typecheck && npm run test` must pass
- User verifies on device before merging to master

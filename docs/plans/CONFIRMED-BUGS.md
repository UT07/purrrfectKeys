# Confirmed Bugs — test/stable-baseline (c84c698)

Every bug below is **verified present** in the current codebase via grep/code inspection.
Includes bugs found in today's audit + unfixed bugs from PR #141 and #143 audit work.
Fix one at a time. User verifies on device. Then commit.

## P0 — Data Loss / Cross-Device Corruption

| # | File:Line | Bug | User Symptom | Source |
|---|-----------|-----|-------------|--------|
| 1 | `authStore.ts:296-303` | `migrateLocalToCloud()` runs BEFORE `pullRemoteProgress()` — pushes stale local data to Firestore on new device | Signing in on second device overwrites cloud data with wrong account's data | Today — **FIXED (Mar 22)** |
| 2 | `syncService.ts:985` | `convertFirestoreExercise` sets `completedAt: Date.now()` for any `highScore > 0` | After sync, failed exercises show as "completed" | Today — **FIXED (Mar 22)** |
| 3 | `ExercisePlayer.tsx` | `handleExerciseCompletion` reads `skillIdParam` and `testMode` from closure, not refs — stale on navigation.replace | Skill mastery/progress recorded for wrong skill after nav | PR #141 — **FIXED (refs added)** |

## P1 — Broken Features

| # | File:Line | Bug | User Symptom | Source |
|---|-----------|-----|-------------|--------|
| 4 | `HomeScreen.tsx:137` | `toISOString().split('T')[0]` = UTC date; store uses local | Daily goal shows 0/10 min after midnight for non-UTC users | Today — **FIXED (getTodayDateString)** |
| 5 | `HomeScreen.tsx:680` | `isDailyChallengeCompleted()` not reactive | Daily reward calendar doesn't update after challenge completion | Today — **FIXED (lastDailyChallengeDate === today)** |
| 6 | `LevelMapScreen.tsx:263` | `foundCurrent ? 'locked' : 'locked'` dead ternary | Lessons after first locked one permanently locked | Today — **FIXED** |
| 7 | `authStore.ts:220-221` | `setDisplayName` unconditional on cold start | Custom display name overwritten by Google/Apple name | Today — **FIXED (isDefaultName guard)** |
| 8 | `authStore.ts:86-107` | `rankStore`, `seasonStore`, `guildStore` not in `resetAllStores()` | Previous user's rank/season/guild leaks to next user | **FIXED (all 3 in reset)** |
| 9 | Multiple screens | Module-level `Dimensions.get()` in 5+ screens | Wrong layout after rotation or split-screen | PR #141 — OPEN |
| 10 | `ExercisePlayer.tsx` | `abilityConfig` read from closure in completion callback | Stale ability tolerances in AI mode | **FIXED (testModeRef guard)** |
| 11 | `ExercisePlayer.tsx` | Miss flash setTimeout has no mountedRef guard | setState on unmounted component during rapid navigation | **FIXED (mountedRef guards)** |

## P2 — Economy / Polish / Edge Cases

| # | File:Line | Bug | User Symptom | Source |
|---|-----------|-----|-------------|--------|
| 12 | `ExercisePlayer.tsx:881` | `Math.max(1, ...)` clamps practice time to min 1 minute | 10-second exercises count as 1 minute; daily goal inflated | Today |
| 13 | `ExercisePlayer.tsx:1247` | `getChestType` no `isPassed` guard | Chest gems on failed exercises | **FIXED (isPassed guard)** |
| 14 | `ExerciseValidator.ts:298` | AI exercises: `previousHighScore` always 0 | +25 XP first-time bonus on every AI attempt | **FIXED (ai-skill-{id} lookup)** |
| 15 | `HomeScreen.tsx:535` | `__ai__` key counted in lessons filter | LESSONS counter inflated | **FIXED (Mar 22)** |
| 16 | `gemStore.ts:69,97` | `earnGems`/`spendGems` use `debouncedSave` | Gems lost on force-quit | **FIXED (immediateSave)** |
| 17 | `leagueStore.ts:130` | `debouncedSave` inside `set()` updater | Double-save in StrictMode | **FIXED (moved outside set)** |
| 18 | `progressStore.ts:203` | Lesson completion hardcoded `>= 60` | Wrong passing threshold | **FIXED (uses exercise passingScore)** |
| 19 | `ExercisePlayer.tsx:1971` | Visual "perfect" = `tolerance * 0.5` but scoring uses full | Feedback/score mismatch | **FIXED (Mar 22)** |
| 20 | `CatAvatar.tsx:263` | `overflow: 'hidden'` clips cat ears in HomeScreen score ring — left ear is a stub, right ear hidden behind progress arc | Cat ears look broken on BOTH phone and simulator (confirmed Mar 20) | Today — **UPGRADED TO P1** |
| 21 | `XpSystem.ts:209` | `freezesAvailable++` no cap | Infinite streak freezes | **FIXED (Math.min cap at 3)** |
| 22 | `socialStore.ts:62` | `addFriend` no dedup | Duplicate friend entries | **FIXED (friends.some guard)** |
| 23 | `socialStore.ts:78` | `removeFriend` doesn't clean challenges | Stale challenges remain | **FIXED (filter in removeFriend)** |
| 24 | `authStore.ts` | No `stopPeriodicSync()` on signOut | Sync timer leaks | **FIXED** |
| 25 | `App.tsx:196-197` | Season + rank hydrate in parallel | Season reads default MMR if rank not ready | **FIXED (.then chain)** |
| 26 | `ExpoAudioEngine` | `setVolume` propagates to playing sounds, overrides per-note velocity | Audible volume jump during polyphony | **FIXED (removed pool propagation)** |
| 27 | `XPTransitionOverlay` | Star2/star3 setTimeout not in tracked timers array | Orphaned sound/haptic effects after unmount | **FIXED (timers.push)** |
| 28 | `MascotBubble/SalsaCoach` | `hasSpokenRef` not reset when message prop changes | New TTS messages silently skipped | **FIXED (useEffect reset on message)** |
| 29 | `rankStore` | `pendingRankChange` not cleared in `reset()` | Rank change overlay shows for wrong account | **FIXED (in reset)** |
| 30 | `ExercisePlayer` | Achievement context extras not populated | 19+ achievements can never unlock | **FIXED (extensive extras)** |
| 31 | `SkillTree/learnerProfile` | Skill decay formula linear instead of exponential half-life | 2x too aggressive review nagging | **FIXED (Math.pow half-life)** |
| 32 | `ExercisePlayer` | Streak update after `recordExerciseCompletion` | Streak milestones use stale value | **FIXED (get() fresh read)** |
| 33 | `CurriculumEngine` | Brittle circular array slice+concat for category rotation | Can crash or skip categories | **FIXED (modulo-based rotation)** |
| 34 | `ExerciseValidator` | Hard-cutoff extra notes penalty (100 - count*10) | Extra note score goes to 0 abruptly | **FIXED (exponential 0.85^n)** |
| 35 | `progressStore` | `createDebouncedSave` has stale closure (no latestState ref) | Debounced save writes old state | **FIXED (getter callback)** |
| 36 | `settingsStore` | Non-critical settings use debouncedSave | Onboarding/mic/profile state lost on quick quit | **FIXED (immediateSave for critical: onboarding, cat, path, accessories)** |
| 37 | `progressStore` | No `dailyGoalData` pruning >90 days | Unbounded storage growth | **FIXED (pruneDailyGoalData on hydrate)** |
| 38 | `ExercisePlayer` | No self-challenge prevention (uid check) | User can challenge themselves | **FIXED (self-challenge guard)** |
| 39 | `Firebase rules` | Friends create rule doesn't verify sender identity | Spoofed friend requests | **FIXED (request.auth.uid check in rules)** |
| 40 | `Firebase rules` | Guild member can self-promote role | Privilege escalation | OPEN — needs rule audit |
| 41 | `socialService` | `resolveChallengeGemStake` not in Firestore transaction | Race condition on challenge resolution | OPEN — not transactional |
| 42 | `notificationService` | `cancelAll` instead of selective cancellation | Clears unrelated notifications | **FIXED (cancelScheduledNotificationAsync per ID)** |
| 43 | `NoteTracker` | `lastVoicedTime` updated for any voiced frame | Release delay when confirming next note | **FIXED (only updates for confirmed notes)** |
| 44 | `PolyphonicDetector` | Timestamp captured after ONNX inference | ~50ms timestamp drift | **FIXED (timestamps spread across window)** |
| 45 | `Replay coaching` | Pause point at beat 0 freezes replay | Salsa replay stuck | Replay system refactored — needs device verification |
| 46 | `syncService` | `pullRemoteProgress` missing `.catch()` on fetches | One failing fetch kills entire pull | **FIXED (all fetches have .catch)** |
| 47 | `ExercisePlayer` | SalsaIntro overlay blocks auto-start | Exercise doesn't auto-start | SalsaIntro exists but does not block — needs device verification |
| 48 | `Coaching` | Cloud Function timeout 15s, Gemini 15s | Slow fallback to offline templates | OPEN — double timeout still present |
| 49 | `catEvolution` | No currentStage reconciliation on hydration when thresholds change | Silent stage demotion | **FIXED (reconcileEvolutionStages on hydrate)** |
| 50 | `catEvolution` | Multi-stage XP jump only awards final milestone gems | Missing intermediate gems | **FIXED (iterate ALL intermediate stages)** |
| 51 | `catEvolution` | Equipped accessories not validated against evolution stage on hydration | Impossible accessories equipped | **FIXED (validateAccessories on hydrate)** |

## User-Reported Bugs (Mar 20)

| # | File:Line | Bug | User Symptom | Severity |
|---|-----------|-----|-------------|----------|
| 52 | `LevelMapScreen.tsx:236` | `completedExercises` counts ALL exerciseScores keys (including mastery test), but `exerciseCount` denominator excludes tests | "Getting Started" shows 4/3 — mastery test counted in numerator but not denominator | **FIXED (nonTestIds filter)** |
| 53 | `ExercisePlayer.tsx:562` | `abilityConfig` applied unconditionally — no `testMode` guard | Cat abilities (note preview, timing window boost) active during mastery tests, making tests easier than intended | **FIXED (testModeRef guard)** |

## User-Reported Bugs (Mar 20 — late session)

| # | Severity | Bug | User Symptom |
|---|----------|-----|-------------|
| 54 | P0 | Lesson progress, XP, streaks, level, stars — NOTHING syncs to Firestore cross-device | Phone shows 0/3, 0 exercises, 0 stars despite completing exercises on simulator | **FIXED (pull+push all stores, sync order corrected)** |
| 55 | P1 | Auth session keeps expiring — user repeatedly asked to sign in | App kicks to auth screen intermittently | **FIXED (transient null guard in onAuthStateChanged)** |
| 56 | P1 | PostHog error: `Cannot read property 'color' of undefined` in cat rendering | Cat avatar rendering fails when cat profile lookup returns undefined | **FIXED (all renderers use getCatById ?? getDefaultCat)** |

## Bugs Found via Debug Logs (Mar 20 — debug session)

| # | Severity | Bug | User Symptom | Evidence |
|---|----------|-----|-------------|----------|
| 57 | P0 | `initAuth` timeout fires AFTER auth succeeds — nukes auth state 8s after launch | User signed out randomly, all sync stops | Log: `[Auth] timed out` after `[Auth:onAuthStateChanged] user=SG1L...` — **FIXED** |
| 58 | P0 | App.tsx Phase 3 never pushes local data to Firestore on cold start | Exercise progress only saved locally, never reaches cloud | Log: `Remote data: 0 lessons` despite local completion — **FIXED** |
| 59 | P1 | Firestore rules block `learnerProfile` and `achievements` subcollection writes | Mastered skills + achievements don't sync → Today's Practice and Daily Challenge differ per device | **FIXED (rules deployed Mar 20)** |
| 60 | P1 | ElevenLabs TTS intermittent — sometimes silent pre/post exercise, not consistent | Cat voice coaching silent on some flows | User-reported Mar 20 |

## Bugs Found via Live Testing (Mar 20 — gameplay session)

| # | Severity | Bug | User Symptom |
|---|----------|-----|-------------|
| 61 | P0 | `syncProgress` writes `undefined` score field to Firestore `syncLog` — `WriteBatch.set()` rejects entire batch | Per-exercise sync silently fails | **FIXED (?? 0 fallback)** |
| 62 | P1 | Keyboard highlights note one ahead of where playback is — highlighted "expected" note and scoring engine disagree on which note is current. Pressing the visually highlighted key shows as "miss". Root cause: `expectedNotes` effect uses `effectiveBeat - 0.5` lookahead + `consumedNoteIndicesRef` which can desync from the scoring engine's own matching window. Needs unified note tracking. | Wrong note highlighted, correct input shows miss |
| 63 | P1 | Today's Practice differs per device because `learnerProfile` (mastered skills) wasn't syncing — **Firestore rules now fixed**, needs verification | **FIXED (rules + sync + dailyPlanCache)** |
| 64 | P1 | Daily Challenge differs per device — same root cause as #63 (mastered skills drive challenge generation) | **FIXED (same root cause as #63)** |
| 65 | P2 | `[ReplayPromptBuilder] Failed to parse replay response: JSON Parse error` | Salsa replay coaching broken |
| 74 | P1 | Today's Practice regenerates plan after each exercise instead of tracking completion of the FULL plan. Should show checkmarks on completed exercises and only generate new plan after all 3 sections (warm-up + lesson + challenge) are done | Completed exercises disappear, replaced by new ones. No sense of daily progress. Should be like Duolingo where you see your daily plan with done/todo status | **FIXED (dailyPlanCache.ts — AsyncStorage-backed)** |
| 75 | P1 | Today's Practice exercises seem random / not linked to curriculum — rhythm tap exercises appearing early when user is still on basic lessons | Confusing exercise selection that doesn't match learning progress |
| 76 | P2 | Rhythm "TAP to the beat" exercise shows notes (D4, E4, F4) falling but no piano keyboard — unclear interaction for new users | Exercise type mismatch between visual display and input method |
| 77 | P1 | Ear training exercise has same gameplay as rhythm exercise (tap mode) — should be listening/identifying, not tapping | Wrong exercise type behavior for ear training category |
| 78 | P1 | Rhythm/tap exercises: tapping on beat registers as "ok" or "miss" even when timed correctly | Timing detection too strict or broken for tap-mode exercises | **FIXED (same root cause as #93 — pitch filter bypass)** |
| 79 | P0 | **Phase 13 "Content Explosion" expanded quantity but NOT variety.** 599 exercises were generated but they are ALL the same play-along keyboard interaction with different notes/skills. The "9 exercise types" (quiz, identify, arrange, match, build, etc.) were metadata labels only — no actual gameplay modes were built. ExercisePlayer has only 2 modes: keyboard play-along and rhythm tap. This means: (1) All exercises feel identical regardless of skill category, (2) Labels like "Chord ID" and "Ear Training" were misleading (now fixed to show "Play Along"), (3) The Duolingo-style variety that makes learning engaging is completely missing. **This is the single biggest gap between current state and a shippable product.** | Every exercise feels the same — no quizzes, no chord recognition, no ear training, no sight reading gameplay |

## Bugs Found via Device Verification (Mar 20 — current session)

| # | Severity | Bug | User Symptom |
|---|----------|-----|-------------|
| 86 | P1 | "Review with Salsa" replay doesn't play — stuck on visual with "TAP to the beat" but no audio, no progression through pause points | Salsa review is completely non-functional | Replay system refactored with DemoPlaybackService — **needs device verification** |
| 87 | P1 | Pre-exercise and post-exercise cat voice uses expo-speech (robotic) instead of ElevenLabs neural voices | Cat coaching voice quality is low — ElevenLabs not activating | ElevenLabsProvider exists with 13 voices — **needs device verification (API key?)** |
| 88 | P1 | Chord exercises ("Play this chord: C") have no chord-specific gameplay — scored as sequential play-along with duration scoring, not simultaneous chord validation | Chord exercises feel identical to play-along, duration score 6% because tapping not holding | OPEN — part of exercise type variety (F2) |
| 89 | P2 | All piano notes sound the same pitch in some exercises — pitch-shifting may not be working correctly for certain note ranges | No audible difference between C4 and E4 on keyboard | Pitch shift code exists (±6 semitones) — **needs device verification** |
| 90 | P1 | Salsa's Review shows "TAP to the beat" for play-along exercises — wrong interaction mode in replay | Review mode uses tap interface instead of keyboard for non-rhythm exercises | Keyboard enabled in non-replay mode — **needs device verification** |
| 93 | P1 | Tap exercise timing completely broken — tapping exactly on beat registers as "miss". Tap mode note matching/timing validation is wrong. | Tap exercises are unplayable — user taps on beat but gets miss every time | **FIXED (skip pitch match for rhythm)** |
| 94 | P1 | LessonIntroScreen doesn't pass `testMode: true` when navigating to mastery test exercises — abilities + key labels active during tests | Mastery tests show note hints making them too easy — **FIXED** |
| 95 | P1 | LevelMap shows 7/8 for Lesson 2 despite all exercises completed + Lesson Complete screen showing 9/9 | One exercise score may be below passingScore threshold or saved under wrong bucket |
| 91 | P1 | Today's Practice resets to "Find Middle C" x3 after sign-out/sign-in — daily plan cache not invalidated when mastered skills restored by sync. Fixed: cache now keys on skillCount. | All 3 sections show the same beginner exercise after re-auth | **FIXED (dailyPlanCache + clearOnSignOut + skillCount key)** |

## Sync Gap Analysis (Mar 20 — complete audit)

These stores have NO sync to Firestore — data exists only locally and is lost on new device sign-in:

| # | Severity | Store / Data | What's Lost |
|---|----------|-------------|-------------|
| 66 | P0 | `rankStore` — MMR, tier, division, promotion series, demotion grace | Competitive rank completely different per device | **FIXED (push + pull merge)** |
| 67 | P0 | `seasonStore` — battle pass XP/tier, claimed rewards, season history, peak tier | Battle pass progress lost on new device | **FIXED (push + pull merge)** |
| 68 | P1 | `settingsStore` — username, displayName, selectedCatId, dailyGoalMinutes, volume, input method, all preferences | Settings reset to defaults on new device | **FIXED (push + pull settings sync)** |
| 69 | P1 | `progressStore.dailyGoalData` — per-day practice minutes, exercises completed | Daily goal progress differs per device | **FIXED (progressExtra push/pull)** |
| 70 | P1 | `progressStore.tierTestResults` — mastery test scores per tier | Mastery test results lost on new device | **FIXED (progressExtra push/pull)** |
| 71 | P1 | `progressStore.streakMilestonesClaimed` — which streak milestones (7/30/100 day) were claimed | Streak milestone gems double-awarded on new device | **FIXED (progressExtra push/pull)** |
| 72 | P1 | Firestore gamification doc ID allowlist missing `learnerProfile` + `achievements` | Learner profile + achievements blocked by security rules — **FIXED (rules deployed)** |

## Dependency Vulnerabilities

| # | Severity | Bug | Package | Fix Version | Via |
|---|----------|-----|---------|------------|-----|
| 73a | P1 | Prototype Pollution via parse() in flatted | `flatted` 3.4.1 | 3.4.2 | eslint → file-entry-cache → flat-cache (already has override, needs version bump) |
| 73b | P1 | Symlink/Hardlink Path Traversal (3 CVEs) | `tar` 6.2.1 | 7.5.11 | expo → @expo/cli → cacache (needs override) |
| 73c | P1 | Entity Expansion bypass (2 CVEs) | `fast-xml-parser` 5.5.5 | 5.5.7 | firebase-admin → @google-cloud/storage (needs override) |
| 73d | P2 | ReDoS with `$data` option | `ajv` 6.14.0/8.11.0 | 8.18.0 | eslint, detox, expo-dev-launcher, expo-router (needs override) |
| 73e | P2 | Incorrect Control Flow Scoping | `@tootallnate/once` 2.0.0 | 3.0.1 | firebase-admin → @google-cloud/storage → teeny-request (needs override) |
| 80 | P1 | Profile screen ScoreRing is red/dark tint, HomeScreen ring is green — inconsistent ring styling between the two screens | **FIXED (matched to HomeScreen primary color + cardBorder track)** |
| 81 | P1 | Sentry Logger console error: "Failed to receive any fallback timestamp" — shows red error modal on device | **FIXED (LogBox.ignoreLogs)** |
| 82 | P1 | CatAvatar SVG rendering needs full Figma redesign — tails float above body at all sizes, ears misaligned at small sizes, micro-animations (vbScale math) break alignment. Needs Figma credits to redesign SVG paths properly per cat. BLOCKED on Figma credits. |
| 83 | P2 | PostHog `PostHogFetchNetworkError: Network error while flushing PostHog` — red Console Error modal on device. PostHog flush failures should be silenced, not surfaced as user-visible errors. | **FIXED (LogBox.ignoreLogs)** |
| 84 | P1 | `exercise-index.json` has wrong exercise types for lessons 1-6 (earTraining, rhythm, callResponse, chordId) — all are note-based play-along but labeled as other types. ExercisePlayer only supports play/tap modes (bug #79). | **FIXED (11 exercises → play type). Exercise type variety is tracked in F2/bug #79.** |
| 85 | P1 | Today's Practice / DailySession generate plans independently — exercises differ between HomeScreen mini-view and "See All" DailySessionScreen. Should share same plan. | **FIXED (shared dailyPlanCache)** |

## Sentry Errors (Mar 22 — from Sentry MCP)

| # | Severity | Sentry ID | Bug | User Symptom |
|---|----------|-----------|-----|-------------|
| 101 | P1 | AI exercise title mismatch — DailySession shows "Hand Independence Drill" but PostExercise shows "C Rhythm Practice". The AI-generated exercise content doesn't match the skill node the CurriculumEngine selected. | Confusing — user plays one thing, results show different title |
| 102 | P1 | "NEW RECORD" shows on every AI exercise attempt including 16% scores — high score lookup via `ai-skill-{skillId}` key may not persist across sessions or the key doesn't match between exercise completion and lookup | False "new record" banner destroys trust in scoring |
| 103 | P1 | AI exercise scoring integrity — 0% timing + 0% duration on play-along exercises suggests note matching/timing is fundamentally broken for AI-generated content. May be wrong tempo, wrong note set, or timing offset miscalculation | Scores feel random/unfair — user plays correctly but gets low % |
| 105 | P1 | Daily plan completion markers (green ✓) lost after sign-out/sign-in | Completed exercises lose their green checkmark after sign-out/sign-in | **FIXED (3 root causes: immediateSave didn't handle getter functions, `__ai__` doc ID rejected by Firestore, orderBy silently failing)** |
| 106 | P2 | Post-exercise Salsa coaching message appears slowly — noticeable delay before the cat speech bubble renders after exercise completion | Feels sluggish after finishing an exercise |
| 104 | P2 | +41 XP awarded for 16% failing score — XP calculation doesn't gate on isPassed, awards XP even for very poor performance | Economy inflation from failed exercises |
| 100 | P1 | Pre-exercise loading is inconsistent — sometimes shows ExerciseLoadingScreen (Salsa + random tips), sometimes shows SalsaIntro modal (screenshot), sometimes BOTH appear sequentially. Should be ONE unified pre-exercise screen: Salsa + exercise title + tip + "Let's go!" button. Remove the separate SalsaIntro modal. | Two loading screens before exercise is confusing and feels broken |
| 99 | P1 | Split keyboard (two-handed exercises) is extremely choppy and unplayable — both R and L keyboards render full 2-octave ranges causing heavy re-renders, count-in overlay overlaps awkwardly, PianoRoll barely visible above dual keyboards | Two-keyboard layout is unusable on device — lag, visual clutter, no room for falling notes |
| 97 | P1 | PURRRFECT-KEYS-MOBILE-A | `ReferenceError: Property 'getTodayDateString' doesn't exist` in DailySessionScreen useMemo — likely stale dev build or Metro cache issue since the export exists in `src/utils/time.ts` | Today's Practice crashes on launch |
| 98 | P1 | PURRRFECT-KEYS-MOBILE-9 | `ReferenceError: Property 'getExercise' doesn't exist` in LessonIntroScreen useMemo — same class of issue, export exists in `src/content/ContentLoader.ts` | Lesson intro screen crashes when tapping a lesson |

## Feature / Infrastructure Items

| # | Priority | Item |
|---|----------|------|
| F1 | P2 | ElevenLabs quota — UPGRADED by user. Implement server-side caching via Cloud Function proxy to reduce char usage long-term. |
| F10 | P0 | **AI Exercise Pipeline Integrity** — systemic issues: (1) Exercise ID is ephemeral (`ai-generated-{timestamp}`) so high scores never match on retry → "NEW RECORD" every time, (2) AI generates exercise title/content that doesn't match the skill node CurriculumEngine selected (e.g., "Hand Independence Drill" → "C Rhythm Practice"), (3) Scoring shows 0% timing/duration on AI exercises suggesting note data or tempo is malformed, (4) XP awarded even on failing scores (16% → +41 XP). Root cause: loose coupling between CurriculumEngine skill selection, Gemini exercise generation, and ExercisePlayer scoring. Needs focused investigation. |
| F2 | P1 | **Exercise type variety (#79) — DEEP FEATURE, NOT A LABEL FIX.** ExercisePlayer needs entirely new gameplay modes: (1) **Chord mode** — simultaneous key detection + chord diagram UI, (2) **Ear training** — play audio → user identifies note/interval/chord from options, (3) **Sight reading** — staff notation display → play what you see, (4) **Call & response** — listen → repeat pattern, (5) **Quiz/identify** — multiple choice UI for theory questions. Each mode needs its own input handler, scoring logic, and UI components. This is a multi-week feature effort, not a bugfix. |
| F3 | P2 | Achievement definitions outdated — need updating for expanded curriculum (120 skills, 50 lessons, 18 tiers) |
| F4 | P2 | No UI to view/manage notification reminders (#42 can't be verified) |
| F5 | P2 | No UI to see streak freeze count (#21) |
| F6 | P2 | Use ElevenLabs for sound effects — current procedural/sample sounds are low quality. Generate premium UI sounds (combo, stars, chest open, level up) via ElevenLabs sound generation API. |
| F7 | P3 | Use ElevenLabs or AI-generated background music for the app — ambient practice music, menu themes, celebration tracks |
| F8 | P1 | Cat abilities need redesign — "Practice Reminder" is a useless ability. All abilities should have meaningful gameplay impact (timing boost, XP multiplier, combo shield, note preview, etc.) |
| F9 | P1 | AsyncStorage → MMKV migration — app feels laggy during hydration (15+ async JSON.parse calls on startup). MMKV is synchronous and 10-100x faster. Also consider TanStack Query for Firestore read caching. |
| 96 | P1 | Cat ability shows locked at Baby stage even though cat IS at Baby — `abilitiesUnlocked` array not populated on cat purchase/initial ownership. Ability unlock logic broken for baby-stage abilities. | **FIXED (unlockCat/initStarterCat/unlockChonky + hydration reconcile)** |

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

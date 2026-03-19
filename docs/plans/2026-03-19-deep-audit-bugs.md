# Deep Audit Bug Report — March 19, 2026

Post-SDK 53 merge comprehensive audit. 6 parallel domain audits covering progress/dashboard, exercise flow, social/gamification, navigation/lifecycle, audio/input, and UI components.

## P0 — Critical (Must Fix Before Launch)

### P0-1: Reanimated native binary mismatch (FIXED)
- **Root cause**: Pods had Reanimated 3.16.7, JS expected 3.17.5 after SDK 53 merge
- **Fix**: `rm -rf ios/Pods ios/Podfile.lock ios/build && cd ios && pod install`, then `npx expo run:ios`
- **Status**: FIXED

### P0-2: XP multiplier double-stacking
- **File**: `ExercisePlayer.tsx:803` + `progressStore.ts:404`
- **Bug**: Cat ability `xpMultiplier` (applied in ExercisePlayer) AND daily challenge `xpMultiplier` (applied in progressStore) stack silently. User with 1.5x ability + 2x challenge gets 3x instead of max(1.5, 2)
- **Fix**: progressStore should not apply xpMultiplier if score.xpEarned already has ability multiplier baked in, OR pass a flag

### P0-3: `event.when` timestamp domain mismatch in AudioCapture
- **File**: `src/input/AudioCapture.ts:91`
- **Bug**: `event.when` is relative seconds from recording start (e.g., 2.5s → 2500ms), but scoring expects `Date.now()` domain (epoch ms ~1.7 trillion). Every mic-based note scores as wildly early.
- **Fix**: Use `Date.now()` as timestamp source, not `event.when * 1000`

### P0-4: Local-guest sign-out preserves data that can never be migrated
- **File**: `authStore.ts:897-904`
- **Bug**: `local-guest-*` users have `isAnonymous: true`, so sign-out skips `clearAll()`. But local guests have no Firebase UID — data leaks to next device user.
- **Fix**: Check for `local-guest` prefix in uid before preserving data

### P0-5: `flushAllPendingSaves()` not awaited on app background
- **File**: `App.tsx:344`
- **Bug**: Fire-and-forget async flush. iOS can kill process before writes complete, losing debounced state.
- **Fix**: Best-effort mitigation — use `AsyncStorage.multiSet` for atomic flush or document limitation

## P1 — High (Broken Functionality)

### Progress/Dashboard
| ID | File:Line | Bug |
|----|-----------|-----|
| P1-DASH-1 | `HomeScreen.tsx:140` | UTC `toISOString()` date key vs local `localToday()` in store — daily goal shows 0% after midnight for non-UTC users |
| P1-DASH-2 | `progressStore.ts:313` | Stale `minutesTarget` when user changes daily goal midday — completion logic uses old target |
| P1-DASH-3 | `progressStore.ts:394` | Monthly challenge 48h window not actually checked — only counts today's exercises |
| P1-DASH-4 | `HomeScreen.tsx:518` | "Goal complete!" chip uses minutes-only; gem reward requires minutes+exercises — misleading |
| P1-DASH-5 | `ExercisePlayer.tsx:896` | `Math.max(1, ...)` inflates practice minutes — 10-second exercise counts as 1 minute |

### Exercise Flow
| ID | File:Line | Bug |
|----|-----------|-----|
| P1-EX-1 | `ExercisePlayer.tsx:2257` | `exercise` in XPTransition closure may be stale vs `exerciseRef.current` used for scoring |
| P1-EX-2 | `ExercisePlayer.tsx:1031` | AI mastery test exercises never pass `isTestExercise()` — lesson stays `in_progress` forever |
| P1-EX-3 | `ExercisePlayer.tsx:1283` | Chest reward gems granted even on failed exercises — no `isPassed` guard |
| P1-EX-4 | `useExercisePlayback.ts:729` | AI exercises always get +25 XP `firstTimeBonus` — wrong lookup key for previousHighScore |
| P1-EX-5 | `useExercisePlayback.ts:518` | Loop restart clears `noteOnIndexMapRef` while MIDI noteOff may reference old indices |

### Social/Gamification
| ID | File:Line | Bug |
|----|-----------|-----|
| P1-SOC-1 | `progressStore.ts:342-355` | Daily challenge gem award uses non-idempotent `earnGems` — race can double-award |
| P1-SOC-2 | `challengeSystem.ts:264` | Weekly challenge day check breaks on DST transition (fixed 86400s divisor) |
| P1-SOC-3 | `catEvolutionStore.ts:252` | Evolution milestone gem award uses non-idempotent `earnGems` — TOCTOU double-award |
| P1-SOC-4 | `gemStore.ts:52` | `earnGems` has NO idempotency — challenge win gems double-awarded after app restart |
| P1-SOC-5 | `ExercisePlayer.tsx:1344` | Sender stake deducted before Firestore doc created — no rollback on network failure |
| P1-SOC-6 | `mmrCalculator.ts:28` | `calculateMMR` receives single exercise tier, not rolling average — MMR swings wildly |
| P1-SOC-7 | `leagueStore.ts:126` | `debouncedSave` called inside Zustand `set()` updater — side effect in pure function |
| P1-SOC-8 | `catEvolutionStore.ts:527` | `unlockChonky()` doesn't set progress flags — legendary cat stripped on next hydration |

### Navigation/Lifecycle
| ID | File:Line | Bug |
|----|-----------|-----|
| P1-NAV-1 | `settingsStore.ts:67` | `selectedPath` never hydrated from AsyncStorage — resets to `piano-basics` on restart |
| P1-NAV-2 | `AppNavigator.tsx:192` | Returns `null` during `isInitializing` — deep links dropped, blank screen flash |
| P1-NAV-3 | `gemStore.ts:69` | `earnGems` uses debounced save — gems lost on force-quit within 500ms |
| P1-NAV-4 | `authStore.ts:897` | Sign-out clears auth before `clearAll()` completes — user sees Auth while data still being wiped |
| P1-NAV-5 | `authStore.ts:461` | Persistent `onAuthStateChanged` can redirect to Auth mid-exercise on token invalidation |

### Audio/Input
| ID | File:Line | Bug |
|----|-----------|-----|
| P1-AUD-1 | `MicrophoneInput.ts:337` | `dispose()` doesn't await async `stop()` — double `recorder.stop()` race |
| P1-AUD-2 | `createAudioEngine.ts:30` | `lastAudioMode` survives factory reset — can downgrade PlayAndRecord to playback silently |
| P1-AUD-3 | `SoundManager.ts:228` | Sound effects bypass polyphony volume scaling — clipping during intensive gameplay |

### UI Components
| ID | File:Line | Bug |
|----|-----------|-----|
| P1-UI-1 | Multiple (20+ files) | `pointerEvents` as JSX prop deprecated in RN 0.79 — must move to `style` |
| P1-UI-2 | `LevelMapScreen.tsx:267` | Dead ternary `'locked' : 'locked'` — current node never set, map broken after first gap |
| P1-UI-3 | `CatAvatar.tsx:162` | Orphaned `useCatPose('idle')` runs 3 animations per avatar even when no pose prop |
| P1-UI-4 | `HomeScreen.tsx:683` | `isDailyChallengeCompleted()` called in JSX render — not reactive to store changes |

## P2 — Medium (Edge Cases, Data Quality)

### Progress: UTC/local timezone bugs in `pruneDailyGoalData`, sessionPlan stale memoization, hardcoded passing score 60, duplicate level-up activity posts, AI exercise `__ai__` bucket mismatch
### Exercise: Optional notes penalize score when missed, visual "perfect" threshold is 0.5x scoring threshold, `velocityScore` computed but never used, count-in notes can trigger early completion
### Social: Freeze accumulation unbounded, local/UTC week boundary mismatch (cat vs league), monthly challenge stale read, `addFriend` no dedup, `removeFriend` doesn't clean challenges
### Navigation: Periodic sync timer not stopped on sign-out, `displayName` overwritten from Firebase Auth on cold start, 3s failsafe + 8s timeout race
### Audio: `ownedBuffer` not nulled on dispose, ONNX Tensor allocation per inference, metronome bypasses limiter gain, `candidateGapCount` not reset on note confirmation
### UI: Double `GradientMeshBackground` on HomeScreen, `staggerStyle(1)` duplicate index, `ProfileScreen` stale `totalPracticeMinutes`, auto-scroll hardcoded offset

## Fix Priority Order

1. **P0-1** ✅ FIXED (pod reinstall)
2. **P0-3** (mic scoring completely broken — blocks mic input testing)
3. **P1-UI-2** (LevelMap node state broken — blocks Learn tab)
4. **P1-DASH-1** (daily goal timezone — blocks dashboard for non-UTC users)
5. **P0-2** (XP double-stacking — gem economy integrity)
6. **P0-4** (local-guest data leak)
7. **P1-EX-3** (chest gems on failure — gem economy)
8. **P1-EX-4** (AI exercise +25 XP always — XP inflation)
9. **P1-SOC-4** (earnGems no idempotency — gem duplication)
10. **P1-NAV-1** (selectedPath not hydrated)
11. Remaining P1s
12. P2s

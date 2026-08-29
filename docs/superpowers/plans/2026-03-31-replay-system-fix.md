# Replay System Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 bugs in the "Review with Salsa" replay system so it plays, pauses, and ends cleanly without interfering with the exercise scoring system.

**Architecture:** Replay is driven by `DemoPlaybackService` (its own setInterval) — completely separate from `useExercisePlayback` (which drives normal exercise mode). The bugs stem from ExercisePlayer not properly isolating these two systems: the loading screen shows for replay, the scoring hook fires during replay, and the audio interface mismatch prevents proper pause.

**Tech Stack:** React Native, TypeScript, DemoPlaybackService, useExercisePlayback hook

---

## Bug Analysis

### Bug 1: Loading screen shows during replay
**Root cause:** `showLoadingScreen` initializes to `true` for ALL ExercisePlayer mounts (line 294). Replay mode enters via `replayMode: true` route param — exercise is already loaded, no loading screen needed.
**Fix:** Initialize `showLoadingScreen` to `!replayModeParam`.

### Bug 2: Replay audio starts during loading screen
**Root cause:** Consequence of Bug 1. The auto-start useEffect (line 2594-2618) fires `startReplayFromBeat(0)` after 500ms delay regardless of loading screen state. DemoPlaybackService starts playing audio while the loading overlay blocks the UI.
**Fix:** Guard auto-start against `showLoadingScreen`.

### Bug 3: Audio doesn't stop on replay pause
**Root cause:** `pauseReplay()` calls `this.audioEngineRef.releaseAllNotes()` but the `DemoAudioEngine` interface (line 33-36) only defines `playNote` and `releaseNote` — NOT `releaseAllNotes`. The call either crashes silently or does nothing, leaving notes ringing.
**Fix:** Expand `DemoAudioEngine` interface to include `releaseAllNotes`, OR iterate `activeHandles` and call `releaseNote` per-handle (which already exists). The original code before the bad edit DID iterate handles — revert to that approach plus add `releaseAllNotes` to the interface as belt-and-suspenders.

### Bug 4: Replay gets scored (10% score shown)
**Root cause:** `handleExerciseCompletion` has no replay guard. If `useExercisePlayback`'s interval was started before replay (from a previous exercise attempt in the same component mount), it can fire `handleCompletion` when the beat exceeds `exerciseDuration`. The scoring runs with zero or stale played notes → low score.
**Fix:** Add `playerModeRef` and guard `handleExerciseCompletion` against `playerMode === 'replay'`.

---

## File Map

| File | Changes |
|------|---------|
| `src/screens/ExercisePlayer/ExercisePlayer.tsx` | (1) Init `showLoadingScreen` to `!replayModeParam`, (2) Guard replay auto-start, (3) Add `playerModeRef`, (4) Guard `handleExerciseCompletion` against replay |
| `src/services/demoPlayback.ts` | (1) Add `releaseAllNotes` to `DemoAudioEngine` interface, (2) Fix `pauseReplay` to use both per-handle release + `releaseAllNotes` |

---

### Task 1: Fix DemoPlaybackService pause audio

**Files:**
- Modify: `src/services/demoPlayback.ts:33-36` (interface)
- Modify: `src/services/demoPlayback.ts:256-272` (pauseReplay)

- [ ] **Step 1: Add `releaseAllNotes` to DemoAudioEngine interface**

```typescript
interface DemoAudioEngine {
  playNote(note: number, velocity: number): NoteHandle;
  releaseNote(handle: NoteHandle): void;
  releaseAllNotes(): void;
}
```

- [ ] **Step 2: Fix pauseReplay to release handles THEN call releaseAllNotes**

```typescript
pauseReplay(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Release each tracked handle individually first
    if (this.audioEngineRef) {
      for (const handle of this.activeHandles.values()) {
        try { this.audioEngineRef.releaseNote(handle); } catch { /* ignore */ }
      }
      // Belt-and-suspenders: releaseAllNotes catches any handles
      // that were created between clearInterval and the loop above
      try { this.audioEngineRef.releaseAllNotes(); } catch { /* ignore */ }
    }
    this.activeHandles.clear();

    this.isPlaying = false;
    this.isPaused = true;
  }
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/services/demoPlayback.ts
git commit -m "fix: replay pause releases all audio — add releaseAllNotes to DemoAudioEngine"
```

---

### Task 2: Fix ExercisePlayer replay isolation

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`

- [ ] **Step 1: Skip loading screen for replay mode**

Change `showLoadingScreen` initialization (around line 294):

```typescript
const [showLoadingScreen, setShowLoadingScreen] = useState(!replayModeParam);
```

- [ ] **Step 2: Add playerModeRef for stale-closure-safe reads**

After the `playerMode` state declaration:

```typescript
const [playerMode, _setPlayerMode] = useState<'exercise' | 'replay'>('exercise');
const playerModeRef = useRef<'exercise' | 'replay'>('exercise');
const setPlayerMode = useCallback((mode: 'exercise' | 'replay') => {
    playerModeRef.current = mode;
    _setPlayerMode(mode);
}, []);
```

- [ ] **Step 3: Guard handleExerciseCompletion against replay**

At the top of `handleExerciseCompletion`:

```typescript
const handleExerciseCompletion = useCallback((initialScore: ExerciseScore) => {
    if (!mountedRef.current) return;
    if (playerModeRef.current === 'replay') {
      logger.log('[ExercisePlayer] Ignoring completion during replay mode');
      return;
    }
    // ... rest of function
```

- [ ] **Step 4: Guard replay auto-start against loading screen**

In the auto-start useEffect (around line 2594-2618), add a guard:

```typescript
useEffect(() => {
    if (!replayModeParam || !replayPlan || replayAutoStarted.current) return;
    if (showLoadingScreen) return;  // ← new guard
    // ... rest unchanged
```

- [ ] **Step 5: Run typecheck + tests**

Run: `npx tsc --noEmit && npx jest --no-coverage`
Expected: 0 TS errors, all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/screens/ExercisePlayer/ExercisePlayer.tsx
git commit -m "fix: replay isolation — no loading screen, no scoring, guard auto-start"
```

---

### Task 3: Verify and push

- [ ] **Step 1: Run full CI suite**

```bash
npx tsc --noEmit && npx jest --no-coverage
```

- [ ] **Step 2: Push to remote**

```bash
git push origin test/stable-baseline
```

- [ ] **Step 3: Update CONFIRMED-BUGS.md**

Add entries for the 4 replay bugs fixed. Update #86 status.

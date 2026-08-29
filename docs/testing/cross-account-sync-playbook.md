# Cross-Account & Cross-Device Sync Testing Playbook

## Purpose

Systematic test plan for verifying data isolation between accounts and cross-device sync integrity. Every test must PASS before merge to master.

---

## Prerequisites

- Two Google accounts: Account A (primary) and Account B (backup)
- Two devices: Phone + Simulator (or two physical devices)
- Metro console open with logging visible (`npx expo start --clear 2>&1 | tee metro.log`)
- Firebase Console open to Firestore

---

## Part 1: Account Isolation (Sign-Out → Sign-In)

### Test 1.1: Clean sign-out wipes ALL local data

**Steps:**
1. Sign into Account A on Device 1
2. Complete 3 exercises, earn XP, unlock a cat, change settings
3. Note exact values: XP, level, streak, selected cat, daily plan exercises, gem count
4. Sign out

**Verify after sign-out:**
- [ ] HomeScreen shows default state (0 exercises, 0 XP, 0 streak)
- [ ] Profile shows default cat (mini-meowww)
- [ ] Daily plan is empty/regenerated with defaults
- [ ] Settings reset to defaults (daily goal 10 min, default volume)
- [ ] Metro log shows: `[Auth] Pre-signout data push completed` then `resetAllStores`
- [ ] Firebase Console: Account A's data is present in Firestore (pushed before clear)

**Log tags to check:**
```
[Auth] Pre-signout data push completed
[Auth] Periodic sync stopped
resetAllStores
PersistenceManager.clearAll
```

### Test 1.2: Sign into different account — NO data bleed

**Steps (continuing from 1.1):**
1. Sign into Account B on Device 1
2. Wait for sync to complete

**Verify:**
- [ ] Profile shows Account B's email, display name, NOT Account A's
- [ ] XP/level/streak are Account B's values (or 0 if new account), NOT Account A's
- [ ] Selected cat is Account B's choice, NOT Account A's
- [ ] Daily plan shows Account B's exercises, NOT Account A's from before sign-out
- [ ] Gem count is Account B's, NOT Account A's
- [ ] Lesson progress is Account B's, NOT Account A's
- [ ] Metro log shows: `pullRemoteProgress` with Account B's uid

**CRITICAL CHECK:** Open Firebase Console → `users/{Account B uid}` — verify it does NOT contain Account A's data.

### Test 1.3: Sign back into Account A — data preserved

**Steps (continuing from 1.2):**
1. Sign out of Account B
2. Sign into Account A

**Verify:**
- [ ] All Account A's data is back (XP, cats, progress from step 1.1.2)
- [ ] No Account B data is mixed in
- [ ] Daily plan may regenerate (acceptable) but exercises match Account A's skill level

### Test 1.4: Rapid sign-out/sign-in cycle

**Steps:**
1. Sign into Account A
2. Immediately sign out
3. Immediately sign into Account B
4. Repeat 3 times

**Verify after final sign-in:**
- [ ] Correct account's data showing
- [ ] No crashes or hangs
- [ ] No "loading" spinner stuck

---

## Part 2: Cross-Device Sync

### Test 2.1: Progress syncs from Device 1 to Device 2

**Steps:**
1. Sign into Account A on both Device 1 and Device 2
2. On Device 1: complete 3 exercises, note scores
3. On Device 2: navigate away from Home tab, then back (trigger focus refresh)

**Verify on Device 2:**
- [ ] Same 3 exercise scores appear
- [ ] XP matches
- [ ] Streak matches
- [ ] Daily plan shows same exercises (not different ones)

### Test 2.2: Simultaneous completion on both devices

**Steps:**
1. Both devices showing same daily plan
2. Complete Warm Up exercise on Device 1 (score 85%)
3. Complete Lesson exercise on Device 2 (score 70%)
4. Wait 30 seconds, then refresh both

**Verify:**
- [ ] Both devices show both completions
- [ ] Scores are correct (not swapped)
- [ ] No duplicate exercises in plan

### Test 2.3: Offline → online sync

**Steps:**
1. Device 1: enable airplane mode
2. Complete 2 exercises offline
3. Disable airplane mode
4. Wait for sync (check Metro log for `flushQueue`)

**Verify on Device 2:**
- [ ] Offline completions appear after sync
- [ ] Scores are correct

### Test 2.4: Daily plan consistency

**Steps:**
1. Sign into Account A on Device 1 at start of day (generates plan)
2. Sign into Account A on Device 2

**Verify:**
- [ ] Device 2 shows SAME plan as Device 1 (same exercises, same order)
- [ ] Not two independently generated plans with different exercises

---

## Part 3: Edge Cases

### Test 3.1: Anonymous → real account upgrade

**Steps:**
1. Fresh install → app creates anonymous account
2. Complete exercises, earn XP
3. Sign up with email
4. Verify progress migrated to new account

### Test 3.2: Account deletion

**Steps:**
1. Sign in, complete exercises
2. Delete account
3. Verify Firestore is clean (all subcollections removed)
4. Sign up with new account
5. Verify clean slate (no data from deleted account)

### Test 3.3: Sign-out during sync

**Steps:**
1. Complete an exercise
2. Immediately sign out before sync completes
3. Sign back in

**Verify:**
- [ ] Exercise completion either synced or lost (acceptable) — no partial/corrupted state

---

## Part 4: Data Flow Tracing

### What to log at each stage

Add these log checkpoints and verify them in Metro console:

**Sign-out flow:**
```
1. [Auth] pushAllProgressData — what data is being pushed
2. [Auth] PersistenceManager.clearAll — which keys are cleared
3. [Auth] resetAllStores — which stores are reset
4. [Auth] clearDailyPlan — plan cleared
5. [Auth] set user=null — auth state cleared
```

**Sign-in flow:**
```
1. [Auth] signInWithEmail — new uid
2. [Auth:postSignInSync] START — uid: XXXXX
3. [Auth:postSignInSync] pullRemoteProgress — what data is pulled
4. [Auth:postSignInSync] migrateLocalToCloud — what data is migrated (should be empty!)
5. [Auth:postSignInSync] pushAllProgressData — what data is pushed back (should match pull!)
6. [Auth:postSignInSync] Push complete
```

**Red flags in logs:**
- `migrateLocalToCloud` pushing non-zero data after sign-out/sign-in (means clear failed)
- `pullRemoteProgress` showing Account A's uid when signed into Account B
- `pushAllProgressData` writing higher values than what pull returned (means stale data survived)
- Missing `clearAll` or `resetAllStores` in sign-out log

---

## Part 5: Firestore Verification

After each test, check Firebase Console:

1. `users/{uid}` — correct user document
2. `users/{uid}/progress/gamification` — XP, level, streak for correct account
3. `users/{uid}/progress/lessons/*` — lesson progress for correct account
4. `users/{uid}/settings/preferences` — settings for correct account
5. `users/{uid}/catEvolution/state` — cats for correct account

**CRITICAL:** After Test 1.2, check `users/{Account B uid}` does NOT have Account A's XP/cats/progress.

---

## Known Root Causes (from investigation)

1. **"Highest wins" merge in pullRemoteProgress** — merges remote into local instead of replacing. If any Account A data survives in local stores, it stays because it's "higher."
2. **Daily plan not cleared** — separate AsyncStorage key not in STORAGE_KEYS.
3. **Sync queue/timestamp not cleared** — separate AsyncStorage keys not in STORAGE_KEYS.
4. **migrateLocalToCloud runs after pull** — can push stale local data to new account's Firestore.
5. **pushAllProgressData runs after pull+migrate** — writes potentially contaminated local state back to Firestore.

## Fix Strategy

The proper fix is NOT incremental patches. It requires:
1. Track the authenticated UID in local storage
2. On sign-in, compare stored UID to new UID
3. If different: **full local wipe** (ALL AsyncStorage keys, not just STORAGE_KEYS) + **replace stores from remote** (not merge)
4. Skip `migrateLocalToCloud` and `pushAllProgressData` when switching between existing accounts (only run for anonymous → real upgrade)

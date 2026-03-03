# Voice Personality Overhaul + Issue Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give each of the 13 cats a deeply unique speech personality through dialogue rewrite + ElevenLabs tuning, then fix all remaining P0/P1 issues to bring the app to 100% integrity.

**Architecture:** Rewrite all ~840 dialogue messages in `catDialogue.ts` with distinct speech fingerprints per cat, update ElevenLabs voice settings in `catVoiceConfig.ts` for wider expressiveness gaps, then fix remaining infrastructure issues (Cloud Functions deployment, Gemini key mitigation, sync dedup, offline banner, rate limiting).

**Tech Stack:** TypeScript, ElevenLabs API (eleven_turbo_v2_5), expo-speech, Firebase Cloud Functions, Firestore, @react-native-community/netinfo

---

## Batch 1: Cat Dialogue Personality Rewrite (catDialogue.ts)

### Task 1: Rewrite Starter Cats (Mini-Meowww, Jazzy, Luna)

**Files:**
- Modify: `src/content/catDialogue.ts` (lines ~20-350, the first 3 cat dialogue objects)
- Test: `src/content/__tests__/catDialogue.test.ts`

**Speech Fingerprints:**

**Mini-Meowww** — Hyperactive stream-of-consciousness. ALL CAPS bursts mid-sentence. Can't finish thoughts. Double/triple punctuation. Run-on energy.
- Verbal tics: "ooh ooh!", "wait wait wait", "I can't even—", "sooo", "!!"
- Sentence structure: Interrupted, breathless, incomplete → finishes with burst of excitement

**Jazzy** — Smooth jazz DJ patter. Musical idioms as metaphors. Drops g's. Relaxed grammar. Never rushed.
- Verbal tics: "baby", "dig it", "groove", "pocket", "swing", "cool cat"
- Sentence structure: Laid-back, conversational, finishes with a cool observation

**Luna** — Dreamy mystical. Soft imagery. Stargazer poetics. Heavy ellipsis. Whisper-like cadence.
- Verbal tics: "the stars say...", "I sense...", "...like moonlight", "the cosmos"
- Sentence structure: Floaty, lots of pauses (...), imagery-rich, never exclamatory

**Step 1: Write the new dialogue messages**

Replace all dialogue entries for mini-meowww, jazzy, and luna. Each cat × 14 triggers × 5 messages = 70 messages per cat, 210 total.

The 14 triggers are: `exercise_start`, `exercise_mid_great`, `exercise_mid_miss`, `exercise_complete_pass`, `exercise_complete_fail`, `level_up`, `daily_login`, `idle`, `ai_exercise_intro`, `achievement_unlock`, `streak_milestone`, `demoOffer`, `demoComplete`, `ghostNotesFarewell`

Example messages per cat per trigger — follow this style guide EXACTLY:

```typescript
// Mini-Meowww: exercise_complete_pass
'WAIT— did you just— OOH OOH you totally DID!! That was sooo good I can\'t even!!',
'Okay okay I\'m trying to be cool about this but— AAAAH YOU NAILED IT!!',
'I literally just fell off my chair!! That was INCREDIBLE!! Do it again do it again!!',
'My whiskers are TINGLING that\'s how good that was!! You\'re like a PRODIGY!!',
'I wanna tell EVERYONE about this!! You just— wow!! Just WOW!!',

// Jazzy: exercise_complete_pass
'Now that\'s what I call findin\' the pocket. Smooth as a Miles Davis solo, baby.',
'Mmm, that was silky smooth. You\'re startin\' to swing like a real cat.',
'You just laid down a groove that\'d make the whole jazz club nod. Dig it.',
'Cool, collected, and right in the pocket. That\'s how legends play, baby.',
'The rhythm was flowin\' through you like butter on a warm night. Beautiful.',

// Luna: exercise_complete_pass
'The melody flows through you like moonlight... I knew you carried this music inside.',
'A constellation of perfect notes... the universe heard that, I\'m certain of it.',
'I sense something shifting in you... your musical spirit is awakening...',
'Like starlight finding its way through clouds... that was transcendent.',
'The cosmos aligned for that performance... can you feel it... the harmony within...',
```

Write ALL 210 messages for these 3 cats following these personality guides.

**Step 2: Run tests**

Run: `npm test -- --testPathPattern="catDialogue" --verbose`
Expected: All tests pass (test checks every cat has messages for every trigger)

**Step 3: Commit**

```bash
git add src/content/catDialogue.ts
git commit -m "feat: rewrite starter cat dialogue with deep personality (Mini-Meowww, Jazzy, Luna)"
```

---

### Task 2: Rewrite Mid-Tier Cats (Biscuit, Ballymakawww, Aria, Tempo)

**Files:**
- Modify: `src/content/catDialogue.ts` (lines ~350-700)

**Speech Fingerprints:**

**Biscuit** — Warm grandma energy. Food/baking metaphors. Southern comfort. Nurturing diminutives.
- Verbal tics: "sweetie", "oh my!", "sugar", "honey", baking metaphors ("rise like a soufflé")
- Sentence structure: Warm, complete, encouraging, often ends with "I'm so proud"

**Ballymakawww** — Irish pub energy. Celtic flair. Rapid-fire dialect. Authentic Hiberno-English.
- Verbal tics: "grand", "fierce", "craic", "'tis", "so it is", "lad/lass", "sláinte"
- Sentence structure: Irish syntax inversions ("brilliant so it was"), enthusiastic, pub storytelling

**Aria** — Dramatic operatic. Theatrical. Italian sprinkles. Stage metaphors. EVERYTHING IS A PERFORMANCE.
- Verbal tics: "BRAVISSIMO!", "magnifico", "the audience...", "standing ovation", "curtain call"
- Sentence structure: Dramatic builds, peaks with exclamation, operatic flair throughout

**Tempo** — Sports coach meets data nerd. Stats-driven. Motivational. Counts everything. Action verbs.
- Verbal tics: "let's GO!", stats ("95% accuracy"), "personal best", "locked in", "no stopping you"
- Sentence structure: Short punchy sentences. Data point → motivation → call to action.

**Step 1: Write all 280 messages (4 cats × 14 triggers × 5 messages)**

Follow the same style guide format as Task 1. Each message must be immediately identifiable as that cat without seeing the cat name.

**Step 2: Run tests**

Run: `npm test -- --testPathPattern="catDialogue" --verbose`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/content/catDialogue.ts
git commit -m "feat: rewrite mid-tier cat dialogue (Biscuit, Ballymakawww, Aria, Tempo)"
```

---

### Task 3: Rewrite Premium Cats (Shibu, Bella, Sable, Coda, Chonky-Monke)

**Files:**
- Modify: `src/content/catDialogue.ts` (lines ~700-1200)

**Speech Fingerprints:**

**Shibu** — Zen master. Minimal words. Koans and nature. Haiku-like brevity. Never more than 2 sentences.
- Verbal tics: "breathe...", nature imagery (water, mountain, bamboo), present-tense observations
- Sentence structure: Ultra-short. Poetic. No exclamation marks. Period or ellipsis only.

**Bella** — Regal Persian. Sophisticated. Slightly condescending warmth. Proper English. Classy.
- Verbal tics: "darling", "quite", "one does not simply...", "rather", "exquisite", "splendid"
- Sentence structure: Proper, complete, refined. Warm but from a position of superiority.

**Sable** — Mysterious noir. Cool understatement. Cryptic compliments. Observational distance.
- Verbal tics: "interesting...", "not bad", "hmm", "most students wouldn't...", understatement
- Sentence structure: Short, observational, slightly enigmatic. Never gushing.

**Coda** — Analytical nerd. Technical appreciation. Precision language. Data metaphors. Logical.
- Verbal tics: "technically speaking", "error-free", "execution: flawless", "data suggests..."
- Sentence structure: Clinical but warm underneath. Analysis → conclusion → understated encouragement.

**Chonky-Monke** — Chaotic goblin. Broken grammar. Meme speak. ALL CAPS. No filter. Maximum energy.
- Verbal tics: "YOOO", "bruh", "no cap", "literally", "ngl", random ALL CAPS words, abbreviations
- Sentence structure: Chaotic, run-ons, meme grammar, emotionally unfiltered, zero formality

**Step 1: Write all 350 messages (5 cats × 14 triggers × 5 messages)**

**Step 2: Run tests**

Run: `npm test -- --testPathPattern="catDialogue" --verbose`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/content/catDialogue.ts
git commit -m "feat: rewrite premium cat dialogue (Shibu, Bella, Sable, Coda, Chonky-Monke)"
```

---

### Task 4: Rewrite Salsa NPC + Condition Overrides

**Files:**
- Modify: `src/content/catDialogue.ts` (Salsa dialogue section + condition overrides at bottom)

**Speech Fingerprint — Salsa (NPC Coach):**
- Sassy, confident, streetwise. Tough love + genuine warmth. References coaching experience.
- Verbal tics: "listen up", "trust me on this", "I've seen it all", "real talk", "between us"
- Sentence structure: Direct address → observation → coaching insight → encouragement

**Step 1: Write Salsa's 70 messages + update condition overrides**

Update condition overrides for ALL cats (not just mini-meowww and tempo):
- `score_high` (≥95%): Every cat gets 3 special high-score messages
- `score_low` (≤50%): Every cat gets 3 supportive low-score messages
- `first_try`: 3 messages per cat for first attempt
- `retry`: 3 messages per cat for repeated attempts

**Step 2: Run full test suite**

Run: `npm test -- --testPathPattern="catDialogue" --verbose`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/content/catDialogue.ts
git commit -m "feat: rewrite Salsa NPC dialogue + expand condition overrides for all cats"
```

---

## Batch 2: ElevenLabs Voice Tuning

### Task 5: Update Voice Settings in catVoiceConfig.ts

**Files:**
- Modify: `src/services/tts/catVoiceConfig.ts` (the CAT_VOICE_MAP object, ~100 lines)

**Step 1: Update ElevenLabs settings with wider parameter gaps**

Apply these exact values to each cat's `elevenLabsSettings` in the CAT_VOICE_MAP:

```typescript
// Mini-Meowww: Maximum expressiveness for hyperactive energy
{ stability: 0.25, similarity_boost: 0.78, style: 0.65, use_speaker_boost: true }

// Jazzy: Smoother, more laid-back swing
{ stability: 0.45, similarity_boost: 0.78, style: 0.50, use_speaker_boost: true }

// Luna: Ethereal calm delivery
{ stability: 0.65, similarity_boost: 0.78, style: 0.30, use_speaker_boost: true }

// Biscuit: Warm, gentle, consistent
{ stability: 0.55, similarity_boost: 0.78, style: 0.45, use_speaker_boost: true }

// Ballymakawww: Wild Irish energy
{ stability: 0.30, similarity_boost: 0.78, style: 0.60, use_speaker_boost: true }

// Aria: Maximum dramatic flair
{ stability: 0.28, similarity_boost: 0.78, style: 0.70, use_speaker_boost: true }

// Tempo: Punchy, energetic but clear
{ stability: 0.40, similarity_boost: 0.78, style: 0.55, use_speaker_boost: true }

// Shibu: Ultra-stable, meditative calm
{ stability: 0.75, similarity_boost: 0.78, style: 0.10, use_speaker_boost: true }

// Bella: Composed, regal consistency
{ stability: 0.60, similarity_boost: 0.78, style: 0.40, use_speaker_boost: true }

// Sable: Cool, understated delivery
{ stability: 0.55, similarity_boost: 0.78, style: 0.25, use_speaker_boost: true }

// Coda: Precise, measured, no flourish
{ stability: 0.65, similarity_boost: 0.78, style: 0.15, use_speaker_boost: true }

// Chonky-Monke: Maximum chaos energy
{ stability: 0.20, similarity_boost: 0.78, style: 0.75, use_speaker_boost: true }

// Salsa: Confident sass
{ stability: 0.35, similarity_boost: 0.78, style: 0.55, use_speaker_boost: true }
```

Also update the file header comment to document the new wider ranges:
- Stability range: 0.20-0.75 (was 0.30-0.60)
- Style range: 0.10-0.75 (was 0.20-0.55)

**Step 2: Run tests**

Run: `npm test -- --testPathPattern="catVoiceConfig\|TTSService\|ElevenLabs" --verbose`
Expected: All TTS tests pass

**Step 3: Commit**

```bash
git add src/services/tts/catVoiceConfig.ts
git commit -m "feat: widen ElevenLabs voice tuning for stronger cat personality contrast"
```

---

## Batch 3: P0 Fixes — Cloud Functions + Gemini Key Mitigation

### Task 6: Deploy Cloud Functions

**Files:**
- Reference: `firebase/functions/src/` (4 functions already written)
- Reference: `firebase/functions/package.json`

**Step 1: Install Cloud Functions dependencies**

Run: `cd firebase/functions && npm install && cd ../..`
Expected: Clean install, no errors

**Step 2: Build Cloud Functions**

Run: `cd firebase/functions && npm run build && cd ../..`
Expected: TypeScript compiles to `firebase/functions/lib/`

**Step 3: Set Gemini API key as Firebase secret**

Run: `firebase functions:secrets:set GEMINI_API_KEY`
When prompted, paste the Gemini API key value.

**Step 4: Deploy all functions**

Run: `firebase deploy --only functions`
Expected: 4 functions deployed:
- `deleteUserData`
- `generateExercise`
- `generateSong`
- `generateCoachFeedback`

**Step 5: Verify deployment**

Run: `firebase functions:list`
Expected: All 4 functions listed with us-central1 region

**Step 6: Commit any lockfile changes**

```bash
git add firebase/functions/package-lock.json
git commit -m "chore: update Cloud Functions lockfile after deployment"
```

---

### Task 7: Prioritize Cloud Functions Over Direct Gemini API

**Files:**
- Modify: `src/services/ai/GeminiCoach.ts` (~line 265-327)
- Modify: `src/services/geminiExerciseService.ts` (~line 331-393)
- Modify: `src/services/songGenerationService.ts` (song generation call site)

**Step 1: Add Cloud Function timeout increase**

In each service file, increase the Cloud Function timeout from 5s to 15s (Gemini can take 10s+ on cold start):

```typescript
// In each service's Cloud Function call:
const result = await httpsCallable(functions, 'generateExercise', { timeout: 15000 })({...});
```

**Step 2: Add warning log when falling back to direct API**

```typescript
// After CF call fails and before direct Gemini fallback:
console.warn('[GeminiCoach] Cloud Function unavailable, falling back to direct API. Deploy functions to secure API key.');
```

**Step 3: Run tests**

Run: `npm test -- --testPathPattern="GeminiCoach\|geminiExercise\|songGeneration" --verbose`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/services/ai/GeminiCoach.ts src/services/geminiExerciseService.ts src/services/songGenerationService.ts
git commit -m "fix: increase Cloud Function timeout to 15s, add fallback warning logs"
```

---

### Task 8: Draft Privacy Policy

**Files:**
- Create: `docs/privacy-policy.md`

**Step 1: Write privacy policy**

Cover: data collected (exercise scores, progress, anonymous usage), data NOT collected (audio recordings, PII beyond email), AI coaching (no PII in prompts), third parties (Firebase, ElevenLabs, Gemini, PostHog), data deletion (account deletion flow), children's privacy (COPPA note), contact info.

**Step 2: Commit**

```bash
git add docs/privacy-policy.md
git commit -m "docs: add privacy policy for App Store submission"
```

---

## Batch 4: P1 Fixes — Offline Banner + Sync Dedup + Rate Limiting

### Task 9: Add Offline Banner Component

**Files:**
- Create: `src/components/common/OfflineBanner.tsx`
- Modify: `src/navigation/AppNavigator.tsx` (add banner to root layout)

**Step 1: Install NetInfo**

Run: `npx expo install @react-native-community/netinfo`

**Step 2: Write the OfflineBanner component**

```typescript
import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/theme/tokens';

export function OfflineBanner() {
  const netInfo = useNetInfo();
  const isOffline = netInfo.isConnected === false;
  const translateY = useSharedValue(-50);

  useEffect(() => {
    translateY.value = withTiming(isOffline ? 0 : -50, { duration: 300 });
  }, [isOffline]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.banner, animatedStyle]} testID="offline-banner">
      <Text style={styles.text}>You're offline — progress saves locally</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.warning,
    paddingVertical: 6,
    paddingHorizontal: 16,
    zIndex: 1000,
    alignItems: 'center',
  },
  text: {
    ...TYPOGRAPHY.caption,
    color: COLORS.background,
    fontWeight: '600',
  },
});
```

**Step 3: Add to AppNavigator root layout**

In `src/navigation/AppNavigator.tsx`, add `<OfflineBanner />` inside the root `<NavigationContainer>` wrapper, positioned above the stack navigator.

**Step 4: Run tests**

Run: `npm run typecheck && npm test -- --ci --maxWorkers=2`
Expected: 0 TS errors, all tests pass

**Step 5: Commit**

```bash
git add src/components/common/OfflineBanner.tsx src/navigation/AppNavigator.tsx package.json
git commit -m "feat: add offline banner with slide animation when network unavailable"
```

---

### Task 10: Sync Queue Deduplication

**Files:**
- Modify: `src/services/firebase/syncService.ts` (~line 114-124, `queueChange` method)
- Test: `src/services/firebase/__tests__/syncService.test.ts`

**Step 1: Write the failing test**

Add to syncService test file:

```typescript
describe('queue deduplication', () => {
  it('should merge duplicate exercise completions by exerciseId', async () => {
    const change1: SyncChange = {
      type: 'exercise_completed',
      data: { exerciseId: 'lesson-01-ex-01', score: 85 },
      timestamp: Date.now(),
      retryCount: 0,
    };
    const change2: SyncChange = {
      type: 'exercise_completed',
      data: { exerciseId: 'lesson-01-ex-01', score: 92 },
      timestamp: Date.now() + 100,
      retryCount: 0,
    };

    await syncService.queueChange(change1);
    await syncService.queueChange(change2);

    const queue = await syncService.getQueueForTesting();
    const matchingEntries = queue.filter(
      q => q.type === 'exercise_completed' && q.data.exerciseId === 'lesson-01-ex-01'
    );
    // Should keep the LATEST (higher score) entry only
    expect(matchingEntries).toHaveLength(1);
    expect(matchingEntries[0].data.score).toBe(92);
  });

  it('should not dedup different exercise IDs', async () => {
    const change1: SyncChange = {
      type: 'exercise_completed',
      data: { exerciseId: 'lesson-01-ex-01', score: 85 },
      timestamp: Date.now(),
      retryCount: 0,
    };
    const change2: SyncChange = {
      type: 'exercise_completed',
      data: { exerciseId: 'lesson-01-ex-02', score: 92 },
      timestamp: Date.now() + 100,
      retryCount: 0,
    };

    await syncService.queueChange(change1);
    await syncService.queueChange(change2);

    const queue = await syncService.getQueueForTesting();
    expect(queue).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern="syncService" --verbose`
Expected: FAIL — dedup test fails because queueChange just appends

**Step 3: Implement deduplication in queueChange**

In `syncService.ts`, modify `queueChange()`:

```typescript
async queueChange(change: SyncChange): Promise<void> {
  const queue = await this.loadQueue();

  // Dedup: for exercise_completed, replace existing entry for same exerciseId with latest
  if (change.type === 'exercise_completed' && change.data.exerciseId) {
    const existingIdx = queue.findIndex(
      q => q.type === 'exercise_completed' && q.data.exerciseId === change.data.exerciseId
    );
    if (existingIdx !== -1) {
      // Keep the higher score (or latest if scores equal)
      const existing = queue[existingIdx];
      if ((change.data.score as number) >= (existing.data.score as number)) {
        queue[existingIdx] = change;
      }
      await this.saveQueue(queue);
      return;
    }
  }

  queue.push(change);
  // ... rest of existing logic (max size check, save)
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- --testPathPattern="syncService" --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/firebase/syncService.ts src/services/firebase/__tests__/syncService.test.ts
git commit -m "fix: deduplicate sync queue entries for same exercise (keep highest score)"
```

---

### Task 11: Per-User Gemini Rate Limiting (Client-Side)

**Files:**
- Modify: `src/services/ai/GeminiCoach.ts` (add rate check before API calls)
- Test: `src/services/ai/__tests__/GeminiCoach.test.ts`

**Step 1: Write failing test**

```typescript
describe('rate limiting', () => {
  it('should fall back to templates after 50 coaching calls per day', async () => {
    // Mock AsyncStorage to return count of 50
    mockAsyncStorage.getItem.mockResolvedValue('50');

    const result = await coachService.getFeedback(mockRequest);

    // Should return a template response, NOT call Gemini
    expect(mockGeminiCall).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --testPathPattern="GeminiCoach" --verbose`
Expected: FAIL

**Step 3: Implement client-side rate limiting**

Add to GeminiCoach.ts:

```typescript
const COACH_DAILY_LIMIT = 50;

private async checkRateLimit(): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const key = `coach-rate:${today}`;
  const count = parseInt(await AsyncStorage.getItem(key) ?? '0', 10);
  return count < COACH_DAILY_LIMIT;
}

private async incrementRateLimit(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `coach-rate:${today}`;
  const count = parseInt(await AsyncStorage.getItem(key) ?? '0', 10);
  await AsyncStorage.setItem(key, String(count + 1));
}
```

Call `checkRateLimit()` before any Gemini API call. If exceeded, return `getOfflineCoachingText()` directly.

**Step 4: Run tests**

Run: `npm test -- --testPathPattern="GeminiCoach" --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add src/services/ai/GeminiCoach.ts src/services/ai/__tests__/GeminiCoach.test.ts
git commit -m "feat: add per-user daily rate limit (50/day) for Gemini coaching calls"
```

---

## Batch 5: Verification + Final Test Run

### Task 12: Full Test Suite + TypeScript Verification

**Files:** All modified files from Tasks 1-11

**Step 1: Run TypeScript check**

Run: `npm run typecheck`
Expected: 0 errors

**Step 2: Run full test suite**

Run: `npm test -- --ci --maxWorkers=2`
Expected: All ~2,630+ tests pass, 0 failures

**Step 3: Run linter**

Run: `npm run lint`
Expected: 0 errors (warnings are acceptable)

**Step 4: Check git status and verify all changes are committed**

Run: `git status`
Expected: Clean working tree (all changes committed in previous tasks)

**Step 5: Log final test counts in commit**

```bash
git log --oneline -10
```

Verify all commits from this plan are present and properly messaged.

---

## Summary

| Batch | Tasks | Description | Estimated Messages |
|-------|-------|-------------|-------------------|
| 1 | Tasks 1-4 | Dialogue rewrite for all 13 cats | ~840 messages |
| 2 | Task 5 | ElevenLabs voice tuning | 13 config changes |
| 3 | Tasks 6-8 | Cloud Functions deploy + privacy policy | DevOps + doc |
| 4 | Tasks 9-11 | Offline banner + sync dedup + rate limiting | 3 code fixes |
| 5 | Task 12 | Full verification | Tests + typecheck |

**Total commits:** ~12
**Key files modified:** catDialogue.ts, catVoiceConfig.ts, GeminiCoach.ts, syncService.ts, AppNavigator.tsx
**New files:** OfflineBanner.tsx, privacy-policy.md

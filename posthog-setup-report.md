# PostHog Integration Setup Report

**Date:** 2026-03-13
**Project:** Purrrfect Keys (Expo React Native)
**PostHog Project:** `132842` — EU region (`https://eu.posthog.com`)
**Dashboard:** [Analytics basics](https://eu.posthog.com/project/132842/dashboard/568517)

---

## What Was Done

### 1. Configuration (`src/config/posthog.ts`)

A shared PostHog client is created once and exported for use across the app. Configuration is sourced from `app.config.js` via `expo-constants`, not hardcoded.

- Token and host are read from `Constants.expoConfig?.extra`
- The client is disabled automatically when the token is missing or placeholder
- Autocapture, lifecycle events, and feature flag preloading are enabled

### 2. Environment Variables (`.env.local`)

```
POSTHOG_PROJECT_TOKEN=<your-project-token>
POSTHOG_HOST=https://eu.i.posthog.com
```

These are exposed to the app via `app.config.js` → `extra` → `expo-constants`.

### 3. App Config (`app.config.js`)

Extends `app.json` and forwards env vars as Expo `extra` fields so they are accessible at runtime via `expo-constants`.

### 4. Screen Tracking (`src/navigation/AppNavigator.tsx`)

Screen views are tracked automatically via React Navigation's `onStateChange` callback, which calls `posthog.screen(routeName)` whenever the active screen changes. `PostHogProvider` is placed inside `NavigationContainer` per React Navigation v7 requirements.

### 5. Event Tracking Added

| Event | File | Trigger |
|---|---|---|
| `onboarding_started` | `src/screens/OnboardingScreen.tsx` | Mount (useEffect, once) |
| `onboarding_completed` | `src/screens/OnboardingScreen.tsx` | Final step completion |
| `achievement_unlocked` | `src/stores/achievementStore.ts` | Any new achievement unlock |
| `lesson_completed` | `src/screens/ExercisePlayer/ExercisePlayer.tsx` | Mastery test pass when lesson not yet completed |

### 6. Pre-existing Events (already in codebase)

The following events were already tracked via `src/services/analytics/PostHog.ts` and wired throughout the app:

| Category | Events |
|---|---|
| Auth | `auth_sign_up`, `auth_sign_in`, `auth_sign_out`, `auth_password_reset` |
| Exercise | `exercise_started`, `exercise_completed`, `exercise_paused`, `exercise_skipped`, `exercise_failed` |
| Progress | `lesson_completed`, `level_up`, `xp_earned`, `streak_achieved`, `streak_broken`, `achievement_unlocked` |
| Songs | `song_started`, `song_completed` |
| Cats | `cat_selected`, `cat_evolved`, `cat_unlocked` |
| AI Coach | `ai_feedback_requested`, `ai_feedback_received`, `ai_feedback_error` |
| Audio | `midi_connected`, `midi_disconnected`, `input_method_changed` |
| Settings | `settings_changed`, `sound_toggled`, `haptic_toggled`, `daily_goal_changed` |
| Session | `session_started`, `session_ended`, `app_backgrounded`, `app_foregrounded` |
| Monetization | `upgrade_viewed`, `upgrade_purchased`, `upgrade_restored` |
| Replay | `replay_triggered`, `replay_completed`, `replay_skipped` |
| Errors | `audio_latency_high`, `api_error`, `crash_reported` |
| Sync | `sync_started`, `sync_completed`, `sync_failed` |

---

## LLM Analytics (Server-Side)

All production Gemini API calls go through Firebase Cloud Functions. LLM analytics are captured server-side using `posthog-node` with manual `$ai_generation` events.

### Approach

`@posthog/ai` was evaluated but requires `@google/genai` (new SDK). The codebase uses `@google/generative-ai` (old SDK, v0.24.1). Rather than replacing the Gemini SDK, the manual capture pattern from PostHog docs is used — minimal change, no SDK migration.

### 7. PostHog Node Helper (`firebase/functions/src/posthogClient.ts`)

Singleton `PostHog` Node client initialised lazily from Firebase secrets. Exposes one function:

```typescript
captureAIGeneration({ distinctId, model, provider, inputTokens, outputTokens, latencySeconds, isError })
```

- Reads `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` from env (Firebase secrets)
- Fires `$ai_generation` event immediately (`flushAt: 1, flushInterval: 0`)
- Errors are swallowed — never breaks the Cloud Function

### 8. Environment Variables (Firebase Secrets)

The following must be added as Firebase secrets before deploying:

```bash
firebase functions:secrets:set POSTHOG_PROJECT_TOKEN
firebase functions:secrets:set POSTHOG_HOST
```

### 9. Instrumented Cloud Functions

Each function wraps its `model.generateContent()` call with a timer and calls `captureAIGeneration()` on completion or error. Retry attempts are tracked as separate events.

| Function | File | `$ai_generation` events |
|---|---|---|
| `generateCoachFeedback` | `firebase/functions/src/generateCoachFeedback.ts` | 1 per call (success or error) |
| `generateExercise` | `firebase/functions/src/generateExercise.ts` | 1–2 per call (initial + optional retry) |
| `generateSong` | `firebase/functions/src/generateSong.ts` | 1–2 per call (initial + optional retry) |

### 10. Event Properties Captured

| Property | Description |
|---|---|
| `$ai_trace_id` | Random UUID per generation (auto-generated) |
| `$ai_model` | `gemini-2.0-flash` |
| `$ai_provider` | `google` |
| `$ai_input_tokens` | From `response.usageMetadata.promptTokenCount` (coach feedback only) |
| `$ai_output_tokens` | From `response.usageMetadata.candidatesTokenCount` (coach feedback only) |
| `$ai_latency` | Wall-clock seconds for the Gemini API call |
| `$ai_is_error` | `true` if the call threw or returned invalid output |
| `$ai_error` | Error message string (when `$ai_is_error` is true) |

The `distinct_id` is the Firebase Auth UID, linking LLM events to the user's existing PostHog profile.

---

## Dashboard

**[Analytics basics](https://eu.posthog.com/project/132842/dashboard/568517)**

| Insight | Type | URL |
|---|---|---|
| Exercise Engagement (Started vs Completed) | Trends (DAU) | [View](https://eu.posthog.com/project/132842/insights/G8luWZD1) |
| Onboarding to First Exercise Funnel | Funnel | [View](https://eu.posthog.com/project/132842/insights/XYTVkirc) |
| Auth Activity (Sign Up, Sign In, Sign Out) | Trends | [View](https://eu.posthog.com/project/132842/insights/RavSN0QZ) |
| Progression Milestones (Level Up, Lessons, Achievements) | Trends | [View](https://eu.posthog.com/project/132842/insights/MoBesYsL) |

---

## Files Modified

| File | Change |
|---|---|
| `app.config.js` | Created — exposes PostHog env vars via Expo `extra` |
| `src/config/posthog.ts` | Created — shared PostHog client instance |
| `src/services/analytics/PostHog.ts` | Updated to use shared client from `src/config/posthog.ts` |
| `src/navigation/AppNavigator.tsx` | Added `PostHogProvider` + screen tracking via `onStateChange` |
| `src/screens/OnboardingScreen.tsx` | Added `onboarding_started` and `onboarding_completed` events |
| `src/stores/achievementStore.ts` | Added `achievement_unlocked` event on each new unlock |
| `src/screens/ExercisePlayer/ExercisePlayer.tsx` | Added `lesson_completed` event on mastery test pass |
| `.env.local` | Added `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` |
| `firebase/functions/src/posthogClient.ts` | Created — PostHog Node singleton + `captureAIGeneration()` helper |
| `firebase/functions/src/generateCoachFeedback.ts` | Added `$ai_generation` capture wrapping Gemini call |
| `firebase/functions/src/generateExercise.ts` | Added `$ai_generation` capture for initial + retry attempts |
| `firebase/functions/src/generateSong.ts` | Added `$ai_generation` capture for initial + retry attempts |
| `firebase/functions/package.json` | Added `posthog-node` dependency |

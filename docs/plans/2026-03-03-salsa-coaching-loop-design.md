# Salsa's Coaching Loop — Design Document

**Date:** 2026-03-03
**Goal:** Transform exercises from "play and score" into full lessons with a pre-exercise intro and post-exercise replay review, both coached by Salsa.

**Architecture:** Extends the existing DemoPlaybackService and ExercisePlayer with a replay mode. AI-generated coaching via Gemini returns structured JSON (pause points, comments) instead of a plain text summary. A timeline scrub bar gives random access to any point in the replay.

**Tech Stack:** DemoPlaybackService (extended), Gemini 2.0 Flash (structured output), Reanimated (overlays), existing PianoRoll + Keyboard components.

---

## 1. The Full Learning Loop

Every exercise follows this flow:

```
PRE-EXERCISE (Salsa Intro)
    │  Adaptive: brief / walkthrough / extended
    ▼
EXERCISE PLAYBACK (existing, unchanged)
    │  User plays normally
    ▼
SCORE REVEAL (existing CompletionModal)
    │  Smart trigger: auto if <80% or first attempt, button otherwise
    ▼
POST-EXERCISE REPLAY (new)
    │  Real-time replay + timeline scrub bar
    │  Auto-pause on 2-3 worst mistakes
    │  Salsa explains + demos correct version
    ▼
ACTION (Try Again / Next Exercise)
```

---

## 2. Pre-Exercise Salsa Intro

Three adaptive tiers based on context:

### Tier 1 — Brief (5-8 seconds)
**When:** Returning to a familiar exercise, last score ≥ 70%.

Small Salsa bubble in bottom-left of PianoRoll. One targeted sentence from learner profile data (e.g., "Last time your timing was late on the second half — try locking in with the metronome!"). Auto-dismisses after TTS finishes. Countdown starts immediately.

### Tier 2 — Walkthrough (15-20 seconds)
**When:** First attempt at this exercise, or new skill being introduced.

Larger Salsa card over the PianoRoll:
1. Salsa introduces the skill (TTS)
2. First 4 bars auto-play as mini-demo (DemoPlaybackService)
3. Salsa adds one tip (TTS)
4. Card dismisses, countdown begins

Skippable at any point.

### Tier 3 — Extended (20-30 seconds)
**When:** 3+ consecutive fails on this exercise.

Same as Tier 2 but demos the hardest section (identified from previous `score.details`), addresses the failure pattern specifically, and offers "Watch full demo first?" button.

### Coaching text source
- Tier 1: AI-generated with learner profile + previous score. Cached 1 hour.
- Tier 2: AI-generated with exercise metadata + skill description. Cached per exercise.
- Tier 3: AI-generated with exercise + last 3 attempt failure patterns. Not cached.
- All tiers: template string fallback when offline/rate-limited.

---

## 3. Post-Exercise Replay

### 3.1 Layout

```
┌─────────────────────────────────────────────┐
│  ← Exit Review          "Salsa's Review"    │  Top bar (simplified)
├─────────────────────────────────────────────┤
│                                             │
│         VerticalPianoRoll                   │  ~50% height
│         (color-coded notes)                 │  Notes colored by status
│                                             │
│    ┌──────────────┐                         │
│    │  🐱 Salsa    │                         │  Overlay (not layout push)
│    │  coaching    │                         │
│    └──────────────┘                         │
│                                             │
├─────────────────────────────────────────────┤
│         Piano Keyboard                      │  ~25% height
│         (read-only, display only)           │  Dual-highlight at mistakes
├─────────────────────────────────────────────┤
│  ▶ ━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  ~10% height (~44px)
│    🟢🟢🟡🟢🔴🔴🟢🟢🟢🟡🟢🟢🔴🟢🟢🟢      │  Colored note dots
│    0:04 ──────────────────────── 0:32       │  Draggable playhead
└─────────────────────────────────────────────┘
```

### 3.2 Color Coding (consistent across all components)

| Color | Condition | Meaning |
|-------|-----------|---------|
| Green | timingScore ≥ 70 | Perfect / good |
| Yellow | timingScore 30-69 | OK / slightly off |
| Red | missed or wrong pitch | Needs work |
| Grey outline | isMissedNote, no fill | User didn't play this |
| Purple flash | isExtraNote | User played something not in exercise |

### 3.3 Timeline Scrub Bar

- Thin horizontal track with one colored dot per note, positioned by beat
- Red diamond pins at pause-point beats
- Draggable playhead for random access
- Tap a note dot to jump to that beat
- Time labels (elapsed / total) at edges
- ~44px tall, compact single row

### 3.4 Salsa Bubble Behavior

**During continuous play:** Small floating pill (1 line, bottom-left of PianoRoll). Brief encouraging comments synced to beats ("Nice!", "Watch this part..."). Never covers active falling notes area.

**At pause points:** Expands to centered card over PianoRoll with dimmed backdrop. 2-3 sentences of explanation. "Show me" and "Continue" buttons visible. Auto-speaks via TTS.

### 3.5 Pause-Point Flow

```
CONTINUOUS PLAY → HIT PAUSE POINT → EXPLAIN → CORRECT DEMO → RESUME
                       │                │            │
                  Roll freezes    Salsa card     2-4 bars replay
                  30% dim         + TTS speaks   with perfect accuracy
                  ⏸ on scrub bar  "Show me" btn  (green highlights)
                                                 Auto-resumes after
```

1. **Freeze**: PianoRoll pauses. Background dims 30%. Scrub bar shows pause indicator.
2. **Explain**: Salsa card slides in. AI text (2-3 sentences) specific to this mistake. TTS speaks. Wrong + correct notes pulse on keyboard (red and green outlines).
3. **Show correct**: Card minimizes to pill ("Watch..."). Replay rewinds 2 beats, plays those bars perfectly with green highlights and audio.
4. **Resume**: Brief "Got it!" pill. Replay resumes from where it paused.

### 3.6 Replay Trigger Logic

| Condition | Behavior |
|-----------|----------|
| Score < 80% | Auto-starts after CompletionModal animation |
| First attempt (any score) | Auto-starts after CompletionModal animation |
| Score ≥ 80% on repeat | "Review with Salsa" button in CompletionModal |
| User can always skip/exit | No confirmation dialog |

---

## 4. AI Prompt Design

### 4.1 Post-Exercise Replay (structured JSON output)

Input: exercise metadata + full `score.details` array (per-note results).

Expected response:
```json
{
  "pausePoints": [
    {
      "beatPosition": 7,
      "type": "wrong_pitch",
      "explanation": "You played D4 instead of E4. Feel for the gap between the two black keys to land on E.",
      "showCorrectFromBeat": 5,
      "showCorrectToBeat": 9
    }
  ],
  "continuousComments": [
    { "beatPosition": 0, "text": "Good start!" },
    { "beatPosition": 20, "text": "Strong finish!" }
  ],
  "summary": "Two tricky spots — the D/E mix-up and rushing in the middle. Everything else was solid."
}
```

Rules enforced in prompt:
- Max 3 pause points
- Max 5 continuous comments (2-5 words each)
- Pause explanations: 1-2 sentences, specific, actionable
- `showCorrectFromBeat` / `showCorrectToBeat`: ±2 beats around mistake, snapped to bar lines
- Same personality rules as existing coach (warm, no jargon, no "as an AI")

### 4.2 Pre-Exercise Intro

Expected response:
```json
{
  "introText": "This exercise introduces eighth notes in C major. Listen for the short-short-long rhythm.",
  "tip": "Keep your wrist loose. Tight wrists make fast notes harder.",
  "highlightBeats": [4, 5, 6],
  "demoBars": { "from": 0, "to": 8 }
}
```

### 4.3 Cost Estimate

| Call | Input tokens | Output tokens | Cost |
|------|-------------|---------------|------|
| Post-exercise replay | ~400 | ~200 | ~$0.03 |
| Pre-exercise intro | ~200 | ~100 | ~$0.015 |
| **Per exercise total** | | | **~$0.045** |

With ~60% cache hit rate on intros: effective ~$0.033/exercise.

### 4.4 Fallback (offline / rate-limited / AI failure)

- **Pause points**: Algorithmic — pick 2-3 notes with worst timingScore where `isCorrectPitch === false` or `isMissedNote === true`
- **Explanations**: Template strings — `"You played {played} instead of {expected}. Look for {expected} — it's {distance} keys to the {direction}."`
- **Continuous comments**: Static pool — `["Good start!", "Nice!", "Keep going!", "Almost there!", "Strong finish!"]` distributed evenly
- **Pre-exercise**: Template — `"Let's practice {skillName}! Watch the first few bars..."` + standard demo

---

## 5. Data Flow

```
handleExerciseCompletion(score)
        │
        ├── setReplayPlanState(null)       ← clear previous
        ├── setFinalScore(score)           ← local state in ExercisePlayer
        ├── buildReplayPlan(exercise, score) fires async
        │         │
        │         ├── Maps NoteScore[] → ReplayScheduleEntry[]
        │         │     { note, startBeat, durationBeats, jitterMs, play, status, color }
        │         │
        │         ├── Calls Gemini → structured JSON (pausePoints, comments)
        │         │
        │         └── setReplayPlanState(plan)  ← stored in ExercisePlayer state
        │
        └── setShowCompletion(true)        ← CompletionModal appears
              (6.5s animation — AI runs in parallel)
```

**Score data ownership:** The `ReplayPlan` is built and stored as local state (`useState<ReplayPlan | null>`) inside `ExercisePlayer.tsx` — NOT via a ref leak from `useExercisePlayback`. When `handleExerciseCompletion` fires, ExercisePlayer receives the `ExerciseScore`, immediately kicks off `buildReplayPlan()` as an async side effect, and stores the result in its own state. This survives the mode transition from `'exercise'` to `'replay'` cleanly — no cross-hook ref coupling.

`ReplayPlan` is built once, stored in React state. Scrubbing reads from it — no recomputation.

---

## 6. Component Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/core/exercises/replayTypes.ts` | ReplayPlan, ReplayScheduleEntry, PausePoint, ReplayComment types |
| `src/services/replayCoachingService.ts` | Builds ReplayPlan from score + Gemini AI |
| `src/services/ai/ReplayPromptBuilder.ts` | Constructs structured Gemini prompts for replay + intro |
| `src/screens/ExercisePlayer/ReplayOverlay.tsx` | Salsa bubble (pill + expanded card), dim backdrop, TTS trigger |
| `src/screens/ExercisePlayer/ReplayTimelineBar.tsx` | Scrub bar with colored dots, playhead, pause pins |
| `src/screens/ExercisePlayer/SalsaIntro.tsx` | Pre-exercise intro overlay (3 tiers) |

### Modified Files

| File | Change |
|------|--------|
| `ExercisePlayer.tsx` | Add `mode: 'exercise' \| 'replay'` state, wire replay trigger from CompletionModal, integrate SalsaIntro before countdown |
| `CompletionModal.tsx` | Add "Review with Salsa" button, smart auto-trigger logic |
| `DemoPlaybackService.ts` | Accept `ReplayScheduleEntry[]` with jitter/skip, add pause/resume at specific beats, add `seekToBeat()` for scrubbing |
| `useExercisePlayback.ts` | No changes needed — ExercisePlayer captures score from `onComplete` callback directly |
| `VerticalPianoRoll.tsx` | Accept `mode: 'play' \| 'replay'` prop. In replay mode, `noteColorOverrides` take precedence over active-note highlighting. In play mode, existing behavior unchanged. |
| `Keyboard.tsx` | Add `readOnly` display mode with dual-highlight (expected green outline + played red fill at mistakes) |

---

## 7. Edge Cases

| Scenario | Behavior |
|----------|----------|
| Perfect score (100%) | No pause points. Continuous positive comments only. Replay is a short victory lap. |
| Terrible score (<30%) | Cap at 3 pause points. Pick 3 different error types. Salsa stays encouraging. |
| User scrubs past pause point | Skipped, not re-triggered. Coaching card tappable on timeline pin. |
| AI slow / fails | Replay starts immediately with algorithmic pause points + templates. Late AI response discarded. |
| User exits replay early | No penalty. Coaching data already logged to learner profile. |
| Exercise has 0 notes | Skip replay entirely. |
| Offline | Full visual/audio replay works. Text coaching uses template fallback. |
| Long exercise (30+ notes) | Continuous sections fast-forward at 1.5x, only pausing/slowing for mistake regions. |

---

## 8. Keyboard Behavior During Replay

- **Correct notes**: Key lights up in the note's color (green/yellow per timing)
- **Wrong pitch**: Both keys flash — expected note in green outline, played note in red fill
- **Missed notes**: Expected key pulses with grey outline (ghost press)
- **Extra notes**: Played key flashes purple briefly
- **No touch input accepted** — keyboard is display-only during replay

---

## 9. Audio Mixing: TTS vs Piano Playback

TTS (Salsa speaking) and piano note audio compete for the same iOS audio session. Rules:

**During continuous play:** No TTS. Continuous comments are text-only (speech bubble, no voice). Piano audio plays at full volume. This avoids the mixing problem entirely for 90% of playback time.

**At pause points:** Piano audio stops (playback is frozen). TTS speaks at full volume with no competition. Clean separation — only one audio source active at a time.

**During correct-version demo (after explanation):** TTS finishes first, then the mini-demo plays piano audio. Sequential, not simultaneous. The Salsa card minimizes to a pill ("Watch...") as a visual cue that speech is done and playback is starting.

**Why not duck:** Audio ducking (lowering piano volume while TTS plays) creates a muddy experience on phone speakers. Sequential audio is cleaner for single-speaker devices. If we later add headphone detection, ducking could be an enhancement.

---

## 10. Fast-Forward Handling for Long Exercises

For exercises with 30+ notes, continuous replay at 1x speed is tedious. The fast-forward system:

**Speed zones:** `ReplayCoachingService` tags each beat range as `'normal'` or `'fast'`:
- Beats where all notes are green (timingScore ≥ 70): tagged `'fast'`
- Beats within ±4 beats of a pause point or yellow/red note: tagged `'normal'`
- First 4 beats and last 4 beats: always `'normal'` (natural start/end)

**DemoPlaybackService speed scaling:**
- `'normal'` zones: 1.0x speed
- `'fast'` zones: 2.0x speed (not 1.5x — needs to feel noticeably faster)
- Speed transitions use a 0.5-second ease (not instant snap) to avoid jarring PianoRoll jumps

**PianoRoll handling:** `VerticalPianoRoll` already receives `currentBeat` from the demo service and uses `msPerBeat` for scroll speed. When speed changes, `DemoPlaybackService` updates the effective `msPerBeat` passed to the beat callback. The PianoRoll doesn't need to know about speed zones — it just follows the beat position it receives.

**Scrub bar handling:** The playhead moves at real-time speed (proportional to actual elapsed seconds, not beats). This means it visually accelerates through fast zones, which is the correct behavior — the user sees it zip through the green sections.

**`seekToBeat()` implementation:** When the user scrubs to a specific beat, `DemoPlaybackService` computes the elapsed time for that beat by summing the durations of all preceding zones at their respective speeds. This ensures the playhead position stays consistent after seeking.

---

## 11. Cost Monitoring

**Per-user-session estimate:** Average 5 exercises/session × $0.045/exercise = ~$0.22/session.

**At scale:**

| DAU | Sessions/day | Gemini calls/day | Daily cost | Monthly cost |
|-----|-------------|-----------------|------------|-------------|
| 100 | 100 | 1,000 | $22 | $660 |
| 1,000 | 1,000 | 10,000 | $220 | $6,600 |
| 10,000 | 10,000 | 100,000 | $2,200 | $66,000 |

**Mitigation layers (cumulative):**
1. **Cloud Function rate limiting** (already deployed): 15 exercises/hr, 50/day per user
2. **Client-side rate limiting** (already wired): prevents runaway calls
3. **Intro caching** (~60% hit rate): exercise-level cache means repeat plays skip the AI call
4. **Replay caching** (~30% hit rate): score-bucket cache means similar scores get same coaching
5. **With all caching**: effective cost drops ~40-50%

**Monitoring:** Add PostHog events for `replay_ai_call` and `intro_ai_call` with `cached: boolean` property. Dashboard alert if daily Gemini spend exceeds threshold.

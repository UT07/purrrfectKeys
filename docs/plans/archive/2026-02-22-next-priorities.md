# Purrrfect Keys — Next Priorities

**Date:** February 22, 2026
**Context:** Phase 7 (UI Revamp) complete. 90 test suites, 2,099 tests, 0 TypeScript errors.

---

## Priority 1: All-AI Exercise Generation (CRITICAL)

### Problem
There are only 36 static JSON exercises across 6 lessons (~45-60 minutes of gameplay). A daily player exhausts hand-crafted content in 2-3 days. Currently, tiers 1-6 use static JSON files loaded via `ContentLoader.ts`, and only tiers 7-15 use AI generation via Gemini.

### Goal
**Every exercise from tier 1 onward should be AI-generated.** If tier 1 is too risky (absolute beginner exercises need to be perfect), then tier 4+ at minimum. The static JSON exercises become seed examples / fallback only, not the primary content source.

### Current Architecture
- `ContentLoader.ts` — static `require()` registry of 36 JSON exercises + 6 lesson manifests
- `geminiExerciseService.ts` — Gemini 2.0 Flash generation with validation + retry
- `exerciseBufferManager.ts` — FIFO queue in AsyncStorage, pre-generates up to 5 exercises
- `SkillTree.ts` — 100 skill nodes across 15 tiers; each node has `targetExerciseIds`
- `CurriculumEngine.ts` — picks session type + skills, calls AI generation for tiers 7+
- `ExercisePlayer.tsx` — loads static exercise by ID, OR loads from AI buffer in `aiMode`

### What Needs to Change
1. **CurriculumEngine must generate exercises for ALL tiers** (not just 7+)
   - Tier 1-3 generation needs tighter constraints (narrow MIDI range, slower tempo, simpler patterns)
   - Quality gate: validate that generated tier-1 exercises are actually playable by a complete beginner
2. **SkillTree nodes should define generation constraints** instead of pointing to static exercise IDs
   - Each node gets: `midiRange`, `maxInterval`, `tempoRange`, `allowedRhythms`, `hand`
   - `targetExerciseIds` becomes optional fallback, not primary
3. **LevelMapScreen / DailySessionScreen** should navigate with `aiMode: true` + skill context, not `exerciseId`
4. **Exercise buffer should be skill-aware** — pre-generate for the next 2-3 skills in the tree
5. **Static exercises become fallback** for offline mode / API failure only
6. **Offline first-time experience**: The first 3-5 exercises need to work without network. Options:
   - Keep a small set of static exercises as bootstrap content
   - Bundle pre-generated exercises in the app binary
   - Generate and cache exercises during onboarding (requires network)

### Risk Assessment
- **Tier 1 risk**: "Find Middle C" is a 4-note exercise. If Gemini generates something weird for a day-1 beginner, it's a terrible first impression. Mitigation: very tight validation constraints + static fallback.
- **Latency**: First exercise in a session may take 1-4s to generate. The ExerciseLoadingScreen (Salsa + fun facts) already handles this.
- **Cost**: Gemini Flash is cheap (~$0.02/exercise). 50 exercises/day = ~$1/day/user.
- **Quality consistency**: Need a validation layer that checks pedagogical quality, not just playability (e.g., does a "scales" exercise actually contain a scale pattern?).

---

## Priority 2: Audio Input — Microphone Pitch Detection (CRITICAL)

### Problem
No real audio input works on device. MIDI requires a native module not yet installed (needs RN 0.77+). 95%+ of target users don't own MIDI keyboards. Without mic input, the app is a screen-tap piano trainer — fundamentally limited.

### Goal
Low-latency single-note pitch detection via device microphone. Must work on iOS and Android. Target: <150ms detection latency (already spec'd in audio-pipeline.md).

### Current State
- `PitchDetector.ts` — interface exists, references a C++ TurboModule that is NOT built
- `AudioEngine` architecture — `WebAudioEngine` (JSI) and `ExpoAudioEngine` (expo-av) both exist for playback
- Scoring engine already handles pitch matching — just needs real input events instead of screen taps
- `audio-pipeline.md` documents the YIN algorithm spec and C++ implementation plan

### What Needs to Be Done
1. **Choose implementation path:**
   - Option A: C++ TurboModule with YIN algorithm (spec'd in audio-pipeline.md) — lowest latency, most work
   - Option B: expo-av recording + JS-side pitch detection (e.g., pitchy, aubio WASM) — easier to ship, higher latency
   - Option C: Native module wrapping platform APIs (AVAudioEngine on iOS, Oboe on Android) — best quality, platform-specific work
2. **Polyphonic vs monophonic:** Start with monophonic (single note). Polyphonic is a research problem.
3. **Integration points:**
   - Feed detected pitches into `exerciseStore.handleNoteEvent()` as `MidiNoteEvent` (same interface as MIDI)
   - Handle sustained notes (piano keys ring, mic will detect continuously)
   - Handle ambient noise rejection (threshold + confidence score)
4. **Calibration flow:** First-time mic permission + ambient noise measurement + sensitivity adjustment
5. **Latency must be measured on real devices** — simulator audio is unreliable

### This Must Be Absolutely Perfect
This is the core interaction loop. If pitch detection is laggy, inaccurate, or unreliable, nothing else matters. Budget significant R&D time for tuning.

---

## Priority 3: User UI Testing (Owner: User)

User will test the app on device and provide a detailed visual report. No action needed from dev until report arrives. Areas to watch:
- Concert Hall palette (pure blacks + crimson) — does it feel premium or oppressive?
- Cat SVG compositions — do they look distinct and charming at all sizes?
- Lava lamp gradient — visible or too subtle?
- Custom tab bar — icons clear, active state obvious?
- Salsa coach presence — helpful or cluttered?
- Exercise loading screen — smooth transition or jarring?
- Typography scale — readable, consistent hierarchy?
- Card shadows and elevation — perceptible on device?

---

## Priority 4: Rive Animations (Needs Guidance)

### Current State
- `RiveCatAvatar.tsx` exists as a placeholder component
- No `.riv` files have been created
- Current cat animations use Reanimated transforms (bounce, rotate, wag) — functional but programmatic

### What's Needed
- Guidance on Rive editor workflow (creating .riv files)
- Design and animate at least 3 cat states: idle, celebrate, teach
- Integration path: `rive-react-native` package + state machine triggers
- Decision: animate all 12 cats individually (expensive) or build a parameterized rig?

### User has no Rive experience — will need step-by-step walkthrough.

---

## Priority 5: Sound Design (Needs Planning)

### What's Missing
The app is completely silent outside of piano note playback. No:
- Button press sounds (tap, toggle, select)
- Navigation sounds (screen transitions, tab switches)
- Celebration sounds (star earned, combo hit, exercise complete, level up)
- Error/feedback sounds (wrong note, miss)
- UI ambient sounds (loading, countdown)
- Cat sounds (meow on greeting, purr on reward)
- Streak milestone jingles

### Design Direction Options
1. **Minimal & Musical**: Short piano-derived sounds (chord stabs, single notes, arpeggios). Fits the music education context. Think: Duolingo's "ding" but piano-flavored.
2. **Playful & Catty**: Cat-themed sounds (meows, purrs, bells). More personality, risks being annoying.
3. **Hybrid**: Piano-based for gameplay feedback, cat sounds for mascot interactions only.

### Implementation Plan (once direction is chosen)
1. Source/create ~20-30 short audio assets (.wav, <1s each)
2. Create `SoundManager` service (preload + play, similar to AudioEngine pattern)
3. Wire sounds into:
   - `PressableScale` (tap feedback — optional per-instance)
   - `CompletionModal` (stars, score reveal)
   - `AchievementToast` (level up, streak)
   - `ExerciseBuddy` (correct/wrong note reactions)
   - `CatAvatar` (mascot interactions)
   - `CountInAnimation` (metronome ticks)
4. Add volume control in settings (separate from keyboard volume)
5. Respect device silent mode

---

## Execution Order

```
[NOW]     Priority 1: All-AI Exercises ← biggest content gap
[NOW]     Priority 3: User UI Testing ← parallel, user-driven
[NEXT]    Priority 2: Audio Input R&D ← core interaction, needs research
[NEXT]    Priority 5: Sound Design planning ← can prototype alongside audio work
[LATER]   Priority 4: Rive Animations ← nice-to-have, current SVG animations are functional
```

Priorities 1 and 2 are **ship-blockers**. Without enough content and real audio input, the app can't retain users past day 2. Priorities 3-5 are quality multipliers — they make a good app great, but the app needs to work first.

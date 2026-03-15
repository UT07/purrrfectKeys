# Purrrfect Keys -- Comprehensive QA Test Plan

**Version:** 1.0
**Date:** March 13, 2026
**Scope:** Full regression before merge to master and build
**Codebase:** 145 suites, 2,950 tests passing, 0 TypeScript errors
**Companion docs:** `docs/MANUAL-VERIFICATION-CHECKLIST.md`, `docs/plans/UNIFIED-PLAN.md`

## Priority Legend

| Priority | Meaning | Gate |
|----------|---------|------|
| **P0** | Must pass. Blocks merge/build. | Merge to master |
| **P1** | Should pass. Blocks beta release. | TestFlight / Internal Testing |
| **P2** | Nice to have. Can ship without but fix within first month. | Post-launch |

## Hardware Legend

| Tag | Meaning |
|-----|---------|
| `[SIM]` | Can be tested on iOS Simulator |
| `[DEVICE]` | Requires physical iPhone/iPad |
| `[MIDI]` | Requires USB/BLE MIDI keyboard |
| `[ANDROID]` | Requires Android device or emulator |

---

## A. Core Gameplay Loop

This is the most critical section. If the core loop is broken, nothing else matters.

### A1. Exercise Loading -- Static (Lessons 1-6)

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| A1.1 | Load a static exercise | Navigate to Learn tab > tap Lesson 1 > tap first exercise node | ExerciseLoadingScreen appears with Salsa tip, then ExercisePlayer renders with PianoRoll and Keyboard | P0 | [SIM] |
| A1.2 | All 30 static exercises load | Sequentially open each exercise in lessons 1-6 (5 exercises per lesson) | Each exercise loads without crash. Notes render in PianoRoll. Keyboard shows correct octave range. | P0 | [SIM] |
| A1.3 | Exercise metadata displayed | Open any exercise | Title, difficulty stars, and exercise type label shown in TopBar | P0 | [SIM] |
| A1.4 | Count-in animation | Start any exercise with countIn > 0 | CountInAnimation shows beat numbers (e.g., "1-2-3-4") before notes begin falling | P0 | [SIM] |
| A1.5 | ExerciseLoadingScreen timing | Start an exercise | Loading screen shows for at least 1 second, waits for Salsa TTS to finish (if speaking), then transitions. 15s safety cap prevents stuck screen. | P1 | [SIM] |

### A2. Exercise Loading -- AI-Generated (Lessons 7-40)

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| A2.1 | Load an AI-generated exercise | Navigate to Learn > Lesson 7 > tap first exercise | Exercise loads from ContentLoaderRegistry.generated.ts via lazy `require()`. PianoRoll renders notes. | P0 | [SIM] |
| A2.2 | Lazy loading performance | Cold launch > navigate directly to Lesson 30 | Exercise loads without noticeable startup delay (lazy `require()` thunks, not eager loading of all 499 exercises) | P1 | [SIM] |
| A2.3 | AI exercise in aiMode | DailySessionScreen > tap a challenge exercise | ExercisePlayer opens with `aiMode=true`. Exercise generates via Gemini (or template fallback). | P1 | [SIM] |
| A2.4 | AI generation offline fallback | Disable WiFi > trigger AI exercise generation | Falls back to `templateExercises.ts` for the requested tier/skill. No crash. Exercise is playable. | P0 | [SIM] |

### A3. Exercise Types

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| A3.1 | Standard (play) exercise | Play a standard note-matching exercise from Lesson 1 | Standard scoring: accuracy 35%, timing 30%, completeness 10%, extra notes 10%, duration 15%. Notes fall, user plays on keyboard. | P0 | [SIM] |
| A3.2 | Rhythm exercise | Navigate to an exercise with `exerciseType: 'rhythm'` | RhythmTapZone appears. Scoring weights timing higher. Pitch accuracy relaxed. | P0 | [SIM] |
| A3.3 | Ear training exercise | Navigate to an exercise with `exerciseType: 'earTraining'` | ListenPhaseOverlay plays audio prompt first. User plays back notes. Pitch accuracy emphasized, timing tolerance relaxed. | P0 | [SIM] |
| A3.4 | Chord identification exercise | Navigate to an exercise with `exerciseType: 'chordId'` | ChordPrompt shows chord name/audio. User plays chord tones. Order-independent scoring. All chord tones required. | P0 | [SIM] |
| A3.5 | Sight reading exercise | Navigate to an exercise with `exerciseType: 'sightReading'` | SightReadingOverlay displays notation. First-attempt emphasis scoring. No replay bonus. | P1 | [SIM] |
| A3.6 | Call and response exercise | Navigate to an exercise with `exerciseType: 'callResponse'` | CallResponsePhase: Salsa plays a phrase, user repeats. Phrase-level matching. | P1 | [SIM] |
| A3.7 | ExerciseIntroOverlay per type | Open each of the 6 exercise types | Each type shows its own intro overlay with type-appropriate instructions (e.g., "Listen carefully..." for ear training) | P1 | [SIM] |
| A3.8 | Type-specific CompletionModal | Complete each exercise type | CompletionModal shows type-relevant breakdown labels (e.g., "Rhythm Accuracy" for rhythm, "Pitch Accuracy" for ear training) | P1 | [SIM] |
| A3.9 | Score normalization | Complete exercises of all 6 types with varying quality | All scoring strategies produce scores in 0-100 range. Star thresholds apply correctly. | P0 | [SIM] |

### A4. Scoring and Stars

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| A4.1 | Perfect score | Play all notes correctly with good timing | Score near 100%. 3 stars awarded. "PERFECT" feedback shown. | P0 | [SIM] |
| A4.2 | Passing score | Play most notes, miss a few | Score >= passingScore. 1 or 2 stars. CompletionModal shows "Pass". | P0 | [SIM] |
| A4.3 | Failing score | Play very few correct notes | Score < passingScore. 0 stars. CompletionModal shows retry option. | P0 | [SIM] |
| A4.4 | Star thresholds | Check multiple scores against thresholds [70, 85, 95] | 70-84 = 1 star, 85-94 = 2 stars, 95+ = 3 stars | P0 | [SIM] |
| A4.5 | Timing feedback | Play notes early, late, and on time | Visual overlay shows PERFECT (<=25ms), GOOD (<=75ms), OK (<=150ms), EARLY/LATE (<=300ms), MISS (>300ms) | P0 | [SIM] |
| A4.6 | Extra notes penalty | Play several notes not in the exercise | Extra notes component of score decreases. Not a crash. | P1 | [SIM] |
| A4.7 | Duration scoring | Hold notes for correct vs incorrect durations | Duration component (15% weight) reflects accuracy of note lengths | P1 | [SIM] |
| A4.8 | High score tracking | Get 85% on an exercise, then get 92% | `exerciseHighScores` in progressStore updates to 92%. Previous score not lost. | P0 | [SIM] |
| A4.9 | Scoring with mic input | Switch input to mic > play an exercise on a real piano | Scoring applies 1.5x timing tolerance for mic. Latency compensation of 100ms applied. | P1 | [DEVICE] |

### A5. XP, Levels, and Streaks

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| A5.1 | XP earned on pass | Complete an exercise with passing score | XP earned: 10 (pass) + 10 per star + 25 (first completion) + 20 (if perfect). Shown in CompletionModal and GemEarnPopup. | P0 | [SIM] |
| A5.2 | Level-up | Accumulate enough XP to reach next level threshold | Level-up animation plays. Level number increments in ProfileScreen. AchievementToast may fire. | P0 | [SIM] |
| A5.3 | Streak increment | Complete at least one exercise today | Streak counter increments by 1. StreakFlame animation on HomeScreen. | P0 | [SIM] |
| A5.4 | Streak preserved on consecutive days | Complete exercise on Day 1, then Day 2 | Streak shows 2. No reset. | P0 | [SIM] |
| A5.5 | Streak break | Skip a day (use device date manipulation or mock) | Streak resets to 0 or 1 depending on implementation. Streak flame disappears. | P1 | [SIM] |
| A5.6 | XP persists on restart | Earn XP > kill app > reopen | XP total and level unchanged after restart. progressStore rehydrates from AsyncStorage. | P0 | [SIM] |
| A5.7 | Practice time tracking | Complete a 3-minute exercise | `recordPracticeSession()` called with correct duration. ProfileScreen "Practice Minutes" updates. | P1 | [SIM] |

### A6. Exercise Navigation Flow

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| A6.1 | Exercise completion > next exercise | Complete exercise 1 of lesson 1 | CompletionModal shows. Tap "Next" > navigates to exercise 2 via `navigation.replace('Exercise', { exerciseId })`. | P0 | [SIM] |
| A6.2 | Last exercise in lesson | Complete final exercise of a lesson | LessonCompleteScreen shows with celebration animation. XP reward for lesson. | P0 | [SIM] |
| A6.3 | Lesson completion unlocks next | Complete all exercises in Lesson 1 | Lesson 2 unlocks on LevelMapScreen. Node changes from locked (grey) to available (pulsing). | P0 | [SIM] |
| A6.4 | Retry on fail | Fail an exercise (score < passing) | CompletionModal shows "Try Again" button. Tapping retries same exercise. | P0 | [SIM] |
| A6.5 | Back button mid-exercise | Press back/close during an active exercise | Confirmation dialog or direct navigation back. Exercise state not corrupted. | P1 | [SIM] |
| A6.6 | skillId pass-through | Navigate via DailySession challenge with skillId | `skillIdParam` passed through all `navigation.replace()` calls. Skill mastery recorded correctly even when AI exercise IDs differ from SKILL_TREE targetExerciseIds. | P1 | [SIM] |

### A7. Pause and Resume

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| A7.1 | Pause mid-exercise | Tap pause button during note playback | Metronome stops. PianoRoll freezes. Timer stops. | P0 | [SIM] |
| A7.2 | Resume from pause | Tap resume after pausing | Playback resumes from exact pause point (not restart). `pauseElapsedRef` restores elapsed time correctly. | P0 | [SIM] |
| A7.3 | Score unaffected by pause | Pause for 30 seconds, then resume and complete | Scores reflect actual playing quality, not pause duration. | P0 | [SIM] |
| A7.4 | App backgrounding mid-exercise | Switch to another app during exercise, then return | Exercise pauses automatically. Resume works correctly on foreground. | P1 | [DEVICE] |

### A8. Demo Mode (Watch Salsa Play)

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| A8.1 | Start demo | Tap "Watch Demo" or SalsaIntro before exercise | DemoPlaybackService plays notes visually (keys highlight). No scoring during demo. | P1 | [SIM] |
| A8.2 | Demo audio | During demo playback | Piano notes play with correct timing. Cat dialogue appears in MascotBubble. | P1 | [SIM] |
| A8.3 | Demo completion | Demo finishes playing all notes | Transitions to actual exercise (or shows "Your Turn" prompt). | P1 | [SIM] |

### A9. Replay / Review with Salsa

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| A9.1 | Start replay | Complete exercise > CompletionModal > "Review with Salsa" | ReplayOverlay appears. Notes replay with visual highlighting on keyboard. | P1 | [SIM] |
| A9.2 | Replay natural completion > next exercise | Let replay finish naturally (all beats played) | `stopReplay(true)` called. Navigates to next exercise in lesson (or Home if AI mode). | P0 | [SIM] |
| A9.3 | Replay early exit | Tap "Exit Review" during replay | `stopReplay(false)` called. CompletionModal re-appears with original scores intact. | P0 | [SIM] |
| A9.4 | ReplayTimelineBar | During replay | Timeline bar shows playback progress. Responds to scrub gestures. | P2 | [SIM] |

### A10. Combo System and Visual Feedback

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| A10.1 | Combo counter | Hit 5+ consecutive correct notes | ComboMeter appears showing combo count. Number increases with each correct note. | P0 | [SIM] |
| A10.2 | Combo tier escalation | Hit 5, 10, 15, 20+ combo | Tier changes: NORMAL(0) > FIRE(5) > BLAZE(10) > SKULL(15) > LEGENDARY(20). Visual theme changes. | P1 | [SIM] |
| A10.3 | ComboGlow | Reach FIRE tier or higher | Full-screen animated border glow appears, color synced to combo tier. | P1 | [SIM] |
| A10.4 | Combo break | Miss a note during an active combo | Combo resets to 0. ComboMeter disappears or shows break animation. | P0 | [SIM] |
| A10.5 | Hit particles | Play a note with PERFECT timing | HitParticles effect fires at the note position. | P2 | [SIM] |
| A10.6 | Feedback text | Play notes with varying timing | FeedbackText shows "PERFECT", "GOOD", "EARLY", "LATE", or "MISS" centered on screen with appropriate color. | P0 | [SIM] |

---

## B. Input Methods

### B1. Touch Keyboard

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| B1.1 | Single note press | Tap a key on the on-screen keyboard | Correct MIDI note registered. Piano sound plays. Key visually depresses. | P0 | [SIM] |
| B1.2 | Multi-touch | Press two keys simultaneously | Both notes registered. Both sounds play. No dropped notes. | P0 | [DEVICE] |
| B1.3 | Key release | Press and release a key | noteOff event fires. Sound stops (with release envelope). | P0 | [SIM] |
| B1.4 | Keyboard range auto-zoom | Open exercises with different note ranges (e.g., C4-E4 vs C3-C5) | `computeZoomedRange` selects 1-2 octave range focused on exercise notes. No unnecessary scrolling. | P0 | [SIM] |
| B1.5 | SplitKeyboard (two hands) | Open an exercise with `hand: 'left'` and `hand: 'right'` notes | SplitKeyboard renders left and right hand regions. Color-coded by hand. | P1 | [SIM] |
| B1.6 | Hit test accuracy | Tap edges and boundaries between black/white keys | `keyboardHitTest.ts` maps touches to correct MIDI notes. Black keys take priority over adjacent white keys at boundaries. | P1 | [DEVICE] |

### B2. MIDI Keyboard

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| B2.1 | MIDI device detection | Connect USB MIDI keyboard via adapter | Device appears in MidiSetupScreen device list. | P0 | [MIDI] [DEVICE] |
| B2.2 | MIDI noteOn | Play a note on MIDI keyboard | Note registered in ExercisePlayer. Sound plays. Correct MIDI note number. | P0 | [MIDI] [DEVICE] |
| B2.3 | MIDI velocity | Play soft and hard on MIDI keyboard | Velocity mapped to volume (data2 / 127). Soft notes quieter. | P1 | [MIDI] [DEVICE] |
| B2.4 | MIDI timestamp normalization | Play notes during exercise | MIDI timestamps normalized to `Date.now()` domain for consistent scoring with touch input. | P0 | [MIDI] [DEVICE] |
| B2.5 | MIDI noteOff filtering | Play and release notes | Only `noteOn` events recorded for scoring. `noteOff` events trigger sound release only, not double-counting. | P0 | [MIDI] [DEVICE] |
| B2.6 | MIDI disconnect mid-exercise | Unplug MIDI keyboard during exercise | Graceful fallback to touch keyboard. No crash. Error message shown. | P1 | [MIDI] [DEVICE] |
| B2.7 | MIDI latency | Play fast passages (8th notes at 120 BPM) | Latency < 15ms target. No perceptible delay. | P1 | [MIDI] [DEVICE] |
| B2.8 | NoOpMidiInput fallback | Run on simulator without native MIDI module | `NoOpMidiInput` used silently. No crash on accessing MIDI settings. | P0 | [SIM] |

### B3. Microphone Input

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| B3.1 | Mic permission request | Navigate to MicSetupScreen | iOS permission dialog appears. Granting permission enables mic input. | P0 | [DEVICE] |
| B3.2 | Monophonic detection (YIN) | Settings > mic detection mode = mono > play single notes on piano | PitchDetector detects correct pitch. Notes registered in exercise. Latency < 150ms. | P0 | [DEVICE] |
| B3.3 | Polyphonic detection (ONNX) | Settings > mic detection mode = poly > play 2-3 note chord | PolyphonicDetector (Basic Pitch ONNX model) detects multiple pitches simultaneously. | P1 | [DEVICE] |
| B3.4 | ONNX fallback to YIN | Force ONNX model load failure (e.g., delete model file) | Automatic fallback to YIN monophonic detection. No crash. Seamless to user. | P1 | [DEVICE] |
| B3.5 | Ambient noise rejection | Quiet room, no playing | RMS threshold (0.002) rejects ambient noise. No phantom notes detected. | P0 | [DEVICE] |
| B3.6 | Soft note detection | Play piano softly at ~1m distance | Notes detected (iPhone mic RMS for piano is 0.003-0.009, above 0.002 threshold). | P1 | [DEVICE] |
| B3.7 | Note sustain | Play and hold a note for 3 seconds | Note sustains properly. Release hold (500ms) survives intermittent weak frames. No premature noteOff. | P1 | [DEVICE] |
| B3.8 | Sample rate adaptation | Check `AudioCapture` on iPhone | Detects actual 48000Hz sample rate (not assumed 44100Hz). `MicrophoneInput` calls `detector.setSampleRate()`. | P1 | [DEVICE] |
| B3.9 | Audio session mode | Use mic input mode | `measurement` mode active (no Apple voice processing). Piano audio not crushed/filtered. | P0 | [DEVICE] |
| B3.10 | Mic timing tolerance | Complete exercise via mic | 1.5x timing tolerance applied. Latency compensation of 100ms subtracted from timestamps. | P1 | [DEVICE] |

### B4. Input Method Switching

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| B4.1 | Switch touch to MIDI | Settings > Input > select MIDI | InputManager routes events from MIDI. Touch keyboard still visible but MIDI takes priority. | P1 | [MIDI] [DEVICE] |
| B4.2 | Switch touch to mic | Settings > Input > select Microphone | InputManager routes from mic. MicSetupScreen shown if permission not yet granted. | P1 | [DEVICE] |
| B4.3 | Input priority order | MIDI connected + mic enabled | MIDI > Mic > Touch priority. MIDI input used when available. | P1 | [MIDI] [DEVICE] |
| B4.4 | Mid-exercise switch | Change input method during active exercise | New input method takes effect. Scoring continues without interruption. | P2 | [DEVICE] |

---

## C. Audio

### C1. Piano Sound Quality

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| C1.1 | FluidR3 samples play | Play notes C2, C3, C4, C5, C6 | Each note uses its dedicated FluidR3 GM sample. Clean piano tone, no distortion. | P0 | [DEVICE] |
| C1.2 | Pitch-shifted notes | Play D4, E4, F#4 (not base sample notes) | Notes pitch-shifted from nearest sample (C4). Sound natural within +/-6 semitone range. | P0 | [DEVICE] |
| C1.3 | Polyphony (concurrent notes) | Play a 4-note chord rapidly | All 4 notes sound simultaneously. No dropped notes. Volume scaling applied (DEFAULT_VOLUME = 0.5). | P0 | [DEVICE] |
| C1.4 | Round-robin voice pools | Rapidly repeat the same note (trill) | VOICES_PER_NOTE = 2. Round-robin cycling ensures clean re-trigger. No click or pop. | P0 | [DEVICE] |
| C1.5 | Sample fallback | Force sample loading failure | Falls back to procedural WAV synthesis. Sound still plays (lower quality but functional). | P1 | [SIM] |
| C1.6 | Audio latency | Touch key > listen for sound | Touch-to-sound < 20ms target. Perceived as instant. | P0 | [DEVICE] |
| C1.7 | No audio on silent mode | Set iPhone to silent mode | Piano audio still plays (audio session configured for playback). | P1 | [DEVICE] |

### C2. Metronome

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| C2.1 | Metronome plays | Start exercise with `metronomeEnabled: true` | Metronome clicks audible on each beat. Tempo matches exercise BPM. | P0 | [DEVICE] |
| C2.2 | Metronome toggle | Toggle metronome on/off mid-exercise | Metronome starts/stops immediately. No lingering clicks. | P1 | [SIM] |
| C2.3 | Metronome volume | Adjust metronome volume slider | Volume changes in real-time. Independent of keyboard volume. | P1 | [DEVICE] |
| C2.4 | Count-in metronome | Exercise with countIn = 4 | 4 audible metronome ticks before notes start falling. | P0 | [DEVICE] |

### C3. Sound Effects

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| C3.1 | Combo sound | Reach combo streaks of 5, 10, 15, 20 | SoundManager plays tier-appropriate combo sound. Haptic feedback fires. | P1 | [DEVICE] |
| C3.2 | Star earned sound | Complete exercise with stars | Star reveal sound plays for each star earned. | P1 | [DEVICE] |
| C3.3 | Chest reveal sounds | Open a loot chest (RewardChest) | 10-phase timed animation with sound at each phase (0-6.5s). | P2 | [DEVICE] |
| C3.4 | UI button haptics | Tap PressableScale buttons throughout app | Haptic feedback fires on press. Mapped per SoundName in SoundManager. | P1 | [DEVICE] |
| C3.5 | No audio overlap | Trigger multiple sounds rapidly | Sound pooling prevents overlap glitches. Clean layering. | P1 | [DEVICE] |
| C3.6 | SoundManager session | SoundManager.preload() called | Does NOT call `Audio.setAudioModeAsync()` (was removed to prevent clobbering PlayAndRecord session). | P0 | [SIM] |

### C4. Text-to-Speech

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| C4.1 | ElevenLabs TTS plays | Trigger coaching speech with API key set | Neural-quality voice plays. Matches cat personality (e.g., Salsa = Jessica = playful). | P1 | [DEVICE] |
| C4.2 | Per-cat voice matching | Switch active cat > trigger TTS | Voice changes to match cat. 13 unique ElevenLabs voice IDs. | P1 | [DEVICE] |
| C4.3 | TTS caching | Repeat same phrase with same cat | Second play is instant (cached mp3 on file system via expo-file-system). | P1 | [DEVICE] |
| C4.4 | ElevenLabs fallback | Remove/invalidate ELEVENLABS_API_KEY | Falls back to expo-speech seamlessly. No crash. Still speaks. | P0 | [SIM] |
| C4.5 | TTS stop | Start TTS > immediately start new TTS | Previous speech stops (`_currentSound.stopAsync()`). New speech plays. No overlap. | P1 | [DEVICE] |
| C4.6 | TTS network failure | Disable WiFi mid-TTS request | No crash. Falls back to expo-speech on next call. | P1 | [DEVICE] |
| C4.7 | onDone callback | TTS speaks > finishes | `onDone` callback fires after speech completes. ExerciseLoadingScreen uses this to gate transition. | P0 | [SIM] |
| C4.8 | Both providers unavailable | ElevenLabs fails + expo-speech unavailable | `speak()` calls `onDone?.()` before returning. No hang. | P0 | [SIM] |

---

## D. Progression and Content

### D1. LevelMap

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| D1.1 | LevelMap renders 40 lessons | Navigate to Learn tab | 40 lesson nodes visible. Adventure-style winding path with SVG bezier curves. | P0 | [SIM] |
| D1.2 | Node states | Check nodes for completed, current, and locked lessons | Completed = gold/green (with star count). Current = pulsing blue (76px). Locked = grey dimmed (52px, lock icon). | P0 | [SIM] |
| D1.3 | Auto-scroll to current | Open Learn tab with lesson 5 as current | ScrollView auto-scrolls to lesson 5 node. User doesn't need to scroll to find it. | P1 | [SIM] |
| D1.4 | Tap completed lesson | Tap a completed lesson node | LessonIntroScreen shows with exercise list, individual scores, "Practice Again" option. | P1 | [SIM] |
| D1.5 | Tap locked lesson | Tap a locked lesson node | LessonIntroScreen shows with `locked=true`. Explains unlock requirements. | P1 | [SIM] |
| D1.6 | Tap current lesson | Tap the current (pulsing) lesson node | Navigates to first uncompleted exercise in that lesson. | P0 | [SIM] |
| D1.7 | Learning path filtering | Select a different learning path (Pop & Film, Classical, etc.) | LevelMap shows only lessons in selected path. Path selector in header. | P1 | [SIM] |
| D1.8 | Exercise type indicators | Zoom into lesson nodes | Colored dots indicate exercise types in each lesson (play/rhythm/ear/chord/sight/call). | P2 | [SIM] |
| D1.9 | Cat companions | Scroll through LevelMap | Cat companions appear at tier boundaries via TIER_CAT_COMPANIONS. | P2 | [SIM] |
| D1.10 | TierIntroScreen | Tap a tier boundary | TierIntroScreen shows tier name, description, and cat for that tier. | P2 | [SIM] |

### D2. Lesson Completion

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| D2.1 | All exercises done | Complete all 5 exercises in Lesson 1 | LessonCompleteScreen with celebration animation. Confetti. XP reward (100 XP for Lesson 1). | P0 | [SIM] |
| D2.2 | Lesson progress persistence | Complete 3/5 exercises > kill app > reopen | Progress preserved. 3 exercises show as completed. Can continue from exercise 4. | P0 | [SIM] |
| D2.3 | Lesson unlock chain | Complete Lesson 1 > check Lesson 2 | Lesson 2 changes from locked to available. Lesson 3 remains locked. | P0 | [SIM] |

### D3. Daily Challenges

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| D3.1 | Daily challenge generates | Open HomeScreen or DailySessionScreen | DailyChallengeCard shows today's challenge. 1 of 7 types: any-exercise, specific-category, score-threshold, combo-streak, speed-run, perfect-notes, practice-minutes. | P0 | [SIM] |
| D3.2 | Challenge determinism | Open app at same date on two devices | Same challenge type/parameters (deterministic date-hash). | P1 | [SIM] |
| D3.3 | Complete daily challenge | Fulfill challenge requirements | Challenge marked complete. Gem reward earned. No double-claiming (guard implemented). | P0 | [SIM] |
| D3.4 | Challenge expiry | Check yesterday's challenge | Cannot be claimed retroactively. Shows as expired. | P1 | [SIM] |
| D3.5 | Weekly bonus | Check on Sunday | Weekly bonus challenge available (50 gems + 3x XP). Harder requirement. | P1 | [SIM] |
| D3.6 | Monthly bonus | Check on 1st of month | Monthly bonus (150 gems + 3x XP, 48h window). | P2 | [SIM] |
| D3.7 | Challenge navigation | Tap DailyChallengeCard | Navigates to ExercisePlayer with appropriate aiMode, category-mapped skillId. | P0 | [SIM] |

### D4. Cat Evolution

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| D4.1 | Evolution stages display | Open CatSwitchScreen > view a cat | Shows current evolution stage: Baby, Teen, Adult, or Master. Progress bar to next stage. | P0 | [SIM] |
| D4.2 | Cat XP earning | Complete exercises with selected cat | Cat earns XP. Progress bar advances. | P0 | [SIM] |
| D4.3 | Stage transition | Accumulate enough cat XP to reach threshold | EvolutionReveal animation plays (full-screen Pokemon-style). Cat visuals update (accessories, size). | P0 | [SIM] |
| D4.4 | Ability unlock | Evolve to Teen/Adult/Master | New abilities unlock (from 12 available). AbilityEngine applies to exercise config. | P1 | [SIM] |
| D4.5 | Ability effects | Select a cat with active abilities | Exercise config modified (e.g., wider timing window, combo shield, XP multiplier). | P1 | [SIM] |
| D4.6 | Evolution persistence | Evolve a cat > restart app | Evolution stage and XP preserved in catEvolutionStore. | P0 | [SIM] |

### D5. Gem Economy

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| D5.1 | Earn gems from exercise | Complete exercise with good score | Gems earned based on score/stars. GemEarnPopup animation. Balance updates in gemStore. | P0 | [SIM] |
| D5.2 | Earn gems from challenge | Complete daily challenge | Challenge gem reward added to balance. | P1 | [SIM] |
| D5.3 | Earn gems from song mastery | Achieve new mastery tier on a song | Gem reward per tier (bronze/silver/gold/platinum). | P1 | [SIM] |
| D5.4 | Spend gems on cat | CatSwitchScreen > tap locked cat > Buy | Gem balance decreases. Cat unlocked. BuyModal confirmation. | P0 | [SIM] |
| D5.5 | Insufficient gems | Try to buy cat with insufficient balance | BuyModal shows insufficient gems. Purchase blocked. No negative balance. | P0 | [SIM] |
| D5.6 | Gem persistence | Earn gems > restart app | Balance unchanged. `createImmediateSave` ensures critical state persists before navigation. | P0 | [SIM] |
| D5.7 | Gem transaction history | Check gemStore internals | earn/spend transactions recorded with source and amount. | P2 | [SIM] |

### D6. Cat Gallery (CatSwitchScreen)

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| D6.1 | Gallery renders | Navigate to CatSwitchScreen | Swipeable cards (88% width). All 12 cats shown. Gem balance in header. | P0 | [SIM] |
| D6.2 | Starter cats available | Fresh account | 3 starter cats (mini-meowww, jazzy, luna) unlocked. | P0 | [SIM] |
| D6.3 | Locked cat preview | Swipe to a locked cat | Dimmed avatar preview (not blank lock circle). Price shown. Buy button visible. | P1 | [SIM] |
| D6.4 | Cat selection | Tap an unlocked cat | Cat becomes active companion. settingsStore updates. HomeScreen shows selected cat. | P0 | [SIM] |
| D6.5 | Legendary cat (Chonky Monke) | View Chonky Monke card | Legendary rarity border. Higher gem price. Special unlock condition verified. | P2 | [SIM] |
| D6.6 | Ability icons | View an evolved cat | Ability icons shown with lock badges for locked abilities. Unlocked abilities have descriptions. | P1 | [SIM] |

### D7. Achievement System

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| D7.1 | Achievement unlocks | Complete an achievement condition (e.g., complete first exercise) | AchievementToast appears. Achievement recorded in achievementStore. | P1 | [SIM] |
| D7.2 | Achievement persistence | Unlock achievement > restart app | Achievement remains unlocked. | P1 | [SIM] |
| D7.3 | No duplicate achievements | Trigger same condition again | Achievement does not fire again. No duplicate toast. | P1 | [SIM] |

---

## E. Social Features

### E1. Friend Codes

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| E1.1 | Friend code generation | Sign in > navigate to AddFriendScreen | 6-character friend code displayed. Copy-to-clipboard button works. | P0 | [SIM] |
| E1.2 | Friend code uniqueness | Check `friendCodes` collection in Firestore | Each code maps to exactly one user. No duplicates. | P0 | [SIM] |
| E1.3 | Code lookup | Enter a valid friend code in AddFriendScreen | Friend's username and avatar appear for confirmation. | P0 | [SIM] |
| E1.4 | Invalid code lookup | Enter nonexistent code | Graceful error message: "No user found with this code". No crash. | P0 | [SIM] |
| E1.5 | Auth gate | Anonymous user opens AddFriendScreen | Sign-in prompt shown (not crash). Social features require authenticated account. | P0 | [SIM] |
| E1.6 | Username registration during onboarding | Complete onboarding step 7 (username) | Username saved to both `users/{uid}.username` AND `usernames/{name}` collection atomically. | P0 | [SIM] |

### E2. Friend Requests

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| E2.1 | Send friend request | Look up friend code > tap "Add Friend" | Request appears in recipient's pending list. Sender sees "Request Sent". | P0 | [SIM] |
| E2.2 | Accept friend request | Recipient opens Social tab > sees pending request > tap "Accept" | Both users appear in each other's friends list. Firestore `friends` subcollection updated. | P0 | [SIM] |
| E2.3 | Decline friend request | Recipient taps "Decline" | Request removed. Neither user added to friends. | P1 | [SIM] |
| E2.4 | Self-add prevention | Enter your own friend code | Error or no-op. Cannot add yourself as friend. | P1 | [SIM] |
| E2.5 | Duplicate request prevention | Send request to someone already requested/friended | Error message or no-op. No duplicate entries. | P1 | [SIM] |
| E2.6 | Friend deletion | Friends list > remove a friend | Friend removed from both users' lists. Activity feed items from that friend filtered out. Challenges cleaned up. | P1 | [SIM] |

### E3. Friend Challenges

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| E3.1 | Send challenge from CompletionModal | Complete exercise > "Challenge a Friend" > ChallengeFriendSheet > select friend | Challenge created in Firestore with exercise ID and sender's score. | P0 | [SIM] |
| E3.2 | ChallengeFriendSheet offline-first | Disable WiFi > send challenge | Local store updates immediately. UI shows "Challenge Sent". Syncs to Firestore when online. | P1 | [SIM] |
| E3.3 | Receive challenge | Open Social tab | Pending challenge appears with exercise title and sender's score. | P0 | [SIM] |
| E3.4 | Accept and play challenge | Tap challenge > play exercise > complete | Score submitted. ChallengeCard updates to "completed" with comparison. | P0 | [SIM] |
| E3.5 | Score perspective | View challenge as sender | Shows "Your score: X%" (sender's score) and "Their score: Y%" (or "Not played yet"). | P0 | [SIM] |
| E3.6 | Score perspective (receiver) | View challenge as receiver | Labels correctly swapped based on `fromUid === myUid` check. | P0 | [SIM] |
| E3.7 | Challenge expiry | Check an old challenge | Expired challenges show as expired, not pending. Cannot be played. | P1 | [SIM] |
| E3.8 | Challenge notification | Friend sends challenge > open Social tab | Local notification fires with sender name, exercise title, sender's score. | P1 | [DEVICE] |
| E3.9 | No duplicate notifications | Re-open Social tab | Same challenge does NOT trigger another notification. | P1 | [SIM] |

### E4. Activity Feed

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| E4.1 | Feed renders | Open FriendsScreen > Activity tab | Recent friend events visible (level-ups, evolutions, high scores). Sorted by timestamp (newest first). | P1 | [SIM] |
| E4.2 | Level-up event | Level up while having friends | Activity feed item posted. Friends can see it. | P1 | [SIM] |
| E4.3 | Evolution event | Evolve a cat while having friends | Activity feed item posted with cat name and new stage. | P2 | [SIM] |
| E4.4 | Feed after friend deletion | Remove a friend | Deleted friend's items filtered from activity feed in socialStore. | P1 | [SIM] |

### E5. Leagues and Leaderboard

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| E5.1 | League auto-assignment | Sign in (non-anonymous) | User auto-assigned to a league. leagueStore populated. | P0 | [SIM] |
| E5.2 | Leaderboard display | Open LeaderboardScreen | Standings show rank, username, XP for all league members. Tier-colored header. | P0 | [SIM] |
| E5.3 | XP updates in standings | Complete exercises | XP reflected in league standings. May need to re-open screen. | P1 | [SIM] |
| E5.4 | Promotion zone | View top 3 in standings | Highlighted in green. At week end, promoted to next tier. | P2 | [SIM] |
| E5.5 | Demotion zone | View bottom 3 in standings | Highlighted in red. At week end, demoted to previous tier. | P2 | [SIM] |
| E5.6 | League tiers | Check tier names | Bronze, Silver, Gold, Diamond tiers with appropriate colors. | P1 | [SIM] |

### E6. Social Tab Badge

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| E6.1 | Badge appears | Receive friend request or challenge | Red badge on Social tab with count. | P0 | [SIM] |
| E6.2 | Badge updates | Accept challenge | Badge count decreases by 1. | P1 | [SIM] |
| E6.3 | Badge clears | Accept/decline all pending items | Badge disappears entirely. | P1 | [SIM] |
| E6.4 | Badge combines counts | Have both pending challenges and friend requests | Badge shows combined count. | P1 | [SIM] |

### E7. Share Cards

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| E7.1 | Score share card | Complete exercise > CompletionModal > Share | ShareCard generates image with score, streak, cat avatar. | P1 | [DEVICE] |
| E7.2 | Share card export | Tap share button on ShareCard | System share sheet opens (expo-sharing). Image renders without blank/broken areas. | P1 | [DEVICE] |
| E7.3 | Evolution share card | Cat evolves | Share card shows before/after cat stage. | P2 | [DEVICE] |

---

## F. Song Library

### F1. Song Browsing

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| F1.1 | Song library loads | Navigate to Songs tab | SongLibraryScreen renders. Genre carousel at top. Song cards below. | P0 | [SIM] |
| F1.2 | Genre filtering | Tap a genre in carousel | Song list filters to selected genre. | P0 | [SIM] |
| F1.3 | Search | Type a song name in search bar | Results filter in real-time. | P1 | [SIM] |
| F1.4 | Difficulty filter | Apply difficulty filter | Songs sorted/filtered by difficulty level. | P1 | [SIM] |
| F1.5 | Song card display | View song cards | Each card shows title, artist, difficulty, genre, mastery badge (if earned). | P0 | [SIM] |
| F1.6 | Empty state (offline) | Disable WiFi > open Songs tab | Graceful empty state. "No songs" message. No crash. songService error handling returns empty arrays. | P0 | [SIM] |
| F1.7 | Weekly featured song | Check HomeScreen | WeeklyFeaturedSongCard shows a featured song with image and "Play" CTA. | P2 | [SIM] |

### F2. Song Playback

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| F2.1 | Open song player | Tap a song card | SongPlayerScreen opens with section list. | P0 | [SIM] |
| F2.2 | Section playback | Tap a section > play | Notes from ABC notation rendered. User plays along. Scoring applied. | P0 | [SIM] |
| F2.3 | Layer toggle | Toggle melody/harmony layers | Only selected layer's notes shown and scored. | P1 | [SIM] |
| F2.4 | Loop mode | Enable loop on a section | Section repeats after completion. | P2 | [SIM] |
| F2.5 | ABC parser | Load songs with various ABC notations | `abcParser.ts` (abcjs) correctly converts ABC -> NoteEvent[]. No parse errors. | P1 | [SIM] |

### F3. Song Mastery

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| F3.1 | Mastery tier assignment | Score 70% on a song section | Bronze mastery badge. | P0 | [SIM] |
| F3.2 | Mastery tier progression | Score 80%, 90%, 95% on same section | Silver, Gold, Platinum badges respectively. | P0 | [SIM] |
| F3.3 | Best-score merge | Score 85% then 75% on same section | Mastery stays at Silver (85%). Best score preserved. | P0 | [SIM] |
| F3.4 | Gem reward per tier | Achieve new mastery tier | Gems earned for reaching new tier. | P1 | [SIM] |
| F3.5 | Mastery persistence | Earn Gold mastery > restart app | Mastery preserved in songStore / Firestore. | P0 | [SIM] |

---

## G. Auth and Data

### G1. Anonymous Sign-In

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| G1.1 | First launch | Install and open app | Anonymous Firebase auth succeeds silently. User can play exercises immediately. | P0 | [SIM] |
| G1.2 | Offline first launch | Airplane mode > open app | Local guest fallback. Core loop works offline. 8s timeout on `initAuth()`. | P0 | [SIM] |
| G1.3 | Anonymous user restrictions | Try accessing Social tab as anonymous | Sign-in prompt or restricted access. Social features require authenticated account. | P0 | [SIM] |

### G2. Email/Password Auth

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| G2.1 | Email sign-up | Profile > Sign Up > enter email + password | Account created. Auth state updates. Social features unlocked. | P0 | [SIM] |
| G2.2 | Email sign-in | Sign out > Sign In > enter existing email + password | Auth succeeds. Progress loaded from Firestore. | P0 | [SIM] |
| G2.3 | Invalid email | Enter "notanemail" | Validation error shown. No crash. | P1 | [SIM] |
| G2.4 | Weak password | Enter "123" | Password strength error shown. | P1 | [SIM] |
| G2.5 | Wrong password | Enter correct email + wrong password | "Invalid credentials" error. No crash. | P1 | [SIM] |

### G3. Google Sign-In

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| G3.1 | Google sign-in | Tap Google Sign-In button | Google OAuth flow opens. After consent, signed in. CFBundleURLTypes configured correctly. | P0 | [DEVICE] |
| G3.2 | Google sign-in cancel | Start Google flow > cancel | Returns to auth screen. No crash. | P1 | [DEVICE] |

### G4. Apple Sign-In

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| G4.1 | Apple sign-in | Tap Apple Sign-In button | Apple auth sheet appears. Raw nonce -> Firebase, SHA256(nonce) -> Apple. | P0 | [DEVICE] |
| G4.2 | Apple sign-in cancel | Start Apple flow > cancel | Returns to auth screen. No crash. | P1 | [DEVICE] |

### G5. Account Linking

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| G5.1 | Link anonymous to email | Anonymous user > Profile > Link Email | Anonymous account linked. Progress preserved. UID unchanged. | P0 | [SIM] |
| G5.2 | Link anonymous to Google | Anonymous user > Link Google | Same behavior. Progress preserved. | P0 | [DEVICE] |
| G5.3 | Link anonymous to Apple | Anonymous user > Link Apple | Same behavior. Progress preserved. | P0 | [DEVICE] |

### G6. Cross-Device Sync

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| G6.1 | Push progress | Complete exercises on Device A | Scores saved to Firestore. | P0 | [SIM] |
| G6.2 | Pull progress | Sign in on Device B with same account | `pullRemoteProgress()` loads all scores. Progress visible. | P0 | [SIM] |
| G6.3 | Conflict resolution | Complete same exercise on both devices | "Highest wins" merge. Higher score preserved. | P1 | [SIM] |
| G6.4 | Offline queue | Complete exercise offline > go online | Pending changes sync when network available. | P1 | [SIM] |

### G7. Sign-Out

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| G7.1 | Sign out | Profile > Sign Out | Auth state cleared. Returns to Auth/Onboarding screen. | P0 | [SIM] |
| G7.2 | Local data preserved | Sign out > check AsyncStorage | Local progress data still on device. Not deleted. | P1 | [SIM] |
| G7.3 | Sign in different account | Sign out > sign in as different user | Clean slate. No data bleed from previous account. | P0 | [SIM] |

### G8. Account Deletion

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| G8.1 | Delete account | AccountScreen > Delete Account > Confirm | Cloud Function `deleteUserData` called. All 9 subcollections, friendCodes, league membership, challenges, friend lists cleaned up. User document deleted. | P0 | [SIM] |
| G8.2 | Client-side fallback | Delete account when Cloud Function unavailable | `deleteUserDataClientSide()` mirrors Cloud Function logic. All data still cleaned. | P0 | [SIM] |
| G8.3 | Auth deletion | After data deletion | `user.delete()` called. Firebase auth account removed. All stores reset. | P0 | [SIM] |
| G8.4 | Anonymous account deletion | Anonymous user taps delete | Handled gracefully (either prevents or processes correctly). No crash. | P1 | [SIM] |
| G8.5 | Post-deletion state | After account deletion | App returns to onboarding. No stale data in stores or UI. | P0 | [SIM] |

### G9. Data Migration

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| G9.1 | Anonymous to authenticated migration | Play as anonymous > sign up with email | Local progress migrates to Firestore. `dataMigration.ts` one-time migration runs. | P0 | [SIM] |
| G9.2 | No migration on existing account | Sign in to account that already has cloud data | Existing cloud data preserved. No overwrite from empty local data. | P0 | [SIM] |

---

## H. Settings and Profile

### H1. Settings

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| H1.1 | Daily goal picker | Profile > tap daily goal chip | Expandable picker. Options: 5, 10, 15, 20 minutes. Selection persists. | P1 | [SIM] |
| H1.2 | Volume control | Profile > adjust keyboard/metronome volume | Volume changes in real-time. Persists in settingsStore. | P1 | [SIM] |
| H1.3 | Input method selector | Profile > Input Method | Options: Touch, MIDI, Microphone. Selection persists. Routes through InputManager. | P1 | [SIM] |
| H1.4 | Cat companion selector | Profile > tap current cat | Navigates to CatSwitchScreen. Selected cat updates globally. | P1 | [SIM] |
| H1.5 | Mic detection mode | Profile > Mic Detection Mode | Options: Monophonic (YIN), Polyphonic (ONNX). Persists in settingsStore. | P1 | [SIM] |

### H2. Profile Display

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| H2.1 | Stats grid | Open ProfileScreen | Shows XP total, level, streak count, exercises completed. All values accurate. | P0 | [SIM] |
| H2.2 | Username display | Open ProfileScreen | Username shown (registered during onboarding). | P0 | [SIM] |
| H2.3 | Cat avatar | Open ProfileScreen | Selected cat avatar rendered with correct mood and evolution stage. | P1 | [SIM] |
| H2.4 | Settings persistence | Change settings > restart app | All settings preserved. settingsStore rehydrates from AsyncStorage. | P0 | [SIM] |

---

## I. Navigation and UX

### I1. Tab Navigation

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| I1.1 | All tabs accessible | Tap Home, Learn, Songs, Social, Profile | Each tab loads its screen. Custom animated tab icons respond. | P0 | [SIM] |
| I1.2 | Tab state preservation | Home > Learn > back to Home | HomeScreen state preserved (scroll position, etc.). Not re-mounted from scratch. | P1 | [SIM] |
| I1.3 | CustomTabBar animations | Tap tabs rapidly | PressableScale animations are smooth. No crash (migrated from TouchableOpacity). | P0 | [SIM] |

### I2. Stack Navigation

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| I2.1 | Back buttons | Navigate deep (Home > Learn > LessonIntro > Exercise > CompletionModal) > press back repeatedly | Each back press returns to previous screen. No orphaned screens. | P0 | [SIM] |
| I2.2 | Exercise fade transition | Open Exercise screen | Fade animation on entry (configured in RootStack). | P2 | [SIM] |
| I2.3 | Modal screens | Open MidiSetup, MicSetup, Account | Modal presentation style. Dismiss gesture works. | P1 | [SIM] |

### I3. Onboarding Flow

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| I3.1 | Full 7-step flow | Fresh install > complete all steps | Step 1: Welcome. Step 2: Experience Level. Step 3: Equipment Check. Step 4: Goal Setting. Step 5: Learning Path Selection. Step 6: Cat Selection. Step 7: Username + Display Name. | P0 | [SIM] |
| I3.2 | Step transitions | Navigate forward and back through steps | Slide transitions (AnimatedStepWrapper). Back button visible on steps 2-5. Per-step cat characters shown. | P1 | [SIM] |
| I3.3 | Experience level selection | Step 2: select "Beginner", "Some Experience", or "Experienced" | Selection persists. Affects initial skill assessment routing. | P0 | [SIM] |
| I3.4 | Equipment check | Step 3: select keyboard type | Options include: no keyboard, built-in screen, MIDI keyboard. Routes to appropriate setup. | P1 | [SIM] |
| I3.5 | Learning path selection | Step 5: select from 5 paths | Piano Basics, Pop & Film, Classical, Jazz & Blues, Kids. Persists to settingsStore. | P0 | [SIM] |
| I3.6 | Cat selection | Step 6: select starter cat | 3 starters available (mini-meowww, jazzy, luna). Selection persists. | P0 | [SIM] |
| I3.7 | Username registration | Step 7: enter username | Username saved to `users/{uid}.username` AND `usernames/{name}` collection atomically. Duplicates rejected. | P0 | [SIM] |
| I3.8 | Onboarding completion | Finish step 7 | Navigates to MainTabs (HomeScreen). `hasCompletedOnboarding` set. Re-opening app skips onboarding. | P0 | [SIM] |
| I3.9 | Step dots | During onboarding | StepDots component shows current progress (7 dots). | P2 | [SIM] |

### I4. Error Handling

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| I4.1 | Network error during exercise load | Disable WiFi > try loading AI exercise | Fallback to template exercise. Error message if no fallback available. No crash. | P0 | [SIM] |
| I4.2 | Invalid exercise ID | Navigate with `exerciseId: 'nonexistent'` | Error boundary catches. ErrorDisplay shown with "Exercise not found" message. | P1 | [SIM] |
| I4.3 | Firebase auth timeout | Slow network > first launch | 8s timeout on `initAuth()`. Falls back to local guest. | P0 | [SIM] |
| I4.4 | Crash recovery | Force crash (if possible) > reopen app | App restarts cleanly. No data corruption. State rehydrates from AsyncStorage. | P1 | [DEVICE] |

### I5. Loading and Empty States

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| I5.1 | ExerciseLoadingScreen | Start an exercise | Loading screen with Salsa tip shown. 3-gate dismiss: minTime(1s) + exerciseReady + speechDone. | P0 | [SIM] |
| I5.2 | Song library loading | Open Songs tab (first time, or slow network) | Loading skeleton or spinner. Then songs appear. | P1 | [SIM] |
| I5.3 | Empty friends list | Open FriendsScreen with no friends | Empty state with "Add Friends" CTA. Not a blank screen. | P1 | [SIM] |
| I5.4 | Empty activity feed | Open activity feed with no friend activity | Empty state message. Not a blank screen. | P2 | [SIM] |

---

## J. Analytics and Monitoring

### J1. PostHog Events

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| J1.1 | exercise_started fires | Start an exercise | PostHog receives `exercise_started` event with exerciseId, exerciseType properties. | P1 | [SIM] |
| J1.2 | exercise_completed fires | Complete an exercise | PostHog receives `exercise_completed` with score, stars, exerciseId. | P1 | [SIM] |
| J1.3 | auth_sign_in fires | Sign in | PostHog receives `auth_sign_in` with method (email/google/apple). | P1 | [SIM] |
| J1.4 | level_up fires | Level up | PostHog receives `level_up` with new level. | P2 | [SIM] |
| J1.5 | cat_evolved fires | Cat evolves | PostHog receives `cat_evolved` with catId, newStage. | P2 | [SIM] |
| J1.6 | DebugLogScreen verification | Navigate to DebugLogScreen | PostHog events visible in debug log. Filter by PostHog shows recent events. | P1 | [SIM] |
| J1.7 | No PII in events | Check PostHog event properties | No emails, names, or identifiable data in event properties. | P1 | [SIM] |
| J1.8 | Test PH button | DebugLogScreen > Test PH button | Test event fires. Visible in PostHog dashboard. | P2 | [SIM] |

---

## K. Performance and Stability

### K1. Stability

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| K1.1 | 10-minute continuous play | Play 10+ exercises consecutively | No crashes, no freezes, no memory leaks. Check Xcode Instruments for memory growth. | P0 | [DEVICE] |
| K1.2 | App backgrounding | Mid-exercise > switch to another app > return | App resumes correctly. Exercise paused. Audio resumes. No white screen. | P0 | [DEVICE] |
| K1.3 | App foregrounding | Background app for 5 minutes > return | Auth token still valid (or refreshed). Stores intact. Not re-onboarded. | P0 | [DEVICE] |
| K1.4 | Rapid navigation | Tap between tabs and screens quickly (20+ taps in 10 seconds) | No crashes. No navigation stack corruption. No duplicate screens. | P1 | [SIM] |
| K1.5 | Long idle | Leave app open for 30 minutes | No battery drain spikes. No memory growth. Auth token refreshes if needed. | P1 | [DEVICE] |

### K2. Performance Benchmarks

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| K2.1 | Cold start time | Kill app > tap icon > measure time to HomeScreen interactive | < 3 seconds | P0 | [DEVICE] |
| K2.2 | Exercise start time | Tap exercise > measure time to playable state | < 2 seconds (including loading screen) | P0 | [DEVICE] |
| K2.3 | Touch-to-sound latency | Tap keyboard key > measure to audible sound | < 20ms perceived | P0 | [DEVICE] |
| K2.4 | PianoRoll frame rate | Play exercise with many notes | Smooth 60fps scrolling. No jank. | P0 | [DEVICE] |
| K2.5 | ContentLoader startup | Cold launch with 499 exercises registered | No noticeable lag. Lazy `require()` thunks prevent eager loading. | P1 | [SIM] |
| K2.6 | LevelMap render | Open Learn tab with 40 lesson nodes | Smooth render. No jank on scroll. SVG paths render cleanly. | P1 | [SIM] |

### K3. Offline Behavior

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| K3.1 | Core loop offline | Airplane mode > play static exercises | Full core loop works: exercise load, play, score, XP, next exercise. | P0 | [SIM] |
| K3.2 | Offline state persistence | Play offline > earn XP > kill app > reopen (still offline) | XP and progress preserved in AsyncStorage. | P0 | [SIM] |
| K3.3 | AI coaching offline | Complete exercise offline > view AI feedback | Offline coaching templates shown (50+ pre-generated strings). No crash. | P1 | [SIM] |
| K3.4 | Sync on reconnect | Play offline > go online | Pending progress syncs to Firestore. No data loss. | P1 | [SIM] |

---

## L. Build and Environment

### L1. Build Verification

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| L1.1 | TypeScript check | `npm run typecheck` | 0 errors | P0 | [SIM] |
| L1.2 | Lint check | `npm run lint` | 0 errors (warnings acceptable) | P0 | [SIM] |
| L1.3 | Test suite | `npm run test` | All suites pass (145+). 0 failures. | P0 | [SIM] |
| L1.4 | EAS Build iOS | `eas build --platform ios --profile preview` | Build succeeds. IPA generated. Size < 100MB. | P0 | N/A |
| L1.5 | EAS Build Android | `eas build --platform android --profile preview` | Build succeeds. APK/AAB generated. Size < 80MB. | P1 | N/A |
| L1.6 | CI pipeline | Push to feature branch > check GitHub Actions | ci.yml runs: typecheck + lint + test. All pass. | P0 | N/A |

### L2. Environment Variables

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| L2.1 | Firebase connection | Launch app > check auth | Anonymous auth succeeds. Firestore reads work. | P0 | [SIM] |
| L2.2 | PostHog connection | Check DebugLogScreen | Events being sent to PostHog. | P1 | [SIM] |
| L2.3 | ElevenLabs API key | Trigger TTS | Neural voice plays (key valid). | P1 | [DEVICE] |
| L2.4 | No secrets in repo | `git log --all --full-history -- "*.env*"` | No `.env` files ever committed. | P0 | N/A |
| L2.5 | .env.example present | Check repo root | `.env.example` with placeholder keys exists for developer onboarding. | P1 | N/A |
| L2.6 | EAS secrets set | `eas secret:list` | All `EXPO_PUBLIC_*` vars set for preview environment. | P1 | N/A |

### L3. Firebase Infrastructure

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| L3.1 | Firestore rules deployed | `firebase deploy --only firestore:rules` (if not done) | Rules active. Cross-user data isolation enforced. | P0 | N/A |
| L3.2 | Firestore indexes deployed | `firebase deploy --only firestore:indexes` | 4 composite indexes active. Song filtering works without errors. | P0 | N/A |
| L3.3 | Cloud Functions deployed | `firebase functions:list` | All 9 functions listed and active. | P1 | N/A |
| L3.4 | Cloud Function test (exercise) | Trigger exercise generation via Cloud Function | Function returns valid exercise JSON. | P1 | N/A |
| L3.5 | Cloud Function test (deletion) | Delete test account via Cloud Function | All subcollections cleaned. Verified in Firestore Console. | P0 | N/A |
| L3.6 | GEMINI_API_KEY secret | `firebase functions:secrets:list` | GEMINI_API_KEY set as secret. Not in client bundle. | P1 | N/A |

---

## M. Regression Risks (Areas of Recent Change)

These areas have been modified recently and deserve extra attention during testing.

### M1. Phase 12-13 Regressions

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| M1.1 | Exercise type scoring strategies | Run `npm test -- scoringStrategies` | All scoring strategy tests pass. | P0 | [SIM] |
| M1.2 | ContentLoaderRegistry.generated.ts | Import a lesson 30 exercise | Lazy require() resolves correctly. Exercise has valid structure. | P0 | [SIM] |
| M1.3 | 7-step onboarding | Complete onboarding from scratch | All 7 steps complete without crash. Path selection and username registration work. | P0 | [SIM] |
| M1.4 | LevelMap with 40 nodes | Scroll through all 40 lessons | No rendering glitches. Path connectors draw correctly. | P0 | [SIM] |
| M1.5 | Learning paths | Select each of 5 learning paths | LevelMap filters correctly. Lesson content matches path. | P1 | [SIM] |

### M2. Known Remaining Issues

| # | Issue | Impact | Priority |
|---|-------|--------|----------|
| M2.1 | Worker teardown warning in Jest | Non-blocking. Timer leak in test runner. Tests still pass. | P2 |
| M2.2 | Cloud Functions deployment unverified | 9 functions written but deployment status unknown. Direct Gemini API fallback exists. | P1 |
| M2.3 | ~531 lint warnings | Non-blocking. CI passes. Mostly `@typescript-eslint/no-explicit-any`. | P2 |
| M2.4 | MIDI hardware untested with native module | `@motiz88/react-native-midi` installed but needs dev build for actual hardware testing. | P1 |
| M2.5 | Salamander Grand Piano samples not yet integrated | Using FluidR3 GM (132KB). Full Salamander (~12MB) would improve quality. | P2 |
| M2.6 | Node.js 20 deprecation | Firebase Functions on Node.js 20. Deprecated 2026-04-30, decommissioned 2026-10-30. | P1 |

---

## N. End-to-End Gameplay Journeys

Full user journeys that chain multiple systems together. These catch integration bugs that individual tests miss.

### N1. First-Time User Journey (Cold Start to First Exercise Complete)

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| N1.1 | Fresh install → onboarding | Delete app data (or fresh install) → launch | Onboarding screen appears. 7-step flow: Welcome, Experience Level, Equipment (MIDI/Mic/Touch), Daily Goal, Cat Selection, Username, Complete. | P0 | [SIM] |
| N1.2 | Onboarding → HomeScreen | Complete onboarding | HomeScreen shows with selected cat, greeting, "Continue Learning" pointing to Lesson 1, daily challenge card. | P0 | [SIM] |
| N1.3 | HomeScreen → first exercise | Tap "Continue Learning" or Learn tab | LevelMap shows. Lesson 1 node pulsing. Tap → ExerciseLoadingScreen → ExercisePlayer. | P0 | [SIM] |
| N1.4 | Complete first exercise → XP earned | Play through exercise → completion | CompletionModal shows score, stars, XP, gems. First-completion bonus (25 XP) applied. GemEarnPopup fires. | P0 | [SIM] |
| N1.5 | XP + gems reflected everywhere | After completing exercise, check HomeScreen, ProfileScreen, CatSwitchScreen | XP bar updated, gem balance updated, streak started (1 day). All consistent. | P0 | [SIM] |
| N1.6 | Second exercise immediately | Tap "Next" in CompletionModal | Navigates to exercise 2 of Lesson 1 via `navigation.replace`. No stale state from exercise 1. | P0 | [SIM] |

### N2. Exercise Type Walkthrough

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| N2.1 | Play → rhythm → ear training sequence | Complete one exercise of each type in sequence | All three types load, play, score, and show completion. No crashes between transitions. State resets properly between types. | P0 | [SIM] |
| N2.2 | Chord identification full flow | Navigate to lesson-04 exercise-05 (chordId type) | ChordPrompt shows. Play chord tones in any order. Order-independent scoring works. Completion shows chord-relevant feedback. | P0 | [SIM] |
| N2.3 | Call and response full flow | Navigate to lesson-04 exercise-02 (callResponse type) | CallResponsePhase: keyboard disabled during "call" phase. Salsa plays phrase. Keyboard re-enables for "response" phase. User plays back. | P0 | [SIM] |
| N2.4 | Ear training listen phase | Navigate to lesson-02 exercise-04 (earTraining type) | ListenPhaseOverlay plays audio first. User cannot play during listen phase. After listen, keyboard enables for playback. | P0 | [SIM] |
| N2.5 | Sight reading no labels | Navigate to any sightReading exercise | Note name labels hidden on keyboard and PianoRoll. User must read from notation. | P1 | [SIM] |

### N3. Free Play Session

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| N3.1 | Enter free play | Navigate to HomeScreen → "Free Play" quick action | PlayScreen loads. Keyboard visible. No exercise constraints. | P0 | [SIM] |
| N3.2 | Play notes freely | Play several notes on screen keyboard | Notes sound correctly. Key highlights on press. No scoring overlay. | P0 | [SIM] |
| N3.3 | Free play analysis | Play a C major scale pattern in free play | FreePlayAnalyzer detects key/scale. Analysis shown (if implemented in UI). | P1 | [SIM] |
| N3.4 | Input method in free play | Switch input to mic in settings → open free play | Active input badge shows "Mic". Mic captures notes. Touch keyboard still works simultaneously. | P1 | [DEVICE] |
| N3.5 | Exit free play cleanly | Press back from PlayScreen | Returns to HomeScreen. No audio stuck playing. No state corruption. | P0 | [SIM] |

### N4. Song Library Journey

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| N4.1 | Browse song library | Navigate to Songs tab or HomeScreen MusicLibrarySpotlight | SongLibraryScreen loads. Genre carousel visible. Song cards render with metadata. | P0 | [SIM] |
| N4.2 | Search songs | Type a song name in search | Results filter in real-time. Matching songs shown. | P1 | [SIM] |
| N4.3 | Play a song | Tap a song card → SongPlayerScreen | Sections listed. Tap a section → opens ExercisePlayer with song section notes. | P0 | [SIM] |
| N4.4 | Song mastery progression | Complete a song section with 70%+ → then 90%+ | Mastery tier updates: none → bronze → gold. Mastery badge updates on song card. | P0 | [SIM] |
| N4.5 | Song completion gems | Earn first mastery tier on a new song | Gem reward popup fires for mastery tier achievement. | P1 | [SIM] |

### N5. Daily Session Flow

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| N5.1 | Daily session generation | Open DailySessionScreen (HomeScreen → "Today's Practice") | Session generated with warm-up, lesson, and challenge sections. Session type badge visible (new-material/review/challenge/mixed). | P0 | [SIM] |
| N5.2 | Complete warm-up exercise | Tap warm-up section exercise | Exercise loads and is completable. Returns to DailySessionScreen with checkmark. | P0 | [SIM] |
| N5.3 | Complete daily challenge | Tap challenge from DailySessionScreen or DailyChallengeCard | Challenge exercise loads. On completion, challenge marked complete. Gem reward (10-15) awarded. | P0 | [SIM] |
| N5.4 | Daily challenge expiry | Complete today's challenge. Wait until tomorrow (or mock date). | New challenge generates. Previous one no longer claimable. No retroactive claiming. | P1 | [SIM] |

### N6. Social Challenge Journey

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| N6.1 | Send friend challenge | Social tab → Friends → tap a friend → "Challenge" | Challenge sent. Friend receives notification (if online). Challenge appears in sender's active challenges. | P1 | [SIM] |
| N6.2 | Receive and complete challenge | Open app with pending challenge notification | Challenge card shows in SocialScreen. Tap → ExercisePlayer with challenge exercise. Complete → score submitted. | P1 | [SIM] |
| N6.3 | Challenge score comparison | Both users complete the same challenge | ChallengeCard shows "Your score" vs "Their score" with correct perspective (sender/receiver). | P1 | [SIM] |

### N7. Cat Evolution Journey

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| N7.1 | Cat XP from exercises | Complete several exercises | Selected cat's XP increases. Progress bar in CatSwitchScreen updates. | P0 | [SIM] |
| N7.2 | Cat evolution trigger | Accumulate enough cat XP to reach next stage threshold | EvolutionReveal animation plays (full-screen Pokemon-style). Cat avatar updates to new stage (Baby → Teen → Adult → Master). | P0 | [SIM] |
| N7.3 | Unlock cat with gems | Earn enough gems → CatSwitchScreen → tap locked cat → Buy | BuyModal shows gem cost. Confirm purchase → gems deducted → cat unlocked. | P0 | [SIM] |
| N7.4 | Cat abilities apply | Select a cat with unlocked abilities → play an exercise | AbilityEngine applies cat-specific modifiers (e.g., wider timing window, combo shield). Effect visible in gameplay. | P1 | [SIM] |

### N8. Replay and Coaching Journey

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| N8.1 | Post-exercise coaching | Complete an exercise with score < 80% | AI coaching feedback appears in CompletionModal. 2-3 sentences, encouraging, with specific tip. | P1 | [SIM] |
| N8.2 | Replay triggered | Score < threshold on an exercise | Replay option shown. Tap → replay plays back the exercise with visual-only notes (DemoPlaybackService). | P1 | [SIM] |
| N8.3 | Skip replay | Replay starts → tap skip | Replay stops. Returns to CompletionModal. No stuck state. | P1 | [SIM] |
| N8.4 | Retry after coaching | Read coaching → tap "Try Again" | Same exercise reloads. Attempt counter increments. Previous score shown for comparison. | P0 | [SIM] |

### N9. Failure Recovery Scenarios

| # | Test Case | Steps | Expected Result | Priority | Tags |
|---|-----------|-------|-----------------|----------|------|
| N9.1 | Network loss mid-exercise | Start exercise → disable WiFi mid-play → complete | Exercise completes locally. Score saved to local store. Sync queued for when network returns. | P0 | [SIM] |
| N9.2 | App background during exercise | Start exercise → background app (home button) → foreground | Exercise paused. Resume continues from pause point. No audio stuck. | P0 | [DEVICE] |
| N9.3 | Kill app during exercise | Start exercise → force kill app → relaunch | App relaunches to HomeScreen. No crash. Progress before exercise preserved. Current exercise lost (acceptable). | P0 | [SIM] |
| N9.4 | Rapid navigation | Quickly tap between tabs, open/close exercises, switch cats | No crashes, no stuck screens, no audio glitches. | P0 | [SIM] |
| N9.5 | Long session (10+ minutes) | Play continuously for 10+ minutes | No memory leaks, no audio degradation, no slowdown. FlatList performance stable. | P1 | [DEVICE] |

---

## O. Automated UI Testing

### O1. Detox / Maestro Test Coverage

Current Detox suites: 15 (scaffolded). For merge readiness, the following automated flows should pass:

| # | Test Flow | Tool | Status | Priority |
|---|-----------|------|--------|----------|
| O1.1 | Onboarding complete flow | Detox | Scaffolded | P1 |
| O1.2 | Exercise load and render | Detox | Scaffolded | P0 |
| O1.3 | Tab navigation (Home/Learn/Social/Profile) | Detox | Scaffolded | P0 |
| O1.4 | LevelMap lesson tap → exercise start | Detox | Scaffolded | P1 |
| O1.5 | ProfileScreen settings access | Detox | Scaffolded | P1 |
| O1.6 | Song library browse and tap | Detox | New | P1 |
| O1.7 | Free play keyboard interaction | Detox | New | P1 |
| O1.8 | Cat gallery browse and switch | Detox | New | P1 |

### O2. Visual Regression Testing

| # | Test Case | Method | Priority |
|---|-----------|--------|----------|
| O2.1 | Screenshot comparison of all tabs | Detox screenshot capture → manual comparison | P2 |
| O2.2 | Dark mode consistency | Verify all screens use design tokens (not hardcoded colors) | P2 |
| O2.3 | Keyboard layout at different screen sizes | Test on iPhone SE, iPhone 15 Pro, iPad | P2 |
| O2.4 | PianoRoll note rendering | Screenshot of PianoRoll with various note densities | P2 |

### O3. UX Regression Checks

| # | Test Case | Steps | Expected Result | Priority |
|---|-----------|-------|-----------------|----------|
| O3.1 | Consistent navigation patterns | Check all "Back" buttons return to expected screen | No dead-end screens. No circular navigation. | P1 |
| O3.2 | Loading states | Trigger slow network (throttle) → open song library, AI exercise | Loading spinners/skeletons shown. No blank screens. | P1 |
| O3.3 | Error states | Trigger network errors → check error handling screens | User-friendly error messages. Retry options where appropriate. | P1 |
| O3.4 | Touch target sizes | Audit all interactive elements | Minimum 44x44pt touch targets per Apple HIG. | P2 |
| O3.5 | Font scaling | Enable Dynamic Type (large text) in iOS Settings → open app | Text doesn't overflow containers. Key information still readable. | P2 |

---

## Execution Checklist

### Pre-Merge (P0 only)

```
[ ] L1.1  npm run typecheck passes (0 errors)
[ ] L1.2  npm run lint passes (0 errors)
[ ] L1.3  npm run test passes (all suites, 0 failures)
[ ] A1.1  Static exercise loads and renders
[ ] A2.1  AI-generated exercise loads and renders
[ ] A3.1  Standard exercise scoring works
[ ] A3.9  All 6 exercise type scores in 0-100 range
[ ] A4.1  Perfect score awards 3 stars
[ ] A4.3  Failing score shows retry
[ ] A5.1  XP earned on completion
[ ] A5.6  XP persists on restart
[ ] A6.1  Exercise completion navigates to next
[ ] A6.4  Retry on fail works
[ ] A7.1  Pause stops playback
[ ] A7.2  Resume continues from pause point
[ ] A10.1 Combo counter works
[ ] A10.6 Feedback text shows
[ ] D1.1  LevelMap renders 40 lessons
[ ] D1.6  Tap current lesson starts exercise
[ ] D2.1  Lesson completion fires
[ ] D3.1  Daily challenge generates
[ ] D3.3  Daily challenge completable
[ ] D4.1  Cat evolution stages display
[ ] D5.1  Gems earned from exercise
[ ] D5.4  Gems spendable on cat
[ ] F1.1  Song library loads
[ ] G1.1  Anonymous sign-in works
[ ] G2.1  Email sign-up works
[ ] G8.1  Account deletion works
[ ] I1.1  All tabs accessible
[ ] I3.1  Onboarding 7-step flow completes
[ ] K3.1  Core loop works offline
```

### Pre-Build (P0 + P1)

```
[ ] All P0 items above
[ ] L1.4  EAS Build iOS succeeds
[ ] L3.1  Firestore rules deployed
[ ] L3.2  Firestore indexes deployed
[ ] L2.4  No secrets in git history
[ ] B1.2  Multi-touch keyboard works (device)
[ ] B3.2  Monophonic mic detection (device)
[ ] C1.1  FluidR3 samples play on device
[ ] C1.6  Audio latency < 20ms (device)
[ ] C2.1  Metronome audible (device)
[ ] K1.1  10-minute stability test (device)
[ ] K2.1  Cold start < 3s (device)
```

### Pre-Beta (P0 + P1 + select P2)

```
[ ] All P0 and P1 items
[ ] E1.1-E6.4  Full social feature verification
[ ] F1-F3  Full song library verification
[ ] G3.1  Google Sign-In (device)
[ ] G4.1  Apple Sign-In (device)
[ ] G6.1-G6.4  Cross-device sync
[ ] K1.2-K1.5  Background/foreground/rapid nav/idle
```

---

## Test Environment Requirements

| Environment | Purpose |
|-------------|---------|
| iOS Simulator (iPhone 15 Pro / 17 Pro) | All `[SIM]` tests |
| Physical iPhone (13 Pro or newer) | All `[DEVICE]` tests |
| USB MIDI keyboard + Lightning/USB-C adapter | All `[MIDI]` tests |
| Acoustic piano or keyboard (for mic tests) | B3.x tests |
| Second Firebase account | Social feature tests, data isolation tests |
| Quiet room | Mic detection tests |
| WiFi toggle access | Offline/network failure tests |

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | |
| QA | | | |
| Product | | | |

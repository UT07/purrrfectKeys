# Exercise Types Testing Guide

## Overview

Purrrfect Keys supports 19 exercise types across 4 categories. This guide provides comprehensive manual testing procedures for validating scoring, playback, and visual feedback for each type.

**Exercise Type Categories:**
- **Classic (6 types)** — Implemented, production-ready
  - play, rhythm, earTraining, chordId, sightReading, callResponse
- **Interaction (5 types)** — Designed, not yet implemented
  - fillInTheBlank, spotTheError, intervalQuiz, chordBuilder, keySignatureId
- **Gamified (5 types)** — Designed, not yet implemented
  - bossBattle, duet, speedRun, endlessMode, teacherChallenge
- **Creative (1 type)** — Designed, not yet implemented
  - improvisation

---

# PART 1: PRODUCTION-IMPLEMENTED TYPES (ClassicExerciseType)

## Type 1: Play (Standard Note Playback)

**Status:** ✅ Production-ready

**What it tests:** Basic note matching with standard timing and accuracy scoring. This is the baseline exercise type used when `exercise.type` is undefined or explicitly set to 'play'.

### Quick Start

**Fastest path to test Play exercises:**
1. Install KeySense on physical device or simulator
2. Navigate to Lesson 1 (Getting Started) → Exercise 1 (Find Middle C)
3. Play the displayed notes using on-screen keyboard or MIDI keyboard
4. Verify score calculation: timing within ±50ms = perfect, accuracy on correct MIDI notes

### Current Implementation Status

- **Scoring engine:** `scoreExercise()` in ExerciseValidator.ts (lines 145–180)
- **Timing tolerance:** Exercise-specific via `scoring.timingToleranceMs` (default 50ms) and `timingGracePeriodMs` (default 150ms)
- **Accuracy calculation:** Matches expected notes to played notes within ±1.5 beats (timing window)
- **Duration scoring:** 100% if note held 70-130% of expected duration, 0% if 3x+ expected or not held
- **Timing curve:** 100% perfect (≤25ms), linear to 70% good (25-75ms), linear to 40% ok (75-150ms), exponential decay after 150ms
- **Visual feedback:** PERFECT/GOOD/OK/EARLY/LATE/MISSED labels in real-time

### Testing Options (Ranked by Practicality)

#### Option 1: Physical Device + On-Screen Keyboard (Easiest, No Hardware)
1. Build KeySense for iOS simulator or physical device
2. Launch Exercise 1 (Find Middle C) — already has 8 simple notes
3. Tap on-screen keyboard notes in sequence
4. Verify each note shows colored feedback (green = perfect, yellow = good, red = miss)
5. Check final score calculation: should see breakdown of timing/accuracy/completeness
6. **Pros:** No MIDI hardware needed, works in simulator
7. **Cons:** Only tests touch latency (~100ms compensation), not MIDI

#### Option 2: Physical Device + USB MIDI Keyboard (Best for Real Testing)
1. Connect USB MIDI keyboard to iPad via USB-C (or iPhone + Camera Connection Kit adapter)
2. Recommended keyboards: Akai MPK Mini ($50-60), M-Audio Keystation Mini ($40-50)
3. Launch Exercise 1
4. Play notes on connected MIDI keyboard
5. Verify latency: should see visual feedback within 20-50ms of key press
6. Check score: MIDI input should be treated as MIDI class (0ms compensation) for timing
7. **Pros:** Real hardware latency testing, most realistic scenario
8. **Cons:** Requires hardware purchase

#### Option 3: Simulator + MIDI Wrench Virtual Keyboard (Practical, No Hardware)
1. Install MIDI Wrench (free, App Store) on same device as simulator
2. Configure MIDI Wrench to output to `IAC Driver Bus 1` (macOS)
3. Run simulator alongside MIDI Wrench in Split View (iPad)
4. Open Exercise 1 in simulator
5. Tap MIDI Wrench keyboard to send virtual notes
6. Verify notes received and scored in Exercise Player
7. **Pros:** Free, works without USB keyboard, can monitor MIDI flow
8. **Cons:** Only practical on iPad, virtual keyboard latency not representative

### Type-Specific Setup Instructions

**For standard Play exercises:**
1. Verify `exercise.type === 'play'` (or undefined for backward compatibility)
2. Verify `exercise.scoring.timingToleranceMs` is set (default 50ms for difficulty 1-2, 25-30ms for difficulty 4-5)
3. Verify `exercise.notes` contains valid MIDI notes (21-108) with startBeat and durationBeats
4. Verify `exercise.display.showPianoRoll === true` (standard for all lessons)
5. Optional: Set `exercise.hands` to 'right'/'left'/'both' to filter keyboard display

**Scoring configuration to test:**
```json
"scoring": {
  "timingToleranceMs": 50,
  "timingGracePeriodMs": 150,
  "passingScore": 70,
  "starThresholds": [70, 85, 95]
}
```

### Recommended Testing Workflow

| Phase | Input Method | Target Score | Notes |
|-------|-------------|--------------|-------|
| Baseline | On-screen | 70%+ | Test basic note matching, timing curve |
| Accuracy | On-screen | 80%+ | Rapid taps to verify extra-note penalty |
| Timing | On-screen | 85%+ | Play notes early/late to verify timing feedback |
| Duration | On-screen | 90%+ | Hold notes 70-130% of expected length |
| MIDI Integration | USB keyboard | 85%+ | Verify MIDI latency compensation (0ms) |
| Combo Testing | USB keyboard | 95%+ | Rapid correct notes to test combo escalation |

### Troubleshooting

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Score is 0% even though notes played | Notes played outside exercise.notes list | Check ExercisePlayer piano roll — make sure note range matches exercise |
| Timing always shows as "LATE" when playing on time | Timestamp normalization not applied | Verify `useExercisePlayback` is converting epoch timestamps to relative beat time |
| Extra notes heavily penalize score even for single tap | Extra note detection too aggressive | Check ExerciseValidator.validateNote — should only penalize truly unexpected notes |
| On-screen keyboard doesn't respond | Touch input latency too high or keyboard not rendering | Check device performance, restart app, verify Keyboard component is in view hierarchy |
| MIDI notes don't appear in score | MIDI input not connected or filtered | Verify MidiInput is subscribed in useExercisePlayback, check MIDI channel filter |
| Duration score always 0% | Notes never held long enough | For short exercises, verify `durationBeats` isn't too strict (use 0.5-1.0 for taps) |

---

## Type 2: Rhythm (Pitch-Agnostic Note Matching)

**Status:** ✅ Production-ready

**What it tests:** Timing and note count accuracy without regard to pitch. User plays any notes on the correct beats, and accuracy scores as if all pitches were correct.

### Quick Start

**Fastest path to test Rhythm exercises:**
1. Navigate to any Rhythm exercise (Lesson 11 tier, or AI-generated)
2. Play any keys on the keyboard at the correct beat positions
3. Verify score: accuracy shows 100% regardless of pitch played (only timing matters)
4. Compare with Play exercise — same number of notes, same timing, but Rhythm shows higher accuracy

### Current Implementation Status

- **Scoring engine:** `scoreRhythmExercise()` in scoringStrategies.ts (lines 95–121)
- **Key difference:** Accuracy calculation ignores pitch — only checks:
  - Correct number of notes played
  - Notes played within timing window (±1.5 beats)
- **Timing tolerance:** Same as Play exercises (timingToleranceMs, timingGracePeriodMs)
- **Accuracy score:** Always 100% if all notes are on time, regardless of which keys played
- **Timing score:** Same curve as Play (perfect/good/ok/early/late)
- **Test coverage:** `src/core/exercises/__tests__/scoringStrategies.test.ts` lines 68–141

### Testing Options (Ranked by Practicality)

#### Option 1: On-Screen Keyboard — Rapid Tapping (Easiest)
1. Open a Rhythm exercise (e.g., Lesson 11, Exercise 1 if exists)
2. Tap the on-screen keyboard rapidly, hitting any 5 notes on correct beats
3. Verify accuracy score is 100% (even though you played wrong notes)
4. Verify timing score reflects actual timing accuracy
5. Compare with a Play exercise of the same measure — Rhythm should show higher accuracy

#### Option 2: MIDI Keyboard — White Keys Only (No Pitch Thinking)
1. Play the same Rhythm exercise on USB MIDI keyboard
2. Play only white keys (C-D-E-F-G-A-B), any octave
3. Verify accuracy 100%, timing varies with actual key press timing
4. Play same measure on black keys — should still get 100% accuracy

#### Option 3: Comparative Testing (Play vs Rhythm)
1. Create two identical exercises, one with type 'play', one with type 'rhythm'
2. Play both with deliberate pitch errors (e.g., play D instead of C)
3. In Play exercise: see accuracy <100% due to wrong pitch
4. In Rhythm exercise: see accuracy 100% despite wrong pitch
5. Timing score should be identical between both

### Type-Specific Setup Instructions

**For Rhythm exercises:**
1. Verify `exercise.type === 'rhythm'`
2. Verify exercise has 4-16 notes (typical rhythm pattern)
3. Verify `exercise.metadata.skills` includes 'rhythm' or similar
4. Set `scoring.timingToleranceMs` to 50-75ms (rhythm is all about beat timing)
5. Set `scoring.passingScore` to 65-70% (easier to pass, all accuracy is 100%)

**Key configuration difference from Play:**
- Rhythm exercises MUST set timingToleranceMs higher (50-75ms) because accuracy is pitch-free
- Recommend `passingScore: 65%` instead of 70% (rhythm is harder because of tempo precision)
- All other fields identical to Play

### Recommended Testing Workflow

| Phase | Input Method | Test Scenario | Expected Result |
|-------|-------------|---------------|-----------------|
| Baseline | On-screen | Play all correct notes, correct timing | Score 85%+ (timing near perfect, 100% accuracy) |
| Wrong pitch | On-screen | Play wrong notes, correct timing | Score 85%+ (same as above — pitch ignored) |
| Wrong timing | On-screen | Play correct rhythm count, wrong beat | Score 40-60% (timing penalized, accuracy still 100%) |
| Too many notes | On-screen | Play rhythm + extra notes | Score <70% (completeness/extra penalty) |
| MIDI test | USB keyboard | Play white keys only, correct timing | Score 85%+ (pitch irrelevant, all notes count) |
| Tempo variation | USB keyboard | Play faster/slower than metronome | Score 50%+ (timing variance shows clearly) |

### Troubleshooting

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Accuracy is not 100% on Rhythm exercise | Timing window too narrow, or pitch being scored | Check scoreRhythmExercise() — ensure no pitch.isCorrectPitch check |
| Rhythm exercise scoring identically to Play exercise | Scoring routing issue, wrong scorer called | Verify scoreExerciseByType dispatcher routes 'rhythm' → scoreRhythmExercise |
| Timing tolerance too strict for Rhythm | timingToleranceMs set too low | Increase to 75-100ms for Rhythm exercises (users count beats, not absolute time) |
| Extra notes penalize score more on Rhythm than Play | Same extraNotes weight, but rhythm has 100% accuracy | Rhythm exercises should be shorter (fewer notes) to avoid extra-note noise |

---

## Type 3: Ear Training (Standard Scoring, Visual-Only Training Mode)

**Status:** ✅ Production-ready (pass-through scorer)

**What it tests:** Pitch listening and identification. User hears a note or interval and plays it back. Scoring identical to Play exercises, but presentation emphasizes listening.

### Quick Start

**Fastest path to test Ear Training exercises:**
1. Navigate to Ear Training exercise (e.g., Lesson 3, Exercise 4)
2. Listen to the played note/interval (demo playback before exercise starts)
3. Play the note back on keyboard (any octave)
4. Verify score: uses standard Play scoring (pitch must match, timing within tolerance)
5. Compare with Play exercise — same scoring logic, different presentation

### Current Implementation Status

- **Scoring engine:** Pass-through to `scoreExercise()` (standard Play scoring)
- **Test coverage:** `src/core/exercises/__tests__/scoringStrategies.test.ts` lines 223–241
- **Difference from Play:**
  - Exercise.notes includes the reference note that user hears first
  - Visual feedback optional (can hide PianoRoll to force listening)
  - Playback shows demo first (user hears correct pitch before playing)
- **Accuracy calculation:** Same as Play (correct MIDI note, within timing window)

### Testing Options (Ranked by Practicality)

#### Option 1: On-Screen Keyboard + Metronome (Training Mode)
1. Open Ear Training exercise (Exercise 4 if available, or any with `type: 'earTraining'`)
2. Exercise plays demo (user hears the note)
3. Mute visual feedback (disable `display.showPianoRoll`)
4. Play the note on-screen keyboard by ear only
5. Verify score: feedback shows if pitch is correct, regardless of visual cues

#### Option 2: MIDI Keyboard + Eyes Closed (Realistic Test)
1. Play Ear Training exercise on USB MIDI keyboard
2. Close eyes or cover keyboard screen
3. Rely only on listening to identify the note
4. Play the note (any octave is acceptable)
5. Verify score is correct even without looking

#### Option 3: Comparative Test (Visibility Toggle)
1. Open same Ear Training exercise twice (in two tabs if possible)
2. Run Test A with `display.showPianoRoll: true` (full visual feedback)
3. Run Test B with `display.showPianoRoll: false` (listening only)
4. Score should be identical regardless of visual setting
5. User should feel more challenged in Test B

### Type-Specific Setup Instructions

**For Ear Training exercises:**
1. Verify `exercise.type === 'earTraining'`
2. Verify exercise starts with a demo playback (use `useExercisePlayback.demoPlayback()` before countdown)
3. Recommend `display.showPianoRoll: false` (force listening)
4. Recommend `display.showNoteNames: false` (don't reveal the answer)
5. Set `display.showFingerNumbers: true` if hand position matters (e.g., finding the note on left hand)

**Key difference from Play:**
- Optional: Hide visual cues to emphasize listening
- All scoring parameters identical to Play exercises
- Demo playback MUST happen before user starts playing

### Recommended Testing Workflow

| Phase | Visual Setting | Test Scenario | Expected Result |
|-------|----------------|---------------|-----------------|
| With cues | PianoRoll on | Play heard note | Score 85%+ (standard scoring) |
| Listening only | PianoRoll off | Play heard note | Score 85%+ (same result, harder) |
| Wrong pitch | PianoRoll off | Play different note | Score <70% (pitch wrong, even without visual feedback) |
| Octave variation | PianoRoll off | Play same note, different octave | Score 100% (octaves count as same pitch class) |
| Timing accuracy | PianoRoll off | Play correct pitch, vary timing | Timing score varies, accuracy 100% |

### Troubleshooting

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Score different from Play exercise with same notes | Incorrect scorer dispatch | Verify scoreExerciseByType routes 'earTraining' → scoreExercise (pass-through) |
| User can't identify notes by ear | Exercise notes too close in pitch | Use larger intervals (minor 3rd or wider); avoid chromatic sequences |
| Visual feedback still visible even with showPianoRoll:false | CSS bug or component override | Check ExercisePlayer — ensure PianoRoll component respects display.showPianoRoll |
| Demo playback not playing before exercise | Playback setup incomplete | Verify `demoPlayback.playExercise()` is called before countdown |
| Score perfect even when playing wrong octave | Octave normalization too aggressive | Check NoteScore.isCorrectPitch — should use note % 12 (pitch class) not absolute note |

---

## Type 4: Chord ID (Wider Timing Tolerance)

**Status:** ✅ Production-ready

**What it tests:** Chord recognition and construction. User plays multiple notes within a wider timing window (100ms instead of 30ms standard), and all notes are treated as simultaneous for scoring.

### Quick Start

**Fastest path to test Chord ID exercises:**
1. Navigate to Chord ID exercise (Lesson 9, Exercise 1)
2. Play a simple 3-note chord on on-screen or MIDI keyboard
3. Play the notes sequentially (not simultaneously) — verify all 3 count if within 100ms window
4. Check score: 100% if all notes within 100ms, even if played arpeggio-style (one at a time)
5. Compare with Play exercise — same notes played as arpeggio would score much lower in Play mode

### Current Implementation Status

- **Scoring engine:** `scoreChordExercise()` in scoringStrategies.ts (lines 143–221)
- **Key difference:** Wider timing window (100ms instead of 30ms for standard)
- **Simultaneous matching:** All notes played within 100ms window count as simultaneous chord
- **Accuracy calculation:** 
  - All expected notes played: 100%
  - Partial match (some notes missing): <100% based on completeness
  - Wrong notes mixed in: penalized via extraNotes
- **Test coverage:** `src/core/exercises/__tests__/scoringStrategies.test.ts` lines 143–221

### Testing Options (Ranked by Practicality)

#### Option 1: On-Screen Keyboard — Sequential Tapping (Easiest)
1. Open Chord ID exercise (Lesson 9, Exercise 1 if exists)
2. Exercise requires playing C-E-G chord
3. Tap C, then E, then G in quick succession (within ~100ms total)
4. Verify all 3 notes count (100% completeness, even though sequential)
5. Verify score higher than if you played same notes in Play exercise

#### Option 2: MIDI Keyboard — Arpeggio Playing (Most Realistic)
1. Play chord on USB MIDI keyboard as an arpeggio (rapid single-note sequence)
2. Play C → E → G in <100ms (should be audibly "fast arpeggio")
3. Verify all notes count as correct
4. Vary timing: play with 150ms gaps between notes (should fail to count all)
5. Verify this fails in Play exercise but passes in Chord ID (due to wider window)

#### Option 3: Timing Window Validation (Systematic)
1. Open Chord ID exercise with 3-note chord (C-E-G)
2. Play note 1 (C) at time 0ms
3. Play note 2 (E) at time +50ms (within window)
4. Play note 3 (G) at time +100ms (at edge of window)
5. Verify all 3 count — score should be 100%
6. Repeat with note 3 at +150ms (outside window) — should only score E as simultaneous with C

### Type-Specific Setup Instructions

**For Chord ID exercises:**
1. Verify `exercise.type === 'chordId'`
2. Verify exercise contains 3-4 notes maximum (chord vocabulary)
3. Verify `exercise.metadata.skills` includes 'chords' or chord name (e.g., 'c-major', 'g-dominant-7')
4. Set `scoring.timingToleranceMs: 100` (wider than standard 30-50ms)
5. Set `scoring.timingGracePeriodMs: 200` (also wider for grace period)
6. Recommend starting with simple triads (3 notes), avoid extended chords (>4 notes)

**Key configuration difference from Play:**
- timingToleranceMs: 100ms (vs 50ms standard)
- timingGracePeriodMs: 200ms (vs 150ms standard)
- Limited to 3-4 note chords (not arbitrary melodies)

### Recommended Testing Workflow

| Phase | Input Method | Test Scenario | Expected Result |
|-------|-------------|---------------|-----------------|
| Sequential tapping | On-screen | Tap C-E-G within 100ms total | Score 90%+ (all notes count) |
| Arpeggio | MIDI keyboard | Play C→E→G as quick arpeggio | Score 90%+ (timing window allows arpeggio) |
| Partial chord | On-screen | Play only C-E (missing G) | Score 60-70% (missing note penalty) |
| Extra notes | On-screen | Play C-E-G-C (extra C) | Score <80% (extra note penalty) |
| Slow arpeggio | MIDI keyboard | Play C-E-G with 150ms gaps | Score <70% (notes outside 100ms window) |
| Timing tolerance limit | MIDI keyboard | Play at exactly 100ms window boundary | Score should transition (pass at 98ms, fail at 102ms) |

### Troubleshooting

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Chord doesn't score all notes even within window | scoreChordExercise not called, or window hardcoded wrong | Verify scoreExerciseByType routes 'chordId' → scoreChordExercise; check 100ms constant |
| Chord ID scores same as Play for sequential notes | Wider tolerance not applied | Ensure scoreChordExercise uses 100ms, not scoreExercise's 50ms default |
| Arpeggio still fails even within timing window | Timing window measured from first note only, not from note start to last note end | Check algorithm — should use `max(playedTimestamps) - min(playedTimestamps) < 100ms` |
| Extra notes heavily penalized in Chord ID | Penalty weight identical to Play | Consider reducing extraNotes weight for Chord ID (chords are patterns, extra notes less important) |
| Wide timing window makes exercise too easy | 100ms window too generous for user's level | Consider reducing to 75ms for advanced chords, or add difficulty level scaling |

---

## Type 5: Sight Reading (Standard Scoring, Music Notation Display)

**Status:** ✅ Production-ready (pass-through scorer)

**What it tests:** Reading sheet music and playing the notes. User sees staff notation and must play the displayed notes. Scoring identical to Play, but uses staff notation display instead of piano roll.

### Quick Start

**Fastest path to test Sight Reading exercises:**
1. Navigate to Sight Reading exercise (Lesson 13, Exercise 1)
2. Verify `display.showStaffNotation: true` (staff notation visible)
3. Read the notes on the staff
4. Play the notes on on-screen or MIDI keyboard
5. Verify score: uses standard Play scoring, feedback from staff notation reading

### Current Implementation Status

- **Scoring engine:** Pass-through to `scoreExercise()` (standard Play scoring)
- **Test coverage:** `src/core/exercises/__tests__/scoringStrategies.test.ts` lines 223–241
- **Difference from Play:**
  - `display.showStaffNotation: true` (staff notation rendered)
  - `display.showFingerNumbers: false` or optional (reading relies on staff position, not fingering)
  - `display.showPianoRoll: false` or secondary (primary input is staff notation)
- **Accuracy calculation:** Same as Play (correct MIDI note, within timing window)

### Testing Options (Ranked by Practicality)

#### Option 1: On-Screen Keyboard + Staff Notation (Standard Test)
1. Open Sight Reading exercise
2. Verify staff notation displays above keyboard
3. Read note positions on staff (treble clef, each line/space)
4. Play the notes on on-screen keyboard
5. Verify score: same as Play exercises, but note identification comes from staff not piano roll

#### Option 2: MIDI Keyboard + Staff Only (Realistic Training)
1. Play Sight Reading exercise on USB MIDI keyboard
2. Disable piano roll (PianoRoll display.showPianoRoll: false)
3. Rely only on staff notation to identify notes
4. Play the notes from memory/staff reading
5. Verify score is correct (should match staff reading skill)

#### Option 3: Comparative Test (Staff vs Piano Roll)
1. Create two identical exercises, one with staff notation, one with piano roll
2. Play both with same accuracy
3. Verify score identical regardless of notation style
4. Timing and pitch should be independent of visual representation

### Type-Specific Setup Instructions

**For Sight Reading exercises:**
1. Verify `exercise.type === 'sightReading'`
2. Verify `display.showStaffNotation: true` (staff notation must be visible)
3. Set `display.showPianoRoll: false` (or secondary, encourage reading from staff)
4. Set `display.showFingerNumbers: false` (reading relies on staff position)
5. Recommend `notes` property contains 4-16 notes (typical reading exercise length)
6. All scoring parameters identical to Play exercises

**Key difference from Play:**
- showStaffNotation: true (required)
- showPianoRoll: false or secondary (primary input is staff)
- All scoring identical to Play

### Recommended Testing Workflow

| Phase | Visual Setting | Test Scenario | Expected Result |
|-------|----------------|---------------|-----------------|
| With staff | Staff on | Read and play notes | Score 85%+ (standard scoring) |
| Staff only | PianoRoll off | Read staff, play from memory | Score 80%+ (relies on reading accuracy) |
| Wrong notes | Staff on | Play different notes than shown | Score <70% (pitch error shown clearly) |
| Timing from staff | Staff on | Play correct notes, timing varies | Timing score varies, accuracy 100% |
| Transposition test | Staff on | Play octave higher/lower | Score 0% (pitch class doesn't match) |

### Troubleshooting

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Score different from Play exercise | Incorrect scorer dispatch | Verify scoreExerciseByType routes 'sightReading' → scoreExercise (pass-through) |
| Staff notation not rendering | Component not imported or display.showStaffNotation not set | Check ExercisePlayer — ensure StaffNotation component is rendered when display.showStaffNotation === true |
| User can't read notes from staff | Exercise too difficult or staff rendering unclear | Reduce exercise length, use simpler note ranges (middle staff only) |
| Piano roll still visible even with showPianoRoll:false | CSS override or component bug | Ensure PianoRoll component respects display.showPianoRoll === false |
| Transposition accepted (octave too high/low) | Octave normalization issue | Sight reading should NOT normalize octaves — verify isCorrectPitch uses absolute note, not pitch class |

---

## Type 6: Call & Response (Standard Scoring, Interactive Turn-Taking)

**Status:** ✅ Production-ready (pass-through scorer)

**What it tests:** Interactive musical dialogue. App plays a phrase, user listens and plays back a response. Scoring identical to Play, but emphasizes call-and-response structure with interactive feedback.

### Quick Start

**Fastest path to test Call & Response exercises:**
1. Navigate to Call & Response exercise (Lesson 15, Exercise 1)
2. Listen to the "call" (app plays a phrase)
3. After the call finishes, play your "response" (user plays similar or varied phrase)
4. Verify score: uses standard Play scoring, feedback indicates response accuracy
5. Compare structure with Play — same notes, but presented as interactive dialogue

### Current Implementation Status

- **Scoring engine:** Pass-through to `scoreExercise()` (standard Play scoring)
- **Test coverage:** `src/core/exercises/__tests__/scoringStrategies.test.ts` lines 223–241
- **Difference from Play:**
  - Exercise has two parts: `exercise.notes` (call) + response section (user plays)
  - Demo playback includes the "call" first, then waits for user response
  - Playback timing has delay/pause between call and response
- **Accuracy calculation:** Same as Play (correct MIDI note, within timing window)

### Testing Options (Ranked by Practicality)

#### Option 1: On-Screen Keyboard + Demo (Standard Test)
1. Open Call & Response exercise
2. Listen to app play the "call" (first phrase)
3. After call finishes and countdown ends, play your "response" (user plays back or variation)
4. Verify score: calculated on response accuracy, not call reproduction
5. Verify feedback includes comparison with expected response

#### Option 2: MIDI Keyboard + Two-Part Interaction (Realistic)
1. Play Call & Response exercise on USB MIDI keyboard
2. Listen to call (app plays)
3. Play response by ear or from notation
4. Compare your response with expected response (shown in feedback)
5. Verify timing allows adequate pause between call and response phases

#### Option 3: Comparative Test (Call & Response vs Play)
1. Create identical exercise content, one as 'play', one as 'callResponse'
2. For callResponse: only response phrase counts for scoring
3. Verify Play exercise scores the full phrase, callResponse scores only response part
4. Timing tolerance and accuracy calculation should be identical

### Type-Specific Setup Instructions

**For Call & Response exercises:**
1. Verify `exercise.type === 'callResponse'`
2. Verify exercise notes are split: call (first half) + response (second half)
3. Set `display.showPianoRoll: true` (show response notes during user's turn)
4. Recommend `countIn: 4` (pause between call and response)
5. Recommend `metronomeEnabled: true` (helps user stay in time)
6. All scoring parameters identical to Play exercises

**Key difference from Play:**
- Structure: Call plays first, then user responds
- Timing: Built-in pause between call and response
- All scoring identical to Play (response notes scored as Play exercise)

### Recommended Testing Workflow

| Phase | Input Method | Test Scenario | Expected Result |
|-------|-------------|---------------|-----------------|
| Listen only | N/A | Hear call, don't respond | No score (required to play response) |
| Call + response | On-screen | Hear call, play response | Score 85%+ (response accuracy) |
| Varied response | MIDI keyboard | Hear call, play different notes in same pattern | Score depends on expected response |
| Timing after pause | MIDI keyboard | Hear call, 2-4 beat pause, play response | Score 80%+ (pause shouldn't affect response timing) |
| Early response | MIDI keyboard | Start playing during call | Score <70% (response started too early) |
| Late response | MIDI keyboard | Start playing after large pause | Score timing penalty (late response) |

### Troubleshooting

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| Score different from Play exercise | Incorrect scorer dispatch | Verify scoreExerciseByType routes 'callResponse' → scoreExercise (pass-through) |
| User starts playing during the call | Timing gate not implemented | Implement delay/lock until call finishes playing (useExercisePlayback should enforce this) |
| Response notes don't show in feedback | Only call notes rendered, response invisible | Check ExercisePlayer — ensure both call and response notes visible in PianoRoll |
| Pause between call and response too short | countIn or metronome timing wrong | Increase countIn to 6-8 beats; ensure metronome plays during pause |
| User confused about which notes are call vs response | Visual distinction not clear | Highlight response notes differently (different color on staff/keyboard) |
| Score includes call accuracy | Call notes shouldn't be scored | Verify scoring only includes response notes; call is demo, not tested |

---

# PART 2: DESIGNED BUT NOT YET IMPLEMENTED (InteractionExerciseType)

## Type 7: Fill in the Blank

**Status:** 🔄 Designed, not implemented | ConfigType: `FillInTheBlankConfig`

**What it tests:** Melodic completion. User sees a melody with gaps and must fill in the missing notes.

**Configuration:**
```typescript
interface FillInTheBlankConfig {
  type: 'fillInTheBlank';
  blankNoteIndices: number[];          // Which notes are blanks [2, 5, 8]
  playReferenceFirst: boolean;         // Play full melody as reference?
}
```

**Testing approach (when implemented):**
1. Verify `exercise.typeConfig.blankNoteIndices` specifies which notes are missing
2. Play non-blank notes automatically (or user plays them)
3. Score user-filled notes against expected notes
4. Timing window based on beat position, not absolute time

---

## Type 8: Spot the Error

**Status:** 🔄 Designed, not implemented | ConfigType: `SpotTheErrorConfig`

**What it tests:** Error detection. User hears a melody with one intentional wrong note and must identify which note is wrong.

**Configuration:**
```typescript
interface SpotTheErrorConfig {
  type: 'spotTheError';
  errorNoteIndex: number;              // Which note is intentionally wrong
  errorNote: number;                   // The wrong MIDI note played
  choices: number[];                   // 4 note choices to select from
}
```

**Testing approach (when implemented):**
1. Verify `exercise.typeConfig.errorNoteIndex` points to the wrong note
2. Play the melody (with the intentional error)
3. User selects correct note from `choices` array
4. Score: 100% if correct choice, 0% if wrong
5. Optional: Can replay and listen multiple times

---

## Type 9: Interval Quiz

**Status:** 🔄 Designed, not implemented | ConfigType: `IntervalQuizConfig`

**What it tests:** Interval identification or construction.

**Configuration:**
```typescript
interface IntervalQuizConfig {
  type: 'intervalQuiz';
  mode: 'identify' | 'play';           // Hear interval or play interval
  rootNote: number;                    // Starting note (e.g., 60 = C4)
  intervalName: string;                // 'minor3rd', 'perfect5th', etc
  semitones: number;                   // Interval size in semitones
  choices?: string[];                  // For identify mode
}
```

**Testing approach (when implemented):**
1. For 'identify' mode: Listen to interval, select name from choices
2. For 'play' mode: See interval name, play root + second note
3. Score: 100% if correct interval, 0% if wrong
4. Timing less critical (interval is harmonic, not rhythmic)

---

## Type 10: Chord Builder

**Status:** 🔄 Designed, not implemented | ConfigType: `ChordBuilderConfig`

**What it tests:** Chord construction from root note.

**Configuration:**
```typescript
interface ChordBuilderConfig {
  type: 'chordBuilder';
  rootNote: number;                    // Root note (e.g., 60 = C)
  chordLabel: string;                  // "Cm7", "Dmaj", etc
  expectedNotes: number[];             // [60, 63, 67] = Cm triad
}
```

**Testing approach (when implemented):**
1. Given root note and chord label, construct the chord
2. Play root + chord tones in any octave, any order
3. Score: 100% if all notes correct, partial credit for partial chords
4. Similar to Chord ID but with visible chord label (training aid)

---

## Type 11: Key Signature ID

**Status:** 🔄 Designed, not implemented | ConfigType: `KeySignatureIdConfig`

**What it tests:** Key identification or scale playing.

**Configuration:**
```typescript
interface KeySignatureIdConfig {
  type: 'keySignatureId';
  mode: 'identify' | 'play';           // Hear key or play scale
  correctKey: string;                  // "G major", "D minor"
  choices?: string[];                  // For identify mode
}
```

**Testing approach (when implemented):**
1. For 'identify' mode: Hear passage in a key, select key from choices
2. For 'play' mode: See key signature, play the scale
3. Score: 100% if correct key/scale, 0% if wrong
4. Timing less critical (key identification is harmonic)

---

# PART 3: DESIGNED BUT NOT YET IMPLEMENTED (GamifiedExerciseType)

## Type 12: Boss Battle

**Status:** 🔄 Designed, not implemented | ConfigType: `BossBattleConfig`

**What it tests:** Tier-end epic challenge with difficulty modifiers that activate at health thresholds.

**Configuration:**
```typescript
interface BossBattleConfig {
  type: 'bossBattle';
  tier: number;                        // Tier 1-15
  bossId: string;                      // Which cat boss
  modifiers: BossModifier[];           // Modifiers that activate
  lives: number;                       // Default 3
}

interface BossModifier {
  activateAtHealthPct: number;         // Activate at 50% health
  type: 'tempoRamp' | 'darkKeys' | 'mirrorNotes' | 'noLabels';
}
```

**Testing approach (when implemented):**
1. Boss battle UI shows boss health bar (3 lives)
2. Playing exercise correctly deals damage to boss
3. At health thresholds (75%, 50%, 25%), modifiers activate (tempo increases, keys darken, notes reverse, labels disappear)
4. User loses a life if they fail
5. Victory at 0 health; defeat after 3 lost lives
6. Score based on time to victory and lives remaining

---

## Type 13: Duet

**Status:** 🔄 Designed, not implemented | ConfigType: `DuetConfig`

**What it tests:** Two-handed or ensemble playing. User plays one hand, AI/cat plays the other.

**Configuration:**
```typescript
interface DuetConfig {
  type: 'duet';
  playerHand: 'left' | 'right';        // Which hand user plays
  companionNotes: NoteEvent[];         // Notes AI plays
}
```

**Testing approach (when implemented):**
1. AI/cat plays companion part (left hand if user plays right, or vice versa)
2. User plays their assigned hand
3. Scoring: Same as Play, but only user's notes are scored
4. Audio: Both parts mix together (user + AI)
5. Visual: Can highlight user's hand vs companion hand

---

## Type 14: Speed Run

**Status:** 🔄 Designed, not implemented | ConfigType: `SpeedRunConfig`

**What it tests:** Timed chain of exercises. User completes multiple exercises within a time limit.

**Configuration:**
```typescript
interface SpeedRunConfig {
  type: 'speedRun';
  exerciseChain: string[];             // IDs of exercises in sequence
  timeLimitSeconds: number;            // e.g., 60 seconds
}
```

**Testing approach (when implemented):**
1. Timer starts; user completes exercise 1
2. On completion, exercise 2 loads immediately (no completion modal)
3. Continue through all exercises before time runs out
4. Score: Based on accuracy of all exercises + time remaining bonus
5. Fail if time expires before completing all exercises

---

## Type 15: Endless Mode

**Status:** 🔄 Designed, not implemented | ConfigType: `EndlessModeConfig`

**What it tests:** Progressive difficulty until user fails. Tempo increases each round.

**Configuration:**
```typescript
interface EndlessModeConfig {
  type: 'endlessMode';
  startTempo: number;                  // e.g., 60 BPM
  tempoStepBpm: number;                // e.g., 5 BPM per round
  patternCategory: string;             // e.g., "c-major-scales"
}
```

**Testing approach (when implemented):**
1. Round 1: Play pattern at startTempo
2. Pass: Tempo increases by tempoStepBpm, continue round 2
3. Fail: Game over, show final tempo and rounds completed
4. Score: Based on highest tempo reached + accuracy at that tempo
5. UI: Show current tempo, rounds survived, tempo progression graph

---

## Type 16: Teacher Challenge

**Status:** 🔄 Designed, not implemented | ConfigType: `TeacherChallengeConfig`

**What it tests:** Specific technique goal set by teacher (Salsa cat). User must meet a target metric.

**Configuration:**
```typescript
interface TeacherChallengeConfig {
  type: 'teacherChallenge';
  challengeType: 'tempo' | 'dynamics' | 'legato' | 'accuracy';
  targetValue: number;                 // e.g., 120 BPM or 90% accuracy
  salsaPrompt: string;                 // e.g., "Play faster!"
}
```

**Testing approach (when implemented):**
1. Salsa cat gives challenge (via voice or text bubble)
2. User plays exercise with focus on the challenge metric
3. Real-time feedback shows progress toward target (e.g., "78 BPM, target 120")
4. Score: Based on meeting/exceeding target metric
5. Optional: Voice coaching during exercise

---

# PART 4: DESIGNED BUT NOT YET IMPLEMENTED (CreativeExerciseType)

## Type 17: Improvisation

**Status:** 🔄 Designed, not implemented | ConfigType: `ImprovisationConfig`

**What it tests:** Free creative playing over a backing track. No predefined notes; user improvises.

**Configuration:**
```typescript
interface ImprovisationConfig {
  type: 'improvisation';
  chordProgression: string[];          // ['C', 'F', 'G', 'C'] = chord names per bar
  scale: string;                       // 'C major' or 'A minor' — keys to highlight
  bars: number;                        // How many bars to play (8, 12, 16, 32)
  backingTrack?: NoteEvent[];          // Accompany notes (optional)
}
```

**Testing approach (when implemented):**
1. Backing track plays chords in loop (optional)
2. Highlighted scale keys show allowed notes (dimmed keys outside scale)
3. User improvises freely over the progression
4. Scoring: Qualitative evaluation of musicality, key adherence, phrasing
5. Optional: AI analyzes improvisation and provides feedback on harmonic alignment, phrasing

---

# SYSTEM TESTING RECOMMENDATIONS

## Cross-Type Validation

### Test Matrix (All 19 Types)

| Type | Input Method | Scoring Mode | Visual Feedback | Notes |
|------|-------------|-------------|-----------------|-------|
| Play | MIDI | Standard | PianoRoll | Baseline; test all 6 production types in matrix |
| Rhythm | MIDI | Pitch-blind | PianoRoll | Verify accuracy always 100% |
| EarTraining | Mic or MIDI | Standard | Optional staff/roll | Test with/without visual cues |
| ChordID | MIDI | Chord (100ms) | PianoRoll | Verify wider tolerance works |
| SightReading | MIDI | Standard | Staff notation | Verify staff rendering |
| CallResponse | MIDI | Standard (response) | PianoRoll | Verify call doesn't affect score |
| FillInBlank | MIDI | Partial | PianoRoll | TBD: implement + test |
| SpotError | On-screen | Multiple choice | Optional | TBD: implement + test |
| IntervalQuiz | MIDI | Interval match | Staff/keyboard | TBD: implement + test |
| ChordBuilder | MIDI | Chord match | Staff | TBD: implement + test |
| KeySignatureID | MIDI | Key match | Staff | TBD: implement + test |
| BossBattle | MIDI | Standard + mods | Health bar + modifiers | TBD: implement + test |
| Duet | MIDI | Dual hand | Split keyboard | TBD: implement + test |
| SpeedRun | MIDI | Multi-exercise | Rapid transitions | TBD: implement + test |
| EndlessMode | MIDI | Progressive | Tempo graph | TBD: implement + test |
| TeacherChallenge | MIDI | Challenge metric | Real-time progress | TBD: implement + test |
| Improvisation | MIDI | Qualitative | Backing track + scale highlight | TBD: implement + test |

### Performance Benchmarks

**Latency targets** (from audio-pipeline.md):
- Playback (MIDI → sound): <20ms (target), <25ms (acceptable)
- Pitch detection (mic → feedback): <150ms
- Scoring (played notes → score): <50ms

**Throughput:**
- 6 concurrent voice pools (ExpoAudioEngine) @ 44.1kHz
- No dropped notes with normal fingering speed (6-8 notes/second)

### Regression Testing

**After each type implementation, verify:**
1. ExerciseValidator tests still pass (scoringStrategies.test.ts)
2. ExercisePlayer component tests pass (on-screen keyboard interaction)
3. E2E: Navigate to any exercise of that type, play, get score
4. Score matches expected breakdown (accuracy/timing/completeness/extraNotes/duration)
5. Replay visualization renders correctly

---

# CONCLUSION

This guide provides comprehensive testing procedures for all 19 exercise types. **Priority focus: Production-ready ClassicExerciseType (Types 1-6)** are fully testable today with physical device + MIDI/touch input. **Designed-but-unimplemented types (7-17)** require feature branch implementation before testing can proceed.

**Next steps:**
1. Validate all 6 production types against this guide (estimate 2-3 hours manual testing)
2. Design + implement InteractionExerciseType (Types 7-11) based on ConfigType definitions
3. Implement GamifiedExerciseType (Types 12-15) with game mechanics (health bars, modifiers, timer)
4. Implement CreativeExerciseType (Type 16) with AI-assisted analysis
5. Full integration testing with all 19 types running concurrently


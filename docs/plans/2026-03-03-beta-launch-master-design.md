# Purrrfect Keys — Beta Launch Master Design

**Date:** 2026-03-03
**Goal:** Transform the app from a feature-complete prototype into a best-in-class piano learning app ready for specialist beta testing. Content-rich, beautiful, coached, and instrumented.

**Strategy:** Build the best product first → beta with specialists → monetize based on real feedback.

**Phase A (this plan):** All features except monetization.
**Phase B (post-beta):** RevenueCat, paywall, gem IAP — informed by real usage data.

---

## 1. Content Expansion — 500+ Exercises, 500+ Songs

### 1.1 Exercise Library (500+)

40 lessons organized in 6 progressive blocks:

| Block | Lessons | Exercises | Skills |
|-------|---------|-----------|--------|
| Beginner | 1-6 | 60 | Note finding, C position, simple melodies, both hands |
| Early Intermediate | 7-12 | 72 | Black keys, G/F/D major, sharps/flats, dotted rhythms |
| Intermediate | 13-20 | 96 | Minor keys, chords & inversions, arpeggios, pedaling |
| Upper Intermediate | 21-28 | 96 | Chord progressions, accompaniment, syncopation, 6/8 time |
| Advanced | 29-36 | 96 | Modulation, jazz voicings, classical technique, ornaments |
| Mastery | 37-40 | 48 | Performance pieces, improvisation, sight-reading drills |

**Total:** ~468 structured + ~50 standalone drills = **500+**

Existing 30 exercises kept as-is for lessons 1-6. All new exercises AI-generated via batch pipeline, then hand-reviewed.

### 1.2 Exercise Types (6)

| Type | User Action | New UI |
|------|------------|--------|
| **Play** | Play falling notes (existing) | None |
| **Rhythm** | Tap timing on any key, pitch ignored | Minimal — disable pitch scoring |
| **Ear Training** | Hear interval/chord, play it back | Audio prompt + answer check |
| **Chord ID** | See chord name, play it | Chord name display |
| **Sight Reading** | Staff notation only, no note names | Staff renderer |
| **Call & Response** | Salsa plays a phrase, user echoes | DemoPlaybackService + response capture |

Add `type` field to Exercise schema. Existing `display` and `scoring` fields already support toggling note names, finger numbers, staff notation.

### 1.3 Song Library (500+)

| Source | Count | Genre | Method |
|--------|-------|-------|--------|
| Existing | 124 | Mixed | Already in Firestore |
| TheSession.org | +150 | Folk/Celtic | `import-thesession.ts` (existing) |
| IMSLP/music21 | +100 | Classical | `import-pdmx.py` (existing) |
| Gemini generation | +75 | Pop/Film/Game | `generate-songs.ts` (existing) |
| Public domain hymns | +50 | Standards | New import script |

**Difficulty-graded arrangements:** Each popular song gets 3 versions — Easy (melody, C major), Medium (melody + simple chords), Hard (full arrangement, original key). 500 songs × 3 = **1,500 playable pieces**.

### 1.4 Learning Paths (5)

| Path | Focus | Branches at | Unique content |
|------|-------|-------------|----------------|
| Piano Basics | Default, well-rounded | — | Standard curriculum |
| Pop & Film | Play songs you know | Lesson 5 | Song-heavy, chord-first |
| Classical | Technique & repertoire | Lesson 5 | Scales, arpeggios, Bach/Mozart/Beethoven |
| Jazz & Blues | Chord voicings, improv | Lesson 10 | 7th chords, swing, blues scale, lead sheets |
| Kids | Simplified, gamified | Lesson 1 | Shorter exercises, more cat interactions, nursery rhymes |

Each path is a JSON manifest referencing exercises from the shared pool + path-exclusive exercises. CurriculumEngine routes based on selected path.

### 1.5 Daily Fresh Content

- **Daily Sight-Reading Challenge:** Cloud Function generates new 8-16 bar exercise at midnight UTC. Global leaderboard per difficulty tier. Gem rewards for top placements.
- **Weekly Featured Song:** Curated from library, 3x gem multiplier, friend score comparison.
- **AI Practice Sessions:** CurriculumEngine pulls from 500+ pool — never repeats.

### 1.6 Batch Generation Pipeline

```
scripts/batch-generate-exercises.ts

Input:  Lesson spec (tier, skills, count, difficulty range, types)
Step 1: Parallel Gemini generation (5 at a time)
Step 2: Validate each (existing validateAIExercise)
Step 3: Auto-reject failures, retry up to 2x
Step 4: Write to content/exercises/lesson-XX/*.json
Step 5: Generate lesson manifest
Output: Ready-to-review exercise files + manifest
```

Review workflow: each exercise play-tested, flagged `"reviewed": true`. Only reviewed exercises ship.

### 1.7 ContentLoader Migration

Current static `require()` doesn't scale to 500+. Migrate to:
- Bundled JSON index file (`content/exercise-index.json`) with all metadata
- Individual exercise files loaded on demand
- Firestore backup for remote content updates without app releases

### 1.8 Song-Curriculum Linking

Map songs to skill tree nodes as reward exercises:
- Learn C major triad → unlock simplified "Let It Be"
- Master black keys → unlock "Bohemian Rhapsody" easy arrangement
- Add `requiredSkills` field to song metadata

---

## 2. Real Piano Samples

### 2.1 Multi-Instrument Approach (all free/open source)

| Instrument | Source | License | Size |
|------------|--------|---------|------|
| Grand Piano (default) | Salamander Grand Piano | CC-BY-3.0 | ~12MB |
| Upright Piano | Iowa Piano soundfont | Public domain | ~5MB |
| Electric Piano | FM synthesis (code-generated) | N/A | ~0 |
| Toy Piano | Additive synthesis (code-generated) | N/A | ~0 |

Attribution: "Piano samples from the Salamander Grand Piano project by Alexander Holm."

### 2.2 Sample Specification

- 3 velocity layers: soft (<50), medium (50-90), hard (>90)
- Every 3rd semitone sampled (30 samples per velocity = 90 total)
- Format: OGG (Android) / M4A (iOS), 44.1kHz mono
- Pitch-shift max ±1.5 semitones from nearest sample

### 2.3 Integration

```
SampleLoader.ts (already scaffolded)
  ├── Grand Piano bundled in app (~12MB)
  ├── Additional instruments downloaded on demand (~5MB each)
  ├── WebAudioEngine: decodeAudioData → AudioBuffer → pitch-shift
  ├── ExpoAudioEngine: pre-load into Audio.Sound pool
  └── Offline-first: cached permanently after first download
```

### 2.4 Unlockable Instruments

Additional instruments unlockable via cat evolution milestones or gem purchase. Creates content reward without monetization — users earn new sounds through progress.

---

## 3. "Play First" Onboarding

### 3.1 New Flow (replaces current 5-step info-gathering)

```
STEP 1 (0-15s): "Play your first note!"
    │  Highlighted Middle C, user taps → confetti + cat celebration
    ▼
STEP 2 (15-45s): "Now a melody!"
    │  Guided C-D-E-F-G with mini PianoRoll falling notes
    │  Each note: micro-celebration
    ▼
STEP 3 (45-75s): "Let's play a real song!"
    │  8-note "Twinkle Twinkle" with scoring
    │  Score reveal: "92% — Amazing for your first try!"
    ▼
STEP 4 (75-90s): Choose your cat companion
    │  3 starters (existing CatSelectionStep)
    ▼
STEP 5 (90-110s): Quick setup
    │  Experience level + input method + goal (merged into one screen)
    │  Optional sign-up (skip = anonymous auth)
    ▼
HOME SCREEN — user has already succeeded at piano
```

### 3.2 Key Principles

- Steps 1-3 reuse existing `Keyboard.tsx` and `VerticalPianoRoll.tsx` — no new gameplay components
- Tutorial exercises use simplified ExercisePlayer with no scoring pressure (everything is "Great!")
- Salsa coaches through each step with TTS
- Total time: ~2 minutes (vs current ~45 seconds), but user has PLAYED PIANO
- Steps 2+3+4 from current onboarding merged into one quick screen (Step 5)

---

## 4. Salsa Coaching Loop

Full design in `docs/plans/2026-03-03-salsa-coaching-loop-design.md`. Summary:

### 4.1 Pre-Exercise Intro (3 tiers)

| Tier | When | Duration | Content |
|------|------|----------|---------|
| Brief | Returning, last score ≥ 70% | 5-8s | One targeted tip from learner profile |
| Walkthrough | First attempt or new skill | 15-20s | Skill intro + 4-bar demo + tip |
| Extended | 3+ consecutive fails | 20-30s | Hardest section demo + failure pattern coaching |

### 4.2 Post-Exercise Replay

Hybrid real-time replay + timeline scrub bar:
- VerticalPianoRoll replays with color-coded notes (green/yellow/red/grey/purple)
- Timeline scrub bar at bottom (colored dots, draggable playhead, red pause pins)
- Auto-pauses on 2-3 worst mistakes (selected by AI)
- Salsa explains mistake + demos correct version at each pause
- Keyboard in read-only mode with dual-highlight (expected green, played red)

### 4.3 Replay Trigger Logic

| Condition | Behavior |
|-----------|----------|
| Score < 80% | Auto-starts after CompletionModal |
| First attempt (any score) | Auto-starts after CompletionModal |
| Score ≥ 80% on repeat | "Review with Salsa" button |

### 4.4 AI Integration

Gemini returns structured JSON:
```json
{
  "pausePoints": [{ "beatPosition": 7, "type": "wrong_pitch", "explanation": "...", "showCorrectFromBeat": 5, "showCorrectToBeat": 9 }],
  "continuousComments": [{ "beatPosition": 0, "text": "Good start!" }],
  "summary": "..."
}
```

Fallback: algorithmic pause-point selection + template strings when offline.

### 4.5 New Files

| File | Purpose |
|------|---------|
| `src/core/exercises/replayTypes.ts` | ReplayPlan, ReplayScheduleEntry, PausePoint types |
| `src/services/replayCoachingService.ts` | Builds ReplayPlan from score + Gemini |
| `src/services/ai/ReplayPromptBuilder.ts` | Structured Gemini prompts |
| `src/screens/ExercisePlayer/ReplayOverlay.tsx` | Salsa bubble (pill + card) |
| `src/screens/ExercisePlayer/ReplayTimelineBar.tsx` | Scrub bar |
| `src/screens/ExercisePlayer/SalsaIntro.tsx` | Pre-exercise intro overlay |

### 4.6 Modified Files

| File | Change |
|------|--------|
| `ExercisePlayer.tsx` | Add `mode: 'exercise' \| 'replay'`, wire replay trigger, integrate SalsaIntro |
| `CompletionModal.tsx` | "Review with Salsa" button, auto-trigger logic |
| `DemoPlaybackService.ts` | Accept ReplayScheduleEntry[] with jitter, pause/resume at beats, seekToBeat() |
| `useExercisePlayback.ts` | Expose finalScoreRef for replay |
| `VerticalPianoRoll.tsx` | noteColorOverrides: Map<number, string> for replay coloring |
| `Keyboard.tsx` | readOnly display mode with dual-highlight |

---

## 5. Premium SVG Cats

Full design in `docs/plans/2026-03-03-premium-svg-cats-design.md`. Summary:

### 5.1 Art Direction

Replace all geometric-primitive SVG (circles, ellipses) with hand-crafted cubic bezier paths for chibi anime collectible quality.

### 5.2 Key Upgrades

- **Head & Body:** Organic bezier shapes with 4 body type variants (slim, standard, round, chonky)
- **Eyes (8-layer composite):** Eyelid → sclera → iris ring → iris body → pupil → fiber lines → primary catch light → secondary catch light
- **Ears:** Double contour, inner fur detail, 3 types (pointed, rounded, folded)
- **Nose:** Inverted triangle (anime style) with highlight
- **Mouth:** Upper lip Y-line, optional fang, mood-specific (tongue, wide grin)
- **Whiskers:** Curved bezier, tapered width, follicle dots
- **Paws:** Rounded with 3 toe beans per paw
- **Tail:** Tapered filled path, per-type tips (curled, straight, fluffy)
- **Blush:** Anime hash-mark style (3 diagonal lines)

### 5.3 Gradient & Lighting System

9 gradients (expanded from 5): head, body, iris, ear, tail + belly-patch, nose-shine, paw-pad, rim-light.

Consistent upper-left (10 o'clock) light direction. Rim light on right edge for 3D-rendered feel. Ambient occlusion shadows at body junctions. Fur sheen highlights.

### 5.4 New Profile Fields

```typescript
pupilType: 'round' | 'slit'
fang: boolean
hairTuftSize: 'small' | 'medium' | 'large'
```

### 5.5 18-Layer Rendering Order

Evolution aura → ground shadow → tail → body + belly → chest tuft → paws → head → fur sheen → pattern → ears → hair tuft → whiskers → nose → eyes (8-layer) → mouth + fang → blush → rim light → accessories.

### 5.6 Implementation Order (highest visual impact first)

1. CatHead + CatBody + chest tuft
2. CatEyes (8-layer) + pupilType
3. CatEars + CatNose
4. CatMouth + fang + CatWhiskers
5. CatPaws + CatTail
6. CatBlush + CatHairTuft
7. CatGradientDefs (4 new) + CatShadows + rim light + fur sheen
8. Profile updates for all 13 cats + regression tests

---

## 6. Retention Mechanics

### 6.1 Daily Sight-Reading Challenge

- Cloud Function generates new exercise at midnight UTC
- 3 difficulty variants (beginner/intermediate/advanced)
- Global leaderboard per tier, gem rewards for top placements
- HomeScreen card: "Today's Challenge — 4h 23m remaining"
- Reuses existing ExercisePlayer

### 6.2 Weekly Featured Song

- One song highlighted every Monday from 500+ library
- 3x gem multiplier for first completion
- Friend score comparison on SocialScreen
- HomeScreen spotlight (existing MusicLibrarySpotlight component)

### 6.3 Cat Mood ↔ Streak Connection

| Streak | Cat Behavior | Visual |
|--------|-------------|--------|
| 0 (broken) | Sad pose, sleepy eyes | `sad` animation, dim accessories |
| 1-2 days | Neutral | `idle` animation |
| 3-6 days | Happy, playful | `play` animation, slight glow |
| 7-13 days | Excited, bouncy | `celebrate` micro-bursts, warm glow |
| 14-29 days | Peak energy | Particle effects, gold tint |
| 30+ days | Legendary | Rainbow aura, crown auto-equipped |

Connects to existing StreakFlame.tsx tiers and CatAccessories3D.tsx aura support.

### 6.4 "Come Back" Re-engagement

- Push notification after 3+ days: "{catName} misses you!"
- Return screen: full-screen sad cat + personalized dialogue (existing trigger type)
- Quick review session via CurriculumEngine
- Streak recovery: 50-gem retroactive freeze purchase (one-time per break)

### 6.5 Streak Freeze Anxiety

- 8 PM notification: "Your {streak}-day streak ends at midnight!"
- Freeze purchasable with 30 gems (covers 1 missed day)
- Visual: StreakFlame with ice crystal overlay when freeze active
- Logic already in XpSystem.ts — needs gem purchase trigger

---

## 7. Analytics + Crash Reporting

### 7.1 PostHog Funnels (5)

**Funnel 1 — Onboarding → Activation:**
```
app_first_open → onboarding_play_first_note → onboarding_play_melody
→ onboarding_play_song → onboarding_cat_selected → onboarding_complete
→ first_real_exercise_started → first_real_exercise_completed
```

**Funnel 2 — Session Depth:**
```
session_start → exercise_started → exercise_completed
→ replay_triggered → replay_completed_vs_skipped → next_exercise_started
```

**Funnel 3 — Retention Cohorts:**
D1, D3, D7, D14, D30 retention segmented by experience level, input method, selected cat.

**Funnel 4 — Content Quality:**
Per exercise/song/lesson: completion rate, avg score, retry rate, skip rate, dropout point.

**Funnel 5 — Salsa Coaching Effectiveness:**
```
replay_triggered → replay_completed → exercise_retried → score_improved
```

### 7.2 Crashlytics

- Install `@react-native-firebase/crashlytics`
- Wire to existing ErrorBoundary.tsx
- Non-fatal tracking: AI fallbacks, mic failures, ONNX failures

### 7.3 Beta Feedback Channel

- "Send Feedback" button in ProfileScreen
- Posts to Firestore `feedback` collection with app version, device, user level, OS
- Or opens mailto: link

---

## 8. App Store / TestFlight Readiness

### 8.1 TestFlight Distribution

- EAS `preview` build → upload to App Store Connect → TestFlight
- Up to 100 internal testers (no review), 10,000 external (light review)
- Build triggered automatically on master push (CI/CD already configured)

### 8.2 App Store Metadata

| Asset | Spec | Status |
|-------|------|--------|
| App icon | 1024x1024 PNG | Needed |
| Screenshots | 6.7", 6.5", 5.5" — 6 per size | Needed |
| Title | "Purrrfect Keys: Learn Piano" | Ready |
| Subtitle | "Play, Learn & Evolve with Cats" | Ready |
| Privacy URL | Hosted privacy-policy.md | Need to host |
| Support URL | GitHub or landing page | Need to set up |

### 8.3 Technical Requirements

- NSMicrophoneUsageDescription ✅ (in app.json)
- Export compliance ✅ (usesNonExemptEncryption: false)
- Privacy manifest needed (iOS 17+)
- ATT prompt if PostHog uses IDFA

### 8.4 Beta Launch Checklist

1. TestFlight build uploaded and accessible
2. Crashlytics receiving events
3. PostHog funnels tracking
4. Firebase rules deployed
5. Cloud Functions deployed (or client-side fallback confirmed)
6. Privacy policy at public URL
7. Feedback channel working
8. 100+ exercises minimum (full 500+ target)
9. Real piano samples integrated
10. Premium SVG cats rendering on device

---

## 9. Monetization (Phase B — Post-Beta)

Deferred until after specialist feedback. Planned approach:

### 9.1 Subscription (RevenueCat)

- Free tier: Lessons 1-3, 5 songs/week, 1 cat, touch input, local-only
- Pro ($9.99/mo or $59.99/yr): Everything unlimited

### 9.2 Gem IAP (cosmetics)

- Cat accessories, keyboard themes, exclusive skins
- $0.99/100 gems, $4.99/600, $9.99/1500

### 9.3 Informed by Beta Data

- Which features do beta testers use most? (paywall those)
- What's the natural upgrade moment? (paywall there)
- Which cat cosmetics do they want? (sell those)

---

## 10. Dependencies & Sequencing

```
Content Expansion ──────────────────────────┐
Piano Samples ───────────────────────────── ├──→ Beta Launch
Premium SVG Cats ────────────────────────── │
"Play First" Onboarding ─────────────────── │
                                            │
Salsa Coaching Loop ─── depends on ─── Content (needs exercises to replay)
                                            │
Retention Mechanics ─── depends on ─── Content + Cats (mood needs art)
                                            │
Analytics ──────────── parallel with ── everything (instrument early)
                                            │
App Store Readiness ─── depends on ─── Cats (screenshot hero) + Content
```

**Parallelizable workstreams:**
- Content generation + Piano samples + SVG cats (all independent)
- Analytics instrumentation (can start immediately)

**Sequential dependencies:**
- Salsa Coaching Loop needs exercises to exist
- Retention mechanics need cat art + content
- App Store screenshots need final cat art

---

## Design Constraints

- **No new native dependencies** except `@react-native-firebase/crashlytics` and piano sample assets
- **Offline-first** — all gameplay features work without network
- **Performance** — ONE 3D canvas per screen max, SVG cats are lightweight
- **Backward compatible** — existing user progress, cat data, exercise scores preserved
- **Testable** — all new logic has unit tests, existing 2,717 tests continue passing

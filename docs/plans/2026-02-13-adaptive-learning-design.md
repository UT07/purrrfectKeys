# AI-Powered Adaptive Learning System — Design Document

**Date:** February 13, 2026
**Status:** DESIGNED (Implementation: Phase 2 End / Phase 3 Start)
**Dependencies:** Phase 2 completion (audio fix, mascot, transitions)

---

## 1. Vision

Transform KeySense from a linear exercise sequence into a personalized, AI-driven learning experience where every student gets a unique curriculum tailored to their skill gaps, learning goals, and pace.

**Three pillars:**
1. **AI-generated play challenges** sprinkled throughout lessons
2. **Adaptive difficulty** that responds to student performance in real-time
3. **Goal-based learning paths** that shape what exercises students see

---

## 2. User Decisions (from brainstorming)

| Question | Answer |
|----------|--------|
| Quiz type | Play-based challenges (not text quizzes) |
| Generation method | AI generates full exercise JSON via Gemini |
| Placement | Sprinkled throughout lessons (every 2 exercises) |
| Personalization scope | All: adaptive difficulty + goal-based paths + AI-curated order |

---

## 3. Architecture Overview

```
                         ┌─────────────────────┐
                         │   Student Model      │
                         │ (per-skill mastery,  │
                         │  weakness tracking,  │
                         │  learning velocity)  │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
    ┌─────────▼─────────┐ ┌────────▼────────┐ ┌──────────▼────────┐
    │ Challenge Generator│ │ Difficulty Tuner │ │ Curriculum Engine  │
    │ (Gemini → JSON)   │ │ (tempo, timing,  │ │ (goal paths,      │
    │                   │ │  scoring windows)│ │  exercise ordering)│
    └─────────┬─────────┘ └────────┬────────┘ └──────────┬────────┘
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   Lesson Flow       │
                         │ Controller           │
                         │ (decides what to     │
                         │  show next)          │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   Exercise Player    │
                         │   (existing)         │
                         └─────────────────────┘
```

---

## 4. Component Design

### 4.1 Student Skill Model

A per-skill mastery tracker that builds a picture of what the student knows.

```typescript
// src/core/progression/StudentModel.ts

interface SkillMastery {
  skillId: string;              // e.g. "right-hand", "c-major", "quarter-notes"
  level: number;                // 0.0 - 1.0 (0 = never seen, 1 = mastered)
  confidence: number;           // 0.0 - 1.0 (how certain we are of the level)
  lastPracticed: number;        // timestamp
  attemptHistory: AttemptRecord[]; // last 10 attempts
  decayRate: number;            // how fast skill fades without practice
}

interface AttemptRecord {
  timestamp: number;
  score: number;                // 0-100
  exerciseId: string;
  challengeGenerated: boolean;  // was this an AI challenge?
}

interface StudentProfile {
  skills: Record<string, SkillMastery>;

  // Derived from onboarding
  experienceLevel: 'beginner' | 'intermediate' | 'returning';
  learningGoal: 'songs' | 'technique' | 'exploration';

  // Computed
  overallLevel: number;         // weighted average of all skills
  weakestSkills: string[];      // top 3 skills needing work
  strongestSkills: string[];    // top 3 mastered skills
  learningVelocity: number;     // how fast they improve (attempts/mastery gain)
}
```

**Skill taxonomy** (derived from existing lesson metadata):
```
orientation           — finding keys on the keyboard
note-identification   — knowing which note is which
keyboard-navigation   — moving between positions
right-hand           — right hand technique
left-hand            — left hand technique
both-hands           — hand coordination
c-major              — C major scale and position
melodies             — playing melodic lines
quarter-notes        — quarter note rhythm
eighth-notes         — eighth note rhythm
bass-notes           — bass register playing
accompaniment        — accompaniment patterns
independence         — hand independence
coordination         — precise coordination
scales               — scale technique
finger-crossing      — thumb-under technique
parallel-motion      — hands in parallel
speed                — tempo control
technique            — general technique
songs                — applying skills to songs
expression           — musical expression
rhythm               — general rhythm skills
harmony              — chord and harmony concepts
```

**Update rules:**
- After each exercise: update skills tagged in `exercise.metadata.skills`
- Mastery increase: `delta = (score / 100) * 0.1 * (1 - currentLevel)` (diminishing returns)
- Mastery decay: `decayRate * daysSinceLastPractice * 0.01` (capped at losing 20%)
- Confidence increases with more attempts, decreases with time

### 4.2 Challenge Generator

Gemini generates fresh exercise JSON personalized to the student.

**When challenges appear:**
- After every 2nd regular exercise in a lesson
- The lesson flow becomes: `[Ex1, Ex2, CHALLENGE, Ex3, Ex4, CHALLENGE, ...]`
- Challenges are marked with `"type": "challenge"` in the exercise JSON
- Failing a challenge doesn't block progress (it's reinforcement, not a gate)
- But completing ALL challenges in a lesson is required to unlock the next lesson

**Generation prompt:**

```typescript
// src/services/ai/ChallengeGenerator.ts

const CHALLENGE_SYSTEM_PROMPT = `You are a piano exercise generator for a learning app.

You output ONLY valid JSON matching the Exercise schema. No markdown, no explanation.

RULES:
1. Generate exercises appropriate for the student's skill level
2. Focus on their weak areas while using their strong skills as scaffolding
3. Keep exercises SHORT (4-8 notes for beginners, 8-16 for intermediate)
4. Use only notes within the specified MIDI range
5. Ensure all startBeats are non-negative and non-overlapping (unless chords)
6. durationBeats must be > 0
7. Star thresholds must be ascending: [one < two < three]
8. passingScore must be <= starThresholds[0]
9. Use the exact JSON schema provided — no extra fields`;

function buildChallengePrompt(
  student: StudentProfile,
  lesson: LessonManifest,
  recentScores: ExerciseScore[],
  previousExercises: Exercise[]
): string {
  return `STUDENT PROFILE:
- Experience: ${student.experienceLevel}
- Goal: ${student.learningGoal}
- Weak skills: ${student.weakestSkills.join(', ')}
- Strong skills: ${student.strongestSkills.join(', ')}
- Recent scores: ${recentScores.map(s => s.overall + '%').join(', ')}

CURRENT LESSON: "${lesson.metadata.title}" (difficulty ${lesson.metadata.difficulty}/5)
LESSON SKILLS: ${lesson.metadata.skills.join(', ')}

EXERCISES JUST COMPLETED:
${previousExercises.map(ex => `- "${ex.metadata.title}": notes ${ex.notes.length}, tempo ${ex.settings.tempo} BPM, range ${Math.min(...ex.notes.map(n => n.note))}-${Math.max(...ex.notes.map(n => n.note))}`).join('\n')}

Generate a SHORT challenge exercise that:
1. Tests the skills from the exercises just completed
2. Introduces a SMALL variation (different note order, slightly different rhythm, or transposed up/down)
3. Targets the student's weak skill: "${student.weakestSkills[0]}"
4. Uses MIDI notes in range ${getMidiRange(lesson)}
5. Has tempo between ${getTempoBounds(student)} BPM

OUTPUT: A single valid JSON object matching this schema:
${JSON.stringify(EXERCISE_SCHEMA_EXAMPLE, null, 2)}`;
}
```

**Validation pipeline** (safety layer — reject invalid AI output):

```typescript
// src/core/exercises/ChallengeValidator.ts

interface ValidationResult {
  valid: boolean;
  errors: string[];
  exercise: Exercise | null;
}

function validateGeneratedExercise(raw: unknown): ValidationResult {
  const errors: string[] = [];

  // 1. Parse JSON
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); }
    catch { return { valid: false, errors: ['Invalid JSON'], exercise: null }; }
  }

  const ex = raw as Record<string, unknown>;

  // 2. Required fields
  if (!ex.id || typeof ex.id !== 'string') errors.push('Missing or invalid id');
  if (!ex.notes || !Array.isArray(ex.notes)) errors.push('Missing or invalid notes');
  if (!ex.settings || typeof ex.settings !== 'object') errors.push('Missing settings');
  if (!ex.scoring || typeof ex.scoring !== 'object') errors.push('Missing scoring');

  if (errors.length > 0) return { valid: false, errors, exercise: null };

  // 3. Note validation
  const notes = ex.notes as NoteEvent[];
  for (const note of notes) {
    if (note.note < 21 || note.note > 108) errors.push(`Note ${note.note} outside piano range`);
    if (note.startBeat < 0) errors.push(`Negative startBeat: ${note.startBeat}`);
    if (note.durationBeats <= 0) errors.push(`Invalid duration: ${note.durationBeats}`);
  }

  // 4. Scoring validation
  const scoring = ex.scoring as ExerciseScoringConfig;
  const [s1, s2, s3] = scoring.starThresholds;
  if (s1 >= s2 || s2 >= s3) errors.push('Star thresholds not ascending');
  if (scoring.passingScore > s1) errors.push('passingScore > 1-star threshold');

  // 5. Sanity checks
  if (notes.length === 0) errors.push('No notes in exercise');
  if (notes.length > 32) errors.push('Too many notes (>32) for a challenge');

  // 6. Tempo check
  const tempo = (ex.settings as ExerciseSettings).tempo;
  if (tempo < 40 || tempo > 200) errors.push(`Tempo ${tempo} outside safe range`);

  return {
    valid: errors.length === 0,
    errors,
    exercise: errors.length === 0 ? ex as unknown as Exercise : null,
  };
}
```

**Fallback:** If AI generation fails or validation rejects the exercise, use a pre-built challenge template from a pool of 3-5 per lesson.

### 4.3 Difficulty Tuner

Adjusts exercise parameters based on student performance.

```typescript
// src/core/progression/DifficultyTuner.ts

interface DifficultyParams {
  tempoMultiplier: number;     // 0.7 - 1.3 (scales exercise tempo)
  timingTolerance: number;     // ms added/subtracted from scoring windows
  passingScoreAdjust: number;  // points added/subtracted from passing threshold
  hintLevel: 'full' | 'partial' | 'none'; // how much help to show
}

function computeDifficulty(
  student: StudentProfile,
  exerciseSkills: string[]
): DifficultyParams {
  // Average mastery across exercise's required skills
  const avgMastery = exerciseSkills.reduce((sum, skill) => {
    return sum + (student.skills[skill]?.level ?? 0);
  }, 0) / exerciseSkills.length;

  // Learning velocity factor (fast learners get harder content sooner)
  const velocityFactor = Math.min(student.learningVelocity / 5, 0.2);

  if (avgMastery < 0.3) {
    // Struggling: slow down, widen windows, show hints
    return {
      tempoMultiplier: 0.8,
      timingTolerance: 30,      // +30ms grace
      passingScoreAdjust: -5,   // lower bar slightly
      hintLevel: 'full',
    };
  } else if (avgMastery < 0.7) {
    // Progressing: standard difficulty
    return {
      tempoMultiplier: 1.0,
      timingTolerance: 0,
      passingScoreAdjust: 0,
      hintLevel: 'partial',
    };
  } else {
    // Advanced: speed up, tighten windows
    return {
      tempoMultiplier: 1.1 + velocityFactor,
      timingTolerance: -15,     // -15ms tighter
      passingScoreAdjust: 5,    // raise the bar
      hintLevel: 'none',
    };
  }
}
```

### 4.4 Curriculum Engine

Decides exercise ordering based on learning goals and mastery.

```typescript
// src/core/progression/CurriculumEngine.ts

type LearningPath = 'songs' | 'technique' | 'exploration';

interface CurriculumDecision {
  exerciseOrder: string[];       // reordered exercise IDs for the lesson
  skippedExercises: string[];    // exercises student can skip (already mastered)
  bonusExercises: string[];      // extra exercises from other lessons (cross-training)
  challengeInsertions: number[]; // indices where AI challenges should appear
}

function planLessonCurriculum(
  lesson: LessonManifest,
  student: StudentProfile,
  path: LearningPath
): CurriculumDecision {
  const exercises = lesson.exercises.sort((a, b) => a.order - b.order);
  const result: CurriculumDecision = {
    exerciseOrder: [],
    skippedExercises: [],
    bonusExercises: [],
    challengeInsertions: [],
  };

  for (const ex of exercises) {
    const exercise = getExercise(ex.id);
    if (!exercise) continue;

    // Check if student has already mastered all skills in this exercise
    const allMastered = exercise.metadata.skills.every(
      skill => (student.skills[skill]?.level ?? 0) > 0.85
    );

    if (allMastered && student.experienceLevel !== 'beginner') {
      // Skip mastered exercises for non-beginners
      result.skippedExercises.push(ex.id);
    } else {
      result.exerciseOrder.push(ex.id);
    }
  }

  // Goal-based reordering
  if (path === 'songs') {
    // Prioritize melody/song exercises, defer technique drills
    result.exerciseOrder.sort((a, b) => {
      const exA = getExercise(a)!;
      const exB = getExercise(b)!;
      const aIsSong = exA.metadata.skills.includes('songs') || exA.metadata.skills.includes('melodies');
      const bIsSong = exB.metadata.skills.includes('songs') || exB.metadata.skills.includes('melodies');
      if (aIsSong && !bIsSong) return -1;
      if (!aIsSong && bIsSong) return 1;
      return 0;
    });
  } else if (path === 'technique') {
    // Prioritize scales/technique, defer songs
    result.exerciseOrder.sort((a, b) => {
      const exA = getExercise(a)!;
      const exB = getExercise(b)!;
      const aIsTech = exA.metadata.skills.includes('technique') || exA.metadata.skills.includes('scales');
      const bIsTech = exB.metadata.skills.includes('technique') || exB.metadata.skills.includes('scales');
      if (aIsTech && !bIsTech) return -1;
      if (!aIsTech && bIsTech) return 1;
      return 0;
    });
  }
  // 'exploration' path: keep original order (variety)

  // Insert challenges every 2 exercises
  for (let i = 2; i <= result.exerciseOrder.length; i += 3) {
    // +3 because challenge itself takes a slot
    result.challengeInsertions.push(i);
  }

  return result;
}
```

### 4.5 Lesson Flow Controller

Orchestrates the lesson experience, deciding what to show next.

```typescript
// src/core/progression/LessonFlowController.ts

type FlowItem =
  | { type: 'exercise'; exerciseId: string }
  | { type: 'challenge'; lessonId: string; afterExercises: string[] }
  | { type: 'lesson-complete'; lessonId: string };

class LessonFlowController {
  private items: FlowItem[] = [];
  private currentIndex: number = 0;

  constructor(
    lesson: LessonManifest,
    student: StudentProfile,
    curriculum: CurriculumDecision
  ) {
    // Build the flow sequence
    let exercisesSinceChallenge = 0;
    const recentExercises: string[] = [];

    for (const exId of curriculum.exerciseOrder) {
      this.items.push({ type: 'exercise', exerciseId: exId });
      recentExercises.push(exId);
      exercisesSinceChallenge++;

      if (exercisesSinceChallenge >= 2) {
        this.items.push({
          type: 'challenge',
          lessonId: lesson.id,
          afterExercises: [...recentExercises.slice(-2)],
        });
        exercisesSinceChallenge = 0;
      }
    }

    // If remaining exercises didn't trigger a final challenge, add one
    if (exercisesSinceChallenge > 0 && recentExercises.length > 0) {
      this.items.push({
        type: 'challenge',
        lessonId: lesson.id,
        afterExercises: [...recentExercises.slice(-2)],
      });
    }

    this.items.push({ type: 'lesson-complete', lessonId: lesson.id });
  }

  current(): FlowItem { return this.items[this.currentIndex]; }
  next(): FlowItem | null {
    this.currentIndex++;
    return this.currentIndex < this.items.length ? this.items[this.currentIndex] : null;
  }
  isComplete(): boolean { return this.currentIndex >= this.items.length; }
  progress(): number { return this.currentIndex / this.items.length; }
}
```

---

## 5. Data Flow

```
Student opens lesson
       │
       ▼
CurriculumEngine.planLessonCurriculum()
  - reads StudentProfile + learningGoal
  - determines exercise order, skips, challenge points
       │
       ▼
LessonFlowController initialized with plan
       │
       ▼
┌─── LOOP ────────────────────────────────────────┐
│                                                   │
│  FlowItem = controller.current()                  │
│      │                                            │
│      ├── type: 'exercise'                         │
│      │   └── DifficultyTuner adjusts params       │
│      │   └── ExercisePlayer plays exercise        │
│      │   └── Score → StudentModel.update()        │
│      │   └── controller.next()                    │
│      │                                            │
│      ├── type: 'challenge'                        │
│      │   └── ChallengeGenerator.generate()        │
│      │       └── Gemini API call                  │
│      │       └── ChallengeValidator.validate()    │
│      │       └── Fallback to template if invalid  │
│      │   └── ExercisePlayer plays challenge       │
│      │   └── Score → StudentModel.update()        │
│      │   └── controller.next()                    │
│      │                                            │
│      └── type: 'lesson-complete'                  │
│          └── Check all challenges passed          │
│          └── Award XP + unlock next lesson        │
│          └── Show LessonCompleteScreen            │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

## 6. Unlock Mechanism

**Current system:** Complete all exercises in lesson N → lesson N+1 unlocks.

**New system:**
1. Complete all **regular exercises** in the lesson (same as before)
2. Complete all **AI challenges** with a passing score
3. If a challenge is failed, student can retry (AI generates a new variant)
4. All challenges passed → next lesson unlocks

This means the unlock gate is "prove you can apply the skills to new patterns" rather than "memorize the fixed exercises."

---

## 7. Personalization by Goal

| Goal | Effect on Experience |
|------|---------------------|
| **Songs** | Melody exercises prioritized. Challenges focus on playing recognizable patterns. Technique drills available but optional. "Play Your Favorites" section highlighted. |
| **Technique** | Scales and drills prioritized. Challenges focus on speed, accuracy, finger independence. Song exercises used as "reward" after technique blocks. |
| **Exploration** | Original order maintained. Challenges are varied (mix of everything). More "fun fact" content from mascot. Lower pressure on scores. |

---

## 8. Gemini API Considerations

**Model:** `gemini-2.0-flash` (fast, cheap, sufficient for JSON generation)

**Cost per challenge:**
- Input: ~300 tokens (student profile + context)
- Output: ~400 tokens (exercise JSON)
- Cost: ~$0.05 per 1K challenges
- At 3 challenges per lesson, 6 lessons = 18 challenges per student journey
- Cost per student journey: ~$0.001

**Rate limiting:** Max 5 challenge generations per minute per student

**Caching strategy:**
- Cache generated challenges by `lessonId + weakSkills hash + difficulty bucket`
- If a similar student profile has a cached challenge, reuse it
- Cache TTL: 7 days (challenges should feel fresh but don't need real-time generation)

**Offline fallback:**
- Pre-generate 3 template challenges per lesson during app startup (if online)
- Store in AsyncStorage as `challenge-cache:lesson-XX`
- If offline during lesson, use pre-generated challenges
- If no cache available, skip challenges (degrade gracefully)

---

## 9. UI Integration Points

### 9.1 Level Map (LevelMapScreen)
- Lesson nodes now show challenge completion count: "3/3 challenges"
- Challenge nodes appear as smaller dots between lesson nodes
- Pulsing challenge node = "Challenge available"

### 9.2 Exercise Player
- Challenge exercises have a distinct visual indicator (border glow, "CHALLENGE" badge)
- Mascot appears with context: "Let's see if you can handle something new!"
- Score screen shows "Challenge Complete!" instead of exercise title

### 9.3 Lesson Flow
- New `LessonFlowScreen` wraps ExercisePlayer
- Manages the sequence: exercise → exercise → challenge → exercise → ...
- Shows progress bar for the full lesson flow (not just single exercise)
- Transition cards between items (from Stream E)

---

## 10. Implementation Increments

### Increment 2A: Challenge Infrastructure (3-4 days)
1. Create `ChallengeGenerator.ts` with Gemini prompt
2. Create `ChallengeValidator.ts` with safety checks
3. Create 3 fallback templates per lesson (18 total)
4. Add `"type": "challenge"` to Exercise type
5. Wire challenge generation into ExercisePlayer
6. Add challenge completion tracking to progressStore
7. Tests for validator + generator (mock Gemini)

### Increment 2B: Student Skill Model (2-3 days)
1. Create `StudentModel.ts` with skill mastery tracking
2. Create `DifficultyTuner.ts` with adaptive params
3. Wire skill updates into exercise completion flow
4. Add `studentModel` to progressStore persistence
5. Tests for mastery calculations + difficulty tuning

### Increment 2C: Dynamic Curriculum (3-4 days)
1. Create `CurriculumEngine.ts` with goal-based ordering
2. Create `LessonFlowController.ts` to orchestrate lesson sequence
3. Create `LessonFlowScreen.tsx` wrapping ExercisePlayer
4. Update LevelMapScreen to show challenge nodes
5. Wire unlock logic to require challenge completion
6. Tests for curriculum planning + flow control

**Total: ~9-11 days of implementation**

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini generates invalid JSON | Challenge can't be played | Validation + fallback templates |
| Gemini generates too-hard exercises | Student frustrated | Difficulty bounds in prompt + validator caps |
| Offline student can't get challenges | Lesson blocked | Pre-cache challenges on startup; skip if unavailable |
| Skill model inaccurate | Wrong difficulty | Conservative defaults; model improves with data |
| Challenge feels repetitive | Disengagement | Vary prompt parameters; use different weak skills |
| API cost at scale | Budget overrun | Aggressive caching; template fallback reduces API calls |

---

## 12. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Challenge completion rate | >70% | challenges_passed / challenges_attempted |
| Lesson unlock rate | >80% | students who unlock lesson N+1 after completing N |
| Score improvement after challenges | +10% avg | compare pre-challenge vs post-challenge exercise scores |
| Retention (Day 7) | >40% | PostHog cohort analysis |
| API error rate | <5% | Gemini failures / total challenge requests |
| Generation latency | <3s | p95 of challenge generation time |

---

## 13. Future Extensions

- **Spaced repetition:** Re-surface challenges for skills that are decaying
- **Social challenges:** "Beat your friend's challenge score"
- **Teacher mode:** Music teachers can see student skill models and assign custom challenges
- **Voice coaching:** AI explains why the challenge focuses on specific skills
- **Challenge streaks:** Complete 5 challenges in a row for bonus XP

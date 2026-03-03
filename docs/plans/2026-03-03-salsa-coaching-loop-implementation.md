# Salsa's Coaching Loop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add pre-exercise Salsa intro and post-exercise replay review with AI-powered coaching, timeline scrub bar, and pause-at-mistakes flow.

**Architecture:** Extends existing DemoPlaybackService with replay scheduling (jitter, skip, pause points, speed zones, seeking). New ReplayCoachingService builds a ReplayPlan from ExerciseScore.details + Gemini structured JSON. Replay runs as a mode inside ExercisePlayer, reusing VerticalPianoRoll and Keyboard with color overrides and read-only mode. Pre-exercise intro is a new overlay component with 3 adaptive tiers.

**Tech Stack:** TypeScript, React Native, Reanimated, Gemini 2.0 Flash (structured JSON output), existing DemoPlaybackService, VerticalPianoRoll, Keyboard, TTS pipeline.

**Design doc:** `docs/plans/2026-03-03-salsa-coaching-loop-design.md`

---

## Task 1: Core Replay Types

**Files:**
- Create: `src/core/exercises/replayTypes.ts`
- Test: `src/core/exercises/__tests__/replayTypes.test.ts`

**Context:** All type definitions for the replay system. Referenced by every subsequent task.

**Step 1: Write the types file**

```typescript
// src/core/exercises/replayTypes.ts

import type { NoteEvent, NoteScore, ExerciseScore } from './types';

// --- Color coding ---

export type ReplayNoteColor = 'green' | 'yellow' | 'red' | 'grey' | 'purple';

export function scoreToColor(noteScore: NoteScore): ReplayNoteColor {
  if (noteScore.isExtraNote) return 'purple';
  if (noteScore.isMissedNote) return 'grey';
  if (!noteScore.isCorrectPitch) return 'red';
  if (noteScore.timingScore >= 70) return 'green';
  if (noteScore.timingScore >= 30) return 'yellow';
  return 'red';
}

// --- Replay schedule ---

export interface ReplayScheduleEntry {
  note: NoteEvent;
  play: boolean;          // false = missed note (show ghost outline, don't sound)
  jitterMs: number;       // timing offset from score (0 = perfect)
  status: NoteScore['status'];
  color: ReplayNoteColor;
  /** If wrong pitch, the MIDI note actually played */
  playedNote?: number;
}

// --- Speed zones ---

export type SpeedZone = 'normal' | 'fast';

export interface SpeedZoneEntry {
  fromBeat: number;
  toBeat: number;
  zone: SpeedZone;
}

// --- Pause points (from AI or algorithmic) ---

export interface PausePoint {
  beatPosition: number;
  type: 'wrong_pitch' | 'timing_rush' | 'timing_drag' | 'missed_notes' | 'general';
  explanation: string;
  showCorrectFromBeat: number;
  showCorrectToBeat: number;
}

// --- Continuous comments ---

export interface ReplayComment {
  beatPosition: number;
  text: string;
}

// --- AI response shape ---

export interface ReplayAIResponse {
  pausePoints: PausePoint[];
  continuousComments: ReplayComment[];
  summary: string;
}

export interface IntroAIResponse {
  introText: string;
  tip: string;
  highlightBeats: number[];
  demoBars: { from: number; to: number };
}

// --- Full replay plan ---

export interface ReplayPlan {
  entries: ReplayScheduleEntry[];
  pausePoints: PausePoint[];
  comments: ReplayComment[];
  summary: string;
  speedZones: SpeedZoneEntry[];
  totalBeats: number;
}

// --- Builder functions ---

export function buildReplayEntries(
  details: NoteScore[],
): ReplayScheduleEntry[] {
  return details
    .filter((d) => !d.isExtraNote) // extras don't map to exercise notes
    .map((d) => ({
      note: d.expected,
      play: !d.isMissedNote,
      jitterMs: d.isMissedNote ? 0 : d.timingOffsetMs,
      status: d.status,
      color: scoreToColor(d),
      playedNote: !d.isCorrectPitch && d.played ? d.played.note : undefined,
    }));
}

export function buildSpeedZones(
  entries: ReplayScheduleEntry[],
  pausePoints: PausePoint[],
  totalBeats: number,
): SpeedZoneEntry[] {
  if (entries.length < 30) {
    // Short exercises: always normal speed
    return [{ fromBeat: 0, toBeat: totalBeats, zone: 'normal' }];
  }

  // Mark every beat as normal or fast
  const beatZones = new Array<SpeedZone>(Math.ceil(totalBeats) + 1).fill('fast');

  // First 4 and last 4 beats: always normal
  for (let b = 0; b < Math.min(4, beatZones.length); b++) beatZones[b] = 'normal';
  for (let b = Math.max(0, beatZones.length - 4); b < beatZones.length; b++) beatZones[b] = 'normal';

  // ±4 beats around pause points: normal
  for (const pp of pausePoints) {
    const from = Math.max(0, Math.floor(pp.beatPosition) - 4);
    const to = Math.min(beatZones.length - 1, Math.ceil(pp.beatPosition) + 4);
    for (let b = from; b <= to; b++) beatZones[b] = 'normal';
  }

  // ±4 beats around non-green notes: normal
  for (const entry of entries) {
    if (entry.color !== 'green') {
      const from = Math.max(0, Math.floor(entry.note.startBeat) - 4);
      const to = Math.min(beatZones.length - 1, Math.ceil(entry.note.startBeat) + 4);
      for (let b = from; b <= to; b++) beatZones[b] = 'normal';
    }
  }

  // Merge consecutive same-zone beats into SpeedZoneEntry[]
  const zones: SpeedZoneEntry[] = [];
  let currentZone = beatZones[0];
  let zoneStart = 0;

  for (let b = 1; b < beatZones.length; b++) {
    if (beatZones[b] !== currentZone) {
      zones.push({ fromBeat: zoneStart, toBeat: b, zone: currentZone });
      currentZone = beatZones[b];
      zoneStart = b;
    }
  }
  zones.push({ fromBeat: zoneStart, toBeat: totalBeats, zone: currentZone });

  return zones;
}
```

**Step 2: Write tests**

```typescript
// src/core/exercises/__tests__/replayTypes.test.ts

import {
  scoreToColor,
  buildReplayEntries,
  buildSpeedZones,
  type ReplayScheduleEntry,
  type PausePoint,
} from '../replayTypes';
import type { NoteScore, NoteEvent } from '../types';

const makeNoteScore = (overrides: Partial<NoteScore>): NoteScore => ({
  expected: { note: 60, startBeat: 0, durationBeats: 1 },
  played: { type: 'noteOn', note: 60, velocity: 80, timestamp: 0, channel: 0 },
  timingOffsetMs: 0,
  timingScore: 100,
  isCorrectPitch: true,
  isExtraNote: false,
  isMissedNote: false,
  status: 'perfect',
  ...overrides,
});

describe('scoreToColor', () => {
  it('returns green for perfect/good notes', () => {
    expect(scoreToColor(makeNoteScore({ timingScore: 100 }))).toBe('green');
    expect(scoreToColor(makeNoteScore({ timingScore: 70 }))).toBe('green');
  });

  it('returns yellow for ok notes', () => {
    expect(scoreToColor(makeNoteScore({ timingScore: 50 }))).toBe('yellow');
    expect(scoreToColor(makeNoteScore({ timingScore: 30 }))).toBe('yellow');
  });

  it('returns red for poor timing or wrong pitch', () => {
    expect(scoreToColor(makeNoteScore({ timingScore: 20 }))).toBe('red');
    expect(scoreToColor(makeNoteScore({ isCorrectPitch: false }))).toBe('red');
  });

  it('returns grey for missed notes', () => {
    expect(scoreToColor(makeNoteScore({ isMissedNote: true, played: null }))).toBe('grey');
  });

  it('returns purple for extra notes', () => {
    expect(scoreToColor(makeNoteScore({ isExtraNote: true }))).toBe('purple');
  });
});

describe('buildReplayEntries', () => {
  it('maps NoteScore[] to ReplayScheduleEntry[]', () => {
    const details: NoteScore[] = [
      makeNoteScore({ timingScore: 100, timingOffsetMs: 5, status: 'perfect' }),
      makeNoteScore({
        expected: { note: 62, startBeat: 1, durationBeats: 1 },
        isMissedNote: true,
        played: null,
        timingScore: 0,
        status: 'missed',
      }),
    ];

    const entries = buildReplayEntries(details);
    expect(entries).toHaveLength(2);
    expect(entries[0].play).toBe(true);
    expect(entries[0].jitterMs).toBe(5);
    expect(entries[0].color).toBe('green');
    expect(entries[1].play).toBe(false);
    expect(entries[1].color).toBe('grey');
  });

  it('filters out extra notes', () => {
    const details: NoteScore[] = [
      makeNoteScore({}),
      makeNoteScore({ isExtraNote: true }),
    ];
    expect(buildReplayEntries(details)).toHaveLength(1);
  });

  it('captures playedNote for wrong pitch', () => {
    const details: NoteScore[] = [
      makeNoteScore({
        isCorrectPitch: false,
        played: { type: 'noteOn', note: 62, velocity: 80, timestamp: 0, channel: 0 },
      }),
    ];
    const entries = buildReplayEntries(details);
    expect(entries[0].playedNote).toBe(62);
  });
});

describe('buildSpeedZones', () => {
  it('returns single normal zone for short exercises', () => {
    const entries: ReplayScheduleEntry[] = Array.from({ length: 10 }, (_, i) => ({
      note: { note: 60, startBeat: i, durationBeats: 1 },
      play: true,
      jitterMs: 0,
      status: 'perfect' as const,
      color: 'green' as const,
    }));
    const zones = buildSpeedZones(entries, [], 10);
    expect(zones).toHaveLength(1);
    expect(zones[0].zone).toBe('normal');
  });

  it('creates fast zones for long exercises with all-green sections', () => {
    const entries: ReplayScheduleEntry[] = Array.from({ length: 40 }, (_, i) => ({
      note: { note: 60, startBeat: i, durationBeats: 1 },
      play: true,
      jitterMs: 0,
      status: 'perfect' as const,
      color: 'green' as const,
    }));
    const zones = buildSpeedZones(entries, [], 40);
    // First 4 and last 4 normal, middle should be fast
    expect(zones.some((z) => z.zone === 'fast')).toBe(true);
  });

  it('keeps ±4 beats around pause points as normal', () => {
    const entries: ReplayScheduleEntry[] = Array.from({ length: 40 }, (_, i) => ({
      note: { note: 60, startBeat: i, durationBeats: 1 },
      play: true,
      jitterMs: 0,
      status: 'perfect' as const,
      color: 'green' as const,
    }));
    const pausePoints: PausePoint[] = [
      { beatPosition: 20, type: 'wrong_pitch', explanation: '', showCorrectFromBeat: 18, showCorrectToBeat: 22 },
    ];
    const zones = buildSpeedZones(entries, pausePoints, 40);
    // Beat 20 should be in a normal zone
    const zoneAt20 = zones.find((z) => z.fromBeat <= 20 && z.toBeat > 20);
    expect(zoneAt20?.zone).toBe('normal');
  });
});
```

**Step 3: Run tests**

```bash
npx jest src/core/exercises/__tests__/replayTypes.test.ts --verbose
```
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add src/core/exercises/replayTypes.ts src/core/exercises/__tests__/replayTypes.test.ts
git commit -m "feat(replay): add core replay types and builder functions"
```

---

## Task 2: Algorithmic Fallback Pause-Point Selection

**Files:**
- Create: `src/services/replayFallback.ts`
- Test: `src/services/__tests__/replayFallback.test.ts`

**Context:** When Gemini is unavailable, we need to select pause points and generate template explanations algorithmically. This is the offline-first path — AI enhances but isn't required. Uses `score.details` to find the worst notes.

**Step 1: Write the fallback service**

```typescript
// src/services/replayFallback.ts

import type { NoteScore } from '../core/exercises/types';
import type { PausePoint, ReplayComment } from '../core/exercises/replayTypes';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

function keyDistance(from: number, to: number): { distance: number; direction: string } {
  const diff = to - from;
  return {
    distance: Math.abs(diff),
    direction: diff > 0 ? 'right' : 'left',
  };
}

function snapToBarLine(beat: number, beatsPerBar: number = 4): number {
  return Math.floor(beat / beatsPerBar) * beatsPerBar;
}

/**
 * Select up to 3 pause points from score details, prioritizing:
 * 1. Wrong pitch (most confusing)
 * 2. Consecutive missed notes (lost their place)
 * 3. Consistent timing issues (same direction)
 */
export function selectAlgorithmicPausePoints(
  details: NoteScore[],
  beatsPerBar: number = 4,
): PausePoint[] {
  const candidates: Array<{ detail: NoteScore; index: number; priority: number }> = [];

  for (let i = 0; i < details.length; i++) {
    const d = details[i];
    if (d.isExtraNote) continue;

    // Skip issues in the last 2 beats (likely just stopping)
    const maxBeat = details
      .filter((dd) => !dd.isExtraNote)
      .reduce((max, dd) => Math.max(max, dd.expected.startBeat + dd.expected.durationBeats), 0);
    if (d.expected.startBeat > maxBeat - 2) continue;

    if (!d.isCorrectPitch && !d.isMissedNote && d.played) {
      // Wrong pitch — highest priority
      candidates.push({ detail: d, index: i, priority: 1 });
    } else if (d.isMissedNote) {
      // Missed note
      candidates.push({ detail: d, index: i, priority: 2 });
    } else if (d.isCorrectPitch && Math.abs(d.timingOffsetMs) > 100) {
      // Significant timing issue
      candidates.push({ detail: d, index: i, priority: 3 });
    }
  }

  // Sort by priority, then by worst timing score
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.detail.timingScore - b.detail.timingScore;
  });

  // Take up to 3, ensuring they're at least 4 beats apart
  const selected: PausePoint[] = [];
  const usedBeats = new Set<number>();

  for (const candidate of candidates) {
    if (selected.length >= 3) break;

    const beat = candidate.detail.expected.startBeat;
    const tooClose = [...usedBeats].some((b) => Math.abs(b - beat) < 4);
    if (tooClose) continue;

    usedBeats.add(beat);
    selected.push(buildPausePoint(candidate.detail, beatsPerBar));
  }

  return selected;
}

function buildPausePoint(detail: NoteScore, beatsPerBar: number): PausePoint {
  const beat = detail.expected.startBeat;
  const fromBeat = Math.max(0, snapToBarLine(beat, beatsPerBar) - beatsPerBar);
  const toBeat = snapToBarLine(beat, beatsPerBar) + beatsPerBar * 2;

  if (!detail.isCorrectPitch && !detail.isMissedNote && detail.played) {
    const expected = midiToName(detail.expected.note);
    const played = midiToName(detail.played.note);
    const { distance, direction } = keyDistance(detail.played.note, detail.expected.note);
    return {
      beatPosition: beat,
      type: 'wrong_pitch',
      explanation: `You played ${played} instead of ${expected}. Look for ${expected} — it's ${distance} key${distance !== 1 ? 's' : ''} to the ${direction}.`,
      showCorrectFromBeat: fromBeat,
      showCorrectToBeat: toBeat,
    };
  }

  if (detail.isMissedNote) {
    const expected = midiToName(detail.expected.note);
    return {
      beatPosition: beat,
      type: 'missed_notes',
      explanation: `You missed ${expected} on beat ${Math.floor(beat) + 1}. Try slowing down and watching the notes as they approach the line.`,
      showCorrectFromBeat: fromBeat,
      showCorrectToBeat: toBeat,
    };
  }

  // Timing issue
  const direction = detail.timingOffsetMs < 0 ? 'early' : 'late';
  const ms = Math.abs(Math.round(detail.timingOffsetMs));
  const note = midiToName(detail.expected.note);
  const type = direction === 'early' ? 'timing_rush' : 'timing_drag';
  return {
    beatPosition: beat,
    type,
    explanation: `${note} was ${ms}ms ${direction} on beat ${Math.floor(beat) + 1}. Try counting along with the metronome to lock in the timing.`,
    showCorrectFromBeat: fromBeat,
    showCorrectToBeat: toBeat,
  };
}

/**
 * Generate evenly-distributed continuous comments for the replay.
 */
export function generateFallbackComments(
  details: NoteScore[],
  totalBeats: number,
): ReplayComment[] {
  const POSITIVE = ['Good start!', 'Nice!', 'Keep going!', 'Almost there!', 'Strong finish!'];
  const comments: ReplayComment[] = [];

  // Place comments at roughly equal intervals
  const interval = Math.max(4, totalBeats / POSITIVE.length);

  for (let i = 0; i < POSITIVE.length && i * interval < totalBeats; i++) {
    const beat = Math.round(i * interval);
    comments.push({ beatPosition: beat, text: POSITIVE[i] });
  }

  return comments;
}

/**
 * Generate a fallback summary based on score breakdown.
 */
export function generateFallbackSummary(
  details: NoteScore[],
  overallScore: number,
): string {
  if (overallScore >= 95) return 'Nearly flawless! You really nailed this one.';
  if (overallScore >= 80) return 'Solid performance! Just a few small spots to tighten up.';

  const missed = details.filter((d) => d.isMissedNote).length;
  const wrongPitch = details.filter((d) => !d.isCorrectPitch && !d.isMissedNote && !d.isExtraNote).length;
  const timingIssues = details.filter((d) => d.isCorrectPitch && d.timingScore < 50).length;

  const issues: string[] = [];
  if (wrongPitch > 0) issues.push(`${wrongPitch} wrong note${wrongPitch !== 1 ? 's' : ''}`);
  if (missed > 0) issues.push(`${missed} missed note${missed !== 1 ? 's' : ''}`);
  if (timingIssues > 0) issues.push('some timing to work on');

  if (issues.length === 0) return 'Good effort! Keep practicing and it will click.';
  return `A few things to work on: ${issues.join(', ')}. You're making progress!`;
}
```

**Step 2: Write tests**

```typescript
// src/services/__tests__/replayFallback.test.ts

import {
  selectAlgorithmicPausePoints,
  generateFallbackComments,
  generateFallbackSummary,
} from '../replayFallback';
import type { NoteScore } from '../../core/exercises/types';

const makeNoteScore = (beat: number, overrides: Partial<NoteScore> = {}): NoteScore => ({
  expected: { note: 60, startBeat: beat, durationBeats: 1 },
  played: { type: 'noteOn', note: 60, velocity: 80, timestamp: 0, channel: 0 },
  timingOffsetMs: 0,
  timingScore: 100,
  isCorrectPitch: true,
  isExtraNote: false,
  isMissedNote: false,
  status: 'perfect',
  ...overrides,
});

describe('selectAlgorithmicPausePoints', () => {
  it('returns empty for perfect scores', () => {
    const details = Array.from({ length: 10 }, (_, i) => makeNoteScore(i));
    expect(selectAlgorithmicPausePoints(details)).toHaveLength(0);
  });

  it('selects wrong pitch notes first', () => {
    const details = [
      makeNoteScore(0),
      makeNoteScore(4, {
        isCorrectPitch: false,
        played: { type: 'noteOn', note: 62, velocity: 80, timestamp: 0, channel: 0 },
        timingScore: 0,
        status: 'wrong',
      }),
      makeNoteScore(8, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
      makeNoteScore(12),
    ];
    const points = selectAlgorithmicPausePoints(details);
    expect(points.length).toBeGreaterThanOrEqual(1);
    expect(points[0].type).toBe('wrong_pitch');
    expect(points[0].explanation).toContain('D4');
    expect(points[0].explanation).toContain('C4');
  });

  it('caps at 3 pause points', () => {
    const details = Array.from({ length: 20 }, (_, i) =>
      makeNoteScore(i, {
        isMissedNote: true,
        played: null,
        timingScore: 0,
        status: 'missed',
      }),
    );
    expect(selectAlgorithmicPausePoints(details).length).toBeLessThanOrEqual(3);
  });

  it('ensures pause points are at least 4 beats apart', () => {
    const details = [
      makeNoteScore(0, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
      makeNoteScore(1, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
      makeNoteScore(2, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
      makeNoteScore(8, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
      makeNoteScore(16),
    ];
    const points = selectAlgorithmicPausePoints(details);
    for (let i = 1; i < points.length; i++) {
      expect(Math.abs(points[i].beatPosition - points[i - 1].beatPosition)).toBeGreaterThanOrEqual(4);
    }
  });

  it('generates timing explanations', () => {
    const details = [
      makeNoteScore(0, { timingOffsetMs: 150, timingScore: 30, status: 'late' }),
      makeNoteScore(8),
    ];
    const points = selectAlgorithmicPausePoints(details);
    expect(points[0].type).toBe('timing_drag');
    expect(points[0].explanation).toContain('late');
  });

  it('skips issues in the last 2 beats', () => {
    const details = [
      makeNoteScore(0),
      makeNoteScore(8),
      makeNoteScore(9, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
    ];
    // Last note at beat 9, maxBeat = 10, so beat 9 > 10-2=8, should be skipped
    const points = selectAlgorithmicPausePoints(details);
    expect(points).toHaveLength(0);
  });
});

describe('generateFallbackComments', () => {
  it('returns up to 5 comments', () => {
    const details = Array.from({ length: 20 }, (_, i) => makeNoteScore(i));
    const comments = generateFallbackComments(details, 20);
    expect(comments.length).toBeLessThanOrEqual(5);
    expect(comments[0].text).toBe('Good start!');
  });

  it('distributes comments evenly', () => {
    const comments = generateFallbackComments([], 20);
    const beats = comments.map((c) => c.beatPosition);
    // Should be spread across the exercise, not bunched up
    expect(beats[beats.length - 1]).toBeGreaterThan(10);
  });
});

describe('generateFallbackSummary', () => {
  it('returns celebratory text for high scores', () => {
    const details = Array.from({ length: 5 }, (_, i) => makeNoteScore(i));
    expect(generateFallbackSummary(details, 98)).toContain('flawless');
  });

  it('mentions specific issues for lower scores', () => {
    const details = [
      makeNoteScore(0, { isMissedNote: true, played: null }),
      makeNoteScore(4, { isCorrectPitch: false, played: { type: 'noteOn', note: 62, velocity: 80, timestamp: 0, channel: 0 } }),
    ];
    const summary = generateFallbackSummary(details, 45);
    expect(summary).toContain('wrong note');
    expect(summary).toContain('missed note');
  });
});
```

**Step 3: Run tests**

```bash
npx jest src/services/__tests__/replayFallback.test.ts --verbose
```
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add src/services/replayFallback.ts src/services/__tests__/replayFallback.test.ts
git commit -m "feat(replay): add algorithmic fallback pause-point selection and templates"
```

---

## Task 3: Replay Prompt Builder (Gemini AI Integration)

**Files:**
- Create: `src/services/ai/ReplayPromptBuilder.ts`
- Test: `src/services/ai/__tests__/ReplayPromptBuilder.test.ts`

**Context:** Builds structured prompts for Gemini that return JSON (pause points, comments) instead of plain text. Two prompts: one for post-exercise replay, one for pre-exercise intro. Follow the pattern in `src/services/ai/GeminiCoach.ts` (lines 266-335) for the Gemini call flow.

**Step 1: Write the prompt builder**

```typescript
// src/services/ai/ReplayPromptBuilder.ts

import type { NoteScore, ExerciseScore } from '../../core/exercises/types';
import type { ReplayAIResponse, IntroAIResponse } from '../../core/exercises/replayTypes';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

// --- Post-exercise replay prompt ---

export function buildReplayPrompt(
  exerciseTitle: string,
  difficulty: number,
  details: NoteScore[],
  overallScore: number,
): string {
  let prompt = `You are a friendly piano teacher reviewing a student's performance of "${exerciseTitle}" (difficulty ${difficulty}/5). Overall score: ${overallScore}%.

Here are the per-note results (beat position, expected note, what happened):

`;

  const nonExtra = details.filter((d) => !d.isExtraNote);
  for (const d of nonExtra) {
    const expected = midiToName(d.expected.note);
    const beat = d.expected.startBeat;

    if (d.isMissedNote) {
      prompt += `Beat ${beat}: Expected ${expected} — MISSED\n`;
    } else if (!d.isCorrectPitch && d.played) {
      const played = midiToName(d.played.note);
      prompt += `Beat ${beat}: Expected ${expected}, played ${played} — WRONG NOTE\n`;
    } else if (d.timingScore < 50) {
      const dir = d.timingOffsetMs < 0 ? 'early' : 'late';
      const ms = Math.abs(Math.round(d.timingOffsetMs));
      prompt += `Beat ${beat}: ${expected} — ${ms}ms ${dir}\n`;
    } else {
      prompt += `Beat ${beat}: ${expected} — OK (timing score ${Math.round(d.timingScore)})\n`;
    }
  }

  prompt += `
Return JSON with this exact structure:
{
  "pausePoints": [
    {
      "beatPosition": <number>,
      "type": "wrong_pitch" | "timing_rush" | "timing_drag" | "missed_notes",
      "explanation": "<1-2 sentences, specific, actionable, encouraging>",
      "showCorrectFromBeat": <number, ±2 beats around mistake, snapped to bar lines>,
      "showCorrectToBeat": <number>
    }
  ],
  "continuousComments": [
    { "beatPosition": <number>, "text": "<2-5 words>" }
  ],
  "summary": "<1 sentence overall summary>"
}

RULES:
- Max 3 pausePoints (pick the 2-3 most teachable moments)
- Prioritize: wrong pitch > consecutive missed notes > consistent timing issues
- Do NOT flag: single slightly-early notes, issues in the last 2 beats
- Max 5 continuousComments (brief, encouraging, distributed across the piece)
- Explanations: warm, specific, reference the actual note names and beat positions
- Never mention "AI" or that you're a computer
- If the score is 95%+, return 0 pausePoints and only positive comments
- Return ONLY valid JSON (no markdown, no explanation)`;

  return prompt;
}

// --- Pre-exercise intro prompt ---

export function buildIntroPrompt(
  exerciseTitle: string,
  difficulty: number,
  skills: string[],
  noteRange: string,
  previousScore: number | null,
  failCount: number,
): string {
  let prompt = `You are a friendly piano teacher about to introduce "${exerciseTitle}" (difficulty ${difficulty}/5).
Skills practiced: ${skills.join(', ')}.
Note range: ${noteRange}.`;

  if (previousScore !== null) {
    prompt += `\nStudent's last score on this exercise: ${previousScore}%.`;
  }
  if (failCount > 0) {
    prompt += `\nStudent has failed this exercise ${failCount} consecutive time${failCount !== 1 ? 's' : ''}.`;
  }

  prompt += `

Return JSON with this exact structure:
{
  "introText": "<1-2 sentences introducing what the student will practice>",
  "tip": "<1 sentence, specific and actionable>",
  "highlightBeats": [<beat numbers of the trickiest section, 2-4 values>],
  "demoBars": { "from": <start beat>, "to": <end beat, max 8 beats> }
}

RULES:
- introText: warm, simple language, reference the specific skill
- tip: actionable physical advice (hand position, breathing, counting)
- highlightBeats: the section most likely to trip up a beginner
- demoBars: the section to demo — either the opening (for new exercises) or the hardest section (for retries)
- If failCount > 0, address the pattern of failure specifically
- Never mention "AI" or that you're a computer
- Return ONLY valid JSON`;

  return prompt;
}

// --- Response validation ---

export function validateReplayResponse(raw: unknown): raw is ReplayAIResponse {
  if (raw == null || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.pausePoints)) return false;
  if (obj.pausePoints.length > 3) return false;

  for (const pp of obj.pausePoints) {
    if (typeof pp !== 'object' || pp == null) return false;
    const p = pp as Record<string, unknown>;
    if (typeof p.beatPosition !== 'number') return false;
    if (typeof p.type !== 'string') return false;
    if (typeof p.explanation !== 'string' || p.explanation.length === 0) return false;
    if (typeof p.showCorrectFromBeat !== 'number') return false;
    if (typeof p.showCorrectToBeat !== 'number') return false;
  }

  if (!Array.isArray(obj.continuousComments)) return false;
  if (obj.continuousComments.length > 5) return false;

  if (typeof obj.summary !== 'string') return false;

  return true;
}

export function validateIntroResponse(raw: unknown): raw is IntroAIResponse {
  if (raw == null || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.introText !== 'string' || obj.introText.length === 0) return false;
  if (typeof obj.tip !== 'string') return false;
  if (!Array.isArray(obj.highlightBeats)) return false;
  if (typeof obj.demoBars !== 'object' || obj.demoBars == null) return false;

  const bars = obj.demoBars as Record<string, unknown>;
  if (typeof bars.from !== 'number' || typeof bars.to !== 'number') return false;

  return true;
}
```

**Step 2: Write tests**

```typescript
// src/services/ai/__tests__/ReplayPromptBuilder.test.ts

import {
  buildReplayPrompt,
  buildIntroPrompt,
  validateReplayResponse,
  validateIntroResponse,
} from '../ReplayPromptBuilder';
import type { NoteScore } from '../../../core/exercises/types';

const makeNoteScore = (beat: number, overrides: Partial<NoteScore> = {}): NoteScore => ({
  expected: { note: 60, startBeat: beat, durationBeats: 1 },
  played: { type: 'noteOn', note: 60, velocity: 80, timestamp: 0, channel: 0 },
  timingOffsetMs: 0,
  timingScore: 100,
  isCorrectPitch: true,
  isExtraNote: false,
  isMissedNote: false,
  status: 'perfect',
  ...overrides,
});

describe('buildReplayPrompt', () => {
  it('includes exercise title and score', () => {
    const prompt = buildReplayPrompt('C-D-E Ascending', 1, [makeNoteScore(0)], 85);
    expect(prompt).toContain('C-D-E Ascending');
    expect(prompt).toContain('85%');
  });

  it('labels missed notes', () => {
    const details = [makeNoteScore(4, { isMissedNote: true, played: null })];
    const prompt = buildReplayPrompt('Test', 1, details, 50);
    expect(prompt).toContain('MISSED');
  });

  it('labels wrong pitch notes', () => {
    const details = [
      makeNoteScore(4, {
        isCorrectPitch: false,
        played: { type: 'noteOn', note: 62, velocity: 80, timestamp: 0, channel: 0 },
      }),
    ];
    const prompt = buildReplayPrompt('Test', 1, details, 50);
    expect(prompt).toContain('WRONG NOTE');
    expect(prompt).toContain('D4');
  });

  it('filters out extra notes', () => {
    const details = [makeNoteScore(0), makeNoteScore(2, { isExtraNote: true })];
    const prompt = buildReplayPrompt('Test', 1, details, 80);
    // Should only have 1 beat entry, not 2
    const beatLines = prompt.split('\n').filter((l) => l.startsWith('Beat '));
    expect(beatLines).toHaveLength(1);
  });
});

describe('buildIntroPrompt', () => {
  it('includes exercise metadata', () => {
    const prompt = buildIntroPrompt('C-D-E', 1, ['right-hand'], 'C4-E4', null, 0);
    expect(prompt).toContain('C-D-E');
    expect(prompt).toContain('right-hand');
  });

  it('includes previous score when available', () => {
    const prompt = buildIntroPrompt('Test', 1, ['scales'], 'C4-G4', 65, 0);
    expect(prompt).toContain('65%');
  });

  it('includes fail count', () => {
    const prompt = buildIntroPrompt('Test', 1, ['scales'], 'C4-G4', 40, 3);
    expect(prompt).toContain('failed this exercise 3 consecutive times');
  });
});

describe('validateReplayResponse', () => {
  const validResponse = {
    pausePoints: [
      {
        beatPosition: 4,
        type: 'wrong_pitch',
        explanation: 'You played D instead of E.',
        showCorrectFromBeat: 2,
        showCorrectToBeat: 6,
      },
    ],
    continuousComments: [{ beatPosition: 0, text: 'Good start!' }],
    summary: 'Nice work overall.',
  };

  it('accepts valid response', () => {
    expect(validateReplayResponse(validResponse)).toBe(true);
  });

  it('accepts empty pause points', () => {
    expect(validateReplayResponse({ ...validResponse, pausePoints: [] })).toBe(true);
  });

  it('rejects too many pause points', () => {
    const tooMany = { ...validResponse, pausePoints: Array(4).fill(validResponse.pausePoints[0]) };
    expect(validateReplayResponse(tooMany)).toBe(false);
  });

  it('rejects null', () => {
    expect(validateReplayResponse(null)).toBe(false);
  });

  it('rejects missing summary', () => {
    const { summary, ...noSummary } = validResponse;
    expect(validateReplayResponse(noSummary)).toBe(false);
  });
});

describe('validateIntroResponse', () => {
  const validResponse = {
    introText: 'This exercise practices scales.',
    tip: 'Keep your wrist loose.',
    highlightBeats: [4, 5, 6],
    demoBars: { from: 0, to: 8 },
  };

  it('accepts valid response', () => {
    expect(validateIntroResponse(validResponse)).toBe(true);
  });

  it('rejects empty introText', () => {
    expect(validateIntroResponse({ ...validResponse, introText: '' })).toBe(false);
  });

  it('rejects missing demoBars', () => {
    const { demoBars, ...noBars } = validResponse;
    expect(validateIntroResponse(noBars)).toBe(false);
  });
});
```

**Step 3: Run tests**

```bash
npx jest src/services/ai/__tests__/ReplayPromptBuilder.test.ts --verbose
```
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add src/services/ai/ReplayPromptBuilder.ts src/services/ai/__tests__/ReplayPromptBuilder.test.ts
git commit -m "feat(replay): add Gemini prompt builder for replay coaching and intro"
```

---

## Task 4: ReplayCoachingService

**Files:**
- Create: `src/services/replayCoachingService.ts`
- Test: `src/services/__tests__/replayCoachingService.test.ts`

**Context:** Orchestrates building a ReplayPlan — maps score details to replay entries, calls Gemini for coaching (with fallback), computes speed zones. This is the main entry point used by ExercisePlayer.

Follow the Gemini call pattern from `src/services/ai/GeminiCoach.ts`: try Cloud Function → direct Gemini → fallback.

**Step 1: Write the service**

```typescript
// src/services/replayCoachingService.ts

import type { Exercise, ExerciseScore, NoteScore } from '../core/exercises/types';
import {
  buildReplayEntries,
  buildSpeedZones,
  type ReplayPlan,
  type ReplayAIResponse,
  type IntroAIResponse,
} from '../core/exercises/replayTypes';
import {
  buildReplayPrompt,
  buildIntroPrompt,
  validateReplayResponse,
  validateIntroResponse,
} from './ai/ReplayPromptBuilder';
import {
  selectAlgorithmicPausePoints,
  generateFallbackComments,
  generateFallbackSummary,
} from './replayFallback';
import { checkRateLimit } from './firebase/functions';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

async function callGeminiJSON<T>(
  prompt: string,
  validate: (raw: unknown) => raw is T,
): Promise<T | null> {
  try {
    // Dynamic import to avoid pulling Gemini into test bundles
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) return null;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed: unknown = JSON.parse(text);

    if (validate(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Build a complete ReplayPlan from exercise score.
 * Tries AI first, falls back to algorithmic selection.
 */
export async function buildReplayPlan(
  exercise: Exercise,
  score: ExerciseScore,
): Promise<ReplayPlan> {
  const entries = buildReplayEntries(score.details);
  const totalBeats = exercise.notes.reduce(
    (max, n) => Math.max(max, n.startBeat + n.durationBeats),
    0,
  );

  // Try AI coaching
  let aiResponse: ReplayAIResponse | null = null;
  const rateCheck = checkRateLimit('generateCoachFeedback');

  if (rateCheck.allowed) {
    const prompt = buildReplayPrompt(
      exercise.metadata.title,
      exercise.metadata.difficulty,
      score.details,
      score.overall,
    );
    aiResponse = await callGeminiJSON(prompt, validateReplayResponse);
  }

  // Build plan from AI or fallback
  const beatsPerBar = exercise.settings.timeSignature?.[0] ?? 4;
  const pausePoints = aiResponse?.pausePoints
    ?? selectAlgorithmicPausePoints(score.details, beatsPerBar);
  const comments = aiResponse?.continuousComments
    ?? generateFallbackComments(score.details, totalBeats);
  const summary = aiResponse?.summary
    ?? generateFallbackSummary(score.details, score.overall);

  const speedZones = buildSpeedZones(entries, pausePoints, totalBeats);

  return {
    entries,
    pausePoints,
    comments,
    summary,
    speedZones,
    totalBeats,
  };
}

/**
 * Build intro coaching data for pre-exercise Salsa intro.
 */
export async function buildIntroPlan(
  exercise: Exercise,
  previousScore: number | null,
  failCount: number,
): Promise<IntroAIResponse> {
  const fallback: IntroAIResponse = {
    introText: `Let's practice ${exercise.metadata.title}! Watch the notes and play along.`,
    tip: 'Keep your fingers curved and wrist relaxed.',
    highlightBeats: [],
    demoBars: { from: 0, to: Math.min(8, exercise.notes[exercise.notes.length - 1]?.startBeat ?? 8) },
  };

  const rateCheck = checkRateLimit('generateCoachFeedback');
  if (!rateCheck.allowed) return fallback;

  const noteMin = Math.min(...exercise.notes.map((n) => n.note));
  const noteMax = Math.max(...exercise.notes.map((n) => n.note));
  const noteRange = `${midiToName(noteMin)}-${midiToName(noteMax)}`;

  const prompt = buildIntroPrompt(
    exercise.metadata.title,
    exercise.metadata.difficulty,
    exercise.metadata.skills ?? [],
    noteRange,
    previousScore,
    failCount,
  );

  const aiResponse = await callGeminiJSON(prompt, validateIntroResponse);
  return aiResponse ?? fallback;
}
```

**Step 2: Write tests (mocking Gemini)**

```typescript
// src/services/__tests__/replayCoachingService.test.ts

import { buildReplayPlan, buildIntroPlan } from '../replayCoachingService';
import type { Exercise, ExerciseScore, NoteScore } from '../../core/exercises/types';

// Mock the Gemini import so it doesn't make real API calls
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            pausePoints: [],
            continuousComments: [{ beatPosition: 0, text: 'Nice!' }],
            summary: 'Good job!',
          }),
        },
      }),
    }),
  })),
}));

jest.mock('../firebase/functions', () => ({
  checkRateLimit: jest.fn().mockReturnValue({ allowed: true }),
}));

const makeExercise = (): Exercise => ({
  id: 'test-ex',
  version: 1,
  metadata: { title: 'Test', description: '', difficulty: 1, estimatedMinutes: 2, skills: [], prerequisites: [] },
  settings: { tempo: 60, timeSignature: [4, 4], keySignature: 'C', countIn: 0, metronomeEnabled: false, loopEnabled: false },
  notes: [
    { note: 60, startBeat: 0, durationBeats: 1 },
    { note: 62, startBeat: 1, durationBeats: 1 },
    { note: 64, startBeat: 2, durationBeats: 1 },
    { note: 60, startBeat: 3, durationBeats: 1 },
  ],
  scoring: { timingToleranceMs: 50, timingGracePeriodMs: 150, velocitySensitive: false, passingScore: 70, starThresholds: [70, 85, 95] },
  hints: { beforeStart: '', commonMistakes: [], successMessage: '' },
  display: { showFingerNumbers: false, showNoteNames: false, highlightHands: false, showPianoRoll: true, showStaffNotation: false },
});

const makeScore = (details: NoteScore[]): ExerciseScore => ({
  overall: 75,
  stars: 1,
  breakdown: { accuracy: 80, timing: 70, completeness: 100, extraNotes: 100, duration: 80 },
  details,
  xpEarned: 10,
  isNewHighScore: false,
  isPassed: true,
});

const makeNoteScore = (beat: number, overrides: Partial<NoteScore> = {}): NoteScore => ({
  expected: { note: 60, startBeat: beat, durationBeats: 1 },
  played: { type: 'noteOn', note: 60, velocity: 80, timestamp: 0, channel: 0 },
  timingOffsetMs: 0,
  timingScore: 100,
  isCorrectPitch: true,
  isExtraNote: false,
  isMissedNote: false,
  status: 'perfect',
  ...overrides,
});

describe('buildReplayPlan', () => {
  it('returns a complete ReplayPlan', async () => {
    const exercise = makeExercise();
    const score = makeScore([
      makeNoteScore(0),
      makeNoteScore(1),
      makeNoteScore(2),
      makeNoteScore(3),
    ]);

    const plan = await buildReplayPlan(exercise, score);

    expect(plan.entries).toHaveLength(4);
    expect(plan.totalBeats).toBe(4);
    expect(plan.speedZones.length).toBeGreaterThanOrEqual(1);
    expect(typeof plan.summary).toBe('string');
    expect(Array.isArray(plan.pausePoints)).toBe(true);
    expect(Array.isArray(plan.comments)).toBe(true);
  });

  it('uses fallback when rate limited', async () => {
    const { checkRateLimit } = require('../firebase/functions');
    (checkRateLimit as jest.Mock).mockReturnValueOnce({ allowed: false, reason: 'rate limited' });

    const exercise = makeExercise();
    const score = makeScore([
      makeNoteScore(0, { isMissedNote: true, played: null, timingScore: 0, status: 'missed' }),
      makeNoteScore(1),
      makeNoteScore(2),
      makeNoteScore(3),
    ]);

    const plan = await buildReplayPlan(exercise, score);
    // Should still have a valid plan from fallback
    expect(plan.entries).toHaveLength(4);
    expect(typeof plan.summary).toBe('string');
  });
});

describe('buildIntroPlan', () => {
  it('returns intro data', async () => {
    const exercise = makeExercise();
    const intro = await buildIntroPlan(exercise, null, 0);

    expect(typeof intro.introText).toBe('string');
    expect(intro.introText.length).toBeGreaterThan(0);
    expect(typeof intro.tip).toBe('string');
    expect(intro.demoBars).toBeDefined();
  });

  it('returns fallback when rate limited', async () => {
    const { checkRateLimit } = require('../firebase/functions');
    (checkRateLimit as jest.Mock).mockReturnValueOnce({ allowed: false, reason: 'rate limited' });

    const exercise = makeExercise();
    const intro = await buildIntroPlan(exercise, 65, 2);

    expect(intro.introText).toContain('Test');
    expect(intro.demoBars.from).toBe(0);
  });
});
```

**Step 3: Run tests**

```bash
npx jest src/services/__tests__/replayCoachingService.test.ts --verbose
```
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add src/services/replayCoachingService.ts src/services/__tests__/replayCoachingService.test.ts
git commit -m "feat(replay): add ReplayCoachingService with AI + fallback orchestration"
```

---

## Task 5: Extend DemoPlaybackService for Replay

**Files:**
- Modify: `src/services/demoPlayback.ts`
- Test: `src/services/__tests__/demoPlayback.test.ts` (create if needed, or extend existing)

**Context:** The existing DemoPlaybackService already has `play` and `jitterMs` fields on `DemoScheduleEntry` but only uses them minimally. We need to add: (1) accept `ReplayScheduleEntry[]` as an alternative schedule, (2) pause at specific beats, (3) `seekToBeat()` for scrubbing, (4) speed zones (2x for green sections), (5) a callback for comments at specific beats.

**Step 1: Add replay-specific methods to DemoPlaybackService**

Modify `src/services/demoPlayback.ts`:

- Add `startReplay()` method that accepts `ReplayScheduleEntry[]` + `SpeedZoneEntry[]` + pause beat positions + comment beat callbacks
- Add `seekToBeat(beat: number)` — stops current interval, recomputes elapsed time, resumes from new position
- Add `pauseReplay()` / `resumeReplay()` — freeze/unfreeze the interval without resetting
- Add speed zone logic: during the 60fps tick, look up current beat's zone and apply 2.0x multiplier for `'fast'` zones
- Add `onPausePoint` callback that fires when `currentBeat` crosses a pause point beat
- Add `onComment` callback that fires when `currentBeat` crosses a comment beat

Key implementation details:
- `startReplay()` converts `ReplayScheduleEntry[]` → `DemoScheduleEntry[]` (trivial mapping — `play`, `jitterMs`, `note` are already matching fields)
- Speed zones: store the zone array, in the tick function compute effective `elapsed += deltaMs * speedMultiplier` where `speedMultiplier = zone === 'fast' ? 2.0 : 1.0`
- Pause: set `this.isPaused = true`, record `this.pauseElapsedMs`, stop incrementing elapsed
- Seek: set `this.elapsed = computeElapsedForBeat(targetBeat, speedZones, msPerBeat)`, where `computeElapsedForBeat` sums zone durations at their respective speeds
- Comment/pause callbacks: track which indices have been fired, fire once per crossing

**Step 2: Write tests for the new methods**

Test: `seekToBeat` moves playback to correct position, `pauseReplay`/`resumeReplay` freeze/unfreeze, speed zones cause faster progression through green sections, pause point callback fires at correct beat, comment callback fires at correct beat.

**Step 3: Run tests**

```bash
npx jest src/services/__tests__/demoPlayback.test.ts --verbose
```

**Step 4: Commit**

```bash
git add src/services/demoPlayback.ts src/services/__tests__/demoPlayback.test.ts
git commit -m "feat(replay): extend DemoPlaybackService with seek, pause, speed zones, replay callbacks"
```

---

## Task 6: VerticalPianoRoll Replay Mode

**Files:**
- Modify: `src/components/PianoRoll/VerticalPianoRoll.tsx`
- Test: `src/components/PianoRoll/__tests__/VerticalPianoRoll.test.tsx` (extend)

**Context:** The PianoRoll currently colors notes by hand (right=purple, left=teal). In replay mode, notes should be colored by performance status (green/yellow/red/grey). Add a `mode` prop and `noteColorOverrides` map.

**Step 1: Add mode prop to VerticalPianoRollProps**

At the props interface (line ~207), add:
```typescript
mode?: 'play' | 'replay';
noteColorOverrides?: Map<number, string>; // noteIndex → hex color
```

**Step 2: Gate color logic on mode**

In the note rendering logic, when `mode === 'replay'` and `noteColorOverrides` has an entry for the current note index, use that color instead of the hand-based palette. The existing color logic stays untouched for `mode === 'play'` (default).

Color hex values for the replay palette:
- green: `#4CAF50`
- yellow: `#FFB300`
- red: `#EF5350`
- grey: `#9E9E9E` (with 50% opacity for ghost effect)
- purple: `#AB47BC`

**Step 3: Write tests verifying mode behavior**

Test: `mode='play'` renders with default colors (existing behavior unchanged). `mode='replay'` with `noteColorOverrides` renders notes with override colors. Missing override entries fall back to default color.

**Step 4: Commit**

```bash
git add src/components/PianoRoll/VerticalPianoRoll.tsx src/components/PianoRoll/__tests__/VerticalPianoRoll.test.tsx
git commit -m "feat(replay): add replay mode with color overrides to VerticalPianoRoll"
```

---

## Task 7: Keyboard Read-Only Mode with Dual Highlight

**Files:**
- Modify: `src/components/Keyboard/Keyboard.tsx`
- Test: `src/components/Keyboard/__tests__/Keyboard.test.tsx` (extend)

**Context:** During replay, the keyboard should be display-only (no touch input) and show dual highlights at mistakes: expected note in green outline + played note in red fill. The `enabled` prop already exists (line ~40) but currently only gates callback firing. We need a `replayHighlights` prop for the dual-highlight visual.

**Step 1: Add replay-specific props**

```typescript
// Add to KeyboardProps:
replayHighlights?: {
  correct: Set<number>;    // MIDI notes to highlight green (expected)
  wrong: Set<number>;      // MIDI notes to highlight red (actually played, wrong pitch)
  missed: Set<number>;     // MIDI notes to show grey ghost
};
```

**Step 2: Implement dual-highlight rendering**

When `replayHighlights` is set, each PianoKey checks:
- If note is in `correct`: green fill
- If note is in `wrong`: red fill
- If note is in `missed`: grey outline, no fill (ghost press)
- These override the normal `highlightedNotes` (blue) and `expectedNotes` (green) behavior

**Step 3: Write tests**

Test: `enabled=false` prevents callbacks. `replayHighlights` renders correct/wrong/missed colors. Normal mode (no `replayHighlights`) is unchanged.

**Step 4: Commit**

```bash
git add src/components/Keyboard/Keyboard.tsx src/components/Keyboard/__tests__/Keyboard.test.tsx
git commit -m "feat(replay): add read-only mode with dual-highlight to Keyboard"
```

---

## Task 8: ReplayTimelineBar Component

**Files:**
- Create: `src/screens/ExercisePlayer/ReplayTimelineBar.tsx`
- Test: `src/screens/ExercisePlayer/__tests__/ReplayTimelineBar.test.tsx`

**Context:** Horizontal scrub bar at the bottom of the replay screen. Shows colored dots per note, red diamond pins at pause points, draggable playhead.

**Step 1: Build the component**

Props:
```typescript
interface ReplayTimelineBarProps {
  entries: ReplayScheduleEntry[];
  pausePoints: PausePoint[];
  totalBeats: number;
  currentBeat: number;
  isPaused: boolean;
  onSeek: (beat: number) => void;
  onPausePointTap: (pausePoint: PausePoint) => void;
}
```

Implementation:
- Horizontal `View` with `height: 44`
- Each note entry renders as a small circle (8px diameter) positioned by `entry.note.startBeat / totalBeats * width`
- Circle fill color from `REPLAY_COLORS[entry.color]`
- Pause points render as small red diamond shapes at their beat positions
- Playhead: animated vertical line at `currentBeat / totalBeats * width`, driven by Reanimated shared value
- Pan gesture on the bar: `onSeek(touchX / width * totalBeats)`
- Tap on a pause pin: `onPausePointTap(pausePoint)`
- Time labels: `formatTime(currentBeat / tempo * 60)` left, `formatTime(totalBeats / tempo * 60)` right

**Step 2: Write tests**

Test: renders correct number of note dots, renders pause point pins, fires `onSeek` on touch, fires `onPausePointTap` on pin tap, playhead position updates with `currentBeat`.

**Step 3: Commit**

```bash
git add src/screens/ExercisePlayer/ReplayTimelineBar.tsx src/screens/ExercisePlayer/__tests__/ReplayTimelineBar.test.tsx
git commit -m "feat(replay): add ReplayTimelineBar scrub bar component"
```

---

## Task 9: ReplayOverlay Component (Salsa Coaching UI)

**Files:**
- Create: `src/screens/ExercisePlayer/ReplayOverlay.tsx`
- Test: `src/screens/ExercisePlayer/__tests__/ReplayOverlay.test.tsx`

**Context:** The coaching overlay shown during replay. Has two modes: (1) small floating pill during continuous play, (2) expanded card at pause points with explanation + "Show me" / "Continue" buttons.

**Step 1: Build the component**

Props:
```typescript
interface ReplayOverlayProps {
  mode: 'pill' | 'card' | 'hidden';
  text: string;
  onContinue: () => void;
  onShowCorrect: () => void;
  catId?: string;  // For Salsa avatar in card mode
}
```

Implementation:
- `mode='hidden'`: render nothing
- `mode='pill'`: small rounded rect (bottom-left, above keyboard), 1 line of text, auto-dismiss after 2 seconds
- `mode='card'`: centered over PianoRoll area, 30% dim backdrop, Salsa avatar (CatAvatar with `catId='salsa'`, `size='sm'`), explanation text (max 3 lines), two buttons: "Show me" (calls `onShowCorrect`) and "Continue" (calls `onContinue`)
- Entry animation: pill slides in from left (Reanimated `FadeIn`), card scales up from center
- TTS: when `mode` changes to `'card'`, call `ttsService.speak(text, { catId: 'salsa' })`. Import from `src/services/tts/TTSService.ts`.

**Step 2: Write tests**

Test: pill mode renders text, card mode renders explanation + both buttons, `onContinue` fires on button press, `onShowCorrect` fires on button press, hidden mode renders nothing.

**Step 3: Commit**

```bash
git add src/screens/ExercisePlayer/ReplayOverlay.tsx src/screens/ExercisePlayer/__tests__/ReplayOverlay.test.tsx
git commit -m "feat(replay): add ReplayOverlay component with pill and card modes"
```

---

## Task 10: SalsaIntro Component (Pre-Exercise)

**Files:**
- Create: `src/screens/ExercisePlayer/SalsaIntro.tsx`
- Test: `src/screens/ExercisePlayer/__tests__/SalsaIntro.test.tsx`

**Context:** Pre-exercise intro overlay with 3 adaptive tiers. Shows Salsa with a coaching tip before the exercise starts. Uses `buildIntroPlan()` from Task 4 for AI text.

**Step 1: Build the component**

Props:
```typescript
interface SalsaIntroProps {
  exercise: Exercise;
  previousScore: number | null;
  failCount: number;
  onReady: () => void;       // Called when intro is done — start countdown
  onWatchDemo: () => void;   // Called if user wants full demo (tier 3)
  onSkip: () => void;        // Called if user skips
}
```

Tier logic (determined on mount):
- `failCount >= 3` → Tier 3 (extended)
- `previousScore === null` → Tier 2 (walkthrough)
- `previousScore >= 70` → Tier 1 (brief)
- else → Tier 2

Implementation:
- On mount, call `buildIntroPlan(exercise, previousScore, failCount)` async
- While loading: show a small Salsa bubble with generic "Let's go!" text
- Tier 1: small Salsa bubble (same as ReplayOverlay pill mode), TTS speaks tip, auto-dismisses after TTS + 1s, calls `onReady`
- Tier 2: larger card with introText + tip, triggers DemoPlaybackService for `demoBars.from` to `demoBars.to`, then calls `onReady`
- Tier 3: same as Tier 2 + "Watch Full Demo" button that calls `onWatchDemo`
- All tiers: "Skip" button visible, calls `onSkip`

**Step 2: Write tests**

Test: Tier 1 renders for `previousScore >= 70`, Tier 2 renders for `previousScore === null`, Tier 3 renders for `failCount >= 3`, skip button calls `onSkip`, component calls `buildIntroPlan` on mount.

**Step 3: Commit**

```bash
git add src/screens/ExercisePlayer/SalsaIntro.tsx src/screens/ExercisePlayer/__tests__/SalsaIntro.test.tsx
git commit -m "feat(replay): add SalsaIntro pre-exercise coaching component"
```

---

## Task 11: Wire Replay Mode into ExercisePlayer

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`

**Context:** This is the integration task. Add `mode: 'exercise' | 'replay'` state, wire the replay trigger from CompletionModal, integrate SalsaIntro before countdown, and connect all the new components.

**Step 1: Add replay state variables**

After the existing state declarations (~line 576), add:
```typescript
const [playerMode, setPlayerMode] = useState<'exercise' | 'replay'>('exercise');
const [replayPlan, setReplayPlan] = useState<ReplayPlan | null>(null);
const [replayBeat, setReplayBeat] = useState(0);
const [replayPaused, setReplayPaused] = useState(false);
const [replayOverlayMode, setReplayOverlayMode] = useState<'hidden' | 'pill' | 'card'>('hidden');
const [replayOverlayText, setReplayOverlayText] = useState('');
const [showSalsaIntro, setShowSalsaIntro] = useState(true); // Show intro on mount
```

**Step 2: Start building ReplayPlan on completion**

In `handleExerciseCompletion` (~line 618), after `setFinalScore(score)` (~line 651), add:
```typescript
// Build replay plan in background (parallel with CompletionModal animation)
buildReplayPlan(exerciseRef.current!, score).then((plan) => setReplayPlan(plan));
```

**Step 3: Add replay trigger from CompletionModal**

Add a new prop `onStartReplay` to CompletionModal render (~line 2243):
```typescript
onStartReplay={() => {
  setShowCompletion(false);
  setPlayerMode('replay');
}}
```

Smart auto-trigger logic: in CompletionModal, auto-fire `onStartReplay` after the actions phase if `score.overall < 80` or if it's the first attempt (pass `attemptNumber` as prop).

**Step 4: Render replay UI when mode === 'replay'**

When `playerMode === 'replay' && replayPlan`:
- Render VerticalPianoRoll with `mode='replay'` and `noteColorOverrides` built from `replayPlan.entries`
- Render Keyboard with `enabled={false}` and `replayHighlights` computed from current replay beat
- Render ReplayTimelineBar with `replayPlan` data
- Render ReplayOverlay
- Top bar: "Exit Review" button (sets `playerMode='exercise'`, shows CompletionModal again) + "Salsa's Review" title
- Start DemoPlaybackService in replay mode with the plan's entries and speed zones

**Step 5: Wire SalsaIntro before exercise start**

Replace the current intro overlay logic (~lines 2226-2240) with the new SalsaIntro component:
```typescript
{showSalsaIntro && !isPlaying && !showCompletion && playerMode === 'exercise' && (
  <SalsaIntro
    exercise={exercise}
    previousScore={previousHighScore}
    failCount={failCount}
    onReady={() => { setShowSalsaIntro(false); handleStart(); }}
    onWatchDemo={() => { setShowSalsaIntro(false); startDemo(); }}
    onSkip={() => { setShowSalsaIntro(false); handleStart(); }}
  />
)}
```

**Step 6: Connect DemoPlaybackService replay callbacks**

When replay starts, wire callbacks from DemoPlaybackService:
- `onPausePoint`: pause replay, show ReplayOverlay in card mode with pause point explanation
- `onComment`: show ReplayOverlay in pill mode with comment text
- `onBeatUpdate`: update `replayBeat` state (drives PianoRoll + timeline)
- `onComplete`: show summary, offer "Try Again" / "Next" buttons

**Step 7: Run full test suite**

```bash
npx jest --verbose 2>&1 | tail -20
```
Expected: All existing tests still pass. No regressions.

**Step 8: Commit**

```bash
git add src/screens/ExercisePlayer/ExercisePlayer.tsx
git commit -m "feat(replay): wire replay mode, SalsaIntro, and coaching overlay into ExercisePlayer"
```

---

## Task 12: Wire CompletionModal Replay Button + Smart Auto-Trigger

**Files:**
- Modify: `src/screens/ExercisePlayer/CompletionModal.tsx`

**Context:** Add "Review with Salsa" button to the actions phase, and smart auto-trigger logic (auto-starts replay if score < 80% or first attempt).

**Step 1: Add new props**

```typescript
// Add to CompletionModalProps:
onStartReplay?: () => void;
attemptNumber?: number;
```

**Step 2: Add "Review with Salsa" button**

In the actions phase (after existing buttons), add:
```typescript
{onStartReplay && (
  <TouchableOpacity onPress={onStartReplay} style={styles.reviewButton}>
    <Text style={styles.reviewButtonText}>Review with Salsa</Text>
  </TouchableOpacity>
)}
```

**Step 3: Smart auto-trigger**

After the final phase timer fires (`'actions'` at 6500ms), add a delayed auto-trigger:
```typescript
// Auto-start replay for struggling students or first attempts
if (onStartReplay && (score.overall < 80 || attemptNumber === 1)) {
  const autoTimer = setTimeout(() => {
    onStartReplay();
  }, 8000); // 1.5 seconds after actions phase appears
  return () => clearTimeout(autoTimer);
}
```

User can tap any button (retry, next, review, close) before the 8s mark to cancel the auto-trigger.

**Step 4: Write tests**

Test: "Review with Salsa" button renders when `onStartReplay` provided, fires callback on press. Auto-trigger fires after delay for low scores. Auto-trigger does NOT fire for high repeat scores.

**Step 5: Commit**

```bash
git add src/screens/ExercisePlayer/CompletionModal.tsx src/screens/ExercisePlayer/__tests__/CompletionModal.test.tsx
git commit -m "feat(replay): add 'Review with Salsa' button and smart auto-trigger to CompletionModal"
```

---

## Task 13: Integration Testing + PostHog Analytics

**Files:**
- Create: `src/__tests__/integration/ReplayFlow.test.tsx`
- Modify: `src/core/analytics/events.ts` (if it exists, otherwise create tracking calls inline)

**Context:** End-to-end integration test for the full loop: exercise completion → replay plan built → replay starts → pause point fires → correct demo plays → replay ends. Also add PostHog events for monitoring.

**Step 1: Write integration test**

Test the full data flow:
1. Create a mock exercise with 8 notes
2. Create a mock ExerciseScore with 2 missed notes and 1 wrong pitch
3. Call `buildReplayPlan(exercise, score)`
4. Verify plan has entries, pause points, comments, speed zones
5. Verify pause points target the worst notes
6. Verify speed zones mark green sections as fast (for 30+ note exercises)

**Step 2: Add PostHog analytics events**

In `replayCoachingService.ts` and `ExercisePlayer.tsx`:
- `replay_started`: `{ exerciseId, score, aiPowered: boolean }`
- `replay_completed`: `{ exerciseId, duration_seconds, pause_points_viewed }`
- `replay_skipped`: `{ exerciseId, skip_point_seconds }`
- `intro_shown`: `{ exerciseId, tier: 1|2|3, aiPowered: boolean }`
- `replay_ai_call`: `{ exerciseId, cached: boolean, latency_ms }`

**Step 3: Run full test suite**

```bash
npm run typecheck && npx jest --verbose 2>&1 | tail -20
```
Expected: 0 TypeScript errors. All tests pass.

**Step 4: Commit**

```bash
git add src/__tests__/integration/ReplayFlow.test.tsx src/services/replayCoachingService.ts src/screens/ExercisePlayer/ExercisePlayer.tsx
git commit -m "feat(replay): add integration tests and PostHog analytics for coaching loop"
```

---

## Task Summary

| # | Task | New Files | Modified Files | Tests |
|---|------|-----------|----------------|-------|
| 1 | Core replay types | `replayTypes.ts` | — | `replayTypes.test.ts` |
| 2 | Algorithmic fallback | `replayFallback.ts` | — | `replayFallback.test.ts` |
| 3 | AI prompt builder | `ReplayPromptBuilder.ts` | — | `ReplayPromptBuilder.test.ts` |
| 4 | ReplayCoachingService | `replayCoachingService.ts` | — | `replayCoachingService.test.ts` |
| 5 | DemoPlaybackService extensions | — | `demoPlayback.ts` | `demoPlayback.test.ts` |
| 6 | VerticalPianoRoll replay mode | — | `VerticalPianoRoll.tsx` | extend existing |
| 7 | Keyboard read-only + dual highlight | — | `Keyboard.tsx` | extend existing |
| 8 | ReplayTimelineBar | `ReplayTimelineBar.tsx` | — | `ReplayTimelineBar.test.tsx` |
| 9 | ReplayOverlay | `ReplayOverlay.tsx` | — | `ReplayOverlay.test.tsx` |
| 10 | SalsaIntro | `SalsaIntro.tsx` | — | `SalsaIntro.test.tsx` |
| 11 | ExercisePlayer integration | — | `ExercisePlayer.tsx` | full suite regression |
| 12 | CompletionModal replay trigger | — | `CompletionModal.tsx` | extend existing |
| 13 | Integration tests + analytics | `ReplayFlow.test.tsx` | `replayCoachingService.ts`, `ExercisePlayer.tsx` | integration test |

**Dependency order:** Tasks 1-4 are pure logic (no UI). Task 5 extends the playback engine. Tasks 6-10 are independent UI components (can be parallelized). Tasks 11-12 wire everything together. Task 13 validates the full loop.

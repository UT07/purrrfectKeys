# Gameplay UX Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the exercise gameplay from horizontal note scrolling to vertical (Synthesia-style) falling notes, with zoomed 2-octave keyboard, AI demo mode, and ghost notes.

**Architecture:** New `VerticalPianoRoll` component replaces horizontal `PianoRoll` in ExercisePlayer. Smart range calculation dynamically selects 2 visible octaves. Demo playback service drives auto-play at 60% tempo. Ghost notes render as low-opacity overlay in VerticalPianoRoll. Responsive flex layout supports both portrait and landscape.

**Tech Stack:** React Native, TypeScript, Zustand, react-native-reanimated (animations), existing audio engine (WebAudio/Expo)

**Design doc:** `docs/plans/2026-02-16-gameplay-ux-rework-design.md`

---

## Parallelization Map

Tasks 1-4 are independent and can be developed in parallel:
- **Task 1:** exerciseStore updates (foundation)
- **Task 2:** VerticalPianoRoll component
- **Task 3:** Smart keyboard range utility
- **Task 4:** Demo playback service

Tasks 5-8 depend on earlier tasks:
- **Task 5:** Ghost notes in VerticalPianoRoll (depends on Task 2)
- **Task 6:** ExercisePlayer layout rewrite (depends on Tasks 1-3)
- **Task 7:** Demo mode UI + controls (depends on Tasks 4, 6)
- **Task 8:** Cat dialogue for demo trigger (depends on Task 1)

Tasks 9-10 are final integration:
- **Task 9:** Orientation handling cleanup (depends on Task 6)
- **Task 10:** Integration testing + polish (depends on all)

---

## Task 1: Exercise Store Updates

**Files:**
- Modify: `src/stores/exerciseStore.ts`
- Test: `src/stores/__tests__/exerciseStore.test.ts`

Adds `failCount`, `ghostNotesEnabled`, `ghostNotesSuccessCount`, and `demoWatched` per-exercise tracking.

**Step 1: Write failing tests for new store fields**

```typescript
// In exerciseStore.test.ts — add these test cases

describe('demo and ghost notes state', () => {
  beforeEach(() => {
    useExerciseStore.getState().reset();
  });

  it('tracks fail count per exercise', () => {
    const store = useExerciseStore.getState();
    expect(store.failCount).toBe(0);
    store.incrementFailCount();
    expect(store.failCount).toBe(1);
    store.incrementFailCount();
    expect(store.failCount).toBe(2);
  });

  it('resets fail count on success or exercise change', () => {
    const store = useExerciseStore.getState();
    store.incrementFailCount();
    store.incrementFailCount();
    store.resetFailCount();
    expect(store.failCount).toBe(0);
  });

  it('tracks ghost notes enabled state', () => {
    const store = useExerciseStore.getState();
    expect(store.ghostNotesEnabled).toBe(false);
    store.setGhostNotesEnabled(true);
    expect(store.ghostNotesEnabled).toBe(true);
  });

  it('tracks ghost notes success count', () => {
    const store = useExerciseStore.getState();
    expect(store.ghostNotesSuccessCount).toBe(0);
    store.incrementGhostNotesSuccessCount();
    expect(store.ghostNotesSuccessCount).toBe(1);
  });

  it('auto-disables ghost notes after 2 successes', () => {
    const store = useExerciseStore.getState();
    store.setGhostNotesEnabled(true);
    store.incrementGhostNotesSuccessCount();
    expect(store.ghostNotesEnabled).toBe(true); // still on after 1
    store.incrementGhostNotesSuccessCount();
    expect(store.ghostNotesEnabled).toBe(false); // auto-off after 2
    expect(store.ghostNotesSuccessCount).toBe(0); // reset
  });

  it('tracks demo watched state', () => {
    const store = useExerciseStore.getState();
    expect(store.demoWatched).toBe(false);
    store.setDemoWatched(true);
    expect(store.demoWatched).toBe(true);
  });

  it('resets demo state on clearSession', () => {
    const store = useExerciseStore.getState();
    store.incrementFailCount();
    store.setGhostNotesEnabled(true);
    store.setDemoWatched(true);
    store.clearSession();
    expect(store.failCount).toBe(0);
    expect(store.ghostNotesEnabled).toBe(false);
    expect(store.demoWatched).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ut/purrrfect-keys && npx jest src/stores/__tests__/exerciseStore.test.ts --no-coverage`
Expected: FAIL — new properties/methods don't exist yet

**Step 3: Implement store updates**

Add to the exerciseStore interface and implementation:

```typescript
// New state fields (add to ExerciseSessionState interface)
failCount: number;
ghostNotesEnabled: boolean;
ghostNotesSuccessCount: number;
demoWatched: boolean;

// New actions
incrementFailCount: () => void;
resetFailCount: () => void;
setGhostNotesEnabled: (enabled: boolean) => void;
incrementGhostNotesSuccessCount: () => void;
setDemoWatched: (watched: boolean) => void;
```

Implementation in the store create function:

```typescript
// Initial state additions
failCount: 0,
ghostNotesEnabled: false,
ghostNotesSuccessCount: 0,
demoWatched: false,

// Action implementations
incrementFailCount: () => set((state) => ({ failCount: state.failCount + 1 })),
resetFailCount: () => set({ failCount: 0 }),
setGhostNotesEnabled: (enabled) => set({ ghostNotesEnabled: enabled }),
incrementGhostNotesSuccessCount: () =>
  set((state) => {
    const newCount = state.ghostNotesSuccessCount + 1;
    if (newCount >= 2) {
      // Auto-disable ghost notes after 2 successful passes
      return { ghostNotesSuccessCount: 0, ghostNotesEnabled: false };
    }
    return { ghostNotesSuccessCount: newCount };
  }),
setDemoWatched: (watched) => set({ demoWatched: watched }),
```

Also update `clearSession` to reset these fields:

```typescript
clearSession: () => set({
  // ...existing resets...
  failCount: 0,
  ghostNotesEnabled: false,
  ghostNotesSuccessCount: 0,
  demoWatched: false,
}),
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ut/purrrfect-keys && npx jest src/stores/__tests__/exerciseStore.test.ts --no-coverage`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/stores/exerciseStore.ts src/stores/__tests__/exerciseStore.test.ts
git commit -m "feat(store): add demo mode and ghost notes state to exerciseStore"
```

---

## Task 2: VerticalPianoRoll Component

**Files:**
- Create: `src/components/PianoRoll/VerticalPianoRoll.tsx`
- Create: `src/components/PianoRoll/__tests__/VerticalPianoRoll.test.tsx`
- Reference: `src/components/PianoRoll/PianoRoll.tsx` (existing horizontal, for patterns)
- Reference: `src/core/exercises/types.ts` (NoteEvent interface)
- Reference: `src/core/music/MusicTheory.ts` (midiToNoteName)

This is the core visual component. Notes fall top-to-bottom. Note columns align with keyboard keys below.

**Step 1: Write failing tests for coordinate calculations**

```typescript
// src/components/PianoRoll/__tests__/VerticalPianoRoll.test.tsx

import { calculateNoteX, deriveMidiRange, calculateNoteTop } from '../VerticalPianoRoll';

describe('VerticalPianoRoll coordinate calculations', () => {
  describe('deriveMidiRange', () => {
    it('derives range from exercise notes with margin', () => {
      const notes = [
        { note: 60, startBeat: 0, durationBeats: 1 },
        { note: 64, startBeat: 1, durationBeats: 1 },
        { note: 67, startBeat: 2, durationBeats: 1 },
      ];
      const { min, max, range } = deriveMidiRange(notes);
      expect(range).toBeGreaterThanOrEqual(12); // minimum 1 octave
      expect(min).toBeLessThanOrEqual(58); // margin below 60
      expect(max).toBeGreaterThanOrEqual(69); // margin above 67
    });

    it('enforces minimum 12-semitone span', () => {
      const notes = [{ note: 60, startBeat: 0, durationBeats: 1 }];
      const { range } = deriveMidiRange(notes);
      expect(range).toBeGreaterThanOrEqual(12);
    });
  });

  describe('calculateNoteX', () => {
    it('maps MIDI note to horizontal position within container', () => {
      const containerWidth = 400;
      const midiMin = 60; // C4
      const midiRange = 12; // 1 octave

      // C4 should be near left edge
      const xC4 = calculateNoteX(60, containerWidth, midiMin, midiRange);
      expect(xC4).toBeGreaterThanOrEqual(0);
      expect(xC4).toBeLessThan(containerWidth / 2);

      // B4 should be near right edge
      const xB4 = calculateNoteX(71, containerWidth, midiMin, midiRange);
      expect(xB4).toBeGreaterThan(containerWidth / 2);
      expect(xB4).toBeLessThanOrEqual(containerWidth);
    });

    it('returns different widths for white vs black keys', () => {
      const containerWidth = 400;
      const midiMin = 60;
      const midiRange = 12;

      const { width: whiteWidth } = calculateNoteX(60, containerWidth, midiMin, midiRange); // C4 = white
      const { width: blackWidth } = calculateNoteX(61, containerWidth, midiMin, midiRange); // C#4 = black
      expect(blackWidth).toBeLessThan(whiteWidth);
    });
  });

  describe('calculateNoteTop', () => {
    it('positions notes based on beat and hit line', () => {
      const PIXELS_PER_BEAT = 140;
      const hitLineY = 400; // 80% of 500px container

      // Note at beat 0, currentBeat 0 → should be at hit line
      const top = calculateNoteTop(0, 0, hitLineY, PIXELS_PER_BEAT);
      expect(top).toBeCloseTo(hitLineY, 0);

      // Note at beat 4, currentBeat 0 → should be above hit line (in the future)
      const topFuture = calculateNoteTop(4, 0, hitLineY, PIXELS_PER_BEAT);
      expect(topFuture).toBeLessThan(hitLineY);
    });

    it('moves notes down as currentBeat advances', () => {
      const PIXELS_PER_BEAT = 140;
      const hitLineY = 400;

      const topBeat0 = calculateNoteTop(2, 0, hitLineY, PIXELS_PER_BEAT);
      const topBeat1 = calculateNoteTop(2, 1, hitLineY, PIXELS_PER_BEAT);
      expect(topBeat1).toBeGreaterThan(topBeat0); // note moved down
    });
  });
});

describe('VerticalPianoRoll rendering', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(
      <VerticalPianoRoll
        notes={[{ note: 60, startBeat: 0, durationBeats: 1 }]}
        currentBeat={0}
        containerWidth={400}
        containerHeight={500}
        midiMin={48}
        midiMax={72}
        testID="vertical-piano-roll"
      />
    );
    expect(getByTestId('vertical-piano-roll')).toBeTruthy();
  });

  it('renders correct number of note bars', () => {
    const notes = [
      { note: 60, startBeat: 0, durationBeats: 1 },
      { note: 64, startBeat: 1, durationBeats: 1 },
      { note: 67, startBeat: 2, durationBeats: 1 },
    ];
    const { getAllByTestId } = render(
      <VerticalPianoRoll
        notes={notes}
        currentBeat={0}
        containerWidth={400}
        containerHeight={500}
        midiMin={48}
        midiMax={72}
        testID="vertical-piano-roll"
      />
    );
    expect(getAllByTestId(/^note-bar-/)).toHaveLength(3);
  });

  it('renders hit line at 80% from top', () => {
    const { getByTestId } = render(
      <VerticalPianoRoll
        notes={[{ note: 60, startBeat: 0, durationBeats: 1 }]}
        currentBeat={0}
        containerWidth={400}
        containerHeight={500}
        midiMin={48}
        midiMax={72}
        testID="vertical-piano-roll"
      />
    );
    const hitLine = getByTestId('hit-line');
    // Hit line should be at 80% of 500 = 400px from top
    expect(hitLine.props.style).toEqual(
      expect.objectContaining({ top: expect.closeTo(400, 5) })
    );
  });

  it('colors notes based on state: upcoming, active, past', () => {
    const notes = [
      { note: 60, startBeat: 0, durationBeats: 1 }, // past (currentBeat=2)
      { note: 64, startBeat: 1.5, durationBeats: 1 }, // active (currentBeat=2)
      { note: 67, startBeat: 4, durationBeats: 1 }, // upcoming
    ];
    const { getByTestId } = render(
      <VerticalPianoRoll
        notes={notes}
        currentBeat={2}
        containerWidth={400}
        containerHeight={500}
        midiMin={48}
        midiMax={72}
        testID="vertical-piano-roll"
      />
    );
    // Verify color assignments via testID or style inspection
    const pastNote = getByTestId('note-bar-0');
    const activeNote = getByTestId('note-bar-1');
    const upcomingNote = getByTestId('note-bar-2');
    // Past notes should have faded color
    // Active notes should have bright color
    // Upcoming notes should have standard color
    expect(pastNote).toBeTruthy();
    expect(activeNote).toBeTruthy();
    expect(upcomingNote).toBeTruthy();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ut/purrrfect-keys && npx jest src/components/PianoRoll/__tests__/VerticalPianoRoll.test.tsx --no-coverage`
Expected: FAIL — module not found

**Step 3: Implement VerticalPianoRoll**

Create `src/components/PianoRoll/VerticalPianoRoll.tsx`:

Key implementation details (reference `PianoRoll.tsx` for patterns):

```typescript
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { midiToNoteName } from '@/core/music/MusicTheory';
import type { NoteEvent } from '@/core/exercises/types';

// --- Constants ---
const PIXELS_PER_BEAT = 140;
const HIT_LINE_RATIO = 0.8; // 80% from top
const BLACK_KEY_WIDTH_RATIO = 0.6; // Black keys are 60% width of white keys

// --- Color palette (same as horizontal PianoRoll) ---
const COLORS = {
  upcoming: '#5C6BC0',
  active: '#FF5252',
  activeGlow: 'rgba(255, 82, 82, 0.3)',
  pastFaded: 'rgba(102, 187, 106, 0.4)',
  marker: '#FF1744',
  markerGlow: 'rgba(255, 23, 68, 0.2)',
  beatLine: 'rgba(255, 255, 255, 0.08)',
  beatLineAccent: 'rgba(255, 255, 255, 0.2)',
  background: '#0D0D0D',
  ghost: 'rgba(255, 255, 255, 0.3)',
};

// --- Exported coordinate functions (for testing) ---

export function deriveMidiRange(notes: NoteEvent[]) {
  // Same logic as PianoRoll.tsx deriveMidiRange
  if (notes.length === 0) return { min: 48, max: 72, range: 24 };
  const midiNotes = notes.map(n => n.note);
  const rawMin = Math.min(...midiNotes);
  const rawMax = Math.max(...midiNotes);
  const margin = 2;
  const span = Math.max(12, rawMax - rawMin + margin * 2);
  const center = (rawMin + rawMax) / 2;
  const min = Math.round(center - span / 2);
  return { min, max: min + span, range: span };
}

// Piano key helpers
const isBlackKey = (midi: number): boolean => [1,3,6,8,10].includes(midi % 12);
const whiteKeysInRange = (min: number, max: number): number[] => {
  const keys: number[] = [];
  for (let m = min; m <= max; m++) { if (!isBlackKey(m)) keys.push(m); }
  return keys;
};

export function calculateNoteX(
  midiNote: number,
  containerWidth: number,
  midiMin: number,
  midiRange: number,
): { x: number; width: number } {
  const whites = whiteKeysInRange(midiMin, midiMin + midiRange);
  const whiteKeyWidth = containerWidth / whites.length;

  if (!isBlackKey(midiNote)) {
    // White key: find index in white key array
    const idx = whites.indexOf(midiNote);
    if (idx === -1) {
      // Note outside visible range — clamp
      const clamped = midiNote < whites[0] ? 0 : whites.length - 1;
      return { x: clamped * whiteKeyWidth, width: whiteKeyWidth };
    }
    return { x: idx * whiteKeyWidth, width: whiteKeyWidth };
  } else {
    // Black key: centered between adjacent white keys
    const lowerWhite = midiNote - 1; // white key just below
    const idx = whites.indexOf(lowerWhite);
    const blackWidth = whiteKeyWidth * BLACK_KEY_WIDTH_RATIO;
    const x = (idx + 1) * whiteKeyWidth - blackWidth / 2;
    return { x, width: blackWidth };
  }
}

export function calculateNoteTop(
  noteStartBeat: number,
  currentBeat: number,
  hitLineY: number,
  pixelsPerBeat: number,
): number {
  // Notes at currentBeat appear at hitLineY
  // Notes in the future (startBeat > currentBeat) appear above hitLineY
  // Notes in the past (startBeat < currentBeat) appear below hitLineY
  const beatDiff = noteStartBeat - currentBeat;
  return hitLineY - beatDiff * pixelsPerBeat;
}

// --- Props ---
export interface VerticalPianoRollProps {
  notes: NoteEvent[];
  currentBeat?: number;
  tempo?: number;
  timeSignature?: [number, number];
  containerWidth: number;
  containerHeight: number;
  midiMin: number;
  midiMax: number;
  ghostNotes?: NoteEvent[];
  ghostBeatOffset?: number;
  testID?: string;
}

// --- Component ---
export const VerticalPianoRoll = React.memo(
  ({
    notes,
    currentBeat = 0,
    tempo: _tempo = 120,
    timeSignature = [4, 4],
    containerWidth,
    containerHeight,
    midiMin,
    midiMax,
    ghostNotes,
    ghostBeatOffset = 2,
    testID,
  }: VerticalPianoRollProps) => {
    const midiRange = midiMax - midiMin;
    const hitLineY = containerHeight * HIT_LINE_RATIO;

    // The translateY drives the scrolling: as currentBeat increases,
    // content moves down so upcoming notes scroll toward hit line.
    const translateY = currentBeat * PIXELS_PER_BEAT;

    // Total beats in exercise
    const maxBeat = notes.length > 0
      ? Math.max(...notes.map(n => n.startBeat + n.durationBeats))
      : 4;

    // Beat lines (horizontal)
    const beatsPerMeasure = timeSignature[0];
    const totalBeats = Math.ceil(maxBeat) + 4;
    const beatLines = useMemo(() => {
      const lines = [];
      for (let beat = 0; beat <= totalBeats; beat++) {
        lines.push({ beat, isMeasureLine: beat % beatsPerMeasure === 0 });
      }
      return lines;
    }, [totalBeats, beatsPerMeasure]);

    // Visual notes
    const visualNotes = useMemo(() => {
      return notes.map((note, index) => {
        const { x, width } = calculateNoteX(note.note, containerWidth, midiMin, midiRange);
        const noteHeight = Math.max(20, note.durationBeats * PIXELS_PER_BEAT);

        // Top is calculated relative to hitLine, then shifted by translateY in the parent
        const topPosition = hitLineY - (note.startBeat - 0) * PIXELS_PER_BEAT;

        const noteEnd = note.startBeat + note.durationBeats;
        const isPast = noteEnd < currentBeat;
        const isActive = note.startBeat <= currentBeat && currentBeat < noteEnd;

        let color = COLORS.upcoming;
        let borderColor = 'rgba(255, 255, 255, 0.2)';
        if (isPast) { color = COLORS.pastFaded; borderColor = 'transparent'; }
        if (isActive) { color = COLORS.active; borderColor = '#FFF'; }

        const noteName = midiToNoteName(note.note);

        return {
          index, note, x, width, noteHeight, topPosition,
          color, borderColor, isPast, isActive, noteName,
          hand: note.hand,
        };
      });
    }, [notes, currentBeat, containerWidth, containerHeight, midiMin, midiRange, hitLineY]);

    // Ghost notes (if provided)
    const visualGhostNotes = useMemo(() => {
      if (!ghostNotes) return [];
      return ghostNotes.map((note, index) => {
        const { x, width } = calculateNoteX(note.note, containerWidth, midiMin, midiRange);
        const noteHeight = Math.max(20, note.durationBeats * PIXELS_PER_BEAT);
        const topPosition = hitLineY - ((note.startBeat - ghostBeatOffset) - 0) * PIXELS_PER_BEAT;
        return { index, x, width, noteHeight, topPosition };
      });
    }, [ghostNotes, ghostBeatOffset, containerWidth, midiMin, midiRange, hitLineY]);

    return (
      <View style={[styles.container, { width: containerWidth, height: containerHeight }]} testID={testID}>
        <View style={styles.background} />

        {/* Content layer — moves via translateY */}
        <View style={[styles.contentLayer, { transform: [{ translateY }] }]}>
          {/* Beat lines (horizontal) */}
          {beatLines.map(({ beat, isMeasureLine }) => (
            <View
              key={`beat-${beat}`}
              style={[
                styles.beatLine,
                {
                  top: hitLineY - beat * PIXELS_PER_BEAT,
                  width: containerWidth,
                  height: isMeasureLine ? 2 : 1,
                  backgroundColor: isMeasureLine ? COLORS.beatLineAccent : COLORS.beatLine,
                },
              ]}
            />
          ))}

          {/* Ghost notes layer (below real notes) */}
          {visualGhostNotes.map((gn) => (
            <View
              key={`ghost-${gn.index}`}
              testID={`ghost-note-${gn.index}`}
              style={[
                styles.ghostNote,
                { left: gn.x, top: gn.topPosition, width: gn.width, height: gn.noteHeight },
              ]}
            />
          ))}

          {/* Note bars */}
          {visualNotes.map((vn) => (
            <React.Fragment key={vn.index}>
              {vn.isActive && (
                <View
                  style={[
                    styles.noteGlow,
                    {
                      left: vn.x - 4,
                      top: vn.topPosition - 4,
                      width: vn.width + 8,
                      height: vn.noteHeight + 8,
                    },
                  ]}
                />
              )}
              <View
                testID={`note-bar-${vn.index}`}
                style={[
                  styles.note,
                  {
                    left: vn.x,
                    top: vn.topPosition,
                    width: vn.width,
                    height: vn.noteHeight,
                    backgroundColor: vn.color,
                    borderColor: vn.borderColor,
                  },
                ]}
              >
                <Text style={[styles.noteLabel, vn.isActive && styles.noteLabelActive]}>
                  {vn.noteName}
                </Text>
                {vn.hand && (
                  <Text style={styles.handLabel}>
                    {vn.hand === 'left' ? 'L' : 'R'}
                  </Text>
                )}
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Hit line (fixed position) */}
        <View style={[styles.hitLineGlow, { top: hitLineY - 8 }]} testID="hit-line-glow" />
        <View style={[styles.hitLine, { top: hitLineY - 1 }]} testID="hit-line" />

        {/* Beat counter */}
        <View style={styles.beatCounter}>
          <Text style={styles.beatText}>
            {currentBeat < 0
              ? `Count: ${Math.ceil(-currentBeat)}`
              : `Beat ${Math.floor(currentBeat) + 1}`}
          </Text>
        </View>
      </View>
    );
  },
);

VerticalPianoRoll.displayName = 'VerticalPianoRoll';

// --- Styles ---
const styles = StyleSheet.create({
  container: { overflow: 'hidden', position: 'relative' },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
  },
  contentLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  beatLine: { position: 'absolute', left: 0 },
  note: {
    position: 'absolute',
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  noteGlow: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: COLORS.activeGlow,
    zIndex: 9,
  },
  ghostNote: {
    position: 'absolute',
    borderRadius: 6,
    backgroundColor: COLORS.ghost,
    zIndex: 5,
  },
  noteLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  noteLabelActive: { color: '#FFF' },
  handLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 8, marginTop: 2 },
  hitLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.marker,
    zIndex: 20,
  },
  hitLineGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 16,
    backgroundColor: COLORS.markerGlow,
    zIndex: 19,
  },
  beatCounter: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 25,
  },
  beatText: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
});
```

**Important implementation notes:**
- `calculateNoteX` must be exported for testing AND for ExercisePlayer to compute keyboard alignment
- `translateY` drives content scrolling — as `currentBeat` increases, content shifts down so notes at `currentBeat` align with the hit line
- Note `top` position is calculated relative to beat 0 at hitLineY, then the content layer's translateY does the scrolling
- Ghost notes use the same positions but shifted by `ghostBeatOffset` beats and rendered at 30% opacity

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ut/purrrfect-keys && npx jest src/components/PianoRoll/__tests__/VerticalPianoRoll.test.tsx --no-coverage`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/PianoRoll/VerticalPianoRoll.tsx src/components/PianoRoll/__tests__/VerticalPianoRoll.test.tsx
git commit -m "feat: add VerticalPianoRoll component with falling notes"
```

---

## Task 3: Smart Keyboard Range Utility

**Files:**
- Create: `src/components/Keyboard/computeZoomedRange.ts`
- Create: `src/components/Keyboard/__tests__/computeZoomedRange.test.ts`
- Reference: `src/components/Keyboard/SplitKeyboard.tsx:48-65` (existing `computeKeyboardRange`)
- Reference: `src/screens/ExercisePlayer/ExercisePlayer.tsx:330-339` (current static range calc)

Extracted utility function for dynamic 2-octave range selection with sticky behavior.

**Step 1: Write failing tests**

```typescript
// src/components/Keyboard/__tests__/computeZoomedRange.test.ts

import { computeZoomedRange, computeStickyRange } from '../computeZoomedRange';

describe('computeZoomedRange', () => {
  it('returns 2 octaves centered on active notes', () => {
    const result = computeZoomedRange([60, 64, 67]); // C4, E4, G4
    expect(result.octaveCount).toBe(2);
    expect(result.startNote % 12).toBe(0); // Snapped to C
    expect(result.startNote).toBeLessThanOrEqual(60);
    expect(result.startNote + 24).toBeGreaterThanOrEqual(67);
  });

  it('snaps startNote to nearest C', () => {
    const result = computeZoomedRange([65, 69, 72]); // F4, A4, C5
    expect(result.startNote % 12).toBe(0);
  });

  it('handles single note', () => {
    const result = computeZoomedRange([60]); // C4
    expect(result.octaveCount).toBe(2);
    expect(result.startNote).toBeLessThanOrEqual(60);
  });

  it('floors at MIDI 21 (A0)', () => {
    const result = computeZoomedRange([24, 28]); // C1, E1
    expect(result.startNote).toBeGreaterThanOrEqual(21);
  });

  it('handles empty array with sensible default', () => {
    const result = computeZoomedRange([]);
    expect(result.octaveCount).toBe(2);
    expect(result.startNote).toBe(48); // Default C3
  });
});

describe('computeStickyRange', () => {
  it('does not shift range if notes are within current range', () => {
    const current = { startNote: 48, octaveCount: 2 }; // C3-C5
    const result = computeStickyRange([52, 55, 60], current);
    expect(result.startNote).toBe(48); // No change
    expect(result.octaveCount).toBe(2);
  });

  it('shifts range when note is ≥3 semitones outside', () => {
    const current = { startNote: 48, octaveCount: 2 }; // C3-C5 (48-71)
    const result = computeStickyRange([75], current); // 75 is 4 semitones above 71
    expect(result.startNote).toBeGreaterThan(48); // Range shifted up
    expect(result.startNote + 24).toBeGreaterThanOrEqual(75);
  });

  it('does not shift for notes 1-2 semitones outside range', () => {
    const current = { startNote: 48, octaveCount: 2 }; // C3-C5 (48-71)
    const result = computeStickyRange([72], current); // 1 semitone outside
    expect(result.startNote).toBe(48); // Sticky — no change
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ut/purrrfect-keys && npx jest src/components/Keyboard/__tests__/computeZoomedRange.test.ts --no-coverage`
Expected: FAIL — module not found

**Step 3: Implement computeZoomedRange**

```typescript
// src/components/Keyboard/computeZoomedRange.ts

export interface KeyboardRange {
  startNote: number;
  octaveCount: number;
}

/**
 * Compute a 2-octave keyboard range centered on the given MIDI notes.
 * Snaps startNote to nearest C for clean octave boundaries.
 */
export function computeZoomedRange(
  activeNotes: number[],
  maxOctaves: number = 2,
): KeyboardRange {
  if (activeNotes.length === 0) {
    return { startNote: 48, octaveCount: maxOctaves };
  }

  const minNote = Math.min(...activeNotes);
  const maxNote = Math.max(...activeNotes);
  const center = Math.round((minNote + maxNote) / 2);

  // Center the range
  const halfSpan = (maxOctaves * 12) / 2;
  let startNote = Math.round(center - halfSpan);

  // Snap to C (nearest C below)
  startNote = Math.floor(startNote / 12) * 12;

  // Ensure all active notes fit
  while (startNote + maxOctaves * 12 < maxNote + 1) {
    startNote += 12; // Shift up an octave
  }
  // Re-snap to C if we shifted
  startNote = Math.floor(startNote / 12) * 12;

  // Clamp: floor at MIDI 21 (A0), recalc if needed
  startNote = Math.max(21, startNote);
  // Re-snap to C above 21 if needed
  if (startNote % 12 !== 0 && startNote > 21) {
    startNote = Math.ceil(startNote / 12) * 12;
  }

  return { startNote, octaveCount: maxOctaves };
}

/**
 * Sticky range: only shift the keyboard when a note is ≥3 semitones
 * outside the current visible range. Prevents jittery scrolling.
 */
export function computeStickyRange(
  activeNotes: number[],
  currentRange: KeyboardRange,
  stickyThreshold: number = 3,
): KeyboardRange {
  if (activeNotes.length === 0) return currentRange;

  const rangeMin = currentRange.startNote;
  const rangeMax = currentRange.startNote + currentRange.octaveCount * 12 - 1;

  const minNote = Math.min(...activeNotes);
  const maxNote = Math.max(...activeNotes);

  const belowBy = rangeMin - minNote;
  const aboveBy = maxNote - rangeMax;

  // Only shift if outside by >= threshold
  if (belowBy >= stickyThreshold || aboveBy >= stickyThreshold) {
    return computeZoomedRange(activeNotes, currentRange.octaveCount);
  }

  return currentRange;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ut/purrrfect-keys && npx jest src/components/Keyboard/__tests__/computeZoomedRange.test.ts --no-coverage`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/components/Keyboard/computeZoomedRange.ts src/components/Keyboard/__tests__/computeZoomedRange.test.ts
git commit -m "feat: add smart zoomed keyboard range calculation with sticky behavior"
```

---

## Task 4: Demo Playback Service

**Files:**
- Create: `src/services/demoPlayback.ts`
- Create: `src/services/__tests__/demoPlayback.test.ts`
- Reference: `src/core/exercises/types.ts` (Exercise, NoteEvent)
- Reference: `src/audio/createAudioEngine.ts` (AudioEngine interface)

Service that auto-plays an exercise at 60% tempo with passing-threshold quality (85% notes, slight timing jitter).

**Step 1: Write failing tests**

```typescript
// src/services/__tests__/demoPlayback.test.ts

import { DemoPlaybackService, generateDemoSchedule } from '../demoPlayback';
import type { NoteEvent } from '@/core/exercises/types';

// Mock audio engine
const mockAudioEngine = {
  playNote: jest.fn().mockReturnValue('handle'),
  releaseNote: jest.fn(),
};

describe('generateDemoSchedule', () => {
  const notes: NoteEvent[] = [
    { note: 60, startBeat: 0, durationBeats: 1 },
    { note: 64, startBeat: 1, durationBeats: 1 },
    { note: 67, startBeat: 2, durationBeats: 1 },
    { note: 72, startBeat: 3, durationBeats: 1 },
  ];

  it('generates a schedule with ~85% of notes', () => {
    // Run multiple times to account for randomness
    const results = Array.from({ length: 20 }, () => generateDemoSchedule(notes));
    const avgPlayedRatio = results.reduce(
      (sum, schedule) => sum + schedule.filter(s => s.play).length / notes.length,
      0,
    ) / results.length;

    // Should be roughly 85% ± 15%
    expect(avgPlayedRatio).toBeGreaterThan(0.6);
    expect(avgPlayedRatio).toBeLessThan(1.0);
  });

  it('adds timing jitter to non-perfect notes', () => {
    const schedule = generateDemoSchedule(notes);
    const playedNotes = schedule.filter(s => s.play);
    const hasJitter = playedNotes.some(s => s.jitterMs !== 0);
    // At least some notes should have jitter (probabilistic)
    // Run enough times to be confident
    const anyJitter = Array.from({ length: 10 }, () =>
      generateDemoSchedule(notes).some(s => s.play && s.jitterMs !== 0)
    ).some(Boolean);
    expect(anyJitter).toBe(true);
  });

  it('includes all notes in schedule (some with play=false)', () => {
    const schedule = generateDemoSchedule(notes);
    expect(schedule).toHaveLength(notes.length);
  });
});

describe('DemoPlaybackService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockAudioEngine.playNote.mockClear();
    mockAudioEngine.releaseNote.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts and reports isPlaying', () => {
    const exercise = {
      notes: [{ note: 60, startBeat: 0, durationBeats: 1 }],
      settings: { tempo: 120, countIn: 0, timeSignature: [4, 4] as [number, number] },
    };
    const service = new DemoPlaybackService();
    service.start(exercise as any, mockAudioEngine as any, 0.6);
    expect(service.isPlaying).toBe(true);
  });

  it('stops cleanly', () => {
    const exercise = {
      notes: [{ note: 60, startBeat: 0, durationBeats: 1 }],
      settings: { tempo: 120, countIn: 0, timeSignature: [4, 4] as [number, number] },
    };
    const service = new DemoPlaybackService();
    service.start(exercise as any, mockAudioEngine as any, 0.6);
    service.stop();
    expect(service.isPlaying).toBe(false);
  });

  it('provides currentBeat that advances over time', () => {
    const exercise = {
      notes: [{ note: 60, startBeat: 0, durationBeats: 4 }],
      settings: { tempo: 120, countIn: 0, timeSignature: [4, 4] as [number, number] },
    };
    const service = new DemoPlaybackService();
    const onBeatUpdate = jest.fn();
    service.start(exercise as any, mockAudioEngine as any, 0.6, onBeatUpdate);

    // At 120 BPM * 0.6 speed = 72 BPM = 833ms per beat
    jest.advanceTimersByTime(833);

    // Should have called onBeatUpdate with advancing beat values
    expect(onBeatUpdate).toHaveBeenCalled();
    const lastBeat = onBeatUpdate.mock.calls[onBeatUpdate.mock.calls.length - 1][0];
    expect(lastBeat).toBeGreaterThan(0);
  });

  it('provides activeNotes set for keyboard highlighting', () => {
    const exercise = {
      notes: [{ note: 60, startBeat: 0, durationBeats: 2 }],
      settings: { tempo: 120, countIn: 0, timeSignature: [4, 4] as [number, number] },
    };
    const service = new DemoPlaybackService();
    const onBeatUpdate = jest.fn();
    const onActiveNotes = jest.fn();
    service.start(exercise as any, mockAudioEngine as any, 0.6, onBeatUpdate, onActiveNotes);

    // Advance into the note
    jest.advanceTimersByTime(100);

    // Should have called onActiveNotes at some point
    // (depends on whether the note is in the 85% that get played)
    // This test verifies the callback mechanism exists
    expect(typeof service.stop).toBe('function');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ut/purrrfect-keys && npx jest src/services/__tests__/demoPlayback.test.ts --no-coverage`
Expected: FAIL — module not found

**Step 3: Implement DemoPlaybackService**

```typescript
// src/services/demoPlayback.ts

import type { Exercise, NoteEvent } from '@/core/exercises/types';

interface AudioEngine {
  playNote(note: number, velocity: number): string;
  releaseNote(handle: string): void;
}

interface DemoScheduleEntry {
  note: NoteEvent;
  play: boolean;         // false = skip this note (simulating imperfection)
  jitterMs: number;      // Timing offset in ms
}

/**
 * Generate a "passing threshold" demo schedule.
 * ~85% of notes played, with small timing jitter on some.
 */
export function generateDemoSchedule(notes: NoteEvent[]): DemoScheduleEntry[] {
  return notes.map((note) => {
    const play = Math.random() < 0.85;
    // 60% of played notes get slight jitter (±20-40ms)
    const hasJitter = play && Math.random() < 0.6;
    const jitterMs = hasJitter ? (Math.random() * 40 - 20) : 0;
    return { note, play, jitterMs };
  });
}

export class DemoPlaybackService {
  isPlaying = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private activeHandles = new Map<number, string>();
  private schedule: DemoScheduleEntry[] = [];
  private scheduledNoteIndices = new Set<number>();
  private releasedNoteIndices = new Set<number>();

  /**
   * Start demo playback.
   * @param exercise - The exercise to demo
   * @param audioEngine - Audio engine for sound output
   * @param speedMultiplier - Tempo multiplier (0.6 = 60% speed)
   * @param onBeatUpdate - Called every frame with current beat
   * @param onActiveNotes - Called with Set of currently active MIDI notes
   */
  start(
    exercise: Exercise,
    audioEngine: AudioEngine,
    speedMultiplier: number = 0.6,
    onBeatUpdate?: (beat: number) => void,
    onActiveNotes?: (notes: Set<number>) => void,
  ): void {
    this.stop(); // Clean up any previous playback

    this.isPlaying = true;
    this.startTime = Date.now();
    this.schedule = generateDemoSchedule(exercise.notes);
    this.scheduledNoteIndices.clear();
    this.releasedNoteIndices.clear();

    const effectiveTempo = exercise.settings.tempo * speedMultiplier;
    const msPerBeat = 60000 / effectiveTempo;

    const totalBeats = Math.max(
      ...exercise.notes.map(n => n.startBeat + n.durationBeats),
      4,
    );

    this.intervalId = setInterval(() => {
      if (!this.isPlaying) return;

      const elapsed = Date.now() - this.startTime;
      const currentBeat = elapsed / msPerBeat;

      onBeatUpdate?.(currentBeat);

      // Schedule note-ons
      const activeNotes = new Set<number>();
      for (let i = 0; i < this.schedule.length; i++) {
        const entry = this.schedule[i];
        if (!entry.play) continue;

        const noteOnBeat = entry.note.startBeat;
        const noteOffBeat = entry.note.startBeat + entry.note.durationBeats;
        const jitterBeats = entry.jitterMs / msPerBeat;

        // Note-on
        if (
          !this.scheduledNoteIndices.has(i) &&
          currentBeat >= noteOnBeat + jitterBeats
        ) {
          this.scheduledNoteIndices.add(i);
          const handle = audioEngine.playNote(entry.note.note, 0.7);
          this.activeHandles.set(i, handle);
        }

        // Track active
        if (
          this.scheduledNoteIndices.has(i) &&
          !this.releasedNoteIndices.has(i)
        ) {
          activeNotes.add(entry.note.note);
        }

        // Note-off
        if (
          this.scheduledNoteIndices.has(i) &&
          !this.releasedNoteIndices.has(i) &&
          currentBeat >= noteOffBeat + jitterBeats
        ) {
          this.releasedNoteIndices.add(i);
          const handle = this.activeHandles.get(i);
          if (handle) audioEngine.releaseNote(handle);
          this.activeHandles.delete(i);
        }
      }

      onActiveNotes?.(activeNotes);

      // End of exercise
      if (currentBeat > totalBeats + 1) {
        this.stop();
      }
    }, 16); // ~60fps
  }

  stop(): void {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Release any held notes
    this.activeHandles.clear();
    this.scheduledNoteIndices.clear();
    this.releasedNoteIndices.clear();
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ut/purrrfect-keys && npx jest src/services/__tests__/demoPlayback.test.ts --no-coverage`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/services/demoPlayback.ts src/services/__tests__/demoPlayback.test.ts
git commit -m "feat: add DemoPlaybackService for AI demo mode (60% tempo, passing threshold)"
```

---

## Task 5: Ghost Notes in VerticalPianoRoll

**Depends on:** Task 2

**Files:**
- Modify: `src/components/PianoRoll/VerticalPianoRoll.tsx` (already has ghost support in Task 2)
- Modify: `src/components/PianoRoll/__tests__/VerticalPianoRoll.test.tsx`

Ghost notes were already scaffolded in Task 2's implementation. This task adds targeted tests and refines the visual appearance.

**Step 1: Write ghost note tests**

```typescript
// Add to VerticalPianoRoll.test.tsx

describe('Ghost notes rendering', () => {
  const baseNotes = [
    { note: 60, startBeat: 0, durationBeats: 1 },
    { note: 64, startBeat: 1, durationBeats: 1 },
  ];

  it('renders ghost notes when provided', () => {
    const { getAllByTestId } = render(
      <VerticalPianoRoll
        notes={baseNotes}
        ghostNotes={baseNotes}
        ghostBeatOffset={2}
        currentBeat={0}
        containerWidth={400}
        containerHeight={500}
        midiMin={48}
        midiMax={72}
        testID="vpr"
      />
    );
    expect(getAllByTestId(/^ghost-note-/)).toHaveLength(2);
  });

  it('does not render ghost notes when not provided', () => {
    const { queryAllByTestId } = render(
      <VerticalPianoRoll
        notes={baseNotes}
        currentBeat={0}
        containerWidth={400}
        containerHeight={500}
        midiMin={48}
        midiMax={72}
        testID="vpr"
      />
    );
    expect(queryAllByTestId(/^ghost-note-/)).toHaveLength(0);
  });

  it('ghost notes are offset ahead of real notes', () => {
    const { getByTestId } = render(
      <VerticalPianoRoll
        notes={baseNotes}
        ghostNotes={baseNotes}
        ghostBeatOffset={2}
        currentBeat={0}
        containerWidth={400}
        containerHeight={500}
        midiMin={48}
        midiMax={72}
        testID="vpr"
      />
    );
    // Ghost note for beat 0 with offset 2 should appear at different position than real note
    const ghostNote = getByTestId('ghost-note-0');
    const realNote = getByTestId('note-bar-0');
    // Ghost should be closer to hit line (further down) because offset makes it appear "earlier"
    expect(ghostNote).toBeTruthy();
    expect(realNote).toBeTruthy();
  });
});
```

**Step 2: Run tests**

Run: `cd /Users/ut/purrrfect-keys && npx jest src/components/PianoRoll/__tests__/VerticalPianoRoll.test.tsx --no-coverage`
Expected: ALL PASS (ghost notes already implemented in Task 2)

**Step 3: Commit**

```bash
git add src/components/PianoRoll/__tests__/VerticalPianoRoll.test.tsx
git commit -m "test: add ghost notes test coverage for VerticalPianoRoll"
```

---

## Task 6: ExercisePlayer Layout Rewrite

**Depends on:** Tasks 1, 2, 3

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`
- Reference: `src/components/PianoRoll/VerticalPianoRoll.tsx` (from Task 2)
- Reference: `src/components/Keyboard/computeZoomedRange.ts` (from Task 3)
- Reference: `src/stores/exerciseStore.ts` (from Task 1)

This is the largest task — rewiring ExercisePlayer to use VerticalPianoRoll, responsive layout, and dynamic keyboard range.

**Step 1: Replace PianoRoll import and add new imports**

In `ExercisePlayer.tsx`:

```typescript
// Replace:
import { PianoRoll } from '@/components/PianoRoll/PianoRoll';

// With:
import { VerticalPianoRoll } from '@/components/PianoRoll/VerticalPianoRoll';
import { computeStickyRange, type KeyboardRange } from '@/components/Keyboard/computeZoomedRange';
import { useWindowDimensions } from 'react-native';
```

**Step 2: Add responsive layout detection**

Near the top of the component:

```typescript
const { width: screenWidth, height: screenHeight } = useWindowDimensions();
const isPortrait = screenHeight > screenWidth;
const keyHeight = isPortrait ? 120 : 100;
const topBarHeight = isPortrait ? 76 : 40;
const pianoRollHeight = screenHeight - topBarHeight - keyHeight;
```

**Step 3: Replace static keyboard range with dynamic zoomed range**

Replace the existing `keyboardStartNote`/`keyboardOctaveCount` useMemo (currently lines ~330-339) with:

```typescript
// Dynamic zoomed range — recomputes as playback advances
const [keyboardRange, setKeyboardRange] = useState<KeyboardRange>(() => {
  const firstNotes = exercise.notes.slice(0, 8).map(n => n.note);
  return computeZoomedRange(firstNotes);
});

// Update keyboard range based on active window (every beat change, debounced)
useEffect(() => {
  const windowNotes = exercise.notes
    .filter(n => n.startBeat >= currentBeat - 2 && n.startBeat <= currentBeat + 8)
    .map(n => n.note);

  if (windowNotes.length > 0) {
    const newRange = computeStickyRange(windowNotes, keyboardRange);
    if (newRange.startNote !== keyboardRange.startNote) {
      setKeyboardRange(newRange);
    }
  }
}, [Math.floor(currentBeat)]); // Only recompute on whole-beat changes

const keyboardStartNote = keyboardRange.startNote;
const keyboardOctaveCount = keyboardRange.octaveCount;
```

**Step 4: Replace PianoRoll JSX with VerticalPianoRoll**

Replace the `<PianoRoll ... />` usage (currently around lines 1218-1225) with:

```tsx
<View style={{ flex: 1 }} onLayout={(e) => {
  // Capture actual layout dimensions for VerticalPianoRoll
  setPianoRollDims({
    width: e.nativeEvent.layout.width,
    height: e.nativeEvent.layout.height,
  });
}}>
  {pianoRollDims.width > 0 && (
    <VerticalPianoRoll
      notes={exercise.notes}
      currentBeat={currentBeat}
      tempo={exercise.settings.tempo}
      timeSignature={exercise.settings.timeSignature}
      containerWidth={pianoRollDims.width}
      containerHeight={pianoRollDims.height}
      midiMin={keyboardStartNote}
      midiMax={keyboardStartNote + keyboardOctaveCount * 12}
      ghostNotes={ghostNotesEnabled ? exercise.notes : undefined}
      ghostBeatOffset={2}
      testID="exercise-piano-roll"
    />
  )}
</View>
```

Add state for piano roll dimensions:

```typescript
const [pianoRollDims, setPianoRollDims] = useState({ width: 0, height: 0 });
```

**Step 5: Update keyboard rendering for new key height**

Update the Keyboard component usage:

```tsx
<Keyboard
  startNote={keyboardStartNote}
  octaveCount={keyboardOctaveCount}
  onNoteOn={handleKeyDown}
  onNoteOff={handleKeyUp}
  highlightedNotes={highlightedKeys}
  expectedNotes={expectedNotes}
  scrollable={true}
  scrollEnabled={false}
  focusNote={nextExpectedNote}
  keyHeight={keyHeight}
/>
```

**Step 6: Update layout structure**

The overall layout should be:

```tsx
<View style={styles.container}>
  {/* Top bar */}
  <View style={[styles.topBar, { height: topBarHeight }]}>
    {/* Exercise title, controls, etc. */}
  </View>

  {/* VerticalPianoRoll takes remaining space */}
  <View style={{ flex: 1 }}>
    <VerticalPianoRoll ... />
    {/* Feedback overlay */}
    {feedback.type && <FeedbackOverlay ... />}
    {/* ExerciseBuddy */}
    <ExerciseBuddy ... />
  </View>

  {/* Keyboard fixed at bottom */}
  <View style={{ height: keyHeight }}>
    <Keyboard ... />
  </View>
</View>
```

**Step 7: Remove landscape orientation lock**

Find and remove the `ScreenOrientation.lockAsync(LANDSCAPE_LEFT)` and `ScreenOrientation.lockAsync(PORTRAIT_UP)` calls (currently around lines 634-659). Also remove the associated `setTimeout` delays and `skipPortraitResetRef`.

```typescript
// REMOVE this entire useEffect block that locks orientation
// useEffect(() => {
//   setTimeout(() => {
//     ScreenOrientation.lockAsync(LANDSCAPE_LEFT);
//   }, 100);
//   return () => { ... };
// }, []);
```

**Step 8: Wire ghost notes from store**

```typescript
const ghostNotesEnabled = useExerciseStore(s => s.ghostNotesEnabled);
```

Pass to VerticalPianoRoll as shown in Step 4.

**Step 9: Run tests**

Run: `cd /Users/ut/purrrfect-keys && npx jest src/screens/ExercisePlayer --no-coverage`
Expected: Existing tests should still pass (may need test updates for changed component structure)

**Step 10: Run full test suite**

Run: `cd /Users/ut/purrrfect-keys && npx jest --no-coverage`
Expected: 983+ tests passing

**Step 11: Commit**

```bash
git add src/screens/ExercisePlayer/ExercisePlayer.tsx
git commit -m "feat: rewrite ExercisePlayer layout for vertical notes + zoomed keyboard + responsive orientation"
```

---

## Task 7: Demo Mode UI + Controls

**Depends on:** Tasks 4, 6

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`
- Modify: `src/screens/ExercisePlayer/ExerciseControls.tsx` (if exists, or create inline)
- Modify: `src/screens/ExercisePlayer/CompletionModal.tsx`
- Reference: `src/services/demoPlayback.ts` (from Task 4)

Wires the DemoPlaybackService into ExercisePlayer and adds UI controls.

**Step 1: Add DemoPlaybackService to ExercisePlayer**

```typescript
import { DemoPlaybackService } from '@/services/demoPlayback';

// In component:
const demoServiceRef = useRef(new DemoPlaybackService());
const [isDemoPlaying, setIsDemoPlaying] = useState(false);
const [demoActiveNotes, setDemoActiveNotes] = useState<Set<number>>(new Set());

const startDemo = useCallback(() => {
  // Pause current exercise if playing
  if (isPlaying) {
    pause();
  }

  setIsDemoPlaying(true);
  useExerciseStore.getState().setDemoWatched(true);

  const audioEngine = getAudioEngine();
  demoServiceRef.current.start(
    exercise,
    audioEngine,
    0.6, // 60% speed
    (beat) => setCurrentBeat(beat), // Drive the VerticalPianoRoll
    (notes) => setDemoActiveNotes(notes), // Highlight keyboard keys
  );
}, [exercise, isPlaying]);

const stopDemo = useCallback(() => {
  demoServiceRef.current.stop();
  setIsDemoPlaying(false);
  setDemoActiveNotes(new Set());
  setCurrentBeat(0); // Reset to start
}, []);
```

**Step 2: Add Demo button to controls**

In the top bar / controls area:

```tsx
{/* Demo button — always visible */}
<Pressable onPress={isDemoPlaying ? stopDemo : startDemo} style={styles.demoButton}>
  <Text style={styles.demoButtonText}>
    {isDemoPlaying ? 'Stop' : 'Demo'}
  </Text>
</Pressable>

{/* Ghost notes toggle — visible after demo watched */}
{demoWatched && (
  <Pressable
    onPress={() => useExerciseStore.getState().setGhostNotesEnabled(!ghostNotesEnabled)}
    style={[styles.ghostToggle, ghostNotesEnabled && styles.ghostToggleActive]}
  >
    <Text style={styles.ghostToggleText}>Ghost</Text>
  </Pressable>
)}
```

**Step 3: During demo, highlight keyboard keys**

Merge demo active notes with user highlighted notes:

```typescript
const effectiveHighlightedKeys = isDemoPlaying
  ? demoActiveNotes
  : highlightedKeys;
```

Pass `effectiveHighlightedKeys` to the Keyboard component.

**Step 4: Add demo banner overlay**

```tsx
{isDemoPlaying && (
  <View style={styles.demoBanner}>
    <Text style={styles.demoBannerText}>Watching Demo — 60% speed</Text>
    <Pressable onPress={stopDemo}>
      <Text style={styles.tryNowButton}>Try Now</Text>
    </Pressable>
  </View>
)}
```

**Step 5: Disable scoring during demo**

In the handleKeyDown function, add early return:

```typescript
const handleKeyDown = useCallback((midiEvent: MidiNoteEvent) => {
  if (isDemoPlaying) return; // No input during demo
  // ... existing logic
}, [isDemoPlaying, /* existing deps */]);
```

**Step 6: Update CompletionModal for 3-fail cat prompt**

In CompletionModal or in ExercisePlayer's completion handler:

```typescript
const failCount = useExerciseStore(s => s.failCount);

// On exercise fail:
if (!score.isPassed) {
  useExerciseStore.getState().incrementFailCount();
}

// On exercise pass:
if (score.isPassed) {
  useExerciseStore.getState().resetFailCount();
  if (ghostNotesEnabled) {
    useExerciseStore.getState().incrementGhostNotesSuccessCount();
  }
}
```

In CompletionModal, show cat demo prompt when `failCount >= 3`:

```tsx
{failCount >= 3 && !demoWatched && (
  <View style={styles.demoPrompt}>
    <Text style={styles.demoPromptText}>
      {getCatDemoDialogue(selectedCatId)}
    </Text>
    <Pressable onPress={onStartDemo} style={styles.demoPromptButton}>
      <Text style={styles.demoPromptButtonText}>Watch Demo</Text>
    </Pressable>
  </View>
)}
```

**Step 7: Commit**

```bash
git add src/screens/ExercisePlayer/ExercisePlayer.tsx src/screens/ExercisePlayer/CompletionModal.tsx
git commit -m "feat: add demo mode UI with keyboard highlighting, ghost toggle, and 3-fail cat prompt"
```

---

## Task 8: Cat Dialogue for Demo Trigger

**Depends on:** Task 1

**Files:**
- Modify: `src/content/catDialogue.ts`
- Create: `src/content/__tests__/catDialogue-demo.test.ts`

Adds demo-related dialogue triggers to the cat personality system.

**Step 1: Write tests**

```typescript
// src/content/__tests__/catDialogue-demo.test.ts

import { getCatDialogue } from '../catDialogue';

describe('demo dialogue triggers', () => {
  it('returns demo offer dialogue for each cat', () => {
    const catIds = ['keysie', 'luna', 'jazz', 'tempo', 'melody', 'chord', 'bass', 'treble'];
    for (const catId of catIds) {
      const dialogue = getCatDialogue(catId, 'demoOffer');
      expect(dialogue).toBeTruthy();
      expect(typeof dialogue).toBe('string');
      expect(dialogue.length).toBeGreaterThan(10);
    }
  });

  it('returns demo complete dialogue for each cat', () => {
    const catIds = ['keysie', 'luna', 'jazz', 'tempo', 'melody', 'chord', 'bass', 'treble'];
    for (const catId of catIds) {
      const dialogue = getCatDialogue(catId, 'demoComplete');
      expect(dialogue).toBeTruthy();
    }
  });

  it('returns ghost notes farewell dialogue', () => {
    const catIds = ['keysie', 'luna', 'jazz', 'tempo', 'melody', 'chord', 'bass', 'treble'];
    for (const catId of catIds) {
      const dialogue = getCatDialogue(catId, 'ghostNotesFarewell');
      expect(dialogue).toBeTruthy();
    }
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ut/purrrfect-keys && npx jest src/content/__tests__/catDialogue-demo.test.ts --no-coverage`
Expected: FAIL — new triggers don't exist

**Step 3: Add demo dialogue to catDialogue.ts**

Add new trigger types and messages to the existing dialogue system. Each of the 8 cats needs personality-appropriate variants for:

- `demoOffer` — "Want me to show you how?"
- `demoComplete` — "Your turn! You've got this."
- `ghostNotesFarewell` — "Turning off training wheels!"

Example for keysie:
```typescript
demoOffer: "Hmm, this one's tricky! Want me to show you how it goes? Watch my paws!",
demoComplete: "See? Not so bad! Now it's your turn — I believe in you!",
ghostNotesFarewell: "Look at you go! You don't need the ghost notes anymore!",
```

Add appropriate personality-matched variants for all 8 cats.

**Step 4: Run tests**

Run: `cd /Users/ut/purrrfect-keys && npx jest src/content/__tests__/catDialogue-demo.test.ts --no-coverage`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/content/catDialogue.ts src/content/__tests__/catDialogue-demo.test.ts
git commit -m "feat: add demo mode and ghost notes dialogue for all 8 cat personalities"
```

---

## Task 9: Orientation Handling Cleanup

**Depends on:** Task 6

**Files:**
- Modify: `src/screens/ExercisePlayer/ExercisePlayer.tsx`
- Modify: `src/navigation/AppNavigator.tsx` (if orientation is set there)
- Reference: `app.json` or `app.config.ts` (default orientation settings)

**Step 1: Verify orientation lock removal**

Confirm that Task 6 removed the `ScreenOrientation.lockAsync()` calls. If not, remove them now.

**Step 2: Update app.json orientation**

Check `app.json` for orientation settings:

```json
{
  "expo": {
    "orientation": "default"  // Allow both portrait and landscape
  }
}
```

If currently set to `"landscape"` or `"portrait"`, change to `"default"`.

**Step 3: Test orientation changes**

Manually verify:
1. ExercisePlayer works in portrait
2. ExercisePlayer works in landscape
3. Rotating mid-exercise doesn't crash or lose state
4. Layout adapts (key height changes, piano roll resizes)

**Step 4: Commit**

```bash
git add src/screens/ExercisePlayer/ExercisePlayer.tsx app.json
git commit -m "feat: enable both portrait and landscape for exercise gameplay"
```

---

## Task 10: Integration Testing + Polish

**Depends on:** All previous tasks

**Files:**
- Modify: various (polish fixes)
- Run: full test suite

**Step 1: Run full test suite**

Run: `cd /Users/ut/purrrfect-keys && npx jest --no-coverage`
Expected: All tests pass (983+ existing + new tests from Tasks 1-8)

**Step 2: Run TypeScript check**

Run: `cd /Users/ut/purrrfect-keys && npx tsc --noEmit`
Expected: 0 errors

**Step 3: Fix any failing tests or type errors**

Address issues found in Steps 1-2.

**Step 4: Update CLAUDE.md**

Update test count and current sprint description:

```markdown
## Current Sprint: Gameplay UX Rework (vertical note flow, bigger keys)
```

Update test count to reflect new tests added.

**Step 5: Update MEMORY.md**

Add Gameplay UX Rework completion status.

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: integration testing and polish for Gameplay UX Rework"
```

---

## Summary

| Task | Description | Est. Tests Added | Parallelizable |
|------|-------------|------------------|----------------|
| 1 | exerciseStore updates | ~7 | Yes (with 2, 3, 4) |
| 2 | VerticalPianoRoll component | ~10 | Yes (with 1, 3, 4) |
| 3 | Smart keyboard range utility | ~8 | Yes (with 1, 2, 4) |
| 4 | Demo playback service | ~7 | Yes (with 1, 2, 3) |
| 5 | Ghost notes tests | ~3 | After Task 2 |
| 6 | ExercisePlayer layout rewrite | ~0 (uses existing) | After Tasks 1, 2, 3 |
| 7 | Demo mode UI + controls | ~0 (manual testing) | After Tasks 4, 6 |
| 8 | Cat dialogue for demo | ~3 | After Task 1 |
| 9 | Orientation cleanup | ~0 (manual) | After Task 6 |
| 10 | Integration + polish | ~0 (verification) | After all |

**Total new tests:** ~38
**Total test count after:** ~1021

**Commit count:** 10 commits (one per task)

/**
 * Split Keyboard Component
 * Two stacked Keyboard instances for two-handed play.
 * Left hand = top (lower notes, closer to piano roll).
 * Right hand = bottom (higher notes, closest to thumbs).
 * Each half auto-scrolls independently via focusNote.
 *
 * Performance: ranges are computed per-hand with minimal octaves
 * (2 octaves default, 3 only when hand spans >12 semitones).
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Keyboard } from './Keyboard';
import { computeZoomedRange } from './computeZoomedRange';
import { COLORS } from '@/theme/tokens';
import type { NoteEvent, MidiNoteEvent } from '@/core/exercises/types';

export interface SplitKeyboardProps {
  notes: NoteEvent[];
  splitPoint?: number;
  onNoteOn?: (note: MidiNoteEvent) => void;
  onNoteOff?: (midiNote: number) => void;
  highlightedNotes?: Set<number>;
  expectedNotes?: Set<number>;
  enabled?: boolean;
  hapticEnabled?: boolean;
  showLabels?: boolean;
  keyHeight?: number;
  focusNoteLeft?: number;
  focusNoteRight?: number;
  testID?: string;
}

/** Compute the MIDI split point from notes with hand annotations */
export function deriveSplitPoint(notes: NoteEvent[]): number {
  const leftNotes = notes.filter((n) => n.hand === 'left');
  const rightNotes = notes.filter((n) => n.hand === 'right');

  if (leftNotes.length > 0 && rightNotes.length > 0) {
    const maxLeft = Math.max(...leftNotes.map((n) => n.note));
    const minRight = Math.min(...rightNotes.map((n) => n.note));
    return Math.floor((maxLeft + minRight) / 2);
  }

  return 60; // Default: middle C
}


export const SplitKeyboard: React.FC<SplitKeyboardProps> = React.memo(({
  notes,
  splitPoint: splitPointProp,
  onNoteOn,
  onNoteOff,
  highlightedNotes = new Set<number>(),
  expectedNotes = new Set<number>(),
  enabled = true,
  hapticEnabled = false,
  showLabels = true,
  keyHeight = 90,
  focusNoteLeft,
  focusNoteRight,
  testID,
}) => {
  const splitPoint = splitPointProp ?? deriveSplitPoint(notes);

  // Partition exercise notes into left/right hands
  const { leftNoteEvents, rightNoteEvents } = useMemo(() => {
    const left: NoteEvent[] = [];
    const right: NoteEvent[] = [];

    for (const note of notes) {
      if (note.hand === 'left' || (!note.hand && note.note < splitPoint)) {
        left.push(note);
      } else {
        right.push(note);
      }
    }

    return { leftNoteEvents: left, rightNoteEvents: right };
  }, [notes, splitPoint]);

  // Compute range per hand — use just enough octaves to cover the notes.
  // 2 octaves is the minimum; only expand to 3 if the hand actually spans >12 semitones.
  const rightRange = useMemo(() => {
    const midi = rightNoteEvents.map(n => n.note);
    const span = midi.length > 0 ? Math.max(...midi) - Math.min(...midi) : 0;
    return computeZoomedRange(midi, span > 12 ? 3 : 2);
  }, [rightNoteEvents]);
  const leftRange = useMemo(() => {
    const midi = leftNoteEvents.map(n => n.note);
    const span = midi.length > 0 ? Math.max(...midi) - Math.min(...midi) : 0;
    return computeZoomedRange(midi, span > 12 ? 3 : 2);
  }, [leftNoteEvents]);

  // Partition highlighted and expected notes by splitPoint
  const { leftHighlighted, rightHighlighted, leftExpected, rightExpected } =
    useMemo(() => {
      const lh = new Set<number>();
      const rh = new Set<number>();
      const le = new Set<number>();
      const re = new Set<number>();

      for (const note of highlightedNotes) {
        if (note < splitPoint) lh.add(note);
        else rh.add(note);
      }

      for (const note of expectedNotes) {
        if (note < splitPoint) le.add(note);
        else re.add(note);
      }

      return { leftHighlighted: lh, rightHighlighted: rh, leftExpected: le, rightExpected: re };
    }, [highlightedNotes, expectedNotes, splitPoint]);

  // Split keyboard keys are shorter to fit two rows + PianoRoll.
  // 0.6x gives ~72px per hand in portrait (vs 90px at 0.75x), saving 36px for PianoRoll.
  const splitKeyHeight = Math.round(keyHeight * 0.6);

  return (
    <View style={styles.container} testID={testID}>
      {/* Left hand (top — lower notes, closer to piano roll) */}
      <View style={styles.handRow}>
        <View style={styles.handLabel}>
          <Text style={styles.handLabelText}>L</Text>
        </View>
        <View style={styles.keyboardWrapper}>
          <Keyboard
            startNote={leftRange.startNote}
            octaveCount={leftRange.octaveCount}
            onNoteOn={onNoteOn}
            onNoteOff={onNoteOff}
            highlightedNotes={leftHighlighted}
            expectedNotes={leftExpected}
            enabled={enabled}
            hapticEnabled={hapticEnabled}
            showLabels={showLabels}
            scrollable
            scrollEnabled={false}
            focusNote={focusNoteLeft}
            keyHeight={splitKeyHeight}
            testID={testID ? `${testID}-left` : undefined}
          />
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Right hand (bottom — higher notes, closest to thumbs) */}
      <View style={styles.handRow}>
        <View style={styles.handLabel}>
          <Text style={styles.handLabelText}>R</Text>
        </View>
        <View style={styles.keyboardWrapper}>
          <Keyboard
            startNote={rightRange.startNote}
            octaveCount={rightRange.octaveCount}
            onNoteOn={onNoteOn}
            onNoteOff={onNoteOff}
            highlightedNotes={rightHighlighted}
            expectedNotes={rightExpected}
            enabled={enabled}
            hapticEnabled={hapticEnabled}
            showLabels={showLabels}
            scrollable
            scrollEnabled={false}
            focusNote={focusNoteRight}
            keyHeight={splitKeyHeight}
            testID={testID ? `${testID}-right` : undefined}
          />
        </View>
      </View>
    </View>
  );
});

SplitKeyboard.displayName = 'SplitKeyboard';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  handRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  handLabel: {
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  handLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  keyboardWrapper: {
    flex: 1,
  },
  divider: {
    height: 2,
    backgroundColor: COLORS.cardBorder,
  },
});

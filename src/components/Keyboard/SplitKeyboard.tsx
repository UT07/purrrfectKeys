/**
 * Split Keyboard Component
 * Two stacked Keyboard instances for two-handed play.
 * Top = right hand (higher notes), Bottom = left hand (lower notes).
 * Each half auto-scrolls independently via focusNote.
 *
 * The split point is derived from exercise notes' hand annotations,
 * or defaults to middle C (MIDI 60) when annotations are absent.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Keyboard } from './Keyboard';
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

/** Compute keyboard range (startNote, octaveCount) for a set of MIDI notes */
export function computeKeyboardRange(notes: number[]): {
  startNote: number;
  octaveCount: number;
} {
  if (notes.length === 0) return { startNote: 48, octaveCount: 2 };

  const minNote = Math.min(...notes);
  const maxNote = Math.max(...notes);

  // Round down to nearest C with 2-note margin
  const startNote = Math.max(21, Math.floor((minNote - 2) / 12) * 12);
  const octaveCount = Math.max(
    2,
    Math.min(4, Math.ceil((maxNote - startNote + 3) / 12))
  );

  return { startNote, octaveCount };
}

export const SplitKeyboard: React.FC<SplitKeyboardProps> = ({
  notes,
  splitPoint: splitPointProp,
  onNoteOn,
  onNoteOff,
  highlightedNotes = new Set(),
  expectedNotes = new Set(),
  enabled = true,
  hapticEnabled = false,
  showLabels = true,
  keyHeight = 55,
  focusNoteLeft,
  focusNoteRight,
  testID,
}) => {
  const splitPoint = splitPointProp ?? deriveSplitPoint(notes);

  // Partition exercise notes into left/right hands
  const { leftMidiNotes, rightMidiNotes } = useMemo(() => {
    const left: number[] = [];
    const right: number[] = [];

    for (const note of notes) {
      if (note.hand === 'left' || (!note.hand && note.note < splitPoint)) {
        left.push(note.note);
      } else {
        right.push(note.note);
      }
    }

    return { leftMidiNotes: left, rightMidiNotes: right };
  }, [notes, splitPoint]);

  // Compute keyboard ranges
  const leftRange = useMemo(
    () => computeKeyboardRange(leftMidiNotes),
    [leftMidiNotes]
  );
  const rightRange = useMemo(
    () => computeKeyboardRange(rightMidiNotes),
    [rightMidiNotes]
  );

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

      return {
        leftHighlighted: lh,
        rightHighlighted: rh,
        leftExpected: le,
        rightExpected: re,
      };
    }, [highlightedNotes, expectedNotes, splitPoint]);

  return (
    <View style={styles.container} testID={testID}>
      {/* Right hand (top) */}
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
            scrollable={true}
            scrollEnabled={false}
            focusNote={focusNoteRight}
            keyHeight={keyHeight}
            testID={testID ? `${testID}-right` : undefined}
          />
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Left hand (bottom) */}
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
            scrollable={true}
            scrollEnabled={false}
            focusNote={focusNoteLeft}
            keyHeight={keyHeight}
            testID={testID ? `${testID}-left` : undefined}
          />
        </View>
      </View>
    </View>
  );
};

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

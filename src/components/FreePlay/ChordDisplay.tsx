/**
 * ChordDisplay — Real-time chord name detection and display.
 *
 * When notes are held simultaneously, identifies the chord and shows
 * the name prominently in the visualization area with a subtle glow pulse.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, glowColor, shadowGlow } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Chord recognition — maps note intervals to chord names
// ─────────────────────────────────────────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Common chord interval patterns (semitones from root) */
const CHORD_PATTERNS: Array<{ intervals: number[]; suffix: string }> = [
  // Triads
  { intervals: [0, 4, 7], suffix: '' },         // Major
  { intervals: [0, 3, 7], suffix: 'm' },        // Minor
  { intervals: [0, 3, 6], suffix: 'dim' },      // Diminished
  { intervals: [0, 4, 8], suffix: 'aug' },      // Augmented
  { intervals: [0, 5, 7], suffix: 'sus4' },     // Suspended 4th
  { intervals: [0, 2, 7], suffix: 'sus2' },     // Suspended 2nd
  // 7th chords
  { intervals: [0, 4, 7, 11], suffix: 'maj7' },
  { intervals: [0, 4, 7, 10], suffix: '7' },
  { intervals: [0, 3, 7, 10], suffix: 'm7' },
  { intervals: [0, 3, 6, 9], suffix: 'dim7' },
  { intervals: [0, 3, 6, 10], suffix: 'm7b5' },
];

function identifyChord(activeNotes: Set<number>): string | null {
  if (activeNotes.size < 2) return null;

  // Get unique pitch classes sorted
  const pitchClasses = [...new Set([...activeNotes].map((n) => n % 12))].sort(
    (a, b) => a - b,
  );

  if (pitchClasses.length < 2) return null;

  // Try each pitch class as root
  for (const root of pitchClasses) {
    const intervals = pitchClasses.map((pc) => (pc - root + 12) % 12).sort(
      (a, b) => a - b,
    );

    for (const pattern of CHORD_PATTERNS) {
      if (
        pattern.intervals.length === intervals.length &&
        pattern.intervals.every((v, i) => v === intervals[i])
      ) {
        return `${NOTE_NAMES[root]}${pattern.suffix}`;
      }
    }
  }

  // Partial match — if 2 notes, show interval name
  if (pitchClasses.length === 2) {
    const interval = (pitchClasses[1] - pitchClasses[0] + 12) % 12;
    const root = NOTE_NAMES[pitchClasses[0]];
    const intervalNames: Record<number, string> = {
      1: 'b2', 2: '2', 3: 'm3', 4: 'M3', 5: 'P4',
      6: 'b5', 7: 'P5', 8: 'b6', 9: 'M6', 10: 'b7', 11: 'M7',
    };
    if (intervalNames[interval]) {
      return `${root}+${intervalNames[interval]}`;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface ChordDisplayProps {
  activeNotes: Set<number>;
  testID?: string;
}

export function ChordDisplay({
  activeNotes,
  testID,
}: ChordDisplayProps): React.ReactElement | null {
  const chordName = useMemo(() => identifyChord(activeNotes), [activeNotes]);
  const pulseScale = useSharedValue(1);
  const prevChordRef = useRef<string | null>(null);

  useEffect(() => {
    if (chordName && chordName !== prevChordRef.current) {
      prevChordRef.current = chordName;
      pulseScale.value = withSequence(
        withTiming(1.08, { duration: 80 }),
        withTiming(1, { duration: 200 }),
      );
    } else if (!chordName) {
      prevChordRef.current = null;
    }
  }, [chordName, pulseScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: withTiming(chordName ? 1 : 0.3, { duration: 150 }),
  }));

  return (
    <View style={styles.container} testID={testID}>
      <Animated.View style={[styles.chordBox, animatedStyle]}>
        <Text style={styles.chordText}>
          {chordName ?? '—'}
        </Text>
      </Animated.View>
      <Text style={styles.label}>Chord</Text>
    </View>
  );
}

// Exported for testing
export { identifyChord };

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  chordBox: {
    backgroundColor: glowColor(COLORS.primary, 0.1),
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.25),
    ...(shadowGlow(COLORS.primary, 8) as Record<string, unknown>),
  },
  chordText: {
    ...TYPOGRAPHY.heading.lg,
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: 1,
  },
  label: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
    marginTop: 6,
  },
});

/**
 * ChordPrompt
 *
 * For 'chordId' exercises. Displays the current chord name above the keyboard.
 * Includes a helper to derive chord names from MIDI note sets.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, ANIMATION_CONFIG, glowColor } from '../../theme/tokens';

export interface ChordPromptProps {
  chordName: string;
  isCorrect: boolean;
  testID?: string;
}

export function ChordPrompt({ chordName, isCorrect, testID }: ChordPromptProps): React.JSX.Element {
  return (
    <View style={styles.container} testID={testID}>
      <Animated.View
        entering={FadeIn.duration(ANIMATION_CONFIG.duration.normal)}
        style={[
          styles.card,
          isCorrect && styles.cardCorrect,
        ]}
      >
        <Text style={styles.label}>Play this chord:</Text>
        <Text style={[styles.chordName, isCorrect && styles.chordNameCorrect]}>
          {chordName}
        </Text>
        {isCorrect && (
          <Animated.View
            entering={FadeIn.duration(ANIMATION_CONFIG.duration.fast)}
            style={styles.checkContainer}
          >
            <Text style={styles.checkMark}>&#x2714;</Text>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────
// Chord name derivation from MIDI notes
// ─────────────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Interval pattern database.
 * Key = sorted semitone intervals from root (comma-separated).
 * Value = chord quality suffix.
 */
const INTERVAL_PATTERNS: Record<string, string> = {
  // Triads
  '4,7': 'Major',
  '3,7': 'Minor',
  '3,6': 'dim',
  '4,8': 'aug',
  // Suspended
  '5,7': 'sus4',
  '2,7': 'sus2',
  // Seventh chords
  '4,7,11': 'Major7',
  '4,7,10': '7',
  '3,7,10': 'Minor7',
  '3,6,10': 'Minor7b5',
  '3,6,9': 'dim7',
  // Extended
  '4,7,11,14': 'Major9',
  '4,7,10,14': '9',
  '3,7,10,14': 'Minor9',
};

/**
 * Derive a human-readable chord name from a set of MIDI note numbers.
 *
 * Works by normalizing notes to pitch classes, treating the lowest as root,
 * computing semitone intervals, and matching against known patterns.
 *
 * @param notes Array of MIDI note numbers forming a chord
 * @returns A chord name string (e.g. "C Major", "Am7") or "Unknown" if no match
 */
export function deriveChordName(notes: number[]): string {
  if (notes.length === 0) return 'Unknown';
  if (notes.length === 1) return NOTE_NAMES[notes[0] % 12];

  // Sort notes and deduplicate pitch classes
  const sorted = [...notes].sort((a, b) => a - b);
  const root = sorted[0] % 12;
  const rootName = NOTE_NAMES[root];

  // Compute intervals relative to root, dedup, sort
  const intervals = [...new Set(
    sorted.map((n) => ((n % 12) - root + 12) % 12).filter((i) => i > 0),
  )].sort((a, b) => a - b);

  if (intervals.length === 0) return rootName;

  const key = intervals.join(',');
  const quality = INTERVAL_PATTERNS[key];

  if (quality) {
    // Use lowercase for minor, standard notation
    if (quality === 'Minor') return `${rootName}m`;
    if (quality === 'Minor7') return `${rootName}m7`;
    if (quality === 'Minor7b5') return `${rootName}m7b5`;
    if (quality === 'Minor9') return `${rootName}m9`;
    if (quality === 'dim') return `${rootName}dim`;
    if (quality === 'dim7') return `${rootName}dim7`;
    if (quality === 'aug') return `${rootName}aug`;
    return `${rootName} ${quality}`;
  }

  // Fallback: return root + interval description
  return `${rootName} chord`;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  cardCorrect: {
    borderColor: COLORS.success,
    backgroundColor: glowColor(COLORS.success, 0.08),
  },
  label: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
  },
  chordName: {
    ...TYPOGRAPHY.display.md,
    color: COLORS.textPrimary,
  },
  chordNameCorrect: {
    color: COLORS.success,
  },
  checkContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
});

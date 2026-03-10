/**
 * KeySelectorWidget — Musical key and scale type picker.
 *
 * Selects a key (C–B) and scale type (Major, Minor, Pentatonic, Blues).
 * The parent component uses this to dim out-of-scale keys on the keyboard.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PressableScale } from '../common/PressableScale';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, glowColor } from '../../theme/tokens';

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const SCALE_TYPES = ['Major', 'Minor', 'Pentatonic', 'Blues'] as const;
export type ScaleType = typeof SCALE_TYPES[number];

/** Semitone intervals from root for each scale type */
const SCALE_INTERVALS: Record<ScaleType, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Pentatonic: [0, 2, 4, 7, 9],
  Blues: [0, 3, 5, 6, 7, 10],
};

/** Returns the set of MIDI notes in the given key/scale across all octaves */
export function getScaleNotes(rootName: string, scaleType: ScaleType): Set<number> {
  const rootPc = KEY_NAMES.indexOf(rootName as typeof KEY_NAMES[number]);
  if (rootPc < 0) return new Set();
  const intervals = SCALE_INTERVALS[scaleType];
  const pitchClasses = new Set(intervals.map((i) => (rootPc + i) % 12));
  const result = new Set<number>();
  // Full piano range
  for (let midi = 21; midi <= 108; midi++) {
    if (pitchClasses.has(midi % 12)) result.add(midi);
  }
  return result;
}

interface KeySelectorWidgetProps {
  selectedKey: string | null;
  selectedScale: ScaleType;
  onKeyChange: (key: string | null) => void;
  onScaleChange: (scale: ScaleType) => void;
  testID?: string;
}

export function KeySelectorWidget({
  selectedKey,
  selectedScale,
  onKeyChange,
  onScaleChange,
  testID,
}: KeySelectorWidgetProps): React.ReactElement {
  return (
    <View style={styles.container} testID={testID}>
      {/* Key selection */}
      <Text style={styles.sectionLabel}>Key</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.keyRow}
      >
        {KEY_NAMES.map((name) => (
          <PressableScale
            key={name}
            onPress={() => onKeyChange(selectedKey === name ? null : name)}
            scaleDown={0.9}
            soundOnPress={false}
          >
            <View
              style={[
                styles.keyPill,
                selectedKey === name && styles.keyPillSelected,
              ]}
            >
              <Text
                style={[
                  styles.keyPillText,
                  selectedKey === name && styles.keyPillTextSelected,
                ]}
              >
                {name}
              </Text>
            </View>
          </PressableScale>
        ))}
      </ScrollView>

      {/* Scale type selection */}
      <Text style={styles.sectionLabel}>Scale</Text>
      <View style={styles.scaleRow}>
        {SCALE_TYPES.map((type) => (
          <PressableScale
            key={type}
            onPress={() => onScaleChange(type)}
            scaleDown={0.9}
            soundOnPress={false}
          >
            <View
              style={[
                styles.scalePill,
                selectedScale === type && styles.scalePillSelected,
              ]}
            >
              <Text
                style={[
                  styles.scalePillText,
                  selectedScale === type && styles.scalePillTextSelected,
                ]}
              >
                {type}
              </Text>
            </View>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  sectionLabel: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  keyRow: {
    flexDirection: 'row',
    gap: 3,
  },
  keyPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  keyPillSelected: {
    backgroundColor: glowColor(COLORS.primary, 0.2),
    borderColor: COLORS.primary,
  },
  keyPillText: {
    ...TYPOGRAPHY.caption.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  keyPillTextSelected: {
    color: COLORS.primary,
  },
  scaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  scalePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  scalePillSelected: {
    backgroundColor: glowColor(COLORS.primary, 0.2),
    borderColor: COLORS.primary,
  },
  scalePillText: {
    ...TYPOGRAPHY.caption.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  scalePillTextSelected: {
    color: COLORS.primary,
  },
});

/**
 * OctaveArrows — Left/right octave shift buttons for the keyboard.
 * Overlaid on keyboard edges. Tap to shift visible range by one octave.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PressableScale } from '../common/PressableScale';
import { COLORS, BORDER_RADIUS, glowColor } from '../../theme/tokens';

interface OctaveArrowsProps {
  onShiftDown: () => void;
  onShiftUp: () => void;
  canShiftDown: boolean;
  canShiftUp: boolean;
  currentOctaveLabel?: string;
}

export function OctaveArrows({
  onShiftDown,
  onShiftUp,
  canShiftDown,
  canShiftUp,
  currentOctaveLabel,
}: OctaveArrowsProps): React.ReactElement {
  return (
    <>
      {/* Left arrow — shift down */}
      <View style={[styles.arrowContainer, styles.arrowLeft]}>
        <PressableScale
          onPress={onShiftDown}
          style={[styles.arrowButton, !canShiftDown && styles.arrowDisabled]}
          disabled={!canShiftDown}
          scaleDown={0.85}
          soundOnPress={false}
          testID="octave-arrow-down"
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={20}
            color={canShiftDown ? COLORS.textPrimary : COLORS.textMuted}
          />
        </PressableScale>
      </View>

      {/* Right arrow — shift up */}
      <View style={[styles.arrowContainer, styles.arrowRight]}>
        <PressableScale
          onPress={onShiftUp}
          style={[styles.arrowButton, !canShiftUp && styles.arrowDisabled]}
          disabled={!canShiftUp}
          scaleDown={0.85}
          soundOnPress={false}
          testID="octave-arrow-up"
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={canShiftUp ? COLORS.textPrimary : COLORS.textMuted}
          />
        </PressableScale>
      </View>

      {/* Optional octave label */}
      {currentOctaveLabel && (
        <View style={styles.octaveLabel}>
          <Text style={styles.octaveLabelText}>{currentOctaveLabel}</Text>
        </View>
      )}
    </>
  );
}

const ARROW_SIZE = 32;

const styles = StyleSheet.create({
  arrowContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 20,
  },
  arrowLeft: {
    left: 2,
  },
  arrowRight: {
    right: 2,
  },
  arrowButton: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    borderRadius: ARROW_SIZE / 2,
    backgroundColor: glowColor(COLORS.primary, 0.2),
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowDisabled: {
    backgroundColor: glowColor('#666666', 0.1),
    borderColor: glowColor('#666666', 0.2),
  },
  octaveLabel: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    backgroundColor: glowColor(COLORS.primary, 0.15),
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    zIndex: 20,
  },
  octaveLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

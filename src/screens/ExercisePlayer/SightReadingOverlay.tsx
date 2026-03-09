/**
 * SightReadingOverlay
 *
 * For 'sightReading' exercises. Renders a small badge at the top
 * of the exercise area. The actual note-hiding logic is handled
 * by passing `showLabels={false}` to the Keyboard component from
 * ExercisePlayer — this component is the visual indicator only.
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, ANIMATION_CONFIG, glowColor } from '../../theme/tokens';

export interface SightReadingOverlayProps {
  testID?: string;
}

export function SightReadingOverlay({ testID }: SightReadingOverlayProps): React.JSX.Element {
  return (
    <Animated.View
      entering={FadeIn.duration(ANIMATION_CONFIG.duration.normal)}
      style={styles.badge}
      testID={testID}
    >
      <Text style={styles.icon}>&#x1F4D6;</Text>
      <Text style={styles.text}>Sight Reading</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: glowColor(COLORS.info, 0.15),
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: glowColor(COLORS.info, 0.3),
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    ...TYPOGRAPHY.special.badge,
    color: COLORS.info,
  },
});

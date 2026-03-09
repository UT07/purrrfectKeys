/**
 * CallResponsePhase
 *
 * For 'callResponse' exercises. Shows a phase indicator overlay that
 * toggles between "call" (Salsa plays) and "response" (user plays).
 *
 * The parent component (ExercisePlayer) manages the demo playback for
 * the call phase and enables/disables the keyboard based on the phase.
 * This component is the visual indicator.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, ANIMATION_CONFIG, glowColor } from '../../theme/tokens';

export type CallResponsePhaseType = 'call' | 'response';

export interface CallResponsePhaseProps {
  phase: CallResponsePhaseType;
  onPhaseChange: (phase: CallResponsePhaseType) => void;
  testID?: string;
}

export function CallResponsePhase({
  phase,
  onPhaseChange: _onPhaseChange,
  testID,
}: CallResponsePhaseProps): React.JSX.Element {
  const isCall = phase === 'call';

  return (
    <View style={styles.container} testID={testID}>
      <Animated.View
        key={phase}
        entering={FadeIn.duration(ANIMATION_CONFIG.duration.fast)}
        exiting={FadeOut.duration(ANIMATION_CONFIG.duration.fast)}
        style={[styles.banner, isCall ? styles.bannerCall : styles.bannerResponse]}
      >
        <Text style={styles.icon}>{isCall ? '\u{1F3B5}' : '\u{1F3B9}'}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.phaseLabel, isCall ? styles.phaseLabelCall : styles.phaseLabelResponse]}>
            {isCall ? "SALSA'S TURN" : 'YOUR TURN'}
          </Text>
          <Text style={styles.phaseHint}>
            {isCall ? 'Listen to the phrase...' : 'Play it back!'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  bannerCall: {
    backgroundColor: glowColor(COLORS.warning, 0.12),
    borderColor: glowColor(COLORS.warning, 0.3),
  },
  bannerResponse: {
    backgroundColor: glowColor(COLORS.success, 0.12),
    borderColor: glowColor(COLORS.success, 0.3),
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  phaseLabel: {
    ...TYPOGRAPHY.special.badge,
    letterSpacing: 2,
  },
  phaseLabelCall: {
    color: COLORS.warning,
  },
  phaseLabelResponse: {
    color: COLORS.success,
  },
  phaseHint: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

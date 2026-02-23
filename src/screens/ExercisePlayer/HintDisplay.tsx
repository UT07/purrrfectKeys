/**
 * Hint Display Component
 * Shows contextual tips and common mistake warnings
 * Changes based on exercise state
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../theme/tokens';
import type { ExerciseHints } from '../../core/exercises/types';

export interface HintDisplayProps {
  hints: ExerciseHints;
  isPlaying: boolean;
  countInComplete: boolean;
  feedback: 'perfect' | 'good' | 'ok' | 'early' | 'late' | 'miss' | null;
  compact?: boolean;
  testID?: string;
}

/**
 * HintDisplay - Shows contextual hints and advice
 * Displays tips before start, feedback messages during play,
 * and success/error messages as player progresses
 */
export const HintDisplay: React.FC<HintDisplayProps> = ({
  hints,
  isPlaying,
  countInComplete,
  feedback,
  compact = false,
  testID,
}) => {
  // Determine which hint to show
  const currentHint = useMemo(() => {
    if (!isPlaying) {
      return {
        icon: 'lightbulb-on',
        text: hints.beforeStart,
        color: COLORS.primary,
      };
    }

    if (!countInComplete) {
      return {
        icon: 'clock-outline',
        text: 'Get ready...',
        color: COLORS.warning,
      };
    }

    switch (feedback) {
      case 'perfect':
        return {
          icon: 'check-circle',
          text: 'Perfect timing!',
          color: COLORS.feedbackPerfect,
        };
      case 'good':
        return {
          icon: 'check',
          text: 'Good!',
          color: COLORS.feedbackGood,
        };
      case 'ok':
        return {
          icon: 'minus-circle',
          text: 'Try to be more precise',
          color: COLORS.feedbackOk,
        };
      case 'miss':
        return {
          icon: 'close-circle',
          text: 'Keep focused on the notes',
          color: COLORS.feedbackMiss,
        };
      case 'early':
        return {
          icon: 'fast-forward',
          text: 'A bit early, slow down',
          color: COLORS.feedbackEarly,
        };
      case 'late':
        return {
          icon: 'rewind',
          text: 'A bit late, speed up',
          color: COLORS.feedbackLate,
        };
      default:
        return {
          icon: 'information-outline',
          text: 'Focus on the piano roll',
          color: COLORS.feedbackDefault,
        };
    }
  }, [isPlaying, countInComplete, feedback, hints.beforeStart]);

  if (compact) {
    return (
      <View style={styles.compactContainer} testID={testID}>
        <MaterialCommunityIcons
          name={currentHint.icon as any}
          size={14}
          color={currentHint.color}
        />
        <Text
          style={styles.compactText}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {currentHint.text}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <View
        style={[
          styles.hintBox,
          { borderLeftColor: currentHint.color },
        ]}
      >
        <MaterialCommunityIcons
          name={currentHint.icon as any}
          size={20}
          color={currentHint.color}
        />
        <Text
          style={styles.hintText}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {currentHint.text}
        </Text>
      </View>
    </View>
  );
};

HintDisplay.displayName = 'HintDisplay';

const styles = StyleSheet.create({
  // Compact mode styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingHorizontal: 8,
  },
  compactText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  // Full mode styles
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.cardHighlight,
    borderLeftWidth: 4,
    borderRadius: 6,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    lineHeight: 18,
  },
});

export default HintDisplay;

/**
 * Real-Time Feedback Component
 * Displays visual feedback for correct/incorrect notes
 * Shows timing and accuracy feedback
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, glowColor } from '../../theme/tokens';

export interface RealTimeFeedbackProps {
  feedback: {
    type: 'perfect' | 'good' | 'ok' | 'early' | 'late' | 'miss' | null;
    noteIndex: number;
    timestamp: number;
  };
  expectedNotes: Set<number>;
  highlightedKeys: Set<number>;
  testID?: string;
}

/**
 * RealTimeFeedback - Visual feedback during exercise
 * Shows colored indicators for note accuracy
 */
export const RealTimeFeedback: React.FC<RealTimeFeedbackProps> = ({
  feedback,
  expectedNotes,
  highlightedKeys,
  testID,
}) => {
  // Determine feedback display
  const feedbackDisplay = useMemo(() => {
    if (!feedback.type) {
      return {
        icon: 'music-note',
        label: 'Ready to play',
        color: COLORS.info,
        backgroundColor: glowColor(COLORS.info, 0.15),
      };
    }

    switch (feedback.type) {
      case 'perfect':
        return {
          icon: 'check-circle',
          label: 'Perfect!',
          color: COLORS.feedbackPerfect,
          backgroundColor: glowColor(COLORS.feedbackPerfect, 0.15),
        };
      case 'good':
        return {
          icon: 'check',
          label: 'Good',
          color: COLORS.feedbackGood,
          backgroundColor: glowColor(COLORS.feedbackGood, 0.15),
        };
      case 'ok':
        return {
          icon: 'minus-circle',
          label: 'OK',
          color: COLORS.feedbackOk,
          backgroundColor: glowColor(COLORS.feedbackOk, 0.15),
        };
      case 'miss':
        return {
          icon: 'close-circle',
          label: 'Missed',
          color: COLORS.feedbackMiss,
          backgroundColor: glowColor(COLORS.feedbackMiss, 0.15),
        };
      case 'early':
        return {
          icon: 'fast-forward',
          label: 'Too early',
          color: COLORS.feedbackEarly,
          backgroundColor: glowColor(COLORS.feedbackEarly, 0.15),
        };
      case 'late':
        return {
          icon: 'rewind',
          label: 'Too late',
          color: COLORS.feedbackLate,
          backgroundColor: glowColor(COLORS.feedbackLate, 0.15),
        };
      default:
        return {
          icon: 'information-outline',
          label: 'Waiting',
          color: COLORS.feedbackDefault,
          backgroundColor: glowColor(COLORS.feedbackDefault, 0.15),
        };
    }
  }, [feedback.type]);

  // Count correct vs expected notes
  const correctCount = [...expectedNotes].filter((note) =>
    highlightedKeys.has(note)
  ).length;
  const expectedCount = expectedNotes.size;

  return (
    <View style={styles.container} testID={testID}>
      {/* Feedback indicator */}
      <View
        style={[
          styles.feedbackBox,
          { backgroundColor: feedbackDisplay.backgroundColor },
        ]}
      >
        <MaterialCommunityIcons
          name={feedbackDisplay.icon as any}
          size={32}
          color={feedbackDisplay.color}
        />
        <View style={styles.feedbackTextContainer}>
          <Text style={[styles.feedbackLabel, { color: feedbackDisplay.color }]}>
            {feedbackDisplay.label}
          </Text>
          {expectedCount > 0 && (
            <Text style={styles.feedbackSubtitle}>
              {correctCount}/{expectedCount} notes
            </Text>
          )}
        </View>
      </View>

      {/* Expected notes indicator */}
      {expectedCount > 0 && (
        <View style={styles.notesIndicator}>
          <Text style={styles.notesLabel}>Expected:</Text>
          <View style={styles.notesList}>
            {Array.from(expectedNotes).map((note) => (
              <View
                key={note}
                style={[
                  styles.noteIndicator,
                  {
                    backgroundColor: highlightedKeys.has(note)
                      ? COLORS.success
                      : COLORS.cardBorder,
                  },
                ]}
              >
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

RealTimeFeedback.displayName = 'RealTimeFeedback';

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  feedbackTextContainer: {
    flex: 1,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  feedbackSubtitle: {
    fontSize: 12,
    color: COLORS.feedbackDefault,
    marginTop: 2,
  },
  notesIndicator: {
    paddingHorizontal: 16,
  },
  notesLabel: {
    fontSize: 11,
    color: COLORS.feedbackDefault,
    marginBottom: 6,
    fontWeight: '600',
  },
  notesList: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  noteIndicator: {
    width: 32,
    height: 32,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

export default RealTimeFeedback;

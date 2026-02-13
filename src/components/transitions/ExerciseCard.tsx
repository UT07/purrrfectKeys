/**
 * ExerciseCard Component
 * Quick slide-up card between exercises within a lesson
 * Shows score, stars, XP, and navigation options
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Button } from '../common/Button';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_HEIGHT * 0.4;

export interface ExerciseCardProps {
  score: number;
  stars: 0 | 1 | 2 | 3;
  xpEarned: number;
  isPassed: boolean;
  exerciseTitle: string;
  nextExerciseTitle?: string;
  tip?: string;
  onNext: () => void;
  onRetry: () => void;
  autoDismissMs?: number;
}

function getScoreColor(score: number): string {
  if (score >= 95) return '#FFD700';
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#FF9800';
  return '#F44336';
}

function renderStars(count: 0 | 1 | 2 | 3): string {
  const filled = '\u2605'; // solid star
  const empty = '\u2606';  // outline star
  return filled.repeat(count) + empty.repeat(3 - count);
}

/**
 * ExerciseCard - Bottom sheet-style card between exercises
 * Slides up from bottom, covers ~40% of screen height
 */
export function ExerciseCard({
  score,
  stars,
  xpEarned,
  isPassed,
  exerciseTitle,
  nextExerciseTitle,
  tip,
  onNext,
  onRetry,
  autoDismissMs = 5000,
}: ExerciseCardProps): React.JSX.Element {
  const translateY = useSharedValue(CARD_HEIGHT + 40);
  const progressWidth = useSharedValue(100);
  const autoDismissTimer = useRef<NodeJS.Timeout | null>(null);

  const scoreColor = getScoreColor(score);

  const handleAction = useCallback(
    (action: () => void) => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
        autoDismissTimer.current = null;
      }
      action();
    },
    []
  );

  useEffect(() => {
    // Slide up
    translateY.value = withTiming(0, {
      duration: 350,
      easing: Easing.out(Easing.cubic),
    });

    // Countdown progress bar
    progressWidth.value = withDelay(
      350,
      withTiming(0, {
        duration: autoDismissMs,
        easing: Easing.linear,
      })
    );

    // Auto-dismiss: advance to next if passed, retry if failed
    if (isPassed) {
      autoDismissTimer.current = setTimeout(() => {
        onNext();
      }, autoDismissMs + 350);
    }

    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, [translateY, progressWidth, autoDismissMs, isPassed, onNext]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <View style={styles.overlay} testID="exercise-card">
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        {/* Auto-dismiss countdown bar */}
        {isPassed && (
          <View style={styles.countdownTrack}>
            <Animated.View style={[styles.countdownFill, progressBarStyle]} />
          </View>
        )}

        <View style={styles.content}>
          {/* Score row */}
          <View style={styles.scoreRow}>
            {/* Score circle */}
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreNumber, { color: scoreColor }]}>
                {Math.round(score)}
              </Text>
              <Text style={[styles.scorePercent, { color: scoreColor }]}>%</Text>
            </View>

            {/* Stars and info */}
            <View style={styles.infoColumn}>
              <Text style={styles.exerciseTitle} numberOfLines={1}>
                {exerciseTitle}
              </Text>
              <Text style={[styles.starsText, { color: scoreColor }]}>
                {renderStars(stars)}
              </Text>
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>+{xpEarned} XP</Text>
              </View>
            </View>
          </View>

          {/* Tip */}
          {tip && (
            <View style={styles.tipContainer}>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            {isPassed ? (
              <Button
                title={
                  nextExerciseTitle
                    ? `Next: ${nextExerciseTitle}`
                    : 'Continue'
                }
                onPress={() => handleAction(onNext)}
                variant="primary"
                size="large"
                testID="exercise-card-next"
              />
            ) : (
              <Button
                title="Try Again"
                onPress={() => handleAction(onRetry)}
                variant="primary"
                size="large"
                testID="exercise-card-retry"
              />
            )}
            {isPassed && (
              <Button
                title="Retry for Better Score"
                onPress={() => handleAction(onRetry)}
                variant="secondary"
                size="medium"
                testID="exercise-card-retry-optional"
              />
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

ExerciseCard.displayName = 'ExerciseCard';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 900,
  },
  card: {
    height: CARD_HEIGHT,
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  countdownTrack: {
    height: 3,
    backgroundColor: '#333333',
    width: '100%',
  },
  countdownFill: {
    height: '100%',
    backgroundColor: '#DC143C',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  scorePercent: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  infoColumn: {
    flex: 1,
    gap: 4,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  starsText: {
    fontSize: 22,
    letterSpacing: 4,
  },
  xpBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  xpText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD700',
  },
  tipContainer: {
    backgroundColor: 'rgba(124, 77, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 77, 255, 0.2)',
  },
  tipText: {
    fontSize: 13,
    color: '#D1C4E9',
    lineHeight: 18,
  },
  actions: {
    gap: 8,
  },
});

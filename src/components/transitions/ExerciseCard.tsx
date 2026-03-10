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
import { ScoreRing } from '../common/ScoreRing';
import { FunFactCard } from '../FunFact/FunFactCard';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, glowColor } from '../../theme/tokens';
import type { FunFact } from '../../content/funFacts';

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
  funFact?: FunFact | null;
  onNext: () => void;
  onRetry: () => void;
  autoDismissMs?: number;
}

function getScoreColor(score: number): string {
  if (score >= 95) return COLORS.starGold;
  if (score >= 80) return COLORS.success;
  if (score >= 60) return COLORS.warning;
  return COLORS.error;
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
  funFact,
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
            {/* Animated score ring */}
            <ScoreRing score={Math.round(score)} size={80} strokeWidth={4} />

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
          {tip && !funFact && (
            <View style={styles.tipContainer}>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          )}

          {/* Fun fact (shown instead of tip when available) */}
          {funFact && (
            <FunFactCard
              fact={funFact}
              compact
              animationDelay={400}
              testID="exercise-card-fun-fact"
            />
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
    backgroundColor: glowColor('#000000', 0.4),
    zIndex: 900,
  },
  card: {
    height: CARD_HEIGHT,
    backgroundColor: COLORS.cardSurface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  countdownTrack: {
    height: 3,
    backgroundColor: COLORS.surfaceElevated,
    width: '100%',
  },
  countdownFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl - 12,
    paddingVertical: SPACING.md,
    justifyContent: 'space-between',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoColumn: {
    flex: 1,
    gap: SPACING.xs,
  },
  exerciseTitle: {
    ...TYPOGRAPHY.heading.sm,
    color: COLORS.textPrimary,
  },
  starsText: {
    fontSize: 22,
    letterSpacing: 4,
  },
  xpBadge: {
    backgroundColor: glowColor(COLORS.starGold, 0.12),
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  xpText: {
    ...TYPOGRAPHY.body.sm,
    fontWeight: '700',
    color: COLORS.starGold,
  },
  tipContainer: {
    backgroundColor: glowColor(COLORS.primary, 0.1),
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md - 4,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.2),
  },
  tipText: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textPrimary,
  },
  actions: {
    gap: SPACING.sm,
  },
});

/**
 * LessonCompleteScreen Component
 * Full-screen celebration when a lesson is completed
 * Shows trophy, stats summary, confetti for 3-star average, and navigation
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Button } from '../common/Button';
import { ConfettiEffect } from './ConfettiEffect';

export interface LessonCompleteScreenProps {
  lessonTitle: string;
  lessonNumber: number;
  exercisesCompleted: number;
  totalExercises: number;
  bestScore: number;
  xpEarned: number;
  starsEarned: number;
  maxStars: number;
  onContinue: () => void;
  nextLessonTitle?: string;
}

function getTrophyEmoji(starsEarned: number, maxStars: number): string {
  if (maxStars === 0) return '\uD83C\uDFC6'; // trophy
  const avgStars = starsEarned / (maxStars / 3);
  if (avgStars >= 2.5) return '\uD83C\uDFC6'; // gold trophy
  if (avgStars >= 1.5) return '\uD83E\uDD48'; // silver medal (2nd place)
  return '\uD83E\uDD49'; // bronze medal (3rd place)
}

function getTrophyLabel(starsEarned: number, maxStars: number): string {
  if (maxStars === 0) return 'Complete!';
  const avgStars = starsEarned / (maxStars / 3);
  if (avgStars >= 2.5) return 'Outstanding!';
  if (avgStars >= 1.5) return 'Great Work!';
  return 'Good Effort!';
}

function getTrophyColor(starsEarned: number, maxStars: number): string {
  if (maxStars === 0) return '#FFD700';
  const avgStars = starsEarned / (maxStars / 3);
  if (avgStars >= 2.5) return '#FFD700';
  if (avgStars >= 1.5) return '#C0C0C0';
  return '#CD7F32';
}

function renderStarSummary(earned: number, max: number): string {
  const filled = '\u2605'; // solid star
  const empty = '\u2606';  // outline star
  return filled.repeat(Math.min(earned, max)) + empty.repeat(Math.max(0, max - earned));
}

/**
 * LessonCompleteScreen - Full-screen celebration overlay
 * Animates in with scale + fade, optional confetti for high performers
 */
export function LessonCompleteScreen({
  lessonTitle,
  lessonNumber,
  exercisesCompleted,
  totalExercises,
  bestScore,
  xpEarned,
  starsEarned,
  maxStars,
  onContinue,
  nextLessonTitle,
}: LessonCompleteScreenProps): React.JSX.Element {
  // Animation values
  const containerOpacity = useSharedValue(0);
  const containerScale = useSharedValue(0.8);
  const trophyScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const statsOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);

  const showConfetti = maxStars > 0 && starsEarned / (maxStars / 3) >= 2.5;
  const trophyEmoji = getTrophyEmoji(starsEarned, maxStars);
  const trophyLabel = getTrophyLabel(starsEarned, maxStars);
  const trophyColor = getTrophyColor(starsEarned, maxStars);

  useEffect(() => {
    // Container fade + scale
    containerOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    containerScale.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });

    // Trophy bounces in
    trophyScale.value = withDelay(
      200,
      withSequence(
        withSpring(1.2, { damping: 8, stiffness: 180 }),
        withSpring(1, { damping: 12, stiffness: 200 })
      )
    );

    // Title slides up
    titleOpacity.value = withDelay(
      400,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    titleTranslateY.value = withDelay(
      400,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) })
    );

    // Stats fade in
    statsOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );

    // Buttons fade in
    buttonsOpacity.value = withDelay(
      800,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, [
    containerOpacity,
    containerScale,
    trophyScale,
    titleOpacity,
    titleTranslateY,
    statsOpacity,
    buttonsOpacity,
  ]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trophyScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  return (
    <View style={styles.overlay} testID="lesson-complete-screen">
      {showConfetti && <ConfettiEffect testID="lesson-confetti" />}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.container, containerStyle]}>
          {/* Trophy */}
          <Animated.View style={[styles.trophyContainer, trophyStyle]}>
            <Text style={styles.trophyEmoji}>{trophyEmoji}</Text>
          </Animated.View>

          {/* Title and label */}
          <Animated.View style={[styles.titleContainer, titleStyle]}>
            <Text style={styles.lessonComplete}>Lesson Complete!</Text>
            <Text style={styles.lessonTitle}>
              Lesson {lessonNumber}: {lessonTitle}
            </Text>
            <Text style={[styles.trophyLabel, { color: trophyColor }]}>
              {trophyLabel}
            </Text>
          </Animated.View>

          {/* Stats summary */}
          <Animated.View style={[styles.statsContainer, statsStyle]}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {exercisesCompleted}/{totalExercises}
                </Text>
                <Text style={styles.statLabel}>Exercises</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Math.round(bestScore)}%</Text>
                <Text style={styles.statLabel}>Best Score</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.xpValue]}>
                  +{xpEarned}
                </Text>
                <Text style={styles.statLabel}>XP Earned</Text>
              </View>
            </View>

            {/* Stars summary */}
            <View style={styles.starsRow}>
              <Text style={styles.starsText}>
                {renderStarSummary(starsEarned, maxStars)}
              </Text>
              <Text style={styles.starsCount}>
                {starsEarned}/{maxStars} stars
              </Text>
            </View>
          </Animated.View>

          {/* Buttons */}
          <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
            <Button
              title={
                nextLessonTitle
                  ? `Continue to ${nextLessonTitle}`
                  : 'Continue'
              }
              onPress={onContinue}
              variant="primary"
              size="large"
              testID="lesson-complete-continue"
            />
            <Button
              title="Back to Lessons"
              onPress={onContinue}
              variant="secondary"
              size="large"
              testID="lesson-complete-back"
            />
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

LessonCompleteScreen.displayName = 'LessonCompleteScreen';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0D0D',
    zIndex: 1000,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 20,
  },
  trophyContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trophyEmoji: {
    fontSize: 64,
  },
  titleContainer: {
    alignItems: 'center',
    gap: 6,
  },
  lessonComplete: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B0B0B0',
  },
  trophyLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  statsContainer: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#333333',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  xpValue: {
    color: '#FFD700',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0B0B0',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
  starsText: {
    fontSize: 20,
    color: '#FFD700',
    letterSpacing: 2,
  },
  starsCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B0B0B0',
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
  },
});

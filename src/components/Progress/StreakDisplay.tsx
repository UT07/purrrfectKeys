/**
 * StreakDisplay Component
 * Shows current streak with animation and freeze info
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, glowColor } from '../../theme/tokens';

export interface StreakDisplayProps {
  currentStreak: number; // Current streak count
  longestStreak: number; // Longest streak achieved
  freezesAvailable: number; // Freezes remaining this week
  lastPracticeDate?: string; // ISO date of last practice
  isStreakAtRisk?: boolean; // True if hasn't practiced today
}

/**
 * Get days since last practice
 */
function daysSinceLastPractice(lastPracticeDate: string | undefined): number {
  if (!lastPracticeDate) return 999; // Never practiced
  const lastDate = new Date(lastPracticeDate);
  const today = new Date();
  const diffMs = today.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * StreakDisplay - Shows current and longest streaks
 * Indicates if streak is at risk and displays available freezes
 */
export const StreakDisplay = React.memo(
  ({
    currentStreak,
    longestStreak,
    freezesAvailable,
    lastPracticeDate,
    isStreakAtRisk = false,
  }: StreakDisplayProps) => {
    const fireAnim = React.useRef(new Animated.Value(0)).current;
    const shakeAnim = React.useRef(new Animated.Value(0)).current;
    const daysSince = daysSinceLastPractice(lastPracticeDate);
    const streakAtRisk = isStreakAtRisk || daysSince >= 1;

    // Animate fire icon (continuous loop)
    useEffect(() => {
      if (currentStreak <= 0) return;
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(fireAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(fireAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }, [currentStreak]);

    // Shake animation if at risk (continuous loop)
    useEffect(() => {
      if (!streakAtRisk || currentStreak <= 0) return;
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }, [streakAtRisk, currentStreak]);

    return (
      <View style={[
        styles.container,
        streakAtRisk && styles.containerAtRisk,
      ]}>
        {/* Current Streak */}
        <Animated.View
          style={[
            styles.streakCard,
            {
              transform: [
                {
                  translateX: shakeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, streakAtRisk ? 2 : 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={{
              transform: [
                {
                  scale: fireAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2],
                  }),
                },
              ],
            }}
          >
            <MaterialCommunityIcons
              name="fire"
              size={32}
              color={streakAtRisk ? COLORS.error : COLORS.streakFlameMedium}
            />
          </Animated.View>
          <View style={styles.streakInfo}>
            <Text style={styles.streakLabel}>Current Streak</Text>
            <Text style={[
              styles.streakNumber,
              streakAtRisk && styles.streakNumberAtRisk,
            ]}>
              {currentStreak}
            </Text>
            {streakAtRisk && currentStreak > 0 && (
              <Text style={styles.atRiskText}>Practice today to keep it!</Text>
            )}
          </View>
        </Animated.View>

        {/* Longest Streak */}
        <View style={[styles.streakCard, styles.secondaryCard]}>
          <MaterialCommunityIcons
            name="trophy"
            size={28}
            color={COLORS.starGold}
          />
          <View style={styles.streakInfo}>
            <Text style={styles.secondaryLabel}>Best Streak</Text>
            <Text style={styles.secondaryNumber}>{longestStreak}</Text>
          </View>
        </View>

        {/* Freezes */}
        {freezesAvailable > 0 && (
          <View style={styles.freezeContainer}>
            <MaterialCommunityIcons
              name="snowflake"
              size={24}
              color={COLORS.info}
            />
            <Text style={styles.freezeText}>
              {freezesAvailable} freeze{freezesAvailable !== 1 ? 's' : ''} available
            </Text>
          </View>
        )}
      </View>
    );
  }
);

StreakDisplay.displayName = 'StreakDisplay';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  containerAtRisk: {
    backgroundColor: glowColor(COLORS.primary, 0.05),
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  secondaryCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.cardBorder,
  },
  streakInfo: {
    marginLeft: 12,
    flex: 1,
  },
  streakLabel: {
    fontSize: TYPOGRAPHY.caption.lg.fontSize,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  streakNumber: {
    fontSize: TYPOGRAPHY.display.sm.fontSize,
    fontWeight: TYPOGRAPHY.display.sm.fontWeight,
    color: COLORS.streakFlameMedium,
    marginTop: 2,
  },
  streakNumberAtRisk: {
    color: COLORS.primary,
  },
  atRiskText: {
    fontSize: TYPOGRAPHY.caption.md.fontSize,
    color: COLORS.primary,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
  secondaryLabel: {
    fontSize: TYPOGRAPHY.caption.md.fontSize,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  secondaryNumber: {
    fontSize: TYPOGRAPHY.heading.lg.fontSize,
    fontWeight: TYPOGRAPHY.heading.lg.fontWeight,
    color: COLORS.starGold,
    marginTop: 2,
  },
  freezeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: SPACING.sm,
    backgroundColor: glowColor(COLORS.gemDiamond, 0.1),
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: glowColor(COLORS.gemDiamond, 0.3),
  },
  freezeText: {
    marginLeft: SPACING.sm,
    fontSize: TYPOGRAPHY.caption.lg.fontSize,
    fontWeight: '500',
    color: COLORS.gemDiamond,
  },
});

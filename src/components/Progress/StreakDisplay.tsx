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

    // Animate fire icon
    useEffect(() => {
      if (currentStreak > 0) {
        Animated.loop(
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
          ])
        ).start();
      }
    }, [currentStreak]);

    // Shake animation if at risk
    useEffect(() => {
      if (streakAtRisk && currentStreak > 0) {
        Animated.loop(
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
          ])
        ).start();
      }
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
              color={streakAtRisk ? '#F44336' : '#FF6F00'}
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
            color="#FFD700"
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
              color="#2196F3"
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  containerAtRisk: {
    borderBottomColor: '#FFCDD2',
    backgroundColor: '#FFFBFB',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  secondaryCard: {
    backgroundColor: '#F3E5F5',
    borderColor: '#E1BEE7',
  },
  streakInfo: {
    marginLeft: 12,
    flex: 1,
  },
  streakLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6F00',
    marginTop: 2,
  },
  streakNumberAtRisk: {
    color: '#F44336',
  },
  atRiskText: {
    fontSize: 11,
    color: '#D32F2F',
    marginTop: 4,
    fontWeight: '500',
  },
  secondaryLabel: {
    fontSize: 11,
    color: '#666666',
    fontWeight: '500',
  },
  secondaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginTop: 2,
  },
  freezeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  freezeText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
    color: '#0277BD',
  },
});

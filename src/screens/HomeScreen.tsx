/**
 * HomeScreen Component
 * Main home screen with daily practice goal, XP/streak display, and quick actions
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { XPBar } from '../components/Progress/XPBar';
import { StreakDisplay } from '../components/Progress/StreakDisplay';

export interface HomeScreenProps {
  onNavigateToExercise?: () => void;
  onNavigateToLesson?: () => void;
  onNavigateToSongs?: () => void;
  onNavigateToSettings?: () => void;
}

interface HomeScreenState {
  currentXP: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  freezesAvailable: number;
  lastPracticeDate?: string;
  dailyGoalMinutes: number;
  minutesPracticedToday: number;
  nextExerciseTitle?: string;
  exerciseProgress?: number; // 0-100, percentage of lesson complete
}

/**
 * HomeScreen - Main dashboard with progress and quick actions
 * Shows daily goal, streak, XP, and navigation to learning content
 */
export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToExercise,
  onNavigateToLesson,
  onNavigateToSongs,
  onNavigateToSettings,
}) => {
  // Mock state - would connect to Zustand store in production
  const [state] = useState<HomeScreenState>({
    currentXP: 1234,
    currentLevel: 5,
    currentStreak: 7,
    longestStreak: 14,
    freezesAvailable: 1,
    lastPracticeDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    dailyGoalMinutes: 10,
    minutesPracticedToday: 3,
    nextExerciseTitle: 'C Major Scale - Part 2',
    exerciseProgress: 40,
  });

  const dailyGoalProgress = state.minutesPracticedToday / state.dailyGoalMinutes;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Good Evening</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onNavigateToSettings}
          >
            <MaterialCommunityIcons name="cog" size={24} color="#666666" />
          </TouchableOpacity>
        </View>

        {/* XP Bar */}
        <XPBar
          currentXP={state.currentXP}
          currentLevel={state.currentLevel}
          animatedXPGain={0}
        />

        {/* Streak Display */}
        <StreakDisplay
          currentStreak={state.currentStreak}
          longestStreak={state.longestStreak}
          freezesAvailable={state.freezesAvailable}
          lastPracticeDate={state.lastPracticeDate}
        />

        {/* Daily Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Practice</Text>
          <View style={styles.dailyGoalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>Practice Goal</Text>
              <Text style={styles.goalTime}>
                {state.minutesPracticedToday} / {state.dailyGoalMinutes} min
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  { width: `${Math.min(100, dailyGoalProgress * 100)}%` },
                ]}
              />
            </View>
            {dailyGoalProgress >= 1 && (
              <View style={styles.goalCompleteContainer}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={16}
                  color="#4CAF50"
                />
                <Text style={styles.goalCompleteText}>Daily goal complete!</Text>
              </View>
            )}
          </View>
        </View>

        {/* Continue Learning */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Learning</Text>
          <TouchableOpacity
            style={styles.continueCard}
            onPress={onNavigateToExercise}
            activeOpacity={0.7}
          >
            <View style={styles.continueHeader}>
              <MaterialCommunityIcons
                name="play-circle-outline"
                size={24}
                color="#2196F3"
              />
              <View style={styles.continueInfo}>
                <Text style={styles.continueLabel}>Lesson 2</Text>
                <Text style={styles.continueTitle}>
                  {state.nextExerciseTitle}
                </Text>
              </View>
            </View>
            <View style={styles.continueProgress}>
              <View style={styles.continueProgressBar}>
                <Animated.View
                  style={[
                    styles.continueProgressFill,
                    {
                      width: `${state.exerciseProgress}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.continueProgressText}>
                {state.exerciseProgress}% complete
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={onNavigateToLesson}
            >
              <MaterialCommunityIcons
                name="book-open-outline"
                size={28}
                color="#2196F3"
              />
              <Text style={styles.actionLabel}>Learn</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={onNavigateToExercise}
            >
              <MaterialCommunityIcons
                name="music-note-multiple"
                size={28}
                color="#FF9800"
              />
              <Text style={styles.actionLabel}>Practice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={onNavigateToSongs}
            >
              <MaterialCommunityIcons
                name="music"
                size={28}
                color="#4CAF50"
              />
              <Text style={styles.actionLabel}>Songs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={onNavigateToSettings}
            >
              <MaterialCommunityIcons
                name="tune"
                size={28}
                color="#9C27B0"
              />
              <Text style={styles.actionLabel}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Motivational tip */}
        <View style={styles.section}>
          <View style={styles.tipContainer}>
            <MaterialCommunityIcons
              name="lightbulb-on-outline"
              size={20}
              color="#FF9800"
            />
            <Text style={styles.tipText}>
              Tip: Practice for just 10 minutes a day to see real progress in 2 weeks!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

HomeScreen.displayName = 'HomeScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  settingsButton: {
    padding: 8,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  dailyGoalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  goalTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  goalCompleteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
  },
  goalCompleteText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
    color: '#2E7D32',
  },
  continueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  continueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  continueInfo: {
    marginLeft: 12,
    flex: 1,
  },
  continueLabel: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
  continueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginTop: 2,
  },
  continueProgress: {
    alignItems: 'flex-start',
  },
  continueProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  continueProgressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 3,
  },
  continueProgressText: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginTop: 8,
  },
  tipContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    alignItems: 'center',
  },
  tipText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: '#F57F17',
  },
});

/**
 * ProfileScreen - User profile, stats, and settings
 * Features cat character avatar system with backstories and unlock levels
 * Duolingo-style gamification polish: progress ring, gradient stats, horizontal achievements
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { PressableScale } from '../components/common/PressableScale';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useProgressStore } from '../stores/progressStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useAchievementStore } from '../stores/achievementStore';
import { useGemStore } from '../stores/gemStore';
import { useLearnerProfileStore } from '../stores/learnerProfileStore';
import { SKILL_TREE } from '../core/curriculum/SkillTree';
import { useCatEvolutionStore, xpToNextStage } from '../stores/catEvolutionStore';
import { EVOLUTION_XP_THRESHOLDS } from '../stores/types';
import { ACHIEVEMENTS } from '../core/achievements/achievements';
import type { Achievement } from '../core/achievements/achievements';
import { CatAvatar } from '../components/Mascot/CatAvatar';
import { CAT_CHARACTERS, getCatById } from '../components/Mascot/catCharacters';
import { getLevelProgress } from '../core/progression/XpSystem';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS, glowColor } from '../theme/tokens';
import { GradientMeshBackground } from '../components/effects';
import { useAuthStore } from '../stores/authStore';
import type { RootStackParamList } from '../navigation/AppNavigator';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type ProfileNavProp = NativeStackNavigationProp<RootStackParamList>;

const DAILY_GOAL_OPTIONS = [5, 10, 15, 20];
const VOLUME_OPTIONS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
];


/** Animated shimmer pulse wrapper for unlocked achievements */
function ShimmerBadge({ children, isUnlocked }: { children: React.ReactNode; isUnlocked: boolean }): React.ReactElement {
  const shimmerOpacity = useSharedValue(1);

  useEffect(() => {
    if (isUnlocked) {
      shimmerOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      shimmerOpacity.value = 1;
    }
  }, [isUnlocked, shimmerOpacity]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: isUnlocked ? shimmerOpacity.value : 0.5,
  }));

  return (
    <Animated.View style={shimmerStyle}>
      {children}
    </Animated.View>
  );
}


/** Personal journey stat tile */
function JourneyStat({ icon, label, value, color }: { icon: IconName; label: string; value: string; color: string }) {
  return (
    <View style={styles.journeyTile}>
      <View style={[styles.journeyIconDot, { backgroundColor: glowColor(color, 0.15) }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.journeyValue, { color }]}>{value}</Text>
      <Text style={styles.journeyLabel}>{label}</Text>
    </View>
  );
}

/** Get the last 7 days of practice data for the chart */
function useWeeklyPractice(): { day: string; minutes: number }[] {
  const { dailyGoalData } = useProgressStore();

  return useMemo(() => {
    const days: { day: string; minutes: number }[] = [];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const dayLabel = dayLabels[date.getDay()];
      const minutes = dailyGoalData[key]?.minutesPracticed ?? 0;
      days.push({ day: dayLabel, minutes });
    }
    return days;
  }, [dailyGoalData]);
}

/** Achievements section as horizontal scroll with circular badges */
function AchievementsSection(): React.ReactElement {
  const { unlockedIds } = useAchievementStore();
  const unlockedSet = useMemo(() => new Set(Object.keys(unlockedIds)), [unlockedIds]);
  const unlockedCount = unlockedSet.size;
  const totalCount = ACHIEVEMENTS.length;

  // Determine recently unlocked (within last 24 hours)
  const recentlyUnlockedSet = useMemo(() => {
    const recent = new Set<string>();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    for (const [id, timestamp] of Object.entries(unlockedIds)) {
      if (new Date(timestamp).getTime() > oneDayAgo) {
        recent.add(id);
      }
    }
    return recent;
  }, [unlockedIds]);

  // Sort: unlocked first (newest first), then locked
  const sortedAchievements = useMemo(() => {
    const unlocked: Achievement[] = [];
    const locked: Achievement[] = [];
    for (const a of ACHIEVEMENTS) {
      if (unlockedSet.has(a.id)) {
        unlocked.push(a);
      } else {
        locked.push(a);
      }
    }
    // Sort unlocked by unlock time (newest first)
    unlocked.sort((a, b) => {
      const timeA = unlockedIds[a.id] ?? '';
      const timeB = unlockedIds[b.id] ?? '';
      return timeB.localeCompare(timeA);
    });
    return [...unlocked, ...locked];
  }, [unlockedSet, unlockedIds]);

  const handleBadgePress = useCallback((achievement: Achievement, isUnlocked: boolean) => {
    if (isUnlocked) {
      Alert.alert(
        achievement.title,
        `${achievement.description}\n\n+${achievement.xpReward} XP`,
      );
    } else {
      Alert.alert(
        achievement.title,
        achievement.description,
      );
    }
  }, []);

  return (
    <View style={styles.section}>
      <View style={styles.achievementHeader}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <Text style={styles.achievementCounter}>
          {unlockedCount}/{totalCount}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.achievementScrollContent}
      >
        {sortedAchievements.map((achievement) => {
          const isUnlocked = unlockedSet.has(achievement.id);
          const isRecent = recentlyUnlockedSet.has(achievement.id);
          return (
            <PressableScale
              key={achievement.id}
              style={styles.achievementBadgeContainer}
              onPress={() => handleBadgePress(achievement, isUnlocked)}
            >
              <ShimmerBadge isUnlocked={isUnlocked}>
                <View
                  style={[
                    styles.achievementBadge,
                    isUnlocked
                      ? styles.achievementBadgeUnlocked
                      : styles.achievementBadgeLocked,
                    isRecent && styles.achievementBadgeRecent,
                  ]}
                >
                  {isUnlocked ? (
                    <MaterialCommunityIcons
                      name={achievement.icon as IconName}
                      size={32}
                      color={COLORS.starGold}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="lock"
                      size={24}
                      color={COLORS.textMuted}
                    />
                  )}
                </View>
              </ShimmerBadge>
              <Text
                style={[
                  styles.achievementBadgeLabel,
                  !isUnlocked && styles.achievementBadgeLabelLocked,
                ]}
                numberOfLines={2}
              >
                {achievement.title}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Ring constants — matches HomeScreen GOAL_ARC pattern */
const RING_SIZE = 160;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function ProfileScreen(): React.ReactElement {
  const navigation = useNavigation<ProfileNavProp>();
  const { totalXp, level, streakData, lessonProgress } = useProgressStore();
  const {
    dailyGoalMinutes, masterVolume, displayName, username, selectedCatId,
    preferredInputMethod, micDetectionMode,
    setDailyGoalMinutes, setMasterVolume, setDisplayName, setUsername,
    setPreferredInputMethod, setMicDetectionMode,
  } = useSettingsStore();
  const weeklyPractice = useWeeklyPractice();
  const totalWeekMinutes = weeklyPractice.reduce((sum, d) => sum + d.minutes, 0);
  const maxDayMinutes = Math.max(...weeklyPractice.map(d => d.minutes), 1);

  const [activeTab, setActiveTab] = useState<'me' | 'settings'>('me');
  const [showXpTooltip, setShowXpTooltip] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showVolumePicker, setShowVolumePicker] = useState(false);
  const [showInputPicker, setShowInputPicker] = useState(false);
  const [showDetectionModePicker, setShowDetectionModePicker] = useState(false);
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [editingName, setEditingName] = useState(displayName);
  const [showUsernameEditor, setShowUsernameEditor] = useState(false);
  const [editingUsername, setEditingUsername] = useState(username || '');

  const selectedCat = getCatById(selectedCatId) ?? CAT_CHARACTERS[0];
  const catColor = selectedCat.color;

  // Gem balance
  const gems = useGemStore((s) => s.gems);

  // Cat evolution
  const evolutionData = useCatEvolutionStore((s) => s.evolutionData[selectedCatId]);
  const evolutionStage = evolutionData?.currentStage ?? 'baby';
  const evolutionXp = evolutionData?.xpAccumulated ?? 0;
  const nextStageInfo = xpToNextStage(evolutionXp);

  // Level progress
  const levelProgress = getLevelProgress(totalXp);

  // Personal journey data
  const masteredSkills = useLearnerProfileStore((s) => s.masteredSkills);
  const totalSkills = SKILL_TREE.length;
  const totalStars = useMemo(() =>
    Object.values(lessonProgress).reduce(
      (sum, l) => sum + Object.values(l.exerciseScores).reduce((s, e) => s + (e.stars ?? 0), 0), 0
    ), [lessonProgress]);
  const totalExercisesCompleted = useMemo(() => {
    let count = 0;
    for (const lp of Object.values(lessonProgress)) {
      count += Object.values(lp.exerciseScores).filter(s => s.completedAt != null).length;
    }
    return count;
  }, [lessonProgress]);
  const totalPracticeMinutes = useMemo(() => {
    const { dailyGoalData: goalData } = useProgressStore.getState();
    return Object.values(goalData).reduce((sum, d) => sum + (d.minutesPracticed ?? 0), 0);
  }, []);

  // Goal line height for the chart
  const goalLineHeight = dailyGoalMinutes > 0
    ? Math.max(8, (dailyGoalMinutes / Math.max(maxDayMinutes, dailyGoalMinutes)) * 80)
    : 0;

  const handleSaveName = useCallback(() => {
    const trimmed = editingName.trim();
    if (trimmed.length > 0) {
      setDisplayName(trimmed);
      // Also push to Firebase Auth so it syncs across devices
      const { updateDisplayName, user } = useAuthStore.getState();
      if (user && !user.isAnonymous) {
        updateDisplayName(trimmed).catch(() => {});
      }
    }
    setShowNameEditor(false);
  }, [editingName, setDisplayName]);

  const handleSaveUsername = useCallback(() => {
    const trimmed = editingUsername.trim();
    if (trimmed.length >= 3) {
      setUsername(trimmed);
      // Sync to Firestore
      const { user } = useAuthStore.getState();
      if (user && !user.isAnonymous) {
        const { updateUserProfile } = require('../services/firebase/firestore');
        updateUserProfile(user.uid, { username: trimmed } as any).catch(() => {});
      }
    }
    setShowUsernameEditor(false);
  }, [editingUsername, setUsername]);

  return (
    <SafeAreaView style={styles.container} testID="profile-screen">
      <GradientMeshBackground accent="profile" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        testID="profile-scroll"
      >
        {/* Header — cat avatar in level XP ring */}
        <LinearGradient
          colors={[glowColor(catColor, 0.13), 'transparent', 'transparent']}
          style={styles.header}
        >
          {/* Level XP ring with cat avatar inside — tap for XP detail */}
          <PressableScale
            style={styles.ringContainer}
            onPress={() => setShowXpTooltip((v) => !v)}
            testID="profile-level-ring"
          >
            <Svg width={RING_SIZE} height={RING_SIZE}>
              {/* Background track */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={glowColor(COLORS.primary, 0.15)}
                strokeWidth={RING_STROKE}
                fill="transparent"
              />
              {/* Progress arc */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={COLORS.primaryLight}
                strokeWidth={RING_STROKE}
                fill="transparent"
                strokeDasharray={`${RING_CIRCUMFERENCE}`}
                strokeDashoffset={(1 - levelProgress.percentToNextLevel / 100) * RING_CIRCUMFERENCE}
                strokeLinecap="round"
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>
            <View style={styles.avatarInRing}>
              <CatAvatar catId={selectedCatId} size="large" evolutionStage={evolutionStage} />
            </View>
          </PressableScale>
          {/* Inline XP tooltip — shown on ring tap */}
          {showXpTooltip && (
            <Text style={styles.xpTooltip}>
              {levelProgress.xpToNextLevel} XP to level {level + 1}
            </Text>
          )}

          {/* All stat pills in one row */}
          <View style={styles.heroPills}>
            <View style={styles.heroPill}>
              <MaterialCommunityIcons name="fire" size={16} color={COLORS.starGold} />
              <Text style={styles.heroPillText}>{streakData.currentStreak}</Text>
            </View>
            <View style={styles.heroPill}>
              <MaterialCommunityIcons name="shield-star" size={18} color={COLORS.starGold} />
              <Text style={styles.heroPillText}>Lv. {level}</Text>
            </View>
            <View style={styles.heroPill}>
              <MaterialCommunityIcons name="lightning-bolt" size={16} color={COLORS.starGold} />
              <Text style={styles.heroPillText}>{totalXp} XP</Text>
            </View>
            <View style={styles.heroPill}>
              <MaterialCommunityIcons name="diamond-stone" size={16} color={COLORS.gemGold} />
              <Text style={[styles.heroPillText, { color: COLORS.gemGold }]}>{gems}</Text>
            </View>
            <View style={styles.heroPill}>
              <MaterialCommunityIcons name="star" size={16} color={COLORS.starGold} />
              <Text style={styles.heroPillText}>{totalStars}</Text>
            </View>
          </View>

          {/* Display name + username */}
          {showNameEditor ? (
            <View style={styles.inlineNameEdit} testID="name-editor">
              <TextInput
                style={styles.inlineNameInput}
                value={editingName}
                onChangeText={setEditingName}
                maxLength={30}
                autoFocus
                selectTextOnFocus
                placeholder="Display name"
                placeholderTextColor={COLORS.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                onBlur={handleSaveName}
                testID="name-input"
              />
              <PressableScale onPress={handleSaveName} style={styles.inlineNameSave} testID="name-save-btn">
                <MaterialCommunityIcons name="check" size={18} color={COLORS.textPrimary} />
              </PressableScale>
            </View>
          ) : (
            <PressableScale onPress={() => { setEditingName(displayName); setShowNameEditor(true); }} testID="name-display">
              <View style={styles.nameRow}>
                <Text style={styles.displayNameText}>{displayName}</Text>
                <View style={styles.nameEditBtn}>
                  <MaterialCommunityIcons name="pencil" size={12} color={COLORS.textPrimary} />
                </View>
              </View>
            </PressableScale>
          )}
          {username ? (
            <Text style={styles.usernameSubtext}>@{username}</Text>
          ) : null}
          <PressableScale
            onPress={() => navigation.navigate('CatSwitch')}
            testID="profile-open-cat-switch"
          >
            <Text style={styles.changeCatLink}>{selectedCat.name} &middot; Tap to change</Text>
          </PressableScale>
        </LinearGradient>

        {/* Tab Toggle */}
        <View style={styles.tabRow}>
          <PressableScale
            onPress={() => setActiveTab('me')}
            style={[styles.tab, activeTab === 'me' && styles.tabActive]}
          >
            <MaterialCommunityIcons name="account" size={18} color={activeTab === 'me' ? COLORS.textPrimary : COLORS.textMuted} />
            <Text style={[styles.tabText, activeTab === 'me' && styles.tabTextActive]}>Me</Text>
          </PressableScale>
          <PressableScale
            onPress={() => setActiveTab('settings')}
            style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          >
            <MaterialCommunityIcons name="cog" size={18} color={activeTab === 'settings' ? COLORS.textPrimary : COLORS.textMuted} />
            <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>Settings</Text>
          </PressableScale>
        </View>

        {activeTab === 'me' && (
        <>

        {/* Your Journey — personal milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Journey</Text>
          <View style={styles.journeyGrid}>
            <JourneyStat icon="fire" label="Best Streak" value={`${streakData.longestStreak} days`} color={COLORS.warning} />
            <JourneyStat icon="clock-outline" label="Total Practice" value={totalPracticeMinutes >= 60 ? `${Math.floor(totalPracticeMinutes / 60)}h ${totalPracticeMinutes % 60}m` : `${totalPracticeMinutes} min`} color={COLORS.info} />
            <JourneyStat icon="brain" label="Skills Mastered" value={`${masteredSkills.length} / ${totalSkills}`} color={COLORS.evolutionGlow} />
            <JourneyStat icon="music-note-eighth" label="Exercises Done" value={`${totalExercisesCompleted}`} color={COLORS.primary} />
          </View>
        </View>

        {/* Evolution Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evolution Progress</Text>
          <View style={styles.evolutionCard}>
            <View style={styles.evolutionHeader}>
              <MaterialCommunityIcons name="paw" size={32} color={COLORS.evolutionGlow} />
              <View style={styles.evolutionHeaderText}>
                <Text style={styles.evolutionStageName}>
                  {selectedCat.name}
                </Text>
                <Text style={styles.evolutionStageLabel}>
                  {evolutionStage.charAt(0).toUpperCase() + evolutionStage.slice(1)} Stage
                </Text>
              </View>
              <View style={styles.evolutionXpBadge}>
                <MaterialCommunityIcons name="star-four-points" size={14} color={COLORS.evolutionGlow} />
                <Text style={styles.evolutionXpBadgeText}>{evolutionXp} XP</Text>
              </View>
            </View>
            {nextStageInfo ? (
              <>
                <View style={styles.evolutionBarTrack}>
                  <View
                    style={[
                      styles.evolutionBarFill,
                      {
                        width: `${Math.max(3, Math.min(100, Math.round(
                          ((evolutionXp - EVOLUTION_XP_THRESHOLDS[evolutionStage]) /
                            (EVOLUTION_XP_THRESHOLDS[nextStageInfo.nextStage] - EVOLUTION_XP_THRESHOLDS[evolutionStage])) * 100
                        )))}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.evolutionFooter}>
                  <Text style={styles.evolutionXpText}>
                    {evolutionXp - EVOLUTION_XP_THRESHOLDS[evolutionStage]} / {EVOLUTION_XP_THRESHOLDS[nextStageInfo.nextStage] - EVOLUTION_XP_THRESHOLDS[evolutionStage]} XP
                  </Text>
                  <Text style={styles.evolutionNextLabel}>
                    Next: {nextStageInfo.nextStage.charAt(0).toUpperCase() + nextStageInfo.nextStage.slice(1)}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.evolutionMaxBadge}>
                <MaterialCommunityIcons name="crown" size={16} color={COLORS.starGold} />
                <Text style={styles.evolutionMaxText}>Max stage reached!</Text>
              </View>
            )}
          </View>
        </View>

        {/* Weekly Practice Chart */}
        <View style={styles.section}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <Text style={styles.chartTotal}>{totalWeekMinutes} min total</Text>
          </View>
          <View style={styles.chartContainer}>
            {/* Goal line (dashed) */}
            {goalLineHeight > 0 && (
              <View
                style={[
                  styles.goalLine,
                  { bottom: goalLineHeight + 28 },
                ]}
              >
                <View style={styles.goalLineDash} />
                <Text style={styles.goalLineLabel}>{dailyGoalMinutes}m</Text>
              </View>
            )}
            {weeklyPractice.map((day, index) => {
              const effectiveMax = Math.max(maxDayMinutes, dailyGoalMinutes);
              const barHeight = day.minutes > 0
                ? Math.max(8, (day.minutes / effectiveMax) * 80)
                : 4;
              const isToday = index === 6;
              return (
                <View key={day.day} style={styles.chartColumn}>
                  <Text style={styles.chartMinutes}>
                    {day.minutes > 0 ? day.minutes : ''}
                  </Text>
                  <View style={styles.chartBarTrack}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: barHeight,
                          width: isToday ? 22 : 16,
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: 4,
                          borderBottomLeftRadius: 2,
                          borderBottomRightRadius: 2,
                          backgroundColor: day.minutes > 0
                            ? (isToday ? COLORS.primary : glowColor(COLORS.primary, 0.53))
                            : COLORS.cardBorder,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.chartDay, isToday && styles.chartDayActive]}>
                    {day.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Achievements as horizontal scroll */}
        <AchievementsSection />
        </>
        )}

        {activeTab === 'settings' && (
        <>
        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          {/* Username editor */}
          <PressableScale style={styles.settingItem} onPress={() => { setEditingUsername(username || ''); setShowUsernameEditor(!showUsernameEditor); }}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="at" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingLabel}>Username</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{username || 'Not set'}</Text>
              <MaterialCommunityIcons name={showUsernameEditor ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
            </View>
          </PressableScale>
          {showUsernameEditor && (
            <View style={styles.usernameEditRow}>
              <TextInput
                style={styles.usernameInput}
                value={editingUsername}
                onChangeText={setEditingUsername}
                maxLength={20}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="username (3-20 chars)"
                placeholderTextColor={COLORS.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleSaveUsername}
                testID="username-input"
              />
              <PressableScale onPress={handleSaveUsername} style={styles.usernameSaveBtn} testID="username-save-btn">
                <MaterialCommunityIcons name="check" size={18} color={COLORS.textPrimary} />
              </PressableScale>
            </View>
          )}

          <PressableScale style={styles.settingItem} onPress={() => setShowGoalPicker(!showGoalPicker)}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="target" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingLabel}>Daily Goal</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{dailyGoalMinutes} min</Text>
              <MaterialCommunityIcons name={showGoalPicker ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
            </View>
          </PressableScale>
          {showGoalPicker && (
            <View style={styles.pickerRow}>
              {DAILY_GOAL_OPTIONS.map((mins) => (
                <PressableScale
                  key={mins}
                  style={[styles.pickerChip, dailyGoalMinutes === mins && styles.pickerChipActive]}
                  onPress={() => { setDailyGoalMinutes(mins); setShowGoalPicker(false); }}
                >
                  <Text style={[styles.pickerChipText, dailyGoalMinutes === mins && styles.pickerChipTextActive]}>
                    {mins} min
                  </Text>
                </PressableScale>
              ))}
            </View>
          )}

          <PressableScale style={styles.settingItem} onPress={() => setShowVolumePicker(!showVolumePicker)}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="volume-high" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingLabel}>Volume</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{Math.round(masterVolume * 100)}%</Text>
              <MaterialCommunityIcons name={showVolumePicker ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
            </View>
          </PressableScale>
          {showVolumePicker && (
            <View style={styles.pickerRow}>
              {VOLUME_OPTIONS.map((opt) => (
                <PressableScale
                  key={opt.value}
                  style={[styles.pickerChip, masterVolume === opt.value && styles.pickerChipActive]}
                  onPress={() => { setMasterVolume(opt.value); setShowVolumePicker(false); }}
                >
                  <Text style={[styles.pickerChipText, masterVolume === opt.value && styles.pickerChipTextActive]}>
                    {opt.label}
                  </Text>
                </PressableScale>
              ))}
            </View>
          )}

          <PressableScale style={styles.settingItem} onPress={() => setShowInputPicker(!showInputPicker)}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="music-note" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingLabel}>Input Method</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>
                {preferredInputMethod === 'auto' ? 'Auto' : preferredInputMethod === 'midi' ? 'MIDI' : preferredInputMethod === 'mic' ? 'Mic' : 'Touch'}
              </Text>
              <MaterialCommunityIcons name={showInputPicker ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
            </View>
          </PressableScale>
          {showInputPicker && (
            <View style={styles.pickerRow}>
              {([
                { value: 'auto', label: 'Auto', icon: 'auto-fix' },
                { value: 'midi', label: 'MIDI', icon: 'piano' },
                { value: 'mic', label: 'Mic', icon: 'microphone' },
                { value: 'touch', label: 'Touch', icon: 'gesture-tap' },
              ] as const).map((opt) => (
                <PressableScale
                  key={opt.value}
                  style={[styles.pickerChip, preferredInputMethod === opt.value && styles.pickerChipActive]}
                  onPress={() => {
                    if (opt.value === 'mic') {
                      // Set 'mic' explicitly — 'auto' mode skips mic to avoid
                      // iOS audio routing to earpiece. MicSetupScreen handles
                      // permission; preference must be stored regardless.
                      setPreferredInputMethod('mic');
                      navigation.navigate('MicSetup');
                      setShowInputPicker(false);
                    } else {
                      setPreferredInputMethod(opt.value);
                      setShowInputPicker(false);
                    }
                  }}
                >
                  <Text style={[styles.pickerChipText, preferredInputMethod === opt.value && styles.pickerChipTextActive]}>
                    {opt.label}
                  </Text>
                </PressableScale>
              ))}
            </View>
          )}

          {(preferredInputMethod === 'mic' || preferredInputMethod === 'auto') && (
            <>
              <PressableScale style={styles.settingItem} onPress={() => setShowDetectionModePicker(!showDetectionModePicker)}>
                <View style={styles.settingLeft}>
                  <MaterialCommunityIcons name="waveform" size={24} color={COLORS.textSecondary} />
                  <Text style={styles.settingLabel}>Mic Detection</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>
                    {micDetectionMode === 'polyphonic' ? 'Chords' : 'Single Notes'}
                  </Text>
                  <MaterialCommunityIcons name={showDetectionModePicker ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
                </View>
              </PressableScale>
              {showDetectionModePicker && (
                <View style={styles.pickerRow}>
                  {([
                    { value: 'monophonic' as const, label: 'Single Notes' },
                    { value: 'polyphonic' as const, label: 'Chords (AI)' },
                  ]).map((opt) => (
                    <PressableScale
                      key={opt.value}
                      style={[styles.pickerChip, micDetectionMode === opt.value && styles.pickerChipActive]}
                      onPress={() => {
                        setMicDetectionMode(opt.value);
                        setShowDetectionModePicker(false);
                      }}
                    >
                      <Text style={[styles.pickerChipText, micDetectionMode === opt.value && styles.pickerChipTextActive]}>
                        {opt.label}
                      </Text>
                    </PressableScale>
                  ))}
                </View>
              )}
            </>
          )}

          <PressableScale
            style={styles.settingItem}
            onPress={() => navigation.navigate('CatSwitch')}
            testID="profile-open-cat-switch-row"
          >
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="cat" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingLabel}>Change Cat</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textMuted} />
          </PressableScale>

          <PressableScale
            style={styles.settingItem}
            onPress={() => navigation.navigate('MidiSetup')}
            testID="profile-open-midi-setup"
          >
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="piano" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingLabel}>MIDI Setup</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textMuted} />
          </PressableScale>

          <PressableScale
            style={styles.settingItem}
            onPress={() => navigation.navigate('Account')}
            testID="profile-open-account"
          >
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="account-cog" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingLabel}>Account</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textMuted} />
          </PressableScale>

          <PressableScale
            style={styles.settingItem}
            onPress={() => Alert.alert('About Purrrfect Keys', 'Purrrfect Keys v1.0.0\nAI-Powered Piano Learning\n\nLearn piano with real-time feedback, MIDI support, and AI coaching.')}
          >
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="information" size={24} color={COLORS.textSecondary} />
              <Text style={styles.settingLabel}>About</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textMuted} />
          </PressableScale>

          {__DEV__ && (
            <PressableScale
              style={styles.settingItem}
              onPress={() => navigation.navigate('DebugLog')}
              testID="profile-debug-log"
            >
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="bug" size={24} color={COLORS.warning} />
                <Text style={styles.settingLabel}>Debug Log</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textMuted} />
            </PressableScale>
          )}
        </View>
        </>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  avatarInRing: {
    position: 'absolute',
  },
  xpTooltip: {
    ...TYPOGRAPHY.caption.md,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: glowColor(COLORS.starGold, 0.1),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: glowColor(COLORS.starGold, 0.2),
  },
  heroPillText: {
    ...TYPOGRAPHY.body.sm,
    fontWeight: '700' as const,
    color: COLORS.starGold,
  },
  changeCatLink: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
  },
  displayNameText: {
    ...TYPOGRAPHY.display.sm,
    fontWeight: '800' as const,
    color: COLORS.textPrimary,
  },
  usernameSubtext: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  usernameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  usernameInput: {
    flex: 1,
    ...TYPOGRAPHY.body.md,
    color: COLORS.textPrimary,
    backgroundColor: glowColor(COLORS.textPrimary, 0.08),
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.3),
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
  },
  usernameSaveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tab toggle
  tabRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  tabActive: {
    backgroundColor: glowColor(COLORS.primary, 0.15),
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.3),
  },
  tabText: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600' as const,
  },
  // Journey milestones
  journeyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  journeyTile: {
    width: '47%' as unknown as number,
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: glowColor(COLORS.textPrimary, 0.05),
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: glowColor(COLORS.textPrimary, 0.08),
    gap: 4,
  },
  journeyIconDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  journeyValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800' as const,
  },
  journeyLabel: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
  },
  // Sections
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.heading.lg,
    fontWeight: '800' as const,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  // Settings
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: glowColor(COLORS.textPrimary, 0.06),
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: glowColor(COLORS.textPrimary, 0.10),
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md - 4,
  },
  settingLabel: {
    ...TYPOGRAPHY.heading.sm,
    fontWeight: '400' as const,
    color: COLORS.textPrimary,
  },
  settingValue: {
    ...TYPOGRAPHY.heading.sm,
    fontWeight: '400' as const,
    color: COLORS.textSecondary,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  pickerChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.cardSurface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  pickerChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pickerChipText: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  pickerChipTextActive: {
    color: COLORS.textPrimary,
  },
  // Chart
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  chartTotal: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '600' as const,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: glowColor(COLORS.textPrimary, 0.06),
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    paddingBottom: SPACING.md - 4,
    borderWidth: 1,
    borderColor: glowColor(COLORS.textPrimary, 0.10),
    height: 140,
    position: 'relative',
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  chartMinutes: {
    ...TYPOGRAPHY.caption.sm,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  chartBarTrack: {
    width: 24,
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    minHeight: 4,
  },
  chartDay: {
    ...TYPOGRAPHY.caption.md,
    fontWeight: '500' as const,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  chartDayActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  // Goal line
  goalLine: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 0,
  },
  goalLineDash: {
    flex: 1,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: glowColor(COLORS.textPrimary, 0.2),
  },
  goalLineLabel: {
    ...TYPOGRAPHY.caption.sm,
    fontSize: 9,
    fontWeight: '600' as const,
    color: glowColor(COLORS.textPrimary, 0.3),
    marginLeft: SPACING.xs,
  },
  // Achievement badges (horizontal scroll)
  achievementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementCounter: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '600' as const,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  achievementScrollContent: {
    paddingRight: SPACING.md,
    gap: SPACING.md,
  },
  achievementBadgeContainer: {
    alignItems: 'center',
    width: 80,
  },
  achievementBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  achievementBadgeUnlocked: {
    backgroundColor: glowColor(COLORS.starGold, 0.18),
    borderWidth: 2,
    borderColor: glowColor(COLORS.starGold, 0.4),
    ...(Platform.OS === 'ios' ? {
      shadowColor: COLORS.starGold,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    } : { elevation: 4 }),
  },
  achievementBadgeLocked: {
    backgroundColor: glowColor(COLORS.textPrimary, 0.04),
    borderWidth: 1,
    borderColor: glowColor(COLORS.textPrimary, 0.10),
  },
  achievementBadgeRecent: {
    shadowColor: COLORS.starGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  achievementBadgeLabel: {
    ...TYPOGRAPHY.caption.md,
    fontWeight: '500' as const,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  achievementBadgeLabelLocked: {
    color: COLORS.textMuted,
  },
  // Inline name editing
  inlineNameEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  inlineNameInput: {
    flex: 1,
    ...TYPOGRAPHY.heading.sm,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
    backgroundColor: glowColor(COLORS.textPrimary, 0.08),
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.3),
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
  },
  inlineNameSave: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameEditBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: glowColor(COLORS.textPrimary, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Evolution progress
  evolutionCard: {
    ...SHADOWS.sm,
    backgroundColor: glowColor(COLORS.textPrimary, 0.06),
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: glowColor(COLORS.evolutionGlow, 0.25),
  },
  evolutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  evolutionHeaderText: {
    flex: 1,
  },
  evolutionStageName: {
    ...TYPOGRAPHY.heading.sm,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
  },
  evolutionStageLabel: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.evolutionGlow,
    fontWeight: '600' as const,
    marginTop: 1,
  },
  evolutionXpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: glowColor(COLORS.evolutionGlow, 0.12),
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  evolutionXpBadgeText: {
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '700' as const,
    color: COLORS.evolutionGlow,
  },
  evolutionBarTrack: {
    height: 10,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  evolutionBarFill: {
    height: '100%',
    backgroundColor: COLORS.evolutionGlow,
    borderRadius: 5,
  },
  evolutionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  evolutionXpText: {
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  evolutionNextLabel: {
    ...TYPOGRAPHY.caption.md,
    fontWeight: '600' as const,
    color: COLORS.evolutionGlow,
  },
  evolutionMaxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    backgroundColor: glowColor(COLORS.starGold, 0.1),
    borderRadius: BORDER_RADIUS.sm,
  },
  evolutionMaxText: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '700' as const,
    color: COLORS.starGold,
  },
});

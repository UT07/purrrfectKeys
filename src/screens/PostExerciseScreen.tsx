/**
 * Post-Exercise Screen
 * Full-screen results screen shown after the XP transition overlay.
 * Clean layout with score breakdown, coaching feedback, fun facts,
 * practice strategy, and action buttons.
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Share,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import Reanimated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/common/Button';
import { PressableScale } from '../components/common/PressableScale';
import { ScoreRing } from '../components/common/ScoreRing';
import { MascotBubble } from '../components/Mascot/MascotBubble';
import { CatAvatar } from '../components/Mascot/CatAvatar';
import { SalsaCoach } from '../components/Mascot/SalsaCoach';
import { FunFactCard } from '../components/FunFact/FunFactCard';
import { getFactForExerciseType } from '../content/funFactSelector';
import { ChallengeFriendSheet } from '../components/ChallengeFriendSheet';
import { getRandomCatMessage } from '../content/catDialogue';
import { coachingService } from '../services/ai/CoachingService';
import { ttsService } from '../services/tts/TTSService';
import { useProgressStore } from '../stores/progressStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCatEvolutionStore } from '../stores/catEvolutionStore';
import { useSocialStore } from '../stores/socialStore';
import { getLessonIdForExercise } from '../content/ContentLoader';
import { COLORS, SPACING, BORDER_RADIUS, RARITY, glowColor } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { Exercise, ExerciseScore } from '../core/exercises/types';
import type { ExerciseType } from '../core/exercises/types';
import type { MascotMood } from '../components/Mascot/mascotTips';
import { getPostExerciseData, clearPostExerciseData } from './postExerciseCache';
import { logger } from '../utils/logger';

type PostExerciseNavProp = NativeStackNavigationProp<RootStackParamList, 'PostExercise'>;

export function PostExerciseScreen(): React.ReactElement {
  const navigation = useNavigation<PostExerciseNavProp>();

  // Read completion data from cache (set by ExercisePlayer before navigating).
  // Clear on unmount (not in useMemo) to avoid side-effects during render and
  // to survive React StrictMode double-render without losing data.
  const cachedData = useMemo(() => getPostExerciseData(), []);
  useEffect(() => {
    return () => { clearPostExerciseData(); };
  }, []);

  // If no cached data (e.g., deep link or process restart), navigate away safely.
  // ExercisePlayer uses navigation.replace, so there may be nothing to goBack to.
  useEffect(() => {
    if (!cachedData) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('MainTabs');
      }
    }
  }, [cachedData, navigation]);

  // Destructure cached data (all hooks must run unconditionally — Rules of Hooks)
  const score = cachedData?.score;
  const exercise = cachedData?.exercise;
  const gemsEarned = cachedData?.gemsEarned ?? 0;
  const chestType = cachedData?.chestType;
  const sessionMinutes = cachedData?.sessionMinutes ?? 1;
  const tempoChange = cachedData?.tempoChange ?? 0;
  const failCount = cachedData?.failCount ?? 0;
  const challengeSentTo = cachedData?.challengeSentTo;
  const hasNextExercise = cachedData?.hasNextExercise;
  const hasNextAIExercise = cachedData?.hasNextAIExercise;
  const hasMasteryTest = cachedData?.hasMasteryTest;
  const hasReplay = cachedData?.hasReplay;
  const exerciseId = cachedData?.exerciseId;
  const skillId = cachedData?.skillId;
  const exerciseType = cachedData?.exerciseType;
  const nextExerciseId = cachedData?.nextExerciseId;

  // AI Coach feedback
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const hasAutoPlayed = useRef(false);

  // Challenge a Friend
  const [showChallengeSheet, setShowChallengeSheet] = useState(false);
  const allFriends = useSocialStore((s) => s.friends);
  const acceptedFriends = useMemo(() => allFriends.filter((f) => f.status === 'accepted'), [allFriends]);

  // Cat dialogue & evolution
  const selectedCatId = useSettingsStore((s) => s.selectedCatId) ?? 'mini-meowww';
  const evolutionStage = useCatEvolutionStore(
    (s) => s.evolutionData[selectedCatId]?.currentStage ?? 'baby'
  );
  const catDialogue = useMemo(() => {
    if (!score) return '';
    const trigger = score.isPassed ? 'exercise_complete_pass' : 'exercise_complete_fail';
    const condition = score.stars === 3 ? 'score_high' : score.overall < 50 ? 'score_low' : undefined;
    return getRandomCatMessage(selectedCatId, trigger, condition);
  }, [selectedCatId, score]);

  // Mascot mood
  const mascotMood: MascotMood = useMemo(() => {
    if (!score) return 'encouraging';
    if (score.overall >= 95) return 'celebrating';
    if (score.overall >= 80) return 'happy';
    return 'encouraging';
  }, [score]);

  // Fun fact
  const completionFunFact = useMemo(
    () => (score?.isPassed && exercise ? getFactForExerciseType(exercise.metadata.skills) : null),
    [score?.isPassed, exercise]
  );

  // Fetch AI coaching feedback
  useEffect(() => {
    if (!exercise || !score) return;
    let cancelled = false;

    const fetchFeedback = async () => {
      try {
        const { level, lessonProgress } = useProgressStore.getState();
        const exLessonId = getLessonIdForExercise(exercise.id);
        const exProgress = exLessonId
          ? lessonProgress[exLessonId]?.exerciseScores[exercise.id]
          : undefined;
        const attemptNumber = exProgress?.attempts ?? 1;
        const recentScores = exProgress?.averageScore != null ? [exProgress.averageScore] : [];
        const feedbackPromise = coachingService.generateFeedback({
          exerciseId: exercise.id,
          exerciseTitle: exercise.metadata.title,
          difficulty: exercise.metadata.difficulty,
          score,
          userLevel: level,
          attemptNumber,
          recentScores,
          sessionMinutes,
        });
        const result = await Promise.race([
          feedbackPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Coach feedback timeout')), 6000)
          ),
        ]);
        if (!cancelled) setCoachFeedback(result.feedback);
      } catch (err) {
        logger.warn('[PostExerciseScreen] Coach feedback fetch failed:', err);
        if (!cancelled) setCoachFeedback('Keep practicing! You are making great progress.');
      } finally {
        if (!cancelled) setCoachLoading(false);
      }
    };

    fetchFeedback();
    return () => { cancelled = true; };
  }, [exercise, score, sessionMinutes]);

  // Auto-play coaching via TTS
  useEffect(() => {
    if (!coachFeedback || coachLoading || hasAutoPlayed.current) return;
    hasAutoPlayed.current = true;
    const timer = setTimeout(() => {
      ttsService.speak(coachFeedback, { catId: 'salsa' });
    }, 400);
    return () => {
      clearTimeout(timer);
      ttsService.stop();
    };
  }, [coachFeedback, coachLoading]);

  // Navigation handlers
  const handleRetry = useCallback(() => {
    if (!exerciseId) return;
    navigation.replace('Exercise', {
      exerciseId,
      ...(skillId ? { skillId } : {}),
      ...(exerciseType ? { exerciseType: exerciseType as ExerciseType } : {}),
    });
  }, [navigation, exerciseId, skillId, exerciseType]);

  const handleNextExercise = useCallback(() => {
    if (!exerciseId) return;
    const targetId = nextExerciseId ?? exerciseId;
    navigation.replace('Exercise', {
      exerciseId: targetId,
      ...(skillId ? { skillId } : {}),
      ...(exerciseType ? { exerciseType: exerciseType as ExerciseType } : {}),
    });
  }, [navigation, nextExerciseId, exerciseId, skillId, exerciseType]);

  const handleExit = useCallback(() => {
    ttsService.stop();
    if (navigation.canGoBack()) {
      navigation.popToTop();
    } else {
      navigation.replace('MainTabs');
    }
  }, [navigation]);

  const handleStartTest = useCallback(() => {
    if (!exerciseId) return;
    navigation.replace('Exercise', {
      exerciseId,
      testMode: true,
      ...(skillId ? { skillId } : {}),
    });
  }, [navigation, exerciseId, skillId]);

  const handleStartReplay = useCallback(() => {
    if (!exerciseId) return;
    ttsService.stop();
    navigation.replace('Exercise', {
      exerciseId,
      replayMode: true,
      ...(skillId ? { skillId } : {}),
      ...(exerciseType ? { exerciseType: exerciseType as ExerciseType } : {}),
    });
  }, [navigation, exerciseId, skillId, exerciseType]);

  const handleShare = useCallback(async () => {
    const title = exercise?.metadata?.title ?? 'an exercise';
    const starText = score && score.stars > 0 ? ` ${'⭐'.repeat(score.stars)}` : '';
    const message = `I scored ${Math.round(score?.overall ?? 0)}% on ${title}!${starText} 🎹 #PurrrfectKeys`;
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { message }
          : { message, title: 'Purrrfect Keys' },
      );
    } catch (err) {
      logger.warn('[PostExerciseScreen] Share failed or user cancelled:', err);
    }
  }, [exercise?.metadata?.title, score]);

  // Early return AFTER all hooks (Rules of Hooks compliance)
  if (!cachedData || !score || !exercise) {
    return <SafeAreaView style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: Cat + Exercise Title */}
        <Reanimated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <CatAvatar
            catId={selectedCatId}
            size="medium"
            pose={score.overall >= 95 ? 'celebrate' : score.overall >= 80 ? 'play' : 'curious'}
            evolutionStage={evolutionStage}
            skipEntryAnimation
          />
          <Text style={styles.exerciseTitle}>{exercise.metadata.title}</Text>
          <Text style={styles.exerciseSubtitle}>Exercise Complete</Text>
          {challengeSentTo && (
            <View style={styles.challengeBanner}>
              <MaterialCommunityIcons name="sword-cross" size={16} color={COLORS.warning} />
              <Text style={styles.challengeBannerText}>
                Challenge sent to {challengeSentTo}!
              </Text>
            </View>
          )}
        </Reanimated.View>

        {/* Score Section: Ring + Stars */}
        <Reanimated.View entering={FadeIn.delay(100).duration(400)} style={styles.scoreSection}>
          <ScoreRing score={score.overall} size={140} strokeWidth={8} animated />

          <View style={styles.starsRow}>
            {Array.from({ length: 3 }).map((_, i) => (
              <MaterialCommunityIcons
                key={i}
                name={i < score.stars ? 'star' : 'star-outline'}
                size={36}
                color={i < score.stars ? COLORS.starGold : COLORS.starEmpty}
              />
            ))}
          </View>

          {score.isNewHighScore && (
            <View style={styles.newRecordBadge}>
              <MaterialCommunityIcons name="trophy" size={16} color={COLORS.starGold} />
              <Text style={styles.newRecordText}>NEW RECORD</Text>
            </View>
          )}
        </Reanimated.View>

        {/* Score Breakdown */}
        <Reanimated.View entering={FadeInUp.delay(200).duration(400)} style={styles.card}>
          <Text style={styles.cardTitle}>Score Breakdown</Text>
          <BreakdownBar label="Accuracy" value={score.breakdown.accuracy} color={COLORS.success} />
          <BreakdownBar label="Timing" value={score.breakdown.timing} color={COLORS.info} />
          <BreakdownBar label="Completeness" value={score.breakdown.completeness} color={COLORS.warning} />
          <BreakdownBar label="Duration" value={score.breakdown.duration} color={COLORS.primary} />
          <BreakdownBar label="Extra Notes" value={score.breakdown.extraNotes} color={COLORS.textMuted} />
        </Reanimated.View>

        {/* Stats Row */}
        <Reanimated.View entering={FadeInUp.delay(300).duration(400)} style={styles.statsRow}>
          <View style={styles.statBadge}>
            <MaterialCommunityIcons name="lightning-bolt" size={18} color={COLORS.starGold} />
            <Text style={styles.statValue}>+{score.xpEarned}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          {gemsEarned > 0 && (
            <View style={styles.statBadge}>
              <MaterialCommunityIcons name="diamond-stone" size={18} color={COLORS.gemGold} />
              <Text style={styles.statValue}>+{gemsEarned}</Text>
              <Text style={styles.statLabel}>Gems</Text>
            </View>
          )}
          {chestType && chestType !== 'none' && (
            <View style={[styles.statBadge, { borderColor: RARITY[chestType].borderColor }]}>
              <MaterialCommunityIcons name="treasure-chest" size={18} color={RARITY[chestType].borderColor} />
              <Text style={[styles.statValue, { color: RARITY[chestType].borderColor }]}>
                {RARITY[chestType].label}
              </Text>
              <Text style={styles.statLabel}>Chest</Text>
            </View>
          )}
          {tempoChange !== 0 && (
            <View style={styles.statBadge}>
              <MaterialCommunityIcons
                name={tempoChange > 0 ? 'chevron-double-up' : 'chevron-double-down'}
                size={18}
                color={tempoChange > 0 ? COLORS.success : COLORS.warning}
              />
              <Text style={[styles.statValue, { color: tempoChange > 0 ? COLORS.success : COLORS.warning }]}>
                {tempoChange > 0 ? '+' : ''}{tempoChange}
              </Text>
              <Text style={styles.statLabel}>BPM</Text>
            </View>
          )}
        </Reanimated.View>

        {/* Cat Dialogue */}
        <Reanimated.View entering={FadeInUp.delay(400).duration(400)} style={styles.card}>
          <MascotBubble
            mood={mascotMood}
            message={catDialogue}
            size="small"
            catId={selectedCatId}
            speakMessage={false}
          />
        </Reanimated.View>

        {/* AI Coach Feedback */}
        <Reanimated.View entering={FadeInUp.delay(500).duration(400)} style={styles.card}>
          <View style={styles.coachHeader}>
            <SalsaCoach size="tiny" mood="teaching" />
            <Text style={styles.coachTitle}>Salsa Says</Text>
            {coachFeedback && !coachLoading && (
              <PressableScale
                style={styles.speakerBtn}
                onPress={() => ttsService.speak(coachFeedback, { catId: 'salsa' })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="volume-high" size={18} color={COLORS.primary} />
              </PressableScale>
            )}
          </View>
          {coachLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 12 }} />
          ) : (
            <Text style={styles.coachText}>{coachFeedback}</Text>
          )}
        </Reanimated.View>

        {/* Fun Fact */}
        {completionFunFact && (
          <Reanimated.View entering={FadeInUp.delay(600).duration(400)}>
            <FunFactCard
              fact={completionFunFact}
              animationDelay={0}
              compact
              testID="post-exercise-fun-fact"
            />
          </Reanimated.View>
        )}

        {/* Practice Strategy (for failing scores) */}
        {!score.isPassed && failCount >= 2 && (
          <Reanimated.View entering={FadeInUp.delay(700).duration(400)}>
            <PracticeStrategyCard score={score} exercise={exercise} />
          </Reanimated.View>
        )}

        {/* Action Buttons */}
        <Reanimated.View entering={FadeInUp.delay(700).duration(400)} style={styles.actions}>
          {/* Primary action */}
          {hasMasteryTest && score.isPassed && (
            <Button
              title="Take Mastery Test"
              onPress={handleStartTest}
              variant="primary"
              size="large"
              icon={<MaterialCommunityIcons name="trophy-outline" size={20} color={COLORS.textPrimary} />}
              testID="post-exercise-start-test"
            />
          )}
          {hasNextExercise && score.isPassed && !hasMasteryTest && (
            <Button
              title="Next Exercise"
              onPress={handleNextExercise}
              variant="primary"
              size="large"
              icon={<MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.textPrimary} />}
              testID="post-exercise-next"
            />
          )}
          {hasNextAIExercise && score.isPassed && !hasNextExercise && !hasMasteryTest && (
            <Button
              title="Next Exercise"
              onPress={handleNextExercise}
              variant="primary"
              size="large"
              icon={<MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.textPrimary} />}
              testID="post-exercise-next-ai"
            />
          )}
          {!score.isPassed && (
            <Button
              title="Try Again"
              onPress={handleRetry}
              variant="primary"
              size="large"
              icon={<MaterialCommunityIcons name="refresh" size={20} color={COLORS.textPrimary} />}
              testID="post-exercise-retry"
            />
          )}

          {/* Secondary actions */}
          {score.isPassed && (
            <Button
              title="Retry for Better Score"
              onPress={handleRetry}
              variant="secondary"
              size="large"
              icon={<MaterialCommunityIcons name="refresh" size={20} color={COLORS.textSecondary} />}
              testID="post-exercise-retry-improve"
            />
          )}
          {hasReplay && (
            <Button
              title="Review with Salsa"
              onPress={handleStartReplay}
              variant="secondary"
              size="large"
              icon={<MaterialCommunityIcons name="cat" size={20} color={COLORS.textSecondary} />}
              testID="post-exercise-replay"
            />
          )}
          {acceptedFriends.length > 0 && score.isPassed && (
            <Button
              title="Challenge a Friend"
              onPress={() => setShowChallengeSheet(true)}
              variant="secondary"
              size="large"
              icon={<MaterialCommunityIcons name="sword-cross" size={20} color={COLORS.textSecondary} />}
              testID="post-exercise-challenge"
            />
          )}
          <Button
            title="Share"
            onPress={handleShare}
            variant="outline"
            size="large"
            icon={<MaterialCommunityIcons name="share-variant" size={20} color={COLORS.textSecondary} />}
            testID="post-exercise-share"
          />
          <Button
            title="Back to Lessons"
            onPress={handleExit}
            variant="secondary"
            size="large"
            icon={<MaterialCommunityIcons name="arrow-left" size={20} color={COLORS.textMuted} />}
            testID="post-exercise-exit"
          />
        </Reanimated.View>
      </ScrollView>

      <ChallengeFriendSheet
        visible={showChallengeSheet}
        onClose={() => setShowChallengeSheet(false)}
        exerciseId={exercise.id}
        exerciseTitle={exercise.metadata?.title ?? exercise.id}
        score={Math.round(score.overall)}
      />
    </SafeAreaView>
  );
}

/** Animated breakdown bar */
function BreakdownBar({ label, value, color }: { label: string; value: number; color: string }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.round(value),
      duration: 800,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, widthAnim]);

  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <View style={styles.breakdownBar}>
        <Animated.View
          style={[
            styles.breakdownFill,
            {
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={styles.breakdownValue}>{Math.round(value)}%</Text>
    </View>
  );
}

/** Practice strategy card */
function PracticeStrategyCard({ score, exercise }: { score: ExerciseScore; exercise: Exercise }) {
  const strategy = useMemo(() => {
    const { breakdown } = score;
    const weakest = Object.entries(breakdown)
      .filter(([key]) => key !== 'extraNotes')
      .sort(([, a], [, b]) => a - b)[0];

    const matchingMistake = exercise.hints?.commonMistakes?.find((m) => {
      if (m.triggerCondition?.type === 'timing' && breakdown.timing < 60) return true;
      if (m.triggerCondition?.type === 'pitch' && breakdown.accuracy < 60) return true;
      return false;
    });

    if (matchingMistake) {
      return { title: 'Practice Tip', advice: matchingMistake.advice, icon: 'lightbulb-on' as const };
    }

    switch (weakest?.[0]) {
      case 'timing':
        return { title: 'Timing Strategy', advice: 'Try playing at a slower tempo first. Count "1-2-3-4" out loud with the metronome.', icon: 'metronome' as const };
      case 'accuracy':
        return { title: 'Note Accuracy', advice: 'Watch the demo first, then focus on the first few notes until they feel natural.', icon: 'bullseye-arrow' as const };
      case 'completeness':
        return { title: 'Completeness', advice: 'Follow the falling notes — play each note as it crosses the line.', icon: 'checkbox-marked-circle-outline' as const };
      case 'duration':
        return { title: 'Note Length', advice: 'Hold each key for the full length shown. Short taps give fewer points.', icon: 'arrow-expand-horizontal' as const };
      default:
        return { title: 'Practice Strategy', advice: 'Break it into smaller sections. Master the first few notes before trying the whole thing.', icon: 'puzzle' as const };
    }
  }, [score, exercise]);

  return (
    <View style={styles.practiceCard}>
      <View style={styles.practiceCardHeader}>
        <MaterialCommunityIcons name={strategy.icon} size={18} color={COLORS.warning} />
        <Text style={styles.practiceCardTitle}>{strategy.title}</Text>
      </View>
      <Text style={styles.practiceCardText}>{strategy.advice}</Text>
    </View>
  );
}

PostExerciseScreen.displayName = 'PostExerciseScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    paddingTop: SPACING.sm,
  },
  exerciseTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  exerciseSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  challengeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: glowColor(COLORS.warning, 0.15),
    borderRadius: 12,
  },
  challengeBannerText: {
    color: COLORS.warning,
    fontSize: 14,
    fontWeight: '600',
  },
  scoreSection: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  newRecordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: glowColor(COLORS.starGold, 0.15),
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
  },
  newRecordText: {
    color: COLORS.starGold,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    width: 100,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownValue: {
    width: 40,
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '700',
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  statBadge: {
    alignItems: 'center',
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 70,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  coachTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  coachText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  speakerBtn: {
    padding: 4,
  },
  practiceCard: {
    backgroundColor: glowColor(COLORS.warning, 0.08),
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: glowColor(COLORS.warning, 0.2),
    padding: SPACING.md,
  },
  practiceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  practiceCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.warning,
  },
  practiceCardText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  actions: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
});

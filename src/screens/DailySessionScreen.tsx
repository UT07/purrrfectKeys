/**
 * DailySessionScreen — "Today's Practice"
 *
 * AI-picked session: warm-up -> lesson -> challenge, with explanations
 * of WHY each exercise was chosen. Primary learning entry point (Learn tab).
 * Recomputes the session plan when returning from exercises via useFocusEffect.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { PressableScale } from '../components/common/PressableScale';
import { getTodayDateString } from '../utils/time';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { GameCard } from '../components/common/GameCard';
import { AnimatedProgressBar } from '../components/common/AnimatedProgressBar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { generateSessionPlan, getNextSkillToLearn, type SessionPlan, type SessionType, type ExerciseRef } from '../core/curriculum/CurriculumEngine';
import { getSkillsNeedingReview, getSkillById } from '../core/curriculum/SkillTree';
import { SKILL_TREE } from '../core/curriculum/SkillTree';
import { getExercise } from '../content/ContentLoader';
import { midiToNoteName } from '../core/music/MusicTheory';
import { useLearnerProfileStore } from '../stores/learnerProfileStore';
import { useGemStore } from '../stores/gemStore';
import { SalsaCoach } from '../components/Mascot/SalsaCoach';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS, glowColor, type RarityLevel } from '../theme/tokens';
import { GradientMeshBackground } from '../components/effects';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { exerciseTypeForCategory } from '../core/exercises/types';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// Section colors
type SectionKey = 'warmUp' | 'lesson' | 'challenge' | 'songs';

const SECTION_COLORS: Record<SectionKey, { accent: string; bg: string; border: string }> = {
  warmUp: { accent: COLORS.starGold, bg: glowColor(COLORS.starGold, 0.08), border: glowColor(COLORS.starGold, 0.2) },
  lesson: { accent: COLORS.info, bg: glowColor(COLORS.info, 0.08), border: glowColor(COLORS.info, 0.2) },
  challenge: { accent: COLORS.primaryLight, bg: glowColor(COLORS.primaryLight, 0.08), border: glowColor(COLORS.primaryLight, 0.2) },
  songs: { accent: COLORS.success, bg: glowColor(COLORS.success, 0.08), border: glowColor(COLORS.success, 0.2) },
};

const SECTION_ICONS: Record<SectionKey, string> = {
  warmUp: 'fire',
  lesson: 'book-open-variant',
  challenge: 'lightning-bolt',
  songs: 'music-note',
};

const SECTION_LABELS: Record<SectionKey, string> = {
  warmUp: 'Warm Up',
  lesson: "Today's Lesson",
  challenge: 'Challenge',
  songs: 'Song Time',
};

const SECTION_RARITY: Record<SectionKey, RarityLevel> = {
  warmUp: 'common',
  lesson: 'rare',
  challenge: 'epic',
  songs: 'legendary',
};

/** Replace MIDI numbers in reasoning strings with note names */
function humanizeReasoning(text: string): string {
  return text.replace(/MIDI (\d+)/g, (_match, num) => {
    const midi = parseInt(num, 10);
    if (isNaN(midi) || midi < 21 || midi > 108) return _match;
    return midiToNoteName(midi);
  });
}

export function DailySessionScreen() {
  const navigation = useNavigation<NavProp>();
  const { useRoute } = require('@react-navigation/native') as { useRoute: () => { params?: { sharedPlan?: string } } };
  const route = useRoute();
  const sharedPlanJson = route.params?.sharedPlan;

  // Subscribe only to fields needed for rendering (avoids re-renders on every note accuracy update)
  const masteredSkills = useLearnerProfileStore((s) => s.masteredSkills);
  const totalExercisesCompleted = useLearnerProfileStore((s) => s.totalExercisesCompleted);

  // Gem balance
  const gems = useGemStore((s) => s.gems);

  // Read lesson progress for checking exercise completion from other screens (HomeScreen)
  const lessonProgress = require('../stores/progressStore').useProgressStore((s: any) => s.lessonProgress) as Record<string, { exerciseScores: Record<string, { completedAt?: number }> }>;

  // Track which exercises the user completed this session (by key: skillNodeId or exerciseId)
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const lastNavigatedKeyRef = React.useRef<string | null>(null);
  const prevCompletedCountRef = React.useRef(totalExercisesCompleted);

  // Recompute session plan on focus (picks up newly mastered skills after exercises)
  const [focusCounter, setFocusCounter] = useState(0);
  useFocusEffect(
    useCallback(() => {
      // If totalExercisesCompleted increased since we left, mark the last navigated exercise as done
      const currentCount = useLearnerProfileStore.getState().totalExercisesCompleted;
      if (lastNavigatedKeyRef.current && currentCount > prevCompletedCountRef.current) {
        setCompletedKeys((prev) => new Set([...prev, lastNavigatedKeyRef.current!]));
        lastNavigatedKeyRef.current = null;
      }
      prevCompletedCountRef.current = currentCount;
      setFocusCounter((c) => c + 1);
    }, [])
  );

  // Cache the plan for the day — prevent regeneration on every focus event
  const dailyPlanRef = React.useRef<{ date: string; plan: SessionPlan } | null>(null);
  const plan: SessionPlan = useMemo(() => {
    const todayKey = getTodayDateString();

    // Reuse cached plan if same day
    if (dailyPlanRef.current?.date === todayKey) {
      return dailyPlanRef.current.plan;
    }

    // Use shared plan from HomeScreen if available (ensures consistency)
    if (sharedPlanJson) {
      try {
        const parsed = JSON.parse(sharedPlanJson) as SessionPlan;
        dailyPlanRef.current = { date: todayKey, plan: parsed };
        return parsed;
      } catch { /* fall through to generate */ }
    }
    // Fallback: generate fresh plan (direct navigation without HomeScreen)
    const profile = useLearnerProfileStore.getState();
    const generated = generateSessionPlan(
      {
        noteAccuracy: profile.noteAccuracy,
        noteAttempts: profile.noteAttempts,
        skills: profile.skills,
        tempoRange: profile.tempoRange,
        weakNotes: profile.weakNotes,
        weakSkills: profile.weakSkills,
        totalExercisesCompleted: profile.totalExercisesCompleted,
        lastAssessmentDate: profile.lastAssessmentDate,
        assessmentScore: profile.assessmentScore,
        masteredSkills: profile.masteredSkills,
        skillMasteryData: profile.skillMasteryData,
        recentExerciseIds: profile.recentExerciseIds,
      },
      profile.masteredSkills
    );
    dailyPlanRef.current = { date: todayKey, plan: generated };
    return generated;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedPlanJson, focusCounter]);

  // Merge completion keys: local session tracking + completions from lessonProgress (cross-screen)
  const mergedCompletedKeys = useMemo(() => {
    const merged = new Set(completedKeys);
    const allExercises = [...plan.warmUp, ...plan.lesson, ...plan.challenge, ...(plan.songs ?? [])];
    for (const ref of allExercises) {
      const key = ref.skillNodeId || ref.exerciseId;
      if (merged.has(key)) continue;
      const isAI = ref.source === 'ai' || ref.source === 'ai-with-fallback';
      if (isAI && ref.skillNodeId) {
        const aiCompleted = lessonProgress['__ai__']?.exerciseScores[`ai-skill-${ref.skillNodeId}`]?.completedAt != null;
        if (aiCompleted) merged.add(key);
      } else if (ref.source === 'static') {
        const staticCompleted = Object.values(lessonProgress).some(
          (lp) => lp.exerciseScores[ref.exerciseId]?.completedAt != null
        );
        if (staticCompleted) merged.add(key);
      }
    }
    return merged;
  }, [completedKeys, plan, lessonProgress]);

  const totalExercises = plan.warmUp.length + plan.lesson.length + plan.challenge.length + (plan.songs?.length ?? 0);
  const masteredCount = masteredSkills.length;
  const totalSkills = SKILL_TREE.length;
  const isNewUser = masteredCount === 0 && totalExercisesCompleted === 0;

  const nextSkill = useMemo(
    () => getNextSkillToLearn(masteredSkills),
    [masteredSkills]
  );

  const skillMasteryData = useLearnerProfileStore((s) => s.skillMasteryData);
  const decayedSkillCount = useMemo(
    () => getSkillsNeedingReview(masteredSkills, skillMasteryData ?? {}).length,
    [masteredSkills, skillMasteryData]
  );

  const handleExercisePress = useCallback(
    (ref: ExerciseRef) => {
      // Track which exercise we're navigating to, so we can mark it done on return
      lastNavigatedKeyRef.current = ref.skillNodeId || ref.exerciseId;
      if (ref.source === 'song') {
        // Navigate to song player for song exercises
        if (ref.songId) {
          navigation.navigate('SongPlayer', { songId: ref.songId });
        } else {
          // Song ID not resolved yet — go to Songs tab to pick one
          navigation.navigate('MainTabs', { screen: 'Songs' } as never);
        }
      } else if (ref.source === 'ai' || ref.source === 'ai-with-fallback') {
        const skill = ref.skillNodeId ? getSkillById(ref.skillNodeId) : null;
        const exerciseType = exerciseTypeForCategory(skill?.category);
        navigation.navigate('Exercise', {
          exerciseId: ref.fallbackExerciseId ?? 'ai-mode',
          aiMode: true,
          skillId: ref.skillNodeId,
          ...(exerciseType ? { exerciseType } : {}),
        });
      } else {
        navigation.navigate('Exercise', {
          exerciseId: ref.exerciseId,
          ...(ref.skillNodeId ? { skillId: ref.skillNodeId } : {}),
        });
      }
    },
    [navigation]
  );

  const handleBrowseLessons = useCallback(() => {
    navigation.navigate('LevelMap');
  }, [navigation]);

  const handleAssessment = useCallback(() => {
    navigation.navigate('SkillAssessment');
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} testID="daily-session-screen">
      <GradientMeshBackground accent="exercise" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        testID="daily-session-scroll"
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="daily-session-back"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
          </PressableScale>
          <View style={styles.headerTextContainer}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Today's Practice</Text>
              <SessionTypeBadge type={plan.sessionType} />
              <View style={{ flex: 1 }} />
              <View style={styles.gemCounter}>
                <MaterialCommunityIcons name="diamond-stone" size={16} color={COLORS.gemGold} />
                <Text style={styles.gemCounterText}>{gems}</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              {totalExercises} exercise{totalExercises !== 1 ? 's' : ''} picked for you
              {decayedSkillCount > 0 ? ` \u2022 ${decayedSkillCount} skill${decayedSkillCount > 1 ? 's' : ''} need review` : ''}
            </Text>
          </View>
        </View>

        {/* Salsa coach motivation */}
        <View style={styles.salsaRow}>
          <SalsaCoach mood="teaching" size="small" showCatchphrase />
        </View>

        {/* Skill Progress Card */}
        <View style={styles.skillProgressCard}>
          <View style={styles.skillProgressRow}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={18} color={COLORS.primary} />
            <Text style={styles.skillProgressText}>
              {masteredCount}/{totalSkills} skills
              {nextSkill ? ` \u2022 Next: ${nextSkill.name}` : ' \u2022 All mastered!'}
            </Text>
          </View>
          <AnimatedProgressBar
            progress={masteredCount / totalSkills}
            color={COLORS.primary}
            height={6}
          />
        </View>

        {/* New User Welcome Card */}
        {isNewUser && (
          <View style={styles.welcomeCard}>
            <MaterialCommunityIcons name="hand-wave" size={28} color={COLORS.starGold} />
            <Text style={styles.welcomeTitle}>Welcome to Purrrfect Keys!</Text>
            <Text style={styles.welcomeBody}>
              Your practice is personalized based on your skills and performance.
              Take a quick assessment so we can find the right starting point.
            </Text>
            <PressableScale
              style={styles.assessmentBtn}
              onPress={handleAssessment}
              testID="daily-session-assessment-cta"
            >
              <MaterialCommunityIcons name="clipboard-check-outline" size={18} color={COLORS.textPrimary} />
              <Text style={styles.assessmentBtnText}>Quick Assessment</Text>
            </PressableScale>
          </View>
        )}

        {/* Warm Up Section */}
        <SessionSection
          sectionKey="warmUp"
          exercises={plan.warmUp}
          completedKeys={mergedCompletedKeys}
          onExercisePress={handleExercisePress}
          lessonProgress={lessonProgress}
        />

        {/* Lesson Section */}
        <SessionSection
          sectionKey="lesson"
          exercises={plan.lesson}
          completedKeys={mergedCompletedKeys}
          onExercisePress={handleExercisePress}
          lessonProgress={lessonProgress}
        />

        {/* Challenge Section */}
        <SessionSection
          sectionKey="challenge"
          exercises={plan.challenge}
          completedKeys={mergedCompletedKeys}
          onExercisePress={handleExercisePress}
          lessonProgress={lessonProgress}
        />

        {/* Songs Section */}
        {plan.songs && plan.songs.length > 0 && (
          <SessionSection
            sectionKey="songs"
            exercises={plan.songs}
            completedKeys={mergedCompletedKeys}
            onExercisePress={handleExercisePress}
            lessonProgress={lessonProgress}
          />
        )}

        {/* AI Reasoning */}
        {plan.reasoning.length > 0 && (
          <View style={styles.reasoningCard}>
            <View style={styles.reasoningHeader}>
              <MaterialCommunityIcons name="robot-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.reasoningTitle}>Why these exercises?</Text>
            </View>
            {plan.reasoning.map((reason, i) => (
              <Text key={i} style={styles.reasoningText}>
                {humanizeReasoning(reason)}
              </Text>
            ))}
          </View>
        )}

        {/* Browse All Lessons Link */}
        <PressableScale
          style={styles.browseLessonsBtn}
          onPress={handleBrowseLessons}
          testID="daily-session-browse-lessons"
        >
          <MaterialCommunityIcons name="view-grid-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.browseLessonsText}>Browse All Lessons</Text>
        </PressableScale>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// Session Type Badge
// ============================================================================

const SESSION_TYPE_CONFIG: Record<SessionType, { label: string; color: string; icon: 'school' | 'refresh' | 'lightning-bolt' | 'shuffle-variant' | 'star-circle' }> = {
  'new-material': { label: 'New Material', color: COLORS.success, icon: 'school' },
  review: { label: 'Review Day', color: COLORS.warning, icon: 'refresh' },
  challenge: { label: 'Challenge Day', color: COLORS.primaryLight, icon: 'lightning-bolt' },
  mixed: { label: 'Mixed', color: COLORS.info, icon: 'shuffle-variant' },
  endgame: { label: 'Endgame', color: '#FFD700', icon: 'star-circle' },
};

function SessionTypeBadge({ type }: { type: SessionType }) {
  const config = SESSION_TYPE_CONFIG[type];
  return (
    <View style={[styles.sessionTypeBadge, { backgroundColor: glowColor(config.color, 0.1) }]}>
      <MaterialCommunityIcons name={config.icon} size={14} color={config.color} />
      <Text style={[styles.sessionTypeBadgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// ============================================================================
// Session Section Component
// ============================================================================

function SessionSection({
  sectionKey,
  exercises,
  completedKeys,
  onExercisePress,
  lessonProgress,
}: {
  sectionKey: SectionKey;
  exercises: ExerciseRef[];
  completedKeys: Set<string>;
  onExercisePress: (ref: ExerciseRef) => void;
  lessonProgress: Record<string, { exerciseScores: Record<string, { completedAt?: number; highScore?: number }> }>;
}) {
  const colors = SECTION_COLORS[sectionKey];
  const icon = SECTION_ICONS[sectionKey];
  const label = SECTION_LABELS[sectionKey];
  const rarity = SECTION_RARITY[sectionKey];

  if (exercises.length === 0) return null;

  const allDone = exercises.every((ref) => completedKeys.has(ref.skillNodeId || ref.exerciseId));

  return (
    <View style={styles.section}>
      <Animated.View
        entering={FadeInUp.delay(0).duration(400)}
        style={styles.sectionHeader}
      >
        <View style={[styles.sectionIconBg, { backgroundColor: colors.bg }]}>
          <MaterialCommunityIcons
            name={(allDone ? 'check-circle' : icon) as 'check-circle'}
            size={20}
            color={allDone ? COLORS.success : colors.accent}
          />
        </View>
        <Text style={[styles.sectionLabel, { color: allDone ? COLORS.success : colors.accent }]}>{label}</Text>
      </Animated.View>

      {exercises.map((ref, i) => {
        const isAI = ref.source === 'ai' || ref.source === 'ai-with-fallback';
        const highScore = isAI
          ? lessonProgress['__ai__']?.exerciseScores[`ai-skill-${ref.skillNodeId}`]?.highScore ?? null
          : Object.values(lessonProgress).find((lp) => lp.exerciseScores[ref.exerciseId])?.exerciseScores[ref.exerciseId]?.highScore ?? null;
        const isAttempted = completedKeys.has(ref.skillNodeId || ref.exerciseId);
        const exercise = ref.source === 'static' ? getExercise(ref.exerciseId) : null;
        const passingScore = exercise?.scoring?.passingScore ?? 70;
        const isPassed = isAttempted && (highScore ?? 0) >= passingScore;
        const isBelowThreshold = isAttempted && !isPassed;

        return (
          <Animated.View
            key={`${ref.exerciseId}-${i}`}
            entering={FadeInUp.delay((i + 1) * 100).duration(400)}
          >
            <SessionExerciseCard
              exerciseRef={ref}
              rarity={rarity}
              colors={colors}
              isPassed={isPassed}
              isBelowThreshold={isBelowThreshold}
              highScore={highScore}
              onPress={() => onExercisePress(ref)}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

// ============================================================================
// Exercise Card Component (renamed to avoid conflict with transitions/ExerciseCard)
// ============================================================================

const EXERCISE_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  play:         { label: 'Play Along',      icon: 'piano',           color: '#64B5F6' },
  rhythm:       { label: 'Rhythm',          icon: 'metronome',       color: '#FF8A65' },
  earTraining:  { label: 'Ear Training',    icon: 'ear-hearing',     color: '#CE93D8' },
  chordId:      { label: 'Chord ID',        icon: 'cards',           color: '#81C784' },
  sightReading: { label: 'Sight Read',      icon: 'eye',             color: '#FFD54F' },
  callResponse: { label: 'Call & Response', icon: 'swap-horizontal', color: '#4FC3F7' },
  test:         { label: 'Mastery Test',    icon: 'trophy',          color: '#FF5252' },
};

function SessionExerciseCard({
  exerciseRef,
  rarity,
  colors,
  isPassed,
  isBelowThreshold,
  highScore,
  onPress,
}: {
  exerciseRef: ExerciseRef;
  rarity: RarityLevel;
  colors: { accent: string; bg: string; border: string };
  isPassed: boolean;
  isBelowThreshold: boolean;
  highScore: number | null;
  onPress: () => void;
}) {
  const exercise = exerciseRef.source === 'static' ? getExercise(exerciseRef.exerciseId) : null;
  const isAI = exerciseRef.source === 'ai' || exerciseRef.source === 'ai-with-fallback';
  const skillNode = isAI ? getSkillById(exerciseRef.skillNodeId) : null;
  const isSong = exerciseRef.source === 'song';
  const title = exercise?.metadata.title ?? skillNode?.name ?? (isSong ? exerciseRef.reason : (isAI ? 'AI-Generated Exercise' : exerciseRef.exerciseId));
  const difficulty = exercise?.metadata.difficulty ?? 1;

  // Determine exercise type for the label
  const exerciseType = exercise?.metadata?.skills?.includes('rhythm') ? 'rhythm'
    : exercise?.metadata?.skills?.includes('ear-training') ? 'earTraining'
    : isSong ? 'play' : 'play';
  // Use exercise-index type if available via skill node category mapping
  const typeFromIndex = (() => {
    if (exerciseRef.skillNodeId) {
      const skill = getSkillById(exerciseRef.skillNodeId);
      if (skill?.category === 'rhythm') return 'rhythm';
      if (skill?.category === 'chords') return 'chordId';
      if (skill?.category === 'sight-reading') return 'sightReading';
      if (skill?.category === 'expression') return 'earTraining';
    }
    return exerciseType;
  })();
  const typeInfo = EXERCISE_TYPE_LABELS[typeFromIndex] ?? EXERCISE_TYPE_LABELS.play;

  const isAttempted = isPassed || isBelowThreshold;
  const statusColor = isPassed ? COLORS.success : isBelowThreshold ? COLORS.warning : null;

  return (
    <GameCard
      rarity={rarity}
      onPress={onPress}
      style={[styles.exerciseGameCard, isPassed && styles.exerciseGameCardDone]}
    >
      <View style={styles.exerciseCardContent}>
        <View style={styles.exerciseInfo}>
          <Text style={[styles.exerciseTitle, statusColor && { color: statusColor }]}>{title}</Text>
          <Text style={styles.exerciseReason}>
            {isAttempted && highScore != null ? `Score: ${highScore}%` : humanizeReasoning(exerciseRef.reason)}
          </Text>
          <View style={styles.exerciseMeta}>
            {isPassed && (
              <View style={styles.doneTag}>
                <MaterialCommunityIcons name="check-circle" size={12} color={COLORS.success} />
                <Text style={styles.doneTagText}>Done</Text>
              </View>
            )}
            {isBelowThreshold && (
              <View style={[styles.doneTag, { backgroundColor: COLORS.warning + '20' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={12} color={COLORS.warning} />
                <Text style={[styles.doneTagText, { color: COLORS.warning }]}>Retry</Text>
              </View>
            )}
            <View style={[styles.aiTag, { backgroundColor: typeInfo.color + '20' }]}>
              <MaterialCommunityIcons name={typeInfo.icon as any} size={12} color={typeInfo.color} />
              <Text style={[styles.aiTagText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
            </View>
            <View style={styles.difficultyDots}>
              {Array.from({ length: 5 }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.difficultyDot,
                    i < difficulty && { backgroundColor: colors.accent },
                  ]}
                />
              ))}
            </View>
            {!isAttempted && (
              <View style={styles.gemRewardHint}>
                <MaterialCommunityIcons name="diamond-stone" size={10} color={COLORS.gemGold} />
                <Text style={styles.gemRewardHintText}>5 for 90%+, 15 for perfect</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.playIconBg, { backgroundColor: statusColor ?? colors.accent }]}>
          <MaterialCommunityIcons
            name={isPassed ? 'check' : isBelowThreshold ? 'refresh' : 'play'}
            size={20}
            color={COLORS.textPrimary}
          />
        </View>
      </View>
    </GameCard>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.lg,
  },
  salsaRow: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sessionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sessionTypeBadgeText: {
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '600' as const,
  },
  headerTitle: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Skill Progress
  skillProgressCard: {
    ...SHADOWS.sm,
    marginHorizontal: SPACING.md,
    padding: SPACING.md,
    backgroundColor: glowColor(COLORS.textPrimary, 0.06),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: glowColor(COLORS.textPrimary, 0.10),
    marginBottom: SPACING.lg,
  },
  skillProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  skillProgressText: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '600' as const,
    color: COLORS.textPrimary,
  },
  // skillProgressBar uses AnimatedProgressBar component
  // Welcome card
  welcomeCard: {
    marginHorizontal: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: glowColor(COLORS.starGold, 0.06),
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: glowColor(COLORS.starGold, 0.15),
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  welcomeTitle: {
    ...TYPOGRAPHY.heading.md,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  welcomeBody: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  assessmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  assessmentBtnText: {
    ...TYPOGRAPHY.button.lg,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
  },
  // Sections
  section: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    ...TYPOGRAPHY.heading.sm,
    fontWeight: '700' as const,
  },
  // Exercise Cards (GameCard wrapper)
  exerciseGameCard: {
    marginBottom: SPACING.sm,
  },
  exerciseGameCardDone: {
    opacity: 0.7,
  },
  exerciseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseTitle: {
    ...TYPOGRAPHY.heading.sm,
    color: COLORS.textPrimary,
  },
  exerciseTitleDone: {
    color: COLORS.textSecondary,
  },
  doneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: glowColor(COLORS.success, 0.15),
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  doneTagText: {
    ...TYPOGRAPHY.caption.md,
    fontWeight: '600' as const,
    color: COLORS.success,
  },
  exerciseReason: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: glowColor(COLORS.info, 0.15),
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiTagText: {
    ...TYPOGRAPHY.caption.md,
    fontWeight: '600' as const,
    color: COLORS.info,
  },
  difficultyDots: {
    flexDirection: 'row',
    gap: 3,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.cardBorder,
  },
  playIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  // Reasoning
  reasoningCard: {
    marginHorizontal: SPACING.md,
    padding: SPACING.md,
    backgroundColor: glowColor(COLORS.textPrimary, 0.06),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: glowColor(COLORS.textPrimary, 0.10),
    marginBottom: SPACING.md,
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  reasoningTitle: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  reasoningText: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textMuted,
    marginBottom: 4,
    paddingLeft: SPACING.lg + SPACING.sm,
  },
  // Browse lessons
  browseLessonsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderStyle: 'dashed',
  },
  browseLessonsText: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  // Gem counter
  gemCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: glowColor(COLORS.starGold, 0.1),
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  gemCounterText: {
    ...TYPOGRAPHY.body.sm,
    fontWeight: '700' as const,
    color: COLORS.gemGold,
  },
  // Gem reward hint on exercise cards
  gemRewardHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gemRewardHintText: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
  },
});

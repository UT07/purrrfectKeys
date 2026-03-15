/**
 * LessonIntroScreen — Shows lesson details, exercise list, and START button.
 *
 * Navigated to when tapping a lesson node on the LevelMap.
 * Shows: title, description, exercise list with types + progress, START button.
 */

import { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { PressableScale } from '../components/common/PressableScale';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { MascotBubble } from '../components/Mascot/MascotBubble';
import { GradientMeshBackground } from '../components/effects';
import {
  getLesson,
  getExercisesForLesson,
} from '../content/ContentLoader';
import type { ExerciseIndexEntry } from '../content/ContentLoader';
import { useProgressStore } from '../stores/progressStore';
import { useSettingsStore } from '../stores/settingsStore';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, GRADIENTS, glowColor } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type LessonIntroRouteProp = RouteProp<RootStackParamList, 'LessonIntro'>;

// ---------------------------------------------------------------------------
// Exercise type labels (shared with TierIntroScreen)
// ---------------------------------------------------------------------------

const EXERCISE_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  play:         { label: 'Play Along',      icon: 'piano',           color: '#64B5F6' },
  rhythm:       { label: 'Rhythm',          icon: 'metronome',       color: '#FF8A65' },
  earTraining:  { label: 'Ear Training',    icon: 'ear-hearing',     color: '#CE93D8' },
  chordId:      { label: 'Chord ID',        icon: 'cards',           color: '#81C784' },
  sightReading: { label: 'Sight Read',      icon: 'eye',             color: '#FFD54F' },
  callResponse: { label: 'Call & Response', icon: 'swap-horizontal', color: '#4FC3F7' },
  test:         { label: 'Mastery Test',    icon: 'trophy',          color: '#FF5252' },
};

// ---------------------------------------------------------------------------
// Mascot messages by difficulty
// ---------------------------------------------------------------------------

const MASCOT_MESSAGES: Record<number, string[]> = {
  1: [
    "Let's start from the very beginning! I'll guide you through it.",
    "Every great pianist started right here. Ready?",
  ],
  2: [
    "You're building real skills now! This is exciting.",
    "These exercises will take your playing to the next level!",
  ],
  3: [
    "Getting into the good stuff! Your skills are really growing.",
    "This is where things get interesting — let's dive in!",
  ],
  4: [
    "Advanced territory! You should be proud of how far you've come.",
    "These are challenging exercises — but you're ready!",
  ],
  5: [
    "Mastery-level work! Only the dedicated make it here.",
    "This is the top tier — let's show what you can do!",
  ],
};

function getMascotMessage(difficulty: number): string {
  const messages = MASCOT_MESSAGES[difficulty] ?? MASCOT_MESSAGES[1];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ---------------------------------------------------------------------------
// DifficultyBars
// ---------------------------------------------------------------------------

function DifficultyBars({ difficulty }: { difficulty: number }) {
  return (
    <View style={styles.difficultyContainer}>
      <Text style={styles.difficultyLabel}>Difficulty</Text>
      <View style={styles.difficultyBars}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.difficultyBar,
              i < difficulty ? styles.difficultyBarFilled : styles.difficultyBarEmpty,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ExerciseRow
// ---------------------------------------------------------------------------

function ExerciseRow({
  entry,
  index,
  isCompleted,
  highScore,
  onPress,
}: {
  entry: ExerciseIndexEntry;
  index: number;
  isCompleted: boolean;
  highScore: number | null;
  onPress: () => void;
}) {
  const typeInfo = EXERCISE_TYPE_LABELS[entry.type] ?? EXERCISE_TYPE_LABELS.play;

  return (
    <PressableScale onPress={onPress} style={styles.exerciseRow} accessibilityRole="button" accessibilityLabel={`${entry.title}, ${typeInfo.label}${isCompleted ? `, completed, ${highScore}%` : ''}`}>
      <View style={styles.exerciseRowLeft}>
        <View style={[
          styles.exerciseIndicator,
          isCompleted ? styles.exerciseIndicatorDone : styles.exerciseIndicatorPending,
        ]}>
          {isCompleted ? (
            <MaterialCommunityIcons name="check" size={14} color={COLORS.textPrimary} />
          ) : (
            <Text style={styles.exerciseIndicatorText}>{index + 1}</Text>
          )}
        </View>
        <View style={styles.exerciseInfo}>
          <Text style={[styles.exerciseName, isCompleted && styles.exerciseNameDone]} numberOfLines={1}>
            {entry.title}
          </Text>
          <View style={styles.exerciseMetaRow}>
            <View style={[styles.exerciseTypeBadge, { backgroundColor: typeInfo.color + '20' }]}>
              <MaterialCommunityIcons name={typeInfo.icon as any} size={10} color={typeInfo.color} />
              <Text style={[styles.exerciseTypeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
            </View>
            {highScore != null && (
              <Text style={[styles.exerciseScore, isCompleted && styles.exerciseScoreGood]}>
                {highScore}%
              </Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.exerciseRowRight}>
        {isCompleted ? (
          <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
        ) : (
          <MaterialCommunityIcons name="play-circle-outline" size={20} color={COLORS.textMuted} />
        )}
      </View>
    </PressableScale>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function LessonIntroScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<LessonIntroRouteProp>();
  const lessonId = (route.params as any)?.lessonId ?? '';
  const locked = (route.params as any)?.locked ?? false;

  const lessonProgress = useProgressStore((s) => s.lessonProgress) ?? {};
  const selectedCatId = useSettingsStore((s) => s.selectedCatId) ?? 'mini-meowww';

  const lesson = useMemo(() => getLesson(lessonId), [lessonId]);
  const exercises = useMemo(() => getExercisesForLesson(lessonId), [lessonId]);

  const nonTestExercises = useMemo(
    () => exercises.filter((e) => e.type !== 'test'),
    [exercises],
  );

  const testExercise = useMemo(
    () => exercises.find((e) => e.type === 'test') ?? null,
    [exercises],
  );

  const progress = lessonProgress[lessonId];

  const { completedCount, totalCount } = useMemo(() => {
    let completed = 0;
    for (const ex of nonTestExercises) {
      const score = progress?.exerciseScores?.[ex.id];
      if (score && (score.highScore ?? 0) >= 60) completed++;
    }
    return { completedCount: completed, totalCount: nonTestExercises.length };
  }, [nonTestExercises, progress]);

  const isAllCompleted = completedCount === totalCount && totalCount > 0;
  const lessonCompleted = progress?.status === 'completed';

  // Find first incomplete exercise for START button
  const firstIncompleteId = useMemo(() => {
    const sorted = [...nonTestExercises].sort((a, b) => a.order - b.order);
    for (const ex of sorted) {
      const score = progress?.exerciseScores?.[ex.id];
      if (!score || (score.highScore ?? 0) < 60) return ex.id;
    }
    return sorted[0]?.id ?? null;
  }, [nonTestExercises, progress]);

  const difficulty = lesson?.metadata?.difficulty ?? 1;
  const estimatedMinutes = lesson?.metadata?.estimatedMinutes ?? lesson?.estimatedMinutes ?? 10;
  const mascotMessage = useMemo(() => getMascotMessage(difficulty), [difficulty]);

  const lessonNumber = useMemo(() => {
    const match = lessonId.match(/lesson-(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }, [lessonId]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleStart = useCallback(() => {
    if (locked || !firstIncompleteId) return;
    navigation.navigate('Exercise', { exerciseId: firstIncompleteId });
  }, [navigation, locked, firstIncompleteId]);

  const handleExercisePress = useCallback(
    (exerciseId: string) => {
      if (locked) return;
      navigation.navigate('Exercise', { exerciseId });
    },
    [navigation, locked],
  );

  if (!lesson) {
    return (
      <View style={styles.container}>
        <GradientMeshBackground accent="learn" />
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.textMuted }}>Lesson not found</Text>
          <PressableScale onPress={handleBack} style={{ marginTop: SPACING.md }} accessibilityRole="button" accessibilityLabel="Go back">
            <Text style={{ color: COLORS.primary }}>Go Back</Text>
          </PressableScale>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="lesson-intro-screen">
      <GradientMeshBackground accent="learn" />
      <LinearGradient colors={GRADIENTS.heroGlow} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <PressableScale
              onPress={handleBack}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              testID="lesson-intro-back"
              soundOnPress={false}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
            </PressableScale>

            <View style={styles.headerTitleArea}>
              <Text style={styles.lessonLabel}>LESSON {lessonNumber}</Text>
              <Text style={styles.lessonTitle} numberOfLines={2}>{lesson.metadata.title}</Text>
            </View>

            {lessonCompleted && (
              <View style={styles.completedBadge}>
                <MaterialCommunityIcons name="check-circle" size={28} color={COLORS.success} />
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>{lesson.metadata.description}</Text>

        {/* Info row */}
        <View style={styles.infoRow}>
          <DifficultyBars difficulty={difficulty} />
          <View style={styles.timeContainer}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.timeText}>~{estimatedMinutes} min</Text>
          </View>
          <View style={styles.progressContainer}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={16}
              color={isAllCompleted ? COLORS.success : COLORS.textSecondary}
            />
            <Text style={[styles.progressLabel, isAllCompleted && styles.progressLabelComplete]}>
              {completedCount}/{totalCount}
            </Text>
          </View>
          <View style={styles.xpContainer}>
            <MaterialCommunityIcons name="star" size={16} color={COLORS.starGold} />
            <Text style={styles.xpText}>{lesson.xpReward} XP</Text>
          </View>
        </View>

        {/* Cat mascot */}
        <View style={styles.mascotSection}>
          <MascotBubble
            mood="encouraging"
            message={mascotMessage}
            size="large"
            catId={selectedCatId}
          />
        </View>

        {/* Exercise list */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          <View style={styles.exercisesList}>
            {nonTestExercises
              .sort((a, b) => a.order - b.order)
              .map((entry, index) => {
                const score = progress?.exerciseScores?.[entry.id];
                const highScore = score?.highScore ?? null;
                const isCompleted = highScore != null && highScore >= 60;
                return (
                  <ExerciseRow
                    key={entry.id}
                    entry={entry}
                    index={index}
                    isCompleted={isCompleted}
                    highScore={highScore}
                    onPress={() => handleExercisePress(entry.id)}
                  />
                );
              })}
            {/* Mastery test row */}
            {testExercise && (
              <ExerciseRow
                entry={testExercise}
                index={nonTestExercises.length}
                isCompleted={
                  (progress?.exerciseScores?.[testExercise.id]?.highScore ?? 0) >= 60
                }
                highScore={progress?.exerciseScores?.[testExercise.id]?.highScore ?? null}
                onPress={() => handleExercisePress(testExercise.id)}
              />
            )}
          </View>
        </View>

        {/* Skills taught */}
        {lesson.metadata.skills.length > 0 && (
          <View style={styles.skillsSection}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillTags}>
              {lesson.metadata.skills.map((skill) => (
                <View key={skill} style={styles.skillTag}>
                  <Text style={styles.skillTagText}>{skill.replace(/-/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Start button */}
      <SafeAreaView style={styles.bottomBar}>
        <PressableScale
          onPress={locked ? undefined : handleStart}
          style={[styles.startButton, locked && styles.startButtonLocked]}
          testID="lesson-intro-start"
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel={locked ? 'Locked, complete previous lesson first' : lessonCompleted ? 'Practice again' : `Start lesson, ${completedCount} of ${totalCount} completed`}
        >
          <LinearGradient
            colors={locked ? ['#3A3A3A', '#2A2A2A'] : GRADIENTS.crimson}
            style={styles.startButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons
              name={locked ? 'lock' : lessonCompleted ? 'replay' : 'play'}
              size={22}
              color={locked ? COLORS.textMuted : COLORS.textPrimary}
            />
            <Text style={[styles.startButtonText, locked && { color: COLORS.textMuted }]}>
              {locked ? 'Complete Previous Lesson'
                : lessonCompleted ? 'Practice Again'
                : `Continue (${completedCount}/${totalCount})`}
            </Text>
          </LinearGradient>
        </PressableScale>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingBottom: SPACING.lg },
  headerContent: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.sm,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: glowColor(COLORS.textPrimary, 0.1),
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm, marginTop: 2,
  },
  headerTitleArea: { flex: 1 },
  lessonLabel: {
    ...TYPOGRAPHY.caption.lg, fontWeight: '700',
    color: COLORS.primary, letterSpacing: 2, marginBottom: 4,
  },
  lessonTitle: { ...TYPOGRAPHY.display.md, fontSize: 26, color: COLORS.textPrimary },
  completedBadge: {
    marginLeft: SPACING.sm, marginTop: 4,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  description: {
    ...TYPOGRAPHY.body.lg, fontSize: 15,
    color: COLORS.textSecondary, marginBottom: SPACING.md,
  },
  // Info row
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.lg,
    marginBottom: SPACING.xl, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    flexWrap: 'wrap',
  },
  difficultyContainer: { alignItems: 'center', gap: 4 },
  difficultyLabel: {
    ...TYPOGRAPHY.caption.sm, fontWeight: '600', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  difficultyBars: { flexDirection: 'row', gap: 3 },
  difficultyBar: { width: 14, height: 6, borderRadius: 3 },
  difficultyBarFilled: { backgroundColor: COLORS.primary },
  difficultyBarEmpty: { backgroundColor: COLORS.cardBorder },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { ...TYPOGRAPHY.body.sm, color: COLORS.textSecondary },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progressLabel: { ...TYPOGRAPHY.body.sm, fontWeight: '600', color: COLORS.textSecondary },
  progressLabelComplete: { color: COLORS.success },
  xpContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  xpText: { ...TYPOGRAPHY.body.sm, fontWeight: '600', color: COLORS.starGold },
  // Mascot
  mascotSection: {
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.xs,
  },
  // Exercises list
  exercisesSection: { marginBottom: SPACING.lg },
  sectionTitle: {
    ...TYPOGRAPHY.heading.sm, fontWeight: '700',
    color: COLORS.textPrimary, marginBottom: SPACING.sm,
  },
  exercisesList: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md, overflow: 'hidden',
  },
  exerciseRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  exerciseRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.sm },
  exerciseIndicator: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  exerciseIndicatorDone: { backgroundColor: COLORS.success },
  exerciseIndicatorPending: { backgroundColor: COLORS.cardBorder },
  exerciseIndicatorText: {
    ...TYPOGRAPHY.caption.lg, fontWeight: '700', color: COLORS.textSecondary,
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { ...TYPOGRAPHY.body.md, fontWeight: '500', color: COLORS.textPrimary },
  exerciseNameDone: { color: COLORS.textMuted },
  exerciseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 },
  exerciseTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  exerciseTypeText: { ...TYPOGRAPHY.caption.sm, fontWeight: '600', fontSize: 10 },
  exerciseScore: { ...TYPOGRAPHY.caption.sm, fontWeight: '600', color: COLORS.textMuted },
  exerciseScoreGood: { color: COLORS.success },
  exerciseRowRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  // Skills tags
  skillsSection: { marginBottom: SPACING.lg },
  skillTags: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs,
  },
  skillTag: {
    backgroundColor: glowColor(COLORS.primary, 0.1),
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  skillTagText: {
    ...TYPOGRAPHY.caption.sm, fontWeight: '600', color: COLORS.primary,
    textTransform: 'capitalize',
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: glowColor(COLORS.background, 0.95),
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.surface,
  },
  startButton: {
    borderRadius: BORDER_RADIUS.lg, overflow: 'hidden',
    ...SHADOWS.md, shadowColor: COLORS.primary,
  },
  startButtonLocked: { opacity: 0.7, shadowColor: 'transparent' },
  startButtonGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md, gap: SPACING.sm,
  },
  startButtonText: {
    ...TYPOGRAPHY.button.lg, fontSize: 17, fontWeight: '700', color: COLORS.textPrimary,
  },
});

export default LessonIntroScreen;

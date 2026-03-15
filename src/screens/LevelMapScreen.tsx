/**
 * LevelMapScreen - Adventure-style winding path level map
 *
 * Shows 40 lesson nodes (not 15 tier nodes) on a winding path.
 * Each node displays the lesson title, exercise type icons, and progress.
 * Grouped into 6 difficulty sections with themed environments.
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeInUp,
} from 'react-native-reanimated';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useProgressStore } from '../stores/progressStore';
import { useGemStore } from '../stores/gemStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useCatEvolutionStore } from '../stores/catEvolutionStore';
import {
  getAllLessons,
  getExercisesForLesson,
} from '../content/ContentLoader';
import type { ExerciseIndexEntry } from '../content/ContentLoader';
import { CatAvatar } from '../components/Mascot/CatAvatar';
import { SalsaCoach } from '../components/Mascot/SalsaCoach';
import { COLORS, GRADIENTS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS, NEON, glowColor } from '../theme/tokens';
import { PressableScale } from '../components/common/PressableScale';
import { GradientMeshBackground } from '../components/effects';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ---------------------------------------------------------------------------
// Layout constants — tighter spacing for 40 nodes
// ---------------------------------------------------------------------------
const NODE_SIZE_CURRENT = 68;
const NODE_SIZE_NORMAL = 56;
const NODE_SIZE_LOCKED = 46;
const VERTICAL_SPACING = 95;
const SECTION_BANNER_HEIGHT = 50;
const SALSA_AREA_HEIGHT = 100;
const TOP_PADDING = SALSA_AREA_HEIGHT + 12;
const BOTTOM_PADDING = 140;

const X_PATTERN = [0.5, 0.28, 0.5, 0.72];

// ---------------------------------------------------------------------------
// Exercise type visual config
// ---------------------------------------------------------------------------

interface ExerciseTypeVisual {
  icon: string;
  color: string;
  label: string;
}

const EXERCISE_TYPE_VISUALS: Record<string, ExerciseTypeVisual> = {
  play:         { icon: 'piano',             color: '#64B5F6', label: 'Play' },
  rhythm:       { icon: 'metronome',         color: '#FF8A65', label: 'Rhythm' },
  earTraining:  { icon: 'ear-hearing',       color: '#CE93D8', label: 'Ear' },
  chordId:      { icon: 'cards',             color: '#81C784', label: 'Chords' },
  sightReading: { icon: 'eye',               color: '#FFD54F', label: 'Sight' },
  callResponse: { icon: 'swap-horizontal',   color: '#4FC3F7', label: 'Call' },
};

function getDominantType(exercises: ExerciseIndexEntry[]): ExerciseTypeVisual {
  const counts: Record<string, number> = {};
  for (const ex of exercises) {
    if (ex.type === 'test') continue;
    counts[ex.type] = (counts[ex.type] ?? 0) + 1;
  }
  let dominant = 'play';
  let max = 0;
  for (const [type, count] of Object.entries(counts)) {
    if (count > max) { max = count; dominant = type; }
  }
  return EXERCISE_TYPE_VISUALS[dominant] ?? EXERCISE_TYPE_VISUALS.play;
}

function getSecondaryTypes(exercises: ExerciseIndexEntry[]): ExerciseTypeVisual[] {
  const types = new Set<string>();
  for (const ex of exercises) {
    if (ex.type !== 'test') types.add(ex.type);
  }
  // Remove dominant type (we show that as the main icon)
  const dominant = getDominantType(exercises);
  const secondaries: ExerciseTypeVisual[] = [];
  for (const t of types) {
    const visual = EXERCISE_TYPE_VISUALS[t];
    if (visual && visual.icon !== dominant.icon) {
      secondaries.push(visual);
    }
  }
  return secondaries;
}

// ---------------------------------------------------------------------------
// Section configuration — difficulty-based groupings
// ---------------------------------------------------------------------------

interface SectionConfig {
  label: string;
  icon: string;
  color: string;
  emoji: string;
  bgGradient: readonly [string, string];
  catId: string;
}

/** Sections keyed by difficulty level (1-5) */
const SECTION_BY_DIFFICULTY: Record<number, SectionConfig> = {
  1: { label: 'Beginner',     icon: 'seed-outline',       color: COLORS.success,  emoji: '\u{1F331}', bgGradient: ['#1A3A1A', '#0A1F0A'], catId: 'mini-meowww' },
  2: { label: 'Intermediate', icon: 'book-open-variant',  color: COLORS.info,     emoji: '\u{1F30A}', bgGradient: ['#1A2A3A', '#0A1520'], catId: 'jazzy' },
  3: { label: 'Advanced',     icon: 'fire',               color: COLORS.warning,  emoji: '\u{1F525}', bgGradient: ['#3A2A1A', '#1F1508'], catId: 'biscuit' },
  4: { label: 'Expert',       icon: 'lightning-bolt',     color: NEON.purple,     emoji: '\u{26A1}',  bgGradient: ['#2A2A3A', '#0F0F20'], catId: 'sable' },
  5: { label: 'Mastery',      icon: 'crown',              color: COLORS.starGold, emoji: '\u{1F451}', bgGradient: ['#0A0A2A', '#050515'], catId: 'chonky-monke' },
};

/**
 * Compute section boundaries from the actual filtered node list.
 * A section banner is placed before the first node in a new difficulty group.
 * Returns a map of nodeIndex → SectionConfig for inverted layout placement.
 */
function computeSectionBoundaries(nodes: LessonNodeData[]): Map<number, SectionConfig> {
  // In inverted layout, the section banner should appear above the LAST node
  // of each difficulty group (which is rendered first in reverse order).
  // We find the last index of each difficulty group.
  const lastIndexByDifficulty = new Map<number, number>();
  for (let i = 0; i < nodes.length; i++) {
    lastIndexByDifficulty.set(nodes[i].difficulty, i);
  }

  const result = new Map<number, SectionConfig>();
  for (const [diff, lastIdx] of lastIndexByDifficulty) {
    const section = SECTION_BY_DIFFICULTY[diff];
    if (section) {
      result.set(lastIdx, section);
    }
  }
  return result;
}


// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

type NodeState = 'completed' | 'current' | 'available' | 'locked';

interface LessonNodeData {
  lessonId: string;
  title: string;
  exerciseCount: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  state: NodeState;
  completedExercises: number;
  dominantType: ExerciseTypeVisual;
  secondaryTypes: ExerciseTypeVisual[];
  firstExerciseId: string | null;
}

interface NodePosition {
  x: number;
  y: number;
  size: number;
}

// ---------------------------------------------------------------------------
// Learning path manifests
// ---------------------------------------------------------------------------

interface LearningPath {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  emoji: string;
  lessons: string[];
}

const LEARNING_PATHS: Record<string, LearningPath> = {
  'piano-basics': require('../../content/paths/piano-basics.json'),
  'pop-and-film': require('../../content/paths/pop-and-film.json'),
  'classical': require('../../content/paths/classical.json'),
  'jazz-and-blues': require('../../content/paths/jazz-and-blues.json'),
  'kids': require('../../content/paths/kids.json'),
};

// ---------------------------------------------------------------------------
// Data hook — builds lesson nodes from content index + progress + path
// ---------------------------------------------------------------------------

function useLessonNodes(): LessonNodeData[] {
  const lessonProgress = useProgressStore((s) => s.lessonProgress);
  const selectedPath = useSettingsStore((s) => s.selectedPath) ?? 'piano-basics';

  return useMemo(() => {
    const allLessons = getAllLessons();
    const path = LEARNING_PATHS[selectedPath];
    const pathLessonSet = path ? new Set(path.lessons) : null;

    // Filter lessons by selected path (or show all if path not found)
    const filteredLessons = pathLessonSet
      ? allLessons.filter((l) => pathLessonSet.has(l.id))
      : allLessons;

    const nodes: LessonNodeData[] = [];

    let foundCurrent = false;

    for (let i = 0; i < filteredLessons.length; i++) {
      const lesson = filteredLessons[i];
      const progress = lessonProgress[lesson.id];
      const exercises = getExercisesForLesson(lesson.id);
      const nonTestExercises = exercises.filter((e) => e.type !== 'test');
      const exerciseCount = nonTestExercises.length;

      // Count completed exercises
      const completedExercises = progress
        ? Object.keys(progress.exerciseScores ?? {}).filter((exId) => {
            const score = progress.exerciseScores[exId];
            return score && score.highScore >= 60; // passing score
          }).length
        : 0;

      // Determine state
      let state: NodeState;
      if (progress?.status === 'completed') {
        state = 'completed';
      } else if (i === 0) {
        // First lesson always available
        state = foundCurrent ? 'available' : 'current';
        if (!foundCurrent) foundCurrent = true;
      } else {
        const prevLesson = filteredLessons[i - 1];
        const prevProgress = lessonProgress[prevLesson.id];
        const prevCompleted = prevProgress?.status === 'completed';

        if (prevCompleted) {
          if (!foundCurrent) {
            state = 'current';
            foundCurrent = true;
          } else {
            state = 'available';
          }
        } else {
          state = foundCurrent ? 'locked' : 'locked';
        }
      }

      // Get first non-test exercise for navigation
      const sortedExercises = [...nonTestExercises].sort((a, b) => a.order - b.order);
      const firstIncomplete = sortedExercises.find((ex) => {
        const exScore = progress?.exerciseScores?.[ex.id];
        return !exScore || exScore.highScore < 60;
      });
      const firstExerciseId = firstIncomplete?.id ?? sortedExercises[0]?.id ?? null;

      nodes.push({
        lessonId: lesson.id,
        title: lesson.title,
        exerciseCount,
        difficulty: lesson.difficulty,
        state,
        completedExercises,
        dominantType: getDominantType(nonTestExercises),
        secondaryTypes: getSecondaryTypes(nonTestExercises),
        firstExerciseId,
      });
    }

    return nodes;
  }, [lessonProgress, selectedPath]);
}

// ---------------------------------------------------------------------------
// Position calculation
// ---------------------------------------------------------------------------

function useNodePositions(nodes: LessonNodeData[], screenWidth: number) {
  return useMemo(() => {
    const usableWidth = screenWidth - SPACING.lg * 2;
    const positions: NodePosition[] = new Array(nodes.length);
    const sectionPositions: { index: number; y: number; config: SectionConfig }[] = [];
    let currentY = TOP_PADDING;
    let patternIndex = 0;

    // Bottom-to-top layout: hardest (last) lesson at top, lesson 1 at bottom.
    // We iterate in reverse visual order so the first items placed are
    // the highest-difficulty lessons (top of scroll), ending with lesson 1 at bottom.
    const sectionBounds = computeSectionBoundaries(nodes);

    for (let ri = nodes.length - 1; ri >= 0; ri--) {
      // Section banners — placed BEFORE the last node of each difficulty group
      const section = sectionBounds.get(ri);
      if (section) {
        sectionPositions.push({ index: ri, y: currentY, config: section });
        currentY += SECTION_BANNER_HEIGHT + 8;
      }

      const state = nodes[ri].state;
      const size = state === 'current' ? NODE_SIZE_CURRENT
        : state === 'locked' ? NODE_SIZE_LOCKED
        : NODE_SIZE_NORMAL;

      const xFrac = X_PATTERN[patternIndex % X_PATTERN.length];
      const x = SPACING.lg + usableWidth * xFrac;

      positions[ri] = { x, y: currentY, size };
      currentY += VERTICAL_SPACING;
      patternIndex++;
    }

    const totalHeight = currentY + BOTTOM_PADDING;
    return { positions, sectionPositions, totalHeight };
  }, [nodes, screenWidth]);
}

// ---------------------------------------------------------------------------
// Node color helpers
// ---------------------------------------------------------------------------

function getNodeColors(state: NodeState, dominantColor: string) {
  switch (state) {
    case 'completed':
      return {
        bg: COLORS.starGold,
        border: COLORS.starGold,
        iconColor: COLORS.background,
        textColor: COLORS.textPrimary,
        subtitleColor: COLORS.starGold,
      };
    case 'current':
      return {
        bg: dominantColor,
        border: dominantColor,
        iconColor: '#FFFFFF',
        textColor: COLORS.textPrimary,
        subtitleColor: dominantColor,
      };
    case 'available':
      return {
        bg: glowColor(dominantColor, 0.3),
        border: dominantColor,
        iconColor: dominantColor,
        textColor: COLORS.textPrimary,
        subtitleColor: dominantColor,
      };
    case 'locked':
    default:
      return {
        bg: COLORS.cardSurface,
        border: COLORS.cardBorder,
        iconColor: COLORS.textMuted,
        textColor: COLORS.textMuted,
        subtitleColor: COLORS.textMuted,
      };
  }
}

// ---------------------------------------------------------------------------
// PulsingGlow (Reanimated)
// ---------------------------------------------------------------------------

function PulsingGlow({ size, color }: { size: number; color?: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1500 }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1500 }),
        withTiming(0.4, { duration: 0 }),
      ),
      -1,
    );
  }, [scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const glowSize = size + 16;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: glowSize,
          height: glowSize,
          borderRadius: glowSize / 2,
          backgroundColor: color ?? COLORS.primary,
          left: -(glowSize - size) / 2,
          top: -(glowSize - size) / 2,
        },
        animStyle,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// PathConnections (SVG)
// ---------------------------------------------------------------------------

function PathConnections({
  positions,
  nodes,
  totalHeight,
  screenWidth,
}: {
  positions: NodePosition[];
  nodes: LessonNodeData[];
  totalHeight: number;
  screenWidth: number;
}) {
  if (positions.length < 2) return null;

  const paths: React.ReactElement[] = [];

  for (let i = 0; i < positions.length - 1; i++) {
    const from = positions[i];
    const to = positions[i + 1];
    const fromY = from.y + from.size / 2;
    const toY = to.y + to.size / 2;
    const midY = (fromY + toY) / 2;
    const controlX = from.x;

    const d = `M ${from.x} ${fromY} Q ${controlX} ${midY} ${to.x} ${toY}`;

    const isCompleted = nodes[i].state === 'completed';
    const dominantColor = nodes[i].dominantType.color;

    paths.push(
      <Path
        key={`path-${i}`}
        d={d}
        stroke={isCompleted ? glowColor(COLORS.starGold, 0.25) : glowColor(dominantColor, 0.12)}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={isCompleted ? undefined : '6 6'}
      />
    );
  }

  return (
    <Svg
      width={screenWidth}
      height={totalHeight}
      style={StyleSheet.absoluteFill}
    >
      {paths}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// LessonNode — individual lesson on the map
// ---------------------------------------------------------------------------

function LessonNode({
  data,
  position,
  index,
  onPress,
}: {
  data: LessonNodeData;
  position: NodePosition;
  index: number;
  onPress: () => void;
}) {
  const colors = getNodeColors(data.state, data.dominantType.color);
  const { size } = position;
  const lessonNum = index + 1;
  const nodeTestID = data.state === 'current' ? 'lesson-node-current' : `lesson-node-${data.lessonId}`;

  const iconName = data.state === 'completed' ? 'check-bold'
    : data.state === 'locked' ? 'lock'
    : (data.dominantType.icon as any);

  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index * 30, 600)).duration(250)}
      style={[
        styles.nodeWrapper,
        {
          left: position.x - size / 2,
          top: position.y,
          width: size + 40, // Extra width for label
          alignItems: 'center',
        },
      ]}
    >
      <PressableScale
        onPress={onPress}
        testID={nodeTestID}
        style={{ alignItems: 'center' }}
        accessibilityRole="button"
        accessibilityLabel={`${data.title}, ${data.state === 'completed' || data.state === 'current' ? `${data.completedExercises} of ${data.exerciseCount} completed` : 'locked'}`}
      >
        {/* Pulsing glow for current */}
        {data.state === 'current' && <PulsingGlow size={size} color={data.dominantType.color} />}

        {/* Main circle */}
        <View style={[
          styles.nodeCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: data.state === 'current' ? 3 : 2,
          },
          data.state === 'current' && { ...SHADOWS.md, shadowColor: data.dominantType.color },
          data.state === 'completed' && { ...SHADOWS.sm, shadowColor: COLORS.starGold },
        ]}>
          <MaterialCommunityIcons
            name={iconName}
            size={data.state === 'current' ? 24 : data.state === 'locked' ? 18 : 22}
            color={colors.iconColor}
          />
        </View>

        {/* Exercise type dots (secondary types) */}
        {data.state !== 'locked' && data.secondaryTypes.length > 0 && (
          <View style={styles.typeDots}>
            {data.secondaryTypes.slice(0, 3).map((t, i) => (
              <View
                key={i}
                style={[styles.typeDot, { backgroundColor: t.color }]}
              />
            ))}
          </View>
        )}

        {/* Label below */}
        <View style={styles.nodeLabel}>
          <Text style={[styles.lessonNum, { color: colors.subtitleColor }]}>
            {lessonNum}
          </Text>
          <Text
            style={[styles.nodeTitle, { color: colors.textColor }]}
            numberOfLines={2}
          >
            {data.title}
          </Text>
          {data.state !== 'locked' && (
            <View style={styles.progressRow}>
              <Text style={[styles.nodeProgress, { color: colors.subtitleColor }]}>
                {data.completedExercises}/{data.exerciseCount}
              </Text>
              {data.state !== 'completed' && (
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, (data.completedExercises / Math.max(1, data.exerciseCount)) * 100)}%`,
                        backgroundColor: data.dominantType.color,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          )}
        </View>

        {/* START chip */}
        {data.state === 'current' && (
          <View style={[styles.startChip, { backgroundColor: data.dominantType.color }]} testID="lesson-node-start-chip">
            <Text style={styles.startChipText}>START</Text>
            <MaterialCommunityIcons name="chevron-right" size={12} color="#FFFFFF" />
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// SectionBanner
// ---------------------------------------------------------------------------

function SectionBanner({
  config,
  y,
  isCompleted,
  catId,
}: {
  config: SectionConfig;
  y: number;
  isCompleted: boolean;
  catId?: string;
}) {
  return (
    <View style={[styles.sectionBanner, { top: y }]}>
      <View style={styles.sectionBannerLine} />
      <View style={[styles.sectionBannerPill, { borderColor: glowColor(config.color, 0.25) }]}>
        <Text style={styles.sectionEmoji}>{config.emoji}</Text>
        <Text style={[
          styles.sectionLabel,
          { color: isCompleted ? config.color : COLORS.textSecondary },
        ]}>
          {config.label}
        </Text>
        {catId && (
          <View style={styles.sectionCatBadge}>
            <CatAvatar
              catId={catId}
              size="small"
              skipEntryAnimation
            />
          </View>
        )}
      </View>
      <View style={styles.sectionBannerLine} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Path selector dropdown
// ---------------------------------------------------------------------------

const PATH_ORDER: string[] = ['piano-basics', 'pop-and-film', 'classical', 'jazz-and-blues', 'kids'];

function PathSelector({ selectedPath, onSelect }: { selectedPath: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const path = LEARNING_PATHS[selectedPath];
  const handleToggle = useCallback(() => setOpen((v) => !v), []);

  return (
    <View style={styles.pathSelectorContainer}>
      <PressableScale onPress={handleToggle} style={styles.pathChip} testID="path-selector" accessibilityRole="button" accessibilityLabel={`Learning path: ${path?.title ?? 'Piano Basics'}, tap to change`}>
        <Text style={styles.pathEmoji}>{path?.emoji ?? '🎹'}</Text>
        <Text style={styles.pathChipText} numberOfLines={1}>{path?.title ?? 'Piano Basics'}</Text>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.textSecondary}
        />
      </PressableScale>

      {/* Inline expandable list — no absolute positioning (RN clips abs overlays in headers) */}
      {open && (
        <View style={styles.pathDropdown}>
          {PATH_ORDER.map((id) => {
            const p = LEARNING_PATHS[id];
            if (!p) return null;
            const isActive = id === selectedPath;
            return (
              <PressableScale
                key={id}
                style={[styles.pathOption, isActive && styles.pathOptionActive]}
                onPress={() => { onSelect(id); setOpen(false); }}
                testID={`path-option-${id}`}
                accessibilityRole="button"
                accessibilityLabel={`${p.title}${isActive ? ', selected' : ''}`}
              >
                <Text style={styles.pathEmoji}>{p.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pathOptionTitle, isActive && { color: COLORS.primary }]}>
                    {p.title}
                  </Text>
                  <Text style={styles.pathOptionDesc} numberOfLines={1}>{p.description}</Text>
                </View>
                <Text style={styles.pathLessonCount}>{p.lessons.length}</Text>
              </PressableScale>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function LevelMapScreen() {
  const navigation = useNavigation<NavProp>();
  const canGoBack = useNavigationState((s) => s.routes.length > 1);
  const nodes = useLessonNodes();
  const scrollRef = useRef<ScrollView>(null);
  const hasAutoScrolledRef = useRef(false);
  const { width: screenWidth } = useWindowDimensions();
  const gems = useGemStore((s) => s.gems);
  const selectedCatId = useSettingsStore((s) => s.selectedCatId) ?? 'mini-meowww';
  const selectedPath = useSettingsStore((s) => s.selectedPath) ?? 'piano-basics';
  const setSelectedPath = useSettingsStore((s) => s.setSelectedPath);
  const catStage = useCatEvolutionStore((s) => s.evolutionData[selectedCatId]?.currentStage ?? 'baby');

  const { positions, sectionPositions, totalHeight } = useNodePositions(nodes, screenWidth);

  // Reset auto-scroll when path changes
  useEffect(() => {
    hasAutoScrolledRef.current = false;
  }, [selectedPath]);

  // Auto-scroll to current node
  useEffect(() => {
    if (hasAutoScrolledRef.current) return;
    const currentIndex = nodes.findIndex((n) => n.state === 'current');
    if (currentIndex >= 0 && positions[currentIndex] && scrollRef.current) {
      hasAutoScrolledRef.current = true;
      const targetY = Math.max(0, positions[currentIndex].y - 250);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: targetY, animated: true });
      }, 400);
    }
  }, [nodes, positions]);

  const handleNodePress = useCallback(
    (data: LessonNodeData) => {
      if (data.state === 'locked') {
        // Still navigate to show locked state info
        navigation.navigate('LessonIntro', {
          lessonId: data.lessonId,
          locked: true,
        });
        return;
      }

      navigation.navigate('LessonIntro', {
        lessonId: data.lessonId,
        locked: false,
      });
    },
    [navigation],
  );

  const handleGoBack = useCallback(() => { navigation.goBack(); }, [navigation]);

  const completedCount = nodes.filter((n) => n.state === 'completed').length;
  const totalExercises = nodes.reduce((s, n) => s + n.exerciseCount, 0);

  // Section completion — keyed by node index (same as sectionPositions)
  const isSectionCompleted = useMemo(() => {
    const result: Record<number, boolean> = {};
    // Group nodes by difficulty to check if all nodes in a difficulty group are completed
    const byDifficulty: Record<number, LessonNodeData[]> = {};
    for (const node of nodes) {
      (byDifficulty[node.difficulty] ??= []).push(node);
    }
    // For each section boundary (the last index of a difficulty group), check if all completed
    const sectionBounds = computeSectionBoundaries(nodes);
    for (const [idx] of sectionBounds) {
      const diff = nodes[idx]?.difficulty;
      if (diff != null) {
        const group = byDifficulty[diff] ?? [];
        result[idx] = group.length > 0 && group.every((n) => n.state === 'completed');
      }
    }
    return result;
  }, [nodes]);

  return (
    <View style={styles.container} testID="level-map-screen">
      <GradientMeshBackground accent="learn" />
      {/* Header */}
      <LinearGradient
        colors={[GRADIENTS.header[0], GRADIENTS.header[1], COLORS.background]}
        style={styles.header}
      >
        <View style={styles.headerTopRow}>
          {canGoBack ? (
            <PressableScale onPress={handleGoBack} style={styles.backButton} testID="level-map-back" accessibilityRole="button" accessibilityLabel="Go back">
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
            </PressableScale>
          ) : (
            <View style={styles.backButton} />
          )}
          <Text style={styles.title}>Your Journey</Text>
          <View style={styles.headerCatAvatar}>
            <CatAvatar catId={selectedCatId} size="small" evolutionStage={catStage} skipEntryAnimation />
          </View>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.headerBadge}>
            <MaterialCommunityIcons name="book-open-variant" size={14} color={COLORS.success} />
            <Text style={styles.headerBadgeText}>{completedCount}/{nodes.length} lessons</Text>
          </View>
          <View style={styles.headerBadge}>
            <MaterialCommunityIcons name="music-note" size={14} color={COLORS.primary} />
            <Text style={styles.headerBadgeText}>{totalExercises} exercises</Text>
          </View>
          <View style={styles.headerBadge}>
            <MaterialCommunityIcons name="diamond-stone" size={14} color={COLORS.gemGold} />
            <Text style={styles.headerBadgeText}>{gems}</Text>
          </View>
        </View>

        {/* Learning path selector */}
        <PathSelector selectedPath={selectedPath} onSelect={(id) => setSelectedPath(id as any)} />

        {/* Exercise type legend */}
        <View style={styles.typeLegend}>
          {Object.entries(EXERCISE_TYPE_VISUALS).map(([key, vis]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: vis.color }]} />
              <Text style={styles.legendLabel}>{vis.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Scrollable map */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { height: totalHeight }]}
        showsVerticalScrollIndicator={false}
        testID="level-map-scroll"
      >
        {/* SVG path connections */}
        <PathConnections
          positions={positions}
          nodes={nodes}
          totalHeight={totalHeight}
          screenWidth={screenWidth}
        />

        {/* Section banners */}
        {sectionPositions.map(({ index, y, config }) => (
          <SectionBanner
            key={`section-${index}`}
            config={config}
            y={y}
            isCompleted={isSectionCompleted[index] ?? false}
            catId={config.catId}
          />
        ))}

        {/* Lesson nodes */}
        {nodes.map((data, index) => (
          <LessonNode
            key={data.lessonId}
            data={data}
            position={positions[index]}
            index={index}
            onPress={() => handleNodePress(data)}
          />
        ))}

        {/* Salsa at the top */}
        <View style={[styles.salsaFooter, { top: 0, height: SALSA_AREA_HEIGHT }]}>
          <SalsaCoach mood="encouraging" size="small" showCatchphrase />
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: { paddingTop: 60, paddingBottom: SPACING.sm, paddingHorizontal: SPACING.lg },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: glowColor(COLORS.textPrimary, 0.08),
  },
  headerCatAvatar: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { ...TYPOGRAPHY.display.md, color: COLORS.textPrimary },
  headerStats: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs, justifyContent: 'center' },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: glowColor(COLORS.textPrimary, 0.05),
    paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.full,
  },
  headerBadgeText: { ...TYPOGRAPHY.caption.sm, fontWeight: '700', color: COLORS.textSecondary },

  // Type legend
  typeLegend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    marginTop: SPACING.xs, justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { ...TYPOGRAPHY.caption.sm, color: COLORS.textMuted, fontSize: 10 },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { position: 'relative' },

  // Node
  nodeWrapper: { position: 'absolute', alignItems: 'center' },
  nodeCircle: {
    alignItems: 'center', justifyContent: 'center',
  },
  nodeLabel: { alignItems: 'center', marginTop: 4, width: 110 },
  lessonNum: {
    ...TYPOGRAPHY.caption.sm, fontWeight: '800', letterSpacing: 1, fontSize: 10,
  },
  nodeTitle: {
    ...TYPOGRAPHY.caption.sm, fontWeight: '600', textAlign: 'center',
    lineHeight: 14,
  },
  progressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2,
  },
  nodeProgress: {
    ...TYPOGRAPHY.caption.sm, fontWeight: '600', fontSize: 10,
  },
  progressBar: {
    flex: 1, height: 3, backgroundColor: glowColor(COLORS.textPrimary, 0.1),
    borderRadius: 2, maxWidth: 40,
  },
  progressFill: {
    height: '100%', borderRadius: 2,
  },

  // Type dots
  typeDots: {
    flexDirection: 'row', gap: 3, marginTop: 3,
  },
  typeDot: {
    width: 6, height: 6, borderRadius: 3,
  },

  // START chip
  startChip: {
    flexDirection: 'row', alignItems: 'center',
    gap: 2, marginTop: SPACING.xs, backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: BORDER_RADIUS.full,
  },
  startChipText: {
    ...TYPOGRAPHY.special.badge, fontWeight: '800',
    color: '#FFFFFF', letterSpacing: 1,
  },

  // Section banner
  sectionBanner: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, height: SECTION_BANNER_HEIGHT,
  },
  sectionBannerLine: { flex: 1, height: 1, backgroundColor: glowColor(COLORS.textPrimary, 0.06) },
  sectionBannerPill: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    borderWidth: 1, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm + SPACING.xs, paddingVertical: SPACING.xs,
    backgroundColor: glowColor(COLORS.textPrimary, 0.03),
  },
  sectionEmoji: { fontSize: 14 },
  sectionLabel: {
    ...TYPOGRAPHY.caption.lg, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.5,
  },
  sectionCatBadge: { marginLeft: SPACING.xs },

  // Path selector
  pathSelectorContainer: { marginTop: SPACING.xs },
  pathChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center',
    backgroundColor: glowColor(COLORS.textPrimary, 0.06),
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: glowColor(COLORS.textPrimary, 0.08),
  },
  pathEmoji: { fontSize: 16 },
  pathChipText: { ...TYPOGRAPHY.caption.lg, fontWeight: '700', color: COLORS.textPrimary, maxWidth: 140 },
  pathDropdown: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.cardSurface, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.cardBorder,
    ...SHADOWS.lg, paddingVertical: SPACING.xs,
  },
  pathOption: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  pathOptionActive: {
    backgroundColor: glowColor(COLORS.primary, 0.1),
  },
  pathOptionTitle: { ...TYPOGRAPHY.caption.lg, fontWeight: '600', color: COLORS.textPrimary },
  pathOptionDesc: { ...TYPOGRAPHY.caption.sm, color: COLORS.textMuted, marginTop: 1 },
  pathLessonCount: { ...TYPOGRAPHY.caption.sm, fontWeight: '700', color: COLORS.textMuted },

  // Salsa footer
  salsaFooter: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
});

export default LevelMapScreen;

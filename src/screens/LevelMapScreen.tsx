/**
 * LevelMapScreen - Duolingo-style vertical scrolling level map
 * Winding path with 80px nodes, gold/crimson/grey states,
 * Bezier curve connectors, decorative elements, parallax scroll.
 *
 * Shows 15 tier nodes: tiers 1-6 map to static lessons, tiers 7-15
 * are AI-generated skill groups from the SkillTree.
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useProgressStore } from '../stores/progressStore';
import { useLearnerProfileStore } from '../stores/learnerProfileStore';
import { useGemStore } from '../stores/gemStore';
import { getLessons } from '../content/ContentLoader';
import { SKILL_TREE } from '../core/curriculum/SkillTree';
import { COLORS, GRADIENTS, SPACING, BORDER_RADIUS } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const NODE_SIZE = 80;
const NODE_SPACING_Y = 140;
const ZIGZAG_OFFSET = SCREEN_WIDTH * 0.2;

/** Metadata for each tier — title and icon shown on the level map */
const TIER_META: Record<number, { title: string; icon: string }> = {
  1: { title: 'Note Finding', icon: 'music-note' },
  2: { title: 'Right Hand Melodies', icon: 'hand-pointing-right' },
  3: { title: 'Left Hand Basics', icon: 'hand-pointing-left' },
  4: { title: 'Both Hands', icon: 'hand-clap' },
  5: { title: 'Scales & Technique', icon: 'stairs' },
  6: { title: 'Popular Songs', icon: 'music' },
  7: { title: 'Black Keys', icon: 'piano' },
  8: { title: 'G & F Major', icon: 'key-variant' },
  9: { title: 'Minor Keys', icon: 'music-accidental-flat' },
  10: { title: 'Chord Progressions', icon: 'cards' },
  11: { title: 'Advanced Rhythm', icon: 'metronome' },
  12: { title: 'Arpeggios', icon: 'wave' },
  13: { title: 'Expression', icon: 'volume-high' },
  14: { title: 'Sight Reading', icon: 'eye' },
  15: { title: 'Performance', icon: 'trophy' },
};

/** Section divider labels between groups of tiers */
const TIER_SECTIONS: Record<number, string> = {
  0: 'Beginner',
  4: 'Fundamentals',
  6: 'Intermediate',
  10: 'Advanced',
  14: 'Mastery',
};

type NodeState = 'completed' | 'current' | 'locked';

interface TierNodeData {
  tier: number;
  title: string;
  icon: string;
  state: NodeState;
  masteredCount: number;
  totalSkills: number;
  /** For tiers 1-6: the lesson ID to navigate to */
  lessonId: string | null;
  /** For tiers 7-15: the first unmastered skill ID for AI exercise */
  firstUnmasteredSkillId: string | null;
}

/**
 * Build tier nodes by combining static lesson data (tiers 1-6) with
 * SkillTree tier groups (tiers 7-15). Completion state is derived from
 * masteredSkills in the learnerProfileStore.
 */
function useTierNodes(): TierNodeData[] {
  const { lessonProgress } = useProgressStore();
  const masteredSkills = useLearnerProfileStore((s) => s.masteredSkills);
  const lessons = useMemo(() => getLessons(), []);

  return useMemo(() => {
    const masteredSet = new Set(masteredSkills);

    // Group skills by tier
    const skillsByTier = new Map<number, typeof SKILL_TREE>();
    for (const skill of SKILL_TREE) {
      const list = skillsByTier.get(skill.tier) ?? [];
      list.push(skill);
      skillsByTier.set(skill.tier, list);
    }

    // Get all unique tiers sorted
    const tiers = Array.from(skillsByTier.keys()).sort((a, b) => a - b);

    let foundCurrent = false;
    const nodes: TierNodeData[] = [];

    for (const tier of tiers) {
      const skills = skillsByTier.get(tier) ?? [];
      const masteredCount = skills.filter((s) => masteredSet.has(s.id)).length;
      const totalSkills = skills.length;
      const isComplete = masteredCount === totalSkills;

      const meta = TIER_META[tier] ?? { title: `Tier ${tier}`, icon: 'star' };

      // Explicit tier-to-lesson mapping (not index-based, safe if lessons reorder)
      const TIER_TO_LESSON: Record<number, string> = {
        1: 'lesson-01', 2: 'lesson-02', 3: 'lesson-03',
        4: 'lesson-04', 5: 'lesson-05', 6: 'lesson-06',
      };
      const lessonId = TIER_TO_LESSON[tier] ?? null;
      const lesson = lessonId ? lessons.find((l) => l.id === lessonId) ?? null : null;

      // For tiers 1-6, also consider lesson progress for completion
      let tierComplete = isComplete;
      if (lesson && lessonProgress[lesson.id]?.status === 'completed') {
        tierComplete = true;
      }

      // Check if previous tier is complete
      const prevTier = nodes.length > 0 ? nodes[nodes.length - 1] : null;
      const prevComplete = !prevTier || prevTier.state === 'completed';

      let state: NodeState;
      if (tierComplete) {
        state = 'completed';
      } else if (prevComplete && !foundCurrent) {
        state = 'current';
        foundCurrent = true;
      } else {
        state = 'locked';
      }

      // Find first unmastered skill in this tier (for AI navigation)
      const firstUnmastered = skills.find((s) => !masteredSet.has(s.id));

      nodes.push({
        tier,
        title: meta.title,
        icon: meta.icon,
        state,
        masteredCount,
        totalSkills,
        lessonId,
        firstUnmasteredSkillId: firstUnmastered?.id ?? null,
      });
    }

    return nodes;
  }, [lessons, lessonProgress, masteredSkills]);
}

function getNodeX(index: number): number {
  const center = SCREEN_WIDTH / 2;
  const offset = ZIGZAG_OFFSET * Math.sin((index * Math.PI) / 2);
  return center + offset;
}

function getNodeY(index: number, totalNodes: number): number {
  const reverseIndex = totalNodes - 1 - index;
  return 100 + reverseIndex * NODE_SPACING_Y;
}

function getConnectorPath(fromX: number, fromY: number, toX: number, toY: number): string {
  const midY = (fromY + toY) / 2;
  const controlOffset = Math.abs(toX - fromX) * 0.3;
  return `M ${fromX} ${fromY} C ${fromX + controlOffset} ${midY - 20}, ${toX - controlOffset} ${midY + 20}, ${toX} ${toY}`;
}

/** Animated pulsing glow ring for current node */
function PulsingGlow() {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.5,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.pulsingGlow,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
}

/** Individual tier node */
function TierNode({
  data,
  x,
  y,
  onPress,
}: {
  data: TierNodeData;
  x: number;
  y: number;
  onPress: () => void;
}) {
  const config = NODE_CONFIGS[data.state];
  const nodeTestID = data.state === 'current'
    ? 'lesson-node-current'
    : `tier-node-${data.tier}`;

  return (
    <TouchableOpacity
      activeOpacity={data.state === 'locked' ? 1 : 0.7}
      onPress={onPress}
      testID={nodeTestID}
      style={[styles.nodeWrapper, { left: x - NODE_SIZE / 2, top: y - NODE_SIZE / 2 }]}
    >
      {data.state === 'current' && <PulsingGlow />}

      <View style={[styles.nodeCircle, config.circleStyle]}>
        {data.state === 'completed' && (
          <MaterialCommunityIcons name="check-bold" size={32} color="#FFFFFF" />
        )}
        {data.state === 'current' && (
          <View style={styles.startBtnInner}>
            <MaterialCommunityIcons name="play" size={28} color="#FFFFFF" />
          </View>
        )}
        {data.state === 'locked' && (
          <MaterialCommunityIcons name="lock" size={24} color={COLORS.textMuted} />
        )}
      </View>

      {/* Label below node */}
      <Text style={[styles.nodeLabel, config.labelStyle]} numberOfLines={2}>
        {data.title}
      </Text>

      {/* Progress for completed or current */}
      {(data.state === 'completed' || data.state === 'current') && (
        <Text style={[styles.nodeProgress, data.state === 'completed' ? { color: COLORS.starGold } : null]}>
          {data.masteredCount}/{data.totalSkills} skills
        </Text>
      )}

      {/* "START" text for current */}
      {data.state === 'current' && (
        <View style={styles.startChip} testID="lesson-node-start-chip">
          <Text style={styles.startChipText}>START</Text>
        </View>
      )}

      {/* Level requirement for locked */}
      {data.state === 'locked' && (
        <Text style={styles.lockedHint}>Complete previous</Text>
      )}
    </TouchableOpacity>
  );
}

/** Decorative floating music notes on the path */
function DecorationLayer({ count, height }: { count: number; height: number }) {
  // Use a seeded hash to generate stable positions (avoids jumps on height changes)
  const decorationsRef = useRef<{ x: number; y: number; char: string; opacity: number }[]>([]);
  const decorations = useMemo(() => {
    // Only regenerate if count changed; height changes just re-use existing positions
    if (decorationsRef.current.length === count && height > 0) {
      return decorationsRef.current;
    }
    const items: { x: number; y: number; char: string; opacity: number }[] = [];
    const chars = ['\u266A', '\u266B', '\u2669', '\u{1F3B5}'];
    // Simple seeded pseudo-random (deterministic per index)
    const seeded = (i: number, salt: number) => {
      const x = Math.sin(i * 9301 + salt * 49297) * 49979;
      return x - Math.floor(x);
    };
    for (let i = 0; i < count; i++) {
      items.push({
        x: 20 + seeded(i, 1) * (SCREEN_WIDTH - 40),
        y: 80 + seeded(i, 2) * Math.max(1, height - 160),
        char: chars[i % chars.length],
        opacity: 0.06 + seeded(i, 3) * 0.06,
      });
    }
    decorationsRef.current = items;
    return items;
  }, [count, height]);

  return (
    <>
      {decorations.map((d, i) => (
        <Text
          key={`deco-${i}`}
          style={[
            styles.decoration,
            { left: d.x, top: d.y, opacity: d.opacity },
          ]}
        >
          {d.char}
        </Text>
      ))}
    </>
  );
}

export function LevelMapScreen() {
  const navigation = useNavigation<NavProp>();
  const nodes = useTierNodes();
  const scrollRef = useRef<ScrollView>(null);
  const gems = useGemStore((s) => s.gems);

  useEffect(() => {
    const currentIndex = nodes.findIndex((n) => n.state === 'current');
    if (currentIndex >= 0 && scrollRef.current) {
      const y = getNodeY(currentIndex, nodes.length);
      const scrollTarget = Math.max(0, y - SCREEN_HEIGHT / 2 + NODE_SIZE);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: scrollTarget, animated: true });
      }, 300);
    }
  }, [nodes]);

  const handleNodePress = useCallback(
    (data: TierNodeData) => {
      if (data.state === 'locked') return;

      // Tiers 1-6 with static lessons: navigate to LessonIntro
      if (data.lessonId) {
        navigation.navigate('LessonIntro', { lessonId: data.lessonId });
        return;
      }

      // Tiers 7-15: navigate to AI exercise for the first unmastered skill
      if (data.firstUnmasteredSkillId) {
        navigation.navigate('Exercise', {
          exerciseId: 'ai-mode',
          aiMode: true,
          skillId: data.firstUnmasteredSkillId,
        });
      }
    },
    [navigation]
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const contentHeight = 100 + nodes.length * NODE_SPACING_Y + 80;

  const connectors = useMemo(() => {
    const paths: React.ReactElement[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const fromX = getNodeX(i);
      const fromY = getNodeY(i, nodes.length);
      const toX = getNodeX(i + 1);
      const toY = getNodeY(i + 1, nodes.length);

      const isFromCompleted = nodes[i].state === 'completed';
      const isToAvailable = nodes[i + 1].state !== 'locked';

      let pathColor: string;
      let pathWidth: number;
      let dashArray: string | undefined;

      if (isFromCompleted && isToAvailable) {
        pathColor = COLORS.starGold;
        pathWidth = 3;
        dashArray = undefined;
      } else if (isFromCompleted) {
        pathColor = COLORS.success;
        pathWidth = 3;
        dashArray = undefined;
      } else {
        pathColor = COLORS.cardBorder;
        pathWidth = 2;
        dashArray = '10,8';
      }

      paths.push(
        <Path
          key={`path-${i}`}
          d={getConnectorPath(fromX, fromY, toX, toY)}
          stroke={pathColor}
          strokeWidth={pathWidth}
          fill="none"
          strokeDasharray={dashArray}
          strokeLinecap="round"
        />
      );
    }
    return paths;
  }, [nodes]);

  const completedCount = nodes.filter((n) => n.state === 'completed').length;

  return (
    <View style={styles.container} testID="level-map-screen">
      <LinearGradient
        colors={[GRADIENTS.header[0], GRADIENTS.header[1], COLORS.background]}
        style={styles.header}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
            testID="level-map-back"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Your Journey</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.headerStats}>
          <View style={styles.headerBadge}>
            <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
            <Text style={styles.headerBadgeText}>{completedCount}/{nodes.length}</Text>
          </View>
          <View style={styles.headerBadge}>
            <MaterialCommunityIcons name="star" size={16} color={COLORS.starGold} />
            <Text style={styles.headerBadgeText}>
              {nodes.reduce((s, n) => s + n.masteredCount, 0)} skills
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <MaterialCommunityIcons name="diamond-stone" size={16} color={COLORS.gemGold} />
            <Text style={styles.headerBadgeText}>{gems}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={{ height: contentHeight }}
        showsVerticalScrollIndicator={false}
        testID="level-map-scroll"
      >
        {/* Decorative elements */}
        <DecorationLayer count={12} height={contentHeight} />

        {/* SVG Connectors */}
        <Svg
          width={SCREEN_WIDTH}
          height={contentHeight}
          style={StyleSheet.absoluteFill}
        >
          {connectors}
        </Svg>

        {/* Tier section headers */}
        {Object.entries(TIER_SECTIONS).map(([indexStr, label]) => {
          const idx = Number(indexStr);
          if (idx >= nodes.length) return null;
          const y = getNodeY(idx, nodes.length) - NODE_SPACING_Y / 2 - 10;
          return (
            <View key={`tier-${idx}`} style={[styles.tierHeader, { top: y }]}>
              <View style={styles.tierLine} />
              <Text style={styles.tierLabel}>{label}</Text>
              <View style={styles.tierLine} />
            </View>
          );
        })}

        {/* Nodes */}
        {nodes.map((data, index) => (
          <TierNode
            key={`tier-${data.tier}`}
            data={data}
            x={getNodeX(index)}
            y={getNodeY(index, nodes.length)}
            onPress={() => handleNodePress(data)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const NODE_CONFIGS = {
  completed: {
    circleStyle: {
      backgroundColor: COLORS.starGold,
      borderColor: '#D4A800',
      shadowColor: COLORS.starGold,
      shadowOpacity: 0.3,
      shadowRadius: 8,
    } as const,
    labelStyle: { color: COLORS.textSecondary } as const,
  },
  current: {
    circleStyle: {
      backgroundColor: COLORS.primary,
      borderColor: '#A3102E',
      shadowColor: COLORS.primary,
      shadowOpacity: 0.4,
      shadowRadius: 12,
    } as const,
    labelStyle: { color: COLORS.primary, fontWeight: '700' as const } as const,
  },
  locked: {
    circleStyle: {
      backgroundColor: COLORS.cardSurface,
      borderColor: COLORS.cardBorder,
    } as const,
    labelStyle: { color: COLORS.textMuted } as const,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: SPACING.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerStats: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
    justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  // Nodes
  nodeWrapper: {
    position: 'absolute',
    width: NODE_SIZE + 80,
    alignItems: 'center',
  },
  pulsingGlow: {
    position: 'absolute',
    width: NODE_SIZE + 24,
    height: NODE_SIZE + 24,
    borderRadius: (NODE_SIZE + 24) / 2,
    backgroundColor: COLORS.primary,
    top: -12,
  },
  nodeCircle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  startBtnInner: {
    width: NODE_SIZE - 12,
    height: NODE_SIZE - 12,
    borderRadius: (NODE_SIZE - 12) / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: NODE_SIZE + 60,
  },
  nodeProgress: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  startChip: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  startChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  lockedHint: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  // Tier headers
  tierHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  tierLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.cardBorder,
  },
  tierLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Decorations
  decoration: {
    position: 'absolute',
    fontSize: 24,
    color: COLORS.textMuted,
  },
});

export default LevelMapScreen;

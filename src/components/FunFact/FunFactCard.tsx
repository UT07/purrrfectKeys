/**
 * FunFactCard Component
 * Displays a music fun fact with animated entrance, category chip, and themed styling.
 * Uses react-native-reanimated for fade + slide-up animation.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CATEGORY_COLORS } from '../../content/funFacts';
import type { FunFact } from '../../content/funFacts';

export interface FunFactCardProps {
  fact: FunFact;
  /** Delay before the entrance animation starts (ms) */
  animationDelay?: number;
  /** Whether to show the category tag chip */
  showCategory?: boolean;
  /** Compact mode for tighter layouts (e.g., ExerciseCard) */
  compact?: boolean;
  testID?: string;
}

/**
 * FunFactCard - Animated card displaying a music fun fact
 * Slides up from bottom with a fade-in entrance.
 */
export function FunFactCard({
  fact,
  animationDelay = 200,
  showCategory = true,
  compact = false,
  testID = 'fun-fact-card',
}: FunFactCardProps): React.JSX.Element {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(
      animationDelay,
      withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      })
    );
    translateY.value = withDelay(
      animationDelay,
      withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [opacity, translateY, animationDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const categoryStyle = CATEGORY_COLORS[fact.category];

  return (
    <Animated.View
      style={[
        styles.container,
        compact && styles.containerCompact,
        animatedStyle,
      ]}
      testID={testID}
    >
      {/* Header row */}
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="lightbulb-on-outline"
          size={compact ? 14 : 16}
          color="#FFD700"
        />
        <Text style={[styles.headerText, compact && styles.headerTextCompact]}>
          Did You Know?
        </Text>
      </View>

      {/* Fact text */}
      <Text style={[styles.factText, compact && styles.factTextCompact]}>
        {fact.text}
      </Text>

      {/* Category chip */}
      {showCategory && (
        <View style={styles.footer}>
          <View
            style={[
              styles.categoryChip,
              { backgroundColor: categoryStyle.bg },
            ]}
          >
            <Text style={[styles.categoryText, { color: categoryStyle.text }]}>
              {categoryStyle.label}
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

FunFactCard.displayName = 'FunFactCard';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 8,
  },
  containerCompact: {
    padding: 10,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD700',
  },
  headerTextCompact: {
    fontSize: 11,
  },
  factText: {
    fontSize: 13,
    color: '#E0E0E0',
    lineHeight: 19,
  },
  factTextCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default FunFactCard;

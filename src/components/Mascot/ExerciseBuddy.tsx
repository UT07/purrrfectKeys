/**
 * ExerciseBuddy — Mini floating cat companion during exercise gameplay
 *
 * Sits in the top-left corner and reacts to:
 *   - Perfect hit → bounce + sparkle
 *   - Good hit → nod
 *   - Miss → droops
 *   - Combo streak → gets progressively more excited
 *   - Completion → celebration dance
 *
 * The cat's mood transitions smoothly between states using Reanimated.
 * This creates a "buddy" feeling — the cat is learning with you.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { ReactElement } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

import { CatAvatar } from './CatAvatar';
import { getCatById, getDefaultCat } from './catCharacters';
import { useCatEvolutionStore } from '@/stores/catEvolutionStore';
import { reactionToPose, REACTIONS } from './animations/catAnimations';

export type BuddyReaction =
  | 'idle'
  | 'perfect'
  | 'good'
  | 'miss'
  | 'combo'
  | 'celebrating';

interface ExerciseBuddyProps {
  catId: string;
  /** Current reaction state — drive from exercise scoring */
  reaction?: BuddyReaction;
  /** Current combo count */
  comboCount?: number;
}

// Emoji reactions that float up on events
const REACTION_EMOJIS: Record<string, string> = {
  perfect: '✨',
  good: '👍',
  miss: '💫',
  combo: '🔥',
  celebrating: '🎉',
};

export function ExerciseBuddy({
  catId,
  reaction = 'idle',
  comboCount = 0,
}: ExerciseBuddyProps): ReactElement {
  const cat = getCatById(catId) ?? getDefaultCat();
  const evolutionData = useCatEvolutionStore((state) => state.evolutionData[catId]);
  const evolutionStage = evolutionData?.currentStage ?? 'baby';

  // Animation shared values
  const bounceY = useSharedValue(0);
  const bounceScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const emojiOpacity = useSharedValue(0);
  const emojiY = useSharedValue(0);

  // Track last reaction to avoid re-triggering same state
  const lastReactionRef = useRef<string>('idle');
  const lastReactionTimeRef = useRef(0);

  const triggerEmoji = useCallback(() => {
    emojiOpacity.value = 1;
    emojiY.value = 0;
    emojiOpacity.value = withDelay(
      400,
      withTiming(0, { duration: 600 }),
    );
    emojiY.value = withTiming(-40, {
      duration: 1000,
      easing: Easing.out(Easing.quad),
    });
  }, [emojiOpacity, emojiY]);

  // React to changes
  useEffect(() => {
    const now = Date.now();
    // Debounce: don't re-trigger within 200ms
    if (
      reaction === lastReactionRef.current &&
      now - lastReactionTimeRef.current < 200
    ) {
      return;
    }
    lastReactionRef.current = reaction;
    lastReactionTimeRef.current = now;

    // Data-driven reactions from REACTIONS config
    const reactionConfig = REACTIONS[reaction];
    if (reactionConfig) {
      const bodyTarget = reactionConfig.parts.body;
      if (bodyTarget) {
        if (bodyTarget.translateY != null) {
          bounceY.value = withSequence(
            withTiming(bodyTarget.translateY, { duration: bodyTarget.duration }),
            withTiming(0, { duration: reactionConfig.settle }),
          );
        }
        if (bodyTarget.scaleY != null) {
          bounceScale.value = withSequence(
            withTiming(bodyTarget.scaleY, { duration: bodyTarget.duration }),
            withTiming(1.0, { duration: reactionConfig.settle }),
          );
        }
      }
      const earTarget = reactionConfig.parts.ears;
      if (earTarget?.rotate != null) {
        rotation.value = withSequence(
          withTiming(earTarget.rotate, { duration: earTarget.duration }),
          withTiming(0, { duration: reactionConfig.settle }),
        );
      }
      // Trigger emoji for all non-idle reactions
      runOnJS(triggerEmoji)();
    } else {
      // idle: gentle return to neutral
      bounceY.value = withTiming(0, { duration: 300 });
      bounceScale.value = withTiming(1.0, { duration: 300 });
      rotation.value = withTiming(0, { duration: 300 });
    }
  }, [reaction, bounceY, bounceScale, rotation, triggerEmoji]);

  // Animated styles
  const buddyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounceY.value },
      { scale: bounceScale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const emojiStyle = useAnimatedStyle(() => ({
    opacity: emojiOpacity.value,
    transform: [{ translateY: emojiY.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Floating emoji reaction */}
      <Animated.View style={[styles.emojiContainer, emojiStyle]}>
        <Text style={styles.emoji}>
          {REACTION_EMOJIS[reaction] ?? ''}
        </Text>
      </Animated.View>

      {/* Cat avatar with pose-driven mood + animation */}
      <Animated.View style={buddyStyle}>
        <CatAvatar
          catId={catId}
          size="medium"
          pose={reactionToPose(reaction)}
          evolutionStage={evolutionStage}
          skipEntryAnimation
        />
      </Animated.View>

      {/* Combo counter */}
      {comboCount >= 2 && (
        <View style={[styles.comboBadge, { backgroundColor: cat.color + 'CC' }]}>
          <Text style={styles.comboText}>{comboCount}x</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 64,
  },
  emojiContainer: {
    position: 'absolute',
    top: -20,
    zIndex: 10,
  },
  emoji: {
    fontSize: 20,
  },
  comboBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 28,
    alignItems: 'center',
  },
  comboText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});

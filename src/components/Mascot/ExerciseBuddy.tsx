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
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

import { CatAvatar } from './CatAvatar';
import { getCatById, getDefaultCat } from './catCharacters';

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

    switch (reaction) {
      case 'perfect':
        // Bounce up with sparkle
        bounceY.value = withSequence(
          withSpring(-8, { damping: 6, stiffness: 200 }),
          withSpring(0, { damping: 10, stiffness: 120 }),
        );
        bounceScale.value = withSequence(
          withSpring(1.15, { damping: 6, stiffness: 200 }),
          withSpring(1.0, { damping: 10, stiffness: 120 }),
        );
        runOnJS(triggerEmoji)();
        break;

      case 'good':
        // Gentle nod
        rotation.value = withSequence(
          withTiming(5, { duration: 150 }),
          withTiming(-3, { duration: 150 }),
          withTiming(0, { duration: 200 }),
        );
        break;

      case 'miss':
        // Droop down slightly
        bounceY.value = withSequence(
          withTiming(4, { duration: 300, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        );
        bounceScale.value = withSequence(
          withTiming(0.92, { duration: 300 }),
          withTiming(1.0, { duration: 500 }),
        );
        runOnJS(triggerEmoji)();
        break;

      case 'combo':
        // Excited wiggle
        rotation.value = withSequence(
          withTiming(8, { duration: 100 }),
          withTiming(-8, { duration: 100 }),
          withTiming(5, { duration: 100 }),
          withTiming(-5, { duration: 100 }),
          withTiming(0, { duration: 150 }),
        );
        bounceScale.value = withSequence(
          withSpring(1.2, { damping: 5, stiffness: 250 }),
          withSpring(1.0, { damping: 10, stiffness: 120 }),
        );
        runOnJS(triggerEmoji)();
        break;

      case 'celebrating':
        // Full celebration: continuous bounce
        bounceY.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 300 }),
            withTiming(0, { duration: 300 }),
          ),
          4,
          false,
        );
        bounceScale.value = withSequence(
          withSpring(1.2, { damping: 5, stiffness: 200 }),
          withSpring(1.0, { damping: 8, stiffness: 120 }),
        );
        runOnJS(triggerEmoji)();
        break;

      default:
        // Idle: gentle breathing
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

  // Determine glow based on combo
  const showGlow = comboCount >= 3;

  return (
    <View style={styles.container}>
      {/* Floating emoji reaction */}
      <Animated.View style={[styles.emojiContainer, emojiStyle]}>
        <Text style={styles.emoji}>
          {REACTION_EMOJIS[reaction] ?? ''}
        </Text>
      </Animated.View>

      {/* Cat avatar */}
      <Animated.View style={buddyStyle}>
        <CatAvatar
          catId={catId}
          size="small"
          showGlow={showGlow}
          showTooltipOnTap={false}
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

/**
 * XP Transition Overlay
 * Full-screen gamification celebration after exercise completion.
 * Plays a ~4s dopamine sequence: score reveal → stars → rewards → cat reaction.
 * Auto-transitions to PostExerciseScreen when done (or on tap to skip).
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import Reanimated, {
  FadeIn,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CatAvatar } from '../Mascot/CatAvatar';
import { ConfettiEffect } from './ConfettiEffect';
import { soundManager } from '../../audio/SoundManager';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCatEvolutionStore } from '../../stores/catEvolutionStore';
import { COLORS, SPACING, BORDER_RADIUS, RARITY } from '../../theme/tokens';
import type { ExerciseScore } from '../../core/exercises/types';
import type { ChestType } from '../../core/rewards/chestSystem';
import type { EvolutionStage } from '../../stores/types';

export interface XPTransitionOverlayProps {
  score: ExerciseScore;
  gemsEarned: number;
  chestType?: ChestType;
  chestGems?: number;
  tempoChange?: number;
  /** Cat evolution that just happened (if any) */
  evolutionData?: { catId: string; newStage: EvolutionStage } | null;
  /** Called when transition ends (auto or tap-to-skip) */
  onComplete: () => void;
  testID?: string;
}

/** Phase timing (cumulative ms from start) */
const PHASE = {
  start: 0,
  scoreReveal: 200,
  starsReveal: 1200,
  rewardsReveal: 2200,
  catReaction: 2800,
  done: 4000,
} as const;

export function XPTransitionOverlay({
  score,
  gemsEarned,
  chestType,
  chestGems: _chestGems = 0,
  tempoChange = 0,
  evolutionData: _evolutionData,
  onComplete,
  testID = 'xp-transition',
}: XPTransitionOverlayProps): React.ReactElement {
  const [phase, setPhase] = useState<'score' | 'stars' | 'rewards' | 'cat' | 'done'>('score');
  const [displayScore, setDisplayScore] = useState(0);

  // Cat state
  const selectedCatId = useSettingsStore((s) => s.selectedCatId) ?? 'mini-meowww';
  const evolutionStage = useCatEvolutionStore(
    (s) => s.evolutionData[selectedCatId]?.currentStage ?? 'baby'
  );

  // Animated score counter
  const scoreAnim = useRef(new Animated.Value(0)).current;

  // Star animations (Reanimated shared values)
  const star1Scale = useSharedValue(0);
  const star2Scale = useSharedValue(0);
  const star3Scale = useSharedValue(0);

  // Overlay opacity for exit
  const overlayOpacity = useSharedValue(1);

  // Use refs to avoid stale closures in timers/worklets
  const exitedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Result display
  const resultDisplay = useMemo(() => {
    if (score.stars === 3) return { text: 'OUTSTANDING!', color: COLORS.starGold };
    if (score.stars === 2) return { text: 'GREAT JOB!', color: '#C0C0C0' };
    if (score.stars === 1) return { text: 'GOOD EFFORT!', color: '#CD7F32' };
    if (score.isPassed) return { text: 'KEEP GOING!', color: COLORS.success };
    return { text: 'TRY AGAIN!', color: COLORS.error };
  }, [score.stars, score.isPassed]);

  const scoreColor = useMemo(() => {
    if (score.overall >= 95) return COLORS.starGold;
    if (score.overall >= 80) return COLORS.success;
    if (score.overall >= 60) return COLORS.warning;
    return COLORS.error;
  }, [score.overall]);

  // Fire onComplete via ref (always calls latest version, safe from stale closures)
  const fireOnComplete = useCallback(() => {
    onCompleteRef.current();
  }, []);

  // Exit handler — fade out then call onComplete
  const handleExit = useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    setPhase('done');
    overlayOpacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(fireOnComplete)();
    });
  }, [overlayOpacity, fireOnComplete]);

  // Main animation sequence
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Score counter animation
    const scoreListener = scoreAnim.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });

    Animated.timing(scoreAnim, {
      toValue: score.overall,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      delay: PHASE.scoreReveal,
      useNativeDriver: false,
    }).start();

    // Sound: exercise_complete
    timers.push(setTimeout(() => {
      soundManager.play('exercise_complete');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }, PHASE.scoreReveal));

    // Stars phase
    timers.push(setTimeout(() => {
      setPhase('stars');
      if (score.stars >= 1) {
        star1Scale.value = withSpring(1, { damping: 8, stiffness: 200 });
        soundManager.play('star_earn');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      if (score.stars >= 2) {
        setTimeout(() => {
          star2Scale.value = withSpring(1, { damping: 8, stiffness: 200 });
          soundManager.play('star_earn');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }, 250);
      }
      if (score.stars >= 3) {
        setTimeout(() => {
          star3Scale.value = withSpring(1, { damping: 8, stiffness: 200 });
          soundManager.play('star_earn');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        }, 500);
      }
    }, PHASE.starsReveal));

    // Rewards phase
    timers.push(setTimeout(() => {
      setPhase('rewards');
      if (gemsEarned > 0) {
        soundManager.play('gem_clink');
      }
      if (chestType && chestType !== 'none') {
        soundManager.play('chest_open');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }
    }, PHASE.rewardsReveal));

    // Cat reaction phase
    timers.push(setTimeout(() => {
      setPhase('cat');
    }, PHASE.catReaction));

    // Auto-transition
    timers.push(setTimeout(() => {
      handleExit();
    }, PHASE.done));

    return () => {
      scoreAnim.removeListener(scoreListener);
      for (const t of timers) clearTimeout(t);
    };
  }, [handleExit]); // handleExit is stable (ref-based guard)

  // Star animated styles
  const star1Style = useAnimatedStyle(() => ({
    transform: [{ scale: star1Scale.value }],
    opacity: star1Scale.value,
  }));
  const star2Style = useAnimatedStyle(() => ({
    transform: [{ scale: star2Scale.value }],
    opacity: star2Scale.value,
  }));
  const star3Style = useAnimatedStyle(() => ({
    transform: [{ scale: star3Scale.value }],
    opacity: star3Scale.value,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const showStars = phase !== 'score';
  const showRewards = phase === 'rewards' || phase === 'cat' || phase === 'done';
  const showCat = phase === 'cat' || phase === 'done';

  return (
    <Reanimated.View style={[styles.overlay, overlayStyle]} testID={testID}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleExit} />

      {/* Confetti for 3-star scores */}
      {score.stars === 3 && showStars && <ConfettiEffect />}

      <View style={styles.content} pointerEvents="none">
        {/* Result text */}
        <Reanimated.View entering={FadeInUp.delay(100).duration(400).springify()}>
          <Text style={[styles.resultText, { color: resultDisplay.color }]}>
            {resultDisplay.text}
          </Text>
        </Reanimated.View>

        {/* Score circle */}
        <Reanimated.View entering={ZoomIn.delay(200).duration(400).springify()}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>{displayScore}</Text>
            <Text style={[styles.scorePercent, { color: scoreColor }]}>%</Text>
          </View>
        </Reanimated.View>

        {/* Stars */}
        {showStars && (
          <View style={styles.starsRow}>
            <Reanimated.View style={star1Style}>
              <MaterialCommunityIcons
                name={score.stars >= 1 ? 'star' : 'star-outline'}
                size={52}
                color={score.stars >= 1 ? COLORS.starGold : COLORS.starEmpty}
              />
            </Reanimated.View>
            <Reanimated.View style={star2Style}>
              <MaterialCommunityIcons
                name={score.stars >= 2 ? 'star' : 'star-outline'}
                size={52}
                color={score.stars >= 2 ? COLORS.starGold : COLORS.starEmpty}
              />
            </Reanimated.View>
            <Reanimated.View style={star3Style}>
              <MaterialCommunityIcons
                name={score.stars >= 3 ? 'star' : 'star-outline'}
                size={52}
                color={score.stars >= 3 ? COLORS.starGold : COLORS.starEmpty}
              />
            </Reanimated.View>
          </View>
        )}

        {/* Rewards row: XP + Gems + Chest */}
        {showRewards && (
          <Reanimated.View entering={FadeInUp.duration(300)} style={styles.rewardsRow}>
            {score.xpEarned > 0 && (
              <View style={styles.rewardBadge}>
                <MaterialCommunityIcons name="lightning-bolt" size={22} color={COLORS.starGold} />
                <Text style={styles.rewardText}>+{score.xpEarned} XP</Text>
              </View>
            )}
            {gemsEarned > 0 && (
              <View style={styles.rewardBadge}>
                <MaterialCommunityIcons name="diamond-stone" size={22} color={COLORS.gemGold} />
                <Text style={styles.rewardText}>+{gemsEarned}</Text>
              </View>
            )}
            {chestType && chestType !== 'none' && (
              <View style={[styles.rewardBadge, { borderColor: RARITY[chestType].borderColor }]}>
                <MaterialCommunityIcons name="treasure-chest" size={22} color={RARITY[chestType].borderColor} />
                <Text style={[styles.rewardText, { color: RARITY[chestType].borderColor }]}>
                  {RARITY[chestType].label}
                </Text>
              </View>
            )}
          </Reanimated.View>
        )}

        {/* New record banner */}
        {showRewards && score.isNewHighScore && (
          <Reanimated.View entering={FadeInUp.delay(200).duration(300).springify()} style={styles.newRecordRow}>
            <MaterialCommunityIcons name="trophy" size={20} color={COLORS.starGold} />
            <Text style={styles.newRecordText}>NEW RECORD!</Text>
            <MaterialCommunityIcons name="trophy" size={20} color={COLORS.starGold} />
          </Reanimated.View>
        )}

        {/* Tempo change indicator */}
        {showRewards && tempoChange !== 0 && (
          <Reanimated.View entering={FadeIn.duration(200)} style={styles.tempoRow}>
            <MaterialCommunityIcons
              name={tempoChange > 0 ? 'chevron-double-up' : 'chevron-double-down'}
              size={16}
              color={tempoChange > 0 ? COLORS.success : COLORS.warning}
            />
            <Text style={[styles.tempoText, { color: tempoChange > 0 ? COLORS.success : COLORS.warning }]}>
              Tempo {tempoChange > 0 ? '+' : ''}{tempoChange} BPM
            </Text>
          </Reanimated.View>
        )}

        {/* Cat celebration */}
        {showCat && (
          <Reanimated.View entering={ZoomIn.duration(400).springify()} style={styles.catSection}>
            <CatAvatar
              catId={selectedCatId}
              size="large"
              pose={score.overall >= 95 ? 'celebrate' : score.overall >= 80 ? 'play' : 'curious'}
              evolutionStage={evolutionStage}
              skipEntryAnimation
            />
          </Reanimated.View>
        )}

        {/* Tap to continue hint */}
        <Reanimated.View entering={FadeIn.delay(2500).duration(400)}>
          <Text style={styles.tapHint}>Tap to continue</Text>
        </Reanimated.View>
      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    zIndex: 2000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  resultText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD700',
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  scoreNumber: {
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 48,
  },
  scorePercent: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: -4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  rewardText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  newRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newRecordText: {
    color: COLORS.starGold,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tempoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tempoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  catSection: {
    marginTop: SPACING.sm,
  },
  tapHint: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
    marginTop: SPACING.md,
  },
});

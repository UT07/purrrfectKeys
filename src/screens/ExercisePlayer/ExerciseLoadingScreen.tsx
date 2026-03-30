/**
 * ExerciseLoadingScreen (Unified Pre-Exercise Screen)
 *
 * Bug #100 fix: Single unified screen for both AI and static exercises.
 *
 * Phase 1 (Loading): Salsa coach with a fun fact or practice tip.
 *   Shown while AI exercises generate, or for a brief 1s for static exercises.
 *   TTS speaks the tip; pulsing dots indicate loading.
 *
 * Phase 2 (Intro): Exercise info card with title, tempo, key, hand, notes.
 *   User taps "Let's Go!" to dismiss and begin the exercise.
 *   Optional "Watch First" button for demo playback.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { SalsaCoach } from '../../components/Mascot/SalsaCoach';
import { FunFactCard } from '../../components/FunFact/FunFactCard';
import { PressableScale } from '../../components/common/PressableScale';
import { getRandomFact } from '../../content/funFactSelector';
import { getRandomLoadingTip } from '../../content/loadingTips';
import { ttsService } from '../../services/tts/TTSService';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, glowColor } from '../../theme/tokens';
import type { Exercise } from '../../core/exercises/types';

const MIN_DISPLAY_MS = 1000;
const MAX_SPEECH_WAIT_MS = 15000;

export interface ExerciseLoadingScreenProps {
  visible: boolean;
  exerciseReady: boolean;
  /** The loaded exercise — shown in Phase 2 intro. Null during Phase 1. */
  exercise?: Exercise | null;
  /** Called when user taps "Let's Go!" */
  onReady: () => void;
  /** Optional "Watch First" callback for demo playback */
  onWatchFirst?: () => void;
  /** Skill target label shown in intro */
  skillTarget?: string;
}

export function ExerciseLoadingScreen({
  visible,
  exerciseReady,
  exercise,
  onReady,
  onWatchFirst,
  skillTarget,
}: ExerciseLoadingScreenProps): React.ReactElement | null {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [speechDone, setSpeechDone] = useState(false);
  // Phase 2: show exercise info once loading + speech are done
  const [showIntro, setShowIntro] = useState(false);

  // Decide once on mount whether to show a fun fact or a loading tip (50/50)
  const showFunFact = useMemo(() => Math.random() < 0.5, []);
  const funFact = useMemo(() => (showFunFact ? getRandomFact() : null), [showFunFact]);
  const loadingTip = useMemo(() => (showFunFact ? '' : getRandomLoadingTip()), [showFunFact]);

  // TTS
  const hasSpokenRef = useRef(false);
  const spokenText = showFunFact ? funFact?.text : loadingTip;
  useEffect(() => {
    if (!spokenText || hasSpokenRef.current) return;
    hasSpokenRef.current = true;
    const timer = setTimeout(() => {
      ttsService.speak(spokenText, {
        catId: 'salsa',
        onDone: () => setSpeechDone(true),
        onStopped: () => setSpeechDone(true),
        onError: () => setSpeechDone(true),
      });
    }, 600);
    return () => {
      clearTimeout(timer);
      ttsService.stop();
    };
  }, [spokenText]);

  useEffect(() => {
    if (!spokenText) setSpeechDone(true);
  }, [spokenText]);

  // Safety cap
  useEffect(() => {
    const timer = setTimeout(() => setSpeechDone(true), MAX_SPEECH_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Minimum display timer
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Transition from Phase 1 → Phase 2 when loading + speech are done
  useEffect(() => {
    if (minTimeElapsed && exerciseReady && speechDone && !showIntro) {
      setShowIntro(true);
    }
  }, [minTimeElapsed, exerciseReady, speechDone, showIntro]);

  if (!visible) return null;

  // Phase 2: Exercise intro
  if (showIntro && exercise) {
    const { title, description, difficulty } = exercise.metadata;
    const { tempo, keySignature, timeSignature } = exercise.settings;
    const difficultyStars = '\u2605'.repeat(difficulty) + '\u2606'.repeat(5 - difficulty);
    const hasLeft = exercise.notes.some(n => n.hand === 'left');
    const hasRight = exercise.notes.some(n => n.hand === 'right');
    const hand = hasLeft && hasRight ? 'Both' : hasLeft ? 'Left' : hasRight ? 'Right' : 'Both';
    const noteCount = exercise.notes.length;

    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.overlay}
        testID="exercise-intro-screen"
      >
        <Animated.View entering={FadeIn.duration(250)} style={styles.introCard}>
          <Text style={styles.introTitle}>{title}</Text>

          {skillTarget && (
            <View style={styles.skillBadge}>
              <Text style={styles.skillBadgeText}>{skillTarget}</Text>
            </View>
          )}

          {description ? <Text style={styles.introDescription}>{description}</Text> : null}

          <View style={styles.infoGrid}>
            <InfoChip label="Tempo" value={`${tempo}`} />
            <InfoChip label="Key" value={keySignature} />
            <InfoChip label="Time" value={`${timeSignature[0]}/${timeSignature[1]}`} />
            <InfoChip label="Hand" value={hand} />
          </View>

          <View style={styles.statsRow}>
            <Text style={styles.statText}>{noteCount} notes</Text>
            <Text style={styles.statText}>{difficultyStars}</Text>
          </View>

          <View style={styles.buttonRow}>
            {onWatchFirst && (
              <PressableScale
                style={styles.watchButton}
                onPress={onWatchFirst}
                testID="intro-watch"
              >
                <Text style={styles.watchButtonText}>Watch First</Text>
              </PressableScale>
            )}
            <PressableScale
              style={[styles.goButton, onWatchFirst && { flex: 1 }]}
              onPress={onReady}
              testID="intro-ready"
            >
              <Text style={styles.goButtonText}>Let's Go!</Text>
            </PressableScale>
          </View>
        </Animated.View>
      </Animated.View>
    );
  }

  // Phase 1: Loading with Salsa tip
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
      testID="exercise-loading-screen"
    >
      <View style={styles.content}>
        <SalsaCoach size="large" mood="teaching" showCatchphrase speakCatchphrase={false} />

        <View style={styles.tipContainer}>
          {showFunFact && funFact ? (
            <FunFactCard fact={funFact} animationDelay={400} compact />
          ) : (
            <View style={styles.tipCard} testID="loading-tip">
              <Text style={styles.tipLabel}>Salsa's Tip</Text>
              <Text style={styles.tipText}>{loadingTip}</Text>
            </View>
          )}
        </View>

        <Text style={styles.subtitle}>Preparing your exercise...</Text>

        <View style={styles.dotsRow}>
          <PulsingDot delay={0} />
          <PulsingDot delay={200} />
          <PulsingDot delay={400} />
        </View>
      </View>
    </Animated.View>
  );
}

function InfoChip({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.infoChip}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PulsingDot({ delay }: { delay: number }): React.ReactElement {
  const [opacity, setOpacity] = useState(0.3);

  useEffect(() => {
    let mounted = true;
    const interval = setInterval(() => {
      if (mounted) setOpacity((prev) => (prev === 0.3 ? 1 : 0.3));
    }, 600);
    const timeout = setTimeout(() => {
      if (mounted) setOpacity(1);
    }, delay);
    return () => {
      mounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [delay]);

  return <View style={[styles.dot, { opacity }]} />;
}

ExerciseLoadingScreen.displayName = 'ExerciseLoadingScreen';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
    maxWidth: 360,
    width: '100%',
  },
  tipContainer: {
    width: '100%',
  },
  tipCard: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.xs,
  },
  tipLabel: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tipText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
  },
  subtitle: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
  },

  // Phase 2 — Intro card
  introCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginHorizontal: SPACING.lg,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  skillBadge: {
    backgroundColor: glowColor(COLORS.primary, 0.12),
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    marginBottom: SPACING.sm,
  },
  skillBadgeText: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.primary,
    fontWeight: '600',
  },
  introDescription: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoChip: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  infoLabel: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statText: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  watchButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  watchButtonText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  goButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  goButtonText: {
    ...TYPOGRAPHY.body.md,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

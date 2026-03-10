/**
 * SalsaIntro — Pre-exercise intro overlay
 *
 * Salsa the cat coach introduces the upcoming exercise with three
 * adaptive tiers based on the student's history:
 *
 *   Tier 1 (Brief, 5-8s)      — Returning to familiar exercise (score >= 70%)
 *   Tier 2 (Walkthrough, 15-20s) — First attempt or new skill
 *   Tier 3 (Extended, 20-30s)    — 3+ consecutive fails
 *
 * TTS voices the intro text. Auto-dismisses for tier 1; manual dismiss
 * for tiers 2-3 via "Let's go!" button (or skip at any point).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { ttsService } from '../../services/tts/TTSService';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
} from '../../theme/tokens';

// ─── Tier-specific max durations ────────────────────────
const TIER_1_MAX_MS = 8000;

// ─── Props ──────────────────────────────────────────────

export interface SalsaIntroProps {
  /** 1 = brief, 2 = walkthrough, 3 = extended */
  tier: 1 | 2 | 3;
  /** Main intro text spoken by Salsa */
  introText: string;
  /** Short tip shown below the intro */
  tip: string;
  /** Called when intro is done, exercise should start */
  onDismiss: () => void;
  /** Called when user taps "Watch demo" (tier 3 only) */
  onRequestDemo?: () => void;
}

export function SalsaIntro({
  tier,
  introText,
  tip,
  onDismiss,
  onRequestDemo,
}: SalsaIntroProps): React.ReactElement {
  const [ttsDone, setTtsDone] = useState(false);
  const dismissedRef = useRef(false);

  // Prevent double-dismiss
  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    ttsService.stop();
    onDismiss();
  }, [onDismiss]);

  // Speak the intro text via TTS
  useEffect(() => {
    if (!introText.trim()) {
      setTtsDone(true);
      return;
    }

    ttsService.speak(introText, {
      catId: 'salsa',
      onDone: () => setTtsDone(true),
      onStopped: () => setTtsDone(true),
      onError: () => setTtsDone(true),
    });

    return () => {
      ttsService.stop();
    };
  }, [introText]);

  // Tier 1 auto-dismiss: after TTS finishes OR max timer
  useEffect(() => {
    if (tier !== 1) return;

    // Auto-dismiss once TTS is done
    if (ttsDone) {
      handleDismiss();
      return;
    }

    // Safety cap
    const timer = setTimeout(() => handleDismiss(), TIER_1_MAX_MS);
    return () => clearTimeout(timer);
  }, [tier, ttsDone, handleDismiss]);

  // ─── Tier 1: Brief bubble at bottom-left ────────────

  if (tier === 1) {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.tier1Container}
        testID="salsa-intro-tier1"
      >
        <View style={styles.tier1Pill}>
          <Text style={styles.salsaLabel}>Salsa</Text>
          <Text style={styles.tier1Text}>{introText}</Text>
        </View>
        <Pressable
          onPress={handleDismiss}
          style={styles.skipButtonSmall}
          testID="skip-button"
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </Animated.View>
    );
  }

  // ─── Tier 2 & 3: Full overlay with centered card ────

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={styles.overlay}
      testID={`salsa-intro-tier${tier}`}
    >
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={styles.card}
      >
        {/* Salsa label */}
        <View style={styles.salsaRow}>
          <Text style={styles.salsaAvatar}>🐱</Text>
          <Text style={styles.salsaName}>Salsa</Text>
        </View>

        {/* Intro text */}
        <Text style={styles.introText}>{introText}</Text>

        {/* Tip */}
        {tip.trim().length > 0 && (
          <View style={styles.tipContainer}>
            <Text style={styles.tipLabel}>Tip</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          {/* Tier 3: Demo button */}
          {tier === 3 && onRequestDemo && (
            <Pressable
              onPress={() => {
                ttsService.stop();
                onRequestDemo();
              }}
              style={styles.demoButton}
              testID="demo-button"
            >
              <Text style={styles.demoButtonText}>Watch demo first</Text>
            </Pressable>
          )}

          {/* Ready / Let's go */}
          <Pressable
            onPress={handleDismiss}
            style={styles.goButton}
            testID="go-button"
          >
            <Text style={styles.goButtonText}>Let&apos;s go!</Text>
          </Pressable>
        </View>

        {/* Skip always visible */}
        <Pressable
          onPress={handleDismiss}
          style={styles.skipButton}
          testID="skip-button"
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

SalsaIntro.displayName = 'SalsaIntro';

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  // ─ Tier 1: Brief bubble ──────────────
  tier1Container: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tier1Pill: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.md,
  },
  tier1Text: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textPrimary,
  },

  // ─ Tier 2 & 3: Full overlay ──────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: SPACING.md,
    ...SHADOWS.lg,
  },

  // ─ Salsa header ──────────────────────
  salsaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  salsaAvatar: {
    fontSize: 28,
  },
  salsaName: {
    ...TYPOGRAPHY.heading.md,
    color: COLORS.textPrimary,
  },
  salsaLabel: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },

  // ─ Intro text ────────────────────────
  introText: {
    ...TYPOGRAPHY.body.lg,
    color: COLORS.textPrimary,
  },

  // ─ Tip ───────────────────────────────
  tipContainer: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    gap: 2,
  },
  tipLabel: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  tipText: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  // ─ Buttons ───────────────────────────
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  goButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goButtonText: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.textPrimary,
  },
  demoButton: {
    flex: 1,
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  demoButtonText: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.textSecondary,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  skipButtonSmall: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  skipText: {
    ...TYPOGRAPHY.button.sm,
    color: COLORS.textMuted,
  },
});

/**
 * SalsaCoach — Dedicated coach character component.
 *
 * Renders Salsa (the grey cat with green eyes — your coach) with:
 * - Context-aware mood (time of day, user progress)
 * - Optional speech bubble with catchphrase
 * - Larger default size than CatAvatar (100px vs 72px)
 * - Teaching pose animation
 *
 * This is NOT a selectable player cat — Salsa is the NPC coach
 * who appears on every screen providing guidance.
 */

import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SALSA_COACH } from './catCharacters';
import { KeysieSvg } from './KeysieSvg';
import type { MascotMood } from './types';
import { COLORS, SPACING, BORDER_RADIUS } from '@/theme/tokens';

/** Salsa's accent color, hardcoded to avoid StyleSheet.create referencing SALSA_COACH at import time */
const SALSA_ACCENT = '#FF5252';

type SalsaSize = 'tiny' | 'small' | 'medium' | 'large';

const SIZE_MAP: Record<SalsaSize, number> = {
  tiny: 28,
  small: 48,
  medium: 72,
  large: 100,
};

interface SalsaCoachProps {
  /** Override mood. Auto-detects from time of day if not provided. */
  mood?: MascotMood;
  size?: SalsaSize;
  /** Show a random catchphrase speech bubble */
  showCatchphrase?: boolean;
  /** Override the catchphrase text */
  catchphrase?: string;
}

/** Pick a Salsa mood based on time of day */
function getTimeMood(): MascotMood {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'teaching';
  if (hour >= 12 && hour < 17) return 'encouraging';
  if (hour >= 17 && hour < 21) return 'happy';
  return 'happy'; // night — relaxed
}

/** Pick a random catchphrase from Salsa's list */
function getRandomCatchphrase(): string {
  const phrases = SALSA_COACH.catchphrases;
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export function SalsaCoach({
  mood,
  size = 'medium',
  showCatchphrase = false,
  catchphrase,
}: SalsaCoachProps): ReactElement {
  const effectiveMood = mood ?? getTimeMood();
  const dimension = SIZE_MAP[size];
  const phrase = useMemo(
    () => catchphrase ?? getRandomCatchphrase(),
    [catchphrase],
  );

  return (
    <View style={styles.container} testID="salsa-coach">
      <View
        style={[
          styles.avatar,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            borderColor: SALSA_COACH.color + '60',
            backgroundColor: SALSA_COACH.color + '18',
          },
        ]}
      >
        <KeysieSvg
          mood={effectiveMood}
          size="medium"
          pixelSize={Math.round(dimension * 0.75)}
          accentColor={SALSA_COACH.color}
          visuals={SALSA_COACH.visuals}
          catId="salsa"
        />
      </View>

      {showCatchphrase && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.bubble}
        >
          <View style={styles.bubblePointer} />
          <View style={styles.bubbleContent}>
            <Text style={styles.bubbleText}>{phrase}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bubblePointer: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderRightWidth: 7,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: COLORS.cardSurface,
  },
  bubbleContent: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    flex: 1,
    borderWidth: 1,
    borderColor: SALSA_ACCENT + '30',
  },
  bubbleText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});

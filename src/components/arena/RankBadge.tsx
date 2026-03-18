/**
 * RankBadge — Reusable ranked tier badge component
 *
 * Renders a shield-shaped circle with tier color background and tier initial.
 * Three sizes: sm (24px), md (40px), lg (64px).
 * Division shown as small roman numeral below for md/lg sizes.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { RankedTier } from '../../stores/types';

// ---------------------------------------------------------------------------
// Constants — exported for reuse across screens
// ---------------------------------------------------------------------------

export const TIER_COLORS: Record<RankedTier, string> = {
  novice: '#8B8B8B',
  apprentice: '#CD7F32',
  performer: '#C0C0C0',
  virtuoso: '#FFD700',
  maestro: '#00BCD4',
  prodigy: '#9C27B0',
  luminary: '#FF6B35',
  legend: '#DC143C',
  grandmaster: '#FFD700',
} as const;

export const TIER_DISPLAY_NAMES: Record<RankedTier, string> = {
  novice: 'Novice',
  apprentice: 'Apprentice',
  performer: 'Performer',
  virtuoso: 'Virtuoso',
  maestro: 'Maestro',
  prodigy: 'Prodigy',
  luminary: 'Luminary',
  legend: 'Legend',
  grandmaster: 'Grandmaster',
} as const;

/** Short initial letter for each tier (used inside the badge circle) */
const TIER_INITIALS: Record<RankedTier, string> = {
  novice: 'N',
  apprentice: 'A',
  performer: 'P',
  virtuoso: 'V',
  maestro: 'M',
  prodigy: 'P',
  luminary: 'L',
  legend: 'L',
  grandmaster: 'G',
} as const;

const DIVISION_ROMAN: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
};

// ---------------------------------------------------------------------------
// Size configs
// ---------------------------------------------------------------------------

interface SizeConfig {
  container: number;
  fontSize: number;
  divisionFontSize: number;
  borderWidth: number;
}

const SIZE_CONFIGS: Record<'sm' | 'md' | 'lg', SizeConfig> = {
  sm: { container: 24, fontSize: 12, divisionFontSize: 0, borderWidth: 1.5 },
  md: { container: 40, fontSize: 18, divisionFontSize: 9, borderWidth: 2 },
  lg: { container: 64, fontSize: 28, divisionFontSize: 12, borderWidth: 2.5 },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RankBadgeProps {
  tier: RankedTier;
  division?: 1 | 2 | 3;
  size?: 'sm' | 'md' | 'lg';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RankBadge({ tier, division, size = 'md' }: RankBadgeProps): React.JSX.Element {
  const config = SIZE_CONFIGS[size];
  const color = TIER_COLORS[tier] ?? TIER_COLORS.novice;
  const initial = TIER_INITIALS[tier];
  const isGrandmaster = tier === 'grandmaster';
  const showDivision = division != null && size !== 'sm';

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.badge,
          {
            width: config.container,
            height: config.container,
            borderRadius: config.container / 2,
            backgroundColor: `${color}22`,
            borderWidth: config.borderWidth,
            borderColor: color,
          },
          isGrandmaster && {
            borderColor: '#FFD700',
            ...Platform.select({
              ios: {
                shadowColor: '#FFD700',
                shadowOpacity: 0.6,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 0 },
              },
              android: { elevation: 6 },
              default: {},
            }),
          },
        ]}
      >
        <Text
          style={[
            styles.initial,
            {
              fontSize: config.fontSize,
              color,
            },
            isGrandmaster && styles.grandmasterText,
          ]}
        >
          {initial}
        </Text>
      </View>

      {showDivision && division != null && (
        <Text
          style={[
            styles.division,
            {
              fontSize: config.divisionFontSize,
              color,
            },
          ]}
        >
          {DIVISION_ROMAN[division] ?? ''}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontWeight: '800',
    textAlign: 'center',
  },
  grandmasterText: {
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  division: {
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
});

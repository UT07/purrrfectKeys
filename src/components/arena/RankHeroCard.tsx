/**
 * RankHeroCard — Arena hero card showing player rank, MMR, and division
 *
 * Compact hero element at the top of the Arena screen. Shows:
 * - Tier icon with colored glow
 * - Tier name + division
 * - MMR value + RP progress bar toward next tier
 * - Promotion series pips (when active)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRankStore } from '../../stores/rankStore';
import { LEAGUE_TIER_CONFIG } from '../../theme/leagueTiers';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, ARENA, glowColor } from '../../theme/tokens';
import { getRankConfig } from '../../core/ranking/rankThresholds';

export function RankHeroCard(): React.JSX.Element {
  const rating = useRankStore((s) => s.rating);
  const config = LEAGUE_TIER_CONFIG[rating.tier];

  // Progress toward next tier (0-1)
  const progress = useMemo(() => {
    const rankConfig = getRankConfig(rating.tier);
    if (rankConfig.tier === 'grandmaster') return 1;
    const range = rankConfig.mmrCeiling - rankConfig.mmrFloor + 1;
    return Math.min(1, Math.max(0, (rating.mmr - rankConfig.mmrFloor) / range));
  }, [rating.mmr, rating.tier]);

  const divisionLabel = rating.tier === 'grandmaster'
    ? ''
    : ` ${['', 'I', 'II', 'III', 'IV'][rating.division] ?? ''}`;

  return (
    <View
      style={[
        styles.container,
        { borderColor: config.color },
        Platform.OS === 'ios' && {
          shadowColor: config.color,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
      accessibilityLabel={`Your rank: ${config.label}${divisionLabel}, ${rating.mmr} MMR`}
    >
      {/* Tier icon */}
      <View style={[styles.tierCircle, { backgroundColor: glowColor(config.color, 0.15) }]}>
        <MaterialCommunityIcons
          name={config.icon as any}
          size={36}
          color={config.color}
        />
      </View>

      {/* Rank info */}
      <View style={styles.infoColumn}>
        <Text style={[styles.tierName, { color: config.color }]}>
          {config.label}{divisionLabel}
        </Text>
        <View style={styles.mmrRow}>
          <Text style={styles.mmrValue}>{rating.mmr}</Text>
          <Text style={styles.mmrLabel}> MMR</Text>
          <Text style={styles.rpText}>  {rating.rp} RP</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: config.color },
            ]}
          />
        </View>

        {/* Promotion series pips (best of 3) */}
        {rating.promotionSeries?.active && (
          <View style={styles.promoRow}>
            <Text style={styles.promoLabel}>Promo</Text>
            {Array.from({ length: 3 }, (_, i) => {
              const isWin = i < rating.promotionSeries!.wins;
              const isLoss = i >= 3 - rating.promotionSeries!.losses;
              return (
                <View
                  key={i}
                  style={[
                    styles.promoPip,
                    isWin && styles.promoPipWin,
                    isLoss && styles.promoPipLoss,
                    !isWin && !isLoss && styles.promoPipPending,
                  ]}
                />
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ARENA.cardBackground,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  tierCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoColumn: {
    flex: 1,
  },
  tierName: {
    ...TYPOGRAPHY.heading.lg,
  },
  mmrRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  mmrValue: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
  },
  mmrLabel: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
  },
  rpText: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textMuted,
  },
  progressTrack: {
    height: 4,
    backgroundColor: ARENA.cardBorder,
    borderRadius: 2,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  promoLabel: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: SPACING.xs,
  },
  promoPip: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.textMuted,
  },
  promoPipWin: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  promoPipLoss: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  promoPipPending: {
    backgroundColor: 'transparent',
    borderColor: COLORS.textMuted,
  },
});

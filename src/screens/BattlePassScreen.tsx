/**
 * BattlePassScreen - Battle pass tier progression
 *
 * Shows a vertically scrolling list of 30 battle pass tiers with:
 * - Header: back arrow + "Battle Pass" title + Season badge
 * - XP progress bar toward next tier
 * - Tier cards with free (grey) and premium (gold) reward tracks
 * - Active tier glow, claimed checkmarks, locked dimming
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSeasonStore } from '../stores/seasonStore';
import { generateBattlePassTiers, cumulativeXpForTier } from '../core/ranking/seasonConfig';
import type { BattlePassReward } from '../core/ranking/seasonConfig';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, ARENA, glowColor } from '../theme/tokens';
import { GradientMeshBackground } from '../components/effects';
import { PressableScale } from '../components/common/PressableScale';

// ---------------------------------------------------------------------------
// Reward type icon mapping
// ---------------------------------------------------------------------------

const REWARD_ICON: Record<BattlePassReward['type'], React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  gems: 'diamond-stone',
  accessory: 'tshirt-crew',
  title: 'crown',
  xp_boost: 'lightning-bolt',
};

const REWARD_ICON_COLOR: Record<BattlePassReward['type'], string> = {
  gems: COLORS.gemDiamond,
  accessory: '#CE93D8',
  title: COLORS.starGold,
  xp_boost: COLORS.warning,
};

// ---------------------------------------------------------------------------
// RewardSlot — single reward cell (free or premium)
// ---------------------------------------------------------------------------

function RewardSlot({
  reward,
  track,
  tier,
  isClaimed,
  isUnlocked,
}: {
  reward: BattlePassReward | null;
  track: 'free' | 'premium';
  tier: number;
  isClaimed: boolean;
  isUnlocked: boolean;
}) {
  const accentColor = track === 'free' ? ARENA.passFree : ARENA.passPremium;
  const canClaim = isUnlocked && !isClaimed && reward !== null;

  const handleClaim = useCallback(() => {
    if (!canClaim) return;
    useSeasonStore.getState().claimBattlePassReward(tier, track);
  }, [canClaim, tier, track]);

  // Empty slot — no reward at this tier for this track
  if (!reward) {
    return (
      <View
        style={[
          styles.rewardSlot,
          styles.rewardSlotEmpty,
          { borderColor: ARENA.cardBorder },
        ]}
        accessibilityLabel={`${track === 'free' ? 'Free' : 'Premium'} track tier ${tier}, no reward`}
      >
        <MaterialCommunityIcons name="minus" size={20} color={COLORS.textMuted} />
      </View>
    );
  }

  const iconName = REWARD_ICON[reward.type];
  const iconColor = isUnlocked ? REWARD_ICON_COLOR[reward.type] : ARENA.passLocked;

  return (
    <PressableScale
      onPress={handleClaim}
      disabled={!canClaim}
      style={[
        styles.rewardSlot,
        {
          borderColor: isClaimed ? COLORS.success : isUnlocked ? accentColor : ARENA.cardBorder,
          opacity: isUnlocked ? 1 : 0.45,
          backgroundColor: isClaimed
            ? glowColor(COLORS.success, 0.08)
            : glowColor(accentColor, 0.06),
        },
      ]}
      accessibilityLabel={`${track === 'free' ? 'Free' : 'Premium'} track tier ${tier}: ${reward.label}${isClaimed ? ', claimed' : isUnlocked ? ', tap to claim' : ', locked'}`}
      accessibilityRole="button"
    >
      {/* Track label */}
      <Text
        style={[
          styles.trackLabel,
          { color: accentColor },
        ]}
      >
        {track === 'free' ? 'FREE' : 'PREMIUM'}
      </Text>

      {/* Reward icon */}
      <View style={styles.rewardIconContainer}>
        <MaterialCommunityIcons name={iconName} size={28} color={iconColor} />
      </View>

      {/* Reward label */}
      <Text
        style={[
          styles.rewardLabel,
          { color: isUnlocked ? COLORS.textSecondary : COLORS.textMuted },
        ]}
        numberOfLines={2}
      >
        {reward.label}
      </Text>

      {/* Claimed checkmark overlay */}
      {isClaimed && (
        <View style={styles.claimedOverlay}>
          <View style={styles.claimedBadge}>
            <MaterialCommunityIcons name="check-bold" size={18} color={COLORS.textPrimary} />
          </View>
        </View>
      )}
    </PressableScale>
  );
}

// ---------------------------------------------------------------------------
// TierCard — one row showing tier number + free/premium reward slots
// ---------------------------------------------------------------------------

function TierCard({
  tier,
  freeReward,
  premiumReward,
  currentTier,
  claimedRewards,
}: {
  tier: number;
  freeReward: BattlePassReward | null;
  premiumReward: BattlePassReward | null;
  currentTier: number;
  claimedRewards: string[];
}) {
  const isActive = tier === currentTier;
  const isUnlocked = tier <= currentTier;
  const freeClaimed = claimedRewards.includes(`free-${tier}`);
  const premiumClaimed = claimedRewards.includes(`premium-${tier}`);

  return (
    <View
      style={[
        styles.tierCard,
        isActive && styles.tierCardActive,
        !isUnlocked && styles.tierCardLocked,
      ]}
      accessibilityLabel={`Tier ${tier}${isActive ? ', current tier' : isUnlocked ? ', unlocked' : ', locked'}`}
    >
      {/* Tier number circle */}
      <View
        style={[
          styles.tierCircle,
          {
            backgroundColor: isActive
              ? ARENA.seasonAccent
              : isUnlocked
                ? glowColor(ARENA.seasonAccent, 0.2)
                : glowColor(ARENA.passLocked, 0.15),
            borderColor: isActive
              ? ARENA.seasonAccent
              : isUnlocked
                ? glowColor(ARENA.seasonAccent, 0.4)
                : ARENA.passLocked,
          },
        ]}
      >
        <Text
          style={[
            styles.tierNumber,
            {
              color: isActive
                ? COLORS.textPrimary
                : isUnlocked
                  ? ARENA.seasonAccent
                  : ARENA.passLocked,
            },
          ]}
        >
          {tier}
        </Text>
      </View>

      {/* Reward slots */}
      <View style={styles.rewardRow}>
        <RewardSlot
          reward={freeReward}
          track="free"
          tier={tier}
          isClaimed={freeClaimed}
          isUnlocked={isUnlocked}
        />
        <View style={styles.rewardSpacer} />
        <RewardSlot
          reward={premiumReward}
          track="premium"
          tier={tier}
          isClaimed={premiumClaimed}
          isUnlocked={isUnlocked}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// XP Progress Bar
// ---------------------------------------------------------------------------

function XpProgressBar({
  currentXp,
  currentTier,
}: {
  currentXp: number;
  currentTier: number;
}) {
  const tierStart = currentTier > 0 ? cumulativeXpForTier(currentTier) : 0;
  const tierEnd = cumulativeXpForTier(currentTier + 1);
  const tierRange = tierEnd - tierStart;
  const progress = tierRange > 0 ? Math.min((currentXp - tierStart) / tierRange, 1) : 0;
  const xpRemaining = Math.max(tierEnd - currentXp, 0);

  return (
    <View style={styles.xpContainer}>
      <View style={styles.xpLabelRow}>
        <Text style={styles.xpLabel}>
          Tier {currentTier} {'\u2192'} {currentTier + 1}
        </Text>
        <Text style={styles.xpValue}>
          {xpRemaining} XP to next tier
        </Text>
      </View>
      <View style={styles.xpBarBackground}>
        <View
          style={[
            styles.xpBarFill,
            { width: `${Math.max(progress * 100, 2)}%` },
          ]}
        />
      </View>
      <Text style={styles.xpDetail}>
        {currentXp} / {tierEnd} XP
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// BattlePassScreen
// ---------------------------------------------------------------------------

export function BattlePassScreen(): React.JSX.Element {
  const navigation = useNavigation();

  const currentSeason = useSeasonStore((s) => s.currentSeason);
  const battlePassTier = useSeasonStore((s) => s.battlePassTier);
  const battlePassXp = useSeasonStore((s) => s.battlePassXp);
  const claimedRewards = useSeasonStore((s) => s.claimedRewards);

  const tiers = useMemo(() => generateBattlePassTiers(), []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.root}>
      <GradientMeshBackground accent="exercise" />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <PressableScale
            onPress={handleBack}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={12}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={COLORS.textPrimary}
            />
          </PressableScale>

          <Text style={styles.headerTitle}>Battle Pass</Text>

          <View style={styles.seasonBadge}>
            <MaterialCommunityIcons
              name="trophy-outline"
              size={14}
              color={ARENA.seasonAccent}
            />
            <Text style={styles.seasonBadgeText}>
              Season {currentSeason}
            </Text>
          </View>
        </View>

        {/* XP Progress */}
        <XpProgressBar currentXp={battlePassXp} currentTier={battlePassTier} />

        {/* Tier list */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {tiers.map((t) => (
            <TierCard
              key={t.tier}
              tier={t.tier}
              freeReward={t.freeReward}
              premiumReward={t.premiumReward}
              currentTier={battlePassTier}
              claimedRewards={claimedRewards}
            />
          ))}

          {/* Bottom spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 48,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: ARENA.cardBackground,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.heading.lg,
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: glowColor(ARENA.seasonAccent, 0.12),
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: glowColor(ARENA.seasonAccent, 0.3),
    minWidth: 44,
    justifyContent: 'center',
  },
  seasonBadgeText: {
    color: ARENA.seasonAccent,
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '700',
  },

  // XP Progress
  xpContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  xpLabel: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '600',
  },
  xpValue: {
    color: ARENA.seasonAccent,
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '700',
  },
  xpBarBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: ARENA.cardBorder,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: ARENA.seasonAccent,
  },
  xpDetail: {
    color: COLORS.textMuted,
    ...TYPOGRAPHY.caption.md,
    textAlign: 'right',
    marginTop: 2,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
  },
  bottomSpacer: {
    height: SPACING.xxl,
  },

  // Tier Card
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ARENA.cardBackground,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: ARENA.cardBorder,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tierCardActive: {
    borderColor: ARENA.seasonAccent,
    ...Platform.select({
      ios: {
        shadowColor: ARENA.seasonAccent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  tierCardLocked: {
    opacity: 0.5,
  },

  // Tier circle
  tierCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginRight: SPACING.sm,
  },
  tierNumber: {
    ...TYPOGRAPHY.button.md,
    fontWeight: '800',
  },

  // Reward row
  rewardRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardSpacer: {
    width: SPACING.sm,
  },

  // Reward slot
  rewardSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    minHeight: 80,
    position: 'relative',
    overflow: 'hidden',
  },
  rewardSlotEmpty: {
    borderStyle: 'dashed',
    minHeight: 80,
  },

  // Track label
  trackLabel: {
    ...TYPOGRAPHY.caption.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  // Reward icon
  rewardIconContainer: {
    marginVertical: SPACING.xs,
  },

  // Reward label
  rewardLabel: {
    ...TYPOGRAPHY.caption.md,
    textAlign: 'center',
  },

  // Claimed overlay
  claimedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: BORDER_RADIUS.sm,
  },
  claimedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

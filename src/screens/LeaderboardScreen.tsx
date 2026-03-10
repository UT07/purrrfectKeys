/**
 * LeaderboardScreen - Weekly league standings
 *
 * Shows league members sorted by weekly XP with:
 * - Header: league tier badge + week date range
 * - Standings FlatList: top 3 get medal icons, current user highlighted
 * - Promotion zone (top 10): green left border
 * - Demotion zone (bottom 5): red left border
 * - Pull-to-refresh: fetches latest standings from Firestore
 * - Footer: user's current rank summary
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useLeagueStore } from '../stores/leagueStore';
import type { LeagueStandingEntry } from '../stores/leagueStore';
import { useAuthStore } from '../stores/authStore';
import { getLeagueStandings } from '../services/firebase/leagueService';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS, glowColor, shadowGlow } from '../theme/tokens';
import { LEAGUE_TIER_CONFIG, PODIUM_MEDAL_COLORS, MEDAL_COLORS } from '../theme/leagueTiers';
import { GradientMeshBackground } from '../components/effects';
import { PressableScale } from '../components/common/PressableScale';
import { CatAvatar } from '../components/Mascot/CatAvatar';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Promotion: top 10 get green zone; demotion: bottom 5 get red zone
const PROMOTION_CUTOFF = 10;
const DEMOTION_FROM_BOTTOM = 5;

// ---------------------------------------------------------------------------
// Podium — Top 3 hero section with cat avatars
// ---------------------------------------------------------------------------

const PODIUM_HEIGHTS = [80, 120, 56]; // 2nd, 1st, 3rd pedestal heights (more dramatic #1)
const PODIUM_MEDAL_SIZES = { 1: 26, 2: 18, 3: 16 };
const PODIUM_CAT_SIZES = { 1: 76, 2: 56, 3: 56 };

function PodiumPedestal({
  entry,
  place,
  isCurrentUser,
}: {
  entry: LeagueStandingEntry | undefined;
  place: 1 | 2 | 3;
  isCurrentUser: boolean;
}) {
  if (!entry) return <View style={styles.podiumSlot} />;

  const height = PODIUM_HEIGHTS[place === 2 ? 0 : place === 1 ? 1 : 2];
  const catSize = PODIUM_CAT_SIZES[place];
  const medalColor = PODIUM_MEDAL_COLORS[place];

  return (
    <Animated.View
      entering={FadeInUp.delay(place === 1 ? 200 : place === 2 ? 100 : 300).duration(400)}
      style={styles.podiumSlot}
    >
      {/* Crown icon above #1 */}
      {place === 1 && (
        <MaterialCommunityIcons
          name="crown"
          size={32}
          color={COLORS.starGold}
          style={styles.podiumCrown}
        />
      )}

      {/* Cat avatar */}
      <View
        style={[
          styles.podiumAvatar,
          isCurrentUser && styles.podiumAvatarCurrent,
          place === 1 && styles.podiumAvatarFirst,
        ]}
      >
        <CatAvatar
          catId={entry.selectedCatId ?? 'salsa'}
          size={catSize > 60 ? 'medium' : 'small'}
          pose={place === 1 ? 'celebrate' : undefined}
          skipEntryAnimation
        />
      </View>

      {/* Medal with glow on #1 */}
      <View style={place === 1 ? styles.podiumMedalGlow : undefined}>
        <MaterialCommunityIcons
          name="medal"
          size={PODIUM_MEDAL_SIZES[place]}
          color={medalColor}
          style={styles.podiumMedal}
        />
      </View>

      {/* Name */}
      <Text
        style={[styles.podiumName, isCurrentUser && styles.podiumNameCurrent]}
        numberOfLines={1}
      >
        {entry.displayName}
      </Text>

      {/* XP */}
      <Text style={styles.podiumXp}>{entry.weeklyXp.toLocaleString()} XP</Text>

      {/* Pedestal block */}
      <LinearGradient
        colors={[glowColor(medalColor, 0.25), glowColor(medalColor, 0.08)]}
        style={[styles.podiumBlock, { height }]}
      >
        <Text style={[styles.podiumRank, { color: medalColor }]}>{place}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

function Podium({
  standings,
  currentUserUid,
}: {
  standings: LeagueStandingEntry[];
  currentUserUid: string;
}) {
  if (standings.length < 1) return null;

  const first = standings.find((s) => s.rank === 1);
  const second = standings.find((s) => s.rank === 2);
  const third = standings.find((s) => s.rank === 3);

  return (
    <View style={styles.podiumContainer}>
      <PodiumPedestal entry={second} place={2} isCurrentUser={second?.uid === currentUserUid} />
      <PodiumPedestal entry={first} place={1} isCurrentUser={first?.uid === currentUserUid} />
      <PodiumPedestal entry={third} place={3} isCurrentUser={third?.uid === currentUserUid} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Standings Row
// ---------------------------------------------------------------------------

function StandingsRow({
  entry,
  isCurrentUser,
  totalMembers,
}: {
  entry: LeagueStandingEntry;
  isCurrentUser: boolean;
  totalMembers: number;
}): React.JSX.Element {
  const isTopThree = entry.rank <= 3;
  const isPromotion = entry.rank <= PROMOTION_CUTOFF;
  const isDemotion = entry.rank > totalMembers - DEMOTION_FROM_BOTTOM;

  // Zone indicator (left border color)
  const zoneBorderColor = isPromotion
    ? COLORS.success
    : isDemotion
      ? COLORS.error
      : 'transparent';

  // Rank text color: gold for #1, silver for #2, bronze for #3
  const rankColor =
    entry.rank === 1
      ? COLORS.starGold
      : entry.rank === 2
        ? MEDAL_COLORS.silver
        : entry.rank === 3
          ? MEDAL_COLORS.bronze
          : COLORS.textSecondary;

  return (
    <View
      style={[
        styles.row,
        isTopThree && styles.rowTopThreeGold,
        isCurrentUser && styles.rowCurrentUser,
        { borderLeftColor: zoneBorderColor, borderLeftWidth: 3 },
        isTopThree && styles.rowTopThree,
      ]}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {isTopThree ? (
          <MaterialCommunityIcons
            name="medal"
            size={24}
            color={PODIUM_MEDAL_COLORS[entry.rank]}
          />
        ) : (
          <Text
            style={[
              styles.rankText,
              { color: rankColor },
              entry.rank <= 3 && styles.rankTextTopThree,
            ]}
          >
            {entry.rank}
          </Text>
        )}
      </View>

      {/* Small cat avatar */}
      <View style={styles.rowAvatar}>
        <CatAvatar
          catId={entry.selectedCatId ?? 'salsa'}
          size="small"
          skipEntryAnimation
        />
      </View>

      {/* User info */}
      <View style={styles.userInfo}>
        <Text
          style={[
            styles.displayName,
            isCurrentUser && styles.displayNameCurrent,
          ]}
          numberOfLines={1}
        >
          {entry.displayName}
          {isCurrentUser ? ' (You)' : ''}
        </Text>
      </View>

      {/* Weekly XP */}
      <View style={styles.xpContainer}>
        <Text
          style={[
            styles.xpValue,
            isCurrentUser && styles.xpValueCurrent,
          ]}
        >
          {entry.weeklyXp.toLocaleString()}
        </Text>
        <Text style={styles.xpLabel}>XP</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function LeaderboardScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const membership = useLeagueStore((s) => s.membership);
  const standings = useLeagueStore((s) => s.standings);
  const isLoadingStandings = useLeagueStore((s) => s.isLoadingStandings);
  const setStandings = useLeagueStore((s) => s.setStandings);
  const setLoadingStandings = useLeagueStore((s) => s.setLoadingStandings);
  const currentUserUid = useAuthStore((s) => s.user?.uid ?? '');

  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Auto-fetch standings on mount
  useEffect(() => {
    if (!membership?.leagueId) return;
    let cancelled = false;

    setLoadingStandings(true);
    setFetchError(null);
    getLeagueStandings(membership.leagueId)
      .then((data) => {
        if (!cancelled) setStandings(data);
      })
      .catch(() => {
        if (!cancelled) setFetchError('Could not load standings. Pull down to retry.');
      })
      .finally(() => {
        if (!cancelled) setLoadingStandings(false);
      });

    return () => { cancelled = true; };
  }, [membership?.leagueId, setStandings, setLoadingStandings]);

  const tier = membership?.tier ?? 'bronze';
  const config = LEAGUE_TIER_CONFIG[tier];
  const totalMembers = standings.length || membership?.totalMembers || 0;

  // Compute current user's rank from standings
  const currentUserRank = useMemo(() => {
    const entry = standings.find((s) => s.uid === currentUserUid);
    return entry?.rank ?? membership?.rank ?? null;
  }, [standings, currentUserUid, membership?.rank]);

  // Fetch latest standings from Firestore
  const handleRefresh = useCallback(async () => {
    if (!membership?.leagueId) return;
    setRefreshing(true);
    setLoadingStandings(true);
    setFetchError(null);
    try {
      const data = await getLeagueStandings(membership.leagueId);
      setStandings(data);
    } catch {
      setFetchError('Could not load standings. Pull down to retry.');
    } finally {
      setRefreshing(false);
      setLoadingStandings(false);
    }
  }, [membership?.leagueId, setStandings, setLoadingStandings]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Week date range display
  const weekRange = useMemo(() => {
    if (!membership?.weekStart) return '';
    const start = new Date(membership.weekStart + 'T00:00:00Z');
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);

    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    return `${fmt(start)} - ${fmt(end)}`;
  }, [membership?.weekStart]);

  const renderItem = useCallback(
    ({ item }: { item: LeagueStandingEntry }) => (
      <StandingsRow
        entry={item}
        isCurrentUser={item.uid === currentUserUid}
        totalMembers={totalMembers}
      />
    ),
    [currentUserUid, totalMembers],
  );

  const keyExtractor = useCallback((item: LeagueStandingEntry) => item.uid, []);

  // No league membership
  if (!membership) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <PressableScale onPress={handleGoBack} style={styles.backButton}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={COLORS.textPrimary}
            />
          </PressableScale>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="trophy-outline"
            size={64}
            color={COLORS.textMuted}
          />
          <Text style={styles.emptyText}>
            Join a league by completing exercises this week!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="leaderboard-screen">
      <GradientMeshBackground accent="leaderboard" />
      {/* Header */}
      <View style={styles.header}>
        <PressableScale onPress={handleGoBack} style={styles.backButton} testID="leaderboard-back">
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={COLORS.textPrimary}
          />
        </PressableScale>
        <View style={styles.headerCenter}>
          <View style={styles.headerTierRow}>
            <MaterialCommunityIcons
              name={config.icon}
              size={22}
              color={config.color}
            />
            <Text style={[styles.headerTitle, { color: config.color }]}>
              {config.label} League
            </Text>
          </View>
          <Text style={styles.headerWeek}>{weekRange}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>
      {/* Tier accent line */}
      <View style={[styles.headerAccentLine, { backgroundColor: config.color }]} />

      {/* Podium hero section for top 3 */}
      {standings.length > 0 && (
        <Podium standings={standings} currentUserUid={currentUserUid} />
      )}

      {/* Zone legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <MaterialCommunityIcons name="shield-check" size={16} color={COLORS.success} />
          <Text style={[styles.legendText, { color: COLORS.success }]}>Move Up</Text>
        </View>
        <View style={styles.legendItem}>
          <MaterialCommunityIcons name="shield-alert" size={16} color={COLORS.error} />
          <Text style={[styles.legendText, { color: COLORS.error }]}>At Risk</Text>
        </View>
      </View>

      {/* Error banner */}
      {fetchError && standings.length === 0 && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="wifi-off" size={18} color={COLORS.error} />
          <Text style={styles.errorBannerText}>{fetchError}</Text>
        </View>
      )}

      {/* Standings list (4th place onwards — top 3 are in the podium) */}
      {isLoadingStandings && standings.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={standings.filter((s) => s.rank > 3)}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyListText}>
                Pull down to load standings
              </Text>
            </View>
          }
        />
      )}

      {/* Pinned current user row */}
      {currentUserRank !== null && currentUserRank > 3 && (() => {
        const me = standings.find((s) => s.uid === currentUserUid);
        if (!me) return null;
        return (
          <LinearGradient
            colors={[glowColor(COLORS.primary, 0.12), glowColor(COLORS.primary, 0.04)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pinnedFooter}
          >
            <View style={styles.pinnedRank}>
              <Text style={styles.pinnedRankText}>{currentUserRank}</Text>
            </View>
            <CatAvatar
              catId={me.selectedCatId ?? 'mini-meowww'}
              size="small"
              skipEntryAnimation
            />
            <View style={styles.pinnedYouBadge}>
              <Text style={styles.pinnedYouBadgeText}>You</Text>
            </View>
            <Text style={styles.pinnedName} numberOfLines={1}>
              {me.displayName}
            </Text>
            <View style={styles.pinnedXp}>
              <Text style={styles.pinnedXpValue}>{me.weeklyXp.toLocaleString()}</Text>
              <Text style={styles.pinnedXpLabel}>XP</Text>
            </View>
          </LinearGradient>
        );
      })()}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerAccentLine: {
    height: 2,
    width: '100%',
    opacity: 0.6,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerTitle: {
    ...TYPOGRAPHY.heading.lg,
    color: COLORS.textPrimary,
  },
  headerWeek: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 32, // Balance back button
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendText: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  // Standings list
  listContent: {
    paddingVertical: SPACING.sm,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.cardBorder,
  },
  rowCurrentUser: {
    backgroundColor: glowColor(COLORS.primary, 0.1),
    borderColor: COLORS.primary,
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.md,
    marginHorizontal: SPACING.sm,
    marginVertical: SPACING.xs,
    ...SHADOWS.sm,
  },
  rowTopThree: {
    paddingVertical: SPACING.md,
  },
  rowTopThreeGold: {
    backgroundColor: glowColor(COLORS.starGold, 0.04),
  },

  // Rank
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...TYPOGRAPHY.body.lg,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  rankTextTopThree: {
    fontWeight: '800',
    fontSize: 18,
  },

  // Row cat avatar
  rowAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: SPACING.xs,
  },

  // User info
  userInfo: {
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  displayName: {
    ...TYPOGRAPHY.body.lg,
    color: COLORS.textPrimary,
  },
  displayNameCurrent: {
    fontWeight: '700',
    color: COLORS.primary,
  },

  // XP
  xpContainer: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  xpValue: {
    ...TYPOGRAPHY.heading.md,
    color: COLORS.textPrimary,
  },
  xpValueCurrent: {
    color: COLORS.primary,
  },
  xpLabel: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textSecondary,
  },

  // Empty / Loading states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    ...TYPOGRAPHY.body.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  emptyListContainer: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  emptyListText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textMuted,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: glowColor(COLORS.error, 0.08),
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: glowColor(COLORS.error, 0.19),
  },
  errorBannerText: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.error,
    flex: 1,
  },

  // Podium
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
    maxWidth: 120,
  },
  podiumCrown: {
    marginBottom: SPACING.xs,
    ...shadowGlow(COLORS.starGold, 8),
  },
  podiumAvatar: {
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    marginBottom: SPACING.xs,
  },
  podiumAvatarCurrent: {
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  podiumAvatarFirst: {
    borderWidth: 3,
    borderColor: COLORS.starGold,
    ...shadowGlow(COLORS.starGold, 12),
  },
  podiumMedal: {
    marginBottom: 2,
  },
  podiumMedalGlow: {
    ...shadowGlow(COLORS.starGold, 10),
  },
  podiumName: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 100,
  },
  podiumNameCurrent: {
    color: COLORS.primary,
  },
  podiumXp: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  podiumBlock: {
    width: '85%',
    borderTopLeftRadius: BORDER_RADIUS.sm,
    borderTopRightRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRank: {
    ...TYPOGRAPHY.heading.lg,
    fontWeight: '800',
  },

  // Pinned current-user footer
  pinnedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: glowColor(COLORS.primary, 0.25),
    backgroundColor: glowColor(COLORS.primary, 0.06),
    gap: SPACING.sm,
  },
  pinnedRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: glowColor(COLORS.primary, 0.19),
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinnedRankText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.primary,
    fontWeight: '800',
  },
  pinnedYouBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  pinnedYouBadgeText: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  pinnedName: {
    flex: 1,
    ...TYPOGRAPHY.body.md,
    color: COLORS.primary,
    fontWeight: '700',
  },
  pinnedXp: {
    alignItems: 'flex-end',
  },
  pinnedXpValue: {
    ...TYPOGRAPHY.heading.sm,
    color: COLORS.starGold,
    fontWeight: '800',
  },
  pinnedXpLabel: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textSecondary,
  },
});

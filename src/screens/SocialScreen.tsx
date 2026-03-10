/**
 * SocialScreen - Social hub with league, friends, and challenges
 *
 * Three sections:
 * 1. League Card — current tier, rank, weekly XP, "View Leaderboard" button
 * 2. Friends Section — friend count, pending requests, navigation buttons
 * 3. Active Challenges — pending/active FriendChallenge cards
 *
 * Auth gate: anonymous users see a sign-in prompt instead.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useSocialStore } from '../stores/socialStore';
import { useLeagueStore } from '../stores/leagueStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getFriends, getUserPublicProfile, getChallengesForUser } from '../services/firebase/socialService';
import { sendLocalNotification } from '../services/notificationService';
import {
  getCurrentLeagueMembership,
  assignToLeague,
  getLeagueStandings,
} from '../services/firebase/leagueService';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, glowColor } from '../theme/tokens';
import { LEAGUE_TIER_CONFIG, PODIUM_MEDAL_COLORS } from '../theme/leagueTiers';
import { GradientMeshBackground } from '../components/effects';
import { PressableScale } from '../components/common/PressableScale';
import { CatAvatar } from '../components/Mascot';
import { LeagueTransitionCard } from '../components/LeagueTransitionCard';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ---------------------------------------------------------------------------
// Auth Gate Component
// ---------------------------------------------------------------------------

function AuthGate({ onSignIn }: { onSignIn: () => void }): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <GradientMeshBackground accent="social" />
      <View style={styles.authGateContainer}>
        <MaterialCommunityIcons
          name="shield-sword"
          size={96}
          color={COLORS.textMuted}
        />
        <Text style={styles.authGateTitle}>The Arena</Text>
        <Text style={styles.authGateSubtitle}>
          Sign in to unlock leagues, friends, and challenges
        </Text>
        <View style={styles.authGateCtaCard}>
          <PressableScale onPress={onSignIn} style={styles.authGateButton}>
            <MaterialCommunityIcons name="login" size={20} color={COLORS.textPrimary} />
            <Text style={styles.authGateButtonText}>Sign In</Text>
          </PressableScale>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// League Card
// ---------------------------------------------------------------------------

function LeagueCard(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((s) => s.user);
  const membership = useLeagueStore((s) => s.membership);
  const setMembership = useLeagueStore((s) => s.setMembership);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const tier = membership?.tier ?? 'bronze';
  const config = LEAGUE_TIER_CONFIG[tier];

  const handleViewLeaderboard = useCallback(() => {
    navigation.navigate('Leaderboard');
  }, [navigation]);

  const handleJoinLeague = useCallback(async () => {
    if (!user?.uid || isJoining) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      // First try to find existing membership
      let m = await getCurrentLeagueMembership(user.uid);
      if (!m) {
        const catId = useSettingsStore.getState().selectedCatId ?? 'mini-meowww';
        m = await assignToLeague(
          user.uid,
          user.displayName ?? 'Player',
          catId,
          'bronze',
        );
      }
      setMembership(m);
    } catch (err) {
      console.error('[SocialScreen] League join failed:', err);
      setJoinError('Failed to join league. Check your connection and try again.');
    } finally {
      setIsJoining(false);
    }
  }, [user?.uid, user?.displayName, isJoining, setMembership]);

  if (!membership) {
    return (
      <View style={[styles.card, styles.leagueCard, styles.leagueCardNoMembership]}>
        {/* Trophy watermark */}
        <View style={styles.trophyWatermark} pointerEvents="none">
          <MaterialCommunityIcons name="trophy" size={120} color={COLORS.textPrimary} />
        </View>

        <View style={styles.leagueHeader}>
          <MaterialCommunityIcons
            name="shield-outline"
            size={32}
            color={COLORS.textMuted}
          />
          <Text style={styles.leagueTitle}>Weekly League</Text>
        </View>
        <Text style={styles.leagueNoMembership}>
          Compete with other players in a weekly XP league!
        </Text>
        <PressableScale
          onPress={handleJoinLeague}
          style={[styles.joinLeagueButton, styles.joinLeagueButtonGlow, isJoining && styles.joinLeagueButtonDisabled]}
          testID="social-join-league"
        >
          {isJoining ? (
            <ActivityIndicator color={COLORS.textPrimary} size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="shield-plus" size={20} color={COLORS.textPrimary} />
              <Text style={styles.joinLeagueButtonText}>Join This Week's League</Text>
            </>
          )}
        </PressableScale>
        {joinError && (
          <Text style={styles.joinLeagueError}>{joinError}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={[
      styles.card,
      styles.leagueCard,
      { borderColor: config.color, backgroundColor: config.arenaGlow },
      Platform.OS === 'ios' && {
        shadowColor: config.color,
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
      },
    ]}>
      <View style={styles.leagueHeader}>
        <View style={[styles.tierBadge, { backgroundColor: glowColor(config.color, 0.15) }]}>
          <MaterialCommunityIcons
            name={config.icon}
            size={32}
            color={config.color}
          />
        </View>
        <View style={styles.leagueHeaderText}>
          <Text style={[styles.leagueTierLabel, { color: config.color }]}>
            {config.label} League
          </Text>
          <Text style={styles.leagueWeek}>
            Week of {membership.weekStart}
          </Text>
        </View>
      </View>

      <View style={styles.leagueStats}>
        <View style={styles.leagueStat}>
          <View style={styles.rankRow}>
            {membership.rank <= 3 && (
              <MaterialCommunityIcons
                name="crown"
                size={16}
                color={PODIUM_MEDAL_COLORS[membership.rank] ?? COLORS.starGold}
              />
            )}
            <Text style={[
              styles.leagueStatValueLarge,
              membership.rank <= 3 && { color: PODIUM_MEDAL_COLORS[membership.rank] ?? COLORS.starGold },
            ]}>
              #{membership.rank}
            </Text>
          </View>
          <Text style={styles.leagueStatLabel}>Rank</Text>
        </View>
        <View style={styles.leagueStatDivider} />
        <View style={styles.leagueStat}>
          <Text style={styles.leagueStatValueLarge}>
            {membership.weeklyXp.toLocaleString()}
          </Text>
          <Text style={styles.leagueStatLabel}>Weekly XP</Text>
        </View>
        <View style={styles.leagueStatDivider} />
        <View style={styles.leagueStat}>
          <Text style={styles.leagueStatValueLarge}>{membership.totalMembers}</Text>
          <Text style={styles.leagueStatLabel}>Members</Text>
        </View>
      </View>

      <PressableScale
        onPress={handleViewLeaderboard}
        style={[styles.actionButton, { backgroundColor: glowColor(config.color, 0.13) }]}
        testID="social-view-leaderboard"
      >
        <MaterialCommunityIcons name="trophy" size={18} color={config.color} />
        <Text style={[styles.actionButtonText, { color: config.color }]}>
          View Leaderboard
        </Text>
      </PressableScale>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Friends Section
// ---------------------------------------------------------------------------

function FriendsSection(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const friends = useSocialStore((s) => s.friends);

  const acceptedCount = useMemo(
    () => friends.filter((f) => f.status === 'accepted').length,
    [friends],
  );

  const pendingCount = useMemo(
    () => friends.filter((f) => f.status === 'pending_incoming' || f.status === 'pending_outgoing').length,
    [friends],
  );

  const handleViewFriends = useCallback(() => {
    navigation.navigate('Friends');
  }, [navigation]);

  const handleAddFriend = useCallback(() => {
    navigation.navigate('AddFriend');
  }, [navigation]);

  const acceptedFriends = useMemo(
    () => friends.filter((f) => f.status === 'accepted'),
    [friends],
  );

  const previewFriends = acceptedFriends.slice(0, 3);

  return (
    <View style={[styles.card, styles.friendsCard]}>
      {/* Left accent bar */}
      <View style={styles.friendsAccentBar} />

      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="account-multiple"
          size={24}
          color={COLORS.textPrimary}
        />
        <Text style={styles.sectionTitle}>Friends</Text>
        {pendingCount > 0 && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.friendsInfoRow}>
        {previewFriends.length > 0 && (
          <View style={styles.friendAvatarStack}>
            {previewFriends.map((f, i) => (
              <View key={f.uid} style={[styles.friendAvatarWrapper, { marginLeft: i > 0 ? -12 : 0, zIndex: previewFriends.length - i }]}>
                <CatAvatar catId={f.selectedCatId || 'mini-meowww'} size="small" skipEntryAnimation />
              </View>
            ))}
          </View>
        )}
        <Text style={styles.friendsCount}>
          {acceptedCount} {acceptedCount === 1 ? 'friend' : 'friends'}
          {pendingCount > 0 && (
            <Text style={styles.pendingText}>
              {' '} ({pendingCount} pending)
            </Text>
          )}
        </Text>
      </View>

      <View style={styles.friendsActions}>
        <PressableScale
          onPress={handleViewFriends}
          style={[styles.actionButton, styles.friendsActionButton]}
          testID="social-view-friends"
        >
          <MaterialCommunityIcons
            name="account-group"
            size={18}
            color={COLORS.primary}
          />
          <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>
            View Friends
          </Text>
        </PressableScale>

        <PressableScale
          onPress={handleAddFriend}
          style={[styles.actionButton, styles.addFriendButton]}
          testID="social-add-friend"
        >
          <MaterialCommunityIcons
            name="account-plus"
            size={18}
            color={COLORS.textPrimary}
          />
          <Text style={[styles.actionButtonText, { color: COLORS.textPrimary }]}>
            Add Friend
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Challenge Card
// ---------------------------------------------------------------------------

function ChallengeCard({
  challenge,
  myUid,
}: {
  challenge: {
    id: string;
    fromUid: string;
    fromDisplayName: string;
    exerciseTitle: string;
    fromScore: number;
    toScore: number | null;
    status: 'pending' | 'completed' | 'expired';
    expiresAt: number;
  };
  myUid: string;
}): React.JSX.Element {
  const iAmSender = challenge.fromUid === myUid;

  const timeLeft = useMemo(() => {
    const remaining = challenge.expiresAt - Date.now();
    if (remaining <= 0) return 'Expired';
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  }, [challenge.expiresAt]);

  const statusColor =
    challenge.status === 'completed'
      ? COLORS.success
      : challenge.status === 'expired'
        ? COLORS.textMuted
        : COLORS.warning;

  const borderLeftColor =
    challenge.status === 'completed'
      ? COLORS.success
      : challenge.status === 'expired'
        ? COLORS.textMuted
        : COLORS.warning;

  // Scores from the viewer's perspective
  const myScore = iAmSender ? challenge.fromScore : challenge.toScore;
  const theirScore = iAmSender ? challenge.toScore : challenge.fromScore;

  // Who won?
  const myWins = myScore != null && theirScore != null && myScore > theirScore;
  const theyWin = myScore != null && theirScore != null && theirScore > myScore;

  return (
    <View style={[
      styles.challengeCard,
      { borderLeftWidth: 3, borderLeftColor },
      { backgroundColor: glowColor(borderLeftColor, 0.06) },
    ]}>
      <View style={styles.challengeHeader}>
        <MaterialCommunityIcons name="sword-cross" size={22} color={COLORS.warning} />
        <Text style={styles.challengeTitle} numberOfLines={1}>
          {challenge.exerciseTitle}
        </Text>
      </View>

      <Text style={styles.challengeOpponent}>
        vs. {challenge.fromDisplayName}
      </Text>

      <View style={styles.challengeScoresRow}>
        <View style={styles.challengeScoreBox}>
          <Text style={styles.challengeScoreLabel}>You</Text>
          <Text style={[
            styles.challengeScoreValue,
            myWins && { color: COLORS.success },
          ]}>
            {myScore != null ? `${myScore}%` : '—'}
          </Text>
        </View>
        <Text style={styles.challengeVsText}>VS</Text>
        <View style={styles.challengeScoreBox}>
          <Text style={styles.challengeScoreLabel}>Them</Text>
          {theirScore != null ? (
            <Text style={[
              styles.challengeScoreValue,
              theyWin && { color: COLORS.success },
            ]}>
              {theirScore}%
            </Text>
          ) : (
            <Text style={[styles.challengeScoreValue, { color: COLORS.warning, fontSize: 14 }]}>
              Pending
            </Text>
          )}
        </View>
      </View>

      <View style={styles.challengeFooter}>
        <Text style={[styles.challengeStatus, { color: statusColor }]}>
          {challenge.status === 'completed'
            ? 'Completed'
            : challenge.status === 'expired'
              ? 'Expired'
              : 'Pending'}
        </Text>
        <Text style={styles.challengeTime}>{timeLeft}</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Active Challenges Section
// ---------------------------------------------------------------------------

function ActiveChallengesSection(): React.JSX.Element {
  const challenges = useSocialStore((s) => s.challenges);
  const myUid = useAuthStore((s) => s.user?.uid) ?? '';

  const activeChallenges = useMemo(
    () => challenges.filter((c) => c.status === 'pending' || c.status === 'completed'),
    [challenges],
  );

  return (
    <View style={[styles.card, styles.challengesCard]}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name="sword-cross"
          size={24}
          color={COLORS.textPrimary}
        />
        <Text style={styles.sectionTitle}>Challenges</Text>
      </View>

      {activeChallenges.length === 0 ? (
        <Text style={styles.emptyChallenges}>
          No active challenges. Challenge a friend to beat your score!
        </Text>
      ) : (
        activeChallenges.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} myUid={myUid} />
        ))
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function SocialScreen(): React.JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((s) => s.user);
  const isAnonymous = useAuthStore((s) => s.isAnonymous);
  const setFriends = useSocialStore((s) => s.setFriends);
  const setChallenges = useSocialStore((s) => s.setChallenges);
  const setMembership = useLeagueStore((s) => s.setMembership);
  const setStandings = useLeagueStore((s) => s.setStandings);
  const tierTransition = useLeagueStore((s) => s.tierTransition);
  const membership = useLeagueStore((s) => s.membership);
  const clearTierTransition = useLeagueStore((s) => s.clearTierTransition);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Sync friends + league + challenges from Firestore on mount and on tab focus
  useFocusEffect(
    useCallback(() => {
      if (!user?.uid || isAnonymous) return;
      let cancelled = false;
      let hadError = false;

      (async () => {
        // Sync friends
        try {
          const remoteFriends = await getFriends(user.uid);
          if (!cancelled && remoteFriends.length > 0) {
            const enriched = await Promise.all(
              remoteFriends.map(async (f) => {
                if (f.displayName && f.displayName !== 'Friend' && f.displayName !== 'Player') {
                  return f;
                }
                try {
                  const profile = await getUserPublicProfile(f.uid);
                  if (profile) {
                    return { ...f, displayName: profile.displayName, selectedCatId: profile.selectedCatId || f.selectedCatId };
                  }
                } catch {
                  // keep original
                }
                return f;
              }),
            );
            if (!cancelled) setFriends(enriched);
          }
        } catch {
          hadError = true;
        }

        // Sync challenges
        try {
          const remoteChallenges = await getChallengesForUser(user.uid);
          if (!cancelled) {
            // Detect new pending challenges addressed to this user
            const existingIds = new Set(useSocialStore.getState().challenges.map((c) => c.id));
            const newIncoming = remoteChallenges.filter(
              (c) => c.status === 'pending' && c.toUid === user.uid && !existingIds.has(c.id),
            );
            setChallenges(remoteChallenges);
            // Fire a local notification for each new incoming challenge
            for (const c of newIncoming) {
              sendLocalNotification(
                'New Challenge!',
                `${c.fromDisplayName} challenged you on "${c.exerciseTitle}" with ${c.fromScore}%`,
              );
            }
          }
        } catch {
          hadError = true;
        }

        // Sync league membership + standings
        try {
          const m = await getCurrentLeagueMembership(user.uid);
          if (!cancelled && m) {
            setMembership(m);
            try {
              const s = await getLeagueStandings(m.leagueId);
              if (!cancelled) setStandings(s);
            } catch {
              // standings fetch failed — not critical
            }
          }
        } catch {
          hadError = true;
        }

        if (!cancelled && hadError) {
          setSyncError('Some data may be outdated. Check your connection.');
        }
      })();

      return () => { cancelled = true; };
    }, [user?.uid, isAnonymous, setFriends, setChallenges, setMembership, setStandings]),
  );

  const handleSignIn = useCallback(() => {
    navigation.navigate('Account');
  }, [navigation]);

  if (isAnonymous) {
    return <AuthGate onSignIn={handleSignIn} />;
  }

  return (
    <SafeAreaView style={styles.container} testID="social-screen">
      <GradientMeshBackground accent="social" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="social-scroll"
      >
        <View style={styles.screenTitleRow}>
          <MaterialCommunityIcons name="shield-sword" size={32} color={COLORS.primary} />
          <View>
            <Text style={styles.screenTitle}>The Arena</Text>
            <Text style={styles.screenSubtitle}>Compete, challenge, conquer</Text>
          </View>
        </View>

        {syncError && (
          <View style={styles.syncErrorBanner}>
            <MaterialCommunityIcons name="cloud-off-outline" size={16} color={COLORS.warning} />
            <Text style={styles.syncErrorText}>{syncError}</Text>
          </View>
        )}

        {tierTransition != null && tierTransition !== 'same' && membership && (
          <LeagueTransitionCard
            transition={tierTransition}
            newTier={membership.tier}
            onDismiss={clearTierTransition}
          />
        )}

        <LeagueCard />
        <FriendsSection />
        <ActiveChallengesSection />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  screenTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  screenTitle: {
    ...TYPOGRAPHY.display.lg,
    color: COLORS.textPrimary,
  },
  screenSubtitle: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Auth gate
  authGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  authGateTitle: {
    ...TYPOGRAPHY.display.md,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  authGateSubtitle: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  authGateCtaCard: {
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.3),
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.sm,
    backgroundColor: glowColor(COLORS.primary, 0.06),
    ...(Platform.OS === 'ios' ? {
      shadowColor: COLORS.primary,
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
    } : { elevation: 6 }),
  },
  authGateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.lg,
  },
  authGateButtonText: {
    ...TYPOGRAPHY.button.lg,
    color: COLORS.textPrimary,
  },

  // Sync error banner
  syncErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: glowColor(COLORS.warning, 0.08),
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  syncErrorText: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.warning,
    flex: 1,
  },

  // Card base — glassmorphism
  card: {
    backgroundColor: glowColor(COLORS.cardSurface, 0.75),
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: glowColor('#FFFFFF', 0.08),
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },

  // League card
  leagueCard: {
    borderWidth: 1.5,
  },
  leagueCardNoMembership: {
    overflow: 'hidden',
  },
  trophyWatermark: {
    position: 'absolute',
    right: -10,
    top: -10,
    opacity: 0.05,
  },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  tierBadge: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueHeaderText: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  leagueTierLabel: {
    ...TYPOGRAPHY.heading.lg,
  },
  leagueWeek: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  leagueTitle: {
    ...TYPOGRAPHY.heading.lg,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  leagueNoMembership: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  joinLeagueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: 52,
  },
  joinLeagueButtonGlow: {
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.5),
    ...(Platform.OS === 'ios' ? {
      shadowColor: COLORS.primary,
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
    } : { elevation: 6 }),
  },
  joinLeagueButtonDisabled: {
    opacity: 0.6,
  },
  joinLeagueButtonText: {
    ...TYPOGRAPHY.button.lg,
    color: COLORS.textPrimary,
  },
  joinLeagueError: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.error,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  leagueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: glowColor('#FFFFFF', 0.08),
    borderBottomWidth: 1,
    borderBottomColor: glowColor('#FFFFFF', 0.08),
    marginBottom: SPACING.md,
  },
  leagueStat: {
    alignItems: 'center',
    flex: 1,
  },
  leagueStatValue: {
    ...TYPOGRAPHY.heading.lg,
    color: COLORS.textPrimary,
  },
  leagueStatValueLarge: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leagueStatLabel: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  leagueStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: glowColor('#FFFFFF', 0.08),
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.heading.lg,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
    flex: 1,
  },

  // Friends card
  friendsCard: {
    overflow: 'hidden',
    paddingLeft: SPACING.md + 3, // extra for accent bar
  },
  friendsAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: BORDER_RADIUS.lg,
  },
  friendsInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  friendAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  friendAvatarWrapper: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.cardSurface,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsCount: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
  },
  pendingText: {
    color: COLORS.warning,
  },
  pendingBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  pendingBadgeText: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  friendsActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  friendsActionButton: {
    flex: 1,
    backgroundColor: glowColor(COLORS.primary, 0.12),
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.2),
  },
  addFriendButton: {
    flex: 1,
    backgroundColor: glowColor('#FFFFFF', 0.06),
    borderWidth: 1,
    borderColor: glowColor('#FFFFFF', 0.08),
  },

  // Action button (shared)
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  actionButtonText: {
    ...TYPOGRAPHY.button.md,
  },

  // Challenges card
  challengesCard: {},
  emptyChallenges: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },

  // Individual challenge card
  challengeCard: {
    backgroundColor: glowColor(COLORS.surfaceElevated, 0.8),
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: glowColor('#FFFFFF', 0.05),
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  challengeTitle: {
    ...TYPOGRAPHY.heading.md,
    color: COLORS.textPrimary,
    flex: 1,
  },
  challengeOpponent: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  challengeScoresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: glowColor('#FFFFFF', 0.03),
    borderRadius: BORDER_RADIUS.sm,
  },
  challengeScoreBox: {
    alignItems: 'center',
    flex: 1,
  },
  challengeScoreLabel: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  challengeScoreValue: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
  },
  challengeVsText: {
    ...TYPOGRAPHY.heading.sm,
    color: COLORS.textMuted,
    fontWeight: '800',
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: glowColor('#FFFFFF', 0.06),
    paddingTop: SPACING.sm,
  },
  challengeStatus: {
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '600',
  },
  challengeTime: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textMuted,
  },
});

/**
 * FriendsScreen — Friends list + activity feed
 *
 * Tab toggle: "Friends" | "Activity"
 * Friends tab: pending requests + accepted friends list
 * Activity tab: chronological feed of friend milestones
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CatAvatar } from '../components/Mascot/CatAvatar';
import { useSocialStore } from '../stores/socialStore';
import { useAuthStore } from '../stores/authStore';
import { acceptFriendRequest, removeFriendConnection, getFriends, getUserPublicProfile } from '../services/firebase/socialService';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS, glowColor } from '../theme/tokens';
import { PressableScale } from '../components/common/PressableScale';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { FriendConnection, ActivityFeedItem } from '../stores/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type TabKey = 'friends' | 'activity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

function activityIcon(type: ActivityFeedItem['type']): string {
  switch (type) {
    case 'level_up': return 'arrow-up-bold';
    case 'evolution': return 'star';
    case 'streak_milestone': return 'fire';
    case 'song_mastered': return 'music-note';
    case 'league_promoted': return 'trophy';
    default: return 'bell';
  }
}

function activityIconColor(type: ActivityFeedItem['type']): string {
  switch (type) {
    case 'level_up': return COLORS.info;
    case 'evolution': return COLORS.starGold;
    case 'streak_milestone': return COLORS.streakFlame;
    case 'song_mastered': return COLORS.primary;
    case 'league_promoted': return COLORS.starGold;
    default: return COLORS.textSecondary;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function statusColor(status: FriendConnection['status']): string {
  switch (status) {
    case 'pending_incoming': return COLORS.warning;
    case 'pending_outgoing': return COLORS.info;
    case 'accepted': return COLORS.success;
    default: return COLORS.textMuted;
  }
}

function sectionHeaderIcon(title: string): string {
  if (title.startsWith('Incoming')) return 'inbox-arrow-down';
  if (title.startsWith('Sent')) return 'send';
  return 'account-group';
}

function PendingRequestRow({
  friend,
  onAccept,
  onDecline,
  isProcessing,
}: {
  friend: FriendConnection;
  onAccept: () => void;
  onDecline: () => void;
  isProcessing: boolean;
}): React.JSX.Element {
  const borderColor = statusColor(friend.status);
  return (
    <View style={styles.friendRow}>
      <View style={[styles.friendRowAccent, { backgroundColor: borderColor }]} />
      <View style={[styles.friendAvatarRing, { borderColor }]}>
        <View style={styles.friendAvatarWrap}>
          <CatAvatar catId={friend.selectedCatId} size="small" />
        </View>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName} numberOfLines={1}>
          {friend.displayName || 'Player'}
        </Text>
        <Text style={styles.friendSubtitle}>wants to be friends</Text>
      </View>
      <View style={styles.pendingActions}>
        {isProcessing ? (
          <ActivityIndicator color={COLORS.primary} size="small" />
        ) : (
          <>
            <PressableScale style={styles.acceptButton} onPress={onAccept}>
              <MaterialCommunityIcons name="check" size={18} color={COLORS.textPrimary} />
            </PressableScale>
            <PressableScale style={styles.declineButton} onPress={onDecline}>
              <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} />
            </PressableScale>
          </>
        )}
      </View>
    </View>
  );
}

function SentRequestRow({
  friend,
  onCancel,
  isProcessing,
}: {
  friend: FriendConnection;
  onCancel: () => void;
  isProcessing: boolean;
}): React.JSX.Element {
  const borderColor = statusColor(friend.status);
  return (
    <View style={styles.friendRow}>
      <View style={[styles.friendRowAccent, { backgroundColor: borderColor }]} />
      <View style={[styles.friendAvatarRing, { borderColor }]}>
        <View style={styles.friendAvatarWrap}>
          <CatAvatar catId={friend.selectedCatId} size="small" />
        </View>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName} numberOfLines={1}>
          {friend.displayName || 'Player'}
        </Text>
        <Text style={styles.friendSubtitle}>request sent</Text>
      </View>
      <View style={styles.pendingActions}>
        {isProcessing ? (
          <ActivityIndicator color={COLORS.primary} size="small" />
        ) : (
          <PressableScale style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

function AcceptedFriendRow({
  friend,
}: {
  friend: FriendConnection;
}): React.JSX.Element {
  const navigation = useNavigation<Nav>();

  const handleChallenge = useCallback(() => {
    Alert.alert(
      'Challenge',
      `Play an exercise and challenge ${friend.displayName || 'Friend'} to beat your score!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Let\'s Go!',
          onPress: () => {
            navigation.navigate('Exercise', {
              exerciseId: 'ai-mode',
              aiMode: true,
              challengeTarget: {
                uid: friend.uid,
                displayName: friend.displayName || 'Friend',
              },
            });
          },
        },
      ],
    );
  }, [friend.uid, friend.displayName, navigation]);

  const borderColor = statusColor(friend.status);
  return (
    <View style={styles.friendRow}>
      <View style={[styles.friendRowAccent, { backgroundColor: borderColor }]} />
      <View style={[styles.friendAvatarRing, { borderColor }]}>
        <View style={styles.friendAvatarWrap}>
          <CatAvatar catId={friend.selectedCatId} size="small" />
        </View>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName} numberOfLines={1}>
          {friend.displayName || 'Player'}
        </Text>
      </View>
      <PressableScale
        style={styles.challengeButton}
        onPress={handleChallenge}
      >
        <MaterialCommunityIcons name="sword-cross" size={16} color={COLORS.primaryLight} />
        <Text style={styles.challengeButtonText}>Challenge</Text>
      </PressableScale>
    </View>
  );
}

function ActivityRow({ item, isLast }: { item: ActivityFeedItem; isLast: boolean }): React.JSX.Element {
  const iconName = activityIcon(item.type);
  const iconColor = activityIconColor(item.type);

  return (
    <View style={styles.activityRowOuter}>
      {/* Timeline line */}
      <View style={styles.timelineColumn}>
        <View style={[styles.activityIcon, { backgroundColor: glowColor(iconColor, 0.13) }]}>
          <MaterialCommunityIcons name={iconName as never} size={20} color={iconColor} />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.activityCard}>
        <View style={styles.activityContent}>
          <Text style={styles.activityText} numberOfLines={2}>
            <Text style={styles.activityFriendName}>{item.friendDisplayName}</Text>
            {' '}
            <Text style={styles.activityAction}>{item.detail}</Text>
          </Text>
          <Text style={styles.activityTime}>{getRelativeTime(item.timestamp)}</Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FriendsScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const isAnonymous = useAuthStore((s) => s.isAnonymous);
  const friends = useSocialStore((s) => s.friends);
  const activityFeed = useSocialStore((s) => s.activityFeed);
  const updateFriendStatus = useSocialStore((s) => s.updateFriendStatus);
  const removeFriend = useSocialStore((s) => s.removeFriend);

  const setFriends = useSocialStore((s) => s.setFriends);

  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [processingUid, setProcessingUid] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync friends list from Firestore on mount to discover incoming requests.
  // Also enriches any connections with missing display names (legacy data).
  useEffect(() => {
    if (!user?.uid || isAnonymous) return;
    let cancelled = false;
    setIsSyncing(true);

    (async () => {
      try {
        const remoteFriends = await getFriends(user.uid);
        if (cancelled || remoteFriends.length === 0) return;

        // Enrich friends that have empty/default display names
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
              // Profile fetch failed — keep original
            }
            return f;
          }),
        );

        if (!cancelled) {
          setFriends(enriched);
        }
      } catch {
        // Silently fail — local data is still available
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.uid, isAnonymous, setFriends]);

  const pendingIncoming = useMemo(
    () => friends.filter((f) => f.status === 'pending_incoming'),
    [friends],
  );

  const pendingOutgoing = useMemo(
    () => friends.filter((f) => f.status === 'pending_outgoing'),
    [friends],
  );

  const acceptedFriends = useMemo(
    () => friends.filter((f) => f.status === 'accepted'),
    [friends],
  );

  const handleAcceptRequest = useCallback(
    async (friendUid: string) => {
      if (!user?.uid) return;
      setProcessingUid(friendUid);
      try {
        await acceptFriendRequest(user.uid, friendUid);
        updateFriendStatus(friendUid, 'accepted');
      } catch {
        Alert.alert('Error', 'Failed to accept request. Please try again.');
      } finally {
        setProcessingUid(null);
      }
    },
    [user?.uid, updateFriendStatus],
  );

  const handleDeclineRequest = useCallback(
    async (friendUid: string) => {
      if (!user?.uid) return;
      setProcessingUid(friendUid);
      try {
        await removeFriendConnection(user.uid, friendUid);
        removeFriend(friendUid);
      } catch {
        Alert.alert('Error', 'Failed to decline request. Please try again.');
      } finally {
        setProcessingUid(null);
      }
    },
    [user?.uid, removeFriend],
  );

  const handleCancelRequest = useCallback(
    async (friendUid: string) => {
      if (!user?.uid) return;
      setProcessingUid(friendUid);
      try {
        await removeFriendConnection(user.uid, friendUid);
        removeFriend(friendUid);
      } catch {
        Alert.alert('Error', 'Failed to cancel request. Please try again.');
      } finally {
        setProcessingUid(null);
      }
    },
    [user?.uid, removeFriend],
  );

  // ---------------------------------------------------------------------------
  // Friends tab content
  // ---------------------------------------------------------------------------

  const renderFriendsTab = useCallback(() => {
    const hasAnyFriends = pendingIncoming.length > 0 || pendingOutgoing.length > 0 || acceptedFriends.length > 0;

    if (!hasAnyFriends) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptySubtitle}>
            Add friends to see their progress and challenge them!
          </Text>
          <PressableScale
            style={styles.emptyActionButton}
            onPress={() => navigation.navigate('AddFriend')}
          >
            <MaterialCommunityIcons name="account-plus" size={20} color={COLORS.textPrimary} />
            <Text style={styles.emptyActionText}>Add Friend</Text>
          </PressableScale>
        </View>
      );
    }

    // Build sections: incoming requests, sent requests, accepted friends
    type SectionItem = { type: 'header'; title: string } | { type: 'friend'; friend: FriendConnection };
    const sections: SectionItem[] = [];

    if (pendingIncoming.length > 0) {
      sections.push({ type: 'header', title: `Incoming Requests (${pendingIncoming.length})` });
      for (const f of pendingIncoming) {
        sections.push({ type: 'friend', friend: f });
      }
    }

    if (pendingOutgoing.length > 0) {
      sections.push({ type: 'header', title: `Sent Requests (${pendingOutgoing.length})` });
      for (const f of pendingOutgoing) {
        sections.push({ type: 'friend', friend: f });
      }
    }

    if (acceptedFriends.length > 0) {
      if (pendingIncoming.length > 0 || pendingOutgoing.length > 0) {
        sections.push({ type: 'header', title: `Friends (${acceptedFriends.length})` });
      }
      for (const f of acceptedFriends) {
        sections.push({ type: 'friend', friend: f });
      }
    }

    return (
      <FlatList
        data={sections}
        keyExtractor={(item, index) => item.type === 'header' ? `header-${index}` : `friend-${(item as { type: 'friend'; friend: FriendConnection }).friend.uid}`}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderAccent} />
                <MaterialCommunityIcons
                  name={sectionHeaderIcon(item.title) as never}
                  size={14}
                  color={COLORS.primary}
                  style={styles.sectionHeaderIcon}
                />
                <Text style={styles.sectionHeaderText}>{item.title}</Text>
              </View>
            );
          }
          const friend = item.friend;
          if (friend.status === 'pending_incoming') {
            return (
              <PendingRequestRow
                friend={friend}
                onAccept={() => handleAcceptRequest(friend.uid)}
                onDecline={() => handleDeclineRequest(friend.uid)}
                isProcessing={processingUid === friend.uid}
              />
            );
          }
          if (friend.status === 'pending_outgoing') {
            return (
              <SentRequestRow
                friend={friend}
                onCancel={() => handleCancelRequest(friend.uid)}
                isProcessing={processingUid === friend.uid}
              />
            );
          }
          return <AcceptedFriendRow friend={friend} />;
        }}
      />
    );
  }, [pendingIncoming, pendingOutgoing, acceptedFriends, processingUid, handleAcceptRequest, handleDeclineRequest, handleCancelRequest, navigation]);

  // ---------------------------------------------------------------------------
  // Activity tab content
  // ---------------------------------------------------------------------------

  const renderActivityTab = useCallback(() => {
    if (activityFeed.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons name="timeline-text-outline" size={64} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptySubtitle}>
            Add friends to see their activity here
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={activityFeed}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => <ActivityRow item={item} isLast={index === activityFeed.length - 1} />}
      />
    );
  }, [activityFeed]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} testID="friends-screen">
      {/* Header */}
      <View style={styles.header}>
        <PressableScale
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          testID="friends-back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </PressableScale>
        <Text style={styles.headerTitle}>Friends</Text>
        <PressableScale
          onPress={() => navigation.navigate('AddFriend')}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <MaterialCommunityIcons name="account-plus" size={24} color={COLORS.primary} />
        </PressableScale>
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabBar}>
        <PressableScale
          style={styles.tab}
          onPress={() => setActiveTab('friends')}
        >
          <View style={styles.tabInner}>
            <MaterialCommunityIcons
              name="account-group"
              size={18}
              color={activeTab === 'friends' ? COLORS.primary : COLORS.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'friends' && styles.tabTextActive,
              ]}
            >
              Friends
            </Text>
            {(pendingIncoming.length + pendingOutgoing.length) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingIncoming.length + pendingOutgoing.length}</Text>
              </View>
            )}
          </View>
          {activeTab === 'friends' && <View style={styles.tabAccentBar} />}
        </PressableScale>
        <PressableScale
          style={styles.tab}
          onPress={() => setActiveTab('activity')}
        >
          <View style={styles.tabInner}>
            <MaterialCommunityIcons
              name="timeline-clock"
              size={18}
              color={activeTab === 'activity' ? COLORS.primary : COLORS.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'activity' && styles.tabTextActive,
              ]}
            >
              Activity
            </Text>
          </View>
          {activeTab === 'activity' && <View style={styles.tabAccentBar} />}
        </PressableScale>
      </View>

      {/* Tab Content */}
      {isSyncing && (
        <View style={styles.syncBar}>
          <ActivityIndicator color={COLORS.primary} size="small" />
          <Text style={styles.syncText}>Syncing...</Text>
        </View>
      )}
      {activeTab === 'friends' ? renderFriendsTab() : renderActivityTab()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: glowColor('#FFFFFF', 0.06),
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.heading.lg,
    color: COLORS.textPrimary,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  tabAccentBar: {
    width: '60%',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.primary,
  },
  tabText: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },

  // List
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  sectionHeaderAccent: {
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  sectionHeaderIcon: {
    marginRight: SPACING.xs,
  },
  sectionHeaderText: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Friend row
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.md,
    paddingLeft: SPACING.md + 3,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  friendRowAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderBottomLeftRadius: BORDER_RADIUS.md,
  },
  friendAvatarRing: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  friendAvatarWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    ...TYPOGRAPHY.heading.sm,
    color: COLORS.textPrimary,
  },
  friendSubtitle: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.button.sm,
    color: COLORS.textSecondary,
  },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
  },
  syncText: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textMuted,
  },
  challengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: glowColor(COLORS.primary, 0.2),
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.4),
  },
  challengeButtonText: {
    ...TYPOGRAPHY.button.sm,
    color: COLORS.primaryLight,
  },

  // Activity
  activityRowOuter: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 0,
  },
  timelineColumn: {
    width: 48,
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: glowColor(COLORS.textMuted, 0.25),
    marginTop: 2,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCard: {
    flex: 1,
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textPrimary,
  },
  activityFriendName: {
    fontWeight: '700',
  },
  activityAction: {
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activityTime: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: glowColor(COLORS.primary, 0.08),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...TYPOGRAPHY.heading.md,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    minWidth: 200,
  },
  emptyActionText: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.textPrimary,
  },
});

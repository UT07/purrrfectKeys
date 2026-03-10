/**
 * Challenge Friend Sheet
 *
 * A slide-up modal that displays accepted friends as a horizontal list.
 * Tapping a friend immediately sends a challenge via `createChallenge()`.
 * Shows a brief "Challenge Sent!" confirmation after sending.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PressableScale } from './common/PressableScale';
import { CatAvatar } from './Mascot/CatAvatar';
import { useSocialStore } from '../stores/socialStore';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { createChallenge } from '../services/firebase/socialService';
import type { FriendChallenge } from '../stores/types';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '../theme/tokens';

export interface ChallengeFriendSheetProps {
  visible: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseTitle: string;
  score: number;
}

const CHALLENGE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function ChallengeFriendSheet({
  visible,
  onClose,
  exerciseId,
  exerciseTitle,
  score,
}: ChallengeFriendSheetProps): React.ReactElement {
  const friends = useSocialStore((s) => s.friends);
  const acceptedFriends = friends.filter((f) => f.status === 'accepted');

  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleChallenge = useCallback(
    async (friendUid: string, friendName: string) => {
      if (sendingTo) return;
      setSendingTo(friendUid);

      try {
        const user = useAuthStore.getState().user;
        const settings = useSettingsStore.getState();
        const uid = user?.uid ?? 'unknown';
        const now = Date.now();

        const challenge: FriendChallenge = {
          id: `challenge-${uid}-${friendUid}-${now}`,
          fromUid: uid,
          fromDisplayName: settings.displayName,
          fromCatId: settings.selectedCatId,
          toUid: friendUid,
          exerciseId,
          exerciseTitle,
          fromScore: score,
          toScore: null,
          status: 'pending',
          createdAt: now,
          expiresAt: now + CHALLENGE_EXPIRY_MS,
        };

        await createChallenge(challenge);

        // Also add to local store
        useSocialStore.getState().addChallenge(challenge);

        setSentTo(friendName);
        setTimeout(() => {
          setSentTo(null);
          onClose();
        }, 1500);
      } catch {
        // Silently fail — user can retry
      } finally {
        setSendingTo(null);
      }
    },
    [sendingTo, exerciseId, exerciseTitle, score, onClose],
  );

  const renderFriend = useCallback(
    ({ item }: { item: (typeof acceptedFriends)[number] }) => {
      const isSending = sendingTo === item.uid;
      const wasSent = sentTo === item.displayName;

      return (
        <PressableScale
          onPress={() => handleChallenge(item.uid, item.displayName)}
          disabled={isSending || sentTo != null}
          style={styles.friendItem}
          testID={`challenge-friend-${item.uid}`}
        >
          <CatAvatar catId={item.selectedCatId || 'mini-meowww'} size="small" mood="happy" />
          {isSending && (
            <View style={styles.sendingOverlay}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}
          {wasSent && (
            <View style={styles.sentOverlay}>
              <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
            </View>
          )}
          <Text style={styles.friendName} numberOfLines={1}>
            {item.displayName}
          </Text>
        </PressableScale>
      );
    },
    [sendingTo, sentTo, handleChallenge],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <PressableScale
        onPress={onClose}
        style={styles.backdrop}
        scaleDown={1}
        soundOnPress={false}
      >
        <View />
      </PressableScale>

      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="sword-cross" size={24} color={COLORS.primary} />
          <Text style={styles.title}>Challenge a Friend</Text>
          <PressableScale onPress={onClose} style={styles.closeButton} testID="challenge-sheet-close">
            <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
          </PressableScale>
        </View>

        {/* Sent confirmation */}
        {sentTo && (
          <View style={styles.sentBanner}>
            <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.success} />
            <Text style={styles.sentText}>Challenge sent to {sentTo}!</Text>
          </View>
        )}

        {/* Friend list */}
        {acceptedFriends.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>Add friends to challenge them!</Text>
          </View>
        ) : (
          <FlatList
            data={acceptedFriends}
            renderItem={renderFriend}
            keyExtractor={(item) => item.uid}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.friendList}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.lg,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textMuted,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.heading.md,
    color: COLORS.textPrimary,
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  sentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sentText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.success,
    fontWeight: '600',
  },
  friendList: {
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  friendItem: {
    alignItems: 'center',
    width: 72,
    gap: SPACING.xs,
  },
  friendName: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sendingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BORDER_RADIUS.full,
  },
  sentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BORDER_RADIUS.full,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.xs,
  },
  emptyText: {
    ...TYPOGRAPHY.body.lg,
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textMuted,
  },
});

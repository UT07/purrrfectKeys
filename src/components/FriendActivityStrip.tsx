/**
 * FriendActivityStrip Component
 * Compact horizontal scrolling strip showing recent friend activity.
 * Returns null if no activity is available.
 */

import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useSocialStore } from '../stores/socialStore';
import { CatAvatar } from './Mascot/CatAvatar';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../theme/tokens';
import type { ActivityFeedItem } from '../stores/types';

export interface FriendActivityStripProps {
  maxItems?: number;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatActivityText(item: ActivityFeedItem): string {
  const name = item.friendDisplayName || 'Friend';
  switch (item.type) {
    case 'level_up':
      return `${name} ${item.detail || 'leveled up'}`;
    case 'evolution':
      return `${name} evolved their cat`;
    case 'streak_milestone':
      return `${name} ${item.detail || 'hit a streak milestone'}`;
    case 'song_mastered':
      return `${name} ${item.detail || 'mastered a song'}`;
    case 'league_promoted':
      return `${name} ${item.detail || 'got promoted'}`;
    default:
      return `${name} ${item.detail || 'did something cool'}`;
  }
}

const CARD_WIDTH = 160;
const CARD_HEIGHT = 60;

function ActivityCard({ item }: { item: ActivityFeedItem }) {
  return (
    <View style={styles.card}>
      <CatAvatar
        catId={item.friendCatId || 'mini-meowww'}
        size="small"
        mood="happy"
        skipEntryAnimation
        showGlow={false}
        showTooltipOnTap={false}
      />
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardText} numberOfLines={2}>
          {formatActivityText(item)}
        </Text>
        <Text style={styles.cardTime}>{formatTimeAgo(item.timestamp)}</Text>
      </View>
    </View>
  );
}

export const FriendActivityStrip: React.FC<FriendActivityStripProps> = ({
  maxItems = 10,
}) => {
  const activityFeed = useSocialStore((s) => s.activityFeed);

  const items = useMemo(
    () => activityFeed.slice(0, maxItems),
    [activityFeed, maxItems],
  );

  if (items.length === 0) return null;

  return (
    <View style={styles.container} testID="friend-activity-strip">
      <Text style={styles.header}>Friend Activity</Text>
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ActivityCard item={item} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
  },
  header: {
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  listContent: {
    gap: SPACING.sm,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.surface}CC`,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardText: {
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '500' as const,
    color: COLORS.textPrimary,
  },
  cardTime: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});

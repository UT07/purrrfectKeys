/**
 * Weekly Featured Song Card
 * Shows a deterministically-selected "Song of the Week" on the HomeScreen.
 * Uses date-hash selection similar to challengeSystem.ts.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PressableScale } from './common/PressableScale';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS } from '../theme/tokens';
import type { SongSummary } from '../core/songs/songTypes';

// ---------------------------------------------------------------------------
// Deterministic weekly selection
// ---------------------------------------------------------------------------

/** Returns the ISO week number for a given date. */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Pick a deterministic song index for the current week. */
export function getWeeklyFeaturedIndex(songCount: number, date: Date = new Date()): number {
  if (songCount <= 0) return 0;
  const week = getISOWeek(date);
  const year = date.getFullYear();
  // Simple hash: year * 53 + week ensures no repeat within a year
  return ((year * 53 + week) * 7919) % songCount;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface WeeklyFeaturedSongCardProps {
  song: SongSummary | null;
  onPlay: (songId: string) => void;
}

const DIFFICULTY_LABELS = ['', 'Beginner', 'Easy', 'Medium', 'Hard', 'Expert'];

export function WeeklyFeaturedSongCard({ song, onPlay }: WeeklyFeaturedSongCardProps) {
  if (!song) return null;

  const diffLabel = DIFFICULTY_LABELS[song.metadata.difficulty] ?? '';

  return (
    <PressableScale
      onPress={() => onPlay(song.id)}
      testID="weekly-featured-song"
    >
      <View style={styles.card}>
        {/* Badge */}
        <View style={styles.badge}>
          <MaterialCommunityIcons name="star-circle" size={14} color={COLORS.warning} />
          <Text style={styles.badgeText}>Song of the Week</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="music-circle" size={44} color={COLORS.primary} />
          </View>

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {song.metadata.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {song.metadata.artist}
            </Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>{diffLabel}</Text>
              <Text style={styles.metaDot}>{'\u00B7'}</Text>
              <Text style={styles.metaText}>{song.sectionCount} sections</Text>
              <Text style={styles.metaDot}>{'\u00B7'}</Text>
              <Text style={styles.metaText}>{song.settings.keySignature}</Text>
            </View>
          </View>

          <MaterialCommunityIcons name="play-circle" size={32} color={COLORS.primary} />
        </View>
      </View>
    </PressableScale>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  badgeText: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.warning,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.body.lg,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  artist: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  metaText: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textMuted,
  },
  metaDot: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textMuted,
  },
});

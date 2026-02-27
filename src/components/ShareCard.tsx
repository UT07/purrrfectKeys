/**
 * ShareCard Component
 *
 * Renders a visually appealing card and captures it as an image for sharing.
 * Supports 4 card types: score, streak, evolution, league.
 */

import { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PressableScale } from './common/PressableScale';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, GRADIENTS, SHADOWS } from '../theme/tokens';
import type { ShareCardData } from '../stores/types';

// ---------------------------------------------------------------------------
// Icon mapping per card type
// ---------------------------------------------------------------------------

const CARD_ICONS: Record<ShareCardData['type'], keyof typeof MaterialCommunityIcons.glyphMap> = {
  score: 'star-circle',
  streak: 'fire',
  evolution: 'cat',
  league: 'trophy',
};

const CARD_ICON_COLORS: Record<ShareCardData['type'], string> = {
  score: COLORS.starGold,
  streak: COLORS.streakFlame,
  evolution: COLORS.evolutionGlow,
  league: COLORS.gemDiamond,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ShareCardProps {
  data: ShareCardData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareCard({ data }: ShareCardProps): React.JSX.Element {
  const viewShotRef = useRef<ViewShot>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (isSharing) return;

    try {
      setIsSharing(true);

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
        return;
      }

      const uri = await viewShotRef.current?.capture?.();
      if (!uri) return;

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your achievement',
      });
    } catch {
      // User cancelled or sharing failed — silently ignore
    } finally {
      setIsSharing(false);
    }
  }, [isSharing]);

  const iconName = CARD_ICONS[data.type];
  const iconColor = CARD_ICON_COLORS[data.type];

  return (
    <View style={styles.container}>
      {/* Capturable card */}
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1.0, result: 'tmpfile' }}
        style={styles.viewShot}
      >
        <LinearGradient
          colors={GRADIENTS.cardWarm}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={iconName}
              size={40}
              color={iconColor}
            />
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={1}>
            {data.title}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle} numberOfLines={2}>
            {data.subtitle}
          </Text>

          {/* Large value */}
          <Text style={styles.value}>{data.value}</Text>

          {/* Branding footer */}
          <View style={styles.footer}>
            <MaterialCommunityIcons
              name="music-note-eighth"
              size={14}
              color={COLORS.textMuted}
            />
            <Text style={styles.branding}>Purrrfect Keys</Text>
          </View>
        </LinearGradient>
      </ViewShot>

      {/* Share button */}
      <PressableScale
        onPress={handleShare}
        disabled={isSharing}
        style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
      >
        <MaterialCommunityIcons
          name="share-variant"
          size={18}
          color={COLORS.textPrimary}
        />
        <Text style={styles.shareButtonText}>
          {isSharing ? 'Sharing...' : 'Share'}
        </Text>
      </PressableScale>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  viewShot: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  card: {
    width: 300,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    ...SHADOWS.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.heading.lg,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  value: {
    ...TYPOGRAPHY.special.score,
    color: COLORS.starGold,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  branding: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.textPrimary,
  },
});

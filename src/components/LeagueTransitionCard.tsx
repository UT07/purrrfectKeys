/**
 * LeagueTransitionCard
 *
 * Full-width banner shown at the top of SocialScreen when the user has been
 * promoted or demoted to a new league tier. Uses Reanimated entering animation
 * and auto-dismisses after 5 seconds or on tap.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, glowColor } from '../theme/tokens';
import { LEAGUE_TIER_CONFIG } from '../theme/leagueTiers';
import { PressableScale } from './common/PressableScale';

export interface LeagueTransitionCardProps {
  transition: 'promoted' | 'demoted';
  newTier: string;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 5000;

export function LeagueTransitionCard({
  transition,
  newTier,
  onDismiss,
}: LeagueTransitionCardProps): React.JSX.Element {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const config = LEAGUE_TIER_CONFIG[newTier] ?? LEAGUE_TIER_CONFIG.bronze;
  const isPromotion = transition === 'promoted';

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onDismiss]);

  const bgColor = isPromotion
    ? glowColor(config.color, 0.15)
    : glowColor('#888888', 0.1);

  const borderColor = isPromotion ? config.color : '#666666';

  const iconName = isPromotion ? 'arrow-up-bold-circle' : 'arrow-down-bold-circle';
  const iconColor = isPromotion ? config.color : COLORS.textMuted;

  const title = isPromotion
    ? `Promoted to ${config.label}!`
    : `Dropped to ${config.label}`;

  const subtitle = isPromotion
    ? 'Keep up the great work!'
    : 'Fight back next week!';

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify().damping(18)}
      exiting={FadeOutUp.duration(300)}
    >
      <PressableScale onPress={onDismiss} scaleDown={0.98}>
        <View
          style={[
            styles.card,
            { backgroundColor: bgColor, borderColor },
            Platform.OS === 'ios' && isPromotion && {
              shadowColor: config.color,
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={config.icon}
              size={36}
              color={isPromotion ? config.color : COLORS.textMuted}
            />
          </View>

          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name={iconName} size={18} color={iconColor} />
              <Text
                style={[
                  styles.title,
                  { color: isPromotion ? config.color : COLORS.textSecondary },
                ]}
              >
                {title}
              </Text>
            </View>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          <MaterialCommunityIcons
            name="close"
            size={18}
            color={COLORS.textMuted}
            style={styles.closeIcon}
          />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: glowColor('#FFFFFF', 0.06),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.heading.lg,
  },
  subtitle: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeIcon: {
    marginLeft: SPACING.sm,
  },
});

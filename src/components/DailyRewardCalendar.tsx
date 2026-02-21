/**
 * DailyRewardCalendar — 7-day horizontal reward strip
 *
 * Duolingo-style daily reward row showing:
 * - Past days: checkmark (claimed) or X (missed)
 * - Today: pulsing glow border with claim button
 * - Future days: reward preview
 */

import { useCallback } from 'react';
import type { ReactElement } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme/tokens';
import type { DailyRewardDay } from '../stores/types';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DailyRewardCalendarProps {
  days: DailyRewardDay[];
  currentDay: number; // 1-7
  onClaim: (day: number) => void;
}

function RewardIcon({ type, size = 16 }: { type: DailyRewardDay['reward']['type']; size?: number }): ReactElement {
  switch (type) {
    case 'gems':
      return <MaterialCommunityIcons name="diamond-stone" size={size} color={COLORS.gemGold} />;
    case 'xp_boost':
      return <MaterialCommunityIcons name="lightning-bolt" size={size} color="#FF9800" />;
    case 'streak_freeze':
      return <MaterialCommunityIcons name="snowflake" size={size} color="#42A5F5" />;
    case 'chest':
      return <MaterialCommunityIcons name="treasure-chest" size={size} color={COLORS.gemGold} />;
  }
}

function DayCell({
  day,
  isToday,
  isClaimed,
  isPast,
  onClaim,
}: {
  day: DailyRewardDay;
  isToday: boolean;
  isClaimed: boolean;
  isPast: boolean;
  onClaim: () => void;
}): ReactElement {
  const glowOpacity = useSharedValue(0.3);

  // Pulsing glow for today's reward
  if (isToday && !isClaimed) {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(255, 215, 0, ${glowOpacity.value})`,
  }));

  const handlePress = useCallback(() => {
    if (isToday && !isClaimed) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onClaim();
    }
  }, [isToday, isClaimed, onClaim]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!isToday || isClaimed}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.dayCell,
          isClaimed && styles.dayCellClaimed,
          isToday && !isClaimed && styles.dayCellToday,
          isToday && !isClaimed && glowStyle,
          isPast && !isClaimed && styles.dayCellMissed,
        ]}
      >
        <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
          {DAY_LABELS[day.day - 1]}
        </Text>

        {isClaimed ? (
          <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} />
        ) : isPast ? (
          <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textMuted} />
        ) : (
          <RewardIcon type={day.reward.type} />
        )}

        <Text style={[
          styles.rewardAmount,
          isClaimed && styles.rewardAmountClaimed,
          isPast && !isClaimed && styles.rewardAmountMissed,
        ]}>
          {day.reward.type === 'xp_boost' ? '2x' :
           day.reward.type === 'streak_freeze' ? '1' :
           day.reward.amount}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function DailyRewardCalendar({
  days,
  currentDay,
  onClaim,
}: DailyRewardCalendarProps): ReactElement {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="calendar-star" size={18} color={COLORS.gemGold} />
        <Text style={styles.title}>Daily Rewards</Text>
      </View>
      <View style={styles.daysRow}>
        {days.map((day) => (
          <DayCell
            key={day.day}
            day={day}
            isToday={day.day === currentDay}
            isClaimed={day.claimed}
            isPast={day.day < currentDay}
            onClaim={() => onClaim(day.day)}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayCell: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: 6,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 42,
    gap: 4,
  },
  dayCellClaimed: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  dayCellToday: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 2,
  },
  dayCellMissed: {
    opacity: 0.4,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  dayLabelToday: {
    color: COLORS.gemGold,
    fontWeight: '800',
  },
  rewardAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  rewardAmountClaimed: {
    color: COLORS.success,
  },
  rewardAmountMissed: {
    color: COLORS.textMuted,
  },
});

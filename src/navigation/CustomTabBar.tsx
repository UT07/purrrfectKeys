/**
 * CustomTabBar
 *
 * Polished bottom tab bar replacing the default React Navigation tab bar.
 * Features animated icon scaling, dot indicator, and haptic feedback.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, glowColor } from '../theme/tokens';
import { PressableScale } from '../components/common/PressableScale';
import { useSocialStore } from '../stores/socialStore';
import { useAuthStore } from '../stores/authStore';

// ---------------------------------------------------------------------------
// Icon config per tab route
// ---------------------------------------------------------------------------

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface TabIconConfig {
  active: IconName;
  inactive: IconName;
}

const TAB_ICONS: Record<string, TabIconConfig> = {
  Home: { active: 'home', inactive: 'home' },
  Learn: { active: 'map-marker-path', inactive: 'map-marker-path' },
  Songs: { active: 'music-note', inactive: 'music-note-outline' },
  Social: { active: 'account-group', inactive: 'account-group-outline' },
  Profile: { active: 'account-circle', inactive: 'account-circle-outline' },
};

const ICON_SIZE = 26;
const TAB_BAR_HEIGHT = 64;
const INDICATOR_WIDTH = 24;
const INDICATOR_HEIGHT = 3;
const INDICATOR_OFFSET = 6;

const SPRING_CONFIG = { damping: 12, stiffness: 200 };
const TIMING_CONFIG = { duration: 200 };

// ---------------------------------------------------------------------------
// Individual tab button
// ---------------------------------------------------------------------------

interface TabButtonProps {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
  badgeCount?: number;
}

function TabButton({
  routeName,
  isFocused,
  onPress,
  onLongPress,
  testID,
  badgeCount,
}: TabButtonProps): React.ReactElement {
  const iconConfig = TAB_ICONS[routeName] ?? TAB_ICONS.Home;

  const iconAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(isFocused ? 1.2 : 1.0, SPRING_CONFIG) },
        { translateY: withSpring(isFocused ? -2 : 0, SPRING_CONFIG) },
      ],
    };
  }, [isFocused]);

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isFocused ? 1 : 0, TIMING_CONFIG),
      transform: [
        { scaleX: withSpring(isFocused ? 1 : 0.3, SPRING_CONFIG) },
      ],
    };
  }, [isFocused]);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={routeName}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
      testID={testID}
      scaleDown={0.9}
      soundOnPress={false}
    >
      <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
        <MaterialCommunityIcons
          name={isFocused ? iconConfig.active : iconConfig.inactive}
          size={ICON_SIZE}
          color={isFocused ? COLORS.primary : COLORS.textMuted}
          testID={`tab-icon-${routeName}`}
        />
        {isFocused && (
          <View style={styles.iconGlow} />
        )}
        {badgeCount != null && badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
          </View>
        )}
      </Animated.View>
      <Animated.View style={[styles.indicator, indicatorAnimatedStyle]} />
    </PressableScale>
  );
}

// ---------------------------------------------------------------------------
// Custom tab bar
// ---------------------------------------------------------------------------

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps): React.ReactElement {
  const insets = useSafeAreaInsets();

  // Count pending challenges where current user is the recipient
  const myUid = useAuthStore((s) => s.user?.uid);
  const pendingChallengeCount = useSocialStore((s) =>
    s.challenges.filter((c) => c.status === 'pending' && c.toUid === myUid).length,
  );

  // Count pending incoming friend requests
  const pendingFriendCount = useSocialStore((s) =>
    s.friends.filter((f) => f.status === 'pending_incoming').length,
  );

  const socialBadge = pendingChallengeCount + pendingFriendCount;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom },
      ]}
      testID="custom-tab-bar"
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const testID =
          (options as Record<string, unknown>).tabBarButtonTestID as
            | string
            | undefined;

        const onPress = (): void => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = (): void => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TabButton
            key={route.key}
            routeName={route.name}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            testID={testID}
            badgeCount={route.name === 'Social' ? socialBadge : undefined}
          />
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    backgroundColor: glowColor(COLORS.surface, 0.92),
    borderTopWidth: 1,
    borderTopColor: glowColor(COLORS.textPrimary, 0.06),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    opacity: 0.12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {},
    }),
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  indicator: {
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    borderRadius: INDICATOR_HEIGHT / 2,
    backgroundColor: COLORS.primary,
    marginTop: INDICATOR_OFFSET,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOpacity: 0.6,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 0 },
      },
      default: {
        elevation: 2,
      },
    }),
  },
});

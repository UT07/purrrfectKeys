/**
 * Badge Component
 * Small labeled indicator for status, tags, or notifications
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS as THEME_COLORS, glowColor } from '../../theme/tokens';

export type BadgeVariant = 'primary' | 'success' | 'danger' | 'warning';
export type BadgeSize = 'small' | 'medium' | 'large';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const BADGE_COLORS = {
  primary: {
    background: glowColor(THEME_COLORS.primary, 0.15),
    text: THEME_COLORS.primary,
  },
  success: {
    background: glowColor(THEME_COLORS.success, 0.15),
    text: THEME_COLORS.success,
  },
  danger: {
    background: glowColor(THEME_COLORS.error, 0.15),
    text: THEME_COLORS.error,
  },
  warning: {
    background: glowColor(THEME_COLORS.warning, 0.15),
    text: THEME_COLORS.warning,
  },
};

const SIZES = {
  small: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 4 },
  medium: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 5 },
  large: { fontSize: 13, paddingHorizontal: 12, paddingVertical: 6 },
};

/**
 * Badge Component
 * Used for displaying status labels, tags, or notifications
 */
export const Badge = React.memo(
  ({
    label,
    variant = 'primary',
    size = 'medium',
    style,
    textStyle,
  }: BadgeProps) => {
    const colors = BADGE_COLORS[variant];
    const sizeStyle = SIZES[size];

    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: colors.background,
            paddingHorizontal: sizeStyle.paddingHorizontal,
            paddingVertical: sizeStyle.paddingVertical,
            borderRadius: sizeStyle.fontSize + 4,
          },
          style,
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              fontSize: sizeStyle.fontSize,
              color: colors.text,
            },
            textStyle,
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }
);

Badge.displayName = 'Badge';

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

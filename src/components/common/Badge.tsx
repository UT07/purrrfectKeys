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

export type BadgeVariant = 'primary' | 'success' | 'danger' | 'warning';
export type BadgeSize = 'small' | 'medium' | 'large';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const COLORS = {
  primary: {
    background: 'rgba(220, 20, 60, 0.15)',
    text: '#DC143C',
  },
  success: {
    background: 'rgba(76, 175, 80, 0.15)',
    text: '#4CAF50',
  },
  danger: {
    background: 'rgba(244, 67, 54, 0.15)',
    text: '#F44336',
  },
  warning: {
    background: 'rgba(255, 152, 0, 0.15)',
    text: '#FF9800',
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
    const colors = COLORS[variant];
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

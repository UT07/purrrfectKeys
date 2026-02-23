/**
 * Button Component
 * Reusable button with multiple variants and sizes
 */

import React, { useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

import { COLORS as THEME_COLORS, BORDER_RADIUS } from '../../theme/tokens';

const BTN_COLORS = {
  primary: THEME_COLORS.primary,
  secondary: THEME_COLORS.cardSurface,
  danger: THEME_COLORS.error,
  outline: THEME_COLORS.primary,
  text: THEME_COLORS.textPrimary,
  outlineText: THEME_COLORS.primary,
  disabled: THEME_COLORS.starEmpty,
  disabledText: THEME_COLORS.textMuted,
};

const SIZES = {
  small: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 12 },
  medium: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 14 },
  large: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 16 },
};

/**
 * Button Component
 * Supports different variants (primary, secondary, danger, outline)
 * and sizes (small, medium, large)
 */
export const Button = React.memo(
  ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    icon,
    style,
    testID,
  }: ButtonProps) => {
    const scaleValue = useSharedValue(1);

    const handlePressIn = useCallback(() => {
      scaleValue.value = withTiming(0.95, {
        duration: 100,
        easing: Easing.out(Easing.cubic),
      });
    }, [scaleValue]);

    const handlePressOut = useCallback(() => {
      scaleValue.value = withTiming(1, {
        duration: 100,
        easing: Easing.out(Easing.cubic),
      });
    }, [scaleValue]);

    const handlePress = useCallback(() => {
      if (!disabled && !loading) {
        onPress();
      }
    }, [disabled, loading, onPress]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scaleValue.value }],
    }));

    const getBackgroundColor = () => {
      if (disabled) return BTN_COLORS.disabled;
      switch (variant) {
        case 'primary':
          return BTN_COLORS.primary;
        case 'secondary':
          return BTN_COLORS.secondary;
        case 'danger':
          return BTN_COLORS.danger;
        case 'outline':
          return 'transparent';
        default:
          return BTN_COLORS.primary;
      }
    };

    const getTextColor = () => {
      if (disabled) return BTN_COLORS.disabledText;
      return variant === 'outline' ? BTN_COLORS.outlineText : BTN_COLORS.text;
    };

    const sizeStyle = SIZES[size];
    const backgroundColor = getBackgroundColor();
    const textColor = getTextColor();

    return (
      <Animated.View style={[animatedStyle, style]}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={0.8}
          testID={testID}
          style={[
            styles.button,
            {
              backgroundColor,
              paddingVertical: sizeStyle.paddingVertical,
              paddingHorizontal: sizeStyle.paddingHorizontal,
              borderWidth: variant === 'outline' ? 2 : 0,
              borderColor:
                variant === 'outline' ? BTN_COLORS.outline : 'transparent',
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={textColor} size="small" />
          ) : (
            <Text
              style={[
                styles.buttonText,
                {
                  fontSize: sizeStyle.fontSize,
                  color: textColor,
                },
              ]}
            >
              {icon && <>{icon} </>}
              {title}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

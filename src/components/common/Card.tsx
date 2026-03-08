/**
 * Card Component
 * Container component for content sections
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING } from '../../theme/tokens';
import { PressableScale } from './PressableScale';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevated?: boolean;
  padding?: 'none' | 'small' | 'medium' | 'large';
  testID?: string;
}

const PADDING = {
  none: 0,
  small: SPACING.sm,
  medium: SPACING.md,
  large: SPACING.lg,
};

/**
 * Card Component
 * Container with optional elevation and customizable padding
 */
export const Card = React.memo(
  ({
    children,
    style,
    onPress,
    elevated = false,
    padding = 'medium',
    testID,
  }: CardProps) => {
    const Content = (
      <View
        style={[
          styles.card,
          elevated && styles.elevated,
          {
            padding: PADDING[padding],
          },
          style,
        ]}
        testID={testID}
      >
        {children}
      </View>
    );

    if (onPress) {
      return (
        <PressableScale onPress={onPress}>
          {Content}
        </PressableScale>
      );
    }

    return Content;
  }
);

Card.displayName = 'Card';

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  elevated: {
    ...SHADOWS.sm,
  },
});

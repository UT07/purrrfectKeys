/**
 * Card Component
 * Container component for content sections
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TouchableOpacity,
} from 'react-native';

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
  small: 8,
  medium: 12,
  large: 16,
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
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {Content}
        </TouchableOpacity>
      );
    }

    return Content;
  }
);

Card.displayName = 'Card';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

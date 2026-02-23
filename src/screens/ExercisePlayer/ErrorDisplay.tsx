/**
 * ErrorDisplay Component
 * Shows error messages with actionable recovery options
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../../theme/tokens';

export interface ErrorDisplayProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onClose?: () => void;
  testID?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title,
  message,
  onRetry,
  onClose,
  testID,
}) => {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.card}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.actions}>
          {onRetry && (
            <Pressable
              style={[styles.button, styles.retryButton]}
              onPress={onRetry}
              testID={testID && `${testID}-retry`}
            >
              <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
          )}

          {onClose && (
            <Pressable
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
              testID={testID && `${testID}-close`}
            >
              <Text style={styles.buttonText}>Close</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

ErrorDisplay.displayName = 'ErrorDisplay';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceOverlay,
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  icon: {
    fontSize: 48,
    marginBottom: SPACING.sm + 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.error,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm + 4,
  },
  button: {
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    minWidth: 100,
  },
  retryButton: {
    backgroundColor: COLORS.info,
  },
  closeButton: {
    backgroundColor: COLORS.feedbackDefault,
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

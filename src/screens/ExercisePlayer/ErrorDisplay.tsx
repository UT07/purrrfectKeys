/**
 * ErrorDisplay Component
 * Shows error messages with actionable recovery options
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
  },
  retryButton: {
    backgroundColor: '#1976D2',
  },
  closeButton: {
    backgroundColor: '#757575',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

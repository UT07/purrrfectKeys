/**
 * EmailAuthScreen
 * Email sign-in / sign-up with forgot password support
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../stores/authStore';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, GRADIENTS } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Mode = 'signIn' | 'signUp';

export function EmailAuthScreen(): React.ReactElement {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'EmailAuth'>>();
  const isLinking = route.params?.isLinking ?? false;
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const linkWithEmail = useAuthStore((s) => s.linkWithEmail);
  const sendPasswordReset = useAuthStore((s) => s.sendPasswordReset);
  const clearError = useAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const validate = useCallback((): boolean => {
    setValidationError(null);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email address');
      return false;
    }
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return false;
    }
    if (mode === 'signUp' && displayName.trim().length < 2) {
      setValidationError('Display name must be at least 2 characters');
      return false;
    }
    return true;
  }, [email, password, displayName, mode]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    clearError();

    if (isLinking) {
      // Link anonymous account with email credentials (preserves progress)
      await linkWithEmail(email, password);
    } else if (mode === 'signIn') {
      await signInWithEmail(email, password);
    } else {
      await signUpWithEmail(email, password, displayName.trim());
    }
  }, [mode, email, password, displayName, isLinking, validate, clearError, signInWithEmail, signUpWithEmail, linkWithEmail]);

  const handleForgotPassword = useCallback(async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Enter Email', 'Please enter your email address first.');
      return;
    }
    await sendPasswordReset(email);
    // Check if reset succeeded (sendPasswordReset sets error on failure)
    const storeError = useAuthStore.getState().error;
    if (storeError) {
      Alert.alert('Reset Failed', storeError);
    } else {
      Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
    }
  }, [email, sendPasswordReset]);

  const switchMode = useCallback((newMode: Mode) => {
    setMode(newMode);
    setValidationError(null);
    clearError();
  }, [clearError]);

  const displayError = validationError || error;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={GRADIENTS.heroGlow}
        style={styles.headerGradient}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          testID="email-auth-back"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isLinking ? 'Link Account' : 'Welcome Back'}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID="email-auth-screen"
      >

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'signIn' && styles.activeTab]}
            onPress={() => switchMode('signIn')}
          >
            <Text style={[styles.tabText, mode === 'signIn' && styles.activeTabText]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'signUp' && styles.activeTab]}
            onPress={() => switchMode('signUp')}
          >
            <Text style={[styles.tabText, mode === 'signUp' && styles.activeTabText]}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            testID="email-input"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            testID="password-input"
          />
          {mode === 'signUp' && (
            <TextInput
              style={styles.input}
              placeholder="Display Name"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
              value={displayName}
              onChangeText={setDisplayName}
              testID="displayname-input"
            />
          )}

          {displayError && (
            <Text style={styles.errorText} testID="error-text">{displayError}</Text>
          )}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isLoading}
            testID="submit-button"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'signIn' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {mode === 'signIn' && (
            <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword} testID="forgot-password">
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  tab: {
    paddingBottom: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    ...TYPOGRAPHY.heading.md,
    color: COLORS.textMuted,
  },
  activeTabText: {
    color: COLORS.textPrimary,
  },
  form: {
    gap: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...TYPOGRAPHY.body.lg,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  errorText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.error,
    marginTop: -4,
  },
  submitButton: {
    ...SHADOWS.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitText: {
    ...TYPOGRAPHY.button.lg,
    color: COLORS.textPrimary,
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  forgotText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
  },
});

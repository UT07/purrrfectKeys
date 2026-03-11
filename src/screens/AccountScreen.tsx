/**
 * AccountScreen
 * Account management: profile editing, provider linking, sign out, delete.
 * Different layouts for authenticated vs anonymous users.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CatAvatar } from '../components/Mascot/CatAvatar';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { GoogleAuthProvider, OAuthProvider, EmailAuthProvider } from 'firebase/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS, glowColor } from '../theme/tokens';
import { PressableScale } from '../components/common/PressableScale';
import { GradientMeshBackground } from '../components/effects';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { logger } from '../utils/logger';

function isGoogleAuthAvailable(): boolean {
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    return GoogleSignin != null && typeof GoogleSignin.signIn === 'function';
  } catch {
    return false;
  }
}

function isAppleAuthAvailable(): boolean {
  try {
    const AppleAuth = require('expo-apple-authentication');
    return AppleAuth.isAvailableAsync != null;
  } catch {
    return false;
  }
}

type AccountNavProp = NativeStackNavigationProp<RootStackParamList>;

export function AccountScreen(): React.ReactElement {
  const navigation = useNavigation<AccountNavProp>();
  const user = useAuthStore((s) => s.user);
  const isAnonymous = useAuthStore((s) => s.isAnonymous);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const authSignOut = useAuthStore((s) => s.signOut);
  const authDeleteAccount = useAuthStore((s) => s.deleteAccount);
  const authUpdateDisplayName = useAuthStore((s) => s.updateDisplayName);
  const clearError = useAuthStore((s) => s.clearError);

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName ?? '');

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your local progress will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await authSignOut();
          },
        },
      ]
    );
  }, [authSignOut]);

  const handleReauthAndDelete = useCallback(async () => {
    const reauthAndDelete = useAuthStore.getState().reauthenticateAndDelete;

    // Determine provider
    const providers = user?.providerData?.map(p => p.providerId) ?? [];

    if (providers.some(p => p === 'google.com')) {
      try {
        if (!isGoogleAuthAvailable()) {
          Alert.alert('Error', 'Google Sign-In is not available.');
          return;
        }
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();
        if (response.type === 'cancelled') return;
        const idToken = response.data?.idToken;
        if (!idToken) return;
        const credential = GoogleAuthProvider.credential(idToken);
        await reauthAndDelete(credential);
      } catch (err) {
        logger.warn('[AccountScreen] Google re-auth failed:', err);
        Alert.alert('Re-authentication Failed', 'Please try again.');
      }
    } else if (providers.some(p => p === 'apple.com')) {
      try {
        if (!isAppleAuthAvailable()) {
          Alert.alert('Error', 'Apple Sign-In is not available.');
          return;
        }
        const AppleAuth = require('expo-apple-authentication');
        const crypto = require('expo-crypto');
        const rawNonce = Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18);
        const hashedNonce = await crypto.digestStringAsync(
          crypto.CryptoDigestAlgorithm.SHA256,
          rawNonce
        );
        const cred = await AppleAuth.signInAsync({
          requestedScopes: [AppleAuth.AppleAuthenticationScope.EMAIL],
          nonce: hashedNonce,
        });
        if (cred.identityToken) {
          const provider = new OAuthProvider('apple.com');
          const credential = provider.credential({
            idToken: cred.identityToken,
            rawNonce,
          });
          await reauthAndDelete(credential);
        }
      } catch (err) {
        logger.warn('[AccountScreen] Apple re-auth failed:', err);
        Alert.alert('Re-authentication Failed', 'Please try again.');
      }
    } else if (providers.includes('password')) {
      Alert.prompt(
        'Re-authenticate',
        'Enter your password to confirm account deletion.',
        async (password) => {
          if (!password || !user?.email) return;
          const credential = EmailAuthProvider.credential(user.email, password);
          await reauthAndDelete(credential);
        },
        'secure-text'
      );
    } else {
      Alert.alert('Error', 'Unable to determine sign-in method for re-authentication.');
    }
  }, [user]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all progress, cats, and gems. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            const result = await authDeleteAccount();
            if (result === 'REQUIRES_REAUTH') {
              Alert.alert(
                'Verify Your Identity',
                'For security, you need to sign in one more time to confirm the deletion. Your account will be deleted immediately after.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign In to Delete', style: 'destructive', onPress: handleReauthAndDelete },
                ]
              );
            }
          },
        },
      ]
    );
  }, [authDeleteAccount, handleReauthAndDelete]);

  const handleSaveName = useCallback(async () => {
    if (newName.trim().length < 2) return;
    await authUpdateDisplayName(newName.trim());
    setIsEditingName(false);
  }, [newName, authUpdateDisplayName]);

  const handleLinkGoogle = useCallback(async () => {
    if (!isGoogleAuthAvailable()) {
      Alert.alert('Coming Soon', 'Google Sign-In is not yet configured for this build.');
      return;
    }

    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === 'cancelled') return;
      const idToken = response.data?.idToken;
      if (!idToken) {
        Alert.alert('Link Failed', 'No authentication token received. Please try again.');
        return;
      }
      await useAuthStore.getState().linkWithGoogle(idToken);
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (errObj.code === 'SIGN_IN_CANCELLED') return;

      // If credential belongs to an existing account, offer to sign in instead
      if (errObj.code === 'auth/credential-already-in-use') {
        try {
          const { GoogleSignin } = require('@react-native-google-signin/google-signin');
          const resp = await GoogleSignin.signIn();
          if (resp.type === 'cancelled') return;
          const token = resp.data?.idToken;
          if (!token) return;
          const credential = GoogleAuthProvider.credential(token);
          Alert.alert(
            'Account Already Exists',
            'This Google account is already registered. Sign in to your existing account? Your guest progress will be replaced.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign In',
                onPress: () => useAuthStore.getState().signInReplacingAnonymous(credential),
              },
            ],
          );
        } catch { /* user cancelled re-auth */ }
        return;
      }

      logger.warn('[AccountScreen] Google link error:', err);
      Alert.alert('Link Failed', errObj.message ?? 'Google linking failed. Please try again.');
    }
  }, []);

  const handleLinkApple = useCallback(async () => {
    if (!isAppleAuthAvailable()) {
      Alert.alert('Coming Soon', 'Apple Sign-In is not yet configured for this build.');
      return;
    }

    try {
      const AppleAuth = require('expo-apple-authentication');
      const crypto = require('expo-crypto');
      // Generate a random raw nonce, then SHA256 hash it for Apple.
      // Firebase expects the RAW nonce; Apple receives the hash.
      const rawNonce = Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18);
      const hashedNonce = await crypto.digestStringAsync(
        crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );
      const cred = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (cred.identityToken) {
        await useAuthStore.getState().linkWithApple(cred.identityToken, rawNonce);
      }
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (errObj.code === 'ERR_REQUEST_CANCELED') return;

      // If credential belongs to an existing account, offer to sign in instead
      if (errObj.code === 'auth/credential-already-in-use') {
        try {
          const AppleAuth = require('expo-apple-authentication');
          const crypto = require('expo-crypto');
          const rawNonce2 = Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18);
          const hashedNonce2 = await crypto.digestStringAsync(
            crypto.CryptoDigestAlgorithm.SHA256,
            rawNonce2,
          );
          const cred2 = await AppleAuth.signInAsync({
            requestedScopes: [AppleAuth.AppleAuthenticationScope.EMAIL],
            nonce: hashedNonce2,
          });
          if (cred2.identityToken) {
            const provider = new OAuthProvider('apple.com');
            const credential = provider.credential({
              idToken: cred2.identityToken,
              rawNonce: rawNonce2,
            });
            Alert.alert(
              'Account Already Exists',
              'This Apple account is already registered. Sign in to your existing account? Your guest progress will be replaced.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign In',
                  onPress: () => useAuthStore.getState().signInReplacingAnonymous(credential),
                },
              ],
            );
          }
        } catch { /* user cancelled re-auth */ }
        return;
      }

      logger.warn('[AccountScreen] Apple link error:', err);
      Alert.alert('Link Failed', errObj.message ?? 'Apple linking failed. Please try again.');
    }
  }, []);

  const handleSignInGoogle = useCallback(async () => {
    if (!isGoogleAuthAvailable()) {
      Alert.alert('Coming Soon', 'Google Sign-In is not yet configured for this build.');
      return;
    }
    try {
      const { GoogleSignin } = require('@react-native-google-signin/google-signin');
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === 'cancelled') return;
      const idToken = response.data?.idToken;
      if (!idToken) return;
      const credential = GoogleAuthProvider.credential(idToken);
      await useAuthStore.getState().signInReplacingAnonymous(credential);
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (errObj.code === 'SIGN_IN_CANCELLED') return;
      logger.warn('[AccountScreen] Google sign-in error:', err);
      Alert.alert('Sign In Failed', errObj.message ?? 'Google sign-in failed. Please try again.');
    }
  }, []);

  const handleSignInApple = useCallback(async () => {
    if (!isAppleAuthAvailable()) {
      Alert.alert('Coming Soon', 'Apple Sign-In is not yet configured for this build.');
      return;
    }
    try {
      const AppleAuth = require('expo-apple-authentication');
      const crypto = require('expo-crypto');
      const rawNonce = Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18);
      const hashedNonce = await crypto.digestStringAsync(
        crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const cred = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (cred.identityToken) {
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({
          idToken: cred.identityToken,
          rawNonce,
        });
        await useAuthStore.getState().signInReplacingAnonymous(credential);
      }
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      if (errObj.code === 'ERR_REQUEST_CANCELED') return;
      logger.warn('[AccountScreen] Apple sign-in error:', err);
      Alert.alert('Sign In Failed', errObj.message ?? 'Apple sign-in failed. Please try again.');
    }
  }, []);

  const selectedCatId = useSettingsStore((s) => s.selectedCatId);

  // Anonymous user → show account linking CTA
  if (isAnonymous) {
    return (
      <View style={styles.container}>
        <GradientMeshBackground accent="profile" />
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} testID="account-screen">
        <PressableScale style={styles.backButton} onPress={() => navigation.goBack()} testID="account-back">
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </PressableScale>

        <View style={styles.anonHero}>
          <CatAvatar catId={selectedCatId ?? 'mini-meowww'} size="large" skipEntryAnimation />
          <Text style={styles.anonTitle}>Create an account to save your progress across devices!</Text>
        </View>

        <View style={styles.linkButtons}>
          {Platform.OS === 'ios' && (
            <PressableScale
              style={[styles.linkButton, styles.appleLink]}
              onPress={handleLinkApple}
              testID="account-link-apple"
            >
              <Text style={[styles.linkButtonText, { color: COLORS.background }]}>Link with Apple</Text>
            </PressableScale>
          )}
          <PressableScale
            style={[styles.linkButton, styles.googleLink]}
            onPress={handleLinkGoogle}
            testID="account-link-google"
          >
            <Text style={styles.linkButtonText}>Link with Google</Text>
          </PressableScale>
          <PressableScale
            style={[styles.linkButton, styles.emailLink]}
            onPress={() => navigation.navigate('EmailAuth', { isLinking: true })}
            testID="account-link-email"
          >
            <Text style={styles.linkButtonText}>Link with Email</Text>
          </PressableScale>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.signInSection}>
          <Text style={styles.signInTitle}>Already have an account?</Text>
          <Text style={styles.signInSubtitle}>Sign in to your existing account. Guest progress will be replaced.</Text>

          {Platform.OS === 'ios' && (
            <PressableScale
              style={[styles.signInButton]}
              onPress={handleSignInApple}
              testID="account-signin-apple"
            >
              <Text style={styles.signInButtonText}>Sign in with Apple</Text>
            </PressableScale>
          )}
          <PressableScale
            style={[styles.signInButton]}
            onPress={handleSignInGoogle}
            testID="account-signin-google"
          >
            <Text style={styles.signInButtonText}>Sign in with Google</Text>
          </PressableScale>
          <PressableScale
            style={[styles.signInButton]}
            onPress={() => navigation.navigate('EmailAuth', { isLinking: false })}
            testID="account-signin-email"
          >
            <Text style={styles.signInButtonText}>Sign in with Email</Text>
          </PressableScale>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Your progress is saved locally.</Text>
          <Text style={styles.infoBody}>
            Without an account, you'll lose it if you reinstall the app.
          </Text>
        </View>

        <View style={styles.dangerSection}>
          <PressableScale
            style={styles.dangerRow}
            onPress={handleDeleteAccount}
            disabled={isLoading}
            testID="account-delete-anon"
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.error} />
            ) : (
              <Text style={styles.dangerText}>Delete Guest Account</Text>
            )}
          </PressableScale>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
      </View>
    );
  }

  // Determine linked providers
  const linkedProviders = user?.providerData?.map((p: { providerId: string }) => p.providerId) ?? [];
  const isGoogleLinked = linkedProviders.some(p => p === 'google.com');
  const isAppleLinked = linkedProviders.some(p => p === 'apple.com');

  // Authenticated user → full account management
  return (
    <View style={styles.container}>
      <GradientMeshBackground accent="profile" />
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} testID="account-screen">
      <PressableScale style={styles.backButton} onPress={() => navigation.goBack()} testID="account-back">
        <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
      </PressableScale>

      {/* Centered profile hero */}
      <View style={styles.profileHeader}>
        <CatAvatar catId={selectedCatId ?? 'mini-meowww'} size="large" skipEntryAnimation />
        {isEditingName ? (
          <View style={styles.nameEdit}>
            <TextInput
              style={styles.nameInput}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              maxLength={30}
            />
            <View style={styles.nameEditActions}>
              <PressableScale onPress={handleSaveName} style={styles.nameEditBtn}>
                <Text style={styles.saveText}>Save</Text>
              </PressableScale>
              <PressableScale onPress={() => setIsEditingName(false)} style={styles.nameEditBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </PressableScale>
            </View>
          </View>
        ) : (
          <PressableScale onPress={() => setIsEditingName(true)}>
            <Text style={styles.displayName}>{user?.displayName ?? 'Unknown'}</Text>
          </PressableScale>
        )}
        <Text style={styles.email}>{user?.email ?? ''}</Text>
      </View>

      {error && (
        <PressableScale onPress={clearError}>
          <Text style={styles.errorText}>{error}</Text>
        </PressableScale>
      )}

      {/* Profile section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <PressableScale style={styles.row} onPress={() => setIsEditingName(true)}>
          <View style={styles.rowLeft}>
            <MaterialCommunityIcons name="pencil-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.rowText}>Change Display Name</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textMuted} />
        </PressableScale>
      </View>

      {/* Linked Accounts section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Linked Accounts</Text>
        <PressableScale style={styles.row} onPress={handleLinkGoogle}>
          <View style={styles.rowLeft}>
            <MaterialCommunityIcons name="google" size={20} color={COLORS.textSecondary} />
            <Text style={styles.rowText}>Google</Text>
          </View>
          <View style={styles.rowRight}>
            {isGoogleLinked ? (
              <View style={styles.linkedBadge}>
                <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
                <Text style={styles.linkedText}>Linked</Text>
              </View>
            ) : (
              <Text style={styles.rowAction}>Link</Text>
            )}
            <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textMuted} />
          </View>
        </PressableScale>
        {Platform.OS === 'ios' && (
          <PressableScale style={styles.row} onPress={handleLinkApple}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="apple" size={20} color={COLORS.textSecondary} />
              <Text style={styles.rowText}>Apple</Text>
            </View>
            <View style={styles.rowRight}>
              {isAppleLinked ? (
                <View style={styles.linkedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
                  <Text style={styles.linkedText}>Linked</Text>
                </View>
              ) : (
                <Text style={styles.rowAction}>Link</Text>
              )}
              <MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textMuted} />
            </View>
          </PressableScale>
        )}
      </View>

      {/* Danger Zone section */}
      <View style={styles.dangerCard}>
        <View style={styles.dangerTitleRow}>
          <MaterialCommunityIcons name="shield-alert" size={16} color={COLORS.error} />
          <Text style={[styles.sectionTitle, styles.dangerSectionTitle]}>Danger Zone</Text>
        </View>
        <PressableScale
          style={styles.dangerRow}
          onPress={handleSignOut}
          disabled={isLoading}
          testID="account-signout"
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.error} />
          ) : (
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="logout" size={20} color={COLORS.error} />
              <Text style={styles.dangerText}>Sign Out</Text>
            </View>
          )}
        </PressableScale>
        <PressableScale
          style={[styles.dangerRow, styles.dangerRowLast]}
          onPress={handleDeleteAccount}
          disabled={isLoading}
          testID="account-delete"
        >
          <View style={styles.rowLeft}>
            <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.error} />
            <Text style={[styles.dangerText, styles.deleteText]}>Delete Account</Text>
          </View>
        </PressableScale>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: 40 },
  backButton: { marginBottom: SPACING.lg },
  backText: { ...TYPOGRAPHY.body.md, color: COLORS.primary, fontWeight: '600' },
  // Anonymous hero
  anonHero: { alignItems: 'center', marginBottom: SPACING.xl },
  anonTitle: { ...TYPOGRAPHY.body.lg, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.md, lineHeight: 26 },
  linkButtons: { gap: SPACING.md, marginBottom: SPACING.md },
  linkButton: { height: 52, borderRadius: BORDER_RADIUS.lg, justifyContent: 'center', alignItems: 'center', ...SHADOWS.sm },
  appleLink: { backgroundColor: COLORS.textPrimary },
  googleLink: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder },
  emailLink: { backgroundColor: COLORS.primary },
  linkButtonText: { ...TYPOGRAPHY.body.md, fontWeight: '700', color: COLORS.textPrimary },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.cardBorder },
  dividerText: { ...TYPOGRAPHY.body.sm, color: COLORS.textMuted, marginHorizontal: SPACING.sm },
  signInSection: { marginBottom: SPACING.lg, gap: SPACING.sm },
  signInTitle: { ...TYPOGRAPHY.body.md, color: COLORS.textPrimary, fontWeight: '600' },
  signInSubtitle: { ...TYPOGRAPHY.body.sm, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  signInButton: { height: 48, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder },
  signInButtonText: { ...TYPOGRAPHY.body.md, fontWeight: '600', color: COLORS.textSecondary },
  infoBox: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: SPACING.md },
  infoTitle: { ...TYPOGRAPHY.body.md, color: COLORS.textPrimary, fontWeight: '600' },
  infoBody: { ...TYPOGRAPHY.body.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  // Authenticated — centered profile hero
  profileHeader: { alignItems: 'center', marginBottom: SPACING.xl, gap: SPACING.sm },
  displayName: { ...TYPOGRAPHY.heading.lg, color: COLORS.textPrimary, textAlign: 'center' },
  email: { ...TYPOGRAPHY.body.sm, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  nameEdit: { alignItems: 'center', gap: SPACING.sm, width: '100%' },
  nameEditActions: { flexDirection: 'row', gap: SPACING.md, justifyContent: 'center' },
  nameEditBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
  nameInput: { backgroundColor: COLORS.surface, color: COLORS.textPrimary, borderRadius: BORDER_RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: 8, ...TYPOGRAPHY.body.md, minWidth: 200, textAlign: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  saveText: { ...TYPOGRAPHY.body.md, color: COLORS.primary, fontWeight: '600' },
  cancelText: { ...TYPOGRAPHY.body.md, color: COLORS.textMuted },
  // Sections
  section: { marginBottom: SPACING.lg },
  sectionTitle: { ...TYPOGRAPHY.special.badge, color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.sm },
  // Rows with icons
  row: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rowText: { ...TYPOGRAPHY.body.md, color: COLORS.textPrimary },
  rowAction: { ...TYPOGRAPHY.body.sm, color: COLORS.primary, fontWeight: '600' },
  // Linked status badge
  linkedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkedText: { ...TYPOGRAPHY.body.sm, color: COLORS.success, fontWeight: '600' },
  // Danger Zone card
  dangerCard: { marginTop: SPACING.md, backgroundColor: glowColor(COLORS.error, 0.06), borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: glowColor(COLORS.error, 0.15), padding: SPACING.md, overflow: 'hidden' },
  dangerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
  dangerSectionTitle: { color: COLORS.error, marginBottom: 0 },
  dangerRow: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: glowColor(COLORS.error, 0.15) },
  dangerRowLast: { marginBottom: 0 },
  dangerText: { ...TYPOGRAPHY.body.md, color: COLORS.error, fontWeight: '600' },
  deleteText: { color: COLORS.error },
  dangerSection: { marginTop: SPACING.md },
  errorText: { ...TYPOGRAPHY.body.sm, color: COLORS.error, textAlign: 'center', marginBottom: SPACING.md },
});

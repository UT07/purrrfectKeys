/**
 * AddFriendScreen — Username / friend code display + entry + contacts discovery
 *
 * Top: Shows user's username (or legacy 6-char friend code) with Copy/Share actions
 * Middle: Text input to enter a friend's username or legacy code and send a request
 * Bottom: "Find from Contacts" — reads device contacts, hashes phone/email, matches in Firestore
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Share,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useSocialStore } from '../stores/socialStore';
import { useSettingsStore } from '../stores/settingsStore';
import {
  registerFriendCode,
  registerUsername,
  lookupFriendCode,
  sendFriendRequest,
  getUserPublicProfile,
} from '../services/firebase/socialService';
import {
  findFriendsFromContacts,
  registerEmailForDiscovery,
  type ContactMatch,
} from '../services/firebase/contactLookupService';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, glowColor } from '../theme/tokens';
import { PressableScale } from '../components/common/PressableScale';
import { GradientMeshBackground } from '../components/effects';
import { CatAvatar } from '../components/Mascot/CatAvatar';
import QRCode from 'react-native-qrcode-svg';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ---------------------------------------------------------------------------
// Clipboard helper — expo-clipboard is optional
// ---------------------------------------------------------------------------

let ClipboardModule: { setStringAsync: (s: string) => Promise<boolean> } | null = null;
try {

  ClipboardModule = require('expo-clipboard');
} catch {
  ClipboardModule = null;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (ClipboardModule?.setStringAsync) {
      await ClipboardModule.setStringAsync(text);
      return true;
    }
    // Fallback: use Share sheet which also lets user copy
    await Share.share({ message: text });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddFriendScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const isAnonymous = useAuthStore((s) => s.isAnonymous);
  const friendCode = useSocialStore((s) => s.friendCode);
  const setFriendCode = useSocialStore((s) => s.setFriendCode);
  const friends = useSocialStore((s) => s.friends);
  const addFriend = useSocialStore((s) => s.addFriend);
  const displayName = useSettingsStore((s) => s.displayName);
  const selectedCatId = useSettingsStore((s) => s.selectedCatId);

  const [inputCode, setInputCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLooking, setIsLooking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Contacts discovery state
  const [contactMatches, setContactMatches] = useState<ContactMatch[]>([]);
  const [isSearchingContacts, setIsSearchingContacts] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [contactsSearched, setContactsSearched] = useState(false);
  const [sendingToUid, setSendingToUid] = useState<string | null>(null);
  const [sentUids, setSentUids] = useState<Set<string>>(new Set());

  const storedUsername = useSettingsStore((s) => s.username);

  // Register username/friend code on mount if not yet set
  useEffect(() => {
    if (isAnonymous) return;
    if (!friendCode && user?.uid) {
      setIsRegistering(true);
      const register = async (): Promise<void> => {
        if (storedUsername) {
          try {
            await registerUsername(user.uid, storedUsername, displayName || storedUsername);
            setFriendCode(storedUsername);
            return;
          } catch {
            // Username taken — fall through to legacy code
          }
        }
        const code = await registerFriendCode(user.uid);
        setFriendCode(code);
      };
      register()
        .catch(() => {
          setError('Failed to generate your friend code. Try again later.');
        })
        .finally(() => setIsRegistering(false));
    }
  }, [isAnonymous, friendCode, user?.uid, setFriendCode, storedUsername, displayName]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!friendCode) return;
    const ok = await copyToClipboard(friendCode);
    if (ok) {
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [friendCode]);

  const handleShare = useCallback(async () => {
    if (!friendCode) return;
    try {
      await Share.share({
        message: `Add me on Purrrfect Keys! My username is: ${friendCode}`,
      });
    } catch {
      // User cancelled or error — no action needed
    }
  }, [friendCode]);

  const handleAddFriend = useCallback(async () => {
    const code = inputCode.trim();
    if (code.length < 3) {
      setError('Enter at least 3 characters.');
      return;
    }

    if (code.toLowerCase() === friendCode?.toLowerCase()) {
      setError("That's your own code!");
      return;
    }

    if (!user?.uid) {
      setError('You must be signed in to add friends.');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLooking(true);

    try {
      const friendUid = await lookupFriendCode(code);
      if (!friendUid) {
        setError('No user found. Check the username or code and try again.');
        setIsLooking(false);
        return;
      }

      // Check if already friends or pending
      const existing = friends.find((f) => f.uid === friendUid);
      if (existing) {
        if (existing.status === 'accepted') {
          setError('You are already friends!');
        } else {
          setError('A friend request is already pending.');
        }
        setIsLooking(false);
        return;
      }

      // Fetch the friend's profile to get their display name and cat
      const friendProfile = await getUserPublicProfile(friendUid);
      const friendDisplayName = friendProfile?.displayName || 'Player';
      const friendCatId = friendProfile?.selectedCatId || '';

      await sendFriendRequest(
        user.uid,
        friendUid,
        displayName || 'Player',
        selectedCatId,
        friendDisplayName,
        friendCatId,
      );

      // Add to local store with actual profile data
      addFriend({
        uid: friendUid,
        displayName: friendDisplayName,
        selectedCatId: friendCatId,
        status: 'pending_outgoing',
        connectedAt: Date.now(),
      });

      setSuccess('Friend request sent!');
      setInputCode('');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLooking(false);
    }
  }, [inputCode, friendCode, user?.uid, friends, addFriend, displayName, selectedCatId]);

  // ---------------------------------------------------------------------------
  // Find friends from contacts
  // ---------------------------------------------------------------------------

  const handleFindFromContacts = useCallback(async () => {
    if (!user?.uid) return;

    setIsSearchingContacts(true);
    setContactsError(null);

    try {
      // Lazy-load expo-contacts — requires a dev build (native module)
      let Contacts: typeof import('expo-contacts');
      try {
        Contacts = require('expo-contacts');
      } catch {
        setContactsError(
          'Contact access requires a development build. This feature is not available in Expo Go.',
        );
        setIsSearchingContacts(false);
        return;
      }

      const { status } = await Contacts.requestPermissionsAsync();

      if (status !== 'granted') {
        setContactsError('Contact permission is required to find friends.');
        setIsSearchingContacts(false);
        return;
      }

      // Read contacts with phone numbers and emails
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });

      if (data.length === 0) {
        setContactsError('No contacts found on this device.');
        setIsSearchingContacts(false);
        setContactsSearched(true);
        return;
      }

      // Register current user's email for discoverability (best-effort)
      if (user.email) {
        registerEmailForDiscovery(user.uid, user.email).catch(() => {
          // Non-critical — user can still search contacts
        });
      }

      // Transform contacts into the format our service expects
      const contactList = data.map((c) => ({
        name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown',
        phoneNumbers: c.phoneNumbers?.map((p) => p.number ?? '').filter(Boolean) ?? [],
        emails: c.emails?.map((e) => e.email ?? '').filter(Boolean) ?? [],
      }));

      const matches = await findFriendsFromContacts(contactList, user.uid);

      // Filter out people already in friends list
      const existingUids = new Set(friends.map((f) => f.uid));
      const newMatches = matches.filter((m) => !existingUids.has(m.uid));

      setContactMatches(newMatches);
      setContactsSearched(true);
    } catch {
      setContactsError('Failed to search contacts. Please try again.');
    } finally {
      setIsSearchingContacts(false);
    }
  }, [user?.uid, user?.email, friends]);

  const handleAddContactFriend = useCallback(
    async (match: ContactMatch) => {
      if (!user?.uid) return;

      setSendingToUid(match.uid);
      try {
        const friendProfile = await getUserPublicProfile(match.uid);
        const friendDisplayName = friendProfile?.displayName || match.contactName;
        const friendCatId = friendProfile?.selectedCatId || '';

        await sendFriendRequest(
          user.uid,
          match.uid,
          displayName || 'Player',
          selectedCatId,
          friendDisplayName,
          friendCatId,
        );

        addFriend({
          uid: match.uid,
          displayName: friendDisplayName,
          selectedCatId: friendCatId,
          status: 'pending_outgoing',
          connectedAt: Date.now(),
        });

        setSentUids((prev) => new Set(prev).add(match.uid));
      } catch {
        Alert.alert('Error', 'Failed to send friend request. Please try again.');
      } finally {
        setSendingToUid(null);
      }
    },
    [user?.uid, displayName, selectedCatId, addFriend],
  );

  // Auth gate: anonymous users cannot use friend codes (placed after hooks)
  if (isAnonymous) {
    return (
      <SafeAreaView style={styles.container} testID="add-friend-screen">
        <GradientMeshBackground accent="social" />
        <View style={styles.header}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            testID="add-friend-back"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
          </PressableScale>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerCatWrap}>
              <CatAvatar catId={selectedCatId} size="small" skipEntryAnimation />
            </View>
            <Text style={styles.headerTitle}>Add Friend</Text>
          </View>
          <View style={styles.backButton} />
        </View>
        <View style={styles.authGateContainer}>
          <MaterialCommunityIcons name="account-lock" size={64} color={COLORS.textMuted} />
          <Text style={styles.authGateTitle}>Sign In Required</Text>
          <Text style={styles.authGateSubtitle}>
            Sign in to register your username and add friends.
          </Text>
          <PressableScale
            style={styles.authGateButton}
            onPress={() => navigation.navigate('Account')}
          >
            <Text style={styles.authGateButtonText}>Sign In</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} testID="add-friend-screen">
        <GradientMeshBackground accent="social" />

        {/* Header */}
        <View style={styles.header}>
          <PressableScale
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            testID="add-friend-back"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
          </PressableScale>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerCatWrap}>
              <CatAvatar catId={selectedCatId} size="small" skipEntryAnimation />
            </View>
            <Text style={styles.headerTitle}>Add Friend</Text>
          </View>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentInner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

        {/* Your Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Username</Text>
          <Text style={styles.sectionSubtitle}>
            Share your username so friends can find you
          </Text>

          {/* QR / Text toggle */}
          <View style={styles.toggleRow}>
            <PressableScale
              style={[styles.toggleTab, showQR && styles.toggleTabActive]}
              onPress={() => setShowQR(true)}
            >
              <MaterialCommunityIcons name="qrcode" size={16} color={showQR ? COLORS.textPrimary : COLORS.textMuted} />
              <Text style={[styles.toggleTabText, showQR && styles.toggleTabTextActive]}>QR Code</Text>
            </PressableScale>
            <PressableScale
              style={[styles.toggleTab, !showQR && styles.toggleTabActive]}
              onPress={() => setShowQR(false)}
            >
              <MaterialCommunityIcons name="text-short" size={16} color={!showQR ? COLORS.textPrimary : COLORS.textMuted} />
              <Text style={[styles.toggleTabText, !showQR && styles.toggleTabTextActive]}>Text</Text>
            </PressableScale>
          </View>

          <View style={styles.codeCard}>
            {isRegistering ? (
              <ActivityIndicator color={COLORS.primary} size="large" />
            ) : friendCode ? (
              showQR ? (
                <View style={styles.qrContainer}>
                  <View style={styles.qrBackground}>
                    <QRCode
                      value={friendCode}
                      size={160}
                      backgroundColor="white"
                      color={COLORS.background}
                    />
                  </View>
                  <Text style={styles.qrHint}>Scan with any camera app to see username</Text>
                </View>
              ) : (
                <>
                  <View style={styles.codeCardAvatarWrap}>
                    <CatAvatar catId={selectedCatId} size="small" mood="happy" skipEntryAnimation />
                  </View>
                  <Text style={styles.codeText}>{friendCode}</Text>
                </>
              )
            ) : (
              <Text style={styles.codeTextMuted}>------</Text>
            )}
          </View>

          <View style={styles.codeActions}>
            <PressableScale
              style={[styles.copyButton, copied && styles.actionButtonActive]}
              onPress={handleCopy}
              disabled={!friendCode}
            >
              <MaterialCommunityIcons
                name={copied ? 'check' : 'content-copy'}
                size={18}
                color={copied ? COLORS.success : COLORS.textPrimary}
              />
              <Text style={[styles.actionButtonText, copied && styles.actionButtonTextActive]}>
                {copied ? 'Copied!' : 'Copy'}
              </Text>
            </PressableScale>

            <PressableScale
              style={styles.shareButton}
              onPress={handleShare}
              disabled={!friendCode}
            >
              <MaterialCommunityIcons name="share-variant" size={18} color={COLORS.textPrimary} />
              <Text style={styles.actionButtonText}>Share</Text>
            </PressableScale>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Add Friend Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add a Friend</Text>
          <Text style={styles.sectionSubtitle}>
            Enter their username or legacy friend code
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons
                name="account-search"
                size={20}
                color={COLORS.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={inputCode}
                onChangeText={(text) => {
                  setInputCode(text.replace(/\s/g, '').slice(0, 20));
                  setError(null);
                  setSuccess(null);
                }}
                placeholder="username"
                placeholderTextColor={COLORS.textMuted}
                maxLength={20}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleAddFriend}
              />
            </View>
          </View>

          <PressableScale
            style={[
              styles.addButton,
              (inputCode.trim().length < 3 || isLooking) && styles.addButtonDisabled,
            ]}
            onPress={handleAddFriend}
            disabled={inputCode.trim().length < 3 || isLooking}
          >
            {isLooking ? (
              <ActivityIndicator color={COLORS.textPrimary} size="small" />
            ) : (
              <View style={styles.addButtonContent}>
                <MaterialCommunityIcons name="account-plus" size={20} color={COLORS.textPrimary} />
                <Text style={styles.addButtonText}>Add Friend</Text>
              </View>
            )}
          </PressableScale>

          {error && (
            <View style={styles.messageBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {success && (
            <View style={styles.messageBanner}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color={COLORS.success} />
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Find from Contacts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Find from Contacts</Text>
          <Text style={styles.sectionSubtitle}>
            See which of your contacts are already on Purrrfect Keys
          </Text>

          {!contactsSearched ? (
            <PressableScale
              style={styles.contactsButton}
              onPress={handleFindFromContacts}
              disabled={isSearchingContacts}
            >
              {isSearchingContacts ? (
                <ActivityIndicator color={COLORS.textPrimary} size="small" />
              ) : (
                <View style={styles.addButtonContent}>
                  <MaterialCommunityIcons name="contacts" size={20} color={COLORS.textPrimary} />
                  <Text style={styles.addButtonText}>Search Contacts</Text>
                </View>
              )}
            </PressableScale>
          ) : contactMatches.length === 0 ? (
            <View style={styles.contactsEmpty}>
              <MaterialCommunityIcons name="account-search-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.contactsEmptyText}>
                None of your contacts are on Purrrfect Keys yet.{'\n'}Invite them to join!
              </Text>
              <PressableScale
                style={styles.inviteButton}
                onPress={() => {
                  Share.share({
                    message: 'Learn piano with me on Purrrfect Keys! Download it and add me as a friend.',
                  }).catch(() => {});
                }}
              >
                <MaterialCommunityIcons name="share-variant" size={16} color={COLORS.textPrimary} />
                <Text style={styles.inviteButtonText}>Invite Friends</Text>
              </PressableScale>
            </View>
          ) : (
            <View style={styles.contactsList}>
              {contactMatches.map((match) => {
                const alreadySent = sentUids.has(match.uid);
                const isSending = sendingToUid === match.uid;

                return (
                  <View key={match.uid} style={styles.contactRow}>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName} numberOfLines={1}>
                        {match.contactName}
                      </Text>
                      <Text style={styles.contactMatchType}>
                        Matched by {match.matchType}
                      </Text>
                    </View>
                    {alreadySent ? (
                      <View style={styles.sentBadge}>
                        <MaterialCommunityIcons name="check" size={14} color={COLORS.success} />
                        <Text style={styles.sentBadgeText}>Sent</Text>
                      </View>
                    ) : (
                      <PressableScale
                        style={styles.contactAddButton}
                        onPress={() => handleAddContactFriend(match)}
                        disabled={isSending}
                      >
                        {isSending ? (
                          <ActivityIndicator color={COLORS.textPrimary} size="small" />
                        ) : (
                          <MaterialCommunityIcons name="account-plus" size={18} color={COLORS.textPrimary} />
                        )}
                      </PressableScale>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {contactsError && (
            <View style={styles.messageBanner}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{contactsError}</Text>
            </View>
          )}
        </View>

        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerCatWrap: {
    width: 28,
    height: 28,
    transform: [{ scale: 0.58 }],
    marginRight: -4,
  },
  headerTitle: {
    ...TYPOGRAPHY.heading.lg,
    color: COLORS.textPrimary,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.heading.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  toggleTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  toggleTabActive: {
    backgroundColor: glowColor(COLORS.primary, 0.15),
    borderColor: COLORS.primary,
  },
  toggleTabText: {
    ...TYPOGRAPHY.button.sm,
    color: COLORS.textMuted,
  },
  toggleTabTextActive: {
    color: COLORS.textPrimary,
  },
  qrContainer: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  qrBackground: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'white',
  },
  qrHint: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
  },
  codeCard: {
    backgroundColor: glowColor(COLORS.primary, 0.06),
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  codeCardAvatarWrap: {
    marginBottom: SPACING.sm,
  },
  codeText: {
    fontFamily: 'monospace',
    ...TYPOGRAPHY.display.lg,
    color: COLORS.primary,
    letterSpacing: SPACING.sm,
  },
  codeTextMuted: {
    fontFamily: 'monospace',
    ...TYPOGRAPHY.display.lg,
    color: COLORS.textMuted,
    letterSpacing: SPACING.sm,
  },
  codeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: glowColor(COLORS.primary, 0.1),
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.2),
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: glowColor(COLORS.info, 0.1),
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: glowColor(COLORS.info, 0.2),
  },
  actionButtonActive: {
    borderColor: COLORS.success,
    backgroundColor: glowColor(COLORS.success, 0.1),
  },
  actionButtonText: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.textPrimary,
  },
  actionButtonTextActive: {
    color: COLORS.success,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.cardBorder,
  },
  dividerText: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textMuted,
    marginHorizontal: SPACING.sm,
  },
  inputRow: {
    marginBottom: SPACING.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  inputIcon: {
    paddingLeft: SPACING.md,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.body.lg,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  addButtonText: {
    ...TYPOGRAPHY.button.lg,
    color: COLORS.textPrimary,
  },
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
  },
  errorText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.error,
    flex: 1,
  },
  successText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.success,
    flex: 1,
  },
  // Auth gate for anonymous users
  authGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  authGateTitle: {
    ...TYPOGRAPHY.heading.lg,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  authGateSubtitle: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  authGateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
  },
  authGateButtonText: {
    ...TYPOGRAPHY.button.lg,
    color: COLORS.textPrimary,
  },
  // Scroll wrapper
  scrollContent: {
    flex: 1,
  },
  scrollContentInner: {
    paddingBottom: SPACING.xl,
  },
  // Contacts section
  contactsButton: {
    backgroundColor: glowColor(COLORS.info, 0.15),
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderColor: glowColor(COLORS.info, 0.3),
  },
  contactsEmpty: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  contactsEmptyText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: glowColor(COLORS.primary, 0.12),
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.25),
  },
  inviteButtonText: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.textPrimary,
  },
  contactsList: {
    gap: SPACING.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...TYPOGRAPHY.body.lg,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  contactMatchType: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textMuted,
  },
  contactAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: glowColor(COLORS.success, 0.1),
  },
  sentBadgeText: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.success,
    fontWeight: '600',
  },
});

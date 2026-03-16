/**
 * GuildScreen - Guild management screen
 *
 * Two states:
 * A) No guild — discovery: search, browse open guilds, create guild
 * B) In a guild — detail: header, members, wars, leave
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useGuildStore } from '../stores/guildStore';
import { useRankStore } from '../stores/rankStore';
import { useSettingsStore } from '../stores/settingsStore';
import * as guildService from '../services/firebase/guildService';
import type { Guild, GuildMember } from '../stores/types';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, ARENA, glowColor } from '../theme/tokens';
import { GradientMeshBackground } from '../components/effects';
import { PressableScale } from '../components/common/PressableScale';
import { CatAvatar } from '../components/Mascot';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GUILD_ICON_PRESETS = ['🎵', '🎹', '🐱', '🔥', '⭐'];

const JOIN_POLICY_OPTIONS: Array<{ value: Guild['joinPolicy']; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'invite_only', label: 'Invite Only' },
  { value: 'closed', label: 'Closed' },
];

const ROLE_LABELS: Record<GuildMember['role'], string> = {
  leader: 'Leader',
  co_leader: 'Co-Leader',
  member: 'Member',
};

const ROLE_COLORS: Record<GuildMember['role'], string> = {
  leader: '#FFD700',
  co_leader: ARENA.guildAccent,
  member: COLORS.textSecondary,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function JoinPolicyBadge({ policy }: { policy: Guild['joinPolicy'] }): React.JSX.Element {
  const badgeColor =
    policy === 'open'
      ? COLORS.success
      : policy === 'invite_only'
        ? COLORS.warning
        : COLORS.error;

  const label = policy === 'invite_only' ? 'Invite Only' : policy === 'open' ? 'Open' : 'Closed';

  return (
    <View style={[styles.policyBadge, { backgroundColor: glowColor(badgeColor, 0.2) }]}>
      <Text style={[styles.policyBadgeText, { color: badgeColor }]}>{label}</Text>
    </View>
  );
}

function GuildCard({
  guild,
  onJoin,
  isJoining,
}: {
  guild: Guild;
  onJoin: (guild: Guild) => void;
  isJoining: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.guildCard}>
      <View style={styles.guildCardHeader}>
        <Text style={styles.guildIcon}>{guild.icon}</Text>
        <View style={styles.guildCardInfo}>
          <Text style={styles.guildCardName} numberOfLines={1}>
            {guild.name}
          </Text>
          <View style={styles.guildCardMeta}>
            <Text style={styles.guildCardMetaText}>Lv. {guild.level}</Text>
            <Text style={styles.guildCardMetaDot}>{'\u00B7'}</Text>
            <Text style={styles.guildCardMetaText}>
              {guild.memberCount}/30 members
            </Text>
          </View>
        </View>
        <JoinPolicyBadge policy={guild.joinPolicy} />
      </View>
      {guild.description ? (
        <Text style={styles.guildCardDescription} numberOfLines={2}>
          {guild.description}
        </Text>
      ) : null}
      {guild.joinPolicy === 'open' && (
        <PressableScale
          onPress={() => onJoin(guild)}
          disabled={isJoining}
          style={styles.joinButton}
          accessibilityLabel={`Join ${guild.name}`}
          accessibilityRole="button"
        >
          {isJoining ? (
            <ActivityIndicator size="small" color={COLORS.textPrimary} />
          ) : (
            <Text style={styles.joinButtonText}>Join</Text>
          )}
        </PressableScale>
      )}
    </View>
  );
}

function MemberCard({
  member,
  isLeader,
  myUid,
  onKick,
  onPromote,
  onDemote,
}: {
  member: GuildMember;
  isLeader: boolean;
  myUid: string;
  onKick: (uid: string, name: string) => void;
  onPromote: (uid: string, name: string) => void;
  onDemote: (uid: string, name: string) => void;
}): React.JSX.Element {
  const isMe = member.uid === myUid;
  const canManage = isLeader && !isMe && member.role !== 'leader';

  return (
    <View style={styles.memberCard}>
      <CatAvatar catId={member.catId} size="small" />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1}>
          {member.displayName}
          {isMe ? ' (You)' : ''}
        </Text>
        <View style={styles.memberMetaRow}>
          <View style={[styles.roleBadge, { backgroundColor: glowColor(ROLE_COLORS[member.role], 0.2) }]}>
            <Text style={[styles.roleBadgeText, { color: ROLE_COLORS[member.role] }]}>
              {ROLE_LABELS[member.role]}
            </Text>
          </View>
          <Text style={styles.memberXp}>{member.weeklyXp} XP/wk</Text>
        </View>
      </View>
      {canManage && (
        <View style={styles.memberActions}>
          {member.role === 'member' && (
            <PressableScale
              onPress={() => onPromote(member.uid, member.displayName)}
              style={styles.memberActionButton}
              accessibilityLabel={`Promote ${member.displayName}`}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="arrow-up-bold" size={18} color={ARENA.guildAccent} />
            </PressableScale>
          )}
          {member.role === 'co_leader' && (
            <PressableScale
              onPress={() => onDemote(member.uid, member.displayName)}
              style={styles.memberActionButton}
              accessibilityLabel={`Demote ${member.displayName}`}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="arrow-down-bold" size={18} color={COLORS.warning} />
            </PressableScale>
          )}
          <PressableScale
            onPress={() => onKick(member.uid, member.displayName)}
            style={styles.memberActionButton}
            accessibilityLabel={`Kick ${member.displayName}`}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.error} />
          </PressableScale>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Guild Discovery (State A)
// ---------------------------------------------------------------------------

function GuildDiscovery(): React.JSX.Element {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const displayName = useSettingsStore((s) => s.displayName);
  const selectedCatId = useSettingsStore((s) => s.selectedCatId);
  const rankTier = useRankStore((s) => s.rating.tier);
  const setCurrentGuild = useGuildStore((s) => s.setCurrentGuild);
  const setMembers = useGuildStore((s) => s.setMembers);

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Guild[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState(GUILD_ICON_PRESETS[0]);
  const [newPolicy, setNewPolicy] = useState<Guild['joinPolicy']>('open');
  const [isCreating, setIsCreating] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const guilds = await guildService.searchGuilds(searchQuery.trim());
      setResults(guilds);
    } catch {
      Alert.alert('Error', 'Failed to search guilds. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleBrowseOpen = useCallback(async () => {
    setIsSearching(true);
    try {
      const guilds = await guildService.getOpenGuilds();
      setResults(guilds);
    } catch {
      Alert.alert('Error', 'Failed to load guilds. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleJoin = useCallback(
    async (guild: Guild) => {
      if (!user?.uid) return;
      setIsJoining(true);
      try {
        await guildService.joinGuild(guild.id, {
          uid: user.uid,
          displayName: displayName || 'Player',
          catId: selectedCatId,
          rankTier,
        });
        const updatedGuild = await guildService.getGuild(guild.id);
        setCurrentGuild(updatedGuild ?? { ...guild, memberCount: guild.memberCount + 1 });
        const members = await guildService.getGuildMembers(guild.id);
        setMembers(members);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to join guild.';
        Alert.alert('Cannot Join', message);
      } finally {
        setIsJoining(false);
      }
    },
    [user, displayName, selectedCatId, rankTier, setCurrentGuild, setMembers],
  );

  const handleCreate = useCallback(async () => {
    if (!user?.uid || !newName.trim()) return;
    setIsCreating(true);
    try {
      const guild = await guildService.createGuild(
        {
          uid: user.uid,
          displayName: displayName || 'Player',
          catId: selectedCatId,
          rankTier,
        },
        {
          name: newName.trim(),
          icon: newIcon,
          description: newDescription.trim(),
          joinPolicy: newPolicy,
          bannerColor: ARENA.guildAccent,
        },
      );
      setCurrentGuild(guild);
      const members = await guildService.getGuildMembers(guild.id);
      setMembers(members);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create guild.';
      Alert.alert('Error', message);
    } finally {
      setIsCreating(false);
    }
  }, [user, newName, newIcon, newDescription, newPolicy, displayName, selectedCatId, rankTier, setCurrentGuild, setMembers]);

  return (
    <SafeAreaView style={styles.container}>
      <GradientMeshBackground accent="social" />

      {/* Header */}
      <View style={styles.header}>
        <PressableScale
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </PressableScale>
        <Text style={styles.headerTitle}>Guilds</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search guilds..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            accessibilityLabel="Search guilds"
          />
          {searchQuery.length > 0 && (
            <PressableScale
              onPress={() => {
                setSearchQuery('');
                setResults([]);
              }}
              style={styles.clearButton}
              accessibilityLabel="Clear search"
              hitSlop={8}
            >
              <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textMuted} />
            </PressableScale>
          )}
        </View>

        {/* Browse Open Guilds */}
        <PressableScale
          onPress={handleBrowseOpen}
          style={styles.browseButton}
          accessibilityLabel="Browse open guilds"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="earth" size={20} color={ARENA.guildAccent} />
          <Text style={styles.browseButtonText}>Browse Open Guilds</Text>
        </PressableScale>

        {/* Search Results */}
        {isSearching ? (
          <ActivityIndicator
            size="large"
            color={ARENA.guildAccent}
            style={styles.loadingIndicator}
          />
        ) : results.length > 0 ? (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>
              {results.length} guild{results.length !== 1 ? 's' : ''} found
            </Text>
            {results.map((guild) => (
              <GuildCard
                key={guild.id}
                guild={guild}
                onJoin={handleJoin}
                isJoining={isJoining}
              />
            ))}
          </View>
        ) : null}

        {/* Create Guild Form */}
        {showCreateForm ? (
          <View style={styles.createFormCard}>
            <Text style={styles.sectionTitle}>Create a Guild</Text>

            {/* Name */}
            <Text style={styles.fieldLabel}>Guild Name</Text>
            <TextInput
              style={styles.formInput}
              placeholder="My Awesome Guild"
              placeholderTextColor={COLORS.textMuted}
              value={newName}
              onChangeText={setNewName}
              maxLength={30}
              accessibilityLabel="Guild name input"
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.formInputMultiline]}
              placeholder="What's your guild about?"
              placeholderTextColor={COLORS.textMuted}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              maxLength={120}
              accessibilityLabel="Guild description input"
            />

            {/* Icon Picker */}
            <Text style={styles.fieldLabel}>Icon</Text>
            <View style={styles.iconPicker}>
              {GUILD_ICON_PRESETS.map((icon) => (
                <PressableScale
                  key={icon}
                  onPress={() => setNewIcon(icon)}
                  style={[
                    styles.iconOption,
                    newIcon === icon && styles.iconOptionSelected,
                  ]}
                  accessibilityLabel={`Select icon ${icon}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.iconOptionText}>{icon}</Text>
                </PressableScale>
              ))}
            </View>

            {/* Join Policy Picker */}
            <Text style={styles.fieldLabel}>Join Policy</Text>
            <View style={styles.policyPicker}>
              {JOIN_POLICY_OPTIONS.map((option) => (
                <PressableScale
                  key={option.value}
                  onPress={() => setNewPolicy(option.value)}
                  style={[
                    styles.policyOption,
                    newPolicy === option.value && styles.policyOptionSelected,
                  ]}
                  accessibilityLabel={`Set join policy to ${option.label}`}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.policyOptionText,
                      newPolicy === option.value && styles.policyOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </PressableScale>
              ))}
            </View>

            {/* Create / Cancel */}
            <View style={styles.createFormActions}>
              <PressableScale
                onPress={() => setShowCreateForm(false)}
                style={styles.cancelButton}
                accessibilityLabel="Cancel creating guild"
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </PressableScale>
              <PressableScale
                onPress={handleCreate}
                disabled={isCreating || !newName.trim()}
                style={[
                  styles.createButton,
                  (!newName.trim() || isCreating) && styles.buttonDisabled,
                ]}
                accessibilityLabel="Create guild"
                accessibilityRole="button"
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={COLORS.textPrimary} />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </PressableScale>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Create Guild FAB */}
      {!showCreateForm && (
        <PressableScale
          onPress={() => setShowCreateForm(true)}
          style={styles.fab}
          accessibilityLabel="Create a new guild"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="plus" size={28} color={COLORS.textPrimary} />
        </PressableScale>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Guild Detail (State B)
// ---------------------------------------------------------------------------

function GuildDetail(): React.JSX.Element {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const currentGuild = useGuildStore((s) => s.currentGuild);
  const members = useGuildStore((s) => s.members);
  const activeWars = useGuildStore((s) => s.activeWars);
  const setCurrentGuild = useGuildStore((s) => s.setCurrentGuild);
  const setMembers = useGuildStore((s) => s.setMembers);
  const setActiveWars = useGuildStore((s) => s.setActiveWars);
  const removeMember = useGuildStore((s) => s.removeMember);
  const updateMemberRole = useGuildStore((s) => s.updateMemberRole);
  const setLoading = useGuildStore((s) => s.setLoading);
  const isLoading = useGuildStore((s) => s.isLoading);

  const myUid = user?.uid ?? '';
  const isLeader = currentGuild?.leaderUid === myUid;

  // Load members and wars on mount
  useEffect(() => {
    if (!currentGuild) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      guildService.getGuildMembers(currentGuild.id),
      guildService.getActiveWars(currentGuild.id),
    ])
      .then(([memberList, warList]) => {
        if (cancelled) return;
        setMembers(memberList);
        setActiveWars(warList);
      })
      .catch(() => {
        // Silently fail — user sees cached data
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentGuild, setMembers, setActiveWars, setLoading]);

  const handleKick = useCallback(
    (uid: string, name: string) => {
      if (!currentGuild) return;
      Alert.alert(
        'Kick Member',
        `Remove ${name} from the guild?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Kick',
            style: 'destructive',
            onPress: async () => {
              try {
                await guildService.kickMember(currentGuild.id, uid);
                removeMember(uid);
              } catch {
                Alert.alert('Error', 'Failed to kick member.');
              }
            },
          },
        ],
      );
    },
    [currentGuild, removeMember],
  );

  const handlePromote = useCallback(
    (uid: string, name: string) => {
      if (!currentGuild) return;
      Alert.alert(
        'Promote Member',
        `Promote ${name} to Co-Leader?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Promote',
            onPress: async () => {
              try {
                await guildService.promoteMember(currentGuild.id, uid, 'co_leader');
                updateMemberRole(uid, 'co_leader');
              } catch {
                Alert.alert('Error', 'Failed to promote member.');
              }
            },
          },
        ],
      );
    },
    [currentGuild, updateMemberRole],
  );

  const handleDemote = useCallback(
    (uid: string, name: string) => {
      if (!currentGuild) return;
      Alert.alert(
        'Demote Member',
        `Demote ${name} back to Member?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Demote',
            onPress: async () => {
              try {
                await guildService.demoteMember(currentGuild.id, uid);
                updateMemberRole(uid, 'member');
              } catch {
                Alert.alert('Error', 'Failed to demote member.');
              }
            },
          },
        ],
      );
    },
    [currentGuild, updateMemberRole],
  );

  const handleLeave = useCallback(() => {
    if (!currentGuild || !myUid) return;
    Alert.alert(
      'Leave Guild',
      `Are you sure you want to leave ${currentGuild.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await guildService.leaveGuild(currentGuild.id, myUid);
              setCurrentGuild(null);
              setMembers([]);
              setActiveWars([]);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Failed to leave guild.';
              Alert.alert('Error', message);
            }
          },
        },
      ],
    );
  }, [currentGuild, myUid, setCurrentGuild, setMembers, setActiveWars]);

  if (!currentGuild) return <View />;

  return (
    <SafeAreaView style={styles.container}>
      <GradientMeshBackground accent="social" />

      {/* Header */}
      <View style={styles.header}>
        <PressableScale
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </PressableScale>
        <Text style={styles.headerTitle}>{currentGuild.name}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Guild Header Card */}
        <View style={styles.guildHeaderCard}>
          <Text style={styles.guildHeaderIcon}>{currentGuild.icon}</Text>
          <Text style={styles.guildHeaderName}>{currentGuild.name}</Text>
          <View style={styles.guildHeaderStats}>
            <View style={styles.guildStat}>
              <Text style={styles.guildStatValue}>Lv. {currentGuild.level}</Text>
              <Text style={styles.guildStatLabel}>Level</Text>
            </View>
            <View style={styles.guildStatDivider} />
            <View style={styles.guildStat}>
              <Text style={styles.guildStatValue}>
                {currentGuild.guildXp.toLocaleString()}
              </Text>
              <Text style={styles.guildStatLabel}>Guild XP</Text>
            </View>
            <View style={styles.guildStatDivider} />
            <View style={styles.guildStat}>
              <Text style={styles.guildStatValue}>
                {currentGuild.memberCount}/30
              </Text>
              <Text style={styles.guildStatLabel}>Members</Text>
            </View>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-group" size={20} color={ARENA.guildAccent} />
            <Text style={styles.sectionTitle}>Members</Text>
          </View>
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color={ARENA.guildAccent}
              style={styles.loadingIndicator}
            />
          ) : members.length > 0 ? (
            members.map((member) => (
              <MemberCard
                key={member.uid}
                member={member}
                isLeader={isLeader}
                myUid={myUid}
                onKick={handleKick}
                onPromote={handlePromote}
                onDemote={handleDemote}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No members loaded.</Text>
          )}
        </View>

        {/* Guild Wars Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="sword-cross" size={20} color={ARENA.guildWar} />
            <Text style={styles.sectionTitle}>Guild Wars</Text>
          </View>
          {activeWars.length > 0 ? (
            activeWars.map((war) => (
              <View key={war.id} style={styles.warCard}>
                <View style={styles.warTeams}>
                  <View style={styles.warTeam}>
                    <Text style={styles.warTeamName} numberOfLines={1}>
                      {war.guildAName}
                    </Text>
                    <Text style={styles.warPoints}>{war.guildAWarPoints}</Text>
                  </View>
                  <Text style={styles.warVs}>VS</Text>
                  <View style={styles.warTeam}>
                    <Text style={styles.warTeamName} numberOfLines={1}>
                      {war.guildBName}
                    </Text>
                    <Text style={styles.warPoints}>{war.guildBWarPoints}</Text>
                  </View>
                </View>
                <View style={styles.warStatusRow}>
                  <View
                    style={[
                      styles.warStatusBadge,
                      {
                        backgroundColor:
                          war.status === 'active'
                            ? glowColor(ARENA.guildWar, 0.2)
                            : glowColor(COLORS.success, 0.2),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.warStatusText,
                        {
                          color:
                            war.status === 'active' ? ARENA.guildWar : COLORS.success,
                        },
                      ]}
                    >
                      {war.status === 'active' ? 'Active' : 'Completed'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No active wars.</Text>
          )}
          {isLeader && (
            <PressableScale
              onPress={() => Alert.alert('Coming Soon', 'Guild wars matchmaking is coming in a future update.')}
              style={styles.startWarButton}
              accessibilityLabel="Start a guild war"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="sword-cross" size={18} color={ARENA.guildWar} />
              <Text style={styles.startWarButtonText}>Start War</Text>
            </PressableScale>
          )}
        </View>

        {/* Leave Guild */}
        {!isLeader && (
          <PressableScale
            onPress={handleLeave}
            style={styles.leaveButton}
            accessibilityLabel="Leave this guild"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="logout" size={18} color={COLORS.error} />
            <Text style={styles.leaveButtonText}>Leave Guild</Text>
          </PressableScale>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function GuildScreen(): React.JSX.Element {
  const currentGuild = useGuildStore((s) => s.currentGuild);

  if (currentGuild) {
    return <GuildDetail />;
  }
  return <GuildDiscovery />;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 48,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.heading.lg,
  },
  headerSpacer: {
    width: 44,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ARENA.cardBackground,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: ARENA.cardBorder,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.body.md,
    marginLeft: SPACING.sm,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
  },
  clearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Browse button
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ARENA.cardBackground,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: ARENA.guildAccent,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
    minHeight: 48,
  },
  browseButtonText: {
    color: ARENA.guildAccent,
    ...TYPOGRAPHY.button.md,
    marginLeft: SPACING.sm,
  },

  // Loading
  loadingIndicator: {
    marginVertical: SPACING.xl,
  },

  // Results
  resultsSection: {
    marginBottom: SPACING.lg,
  },

  // Guild card (discovery)
  guildCard: {
    backgroundColor: ARENA.cardBackground,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: ARENA.cardBorder,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  guildCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guildIcon: {
    fontSize: 32,
    marginRight: SPACING.md,
  },
  guildCardInfo: {
    flex: 1,
  },
  guildCardName: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.heading.md,
  },
  guildCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  guildCardMetaText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption.lg,
  },
  guildCardMetaDot: {
    color: COLORS.textMuted,
    marginHorizontal: SPACING.xs,
    ...TYPOGRAPHY.caption.lg,
  },
  guildCardDescription: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.body.sm,
    marginTop: SPACING.sm,
  },
  joinButton: {
    alignSelf: 'flex-end',
    backgroundColor: ARENA.guildAccent,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.button.md,
  },

  // Policy badge
  policyBadge: {
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  policyBadgeText: {
    ...TYPOGRAPHY.caption.md,
    fontWeight: '600',
  },

  // Create form
  createFormCard: {
    backgroundColor: ARENA.cardBackground,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: ARENA.guildAccent,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  formInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: ARENA.cardBorder,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.body.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
    minHeight: 44,
  },
  formInputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  iconPicker: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: ARENA.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: {
    borderColor: ARENA.guildAccent,
    backgroundColor: glowColor(ARENA.guildAccent, 0.15),
  },
  iconOptionText: {
    fontSize: 22,
  },
  policyPicker: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  policyOption: {
    flex: 1,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: ARENA.cardBorder,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  policyOptionSelected: {
    borderColor: ARENA.guildAccent,
    backgroundColor: glowColor(ARENA.guildAccent, 0.15),
  },
  policyOptionText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.button.sm,
  },
  policyOptionTextSelected: {
    color: ARENA.guildAccent,
  },
  createFormActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: ARENA.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    minHeight: 48,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.button.md,
  },
  createButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: ARENA.guildAccent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    minHeight: 48,
  },
  createButtonText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.button.md,
  },
  buttonDisabled: {
    opacity: 0.4,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ARENA.guildAccent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: ARENA.guildAccent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },

  // Guild detail header card
  guildHeaderCard: {
    backgroundColor: ARENA.cardBackground,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: ARENA.guildAccent,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...Platform.select({
      ios: {
        shadowColor: ARENA.guildAccent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  guildHeaderIcon: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  guildHeaderName: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.display.sm,
    marginBottom: SPACING.md,
  },
  guildHeaderStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guildStat: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  guildStatValue: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.heading.md,
  },
  guildStatLabel: {
    color: COLORS.textSecondary,
    ...TYPOGRAPHY.caption.md,
    marginTop: 2,
  },
  guildStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: ARENA.cardBorder,
  },

  // Section
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.heading.sm,
  },
  emptyText: {
    color: COLORS.textMuted,
    ...TYPOGRAPHY.body.md,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },

  // Member card
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ARENA.cardBackground,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: ARENA.cardBorder,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  memberInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  memberName: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.body.lg,
    fontWeight: '600',
  },
  memberMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: SPACING.sm,
  },
  roleBadge: {
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  roleBadgeText: {
    ...TYPOGRAPHY.caption.md,
    fontWeight: '700',
  },
  memberXp: {
    color: COLORS.textMuted,
    ...TYPOGRAPHY.caption.lg,
  },
  memberActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  memberActionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
  },

  // War card
  warCard: {
    backgroundColor: ARENA.cardBackground,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: ARENA.cardBorder,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  warTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warTeam: {
    flex: 1,
    alignItems: 'center',
  },
  warTeamName: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.body.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  warPoints: {
    color: ARENA.guildWar,
    ...TYPOGRAPHY.heading.lg,
    marginTop: SPACING.xs,
  },
  warVs: {
    color: COLORS.textMuted,
    ...TYPOGRAPHY.heading.sm,
    marginHorizontal: SPACING.md,
  },
  warStatusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  warStatusBadge: {
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  warStatusText: {
    ...TYPOGRAPHY.caption.md,
    fontWeight: '700',
  },

  // Start war button
  startWarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ARENA.cardBackground,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: ARENA.guildWar,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
    minHeight: 48,
  },
  startWarButtonText: {
    color: ARENA.guildWar,
    ...TYPOGRAPHY.button.md,
  },

  // Leave button
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    minHeight: 48,
  },
  leaveButtonText: {
    color: COLORS.error,
    ...TYPOGRAPHY.button.md,
  },

  bottomPadding: {
    height: 40,
  },
});

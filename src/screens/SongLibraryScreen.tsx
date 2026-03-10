/**
 * SongLibraryScreen
 *
 * The "Songs" tab — browse, search, and request songs.
 * Features genre carousel, difficulty filter, song cards with mastery badges,
 * and a FAB to request AI-generated songs.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSongStore } from '../stores/songStore';
import { useGemStore } from '../stores/gemStore';
import { useAuthStore } from '../stores/authStore';
import { masteryColor, masteryLabel } from '../core/songs/songMastery';
import type { SongGenre, SongSummary, SongRequestParams, MasteryTier } from '../core/songs/songTypes';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, SHADOWS, NEON, RARITY, glowColor } from '../theme/tokens';
import { PressableScale } from '../components/common/PressableScale';
import { GradientMeshBackground } from '../components/effects';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ---------------------------------------------------------------------------
// Genre visual config: icon + accent color per genre
// ---------------------------------------------------------------------------

const GENRE_CONFIG: Record<string, { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  all:       { icon: 'music-note',           color: COLORS.primary },
  classical: { icon: 'music-clef-treble',    color: RARITY.epic.borderColor },
  folk:      { icon: 'guitar-acoustic',      color: COLORS.success },
  pop:       { icon: 'microphone-variant',   color: COLORS.streakFlame },
  film:      { icon: 'filmstrip',            color: COLORS.info },
  game:      { icon: 'gamepad-variant',      color: NEON.purple },
  holiday:   { icon: 'snowflake',            color: COLORS.gemDiamond },
};

const GENRES: Array<{ label: string; value: SongGenre | 'all' }> = [
  { label: 'All', value: 'all' },
  { label: 'Classical', value: 'classical' },
  { label: 'Folk', value: 'folk' },
  { label: 'Pop', value: 'pop' },
  { label: 'Film', value: 'film' },
  { label: 'Game', value: 'game' },
  { label: 'Holiday', value: 'holiday' },
];

const DIFFICULTIES = [1, 2, 3, 4, 5] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GenrePill({
  label,
  value,
  isActive,
  onPress,
}: {
  label: string;
  value: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const cfg = GENRE_CONFIG[value] ?? GENRE_CONFIG.all;
  const accentColor = cfg.color;

  return (
    <PressableScale
      style={[
        styles.genrePill,
        isActive && {
          backgroundColor: glowColor(accentColor, 0.15),
          borderColor: glowColor(accentColor, 0.4),
        },
      ]}
      onPress={onPress}
      testID={`genre-${label.toLowerCase()}`}
    >
      <MaterialCommunityIcons
        name={cfg.icon}
        size={14}
        color={isActive ? accentColor : COLORS.textMuted}
      />
      <Text style={[styles.genrePillText, isActive && { color: accentColor, fontWeight: '700' as const }]}>
        {label}
      </Text>
    </PressableScale>
  );
}

function DifficultyPill({
  level,
  isActive,
  onPress,
}: {
  level: number;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      style={[styles.difficultyPill, isActive && styles.difficultyPillActive]}
      onPress={onPress}
      testID={`difficulty-${level}`}
    >
      <MaterialCommunityIcons
        name="star"
        size={14}
        color={isActive ? COLORS.background : COLORS.textMuted}
      />
      <Text style={[styles.difficultyPillText, isActive && styles.difficultyPillTextActive]}>
        {level}
      </Text>
    </PressableScale>
  );
}

// ---------------------------------------------------------------------------
// Mastery badge icon mapping
// ---------------------------------------------------------------------------

const MASTERY_ICONS: Record<Exclude<MasteryTier, 'none'>, keyof typeof MaterialCommunityIcons.glyphMap> = {
  bronze: 'shield-half-full',
  silver: 'shield-check',
  gold: 'trophy',
  platinum: 'diamond-stone',
};

// ---------------------------------------------------------------------------
// Difficulty star colors — ramps from green (easy) to red (hard)
// ---------------------------------------------------------------------------

const DIFFICULTY_STAR_COLORS: Record<number, string> = {
  1: COLORS.success,
  2: NEON.green,
  3: COLORS.starGold,
  4: COLORS.warning,
  5: COLORS.error,
};

// ---------------------------------------------------------------------------
// Dark text color for light badge backgrounds
// ---------------------------------------------------------------------------

const BADGE_DARK_TEXT = COLORS.surface;

// ---------------------------------------------------------------------------
// Metallic Mastery Badge
// ---------------------------------------------------------------------------

function MasteryBadge({ tier }: { tier: MasteryTier }) {
  if (tier === 'none') return null;

  const color = masteryColor(tier);
  const icon = MASTERY_ICONS[tier];
  const isPlatinum = tier === 'platinum';
  const useDarkText = tier === 'silver' || tier === 'platinum';

  return (
    <View
      style={[
        styles.masteryBadge,
        {
          backgroundColor: color,
          borderWidth: 1,
          borderColor: isPlatinum ? COLORS.textPrimary : color,
        },
      ]}
      testID="mastery-badge"
    >
      <MaterialCommunityIcons
        name={icon}
        size={11}
        color={useDarkText ? BADGE_DARK_TEXT : COLORS.textPrimary}
        style={{ marginRight: 3 }}
      />
      <Text
        style={[
          styles.masteryBadgeText,
          {
            color: useDarkText ? BADGE_DARK_TEXT : COLORS.textPrimary,
          },
        ]}
      >
        {masteryLabel(tier)}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pulsing "NEW" Badge
// ---------------------------------------------------------------------------

function NewBadge() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 1200 }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.newBadge, animatedStyle]}
      testID="new-badge"
    >
      <Text style={styles.newBadgeText}>NEW</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Difficulty Dots (1-5 filled circles)
// ---------------------------------------------------------------------------

function DifficultyDots({ difficulty }: { difficulty: number }) {
  const filledColor = DIFFICULTY_STAR_COLORS[difficulty] ?? COLORS.starGold;
  return (
    <View style={styles.difficultyDots}>
      {Array.from({ length: 5 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.difficultyDot,
            {
              backgroundColor: i < difficulty ? filledColor : COLORS.cardBorder,
            },
          ]}
        />
      ))}
    </View>
  );
}

function SongCard({
  summary,
  mastery,
  onPress,
}: {
  summary: SongSummary;
  mastery: MasteryTier;
  onPress: () => void;
}) {
  const isNew = mastery === 'none';
  const genreCfg = GENRE_CONFIG[summary.metadata.genre] ?? GENRE_CONFIG.all;
  const genreAccent = genreCfg.color;

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <PressableScale
        style={[
          styles.songCard,
          SHADOWS.sm as Record<string, unknown>,
          { borderLeftWidth: 3, borderLeftColor: genreAccent },
        ]}
        onPress={onPress}
        testID={`song-card-${summary.id}`}
      >
        <View style={styles.songCardContent}>
          <View style={styles.songCardLeft}>
            <Text style={styles.songTitle} numberOfLines={1}>{summary.metadata.title}</Text>
            <Text style={styles.songArtist} numberOfLines={1}>{summary.metadata.artist}</Text>
            <View style={styles.songMeta}>
              <View style={[styles.genreChip, { backgroundColor: glowColor(genreAccent, 0.12) }]}>
                <MaterialCommunityIcons
                  name={genreCfg.icon}
                  size={10}
                  color={genreAccent}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.genreChipText, { color: genreAccent }]}>
                  {summary.metadata.genre}
                </Text>
              </View>
              <DifficultyDots difficulty={summary.metadata.difficulty} />
              <Text style={styles.durationText}>
                {Math.floor(summary.metadata.durationSeconds / 60)}:{String(summary.metadata.durationSeconds % 60).padStart(2, '0')}
              </Text>
            </View>
          </View>
          <View style={styles.songCardRight}>
            {isNew ? <NewBadge /> : <MasteryBadge tier={mastery} />}
            <MaterialCommunityIcons name="chevron-right" size={20} color={COLORS.textMuted} />
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Request Modal
// ---------------------------------------------------------------------------

function RequestSongModal({
  visible,
  onClose,
  onSubmit,
  isGenerating,
  canRequest,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (params: SongRequestParams) => void;
  isGenerating: boolean;
  canRequest: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(2);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), artist: artist.trim() || undefined, difficulty });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" testID="request-modal">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Request a Song</Text>

          {!canRequest && (
            <View style={styles.rateLimitWarning} testID="rate-limit-warning">
              <MaterialCommunityIcons name="clock-alert-outline" size={18} color={COLORS.error} />
              <Text style={styles.rateLimitText}>Daily limit reached (5/day)</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Song title"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
            testID="request-title-input"
          />

          <TextInput
            style={styles.input}
            placeholder="Artist (optional)"
            placeholderTextColor={COLORS.textMuted}
            value={artist}
            onChangeText={setArtist}
            testID="request-artist-input"
          />

          <Text style={styles.difficultyLabel}>Difficulty</Text>
          <View style={styles.difficultyRow}>
            {DIFFICULTIES.map((d) => (
              <DifficultyPill
                key={d}
                level={d}
                isActive={difficulty === d}
                onPress={() => setDifficulty(d)}
              />
            ))}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.modalActions}>
            <PressableScale style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </PressableScale>
            <PressableScale
              style={[styles.submitButton, (!canRequest || isGenerating) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canRequest || isGenerating || !title.trim()}
              testID="request-submit-button"
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <Text style={styles.submitButtonText}>Generate</Text>
              )}
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export function SongLibraryScreen() {
  const navigation = useNavigation<NavProp>();
  const {
    summaries,
    isLoadingSummaries,
    filter,
    isGeneratingSong,
    generationError,
    setFilter,
    loadSummaries,
    loadMoreSummaries,
    getMastery,
    requestSong,
    canRequestSong,
  } = useSongStore();
  const gems = useGemStore((s) => s.gems);
  const uid = useAuthStore((s) => s.user?.uid ?? '');

  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const isInitialMount = useRef(true);

  // Load on mount
  useEffect(() => {
    loadSummaries();
  }, []);

  // Debounced search — skip initial mount (already loaded above)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setFilter({ searchQuery: searchText || undefined });
      loadSummaries();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const activeGenre = filter.genre ?? 'all';
  const activeDifficulty = filter.difficulty ?? 'all';

  const handleGenrePress = useCallback(
    (genre: SongGenre | 'all') => {
      setFilter({ genre });
      loadSummaries();
    },
    [setFilter, loadSummaries],
  );

  const handleDifficultyPress = useCallback(
    (d: number) => {
      const newVal = activeDifficulty === d ? 'all' : d;
      setFilter({ difficulty: newVal });
      loadSummaries();
    },
    [activeDifficulty, setFilter, loadSummaries],
  );

  const handleSongPress = useCallback(
    (songId: string) => {
      navigation.navigate('SongPlayer', { songId });
    },
    [navigation],
  );

  const handleRequestSubmit = useCallback(
    async (params: SongRequestParams) => {
      const song = await requestSong(params, uid);
      if (song) {
        setRequestModalVisible(false);
        navigation.navigate('SongPlayer', { songId: song.id });
      }
    },
    [requestSong, uid, navigation],
  );

  const renderSongCard = useCallback(
    ({ item }: { item: SongSummary }) => {
      const mastery = getMastery(item.id)?.tier ?? 'none';
      return (
        <SongCard
          summary={item}
          mastery={mastery}
          onPress={() => handleSongPress(item.id)}
        />
      );
    },
    [getMastery, handleSongPress],
  );

  const keyExtractor = useCallback((item: SongSummary) => item.id, []);

  return (
    <SafeAreaView style={styles.container} testID="song-library-screen">
      <GradientMeshBackground accent="songs" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Music Library</Text>
        <View style={styles.gemChip}>
          <MaterialCommunityIcons name="diamond-stone" size={16} color={COLORS.gemDiamond} />
          <Text style={styles.gemText}>{gems}</Text>
        </View>
      </View>

      {/* Genre carousel — ScrollView instead of FlatList to prevent vertical clipping */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreCarousel}
        style={styles.genreCarouselWrapper}
      >
        {GENRES.map((item) => (
          <GenrePill
            key={item.value}
            label={item.label}
            value={item.value}
            isActive={activeGenre === item.value}
            onPress={() => handleGenrePress(item.value)}
          />
        ))}
      </ScrollView>

      {/* Search bar */}
      <View style={[
        styles.searchContainer,
        searchFocused && { borderColor: COLORS.primary },
      ]}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={searchFocused ? COLORS.primary : COLORS.textMuted}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search songs..."
          placeholderTextColor={COLORS.textMuted}
          value={searchText}
          onChangeText={setSearchText}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          testID="search-input"
        />
        {searchText.length > 0 && (
          <PressableScale onPress={() => setSearchText('')} style={{ padding: SPACING.xs }}>
            <MaterialCommunityIcons name="close-circle" size={16} color={COLORS.textMuted} />
          </PressableScale>
        )}
      </View>

      {/* Difficulty filter */}
      <View style={styles.difficultyRow}>
        {DIFFICULTIES.map((d) => (
          <DifficultyPill
            key={d}
            level={d}
            isActive={activeDifficulty === d}
            onPress={() => handleDifficultyPress(d)}
          />
        ))}
      </View>

      {/* Song list */}
      <FlatList
        data={summaries}
        keyExtractor={keyExtractor}
        renderItem={renderSongCard}
        onEndReached={loadMoreSummaries}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.songList}
        ListEmptyComponent={
          isLoadingSummaries ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="music-note-off" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No songs found</Text>
            </View>
          )
        }
        testID="song-list"
      />

      {/* FAB — Request a Song */}
      <PressableScale
        style={styles.fab}
        onPress={() => setRequestModalVisible(true)}
        testID="request-fab"
      >
        <MaterialCommunityIcons name="music-note-plus" size={24} color={COLORS.background} />
      </PressableScale>

      {/* Request modal */}
      <RequestSongModal
        visible={requestModalVisible}
        onClose={() => setRequestModalVisible(false)}
        onSubmit={handleRequestSubmit}
        isGenerating={isGeneratingSong}
        canRequest={canRequestSong()}
        error={generationError}
      />
    </SafeAreaView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.heading.lg,
    color: COLORS.textPrimary,
  },
  gemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  gemText: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.gemDiamond,
    fontWeight: '600',
  },

  // Genre carousel
  genreCarouselWrapper: {
    marginBottom: SPACING.sm,
    overflow: 'visible',
  },
  genreCarousel: {
    paddingHorizontal: SPACING.lg,
    paddingRight: SPACING.xxl,
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  genrePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs + 1,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    minHeight: 36,
  },
  genrePillText: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    backgroundColor: glowColor(COLORS.textPrimary, 0.06),
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: glowColor(COLORS.textPrimary, 0.10),
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body.md,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
    marginLeft: SPACING.xs,
  },

  // Difficulty
  difficultyRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.xs,
    gap: SPACING.xs,
  },
  difficultyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 2,
  },
  difficultyPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  difficultyPillText: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
  },
  difficultyPillTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },

  // Song list
  songList: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  songCard: {
    backgroundColor: glowColor(COLORS.textPrimary, 0.06),
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: glowColor(COLORS.textPrimary, 0.10),
  },
  songCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  songCardLeft: {
    flex: 1,
  },
  songCardRight: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  songTitle: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  songArtist: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  genreChipText: {
    ...TYPOGRAPHY.caption.sm,
    textTransform: 'capitalize',
  },
  difficultyDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  durationText: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
  },

  // Mastery badge (metallic style)
  masteryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  masteryBadgeText: {
    ...TYPOGRAPHY.caption.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // NEW badge (pulsing)
  newBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  newBadgeText: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textPrimary,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Empty / loading
  loader: {
    marginTop: 60,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    gap: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textMuted,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 100,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md as Record<string, unknown>,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: glowColor('#000000', 0.6),
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.heading.md,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.body.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: SPACING.sm,
  },
  difficultyLabel: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  rateLimitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glowColor(COLORS.error, 0.15),
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  rateLimitText: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.error,
  },
  errorText: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.background,
    fontWeight: '600',
  },
});

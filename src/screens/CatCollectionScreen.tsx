/**
 * CatCollectionScreen - Full-featured cat collection gallery
 *
 * Three sections:
 * 1. Active Cat Showcase (top ~35%) — large avatar, name, personality, evolution progress, abilities
 * 2. Cat Collection Grid (middle ~45%) — 3-column grid of all 12 cats with ownership states
 * 3. Ability Codex (bottom ~20%) — horizontal scroll of ability cards for selected cat
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { CatAvatar } from '../components/Mascot/CatAvatar';
import { CAT_CHARACTERS, getCatById } from '../components/Mascot/catCharacters';
import type { CatCharacter } from '../components/Mascot/catCharacters';
import { useCatEvolutionStore, xpToNextStage, stageFromXp } from '../stores/catEvolutionStore';
import { useGemStore } from '../stores/gemStore';
import { useSettingsStore } from '../stores/settingsStore';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme/tokens';
import { EVOLUTION_XP_THRESHOLDS } from '../stores/types';
import type { EvolutionStage } from '../stores/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = SPACING.md;
const GRID_GAP = SPACING.sm;
const GRID_COLUMNS = 3;
const CELL_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const STAGE_LABELS: Record<EvolutionStage, string> = {
  baby: 'Baby',
  teen: 'Teen',
  adult: 'Adult',
  master: 'Master',
};

const STAGE_COLORS: Record<EvolutionStage, string> = {
  baby: '#81D4FA',
  teen: '#4CAF50',
  adult: '#FFD700',
  master: '#E040FB',
};

/** Active Cat Showcase — top section with large avatar and evolution info */
function ActiveCatShowcase({
  cat,
  evolutionXp,
  stage,
  unlockedAbilities,
}: {
  cat: CatCharacter;
  evolutionXp: number;
  stage: EvolutionStage;
  unlockedAbilities: string[];
}): React.ReactElement {
  const nextInfo = xpToNextStage(evolutionXp);

  // Calculate progress bar ratio
  const currentThreshold = EVOLUTION_XP_THRESHOLDS[stage];
  const nextThreshold = nextInfo
    ? EVOLUTION_XP_THRESHOLDS[nextInfo.nextStage]
    : EVOLUTION_XP_THRESHOLDS.master;
  const progressInStage = evolutionXp - currentThreshold;
  const stageRange = nextThreshold - currentThreshold;
  const progressRatio = stageRange > 0 ? Math.min(1, progressInStage / stageRange) : 1;

  return (
    <View style={styles.showcaseContainer}>
      <LinearGradient
        colors={[cat.color + '20', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Large Cat Avatar */}
      <View style={styles.showcaseAvatar}>
        <CatAvatar catId={cat.id} size="large" showGlow />
      </View>

      {/* Name and personality */}
      <Text style={styles.showcaseName}>{cat.name}</Text>
      <View style={[styles.personalityBadge, { backgroundColor: cat.color + '25' }]}>
        <Text style={[styles.personalityText, { color: cat.color }]}>{cat.personality}</Text>
      </View>

      {/* Evolution progress bar */}
      <View style={styles.evolutionRow}>
        <Text style={[styles.stageBadgeText, { color: STAGE_COLORS[stage] }]}>
          {STAGE_LABELS[stage]}
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressRatio * 100}%`,
                  backgroundColor: cat.color,
                },
              ]}
            />
          </View>
        </View>
        {nextInfo ? (
          <Text style={styles.xpText}>
            {nextInfo.xpNeeded} XP to {STAGE_LABELS[nextInfo.nextStage]}
          </Text>
        ) : (
          <Text style={[styles.xpText, { color: STAGE_COLORS.master }]}>MAX</Text>
        )}
      </View>

      {/* Active abilities row */}
      <View style={styles.abilitiesRow}>
        {cat.abilities.map((ability) => {
          const isUnlocked = unlockedAbilities.includes(ability.id);
          return (
            <View
              key={ability.id}
              style={[
                styles.abilityIcon,
                {
                  backgroundColor: isUnlocked ? cat.color + '30' : COLORS.surface,
                  borderColor: isUnlocked ? cat.color + '60' : COLORS.cardBorder,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={ability.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={18}
                color={isUnlocked ? cat.color : COLORS.textMuted}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Single cell in the cat collection grid */
function CatGridCell({
  cat,
  isOwned,
  isSelected,
  stage,
  onPress,
}: {
  cat: CatCharacter;
  isOwned: boolean;
  isSelected: boolean;
  stage: EvolutionStage | null;
  onPress: () => void;
}): React.ReactElement {
  return (
    <TouchableOpacity
      style={[
        styles.gridCell,
        isOwned && { borderColor: cat.color + '60', borderWidth: 2 },
        isSelected && { borderColor: cat.color, borderWidth: 2 },
        !isOwned && styles.gridCellLocked,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`cat-collection-cell-${cat.id}`}
    >
      {isOwned ? (
        <>
          <CatAvatar catId={cat.id} size="small" skipEntryAnimation />
          <Text style={styles.gridCellName} numberOfLines={1}>
            {cat.name}
          </Text>
          {stage && (
            <View style={[styles.stageBadge, { backgroundColor: STAGE_COLORS[stage] + '30' }]}>
              <Text style={[styles.stageBadgeSmall, { color: STAGE_COLORS[stage] }]}>
                {STAGE_LABELS[stage]}
              </Text>
            </View>
          )}
          {isSelected && (
            <View style={[styles.selectedDot, { backgroundColor: cat.color }]} />
          )}
        </>
      ) : (
        <>
          <View style={styles.lockedAvatarContainer}>
            <MaterialCommunityIcons name="lock" size={24} color={COLORS.textMuted} />
          </View>
          <Text style={[styles.gridCellName, { color: COLORS.textMuted }]} numberOfLines={1}>
            {cat.name}
          </Text>
          {cat.legendary ? (
            <View style={[styles.costBadge, { backgroundColor: '#FF8C00' + '30' }]}>
              <MaterialCommunityIcons name="star-four-points" size={10} color="#FF8C00" />
              <Text style={[styles.costBadgeText, { color: '#FF8C00' }]}>Legendary</Text>
            </View>
          ) : cat.gemCost ? (
            <View style={[styles.costBadge, { backgroundColor: COLORS.gemDiamond + '20' }]}>
              <MaterialCommunityIcons name="diamond-stone" size={10} color={COLORS.gemDiamond} />
              <Text style={[styles.costBadgeText, { color: COLORS.gemDiamond }]}>
                {cat.gemCost}
              </Text>
            </View>
          ) : (
            <View style={[styles.costBadge, { backgroundColor: COLORS.gemDiamond + '20' }]}>
              <MaterialCommunityIcons name="diamond-stone" size={10} color={COLORS.gemDiamond} />
              <Text style={[styles.costBadgeText, { color: COLORS.gemDiamond }]}>500</Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

/** Ability Codex — horizontal scroll of ability cards */
function AbilityCodex({
  cat,
  unlockedAbilities,
}: {
  cat: CatCharacter;
  unlockedAbilities: string[];
}): React.ReactElement {
  return (
    <View style={styles.codexContainer}>
      <Text style={styles.sectionTitle}>Ability Codex</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.codexScroll}
      >
        {cat.abilities.map((ability) => {
          const isUnlocked = unlockedAbilities.includes(ability.id);
          return (
            <View
              key={ability.id}
              style={[
                styles.abilityCard,
                isUnlocked
                  ? { backgroundColor: cat.color + '18', borderColor: cat.color + '40' }
                  : { backgroundColor: COLORS.surface, borderColor: COLORS.cardBorder },
              ]}
            >
              <MaterialCommunityIcons
                name={ability.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={24}
                color={isUnlocked ? cat.color : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.abilityCardName,
                  { color: isUnlocked ? COLORS.textPrimary : COLORS.textMuted },
                ]}
                numberOfLines={1}
              >
                {ability.name}
              </Text>
              <Text
                style={[
                  styles.abilityCardDesc,
                  { color: isUnlocked ? COLORS.textSecondary : COLORS.cardBorder },
                ]}
                numberOfLines={2}
              >
                {ability.description}
              </Text>
              <Text
                style={[
                  styles.abilityCardStage,
                  { color: STAGE_COLORS[ability.unlockedAtStage] },
                ]}
              >
                {STAGE_LABELS[ability.unlockedAtStage]}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function CatCollectionScreen(): React.ReactElement {
  const navigation = useNavigation();

  // Store state
  const selectedCatId = useCatEvolutionStore((s) => s.selectedCatId);
  const ownedCats = useCatEvolutionStore((s) => s.ownedCats);
  const evolutionData = useCatEvolutionStore((s) => s.evolutionData);
  const selectCat = useCatEvolutionStore((s) => s.selectCat);
  const unlockCat = useCatEvolutionStore((s) => s.unlockCat);

  const gems = useGemStore((s) => s.gems);
  const canAfford = useGemStore((s) => s.canAfford);
  const spendGems = useGemStore((s) => s.spendGems);

  const setSelectedCatId = useSettingsStore((s) => s.setSelectedCatId);
  const setAvatarEmoji = useSettingsStore((s) => s.setAvatarEmoji);

  // Derived: active cat info
  const activeCat = useMemo(() => getCatById(selectedCatId) ?? CAT_CHARACTERS[0], [selectedCatId]);
  const activeEvolution = evolutionData[selectedCatId];
  const activeStage: EvolutionStage = activeEvolution
    ? stageFromXp(activeEvolution.xpAccumulated)
    : 'baby';
  const activeXp = activeEvolution?.xpAccumulated ?? 0;
  const activeAbilities = activeEvolution?.abilitiesUnlocked ?? [];

  const handleCatPress = useCallback(
    (cat: CatCharacter) => {
      const isOwned = ownedCats.includes(cat.id);

      if (isOwned) {
        // Switch active cat
        selectCat(cat.id);
        setSelectedCatId(cat.id);
        setAvatarEmoji(cat.emoji);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (cat.legendary) {
        // Legendary cat — show info
        Alert.alert(
          `${cat.name}`,
          'Legendary — Requires 300-day streak or 100 skills mastered.',
          [{ text: 'OK' }],
        );
      } else {
        // Gem-purchasable cat
        const cost = cat.gemCost ?? 500; // starters cost 500 if not free-picked
        if (canAfford(cost)) {
          Alert.alert(
            `Unlock ${cat.name}?`,
            `Spend ${cost} gems to add ${cat.name} to your collection?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Unlock',
                onPress: () => {
                  const success = spendGems(cost, `unlock-cat-${cat.id}`);
                  if (success) {
                    unlockCat(cat.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                },
              },
            ],
          );
        } else {
          const deficit = cost - gems;
          Alert.alert(
            `Not Enough Gems`,
            `${cat.name} costs ${cost} gems. You need ${deficit} more gems.`,
            [{ text: 'OK' }],
          );
        }
      }
    },
    [ownedCats, selectCat, setSelectedCatId, setAvatarEmoji, canAfford, spendGems, unlockCat, gems],
  );

  return (
    <View style={styles.container} testID="cat-collection-screen">
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="cat-collection-back"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cat Collection</Text>
          <View style={styles.gemBadge}>
            <MaterialCommunityIcons name="diamond-stone" size={16} color={COLORS.gemDiamond} />
            <Text style={styles.gemCount}>{gems}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Active Cat Showcase */}
          <ActiveCatShowcase
            cat={activeCat}
            evolutionXp={activeXp}
            stage={activeStage}
            unlockedAbilities={activeAbilities}
          />

          {/* Section 2: Cat Collection Grid */}
          <View style={styles.gridSection}>
            <Text style={styles.sectionTitle}>
              Collection ({ownedCats.length}/{CAT_CHARACTERS.length})
            </Text>
            <View style={styles.grid}>
              {CAT_CHARACTERS.map((cat) => {
                const isOwned = ownedCats.includes(cat.id);
                const catEvolution = evolutionData[cat.id];
                const catStage: EvolutionStage | null = catEvolution
                  ? stageFromXp(catEvolution.xpAccumulated)
                  : null;
                return (
                  <CatGridCell
                    key={cat.id}
                    cat={cat}
                    isOwned={isOwned}
                    isSelected={selectedCatId === cat.id}
                    stage={catStage}
                    onPress={() => handleCatPress(cat)}
                  />
                );
              })}
            </View>
          </View>

          {/* Section 3: Ability Codex */}
          <AbilityCodex cat={activeCat} unlockedAbilities={activeAbilities} />

          {/* Bottom spacer */}
          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  gemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gemDiamond + '40',
  },
  gemCount: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gemDiamond,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.lg,
  },

  // Section 1: Active Cat Showcase
  showcaseContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  showcaseAvatar: {
    marginBottom: SPACING.sm,
  },
  showcaseName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  personalityBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.md,
  },
  personalityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  evolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    width: '100%',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  stageBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 40,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    minWidth: 80,
    textAlign: 'right',
  },
  abilitiesRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  abilityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  // Section 2: Cat Collection Grid
  gridSection: {
    paddingHorizontal: GRID_PADDING,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridCell: {
    width: CELL_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    minHeight: 110,
    justifyContent: 'center',
  },
  gridCellLocked: {
    opacity: 0.6,
  },
  gridCellName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  stageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: 3,
  },
  stageBadgeSmall: {
    fontSize: 9,
    fontWeight: '700',
  },
  selectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
  },
  lockedAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.cardBorder + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: 3,
  },
  costBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Section 3: Ability Codex
  codexContainer: {
    paddingLeft: GRID_PADDING,
  },
  codexScroll: {
    paddingRight: GRID_PADDING,
    gap: SPACING.sm,
  },
  abilityCard: {
    width: 140,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    gap: 4,
  },
  abilityCardName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  abilityCardDesc: {
    fontSize: 10,
    lineHeight: 14,
  },
  abilityCardStage: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
});

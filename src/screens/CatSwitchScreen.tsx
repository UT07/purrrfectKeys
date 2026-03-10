/**
 * CatSwitchScreen - Unified Cat Gallery (Subway Surfers-inspired)
 *
 * Merges CatSwitchScreen + CatCollectionScreen into a single swipeable gallery.
 * Each card shows: large avatar, evolution stage, name/personality, music skill,
 * evolution progress bar, ability icons, and action button (select/buy/locked).
 *
 * Cards are ~88% screen width for a prominent Subway Surfers feel with subtle
 * adjacent card peeks.
 */

import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
  Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { CatAvatar } from '../components/Mascot/CatAvatar';
import { AbilityIcon } from '../components/Mascot/svg/AbilityIcons';
import { AbilityPreviewOverlay } from '../components/Mascot/svg/AbilityPreview';
import { CAT_CHARACTERS, isCatOwned, getCatById } from '../components/Mascot/catCharacters';
import type { CatCharacter } from '../components/Mascot/catCharacters';
import { useSettingsStore } from '../stores/settingsStore';
import { useCatEvolutionStore, stageFromXp, xpToNextStage } from '../stores/catEvolutionStore';
import { useGemStore } from '../stores/gemStore';
import { EVOLUTION_XP_THRESHOLDS } from '../stores/types';
import type { EvolutionStage, CatAbility } from '../stores/types';
import { PressableScale } from '../components/common/PressableScale';
import { GradientMeshBackground } from '../components/effects';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, RARITY, TYPOGRAPHY, glowColor } from '../theme/tokens';
import type { RarityLevel } from '../theme/tokens';
import { analyticsEvents } from '../services/analytics/PostHog';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.88;
const CARD_SPACING = 12;
const SNAP_INTERVAL = CARD_WIDTH + CARD_SPACING;

const STAGE_LABELS: Record<EvolutionStage, string> = {
  baby: 'Baby',
  teen: 'Teen',
  adult: 'Adult',
  master: 'Master',
};

const STAGE_COLORS: Record<EvolutionStage, string> = {
  baby: COLORS.gemDiamond,
  teen: COLORS.success,
  adult: COLORS.starGold,
  master: COLORS.starGold,
};

const EVOLUTION_STAGES: EvolutionStage[] = ['baby', 'teen', 'adult', 'master'];

/** Determine rarity tier from cat character data */
function getCatRarity(cat: CatCharacter): RarityLevel {
  if (cat.legendary) return 'legendary';
  if (cat.starterCat) return 'common';
  return 'rare';
}

// ───────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────

/** Animated burst particles on character select */
function SelectBurst({ color, active }: { color: string; active: boolean }): React.ReactElement | null {
  const particles = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      angle: (i * 45) * (Math.PI / 180),
    })),
    [],
  );

  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = 0;
      progress.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    }
  }, [active, progress]);

  if (!active) return null;

  return (
    <View style={styles.burstContainer} pointerEvents="none">
      {particles.map((p) => (
        <BurstParticle key={p.id} angle={p.angle} color={color} progress={progress} />
      ))}
    </View>
  );
}

function BurstParticle({ angle, color, progress }: {
  angle: number;
  color: string;
  progress: Animated.SharedValue<number>;
}): React.ReactElement {
  const animStyle = useAnimatedStyle(() => {
    const dist = interpolate(progress.value, [0, 1], [0, 60]);
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0, 1, 0]);
    const scale = interpolate(progress.value, [0, 0.5, 1], [0.3, 1.2, 0]);
    return {
      opacity,
      transform: [
        { translateX: Math.cos(angle) * dist },
        { translateY: Math.sin(angle) * dist },
        { scale },
      ],
    };
  });

  return (
    <Animated.View style={[styles.burstParticle, { backgroundColor: color }, animStyle]} />
  );
}

/** Stage platform beneath character */
function StagePlatform({ color }: { color: string }): React.ReactElement {
  return (
    <View style={styles.stageContainer}>
      <View style={[styles.stagePlatform, { backgroundColor: glowColor(color, 0.15) }]} />
      <View style={[styles.stageShadow, { backgroundColor: glowColor(color, 0.07) }]} />
      <View style={[styles.stageShine, { backgroundColor: glowColor(color, 0.25) }]} />
    </View>
  );
}

/** Animated legendary shimmer border — cycles between gold and a warm orange-gold */
function LegendaryShimmerBorder(): React.ReactElement {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [shimmer]);

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      shimmer.value,
      [0, 1],
      [RARITY.legendary.borderColor, COLORS.warning],
    );
    return { borderColor };
  });

  return (
    <Animated.View style={[styles.legendaryBorder, animatedBorderStyle]} pointerEvents="none" />
  );
}

/** Evolution stage preview dots — shows 4 dots for baby/teen/adult/master */
function EvolutionStageDots({ currentStage }: { currentStage: EvolutionStage }): React.ReactElement {
  const currentStageIndex = EVOLUTION_STAGES.indexOf(currentStage);

  return (
    <View style={styles.stageDotRow}>
      {EVOLUTION_STAGES.map((stage, i) => {
        const isFilled = i <= currentStageIndex;
        return (
          <View
            key={stage}
            style={[
              styles.stageDot,
              {
                backgroundColor: isFilled ? STAGE_COLORS[stage] : COLORS.cardBorder,
                opacity: isFilled ? 1 : 0.4,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/** Ability icon row — 4 illustrated SVG icons with stage-based unlock indicators */
function AbilityIconRow({ abilities, unlockedAbilities, catColor, onTap }: {
  abilities: CatAbility[];
  unlockedAbilities: string[];
  catColor: string;
  onTap: (ability: CatAbility) => void;
}): React.ReactElement {
  return (
    <View style={styles.abilityRow}>
      {abilities.map((ability) => {
        const isUnlocked = unlockedAbilities.includes(ability.id);
        return (
          <PressableScale
            key={ability.id}
            style={[
              styles.abilityIcon,
              {
                backgroundColor: isUnlocked ? glowColor(catColor, 0.19) : COLORS.surface,
                borderColor: isUnlocked ? glowColor(catColor, 0.38) : COLORS.cardBorder,
              },
            ]}
            onPress={() => onTap(ability)}
          >
            <AbilityIcon
              abilityType={ability.effect.type}
              unlocked={isUnlocked}
              size={28}
              catColor={catColor}
            />
            {!isUnlocked && (
              <View style={styles.abilityLockBadge}>
                <MaterialCommunityIcons name="lock" size={8} color={COLORS.textMuted} />
              </View>
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}

/** Inline ability detail that expands below the icon row */
function AbilityDetail({ ability, catColor, isUnlocked }: {
  ability: CatAbility;
  catColor: string;
  isUnlocked: boolean;
}): React.ReactElement {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={[styles.abilityDetail, { borderColor: isUnlocked ? glowColor(catColor, 0.25) : COLORS.cardBorder }]}
    >
      <AbilityIcon
        abilityType={ability.effect.type}
        unlocked={isUnlocked}
        size={32}
        catColor={catColor}
      />
      <View style={styles.abilityDetailText}>
        <Text style={[styles.abilityDetailName, { color: isUnlocked ? COLORS.textPrimary : COLORS.textMuted }]}>
          {ability.name}
        </Text>
        <Text style={[styles.abilityDetailDesc, { color: isUnlocked ? COLORS.textSecondary : COLORS.cardBorder }]}>
          {ability.description}
        </Text>
        <Text style={[styles.abilityDetailStage, { color: STAGE_COLORS[ability.unlockedAtStage] }]}>
          Unlocks at {STAGE_LABELS[ability.unlockedAtStage]}
        </Text>
      </View>
    </Animated.View>
  );
}

/** Styled buy modal (replaces Alert.alert) */
function BuyModal({ visible, cat, gems, onConfirm, onCancel }: {
  visible: boolean;
  cat: CatCharacter | null;
  gems: number;
  onConfirm: () => void;
  onCancel: () => void;
}): React.ReactElement | null {
  if (!cat) return null;
  const cost = cat.gemCost ?? 500;
  const canAfford = gems >= cost;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <LinearGradient
            colors={[glowColor(cat.color, 0.13), 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          <CatAvatar catId={cat.id} size="large" skipEntryAnimation />
          <Text style={styles.modalTitle}>Unlock {cat.name}?</Text>
          <View style={styles.modalCostRow}>
            <MaterialCommunityIcons name="diamond-stone" size={18} color={COLORS.gemGold} />
            <Text style={styles.modalCostText}>{cost}</Text>
          </View>
          <Text style={styles.modalBalance}>
            Your balance: {gems} gems
            {!canAfford && ` (need ${cost - gems} more)`}
          </Text>
          <View style={styles.modalButtons}>
            <PressableScale style={styles.modalCancelBtn} onPress={onCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </PressableScale>
            {canAfford ? (
              <PressableScale
                style={[styles.modalConfirmBtn, { backgroundColor: cat.color }]}
                onPress={onConfirm}
              >
                <MaterialCommunityIcons name="diamond-stone" size={16} color={COLORS.textPrimary} />
                <Text style={styles.modalConfirmText}>Unlock</Text>
              </PressableScale>
            ) : (
              <View style={[styles.modalConfirmBtn, { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder }]}>
                <Text style={[styles.modalConfirmText, { color: COLORS.textMuted }]}>Not enough gems</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ───────────────────────────────────────────────────────
// Cat Card — full gallery card
// ───────────────────────────────────────────────────────

function CatCard({ cat, isSelected, isOwned, evolutionXp, stage, unlockedAbilities, onSelect, onBuy, index }: {
  cat: CatCharacter;
  isSelected: boolean;
  isOwned: boolean;
  evolutionXp: number;
  stage: EvolutionStage;
  unlockedAbilities: string[];
  onSelect: (id: string) => void;
  onBuy: (cat: CatCharacter) => void;
  index: number;
}): React.ReactElement {
  const [showBurst, setShowBurst] = useState(false);
  const [expandedAbility, setExpandedAbility] = useState<CatAbility | null>(null);

  // Evolution progress
  const nextInfo = xpToNextStage(evolutionXp);
  const currentThreshold = EVOLUTION_XP_THRESHOLDS[stage];
  const nextThreshold = nextInfo
    ? EVOLUTION_XP_THRESHOLDS[nextInfo.nextStage]
    : EVOLUTION_XP_THRESHOLDS.master;
  const progressInStage = evolutionXp - currentThreshold;
  const stageRange = nextThreshold - currentThreshold;
  const progressRatio = stageRange > 0 ? Math.min(1, progressInStage / stageRange) : 1;

  const handleSelect = useCallback(() => {
    if (!isOwned) {
      onBuy(cat);
      return;
    }
    setShowBurst(true);
    onSelect(cat.id);
    setTimeout(() => setShowBurst(false), 700);
  }, [cat, isOwned, onSelect, onBuy]);

  const handleAbilityTap = useCallback((ability: CatAbility) => {
    setExpandedAbility(prev => prev?.id === ability.id ? null : ability);
  }, []);

  // Action button label/state
  const actionButton = useMemo(() => {
    if (!isOwned) {
      if (cat.legendary) return { label: 'Legendary', type: 'legendary' as const };
      return { label: `Unlock for ${cat.gemCost ?? 500} gems`, type: 'buy' as const };
    }
    if (isSelected) return { label: 'Selected', type: 'selected' as const };
    return { label: 'Select', type: 'select' as const };
  }, [isOwned, isSelected, cat.legendary, cat.gemCost]);

  const rarity = getCatRarity(cat);
  const rarityStyle = RARITY[rarity];

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify().damping(14)}
      style={[
        styles.card,
        {
          borderColor: isSelected ? glowColor(cat.color, 0.50) : rarityStyle.borderColor,
          borderWidth: rarity === 'legendary' ? 2 : isSelected ? 2 : 1,
        },
        !isOwned && styles.cardLocked,
      ]}
    >
      {/* Legendary animated shimmer border overlay */}
      {rarity === 'legendary' && <LegendaryShimmerBorder />}

      {/* Background gradient tinted to cat's color */}
      <LinearGradient
        colors={[glowColor(cat.color, 0.08), 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Character showcase area — 3D for the focused owned cat, SVG for all others */}
      <View style={styles.showcaseArea}>
        {isOwned ? (
          <View style={styles.characterDisplay}>
            <SelectBurst color={cat.color} active={showBurst} />
            <CatAvatar
              catId={cat.id}
              size="hero"
              pose={isSelected ? 'celebrate' : undefined}
              evolutionStage={stage}
              skipEntryAnimation
            />
            {expandedAbility && (
              <AbilityPreviewOverlay
                abilityType={expandedAbility.effect.type}
                catColor={cat.color}
                active
                size={200}
              />
            )}
          </View>
        ) : (
          <View style={styles.lockedCharacter}>
            <View style={{ opacity: 0.4 }}>
              <CatAvatar
                catId={cat.id}
                size="hero"
                skipEntryAnimation
              />
            </View>
            <View style={styles.lockedBadge}>
              <MaterialCommunityIcons name="lock" size={20} color={COLORS.textPrimary} />
            </View>
          </View>
        )}
        <StagePlatform color={isOwned ? cat.color : COLORS.textMuted} />
      </View>

      {/* Evolution stage badge + stage dots */}
      {isOwned && (
        <>
          <View style={[styles.evolutionBadge, { backgroundColor: glowColor(STAGE_COLORS[stage], 0.15) }]}>
            <Text style={[styles.evolutionBadgeText, { color: STAGE_COLORS[stage] }]}>
              {STAGE_LABELS[stage]}
            </Text>
          </View>
          <EvolutionStageDots currentStage={stage} />
        </>
      )}

      {/* Cat info */}
      <View style={styles.infoSection}>
        <Text style={[styles.catName, !isOwned && { color: COLORS.textMuted }]}>
          {cat.name}
        </Text>

        <View style={[styles.personalityBadge, { backgroundColor: isOwned ? glowColor(cat.color, 0.15) : COLORS.surface }]}>
          <Text style={[styles.personalityText, { color: isOwned ? cat.color : COLORS.textMuted }]}>
            {cat.personality}
          </Text>
        </View>

        <Text style={[styles.musicSkill, !isOwned && { color: COLORS.cardBorder }]}>
          {cat.musicSkill}
        </Text>

        {/* Evolution progress bar (only for owned cats) */}
        {isOwned && (
          <View style={styles.evolutionRow}>
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
            {nextInfo ? (
              <Text style={styles.evolutionXpText}>
                {nextInfo.xpNeeded} XP to {STAGE_LABELS[nextInfo.nextStage]}
              </Text>
            ) : (
              <Text style={[styles.evolutionXpText, { color: STAGE_COLORS.master }]}>MAX</Text>
            )}
          </View>
        )}

        {/* Ability icons */}
        <AbilityIconRow
          abilities={cat.abilities}
          unlockedAbilities={unlockedAbilities}
          catColor={cat.color}
          onTap={handleAbilityTap}
        />

        {/* Expanded ability detail */}
        {expandedAbility && (
          <AbilityDetail
            ability={expandedAbility}
            catColor={cat.color}
            isUnlocked={unlockedAbilities.includes(expandedAbility.id)}
          />
        )}
      </View>

      {/* Action button */}
      <PressableScale
        style={[
          styles.actionButton,
          actionButton.type === 'selected' && { backgroundColor: 'transparent', borderWidth: 2, borderColor: cat.color },
          actionButton.type === 'select' && { backgroundColor: cat.color },
          actionButton.type === 'buy' && { backgroundColor: cat.color },
          actionButton.type === 'legendary' && { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: glowColor(COLORS.warning, 0.38) },
        ]}
        onPress={handleSelect}
        testID={`cat-switch-select-${cat.id}`}
      >
        {actionButton.type === 'selected' && (
          <MaterialCommunityIcons name="check-circle" size={18} color={cat.color} />
        )}
        {actionButton.type === 'buy' && (
          <MaterialCommunityIcons name="diamond-stone" size={16} color={COLORS.textPrimary} />
        )}
        {actionButton.type === 'legendary' && (
          <MaterialCommunityIcons name="star-four-points" size={16} color={COLORS.warning} />
        )}
        <Text style={[
          styles.actionButtonText,
          actionButton.type === 'selected' && { color: cat.color },
          actionButton.type === 'legendary' && { color: COLORS.warning },
        ]}>
          {actionButton.label}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

/** Navigation dots showing current position */
function PaginationDots({ total, currentIndex, cats }: {
  total: number;
  currentIndex: number;
  cats: CatCharacter[];
}): React.ReactElement {
  return (
    <View style={styles.paginationContainer}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.paginationDot,
            {
              backgroundColor: i === currentIndex ? cats[i].color : COLORS.cardBorder,
              width: i === currentIndex ? 20 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ───────────────────────────────────────────────────────
// Main Screen
// ───────────────────────────────────────────────────────

export function CatSwitchScreen(): React.ReactElement {
  const navigation = useNavigation();
  const selectedCatId = useSettingsStore((s) => s.selectedCatId);
  const setSelectedCatId = useSettingsStore((s) => s.setSelectedCatId);
  const setAvatarEmoji = useSettingsStore((s) => s.setAvatarEmoji);

  const ownedCats = useCatEvolutionStore((s) => s.ownedCats);
  const evolutionData = useCatEvolutionStore((s) => s.evolutionData);
  const selectCat = useCatEvolutionStore((s) => s.selectCat);
  const unlockCat = useCatEvolutionStore((s) => s.unlockCat);

  const gems = useGemStore((s) => s.gems);
  const canAfford = useGemStore((s) => s.canAfford);
  const spendGems = useGemStore((s) => s.spendGems);

  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [buyModalCat, setBuyModalCat] = useState<CatCharacter | null>(null);

  const initialIndex = useMemo(
    () => Math.max(0, CAT_CHARACTERS.findIndex((c) => c.id === selectedCatId)),
    [selectedCatId],
  );

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const handleSelect = useCallback((catId: string) => {
    if (!isCatOwned(catId, ownedCats)) return;
    setSelectedCatId(catId);
    selectCat(catId);
    analyticsEvents.cat.selected(catId);
    const cat = getCatById(catId);
    if (cat) {
      setAvatarEmoji(cat.emoji);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [ownedCats, setSelectedCatId, selectCat, setAvatarEmoji]);

  const handleBuy = useCallback((cat: CatCharacter) => {
    if (cat.legendary) {
      // Legendary cats can't be bought — just show info via the modal
      setBuyModalCat(cat);
      return;
    }
    setBuyModalCat(cat);
  }, []);

  const handleConfirmBuy = useCallback(() => {
    if (!buyModalCat) return;
    const cost = buyModalCat.gemCost ?? 500;
    if (!canAfford(cost)) return;
    const success = spendGems(cost, `unlock-cat-${buyModalCat.id}`);
    if (success) {
      unlockCat(buyModalCat.id);
      analyticsEvents.cat.unlocked(buyModalCat.id, cost);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setBuyModalCat(null);
  }, [buyModalCat, canAfford, spendGems, unlockCat]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = useCallback(({ item, index }: { item: CatCharacter; index: number }) => {
    const isOwned = isCatOwned(item.id, ownedCats);
    const catEvolution = evolutionData[item.id];
    const catStage: EvolutionStage = catEvolution ? stageFromXp(catEvolution.xpAccumulated) : 'baby';
    const catXp = catEvolution?.xpAccumulated ?? 0;
    const catAbilities = catEvolution?.abilitiesUnlocked ?? [];

    return (
      <CatCard
        cat={item}
        isSelected={selectedCatId === item.id}
        isOwned={isOwned}
        evolutionXp={catXp}
        stage={catStage}
        unlockedAbilities={catAbilities}
        onSelect={handleSelect}
        onBuy={handleBuy}
        index={index}
      />
    );
  }, [selectedCatId, ownedCats, evolutionData, handleSelect, handleBuy, currentIndex]);

  const keyExtractor = useCallback((item: CatCharacter) => item.id, []);

  const currentCat = CAT_CHARACTERS[currentIndex] ?? CAT_CHARACTERS[0];

  return (
    <View style={styles.container} testID="cat-switch-screen">
      <GradientMeshBackground accent="catStudio" />
      {/* Dynamic background gradient matching current cat */}
      <LinearGradient
        colors={[glowColor(currentCat.color, 0.09), COLORS.background, COLORS.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.header}>
          <PressableScale
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="cat-switch-back"
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
          </PressableScale>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Cat Gallery</Text>
            <Text style={styles.headerSubtitle}>
              {CAT_CHARACTERS.filter((c) => isCatOwned(c.id, ownedCats)).length} of {CAT_CHARACTERS.length} unlocked
            </Text>
          </View>
          {/* Customize button */}
          <PressableScale
            style={styles.customizeButton}
            onPress={() => (navigation as any).navigate('CatStudio')}
          >
            <MaterialCommunityIcons name="palette" size={16} color={COLORS.primary} />
            <Text style={styles.customizeText}>Studio</Text>
          </PressableScale>
          {/* Gem balance pill */}
          <View style={styles.gemPill}>
            <MaterialCommunityIcons name="diamond-stone" size={16} color={COLORS.gemGold} />
            <Text style={styles.gemPillText}>{gems}</Text>
          </View>
        </Animated.View>

        {/* Character gallery */}
        <FlatList
          ref={flatListRef}
          data={CAT_CHARACTERS}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          testID="cat-switch-list"
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={SNAP_INTERVAL}
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          initialScrollIndex={initialIndex}
          getItemLayout={(_data, index) => ({
            length: SNAP_INTERVAL,
            offset: SNAP_INTERVAL * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />

        {/* Pagination dots */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <PaginationDots
            total={CAT_CHARACTERS.length}
            currentIndex={currentIndex}
            cats={CAT_CHARACTERS}
          />
        </Animated.View>
      </SafeAreaView>

      {/* Buy modal */}
      <BuyModal
        visible={buyModalCat !== null}
        cat={buyModalCat}
        gems={gems}
        onConfirm={handleConfirmBuy}
        onCancel={() => setBuyModalCat(null)}
      />
    </View>
  );
}

// ───────────────────────────────────────────────────────
// Styles
// ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glowColor(COLORS.primary, 0.13),
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: glowColor(COLORS.primary, 0.25),
  },
  customizeText: {
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  gemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: glowColor(COLORS.starGold, 0.1),
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: glowColor(COLORS.starGold, 0.25),
  },
  gemPillText: {
    ...TYPOGRAPHY.body.md,
    fontWeight: '800',
    color: COLORS.gemGold,
  },

  listContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    gap: CARD_SPACING,
    paddingVertical: SPACING.sm,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingBottom: SPACING.lg,
  },
  cardLocked: {
    opacity: 0.7,
  },

  // Character showcase
  showcaseArea: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  characterDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockedCharacter: {
    alignItems: 'center',
  },
  lockedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: glowColor(COLORS.background, 0.6),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },

  // Stage platform
  stageContainer: {
    alignItems: 'center',
    marginTop: -8,
  },
  stagePlatform: {
    width: 160,
    height: 16,
    borderRadius: 80,
  },
  stageShadow: {
    width: 180,
    height: 8,
    borderRadius: 90,
    marginTop: -4,
  },
  stageShine: {
    width: 80,
    height: 2,
    borderRadius: 1,
    marginTop: -10,
  },

  // Burst particles
  burstContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  burstParticle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Evolution badge
  evolutionBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.sm,
  },
  evolutionBadgeText: {
    ...TYPOGRAPHY.caption.md,
    fontWeight: '700',
  },

  // Evolution stage dots
  stageDotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.xs,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Legendary animated border overlay
  legendaryBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    borderColor: RARITY.legendary.borderColor,
  },

  // Info section
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  catName: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  personalityBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.sm,
  },
  personalityText: {
    ...TYPOGRAPHY.caption.lg,
    fontWeight: '700',
  },
  musicSkill: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },

  // Evolution progress bar
  evolutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    width: '100%',
    marginBottom: SPACING.md,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  evolutionXpText: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textSecondary,
    minWidth: 80,
    textAlign: 'right',
  },

  // Ability icons
  abilityRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  abilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  abilityLockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Ability detail
  abilityDetail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    width: '100%',
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  abilityDetailText: {
    flex: 1,
  },
  abilityDetailName: {
    ...TYPOGRAPHY.body.sm,
    fontWeight: '700',
  },
  abilityDetailDesc: {
    ...TYPOGRAPHY.caption.md,
    marginTop: 2,
  },
  abilityDetailStage: {
    ...TYPOGRAPHY.caption.sm,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },

  // Action button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 180,
    alignSelf: 'center',
    marginTop: SPACING.xs,
  },
  actionButtonText: {
    ...TYPOGRAPHY.heading.sm,
    fontWeight: '700' as const,
    color: COLORS.textPrimary,
  },

  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: SPACING.md,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
  },

  // Buy modal
  modalOverlay: {
    flex: 1,
    backgroundColor: glowColor(COLORS.background, 0.7),
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '90%',
    maxWidth: 340,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  modalTitle: {
    ...TYPOGRAPHY.heading.lg,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  modalCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  modalCostText: {
    ...TYPOGRAPHY.display.sm,
    fontWeight: '800',
    color: COLORS.gemGold,
  },
  modalBalance: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
  },
  modalCancelText: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalConfirmText: {
    ...TYPOGRAPHY.button.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});

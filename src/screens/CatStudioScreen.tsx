/**
 * CatStudioScreen — Accessory shop and dress-up for cat companions.
 *
 * Bitmoji-style UX: tap an accessory → see it live on your cat → Buy/Equip.
 * Grid items show actual SVG accessory art instead of generic icons.
 * Uses glassmorphism + neon arcade visual language.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Platform,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { GradientMeshBackground } from '../components/effects';
import { CatAvatar } from '../components/Mascot/CatAvatar';
import { getCatById } from '../components/Mascot/catCharacters';
import { renderAccessory as renderSvgAccessory } from '../components/Mascot/svg/CatAccessories';
import {
  ACCESSORY_CATEGORIES,
  ACCESSORY_RENDER_NAMES,
  getAccessoriesByCategory,
  getEquippedRenderNames,
  canEquipAccessory,
} from '../data/accessories';
import type { Accessory, AccessoryCategory, AccessoryRarity } from '../data/accessories';
import { useSettingsStore } from '../stores/settingsStore';
import { useCatEvolutionStore, stageFromXp } from '../stores/catEvolutionStore';
import { useGemStore } from '../stores/gemStore';
import { PressableScale } from '../components/common/PressableScale';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, RARITY, shadowGlow, glowColor } from '../theme/tokens';

// ─── Rarity colors ───────────────────────────────────
const RARITY_COLORS: Record<AccessoryRarity, string> = {
  common: RARITY.common.borderColor,
  rare: RARITY.rare.borderColor,
  epic: RARITY.epic.borderColor,
  legendary: RARITY.legendary.borderColor,
};

// ─── Thumbnail ViewBox per accessory type ─────────────
// Zooms into the relevant area so the accessory fills the thumbnail.
const THUMBNAIL_BOUNDS: Record<string, string> = {
  // Hats: top of head area
  'beanie': '26 -5 48 38',
  'fedora': '24 -2 52 28',
  'trilby': '26 0 48 28',
  'chef-hat': '32 -8 36 32',
  'flat-cap': '18 4 58 24',
  'crown': '30 0 40 28',
  'tiny-crown': '30 0 40 28',
  'pixel-crown': '30 0 40 28',
  'top-hat': '28 -2 44 28',
  'santa-hat': '26 2 50 26',
  'wizard-hat': '22 -10 56 34',
  'pirate-hat': '22 2 56 24',
  'night-cap': '26 6 52 22',
  'golden-headphones': '10 0 80 32',
  'tiara': '26 8 48 18',
  'tiara-gold': '26 8 48 18',
  'tiara-silver': '26 8 48 18',
  // Glasses: eye area (arms curve toward ears)
  'sunglasses': '18 26 64 22',
  'round-glasses': '18 20 64 22',
  'pixel-glasses': '18 22 64 22',
  'racing-goggles': '14 22 72 24',
  'monocle': '48 14 40 30',
  'star-glasses': '20 26 60 20',
  'heart-glasses': '18 20 64 22',
  // Neckwear (at cat neck junction y≈48-52)
  'bow-tie': '34 42 32 18',
  'scarf': '28 44 44 32',
  'gem-pendant': '38 46 24 18',
  'bandana': '30 44 46 20',
  'gold-medal': '38 44 24 26',
  'music-note-pendant': '38 46 24 18',
  'choker': '30 44 40 14',
  'pearl-necklace': '30 46 40 14',
  'gold-chain': '32 44 36 20',
  'crescent-collar': '28 44 44 24',
  'lightning-collar': '28 44 44 26',
  'kimono-sash': '22 44 56 26',
  'temple-bell': '38 44 24 22',
  // Outfits (rounded barrel shape on cat body)
  'hawaiian-shirt': '22 42 56 48',
  'hoodie': '20 12 60 78',
  'sports-jersey': '18 42 64 48',
  'superhero-suit': '18 42 64 50',
  // Capes/outfits (draping around round body)
  'cape': '12 44 76 44',
  'cape-purple': '12 44 76 44',
  'golden-cape': '12 44 76 44',
  'royal-robe': '8 42 84 50',
  'angel-wings': '2 38 96 42',
  'butterfly-wings': '2 32 96 50',
  'starry-cloak': '12 44 76 44',
  'conductor-coat': '24 42 52 52',
  'apron': '30 42 40 48',
  // Instruments / Back items
  'guitar-case': '64 28 20 46',
  'music-trail': '4 40 24 34',
  'fiddle': '62 46 24 34',
  'baton': '60 34 30 30',
  'cookie-wand': '24 42 26 42',
  'sax': '60 42 26 44',
  // Effects
  'cherry-blossom': '6 2 88 66',
  'constellation': '4 2 92 56',
  'speed-aura': '0 34 28 42',
  'candelabra': '34 -6 32 24',
  'piano-throne': '24 86 52 20',
};

// Bright display colors per render-name for unowned state (visible on dark bg)
const THUMBNAIL_COLORS: Record<string, string> = {
  'beanie': '#FF6B8A',
  'fedora': '#8B7355',
  'trilby': '#A0906E',
  'chef-hat': '#FFFFFF',
  'flat-cap': '#7A6E5A',
  'crown': '#FFD700',
  'tiny-crown': '#FFD700',
  'pixel-crown': '#FFD700',
  'top-hat': '#4A4A5A',
  'santa-hat': '#FF3333',
  'wizard-hat': '#9966CC',
  'pirate-hat': '#4A4A5A',
  'night-cap': '#6688CC',
  'golden-headphones': '#FFD700',
  'tiara': '#C0C0FF',
  'tiara-gold': '#FFD700',
  'tiara-silver': '#C0C0C0',
  'sunglasses': '#444466',
  'round-glasses': '#B0A0D0',
  'pixel-glasses': '#66CCFF',
  'racing-goggles': '#FF8844',
  'star-glasses': '#FFD700',
  'heart-glasses': '#FF6699',
  'monocle': '#C0A070',
  'bow-tie': '#FF4466',
  'scarf': '#FF7744',
  'gem-pendant': '#88CCFF',
  'bandana': '#CC4444',
  'gold-medal': '#FFD700',
  'music-note-pendant': '#88AADD',
  'choker': '#AA66BB',
  'pearl-necklace': '#F5F0DC',
  'gold-chain': '#FFD700',
  'crescent-collar': '#C0C0E0',
  'lightning-collar': '#FFD700',
  'kimono-sash': '#FF88AA',
  'temple-bell': '#FFD700',
  'hawaiian-shirt': '#44BBAA',
  'hoodie': '#6688BB',
  'sports-jersey': '#4488FF',
  'superhero-suit': '#4466DD',
  'cape': '#CC4444',
  'cape-purple': '#9944CC',
  'golden-cape': '#FFD700',
  'angel-wings': '#E0E0FF',
  'butterfly-wings': '#CC77DD',
  'starry-cloak': '#5544AA',
  'guitar-case': '#8B6B4A',
  'music-trail': '#77BBFF',
  'royal-robe': '#8844CC',
  'conductor-coat': '#333344',
  'apron': '#FFFFFF',
  'fiddle': '#AA6633',
  'baton': '#EEDDCC',
  'cookie-wand': '#FFD700',
  'sax': '#DDAA44',
  'cherry-blossom': '#FFB7C5',
  'constellation': '#CCCCFF',
  'speed-aura': '#66CCFF',
  'candelabra': '#FFA500',
  'piano-throne': '#8B4513',
};

// ─── SVG Accessory Thumbnail ─────────────────────────
function AccessoryThumbnail({
  accessory,
  isOwned,
}: {
  accessory: Accessory;
  isOwned: boolean;
}) {
  const renderName = ACCESSORY_RENDER_NAMES[accessory.id];
  const rarityColor = RARITY_COLORS[accessory.rarity];

  if (!renderName) {
    // Effects/outfits without geometry — show rarity-colored icon fallback
    return (
      <View style={thumbStyles.iconFallback}>
        <MaterialCommunityIcons
          name={accessory.icon as never}
          size={32}
          color={isOwned ? rarityColor : COLORS.textMuted}
        />
      </View>
    );
  }

  const viewBox = THUMBNAIL_BOUNDS[renderName] ?? '0 0 100 100';
  const displayColor = isOwned
    ? rarityColor
    : (THUMBNAIL_COLORS[renderName] ?? COLORS.textMuted);

  return (
    <View style={thumbStyles.container}>
      <Svg width={64} height={52} viewBox={viewBox}>
        {renderSvgAccessory(renderName, displayColor)}
      </Svg>
    </View>
  );
}

const thumbStyles = StyleSheet.create({
  container: {
    width: 64,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFallback: {
    width: 64,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Category Tabs ───────────────────────────────────
function CategoryTabs({
  active,
  onSelect,
}: {
  active: AccessoryCategory;
  onSelect: (c: AccessoryCategory) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryRow}
    >
      {ACCESSORY_CATEGORIES.map((cat) => {
        const isActive = cat.key === active;
        return (
          <PressableScale
            key={cat.key}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(cat.key);
            }}
            style={[
              styles.categoryPill,
              isActive && styles.categoryPillActive,
            ]}
          >
            <MaterialCommunityIcons
              name={cat.icon as never}
              size={16}
              color={isActive ? COLORS.textPrimary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.categoryLabel,
                isActive && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

// ─── Accessory Grid Item ─────────────────────────────
function AccessoryGridItem({
  accessory,
  isOwned,
  isEquipped,
  isSelected,
  canEquip: canEquipItem,
  onPress,
}: {
  accessory: Accessory;
  isOwned: boolean;
  isEquipped: boolean;
  isSelected: boolean;
  canEquip: boolean;
  onPress: () => void;
}) {
  const rarityColor = RARITY_COLORS[accessory.rarity];

  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.gridItem,
        { borderColor: isSelected ? COLORS.textPrimary : isEquipped ? COLORS.primary : rarityColor },
        isSelected && styles.gridItemSelected,
        isEquipped && Platform.OS === 'ios' && shadowGlow(COLORS.primary, 10),
      ]}
    >
      <AccessoryThumbnail accessory={accessory} isOwned={isOwned} />
      <Text style={styles.gridItemName} numberOfLines={1}>
        {accessory.name}
      </Text>

      {/* Status badges */}
      {isEquipped ? (
        <View style={[styles.badge, { backgroundColor: COLORS.primary }]}>
          <MaterialCommunityIcons name="check" size={10} color={COLORS.textPrimary} />
        </View>
      ) : !isOwned ? (
        <View style={[styles.badge, { backgroundColor: glowColor(COLORS.gemGold, 0.2) }]}>
          <MaterialCommunityIcons name="diamond-stone" size={9} color={COLORS.gemGold} />
          <Text style={styles.badgeCost}>{accessory.gemCost}</Text>
        </View>
      ) : !canEquipItem ? (
        <View style={[styles.badge, { backgroundColor: glowColor(COLORS.textPrimary, 0.1) }]}>
          <MaterialCommunityIcons name="lock" size={10} color={COLORS.textMuted} />
        </View>
      ) : null}
    </PressableScale>
  );
}

// ─── Preview Action Bar ──────────────────────────────
function PreviewActionBar({
  accessory,
  isOwned,
  isEquipped,
  canEquipItem,
  gems,
  onBuy,
  onEquip,
  onUnequip,
  onClear,
}: {
  accessory: Accessory;
  isOwned: boolean;
  isEquipped: boolean;
  canEquipItem: boolean;
  gems: number;
  onBuy: () => void;
  onEquip: () => void;
  onUnequip: () => void;
  onClear: () => void;
}) {
  const rarityColor = RARITY_COLORS[accessory.rarity];
  const canAfford = gems >= accessory.gemCost;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.actionBar}>
      <View style={styles.actionBarInfo}>
        <Text style={styles.actionBarName}>{accessory.name}</Text>
        <Text style={[styles.actionBarRarity, { color: rarityColor }]}>
          {accessory.rarity.toUpperCase()}
        </Text>
      </View>

      <View style={styles.actionBarButtons}>
        <PressableScale style={styles.actionBarDismiss} onPress={onClear}>
          <MaterialCommunityIcons name="close" size={18} color={COLORS.textSecondary} />
        </PressableScale>

        {isEquipped ? (
          <PressableScale style={styles.actionBarBtn} onPress={onUnequip}>
            <Text style={styles.actionBarBtnText}>Remove</Text>
          </PressableScale>
        ) : isOwned && canEquipItem ? (
          <PressableScale style={[styles.actionBarBtn, styles.actionBarBtnPrimary]} onPress={onEquip}>
            <Text style={styles.actionBarBtnTextPrimary}>Equip</Text>
          </PressableScale>
        ) : isOwned && !canEquipItem ? (
          <View style={[styles.actionBarBtn, styles.actionBarBtnDisabled]}>
            <MaterialCommunityIcons name="lock" size={14} color={COLORS.textMuted} />
            <Text style={styles.actionBarBtnTextDisabled}>
              {accessory.minStage.charAt(0).toUpperCase() + accessory.minStage.slice(1)} only
            </Text>
          </View>
        ) : (
          <PressableScale
            style={[styles.actionBarBtn, canAfford ? styles.actionBarBtnBuy : styles.actionBarBtnDisabled]}
            onPress={canAfford ? onBuy : undefined}
            disabled={!canAfford}
          >
            <MaterialCommunityIcons name="diamond-stone" size={14} color={canAfford ? COLORS.gemGold : COLORS.textMuted} />
            <Text style={canAfford ? styles.actionBarBtnTextBuy : styles.actionBarBtnTextDisabled}>
              {canAfford ? `${accessory.gemCost}` : 'Not enough'}
            </Text>
          </PressableScale>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ─────────────────────────────────────
export function CatStudioScreen() {
  const navigation = useNavigation();
  const selectedCatId = useSettingsStore((s) => s.selectedCatId);
  const equippedAccessories = useSettingsStore((s) => s.equippedAccessories);
  const ownedAccessories = useSettingsStore((s) => s.ownedAccessories);
  const equipAccessory = useSettingsStore((s) => s.equipAccessory);
  const unequipAccessory = useSettingsStore((s) => s.unequipAccessory);
  const addOwnedAccessory = useSettingsStore((s) => s.addOwnedAccessory);

  const gems = useGemStore((s) => s.gems);
  const spendGems = useGemStore((s) => s.spendGems);

  const evolutionData = useCatEvolutionStore((s) => s.evolutionData);

  const [activeCategory, setActiveCategory] = useState<AccessoryCategory>('hats');
  const [selectedAccessory, setSelectedAccessory] = useState<Accessory | null>(null);

  const catData = getCatById(selectedCatId);
  const catXp = evolutionData[selectedCatId]?.xpAccumulated ?? 0;
  const currentStage = stageFromXp(catXp);

  const categoryItems = useMemo(
    () => getAccessoriesByCategory(activeCategory),
    [activeCategory],
  );

  // Compute render names for currently equipped + preview accessories
  const previewRenderNames = useMemo(() => {
    const equippedNames = getEquippedRenderNames(equippedAccessories);
    if (!selectedAccessory) return equippedNames;
    const previewName = ACCESSORY_RENDER_NAMES[selectedAccessory.id];
    if (!previewName) return equippedNames;
    // Replace same-category accessory with preview, or append
    const equippedInCategory = equippedAccessories[selectedAccessory.category];
    const equippedCategoryName = equippedInCategory ? ACCESSORY_RENDER_NAMES[equippedInCategory] : null;
    const filtered = equippedCategoryName
      ? equippedNames.filter((n) => n !== equippedCategoryName)
      : equippedNames;
    return [...filtered, previewName];
  }, [equippedAccessories, selectedAccessory]);

  const handleItemPress = useCallback(
    (accessory: Accessory) => {
      Haptics.selectionAsync();
      // Toggle selection: tap same item again to deselect
      if (selectedAccessory?.id === accessory.id) {
        setSelectedAccessory(null);
        return;
      }
      setSelectedAccessory(accessory);
    },
    [selectedAccessory],
  );

  const handleBuy = useCallback(() => {
    if (!selectedAccessory) return;
    const success = spendGems(selectedAccessory.gemCost, `accessory:${selectedAccessory.id}`);
    if (success) {
      addOwnedAccessory(selectedAccessory.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Auto-equip after purchase
      if (canEquipAccessory(selectedAccessory, currentStage)) {
        equipAccessory(selectedAccessory.category, selectedAccessory.id);
      }
    }
    setSelectedAccessory(null);
  }, [selectedAccessory, spendGems, addOwnedAccessory, currentStage, equipAccessory]);

  const handleEquip = useCallback(() => {
    if (!selectedAccessory) return;
    equipAccessory(selectedAccessory.category, selectedAccessory.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedAccessory(null);
  }, [selectedAccessory, equipAccessory]);

  const handleUnequip = useCallback(() => {
    if (!selectedAccessory) return;
    unequipAccessory(selectedAccessory.category);
    Haptics.selectionAsync();
    setSelectedAccessory(null);
  }, [selectedAccessory, unequipAccessory]);

  const renderAccessoryItem = useCallback(
    ({ item, index }: { item: Accessory; index: number }) => (
      <Animated.View entering={FadeInUp.delay(index * 40).duration(300)}>
        <AccessoryGridItem
          accessory={item}
          isOwned={ownedAccessories.includes(item.id)}
          isEquipped={equippedAccessories[item.category] === item.id}
          isSelected={selectedAccessory?.id === item.id}
          canEquip={canEquipAccessory(item, currentStage)}
          onPress={() => handleItemPress(item)}
        />
      </Animated.View>
    ),
    [ownedAccessories, equippedAccessories, currentStage, handleItemPress, selectedAccessory],
  );

  return (
    <SafeAreaView style={styles.container}>
      <GradientMeshBackground accent="catStudio" />

      {/* Header */}
      <View style={styles.header}>
        <PressableScale onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.textPrimary} />
        </PressableScale>
        <Text style={styles.title}>Cat Studio</Text>
        <View style={styles.gemBadge}>
          <MaterialCommunityIcons name="diamond-stone" size={16} color={COLORS.gemGold} />
          <Text style={styles.gemCount}>{gems}</Text>
        </View>
      </View>

      {/* Live Cat Preview with accessories */}
      <View style={styles.previewContainer}>
        <CatAvatar
          catId={selectedCatId}
          size="hero"
          evolutionStage={currentStage}
          extraAccessoryNames={previewRenderNames.length > 0 ? previewRenderNames : undefined}
        />
        {catData && (
          <Text style={styles.catName}>{catData.name}</Text>
        )}

        {/* Preview action bar OR stage badge */}
        {selectedAccessory ? (
          <PreviewActionBar
            accessory={selectedAccessory}
            isOwned={ownedAccessories.includes(selectedAccessory.id)}
            isEquipped={equippedAccessories[selectedAccessory.category] === selectedAccessory.id}
            canEquipItem={canEquipAccessory(selectedAccessory, currentStage)}
            gems={gems}
            onBuy={handleBuy}
            onEquip={handleEquip}
            onUnequip={handleUnequip}
            onClear={() => setSelectedAccessory(null)}
          />
        ) : (
          <View style={styles.stageBadge}>
            <Text style={styles.stageText}>
              {currentStage.charAt(0).toUpperCase() + currentStage.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Category Tabs */}
      <CategoryTabs active={activeCategory} onSelect={setActiveCategory} />

      {/* Accessory Grid */}
      <FlatList
        data={categoryItems}
        renderItem={renderAccessoryItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────
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
  },
  backBtn: {
    padding: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
    flex: 1,
    marginLeft: SPACING.sm,
  },
  gemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glowColor(COLORS.gemGold, 0.12),
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  gemCount: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.gemGold,
  },

  // Preview
  previewContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  catName: {
    ...TYPOGRAPHY.heading.md,
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  stageBadge: {
    backgroundColor: glowColor(COLORS.primary, 0.15),
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.xs,
  },
  stageText: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Preview action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: glowColor(COLORS.textPrimary, 0.08),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: glowColor(COLORS.textPrimary, 0.12),
    gap: SPACING.sm,
    minWidth: 260,
  },
  actionBarInfo: {
    flex: 1,
  },
  actionBarName: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.textPrimary,
  },
  actionBarRarity: {
    ...TYPOGRAPHY.caption.sm,
    letterSpacing: 1,
    fontWeight: '700',
  },
  actionBarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionBarDismiss: {
    padding: SPACING.xs,
  },
  actionBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: glowColor(COLORS.textPrimary, 0.15),
    gap: 5,
  },
  actionBarBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionBarBtnBuy: {
    backgroundColor: glowColor(COLORS.gemGold, 0.15),
    borderColor: COLORS.gemGold,
  },
  actionBarBtnDisabled: {
    backgroundColor: glowColor(COLORS.textPrimary, 0.05),
    borderColor: glowColor(COLORS.textPrimary, 0.08),
  },
  actionBarBtnText: {
    ...TYPOGRAPHY.button.sm,
    color: COLORS.textPrimary,
  },
  actionBarBtnTextPrimary: {
    ...TYPOGRAPHY.button.sm,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  actionBarBtnTextBuy: {
    ...TYPOGRAPHY.button.sm,
    color: COLORS.gemGold,
    fontWeight: '700',
  },
  actionBarBtnTextDisabled: {
    ...TYPOGRAPHY.button.sm,
    color: COLORS.textMuted,
  },

  // Category tabs
  categoryRow: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: glowColor(COLORS.textPrimary, 0.06),
    borderWidth: 1,
    borderColor: glowColor(COLORS.textPrimary, 0.08),
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryLabel: {
    ...TYPOGRAPHY.button.sm,
    color: COLORS.textSecondary,
  },
  categoryLabelActive: {
    color: COLORS.textPrimary,
  },

  // Grid
  gridContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  gridRow: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    backgroundColor: glowColor('#181818', 0.75),
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    gap: SPACING.xs,
  },
  gridItemSelected: {
    backgroundColor: glowColor(COLORS.textPrimary, 0.1),
    borderWidth: 2,
  },
  gridItemName: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  // Badges
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    gap: 2,
  },
  badgeCost: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.gemGold,
    fontWeight: '700',
  },
});

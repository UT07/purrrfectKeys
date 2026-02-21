/**
 * Cat Evolution & Collection Store
 *
 * Manages:
 * - Cat ownership and active cat selection
 * - Per-cat evolution XP tracking with stage transitions
 * - Ability unlocks per evolution stage
 * - 7-day daily reward calendar
 *
 * 12 cats total:
 *   3 starters (pick 1 free, 2 others cost 500 gems each)
 *   8 unlockable via gems (750-3000)
 *   1 legendary (Chonky Monké) — requires 300+ days streak or 100 skills mastered
 */

import { create } from 'zustand';
import type { EvolutionStage, CatEvolutionData, DailyRewardDay } from './types';
import { EVOLUTION_XP_THRESHOLDS } from './types';
import { PersistenceManager, STORAGE_KEYS, createDebouncedSave } from './persistence';
import { CAT_CHARACTERS } from '@/components/Mascot/catCharacters';

/** Calculate evolution stage from accumulated XP */
export function stageFromXp(xp: number): EvolutionStage {
  if (xp >= EVOLUTION_XP_THRESHOLDS.master) return 'master';
  if (xp >= EVOLUTION_XP_THRESHOLDS.adult) return 'adult';
  if (xp >= EVOLUTION_XP_THRESHOLDS.teen) return 'teen';
  return 'baby';
}

/** Get XP needed for the next evolution stage, or null if at master */
export function xpToNextStage(xp: number): { nextStage: EvolutionStage; xpNeeded: number } | null {
  const current = stageFromXp(xp);
  const stages: EvolutionStage[] = ['baby', 'teen', 'adult', 'master'];
  const idx = stages.indexOf(current);
  if (idx >= stages.length - 1) return null;
  const next = stages[idx + 1];
  return { nextStage: next, xpNeeded: EVOLUTION_XP_THRESHOLDS[next] - xp };
}

const DEFAULT_DAILY_REWARDS: DailyRewardDay[] = [
  { day: 1, reward: { type: 'gems', amount: 10 }, claimed: false },
  { day: 2, reward: { type: 'gems', amount: 15 }, claimed: false },
  { day: 3, reward: { type: 'xp_boost', amount: 2 }, claimed: false },
  { day: 4, reward: { type: 'gems', amount: 20 }, claimed: false },
  { day: 5, reward: { type: 'streak_freeze', amount: 1 }, claimed: false },
  { day: 6, reward: { type: 'gems', amount: 30 }, claimed: false },
  { day: 7, reward: { type: 'chest', amount: 50 }, claimed: false },
];

function createDefaultEvolutionData(catId: string): CatEvolutionData {
  return {
    catId,
    currentStage: 'baby',
    xpAccumulated: 0,
    abilitiesUnlocked: [],
    evolvedAt: { baby: Date.now(), teen: null, adult: null, master: null },
  };
}

export interface CatEvolutionStoreState {
  selectedCatId: string;
  ownedCats: string[];
  evolutionData: Record<string, CatEvolutionData>;
  dailyRewards: {
    weekStartDate: string; // ISO date of week start
    days: DailyRewardDay[];
    currentDay: number; // 1-7
  };

  // Chonky Monké unlock tracking
  chonkyUnlockProgress: {
    daysStreakReached: boolean;    // 300+ day streak
    skillsMasteredReached: boolean; // 100 skills mastered
  };

  // Actions
  selectCat: (catId: string) => void;
  unlockCat: (catId: string) => void;
  addEvolutionXp: (catId: string, amount: number) => EvolutionStage | null;
  getActiveAbilities: () => string[];
  claimDailyReward: (day: number) => DailyRewardDay['reward'] | null;
  resetDailyRewards: () => void;
  checkChonkyEligibility: (streakDays: number, skillsMastered: number) => boolean;
  unlockChonky: () => void;
  initializeStarterCat: (catId: string) => void;
  reset: () => void;
}

type EvolutionData = Pick<
  CatEvolutionStoreState,
  'selectedCatId' | 'ownedCats' | 'evolutionData' | 'dailyRewards' | 'chonkyUnlockProgress'
>;

const defaultData: EvolutionData = {
  selectedCatId: '',
  ownedCats: [],
  evolutionData: {},
  dailyRewards: {
    weekStartDate: new Date().toISOString().split('T')[0],
    days: DEFAULT_DAILY_REWARDS.map(d => ({ ...d })),
    currentDay: 1,
  },
  chonkyUnlockProgress: {
    daysStreakReached: false,
    skillsMasteredReached: false,
  },
};

const debouncedSave = createDebouncedSave<EvolutionData>(STORAGE_KEYS.CAT_EVOLUTION, 500);

export const useCatEvolutionStore = create<CatEvolutionStoreState>((set, get) => ({
  ...defaultData,

  selectCat: (catId: string) => {
    const state = get();
    if (!state.ownedCats.includes(catId)) return;
    set({ selectedCatId: catId });
    debouncedSave(get());
  },

  unlockCat: (catId: string) => {
    set((state) => {
      if (state.ownedCats.includes(catId)) return state;
      const newOwned = [...state.ownedCats, catId];
      const newEvolution = {
        ...state.evolutionData,
        [catId]: createDefaultEvolutionData(catId),
      };
      return { ownedCats: newOwned, evolutionData: newEvolution };
    });
    debouncedSave(get());
  },

  addEvolutionXp: (catId: string, amount: number) => {
    const state = get();
    const data = state.evolutionData[catId];
    if (!data) return null;

    const oldStage = data.currentStage;
    const newXp = data.xpAccumulated + amount;
    const newStage = stageFromXp(newXp);
    const evolved = newStage !== oldStage;

    const updatedData: CatEvolutionData = {
      ...data,
      xpAccumulated: newXp,
      currentStage: newStage,
      evolvedAt: evolved
        ? { ...data.evolvedAt, [newStage]: Date.now() }
        : data.evolvedAt,
      abilitiesUnlocked: evolved
        ? unlockAbilitiesForStage(catId, newStage, data.abilitiesUnlocked)
        : data.abilitiesUnlocked,
    };

    set((prev) => ({
      evolutionData: {
        ...prev.evolutionData,
        [catId]: updatedData,
      },
    }));
    debouncedSave(get());

    return evolved ? newStage : null;
  },

  getActiveAbilities: () => {
    const state = get();
    const data = state.evolutionData[state.selectedCatId];
    if (!data) return [];
    return data.abilitiesUnlocked;
  },

  claimDailyReward: (day: number) => {
    const state = get();
    const dayData = state.dailyRewards.days.find(d => d.day === day);
    if (!dayData || dayData.claimed) return null;
    if (day !== state.dailyRewards.currentDay) return null;

    set((prev) => ({
      dailyRewards: {
        ...prev.dailyRewards,
        days: prev.dailyRewards.days.map(d =>
          d.day === day ? { ...d, claimed: true } : d,
        ),
        currentDay: Math.min(prev.dailyRewards.currentDay + 1, 8), // 8 = week complete
      },
    }));
    debouncedSave(get());
    return dayData.reward;
  },

  resetDailyRewards: () => {
    set({
      dailyRewards: {
        weekStartDate: new Date().toISOString().split('T')[0],
        days: DEFAULT_DAILY_REWARDS.map(d => ({ ...d })),
        currentDay: 1,
      },
    });
    debouncedSave(get());
  },

  checkChonkyEligibility: (streakDays: number, skillsMastered: number) => {
    const daysReached = streakDays >= 300;
    const skillsReached = skillsMastered >= 100;

    set({
      chonkyUnlockProgress: {
        daysStreakReached: daysReached,
        skillsMasteredReached: skillsReached,
      },
    });

    // Either condition unlocks Chonky
    return daysReached || skillsReached;
  },

  unlockChonky: () => {
    const state = get();
    if (state.ownedCats.includes('chonky-monke')) return;

    set((prev) => ({
      ownedCats: [...prev.ownedCats, 'chonky-monke'],
      evolutionData: {
        ...prev.evolutionData,
        'chonky-monke': createDefaultEvolutionData('chonky-monke'),
      },
    }));
    debouncedSave(get());
  },

  initializeStarterCat: (catId: string) => {
    const state = get();
    if (state.ownedCats.length > 0) return; // Already initialized

    set({
      selectedCatId: catId,
      ownedCats: [catId],
      evolutionData: {
        [catId]: createDefaultEvolutionData(catId),
      },
    });
    debouncedSave(get());
  },

  reset: () => {
    set(defaultData);
    PersistenceManager.deleteState(STORAGE_KEYS.CAT_EVOLUTION);
  },
}));

/** Unlock abilities for a cat at a given stage */
function unlockAbilitiesForStage(
  catId: string,
  stage: EvolutionStage,
  currentAbilities: string[],
): string[] {
  const cat = CAT_CHARACTERS.find(c => c.id === catId);
  if (!cat?.abilities) return currentAbilities;

  const stageOrder: EvolutionStage[] = ['baby', 'teen', 'adult', 'master'];
  const stageIdx = stageOrder.indexOf(stage);

  const eligible = cat.abilities
    .filter(a => stageOrder.indexOf(a.unlockedAtStage) <= stageIdx)
    .map(a => a.id);

  const merged = new Set([...currentAbilities, ...eligible]);
  return Array.from(merged);
}

/** Hydrate evolution store from AsyncStorage on app launch */
export async function hydrateCatEvolutionStore(): Promise<void> {
  const data = await PersistenceManager.loadState<EvolutionData>(
    STORAGE_KEYS.CAT_EVOLUTION,
    defaultData,
  );
  useCatEvolutionStore.setState(data);
}

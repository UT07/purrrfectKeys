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
import { PersistenceManager, STORAGE_KEYS, createImmediateSave } from './persistence';
import { CAT_CHARACTERS } from '@/components/Mascot/catCharacters';
import { postActivity } from '@/services/firebase/socialService';
import { auth } from '@/services/firebase/config';
import { logger } from '@/utils/logger';
import { analyticsEvents } from '@/services/analytics/PostHog';

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
    currentDay: number; // 1-7 (derived from date, kept for compat)
  };

  /** ISO date when the daily challenge was last completed */
  lastDailyChallengeDate: string;

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
  /** Advance the daily reward calendar based on the current date */
  advanceDailyRewardDate: () => void;
  /** Mark today's daily challenge as completed */
  completeDailyChallenge: () => void;
  /** Mark today's challenge as completed AND auto-claim today's reward.
   *  Returns the reward if successfully claimed, or null. */
  completeDailyChallengeAndClaim: () => DailyRewardDay['reward'] | null;
  /** Check if today's daily challenge has been completed */
  isDailyChallengeCompleted: () => boolean;
  checkChonkyEligibility: (streakDays: number, skillsMastered: number) => boolean;
  unlockChonky: () => void;
  initializeStarterCat: (catId: string) => void;
  reset: () => void;
}

type EvolutionData = Pick<
  CatEvolutionStoreState,
  'selectedCatId' | 'ownedCats' | 'evolutionData' | 'dailyRewards' | 'chonkyUnlockProgress' | 'lastDailyChallengeDate'
>;

const defaultData: EvolutionData = {
  selectedCatId: '',
  ownedCats: [],
  evolutionData: {},
  dailyRewards: {
    weekStartDate: getMondayOfWeek(),
    days: DEFAULT_DAILY_REWARDS.map(d => ({ ...d })),
    currentDay: 1,
  },
  lastDailyChallengeDate: '',
  chonkyUnlockProgress: {
    daysStreakReached: false,
    skillsMasteredReached: false,
  },
};

const debouncedSave = createImmediateSave<EvolutionData>(STORAGE_KEYS.CAT_EVOLUTION);
const immediateSave = debouncedSave;

/** Get today's local date string (YYYY-MM-DD in user's timezone) */
function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Get the Monday of the current week as YYYY-MM-DD in LOCAL time.
 *  Must use local date (not UTC) so the week boundary aligns with the user's
 *  midnight, not UTC midnight. Using toISOString() was a bug — in GMT+N timezones
 *  after midnight but before the UTC date rolls over, toISOString() returned the
 *  previous day's date, causing getMondayOfWeek() to return last week's Monday. */
function getMondayOfWeek(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const day = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Calculate which day of the reward week it is (1=Mon ... 7=Sun), or 0 if week has expired */
function calcCurrentDay(weekStartDate: string): number {
  const start = new Date(weekStartDate + 'T00:00:00');
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0 || diffDays >= 7) return 0; // week expired or future
  return diffDays + 1; // 1-indexed (Mon=1 when weekStartDate is Monday)
}

export const useCatEvolutionStore = create<CatEvolutionStoreState>((set, get) => ({
  ...defaultData,

  selectCat: (catId: string) => {
    const state = get();
    if (!state.ownedCats.includes(catId)) return;
    set({ selectedCatId: catId });
    debouncedSave(get());
    // Keep settingsStore in sync — it's the source of truth for social/league/ability
    try {
      const { useSettingsStore } = require('./settingsStore');
      useSettingsStore.getState().setSelectedCatId(catId);
    } catch (err) {
      logger.warn('[catEvolution] Settings sync failed on selectCat:', err);
    }
  },

  unlockCat: (catId: string) => {
    set((state) => {
      if (state.ownedCats.includes(catId)) return state;
      const newOwned = [...state.ownedCats, catId];
      const defaultData = createDefaultEvolutionData(catId);
      // Bug #96 fix: unlock baby-stage abilities immediately on purchase
      defaultData.abilitiesUnlocked = unlockAbilitiesForStage(catId, 'baby', []);
      const newEvolution = {
        ...state.evolutionData,
        [catId]: defaultData,
      };
      return { ownedCats: newOwned, evolutionData: newEvolution };
    });
    debouncedSave(get());
  },

  addEvolutionXp: (catId: string, amount: number) => {
    // Compute inside set() updater to prevent lost updates from concurrent calls
    let evolved = false;
    let newStage: string | null = null;
    let oldStage: EvolutionStage = 'baby';

    set((prev) => {
      let data = prev.evolutionData[catId];
      if (!data) {
        if (!prev.ownedCats.includes(catId)) return prev;
        data = createDefaultEvolutionData(catId);
      }

      oldStage = data.currentStage;
      const newXp = data.xpAccumulated + amount;
      const computedStage = stageFromXp(newXp);
      evolved = computedStage !== oldStage;
      newStage = evolved ? computedStage : null;

      // For multi-stage jumps, fill in evolvedAt for all intermediate stages
      let evolvedAtUpdate = data.evolvedAt;
      if (evolved) {
        const stagesList: EvolutionStage[] = ['baby', 'teen', 'adult', 'master'];
        const oldIdx = stagesList.indexOf(oldStage);
        const newIdx = stagesList.indexOf(computedStage);
        const now = Date.now();
        evolvedAtUpdate = { ...data.evolvedAt };
        for (let si = oldIdx + 1; si <= newIdx; si++) {
          if (!evolvedAtUpdate[stagesList[si]]) {
            evolvedAtUpdate[stagesList[si]] = now;
          }
        }
      }

      const updatedData: CatEvolutionData = {
        ...data,
        xpAccumulated: newXp,
        currentStage: computedStage,
        evolvedAt: evolvedAtUpdate,
        abilitiesUnlocked: evolved
          ? unlockAbilitiesForStage(catId, computedStage, data.abilitiesUnlocked)
          : data.abilitiesUnlocked,
      };

      return {
        evolutionData: {
          ...prev.evolutionData,
          [catId]: updatedData,
        },
      };
    });
    debouncedSave(get());

    // Analytics: track cat evolution
    if (evolved && newStage) {
      analyticsEvents.cat.evolved(catId, newStage);
    }

    // Award milestone gems on evolution — iterate through ALL intermediate stages
    // so a multi-stage XP jump (e.g. baby→adult) awards both teen AND adult gems
    if (evolved && newStage) {
      const MILESTONE_GEMS: Record<string, number> = {
        teen: 200,
        adult: 500,
        master: 1000,
      };
      const stages: EvolutionStage[] = ['baby', 'teen', 'adult', 'master'];
      const oldStageIdx = stages.indexOf(oldStage);
      const newStageIdx = stages.indexOf(newStage as EvolutionStage);
      for (let i = oldStageIdx + 1; i <= newStageIdx; i++) {
        const stage = stages[i];
        const milestoneGems = MILESTONE_GEMS[stage];
        if (milestoneGems) {
          try {
            const { useGemStore } = require('./gemStore');
            useGemStore.getState().earnGems(milestoneGems, `evolution-milestone-${stage}`);
          } catch (err) {
            logger.warn(`[catEvolution] Milestone gem award failed for ${stage}:`, (err as Error)?.message);
          }
        }
      }
    }

    // Post evolution activity (fire-and-forget)
    if (evolved && auth.currentUser && !auth.currentUser.isAnonymous) {
      postActivity(auth.currentUser.uid, {
        id: `evolution-${catId}-${newStage}-${Date.now()}`,
        friendUid: auth.currentUser.uid,
        friendDisplayName: auth.currentUser.displayName ?? 'Player',
        friendCatId: catId,
        type: 'evolution',
        detail: `Cat evolved to ${newStage}`,
        timestamp: Date.now(),
      }).catch((err) => logger.warn('[catEvolutionStore] postActivity failed:', (err as Error)?.message));
    }

    return newStage;
  },

  getActiveAbilities: () => {
    const state = get();
    const data = state.evolutionData[state.selectedCatId];
    if (!data) return [];
    return data.abilitiesUnlocked;
  },

  claimDailyReward: (day: number) => {
    const state = get();

    // Calculate which day it actually is based on the calendar
    const actualDay = calcCurrentDay(state.dailyRewards.weekStartDate);
    if (actualDay === 0) return null; // week expired — need reset first
    if (day !== actualDay) return null; // can only claim today's reward (past days expire)

    // Must complete today's daily challenge before claiming
    if (state.lastDailyChallengeDate !== todayISO()) return null;

    const dayData = state.dailyRewards.days.find(d => d.day === day);
    if (!dayData || dayData.claimed) return null;

    set((prev) => ({
      dailyRewards: {
        ...prev.dailyRewards,
        days: prev.dailyRewards.days.map(d =>
          d.day === day ? { ...d, claimed: true } : d,
        ),
        currentDay: actualDay,
      },
    }));
    debouncedSave(get());
    return dayData.reward;
  },

  resetDailyRewards: () => {
    const monday = getMondayOfWeek();
    const actualDay = calcCurrentDay(monday);
    set({
      dailyRewards: {
        weekStartDate: monday,
        days: DEFAULT_DAILY_REWARDS.map(d => ({ ...d })),
        currentDay: actualDay || 1,
      },
    });
    debouncedSave(get());
  },

  advanceDailyRewardDate: () => {
    const state = get();
    const monday = getMondayOfWeek();
    const storedStart = state.dailyRewards.weekStartDate;

    // If the stored weekStartDate isn't the current week's Monday, reset
    if (storedStart !== monday) {
      const actualDay = calcCurrentDay(monday);
      set({
        dailyRewards: {
          weekStartDate: monday,
          days: DEFAULT_DAILY_REWARDS.map(d => ({ ...d })),
          currentDay: actualDay || 1,
        },
      });
      debouncedSave(get());
      return;
    }

    const actualDay = calcCurrentDay(storedStart);
    if (actualDay === 0) {
      // Week has expired — auto-reset to current Monday
      set({
        dailyRewards: {
          weekStartDate: monday,
          days: DEFAULT_DAILY_REWARDS.map(d => ({ ...d })),
          currentDay: 1,
        },
      });
    } else if (actualDay !== state.dailyRewards.currentDay) {
      // Advance currentDay + sanitize stale future claims
      set((prev) => ({
        dailyRewards: {
          ...prev.dailyRewards,
          currentDay: actualDay,
          days: prev.dailyRewards.days.map(d =>
            d.day > actualDay ? { ...d, claimed: false } : d,
          ),
        },
      }));
    }
    debouncedSave(get());
  },

  completeDailyChallenge: () => {
    set({ lastDailyChallengeDate: todayISO() });
    // Critical: save immediately so the date isn't lost if user navigates away
    immediateSave(get());
  },

  completeDailyChallengeAndClaim: () => {
    // 1. Mark challenge as completed
    set({ lastDailyChallengeDate: todayISO() });

    // 2. Auto-claim today's reward
    const state = get();
    const actualDay = calcCurrentDay(state.dailyRewards.weekStartDate);
    if (actualDay === 0) {
      immediateSave(state);
      return null;
    }

    const dayData = state.dailyRewards.days.find(d => d.day === actualDay);
    if (!dayData || dayData.claimed) {
      immediateSave(state);
      return dayData?.claimed ? dayData.reward : null;
    }

    set((prev) => ({
      dailyRewards: {
        ...prev.dailyRewards,
        days: prev.dailyRewards.days.map(d =>
          d.day === actualDay ? { ...d, claimed: true } : d,
        ),
        currentDay: actualDay,
      },
    }));
    immediateSave(get());
    return dayData.reward;
  },

  isDailyChallengeCompleted: () => {
    return get().lastDailyChallengeDate === todayISO();
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

    const defaultData = createDefaultEvolutionData('chonky-monke');
    defaultData.abilitiesUnlocked = unlockAbilitiesForStage('chonky-monke', 'baby', []);

    set((prev) => ({
      ownedCats: [...prev.ownedCats, 'chonky-monke'],
      evolutionData: {
        ...prev.evolutionData,
        'chonky-monke': defaultData,
      },
    }));
    debouncedSave(get());
  },

  initializeStarterCat: (catId: string) => {
    const state = get();
    if (state.ownedCats.length > 0) return; // Already initialized

    const defaultData = createDefaultEvolutionData(catId);
    // Bug #96 fix: unlock baby-stage abilities on starter cat selection
    defaultData.abilitiesUnlocked = unlockAbilitiesForStage(catId, 'baby', []);

    set({
      selectedCatId: catId,
      ownedCats: [catId],
      evolutionData: {
        [catId]: defaultData,
      },
    });
    debouncedSave(get());
    // Keep settingsStore in sync
    try {
      const { useSettingsStore } = require('./settingsStore');
      useSettingsStore.getState().setSelectedCatId(catId);
    } catch (err) {
      logger.warn('[catEvolution] Settings sync failed on initOnboardingCat:', err);
    }
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

/** Validate persisted cat ownership — strip legendary cats without valid unlock */
function validateOwnedCats(data: EvolutionData): EvolutionData {
  const validCatIds = new Set(CAT_CHARACTERS.map(c => c.id));
  const legendaryIds = new Set(
    CAT_CHARACTERS.filter(c => c.legendary).map(c => c.id),
  );

  const validOwned = data.ownedCats.filter(catId => {
    // Remove cats that no longer exist in the roster
    if (!validCatIds.has(catId)) return false;

    // Legendary cats require proof of unlock (chonkyUnlockProgress flags)
    if (legendaryIds.has(catId)) {
      const progress = data.chonkyUnlockProgress;
      return progress.daysStreakReached || progress.skillsMasteredReached;
    }

    return true;
  });

  // If selected cat was removed, fall back to first owned cat
  const selectedValid = validOwned.includes(data.selectedCatId);
  const selectedCatId = selectedValid
    ? data.selectedCatId
    : (validOwned[0] ?? '');

  // Ensure every owned cat has evolution data (auto-create if missing)
  const cleanedEvolution: Record<string, CatEvolutionData> = {};
  for (const catId of validOwned) {
    cleanedEvolution[catId] = data.evolutionData[catId] ?? createDefaultEvolutionData(catId);
  }

  return {
    ...data,
    ownedCats: validOwned,
    selectedCatId,
    evolutionData: cleanedEvolution,
  };
}

/** Reconcile evolution stages from XP — ensures currentStage matches
 *  current thresholds even if they changed between app versions */
function reconcileEvolutionStages(data: EvolutionData): EvolutionData {
  let changed = false;
  const reconciledEvolution = { ...data.evolutionData };

  for (const [catId, catData] of Object.entries(reconciledEvolution)) {
    const correctStage = stageFromXp(catData.xpAccumulated);

    // Bug #96 fix: reconcile abilities for cats with empty abilities (pre-fix data)
    const expectedAbilities = unlockAbilitiesForStage(catId, correctStage, catData.abilitiesUnlocked);
    if (expectedAbilities.length > catData.abilitiesUnlocked.length) {
      reconciledEvolution[catId] = { ...catData, abilitiesUnlocked: expectedAbilities };
      changed = true;
    }

    if (correctStage !== catData.currentStage) {
      reconciledEvolution[catId] = {
        ...(reconciledEvolution[catId] ?? catData),
        currentStage: correctStage,
        abilitiesUnlocked: unlockAbilitiesForStage(catId, correctStage, reconciledEvolution[catId]?.abilitiesUnlocked ?? catData.abilitiesUnlocked),
        evolvedAt: {
          ...catData.evolvedAt,
          // Backfill evolvedAt for stages the cat should have reached
          ...(correctStage !== 'baby' && !catData.evolvedAt[correctStage]
            ? { [correctStage]: Date.now() }
            : {}),
        },
      };
      changed = true;
      logger.log(
        `[catEvolution] Reconciled ${catId}: ${catData.currentStage} → ${correctStage} (XP=${catData.xpAccumulated})`,
      );
    }
  }

  return changed ? { ...data, evolutionData: reconciledEvolution } : data;
}

/** Validate equipped accessories against current evolution stage.
 *  Removes accessories whose minStage exceeds the cat's current stage. */
function validateEquippedAccessories(data: EvolutionData): void {
  try {
    const { useSettingsStore } = require('./settingsStore');
    const settings = useSettingsStore.getState();
    const equipped = settings.equippedAccessories;
    if (!equipped || Object.keys(equipped).length === 0) return;

    const { ACCESSORIES, canEquipAccessory } = require('@/data/accessories');

    // Determine current stage: use selected cat if available, else check all cats
    const selectedCatData = data.evolutionData[data.selectedCatId];
    if (!selectedCatData) return;
    const currentStage = selectedCatData.currentStage;

    let needsUpdate = false;
    const validEquipped = { ...equipped };

    for (const [category, accessoryId] of Object.entries(equipped)) {
      const accessory = (ACCESSORIES as Array<{ id: string; minStage: string }>).find(
        (a: { id: string }) => a.id === accessoryId,
      );
      if (accessory && !canEquipAccessory(accessory, currentStage)) {
        delete validEquipped[category];
        needsUpdate = true;
        logger.log(
          `[catEvolution] Removed inaccessible accessory ${accessoryId} (requires ${accessory.minStage}, cat is ${currentStage})`,
        );
      }
    }

    if (needsUpdate) {
      useSettingsStore.setState({ equippedAccessories: validEquipped });
    }
  } catch (err) {
    // Non-critical: accessories validation failure shouldn't block hydration
    logger.warn('[catEvolution] Accessory validation skipped:', (err as Error)?.message);
  }
}

/** Hydrate evolution store from AsyncStorage on app launch */
export async function hydrateCatEvolutionStore(): Promise<void> {
  const data = await PersistenceManager.loadState<EvolutionData>(
    STORAGE_KEYS.CAT_EVOLUTION,
    defaultData,
  );
  const validated = validateOwnedCats(data);
  // Bug #49: Reconcile stages from XP in case thresholds changed between versions
  const reconciled = reconcileEvolutionStages(validated);

  // Bug #115 fix: reset daily rewards week if stale BEFORE setting state.
  // Without this, HomeScreen's advanceDailyRewardDate() might not run yet
  // (navigation hasn't mounted) and the old weekStartDate persists.
  const monday = getMondayOfWeek();
  if (reconciled.dailyRewards.weekStartDate !== monday) {
    const actualDay = calcCurrentDay(monday);
    reconciled.dailyRewards = {
      weekStartDate: monday,
      days: DEFAULT_DAILY_REWARDS.map(d => ({ ...d })),
      currentDay: actualDay || 1,
    };
    logger.log(`[catEvolution] Week reset during hydration: ${reconciled.dailyRewards.weekStartDate} → ${monday}, day=${actualDay}`);
  } else {
    // Same week — just update currentDay in case it advanced
    const actualDay = calcCurrentDay(monday);
    if (actualDay > 0 && actualDay !== reconciled.dailyRewards.currentDay) {
      reconciled.dailyRewards = {
        ...reconciled.dailyRewards,
        currentDay: actualDay,
      };
    }
  }

  useCatEvolutionStore.setState(reconciled);
  // Bug #51: Remove equipped accessories that exceed the cat's current evolution stage
  validateEquippedAccessories(reconciled);
}

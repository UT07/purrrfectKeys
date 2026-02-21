/**
 * AbilityEngine — Pure TypeScript ability effect calculator
 *
 * Takes active cat abilities and modifies exercise configuration.
 * No React imports — fully testable.
 *
 * Safety caps prevent abilities from making exercises trivial:
 * - Timing window: max 1.5x
 * - Tempo reduction: max 15 BPM
 * - Score boost: max 15%
 * - XP multiplier: max 2.0x
 */

import type { CatAbility, AbilityEffect } from '@/stores/types';
import { CAT_CHARACTERS } from '@/components/Mascot/catCharacters';

/** Exercise config that abilities can modify */
export interface ExerciseAbilityConfig {
  timingToleranceMs: number;
  timingGracePeriodMs: number;
  tempo: number;
  ghostNotesFailThreshold: number; // default 3
  comboShieldMisses: number; // default 0
  scoreBoostPercent: number; // default 0
  xpMultiplier: number; // default 1.0
  extraRetries: number; // default 0
  notePreviewBeats: number; // default 0
  gemBonusChance: number; // default 0
  gemBonusMultiplier: number; // default 1
  streakSavesPerWeek: number; // default 0
}

/** Safety caps to prevent abilities from being overpowered */
const CAPS = {
  maxTimingMultiplier: 1.5,
  maxTempoReduction: 15,
  maxScoreBoost: 15,
  maxXpMultiplier: 2.0,
  maxComboShield: 3,
  maxExtraRetries: 2,
  maxNotePreview: 2,
  maxGemBonusChance: 0.3,
} as const;

/** Create default config from exercise scoring settings */
export function createDefaultConfig(
  timingToleranceMs: number,
  timingGracePeriodMs: number,
  tempo: number,
): ExerciseAbilityConfig {
  return {
    timingToleranceMs,
    timingGracePeriodMs,
    tempo,
    ghostNotesFailThreshold: 3,
    comboShieldMisses: 0,
    scoreBoostPercent: 0,
    xpMultiplier: 1.0,
    extraRetries: 0,
    notePreviewBeats: 0,
    gemBonusChance: 0,
    gemBonusMultiplier: 1,
    streakSavesPerWeek: 0,
  };
}

/** Apply all active abilities to an exercise config */
export function applyAbilities(
  abilityIds: string[],
  config: ExerciseAbilityConfig,
): ExerciseAbilityConfig {
  const abilities = resolveAbilities(abilityIds);
  let result = { ...config };

  for (const ability of abilities) {
    result = applySingleEffect(ability.effect, result);
  }

  return clampConfig(result, config);
}

/** Resolve ability IDs to full CatAbility objects */
function resolveAbilities(abilityIds: string[]): CatAbility[] {
  const allAbilities: CatAbility[] = [];
  for (const cat of CAT_CHARACTERS) {
    if (cat.abilities) {
      allAbilities.push(...cat.abilities);
    }
  }

  return abilityIds
    .map(id => allAbilities.find(a => a.id === id))
    .filter((a): a is CatAbility => a !== undefined);
}

/** Apply a single ability effect to config */
function applySingleEffect(
  effect: AbilityEffect,
  config: ExerciseAbilityConfig,
): ExerciseAbilityConfig {
  switch (effect.type) {
    case 'timing_window_multiplier':
      return {
        ...config,
        timingToleranceMs: config.timingToleranceMs * effect.multiplier,
        timingGracePeriodMs: config.timingGracePeriodMs * effect.multiplier,
      };

    case 'tempo_reduction':
      return {
        ...config,
        tempo: config.tempo - effect.bpmReduction,
      };

    case 'xp_multiplier':
      return {
        ...config,
        xpMultiplier: config.xpMultiplier * effect.multiplier,
      };

    case 'combo_shield':
      return {
        ...config,
        comboShieldMisses: config.comboShieldMisses + effect.missesForgivenPerExercise,
      };

    case 'score_boost':
      return {
        ...config,
        scoreBoostPercent: config.scoreBoostPercent + effect.percentageBoost,
      };

    case 'ghost_notes_extended':
      return {
        ...config,
        ghostNotesFailThreshold: Math.max(1, config.ghostNotesFailThreshold + effect.extraFailsBeforeTrigger),
      };

    case 'extra_retries':
      return {
        ...config,
        extraRetries: config.extraRetries + effect.extraRetries,
      };

    case 'note_preview':
      return {
        ...config,
        notePreviewBeats: Math.max(config.notePreviewBeats, effect.previewBeats),
      };

    case 'gem_magnet':
      return {
        ...config,
        gemBonusChance: config.gemBonusChance + effect.bonusGemChance,
      };

    case 'lucky_gems':
      return {
        ...config,
        gemBonusMultiplier: Math.max(config.gemBonusMultiplier, effect.bonusGemMultiplier),
      };

    case 'streak_saver':
      return {
        ...config,
        streakSavesPerWeek: config.streakSavesPerWeek + effect.freeSavesPerWeek,
      };

    case 'daily_xp_boost':
      return {
        ...config,
        xpMultiplier: config.xpMultiplier * effect.multiplier,
      };

    case 'hint_frequency_boost':
      // Hint frequency is handled by UI, not exercise config
      return config;

    case 'perfect_shield':
      // Perfect shield is handled at scoring time
      return config;

    case 'all_abilities_half':
      // Chonky's master ability — applies all other cats' abilities at half power
      return applyAllAbilitiesAtHalfPower(config);

    default:
      return config;
  }
}

/** Chonky's master ability: gather all non-Chonky abilities, halve their effects */
function applyAllAbilitiesAtHalfPower(config: ExerciseAbilityConfig): ExerciseAbilityConfig {
  let result = { ...config };

  for (const cat of CAT_CHARACTERS) {
    if (cat.id === 'chonky-monke' || !cat.abilities) continue;

    for (const ability of cat.abilities) {
      const halved = halveEffect(ability.effect);
      if (halved) {
        result = applySingleEffect(halved, result);
      }
    }
  }

  return result;
}

/** Create a half-power version of an ability effect */
function halveEffect(effect: AbilityEffect): AbilityEffect | null {
  switch (effect.type) {
    case 'timing_window_multiplier':
      return { ...effect, multiplier: 1 + (effect.multiplier - 1) / 2 };
    case 'tempo_reduction':
      return { ...effect, bpmReduction: Math.round(effect.bpmReduction / 2) };
    case 'xp_multiplier':
      return { ...effect, multiplier: 1 + (effect.multiplier - 1) / 2 };
    case 'score_boost':
      return { ...effect, percentageBoost: Math.round(effect.percentageBoost / 2) };
    case 'combo_shield':
      return effect.missesForgivenPerExercise > 1
        ? { ...effect, missesForgivenPerExercise: 1 }
        : null; // Can't halve 1 miss shield
    case 'gem_magnet':
      return { ...effect, bonusGemChance: effect.bonusGemChance / 2 };
    case 'lucky_gems':
      return { ...effect, bonusGemMultiplier: 1 + (effect.bonusGemMultiplier - 1) / 2 };
    default:
      return null; // Don't half-apply complex abilities
  }
}

/** Clamp all values to safety caps */
function clampConfig(
  config: ExerciseAbilityConfig,
  original: ExerciseAbilityConfig,
): ExerciseAbilityConfig {
  return {
    ...config,
    timingToleranceMs: Math.min(
      config.timingToleranceMs,
      original.timingToleranceMs * CAPS.maxTimingMultiplier,
    ),
    timingGracePeriodMs: Math.min(
      config.timingGracePeriodMs,
      original.timingGracePeriodMs * CAPS.maxTimingMultiplier,
    ),
    tempo: Math.max(config.tempo, original.tempo - CAPS.maxTempoReduction),
    scoreBoostPercent: Math.min(config.scoreBoostPercent, CAPS.maxScoreBoost),
    xpMultiplier: Math.min(config.xpMultiplier, CAPS.maxXpMultiplier),
    comboShieldMisses: Math.min(config.comboShieldMisses, CAPS.maxComboShield),
    extraRetries: Math.min(config.extraRetries, CAPS.maxExtraRetries),
    notePreviewBeats: Math.min(config.notePreviewBeats, CAPS.maxNotePreview),
    gemBonusChance: Math.min(config.gemBonusChance, CAPS.maxGemBonusChance),
    ghostNotesFailThreshold: Math.max(config.ghostNotesFailThreshold, 1),
    gemBonusMultiplier: config.gemBonusMultiplier,
    streakSavesPerWeek: config.streakSavesPerWeek,
  };
}

/** Get the display info for an ability effect (for UI) */
export function getAbilityEffectDescription(effect: AbilityEffect): string {
  switch (effect.type) {
    case 'timing_window_multiplier':
      return `Timing window +${Math.round((effect.multiplier - 1) * 100)}%`;
    case 'tempo_reduction':
      return `Start ${effect.bpmReduction} BPM slower`;
    case 'xp_multiplier':
      return `${Math.round((effect.multiplier - 1) * 100)}% more XP`;
    case 'combo_shield':
      return `${effect.missesForgivenPerExercise} miss${effect.missesForgivenPerExercise > 1 ? 'es' : ''} forgiven in combo`;
    case 'score_boost':
      return `+${effect.percentageBoost}% score boost`;
    case 'ghost_notes_extended':
      return 'Ghost notes appear sooner';
    case 'extra_retries':
      return `${effect.extraRetries} extra retr${effect.extraRetries > 1 ? 'ies' : 'y'}`;
    case 'note_preview':
      return `Preview next ${effect.previewBeats} beat${effect.previewBeats > 1 ? 's' : ''}`;
    case 'gem_magnet':
      return `${Math.round(effect.bonusGemChance * 100)}% bonus gem chance`;
    case 'lucky_gems':
      return `${effect.bonusGemMultiplier}x gem multiplier chance`;
    case 'streak_saver':
      return `${effect.freeSavesPerWeek} streak save${effect.freeSavesPerWeek > 1 ? 's' : ''}/week`;
    case 'daily_xp_boost':
      return `${Math.round((effect.multiplier - 1) * 100)}% daily XP boost`;
    case 'hint_frequency_boost':
      return `${Math.round((effect.multiplier - 1) * 100)}% more hints`;
    case 'perfect_shield':
      return `${effect.shieldsPerExercise} "almost perfect" counts as perfect`;
    case 'all_abilities_half':
      return 'All abilities at half power';
    default:
      return 'Unknown ability';
  }
}

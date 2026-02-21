/**
 * AbilityEngine Tests
 *
 * Tests all ability effect types, safety caps, Chonky's master ability,
 * and the getAbilityEffectDescription UI helper.
 */

import {
  applyAbilities,
  createDefaultConfig,
  getAbilityEffectDescription,
} from '../AbilityEngine';
import type { ExerciseAbilityConfig } from '../AbilityEngine';
import type { AbilityEffect } from '@/stores/types';

// Mock catCharacters for resolveAbilities
jest.mock('@/components/Mascot/catCharacters', () => ({
  CAT_CHARACTERS: [
    {
      id: 'test-cat-1',
      abilities: [
        {
          id: 'tc1-timing',
          name: 'Wider Timing',
          description: 'Timing +20%',
          icon: 'timer',
          effect: { type: 'timing_window_multiplier', multiplier: 1.2 },
          unlockedAtStage: 'baby',
        },
        {
          id: 'tc1-tempo',
          name: 'Slow Start',
          description: 'Start 10 BPM slower',
          icon: 'metronome',
          effect: { type: 'tempo_reduction', bpmReduction: 10 },
          unlockedAtStage: 'teen',
        },
        {
          id: 'tc1-xp',
          name: 'XP Boost',
          description: '25% more XP',
          icon: 'arrow-up',
          effect: { type: 'xp_multiplier', multiplier: 1.25 },
          unlockedAtStage: 'adult',
        },
        {
          id: 'tc1-combo',
          name: 'Combo Shield',
          description: '1 miss forgiven',
          icon: 'shield',
          effect: { type: 'combo_shield', missesForgivenPerExercise: 1 },
          unlockedAtStage: 'master',
        },
      ],
    },
    {
      id: 'test-cat-2',
      abilities: [
        {
          id: 'tc2-score',
          name: 'Score Boost',
          description: '+5% score',
          icon: 'trending-up',
          effect: { type: 'score_boost', percentageBoost: 5 },
          unlockedAtStage: 'baby',
        },
        {
          id: 'tc2-ghost',
          name: 'Ghost Notes',
          description: 'Ghost after 2 fails',
          icon: 'ghost',
          effect: { type: 'ghost_notes_extended', extraFailsBeforeTrigger: -1 },
          unlockedAtStage: 'teen',
        },
        {
          id: 'tc2-retries',
          name: 'Extra Retry',
          description: '1 extra retry',
          icon: 'refresh',
          effect: { type: 'extra_retries', extraRetries: 1 },
          unlockedAtStage: 'adult',
        },
        {
          id: 'tc2-preview',
          name: 'Note Preview',
          description: 'See next note',
          icon: 'eye',
          effect: { type: 'note_preview', previewBeats: 1 },
          unlockedAtStage: 'master',
        },
      ],
    },
    {
      id: 'test-cat-3',
      abilities: [
        {
          id: 'tc3-gem',
          name: 'Gem Magnet',
          description: '10% bonus gems',
          icon: 'magnet',
          effect: { type: 'gem_magnet', bonusGemChance: 0.1 },
          unlockedAtStage: 'baby',
        },
        {
          id: 'tc3-lucky',
          name: 'Lucky Gems',
          description: '2x gem chance',
          icon: 'diamond',
          effect: { type: 'lucky_gems', bonusGemMultiplier: 2 },
          unlockedAtStage: 'teen',
        },
        {
          id: 'tc3-streak',
          name: 'Streak Saver',
          description: '1 save/week',
          icon: 'fire',
          effect: { type: 'streak_saver', freeSavesPerWeek: 1 },
          unlockedAtStage: 'adult',
        },
      ],
    },
    {
      id: 'chonky-monke',
      abilities: [
        {
          id: 'ck-all-half',
          name: 'Absolute Unit',
          description: 'All abilities at half power',
          icon: 'infinity',
          effect: { type: 'all_abilities_half', description: 'All at half' },
          unlockedAtStage: 'master',
        },
      ],
    },
  ],
}));

function defaultConfig(): ExerciseAbilityConfig {
  return createDefaultConfig(50, 150, 120);
}

describe('AbilityEngine', () => {
  describe('createDefaultConfig', () => {
    it('creates config with given parameters', () => {
      const config = createDefaultConfig(40, 100, 90);
      expect(config.timingToleranceMs).toBe(40);
      expect(config.timingGracePeriodMs).toBe(100);
      expect(config.tempo).toBe(90);
      expect(config.ghostNotesFailThreshold).toBe(3);
      expect(config.comboShieldMisses).toBe(0);
      expect(config.scoreBoostPercent).toBe(0);
      expect(config.xpMultiplier).toBe(1.0);
      expect(config.extraRetries).toBe(0);
      expect(config.notePreviewBeats).toBe(0);
      expect(config.gemBonusChance).toBe(0);
      expect(config.gemBonusMultiplier).toBe(1);
      expect(config.streakSavesPerWeek).toBe(0);
    });
  });

  describe('individual ability effects', () => {
    it('applies timing window multiplier', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc1-timing'], config);
      expect(result.timingToleranceMs).toBe(60); // 50 * 1.2
      expect(result.timingGracePeriodMs).toBe(180); // 150 * 1.2
    });

    it('applies tempo reduction', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc1-tempo'], config);
      expect(result.tempo).toBe(110); // 120 - 10
    });

    it('applies XP multiplier', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc1-xp'], config);
      expect(result.xpMultiplier).toBe(1.25);
    });

    it('applies combo shield', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc1-combo'], config);
      expect(result.comboShieldMisses).toBe(1);
    });

    it('applies score boost', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc2-score'], config);
      expect(result.scoreBoostPercent).toBe(5);
    });

    it('applies ghost notes extended', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc2-ghost'], config);
      // Default 3 + (-1) = 2, clamped to min 1
      expect(result.ghostNotesFailThreshold).toBe(2);
    });

    it('applies extra retries', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc2-retries'], config);
      expect(result.extraRetries).toBe(1);
    });

    it('applies note preview', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc2-preview'], config);
      expect(result.notePreviewBeats).toBe(1);
    });

    it('applies gem magnet', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc3-gem'], config);
      expect(result.gemBonusChance).toBe(0.1);
    });

    it('applies lucky gems', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc3-lucky'], config);
      expect(result.gemBonusMultiplier).toBe(2);
    });

    it('applies streak saver', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc3-streak'], config);
      expect(result.streakSavesPerWeek).toBe(1);
    });
  });

  describe('stacking multiple abilities', () => {
    it('stacks timing and tempo abilities', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc1-timing', 'tc1-tempo'], config);
      expect(result.timingToleranceMs).toBe(60); // 50 * 1.2
      expect(result.tempo).toBe(110); // 120 - 10
    });

    it('stacks score boost and XP multiplier', () => {
      const config = defaultConfig();
      const result = applyAbilities(['tc2-score', 'tc1-xp'], config);
      expect(result.scoreBoostPercent).toBe(5);
      expect(result.xpMultiplier).toBe(1.25);
    });
  });

  describe('safety caps', () => {
    it('caps timing window at 1.5x original', () => {
      const config = createDefaultConfig(50, 150, 120);
      // Apply two timing abilities that would exceed cap
      const result = applyAbilities(['tc1-timing', 'tc1-timing'], config);
      // 50 * 1.2 * 1.2 = 72, but cap is 50 * 1.5 = 75 → ok
      // This double application gives 72, under cap
      expect(result.timingToleranceMs).toBeLessThanOrEqual(75);
    });

    it('caps tempo reduction at 15 BPM', () => {
      const config = createDefaultConfig(50, 150, 120);
      const result = applyAbilities(['tc1-tempo', 'tc1-tempo'], config);
      // 120 - 10 - 10 = 100, but cap is 120 - 15 = 105
      expect(result.tempo).toBeGreaterThanOrEqual(105);
    });

    it('caps score boost at 15%', () => {
      const config = defaultConfig();
      // Apply score boost 4 times (5 * 4 = 20, but cap is 15)
      const result = applyAbilities(
        ['tc2-score', 'tc2-score', 'tc2-score', 'tc2-score'],
        config,
      );
      expect(result.scoreBoostPercent).toBeLessThanOrEqual(15);
    });

    it('caps XP multiplier at 2.0x', () => {
      const config = defaultConfig();
      const result = applyAbilities(
        ['tc1-xp', 'tc1-xp', 'tc1-xp', 'tc1-xp'],
        config,
      );
      expect(result.xpMultiplier).toBeLessThanOrEqual(2.0);
    });

    it('caps combo shield at 3', () => {
      const config = defaultConfig();
      const result = applyAbilities(
        ['tc1-combo', 'tc1-combo', 'tc1-combo', 'tc1-combo'],
        config,
      );
      expect(result.comboShieldMisses).toBeLessThanOrEqual(3);
    });

    it('caps extra retries at 2', () => {
      const config = defaultConfig();
      const result = applyAbilities(
        ['tc2-retries', 'tc2-retries', 'tc2-retries'],
        config,
      );
      expect(result.extraRetries).toBeLessThanOrEqual(2);
    });

    it('caps note preview at 2', () => {
      const config = defaultConfig();
      const result = applyAbilities(
        ['tc2-preview', 'tc2-preview', 'tc2-preview'],
        config,
      );
      expect(result.notePreviewBeats).toBeLessThanOrEqual(2);
    });

    it('caps gem bonus chance at 0.3', () => {
      const config = defaultConfig();
      const result = applyAbilities(
        ['tc3-gem', 'tc3-gem', 'tc3-gem', 'tc3-gem'],
        config,
      );
      expect(result.gemBonusChance).toBeLessThanOrEqual(0.3);
    });

    it('ghost notes threshold never goes below 1', () => {
      const config = defaultConfig();
      const result = applyAbilities(
        ['tc2-ghost', 'tc2-ghost', 'tc2-ghost', 'tc2-ghost'],
        config,
      );
      expect(result.ghostNotesFailThreshold).toBeGreaterThanOrEqual(1);
    });
  });

  describe('unknown abilities', () => {
    it('ignores unknown ability IDs', () => {
      const config = defaultConfig();
      const result = applyAbilities(['nonexistent-ability'], config);
      expect(result).toEqual(config);
    });
  });

  describe('Chonky all_abilities_half', () => {
    it('applies all non-Chonky abilities at half power', () => {
      const config = defaultConfig();
      const result = applyAbilities(['ck-all-half'], config);

      // Timing: 1 + (1.2 - 1) / 2 = 1.1 → 50 * 1.1 = 55
      expect(result.timingToleranceMs).toBeGreaterThan(50);
      expect(result.timingToleranceMs).toBeLessThan(60);

      // Tempo: 10 / 2 = 5 → 120 - 5 = 115
      expect(result.tempo).toBeLessThan(120);
      expect(result.tempo).toBeGreaterThan(110);

      // XP: 1 + (1.25 - 1) / 2 = 1.125
      expect(result.xpMultiplier).toBeGreaterThan(1.0);
      expect(result.xpMultiplier).toBeLessThan(1.25);

      // Score: 5 / 2 = 2 or 3 (rounded)
      expect(result.scoreBoostPercent).toBeGreaterThan(0);
      expect(result.scoreBoostPercent).toBeLessThan(5);
    });
  });

  describe('getAbilityEffectDescription', () => {
    it('describes timing window multiplier', () => {
      const effect: AbilityEffect = { type: 'timing_window_multiplier', multiplier: 1.2 };
      expect(getAbilityEffectDescription(effect)).toBe('Timing window +20%');
    });

    it('describes tempo reduction', () => {
      const effect: AbilityEffect = { type: 'tempo_reduction', bpmReduction: 10 };
      expect(getAbilityEffectDescription(effect)).toBe('Start 10 BPM slower');
    });

    it('describes xp multiplier', () => {
      const effect: AbilityEffect = { type: 'xp_multiplier', multiplier: 1.25 };
      expect(getAbilityEffectDescription(effect)).toBe('25% more XP');
    });

    it('describes combo shield (singular)', () => {
      const effect: AbilityEffect = { type: 'combo_shield', missesForgivenPerExercise: 1 };
      expect(getAbilityEffectDescription(effect)).toBe('1 miss forgiven in combo');
    });

    it('describes combo shield (plural)', () => {
      const effect: AbilityEffect = { type: 'combo_shield', missesForgivenPerExercise: 2 };
      expect(getAbilityEffectDescription(effect)).toBe('2 misses forgiven in combo');
    });

    it('describes score boost', () => {
      const effect: AbilityEffect = { type: 'score_boost', percentageBoost: 5 };
      expect(getAbilityEffectDescription(effect)).toBe('+5% score boost');
    });

    it('describes ghost notes extended', () => {
      const effect: AbilityEffect = { type: 'ghost_notes_extended', extraFailsBeforeTrigger: -1 };
      expect(getAbilityEffectDescription(effect)).toBe('Ghost notes appear sooner');
    });

    it('describes extra retries', () => {
      const effect: AbilityEffect = { type: 'extra_retries', extraRetries: 1 };
      expect(getAbilityEffectDescription(effect)).toBe('1 extra retry');
    });

    it('describes note preview', () => {
      const effect: AbilityEffect = { type: 'note_preview', previewBeats: 2 };
      expect(getAbilityEffectDescription(effect)).toBe('Preview next 2 beats');
    });

    it('describes gem magnet', () => {
      const effect: AbilityEffect = { type: 'gem_magnet', bonusGemChance: 0.1 };
      expect(getAbilityEffectDescription(effect)).toBe('10% bonus gem chance');
    });

    it('describes lucky gems', () => {
      const effect: AbilityEffect = { type: 'lucky_gems', bonusGemMultiplier: 2 };
      expect(getAbilityEffectDescription(effect)).toBe('2x gem multiplier chance');
    });

    it('describes streak saver', () => {
      const effect: AbilityEffect = { type: 'streak_saver', freeSavesPerWeek: 1 };
      expect(getAbilityEffectDescription(effect)).toBe('1 streak save/week');
    });

    it('describes daily xp boost', () => {
      const effect: AbilityEffect = { type: 'daily_xp_boost', multiplier: 1.15 };
      expect(getAbilityEffectDescription(effect)).toBe('15% daily XP boost');
    });

    it('describes perfect shield', () => {
      const effect: AbilityEffect = { type: 'perfect_shield', shieldsPerExercise: 1 };
      expect(getAbilityEffectDescription(effect)).toBe('1 "almost perfect" counts as perfect');
    });

    it('describes all abilities half', () => {
      const effect: AbilityEffect = { type: 'all_abilities_half', description: 'All' };
      expect(getAbilityEffectDescription(effect)).toBe('All abilities at half power');
    });
  });
});

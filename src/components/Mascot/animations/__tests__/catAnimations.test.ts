/**
 * catAnimations tests
 *
 * Validates:
 * - All poses have valid configs with keyframes
 * - Mapping functions cover all inputs
 * - Pose moods are valid MascotMood values
 */

import {
  POSE_CONFIGS,
  moodToPose,
  reactionToPose,
  reactionToMood,
  PART_SPRINGS,
  SQUASH_STRETCH,
  REACTIONS,
} from '../catAnimations';
import type { PartName } from '../catAnimations';
import type { CatPose } from '../catAnimations';
import type { MascotMood } from '../../types';
import type { BuddyReaction } from '../../ExerciseBuddy';

const ALL_POSES: CatPose[] = ['idle', 'celebrate', 'teach', 'sleep', 'play', 'curious', 'sad'];
const ALL_MOODS: MascotMood[] = ['happy', 'encouraging', 'excited', 'teaching', 'celebrating'];
const ALL_REACTIONS: BuddyReaction[] = ['idle', 'perfect', 'good', 'miss', 'combo', 'celebrating'];

describe('POSE_CONFIGS', () => {
  it('has configs for all defined poses', () => {
    for (const pose of ALL_POSES) {
      expect(POSE_CONFIGS[pose]).toBeDefined();
    }
  });

  it('each pose has at least one keyframe', () => {
    for (const pose of ALL_POSES) {
      expect(POSE_CONFIGS[pose].keyframes.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('each keyframe has valid numeric properties', () => {
    for (const pose of ALL_POSES) {
      for (const kf of POSE_CONFIGS[pose].keyframes) {
        expect(typeof kf.translateY).toBe('number');
        expect(typeof kf.scale).toBe('number');
        expect(typeof kf.rotate).toBe('number');
        expect(typeof kf.duration).toBe('number');
        expect(kf.duration).toBeGreaterThan(0);
        expect(kf.scale).toBeGreaterThan(0);
      }
    }
  });

  it('each pose has a valid mood', () => {
    for (const pose of ALL_POSES) {
      expect(ALL_MOODS).toContain(POSE_CONFIGS[pose].mood);
    }
  });

  it('looping poses are idle, teach, and sleep', () => {
    expect(POSE_CONFIGS.idle.loop).toBe(true);
    expect(POSE_CONFIGS.teach.loop).toBe(true);
    expect(POSE_CONFIGS.sleep.loop).toBe(true);
    expect(POSE_CONFIGS.celebrate.loop).toBe(false);
    expect(POSE_CONFIGS.play.loop).toBe(false);
    expect(POSE_CONFIGS.curious.loop).toBe(false);
    expect(POSE_CONFIGS.sad.loop).toBe(false);
  });
});

describe('moodToPose', () => {
  it('maps every MascotMood to a valid pose', () => {
    for (const mood of ALL_MOODS) {
      const pose = moodToPose(mood);
      expect(ALL_POSES).toContain(pose);
    }
  });

  it('maps celebrating → celebrate', () => {
    expect(moodToPose('celebrating')).toBe('celebrate');
  });

  it('maps excited → play', () => {
    expect(moodToPose('excited')).toBe('play');
  });

  it('maps teaching → teach', () => {
    expect(moodToPose('teaching')).toBe('teach');
  });

  it('maps happy → idle', () => {
    expect(moodToPose('happy')).toBe('idle');
  });

  it('maps encouraging → curious', () => {
    expect(moodToPose('encouraging')).toBe('curious');
  });
});

describe('reactionToPose', () => {
  it('maps every BuddyReaction to a valid pose', () => {
    for (const reaction of ALL_REACTIONS) {
      const pose = reactionToPose(reaction);
      expect(ALL_POSES).toContain(pose);
    }
  });

  it('maps perfect → celebrate', () => {
    expect(reactionToPose('perfect')).toBe('celebrate');
  });

  it('maps good → curious', () => {
    expect(reactionToPose('good')).toBe('curious');
  });

  it('maps miss → sad', () => {
    expect(reactionToPose('miss')).toBe('sad');
  });

  it('maps combo → play', () => {
    expect(reactionToPose('combo')).toBe('play');
  });

  it('maps celebrating → celebrate', () => {
    expect(reactionToPose('celebrating')).toBe('celebrate');
  });

  it('maps idle → idle', () => {
    expect(reactionToPose('idle')).toBe('idle');
  });
});

describe('reactionToMood', () => {
  it('maps every BuddyReaction to a valid MascotMood', () => {
    for (const reaction of ALL_REACTIONS) {
      const mood = reactionToMood(reaction);
      expect(ALL_MOODS).toContain(mood);
    }
  });

  it('returns the mood from the corresponding pose config', () => {
    for (const reaction of ALL_REACTIONS) {
      const pose = reactionToPose(reaction);
      const mood = reactionToMood(reaction);
      expect(mood).toBe(POSE_CONFIGS[pose].mood);
    }
  });
});

describe('PART_SPRINGS', () => {
  it('has configs for all expected parts', () => {
    const expectedParts = ['body', 'head', 'ears', 'tail', 'face', 'accessories'];
    for (const part of expectedParts) {
      expect(PART_SPRINGS[part as keyof typeof PART_SPRINGS]).toBeDefined();
    }
  });

  it('each spring config has valid numeric properties', () => {
    for (const [, config] of Object.entries(PART_SPRINGS)) {
      expect(typeof config.damping).toBe('number');
      expect(typeof config.stiffness).toBe('number');
      expect(typeof config.mass).toBe('number');
      expect(typeof config.delay).toBe('number');
      expect(config.damping).toBeGreaterThan(0);
      expect(config.stiffness).toBeGreaterThan(0);
      expect(config.mass).toBeGreaterThan(0);
      expect(config.delay).toBeGreaterThanOrEqual(0);
    }
  });

  it('body has heaviest mass and no delay', () => {
    expect(PART_SPRINGS.body.mass).toBe(1.0);
    expect(PART_SPRINGS.body.delay).toBe(0);
  });

  it('accessories have the longest delay (follow-through)', () => {
    const maxDelay = Math.max(...Object.values(PART_SPRINGS).map(s => s.delay));
    expect(PART_SPRINGS.accessories.delay).toBe(maxDelay);
  });
});

describe('SQUASH_STRETCH', () => {
  it('has configs for celebrate, play, and sad poses', () => {
    expect(SQUASH_STRETCH.celebrate).toBeDefined();
    expect(SQUASH_STRETCH.play).toBeDefined();
    expect(SQUASH_STRETCH.sad).toBeDefined();
  });

  it('celebrate has body and head squash/stretch', () => {
    expect(SQUASH_STRETCH.celebrate!.body).toBeDefined();
    expect(SQUASH_STRETCH.celebrate!.head).toBeDefined();
    expect(SQUASH_STRETCH.celebrate!.body!.length).toBeGreaterThanOrEqual(2);
  });

  it('all squash/stretch keyframes have valid scaleX and scaleY', () => {
    for (const [, parts] of Object.entries(SQUASH_STRETCH)) {
      if (!parts) continue;
      for (const [, keyframes] of Object.entries(parts)) {
        if (!keyframes) continue;
        for (const kf of keyframes) {
          expect(typeof kf.scaleX).toBe('number');
          expect(typeof kf.scaleY).toBe('number');
          expect(kf.scaleX).toBeGreaterThan(0);
          expect(kf.scaleY).toBeGreaterThan(0);
        }
      }
    }
  });
});

const VALID_PART_NAMES: PartName[] = ['body', 'head', 'ears', 'tail', 'face', 'accessories'];
const REACTIONS_WITH_CONFIGS: BuddyReaction[] = ['perfect', 'miss', 'good', 'combo', 'celebrating'];

describe('REACTIONS', () => {
  it('has configs for perfect, miss, good, combo, and celebrating', () => {
    for (const reaction of REACTIONS_WITH_CONFIGS) {
      expect(REACTIONS[reaction]).toBeDefined();
    }
  });

  it('does not have a config for idle (idle returns to neutral)', () => {
    expect(REACTIONS.idle).toBeUndefined();
  });

  it('each config has parts and a positive settle duration', () => {
    for (const reaction of REACTIONS_WITH_CONFIGS) {
      const config = REACTIONS[reaction]!;
      expect(config.parts).toBeDefined();
      expect(typeof config.settle).toBe('number');
      expect(config.settle).toBeGreaterThan(0);
    }
  });

  it('all part keys are valid PartName values', () => {
    for (const reaction of REACTIONS_WITH_CONFIGS) {
      const config = REACTIONS[reaction]!;
      for (const partKey of Object.keys(config.parts)) {
        expect(VALID_PART_NAMES).toContain(partKey);
      }
    }
  });

  it('each ReactionTarget has a positive duration', () => {
    for (const reaction of REACTIONS_WITH_CONFIGS) {
      const config = REACTIONS[reaction]!;
      for (const [, target] of Object.entries(config.parts)) {
        if (!target) continue;
        expect(typeof target.duration).toBe('number');
        expect(target.duration).toBeGreaterThan(0);
      }
    }
  });

  it('perfect has body, ears, and face targets', () => {
    const config = REACTIONS.perfect!;
    expect(config.parts.body).toBeDefined();
    expect(config.parts.ears).toBeDefined();
    expect(config.parts.face).toBeDefined();
  });

  it('miss has body with positive translateY (droop)', () => {
    const config = REACTIONS.miss!;
    expect(config.parts.body).toBeDefined();
    expect(config.parts.body!.translateY).toBeGreaterThan(0);
  });

  it('celebrating has the longest settle duration', () => {
    const settles = REACTIONS_WITH_CONFIGS.map(r => REACTIONS[r]!.settle);
    const maxSettle = Math.max(...settles);
    expect(REACTIONS.celebrating!.settle).toBe(maxSettle);
  });

  it('combo includes tail rotation', () => {
    const config = REACTIONS.combo!;
    expect(config.parts.tail).toBeDefined();
    expect(config.parts.tail!.rotate).toBeDefined();
    expect(config.parts.tail!.rotate).toBeGreaterThan(0);
  });
});

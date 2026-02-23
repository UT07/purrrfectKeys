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
} from '../catAnimations';
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

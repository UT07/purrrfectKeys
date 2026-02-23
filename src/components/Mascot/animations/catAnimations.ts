/**
 * Cat Pose System — Reanimated animation configs for CatAvatar poses.
 *
 * Each pose defines transform targets that drive Reanimated shared values.
 * Poses control the *container* transforms (translateY, scale, rotate)
 * while mood-driven SVG rendering handles facial expressions.
 *
 * Poses are applied by the useCatPose hook in CatAvatar.
 */

import type { MascotMood } from '../types';
import type { BuddyReaction } from '../ExerciseBuddy';

// ─────────────────────────────────────────────────
// Pose types
// ─────────────────────────────────────────────────

export type CatPose =
  | 'idle'
  | 'celebrate'
  | 'teach'
  | 'sleep'
  | 'play'
  | 'curious'
  | 'sad';

/** Animation keyframe — a single step in a pose sequence */
export interface PoseKeyframe {
  translateY: number;
  scale: number;
  rotate: number; // degrees
  duration: number; // ms
}

/** Full pose config: a sequence of keyframes + loop behavior */
export interface PoseConfig {
  keyframes: PoseKeyframe[];
  loop: boolean;
  /** Mood to pass to KeysieSvg for facial expression */
  mood: MascotMood;
}

// ─────────────────────────────────────────────────
// Pose definitions
// ─────────────────────────────────────────────────

export const POSE_CONFIGS: Record<CatPose, PoseConfig> = {
  idle: {
    keyframes: [
      { translateY: -3, scale: 1.02, rotate: 0, duration: 1800 },
      { translateY: 0, scale: 1.0, rotate: 0, duration: 1800 },
    ],
    loop: true,
    mood: 'happy',
  },

  celebrate: {
    keyframes: [
      { translateY: -10, scale: 1.15, rotate: -5, duration: 200 },
      { translateY: -6, scale: 1.1, rotate: 5, duration: 200 },
      { translateY: -10, scale: 1.15, rotate: -3, duration: 200 },
      { translateY: -4, scale: 1.05, rotate: 3, duration: 200 },
      { translateY: 0, scale: 1.0, rotate: 0, duration: 300 },
    ],
    loop: false,
    mood: 'celebrating',
  },

  teach: {
    keyframes: [
      { translateY: -2, scale: 1.0, rotate: -3, duration: 1200 },
      { translateY: 0, scale: 1.0, rotate: 3, duration: 1200 },
    ],
    loop: true,
    mood: 'teaching',
  },

  sleep: {
    keyframes: [
      { translateY: 2, scale: 0.96, rotate: 5, duration: 2500 },
      { translateY: 4, scale: 0.94, rotate: 5, duration: 2500 },
    ],
    loop: true,
    mood: 'happy', // sleepy cats have happy/closed eyes
  },

  play: {
    keyframes: [
      { translateY: -6, scale: 1.08, rotate: -4, duration: 250 },
      { translateY: 0, scale: 1.0, rotate: 4, duration: 250 },
      { translateY: -6, scale: 1.08, rotate: -4, duration: 250 },
      { translateY: 0, scale: 1.0, rotate: 0, duration: 300 },
    ],
    loop: false,
    mood: 'excited',
  },

  curious: {
    keyframes: [
      { translateY: -2, scale: 1.03, rotate: -8, duration: 400 },
      { translateY: -2, scale: 1.03, rotate: -8, duration: 800 }, // hold tilt
      { translateY: 0, scale: 1.0, rotate: 0, duration: 400 },
    ],
    loop: false,
    mood: 'encouraging',
  },

  sad: {
    keyframes: [
      { translateY: 4, scale: 0.92, rotate: 0, duration: 500 },
      { translateY: 3, scale: 0.94, rotate: 0, duration: 1500 },
      { translateY: 0, scale: 1.0, rotate: 0, duration: 700 },
    ],
    loop: false,
    mood: 'teaching', // neutral/focused expression for sad
  },
};

// ─────────────────────────────────────────────────
// Mapping helpers
// ─────────────────────────────────────────────────

/** Map MascotMood → CatPose (for static contexts like screens) */
export function moodToPose(mood: MascotMood): CatPose {
  switch (mood) {
    case 'celebrating':
      return 'celebrate';
    case 'excited':
      return 'play';
    case 'teaching':
      return 'teach';
    case 'encouraging':
      return 'curious';
    case 'happy':
    default:
      return 'idle';
  }
}

/** Map BuddyReaction → CatPose (for ExerciseBuddy during gameplay) */
export function reactionToPose(reaction: BuddyReaction): CatPose {
  switch (reaction) {
    case 'perfect':
      return 'celebrate';
    case 'good':
      return 'curious';
    case 'miss':
      return 'sad';
    case 'combo':
      return 'play';
    case 'celebrating':
      return 'celebrate';
    case 'idle':
    default:
      return 'idle';
  }
}

/** Map BuddyReaction → MascotMood (for SVG facial expression) */
export function reactionToMood(reaction: BuddyReaction): MascotMood {
  const pose = reactionToPose(reaction);
  return POSE_CONFIGS[pose].mood;
}

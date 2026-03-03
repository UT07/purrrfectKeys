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
    case 'sleepy':
      return 'sleep';
    case 'happy':
    case 'love':
    case 'confused':
    case 'smug':
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

// ─────────────────────────────────────────────────
// Per-part spring physics configs
// ─────────────────────────────────────────────────

/** Spring config per SVG layer — controls follow-through physics */
export const PART_SPRINGS = {
  body:        { damping: 12, stiffness: 100, mass: 1.0, delay: 0 },
  head:        { damping: 10, stiffness: 120, mass: 0.8, delay: 30 },
  ears:        { damping: 6,  stiffness: 80,  mass: 0.3, delay: 80 },
  tail:        { damping: 5,  stiffness: 60,  mass: 0.4, delay: 120 },
  face:        { damping: 15, stiffness: 150, mass: 0.5, delay: 0 },
  accessories: { damping: 4,  stiffness: 40,  mass: 0.6, delay: 150 },
} as const;

export type PartName = keyof typeof PART_SPRINGS;

/** Squash/stretch keyframes for energetic poses */
export const SQUASH_STRETCH: Partial<Record<CatPose, Record<string, { scaleX: number; scaleY: number }[]>>> = {
  celebrate: {
    body: [
      { scaleX: 0.9, scaleY: 1.15 },  // stretch up
      { scaleX: 1.1, scaleY: 0.85 },  // squash down
      { scaleX: 1.0, scaleY: 1.0 },   // settle
    ],
    head: [
      { scaleX: 1.05, scaleY: 0.95 },
      { scaleX: 0.95, scaleY: 1.05 },
      { scaleX: 1.0, scaleY: 1.0 },
    ],
  },
  play: {
    body: [
      { scaleX: 0.92, scaleY: 1.1 },
      { scaleX: 1.08, scaleY: 0.9 },
      { scaleX: 1.0, scaleY: 1.0 },
    ],
  },
  sad: {
    body: [
      { scaleX: 1.05, scaleY: 0.92 },  // slight droop squash
      { scaleX: 1.0, scaleY: 1.0 },
    ],
  },
};

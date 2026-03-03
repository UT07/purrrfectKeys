/**
 * Per-Cat Visual Profiles
 *
 * Each cat gets a unique combination of body type, eye shape, ear type,
 * tail style, and optional features (blush, cheek fluff, freckles).
 * This maps catCharacters.ts IDs → composable SVG part selections.
 */

import type { BodyType, EarType, EyeShape, TailType } from './CatParts';
import { getCatColors } from '../catColorPalette';

export type HairTuftType =
  | 'none' | 'curly' | 'slicked' | 'fluffy' | 'spiky'
  | 'wave' | 'windswept' | 'side-part' | 'silky' | 'sharp'
  | 'messy' | 'cowlick';

export type PupilType = 'round' | 'slit';
export type HairTuftSize = 'small' | 'medium' | 'large';

export interface CatProfile {
  body: BodyType;
  ears: EarType;
  eyes: EyeShape;
  tail: TailType;
  cheekFluff: boolean;
  blush: boolean;
  blushColor?: string;
  hairTuft: HairTuftType;
  eyelashes: boolean;
  pupilType: PupilType;
  fang: boolean;
  hairTuftSize: HairTuftSize;
}

/** Default profile for unknown cats */
const DEFAULT_PROFILE: CatProfile = {
  body: 'standard',
  ears: 'pointed',
  eyes: 'round',
  tail: 'curled',
  cheekFluff: false,
  blush: false,
  hairTuft: 'none',
  eyelashes: false,
  pupilType: 'round',
  fang: false,
  hairTuftSize: 'small',
};

export const CAT_PROFILES: Record<string, CatProfile> = {
  // ─── Starters ───────────────────────────────
  'mini-meowww': {
    body: 'slim',
    ears: 'pointed',
    eyes: 'big-sparkly',
    tail: 'curled',
    cheekFluff: false,
    blush: true,
    blushColor: getCatColors('mini-meowww').blush ?? undefined,
    hairTuft: 'curly',
    eyelashes: true,
    pupilType: 'round',
    fang: false,
    hairTuftSize: 'small',
  },
  'jazzy': {
    body: 'slim',
    ears: 'pointed',
    eyes: 'almond',
    tail: 'straight',
    cheekFluff: false,
    blush: false,
    hairTuft: 'slicked',
    eyelashes: false,
    pupilType: 'slit',
    fang: true,
    hairTuftSize: 'medium',
  },
  'luna': {
    body: 'standard',
    ears: 'pointed',
    eyes: 'almond',
    tail: 'fluffy',
    cheekFluff: false,
    blush: false,
    hairTuft: 'none',
    eyelashes: true,
    pupilType: 'slit',
    fang: false,
    hairTuftSize: 'small',
  },

  // ─── Gem-unlockable ─────────────────────────
  'biscuit': {
    body: 'round',
    ears: 'rounded',
    eyes: 'round',
    tail: 'curled',
    cheekFluff: true,
    blush: true,
    blushColor: getCatColors('biscuit').blush ?? undefined,
    hairTuft: 'fluffy',
    eyelashes: true,
    pupilType: 'round',
    fang: false,
    hairTuftSize: 'medium',
  },
  'ballymakawww': {
    body: 'round',
    ears: 'rounded',
    eyes: 'round',
    tail: 'straight',
    cheekFluff: true,
    blush: true,
    blushColor: getCatColors('ballymakawww').blush ?? undefined,
    hairTuft: 'spiky',
    eyelashes: false,
    pupilType: 'round',
    fang: true,
    hairTuftSize: 'medium',
  },
  'aria': {
    body: 'slim',
    ears: 'pointed',
    eyes: 'big-sparkly',
    tail: 'fluffy',
    cheekFluff: false,
    blush: false,
    hairTuft: 'wave',
    eyelashes: true,
    pupilType: 'round',
    fang: false,
    hairTuftSize: 'medium',
  },
  'tempo': {
    body: 'slim',
    ears: 'pointed',
    eyes: 'round',
    tail: 'straight',
    cheekFluff: false,
    blush: false,
    hairTuft: 'windswept',
    eyelashes: false,
    pupilType: 'slit',
    fang: true,
    hairTuftSize: 'small',
  },
  'shibu': {
    body: 'slim',
    ears: 'pointed',
    eyes: 'almond',
    tail: 'curled',
    cheekFluff: false,
    blush: true,
    blushColor: getCatColors('shibu').blush ?? undefined,
    hairTuft: 'side-part',
    eyelashes: false,
    pupilType: 'slit',
    fang: false,
    hairTuftSize: 'small',
  },
  'bella': {
    body: 'round',
    ears: 'rounded',
    eyes: 'big-sparkly',
    tail: 'fluffy',
    cheekFluff: true,
    blush: true,
    blushColor: getCatColors('bella').blush ?? undefined,
    hairTuft: 'silky',
    eyelashes: true,
    pupilType: 'round',
    fang: false,
    hairTuftSize: 'medium',
  },
  'sable': {
    body: 'slim',
    ears: 'pointed',
    eyes: 'almond',
    tail: 'fluffy',
    cheekFluff: false,
    blush: false,
    hairTuft: 'sharp',
    eyelashes: false,
    pupilType: 'slit',
    fang: true,
    hairTuftSize: 'medium',
  },
  'coda': {
    body: 'standard',
    ears: 'rounded',
    eyes: 'round',
    tail: 'curled',
    cheekFluff: true,
    blush: false,
    hairTuft: 'messy',
    eyelashes: false,
    pupilType: 'round',
    fang: false,
    hairTuftSize: 'medium',
  },

  // ─── Legendary ──────────────────────────────
  'chonky-monke': {
    body: 'chonky',
    ears: 'rounded',
    eyes: 'round',
    tail: 'fluffy',
    cheekFluff: true,
    blush: true,
    blushColor: getCatColors('chonky-monke').blush ?? undefined,
    hairTuft: 'cowlick',
    eyelashes: false,
    pupilType: 'round',
    fang: false,
    hairTuftSize: 'large',
  },

  // ─── Coach NPC ──────────────────────────────
  'salsa': {
    body: 'standard',
    ears: 'pointed',
    eyes: 'big-sparkly',
    tail: 'curled',
    cheekFluff: false,
    blush: true,
    blushColor: getCatColors('salsa').blush ?? undefined,
    hairTuft: 'none',
    eyelashes: false,
    pupilType: 'round',
    fang: false,
    hairTuftSize: 'small',
  },
};

/** Look up a cat's visual profile, falling back to default */
export function getCatProfile(catId: string): CatProfile {
  return CAT_PROFILES[catId] ?? DEFAULT_PROFILE;
}

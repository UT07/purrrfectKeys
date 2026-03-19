import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { COLORS } from './tokens';
import type { RankedTier } from '../stores/types';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface LeagueTierConfig {
  label: string;
  color: string;
  icon: IconName;
  arenaGlow: string;
}

export const LEAGUE_TIER_CONFIG: Record<RankedTier, LeagueTierConfig> = {
  novice:      { label: 'Novice',      color: '#A0AEC0', icon: 'shield-outline',     arenaGlow: 'rgba(160, 174, 192, 0.12)' },
  apprentice:  { label: 'Apprentice',  color: '#CD7F32', icon: 'shield-outline',     arenaGlow: 'rgba(205, 127, 50, 0.12)' },
  performer:   { label: 'Performer',   color: '#C0C0C0', icon: 'shield-half-full',   arenaGlow: 'rgba(192, 192, 192, 0.12)' },
  virtuoso:    { label: 'Virtuoso',    color: '#FFD700', icon: 'shield-star',         arenaGlow: 'rgba(255, 215, 0, 0.12)' },
  maestro:     { label: 'Maestro',     color: '#4FC3F7', icon: 'shield-star',         arenaGlow: 'rgba(79, 195, 247, 0.12)' },
  prodigy:     { label: 'Prodigy',     color: '#BA68C8', icon: 'shield-crown',        arenaGlow: 'rgba(186, 104, 200, 0.12)' },
  luminary:    { label: 'Luminary',    color: '#F06292', icon: 'shield-crown',        arenaGlow: 'rgba(240, 98, 146, 0.15)' },
  legend:      { label: 'Legend',      color: '#FF6E40', icon: 'shield-crown',        arenaGlow: 'rgba(255, 110, 64, 0.15)' },
  grandmaster: { label: 'Grandmaster', color: '#B9F2FF', icon: 'shield-crown',        arenaGlow: 'rgba(185, 242, 255, 0.18)' },
};

export const MEDAL_COLORS = {
  gold: COLORS.starGold,
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

/** Medal colors keyed by podium position (1st, 2nd, 3rd) */
export const PODIUM_MEDAL_COLORS: Record<number, string> = {
  1: MEDAL_COLORS.gold,
  2: MEDAL_COLORS.silver,
  3: MEDAL_COLORS.bronze,
};

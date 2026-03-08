import { COLORS } from './tokens';

export interface LeagueTierConfig {
  label: string;
  color: string;
  icon: 'shield-outline' | 'shield-half-full' | 'shield-star' | 'shield-crown';
  arenaGlow: string;
}

export const LEAGUE_TIER_CONFIG: Record<string, LeagueTierConfig> = {
  bronze:  { label: 'Bronze',  color: '#CD7F32', icon: 'shield-outline',   arenaGlow: 'rgba(205, 127, 50, 0.12)' },
  silver:  { label: 'Silver',  color: '#C0C0C0', icon: 'shield-half-full', arenaGlow: 'rgba(192, 192, 192, 0.12)' },
  gold:    { label: 'Gold',    color: '#FFD700', icon: 'shield-star',      arenaGlow: 'rgba(255, 215, 0, 0.12)' },
  diamond: { label: 'Diamond', color: '#B9F2FF', icon: 'shield-crown',     arenaGlow: 'rgba(185, 242, 255, 0.15)' },
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

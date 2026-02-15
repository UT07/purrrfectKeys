export type MascotMood = 'happy' | 'encouraging' | 'excited' | 'teaching' | 'celebrating';
export type MascotSize = 'tiny' | 'small' | 'medium' | 'large';

export const MASCOT_SIZES: Record<MascotSize, number> = {
  tiny: 24,
  small: 40,
  medium: 56,
  large: 80,
};

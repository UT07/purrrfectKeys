/**
 * KeySense Color Theme — Concert Hall
 * Deep black background, crimson red accents, white text
 * Premium, elegant feel like a concert stage
 */

export const COLORS = {
  // Backgrounds
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceLight: '#252525',
  surfaceElevated: '#2A2A2A',

  // Primary (crimson red)
  primary: '#DC143C',
  primaryLight: '#FF2D55',
  primaryDark: '#A3102E',
  primaryMuted: 'rgba(220, 20, 60, 0.15)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#666666',
  textOnPrimary: '#FFFFFF',

  // Borders
  border: '#333333',
  borderLight: '#444444',

  // Gameplay feedback (keep standard associations)
  success: '#4CAF50',
  successLight: '#81C784',
  successDark: '#2E7D32',
  successBg: 'rgba(76, 175, 80, 0.15)',

  warning: '#FFB300',
  warningLight: '#FFD54F',

  error: '#EF5350',
  errorLight: '#FF8A80',

  // Stars & XP
  star: '#FFD700',
  starEmpty: '#444444',
  xp: '#DC143C',

  // Tab bar
  tabActive: '#DC143C',
  tabInactive: '#666666',
  tabBar: '#111111',

  // Cards
  cardBackground: '#1A1A1A',
  cardBorder: '#2A2A2A',

  // Specific UI elements
  streakColor: '#FF6B35',
  freezeColor: '#4FC3F7',
  levelBadge: '#DC143C',
} as const;

export type ThemeColor = keyof typeof COLORS;

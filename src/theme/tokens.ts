export const COLORS = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  primary: '#DC143C',

  cardSurface: '#242424',
  cardBorder: '#333333',
  cardHighlight: '#2A2A2A',

  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',
  textAccent: '#DC143C',

  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  starGold: '#FFD700',
  starEmpty: '#444444',
} as const;

export const GRADIENTS = {
  purple: ['#1A0A2E', '#2D1B4E'] as const,
  gold: ['#FFD700', '#FFA500'] as const,
  success: ['#4CAF50', '#2E7D32'] as const,
  crimson: ['#DC143C', '#8B0000'] as const,
  header: ['#1A0A2E', '#0D0D0D'] as const,
} as const;

export const GLOW = {
  crimson: 'rgba(220, 20, 60, 0.3)',
  gold: 'rgba(255, 215, 0, 0.3)',
  purple: 'rgba(138, 43, 226, 0.3)',
  success: 'rgba(76, 175, 80, 0.3)',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const ANIMATION_CONFIG = {
  spring: { damping: 15, stiffness: 150 },
  bounce: { damping: 8, stiffness: 200 },
  fadeIn: { duration: 300 },
  slideUp: { duration: 400 },
  celebration: { duration: 2000 },
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

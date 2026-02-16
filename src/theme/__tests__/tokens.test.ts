import { COLORS, GRADIENTS, GLOW, SPACING, ANIMATION_CONFIG } from '../tokens';

describe('Design Tokens', () => {
  it('exports all required base colors', () => {
    expect(COLORS.background).toBe('#0D0D0D');
    expect(COLORS.surface).toBe('#1A1A1A');
    expect(COLORS.primary).toBe('#DC143C');
    expect(COLORS.cardSurface).toBe('#242424');
    expect(COLORS.textPrimary).toBe('#FFFFFF');
    expect(COLORS.textSecondary).toBe('#AAAAAA');
    expect(COLORS.textMuted).toBe('#666666');
  });

  it('exports gradient arrays with exactly 2 colors', () => {
    expect(GRADIENTS.purple).toHaveLength(2);
    expect(GRADIENTS.gold).toHaveLength(2);
    expect(GRADIENTS.success).toHaveLength(2);
    expect(GRADIENTS.crimson).toHaveLength(2);
  });

  it('exports glow colors as rgba strings', () => {
    expect(GLOW.crimson).toMatch(/^rgba\(/);
    expect(GLOW.gold).toMatch(/^rgba\(/);
    expect(GLOW.purple).toMatch(/^rgba\(/);
  });

  it('exports spacing scale', () => {
    expect(SPACING.xs).toBe(4);
    expect(SPACING.sm).toBe(8);
    expect(SPACING.md).toBe(16);
    expect(SPACING.lg).toBe(24);
    expect(SPACING.xl).toBe(32);
  });

  it('exports animation configs with required fields', () => {
    expect(ANIMATION_CONFIG.spring.damping).toBeDefined();
    expect(ANIMATION_CONFIG.spring.stiffness).toBeDefined();
    expect(ANIMATION_CONFIG.bounce.damping).toBeDefined();
    expect(ANIMATION_CONFIG.fadeIn.duration).toBeDefined();
  });
});

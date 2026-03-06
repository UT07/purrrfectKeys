/**
 * AbilityPreviewOverlay — SVG visual effect overlay for cat ability previews.
 *
 * Renders an absolutely-positioned SVG on top of a CatAvatar when the user
 * is browsing abilities in the Cat Studio / Gallery.  Each ability type maps
 * to a distinct looping effect so players immediately understand the power.
 *
 * All effects are opacity-primary animations (cheap on UI thread via
 * react-native-reanimated worklets).  Complex transforms are kept minimal.
 * The 100×100 viewBox mirrors the CatParts coordinate system.
 */

import type { ReactElement } from 'react';
import { useEffect, useMemo } from 'react';
import Svg, {
  G,
  Circle,
  Path,
  Ellipse,
  Polygon,
  Rect,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { GProps } from 'react-native-svg';

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedG — typed cast required because TS can't see the `style` prop added
// by createAnimatedComponent on a react-native-svg host component.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedG = Animated.createAnimatedComponent(G) as React.ComponentType<GProps & { style?: any; children?: React.ReactNode }>;

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface AbilityPreviewOverlayProps {
  /** The ability effect type being previewed */
  abilityType: string;
  /** Cat's accent color — effects are tinted to match the selected cat */
  catColor: string;
  /** Whether the preview is active */
  active: boolean;
  /** Size of the overlay in dp (same as cat avatar) */
  size: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color helpers
// ─────────────────────────────────────────────────────────────────────────────

function lighten(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r + (255 - r) * factor).toString(16).padStart(2, '0')}${Math.round(g + (255 - g) * factor).toString(16).padStart(2, '0')}${Math.round(b + (255 - b) * factor).toString(16).padStart(2, '0')}`;
}

function withAlpha(hex: string, alpha: number): string {
  // Returns 8-char hex (#RRGGBBAA) for SVG fill/stroke
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared animation hook — every effect fades in on mount using this
// ─────────────────────────────────────────────────────────────────────────────

function useFadeIn(): Animated.SharedValue<number> {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) });
    return () => {
      opacity.value = 0;
    };
  }, [opacity]);
  return opacity;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual effect components
// Each component is self-contained with its own animation loop.
// ─────────────────────────────────────────────────────────────────────────────

/** timing_window_multiplier — golden ring orbiting around the cat */
function TimingWindowEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const angle = useSharedValue(0);

  useEffect(() => {
    angle.value = withRepeat(
      withTiming(360, { duration: 2400, easing: Easing.linear }),
      -1,
      false,
    );
  }, [angle]);

  const orbitStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ rotate: `${angle.value}deg` }],
  }));

  const gold = '#FFD700';
  const goldDim = withAlpha(gold, 0.35);
  // Tint the track ring using the cat's accent color for a personalised feel
  const accentDim = withAlpha(color, 0.20);

  return (
    <AnimatedG style={orbitStyle}>
      {/* Outer accent ring — cat-colored halo */}
      <Circle cx="50" cy="50" r="43" stroke={accentDim} strokeWidth="1.5" fill="none" />
      {/* Track ring */}
      <Circle cx="50" cy="50" r="40" stroke={goldDim} strokeWidth="1" fill="none" />
      {/* Bright orbiting dot */}
      <Circle cx="50" cy="10" r="3.5" fill={gold} opacity={0.9} />
      {/* Trailing glow dots — fading arc */}
      <Circle cx="58" cy="11" r="2.5" fill={gold} opacity={0.55} />
      <Circle cx="65" cy="15" r="1.8" fill={gold} opacity={0.30} />
      <Circle cx="71" cy="21" r="1.2" fill={gold} opacity={0.15} />
    </AnimatedG>
  );
}

/** combo_shield — translucent shield shimmer */
function ComboShieldEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const shimmer = useSharedValue(0.25);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [shimmer]);

  const shieldStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * shimmer.value,
  }));

  const shieldColor = lighten(color, 0.5);

  return (
    <AnimatedG style={shieldStyle}>
      {/* Shield body — pointed bottom kite shape */}
      <Path
        d="M 50 12 L 75 28 L 75 52 C 75 68 50 80 50 80 C 50 80 25 68 25 52 L 25 28 Z"
        fill={shieldColor}
        stroke={lighten(color, 0.7)}
        strokeWidth="1.5"
      />
      {/* Inner highlight stripe */}
      <Path
        d="M 44 22 L 56 22 L 56 60 C 56 64 50 70 50 70 C 50 70 44 64 44 60 Z"
        fill="#FFFFFF"
        opacity={0.25}
      />
    </AnimatedG>
  );
}

/** score_boost — three star sparkles rising upward */
function ScoreBoostEffect({ color: _color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  // Three independent phase offsets so the stars rise in a staggered cascade
  const rise0 = useSharedValue(0);
  const rise1 = useSharedValue(0);
  const rise2 = useSharedValue(0);
  const op0 = useSharedValue(0);
  const op1 = useSharedValue(0);
  const op2 = useSharedValue(0);

  useEffect(() => {
    const dur = 1600;
    const delay = (ms: number): Promise<void> =>
      new Promise(resolve => setTimeout(resolve, ms));

    function loop0(): void {
      op0.value = withSequence(
        withTiming(0.9, { duration: dur * 0.4 }),
        withTiming(0, { duration: dur * 0.6 }),
      );
      rise0.value = withSequence(
        withTiming(-22, { duration: dur, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 0 }),
      );
      setTimeout(loop0, dur + 200);
    }
    async function loop1(): Promise<void> {
      await delay(550);
      function inner(): void {
        op1.value = withSequence(
          withTiming(0.7, { duration: dur * 0.4 }),
          withTiming(0, { duration: dur * 0.6 }),
        );
        rise1.value = withSequence(
          withTiming(-18, { duration: dur, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 0 }),
        );
        setTimeout(inner, dur + 200);
      }
      inner();
    }
    async function loop2(): Promise<void> {
      await delay(1100);
      function inner(): void {
        op2.value = withSequence(
          withTiming(0.8, { duration: dur * 0.4 }),
          withTiming(0, { duration: dur * 0.6 }),
        );
        rise2.value = withSequence(
          withTiming(-20, { duration: dur, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 0 }),
        );
        setTimeout(inner, dur + 200);
      }
      inner();
    }
    loop0();
    void loop1();
    void loop2();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const star0Style = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * op0.value,
    transform: [{ translateY: rise0.value }],
  }));
  const star1Style = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * op1.value,
    transform: [{ translateY: rise1.value }],
  }));
  const star2Style = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * op2.value,
    transform: [{ translateY: rise2.value }],
  }));

  const starColor = '#FFD700';

  function StarShape({ cx, cy, r }: { cx: number; cy: number; r: number }): ReactElement {
    // 5-pointed star path centred on (cx, cy)
    const pts: string[] = [];
    for (let i = 0; i < 5; i++) {
      const outer = { x: cx + r * Math.cos((i * 4 * Math.PI) / 5 - Math.PI / 2), y: cy + r * Math.sin((i * 4 * Math.PI) / 5 - Math.PI / 2) };
      const inner = { x: cx + (r * 0.4) * Math.cos(((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2), y: cy + (r * 0.4) * Math.sin(((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2) };
      pts.push(`${outer.x},${outer.y}`, `${inner.x},${inner.y}`);
    }
    return <Polygon points={pts.join(' ')} fill={starColor} />;
  }

  return (
    <>
      <AnimatedG style={star0Style}><StarShape cx={42} cy={68} r={6} /></AnimatedG>
      <AnimatedG style={star1Style}><StarShape cx={50} cy={72} r={5} /></AnimatedG>
      <AnimatedG style={star2Style}><StarShape cx={58} cy={68} r={5.5} /></AnimatedG>
    </>
  );
}

/** xp_multiplier — purple energy ring pulsing outward */
function XpMultiplierEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const scale = useSharedValue(0.7);
  const ringOpacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(0.7, { duration: 0 }),
      ),
      -1,
      false,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1100, easing: Easing.out(Easing.ease) }),
        withTiming(0.7, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [scale, ringOpacity]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * ringOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  const purple = '#9B59B6';
  const brightPurple = lighten(color, 0.3);

  return (
    <AnimatedG style={ringStyle}>
      <Circle cx="50" cy="50" r="36" stroke={purple} strokeWidth="2.5" fill="none" />
      <Circle cx="50" cy="50" r="30" stroke={brightPurple} strokeWidth="1" fill="none" opacity={0.5} />
    </AnimatedG>
  );
}

/** streak_saver — flame particles at bottom */
function StreakSaverEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const flicker = useSharedValue(1);
  const rise = useSharedValue(0);

  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 220, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 220, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.80, { duration: 180, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 180, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    rise.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [flicker, rise]);

  const flameStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * flicker.value,
    transform: [{ translateY: rise.value }],
  }));

  const orange = '#FF6B2B';
  const yellow = '#FFD93D';

  return (
    <AnimatedG style={flameStyle}>
      {/* Left flame */}
      <Path d="M 36 88 C 36 78 40 74 38 68 C 42 72 43 80 42 88 Z" fill={orange} opacity={0.85} />
      {/* Centre flame (taller) */}
      <Path d="M 50 90 C 50 75 55 68 52 58 C 57 64 58 76 57 90 Z" fill={orange} />
      <Path d="M 50 90 C 50 78 53 72 51 64 C 54 68 55 78 54 90 Z" fill={yellow} opacity={0.7} />
      {/* Right flame */}
      <Path d="M 62 88 C 62 78 58 74 60 68 C 56 72 55 80 56 88 Z" fill={orange} opacity={0.85} />
      {/* Ember glow base */}
      <Ellipse cx="50" cy="89" rx="14" ry="3" fill={lighten(color, 0.4)} opacity={0.35} />
    </AnimatedG>
  );
}

/** gem_magnet — three small gem shapes orbiting */
function GemMagnetEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const angle = useSharedValue(0);

  useEffect(() => {
    angle.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [angle]);

  const orbitStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ rotate: `${angle.value}deg` }],
  }));

  // Three gems at 0°, 120°, 240° on a radius-36 orbit around (50,50)
  function GemAt({ angleDeg }: { angleDeg: number }): ReactElement {
    const rad = (angleDeg * Math.PI) / 180;
    const cx = 50 + 32 * Math.cos(rad);
    const cy = 50 + 32 * Math.sin(rad);
    // Simple diamond shape
    return (
      <Polygon
        points={`${cx},${cy - 5} ${cx + 3.5},${cy} ${cx},${cy + 5} ${cx - 3.5},${cy}`}
        fill={lighten(color, 0.45)}
        stroke={lighten(color, 0.7)}
        strokeWidth="0.5"
      />
    );
  }

  return (
    <AnimatedG style={orbitStyle}>
      <GemAt angleDeg={0} />
      <GemAt angleDeg={120} />
      <GemAt angleDeg={240} />
    </AnimatedG>
  );
}

/** extra_retries — heart floating up */
function ExtraRetriesEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const rise = useSharedValue(0);
  const heartOpacity = useSharedValue(0.9);
  const scaleVal = useSharedValue(1);

  useEffect(() => {
    rise.value = withRepeat(
      withSequence(
        withTiming(-28, { duration: 1500, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
    heartOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1500, easing: Easing.in(Easing.ease) }),
        withTiming(0.9, { duration: 0 }),
      ),
      -1,
      false,
    );
    scaleVal.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 400, easing: Easing.out(Easing.ease) }),
        withTiming(0.9, { duration: 400, easing: Easing.in(Easing.ease) }),
        withTiming(1.0, { duration: 300 }),
      ),
      -1,
      false,
    );
  }, [rise, heartOpacity, scaleVal]);

  const heartStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * heartOpacity.value,
    transform: [{ translateY: rise.value }, { scale: scaleVal.value }],
  }));

  const red = '#FF4D6D';
  // Small accent glow dot below the heart, tinted to cat's color
  const accentGlow = withAlpha(color, 0.30);

  return (
    <AnimatedG style={heartStyle}>
      {/* Soft cat-colored radial glow behind the heart */}
      <Circle cx="50" cy="62" r="14" fill={accentGlow} />
      {/* Heart shape using two arcs */}
      <Path
        d="M 50 72 C 50 72 35 62 35 53 C 35 46 42 43 50 50 C 58 43 65 46 65 53 C 65 62 50 72 50 72 Z"
        fill={red}
        opacity={0.9}
      />
      {/* Highlight shine */}
      <Ellipse cx="44" cy="51" rx="4" ry="2.5" fill="#FFFFFF" opacity={0.35} />
    </AnimatedG>
  );
}

/** ghost_notes_extended — semi-transparent wash fading in/out */
function GhostNotesEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const wash = useSharedValue(0.12);

  useEffect(() => {
    wash.value = withRepeat(
      withSequence(
        withTiming(0.30, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.10, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [wash]);

  const washStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * wash.value,
  }));

  const ghostColor = lighten(color, 0.6);

  return (
    <AnimatedG style={washStyle}>
      {/* Full-oval ghost wash covering the cat silhouette area */}
      <Ellipse cx="50" cy="50" rx="38" ry="44" fill={ghostColor} />
      {/* Ghost note symbols at shoulders */}
      <Path d="M 24 38 Q 21 34 24 30 Q 27 26 30 30 L 30 40 Q 27 40 24 38 Z" fill={ghostColor} opacity={0.6} />
      <Path d="M 76 38 Q 79 34 76 30 Q 73 26 70 30 L 70 40 Q 73 40 76 38 Z" fill={ghostColor} opacity={0.6} />
    </AnimatedG>
  );
}

/** daily_xp_boost — sunrise glow arc behind cat */
function DailyXpBoostEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const glow = useSharedValue(0.4);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(0.75, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * glow.value,
  }));

  const sunYellow = '#FFE566';
  const sunOrange = lighten(color, 0.3);

  return (
    <AnimatedG style={glowStyle}>
      {/* Large arc behind cat — sunrise semicircle */}
      <Path
        d="M 8 65 A 42 42 0 0 1 92 65 Z"
        fill={sunYellow}
        opacity={0.35}
      />
      {/* Radial rays emanating outward */}
      <Path d="M 50 20 L 50 8" stroke={sunOrange} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M 50 20 L 42 10" stroke={sunOrange} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M 50 20 L 58 10" stroke={sunOrange} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M 50 20 L 35 14" stroke={sunOrange} strokeWidth="1" strokeLinecap="round" />
      <Path d="M 50 20 L 65 14" stroke={sunOrange} strokeWidth="1" strokeLinecap="round" />
    </AnimatedG>
  );
}

/** note_preview — musical note symbols floating above */
function NotePreviewEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const bob = useSharedValue(0);
  const opacity1 = useSharedValue(0.85);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    opacity1.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.85, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [bob, opacity1]);

  const noteStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * opacity1.value,
    transform: [{ translateY: bob.value }],
  }));

  const noteColor = lighten(color, 0.4);

  // Simple quarter-note shape: filled oval + stem
  function QuarterNote({ cx, cy, scale: s = 1 }: { cx: number; cy: number; scale?: number }): ReactElement {
    return (
      <G>
        <Ellipse cx={cx} cy={cy} rx={4 * s} ry={3 * s} fill={noteColor} />
        <Path
          d={`M ${cx + 4 * s} ${cy} L ${cx + 4 * s} ${cy - 10 * s}`}
          stroke={noteColor}
          strokeWidth={1.5 * s}
          strokeLinecap="round"
        />
      </G>
    );
  }

  return (
    <AnimatedG style={noteStyle}>
      <QuarterNote cx={36} cy={18} scale={0.9} />
      <QuarterNote cx={50} cy={12} scale={1.0} />
      <QuarterNote cx={64} cy={16} scale={0.85} />
    </AnimatedG>
  );
}

/** perfect_shield — diamond facet reflections */
function PerfectShieldEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const shimmer = useSharedValue(0.2);
  const rotate = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    rotate.value = withRepeat(
      withTiming(360, { duration: 5000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [shimmer, rotate]);

  const diamondStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * shimmer.value,
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  const diamondColor = lighten(color, 0.55);
  const white = '#FFFFFF';

  return (
    <AnimatedG style={diamondStyle}>
      {/* Four diamond facet shapes at compass points */}
      <Polygon points="50,8 57,18 50,28 43,18" fill={diamondColor} opacity={0.9} />
      <Polygon points="72,30 82,37 72,44 62,37" fill={diamondColor} opacity={0.7} />
      <Polygon points="50,72 57,82 50,92 43,82" fill={diamondColor} opacity={0.8} />
      <Polygon points="28,30 38,37 28,44 18,37" fill={diamondColor} opacity={0.7} />
      {/* Central white flash */}
      <Circle cx="50" cy="50" r="4" fill={white} opacity={0.6} />
    </AnimatedG>
  );
}

/** lucky_gems — clover leaves drifting */
function LuckyGemsEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const drift = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
    sway.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [drift, sway]);

  const cloverStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * 0.85,
    transform: [{ translateY: drift.value }, { translateX: sway.value }],
  }));

  const green = '#4CAF50';
  const brightGreen = lighten(green, 0.3);
  // Sprinkle of gem-sparkle dots using the cat's accent color
  const sparkle = withAlpha(lighten(color, 0.55), 0.70);

  // Minimal clover: 4 circles + stem
  function Clover({ cx, cy, r }: { cx: number; cy: number; r: number }): ReactElement {
    return (
      <G>
        <Circle cx={cx} cy={cy - r} r={r} fill={brightGreen} />
        <Circle cx={cx + r} cy={cy} r={r} fill={green} />
        <Circle cx={cx} cy={cy + r} r={r} fill={brightGreen} />
        <Circle cx={cx - r} cy={cy} r={r} fill={green} />
        <Path
          d={`M ${cx} ${cy + r} Q ${cx + 3} ${cy + r + 5} ${cx} ${cy + r + 9}`}
          stroke={green}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </G>
    );
  }

  return (
    <AnimatedG style={cloverStyle}>
      <Clover cx={34} cy={70} r={4} />
      <Clover cx={50} cy={76} r={3.5} />
      <Clover cx={66} cy={72} r={3.8} />
      {/* Cat-colored sparkle dots between clovers */}
      <Circle cx="42" cy="67" r="1.5" fill={sparkle} />
      <Circle cx="58" cy="65" r="1.2" fill={sparkle} />
      <Circle cx="50" cy="62" r="1.0" fill={sparkle} />
    </AnimatedG>
  );
}

/** tempo_reduction — slow metronome pendulum arcs */
function TempoReductionEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const swing = useSharedValue(-22);

  useEffect(() => {
    swing.value = withRepeat(
      withSequence(
        withTiming(22, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(-22, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [swing]);

  const pendulumStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ rotate: `${swing.value}deg` }],
  }));

  const blue = '#64B5F6';
  const dimBlue = withAlpha(blue, 0.45);
  // The pendulum bob gets a cat-colored tint for personalisation
  const bobColor = lighten(color, 0.35);

  return (
    <>
      {/* Static tick-mark arc */}
      <AnimatedG style={useAnimatedStyle(() => ({ opacity: containerOpacity.value }))}>
        <Path
          d="M 30 82 A 28 28 0 0 1 70 82"
          stroke={dimBlue}
          strokeWidth="1"
          fill="none"
          strokeDasharray="3 3"
        />
        {/* Metronome body */}
        <Path d="M 42 82 L 50 30 L 58 82 Z" fill="none" stroke={blue} strokeWidth="1" opacity={0.4} />
      </AnimatedG>
      {/* Pendulum bob — pivots around top of the body (50,30) */}
      <AnimatedG style={pendulumStyle}>
        {/* Translate origin to pivot point before rotating */}
        <G origin="50, 30">
          <Path d="M 50 30 L 50 72" stroke={blue} strokeWidth="1.5" strokeLinecap="round" />
          {/* Cat-tinted bob */}
          <Circle cx="50" cy="72" r="3.5" fill={bobColor} />
          <Circle cx="50" cy="72" r="2" fill={blue} opacity={0.6} />
        </G>
      </AnimatedG>
    </>
  );
}

/** hint_frequency_boost — lightbulb glow rays */
function HintFrequencyEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 600, easing: Easing.out(Easing.ease) }),
        withTiming(0.4, { duration: 800, easing: Easing.in(Easing.ease) }),
        withTiming(0.5, { duration: 200 }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const bulbStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * pulse.value,
  }));

  const yellow = '#FFE566';
  const warmYellow = lighten(color, 0.45);

  return (
    <AnimatedG style={bulbStyle}>
      {/* Bulb silhouette */}
      <Circle cx="50" cy="30" r="10" fill={yellow} opacity={0.85} />
      <Rect x="46" y="39" width="8" height="4" rx="1" fill={yellow} opacity={0.6} />
      {/* Glow rays */}
      <Path d="M 50 15 L 50 10" stroke={warmYellow} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M 61 19 L 64 15" stroke={warmYellow} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M 39 19 L 36 15" stroke={warmYellow} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M 65 30 L 70 30" stroke={warmYellow} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M 35 30 L 30 30" stroke={warmYellow} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M 62 41 L 66 45" stroke={warmYellow} strokeWidth="1.2" strokeLinecap="round" />
      <Path d="M 38 41 L 34 45" stroke={warmYellow} strokeWidth="1.2" strokeLinecap="round" />
    </AnimatedG>
  );
}

/** Fallback radial glow for unknown ability types */
function DefaultGlowEffect({ color }: { color: string }): ReactElement {
  const containerOpacity = useFadeIn();
  const glow = useSharedValue(0.3);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value * glow.value,
  }));

  const glowColor = lighten(color, 0.45);

  return (
    <AnimatedG style={glowStyle}>
      <Defs>
        <RadialGradient id="ability-default-glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={glowColor} stopOpacity="0.7" />
          <Stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="44" fill="url(#ability-default-glow)" />
    </AnimatedG>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect picker
// ─────────────────────────────────────────────────────────────────────────────

interface EffectProps {
  color: string;
}

function renderEffect(abilityType: string, color: string): ReactElement {
  const props: EffectProps = { color };

  switch (abilityType) {
    case 'timing_window_multiplier':
      return <TimingWindowEffect {...props} />;
    case 'combo_shield':
      return <ComboShieldEffect {...props} />;
    case 'score_boost':
      return <ScoreBoostEffect {...props} />;
    case 'xp_multiplier':
      return <XpMultiplierEffect {...props} />;
    case 'streak_saver':
      return <StreakSaverEffect {...props} />;
    case 'gem_magnet':
      return <GemMagnetEffect {...props} />;
    case 'extra_retries':
      return <ExtraRetriesEffect {...props} />;
    case 'ghost_notes_extended':
      return <GhostNotesEffect {...props} />;
    case 'daily_xp_boost':
      return <DailyXpBoostEffect {...props} />;
    case 'note_preview':
      return <NotePreviewEffect {...props} />;
    case 'perfect_shield':
      return <PerfectShieldEffect {...props} />;
    case 'lucky_gems':
      return <LuckyGemsEffect {...props} />;
    case 'tempo_reduction':
      return <TempoReductionEffect {...props} />;
    case 'hint_frequency_boost':
      return <HintFrequencyEffect {...props} />;
    default:
      return <DefaultGlowEffect {...props} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────────────

export function AbilityPreviewOverlay({
  abilityType,
  catColor,
  active,
  size,
}: AbilityPreviewOverlayProps): ReactElement | null {
  // Memoize the selected color so sub-components don't recreate closures
  // unnecessarily when the parent re-renders for unrelated reasons.
  const resolvedColor = useMemo(() => catColor || '#8B5CF6', [catColor]);

  if (!active) return null;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ position: 'absolute' }}
    >
      {renderEffect(abilityType, resolvedColor)}
    </Svg>
  );
}

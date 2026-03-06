/**
 * AbilityIcons — Illustrated SVG icons for cat ability types.
 *
 * Each icon fits in a 32×32 viewBox and uses react-native-svg.
 * Gradient IDs are prefixed with the ability type to prevent collisions
 * when multiple icons render on the same screen.
 *
 * When unlocked=false, the icon renders in greyscale (#666/#888/#AAA).
 * When unlocked=true, the icon renders with full color gradients.
 *
 * Usage:
 *   <AbilityIcon abilityType="combo_shield" unlocked={true} size={40} catColor="#4488FF" />
 */

import type { ReactElement } from 'react';
import Svg, { Circle, Path, Rect, Ellipse, Line, Defs, LinearGradient, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AbilityIconProps {
  /** The ability effect type */
  abilityType: string;
  /** Whether the ability is unlocked */
  unlocked: boolean;
  /** Pixel size (width = height) */
  size?: number;
  /** Cat's accent color — used for the outer glow ring when unlocked */
  catColor?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color palette for each ability type
// ─────────────────────────────────────────────────────────────────────────────

const ABILITY_COLORS: Record<string, { primary: string; secondary: string }> = {
  timing_window_multiplier: { primary: '#FFD700', secondary: '#FFA500' },
  combo_shield:             { primary: '#4488FF', secondary: '#C0C0C0' },
  score_boost:              { primary: '#FFD700', secondary: '#FFFFFF' },
  xp_multiplier:            { primary: '#9B59FF', secondary: '#5DADE2' },
  streak_saver:             { primary: '#FF6B35', secondary: '#FF4500' },
  gem_magnet:               { primary: '#00CED1', secondary: '#20B2AA' },
  extra_retries:            { primary: '#FF69B4', secondary: '#FF1493' },
  ghost_notes_extended:     { primary: '#B39DDB', secondary: '#9575CD' },
  daily_xp_boost:           { primary: '#FFD54F', secondary: '#FF8F00' },
  note_preview:             { primary: '#2ECC71', secondary: '#27AE60' },
  perfect_shield:           { primary: '#FFD700', secondary: '#E0E0E0' },
  lucky_gems:               { primary: '#2ECC71', secondary: '#FFD700' },
  tempo_reduction:          { primary: '#FF8A65', secondary: '#FF5722' },
  hint_frequency_boost:     { primary: '#FFC107', secondary: '#FF9800' },
};

const GREY_PALETTE = { primary: '#888888', secondary: '#AAAAAA', dark: '#666666', light: '#BBBBBB' };

/**
 * Returns the primary display color for a given ability type.
 * Falls back to a neutral gold for unknown types.
 */
export function getAbilityIconColor(abilityType: string): string {
  return ABILITY_COLORS[abilityType]?.primary ?? '#FFD700';
}

// ─────────────────────────────────────────────────────────────────────────────
// Gradient ID helpers — all IDs scoped to the ability type
// ─────────────────────────────────────────────────────────────────────────────

function gid(abilityType: string, name: string): string {
  // Replace characters that are invalid in SVG ID strings
  const safe = abilityType.replace(/_/g, '-');
  return `ai-${safe}-${name}`;
}

function url(id: string): string {
  return `url(#${id})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual icon renderers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * timing_window_multiplier — Clock face with golden glow ring.
 * Concept: a clock whose face is wide and forgiving, ringed by warm gold.
 */
function IconTimingWindow({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const bgId  = gid(t, 'bg');
  const faceId = gid(t, 'face');
  const ringId = gid(t, 'ring');
  return (
    <>
      <Defs>
        <RadialGradient id={bgId} cx="50%" cy="40%" r="55%">
          <Stop offset="0%" stopColor={c.secondary} stopOpacity="0.9" />
          <Stop offset="100%" stopColor={c.primary} stopOpacity="0.3" />
        </RadialGradient>
        <RadialGradient id={faceId} cx="45%" cy="38%" r="55%">
          <Stop offset="0%" stopColor="#FFFDE7" />
          <Stop offset="100%" stopColor="#FFF8DC" />
        </RadialGradient>
        <LinearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={c.primary} />
          <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <Stop offset="100%" stopColor={c.secondary} />
        </LinearGradient>
      </Defs>
      {/* Outer glow ring */}
      <Circle cx="16" cy="16" r="14.5" fill="none" stroke={url(ringId)} strokeWidth="2.5" />
      {/* Clock body */}
      <Circle cx="16" cy="16" r="11" fill={url(faceId)} />
      {/* Clock hour markers */}
      <Line x1="16" y1="7"  x2="16" y2="9.5"  stroke={c.primary} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="16" y1="22.5" x2="16" y2="25" stroke={c.primary} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="7"  y1="16" x2="9.5" y2="16"  stroke={c.primary} strokeWidth="1.5" strokeLinecap="round" />
      <Line x1="22.5" y1="16" x2="25" y2="16" stroke={c.primary} strokeWidth="1.5" strokeLinecap="round" />
      {/* Minute hand (pointing to ~10 o'clock) */}
      <Line x1="16" y1="16" x2="12.5" y2="11.5" stroke={c.secondary} strokeWidth="1.8" strokeLinecap="round" />
      {/* Hour hand (pointing to ~2 o'clock) */}
      <Line x1="16" y1="16" x2="19.5" y2="13.5" stroke={c.primary} strokeWidth="2.2" strokeLinecap="round" />
      {/* Center dot */}
      <Circle cx="16" cy="16" r="1.5" fill={c.secondary} />
    </>
  );
}

/**
 * combo_shield — Shield shape with a musical note inside.
 * Concept: a protective ward that keeps the combo alive.
 */
function IconComboShield({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const bodyId = gid(t, 'body');
  const edgeId = gid(t, 'edge');
  return (
    <>
      <Defs>
        <LinearGradient id={bodyId} x1="30%" y1="0%" x2="70%" y2="100%">
          <Stop offset="0%" stopColor={c.primary} />
          <Stop offset="100%" stopColor="#1A3A8A" />
        </LinearGradient>
        <LinearGradient id={edgeId} x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={c.secondary} />
          <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <Stop offset="100%" stopColor={c.secondary} />
        </LinearGradient>
      </Defs>
      {/* Shield silhouette */}
      <Path
        d="M 16 2.5 L 28 7 L 28 16 C 28 22 22.5 27.5 16 30 C 9.5 27.5 4 22 4 16 L 4 7 Z"
        fill={url(bodyId)}
      />
      {/* Shield highlight border */}
      <Path
        d="M 16 2.5 L 28 7 L 28 16 C 28 22 22.5 27.5 16 30"
        fill="none"
        stroke={url(edgeId)}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Inner shield bevel */}
      <Path
        d="M 16 5.5 L 25.5 9 L 25.5 16 C 25.5 21 21 25.5 16 27.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="0.8"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
      {/* Musical quarter note */}
      <Ellipse cx="14.5" cy="20" rx="2.8" ry="2" fill="#FFFFFF" fillOpacity="0.95" transform="rotate(-20, 14.5, 20)" />
      <Line x1="17" y1="18.5" x2="17" y2="11.5" stroke="#FFFFFF" strokeWidth="1.6" strokeOpacity="0.95" strokeLinecap="round" />
      {/* Note flag */}
      <Path d="M 17 11.5 C 20 12.5 20.5 14.5 18 15.5" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeOpacity="0.95" strokeLinecap="round" />
    </>
  );
}

/**
 * score_boost — Star with an upward arrow emerging from it.
 * Concept: your score soaring skyward.
 */
function IconScoreBoost({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const starId  = gid(t, 'star');
  const arrowId = gid(t, 'arrow');
  return (
    <>
      <Defs>
        <LinearGradient id={starId} x1="30%" y1="0%" x2="70%" y2="100%">
          <Stop offset="0%" stopColor="#FFFDE7" />
          <Stop offset="100%" stopColor={c.primary} />
        </LinearGradient>
        <LinearGradient id={arrowId} x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor={c.primary} />
        </LinearGradient>
      </Defs>
      {/* 5-point star */}
      <Path
        d="M 16 3 L 18.5 10.5 L 26.5 10.5 L 20.2 15.2 L 22.5 23 L 16 18.5 L 9.5 23 L 11.8 15.2 L 5.5 10.5 L 13.5 10.5 Z"
        fill={url(starId)}
        stroke={c.secondary}
        strokeWidth="0.5"
      />
      {/* Arrow shaft */}
      <Line x1="16" y1="22.5" x2="16" y2="30" stroke={url(arrowId)} strokeWidth="2.2" strokeLinecap="round" />
      {/* Arrow head */}
      <Path d="M 13 25.5 L 16 22.5 L 19 25.5" fill="none" stroke={url(arrowId)} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Star center shine */}
      <Circle cx="16" cy="13.5" r="2" fill="#FFFFFF" fillOpacity="0.5" />
    </>
  );
}

/**
 * xp_multiplier — Lightning bolt with "2x" label.
 * Concept: electric power surging through your XP gain.
 */
function IconXpMultiplier({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const boltId  = gid(t, 'bolt');
  const glowId  = gid(t, 'glow');
  return (
    <>
      <Defs>
        <LinearGradient id={boltId} x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor={c.secondary} />
          <Stop offset="100%" stopColor={c.primary} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={c.primary} stopOpacity="0.5" />
          <Stop offset="100%" stopColor={c.primary} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Background glow halo */}
      <Circle cx="16" cy="16" r="14" fill={url(glowId)} />
      {/* Lightning bolt */}
      <Path
        d="M 19 2 L 11 15 L 16 15 L 13 30 L 22 14 L 17 14 Z"
        fill={url(boltId)}
        stroke="#FFFFFF"
        strokeWidth="0.6"
        strokeOpacity="0.7"
      />
      {/* Inner bolt highlight */}
      <Path
        d="M 18.5 4.5 L 13.5 14.5 L 17 14.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeOpacity="0.5"
        strokeLinecap="round"
      />
      {/* "2x" label */}
      <SvgText
        x="22"
        y="12"
        fontSize="6"
        fontWeight="bold"
        fill="#FFFFFF"
        textAnchor="middle"
        fillOpacity="0.95"
      >
        2x
      </SvgText>
    </>
  );
}

/**
 * streak_saver — Flame with a small shield badge overlaid on the lower-right.
 * Concept: your streak fire is protected by a guardian shield.
 */
function IconStreakSaver({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const flameId  = gid(t, 'flame');
  const coreId   = gid(t, 'core');
  const shieldId = gid(t, 'shield');
  return (
    <>
      <Defs>
        <LinearGradient id={flameId} x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#FFEC80" />
          <Stop offset="60%" stopColor={c.primary} />
          <Stop offset="100%" stopColor={c.secondary} />
        </LinearGradient>
        <RadialGradient id={coreId} cx="50%" cy="70%" r="40%">
          <Stop offset="0%" stopColor="#FFEC80" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#FFEC80" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={shieldId} x1="30%" y1="0%" x2="70%" y2="100%">
          <Stop offset="0%" stopColor="#78C8FF" />
          <Stop offset="100%" stopColor="#1A60CC" />
        </LinearGradient>
      </Defs>
      {/* Flame outer */}
      <Path
        d="M 16 3 C 16 3 22 9 22 15 C 22 19.5 20 22 18.5 23.5 C 19 21 18 19.5 16 19.5 C 14 19.5 13 21 13.5 23.5 C 12 22 10 19.5 10 15 C 10 9 16 3 16 3 Z"
        fill={url(flameId)}
      />
      {/* Inner glow core */}
      <Path
        d="M 16 10 C 16 10 20 14 20 17.5 C 20 19.8 18.5 21.5 17.5 22.5 C 17.8 20.5 17 19.5 16 19.5 C 15 19.5 14.2 20.5 14.5 22.5 C 13.5 21.5 12 19.8 12 17.5 C 12 14 16 10 16 10 Z"
        fill={url(coreId)}
      />
      {/* Shield badge bottom-right */}
      <Path
        d="M 21 21 L 29 23.5 L 29 27 C 29 29.5 25.5 31.5 25 32 C 24.5 31.5 21 29.5 21 27 Z"
        fill={url(shieldId)}
      />
      {/* Checkmark on shield */}
      <Path
        d="M 22.8 27 L 24.5 28.8 L 27.5 25"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

/**
 * gem_magnet — Gem with curved magnetic pull-lines arcing around it.
 * Concept: gems are drawn to you like iron filings to a magnet.
 */
function IconGemMagnet({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const gemId  = gid(t, 'gem');
  const faceId = gid(t, 'face');
  return (
    <>
      <Defs>
        <LinearGradient id={gemId} x1="30%" y1="0%" x2="70%" y2="100%">
          <Stop offset="0%" stopColor="#E0FFFF" />
          <Stop offset="40%" stopColor={c.primary} />
          <Stop offset="100%" stopColor={c.secondary} />
        </LinearGradient>
        <LinearGradient id={faceId} x1="20%" y1="10%" x2="80%" y2="90%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
          <Stop offset="100%" stopColor={c.primary} stopOpacity="0.1" />
        </LinearGradient>
      </Defs>
      {/* Pull-arc lines — left side */}
      <Path d="M 6 10 C 3 13 3 19 6 22" fill="none" stroke={c.primary} strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.8" />
      <Path d="M 4 8 C 0 13 0 19 4 24" fill="none" stroke={c.secondary} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5" />
      {/* Pull-arc lines — right side */}
      <Path d="M 26 10 C 29 13 29 19 26 22" fill="none" stroke={c.primary} strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.8" />
      <Path d="M 28 8 C 32 13 32 19 28 24" fill="none" stroke={c.secondary} strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5" />
      {/* Gem body — diamond cut */}
      <Path
        d="M 16 4 L 22 10 L 16 28 L 10 10 Z"
        fill={url(gemId)}
        stroke={c.secondary}
        strokeWidth="0.5"
      />
      {/* Gem top facet */}
      <Path d="M 10 10 L 16 4 L 22 10 L 16 12 Z" fill={url(faceId)} />
      {/* Gem center shine */}
      <Path d="M 14 9 L 16 6.5 L 18 9" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.9" strokeLinecap="round" />
    </>
  );
}

/**
 * extra_retries — Heart shape with a "+" symbol.
 * Concept: extra lives / another chance.
 */
function IconExtraRetries({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const heartId = gid(t, 'heart');
  const shineId = gid(t, 'shine');
  return (
    <>
      <Defs>
        <RadialGradient id={heartId} cx="45%" cy="35%" r="60%">
          <Stop offset="0%" stopColor="#FFB3D1" />
          <Stop offset="60%" stopColor={c.primary} />
          <Stop offset="100%" stopColor={c.secondary} />
        </RadialGradient>
        <RadialGradient id={shineId} cx="40%" cy="35%" r="30%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Heart path */}
      <Path
        d="M 16 28 C 16 28 3 20 3 12 C 3 7.5 6.5 4 10.5 4 C 13 4 15 5.5 16 7 C 17 5.5 19 4 21.5 4 C 25.5 4 29 7.5 29 12 C 29 20 16 28 16 28 Z"
        fill={url(heartId)}
        stroke={c.secondary}
        strokeWidth="0.5"
      />
      {/* Heart shine */}
      <Path
        d="M 16 28 C 16 28 3 20 3 12"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="0.8"
        strokeOpacity="0.3"
        strokeLinecap="round"
      />
      <Circle cx="11.5" cy="11.5" r="4" fill={url(shineId)} />
      {/* Plus sign */}
      <Line x1="16" y1="11" x2="16" y2="19" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="12" y1="15" x2="20" y2="15" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}

/**
 * ghost_notes_extended — Translucent ghost note shape with a trailing ribbon.
 * Concept: phantom notes drifting with ethereal grace.
 */
function IconGhostNotesExtended({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const bodyId  = gid(t, 'body');
  const trailId = gid(t, 'trail');
  return (
    <>
      <Defs>
        <RadialGradient id={bodyId} cx="45%" cy="38%" r="55%">
          <Stop offset="0%" stopColor="#EDE7F6" stopOpacity="0.95" />
          <Stop offset="60%" stopColor={c.primary} stopOpacity="0.85" />
          <Stop offset="100%" stopColor={c.secondary} stopOpacity="0.9" />
        </RadialGradient>
        <LinearGradient id={trailId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={c.secondary} stopOpacity="0.9" />
          <Stop offset="100%" stopColor={c.secondary} stopOpacity="0.1" />
        </LinearGradient>
      </Defs>
      {/* Ghost silhouette */}
      <Path
        d="M 16 4 C 10 4 7 8 7 13 C 7 19 7 22 9 24 C 9 24 10 22 11 23 C 12 24 12 26 13 25 C 14 24 14 22 16 23 C 18 22 18 24 19 25 C 20 26 20 24 21 23 C 22 22 23 24 23 24 C 25 22 25 19 25 13 C 25 8 22 4 16 4 Z"
        fill={url(bodyId)}
      />
      {/* Ghost eyes */}
      <Circle cx="13" cy="13" r="2" fill={c.secondary} fillOpacity="0.9" />
      <Circle cx="19" cy="13" r="2" fill={c.secondary} fillOpacity="0.9" />
      <Circle cx="13.5" cy="12.5" r="0.7" fill="#FFFFFF" />
      <Circle cx="19.5" cy="12.5" r="0.7" fill="#FFFFFF" />
      {/* Floating music note to the right */}
      <Ellipse cx="27" cy="22" rx="2" ry="1.4" fill={c.primary} fillOpacity="0.8" transform="rotate(-15, 27, 22)" />
      <Line x1="28.8" y1="21" x2="28.8" y2="16.5" stroke={c.primary} strokeWidth="1.3" strokeOpacity="0.8" strokeLinecap="round" />
      {/* Trail behind ghost */}
      <Path d="M 4 20 C 6 18 8 20 10 18" fill="none" stroke={url(trailId)} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M 2 25 C 4 23 7 25 9 23" fill="none" stroke={url(trailId)} strokeWidth="1" strokeLinecap="round" />
    </>
  );
}

/**
 * daily_xp_boost — Stylised sun with an upward rising arrow.
 * Concept: every new day your XP climbs higher.
 */
function IconDailyXpBoost({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const sunId   = gid(t, 'sun');
  const arrowId = gid(t, 'arrow');
  return (
    <>
      <Defs>
        <RadialGradient id={sunId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFDE7" />
          <Stop offset="50%" stopColor={c.primary} />
          <Stop offset="100%" stopColor={c.secondary} />
        </RadialGradient>
        <LinearGradient id={arrowId} x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor={c.secondary} />
        </LinearGradient>
      </Defs>
      {/* Sun rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 16 + Math.cos(rad) * 10;
        const y1 = 14 + Math.sin(rad) * 10;
        const x2 = 16 + Math.cos(rad) * 13.5;
        const y2 = 14 + Math.sin(rad) * 13.5;
        return (
          <Line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.primary} strokeWidth="1.8" strokeLinecap="round" />
        );
      })}
      {/* Sun body */}
      <Circle cx="16" cy="14" r="8.5" fill={url(sunId)} />
      <Circle cx="13.5" cy="11.5" r="2.5" fill="#FFFFFF" fillOpacity="0.4" />
      {/* Rising arrow below sun */}
      <Line x1="16" y1="24" x2="16" y2="31" stroke={url(arrowId)} strokeWidth="2" strokeLinecap="round" />
      <Path d="M 13 27 L 16 24 L 19 27" fill="none" stroke={url(arrowId)} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

/**
 * note_preview — Open eye with music staff lines visible inside the iris.
 * Concept: seeing the upcoming notes before they arrive.
 */
function IconNotePreview({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const irisId  = gid(t, 'iris');
  const glowId  = gid(t, 'glow');
  return (
    <>
      <Defs>
        <RadialGradient id={irisId} cx="45%" cy="40%" r="55%">
          <Stop offset="0%" stopColor="#AAFFD8" />
          <Stop offset="50%" stopColor={c.primary} />
          <Stop offset="100%" stopColor={c.secondary} />
        </RadialGradient>
        <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={c.primary} stopOpacity="0.25" />
          <Stop offset="100%" stopColor={c.primary} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Glow behind eye */}
      <Ellipse cx="16" cy="16" rx="14" ry="10" fill={url(glowId)} />
      {/* Upper eyelid */}
      <Path d="M 3 16 C 7 8 25 8 29 16" fill="none" stroke={c.primary} strokeWidth="2" strokeLinecap="round" />
      {/* Lower eyelid */}
      <Path d="M 3 16 C 7 22 25 22 29 16" fill="none" stroke={c.primary} strokeWidth="1.5" strokeLinecap="round" />
      {/* White of eye */}
      <Path d="M 3 16 C 7 8 25 8 29 16 C 25 22 7 22 3 16 Z" fill="#FFFFFF" fillOpacity="0.95" />
      {/* Iris */}
      <Circle cx="16" cy="16" r="6.5" fill={url(irisId)} />
      {/* Pupil */}
      <Circle cx="16" cy="16" r="3" fill="#1A2A1A" />
      {/* Eye shine */}
      <Circle cx="14" cy="14" r="1.5" fill="#FFFFFF" fillOpacity="0.9" />
      <Circle cx="17.5" cy="17.5" r="0.8" fill="#FFFFFF" fillOpacity="0.6" />
      {/* Staff lines inside iris hint */}
      <Line x1="13" y1="15.5" x2="19" y2="15.5" stroke="#FFFFFF" strokeWidth="0.7" strokeOpacity="0.6" />
      <Line x1="13" y1="17" x2="19" y2="17" stroke="#FFFFFF" strokeWidth="0.7" strokeOpacity="0.6" />
    </>
  );
}

/**
 * perfect_shield — Diamond-cut shield with a star in the centre.
 * Concept: near-perfect notes are treated as perfect.
 */
function IconPerfectShield({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const bodyId = gid(t, 'body');
  const gemId  = gid(t, 'gem');
  return (
    <>
      <Defs>
        <LinearGradient id={bodyId} x1="20%" y1="0%" x2="80%" y2="100%">
          <Stop offset="0%" stopColor="#FFFDE7" />
          <Stop offset="50%" stopColor={c.primary} />
          <Stop offset="100%" stopColor="#B8860B" />
        </LinearGradient>
        <RadialGradient id={gemId} cx="40%" cy="35%" r="55%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <Stop offset="100%" stopColor={c.secondary} stopOpacity="0.6" />
        </RadialGradient>
      </Defs>
      {/* Diamond shield outline */}
      <Path
        d="M 16 2 L 30 10 L 30 19 C 30 25.5 24 30 16 32 C 8 30 2 25.5 2 19 L 2 10 Z"
        fill={url(bodyId)}
        stroke="#DAA520"
        strokeWidth="1"
      />
      {/* Diamond cut facets on shield */}
      <Path d="M 16 2 L 30 10 L 16 14 L 2 10 Z" fill="#FFFFFF" fillOpacity="0.25" />
      <Line x1="2" y1="10" x2="30" y2="10" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.4" />
      <Line x1="16" y1="2" x2="16" y2="32" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.2" />
      {/* Centre star */}
      <Path
        d="M 16 12 L 17.4 16.4 L 22 16.4 L 18.3 19 L 19.7 23.4 L 16 20.8 L 12.3 23.4 L 13.7 19 L 10 16.4 L 14.6 16.4 Z"
        fill={url(gemId)}
      />
    </>
  );
}

/**
 * lucky_gems — Four-leaf clover with a gem on one petal.
 * Concept: luck of the Irish, but for gems.
 */
function IconLuckyGems({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const cloverBodyId = gid(t, 'clover');
  const gemId        = gid(t, 'gem');
  return (
    <>
      <Defs>
        <RadialGradient id={cloverBodyId} cx="45%" cy="38%" r="55%">
          <Stop offset="0%" stopColor="#A8F0B8" />
          <Stop offset="100%" stopColor={c.primary} />
        </RadialGradient>
        <LinearGradient id={gemId} x1="20%" y1="0%" x2="80%" y2="100%">
          <Stop offset="0%" stopColor="#FFFDE7" />
          <Stop offset="50%" stopColor={c.secondary} />
          <Stop offset="100%" stopColor="#DAA520" />
        </LinearGradient>
      </Defs>
      {/* Stem */}
      <Path d="M 16 22 C 16 25 14 28 13 30" fill="none" stroke={c.primary} strokeWidth="2.2" strokeLinecap="round" />
      {/* Four petals (top, bottom, left, right) */}
      <Ellipse cx="16" cy="11" rx="4.5" ry="5.5" fill={url(cloverBodyId)} />
      <Ellipse cx="16" cy="21" rx="4.5" ry="5.5" fill={url(cloverBodyId)} />
      <Ellipse cx="11" cy="16" rx="5.5" ry="4.5" fill={url(cloverBodyId)} />
      <Ellipse cx="21" cy="16" rx="5.5" ry="4.5" fill={url(cloverBodyId)} />
      {/* Petal vein lines */}
      <Line x1="16" y1="7" x2="16" y2="15" stroke="#27AE60" strokeWidth="0.8" strokeOpacity="0.6" />
      <Line x1="7" y1="16" x2="15" y2="16" stroke="#27AE60" strokeWidth="0.8" strokeOpacity="0.6" />
      {/* Small gem overlay on top-right petal */}
      <Path
        d="M 19.5 9.5 L 22 12.5 L 19.5 17.5 L 17 12.5 Z"
        fill={url(gemId)}
        stroke="#DAA520"
        strokeWidth="0.5"
      />
      <Path d="M 17 12.5 L 19.5 9.5 L 22 12.5 L 19.5 11.5 Z" fill="#FFFFFF" fillOpacity="0.5" />
    </>
  );
}

/**
 * tempo_reduction — Metronome pendulum tilted to the slow/left position.
 * Concept: the beat is slowed so you can keep up.
 */
function IconTempoReduction({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const bodyId = gid(t, 'body');
  const armId  = gid(t, 'arm');
  return (
    <>
      <Defs>
        <LinearGradient id={bodyId} x1="30%" y1="0%" x2="70%" y2="100%">
          <Stop offset="0%" stopColor="#FFF3E0" />
          <Stop offset="100%" stopColor={c.secondary} />
        </LinearGradient>
        <LinearGradient id={armId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor={c.primary} />
        </LinearGradient>
      </Defs>
      {/* Metronome body (trapezoid shape) */}
      <Path
        d="M 10 29 L 8 10 L 16 4 L 24 10 L 22 29 Z"
        fill={url(bodyId)}
        stroke={c.primary}
        strokeWidth="1"
      />
      {/* Metronome face detail */}
      <Path d="M 11.5 27 L 10 13 L 16 8 L 22 13 L 20.5 27 Z" fill="#FFFFFF" fillOpacity="0.35" />
      {/* Center spine */}
      <Line x1="16" y1="8" x2="16" y2="26" stroke={c.secondary} strokeWidth="1" strokeOpacity="0.6" />
      {/* Pendulum arm — tilted left (slow position) */}
      <Line x1="16" y1="22" x2="9" y2="10" stroke={url(armId)} strokeWidth="2" strokeLinecap="round" />
      {/* Pendulum weight */}
      <Circle cx="9" cy="10" r="3" fill={c.primary} stroke="#FFFFFF" strokeWidth="0.8" />
      {/* Tempo tick marks on face */}
      <Line x1="13" y1="15" x2="14.5" y2="15" stroke={c.secondary} strokeWidth="0.9" strokeOpacity="0.7" strokeLinecap="round" />
      <Line x1="13" y1="18" x2="14.5" y2="18" stroke={c.secondary} strokeWidth="0.9" strokeOpacity="0.7" strokeLinecap="round" />
      <Line x1="13" y1="21" x2="14.5" y2="21" stroke={c.secondary} strokeWidth="0.9" strokeOpacity="0.7" strokeLinecap="round" />
      {/* Base */}
      <Rect x="9" y="27.5" width="14" height="3" rx="1.5" fill={c.primary} />
    </>
  );
}

/**
 * hint_frequency_boost — Glowing lightbulb with sparkle bursts.
 * Concept: ideas come faster, like a bulb that never dims.
 */
function IconHintFrequencyBoost({ c, t }: { c: typeof ABILITY_COLORS[string]; t: string }): ReactElement {
  const bulbId   = gid(t, 'bulb');
  const glowId   = gid(t, 'glow');
  const fillId   = gid(t, 'fill');
  return (
    <>
      <Defs>
        <RadialGradient id={bulbId} cx="45%" cy="38%" r="55%">
          <Stop offset="0%" stopColor="#FFFDE7" />
          <Stop offset="60%" stopColor={c.primary} />
          <Stop offset="100%" stopColor={c.secondary} />
        </RadialGradient>
        <RadialGradient id={glowId} cx="50%" cy="45%" r="50%">
          <Stop offset="0%" stopColor={c.primary} stopOpacity="0.45" />
          <Stop offset="100%" stopColor={c.primary} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={fillId} x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#FFFDE7" stopOpacity="0.9" />
          <Stop offset="100%" stopColor={c.primary} stopOpacity="0.7" />
        </LinearGradient>
      </Defs>
      {/* Background glow */}
      <Circle cx="16" cy="15" r="13" fill={url(glowId)} />
      {/* Bulb glass */}
      <Path
        d="M 16 4 C 10.5 4 6.5 8 6.5 13.5 C 6.5 17.5 8.5 20.5 12 22.5 L 12 26 L 20 26 L 20 22.5 C 23.5 20.5 25.5 17.5 25.5 13.5 C 25.5 8 22 4 16 4 Z"
        fill={url(bulbId)}
        stroke={c.secondary}
        strokeWidth="0.8"
      />
      {/* Filament reflection */}
      <Path d="M 13 13 C 14 11 16 10.5 17 12 C 18 13.5 17.5 16 16 17" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeOpacity="0.7" strokeLinecap="round" />
      {/* Horizontal bands (base threads) */}
      <Line x1="13" y1="24" x2="19" y2="24" stroke={c.secondary} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.9" />
      <Line x1="13" y1="26" x2="19" y2="26" stroke={c.secondary} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.9" />
      {/* Base cap */}
      <Rect x="12.5" y="26.5" width="7" height="3" rx="1" fill={c.secondary} />
      {/* Sparkle bursts */}
      {/* Top-left sparkle */}
      <Line x1="5" y1="5"  x2="7" y2="7"   stroke={c.primary} strokeWidth="1.3" strokeLinecap="round" />
      <Line x1="4" y1="7"  x2="6.5" y2="7"  stroke={c.primary} strokeWidth="1.3" strokeLinecap="round" />
      <Line x1="6" y1="4"  x2="6" y2="6.5"  stroke={c.primary} strokeWidth="1.3" strokeLinecap="round" />
      {/* Top-right sparkle */}
      <Line x1="27" y1="5"  x2="25" y2="7"   stroke={c.primary} strokeWidth="1.3" strokeLinecap="round" />
      <Line x1="28" y1="7"  x2="25.5" y2="7"  stroke={c.primary} strokeWidth="1.3" strokeLinecap="round" />
      <Line x1="26" y1="4"  x2="26" y2="6.5"  stroke={c.primary} strokeWidth="1.3" strokeLinecap="round" />
    </>
  );
}

/**
 * Fallback — generic circle with "?" for unknown ability types.
 */
function IconUnknown({ c }: { c: typeof ABILITY_COLORS[string] }): ReactElement {
  return (
    <>
      <Circle cx="16" cy="16" r="13" fill={c.primary} fillOpacity="0.7" stroke={c.secondary} strokeWidth="1.5" />
      <SvgText x="16" y="21" fontSize="14" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">?</SvgText>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Greyscale wrapper — desaturates all stops by mapping colorful IDs to grey
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a locked (greyscale) version of the colour pair.
 * All primary/secondary swapped for grey tones.
 */
function greyColors(): typeof ABILITY_COLORS[string] {
  return { primary: GREY_PALETTE.primary, secondary: GREY_PALETTE.secondary };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

const ICON_RENDERERS: Record<
  string,
  (props: { c: typeof ABILITY_COLORS[string]; t: string }) => ReactElement
> = {
  timing_window_multiplier: IconTimingWindow,
  combo_shield:             IconComboShield,
  score_boost:              IconScoreBoost,
  xp_multiplier:            IconXpMultiplier,
  streak_saver:             IconStreakSaver,
  gem_magnet:               IconGemMagnet,
  extra_retries:            IconExtraRetries,
  ghost_notes_extended:     IconGhostNotesExtended,
  daily_xp_boost:           IconDailyXpBoost,
  note_preview:             IconNotePreview,
  perfect_shield:           IconPerfectShield,
  lucky_gems:               IconLuckyGems,
  tempo_reduction:          IconTempoReduction,
  hint_frequency_boost:     IconHintFrequencyBoost,
};

export function AbilityIcon({ abilityType, unlocked, size = 32, catColor }: AbilityIconProps): ReactElement {
  const baseColors = ABILITY_COLORS[abilityType] ?? { primary: '#FFD700', secondary: '#FFA500' };
  const colors = unlocked ? baseColors : greyColors();

  const Renderer = ICON_RENDERERS[abilityType];

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      {/* Optional unlocked glow ring using catColor */}
      {unlocked && catColor != null && (
        <Circle
          cx="16"
          cy="16"
          r="15"
          fill="none"
          stroke={catColor}
          strokeWidth="1"
          strokeOpacity="0.5"
        />
      )}

      {Renderer != null
        ? <Renderer c={colors} t={abilityType} />
        : <IconUnknown c={colors} />
      }
    </Svg>
  );
}

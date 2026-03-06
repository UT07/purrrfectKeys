/**
 * CatParts — Composable SVG building blocks for unique cat avatars.
 *
 * All parts operate within a 100×100 viewBox coordinate system.
 * Anime chibi proportions: oversized head (r=32 at cy=35), tiny body (cy=80).
 * Body types, eye shapes, ear styles, and tails can be mixed/matched
 * via catProfiles.ts to give each cat a distinct silhouette.
 */

import type { ReactElement } from 'react';
import { G, Circle, Path, Ellipse, Line, Rect } from 'react-native-svg';
import type { MascotMood } from '../types';
import type { HairTuftType, PupilType } from './catProfiles';

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * factor).toString(16).padStart(2, '0')}${Math.round(g * factor).toString(16).padStart(2, '0')}${Math.round(b * factor).toString(16).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────
// Body types (chibi: tiny bodies tucked below oversized head at cy=80)
// ─────────────────────────────────────────────────

export type BodyType = 'slim' | 'standard' | 'round' | 'chonky';

export function CatBody({ type, color, gradientFill, bellyColor }: {
  type: BodyType; color: string; gradientFill?: string; bellyColor?: string;
}): ReactElement {
  const fill = gradientFill ?? color;
  const belly = bellyColor ?? color;

  let bodyPath: string;
  let bellyPath: string;

  switch (type) {
    case 'slim':
      bodyPath = 'M 50 66 C 58 66 61 72 61 78 C 61 84 57 90 50 90 C 43 90 39 84 39 78 C 39 72 42 66 50 66 Z';
      bellyPath = 'M 50 72 C 55 72 57 76 57 80 C 57 84 55 87 50 87 C 45 87 43 84 43 80 C 43 76 45 72 50 72 Z';
      break;
    case 'round':
      bodyPath = 'M 50 65 C 62 65 68 72 68 80 C 68 87 60 92 50 92 C 40 92 32 87 32 80 C 32 72 38 65 50 65 Z';
      bellyPath = 'M 50 71 C 58 71 62 76 62 81 C 62 86 57 89 50 89 C 43 89 38 86 38 81 C 38 76 42 71 50 71 Z';
      break;
    case 'chonky':
      bodyPath = 'M 50 64 C 66 64 74 72 74 80 C 74 88 64 94 50 94 C 36 94 26 88 26 80 C 26 72 34 64 50 64 Z';
      bellyPath = 'M 50 70 C 62 70 67 76 67 82 C 67 88 60 91 50 91 C 40 91 33 88 33 82 C 33 76 38 70 50 70 Z';
      break;
    case 'standard':
    default:
      bodyPath = 'M 50 66 C 60 66 66 72 66 79 C 66 86 58 91 50 91 C 42 91 34 86 34 79 C 34 72 40 66 50 66 Z';
      bellyPath = 'M 50 72 C 57 72 61 76 61 81 C 61 86 56 88 50 88 C 44 88 39 86 39 81 C 39 76 43 72 50 72 Z';
      break;
  }

  return (
    <G>
      <Path d={bodyPath} fill={fill} />
      {/* Belly patch — lighter inner contour */}
      <Path d={bellyPath} fill={belly} opacity={0.5} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Chest tuft (fur wisps at head-body junction)
// ─────────────────────────────────────────────────

/** Chest fur tuft — small fur wisps at head-body junction */
export function CatChestTuft({ color }: { color: string }): ReactElement {
  const dark = darkenColor(color, 0.8);
  return (
    <G>
      <Path d="M 44 63 Q 46 60 48 63" fill={color} stroke={dark} strokeWidth="0.3" />
      <Path d="M 48 62 Q 50 59 52 62" fill={color} stroke={dark} strokeWidth="0.3" />
      <Path d="M 52 63 Q 54 60 56 63" fill={color} stroke={dark} strokeWidth="0.3" />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Head (with optional cheek fluff) — anime chibi oversized at cy=35, r=32
// ─────────────────────────────────────────────────

export function CatHead({
  color,
  cheekFluff = false,
  gradientFill,
}: {
  color: string;
  cheekFluff?: boolean;
  gradientFill?: string;
}): ReactElement {
  const fill = gradientFill ?? color;

  // Organic chibi head — wider at cheeks, flattened forehead, tapered chin.
  // Approximate bounding box: x=18..82, y=3..62 (center ~50,35, ~same as old r=32 circle).
  // Without cheek fluff: smooth rounded shape
  // With cheek fluff: wider bumpy cheeks (extends to x=14..86)
  const headPath = cheekFluff
    ? // Cheek-fluff variant: pronounced round cheeks bulging outward
      'M 50 3 C 68 3 82 10 82 25 C 82 30 84 34 86 38 C 86 44 82 46 78 44 C 76 50 68 58 58 60 C 54 61 46 61 42 60 C 32 58 24 50 22 44 C 18 46 14 44 14 38 C 16 34 18 30 18 25 C 18 10 32 3 50 3 Z'
    : // Standard: clean rounded chibi skull
      'M 50 3 C 70 3 82 14 82 30 C 82 46 70 60 58 62 C 54 63 46 63 42 62 C 30 60 18 46 18 30 C 18 14 30 3 50 3 Z';

  return (
    <G>
      <Path d={headPath} fill={fill} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Ears (positioned for chibi head at cy=35, r=32, top at y=3)
// ─────────────────────────────────────────────────

export type EarType = 'pointed' | 'rounded' | 'folded';

export function CatEars({
  type,
  bodyColor,
  innerColor,
}: {
  type: EarType;
  bodyColor: string;
  innerColor: string;
}): ReactElement {
  const innerDark = darkenColor(innerColor, 0.7);

  switch (type) {
    case 'rounded':
      return (
        <G>
          {/* Left ear — Scottish Fold-style soft rounded */}
          <Path d="M 24 22 Q 16 6 36 16" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          <Path d="M 26 19 Q 21 10 34 15" fill={innerColor} />
          {/* Fold line */}
          <Path d="M 24 16 Q 27 12 32 14" fill="none" stroke={innerDark} strokeWidth="0.5" opacity={0.5} />
          {/* Inner fur tufts */}
          <Path d="M 28 18 Q 26 15 29 14" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.3} />
          <Path d="M 30 17 Q 28 13 31 13" fill="none" stroke={innerDark} strokeWidth="0.3" opacity={0.3} />
          <Path d="M 26 20 Q 24 17 27 16" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.25} />
          {/* Right ear */}
          <Path d="M 76 22 Q 84 6 64 16" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          <Path d="M 74 19 Q 79 10 66 15" fill={innerColor} />
          <Path d="M 76 16 Q 73 12 68 14" fill="none" stroke={innerDark} strokeWidth="0.5" opacity={0.5} />
          <Path d="M 72 18 Q 74 15 71 14" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.3} />
          <Path d="M 70 17 Q 72 13 69 13" fill="none" stroke={innerDark} strokeWidth="0.3" opacity={0.3} />
          <Path d="M 74 20 Q 76 17 73 16" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.25} />
        </G>
      );
    case 'folded':
      return (
        <G>
          {/* Left ear — dramatically folded forward with overlap shadow */}
          <Path d="M 24 20 Q 18 4 36 14" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          <Path d="M 26 17 Q 22 8 34 13" fill={innerColor} />
          {/* Fold overlap */}
          <Path d="M 23 13 Q 22 10 30 12" fill={bodyColor} stroke={bodyColor} strokeWidth="1" />
          {/* Fold shadow */}
          <Path d="M 24 14 Q 25 11 31 13" fill="#000000" opacity={0.08} />
          {/* Inner fur */}
          <Path d="M 28 16 Q 26 14 29 13" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.3} />
          <Path d="M 30 15 Q 28 12 31 12" fill="none" stroke={innerDark} strokeWidth="0.3" opacity={0.25} />
          {/* Right ear */}
          <Path d="M 76 20 Q 82 4 64 14" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          <Path d="M 74 17 Q 78 8 66 13" fill={innerColor} />
          <Path d="M 77 13 Q 78 10 70 12" fill={bodyColor} stroke={bodyColor} strokeWidth="1" />
          <Path d="M 76 14 Q 75 11 69 13" fill="#000000" opacity={0.08} />
          <Path d="M 72 16 Q 74 14 71 13" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.3} />
          <Path d="M 70 15 Q 72 12 69 12" fill="none" stroke={innerDark} strokeWidth="0.3" opacity={0.25} />
        </G>
      );
    case 'pointed':
    default:
      return (
        <G>
          {/* Left ear — softened pointed with rounder tip */}
          <Path d="M 24 20 Q 17 5 38 14" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          <Path d="M 26 17 Q 21 8 36 13" fill={innerColor} />
          {/* Inner fur tufts */}
          <Path d="M 29 16 Q 27 12 30 11" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.3} />
          <Path d="M 31 14 Q 28 10 32 9" fill="none" stroke={innerDark} strokeWidth="0.3" opacity={0.3} />
          <Path d="M 27 18 Q 25 15 28 14" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.25} />
          {/* Right ear */}
          <Path d="M 76 20 Q 83 5 62 14" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          <Path d="M 74 17 Q 79 8 64 13" fill={innerColor} />
          <Path d="M 71 16 Q 73 12 70 11" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.3} />
          <Path d="M 69 14 Q 72 10 68 9" fill="none" stroke={innerDark} strokeWidth="0.3" opacity={0.3} />
          <Path d="M 73 18 Q 75 15 72 14" fill="none" stroke={innerDark} strokeWidth="0.4" opacity={0.25} />
        </G>
      );
  }
}

// ─────────────────────────────────────────────────
// Eyes — mood-responsive, chibi-scaled (~40% larger), gem sparkle
// ─────────────────────────────────────────────────

export type EyeShape = 'round' | 'almond' | 'big-sparkly' | 'sleepy';

function renderCurvedEyelashes(leftCx: number, rightCx: number, topY: number): ReactElement {
  return (
    <G>
      {/* Left eye — 3 curved lashes on outer corner */}
      <Path d={`M ${leftCx + 4} ${topY} Q ${leftCx + 6} ${topY - 3} ${leftCx + 5} ${topY - 4}`}
        stroke="#1A1A1A" strokeWidth="0.7" fill="none" strokeLinecap="round" />
      <Path d={`M ${leftCx + 5} ${topY + 1} Q ${leftCx + 8} ${topY - 1} ${leftCx + 7} ${topY - 3}`}
        stroke="#1A1A1A" strokeWidth="0.6" fill="none" strokeLinecap="round" />
      <Path d={`M ${leftCx + 6} ${topY + 2} Q ${leftCx + 9} ${topY} ${leftCx + 8} ${topY - 1}`}
        stroke="#1A1A1A" strokeWidth="0.5" fill="none" strokeLinecap="round" />
      {/* Right eye — mirrored */}
      <Path d={`M ${rightCx - 4} ${topY} Q ${rightCx - 6} ${topY - 3} ${rightCx - 5} ${topY - 4}`}
        stroke="#1A1A1A" strokeWidth="0.7" fill="none" strokeLinecap="round" />
      <Path d={`M ${rightCx - 5} ${topY + 1} Q ${rightCx - 8} ${topY - 1} ${rightCx - 7} ${topY - 3}`}
        stroke="#1A1A1A" strokeWidth="0.6" fill="none" strokeLinecap="round" />
      <Path d={`M ${rightCx - 6} ${topY + 2} Q ${rightCx - 9} ${topY} ${rightCx - 8} ${topY - 1}`}
        stroke="#1A1A1A" strokeWidth="0.5" fill="none" strokeLinecap="round" />
    </G>
  );
}

/** Render a single 8-layer composite eye */
function renderPremiumEye(
  cx: number, cy: number,
  shape: EyeShape, eyeColor: string,
  irisGradient: string | undefined,
  pupilType: PupilType,
  pupilScale: number,
  lookDown: number,
): ReactElement {
  const darkIris = darkenColor(eyeColor, 0.6);
  // Shape-dependent dimensions
  const isAlmond = shape === 'almond';
  const isBig = shape === 'big-sparkly';
  const scleraRx = isBig ? 8.5 : isAlmond ? 7 : 5.5;
  const scleraRy = isBig ? 8.5 : isAlmond ? 5.5 : 7;
  const irisR = isBig ? 5.5 : 3.5;
  const pupilR = isBig ? 2.2 : 1.4;
  // Catch light positions (offset from center toward upper-left)
  const hlX = cx - 2.5;
  const hlY = cy - 2.5;
  const hl2X = cx + 2.5;
  const hl2Y = cy + 2.5;

  return (
    <G>
      {/* 1. Eyelid outline */}
      <Ellipse cx={cx} cy={cy} rx={(scleraRx + 1) * pupilScale} ry={(scleraRy + 1) * pupilScale}
        fill="none" stroke="#1A1A1A" strokeWidth="0.6" />
      {/* 2. Sclera with lid shadow */}
      <Ellipse cx={cx} cy={cy} rx={scleraRx * pupilScale} ry={scleraRy * pupilScale} fill="#FAFAFA" />
      <Ellipse cx={cx} cy={cy - scleraRy * 0.3} rx={scleraRx * 0.8} ry={scleraRy * 0.3}
        fill="#D0D4E0" opacity={0.25} />
      {/* 3. Iris outer ring */}
      <Circle cx={cx} cy={cy + lookDown} r={(irisR + 0.8) * pupilScale} fill={darkIris} />
      {/* 4. Iris body */}
      <Circle cx={cx} cy={cy + lookDown} r={irisR * pupilScale} fill={irisGradient ?? eyeColor} />
      {/* 5. Pupil */}
      {pupilType === 'slit'
        ? <Ellipse cx={cx} cy={cy + lookDown} rx={pupilR * 0.4} ry={pupilR * 1.6} fill="#0A0A0A" />
        : <Circle cx={cx} cy={cy + lookDown} r={pupilR} fill="#0A0A0A" />
      }
      {/* 6. Iris detail lines — 4 radial strokes */}
      <Line x1={cx} y1={cy + lookDown - irisR * 0.4} x2={cx} y2={cy + lookDown - irisR * 0.9}
        stroke={eyeColor} strokeWidth="0.4" opacity={0.3} strokeLinecap="round" />
      <Line x1={cx + irisR * 0.4} y1={cy + lookDown} x2={cx + irisR * 0.9} y2={cy + lookDown}
        stroke={eyeColor} strokeWidth="0.4" opacity={0.3} strokeLinecap="round" />
      <Line x1={cx} y1={cy + lookDown + irisR * 0.4} x2={cx} y2={cy + lookDown + irisR * 0.9}
        stroke={eyeColor} strokeWidth="0.4" opacity={0.25} strokeLinecap="round" />
      <Line x1={cx - irisR * 0.4} y1={cy + lookDown} x2={cx - irisR * 0.9} y2={cy + lookDown}
        stroke={eyeColor} strokeWidth="0.4" opacity={0.25} strokeLinecap="round" />
      {/* 7. Primary catch light */}
      <Ellipse cx={hlX} cy={hlY} rx={1.8} ry={1.4} fill="#FFFFFF" opacity={0.9} />
      {/* 8. Secondary catch light */}
      <Circle cx={hl2X} cy={hl2Y} r={0.9} fill="#FFFFFF" opacity={0.6} />
    </G>
  );
}

export function CatEyes({
  shape,
  mood,
  eyeColor,
  catId,
  eyelashes = false,
  pupilType = 'round',
}: {
  shape: EyeShape;
  mood: MascotMood;
  eyeColor: string;
  catId?: string;
  eyelashes?: boolean;
  pupilType?: PupilType;
}): ReactElement {
  // Celebrating → star eyes with sparkle diamonds
  if (mood === 'celebrating') {
    return (
      <G>
        <Path d="M 38 28 L 40 33 L 45 33 L 41 37 L 42.5 42 L 38 39 L 33.5 42 L 35 37 L 31 33 L 36 33 Z" fill="#FFD700" />
        {/* Sparkle diamonds around left star */}
        <Path d="M 30 30 L 31 29 L 32 30 L 31 31 Z" fill="#FFD700" opacity={0.7} />
        <Path d="M 44 30 L 45 29 L 46 30 L 45 31 Z" fill="#FFD700" opacity={0.6} />
        <Path d="M 35 25 L 36 24 L 37 25 L 36 26 Z" fill="#FFD700" opacity={0.5} />
        <Path d="M 41 43 L 42 42 L 43 43 L 42 44 Z" fill="#FFD700" opacity={0.5} />
        <Path d="M 62 28 L 64 33 L 69 33 L 65 37 L 66.5 42 L 62 39 L 57.5 42 L 59 37 L 55 33 L 60 33 Z" fill="#FFD700" />
        {/* Sparkle diamonds around right star */}
        <Path d="M 54 30 L 55 29 L 56 30 L 55 31 Z" fill="#FFD700" opacity={0.7} />
        <Path d="M 68 30 L 69 29 L 70 30 L 69 31 Z" fill="#FFD700" opacity={0.6} />
        <Path d="M 59 25 L 60 24 L 61 25 L 60 26 Z" fill="#FFD700" opacity={0.5} />
        <Path d="M 65 43 L 66 42 L 67 43 L 66 44 Z" fill="#FFD700" opacity={0.5} />
      </G>
    );
  }

  // Happy → arched smile eyes (cute upside-down curves)
  if (mood === 'happy') {
    return (
      <G>
        <Path d="M 34 35 Q 38 30 42 35" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <Path d="M 58 35 Q 62 30 66 35" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {eyelashes && renderCurvedEyelashes(38, 62, 30)}
      </G>
    );
  }

  // Love → heart-shaped eyes
  if (mood === 'love') {
    return (
      <G>
        <Path d="M 38 32 C 35 28 30 30 33 35 L 38 40 L 43 35 C 46 30 41 28 38 32 Z" fill="#FF6B9D" />
        <Path d="M 62 32 C 59 28 54 30 57 35 L 62 40 L 67 35 C 70 30 65 28 62 32 Z" fill="#FF6B9D" />
        {eyelashes && renderCurvedEyelashes(38, 62, 30)}
      </G>
    );
  }

  // Confused → spiral/swirl eyes
  if (mood === 'confused') {
    return (
      <G>
        <Ellipse cx="38" cy="34" rx="6" ry="6" fill="#FFFFFF" />
        <Path d="M 38 30 Q 42 32 38 34 Q 34 36 38 38" stroke={eyeColor} strokeWidth="1.5" fill="none" />
        <Ellipse cx="62" cy="34" rx="6" ry="6" fill="#FFFFFF" />
        <Path d="M 62 30 Q 66 32 62 34 Q 58 36 62 38" stroke={eyeColor} strokeWidth="1.5" fill="none" />
        {eyelashes && renderCurvedEyelashes(38, 62, 28)}
      </G>
    );
  }

  // Smug → asymmetric: left eye more closed, right eye normal, raised eyebrow
  if (mood === 'smug') {
    return (
      <G>
        {/* Left eye — more closed (narrow slit) */}
        <Ellipse cx="38" cy="35" rx="5.5" ry="3" fill="#FAFAFA" />
        <Circle cx="38" cy="35" r={2.2} fill={eyeColor} />
        {pupilType === 'slit'
          ? <Ellipse cx="38" cy="35" rx={0.5} ry={1.4} fill="#0A0A0A" />
          : <Circle cx="38" cy="35" r={0.9} fill="#0A0A0A" />
        }
        <Circle cx="36.5" cy="34" r="0.6" fill="#FFFFFF" opacity={0.8} />
        {/* Raised eyebrow */}
        <Path d="M 33 30 Q 38 28 43 31" stroke="#1A1A1A" strokeWidth="0.8" fill="none" strokeLinecap="round" />
        {/* Right eye — more open (normal) */}
        <Ellipse cx="62" cy="35" rx="5.5" ry="4.5" fill="#FAFAFA" />
        <Circle cx="62" cy="35" r={3} fill={eyeColor} />
        {pupilType === 'slit'
          ? <Ellipse cx="62" cy="35" rx={0.5} ry={1.6} fill="#0A0A0A" />
          : <Circle cx="62" cy="35" r={1.1} fill="#0A0A0A" />
        }
        <Circle cx="60.5" cy="33.5" r="0.8" fill="#FFFFFF" opacity={0.8} />
        <Circle cx="63.5" cy="36.5" r="0.5" fill="#FFFFFF" opacity={0.5} />
        {eyelashes && renderCurvedEyelashes(38, 62, 31)}
      </G>
    );
  }

  // Sleepy → heavy drooping upper eyelid covering 60%
  if (mood === 'sleepy') {
    return (
      <G>
        {/* Left eye — narrow slit showing bottom */}
        <Ellipse cx="38" cy="36" rx="5" ry="3" fill="#FAFAFA" />
        <Circle cx="38" cy="36" r={2} fill={eyeColor} />
        <Circle cx="38" cy="36" r={0.8} fill="#0A0A0A" />
        <Circle cx="36.5" cy="35" r="0.6" fill="#FFFFFF" opacity={0.7} />
        {/* Heavy drooping upper lid */}
        <Path d="M 32 33 Q 38 31 44 33 L 44 36 Q 38 33 32 36 Z" fill={darkenColor(eyeColor, 0.3)} opacity={0.15} />
        <Path d="M 32 34 Q 38 32 44 34" stroke="#1A1A1A" strokeWidth="0.8" fill="none" />
        {/* Right eye */}
        <Ellipse cx="62" cy="36" rx="5" ry="3" fill="#FAFAFA" />
        <Circle cx="62" cy="36" r={2} fill={eyeColor} />
        <Circle cx="62" cy="36" r={0.8} fill="#0A0A0A" />
        <Circle cx="60.5" cy="35" r="0.6" fill="#FFFFFF" opacity={0.7} />
        <Path d="M 56 33 Q 62 31 68 33 L 68 36 Q 62 33 56 36 Z" fill={darkenColor(eyeColor, 0.3)} opacity={0.15} />
        <Path d="M 56 34 Q 62 32 68 34" stroke="#1A1A1A" strokeWidth="0.8" fill="none" />
        {eyelashes && renderCurvedEyelashes(38, 62, 32)}
      </G>
    );
  }

  // Default moods (encouraging, excited, teaching, neutral) — 8-layer composite
  const pupilScale = mood === 'excited' ? 1.4 : 1.0;
  const lookDown = mood === 'teaching' ? 1.5 : 0;
  const irisGradient = catId ? `url(#${catId}-iris)` : undefined;

  return (
    <G>
      {renderPremiumEye(38, 34, shape, eyeColor, irisGradient, pupilType, pupilScale, lookDown)}
      {renderPremiumEye(62, 34, shape, eyeColor, irisGradient, pupilType, pupilScale, lookDown)}
      {eyelashes && renderCurvedEyelashes(38, 62, shape === 'big-sparkly' ? 26 : shape === 'almond' ? 29 : 27)}
    </G>
  );
}

// ─────────────────────────────────────────────────
// Mouth (mood-dependent, repositioned for chibi head)
// ─────────────────────────────────────────────────

export function CatMouth({ mood, darkAccent, fang = false }: {
  mood: MascotMood; darkAccent: string; fang?: boolean;
}): ReactElement {
  // Upper lip line (Y-shape from nose) — always rendered
  const lipLine = (
    <Path d="M 50 44.5 L 50 47 M 50 47 Q 46 50 43 49 M 50 47 Q 54 50 57 49"
      stroke="#FFFFFF" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity={0.6} />
  );

  // Single fang — small triangle on left side
  const fangEl = fang ? (
    <Path d="M 46 49 L 45.5 52 L 47 49.5" fill="#FFFFFF" opacity={0.85} />
  ) : null;

  switch (mood) {
    case 'happy':
    case 'love':
      return (
        <G>
          {lipLine}
          <Path d="M 43 49 Q 46.5 53 50 49 Q 53.5 53 57 49"
            stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {fangEl}
        </G>
      );
    case 'encouraging':
    case 'smug':
      return (
        <G>
          {lipLine}
          <Path d="M 44 49 Q 50 53 56 49" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {fangEl}
        </G>
      );
    case 'excited':
      return (
        <G>
          {lipLine}
          {/* Open mouth with tongue */}
          <Ellipse cx="50" cy="50" rx="5" ry="4" fill={darkAccent} />
          <Ellipse cx="50" cy="52" rx="3" ry="2" fill="#FF8FAA" opacity={0.7} />
          {fang && <Path d="M 46 48 L 45 51 L 47 48.5" fill="#FFFFFF" opacity={0.85} />}
          {fang && <Path d="M 54 48 L 55 51 L 53 48.5" fill="#FFFFFF" opacity={0.85} />}
        </G>
      );
    case 'teaching':
    case 'confused':
      return (
        <G>
          {lipLine}
          <Line x1="44" y1="50" x2="56" y2="50" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          {fangEl}
        </G>
      );
    case 'celebrating':
      return (
        <G>
          {lipLine}
          {/* Wide grin with both fangs */}
          <Path d="M 42 48 Q 50 58 58 48" stroke="#FFFFFF" strokeWidth="1.5" fill={darkAccent} strokeLinecap="round" />
          <Path d="M 45 48.5 L 44.5 51.5 L 46 49" fill="#FFFFFF" opacity={0.85} />
          <Path d="M 55 48.5 L 55.5 51.5 L 54 49" fill="#FFFFFF" opacity={0.85} />
        </G>
      );
    case 'sleepy':
    default:
      return (
        <G>
          {lipLine}
          <Path d="M 44 49 Q 50 52 56 49" stroke="#FFFFFF" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          {fangEl}
        </G>
      );
  }
}

// ─────────────────────────────────────────────────
// Paws (positioned below body at cy=92)
// ─────────────────────────────────────────────────

export function CatPaws({ color, bodyType = 'standard', beanColor }: {
  color: string; bodyType?: BodyType; beanColor?: string;
}): ReactElement {
  // Paw width scales per body type
  const pawW = bodyType === 'chonky' ? 7 : bodyType === 'round' ? 6 : bodyType === 'slim' ? 4 : 5;
  const beanFill = beanColor ?? '#FFB0C0';
  const lx = bodyType === 'chonky' ? 40 : 42;
  const rx = bodyType === 'chonky' ? 60 : 58;
  const py = 92;

  return (
    <G>
      {/* Left paw */}
      <Ellipse cx={lx} cy={py} rx={pawW} ry={3} fill={color} />
      {/* Toe beans — 1 large pad + 2 small */}
      <Ellipse cx={lx} cy={py + 0.5} rx={2.5} ry={1.5} fill={beanFill} opacity={0.35} />
      <Circle cx={lx - 2} cy={py - 1} r={1} fill={beanFill} opacity={0.3} />
      <Circle cx={lx + 2} cy={py - 1} r={1} fill={beanFill} opacity={0.3} />

      {/* Right paw */}
      <Ellipse cx={rx} cy={py} rx={pawW} ry={3} fill={color} />
      <Ellipse cx={rx} cy={py + 0.5} rx={2.5} ry={1.5} fill={beanFill} opacity={0.35} />
      <Circle cx={rx - 2} cy={py - 1} r={1} fill={beanFill} opacity={0.3} />
      <Circle cx={rx + 2} cy={py - 1} r={1} fill={beanFill} opacity={0.3} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Nose (tiny anime nose for bigger head)
// ─────────────────────────────────────────────────

export function CatNose({ color }: { color: string }): ReactElement {
  return (
    <G>
      {/* Inverted rounded triangle — iconic anime cat nose */}
      <Path d="M 50 41 L 48 44 Q 50 45.5 52 44 Z" fill={color} />
      {/* Nose shine — small highlight upper-left */}
      <Circle cx="49.2" cy="42" r="0.7" fill="#FFFFFF" opacity={0.5} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Whiskers (repositioned for bigger head at cy=35, r=32)
// ─────────────────────────────────────────────────

export function CatWhiskers({ color }: { color: string }): ReactElement {
  return (
    <G>
      {/* Left whiskers — curved, visible */}
      <Path d="M 30 39 Q 20 36 8 37" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity={0.8} />
      <Path d="M 30 42 Q 18 41 5 42" stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity={0.85} />
      <Path d="M 30 44 Q 20 46 9 48" stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity={0.75} />
      {/* Follicle dots */}
      <Circle cx="30" cy="39" r="0.8" fill={color} opacity={0.6} />
      <Circle cx="30" cy="42" r="0.9" fill={color} opacity={0.6} />
      <Circle cx="30" cy="44" r="0.8" fill={color} opacity={0.6} />

      {/* Right whiskers — mirrored */}
      <Path d="M 70 39 Q 80 36 92 37" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity={0.8} />
      <Path d="M 70 42 Q 82 41 95 42" stroke={color} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity={0.85} />
      <Path d="M 70 44 Q 80 46 91 48" stroke={color} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity={0.75} />
      <Circle cx="70" cy="39" r="0.8" fill={color} opacity={0.6} />
      <Circle cx="70" cy="42" r="0.9" fill={color} opacity={0.6} />
      <Circle cx="70" cy="44" r="0.8" fill={color} opacity={0.6} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Tail (repositioned for body at cy=80)
// ─────────────────────────────────────────────────

export type TailType = 'curled' | 'straight' | 'fluffy';

export function CatTail({
  type,
  bodyColor,
  accentColor,
}: {
  type: TailType;
  bodyColor: string;
  accentColor: string;
}): ReactElement {
  const furStroke = darkenColor(bodyColor, 0.8);

  switch (type) {
    case 'straight':
      return (
        <G>
          {/* Tapered filled shape — thick base, thin tip with upward hook */}
          <Path d="M 66 82 Q 72 78 78 70 Q 82 64 84 58 L 85 56 Q 86 54 84 54 L 83 55 Q 80 62 76 68 Q 70 76 64 80 Z"
            fill={bodyColor} />
          {/* Fur direction strokes */}
          <Path d="M 70 76 Q 74 72 77 66" stroke={furStroke} strokeWidth="0.4" fill="none" opacity={0.2} />
          <Path d="M 68 78 Q 72 74 75 69" stroke={furStroke} strokeWidth="0.3" fill="none" opacity={0.15} />
          {/* Tip accent */}
          <Circle cx="84.5" cy="54" r="2.5" fill={accentColor} />
        </G>
      );
    case 'fluffy':
      return (
        <G>
          {/* Wide bushy shape with scalloped edge */}
          <Path d="M 66 82 Q 72 76 78 68 Q 82 62 86 58 Q 90 54 88 50 Q 86 48 82 50 Q 80 52 84 56 Q 82 62 76 68 Q 70 74 64 80 Z"
            fill={bodyColor} />
          {/* Scalloped fluff bumps */}
          <Path d="M 86 58 Q 90 56 88 53" fill={bodyColor} stroke={bodyColor} strokeWidth="1.5" />
          <Path d="M 84 54 Q 88 51 86 48" fill={bodyColor} stroke={bodyColor} strokeWidth="1.5" />
          {/* Fur strokes */}
          <Path d="M 72 74 Q 76 70 80 64" stroke={furStroke} strokeWidth="0.4" fill="none" opacity={0.2} />
          <Path d="M 70 76 Q 74 72 78 66" stroke={furStroke} strokeWidth="0.3" fill="none" opacity={0.15} />
          {/* Fluffy tip */}
          <Circle cx="87" cy="50" r="4" fill={bodyColor} />
          <Circle cx="87" cy="50" r="3" fill={accentColor} opacity={0.25} />
        </G>
      );
    case 'curled':
    default:
      return (
        <G>
          {/* Tapered curl — thick base flowing into spiral tip */}
          <Path d="M 66 82 Q 74 76 82 68 Q 88 60 90 54 Q 91 50 88 48 Q 85 46 84 50 Q 83 54 86 52 Q 84 56 80 62 Q 74 72 64 80 Z"
            fill={bodyColor} />
          {/* Fur direction strokes */}
          <Path d="M 72 74 Q 78 68 82 60" stroke={furStroke} strokeWidth="0.4" fill="none" opacity={0.2} />
          {/* Spiral tip accent tuft */}
          <Circle cx="87" cy="48" r="3.5" fill={accentColor} />
          <Circle cx="88.5" cy="47" r="1.5" fill={accentColor} opacity={0.6} />
          <Circle cx="85.5" cy="49" r="1.5" fill={accentColor} opacity={0.4} />
        </G>
      );
  }
}

// ─────────────────────────────────────────────────
// Blush (wider for bigger head at r=32)
// ─────────────────────────────────────────────────

export function CatBlush({ color = '#FF9999' }: { color?: string }): ReactElement {
  // Anime hash-mark blush — 3 short diagonal parallel lines per cheek
  return (
    <G opacity={0.3}>
      {/* Left cheek */}
      <Line x1="22" y1="40" x2="25" y2="43" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      <Line x1="24" y1="39" x2="27" y2="42" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      <Line x1="26" y1="38" x2="29" y2="41" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      {/* Right cheek */}
      <Line x1="71" y1="38" x2="74" y2="41" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      <Line x1="73" y1="39" x2="76" y2="42" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      <Line x1="75" y1="40" x2="78" y2="43" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Headphones (repositioned for bigger head at cy=35, r=32)
// ─────────────────────────────────────────────────

export function CatHeadphones({ color, darkColor }: { color: string; darkColor: string }): ReactElement {
  return (
    <G>
      <Path d="M 20 28 Q 50 10 80 28" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Circle cx="20" cy="30" r="7" fill={color} />
      <Circle cx="20" cy="30" r="5" fill={darkColor} />
      <Circle cx="80" cy="30" r="7" fill={color} />
      <Circle cx="80" cy="30" r="5" fill={darkColor} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Piano-key collar (repositioned for new neck zone between head and body)
// ─────────────────────────────────────────────────

export function CatPianoCollar(): ReactElement {
  return (
    <G>
      <Rect x="35" y="66" width="4" height="5" rx="1" fill="#FFFFFF" />
      <Rect x="40" y="66" width="4" height="5" rx="1" fill="#1A1A1A" />
      <Rect x="45" y="66" width="4" height="5" rx="1" fill="#FFFFFF" />
      <Rect x="50" y="66" width="4" height="5" rx="1" fill="#1A1A1A" />
      <Rect x="55" y="66" width="4" height="5" rx="1" fill="#FFFFFF" />
      <Rect x="60" y="66" width="4" height="5" rx="1" fill="#1A1A1A" />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Hair Tufts (positioned between ears on top of head)
// ─────────────────────────────────────────────────

export function CatHairTuft({ type, color, size = 'small' }: {
  type: HairTuftType; color: string; size?: 'small' | 'medium' | 'large';
}): ReactElement | null {
  if (type === 'none') return null;

  const darkColor = darkenColor(color, 0.7);
  const scale = size === 'large' ? 1.6 : size === 'medium' ? 1.3 : 1.0;
  // Scale from center of tuft area (50, 4)
  const transform = scale !== 1.0
    ? `translate(${50 - 50 * scale}, ${4 - 4 * scale}) scale(${scale})`
    : undefined;

  let tuft: ReactElement;

  switch (type) {
    case 'curly':
      tuft = (
        <G>
          <Path d="M 47 7 Q 45 3 49 4 Q 51 1 53 5 Q 55 3 53 7" fill="#000000" opacity={0.05} />
          <Path d="M 47 6 Q 45 2 49 3 Q 51 0 53 4 Q 55 2 53 6"
            fill={color} stroke={darkColor} strokeWidth="0.5" />
          <Path d="M 48 5 Q 47 3 50 3.5" fill={color} stroke={darkColor} strokeWidth="0.3" />
        </G>
      );
      break;
    case 'fluffy':
      tuft = (
        <G>
          <Path d="M 46 6 Q 46 4 48 5 Q 48 2 50 4 Q 52 2 52 5 Q 54 4 54 6" fill="#000000" opacity={0.05} />
          <Circle cx="47" cy="5" r="2.5" fill={color} />
          <Circle cx="50" cy="3.5" r="2.8" fill={color} />
          <Circle cx="53" cy="5" r="2.5" fill={color} />
          <Circle cx="48.5" cy="4" r="2" fill={color} />
          <Circle cx="51.5" cy="4" r="2" fill={color} />
        </G>
      );
      break;
    case 'spiky':
      tuft = (
        <G>
          <Path d="M 47 7 L 46 2 L 49 6 L 50 0 L 51 6 L 54 2 L 53 7" fill="#000000" opacity={0.05} />
          <Path d="M 47 6 L 46 1 L 49 5" fill={color} />
          <Path d="M 49 5 L 50 -1 L 51 5" fill={color} />
          <Path d="M 51 5 L 54 1 L 53 6" fill={color} />
          <Path d="M 47.5 4 L 47 2" stroke={darkColor} strokeWidth="0.3" fill="none" opacity={0.3} />
          <Path d="M 50 3 L 50 1" stroke={darkColor} strokeWidth="0.3" fill="none" opacity={0.3} />
          <Path d="M 52.5 4 L 53 2" stroke={darkColor} strokeWidth="0.3" fill="none" opacity={0.3} />
        </G>
      );
      break;
    case 'wave':
      tuft = (
        <G>
          <Path d="M 43 7 Q 46 3 50 6 Q 54 3 57 7" fill="#000000" opacity={0.05} />
          <Path d="M 43 6 Q 46 2 50 5 Q 54 2 57 6" fill={color} stroke={darkColor} strokeWidth="0.5" />
          <Path d="M 45 5 Q 48 3 50 4.5" fill="none" stroke={darkColor} strokeWidth="0.3" opacity={0.3} />
        </G>
      );
      break;
    case 'windswept':
      tuft = (
        <G>
          <Path d="M 45 7 Q 49 3 55 5 Q 57 4 59 6" fill="#000000" opacity={0.05} />
          <Path d="M 45 6 Q 49 2 55 4 Q 57 3 59 5" fill={color} stroke={darkColor} strokeWidth="0.5" />
          <Path d="M 47 5 Q 51 3 54 4" fill="none" stroke={darkColor} strokeWidth="0.3" opacity={0.3} />
        </G>
      );
      break;
    case 'slicked':
      tuft = (
        <G>
          <Path d="M 46 6 Q 50 1 54 6" fill="#000000" opacity={0.05} />
          <Path d="M 46 5 Q 50 0 54 5" fill={color} stroke={darkColor} strokeWidth="0.5" />
          <Path d="M 48 4 Q 50 2 52 4" fill="none" stroke={darkColor} strokeWidth="0.3" opacity={0.2} />
        </G>
      );
      break;
    case 'side-part':
      tuft = (
        <G>
          <Path d="M 43 7 Q 45 4 49 6 L 51 7" fill="#000000" opacity={0.05} />
          <Path d="M 43 6 Q 45 3 49 5 L 51 6" fill={color} stroke={darkColor} strokeWidth="0.5" />
        </G>
      );
      break;
    case 'silky':
      tuft = (
        <G>
          <Path d="M 44 8 Q 47 3 49 5 Q 51 3 54 8" fill="#000000" opacity={0.05} />
          <Path d="M 44 7 Q 47 2 49 4 Q 51 2 54 7" fill={color} stroke={darkColor} strokeWidth="0.3" />
          <Path d="M 46 5 Q 48 3 50 4" fill="none" stroke={darkColor} strokeWidth="0.2" opacity={0.2} />
        </G>
      );
      break;
    case 'sharp':
      tuft = (
        <G>
          <Path d="M 47 7 L 50 1 L 53 7" fill="#000000" opacity={0.05} />
          <Path d="M 47 6 L 50 0 L 53 6" fill={color} />
          <Path d="M 49 4 L 50 1.5" stroke={darkColor} strokeWidth="0.3" fill="none" opacity={0.3} />
        </G>
      );
      break;
    case 'messy':
      tuft = (
        <G>
          <Path d="M 45 7 L 44 3 L 47 6 L 49 2 L 51 6 L 54 4 L 53 7 L 56 5 L 55 7" fill="#000000" opacity={0.05} />
          <Path d="M 45 6 L 44 2 L 47 5" fill={color} />
          <Path d="M 48 5 L 49 1 L 51 5" fill={color} />
          <Path d="M 52 6 L 54 3 L 53 6" fill={color} />
          <Path d="M 54 6 L 56 4 L 55 6" fill={color} />
        </G>
      );
      break;
    case 'cowlick':
      tuft = (
        <G>
          <Path d="M 47 6 Q 49 0 53 5 Q 55 3 54 7" fill="#000000" opacity={0.05} />
          <Path d="M 47 5 Q 49 -1 53 4 Q 55 2 54 6" fill={color} stroke={darkColor} strokeWidth="0.5" />
          <Path d="M 49 3 Q 51 1 52 3.5" fill="none" stroke={darkColor} strokeWidth="0.3" opacity={0.3} />
        </G>
      );
      break;
    default:
      return null;
  }

  return transform ? <G transform={transform}>{tuft}</G> : tuft;
}

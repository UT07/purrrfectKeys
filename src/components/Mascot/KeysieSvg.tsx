import type { ReactElement } from 'react';
import Svg, { G, Circle, Path, Rect, Ellipse, Line, Defs, ClipPath } from 'react-native-svg';

import { MASCOT_SIZES } from './types';
import type { MascotMood, MascotSize } from './types';
import type { CatPattern, CatVisuals } from './catCharacters';
import type { EvolutionStage } from '@/stores/types';
import {
  CatBody,
  CatHead,
  CatEars,
  CatEyes,
  CatMouth,
  CatNose,
  CatWhiskers,
  CatTail,
  CatBlush,
  CatHeadphones,
  CatPianoCollar,
} from './svg/CatParts';
import { getCatProfile } from './svg/catProfiles';
import { EvolutionAura, renderAccessories } from './svg/CatAccessories';
import { getCatById } from './catCharacters';

interface KeysieSvgProps {
  mood: MascotMood;
  size: MascotSize;
  /** Override accent color (headphones). Defaults to crimson. */
  accentColor?: string;
  /** Override pixel size directly (ignores size prop). Used by CatAvatar. */
  pixelSize?: number;
  /** Full visual identity from CatCharacter. When provided, overrides accentColor. */
  visuals?: CatVisuals;
  /** Evolution stage — adds visual accessories/effects per stage. Defaults to 'baby'. */
  evolutionStage?: EvolutionStage;
  /** Cat ID — when provided, uses the composable profile system for unique silhouettes. */
  catId?: string;
}

const DEFAULT_BODY = '#3A3A3A';
const DEFAULT_BELLY = '#4A4A4A';
const DEFAULT_EYE = '#2ECC71';
const CRIMSON = '#DC143C';
const DARK_RED = '#8B0000';

/** Darken a hex color by a factor (0-1, where 0 = black) */
function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * factor);
  const dg = Math.round(g * factor);
  const db = Math.round(b * factor);
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

/** Lighten a hex color by a factor (0-1, where 1 = white) */
function lightenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

/** Render fur pattern overlays clipped to the body shape */
function renderPattern(pattern: CatPattern, bodyColor: string, bellyColor: string): ReactElement | null {
  const stripeColor = darkenColor(bodyColor, 0.7);
  const spotColor = lightenColor(bodyColor, 0.25);

  switch (pattern) {
    case 'tuxedo':
      return (
        <G>
          <Path d="M 42 58 Q 50 52 58 58 L 56 78 Q 50 82 44 78 Z" fill={bellyColor} />
          <Circle cx="50" cy="56" r="5" fill={bellyColor} />
        </G>
      );

    case 'tabby':
      return (
        <G>
          <Path d="M 38 30 L 42 26 L 46 32 L 50 24 L 54 32 L 58 26 L 62 30" stroke={stripeColor} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <Path d="M 34 60 Q 40 56 46 62" stroke={stripeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d="M 36 66 Q 42 62 48 68" stroke={stripeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d="M 54 62 Q 60 56 66 60" stroke={stripeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d="M 52 68 Q 58 62 64 66" stroke={stripeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Ellipse cx="50" cy="72" rx="12" ry="8" fill={bellyColor} opacity={0.6} />
        </G>
      );

    case 'siamese':
      return (
        <G>
          <Ellipse cx="50" cy="48" rx="14" ry="10" fill={darkenColor(bodyColor, 0.4)} opacity={0.7} />
          <Ellipse cx="38" cy="82" rx="5" ry="3" fill={darkenColor(bodyColor, 0.35)} />
          <Ellipse cx="62" cy="82" rx="5" ry="3" fill={darkenColor(bodyColor, 0.35)} />
          <Ellipse cx="50" cy="68" rx="14" ry="10" fill={bellyColor} opacity={0.4} />
        </G>
      );

    case 'spotted':
      return (
        <G>
          <Circle cx="42" cy="62" r="3" fill={spotColor} opacity={0.5} />
          <Circle cx="58" cy="58" r="2.5" fill={spotColor} opacity={0.5} />
          <Circle cx="50" cy="72" r="3.5" fill={spotColor} opacity={0.4} />
          <Circle cx="36" cy="70" r="2" fill={spotColor} opacity={0.5} />
          <Circle cx="62" cy="68" r="2.5" fill={spotColor} opacity={0.4} />
          <Circle cx="42" cy="35" r="2" fill={spotColor} opacity={0.4} />
          <Circle cx="58" cy="33" r="1.8" fill={spotColor} opacity={0.5} />
          <Ellipse cx="50" cy="72" rx="10" ry="7" fill={bellyColor} opacity={0.4} />
        </G>
      );

    case 'solid':
      return (
        <G>
          <Ellipse cx="50" cy="70" rx="14" ry="10" fill={bellyColor} opacity={0.5} />
          <Circle cx="50" cy="55" r="4" fill={bellyColor} opacity={0.3} />
        </G>
      );
  }
}

/**
 * Composable renderer — uses CatParts and catProfiles for unique silhouettes.
 * Used when catId is known (via CatAvatar).
 */
function renderComposable(
  catId: string,
  mood: MascotMood,
  bodyColor: string,
  bellyColor: string,
  earInnerColor: string,
  eyeColor: string,
  noseColor: string,
  accent: string,
  accentDark: string,
  pattern: CatPattern,
  evolutionStage: EvolutionStage,
): ReactElement {
  const profile = getCatProfile(catId);
  const cat = getCatById(catId);
  const whiskerColor = lightenColor(bodyColor, 0.4);
  const accessories = cat?.evolutionVisuals[evolutionStage]?.accessories ?? [];

  return (
    <G>
      {/* Evolution aura (background) */}
      <EvolutionAura stage={evolutionStage} accent={accent} />

      {/* Tail */}
      <CatTail type={profile.tail} bodyColor={bodyColor} accentColor={accent} />

      {/* Body */}
      <CatBody type={profile.body} color={bodyColor} />

      {/* Head */}
      <CatHead color={bodyColor} cheekFluff={profile.cheekFluff} />

      {/* Pattern overlay (clip to body) */}
      <Defs>
        <ClipPath id="bodyClip">
          <Circle cx="50" cy="42" r="22" />
          <Ellipse cx="50" cy="65" rx="22" ry="20" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#bodyClip)">
        {renderPattern(pattern, bodyColor, bellyColor)}
      </G>

      {/* Ears */}
      <CatEars type={profile.ears} bodyColor={bodyColor} innerColor={earInnerColor} />

      {/* Headphones */}
      <CatHeadphones color={accent} darkColor={darkenColor(accent, 0.3)} />

      {/* Piano-key collar */}
      <CatPianoCollar />

      {/* Whiskers */}
      <CatWhiskers color={whiskerColor} />

      {/* Nose */}
      <CatNose color={noseColor} />

      {/* Eyes (shape-specific + mood-responsive) */}
      <CatEyes shape={profile.eyes} mood={mood} eyeColor={eyeColor} />

      {/* Mouth */}
      <CatMouth mood={mood} darkAccent={accentDark} />

      {/* Blush */}
      {profile.blush && <CatBlush color={profile.blushColor} />}

      {/* Evolution accessories */}
      {accessories.length > 0 && renderAccessories(accessories, accent)}
    </G>
  );
}

/**
 * Legacy renderer — the original monolithic rendering path.
 * Used when no catId is provided (backward compat for tests/standalone usage).
 */
function renderLegacy(
  mood: MascotMood,
  bodyColor: string,
  bellyColor: string,
  earInnerColor: string,
  eyeColor: string,
  noseColor: string,
  accent: string,
  accentDark: string,
  pattern: CatPattern,
  evolutionStage: EvolutionStage,
): ReactElement {
  const whiskerColor = lightenColor(bodyColor, 0.4);

  return (
    <G>
      {/* Evolution aura (background) */}
      <EvolutionAura stage={evolutionStage} accent={accent} />

      {/* Tail */}
      <Path d="M 72 70 Q 85 65 88 50 Q 90 40 85 35" stroke={bodyColor} strokeWidth="4" fill="none" strokeLinecap="round" />
      <Circle cx="85" cy="33" r="4" fill={accent} />

      {/* Body */}
      <Ellipse cx="50" cy="65" rx="22" ry="20" fill={bodyColor} />
      {/* Head */}
      <Circle cx="50" cy="42" r="22" fill={bodyColor} />

      {/* Pattern */}
      <Defs>
        <ClipPath id="bodyClip">
          <Circle cx="50" cy="42" r="22" />
          <Ellipse cx="50" cy="65" rx="22" ry="20" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#bodyClip)">
        {renderPattern(pattern, bodyColor, bellyColor)}
      </G>

      {/* Ears */}
      <Path d="M 30 30 L 25 10 L 38 25 Z" fill={bodyColor} />
      <Path d="M 31 27 L 27 14 L 36 24 Z" fill={earInnerColor} />
      <Path d="M 70 30 L 75 10 L 62 25 Z" fill={bodyColor} />
      <Path d="M 69 27 L 73 14 L 64 24 Z" fill={earInnerColor} />

      {/* Headphones */}
      <Path d="M 28 38 Q 50 22 72 38" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Circle cx="28" cy="40" r="6" fill={accent} />
      <Circle cx="28" cy="40" r="4" fill={darkenColor(accent, 0.3)} />
      <Circle cx="72" cy="40" r="6" fill={accent} />
      <Circle cx="72" cy="40" r="4" fill={darkenColor(accent, 0.3)} />

      {/* Piano collar */}
      <G>
        <Rect x="35" y="58" width="4" height="6" rx="1" fill="#FFFFFF" />
        <Rect x="40" y="58" width="4" height="6" rx="1" fill="#1A1A1A" />
        <Rect x="45" y="58" width="4" height="6" rx="1" fill="#FFFFFF" />
        <Rect x="50" y="58" width="4" height="6" rx="1" fill="#1A1A1A" />
        <Rect x="55" y="58" width="4" height="6" rx="1" fill="#FFFFFF" />
        <Rect x="60" y="58" width="4" height="6" rx="1" fill="#1A1A1A" />
      </G>

      {/* Whiskers */}
      <Line x1="20" y1="46" x2="33" y2="48" stroke={whiskerColor} strokeWidth="1" />
      <Line x1="18" y1="50" x2="33" y2="50" stroke={whiskerColor} strokeWidth="1" />
      <Line x1="20" y1="54" x2="33" y2="52" stroke={whiskerColor} strokeWidth="1" />
      <Line x1="67" y1="48" x2="80" y2="46" stroke={whiskerColor} strokeWidth="1" />
      <Line x1="67" y1="50" x2="82" y2="50" stroke={whiskerColor} strokeWidth="1" />
      <Line x1="67" y1="52" x2="80" y2="54" stroke={whiskerColor} strokeWidth="1" />

      {/* Nose */}
      <Ellipse cx="50" cy="49" rx="3" ry="2" fill={noseColor} />

      {/* Eyes (legacy round style) */}
      <CatEyes shape="round" mood={mood} eyeColor={eyeColor} />

      {/* Mouth */}
      <CatMouth mood={mood} darkAccent={accentDark} />
    </G>
  );
}

export function KeysieSvg({
  mood,
  size,
  accentColor,
  pixelSize,
  visuals,
  evolutionStage = 'baby',
  catId,
}: KeysieSvgProps): ReactElement {
  const px = pixelSize ?? MASCOT_SIZES[size];

  // Derive colors from visuals (new system) or fallback to legacy props
  const bodyColor = visuals?.bodyColor ?? DEFAULT_BODY;
  const bellyColor = visuals?.bellyColor ?? DEFAULT_BELLY;
  const earInnerColor = visuals?.earInnerColor ?? accentColor ?? CRIMSON;
  const eyeColor = visuals?.eyeColor ?? DEFAULT_EYE;
  const noseColor = visuals?.noseColor ?? accentColor ?? CRIMSON;
  const accent = accentColor ?? visuals?.earInnerColor ?? CRIMSON;
  const accentDark = visuals ? darkenColor(visuals.noseColor, 0.5) : (accentColor ? darkenColor(accentColor, 0.5) : DARK_RED);
  const pattern = visuals?.pattern ?? 'solid';

  return (
    <Svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      testID="keysie-svg"
    >
      {catId
        ? renderComposable(
            catId, mood, bodyColor, bellyColor, earInnerColor,
            eyeColor, noseColor, accent, accentDark, pattern, evolutionStage,
          )
        : renderLegacy(
            mood, bodyColor, bellyColor, earInnerColor,
            eyeColor, noseColor, accent, accentDark, pattern, evolutionStage,
          )
      }
    </Svg>
  );
}

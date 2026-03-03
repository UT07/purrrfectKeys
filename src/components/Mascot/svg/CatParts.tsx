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

// ─────────────────────────────────────────────────
// Body types (chibi: tiny bodies tucked below oversized head at cy=80)
// ─────────────────────────────────────────────────

export type BodyType = 'slim' | 'standard' | 'round' | 'chonky';

export function CatBody({ type, color }: { type: BodyType; color: string }): ReactElement {
  switch (type) {
    case 'slim':
      return <Ellipse cx="50" cy="80" rx="11" ry="10" fill={color} />;
    case 'round':
      return <Ellipse cx="50" cy="80" rx="16" ry="13" fill={color} />;
    case 'chonky':
      return <Ellipse cx="50" cy="80" rx="20" ry="15" fill={color} />;
    case 'standard':
    default:
      return <Ellipse cx="50" cy="80" rx="14" ry="12" fill={color} />;
  }
}

// ─────────────────────────────────────────────────
// Head (with optional cheek fluff) — anime chibi oversized at cy=35, r=32
// ─────────────────────────────────────────────────

export function CatHead({
  color,
  cheekFluff = false,
}: {
  color: string;
  cheekFluff?: boolean;
}): ReactElement {
  return (
    <G>
      <Circle cx="50" cy="35" r="32" fill={color} />
      {cheekFluff && (
        <G>
          <Circle cx="20" cy="42" r="7" fill={color} />
          <Circle cx="80" cy="42" r="7" fill={color} />
        </G>
      )}
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
  switch (type) {
    case 'rounded':
      return (
        <G>
          {/* Left ear — wide rounded */}
          <Path d="M 24 22 Q 16 2 36 16" fill={bodyColor} />
          <Path d="M 26 19 Q 21 8 34 15" fill={innerColor} />
          {/* Right ear */}
          <Path d="M 76 22 Q 84 2 64 16" fill={bodyColor} />
          <Path d="M 74 19 Q 79 8 66 15" fill={innerColor} />
        </G>
      );
    case 'folded':
      return (
        <G>
          {/* Left ear — folded forward */}
          <Path d="M 24 20 Q 18 4 36 14" fill={bodyColor} />
          <Path d="M 26 17 Q 22 8 34 13" fill={innerColor} />
          <Path d="M 24 12 Q 22 10 30 12" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
          {/* Right ear */}
          <Path d="M 76 20 Q 82 4 64 14" fill={bodyColor} />
          <Path d="M 74 17 Q 78 8 66 13" fill={innerColor} />
          <Path d="M 76 12 Q 78 10 70 12" fill={bodyColor} stroke={bodyColor} strokeWidth="0.8" />
        </G>
      );
    case 'pointed':
    default:
      return (
        <G>
          {/* Left ear — soft bezier pointed */}
          <Path d="M 24 20 Q 20 -2 38 14" fill={bodyColor} />
          <Path d="M 26 17 Q 23 4 36 13" fill={innerColor} />
          {/* Right ear */}
          <Path d="M 76 20 Q 80 -2 62 14" fill={bodyColor} />
          <Path d="M 74 17 Q 77 4 64 13" fill={innerColor} />
        </G>
      );
  }
}

// ─────────────────────────────────────────────────
// Eyes — mood-responsive, chibi-scaled (~40% larger), gem sparkle
// ─────────────────────────────────────────────────

export type EyeShape = 'round' | 'almond' | 'big-sparkly' | 'sleepy';

export function CatEyes({
  shape,
  mood,
  eyeColor,
}: {
  shape: EyeShape;
  mood: MascotMood;
  eyeColor: string;
}): ReactElement {
  // Celebrating → star eyes (universal)
  if (mood === 'celebrating') {
    return (
      <G>
        <Path
          d="M 38 28 L 40 33 L 45 33 L 41 37 L 42.5 42 L 38 39 L 33.5 42 L 35 37 L 31 33 L 36 33 Z"
          fill="#FFD700"
        />
        <Path
          d="M 62 28 L 64 33 L 69 33 L 65 37 L 66.5 42 L 62 39 L 57.5 42 L 59 37 L 55 33 L 60 33 Z"
          fill="#FFD700"
        />
      </G>
    );
  }

  // Happy → arched smile eyes (universal)
  if (mood === 'happy') {
    return (
      <G>
        <Path d="M 34 35 Q 38 30 42 35" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <Path d="M 58 35 Q 62 30 66 35" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </G>
    );
  }

  // Shape-specific rendering for other moods
  const pupilScale = mood === 'excited' ? 1.4 : 1.0;
  const lookDown = mood === 'teaching' ? 1.5 : 0;

  switch (shape) {
    case 'big-sparkly':
      return (
        <G>
          {/* Left eye */}
          <Circle cx="38" cy="34" r={8.5 * pupilScale} fill="#FFFFFF" />
          <Circle cx="38" cy={34 + lookDown} r={5 * pupilScale} fill={eyeColor} />
          <Circle cx="38" cy={34 + lookDown} r={2} fill="#1A1A1A" />
          <Circle cx="35.5" cy="31.5" r={2} fill="#FFFFFF" />
          <Circle cx="40.5" cy="36.5" r={1.2} fill="#FFFFFF" />
          <Circle cx="36" cy="36" r={0.6} fill="#FFFFFF" />
          {/* Right eye */}
          <Circle cx="62" cy="34" r={8.5 * pupilScale} fill="#FFFFFF" />
          <Circle cx="62" cy={34 + lookDown} r={5 * pupilScale} fill={eyeColor} />
          <Circle cx="62" cy={34 + lookDown} r={2} fill="#1A1A1A" />
          <Circle cx="59.5" cy="31.5" r={2} fill="#FFFFFF" />
          <Circle cx="64.5" cy="36.5" r={1.2} fill="#FFFFFF" />
          <Circle cx="60" cy="36" r={0.6} fill="#FFFFFF" />
        </G>
      );

    case 'almond':
      return (
        <G>
          <Ellipse cx="38" cy="34" rx={7 * pupilScale} ry={5.5 * pupilScale} fill="#FFFFFF" />
          <Circle cx="38" cy={34 + lookDown} r={3.5} fill={eyeColor} />
          <Circle cx="38" cy={34 + lookDown} r={1.4} fill="#1A1A1A" />
          <Circle cx="36.5" cy="32.5" r="1.2" fill="#FFFFFF" />
          <Circle cx="39.5" cy="35.5" r="0.6" fill="#FFFFFF" />
          <Ellipse cx="62" cy="34" rx={7 * pupilScale} ry={5.5 * pupilScale} fill="#FFFFFF" />
          <Circle cx="62" cy={34 + lookDown} r={3.5} fill={eyeColor} />
          <Circle cx="62" cy={34 + lookDown} r={1.4} fill="#1A1A1A" />
          <Circle cx="60.5" cy="32.5" r="1.2" fill="#FFFFFF" />
          <Circle cx="63.5" cy="35.5" r="0.6" fill="#FFFFFF" />
        </G>
      );

    case 'sleepy':
      return (
        <G>
          <Ellipse cx="38" cy="35" rx={5.5 * pupilScale} ry={4 * pupilScale} fill="#FFFFFF" />
          <Circle cx="38" cy={35 + lookDown} r={2.8} fill={eyeColor} />
          <Circle cx="38" cy={35 + lookDown} r={1.1} fill="#1A1A1A" />
          <Line x1="33" y1="31.5" x2="43" y2="31.5" stroke={eyeColor} strokeWidth="1.2" strokeLinecap="round" />
          <Ellipse cx="62" cy="35" rx={5.5 * pupilScale} ry={4 * pupilScale} fill="#FFFFFF" />
          <Circle cx="62" cy={35 + lookDown} r={2.8} fill={eyeColor} />
          <Circle cx="62" cy={35 + lookDown} r={1.1} fill="#1A1A1A" />
          <Line x1="57" y1="31.5" x2="67" y2="31.5" stroke={eyeColor} strokeWidth="1.2" strokeLinecap="round" />
        </G>
      );

    case 'round':
    default:
      return (
        <G>
          <Ellipse cx="38" cy="34" rx={5.5 * pupilScale} ry={7 * pupilScale} fill="#FFFFFF" />
          <Circle cx="38" cy={34 + lookDown} r={3.5} fill={eyeColor} />
          <Circle cx="38" cy={34 + lookDown} r={1.4} fill="#1A1A1A" />
          <Circle cx="36.5" cy="32" r="1.2" fill="#FFFFFF" />
          <Circle cx="39.5" cy="36" r="0.6" fill="#FFFFFF" />
          <Ellipse cx="62" cy="34" rx={5.5 * pupilScale} ry={7 * pupilScale} fill="#FFFFFF" />
          <Circle cx="62" cy={34 + lookDown} r={3.5} fill={eyeColor} />
          <Circle cx="62" cy={34 + lookDown} r={1.4} fill="#1A1A1A" />
          <Circle cx="60.5" cy="32" r="1.2" fill="#FFFFFF" />
          <Circle cx="63.5" cy="36" r="0.6" fill="#FFFFFF" />
        </G>
      );
  }
}

// ─────────────────────────────────────────────────
// Mouth (mood-dependent, repositioned for chibi head)
// ─────────────────────────────────────────────────

export function CatMouth({ mood, darkAccent }: { mood: MascotMood; darkAccent: string }): ReactElement {
  switch (mood) {
    case 'happy':
      return (
        <Path d="M 43 49 Q 50 55 57 49" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      );
    case 'encouraging':
      return (
        <Path d="M 44 49 Q 50 53 56 49" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      );
    case 'excited':
      return <Ellipse cx="50" cy="50" rx="5" ry="4" fill={darkAccent} />;
    case 'teaching':
      return (
        <Line x1="44" y1="50" x2="56" y2="50" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      );
    case 'celebrating':
      return (
        <Path d="M 42 48 Q 50 58 58 48" stroke="#FFFFFF" strokeWidth="1.5" fill={darkAccent} strokeLinecap="round" />
      );
  }
}

// ─────────────────────────────────────────────────
// Paws (positioned below body at cy=92)
// ─────────────────────────────────────────────────

export function CatPaws({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Ellipse cx="42" cy="92" rx="5" ry="3" fill={color} />
      <Ellipse cx="58" cy="92" rx="5" ry="3" fill={color} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Nose (tiny anime nose for bigger head)
// ─────────────────────────────────────────────────

export function CatNose({ color }: { color: string }): ReactElement {
  return <Ellipse cx="50" cy="42" rx="1.8" ry="1.2" fill={color} />;
}

// ─────────────────────────────────────────────────
// Whiskers (repositioned for bigger head at cy=35, r=32)
// ─────────────────────────────────────────────────

export function CatWhiskers({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Line x1="14" y1="38" x2="30" y2="40" stroke={color} strokeWidth="0.8" />
      <Line x1="12" y1="42" x2="30" y2="42" stroke={color} strokeWidth="0.8" />
      <Line x1="14" y1="46" x2="30" y2="44" stroke={color} strokeWidth="0.8" />
      <Line x1="70" y1="40" x2="86" y2="38" stroke={color} strokeWidth="0.8" />
      <Line x1="70" y1="42" x2="88" y2="42" stroke={color} strokeWidth="0.8" />
      <Line x1="70" y1="44" x2="86" y2="46" stroke={color} strokeWidth="0.8" />
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
  switch (type) {
    case 'straight':
      return (
        <G>
          <Path d="M 68 82 Q 80 72 84 58" stroke={bodyColor} strokeWidth="4" fill="none" strokeLinecap="round" />
          <Circle cx="84" cy="56" r="4" fill={accentColor} />
        </G>
      );
    case 'fluffy':
      return (
        <G>
          <Path d="M 68 82 Q 80 74 86 64 Q 90 56 84 52" stroke={bodyColor} strokeWidth="6" fill="none" strokeLinecap="round" />
          <Circle cx="84" cy="50" r="5" fill={bodyColor} />
          <Circle cx="84" cy="50" r="4" fill={accentColor} opacity={0.3} />
        </G>
      );
    case 'curled':
    default:
      return (
        <G>
          <Path d="M 68 82 Q 84 76 88 64 Q 90 54 85 49" stroke={bodyColor} strokeWidth="4" fill="none" strokeLinecap="round" />
          <Circle cx="85" cy="47" r="4" fill={accentColor} />
        </G>
      );
  }
}

// ─────────────────────────────────────────────────
// Blush (wider for bigger head at r=32)
// ─────────────────────────────────────────────────

export function CatBlush({ color = '#FF9999' }: { color?: string }): ReactElement {
  return (
    <G>
      <Ellipse cx="26" cy="42" rx="6" ry="4" fill={color} opacity={0.3} />
      <Ellipse cx="74" cy="42" rx="6" ry="4" fill={color} opacity={0.3} />
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

/**
 * CatParts — Composable SVG building blocks for unique cat avatars.
 *
 * All parts operate within a 100×100 viewBox coordinate system.
 * Body types, eye shapes, ear styles, and tails can be mixed/matched
 * via catProfiles.ts to give each cat a distinct silhouette.
 */

import type { ReactElement } from 'react';
import { G, Circle, Path, Ellipse, Line, Rect } from 'react-native-svg';
import type { MascotMood } from '../types';

// ─────────────────────────────────────────────────
// Body types
// ─────────────────────────────────────────────────

export type BodyType = 'slim' | 'standard' | 'round' | 'chonky';

export function CatBody({ type, color }: { type: BodyType; color: string }): ReactElement {
  switch (type) {
    case 'slim':
      return <Ellipse cx="50" cy="66" rx="18" ry="20" fill={color} />;
    case 'round':
      return <Ellipse cx="50" cy="66" rx="24" ry="20" fill={color} />;
    case 'chonky':
      return <Ellipse cx="50" cy="68" rx="28" ry="22" fill={color} />;
    case 'standard':
    default:
      return <Ellipse cx="50" cy="65" rx="22" ry="20" fill={color} />;
  }
}

// ─────────────────────────────────────────────────
// Head (with optional cheek fluff)
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
      <Circle cx="50" cy="42" r="22" fill={color} />
      {cheekFluff && (
        <G>
          <Circle cx="30" cy="48" r="5" fill={color} />
          <Circle cx="70" cy="48" r="5" fill={color} />
        </G>
      )}
    </G>
  );
}

// ─────────────────────────────────────────────────
// Ears
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
          <Path d="M 30 32 Q 24 14 38 26" fill={bodyColor} />
          <Path d="M 31 29 Q 26 18 36 25" fill={innerColor} />
          <Path d="M 70 32 Q 76 14 62 26" fill={bodyColor} />
          <Path d="M 69 29 Q 74 18 64 25" fill={innerColor} />
        </G>
      );
    case 'folded':
      return (
        <G>
          <Path d="M 30 30 L 25 15 L 38 25 Z" fill={bodyColor} />
          <Path d="M 31 27 L 27 18 L 36 24 Z" fill={innerColor} />
          <Path d="M 30 24 Q 28 22 33 23" fill={bodyColor} stroke={bodyColor} strokeWidth="1" />
          <Path d="M 70 30 L 75 15 L 62 25 Z" fill={bodyColor} />
          <Path d="M 69 27 L 73 18 L 64 24 Z" fill={innerColor} />
          <Path d="M 70 24 Q 72 22 67 23" fill={bodyColor} stroke={bodyColor} strokeWidth="1" />
        </G>
      );
    case 'pointed':
    default:
      return (
        <G>
          <Path d="M 30 30 L 25 10 L 38 25 Z" fill={bodyColor} />
          <Path d="M 31 27 L 27 14 L 36 24 Z" fill={innerColor} />
          <Path d="M 70 30 L 75 10 L 62 25 Z" fill={bodyColor} />
          <Path d="M 69 27 L 73 14 L 64 24 Z" fill={innerColor} />
        </G>
      );
  }
}

// ─────────────────────────────────────────────────
// Eyes — mood-responsive, with shape variants
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
          d="M 38 34 L 39.5 38 L 43 38 L 40 41 L 41 45 L 38 42.5 L 35 45 L 36 41 L 33 38 L 36.5 38 Z"
          fill="#FFD700"
        />
        <Path
          d="M 62 34 L 63.5 38 L 67 38 L 64 41 L 65 45 L 62 42.5 L 59 45 L 60 41 L 57 38 L 60.5 38 Z"
          fill="#FFD700"
        />
      </G>
    );
  }

  // Happy → arched smile eyes (universal)
  if (mood === 'happy') {
    return (
      <G>
        <Path d="M 36 40 Q 38 36 40 40" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
        <Path d="M 60 40 Q 62 36 64 40" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" />
      </G>
    );
  }

  // Shape-specific rendering for other moods
  const pupilScale = mood === 'excited' ? 1.4 : 1.0;
  const lookDown = mood === 'teaching' ? 1 : 0;

  switch (shape) {
    case 'big-sparkly':
      return (
        <G>
          <Circle cx="38" cy="40" r={6 * pupilScale} fill="#FFFFFF" />
          <Circle cx="38" cy={40 + lookDown} r={3.5 * pupilScale} fill={eyeColor} />
          <Circle cx="38" cy={40 + lookDown} r={1.5} fill="#1A1A1A" />
          <Circle cx="36" cy="38" r={1.5} fill="#FFFFFF" />
          <Circle cx="40" cy="42" r={0.8} fill="#FFFFFF" />
          <Circle cx="62" cy="40" r={6 * pupilScale} fill="#FFFFFF" />
          <Circle cx="62" cy={40 + lookDown} r={3.5 * pupilScale} fill={eyeColor} />
          <Circle cx="62" cy={40 + lookDown} r={1.5} fill="#1A1A1A" />
          <Circle cx="60" cy="38" r={1.5} fill="#FFFFFF" />
          <Circle cx="64" cy="42" r={0.8} fill="#FFFFFF" />
        </G>
      );

    case 'almond':
      return (
        <G>
          <Ellipse cx="38" cy="40" rx={5 * pupilScale} ry={4 * pupilScale} fill="#FFFFFF" />
          <Circle cx="38" cy={40 + lookDown} r={2.5} fill={eyeColor} />
          <Circle cx="38" cy={40 + lookDown} r={1} fill="#1A1A1A" />
          <Circle cx="37" cy="39" r="0.8" fill="#FFFFFF" />
          <Ellipse cx="62" cy="40" rx={5 * pupilScale} ry={4 * pupilScale} fill="#FFFFFF" />
          <Circle cx="62" cy={40 + lookDown} r={2.5} fill={eyeColor} />
          <Circle cx="62" cy={40 + lookDown} r={1} fill="#1A1A1A" />
          <Circle cx="61" cy="39" r="0.8" fill="#FFFFFF" />
        </G>
      );

    case 'sleepy':
      return (
        <G>
          <Ellipse cx="38" cy="41" rx={4 * pupilScale} ry={3 * pupilScale} fill="#FFFFFF" />
          <Circle cx="38" cy={41 + lookDown} r={2} fill={eyeColor} />
          <Circle cx="38" cy={41 + lookDown} r={0.8} fill="#1A1A1A" />
          <Line x1="34" y1="38" x2="42" y2="38" stroke={eyeColor} strokeWidth="1" strokeLinecap="round" />
          <Ellipse cx="62" cy="41" rx={4 * pupilScale} ry={3 * pupilScale} fill="#FFFFFF" />
          <Circle cx="62" cy={41 + lookDown} r={2} fill={eyeColor} />
          <Circle cx="62" cy={41 + lookDown} r={0.8} fill="#1A1A1A" />
          <Line x1="58" y1="38" x2="66" y2="38" stroke={eyeColor} strokeWidth="1" strokeLinecap="round" />
        </G>
      );

    case 'round':
    default:
      return (
        <G>
          <Ellipse cx="38" cy="40" rx={4 * pupilScale} ry={5 * pupilScale} fill="#FFFFFF" />
          <Circle cx="38" cy={40 + lookDown} r={2.5} fill={eyeColor} />
          <Circle cx="38" cy={40 + lookDown} r={1} fill="#1A1A1A" />
          <Circle cx="37" cy="39" r="0.8" fill="#FFFFFF" />
          <Ellipse cx="62" cy="40" rx={4 * pupilScale} ry={5 * pupilScale} fill="#FFFFFF" />
          <Circle cx="62" cy={40 + lookDown} r={2.5} fill={eyeColor} />
          <Circle cx="62" cy={40 + lookDown} r={1} fill="#1A1A1A" />
          <Circle cx="61" cy="39" r="0.8" fill="#FFFFFF" />
        </G>
      );
  }
}

// ─────────────────────────────────────────────────
// Mouth (mood-dependent, universal)
// ─────────────────────────────────────────────────

export function CatMouth({ mood, darkAccent }: { mood: MascotMood; darkAccent: string }): ReactElement {
  switch (mood) {
    case 'happy':
      return (
        <Path d="M 43 54 Q 50 59 57 54" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      );
    case 'encouraging':
      return (
        <Path d="M 44 54 Q 50 57 56 54" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      );
    case 'excited':
      return <Ellipse cx="50" cy="55" rx="5" ry="4" fill={darkAccent} />;
    case 'teaching':
      return (
        <Line x1="44" y1="55" x2="56" y2="55" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      );
    case 'celebrating':
      return (
        <Path d="M 42 53 Q 50 62 58 53" stroke="#FFFFFF" strokeWidth="1.5" fill={darkAccent} strokeLinecap="round" />
      );
  }
}

// ─────────────────────────────────────────────────
// Nose
// ─────────────────────────────────────────────────

export function CatNose({ color }: { color: string }): ReactElement {
  return <Ellipse cx="50" cy="49" rx="3" ry="2" fill={color} />;
}

// ─────────────────────────────────────────────────
// Whiskers
// ─────────────────────────────────────────────────

export function CatWhiskers({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Line x1="20" y1="46" x2="33" y2="48" stroke={color} strokeWidth="1" />
      <Line x1="18" y1="50" x2="33" y2="50" stroke={color} strokeWidth="1" />
      <Line x1="20" y1="54" x2="33" y2="52" stroke={color} strokeWidth="1" />
      <Line x1="67" y1="48" x2="80" y2="46" stroke={color} strokeWidth="1" />
      <Line x1="67" y1="50" x2="82" y2="50" stroke={color} strokeWidth="1" />
      <Line x1="67" y1="52" x2="80" y2="54" stroke={color} strokeWidth="1" />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Tail
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
          <Path
            d="M 72 70 Q 82 55 85 40"
            stroke={bodyColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx="85" cy="38" r="4" fill={accentColor} />
        </G>
      );
    case 'fluffy':
      return (
        <G>
          <Path
            d="M 72 70 Q 82 60 86 50 Q 90 42 84 38"
            stroke={bodyColor}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx="84" cy="36" r="5" fill={bodyColor} />
          <Circle cx="84" cy="36" r="4" fill={accentColor} opacity={0.3} />
        </G>
      );
    case 'curled':
    default:
      return (
        <G>
          <Path
            d="M 72 70 Q 85 65 88 50 Q 90 40 85 35"
            stroke={bodyColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx="85" cy="33" r="4" fill={accentColor} />
        </G>
      );
  }
}

// ─────────────────────────────────────────────────
// Blush (optional cheek circles)
// ─────────────────────────────────────────────────

export function CatBlush({ color = '#FF9999' }: { color?: string }): ReactElement {
  return (
    <G>
      <Circle cx="32" cy="50" r="4" fill={color} opacity={0.3} />
      <Circle cx="68" cy="50" r="4" fill={color} opacity={0.3} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Headphones
// ─────────────────────────────────────────────────

export function CatHeadphones({ color, darkColor }: { color: string; darkColor: string }): ReactElement {
  return (
    <G>
      <Path d="M 28 38 Q 50 22 72 38" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Circle cx="28" cy="40" r="6" fill={color} />
      <Circle cx="28" cy="40" r="4" fill={darkColor} />
      <Circle cx="72" cy="40" r="6" fill={color} />
      <Circle cx="72" cy="40" r="4" fill={darkColor} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Piano-key collar
// ─────────────────────────────────────────────────

export function CatPianoCollar(): ReactElement {
  return (
    <G>
      <Rect x="35" y="58" width="4" height="6" rx="1" fill="#FFFFFF" />
      <Rect x="40" y="58" width="4" height="6" rx="1" fill="#1A1A1A" />
      <Rect x="45" y="58" width="4" height="6" rx="1" fill="#FFFFFF" />
      <Rect x="50" y="58" width="4" height="6" rx="1" fill="#1A1A1A" />
      <Rect x="55" y="58" width="4" height="6" rx="1" fill="#FFFFFF" />
      <Rect x="60" y="58" width="4" height="6" rx="1" fill="#1A1A1A" />
    </G>
  );
}

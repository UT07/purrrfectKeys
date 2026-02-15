import type { ReactElement } from 'react';
import Svg, { G, Circle, Path, Rect, Ellipse, Line } from 'react-native-svg';

import { MASCOT_SIZES } from './types';
import type { MascotMood, MascotSize } from './types';

interface KeysieSvgProps {
  mood: MascotMood;
  size: MascotSize;
}

const BODY_COLOR = '#3A3A3A';
const CRIMSON = '#DC143C';
const DARK_RED = '#8B0000';
const GOLD = '#FFD700';

function renderEyes(mood: MascotMood): ReactElement {
  switch (mood) {
    case 'happy':
      return (
        <G>
          {/* Left eye - crescent smile */}
          <Path
            d="M 36 40 Q 38 36 40 40"
            stroke="#FFFFFF"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          {/* Right eye - crescent smile */}
          <Path
            d="M 60 40 Q 62 36 64 40"
            stroke="#FFFFFF"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </G>
      );

    case 'encouraging':
      return (
        <G>
          {/* Left eye - soft oval */}
          <Ellipse cx="38" cy="40" rx="4" ry="5" fill="#FFFFFF" />
          <Circle cx="38" cy="40" r="2.5" fill="#1A1A1A" />
          <Circle cx="37" cy="39" r="1" fill="#FFFFFF" />
          {/* Right eye - soft oval */}
          <Ellipse cx="62" cy="40" rx="4" ry="5" fill="#FFFFFF" />
          <Circle cx="62" cy="40" r="2.5" fill="#1A1A1A" />
          <Circle cx="61" cy="39" r="1" fill="#FFFFFF" />
        </G>
      );

    case 'excited':
      return (
        <G>
          {/* Left eye - big round */}
          <Circle cx="38" cy="40" r="6" fill="#FFFFFF" />
          <Circle cx="38" cy="40" r="3.5" fill="#1A1A1A" />
          <Circle cx="36" cy="38" r="1.5" fill="#FFFFFF" />
          {/* Right eye - big round */}
          <Circle cx="62" cy="40" r="6" fill="#FFFFFF" />
          <Circle cx="62" cy="40" r="3.5" fill="#1A1A1A" />
          <Circle cx="60" cy="38" r="1.5" fill="#FFFFFF" />
        </G>
      );

    case 'teaching':
      return (
        <G>
          {/* Left eye - wide alert */}
          <Ellipse cx="38" cy="40" rx="5" ry="6" fill="#FFFFFF" />
          <Circle cx="38" cy="41" r="3" fill="#1A1A1A" />
          <Circle cx="37" cy="39" r="1" fill="#FFFFFF" />
          {/* Right eye - wide alert */}
          <Ellipse cx="62" cy="40" rx="5" ry="6" fill="#FFFFFF" />
          <Circle cx="62" cy="41" r="3" fill="#1A1A1A" />
          <Circle cx="61" cy="39" r="1" fill="#FFFFFF" />
        </G>
      );

    case 'celebrating':
      return (
        <G>
          {/* Left eye - star/sparkle */}
          <Path
            d="M 38 34 L 39.5 38 L 43 38 L 40 41 L 41 45 L 38 42.5 L 35 45 L 36 41 L 33 38 L 36.5 38 Z"
            fill={GOLD}
          />
          {/* Right eye - star/sparkle */}
          <Path
            d="M 62 34 L 63.5 38 L 67 38 L 64 41 L 65 45 L 62 42.5 L 59 45 L 60 41 L 57 38 L 60.5 38 Z"
            fill={GOLD}
          />
        </G>
      );
  }
}

function renderMouth(mood: MascotMood): ReactElement {
  switch (mood) {
    case 'happy':
      return (
        <Path
          d="M 43 54 Q 50 59 57 54"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      );

    case 'encouraging':
      return (
        <Path
          d="M 44 54 Q 50 57 56 54"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      );

    case 'excited':
      return (
        <Ellipse cx="50" cy="55" rx="5" ry="4" fill={DARK_RED} />
      );

    case 'teaching':
      return (
        <Line
          x1="44"
          y1="55"
          x2="56"
          y2="55"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      );

    case 'celebrating':
      return (
        <Path
          d="M 42 53 Q 50 62 58 53"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          fill={DARK_RED}
          strokeLinecap="round"
        />
      );
  }
}

export function KeysieSvg({ mood, size }: KeysieSvgProps): ReactElement {
  const px = MASCOT_SIZES[size];

  return (
    <Svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      testID="keysie-svg"
    >
      {/* Tail curving up with eighth-note circle */}
      <Path
        d="M 72 70 Q 85 65 88 50 Q 90 40 85 35"
        stroke={BODY_COLOR}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx="85" cy="33" r="4" fill={CRIMSON} />

      {/* Body - rounded */}
      <Ellipse cx="50" cy="65" rx="22" ry="20" fill={BODY_COLOR} />

      {/* Head - rounded */}
      <Circle cx="50" cy="42" r="22" fill={BODY_COLOR} />

      {/* Left ear */}
      <Path d="M 30 30 L 25 10 L 38 25 Z" fill={BODY_COLOR} />
      <Path d="M 31 27 L 27 14 L 36 24 Z" fill={CRIMSON} />

      {/* Right ear */}
      <Path d="M 70 30 L 75 10 L 62 25 Z" fill={BODY_COLOR} />
      <Path d="M 69 27 L 73 14 L 64 24 Z" fill={CRIMSON} />

      {/* Headphones band */}
      <Path
        d="M 28 38 Q 50 22 72 38"
        stroke={CRIMSON}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Left ear cup */}
      <Circle cx="28" cy="40" r="6" fill={CRIMSON} />
      <Circle cx="28" cy="40" r="4" fill="#2A2A2A" />

      {/* Right ear cup */}
      <Circle cx="72" cy="40" r="6" fill={CRIMSON} />
      <Circle cx="72" cy="40" r="4" fill="#2A2A2A" />

      {/* Piano-key collar */}
      <G>
        <Rect x="35" y="58" width="4" height="6" rx="1" fill="#FFFFFF" />
        <Rect x="40" y="58" width="4" height="6" rx="1" fill="#1A1A1A" />
        <Rect x="45" y="58" width="4" height="6" rx="1" fill="#FFFFFF" />
        <Rect x="50" y="58" width="4" height="6" rx="1" fill="#1A1A1A" />
        <Rect x="55" y="58" width="4" height="6" rx="1" fill="#FFFFFF" />
        <Rect x="60" y="58" width="4" height="6" rx="1" fill="#1A1A1A" />
      </G>

      {/* Whiskers - left side */}
      <Line x1="20" y1="46" x2="33" y2="48" stroke="#888888" strokeWidth="1" />
      <Line x1="18" y1="50" x2="33" y2="50" stroke="#888888" strokeWidth="1" />
      <Line x1="20" y1="54" x2="33" y2="52" stroke="#888888" strokeWidth="1" />

      {/* Whiskers - right side */}
      <Line x1="67" y1="48" x2="80" y2="46" stroke="#888888" strokeWidth="1" />
      <Line x1="67" y1="50" x2="82" y2="50" stroke="#888888" strokeWidth="1" />
      <Line x1="67" y1="52" x2="80" y2="54" stroke="#888888" strokeWidth="1" />

      {/* Nose */}
      <Ellipse cx="50" cy="49" rx="3" ry="2" fill={CRIMSON} />

      {/* Eyes (mood-dependent) */}
      {renderEyes(mood)}

      {/* Mouth (mood-dependent) */}
      {renderMouth(mood)}
    </Svg>
  );
}

import type { ReactElement } from 'react';
import { G, Ellipse, Path } from 'react-native-svg';

export function CatShadows(): ReactElement {
  return (
    <G>
      {/* Ground shadow — soft ellipse */}
      <Ellipse cx="50" cy="96" rx="26" ry="3.5" fill="#000000" opacity={0.10} />
      {/* Head-body junction shadow — follows neck contour */}
      <Path d="M 36 60 Q 50 65 64 60" fill="none" stroke="#000000" strokeWidth="4" opacity={0.06} strokeLinecap="round" />
      {/* Left paw shadow */}
      <Ellipse cx="42" cy="94" rx="6" ry="1.5" fill="#000000" opacity={0.06} />
      {/* Right paw shadow */}
      <Ellipse cx="58" cy="94" rx="6" ry="1.5" fill="#000000" opacity={0.06} />
    </G>
  );
}

/** Rim light — thin bright edge on right side of head and body */
export function CatRimLight(): ReactElement {
  return (
    <G>
      {/* Head rim — right edge arc */}
      <Path d="M 72 20 Q 82 30 78 50" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity={0.12} strokeLinecap="round" />
      {/* Body rim — right edge */}
      <Path d="M 62 72 Q 66 78 64 86" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity={0.08} strokeLinecap="round" />
    </G>
  );
}

/** Fur sheen highlight — light catching fur on head and body */
export function CatFurSheen(): ReactElement {
  return (
    <G>
      {/* Head sheen — upper-left arc */}
      <Path d="M 30 18 Q 40 12 55 15" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity={0.12} strokeLinecap="round" />
      {/* Body sheen — small highlight */}
      <Path d="M 42 72 Q 48 70 54 72" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity={0.08} strokeLinecap="round" />
    </G>
  );
}

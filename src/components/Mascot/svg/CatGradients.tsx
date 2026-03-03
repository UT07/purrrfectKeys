/**
 * CatGradients — Reusable SVG gradient Defs factory.
 *
 * Creates all gradient definitions needed for a cat's painted look.
 * All IDs are prefixed with catId to prevent collisions when
 * multiple cats render on the same screen.
 *
 * Usage: Place inside <Svg> as <CatGradientDefs catId={id} ... />
 * Reference: fill={`url(#${catId}-head)`}
 */

import type { ReactElement } from 'react';
import { Defs, RadialGradient, LinearGradient, Stop } from 'react-native-svg';

function lighten(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r + (255 - r) * factor).toString(16).padStart(2, '0')}${Math.round(g + (255 - g) * factor).toString(16).padStart(2, '0')}${Math.round(b + (255 - b) * factor).toString(16).padStart(2, '0')}`;
}

function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * factor).toString(16).padStart(2, '0')}${Math.round(g * factor).toString(16).padStart(2, '0')}${Math.round(b * factor).toString(16).padStart(2, '0')}`;
}

interface CatGradientDefsProps {
  catId: string;
  bodyColor: string;
  eyeColor: string;
  bellyColor?: string;
  earInnerColor?: string;
}

export function CatGradientDefs({ catId, bodyColor, eyeColor, bellyColor, earInnerColor }: CatGradientDefsProps): ReactElement {
  return (
    <Defs>
      {/* Head sphere gradient — stronger contrast, light upper-left */}
      <RadialGradient id={`${catId}-head`} cx="38%" cy="32%" r="60%">
        <Stop offset="0%" stopColor={lighten(bodyColor, 0.22)} />
        <Stop offset="50%" stopColor={bodyColor} />
        <Stop offset="100%" stopColor={darken(bodyColor, 0.70)} />
      </RadialGradient>

      {/* Body roundness gradient */}
      <RadialGradient id={`${catId}-body`} cx="50%" cy="40%" r="55%">
        <Stop offset="0%" stopColor={lighten(bodyColor, 0.10)} />
        <Stop offset="85%" stopColor={bodyColor} />
        <Stop offset="100%" stopColor={darken(bodyColor, 0.75)} />
      </RadialGradient>

      {/* Iris depth gradient */}
      <RadialGradient id={`${catId}-iris`} cx="45%" cy="40%" r="50%">
        <Stop offset="0%" stopColor={lighten(eyeColor, 0.30)} />
        <Stop offset="60%" stopColor={eyeColor} />
        <Stop offset="100%" stopColor={darken(eyeColor, 0.60)} />
      </RadialGradient>

      {/* Ear gradient (linear top-to-bottom) */}
      <LinearGradient id={`${catId}-ear`} x1="50%" y1="0%" x2="50%" y2="100%">
        <Stop offset="0%" stopColor={lighten(bodyColor, 0.08)} />
        <Stop offset="100%" stopColor={darken(bodyColor, 0.85)} />
      </LinearGradient>

      {/* Tail gradient */}
      <LinearGradient id={`${catId}-tail`} x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor={lighten(bodyColor, 0.05)} />
        <Stop offset="100%" stopColor={darken(bodyColor, 0.80)} />
      </LinearGradient>

      {/* Belly patch — soft lighter area */}
      <RadialGradient id={`${catId}-belly`} cx="50%" cy="45%" r="50%">
        <Stop offset="0%" stopColor={lighten(bellyColor ?? bodyColor, 0.20)} />
        <Stop offset="100%" stopColor={bellyColor ?? lighten(bodyColor, 0.08)} />
      </RadialGradient>

      {/* Nose shine — tiny bright spot */}
      <RadialGradient id={`${catId}-nose`} cx="35%" cy="30%" r="50%">
        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </RadialGradient>

      {/* Paw pad — warm pink-ish */}
      <RadialGradient id={`${catId}-paw`} cx="50%" cy="40%" r="60%">
        <Stop offset="0%" stopColor={lighten(earInnerColor ?? '#FFB0C0', 0.3)} />
        <Stop offset="100%" stopColor={earInnerColor ?? '#FFB0C0'} />
      </RadialGradient>

      {/* Rim light — bright edge on right side */}
      <LinearGradient id={`${catId}-rim`} x1="80%" y1="20%" x2="100%" y2="50%">
        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
        <Stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.08" />
        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.15" />
      </LinearGradient>
    </Defs>
  );
}

/** Gradient ID helpers — use these instead of raw strings */
export function gradId(catId: string, part: 'head' | 'body' | 'iris' | 'ear' | 'tail' | 'belly' | 'nose' | 'paw' | 'rim'): string {
  return `url(#${catId}-${part})`;
}

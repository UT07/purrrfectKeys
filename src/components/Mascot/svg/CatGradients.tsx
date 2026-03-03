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
}

export function CatGradientDefs({ catId, bodyColor, eyeColor }: CatGradientDefsProps): ReactElement {
  return (
    <Defs>
      {/* Head sphere gradient — light upper-left */}
      <RadialGradient id={`${catId}-head`} cx="40%" cy="35%" r="60%">
        <Stop offset="0%" stopColor={lighten(bodyColor, 0.15)} />
        <Stop offset="70%" stopColor={bodyColor} />
        <Stop offset="100%" stopColor={darken(bodyColor, 0.80)} />
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
    </Defs>
  );
}

/** Gradient ID helpers — use these instead of raw strings */
export function gradId(catId: string, part: 'head' | 'body' | 'iris' | 'ear' | 'tail'): string {
  return `url(#${catId}-${part})`;
}

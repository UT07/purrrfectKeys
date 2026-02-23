/**
 * CatAccessories — SVG accessory components for evolution stages.
 *
 * Renders named accessories from catCharacters.ts evolutionVisuals.
 * Each accessory is positioned relative to the 100×100 viewBox.
 */

import type { ReactElement } from 'react';
import { G, Circle, Path, Rect, Line, Defs, RadialGradient, Stop } from 'react-native-svg';

/** Darken a hex color */
function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * factor).toString(16).padStart(2, '0')}${Math.round(g * factor).toString(16).padStart(2, '0')}${Math.round(b * factor).toString(16).padStart(2, '0')}`;
}

/** Lighten a hex color */
function lighten(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r + (255 - r) * factor).toString(16).padStart(2, '0')}${Math.round(g + (255 - g) * factor).toString(16).padStart(2, '0')}${Math.round(b + (255 - b) * factor).toString(16).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────
// Individual accessories
// ─────────────────────────────────────────────────

function BowTie({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path
        d="M 44 58 L 48 55 L 50 58 L 52 55 L 56 58 L 52 61 L 50 58 L 48 61 Z"
        fill={color}
        opacity={0.85}
      />
      <Circle cx="50" cy="58" r="1.5" fill={lighten(color, 0.3)} />
    </G>
  );
}

function Sunglasses({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Rect x="32" y="37" width="12" height="8" rx="2" fill={darken(color, 0.3)} opacity={0.85} />
      <Rect x="56" y="37" width="12" height="8" rx="2" fill={darken(color, 0.3)} opacity={0.85} />
      <Line x1="44" y1="40" x2="56" y2="40" stroke={darken(color, 0.3)} strokeWidth="1.5" />
      <Line x1="32" y1="40" x2="28" y2="38" stroke={darken(color, 0.3)} strokeWidth="1" />
      <Line x1="68" y1="40" x2="72" y2="38" stroke={darken(color, 0.3)} strokeWidth="1" />
    </G>
  );
}

function Crown({ accent }: { accent: string }): ReactElement {
  return (
    <G>
      <Path
        d="M 38 18 L 40 12 L 44 16 L 50 9 L 56 16 L 60 12 L 62 18 Z"
        fill="#FFD700"
        stroke={darken('#FFD700', 0.7)}
        strokeWidth="0.8"
      />
      <Circle cx="44" cy="15" r="1.2" fill={accent} />
      <Circle cx="50" cy="12" r="1.5" fill={lighten(accent, 0.3)} />
      <Circle cx="56" cy="15" r="1.2" fill={accent} />
      <Rect x="38" y="17" width="24" height="2.5" rx="0.5" fill="#FFD700" opacity={0.9} />
    </G>
  );
}

function GemPendant({ accent }: { accent: string }): ReactElement {
  return (
    <G>
      <Line x1="50" y1="59.5" x2="50" y2="63" stroke={accent} strokeWidth="0.8" opacity={0.7} />
      <Path
        d="M 47.5 63 L 50 60.5 L 52.5 63 L 50 66 Z"
        fill={lighten(accent, 0.4)}
        stroke={accent}
        strokeWidth="0.5"
        opacity={0.9}
      />
    </G>
  );
}

function Monocle({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Circle cx="62" cy="40" r="7" stroke={color} strokeWidth="1" fill="none" opacity={0.8} />
      <Line x1="69" y1="40" x2="78" y2="52" stroke={color} strokeWidth="0.8" opacity={0.6} />
    </G>
  );
}

function Beanie({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path d="M 30 28 Q 50 12 70 28" fill={color} opacity={0.9} />
      <Circle cx="50" cy="14" r="3" fill={lighten(color, 0.3)} />
      <Line x1="30" y1="28" x2="70" y2="28" stroke={darken(color, 0.6)} strokeWidth="2" />
    </G>
  );
}

function CapeAccessory({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path
        d="M 32 55 Q 20 70 25 90 Q 50 85 75 90 Q 80 70 68 55"
        fill={color}
        opacity={0.35}
      />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Background aura for evolution stages
// ─────────────────────────────────────────────────

export function EvolutionAura({
  stage,
  accent,
}: {
  stage: 'baby' | 'teen' | 'adult' | 'master';
  accent: string;
}): ReactElement | null {
  if (stage === 'baby' || stage === 'teen') return null;

  if (stage === 'adult') {
    return <Circle cx="50" cy="42" r="28" fill={accent} opacity={0.12} />;
  }

  // master
  return (
    <G>
      <Defs>
        <RadialGradient id="masterAura" cx="50%" cy="40%" r="50%">
          <Stop offset="0%" stopColor={accent} stopOpacity={0.25} />
          <Stop offset="70%" stopColor={accent} stopOpacity={0.08} />
          <Stop offset="100%" stopColor={accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="48" fill="url(#masterAura)" />
      <Circle cx="14" cy="20" r="1.2" fill={accent} opacity={0.7} />
      <Circle cx="86" cy="25" r="1" fill={accent} opacity={0.6} />
      <Circle cx="10" cy="55" r="0.9" fill={accent} opacity={0.5} />
      <Circle cx="90" cy="60" r="1.1" fill={accent} opacity={0.65} />
      <Circle cx="20" cy="85" r="1" fill={accent} opacity={0.55} />
      <Circle cx="80" cy="88" r="1.2" fill={accent} opacity={0.6} />
      <Circle cx="50" cy="6" r="1.3" fill={accent} opacity={0.7} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Render named accessories
// ─────────────────────────────────────────────────

export function renderAccessory(name: string, accent: string): ReactElement | null {
  switch (name) {
    case 'bow-tie':
    case 'accessory-1':
      return <BowTie key={name} color={accent} />;
    case 'sunglasses':
      return <Sunglasses key={name} color={accent} />;
    case 'crown':
    case 'pixel-crown':
    case 'tiny-crown':
      return <Crown key={name} accent={accent} />;
    case 'gem-pendant':
    case 'accessory-2':
      return <GemPendant key={name} accent={accent} />;
    case 'monocle':
      return <Monocle key={name} color={accent} />;
    case 'beanie':
      return <Beanie key={name} color={accent} />;
    case 'cape':
    case 'cape-purple':
    case 'golden-cape':
    case 'royal-robe':
      return <CapeAccessory key={name} color={accent} />;
    case 'scarf':
    case 'pink-bow':
    case 'velvet-ribbon':
    case 'pearl-necklace':
    case 'crescent-collar':
    case 'lightning-collar':
    case 'gold-chain':
      return <BowTie key={name} color={accent} />;
    case 'fedora':
    case 'trilby':
    case 'chef-hat':
      return <Beanie key={name} color={accent} />;
    case 'round-glasses':
    case 'pixel-glasses':
    case 'racing-goggles':
      return <Sunglasses key={name} color={accent} />;
    default:
      return null;
  }
}

/** Render all accessories for a given list */
export function renderAccessories(names: string[], accent: string): ReactElement {
  return (
    <G>
      {names.map((name) => renderAccessory(name, accent))}
    </G>
  );
}

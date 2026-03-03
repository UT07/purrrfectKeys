/**
 * CatAccessories — SVG accessory components for evolution stages.
 *
 * Renders named accessories from catCharacters.ts evolutionVisuals.
 * Each accessory is positioned relative to the 100×100 viewBox.
 */

import type { ReactElement } from 'react';
import { G, Circle, Path, Rect, Ellipse, Line, Defs, RadialGradient, Stop } from 'react-native-svg';

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

function Scarf({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path d="M 36 64 Q 50 60 64 64 Q 65 68 60 70 Q 50 72 40 70 Q 35 68 36 64" fill={color} opacity={0.85} />
      <Path d="M 56 68 Q 58 74 54 80 Q 52 82 50 78" fill={color} opacity={0.75} />
    </G>
  );
}

function Fedora({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path d="M 28 16 Q 50 10 72 16" stroke={darken(color, 0.6)} strokeWidth="2.5" fill="none" />
      <Path d="M 32 16 Q 50 6 68 16" fill={color} />
      <Rect x="30" y="14" width="40" height="3" rx="1" fill={darken(color, 0.7)} />
    </G>
  );
}

function Trilby({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path d="M 30 18 Q 50 12 70 18" stroke={darken(color, 0.6)} strokeWidth="2" fill="none" />
      <Path d="M 34 18 Q 50 8 66 18" fill={color} />
      <Path d="M 34 17 L 66 17" stroke={lighten(color, 0.3)} strokeWidth="1" />
    </G>
  );
}

function PearlNecklace({ _color }: { _color: string }): ReactElement {
  return (
    <G>
      <Circle cx="40" cy="64" r="1.5" fill="#F5F5DC" stroke="#E8E8D0" strokeWidth="0.3" />
      <Circle cx="44" cy="62.5" r="1.5" fill="#F5F5DC" stroke="#E8E8D0" strokeWidth="0.3" />
      <Circle cx="48" cy="62" r="1.5" fill="#F5F5DC" stroke="#E8E8D0" strokeWidth="0.3" />
      <Circle cx="52" cy="62" r="1.5" fill="#F5F5DC" stroke="#E8E8D0" strokeWidth="0.3" />
      <Circle cx="56" cy="62.5" r="1.5" fill="#F5F5DC" stroke="#E8E8D0" strokeWidth="0.3" />
      <Circle cx="60" cy="64" r="1.5" fill="#F5F5DC" stroke="#E8E8D0" strokeWidth="0.3" />
    </G>
  );
}

function GoldChain({ _color }: { _color: string }): ReactElement {
  return (
    <G>
      <Path d="M 38 64 Q 50 60 62 64" stroke="#FFD700" strokeWidth="1.5" fill="none" />
      <Path d="M 47 62 L 50 58 L 53 62 L 50 66 Z" fill="#FFD700" stroke={darken('#FFD700', 0.7)} strokeWidth="0.5" />
    </G>
  );
}

function GoldenHeadphones({ _color }: { _color: string }): ReactElement {
  return (
    <G>
      <Path d="M 20 28 Q 50 10 80 28" stroke="#FFD700" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Ellipse cx="20" cy="30" rx="7" ry="7" fill="#FFD700" />
      <Ellipse cx="20" cy="30" rx="5" ry="5" fill={darken('#FFD700', 0.6)} />
      <Ellipse cx="80" cy="30" rx="7" ry="7" fill="#FFD700" />
      <Ellipse cx="80" cy="30" rx="5" ry="5" fill={darken('#FFD700', 0.6)} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// P2 Accessories — Distinct components
// ─────────────────────────────────────────────────

/** Tall white chef hat */
function ChefHat(): ReactElement {
  return (
    <G>
      <Rect x="38" y="2" width="24" height="14" rx="3" fill="#FFFFFF" />
      <Path d="M 38 4 Q 42 -2 50 -1 Q 58 -2 62 4" fill="#FFFFFF" />
      <Line x1="38" y1="16" x2="62" y2="16" stroke="#E0E0E0" strokeWidth="1.5" />
      <Line x1="38" y1="8" x2="62" y2="8" stroke="#F0F0F0" strokeWidth="0.5" />
      <Line x1="38" y1="12" x2="62" y2="12" stroke="#F0F0F0" strokeWidth="0.5" />
    </G>
  );
}

/** Short curved flat cap */
function FlatCap({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path d="M 28 20 Q 50 8 72 20" fill={color} />
      <Path d="M 24 20 Q 28 18 32 20 Q 28 22 24 20" fill={darken(color, 0.7)} />
      <Line x1="28" y1="20" x2="72" y2="20" stroke={darken(color, 0.6)} strokeWidth="1.5" />
    </G>
  );
}

/** Two circles with bridge — distinct from Sunglasses */
function RoundGlasses({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Circle cx="38" cy="38" r="6" stroke={color} strokeWidth="1" fill="none" />
      <Circle cx="62" cy="38" r="6" stroke={color} strokeWidth="1" fill="none" />
      <Line x1="44" y1="38" x2="56" y2="38" stroke={color} strokeWidth="1" />
      <Line x1="32" y1="37" x2="26" y2="35" stroke={color} strokeWidth="0.8" />
      <Line x1="68" y1="37" x2="74" y2="35" stroke={color} strokeWidth="0.8" />
    </G>
  );
}

/** Pixel art style blocky glasses */
function PixelGlasses({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Rect x="30" y="36" width="14" height="9" fill="none" stroke={color} strokeWidth="1.5" />
      <Rect x="56" y="36" width="14" height="9" fill="none" stroke={color} strokeWidth="1.5" />
      <Line x1="44" y1="40" x2="56" y2="40" stroke={color} strokeWidth="1.5" />
      <Line x1="30" y1="40" x2="24" y2="38" stroke={color} strokeWidth="1.2" />
      <Line x1="70" y1="40" x2="76" y2="38" stroke={color} strokeWidth="1.2" />
    </G>
  );
}

/** Wide wraparound goggles */
function RacingGoggles({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path
        d="M 28 36 Q 50 30 72 36 Q 72 46 50 44 Q 28 46 28 36 Z"
        fill={color}
        opacity={0.6}
      />
      <Path
        d="M 28 36 Q 50 30 72 36 Q 72 46 50 44 Q 28 46 28 36 Z"
        fill="none"
        stroke={darken(color, 0.5)}
        strokeWidth="1"
      />
      <Line x1="28" y1="38" x2="18" y2="36" stroke={darken(color, 0.5)} strokeWidth="1.5" />
      <Line x1="72" y1="38" x2="82" y2="36" stroke={darken(color, 0.5)} strokeWidth="1.5" />
    </G>
  );
}

/** Collar with crescent moon charm */
function CrescentCollar({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path d="M 36 62 Q 50 58 64 62" stroke={color} strokeWidth="2" fill="none" />
      <Path
        d="M 47 64 A 4 4 0 1 1 47 72 A 3 3 0 1 0 47 64"
        fill="#C0C0C0"
        stroke="#A0A0A0"
        strokeWidth="0.5"
      />
    </G>
  );
}

/** Collar with lightning bolt charm */
function LightningCollar(): ReactElement {
  return (
    <G>
      <Path d="M 36 62 Q 50 58 64 62" stroke="#333333" strokeWidth="2" fill="none" />
      <Path
        d="M 49 63 L 52 63 L 50 67 L 53 67 L 48 74 L 50 69 L 47 69 Z"
        fill="#FFD700"
        stroke={darken('#FFD700', 0.7)}
        strokeWidth="0.5"
      />
    </G>
  );
}

/** Wide fabric kimono sash */
function KimonoSash({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path
        d="M 30 62 Q 50 58 70 62 Q 72 68 70 72 Q 50 76 30 72 Q 28 68 30 62"
        fill={color}
        opacity={0.85}
      />
      <Line x1="30" y1="67" x2="70" y2="67" stroke={darken(color, 0.6)} strokeWidth="0.8" />
      <Path
        d="M 64 66 Q 68 70 66 76 Q 64 78 62 74 Q 60 70 64 66"
        fill={darken(color, 0.7)}
        opacity={0.9}
      />
    </G>
  );
}

/** Small bell pendant on cord */
function TempleBell(): ReactElement {
  return (
    <G>
      <Line x1="50" y1="59" x2="50" y2="63" stroke="#8B4513" strokeWidth="1" />
      <Circle cx="50" cy="66" r="3" fill="#FFD700" stroke={darken('#FFD700', 0.7)} strokeWidth="0.5" />
      <Line x1="50" y1="66" x2="50" y2="68.5" stroke={darken('#FFD700', 0.5)} strokeWidth="0.8" />
      <Circle cx="50" cy="68.5" r="0.6" fill={darken('#FFD700', 0.5)} />
    </G>
  );
}

/** Ornate royal robe with ermine trim */
function RoyalRobe({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path
        d="M 28 55 Q 16 70 20 92 Q 50 88 80 92 Q 84 70 72 55"
        fill={color}
        opacity={0.4}
      />
      <Rect x="26" y="53" width="48" height="4" rx="1" fill="#F5F5F5" />
      <Circle cx="32" cy="55" r="0.8" fill="#333333" />
      <Circle cx="38" cy="55" r="0.8" fill="#333333" />
      <Circle cx="44" cy="55" r="0.8" fill="#333333" />
      <Circle cx="56" cy="55" r="0.8" fill="#333333" />
      <Circle cx="62" cy="55" r="0.8" fill="#333333" />
      <Circle cx="68" cy="55" r="0.8" fill="#333333" />
    </G>
  );
}

/** Formal conductor tailcoat */
function ConductorCoat({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path
        d="M 30 56 L 30 86 Q 34 90 38 86 L 38 68 L 62 68 L 62 86 Q 66 90 70 86 L 70 56"
        fill={color}
        opacity={0.5}
      />
      <Path d="M 40 56 L 46 56 L 46 62" fill={darken(color, 0.6)} opacity={0.7} />
      <Path d="M 60 56 L 54 56 L 54 62" fill={darken(color, 0.6)} opacity={0.7} />
      <Circle cx="48" cy="64" r="1" fill="#FFD700" />
      <Circle cx="48" cy="68" r="1" fill="#FFD700" />
      <Circle cx="52" cy="64" r="1" fill="#FFD700" />
      <Circle cx="52" cy="68" r="1" fill="#FFD700" />
    </G>
  );
}

/** Cooking apron */
function Apron(): ReactElement {
  return (
    <G>
      <Path
        d="M 36 56 L 36 88 Q 50 92 64 88 L 64 56"
        fill="#FFFFFF"
        opacity={0.85}
      />
      <Line x1="36" y1="56" x2="42" y2="50" stroke="#FFFFFF" strokeWidth="1.5" />
      <Line x1="64" y1="56" x2="58" y2="50" stroke="#FFFFFF" strokeWidth="1.5" />
      <Rect x="42" y="70" width="16" height="10" rx="2" fill="#F0F0F0" stroke="#E0E0E0" strokeWidth="0.5" />
    </G>
  );
}

/** Small fiddle/violin near body */
function Fiddle({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path
        d="M 72 62 Q 68 58 70 54 Q 74 50 78 54 Q 80 58 76 62 Q 80 66 78 70 Q 74 74 70 70 Q 68 66 72 62"
        fill={darken(color, 0.5)}
        stroke={darken(color, 0.3)}
        strokeWidth="0.5"
      />
      <Line x1="74" y1="52" x2="74" y2="72" stroke={color} strokeWidth="0.4" />
      <Line x1="72" y1="52" x2="72" y2="72" stroke={color} strokeWidth="0.4" />
      <Line x1="80" y1="48" x2="68" y2="76" stroke={lighten(color, 0.3)} strokeWidth="0.6" />
    </G>
  );
}

/** Conductor's baton */
function Baton({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Line x1="68" y1="56" x2="84" y2="40" stroke={color} strokeWidth="1.2" />
      <Circle cx="68" cy="56" r="2" fill={lighten(color, 0.3)} stroke={color} strokeWidth="0.5" />
      <Circle cx="84" cy="40" r="0.8" fill="#FFFFFF" />
    </G>
  );
}

/** Magic wand with star on top */
function CookieWand(): ReactElement {
  return (
    <G>
      <Line x1="28" y1="78" x2="38" y2="52" stroke="#8B4513" strokeWidth="1.5" />
      <Path
        d="M 38 48 L 39.5 52 L 43.5 52 L 40 54.5 L 41.5 58.5 L 38 56 L 34.5 58.5 L 36 54.5 L 32.5 52 L 36.5 52 Z"
        fill="#FFD700"
        stroke={darken('#FFD700', 0.7)}
        strokeWidth="0.5"
      />
    </G>
  );
}

/** Saxophone shape */
function Sax({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path
        d="M 76 48 Q 78 54 76 60 Q 72 68 68 74 Q 66 78 70 80"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Ellipse cx="70" cy="80" rx="4" ry="3" fill={color} />
      <Circle cx="76" cy="48" r="1.5" fill={lighten(color, 0.3)} />
    </G>
  );
}

/** Tiara with gem peaks */
function Tiara({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Path
        d="M 34 18 Q 38 14 42 16 Q 46 12 50 14 Q 54 12 58 16 Q 62 14 66 18"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
      />
      <Circle cx="42" cy="16" r="1.2" fill={lighten(color, 0.4)} stroke={color} strokeWidth="0.4" />
      <Circle cx="50" cy="13.5" r="1.5" fill={lighten(color, 0.4)} stroke={color} strokeWidth="0.4" />
      <Circle cx="58" cy="16" r="1.2" fill={lighten(color, 0.4)} stroke={color} strokeWidth="0.4" />
    </G>
  );
}

// ─────────────────────────────────────────────────
// P3 Effect Accessories
// ─────────────────────────────────────────────────

/** Cluster of pink cherry blossom petals */
function CherryBlossom(): ReactElement {
  return (
    <G>
      <Path d="M 22 18 Q 24 14 26 18 Q 24 20 22 18" fill="#FFB7C5" opacity={0.8} />
      <Path d="M 76 14 Q 78 10 80 14 Q 78 16 76 14" fill="#FFB7C5" opacity={0.7} />
      <Path d="M 18 40 Q 20 36 22 40 Q 20 42 18 40" fill="#FFB7C5" opacity={0.6} />
      <Path d="M 80 32 Q 82 28 84 32 Q 82 34 80 32" fill="#FFB7C5" opacity={0.75} />
      <Path d="M 30 8 Q 32 4 34 8 Q 32 10 30 8" fill="#FFB7C5" opacity={0.65} />
    </G>
  );
}

/** Glowing dots connected by thin lines */
function Constellation({ accent }: { accent: string }): ReactElement {
  const c = accent || '#E8E8FF';
  return (
    <G>
      <Circle cx="18" cy="14" r="1.2" fill={c} opacity={0.8} />
      <Circle cx="28" cy="8" r="1" fill={c} opacity={0.7} />
      <Circle cx="78" cy="12" r="1.1" fill={c} opacity={0.75} />
      <Circle cx="86" cy="22" r="0.9" fill={c} opacity={0.65} />
      <Circle cx="12" cy="50" r="1" fill={c} opacity={0.6} />
      <Line x1="18" y1="14" x2="28" y2="8" stroke={c} strokeWidth="0.4" opacity={0.5} />
      <Line x1="78" y1="12" x2="86" y2="22" stroke={c} strokeWidth="0.4" opacity={0.5} />
      <Line x1="28" y1="8" x2="78" y2="12" stroke={c} strokeWidth="0.3" opacity={0.3} />
    </G>
  );
}

/** Motion lines behind cat */
function SpeedAura({ color }: { color: string }): ReactElement {
  return (
    <G>
      <Line x1="8" y1="40" x2="22" y2="40" stroke={color} strokeWidth="1.5" opacity={0.5} strokeLinecap="round" />
      <Line x1="4" y1="52" x2="20" y2="52" stroke={color} strokeWidth="1.2" opacity={0.4} strokeLinecap="round" />
      <Line x1="6" y1="64" x2="18" y2="64" stroke={color} strokeWidth="1" opacity={0.3} strokeLinecap="round" />
      <Line x1="10" y1="76" x2="20" y2="76" stroke={color} strokeWidth="0.8" opacity={0.25} strokeLinecap="round" />
    </G>
  );
}

/** Candelabra with flames above head */
function Candelabra(): ReactElement {
  return (
    <G>
      <Line x1="40" y1="10" x2="40" y2="3" stroke="#8B4513" strokeWidth="1.2" />
      <Line x1="50" y1="8" x2="50" y2="1" stroke="#8B4513" strokeWidth="1.2" />
      <Line x1="60" y1="10" x2="60" y2="3" stroke="#8B4513" strokeWidth="1.2" />
      <Path d="M 39 2 Q 40 -2 41 2 Q 40 1 39 2" fill="#FFA500" />
      <Path d="M 49 0 Q 50 -4 51 0 Q 50 -1 49 0" fill="#FFA500" />
      <Path d="M 59 2 Q 60 -2 61 2 Q 60 1 59 2" fill="#FFA500" />
      <Path d="M 39.5 1 Q 40 -1 40.5 1" fill="#FFFF00" opacity={0.8} />
      <Path d="M 49.5 -1 Q 50 -3 50.5 -1" fill="#FFFF00" opacity={0.8} />
      <Path d="M 59.5 1 Q 60 -1 60.5 1" fill="#FFFF00" opacity={0.8} />
    </G>
  );
}

/** Piano bench below cat */
function PianoThrone(): ReactElement {
  return (
    <G>
      <Rect x="30" y="92" width="40" height="4" rx="1" fill="#5C3317" />
      <Rect x="32" y="91" width="36" height="2" rx="1" fill="#8B4513" />
      <Line x1="34" y1="96" x2="34" y2="100" stroke="#5C3317" strokeWidth="2" />
      <Line x1="66" y1="96" x2="66" y2="100" stroke="#5C3317" strokeWidth="2" />
      <Line x1="42" y1="96" x2="42" y2="99" stroke="#5C3317" strokeWidth="1.5" />
      <Line x1="58" y1="96" x2="58" y2="99" stroke="#5C3317" strokeWidth="1.5" />
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
    // Bow ties & ribbons (intentional recolors)
    case 'bow-tie':
    case 'accessory-1':
    case 'pink-bow':
    case 'velvet-ribbon':
      return <BowTie key={name} color={accent} />;
    case 'scarf':
      return <Scarf key={name} color={accent} />;

    // Eyewear
    case 'sunglasses':
      return <Sunglasses key={name} color={accent} />;
    case 'round-glasses':
      return <RoundGlasses key={name} color={accent} />;
    case 'pixel-glasses':
      return <PixelGlasses key={name} color={accent} />;
    case 'racing-goggles':
      return <RacingGoggles key={name} color={accent} />;
    case 'monocle':
      return <Monocle key={name} color={accent} />;

    // Crowns & tiaras
    case 'crown':
    case 'pixel-crown':
    case 'tiny-crown':
      return <Crown key={name} accent={accent} />;
    case 'tiara':
    case 'tiara-gold':
      return <Tiara key={name} color="#FFD700" />;
    case 'tiara-silver':
      return <Tiara key={name} color="#C0C0C0" />;

    // Hats
    case 'beanie':
      return <Beanie key={name} color={accent} />;
    case 'fedora':
      return <Fedora key={name} color={accent} />;
    case 'trilby':
      return <Trilby key={name} color={accent} />;
    case 'chef-hat':
      return <ChefHat key={name} />;
    case 'flat-cap':
      return <FlatCap key={name} color={accent} />;

    // Neckwear & pendants
    case 'gem-pendant':
    case 'accessory-2':
      return <GemPendant key={name} accent={accent} />;
    case 'pearl-necklace':
      return <PearlNecklace key={name} _color={accent} />;
    case 'gold-chain':
      return <GoldChain key={name} _color={accent} />;
    case 'crescent-collar':
      return <CrescentCollar key={name} color={accent} />;
    case 'lightning-collar':
      return <LightningCollar key={name} />;
    case 'kimono-sash':
      return <KimonoSash key={name} color={accent} />;
    case 'temple-bell':
      return <TempleBell key={name} />;
    case 'golden-headphones':
      return <GoldenHeadphones key={name} _color={accent} />;

    // Capes & coats (cape/cape-purple are intentional recolors)
    case 'cape':
    case 'cape-purple':
    case 'royal-cape-white':
      return <CapeAccessory key={name} color={accent} />;
    case 'golden-cape':
      return <CapeAccessory key={name} color="#FFD700" />;
    case 'royal-robe':
      return <RoyalRobe key={name} color={accent} />;
    case 'conductor-coat':
      return <ConductorCoat key={name} color={accent} />;
    case 'apron':
      return <Apron key={name} />;

    // Instruments & wands
    case 'fiddle':
      return <Fiddle key={name} color={accent} />;
    case 'baton':
      return <Baton key={name} color={accent} />;
    case 'cookie-wand':
      return <CookieWand key={name} />;
    case 'sax':
      return <Sax key={name} color={accent} />;

    // P3 effects
    case 'cherry-blossom':
      return <CherryBlossom key={name} />;
    case 'constellation':
      return <Constellation key={name} accent={accent} />;
    case 'speed-aura':
      return <SpeedAura key={name} color={accent} />;
    case 'candelabra':
      return <Candelabra key={name} />;
    case 'piano-throne':
      return <PianoThrone key={name} />;

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

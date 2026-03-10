/**
 * CatAccessories — Production-quality SVG accessory components.
 *
 * Renders named accessories positioned in the 100×100 viewBox.
 * Every piece uses gradients, highlights, and depth for premium feel.
 */

import type { ReactElement } from 'react';
import { G, Circle, Path, Rect, Ellipse, Line, Defs, RadialGradient, LinearGradient, Stop } from 'react-native-svg';

// ─── Color utilities ─────────────────────────────────
function darken(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * factor).toString(16).padStart(2, '0')}${Math.round(g * factor).toString(16).padStart(2, '0')}${Math.round(b * factor).toString(16).padStart(2, '0')}`;
}

function lighten(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r + (255 - r) * factor).toString(16).padStart(2, '0')}${Math.round(g + (255 - g) * factor).toString(16).padStart(2, '0')}${Math.round(b + (255 - b) * factor).toString(16).padStart(2, '0')}`;
}

let _gradId = 0;
function uid(prefix: string): string {
  return `${prefix}-${++_gradId}`;
}

// ─────────────────────────────────────────────────
// HATS
// ─────────────────────────────────────────────────

function BowTie({ color }: { color: string }): ReactElement {
  const id = uid('bowtie');
  return (
    <G>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.3)} />
          <Stop offset="100%" stopColor={darken(color, 0.7)} />
        </LinearGradient>
      </Defs>
      {/* Left wing — at cat neck junction y≈50 */}
      <Path d="M 43 48 Q 38 45 40 50 Q 38 55 43 52 L 48 50 Z"
        fill={`url(#${id})`} />
      {/* Right wing */}
      <Path d="M 57 48 Q 62 45 60 50 Q 62 55 57 52 L 52 50 Z"
        fill={`url(#${id})`} />
      {/* Center knot */}
      <Ellipse cx="50" cy="50" rx="2.5" ry="2" fill={darken(color, 0.5)} />
      <Ellipse cx="49.5" cy="49.5" rx="1.5" ry="1" fill={lighten(color, 0.5)} opacity={0.6} />
      {/* Fabric fold lines */}
      <Path d="M 44 47.5 Q 46 49 44 51" stroke={darken(color, 0.4)} strokeWidth="0.3" fill="none" />
      <Path d="M 56 47.5 Q 54 49 56 51" stroke={darken(color, 0.4)} strokeWidth="0.3" fill="none" />
    </G>
  );
}

function Crown({ accent }: { accent: string }): ReactElement {
  const gid = uid('crown');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFF0A0" />
          <Stop offset="50%" stopColor="#FFD700" />
          <Stop offset="100%" stopColor="#CC9B00" />
        </LinearGradient>
        <RadialGradient id={`${gid}-gem`} cx="50%" cy="40%" r="50%">
          <Stop offset="0%" stopColor={lighten(accent, 0.6)} />
          <Stop offset="100%" stopColor={accent} />
        </RadialGradient>
      </Defs>
      {/* Crown body */}
      <Path d="M 36 19 L 38 10 L 42 15 L 46 8 L 50 6 L 54 8 L 58 15 L 62 10 L 64 19 Z"
        fill={`url(#${gid})`} stroke="#B8860B" strokeWidth="0.5" />
      {/* Crown base band */}
      <Rect x="36" y="18" width="28" height="3" rx="0.5" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
      {/* Gem details with sparkle */}
      <Ellipse cx="43" cy="15" rx="1.8" ry="1.5" fill={`url(#${gid}-gem)`} />
      <Circle cx="50" cy="10" r="2.2" fill={`url(#${gid}-gem)`} />
      <Ellipse cx="57" cy="15" rx="1.8" ry="1.5" fill={`url(#${gid}-gem)`} />
      {/* Gem sparkle highlights */}
      <Circle cx="49.2" cy="9.2" r="0.6" fill="#FFFFFF" opacity={0.8} />
      <Circle cx="42.5" cy="14.5" r="0.4" fill="#FFFFFF" opacity={0.7} />
      <Circle cx="56.5" cy="14.5" r="0.4" fill="#FFFFFF" opacity={0.7} />
      {/* Crown point tips — tiny circles for polish */}
      <Circle cx="38" cy="10" r="0.5" fill="#FFF8DC" />
      <Circle cx="50" cy="6" r="0.6" fill="#FFF8DC" />
      <Circle cx="62" cy="10" r="0.5" fill="#FFF8DC" />
      {/* Metallic highlight line */}
      <Path d="M 38 17 Q 50 15.5 62 17" stroke="#FFF8DC" strokeWidth="0.4" fill="none" opacity={0.5} />
    </G>
  );
}

function Beanie({ color }: { color: string }): ReactElement {
  const gid = uid('beanie');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.35)} />
          <Stop offset="60%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.7)} />
        </LinearGradient>
        <RadialGradient id={`${gid}-pom`} cx="45%" cy="35%" r="55%">
          <Stop offset="0%" stopColor={lighten(color, 0.6)} />
          <Stop offset="60%" stopColor={lighten(color, 0.3)} />
          <Stop offset="100%" stopColor={color} />
        </RadialGradient>
      </Defs>
      {/* Hat body — with crown highlight */}
      <Path d="M 30 28 Q 36 18 50 14 Q 64 18 70 28 Z" fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      {/* Crown highlight */}
      <Path d="M 40 20 Q 50 16 60 20" stroke={lighten(color, 0.25)} strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Knit panel lines — vertical for cable knit effect */}
      <Path d="M 42 17 L 40 27" stroke={darken(color, 0.5)} strokeWidth="0.3" fill="none" opacity={0.25} />
      <Path d="M 50 15 L 50 26" stroke={darken(color, 0.5)} strokeWidth="0.3" fill="none" opacity={0.25} />
      <Path d="M 58 17 L 60 27" stroke={darken(color, 0.5)} strokeWidth="0.3" fill="none" opacity={0.25} />
      {/* Pompom — fluffier with multiple highlights */}
      <Circle cx="50" cy="13" r="4.5" fill={`url(#${gid}-pom)`} stroke={darken(color, 0.4)} strokeWidth="0.3" />
      <Circle cx="48" cy="11" r="1.5" fill={lighten(color, 0.6)} opacity={0.5} />
      <Circle cx="52" cy="12" r="1" fill={lighten(color, 0.5)} opacity={0.3} />
      <Circle cx="49" cy="15" r="0.8" fill={lighten(color, 0.4)} opacity={0.25} />
      {/* Knit ribbing band — thicker with texture */}
      <Path d="M 30 28 Q 50 24 70 28" stroke={darken(color, 0.5)} strokeWidth="3.5" fill="none" />
      <Path d="M 31 27 Q 50 23.5 69 27" stroke={lighten(color, 0.15)} strokeWidth="0.5" fill="none" opacity={0.3} />
      {/* Knit V-pattern texture — more visible */}
      <Path d="M 34 26 Q 36 23 38 26" stroke={darken(color, 0.6)} strokeWidth="0.5" fill="none" opacity={0.4} />
      <Path d="M 42 24 Q 44 21 46 24" stroke={darken(color, 0.6)} strokeWidth="0.5" fill="none" opacity={0.4} />
      <Path d="M 50 23 Q 52 20 54 23" stroke={darken(color, 0.6)} strokeWidth="0.5" fill="none" opacity={0.4} />
      <Path d="M 58 24 Q 60 21 62 24" stroke={darken(color, 0.6)} strokeWidth="0.5" fill="none" opacity={0.4} />
      <Path d="M 66 26 Q 64 23 62 26" stroke={darken(color, 0.6)} strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Brand tag */}
      <Rect x="64" y="25" width="3" height="2" rx="0.3" fill={lighten(color, 0.2)} stroke={darken(color, 0.4)} strokeWidth="0.2" opacity={0.5} />
    </G>
  );
}

function Fedora({ color }: { color: string }): ReactElement {
  const gid = uid('fedora');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.25)} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.65)} />
        </LinearGradient>
      </Defs>
      {/* Brim shadow */}
      <Ellipse cx="50" cy="19" rx="24" ry="4.5" fill={darken(color, 0.6)} opacity={0.3} />
      {/* Hat brim */}
      <Ellipse cx="50" cy="18" rx="24" ry="4" fill={darken(color, 0.5)} stroke={darken(color, 0.6)} strokeWidth="0.3" />
      <Ellipse cx="50" cy="17.5" rx="23" ry="3.5" fill={`url(#${gid})`} />
      {/* Brim edge highlight */}
      <Path d="M 27 17 Q 50 13 73 17" stroke={lighten(color, 0.2)} strokeWidth="0.4" fill="none" opacity={0.3} />
      {/* Crown (dome) */}
      <Path d="M 32 18 Q 34 6 50 4 Q 66 6 68 18" fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      {/* Crown silk highlight */}
      <Path d="M 40 8 Q 46 5 52 8" stroke={lighten(color, 0.3)} strokeWidth="0.6" fill="none" opacity={0.4} />
      <Path d="M 44 6 Q 48 4 50 6" stroke={lighten(color, 0.35)} strokeWidth="0.3" fill="none" opacity={0.25} />
      {/* Pinch crease */}
      <Path d="M 44 6 Q 50 9 56 6" stroke={darken(color, 0.4)} strokeWidth="0.6" fill="none" />
      {/* Band — richer with texture */}
      <Rect x="32" y="14" width="36" height="3.5" rx="0.5" fill={darken(color, 0.35)} stroke={darken(color, 0.45)} strokeWidth="0.3" />
      <Rect x="32" y="14.5" width="36" height="1.2" fill={lighten(color, 0.1)} opacity={0.3} />
      {/* Band stitching */}
      <Line x1="33" y1="17" x2="67" y2="17" stroke={darken(color, 0.5)} strokeWidth="0.3" strokeDasharray="1.5 1" opacity={0.3} />
      {/* Feather tucked in band */}
      <Path d="M 62 14 Q 68 10 66 2 Q 64 6 62 10" stroke={lighten(color, 0.3)} strokeWidth="0.6" fill="none" opacity={0.4} />
      <Path d="M 63 14 Q 67 8 66 4" stroke={lighten(color, 0.4)} strokeWidth="0.3" fill="none" opacity={0.3} />
      {/* Feather quill */}
      <Line x1="64" y1="14" x2="66" y2="3" stroke={darken(color, 0.3)} strokeWidth="0.25" opacity={0.3} />
    </G>
  );
}

function Trilby({ color }: { color: string }): ReactElement {
  const gid = uid('trilby');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.25)} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.65)} />
        </LinearGradient>
      </Defs>
      {/* Brim shadow */}
      <Ellipse cx="50" cy="20" rx="21" ry="4" fill={darken(color, 0.6)} opacity={0.4} />
      {/* Brim */}
      <Ellipse cx="50" cy="19" rx="21" ry="4" fill={darken(color, 0.5)} stroke={darken(color, 0.6)} strokeWidth="0.3" />
      <Ellipse cx="50" cy="18.5" rx="20" ry="3.5" fill={`url(#${gid})`} />
      {/* Crown */}
      <Path d="M 34 19 Q 38 6 50 4 Q 62 6 66 19" fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      {/* Pinch crease */}
      <Path d="M 44 7 Q 50 10 56 7" stroke={darken(color, 0.4)} strokeWidth="0.5" fill="none" />
      {/* Band — with pattern */}
      <Rect x="34" y="14" width="32" height="3.5" rx="0.5" fill={lighten(color, 0.25)} stroke={darken(color, 0.3)} strokeWidth="0.3" />
      {/* Band pattern — subtle stripes */}
      <Line x1="38" y1="14" x2="38" y2="17.5" stroke={darken(color, 0.3)} strokeWidth="0.3" opacity={0.3} />
      <Line x1="46" y1="14" x2="46" y2="17.5" stroke={darken(color, 0.3)} strokeWidth="0.3" opacity={0.3} />
      <Line x1="54" y1="14" x2="54" y2="17.5" stroke={darken(color, 0.3)} strokeWidth="0.3" opacity={0.3} />
      <Line x1="62" y1="14" x2="62" y2="17.5" stroke={darken(color, 0.3)} strokeWidth="0.3" opacity={0.3} />
      {/* Band highlight */}
      <Path d="M 36 15 Q 50 14 64 15" stroke={lighten(color, 0.4)} strokeWidth="0.4" fill="none" opacity={0.5} />
      {/* Crown highlight */}
      <Path d="M 42 8 Q 50 5 58 8" stroke={lighten(color, 0.35)} strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Feather tuck in band */}
      <Path d="M 62 14 Q 66 10 64 6" stroke={lighten(color, 0.3)} strokeWidth="0.5" fill="none" opacity={0.3} />
    </G>
  );
}

function ChefHat(): ReactElement {
  const gid = uid('chef');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="40%" stopColor="#FAFAFA" />
          <Stop offset="100%" stopColor="#E0E0E0" />
        </LinearGradient>
      </Defs>
      {/* Puffed top — bigger billowy mushroom cloud */}
      <Path d="M 36 6 Q 32 -2 40 -5 Q 46 -7 50 -6 Q 54 -7 60 -5 Q 68 -2 64 6"
        fill="#FFFFFF" stroke="#E8E8E8" strokeWidth="0.3" />
      {/* Extra puff lobes */}
      <Path d="M 38 2 Q 34 -4 42 -5 Q 48 -4 44 0" fill="#FEFEFE" />
      <Path d="M 62 2 Q 66 -4 58 -5 Q 52 -4 56 0" fill="#FEFEFE" />
      {/* Puff highlight */}
      <Path d="M 42 -3 Q 50 -5 58 -3" stroke="#FFFFFF" strokeWidth="0.5" fill="none" opacity={0.6} />
      {/* Puff shadow folds */}
      <Path d="M 40 -2 Q 44 0 42 3" stroke="#E8E8E8" strokeWidth="0.4" fill="none" opacity={0.4} />
      <Path d="M 58 -2 Q 56 0 57 3" stroke="#E8E8E8" strokeWidth="0.4" fill="none" opacity={0.4} />
      {/* Main body */}
      <Rect x="36" y="2" width="28" height="14" rx="3" fill={`url(#${gid})`} stroke="#E0E0E0" strokeWidth="0.3" />
      {/* Pleats — with shadow depth */}
      <Path d="M 42 4 L 42 14" stroke="#ECECEC" strokeWidth="0.8" />
      <Path d="M 42.5 4 L 42.5 14" stroke="#F8F8F8" strokeWidth="0.3" opacity={0.5} />
      <Path d="M 50 3 L 50 14" stroke="#ECECEC" strokeWidth="0.8" />
      <Path d="M 50.5 3 L 50.5 14" stroke="#F8F8F8" strokeWidth="0.3" opacity={0.5} />
      <Path d="M 58 4 L 58 14" stroke="#ECECEC" strokeWidth="0.8" />
      <Path d="M 58.5 4 L 58.5 14" stroke="#F8F8F8" strokeWidth="0.3" opacity={0.5} />
      {/* Fabric shadow curve */}
      <Path d="M 38 8 Q 50 10 62 8" stroke="#DCDCDC" strokeWidth="0.5" fill="none" />
      {/* Band — thicker with stitching */}
      <Rect x="35" y="15" width="30" height="3.5" rx="0.5" fill="#EEEEEE" stroke="#D8D8D8" strokeWidth="0.5" />
      <Line x1="36" y1="16.5" x2="64" y2="16.5" stroke="#E0E0E0" strokeWidth="0.3" strokeDasharray="1.5 1" opacity={0.5} />
      {/* Band highlight */}
      <Path d="M 37 15.5 Q 50 15 63 15.5" stroke="#FFFFFF" strokeWidth="0.3" fill="none" opacity={0.5} />
    </G>
  );
}

function FlatCap({ color }: { color: string }): ReactElement {
  const gid = uid('flatcap');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.25)} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.65)} />
        </LinearGradient>
      </Defs>
      {/* Visor shadow */}
      <Path d="M 19 22 Q 23 17 31 20 L 29 23 Q 23 25 19 22 Z"
        fill={darken(color, 0.6)} opacity={0.3} />
      {/* Visor — extended brim with detail */}
      <Path d="M 20 21 Q 24 16 32 19 L 30 22 Q 24 24 20 21 Z"
        fill={darken(color, 0.5)} stroke={darken(color, 0.6)} strokeWidth="0.5" />
      {/* Visor edge highlight */}
      <Path d="M 22 20 Q 26 17 30 19" stroke={lighten(color, 0.15)} strokeWidth="0.4" fill="none" opacity={0.3} />
      {/* Visor stitching */}
      <Path d="M 23 20 Q 26 18 29 20" stroke={darken(color, 0.6)} strokeWidth="0.3" fill="none" strokeDasharray="1 0.8" opacity={0.3} />
      {/* Crown — fuller shape */}
      <Path d="M 28 21 Q 40 6 50 6 Q 60 6 72 21 Z" fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.5" />
      {/* Crown highlight */}
      <Path d="M 36 12 Q 50 7 64 12" stroke={lighten(color, 0.3)} strokeWidth="0.6" fill="none" opacity={0.4} />
      <Path d="M 42 9 Q 50 6 58 9" stroke={lighten(color, 0.35)} strokeWidth="0.3" fill="none" opacity={0.25} />
      {/* Band — thicker */}
      <Path d="M 28 21 Q 50 18 72 21" stroke={darken(color, 0.5)} strokeWidth="2.5" fill="none" />
      <Path d="M 30 20 Q 50 17.5 70 20" stroke={lighten(color, 0.1)} strokeWidth="0.4" fill="none" opacity={0.3} />
      {/* Top button — with shine */}
      <Circle cx="50" cy="8" r="1.5" fill={darken(color, 0.4)} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      <Circle cx="49.5" cy="7.5" r="0.4" fill={lighten(color, 0.3)} opacity={0.5} />
      {/* Fabric panels — stitching lines */}
      <Path d="M 40 8 Q 42 14 40 20" stroke={darken(color, 0.4)} strokeWidth="0.4" fill="none" opacity={0.4} />
      <Path d="M 50 7 Q 50 14 50 20" stroke={darken(color, 0.4)} strokeWidth="0.3" fill="none" opacity={0.3} />
      <Path d="M 58 8 Q 56 14 58 20" stroke={darken(color, 0.4)} strokeWidth="0.4" fill="none" opacity={0.4} />
      {/* Tweed texture dots */}
      <Circle cx="36" cy="16" r="0.3" fill={darken(color, 0.5)} opacity={0.15} />
      <Circle cx="44" cy="12" r="0.3" fill={darken(color, 0.5)} opacity={0.15} />
      <Circle cx="56" cy="12" r="0.3" fill={darken(color, 0.5)} opacity={0.15} />
      <Circle cx="64" cy="16" r="0.3" fill={darken(color, 0.5)} opacity={0.15} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// EYEWEAR
// ─────────────────────────────────────────────────

function Sunglasses({ color }: { color: string }): ReactElement {
  const gid = uid('shades');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={darken(color, 0.2)} />
          <Stop offset="40%" stopColor={darken(color, 0.4)} />
          <Stop offset="100%" stopColor={darken(color, 0.7)} />
        </LinearGradient>
      </Defs>
      {/* Lens shadow */}
      <Path d="M 30 31 Q 30 27 38 27 Q 46 27 46 31 Q 46 39 40 41 Q 32 41 30 37 Z"
        fill={darken(color, 0.6)} opacity={0.2} />
      <Path d="M 54 31 Q 54 27 62 27 Q 70 27 70 31 Q 70 39 64 41 Q 56 41 54 37 Z"
        fill={darken(color, 0.6)} opacity={0.2} />
      {/* Left lens — aviator teardrop */}
      <Path d="M 30 30 Q 30 26 38 26 Q 46 26 46 30 Q 46 38 40 40 Q 32 40 30 36 Z"
        fill={`url(#${gid})`} stroke={darken(color, 0.4)} strokeWidth="1" />
      {/* Right lens */}
      <Path d="M 54 30 Q 54 26 62 26 Q 70 26 70 30 Q 70 38 64 40 Q 56 40 54 36 Z"
        fill={`url(#${gid})`} stroke={darken(color, 0.4)} strokeWidth="1" />
      {/* Lens shine — prominent multi-line */}
      <Path d="M 32 28 Q 38 25 44 28" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity={0.4} />
      <Path d="M 34 30 Q 38 28 42 30" stroke="#FFFFFF" strokeWidth="0.4" fill="none" opacity={0.2} />
      <Path d="M 56 28 Q 62 25 68 28" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity={0.4} />
      <Path d="M 58 30 Q 62 28 66 30" stroke="#FFFFFF" strokeWidth="0.4" fill="none" opacity={0.2} />
      {/* Lens sparkle dots */}
      <Circle cx="33" cy="29" r="0.5" fill="#FFFFFF" opacity={0.5} />
      <Circle cx="57" cy="29" r="0.5" fill="#FFFFFF" opacity={0.5} />
      {/* Bridge — metallic with detail */}
      <Path d="M 46 32 Q 50 29 54 32" stroke={darken(color, 0.3)} strokeWidth="2" fill="none" />
      <Path d="M 47 31 Q 50 29.5 53 31" stroke={lighten(color, 0.15)} strokeWidth="0.4" fill="none" opacity={0.3} />
      {/* Arms — thick with spring hinge */}
      <Path d="M 30 30 Q 26 26 22 18" stroke={darken(color, 0.4)} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M 70 30 Q 74 26 78 18" stroke={darken(color, 0.4)} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Hinge detail */}
      <Circle cx="30" cy="30" r="1" fill={darken(color, 0.3)} />
      <Circle cx="70" cy="30" r="1" fill={darken(color, 0.3)} />
      <Circle cx="29.5" cy="29.5" r="0.3" fill={lighten(color, 0.2)} opacity={0.4} />
      <Circle cx="69.5" cy="29.5" r="0.3" fill={lighten(color, 0.2)} opacity={0.4} />
    </G>
  );
}

function RoundGlasses({ color }: { color: string }): ReactElement {
  const gid = uid('roundgl');
  return (
    <G>
      <Defs>
        <RadialGradient id={gid} cx="30%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor={lighten(color, 0.4)} />
        </RadialGradient>
      </Defs>
      {/* Left lens — over left eye */}
      <Circle cx="38" cy="35" r="7.5" stroke={darken(color, 0.3)} strokeWidth="1.5" fill="none" />
      <Circle cx="38" cy="35" r="6.8" fill={`url(#${gid})`} opacity={0.1} />
      {/* Lens shine — arc + dot */}
      <Path d="M 33 31 Q 38 28 43 31" stroke="#FFFFFF" strokeWidth="0.7" fill="none" opacity={0.4} />
      <Circle cx="34" cy="32" r="0.6" fill="#FFFFFF" opacity={0.5} />
      {/* Nose pad */}
      <Circle cx="44" cy="37" r="0.8" fill={lighten(color, 0.3)} opacity={0.3} />
      {/* Right lens */}
      <Circle cx="62" cy="35" r="7.5" stroke={darken(color, 0.3)} strokeWidth="1.5" fill="none" />
      <Circle cx="62" cy="35" r="6.8" fill={`url(#${gid})`} opacity={0.1} />
      <Path d="M 57 31 Q 62 28 67 31" stroke="#FFFFFF" strokeWidth="0.7" fill="none" opacity={0.4} />
      <Circle cx="58" cy="32" r="0.6" fill="#FFFFFF" opacity={0.5} />
      <Circle cx="56" cy="37" r="0.8" fill={lighten(color, 0.3)} opacity={0.3} />
      {/* Bridge — thicker with decorative keyhole */}
      <Path d="M 45 34 Q 50 31 55 34" stroke={color} strokeWidth="1.3" fill="none" />
      <Circle cx="50" cy="32.5" r="1" fill="none" stroke={color} strokeWidth="0.5" />
      {/* Arms — thicker with end tips */}
      <Path d="M 31 34 Q 26 28 22 22" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Path d="M 69 34 Q 74 28 78 22" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Circle cx="22" cy="22" r="0.8" fill={color} opacity={0.5} />
      <Circle cx="78" cy="22" r="0.8" fill={color} opacity={0.5} />
      {/* Frame highlight shimmer */}
      <Path d="M 32 30 Q 38 28 44 30" stroke={lighten(color, 0.3)} strokeWidth="0.3" fill="none" opacity={0.3} />
      <Path d="M 56 30 Q 62 28 68 30" stroke={lighten(color, 0.3)} strokeWidth="0.3" fill="none" opacity={0.3} />
    </G>
  );
}

function PixelGlasses({ color }: { color: string }): ReactElement {
  return (
    <G>
      {/* Frame shadow */}
      <Rect x="28" y="31" width="16" height="11" fill={darken(color, 0.5)} opacity={0.2} />
      <Rect x="56" y="31" width="16" height="11" fill={darken(color, 0.5)} opacity={0.2} />
      {/* Frames — chunky pixel style */}
      <Rect x="28" y="30" width="16" height="11" fill="none"
        stroke={color} strokeWidth="2" />
      <Rect x="56" y="30" width="16" height="11" fill="none"
        stroke={color} strokeWidth="2" />
      {/* Tinted lenses — gradient effect via stacked rects */}
      <Rect x="29" y="31" width="14" height="9" fill={darken(color, 0.3)} opacity={0.2} />
      <Rect x="29" y="31" width="14" height="4" fill={darken(color, 0.4)} opacity={0.1} />
      <Rect x="57" y="31" width="14" height="9" fill={darken(color, 0.3)} opacity={0.2} />
      <Rect x="57" y="31" width="14" height="4" fill={darken(color, 0.4)} opacity={0.1} />
      {/* Bridge — chunky */}
      <Rect x="44" y="33.5" width="12" height="3" fill={color} />
      <Rect x="44" y="34" width="12" height="1" fill={lighten(color, 0.2)} opacity={0.3} />
      {/* Arms — thick pixel style */}
      <Path d="M 28 35 Q 23 29 20 23" stroke={color} strokeWidth="2" fill="none" />
      <Path d="M 72 35 Q 77 29 80 23" stroke={color} strokeWidth="2" fill="none" />
      {/* Pixel shine blocks — 8-bit style */}
      <Rect x="30" y="32" width="3" height="2" fill="#FFFFFF" opacity={0.35} />
      <Rect x="34" y="32" width="2" height="1" fill="#FFFFFF" opacity={0.2} />
      <Rect x="58" y="32" width="3" height="2" fill="#FFFFFF" opacity={0.35} />
      <Rect x="62" y="32" width="2" height="1" fill="#FFFFFF" opacity={0.2} />
      {/* Inner frame detail */}
      <Rect x="30" y="38" width="12" height="1" fill={darken(color, 0.3)} opacity={0.15} />
      <Rect x="58" y="38" width="12" height="1" fill={darken(color, 0.3)} opacity={0.15} />
      {/* Corner accents */}
      <Rect x="28" y="30" width="2" height="2" fill={lighten(color, 0.2)} opacity={0.3} />
      <Rect x="56" y="30" width="2" height="2" fill={lighten(color, 0.2)} opacity={0.3} />
    </G>
  );
}

function RacingGoggles({ color }: { color: string }): ReactElement {
  const gid = uid('goggles');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.3)} />
          <Stop offset="100%" stopColor={darken(color, 0.3)} />
        </LinearGradient>
      </Defs>
      {/* Main visor — solid across cat eyes */}
      <Path d="M 24 33 Q 50 25 76 33 Q 76 42 50 40 Q 24 42 24 33 Z"
        fill={`url(#${gid})`} stroke={darken(color, 0.4)} strokeWidth="1.2" />
      {/* Visor tint overlay */}
      <Path d="M 26 34 Q 50 27 74 34 Q 74 40 50 39 Q 26 40 26 34 Z"
        fill={darken(color, 0.3)} opacity={0.25} />
      {/* Lens shine streak — bolder */}
      <Path d="M 28 31 Q 50 26 72 31" stroke="#FFFFFF" strokeWidth="1.2" fill="none" opacity={0.35} />
      <Path d="M 32 33 Q 42 30 48 33" stroke="#FFFFFF" strokeWidth="0.5" fill="none" opacity={0.2} />
      {/* Center divider — thicker with detail */}
      <Line x1="50" y1="27" x2="50" y2="41" stroke={darken(color, 0.5)} strokeWidth="1.5" />
      <Line x1="50" y1="28" x2="50" y2="40" stroke={darken(color, 0.3)} strokeWidth="0.4" />
      {/* Frame rim */}
      <Path d="M 24 33 Q 50 25 76 33" stroke={darken(color, 0.5)} strokeWidth="1.8" fill="none" />
      <Path d="M 24 42 Q 50 40 76 42" stroke={darken(color, 0.5)} strokeWidth="1" fill="none" />
      {/* Strap — textured wraps toward ears */}
      <Path d="M 24 35 Q 18 28 16 22" stroke={darken(color, 0.4)} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Path d="M 76 35 Q 82 28 84 22" stroke={darken(color, 0.4)} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Strap texture */}
      <Path d="M 22 32 Q 20 28 18 24" stroke={lighten(color, 0.1)} strokeWidth="0.5" fill="none" opacity={0.3} />
      <Path d="M 78 32 Q 80 28 82 24" stroke={lighten(color, 0.1)} strokeWidth="0.5" fill="none" opacity={0.3} />
      {/* Vent holes */}
      <Circle cx="30" cy="36" r="0.6" fill={darken(color, 0.5)} opacity={0.5} />
      <Circle cx="70" cy="36" r="0.6" fill={darken(color, 0.5)} opacity={0.5} />
    </G>
  );
}

function Monocle({ color }: { color: string }): ReactElement {
  const gid = uid('monocle');
  return (
    <G>
      <Defs>
        <RadialGradient id={gid} cx="35%" cy="30%" r="65%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor={lighten(color, 0.3)} />
        </RadialGradient>
      </Defs>
      {/* Outer ornate rim — gold bezel */}
      <Circle cx="62" cy="36" r="8.5" stroke="#B8860B" strokeWidth="0.6" fill="none" />
      {/* Glass lens — right eye */}
      <Circle cx="62" cy="36" r="8" stroke={color} strokeWidth="1.8" fill="none" />
      <Circle cx="62" cy="36" r="7" fill={`url(#${gid})`} opacity={0.08} />
      {/* Inner rim detail */}
      <Circle cx="62" cy="36" r="6.5" stroke={lighten(color, 0.2)} strokeWidth="0.3" fill="none" opacity={0.3} />
      {/* Lens shine — prominent arc + sparkle */}
      <Path d="M 56 32 Q 62 29 68 32" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity={0.45} />
      <Circle cx="58" cy="33" r="0.8" fill="#FFFFFF" opacity={0.6} />
      <Circle cx="57" cy="32" r="0.3" fill="#FFFFFF" opacity={0.8} />
      {/* Decorative hinge at top */}
      <Circle cx="62" cy="28" r="1.2" fill={color} stroke={darken(color, 0.3)} strokeWidth="0.3" />
      <Circle cx="62" cy="28" r="0.5" fill={lighten(color, 0.3)} opacity={0.4} />
      {/* Chain — ornate with alternating links */}
      <Path d="M 70 36 Q 74 34 76 30 Q 78 26 80 22 Q 82 18 84 16"
        stroke={color} strokeWidth="0.8" fill="none" />
      {/* Chain link dots */}
      <Circle cx="73" cy="33" r="0.4" fill={lighten(color, 0.3)} opacity={0.5} />
      <Circle cx="77" cy="28" r="0.4" fill={lighten(color, 0.3)} opacity={0.5} />
      <Circle cx="81" cy="20" r="0.4" fill={lighten(color, 0.3)} opacity={0.5} />
      {/* Chain weight — ornate fob */}
      <Ellipse cx="84" cy="16" rx="2" ry="1.5" fill={color} stroke={darken(color, 0.3)} strokeWidth="0.3" />
      <Circle cx="83.5" cy="15.5" r="0.5" fill={lighten(color, 0.3)} opacity={0.4} />
      {/* Rim highlight */}
      <Path d="M 55 33 Q 62 30 69 33" stroke={lighten(color, 0.3)} strokeWidth="0.5" fill="none" opacity={0.5} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// NECKWEAR & PENDANTS
// ─────────────────────────────────────────────────

function GemPendant({ accent }: { accent: string }): ReactElement {
  const gid = uid('gempend');
  return (
    <G>
      <Defs>
        <RadialGradient id={gid} cx="50%" cy="30%" r="60%">
          <Stop offset="0%" stopColor={lighten(accent, 0.6)} />
          <Stop offset="60%" stopColor={accent} />
          <Stop offset="100%" stopColor={darken(accent, 0.6)} />
        </RadialGradient>
      </Defs>
      {/* Chain — delicate links */}
      <Path d="M 38 52 Q 44 50 50 49 Q 56 50 62 52" stroke={lighten(accent, 0.3)} strokeWidth="0.8" fill="none" />
      <Path d="M 40 51 L 42 52" stroke={lighten(accent, 0.3)} strokeWidth="0.4" opacity={0.5} />
      <Path d="M 58 52 L 60 51" stroke={lighten(accent, 0.3)} strokeWidth="0.4" opacity={0.5} />
      {/* Gem setting — larger diamond */}
      <Path d="M 44 55 L 50 50 L 56 55 L 50 63 Z"
        fill={`url(#${gid})`} stroke={darken(accent, 0.5)} strokeWidth="0.6" />
      {/* Facet lines */}
      <Line x1="50" y1="50" x2="50" y2="63" stroke={darken(accent, 0.3)} strokeWidth="0.4" opacity={0.4} />
      <Line x1="44" y1="55" x2="56" y2="55" stroke={darken(accent, 0.3)} strokeWidth="0.4" opacity={0.4} />
      <Path d="M 44 55 L 50 50 L 56 55" fill={lighten(accent, 0.3)} opacity={0.25} />
      {/* Sparkle */}
      <Circle cx="48" cy="53" r="1" fill="#FFFFFF" opacity={0.6} />
      <Circle cx="47" cy="52" r="0.4" fill="#FFFFFF" opacity={0.8} />
    </G>
  );
}

function PearlNecklace(_: { _color: string }): ReactElement {
  const gid = uid('pearl');
  const pearls = [
    { cx: 34, cy: 54.5, r: 2.2 }, { cx: 38.5, cy: 53, r: 2.3 }, { cx: 43, cy: 51.8, r: 2.5 },
    { cx: 50, cy: 51, r: 2.8 }, { cx: 57, cy: 51.8, r: 2.5 }, { cx: 61.5, cy: 53, r: 2.3 }, { cx: 66, cy: 54.5, r: 2.2 },
  ];
  return (
    <G>
      <Defs>
        <RadialGradient id={gid} cx="35%" cy="30%" r="65%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="40%" stopColor="#FBF6E8" />
          <Stop offset="100%" stopColor="#E0D8C0" />
        </RadialGradient>
      </Defs>
      {/* Strand — delicate gold thread */}
      <Path d="M 32 55.5 Q 50 47 68 55.5" stroke="#D4C8A0" strokeWidth="0.6" fill="none" />
      {pearls.map((p, i) => (
        <G key={i}>
          {/* Pearl shadow */}
          <Ellipse cx={p.cx + 0.3} cy={p.cy + 0.5} rx={p.r} ry={p.r * 0.8} fill="#C0B890" opacity={0.15} />
          {/* Pearl body */}
          <Circle cx={p.cx} cy={p.cy} r={p.r} fill={`url(#${gid})`} stroke="#D8D0B8" strokeWidth="0.3" />
          {/* Primary highlight */}
          <Circle cx={p.cx - 0.6} cy={p.cy - 0.7} r={p.r * 0.3} fill="#FFFFFF" opacity={0.7} />
          {/* Secondary shimmer */}
          <Circle cx={p.cx + 0.4} cy={p.cy - 0.3} r={p.r * 0.15} fill="#FFFFFF" opacity={0.4} />
          {/* Iridescent tint */}
          <Circle cx={p.cx + 0.5} cy={p.cy + 0.5} r={p.r * 0.5} fill="#FFE8F0" opacity={0.1} />
        </G>
      ))}
      {/* Center pearl extra sparkle */}
      <Circle cx="49" cy="50" r="0.4" fill="#FFFFFF" opacity={0.8} />
      {/* Clasp at back — implied by tiny gold circle */}
      <Circle cx="32" cy="55.5" r="1" fill="#D4C090" stroke="#B8A070" strokeWidth="0.3" />
      <Circle cx="68" cy="55.5" r="1" fill="#D4C090" stroke="#B8A070" strokeWidth="0.3" />
    </G>
  );
}

function GoldChain(_: { _color: string }): ReactElement {
  const gid = uid('goldchain');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFF8DC" />
          <Stop offset="30%" stopColor="#FFD700" />
          <Stop offset="100%" stopColor="#B8860B" />
        </LinearGradient>
        <RadialGradient id={`${gid}-gem`} cx="35%" cy="30%" r="60%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="40%" stopColor="#88CCFF" />
          <Stop offset="100%" stopColor="#4488CC" />
        </RadialGradient>
      </Defs>
      {/* Chain — thicker with metallic sheen */}
      <Path d="M 34 55 Q 50 49 66 55" stroke="#FFD700" strokeWidth="2.2" fill="none" />
      <Path d="M 36 54 Q 50 48.5 64 54" stroke="#FFF0A0" strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Chain link V-pattern texture */}
      <Path d="M 36 54 L 38 52.5 L 40 54" stroke="#CC9B00" strokeWidth="0.5" fill="none" />
      <Path d="M 42 52.5 L 44 51 L 46 52.5" stroke="#CC9B00" strokeWidth="0.5" fill="none" />
      <Path d="M 54 52.5 L 56 51 L 58 52.5" stroke="#CC9B00" strokeWidth="0.5" fill="none" />
      <Path d="M 60 54 L 62 52.5 L 64 54" stroke="#CC9B00" strokeWidth="0.5" fill="none" />
      {/* Pendant bail */}
      <Circle cx="50" cy="50" r="1.5" fill="#FFD700" stroke="#B8860B" strokeWidth="0.3" />
      <Circle cx="50" cy="50" r="0.7" fill="#CC9B00" />
      {/* Diamond pendant — larger with facets */}
      <Path d="M 46 54 L 50 49 L 54 54 L 50 60 Z" fill={`url(#${gid})`}
        stroke="#B8860B" strokeWidth="0.6" />
      {/* Facet lines */}
      <Line x1="50" y1="49" x2="50" y2="60" stroke="#CC9B00" strokeWidth="0.3" opacity={0.3} />
      <Line x1="46" y1="54" x2="54" y2="54" stroke="#CC9B00" strokeWidth="0.3" opacity={0.3} />
      {/* Top facet highlight */}
      <Path d="M 46 54 L 50 49 L 54 54" fill="#FFF8DC" opacity={0.25} />
      {/* Gem center — ice blue */}
      <Circle cx="50" cy="54.5" r="2" fill={`url(#${gid}-gem)`} opacity={0.5} />
      {/* Diamond sparkle */}
      <Circle cx="48.5" cy="52" r="0.7" fill="#FFFFFF" opacity={0.6} />
      <Circle cx="48" cy="51.5" r="0.3" fill="#FFFFFF" opacity={0.8} />
    </G>
  );
}

function GoldenHeadphones(_: { _color: string }): ReactElement {
  const gid = uid('goldhp');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFE066" />
          <Stop offset="50%" stopColor="#FFD700" />
          <Stop offset="100%" stopColor="#CC9B00" />
        </LinearGradient>
      </Defs>
      {/* Headband arc — from ear to ear over top of head */}
      <Path d="M 22 38 Q 22 10 50 8 Q 78 10 78 38"
        stroke={`url(#${gid})`} strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* Headband highlight */}
      <Path d="M 26 34 Q 26 14 50 12 Q 74 14 74 34"
        stroke="#FFF0A0" strokeWidth="0.6" fill="none" opacity={0.4} />
      {/* Left ear cup — positioned at cat ear level */}
      <Ellipse cx="22" cy="40" rx="6" ry="8" fill={`url(#${gid})`} stroke="#B8860B" strokeWidth="0.6" />
      <Ellipse cx="22" cy="40" rx="4" ry="6" fill="#333333" stroke="#555555" strokeWidth="0.4" />
      <Ellipse cx="22" cy="40" rx="2.5" ry="3.5" fill="#222222" />
      {/* Speaker mesh detail */}
      <Circle cx="22" cy="38" r="1" fill="#444444" />
      <Circle cx="22" cy="40" r="1" fill="#444444" />
      <Circle cx="22" cy="42" r="1" fill="#444444" />
      {/* Right ear cup */}
      <Ellipse cx="78" cy="40" rx="6" ry="8" fill={`url(#${gid})`} stroke="#B8860B" strokeWidth="0.6" />
      <Ellipse cx="78" cy="40" rx="4" ry="6" fill="#333333" stroke="#555555" strokeWidth="0.4" />
      <Ellipse cx="78" cy="40" rx="2.5" ry="3.5" fill="#222222" />
      <Circle cx="78" cy="38" r="1" fill="#444444" />
      <Circle cx="78" cy="40" r="1" fill="#444444" />
      <Circle cx="78" cy="42" r="1" fill="#444444" />
      {/* Gold shine highlights */}
      <Circle cx="20" cy="36" r="0.8" fill="#FFF8DC" opacity={0.5} />
      <Circle cx="76" cy="36" r="0.8" fill="#FFF8DC" opacity={0.5} />
    </G>
  );
}

function Scarf({ color }: { color: string }): ReactElement {
  const gid = uid('scarf');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.25)} />
          <Stop offset="100%" stopColor={darken(color, 0.65)} />
        </LinearGradient>
      </Defs>
      {/* Wrap — at cat neck junction y≈50 */}
      <Path d="M 32 52 Q 38 48 50 47 Q 62 48 68 52 Q 66 56 50 55 Q 34 56 32 52 Z"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.4" />
      {/* Overlap fold */}
      <Path d="M 50 48 Q 56 48 62 50 Q 60 53 54 52 Q 50 51 50 48 Z"
        fill={darken(color, 0.4)} opacity={0.5} />
      {/* Knot */}
      <Ellipse cx="57" cy="54" rx="3.5" ry="2.5" fill={darken(color, 0.6)} />
      <Ellipse cx="56.5" cy="53.5" rx="1.8" ry="1.2" fill={lighten(color, 0.2)} opacity={0.4} />
      {/* Tail 1 — flat ribbon shape */}
      <Path d="M 54 55 L 52 62 L 50 68 L 48 70 L 52 70 L 54 64 L 56 57 Z"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      {/* Tail 2 */}
      <Path d="M 58 55 L 60 62 L 61 67 L 63 69 L 59 69 L 58 63 L 56 57 Z"
        fill={darken(color, 0.5)} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      {/* Knit texture */}
      <Path d="M 34 51 Q 42 49 50 48" stroke={lighten(color, 0.15)} strokeWidth="0.8" fill="none" opacity={0.5} />
      <Path d="M 50 48 Q 58 49 66 51" stroke={lighten(color, 0.15)} strokeWidth="0.8" fill="none" opacity={0.5} />
      {/* Fringe on tail ends */}
      <Line x1="48" y1="70" x2="47" y2="73" stroke={darken(color, 0.5)} strokeWidth="0.7" />
      <Line x1="50" y1="70" x2="50" y2="73" stroke={darken(color, 0.5)} strokeWidth="0.7" />
      <Line x1="52" y1="70" x2="52.5" y2="73" stroke={darken(color, 0.5)} strokeWidth="0.7" />
      <Line x1="59" y1="69" x2="58" y2="72" stroke={darken(color, 0.5)} strokeWidth="0.7" />
      <Line x1="61" y1="69" x2="61" y2="72" stroke={darken(color, 0.5)} strokeWidth="0.7" />
      <Line x1="63" y1="69" x2="63.5" y2="72" stroke={darken(color, 0.5)} strokeWidth="0.7" />
    </G>
  );
}

function CrescentCollar({ color }: { color: string }): ReactElement {
  const gid = uid('crescent');
  return (
    <G>
      <Defs>
        <RadialGradient id={gid} cx="40%" cy="30%" r="60%">
          <Stop offset="0%" stopColor="#F0F0F0" />
          <Stop offset="50%" stopColor="#D4D4D4" />
          <Stop offset="100%" stopColor="#A0A0A0" />
        </RadialGradient>
      </Defs>
      {/* Collar band — velvet with stitching */}
      <Path d="M 34 52 Q 50 47 66 52" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M 36 51 Q 50 46.5 64 51" stroke={lighten(color, 0.3)} strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Stitch detail */}
      <Path d="M 38 52 L 39 50.5 L 40 52" stroke={lighten(color, 0.2)} strokeWidth="0.3" fill="none" opacity={0.3} />
      <Path d="M 48 50 L 49 48.5 L 50 50" stroke={lighten(color, 0.2)} strokeWidth="0.3" fill="none" opacity={0.3} />
      <Path d="M 58 50 L 59 48.5 L 60 50" stroke={lighten(color, 0.2)} strokeWidth="0.3" fill="none" opacity={0.3} />
      {/* Crescent moon — larger and more detailed */}
      <Path d="M 46 54 A 5.5 5.5 0 1 1 46 65 A 3.8 3.8 0 1 0 46 54"
        fill={`url(#${gid})`} stroke="#808080" strokeWidth="0.5" />
      {/* Moon surface detail — craters */}
      <Circle cx="48" cy="57" r="0.8" fill="#C0C0C0" opacity={0.4} />
      <Circle cx="46.5" cy="60" r="0.5" fill="#B8B8B8" opacity={0.3} />
      {/* Sparkle highlight on moon */}
      <Circle cx="48.5" cy="55.5" r="0.7" fill="#FFFFFF" opacity={0.6} />
      <Circle cx="47.5" cy="55" r="0.3" fill="#FFFFFF" opacity={0.8} />
      {/* Tiny star next to moon */}
      <Circle cx="53" cy="55" r="0.8" fill={lighten(color, 0.4)} opacity={0.4} />
      <Circle cx="53" cy="55" r="0.3" fill="#FFFFFF" opacity={0.6} />
    </G>
  );
}

function LightningCollar(): ReactElement {
  const gid = uid('lightning');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFF0A0" />
          <Stop offset="50%" stopColor="#FFD700" />
          <Stop offset="100%" stopColor="#CC9B00" />
        </LinearGradient>
      </Defs>
      {/* Collar band — studded leather */}
      <Path d="M 34 52 Q 50 47 66 52" stroke="#2A2A2A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Path d="M 36 51 Q 50 46.5 64 51" stroke="#444" strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Metal studs */}
      <Circle cx="38" cy="51" r="0.7" fill="#C0C0C0" stroke="#888" strokeWidth="0.2" />
      <Circle cx="44" cy="49.5" r="0.7" fill="#C0C0C0" stroke="#888" strokeWidth="0.2" />
      <Circle cx="56" cy="49.5" r="0.7" fill="#C0C0C0" stroke="#888" strokeWidth="0.2" />
      <Circle cx="62" cy="51" r="0.7" fill="#C0C0C0" stroke="#888" strokeWidth="0.2" />
      {/* Lightning bolt — bigger with glow */}
      <Path d="M 49 52 L 52.5 52 L 49 58 L 54 58 L 47 67 L 50 60 L 46.5 60 Z"
        fill={`url(#${gid})`} stroke="#B8860B" strokeWidth="0.5" />
      {/* Bolt inner highlight */}
      <Path d="M 50 53 L 51.5 53 L 50 56 L 52 56 L 49 61" stroke="#FFF8DC" strokeWidth="0.5" fill="none" opacity={0.5} />
      {/* Electric glow around bolt */}
      <Path d="M 49 52 L 52.5 52 L 49 58 L 54 58 L 47 67 L 50 60 L 46.5 60 Z"
        fill="none" stroke="#FFD700" strokeWidth="1.5" opacity={0.15} />
      {/* Spark particles */}
      <Circle cx="55" cy="55" r="0.5" fill="#FFD700" opacity={0.4} />
      <Circle cx="45" cy="58" r="0.4" fill="#FFD700" opacity={0.3} />
      <Circle cx="53" cy="62" r="0.3" fill="#FFD700" opacity={0.25} />
    </G>
  );
}

function KimonoSash({ color }: { color: string }): ReactElement {
  const gid = uid('sash');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.25)} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.6)} />
        </LinearGradient>
      </Defs>
      {/* Sash — at cat body start y≈52 */}
      <Path d="M 28 52 Q 50 47 72 52 Q 73 58 72 62 Q 50 66 28 62 Q 27 58 28 52"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      {/* Top edge highlight */}
      <Path d="M 30 52 Q 50 47.5 70 52" stroke={lighten(color, 0.3)} strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Center line detail */}
      <Line x1="30" y1="57" x2="70" y2="57" stroke={darken(color, 0.5)} strokeWidth="0.8" />
      {/* Cherry blossom pattern — traditional motif */}
      {[{ x: 36, y: 54 }, { x: 44, y: 56 }, { x: 52, y: 54 }].map((p, i) => (
        <G key={i} opacity={0.35}>
          <Circle cx={p.x} cy={p.y} r="2" fill={lighten(color, 0.4)} />
          <Circle cx={p.x} cy={p.y} r="0.6" fill="#FFD700" opacity={0.5} />
        </G>
      ))}
      {/* Wave pattern lines — seigaiha-inspired */}
      <Path d="M 34 60 Q 38 58 42 60" stroke={lighten(color, 0.2)} strokeWidth="0.3" fill="none" opacity={0.3} />
      <Path d="M 46 59 Q 50 57 54 59" stroke={lighten(color, 0.2)} strokeWidth="0.3" fill="none" opacity={0.3} />
      <Path d="M 58 60 Q 62 58 66 60" stroke={lighten(color, 0.2)} strokeWidth="0.3" fill="none" opacity={0.3} />
      {/* Bow knot — larger and more defined */}
      <Path d="M 60 55 Q 66 52 70 56 Q 72 62 66 61 Q 64 64 60 59 Q 58 54 60 55"
        fill={darken(color, 0.5)} stroke={darken(color, 0.6)} strokeWidth="0.3" />
      {/* Bow loop highlight */}
      <Path d="M 62 54 Q 66 53 68 56" stroke={lighten(color, 0.15)} strokeWidth="0.3" fill="none" opacity={0.3} />
      {/* Bow center knot */}
      <Ellipse cx="64" cy="58" rx="2" ry="1.3" fill={darken(color, 0.4)} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      <Circle cx="63.5" cy="57.5" r="0.4" fill={lighten(color, 0.2)} opacity={0.3} />
      {/* Bow tail drops */}
      <Path d="M 64 60 Q 62 64 60 68" stroke={darken(color, 0.5)} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d="M 66 60 Q 68 64 66 68" stroke={darken(color, 0.5)} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Gold edge trim */}
      <Path d="M 28 62 Q 50 66 72 62" stroke="#FFD700" strokeWidth="0.6" fill="none" opacity={0.3} />
    </G>
  );
}

function TempleBell(): ReactElement {
  const gid = uid('bell');
  return (
    <G>
      <Defs>
        <RadialGradient id={gid} cx="40%" cy="30%" r="60%">
          <Stop offset="0%" stopColor="#FFE88A" />
          <Stop offset="50%" stopColor="#FFD700" />
          <Stop offset="100%" stopColor="#B8860B" />
        </RadialGradient>
      </Defs>
      {/* Red collar band */}
      <Path d="M 34 52 Q 42 49 50 48 Q 58 49 66 52"
        stroke="#CC3333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Collar highlight */}
      <Path d="M 36 51 Q 44 48.5 50 47.5 Q 56 48.5 64 51"
        stroke="#FF6666" strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Bell top ring */}
      <Circle cx="50" cy="52" r="1.5" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
      {/* Bell body */}
      <Circle cx="50" cy="56" r="4.5" fill={`url(#${gid})`} stroke="#B8860B" strokeWidth="0.5" />
      {/* Bell horizontal slit */}
      <Line x1="46" y1="57" x2="54" y2="57" stroke="#996600" strokeWidth="0.6" />
      {/* Clapper */}
      <Circle cx="50" cy="59" r="1.2" fill="#996600" />
      {/* Shine highlights */}
      <Circle cx="48" cy="54" r="1" fill="#FFF8DC" opacity={0.5} />
      <Path d="M 47 54 Q 50 52 53 54" stroke="#FFF8DC" strokeWidth="0.4" fill="none" opacity={0.4} />
      {/* Sound lines */}
      <Path d="M 44 53 Q 42 52 43 50" stroke="#FFD700" strokeWidth="0.4" fill="none" opacity={0.4} />
      <Path d="M 56 53 Q 58 52 57 50" stroke="#FFD700" strokeWidth="0.4" fill="none" opacity={0.4} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// CAPES & COATS
// ─────────────────────────────────────────────────

function CapeAccessory({ color }: { color: string }): ReactElement {
  const gid = uid('cape');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.15)} />
          <Stop offset="100%" stopColor={darken(color, 0.7)} />
        </LinearGradient>
      </Defs>
      {/* Cape — drapes from shoulders behind body */}
      <Path d="M 36 50 Q 20 60 18 85 Q 30 90 40 88 Q 50 92 60 88 Q 70 90 82 85 Q 80 60 64 50 Z"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.5" />
      {/* Inner lining — slightly lighter */}
      <Path d="M 38 52 Q 24 62 22 82 Q 34 86 44 84 Q 50 88 56 84 Q 66 86 78 82 Q 76 62 62 52 Z"
        fill={darken(color, 0.6)} opacity={0.3} />
      {/* Fold lines for fabric depth */}
      <Path d="M 30 60 Q 35 70 32 80" stroke={darken(color, 0.5)} strokeWidth="0.5" fill="none" opacity={0.4} />
      <Path d="M 70 60 Q 65 70 68 80" stroke={darken(color, 0.5)} strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Gold clasp at neck */}
      <Circle cx="50" cy="52" r="3" fill="#FFD700" stroke="#CC9B00" strokeWidth="0.5" />
      <Circle cx="50" cy="52" r="1.5" fill={color} />
      <Circle cx="49.5" cy="51.5" r="0.5" fill="#FFFFFF" opacity={0.5} />
    </G>
  );
}

function RoyalRobe({ color }: { color: string }): ReactElement {
  const gid = uid('robe');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.25)} />
          <Stop offset="100%" stopColor={darken(color, 0.65)} />
        </LinearGradient>
      </Defs>
      {/* Robe — grand drape flowing around round cat body */}
      <Path d="M 28 48 Q 14 58 12 72 Q 14 88 50 86 Q 86 88 88 72 Q 86 58 72 48"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.4" />
      {/* Inner lining — rich contrast */}
      <Path d="M 32 52 Q 20 62 18 78 Q 30 82 50 80 Q 70 82 82 78 Q 80 62 68 52"
        fill={darken(color, 0.6)} opacity={0.35} />
      {/* Fabric fold lines */}
      <Path d="M 24 60 Q 28 70 22 80" stroke={darken(color, 0.5)} strokeWidth="0.5" fill="none" opacity={0.4} />
      <Path d="M 76 60 Q 72 70 78 80" stroke={darken(color, 0.5)} strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Ermine trim — thick fluffy collar */}
      <Path d="M 30 48 Q 50 44 70 48" stroke="#F8F5F0" strokeWidth="5" fill="none" strokeLinecap="round" />
      <Path d="M 30 48 Q 50 44 70 48" stroke="#E8E0D0" strokeWidth="0.3" fill="none" />
      {/* Ermine spots — larger */}
      {[34, 41, 50, 59, 66].map((x) => (
        <Circle key={x} cx={x} cy="47" r="1" fill="#1A1A1A" />
      ))}
      {/* Gold trim on flowing hem */}
      <Path d="M 14 84 Q 50 82 86 84" stroke="#FFD700" strokeWidth="1.2" fill="none" opacity={0.7} />
      {/* Gold clasp at center collar */}
      <Circle cx="50" cy="47" r="2" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
      <Circle cx="49.5" cy="46.5" r="0.5" fill="#FFF8DC" opacity={0.5} />
    </G>
  );
}

function ConductorCoat({ color }: { color: string }): ReactElement {
  const gid = uid('conductor');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.15)} />
          <Stop offset="100%" stopColor={darken(color, 0.7)} />
        </LinearGradient>
      </Defs>
      {/* Coat front — follows cat body curve, splits at waist into tails */}
      <Path d="M 34 48 Q 28 55 27 64 Q 28 72 36 76 Q 50 80 64 76 Q 72 72 73 64 Q 72 55 66 48 Q 58 44 50 46 Q 42 44 34 48"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.4" />
      {/* Left tail — hangs from waist */}
      <Path d="M 32 72 Q 28 80 32 88 Q 36 90 38 84 Q 36 78 34 74"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      {/* Right tail */}
      <Path d="M 68 72 Q 72 80 68 88 Q 64 90 62 84 Q 64 78 66 74"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      {/* Lapels — satin sheen */}
      <Path d="M 40 48 L 46 48 L 46 57 L 40 52" fill={darken(color, 0.5)} />
      <Path d="M 60 48 L 54 48 L 54 57 L 60 52" fill={darken(color, 0.5)} />
      {/* Lapel highlight */}
      <Path d="M 41 49 L 45 49 L 45 54" stroke={lighten(color, 0.2)} strokeWidth="0.3" fill="none" opacity={0.4} />
      <Path d="M 59 49 L 55 49 L 55 54" stroke={lighten(color, 0.2)} strokeWidth="0.3" fill="none" opacity={0.4} />
      {/* Gold buttons — double-breasted */}
      {[54, 60, 66].map((y) => (
        <G key={y}>
          <Circle cx="47" cy={y} r="1.3" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
          <Circle cx="53" cy={y} r="1.3" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
          <Circle cx="46.5" cy={y - 0.5} r="0.3" fill="#FFF8DC" opacity={0.5} />
          <Circle cx="52.5" cy={y - 0.5} r="0.3" fill="#FFF8DC" opacity={0.5} />
        </G>
      ))}
      {/* Pocket flap */}
      <Path d="M 36 60 Q 40 59 44 60" stroke={darken(color, 0.4)} strokeWidth="0.6" fill="none" />
      <Path d="M 56 60 Q 60 59 64 60" stroke={darken(color, 0.4)} strokeWidth="0.6" fill="none" />
    </G>
  );
}

function Apron(): ReactElement {
  return (
    <G>
      {/* Apron body — crisp white with slight shadow */}
      <Path d="M 38 48 Q 34 56 33 66 Q 34 76 38 82 Q 50 86 62 82 Q 66 76 67 66 Q 66 56 62 48"
        fill="#FFFFFF" stroke="#D0D0D0" strokeWidth="0.6" />
      {/* Fabric fold shadow */}
      <Path d="M 40 50 Q 38 60 38 70 Q 40 78 44 82"
        stroke="#E8E8E8" strokeWidth="0.5" fill="none" opacity={0.5} />
      <Path d="M 60 50 Q 62 60 62 70 Q 60 78 56 82"
        stroke="#E8E8E8" strokeWidth="0.5" fill="none" opacity={0.5} />
      {/* Straps — with stitching */}
      <Line x1="38" y1="48" x2="42" y2="42" stroke="#F0F0F0" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="62" y1="48" x2="58" y2="42" stroke="#F0F0F0" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="38.5" y1="47.5" x2="42" y2="42.5" stroke="#E0E0E0" strokeWidth="0.3" strokeDasharray="1 1" />
      <Line x1="61.5" y1="47.5" x2="58" y2="42.5" stroke="#E0E0E0" strokeWidth="0.3" strokeDasharray="1 1" />
      {/* Waist tie — bow at back implied by side ribbons */}
      <Path d="M 33 66 Q 28 64 26 66 Q 28 68 33 66" fill="#F8F8F8" stroke="#D0D0D0" strokeWidth="0.3" />
      <Path d="M 67 66 Q 72 64 74 66 Q 72 68 67 66" fill="#F8F8F8" stroke="#D0D0D0" strokeWidth="0.3" />
      {/* Waistband */}
      <Path d="M 34 64 Q 50 62 66 64" stroke="#E0E0E0" strokeWidth="1.5" fill="none" />
      {/* Pocket — larger with rounded corners */}
      <Path d="M 39 68 Q 50 67 61 68 Q 61 78 50 79 Q 39 78 39 68"
        fill="#F8F8F8" stroke="#D0D0D0" strokeWidth="0.5" />
      {/* Pocket divider */}
      <Line x1="50" y1="68" x2="50" y2="79" stroke="#E0E0E0" strokeWidth="0.4" />
      {/* Top stitch on pocket */}
      <Path d="M 40 69 Q 50 68 60 69" stroke="#E8E8E8" strokeWidth="0.3" strokeDasharray="1 1" fill="none" />
      {/* Tiny embroidered heart on pocket */}
      <Path d="M 45 72 C 45 71 43.5 71 43.5 72 C 43.5 73 45 74 45 74 C 45 74 46.5 73 46.5 72 C 46.5 71 45 71 45 72"
        fill="#FF9999" opacity={0.4} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// INSTRUMENTS & WANDS
// ─────────────────────────────────────────────────

function Fiddle({ color }: { color: string }): ReactElement {
  const gid = uid('fiddle');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.3)} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.5)} />
        </LinearGradient>
      </Defs>
      {/* Body — figure-8, slightly bigger */}
      <Path d="M 72 62 Q 66 56 68 52 Q 72 46 78 46 Q 82 46 84 52 Q 86 56 80 62 Q 86 68 84 72 Q 82 78 76 78 Q 70 78 68 72 Q 66 68 72 62"
        fill={`url(#${gid})`} stroke={darken(color, 0.3)} strokeWidth="0.6" />
      {/* Body highlight */}
      <Path d="M 72 54 Q 76 48 82 52" stroke={lighten(color, 0.3)} strokeWidth="0.4" fill="none" opacity={0.3} />
      {/* F-holes — more defined */}
      <Path d="M 72 55 Q 73.5 58 72 61" stroke={darken(color, 0.4)} strokeWidth="0.6" fill="none" />
      <Circle cx="72" cy="55" r="0.5" fill={darken(color, 0.4)} />
      <Circle cx="72" cy="61" r="0.5" fill={darken(color, 0.4)} />
      <Path d="M 80 55 Q 78.5 58 80 61" stroke={darken(color, 0.4)} strokeWidth="0.6" fill="none" />
      <Circle cx="80" cy="55" r="0.5" fill={darken(color, 0.4)} />
      <Circle cx="80" cy="61" r="0.5" fill={darken(color, 0.4)} />
      {/* Bridge */}
      <Rect x="74" y="60" width="4" height="1.5" rx="0.3" fill={darken(color, 0.4)} />
      {/* Tailpiece */}
      <Path d="M 75 68 L 76 72 L 77 68" fill={darken(color, 0.4)} />
      {/* Strings — 4 strings */}
      <Line x1="74.5" y1="48" x2="74.5" y2="72" stroke={lighten(color, 0.5)} strokeWidth="0.25" />
      <Line x1="75.5" y1="48" x2="75.5" y2="72" stroke={lighten(color, 0.5)} strokeWidth="0.25" />
      <Line x1="76.5" y1="48" x2="76.5" y2="72" stroke={lighten(color, 0.5)} strokeWidth="0.25" />
      <Line x1="77.5" y1="48" x2="77.5" y2="72" stroke={lighten(color, 0.5)} strokeWidth="0.25" />
      {/* Neck + scroll */}
      <Line x1="76" y1="46" x2="76" y2="38" stroke={darken(color, 0.3)} strokeWidth="2" />
      <Path d="M 76 38 Q 74 36 76 34 Q 78 36 76 38" fill={darken(color, 0.3)} />
      {/* Tuning pegs */}
      <Line x1="74" y1="40" x2="72" y2="40" stroke={darken(color, 0.5)} strokeWidth="0.8" />
      <Line x1="78" y1="42" x2="80" y2="42" stroke={darken(color, 0.5)} strokeWidth="0.8" />
      {/* Bow — with horsehair */}
      <Line x1="84" y1="44" x2="68" y2="78" stroke={lighten(color, 0.25)} strokeWidth="1.2" strokeLinecap="round" />
      <Line x1="84" y1="44" x2="68" y2="78" stroke={lighten(color, 0.5)} strokeWidth="0.3" opacity={0.3} />
      {/* Bow frog */}
      <Path d="M 84 44 Q 86 42 84 40 Q 82 42 84 44" fill={darken(color, 0.4)} />
    </G>
  );
}

function Baton({ color }: { color: string }): ReactElement {
  const gid = uid('baton');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={lighten(color, 0.3)} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.5)} />
        </LinearGradient>
      </Defs>
      {/* Shaft — thicker with gradient for cylindrical look */}
      <Line x1="68" y1="56" x2="86" y2="36" stroke={`url(#${gid})`} strokeWidth="2.5" strokeLinecap="round" />
      {/* Shaft highlight streak */}
      <Line x1="69" y1="55" x2="85" y2="37" stroke={lighten(color, 0.4)} strokeWidth="0.5" opacity={0.4} />
      {/* Handle — ornate grip */}
      <Ellipse cx="67" cy="57" rx="4" ry="3" fill={darken(color, 0.4)} stroke={darken(color, 0.5)} strokeWidth="0.5" />
      <Ellipse cx="67" cy="57" rx="2.8" ry="2" fill={lighten(color, 0.2)} />
      <Circle cx="66" cy="56" r="0.8" fill="#FFFFFF" opacity={0.4} />
      {/* Handle ring detail */}
      <Ellipse cx="69" cy="55" rx="2" ry="1.5" fill="none" stroke={darken(color, 0.3)} strokeWidth="0.5" />
      {/* Tip — glowing orb */}
      <Circle cx="86" cy="36" r="2.5" fill="#FFFFFF" opacity={0.3} />
      <Circle cx="86" cy="36" r="1.8" fill="#FFFFFF" />
      <Circle cx="85.2" cy="35.2" r="0.6" fill="#FFFFFF" opacity={0.8} />
      {/* Motion lines */}
      <Path d="M 88 34 Q 90 32 89 30" stroke={color} strokeWidth="0.5" fill="none" opacity={0.3} />
      <Path d="M 89 37 Q 91 36 90 34" stroke={color} strokeWidth="0.4" fill="none" opacity={0.2} />
    </G>
  );
}

function CookieWand(): ReactElement {
  const gid = uid('wand');
  return (
    <G>
      <Defs>
        <RadialGradient id={gid} cx="40%" cy="30%" r="60%">
          <Stop offset="0%" stopColor="#FFF8DC" />
          <Stop offset="50%" stopColor="#FFD700" />
          <Stop offset="100%" stopColor="#CC9B00" />
        </RadialGradient>
      </Defs>
      {/* Wand shaft — tapered with wood grain */}
      <Path d="M 27 80 L 37 52" stroke="#A0652E" strokeWidth="2.2" strokeLinecap="round" />
      <Path d="M 27.5 79 L 37 53" stroke="#8B4513" strokeWidth="1.5" strokeLinecap="round" />
      {/* Wood highlight */}
      <Path d="M 29 76 L 36 54" stroke="#C4783C" strokeWidth="0.4" opacity={0.3} />
      {/* Handle wrap */}
      <Path d="M 28 76 Q 30 75 28 74" stroke="#CC9B00" strokeWidth="0.6" fill="none" />
      <Path d="M 28.5 73 Q 30.5 72 28.5 71" stroke="#CC9B00" strokeWidth="0.6" fill="none" />
      {/* Star — bigger and richer */}
      <Path d="M 38 46 L 40 51 L 45 51.5 L 41 54.5 L 42.5 59.5 L 38 56.5 L 33.5 59.5 L 35 54.5 L 31 51.5 L 36 51 Z"
        fill={`url(#${gid})`} stroke="#B8860B" strokeWidth="0.5" />
      {/* Star inner facet */}
      <Path d="M 38 48 L 39.5 51 L 38 53 L 36.5 51 Z" fill="#FFF8DC" opacity={0.4} />
      {/* Star sparkle */}
      <Circle cx="36.5" cy="50" r="0.8" fill="#FFFFFF" opacity={0.7} />
      {/* Star glow */}
      <Circle cx="38" cy="52" r="8" fill="#FFD700" opacity={0.06} />
      {/* Sparkle particles — trail */}
      <Circle cx="33" cy="45" r="0.8" fill="#FFD700" opacity={0.6} />
      <Circle cx="43" cy="47" r="0.6" fill="#FFD700" opacity={0.5} />
      <Circle cx="35" cy="61" r="0.5" fill="#FFD700" opacity={0.4} />
      <Circle cx="30" cy="43" r="0.4" fill="#FFF8DC" opacity={0.5} />
      <Circle cx="44" cy="44" r="0.3" fill="#FFF8DC" opacity={0.4} />
      {/* Tiny sparkle crosses */}
      <G opacity={0.4}>
        <Line x1="32" y1="44" x2="34" y2="46" stroke="#FFD700" strokeWidth="0.3" />
        <Line x1="34" y1="44" x2="32" y2="46" stroke="#FFD700" strokeWidth="0.3" />
      </G>
      <G opacity={0.3}>
        <Line x1="43" y1="43" x2="45" y2="45" stroke="#FFD700" strokeWidth="0.3" />
        <Line x1="45" y1="43" x2="43" y2="45" stroke="#FFD700" strokeWidth="0.3" />
      </G>
    </G>
  );
}

function Sax({ color }: { color: string }): ReactElement {
  const gid = uid('sax');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.35)} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.4)} />
        </LinearGradient>
      </Defs>
      {/* Body tube — thicker with metallic sheen */}
      <Path d="M 76 46 Q 79 54 77 60 Q 73 68 69 74 Q 66 78 70 82"
        fill="none" stroke={`url(#${gid})`} strokeWidth="4" strokeLinecap="round" />
      {/* Tube highlight */}
      <Path d="M 77 48 Q 79 54 78 58 Q 74 66 70 72"
        stroke={lighten(color, 0.3)} strokeWidth="0.6" fill="none" opacity={0.3} />
      {/* Bell — larger and more defined */}
      <Ellipse cx="70" cy="82" rx="6.5" ry="4.5" fill={color} stroke={darken(color, 0.4)} strokeWidth="0.6" />
      <Ellipse cx="70" cy="82" rx="4.5" ry="3" fill={darken(color, 0.3)} opacity={0.2} />
      <Ellipse cx="70" cy="82" rx="2.5" ry="1.5" fill={darken(color, 0.5)} opacity={0.15} />
      {/* Bell rim shine */}
      <Path d="M 64 80 Q 70 78 76 80" stroke={lighten(color, 0.3)} strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Mouthpiece — neck curve */}
      <Path d="M 76 46 Q 74 42 76 40" stroke={darken(color, 0.3)} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Circle cx="76" cy="40" r="1.5" fill={darken(color, 0.3)} />
      {/* Reed */}
      <Rect x="75" y="38" width="2" height="3" rx="0.5" fill={lighten(color, 0.2)} />
      {/* Keys — with rods and pads */}
      <Circle cx="75" cy="52" r="1.5" fill={lighten(color, 0.4)} stroke={darken(color, 0.3)} strokeWidth="0.4" />
      <Line x1="76.5" y1="52" x2="78" y2="52" stroke={darken(color, 0.3)} strokeWidth="0.5" />
      <Circle cx="74" cy="58" r="1.5" fill={lighten(color, 0.4)} stroke={darken(color, 0.3)} strokeWidth="0.4" />
      <Line x1="75.5" y1="58" x2="77" y2="58" stroke={darken(color, 0.3)} strokeWidth="0.5" />
      <Circle cx="72" cy="64" r="1.5" fill={lighten(color, 0.4)} stroke={darken(color, 0.3)} strokeWidth="0.4" />
      <Line x1="73.5" y1="64" x2="75" y2="64" stroke={darken(color, 0.3)} strokeWidth="0.5" />
      <Circle cx="70" cy="70" r="1.3" fill={lighten(color, 0.4)} stroke={darken(color, 0.3)} strokeWidth="0.3" />
      {/* Key sparkle */}
      <Circle cx="74.5" cy="51.5" r="0.4" fill="#FFFFFF" opacity={0.4} />
      {/* Music notes floating */}
      <Circle cx="64" cy="78" r="1" fill={lighten(color, 0.3)} opacity={0.3} />
      <Line x1="65" y1="78" x2="65" y2="74" stroke={lighten(color, 0.3)} strokeWidth="0.4" opacity={0.3} />
    </G>
  );
}

function Tiara({ color }: { color: string }): ReactElement {
  const gid = uid('tiara');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.5)} />
          <Stop offset="100%" stopColor={color} />
        </LinearGradient>
        <RadialGradient id={`${gid}-gem`} cx="50%" cy="35%" r="55%">
          <Stop offset="0%" stopColor={lighten(color, 0.7)} />
          <Stop offset="100%" stopColor={color} />
        </RadialGradient>
      </Defs>
      {/* Band — thicker */}
      <Path d="M 30 20 Q 50 16 70 20" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Band highlight */}
      <Path d="M 32 19 Q 50 15 68 19" stroke={lighten(color, 0.3)} strokeWidth="0.5" fill="none" opacity={0.5} />
      {/* Taller peaks — filigree pattern */}
      <Path d="M 32 19 Q 37 12 42 15 Q 46 8 50 10 Q 54 8 58 15 Q 63 12 68 19"
        fill="none" stroke={`url(#${gid})`} strokeWidth="2" />
      {/* Peak fill for visibility */}
      <Path d="M 34 18 Q 37 13 42 15 Q 46 9 50 11 Q 54 9 58 15 Q 63 13 66 18"
        fill={color} opacity={0.2} />
      {/* Gems — bigger with radial gradient */}
      <Ellipse cx="42" cy="15" rx="2.5" ry="2" fill={`url(#${gid}-gem)`} stroke={darken(color, 0.3)} strokeWidth="0.5" />
      <Ellipse cx="50" cy="10.5" rx="3" ry="2.5" fill={`url(#${gid}-gem)`} stroke={darken(color, 0.3)} strokeWidth="0.5" />
      <Ellipse cx="58" cy="15" rx="2.5" ry="2" fill={`url(#${gid}-gem)`} stroke={darken(color, 0.3)} strokeWidth="0.5" />
      {/* Sparkles */}
      <Circle cx="49" cy="9.5" r="0.7" fill="#FFFFFF" opacity={0.7} />
      <Circle cx="41" cy="14" r="0.5" fill="#FFFFFF" opacity={0.6} />
      <Circle cx="57" cy="14" r="0.5" fill="#FFFFFF" opacity={0.6} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// EFFECTS (ambient particles around cat)
// ─────────────────────────────────────────────────

function CherryBlossom(): ReactElement {
  const flowers = [
    { cx: 20, cy: 16, s: 1.2 }, { cx: 78, cy: 12, s: 1 },
    { cx: 14, cy: 42, s: 0.9 }, { cx: 84, cy: 34, s: 1.1 },
    { cx: 30, cy: 6, s: 0.8 }, { cx: 68, cy: 4, s: 0.9 },
    { cx: 10, cy: 64, s: 0.7 }, { cx: 88, cy: 56, s: 0.8 },
    { cx: 6, cy: 28, s: 0.6 }, { cx: 92, cy: 44, s: 0.7 },
  ];
  return (
    <G>
      {flowers.map((f, i) => {
        const s = f.s;
        const opacities = [0.7, 0.65, 0.6, 0.55, 0.5, 0.55, 0.6, 0.65, 0.5, 0.55];
        return (
          <G key={i} opacity={opacities[i]}>
            {/* 5-petal flower */}
            <Path d={`M ${f.cx} ${f.cy - 3 * s} Q ${f.cx + 2 * s} ${f.cy - 2 * s} ${f.cx} ${f.cy}`} fill="#FFB7C5" />
            <Path d={`M ${f.cx + 2.8 * s} ${f.cy - 1 * s} Q ${f.cx + 2 * s} ${f.cy + 1.5 * s} ${f.cx} ${f.cy}`} fill="#FFB7C5" />
            <Path d={`M ${f.cx + 1.7 * s} ${f.cy + 2.5 * s} Q ${f.cx - 0.5 * s} ${f.cy + 2 * s} ${f.cx} ${f.cy}`} fill="#FFC4D4" />
            <Path d={`M ${f.cx - 1.7 * s} ${f.cy + 2.5 * s} Q ${f.cx - 2 * s} ${f.cy + 0.5 * s} ${f.cx} ${f.cy}`} fill="#FFB7C5" />
            <Path d={`M ${f.cx - 2.8 * s} ${f.cy - 1 * s} Q ${f.cx - 1 * s} ${f.cy - 2 * s} ${f.cx} ${f.cy}`} fill="#FFC4D4" />
            {/* Center */}
            <Circle cx={f.cx} cy={f.cy} r={1 * s} fill="#FF8FA3" />
            <Circle cx={f.cx} cy={f.cy} r={0.4 * s} fill="#FFD700" opacity={0.6} />
          </G>
        );
      })}
    </G>
  );
}

function Constellation({ accent }: { accent: string }): ReactElement {
  const c = accent || '#E8E8FF';
  const stars = [
    { cx: 16, cy: 12, r: 1.8 }, { cx: 28, cy: 6, r: 1.5 },
    { cx: 78, cy: 10, r: 1.7 }, { cx: 88, cy: 22, r: 1.4 },
    { cx: 10, cy: 48, r: 1.5 }, { cx: 90, cy: 46, r: 1.3 },
    { cx: 6, cy: 30, r: 1.2 }, { cx: 94, cy: 34, r: 1.1 },
  ];
  return (
    <G>
      {/* Connecting lines — brighter with glow */}
      <Line x1="16" y1="12" x2="28" y2="6" stroke={c} strokeWidth="0.7" opacity={0.5} />
      <Line x1="78" y1="10" x2="88" y2="22" stroke={c} strokeWidth="0.7" opacity={0.5} />
      <Line x1="28" y1="6" x2="78" y2="10" stroke={c} strokeWidth="0.5" opacity={0.3} />
      <Line x1="10" y1="48" x2="16" y2="12" stroke={c} strokeWidth="0.5" opacity={0.3} />
      <Line x1="6" y1="30" x2="16" y2="12" stroke={c} strokeWidth="0.4" opacity={0.25} />
      <Line x1="88" y1="22" x2="90" y2="46" stroke={c} strokeWidth="0.4" opacity={0.25} />
      <Line x1="90" y1="46" x2="94" y2="34" stroke={c} strokeWidth="0.4" opacity={0.2} />
      {/* Stars with 3-layer glow effect */}
      {stars.map((s, i) => (
        <G key={i}>
          <Circle cx={s.cx} cy={s.cy} r={s.r * 3} fill={c} opacity={0.06} />
          <Circle cx={s.cx} cy={s.cy} r={s.r * 1.8} fill={c} opacity={0.15} />
          <Circle cx={s.cx} cy={s.cy} r={s.r} fill={c} opacity={0.8} />
          <Circle cx={s.cx} cy={s.cy} r={s.r * 0.35} fill="#FFFFFF" opacity={0.95} />
        </G>
      ))}
      {/* Tiny sparkle dust between main stars */}
      <Circle cx="22" cy="9" r="0.5" fill={c} opacity={0.35} />
      <Circle cx="52" cy="8" r="0.4" fill={c} opacity={0.25} />
      <Circle cx="84" cy="16" r="0.45" fill={c} opacity={0.3} />
      <Circle cx="8" cy="38" r="0.4" fill={c} opacity={0.2} />
      <Circle cx="92" cy="40" r="0.35" fill={c} opacity={0.2} />
    </G>
  );
}

function SpeedAura({ color }: { color: string }): ReactElement {
  return (
    <G>
      {/* Primary speed lines — longer and bolder */}
      {[
        { y: 30, x1: 4, x2: 22, w: 2.5, o: 0.6 },
        { y: 40, x1: 2, x2: 20, w: 2, o: 0.55 },
        { y: 50, x1: 4, x2: 18, w: 2, o: 0.5 },
        { y: 60, x1: 6, x2: 20, w: 1.8, o: 0.45 },
        { y: 70, x1: 8, x2: 18, w: 1.5, o: 0.35 },
      ].map((l, i) => (
        <Line key={i} x1={l.x1} y1={l.y} x2={l.x2} y2={l.y}
          stroke={color} strokeWidth={l.w} opacity={l.o} strokeLinecap="round" />
      ))}
      {/* Short accent dashes */}
      <Line x1="10" y1="35" x2="16" y2="35" stroke={color} strokeWidth="1" opacity={0.3} strokeLinecap="round" />
      <Line x1="12" y1="55" x2="17" y2="55" stroke={color} strokeWidth="1" opacity={0.25} strokeLinecap="round" />
      <Line x1="8" y1="65" x2="14" y2="65" stroke={color} strokeWidth="1" opacity={0.2} strokeLinecap="round" />
    </G>
  );
}

function Candelabra(): ReactElement {
  const gid = uid('candel');
  const flames = [
    { x: 38, base: 2, h: 6 }, { x: 50, base: -1, h: 7 }, { x: 62, base: 2, h: 6 },
  ];
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#C4A035" />
          <Stop offset="50%" stopColor="#A08030" />
          <Stop offset="100%" stopColor="#6B5520" />
        </LinearGradient>
      </Defs>
      {/* Main stem — ornate brass */}
      <Line x1="50" y1="18" x2="50" y2="10" stroke={`url(#${gid})`} strokeWidth="2.5" strokeLinecap="round" />
      {/* Cross bar — curved brass arms */}
      <Path d="M 36 10 Q 42 8 50 10 Q 58 8 64 10" stroke="#A08030" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Cross bar highlight */}
      <Path d="M 38 9 Q 44 7.5 50 9 Q 56 7.5 62 9" stroke="#C4A035" strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Decorative center knob */}
      <Circle cx="50" cy="12" r="1.5" fill="#A08030" stroke="#6B5520" strokeWidth="0.3" />
      <Circle cx="49.5" cy="11.5" r="0.5" fill="#C4A035" opacity={0.4} />
      {/* Base */}
      <Ellipse cx="50" cy="18" rx="5" ry="1.5" fill="#A08030" stroke="#6B5520" strokeWidth="0.3" />
      {flames.map((f, i) => (
        <G key={i}>
          {/* Candle drip cup */}
          <Ellipse cx={f.x} cy={f.base + 6} rx="2.5" ry="0.8" fill="#A08030" stroke="#6B5520" strokeWidth="0.3" />
          {/* Candle stick — ivory wax */}
          <Rect x={f.x - 1.2} y={f.base + 1} width="2.4" height="5" rx="0.5" fill="#FFF8DC" stroke="#E8E0C0" strokeWidth="0.3" />
          {/* Wax drip */}
          <Path d={`M ${f.x - 0.8} ${f.base + 1} Q ${f.x - 1.2} ${f.base + 2.5} ${f.x - 0.6} ${f.base + 3}`}
            fill="#FFF0D0" opacity={0.6} />
          {/* Outer flame glow */}
          <Circle cx={f.x} cy={f.base - 1} r={f.h * 0.5} fill="#FFA500" opacity={0.15} />
          {/* Outer flame */}
          <Path d={`M ${f.x - 2} ${f.base + 1} Q ${f.x} ${f.base - f.h} ${f.x + 2} ${f.base + 1} Q ${f.x} ${f.base - 1} ${f.x - 2} ${f.base + 1}`}
            fill="#FFA500" />
          {/* Mid flame */}
          <Path d={`M ${f.x - 1.2} ${f.base + 1} Q ${f.x} ${f.base - f.h * 0.7} ${f.x + 1.2} ${f.base + 1}`}
            fill="#FFD700" opacity={0.8} />
          {/* Inner flame */}
          <Path d={`M ${f.x - 0.5} ${f.base + 1} Q ${f.x} ${f.base - f.h * 0.4} ${f.x + 0.5} ${f.base + 1}`}
            fill="#FFFFAA" opacity={0.9} />
          {/* Flame tip */}
          <Circle cx={f.x} cy={f.base - f.h * 0.8} r="0.4" fill="#FFFFFF" opacity={0.6} />
        </G>
      ))}
    </G>
  );
}

function PianoThrone(): ReactElement {
  const gid = uid('throne');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#C4783C" />
          <Stop offset="40%" stopColor="#A0522D" />
          <Stop offset="100%" stopColor="#5C3317" />
        </LinearGradient>
        <LinearGradient id={`${gid}-cush`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#8B0000" />
          <Stop offset="50%" stopColor="#6B0000" />
          <Stop offset="100%" stopColor="#4B0000" />
        </LinearGradient>
      </Defs>
      {/* Seat frame — ornate wood */}
      <Path d="M 28 89 Q 30 87 50 86 Q 70 87 72 89 Q 72 95 50 96 Q 28 95 28 89"
        fill={`url(#${gid})`} stroke="#3E1E0E" strokeWidth="0.5" />
      {/* Seat cushion — velvet with tufting */}
      <Path d="M 30 88 Q 32 86 50 85 Q 68 86 70 88 Q 70 93 50 94 Q 30 93 30 88"
        fill={`url(#${gid}-cush`} stroke="#4B0000" strokeWidth="0.4" />
      {/* Tufted button details */}
      <Circle cx="42" cy="89" r="1" fill="#8B0000" stroke="#4B0000" strokeWidth="0.3" />
      <Circle cx="50" cy="88.5" r="1" fill="#8B0000" stroke="#4B0000" strokeWidth="0.3" />
      <Circle cx="58" cy="89" r="1" fill="#8B0000" stroke="#4B0000" strokeWidth="0.3" />
      {/* Cushion highlight */}
      <Path d="M 34 87 Q 50 85.5 66 87" stroke="#AA2020" strokeWidth="0.4" fill="none" opacity={0.4} />
      {/* Ornate carved legs — turned wood */}
      <Path d="M 32 95 L 30 100 Q 30 101 32 101 L 34 101 Q 36 101 36 100 L 34 95"
        fill={`url(#${gid})`} stroke="#3E1E0E" strokeWidth="0.3" />
      <Path d="M 66 95 L 64 100 Q 64 101 66 101 L 68 101 Q 70 101 70 100 L 68 95"
        fill={`url(#${gid})`} stroke="#3E1E0E" strokeWidth="0.3" />
      {/* Leg turnings — decorative bulges */}
      <Ellipse cx="33" cy="97" rx="2.5" ry="1" fill="#8B6238" stroke="#5C3317" strokeWidth="0.3" />
      <Ellipse cx="67" cy="97" rx="2.5" ry="1" fill="#8B6238" stroke="#5C3317" strokeWidth="0.3" />
      {/* Cross brace */}
      <Line x1="35" y1="99" x2="65" y2="99" stroke="#5C3317" strokeWidth="1.5" />
      <Line x1="36" y1="98.5" x2="64" y2="98.5" stroke="#8B6238" strokeWidth="0.4" opacity={0.3} />
      {/* Gold detail accents */}
      <Circle cx="33" cy="97" r="0.6" fill="#FFD700" opacity={0.4} />
      <Circle cx="67" cy="97" r="0.6" fill="#FFD700" opacity={0.4} />
      <Circle cx="50" cy="99" r="0.8" fill="#FFD700" opacity={0.3} />
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
      {[
        { cx: 14, cy: 20 }, { cx: 86, cy: 25 }, { cx: 10, cy: 55 },
        { cx: 90, cy: 60 }, { cx: 20, cy: 85 }, { cx: 80, cy: 88 }, { cx: 50, cy: 6 },
      ].map((p, i) => (
        <G key={i}>
          <Circle cx={p.cx} cy={p.cy} r={2} fill={accent} opacity={0.15} />
          <Circle cx={p.cx} cy={p.cy} r={1.1} fill={accent} opacity={0.6} />
        </G>
      ))}
    </G>
  );
}

// ─────────────────────────────────────────────────
// ADDITIONAL HATS & OUTFITS
// ─────────────────────────────────────────────────

function TopHat(): ReactElement {
  const gid = uid('tophat');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#4A4A4A" />
          <Stop offset="50%" stopColor="#2A2A2A" />
          <Stop offset="100%" stopColor="#1A1A1A" />
        </LinearGradient>
      </Defs>
      {/* Brim shadow */}
      <Ellipse cx="50" cy="20" rx="23" ry="4.5" fill="#0A0A0A" opacity={0.5} />
      {/* Brim */}
      <Ellipse cx="50" cy="19" rx="23" ry="4.5" fill="#1A1A1A" stroke="#333" strokeWidth="0.3" />
      <Ellipse cx="50" cy="18.5" rx="22" ry="4" fill={`url(#${gid})`} />
      {/* Brim highlight edge */}
      <Path d="M 28 18 Q 50 14 72 18" stroke="#555" strokeWidth="0.4" fill="none" opacity={0.3} />
      {/* Tall crown */}
      <Rect x="35" y="2" width="30" height="17" rx="2" fill={`url(#${gid})`} stroke="#333" strokeWidth="0.3" />
      {/* Crown silk shine — multiple streaks */}
      <Path d="M 39 4 Q 42 3 42 16" stroke="#555" strokeWidth="0.8" fill="none" opacity={0.25} />
      <Path d="M 44 3 Q 46 2 46 15" stroke="#555" strokeWidth="0.5" fill="none" opacity={0.15} />
      {/* Top rim */}
      <Ellipse cx="50" cy="3" rx="14.5" ry="2.5" fill="#2A2A2A" stroke="#3A3A3A" strokeWidth="0.3" />
      <Ellipse cx="49" cy="2.5" rx="5" ry="1" fill="#444" opacity={0.2} />
      {/* Band — rich satin with buckle */}
      <Rect x="35" y="13" width="30" height="4" fill="#8B0000" />
      <Rect x="35" y="13.5" width="30" height="1.2" fill="#CC2020" opacity={0.3} />
      {/* Band buckle */}
      <Rect x="47" y="13" width="6" height="4" rx="0.5" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
      <Rect x="48.5" y="13.8" width="3" height="2.4" rx="0.3" fill="#8B0000" />
      {/* Buckle shine */}
      <Circle cx="48" cy="14" r="0.4" fill="#FFF8DC" opacity={0.5} />
    </G>
  );
}

function SantaHat(): ReactElement {
  const gid = uid('santa');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#FF3333" />
          <Stop offset="100%" stopColor="#CC1111" />
        </LinearGradient>
      </Defs>
      {/* Hat body — floppy cone drooping right */}
      <Path d="M 28 22 Q 36 8 50 6 Q 58 5 68 10 Q 75 14 78 8 Q 76 16 68 14 Q 56 10 50 10 Q 38 12 28 22 Z"
        fill={`url(#${gid})`} />
      {/* Fabric shadow */}
      <Path d="M 40 12 Q 55 8 70 12" stroke="#AA0000" strokeWidth="0.4" fill="none" opacity={0.4} />
      {/* White fur trim band — thick and fluffy */}
      <Path d="M 26 24 Q 38 18 50 17 Q 62 18 74 24"
        stroke="#FFFFFF" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* Fur texture dots */}
      <Circle cx="30" cy="22" r="0.6" fill="#E8E8E8" />
      <Circle cx="38" cy="19" r="0.5" fill="#E8E8E8" />
      <Circle cx="46" cy="18" r="0.6" fill="#E8E8E8" />
      <Circle cx="54" cy="18" r="0.5" fill="#E8E8E8" />
      <Circle cx="62" cy="19" r="0.6" fill="#E8E8E8" />
      <Circle cx="70" cy="22" r="0.5" fill="#E8E8E8" />
      {/* Pompom */}
      <Circle cx="78" cy="8" r="4.5" fill="#FFFFFF" />
      <Circle cx="77" cy="7" r="1.5" fill="#F0F0F0" opacity={0.6} />
    </G>
  );
}

function WizardHat({ color }: { color: string }): ReactElement {
  const gid = uid('wizard');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.35)} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.6)} />
        </LinearGradient>
      </Defs>
      {/* Brim shadow */}
      <Ellipse cx="50" cy="20" rx="27" ry="5.5" fill={darken(color, 0.6)} opacity={0.4} />
      {/* Brim */}
      <Ellipse cx="50" cy="19" rx="27" ry="5.5" fill={darken(color, 0.5)} stroke={darken(color, 0.6)} strokeWidth="0.3" />
      <Ellipse cx="50" cy="18.5" rx="26" ry="5" fill={`url(#${gid})`} />
      {/* Tall cone — slightly bent tip */}
      <Path d="M 34 19 Q 40 2 48 -8 Q 52 -10 54 -6 Q 56 0 66 19 Z"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      {/* Cone fabric wrinkle */}
      <Path d="M 42 10 Q 48 8 52 12" stroke={darken(color, 0.4)} strokeWidth="0.4" fill="none" opacity={0.3} />
      {/* Band at base */}
      <Path d="M 34 16 Q 50 12 66 16" stroke={lighten(color, 0.2)} strokeWidth="2" fill="none" />
      {/* Stars — with multi-layer glow */}
      {[
        { x: 40, y: 10, r: 1.8 }, { x: 56, y: 4, r: 1.5 }, { x: 46, y: 15, r: 1.2 },
      ].map((s, i) => (
        <G key={i}>
          <Circle cx={s.x} cy={s.y} r={s.r * 2} fill="#FFD700" opacity={0.1} />
          <Circle cx={s.x} cy={s.y} r={s.r} fill="#FFD700" opacity={0.7} />
          <Circle cx={s.x} cy={s.y} r={s.r * 0.3} fill="#FFFFFF" opacity={0.8} />
        </G>
      ))}
      {/* Moon — larger crescent */}
      <Path d="M 56 8 A 3 3 0 1 1 56 14 A 2 2 0 1 0 56 8" fill="#FFD700" opacity={0.7} />
      <Circle cx="57.5" cy="9.5" r="0.4" fill="#FFFFFF" opacity={0.5} />
      {/* Sparkle trail from tip */}
      <Circle cx="52" cy="-6" r="0.6" fill="#FFD700" opacity={0.5} />
      <Circle cx="55" cy="-4" r="0.4" fill="#FFD700" opacity={0.35} />
      <Circle cx="54" cy="-8" r="0.3" fill="#FFD700" opacity={0.25} />
    </G>
  );
}

function PirateHat(): ReactElement {
  const gid = uid('pirate');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#444444" />
          <Stop offset="50%" stopColor="#2A2A2A" />
          <Stop offset="100%" stopColor="#1A1A1A" />
        </LinearGradient>
      </Defs>
      {/* Hat body — tricorn with more shape */}
      <Path d="M 22 22 Q 28 6 50 2 Q 72 6 78 22 Q 70 26 50 24 Q 30 26 22 22"
        fill={`url(#${gid})`} stroke="#333" strokeWidth="0.4" />
      {/* Hat brim upturn hints */}
      <Path d="M 24 21 Q 22 18 26 16" stroke="#555" strokeWidth="0.5" fill="none" opacity={0.3} />
      <Path d="M 76 21 Q 78 18 74 16" stroke="#555" strokeWidth="0.5" fill="none" opacity={0.3} />
      {/* Gold braid trim — ornate */}
      <Path d="M 24 22 Q 50 17 76 22" stroke="#FFD700" strokeWidth="1.5" fill="none" />
      <Path d="M 26 21 Q 50 16.5 74 21" stroke="#FFF0A0" strokeWidth="0.4" fill="none" opacity={0.4} />
      {/* Skull — larger with more detail */}
      <Circle cx="50" cy="13" r="4" fill="#F5F0DC" stroke="#D0C8A0" strokeWidth="0.3" />
      {/* Eye sockets */}
      <Ellipse cx="48" cy="12.5" rx="1.2" ry="1" fill="#1A1A1A" />
      <Ellipse cx="52" cy="12.5" rx="1.2" ry="1" fill="#1A1A1A" />
      {/* Nose hole */}
      <Path d="M 49.5 14 L 50 15 L 50.5 14" fill="#1A1A1A" />
      {/* Teeth */}
      <Path d="M 48 16 L 48.5 17 L 49.5 16 L 50.5 17 L 51.5 16 L 52 17" stroke="#F5F0DC" strokeWidth="0.5" fill="none" />
      {/* Crossbones */}
      <Line x1="44" y1="16" x2="56" y2="20" stroke="#F5F0DC" strokeWidth="1" strokeLinecap="round" />
      <Line x1="56" y1="16" x2="44" y2="20" stroke="#F5F0DC" strokeWidth="1" strokeLinecap="round" />
      {/* Bone ends */}
      <Circle cx="44" cy="16" r="0.8" fill="#F5F0DC" />
      <Circle cx="56" cy="16" r="0.8" fill="#F5F0DC" />
      <Circle cx="44" cy="20" r="0.8" fill="#F5F0DC" />
      <Circle cx="56" cy="20" r="0.8" fill="#F5F0DC" />
      {/* Feather accent */}
      <Path d="M 68 8 Q 72 4 70 -2 Q 74 2 72 8" fill="#CC0000" opacity={0.7} />
      <Line x1="70" y1="8" x2="70" y2="-1" stroke="#AA0000" strokeWidth="0.3" opacity={0.5} />
    </G>
  );
}

function NightCap({ color }: { color: string }): ReactElement {
  const gid = uid('nightcap');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.25)} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.5)} />
        </LinearGradient>
      </Defs>
      {/* Floppy cap body — fuller and droopier */}
      <Path d="M 30 22 Q 36 10 50 6 Q 66 2 76 10 Q 80 16 74 20 Q 70 22 30 22 Z"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.4" />
      {/* Cap fabric folds */}
      <Path d="M 44 10 Q 50 14 56 8" stroke={darken(color, 0.4)} strokeWidth="0.5" fill="none" opacity={0.3} />
      <Path d="M 60 6 Q 66 10 70 6" stroke={darken(color, 0.4)} strokeWidth="0.4" fill="none" opacity={0.25} />
      {/* Stars/moon pattern on fabric */}
      <Circle cx="42" cy="14" r="1" fill={lighten(color, 0.3)} opacity={0.3} />
      <Circle cx="56" cy="10" r="0.8" fill={lighten(color, 0.3)} opacity={0.25} />
      <Path d="M 66 12 A 1.5 1.5 0 1 1 66 15 A 1 1 0 1 0 66 12" fill={lighten(color, 0.3)} opacity={0.25} />
      {/* Ribbed band — thicker with texture */}
      <Path d="M 30 22 Q 50 18 70 22" stroke={darken(color, 0.5)} strokeWidth="4" fill="none" strokeLinecap="round" />
      <Path d="M 32 21 Q 50 17 68 21" stroke={lighten(color, 0.15)} strokeWidth="0.5" fill="none" opacity={0.3} />
      {/* Rib detail lines */}
      <Line x1="36" y1="20" x2="36" y2="24" stroke={darken(color, 0.6)} strokeWidth="0.3" opacity={0.3} />
      <Line x1="42" y1="19" x2="42" y2="23" stroke={darken(color, 0.6)} strokeWidth="0.3" opacity={0.3} />
      <Line x1="50" y1="18" x2="50" y2="22" stroke={darken(color, 0.6)} strokeWidth="0.3" opacity={0.3} />
      <Line x1="58" y1="19" x2="58" y2="23" stroke={darken(color, 0.6)} strokeWidth="0.3" opacity={0.3} />
      <Line x1="64" y1="20" x2="64" y2="24" stroke={darken(color, 0.6)} strokeWidth="0.3" opacity={0.3} />
      {/* Pompom — fluffy with detail */}
      <Circle cx="76" cy="12" r="5" fill={lighten(color, 0.35)} stroke={color} strokeWidth="0.3" />
      <Circle cx="74" cy="10" r="2" fill={lighten(color, 0.5)} opacity={0.5} />
      <Circle cx="78" cy="12" r="1.5" fill={lighten(color, 0.45)} opacity={0.3} />
      <Circle cx="75" cy="14" r="1" fill={lighten(color, 0.4)} opacity={0.3} />
    </G>
  );
}

function HawaiianShirt({ color }: { color: string }): ReactElement {
  const gid = uid('hawaiian');
  const flowerColor = lighten(color, 0.5);
  const leafColor = '#4CAF50';
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.2)} />
          <Stop offset="100%" stopColor={darken(color, 0.5)} />
        </LinearGradient>
      </Defs>
      {/* Shirt body — rounded barrel shape following cat body */}
      <Path d="M 34 48 Q 26 56 25 66 Q 26 76 34 82 Q 50 86 66 82 Q 74 76 75 66 Q 74 56 66 48 Q 58 44 50 46 Q 42 44 34 48"
        fill={`url(#${gid})`} />
      {/* Open collar V — wider neckline */}
      <Path d="M 42 48 L 50 56 L 58 48" fill={darken(color, 0.4)} opacity={0.35} />
      <Path d="M 43 48 L 50 55" stroke={lighten(color, 0.2)} strokeWidth="0.3" fill="none" opacity={0.4} />
      {/* Hibiscus flower 1 — large on belly */}
      <Circle cx="36" cy="62" r="3.5" fill={flowerColor} opacity={0.6} />
      <Path d="M 33 62 Q 36 60 39 62" fill={lighten(flowerColor, 0.3)} opacity={0.4} />
      <Path d="M 36 59 Q 38 62 36 65" fill={lighten(flowerColor, 0.3)} opacity={0.4} />
      <Circle cx="36" cy="62" r="1.5" fill="#FFD700" opacity={0.7} />
      {/* Leaf near flower 1 */}
      <Path d="M 40 64 Q 43 62 44 66" fill={leafColor} opacity={0.25} />
      {/* Hibiscus flower 2 */}
      <Circle cx="60" cy="68" r="3" fill={flowerColor} opacity={0.55} />
      <Path d="M 57 68 Q 60 66 63 68" fill={lighten(flowerColor, 0.3)} opacity={0.4} />
      <Circle cx="60" cy="68" r="1.2" fill="#FFD700" opacity={0.6} />
      <Path d="M 56 70 Q 54 68 55 66" fill={leafColor} opacity={0.2} />
      {/* Small flower 3 */}
      <Circle cx="46" cy="74" r="2.5" fill={flowerColor} opacity={0.45} />
      <Circle cx="46" cy="74" r="1" fill="#FFD700" opacity={0.5} />
      {/* Leaf accents */}
      <Path d="M 32 70 Q 30 68 32 66" fill={leafColor} opacity={0.2} />
      <Path d="M 64 74 Q 66 72 66 76" fill={leafColor} opacity={0.2} />
    </G>
  );
}

function Hoodie({ color }: { color: string }): ReactElement {
  const gid = uid('hoodie');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.15)} />
          <Stop offset="100%" stopColor={darken(color, 0.5)} />
        </LinearGradient>
      </Defs>
      {/* Hood behind head — visible as outline peeking around head */}
      <Path d="M 28 52 Q 26 40 28 28 Q 32 18 50 15 Q 68 18 72 28 Q 74 40 72 52"
        fill={darken(color, 0.4)} stroke={darken(color, 0.5)} strokeWidth="0.6" />
      {/* Hood inner shadow */}
      <Path d="M 31 50 Q 30 40 32 30 Q 36 22 50 19 Q 64 22 68 30 Q 70 40 69 50"
        fill={darken(color, 0.5)} opacity={0.5} />
      {/* Body — follows cat body curve, not oversized */}
      <Path d="M 50 54 C 63 54 70 60 70 68 C 70 76 62 82 50 82 C 38 82 30 76 30 68 C 30 60 37 54 50 54 Z"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.5" />
      {/* Collar/neckline */}
      <Path d="M 36 55 Q 43 51 50 50 Q 57 51 64 55"
        stroke={darken(color, 0.5)} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Front zipper */}
      <Line x1="50" y1="52" x2="50" y2="80" stroke={lighten(color, 0.15)} strokeWidth="0.8" />
      {/* Zipper pull */}
      <Rect x="49" y="54" width="2" height="3" rx="0.5" fill={lighten(color, 0.3)} />
      {/* Kangaroo pocket */}
      <Path d="M 40 68 Q 50 66 60 68 Q 60 73 50 73 Q 40 73 40 68 Z"
        fill={darken(color, 0.4)} stroke={darken(color, 0.5)} strokeWidth="0.4" />
      {/* Pocket opening highlight */}
      <Path d="M 42 67 Q 50 66.5 58 67" stroke={lighten(color, 0.15)} strokeWidth="0.4" fill="none" opacity={0.5} />
      {/* Drawstrings */}
      <Line x1="45" y1="51" x2="44" y2="58" stroke={lighten(color, 0.25)} strokeWidth="0.6" />
      <Line x1="55" y1="51" x2="56" y2="58" stroke={lighten(color, 0.25)} strokeWidth="0.6" />
      <Circle cx="44" cy="58.5" r="0.8" fill={lighten(color, 0.25)} />
      <Circle cx="56" cy="58.5" r="0.8" fill={lighten(color, 0.25)} />
    </G>
  );
}

function SportsJersey({ color }: { color: string }): ReactElement {
  const gid = uid('jersey');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.25)} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.4)} />
        </LinearGradient>
      </Defs>
      {/* Body — rounded barrel shape following cat body */}
      <Path d="M 34 48 Q 26 56 25 66 Q 26 76 34 82 Q 50 86 66 82 Q 74 76 75 66 Q 74 56 66 48 Q 58 44 50 46 Q 42 44 34 48"
        fill={`url(#${gid})`} stroke={darken(color, 0.4)} strokeWidth="0.4" />
      {/* Side stripe — racing stripe */}
      <Path d="M 28 56 Q 26 66 28 76" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity={0.5} />
      <Path d="M 72 56 Q 74 66 72 76" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity={0.5} />
      {/* Sleeves — with trim detail */}
      <Path d="M 30 54 Q 22 52 20 58 Q 22 64 28 60" fill={darken(color, 0.3)} stroke={darken(color, 0.4)} strokeWidth="0.3" />
      <Path d="M 70 54 Q 78 52 80 58 Q 78 64 72 60" fill={darken(color, 0.3)} stroke={darken(color, 0.4)} strokeWidth="0.3" />
      {/* Sleeve trim bands */}
      <Path d="M 22 54 Q 20 56 22 58" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity={0.5} />
      <Path d="M 78 54 Q 80 56 78 58" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity={0.5} />
      {/* Collar — V-neck with contrast */}
      <Path d="M 42 48 Q 50 52 58 48" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <Path d="M 43 48 Q 50 51 57 48" stroke={darken(color, 0.5)} strokeWidth="0.5" fill="none" />
      {/* Number "1" — with outline for pop */}
      <Path d="M 48 58 L 50 56 L 50 70 M 46 70 L 54 70" stroke={darken(color, 0.4)} strokeWidth="2.8" fill="none" />
      <Path d="M 48 58 L 50 56 L 50 70 M 46 70 L 54 70" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      {/* Mesh texture — subtle dots */}
      {[{ x: 38, y: 62 }, { x: 42, y: 68 }, { x: 58, y: 62 }, { x: 62, y: 68 }, { x: 38, y: 74 }, { x: 62, y: 74 }].map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r="0.3" fill={darken(color, 0.3)} opacity={0.12} />
      ))}
      {/* Bottom hem */}
      <Path d="M 34 82 Q 50 86 66 82" stroke={darken(color, 0.5)} strokeWidth="1" fill="none" />
      <Path d="M 36 81 Q 50 84 64 81" stroke={lighten(color, 0.15)} strokeWidth="0.3" fill="none" opacity={0.3} />
    </G>
  );
}

function SuperheroSuit({ color }: { color: string }): ReactElement {
  const gid = uid('superhero');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.25)} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.5)} />
        </LinearGradient>
        <LinearGradient id={`${gid}-cape`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#CC2222" />
          <Stop offset="100%" stopColor="#880000" />
        </LinearGradient>
      </Defs>
      {/* Cape — flowing behind body */}
      <Path d="M 34 50 Q 18 62 20 86 Q 30 90 50 88 Q 70 90 80 86 Q 82 62 66 50"
        fill={`url(#${gid}-cape)`} opacity={0.6} />
      <Path d="M 36 52 Q 22 64 24 84" stroke="#AA0000" strokeWidth="0.4" fill="none" opacity={0.3} />
      <Path d="M 64 52 Q 78 64 76 84" stroke="#AA0000" strokeWidth="0.4" fill="none" opacity={0.3} />
      {/* Body — tight-fitting */}
      <Path d="M 34 48 Q 28 56 27 66 Q 28 76 34 84 Q 50 88 66 84 Q 72 76 73 66 Q 72 56 66 48 Q 58 44 50 46 Q 42 44 34 48"
        fill={`url(#${gid})`} stroke={darken(color, 0.4)} strokeWidth="0.4" />
      {/* Muscle contour lines — subtle */}
      <Path d="M 36 56 Q 40 62 38 68" stroke={darken(color, 0.3)} strokeWidth="0.4" fill="none" opacity={0.2} />
      <Path d="M 64 56 Q 60 62 62 68" stroke={darken(color, 0.3)} strokeWidth="0.4" fill="none" opacity={0.2} />
      {/* Chest emblem — shield with glow */}
      <Circle cx="50" cy="58" r="8" fill="#FFD700" opacity={0.08} />
      <Path d="M 43 54 L 50 50 L 57 54 L 57 62 Q 50 68 43 62 Z"
        fill="#FFD700" stroke="#B8860B" strokeWidth="0.6" />
      {/* Shield inner border */}
      <Path d="M 44.5 55 L 50 51.5 L 55.5 55 L 55.5 61 Q 50 66 44.5 61 Z"
        fill="none" stroke="#CC9B00" strokeWidth="0.4" />
      {/* Shield emblem — lightning bolt */}
      <Path d="M 49 54 L 51 54 L 49 58 L 52 58 L 48 64 L 50 59 L 47.5 59 Z"
        fill="#FF4444" stroke="#CC0000" strokeWidth="0.3" />
      {/* Shield sparkle */}
      <Circle cx="46" cy="54" r="0.5" fill="#FFFFFF" opacity={0.4} />
      {/* Belt — curved with buckle */}
      <Path d="M 30 74 Q 50 78 70 74" stroke="#FFD700" strokeWidth="3" fill="none" />
      <Path d="M 32 73.5 Q 50 77 68 73.5" stroke="#FFF0A0" strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Belt buckle */}
      <Rect x="46" y="74" width="8" height="4" rx="1" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
      <Circle cx="50" cy="76" r="1" fill={color} />
      <Circle cx="49.5" cy="75.5" r="0.3" fill="#FFF8DC" opacity={0.5} />
      {/* Collar detail */}
      <Path d="M 38 48 Q 50 52 62 48" stroke={lighten(color, 0.2)} strokeWidth="1.5" fill="none" />
    </G>
  );
}

function Bandana({ color }: { color: string }): ReactElement {
  const gid = uid('bandana');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.15)} />
          <Stop offset="100%" stopColor={darken(color, 0.3)} />
        </LinearGradient>
      </Defs>
      {/* Bandana wrap around neck */}
      <Path d="M 30 52 Q 40 48 50 47 Q 60 48 70 52 Q 68 55 50 54 Q 32 55 30 52 Z"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.5" />
      {/* Wrap highlight */}
      <Path d="M 32 51 Q 50 47 68 51" stroke={lighten(color, 0.2)} strokeWidth="0.4" fill="none" opacity={0.3} />
      {/* Front triangle point — bigger */}
      <Path d="M 38 54 Q 44 54 50 64 Q 56 54 62 54 L 56 55 L 50 66 L 44 55 Z"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.4" />
      {/* Triangle fold shadows */}
      <Path d="M 46 55 L 50 64 L 54 55" stroke={darken(color, 0.4)} strokeWidth="0.5" fill="none" opacity={0.4} />
      <Path d="M 44 55 L 48 60" stroke={darken(color, 0.35)} strokeWidth="0.3" fill="none" opacity={0.25} />
      <Path d="M 56 55 L 52 60" stroke={darken(color, 0.35)} strokeWidth="0.3" fill="none" opacity={0.25} />
      {/* Paisley pattern — larger ornate teardrops */}
      <Path d="M 47 57 Q 47.5 55.5 49 56 Q 48 58 47 57" fill={lighten(color, 0.35)} opacity={0.4} />
      <Path d="M 51 57 Q 51.5 55.5 53 56 Q 52 58 51 57" fill={lighten(color, 0.35)} opacity={0.4} />
      <Circle cx="50" cy="59" r="1" fill={lighten(color, 0.4)} opacity={0.35} />
      <Circle cx="50" cy="59" r="0.4" fill={lighten(color, 0.5)} opacity={0.3} />
      {/* Dot border pattern on wrap */}
      {[34, 38, 42, 46, 54, 58, 62, 66].map((x, i) => (
        <Circle key={i} cx={x} cy={51 + Math.abs(x - 50) * 0.06} r="0.4" fill={lighten(color, 0.3)} opacity={0.3} />
      ))}
      {/* Back knot — more defined */}
      <Path d="M 67 51 Q 72 48 75 51 Q 72 54 68 52 Z" fill={darken(color, 0.4)} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      <Circle cx="71" cy="51" r="0.5" fill={lighten(color, 0.15)} opacity={0.3} />
      {/* Ribbon tails — with fabric fold */}
      <Path d="M 73 50 Q 77 48 79 49 Q 78 50 75 51 Z" fill={darken(color, 0.35)} stroke={darken(color, 0.5)} strokeWidth="0.2" />
      <Path d="M 73 52 Q 78 53 80 55 Q 77 54 74 53 Z" fill={darken(color, 0.45)} stroke={darken(color, 0.5)} strokeWidth="0.2" />
      {/* Tail highlights */}
      <Path d="M 74 49 Q 76 48 78 49" stroke={lighten(color, 0.15)} strokeWidth="0.2" fill="none" opacity={0.3} />
      {/* Stitching along triangle edge */}
      <Path d="M 40 54 L 50 64" stroke={darken(color, 0.5)} strokeWidth="0.3" fill="none" strokeDasharray="1 1" opacity={0.2} />
    </G>
  );
}

function GoldMedal(): ReactElement {
  const gid = uid('medal');
  return (
    <G>
      <Defs>
        <RadialGradient id={gid} cx="40%" cy="30%" r="55%">
          <Stop offset="0%" stopColor="#FFF8DC" />
          <Stop offset="40%" stopColor="#FFD700" />
          <Stop offset="100%" stopColor="#B8860B" />
        </RadialGradient>
      </Defs>
      {/* Ribbon V — richer detail */}
      <Path d="M 44 48 L 42 52 L 50 58 L 58 52 L 56 48"
        fill="#CC0000" stroke="#990000" strokeWidth="0.3" />
      {/* Ribbon fold highlight */}
      <Path d="M 44 48 L 46 52 L 50 50" fill="#FF3333" opacity={0.5} />
      <Path d="M 56 48 L 54 52 L 50 50" fill="#AA0000" opacity={0.3} />
      {/* Ribbon stripes */}
      <Line x1="44" y1="49" x2="48" y2="53" stroke="#FFD700" strokeWidth="0.4" opacity={0.4} />
      <Line x1="56" y1="49" x2="52" y2="53" stroke="#FFD700" strokeWidth="0.4" opacity={0.4} />
      {/* Medal disc — larger with rim */}
      <Circle cx="50" cy="62" r="6.5" fill="#B8860B" />
      <Circle cx="50" cy="62" r="6" fill={`url(#${gid})`} stroke="#B8860B" strokeWidth="0.6" />
      {/* Decorative rim ring */}
      <Circle cx="50" cy="62" r="5" fill="none" stroke="#CC9B00" strokeWidth="0.4" />
      {/* Star emblem — 5-point */}
      <Path d="M 50 57 L 51.5 60 L 54.8 60.5 L 52.2 62.5 L 53 65.8 L 50 64 L 47 65.8 L 47.8 62.5 L 45.2 60.5 L 48.5 60 Z"
        fill="#FFF8DC" opacity={0.7} />
      {/* Star inner detail */}
      <Circle cx="50" cy="61.5" r="1.2" fill="#FFD700" opacity={0.5} />
      {/* Metallic shine */}
      <Circle cx="48" cy="60" r="1.2" fill="#FFFFFF" opacity={0.25} />
      <Circle cx="47.5" cy="59.5" r="0.5" fill="#FFFFFF" opacity={0.4} />
      {/* Loop at top */}
      <Circle cx="50" cy="56" r="1.5" fill="#FFD700" stroke="#B8860B" strokeWidth="0.4" />
      <Circle cx="50" cy="56" r="0.8" fill="#B8860B" />
    </G>
  );
}

function MusicNotePendant({ color }: { color: string }): ReactElement {
  return (
    <G>
      {/* Chain — at cat neck y≈50 */}
      <Path d="M 38 52 Q 44 50 50 49 Q 56 50 62 52" stroke={lighten(color, 0.3)} strokeWidth="0.8" fill="none" />
      {/* Note head — bigger */}
      <Ellipse cx="46" cy="60" rx="4" ry="3" fill={color} stroke={darken(color, 0.3)} strokeWidth="0.4" />
      <Ellipse cx="45" cy="59" rx="1.5" ry="1" fill={lighten(color, 0.3)} opacity={0.3} />
      {/* Stem */}
      <Line x1="50" y1="60" x2="50" y2="49" stroke={color} strokeWidth="1.5" />
      {/* Flag — double */}
      <Path d="M 50 49 Q 56 51 54 55" stroke={color} strokeWidth="1.2" fill="none" />
      <Path d="M 50 52 Q 55 53.5 53 57" stroke={color} strokeWidth="1" fill="none" />
    </G>
  );
}

function StarGlasses({ color }: { color: string }): ReactElement {
  return (
    <G>
      {/* Left star lens — larger 5-point star over left eye */}
      <Path d="M 39 42 L 40.5 37 L 45 35 L 40.5 33 L 39 28 L 37.5 33 L 33 35 L 37.5 37 Z"
        fill={lighten(color, 0.3)} fillOpacity={0.2} stroke={color} strokeWidth="1.2" />
      {/* Right star lens */}
      <Path d="M 61 42 L 62.5 37 L 67 35 L 62.5 33 L 61 28 L 59.5 33 L 55 35 L 59.5 37 Z"
        fill={lighten(color, 0.3)} fillOpacity={0.2} stroke={color} strokeWidth="1.2" />
      {/* Lens sparkle */}
      <Circle cx="38" cy="33" r="0.8" fill="#FFFFFF" opacity={0.4} />
      <Circle cx="60" cy="33" r="0.8" fill="#FFFFFF" opacity={0.4} />
      {/* Bridge */}
      <Path d="M 45 35 Q 50 33 55 35" stroke={color} strokeWidth="1.2" fill="none" />
      {/* Arms — curve toward ears */}
      <Path d="M 33 34 Q 28 28 23 22" stroke={color} strokeWidth="1" fill="none" />
      <Path d="M 67 34 Q 72 28 77 22" stroke={color} strokeWidth="1" fill="none" />
    </G>
  );
}

function HeartGlasses({ color }: { color: string }): ReactElement {
  return (
    <G>
      {/* Left heart — drawn directly at proper scale */}
      <Path d="M 39 36 C 39 32 33 30 33 35 C 33 39 39 43 39 43 C 39 43 45 39 45 35 C 45 30 39 32 39 36"
        fill={lighten(color, 0.3)} fillOpacity={0.2} stroke={color} strokeWidth="1.2" />
      {/* Right heart */}
      <Path d="M 61 36 C 61 32 55 30 55 35 C 55 39 61 43 61 43 C 61 43 67 39 67 35 C 67 30 61 32 61 36"
        fill={lighten(color, 0.3)} fillOpacity={0.2} stroke={color} strokeWidth="1.2" />
      {/* Lens sparkle */}
      <Circle cx="36" cy="33" r="0.8" fill="#FFFFFF" opacity={0.4} />
      <Circle cx="58" cy="33" r="0.8" fill="#FFFFFF" opacity={0.4} />
      {/* Bridge */}
      <Path d="M 45 35 Q 50 33 55 35" stroke={color} strokeWidth="1.2" fill="none" />
      {/* Arms — curve toward ears */}
      <Path d="M 33 34 Q 27 28 22 22" stroke={color} strokeWidth="1" fill="none" />
      <Path d="M 67 34 Q 73 28 78 22" stroke={color} strokeWidth="1" fill="none" />
    </G>
  );
}

function AngelWings(): ReactElement {
  return (
    <G>
      {/* Left wing — multi-layered feathers */}
      <Path d="M 28 50 Q 12 38 4 46 Q -2 54 4 64 Q 10 72 20 68 Q 26 60 28 50"
        fill="#FFFFFF" opacity={0.85} />
      {/* Left wing feather layers */}
      <Path d="M 26 52 Q 14 42 8 50 Q 4 58 10 66 Q 16 62 22 56"
        fill="#F0F0FF" opacity={0.6} />
      <Path d="M 24 54 Q 16 48 12 54 Q 10 60 14 64"
        fill="#E8E8FF" opacity={0.4} />
      {/* Left feather lines */}
      <Path d="M 8 50 Q 14 48 20 52" stroke="#E0E0F0" strokeWidth="0.4" fill="none" />
      <Path d="M 6 56 Q 12 54 18 58" stroke="#E0E0F0" strokeWidth="0.4" fill="none" />
      <Path d="M 8 62 Q 14 60 20 62" stroke="#E0E0F0" strokeWidth="0.4" fill="none" />

      {/* Right wing — mirror */}
      <Path d="M 72 50 Q 88 38 96 46 Q 102 54 96 64 Q 90 72 80 68 Q 74 60 72 50"
        fill="#FFFFFF" opacity={0.85} />
      <Path d="M 74 52 Q 86 42 92 50 Q 96 58 90 66 Q 84 62 78 56"
        fill="#F0F0FF" opacity={0.6} />
      <Path d="M 76 54 Q 84 48 88 54 Q 90 60 86 64"
        fill="#E8E8FF" opacity={0.4} />
      {/* Right feather lines */}
      <Path d="M 92 50 Q 86 48 80 52" stroke="#E0E0F0" strokeWidth="0.4" fill="none" />
      <Path d="M 94 56 Q 88 54 82 58" stroke="#E0E0F0" strokeWidth="0.4" fill="none" />
      <Path d="M 92 62 Q 86 60 80 62" stroke="#E0E0F0" strokeWidth="0.4" fill="none" />

      {/* Glow at wing base */}
      <Circle cx="28" cy="52" r="3" fill="#FFFFFF" opacity={0.3} />
      <Circle cx="72" cy="52" r="3" fill="#FFFFFF" opacity={0.3} />
    </G>
  );
}

function ButterflyWings({ color }: { color: string }): ReactElement {
  return (
    <G opacity={0.75}>
      {/* Left upper wing */}
      <Path d="M 28 50 Q 8 36 6 50 Q 4 60 18 60 Q 24 56 28 50"
        fill={lighten(color, 0.3)} stroke={darken(color, 0.3)} strokeWidth="0.5" />
      {/* Left lower wing */}
      <Path d="M 26 56 Q 6 62 10 74 Q 14 79 26 69 Q 28 64 26 56"
        fill={color} stroke={darken(color, 0.3)} strokeWidth="0.4" />
      {/* Right upper wing */}
      <Path d="M 72 50 Q 92 36 94 50 Q 96 60 82 60 Q 76 56 72 50"
        fill={lighten(color, 0.3)} stroke={darken(color, 0.3)} strokeWidth="0.5" />
      {/* Right lower wing */}
      <Path d="M 74 56 Q 94 62 90 74 Q 86 79 74 69 Q 72 64 74 56"
        fill={color} stroke={darken(color, 0.3)} strokeWidth="0.4" />
      {/* Wing vein lines */}
      <Path d="M 28 50 Q 16 46 10 52" stroke={darken(color, 0.3)} strokeWidth="0.4" fill="none" opacity={0.5} />
      <Path d="M 28 50 Q 18 54 12 58" stroke={darken(color, 0.3)} strokeWidth="0.3" fill="none" opacity={0.4} />
      <Path d="M 72 50 Q 84 46 90 52" stroke={darken(color, 0.3)} strokeWidth="0.4" fill="none" opacity={0.5} />
      <Path d="M 72 50 Q 82 54 88 58" stroke={darken(color, 0.3)} strokeWidth="0.3" fill="none" opacity={0.4} />
      {/* Eye spots */}
      <Circle cx="14" cy="50" r="3" fill={darken(color, 0.3)} opacity={0.4} />
      <Circle cx="14" cy="50" r="1.5" fill="#FFFFFF" opacity={0.5} />
      <Circle cx="86" cy="50" r="3" fill={darken(color, 0.3)} opacity={0.4} />
      <Circle cx="86" cy="50" r="1.5" fill="#FFFFFF" opacity={0.5} />
      {/* Lower wing spots */}
      <Circle cx="14" cy="68" r="2" fill={darken(color, 0.3)} opacity={0.3} />
      <Circle cx="14" cy="68" r="1" fill="#FFFFFF" opacity={0.4} />
      <Circle cx="86" cy="68" r="2" fill={darken(color, 0.3)} opacity={0.3} />
      <Circle cx="86" cy="68" r="1" fill="#FFFFFF" opacity={0.4} />
    </G>
  );
}

function GuitarCase({ color }: { color: string }): ReactElement {
  const gid = uid('guitar');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.2)} />
          <Stop offset="50%" stopColor={color} />
          <Stop offset="100%" stopColor={darken(color, 0.6)} />
        </LinearGradient>
      </Defs>
      {/* Case body — larger guitar silhouette */}
      <Path d="M 72 46 Q 66 40 68 30 Q 72 22 78 22 Q 84 22 86 30 Q 88 40 82 46 Q 88 54 86 64 Q 82 72 76 72 Q 70 72 66 64 Q 64 54 72 46"
        fill={`url(#${gid})`} stroke={darken(color, 0.3)} strokeWidth="0.8" />
      {/* Case edge highlight */}
      <Path d="M 72 46 Q 68 40 70 32 Q 74 26 78 26"
        stroke={lighten(color, 0.2)} strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Center seam line */}
      <Line x1="77" y1="26" x2="77" y2="70" stroke={darken(color, 0.3)} strokeWidth="0.4" opacity={0.3} />
      {/* Handle — with hardware */}
      <Rect x="74" y="24" width="6" height="3.5" rx="1.5" fill={darken(color, 0.5)} stroke={darken(color, 0.6)} strokeWidth="0.4" />
      <Rect x="75" y="24.5" width="4" height="1.5" rx="0.5" fill={lighten(color, 0.1)} opacity={0.3} />
      {/* Latches — chrome with detail */}
      <Rect x="74" y="40" width="3" height="2.5" rx="0.8" fill="#D0D0D0" stroke="#A0A0A0" strokeWidth="0.4" />
      <Circle cx="75.5" cy="41.2" r="0.5" fill="#E8E8E8" />
      <Rect x="74" y="54" width="3" height="2.5" rx="0.8" fill="#D0D0D0" stroke="#A0A0A0" strokeWidth="0.4" />
      <Circle cx="75.5" cy="55.2" r="0.5" fill="#E8E8E8" />
      {/* Brand badge */}
      <Ellipse cx="77" cy="48" rx="3" ry="2" fill={darken(color, 0.4)} stroke={darken(color, 0.5)} strokeWidth="0.3" />
      <Circle cx="76.5" cy="47.5" r="0.4" fill={lighten(color, 0.3)} opacity={0.5} />
      {/* Strap peeking out */}
      <Path d="M 68 36 Q 64 38 62 42" stroke={darken(color, 0.4)} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </G>
  );
}

function MusicTrail({ color }: { color: string }): ReactElement {
  return (
    <G>
      {/* Big note — eighth note with flag */}
      <Ellipse cx="14" cy="48" rx="3.5" ry="2.5" fill={color} opacity={0.7} />
      <Line x1="17.5" y1="48" x2="17.5" y2="36" stroke={color} strokeWidth="1.2" opacity={0.7} />
      <Path d="M 17.5 36 Q 22 38 20 42" stroke={color} strokeWidth="1" fill="none" opacity={0.6} />

      {/* Medium note */}
      <Ellipse cx="8" cy="62" rx="3" ry="2" fill={color} opacity={0.5} />
      <Line x1="11" y1="62" x2="11" y2="52" stroke={color} strokeWidth="1" opacity={0.5} />
      <Path d="M 11 52 Q 14 53 13 56" stroke={color} strokeWidth="0.8" fill="none" opacity={0.4} />

      {/* Small note — fading */}
      <Ellipse cx="18" cy="74" rx="2.5" ry="1.8" fill={color} opacity={0.35} />
      <Line x1="20.5" y1="74" x2="20.5" y2="66" stroke={color} strokeWidth="0.8" opacity={0.35} />

      {/* Wavy trail — bolder */}
      <Path d="M 20 42 Q 14 48 10 46 Q 6 44 4 52 Q 2 60 6 66 Q 10 72 14 76"
        stroke={color} strokeWidth="0.8" fill="none" opacity={0.3} strokeLinecap="round" />

      {/* Sparkle dots */}
      <Circle cx="6" cy="44" r="0.8" fill={color} opacity={0.4} />
      <Circle cx="22" cy="56" r="0.6" fill={color} opacity={0.3} />
      <Circle cx="4" cy="70" r="0.5" fill={color} opacity={0.25} />
    </G>
  );
}

function StarryCloak({ color }: { color: string }): ReactElement {
  const gid = uid('starcloak');
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={lighten(color, 0.15)} />
          <Stop offset="100%" stopColor={darken(color, 0.7)} />
        </LinearGradient>
      </Defs>
      {/* Cloak — drapes from shoulders, billows around round body */}
      <Path d="M 32 48 Q 18 56 16 70 Q 18 84 50 82 Q 82 84 84 70 Q 82 56 68 48"
        fill={`url(#${gid})`} stroke={darken(color, 0.5)} strokeWidth="0.4" />
      {/* Inner lining — darker */}
      <Path d="M 36 52 Q 22 60 20 72 Q 22 82 50 80 Q 78 82 80 72 Q 78 60 64 52"
        fill={darken(color, 0.6)} opacity={0.3} />
      {/* Fabric folds */}
      <Path d="M 28 58 Q 32 68 26 78" stroke={darken(color, 0.5)} strokeWidth="0.5" fill="none" opacity={0.4} />
      <Path d="M 72 58 Q 68 68 74 78" stroke={darken(color, 0.5)} strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Stars — glowing scattered */}
      {[
        { x: 24, y: 66, r: 1.5 }, { x: 40, y: 74, r: 1.2 }, { x: 60, y: 72, r: 1.5 },
        { x: 76, y: 66, r: 1.2 }, { x: 50, y: 64, r: 1.8 }, { x: 32, y: 74, r: 1 },
        { x: 68, y: 76, r: 1 },
      ].map((s, i) => (
        <G key={i}>
          <Circle cx={s.x} cy={s.y} r={s.r * 1.5} fill="#FFD700" opacity={0.15} />
          <Circle cx={s.x} cy={s.y} r={s.r} fill="#FFD700" opacity={0.7} />
          <Circle cx={s.x} cy={s.y} r={s.r * 0.35} fill="#FFFFFF" opacity={0.9} />
        </G>
      ))}
      {/* Clasp at collar */}
      <Path d="M 34 49 Q 50 45 66 49" stroke={lighten(color, 0.2)} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </G>
  );
}

function Choker({ color }: { color: string }): ReactElement {
  const gid = uid('choker');
  return (
    <G>
      <Defs>
        <RadialGradient id={gid} cx="50%" cy="35%" r="55%">
          <Stop offset="0%" stopColor={lighten(color, 0.5)} />
          <Stop offset="100%" stopColor={color} />
        </RadialGradient>
      </Defs>
      {/* Choker band — thick velvet */}
      <Path d="M 34 51 Q 50 47 66 51" stroke={color} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Path d="M 36 50 Q 50 46 64 50" stroke={lighten(color, 0.3)} strokeWidth="0.5" fill="none" opacity={0.4} />
      {/* Stud details on band */}
      <Circle cx="40" cy="50" r="0.6" fill={lighten(color, 0.4)} opacity={0.5} />
      <Circle cx="60" cy="50" r="0.6" fill={lighten(color, 0.4)} opacity={0.5} />
      {/* Center charm — prominent gem/cameo */}
      <Circle cx="50" cy="54" r="3.5" fill={`url(#${gid})`} stroke={darken(color, 0.4)} strokeWidth="0.6" />
      <Circle cx="50" cy="54" r="2.2" fill={lighten(color, 0.3)} stroke={darken(color, 0.3)} strokeWidth="0.4" />
      <Circle cx="49.2" cy="53.2" r="0.7" fill="#FFFFFF" opacity={0.5} />
    </G>
  );
}

// ─────────────────────────────────────────────────
// Render named accessories
// ─────────────────────────────────────────────────

export function renderAccessory(name: string, accent: string): ReactElement | null {
  switch (name) {
    // Bow ties & ribbons
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
    case 'star-glasses':
      return <StarGlasses key={name} color={accent} />;
    case 'heart-glasses':
      return <HeartGlasses key={name} color={accent} />;

    // Crowns & tiaras
    case 'crown':
      return <Crown key={name} accent={accent} />;
    case 'tiny-crown':
    case 'pixel-crown':
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
    case 'top-hat':
      return <TopHat key={name} />;
    case 'santa-hat':
      return <SantaHat key={name} />;
    case 'wizard-hat':
      return <WizardHat key={name} color={accent} />;
    case 'pirate-hat':
      return <PirateHat key={name} />;
    case 'night-cap':
      return <NightCap key={name} color={accent} />;

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
    case 'bandana':
      return <Bandana key={name} color={accent} />;
    case 'gold-medal':
      return <GoldMedal key={name} />;
    case 'music-note-pendant':
      return <MusicNotePendant key={name} color={accent} />;
    case 'choker':
      return <Choker key={name} color={accent} />;

    // Outfits
    case 'hawaiian-shirt':
      return <HawaiianShirt key={name} color={accent} />;
    case 'hoodie':
      return <Hoodie key={name} color={accent} />;
    case 'sports-jersey':
      return <SportsJersey key={name} color={accent} />;
    case 'superhero-suit':
      return <SuperheroSuit key={name} color={accent} />;

    // Capes & coats
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
    case 'angel-wings':
      return <AngelWings key={name} />;
    case 'butterfly-wings':
      return <ButterflyWings key={name} color={accent} />;
    case 'guitar-case':
      return <GuitarCase key={name} color={accent} />;
    case 'music-trail':
      return <MusicTrail key={name} color={accent} />;
    case 'starry-cloak':
      return <StarryCloak key={name} color={accent} />;

    // Instruments & wands
    case 'fiddle':
      return <Fiddle key={name} color={accent} />;
    case 'baton':
      return <Baton key={name} color={accent} />;
    case 'cookie-wand':
      return <CookieWand key={name} />;
    case 'sax':
      return <Sax key={name} color={accent} />;

    // Effects
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

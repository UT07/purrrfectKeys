// src/components/Mascot/svg/FigmaCatArt.tsx
// Bespoke Figma-designed SVG art for all 13 cats, with animation group support.

import React from 'react';
import type { ReactElement } from 'react';
import { Path, Circle, Ellipse, G } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import type { useAnimatedStyle } from 'react-native-reanimated';
import type { GProps } from 'react-native-svg';
import { renderAccessories } from './CatAccessories';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedG = Animated.createAnimatedComponent(G) as React.ComponentType<
  GProps & { style?: any; children?: React.ReactNode }
>;

interface MicroAnimatedStyles {
  tailStyle: ReturnType<typeof useAnimatedStyle>;
  bodyStyle: ReturnType<typeof useAnimatedStyle>;
  earStyle: ReturnType<typeof useAnimatedStyle>;
  eyeStyle: ReturnType<typeof useAnimatedStyle>;
  faceStyle: ReturnType<typeof useAnimatedStyle> | null;
}

interface CatGroups {
  tail: ReactElement;
  body: ReactElement;
  head: ReactElement;
  ears: ReactElement;
  faceNonEyes: ReactElement;
  eyes: ReactElement;
  extras?: ReactElement;
}

// ============================================================
// MINI-MEOWWW
// ============================================================
function miniMeowwwGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 67 72 C 75 68, 83 60, 85 52 C 87 46, 83 42, 80 43 C 77 44, 78 49, 81 52" fill="none" stroke="#1A1A2E" strokeWidth="5.5" strokeLinecap="round" />
        <Circle cx="80" cy="44" r="4.5" fill="#1A1A2E" />
        <Circle cx="79" cy="43" r="2.2" fill="#252540" />
        <Path d="M 68 71 C 73 68, 79 62, 82 54" fill="none" stroke="#0D0D17" strokeWidth="2.5" opacity="0.3" strokeLinecap="round" />
      </G>
    ),
    body: (
      <G>
        <Path d="M 37 58 C 37 52, 41 48, 50 48 C 59 48, 63 52, 63 58 C 63 68, 61 78, 57 84 C 54 86, 46 86, 43 84 C 39 78, 37 68, 37 58 Z" fill="#1A1A2E" />
        <Path d="M 38 56 C 38 62, 39 68, 40 74" fill="none" stroke="#0D0D17" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
        {/* Tuxedo white chest bib */}
        <Path d="M 44 54 C 46 52, 54 52, 56 54 C 57 58, 56 66, 54 74 C 53 78, 51 82, 50 83 C 49 82, 47 78, 46 74 C 44 66, 43 58, 44 54 Z" fill="#F0F0F5" />
        {/* Stubby paws */}
        <Ellipse cx="40" cy="84" rx="5" ry="3.5" fill="#1A1A2E" />
        <Ellipse cx="40" cy="85.5" rx="3" ry="1.5" fill="#F0F0F5" />
        <Ellipse cx="60" cy="84" rx="5" ry="3.5" fill="#1A1A2E" />
        <Ellipse cx="60" cy="85.5" rx="3" ry="1.5" fill="#F0F0F5" />
      </G>
    ),
    head: (
      <G>
        <Circle cx="50" cy="36" r="24" fill="#1A1A2E" />
        <Path d="M 28 32 C 27 36, 27 42, 29 46" fill="none" stroke="#0D0D17" strokeWidth="2.5" opacity="0.4" strokeLinecap="round" />
        {/* Small muzzle area */}
        <Ellipse cx="50" cy="46" rx="10" ry="8" fill="#F0F0F5" />
        {/* Curly hair tuft */}
        <Path d="M 46 14 C 44 8, 48 4, 52 6 C 56 8, 54 12, 50 13" fill="#1A1A2E" />
        <Path d="M 50 12 C 52 8, 56 6, 58 10" fill="#1A1A2E" stroke="#1A1A2E" strokeWidth="1.5" />
        <Path d="M 44 16 C 42 12, 44 9, 47 10" fill="none" stroke="#1A1A2E" strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M 49 9 C 51 7, 53 7, 54 9" fill="none" stroke="#252540" strokeWidth="1" strokeLinecap="round" />
      </G>
    ),
    ears: (
      <G>
        {/* Left ear */}
        <Path d="M 32 28 L 16 2 L 42 20 Z" fill="#1A1A2E" />
        <Path d="M 32 24 L 21 6 L 39 20 Z" fill="#FF6B8A" />
        <Path d="M 32 22 L 25 10 L 37 20 Z" fill="#FF8FAB" opacity="0.5" />
        <Path d="M 30 22 L 22 8 L 28 18 Z" fill="#E8456A" opacity="0.35" />
        {/* Right ear */}
        <Path d="M 68 28 L 84 2 L 58 20 Z" fill="#1A1A2E" />
        <Path d="M 68 24 L 79 6 L 61 20 Z" fill="#FF6B8A" />
        <Path d="M 68 22 L 75 10 L 63 20 Z" fill="#FF8FAB" opacity="0.5" />
        <Path d="M 70 22 L 78 8 L 72 18 Z" fill="#E8456A" opacity="0.35" />
        {/* Ear tufts */}
        <Path d="M 38 20 C 36 18, 37 16, 39 17" fill="#1A1A2E" />
        <Path d="M 62 20 C 64 18, 63 16, 61 17" fill="#1A1A2E" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE */}
        <G>
          <Ellipse cx="40" cy="36" rx="7.5" ry="9" fill="#FFFFFF" />
          <Ellipse cx="41" cy="36.5" rx="6" ry="7.5" fill="#3DFF88" />
          <Ellipse cx="41" cy="37.5" rx="4" ry="5" fill="#2BD870" />
          <Ellipse cx="41" cy="37" rx="2" ry="4.5" fill="#0A0A15" />
          <Ellipse cx="41" cy="37" rx="0.8" ry="2.5" fill="#000000" />
          {/* Star highlight */}
          <G>
            <Path d="M 38 33 L 38.8 34.5 L 40.5 34.8 L 39.2 36 L 39.5 37.5 L 38 36.5 L 36.5 37.5 L 36.8 36 L 35.5 34.8 L 37.2 34.5 Z" fill="#FFFFFF" />
          </G>
          <Circle cx="43" cy="34" r="1.6" fill="#FFFFFF" opacity="0.9" />
          <Circle cx="39" cy="40" r="0.9" fill="#FFFFFF" opacity="0.5" />
          {/* Upper lid */}
          <Path d="M 32.5 32 C 35 28, 46 28, 48 32" fill="none" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" />
          <Path d="M 32.5 32 L 30 28.5" stroke="#1A1A2E" strokeWidth="1.1" strokeLinecap="round" />
          <Path d="M 34.5 30 L 33.5 27" stroke="#1A1A2E" strokeWidth="0.8" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE */}
        <G>
          <Ellipse cx="60" cy="36" rx="7.5" ry="9" fill="#FFFFFF" />
          <Ellipse cx="59" cy="36.5" rx="6" ry="7.5" fill="#3DFF88" />
          <Ellipse cx="59" cy="37.5" rx="4" ry="5" fill="#2BD870" />
          <Ellipse cx="59" cy="37" rx="2" ry="4.5" fill="#0A0A15" />
          <Ellipse cx="59" cy="37" rx="0.8" ry="2.5" fill="#000000" />
          <G>
            <Path d="M 56 33 L 56.8 34.5 L 58.5 34.8 L 57.2 36 L 57.5 37.5 L 56 36.5 L 54.5 37.5 L 54.8 36 L 53.5 34.8 L 55.2 34.5 Z" fill="#FFFFFF" />
          </G>
          <Circle cx="61.5" cy="34" r="1.6" fill="#FFFFFF" opacity="0.9" />
          <Circle cx="57.5" cy="40" r="0.9" fill="#FFFFFF" opacity="0.5" />
          <Path d="M 52 32 C 54 28, 65 28, 67.5 32" fill="none" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" />
          <Path d="M 67.5 32 L 70 28.5" stroke="#1A1A2E" strokeWidth="1.1" strokeLinecap="round" />
          <Path d="M 65.5 30 L 66.5 27" stroke="#1A1A2E" strokeWidth="0.8" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        {/* Whisker pad bumps */}
        <Ellipse cx="44" cy="46" rx="4" ry="3.5" fill="#F0F0F5" />
        <Ellipse cx="56" cy="46" rx="4" ry="3.5" fill="#F0F0F5" />
        {/* Tiny nose */}
        <Path d="M 50 44 L 48.5 46.5 L 51.5 46.5 Z" fill="#FF6B8A" />
        <Ellipse cx="50" cy="45" rx="0.8" ry="0.5" fill="#FF8FAB" opacity="0.6" />
        {/* Omega mouth */}
        <Path d="M 47 47 Q 47 49, 49 48.5 Q 50 49.5, 51 48.5 Q 53 49, 53 47" fill="none" stroke="#1A1A2E" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
        {/* Tiny fang */}
        <Path d="M 48 47.5 L 47.8 49 L 48.5 48" fill="#FFFFFF" stroke="#E0E0E8" strokeWidth="0.2" />
        {/* Whisker dots */}
        <Circle cx="40" cy="46" r="0.7" fill="#E0E0F0" opacity="0.6" />
        <Circle cx="40" cy="48" r="0.7" fill="#E0E0F0" opacity="0.6" />
        <Circle cx="40" cy="50" r="0.7" fill="#E0E0F0" opacity="0.6" />
        <Circle cx="60" cy="46" r="0.7" fill="#E0E0F0" opacity="0.6" />
        <Circle cx="60" cy="48" r="0.7" fill="#E0E0F0" opacity="0.6" />
        <Circle cx="60" cy="50" r="0.7" fill="#E0E0F0" opacity="0.6" />
        {/* Whiskers */}
        <Path d="M 40 46 Q 28 43, 18 42" stroke="#E0E0F0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 40 48 Q 28 48, 18 48" stroke="#E0E0F0" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        <Path d="M 40 50 Q 28 52, 18 54" stroke="#E0E0F0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 60 46 Q 72 43, 82 42" stroke="#E0E0F0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 60 48 Q 72 48, 82 48" stroke="#E0E0F0" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        <Path d="M 60 50 Q 72 52, 82 54" stroke="#E0E0F0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        {/* Blush */}
        <Ellipse cx="34" cy="44" rx="4.5" ry="3" fill="#FF6B8A" opacity="0.25" />
        <Ellipse cx="66" cy="44" rx="4.5" ry="3" fill="#FF6B8A" opacity="0.25" />
        {/* Floating sparkles */}
        <G opacity="0.5">
          <Path d="M 76 18 L 76.5 19.5 L 78 20 L 76.5 20.5 L 76 22 L 75.5 20.5 L 74 20 L 75.5 19.5 Z" fill="#3DFF88" />
          <Circle cx="22" cy="22" r="0.6" fill="#FFFFFF" opacity="0.6" />
        </G>
      </G>
    ),
  };
}

// ============================================================
// JAZZY
// ============================================================
function jazzyGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 64 72 C 72 66, 80 56, 82 46 C 84 38, 84 32, 86 28" fill="none" stroke="#6B7B9E" strokeWidth="5" strokeLinecap="round" />
        <Path d="M 86 28 C 87 26, 87 24, 86 23" fill="none" stroke="#6B7B9E" strokeWidth="4" strokeLinecap="round" />
        <Path d="M 65 71 C 71 66, 78 56, 80 46" fill="none" stroke="#4A5A78" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
      </G>
    ),
    body: (
      <G>
        <Path d="M 38 58 C 38 52, 42 48, 50 48 C 58 48, 62 52, 62 58 C 62 68, 60 78, 56 84 C 54 86, 46 86, 44 84 C 40 78, 38 68, 38 58 Z" fill="#6B7B9E" />
        <Path d="M 39 56 C 39 62, 40 68, 41 74" fill="none" stroke="#4A5A78" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        {/* Lighter belly */}
        <Path d="M 44 54 C 46 52, 54 52, 56 54 C 57 58, 56 66, 54 74 C 53 78, 51 82, 50 83 C 49 82, 47 78, 46 74 C 44 66, 43 58, 44 54 Z" fill="#A8B8D0" />
        {/* Stubby paws */}
        <Ellipse cx="42" cy="84" rx="5" ry="3.2" fill="#6B7B9E" />
        <Ellipse cx="42" cy="85.5" rx="3" ry="1.3" fill="#A8B8D0" />
        <Ellipse cx="58" cy="84" rx="5" ry="3.2" fill="#6B7B9E" />
        <Ellipse cx="58" cy="85.5" rx="3" ry="1.3" fill="#A8B8D0" />
      </G>
    ),
    head: (
      <G>
        <Circle cx="50" cy="36" r="24" fill="#6B7B9E" />
        <Path d="M 28 32 C 27 36, 27 42, 29 46" fill="none" stroke="#4A5A78" strokeWidth="2.5" opacity="0.35" strokeLinecap="round" />
        <Ellipse cx="50" cy="46" rx="10" ry="7.5" fill="#A8B8D0" />
        {/* Slicked-back pompadour */}
        <Path d="M 42 14 C 40 6, 44 1, 50 3 C 56 5, 60 0, 62 5 C 64 10, 60 14, 56 13 C 52 12, 48 10, 42 14 Z" fill="#6B7B9E" />
        <Path d="M 58 5 C 62 2, 66 4, 64 10" fill="#6B7B9E" stroke="#6B7B9E" strokeWidth="1.5" />
        <Path d="M 46 7 C 50 4, 56 4, 58 7" fill="none" stroke="#7D8DB0" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
        <Path d="M 44 12 C 42 7, 46 4, 50 5" fill="none" stroke="#4A5A78" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      </G>
    ),
    ears: (
      <G>
        <Path d="M 32 28 L 16 2 L 42 20 Z" fill="#6B7B9E" />
        <Path d="M 32 24 L 21 6 L 39 20 Z" fill="#9B59FF" />
        <Path d="M 31 22 L 25 10 L 37 20 Z" fill="#8A4AE8" opacity="0.45" />
        <Path d="M 68 28 L 84 2 L 58 20 Z" fill="#6B7B9E" />
        <Path d="M 68 24 L 79 6 L 61 20 Z" fill="#9B59FF" />
        <Path d="M 69 22 L 75 10 L 63 20 Z" fill="#8A4AE8" opacity="0.45" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE */}
        <G>
          <Ellipse cx="41" cy="36" rx="7" ry="5.5" fill="#FFFFFF" />
          <Ellipse cx="42" cy="36.5" rx="5.5" ry="4.5" fill="#B06EFF" />
          <Ellipse cx="42" cy="37" rx="3.5" ry="3" fill="#9050DD" />
          <Ellipse cx="42" cy="37" rx="1.3" ry="3" fill="#1A1A2E" />
          <Ellipse cx="42" cy="37" rx="0.5" ry="1.8" fill="#000000" />
          <Circle cx="40" cy="35" r="1.3" fill="#FFFFFF" opacity="0.85" />
          <Circle cx="43.5" cy="37.5" r="0.6" fill="#FFFFFF" opacity="0.4" />
          {/* Heavy half-lid */}
          <Path d="M 34 34 C 37 30, 47 30, 48 34" fill="none" stroke="#4A5A78" strokeWidth="3" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE */}
        <G>
          <Ellipse cx="59" cy="36" rx="7" ry="5.5" fill="#FFFFFF" />
          <Ellipse cx="58" cy="36.5" rx="5.5" ry="4.5" fill="#B06EFF" />
          <Ellipse cx="58" cy="37" rx="3.5" ry="3" fill="#9050DD" />
          <Ellipse cx="58" cy="37" rx="1.3" ry="3" fill="#1A1A2E" />
          <Ellipse cx="58" cy="37" rx="0.5" ry="1.8" fill="#000000" />
          <Circle cx="56.5" cy="35" r="1.3" fill="#FFFFFF" opacity="0.85" />
          <Circle cx="59.5" cy="37.5" r="0.6" fill="#FFFFFF" opacity="0.4" />
          <Path d="M 52 33 C 55 29, 65 30, 66 34" fill="none" stroke="#4A5A78" strokeWidth="3" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        {/* Raised eyebrow */}
        <Path d="M 54 28 C 57 25, 64 26, 66 29" fill="none" stroke="#4A5A78" strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />
        {/* Whisker pads */}
        <Ellipse cx="44" cy="46" rx="4" ry="3.5" fill="#A8B8D0" />
        <Ellipse cx="56" cy="46" rx="4" ry="3.5" fill="#A8B8D0" />
        {/* Nose */}
        <Path d="M 50 44 L 48.5 46.5 L 51.5 46.5 Z" fill="#7D6090" />
        {/* Smirk + fang */}
        <Path d="M 47 47.5 Q 50 49.5, 55 47.5" fill="none" stroke="#4A5A78" strokeWidth="0.9" strokeLinecap="round" />
        <Path d="M 54 47.5 L 53.8 49.5 L 54.8 48.2" fill="#FFFFFF" stroke="#D0D0D8" strokeWidth="0.2" />
        {/* Whisker dots */}
        <Circle cx="40" cy="46" r="0.7" fill="#D0D8E8" opacity="0.6" />
        <Circle cx="40" cy="48" r="0.7" fill="#D0D8E8" opacity="0.6" />
        <Circle cx="60" cy="46" r="0.7" fill="#D0D8E8" opacity="0.6" />
        <Circle cx="60" cy="48" r="0.7" fill="#D0D8E8" opacity="0.6" />
        {/* Whiskers */}
        <Path d="M 40 46 Q 28 46, 18 48" stroke="#D0D8E8" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 40 48 Q 28 49, 18 52" stroke="#D0D8E8" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        <Path d="M 60 46 Q 72 46, 82 48" stroke="#D0D8E8" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 60 48 Q 72 49, 82 52" stroke="#D0D8E8" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
      </G>
    ),
  };
}

// ============================================================
// LUNA
// ============================================================
function lunaGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 66 70 C 74 62, 82 52, 84 42 C 86 34, 82 28, 78 26 C 74 24, 72 28, 74 34" fill="none" stroke="#8A95A8" strokeWidth="10" strokeLinecap="round" />
        <Ellipse cx="78" cy="28" rx="7" ry="6" fill="#8A95A8" />
        <Ellipse cx="80" cy="36" rx="5.5" ry="4.5" fill="#8A95A8" />
        <Ellipse cx="78" cy="27" rx="4" ry="3" fill="#9EAAB8" opacity="0.4" />
        <Path d="M 68 68 C 74 60, 80 50, 82 40" fill="none" stroke="#6A7588" strokeWidth="3.5" opacity="0.25" strokeLinecap="round" />
      </G>
    ),
    body: (
      <G>
        <Path d="M 37 58 C 37 52, 41 48, 50 48 C 59 48, 63 52, 63 58 C 63 68, 61 78, 57 84 C 54 86, 46 86, 44 84 C 39 78, 37 68, 37 58 Z" fill="#8A95A8" />
        <Path d="M 38 56 C 38 62, 39 68, 40 74" fill="none" stroke="#6A7588" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        <Path d="M 44 54 C 46 52, 54 52, 56 54 C 57 58, 56 66, 54 74 C 53 78, 51 82, 50 83 C 49 82, 47 78, 46 74 C 44 66, 43 58, 44 54 Z" fill="#C8D0DC" />
        {/* Paws — darker extremities (siamese) */}
        <Ellipse cx="42" cy="84" rx="5" ry="3.2" fill="#6A7588" />
        <Ellipse cx="42" cy="85.5" rx="3" ry="1.2" fill="#C8D0DC" />
        <Ellipse cx="58" cy="84" rx="5" ry="3.2" fill="#6A7588" />
        <Ellipse cx="58" cy="85.5" rx="3" ry="1.2" fill="#C8D0DC" />
      </G>
    ),
    head: (
      <G>
        <Ellipse cx="50" cy="36" rx="24" ry="23" fill="#8A95A8" transform="rotate(-3, 50, 36)" />
        <Path d="M 28 32 C 27 36, 27 42, 29 46" fill="none" stroke="#6A7588" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
        <Ellipse cx="50" cy="46" rx="10" ry="7.5" fill="#C8D0DC" />
        {/* Darker forehead — siamese shading */}
        <Path d="M 38 18 C 42 16, 58 16, 62 18 C 60 20, 54 22, 50 22 C 46 22, 40 20, 38 18 Z" fill="#6A7588" opacity="0.4" />
      </G>
    ),
    ears: (
      <G>
        <Path d="M 32 28 L 16 2 L 42 20 Z" fill="#8A95A8" />
        <Path d="M 32 24 L 21 6 L 39 20 Z" fill="#5BA8FF" />
        <Path d="M 31 22 L 25 10 L 37 20 Z" fill="#4890DD" opacity="0.45" />
        <Path d="M 68 28 L 84 2 L 58 20 Z" fill="#8A95A8" />
        <Path d="M 68 24 L 79 6 L 61 20 Z" fill="#5BA8FF" />
        <Path d="M 69 22 L 75 10 L 63 20 Z" fill="#4890DD" opacity="0.45" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE */}
        <G>
          <Ellipse cx="41" cy="35" rx="7" ry="6.5" fill="#FFFFFF" />
          <Ellipse cx="41" cy="36" rx="5.5" ry="5.5" fill="#5BA8FF" />
          <Ellipse cx="41" cy="36.5" rx="3.5" ry="3.5" fill="#3888DD" />
          <Ellipse cx="41" cy="36" rx="1.5" ry="3.5" fill="#1A1A2E" />
          <Ellipse cx="41" cy="36" rx="0.6" ry="2" fill="#000000" />
          <Circle cx="39" cy="34" r="1.6" fill="#FFFFFF" opacity="0.9" />
          <Circle cx="43" cy="37" r="0.7" fill="#FFFFFF" opacity="0.4" />
          {/* Heavy dreamy lid */}
          <Path d="M 34 33 C 36 29, 46 29, 48 33" fill="none" stroke="#6A7588" strokeWidth="2.5" strokeLinecap="round" />
          {/* Elegant lashes */}
          <Path d="M 34 33 L 31 29.5" stroke="#6A7588" strokeWidth="1" strokeLinecap="round" />
          <Path d="M 36 31 L 35 28" stroke="#6A7588" strokeWidth="0.7" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE */}
        <G>
          <Ellipse cx="59" cy="35" rx="7" ry="6.5" fill="#FFFFFF" />
          <Ellipse cx="59" cy="36" rx="5.5" ry="5.5" fill="#5BA8FF" />
          <Ellipse cx="59" cy="36.5" rx="3.5" ry="3.5" fill="#3888DD" />
          <Ellipse cx="59" cy="36" rx="1.5" ry="3.5" fill="#1A1A2E" />
          <Ellipse cx="59" cy="36" rx="0.6" ry="2" fill="#000000" />
          <Circle cx="57" cy="34" r="1.6" fill="#FFFFFF" opacity="0.9" />
          <Circle cx="61" cy="37" r="0.7" fill="#FFFFFF" opacity="0.4" />
          <Path d="M 52 33 C 54 29, 64 29, 66 33" fill="none" stroke="#6A7588" strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M 66 33 L 69 29.5" stroke="#6A7588" strokeWidth="1" strokeLinecap="round" />
          <Path d="M 64 31 L 65 28" stroke="#6A7588" strokeWidth="0.7" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        <Ellipse cx="44" cy="46" rx="4" ry="3.5" fill="#C8D0DC" />
        <Ellipse cx="56" cy="46" rx="4" ry="3.5" fill="#C8D0DC" />
        <Path d="M 50 44 L 48.5 46.5 L 51.5 46.5 Z" fill="#8A7098" />
        {/* Serene smile */}
        <Path d="M 47 48 Q 50 49.5, 53 48" fill="none" stroke="#6A7588" strokeWidth="0.8" strokeLinecap="round" />
        {/* Whisker dots */}
        <Circle cx="40" cy="46" r="0.7" fill="#D0D0E0" opacity="0.6" />
        <Circle cx="40" cy="48" r="0.7" fill="#D0D0E0" opacity="0.6" />
        <Circle cx="60" cy="46" r="0.7" fill="#D0D0E0" opacity="0.6" />
        <Circle cx="60" cy="48" r="0.7" fill="#D0D0E0" opacity="0.6" />
        {/* Whiskers */}
        <Path d="M 40 46 Q 28 44, 18 43" stroke="#D0D0E0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 40 48 Q 28 47, 18 46" stroke="#D0D0E0" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        <Path d="M 60 46 Q 72 44, 82 43" stroke="#D0D0E0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 60 48 Q 72 47, 82 46" stroke="#D0D0E0" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        {/* Moon crescent */}
        <G opacity="0.35">
          <Path d="M 18 14 C 22 12, 22 20, 18 18 C 14 16, 14 12, 18 14 Z" fill="#5BA8FF" />
        </G>
        <Circle cx="14" cy="22" r="0.5" fill="#5BA8FF" opacity="0.4" />
        <Circle cx="84" cy="16" r="0.4" fill="#5BA8FF" opacity="0.3" />
      </G>
    ),
  };
}

// ============================================================
// BISCUIT
// ============================================================
function biscuitGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 68 68 C 76 62, 82 54, 84 46 C 86 40, 82 36, 78 38 C 74 40, 76 46, 80 48" fill="none" stroke="#F5D5B8" strokeWidth="7" strokeLinecap="round" />
        <Ellipse cx="78" cy="38" rx="5" ry="4.5" fill="#F5D5B8" />
        <Ellipse cx="77" cy="37" rx="3" ry="2.5" fill="#FFDFC8" opacity="0.5" />
      </G>
    ),
    body: (
      <G>
        <Ellipse cx="50" cy="70" rx="18" ry="17" fill="#F5D5B8" />
        <Path d="M 34 66 C 34 72, 35 78, 38 82" fill="none" stroke="#E0B898" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        <Ellipse cx="50" cy="72" rx="12" ry="13" fill="#FFF0E0" />
        <Ellipse cx="40" cy="86" rx="5.5" ry="3.5" fill="#F5D5B8" />
        <Ellipse cx="40" cy="87.5" rx="3.5" ry="1.5" fill="#FFF0E0" />
        <Ellipse cx="60" cy="86" rx="5.5" ry="3.5" fill="#F5D5B8" />
        <Ellipse cx="60" cy="87.5" rx="3.5" ry="1.5" fill="#FFF0E0" />
      </G>
    ),
    head: (
      <G>
        <Circle cx="50" cy="36" r="25" fill="#F5D5B8" />
        <Path d="M 27 32 C 26 38, 27 44, 30 48" fill="none" stroke="#E0B898" strokeWidth="2" opacity="0.25" strokeLinecap="round" />
        <Ellipse cx="50" cy="46" rx="11" ry="8" fill="#FFF0E0" />
        {/* Fluffy cheek tufts */}
        <Path d="M 28 40 C 24 38, 22 42, 24 46 C 26 48, 30 47, 31 44" fill="#F5D5B8" />
        <Path d="M 72 40 C 76 38, 78 42, 76 46 C 74 48, 70 47, 69 44" fill="#F5D5B8" />
        {/* Fluffy puffy tuft */}
        <Circle cx="46" cy="13" r="4" fill="#F5D5B8" />
        <Circle cx="50" cy="11" r="4.5" fill="#F5D5B8" />
        <Circle cx="54" cy="13" r="4" fill="#F5D5B8" />
        <Circle cx="48" cy="10" r="3" fill="#F5D5B8" />
        <Circle cx="52" cy="9" r="3" fill="#F5D5B8" />
        <Circle cx="50" cy="10" r="2" fill="#FFDFC8" opacity="0.4" />
      </G>
    ),
    ears: (
      <G>
        <Path d="M 30 24 C 26 14, 20 4, 22 2 C 26 -1, 34 6, 38 16" fill="#F5D5B8" />
        <Path d="M 30 22 C 28 14, 24 6, 25 4 C 28 2, 33 8, 36 16" fill="#E8A88A" />
        <Path d="M 30 20 C 29 14, 27 9, 28 6" fill="none" stroke="#F0C0A0" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
        <Path d="M 70 24 C 74 14, 80 4, 78 2 C 74 -1, 66 6, 62 16" fill="#F5D5B8" />
        <Path d="M 70 22 C 72 14, 76 6, 75 4 C 72 2, 67 8, 64 16" fill="#E8A88A" />
        <Path d="M 70 20 C 71 14, 73 9, 72 6" fill="none" stroke="#F0C0A0" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE */}
        <G>
          <Ellipse cx="40" cy="36" rx="8" ry="8.5" fill="#FFFFFF" />
          <Ellipse cx="40" cy="37" rx="6.5" ry="7" fill="#FF7EB3" />
          <Ellipse cx="40" cy="37.5" rx="4.5" ry="5" fill="#E060A0" />
          <Circle cx="40" cy="37" r="3" fill="#1A1A2E" />
          <Circle cx="40" cy="37" r="1.3" fill="#000000" />
          <Circle cx="38" cy="34.5" r="2" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="42.5" cy="34" r="1" fill="#FFFFFF" opacity="0.75" />
          <Circle cx="39" cy="40" r="0.8" fill="#FFFFFF" opacity="0.4" />
          <Path d="M 32 33 C 35 29, 45 29, 48 33" fill="none" stroke="#E0B898" strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M 32 33 L 30 30" stroke="#D0A088" strokeWidth="0.9" strokeLinecap="round" />
          <Path d="M 34 31 L 33 28.5" stroke="#D0A088" strokeWidth="0.7" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE */}
        <G>
          <Ellipse cx="60" cy="36" rx="8" ry="8.5" fill="#FFFFFF" />
          <Ellipse cx="60" cy="37" rx="6.5" ry="7" fill="#FF7EB3" />
          <Ellipse cx="60" cy="37.5" rx="4.5" ry="5" fill="#E060A0" />
          <Circle cx="60" cy="37" r="3" fill="#1A1A2E" />
          <Circle cx="60" cy="37" r="1.3" fill="#000000" />
          <Circle cx="58" cy="34.5" r="2" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="62.5" cy="34" r="1" fill="#FFFFFF" opacity="0.75" />
          <Circle cx="59" cy="40" r="0.8" fill="#FFFFFF" opacity="0.4" />
          <Path d="M 52 33 C 55 29, 65 29, 68 33" fill="none" stroke="#E0B898" strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M 68 33 L 70 30" stroke="#D0A088" strokeWidth="0.9" strokeLinecap="round" />
          <Path d="M 66 31 L 67 28.5" stroke="#D0A088" strokeWidth="0.7" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        <Ellipse cx="44" cy="46" rx="4.5" ry="3.5" fill="#FFF0E0" />
        <Ellipse cx="56" cy="46" rx="4.5" ry="3.5" fill="#FFF0E0" />
        <Path d="M 50 44 L 48.5 46.5 L 51.5 46.5 Z" fill="#E8A88A" />
        {/* Big happy open smile */}
        <Path d="M 46 47 Q 48 51, 50 51 Q 52 51, 54 47" fill="#FF8FAB" stroke="#E0A090" strokeWidth="0.7" />
        <Ellipse cx="50" cy="50" rx="1.8" ry="1.2" fill="#FF6090" />
        {/* Whisker dots */}
        <Circle cx="40" cy="47" r="0.7" fill="#FFF0E0" opacity="0.6" />
        <Circle cx="40" cy="49" r="0.7" fill="#FFF0E0" opacity="0.6" />
        <Circle cx="60" cy="47" r="0.7" fill="#FFF0E0" opacity="0.6" />
        <Circle cx="60" cy="49" r="0.7" fill="#FFF0E0" opacity="0.6" />
        {/* Whiskers */}
        <Path d="M 40 47 Q 30 45, 22 45" stroke="#FFF0E0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 40 49 Q 30 49, 22 50" stroke="#FFF0E0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 60 47 Q 70 45, 78 45" stroke="#FFF0E0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 60 49 Q 70 49, 78 50" stroke="#FFF0E0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        {/* Blush */}
        <Ellipse cx="30" cy="44" rx="5" ry="3.5" fill="#FFB0C8" opacity="0.3" />
        <Ellipse cx="70" cy="44" rx="5" ry="3.5" fill="#FFB0C8" opacity="0.3" />
      </G>
    ),
  };
}

// ============================================================
// BALLYMAKAWWW
// ============================================================
function ballymakawwwGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 66 70 C 74 62, 80 52, 82 42 C 84 34, 84 28, 82 24" fill="none" stroke="#E8873A" strokeWidth="5.5" strokeLinecap="round" />
        <Circle cx="82" cy="25" r="3.5" fill="#E8873A" />
        <Circle cx="81.5" cy="24" r="1.8" fill="#F0A050" opacity="0.4" />
      </G>
    ),
    body: (
      <G>
        <Ellipse cx="50" cy="70" rx="18" ry="16" fill="#E8873A" />
        <Path d="M 34 66 C 34 72, 35 78, 38 82" fill="none" stroke="#C06A28" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        <Ellipse cx="50" cy="72" rx="12" ry="12" fill="#FFF0D0" />
        <Ellipse cx="41" cy="86" rx="5.5" ry="3.5" fill="#E8873A" />
        <Ellipse cx="41" cy="87.5" rx="3.5" ry="1.5" fill="#FFF0D0" />
        <Ellipse cx="59" cy="86" rx="5.5" ry="3.5" fill="#E8873A" />
        <Ellipse cx="59" cy="87.5" rx="3.5" ry="1.5" fill="#FFF0D0" />
      </G>
    ),
    head: (
      <G>
        <Circle cx="50" cy="36" r="25" fill="#E8873A" />
        <Path d="M 27 32 C 26 38, 27 44, 30 48" fill="none" stroke="#C06A28" strokeWidth="2.5" opacity="0.3" strokeLinecap="round" />
        <Ellipse cx="50" cy="46" rx="11" ry="8" fill="#FFF0D0" />
        {/* Cheek fluff */}
        <Path d="M 28 40 C 24 38, 22 42, 24 46 C 26 48, 30 47, 31 44" fill="#E8873A" />
        <Path d="M 72 40 C 76 38, 78 42, 76 46 C 74 48, 70 47, 69 44" fill="#E8873A" />
        {/* Spiky pub hair tuft */}
        <Path d="M 44 14 L 40 2 L 46 12 Z" fill="#E8873A" />
        <Path d="M 48 12 L 46 0 L 52 10 Z" fill="#E8873A" />
        <Path d="M 52 12 L 54 1 L 56 12 Z" fill="#E8873A" />
        <Path d="M 56 14 L 60 3 L 58 14 Z" fill="#E8873A" />
        <Path d="M 47 5 L 49 2" stroke="#F0A050" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      </G>
    ),
    ears: (
      <G>
        <Path d="M 30 24 C 26 14, 20 4, 22 2 C 26 -1, 34 6, 38 16" fill="#E8873A" />
        <Path d="M 30 22 C 28 14, 24 6, 25 4 C 28 2, 33 8, 36 16" fill="#2ECC71" />
        <Path d="M 70 24 C 74 14, 80 4, 78 2 C 74 -1, 66 6, 62 16" fill="#E8873A" />
        <Path d="M 70 22 C 72 14, 76 6, 75 4 C 72 2, 67 8, 64 16" fill="#2ECC71" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE */}
        <G>
          <Ellipse cx="40" cy="35" rx="7.5" ry="7" fill="#FFFFFF" />
          <Ellipse cx="40" cy="36" rx="6" ry="5.5" fill="#2ECC71" />
          <Ellipse cx="40" cy="36.5" rx="4" ry="3.5" fill="#22A860" />
          <Circle cx="40" cy="36" r="2.5" fill="#1A1A2E" />
          <Circle cx="40" cy="36" r="1" fill="#000000" />
          <Circle cx="38" cy="34" r="1.8" fill="#FFFFFF" opacity="0.9" />
          <Circle cx="42" cy="34.5" r="0.8" fill="#FFFFFF" opacity="0.6" />
          <Path d="M 33 32 C 35 28, 45 28, 47 32" fill="none" stroke="#C06A28" strokeWidth="2" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE — squished from laughing */}
        <G>
          <Ellipse cx="60" cy="35" rx="7.5" ry="5.5" fill="#FFFFFF" />
          <Ellipse cx="60" cy="36" rx="6" ry="4.5" fill="#2ECC71" />
          <Ellipse cx="60" cy="36.5" rx="4" ry="3" fill="#22A860" />
          <Circle cx="60" cy="36" r="2.2" fill="#1A1A2E" />
          <Circle cx="60" cy="36" r="0.9" fill="#000000" />
          <Circle cx="58" cy="34.5" r="1.5" fill="#FFFFFF" opacity="0.9" />
          <Path d="M 53 32 C 55 29, 65 29, 67 32" fill="none" stroke="#C06A28" strokeWidth="2" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        <Ellipse cx="44" cy="46" rx="4.5" ry="3.5" fill="#FFF0D0" />
        <Ellipse cx="56" cy="46" rx="4.5" ry="3.5" fill="#FFF0D0" />
        <Path d="M 50 44 L 48.5 46.5 L 51.5 46.5 Z" fill="#FF8080" />
        {/* Big laughing mouth */}
        <Path d="M 44 47 Q 46 44, 50 44 Q 54 44, 56 47 Q 54 53, 50 53.5 Q 46 53, 44 47 Z" fill="#CC3030" stroke="#A02020" strokeWidth="0.4" />
        <Ellipse cx="50" cy="51.5" rx="3.5" ry="2" fill="#FF5050" />
        <Path d="M 44.5 47 L 43.5 49.5 L 45.5 48" fill="#FFFFFF" stroke="#E0E0E8" strokeWidth="0.15" />
        {/* Whisker dots */}
        <Circle cx="40" cy="47" r="0.8" fill="#FFF0D0" opacity="0.6" />
        <Circle cx="40" cy="49" r="0.8" fill="#FFF0D0" opacity="0.6" />
        <Circle cx="40" cy="51" r="0.8" fill="#FFF0D0" opacity="0.6" />
        <Circle cx="60" cy="47" r="0.8" fill="#FFF0D0" opacity="0.6" />
        <Circle cx="60" cy="49" r="0.8" fill="#FFF0D0" opacity="0.6" />
        <Circle cx="60" cy="51" r="0.8" fill="#FFF0D0" opacity="0.6" />
        {/* Thick bristling whiskers */}
        <Path d="M 40 47 Q 26 43, 14 41" stroke="#FFF0D0" strokeWidth="1.2" opacity="0.65" strokeLinecap="round" />
        <Path d="M 40 49 Q 26 47, 14 46" stroke="#FFF0D0" strokeWidth="1.2" opacity="0.7" strokeLinecap="round" />
        <Path d="M 40 51 Q 26 51, 14 52" stroke="#FFF0D0" strokeWidth="1.2" opacity="0.65" strokeLinecap="round" />
        <Path d="M 60 47 Q 74 43, 86 41" stroke="#FFF0D0" strokeWidth="1.2" opacity="0.65" strokeLinecap="round" />
        <Path d="M 60 49 Q 74 47, 86 46" stroke="#FFF0D0" strokeWidth="1.2" opacity="0.7" strokeLinecap="round" />
        <Path d="M 60 51 Q 74 51, 86 52" stroke="#FFF0D0" strokeWidth="1.2" opacity="0.65" strokeLinecap="round" />
        {/* Blush */}
        <Ellipse cx="30" cy="44" rx="5" ry="3" fill="#FFB07C" opacity="0.3" />
        <Ellipse cx="70" cy="44" rx="5" ry="3" fill="#FFB07C" opacity="0.3" />
      </G>
    ),
  };
}

// ============================================================
// ARIA
// ============================================================
function ariaGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 64 72 C 72 64, 80 52, 82 40 C 84 32, 80 26, 76 28 C 72 30, 74 36, 78 38" fill="none" stroke="#D4A855" strokeWidth="8" strokeLinecap="round" />
        <Ellipse cx="76" cy="28" rx="6" ry="5" fill="#D4A855" />
        <Ellipse cx="75" cy="27" rx="3" ry="2.5" fill="#E0B868" opacity="0.4" />
      </G>
    ),
    body: (
      <G>
        <Path d="M 38 58 C 38 52, 42 48, 50 48 C 58 48, 62 52, 62 58 C 62 68, 60 78, 56 84 C 54 86, 46 86, 44 84 C 40 78, 38 68, 38 58 Z" fill="#D4A855" />
        <Path d="M 39 56 C 39 62, 40 68, 41 74" fill="none" stroke="#B88A38" strokeWidth="2" opacity="0.25" strokeLinecap="round" />
        <Path d="M 44 54 C 46 52, 54 52, 56 54 C 57 58, 56 66, 54 74 C 53 78, 51 82, 50 83 C 49 82, 47 78, 46 74 C 44 66, 43 58, 44 54 Z" fill="#F5E8C8" />
        {/* Dainty paws */}
        <Ellipse cx="43" cy="84" rx="4.5" ry="2.8" fill="#D4A855" />
        <Ellipse cx="43" cy="85.5" rx="3" ry="1.2" fill="#F5E8C8" />
        <Ellipse cx="57" cy="84" rx="4.5" ry="2.8" fill="#D4A855" />
        <Ellipse cx="57" cy="85.5" rx="3" ry="1.2" fill="#F5E8C8" />
      </G>
    ),
    head: (
      <G>
        <Ellipse cx="50" cy="35" rx="24" ry="23" fill="#D4A855" />
        <Path d="M 28 30 C 27 36, 28 42, 30 46" fill="none" stroke="#B88A38" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        <Ellipse cx="50" cy="46" rx="10" ry="7.5" fill="#F5E8C8" />
        {/* Wavy elegant diva tuft */}
        <Path d="M 42 14 C 38 8, 42 2, 48 4 C 52 5, 50 10, 46 12" fill="#D4A855" />
        <Path d="M 48 12 C 50 6, 56 2, 60 6 C 64 10, 58 14, 54 14" fill="#D4A855" />
        <Path d="M 54 14 C 58 10, 64 8, 64 12" fill="#D4A855" />
        <Path d="M 44 8 C 46 5, 50 4, 52 7" fill="none" stroke="#E0C068" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <Path d="M 54 6 C 56 3, 60 4, 60 7" fill="none" stroke="#E0C068" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      </G>
    ),
    ears: (
      <G>
        <Path d="M 32 28 L 16 2 L 42 20 Z" fill="#D4A855" />
        <Path d="M 32 24 L 21 6 L 39 20 Z" fill="#FFB020" />
        <Path d="M 31 22 L 25 10 L 37 20 Z" fill="#E8A018" opacity="0.45" />
        <Path d="M 68 28 L 84 2 L 58 20 Z" fill="#D4A855" />
        <Path d="M 68 24 L 79 6 L 61 20 Z" fill="#FFB020" />
        <Path d="M 69 22 L 75 10 L 63 20 Z" fill="#E8A018" opacity="0.45" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE */}
        <G>
          <Ellipse cx="41" cy="35" rx="7.5" ry="7.5" fill="#FFFFFF" />
          <Ellipse cx="41" cy="35.5" rx="6" ry="6.5" fill="#FFBE44" />
          <Ellipse cx="41" cy="36" rx="4" ry="4.5" fill="#E0A030" />
          <Circle cx="41" cy="36" r="2.8" fill="#1A1A2E" />
          <Circle cx="41" cy="36" r="1.2" fill="#000000" />
          <Circle cx="39" cy="33.5" r="1.8" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="43" cy="34" r="0.9" fill="#FFFFFF" opacity="0.65" />
          <Path d="M 33.5 31.5 C 36 27.5, 46 27.5, 48.5 31.5" fill="none" stroke="#B88A38" strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M 33.5 31.5 L 31 28" stroke="#B88A38" strokeWidth="0.9" strokeLinecap="round" />
          <Path d="M 36 29.5 L 35 27" stroke="#B88A38" strokeWidth="0.7" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE */}
        <G>
          <Ellipse cx="59" cy="35" rx="7.5" ry="7.5" fill="#FFFFFF" />
          <Ellipse cx="59" cy="35.5" rx="6" ry="6.5" fill="#FFBE44" />
          <Ellipse cx="59" cy="36" rx="4" ry="4.5" fill="#E0A030" />
          <Circle cx="59" cy="36" r="2.8" fill="#1A1A2E" />
          <Circle cx="59" cy="36" r="1.2" fill="#000000" />
          <Circle cx="57" cy="33.5" r="1.8" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="61" cy="34" r="0.9" fill="#FFFFFF" opacity="0.65" />
          <Path d="M 51.5 31.5 C 54 27.5, 64 27.5, 66.5 31.5" fill="none" stroke="#B88A38" strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M 66.5 31.5 L 69 28" stroke="#B88A38" strokeWidth="0.9" strokeLinecap="round" />
          <Path d="M 64 29.5 L 65 27" stroke="#B88A38" strokeWidth="0.7" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        <Ellipse cx="44" cy="46" rx="4" ry="3.5" fill="#F5E8C8" />
        <Ellipse cx="56" cy="46" rx="4" ry="3.5" fill="#F5E8C8" />
        <Path d="M 50 44 L 48.5 46.5 L 51.5 46.5 Z" fill="#C09040" />
        {/* Knowing smile */}
        <Path d="M 47 48 Q 50 49.5, 53 48" fill="none" stroke="#B88A38" strokeWidth="0.8" strokeLinecap="round" />
        {/* Whisker dots */}
        <Circle cx="40" cy="46" r="0.7" fill="#FFF8E0" opacity="0.6" />
        <Circle cx="40" cy="48" r="0.7" fill="#FFF8E0" opacity="0.6" />
        <Circle cx="60" cy="46" r="0.7" fill="#FFF8E0" opacity="0.6" />
        <Circle cx="60" cy="48" r="0.7" fill="#FFF8E0" opacity="0.6" />
        {/* Whiskers */}
        <Path d="M 40 46 Q 28 44, 18 43" stroke="#FFF8E0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 40 48 Q 28 47, 18 47" stroke="#FFF8E0" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        <Path d="M 60 46 Q 72 44, 82 43" stroke="#FFF8E0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 60 48 Q 72 47, 82 47" stroke="#FFF8E0" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        {/* Gold sparkles */}
        <G opacity="0.45">
          <Path d="M 80 14 L 80.5 15.5 L 82 16 L 80.5 16.5 L 80 18 L 79.5 16.5 L 78 16 L 79.5 15.5 Z" fill="#FFBE44" />
          <Path d="M 18 18 L 18.3 19 L 19.3 19.3 L 18.3 19.6 L 18 20.6 L 17.7 19.6 L 16.7 19.3 L 17.7 19 Z" fill="#FFBE44" />
        </G>
      </G>
    ),
  };
}

// ============================================================
// TEMPO
// ============================================================
function tempoGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 62 68 C 66 58, 68 44, 70 30 C 71 24, 72 18, 74 14" fill="none" stroke="#E86840" strokeWidth="4" strokeLinecap="round" />
        <Circle cx="74" cy="14" r="2.8" fill="#E86840" />
        <Circle cx="74" cy="13" r="1.3" fill="#FF8850" opacity="0.4" />
        {/* Speed zigzag */}
        <Path d="M 71 26 L 74 24 L 71 22" fill="none" stroke="#FF8040" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      </G>
    ),
    body: (
      <G>
        <Path d="M 36 58 C 35 52, 39 48, 48 47 C 57 48, 61 52, 61 58 C 61 68, 59 78, 55 84 C 53 86, 44 86, 42 84 C 38 78, 36 68, 36 58 Z" fill="#E86840" />
        <Path d="M 37 56 C 37 62, 38 68, 40 74" fill="none" stroke="#C05030" strokeWidth="2" opacity="0.25" strokeLinecap="round" />
        <Path d="M 42 54 C 44 52, 54 52, 56 54 C 57 58, 56 66, 54 74 C 53 78, 50 82, 49 83 C 48 82, 46 78, 45 74 C 43 66, 42 58, 42 54 Z" fill="#FFD8C0" />
        <Ellipse cx="41" cy="84" rx="5" ry="3" fill="#E86840" />
        <Ellipse cx="41" cy="85.5" rx="3" ry="1.2" fill="#FFD8C0" />
        <Ellipse cx="56" cy="84" rx="5" ry="3" fill="#E86840" />
        <Ellipse cx="56" cy="85.5" rx="3" ry="1.2" fill="#FFD8C0" />
        {/* Speed lines */}
        <Path d="M 30 60 L 20 60" stroke="#FF8040" strokeWidth="0.8" opacity="0.25" strokeLinecap="round" />
        <Path d="M 28 64 L 16 64" stroke="#FF8040" strokeWidth="0.8" opacity="0.2" strokeLinecap="round" />
        <Path d="M 30 68 L 18 68" stroke="#FF8040" strokeWidth="0.8" opacity="0.15" strokeLinecap="round" />
      </G>
    ),
    head: (
      <G>
        <Ellipse cx="48" cy="34" rx="24" ry="23" fill="#E86840" />
        <Path d="M 26 30 C 25 36, 26 42, 28 46" fill="none" stroke="#C05030" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        <Ellipse cx="48" cy="46" rx="10" ry="7.5" fill="#FFD8C0" />
        {/* Windswept tuft */}
        <Path d="M 44 14 C 46 10, 52 6, 58 8 C 62 10, 60 14, 56 14" fill="#E86840" />
        <Path d="M 50 12 C 54 8, 60 6, 64 10" fill="none" stroke="#E86840" strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M 52 10 C 56 7, 60 7, 62 10" fill="none" stroke="#FF8850" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      </G>
    ),
    ears: (
      <G>
        <Path d="M 30 26 L 12 2 L 40 18 Z" fill="#E86840" />
        <Path d="M 30 22 L 17 6 L 37 18 Z" fill="#FF4500" />
        <Path d="M 29 20 L 21 8 L 35 18 Z" fill="#DD3800" opacity="0.45" />
        <Path d="M 64 24 L 80 0 L 56 18 Z" fill="#E86840" />
        <Path d="M 64 20 L 76 4 L 58 18 Z" fill="#FF4500" />
        <Path d="M 65 18 L 73 6 L 60 18 Z" fill="#DD3800" opacity="0.45" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE — WIDE open */}
        <G>
          <Ellipse cx="39" cy="34" rx="7.5" ry="9" fill="#FFFFFF" />
          <Ellipse cx="39" cy="34.5" rx="6" ry="7.5" fill="#FF6B20" />
          <Ellipse cx="39" cy="35" rx="4" ry="5" fill="#DD5010" />
          <Ellipse cx="39" cy="35" rx="1" ry="4.5" fill="#0A0A15" />
          <Ellipse cx="39" cy="35" rx="0.4" ry="2.5" fill="#000000" />
          <Circle cx="37" cy="32" r="1.8" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="41" cy="32.5" r="0.9" fill="#FFFFFF" opacity="0.6" />
          <Path d="M 31.5 30 C 34 26, 44 26, 46.5 30" fill="none" stroke="#C05030" strokeWidth="1.5" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE */}
        <G>
          <Ellipse cx="57" cy="34" rx="7.5" ry="9" fill="#FFFFFF" />
          <Ellipse cx="57" cy="34.5" rx="6" ry="7.5" fill="#FF6B20" />
          <Ellipse cx="57" cy="35" rx="4" ry="5" fill="#DD5010" />
          <Ellipse cx="57" cy="35" rx="1" ry="4.5" fill="#0A0A15" />
          <Ellipse cx="57" cy="35" rx="0.4" ry="2.5" fill="#000000" />
          <Circle cx="55" cy="32" r="1.8" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="59" cy="32.5" r="0.9" fill="#FFFFFF" opacity="0.6" />
          <Path d="M 49.5 30 C 52 26, 62 26, 64.5 30" fill="none" stroke="#C05030" strokeWidth="1.5" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        <Ellipse cx="43" cy="46" rx="4" ry="3.5" fill="#FFD8C0" />
        <Ellipse cx="53" cy="46" rx="4" ry="3.5" fill="#FFD8C0" />
        <Path d="M 48 44 L 46.5 46.5 L 49.5 46.5 Z" fill="#D04020" />
        {/* Excited grin + fang */}
        <Path d="M 43 47 Q 45 44, 48 44 Q 53 44, 55 47 Q 53 52, 48 52.5 Q 43 52, 43 47 Z" fill="#CC3020" stroke="#A02010" strokeWidth="0.4" />
        <Ellipse cx="48" cy="50.5" rx="2.5" ry="1.5" fill="#FF5040" />
        <Path d="M 43.5 47 L 43 49 L 44.5 47.5" fill="#FFFFFF" stroke="#E0E0E8" strokeWidth="0.15" />
        {/* Whisker dots */}
        <Circle cx="39" cy="46" r="0.7" fill="#FFE8D0" opacity="0.6" />
        <Circle cx="39" cy="48" r="0.7" fill="#FFE8D0" opacity="0.6" />
        <Circle cx="57" cy="46" r="0.7" fill="#FFE8D0" opacity="0.6" />
        <Circle cx="57" cy="48" r="0.7" fill="#FFE8D0" opacity="0.6" />
        {/* Whiskers — blown back */}
        <Path d="M 39 46 Q 26 42, 14 40" stroke="#FFE8D0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 39 48 Q 26 45, 14 43" stroke="#FFE8D0" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        <Path d="M 57 46 Q 70 42, 82 40" stroke="#FFE8D0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 57 48 Q 70 45, 82 43" stroke="#FFE8D0" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        {/* Speed sparks */}
        <G opacity="0.35">
          <Path d="M 10 28 L 6 28" stroke="#FF6B20" strokeWidth="1.2" strokeLinecap="round" />
          <Path d="M 12 34 L 6 34" stroke="#FF6B20" strokeWidth="0.8" strokeLinecap="round" />
          <Path d="M 10 40 L 4 40" stroke="#FF6B20" strokeWidth="1.2" strokeLinecap="round" />
        </G>
      </G>
    ),
  };
}

// ============================================================
// SHIBU
// ============================================================
function shibuGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 64 72 C 68 70, 72 68, 74 66" fill="none" stroke="#F5E6D3" strokeWidth="5" strokeLinecap="round" />
        <Circle cx="75" cy="65" r="5" fill="#F5E6D3" />
        <Circle cx="74.5" cy="64" r="2.5" fill="#FFF8F0" opacity="0.35" />
      </G>
    ),
    body: (
      <G>
        <Path d="M 37 58 C 37 52, 41 48, 50 48 C 59 48, 63 52, 63 58 C 63 68, 61 78, 57 84 C 54 86, 46 86, 44 84 C 39 78, 37 68, 37 58 Z" fill="#F5E6D3" />
        <Path d="M 38 56 C 38 62, 39 68, 40 74" fill="none" stroke="#D8C8B8" strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />
        <Path d="M 44 54 C 46 52, 54 52, 56 54 C 57 58, 56 66, 54 74 C 53 78, 51 82, 50 83 C 49 82, 47 78, 46 74 C 44 66, 43 58, 44 54 Z" fill="#FFF8F0" />
        <Ellipse cx="42" cy="84" rx="5" ry="3" fill="#F5E6D3" />
        <Ellipse cx="42" cy="85.5" rx="3.2" ry="1.2" fill="#FFF8F0" />
        <Ellipse cx="58" cy="84" rx="5" ry="3" fill="#F5E6D3" />
        <Ellipse cx="58" cy="85.5" rx="3.2" ry="1.2" fill="#FFF8F0" />
      </G>
    ),
    head: (
      <G>
        <Ellipse cx="50" cy="36" rx="24" ry="23" fill="#F5E6D3" transform="rotate(2, 50, 36)" />
        <Path d="M 28 32 C 27 38, 28 44, 30 48" fill="none" stroke="#D8C8B8" strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />
        <Ellipse cx="50" cy="46" rx="10" ry="7.5" fill="#FFF8F0" />
        {/* Side-part tuft */}
        <Path d="M 40 16 C 38 12, 40 8, 44 10 C 46 11, 44 14, 42 15" fill="#F5E6D3" />
        <Path d="M 44 14 C 44 10, 48 9, 48 12" fill="#F5E6D3" stroke="#F5E6D3" strokeWidth="1" />
        <Path d="M 42 12 C 44 10, 46 10, 46 12" fill="none" stroke="#E8D8C8" strokeWidth="0.6" opacity="0.4" strokeLinecap="round" />
      </G>
    ),
    ears: (
      <G>
        <Path d="M 32 28 L 16 2 L 42 20 Z" fill="#F5E6D3" />
        <Path d="M 32 24 L 21 6 L 39 20 Z" fill="#20B2AA" />
        <Path d="M 31 22 L 25 10 L 37 20 Z" fill="#189898" opacity="0.45" />
        <Path d="M 68 28 L 84 2 L 58 20 Z" fill="#F5E6D3" />
        <Path d="M 68 24 L 79 6 L 61 20 Z" fill="#20B2AA" />
        <Path d="M 69 22 L 75 10 L 63 20 Z" fill="#189898" opacity="0.45" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE — peaceful half-closed */}
        <G>
          <Ellipse cx="41" cy="36" rx="6.5" ry="4.5" fill="#FFFFFF" />
          <Ellipse cx="41" cy="36.5" rx="5" ry="3.5" fill="#20CCBB" />
          <Ellipse cx="41" cy="37" rx="3" ry="2.5" fill="#18A898" />
          <Ellipse cx="41" cy="37" rx="1" ry="2.5" fill="#1A1A2E" />
          <Ellipse cx="41" cy="37" rx="0.4" ry="1.5" fill="#000000" />
          <Circle cx="39.5" cy="35.5" r="1" fill="#FFFFFF" opacity="0.75" />
          {/* Heavy peaceful lid */}
          <Path d="M 34.5 34 C 36 31, 46 31, 47.5 34" fill="none" stroke="#D8C8B8" strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M 35.5 38 C 38 39.5, 44 39.5, 46.5 38" fill="none" stroke="#D8C8B8" strokeWidth="0.8" opacity="0.35" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE */}
        <G>
          <Ellipse cx="59" cy="36" rx="6.5" ry="4.5" fill="#FFFFFF" />
          <Ellipse cx="59" cy="36.5" rx="5" ry="3.5" fill="#20CCBB" />
          <Ellipse cx="59" cy="37" rx="3" ry="2.5" fill="#18A898" />
          <Ellipse cx="59" cy="37" rx="1" ry="2.5" fill="#1A1A2E" />
          <Ellipse cx="59" cy="37" rx="0.4" ry="1.5" fill="#000000" />
          <Circle cx="57.5" cy="35.5" r="1" fill="#FFFFFF" opacity="0.75" />
          <Path d="M 52.5 34 C 54 31, 64 31, 65.5 34" fill="none" stroke="#D8C8B8" strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M 53.5 38 C 56 39.5, 62 39.5, 64.5 38" fill="none" stroke="#D8C8B8" strokeWidth="0.8" opacity="0.35" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        <Ellipse cx="44" cy="46" rx="4" ry="3.5" fill="#FFF8F0" />
        <Ellipse cx="56" cy="46" rx="4" ry="3.5" fill="#FFF8F0" />
        <Path d="M 50 44 L 48.5 46.5 L 51.5 46.5 Z" fill="#D8B8A0" />
        {/* Peaceful smile */}
        <Path d="M 47 48 Q 50 49.5, 53 48" fill="none" stroke="#D0B8A0" strokeWidth="0.7" strokeLinecap="round" />
        {/* Whisker dots */}
        <Circle cx="40" cy="47" r="0.7" fill="#FFFFFF" opacity="0.55" />
        <Circle cx="40" cy="49" r="0.7" fill="#FFFFFF" opacity="0.55" />
        <Circle cx="60" cy="47" r="0.7" fill="#FFFFFF" opacity="0.55" />
        <Circle cx="60" cy="49" r="0.7" fill="#FFFFFF" opacity="0.55" />
        {/* Whiskers */}
        <Path d="M 40 47 Q 28 46, 20 46" stroke="#FFFFFF" strokeWidth="1" opacity="0.55" strokeLinecap="round" />
        <Path d="M 40 49 Q 28 49, 20 49" stroke="#FFFFFF" strokeWidth="1" opacity="0.55" strokeLinecap="round" />
        <Path d="M 60 47 Q 72 46, 80 46" stroke="#FFFFFF" strokeWidth="1" opacity="0.55" strokeLinecap="round" />
        <Path d="M 60 49 Q 72 49, 80 49" stroke="#FFFFFF" strokeWidth="1" opacity="0.55" strokeLinecap="round" />
        {/* Blush */}
        <Ellipse cx="32" cy="44" rx="4" ry="2.5" fill="#FFD0B8" opacity="0.25" />
        <Ellipse cx="68" cy="44" rx="4" ry="2.5" fill="#FFD0B8" opacity="0.25" />
        {/* Zen circle */}
        <Circle cx="50" cy="4" r="2.5" fill="none" stroke="#20CCBB" strokeWidth="0.4" opacity="0.25" />
      </G>
    ),
  };
}

// ============================================================
// BELLA
// ============================================================
function bellaGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 66 70 C 74 60, 82 48, 84 38 C 86 30, 82 24, 78 22 C 74 20, 70 24, 72 30" fill="none" stroke="#F8F8FF" strokeWidth="12" strokeLinecap="round" />
        <Ellipse cx="78" cy="24" rx="8" ry="7" fill="#F8F8FF" />
        <Ellipse cx="80" cy="32" rx="6" ry="5" fill="#F8F8FF" />
        <Ellipse cx="78" cy="23" rx="4" ry="3" fill="#FFFFFF" opacity="0.4" />
        <Path d="M 68 68 C 74 58, 80 46, 82 36" fill="none" stroke="#E0E0E8" strokeWidth="3.5" opacity="0.2" strokeLinecap="round" />
      </G>
    ),
    body: (
      <G>
        <Ellipse cx="50" cy="70" rx="18" ry="17" fill="#F8F8FF" />
        <Path d="M 34 66 C 34 72, 35 78, 38 82" fill="none" stroke="#E0E0E8" strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />
        <Ellipse cx="50" cy="72" rx="12" ry="13" fill="#FFFFFF" />
        <Ellipse cx="41" cy="86" rx="5.5" ry="3.5" fill="#F8F8FF" />
        <Ellipse cx="41" cy="87.5" rx="3.5" ry="1.3" fill="#FFFFFF" />
        <Ellipse cx="59" cy="86" rx="5.5" ry="3.5" fill="#F8F8FF" />
        <Ellipse cx="59" cy="87.5" rx="3.5" ry="1.3" fill="#FFFFFF" />
      </G>
    ),
    head: (
      <G>
        <Circle cx="50" cy="36" r="26" fill="#F8F8FF" />
        <Path d="M 26 32 C 25 38, 26 44, 29 48" fill="none" stroke="#E0E0E8" strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />
        <Ellipse cx="50" cy="46" rx="10" ry="7.5" fill="#FFFFFF" />
        {/* Fluffy cheek tufts */}
        <Path d="M 26 38 C 22 36, 20 40, 22 44 C 24 48, 28 47, 30 44" fill="#F8F8FF" />
        <Path d="M 74 38 C 78 36, 80 40, 78 44 C 76 48, 72 47, 70 44" fill="#F8F8FF" />
        {/* Silky flowing tuft */}
        <Path d="M 40 14 C 36 8, 40 2, 46 4 C 50 5, 48 10, 44 12" fill="#F8F8FF" />
        <Path d="M 46 12 C 48 6, 54 2, 58 6 C 60 10, 56 14, 52 14" fill="#F8F8FF" />
        <Path d="M 52 12 C 56 8, 62 6, 62 12" fill="#F8F8FF" />
        <Path d="M 42 7 C 44 4, 48 4, 50 7" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
        <Path d="M 50 6 C 53 3, 57 4, 58 7" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      </G>
    ),
    ears: (
      <G>
        <Path d="M 30 24 C 26 14, 20 4, 22 2 C 26 -1, 34 6, 38 16" fill="#F8F8FF" />
        <Path d="M 30 22 C 28 14, 24 6, 25 4 C 28 2, 33 8, 36 16" fill="#FF80A0" />
        <Path d="M 70 24 C 74 14, 80 4, 78 2 C 74 -1, 66 6, 62 16" fill="#F8F8FF" />
        <Path d="M 70 22 C 72 14, 76 6, 75 4 C 72 2, 67 8, 64 16" fill="#FF80A0" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE */}
        <G>
          <Ellipse cx="40" cy="36" rx="7.5" ry="7.5" fill="#FFFFFF" />
          <Ellipse cx="40" cy="36.5" rx="6" ry="6.5" fill="#4488FF" />
          <Ellipse cx="40" cy="37" rx="4" ry="4.5" fill="#2868DD" />
          <Circle cx="40" cy="37" r="2.8" fill="#1A1A2E" />
          <Circle cx="40" cy="37" r="1.2" fill="#000000" />
          <Circle cx="38" cy="34.5" r="2" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="42.5" cy="35" r="1" fill="#FFFFFF" opacity="0.7" />
          <Path d="M 32.5 33 C 35 29, 45 29, 47.5 33" fill="none" stroke="#E0E0E8" strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M 32.5 33 L 30 30" stroke="#D0D0D8" strokeWidth="0.9" strokeLinecap="round" />
          <Path d="M 34.5 31 L 33.5 28.5" stroke="#D0D0D8" strokeWidth="0.7" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE */}
        <G>
          <Ellipse cx="60" cy="36" rx="7.5" ry="7" fill="#FFFFFF" />
          <Ellipse cx="60" cy="36.5" rx="6" ry="6" fill="#4488FF" />
          <Ellipse cx="60" cy="37" rx="4" ry="4" fill="#2868DD" />
          <Circle cx="60" cy="37" r="2.8" fill="#1A1A2E" />
          <Circle cx="60" cy="37" r="1.2" fill="#000000" />
          <Circle cx="58" cy="34.5" r="2" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="62.5" cy="35" r="1" fill="#FFFFFF" opacity="0.7" />
          <Path d="M 52.5 33 C 55 29.5, 65 29.5, 67.5 33" fill="none" stroke="#E0E0E8" strokeWidth="1.8" strokeLinecap="round" />
          <Path d="M 67.5 33 L 70 30" stroke="#D0D0D8" strokeWidth="0.9" strokeLinecap="round" />
          <Path d="M 65.5 31 L 66.5 28.5" stroke="#D0D0D8" strokeWidth="0.7" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        <Ellipse cx="44" cy="46" rx="4.5" ry="3.5" fill="#FFFFFF" />
        <Ellipse cx="56" cy="46" rx="4.5" ry="3.5" fill="#FFFFFF" />
        <Path d="M 50 44 L 48.5 46.5 L 51.5 46.5 Z" fill="#FFB0C0" />
        {/* Regal smile */}
        <Path d="M 47 48 Q 50 49.5, 53 48" fill="none" stroke="#D0D0D8" strokeWidth="0.7" strokeLinecap="round" />
        {/* Whisker dots */}
        <Circle cx="40" cy="47" r="0.7" fill="#B8B8CC" opacity="0.6" />
        <Circle cx="40" cy="49" r="0.7" fill="#B8B8CC" opacity="0.6" />
        <Circle cx="60" cy="47" r="0.7" fill="#B8B8CC" opacity="0.6" />
        <Circle cx="60" cy="49" r="0.7" fill="#B8B8CC" opacity="0.6" />
        {/* Whiskers */}
        <Path d="M 40 47 Q 28 45, 18 44" stroke="#B8B8CC" strokeWidth="1" opacity="0.55" strokeLinecap="round" />
        <Path d="M 40 49 Q 28 48, 18 48" stroke="#B8B8CC" strokeWidth="1" opacity="0.55" strokeLinecap="round" />
        <Path d="M 60 47 Q 72 45, 82 44" stroke="#B8B8CC" strokeWidth="1" opacity="0.55" strokeLinecap="round" />
        <Path d="M 60 49 Q 72 48, 82 48" stroke="#B8B8CC" strokeWidth="1" opacity="0.55" strokeLinecap="round" />
        {/* Blush */}
        <Ellipse cx="30" cy="44" rx="5" ry="3" fill="#FFD0DC" opacity="0.25" />
        <Ellipse cx="70" cy="44" rx="5" ry="3" fill="#FFD0DC" opacity="0.25" />
        {/* Royal sparkles */}
        <G opacity="0.45">
          <Path d="M 20 16 L 20.5 17.5 L 22 18 L 20.5 18.5 L 20 20 L 19.5 18.5 L 18 18 L 19.5 17.5 Z" fill="#4488FF" />
          <Path d="M 80 12 L 80.5 13.5 L 82 14 L 80.5 14.5 L 80 16 L 79.5 14.5 L 78 14 L 79.5 13.5 Z" fill="#4488FF" />
        </G>
      </G>
    ),
  };
}

// ============================================================
// SABLE
// ============================================================
function sableGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 34 72 C 26 62, 18 48, 16 36 C 14 26, 18 20, 22 18 C 26 16, 28 20, 26 26" fill="none" stroke="#5A3828" strokeWidth="10" strokeLinecap="round" />
        <Ellipse cx="22" cy="20" rx="7" ry="6" fill="#5A3828" />
        <Ellipse cx="20" cy="28" rx="5.5" ry="4.5" fill="#5A3828" />
        <Ellipse cx="22" cy="19" rx="3.5" ry="2.5" fill="#6A4838" opacity="0.4" />
        <Path d="M 32 70 C 26 60, 20 46, 18 34" fill="none" stroke="#3A2018" strokeWidth="3.5" opacity="0.25" strokeLinecap="round" />
      </G>
    ),
    body: (
      <G>
        <Path d="M 38 58 C 38 52, 42 48, 50 48 C 58 48, 62 52, 62 58 C 62 68, 60 78, 56 84 C 54 86, 46 86, 44 84 C 40 78, 38 68, 38 58 Z" fill="#5A3828" />
        <Path d="M 39 56 C 39 62, 40 68, 41 74" fill="none" stroke="#3A2018" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        <Path d="M 44 54 C 46 52, 54 52, 56 54 C 57 58, 56 66, 54 74 C 53 78, 51 82, 50 83 C 49 82, 47 78, 46 74 C 44 66, 43 58, 44 54 Z" fill="#8A6848" />
        <Ellipse cx="42" cy="84" rx="4.5" ry="2.8" fill="#5A3828" />
        <Ellipse cx="42" cy="85.5" rx="3" ry="1.2" fill="#8A6848" />
        <Ellipse cx="58" cy="84" rx="4.5" ry="2.8" fill="#5A3828" />
        <Ellipse cx="58" cy="85.5" rx="3" ry="1.2" fill="#8A6848" />
      </G>
    ),
    head: (
      <G>
        <Ellipse cx="50" cy="35" rx="24" ry="23" fill="#5A3828" transform="rotate(-4, 50, 35)" />
        <Path d="M 28 30 C 27 36, 28 42, 30 46" fill="none" stroke="#3A2018" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
        <Ellipse cx="50" cy="46" rx="10" ry="7" fill="#8A6848" />
        {/* Sharp angular villain tuft */}
        <Path d="M 44 14 C 42 6, 46 -2, 52 4 C 54 6, 52 10, 48 12" fill="#5A3828" />
        <Path d="M 50 10 C 52 4, 58 0, 60 6 C 61 10, 58 12, 56 12" fill="#5A3828" />
        <Path d="M 48 8 L 46 2 L 50 6 Z" fill="#5A3828" />
        <Path d="M 54 6 L 56 0 L 56 6 Z" fill="#5A3828" />
        <Path d="M 48 6 C 50 3, 54 3, 56 6" fill="none" stroke="#6A4838" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      </G>
    ),
    ears: (
      <G>
        <Path d="M 32 28 L 14 0 L 42 18 Z" fill="#5A3828" />
        <Path d="M 32 24 L 19 4 L 39 18 Z" fill="#C060FF" />
        <Path d="M 31 22 L 23 8 L 37 18 Z" fill="#A048DD" opacity="0.45" />
        <Path d="M 68 28 L 86 0 L 58 18 Z" fill="#5A3828" />
        <Path d="M 68 24 L 81 4 L 61 18 Z" fill="#C060FF" />
        <Path d="M 69 22 L 77 8 L 63 18 Z" fill="#A048DD" opacity="0.45" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE — intense */}
        <G>
          <Ellipse cx="41" cy="35" rx="7" ry="6" fill="#FFFFFF" />
          <Ellipse cx="42" cy="35.5" rx="5.5" ry="5" fill="#C060FF" />
          <Ellipse cx="42" cy="36" rx="3.5" ry="3.5" fill="#9840DD" />
          <Ellipse cx="42" cy="36" rx="1.3" ry="3.5" fill="#1A1A2E" />
          <Ellipse cx="42" cy="36" rx="0.5" ry="2" fill="#000000" />
          <Circle cx="40" cy="34" r="1.3" fill="#FFFFFF" opacity="0.85" />
          {/* Heavy brooding lid */}
          <Path d="M 34 32 C 37 28, 47 28, 48 32" fill="none" stroke="#3A2018" strokeWidth="2.8" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE — slightly narrowed */}
        <G>
          <Ellipse cx="59" cy="35" rx="7" ry="5" fill="#FFFFFF" />
          <Ellipse cx="58" cy="35.5" rx="5.5" ry="4" fill="#C060FF" />
          <Ellipse cx="58" cy="36" rx="3.5" ry="3" fill="#9840DD" />
          <Ellipse cx="58" cy="36" rx="1.3" ry="3" fill="#1A1A2E" />
          <Ellipse cx="58" cy="36" rx="0.5" ry="1.8" fill="#000000" />
          <Circle cx="56.5" cy="34.5" r="1.3" fill="#FFFFFF" opacity="0.85" />
          <Path d="M 52 33 C 55 29, 65 29, 66 33" fill="none" stroke="#3A2018" strokeWidth="2.8" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        <Ellipse cx="44" cy="46" rx="4" ry="3" fill="#8A6848" />
        <Ellipse cx="56" cy="46" rx="4" ry="3" fill="#8A6848" />
        <Path d="M 50 44 L 48.5 46 L 51.5 46 Z" fill="#4A2818" />
        {/* Dramatic smirk + fang */}
        <Path d="M 47 47.5 Q 50 49, 55 47" fill="none" stroke="#3A2018" strokeWidth="0.8" strokeLinecap="round" />
        <Path d="M 54 47 L 53.8 49 L 55 48" fill="#FFFFFF" stroke="#D0D0D0" strokeWidth="0.15" />
        {/* Whisker dots */}
        <Circle cx="40" cy="47" r="0.7" fill="#E0D0C0" opacity="0.6" />
        <Circle cx="40" cy="49" r="0.7" fill="#E0D0C0" opacity="0.6" />
        <Circle cx="60" cy="47" r="0.7" fill="#E0D0C0" opacity="0.6" />
        <Circle cx="60" cy="49" r="0.7" fill="#E0D0C0" opacity="0.6" />
        {/* Whiskers — angled down */}
        <Path d="M 40 47 Q 28 49, 18 52" stroke="#E0D0C0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 40 49 Q 28 52, 18 56" stroke="#E0D0C0" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        <Path d="M 60 47 Q 72 49, 82 52" stroke="#E0D0C0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 60 49 Q 72 52, 82 56" stroke="#E0D0C0" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        {/* Purple sparkles */}
        <G opacity="0.35">
          <Path d="M 84 16 L 84.5 17.5 L 86 18 L 84.5 18.5 L 84 20 L 83.5 18.5 L 82 18 L 83.5 17.5 Z" fill="#C060FF" />
          <Circle cx="12" cy="12" r="0.5" fill="#C060FF" />
        </G>
      </G>
    ),
  };
}

// ============================================================
// CODA
// ============================================================
function codaGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 66 72 C 74 64, 80 54, 82 44 C 84 38, 80 34, 76 36 C 72 38, 74 44, 78 46" fill="none" stroke="#6E8898" strokeWidth="6" strokeLinecap="round" />
        <Circle cx="76" cy="36" r="4" fill="#6E8898" />
        <Circle cx="75.5" cy="35" r="2" fill="#7E98A8" opacity="0.4" />
      </G>
    ),
    body: (
      <G>
        <Path d="M 37 58 C 37 52, 41 48, 50 48 C 59 48, 63 52, 63 58 C 63 68, 61 78, 57 84 C 54 86, 46 86, 44 84 C 39 78, 37 68, 37 58 Z" fill="#6E8898" />
        <Path d="M 38 56 C 38 62, 39 68, 40 74" fill="none" stroke="#506878" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        <Path d="M 44 54 C 46 52, 54 52, 56 54 C 57 58, 56 66, 54 74 C 53 78, 51 82, 50 83 C 49 82, 47 78, 46 74 C 44 66, 43 58, 44 54 Z" fill="#90A8B8" />
        <Ellipse cx="42" cy="84" rx="5" ry="3" fill="#6E8898" />
        <Ellipse cx="42" cy="85.5" rx="3.2" ry="1.2" fill="#90A8B8" />
        <Ellipse cx="58" cy="84" rx="5" ry="3" fill="#6E8898" />
        <Ellipse cx="58" cy="85.5" rx="3.2" ry="1.2" fill="#90A8B8" />
      </G>
    ),
    head: (
      <G>
        <Ellipse cx="50" cy="35" rx="25" ry="24" fill="#6E8898" />
        <Path d="M 27 30 C 26 36, 27 42, 29 46" fill="none" stroke="#506878" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        <Ellipse cx="50" cy="46" rx="10" ry="7.5" fill="#90A8B8" />
        {/* Cheek fluff — professorial */}
        <Path d="M 28 40 C 24 38, 22 42, 24 46 C 26 47, 30 47, 31 44" fill="#6E8898" />
        <Path d="M 72 40 C 76 38, 78 42, 76 46 C 74 47, 70 47, 69 44" fill="#6E8898" />
        {/* Messy professor tuft */}
        <Path d="M 42 14 C 40 8, 44 4, 48 6 C 50 7, 48 10, 44 12" fill="#6E8898" />
        <Path d="M 48 12 C 50 6, 54 4, 56 8 C 57 10, 54 12, 52 12" fill="#6E8898" />
        <Path d="M 52 10 C 55 6, 60 6, 58 10" fill="#6E8898" />
        <Path d="M 44 8 L 42 4" stroke="#6E8898" strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M 52 6 L 54 2" stroke="#6E8898" strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M 56 8 L 60 5" stroke="#6E8898" strokeWidth="1" strokeLinecap="round" />
        <Path d="M 46 8 C 48 5, 52 5, 54 8" fill="none" stroke="#7E98A8" strokeWidth="0.8" opacity="0.4" strokeLinecap="round" />
      </G>
    ),
    ears: (
      <G>
        <Path d="M 30 24 C 26 14, 20 4, 22 2 C 26 -1, 34 6, 38 16" fill="#6E8898" />
        <Path d="M 30 22 C 28 14, 24 6, 25 4 C 28 2, 33 8, 36 16" fill="#44AAFF" />
        <Path d="M 70 24 C 74 14, 80 4, 78 2 C 74 -1, 66 6, 62 16" fill="#6E8898" />
        <Path d="M 70 22 C 72 14, 76 6, 75 4 C 72 2, 67 8, 64 16" fill="#44AAFF" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE */}
        <G>
          <Ellipse cx="41" cy="35" rx="7" ry="6.5" fill="#FFFFFF" />
          <Ellipse cx="41" cy="35.5" rx="5.5" ry="5.5" fill="#44AAFF" />
          <Ellipse cx="41" cy="36" rx="3.5" ry="3.5" fill="#2888DD" />
          <Circle cx="41" cy="36" r="2.5" fill="#1A1A2E" />
          <Circle cx="41" cy="36" r="1" fill="#000000" />
          <Circle cx="39" cy="34" r="1.5" fill="#FFFFFF" opacity="0.85" />
          <Circle cx="43" cy="34.5" r="0.7" fill="#FFFFFF" opacity="0.5" />
          <Path d="M 34 32 C 36 28.5, 46 28.5, 48 32" fill="none" stroke="#506878" strokeWidth="2.2" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE */}
        <G>
          <Ellipse cx="59" cy="35" rx="7" ry="6.5" fill="#FFFFFF" />
          <Ellipse cx="59" cy="35.5" rx="5.5" ry="5.5" fill="#44AAFF" />
          <Ellipse cx="59" cy="36" rx="3.5" ry="3.5" fill="#2888DD" />
          <Circle cx="59" cy="36" r="2.5" fill="#1A1A2E" />
          <Circle cx="59" cy="36" r="1" fill="#000000" />
          <Circle cx="57" cy="34" r="1.5" fill="#FFFFFF" opacity="0.85" />
          <Circle cx="61" cy="34.5" r="0.7" fill="#FFFFFF" opacity="0.5" />
          <Path d="M 52 32 C 54 28.5, 64 28.5, 66 32" fill="none" stroke="#506878" strokeWidth="2.2" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        <Ellipse cx="44" cy="46" rx="4" ry="3.5" fill="#90A8B8" />
        <Ellipse cx="56" cy="46" rx="4" ry="3.5" fill="#90A8B8" />
        <Path d="M 50 44 L 48.5 46.5 L 51.5 46.5 Z" fill="#506878" />
        {/* Dignified expression */}
        <Path d="M 47 48 Q 50 49, 53 48" fill="none" stroke="#506878" strokeWidth="0.7" strokeLinecap="round" />
        {/* Whisker dots */}
        <Circle cx="40" cy="47" r="0.7" fill="#D0E0F0" opacity="0.6" />
        <Circle cx="40" cy="49" r="0.7" fill="#D0E0F0" opacity="0.6" />
        <Circle cx="40" cy="51" r="0.7" fill="#D0E0F0" opacity="0.6" />
        <Circle cx="60" cy="47" r="0.7" fill="#D0E0F0" opacity="0.6" />
        <Circle cx="60" cy="49" r="0.7" fill="#D0E0F0" opacity="0.6" />
        <Circle cx="60" cy="51" r="0.7" fill="#D0E0F0" opacity="0.6" />
        {/* Whiskers */}
        <Path d="M 40 47 Q 28 45, 18 44" stroke="#D0E0F0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 40 49 Q 28 48, 18 48" stroke="#D0E0F0" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        <Path d="M 40 51 Q 28 51, 18 52" stroke="#D0E0F0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 60 47 Q 72 45, 82 44" stroke="#D0E0F0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 60 49 Q 72 48, 82 48" stroke="#D0E0F0" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        <Path d="M 60 51 Q 72 51, 82 52" stroke="#D0E0F0" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        {/* Music note */}
        <G opacity="0.3">
          <Path d="M 82 14 L 82 20" stroke="#44AAFF" strokeWidth="0.7" strokeLinecap="round" />
          <Circle cx="81" cy="20.5" r="1" fill="#44AAFF" />
          <Path d="M 82 14 L 86 13" stroke="#44AAFF" strokeWidth="0.7" strokeLinecap="round" />
        </G>
      </G>
    ),
  };
}

// ============================================================
// CHONKY MONKE
// ============================================================
function chonkyMonkeGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 72 60 C 80 52, 86 40, 86 30 C 86 22, 82 18, 78 20 C 74 22, 76 28, 80 32" fill="none" stroke="#F0922E" strokeWidth="8" strokeLinecap="round" />
        <Ellipse cx="78" cy="21" rx="6" ry="5" fill="#F0922E" />
        <Ellipse cx="77" cy="20" rx="3" ry="2.5" fill="#F8A848" opacity="0.4" />
      </G>
    ),
    body: (
      <G>
        {/* MASSIVE round body */}
        <Ellipse cx="50" cy="68" rx="24" ry="22" fill="#F0922E" />
        <Path d="M 28 64 C 28 72, 30 80, 34 84" fill="none" stroke="#D07820" strokeWidth="2.5" opacity="0.25" strokeLinecap="round" />
        {/* Glorious cream belly */}
        <Ellipse cx="50" cy="70" rx="17" ry="18" fill="#FFF5E8" />
        {/* Tiny paws barely visible under CHONK */}
        <Ellipse cx="38" cy="88" rx="6" ry="3.5" fill="#F0922E" />
        <Ellipse cx="38" cy="89.5" rx="4" ry="1.3" fill="#FFF5E8" />
        <Ellipse cx="62" cy="88" rx="6" ry="3.5" fill="#F0922E" />
        <Ellipse cx="62" cy="89.5" rx="4" ry="1.3" fill="#FFF5E8" />
      </G>
    ),
    head: (
      <G>
        <Circle cx="50" cy="32" r="26" fill="#F0922E" />
        <Path d="M 26 28 C 25 34, 26 40, 28 44" fill="none" stroke="#D07820" strokeWidth="2" opacity="0.25" strokeLinecap="round" />
        <Ellipse cx="50" cy="42" rx="11" ry="8" fill="#FFF5E8" />
        {/* MASSIVE cheek fluff */}
        <Path d="M 26 36 C 20 32, 16 38, 20 44 C 24 48, 30 47, 32 42" fill="#F0922E" />
        <Path d="M 74 36 C 80 32, 84 38, 80 44 C 76 48, 70 47, 68 42" fill="#F0922E" />
        <Path d="M 22 40 C 18 36, 16 42, 20 44" fill="#F8A848" opacity="0.25" />
        <Path d="M 78 40 C 82 36, 84 42, 80 44" fill="#F8A848" opacity="0.25" />
        {/* LARGE cowlick tuft */}
        <Circle cx="44" cy="10" r="5" fill="#F0922E" />
        <Circle cx="50" cy="7" r="5.5" fill="#F0922E" />
        <Circle cx="56" cy="10" r="5" fill="#F0922E" />
        <Path d="M 48 4 C 46 -2, 50 -4, 54 0 C 56 2, 54 6, 50 6" fill="#F0922E" />
        <Path d="M 50 2 L 48 -4 L 52 0 Z" fill="#F0922E" />
        <Path d="M 54 4 L 58 -2 L 56 4 Z" fill="#F0922E" />
        <Circle cx="50" cy="6" r="2.5" fill="#F8A848" opacity="0.35" />
      </G>
    ),
    ears: (
      <G>
        <Path d="M 30 20 C 26 10, 20 0, 22 -2 C 26 -4, 34 2, 38 12" fill="#F0922E" />
        <Path d="M 30 18 C 28 10, 24 2, 25 0 C 28 -2, 33 4, 36 12" fill="#FFB74D" />
        <Path d="M 70 20 C 74 10, 80 0, 78 -2 C 74 -4, 66 2, 62 12" fill="#F0922E" />
        <Path d="M 70 18 C 72 10, 76 2, 75 0 C 72 -2, 67 4, 64 12" fill="#FFB74D" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE */}
        <G>
          <Ellipse cx="40" cy="32" rx="8" ry="8.5" fill="#FFFFFF" />
          <Ellipse cx="40" cy="32.5" rx="6.5" ry="7" fill="#FFD54F" />
          <Ellipse cx="40" cy="33" rx="4.5" ry="5" fill="#E8B830" />
          <Circle cx="40" cy="33" r="3.2" fill="#1A1A2E" />
          <Circle cx="40" cy="33" r="1.3" fill="#000000" />
          <Circle cx="37.5" cy="30" r="2.2" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="42.5" cy="30.5" r="1" fill="#FFFFFF" opacity="0.7" />
          <Circle cx="39" cy="35.5" r="0.8" fill="#FFFFFF" opacity="0.4" />
          <Path d="M 32 29 C 34 25, 46 25, 48 29" fill="none" stroke="#D07820" strokeWidth="2" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE */}
        <G>
          <Ellipse cx="60" cy="32" rx="8" ry="8.5" fill="#FFFFFF" />
          <Ellipse cx="60" cy="32.5" rx="6.5" ry="7" fill="#FFD54F" />
          <Ellipse cx="60" cy="33" rx="4.5" ry="5" fill="#E8B830" />
          <Circle cx="60" cy="33" r="3.2" fill="#1A1A2E" />
          <Circle cx="60" cy="33" r="1.3" fill="#000000" />
          <Circle cx="57.5" cy="30" r="2.2" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="62.5" cy="30.5" r="1" fill="#FFFFFF" opacity="0.7" />
          <Circle cx="59" cy="35.5" r="0.8" fill="#FFFFFF" opacity="0.4" />
          <Path d="M 52 29 C 54 25, 66 25, 68 29" fill="none" stroke="#D07820" strokeWidth="2" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        <Ellipse cx="44" cy="42" rx="5" ry="3.5" fill="#FFF5E8" />
        <Ellipse cx="56" cy="42" rx="5" ry="3.5" fill="#FFF5E8" />
        <Path d="M 50 40 L 47.5 43 L 52.5 43 Z" fill="#E08020" />
        {/* Big happy grin */}
        <Path d="M 44 43.5 Q 46 40, 50 40 Q 54 40, 56 43.5 Q 54 49, 50 49.5 Q 46 49, 44 43.5 Z" fill="#E05020" stroke="#C04018" strokeWidth="0.4" />
        <Ellipse cx="50" cy="47.5" rx="3.5" ry="2" fill="#FF5040" />
        {/* Whisker dots */}
        <Circle cx="39" cy="43" r="0.8" fill="#FFF0D0" opacity="0.65" />
        <Circle cx="39" cy="45" r="0.8" fill="#FFF0D0" opacity="0.65" />
        <Circle cx="61" cy="43" r="0.8" fill="#FFF0D0" opacity="0.65" />
        <Circle cx="61" cy="45" r="0.8" fill="#FFF0D0" opacity="0.65" />
        {/* Whiskers */}
        <Path d="M 39 43 Q 26 40, 16 39" stroke="#FFF0D0" strokeWidth="1.2" opacity="0.65" strokeLinecap="round" />
        <Path d="M 39 45 Q 26 44, 16 43" stroke="#FFF0D0" strokeWidth="1.2" opacity="0.7" strokeLinecap="round" />
        <Path d="M 61 43 Q 74 40, 84 39" stroke="#FFF0D0" strokeWidth="1.2" opacity="0.65" strokeLinecap="round" />
        <Path d="M 61 45 Q 74 44, 84 43" stroke="#FFF0D0" strokeWidth="1.2" opacity="0.7" strokeLinecap="round" />
        {/* Blush */}
        <Ellipse cx="28" cy="42" rx="5.5" ry="3.5" fill="#FFB74D" opacity="0.3" />
        <Ellipse cx="72" cy="42" rx="5.5" ry="3.5" fill="#FFB74D" opacity="0.3" />
        {/* LEGENDARY SPARKLES */}
        <G>
          <Path d="M 82 8 L 83 11 L 86 12 L 83 13 L 82 16 L 81 13 L 78 12 L 81 11 Z" fill="#FFD54F" opacity="0.65" />
          <Path d="M 14 12 L 14.8 14 L 17 14.5 L 14.8 15 L 14 17 L 13.2 15 L 11 14.5 L 13.2 14 Z" fill="#FFD54F" opacity="0.55" />
          <Path d="M 90 24 L 90.5 25.5 L 92 26 L 90.5 26.5 L 90 28 L 89.5 26.5 L 88 26 L 89.5 25.5 Z" fill="#FFD54F" opacity="0.45" />
          <Circle cx="8" cy="24" r="0.6" fill="#FFD54F" opacity="0.4" />
          <Circle cx="88" cy="34" r="0.5" fill="#FFD54F" opacity="0.35" />
        </G>
      </G>
    ),
    extras: (
      <Ellipse cx="50" cy="55" rx="40" ry="38" fill="#FFD54F" opacity="0.06" />
    ),
  };
}

// ============================================================
// SALSA
// ============================================================
function salsaGroups(): CatGroups {
  return {
    tail: (
      <G>
        <Path d="M 66 70 C 74 62, 80 52, 82 42 C 84 36, 80 32, 76 34 C 72 36, 74 42, 78 44" fill="none" stroke="#484858" strokeWidth="5" strokeLinecap="round" />
        <Circle cx="76" cy="34" r="3.5" fill="#484858" />
        <Circle cx="75.5" cy="33" r="1.8" fill="#585870" opacity="0.35" />
      </G>
    ),
    body: (
      <G>
        <Path d="M 37 58 C 37 52, 41 48, 50 48 C 59 48, 63 52, 63 58 C 63 68, 61 78, 57 84 C 54 86, 46 86, 44 84 C 39 78, 37 68, 37 58 Z" fill="#484858" />
        <Path d="M 38 56 C 38 62, 39 68, 40 74" fill="none" stroke="#303040" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        <Path d="M 44 54 C 46 52, 54 52, 56 54 C 57 58, 56 66, 54 74 C 53 78, 51 82, 50 83 C 49 82, 47 78, 46 74 C 44 66, 43 58, 44 54 Z" fill="#707080" />
        <Ellipse cx="42" cy="84" rx="5" ry="3" fill="#484858" />
        <Ellipse cx="42" cy="85.5" rx="3.2" ry="1.2" fill="#707080" />
        <Ellipse cx="58" cy="84" rx="5" ry="3" fill="#484858" />
        <Ellipse cx="58" cy="85.5" rx="3.2" ry="1.2" fill="#707080" />
      </G>
    ),
    head: (
      <G>
        <Circle cx="50" cy="36" r="25" fill="#484858" />
        <Path d="M 27 32 C 26 38, 27 44, 30 48" fill="none" stroke="#303040" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
        <Ellipse cx="50" cy="46" rx="10" ry="7.5" fill="#707080" />
        {/* Smooth head highlight — NO tuft */}
        <Path d="M 36 18 C 42 14, 58 14, 64 18" fill="none" stroke="#585870" strokeWidth="1.2" opacity="0.3" strokeLinecap="round" />
      </G>
    ),
    ears: (
      <G>
        <Path d="M 32 28 L 16 2 L 42 20 Z" fill="#484858" />
        <Path d="M 32 24 L 21 6 L 39 20 Z" fill="#FF5252" />
        <Path d="M 31 22 L 25 10 L 37 20 Z" fill="#DD3838" opacity="0.45" />
        <Path d="M 68 28 L 84 2 L 58 20 Z" fill="#484858" />
        <Path d="M 68 24 L 79 6 L 61 20 Z" fill="#FF5252" />
        <Path d="M 69 22 L 75 10 L 63 20 Z" fill="#DD3838" opacity="0.45" />
      </G>
    ),
    eyes: (
      <G>
        {/* LEFT EYE */}
        <G>
          <Ellipse cx="40" cy="36" rx="7.5" ry="8" fill="#FFFFFF" />
          <Ellipse cx="40" cy="36.5" rx="6" ry="6.5" fill="#2ECC71" />
          <Ellipse cx="40" cy="37" rx="4" ry="4.5" fill="#22A860" />
          <Circle cx="40" cy="37" r="2.8" fill="#1A1A2E" />
          <Circle cx="40" cy="37" r="1.2" fill="#000000" />
          <Circle cx="38" cy="34.5" r="2" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="42.5" cy="35" r="1" fill="#FFFFFF" opacity="0.7" />
          <Circle cx="39" cy="39" r="0.8" fill="#FFFFFF" opacity="0.4" />
          <Path d="M 32.5 33 C 35 29, 45 29, 47.5 33" fill="none" stroke="#303040" strokeWidth="1.8" strokeLinecap="round" />
        </G>
        {/* RIGHT EYE */}
        <G>
          <Ellipse cx="60" cy="36" rx="7.5" ry="8" fill="#FFFFFF" />
          <Ellipse cx="60" cy="36.5" rx="6" ry="6.5" fill="#2ECC71" />
          <Ellipse cx="60" cy="37" rx="4" ry="4.5" fill="#22A860" />
          <Circle cx="60" cy="37" r="2.8" fill="#1A1A2E" />
          <Circle cx="60" cy="37" r="1.2" fill="#000000" />
          <Circle cx="58" cy="34.5" r="2" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="62.5" cy="35" r="1" fill="#FFFFFF" opacity="0.7" />
          <Circle cx="59" cy="39" r="0.8" fill="#FFFFFF" opacity="0.4" />
          <Path d="M 52.5 33 C 55 29, 65 29, 67.5 33" fill="none" stroke="#303040" strokeWidth="1.8" strokeLinecap="round" />
        </G>
      </G>
    ),
    faceNonEyes: (
      <G>
        <Ellipse cx="44" cy="46" rx="4" ry="3.5" fill="#707080" />
        <Ellipse cx="56" cy="46" rx="4" ry="3.5" fill="#707080" />
        {/* Red nose */}
        <Path d="M 50 44 L 48.5 46.5 L 51.5 46.5 Z" fill="#FF5252" />
        {/* Warm confident smile */}
        <Path d="M 45 48 Q 48 51, 50 51 Q 52 51, 55 48" fill="none" stroke="#303040" strokeWidth="0.9" strokeLinecap="round" />
        {/* Whisker dots */}
        <Circle cx="40" cy="46" r="0.7" fill="#D8D8E8" opacity="0.6" />
        <Circle cx="40" cy="48" r="0.7" fill="#D8D8E8" opacity="0.6" />
        <Circle cx="40" cy="50" r="0.7" fill="#D8D8E8" opacity="0.6" />
        <Circle cx="60" cy="46" r="0.7" fill="#D8D8E8" opacity="0.6" />
        <Circle cx="60" cy="48" r="0.7" fill="#D8D8E8" opacity="0.6" />
        <Circle cx="60" cy="50" r="0.7" fill="#D8D8E8" opacity="0.6" />
        {/* Whiskers — upturned */}
        <Path d="M 40 46 Q 28 43, 18 42" stroke="#D8D8E8" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 40 48 Q 28 46, 18 45" stroke="#D8D8E8" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        <Path d="M 40 50 Q 28 48, 18 47" stroke="#D8D8E8" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 60 46 Q 72 43, 82 42" stroke="#D8D8E8" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        <Path d="M 60 48 Q 72 46, 82 45" stroke="#D8D8E8" strokeWidth="1" opacity="0.65" strokeLinecap="round" />
        <Path d="M 60 50 Q 72 48, 82 47" stroke="#D8D8E8" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        {/* Red blush */}
        <Ellipse cx="30" cy="44" rx="4.5" ry="3" fill="#FF5252" opacity="0.2" />
        <Ellipse cx="70" cy="44" rx="4.5" ry="3" fill="#FF5252" opacity="0.2" />
        {/* Heart accent */}
        <G opacity="0.35">
          <Path d="M 80 16 C 79 14, 81 12, 83 14 C 85 12, 87 14, 86 16 C 85 18, 83 20, 83 20 C 83 20, 81 18, 80 16 Z" fill="#FF5252" />
        </G>
      </G>
    ),
  };
}

// ============================================================
// ANIMATION WRAPPER + DISPATCH TABLE + EXPORT
// ============================================================
function wrapWithAnimations(
  groups: CatGroups,
  animStyles?: MicroAnimatedStyles,
  extraAccessoryNames?: string[],
  accent?: string,
): ReactElement {
  const accessoryOverlay = extraAccessoryNames && extraAccessoryNames.length > 0 && accent
    ? renderAccessories(extraAccessoryNames, accent)
    : null;

  if (!animStyles) {
    return (
      <G>
        {groups.extras}
        {groups.tail}
        {groups.body}
        {groups.head}
        {groups.ears}
        {groups.eyes}
        {groups.faceNonEyes}
        {accessoryOverlay}
      </G>
    );
  }
  return (
    <G>
      {groups.extras}
      <AnimatedG style={animStyles.tailStyle}>
        {groups.tail}
      </AnimatedG>
      <AnimatedG style={animStyles.bodyStyle}>
        {groups.body}
      </AnimatedG>
      {groups.head}
      <AnimatedG style={animStyles.earStyle}>
        {groups.ears}
      </AnimatedG>
      {animStyles.faceStyle ? (
        <AnimatedG style={animStyles.faceStyle}>
          {groups.faceNonEyes}
          <AnimatedG style={animStyles.eyeStyle}>
            {groups.eyes}
          </AnimatedG>
        </AnimatedG>
      ) : (
        <G>
          {groups.faceNonEyes}
          <AnimatedG style={animStyles.eyeStyle}>
            {groups.eyes}
          </AnimatedG>
        </G>
      )}
      {accessoryOverlay}
    </G>
  );
}

const FIGMA_RENDERERS: Record<string, () => CatGroups> = {
  'mini-meowww': miniMeowwwGroups,
  'jazzy': jazzyGroups,
  'luna': lunaGroups,
  'biscuit': biscuitGroups,
  'ballymakawww': ballymakawwwGroups,
  'aria': ariaGroups,
  'tempo': tempoGroups,
  'shibu': shibuGroups,
  'bella': bellaGroups,
  'sable': sableGroups,
  'coda': codaGroups,
  'chonky-monke': chonkyMonkeGroups,
  'salsa': salsaGroups,
};

export function renderFigmaCat(
  catId: string,
  animStyles?: MicroAnimatedStyles,
  extraAccessoryNames?: string[],
  accent?: string,
): ReactElement | null {
  const getGroups = FIGMA_RENDERERS[catId];
  if (!getGroups) return null;
  return wrapWithAnimations(getGroups(), animStyles, extraAccessoryNames, accent);
}

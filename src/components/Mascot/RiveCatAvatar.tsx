/**
 * RiveCatAvatar — Rive-first avatar with SVG fallback
 *
 * Tries to render a Rive animation using the cat's state machine.
 * Falls back to SVG CatAvatar when .riv files are unavailable or Rive fails.
 *
 * Rive state machine inputs (when .riv is created):
 *   - bodyColor (color)  — maps from CatVisuals.bodyColor
 *   - eyeColor (color)   — maps from CatVisuals.eyeColor
 *   - mood (number)       — 0=idle, 1=happy, 2=excited, 3=encouraging, 4=celebrating, 5=teaching, 6=sleepy
 *   - bounce (trigger)    — fire on perfect hit
 *   - blink (trigger)     — fire periodically
 *   - nod (trigger)       — fire on good hit
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { CatAvatar } from './CatAvatar';
import type { CatAvatarSize } from './CatAvatar';
import type { EvolutionStage } from '@/stores/types';

// Mood mapping for Rive state machine number input
export const RIVE_MOOD_MAP = {
  idle: 0,
  happy: 1,
  excited: 2,
  encouraging: 3,
  celebrating: 4,
  teaching: 5,
  sleepy: 6,
} as const;

export type RiveMood = keyof typeof RIVE_MOOD_MAP;

// Try to import Rive — may not be available in all environments
let RiveComponent: any = null;
try {
  const riveModule = require('rive-react-native');
  RiveComponent = riveModule.default;
} catch {
  // rive-react-native not available — will use SVG fallback
}

const RIVE_ASSET_NAME = 'cat_avatar'; // Expected asset: cat_avatar.riv

interface RiveCatAvatarProps {
  catId: string;
  size?: CatAvatarSize;
  mood?: RiveMood;
  showGlow?: boolean;
  onPress?: () => void;
  skipEntryAnimation?: boolean;
  /** Evolution stage — passed to Rive state machine and SVG fallback. */
  evolutionStage?: EvolutionStage;
}

/**
 * Check if Rive runtime is available and the .riv asset exists.
 * This is determined once at module load.
 */
function isRiveAvailable(): boolean {
  if (!RiveComponent) return false;
  // On native platforms, Rive is available if the module loaded
  // The actual asset check happens when the component renders
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

// Evolution stage to numeric mapping for Rive state machine
const RIVE_EVOLUTION_MAP: Record<EvolutionStage, number> = {
  baby: 0,
  teen: 1,
  adult: 2,
  master: 3,
};

export function RiveCatAvatar({
  catId,
  size = 'medium',
  mood = 'idle',
  showGlow = false,
  onPress,
  skipEntryAnimation = false,
  evolutionStage,
}: RiveCatAvatarProps): ReactElement {
  const riveRef = useRef<any>(null);
  const [riveError, setRiveError] = useState(false);
  const useRive = isRiveAvailable() && !riveError;

  // Map CatAvatarSize to pixels
  const SIZE_MAP: Record<CatAvatarSize, number> = {
    small: 48,
    medium: 72,
    large: 120,
  };
  const dimension = SIZE_MAP[size];

  // Update mood on Rive state machine
  useEffect(() => {
    if (!useRive || !riveRef.current) return;
    try {
      riveRef.current.setInputState(
        'CatStateMachine',
        'mood',
        RIVE_MOOD_MAP[mood],
      );
    } catch {
      // State machine input may not exist in current .riv
    }
  }, [mood, useRive]);

  // Update evolution stage on Rive state machine
  useEffect(() => {
    if (!useRive || !riveRef.current || !evolutionStage) return;
    try {
      riveRef.current.setInputState(
        'CatStateMachine',
        'evolutionStage',
        RIVE_EVOLUTION_MAP[evolutionStage],
      );
    } catch {
      // State machine input may not exist in current .riv
    }
  }, [evolutionStage, useRive]);

  // Fire trigger animations
  const fireTrigger = useCallback(
    (trigger: 'bounce' | 'blink' | 'nod' | 'celebrate') => {
      if (!useRive || !riveRef.current) return;
      try {
        riveRef.current.fireState('CatStateMachine', trigger);
      } catch {
        // Trigger may not exist in current .riv
      }
    },
    [useRive],
  );

  // Auto-blink every 3-5 seconds
  useEffect(() => {
    if (!useRive) return;
    const interval = setInterval(
      () => fireTrigger('blink'),
      3000 + Math.random() * 2000,
    );
    return () => clearInterval(interval);
  }, [useRive, fireTrigger]);

  // Rive rendering
  if (useRive && RiveComponent) {
    return (
      <View style={[styles.container, { width: dimension, height: dimension }]}>
        <RiveComponent
          ref={riveRef}
          resourceName={RIVE_ASSET_NAME}
          stateMachineName="CatStateMachine"
          autoplay
          style={{ width: dimension, height: dimension }}
          onError={() => setRiveError(true)}
        />
      </View>
    );
  }

  // SVG fallback — use the existing CatAvatar
  return (
    <CatAvatar
      catId={catId}
      size={size}
      showGlow={showGlow}
      onPress={onPress}
      skipEntryAnimation={skipEntryAnimation}
      evolutionStage={evolutionStage}
    />
  );
}

/** Imperative handle for triggering animations from parent */
export function useRiveCatControls() {
  const ref = useRef<{
    fireTrigger: (trigger: 'bounce' | 'blink' | 'nod' | 'celebrate') => void;
  } | null>(null);

  return {
    bounce: () => ref.current?.fireTrigger('bounce'),
    blink: () => ref.current?.fireTrigger('blink'),
    nod: () => ref.current?.fireTrigger('nod'),
    celebrate: () => ref.current?.fireTrigger('celebrate'),
  };
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

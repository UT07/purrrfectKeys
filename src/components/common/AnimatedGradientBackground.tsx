/**
 * AnimatedGradientBackground — Lava lamp style shifting gradient.
 *
 * Crossfades between color palettes defined in GRADIENTS.lavaLamp.
 * Two LinearGradient layers are stacked; as one fades in the other
 * fades out, giving a smooth morphing effect.  Very low overhead
 * because only opacity is animated (no color interpolation per-frame).
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { Animated, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '../../theme/tokens';

const { palettes, duration } = GRADIENTS.lavaLamp;

// Widen readonly tuples to mutable string arrays for state
type Palette = [string, string, string];
const asPalette = (p: readonly [string, string, string]): Palette => [...p];

interface Props {
  /** Extra styles applied to the wrapper View (position, flex, etc.) */
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Override cycle speed. Default comes from token (8 000 ms). */
  cycleDuration?: number;
  /** Set false to pause the animation (e.g. when screen is not focused). */
  animate?: boolean;
  /** Forwarded to the root Animated.View */
  testID?: string;
}

export function AnimatedGradientBackground({
  style,
  children,
  cycleDuration = duration,
  animate = true,
  testID,
}: Props) {
  const paletteIndex = useRef(0);
  const opacity = useRef(new Animated.Value(1)).current;

  // Current visible palette & next palette (swap on each crossfade)
  const [layers, setLayers] = React.useState<{ front: Palette; back: Palette }>({
    front: asPalette(palettes[0]),
    back: asPalette(palettes[1 % palettes.length]),
  });

  // Per-step duration (time one palette stays before fading to next)
  const stepDuration = useMemo(
    () => cycleDuration / palettes.length,
    [cycleDuration],
  );

  useEffect(() => {
    if (!animate) return;

    let cancelled = false;

    function step() {
      if (cancelled) return;

      // Fade front layer out, revealing back layer
      Animated.timing(opacity, {
        toValue: 0,
        duration: stepDuration * 0.6, // 60% of step is the crossfade
        useNativeDriver: true,
      }).start(() => {
        if (cancelled) return;

        // Advance palette index
        paletteIndex.current = (paletteIndex.current + 1) % palettes.length;
        const nextIdx = (paletteIndex.current + 1) % palettes.length;

        // Swap: what was back is now front, prepare a new back
        setLayers(prev => ({
          front: prev.back,
          back: asPalette(palettes[nextIdx]),
        }));

        // Snap front opacity back to 1 (instant — no visible jump because
        // the new front IS the old back which was already visible)
        opacity.setValue(1);

        // Wait the remaining 40% of step, then repeat
        const holdTimer = setTimeout(step, stepDuration * 0.4);
        if (cancelled) clearTimeout(holdTimer);
      });
    }

    // Start first transition after an initial hold
    const initialTimer = setTimeout(step, stepDuration);
    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
    };
  }, [animate, opacity, stepDuration]);

  return (
    <Animated.View style={[styles.container, style]} testID={testID}>
      {/* Back layer — always visible behind front */}
      <LinearGradient
        colors={layers.back}
        style={StyleSheet.absoluteFill}
      />
      {/* Front layer — fades in/out */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>
        <LinearGradient
          colors={layers.front}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AnimatedGradientBackground;

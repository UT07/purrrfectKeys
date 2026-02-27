import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { getComboTier } from '../../theme/tokens';
import { soundManager } from '../../audio/SoundManager';
import type { SoundName } from '../../audio/SoundManager';

export interface ComboMeterProps {
  combo: number;
}

const COMBO_SOUNDS: Record<string, SoundName> = {
  GOOD: 'combo_5',
  FIRE: 'combo_10',
  SUPER: 'combo_10',
  LEGENDARY: 'combo_20',
};

export function ComboMeter({ combo }: ComboMeterProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevTierRef = useRef('NORMAL');
  const tier = getComboTier(combo);

  // Animate + play sound on tier change
  useEffect(() => {
    if (tier.name !== prevTierRef.current && tier.name !== 'NORMAL') {
      const sound = COMBO_SOUNDS[tier.name];
      if (sound) soundManager.play(sound);

      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.3,
          useNativeDriver: true,
          speed: 20,
          bounciness: 15,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
      ]).start();
    }
    prevTierRef.current = tier.name;
  }, [tier.name, scale]);

  // Small pulse on every combo increment
  useEffect(() => {
    if (combo >= 3) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 10,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 15,
          bounciness: 8,
        }),
      ]).start();
    }
  }, [combo, scale]);

  if (combo < 3) return null;

  return (
    <View testID="combo-meter" style={styles.container}>
      <Animated.View
        style={[
          styles.badge,
          { backgroundColor: tier.color, transform: [{ scale }] },
        ]}
      >
        <Text style={styles.count}>{combo}x</Text>
      </Animated.View>
      {tier.label ? (
        <Text style={[styles.label, { color: tier.color }]}>{tier.label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 48,
    alignItems: 'center',
  },
  count: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

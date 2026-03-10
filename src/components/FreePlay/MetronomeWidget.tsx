/**
 * MetronomeWidget — BPM control with tap tempo for free play.
 *
 * Features:
 * - Adjustable BPM (40–200) via increment/decrement buttons
 * - Tap tempo button (averages last 4 taps)
 * - Time signature selector (4/4, 3/4, 6/8)
 * - Visual pulse on beat
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PressableScale } from '../common/PressableScale';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, glowColor } from '../../theme/tokens';

const MIN_BPM = 40;
const MAX_BPM = 200;
const TIME_SIGNATURES = ['4/4', '3/4', '6/8'] as const;
type TimeSig = typeof TIME_SIGNATURES[number];

interface MetronomeWidgetProps {
  onBpmChange?: (bpm: number) => void;
  onToggle?: (isPlaying: boolean) => void;
  /** Called on every beat tick — (beat, beatsPerMeasure). Use to trigger audio. */
  onTick?: (beat: number, beatsPerMeasure: number) => void;
  testID?: string;
}

export function MetronomeWidget({
  onBpmChange,
  onToggle,
  onTick,
  testID,
}: MetronomeWidgetProps): React.ReactElement {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSig, setTimeSig] = useState<TimeSig>('4/4');
  const [currentBeat, setCurrentBeat] = useState(0);
  const tapTimesRef = useRef<number[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseScale = useSharedValue(1);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const beatsPerMeasure = timeSig === '6/8' ? 6 : parseInt(timeSig[0], 10);

  // Start/stop metronome interval
  useEffect(() => {
    if (isPlaying) {
      const ms = 60000 / bpm;
      setCurrentBeat(0);
      // Fire first tick immediately
      onTickRef.current?.(0, beatsPerMeasure);
      intervalRef.current = setInterval(() => {
        setCurrentBeat((prev) => {
          const next = (prev + 1) % beatsPerMeasure;
          onTickRef.current?.(next, beatsPerMeasure);
          return next;
        });
        pulseScale.value = withSequence(
          withTiming(1.3, { duration: 50 }),
          withTiming(1, { duration: ms * 0.6 }),
        );
      }, ms);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setCurrentBeat(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, bpm, beatsPerMeasure, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const adjustBpm = useCallback(
    (delta: number) => {
      setBpm((prev) => {
        const next = Math.max(MIN_BPM, Math.min(MAX_BPM, prev + delta));
        onBpmChange?.(next);
        return next;
      });
    },
    [onBpmChange],
  );

  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    const taps = tapTimesRef.current;
    taps.push(now);
    // Keep last 5 taps
    if (taps.length > 5) taps.shift();
    if (taps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const detected = Math.round(60000 / avg);
      const clamped = Math.max(MIN_BPM, Math.min(MAX_BPM, detected));
      setBpm(clamped);
      onBpmChange?.(clamped);
    }
  }, [onBpmChange]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  }, [onToggle]);

  const cycleTimeSig = useCallback(() => {
    setTimeSig((prev) => {
      const idx = TIME_SIGNATURES.indexOf(prev);
      return TIME_SIGNATURES[(idx + 1) % TIME_SIGNATURES.length];
    });
  }, []);

  return (
    <View style={styles.container} testID={testID}>
      {/* BPM display with pulse */}
      <View style={styles.bpmRow}>
        <PressableScale onPress={() => adjustBpm(-5)} scaleDown={0.9} soundOnPress={false}>
          <View style={styles.adjustBtn}>
            <MaterialCommunityIcons name="minus" size={14} color={COLORS.textPrimary} />
          </View>
        </PressableScale>

        <Animated.View style={[styles.bpmDisplay, pulseStyle]}>
          <Text style={styles.bpmValue}>{bpm}</Text>
          <Text style={styles.bpmLabel}>BPM</Text>
        </Animated.View>

        <PressableScale onPress={() => adjustBpm(5)} scaleDown={0.9} soundOnPress={false}>
          <View style={styles.adjustBtn}>
            <MaterialCommunityIcons name="plus" size={14} color={COLORS.textPrimary} />
          </View>
        </PressableScale>
      </View>

      {/* Beat dots */}
      <View style={styles.beatDots}>
        {Array.from({ length: beatsPerMeasure }, (_, i) => (
          <View
            key={i}
            style={[
              styles.beatDot,
              i === currentBeat && isPlaying && styles.beatDotActive,
              i === 0 && isPlaying && i === currentBeat && styles.beatDotDownbeat,
            ]}
          />
        ))}
      </View>

      {/* Controls row */}
      <View style={styles.controlsRow}>
        <PressableScale onPress={togglePlay} scaleDown={0.9} soundOnPress={false}>
          <View style={[styles.playBtn, isPlaying && styles.playBtnActive]}>
            <MaterialCommunityIcons
              name={isPlaying ? 'stop' : 'play'}
              size={16}
              color={COLORS.textPrimary}
            />
          </View>
        </PressableScale>

        <PressableScale onPress={handleTapTempo} scaleDown={0.9} soundOnPress={false}>
          <View style={styles.tapBtn}>
            <Text style={styles.tapText}>TAP</Text>
          </View>
        </PressableScale>

        <PressableScale onPress={cycleTimeSig} scaleDown={0.9} soundOnPress={false}>
          <View style={styles.timeSigBtn}>
            <Text style={styles.timeSigText}>{timeSig}</Text>
          </View>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  adjustBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmDisplay: {
    alignItems: 'center',
    minWidth: 60,
  },
  bpmValue: {
    ...TYPOGRAPHY.heading.lg,
    fontWeight: '900',
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
  },
  bpmLabel: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
    marginTop: -2,
  },
  beatDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  beatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.cardBorder,
  },
  beatDotActive: {
    backgroundColor: COLORS.primary,
  },
  beatDotDownbeat: {
    backgroundColor: COLORS.starGold,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  playBtn: {
    width: 32,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnActive: {
    backgroundColor: glowColor(COLORS.primary, 0.2),
    borderColor: COLORS.primary,
  },
  tapBtn: {
    height: 28,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapText: {
    ...TYPOGRAPHY.caption.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  timeSigBtn: {
    height: 28,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSigText: {
    ...TYPOGRAPHY.caption.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
});

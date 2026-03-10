/**
 * TempoTrainerWidget — Progressive BPM trainer for free play.
 *
 * Set a start BPM and target BPM, then gradually speeds up after each loop.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PressableScale } from '../common/PressableScale';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, glowColor } from '../../theme/tokens';

interface TempoTrainerWidgetProps {
  onBpmChange?: (bpm: number) => void;
  testID?: string;
}

export function TempoTrainerWidget({
  onBpmChange,
  testID,
}: TempoTrainerWidgetProps): React.ReactElement {
  const [startBpm, setStartBpm] = useState(60);
  const [targetBpm, setTargetBpm] = useState(120);
  const [currentBpm, setCurrentBpm] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const increment = 5;

  const handleStart = useCallback(() => {
    setCurrentBpm(startBpm);
    setIsRunning(true);
    onBpmChange?.(startBpm);
  }, [startBpm, onBpmChange]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleStep = useCallback(() => {
    setCurrentBpm((prev) => {
      const next = Math.min(prev + increment, targetBpm);
      onBpmChange?.(next);
      if (next >= targetBpm) setIsRunning(false);
      return next;
    });
  }, [targetBpm, onBpmChange]);

  const adjust = useCallback(
    (field: 'start' | 'target', delta: number) => {
      if (field === 'start') {
        setStartBpm((prev) => Math.max(40, Math.min(200, prev + delta)));
      } else {
        setTargetBpm((prev) => Math.max(40, Math.min(200, prev + delta)));
      }
    },
    [],
  );

  const progress = targetBpm > startBpm
    ? ((currentBpm - startBpm) / (targetBpm - startBpm)) * 100
    : 100;

  return (
    <View style={styles.container} testID={testID}>
      {/* Start BPM */}
      <View style={styles.bpmRow}>
        <Text style={styles.label}>Start</Text>
        <PressableScale onPress={() => adjust('start', -5)} scaleDown={0.9} soundOnPress={false}>
          <View style={styles.adjBtn}>
            <Text style={styles.adjText}>-</Text>
          </View>
        </PressableScale>
        <Text style={styles.bpmValue}>{startBpm}</Text>
        <PressableScale onPress={() => adjust('start', 5)} scaleDown={0.9} soundOnPress={false}>
          <View style={styles.adjBtn}>
            <Text style={styles.adjText}>+</Text>
          </View>
        </PressableScale>
      </View>

      {/* Target BPM */}
      <View style={styles.bpmRow}>
        <Text style={styles.label}>Target</Text>
        <PressableScale onPress={() => adjust('target', -5)} scaleDown={0.9} soundOnPress={false}>
          <View style={styles.adjBtn}>
            <Text style={styles.adjText}>-</Text>
          </View>
        </PressableScale>
        <Text style={styles.bpmValue}>{targetBpm}</Text>
        <PressableScale onPress={() => adjust('target', 5)} scaleDown={0.9} soundOnPress={false}>
          <View style={styles.adjBtn}>
            <Text style={styles.adjText}>+</Text>
          </View>
        </PressableScale>
      </View>

      {/* Progress bar */}
      {isRunning && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          <Text style={styles.currentBpmText}>{currentBpm} BPM</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controlsRow}>
        <PressableScale
          onPress={isRunning ? handleStop : handleStart}
          scaleDown={0.9}
          soundOnPress={false}
        >
          <View style={[styles.playBtn, isRunning && styles.playBtnActive]}>
            <MaterialCommunityIcons
              name={isRunning ? 'stop' : 'play'}
              size={14}
              color={COLORS.textPrimary}
            />
          </View>
        </PressableScale>

        {isRunning && (
          <PressableScale onPress={handleStep} scaleDown={0.9} soundOnPress={false}>
            <View style={styles.stepBtn}>
              <MaterialCommunityIcons name="skip-next" size={14} color={COLORS.textPrimary} />
              <Text style={styles.stepText}>+{increment}</Text>
            </View>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
    fontWeight: '600',
    width: 36,
  },
  adjBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjText: {
    ...TYPOGRAPHY.caption.md,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  bpmValue: {
    ...TYPOGRAPHY.body.sm,
    fontWeight: '800',
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    minWidth: 32,
    textAlign: 'center',
  },
  progressBar: {
    height: 18,
    backgroundColor: COLORS.cardSurface,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: glowColor(COLORS.primary, 0.3),
    borderRadius: BORDER_RADIUS.sm,
  },
  currentBpmText: {
    ...TYPOGRAPHY.caption.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
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
  stepBtn: {
    height: 28,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.cardSurface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  stepText: {
    ...TYPOGRAPHY.caption.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});

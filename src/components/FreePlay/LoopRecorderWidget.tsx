/**
 * LoopRecorderWidget — Record, overdub, and playback loops in free play.
 *
 * Provides record/stop/play/clear controls for the parent's recording state.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PressableScale } from '../common/PressableScale';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, glowColor } from '../../theme/tokens';

interface LoopRecorderWidgetProps {
  isRecording: boolean;
  isPlaying: boolean;
  hasRecording: boolean;
  noteCount: number;
  onRecord: () => void;
  onStop: () => void;
  onPlay: () => void;
  onStopPlayback: () => void;
  onClear: () => void;
  testID?: string;
}

export function LoopRecorderWidget({
  isRecording,
  isPlaying,
  hasRecording,
  noteCount,
  onRecord,
  onStop,
  onPlay,
  onStopPlayback,
  onClear,
  testID,
}: LoopRecorderWidgetProps): React.ReactElement {
  return (
    <View style={styles.container} testID={testID}>
      {/* Status */}
      <View style={styles.statusRow}>
        {isRecording && (
          <View style={styles.recordingBadge}>
            <View style={styles.recordDot} />
            <Text style={styles.recordingText}>REC</Text>
          </View>
        )}
        {isPlaying && (
          <View style={styles.playingBadge}>
            <MaterialCommunityIcons name="play" size={10} color={COLORS.success} />
            <Text style={styles.playingText}>PLAYING</Text>
          </View>
        )}
        {!isRecording && !isPlaying && hasRecording && (
          <Text style={styles.noteCountText}>{noteCount} notes recorded</Text>
        )}
        {!isRecording && !isPlaying && !hasRecording && (
          <Text style={styles.emptyText}>Tap record to start</Text>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        {/* Record / Stop Recording */}
        <PressableScale
          onPress={isRecording ? onStop : onRecord}
          scaleDown={0.9}
          soundOnPress={false}
        >
          <View style={[styles.btn, isRecording ? styles.btnStop : styles.btnRecord]}>
            <MaterialCommunityIcons
              name={isRecording ? 'stop' : 'record-circle'}
              size={16}
              color={COLORS.textPrimary}
            />
          </View>
        </PressableScale>

        {/* Play / Stop Playback */}
        {hasRecording && !isRecording && (
          <PressableScale
            onPress={isPlaying ? onStopPlayback : onPlay}
            scaleDown={0.9}
            soundOnPress={false}
          >
            <View style={[styles.btn, styles.btnPlay]}>
              <MaterialCommunityIcons
                name={isPlaying ? 'stop' : 'play'}
                size={16}
                color={COLORS.textPrimary}
              />
            </View>
          </PressableScale>
        )}

        {/* Clear */}
        {hasRecording && !isRecording && !isPlaying && (
          <PressableScale onPress={onClear} scaleDown={0.9} soundOnPress={false}>
            <View style={[styles.btn, styles.btnClear]}>
              <MaterialCommunityIcons name="trash-can-outline" size={14} color={COLORS.textMuted} />
            </View>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.error,
  },
  recordingText: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.error,
    fontWeight: '800',
  },
  playingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  playingText: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.success,
    fontWeight: '700',
  },
  noteCountText: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textSecondary,
  },
  emptyText: {
    ...TYPOGRAPHY.caption.sm,
    color: COLORS.textMuted,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  btn: {
    width: 32,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnRecord: {
    backgroundColor: glowColor(COLORS.error, 0.15),
    borderColor: COLORS.error,
  },
  btnStop: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  btnPlay: {
    backgroundColor: glowColor(COLORS.success, 0.15),
    borderColor: COLORS.success,
  },
  btnClear: {
    backgroundColor: COLORS.cardSurface,
    borderColor: COLORS.cardBorder,
  },
});

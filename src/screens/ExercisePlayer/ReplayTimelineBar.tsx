import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { PressableScale } from '../../components/common/PressableScale';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../theme/tokens';
import type {
  ReplayScheduleEntry,
  PausePoint,
} from '../../core/exercises/replayTypes';

// ---------------------------------------------------------------------------
// Color map
// ---------------------------------------------------------------------------

const COLOR_MAP: Record<string, string> = {
  green: '#4CAF50',
  yellow: '#FFC107',
  red: '#FF5252',
  grey: '#666666',
  purple: '#9C27B0',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReplayTimelineBarProps {
  /** All note entries with their colors */
  entries: ReplayScheduleEntry[];
  /** Pause points to show as diamond markers */
  pausePoints: PausePoint[];
  /** Total beats in the exercise */
  totalBeats: number;
  /** Current playback position in beats */
  currentBeat: number;
  /** Elapsed time string (e.g., "0:04") */
  elapsedTime: string;
  /** Total time string (e.g., "0:32") */
  totalTime: string;
  /** Called when user scrubs to a beat position */
  onSeek: (beat: number) => void;
  /** Whether playback is currently paused */
  isPaused: boolean;
  /** Called when play/pause is toggled */
  onTogglePlayPause: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRACK_HEIGHT = 4;
const PLAYHEAD_SIZE = 12;
const DOT_SIZE = 6;
const DIAMOND_SIZE = 8;
const TRACK_HORIZONTAL_PADDING = SPACING.sm;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReplayTimelineBar({
  entries,
  pausePoints,
  totalBeats,
  currentBeat,
  elapsedTime,
  totalTime,
  onSeek,
  isPaused,
  onTogglePlayPause,
}: ReplayTimelineBarProps): React.JSX.Element {
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);

  // ---- helpers ----

  const beatToX = useCallback(
    (beat: number, width: number): number => {
      if (totalBeats <= 0 || width <= 0) return 0;
      return (beat / totalBeats) * width;
    },
    [totalBeats],
  );

  const xToBeat = useCallback(
    (x: number, width: number): number => {
      if (totalBeats <= 0 || width <= 0) return 0;
      const clamped = Math.max(0, Math.min(x, width));
      return (clamped / width) * totalBeats;
    },
    [totalBeats],
  );

  // ---- layout ----

  const handleTrackLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWidthRef.current = w;
    setTrackWidth(w);
  }, []);

  // ---- pan responder for scrubbing ----

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        onSeek(xToBeat(x, trackWidthRef.current));
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        onSeek(xToBeat(x, trackWidthRef.current));
      },
    }),
  ).current;

  // ---- derived values ----

  const playheadLeft = beatToX(currentBeat, trackWidth);
  const progressFraction =
    totalBeats > 0 ? Math.min(currentBeat / totalBeats, 1) : 0;

  // ---- render ----

  return (
    <View style={styles.container}>
      {/* Row 1: play/pause button + track */}
      <View style={styles.topRow}>
        <PressableScale
          testID="play-pause-btn"
          onPress={onTogglePlayPause}
          style={styles.playPauseBtn}
          soundOnPress={false}
        >
          <Text style={styles.playPauseText}>{isPaused ? '▶' : '⏸'}</Text>
        </PressableScale>

        <View
          style={styles.trackContainer}
          onLayout={handleTrackLayout}
          {...panResponder.panHandlers}
        >
          {/* Track background */}
          <View style={styles.trackBg} />

          {/* Track filled portion */}
          <View
            style={[
              styles.trackFill,
              { width: `${progressFraction * 100}%` },
            ]}
          />

          {/* Playhead */}
          <View
            style={[
              styles.playhead,
              {
                left: playheadLeft - PLAYHEAD_SIZE / 2,
              },
            ]}
          />
        </View>
      </View>

      {/* Row 2: colored note dots */}
      <View style={styles.dotsRow}>
        {/* Spacer matching play/pause button width */}
        <View style={styles.playPauseSpacer} />

        <View style={styles.dotsContainer}>
          {entries.map((entry, idx) => {
            const x = beatToX(entry.note.startBeat, trackWidth);
            return (
              <View
                key={`dot-${idx}`}
                testID="note-dot"
                style={[
                  styles.dot,
                  {
                    left: x - DOT_SIZE / 2,
                    backgroundColor: COLOR_MAP[entry.color] ?? COLOR_MAP.grey,
                  },
                ]}
              />
            );
          })}

          {/* Row 3 (overlaid): diamond pause markers */}
          {pausePoints.map((pp, idx) => {
            const x = beatToX(pp.beatPosition, trackWidth);
            return (
              <View
                key={`diamond-${idx}`}
                testID="pause-diamond"
                style={[
                  styles.diamond,
                  {
                    left: x - DIAMOND_SIZE / 2,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Row 3: time labels */}
      <View style={styles.timeRow}>
        {/* Spacer matching play/pause button width */}
        <View style={styles.playPauseSpacer} />

        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{elapsedTime}</Text>
          <Text style={styles.timeText}>{totalTime}</Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const PLAY_PAUSE_WIDTH = 36;

const styles = StyleSheet.create({
  container: {
    height: 56,
    backgroundColor: '#0D0D1A',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    justifyContent: 'center',
  },

  // ---- top row (play + track) ----
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playPauseBtn: {
    width: PLAY_PAUSE_WIDTH,
    height: PLAY_PAUSE_WIDTH,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  playPauseText: {
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.body.md,
  },
  trackContainer: {
    flex: 1,
    height: PLAYHEAD_SIZE + 4,
    justifyContent: 'center',
    paddingHorizontal: TRACK_HORIZONTAL_PADDING,
  },
  trackBg: {
    position: 'absolute',
    left: TRACK_HORIZONTAL_PADDING,
    right: TRACK_HORIZONTAL_PADDING,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: COLORS.textMuted,
    opacity: 0.3,
  },
  trackFill: {
    position: 'absolute',
    left: TRACK_HORIZONTAL_PADDING,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: COLORS.textPrimary,
    opacity: 0.6,
  },
  playhead: {
    position: 'absolute',
    width: PLAYHEAD_SIZE,
    height: PLAYHEAD_SIZE,
    borderRadius: PLAYHEAD_SIZE / 2,
    backgroundColor: COLORS.textPrimary,
  },

  // ---- dots row ----
  dotsRow: {
    flexDirection: 'row',
    height: DOT_SIZE + 2,
    marginTop: 1,
  },
  playPauseSpacer: {
    width: PLAY_PAUSE_WIDTH + SPACING.sm, // button + margin
  },
  dotsContainer: {
    flex: 1,
    position: 'relative',
    paddingHorizontal: TRACK_HORIZONTAL_PADDING,
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    top: 0,
  },
  diamond: {
    position: 'absolute',
    width: DIAMOND_SIZE,
    height: DIAMOND_SIZE,
    backgroundColor: '#FF5252',
    top: DOT_SIZE + 2,
    transform: [{ rotate: '45deg' }],
  },

  // ---- time row ----
  timeRow: {
    flexDirection: 'row',
    marginTop: 1,
  },
  timeContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: TRACK_HORIZONTAL_PADDING,
  },
  timeText: {
    color: COLORS.textMuted,
    ...TYPOGRAPHY.caption.sm,
  },
});

export default ReplayTimelineBar;

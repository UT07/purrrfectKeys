/**
 * PianoKey Component
 * Renders a single piano key as a purely visual element.
 * Touch handling is managed by the parent Keyboard's multi-touch responder.
 * Performance: Optimized for <16ms visual feedback via isPressed prop
 */

import React, { useMemo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS, glowColor } from '../../theme/tokens';

// ─────────────────────────────────────────────────
// Piano-specific colors — semantic constants for key visuals
// that have no direct design-token equivalent.
// ─────────────────────────────────────────────────
const PIANO_COLORS = {
  // White key
  whiteKeyFace: '#F8F8F8',
  whiteKeyBorder: '#C8C8C8',
  whiteKeyBottomEdge: '#A0A0A0',
  whiteKeyTopHighlight: '#FFFFFF',
  whiteKeyLeftEdge: '#E8E8E8',
  whiteKeyRightEdge: '#D0D0D0',
  whiteKeyPressedBottomEdge: '#C0C0C0',
  whiteKeyLabelText: '#333333',

  // Black key
  blackKeyFace: '#1A1A1A',
  blackKeyBorder: '#000000',
  blackKeyBottomEdge: '#383838',
  blackKeyTopHighlight: '#3A3A3A',

  // Highlighted white key (success green)
  highlightSuccessLight: '#81C784',

  // Highlighted black key (goldenrod family)
  highlightGoldDark: '#8B6914',
  highlightGoldenrod: '#DAA520',
  highlightGoldShadow: '#B8860B',
  highlightGoldLight: '#F0C040',

  // Expected black key (dark blue tint)
  expectedBlackBg: '#1A2A3A',

  // Scale note overlay (purple accent)
  scaleNotePurple: 'rgba(156, 136, 255, 0.15)',
  scaleNotePurpleBorder: 'rgba(156, 136, 255, 0.4)',
  scaleNotePurpleBorderLight: 'rgba(156, 136, 255, 0.2)',
  scaleNotePurpleBorderStrong: 'rgba(156, 136, 255, 0.5)',
  scaleNotePurpleBorderMid: 'rgba(156, 136, 255, 0.3)',
  scaleNoteBlackBg: '#2A1A3A',

  // Pressed black key (purple neon accent)
  pressedBlackBg: '#2A2A4A',
  pressedBlackBottomEdge: '#4A4A6A',
  pressedBlackTopEdge: '#2A2A3A',
  pressedBlackNeon: '#E040FB',
} as const;

export interface PianoKeyProps {
  midiNote: number;
  isBlackKey: boolean;
  label?: string;
  isHighlighted?: boolean;
  isExpected?: boolean;
  isPressed?: boolean;
  /** Scale overlay: key is part of the selected scale */
  isScaleNote?: boolean;
  showLabels?: boolean;
  /** Replay mode highlight color (hex string, overrides default highlight color) */
  replayColor?: string;
}

/**
 * Map MIDI note to visual position
 * Middle C = 60, displayed at visual position based on octave
 */
function getNoteLabel(midiNote: number, showLabels: boolean): string {
  if (!showLabels) return '';
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = noteNames[midiNote % 12];
  const octave = Math.floor(midiNote / 12) - 1;
  return `${noteName}${octave}`;
}

function isBlackKeyNote(midiNote: number): boolean {
  const noteInOctave = midiNote % 12;
  return [1, 3, 6, 8, 10].includes(noteInOctave);
}

/**
 * PianoKey - A single piano key component (visual only)
 * Touch input is handled at the Keyboard container level for multi-touch support.
 */
export const PianoKey = React.memo(
  ({
    midiNote,
    isBlackKey: isBlackKeyProp,
    isHighlighted = false,
    isExpected = false,
    isPressed = false,
    isScaleNote = false,
    showLabels = false,
    replayColor,
  }: PianoKeyProps) => {
    const isBlackKey = useMemo(
      () => isBlackKeyProp || isBlackKeyNote(midiNote),
      [isBlackKeyProp, midiNote]
    );

    // Shared values for key press animation
    const scale = useSharedValue(1);
    const yOffset = useSharedValue(0);

    // Drive animation from isPressed prop
    useEffect(() => {
      if (isPressed) {
        scale.value = withSpring(0.95, { damping: 8, mass: 1, overshootClamping: false });
        yOffset.value = withSpring(isBlackKey ? -2 : -3, { damping: 8, mass: 1 });
      } else {
        scale.value = withSpring(1, { damping: 8, mass: 1 });
        yOffset.value = withSpring(0, { damping: 8, mass: 1 });
      }
    }, [isPressed, isBlackKey, scale, yOffset]);

    // Animated style for key depression
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: scale.value },
        { translateY: yOffset.value },
      ],
    }));

    const noteLabel = getNoteLabel(midiNote, showLabels);

    if (isBlackKey) {
      return (
        <Animated.View
          style={[
            styles.blackKeyContainer,
            animatedStyle,
          ]}
        >
          <Animated.View
            style={[
              styles.blackKey,
              isScaleNote && styles.scaleNoteBlackKey,
              isExpected && styles.expectedBlackKey,
              isHighlighted && styles.highlightedBlackKey,
              isPressed && styles.pressedBlackKey,
              replayColor != null && { backgroundColor: replayColor },
            ]}
          >
            {showLabels && (
              <Animated.Text style={styles.blackKeyLabel}>
                {noteLabel}
              </Animated.Text>
            )}
          </Animated.View>
        </Animated.View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.whiteKeyContainer,
          animatedStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.whiteKey,
            isScaleNote && styles.scaleNoteWhiteKey,
            isExpected && styles.expectedWhiteKey,
            isHighlighted && styles.highlightedWhiteKey,
            isPressed && styles.pressedWhiteKey,
            replayColor != null && { backgroundColor: replayColor },
          ]}
        >
          {showLabels && (
            <Animated.Text style={styles.whiteKeyLabel}>
              {noteLabel}
            </Animated.Text>
          )}
        </Animated.View>
      </Animated.View>
    );
  }
);

PianoKey.displayName = 'PianoKey';

const styles = StyleSheet.create({
  whiteKeyContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  whiteKey: {
    flex: 1,
    backgroundColor: PIANO_COLORS.whiteKeyFace,
    borderWidth: 1,
    borderColor: PIANO_COLORS.whiteKeyBorder,
    borderBottomWidth: 4,
    borderBottomColor: PIANO_COLORS.whiteKeyBottomEdge,
    borderTopWidth: 1,
    borderTopColor: PIANO_COLORS.whiteKeyTopHighlight,
    borderLeftColor: PIANO_COLORS.whiteKeyLeftEdge,
    borderRightColor: PIANO_COLORS.whiteKeyRightEdge,
    borderRadius: 5,
    shadowColor: PIANO_COLORS.blackKeyBorder,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 4,
  },
  whiteKeyLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: PIANO_COLORS.whiteKeyLabelText,
    marginBottom: 2,
  },
  highlightedWhiteKey: {
    backgroundColor: glowColor(COLORS.success, 0.3),
    borderColor: COLORS.success,
    borderBottomColor: GRADIENTS.success[1],
    borderTopColor: PIANO_COLORS.highlightSuccessLight,
    shadowColor: COLORS.success,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  expectedWhiteKey: {
    backgroundColor: glowColor(COLORS.feedbackEarly, 0.08),
    borderColor: COLORS.feedbackEarly,
    borderWidth: 2,
    shadowColor: COLORS.feedbackEarly,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },
  scaleNoteWhiteKey: {
    backgroundColor: PIANO_COLORS.scaleNotePurple,
    borderColor: PIANO_COLORS.scaleNotePurpleBorder,
    borderTopColor: PIANO_COLORS.scaleNotePurpleBorderLight,
  },
  pressedWhiteKey: {
    backgroundColor: glowColor(COLORS.feedbackEarly, 0.2),
    borderBottomWidth: 1,
    borderBottomColor: PIANO_COLORS.whiteKeyPressedBottomEdge,
    borderTopColor: PIANO_COLORS.whiteKeyLeftEdge,
    borderColor: COLORS.feedbackEarly,
    shadowColor: COLORS.feedbackEarly,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 6,
  },
  blackKeyContainer: {
    position: 'absolute',
    zIndex: 10,
    width: '60%',
    height: '65%',
    right: '-30%',
    justifyContent: 'flex-end',
  },
  blackKey: {
    flex: 1,
    backgroundColor: PIANO_COLORS.blackKeyFace,
    borderWidth: 1,
    borderColor: PIANO_COLORS.blackKeyBorder,
    borderBottomWidth: 4,
    borderBottomColor: PIANO_COLORS.blackKeyBottomEdge,
    borderTopWidth: 1,
    borderTopColor: PIANO_COLORS.blackKeyTopHighlight,
    borderLeftColor: COLORS.background,
    borderRightColor: COLORS.background,
    borderRadius: 4,
    shadowColor: PIANO_COLORS.blackKeyBorder,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 7,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 3,
  },
  blackKeyLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  highlightedBlackKey: {
    backgroundColor: PIANO_COLORS.highlightGoldDark,
    borderColor: PIANO_COLORS.highlightGoldenrod,
    borderBottomColor: PIANO_COLORS.highlightGoldShadow,
    borderTopColor: PIANO_COLORS.highlightGoldLight,
    shadowColor: PIANO_COLORS.highlightGoldenrod,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 9,
  },
  expectedBlackKey: {
    backgroundColor: PIANO_COLORS.expectedBlackBg,
    borderColor: COLORS.feedbackEarly,
    borderWidth: 2,
    shadowColor: COLORS.feedbackEarly,
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },
  scaleNoteBlackKey: {
    backgroundColor: PIANO_COLORS.scaleNoteBlackBg,
    borderColor: PIANO_COLORS.scaleNotePurpleBorderStrong,
    borderTopColor: PIANO_COLORS.scaleNotePurpleBorderMid,
  },
  pressedBlackKey: {
    backgroundColor: PIANO_COLORS.pressedBlackBg,
    borderBottomWidth: 1,
    borderBottomColor: PIANO_COLORS.pressedBlackBottomEdge,
    borderTopColor: PIANO_COLORS.pressedBlackTopEdge,
    borderColor: PIANO_COLORS.pressedBlackNeon,
    shadowColor: PIANO_COLORS.pressedBlackNeon,
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 8,
  },
});

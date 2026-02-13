/**
 * Interactive piano keyboard component
 * Renders 2-4 octaves of keys with touch/MIDI input handling
 * Performance target: <16ms touch-to-visual feedback
 *
 * Auto-scroll: when a focusNote is provided, the keyboard automatically
 * scrolls to center that note in view, so the user doesn't have to
 * manually swipe during exercises.
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { PianoKey } from './PianoKey';
import type { MidiNoteEvent } from '@/core/exercises/types';

export interface KeyboardProps {
  startNote?: number; // Default: C3 (48)
  octaveCount?: number; // Default: 2 (min: 1, max: 4)
  onNoteOn?: (note: MidiNoteEvent) => void;
  onNoteOff?: (midiNote: number) => void;
  highlightedNotes?: Set<number>;
  expectedNotes?: Set<number>;
  enabled?: boolean;
  hapticEnabled?: boolean;
  showLabels?: boolean;
  scrollable?: boolean;
  keyHeight?: number;
  focusNote?: number; // MIDI note to auto-center on (for auto-scroll)
  testID?: string;
}

/**
 * Keyboard Component
 * Full piano keyboard with 2-4 octaves, multi-touch support
 */
export const Keyboard = React.memo(
  ({
    startNote = 48, // C3
    octaveCount = 2,
    onNoteOn,
    onNoteOff,
    highlightedNotes = new Set(),
    expectedNotes = new Set(),
    enabled = true,
    hapticEnabled = false,
    showLabels = false,
    scrollable = true,
    keyHeight = 80,
    focusNote,
    testID,
  }: KeyboardProps) => {
    // Validate octave count
    const validOctaveCount = Math.max(1, Math.min(4, octaveCount));
    const endNote = startNote + validOctaveCount * 12 - 1;

    const scrollViewRef = useRef<ScrollView>(null);

    // Generate notes for the keyboard
    const notes = useMemo(() => {
      const noteArray: number[] = [];
      for (let i = startNote; i <= endNote; i++) {
        noteArray.push(i);
      }
      return noteArray;
    }, [startNote, endNote]);

    // Separate white and black keys for layout
    const whiteKeys = useMemo(() => {
      return notes.filter((note) => {
        const noteInOctave = note % 12;
        return ![1, 3, 6, 8, 10].includes(noteInOctave);
      });
    }, [notes]);

    const whiteKeyWidth = keyHeight * 0.7;
    const keyboardWidth = whiteKeys.length * whiteKeyWidth;

    // Auto-scroll to center the focusNote when it changes
    useEffect(() => {
      if (!scrollable || !focusNote || !scrollViewRef.current) return;
      if (focusNote < startNote || focusNote > endNote) return;

      // Find the white key index for this note (or the nearest white key)
      const targetNote = [1, 3, 6, 8, 10].includes(focusNote % 12)
        ? focusNote - 1 // Black key → use the white key just below
        : focusNote;
      const whiteKeyIndex = whiteKeys.indexOf(targetNote);
      if (whiteKeyIndex < 0) return;

      // Calculate the scroll offset to center this key
      const { width: screenWidth } = Dimensions.get('window');
      const targetX = whiteKeyIndex * whiteKeyWidth - screenWidth / 2 + whiteKeyWidth / 2;
      const clampedX = Math.max(0, Math.min(targetX, keyboardWidth - screenWidth));

      scrollViewRef.current.scrollTo({ x: clampedX, animated: true });
    }, [focusNote, scrollable, startNote, endNote, whiteKeys, whiteKeyWidth, keyboardWidth]);

    const handleNoteOn = useCallback(
      (midiNote: number, velocity: number = 80) => {
        if (!enabled || !onNoteOn) return;

        const noteEvent: MidiNoteEvent = {
          type: 'noteOn',
          note: midiNote,
          velocity,
          timestamp: Date.now(),
          channel: 0,
        };
        onNoteOn(noteEvent);
      },
      [enabled, onNoteOn]
    );

    const handleNoteOff = useCallback(
      (midiNote: number) => {
        if (!enabled || !onNoteOff) return;
        onNoteOff(midiNote);
      },
      [enabled, onNoteOff]
    );

    const handleScroll = useCallback(
      (_event: NativeSyntheticEvent<NativeScrollEvent>) => {
        // Scroll event for potential future optimization
        // e.g., virtualization of off-screen keys
      },
      []
    );

    const KeyboardContent = (
      <View
        style={[
          styles.keyboard,
          {
            height: keyHeight,
            width: scrollable ? keyboardWidth : '100%',
          },
        ]}
        testID={testID && `${testID}-keyboard`}
      >
        {/* White keys as base layout */}
        {whiteKeys.map((note) => (
          <View
            key={`white-${note}`}
            style={[
              styles.whiteKeyContainer,
              {
                height: keyHeight,
              },
            ]}
          >
            <PianoKey
              midiNote={note}
              isBlackKey={false}
              isHighlighted={highlightedNotes.has(note)}
              isExpected={expectedNotes.has(note)}
              onKeyDown={handleNoteOn}
              onKeyUp={handleNoteOff}
              hapticEnabled={hapticEnabled}
              showLabels={showLabels}
            />
          </View>
        ))}

        {/* Black keys overlaid */}
        {notes.map((note) => {
          const noteInOctave = note % 12;
          if (![1, 3, 6, 8, 10].includes(noteInOctave)) {
            return null;
          }

          // Calculate position of black key based on white key position
          const whiteKeyIndex = notes
            .filter((n) => {
              const inOct = n % 12;
              return ![1, 3, 6, 8, 10].includes(inOct);
            })
            .findIndex(
              (n) =>
                notes.indexOf(note) > notes.indexOf(n) &&
                notes.indexOf(note) - notes.indexOf(n) <= 1
            );

          return (
            <View
              key={`black-${note}`}
              style={[
                styles.blackKeyOverlay,
                {
                  left: `${(whiteKeyIndex + 1) * (100 / whiteKeys.length) - 6}%`,
                },
              ]}
            >
              <PianoKey
                midiNote={note}
                isBlackKey={true}
                isHighlighted={highlightedNotes.has(note)}
                isExpected={expectedNotes.has(note)}
                onKeyDown={handleNoteOn}
                onKeyUp={handleNoteOff}
                hapticEnabled={hapticEnabled}
                showLabels={showLabels}
              />
            </View>
          );
        })}
      </View>
    );

    if (scrollable) {
      return (
        <View style={styles.container} testID={testID}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            scrollEventThrottle={16} // 60fps target
            onScroll={handleScroll}
            showsHorizontalScrollIndicator={false}
            scrollsToTop={false}
          >
            {KeyboardContent}
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={styles.container} testID={testID}>
        {KeyboardContent}
      </View>
    );
  }
);

Keyboard.displayName = 'Keyboard';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    overflow: 'hidden',
  },
  keyboard: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    position: 'relative',
  },
  whiteKeyContainer: {
    flex: 1,
    position: 'relative',
    minWidth: 40,
  },
  blackKeyOverlay: {
    position: 'absolute',
    top: 0,
    width: '12%',
    height: '65%',
    zIndex: 10,
  },
});

export default Keyboard;

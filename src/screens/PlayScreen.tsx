/**
 * PlayScreen - Free play mode with landscape keyboard
 *
 * Features:
 * - Landscape orientation lock (same pattern as ExercisePlayer)
 * - Full-width 3-octave scrollable keyboard
 * - Live note name display (shows what key you're pressing)
 * - Record / playback / clear your performance
 * - Beginner-friendly instruction banner (dismissible)
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Keyboard } from '../components/Keyboard/Keyboard';
import { createAudioEngine } from '../audio/createAudioEngine';
import type { NoteHandle } from '../audio/types';
import type { MidiNoteEvent } from '../core/exercises/types';

// ============================================================================
// Helpers
// ============================================================================

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToNoteName(midi: number): string {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}

// ============================================================================
// Types
// ============================================================================

interface RecordedNote {
  note: number;
  velocity: number;
  timestamp: number;
  releaseTimestamp?: number;
}

// Auto-release notes after this duration (ms) — prevents stuck notes when
// onPressOut doesn't fire (e.g., ScrollView steals the gesture)
const NOTE_AUTO_RELEASE_MS = 1500;

// ============================================================================
// Component
// ============================================================================

export function PlayScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<RecordedNote[]>([]);
  const [highlightedNotes, setHighlightedNotes] = useState<Set<number>>(new Set());
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [currentNoteName, setCurrentNoteName] = useState<string>('');
  const [sessionNoteCount, setSessionNoteCount] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const recordingStartRef = useRef(0);
  const audioEngineRef = useRef(createAudioEngine());
  const activeHandlesRef = useRef<Map<number, NoteHandle>>(new Map());
  const autoReleaseTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // --------------------------------------------------------------------------
  // Landscape orientation lock — useFocusEffect so it restores on tab switch
  // (useEffect cleanup only fires on unmount, but tab screens stay mounted)
  // --------------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT)
          .catch(() => {
            return ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          })
          .catch((err) => console.warn('[PlayScreen] Landscape lock failed:', err));
      }, 100);

      return () => {
        clearTimeout(timer);
        // Restore portrait immediately on blur (tab switch or navigate away)
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
          .catch(() => {});
      };
    }, [])
  );

  // --------------------------------------------------------------------------
  // Audio engine initialization
  // --------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    const init = async (): Promise<void> => {
      try {
        await audioEngineRef.current.initialize();
        if (mounted) setIsAudioReady(true);
      } catch {
        console.warn('[PlayScreen] Audio init failed');
      }
    };
    init();
    return () => {
      mounted = false;
      // Release all active notes on unmount to prevent audio leak
      audioEngineRef.current.releaseAllNotes();
      activeHandlesRef.current.clear();
      // Clear all auto-release timers
      for (const t of autoReleaseTimersRef.current.values()) clearTimeout(t);
      autoReleaseTimersRef.current.clear();
    };
  }, []);

  // --------------------------------------------------------------------------
  // Note event handlers
  // --------------------------------------------------------------------------
  const handleNoteOn = useCallback(
    (midiNote: MidiNoteEvent) => {
      // AUDIO FIRST — play sound before any React state updates for lowest latency
      if (isAudioReady) {
        const existingHandle = activeHandlesRef.current.get(midiNote.note);
        if (existingHandle) {
          audioEngineRef.current.releaseNote(existingHandle);
          activeHandlesRef.current.delete(midiNote.note);
        }
        const existingTimer = autoReleaseTimersRef.current.get(midiNote.note);
        if (existingTimer) clearTimeout(existingTimer);

        const handle = audioEngineRef.current.playNote(midiNote.note, midiNote.velocity / 127);
        activeHandlesRef.current.set(midiNote.note, handle);

        // Auto-release safety net
        const timer = setTimeout(() => {
          const currentHandle = activeHandlesRef.current.get(midiNote.note);
          if (currentHandle === handle) {
            audioEngineRef.current.releaseNote(currentHandle);
            activeHandlesRef.current.delete(midiNote.note);
            setHighlightedNotes((prev) => {
              const next = new Set(prev);
              next.delete(midiNote.note);
              return next;
            });
          }
          autoReleaseTimersRef.current.delete(midiNote.note);
        }, NOTE_AUTO_RELEASE_MS);
        autoReleaseTimersRef.current.set(midiNote.note, timer);
      }

      // VISUALS AFTER — state updates queue re-renders but don't block audio
      setHighlightedNotes((prev) => new Set([...prev, midiNote.note]));
      setCurrentNoteName(midiToNoteName(midiNote.note));
      setSessionNoteCount((prev) => prev + 1);
      if (showInstructions) setShowInstructions(false);

      // Record if actively recording
      if (isRecording) {
        setRecordedNotes((prev) => [
          ...prev,
          {
            note: midiNote.note,
            velocity: midiNote.velocity,
            timestamp: Date.now() - recordingStartRef.current,
          },
        ]);
      }
    },
    [isAudioReady, isRecording, showInstructions],
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      setHighlightedNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });

      // Release the audio — this is what actually stops the sound
      const handle = activeHandlesRef.current.get(note);
      if (handle) {
        audioEngineRef.current.releaseNote(handle);
        activeHandlesRef.current.delete(note);
      }
      // Clear auto-release timer since we released manually
      const timer = autoReleaseTimersRef.current.get(note);
      if (timer) {
        clearTimeout(timer);
        autoReleaseTimersRef.current.delete(note);
      }

      if (isRecording) {
        setRecordedNotes((prev) => {
          const notes = [...prev];
          for (let i = notes.length - 1; i >= 0; i--) {
            if (notes[i].note === note && !notes[i].releaseTimestamp) {
              notes[i] = {
                ...notes[i],
                releaseTimestamp: Date.now() - recordingStartRef.current,
              };
              break;
            }
          }
          return notes;
        });
      }
    },
    [isRecording],
  );

  // --------------------------------------------------------------------------
  // Recording controls
  // --------------------------------------------------------------------------
  const startRecording = useCallback(() => {
    setRecordedNotes([]);
    recordingStartRef.current = Date.now();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const playRecording = useCallback(async () => {
    if (recordedNotes.length === 0) return;

    const baseTimestamp = recordedNotes[0].timestamp;
    for (const recorded of recordedNotes) {
      const delay = recorded.timestamp - baseTimestamp;
      await new Promise<void>((resolve) => setTimeout(resolve, delay > 0 ? delay : 0));
      if (isAudioReady) {
        audioEngineRef.current.playNote(recorded.note, recorded.velocity / 127);
      }
      setHighlightedNotes(new Set([recorded.note]));
      setCurrentNoteName(midiToNoteName(recorded.note));
    }

    setHighlightedNotes(new Set());
    setCurrentNoteName('');
  }, [recordedNotes, isAudioReady]);

  const clearRecording = useCallback(() => {
    setRecordedNotes([]);
  }, []);

  // --------------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------------
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      {/* Top controls bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.title}>Free Play</Text>

        {/* Live note display */}
        <View style={styles.noteDisplay}>
          <Text style={styles.noteText}>{currentNoteName || '\u2014'}</Text>
        </View>

        {/* Session stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>{sessionNoteCount} notes</Text>
          {recordedNotes.length > 0 && (
            <Text style={styles.statsText}>{recordedNotes.length} recorded</Text>
          )}
        </View>

        {/* Help button to re-show instructions */}
        {!showInstructions && (
          <TouchableOpacity
            onPress={() => setShowInstructions(true)}
            style={styles.helpButton}
          >
            <MaterialCommunityIcons name="help-circle-outline" size={22} color="#B0B0B0" />
          </TouchableOpacity>
        )}

        {/* Recording controls */}
        <View style={styles.recordControls}>
          {!isRecording ? (
            <TouchableOpacity onPress={startRecording} style={styles.controlTouchable}>
              <MaterialCommunityIcons name="record-circle" size={22} color="#DC143C" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={stopRecording} style={styles.controlTouchable}>
              <MaterialCommunityIcons name="stop-circle" size={22} color="#FF4444" />
            </TouchableOpacity>
          )}
          {recordedNotes.length > 0 && !isRecording && (
            <>
              <TouchableOpacity onPress={playRecording} style={styles.controlTouchable}>
                <MaterialCommunityIcons name="play-circle" size={22} color="#00E676" />
              </TouchableOpacity>
              <TouchableOpacity onPress={clearRecording} style={styles.controlTouchable}>
                <MaterialCommunityIcons name="delete" size={22} color="#EF5350" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Beginner-friendly instruction banner */}
      {showInstructions && (
        <View style={styles.instructionsBanner}>
          <View style={styles.instructionsContent}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#FFD700" />
            <View style={styles.instructionsTextWrap}>
              <Text style={styles.instructionsTitle}>Welcome to Free Play!</Text>
              <Text style={styles.instructionsText}>
                Tap the piano keys below to play notes. The note name shows above.{' '}
                Press the red circle to record, then play it back!
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowInstructions(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Full-width keyboard */}
      <View style={styles.keyboardContainer}>
        <Keyboard
          startNote={48}
          octaveCount={3}
          onNoteOn={handleNoteOn}
          onNoteOff={handleNoteOff}
          highlightedNotes={highlightedNotes}
          expectedNotes={new Set()}
          enabled={true}
          hapticEnabled={true}
          showLabels={true}
          scrollable={true}
          keyHeight={110}
          testID="freeplay-keyboard"
        />
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noteDisplay: {
    backgroundColor: '#252525',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#DC143C',
    minWidth: 80,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#DC143C',
    fontFamily: 'monospace',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  statsText: {
    fontSize: 12,
    color: '#888',
  },
  helpButton: {
    padding: 4,
  },
  recordControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlTouchable: {
    padding: 4,
  },
  instructionsBanner: {
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  instructionsContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  instructionsTextWrap: {
    flex: 1,
  },
  instructionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 2,
  },
  instructionsText: {
    fontSize: 12,
    color: '#B0B0B0',
    lineHeight: 17,
  },
  keyboardContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
});

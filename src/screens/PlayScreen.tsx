/**
 * PlayScreen - Free play mode with piano keyboard
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Keyboard } from '../components/Keyboard/Keyboard';
import { getAudioEngine } from '../audio/ExpoAudioEngine';
import type { MidiNoteEvent } from '../core/exercises/types';

export function PlayScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [highlightedNotes, setHighlightedNotes] = useState<Set<number>>(new Set());
  const [isAudioReady, setIsAudioReady] = useState(false);

  const audioEngine = getAudioEngine();

  // Initialize audio engine
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        await audioEngine.initialize();
        if (mounted) setIsAudioReady(true);
      } catch {
        console.warn('[PlayScreen] Audio init failed');
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [audioEngine]);

  const handleNoteOn = useCallback(
    (midiNote: MidiNoteEvent) => {
      setHighlightedNotes((prev) => new Set([...prev, midiNote.note]));
      if (isAudioReady) {
        audioEngine.playNote(midiNote.note, midiNote.velocity / 127);
      }
    },
    [isAudioReady, audioEngine]
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      setHighlightedNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    },
    []
  );

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasRecording(true);
    } else {
      setIsRecording(true);
    }
  };

  const playRecording = () => {
    console.log('Playing recording...');
  };

  const clearRecording = () => {
    setHasRecording(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Free Play</Text>
        <Text style={styles.subtitle}>Practice and explore freely</Text>
      </View>

      {/* Keyboard */}
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
          keyHeight={160}
          testID="freeplay-keyboard"
        />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            isRecording && styles.controlButtonActive,
          ]}
          onPress={toggleRecording}
        >
          <MaterialCommunityIcons
            name={isRecording ? 'stop-circle' : 'record-circle'}
            size={32}
            color={isRecording ? '#F44336' : '#1976D2'}
          />
          <Text style={styles.controlLabel}>
            {isRecording ? 'Stop' : 'Record'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            !hasRecording && styles.controlButtonDisabled,
          ]}
          onPress={playRecording}
          disabled={!hasRecording}
        >
          <MaterialCommunityIcons
            name="play-circle"
            size={32}
            color={hasRecording ? '#1976D2' : '#BDBDBD'}
          />
          <Text
            style={[
              styles.controlLabel,
              !hasRecording && styles.controlLabelDisabled,
            ]}
          >
            Play
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            !hasRecording && styles.controlButtonDisabled,
          ]}
          onPress={clearRecording}
          disabled={!hasRecording}
        >
          <MaterialCommunityIcons
            name="delete"
            size={32}
            color={hasRecording ? '#F44336' : '#BDBDBD'}
          />
          <Text
            style={[
              styles.controlLabel,
              !hasRecording && styles.controlLabelDisabled,
            ]}
          >
            Clear
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  controls: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  controlButtonActive: {
    backgroundColor: '#FFEBEE',
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  controlLabelDisabled: {
    color: '#999',
  },
});

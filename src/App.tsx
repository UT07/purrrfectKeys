/**
 * Main App component
 * Entry point for the KeySense application
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync().catch(() => {
  // Catching errors in case SplashScreen is not available
});

export default function App(): React.ReactElement {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare(): Promise<void> {
      try {
        // Initialize audio engine
        // await initializeAudioEngine();

        // Initialize MIDI input
        // await initializeMidiInput();

        // Initialize database
        // await initializeDatabase();

        // Load user settings
        // await loadUserSettings();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(() => {
        // Catching errors in case SplashScreen is not available
      });
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return <></>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContent />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent(): React.ReactElement {
  return (
    <RootNavigator />
  );
}

/**
 * Root navigator - Demo with ExercisePlayer
 */
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ExercisePlayer } from './screens/ExercisePlayer/ExercisePlayer';
import type { Exercise } from './core/exercises/types';

const DEMO_EXERCISE: Exercise = {
  id: 'demo-exercise-1',
  version: 1,
  metadata: {
    title: 'C Major Scale Demo',
    description: 'Play C-D-E-F-G',
    difficulty: 1,
    estimatedMinutes: 1,
    skills: ['right-hand', 'c-major'],
    prerequisites: [],
  },
  settings: {
    tempo: 120,
    timeSignature: [4, 4],
    keySignature: 'C',
    countIn: 2,
    metronomeEnabled: false,
  },
  notes: [
    { note: 60, startBeat: 0, durationBeats: 1 }, // C
    { note: 62, startBeat: 1, durationBeats: 1 }, // D
    { note: 64, startBeat: 2, durationBeats: 1 }, // E
    { note: 65, startBeat: 3, durationBeats: 1 }, // F
    { note: 67, startBeat: 4, durationBeats: 1 }, // G
  ],
  scoring: {
    timingToleranceMs: 50,
    timingGracePeriodMs: 150,
    passingScore: 70,
    starThresholds: [70, 85, 95],
  },
  hints: {
    beforeStart: 'Play the C major scale: C-D-E-F-G',
    commonMistakes: [
      {
        pattern: 'rushing',
        advice: 'Keep steady timing with the metronome',
      },
    ],
    successMessage: 'Great job! You played the C major scale!',
  },
};

function RootNavigator(): React.ReactElement {
  const [showExercise, setShowExercise] = React.useState(false);

  if (showExercise) {
    return (
      <ExercisePlayer
        exercise={DEMO_EXERCISE}
        onExerciseComplete={(score) => {
          console.log('Exercise completed! Score:', score);
        }}
        onClose={() => setShowExercise(false)}
      />
    );
  }

  return (
    <View style={demoStyles.container}>
      <Text style={demoStyles.title}>KeySense Demo</Text>
      <Text style={demoStyles.subtitle}>Piano Learning App</Text>

      <Pressable
        style={demoStyles.button}
        onPress={() => setShowExercise(true)}
      >
        <Text style={demoStyles.buttonText}>Start Demo Exercise</Text>
      </Pressable>

      <View style={demoStyles.info}>
        <Text style={demoStyles.infoText}>
          ✅ MIDI Input Integration{'\n'}
          ✅ Audio Engine (Mock){'\n'}
          ✅ Exercise Validation{'\n'}
          ✅ Real-time Scoring{'\n'}
          ✅ Touch Keyboard{'\n'}
        </Text>
      </View>
    </View>
  );
}

const demoStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#1976D2',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 40,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  info: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#333',
  },
});

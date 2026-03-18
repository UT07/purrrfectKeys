/**
 * PlayFirstOnboarding — Phase 16: "Play First" Onboarding
 *
 * User plays piano within 15 seconds of entering the app.
 * 5 steps total:
 *   1. "Play your first note!" — highlighted Middle C → confetti on press
 *   2. "Now a melody!"        — guided C-D-E-F-G with visual cues
 *   3. "A real song!"         — 8-note Twinkle Twinkle with simplified scoring
 *   4. Choose cat + learning path
 *   5. Quick setup (experience + input + goal + username)
 *
 * Steps 1-3 use a live Keyboard component. Audio engine is lazy-initialized
 * on first key press to avoid blocking the first render.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Button, PressableScale } from '../components/common';
import { CatAvatar } from '../components/Mascot/CatAvatar';
import { getStarterCats } from '../components/Mascot/catCharacters';
import type { CatCharacter } from '../components/Mascot/catCharacters';
import { Keyboard } from '../components/Keyboard/Keyboard';
import { ConfettiEffect } from '../components/transitions/ConfettiEffect';
import { useSettingsStore } from '../stores/settingsStore';
import { useCatEvolutionStore } from '../stores/catEvolutionStore';
import { prefillOnboardingBuffer } from '../services/exerciseBufferManager';
import { checkUsernameAvailable, isValidUsername, registerUsername } from '../services/firebase/socialService';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, glowColor } from '../theme/tokens';
import { analyticsEvents, funnels } from '../services/analytics/PostHog';
import { GradientMeshBackground } from '../components/effects';
import { logger } from '../utils/logger';
import type { MidiNoteEvent } from '../core/exercises/types';
import type { IAudioEngine, NoteHandle } from '../audio/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 5;
const MIDDLE_C = 60;

/** Twinkle Twinkle melody: C C G G A A G - F F E E D D C */
const TWINKLE_NOTES = [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60];

/** C-D-E-F-G melody for step 2 */
const SCALE_NOTES = [60, 62, 64, 65, 67];

const NOTE_NAMES: Record<number, string> = {
  60: 'C', 62: 'D', 64: 'E', 65: 'F', 67: 'G', 69: 'A',
};

// Learning path options (same as old onboarding)
const PATH_OPTIONS = [
  { id: 'piano-basics', emoji: '🎹', title: 'Piano Basics', description: 'Master all fundamentals', color: '#64B5F6', lessonCount: 40 },
  { id: 'pop-and-film', emoji: '🎤', title: 'Pop & Film', description: 'Chord-first approach', color: '#FF6B8A', lessonCount: 20 },
  { id: 'classical', emoji: '🎻', title: 'Classical', description: 'Technique & repertoire', color: '#CE93D8', lessonCount: 24 },
  { id: 'jazz-and-blues', emoji: '🎷', title: 'Jazz & Blues', description: 'Swing & improvisation', color: '#FFB74D', lessonCount: 21 },
  { id: 'kids', emoji: '👶', title: 'Kids', description: 'Simplified & fun', color: '#81C784', lessonCount: 14 },
];

// ---------------------------------------------------------------------------
// Audio helper — lazy init
// ---------------------------------------------------------------------------

let audioEnginePromise: Promise<IAudioEngine> | null = null;

function getAudioEngine(): Promise<IAudioEngine> {
  if (!audioEnginePromise) {
    audioEnginePromise = (async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createAudioEngine } = require('../audio/createAudioEngine') as { createAudioEngine: () => IAudioEngine };
      const engine = createAudioEngine();
      await engine.initialize();
      return engine;
    })();
  }
  return audioEnginePromise;
}

// ---------------------------------------------------------------------------
// Step 1: Play Your First Note
// ---------------------------------------------------------------------------

function PlayFirstNoteStep({
  onComplete,
}: {
  onComplete: () => void;
}): React.ReactElement {
  const [hasPlayedNote, setHasPlayedNote] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const activeHandles = useRef<Map<number, NoteHandle>>(new Map());

  // Pulsing glow on Middle C
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleNoteOn = useCallback((event: MidiNoteEvent) => {
    // Fire-and-forget audio playback (must not block state updates)
    getAudioEngine().then((engine) => {
      const handle = engine.playNote(event.note, 0.8);
      activeHandles.current.set(event.note, handle);
    }).catch(() => {});

    if (event.note === MIDDLE_C && !hasPlayedNote) {
      setHasPlayedNote(true);
      setShowConfetti(true);
      // Auto-advance after celebration
      setTimeout(onComplete, 1800);
    }
  }, [hasPlayedNote, onComplete]);

  const handleNoteOff = useCallback((midiNote: number) => {
    const handle = activeHandles.current.get(midiNote);
    if (handle) {
      getAudioEngine().then((engine) => engine.releaseNote(handle)).catch(() => {});
      activeHandles.current.delete(midiNote);
    }
  }, []);

  const highlightedNotes = useMemo(() => new Set([MIDDLE_C]), []);

  return (
    <View style={styles.pianoStep} testID="play-first-step-1">
      {showConfetti && <ConfettiEffect />}

      <Animated.View entering={FadeIn.duration(400)}>
        <View style={styles.pianoStepHeader}>
          <CatAvatar catId="mini-meowww" size="small" skipEntryAnimation />
          <View style={styles.pianoStepTextContainer}>
            <Text style={styles.pianoStepTitle}>Play your first note!</Text>
            <Text style={styles.pianoStepSubtitle}>
              {hasPlayedNote ? 'Amazing! You played Middle C!' : 'Tap the glowing key below'}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Arrow pointing down to Middle C */}
      {!hasPlayedNote && (
        <Animated.View style={[styles.arrowContainer, pulseStyle]}>
          <MaterialCommunityIcons name="arrow-down-bold" size={32} color={COLORS.primary} />
          <Text style={styles.arrowLabel}>Middle C</Text>
        </Animated.View>
      )}

      {hasPlayedNote && (
        <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.successBadge}>
          <MaterialCommunityIcons name="check-circle" size={28} color={COLORS.success} />
          <Text style={styles.successText}>Perfect!</Text>
        </Animated.View>
      )}

      <View style={styles.keyboardContainer}>
        <Keyboard
          startNote={48} // C3
          octaveCount={2}
          onNoteOn={handleNoteOn}
          onNoteOff={handleNoteOff}
          highlightedNotes={highlightedNotes}
          expectedNotes={highlightedNotes}
          enabled
          hapticEnabled
          showLabels
          scrollable={false}
          keyHeight={120}
          focusNote={MIDDLE_C}
          testID="play-first-keyboard"
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Guided Melody (C-D-E-F-G)
// ---------------------------------------------------------------------------

function GuidedMelodyStep({
  onComplete,
}: {
  onComplete: () => void;
}): React.ReactElement {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const activeHandles = useRef<Map<number, NoteHandle>>(new Map());

  const isComplete = currentIndex >= SCALE_NOTES.length;
  const currentExpectedNote = isComplete ? null : SCALE_NOTES[currentIndex];

  const expectedNotes = useMemo(
    () => (currentExpectedNote != null ? new Set([currentExpectedNote]) : new Set<number>()),
    [currentExpectedNote],
  );

  // Progress indicators
  const progressDots = useMemo(
    () => SCALE_NOTES.map((note, i) => ({ note, played: i < currentIndex })),
    [currentIndex],
  );

  const handleNoteOn = useCallback((event: MidiNoteEvent) => {
    getAudioEngine().then((engine) => {
      const handle = engine.playNote(event.note, 0.8);
      activeHandles.current.set(event.note, handle);
    }).catch(() => {});

    if (event.note === currentExpectedNote) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      if (nextIndex >= SCALE_NOTES.length) {
        setShowSuccess(true);
        setTimeout(onComplete, 1500);
      }
    }
  }, [currentExpectedNote, currentIndex, onComplete]);

  const handleNoteOff = useCallback((midiNote: number) => {
    const handle = activeHandles.current.get(midiNote);
    if (handle) {
      getAudioEngine().then((engine) => engine.releaseNote(handle)).catch(() => {});
      activeHandles.current.delete(midiNote);
    }
  }, []);

  return (
    <View style={styles.pianoStep} testID="play-first-step-2">
      <Animated.View entering={FadeIn.duration(400)}>
        <View style={styles.pianoStepHeader}>
          <CatAvatar catId="jazzy" size="small" skipEntryAnimation />
          <View style={styles.pianoStepTextContainer}>
            <Text style={styles.pianoStepTitle}>Now a melody!</Text>
            <Text style={styles.pianoStepSubtitle}>
              {showSuccess
                ? 'You played C-D-E-F-G!'
                : `Play ${NOTE_NAMES[currentExpectedNote!] ?? '?'} next`}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Note progress dots */}
      <View style={styles.noteProgressRow}>
        {progressDots.map((dot, i) => (
          <View key={i} style={styles.noteProgressItem}>
            <View
              style={[
                styles.noteProgressDot,
                dot.played && styles.noteProgressDotPlayed,
                i === currentIndex && !isComplete && styles.noteProgressDotCurrent,
              ]}
            />
            <Text
              style={[
                styles.noteProgressLabel,
                i === currentIndex && !isComplete && styles.noteProgressLabelCurrent,
              ]}
            >
              {NOTE_NAMES[dot.note]}
            </Text>
          </View>
        ))}
      </View>

      {showSuccess && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.successBadge}>
          <MaterialCommunityIcons name="star-circle" size={28} color={COLORS.starGold} />
          <Text style={styles.successText}>Great job!</Text>
        </Animated.View>
      )}

      <View style={styles.keyboardContainer}>
        <Keyboard
          startNote={48}
          octaveCount={2}
          onNoteOn={handleNoteOn}
          onNoteOff={handleNoteOff}
          expectedNotes={expectedNotes}
          enabled
          hapticEnabled
          showLabels
          scrollable={false}
          keyHeight={120}
          focusNote={currentExpectedNote ?? MIDDLE_C}
          testID="melody-keyboard"
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Mini Exercise — Twinkle Twinkle
// ---------------------------------------------------------------------------

function MiniExerciseStep({
  onComplete,
}: {
  onComplete: () => void;
}): React.ReactElement {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const activeHandles = useRef<Map<number, NoteHandle>>(new Map());

  const isComplete = currentIndex >= TWINKLE_NOTES.length;
  const currentExpectedNote = isComplete ? null : TWINKLE_NOTES[currentIndex];

  const expectedNotes = useMemo(
    () => (currentExpectedNote != null ? new Set([currentExpectedNote]) : new Set<number>()),
    [currentExpectedNote],
  );

  // Stars based on accuracy
  const accuracy = isComplete && (correctCount + wrongCount) > 0
    ? Math.round((correctCount / TWINKLE_NOTES.length) * 100)
    : 0;
  const stars = accuracy >= 95 ? 3 : accuracy >= 80 ? 2 : accuracy >= 60 ? 1 : 0;

  const handleNoteOn = useCallback((event: MidiNoteEvent) => {
    if (isComplete) return;

    getAudioEngine().then((engine) => {
      const handle = engine.playNote(event.note, 0.8);
      activeHandles.current.set(event.note, handle);
    }).catch(() => {});

    if (event.note === currentExpectedNote) {
      setCorrectCount((c) => c + 1);
    } else {
      setWrongCount((c) => c + 1);
    }
    // Always advance to prevent getting stuck
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    if (nextIndex >= TWINKLE_NOTES.length) {
      setShowScore(true);
      setShowConfetti(true);
      setTimeout(onComplete, 2500);
    }
  }, [currentExpectedNote, currentIndex, isComplete, onComplete]);

  const handleNoteOff = useCallback((midiNote: number) => {
    const handle = activeHandles.current.get(midiNote);
    if (handle) {
      getAudioEngine().then((engine) => engine.releaseNote(handle)).catch(() => {});
      activeHandles.current.delete(midiNote);
    }
  }, []);

  // Progress bar
  const progress = currentIndex / TWINKLE_NOTES.length;

  return (
    <View style={styles.pianoStep} testID="play-first-step-3">
      {showConfetti && <ConfettiEffect />}

      <Animated.View entering={FadeIn.duration(400)}>
        <View style={styles.pianoStepHeader}>
          <CatAvatar catId="luna" size="small" skipEntryAnimation />
          <View style={styles.pianoStepTextContainer}>
            <Text style={styles.pianoStepTitle}>
              {showScore ? 'Well done!' : 'Twinkle Twinkle'}
            </Text>
            <Text style={styles.pianoStepSubtitle}>
              {showScore
                ? `${accuracy}% accuracy`
                : `Note ${currentIndex + 1} of ${TWINKLE_NOTES.length}`}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.exerciseProgressTrack}>
        <View style={[styles.exerciseProgressFill, { width: `${progress * 100}%` as `${number}%` }]} />
      </View>

      {/* Score display */}
      {showScore && (
        <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.scoreContainer}>
          <View style={styles.starsRow}>
            {[1, 2, 3].map((i) => (
              <MaterialCommunityIcons
                key={i}
                name={i <= stars ? 'star' : 'star-outline'}
                size={36}
                color={i <= stars ? COLORS.starGold : COLORS.textMuted}
              />
            ))}
          </View>
          <Text style={styles.scoreLabel}>
            {stars === 3 ? 'Perfect!' : stars >= 2 ? 'Great playing!' : 'Nice start!'}
          </Text>
        </Animated.View>
      )}

      {/* Current note hint */}
      {!isComplete && (
        <View style={styles.noteHint}>
          <Text style={styles.noteHintText}>
            Play <Text style={styles.noteHintNote}>{NOTE_NAMES[currentExpectedNote!] ?? '?'}</Text>
          </Text>
        </View>
      )}

      <View style={styles.keyboardContainer}>
        <Keyboard
          startNote={48}
          octaveCount={2}
          onNoteOn={handleNoteOn}
          onNoteOff={handleNoteOff}
          expectedNotes={expectedNotes}
          enabled={!isComplete}
          hapticEnabled
          showLabels
          scrollable={false}
          keyHeight={120}
          focusNote={currentExpectedNote ?? MIDDLE_C}
          testID="twinkle-keyboard"
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Cat + Path Selection
// ---------------------------------------------------------------------------

function CatAndPathStep({
  selectedCatId,
  selectedPath,
  onSelectCat,
  onSelectPath,
  onNext,
}: {
  selectedCatId?: string;
  selectedPath?: string;
  onSelectCat: (catId: string) => void;
  onSelectPath: (pathId: string) => void;
  onNext: () => void;
}): React.ReactElement {
  const starterCats = useMemo(() => getStarterCats(), []);

  return (
    <ScrollView
      style={styles.setupStep}
      contentContainerStyle={styles.setupStepContent}
      showsVerticalScrollIndicator={false}
      testID="play-first-step-4"
    >
      <Animated.View entering={FadeIn.duration(400)}>
        {/* Cat selection */}
        <Text style={styles.sectionTitle}>Choose your companion</Text>
        <Text style={styles.sectionSubtitle}>Your cat learns piano with you!</Text>

        <View style={styles.catRow}>
          {starterCats.map((cat: CatCharacter) => {
            const isSelected = selectedCatId === cat.id;
            return (
              <PressableScale
                key={cat.id}
                onPress={() => onSelectCat(cat.id)}
                testID={`onboarding-cat-${cat.id}`}
              >
                <View
                  style={[
                    styles.catCard,
                    isSelected && styles.catCardSelected,
                    isSelected && { borderColor: cat.color },
                  ]}
                >
                  <CatAvatar catId={cat.id} size="small" skipEntryAnimation />
                  <Text style={styles.catCardName}>{cat.name}</Text>
                  <Text style={styles.catCardPersonality}>{cat.personality}</Text>
                </View>
              </PressableScale>
            );
          })}
        </View>

        {/* Path selection */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Pick your path</Text>
        <Text style={styles.sectionSubtitle}>You can change this anytime</Text>

        {PATH_OPTIONS.map((path) => {
          const isSelected = selectedPath === path.id;
          return (
            <PressableScale
              key={path.id}
              onPress={() => onSelectPath(path.id)}
              testID={`onboarding-path-${path.id}`}
            >
              <View
                style={[
                  styles.pathCard,
                  isSelected && styles.pathCardSelected,
                  isSelected && { borderColor: path.color },
                ]}
              >
                <Text style={styles.pathEmoji}>{path.emoji}</Text>
                <View style={styles.pathTextContainer}>
                  <Text style={styles.pathTitle}>{path.title}</Text>
                  <Text style={styles.pathDescription}>
                    {path.description} · {path.lessonCount} lessons
                  </Text>
                </View>
                {isSelected && (
                  <MaterialCommunityIcons name="check-circle" size={24} color={path.color} />
                )}
              </View>
            </PressableScale>
          );
        })}

        <Button
          title="Next"
          onPress={onNext}
          disabled={!selectedCatId || !selectedPath}
          size="large"
          style={styles.nextButton}
          testID="onboarding-cat-path-next"
        />
      </Animated.View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Step 5: Quick Setup (Experience + Input + Goal + Username)
// ---------------------------------------------------------------------------

function QuickSetupStep({
  state,
  onStateChange,
  onFinish,
}: {
  state: {
    experienceLevel?: 'beginner' | 'intermediate' | 'returning';
    inputMethod?: 'midi' | 'mic' | 'touch';
    goal?: 'songs' | 'technique' | 'exploration';
    username?: string;
    displayName?: string;
  };
  onStateChange: (update: Partial<typeof state>) => void;
  onFinish: () => void;
}): React.ReactElement {
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUsernameChange = useCallback((text: string) => {
    const normalized = text.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
    onStateChange({ username: normalized });

    if (usernameCheckTimer.current) {
      clearTimeout(usernameCheckTimer.current);
    }

    if (!normalized || normalized.length < 3) {
      setUsernameStatus(normalized.length > 0 ? 'invalid' : 'idle');
      return;
    }

    if (!isValidUsername(normalized)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(normalized);
        setUsernameStatus(available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('available'); // Optimistic offline
      }
    }, 500);
  }, [onStateChange]);

  const canFinish = state.experienceLevel && state.inputMethod && state.goal
    && state.username && state.username.length >= 3 && usernameStatus !== 'taken' && usernameStatus !== 'invalid';

  return (
    <ScrollView
      style={styles.setupStep}
      contentContainerStyle={styles.setupStepContent}
      showsVerticalScrollIndicator={false}
      testID="play-first-step-5"
    >
      <Animated.View entering={FadeIn.duration(400)}>
        <Text style={styles.sectionTitle}>Quick Setup</Text>
        <Text style={styles.sectionSubtitle}>Almost there — just a few choices!</Text>

        {/* Experience level */}
        <Text style={styles.fieldLabel}>Your experience</Text>
        <View style={styles.chipRow}>
          {([
            { value: 'beginner' as const, label: 'Beginner', icon: 'sprout' as const },
            { value: 'intermediate' as const, label: 'Some Basics', icon: 'book-open-variant' as const },
            { value: 'returning' as const, label: 'Returning', icon: 'music-note-eighth' as const },
          ]).map((opt) => (
            <PressableScale
              key={opt.value}
              onPress={() => onStateChange({ experienceLevel: opt.value })}
              testID={`onboarding-exp-${opt.value}`}
            >
              <View style={[styles.chip, state.experienceLevel === opt.value && styles.chipSelected]}>
                <MaterialCommunityIcons name={opt.icon} size={18} color={state.experienceLevel === opt.value ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.chipText, state.experienceLevel === opt.value && styles.chipTextSelected]}>{opt.label}</Text>
              </View>
            </PressableScale>
          ))}
        </View>

        {/* Input method */}
        <Text style={styles.fieldLabel}>How will you play?</Text>
        <View style={styles.chipRow}>
          {([
            { value: 'touch' as const, label: 'Screen', icon: 'gesture-tap' as const },
            { value: 'midi' as const, label: 'MIDI Keyboard', icon: 'piano' as const },
            { value: 'mic' as const, label: 'Microphone', icon: 'microphone' as const },
          ]).map((opt) => (
            <PressableScale
              key={opt.value}
              onPress={() => onStateChange({ inputMethod: opt.value })}
              testID={`onboarding-input-${opt.value}`}
            >
              <View style={[styles.chip, state.inputMethod === opt.value && styles.chipSelected]}>
                <MaterialCommunityIcons name={opt.icon} size={18} color={state.inputMethod === opt.value ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.chipText, state.inputMethod === opt.value && styles.chipTextSelected]}>{opt.label}</Text>
              </View>
            </PressableScale>
          ))}
        </View>

        {/* Goal */}
        <Text style={styles.fieldLabel}>Your goal</Text>
        <View style={styles.chipRow}>
          {([
            { value: 'songs' as const, label: 'Play Songs', icon: 'music' as const },
            { value: 'technique' as const, label: 'Learn Technique', icon: 'school' as const },
            { value: 'exploration' as const, label: 'Just Explore', icon: 'compass' as const },
          ]).map((opt) => (
            <PressableScale
              key={opt.value}
              onPress={() => onStateChange({ goal: opt.value })}
              testID={`onboarding-goal-${opt.value}`}
            >
              <View style={[styles.chip, state.goal === opt.value && styles.chipSelected]}>
                <MaterialCommunityIcons name={opt.icon} size={18} color={state.goal === opt.value ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[styles.chipText, state.goal === opt.value && styles.chipTextSelected]}>{opt.label}</Text>
              </View>
            </PressableScale>
          ))}
        </View>

        {/* Username */}
        <Text style={styles.fieldLabel}>Choose a username</Text>
        <View style={styles.usernameRow}>
          <TextInput
            style={styles.usernameInput}
            value={state.username ?? ''}
            onChangeText={handleUsernameChange}
            placeholder="e.g. pianocat42"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            testID="onboarding-username-input"
          />
          {usernameStatus === 'checking' && (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.usernameStatusIcon} />
          )}
          {usernameStatus === 'available' && (
            <MaterialCommunityIcons name="check-circle" size={20} color={COLORS.success} style={styles.usernameStatusIcon} />
          )}
          {usernameStatus === 'taken' && (
            <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.error} style={styles.usernameStatusIcon} />
          )}
        </View>
        {usernameStatus === 'taken' && (
          <Text style={styles.usernameError}>Username taken — try another</Text>
        )}
        {usernameStatus === 'invalid' && (
          <Text style={styles.usernameError}>Min 3 chars, letters/numbers/-/_ only</Text>
        )}

        {/* Display name (optional) */}
        <Text style={styles.fieldLabel}>Display name (optional)</Text>
        <TextInput
          style={styles.usernameInput}
          value={state.displayName ?? ''}
          onChangeText={(text) => onStateChange({ displayName: text.slice(0, 30) })}
          placeholder="How others see you"
          placeholderTextColor={COLORS.textMuted}
          maxLength={30}
          testID="onboarding-displayname-input"
        />

        <Button
          title="Start Learning!"
          onPress={onFinish}
          disabled={!canFinish}
          size="large"
          style={styles.nextButton}
          testID="onboarding-finish"
        />
      </Animated.View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Progress Indicator
// ---------------------------------------------------------------------------

function StepProgress({ step }: { step: number }): React.ReactElement {
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < step;
        const isCurrent = stepNum === step;
        return (
          <View
            key={i}
            style={[
              styles.progressDot,
              isCompleted && styles.progressDotCompleted,
              isCurrent && styles.progressDotCurrent,
            ]}
          />
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface SetupState {
  selectedCatId?: string;
  selectedPath?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'returning';
  inputMethod?: 'midi' | 'mic' | 'touch';
  goal?: 'songs' | 'technique' | 'exploration';
  username?: string;
  displayName?: string;
}

export function PlayFirstOnboarding(): React.ReactElement {
  const [step, setStep] = useState(1);
  const [setupState, setSetupState] = useState<SetupState>({ inputMethod: 'touch' });
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const setHasCompletedOnboarding = useSettingsStore((s) => s.setHasCompletedOnboarding);
  const setExperienceLevel = useSettingsStore((s) => s.setExperienceLevel);
  const setLearningGoal = useSettingsStore((s) => s.setLearningGoal);
  const setPlaybackSpeed = useSettingsStore((s) => s.setPlaybackSpeed);

  // Track onboarding entry
  useEffect(() => {
    analyticsEvents.onboarding.started();
    funnels.onboarding.started();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advanceStep = useCallback(() => {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }, []);

  const handleFinish = useCallback(() => {
    analyticsEvents.onboarding.completed(setupState.experienceLevel ?? 'unknown');
    funnels.onboarding.completed();

    // MUST set onboarding flag FIRST (see comment in old OnboardingScreen)
    setHasCompletedOnboarding(true);

    if (setupState.experienceLevel) {
      setExperienceLevel(setupState.experienceLevel);
    }
    if (setupState.goal) {
      setLearningGoal(setupState.goal);
    }
    if (setupState.inputMethod) {
      useSettingsStore.getState().setPreferredInputMethod(setupState.inputMethod);
      if (setupState.inputMethod === 'midi') {
        useSettingsStore.getState().updateMidiSettings({ autoConnectMidi: true });
      }
      setPlaybackSpeed(
        setupState.inputMethod === 'midi' ? 1.0 : setupState.inputMethod === 'mic' ? 0.75 : 0.5,
      );
    }
    if (setupState.selectedPath) {
      useSettingsStore.getState().setSelectedPath(setupState.selectedPath as any);
    }
    if (setupState.selectedCatId) {
      useCatEvolutionStore.getState().initializeStarterCat(setupState.selectedCatId);
      useSettingsStore.getState().setSelectedCatId(setupState.selectedCatId);
    }
    if (setupState.username) {
      useSettingsStore.getState().setUsername(setupState.username);
      const dn = setupState.displayName?.trim() || setupState.username;
      useSettingsStore.getState().setDisplayName(dn);
    }

    // Firestore sync (best-effort, same pattern as old onboarding)
    try {
      const { useAuthStore } = require('../stores/authStore');
      const { user } = useAuthStore.getState();
      if (user) {
        const { updateUserProfile } = require('../services/firebase/firestore');
        updateUserProfile(user.uid, {
          hasCompletedOnboarding: true,
          username: setupState.username || '',
        } as any).catch(() => {});

        if (setupState.username) {
          const dn = setupState.displayName?.trim() || setupState.username;
          registerUsername(user.uid, setupState.username, dn).then(() => {
            const { useSocialStore } = require('../stores/socialStore');
            useSocialStore.getState().setFriendCode(setupState.username!);
          }).catch((err: Error) => {
            logger.warn('[PlayFirstOnboarding] registerUsername failed:', err.message);
            if (err.message === 'Username already taken') {
              updateUserProfile(user.uid, { username: '' } as any).catch(() => {});
              useSettingsStore.getState().setUsername('');
            }
          });
        }
      }
    } catch (err) {
      logger.warn('[PlayFirstOnboarding] Firestore sync best-effort:', err);
    }

    prefillOnboardingBuffer().catch(() => {});
    navigation.goBack();

    if (setupState.inputMethod === 'mic') {
      setTimeout(() => navigation.navigate('MicSetup'), 300);
    }
  }, [setupState, setHasCompletedOnboarding, setExperienceLevel, setLearningGoal, setPlaybackSpeed, navigation]);

  const handleSetupStateChange = useCallback((update: Partial<SetupState>) => {
    setSetupState((prev) => ({ ...prev, ...update }));
  }, []);

  const renderStep = (): React.ReactNode => {
    switch (step) {
      case 1:
        return <PlayFirstNoteStep onComplete={advanceStep} />;
      case 2:
        return <GuidedMelodyStep onComplete={advanceStep} />;
      case 3:
        return <MiniExerciseStep onComplete={advanceStep} />;
      case 4:
        return (
          <CatAndPathStep
            selectedCatId={setupState.selectedCatId}
            selectedPath={setupState.selectedPath}
            onSelectCat={(catId) => handleSetupStateChange({ selectedCatId: catId })}
            onSelectPath={(pathId) => handleSetupStateChange({ selectedPath: pathId })}
            onNext={advanceStep}
          />
        );
      case 5:
        return (
          <QuickSetupStep
            state={setupState}
            onStateChange={handleSetupStateChange}
            onFinish={handleFinish}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="play-first-onboarding">
      <GradientMeshBackground accent="home" />

      {/* Step progress */}
      <StepProgress step={step} />

      {/* Step content */}
      <View style={styles.stepContentContainer}>
        {renderStep()}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.textMuted,
  },
  progressDotCompleted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  progressDotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  // Step content area
  stepContentContainer: {
    flex: 1,
  },

  // Piano steps (steps 1-3)
  pianoStep: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  pianoStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingTop: SPACING.sm,
  },
  pianoStepTextContainer: {
    flex: 1,
  },
  pianoStepTitle: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
  },
  pianoStepSubtitle: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Arrow pointing to Middle C
  arrowContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  arrowLabel: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.primary,
    marginTop: 2,
  },

  // Success badge
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginVertical: SPACING.md,
  },
  successText: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.success,
  },

  // Keyboard container
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: SPACING.xl,
  },

  // Note progress (step 2)
  noteProgressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginVertical: SPACING.md,
  },
  noteProgressItem: {
    alignItems: 'center',
    gap: 4,
  },
  noteProgressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
  },
  noteProgressDotPlayed: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  noteProgressDotCurrent: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  noteProgressLabel: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textMuted,
  },
  noteProgressLabelCurrent: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Exercise progress (step 3)
  exerciseProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surface,
    marginVertical: SPACING.md,
    overflow: 'hidden',
  },
  exerciseProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  noteHint: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  noteHintText: {
    ...TYPOGRAPHY.body.lg,
    color: COLORS.textSecondary,
  },
  noteHintNote: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.primary,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  starsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  scoreLabel: {
    ...TYPOGRAPHY.body.lg,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },

  // Setup steps (steps 4-5)
  setupStep: {
    flex: 1,
  },
  setupStepContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 40,
  },
  sectionTitle: {
    ...TYPOGRAPHY.display.sm,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.body.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },

  // Cat selection
  catRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'center',
  },
  catCard: {
    width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md * 2) / 3,
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  catCardSelected: {
    backgroundColor: glowColor(COLORS.primary, 0.08),
  },
  catCardName: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  catCardPersonality: {
    ...TYPOGRAPHY.caption.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  // Path selection
  pathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  pathCardSelected: {
    backgroundColor: glowColor(COLORS.primary, 0.06),
  },
  pathEmoji: {
    fontSize: 28,
  },
  pathTextContainer: {
    flex: 1,
  },
  pathTitle: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.textPrimary,
  },
  pathDescription: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  nextButton: {
    marginTop: SPACING.xl,
  },

  // Quick setup (step 5)
  fieldLabel: {
    ...TYPOGRAPHY.button.md,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: glowColor(COLORS.primary, 0.08),
  },
  chipText: {
    ...TYPOGRAPHY.caption.lg,
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: COLORS.primary,
  },

  // Username
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameInput: {
    flex: 1,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.body.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  usernameStatusIcon: {
    marginLeft: SPACING.sm,
  },
  usernameError: {
    ...TYPOGRAPHY.body.sm,
    color: COLORS.error,
    marginTop: 4,
  },
});

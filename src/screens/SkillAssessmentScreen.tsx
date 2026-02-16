/**
 * Skill Assessment Screen
 * A 5-round mini-exercise during onboarding that calibrates the learner profile
 * and determines which lesson to start at.
 *
 * State machine: INTRO -> PLAYING_ROUND -> ROUND_RESULT -> ... -> COMPLETE
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Button } from '../components/common';
import { PianoRoll } from '../components/PianoRoll/PianoRoll';
import { Keyboard } from '../components/Keyboard/Keyboard';
import { MascotBubble } from '../components/Mascot/MascotBubble';
import { useLearnerProfileStore } from '../stores/learnerProfileStore';
import { useProgressStore } from '../stores/progressStore';
import { useSettingsStore } from '../stores/settingsStore';
import { getRandomCatMessage } from '../content/catDialogue';
import { COLORS, SPACING, BORDER_RADIUS } from '../theme/tokens';
import type { NoteEvent, MidiNoteEvent } from '../core/exercises/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AssessmentPhase = 'intro' | 'playing' | 'result' | 'complete';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface AssessmentRound {
  id: number;
  title: string;
  description: string;
  tempo: number;
  notes: NoteEvent[];
}

interface PlayedNote {
  note: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Round Data
// ---------------------------------------------------------------------------

export const ASSESSMENT_ROUNDS: AssessmentRound[] = [
  {
    id: 1,
    title: 'Simple Notes',
    description: 'Play these four notes',
    tempo: 60,
    notes: [
      { note: 60, startBeat: 0, durationBeats: 1 },
      { note: 62, startBeat: 1, durationBeats: 1 },
      { note: 64, startBeat: 2, durationBeats: 1 },
      { note: 60, startBeat: 3, durationBeats: 1 },
    ],
  },
  {
    id: 2,
    title: 'Melodic Pairs',
    description: 'Play these note pairs',
    tempo: 70,
    notes: [
      { note: 60, startBeat: 0, durationBeats: 1 },
      { note: 64, startBeat: 1, durationBeats: 1 },
      { note: 62, startBeat: 2, durationBeats: 1 },
      { note: 65, startBeat: 3, durationBeats: 1 },
    ],
  },
  {
    id: 3,
    title: 'First Chord',
    description: 'Play all three notes together',
    tempo: 60,
    notes: [
      { note: 60, startBeat: 0, durationBeats: 2 },
      { note: 64, startBeat: 0, durationBeats: 2 },
      { note: 67, startBeat: 0, durationBeats: 2 },
    ],
  },
  {
    id: 4,
    title: 'Sharp Notes',
    description: 'Watch for the black key!',
    tempo: 80,
    notes: [
      { note: 60, startBeat: 0, durationBeats: 1 },
      { note: 62, startBeat: 1, durationBeats: 1 },
      { note: 66, startBeat: 2, durationBeats: 1 },
      { note: 67, startBeat: 3, durationBeats: 1 },
    ],
  },
  {
    id: 5,
    title: 'Syncopation',
    description: 'Tricky timing!',
    tempo: 90,
    notes: [
      { note: 60, startBeat: 0, durationBeats: 0.5 },
      { note: 64, startBeat: 0.5, durationBeats: 0.5 },
      { note: 67, startBeat: 1, durationBeats: 1 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Cat Encouragement (uses the full dialogue system)
// ---------------------------------------------------------------------------

function getCatMessageForScore(catId: string, score: number): string {
  const trigger = score >= 0.6 ? 'exercise_complete_pass' : 'exercise_complete_fail';
  const condition = score >= 0.9 ? 'score_high' : score < 0.6 ? 'score_low' : undefined;
  return getRandomCatMessage(catId, trigger, condition);
}

function getCatMood(score: number): 'celebrating' | 'encouraging' | 'happy' {
  if (score >= 0.9) return 'celebrating';
  if (score >= 0.6) return 'encouraging';
  return 'happy';
}

// ---------------------------------------------------------------------------
// Pure Logic Functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Score a single round based on played notes vs expected notes.
 * Returns a score between 0 and 1.
 *
 * Score = (correct_pitches / total_notes * 0.6) + (avg_timing_score * 0.4)
 * Where timing_score = max(0, 1 - abs(offset_ms) / 500)
 */
export function scoreRound(
  expectedNotes: NoteEvent[],
  playedNotes: PlayedNote[],
  tempo: number,
  roundStartTime: number,
): number {
  if (expectedNotes.length === 0) return 0;

  const msPerBeat = 60000 / tempo;
  let correctPitches = 0;
  let totalTimingScore = 0;
  let matchedCount = 0;

  // Track which played notes have been consumed to avoid double-matching
  const consumedPlayedIndices = new Set<number>();

  for (const expected of expectedNotes) {
    const expectedTimeMs = expected.startBeat * msPerBeat;

    // Find the best matching played note for this expected note
    let bestMatchIndex = -1;
    let bestTimingOffset = Infinity;

    for (let i = 0; i < playedNotes.length; i++) {
      if (consumedPlayedIndices.has(i)) continue;

      const played = playedNotes[i];
      if (played.note === expected.note) {
        const playedTimeMs = played.timestamp - roundStartTime;
        const offset = Math.abs(playedTimeMs - expectedTimeMs);
        if (offset < bestTimingOffset) {
          bestTimingOffset = offset;
          bestMatchIndex = i;
        }
      }
    }

    if (bestMatchIndex >= 0) {
      consumedPlayedIndices.add(bestMatchIndex);
      correctPitches++;
      matchedCount++;
      const timingScore = Math.max(0, 1 - bestTimingOffset / 500);
      totalTimingScore += timingScore;
    }
  }

  const pitchScore = correctPitches / expectedNotes.length;
  const avgTimingScore = matchedCount > 0 ? totalTimingScore / matchedCount : 0;

  return pitchScore * 0.6 + avgTimingScore * 0.4;
}

/**
 * Determine which lesson to start at based on round scores.
 */
export function determineStartLesson(roundScores: number[]): string {
  const allPerfect = roundScores.every((s) => s >= 0.9);
  const first3Perfect = roundScores.slice(0, 3).every((s) => s >= 0.9);
  const first2Perfect = roundScores.slice(0, 2).every((s) => s >= 0.9);

  if (allPerfect) return 'post-curriculum';
  if (first3Perfect) return 'lesson-05';
  if (first2Perfect) return 'lesson-03';

  // Find first failed round
  const firstFail = roundScores.findIndex((s) => s < 0.6);
  if (firstFail <= 0) return 'lesson-01';
  if (firstFail <= 1) return 'lesson-02';
  if (firstFail <= 2) return 'lesson-03';
  return 'lesson-04';
}

// ---------------------------------------------------------------------------
// Screen Component
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function SkillAssessmentScreen(): React.ReactElement {
  const navigation = useNavigation<NavigationProp>();
  const catId = useSettingsStore((s) => s.selectedCatId) || 'mini-meowww';

  // State machine
  const [phase, setPhase] = useState<AssessmentPhase>('intro');
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [startLesson, setStartLesson] = useState('lesson-01');

  // Refs for tracking played notes in a round
  const playedNotesRef = useRef<PlayedNote[]>([]);
  const roundStartTimeRef = useRef(0);
  const beatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentRound = ASSESSMENT_ROUNDS[currentRoundIndex];

  // Expected notes as a Set for keyboard highlighting
  const expectedNoteSet = React.useMemo(() => {
    if (!currentRound) return new Set<number>();
    return new Set(currentRound.notes.map((n) => n.note));
  }, [currentRound]);

  // Focus note for auto-scroll (center of the expected notes)
  const focusNote = React.useMemo(() => {
    if (!currentRound || currentRound.notes.length === 0) return undefined;
    const notes = currentRound.notes.map((n) => n.note);
    return Math.round(notes.reduce((a, b) => a + b, 0) / notes.length);
  }, [currentRound]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Start a round: begin beat counter and set timeout for round end
  const startRound = useCallback(() => {
    if (!currentRound) return;

    playedNotesRef.current = [];
    roundStartTimeRef.current = Date.now();
    setCurrentBeat(0);
    setPhase('playing');

    const msPerBeat = 60000 / currentRound.tempo;
    const maxBeat = Math.max(
      ...currentRound.notes.map((n) => n.startBeat + n.durationBeats),
    );
    const totalDurationMs = (maxBeat + 2) * msPerBeat; // +2 beats grace period

    // Advance beat counter
    const startTime = Date.now();
    beatIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const beat = elapsed / msPerBeat;
      setCurrentBeat(beat);

      if (beat >= maxBeat + 2) {
        // Auto-end the round
        if (beatIntervalRef.current) {
          clearInterval(beatIntervalRef.current);
          beatIntervalRef.current = null;
        }
        finishRound();
      }
    }, 50);

    // Safety timeout in case interval doesn't fire
    timeoutRef.current = setTimeout(() => {
      if (beatIntervalRef.current) {
        clearInterval(beatIntervalRef.current);
        beatIntervalRef.current = null;
      }
      finishRound();
    }, totalDurationMs + 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRound, currentRoundIndex]);

  // Score the round and transition to result phase
  const finishRound = useCallback(() => {
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current);
      beatIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const round = ASSESSMENT_ROUNDS[currentRoundIndex];
    if (!round) return;

    const score = scoreRound(
      round.notes,
      playedNotesRef.current,
      round.tempo,
      roundStartTimeRef.current,
    );

    setCurrentScore(score);
    setRoundScores((prev) => [...prev, score]);
    setPhase('result');
  }, [currentRoundIndex]);

  // Handle note input from keyboard
  const handleNoteOn = useCallback(
    (event: MidiNoteEvent) => {
      if (phase !== 'playing') return;
      playedNotesRef.current.push({
        note: event.note,
        timestamp: event.timestamp,
      });
    },
    [phase],
  );

  // Move to next round or complete the assessment
  const handleNextRound = useCallback(() => {
    if (currentRoundIndex + 1 >= ASSESSMENT_ROUNDS.length) {
      // All rounds done -- compute final results
      const allScores = [...roundScores]; // currentScore already pushed by finishRound
      const lesson = determineStartLesson(allScores);
      setStartLesson(lesson);

      // Update learner profile
      const profileStore = useLearnerProfileStore.getState();
      const progressStore = useProgressStore.getState();

      // Record each round as an exercise result
      let totalPitchScore = 0;
      let totalTimingScore = 0;

      for (let i = 0; i < ASSESSMENT_ROUNDS.length; i++) {
        const round = ASSESSMENT_ROUNDS[i];
        const score = allScores[i] ?? 0;
        const noteResults = round.notes.map((n) => ({
          midiNote: n.note,
          accuracy: score,
        }));
        profileStore.recordExerciseResult({
          tempo: round.tempo,
          score,
          noteResults,
        });
        // Approximate: pitchScore is 60% of total, timingScore is 40%
        totalPitchScore += Math.min(1, score / 0.6) * 0.6;
        totalTimingScore += Math.min(1, score / 0.4) * 0.4;
      }

      const avgPitchScore = totalPitchScore / ASSESSMENT_ROUNDS.length;
      const avgTimingScore = totalTimingScore / ASSESSMENT_ROUNDS.length;
      profileStore.updateSkill('pitchAccuracy', avgPitchScore);
      profileStore.updateSkill('timingAccuracy', avgTimingScore);

      // Persist assessment date and overall score
      const avgScore = allScores.length > 0
        ? allScores.reduce((a, b) => a + b, 0) / allScores.length
        : 0;
      useLearnerProfileStore.setState({
        lastAssessmentDate: new Date().toISOString().split('T')[0],
        assessmentScore: Math.round(avgScore * 100),
      });

      // Mark earlier lessons as completed if skipping
      const lessonNumber = parseInt(lesson.replace('lesson-', ''), 10);
      if (!isNaN(lessonNumber) && lessonNumber > 1) {
        for (let i = 1; i < lessonNumber; i++) {
          const lessonId = `lesson-${String(i).padStart(2, '0')}`;
          progressStore.updateLessonProgress(lessonId, {
            lessonId,
            status: 'completed',
            exerciseScores: {},
            bestScore: 100,
            completedAt: Date.now(),
            totalAttempts: 0,
            totalTimeSpentSeconds: 0,
          });
        }
      }

      setPhase('complete');
    } else {
      setCurrentRoundIndex((prev) => prev + 1);
      setPhase('intro');
    }
  }, [currentRoundIndex, roundScores]);

  // Continue after assessment -- go back to onboarding
  const handleContinue = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderIntro = () => (
    <View style={styles.centeredContent}>
      <View style={styles.roundBadge}>
        <Text style={styles.roundBadgeText}>
          Round {currentRoundIndex + 1} of {ASSESSMENT_ROUNDS.length}
        </Text>
      </View>

      <Text style={styles.title}>{currentRound.title}</Text>
      <Text style={styles.description}>{currentRound.description}</Text>

      <View style={styles.tempoInfo}>
        <Text style={styles.tempoLabel}>Tempo: {currentRound.tempo} BPM</Text>
      </View>

      <MascotBubble
        mood="encouraging"
        message={getRandomCatMessage(catId, 'exercise_start')}
        size="medium"
      />

      <Button
        title="Start"
        onPress={startRound}
        size="large"
        style={styles.actionButton}
      />
    </View>
  );

  const renderPlaying = () => (
    <View style={styles.playingContainer}>
      <View style={styles.roundHeader}>
        <Text style={styles.roundHeaderText}>
          Round {currentRoundIndex + 1} of {ASSESSMENT_ROUNDS.length}
        </Text>
        <Text style={styles.roundTitle}>{currentRound.title}</Text>
      </View>

      <View style={styles.pianoRollContainer}>
        <PianoRoll
          notes={currentRound.notes}
          currentBeat={currentBeat}
          tempo={currentRound.tempo}
          testID="assessment-piano-roll"
        />
      </View>

      <View style={styles.keyboardContainer}>
        <Keyboard
          startNote={48}
          octaveCount={3}
          onNoteOn={handleNoteOn}
          expectedNotes={expectedNoteSet}
          enabled={true}
          showLabels={true}
          scrollable={true}
          scrollEnabled={false}
          focusNote={focusNote}
          keyHeight={100}
          testID="assessment-keyboard"
        />
      </View>
    </View>
  );

  const renderResult = () => {
    const percentage = Math.round(currentScore * 100);
    const passed = currentScore >= 0.6;

    return (
      <View style={styles.centeredContent}>
        <View style={styles.roundBadge}>
          <Text style={styles.roundBadgeText}>
            Round {currentRoundIndex + 1} of {ASSESSMENT_ROUNDS.length}
          </Text>
        </View>

        <View style={[styles.scoreCircle, passed ? styles.scoreCirclePassed : styles.scoreCircleFailed]}>
          <Text style={styles.scoreText}>{percentage}%</Text>
        </View>

        <Text style={styles.resultLabel}>
          {passed ? 'Passed' : 'Not Quite'}
        </Text>

        <MascotBubble
          mood={getCatMood(currentScore)}
          message={getCatMessageForScore(catId, currentScore)}
          size="medium"
        />

        <Button
          title={
            currentRoundIndex + 1 >= ASSESSMENT_ROUNDS.length
              ? 'See Results'
              : 'Next Round'
          }
          onPress={handleNextRound}
          size="large"
          style={styles.actionButton}
        />
      </View>
    );
  };

  const renderComplete = () => {
    const avgScore =
      roundScores.length > 0
        ? roundScores.reduce((a, b) => a + b, 0) / roundScores.length
        : 0;
    const percentage = Math.round(avgScore * 100);

    const lessonLabel =
      startLesson === 'post-curriculum'
        ? 'Advanced Exercises'
        : `Lesson ${parseInt(startLesson.replace('lesson-', ''), 10)}`;

    return (
      <View style={styles.centeredContent}>
        <Text style={styles.completeTitle}>Assessment Complete!</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Overall Score</Text>
          <Text style={styles.summaryScore}>{percentage}%</Text>

          <View style={styles.roundScoresRow}>
            {roundScores.map((score, index) => (
              <View key={index} style={styles.roundScoreItem}>
                <Text style={styles.roundScoreLabel}>R{index + 1}</Text>
                <View
                  style={[
                    styles.roundScoreDot,
                    score >= 0.6
                      ? styles.roundScoreDotPass
                      : styles.roundScoreDotFail,
                  ]}
                >
                  <Text style={styles.roundScoreDotText}>
                    {Math.round(score * 100)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.startingAtCard}>
          <Text style={styles.startingAtLabel}>Starting at</Text>
          <Text style={styles.startingAtValue}>{lessonLabel}</Text>
        </View>

        <MascotBubble
          mood="celebrating"
          message={getRandomCatMessage(catId, 'level_up')}
          size="medium"
        />

        <Button
          title="Continue"
          onPress={handleContinue}
          size="large"
          style={styles.actionButton}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress dots header */}
      {phase !== 'complete' && (
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Skill Check</Text>
          <View style={styles.progressDots}>
            {ASSESSMENT_ROUNDS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i < currentRoundIndex
                    ? styles.dotCompleted
                    : i === currentRoundIndex
                      ? styles.dotCurrent
                      : styles.dotPending,
                ]}
              />
            ))}
          </View>
        </View>
      )}
      {phase === 'intro' && renderIntro()}
      {phase === 'playing' && renderPlaying()}
      {phase === 'result' && renderResult()}
      {phase === 'complete' && renderComplete()}
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
  progressHeader: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  progressDots: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotCompleted: {
    backgroundColor: COLORS.success,
  },
  dotCurrent: {
    backgroundColor: COLORS.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotPending: {
    backgroundColor: COLORS.cardBorder,
  },
  centeredContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    alignItems: 'center',
  },
  playingContainer: {
    flex: 1,
  },

  // Round badge
  roundBadge: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.lg,
  },
  roundBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  // Title & description
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },

  // Tempo info
  tempoInfo: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  tempoLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },

  // Playing phase
  roundHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  roundHeaderText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  roundTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  pianoRollContainer: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  keyboardContainer: {
    marginTop: 'auto' as const,
    paddingBottom: SPACING.md,
  },

  // Result phase
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    marginBottom: SPACING.md,
  },
  scoreCirclePassed: {
    borderColor: COLORS.success,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  scoreCircleFailed: {
    borderColor: COLORS.error,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  scoreText: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  resultLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },

  // Complete phase
  completeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    width: SCREEN_WIDTH - SPACING.lg * 2,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  summaryScore: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  roundScoresRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  roundScoreItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  roundScoreLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  roundScoreDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundScoreDotPass: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  roundScoreDotFail: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  roundScoreDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  startingAtCard: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  startingAtLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  startingAtValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Action button
  actionButton: {
    marginTop: SPACING.lg,
    width: '100%',
  },
});

export default SkillAssessmentScreen;

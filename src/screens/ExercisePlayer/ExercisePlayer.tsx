/**
 * Exercise Player Screen
 * Core learning experience with real-time feedback
 * Manages playback, scoring, and visual/audio feedback
 *
 * Architecture:
 * - Exercise state from store (Zustand)
 * - Real-time scoring from ExerciseValidator
 * - 60fps animations with react-native-reanimated
 * - Haptic/audio feedback on note events
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Animated,
  Platform,
  AccessibilityInfo,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { PressableScale } from '../../components/common/PressableScale';
import { Keyboard } from '../../components/Keyboard/Keyboard';
import { SplitKeyboard, deriveSplitPoint } from '../../components/Keyboard/SplitKeyboard';
import { VerticalPianoRoll } from '../../components/PianoRoll/VerticalPianoRoll';
import { computeZoomedRange, computeStickyRange, type KeyboardRange } from '../../components/Keyboard/computeZoomedRange';
import { useExerciseStore } from '../../stores/exerciseStore';
import { useProgressStore } from '../../stores/progressStore';
import { useExercisePlayback } from '../../hooks/useExercisePlayback';
import { getExercise, getNextExerciseId, getLessonIdForExercise, getLesson, getLessons, isTestExercise, getTestExercise, getNonTestExercises } from '../../content/ContentLoader';
import { getNextExerciseForSkill, getNextExercise as getNextAIExercise, fillBuffer, fillBufferForSkills, getBufferSize, BUFFER_MIN_THRESHOLD } from '../../services/exerciseBufferManager';
import { recordPracticeSession as calculateStreakUpdate } from '../../core/progression/XpSystem';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import type { Exercise, ExerciseScore, MidiNoteEvent, ExerciseType } from '../../core/exercises/types';
import { getExerciseType, resolveExerciseTypeFromSkill } from '../../core/exercises/types';
import { ScoreDisplay } from './ScoreDisplay';
import { ExerciseControls } from './ExerciseControls';
import { HintDisplay } from './HintDisplay';
import { CompletionModal } from './CompletionModal';
import { CountInAnimation } from './CountInAnimation';
import { ErrorDisplay } from './ErrorDisplay';
import { AchievementToast } from '../../components/transitions/AchievementToast';
import type { AchievementType } from '../../components/transitions/AchievementToast';
import { LessonCompleteScreen } from '../../components/transitions/LessonCompleteScreen';
import { ExerciseCard } from '../../components/transitions/ExerciseCard';
import { EvolutionReveal } from '../../components/transitions/EvolutionReveal';
import { getTipForScore } from '../../components/Mascot/mascotTips';
import type { FunFact } from '../../content/funFacts';
import { syncManager } from '../../services/firebase/syncService';
import { useAchievementStore, buildAchievementContext } from '../../stores/achievementStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLearnerProfileStore } from '../../stores/learnerProfileStore';
import { useGemStore } from '../../stores/gemStore';
import { useCatEvolutionStore } from '../../stores/catEvolutionStore';
import { getOwnedCats, CAT_CHARACTERS } from '../../components/Mascot/catCharacters';
import { ExerciseBuddy } from '../../components/Mascot/ExerciseBuddy';
import type { BuddyReaction } from '../../components/Mascot/ExerciseBuddy';
import { getAchievementById } from '../../core/achievements/achievements';
import type { PlaybackSpeed } from '../../stores/types';
import { useDevKeyboardMidi } from '../../input/DevKeyboardMidi';
import { DemoPlaybackService } from '../../services/demoPlayback';
import { createAudioEngine } from '../../audio/createAudioEngine';
import { ttsService } from '../../services/tts/TTSService';
import { perfTrace } from '../../utils/perfTrace';
import { createChallenge, updateChallengeResult, resolveChallengeGemStake } from '../../services/firebase/socialService';
import { useSocialStore } from '../../stores/socialStore';
import { useAuthStore } from '../../stores/authStore';
import { ExerciseLoadingScreen } from './ExerciseLoadingScreen';
// SalsaIntro removed — ExerciseLoadingScreen handles pre-exercise coaching
import { ReplayOverlay } from './ReplayOverlay';
import { ReplayTimelineBar } from './ReplayTimelineBar';
import { ComboMeter } from './ComboMeter';
import { ComboGlow } from './ComboGlow';
import { FeedbackText } from './FeedbackText';
import { HitParticles } from './HitParticles';
import { ScreenShake, type ScreenShakeRef } from '../../components/effects';
import { RhythmTapZone } from './RhythmTapZone';
import { ListenPhaseOverlay } from './ListenPhaseOverlay';
import { ChordPrompt, deriveChordName } from './ChordPrompt';
import { SightReadingOverlay } from './SightReadingOverlay';
import { CallResponsePhase } from './CallResponsePhase';
import type { CallResponsePhaseType } from './CallResponsePhase';
import { GlassmorphismCard } from '../../components/effects';
import { buildReplayPlan, buildReplayPlanSync } from '../../services/replayCoachingService';
// getIntroData import removed — SalsaIntro no longer used
import type { ReplayPlan } from '../../core/exercises/replayTypes';
import ReAnimated, { FadeIn } from 'react-native-reanimated';
import { SKILL_TREE, getSkillsForExercise, getSkillById, getAvailableSkills, getGenerationHints } from '../../core/curriculum/SkillTree';
import type { SkillCategory } from '../../core/curriculum/SkillTree';
import { getTierMasteryTestSkillId, isTierMasteryTestAvailable, hasTierMasteryTestPassed } from '../../core/curriculum/tierMasteryTest';
import { adjustDifficulty } from '../../core/curriculum/DifficultyEngine';
import { getTodayDateString } from '../../utils/time';
import { detectWeakPatterns, generateDrillParams } from '../../core/curriculum/WeakSpotDetector';
import type { WeakPattern } from '../../core/curriculum/WeakSpotDetector';
import { applyAbilities, createDefaultConfig } from '../../core/abilities/AbilityEngine';
import { XPTransitionOverlay } from '../../components/transitions/XPTransitionOverlay';
import { setPostExerciseData, setReplayPlanCache, getReplayPlanCache, clearReplayPlanCache } from '../postExerciseCache';
import type { ExerciseAbilityConfig } from '../../core/abilities/AbilityEngine';
import { midiToNoteName } from '../../core/music/MusicTheory';
import { COLORS, NEON, glowColor } from '../../theme/tokens';
import { suggestDrill } from '../../services/FreePlayAnalyzer';
import { generateExercise as generateFreePlayExercise } from '../../services/geminiExerciseService';
import { getTemplateForSkill, getTemplateExercise, getTemplateForType } from '../../content/templateExercises';
import { getChestType, getChestReward } from '../../core/rewards/chestSystem';
import { analyticsEvents } from '../../services/analytics/PostHog';
import { soundManager } from '../../audio/SoundManager';
import { useRankStore } from '../../stores/rankStore';
import { RankChangeOverlay } from '../../components/arena/RankChangeOverlay';

/** Resolve the exercise type from explicit param, or infer from skill category */
function resolveExerciseType(
  explicitType: ExerciseType | null,
  skillId: string | null,
): ExerciseType | undefined {
  if (explicitType) return explicitType;
  if (!skillId) return undefined;
  const skill = getSkillById(skillId);
  if (!skill) return undefined;
  return resolveExerciseTypeFromSkill(null, skill.category);
}

/**
 * Timing tolerance multiplier per input method — mirrors InputManager's
 * INPUT_TIMING_MULTIPLIERS but avoids importing the full module (which
 * pulls in native AudioCapture → react-native-audio-api).
 */
const TIMING_MULTIPLIER_BY_INPUT: Record<string, number> = {
  midi: 1.0,
  touch: 1.0,
  mic: 1.5,
};

/**
 * Latency compensation per input method (ms) — mirrors InputManager's
 * INPUT_LATENCY_COMPENSATION_MS. Used to shift the effective beat position
 * backwards in visual feedback so mic notes aren't penalized for pipeline delay.
 *
 * Without this, mic notes arrive ~100ms after the user plays, so realtimeBeat
 * has advanced past the expected position and feedback always shows "late".
 */
const LATENCY_COMP_MS_BY_INPUT: Record<string, number> = {
  midi: 0,
  touch: 0,
  mic: 100,
};
import type { ChestType } from '../../core/rewards/chestSystem';
import { logger } from '../../utils/logger';

export interface ExercisePlayerProps {
  exercise?: Exercise;
  onExerciseComplete?: (score: ExerciseScore) => void;
  onClose?: () => void;
}

interface FeedbackState {
  type: 'perfect' | 'good' | 'ok' | 'early' | 'late' | 'miss' | null;
  noteIndex: number;
  timestamp: number;
  timingOffsetMs: number;
  hand?: 'left' | 'right';
}

function getFeedbackColor(type: string | null): string {
  switch (type) {
    case 'perfect': return COLORS.feedbackPerfect;
    case 'good': return COLORS.feedbackGood;
    case 'ok': return COLORS.feedbackOk;
    case 'early': return COLORS.feedbackEarly;
    case 'late': return COLORS.feedbackLate;
    case 'miss': return COLORS.feedbackMiss;
    default: return COLORS.feedbackDefault;
  }
}

function computeInitialKeyboardRange(notes: Exercise['notes']): KeyboardRange {
  if (notes.length === 0) {
    return computeZoomedRange([]);
  }

  // Use ALL exercise notes to determine the full range needed — not just the
  // first few. This ensures the keyboard covers the entire exercise from the
  // start, avoiding mid-exercise range jumps.
  const allMidi = notes.map((n) => n.note);
  const uniqueMidi = [...new Set(allMidi)];
  const minNote = Math.min(...uniqueMidi);
  const maxNote = Math.max(...uniqueMidi);
  const span = maxNote - minNote;

  // Compute optimal octave count from the actual note span.
  // Minimum 2 octaves so the target note(s) can be centered in the
  // ScrollView — with only 1 octave the first/last key is at the edge
  // and there's no scroll room to center it.
  //   span 0-11   → 2 octaves (single-note or within-octave exercises)
  //   span 12-23  → 2 octaves (notes cross one octave boundary)
  //   span 24-35  → 3 octaves (two-handed exercises)
  //   span 36+    → 4 octaves (full-range exercises)
  const neededOctaves = Math.max(2, Math.ceil((span + 1) / 12));

  return computeZoomedRange(uniqueMidi, neededOctaves);
}

// Fallback exercise used only when no exercise can be loaded from content
const FALLBACK_EXERCISE: Exercise = {
  id: 'lesson-01-ex-01',
  version: 1,
  metadata: {
    title: 'Find Middle C',
    description: 'Learn to locate and play Middle C',
    difficulty: 1,
    estimatedMinutes: 2,
    skills: ['note-finding', 'c-major'],
    prerequisites: [],
  },
  settings: {
    tempo: 60,
    timeSignature: [4, 4] as [number, number],
    keySignature: 'C',
    countIn: 4,
    metronomeEnabled: true,
  },
  notes: [
    { note: 60, startBeat: 0, durationBeats: 1, hand: 'right' as const },
    { note: 60, startBeat: 1, durationBeats: 1, hand: 'right' as const },
    { note: 60, startBeat: 2, durationBeats: 1, hand: 'right' as const },
    { note: 60, startBeat: 3, durationBeats: 1, hand: 'right' as const },
  ],
  scoring: {
    timingToleranceMs: 75,
    timingGracePeriodMs: 200,
    passingScore: 60,
    starThresholds: [60, 80, 95],
  },
  hints: {
    beforeStart: 'Place your right thumb on Middle C (the white key in the center)',
    commonMistakes: [
      {
        pattern: 'wrong-key',
        advice: 'Middle C is to the left of the two black keys in the center of the keyboard',
      },
    ],
    successMessage: 'Great job finding Middle C!',
  },
};

/**
 * ExercisePlayer - Main screen component
 * Responsible for:
 * - Playback control and timing
 * - Keyboard input handling
 * - Real-time feedback and animations
 * - Score tracking and validation
 * - Exercise completion
 */
export const ExercisePlayer: React.FC<ExercisePlayerProps> = ({
  exercise: exerciseOverride,
  onExerciseComplete,
  onClose,
}) => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Exercise'>>();
  const testMode = route.params?.testMode ?? false;
  const aiMode = route.params?.aiMode ?? false;
  const skillIdParam = route.params?.skillId ?? null;
  const exerciseTypeParam = route.params?.exerciseType ?? null;
  const challengeTarget = route.params?.challengeTarget ?? null;
  const friendChallengeId = route.params?.friendChallengeId ?? null;
  const replayModeParam = route.params?.replayMode ?? false;
  const requiredPlaybackSpeed = route.params?.requiredPlaybackSpeed ?? null;
  const mountedRef = useRef(true);
  const playbackStartTimeRef = useRef(0);

  // Refs for route params — prevent stale closures in handleExerciseCompletion
  // when navigation.replace changes params without remounting the component
  const skillIdParamRef = useRef(skillIdParam);
  skillIdParamRef.current = skillIdParam;
  const testModeRef = useRef(testMode);
  testModeRef.current = testMode;

  // Store integration
  const exerciseStore = useExerciseStore();

  // Ref for exercise to avoid stale closures in handleExerciseCompletion
  // (critical for AI mode where exercise loads asynchronously)
  const exerciseRef = useRef<Exercise>(FALLBACK_EXERCISE);

  // Bug #100 fix: unified loading screen for both AI and static exercises.
  // Phase 1 = tip/fact while loading, Phase 2 = exercise intro with "Let's Go!"
  // Skip loading screen entirely when entering replay mode.
  const [showLoadingScreen, setShowLoadingScreen] = useState(!replayModeParam);

  // AI mode: exercise loaded asynchronously from buffer
  const [aiExercise, setAiExercise] = useState<Exercise | null>(null);
  const freePlayContext = route.params?.freePlayContext;
  const bonusDrillExercise = route.params?.bonusDrillExercise;

  useEffect(() => {
    if (!aiMode) return;

    let cancelled = false;

    const loadAIExercise = async () => {
      // If launched with a pre-generated bonus drill exercise, use it directly
      if (bonusDrillExercise) {
        if (!cancelled) {
          setAiExercise(bonusDrillExercise);
        }
        return;
      }

      // If launched from free play analysis, generate a targeted exercise
      // instead of pulling from the generic buffer
      if (freePlayContext) {
        const drillParams = suggestDrill({
          notesPlayed: freePlayContext.weakNotes.length,
          uniqueNotes: freePlayContext.weakNotes,
          detectedKey: freePlayContext.detectedKey,
          commonIntervals: [],
          suggestedDrillType: freePlayContext.suggestedDrillType,
          summary: '',
          noteCount: freePlayContext.weakNotes.length,
          uniquePitches: freePlayContext.weakNotes.length,
          durationSeconds: 0,
          notesPerSecond: 0,
          mostPlayedNote: null,
        });

        const generated = await generateFreePlayExercise(drillParams);
        if (cancelled) return;

        if (generated) {
          const keyLabel = freePlayContext.detectedKey ?? 'Practice';
          setAiExercise({
            id: `ai-freeplay-${Date.now()}`,
            version: 1,
            metadata: {
              title: `${keyLabel} Drill`,
              description: `Drill based on your free play in ${freePlayContext.detectedKey ?? 'detected key'}`,
              difficulty: (generated.metadata?.difficulty ?? 2) as 1 | 2 | 3 | 4 | 5,
              estimatedMinutes: 2,
              skills: generated.metadata?.skills ?? ['free-play'],
              prerequisites: [],
            },
            settings: {
              tempo: generated.settings.tempo,
              timeSignature: generated.settings.timeSignature,
              keySignature: generated.settings.keySignature ?? freePlayContext.detectedKey ?? 'C',
              countIn: 4,
              metronomeEnabled: true,
            },
            notes: generated.notes.map((n) => ({
              note: n.note,
              startBeat: n.startBeat,
              durationBeats: n.durationBeats,
              ...(n.hand ? { hand: n.hand as 'left' | 'right' } : {}),
            })),
            scoring: {
              timingToleranceMs: generated.scoring?.timingToleranceMs ?? 80,
              timingGracePeriodMs: 200,
              passingScore: generated.scoring?.passingScore ?? 60,
              starThresholds: (generated.scoring?.starThresholds ?? [70, 85, 95]) as [number, number, number],
            },
            hints: {
              beforeStart: `Drill targeting ${freePlayContext.detectedKey ?? 'your recent notes'} -- play along!`,
              commonMistakes: [],
              successMessage: 'Nice drill session!',
            },
          });
          return;
        }
        // If generation failed, fall through to buffer/fallback below
      }

      // F10 fix: if route has a real exerciseId (not 'ai-mode'), try loading
      // the static exercise directly. This handles lesson-tree exercises that
      // come through as AI mode with a fallbackExerciseId.
      const routeExId = route.params?.exerciseId;
      if (routeExId && routeExId !== 'ai-mode' && !routeExId.startsWith('ai-')) {
        const staticEx = getExercise(routeExId);
        if (staticEx && !cancelled) {
          logger.log(`[ExercisePlayer] Using static exercise: ${staticEx.id}`);
          setAiExercise(staticEx);
          return;
        }
      }

      // Gemini AI generation — personalized exercises for warm-up/challenge
      const buffered = skillIdParam
        ? await getNextExerciseForSkill(skillIdParam)
        : await getNextAIExercise();

      if (cancelled) return;

      // F10 fix: derive a STABLE exercise ID from the skill so retries accumulate
      // against the same key. The `ai-skill-{skillId}` key is used elsewhere for
      // high-score lookup, but the exercise.id itself also needs to be stable for
      // per-ID progress tracking. Include a session timestamp so each navigation
      // to this screen starts fresh, but retries within the same session match.
      const stableId = skillIdParam
        ? `ai-skill-${skillIdParam}`
        : `ai-${Date.now()}`;
      const skillName = skillIdParam ? getSkillById(skillIdParam)?.name : null;

      if (buffered) {
        // Resolve exercise type: explicit param > AI response > skill category > default 'play'
        const resolvedType = buffered.type ?? resolveExerciseType(exerciseTypeParam, skillIdParam);

        const converted: Exercise = {
          id: stableId,
          version: 1,
          ...(resolvedType ? { type: resolvedType } : {}),
          metadata: {
            title: skillName ? `Practice: ${skillName}` : (buffered.metadata?.title ?? 'AI Practice'),
            description: buffered.metadata?.skills?.[0]
              ? `Targeting: ${buffered.metadata.skills.join(', ')}`
              : 'Generated exercise targeting your weak areas',
            difficulty: (buffered.metadata?.difficulty ?? 3) as 1 | 2 | 3 | 4 | 5,
            estimatedMinutes: 2,
            skills: buffered.metadata?.skills ?? ['adaptive'],
            prerequisites: [],
          },
          settings: {
            tempo: buffered.settings.tempo,
            timeSignature: buffered.settings.timeSignature,
            keySignature: buffered.settings.keySignature ?? 'C',
            countIn: 4,
            metronomeEnabled: true,
          },
          notes: buffered.notes.map((n) => ({
            note: n.note,
            startBeat: n.startBeat,
            durationBeats: n.durationBeats,
            ...(n.hand ? { hand: n.hand as 'left' | 'right' } : {}),
          })),
          scoring: {
            timingToleranceMs: buffered.scoring?.timingToleranceMs ?? 80,
            timingGracePeriodMs: 200,
            passingScore: buffered.scoring?.passingScore ?? 60,
            starThresholds: (buffered.scoring?.starThresholds ?? [70, 85, 95]) as [number, number, number],
          },
          hints: {
            beforeStart: 'AI-generated exercise — play along with the metronome!',
            commonMistakes: [],
            successMessage: 'Great practice!',
          },
        };
        logger.log(`[ExercisePlayer:AI] Generated: ${converted.notes.length} notes, tempo=${converted.settings.tempo}, tolerance=${converted.scoring.timingToleranceMs}ms, grace=${converted.scoring.timingGracePeriodMs}ms`);
        logger.log(`[ExercisePlayer:AI] Notes: ${converted.notes.slice(0, 6).map(n => `MIDI${n.note}@${n.startBeat}(${n.durationBeats}b)`).join(', ')}${converted.notes.length > 6 ? '...' : ''}`);
        setAiExercise(converted);
      } else {
        // Buffer empty — use offline template fallback chain
        const profile = useLearnerProfileStore.getState();
        const resolvedType = resolveExerciseType(exerciseTypeParam, skillIdParam);

        let template: Exercise;
        if (skillIdParam) {
          // 1. Skill-targeted template (best match)
          template = getTemplateForSkill(skillIdParam, profile.weakNotes);
        } else if (resolvedType && resolvedType !== 'play') {
          // 2. Type-specific template
          template = getTemplateForType(resolvedType, profile.weakNotes);
        } else if (route.params?.exerciseId && route.params.exerciseId !== 'ai-mode') {
          // 3. Static exercise fallback
          const staticEx = getExercise(route.params.exerciseId);
          if (staticEx) {
            setAiExercise(staticEx);
            // Skip template path — static exercise is ready
            return;
          }
          const difficulty = (profile.totalExercisesCompleted > 20 ? 3 : profile.totalExercisesCompleted > 10 ? 2 : 1) as 1 | 2 | 3;
          template = getTemplateExercise(difficulty, profile.weakNotes);
        } else {
          const difficulty = (profile.totalExercisesCompleted > 20 ? 3 : profile.totalExercisesCompleted > 10 ? 2 : 1) as 1 | 2 | 3;
          template = getTemplateExercise(difficulty, profile.weakNotes);
        }

        // F10 fix: Use stable ID and skill name for template fallbacks too
        setAiExercise({
          ...template,
          id: stableId,
          metadata: {
            ...template.metadata,
            title: skillName ? `Practice: ${skillName}` : template.metadata.title,
          },
        });
        logger.log(`[ExercisePlayer:AI] Template fallback: ${template.notes.length} notes, tempo=${template.settings.tempo}, skill=${skillIdParam ?? 'none'}`);
      }

      // Top up buffer in background if running low
      const bufferSize = await getBufferSize();
      if (bufferSize < BUFFER_MIN_THRESHOLD) {
        const profile = useLearnerProfileStore.getState();
        const difficulty = profile.totalExercisesCompleted > 20 ? 4 : profile.totalExercisesCompleted > 10 ? 3 : 2;
        const hints = skillIdParam ? getGenerationHints(skillIdParam) : null;
        const resolvedInteractionType = resolveExerciseType(exerciseTypeParam, skillIdParam);
        if (skillIdParam && hints) {
          // Skill-aware fill: pre-generate for this skill with interaction type
          fillBufferForSkills([{
            skillId: skillIdParam,
            params: {
              weakNotes: profile.weakNotes,
              tempoRange: profile.tempoRange,
              difficulty,
              noteCount: 12,
              skills: profile.skills,
              targetSkillId: skillIdParam,
              generationHints: hints,
              ...(resolvedInteractionType ? { interactionType: resolvedInteractionType } : {}),
            },
            count: BUFFER_MIN_THRESHOLD,
          }]).catch((e) => {
            logger.warn('[ExercisePlayer] Buffer fill failed:', e);
          });
        } else {
          fillBuffer({
            weakNotes: profile.weakNotes,
            tempoRange: profile.tempoRange,
            difficulty,
            noteCount: 12,
            skills: profile.skills,
            ...(resolvedInteractionType ? { interactionType: resolvedInteractionType } : {}),
          }).catch((e) => {
            logger.warn('[ExercisePlayer] Buffer fill failed:', e);
          });
        }
      }
    };

    // Safety timeout: if AI exercise doesn't load within 8s, fall back to template
    // (Cloud Functions have 5s timeout, direct Gemini ~3-5s, so 8s covers both paths)
    const loadTimeout = setTimeout(() => {
      if (cancelled) return;
      logger.warn('[ExercisePlayer] AI exercise load timed out after 8s — using template fallback');
      const profile = useLearnerProfileStore.getState();
      const difficulty = (profile.totalExercisesCompleted > 20 ? 3 : profile.totalExercisesCompleted > 10 ? 2 : 1) as 1 | 2 | 3;
      setAiExercise({ ...getTemplateExercise(difficulty, profile.weakNotes), id: `tmpl-timeout-${Date.now()}` });
    }, 8000);

    loadAIExercise().finally(() => clearTimeout(loadTimeout));

    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiMode, freePlayContext?.detectedKey, bonusDrillExercise]);

  // Load exercise: prop > AI mode > route param > store > fallback
  const loadedExercise = (!aiMode && route.params?.exerciseId)
    ? getExercise(route.params.exerciseId)
    : null;
  const rawExercise =
    exerciseOverride || (aiMode ? aiExercise : null) || loadedExercise || exerciseStore.currentExercise || FALLBACK_EXERCISE;

  // Exercise is ready when we have a real exercise (not the fallback)
  const exerciseReady = rawExercise !== FALLBACK_EXERCISE || !aiMode;

  // Input-aware automatic tempo scaling — no manual speed selector.
  // MIDI = 1.0x (full speed, real piano), Mic = 0.75x (detection latency),
  // Touch = 0.6x (on-screen keyboard needs more time, especially two-handed).
  const preferredInput = useSettingsStore((s) => s.preferredInputMethod);
  const lastMidiDeviceId = useSettingsStore((s) => s.lastMidiDeviceId);
  const selectedCatId = useSettingsStore((s) => s.selectedCatId);

  const playbackSpeed: PlaybackSpeed = useMemo(() => {
    if (requiredPlaybackSpeed) return requiredPlaybackSpeed as PlaybackSpeed;
    if (lastMidiDeviceId) return 1.0;
    if (preferredInput === 'mic') return 0.75;
    return 0.6; // Touch keyboard — 60% of original tempo
  }, [requiredPlaybackSpeed, lastMidiDeviceId, preferredInput]);

  // Two-hand speed lock: cap at 0.5x until user passes a split exercise once
  const twoHandSpeedUnlocked = useSettingsStore((s: any) => s.twoHandSpeedUnlocked);

  // Determine if rawExercise is a split (two-hand) exercise to apply the speed lock.
  // Mirrors the keyboardMode logic below, but runs on rawExercise before the `exercise`
  // useMemo so there is no circular dependency.
  const rawExerciseIsSplit = useMemo(() => {
    const hasLeft = rawExercise.notes.some(n => n.hand === 'left');
    const hasRight = rawExercise.notes.some(n => n.hand === 'right');
    if (hasLeft && hasRight) return true;
    const midiNotes = rawExercise.notes.map(n => n.note);
    const noteRange = Math.max(...midiNotes) - Math.min(...midiNotes);
    return noteRange > 36;
  }, [rawExercise]);

  // effectivePlaybackSpeed: in split mode, cap at 0.5x until unlocked
  const effectivePlaybackSpeed: PlaybackSpeed = useMemo(() => {
    if (rawExerciseIsSplit && !twoHandSpeedUnlocked) return 0.5;
    return playbackSpeed;
  }, [rawExerciseIsSplit, twoHandSpeedUnlocked, playbackSpeed]);

  // Active cat abilities — read raw data from store (NOT getActiveAbilities() which
  // returns a new array each call, causing infinite re-renders with Zustand's Object.is check)
  const evolutionAbilities = useCatEvolutionStore(
    (s) => s.evolutionData[s.selectedCatId]?.abilitiesUnlocked,
  );
  const activeAbilityIds = evolutionAbilities ?? [];
  const activeAbilities = useMemo(() => {
    const cat = CAT_CHARACTERS.find((c) => c.id === (selectedCatId ?? ''));
    if (!cat || activeAbilityIds.length === 0) return [];
    return cat.abilities.filter((a) => activeAbilityIds.includes(a.id));
  }, [selectedCatId, activeAbilityIds]);

  // Rank change overlay — promotion/demotion animation after tier change
  const pendingRankChange = useRankStore((s) => s.pendingRankChange);
  const clearPendingRankChange = useRankStore((s) => s.clearPendingRankChange);

  // Responsive layout — supports both portrait and landscape
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isPortrait = screenHeight > screenWidth;
  const singleKeyHeight = isPortrait ? 120 : 70;
  const topBarHeight = isPortrait ? 76 : 40;

  // Compute ability-modified config from active abilities
  const abilityConfig = useMemo((): ExerciseAbilityConfig | null => {
    // Bug #53: Cat abilities must not boost mastery test performance
    if (testModeRef.current) return null;
    if (activeAbilityIds.length === 0) return null;
    const defaultCfg = createDefaultConfig(
      rawExercise.scoring.timingToleranceMs,
      rawExercise.scoring.timingGracePeriodMs,
      rawExercise.settings.tempo,
    );
    return applyAbilities(activeAbilityIds, defaultCfg);
  }, [activeAbilityIds, rawExercise.scoring.timingToleranceMs, rawExercise.scoring.timingGracePeriodMs, rawExercise.settings.tempo]);

  // Apply speed multiplier + ability modifiers to create the exercise used for playback + scoring
  const exercise = useMemo(() => {
    let ex = rawExercise;

    // Apply ability-based tempo reduction
    if (abilityConfig && abilityConfig.tempo !== rawExercise.settings.tempo) {
      ex = {
        ...ex,
        settings: { ...ex.settings, tempo: abilityConfig.tempo },
      };
    }

    // Apply ability-based timing window changes
    if (abilityConfig && (
      abilityConfig.timingToleranceMs !== rawExercise.scoring.timingToleranceMs ||
      abilityConfig.timingGracePeriodMs !== rawExercise.scoring.timingGracePeriodMs
    )) {
      ex = {
        ...ex,
        scoring: {
          ...ex.scoring,
          timingToleranceMs: abilityConfig.timingToleranceMs,
          timingGracePeriodMs: abilityConfig.timingGracePeriodMs,
        },
      };
    }

    // Apply playback speed — scale BOTH tempo and timing windows.
    // Without scaling the windows, slow practice is paradoxically harder:
    // at 0.5x speed, msPerBeat doubles, so the same absolute ms tolerance
    // represents half the beat-fraction → 2x tighter scoring.
    // effectivePlaybackSpeed is used here so that the two-hand 0.5x lock is respected.
    if (effectivePlaybackSpeed !== 1.0) {
      const windowScale = 1 / effectivePlaybackSpeed; // e.g. 0.5x → 2x wider windows
      ex = {
        ...ex,
        settings: {
          ...ex.settings,
          tempo: Math.round(ex.settings.tempo * effectivePlaybackSpeed),
        },
        scoring: {
          ...ex.scoring,
          timingToleranceMs: Math.round(ex.scoring.timingToleranceMs * windowScale),
          timingGracePeriodMs: Math.round(ex.scoring.timingGracePeriodMs * windowScale),
        },
      };
    }

    return ex;
  }, [rawExercise, effectivePlaybackSpeed, abilityConfig]);

  // ─── Display title: prefer skill node name for AI exercises (F10 fix) ──
  // Gemini generates its own title ("C Rhythm Practice") which doesn't match
  // the skill node the CurriculumEngine selected ("Hand Independence Drill").
  const displayTitle = useMemo(() => {
    if (aiMode && skillIdParamRef.current) {
      const skill = getSkillById(skillIdParamRef.current);
      if (skill?.name) return `Practice: ${skill.name}`;
    }
    return exercise.metadata.title;
  }, [aiMode, exercise.metadata.title]);

  // ─── Exercise type branching ────────────────────────────────────────
  const exerciseType: ExerciseType = getExerciseType(exercise);
  const isSightReading = exerciseType === 'sightReading';

  // Suppress per-note SFX for long exercises (songs, 20+ notes) — keeps haptics, mutes audio
  useEffect(() => {
    const isLong = exercise.notes.length >= 20;
    soundManager.setSuppressNoteSFX(isLong);
    return () => soundManager.setSuppressNoteSFX(false);
  }, [exercise.notes.length]);

  // Chord prompt state (chordId type)
  const currentChordName = useMemo(() => {
    if (exerciseType !== 'chordId' || exercise.notes.length === 0) return '';
    // Group notes by startBeat — each group is a chord to identify
    const firstBeat = exercise.notes[0].startBeat;
    const chordNotes = exercise.notes
      .filter((n) => n.startBeat === firstBeat)
      .map((n) => n.note);
    return deriveChordName(chordNotes);
  }, [exerciseType, exercise.notes]);
  const [chordCorrect, setChordCorrect] = useState(false);
  // setChordCorrect will be used when chord validation is wired in
  void setChordCorrect;

  // Call/response phase state
  const [callResponsePhase, setCallResponsePhase] = useState<CallResponsePhaseType>('call');

  // Keep exerciseRef in sync so completion callback always has current exercise
  useEffect(() => {
    exerciseRef.current = exercise;
  }, [exercise]);

  // Persist the active exercise (including AI-generated exercises) so external
  // E2E automation can read the exact note sequence/timing from AsyncStorage.
  // For AI mode, wait until the real exercise has loaded (not the fallback).
  useEffect(() => {
    if (aiMode && !exerciseReady) return;
    useExerciseStore.getState().setCurrentExercise(exercise);
    analyticsEvents.exercise.started(exercise.id, exercise.metadata.title);
  }, [aiMode, exerciseReady, exercise.id]);

  // Speed is now automatic (input-aware) — no manual cycling

  // Dynamic zoomed range — recomputes as playback advances
  const [keyboardRange, setKeyboardRange] = useState<KeyboardRange>(() => {
    return computeInitialKeyboardRange(exercise.notes);
  });

  // Reset zoom range when exercise changes so each level starts on the
  // correct octave window instead of inheriting previous-session state.
  // Also resets the next expected note so the keyboard scrolls to the first note.
  useEffect(() => {
    const newRange = computeInitialKeyboardRange(exercise.notes);
    setKeyboardRange(newRange);
    // Reset focus note so keyboard scrolls to the right position.
    // For two-hand: center on the median note (between both hands).
    // For single-hand: center on the first chronological note.
    if (exercise.notes.length > 0) {
      const uniqueNotes = [...new Set(exercise.notes.map(n => n.note))].sort((a, b) => a - b);
      const medianNote = uniqueNotes[Math.floor(uniqueNotes.length / 2)];
      setNextExpectedNote(medianNote);
    }
  }, [exercise.id, exercise.notes]);

  // Auto-detect split keyboard mode for two-handed exercises
  const { keyboardMode, splitPoint } = useMemo(() => {
    // Check if notes have both left and right hand annotations
    const hasLeft = exercise.notes.some(n => n.hand === 'left');
    const hasRight = exercise.notes.some(n => n.hand === 'right');
    if (hasLeft && hasRight) {
      return { keyboardMode: 'split' as const, splitPoint: deriveSplitPoint(exercise.notes) };
    }
    // Wide note range (>3 octaves) triggers split
    const midiNotes = exercise.notes.map(n => n.note);
    const noteRange = Math.max(...midiNotes) - Math.min(...midiNotes);
    if (noteRange > 36) {
      return { keyboardMode: 'split' as const, splitPoint: 60 };
    }
    return { keyboardMode: 'normal' as const, splitPoint: 60 };
  }, [exercise]);

  // Landscape disabled — needs proper implementation based on competitor research.
  // Two-hand exercises use portrait split keyboard for now.
  const isLandscape = false;

  // Per-hand focus notes for split keyboard auto-scroll.
  // Center each hand's keyboard on the median of its notes.
  const { focusNoteLeft, focusNoteRight } = useMemo(() => {
    if (keyboardMode !== 'split') return { focusNoteLeft: undefined, focusNoteRight: undefined };
    const leftMidi = [...new Set(
      exercise.notes
        .filter(n => n.hand === 'left' || (!n.hand && n.note < splitPoint))
        .map(n => n.note)
    )].sort((a, b) => a - b);
    const rightMidi = [...new Set(
      exercise.notes
        .filter(n => n.hand === 'right' || (!n.hand && n.note >= splitPoint))
        .map(n => n.note)
    )].sort((a, b) => a - b);
    return {
      focusNoteLeft: leftMidi.length > 0 ? leftMidi[Math.floor(leftMidi.length / 2)] : undefined,
      focusNoteRight: rightMidi.length > 0 ? rightMidi[Math.floor(rightMidi.length / 2)] : undefined,
    };
  }, [exercise.notes, keyboardMode, splitPoint]);

  // Track mount lifecycle
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      demoServiceRef.current.stop();
    };
  }, []);

  // Completion state (declared before useExercisePlayback so the callback is available)
  const [showCompletion, setShowCompletion] = useState(false);
  const [showXPTransition, setShowXPTransition] = useState(false);
  const [finalScore, setFinalScore] = useState<ExerciseScore | null>(null);

  // Quick exercise card (between exercises in a lesson) — CompletionModal
  // now handles all completion scenarios for AI coaching, but ExerciseCard
  // state is kept for the component's dismiss/retry handlers.
  const [showExerciseCard, setShowExerciseCard] = useState(false);
  const [exerciseCardFunFact] = useState<FunFact | null>(null);

  // Achievement toast queue — BUG-028 fix: queue multiple toasts instead of showing only the first
  const [toastQueue, setToastQueue] = useState<Array<{ type: AchievementType; value: number | string }>>([]);
  const toastData = toastQueue.length > 0 ? toastQueue[0] : null;

  // Gamification state — evolution reveal + gem tracking for CompletionModal
  const [evolutionRevealData, setEvolutionRevealData] = useState<{
    catId: string;
    newStage: import('../../stores/types').EvolutionStage;
  } | null>(null);
  const [gemsEarnedForModal, setGemsEarnedForModal] = useState(0);
  const [chestTypeForModal, setChestTypeForModal] = useState<ChestType>('none');
  const [chestGemsForModal, setChestGemsForModal] = useState(0);
  const [tempoChangeForModal, setTempoChangeForModal] = useState(0);
  const [sessionStartTime] = useState(() => Date.now());

  // Bonus drill state — detected weak pattern for post-completion drill
  const [bonusDrillPattern, setBonusDrillPattern] = useState<WeakPattern | null>(null);

  // Lesson completion celebration state
  const [showLessonComplete, setShowLessonComplete] = useState(false);
  const [lessonCompleteData, setLessonCompleteData] = useState<{
    lessonTitle: string;
    lessonNumber: number;
    exercisesCompleted: number;
    totalExercises: number;
    bestScore: number;
    xpEarned: number;
    starsEarned: number;
    maxStars: number;
    nextLessonTitle?: string;
  } | null>(null);

  /**
   * Handle exercise completion (called by useExercisePlayback hook)
   * Persists score, XP, streak, and lesson progress to the progress store
   */
  const handleExerciseCompletion = useCallback((initialScore: ExerciseScore) => {
    if (!mountedRef.current) return;
    if (playerModeRef.current === 'replay') {
      logger.log('[ExercisePlayer] Ignoring completion during replay mode');
      return;
    }
    const trace = perfTrace('ExerciseCompletion');
    let score = { ...initialScore };

    // Read exercise from ref to avoid stale closure in AI mode
    // (exercise loads async, but ref is always current)
    const ex = exerciseRef.current;

    // Apply ability boosts BEFORE setting finalScore so CompletionModal shows
    // the correct (boosted) values. Previously setFinalScore ran before the boost,
    // causing the modal to display the raw score.
    // Bug #10: Read from ref to avoid stale closure when exercise changes (AI mode)
    const currentAbilityConfig = abilityConfigRef.current;
    if (currentAbilityConfig) {
      // Score boost (cap at 100)
      if (currentAbilityConfig.scoreBoostPercent > 0) {
        const preboostStars = score.stars;
        const boostedOverall = Math.min(100, score.overall + currentAbilityConfig.scoreBoostPercent);
        const boostedStars = (boostedOverall >= ex.scoring.starThresholds[2] ? 3
          : boostedOverall >= ex.scoring.starThresholds[1] ? 2
          : boostedOverall >= ex.scoring.starThresholds[0] ? 1 : 0) as 0 | 1 | 2 | 3;
        // If boost elevated to 3 stars, add the 50 XP perfect bonus that ExerciseValidator missed
        const perfectBonusFromBoost = (boostedStars === 3 && preboostStars < 3) ? 50 : 0;
        score = {
          ...score,
          overall: boostedOverall,
          isPassed: boostedOverall >= ex.scoring.passingScore,
          stars: boostedStars,
          xpEarned: score.xpEarned + perfectBonusFromBoost,
        };
      }
      // XP multiplier
      if (currentAbilityConfig.xpMultiplier > 1) {
        score = { ...score, xpEarned: Math.round(score.xpEarned * currentAbilityConfig.xpMultiplier) };
      }
    }

    // Recompute isNewHighScore after ability boosts.
    // For AI exercises (unique IDs like ai-*, tmpl-*), use skillIdParam as the
    // lookup key — otherwise every AI exercise is always a "new record" since
    // the unique ID has no previous score.
    const progressStateForHighScore = useProgressStore.getState();
    const isAiExercise = ex.id.startsWith('ai-') || ex.id.startsWith('tmpl-');
    const scoreKey = isAiExercise && skillIdParamRef.current ? `ai-skill-${skillIdParamRef.current}` : ex.id;
    let prevHigh = 0;
    let foundPrevScore = false;
    for (const lp of Object.values(progressStateForHighScore.lessonProgress)) {
      const exScore = lp.exerciseScores[scoreKey];
      if (exScore != null && exScore.highScore != null) {
        prevHigh = exScore.highScore;
        foundPrevScore = true;
        break;
      }
    }
    // Only show "NEW RECORD" if there's a previous score to beat AND the current score exceeds it.
    // First-ever attempt is not a "new record" — it's just the initial score.
    score = { ...score, isNewHighScore: foundPrevScore && score.overall > prevHigh };

    // Set finalScore AFTER ability boosts so CompletionModal shows the correct values
    setFinalScore(score);

    // Unlock full-speed two-hand play once the user passes a split exercise
    if (score.isPassed && keyboardMode === 'split' && !useSettingsStore.getState().twoHandSpeedUnlocked) {
      useSettingsStore.getState().unlockTwoHandSpeed();
    }

    // Analytics: track exercise completion
    const failCount = useExerciseStore.getState().failCount;
    analyticsEvents.exercise.completed(ex.id, score.overall, failCount + 1);
    if (!score.isPassed) {
      analyticsEvents.exercise.failed(ex.id, failCount + 1);
    }

    // Build replay plan: set algorithmic plan synchronously so "Review with Salsa"
    // button is immediately visible, then upgrade with Gemini AI in background
    const syncPlan = buildReplayPlanSync(ex, score);
    if (syncPlan) setReplayPlan(syncPlan);

    buildReplayPlan(ex, score).then((plan) => {
      if (mountedRef.current) setReplayPlan(plan);
    }).catch((err) => {
      console.warn('[ExercisePlayer] Async replay plan failed:', err);
    });

    // Track consecutive fails for demo prompt
    // Read ghostNotesEnabled from store directly (not from closure) to avoid stale state
    const currentGhostNotes = useExerciseStore.getState().ghostNotesEnabled;
    if (score.isPassed) {
      useExerciseStore.getState().resetFailCount();
      if (currentGhostNotes) {
        useExerciseStore.getState().incrementGhostNotesSuccessCount();
      }
    } else {
      useExerciseStore.getState().incrementFailCount();
    }

    onExerciseComplete?.(score);

    // Track lesson completion for celebration screen

    // Capture level BEFORE any XP mutations so we can detect level-ups
    const previousLevel = useProgressStore.getState().level;

    // Persist XP and daily goal progress with challenge context
    const progressStore = useProgressStore.getState();
    const todayISO = getTodayDateString();

    // Compute max combo from score details (longest consecutive correct-pitch streak)
    let maxCombo = 0;
    let currentCombo = 0;
    for (const d of score.details) {
      if (d.isCorrectPitch && !d.isMissedNote) {
        currentCombo++;
        if (currentCombo > maxCombo) maxCombo = currentCombo;
      } else {
        currentCombo = 0;
      }
    }

    // Look up exercise category from SkillTree (fall back to skillIdParamRef.current for AI exercises)
    let exerciseCategory: SkillCategory | undefined;
    const skillTreeNode = SKILL_TREE.find(n =>
      n.targetExerciseIds.includes(ex.id) || n.id === ex.id,
    );
    if (skillTreeNode) {
      exerciseCategory = skillTreeNode.category;
    } else if (skillIdParamRef.current) {
      const paramSkill = getSkillById(skillIdParamRef.current);
      exerciseCategory = paramSkill?.category;
    }

    trace.mark('recordPracticeSession');
    // Record practice time BEFORE challenge validation so minutesPracticedToday is accurate
    let elapsedMinutes = 0;
    if (playbackStartTimeRef.current > 0) {
      // Every completed exercise counts as at least 1 minute of practice
      // (same approach as Duolingo — any practice attempt moves the daily goal)
      elapsedMinutes = Math.max(1, Math.ceil((Date.now() - playbackStartTimeRef.current) / 60000));
      progressStore.recordPracticeSession(elapsedMinutes);
    }

    // Read fresh minutesPracticed AFTER recordPracticeSession mutated the store
    // (the todayGoalData snapshot was taken before the mutation and is stale)
    const freshGoalData = useProgressStore.getState().dailyGoalData[todayISO];
    const minutesSoFar = freshGoalData?.minutesPracticed ?? elapsedMinutes;

    // BUG-032 fix: Update streak BEFORE recordExerciseCompletion so that
    // streak milestone checks inside recordExerciseCompletion see the current streak value
    trace.mark('streakUpdate');
    const preCompletionProgressStore = useProgressStore.getState();
    const updatedStreak = calculateStreakUpdate(preCompletionProgressStore.streakData);
    preCompletionProgressStore.updateStreakData(updatedStreak);

    trace.mark('recordExerciseCompletion');
    progressStore.recordExerciseCompletion(ex.id, score.overall, score.xpEarned, {
      score: score.overall,
      maxCombo,
      perfectNotes: score.perfectNotes ?? 0,
      playbackSpeed: useSettingsStore.getState().playbackSpeed,
      category: exerciseCategory,
      minutesPracticedToday: minutesSoFar,
      exerciseTier: ex.metadata?.difficulty ?? 3,
      exerciseType: getExerciseType(ex) ?? 'play',
    });

    trace.mark('lessonProgress');
    // Save exercise score to lesson progress and compute sync data
    let exLessonId = getLessonIdForExercise(ex.id);
    let resolvedExerciseId = ex.id;

    // For AI exercises with a skillId, map completion to the skill's target exercise
    // so it counts toward the real lesson progress — BUT only for lessons the user
    // has already started (not future lessons). Bug #109: AI exercises were writing
    // scores to Lesson 4 when user just completed Lesson 3.
    if (!exLessonId && skillIdParamRef.current) {
      const skillNode = getSkillById(skillIdParamRef.current);
      if (skillNode && skillNode.targetExerciseIds.length > 0) {
        const progressData = useProgressStore.getState().lessonProgress;
        let targetExId: string | null = null;

        // Find first uncompleted target exercise for this skill
        // ONLY in lessons that already have progress (user started them)
        for (const tid of skillNode.targetExerciseIds) {
          const tLessonId = getLessonIdForExercise(tid);
          if (tLessonId) {
            const lp = progressData[tLessonId];
            // Skip lessons with no progress at all (future/unstarted lessons)
            if (!lp) continue;
            if (!lp.exerciseScores[tid]?.completedAt) {
              targetExId = tid;
              break;
            }
          }
        }

        // Fall back to first target exercise if all are already completed
        if (!targetExId) targetExId = skillNode.targetExerciseIds[0];

        const targetLessonId = getLessonIdForExercise(targetExId);
        if (targetLessonId) {
          exLessonId = targetLessonId;
          resolvedExerciseId = targetExId;
        }
      }
    }

    // Use real lesson ID or synthetic "__ai__" bucket for non-lesson exercises
    const effectiveLessonId = exLessonId ?? '_ai_exercises';

    // Use the resolved exercise ID (real target) when mapped to a lesson,
    // or ai-skill-{skillId} for exercises that couldn't be mapped
    const stableExId = exLessonId ? resolvedExerciseId : (isAiExercise && skillIdParamRef.current ? `ai-skill-${skillIdParamRef.current}` : ex.id);

    // Capture whether this exercise was previously completed BEFORE we update lesson progress
    // (used for first-completion gem bonus below)
    const wasPreviouslyCompleted = progressStore.lessonProgress[effectiveLessonId]?.exerciseScores[stableExId]?.completedAt != null;

    let lessonSyncData: {
      lessonId: string;
      status: 'in_progress' | 'completed';
      completedAt?: number;
      exerciseId: string;
      exerciseScore: { highScore: number; stars: number; attempts: number; averageScore: number };
    } | undefined;

    if (true) {
      const lesson = exLessonId ? getLesson(exLessonId) : null;
      const existingLP = progressStore.lessonProgress[effectiveLessonId];

      // Initialize lesson progress if first attempt
      if (!existingLP) {
        progressStore.updateLessonProgress(effectiveLessonId, {
          lessonId: effectiveLessonId,
          status: exLessonId ? 'in_progress' : 'completed',
          exerciseScores: {},
          bestScore: 0,
          totalAttempts: 0,
          totalTimeSpentSeconds: 0,
        });
      }

      // Get fresh state after potential initialization
      const currentLP = useProgressStore.getState().lessonProgress[effectiveLessonId];
      const existingExScore = currentLP?.exerciseScores[stableExId];
      const isNewHighScore = !existingExScore || score.overall > existingExScore.highScore;

      const newHighScore = isNewHighScore ? score.overall : (existingExScore?.highScore ?? score.overall);
      const newStars = isNewHighScore ? score.stars : (existingExScore?.stars ?? score.stars);
      const newAttempts = (existingExScore?.attempts ?? 0) + 1;
      const newAvgScore = existingExScore
        ? (existingExScore.averageScore * existingExScore.attempts + score.overall) / newAttempts
        : score.overall;

      // Save exercise progress using stable key (skillId for AI, exerciseId for static).
      // ALWAYS preserve completedAt from previous attempts — a failed retry must NOT
      // erase the completion status of a previously passed exercise.
      logger.log(`[ExercisePlayer:save] key=${stableExId} lesson=${effectiveLessonId} score=${score.overall} prevHigh=${existingExScore?.highScore ?? 'none'} isNewHigh=${isNewHighScore} isPassed=${score.isPassed} prevCompleted=${existingExScore?.completedAt != null}`);
      const preservedCompletedAt = existingExScore?.completedAt;
      const newCompletedAt = score.isPassed
        ? (preservedCompletedAt ?? Date.now())  // Keep original completion time
        : preservedCompletedAt;                  // Preserve even on failed retry

      progressStore.updateExerciseProgress(effectiveLessonId, stableExId, {
        exerciseId: stableExId,
        highScore: newHighScore,
        stars: newStars,
        attempts: newAttempts,
        lastAttemptAt: Date.now(),
        averageScore: newAvgScore,
        ...(newCompletedAt != null ? { completedAt: newCompletedAt } : {}),
      });

      // Update daily plan completion (plan IS the source of truth for dashboard)
      try {
        const { updatePlanCompletion } = require('../../core/curriculum/DailyPlanManager');
        updatePlanCompletion(
          ex.id,
          skillIdParamRef.current ?? null,
          score.overall,
          score.isPassed,
        );
      } catch (err) {
        logger.warn('[ExercisePlayer] Plan completion update failed:', err);
      }

      // Also save a completion marker in _ai_exercises bucket so HomeScreen's
      // Today's Practice can detect completion via ai-skill-{skillId} key
      if (exLessonId && isAiExercise && skillIdParamRef.current) {
        const aiKey = `ai-skill-${skillIdParamRef.current}`;
        const existingAiScore = useProgressStore.getState().lessonProgress['_ai_exercises']?.exerciseScores[aiKey];
        const aiCompletedAt = score.isPassed
          ? (existingAiScore?.completedAt ?? Date.now())
          : existingAiScore?.completedAt;

        progressStore.updateExerciseProgress('_ai_exercises', aiKey, {
          exerciseId: aiKey,
          highScore: newHighScore,
          stars: newStars,
          attempts: newAttempts,
          lastAttemptAt: Date.now(),
          averageScore: newAvgScore,
          ...(aiCompletedAt != null ? { completedAt: aiCompletedAt } : {}),
        });
      }

      // Build lesson sync data (only for real lessons, not __ai__ bucket)
      if (exLessonId) {
        lessonSyncData = {
          lessonId: exLessonId,
          status: 'in_progress',
          exerciseId: ex.id,
          exerciseScore: { highScore: newHighScore, stars: newStars, attempts: newAttempts, averageScore: newAvgScore, ...(score.isPassed ? { completedAt: existingExScore?.completedAt ?? Date.now() } : {}) },
        };
      }

      // Check lesson completion status (only for real lessons)
      if (exLessonId && lesson && score.isPassed) {
        const updatedLP = useProgressStore.getState().lessonProgress[exLessonId];
        const currentIsTest = isTestExercise(ex.id);

        if (currentIsTest) {
          // Mastery test passed → mark lesson complete
          if (updatedLP?.status !== 'completed') {
            const completedAt = Date.now();
            progressStore.updateLessonProgress(exLessonId, {
              ...updatedLP!,
              status: 'completed',
              completedAt,
            });
            progressStore.addXp(lesson.xpReward);
            analyticsEvents.progress.lessonCompleted(exLessonId, 0);

            if (lessonSyncData) {
              lessonSyncData.status = 'completed';
              lessonSyncData.completedAt = completedAt;
            }

            const nonTestIds = getNonTestExercises(exLessonId).map((e) => e.id);
            const totalStars = nonTestIds.reduce((sum, eid) =>
              sum + (updatedLP?.exerciseScores[eid]?.stars ?? 0), 0) + score.stars;
            const bestScoreInLesson = Math.max(
              score.overall,
              ...nonTestIds.map((eid) => updatedLP?.exerciseScores[eid]?.highScore ?? 0)
            );
            const lessonIndex = getLessons().findIndex(l => l.id === exLessonId);
            // Bug #95 fix: count actually-passed exercises, not just total
            const passedCount = nonTestIds.filter((eid) => {
              const exScore = updatedLP?.exerciseScores[eid];
              const fullEx = getExercise(eid);
              const passing = fullEx?.scoring?.passingScore ?? 70;
              return exScore && exScore.highScore >= passing;
            }).length + 1; // +1 for the mastery test we just passed
            setLessonCompleteData({
              lessonTitle: lesson.metadata.title,
              lessonNumber: lessonIndex + 1,
              exercisesCompleted: passedCount,
              totalExercises: nonTestIds.length + 1,
              bestScore: bestScoreInLesson,
              xpEarned: lesson.xpReward,
              starsEarned: totalStars,
              maxStars: (nonTestIds.length + 1) * 3,
            });
          }
        } else {
          // Non-test exercise: check if all non-test exercises are completed → trigger mastery test
          const nonTestExercises = lesson.exercises.filter((e) => !e.test);
          const allNonTestComplete = nonTestExercises.every((entry) =>
            updatedLP?.exerciseScores[entry.id]?.completedAt != null
          );

          if (allNonTestComplete) {
            // Check if test exercise exists and hasn't been completed yet
            const testEx = getTestExercise(exLessonId);
            if (testEx && !updatedLP?.exerciseScores[testEx.id]?.completedAt) {
              // Mastery test available — CompletionModal will show option to take it
            }
          }
        }
      }
    }

    trace.mark('cloudSync');
    // Sync score + lesson progress to cloud (fire-and-forget, failures retry automatically)
    logger.log(`[ExercisePlayer:sync] Syncing exercise ${ex.id}, score=${score.overall}, stars=${score.stars}, lessonSync=${lessonSyncData ? lessonSyncData.lessonId + '/' + lessonSyncData.status : 'none'}`);
    syncManager.syncAfterExercise(ex.id, {
      overall: score.overall,
      accuracy: score.breakdown.accuracy,
      timing: score.breakdown.timing,
      completeness: score.breakdown.completeness,
      stars: score.stars,
      xpEarned: score.xpEarned,
    }, lessonSyncData).catch((err) => {
      logger.error('[ExercisePlayer:sync] ❌ syncAfterExercise FAILED:', (err as Error)?.message);
      // Silently caught — SyncManager handles retries internally
    });

    trace.mark('learnerProfile');
    // Feed per-note accuracy into learner profile for adaptive learning
    const noteResults = score.details
      .filter((d) => !d.isExtraNote)  // Exclude extra notes (not in exercise)
      .map((d) => ({
        midiNote: d.expected.note,
        accuracy: d.isMissedNote ? 0 : (d.isCorrectPitch ? d.timingScore / 100 : 0),
      }));

    // Track recent exercise for dedup in CurriculumEngine
    useLearnerProfileStore.getState().addRecentExercise(ex.id);
    // Also track skill-based stable ID so CurriculumEngine filters same skill
    if (isAiExercise && skillIdParamRef.current) {
      useLearnerProfileStore.getState().addRecentExercise(`ai-skill-${skillIdParamRef.current}`);
    }

    useLearnerProfileStore.getState().recordExerciseResult({
      tempo: ex.settings.tempo,
      score: score.overall / 100,  // Convert 0-100 to 0.0-1.0
      noteResults,
    });

    // Mark skills as mastered when exercise score meets the skill's mastery threshold
    let skillNodes = getSkillsForExercise(ex.id);
    // AI exercises have runtime IDs that won't match any skill's targetExerciseIds,
    // so fall back to the skillId route param (passed by CurriculumEngine / LevelMap)
    if (skillNodes.length === 0 && skillIdParamRef.current) {
      const paramSkill = getSkillById(skillIdParamRef.current);
      if (paramSkill) skillNodes = [paramSkill];
    }
    logger.log('[ExercisePlayer] Skill mastery check:', {
      exerciseId: ex.id,
      skillId: skillIdParamRef.current,
      skillNodesFound: skillNodes.length,
      scoreOverall: score.overall,
      isPassed: score.isPassed,
      nodeIds: skillNodes.map(n => n.id),
    });
    for (const node of skillNodes) {
      // Record practice attempt (accumulates completionCount for multi-completion skills)
      useLearnerProfileStore.getState().recordSkillPractice(node.id, score.isPassed);
      // Direct mastery when score meets threshold
      if (score.overall / 100 >= node.masteryThreshold && score.isPassed) {
        logger.log('[ExercisePlayer] Mastering skill:', node.id, `(${score.overall}% >= ${node.masteryThreshold * 100}%)`);
        useLearnerProfileStore.getState().markSkillMastered(node.id);
      }
    }

    // Record tier mastery test result when in testModeRef.current + aiMode
    if (testModeRef.current && skillIdParamRef.current) {
      const testSkillNode = getSkillById(skillIdParamRef.current);
      if (testSkillNode) {
        useProgressStore.getState().recordTierTestResult(
          testSkillNode.tier,
          score.isPassed,
          score.overall,
        );
      }
    }

    // Adjust difficulty based on performance (DifficultyEngine owns tempo progression)
    const profileForDiff = useLearnerProfileStore.getState();
    const adjustment = adjustDifficulty(
      {
        tempoRange: profileForDiff.tempoRange,
        skills: profileForDiff.skills,
        totalExercisesCompleted: profileForDiff.totalExercisesCompleted,
      },
      score.overall
    );
    if (adjustment.tempoChange !== 0) {
      const range = profileForDiff.tempoRange;
      useLearnerProfileStore.setState({
        tempoRange: {
          min: Math.max(30, range.min + adjustment.tempoChange),
          max: Math.min(200, range.max + adjustment.tempoChange),
        },
      });
      setTempoChangeForModal(adjustment.tempoChange);
    } else {
      setTempoChangeForModal(0);
    }

    trace.mark('streakAndAchievements');
    // Streak already updated above (before recordExerciseCompletion) — BUG-032 fix

    // Track achievement stats: perfect scores, high scores, notes played
    const achievementState = useAchievementStore.getState();
    if (score.stars === 3) {
      achievementState.recordPerfectScore();
    }
    if (score.overall >= 90) {
      achievementState.recordHighScore();
    }
    // Count played notes from score details (excludes missed notes)
    const playedNoteCount = score.details.filter((d) => d.played !== null).length;
    if (playedNoteCount > 0) {
      achievementState.incrementNotesPlayed(playedNoteCount);
    }

    // Check for newly unlocked achievements
    const currentProgressState = useProgressStore.getState();
    const catEvoState = useCatEvolutionStore.getState();
    const ownedCatIds = catEvoState.ownedCats;
    const catsUnlocked = getOwnedCats(ownedCatIds).length;

    // BUG-030 fix: Populate extras so evolution, gem, time, and session achievements can unlock
    const evoData = catEvoState.evolutionData;
    const evoEntries = Object.values(evoData);
    const gemState = useGemStore.getState();
    const dailyRewardsClaimed = catEvoState.dailyRewards.days.filter((d) => d.claimed).length;

    const exerciseElapsedSeconds = playbackStartTimeRef.current > 0
      ? Math.max(1, Math.round((Date.now() - playbackStartTimeRef.current) / 1000))
      : 0;
    const sessionMins = Math.max(1, Math.round((Date.now() - sessionStartTime) / 60000));

    // Count total abilities unlocked across all cats
    let totalAbilities = 0;
    for (const entry of evoEntries) {
      totalAbilities += entry.abilitiesUnlocked?.length ?? 0;
    }

    const achievementExtras = {
      // Evolution context
      hasCatSelected: !!catEvoState.selectedCatId,
      anyCatEvolvedTeen: evoEntries.some((e) => e.currentStage === 'teen' || e.currentStage === 'adult' || e.currentStage === 'master'),
      anyCatEvolvedAdult: evoEntries.some((e) => e.currentStage === 'adult' || e.currentStage === 'master'),
      anyCatEvolvedMaster: evoEntries.some((e) => e.currentStage === 'master'),
      abilitiesUnlocked: totalAbilities,
      catsOwned: ownedCatIds.length,
      hasChonky: ownedCatIds.includes('chonky-monke'),
      isChonkyMaster: evoData['chonky-monke']?.currentStage === 'master',
      // Gem context
      totalGemsEarned: gemState.totalGemsEarned,
      totalGemsSpent: gemState.totalGemsSpent,
      // Daily reward context
      dailyRewardStreak: catEvoState.dailyRewards.currentDay,
      dailyRewardsTotal: dailyRewardsClaimed,
      // Time context
      fastestExerciseSeconds: exerciseElapsedSeconds,
      sessionMinutes: sessionMins,
    };

    const achievementContext = buildAchievementContext(currentProgressState, catsUnlocked, achievementExtras);
    const newAchievements = achievementState.checkAndUnlock(achievementContext);

    // BUG-028 fix: Queue ALL toast notifications (achievements + level-up + XP)
    // instead of showing only the first one and dropping the rest
    const toasts: Array<{ type: AchievementType; value: number | string }> = [];

    // Queue all newly unlocked achievements
    for (const achievement of newAchievements) {
      const info = getAchievementById(achievement.id);
      if (info) {
        toasts.push({ type: 'star', value: info.title });
      }
    }

    // Queue level-up and/or XP toast
    if (score.xpEarned > 0) {
      const currentLevel = useProgressStore.getState().level;
      if (currentLevel > previousLevel) {
        toasts.push({ type: 'level-up', value: `Level ${currentLevel}!` });
      }
      toasts.push({ type: 'xp', value: score.xpEarned });
    }

    if (toasts.length > 0) {
      setToastQueue(toasts);
    }

    trace.mark('gemsAndRewards');
    // --- Gem earning ---
    const gemStore = useGemStore.getState();

    // First-time completion bonus (captured before lesson progress update above)
    if (score.isPassed && !wasPreviouslyCompleted) {
      gemStore.earnGems(25, 'first-completion');
    }

    // Score-based gem rewards
    let gemsEarned = 0;
    if (score.overall >= 100) {
      gemsEarned = 15;
    } else if (score.overall >= 90) {
      gemsEarned = 5;
    }

    // Apply gem ability bonuses (gem_magnet chance + lucky_gems multiplier)
    if (gemsEarned > 0 && currentAbilityConfig) {
      if (currentAbilityConfig.gemBonusMultiplier > 1 && Math.random() < currentAbilityConfig.gemBonusChance) {
        gemsEarned = Math.round(gemsEarned * currentAbilityConfig.gemBonusMultiplier);
      }
    }

    if (gemsEarned > 0) {
      gemStore.earnGems(gemsEarned, gemsEarned >= 15 ? 'perfect-score' : 'high-score');
    }

    // Track total gems earned (first-completion + score-based) for CompletionModal
    let totalGemsForModal = gemsEarned;
    if (score.isPassed && !wasPreviouslyCompleted) totalGemsForModal += 25;

    // --- Chest rewards (only on passed exercises) ---
    const chestType = score.isPassed ? getChestType(score.stars, !wasPreviouslyCompleted) : 'none' as const;
    const chestReward = getChestReward(chestType);
    if (chestReward.gems > 0) {
      gemStore.earnGems(chestReward.gems, `chest-${ex.id}`);
      totalGemsForModal += chestReward.gems;
    }
    setChestTypeForModal(chestType);
    setChestGemsForModal(chestReward.gems);

    setGemsEarnedForModal(totalGemsForModal);

    trace.mark('catEvolution');
    // --- Cat evolution XP (with evolution detection) ---
    // Use settingsStore.selectedCatId as canonical source (catEvolutionStore may be stale)
    const catEvolutionStore = useCatEvolutionStore.getState();
    const activeCatId = useSettingsStore.getState().selectedCatId || catEvolutionStore.selectedCatId;
    if (activeCatId && score.xpEarned > 0) {
      const prevStage = catEvolutionStore.evolutionData[activeCatId]?.currentStage;
      catEvolutionStore.addEvolutionXp(activeCatId, score.xpEarned);
      const newStage = useCatEvolutionStore.getState().evolutionData[activeCatId]?.currentStage;
      // BUG-025 fix: Only show evolution reveal for genuine stage transitions
      // Require both stages to be defined and different
      if (prevStage && newStage && newStage !== prevStage) {
        setEvolutionRevealData({ catId: activeCatId, newStage });
      }
    }

    // Detect weak patterns from learner profile for Bonus Drill button
    try {
      const profileState = useLearnerProfileStore.getState();
      const weakPatterns = detectWeakPatterns({
        noteAccuracy: profileState.noteAccuracy,
        weakNotes: profileState.weakNotes,
        skills: profileState.skills,
        tempoRange: profileState.tempoRange,
      });
      if (weakPatterns.length > 0) {
        setBonusDrillPattern(weakPatterns[0]); // Use the worst pattern
      }
    } catch (err) {
      logger.warn('[ExercisePlayer] Bonus drill detection failed:', err);
    }

    // --- Friend challenge creation ---
    // Guard: skip if challenge target is the current user (self-challenge prevention)
    if (challengeTarget) {
      const authUser = useAuthStore.getState().user;
      if (authUser && challengeTarget.uid !== authUser.uid) {
        const challengeDoc = {
          id: `challenge-${authUser.uid}-${challengeTarget.uid}-${Date.now()}`,
          fromUid: authUser.uid,
          fromDisplayName: authUser.displayName ?? 'Player',
          fromCatId: useSettingsStore.getState().selectedCatId ?? 'mini-meowww',
          toUid: challengeTarget.uid,
          toDisplayName: challengeTarget.displayName ?? 'Opponent',
          exerciseId: ex.id,
          exerciseTitle: ex.metadata.title,
          fromScore: score.overall,
          toScore: null,
          status: 'pending' as const,
          createdAt: Date.now(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
        };
        useSocialStore.getState().addChallenge(challengeDoc);
        createChallenge(challengeDoc).catch((err) => {
          logger.warn('[ExercisePlayer] Failed to create challenge:', err);
        });
      }
    }

    // --- Friend challenge response (receiver submitting their score) ---
    if (friendChallengeId) {
      updateChallengeResult(friendChallengeId, score.overall).catch((err) => {
        logger.warn('[ExercisePlayer] Failed to submit challenge result:', err);
      });
      // Update local store so UI reflects completion immediately
      const { challenges, setChallenges } = useSocialStore.getState();
      const matchedChallenge = challenges.find((c) => c.id === friendChallengeId);
      setChallenges(challenges.map((c) =>
        c.id === friendChallengeId
          ? { ...c, toScore: score.overall, status: 'completed' as const }
          : c,
      ));

      // --- Resolve gem stake if present ---
      if (matchedChallenge?.gemStake && matchedChallenge.gemStake > 0) {
        // Deduct receiver's stake
        const receiverStakeSpent = useGemStore.getState().spendGems(
          matchedChallenge.gemStake,
          `challenge-stake-${friendChallengeId}`,
        );
        if (!receiverStakeSpent) {
          logger.warn('[ExercisePlayer] Receiver could not afford gem stake — skipping stake resolution');
        } else {
          const authUser = useAuthStore.getState().user;
          resolveChallengeGemStake(
            friendChallengeId,
            matchedChallenge.fromScore,
            score.overall,
            matchedChallenge.fromUid,
            authUser?.uid ?? '',
          ).then((result) => {
            if (result && result.winnerUid === authUser?.uid) {
              // Receiver won — award the pot
              useGemStore.getState().earnGems(result.winnerGems, `challenge-win-${friendChallengeId}`);
              logger.log(`[ExercisePlayer] Challenge won! Earned ${result.winnerGems} gems`);
            }
            // Update local challenge with resolution data
            if (result) {
              useSocialStore.getState().updateChallenge(friendChallengeId, {
                winnerUid: result.winnerUid,
                winnerGems: result.winnerGems,
                resolvedAt: Date.now(),
              });
            }
          }).catch((err) => {
            logger.warn('[ExercisePlayer] Failed to resolve challenge gem stake:', err);
          });
        }
      }
    }

    // Show XP transition overlay first, then navigate to PostExerciseScreen.
    // CompletionModal is kept for replay flow (user returns from replay to completion).
    setShowXPTransition(true);

    if (Platform.OS === 'web') {
      AccessibilityInfo.announceForAccessibility(
        `Exercise complete! Score: ${score.overall}%`
      );
    }

    trace.end();
  }, [onExerciseComplete, challengeTarget, friendChallengeId]);

  // Metronome toggle — defaults to exercise setting, user can toggle during play
  const [metronomeOn, setMetronomeOn] = useState(exercise.settings.metronomeEnabled ?? true);

  // Exercise playback coordination (MIDI + Audio + Scoring)
  const {
    isPlaying,
    currentBeat,
    realtimeBeatRef,
    startPlayback,
    resumePlayback,
    pausePlayback,
    stopPlayback,
    resetPlayback,
    playNote: handleManualNoteOn,
    releaseNote: handleManualNoteOff,
    isMidiReady,
    isAudioReady,
    hasError,
    errorMessage,
    activeInputMethod,
    lastExternalNoteRef,
    externalNoteCount,
  } = useExercisePlayback({
    exercise,
    onComplete: handleExerciseCompletion,
    enableMidi: true,
    enableAudio: true,
    metronomeEnabled: metronomeOn,
    skillId: skillIdParam,
  });

  // UI state (separate from playback logic)
  const [isPaused, setIsPaused] = useState(false);
  const [highlightedKeys, setHighlightedKeys] = useState<Set<number>>(new Set());
  const [expectedNotes, setExpectedNotes] = useState<Set<number>>(new Set());
  // Initialize with screen-based estimates so VerticalPianoRoll renders immediately;
  // onLayout will refine these to exact container measurements.
  const [pianoRollDims, setPianoRollDims] = useState({
    width: screenWidth,
    height: Math.max(200, screenHeight - singleKeyHeight - topBarHeight),
  });
  const ghostNotesEnabled = useExerciseStore(s => s.ghostNotesEnabled);

  // Demo mode state
  const demoServiceRef = useRef(new DemoPlaybackService());
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [demoActiveNotes, setDemoActiveNotes] = useState<Set<number>>(new Set());
  const [demoBeat, setDemoBeat] = useState(0);
  const demoWatched = useExerciseStore(s => s.demoWatched);
  const failCount = useExerciseStore(s => s.failCount);

  // Replay coaching mode state
  const [playerMode, _setPlayerMode] = useState<'exercise' | 'replay'>('exercise');
  const playerModeRef = useRef<'exercise' | 'replay'>('exercise');
  const setPlayerMode = useCallback((mode: 'exercise' | 'replay') => {
    playerModeRef.current = mode;
    _setPlayerMode(mode);
  }, []);
  const [replayPlan, setReplayPlan] = useState<ReplayPlan | null>(null);
  const [replayBeat, setReplayBeat] = useState(0);
  const [replayPaused, setReplayPaused] = useState(false);
  const [replayOverlayMode, setReplayOverlayMode] = useState<'hidden' | 'pill' | 'card'>('hidden');
  const [replayPillText, setReplayPillText] = useState('');
  const [replayCardText, setReplayCardText] = useState('');
  const [replaySectionIndex, setReplaySectionIndex] = useState(0);

  // SalsaIntro state removed — ExerciseLoadingScreen handles pre-exercise coaching

  // Effective beat: during demo, use demo beat; during replay, use replay beat;
  // otherwise use playback hook's beat.
  // Negative beats (count-in) are passed through so VerticalPianoRoll can animate
  // the Tetris-style cascade: notes start above the visible area and fall into view.
  const rawBeat = isDemoPlaying ? demoBeat : playerMode === 'replay' ? replayBeat : currentBeat;
  const effectiveBeat = rawBeat;

  // Build note color overrides for replay mode — maps note index → hex color
  const replayNoteColors = useMemo(() => {
    if (playerMode !== 'replay' || !replayPlan) return undefined;
    const COLOR_MAP: Record<string, string> = {
      green: COLORS.success,
      yellow: COLORS.warning,
      red: COLORS.error,
      grey: COLORS.textSecondary,
      purple: NEON.purple,
    };
    const map = new Map<number, string>();
    replayPlan.entries.forEach((entry, i) => {
      const hex = COLOR_MAP[entry.color];
      if (hex) map.set(i, hex);
    });
    return map;
  }, [playerMode, replayPlan]);

  // During replay, highlight keys that are currently "sounding" based on replayBeat
  const replayHighlightedKeys = useMemo(() => {
    if (playerMode !== 'replay') return undefined;
    const active = new Set<number>();
    for (const note of exercise.notes) {
      if (replayBeat >= note.startBeat && replayBeat < note.startBeat + note.durationBeats) {
        active.add(note.note);
      }
    }
    return active;
  }, [playerMode, replayBeat, exercise.notes]);

  // Update keyboard range based on active window (sticky, low-jitter).
  // Clamp to 0 for keyboard range since exercise notes always have non-negative startBeat.
  const effectiveBeatBucket = Math.floor(Math.max(0, effectiveBeat) * 2) / 2;
  useEffect(() => {
    const windowNotes = exercise.notes
      .filter(n => n.startBeat >= effectiveBeatBucket - 2 && n.startBeat <= effectiveBeatBucket + 8)
      .map(n => n.note);

    if (windowNotes.length === 0) return;

    setKeyboardRange((prev) => {
      const next = computeStickyRange(windowNotes, prev);
      if (next.startNote === prev.startNote && next.octaveCount === prev.octaveCount) {
        return prev;
      }
      return next;
    });
  }, [exercise.id, exercise.notes, effectiveBeatBucket]);

  const keyboardStartNote = keyboardRange.startNote;
  const keyboardOctaveCount = keyboardRange.octaveCount;

  // SalsaIntro useEffect removed — ExerciseLoadingScreen handles pre-exercise coaching

  // Coaching tip for count-in based on learner weaknesses
  const coachingTip = useMemo(() => {
    const prof = useLearnerProfileStore.getState();
    const exerciseNotes = new Set(exercise.notes.map(n => n.note));
    const weakInExercise = prof.weakNotes.filter(n => exerciseNotes.has(n));
    if (weakInExercise.length > 0) {
      return `Focus on ${weakInExercise.slice(0, 2).map(midiToNoteName).join(', ')}`;
    }
    if (prof.skills.timingAccuracy < 0.6) return 'Count along with the beat';
    return exercise.hints?.beforeStart;
  }, [exercise]);

  // Skill target for the intro overlay
  const skillTarget = useMemo(() => {
    const skills = getSkillsForExercise(exercise.id);
    if (skills.length > 0) return skills[0].name;
    // AI exercises: use skillId from route params
    if (skillIdParam) {
      const paramSkill = getSkillById(skillIdParam);
      if (paramSkill) return paramSkill.name;
    }
    return undefined;
  }, [exercise.id, skillIdParam]);

  // Feedback state
  const [feedback, setFeedback] = useState<FeedbackState>({
    type: null,
    noteIndex: -1,
    timestamp: 0,
    timingOffsetMs: 0,
  });
  const [comboCount, setComboCount] = useState(0);
  const comboCountRef = useRef(0); // mirror for use in callbacks without stale closures
  const comboShieldUsedRef = useRef(0); // how many shield misses consumed this exercise


  // Buddy reaction — derived from feedback type + combo
  const buddyReaction: BuddyReaction = useMemo(() => {
    if (!feedback.type) return 'idle';
    if (comboCount >= 5) return 'combo';
    if (feedback.type === 'perfect') return 'perfect';
    if (feedback.type === 'good') return 'good';
    if (feedback.type === 'miss') return 'miss';
    return 'idle';
  }, [feedback.type, comboCount]);

  // Keep comboCountRef in sync for use in callbacks without stale closures
  comboCountRef.current = comboCount;

  // References
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const consumedNoteIndicesRef = useRef<Set<number>>(new Set());
  const shakeRef = useRef<ScreenShakeRef>(null);

  // Refs for values read inside the external-note effect to avoid stale closures.
  // These sync on every render so the effect always reads current values.
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const activeInputMethodRef = useRef(activeInputMethod);
  activeInputMethodRef.current = activeInputMethod;
  const abilityConfigRef = useRef(abilityConfig);
  abilityConfigRef.current = abilityConfig;
  const keyboardModeRef = useRef(keyboardMode);
  keyboardModeRef.current = keyboardMode;
  const splitPointRef = useRef(splitPoint);
  splitPointRef.current = splitPoint;

  // Hit particle state
  const [hitParticle, setHitParticle] = useState<{ x: number; y: number; color: string; trigger: number }>({ x: 0, y: 0, color: COLORS.textPrimary, trigger: 0 });
  // Red flash on miss
  const [showMissFlash, setShowMissFlash] = useState(false);

  // Animation values
  const comboScale = useRef(new Animated.Value(0)).current;

  // Cleanup feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = null;
      }
    };
  }, []);

  // Detect loop restart: when beat jumps backward, reset visual tracking state
  const prevBeatRef = useRef(currentBeat);
  useEffect(() => {
    if (currentBeat < prevBeatRef.current - 1 && isPlaying) {
      // Beat jumped backward significantly — loop restarted
      consumedNoteIndicesRef.current.clear();
      passiveMissedRef.current.clear();
      setComboCount(0);
      comboShieldUsedRef.current = 0;
      setHighlightedKeys(new Set());
      setFeedback({ type: null, noteIndex: -1, timestamp: 0, timingOffsetMs: 0 });
    }
    prevBeatRef.current = currentBeat;
  }, [currentBeat, isPlaying]);

  // Derived state
  const countInComplete = currentBeat >= 0;

  // Track the MIDI note of the next expected note for keyboard auto-scroll.
  // Initialize from the first note so the keyboard starts scrolled correctly.
  const [nextExpectedNote, setNextExpectedNote] = useState<number | undefined>(() => {
    if (exercise.notes.length === 0) return undefined;
    const sorted = [...exercise.notes].sort((a, b) => a.startBeat - b.startBeat);
    return sorted[0].note;
  });
  useEffect(() => {
    // Bug #62 fix: use realtimeBeatRef (60fps) for the beat position so the
    // highlighted "expected" note matches what handleKeyDown's scoring uses.
    // effectiveBeat (20fps) triggers the effect; realtimeBeatRef gives accuracy.
    const beat = realtimeBeatRef?.current ?? effectiveBeat;

    // Find the next unconsumed note(s) at the nearest upcoming beat
    const upcoming = exercise.notes
      .map((note, index) => ({ ...note, index }))
      .filter(
        (note) =>
          !consumedNoteIndicesRef.current.has(note.index) &&
          note.startBeat >= beat - 0.3
      );

    if (upcoming.length === 0) {
      setExpectedNotes(new Set());
      setNextExpectedNote(undefined);
      return;
    }

    // Find the minimum startBeat among upcoming notes
    const minBeat = Math.min(...upcoming.map((n) => n.startBeat));

    // Highlight only notes at that exact beat (handles chords naturally)
    const notesAtMinBeat = upcoming.filter((n) => n.startBeat === minBeat);

    // In testMode, suppress green highlighting but still track for auto-scroll
    setExpectedNotes(testMode ? new Set() : new Set(notesAtMinBeat.map((n) => n.note)));
    setNextExpectedNote(notesAtMinBeat[0].note);
  }, [effectiveBeat, exercise.notes, testMode]);

  // Passive miss detection: fire miss feedback for notes that pass the play line unplayed.
  // This ensures two-hand mode shows "MISS L" when left hand notes are ignored.
  const passiveMissedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!isPlaying || !countInComplete || playerMode === 'replay') return;
    const beat = realtimeBeatRef?.current ?? effectiveBeat;
    // Notes more than 1.5 beats behind current position are missed
    const missThreshold = 1.5;

    for (let i = 0; i < exercise.notes.length; i++) {
      if (consumedNoteIndicesRef.current.has(i)) continue;
      if (passiveMissedRef.current.has(i)) continue;
      const note = exercise.notes[i];
      if (beat - note.startBeat > missThreshold) {
        passiveMissedRef.current.add(i);
        setComboCount(0);
        setFeedback({ type: 'miss', noteIndex: i, timestamp: Date.now(), timingOffsetMs: 0 });
        // Only one passive miss per tick to avoid spamming
        break;
      }
    }
  }, [effectiveBeat, isPlaying, countInComplete, exercise.notes, keyboardMode, splitPoint, playerMode]);

  // Reset passive miss tracking on exercise change or loop restart
  useEffect(() => {
    passiveMissedRef.current.clear();
  }, [exercise.id]);

  // Force keyboard range update when the next expected note is outside the current range
  useEffect(() => {
    if (nextExpectedNote === undefined) return;

    setKeyboardRange((prev) => {
      const rangeMin = prev.startNote;
      const rangeMax = prev.startNote + prev.octaveCount * 12 - 1;
      if (nextExpectedNote >= rangeMin && nextExpectedNote <= rangeMax) {
        return prev;
      }

      // Recenter from a small upcoming window to avoid snapping to a single note
      // in the wrong octave at exercise start.
      const anchorWindowNotes = exercise.notes
        .filter((n) => n.startBeat >= effectiveBeat - 1 && n.startBeat <= effectiveBeat + 4)
        .map((n) => n.note);
      const notesForRange = anchorWindowNotes.length > 0 ? anchorWindowNotes : [nextExpectedNote];
      const next = computeZoomedRange(notesForRange, prev.octaveCount);

      if (next.startNote === prev.startNote && next.octaveCount === prev.octaveCount) {
        return prev;
      }
      return next;
    });
  }, [nextExpectedNote, effectiveBeat, exercise.notes]);

  // Keyboard range for landscape single-keyboard mode (covers all exercise notes)
  // Playback loop is now handled by useExercisePlayback hook

  /**
   * Start exercise playback
   * BUG-004 fix: Guard against double-tap starting two concurrent playback loops
   */
  const isStartingRef = useRef(false);
  const handleStart = useCallback(() => {
    if (isStartingRef.current || isPlaying) return;
    isStartingRef.current = true;

    playbackStartTimeRef.current = Date.now();
    consumedNoteIndicesRef.current.clear(); // Ensure no stale consumed indices from demo or prior partial play
    startPlayback();
    setIsPaused(false);
    setComboCount(0);
    comboShieldUsedRef.current = 0;

    // Reset guard after a tick to allow future starts (e.g. retry)
    setTimeout(() => { isStartingRef.current = false; }, 100);

    // Optional: Announce to screen reader
    if (Platform.OS === 'web') {
      AccessibilityInfo.announceForAccessibility('Exercise started');
    }
  }, [startPlayback, isPlaying]);

  /**
   * Pause/resume exercise playback
   */
  const handlePause = useCallback(() => {
    if (isPaused) {
      resumePlayback();
      setIsPaused(false);
    } else {
      pausePlayback();
      setIsPaused(true);
      analyticsEvents.exercise.paused(exercise.id, currentBeat);
    }

    if (Platform.OS === 'web') {
      const message = !isPaused ? 'Paused' : 'Resumed';
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [isPaused, resumePlayback, pausePlayback]);

  /**
   * Restart exercise
   */
  const handleRestart = useCallback(() => {
    resetPlayback();
    setIsPaused(false);
    setHighlightedKeys(new Set());
    setComboCount(0);
    comboShieldUsedRef.current = 0;
    setFeedback({ type: null, noteIndex: -1, timestamp: 0, timingOffsetMs: 0 });
    consumedNoteIndicesRef.current.clear();

    if (Platform.OS === 'web') {
      AccessibilityInfo.announceForAccessibility('Exercise restarted');
    }
  }, [resetPlayback]);

  /**
   * Start demo playback — pauses exercise, plays at full speed
   * Uses the audio engine singleton directly (not the playback hook bridge)
   * to avoid handle collisions when the same note repeats.
   */
  const startDemo = useCallback(() => {
    // Pause current exercise if playing
    if (isPlaying) {
      pausePlayback();
      setIsPaused(true);
    }

    // Clear consumed note indices so retry after demo starts fresh
    consumedNoteIndicesRef.current.clear();
    setComboCount(0);

    setIsDemoPlaying(true);
    useExerciseStore.getState().setDemoWatched(true);

    // Use the audio engine singleton directly — the demo service has its own
    // per-index handle tracking that correctly handles repeated notes.
    // Going through handleManualNoteOn caused handle collisions because
    // activeNotesRef uses MIDI note number as key (one handle per pitch).
    const audioEngine = createAudioEngine();

    demoServiceRef.current.start(
      exercise,
      audioEngine,
      1.0, // Full speed — demo shows exactly how the piece should sound
      (beat) => {
        // Drive the VerticalPianoRoll during demo via local state
        setDemoBeat(beat);
        useExerciseStore.getState().setCurrentBeat(beat);
      },
      (notes) => setDemoActiveNotes(notes),
      // onComplete: auto-called when demo finishes playing the exercise
      () => {
        setIsDemoPlaying(false);
        setDemoActiveNotes(new Set());
      },
    );
  }, [exercise, isPlaying, pausePlayback]);

  /**
   * Stop demo playback and reset to ready state
   */
  const stopDemo = useCallback(() => {
    demoServiceRef.current.stop();
    setIsDemoPlaying(false);
    setDemoActiveNotes(new Set());
    resetPlayback();
  }, [resetPlayback]);

  /** Navigate to another exercise. Orientation is handled by the useEffect
   *  cleanup (fires portrait) + the new exercise's useEffect (fires landscape
   *  if needed). No explicit orientation change here to avoid flicker. */
  const replaceExercise = useCallback((params: Record<string, unknown>) => {
    (navigation as any).replace('Exercise', params);
  }, [navigation]);

  /**
   * Exit exercise without completing
   * Uses setTimeout to defer navigation, letting state updates settle
   */
  const handleExit = useCallback(async () => {
    stopPlayback();
    exerciseStore.clearSession();
    if (keyboardMode === 'split') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
    setTimeout(() => {
      if (!mountedRef.current) return;
      if (onClose) {
        onClose();
      } else {
        navigation.goBack();
      }
    }, 50);
  }, [stopPlayback, exerciseStore, onClose, navigation, keyboardMode]);

  /**
   * Handle keyboard note press
   * Always provides audio + visual feedback; scoring only during active playback.
   *
   * Uses nearest-note matching instead of a fixed time window:
   * for each key press, find the closest unconsumed note (by beat distance)
   * with matching MIDI pitch. This eliminates dead zones between notes.
   */
  // Only disable keyboard in explicit mic mode — in auto mode, touch keyboard
  // should work alongside mic detection (touch has priority, echoes are deduped).
  const isMicExclusive = preferredInput === 'mic' && activeInputMethod === 'mic';

  const handleKeyDown = useCallback(
    (midiNote: MidiNoteEvent) => {
      if (isDemoPlaying) return; // No user input during demo

      // In explicit mic mode, block all touch keyboard interaction.
      // Playing audio through the speaker creates mic echo that gets double-detected.
      // In auto mode, touch is allowed — echo dedup is handled in useExercisePlayback.
      if (activeInputMethodRef.current === 'mic' &&
          useSettingsStore.getState().preferredInputMethod === 'mic') return;

      // Always play the note for audio feedback (playNote handles scoring guard internally)
      handleManualNoteOn(midiNote.note, midiNote.velocity / 127);

      // Visual feedback
      setHighlightedKeys((prev) => new Set([...prev, midiNote.note]));

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      // Scoring feedback only during active playback.
      // Allow notes up to 1.5 beats before beat 0 — this matches the scoring engine's
      // ±1.5 beat window and prevents the first note from silently missing visual feedback
      // when played slightly early (during the last moment of count-in).
      const matchWindowBeats = 1.5;
      if (!isPlaying || isPaused || realtimeBeatRef.current < -matchWindowBeats) return;

      // Nearest-note matching: find the closest unconsumed note with matching pitch.
      // Uses realtimeBeatRef (60fps) instead of currentBeat (throttled to 20fps)
      // for accurate timing classification.
      const realtimeBeat = realtimeBeatRef.current;
      const msPerBeat = 60000 / exercise.settings.tempo;

      let bestMatch:
        | {
            index: number;
            beatDiffSigned: number;
            startBeat: number;
            matchScore: number;
          }
        | null = null;

      // Bug #93 fix: rhythm/tap exercises should match ANY tap to the nearest note
      // regardless of pitch (tap zone sends note 60, but exercise notes are various pitches).
      const isRhythmTap = exerciseType === 'rhythm';

      for (let i = 0; i < exercise.notes.length; i++) {
        const note = exercise.notes[i];
        if (consumedNoteIndicesRef.current.has(i)) continue; // Already matched
        if (!isRhythmTap && note.note !== midiNote.note) continue; // Wrong pitch (skip for rhythm)

        // Negative = early, positive = late.
        const beatDiffSigned = realtimeBeat - note.startBeat;
        const beatDiffAbs = Math.abs(beatDiffSigned);
        if (beatDiffAbs > matchWindowBeats) continue;

        // Small penalty for matching future notes first; this reduces
        // "skip-a-note" misses in repeated-note patterns.
        const matchScore = beatDiffAbs + (beatDiffSigned < 0 ? 0.1 : 0);

        if (
          !bestMatch ||
          matchScore < bestMatch.matchScore ||
          (matchScore === bestMatch.matchScore && note.startBeat < bestMatch.startBeat)
        ) {
          bestMatch = {
            index: i,
            beatDiffSigned,
            startBeat: note.startBeat,
            matchScore,
          };
        }
      }

      if (bestMatch) {
        // Mark this note as consumed so it can't be matched again
        consumedNoteIndicesRef.current.add(bestMatch.index);

        // Calculate timing offset in milliseconds
        const beatDiffMs = Math.abs(bestMatch.beatDiffSigned) * msPerBeat;

        // Bug #19 fix: align visual feedback thresholds with ExerciseValidator scoring.
        // Scoring gives 100% for anything within timingToleranceMs, so visual should match.
        // Bug #110 fix: the scoring engine (calculateTimingScore) returns 0 for offsets
        // beyond 2× gracePeriodMs. Previously the visual showed "ok" for that range which
        // gave users a false sense of success while the score tanked. Now offsets beyond
        // 2× grace show as a miss (combo-breaking) to match the actual scoring.
        let feedbackType: FeedbackState['type'];
        if (beatDiffMs <= exercise.scoring.timingToleranceMs) {
          feedbackType = 'perfect';
        } else if (beatDiffMs <= exercise.scoring.timingGracePeriodMs * 0.5) {
          feedbackType = 'good';
        } else if (beatDiffMs <= exercise.scoring.timingGracePeriodMs) {
          feedbackType = bestMatch.beatDiffSigned < 0 ? 'early' : 'late';
        } else if (beatDiffMs <= exercise.scoring.timingGracePeriodMs * 2) {
          feedbackType = 'ok';
        } else {
          // Beyond 2× grace period — scoring engine gives 0 timing points.
          // Treat as a miss so visual feedback is honest about the impact on score.
          feedbackType = 'miss';
        }

        // Immediate per-note feedback for all modes
        setFeedback({
          type: feedbackType,
          noteIndex: bestMatch.index,
          timestamp: Date.now(),
          timingOffsetMs: bestMatch.beatDiffSigned * msPerBeat,
        });

        if (feedbackType !== 'miss') {
          setComboCount((prev) => prev + 1);
        } else {
          setComboCount(0);
        }

        // Visual effects always fire immediately (per-note, not per-beat-group)
        if (feedbackType !== 'miss') {
          Animated.sequence([
            Animated.spring(comboScale, { toValue: 1.1, useNativeDriver: true }),
            Animated.spring(comboScale, { toValue: 1, useNativeDriver: true }),
          ]).start();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          const particleColor = feedbackType === 'perfect' ? COLORS.starGold : getFeedbackColor(feedbackType);
          setHitParticle({ x: screenWidth / 2, y: screenHeight * 0.82, color: particleColor, trigger: Date.now() });
        } else {
          shakeRef.current?.shake('medium');
          setHitParticle({ x: screenWidth / 2, y: screenHeight * 0.82, color: COLORS.feedbackMiss, trigger: Date.now() });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }
      } else {
        // Combo shield: forgive the miss if the cat's ability allows it
        const shieldMax = abilityConfigRef.current?.comboShieldMisses ?? 0;
        if (shieldMax > 0 && comboShieldUsedRef.current < shieldMax && comboCountRef.current > 0) {
          comboShieldUsedRef.current++;
          // Shield absorbed the miss — keep combo, show softer feedback
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } else {
          setComboCount(0);
          // Screen shake + red particles on miss
          shakeRef.current?.shake('medium');
          setHitParticle({ x: screenWidth / 2, y: screenHeight * 0.82, color: COLORS.feedbackMiss, trigger: Date.now() });
          setShowMissFlash(true);
          setTimeout(() => { if (mountedRef.current) setShowMissFlash(false); }, 150);
        }
        setFeedback({
          type: 'miss',
          noteIndex: -1,
          timestamp: Date.now(),
          timingOffsetMs: 0,
          hand: keyboardMode === 'split' ? (midiNote.note < splitPoint ? 'left' : 'right') : undefined,
        });

        // Warning haptic for incorrect
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }

      // Clear feedback after delay
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback({ type: null, noteIndex: -1, timestamp: 0, timingOffsetMs: 0 });
      }, 500);
    },
    [
      isDemoPlaying,
      isPlaying,
      isPaused,
      realtimeBeatRef,
      exercise.notes,
      exercise.settings.tempo,
      exercise.scoring.timingToleranceMs,
      exercise.scoring.timingGracePeriodMs,
      comboScale,
      handleManualNoteOn,
      keyboardMode,
      splitPoint,
    ]
  );

  /**
   * Handle keyboard note release
   */
  const handleKeyUp = useCallback(
    (midiNote: number) => {
      // Release note + duration bookkeeping (handled by useExercisePlayback)
      handleManualNoteOff(midiNote);

      // Clear visual feedback
      setHighlightedKeys((prev) => {
        const next = new Set(prev);
        next.delete(midiNote);
        return next;
      });
    },
    [handleManualNoteOff]
  );

  /**
   * Relay external (MIDI/mic) noteOn events to keyboard highlighting + feedback.
   * The playback hook records mic/MIDI events for scoring but doesn't drive the
   * keyboard UI. This effect bridges that gap by calling handleKeyDown when a
   * new external noteOn arrives, giving the user visual + haptic feedback.
   */
  const lastProcessedExternalCountRef = useRef<number>(0);
  useEffect(() => {
    const externalNote = lastExternalNoteRef.current;
    if (!externalNote) return;

    // Dedup by counter (not timestamp — chords produce multiple events at the same ms)
    if (externalNoteCount <= lastProcessedExternalCountRef.current) return;
    lastProcessedExternalCountRef.current = externalNoteCount;

    // Highlight the key.
    // For mic (monophonic), replace all highlights — only one note can be active at a time.
    // This prevents harmonic flukes from lighting up multiple keys simultaneously.
    const isMicMono = activeInputMethodRef.current === 'mic';
    if (isMicMono) {
      setHighlightedKeys(new Set([externalNote.note]));
    } else {
      setHighlightedKeys((prev) => new Set([...prev, externalNote.note]));
    }

    // Auto-release highlight after 300ms (external inputs don't have noteOff keyboard events)
    const releaseTimer = setTimeout(() => {
      setHighlightedKeys((prev) => {
        const next = new Set(prev);
        next.delete(externalNote.note);
        return next;
      });
    }, 300);

    // Trigger feedback scoring (same path as touch, but skip audio since hook handles it).
    // Read from refs to avoid stale closures — this effect only re-runs on externalNoteCount.
    const curIsPlaying = isPlayingRef.current;
    const curIsPaused = isPausedRef.current;
    const curCountInComplete = realtimeBeatRef.current >= 0;
    const curExercise = exerciseRef.current;
    const curInputMethod = activeInputMethodRef.current;

    if (curIsPlaying && !curIsPaused && curCountInComplete) {
      // Feed into the same nearest-note matching for visual feedback.
      // Apply timing multiplier so mic real-time feedback matches final scoring windows.
      const timingMul = TIMING_MULTIPLIER_BY_INPUT[curInputMethod] ?? 1.0;
      const toleranceMs = curExercise.scoring.timingToleranceMs * timingMul;
      const graceMs = curExercise.scoring.timingGracePeriodMs * timingMul;
      const realtimeBeat = realtimeBeatRef.current;
      const msPerBeat = 60000 / curExercise.settings.tempo;

      // Latency compensation: mic pipeline adds ~100ms delay, so by the time
      // the note event arrives, realtimeBeat has advanced past where the user
      // actually played. Shift the effective beat backwards by the pipeline
      // latency so visual feedback matches the actual timing.
      const latencyCompMs = LATENCY_COMP_MS_BY_INPUT[curInputMethod] ?? 0;
      const compensatedBeat = realtimeBeat - (latencyCompMs / msPerBeat);

      // Align with scorer's ±1.5-beat match window (ExerciseValidator.matchNotes)
      const matchWindowBeats = 1.5;

      let bestMatch: { index: number; beatDiffSigned: number; startBeat: number; matchScore: number } | null = null;

      for (let i = 0; i < curExercise.notes.length; i++) {
        const note = curExercise.notes[i];
        if (consumedNoteIndicesRef.current.has(i)) continue;
        if (note.note !== externalNote.note) continue;
        const beatDiffSigned = compensatedBeat - note.startBeat;
        const beatDiffAbs = Math.abs(beatDiffSigned);
        if (beatDiffAbs > matchWindowBeats) continue;
        const matchScore = beatDiffAbs + (beatDiffSigned < 0 ? 0.1 : 0);
        if (!bestMatch || matchScore < bestMatch.matchScore || (matchScore === bestMatch.matchScore && note.startBeat < bestMatch.startBeat)) {
          bestMatch = { index: i, beatDiffSigned, startBeat: note.startBeat, matchScore };
        }
      }

      if (bestMatch) {
        consumedNoteIndicesRef.current.add(bestMatch.index);
        const beatDiffMs = Math.abs(bestMatch.beatDiffSigned) * msPerBeat;
        let feedbackType: FeedbackState['type'];
        if (beatDiffMs <= toleranceMs) feedbackType = 'perfect';
        else if (beatDiffMs <= graceMs) feedbackType = 'good';
        else if (beatDiffMs <= graceMs * 2) feedbackType = bestMatch.beatDiffSigned < 0 ? 'early' : 'late';
        else feedbackType = 'ok';

        setFeedback({ type: feedbackType, noteIndex: bestMatch.index, timestamp: Date.now(), timingOffsetMs: bestMatch.beatDiffSigned * msPerBeat });
        setComboCount((prev) => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        // Wrong note detected — show miss feedback for all input methods.
        // (Mic echo deduplication is handled upstream in InputManager.)
        const shieldMax = abilityConfigRef.current?.comboShieldMisses ?? 0;
        if (shieldMax > 0 && comboShieldUsedRef.current < shieldMax && comboCountRef.current > 0) {
          comboShieldUsedRef.current++;
        } else {
          setComboCount(0);
        }
        const curKeyboardMode = keyboardModeRef.current;
        const curSplitPoint = splitPointRef.current;
        setFeedback({ type: 'miss', noteIndex: -1, timestamp: Date.now(), timingOffsetMs: 0, hand: curKeyboardMode === 'split' ? (externalNote.note < curSplitPoint ? 'left' : 'right') : undefined });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }

      // Clear feedback after delay
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback({ type: null, noteIndex: -1, timestamp: 0, timingOffsetMs: 0 });
      }, 500);
    }

    return () => clearTimeout(releaseTimer);
  // externalNoteCount increments each time a MIDI/mic noteOn arrives
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalNoteCount]);

  // Dev-mode: map laptop keyboard keys to MIDI notes for testing
  const devKeyboardCallback = useCallback(
    (note: number, velocity: number, isNoteOn: boolean) => {
      if (isNoteOn) {
        handleKeyDown({ type: 'noteOn', note, velocity, timestamp: Date.now(), channel: 0 });
      } else {
        handleKeyUp(note);
      }
    },
    [handleKeyDown, handleKeyUp]
  );
  useDevKeyboardMidi(devKeyboardCallback);

  // Determine if there's a next exercise in the lesson
  const lessonId = getLessonIdForExercise(exercise.id);
  const nextExerciseId = lessonId ? getNextExerciseId(lessonId, exercise.id) : null;

  /**
   * Handle completion modal close
   * Dismiss modal first, then exit after a brief delay to avoid animation races
   */
  const handleCompletionClose = useCallback(() => {
    setShowCompletion(false);
    // If lesson was just completed, show the celebration screen before navigating away
    if (lessonCompleteData) {
      // Don't clear lessonCompleteData here — LessonCompleteScreen needs it for rendering.
      // It gets cleared in the onContinue handler.
      setTimeout(() => {
        if (mountedRef.current) {
          setShowLessonComplete(true);
        }
      }, 200);
    } else {
      // Brief delay so the Modal can unmount before we navigate away
      setTimeout(() => {
        if (mountedRef.current) {
          handleExit();
        }
      }, 100);
    }
  }, [handleExit, lessonCompleteData]);

  /**
   * Handle XP transition overlay completion — navigate to PostExerciseScreen
   */
  const handleXPTransitionComplete = useCallback(async () => {
    if (!finalScore || !mountedRef.current) return;
    setShowXPTransition(false);

    // Store completion data in cache for PostExerciseScreen to read.
    // F10 fix: override exercise title with displayTitle so PostExercise
    // shows the skill node name, not Gemini's generated title.
    const exerciseForCache = displayTitle !== exercise.metadata.title
      ? { ...exercise, metadata: { ...exercise.metadata, title: displayTitle } }
      : exercise;
    setPostExerciseData({
      score: finalScore,
      exercise: exerciseForCache,
      gemsEarned: gemsEarnedForModal,
      chestType: chestTypeForModal,
      chestGems: chestGemsForModal,
      sessionMinutes: Math.max(1, Math.round((Date.now() - sessionStartTime) / 60000)),
      tempoChange: tempoChangeForModal,
      failCount: useExerciseStore.getState().failCount,
      challengeSentTo: challengeTarget?.displayName,
      hasNextExercise: !!(aiMode ? true : nextExerciseId),
      hasNextAIExercise: aiMode,
      hasMasteryTest: (() => {
        if (testMode) return false;
        if (aiMode && skillIdParam) {
          const skillNode = getSkillById(skillIdParam);
          if (skillNode) {
            const masteredSkills = useLearnerProfileStore.getState().masteredSkills;
            const tierTestResults = useProgressStore.getState().tierTestResults;
            return isTierMasteryTestAvailable(skillNode.tier, masteredSkills) &&
              !hasTierMasteryTestPassed(skillNode.tier, tierTestResults);
          }
          return false;
        }
        if (isTestExercise(exercise.id)) return false;
        const lid = getLessonIdForExercise(exercise.id);
        if (!lid) return false;
        const lesson = getLesson(lid);
        if (!lesson) return false;
        const lp = useProgressStore.getState().lessonProgress[lid];
        const nonTestExercises = lesson.exercises.filter((e: any) => !e.test);
        const allNonTestComplete = nonTestExercises.every((entry: any) =>
          lp?.exerciseScores[entry.id]?.completedAt != null
        );
        if (!allNonTestComplete) return false;
        const testEx = lesson.exercises.find((e: any) => e.test);
        return !!testEx && !lp?.exerciseScores[testEx.id]?.completedAt;
      })(),
      hasReplay: !!replayPlan,
      hasBonusDrill: !!bonusDrillPattern,
      bonusDrillDescription: bonusDrillPattern?.description,
      exerciseId: exercise.id,
      skillId: skillIdParam ?? undefined,
      exerciseType: exerciseTypeParam ?? undefined,
      nextExerciseId: nextExerciseId ?? undefined,
    });

    // Cache replay plan separately (survives PostExercise → Exercise round trip)
    setReplayPlanCache(replayPlan);

    // If lesson was just completed, show celebration first, then navigate
    if (lessonCompleteData) {
      // Don't clear lessonCompleteData here — LessonCompleteScreen needs it for rendering.
      // It gets cleared in the onContinue handler.
      setTimeout(() => {
        if (mountedRef.current) setShowLessonComplete(true);
      }, 200);
    } else {
      // Rotate to portrait before navigating away from landscape
      if (keyboardMode === 'split') {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
      // Navigate to PostExerciseScreen
      (navigation as any).replace('PostExercise');
    }
  }, [finalScore, exercise, gemsEarnedForModal, chestTypeForModal, chestGemsForModal,
      sessionStartTime, tempoChangeForModal, challengeTarget, aiMode, nextExerciseId,
      testMode, replayPlan, bonusDrillPattern, skillIdParam, exerciseTypeParam,
      lessonCompleteData, navigation, keyboardMode]);

  /**
   * Retry the current exercise after failing
   */
  const handleRetry = useCallback(() => {
    analyticsEvents.replay.skipped(exercise.id);
    setShowCompletion(false);
    setShowXPTransition(false);
    setFinalScore(null);
    handleRestart();
  }, [handleRestart, exercise.id]);

  /**
   * Start replay mode — Salsa's coaching review of the exercise
   */
  /**
   * Start (or restart) replay from a given beat position.
   * For sectioned replays, pass the section's fromBeat.
   */
  const startReplayFromBeat = useCallback((fromBeat: number = 0) => {
    if (!replayPlan) return;
    setShowCompletion(false);
    setPlayerMode('replay');
    setReplayBeat(fromBeat);
    setReplayPaused(false);
    setReplayOverlayMode('hidden');

    const audioEngine = createAudioEngine();

    // Filter plan to only include content within the active section range
    const hasSections = replayPlan.sections.length > 1;
    const activeSection = hasSections ? replayPlan.sections[replaySectionIndex] : null;
    const sectionEnd = activeSection ? activeSection.toBeat : replayPlan.totalBeats;

    demoServiceRef.current.startReplay(replayPlan, exercise.settings.tempo, audioEngine, {
      onBeatUpdate: (beat) => {
        setReplayBeat(beat);
        // Auto-pause at section boundary for sectioned replays
        if (hasSections && beat >= sectionEnd) {
          demoServiceRef.current.stop();
          setReplayPaused(true);
          const isLastSection = replaySectionIndex >= replayPlan.sections.length - 1;
          setReplayOverlayMode('card');
          setReplayCardText(
            isLastSection
              ? replayPlan.summary
              : `Section ${replaySectionIndex + 1} complete. Tap Continue for the next section.`,
          );
        }
      },
      onPausePoint: (pp) => {
        setReplayPaused(true);
        setReplayOverlayMode('card');
        setReplayCardText(pp.explanation);
        ttsService.speak(pp.explanation, { catId: 'salsa' });
      },
      onComment: (comment) => {
        setReplayOverlayMode('pill');
        setReplayPillText(comment.text);
        setTimeout(() => {
          if (mountedRef.current) setReplayOverlayMode('hidden');
        }, 2000);
      },
      onComplete: () => {
        setReplayPaused(true);
        setReplayOverlayMode('card');
        setReplayCardText(replayPlan.summary);
      },
    });

    // If starting from a non-zero beat, seek to that position
    if (fromBeat > 0) {
      demoServiceRef.current.seekReplay(fromBeat);
    }
  }, [replayPlan, exercise.settings.tempo, replaySectionIndex]);

  const startReplay = useCallback(() => {
    if (!replayPlan) return;
    analyticsEvents.replay.triggered(exercise.id, finalScore?.overall ?? 0, false);
    setReplaySectionIndex(0);
    startReplayFromBeat(0);
  }, [replayPlan, exercise.id, finalScore, startReplayFromBeat]);

  // Auto-start replay when navigated with replayMode=true (from PostExerciseScreen)
  // Step 1: Load the cached replay plan into state
  const replayAutoStarted = useRef(false);
  useEffect(() => {
    if (!replayModeParam) return;
    const cached = getReplayPlanCache();
    if (!cached) return;
    replayAutoStarted.current = false;
    setReplayPlan(cached);
    clearReplayPlanCache();
  }, [replayModeParam]);

  // Step 2: Once replayPlan state is set, start playback
  // (separated from step 1 because setReplayPlan is async — the plan
  //  isn't available in the same render tick it was set)
  useEffect(() => {
    if (!replayModeParam || !replayPlan || replayAutoStarted.current) return;
    if (showLoadingScreen) return;
    replayAutoStarted.current = true;
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setPlayerMode('replay');
        setReplaySectionIndex(0);
        startReplayFromBeat(0);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [replayModeParam, replayPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Stop replay. If replay finished naturally, navigate away.
   * If user exits mid-replay, return to CompletionModal.
   */
  const stopReplay = useCallback((replayFinished = false) => {
    demoServiceRef.current.stop();
    ttsService.stop();
    setPlayerMode('exercise');
    setReplayOverlayMode('hidden');

    if (replayFinished) {
      // Replay completed — navigate to next exercise or back home
      if (nextExerciseId && !aiMode) {
        stopPlayback();
        exerciseStore.clearSession();
        setTimeout(() => {
          if (mountedRef.current) {
            replaceExercise({
              exerciseId: nextExerciseId,
              ...(skillIdParam ? { skillId: skillIdParam } : {}),
              ...(exerciseTypeParam ? { exerciseType: exerciseTypeParam } : {}),
            });
          }
        }, 100);
      } else {
        handleExit();
      }
    } else {
      // User exited early — show CompletionModal again
      setShowCompletion(true);
    }
  }, [nextExerciseId, aiMode, stopPlayback, exerciseStore, navigation, skillIdParam, exerciseTypeParam, handleExit]);

  /**
   * Resume replay after a pause point
   */
  const resumeReplay = useCallback(() => {
    setReplayPaused(false);
    setReplayOverlayMode('hidden');
    ttsService.stop();

    if (!replayPlan) return;

    if (replayBeat >= replayPlan.totalBeats) {
      stopReplay(true);
      return;
    }

    // Section boundary: advance to next section
    const hasSections = replayPlan.sections.length > 1;
    if (hasSections) {
      const currentSection = replayPlan.sections[replaySectionIndex];
      if (currentSection && replayBeat >= currentSection.toBeat - 0.5) {
        const nextIndex = replaySectionIndex + 1;
        if (nextIndex < replayPlan.sections.length) {
          setReplaySectionIndex(nextIndex);
          startReplayFromBeat(replayPlan.sections[nextIndex].fromBeat);
          return;
        } else {
          // All sections done
          stopReplay(true);
          return;
        }
      }
    }

    demoServiceRef.current.resumeReplay();
  }, [replayPlan, replayBeat, replaySectionIndex, stopReplay, startReplayFromBeat]);

  /**
   * Seek to a specific beat in the replay timeline
   */
  const handleReplaySeek = useCallback((beat: number) => {
    setReplayBeat(beat);
    demoServiceRef.current.seekReplay(beat);
  }, []);

  /**
   * Toggle replay play/pause
   */
  const handleReplayToggle = useCallback(() => {
    if (replayPaused) {
      resumeReplay();
    } else {
      setReplayPaused(true);
      demoServiceRef.current.pauseReplay();
    }
  }, [replayPaused, resumeReplay]);

  /**
   * Navigate to the next exercise in the lesson
   */
  const handleNextExercise = useCallback(() => {
    if (!nextExerciseId) return;
    setShowCompletion(false);
    stopPlayback();
    exerciseStore.clearSession();
    // Brief delay so modal unmount and state cleanup settle
    setTimeout(() => {
      if (mountedRef.current) {
        replaceExercise({
          exerciseId: nextExerciseId,
          ...(skillIdParam ? { skillId: skillIdParam } : {}),
          ...(exerciseTypeParam ? { exerciseType: exerciseTypeParam } : {}),
        });
      }
    }, 100);
  }, [nextExerciseId, stopPlayback, exerciseStore, navigation, skillIdParam, exerciseTypeParam]);

  /**
   * Navigate to the next AI-generated exercise (AI mode continuation)
   */
  const handleNextAIExercise = useCallback(() => {
    setShowCompletion(false);
    setShowExerciseCard(false);
    stopPlayback();
    exerciseStore.clearSession();

    // Determine which skill to target next:
    // If the current skill is now mastered, advance to the next available skill
    // (prerequisite-aware, cross-tier)
    let nextSkillId = skillIdParam;
    if (skillIdParam) {
      const masteredSkills = useLearnerProfileStore.getState().masteredSkills;
      if (masteredSkills.includes(skillIdParam)) {
        const currentNode = getSkillById(skillIdParam);
        if (currentNode) {
          // First try same tier, then fall back to any available skill
          const available = getAvailableSkills(masteredSkills);
          const sameTier = available.find((s) => s.tier === currentNode.tier);
          const nextTier = available.find((s) => s.tier === currentNode.tier + 1);
          nextSkillId = sameTier?.id ?? nextTier?.id ?? available[0]?.id ?? skillIdParam;
        }
      }
    }

    setTimeout(() => {
      if (mountedRef.current) {
        replaceExercise({
          exerciseId: 'ai-mode',
          aiMode: true,
          ...(nextSkillId ? { skillId: nextSkillId } : {}),
        });
      }
    }, 100);
  }, [stopPlayback, exerciseStore, navigation, skillIdParam]);

  /**
   * Navigate to a bonus drill targeting the learner's weakest pattern.
   * Generates an AI exercise from the detected WeakPattern, with fallback
   * to a template exercise if generation fails.
   */
  const handleBonusDrill = useCallback(async () => {
    if (!bonusDrillPattern) return;

    const drillParams = generateDrillParams(bonusDrillPattern);

    setShowCompletion(false);
    stopPlayback();
    exerciseStore.clearSession();

    try {
      const generated = await generateFreePlayExercise(drillParams);
      if (!mountedRef.current) return;

      if (generated) {
        const drillExercise: Exercise = {
          id: `drill-${bonusDrillPattern.type}-${Date.now()}`,
          version: 1,
          metadata: {
            title: `Drill: ${bonusDrillPattern.description}`,
            description: `Targeted practice for ${bonusDrillPattern.description}`,
            difficulty: (generated.metadata?.difficulty ?? 2) as 1 | 2 | 3 | 4 | 5,
            estimatedMinutes: 2,
            skills: generated.metadata?.skills ?? [],
            prerequisites: [],
          },
          settings: {
            tempo: generated.settings.tempo,
            timeSignature: generated.settings.timeSignature,
            keySignature: generated.settings.keySignature ?? 'C',
            countIn: 4,
            metronomeEnabled: true,
          },
          notes: generated.notes.map((n) => ({
            note: n.note,
            startBeat: n.startBeat,
            durationBeats: n.durationBeats,
            ...(n.hand ? { hand: n.hand as 'left' | 'right' } : {}),
          })),
          scoring: {
            timingToleranceMs: generated.scoring?.timingToleranceMs ?? 80,
            timingGracePeriodMs: 200,
            passingScore: generated.scoring?.passingScore ?? 60,
            starThresholds: (generated.scoring?.starThresholds ?? [70, 85, 95]) as [number, number, number],
          },
          hints: {
            beforeStart: `Focus on ${bonusDrillPattern.description}`,
            commonMistakes: [],
            successMessage: 'Great drill session!',
          },
        };

        // Navigate to new ExercisePlayer with the generated drill
        setTimeout(() => {
          if (mountedRef.current) {
            replaceExercise({
              exerciseId: drillExercise.id,
              aiMode: true,
              bonusDrillExercise: drillExercise,
            });
          }
        }, 100);
        return;
      }
    } catch (error) {
      logger.warn('[ExercisePlayer] Bonus drill generation failed:', error);
    }

    // Fallback: use a template exercise targeting the weak MIDI notes
    if (!mountedRef.current) return;
    const drillDifficulty = Math.max(1, Math.min(3, Math.ceil(bonusDrillPattern.severity * 3))) as 1 | 2 | 3;
    const templateEx = getTemplateExercise(drillDifficulty, bonusDrillPattern.targetMidi);
    if (templateEx) {
      setTimeout(() => {
        if (mountedRef.current) {
          replaceExercise({
            exerciseId: `drill-tmpl-${Date.now()}`,
            aiMode: true,
            bonusDrillExercise: {
              ...templateEx,
              id: `drill-tmpl-${Date.now()}`,
              metadata: {
                ...templateEx.metadata,
                title: `Drill: ${bonusDrillPattern.description}`,
              },
            },
          });
        }
      }, 100);
    }
  }, [bonusDrillPattern, stopPlayback, exerciseStore, navigation]);

  /**
   * Navigate to the mastery test for the current lesson/tier
   */
  const handleStartTest = useCallback(() => {
    // AI mode: navigate to tier mastery test
    if (aiMode && skillIdParam) {
      const skillNode = getSkillById(skillIdParam);
      if (skillNode) {
        const testSkillId = getTierMasteryTestSkillId(skillNode.tier);
        if (testSkillId) {
          setShowCompletion(false);
          stopPlayback();
          exerciseStore.clearSession();
          setTimeout(() => {
            if (mountedRef.current) {
              replaceExercise({
                exerciseId: 'ai-mode',
                aiMode: true,
                testMode: true,
                skillId: testSkillId,
              });
            }
          }, 100);
          return;
        }
      }
    }

    // Static lesson: navigate to test exercise JSON
    const lid = getLessonIdForExercise(exercise.id);
    if (!lid) return;
    const testEx = getTestExercise(lid);
    if (!testEx) return;

    setShowCompletion(false);
    stopPlayback();
    exerciseStore.clearSession();
    setTimeout(() => {
      if (mountedRef.current) {
        replaceExercise({
          exerciseId: testEx.id,
          testMode: true,
          ...(skillIdParam ? { skillId: skillIdParam } : {}),
        });
      }
    }, 100);
  }, [exercise.id, aiMode, stopPlayback, exerciseStore, navigation, skillIdParam]);

  // Determine if we should show "Take Mastery Test" in CompletionModal
  const showMasteryTestButton = useMemo(() => {
    if (testMode) return false; // Already in test mode

    // AI mode: check if all tier skills are mastered and test not yet passed
    if (aiMode && skillIdParam) {
      const skillNode = getSkillById(skillIdParam);
      if (skillNode) {
        const masteredSkills = useLearnerProfileStore.getState().masteredSkills;
        const tierTestResults = useProgressStore.getState().tierTestResults;
        if (
          isTierMasteryTestAvailable(skillNode.tier, masteredSkills) &&
          !hasTierMasteryTestPassed(skillNode.tier, tierTestResults)
        ) {
          return true;
        }
      }
      return false;
    }

    // Static lessons: existing logic
    if (isTestExercise(exercise.id)) return false;
    const lid = getLessonIdForExercise(exercise.id);
    if (!lid) return false;
    const lesson = getLesson(lid);
    if (!lesson) return false;

    const lp = useProgressStore.getState().lessonProgress[lid];
    const nonTestExercises = lesson.exercises.filter((e) => !e.test);
    const allNonTestComplete = nonTestExercises.every((entry) =>
      lp?.exerciseScores[entry.id]?.completedAt != null
    );
    if (!allNonTestComplete) return false;

    const testEx = getTestExercise(lid);
    if (!testEx) return false;
    return !lp?.exerciseScores[testEx.id]?.completedAt;
  }, [exercise.id, aiMode, skillIdParam, testMode, finalScore]); // finalScore dep ensures recalc after score persisted

  // Show error if initialization failed
  if (hasError && errorMessage && !isMidiReady && !isAudioReady) {
    return (
      <SafeAreaView style={styles.container} testID="exercise-player">
        <ErrorDisplay
          title="Initialization Error"
          message={errorMessage}
          onRetry={handleRestart}
          onClose={handleExit}
          testID="exercise-error"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="exercise-player">
      <ComboGlow combo={comboCount} />
      {/* Red flash overlay on miss */}
      {showMissFlash && (
        <ReAnimated.View
          entering={FadeIn.duration(80)}
          style={styles.missFlash}
          pointerEvents="none"
        />
      )}
      {/* Hit particles overlay */}
      <HitParticles x={hitParticle.x} y={hitParticle.y} color={hitParticle.color} trigger={hitParticle.trigger} />
      <ScreenShake ref={shakeRef}>
      {/* Error banner for non-critical errors */}
      {hasError && errorMessage && (isMidiReady || isAudioReady) && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Count-in animation (shows before playback) */}
      {isPlaying && !countInComplete && (
        <CountInAnimation
          countIn={exercise.settings.countIn}
          tempo={exercise.settings.tempo}
          elapsedTime={(currentBeat + exercise.settings.countIn) * (60000 / exercise.settings.tempo)}
          coachingTip={coachingTip}
          testID="exercise-count-in"
        />
      )}

      {/* Demo mode banner */}
      {isDemoPlaying && (
        <View style={styles.demoBanner} testID="demo-banner">
          <Text style={styles.demoBannerText}>Watching Demo</Text>
          <PressableScale onPress={stopDemo} style={styles.tryNowButton} soundOnPress={false}>
            <Text style={styles.tryNowButtonText}>Try Now</Text>
          </PressableScale>
        </View>
      )}

      {/* Vertical stack — top bar, piano roll, keyboard */}
      <View style={styles.mainColumn}>
        {/* Glassmorphism top bar: exit + score + play/pause — hidden during replay */}
        {playerMode !== 'replay' && <GlassmorphismCard
          tint={glowColor(COLORS.background, 0.75)}
          borderColor={glowColor(COLORS.textPrimary, 0.06)}
          borderRadius={16}
          style={StyleSheet.flatten([styles.topBar, isLandscape && styles.topBarCompact])}
        >
          <ExerciseControls
            isPlaying={isPlaying}
            isPaused={isPaused}
            onStart={handleStart}
            onPause={handlePause}
            onRestart={handleRestart}
            onExit={handleExit}
            compact
            testID="exercise-controls"
          />

          {/* Metronome toggle */}
          <PressableScale
            onPress={() => setMetronomeOn((prev) => !prev)}
            style={[styles.metronomePill, metronomeOn && styles.metronomePillActive]}
            testID="metronome-toggle"
            accessibilityLabel={metronomeOn ? 'Metronome on. Tap to turn off.' : 'Metronome off. Tap to turn on.'}
            accessibilityRole="switch"
            soundOnPress={false}
          >
            <MaterialCommunityIcons
              name="metronome"
              size={16}
              color={metronomeOn ? COLORS.primary : COLORS.textSecondary}
            />
          </PressableScale>

          <View style={{ flex: 1 }}>
            <ScoreDisplay
              exercise={exercise}
              currentBeat={effectiveBeat}
              combo={comboCount}
              feedback={feedback.type}
              comboAnimValue={comboScale}
              compact
            />
          </View>

          {/* Active input method badge (MIDI or Mic) */}
          {activeInputMethod !== 'touch' && (
            <View style={styles.inputBadge} testID="exercise-input-badge">
              <MaterialCommunityIcons
                name={activeInputMethod === 'midi' ? 'piano' : 'microphone'}
                size={14}
                color={COLORS.success}
              />
              <Text style={styles.inputBadgeText}>
                {activeInputMethod === 'midi' ? 'MIDI' : 'Mic'}
              </Text>
            </View>
          )}

          {/* Active ability indicators */}
          {activeAbilities.length > 0 && (
            <View style={styles.abilityRow}>
              {activeAbilities.map((a) => (
                <View key={a.id} style={styles.abilityIcon} testID={`ability-${a.id}`}>
                  <MaterialCommunityIcons
                    name={a.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                    size={14}
                    color={COLORS.evolutionGlow}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Speed pill — shows auto-calculated speed based on input method */}
          {(() => {
            const isSpeedLocked = keyboardMode === 'split' && !twoHandSpeedUnlocked;
            return (
              <PressableScale
                style={[styles.speedPill, effectivePlaybackSpeed < 1.0 && styles.speedPillActive, isSpeedLocked && { opacity: 0.6 }]}
                testID="speed-selector"
                soundOnPress={false}
                disabled={requiredPlaybackSpeed != null || isSpeedLocked}
              >
                <Text style={[styles.speedPillText, effectivePlaybackSpeed < 1.0 && styles.speedPillTextActive]}>
                  {isSpeedLocked ? `🔒 ${exercise.settings.tempo}` : `${exercise.settings.tempo} BPM`}
                </Text>
              </PressableScale>
            );
          })()}
        </GlassmorphismCard>}

        {/* Secondary controls — visible when not playing or paused, hidden during replay */}
        {playerMode !== 'replay' && (!isPlaying || isPaused) && (
          <View style={styles.secondaryBar} testID="secondary-controls">
            <HintDisplay
              hints={testMode ? { beforeStart: 'Mastery test — play from memory!', commonMistakes: [], successMessage: '' } : exercise.hints}
              isPlaying={isPlaying}
              countInComplete={countInComplete}
              feedback={feedback.type}
              timingOffsetMs={feedback.timingOffsetMs}
              compact
            />

            <View style={{ flex: 1 }} />

            {/* Speed display — auto-calculated based on input method */}
            {(() => {
              const isSpeedLocked = keyboardMode === 'split' && !twoHandSpeedUnlocked;
              return (
                <PressableScale
                  style={[styles.speedPill, effectivePlaybackSpeed < 1.0 && styles.speedPillActive, isSpeedLocked && { opacity: 0.6 }]}
                  testID="speed-selector-full"
                  accessibilityLabel={isSpeedLocked ? `Tempo locked at ${exercise.settings.tempo} BPM for two-hand exercises. Pass once to unlock.` : `Tempo ${exercise.settings.tempo} BPM`}
                  soundOnPress={false}
                  disabled={isSpeedLocked}
                >
                  <Text style={[styles.speedPillText, effectivePlaybackSpeed < 1.0 && styles.speedPillTextActive]}>
                    {isSpeedLocked ? `🔒 ${exercise.settings.tempo}` : `${exercise.settings.tempo} BPM`}
                  </Text>
                </PressableScale>
              );
            })()}

            {/* Demo button */}
            <PressableScale
              onPress={isDemoPlaying ? stopDemo : startDemo}
              style={[styles.speedPill, isDemoPlaying && styles.speedPillActive]}
              testID="demo-button"
              soundOnPress={false}
            >
              <Text style={[styles.speedPillText, isDemoPlaying && styles.speedPillTextActive]}>
                {isDemoPlaying ? 'Stop' : 'Demo'}
              </Text>
            </PressableScale>

            {/* Ghost notes toggle — visible after demo watched */}
            {demoWatched && (
              <PressableScale
                onPress={() => useExerciseStore.getState().setGhostNotesEnabled(!ghostNotesEnabled)}
                style={[styles.speedPill, ghostNotesEnabled && styles.speedPillActive]}
                testID="ghost-toggle"
                soundOnPress={false}
              >
                <Text style={[styles.speedPillText, ghostNotesEnabled && styles.speedPillTextActive]}>
                  Ghost
                </Text>
              </PressableScale>
            )}
          </View>
        )}

        {/* Sight reading badge */}
        {isSightReading && (
          <SightReadingOverlay testID="sight-reading-badge" />
        )}

        {/* Center: Vertical piano roll fills remaining vertical space */}
        <View style={[styles.pianoRollContainer, keyboardMode === 'split' && { minHeight: 120 }]} onLayout={(e) => {
          setPianoRollDims({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          });
        }}>
          {pianoRollDims.width > 0 && (
            <VerticalPianoRoll
              notes={exercise.notes}
              currentBeat={effectiveBeat}
              tempo={exercise.settings.tempo}
              timeSignature={exercise.settings.timeSignature}
              containerWidth={pianoRollDims.width}
              containerHeight={pianoRollDims.height}
              midiMin={keyboardStartNote}
              midiMax={keyboardStartNote + keyboardOctaveCount * 12}
              ghostNotes={playerMode !== 'replay' && ghostNotesEnabled ? exercise.notes : undefined}
              ghostBeatOffset={2}
              timingGracePeriodMs={exercise.scoring.timingGracePeriodMs}
              noteColorOverrides={replayNoteColors}
              testID="exercise-piano-roll"
            />
          )}
          {/* Buddy cat companion — floating in corner (hidden in landscape to save space) */}
          {isPlaying && !isLandscape && (
            <View style={styles.buddyOverlay}>
              <ExerciseBuddy
                catId={selectedCatId ?? 'mini-meowww'}
                reaction={buddyReaction}
                comboCount={comboCount}
              />
            </View>
          )}

          {/* Ear training: listen overlay during demo */}
          {exerciseType === 'earTraining' && isDemoPlaying && (
            <ListenPhaseOverlay
              isListening={isDemoPlaying}
              onDismiss={() => {}}
              testID="ear-training-overlay"
            />
          )}
        </View>

        {/* Call/response phase indicator */}
        {exerciseType === 'callResponse' && (
          <CallResponsePhase
            phase={callResponsePhase}
            onPhaseChange={setCallResponsePhase}
            testID="call-response-phase"
          />
        )}

        {/* Timing feedback overlay between piano roll and keyboard — hidden during replay */}
        {playerMode !== 'replay' && feedback.type && (
          <View style={styles.feedbackOverlay}>
            <FeedbackText
              type={feedback.type}
              trigger={feedback.timestamp}
              timingOffsetMs={feedback.timingOffsetMs}
            />
            <ComboMeter combo={comboCount} />
          </View>
        )}

        {/* Chord prompt (chordId exercises) */}
        {exerciseType === 'chordId' && (
          <ChordPrompt
            chordName={currentChordName}
            isCorrect={chordCorrect}
            testID="chord-prompt"
          />
        )}

        {/* Bottom: Full-width keyboard (split or normal), or RhythmTapZone for rhythm exercises */}
        {exerciseType === 'rhythm' ? (
          <View style={{ height: singleKeyHeight, minHeight: 120 }}>
            <RhythmTapZone
              onTap={() => handleKeyDown({ type: 'noteOn', note: 60, velocity: 100, timestamp: Date.now(), channel: 0 })}
              enabled={isPlaying && !isPaused && playerMode !== 'replay'}
              testID="rhythm-tap-zone"
            />
          </View>
        ) : (
        <View
          style={[
            styles.keyboardContainer,
            { height: keyboardMode === 'split'
              ? Math.round(singleKeyHeight * 0.75) * 2 + 4
              : singleKeyHeight },
          ]}
        >
          {keyboardMode === 'split' ? (
            <SplitKeyboard
              notes={exercise.notes}
              splitPoint={splitPoint}
              onNoteOn={handleKeyDown}
              onNoteOff={handleKeyUp}
              highlightedNotes={replayHighlightedKeys ?? (isDemoPlaying ? demoActiveNotes : highlightedKeys)}
              expectedNotes={playerMode === 'replay' ? new Set<number>() : expectedNotes}
              enabled={playerMode !== 'replay' && !isMicExclusive && !(exerciseType === 'callResponse' && callResponsePhase === 'call')}
              hapticEnabled={playerMode !== 'replay'}
              showLabels={!isSightReading && !testModeRef.current}
              keyHeight={singleKeyHeight}
              focusNoteLeft={focusNoteLeft}
              focusNoteRight={focusNoteRight}
              testID="exercise-keyboard"
            />
          ) : (
            <Keyboard
              startNote={keyboardStartNote}
              octaveCount={keyboardOctaveCount}
              onNoteOn={handleKeyDown}
              onNoteOff={handleKeyUp}
              highlightedNotes={replayHighlightedKeys ?? (isDemoPlaying ? demoActiveNotes : highlightedKeys)}
              expectedNotes={playerMode === 'replay' ? new Set<number>() : expectedNotes}
              enabled={playerMode !== 'replay' && !isMicExclusive && !(exerciseType === 'callResponse' && callResponsePhase === 'call')}
              hapticEnabled={playerMode !== 'replay'}
              showLabels={!isSightReading && !testModeRef.current}
              scrollable={true}
              scrollEnabled={false}
              focusNote={isPlaying ? undefined : nextExpectedNote}
              keyHeight={singleKeyHeight}
              testID="exercise-keyboard"
            />
          )}
        </View>
        )}
      </View>
      </ScreenShake>

      {/* Quick exercise card (between exercises in a lesson or AI mode) */}
      {showExerciseCard && finalScore && (
        <ExerciseCard
          score={finalScore.overall}
          stars={finalScore.stars}
          xpEarned={finalScore.xpEarned}
          isPassed={finalScore.isPassed}
          exerciseTitle={exercise.metadata.title}
          nextExerciseTitle={
            aiMode ? 'Next AI Exercise' : (nextExerciseId ? getExercise(nextExerciseId)?.metadata.title : undefined)
          }
          tip={getTipForScore(finalScore.overall).text}
          funFact={exerciseCardFunFact}
          onNext={() => {
            setShowExerciseCard(false);
            if (aiMode) {
              handleNextAIExercise();
            } else {
              handleNextExercise();
            }
          }}
          onRetry={() => {
            setShowExerciseCard(false);
            handleRetry();
          }}
          autoDismissMs={5000}
        />
      )}

      {/* Achievement toast (XP, level-up) */}
      {toastData && (
        <AchievementToast
          type={toastData.type}
          value={toastData.value}
          onDismiss={() => setToastQueue((q) => q.slice(1))}
          autoDismissMs={3000}
        />
      )}

      {/* Lesson completion celebration (full-screen) */}
      {showLessonComplete && lessonCompleteData && (
        <LessonCompleteScreen
          {...lessonCompleteData}
          onContinue={() => {
            setShowLessonComplete(false);
            setLessonCompleteData(null);
            handleExit();
          }}
        />
      )}

      {/* Bug #100 fix: Unified pre-exercise screen for both AI and static exercises.
          Phase 1 = Salsa tip while loading → Phase 2 = exercise intro with "Let's Go!" */}
      {showLoadingScreen && (
        <ExerciseLoadingScreen
          visible={showLoadingScreen}
          exerciseReady={exerciseReady}
          exercise={exerciseReady ? exercise : null}
          onReady={() => {
            setShowLoadingScreen(false);
            handleStart();
          }}
          onWatchFirst={() => {
            setShowLoadingScreen(false);
            startDemo();
          }}
          skillTarget={skillTarget}
        />
      )}

      {/* XP Transition Overlay — gamification celebration before PostExerciseScreen */}
      {showXPTransition && finalScore && (
        <XPTransitionOverlay
          score={finalScore}
          gemsEarned={gemsEarnedForModal}
          chestType={chestTypeForModal}
          chestGems={chestGemsForModal}
          tempoChange={tempoChangeForModal}
          evolutionData={evolutionRevealData}
          onComplete={handleXPTransitionComplete}
          testID="xp-transition"
        />
      )}

      {/* Completion modal — kept for replay flow (user exits replay early → shows modal) */}
      {showCompletion && finalScore && (
        <CompletionModal
          score={finalScore}
          exercise={exercise}
          onClose={handleCompletionClose}
          onRetry={handleRetry}
          onNextExercise={aiMode ? handleNextAIExercise : (nextExerciseId ? handleNextExercise : undefined)}
          onStartTest={showMasteryTestButton ? handleStartTest : undefined}
          onStartDemo={failCount >= (abilityConfig?.ghostNotesFailThreshold ?? 3) && !demoWatched ? () => {
            setShowCompletion(false);
            setFinalScore(null);
            startDemo();
          } : undefined}
          isTestMode={testMode}
          testID="completion-modal"
          gemsEarned={gemsEarnedForModal}
          chestType={chestTypeForModal}
          chestGems={chestGemsForModal}
          sessionMinutes={Math.max(1, Math.round((Date.now() - sessionStartTime) / 60000))}
          tempoChange={tempoChangeForModal}
          failCount={failCount}
          onStartReplay={replayPlan ? startReplay : undefined}
          onBonusDrill={bonusDrillPattern ? handleBonusDrill : undefined}
          bonusDrillDescription={bonusDrillPattern?.description}
          challengeSentTo={challengeTarget?.displayName}
        />
      )}

      {/* Replay mode UI — Salsa's coaching review */}
      {playerMode === 'replay' && replayPlan && (
        <>
          {/* Replay top bar */}
          <View style={styles.replayTopBar}>
            <PressableScale
              onPress={() => stopReplay(false)}
              style={styles.replayExitButton}
              testID="replay-exit"
              soundOnPress={false}
            >
              <MaterialCommunityIcons name="close" size={20} color={COLORS.textPrimary} />
              <Text style={styles.replayExitText}>Exit Review</Text>
            </PressableScale>
            <Text style={styles.replayTitle}>Salsa&apos;s Review</Text>
            <View style={{ width: 100 }} />
          </View>

          {/* Section navigation for long exercises */}
          {replayPlan.sections.length > 1 && (
            <View style={styles.replaySectionBar}>
              {replayPlan.sections.map((section) => {
                const isActive = section.index === replaySectionIndex;
                const hasIssues = section.issueCount > 0;
                return (
                  <PressableScale
                    key={section.index}
                    onPress={() => {
                      setReplaySectionIndex(section.index);
                      demoServiceRef.current.stop();
                      startReplayFromBeat(section.fromBeat);
                    }}
                    style={[
                      styles.replaySectionPill,
                      isActive && styles.replaySectionPillActive,
                      hasIssues && !isActive && styles.replaySectionPillIssues,
                    ]}
                    soundOnPress={false}
                  >
                    <Text style={[
                      styles.replaySectionPillText,
                      isActive && styles.replaySectionPillTextActive,
                    ]}>
                      {section.index + 1}
                    </Text>
                    {hasIssues && (
                      <View style={styles.replaySectionIssueDot} />
                    )}
                  </PressableScale>
                );
              })}
            </View>
          )}

          {/* Replay timeline bar */}
          <ReplayTimelineBar
            entries={replayPlan.entries}
            pausePoints={replayPlan.pausePoints}
            totalBeats={replayPlan.totalBeats}
            currentBeat={replayBeat}
            elapsedTime={formatReplayTime(replayBeat, exercise.settings.tempo)}
            totalTime={formatReplayTime(replayPlan.totalBeats, exercise.settings.tempo)}
            onSeek={handleReplaySeek}
            isPaused={replayPaused}
            onTogglePlayPause={handleReplayToggle}
          />

          {/* Replay coaching overlay (pill or card) */}
          <ReplayOverlay
            mode={replayOverlayMode}
            pillText={replayPillText}
            cardText={replayCardText}
            onShowCorrect={() => {
              const currentPP = replayPlan.pausePoints.find(
                pp => pp.beatPosition <= replayBeat + 0.5 && !replayPlan.pausePoints.some(
                  other => other.beatPosition > pp.beatPosition && other.beatPosition <= replayBeat + 0.5
                )
              );

              if (currentPP && currentPP.showCorrectFromBeat != null && currentPP.showCorrectToBeat != null) {
                const miniNotes = exercise.notes.filter(
                  n => n.startBeat >= currentPP.showCorrectFromBeat &&
                       n.startBeat < currentPP.showCorrectToBeat
                ).map(n => ({
                  ...n,
                  startBeat: n.startBeat - currentPP.showCorrectFromBeat,
                }));

                if (miniNotes.length > 0) {
                  ttsService.stop();
                  setReplayOverlayMode('hidden');
                  const audioEngine = createAudioEngine();
                  demoServiceRef.current.start(
                    { notes: miniNotes, settings: exercise.settings },
                    audioEngine,
                    0.7,
                    (beat) => setReplayBeat(currentPP.showCorrectFromBeat + beat),
                    undefined,
                    () => resumeReplay(),
                  );
                  return;
                }
              }
              resumeReplay();
            }}
            onContinue={resumeReplay}
          />
        </>
      )}

      {/* Evolution reveal overlay — shown when cat evolves from XP earned */}
      {evolutionRevealData && (
        <EvolutionReveal
          catId={evolutionRevealData.catId}
          newStage={evolutionRevealData.newStage}
          onDismiss={() => setEvolutionRevealData(null)}
        />
      )}

      {/* Rank promotion/demotion overlay — shown after tier change */}
      <RankChangeOverlay
        visible={pendingRankChange != null}
        fromTier={pendingRankChange?.fromTier ?? 'novice'}
        toTier={pendingRankChange?.toTier ?? 'novice'}
        isPromotion={pendingRankChange?.isPromotion ?? true}
        onDismiss={clearPendingRankChange}
      />
    </SafeAreaView>
  );
};

ExercisePlayer.displayName = 'ExercisePlayer';

/** Convert beat position to a time string like "0:04" */
function formatReplayTime(beat: number, bpm: number): string {
  const seconds = Math.round((beat / bpm) * 60);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorBanner: {
    backgroundColor: glowColor(COLORS.warning, 0.15),
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: glowColor(COLORS.warning, 0.3),
  },
  errorText: {
    color: COLORS.warning,
    fontSize: 12,
    textAlign: 'center',
  },
  mainColumn: {
    flex: 1,
    flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    marginTop: 4,
    gap: 8,
  },
  topBarCompact: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minHeight: 40,
  },
  secondaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    gap: 8,
  },
  pianoRollContainer: {
    flex: 1,
    minHeight: 180,
    marginTop: 4,
    marginHorizontal: 4,
  },
  buddyOverlay: {
    position: 'absolute',
    top: 4,
    right: 8,
    zIndex: 10,
  },
  feedbackOverlay: {
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: glowColor(COLORS.background, 0.9),
  },
  missFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: glowColor(COLORS.error, 0.12),
    zIndex: 4,
  },
  keyboardContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  metronomePill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  metronomePillActive: {
    backgroundColor: glowColor(COLORS.primary, 0.15),
    borderColor: COLORS.primary,
  },
  speedPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  speedPillActive: {
    backgroundColor: glowColor(COLORS.primary, 0.15),
    borderColor: COLORS.primary,
  },
  speedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  speedPillTextActive: {
    color: COLORS.primary,
  },
  demoBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: glowColor(COLORS.primary, 0.15),
    borderBottomWidth: 1,
    borderBottomColor: glowColor(COLORS.primary, 0.3),
    gap: 12,
  },
  demoBannerText: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
  tryNowButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: glowColor(COLORS.primary, 0.3),
  },
  tryNowButtonText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  // Input method badge
  inputBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: glowColor(COLORS.success, 0.15),
    borderWidth: 1,
    borderColor: glowColor(COLORS.success, 0.3),
  },
  inputBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.success,
  },
  // Active ability indicators
  abilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  abilityIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: glowColor(NEON.purple, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  replayTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingTop: 48,
    backgroundColor: COLORS.surfaceOverlay,
    zIndex: 200,
  },
  replayExitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
  },
  replayExitText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  replayTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  replaySectionBar: {
    position: 'absolute',
    top: 88,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    zIndex: 200,
  },
  replaySectionPill: {
    width: 32,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  replaySectionPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  replaySectionPillIssues: {
    borderColor: COLORS.warning,
  },
  replaySectionPillText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  replaySectionPillTextActive: {
    color: '#FFFFFF',
  },
  replaySectionIssueDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
  },
});

export default ExercisePlayer;

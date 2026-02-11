/**
 * Custom hooks for common store patterns
 * These hooks provide convenient ways to use store state and derived values
 *
 * No React component imports - these are pure utility hooks
 */

import { useExerciseStore } from './exerciseStore';
import { useProgressStore } from './progressStore';
import { useSettingsStore } from './settingsStore';
import { getLevelProgress } from '@/core/progression/XpSystem';
import type { LevelProgressInfo } from './types';

/**
 * ============================================================================
 * EXERCISE HOOKS
 * ============================================================================
 */

/**
 * Get current session duration in seconds
 */
export function useExerciseSessionDuration(): number {
  const sessionStartTime = useExerciseStore((state) => state.sessionStartTime);
  const sessionEndTime = useExerciseStore((state) => state.sessionEndTime);

  if (!sessionStartTime) return 0;
  const endTime = sessionEndTime || Date.now();
  return Math.round((endTime - sessionStartTime) / 1000);
}

/**
 * Get number of notes played in current session
 */
export function useExerciseNotesPlayed(): number {
  return useExerciseStore((state) => state.playedNotes.length);
}

/**
 * Check if exercise is in progress
 */
export function useExerciseInProgress(): boolean {
  const isPlaying = useExerciseStore((state) => state.isPlaying);
  const currentExercise = useExerciseStore((state) => state.currentExercise);
  return isPlaying && currentExercise !== null;
}

/**
 * Get exercise completion percentage
 */
export function useExerciseCompletionPercent(): number {
  const currentExercise = useExerciseStore((state) => state.currentExercise);
  const currentNoteIndex = useExerciseStore((state) => state.currentBeat);

  if (!currentExercise || currentExercise.notes.length === 0) {
    return 0;
  }

  return Math.round((currentNoteIndex / currentExercise.notes.length) * 100);
}

/**
 * ============================================================================
 * PROGRESS HOOKS
 * ============================================================================
 */

/**
 * Get detailed level progress information
 */
export function useLevelProgress(): LevelProgressInfo {
  const totalXp = useProgressStore((state) => state.totalXp);
  return getLevelProgress(totalXp) as LevelProgressInfo;
}

/**
 * Check if daily goal is complete
 */
export function useDailyGoalComplete(): boolean {
  const today = new Date().toISOString().split('T')[0];
  const dailyGoal = useProgressStore((state) => state.dailyGoalData[today]);
  return dailyGoal?.isComplete ?? false;
}

/**
 * Get today's practice minutes
 */
export function useTodaysPracticeDuration(): number {
  const today = new Date().toISOString().split('T')[0];
  const dailyGoal = useProgressStore((state) => state.dailyGoalData[today]);
  return dailyGoal?.minutesPracticed ?? 0;
}

/**
 * Get today's completed exercises count
 */
export function useTodaysExercisesCompleted(): number {
  const today = new Date().toISOString().split('T')[0];
  const dailyGoal = useProgressStore((state) => state.dailyGoalData[today]);
  return dailyGoal?.exercisesCompleted ?? 0;
}

/**
 * Check if user has an active streak
 */
export function useHasActiveStreak(): boolean {
  const streakData = useProgressStore((state) => state.streakData);
  return streakData.currentStreak > 0;
}

/**
 * Get streak freeze information
 */
export function useStreakFreezes(): { available: number; used: number } {
  const streakData = useProgressStore((state) => state.streakData);
  return {
    available: streakData.freezesAvailable,
    used: streakData.freezesUsed,
  };
}

/**
 * ============================================================================
 * SETTINGS HOOKS
 * ============================================================================
 */

/**
 * Get all audio settings as a bundle
 */
export function useAudioSettings() {
  return useSettingsStore((state) => ({
    masterVolume: state.masterVolume,
    soundEnabled: state.soundEnabled,
    hapticEnabled: state.hapticEnabled,
    metronomeVolume: state.metronomeVolume,
    keyboardVolume: state.keyboardVolume,
    audioBufferSize: state.audioBufferSize,
  }));
}

/**
 * Get all display settings as a bundle
 */
export function useDisplaySettings() {
  return useSettingsStore((state) => ({
    showFingerNumbers: state.showFingerNumbers,
    showNoteNames: state.showNoteNames,
    preferredHand: state.preferredHand,
    darkMode: state.darkMode,
    showPianoRoll: state.showPianoRoll,
    showStaffNotation: state.showStaffNotation,
  }));
}

/**
 * Get all notification settings as a bundle
 */
export function useNotificationSettings() {
  return useSettingsStore((state) => ({
    reminderTime: state.reminderTime,
    reminderEnabled: state.reminderEnabled,
    dailyGoalMinutes: state.dailyGoalMinutes,
    completionNotifications: state.completionNotifications,
  }));
}

/**
 * Get MIDI device configuration
 */
export function useMidiDevice() {
  return useSettingsStore((state) => ({
    deviceId: state.lastMidiDeviceId,
    deviceName: state.lastMidiDeviceName,
    autoConnect: state.autoConnectMidi,
  }));
}

/**
 * ============================================================================
 * MULTI-STORE HOOKS
 * ============================================================================
 */

/**
 * Get full user profile information
 */
export function useUserProfile() {
  const level = useProgressStore((state) => state.level);
  const totalXp = useProgressStore((state) => state.totalXp);
  const streakData = useProgressStore((state) => state.streakData);
  const levelProgress = getLevelProgress(totalXp);

  return {
    level,
    totalXp,
    currentStreak: streakData.currentStreak,
    longestStreak: streakData.longestStreak,
    nextLevelProgress: levelProgress.percentToNextLevel,
    xpToNextLevel: levelProgress.xpToNextLevel,
  };
}

/**
 * Get learning preferences summary
 */
export function useLearningPreferences() {
  const hand = useSettingsStore((state) => state.preferredHand);
  const showFingerNumbers = useSettingsStore((state) => state.showFingerNumbers);
  const showNoteNames = useSettingsStore((state) => state.showNoteNames);
  const dailyGoal = useSettingsStore((state) => state.dailyGoalMinutes);

  return {
    preferredHand: hand,
    showFingerNumbers,
    showNoteNames,
    dailyGoalMinutes: dailyGoal,
  };
}

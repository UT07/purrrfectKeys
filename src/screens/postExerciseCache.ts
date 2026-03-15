/**
 * Temporary cache for passing completion data from ExercisePlayer
 * to PostExerciseScreen without serializing through navigation params.
 *
 * Set before navigating, read on mount, cleared after read.
 */

import type { Exercise, ExerciseScore } from '../core/exercises/types';
import type { ReplayPlan } from '../core/exercises/replayTypes';
import type { ChestType } from '../core/rewards/chestSystem';

export interface PostExerciseData {
  score: ExerciseScore;
  exercise: Exercise;
  gemsEarned: number;
  chestType: ChestType;
  chestGems: number;
  sessionMinutes: number;
  tempoChange: number;
  failCount: number;
  challengeSentTo?: string;
  // Navigation flags
  hasNextExercise: boolean;
  hasNextAIExercise: boolean;
  hasMasteryTest: boolean;
  hasReplay: boolean;
  hasBonusDrill: boolean;
  bonusDrillDescription?: string;
  // For retry/next navigation
  exerciseId: string;
  skillId?: string;
  exerciseType?: string;
  nextExerciseId?: string;
}

let _cachedData: PostExerciseData | null = null;

export function setPostExerciseData(data: PostExerciseData): void {
  _cachedData = data;
}

export function getPostExerciseData(): PostExerciseData | null {
  return _cachedData;
}

export function clearPostExerciseData(): void {
  _cachedData = null;
}

// Separate replay plan cache — survives PostExerciseScreen → Exercise round trip
let _replayPlan: ReplayPlan | null = null;

export function setReplayPlanCache(plan: ReplayPlan | null): void {
  _replayPlan = plan;
}

export function getReplayPlanCache(): ReplayPlan | null {
  return _replayPlan;
}

export function clearReplayPlanCache(): void {
  _replayPlan = null;
}

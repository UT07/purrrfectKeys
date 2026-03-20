/**
 * Sync Service
 * Manages offline queue and bidirectional sync with Firebase.
 * Changes are queued in AsyncStorage and flushed to Firestore
 * via syncProgress. Supports periodic sync and retry logic.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './config';
import {
  syncProgress, getAllLessonProgress, getGamificationData, addXp, createGamificationData,
  getCatEvolutionData, saveCatEvolutionData, getGemSyncData, saveGemSyncData,
  getLearnerProfileData, saveLearnerProfileData, getAchievementSyncData, saveAchievementSyncData,
  saveRankData, getRankData, saveSeasonData, getSeasonData, saveSettingsSyncData, getSettingsSyncData,
  createLessonProgress,
} from './firestore';
import type { ProgressChange, LessonProgress as FirestoreLessonProgress } from './firestore';
import { useProgressStore } from '../../stores/progressStore';
import { logger } from '../../utils/logger';
import { useCatEvolutionStore } from '../../stores/catEvolutionStore';
import { useGemStore } from '../../stores/gemStore';
import { useLearnerProfileStore } from '../../stores/learnerProfileStore';
import { useAchievementStore } from '../../stores/achievementStore';
import { levelFromXp } from '../../core/progression/XpSystem';
import type { LessonProgress, ExerciseProgress } from '../../core/exercises/types';

// ============================================================================
// Constants
// ============================================================================

const QUEUE_KEY = 'keysense_sync_queue';
const LAST_SYNC_KEY = 'keysense_last_sync';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;
const DEFAULT_SYNC_INTERVAL = 300000; // 5 minutes

// ============================================================================
// Types
// ============================================================================

export interface SyncChange {
  type: 'exercise_completed' | 'xp_earned' | 'settings_changed';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  lessonProgress?: {
    lessonId: string;
    status: 'in_progress' | 'completed';
    completedAt?: number;
    exerciseId: string;
    exerciseScore: {
      highScore: number;
      stars: number;
      attempts: number;
      averageScore: number;
      completedAt?: number;
    };
  };
}

export interface SyncResult {
  success: boolean;
  changesUploaded: number;
  changesDownloaded: number;
  conflicts: number;
}

// ============================================================================
// SyncManager Class
// ============================================================================

export class SyncManager {
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;

  // --------------------------------------------------------------------------
  // Periodic Sync
  // --------------------------------------------------------------------------

  /**
   * Start periodic sync at the given interval (default 5 minutes).
   * If already running, stops the existing timer first.
   */
  startPeriodicSync(intervalMs: number = DEFAULT_SYNC_INTERVAL): void {
    if (this.syncTimer !== null) {
      this.stopPeriodicSync();
    }
    this.syncTimer = setInterval(() => {
      this.flushQueue();
      // Also pull remote changes so cross-device updates are picked up
      this.pullRemoteProgress().catch((e) => logger.warn('[Sync] Periodic pull failed:', e));
    }, intervalMs);
  }

  /**
   * Stop periodic sync.
   */
  stopPeriodicSync(): void {
    if (this.syncTimer !== null) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Returns true if periodic sync is currently active.
   */
  isPeriodicSyncActive(): boolean {
    return this.syncTimer !== null;
  }

  // --------------------------------------------------------------------------
  // Queue Management
  // --------------------------------------------------------------------------

  /**
   * Queue a change for later sync. Persisted to AsyncStorage.
   * Enforces MAX_QUEUE_SIZE by dropping oldest items.
   */
  async queueChange(change: SyncChange): Promise<void> {
    const queue = await this.loadQueue();

    // Dedup: for exercise_completed, replace existing entry for same exerciseId (keep highest score)
    if (change.type === 'exercise_completed' && change.data.exerciseId) {
      const existingIdx = queue.findIndex(
        (q) => q.type === 'exercise_completed' && q.data.exerciseId === change.data.exerciseId
      );
      if (existingIdx !== -1) {
        const existingScore = (queue[existingIdx].data.score as number) ?? 0;
        const newScore = (change.data.score as number) ?? 0;
        if (newScore >= existingScore) {
          queue[existingIdx] = change;
        }
        await this.saveQueue(queue);
        return;
      }
    }

    queue.push(change);

    // Drop oldest items if queue exceeds max size
    while (queue.length > MAX_QUEUE_SIZE) {
      queue.shift();
    }

    await this.saveQueue(queue);
  }

  // --------------------------------------------------------------------------
  // Flush
  // --------------------------------------------------------------------------

  /**
   * Flush the offline queue to Firestore via syncProgress.
   * On success: clears queue and saves new sync timestamp.
   * On failure: increments retryCount, drops items that exceed MAX_RETRIES.
   */
  async flushQueue(): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      logger.warn('[Sync:flushQueue] SKIPPED — no auth.currentUser (uid is null). Auth state:', auth.currentUser ? 'exists but no uid' : 'null');
      return;
    }

    const queue = await this.loadQueue();
    if (queue.length === 0) return;

    logger.log(`[Sync:flushQueue] Processing ${queue.length} queued changes for uid=${uid.slice(0, 8)}...`);

    // Filter out items that have already exceeded max retries
    const validItems = queue.filter((item) => item.retryCount < MAX_RETRIES);
    if (validItems.length === 0) {
      logger.warn('[Sync:flushQueue] All items exceeded max retries — clearing queue');
      await AsyncStorage.removeItem(QUEUE_KEY);
      return;
    }

    try {
      const lastSyncRaw = await AsyncStorage.getItem(LAST_SYNC_KEY);
      const lastSyncTimestamp = lastSyncRaw ? parseInt(lastSyncRaw, 10) : 0;

      // Convert SyncChange items to ProgressChange-compatible format for syncProgress
      // Note: ExercisePlayer passes 'overall' not 'score', so check both keys
      const localChanges: ProgressChange[] = validItems.map((item, index) => ({
        id: `local-${item.timestamp}-${index}`,
        type: item.type as ProgressChange['type'],
        exerciseId: (item.data.exerciseId as string) ?? '',
        score: (item.data.score as number) ?? (item.data.overall as number) ?? 0,
        xpAmount: (item.data.xpAmount as number) ?? (item.data.xpEarned as number) ?? 0,
        timestamp: { toMillis: () => item.timestamp } as ProgressChange['timestamp'],
        synced: false,
        lessonProgress: item.lessonProgress,
      }));

      logger.log(`[Sync:flushQueue] Calling syncProgress with ${localChanges.length} changes, lastSync=${lastSyncTimestamp}`);
      const response = await syncProgress(uid, {
        lastSyncTimestamp,
        localChanges,
      });
      logger.log(`[Sync:flushQueue] ✅ syncProgress succeeded — ${response.conflicts.length} conflicts, newTimestamp=${response.newSyncTimestamp}`);

      // Success: clear queue and save new timestamp
      await AsyncStorage.removeItem(QUEUE_KEY);
      await AsyncStorage.setItem(
        LAST_SYNC_KEY,
        String(response.newSyncTimestamp)
      );

      // Also sync XP to gamification doc so pullRemoteProgress can read it
      try {
        const localXp = useProgressStore.getState().totalXp;
        const remoteGam = await getGamificationData(uid);
        if (!remoteGam) {
          await createGamificationData(uid);
          if (localXp > 0) await addXp(uid, localXp, 'sync');
        } else if (localXp > remoteGam.xp) {
          await addXp(uid, localXp - remoteGam.xp, 'sync');
        }
      } catch (err) {
        logger.warn('[Sync] XP sync in flushQueue failed:', err);
      }

      // Sync cat evolution + gem data to Firestore
      await this.pushCatAndGemData(uid);
    } catch (err) {
      logger.error('[Sync:flushQueue] ❌ FAILED:', (err as Error)?.message, (err as Error)?.stack?.split('\n')[1]);
      // Failure: increment retryCount on valid items
      const updatedQueue = validItems.map((item) => ({
        ...item,
        retryCount: item.retryCount + 1,
      }));
      await this.saveQueue(updatedQueue);
    }
  }

  // --------------------------------------------------------------------------
  // Sync After Exercise
  // --------------------------------------------------------------------------

  /**
   * Queue an exercise completion and immediately attempt to flush.
   * Failures are silently caught (will be retried on next flush).
   */
  async syncAfterExercise(
    exerciseId: string,
    score: Record<string, unknown>,
    lessonProgress?: SyncChange['lessonProgress']
  ): Promise<void> {
    const change: SyncChange = {
      type: 'exercise_completed',
      data: { exerciseId, ...score },
      timestamp: Date.now(),
      retryCount: 0,
      lessonProgress,
    };

    await this.queueChange(change);

    // Attempt immediate flush (don't throw if it fails)
    try {
      await this.flushQueue();
    } catch (err) {
      logger.warn('[Sync] Immediate flush after exercise failed (will retry):', err);
    }
  }

  // --------------------------------------------------------------------------
  // Full Bidirectional Sync
  // --------------------------------------------------------------------------

  /**
   * Full sync: flush queue then report results.
   * Prevents concurrent syncs via isSyncing flag.
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        changesUploaded: 0,
        changesDownloaded: 0,
        conflicts: 0,
      };
    }

    this.isSyncing = true;

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        return {
          success: false,
          changesUploaded: 0,
          changesDownloaded: 0,
          conflicts: 0,
        };
      }

      // Load queue to count uploads
      const queue = await this.loadQueue();
      const validItems = queue.filter((item) => item.retryCount < MAX_RETRIES);
      const changesUploaded = validItems.length;

      if (changesUploaded === 0) {
        // No local changes to upload, but still pull remote updates
        await this.pullRemoteProgress().catch((e) => logger.warn('[Sync] Pull in syncAll failed:', e));
        return {
          success: true,
          changesUploaded: 0,
          changesDownloaded: 0,
          conflicts: 0,
        };
      }

      const lastSyncRaw = await AsyncStorage.getItem(LAST_SYNC_KEY);
      const lastSyncTimestamp = lastSyncRaw ? parseInt(lastSyncRaw, 10) : 0;

      const localChanges: ProgressChange[] = validItems.map((item, index) => ({
        id: `local-${item.timestamp}-${index}`,
        type: item.type as ProgressChange['type'],
        exerciseId: item.data.exerciseId as string | undefined,
        score: item.data.score as number | undefined,
        xpAmount: item.data.xpAmount as number | undefined,
        timestamp: { toMillis: () => item.timestamp } as ProgressChange['timestamp'],
        synced: false,
        lessonProgress: item.lessonProgress,
      }));

      try {
        const response = await syncProgress(uid, {
          lastSyncTimestamp,
          localChanges,
        });

        // Success
        await AsyncStorage.removeItem(QUEUE_KEY);
        await AsyncStorage.setItem(
          LAST_SYNC_KEY,
          String(response.newSyncTimestamp)
        );

        return {
          success: true,
          changesUploaded,
          changesDownloaded: response.serverChanges.length,
          conflicts: response.conflicts.length,
        };
      } catch (err) {
        logger.warn('[Sync] syncAll flush failed:', err);
        // Flush failed -- increment retry counts
        const updatedQueue = validItems.map((item) => ({
          ...item,
          retryCount: item.retryCount + 1,
        }));
        await this.saveQueue(updatedQueue);

        return {
          success: false,
          changesUploaded: 0,
          changesDownloaded: 0,
          conflicts: 0,
        };
      }
    } finally {
      this.isSyncing = false;
    }
  }

  // --------------------------------------------------------------------------
  // Pull Remote State (Download)
  // --------------------------------------------------------------------------

  /**
   * Fetch progress from Firestore and merge with local state.
   * Uses "highest wins" strategy: higher XP, higher scores, more attempts.
   * Called on app startup when authenticated and after sign-in on a new device.
   */
  async pullRemoteProgress(): Promise<{
    pulled: boolean;
    merged: boolean;
    error?: string;
  }> {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      logger.warn('[Sync:pull] SKIPPED — no auth user');
      return { pulled: false, merged: false, error: 'No authenticated user' };
    }

    logger.log(`[Sync:pull] Starting pull for uid=${uid.slice(0, 8)}...`);

    try {
      // Fetch remote data in parallel
      const [remoteLessons, remoteGamification, remoteCats, remoteGems] = await Promise.all([
        getAllLessonProgress(uid).catch((e) => { logger.error('[Sync:pull] ❌ getAllLessonProgress FAILED:', (e as Error)?.message); return [] as Awaited<ReturnType<typeof getAllLessonProgress>>; }),
        getGamificationData(uid).catch((e) => { logger.error('[Sync:pull] ❌ getGamificationData FAILED:', (e as Error)?.message); return null; }),
        getCatEvolutionData(uid).catch((e) => { logger.warn('[Sync:pull] getCatEvolutionData failed:', (e as Error)?.message); return null; }),
        getGemSyncData(uid).catch((e) => { logger.warn('[Sync:pull] getGemSyncData failed:', (e as Error)?.message); return null; }),
      ]);

      logger.log(`[Sync:pull] Remote data: ${remoteLessons.length} lessons, XP=${remoteGamification?.xp ?? 'null'}, cats=${remoteCats ? 'yes' : 'no'}, gems=${remoteGems ? 'yes' : 'no'}`);

      if (!remoteLessons.length && !remoteGamification && !remoteCats && !remoteGems) {
        logger.log('[Sync:pull] No remote data found — nothing to pull');
        return { pulled: true, merged: false };
      }

      const localState = useProgressStore.getState();
      let didMerge = false;

      // Merge XP: take the higher value
      if (remoteGamification && remoteGamification.xp > localState.totalXp) {
        useProgressStore.setState({
          totalXp: remoteGamification.xp,
          level: levelFromXp(remoteGamification.xp),
        });
        didMerge = true;
        logger.log(
          `[Sync] Merged remote XP: ${remoteGamification.xp} (local was ${localState.totalXp})`,
        );
      }

      // Merge streak: take the one with the higher current streak
      if (remoteGamification) {
        const remoteStreak = remoteGamification.streak;
        const localStreak = localState.streakData;
        if (remoteStreak.currentStreak > localStreak.currentStreak) {
          useProgressStore.getState().updateStreakData({
            currentStreak: remoteStreak.currentStreak,
            longestStreak: Math.max(
              remoteStreak.longestStreak,
              localStreak.longestStreak,
            ),
            lastPracticeDate: remoteStreak.lastPracticeDate,
          });
          didMerge = true;
        } else if (
          remoteStreak.longestStreak > localStreak.longestStreak
        ) {
          useProgressStore.getState().updateStreakData({
            longestStreak: remoteStreak.longestStreak,
          });
          didMerge = true;
        }
      }

      // Merge lesson progress: per-exercise, take higher scores
      if (remoteLessons.length > 0) {
        for (const remoteLesson of remoteLessons) {
          const localLesson = localState.lessonProgress[remoteLesson.lessonId];

          if (!localLesson) {
            // Lesson doesn't exist locally — adopt the remote version entirely
            const convertedLesson = convertFirestoreLesson(remoteLesson);
            useProgressStore
              .getState()
              .updateLessonProgress(remoteLesson.lessonId, convertedLesson);
            didMerge = true;
            continue;
          }

          // Lesson exists locally — merge per-exercise scores
          let lessonChanged = false;
          const remoteScores = remoteLesson.exerciseScores ?? {};
          for (const [exId, remoteEx] of Object.entries(remoteScores)) {
            const localEx = localLesson.exerciseScores[exId];

            if (!localEx) {
              // Exercise doesn't exist locally — adopt remote
              useProgressStore.getState().updateExerciseProgress(
                remoteLesson.lessonId,
                exId,
                convertFirestoreExercise(remoteEx),
              );
              lessonChanged = true;
            } else if (remoteEx.highScore > localEx.highScore) {
              // Remote has a higher score — take it
              useProgressStore.getState().updateExerciseProgress(
                remoteLesson.lessonId,
                exId,
                {
                  ...localEx,
                  highScore: remoteEx.highScore,
                  stars: Math.max(remoteEx.stars, localEx.stars) as 0 | 1 | 2 | 3,
                  attempts: Math.max(remoteEx.attempts, localEx.attempts),
                  averageScore: remoteEx.averageScore,
                },
              );
              lessonChanged = true;
            } else if (remoteEx.attempts > localEx.attempts) {
              // Remote has more attempts (even if score is lower)
              useProgressStore.getState().updateExerciseProgress(
                remoteLesson.lessonId,
                exId,
                {
                  ...localEx,
                  attempts: remoteEx.attempts,
                },
              );
              lessonChanged = true;
            }
          }

          // Upgrade lesson status if remote is more advanced
          const statusRank = { locked: 0, available: 1, in_progress: 2, completed: 3 };
          if (statusRank[remoteLesson.status] > statusRank[localLesson.status]) {
            useProgressStore.getState().updateLessonProgress(
              remoteLesson.lessonId,
              {
                ...localLesson,
                ...(lessonChanged
                  ? useProgressStore.getState().lessonProgress[remoteLesson.lessonId]
                  : {}),
                status: remoteLesson.status,
                ...(remoteLesson.completedAt
                  ? {
                      completedAt:
                        typeof remoteLesson.completedAt === 'object' &&
                        'toMillis' in remoteLesson.completedAt
                          ? (remoteLesson.completedAt as any).toMillis()
                          : undefined,
                    }
                  : {}),
              },
            );
            lessonChanged = true;
          }

          if (lessonChanged) didMerge = true;
        }
      }

      // Merge cat evolution: union of owned cats, higher XP per cat
      if (remoteCats && remoteCats.ownedCats.length > 0) {
        const localCats = useCatEvolutionStore.getState();
        const mergedOwned = new Set([...localCats.ownedCats, ...remoteCats.ownedCats]);

        if (mergedOwned.size > localCats.ownedCats.length) {
          // Remote has cats we don't have locally — adopt them
          for (const catId of remoteCats.ownedCats) {
            if (!localCats.ownedCats.includes(catId)) {
              useCatEvolutionStore.getState().unlockCat(catId);
            }
          }
          didMerge = true;
        }

        // Merge per-cat XP: take higher XP
        for (const [catId, remoteCat] of Object.entries(remoteCats.evolutionData)) {
          const localCat = localCats.evolutionData[catId];
          if (localCat && remoteCat.xpAccumulated > localCat.xpAccumulated) {
            const diff = remoteCat.xpAccumulated - localCat.xpAccumulated;
            useCatEvolutionStore.getState().addEvolutionXp(catId, diff);
            didMerge = true;
          }
        }

        // If remote has a selected cat and local doesn't, adopt it
        if (remoteCats.selectedCatId && !localCats.selectedCatId) {
          useCatEvolutionStore.getState().selectCat(remoteCats.selectedCatId);
          didMerge = true;
        }

        logger.log(`[Sync] Cat evolution merged: ${mergedOwned.size} total cats`);
      }

      // Merge gems: take higher balance (direct setState, not earnGems, to avoid
      // inflating totalGemsEarned and transaction log on every sync pull)
      if (remoteGems) {
        const localGems = useGemStore.getState();
        if (remoteGems.gems > localGems.gems) {
          useGemStore.setState({
            gems: remoteGems.gems,
            totalGemsEarned: Math.max(localGems.totalGemsEarned, remoteGems.totalGemsEarned ?? localGems.totalGemsEarned),
          });
          didMerge = true;
          logger.log(`[Sync] Merged remote gems: ${remoteGems.gems} (local was ${localGems.gems})`);
        }

        // Merge claimedRewards: union to prevent double-claiming
        if (remoteGems.claimedRewards) {
          const localClaimed = new Set(localGems.claimedRewards ?? []);
          let newClaims = false;
          for (const r of remoteGems.claimedRewards) {
            if (!localClaimed.has(r)) {
              localClaimed.add(r);
              newClaims = true;
            }
          }
          if (newClaims) {
            useGemStore.setState({ claimedRewards: Array.from(localClaimed) });
            didMerge = true;
          }
        }
      }

      // Merge learner profile: take higher exercise count, union of mastered skills
      try {
        const remoteLearner = await getLearnerProfileData(uid);
        if (remoteLearner) {
          const localLearner = useLearnerProfileStore.getState();
          const updates: Record<string, any> = {};

          if (remoteLearner.totalExercisesCompleted > localLearner.totalExercisesCompleted) {
            updates.totalExercisesCompleted = remoteLearner.totalExercisesCompleted;
          }

          // Union of mastered skills
          const localMastered = new Set(localLearner.masteredSkills);
          const remoteMastered = remoteLearner.masteredSkills ?? [];
          let newSkillsAdded = false;
          for (const skillId of remoteMastered) {
            if (!localMastered.has(skillId)) {
              localMastered.add(skillId);
              newSkillsAdded = true;
            }
          }
          if (newSkillsAdded) {
            updates.masteredSkills = Array.from(localMastered);
          }

          // Merge skill mastery data: take later lastPracticedAt, higher completionCount
          if (remoteLearner.skillMasteryData) {
            const mergedMasteryData = { ...localLearner.skillMasteryData };
            for (const [skillId, remoteRecord] of Object.entries(remoteLearner.skillMasteryData)) {
              const localRecord = mergedMasteryData[skillId];
              if (!localRecord) {
                mergedMasteryData[skillId] = remoteRecord;
              } else if (remoteRecord.completionCount > localRecord.completionCount) {
                mergedMasteryData[skillId] = {
                  ...localRecord,
                  completionCount: remoteRecord.completionCount,
                  lastPracticedAt: Math.max(localRecord.lastPracticedAt, remoteRecord.lastPracticedAt ?? 0),
                };
              }
            }
            updates.skillMasteryData = mergedMasteryData;
          }

          if (Object.keys(updates).length > 0) {
            useLearnerProfileStore.setState(updates);
            didMerge = true;
          }
        }
      } catch (err) {
        logger.warn('[Sync] Learner profile pull failed:', err);
      }

      // Merge achievements: union of unlocked IDs
      try {
        const remoteAchievements = await getAchievementSyncData(uid);
        if (remoteAchievements) {
          const localAch = useAchievementStore.getState();
          const mergedIds = { ...localAch.unlockedIds };
          let newUnlocks = false;
          for (const [id, timestamp] of Object.entries(remoteAchievements.unlockedIds ?? {})) {
            if (!mergedIds[id]) {
              mergedIds[id] = timestamp;
              newUnlocks = true;
            }
          }
          if (newUnlocks) {
            useAchievementStore.setState({ unlockedIds: mergedIds });
            didMerge = true;
          }

          // Take higher counters
          if (remoteAchievements.totalNotesPlayed > localAch.totalNotesPlayed) {
            useAchievementStore.setState({ totalNotesPlayed: remoteAchievements.totalNotesPlayed });
            didMerge = true;
          }
          if (remoteAchievements.perfectScoreCount > localAch.perfectScoreCount) {
            useAchievementStore.setState({ perfectScoreCount: remoteAchievements.perfectScoreCount });
            didMerge = true;
          }
          if (remoteAchievements.highScoreCount > localAch.highScoreCount) {
            useAchievementStore.setState({ highScoreCount: remoteAchievements.highScoreCount });
            didMerge = true;
          }
        }
      } catch (err) {
        logger.warn('[Sync] Achievement pull failed:', err);
      }

      // Pull rank data (MMR, tier, division)
      try {
        const remoteRank = await getRankData(uid);
        if (remoteRank?.rating) {
          const { useRankStore } = require('../../stores/rankStore');
          const localRank = useRankStore.getState();
          const remoteMMR = (remoteRank.rating as { mmr: number })?.mmr ?? 0;
          if (remoteMMR > (localRank.rating?.mmr ?? 0)) {
            useRankStore.setState({ rating: remoteRank.rating, promotionSeries: remoteRank.promotionSeries ?? null });
            didMerge = true;
            logger.log(`[Sync] Rank merged: MMR=${remoteMMR}`);
          }
        }
      } catch (err) {
        logger.warn('[Sync] Rank pull failed:', err);
      }

      // Pull season data (battle pass)
      try {
        const remoteSeason = await getSeasonData(uid);
        if (remoteSeason) {
          const { useSeasonStore } = require('../../stores/seasonStore');
          const localSeason = useSeasonStore.getState();
          const remoteBPXp = (remoteSeason.battlePassXp as number) ?? 0;
          if (remoteBPXp > (localSeason.battlePassXp ?? 0)) {
            useSeasonStore.setState({
              battlePassXp: remoteSeason.battlePassXp,
              battlePassTier: remoteSeason.battlePassTier,
              claimedRewards: remoteSeason.claimedRewards ?? localSeason.claimedRewards,
              peakTier: remoteSeason.peakTier ?? localSeason.peakTier,
              seasonHistory: remoteSeason.seasonHistory ?? localSeason.seasonHistory,
            });
            didMerge = true;
            logger.log(`[Sync] Season merged: BP XP=${remoteBPXp}`);
          }
        }
      } catch (err) {
        logger.warn('[Sync] Season pull failed:', err);
      }

      // Pull settings (preferences, username, selected cat)
      try {
        const remoteSettings = await getSettingsSyncData(uid);
        if (remoteSettings) {
          const { useSettingsStore } = require('../../stores/settingsStore');
          const local = useSettingsStore.getState();
          // Only overwrite empty/default local values with remote values
          const updates: Record<string, unknown> = {};
          if (remoteSettings.username && !local.username) updates.username = remoteSettings.username;
          if (remoteSettings.displayName && (!local.displayName || local.displayName === 'Piano Student')) updates.displayName = remoteSettings.displayName;
          if (remoteSettings.selectedCatId && !local.selectedCatId) updates.selectedCatId = remoteSettings.selectedCatId;
          if (remoteSettings.selectedPath && !local.selectedPath) updates.selectedPath = remoteSettings.selectedPath;
          if (remoteSettings.dailyGoalMinutes && local.dailyGoalMinutes === 10) updates.dailyGoalMinutes = remoteSettings.dailyGoalMinutes;
          if (Object.keys(updates).length > 0) {
            useSettingsStore.setState(updates);
            didMerge = true;
            logger.log('[Sync] Settings merged:', Object.keys(updates).join(', '));
          }
        }
      } catch (err) {
        logger.warn('[Sync] Settings pull failed:', err);
      }

      // Pull progress extras (dailyGoalData, tierTestResults, streakMilestones)
      try {
        const { doc: firestoreDoc, getDoc: firestoreGetDoc } = require('firebase/firestore');
        const { db: firestoreDb } = require('./config');
        const extraDoc = firestoreDoc(firestoreDb, 'users', uid, 'gamification', 'progressExtra');
        const extraSnap = await firestoreGetDoc(extraDoc);
        if (extraSnap.exists()) {
          const extra = extraSnap.data();
          const local = useProgressStore.getState();
          // Merge streakMilestonesClaimed (union)
          if (extra.streakMilestonesClaimed?.length > 0) {
            const merged = [...new Set([...(local.streakMilestonesClaimed ?? []), ...extra.streakMilestonesClaimed])];
            if (merged.length > (local.streakMilestonesClaimed ?? []).length) {
              useProgressStore.setState({ streakMilestonesClaimed: merged });
              didMerge = true;
            }
          }
          // Merge tierTestResults (higher scores win)
          if (extra.tierTestResults) {
            const mergedTier = { ...local.tierTestResults };
            for (const [key, remote] of Object.entries(extra.tierTestResults as Record<string, { passed: boolean; score: number; attempts: number }>)) {
              const localT = mergedTier[key];
              if (!localT || remote.score > localT.score) {
                mergedTier[key] = remote;
                didMerge = true;
              }
            }
            useProgressStore.setState({ tierTestResults: mergedTier });
          }
          // Merge dailyGoalData (per-day practice time — higher minutes win per day)
          if (extra.dailyGoalData && typeof extra.dailyGoalData === 'object') {
            const mergedGoals = { ...local.dailyGoalData };
            for (const [date, remoteGoal] of Object.entries(extra.dailyGoalData as Record<string, { minutesPracticed: number; exercisesCompleted: number }>)) {
              const localGoal = mergedGoals[date];
              if (!localGoal || (remoteGoal.minutesPracticed > (localGoal.minutesPracticed ?? 0))) {
                mergedGoals[date] = remoteGoal as any;
                didMerge = true;
              }
            }
            useProgressStore.setState({ dailyGoalData: mergedGoals });
          }
          logger.log('[Sync] Progress extras merged');
        }
      } catch (err) {
        logger.warn('[Sync] Progress extras pull failed:', err);
      }

      if (didMerge) {
        logger.log('[Sync] Remote progress merged into local state');

        // Persist merged state to AsyncStorage (raw setState calls above bypass
        // the stores' internal debouncedSave, so we must save explicitly)
        const { PersistenceManager, STORAGE_KEYS } = require('../../stores/persistence');
        // Save progress store (XP, streak, lessons were potentially modified via setState)
        const progressData = useProgressStore.getState();
        await PersistenceManager.saveState(STORAGE_KEYS.PROGRESS, {
          totalXp: progressData.totalXp,
          level: progressData.level,
          streakData: progressData.streakData,
          lessonProgress: progressData.lessonProgress,
          dailyGoalData: progressData.dailyGoalData,
          tierTestResults: progressData.tierTestResults,
          streakMilestonesClaimed: progressData.streakMilestonesClaimed,
        });
        // Save gem store (gems were potentially modified via setState)
        const gemData = useGemStore.getState();
        await PersistenceManager.saveState(STORAGE_KEYS.GEMS, {
          gems: gemData.gems,
          totalGemsEarned: gemData.totalGemsEarned,
          totalGemsSpent: gemData.totalGemsSpent,
          transactions: gemData.transactions,
          claimedRewards: gemData.claimedRewards,
        });
        // Save learner profile (mastered skills were potentially modified via setState)
        const learnerData = useLearnerProfileStore.getState();
        await PersistenceManager.saveState(STORAGE_KEYS.LEARNER_PROFILE, {
          noteAccuracy: learnerData.noteAccuracy,
          noteAttempts: learnerData.noteAttempts,
          skills: learnerData.skills,
          tempoRange: learnerData.tempoRange,
          totalExercisesCompleted: learnerData.totalExercisesCompleted,
          masteredSkills: learnerData.masteredSkills,
          skillMasteryData: learnerData.skillMasteryData,
          recentExerciseIds: learnerData.recentExerciseIds,
        });
        // Save achievements (unlocked IDs were potentially modified via setState)
        const achData = useAchievementStore.getState();
        await PersistenceManager.saveState(STORAGE_KEYS.ACHIEVEMENTS, {
          unlockedIds: achData.unlockedIds,
          totalNotesPlayed: achData.totalNotesPlayed,
          perfectScoreCount: achData.perfectScoreCount,
          highScoreCount: achData.highScoreCount,
        });
        logger.log('[Sync] Persisted merged state to AsyncStorage');
      }

      return { pulled: true, merged: didMerge };
    } catch (error) {
      const msg = (error as Error)?.message ?? 'Unknown error';
      logger.warn('[Sync] Failed to pull remote progress:', msg);
      return { pulled: false, merged: false, error: msg };
    }
  }

  // --------------------------------------------------------------------------
  // Cat Evolution & Gem Sync
  // --------------------------------------------------------------------------

  /**
   * Push local cat evolution + gem data to Firestore.
   * Uses "highest wins" for gems: only pushes if local balance exceeds remote.
   * For cats: merges owned cats (union), takes higher XP per cat.
   */
  async pushCatAndGemData(uid?: string): Promise<void> {
    const resolvedUid = uid ?? auth.currentUser?.uid;
    if (!resolvedUid) return;

    try {
      // Push cat evolution data
      const catState = useCatEvolutionStore.getState();
      if (catState.ownedCats.length > 0) {
        const evolutionData: Record<string, {
          catId: string;
          currentStage: string;
          xpAccumulated: number;
          abilitiesUnlocked: string[];
        }> = {};

        for (const catId of catState.ownedCats) {
          const data = catState.evolutionData[catId];
          if (data) {
            evolutionData[catId] = {
              catId: data.catId,
              currentStage: data.currentStage,
              xpAccumulated: data.xpAccumulated,
              abilitiesUnlocked: data.abilitiesUnlocked,
            };
          }
        }

        const remoteCats = await getCatEvolutionData(resolvedUid);

        // Merge: take higher XP per cat, union of owned cats
        if (remoteCats) {
          const mergedOwned = new Set([...catState.ownedCats, ...remoteCats.ownedCats]);
          const mergedEvolution = { ...evolutionData };
          for (const [catId, remoteCat] of Object.entries(remoteCats.evolutionData)) {
            if (!mergedEvolution[catId]) {
              mergedEvolution[catId] = remoteCat;
            } else if (remoteCat.xpAccumulated > mergedEvolution[catId].xpAccumulated) {
              mergedEvolution[catId] = remoteCat;
            }
          }

          await saveCatEvolutionData(resolvedUid, {
            selectedCatId: catState.selectedCatId,
            ownedCats: Array.from(mergedOwned),
            evolutionData: mergedEvolution,
          });
        } else {
          await saveCatEvolutionData(resolvedUid, {
            selectedCatId: catState.selectedCatId,
            ownedCats: catState.ownedCats,
            evolutionData,
          });
        }
      }
    } catch (err) {
      logger.warn('[Sync] Cat evolution push failed:', err);
    }

    try {
      // Push gem data
      const gemState = useGemStore.getState();
      const remoteGems = await getGemSyncData(resolvedUid);

      if (!remoteGems || gemState.gems > remoteGems.gems || gemState.totalGemsEarned > remoteGems.totalGemsEarned) {
        // Merge claimedRewards: union of local + remote
        const localClaimed = new Set(gemState.claimedRewards ?? []);
        const remoteClaimed = remoteGems?.claimedRewards ?? [];
        for (const r of remoteClaimed) localClaimed.add(r);

        await saveGemSyncData(resolvedUid, {
          gems: Math.max(gemState.gems, remoteGems?.gems ?? 0),
          totalGemsEarned: Math.max(gemState.totalGemsEarned, remoteGems?.totalGemsEarned ?? 0),
          totalGemsSpent: Math.max(gemState.totalGemsSpent, remoteGems?.totalGemsSpent ?? 0),
          claimedRewards: Array.from(localClaimed),
        });
      }
    } catch (err) {
      logger.warn('[Sync] Gem push failed:', err);
    }

    // Also push learner profile + achievements
    await this.pushLearnerAndAchievementData(resolvedUid);
  }

  /**
   * Push learner profile + achievement data to Firestore.
   * Called during sign-out and periodic sync to prevent data loss.
   */
  async pushLearnerAndAchievementData(uid?: string): Promise<void> {
    const resolvedUid = uid ?? auth.currentUser?.uid;
    if (!resolvedUid) return;

    try {
      const lp = useLearnerProfileStore.getState();
      await saveLearnerProfileData(resolvedUid, {
        noteAccuracy: lp.noteAccuracy,
        noteAttempts: lp.noteAttempts,
        skills: { ...lp.skills },
        tempoRange: lp.tempoRange,
        totalExercisesCompleted: lp.totalExercisesCompleted,
        masteredSkills: lp.masteredSkills,
        skillMasteryData: lp.skillMasteryData,
        recentExerciseIds: lp.recentExerciseIds,
      });
    } catch (err) {
      logger.warn('[Sync] Learner profile push failed:', err);
    }

    try {
      const achState = useAchievementStore.getState();
      await saveAchievementSyncData(resolvedUid, {
        unlockedIds: achState.unlockedIds,
        totalNotesPlayed: achState.totalNotesPlayed,
        perfectScoreCount: achState.perfectScoreCount,
        highScoreCount: achState.highScoreCount,
      });
    } catch (err) {
      logger.warn('[Sync] Achievement push failed:', err);
    }

    // 6. Push rank data (MMR, tier, division, promotion series)
    try {
      const { useRankStore } = require('../../stores/rankStore');
      const rankState = useRankStore.getState();
      await saveRankData(resolvedUid, {
        rating: rankState.rating,
        promotionSeries: rankState.promotionSeries ?? null,
      });
      logger.log('[Sync] Pushed rank data');
    } catch (err) {
      logger.warn('[Sync] Rank push failed:', err);
    }

    // 7. Push season data (battle pass, season history)
    try {
      const { useSeasonStore } = require('../../stores/seasonStore');
      const seasonState = useSeasonStore.getState();
      await saveSeasonData(resolvedUid, {
        currentSeason: seasonState.currentSeason,
        battlePassXp: seasonState.battlePassXp,
        battlePassTier: seasonState.battlePassTier,
        claimedRewards: seasonState.claimedRewards,
        peakTier: seasonState.peakTier,
        seasonHistory: seasonState.seasonHistory,
      });
      logger.log('[Sync] Pushed season data');
    } catch (err) {
      logger.warn('[Sync] Season push failed:', err);
    }

    // 8. Push settings (preferences, username, selected cat, daily goal)
    try {
      const { useSettingsStore } = require('../../stores/settingsStore');
      const settings = useSettingsStore.getState();
      await saveSettingsSyncData(resolvedUid, {
        username: settings.username ?? null,
        displayName: settings.displayName ?? null,
        selectedCatId: settings.selectedCatId ?? null,
        dailyGoalMinutes: settings.dailyGoalMinutes,
        masterVolume: settings.masterVolume,
        soundEnabled: settings.soundEnabled,
        hapticEnabled: settings.hapticEnabled,
        showFingerNumbers: settings.showFingerNumbers,
        showNoteNames: settings.showNoteNames,
        preferredInputMethod: settings.preferredInputMethod,
        selectedPath: settings.selectedPath ?? null,
        darkMode: settings.darkMode,
      });
      logger.log('[Sync] Pushed settings');
    } catch (err) {
      logger.warn('[Sync] Settings push failed:', err);
    }

    // 9. Push extra progress fields (dailyGoalData, tierTestResults, streakMilestones)
    try {
      const progressState = useProgressStore.getState();
      const { doc, setDoc } = require('firebase/firestore');
      const { db } = require('./config');
      const extraDoc = doc(db, 'users', resolvedUid, 'gamification', 'progressExtra');
      await setDoc(extraDoc, {
        dailyGoalData: progressState.dailyGoalData,
        tierTestResults: progressState.tierTestResults,
        streakMilestonesClaimed: progressState.streakMilestonesClaimed,
      }, { merge: true });
      logger.log('[Sync] Pushed progress extras (dailyGoal, tierTests, milestones)');
    } catch (err) {
      logger.warn('[Sync] Progress extras push failed:', err);
    }
  }

  // --------------------------------------------------------------------------
  // Full Progress Push (for sign-out / sign-in migration)
  // --------------------------------------------------------------------------

  /**
   * Push ALL local progress data to Firestore.
   * Called before sign-out to ensure nothing is lost when local storage is wiped.
   * Pushes: XP/level/streak (gamification), lesson progress, cats, gems,
   * learner profile, and achievements.
   */
  async pushAllProgressData(uid?: string): Promise<void> {
    const resolvedUid = uid ?? auth.currentUser?.uid;
    if (!resolvedUid) return;

    // 1. Push gamification data (XP, level, streak)
    try {
      const progressState = useProgressStore.getState();
      const remoteGam = await getGamificationData(resolvedUid);

      if (remoteGam) {
        // Merge: take higher XP, higher streak
        const { doc, updateDoc } = require('firebase/firestore');
        const { db } = require('./config');
        const gamDoc = doc(db, 'users', resolvedUid, 'gamification', 'data');
        await updateDoc(gamDoc, {
          xp: Math.max(progressState.totalXp, remoteGam.xp),
          level: levelFromXp(Math.max(progressState.totalXp, remoteGam.xp)),
          'streak.currentStreak': Math.max(
            progressState.streakData.currentStreak,
            remoteGam.streak?.currentStreak ?? 0,
          ),
          'streak.longestStreak': Math.max(
            progressState.streakData.longestStreak,
            remoteGam.streak?.longestStreak ?? 0,
          ),
          'streak.lastPracticeDate': progressState.streakData.lastPracticeDate ||
            remoteGam.streak?.lastPracticeDate || '',
        });
      } else {
        await createGamificationData(resolvedUid);
        const { doc, updateDoc } = require('firebase/firestore');
        const { db } = require('./config');
        const gamDoc = doc(db, 'users', resolvedUid, 'gamification', 'data');
        await updateDoc(gamDoc, {
          xp: progressState.totalXp,
          level: progressState.level,
          'streak.currentStreak': progressState.streakData.currentStreak,
          'streak.longestStreak': progressState.streakData.longestStreak,
          'streak.lastPracticeDate': progressState.streakData.lastPracticeDate,
        });
      }
      logger.log('[Sync] Pushed gamification data (XP, streak)');
    } catch (err) {
      logger.warn('[Sync] Gamification push failed:', err);
    }

    // 2. Push lesson progress (all lessons with scores)
    try {
      const progressState = useProgressStore.getState();
      const lessonIds = Object.keys(progressState.lessonProgress);

      for (const lessonId of lessonIds) {
        const lesson = progressState.lessonProgress[lessonId];
        if (!lesson || Object.keys(lesson.exerciseScores).length === 0) continue;

        try {
          await createLessonProgress(resolvedUid, lessonId, {
            lessonId,
            status: lesson.status,
            exerciseScores: lesson.exerciseScores as any,
            bestScore: Math.max(
              0,
              ...Object.values(lesson.exerciseScores).map((e) => e.highScore),
            ),
            totalAttempts: Object.values(lesson.exerciseScores).reduce(
              (sum, e) => sum + e.attempts,
              0,
            ),
          });
        } catch (err) {
          // createLessonProgress uses merge: true, so partial failures are OK
          logger.warn('[Sync] Partial lesson progress push failed:', err);
        }
      }
      logger.log(`[Sync] Pushed ${lessonIds.length} lesson progress records`);
    } catch (err) {
      logger.warn('[Sync] Lesson progress push failed:', err);
    }

    // 3. Push cats, gems, learner profile, achievements (existing method)
    await this.pushCatAndGemData(resolvedUid);
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private async loadQueue(): Promise<SyncChange[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as SyncChange[];
    } catch (err) {
      logger.warn('[Sync] Failed to parse sync queue (resetting):', err);
      return [];
    }
  }

  private async saveQueue(queue: SyncChange[]): Promise<void> {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

// ============================================================================
// Firestore → Local Type Converters
// ============================================================================

function convertFirestoreExercise(
  remote: FirestoreLessonProgress['exerciseScores'][string],
): ExerciseProgress {
  return {
    exerciseId: remote.exerciseId,
    highScore: remote.highScore,
    stars: remote.stars as 0 | 1 | 2 | 3,
    attempts: remote.attempts,
    lastAttemptAt:
      remote.lastAttemptAt && typeof remote.lastAttemptAt === 'object' && 'toMillis' in remote.lastAttemptAt
        ? (remote.lastAttemptAt as any).toMillis()
        : Date.now(),
    averageScore: remote.averageScore,
    completedAt:
      remote.completedAt && typeof remote.completedAt === 'object' && 'toMillis' in remote.completedAt
        ? (remote.completedAt as any).toMillis()
        : typeof remote.completedAt === 'number'
          ? remote.completedAt
          : undefined,
  };
}

function convertFirestoreLesson(remote: FirestoreLessonProgress): LessonProgress {
  const exerciseScores: Record<string, ExerciseProgress> = {};
  for (const [exId, exData] of Object.entries(remote.exerciseScores ?? {})) {
    exerciseScores[exId] = convertFirestoreExercise(exData);
  }

  return {
    lessonId: remote.lessonId,
    status: remote.status,
    exerciseScores,
    bestScore: remote.bestScore,
    completedAt:
      remote.completedAt && typeof remote.completedAt === 'object' && 'toMillis' in remote.completedAt
        ? (remote.completedAt as any).toMillis()
        : undefined,
    totalAttempts: remote.totalAttempts,
    totalTimeSpentSeconds: remote.totalTimeSpentSeconds,
  };
}

// ============================================================================
// Singleton Export
// ============================================================================

export const syncManager = new SyncManager();

/**
 * Centralized type definitions for store interfaces
 * All types are pure TypeScript (no React imports)
 */

import type { Exercise, ExerciseScore, MidiNoteEvent, LessonProgress, ExerciseProgress } from '@/core/exercises/types';
import type { ExerciseChallengeContext } from '@/core/challenges/challengeSystem';

/**
 * ============================================================================
 * EXERCISE STORE TYPES
 * ============================================================================
 */

export interface ExerciseSessionState {
  // Current exercise
  currentExercise: Exercise | null;
  currentExerciseId: string | null;

  // Session progress
  playedNotes: MidiNoteEvent[];
  isPlaying: boolean;
  currentBeat: number;
  score: ExerciseScore | null;
  sessionStartTime: number | null;
  sessionEndTime: number | null;

  // Sticky score: survives clearSession() so callers can capture it after navigation
  lastCompletedScore: ExerciseScore | null;

  // Demo mode & ghost notes (transient, not persisted)
  failCount: number;
  ghostNotesEnabled: boolean;
  ghostNotesSuccessCount: number;
  demoWatched: boolean;

  // Session actions
  setCurrentExercise: (exercise: Exercise) => void;
  addPlayedNote: (note: MidiNoteEvent) => void;
  clearSession: () => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentBeat: (beat: number) => void;
  setScore: (score: ExerciseScore) => void;
  setSessionTime: (startTime: number, endTime?: number) => void;
  incrementFailCount: () => void;
  resetFailCount: () => void;
  setGhostNotesEnabled: (enabled: boolean) => void;
  incrementGhostNotesSuccessCount: () => void;
  setDemoWatched: (watched: boolean) => void;
  clearLastCompletedScore: () => void;
  reset: () => void;
}

/**
 * ============================================================================
 * PROGRESS STORE TYPES
 * ============================================================================
 */

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string; // ISO date
  freezesAvailable: number;
  freezesUsed: number;
  weeklyPractice: boolean[]; // Last 7 days
}

export interface TierTestResult {
  passed: boolean;
  score: number;
  attempts: number;
}

export interface ProgressStoreState {
  // User progression
  totalXp: number;
  level: number;
  streakData: StreakData;
  lessonProgress: Record<string, LessonProgress>;
  dailyGoalData: Record<string, DailyGoalData>; // ISO date -> goal data
  tierTestResults: Record<string, TierTestResult>; // "tier-N" -> result
  streakMilestonesClaimed: number[]; // Streak counts already rewarded (e.g. [7, 30])

  // Actions
  addXp: (amount: number) => void;
  setLevel: (level: number) => void;
  updateStreakData: (data: Partial<StreakData>) => void;
  updateLessonProgress: (lessonId: string, progress: LessonProgress) => void;
  updateExerciseProgress: (lessonId: string, exerciseId: string, progress: ExerciseProgress) => void;
  getLessonProgress: (lessonId: string) => LessonProgress | null;
  getExerciseProgress: (lessonId: string, exerciseId: string) => ExerciseProgress | null;
  recordPracticeSession: (duration: number) => void;
  recordExerciseCompletion: (exerciseId: string, score: number, xpEarned: number, challengeContext?: ExerciseChallengeContext) => void;
  recordTierTestResult: (tier: number, passed: boolean, score: number) => void;
  updateDailyGoal: (date: string, data: Partial<DailyGoalData>) => void;
  reset: () => void;
}

export interface DailyGoalData {
  date: string;
  minutesTarget: number;
  minutesPracticed: number;
  exercisesTarget: number;
  exercisesCompleted: number;
  isComplete: boolean;
}

/**
 * ============================================================================
 * SETTINGS STORE TYPES
 * ============================================================================
 */

export type PlaybackSpeed = 0.25 | 0.5 | 0.75 | 1.0;

export interface AudioSettings {
  masterVolume: number; // 0-1
  soundEnabled: boolean;
  hapticEnabled: boolean;
  metronomeVolume: number; // 0-1
  keyboardVolume: number; // 0-1
  audioBufferSize: number;
  playbackSpeed: PlaybackSpeed; // Exercise tempo multiplier
  uiSoundEnabled: boolean; // SoundManager game UI sounds (separate from piano audio)
  uiSoundVolume: number; // 0-1, SoundManager volume
}

export interface DisplaySettings {
  showFingerNumbers: boolean;
  showNoteNames: boolean;
  preferredHand: 'right' | 'left' | 'both';
  darkMode: boolean;
  showPianoRoll: boolean;
  showStaffNotation: boolean;
  showTutorials: boolean;
}

export interface NotificationSettings {
  reminderTime: string | null; // "09:00" format
  reminderEnabled: boolean;
  dailyGoalMinutes: number;
  completionNotifications: boolean;
}

export type PreferredInputMethod = 'auto' | 'midi' | 'mic' | 'touch';

export type MicDetectionMode = 'monophonic' | 'polyphonic';

export interface MidiSettings {
  lastMidiDeviceId: string | null;
  lastMidiDeviceName: string | null;
  autoConnectMidi: boolean;
  preferredInputMethod: PreferredInputMethod;
  micDetectionMode: MicDetectionMode;
  /** Cached mic permission state — avoids re-prompting on every input switch */
  micPermissionGranted: boolean;
}

export interface OnboardingSettings {
  hasCompletedOnboarding: boolean;
  experienceLevel: 'beginner' | 'intermediate' | 'returning' | null;
  learningGoal: 'songs' | 'technique' | 'exploration' | null;
}

export type LearningPathId = 'piano-basics' | 'pop-and-film' | 'classical' | 'jazz-and-blues' | 'kids';

export interface ProfileSettings {
  username: string; // Unique invite code (3-20 chars, a-z0-9_-, lowercase)
  displayName: string;
  avatarEmoji: string; // Emoji used as avatar
  selectedCatId: string; // Cat character avatar ID
  selectedPath: LearningPathId; // Active learning path
  equippedAccessories: Record<string, string>; // category → accessory ID
  ownedAccessories: string[]; // purchased accessory IDs
}

export interface SettingsStoreState extends AudioSettings, DisplaySettings, NotificationSettings, MidiSettings, OnboardingSettings, ProfileSettings {
  // Actions
  updateAudioSettings: (settings: Partial<AudioSettings>) => void;
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  updateMidiSettings: (settings: Partial<MidiSettings>) => void;
  setMasterVolume: (volume: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setUiSoundEnabled: (enabled: boolean) => void;
  setUiSoundVolume: (vol: number) => void;
  setShowFingerNumbers: (show: boolean) => void;
  setShowNoteNames: (show: boolean) => void;
  setPreferredHand: (hand: 'right' | 'left' | 'both') => void;
  setReminderTime: (time: string | null) => void;
  setDailyGoalMinutes: (minutes: number) => void;
  setLastMidiDevice: (deviceId: string | null, deviceName: string | null) => void;
  setPreferredInputMethod: (method: PreferredInputMethod) => void;
  setMicDetectionMode: (mode: MicDetectionMode) => void;
  setMicPermissionGranted: (granted: boolean) => void;
  setDarkMode: (enabled: boolean) => void;
  setShowTutorials: (show: boolean) => void;
  setHasCompletedOnboarding: (completed: boolean) => void;
  setExperienceLevel: (level: 'beginner' | 'intermediate' | 'returning') => void;
  setLearningGoal: (goal: 'songs' | 'technique' | 'exploration') => void;
  setUsername: (name: string) => void;
  setDisplayName: (name: string) => void;
  setAvatarEmoji: (emoji: string) => void;
  setSelectedCatId: (id: string) => void;
  setSelectedPath: (pathId: LearningPathId) => void;
  equipAccessory: (category: string, accessoryId: string) => void;
  unequipAccessory: (category: string) => void;
  addOwnedAccessory: (accessoryId: string) => void;
  reset: () => void;
}

/**
 * ============================================================================
 * LEARNER PROFILE STORE TYPES
 * ============================================================================
 */

export interface SkillMasteryRecord {
  masteredAt: number;        // epoch ms when first mastered
  lastPracticedAt: number;   // epoch ms when last exercised
  completionCount: number;   // successful completions toward mastery
  decayScore: number;        // 1.0 = fresh, 0.0 = fully decayed
}

export interface NoteResult {
  midiNote: number;
  accuracy: number; // 0.0-1.0
}

export interface ExerciseResult {
  tempo: number;
  score: number; // 0.0-1.0
  noteResults: NoteResult[];
}

export interface Skills {
  timingAccuracy: number;    // 0.0-1.0
  pitchAccuracy: number;     // 0.0-1.0
  sightReadSpeed: number;    // notes per minute (normalized 0-1)
  chordRecognition: number;  // 0.0-1.0
}

export interface LearnerProfileState {
  noteAccuracy: Record<number, number>;  // MIDI note -> rolling avg 0.0-1.0
  noteAttempts: Record<number, number>;  // MIDI note -> attempt count
  skills: Skills;
  tempoRange: { min: number; max: number }; // comfortable BPM range
  weakNotes: number[];      // MIDI notes below 70% accuracy
  weakSkills: string[];     // Skills below 60%
  totalExercisesCompleted: number;
  lastAssessmentDate: string;
  assessmentScore: number;
  masteredSkills: string[];  // SkillTree node IDs the learner has mastered
  skillMasteryData: Record<string, SkillMasteryRecord>;  // per-skill mastery tracking
  recentExerciseIds: string[];  // last 10 exercise IDs (prevent same-day repeats)

  // Actions
  updateNoteAccuracy: (midiNote: number, accuracy: number) => void;
  updateSkill: (skill: keyof Skills, value: number) => void;
  recalculateWeakAreas: () => void;
  recordExerciseResult: (result: ExerciseResult) => void;
  markSkillMastered: (skillId: string) => void;
  recordSkillPractice: (skillId: string, passed: boolean) => void;
  calculateDecayedSkills: () => string[];
  addRecentExercise: (exerciseId: string) => void;
  reset: () => void;
}

/**
 * ============================================================================
 * EVOLUTION & GEM TYPES
 * ============================================================================
 */

export type EvolutionStage = 'baby' | 'teen' | 'adult' | 'master';

export const EVOLUTION_XP_THRESHOLDS: Record<EvolutionStage, number> = {
  baby: 0,
  teen: 2000,
  adult: 8000,
  master: 25000,
};

/** Discriminated union for ability effects */
export type AbilityEffect =
  | { type: 'timing_window_multiplier'; multiplier: number }
  | { type: 'tempo_reduction'; bpmReduction: number }
  | { type: 'xp_multiplier'; multiplier: number }
  | { type: 'combo_shield'; missesForgivenPerExercise: number }
  | { type: 'score_boost'; percentageBoost: number }
  | { type: 'hint_frequency_boost'; multiplier: number }
  | { type: 'streak_saver'; freeSavesPerWeek: number }
  | { type: 'gem_magnet'; bonusGemChance: number }
  | { type: 'extra_retries'; extraRetries: number }
  | { type: 'ghost_notes_extended'; extraFailsBeforeTrigger: number }
  | { type: 'daily_xp_boost'; multiplier: number }
  | { type: 'note_preview'; previewBeats: number }
  | { type: 'perfect_shield'; shieldsPerExercise: number }
  | { type: 'lucky_gems'; bonusGemMultiplier: number }
  | { type: 'all_abilities_half'; description: string };

export interface CatAbility {
  id: string;
  name: string;
  description: string;
  icon: string; // MaterialCommunityIcons name
  effect: AbilityEffect;
  unlockedAtStage: EvolutionStage;
}

export interface CatStageVisuals {
  accessories: string[];   // SVG accessory identifiers to render
  hasGlow: boolean;
  hasParticles: boolean;
  hasCrown: boolean;
  auraIntensity: number;   // 0-1
}

export interface CatEvolutionData {
  catId: string;
  currentStage: EvolutionStage;
  xpAccumulated: number;
  abilitiesUnlocked: string[];
  evolvedAt: Record<EvolutionStage, number | null>; // epoch ms or null
}

export interface GemTransaction {
  amount: number;
  source: string;
  timestamp: number;
  balance: number;
}

export interface DailyRewardDay {
  day: number; // 1-7
  reward: {
    type: 'gems' | 'xp_boost' | 'streak_freeze' | 'chest';
    amount: number;
  };
  claimed: boolean;
}

/**
 * ============================================================================
 * SOCIAL & LEAGUE TYPES
 * ============================================================================
 */

export type RankedTier = 'novice' | 'apprentice' | 'performer' | 'virtuoso'
  | 'maestro' | 'prodigy' | 'luminary' | 'legend' | 'grandmaster';

/** @deprecated Use RankedTier directly. Alias kept for migration. */
export type LeagueTier = RankedTier;

export type FriendStatus = 'pending_outgoing' | 'pending_incoming' | 'accepted';

export interface FriendConnection {
  uid: string;
  displayName: string;
  selectedCatId: string;
  status: FriendStatus;
  connectedAt: number; // epoch ms
}

export interface ActivityFeedItem {
  id: string;
  friendUid: string;
  friendDisplayName: string;
  friendCatId: string;
  type: 'streak_milestone' | 'level_up' | 'evolution' | 'song_mastered' | 'league_promoted';
  detail: string;
  timestamp: number;
}

export interface LeagueMembership {
  leagueId: string;
  tier: RankedTier;
  weekStart: string; // ISO date
  weeklyXp: number;
  rank: number;
  totalMembers: number;
}

export interface FriendChallenge {
  id: string;
  fromUid: string;
  fromDisplayName: string;
  fromCatId: string;
  toUid: string;
  toDisplayName?: string;
  exerciseId: string;
  exerciseTitle: string;
  fromScore: number;
  toScore: number | null;
  status: 'pending' | 'completed' | 'expired';
  createdAt: number;
  expiresAt: number;
  /** Optional gem stake — 0 or undefined means no stake */
  gemStake?: number;
  /** Total pot awarded to winner (2x stake). Set when challenge resolves. */
  winnerGems?: number;
  /** UID of the winner. Set when challenge resolves. */
  winnerUid?: string;
  /** Epoch ms when gem stake was resolved */
  resolvedAt?: number;
}

export interface ShareCardData {
  type: 'score' | 'streak' | 'evolution' | 'league';
  title: string;
  subtitle: string;
  value: string;
  catId: string;
  evolutionStage: number;
}

/**
 * ============================================================================
 * RANKED & COMPETITIVE TYPES (Phase 14)
 * ============================================================================
 */

export interface PlayerRating {
  mmr: number;
  tier: RankedTier;
  division: 1 | 2 | 3;
  rp: number;
  peakMmr: number;
  peakTier: RankedTier;
  recentScores: number[];
  exerciseTypesCompleted: string[];
  promotionSeries: { wins: number; losses: number; active: boolean } | null;
  demotionGrace: number;
}

export type FeedItemType =
  | 'exercise_completion' | 'level_up' | 'cat_evolution' | 'song_mastery'
  | 'rank_promotion' | 'rank_demotion' | 'season_placement' | 'battle_pass_milestone'
  | 'challenge_result' | 'guild_event' | 'new_friend'
  | 'score_beaten' | 'league_overtake' | 'cat_unlock';

export type ReactionType = '🔥' | '👏' | '😮' | '💪' | '😂';

export interface RichFeedItem {
  id: string;
  type: FeedItemType;
  actorUid: string;
  actorDisplayName: string;
  actorCatId: string;
  actorRankTier: RankedTier;
  actorRankDivision: number;
  payload: Record<string, unknown>;
  timestamp: number;
  reactions: Record<string, string[]>;
  isEngagementTrigger: boolean;
  targetUid?: string;
}

export interface SeasonState {
  currentSeason: number;
  seasonStartDate: string;
  seasonEndDate: string;
  placementComplete: boolean;
  placementScores: number[];
  battlePassTier: number;
  battlePassXp: number;
  claimedRewards: string[];
  peakTier: RankedTier;
  seasonHistory: SeasonRecord[];
}

export interface SeasonRecord {
  seasonNumber: number;
  peakTier: RankedTier;
  peakDivision: number;
  finalMmr: number;
  battlePassTier: number;
  gemsEarned: number;
  exclusivesEarned: string[];
}

export interface Guild {
  id: string;
  name: string;
  icon: string;
  description: string;
  joinPolicy: 'open' | 'invite_only' | 'closed';
  leaderUid: string;
  level: number;
  guildXp: number;
  memberCount: number;
  weeklyXp: number;
  minWeeklyXp: number;
  bannerColor: string;
  createdAt: number;
}

export interface GuildMember {
  uid: string;
  displayName: string;
  catId: string;
  rankTier: RankedTier;
  role: 'leader' | 'co_leader' | 'member';
  weeklyXp: number;
  totalGuildXp: number;
  joinedAt: number;
  lastActiveAt: number;
  warStrikes: number;
}

export interface GuildWar {
  id: string;
  guildAId: string;
  guildBId: string;
  guildAName: string;
  guildBName: string;
  startedAt: number;
  endsAt: number;
  status: 'matching' | 'active' | 'completed';
  guildAWarPoints: number;
  guildBWarPoints: number;
  winnerId: string | null;
  mvpUid: string | null;
}

export interface Referral {
  inviterUid: string;
  inviteeUid: string;
  inviteCode: string;
  installedAt: number;
  rewardClaimedAt: number | null;
  platform: 'sms' | 'whatsapp' | 'social' | 'qr' | 'link';
}

/**
 * ============================================================================
 * DERIVED STATE UTILITIES
 * ============================================================================
 */

export interface LevelProgressInfo {
  level: number;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpToNextLevel: number;
  percentToNextLevel: number;
}

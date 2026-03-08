/**
 * Demo Playback Service
 *
 * Auto-plays an exercise at full tempo with perfect accuracy.
 * Used for the "Watch Demo" feature where the student sees exactly
 * how a piece should be played — correct notes, correct timing.
 *
 * Design decisions:
 * - All notes are played (no skipping — demo must be pedagogically accurate)
 * - No timing jitter (demo shows exact rhythm)
 * - Velocity is 0.7 (not full force — gentle demo feel)
 * - Stateless enough to create fresh instances per exercise attempt
 * - No React imports — pure TypeScript service
 */

import type { Exercise, NoteEvent } from '@/core/exercises/types';
import type { NoteHandle } from '@/audio/types';
import type {
  ReplayPlan,
  PausePoint,
  ReplayComment,
  SpeedZoneEntry,
} from '@/core/exercises/replayTypes';

// ============================================================================
// Types
// ============================================================================

/**
 * Minimal audio engine interface for demo playback.
 * Matches IAudioEngine.playNote / releaseNote signatures.
 */
interface DemoAudioEngine {
  playNote(note: number, velocity: number): NoteHandle;
  releaseNote(handle: NoteHandle): void;
}

export interface DemoScheduleEntry {
  /** The original note event from the exercise */
  note: NoteEvent;
  /** Whether this note should be played (false = skip, simulating imperfection) */
  play: boolean;
  /** Timing offset in milliseconds (positive = late, negative = early) */
  jitterMs: number;
}

// ============================================================================
// Schedule Generation
// ============================================================================

/**
 * Generate a perfect demo schedule — all notes played, no jitter.
 *
 * @param notes - The exercise's note events
 * @returns Schedule entries, one per note (all marked play: true)
 */
export function generateDemoSchedule(notes: NoteEvent[]): DemoScheduleEntry[] {
  return notes.map((note) => ({ note, play: true, jitterMs: 0 }));
}

// ============================================================================
// Demo Playback Service
// ============================================================================

/**
 * Service that drives demo playback of an exercise.
 *
 * Usage:
 * ```ts
 * const demo = new DemoPlaybackService();
 * demo.start(exercise, audioEngine, 0.6, onBeatUpdate, onActiveNotes);
 * // ...later...
 * demo.stop();
 * ```
 */
export class DemoPlaybackService {
  /** Whether demo playback is currently active */
  isPlaying = false;

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private schedule: DemoScheduleEntry[] = [];

  /** Track which notes have been triggered (by schedule index) */
  private scheduledNoteIndices = new Set<number>();
  /** Track which notes have been released (by schedule index) */
  private releasedNoteIndices = new Set<number>();
  /** Map schedule index to audio handle for release */
  private activeHandles = new Map<number, NoteHandle>();

  // ---- Replay state ----
  private replayPlan: ReplayPlan | null = null;
  private replayTempo = 120;
  private replayCallbacks: {
    onBeatUpdate?: (beat: number) => void;
    onActiveNotes?: (notes: Set<number>) => void;
    onPausePoint?: (pausePoint: PausePoint) => void;
    onComment?: (comment: ReplayComment) => void;
    onComplete?: () => void;
  } = {};
  /** Tracks the accumulated "real" beat position, accounting for speed zones */
  private replayBeatOffset = 0;
  /** Wall-clock time when the current replay segment started */
  private replaySegmentStart = 0;
  /** The beat position at the start of the current replay segment */
  private replaySegmentBeatStart = 0;
  /** Set of pause-point indices already fired */
  private firedPauseIndices = new Set<number>();
  /** Set of comment indices already fired */
  private firedCommentIndices = new Set<number>();

  /**
   * Start demo playback of an exercise.
   *
   * @param exercise - The exercise to play
   * @param audioEngine - Audio engine for sound output
   * @param speedMultiplier - Tempo multiplier (default 1.0 = full speed)
   * @param onBeatUpdate - Called every frame (~16ms) with the current beat position
   * @param onActiveNotes - Called every frame with the Set of currently sounding MIDI notes
   */
  /** Called when demo finishes (auto-stop at end of exercise) */
  private onCompleteCallback?: () => void;
  private audioEngineRef?: DemoAudioEngine;

  start(
    exercise: Pick<Exercise, 'notes' | 'settings'>,
    audioEngine: DemoAudioEngine,
    speedMultiplier: number = 1.0,
    onBeatUpdate?: (beat: number) => void,
    onActiveNotes?: (notes: Set<number>) => void,
    onComplete?: () => void,
  ): void {
    // Clean up any previous playback
    this.stop();

    this.isPlaying = true;
    this.startTime = Date.now();
    this.onCompleteCallback = onComplete;
    this.audioEngineRef = audioEngine;
    this.schedule = generateDemoSchedule(exercise.notes);
    this.scheduledNoteIndices.clear();
    this.releasedNoteIndices.clear();
    this.activeHandles.clear();

    const effectiveTempo = exercise.settings.tempo * speedMultiplier;
    const msPerBeat = 60000 / effectiveTempo;

    // Calculate total duration: last note end + 1 beat buffer, minimum 4 beats
    const totalBeats = Math.max(
      ...exercise.notes.map((n) => n.startBeat + n.durationBeats),
      4,
    );

    this.intervalId = setInterval(() => {
      if (!this.isPlaying) return;

      const elapsed = Date.now() - this.startTime;
      const currentBeat = elapsed / msPerBeat;

      // Report beat position
      onBeatUpdate?.(currentBeat);

      // Process note scheduling
      const activeNotes = new Set<number>();

      for (let i = 0; i < this.schedule.length; i++) {
        const entry = this.schedule[i];
        if (!entry.play) continue;

        // Convert jitter from ms to beats for beat-based comparison
        const jitterBeats = entry.jitterMs / msPerBeat;
        const noteOnBeat = entry.note.startBeat + jitterBeats;
        const noteOffBeat = entry.note.startBeat + entry.note.durationBeats + jitterBeats;

        // Trigger note-on when currentBeat reaches the note's start
        if (!this.scheduledNoteIndices.has(i) && currentBeat >= noteOnBeat) {
          this.scheduledNoteIndices.add(i);
          const handle = audioEngine.playNote(entry.note.note, 0.7);
          this.activeHandles.set(i, handle);
        }

        // Track currently active notes (started but not yet released)
        if (this.scheduledNoteIndices.has(i) && !this.releasedNoteIndices.has(i)) {
          activeNotes.add(entry.note.note);
        }

        // Trigger note-off when currentBeat reaches the note's end
        if (
          this.scheduledNoteIndices.has(i) &&
          !this.releasedNoteIndices.has(i) &&
          currentBeat >= noteOffBeat
        ) {
          this.releasedNoteIndices.add(i);
          const handle = this.activeHandles.get(i);
          if (handle) {
            audioEngine.releaseNote(handle);
          }
          this.activeHandles.delete(i);
        }
      }

      // Report active notes
      onActiveNotes?.(activeNotes);

      // Auto-stop when exercise is complete (totalBeats + 1 beat buffer)
      if (currentBeat > totalBeats + 1) {
        const cb = this.onCompleteCallback;
        this.stop();
        cb?.();
      }
    }, 16); // ~60fps
  }

  /**
   * Stop demo playback and clean up all state.
   * Safe to call multiple times or when not playing.
   */
  stop(): void {
    this.isPlaying = false;

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Release all active notes before clearing — prevents notes ringing forever
    if (this.audioEngineRef) {
      for (const handle of this.activeHandles.values()) {
        this.audioEngineRef.releaseNote(handle);
      }
    }

    // Clean up tracking state
    this.activeHandles.clear();
    this.scheduledNoteIndices.clear();
    this.releasedNoteIndices.clear();
    this.schedule = [];
    this.audioEngineRef = undefined;
    this.onCompleteCallback = undefined;
  }

  // ==========================================================================
  // Replay Mode
  // ==========================================================================

  /**
   * Start replay playback driven by a ReplayPlan.
   *
   * Replay mode supports:
   * - Speed zones: 'fast' zones play at 2x tempo, 'normal' at 1x
   * - Pause points: playback auto-pauses and fires onPausePoint callback
   * - Comments: fires onComment when beat crosses a comment position
   * - Skipped notes: entries with play=false advance visually but produce no audio
   *
   * @param plan - The replay plan containing entries, speed zones, pause points, comments
   * @param tempo - Base tempo in BPM (before speed zone multipliers)
   * @param audioEngine - Audio engine for sound output
   * @param callbacks - Event callbacks for beat updates, pauses, comments, completion
   */
  startReplay(
    plan: ReplayPlan,
    tempo: number,
    audioEngine: DemoAudioEngine,
    callbacks: {
      onBeatUpdate?: (beat: number) => void;
      onActiveNotes?: (notes: Set<number>) => void;
      onPausePoint?: (pausePoint: PausePoint) => void;
      onComment?: (comment: ReplayComment) => void;
      onComplete?: () => void;
    },
  ): void {
    // Clean up any previous playback (demo or replay)
    this.stop();

    this.isPlaying = true;
    this.audioEngineRef = audioEngine;
    this.replayPlan = plan;
    this.replayTempo = tempo;
    this.replayCallbacks = callbacks;

    // Reset tracking state
    this.scheduledNoteIndices.clear();
    this.releasedNoteIndices.clear();
    this.activeHandles.clear();
    this.firedPauseIndices.clear();
    this.firedCommentIndices.clear();

    // Start from beat 0
    this.replayBeatOffset = 0;
    this.replaySegmentStart = Date.now();
    this.replaySegmentBeatStart = 0;

    this._startReplayInterval();
  }

  /**
   * Resume replay after a pause point has been dismissed.
   * Restarts the interval from the current beat position.
   */
  resumeReplay(): void {
    if (!this.replayPlan) return;

    this.isPlaying = true;
    this.replaySegmentStart = Date.now();
    this.replaySegmentBeatStart = this.replayBeatOffset;

    this._startReplayInterval();
  }

  /**
   * Seek to a specific beat position in the replay.
   * Resets all pause/comment/note tracking so they can re-fire.
   *
   * @param beat - The beat position to jump to
   */
  seekReplay(beat: number): void {
    if (!this.replayPlan) return;

    // Stop the current interval but don't wipe all state
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Release all active notes
    if (this.audioEngineRef) {
      for (const handle of this.activeHandles.values()) {
        this.audioEngineRef.releaseNote(handle);
      }
    }

    // Reset tracking
    this.activeHandles.clear();
    this.scheduledNoteIndices.clear();
    this.releasedNoteIndices.clear();
    this.firedPauseIndices.clear();
    this.firedCommentIndices.clear();

    // Mark notes/pauses/comments before the seek position as already fired
    const plan = this.replayPlan;

    for (let i = 0; i < plan.entries.length; i++) {
      const entry = plan.entries[i];
      const noteEndBeat = entry.note.startBeat + entry.note.durationBeats;
      if (noteEndBeat <= beat) {
        this.scheduledNoteIndices.add(i);
        this.releasedNoteIndices.add(i);
      }
    }

    for (let i = 0; i < plan.pausePoints.length; i++) {
      if (plan.pausePoints[i].beatPosition <= beat) {
        this.firedPauseIndices.add(i);
      }
    }

    for (let i = 0; i < plan.comments.length; i++) {
      if (plan.comments[i].beatPosition <= beat) {
        this.firedCommentIndices.add(i);
      }
    }

    // Set new position
    this.replayBeatOffset = beat;
    this.replaySegmentStart = Date.now();
    this.replaySegmentBeatStart = beat;

    // Restart if we were playing
    if (this.isPlaying) {
      this._startReplayInterval();
    }
  }

  // --------------------------------------------------------------------------
  // Private replay helpers
  // --------------------------------------------------------------------------

  /**
   * Determine the speed multiplier for a given beat based on speed zones.
   * Returns 2.0 for 'fast' zones, 1.0 for 'normal'.
   */
  private _getSpeedMultiplier(beat: number, speedZones: SpeedZoneEntry[]): number {
    for (const zone of speedZones) {
      if (beat >= zone.fromBeat && beat < zone.toBeat) {
        return zone.zone === 'fast' ? 2.0 : 1.0;
      }
    }
    return 1.0;
  }

  /**
   * Start the 16ms replay tick interval.
   */
  private _startReplayInterval(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }

    const plan = this.replayPlan!;
    const audioEngine = this.audioEngineRef!;
    const callbacks = this.replayCallbacks;
    const baseMsPerBeat = 60000 / this.replayTempo;

    this.intervalId = setInterval(() => {
      if (!this.isPlaying) return;

      // Calculate current beat accounting for speed zones
      const elapsedMs = Date.now() - this.replaySegmentStart;
      const speedMultiplier = this._getSpeedMultiplier(
        this.replaySegmentBeatStart,
        plan.speedZones,
      );
      const effectiveMsPerBeat = baseMsPerBeat / speedMultiplier;
      const currentBeat = this.replaySegmentBeatStart + elapsedMs / effectiveMsPerBeat;

      // Check if we've crossed into a different speed zone — if so, anchor a new segment
      const newMultiplier = this._getSpeedMultiplier(currentBeat, plan.speedZones);
      if (newMultiplier !== speedMultiplier) {
        this.replayBeatOffset = currentBeat;
        this.replaySegmentStart = Date.now();
        this.replaySegmentBeatStart = currentBeat;
      } else {
        this.replayBeatOffset = currentBeat;
      }

      // Report beat position
      callbacks.onBeatUpdate?.(currentBeat);

      // Check pause points
      for (let i = 0; i < plan.pausePoints.length; i++) {
        if (this.firedPauseIndices.has(i)) continue;
        const pp = plan.pausePoints[i];
        if (currentBeat >= pp.beatPosition) {
          this.firedPauseIndices.add(i);

          // Auto-pause: stop interval, release active notes
          this.isPlaying = false;
          if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
          if (this.audioEngineRef) {
            for (const handle of this.activeHandles.values()) {
              this.audioEngineRef.releaseNote(handle);
            }
          }
          this.activeHandles.clear();

          callbacks.onPausePoint?.(pp);
          return; // Exit the tick — caller must call resumeReplay()
        }
      }

      // Check comments
      for (let i = 0; i < plan.comments.length; i++) {
        if (this.firedCommentIndices.has(i)) continue;
        const comment = plan.comments[i];
        if (currentBeat >= comment.beatPosition) {
          this.firedCommentIndices.add(i);
          callbacks.onComment?.(comment);
        }
      }

      // Process note scheduling
      const activeNotes = new Set<number>();

      for (let i = 0; i < plan.entries.length; i++) {
        const entry = plan.entries[i];

        // Convert jitter from ms to beats for beat-based comparison
        const jitterBeats = entry.jitterMs / baseMsPerBeat;
        const noteOnBeat = entry.note.startBeat + jitterBeats;
        const noteOffBeat =
          entry.note.startBeat + entry.note.durationBeats + jitterBeats;

        // Trigger note-on when currentBeat reaches the note's start
        if (!this.scheduledNoteIndices.has(i) && currentBeat >= noteOnBeat) {
          this.scheduledNoteIndices.add(i);
          // Only produce audio for entries marked play: true
          if (entry.play) {
            const handle = audioEngine.playNote(entry.note.note, 0.7);
            this.activeHandles.set(i, handle);
          }
        }

        // Track currently active notes (started but not yet released)
        if (this.scheduledNoteIndices.has(i) && !this.releasedNoteIndices.has(i)) {
          activeNotes.add(entry.note.note);
        }

        // Trigger note-off when currentBeat reaches the note's end
        if (
          this.scheduledNoteIndices.has(i) &&
          !this.releasedNoteIndices.has(i) &&
          currentBeat >= noteOffBeat
        ) {
          this.releasedNoteIndices.add(i);
          const handle = this.activeHandles.get(i);
          if (handle) {
            audioEngine.releaseNote(handle);
          }
          this.activeHandles.delete(i);
        }
      }

      // Report active notes
      callbacks.onActiveNotes?.(activeNotes);

      // Auto-complete when all beats are done (totalBeats + 1 beat buffer)
      if (currentBeat > plan.totalBeats + 1) {
        const onComplete = callbacks.onComplete;
        this.stop();
        onComplete?.();
      }
    }, 16); // ~60fps
  }
}

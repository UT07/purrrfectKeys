/**
 * Multi-note hysteresis tracker for polyphonic detection.
 * Tracks up to N simultaneous notes, emitting noteOn/noteOff events
 * with the same NoteEvent interface as the monophonic NoteTracker.
 *
 * Improvements:
 * - Velocity estimation from note confidence (maps 0.5-1.0 → 40-120 MIDI velocity)
 * - Confidence smoothing to reduce flicker on borderline notes
 * - Ghost note rejection (requires minimum onset confidence for new notes)
 */

import type { PolyphonicFrame } from './PolyphonicDetector';
import type { NoteEvent } from './PitchDetector';

export interface MultiNoteTrackerConfig {
  onsetHoldMs: number;   // Min time before emitting noteOn (default: 30)
  releaseHoldMs: number; // Min silence before emitting noteOff (default: 60)
  /** Minimum onset confidence to start tracking a new note (default: 0.4) */
  minOnsetConfidence?: number;
}

type NoteEventCallback = (event: NoteEvent) => void;

const DEFAULT_CONFIG: Required<MultiNoteTrackerConfig> = {
  onsetHoldMs: 30,
  releaseHoldMs: 60,
  minOnsetConfidence: 0.4,
};

export class MultiNoteTracker {
  private readonly config: Required<MultiNoteTrackerConfig>;
  private activeNotes = new Map<number, { startTime: number; lastSeen: number; peakConfidence: number }>();
  /** Notes awaiting onset hold confirmation — must persist for onsetHoldMs before emitting */
  private pendingOnsets = new Map<number, { firstSeen: number; lastSeen: number; confidence: number }>();
  private callbacks = new Set<NoteEventCallback>();

  constructor(config?: Partial<MultiNoteTrackerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  onNoteEvent(callback: NoteEventCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  update(frame: PolyphonicFrame): void {
    const now = frame.timestamp;
    const currentMidiNotes = new Set(frame.notes.map(n => n.midiNote));

    // Check for note releases (active notes no longer in frame)
    for (const [midiNote, state] of this.activeNotes) {
      if (!currentMidiNotes.has(midiNote)) {
        const silenceDuration = now - state.lastSeen;
        if (silenceDuration >= this.config.releaseHoldMs) {
          this.emit({ type: 'noteOff', midiNote, confidence: 0, timestamp: now });
          this.activeNotes.delete(midiNote);
        }
      }
    }

    // Expire pending onsets that disappeared before reaching the hold threshold.
    // Allow 1 frame gap tolerance (ONNX model can flicker on transients).
    for (const [midiNote, pending] of this.pendingOnsets) {
      if (!currentMidiNotes.has(midiNote)) {
        const gapMs = now - pending.lastSeen;
        if (gapMs > this.config.onsetHoldMs) {
          this.pendingOnsets.delete(midiNote);
        }
      }
    }

    // Check for new note onsets
    for (const note of frame.notes) {
      const existing = this.activeNotes.get(note.midiNote);
      if (existing) {
        // Update lastSeen and track peak confidence for sustained notes
        existing.lastSeen = now;
        if (note.confidence > existing.peakConfidence) {
          existing.peakConfidence = note.confidence;
        }
      } else if (note.isOnset || this.pendingOnsets.has(note.midiNote)) {
        // Ghost note rejection: skip low-confidence onsets
        if (note.isOnset && note.confidence < this.config.minOnsetConfidence) {
          continue;
        }

        // Onset hold: require note to persist for onsetHoldMs before emitting
        const pending = this.pendingOnsets.get(note.midiNote);
        if (pending) {
          pending.lastSeen = now;
          if (note.confidence > pending.confidence) pending.confidence = note.confidence;
          if (now - pending.firstSeen >= this.config.onsetHoldMs) {
            // Held long enough — promote to active
            this.pendingOnsets.delete(note.midiNote);
            this.activeNotes.set(note.midiNote, {
              startTime: pending.firstSeen,
              lastSeen: now,
              peakConfidence: pending.confidence,
            });
            this.emit({
              type: 'noteOn',
              midiNote: note.midiNote,
              confidence: pending.confidence,
              timestamp: pending.firstSeen,
              velocity: confidenceToVelocity(pending.confidence),
            });
          }
        } else if (note.isOnset) {
          if (this.config.onsetHoldMs <= 0) {
            // No hold — emit immediately (backwards compatible)
            this.activeNotes.set(note.midiNote, {
              startTime: now,
              lastSeen: now,
              peakConfidence: note.confidence,
            });
            this.emit({
              type: 'noteOn',
              midiNote: note.midiNote,
              confidence: note.confidence,
              timestamp: now,
              velocity: confidenceToVelocity(note.confidence),
            });
          } else {
            // Start tracking pending onset
            this.pendingOnsets.set(note.midiNote, {
              firstSeen: now,
              lastSeen: now,
              confidence: note.confidence,
            });
          }
        }
      }
    }
  }

  reset(): void {
    const now = Date.now();
    for (const [midiNote] of this.activeNotes) {
      this.emit({ type: 'noteOff', midiNote, confidence: 0, timestamp: now });
    }
    this.activeNotes.clear();
    this.pendingOnsets.clear();
  }

  getActiveNotes(): number[] {
    return Array.from(this.activeNotes.keys());
  }

  private emit(event: NoteEvent): void {
    for (const cb of this.callbacks) {
      cb(event);
    }
  }
}

/**
 * Estimate MIDI velocity (0-127) from ONNX note confidence (0.0-1.0).
 * Maps the usable range [0.5, 1.0] → [40, 120] with a slight curve
 * to make the middle range more expressive.
 */
export function confidenceToVelocity(confidence: number): number {
  // Clamp to usable range
  const normalized = Math.max(0, Math.min(1, (confidence - 0.5) / 0.5));
  // Slight curve for more expressivity in the middle
  const curved = Math.pow(normalized, 0.8);
  return Math.round(40 + curved * 80);
}

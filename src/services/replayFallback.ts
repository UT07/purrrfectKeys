import type { NoteScore } from '../core/exercises/types';
import type { PausePoint, ReplayComment } from '../core/exercises/replayTypes';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

function keyDistance(from: number, to: number): { distance: number; direction: string } {
  const diff = to - from;
  return {
    distance: Math.abs(diff),
    direction: diff > 0 ? 'right' : 'left',
  };
}

function snapToBarLine(beat: number, beatsPerBar: number = 4): number {
  return Math.floor(beat / beatsPerBar) * beatsPerBar;
}

/**
 * Select up to 3 pause points from score details, prioritizing:
 * 1. Wrong pitch (most confusing)
 * 2. Consecutive missed notes (lost their place)
 * 3. Consistent timing issues (same direction)
 */
export function selectAlgorithmicPausePoints(
  details: NoteScore[],
  beatsPerBar: number = 4,
): PausePoint[] {
  const candidates: Array<{ detail: NoteScore; index: number; priority: number }> = [];

  for (let i = 0; i < details.length; i++) {
    const d = details[i];
    if (d.isExtraNote) continue;

    // Skip issues in the last 2 beats (likely just stopping)
    const maxBeat = details
      .filter((dd) => !dd.isExtraNote)
      .reduce((max, dd) => Math.max(max, dd.expected.startBeat + dd.expected.durationBeats), 0);
    if (d.expected.startBeat > maxBeat - 2) continue;

    if (!d.isCorrectPitch && !d.isMissedNote && d.played) {
      // Wrong pitch — highest priority
      candidates.push({ detail: d, index: i, priority: 1 });
    } else if (d.isMissedNote) {
      // Missed note
      candidates.push({ detail: d, index: i, priority: 2 });
    } else if (d.isCorrectPitch && Math.abs(d.timingOffsetMs) > 100) {
      // Significant timing issue
      candidates.push({ detail: d, index: i, priority: 3 });
    }
  }

  // Sort by priority, then by worst timing score
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.detail.timingScore - b.detail.timingScore;
  });

  // Take up to 3, ensuring they're at least 4 beats apart
  const selected: PausePoint[] = [];
  const usedBeats = new Set<number>();

  for (const candidate of candidates) {
    if (selected.length >= 3) break;

    const beat = candidate.detail.expected.startBeat;
    const tooClose = [...usedBeats].some((b) => Math.abs(b - beat) < 4);
    if (tooClose) continue;

    usedBeats.add(beat);
    selected.push(buildPausePoint(candidate.detail, beatsPerBar));
  }

  return selected;
}

function buildPausePoint(detail: NoteScore, beatsPerBar: number): PausePoint {
  const beat = detail.expected.startBeat;
  const fromBeat = Math.max(0, snapToBarLine(beat, beatsPerBar) - beatsPerBar);
  const toBeat = snapToBarLine(beat, beatsPerBar) + beatsPerBar * 2;

  if (!detail.isCorrectPitch && !detail.isMissedNote && detail.played) {
    const expected = midiToName(detail.expected.note);
    const played = midiToName(detail.played.note);
    const { distance, direction } = keyDistance(detail.played.note, detail.expected.note);
    return {
      beatPosition: beat,
      type: 'wrong_pitch',
      explanation: `You played ${played} instead of ${expected}. Look for ${expected} — it's ${distance} key${distance !== 1 ? 's' : ''} to the ${direction}.`,
      showCorrectFromBeat: fromBeat,
      showCorrectToBeat: toBeat,
    };
  }

  if (detail.isMissedNote) {
    const expected = midiToName(detail.expected.note);
    return {
      beatPosition: beat,
      type: 'missed_notes',
      explanation: `You missed ${expected} on beat ${Math.floor(beat) + 1}. Try slowing down and watching the notes as they approach the line.`,
      showCorrectFromBeat: fromBeat,
      showCorrectToBeat: toBeat,
    };
  }

  // Timing issue
  const direction = detail.timingOffsetMs < 0 ? 'early' : 'late';
  const ms = Math.abs(Math.round(detail.timingOffsetMs));
  const note = midiToName(detail.expected.note);
  const type = direction === 'early' ? 'timing_rush' : 'timing_drag';
  return {
    beatPosition: beat,
    type,
    explanation: `${note} was ${ms}ms ${direction} on beat ${Math.floor(beat) + 1}. Try counting along with the metronome to lock in the timing.`,
    showCorrectFromBeat: fromBeat,
    showCorrectToBeat: toBeat,
  };
}

/**
 * Generate evenly-distributed continuous comments for the replay.
 */
export function generateFallbackComments(
  _details: NoteScore[],
  totalBeats: number,
): ReplayComment[] {
  const POSITIVE = ['Good start!', 'Nice!', 'Keep going!', 'Almost there!', 'Strong finish!'];
  const comments: ReplayComment[] = [];

  // Place comments at roughly equal intervals
  const interval = Math.max(4, totalBeats / POSITIVE.length);

  for (let i = 0; i < POSITIVE.length && i * interval < totalBeats; i++) {
    const beat = Math.round(i * interval);
    comments.push({ beatPosition: beat, text: POSITIVE[i] });
  }

  return comments;
}

/**
 * Generate a fallback summary based on score breakdown.
 */
export function generateFallbackSummary(
  details: NoteScore[],
  overallScore: number,
): string {
  if (overallScore >= 95) return 'Nearly flawless! You really nailed this one.';
  if (overallScore >= 80) return 'Solid performance! Just a few small spots to tighten up.';

  const missed = details.filter((d) => d.isMissedNote).length;
  const wrongPitch = details.filter((d) => !d.isCorrectPitch && !d.isMissedNote && !d.isExtraNote).length;
  const timingIssues = details.filter((d) => d.isCorrectPitch && d.timingScore < 50).length;

  const issues: string[] = [];
  if (wrongPitch > 0) issues.push(`${wrongPitch} wrong note${wrongPitch !== 1 ? 's' : ''}`);
  if (missed > 0) issues.push(`${missed} missed note${missed !== 1 ? 's' : ''}`);
  if (timingIssues > 0) issues.push('some timing to work on');

  if (issues.length === 0) return 'Good effort! Keep practicing and it will click.';
  return `A few things to work on: ${issues.join(', ')}. You're making progress!`;
}

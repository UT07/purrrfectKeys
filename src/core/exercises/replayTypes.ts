import type { NoteEvent, NoteScore } from './types';

// --- Color coding ---

export type ReplayNoteColor = 'green' | 'yellow' | 'red' | 'grey' | 'purple';

export function scoreToColor(noteScore: NoteScore): ReplayNoteColor {
  if (noteScore.isExtraNote) return 'purple';
  if (noteScore.isMissedNote) return 'grey';
  if (!noteScore.isCorrectPitch) return 'red';
  if (noteScore.timingScore >= 70) return 'green';
  if (noteScore.timingScore >= 30) return 'yellow';
  return 'red';
}

// --- Replay schedule ---

export interface ReplayScheduleEntry {
  note: NoteEvent;
  play: boolean;
  jitterMs: number;
  status: NoteScore['status'];
  color: ReplayNoteColor;
  /** If wrong pitch, the MIDI note actually played */
  playedNote?: number;
}

// --- Speed zones ---

export type SpeedZone = 'normal' | 'fast';

export interface SpeedZoneEntry {
  fromBeat: number;
  toBeat: number;
  zone: SpeedZone;
}

// --- Pause points (from AI or algorithmic) ---

export interface PausePoint {
  beatPosition: number;
  type: 'wrong_pitch' | 'timing_rush' | 'timing_drag' | 'missed_notes' | 'general';
  explanation: string;
  showCorrectFromBeat: number;
  showCorrectToBeat: number;
}

// --- Continuous comments ---

export interface ReplayComment {
  beatPosition: number;
  text: string;
}

// --- AI response shape ---

export interface ReplayAIResponse {
  pausePoints: PausePoint[];
  continuousComments: ReplayComment[];
  summary: string;
}

export interface IntroAIResponse {
  introText: string;
  tip: string;
  highlightBeats: number[];
  demoBars: { from: number; to: number };
}

// --- Full replay plan ---

export interface ReplayPlan {
  entries: ReplayScheduleEntry[];
  pausePoints: PausePoint[];
  comments: ReplayComment[];
  summary: string;
  speedZones: SpeedZoneEntry[];
  totalBeats: number;
}

// --- Builder functions ---

export function buildReplayEntries(
  details: NoteScore[],
): ReplayScheduleEntry[] {
  return details
    .filter((d) => !d.isExtraNote)
    .map((d) => ({
      note: d.expected,
      play: !d.isMissedNote,
      jitterMs: d.isMissedNote ? 0 : d.timingOffsetMs,
      status: d.status,
      color: scoreToColor(d),
      playedNote: !d.isCorrectPitch && d.played ? d.played.note : undefined,
    }));
}

export function buildSpeedZones(
  entries: ReplayScheduleEntry[],
  pausePoints: PausePoint[],
  totalBeats: number,
): SpeedZoneEntry[] {
  if (entries.length < 30) {
    return [{ fromBeat: 0, toBeat: totalBeats, zone: 'normal' }];
  }

  const beatZones = new Array<SpeedZone>(Math.ceil(totalBeats) + 1).fill('fast');

  // First 4 and last 4 beats: always normal
  for (let b = 0; b < Math.min(4, beatZones.length); b++) beatZones[b] = 'normal';
  for (let b = Math.max(0, beatZones.length - 4); b < beatZones.length; b++)
    beatZones[b] = 'normal';

  // ±4 beats around pause points: normal
  for (const pp of pausePoints) {
    const from = Math.max(0, Math.floor(pp.beatPosition) - 4);
    const to = Math.min(beatZones.length - 1, Math.ceil(pp.beatPosition) + 4);
    for (let b = from; b <= to; b++) beatZones[b] = 'normal';
  }

  // ±4 beats around non-green notes: normal
  for (const entry of entries) {
    if (entry.color !== 'green') {
      const from = Math.max(0, Math.floor(entry.note.startBeat) - 4);
      const to = Math.min(beatZones.length - 1, Math.ceil(entry.note.startBeat) + 4);
      for (let b = from; b <= to; b++) beatZones[b] = 'normal';
    }
  }

  // Merge consecutive same-zone beats into SpeedZoneEntry[]
  const zones: SpeedZoneEntry[] = [];
  let currentZone = beatZones[0];
  let zoneStart = 0;

  for (let b = 1; b < beatZones.length; b++) {
    if (beatZones[b] !== currentZone) {
      zones.push({ fromBeat: zoneStart, toBeat: b, zone: currentZone });
      currentZone = beatZones[b];
      zoneStart = b;
    }
  }
  zones.push({ fromBeat: zoneStart, toBeat: totalBeats, zone: currentZone });

  return zones;
}

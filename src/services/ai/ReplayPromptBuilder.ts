// src/services/ai/ReplayPromptBuilder.ts

import type { NoteScore } from '../../core/exercises/types';
import type { ReplayAIResponse, IntroAIResponse } from '../../core/exercises/replayTypes';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

// --- System prompt for replay analysis ---

const REPLAY_SYSTEM_PROMPT = `You are Salsa, a friendly grey cat piano teacher reviewing a student's performance. You are warm, encouraging, and give specific, actionable advice.

RULES:
1. Return ONLY valid JSON matching the schema below. No markdown, no code fences.
2. Max 3 pause points — pick the 3 most impactful mistakes.
3. Max 5 continuous comments (2-5 words each, encouraging).
4. Pause explanations: 1-2 sentences, specific, actionable. Mention note names.
5. showCorrectFromBeat/showCorrectToBeat: ±2 beats around the mistake, snapped to bar lines.
6. Summary: 1-2 sentences, warm tone.
7. Never mention "AI", "algorithm", or that you're a computer.
8. Use simple language — no jargon like "metacarpal" or "proprioception".

JSON SCHEMA:
{
  "pausePoints": [
    {
      "beatPosition": <number>,
      "type": "wrong_pitch" | "timing_rush" | "timing_drag" | "missed_notes" | "general",
      "explanation": "<1-2 sentences>",
      "showCorrectFromBeat": <number>,
      "showCorrectToBeat": <number>
    }
  ],
  "continuousComments": [
    { "beatPosition": <number>, "text": "<2-5 words>" }
  ],
  "summary": "<1-2 sentences>"
}`;

const INTRO_SYSTEM_PROMPT = `You are Salsa, a friendly grey cat piano teacher introducing an exercise. You are warm, encouraging, and prepare students for what they're about to play.

RULES:
1. Return ONLY valid JSON matching the schema below. No markdown, no code fences.
2. introText: 1-2 sentences introducing the exercise and skill.
3. tip: 1 sentence, specific, actionable practice tip.
4. highlightBeats: 2-4 beat positions that are tricky or important.
5. demoBars: which bars to demo (usually the first 2 bars).
6. Never mention "AI" or that you're a computer.
7. Use simple language.

JSON SCHEMA:
{
  "introText": "<1-2 sentences>",
  "tip": "<1 sentence>",
  "highlightBeats": [<numbers>],
  "demoBars": { "from": <number>, "to": <number> }
}`;

// --- Prompt builders ---

export function buildReplayPrompt(
  _exerciseTitle: string,
  difficulty: number,
  details: NoteScore[],
  overallScore: number,
): string {
  // Derive the actual key from note data rather than relying on the exercise title,
  // which may not match AI-generated exercises (e.g. title says "C practice" but notes use A).
  const nonExtra = details.filter((d) => !d.isExtraNote);
  const uniqueNotes = [...new Set(nonExtra.map((d) => midiToName(d.expected.note)))];
  const notesList = uniqueNotes.slice(0, 8).join(', ');
  let prompt = `The student just played an exercise (difficulty ${difficulty}/5, notes: ${notesList}). Overall score: ${overallScore}%.\n\nPer-note results:\n`;

  for (const d of nonExtra) {
    const expected = midiToName(d.expected.note);
    const beat = d.expected.startBeat;

    if (d.isMissedNote) {
      prompt += `Beat ${beat}: Expected ${expected} — MISSED\n`;
    } else if (!d.isCorrectPitch && d.played) {
      const played = midiToName(d.played.note);
      prompt += `Beat ${beat}: Expected ${expected}, played ${played} — WRONG PITCH\n`;
    } else {
      const offsetDir = d.timingOffsetMs < 0 ? 'early' : d.timingOffsetMs > 0 ? 'late' : 'on time';
      const ms = Math.abs(Math.round(d.timingOffsetMs));
      const label = d.timingScore >= 70 ? 'GOOD' : d.timingScore >= 30 ? 'OK' : 'POOR';
      prompt += `Beat ${beat}: ${expected} — ${label} (${ms}ms ${offsetDir})\n`;
    }
  }

  const totalBeats = nonExtra.reduce(
    (max, d) => Math.max(max, d.expected.startBeat + d.expected.durationBeats),
    0,
  );
  prompt += `\nTotal beats: ${totalBeats}. Beats per bar: 4.\n`;
  prompt += `\nRespond with JSON only.`;

  return prompt;
}

export function buildIntroPrompt(
  exerciseTitle: string,
  difficulty: number,
  skills: string[],
  totalBeats: number,
  previousScore: number | null,
  failCount: number,
): string {
  let prompt = `Exercise: "${exerciseTitle}" (difficulty ${difficulty}/5)\n`;
  prompt += `Skills: ${skills.join(', ')}\n`;
  prompt += `Total beats: ${totalBeats}, beats per bar: 4\n`;

  if (previousScore !== null) {
    prompt += `Student's last score: ${previousScore}%\n`;
  }
  if (failCount >= 3) {
    prompt += `Student has failed this exercise ${failCount} times. Be extra encouraging and specific.\n`;
  } else if (previousScore === null) {
    prompt += `This is the student's first attempt.\n`;
  }

  prompt += `\nRespond with JSON only.`;
  return prompt;
}

// --- Gemini call wrappers ---

export { REPLAY_SYSTEM_PROMPT, INTRO_SYSTEM_PROMPT };

export function parseReplayResponse(text: string): ReplayAIResponse | null {
  try {
    // Strip potential markdown code fences
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!Array.isArray(parsed.pausePoints) || !Array.isArray(parsed.continuousComments) || typeof parsed.summary !== 'string') {
      return null;
    }

    // Cap at 3 pause points and 5 comments
    parsed.pausePoints = parsed.pausePoints.slice(0, 3);
    parsed.continuousComments = parsed.continuousComments.slice(0, 5);

    return parsed as ReplayAIResponse;
  } catch {
    return null;
  }
}

export function parseIntroResponse(text: string): IntroAIResponse | null {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (typeof parsed.introText !== 'string' || typeof parsed.tip !== 'string') {
      return null;
    }

    return parsed as IntroAIResponse;
  } catch {
    return null;
  }
}

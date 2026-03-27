// src/services/replayCoachingService.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Exercise, ExerciseScore, NoteScore } from '../core/exercises/types';
import type { ReplayPlan, IntroAIResponse } from '../core/exercises/replayTypes';
import { buildReplayEntries, buildSpeedZones, buildReplaySections } from '../core/exercises/replayTypes';
import {
  selectAlgorithmicPausePoints,
  generateFallbackComments,
  generateFallbackSummary,
} from './replayFallback';
import {
  buildReplayPrompt,
  buildIntroPrompt,
  parseReplayResponse,
  parseIntroResponse,
  REPLAY_SYSTEM_PROMPT,
  INTRO_SYSTEM_PROMPT,
} from './ai/ReplayPromptBuilder';

const logger = console;

/**
 * Build a replay plan synchronously using algorithmic fallback only.
 * Always succeeds — no network calls. Returns null if input data is invalid.
 */
export function buildReplayPlanSync(
  exercise: Exercise,
  score: ExerciseScore,
): ReplayPlan | null {
  try {
    const details = score.details ?? [];
    const notes = exercise.notes ?? [];
    if (details.length === 0 && notes.length === 0) return null;

    const entries = buildReplayEntries(details);
    const totalBeats = notes.reduce(
      (max, n) => Math.max(max, n.startBeat + n.durationBeats),
      0,
    );
    const pausePoints = selectAlgorithmicPausePoints(details);
    const comments = generateFallbackComments(details, totalBeats);
    const summary = generateFallbackSummary(details, score.overall);
    const speedZones = buildSpeedZones(entries, pausePoints, totalBeats);
    const beatsPerMeasure = exercise.settings?.timeSignature?.[0] ?? 4;
    const sections = buildReplaySections(entries, totalBeats, beatsPerMeasure);

    return { entries, pausePoints, comments, summary, speedZones, totalBeats, sections };
  } catch (error) {
    logger.warn('[ReplayCoaching] Sync plan build failed:', error);
    return null;
  }
}

/**
 * Build a complete ReplayPlan from exercise score.
 * Tries Gemini AI first, falls back to algorithmic approach.
 * Never throws — always returns a valid plan.
 */
export async function buildReplayPlan(
  exercise: Exercise,
  score: ExerciseScore,
): Promise<ReplayPlan> {
  const details = score.details ?? [];
  const notes = exercise.notes ?? [];
  const entries = buildReplayEntries(details);
  const totalBeats = notes.reduce(
    (max, n) => Math.max(max, n.startBeat + n.durationBeats),
    0,
  );

  // Try Gemini AI for intelligent pause points (only if there are actual mistakes)
  let pausePoints = selectAlgorithmicPausePoints(details);
  let comments = generateFallbackComments(details, totalBeats);
  let summary = generateFallbackSummary(details, score.overall);

  // Skip Gemini for high scores — no mistakes to analyze, and AI may hallucinate
  // issues by comparing exercise title (e.g. "C practice") with actual notes (e.g. A)
  if (score.overall < 95 && pausePoints.length > 0) {
    try {
      const aiResponse = await callGeminiReplay(
        exercise.metadata.title,
        exercise.metadata.difficulty,
        details,
        score.overall,
      );
      if (aiResponse) {
        pausePoints = aiResponse.pausePoints;
        comments = aiResponse.continuousComments;
        summary = aiResponse.summary;
        logger.log('[ReplayCoaching] Using Gemini AI response');
      }
    } catch (error) {
      logger.warn('[ReplayCoaching] Gemini failed, using algorithmic fallback:', error);
    }
  }

  const speedZones = buildSpeedZones(entries, pausePoints, totalBeats);
  const beatsPerMeasure = exercise.settings?.timeSignature?.[0] ?? 4;
  const sections = buildReplaySections(entries, totalBeats, beatsPerMeasure);

  return {
    entries,
    pausePoints,
    comments,
    summary,
    speedZones,
    totalBeats,
    sections,
  };
}

/**
 * Get pre-exercise intro data from Gemini AI.
 * Falls back to template intro if AI fails.
 */
export async function getIntroData(
  exercise: Exercise,
  previousScore: number | null,
  failCount: number,
): Promise<IntroAIResponse> {
  const totalBeats = exercise.notes.reduce(
    (max, n) => Math.max(max, n.startBeat + n.durationBeats),
    0,
  );

  // Default fallback
  const fallback: IntroAIResponse = {
    introText: `Let's practice ${exercise.metadata.title}! Watch the notes and play along.`,
    tip: failCount >= 3
      ? 'Take it slow — focus on getting each note right before speeding up.'
      : 'Keep your wrist relaxed and your fingers curved.',
    highlightBeats: [],
    demoBars: { from: 0, to: Math.min(8, totalBeats) },
  };

  try {
    const aiResponse = await callGeminiIntro(
      exercise.metadata.title,
      exercise.metadata.difficulty,
      exercise.metadata.skills,
      totalBeats,
      previousScore,
      failCount,
    );
    if (aiResponse) {
      logger.log('[ReplayCoaching] Using Gemini AI intro');
      return aiResponse;
    }
  } catch (error) {
    logger.warn('[ReplayCoaching] Gemini intro failed, using template:', error);
  }

  return fallback;
}

// --- Private Gemini call functions ---

async function callGeminiReplay(
  exerciseTitle: string,
  difficulty: number,
  details: NoteScore[],
  overallScore: number,
): Promise<ReturnType<typeof parseReplayResponse>> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;
  // Only call directly in dev mode
  if (!__DEV__) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: REPLAY_SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: 1500,
      temperature: 0.7,
    },
  });

  const prompt = buildReplayPrompt(exerciseTitle, difficulty, details, overallScore);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return parseReplayResponse(text);
}

async function callGeminiIntro(
  exerciseTitle: string,
  difficulty: number,
  skills: string[],
  totalBeats: number,
  previousScore: number | null,
  failCount: number,
): Promise<ReturnType<typeof parseIntroResponse>> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!__DEV__) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: INTRO_SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: 300,
      temperature: 0.7,
    },
  });

  const prompt = buildIntroPrompt(exerciseTitle, difficulty, skills, totalBeats, previousScore, failCount);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return parseIntroResponse(text);
}

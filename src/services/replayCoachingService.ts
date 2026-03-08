// src/services/replayCoachingService.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Exercise, ExerciseScore, NoteScore } from '../core/exercises/types';
import type { ReplayPlan, IntroAIResponse } from '../core/exercises/replayTypes';
import { buildReplayEntries, buildSpeedZones } from '../core/exercises/replayTypes';
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
 * Build a complete ReplayPlan from exercise score.
 * Tries Gemini AI first, falls back to algorithmic approach.
 * Never throws — always returns a valid plan.
 */
export async function buildReplayPlan(
  exercise: Exercise,
  score: ExerciseScore,
): Promise<ReplayPlan> {
  const entries = buildReplayEntries(score.details);
  const totalBeats = exercise.notes.reduce(
    (max, n) => Math.max(max, n.startBeat + n.durationBeats),
    0,
  );

  // Try Gemini AI for intelligent pause points
  let pausePoints = selectAlgorithmicPausePoints(score.details);
  let comments = generateFallbackComments(score.details, totalBeats);
  let summary = generateFallbackSummary(score.details, score.overall);

  try {
    const aiResponse = await callGeminiReplay(
      exercise.metadata.title,
      exercise.metadata.difficulty,
      score.details,
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

  const speedZones = buildSpeedZones(entries, pausePoints, totalBeats);

  return {
    entries,
    pausePoints,
    comments,
    summary,
    speedZones,
    totalBeats,
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
    model: 'gemini-2.0-flash',
    systemInstruction: REPLAY_SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: 500,
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
    model: 'gemini-2.0-flash',
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

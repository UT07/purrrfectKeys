/**
 * PostHog Node.js client for Cloud Functions LLM analytics.
 *
 * Token is read from the POSTHOG_PROJECT_TOKEN Firebase secret (or env var).
 * Host defaults to the EU region used by this project.
 *
 * Usage:
 *   import { captureAIGeneration } from './posthogClient';
 *   await captureAIGeneration({ distinctId, model, provider, ... });
 */

import { PostHog } from 'posthog-node';
import { logger } from 'firebase-functions';
import { randomUUID } from 'crypto';

// Lazily initialised so the import itself never throws.
let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (_client) return _client;

  const token = process.env.POSTHOG_PROJECT_TOKEN;
  if (!token) {
    logger.warn('[PostHog] POSTHOG_PROJECT_TOKEN not set — LLM analytics disabled');
    return null;
  }

  const host = process.env.POSTHOG_HOST;
  if (!host) {
    logger.warn('[PostHog] POSTHOG_HOST not set — LLM analytics disabled');
    return null;
  }

  _client = new PostHog(token, { host, flushAt: 1, flushInterval: 0 });
  return _client;
}

export interface AIGenerationProps {
  /** Firebase Auth UID (used as PostHog distinct_id) */
  distinctId: string;
  /** Model identifier, e.g. 'gemini-2.0-flash' */
  model: string;
  /** Provider name, e.g. 'google' */
  provider: string;
  /** Input token count (may be undefined if not returned by API) */
  inputTokens?: number;
  /** Output token count */
  outputTokens?: number;
  /** Wall-clock latency in seconds */
  latencySeconds: number;
  /** Whether the call resulted in an error */
  isError: boolean;
  /** Error message if isError is true */
  errorMessage?: string;
  /** Optional trace ID to group related generations (defaults to a new UUID) */
  traceId?: string;
}

/**
 * Capture a PostHog $ai_generation event for a single Gemini API call.
 * Safe to call without await — errors are swallowed so they never break the function.
 */
export function captureAIGeneration(props: AIGenerationProps): void {
  try {
    const client = getClient();
    if (!client) return;

    client.capture({
      distinctId: props.distinctId,
      event: '$ai_generation',
      properties: {
        $ai_trace_id: props.traceId ?? randomUUID(),
        $ai_model: props.model,
        $ai_provider: props.provider,
        $ai_input_tokens: props.inputTokens,
        $ai_output_tokens: props.outputTokens,
        $ai_latency: props.latencySeconds,
        $ai_is_error: props.isError,
        ...(props.isError && props.errorMessage ? { $ai_error: props.errorMessage } : {}),
      },
    });

    // posthog-node batches by default; flushAt:1 above sends immediately.
  } catch (err) {
    logger.warn('[PostHog] captureAIGeneration failed silently', { err: String(err) });
  }
}

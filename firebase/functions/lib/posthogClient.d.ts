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
export declare function captureAIGeneration(props: AIGenerationProps): void;
//# sourceMappingURL=posthogClient.d.ts.map
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureAIGeneration = captureAIGeneration;
const posthog_node_1 = require("posthog-node");
const firebase_functions_1 = require("firebase-functions");
const crypto_1 = require("crypto");
// Lazily initialised so the import itself never throws.
let _client = null;
function getClient() {
    if (_client)
        return _client;
    const token = process.env.POSTHOG_PROJECT_TOKEN;
    if (!token) {
        firebase_functions_1.logger.warn('[PostHog] POSTHOG_PROJECT_TOKEN not set — LLM analytics disabled');
        return null;
    }
    const host = process.env.POSTHOG_HOST;
    if (!host) {
        firebase_functions_1.logger.warn('[PostHog] POSTHOG_HOST not set — LLM analytics disabled');
        return null;
    }
    _client = new posthog_node_1.PostHog(token, { host, flushAt: 1, flushInterval: 0 });
    return _client;
}
/**
 * Capture a PostHog $ai_generation event for a single Gemini API call.
 * Safe to call without await — errors are swallowed so they never break the function.
 */
function captureAIGeneration(props) {
    try {
        const client = getClient();
        if (!client)
            return;
        client.capture({
            distinctId: props.distinctId,
            event: '$ai_generation',
            properties: {
                $ai_trace_id: props.traceId ?? (0, crypto_1.randomUUID)(),
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
    }
    catch (err) {
        firebase_functions_1.logger.warn('[PostHog] captureAIGeneration failed silently', { err: String(err) });
    }
}
//# sourceMappingURL=posthogClient.js.map
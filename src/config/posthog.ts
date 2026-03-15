/**
 * PostHog client configuration
 *
 * Reads token and host from app.config.js extras via expo-constants so that
 * values are embedded at build time and never exposed as plain EXPO_PUBLIC_*
 * variables in the JS bundle.
 *
 * @see https://posthog.com/docs/libraries/react-native
 */
import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';
import { logger } from '../utils/logger';

const apiKey = Constants.expoConfig?.extra?.posthogProjectToken as string | undefined;
const host = Constants.expoConfig?.extra?.posthogHost as string | undefined;

const isConfigured = Boolean(apiKey && apiKey !== 'phc_your_project_token_here');

if (!isConfigured) {
  logger.warn(
    '[PostHog] Project token not configured. Set POSTHOG_PROJECT_TOKEN in .env.local to enable analytics.'
  );
} else {
  const masked = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'null';
  logger.log(`[PostHog] Configured with token ${masked}, host=${host ?? 'default'}`);
}

/**
 * Shared PostHog client instance.
 * Import this in AnalyticsService and pass as `client` to PostHogProvider.
 */
export const posthog = new PostHog(apiKey ?? 'placeholder_key', {
  host,
  disabled: !isConfigured,
  captureAppLifecycleEvents: true,
  flushAt: 5,
  flushInterval: 5000,
  maxBatchSize: 100,
  maxQueueSize: 1000,
  preloadFeatureFlags: true,
  sendFeatureFlagEvent: true,
  featureFlagsRequestTimeoutMs: 10000,
  requestTimeout: 10000,
  fetchRetryCount: 3,
  fetchRetryDelay: 3000,
});

export const isPostHogEnabled = isConfigured;

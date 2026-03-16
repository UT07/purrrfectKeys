/**
 * Sentry Error Monitoring Service
 *
 * Provides crash reporting, performance monitoring, session replay,
 * and structured error tracking.
 *
 * PostHog integration: Every Sentry error is also forwarded to PostHog as an
 * `$exception` event so that errors appear in the PostHog dashboard alongside
 * analytics (single pane of glass). The Sentry event_id is included so you can
 * click through to the full Sentry issue when needed.
 *
 * Setup requires EXPO_PUBLIC_SENTRY_DSN in environment.
 */

import { logger } from '../../utils/logger';

// Lazy-load PostHog client — imported lazily to avoid circular dependencies
// and so tests can mock the module before it's required.
function getPostHogClient(): { capture: (event: string, properties?: Record<string, unknown>) => void; getDistinctId: () => string } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../config/posthog');
    return mod.posthog ?? null;
  } catch {
    return null;
  }
}

// Lazy-load Sentry to avoid crashes if not installed in dev
let Sentry: typeof import('@sentry/react-native') | null = null;

function getSentry() {
  if (Sentry) return Sentry;
  try {
    Sentry = require('@sentry/react-native');
    return Sentry;
  } catch {
    return null;
  }
}

const SENTRY_DSN = typeof process !== 'undefined'
  ? process.env.EXPO_PUBLIC_SENTRY_DSN
  : undefined;

// Navigation integration instance — shared with AppNavigator
let _navigationIntegration: ReturnType<typeof import('@sentry/react-native').reactNavigationIntegration> | null = null;

export class SentryService {
  private static initialized = false;

  /**
   * Initialize Sentry with full configuration.
   * Call once in App.tsx before any other operations.
   */
  static initialize(): void {
    if (this.initialized) return;

    const sentry = getSentry();
    if (!sentry || !SENTRY_DSN) {
      logger.warn('[Sentry] Not configured — error monitoring disabled. Set EXPO_PUBLIC_SENTRY_DSN.');
      return;
    }

    try {
      // Create navigation integration for automatic screen tracking + performance spans
      _navigationIntegration = sentry.reactNavigationIntegration({
        enableTimeToInitialDisplay: true,
      });

      const integrations: any[] = [_navigationIntegration];

      // Add mobile session replay (visual debugging with touch events)
      if (sentry.mobileReplayIntegration) {
        integrations.push(
          sentry.mobileReplayIntegration({
            maskAllText: false,
            maskAllImages: false,
            maskAllVectors: false,
          }),
        );
      }

      sentry.init({
        dsn: SENTRY_DSN,
        debug: __DEV__,

        // Session tracking
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000,

        // Performance sampling
        tracesSampleRate: __DEV__ ? 1.0 : 0.3,
        profilesSampleRate: __DEV__ ? 1.0 : 0.1,

        // Session replay sampling
        replaysSessionSampleRate: __DEV__ ? 1.0 : 0.1,
        replaysOnErrorSampleRate: 1.0, // Always replay on error

        environment: __DEV__ ? 'development' : 'production',

        // Propagate traces to our Firebase Cloud Functions
        tracePropagationTargets: [
          'us-central1-keysense-app.cloudfunctions.net',
          /^https:\/\/firestore\.googleapis\.com/,
        ],

        integrations,

        // Scrub PII and forward errors to PostHog for single-pane-of-glass monitoring
        beforeSend(event) {
          // PII scrubbing
          if (event.user) {
            delete event.user.email;
            delete event.user.ip_address;
          }

          // ── PostHog ↔ Sentry integration ──────────────────────────────
          // Tag Sentry events with the PostHog distinct ID so you can
          // correlate Sentry issues with PostHog user sessions.
          // Also forward exceptions to PostHog as `$exception` events so
          // errors appear in the PostHog dashboard alongside analytics.
          try {
            const ph = getPostHogClient();
            if (ph) {
              const distinctId = ph.getDistinctId();
              if (distinctId) {
                event.tags = { ...event.tags, posthog_distinct_id: distinctId };
              }

              if (event.exception?.values?.length) {
                const primary = event.exception.values[0];
                ph.capture('$exception', {
                  $exception_type: primary.type ?? 'Error',
                  $exception_message: primary.value ?? '',
                  $exception_list: event.exception.values.map((v) => ({
                    type: v.type,
                    value: v.value,
                    mechanism: v.mechanism,
                  })),
                  $sentry_event_id: event.event_id,
                  $sentry_url: SENTRY_DSN
                    ? `https://sentry.io/issues/?query=${event.event_id}`
                    : undefined,
                });
              }
            }
          } catch (e) {
            // Never let PostHog integration break Sentry error reporting
            logger.warn('[Sentry] PostHog integration error:', e);
          }

          return event;
        },

        // Filter breadcrumbs to reduce noise
        beforeBreadcrumb(breadcrumb) {
          // Drop console breadcrumbs in production (too noisy)
          if (!__DEV__ && breadcrumb.category === 'console') {
            return null;
          }
          return breadcrumb;
        },
      });

      this.initialized = true;
      logger.log('[Sentry] Initialized with tracing, replay, and navigation integration');
    } catch (error) {
      logger.error('[Sentry] Failed to initialize:', error);
    }
  }

  /**
   * Get the navigation integration instance for registering with NavigationContainer.
   */
  static getNavigationIntegration() {
    return _navigationIntegration;
  }

  /**
   * Wrap the root App component with Sentry's error boundary and performance wrapper.
   * Returns a no-op wrapper if Sentry isn't available.
   */
  static wrapApp<P extends Record<string, unknown>>(
    AppComponent: React.ComponentType<P>,
  ): React.ComponentType<P> {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return AppComponent;
    return sentry.wrap(AppComponent);
  }

  /**
   * Set user identity on auth state change.
   */
  static setUser(userId: string, properties?: {
    username?: string;
    level?: number;
    selectedCat?: string;
    inputMethod?: string;
  }): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;

    sentry.setUser({
      id: userId,
      username: properties?.username,
    });

    // Set user context as tags for easy filtering in Sentry dashboard
    if (properties?.level !== undefined) {
      sentry.setTag('user.level', String(properties.level));
    }
    if (properties?.selectedCat) {
      sentry.setTag('user.cat', properties.selectedCat);
    }
    if (properties?.inputMethod) {
      sentry.setTag('user.input_method', properties.inputMethod);
    }
  }

  /**
   * Clear user identity on sign-out.
   */
  static clearUser(): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;
    sentry.setUser(null);
  }

  /**
   * Capture an exception with optional structured context.
   */
  static captureException(
    error: Error,
    context?: Record<string, string | number | boolean>,
  ): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;

    sentry.withScope((scope) => {
      if (context) {
        scope.setContext('custom', context);
      }
      sentry.captureException(error);
    });
  }

  /**
   * Capture a message at a specific severity level.
   */
  static captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
  ): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;
    sentry.captureMessage(message, level);
  }

  /**
   * Add a structured breadcrumb for debugging context.
   */
  static addBreadcrumb(
    category: string,
    message: string,
    data?: Record<string, string | number | boolean>,
    level: 'info' | 'warning' | 'error' = 'info',
  ): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;

    sentry.addBreadcrumb({
      category,
      message,
      data,
      level,
    });
  }

  /**
   * Create a performance span for measuring operations.
   * Returns a finish callback (or no-op if Sentry unavailable).
   */
  static startSpan(
    name: string,
    op: string,
    callback: () => void,
  ): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) {
      callback();
      return;
    }

    sentry.startSpan({ name, op }, callback);
  }

  /**
   * Set a tag on the current scope for filtering events in the dashboard.
   */
  static setTag(key: string, value: string): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;
    sentry.setTag(key, value);
  }

  /**
   * Set extra context data on the current scope.
   */
  static setContext(name: string, data: Record<string, unknown>): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;
    sentry.setContext(name, data);
  }

  /**
   * Check if Sentry is initialized and ready.
   */
  static get isInitialized(): boolean {
    return this.initialized;
  }
}

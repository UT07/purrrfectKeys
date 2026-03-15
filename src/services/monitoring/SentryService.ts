/**
 * Sentry Error Monitoring Service
 *
 * Provides crash reporting, performance monitoring, and error tracking.
 * Integrates with PostHog for unified observability.
 *
 * Setup requires EXPO_PUBLIC_SENTRY_DSN in environment.
 */

import { logger } from '../../utils/logger';

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

export class SentryService {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) return;

    const sentry = getSentry();
    if (!sentry || !SENTRY_DSN) {
      logger.warn('[Sentry] Not configured — error monitoring disabled');
      return;
    }

    try {
      sentry.init({
        dsn: SENTRY_DSN,
        debug: __DEV__,
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000,
        tracesSampleRate: __DEV__ ? 1.0 : 0.2,
        profilesSampleRate: __DEV__ ? 1.0 : 0.1,
        environment: __DEV__ ? 'development' : 'production',
        beforeSend(event) {
          // Scrub sensitive data
          if (event.user) {
            delete event.user.email;
            delete event.user.ip_address;
          }
          return event;
        },
      });

      this.initialized = true;
      logger.log('[Sentry] Initialized');
    } catch (error) {
      logger.error('[Sentry] Failed to initialize:', error);
    }
  }

  static setUser(userId: string, username?: string): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;

    sentry.setUser({
      id: userId,
      username: username || undefined,
    });
  }

  static clearUser(): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;
    sentry.setUser(null);
  }

  static captureException(error: Error, context?: Record<string, string>): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;

    if (context) {
      sentry.setContext('custom', context);
    }
    sentry.captureException(error);
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;
    sentry.captureMessage(message, level);
  }

  static addBreadcrumb(category: string, message: string, data?: Record<string, string>): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;

    sentry.addBreadcrumb({
      category,
      message,
      data,
      level: 'info',
    });
  }

  static startTransaction(name: string, op: string) {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return null;

    return sentry.startSpan({ name, op }, () => {});
  }

  static setTag(key: string, value: string): void {
    const sentry = getSentry();
    if (!sentry || !this.initialized) return;
    sentry.setTag(key, value);
  }
}

/**
 * Unified Monitoring Service
 *
 * Combines Sentry (error tracking) + PostHog (analytics) into a single
 * initialization and tracking API. Call MonitoringService.initialize()
 * once at app startup.
 */

import { AnalyticsService } from '../analytics/PostHog';
import { SentryService } from './SentryService';
import { logger } from '../../utils/logger';

export class MonitoringService {
  private static initialized = false;

  /**
   * Initialize all monitoring services.
   * Call once in App.tsx before any other operations.
   */
  static initialize(): void {
    if (this.initialized) return;

    // Sentry for crash reporting
    SentryService.initialize();

    // PostHog for analytics
    AnalyticsService.initialize();

    this.initialized = true;
    logger.log('[Monitoring] All services initialized');
  }

  /**
   * Set user identity across all monitoring services.
   */
  static identifyUser(userId: string, username?: string, properties?: Record<string, string>): void {
    SentryService.setUser(userId, username);
    AnalyticsService.identifyUser(userId, {
      ...properties,
      ...(username ? { username } : {}),
    });
  }

  /**
   * Clear user identity (on sign-out).
   */
  static clearUser(): void {
    SentryService.clearUser();
    AnalyticsService.reset();
  }

  /**
   * Track an error in both Sentry and PostHog.
   */
  static trackError(error: Error, context?: Record<string, string>): void {
    SentryService.captureException(error, context);
    AnalyticsService.trackEvent('error_occurred', {
      error_name: error.name,
      error_message: error.message.slice(0, 200),
      ...context,
    });
  }

  /**
   * Add a breadcrumb for debugging context.
   */
  static addBreadcrumb(category: string, message: string, data?: Record<string, string>): void {
    SentryService.addBreadcrumb(category, message, data);
  }

  /**
   * Track a performance metric.
   */
  static trackPerformance(name: string, durationMs: number, tags?: Record<string, string>): void {
    AnalyticsService.trackEvent('performance_metric', {
      metric_name: name,
      duration_ms: durationMs,
      ...tags,
    });

    // Log slow operations to Sentry as warnings
    if (durationMs > 5000) {
      SentryService.captureMessage(
        `Slow operation: ${name} took ${durationMs}ms`,
        'warning',
      );
    }
  }
}

export { SentryService } from './SentryService';

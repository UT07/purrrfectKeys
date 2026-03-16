/**
 * Unified Monitoring Service
 *
 * Combines Sentry (error tracking) + PostHog (analytics) into a single
 * initialization and tracking API. Call MonitoringService.initialize()
 * once at app startup.
 */

import { AnalyticsService, analyticsEvents, updateUserAnalyticsProperties } from '../analytics/PostHog';
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

    // Sentry for crash reporting + performance
    SentryService.initialize();

    // PostHog for analytics + feature flags
    AnalyticsService.initialize();

    this.initialized = true;
    logger.log('[Monitoring] All services initialized');
  }

  /**
   * Set user identity across all monitoring services.
   * Call on sign-in and on auth state changes.
   */
  static identifyUser(
    userId: string,
    properties?: {
      username?: string;
      level?: number;
      selectedCat?: string;
      inputMethod?: string;
      isAnonymous?: boolean;
    },
  ): void {
    SentryService.setUser(userId, properties);

    AnalyticsService.identifyUser(userId, {
      ...(properties?.username ? { username: properties.username } : {}),
      ...(properties?.level !== undefined ? { level: properties.level } : {}),
      ...(properties?.selectedCat ? { selected_cat: properties.selectedCat } : {}),
      ...(properties?.inputMethod ? { input_method: properties.inputMethod } : {}),
      ...(properties?.isAnonymous !== undefined ? { is_anonymous: properties.isAnonymous } : {}),
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
  static trackError(
    error: Error,
    context?: Record<string, string | number | boolean>,
  ): void {
    SentryService.captureException(error, context);
    analyticsEvents.error.crashReported(
      error.name + ': ' + error.message,
      error.stack ?? '',
    );
  }

  /**
   * Add a breadcrumb for debugging context.
   */
  static addBreadcrumb(
    category: string,
    message: string,
    data?: Record<string, string | number | boolean>,
  ): void {
    SentryService.addBreadcrumb(category, message, data);
  }

  /**
   * Track a performance metric in PostHog and warn in Sentry if slow.
   */
  static trackPerformance(
    name: string,
    durationMs: number,
    tags?: Record<string, string>,
  ): void {
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

  /**
   * Update user properties across services (call after exercise completion, level-up, etc.)
   */
  static updateUserProperties(properties: {
    level?: number;
    currentStreak?: number;
    totalMinutesPracticed?: number;
    masteredSkills?: number;
    exercisesCompleted?: number;
    selectedCat?: string;
    inputMethod?: string;
  }): void {
    updateUserAnalyticsProperties(properties);

    if (properties.level !== undefined) {
      SentryService.setTag('user.level', String(properties.level));
    }
    if (properties.selectedCat) {
      SentryService.setTag('user.cat', properties.selectedCat);
    }
  }
}

export { SentryService } from './SentryService';

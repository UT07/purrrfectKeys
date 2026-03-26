/**
 * DeviceLog — On-device log buffer for debugging without USB.
 *
 * Intercepts logger.log/warn/error calls and stores them in a circular
 * buffer that can be displayed in DebugLogScreen. Also captures key
 * subsystem events (audio, MIDI, mic, scoring) for quick diagnosis.
 *
 * Usage:
 *   - Automatically hooked into logger when imported
 *   - Access logs via DeviceLog.getLogs()
 *   - Subscribe to real-time updates via DeviceLog.subscribe()
 */

export interface LogEntry {
  id: number;
  timestamp: number;
  level: 'log' | 'warn' | 'error';
  message: string;
  /** Subsystem tag extracted from [Bracketed] prefix */
  tag?: string;
}

type LogListener = (entry: LogEntry) => void;

const MAX_ENTRIES = 500;
let nextId = 0;

const buffer: LogEntry[] = [];
const listeners = new Set<LogListener>();

function addEntry(level: LogEntry['level'], args: unknown[]): void {
  const message = args
    .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
    .join(' ');

  // Extract [Tag] from message
  const tagMatch = message.match(/^\[([^\]]+)\]/);
  const tag = tagMatch ? tagMatch[1] : undefined;

  const entry: LogEntry = {
    id: nextId++,
    timestamp: Date.now(),
    level,
    message,
    tag,
  };

  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) {
    buffer.shift();
  }

  for (const listener of listeners) {
    listener(entry);
  }
}

export const DeviceLog = {
  /** Get all buffered log entries */
  getLogs(): LogEntry[] {
    return [...buffer];
  },

  /** Get logs filtered by tag */
  getLogsByTag(tag: string): LogEntry[] {
    return buffer.filter((e) => e.tag === tag);
  },

  /** Subscribe to new log entries. Returns unsubscribe function. */
  subscribe(listener: LogListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Clear all logs */
  clear(): void {
    buffer.length = 0;
  },

  /** Manually add a log entry (for subsystem-specific diagnostics) */
  log(level: LogEntry['level'], ...args: unknown[]): void {
    addEntry(level, args);
  },
};

// ---------------------------------------------------------------------------
// Monkey-patch the logger to also write to DeviceLog
// ---------------------------------------------------------------------------
// This runs on import — importing DeviceLog anywhere in the app hooks it in.

import { logger } from './logger';

const originalLog = logger.log.bind(logger);
const originalWarn = logger.warn.bind(logger);
const originalError = logger.error.bind(logger);

// ---------------------------------------------------------------------------
// PII filter for Sentry breadcrumbs — strip UIDs, emails, names
// ---------------------------------------------------------------------------
const PII_PATTERNS = [
  /uid=\w{8,}/gi,           // Firebase UIDs
  /user=\w{8,}/gi,          // User ID references
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi, // Email addresses
];

function sanitizeForSentry(message: string): string {
  let clean = message;
  for (const pattern of PII_PATTERNS) {
    clean = clean.replace(pattern, (match) => match.split('=')[0] + '=[REDACTED]');
  }
  return clean;
}

// Tags worth sending to Sentry as breadcrumbs (operational, not verbose)
const SENTRY_BREADCRUMB_TAGS = new Set([
  'Auth', 'Auth:onAuthStateChanged', 'Auth:postSignInSync',
  'Sync', 'Sync:flushQueue', 'Sync:pull',
  'ExercisePlayer:save', 'useExercisePlayback',
  'DailyPlanCache', 'TTSService',
  'ExpoAudioEngine', 'App',
]);

function maybeSendToSentry(level: LogEntry['level'], message: string, tag?: string): void {
  // Only send tagged logs that are operationally useful
  if (!tag || !SENTRY_BREADCRUMB_TAGS.has(tag)) return;
  // Only send warn/error always, log only for key tags
  if (level === 'log' && !['Sync:flushQueue', 'Sync:pull', 'Auth:postSignInSync', 'ExercisePlayer:save', 'useExercisePlayback'].includes(tag)) return;

  try {
    const { MonitoringService } = require('../services/monitoring');
    MonitoringService.addBreadcrumb(
      tag,
      sanitizeForSentry(message),
    );
  } catch {
    // MonitoringService not available yet during early init
  }
}

logger.log = (...args: unknown[]): void => {
  originalLog(...args);
  addEntry('log', args);
  const entry = buffer[buffer.length - 1];
  if (entry) maybeSendToSentry('log', entry.message, entry.tag);
};

logger.warn = (...args: unknown[]): void => {
  originalWarn(...args);
  addEntry('warn', args);
  const entry = buffer[buffer.length - 1];
  if (entry) maybeSendToSentry('warn', entry.message, entry.tag);
};

logger.error = (...args: unknown[]): void => {
  originalError(...args);
  addEntry('error', args);
  const entry = buffer[buffer.length - 1];
  if (entry) maybeSendToSentry('error', entry.message, entry.tag);
};

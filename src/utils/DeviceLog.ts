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

logger.log = (...args: unknown[]): void => {
  originalLog(...args);
  addEntry('log', args);
};

logger.warn = (...args: unknown[]): void => {
  originalWarn(...args);
  addEntry('warn', args);
};

logger.error = (...args: unknown[]): void => {
  originalError(...args);
  addEntry('error', args);
};

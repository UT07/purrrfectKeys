/**
 * Lightweight __DEV__-only performance tracer.
 * Zero-cost in production — all methods are no-ops when __DEV__ is false.
 *
 * Usage:
 *   const trace = perfTrace('ExerciseCompletion');
 *   trace.mark('recordPracticeSession');
 *   recordPracticeSession();
 *   trace.mark('recordExerciseCompletion');
 *   recordExerciseCompletion();
 *   trace.end(); // logs summary table
 */

import { logger } from './logger';

interface PerfMark {
  label: string;
  timestamp: number;
}

interface PerfTrace {
  mark: (label: string) => void;
  end: () => void;
}

const NOOP_TRACE: PerfTrace = {
  mark: () => {},
  end: () => {},
};

export function perfTrace(name: string): PerfTrace {
  if (!__DEV__) return NOOP_TRACE;

  const startTime = performance.now();
  const marks: PerfMark[] = [{ label: '__start__', timestamp: startTime }];

  return {
    mark(label: string) {
      marks.push({ label, timestamp: performance.now() });
    },

    end() {
      const endTime = performance.now();
      const totalMs = endTime - startTime;
      marks.push({ label: '__end__', timestamp: endTime });

      const lines: string[] = [`[PerfTrace: ${name}] Total: ${totalMs.toFixed(1)}ms`];
      for (let i = 1; i < marks.length; i++) {
        const delta = marks[i].timestamp - marks[i - 1].timestamp;
        const pct = totalMs > 0 ? ((delta / totalMs) * 100).toFixed(0) : '0';
        const warn = delta > 5 ? ' ⚠️' : '';
        lines.push(`  ${marks[i].label}: ${delta.toFixed(1)}ms (${pct}%)${warn}`);
      }

      logger.log(lines.join('\n'));

      // Warn if total exceeds budget
      if (totalMs > 50) {
        logger.warn(`[PerfTrace: ${name}] Exceeded 50ms budget: ${totalMs.toFixed(1)}ms`);
      }
    },
  };
}

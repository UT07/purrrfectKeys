/**
 * Duration formatting for song metadata.
 *
 * Songs are ingested from three pipelines (Gemini generation, TheSession.org,
 * PDMX/music21) and not all of them reliably produce `durationSeconds`. The
 * song list previously did raw arithmetic on the field, so a song missing it
 * rendered literally as "NaN:NaN" (observed on "A Bar Song").
 *
 * Formatting is display-only and must never throw or emit NaN — a missing
 * duration is a content gap, not a reason to break the row.
 */

/** Shown when a duration is missing or unusable. */
export const DURATION_PLACEHOLDER = '--:--';

/**
 * Format a duration in seconds as `M:SS`.
 *
 * Returns `--:--` for anything that cannot produce a sensible clock value:
 * undefined, null, NaN, Infinity, or a negative number.
 *
 * @example
 * formatDuration(83)        // '1:23'
 * formatDuration(45)        // '0:45'
 * formatDuration(3600)      // '60:00'
 * formatDuration(undefined) // '--:--'
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) {
    return DURATION_PLACEHOLDER;
  }

  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;

  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

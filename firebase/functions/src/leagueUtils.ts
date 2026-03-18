/**
 * Shared utilities for league & season Cloud Functions.
 *
 * IMPORTANT — Date Format Coupling:
 * `formatSeasonWeekKey()` produces the canonical 'YYYY-MM-DD' string used as
 * the `lastSeasonWeek` field on user documents. Both `weeklyLeagueRewards`
 * (which WRITES the field) and `seasonEndRewards` (which QUERIES it) must use
 * this same function so the format stays in sync. If you change the format
 * here, both functions will pick it up automatically.
 */

/**
 * Format a Date as a 'YYYY-MM-DD' string suitable for use as a season-week
 * key in Firestore.
 *
 * This is the **single source of truth** for the date format stored in
 * `users/{uid}.lastSeasonWeek`. Any Cloud Function that reads or writes
 * that field must use this helper to guarantee format consistency.
 *
 * @param date — the Monday (or any date) to format
 * @returns ISO date string, e.g. '2026-03-16'
 */
export function formatSeasonWeekKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

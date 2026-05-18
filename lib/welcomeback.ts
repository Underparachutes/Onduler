// Welcome-back ramp + minimum-viable-shape anchors (ADR 0004 §8).
// Pure helpers — no React, no Supabase. The dashboard, settings, and the
// /wave/return/welcome screen all consume these.

import { daysBetween, type DayKey } from './periods'

export type WelcomeBackMode = 'ease' | 'full'

// Ramp percentage for the radar's target ring during the welcome-back window.
// 'ease' rolls the user back over 3 weeks (40% → 70% → 100%); 'full' returns
// null immediately (no ramp). After 3 weeks of 'ease', returns null and the
// caller is expected to clear the mode.
//
// Week indexing is calendar-day-based (Pacific), starting from the day the
// user chose 'Ease back in' on the welcome screen. This intentionally does
// not snap to Monday — the ramp is anchored to the user's return, not the
// celebration week.
export function currentRamp(
  mode: WelcomeBackMode | null | undefined,
  startedAtKey: DayKey | null,
  todayKey: DayKey,
): number | null {
  if (mode !== 'ease') return null
  if (!startedAtKey) return null
  const days = daysBetween(startedAtKey, todayKey)
  if (days < 0) return null
  const weekIndex = Math.floor(days / 7)
  if (weekIndex === 0) return 0.4
  if (weekIndex === 1) return 0.7
  if (weekIndex === 2) return 1.0
  return null
}

// True iff the welcome-back state has fully elapsed and the caller should
// clear `welcome_back_mode` on next write (lazy cleanup). Both 'ease' (3 weeks)
// and 'full' (the moment the user picks it, since no ramp applies) qualify.
export function welcomeBackElapsed(
  mode: WelcomeBackMode | null | undefined,
  startedAtKey: DayKey | null,
  todayKey: DayKey,
): boolean {
  if (!mode) return false
  if (mode === 'full') {
    // 'full' has no ongoing UI — clear on first read.
    return true
  }
  if (!startedAtKey) return true
  return daysBetween(startedAtKey, todayKey) >= 21
}

// Top-2 most-logged motions among the candidate set. Caller pre-filters
// candidates to motions feeding the shape's seeded swells. ADR 0004 §8:
// "the smallest version of the build that still feels like the user."
export function defaultMvsAnchors(
  candidates: { id: string; logCount: number }[],
  limit: number = 2,
): string[] {
  return [...candidates]
    .sort((a, b) => {
      if (b.logCount !== a.logCount) return b.logCount - a.logCount
      return a.id.localeCompare(b.id)
    })
    .slice(0, Math.max(0, limit))
    .map(m => m.id)
}

// Resolved anchors for a shape: user-set overrides win if present and
// non-empty; otherwise fall back to defaults.
export function resolveMvsAnchors(
  shapeKey: string,
  override: Record<string, string[]> | null | undefined,
  defaults: string[],
): string[] {
  const set = override?.[shapeKey]
  if (set && set.length > 0) return set
  return defaults
}

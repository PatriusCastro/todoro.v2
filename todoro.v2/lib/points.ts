import { type SessionRecord } from "./types"
import { localDate } from "./date"

/** Points for one Streak Freeze — ~1.5 days of focus, a generous safety net. */
export const FREEZE_COST = 250

/** Streak length at which the points bonus stops growing. */
export const POINTS_STREAK_CAP = 14

/** 1 point per focused minute, plus a streak bonus scaling to +70% at the cap. */
export function computePoints(focusMins: number, streak: number): number {
  const base = Math.max(1, Math.round(focusMins))
  const mult = 1 + Math.min(streak, POINTS_STREAK_CAP) * 0.05
  return Math.round(base * mult)
}

/**
 * Total points earned, recomputed from the session log.
 *
 * The point of deriving rather than storing: a stored total is a number in
 * localStorage that DevTools can set to anything, and a counter the client can
 * post arbitrary deltas for. Sessions are append-only and immutable server-side
 * — insert-only policies, no update or delete — so making them the sole source
 * of earnings means the balance can only be moved by doing the work.
 *
 * Each session is worth what it was worth on the day it happened, so the streak
 * is reconstructed per active day rather than taken as it stands now.
 */
export function earnedFromHistory(
  history: SessionRecord[],
  protectedDates: string[] = [],
): number {
  if (history.length === 0) return 0

  const active = [...new Set([
    ...history.map(s => localDate(s.at)),
    ...protectedDates,
  ])].sort()

  // Run length of each consecutive block, which is the streak as of that day.
  const streakOn = new Map<string, number>()
  let run = 0
  let prev: string | null = null
  for (const day of active) {
    run = prev !== null && day === nextDay(prev) ? run + 1 : 1
    streakOn.set(day, run)
    prev = day
  }

  let total = 0
  for (const s of history) {
    total += computePoints(s.focusMins, streakOn.get(localDate(s.at)) ?? 1)
  }
  return total
}

/** Calendar-safe successor of a YYYY-MM-DD key. */
function nextDay(day: string): string {
  const d = new Date(day + "T00:00")
  d.setDate(d.getDate() + 1)
  return localDate(d.getTime())
}

/** Level from total points — each level costs a little more than the last. */
export function levelFromPoints(points: number): { level: number; into: number; span: number } {
  let level = 1
  while (50 * level * (level + 1) <= points) level++
  const base = 50 * (level - 1) * level
  const next = 50 * level * (level + 1)
  return { level, into: points - base, span: next - base }
}

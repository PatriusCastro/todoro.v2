import { type SessionRecord } from "./types"
import { dayKeyBefore, localDate, startOfToday } from "./date"

/** Days a task was focused on, plus any bridged by a Streak Freeze. */
function activeDays(history: SessionRecord[], protectedDates: string[]) {
  return new Set([...history.map(s => localDate(s.at)), ...protectedDates])
}

/**
 * Consecutive active days ending today or yesterday. Yesterday still counts so
 * the streak doesn't appear broken to someone who hasn't focused yet today.
 */
export function computeStreak(history: SessionRecord[], protectedDates: string[] = []): number {
  const dates = activeDays(history, protectedDates)
  if (!dates.size) return 0
  const days     = [...dates].sort().reverse()
  const midnight = startOfToday()
  const key      = (offset: number) => dayKeyBefore(midnight, offset)
  const start    = days[0] === key(0) ? 0 : days[0] === key(1) ? 1 : null
  if (start === null) return 0
  let count = 0
  for (const day of days) {
    if (day !== key(start + count)) break
    count++
  }
  return count
}

/**
 * If the streak just broke — last active day is 2–4 days ago, i.e. a 1–3 day
 * gap before today — return the missed days a Streak Freeze would bridge.
 * Otherwise null.
 */
export function findStreakRestore(history: SessionRecord[], protectedDates: string[]): string[] | null {
  const active = activeDays(history, protectedDates)
  if (!active.size) return null
  const midnight = startOfToday()
  const today    = dayKeyBefore(midnight, 0)
  const yest     = dayKeyBefore(midnight, 1)
  if (active.has(today) || active.has(yest)) return null   // streak isn't broken

  const last = [...active].sort().reverse()[0]
  const gap: string[] = []
  // Walk forward a calendar day at a time from the day after the last active
  // one, through yesterday inclusive. Stepping by a fixed 864e5 ms drifts
  // across a DST boundary. Bounded at 4 because anything over 3 is too stale
  // to bridge, so there's no reason to keep counting.
  const cursor = new Date(last + "T00:00")
  cursor.setDate(cursor.getDate() + 1)
  for (let i = 0; i < 4; i++) {
    const key = localDate(cursor.getTime())
    if (key > yest) break                                  // YYYY-MM-DD sorts lexicographically
    gap.push(key)
    cursor.setDate(cursor.getDate() + 1)
  }

  if (gap.length === 0 || gap.length > 3) return null      // nothing to bridge, or too stale
  return gap
}

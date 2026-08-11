import { getSupabase } from "./sync/client"

/**
 * The weekly focus board.
 *
 * Read-only and outside the sync engine on purpose: nothing here lands in
 * localStorage, so there is no shadow, no merge and nothing to reconcile. It is
 * a view of other people's data that happens to be fetched from the same
 * project — losing it costs a panel, not an account.
 *
 * Every rule that matters lives in the SQL (see 0004): opt-in both ways, a
 * daily cap so a fabricated week can't run away with it, and aggregates only.
 * This file must not be the place any of that is enforced — it runs on the
 * user's machine.
 */

export interface LeaderboardRow {
  place: number
  displayName: string
  minutes: number
  isMe: boolean
}

interface RpcRow {
  place: number
  display_name: string
  minutes: number
  is_me: boolean
}

/** Monday 00:00 UTC, matching the SQL — used only to label what's on screen. */
export function weekStartUTC(offset = 0): Date {
  const now = new Date()
  const d = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  // getUTCDay() is 0 for Sunday, which is 6 days into a Monday week.
  const back = (new Date(d).getUTCDay() + 6) % 7
  return new Date(d - back * 86400000 + offset * 604800000)
}

export function formatMins(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Resolves to null when sync isn't configured, and throws with the server's own
 * message otherwise — the caller shows it rather than guessing. An opted-out or
 * signed-out caller gets an empty list from the function, not an error.
 */
export async function fetchWeek(offset = 0): Promise<LeaderboardRow[] | null> {
  const sb = await getSupabase()
  if (!sb) return null

  const { data, error } = await sb.rpc("leaderboard_week", { week_offset: offset })
  if (error) throw new Error(error.message)

  return ((data ?? []) as RpcRow[]).map(r => ({
    place: r.place,
    displayName: r.display_name,
    minutes: r.minutes,
    isMe: r.is_me,
  }))
}

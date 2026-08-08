/** Local calendar day as `YYYY-MM-DD`. Never UTC — streaks are counted in the
 *  day the user actually lived, so a session at 23:00 belongs to that date. */
export function localDate(ts: number = Date.now()) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * The day key `daysBack` calendar days before `from`.
 *
 * Calendar arithmetic, not `- n * 864e5`. A spring-forward day is only 23 hours
 * long, so subtracting a fixed 86,400,000 ms from midnight overshoots to 23:00
 * on the day *before* the one intended, skipping a day and silently reporting a
 * broken streak. `setDate` rolls months, leap days and DST correctly.
 */
export function dayKeyBefore(from: Date, daysBack: number) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  d.setDate(d.getDate() - daysBack)
  return localDate(d.getTime())
}

/** Midnight today, as a Date. */
export function startOfToday(now: Date = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

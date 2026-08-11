import { startOfToday } from "./date"

/**
 * The human due-date string stored on a task.
 *
 * Note this is *rendered at save time* and never recomputed, so a task saved
 * yesterday still reads "Due tomorrow" today. That staleness predates this
 * module; it matters now because a stale label must not be treated as data
 * worth syncing between devices.
 */
export function formatDueLabel(date: string, time: string) {
  if (!date) return "No due date"
  const d = new Date(date + (time ? `T${time}` : "T00:00"))
  // Midnight-to-midnight, rounded: a DST day is 23 or 25 hours long, and
  // flooring the raw millisecond gap puts those days off by one.
  const diff = Math.round((new Date(date + "T00:00").getTime() - startOfToday().getTime()) / 86400000)
  const timeStr = time ? ` at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""
  if (diff === 0)  return `Due today${timeStr}`
  if (diff === 1)  return `Due tomorrow${timeStr}`
  if (diff === -1) return `Due yesterday${timeStr}`
  if (diff < 0)    return `Overdue ${Math.abs(diff)}d${timeStr}`
  if (diff < 7)    return `Due in ${diff} days${timeStr}`
  return `Due ${d.toLocaleDateString([], { month: "short", day: "numeric" })}${timeStr}`
}

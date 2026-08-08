/**
 * The task id used for a Quick Focus session. It is deliberately never added to
 * the task collection — only to `activeTask` — but it does reach history, so a
 * SessionRecord can carry a taskId no task will ever match.
 */
export const QUICK_MODE_ID = "quick-mode"

const RESERVED_IDS: ReadonlySet<string> = new Set([QUICK_MODE_ID])

export const isReservedId = (id: string) => RESERVED_IDS.has(id)

/**
 * Ids for tasks, subtasks and projects.
 *
 * Was `Math.random().toString(36).slice(2)` — ~52 bits from a shared, non-CSPRNG
 * generator, defined twice in two files. Existing ids stay valid: they are
 * opaque strings and nothing needs to parse them, so there is no migration.
 */
export function uid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID()
    }
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const b = crypto.getRandomValues(new Uint8Array(16))
      b[6] = (b[6] & 0x0f) | 0x40
      b[8] = (b[8] & 0x3f) | 0x80
      const hex = [...b].map(x => x.toString(16).padStart(2, "0")).join("")
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
  } catch {
    // fall through — crypto is unavailable in some locked-down embedded webviews
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

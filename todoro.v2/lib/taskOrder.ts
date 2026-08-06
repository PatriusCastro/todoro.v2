import { type Task } from "../components/tasks/TaskCard"

const PRIORITY_RANK: Record<string, number> = { high: 0, mid: 1, low: 2, none: 3 }

/**
 * The single ordering rule for pending work, used everywhere a "what's next"
 * list is shown: the active task, then pinned tasks, then priority.
 */
export function compareTasks(
  a: Task, b: Task,
  activeId: string | undefined,
  pinned: ReadonlySet<string>,
) {
  if (activeId) {
    if (a.id === activeId) return -1
    if (b.id === activeId) return  1
  }
  const ap = pinned.has(a.id), bp = pinned.has(b.id)
  if (ap !== bp) return ap ? -1 : 1
  return (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3)
}

export function sortTasks(tasks: Task[], activeId: string | undefined, pinned: ReadonlySet<string>) {
  return [...tasks].sort((a, b) => compareTasks(a, b, activeId, pinned))
}

/**
 * The task that should take over the timer: the top pinned pending task if
 * there is one, otherwise the highest-priority pending task.
 */
export function pickNextTask(
  tasks: Task[],
  pinned: ReadonlySet<string>,
  excludeId?: string,
): Task | null {
  const pending = tasks.filter(t => !t.done && t.id !== excludeId)
  if (pending.length === 0) return null
  return sortTasks(pending, undefined, pinned)[0]
}

import { type Task } from "../components/tasks/TaskCard"
import { localDate } from "./date"
import { formatDueLabel } from "./dueDate"
import { uid } from "./id"

/**
 * The next instance of a recurring task, with its due date advanced and its
 * progress reset. Subtasks get fresh ids so the two occurrences never share a
 * checkbox — completing this week's shouldn't tick next week's.
 */
export function nextOccurrence(task: Task): Task {
  const base = task.dueDate ? new Date(task.dueDate + "T00:00") : new Date()
  base.setDate(base.getDate() + (task.repeat === "weekly" ? 7 : 1))
  const dueDate = localDate(base.getTime())
  return {
    ...task,
    id: uid(),
    done: false,
    completedSessions: 0,
    dueDate,
    dueLabel: formatDueLabel(dueDate, task.dueTime ?? ""),
    subtasks: task.subtasks.map(s => ({ ...s, id: uid(), done: false })),
  }
}

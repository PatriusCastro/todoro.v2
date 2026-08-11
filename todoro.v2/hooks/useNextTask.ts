import { useCallback } from "react"
import { type Task } from "../components/tasks/TaskCard"
import { pickNextTask } from "../lib/taskOrder"

/**
 * Returns a getter for the task that should become active next — pinned work
 * first, then priority. Used when the current task is completed or deleted.
 */
export function useNextTask(tasks: Task[], activeTask: Task, pinned: ReadonlySet<string>) {
  return useCallback(
    (): Task | null => pickNextTask(tasks, pinned, activeTask.id),
    [tasks, activeTask, pinned],
  )
}

import { useCallback } from "react"
import { type Task } from "../components/tasks/TaskCard"

const PRIORITY_RANK: Record<string, number> = { high: 0, mid: 1, low: 2, none: 3 }

export function useNextTask(tasks: Task[], activeTask: Task) {
  return useCallback((): Task | null => {
    const pending = tasks
      .filter(t => !t.done && t.id !== activeTask.id)
      .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3))
    return pending[0] ?? null
  }, [tasks, activeTask])
}
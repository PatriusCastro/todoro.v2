import { useMemo } from "react"
import { type Task } from "../components/tasks/TaskCard"
import { sortTasks } from "../lib/taskOrder"

export function useSortedTasks(tasks: Task[], activeId: string, pinnedIds: ReadonlySet<string>) {
  return useMemo(() => sortTasks(tasks, activeId, pinnedIds), [tasks, activeId, pinnedIds])
}

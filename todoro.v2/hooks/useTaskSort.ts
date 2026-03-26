import { useMemo } from "react"
import { type Task } from "../components/tasks/TaskCard"

const PRIORITY_RANK: Record<string, number> = { high: 0, mid: 1, low: 2, none: 3 }

export function useSortedTasks(tasks: Task[], activeId: string, pinnedIds: Set<string>) {
  return useMemo(() => [...tasks].sort((a, b) => {
    if (a.id === activeId) return -1
    if (b.id === activeId) return  1
    const ap = pinnedIds.has(a.id), bp = pinnedIds.has(b.id)
    if (ap !== bp) return ap ? -1 : 1
    return (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3)
  }), [tasks, activeId, pinnedIds])
}
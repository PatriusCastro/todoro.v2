import { type Task } from "../components/tasks/TaskCard"

/**
 * `task.done` stays the single source of truth for completion — a stage only
 * splits the *open* tasks into two lanes, so the board can never disagree with
 * the checkbox, the counts or the streak.
 */
export type Stage = "todo" | "doing" | "done"

export type TaskView = "all" | "project" | "board"

export const STAGES: { key: Stage; label: string }[] = [
  { key: "todo",  label: "To do"       },
  { key: "doing", label: "In progress" },
  { key: "done",  label: "Done"        },
]

/** An unstaged task predates the board, so it reads its own session history. */
export function stageOf(t: Task): Stage {
  if (t.done)  return "done"
  if (t.stage) return t.stage
  return t.completedSessions > 0 ? "doing" : "todo"
}

export const stageIndex = (s: Stage) => STAGES.findIndex(x => x.key === s)

/** The stage one step left/right, or null at the ends. */
export function stageStep(from: Stage, dir: -1 | 1): Stage | null {
  const next = STAGES[stageIndex(from) + dir]
  return next ? next.key : null
}

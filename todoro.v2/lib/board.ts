import { type Task } from "../components/tasks/TaskCard"

/**
 * Where a task sits on the board.
 *
 * `task.done` stays the single source of truth for completion — a stage only
 * splits the *open* tasks into two lanes. That way the board can never disagree
 * with the checkbox, the counts, the stats or the streak: there is still one
 * boolean deciding whether a task is finished.
 */
export type Stage = "todo" | "doing" | "done"

/** The stages a task can actually store; "done" is `task.done`. */
export type OpenStage = Exclude<Stage, "done">

/** Which layout the Tasks page is in. */
export type TaskView = "all" | "project" | "board"

export const STAGES: { key: Stage; label: string; short: string }[] = [
  { key: "todo",  label: "To do",       short: "To do" },
  { key: "doing", label: "In progress", short: "Doing" },
  { key: "done",  label: "Done",        short: "Done"  },
]

/**
 * Every task that predates the board has no stage. Dumping all of them into
 * "To do" would open the board on a lie, so an unstaged task reads its own
 * session history instead: anything already focused on once is in progress.
 */
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

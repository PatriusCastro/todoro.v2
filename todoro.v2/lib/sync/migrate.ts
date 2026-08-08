import { type Task } from "../../components/tasks/TaskCard"
import { type SessionRecord } from "../types"
import { isPristineSeed } from "./diff"

/**
 * What to do the first time a device links to an account.
 *
 * The hard case is both sides holding real data, and the reason it is hard is
 * that ids are locally generated and never collide across devices. "Merge"
 * would therefore mean "concatenate", duplicating every task. Nor can it dedupe
 * by title: titles are not unique, and `nextOccurrence` mints a fresh id for
 * every repeat of the same recurring task, so title-matching would silently
 * delete distinct work. There is no key to merge on, so the only honest options
 * are keep-mine or keep-theirs — asked once, with the loser written to a real
 * backup file first.
 */

export type LinkDecision =
  /** Account is empty. Upload this device. No question worth asking. */
  | "adopt-local"
  /** This device is an untouched install. Take the account silently. */
  | "adopt-remote"
  /** Both sides hold real work. Only the user can choose. */
  | "ask"

export interface LinkInput {
  tasks:    Task[]
  history:  SessionRecord[]
  projects: { id: string }[]
  remoteTaskCount: number
}

export function decideFirstLink(input: LinkInput): LinkDecision {
  const { tasks, history, projects, remoteTaskCount } = input

  if (remoteTaskCount === 0) return "adopt-local"
  if (isPristineSeed(tasks, history, projects)) return "adopt-remote"

  // An install with genuinely nothing in it — every seed task deleted, no
  // history — has nothing to lose either, so don't make it a decision.
  if (tasks.length === 0 && history.length === 0 && projects.length === 0) return "adopt-remote"

  return "ask"
}

/**
 * What each side is worth, for the dialog. Counting is the whole point: "14
 * tasks, 132 sessions" is a decision someone can actually make, where "your
 * data differs" is not.
 */
export interface SideSummary {
  tasks:    number
  sessions: number
}

export const summarize = (tasks: Task[], history: SessionRecord[]): SideSummary => ({
  tasks: tasks.filter(t => !t.done).length,
  sessions: history.length,
})

/**
 * Kept from both sides no matter which way the choice goes.
 *
 * Focus sessions are immutable timestamped facts that cannot conflict, and the
 * streak — with the whole points, levels and Streak Freeze economy hanging off
 * it — is the most expensive thing in the app to lose. Taking that off the
 * table is what makes the remaining task decision feel small enough to make.
 */
export const ALWAYS_UNIONED = ["history", "protectedDates"] as const

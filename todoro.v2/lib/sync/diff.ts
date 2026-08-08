import { type Task } from "../../components/tasks/TaskCard"
import { type SessionRecord } from "../types"

/**
 * Safety rails between a merge result and the network.
 *
 * `mergeById` decides what *changed*; this file decides what is *safe to send*.
 * The split matters because the dangerous direction is deletion, and deletion
 * here is inferred from absence — a row that was in the shadow and is no longer
 * in local state.
 *
 * That inference has one catastrophic failure mode. `load()` in app/page.tsx
 * swallows every error and returns its fallback, so a corrupt, cleared or
 * quota-evicted localStorage silently re-initialises `tasks` to the three seed
 * tasks. A naive diff would read that as "every task was deleted" and
 * faithfully replicate it to the server, destroying the account from a device
 * that had simply lost its local storage. These guards exist for that.
 */

/** The hardcoded ids of the three tasks a fresh install ships with. */
export const SEED_TASK_IDS = ["1", "2", "3"] as const

/**
 * True when local state looks like an untouched fresh install rather than real
 * work. Used to decide that a device with nothing to lose should adopt the
 * account instead of trying to push its seed data into it.
 *
 * Deliberately strict: exactly the seed ids, nothing completed, no sessions
 * logged, no projects. Anything else counts as real data.
 */
export function isPristineSeed(
  tasks: Task[],
  history: SessionRecord[],
  projects: { id: string }[] = [],
): boolean {
  if (history.length > 0) return false
  if (projects.length > 0) return false
  if (tasks.length !== SEED_TASK_IDS.length) return false

  const ids = new Set(tasks.map(t => t.id))
  if (!SEED_TASK_IDS.every(id => ids.has(id))) return false

  return tasks.every(t => !t.done && t.completedSessions === 0
    && t.subtasks.every(s => !s.done))
}

export interface DeleteGuardInput {
  /** Ids the merge wants to tombstone. */
  tombstones: string[]
  /** How many rows the collection holds locally right now. */
  localCount: number
  /** How many it held at the last successful sync. */
  shadowCount: number
  /**
   * Whether a pull has succeeded in this session. Before that, local state has
   * never been reconciled and absence proves nothing.
   */
  pulledThisSession: boolean
  /** Set once the user has explicitly confirmed a large deletion. */
  confirmedLargeDelete?: boolean
}

export interface DeleteGuardResult {
  allowed: string[]
  blocked: string[]
  /** Set when something was blocked, for logging and for the confirm prompt. */
  reason?: "no-pull-yet" | "mass-delete"
}

/** A deletion this large is suspicious enough to want confirmation. */
export const MASS_DELETE_MIN_COUNT = 5
export const MASS_DELETE_RATIO = 0.5

export function guardDeletions(input: DeleteGuardInput): DeleteGuardResult {
  const { tombstones, localCount, shadowCount, pulledThisSession, confirmedLargeDelete } = input

  if (tombstones.length === 0) return { allowed: [], blocked: [] }

  // Guard 1. Until this session has pulled successfully, we have no idea what
  // the server holds, so "missing locally" carries no information at all.
  if (!pulledThisSession) {
    return { allowed: [], blocked: tombstones, reason: "no-pull-yet" }
  }

  // Guard 2. A big proportional drop is what storage loss looks like. Deleting
  // six of eight tasks by hand is possible but rare; losing them is not.
  const shrank = shadowCount - localCount
  const isMass = shrank > MASS_DELETE_MIN_COUNT && shadowCount > 0
    && shrank / shadowCount > MASS_DELETE_RATIO
  if (isMass && !confirmedLargeDelete) {
    return { allowed: [], blocked: tombstones, reason: "mass-delete" }
  }

  return { allowed: tombstones, blocked: [] }
}

/**
 * Guard 3. A device whose local state is an untouched seed install must not
 * push that seed over a populated account — it should take the account's data.
 */
export function shouldAdoptRemote(opts: {
  tasks: Task[]
  history: SessionRecord[]
  projects: { id: string }[]
  remoteTaskCount: number
}): boolean {
  return opts.remoteTaskCount > 0
    && isPristineSeed(opts.tasks, opts.history, opts.projects)
}

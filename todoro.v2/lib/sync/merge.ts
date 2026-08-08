import { type Task, type Subtask } from "../../components/tasks/TaskCard"
import { type SessionRecord } from "../types"
import { formatDueLabel } from "../dueDate"
import { hashRow, TASK_FIELDS } from "./hash"
import { type Hash, type MergeResult, type RemoteRow, type ShadowMap } from "./types"

/**
 * The core rule, for one id at a time.
 *
 * A field only truly conflicts when *both* sides moved away from the shadow.
 * Everything else merges losslessly — which is the entire reason the shadow
 * exists, and why this is better than the naive last-write-wins it replaces:
 *
 *   local == shadow, remote != shadow  ->  take remote, no push
 *   local != shadow, remote == shadow  ->  keep local, push it
 *   local != shadow, remote != shadow  ->  real conflict; remote wins
 *   present locally, in shadow, gone remotely with a tombstone -> delete
 *   gone locally, in shadow            ->  this device deleted it; tombstone
 *   gone locally, not in shadow        ->  new remote row; insert
 *
 * Delete beats a concurrent edit: resurrecting a task the user deliberately
 * swiped away is worse than losing one edit to it, and it's a rule rather than
 * a dialog.
 */
export function mergeById<T extends { id: string }>(
  local: T[],
  shadow: ShadowMap,
  remote: RemoteRow<T>[],
  fields: readonly (keyof T)[],
): MergeResult<T> {
  const hash = (row: T): Hash => hashRow(row, fields)

  const localById = new Map(local.map(r => [r.id, r]))
  const remoteById = new Map(remote.map(r => [r.row.id, r]))
  const ids = new Set([...localById.keys(), ...remoteById.keys(), ...Object.keys(shadow)])

  const next: T[] = []
  const push: T[] = []
  const tombstone: string[] = []
  const nextShadow: ShadowMap = {}

  for (const id of ids) {
    const mine = localById.get(id)
    const theirs = remoteById.get(id)
    const base = shadow[id]

    // Remote says deleted. Wins over anything local.
    if (theirs?.deletedAt) continue

    if (!mine) {
      // Known at the last sync and gone now => this device deleted it.
      //
      // This must be decided on the shadow alone, never on whether the row came
      // back in `remote`. Pulls are deltas, so a row that simply hasn't changed
      // server-side is absent from `remote` while very much still existing —
      // and treating absent-and-unchanged as "already gone" would mean a local
      // delete silently never propagated.
      if (base !== undefined) { tombstone.push(id); continue }
      // Otherwise it's a row this device has never seen.
      if (theirs) {
        next.push(theirs.row)
        nextShadow[id] = hash(theirs.row)
      }
      continue
    }

    if (!theirs) {
      next.push(mine)
      nextShadow[id] = hash(mine)
      push.push(mine)
      continue
    }

    const mineHash = hash(mine)
    const theirsHash = hash(theirs.row)

    if (mineHash === theirsHash) {
      next.push(mine)
      nextShadow[id] = mineHash
      continue
    }

    const localChanged = base === undefined || mineHash !== base
    const remoteChanged = base === undefined || theirsHash !== base

    if (localChanged && !remoteChanged) {
      next.push(mine)
      nextShadow[id] = mineHash
      push.push(mine)
    } else {
      // Remote-only change, or a genuine conflict the server already arbitrated
      // by arrival order.
      next.push(theirs.row)
      nextShadow[id] = theirsHash
    }
  }

  return { next, push, tombstone, shadow: nextShadow }
}

/**
 * Union by id. A subtask deleted on one device while another was offline can
 * come back — accepted, because the alternative is tombstones inside a JSONB
 * blob, which is a lot of machinery for "a checklist item reappeared once".
 */
export function mergeSubtasks(local: Subtask[], remote: Subtask[]): Subtask[] {
  const byId = new Map<string, Subtask>()
  for (const s of remote) byId.set(s.id, s)
  for (const s of local) byId.set(s.id, s)      // local wins on shared ids
  return [...byId.values()]
}

/**
 * Deterministic natural key. Two sessions on the same task in the same
 * millisecond are impossible with one timer, and deriving the key rather than
 * minting a random id is what makes a push idempotent and makes re-importing a
 * backup deduplicate instead of doubling the streak.
 */
export const sessionKey = (s: SessionRecord) => `${s.at}:${s.taskId}`

/** Append-only and immutable, so a union by key is always correct. */
export function mergeHistory(local: SessionRecord[], remote: SessionRecord[]): SessionRecord[] {
  const byKey = new Map<string, SessionRecord>()
  for (const s of [...remote, ...local]) byKey.set(sessionKey(s), s)
  return [...byKey.values()].sort((a, b) => a.at - b.at)
}

/**
 * Three-way arithmetic for a counter.
 *
 * `local - shadow` is what *this device* earned since the last sync, which is
 * the operation, not just the value. Adding it to the remote total is
 * conflict-free — a G-counter over a shared log. Taking `local` or `remote`
 * wholesale, as last-write-wins would, throws one device's earnings away.
 */
export function mergeCounter(
  localValue: number,
  shadowValue: number,
  remoteTotal: number,
): { value: number; delta: number } {
  const delta = localValue - shadowValue
  // Clamped: two devices can each spend the last freeze offline, and a negative
  // balance shown to the user is worse than one free freeze.
  const value = Math.max(0, remoteTotal + delta)
  return { value, delta }
}

/** Set with adds and removes, resolved three-way like the counter. */
export function mergeSet(
  local: string[],
  shadow: string[],
  remote: string[],
): { value: string[]; added: string[]; removed: string[] } {
  const localSet = new Set(local)
  const shadowSet = new Set(shadow)
  const added = local.filter(x => !shadowSet.has(x))
  const removed = shadow.filter(x => !localSet.has(x))

  const value = new Set(remote)
  for (const x of removed) value.delete(x)
  for (const x of added) value.add(x)
  return { value: [...value], added, removed }
}

/**
 * Every increment of `completedSessions` is paired 1:1 with a SessionRecord for
 * the same task, and history is conflict-free — so the count is derivable and
 * needs no counter machinery of its own.
 *
 * `max` rather than plain assignment: it never *decreases* a number the user
 * can see, and being a join-semilattice it converges regardless of merge order.
 * (This does assume history is never pruned. If it ever gets capped, freeze the
 * stored count instead of recomputing.)
 */
export function recomputeCompletedSessions(task: Task, history: SessionRecord[]): number {
  let n = 0
  for (const s of history) if (s.taskId === task.id) n++
  return Math.max(task.completedSessions, n)
}

/**
 * Tasks, with the two derived fields reconciled after the generic merge:
 * `completedSessions` from history, and `dueLabel` re-rendered rather than
 * synced (it goes stale on the device that wrote it).
 */
export function mergeTasks(
  local: Task[],
  shadow: ShadowMap,
  remote: RemoteRow<Task>[],
  history: SessionRecord[],
): MergeResult<Task> {
  const merged = mergeById(local, shadow, remote, TASK_FIELDS as unknown as (keyof Task)[])
  const reconcile = (t: Task): Task => ({
    ...t,
    completedSessions: recomputeCompletedSessions(t, history),
    dueLabel: formatDueLabel(t.dueDate ?? "", t.dueTime ?? ""),
  })
  return { ...merged, next: merged.next.map(reconcile), push: merged.push.map(reconcile) }
}

/**
 * Per-field three-way merge, so a device that changed only the theme and one
 * that changed only the daily goal both keep their change. Only the same field
 * on both devices can conflict.
 */
export function mergeSettings<T extends Record<string, unknown>>(
  local: T,
  shadow: Partial<Record<keyof T, Hash>>,
  remote: Partial<T>,
  hashValue: (v: unknown) => Hash,
): { value: T; patch: Partial<T>; shadow: Record<string, Hash> } {
  const value = { ...local }
  const patch: Partial<T> = {}
  const nextShadow: Record<string, Hash> = {}

  const fields = new Set([...Object.keys(local), ...Object.keys(remote)]) as Set<keyof T & string>

  for (const f of fields) {
    const mine = local[f]
    const theirs = remote[f]
    const base = shadow[f]
    const mineHash = hashValue(mine)

    if (theirs === undefined) {
      // Remote has never seen this field.
      value[f] = mine
      nextShadow[f] = mineHash
      if (base === undefined || mineHash !== base) patch[f] = mine
      continue
    }

    const theirsHash = hashValue(theirs)
    if (mineHash === theirsHash) {
      nextShadow[f] = mineHash
      continue
    }

    const localChanged = base === undefined || mineHash !== base
    const remoteChanged = base === undefined || theirsHash !== base

    if (localChanged && !remoteChanged) {
      value[f] = mine
      nextShadow[f] = mineHash
      patch[f] = mine
    } else {
      value[f] = theirs as T[keyof T & string]
      nextShadow[f] = theirsHash
    }
  }

  return { value, patch, shadow: nextShadow }
}

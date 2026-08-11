import { type Task } from "../../components/tasks/TaskCard"
import { type Project } from "../../components/tasks/TaskModal"
import { type SessionRecord } from "../types"
import { type PointOp } from "../ops"
import { fnv1a, hashRow, PROJECT_FIELDS, stableStringify } from "./hash"
import { guardDeletions } from "./diff"
import { mergeById, mergeHistory, mergeSet, mergeSettings, mergeTasks } from "./merge"
import { mergeOps } from "../ops"
import { type RemoteChanges } from "./pull"
import { type SyncedState } from "./snapshot"
import { type SyncMeta } from "./state"

/**
 * One pure step: local state + shadow + remote delta -> what local should
 * become, what to send back, and the next shadow.
 *
 * Kept out of engine.ts so the decision-making is testable without a network,
 * a clock or React. engine.ts is only orchestration.
 */

export interface SyncPatch {
  tasks?:    Task[]
  projects?: Project[]
  history?:  SessionRecord[]
  ops?:      PointOp[]
  /** Keyed by settings-row column. */
  settings?: Record<string, unknown>
  pinned?:   string[]
  assets?:   { avatar: string | null; alert_sound: string | null }
}

export interface Reconciled {
  /** Apply to React state. Empty when nothing changed locally. */
  patch: SyncPatch
  push: {
    tasks:    Task[]
    projects: Project[]
    history:  SessionRecord[]
    ops:      PointOp[]
    settings: Record<string, unknown>
    pinned:   string[] | null
  }
  tombstones: { tasks: string[]; projects: string[] }
  /** Deletions the guards refused. Surfaced so the UI can explain the pause. */
  blocked: { tasks: number; projects: number }
  meta: SyncMeta
}

const hashValue = (v: unknown) => fnv1a(stableStringify(v))
const projectFields = PROJECT_FIELDS as unknown as (keyof Project)[]

/** Shallow equality by content hash — avoids emitting a patch that changes nothing. */
const same = (a: unknown, b: unknown) => hashValue(a) === hashValue(b)

export function reconcile(
  local: SyncedState,
  meta: SyncMeta,
  remote: RemoteChanges,
  opts: { confirmedLargeDelete?: boolean } = {},
): Reconciled {
  // History first: task counts are derived from it, so it has to settle before
  // tasks are reconciled.
  const history = mergeHistory(local.history, remote.history)
  // Union by id: two devices that each spent offline keep both entries, where a
  // last-write-wins total would throw one away.
  const ops = mergeOps(local.ops, remote.ops)

  const tasks = mergeTasks(local.tasks, meta.shadow.tasks, remote.tasks, history)
  const projects = mergeById(local.projects, meta.shadow.projects, remote.projects, projectFields)

  const taskGuard = guardDeletions({
    tombstones: tasks.tombstone,
    localCount: local.tasks.length,
    shadowCount: Object.keys(meta.shadow.tasks).length,
    pulledThisSession: meta.everPulled,
    confirmedLargeDelete: opts.confirmedLargeDelete,
  })
  const projectGuard = guardDeletions({
    tombstones: projects.tombstone,
    localCount: local.projects.length,
    shadowCount: Object.keys(meta.shadow.projects).length,
    pulledThisSession: meta.everPulled,
    confirmedLargeDelete: opts.confirmedLargeDelete,
  })

  const settings = mergeSettings(
    local.settings, meta.shadow.settings, remote.settings ?? {}, hashValue,
  )

  const pinned = remote.pinned
    ? mergeSet(local.pinned, local.pinned, remote.pinned)
    : { value: local.pinned, added: [], removed: [] }

  // Assets are last-write-wins on presence: a device that has one keeps it, and
  // one that doesn't takes the account's rather than pushing a null over it.
  const assets = {
    avatar:      local.assets.avatar      ?? remote.assets.avatar,
    alert_sound: local.assets.alert_sound ?? remote.assets.alert_sound,
  }

  const patch: SyncPatch = {}
  if (!same(tasks.next, local.tasks))       patch.tasks = tasks.next
  if (!same(projects.next, local.projects)) patch.projects = projects.next
  if (!same(history, local.history))        patch.history = history
  if (!same(ops, local.ops))                patch.ops = ops
  if (!same(settings.value, local.settings)) patch.settings = settings.value
  if (!same(pinned.value, local.pinned))    patch.pinned = pinned.value
  if (!same(assets, local.assets))          patch.assets = assets

  return {
    patch,
    push: {
      tasks: tasks.push,
      projects: projects.push,
      // Sessions upsert with ignoreDuplicates, so sending the union is cheap
      // and guarantees the account holds every session either side knows about.
      history,
      ops,
      settings: settings.patch,
      pinned: pinned.added.length || pinned.removed.length ? pinned.value : null,
    },
    tombstones: { tasks: taskGuard.allowed, projects: projectGuard.allowed },
    blocked: { tasks: taskGuard.blocked.length, projects: projectGuard.blocked.length },
    meta: {
      ...meta,
      everPulled: true,
      pulledAt: remote.pulledAt ?? meta.pulledAt,
      shadow: {
        // Shadow reflects the *merged* result, so feeding this back in produces
        // no further push. That is what stops apply -> save -> diff echoing.
        tasks: tasks.shadow,
        projects: projects.shadow,
        settings: settings.shadow,
      },
    },
  }
}

/** Shadow for a full upload — every local row, as pushed. */
export function shadowFromLocal(local: SyncedState): SyncMeta["shadow"] {
  const tasks: Record<string, string> = {}
  for (const t of local.tasks) {
    tasks[t.id] = hashRow(t, [
      "title", "priority", "dueDate", "dueTime", "done", "subtasks",
      "estimatedSessions", "completedSessions", "projectId", "repeat", "stage",
    ] as (keyof Task)[])
  }
  const projects: Record<string, string> = {}
  for (const p of local.projects) projects[p.id] = hashRow(p, projectFields)

  const settings: Record<string, string> = {}
  for (const [k, v] of Object.entries(local.settings)) settings[k] = hashValue(v)

  return { tasks, projects, settings }
}

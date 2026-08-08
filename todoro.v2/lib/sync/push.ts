import type { SupabaseClient } from "@supabase/supabase-js"
import { type Task } from "../../components/tasks/TaskCard"
import { type Project } from "../../components/tasks/TaskModal"
import { type SessionRecord } from "../types"
import { type PointOp } from "../ops"
import { sessionKey } from "./merge"
import { type SyncedState } from "./snapshot"

/**
 * Local -> cloud only. Nothing here writes to localStorage, which is what makes
 * this phase incapable of losing data: the worst failure is that the server is
 * behind, and the next push catches it up.
 *
 * Points and freezes are deliberately absent. They are counters, and a client
 * that can post an arbitrary delta is a client that can mint points — see the
 * derived-points phase. Sessions carry the raw facts those numbers are computed
 * from, so pushing them now loses nothing.
 */

/** Postgres rejects the whole statement if one row is bad, so batches stay small. */
const CHUNK = 200

function chunk<T>(rows: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK))
  return out
}

export interface PushResult {
  pushed: number
  errors: string[]
}

const taskRow = (t: Task) => ({
  id: t.id,
  title: t.title,
  priority: t.priority,
  due_date: t.dueDate || null,
  due_time: t.dueTime || null,
  done: t.done,
  subtasks: t.subtasks ?? [],
  estimated_sessions: t.estimatedSessions ?? 0,
  completed_sessions: t.completedSessions ?? 0,
  project_id: t.projectId ?? null,
  repeat: t.repeat ?? "none",
  stage: t.stage ?? null,
  // Explicitly un-deletes on re-push. A task that comes back locally (undo)
  // must clear its tombstone or it would stay invisible on other devices.
  deleted_at: null,
})

const projectRow = (p: Project) => ({ id: p.id, name: p.name, color: p.color, deleted_at: null })

const sessionRow = (s: SessionRecord) => ({
  key: sessionKey(s),
  task_id: s.taskId,
  task_title: s.taskTitle ?? "",
  focus_mins: s.focusMins,
  at: s.at,
})

// PromiseLike, not Promise: PostgREST query builders are thenable but are not
// actual Promises — they have no .catch/.finally until awaited.
async function run(
  label: string,
  fn: () => PromiseLike<{ error: { message: string } | null }>,
) {
  try {
    const { error } = await fn()
    return error ? `${label}: ${error.message}` : null
  } catch (e) {
    // Offline throws rather than returning an error. The caller keeps the work
    // queued; nothing local is touched either way.
    return `${label}: ${e instanceof Error ? e.message : "request failed"}`
  }
}

export async function pushTasks(sb: SupabaseClient, tasks: Task[]): Promise<PushResult> {
  const errors: string[] = []
  for (const batch of chunk(tasks)) {
    const e = await run("tasks", () => sb.from("tasks").upsert(batch.map(taskRow), { onConflict: "user_id,id" }))
    if (e) errors.push(e)
  }
  return { pushed: errors.length ? 0 : tasks.length, errors }
}

export async function pushProjects(sb: SupabaseClient, projects: Project[]): Promise<PushResult> {
  const errors: string[] = []
  for (const batch of chunk(projects)) {
    const e = await run("projects", () => sb.from("projects").upsert(batch.map(projectRow), { onConflict: "user_id,id" }))
    if (e) errors.push(e)
  }
  return { pushed: errors.length ? 0 : projects.length, errors }
}

/**
 * Append-only and idempotent. `ignoreDuplicates` turns a re-push of the whole
 * history into a no-op rather than an error, which matters because the natural
 * key means the same session always lands in the same row — that is what stops
 * a re-import from doubling someone's streak.
 */
export async function pushSessions(sb: SupabaseClient, history: SessionRecord[]): Promise<PushResult> {
  const errors: string[] = []
  let pushed = 0

  for (const batch of chunk(history)) {
    const e = await run("sessions", () =>
      sb.from("sessions").upsert(batch.map(sessionRow), { onConflict: "user_id,key", ignoreDuplicates: true }))
    if (!e) { pushed += batch.length; continue }

    // Postgres fails the whole statement on one bad row, and the daily bounds
    // in 0003 can reject one. Without this fallback a single unacceptable
    // session would block every other session in the batch from ever syncing,
    // and the shadow would never advance — a permanent stall. Retrying row by
    // row isolates the offender.
    let rejected = 0
    for (const s of batch) {
      const one = await run("session", () =>
        sb.from("sessions").upsert([sessionRow(s)], { onConflict: "user_id,key", ignoreDuplicates: true }))
      if (one) rejected++
      else pushed++
    }
    if (rejected > 0) {
      errors.push(rejected === batch.length
        ? `sessions: ${e}`
        : `sessions: ${rejected} of ${batch.length} rejected by the server`)
    }
  }

  return { pushed, errors }
}

export async function pushSettings(
  sb: SupabaseClient, settings: Record<string, unknown>, pinned: string[],
): Promise<PushResult> {
  const e = await run("settings", () =>
    sb.from("settings").upsert({ ...settings, pinned }, { onConflict: "user_id" }))
  return { pushed: e ? 0 : 1, errors: e ? [e] : [] }
}

/** Big data-URLs, kept out of every settings write so a goal change is cheap. */
export async function pushAssets(
  sb: SupabaseClient, assets: SyncedState["assets"],
): Promise<PushResult> {
  const rows = (["avatar", "alert_sound"] as const)
    .filter(kind => assets[kind])
    .map(kind => ({ kind, data_url: assets[kind] }))
  if (rows.length === 0) return { pushed: 0, errors: [] }
  const e = await run("assets", () => sb.from("user_assets").upsert(rows, { onConflict: "user_id,kind" }))
  return { pushed: e ? 0 : rows.length, errors: e ? [e] : [] }
}

/**
 * The spend ledger. Immutable and id'd client-side, so `ignoreDuplicates` makes
 * a retry a no-op — which is the whole reason the id is minted before the
 * request goes out. Without it, a push that succeeded but whose response was
 * lost would grant a second freeze.
 */
export async function pushOps(sb: SupabaseClient, ops: PointOp[]): Promise<PushResult> {
  if (ops.length === 0) return { pushed: 0, errors: [] }
  const errors: string[] = []
  for (const batch of chunk(ops)) {
    const e = await run("point_ops", () =>
      sb.from("point_ops").upsert(batch.map(o => ({
        id: o.id,
        points_delta: o.pointsDelta,
        freeze_delta: o.freezeDelta,
        protected_add: o.protectedAdd,
      })), { onConflict: "id", ignoreDuplicates: true }))
    if (e) errors.push(e)
  }
  return { pushed: errors.length ? 0 : ops.length, errors }
}

/** Soft-delete. Rows are never removed, so other devices can learn of the delete. */
export async function pushTombstones(
  sb: SupabaseClient, table: "tasks" | "projects", ids: string[],
): Promise<PushResult> {
  if (ids.length === 0) return { pushed: 0, errors: [] }
  const errors: string[] = []
  for (const batch of chunk(ids)) {
    const e = await run(`${table} tombstones`, () =>
      sb.from(table).update({ deleted_at: new Date().toISOString() }).in("id", batch))
    if (e) errors.push(e)
  }
  return { pushed: errors.length ? 0 : ids.length, errors }
}

/** Everything, in one go. Used by the first full upload after signing in. */
export async function pushAll(sb: SupabaseClient, state: SyncedState): Promise<PushResult> {
  const results = await Promise.all([
    pushProjects(sb, state.projects),
    pushTasks(sb, state.tasks),
    pushSessions(sb, state.history),
    pushSettings(sb, state.settings, state.pinned),
    pushAssets(sb, state.assets),
    pushOps(sb, state.ops),
  ])
  return {
    pushed: results.reduce((n, r) => n + r.pushed, 0),
    errors: results.flatMap(r => r.errors),
  }
}

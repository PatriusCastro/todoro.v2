import type { SupabaseClient } from "@supabase/supabase-js"
import { type Task } from "../../components/tasks/TaskCard"
import { type Project } from "../../components/tasks/TaskModal"
import { type SessionRecord } from "../types"
import { type PointOp } from "../ops"
import { type RemoteRow } from "./types"

/**
 * Cloud -> local. Deltas, keyed on the server's `updated_at`.
 *
 * A row that hasn't changed since the watermark is simply absent from the
 * response — which is *not* the same as deleted, and the merge is careful to
 * decide deletion from the shadow rather than from absence here.
 */

export interface RemoteChanges {
  tasks:    RemoteRow<Task>[]
  projects: RemoteRow<Project>[]
  history:  SessionRecord[]
  settings: Record<string, unknown> | null
  ops:      PointOp[]
  pinned:   string[] | null
  assets:   { avatar: string | null; alert_sound: string | null }
  /** Newest server timestamp seen, for the next watermark. */
  pulledAt: string | null
}

/**
 * A row committed before your read but visible after it would carry an
 * `updated_at` below the watermark and be missed forever. The textbook fix is a
 * monotonic per-user sequence; for this write volume, re-reading a few seconds
 * of overlap is cheaper and just as safe, because every apply is idempotent.
 */
const OVERLAP_MS = 5000

function rewind(iso: string | null): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : new Date(t - OVERLAP_MS).toISOString()
}

interface TaskRow {
  id: string; title: string; priority: Task["priority"]
  due_date: string | null; due_time: string | null
  done: boolean; subtasks: Task["subtasks"]
  estimated_sessions: number; completed_sessions: number
  project_id: string | null; repeat: Task["repeat"]; stage: Task["stage"]
  deleted_at: string | null; updated_at: string
}

const toTask = (r: TaskRow): RemoteRow<Task> => ({
  row: {
    id: r.id,
    title: r.title,
    priority: r.priority,
    dueDate: r.due_date ?? "",
    dueTime: r.due_time ?? "",
    // Recomputed on apply — a stored label is stale on the device that wrote it.
    dueLabel: "",
    done: r.done,
    subtasks: Array.isArray(r.subtasks) ? r.subtasks : [],
    estimatedSessions: r.estimated_sessions,
    completedSessions: r.completed_sessions,
    projectId: r.project_id ?? undefined,
    repeat: r.repeat ?? "none",
    stage: r.stage ?? undefined,
  },
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
})

interface ProjectRow {
  id: string; name: string; color: string
  deleted_at: string | null; updated_at: string
}

const toProject = (r: ProjectRow): RemoteRow<Project> => ({
  row: { id: r.id, name: r.name, color: r.color },
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at,
})

interface SessionRow {
  task_id: string; task_title: string; focus_mins: number; at: number
}

const toSession = (r: SessionRow): SessionRecord => ({
  taskId: r.task_id,
  taskTitle: r.task_title,
  focusMins: r.focus_mins,
  // bigint arrives as a number or a string depending on the driver path.
  at: typeof r.at === "string" ? Number(r.at) : r.at,
})

interface OpRow {
  id: string; points_delta: number; freeze_delta: number
  protected_add: string[] | null; created_at: string
}

const toOp = (r: OpRow): PointOp => ({
  id: r.id,
  pointsDelta: r.points_delta,
  freezeDelta: r.freeze_delta,
  protectedAdd: r.protected_add ?? [],
  at: Date.parse(r.created_at),
})

const newest = (...stamps: (string | null | undefined)[]) =>
  stamps.filter(Boolean).sort().pop() ?? null

export async function pullSince(
  sb: SupabaseClient, since: string | null,
): Promise<RemoteChanges> {
  const from = rewind(since)

  const taskQ = sb.from("tasks").select("*")
  const projQ = sb.from("projects").select("*")
  const sessQ = sb.from("sessions").select("task_id,task_title,focus_mins,at,created_at")

  if (from) {
    void taskQ.gt("updated_at", from)
    void projQ.gt("updated_at", from)
    void sessQ.gt("created_at", from)
  }

  const [tasks, projects, sessions, settings, assets, ops] = await Promise.all([
    taskQ, projQ, sessQ,
    sb.from("settings").select("*").maybeSingle(),
    sb.from("user_assets").select("kind,data_url"),
    sb.from("point_ops").select("id,points_delta,freeze_delta,protected_add,created_at"),
  ])

  const firstError = [tasks, projects, sessions, settings, assets, ops]
    .map(r => r.error).find(Boolean)
  if (firstError) throw new Error(firstError.message)

  const taskRows = (tasks.data ?? []) as TaskRow[]
  const projRows = (projects.data ?? []) as ProjectRow[]
  const settingsRow = (settings.data ?? null) as (Record<string, unknown> & { pinned?: string[] }) | null
  const assetRows = (assets.data ?? []) as { kind: string; data_url: string | null }[]

  // Explicit rather than destructured-and-rest: `user_id` and `updated_at` are
  // server bookkeeping, and `pinned` is applied through usePinnedTasks rather
  // than the settings patch.
  const SETTINGS_NON_COLUMNS = new Set(["pinned", "user_id", "updated_at"])
  const settingCols: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(settingsRow ?? {})) {
    if (!SETTINGS_NON_COLUMNS.has(k)) settingCols[k] = v
  }
  const pinnedCol = settingsRow?.pinned
  const settingsUpdated = settingsRow?.updated_at as string | undefined

  return {
    tasks:    taskRows.map(toTask),
    projects: projRows.map(toProject),
    history:  ((sessions.data ?? []) as SessionRow[]).map(toSession),
    ops: ((ops.data ?? []) as OpRow[]).map(toOp),
    settings: settingsRow ? settingCols : null,
    pinned:   Array.isArray(pinnedCol) ? (pinnedCol as string[]) : null,
    assets: {
      avatar:      assetRows.find(a => a.kind === "avatar")?.data_url ?? null,
      alert_sound: assetRows.find(a => a.kind === "alert_sound")?.data_url ?? null,
    },
    pulledAt: newest(
      ...taskRows.map(r => r.updated_at),
      ...projRows.map(r => r.updated_at),
      settingsUpdated,
      since,
    ),
  }
}

/** Cheap existence probe for the first-link decision — counts, no payload. */
export async function countRemoteTasks(sb: SupabaseClient): Promise<number> {
  const { count, error } = await sb
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
  if (error) throw new Error(error.message)
  return count ?? 0
}

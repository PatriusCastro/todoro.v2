import { type Task } from "../../components/tasks/TaskCard"
import { type Project } from "../../components/tasks/TaskModal"
import { type SessionRecord } from "../types"
import { isReservedId } from "../id"
import { type PointOp } from "../ops"
import { keysOfClass, SETTING_COLUMNS } from "./keys"

/**
 * Reads the app's current state straight out of localStorage.
 *
 * The engine deliberately never imports from app/page.tsx. The 26 existing
 * save() effects already flush every synced value synchronously, so
 * localStorage is a complete and current serialization of the app — which makes
 * the whole sync layer a sidecar that can be built, tested and deleted without
 * touching the 845-line component.
 */

export interface SyncedState {
  tasks:    Task[]
  projects: Project[]
  history:  SessionRecord[]
  /** Keyed by settings-row column name, ready to upsert. */
  settings: Record<string, unknown>
  assets:   { avatar: string | null; alert_sound: string | null }
  pinned:   string[]
  ops:      PointOp[]
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Defensive: a corrupt key must not blow up the whole snapshot. */
function readArray<T>(key: string): T[] {
  const v = read<unknown>(key, [])
  return Array.isArray(v) ? (v as T[]) : []
}

export function readLocalState(): SyncedState {
  const settings: Record<string, unknown> = {}
  for (const key of keysOfClass("setting")) {
    const column = SETTING_COLUMNS[key]
    if (!column || column === "pinned") continue
    const v = read<unknown>(key, undefined)
    if (v !== undefined) settings[column] = v
  }

  return {
    // The quick-focus sentinel is only ever an active task, never a stored one,
    // and the tasks table has a CHECK forbidding it. Filtered here so a
    // corrupted local file can't turn it into a push that fails forever.
    tasks:    readArray<Task>("todoro:tasks").filter(t => t?.id && !isReservedId(t.id)),
    projects: readArray<Project>("todoro:projects").filter(p => p?.id),
    history:  readArray<SessionRecord>("todoro:history").filter(s => typeof s?.at === "number"),
    settings,
    assets: {
      avatar:      read<string | null>("todoro:avatarUrl", null) || null,
      alert_sound: read<string | null>("todoro:alertCustom", null),
    },
    pinned: readArray<string>("todoro:pinned"),
    ops: readArray<PointOp>("todoro:ops").filter(o => o?.id),
  }
}

/** Stable per-device id, minted once. Tags outbox rows for debugging. */
export function deviceId(): string {
  try {
    const existing = localStorage.getItem("todoro:deviceId")
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem("todoro:deviceId", id)
    return id
  } catch {
    return "unknown-device"
  }
}

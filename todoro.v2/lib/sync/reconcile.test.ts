import { describe, expect, it } from "vitest"
import { type Task } from "../../components/tasks/TaskCard"
import { type Project } from "../../components/tasks/TaskModal"
import { type SessionRecord } from "../types"
import { type RemoteChanges } from "./pull"
import { reconcile, shadowFromLocal } from "./reconcile"
import { type SyncedState } from "./snapshot"
import { emptyMeta, type SyncMeta } from "./state"

// dueLabel matches what formatDueLabel produces for an empty due date, since
// reconcile recomputes it — a placeholder here would make every case look like
// a change.
const task = (id: string, over: Partial<Task> = {}): Task => ({
  id, title: `Task ${id}`, priority: "none", dueDate: "", dueTime: "",
  dueLabel: "No due date",
  done: false, subtasks: [], estimatedSessions: 0, completedSessions: 0, ...over,
})
const project = (id: string, name = `P${id}`): Project => ({ id, name, color: "#000" })
const session = (at: number, taskId = "a"): SessionRecord =>
  ({ taskId, taskTitle: "T", focusMins: 25, at })

const localState = (over: Partial<SyncedState> = {}): SyncedState => ({
  tasks: [], projects: [], history: [], settings: {}, pinned: [],
  assets: { avatar: null, alert_sound: null }, ...over,
})

const remoteChanges = (over: Partial<RemoteChanges> = {}): RemoteChanges => ({
  tasks: [], projects: [], history: [], settings: null, pinned: null,
  assets: { avatar: null, alert_sound: null }, pulledAt: "2026-01-02T00:00:00Z", ...over,
})

const remoteTask = (t: Task, deletedAt: string | null = null) =>
  ({ row: t, updatedAt: "2026-01-02T00:00:00Z", deletedAt })

/** A device that has already synced the given state. */
function syncedMeta(local: SyncedState): SyncMeta {
  return { ...emptyMeta("acct"), everPulled: true, pulledAt: "2026-01-01T00:00:00Z",
    shadow: shadowFromLocal(local) }
}

describe("reconcile", () => {
  it("emits no patch and no push when nothing changed anywhere", () => {
    const local = localState({ tasks: [task("a")] })
    const r = reconcile(local, syncedMeta(local), remoteChanges())
    expect(r.patch).toEqual({})
    expect(r.push.tasks).toEqual([])
    expect(r.tombstones.tasks).toEqual([])
  })

  it("settles — feeding its own output back produces nothing further", () => {
    // The property that stops apply -> save -> diff echoing forever.
    const local = localState({ tasks: [task("a")] })
    const first = reconcile(local, syncedMeta(local), remoteChanges({
      tasks: [remoteTask(task("a", { title: "Renamed" }))],
    }))
    expect(first.patch.tasks?.[0].title).toBe("Renamed")

    const after = localState({ tasks: first.patch.tasks! })
    const second = reconcile(after, first.meta, remoteChanges({ tasks: [] }))
    expect(second.patch).toEqual({})
    expect(second.push.tasks).toEqual([])
  })

  it("takes a remote edit and pushes nothing back", () => {
    const local = localState({ tasks: [task("a")] })
    const r = reconcile(local, syncedMeta(local), remoteChanges({
      tasks: [remoteTask(task("a", { title: "Theirs" }))],
    }))
    expect(r.patch.tasks?.[0].title).toBe("Theirs")
    expect(r.push.tasks).toEqual([])
  })

  it("pushes a local edit and leaves local alone", () => {
    const before = localState({ tasks: [task("a")] })
    const meta = syncedMeta(before)
    const local = localState({ tasks: [task("a", { title: "Mine" })] })
    const r = reconcile(local, meta, remoteChanges())
    expect(r.patch.tasks).toBeUndefined()
    expect(r.push.tasks.map(t => t.title)).toEqual(["Mine"])
  })

  it("unions history from both sides", () => {
    const local = localState({ history: [session(1)] })
    const r = reconcile(local, syncedMeta(local), remoteChanges({ history: [session(2)] }))
    expect(r.patch.history?.map(s => s.at)).toEqual([1, 2])
  })

  it("derives completedSessions from the unioned history", () => {
    const local = localState({ tasks: [task("a")], history: [] })
    const r = reconcile(local, syncedMeta(local), remoteChanges({
      history: [session(1, "a"), session(2, "a")],
    }))
    expect(r.patch.tasks?.[0].completedSessions).toBe(2)
  })

  it("recomputes dueLabel rather than trusting what arrived", () => {
    // Stale on the device that wrote it, so it is never taken at face value.
    const local = localState({ tasks: [task("a", { dueLabel: "Due in 400 days" })] })
    const r = reconcile(local, syncedMeta(local), remoteChanges())
    expect(r.patch.tasks?.[0].dueLabel).toBe("No due date")
  })

  it("tombstones a locally deleted task", () => {
    const before = localState({ tasks: [task("a"), task("b")] })
    const meta = syncedMeta(before)
    const r = reconcile(localState({ tasks: [task("a")] }), meta, remoteChanges())
    expect(r.tombstones.tasks).toEqual(["b"])
  })

  it("refuses a mass delete and reports it rather than replicating it", () => {
    // What a quota-evicted localStorage looks like from here.
    const before = localState({ tasks: Array.from({ length: 40 }, (_, i) => task(`t${i}`)) })
    const meta = syncedMeta(before)
    const r = reconcile(localState({ tasks: [] }), meta, remoteChanges())
    expect(r.tombstones.tasks).toEqual([])
    expect(r.blocked.tasks).toBe(40)
  })

  it("refuses every deletion before the first pull has ever succeeded", () => {
    const before = localState({ tasks: [task("a"), task("b")] })
    const meta = { ...syncedMeta(before), everPulled: false }
    const r = reconcile(localState({ tasks: [task("a")] }), meta, remoteChanges())
    expect(r.tombstones.tasks).toEqual([])
    expect(r.blocked.tasks).toBe(1)
  })

  it("drops a task the account says was deleted", () => {
    const local = localState({ tasks: [task("a")] })
    const r = reconcile(local, syncedMeta(local), remoteChanges({
      tasks: [remoteTask(task("a"), "2026-01-02T00:00:00Z")],
    }))
    expect(r.patch.tasks).toEqual([])
  })

  it("keeps independent settings changes from both devices", () => {
    const before = localState({ settings: { theme: "system", daily_goal: 5 } })
    const meta = syncedMeta(before)
    const local = localState({ settings: { theme: "dark", daily_goal: 5 } })
    const r = reconcile(local, meta, remoteChanges({
      settings: { theme: "system", daily_goal: 8 },
    }))
    expect(r.patch.settings).toEqual({ theme: "dark", daily_goal: 8 })
    expect(r.push.settings).toEqual({ theme: "dark" })
  })

  it("merges projects and pushes only what changed locally", () => {
    const before = localState({ projects: [project("p1")] })
    const meta = syncedMeta(before)
    const local = localState({ projects: [project("p1", "Renamed")] })
    const r = reconcile(local, meta, remoteChanges({
      projects: [{ row: project("p2"), updatedAt: "2026-01-02T00:00:00Z", deletedAt: null }],
    }))
    expect(r.push.projects.map(p => p.name)).toEqual(["Renamed"])
    expect(r.patch.projects?.map(p => p.id).sort()).toEqual(["p1", "p2"])
  })

  it("advances the watermark and records that a pull happened", () => {
    const local = localState()
    const r = reconcile(local, emptyMeta("acct"), remoteChanges({ pulledAt: "2026-05-05T00:00:00Z" }))
    expect(r.meta.everPulled).toBe(true)
    expect(r.meta.pulledAt).toBe("2026-05-05T00:00:00Z")
  })

  it("does not push a null asset over one the account already holds", () => {
    const local = localState()
    const r = reconcile(local, syncedMeta(local), remoteChanges({
      assets: { avatar: "data:image/jpeg;base64,xxx", alert_sound: null },
    }))
    expect(r.patch.assets?.avatar).toBe("data:image/jpeg;base64,xxx")
  })
})

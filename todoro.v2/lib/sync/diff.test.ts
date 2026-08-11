import { describe, expect, it } from "vitest"
import { type Task } from "../../components/tasks/TaskCard"
import { type SessionRecord } from "../types"
import { guardDeletions, isPristineSeed, SEED_TASK_IDS, shouldAdoptRemote } from "./diff"

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id, title: `Task ${id}`, priority: "none", dueDate: "", dueTime: "", dueLabel: "",
  done: false, subtasks: [], estimatedSessions: 0, completedSessions: 0, ...over,
})
const seed = () => SEED_TASK_IDS.map(id => task(id))
const session = (): SessionRecord => ({ taskId: "1", taskTitle: "T", focusMins: 25, at: 1 })

const base = {
  tombstones: ["a"],
  localCount: 9,
  shadowCount: 10,
  pulledThisSession: true,
}

describe("guardDeletions", () => {
  it("allows an ordinary single delete", () => {
    expect(guardDeletions(base)).toEqual({ allowed: ["a"], blocked: [] })
  })

  it("is a no-op when there is nothing to delete", () => {
    expect(guardDeletions({ ...base, tombstones: [] }))
      .toEqual({ allowed: [], blocked: [] })
  })

  // Guard 1
  it("blocks every deletion before the first successful pull", () => {
    const r = guardDeletions({ ...base, pulledThisSession: false })
    expect(r.allowed).toEqual([])
    expect(r.blocked).toEqual(["a"])
    expect(r.reason).toBe("no-pull-yet")
  })

  // Guard 2 — the storage-loss case
  it("blocks a mass delete that looks like localStorage was wiped", () => {
    // 40 tasks became the 3 seed tasks: load() fell back after a quota error.
    const r = guardDeletions({
      tombstones: Array.from({ length: 40 }, (_, i) => `t${i}`),
      localCount: 3,
      shadowCount: 40,
      pulledThisSession: true,
    })
    expect(r.allowed).toEqual([])
    expect(r.blocked).toHaveLength(40)
    expect(r.reason).toBe("mass-delete")
  })

  it("lets a confirmed mass delete through", () => {
    const r = guardDeletions({
      tombstones: Array.from({ length: 40 }, (_, i) => `t${i}`),
      localCount: 3,
      shadowCount: 40,
      pulledThisSession: true,
      confirmedLargeDelete: true,
    })
    expect(r.allowed).toHaveLength(40)
    expect(r.blocked).toEqual([])
  })

  it("does not trip on a small collection, where a big ratio is normal", () => {
    // 3 of 4 deleted is 75%, but only 3 rows — clearing out a short list.
    const r = guardDeletions({
      tombstones: ["a", "b", "c"],
      localCount: 1,
      shadowCount: 4,
      pulledThisSession: true,
    })
    expect(r.allowed).toEqual(["a", "b", "c"])
  })

  it("does not trip on a large absolute delete that is a small share", () => {
    // 6 of 100 — deliberate housekeeping, not loss.
    const r = guardDeletions({
      tombstones: Array.from({ length: 6 }, (_, i) => `t${i}`),
      localCount: 94,
      shadowCount: 100,
      pulledThisSession: true,
    })
    expect(r.allowed).toHaveLength(6)
  })

  it("needs both the count and the ratio to be exceeded", () => {
    // Exactly 5 gone of 10 — over the ratio but not over the count floor.
    const r = guardDeletions({
      tombstones: Array.from({ length: 5 }, (_, i) => `t${i}`),
      localCount: 5,
      shadowCount: 10,
      pulledThisSession: true,
    })
    expect(r.allowed).toHaveLength(5)
  })
})

describe("isPristineSeed", () => {
  it("recognises an untouched fresh install", () => {
    expect(isPristineSeed(seed(), [], [])).toBe(true)
  })

  it("rejects it once any session has been logged", () => {
    expect(isPristineSeed(seed(), [session()], [])).toBe(false)
  })

  it("rejects it once a task is completed", () => {
    const t = seed()
    t[0].done = true
    expect(isPristineSeed(t, [], [])).toBe(false)
  })

  it("rejects it once a subtask is ticked", () => {
    const t = seed()
    t[0].subtasks = [{ id: "s", title: "x", done: true }]
    expect(isPristineSeed(t, [], [])).toBe(false)
  })

  it("rejects it once a session has been focused on a seed task", () => {
    const t = seed()
    t[1].completedSessions = 1
    expect(isPristineSeed(t, [], [])).toBe(false)
  })

  it("rejects it once a project exists", () => {
    expect(isPristineSeed(seed(), [], [{ id: "p" }])).toBe(false)
  })

  it("rejects it once a task has been added", () => {
    expect(isPristineSeed([...seed(), task("new")], [], [])).toBe(false)
  })

  it("rejects it once a seed task has been deleted", () => {
    expect(isPristineSeed(seed().slice(0, 2), [], [])).toBe(false)
  })

  it("rejects real data that happens to have three tasks", () => {
    expect(isPristineSeed([task("x"), task("y"), task("z")], [], [])).toBe(false)
  })

  it("rejects an empty install, which is not the seed", () => {
    expect(isPristineSeed([], [], [])).toBe(false)
  })
})

describe("shouldAdoptRemote", () => {
  it("adopts when this device is a fresh install and the account has data", () => {
    expect(shouldAdoptRemote({
      tasks: seed(), history: [], projects: [], remoteTaskCount: 14,
    })).toBe(true)
  })

  it("does not adopt when the account is empty", () => {
    expect(shouldAdoptRemote({
      tasks: seed(), history: [], projects: [], remoteTaskCount: 0,
    })).toBe(false)
  })

  it("does not adopt when this device has real work — that needs the dialog", () => {
    expect(shouldAdoptRemote({
      tasks: [task("mine")], history: [], projects: [], remoteTaskCount: 14,
    })).toBe(false)
  })
})

import { beforeEach, describe, expect, it } from "vitest"
import { type Task } from "../../components/tasks/TaskCard"
import { type SessionRecord } from "../types"
import { decideFirstLink, summarize } from "./migrate"
import { SEED_TASK_IDS } from "./diff"
import { emptyMeta, loadMeta, metaForAccount, saveMeta } from "./state"

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id, title: `Task ${id}`, priority: "none", dueDate: "", dueTime: "", dueLabel: "",
  done: false, subtasks: [], estimatedSessions: 0, completedSessions: 0, ...over,
})
const seed = () => SEED_TASK_IDS.map(id => task(id))
const session = (at: number): SessionRecord => ({ taskId: "1", taskTitle: "T", focusMins: 25, at })

const base = { tasks: seed(), history: [] as SessionRecord[], projects: [] as { id: string }[], remoteTaskCount: 0 }

describe("decideFirstLink", () => {
  it("uploads without asking when the account is empty", () => {
    expect(decideFirstLink({ ...base, tasks: [task("real")], remoteTaskCount: 0 }))
      .toBe("adopt-local")
  })

  it("takes the account without asking on a fresh install", () => {
    expect(decideFirstLink({ ...base, remoteTaskCount: 14 })).toBe("adopt-remote")
  })

  it("takes the account without asking on a genuinely empty device", () => {
    // Every seed task deleted, nothing logged: nothing to lose, so no question.
    expect(decideFirstLink({ ...base, tasks: [], remoteTaskCount: 14 })).toBe("adopt-remote")
  })

  it("asks when both sides hold real work", () => {
    expect(decideFirstLink({ ...base, tasks: [task("mine")], remoteTaskCount: 14 }))
      .toBe("ask")
  })

  it("asks when the device only has history — a streak is worth protecting", () => {
    expect(decideFirstLink({ ...base, history: [session(1)], remoteTaskCount: 14 }))
      .toBe("ask")
  })

  it("asks when the seed tasks have been worked on", () => {
    const touched = seed()
    touched[0].done = true
    expect(decideFirstLink({ ...base, tasks: touched, remoteTaskCount: 14 })).toBe("ask")
  })

  it("never asks when there is nothing on the other side to lose", () => {
    expect(decideFirstLink({ ...base, tasks: [task("a")], history: [session(1)], remoteTaskCount: 0 }))
      .toBe("adopt-local")
  })
})

describe("summarize", () => {
  it("counts open tasks and all sessions", () => {
    expect(summarize([task("a"), task("b", { done: true })], [session(1), session(2)]))
      .toEqual({ tasks: 1, sessions: 2 })
  })
})

// ── sync metadata ────────────────────────────────────────────────────────────
function stubStorage() {
  const map = new Map<string, string>()
  globalThis.localStorage = {
    get length() { return map.size },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, String(v)) },
    removeItem: (k: string) => { map.delete(k) },
    clear: () => { map.clear() },
  }
}

beforeEach(stubStorage)

describe("sync metadata", () => {
  it("starts empty", () => {
    const m = loadMeta()
    expect(m.everPulled).toBe(false)
    expect(m.pulledAt).toBeNull()
    expect(m.shadow.tasks).toEqual({})
  })

  it("round-trips", () => {
    const m = emptyMeta("acct-1")
    m.everPulled = true
    m.pulledAt = "2026-01-01T00:00:00Z"
    m.shadow.tasks = { a: "h1" }
    saveMeta(m)
    expect(loadMeta()).toEqual(m)
  })

  it("survives corrupt storage rather than throwing into a sync run", () => {
    localStorage.setItem("todoro:sync", "{not json")
    expect(loadMeta().everPulled).toBe(false)
  })

  it("discards a shadow written by a different schema version", () => {
    // A wrong shadow is worse than none: it makes unchanged rows look edited
    // and edited rows look untouched.
    localStorage.setItem("todoro:sync", JSON.stringify({
      schemaVersion: 99, accountId: "acct-1", everPulled: true,
      shadow: { tasks: { a: "stale" } },
    }))
    const m = loadMeta()
    expect(m.shadow.tasks).toEqual({})
    expect(m.everPulled).toBe(false)
    expect(m.accountId).toBe("acct-1")
  })

  it("keeps the shadow for the same account", () => {
    const m = emptyMeta("acct-1")
    m.shadow.tasks = { a: "h1" }
    m.everPulled = true
    saveMeta(m)
    expect(metaForAccount("acct-1").shadow.tasks).toEqual({ a: "h1" })
  })

  it("throws the shadow away when a different account signs in", () => {
    // The ids would be foreign, every local row would look new, and the merge
    // would try to push one account's data into another.
    const m = emptyMeta("acct-1")
    m.shadow.tasks = { a: "h1" }
    m.everPulled = true
    saveMeta(m)

    const fresh = metaForAccount("acct-2")
    expect(fresh.shadow.tasks).toEqual({})
    expect(fresh.everPulled).toBe(false)
    expect(fresh.accountId).toBe("acct-2")
  })
})

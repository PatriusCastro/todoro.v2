import { describe, expect, it } from "vitest"
import { type Task } from "../../components/tasks/TaskCard"
import { type SessionRecord } from "../types"
import { fnv1a, hashRow, PROJECT_FIELDS, stableStringify, TASK_FIELDS } from "./hash"
import {
  mergeById, mergeCounter, mergeHistory, mergeSet, mergeSettings, mergeSubtasks,
  mergeTasks, recomputeCompletedSessions, sessionKey,
} from "./merge"
import { type RemoteRow, type ShadowMap } from "./types"

// ── helpers ──────────────────────────────────────────────────────────────────
interface Row { id: string; name: string; color: string }
const row = (id: string, name: string, color = "#000"): Row => ({ id, name, color })
const FIELDS = PROJECT_FIELDS as unknown as (keyof Row)[]
const h = (r: Row) => hashRow(r, FIELDS)
const remoteOf = (r: Row, deletedAt: string | null = null): RemoteRow<Row> =>
  ({ row: r, updatedAt: "2026-01-01T00:00:00Z", deletedAt })
const shadowOf = (...rows: Row[]): ShadowMap =>
  Object.fromEntries(rows.map(r => [r.id, h(r)]))

const task = (over: Partial<Task> = {}): Task => ({
  id: "t1", title: "Task", priority: "none", dueDate: "", dueTime: "", dueLabel: "",
  done: false, subtasks: [], estimatedSessions: 0, completedSessions: 0, ...over,
})
const session = (at: number, taskId = "t1"): SessionRecord =>
  ({ taskId, taskTitle: "T", focusMins: 25, at })

// ── hashing ──────────────────────────────────────────────────────────────────
describe("hash", () => {
  it("is stable across runs", () => {
    expect(fnv1a("hello")).toBe(fnv1a("hello"))
    expect(fnv1a("hello")).not.toBe(fnv1a("hellp"))
  })

  it("ignores key order", () => {
    expect(stableStringify({ a: 1, b: 2 })).toBe(stableStringify({ b: 2, a: 1 }))
  })

  it("treats undefined and absent as the same, so optional fields don't flap", () => {
    expect(hashRow({ a: 1, b: undefined }, ["a", "b"])).toBe(hashRow({ a: 1 } as never, ["a", "b"]))
  })

  it("excludes dueLabel, which is rendered and goes stale on its own", () => {
    expect(TASK_FIELDS).not.toContain("dueLabel")
    const a = task({ dueLabel: "Due today" })
    const b = task({ dueLabel: "Overdue 3d" })
    expect(hashRow(a, TASK_FIELDS as unknown as (keyof Task)[]))
      .toBe(hashRow(b, TASK_FIELDS as unknown as (keyof Task)[]))
  })

  it("notices a nested subtask change", () => {
    const f = TASK_FIELDS as unknown as (keyof Task)[]
    const a = task({ subtasks: [{ id: "s", title: "x", done: false }] })
    const b = task({ subtasks: [{ id: "s", title: "x", done: true }] })
    expect(hashRow(a, f)).not.toBe(hashRow(b, f))
  })
})

// ── the conflict table ───────────────────────────────────────────────────────
describe("mergeById", () => {
  it("takes remote when only remote changed, losing nothing", () => {
    const base = row("1", "old")
    const r = mergeById([base], shadowOf(base), [remoteOf(row("1", "new"))], FIELDS)
    expect(r.next).toEqual([row("1", "new")])
    expect(r.push).toEqual([])
  })

  it("keeps and pushes local when only local changed", () => {
    const base = row("1", "old")
    const r = mergeById([row("1", "mine")], shadowOf(base), [remoteOf(base)], FIELDS)
    expect(r.next).toEqual([row("1", "mine")])
    expect(r.push).toEqual([row("1", "mine")])
  })

  it("lets remote win a genuine conflict", () => {
    const base = row("1", "old")
    const r = mergeById([row("1", "mine")], shadowOf(base), [remoteOf(row("1", "theirs"))], FIELDS)
    expect(r.next).toEqual([row("1", "theirs")])
    expect(r.push).toEqual([])
  })

  it("does nothing when neither side moved", () => {
    const base = row("1", "same")
    const r = mergeById([base], shadowOf(base), [remoteOf(base)], FIELDS)
    expect(r.next).toEqual([base])
    expect(r.push).toEqual([])
    expect(r.tombstone).toEqual([])
  })

  it("inserts a row it has never seen", () => {
    const r = mergeById([], {}, [remoteOf(row("9", "new"))], FIELDS)
    expect(r.next).toEqual([row("9", "new")])
    expect(r.push).toEqual([])
  })

  it("pushes a locally created row", () => {
    const r = mergeById([row("9", "new")], {}, [], FIELDS)
    expect(r.push).toEqual([row("9", "new")])
  })

  it("tombstones a row this device deleted", () => {
    const base = row("1", "gone")
    const r = mergeById([], shadowOf(base), [remoteOf(base)], FIELDS)
    expect(r.tombstone).toEqual(["1"])
    expect(r.next).toEqual([])
  })

  it("lets a remote delete beat a local edit", () => {
    const base = row("1", "old")
    const r = mergeById([row("1", "edited")], shadowOf(base), [remoteOf(base, "2026-01-02")], FIELDS)
    expect(r.next).toEqual([])
    expect(r.push).toEqual([])
  })

  it("tombstones a local delete even when the delta pull omits the row", () => {
    // Pulls are deltas: a row unchanged server-side is absent from `remote`
    // while still existing. Deciding on `remote` rather than the shadow here
    // would mean local deletes silently never propagated.
    const r = mergeById([], shadowOf(row("1", "x")), [], FIELDS)
    expect(r.next).toEqual([])
    expect(r.tombstone).toEqual(["1"])
  })

  it("leaves an unknown, unseen id alone rather than inventing a tombstone", () => {
    const r = mergeById([], {}, [], FIELDS)
    expect(r.next).toEqual([])
    expect(r.tombstone).toEqual([])
  })

  it("hands back a shadow matching the merged result", () => {
    const base = row("1", "old")
    const r = mergeById([row("1", "mine")], shadowOf(base), [remoteOf(base)], FIELDS)
    // Feeding the result straight back must be a no-op — this is what stops the
    // apply -> save -> diff loop from echoing forever.
    const again = mergeById(r.next, r.shadow, [remoteOf(r.next[0])], FIELDS)
    expect(again.push).toEqual([])
    expect(again.tombstone).toEqual([])
  })
})

// ── history ──────────────────────────────────────────────────────────────────
describe("mergeHistory", () => {
  it("unions both sides", () => {
    expect(mergeHistory([session(1)], [session(2)]).map(s => s.at)).toEqual([1, 2])
  })

  it("dedupes by natural key, so re-importing a backup can't double a streak", () => {
    const s = session(1000)
    expect(mergeHistory([s], [s, s])).toHaveLength(1)
  })

  it("keeps two sessions on different tasks at the same instant", () => {
    expect(mergeHistory([session(5, "a")], [session(5, "b")])).toHaveLength(2)
  })

  it("orders by time", () => {
    expect(mergeHistory([session(30), session(10)], [session(20)]).map(s => s.at))
      .toEqual([10, 20, 30])
  })

  it("has a deterministic key", () => {
    expect(sessionKey(session(7, "abc"))).toBe("7:abc")
  })
})

// ── counters ─────────────────────────────────────────────────────────────────
describe("mergeCounter", () => {
  it("keeps both devices' earnings, which last-write-wins would destroy", () => {
    // This device went 100 -> 180 offline (+80). Another added 50 to the shared
    // total. LWW would give 180 or 150; the answer is 230.
    expect(mergeCounter(180, 100, 150)).toEqual({ value: 230, delta: 80 })
  })

  it("is a no-op when this device earned nothing", () => {
    expect(mergeCounter(100, 100, 150)).toEqual({ value: 150, delta: 0 })
  })

  it("carries a spend as a negative delta", () => {
    expect(mergeCounter(0, 250, 250)).toEqual({ value: 0, delta: -250 })
  })

  it("clamps a double-spend rather than showing a negative balance", () => {
    expect(mergeCounter(0, 1, 0).value).toBe(0)
  })
})

describe("mergeSet", () => {
  it("keeps a local add on top of remote", () => {
    expect(mergeSet(["a", "b"], ["a"], ["a", "c"]).value.sort()).toEqual(["a", "b", "c"])
  })

  it("applies a local removal to remote", () => {
    expect(mergeSet(["a"], ["a", "b"], ["a", "b"]).value).toEqual(["a"])
  })

  it("reports what changed", () => {
    const r = mergeSet(["a", "c"], ["a", "b"], ["a", "b"])
    expect(r.added).toEqual(["c"])
    expect(r.removed).toEqual(["b"])
  })

  it("takes a remote add this device never saw", () => {
    expect(mergeSet(["a"], ["a"], ["a", "z"]).value.sort()).toEqual(["a", "z"])
  })
})

// ── subtasks ─────────────────────────────────────────────────────────────────
describe("mergeSubtasks", () => {
  it("unions by id", () => {
    const r = mergeSubtasks(
      [{ id: "1", title: "a", done: true }],
      [{ id: "2", title: "b", done: false }],
    )
    expect(r).toHaveLength(2)
  })

  it("prefers the local version of a shared id", () => {
    const r = mergeSubtasks(
      [{ id: "1", title: "a", done: true }],
      [{ id: "1", title: "a", done: false }],
    )
    expect(r).toEqual([{ id: "1", title: "a", done: true }])
  })
})

// ── derived fields ───────────────────────────────────────────────────────────
describe("recomputeCompletedSessions", () => {
  it("counts matching history", () => {
    expect(recomputeCompletedSessions(task(), [session(1), session(2)])).toBe(2)
  })

  it("ignores other tasks' sessions", () => {
    expect(recomputeCompletedSessions(task(), [session(1, "other")])).toBe(0)
  })

  it("never decreases a count the user can already see", () => {
    expect(recomputeCompletedSessions(task({ completedSessions: 9 }), [])).toBe(9)
  })

  it("is idempotent", () => {
    const t = task({ completedSessions: 1 })
    const once = recomputeCompletedSessions(t, [session(1)])
    expect(recomputeCompletedSessions({ ...t, completedSessions: once }, [session(1)])).toBe(once)
  })
})

describe("mergeTasks", () => {
  it("re-renders dueLabel rather than trusting the synced one", () => {
    const stale = task({ id: "t1", dueDate: "", dueLabel: "Due in 400 days" })
    const r = mergeTasks([stale], {}, [], [])
    expect(r.next[0].dueLabel).toBe("No due date")
  })

  it("reconciles completedSessions from history", () => {
    const r = mergeTasks([task({ id: "t1" })], {}, [], [session(1), session(2)])
    expect(r.next[0].completedSessions).toBe(2)
  })
})

// ── settings ─────────────────────────────────────────────────────────────────
describe("mergeSettings", () => {
  const hv = (v: unknown) => fnv1a(stableStringify(v))

  it("keeps independent field changes from both devices", () => {
    const local = { theme: "dark", dailyGoal: 5 }
    const shadow = { theme: hv("light"), dailyGoal: hv(5) }
    const remote = { theme: "light", dailyGoal: 8 }
    const r = mergeSettings(local, shadow, remote, hv)
    expect(r.value).toEqual({ theme: "dark", dailyGoal: 8 })
    expect(r.patch).toEqual({ theme: "dark" })
  })

  it("lets remote win a same-field conflict", () => {
    const r = mergeSettings(
      { theme: "dark" }, { theme: hv("system") }, { theme: "light" }, hv,
    )
    expect(r.value.theme).toBe("light")
    expect(r.patch).toEqual({})
  })

  it("pushes a field remote has never seen", () => {
    const r = mergeSettings({ theme: "dark" }, {}, {}, hv)
    expect(r.patch).toEqual({ theme: "dark" })
  })

  it("settles: merging its own output produces no further patch", () => {
    const first = mergeSettings({ theme: "dark", dailyGoal: 5 }, {}, {}, hv)
    const second = mergeSettings(first.value, first.shadow, first.value, hv)
    expect(second.patch).toEqual({})
  })
})

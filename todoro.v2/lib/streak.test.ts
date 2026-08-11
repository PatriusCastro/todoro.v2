import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { computeStreak, findStreakRestore } from "./streak"
import { type SessionRecord } from "./types"

/** A session on a given local calendar day. */
const on = (y: number, m: number, d: number): SessionRecord => ({
  taskId: "t", taskTitle: "T", focusMins: 25, at: new Date(y, m - 1, d, 10, 0).getTime(),
})

const freeze = (y: number, m: number, d: number) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(y, m - 1, d, 14, 0))
}

afterEach(() => { vi.useRealTimers() })

describe("computeStreak", () => {
  beforeEach(() => freeze(2026, 1, 15))

  it("is 0 with no history", () => {
    expect(computeStreak([], [])).toBe(0)
  })

  it("counts a run ending today", () => {
    expect(computeStreak([on(2026, 1, 13), on(2026, 1, 14), on(2026, 1, 15)])).toBe(3)
  })

  it("counts a run ending yesterday, so today isn't a cliff edge", () => {
    expect(computeStreak([on(2026, 1, 13), on(2026, 1, 14)])).toBe(2)
  })

  it("is 0 once the last active day is two days back", () => {
    expect(computeStreak([on(2026, 1, 12), on(2026, 1, 13)])).toBe(0)
  })

  it("stops at the first gap", () => {
    expect(computeStreak([on(2026, 1, 11), on(2026, 1, 13), on(2026, 1, 14), on(2026, 1, 15)])).toBe(3)
  })

  it("counts a day once no matter how many sessions it holds", () => {
    expect(computeStreak([on(2026, 1, 15), on(2026, 1, 15), on(2026, 1, 15)])).toBe(1)
  })

  it("treats a protected date as an active day", () => {
    expect(computeStreak([on(2026, 1, 15), on(2026, 1, 13)], ["2026-01-14"])).toBe(3)
  })

  it("survives the spring-forward boundary", () => {
    // The streak runs Mar 8-10 2025 and DST started on the 9th. The old
    // millisecond arithmetic skipped the 9th and reported 1 instead of 3.
    freeze(2025, 3, 10)
    expect(computeStreak([on(2025, 3, 8), on(2025, 3, 9), on(2025, 3, 10)])).toBe(3)
  })
})

describe("findStreakRestore", () => {
  beforeEach(() => freeze(2026, 1, 15))

  it("is null when there is no history", () => {
    expect(findStreakRestore([], [])).toBeNull()
  })

  it("is null while the streak is still alive today", () => {
    expect(findStreakRestore([on(2026, 1, 15)], [])).toBeNull()
  })

  it("is null while the streak is still alive yesterday", () => {
    expect(findStreakRestore([on(2026, 1, 14)], [])).toBeNull()
  })

  it("returns the single missed day", () => {
    // Last active the 13th, so only the 14th is missing (today doesn't count).
    expect(findStreakRestore([on(2026, 1, 13)], [])).toEqual(["2026-01-14"])
  })

  it("returns a three-day gap", () => {
    expect(findStreakRestore([on(2026, 1, 11)], [])).toEqual([
      "2026-01-12", "2026-01-13", "2026-01-14",
    ])
  })

  it("is null when the gap is too stale to bridge", () => {
    expect(findStreakRestore([on(2026, 1, 10)], [])).toBeNull()
  })

  it("counts an existing protected date as active", () => {
    expect(findStreakRestore([on(2026, 1, 10)], ["2026-01-14"])).toBeNull()
  })

  it("survives the spring-forward boundary", () => {
    freeze(2025, 3, 11)
    // Last active the 8th; the 9th (23 hours) and 10th are missing.
    expect(findStreakRestore([on(2025, 3, 8)], [])).toEqual(["2025-03-09", "2025-03-10"])
  })
})

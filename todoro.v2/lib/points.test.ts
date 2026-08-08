import { describe, expect, it } from "vitest"
import { computePoints, earnedFromHistory, levelFromPoints, POINTS_STREAK_CAP } from "./points"
import { type SessionRecord } from "./types"

const on = (y: number, m: number, d: number, focusMins = 25): SessionRecord => ({
  taskId: "t", taskTitle: "T", focusMins, at: new Date(y, m - 1, d, 10, 0).getTime(),
})

describe("computePoints", () => {
  it("is one point per focused minute with no streak", () => {
    expect(computePoints(25, 0)).toBe(25)
  })

  it("floors at one point, so a sub-minute session still counts", () => {
    expect(computePoints(0, 0)).toBe(1)
  })

  it("adds 5% per streak day", () => {
    expect(computePoints(100, 4)).toBe(120)
  })

  it("caps the bonus at +70%", () => {
    expect(computePoints(100, POINTS_STREAK_CAP)).toBe(170)
    expect(computePoints(100, 500)).toBe(170)
  })

  it("never decreases as the streak grows", () => {
    let prev = 0
    for (let s = 0; s <= 30; s++) {
      const p = computePoints(25, s)
      expect(p).toBeGreaterThanOrEqual(prev)
      prev = p
    }
  })
})

describe("earnedFromHistory", () => {
  it("is 0 with no sessions", () => {
    expect(earnedFromHistory([])).toBe(0)
  })

  it("pays a lone session at streak 1", () => {
    expect(earnedFromHistory([on(2026, 1, 15)])).toBe(computePoints(25, 1))
  })

  it("pays each session the streak it had on its own day", () => {
    // Three consecutive days: streaks 1, 2, 3 — not 3, 3, 3.
    expect(earnedFromHistory([on(2026, 1, 13), on(2026, 1, 14), on(2026, 1, 15)]))
      .toBe(computePoints(25, 1) + computePoints(25, 2) + computePoints(25, 3))
  })

  it("restarts the streak after a gap", () => {
    expect(earnedFromHistory([on(2026, 1, 13), on(2026, 1, 15)]))
      .toBe(computePoints(25, 1) * 2)
  })

  it("pays every session on a day, at that day's streak", () => {
    expect(earnedFromHistory([on(2026, 1, 15), on(2026, 1, 15)]))
      .toBe(computePoints(25, 1) * 2)
  })

  it("counts a protected date as continuing the streak", () => {
    // A Streak Freeze bridges the 14th, so the 15th is day 3, not day 1.
    const withFreeze = earnedFromHistory([on(2026, 1, 13), on(2026, 1, 15)], ["2026-01-14"])
    expect(withFreeze).toBe(computePoints(25, 1) + computePoints(25, 3))
  })

  it("does not pay for a protected date itself — no session, no points", () => {
    expect(earnedFromHistory([], ["2026-01-14"])).toBe(0)
  })

  it("is order-independent", () => {
    const a = earnedFromHistory([on(2026, 1, 13), on(2026, 1, 14), on(2026, 1, 15)])
    const b = earnedFromHistory([on(2026, 1, 15), on(2026, 1, 13), on(2026, 1, 14)])
    expect(a).toBe(b)
  })

  it("respects the streak cap", () => {
    const days = Array.from({ length: 30 }, (_, i) => on(2026, 1, i + 1))
    const capped = days.slice(POINTS_STREAK_CAP).every((_, i) =>
      computePoints(25, POINTS_STREAK_CAP + i + 1) === computePoints(25, POINTS_STREAK_CAP))
    expect(capped).toBe(true)
    expect(earnedFromHistory(days)).toBeGreaterThan(0)
  })

  it("survives a month boundary", () => {
    expect(earnedFromHistory([on(2026, 1, 31), on(2026, 2, 1)]))
      .toBe(computePoints(25, 1) + computePoints(25, 2))
  })

  it("scales with session length", () => {
    expect(earnedFromHistory([on(2026, 1, 15, 50)])).toBe(computePoints(50, 1))
  })

  it("only ever grows as sessions are added", () => {
    const days = [on(2026, 1, 13), on(2026, 1, 14), on(2026, 1, 15)]
    let prev = 0
    for (let i = 1; i <= days.length; i++) {
      const total = earnedFromHistory(days.slice(0, i))
      expect(total).toBeGreaterThan(prev)
      prev = total
    }
  })
})

describe("levelFromPoints", () => {
  it("starts at level 1", () => {
    expect(levelFromPoints(0)).toEqual({ level: 1, into: 0, span: 100 })
  })

  it("levels up exactly at the threshold", () => {
    expect(levelFromPoints(99).level).toBe(1)
    expect(levelFromPoints(100).level).toBe(2)
  })

  it("keeps progress inside the current span", () => {
    const { into, span } = levelFromPoints(150)
    expect(into).toBeGreaterThanOrEqual(0)
    expect(into).toBeLessThan(span)
  })

  it("is monotonic and never leaves progress out of range", () => {
    let prev = 1
    for (let p = 0; p < 5000; p += 37) {
      const { level, into, span } = levelFromPoints(p)
      expect(level).toBeGreaterThanOrEqual(prev)
      expect(into).toBeGreaterThanOrEqual(0)
      expect(into).toBeLessThan(span)
      prev = level
    }
  })
})

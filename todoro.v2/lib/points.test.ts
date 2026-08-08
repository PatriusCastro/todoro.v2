import { describe, expect, it } from "vitest"
import { computePoints, levelFromPoints, POINTS_STREAK_CAP } from "./points"

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

import { describe, expect, it } from "vitest"
import { isReservedId, QUICK_MODE_ID, uid } from "./id"

describe("uid", () => {
  it("produces distinct ids", () => {
    const seen = new Set(Array.from({ length: 5000 }, () => uid()))
    expect(seen.size).toBe(5000)
  })

  it("never collides with the reserved id", () => {
    for (let i = 0; i < 1000; i++) expect(isReservedId(uid())).toBe(false)
  })

  it("is a non-empty string with no separators that would break a natural key", () => {
    const id = uid()
    expect(id.length).toBeGreaterThan(8)
    // Session keys are `${at}:${taskId}`, so a colon in an id would make the
    // key ambiguous.
    expect(id).not.toContain(":")
  })
})

describe("isReservedId", () => {
  it("recognises the quick-mode sentinel", () => {
    expect(isReservedId(QUICK_MODE_ID)).toBe(true)
  })

  it("leaves ordinary ids alone, including legacy Math.random ones", () => {
    expect(isReservedId("1")).toBe(false)
    expect(isReservedId("k3j2h1g0f")).toBe(false)
    expect(isReservedId("")).toBe(false)
  })
})

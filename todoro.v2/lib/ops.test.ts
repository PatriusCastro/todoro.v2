import { describe, expect, it } from "vitest"
import {
  freezesFrom, mergeOps, migrateLegacy, protectedFrom, purchaseFreeze, spendFreeze, spentFrom,
} from "./ops"

describe("purchaseFreeze", () => {
  it("only ever costs", () => {
    const op = purchaseFreeze(250, 1)
    expect(op.pointsDelta).toBe(-250)
    expect(op.freezeDelta).toBe(1)
  })

  it("costs even if handed a negative, so it can't be turned into a credit", () => {
    expect(purchaseFreeze(-250, 1).pointsDelta).toBe(-250)
  })

  it("mints a fresh id each time, so a retry is idempotent but two buys are not one", () => {
    expect(purchaseFreeze(250, 1).id).not.toBe(purchaseFreeze(250, 1).id)
  })
})

describe("spendFreeze", () => {
  it("returns a freeze and the days it bridges", () => {
    const op = spendFreeze(["2026-01-14"], 1)
    expect(op.freezeDelta).toBe(-1)
    expect(op.pointsDelta).toBe(0)
    expect(op.protectedAdd).toEqual(["2026-01-14"])
  })
})

describe("spentFrom", () => {
  it("is 0 for an empty ledger", () => {
    expect(spentFrom([])).toBe(0)
  })

  it("totals purchases", () => {
    expect(spentFrom([purchaseFreeze(250, 1), purchaseFreeze(250, 2)])).toBe(500)
  })

  it("ignores a spend op, which costs no points", () => {
    expect(spentFrom([spendFreeze(["2026-01-14"], 1)])).toBe(0)
  })

  it("never counts a positive delta as a refund", () => {
    // Defence in depth against a hand-edited local ledger; the server rejects
    // these outright.
    expect(spentFrom([{ id: "x", pointsDelta: 9999, freezeDelta: 0, protectedAdd: [], at: 1 }]))
      .toBe(0)
  })
})

describe("freezesFrom", () => {
  it("nets purchases against uses", () => {
    expect(freezesFrom([purchaseFreeze(250, 1), purchaseFreeze(250, 2), spendFreeze([], 3)]))
      .toBe(1)
  })

  it("clamps at zero rather than showing a negative balance", () => {
    // Two devices can each spend the last freeze offline.
    expect(freezesFrom([spendFreeze([], 1), spendFreeze([], 2)])).toBe(0)
  })

  it("carries forward freezes bought before the ledger existed", () => {
    expect(freezesFrom([], 2)).toBe(2)
    expect(freezesFrom([spendFreeze([], 1)], 2)).toBe(1)
  })
})

describe("protectedFrom", () => {
  it("unions the days from every spend", () => {
    expect(protectedFrom([spendFreeze(["2026-01-14"], 1), spendFreeze(["2026-01-20"], 2)]).sort())
      .toEqual(["2026-01-14", "2026-01-20"])
  })

  it("keeps days recorded before the ledger existed", () => {
    expect(protectedFrom([], ["2025-12-01"])).toEqual(["2025-12-01"])
  })

  it("does not double a day claimed twice", () => {
    expect(protectedFrom([spendFreeze(["2026-01-14"], 1)], ["2026-01-14"]))
      .toEqual(["2026-01-14"])
  })
})

describe("migrateLegacy", () => {
  it("is empty when there was nothing to carry over", () => {
    expect(migrateLegacy(0, [], 250, 1)).toEqual([])
  })

  it("restores freezes that were already held", () => {
    const ops = migrateLegacy(2, [], 250, 1)
    expect(freezesFrom(ops)).toBe(2)
    expect(spentFrom(ops)).toBe(500)
  })

  it("restores protected dates as a freeze bought and spent", () => {
    // Faithful: the user did buy a freeze to get those days.
    const ops = migrateLegacy(0, ["2026-01-14"], 250, 1)
    expect(freezesFrom(ops)).toBe(0)
    expect(protectedFrom(ops)).toEqual(["2026-01-14"])
    expect(spentFrom(ops)).toBe(250)
  })

  it("carries both at once without losing either", () => {
    const ops = migrateLegacy(2, ["2026-01-14", "2026-01-15"], 250, 1)
    expect(freezesFrom(ops)).toBe(2)
    expect(protectedFrom(ops).sort()).toEqual(["2026-01-14", "2026-01-15"])
    expect(spentFrom(ops)).toBe(750)
  })

  it("ignores a hand-edited negative or fractional count", () => {
    expect(freezesFrom(migrateLegacy(-5, [], 250, 1))).toBe(0)
    expect(freezesFrom(migrateLegacy(2.9, [], 250, 1))).toBe(2)
  })

  it("produces ops that satisfy the server's constraints", () => {
    // 0002 enforces: never a credit, freeze_delta within +/-1, a grant must be
    // paid for, and protected dates only ride a spend.
    for (const op of migrateLegacy(3, ["2026-01-14"], 250, 1)) {
      expect(op.pointsDelta).toBeLessThanOrEqual(0)
      expect(Math.abs(op.freezeDelta)).toBeLessThanOrEqual(1)
      if (op.freezeDelta === 1) expect(op.pointsDelta).toBeLessThan(0)
      if (op.protectedAdd.length > 0) expect(op.freezeDelta).toBe(-1)
    }
  })
})

describe("mergeOps", () => {
  it("keeps a spend made on each device", () => {
    // The case a last-write-wins total would lose.
    const a = purchaseFreeze(250, 1)
    const b = purchaseFreeze(250, 2)
    expect(spentFrom(mergeOps([a], [b]))).toBe(500)
  })

  it("does not double an op that arrives twice", () => {
    const a = purchaseFreeze(250, 1)
    expect(mergeOps([a], [a])).toHaveLength(1)
    expect(spentFrom(mergeOps([a], [a]))).toBe(250)
  })

  it("orders by time", () => {
    const a = purchaseFreeze(250, 5)
    const b = purchaseFreeze(250, 1)
    expect(mergeOps([a], [b]).map(o => o.at)).toEqual([1, 5])
  })

  it("settles — merging its own output changes nothing", () => {
    const merged = mergeOps([purchaseFreeze(250, 1)], [purchaseFreeze(250, 2)])
    expect(mergeOps(merged, merged)).toHaveLength(2)
  })
})

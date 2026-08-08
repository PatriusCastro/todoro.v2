import { uid } from "./id"

/**
 * The spend ledger, mirroring the `point_ops` table.
 *
 * Append-only and id'd, for two reasons. Idempotence: at-least-once delivery
 * plus a counter double-counts, so a push whose response was lost would
 * otherwise grant phantom freezes on retry — the id is minted here and reused,
 * and the server does `on conflict do nothing`. And convergence: two devices
 * that each spent offline both keep their entry, where a last-write-wins total
 * would throw one away.
 *
 * Nothing here can credit points. Migration 0002 enforces that server-side
 * (`points_delta <= 0`), and earnings come solely from the session log.
 */
export interface PointOp {
  id: string
  /** Never positive. A purchase costs; nothing here grants. */
  pointsDelta: number
  /** +1 buying a Streak Freeze, -1 spending one, 0 for a plain spend. */
  freezeDelta: number
  /** Days a spent freeze bridges. Only ever arrives with freezeDelta -1. */
  protectedAdd: string[]
  at: number
}

export function purchaseFreeze(cost: number, at: number = Date.now()): PointOp {
  return { id: uid(), pointsDelta: -Math.abs(cost), freezeDelta: 1, protectedAdd: [], at }
}

export function spendFreeze(days: string[], at: number = Date.now()): PointOp {
  return { id: uid(), pointsDelta: 0, freezeDelta: -1, protectedAdd: [...days], at }
}

/** Total spent. Positive number, so it reads as a cost at the call site. */
export const spentFrom = (ops: PointOp[]) =>
  ops.reduce((n, o) => n + Math.max(0, -o.pointsDelta), 0)

/**
 * Freezes held. Clamped: two devices can each spend the last one offline, and a
 * negative balance shown to the user is worse than one free freeze.
 */
export const freezesFrom = (ops: PointOp[], baseline = 0) =>
  Math.max(0, baseline + ops.reduce((n, o) => n + o.freezeDelta, 0))

/** Days bridged by spent freezes, unioned with any recorded before the ledger. */
export function protectedFrom(ops: PointOp[], baseline: string[] = []): string[] {
  const out = new Set(baseline)
  for (const o of ops) for (const d of o.protectedAdd) out.add(d)
  return [...out]
}

/** Union by id — the same op arriving twice is the same op. */
export function mergeOps(local: PointOp[], remote: PointOp[]): PointOp[] {
  const byId = new Map<string, PointOp>()
  for (const o of [...remote, ...local]) byId.set(o.id, o)
  return [...byId.values()].sort((a, b) => a.at - b.at)
}

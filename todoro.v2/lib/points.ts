/** Points for one Streak Freeze — ~1.5 days of focus, a generous safety net. */
export const FREEZE_COST = 250

/** Streak length at which the points bonus stops growing. */
export const POINTS_STREAK_CAP = 14

/** 1 point per focused minute, plus a streak bonus scaling to +70% at the cap. */
export function computePoints(focusMins: number, streak: number): number {
  const base = Math.max(1, Math.round(focusMins))
  const mult = 1 + Math.min(streak, POINTS_STREAK_CAP) * 0.05
  return Math.round(base * mult)
}

/** Level from total points — each level costs a little more than the last. */
export function levelFromPoints(points: number): { level: number; into: number; span: number } {
  let level = 1
  while (50 * level * (level + 1) <= points) level++
  const base = 50 * (level - 1) * level
  const next = 50 * level * (level + 1)
  return { level, into: points - base, span: next - base }
}

import { classOf } from "./keys"

/**
 * A one-bit "something synced changed" signal.
 *
 * The engine re-reads localStorage at flush time rather than being handed
 * values, so it only needs to know *that* something changed, not what. That is
 * the local-first property doing the work: no write queue, no serialized
 * payloads waiting around to go stale, and an offline failure costs nothing
 * because the data is still sitting in localStorage where it always was.
 */

let pending = false
const listeners = new Set<() => void>()

/** Called from save() and from usePinnedTasks. Ignores device-local keys. */
export function markDirty(key: string) {
  const kind = classOf(key)
  if (kind === null || kind === "device" || kind === "legacy") return
  pending = true
  // Signed out nobody is subscribed, so this is a Set write and nothing else.
  listeners.forEach(l => l())
}

export const isDirty = () => pending

export function clearDirty() {
  pending = false
}

export function subscribeDirty(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

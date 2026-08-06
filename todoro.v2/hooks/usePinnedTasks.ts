import { useCallback, useSyncExternalStore } from "react"

const KEY = "todoro:pinned"

// Module-level store so every consumer (Tasks page, Project page, Home, Timer)
// reads and writes the *same* pinned set. A per-component useState would let
// two mounted lists drift apart until the next remount.
const EMPTY: ReadonlySet<string> = new Set()

let snapshot: ReadonlySet<string> = EMPTY
let loaded = false
const listeners = new Set<() => void>()

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function commit(next: Set<string>) {
  snapshot = next
  try { localStorage.setItem(KEY, JSON.stringify([...next])) } catch {}
  listeners.forEach(l => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Keep other tabs / windows of the PWA in sync
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return
    snapshot = read()
    listeners.forEach(l => l())
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

function getSnapshot(): ReadonlySet<string> {
  if (!loaded) { loaded = true; snapshot = read() }
  return snapshot
}

function getServerSnapshot(): ReadonlySet<string> { return EMPTY }

export function usePinnedTasks() {
  const pinned = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const togglePin = useCallback((id: string) => {
    const next = new Set(getSnapshot())
    if (next.has(id)) next.delete(id); else next.add(id)
    commit(next)
  }, [])

  const unpin = useCallback((id: string) => {
    const cur = getSnapshot()
    if (!cur.has(id)) return
    const next = new Set(cur)
    next.delete(id)
    commit(next)
  }, [])

  // Drop pins for tasks that were deleted or completed, so the set never grows
  // stale ids that quietly outrank real work.
  const prunePins = useCallback((keepIds: Set<string>) => {
    const cur = getSnapshot()
    if (cur.size === 0) return
    const next = new Set([...cur].filter(id => keepIds.has(id)))
    if (next.size === cur.size) return
    commit(next)
  }, [])

  return { pinned, togglePin, unpin, prunePins }
}

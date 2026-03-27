import { useState, useCallback } from "react"

const KEY = "todoro:pinned"

function loadPinned(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function savePinned(set: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]))
  } catch {}
}

export function usePinnedTasks() {
  const [pinned, setPinned] = useState<Set<string>>(loadPinned)

  const togglePin = useCallback((id: string) => {
    setPinned(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      savePinned(next)
      return next
    })
  }, [])

  return { pinned, togglePin }
}
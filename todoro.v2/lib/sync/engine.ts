"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getSupabase } from "./client"
import { clearDirty, isDirty, subscribeDirty } from "./dirty"
import { pushAll } from "./push"
import { readLocalState } from "./snapshot"

export type SyncState = "off" | "idle" | "syncing" | "synced" | "error"

/** Owned by app/page.tsx and passed down — see the note on useSyncPush. */
export type SyncApi = ReturnType<typeof useSyncPush>

const DEBOUNCE_MS = 2000

/**
 * Push-only sync. Local -> cloud, never the reverse.
 *
 * Nothing in this file writes to localStorage, which is what makes this phase
 * incapable of losing data: the worst outcome is that the server lags, and the
 * next flush catches it up. Pull, merge and the conflict machinery arrive
 * separately, and land on their own so a bug there is attributable.
 *
 * Signed out this hook subscribes to nothing, registers no listeners and never
 * touches the network.
 *
 * MUST be mounted at the app root, not inside a tab. It first lived in
 * SettingsPage, which only renders while that tab is open — so editing a task
 * notified no subscriber, and the pagehide/visibilitychange flushes did not
 * exist during ordinary use. Nothing synced until you happened to open
 * Settings.
 */
export function useSyncPush(signedIn: boolean) {
  const [state, setState] = useState<SyncState>("off")
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Guards against two flushes overlapping — a slow request plus a fast edit
  // would otherwise interleave upserts for the same rows.
  const inFlight = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    if (!signedIn || inFlight.current) return
    inFlight.current = true
    setState("syncing")
    try {
      const sb = await getSupabase()
      if (!sb) { setState("off"); return }
      const { data } = await sb.auth.getSession()
      if (!data.session) { setState("off"); return }

      // Cleared before the push, not after: an edit made mid-flight must leave
      // the flag set so the next debounce picks it up, rather than being
      // swallowed by a clear that lands after it.
      clearDirty()

      const result = await pushAll(sb, readLocalState())
      if (result.errors.length > 0) {
        setState("error")
        setError(result.errors[0])
      } else {
        setState("synced")
        setError(null)
        setLastSyncedAt(Date.now())
      }
    } catch (e) {
      setState("error")
      setError(e instanceof Error ? e.message : "Sync failed")
    } finally {
      inFlight.current = false
    }
  }, [signedIn])

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, DEBOUNCE_MS)
  }, [flush])

  // First full upload on sign-in.
  useEffect(() => {
    if (!signedIn) { setState("off"); return }
    void flush()
  }, [signedIn, flush])

  // Debounced flush on any change to a synced key.
  useEffect(() => {
    if (!signedIn) return
    return subscribeDirty(schedule)
  }, [signedIn, schedule])

  // A phone that gets backgrounded mid-debounce would otherwise sit on the
  // change until it next comes back. Losing this flush is survivable — the data
  // is still in localStorage — but it makes the common case much tighter.
  useEffect(() => {
    if (!signedIn) return
    const onHide = () => { if (isDirty()) void flush() }
    window.addEventListener("pagehide", onHide)
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("online", onHide)
    return () => {
      window.removeEventListener("pagehide", onHide)
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("online", onHide)
    }
  }, [signedIn, flush])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return { state, lastSyncedAt, error, syncNow: flush }
}

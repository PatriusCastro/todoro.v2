"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { downloadBackup, exportPayload } from "../backup"
import { getSupabase } from "./client"
import { clearDirty, isDirty, subscribeDirty } from "./dirty"
import { decideFirstLink, summarize, type SideSummary } from "./migrate"
import { mergeHistory } from "./merge"
import { pullSince, type RemoteChanges } from "./pull"
import {
  pushAll, pushProjects, pushSessions, pushSettings, pushTasks, pushTombstones,
} from "./push"
import { reconcile, shadowFromLocal, type SyncPatch } from "./reconcile"
import { readLocalState, type SyncedState } from "./snapshot"
import { metaForAccount, saveMeta, type SyncMeta } from "./state"

export type SyncState = "off" | "idle" | "syncing" | "synced" | "error"
export type SyncApi = ReturnType<typeof useSync>

export interface LinkChoice {
  local:  SideSummary
  remote: SideSummary
}

const DEBOUNCE_MS = 2000

const liveRows = <T,>(rows: { row: T; deletedAt: string | null }[]) =>
  rows.filter(r => !r.deletedAt).map(r => r.row)

/**
 * The sync engine.
 *
 * MUST be mounted at the app root, not inside a tab. It first lived in
 * SettingsPage, which only renders while that tab is open — so editing a task
 * notified no subscriber, and nothing synced until you happened to open
 * Settings.
 *
 * Signed out it subscribes to nothing, registers no listeners and never touches
 * the network.
 */
export function useSync(signedIn: boolean) {
  const [state, setState] = useState<SyncState>("off")
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [patch, setPatch] = useState<{ id: number; data: SyncPatch } | null>(null)
  const [linkChoice, setLinkChoice] = useState<LinkChoice | null>(null)

  const inFlight = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const patchId = useRef(0)
  /** Held between asking the question and the user answering it. */
  const pendingLink = useRef<{ remote: RemoteChanges; meta: SyncMeta } | null>(null)

  const emit = useCallback((data: SyncPatch) => {
    if (Object.keys(data).length === 0) return
    patchId.current += 1
    setPatch({ id: patchId.current, data })
  }, [])

  const ackPatch = useCallback((id: number) => {
    setPatch(p => (p && p.id === id ? null : p))
  }, [])

  /** Applies whichever side won the first-link question. */
  const finishLink = useCallback(async (
    choice: "local" | "remote", remote: RemoteChanges, meta: SyncMeta,
  ) => {
    const sb = await getSupabase()
    if (!sb) return
    const local = readLocalState()

    // History and its derived streak are kept from both sides either way —
    // sessions are immutable timestamped facts that cannot conflict, and losing
    // a streak is the most expensive loss in the app.
    const history = mergeHistory(local.history, remote.history)

    if (choice === "remote") {
      // Local work is about to be replaced, so put it in a real file first.
      // That is the difference between "lost" and "recoverable".
      try { downloadBackup(exportPayload(), "todoro-backup-before-sync.json") } catch {}

      const tasks = liveRows(remote.tasks)
      const projects = liveRows(remote.projects)
      const applied: SyncedState = {
        tasks, projects, history,
        settings: remote.settings ?? local.settings,
        pinned: remote.pinned ?? [],
        assets: {
          avatar: remote.assets.avatar ?? local.assets.avatar,
          alert_sound: remote.assets.alert_sound ?? local.assets.alert_sound,
        },
      }
      emit({
        tasks, projects, history,
        settings: applied.settings, pinned: applied.pinned, assets: applied.assets,
      })
      // Sessions this device knew about and the account did not still belong in
      // the account, whichever side won.
      await pushSessions(sb, history)
      saveMeta({ ...meta, everPulled: true, pulledAt: remote.pulledAt, shadow: shadowFromLocal(applied) })
      return
    }

    // choice === "local": this device replaces the account.
    const localIds = new Set(local.tasks.map(t => t.id))
    const localProjectIds = new Set(local.projects.map(p => p.id))
    const staleTasks = liveRows(remote.tasks).map(t => t.id).filter(id => !localIds.has(id))
    const staleProjects = liveRows(remote.projects).map(p => p.id).filter(id => !localProjectIds.has(id))

    await pushAll(sb, { ...local, history })
    // Soft deletes, so the account's previous rows remain in the database and
    // are recoverable rather than destroyed.
    await pushTombstones(sb, "tasks", staleTasks)
    await pushTombstones(sb, "projects", staleProjects)

    emit({ history })
    saveMeta({
      ...meta, everPulled: true, pulledAt: remote.pulledAt,
      shadow: shadowFromLocal({ ...local, history }),
    })
  }, [emit])

  const resolveLink = useCallback(async (choice: "local" | "remote") => {
    const pending = pendingLink.current
    setLinkChoice(null)
    if (!pending) return
    pendingLink.current = null
    setState("syncing")
    try {
      await finishLink(choice, pending.remote, pending.meta)
      setState("synced")
      setLastSyncedAt(Date.now())
    } catch (e) {
      setState("error")
      setError(e instanceof Error ? e.message : "Sync failed")
    }
  }, [finishLink])

  const run = useCallback(async () => {
    if (!signedIn || inFlight.current) return
    // A question is on screen; syncing behind it would apply changes the user
    // is still deciding about.
    if (pendingLink.current) return

    inFlight.current = true
    setState("syncing")
    try {
      const sb = await getSupabase()
      if (!sb) { setState("off"); return }
      const { data } = await sb.auth.getSession()
      const uid = data.session?.user.id
      if (!uid) { setState("off"); return }

      const meta = metaForAccount(uid)

      // Cleared before the work, not after: an edit made mid-flight must leave
      // the flag set so the next debounce picks it up.
      clearDirty()

      if (!meta.everPulled) {
        const remote = await pullSince(sb, null)
        const local = readLocalState()
        const decision = decideFirstLink({
          tasks: local.tasks,
          history: local.history,
          projects: local.projects,
          remoteTaskCount: liveRows(remote.tasks).length,
        })

        if (decision === "ask") {
          pendingLink.current = { remote, meta }
          setLinkChoice({
            local:  summarize(local.tasks, local.history),
            remote: summarize(liveRows(remote.tasks), remote.history),
          })
          setState("idle")
          return
        }

        await finishLink(decision === "adopt-local" ? "local" : "remote", remote, meta)
        setState("synced")
        setLastSyncedAt(Date.now())
        return
      }

      // Steady state.
      const remote = await pullSince(sb, meta.pulledAt)
      const local = readLocalState()
      const result = reconcile(local, meta, remote)

      emit(result.patch)

      const errors: string[] = []
      if (result.push.tasks.length)    errors.push(...(await pushTasks(sb, result.push.tasks)).errors)
      if (result.push.projects.length) errors.push(...(await pushProjects(sb, result.push.projects)).errors)
      if (result.push.history.length)  errors.push(...(await pushSessions(sb, result.push.history)).errors)
      if (Object.keys(result.push.settings).length || result.push.pinned) {
        errors.push(...(await pushSettings(sb, result.push.settings, result.push.pinned ?? local.pinned)).errors)
      }
      if (result.tombstones.tasks.length)    errors.push(...(await pushTombstones(sb, "tasks", result.tombstones.tasks)).errors)
      if (result.tombstones.projects.length) errors.push(...(await pushTombstones(sb, "projects", result.tombstones.projects)).errors)

      // The shadow is only advanced when everything landed. Recording a push
      // that failed would make the next diff believe the server already has it.
      if (errors.length === 0) {
        saveMeta(result.meta)
        setState("synced")
        setError(null)
        setLastSyncedAt(Date.now())
      } else {
        setState("error")
        setError(errors[0])
      }
    } catch (e) {
      setState("error")
      setError(e instanceof Error ? e.message : "Sync failed")
    } finally {
      inFlight.current = false
    }
  }, [signedIn, emit, finishLink])

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void run() }, DEBOUNCE_MS)
  }, [run])

  useEffect(() => {
    if (!signedIn) { setState("off"); setLinkChoice(null); pendingLink.current = null; return }
    void run()
  }, [signedIn, run])

  useEffect(() => {
    if (!signedIn) return
    return subscribeDirty(schedule)
  }, [signedIn, schedule])

  useEffect(() => {
    if (!signedIn) return
    const onWake = () => { if (isDirty() || document.visibilityState === "visible") void run() }
    const onHide = () => { if (isDirty()) void run() }
    window.addEventListener("pagehide", onHide)
    document.addEventListener("visibilitychange", onWake)
    window.addEventListener("online", onWake)
    return () => {
      window.removeEventListener("pagehide", onHide)
      document.removeEventListener("visibilitychange", onWake)
      window.removeEventListener("online", onWake)
    }
  }, [signedIn, run])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return { state, lastSyncedAt, error, syncNow: run, patch, ackPatch, linkChoice, resolveLink }
}

"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import AppShell     from "../components/AppShell"
import HomePage     from "../components/HomePage"
import TimerPage    from "../components/TimerPage"
import TasksPage    from "../components/TasksPage"
import SettingsPage from "../components/SettingsPage"
import Onboarding   from "../components/Onboarding"
import NotifPrompt  from "../components/NotifPrompt"
import ShopModal    from "../components/ShopModal"
import Toast        from "../components/shared/Toast"
import { type Mode } from "../components/timer/SessionSheet"
import { type Task } from "../components/tasks/TaskCard"
import TaskModal, { type Project } from "../components/tasks/TaskModal"
import { usePinnedTasks } from "../hooks/usePinnedTasks"
import { pickNextTask, sortTasks } from "../lib/taskOrder"
import { localDate } from "../lib/date"
import { uid, QUICK_MODE_ID } from "../lib/id"
import { computeStreak, findStreakRestore } from "../lib/streak"
import { computePoints, earnedFromHistory, levelFromPoints, FREEZE_COST } from "../lib/points"
import {
  freezesFrom, migrateLegacy, protectedFrom, purchaseFreeze, spendFreeze, spentFrom, type PointOp,
} from "../lib/ops"
import { nextOccurrence } from "../lib/recurrence"
import { type SessionRecord } from "../lib/types"
import { markDirty } from "../lib/sync/dirty"
import { useAuth } from "../lib/sync/auth"
import { useSync } from "../lib/sync/engine"
import { hydratePins } from "../hooks/usePinnedTasks"
import SyncChoice from "../components/SyncChoice"
import { applyAccentSet, buildAccentSet, type AccentSet } from "../lib/accent"
import { playAlert, type AlertSound } from "../lib/sound"
import { useWakeLock } from "../hooks/useWakeLock"
import { useDocumentTitle } from "../hooks/useDocumentTitle"
import { useNotifications } from "../hooks/useNotifications"

type Tab   = "home" | "tasks" | "timer" | "settings"
type Phase = "focus" | "break" | "longbreak"
type Theme = "system" | "light" | "dark"

// Lives in lib/types now so lib/streak can use it without importing this file.
// Re-exported because several components import it from here.
export type { SessionRecord }

const LONG_BREAK_INTERVAL = 4
const LONG_BREAK_MINS     = 15

const INITIAL_TASKS: Task[] = [
  {
    id: "1", title: "Try your first focus session", priority: "high",
    dueDate: new Date().toISOString().slice(0, 10), dueTime: "", dueLabel: "Due today",
    done: false, estimatedSessions: 2, completedSessions: 0,
    subtasks: [
      { id: uid(), title: "Pick a task to work on",     done: false },
      { id: uid(), title: "Hit Start and stay focused",  done: false },
    ],
  },
  {
    id: "2", title: "Explore the Timer page", priority: "mid",
    dueDate: "", dueTime: "", dueLabel: "No due date",
    done: false, estimatedSessions: 1, completedSessions: 0,
    subtasks: [{ id: uid(), title: "Try Focus view mode", done: false }],
  },
  {
    id: "3", title: "Customize your settings", priority: "low",
    dueDate: "", dueTime: "", dueLabel: "No due date",
    done: false, estimatedSessions: 0, completedSessions: 0,
    subtasks: [],
  },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

function createQuickModeTask(): Task {
  return {
    id: QUICK_MODE_ID, title: "", priority: "none", dueDate: "", dueTime: "", dueLabel: "",
    done: false, estimatedSessions: 0, completedSessions: 0, subtasks: [],
  }
}

const todayKey = () => localDate()

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

/**
 * Returns false when the write was dropped — almost always a quota error, since
 * an avatar and a custom alert sound are both data-URLs sharing the ~5MB origin
 * budget with an ever-growing history. This used to swallow the failure whole,
 * so the UI would happily show state that had never been persisted and was gone
 * on the next reload. Callers holding irreplaceable data check the result.
 */
function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    // The whole sync integration into this file: a signal that something
    // changed. Signed out it sets a boolean nobody reads. The engine re-reads
    // localStorage itself rather than being handed the value.
    markDirty(key)
    return true
  } catch {
    return false
  }
}

// Tri-state theme with one-time migration from the old boolean `todoro:dark`.
function loadTheme(): Theme {
  try {
    // save() writes through JSON.stringify, so this arrives quoted ("dark").
    // Both readers used to compare it raw, so an explicit Light/Dark choice
    // never matched and silently fell back to "system" on every reload.
    // Unquoted values are still accepted in case anything wrote one directly.
    const raw = localStorage.getItem("todoro:theme")
    const t   = raw && raw.charAt(0) === '"' ? JSON.parse(raw) : raw
    if (t === "system" || t === "light" || t === "dark") return t
    const old = localStorage.getItem("todoro:dark")
    if (old !== null) return JSON.parse(old) ? "dark" : "light"
  } catch {}
  return "system"
}

function systemPrefersDark(): boolean {
  try { return window.matchMedia("(prefers-color-scheme: dark)").matches } catch { return true }
}

// Subtle haptic tap (mobile) — no-op where unsupported
function buzz(ms: number) {
  try { navigator.vibrate?.(ms) } catch {}
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  // Both live here rather than in SettingsPage: that component only mounts
  // while its tab is open, so an engine inside it would miss every edit made
  // anywhere else in the app. Passed down as props so there is exactly one
  // auth subscription and one sync engine for the whole session.
  const auth = useAuth()
  const sync = useSync(auth.status === "signed-in")

  // Survives a reload: a refresh on Tasks used to land back on Today.
  const [tab,       setTab]       = useState<Tab>(() => {
    const t = load<Tab>("todoro:tab", "home")
    return ["home", "tasks", "timer", "settings"].includes(t) ? t : "home"
  })
  const [showAdd,   setShowAdd]   = useState(false)
  const [onboarded, setOnboarded] = useState(() => {
    if (load("todoro:onboarded", false)) return true
    // Returning users (name already saved) skip the welcome
    try { return localStorage.getItem("todoro:userName") !== null } catch { return true }
  })
  const [notifPrompt, setNotifPrompt] = useState(false)
  const [userName,  setUserName]  = useState(() => load("todoro:userName",  "Bossing"))
  const [theme,      setTheme]      = useState<Theme>(loadTheme)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const dark = theme === "system" ? systemDark : theme === "dark"
  const [sound,     setSound]     = useState(() => load("todoro:sound",     true))
  const [alertSound,  setAlertSound]  = useState<AlertSound>(() => load("todoro:alertSound", "chime"))
  const [alertVolume, setAlertVolume] = useState<number>(() => load("todoro:alertVolume", 0.9))
  const [alertCustom, setAlertCustom] = useState<string | null>(() => load("todoro:alertCustom", null))
  const [dailyGoal, setDailyGoal] = useState(() => load("todoro:dailyGoal", 5))
  const [avatarUrl, setAvatarUrl] = useState(() => load("todoro:avatarUrl", ""))
  const [quickMode, setQuickMode] = useState(() => load("todoro:quickMode", false))
  const [reverseMode, setReverseMode] = useState(() => load("todoro:reverseMode", false))
  const [notifications, setNotifications] = useState(() => load("todoro:notifications", false))
  const [autoStart,     setAutoStart]     = useState(() => load("todoro:autoStart", false))

  const [mode,      setMode]      = useState<Mode>(()   => load("todoro:mode",      "25/5"))
  const [focusMins, setFocusMins] = useState<number>(() => load("todoro:focusMins", 25))
  const [breakMins, setBreakMins] = useState<number>(() => load("todoro:breakMins", 5))

  const [accentTheme, setAccentTheme] = useState<string>(() => load("todoro:accentTheme", "blue"))
  const [accentCustom, setAccentCustom] = useState<AccentSet | null>(
    () => load<AccentSet | null>("todoro:accentCustom", null)
  )

  // Restore the timer where it was left off — always paused, so time spent with
  // the app closed is never counted as focus.
  const [phase,   setPhase]   = useState<Phase>(() => load<{ phase: Phase } | null>("todoro:timer", null)?.phase ?? "focus")
  // In reverse mode the initial time is 0 (counts up); normal mode starts at focusMins * 60
  const [time,    setTime]    = useState(() => {
    const saved = load<{ time: number } | null>("todoro:timer", null)
    return saved ? saved.time : (load("todoro:reverseMode", false) ? 0 : load("todoro:focusMins", 25) * 60)
  })
  const [running, setRunning] = useState(false)

  const [cycleCount,  setCycleCount]  = useState(0)
  // Points are derived from the session log, never stored. A stored total is a
  // number DevTools can set to anything; sessions are append-only and immutable
  // server-side, so the only way to move the balance is to do the work.
  // `todoro:spent` is the counterpart ledger and is capped at the earned total,
  // so editing it downward cannot mint points either.
  const [pointOps, setPointOps] = useState<PointOp[]>(() => {
    const existing = load<PointOp[] | null>("todoro:ops", null)
    if (existing) return existing
    // One-time reconstruction from the counters the ledger replaced, so
    // upgrading doesn't confiscate freezes already bought or drop days one had
    // already bridged. It runs only while `todoro:ops` is absent — after the
    // first save the legacy keys are never read again, which is the point:
    // treating them as a live baseline left `todoro:freezes` exactly as
    // editable as the counter it was meant to retire.
    return migrateLegacy(
      load("todoro:freezes", 0),
      load<string[]>("todoro:protectedDates", []),
      FREEZE_COST,
    )
  })
  // All three derived from the ledger, so none of them is a number DevTools can
  // simply set.
  const protectedDates = protectedFrom(pointOps)
  const streakFreezes  = freezesFrom(pointOps)
  const [showShop,    setShowShop]    = useState(false)
  // One toast channel for the whole app shell: session complete, focus started.
  const [toast, setToast] = useState<{ title: string; sub?: string } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashToast = useCallback((title: string, sub?: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ title, sub })
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  // For the collections that can't be reconstructed if a write is dropped.
  // Warns once per session: a full quota fails every subsequent write too, and
  // three stacked toasts say nothing the first one didn't.
  const storageWarned = useRef(false)
  const saveGuarded = useCallback((key: string, value: unknown) => {
    if (save(key, value) || storageWarned.current) return
    storageWarned.current = true
    flashToast("Couldn't save to this device", "Storage is full — export a backup from Settings")
  }, [flashToast])

  const [allHistory, setAllHistory] = useState<SessionRecord[]>(
    () => load("todoro:history", [])
  )

  const [focusedView, setFocusedView] = useState(false)

  const todayHistory = allHistory.filter(s => localDate(s.at) === todayKey())
  const sessions = todayHistory.length
  const streak   = computeStreak(allHistory, protectedDates)
  const restoreGap = findStreakRestore(allHistory, protectedDates)

  // Clamped both ways: never negative, and spending is capped at what was
  // earned, so a hand-edited `todoro:spent` can only ever cost the user points,
  // never create them.
  const pointsEarned = earnedFromHistory(allHistory, protectedDates)
  const totalPoints  = Math.max(0, pointsEarned - spentFrom(pointOps))
  const lvl = levelFromPoints(totalPoints)

  const [tasks,      setTasks]      = useState<Task[]>(() => load("todoro:tasks", INITIAL_TASKS))
  const [activeTask, setActiveTask] = useState<Task>(() => {
    const quickModeEnabled = load("todoro:quickMode", false)
    if (quickModeEnabled) return createQuickModeTask()
    const saved = load<Task[]>("todoro:tasks", INITIAL_TASKS)
    return saved.find(t => !t.done) ?? saved[0] ?? INITIAL_TASKS[0]
  })

  // ── Projects ──────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>(
    () => load("todoro:projects", [])
  )

  const handleSaveProject = useCallback((p: Project) => {
    setProjects(ps => ps.some(x => x.id === p.id) ? ps.map(x => x.id === p.id ? p : x) : [...ps, p])
  }, [])

  useEffect(() => { saveGuarded("todoro:projects", projects) }, [projects, saveGuarded])
  // ─────────────────────────────────────────────────────────────────


  const currentBreakMins = phase === "longbreak" ? LONG_BREAK_MINS : breakMins
  const maxTime  = phase === "focus" ? focusMins * 60 : currentBreakMins * 60

  // Progress: in reverse focus mode, use a rolling 25-min cycle for the ring/bar
  const REVERSE_CYCLE = 25 * 60
  const progress = reverseMode && phase === "focus"
    ? (time % REVERSE_CYCLE) / REVERSE_CYCLE
    : maxTime > 0 ? (maxTime - time) / maxTime : 0

  // ── Pinned tasks ──────────────────────────────────────────────────
  const { pinned, prunePins } = usePinnedTasks()

  // A pin only means something while the task is still open — drop pins for
  // deleted or completed tasks so they never outrank real work.
  useEffect(() => {
    prunePins(new Set(tasks.filter(t => !t.done).map(t => t.id)))
  }, [tasks, prunePins])

  // Pinning is a statement about what to do next, so a new pin takes over the
  // timer. Guarded on `running` so it can never hijack a session in progress,
  // and only newly-added pins count — otherwise picking a task by hand would be
  // undone on the next render.
  const prevPinned = useRef<ReadonlySet<string> | null>(null)
  useEffect(() => {
    const prev = prevPinned.current
    prevPinned.current = pinned
    if (quickMode || running) return
    const candidates = tasks.filter(t =>
      !t.done && pinned.has(t.id) && (prev ? !prev.has(t.id) : true))
    if (candidates.length === 0) return
    const top = sortTasks(candidates, undefined, pinned)[0]
    if (top && top.id !== activeTask.id) setActiveTask(top)
  }, [pinned, tasks, quickMode, running, activeTask.id])
  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const updated = tasks.find(t => t.id === activeTask.id)
    if (updated && !updated.done) setActiveTask(updated)
    else if (updated?.done) {
      const nextPending = pickNextTask(tasks, pinned, activeTask.id)
      if (nextPending) setActiveTask(nextPending)
    }
  }, [tasks])

  useEffect(() => {
    if (quickMode && activeTask.title !== "") {
      setActiveTask(createQuickModeTask())
    } else if (!quickMode && activeTask.id === "quick-mode") {
      const nextPending = pickNextTask(tasks, pinned)
      if (nextPending) setActiveTask(nextPending)
      else setActiveTask(tasks[0] ?? INITIAL_TASKS[0])
    }
  }, [quickMode, tasks])

  // When reverseMode changes, reset the timer — but skip the initial mount so a
  // restored session survives a reload.
  const reverseInit = useRef(true)
  useEffect(() => {
    if (reverseInit.current) { reverseInit.current = false; return }
    setRunning(false)
    setPhase("focus")
    setTime(reverseMode ? 0 : focusMins * 60)
  }, [reverseMode])

  // ── Applying a sync patch ────────────────────────────────────────────────
  // The engine never writes localStorage for synced keys. It hands React a
  // patch, React sets state, and the existing save() effects below are the
  // write path — so there is no dual write and no race between the two.
  const running_ = running
  useEffect(() => {
    if (!sync.patch) return
    const p = sync.patch.data

    if (p.tasks)    setTasks(p.tasks)
    if (p.projects) setProjects(p.projects)
    if (p.history)  setAllHistory(p.history)
    if (p.ops)      setPointOps(p.ops)
    if (p.pinned)   hydratePins(p.pinned)
    if (p.assets) {
      if (p.assets.avatar      !== undefined) setAvatarUrl(p.assets.avatar ?? "")
      if (p.assets.alert_sound !== undefined) setAlertCustom(p.assets.alert_sound)
    }

    if (p.settings) {
      const s = p.settings
      if (typeof s.user_name    === "string")  setUserName(s.user_name)
      if (typeof s.daily_goal   === "number")  setDailyGoal(s.daily_goal)
      if (typeof s.theme        === "string")  setTheme(s.theme as Theme)
      if (typeof s.accent_theme === "string")  setAccentTheme(s.accent_theme)
      if (s.accent_custom !== undefined)       setAccentCustom(s.accent_custom as AccentSet | null)
      if (typeof s.sound        === "boolean") setSound(s.sound)
      if (typeof s.alert_sound  === "string")  setAlertSound(s.alert_sound as AlertSound)
      if (typeof s.alert_volume === "number")  setAlertVolume(s.alert_volume)
      if (typeof s.auto_start   === "boolean") setAutoStart(s.auto_start)

      // These five reset the running timer through effects above, so applying a
      // remote change mid-session would wipe a focus run on this device. They
      // wait; the next sync after the session ends picks them up.
      if (!running_) {
        if (typeof s.mode         === "string")  setMode(s.mode as Mode)
        if (typeof s.focus_mins   === "number")  setFocusMins(s.focus_mins)
        if (typeof s.break_mins   === "number")  setBreakMins(s.break_mins)
        if (typeof s.quick_mode   === "boolean") setQuickMode(s.quick_mode)
        if (typeof s.reverse_mode === "boolean") setReverseMode(s.reverse_mode)
      }
    }

    sync.ackPatch(sync.patch.id)
  }, [sync, running_])

  useEffect(() => { save("todoro:userName",    userName)    }, [userName])
  useEffect(() => { save("todoro:theme",       theme)       }, [theme])
  useEffect(() => { save("todoro:sound",       sound)       }, [sound])
  useEffect(() => { save("todoro:alertSound",  alertSound)  }, [alertSound])
  useEffect(() => { save("todoro:alertVolume", alertVolume) }, [alertVolume])
  useEffect(() => { save("todoro:alertCustom", alertCustom) }, [alertCustom])
  useEffect(() => { save("todoro:dailyGoal",   dailyGoal)   }, [dailyGoal])
  useEffect(() => { save("todoro:avatarUrl",   avatarUrl)   }, [avatarUrl])
  useEffect(() => { save("todoro:quickMode",   quickMode)   }, [quickMode])
  useEffect(() => { save("todoro:reverseMode", reverseMode) }, [reverseMode])
  useEffect(() => { save("todoro:mode",        mode)        }, [mode])
  useEffect(() => { save("todoro:focusMins",   focusMins)   }, [focusMins])
  useEffect(() => { save("todoro:breakMins",   breakMins)   }, [breakMins])
  useEffect(() => { saveGuarded("todoro:tasks",   tasks)      }, [tasks, saveGuarded])
  useEffect(() => { save("todoro:ops",         pointOps)    }, [pointOps])
  useEffect(() => { saveGuarded("todoro:history", allHistory) }, [allHistory, saveGuarded])
  useEffect(() => { save("todoro:accentTheme", accentTheme) }, [accentTheme])
  useEffect(() => { save("todoro:accentCustom", accentCustom) }, [accentCustom])
  useEffect(() => { save("todoro:notifications", notifications) }, [notifications])
  useEffect(() => { save("todoro:autoStart",     autoStart)     }, [autoStart])
  useEffect(() => { save("todoro:onboarded",     onboarded)     }, [onboarded])
  useEffect(() => { save("todoro:tab",           tab)           }, [tab])

  // Snapshot the timer so a reload restores the remaining time (paused).
  // `time` ticks once a second, so writing on every change meant a JSON
  // serialize + localStorage write per second for the whole session. The
  // snapshot only has to be current when the page actually goes away, so it
  // writes on pause, on a phase change, and on the way out.
  const timerSnapshot = useRef({ phase, time })
  useEffect(() => { timerSnapshot.current = { phase, time } }, [phase, time])

  // The transitions worth recording: the phase changed, or the clock stopped.
  useEffect(() => { save("todoro:timer", timerSnapshot.current) }, [phase, running])

  // ...and whenever the page is about to go away mid-session, which is the
  // case the per-second write was really there to cover.
  useEffect(() => {
    const flush = () => save("todoro:timer", timerSnapshot.current)
    window.addEventListener("pagehide", flush)
    document.addEventListener("visibilitychange", flush)
    return () => {
      flush()
      window.removeEventListener("pagehide", flush)
      document.removeEventListener("visibilitychange", flush)
    }
  }, [])

  // After the first completed focus session, offer to enable notifications (once)
  useEffect(() => {
    if (cycleCount === 0 || notifications) return
    if (load("todoro:notifPrompted", false)) return
    if (typeof Notification === "undefined" || Notification.permission === "denied") return
    const id = setTimeout(() => setNotifPrompt(true), 1200)
    return () => clearTimeout(id)
  }, [cycleCount, notifications])

  useWakeLock(running)
  useDocumentTitle(time, phase, running)

  useEffect(() => {
    const html = document.documentElement
    // A custom accent is applied as inline vars (both themes precomputed at save
    // time); the presets are a data-theme attribute. Only ever one at a time.
    if (accentTheme === "custom" && accentCustom) {
      html.removeAttribute("data-theme")
      applyAccentSet(accentCustom, dark)
      return
    }
    applyAccentSet(null, dark)
    if (accentTheme === "blue") html.removeAttribute("data-theme")
    else html.setAttribute("data-theme", accentTheme)
  }, [accentTheme, accentCustom, dark])

  // Track the OS color-scheme so "system" stays live as the user flips it
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => setSystemDark(mq.matches)
    onChange()
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  // Apply the resolved theme on <html> so portals, scrim and chrome inherit it
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  const { notify } = useNotifications(notifications)

  const playChime = useCallback((isFocus: boolean) => {
    if (!sound) return
    playAlert({ sound: alertSound, custom: alertCustom, volume: alertVolume, rising: isFocus })
  }, [sound, alertSound, alertCustom, alertVolume])

  const advancePhase = useCallback((completed: boolean) => {
    setRunning(false)
    if (phase === "focus") {
      if (completed) {
        const nextCycle = cycleCount + 1
        setCycleCount(nextCycle)
        setAllHistory(h => {
          const next = [...h, { taskId: activeTask.id, taskTitle: activeTask.title, focusMins, at: Date.now() }]
          const newStreak = computeStreak(next, protectedDates)
          // Appending the session *is* the award — the balance is derived from
          // the log, so there is no separate number to increment. This also
          // fixes a pre-existing under-award: the points used to be granted
          // inside a 300ms timeout, and closing the tab in that window lost
          // them while the session record had already been committed.
          const earned = computePoints(focusMins, newStreak)
          setTimeout(() => {
            flashToast("Session complete", `+${earned} pts · ${newStreak} day streak`)
          }, 300)
          return next
        })
        setTasks(ts => ts.map(t => t.id === activeTask.id
          ? { ...t, completedSessions: t.completedSessions + 1 }
          : t))
        playChime(false)
        buzz(20)
        const isLong = nextCycle % LONG_BREAK_INTERVAL === 0
        notify("Focus complete", isLong
          ? "Great work — time for a long break."
          : "Nice session — take a short break.")
        setPhase(isLong ? "longbreak" : "break")
        setTime(isLong ? LONG_BREAK_MINS * 60 : breakMins * 60)
      } else {
        // Skipped focus: the break is earned, not granted. Scale it to the time
        // actually focused (the same 1:5 ratio as Stop & Rest), floored at a
        // minute and never longer than a full break.
        const focusedSecs = reverseModeRef.current
          ? timeRef.current
          : Math.max(0, focusMins * 60 - timeRef.current)
        setPhase("break")
        setTime(Math.min(breakMins * 60, Math.max(60, Math.round(focusedSecs / 5))))
      }
    } else {
      if (completed) {
        playChime(true)
        notify("Break's over", "Ready to focus? Let's get back to it.")
      }
      setPhase("focus")
      setTime(reverseMode ? 0 : focusMins * 60)
    }
    // Auto-start the next phase after a natural completion when enabled
    if (completed && autoStartRef.current) setRunning(true)
  }, [phase, cycleCount, focusMins, breakMins, activeTask, playChime, reverseMode, protectedDates])

  const advanceRef  = useRef(advancePhase)
  const hasAdvanced = useRef(false)
  useEffect(() => { advanceRef.current = advancePhase }, [advancePhase])

  // Separate refs so the interval closure always has the current reverseMode,
  // phase, and the latest time to anchor against when it (re)starts.
  const reverseModeRef = useRef(reverseMode)
  const phaseRef       = useRef(phase)
  const timeRef        = useRef(time)
  const autoStartRef   = useRef(autoStart)
  useEffect(() => { reverseModeRef.current = reverseMode }, [reverseMode])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { timeRef.current = time }, [time])
  useEffect(() => { autoStartRef.current = autoStart }, [autoStart])

  // Timestamp-anchored ticking: remaining/elapsed time is derived from the wall
  // clock rather than a running counter, so it stays accurate even when the tab
  // is backgrounded and its timers are throttled.
  useEffect(() => {
    if (!running) return
    hasAdvanced.current = false
    const isUp      = reverseModeRef.current && phaseRef.current === "focus"
    const anchorAt  = Date.now()
    const anchorVal = timeRef.current

    const tick = () => {
      const elapsed = Math.floor((Date.now() - anchorAt) / 1000)
      if (isUp) {
        // Reverse mode focus: count UP — no auto-advance, user controls the end
        setTime(anchorVal + elapsed)
      } else if (anchorVal - elapsed <= 0) {
        if (!hasAdvanced.current) { hasAdvanced.current = true; setTime(0); advanceRef.current(true) }
      } else {
        setTime(anchorVal - elapsed)
      }
    }

    const id = setInterval(tick, 1000)
    // Snap to the correct time the instant the tab regains focus
    const onVis = () => { if (document.visibilityState === "visible") tick() }
    document.addEventListener("visibilitychange", onVis)
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis) }
  }, [running, phase])

  // ── handleStopAndRest ─────────────────────────────────────────────
  // Called in reverse mode when user is done focusing. Calculates an
  // earned break = focusedSeconds / 5 (Pomodoro 1:5 ratio), min 60s.
  const handleStopAndRest = useCallback(() => {
    setRunning(false)
    const focusedSecs      = time                                   // time has been counting up
    const earnedBreakSecs  = Math.max(60, Math.round(focusedSecs / 5))
    const earnedFocusMins  = Math.max(1, Math.round(focusedSecs / 60))

    const nextCycle = cycleCount + 1
    setCycleCount(nextCycle)
    setAllHistory(h => {
      const next = [...h, {
        taskId:    activeTask.id,
        taskTitle: activeTask.title,
        focusMins: earnedFocusMins,
        at:        Date.now(),
      }]
      const newStreak = computeStreak(next, protectedDates)
      const earned    = computePoints(earnedFocusMins, newStreak)
      setTimeout(() => {
        flashToast("Session complete", `+${earned} pts · ${newStreak} day streak`)
      }, 300)
      return next
    })
    // A logged session is the clearest possible signal that a task is underway,
    // so it also moves the board — otherwise the board drifts from the work.
    setTasks(ts => ts.map(t => t.id === activeTask.id
      ? { ...t, completedSessions: t.completedSessions + 1, stage: "doing" as const }
      : t))
    playChime(false)
    buzz(20)

    if (nextCycle % LONG_BREAK_INTERVAL === 0) {
      setPhase("longbreak")
      setTime(LONG_BREAK_MINS * 60)
    } else {
      setPhase("break")
      setTime(earnedBreakSecs)
    }
    if (autoStartRef.current) setRunning(true)
  }, [time, cycleCount, activeTask, playChime, protectedDates])
  // ─────────────────────────────────────────────────────────────────

  const handleModeChange = (m: Mode, fm: number, bm: number) => {
    setMode(m); setFocusMins(fm); setBreakMins(bm)
    setRunning(false); setPhase("focus")
    setTime(reverseMode ? 0 : fm * 60)
  }

  const handleReset = () => {
    setRunning(false)
    if (reverseMode && phase === "focus") setTime(0)
    else setTime(phase === "focus" ? focusMins * 60 : currentBreakMins * 60)
  }
  const handleSkip   = () => advanceRef.current(false)
  const handleToggle = () => setRunning(r => {
    // Only on the way *into* a focus run — pausing does not need announcing.
    if (!r && phase === "focus") {
      flashToast("Focusing on this task", quickMode && !activeTask.title ? "Quick focus" : activeTask.title)
    }
    return !r
  })
  const handleDelete = (projectId: string) => {
    setProjects(ps => ps.filter(p => p.id !== projectId))
    setTasks(ts => ts.map(t => t.projectId === projectId ? { ...t, projectId: undefined } : t))
  }

  // Undo for a deleted project: put the folder back and re-file the exact tasks
  // that were unassigned by the delete.
  const handleRestoreProject = (project: Project, taskIds: string[]) => {
    setProjects(ps => ps.some(p => p.id === project.id) ? ps : [...ps, project])
    const ids = new Set(taskIds)
    setTasks(ts => ts.map(t => ids.has(t.id) ? { ...t, projectId: project.id } : t))
  }

  const handleToggleTask = (id: string) =>
    setTasks(ts => {
      const target  = ts.find(t => t.id === id)
      const updated = ts.map(t => t.id === id ? { ...t, done: !t.done } : t)
      // Completing a recurring task spawns its next occurrence
      if (target && !target.done && target.repeat && target.repeat !== "none") {
        return [...updated, nextOccurrence(target)]
      }
      return updated
    })

  const handleToggleSub = (taskId: string, subId: string) =>
    setTasks(ts => ts.map(t => t.id !== taskId ? t : {
      ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s)
    }))

  const handleSaveTask = (task: Task) =>
    setTasks(ts => ts.some(t => t.id === task.id)
      ? ts.map(t => t.id === task.id ? task : t)
      : [...ts, task])

  const handleDeleteTask = (id: string) => {
    setTasks(ts => ts.filter(t => t.id !== id))
    if (activeTask.id === id) {
      const remaining   = tasks.filter(t => t.id !== id)
      const nextPending = pickNextTask(remaining, pinned)
      setActiveTask(nextPending ?? remaining[0] ?? INITIAL_TASKS[0])
    }
  }

  // Begin a fresh focus session on a specific task (the ▶ quick-start)
  const handleStartFocus = (task: Task) => {
    setActiveTask(task)
    setTasks(ts => ts.map(t => t.id === task.id && !t.done
      ? { ...t, stage: "doing" as const } : t))
    flashToast("Focusing on this task", task.title)
    setPhase("focus")
    setTime(reverseMode ? 0 : focusMins * 60)
    setRunning(true)
    setTab("timer")
  }

  // Open a task in the Timer (paused). Switching mid-session pauses rather than
  // resetting, so elapsed time is preserved and nothing is lost.
  const handleOpenTask = (task: Task) => {
    setRunning(false)
    setActiveTask(task)
    setTab("timer")
  }

  // Switch the active task in place (Timer dropdown) — pauses if running
  const handleSelectTask = (task: Task) => {
    setRunning(false)
    setActiveTask(task)
  }

  // Tab nav: opening Tasks from the navbar clears any deep-linked calendar day
  const goToTab = (t: Tab) => {
    setTab(t)
  }
  // Deep-link into the merged Tasks page focused on a day (Home mini-calendar)

  // Both append to the ledger rather than moving counters. The op carries its
  // own id, so a retried push can't grant a second freeze, and two devices that
  // each spent offline keep both entries instead of one overwriting the other.
  const handleBuyFreeze = () => {
    if (totalPoints < FREEZE_COST) return
    setPointOps(ops => [...ops, purchaseFreeze(FREEZE_COST)])
  }
  const handleRestoreStreak = () => {
    if (streakFreezes < 1 || !restoreGap) return
    setPointOps(ops => [...ops, spendFreeze(restoreGap)])
  }

  const timerProps = {
    time, phase, mode, focusMins, breakMins, longBreakMins: LONG_BREAK_MINS,
    running, progress, sessions, totalSessions: dailyGoal, cycleCount,
  }

  // Shell chrome. The header copy lives here rather than in AppShell because
  // this is where the counts and timer state already are.
  const openCount = tasks.filter(t => !t.done).length
  const doneCount = tasks.length - openCount
  const HEADERS: Record<Tab, [string, string]> = {
    home:     [`${getGreeting()}, ${userName}`, `${sessions} of ${dailyGoal} sessions · ${openCount} open`],
    tasks:    ["Tasks",    `${openCount} open · ${doneCount} done`],
    timer:    ["Timer",    `Session ${Math.min(sessions + 1, dailyGoal)} of ${dailyGoal} · ${focusMins} + ${breakMins} min`],
    settings: ["Settings", "Make Todoro yours"],
  }
  const shellProps = {
    activeTab: tab, onTabChange: goToTab, dark, userName, streak, level: lvl.level,
    running, phase, hideNavbar: focusedView, avatarUrl,
    onQuickAdd: () => setShowAdd(true),
    openCount,
    headerTitle:    HEADERS[tab][0],
    headerSubtitle: HEADERS[tab][1],
    // Anything that owns the screen hides the FAB, so it can't sit on top of a sheet.
    overlayOpen: showAdd || showShop || notifPrompt || !onboarded,
  }

  if (!hydrated) {
    return (
      <AppShell {...shellProps}>
        {/* Skeleton of the Home layout — a blank "Loading…" reads as a broken
            launch on every cold start, which is every launch for a PWA. */}
        <div className="flex flex-col gap-5 animate-pulse" aria-busy="true" aria-label="Loading Todoro">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-surface2" />
              <div className="flex flex-col gap-1.5">
                <div className="h-3 w-20 rounded bg-surface2" />
                <div className="h-4 w-28 rounded bg-surface2" />
              </div>
            </div>
            <div className="h-8 w-24 rounded-xl bg-surface2" />
          </div>
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-6 lg:col-span-5 rounded-2xl bg-surface2 h-96" />
            <div className="col-span-12 md:col-span-6 lg:col-span-7 flex flex-col gap-3">
              <div className="rounded-2xl bg-surface2 h-20" />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-surface2 h-24" />
                <div className="rounded-2xl bg-surface2 h-24" />
              </div>
              <div className="rounded-2xl bg-surface2 h-44" />
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell {...shellProps}>

      <Toast open={!!toast} title={toast?.title} sub={toast?.sub} />

      {tab === "home" && (
        <HomePage {...timerProps}
          onTimerToggle={handleToggle} onNavToTimer={() => setTab("timer")}
          tasks={tasks} activeTask={activeTask} projects={projects}
          onToggleTask={handleToggleTask}
          onNavToTasks={() => setTab("tasks")} onOpenTask={handleOpenTask}
          onStartFocus={handleStartFocus}
          streak={streak} totalPoints={totalPoints} allHistory={allHistory}
          onOpenShop={() => setShowShop(true)} canRestore={!!restoreGap} level={lvl.level}
          avatarUrl={avatarUrl} onNavToSettings={() => setTab("settings")}
          greeting={getGreeting()} userName={userName} quickMode={quickMode} />
      )}

      {tab === "timer" && (
        <TimerPage {...timerProps}
          tasks={tasks} activeTask={activeTask} quickMode={quickMode}
          reverseMode={reverseMode} dark={dark}
          onToggle={handleToggle} onReset={handleReset} onSkip={handleSkip}
          onModeChange={handleModeChange} onTaskChange={handleSelectTask} onQuickMode={setQuickMode}
          onToggleSub={handleToggleSub} onFocusedChange={setFocusedView} allHistory={allHistory}
          onStopAndRest={handleStopAndRest} onReverseMode={setReverseMode}
          autoStart={autoStart} onAutoStart={setAutoStart} />
      )}

      {tab === "tasks" && (
        <TasksPage
          dark={dark} tasks={tasks} activeTask={activeTask}
          projects={projects} onDeleteProject={handleDelete}
          onSave={handleSaveTask} onDelete={handleDeleteTask}
          onToggle={handleToggleTask} onToggleSub={handleToggleSub}
          onStartFocus={handleStartFocus}
          onSaveProject={handleSaveProject} onRestoreProject={handleRestoreProject}
          allHistory={allHistory} focusMins={focusMins} />
      )}

      {tab === "settings" && (
        <SettingsPage
          userName={userName}     onUserName={setUserName}
          theme={theme}           onTheme={setTheme}
          sound={sound}           onSound={setSound}
          alertSound={alertSound}   onAlertSound={setAlertSound}
          alertVolume={alertVolume} onAlertVolume={setAlertVolume}
          alertCustom={alertCustom} onAlertCustom={setAlertCustom}
          dailyGoal={dailyGoal}   onDailyGoal={setDailyGoal}
          avatarUrl={avatarUrl}   onAvatarUrl={setAvatarUrl}
          accentTheme={accentTheme} onAccentTheme={setAccentTheme}
          accentCustom={accentCustom}
          onAccentCustom={raw => {
            const set = buildAccentSet(raw)
            if (!set) return
            setAccentCustom(set)
            setAccentTheme("custom")
          }}
          notifications={notifications} onNotifications={setNotifications}
          autoStart={autoStart} onAutoStart={setAutoStart}
          auth={auth} sync={sync} />
      )}

      {/* Global quick-add task modal (mobile FAB + Home) */}
      {showAdd && (
        <TaskModal
          dark={dark}
          projects={projects}
          focusMins={focusMins}
          onSave={t => { handleSaveTask(t); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
          onCreateProject={handleSaveProject} />
      )}

      {/* First-run welcome / name capture */}
      {!onboarded && (
        <Onboarding
          dark={dark}
          initialName={userName}
          onComplete={name => { if (name) setUserName(name); setOnboarded(true) }} />
      )}

      {/* One-time nudge to enable notifications after the first session */}
      {notifPrompt && (
        <NotifPrompt
          dark={dark}
          onEnable={async () => {
            setNotifPrompt(false)
            save("todoro:notifPrompted", true)
            if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
              const res = await Notification.requestPermission()
              if (res === "granted") setNotifications(true)
            } else {
              setNotifications(true)
            }
          }}
          onDismiss={() => { setNotifPrompt(false); save("todoro:notifPrompted", true) }} />
      )}

      {/* Rewards shop — buy Streak Freezes & restore a broken streak */}
      {showShop && (
        <ShopModal
          dark={dark}
          points={totalPoints}
          level={lvl.level}
          levelInto={lvl.into}
          levelSpan={lvl.span}
          freezes={streakFreezes}
          freezeCost={FREEZE_COST}
          canRestore={!!restoreGap}
          onBuyFreeze={handleBuyFreeze}
          onRestore={handleRestoreStreak}
          onClose={() => setShowShop(false)} />
      )}

      {/* Blocks everything: this device and the account both hold real work, and
          only the user can say which survives. Rendered here rather than in
          Settings because the question outlives that tab. */}
      {sync.linkChoice && (
        <SyncChoice choice={sync.linkChoice} onResolve={sync.resolveLink} />
      )}

    </AppShell>
  )
}
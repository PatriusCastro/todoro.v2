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
import TaskModal, { type Project, formatDueLabel } from "../components/tasks/TaskModal"
import { usePinnedTasks } from "../hooks/usePinnedTasks"
import { pickNextTask, sortTasks } from "../lib/taskOrder"
import { applyAccentSet, buildAccentSet, type AccentSet } from "../lib/accent"
import { useWakeLock } from "../hooks/useWakeLock"
import { useDocumentTitle } from "../hooks/useDocumentTitle"
import { useNotifications } from "../hooks/useNotifications"

type Tab   = "home" | "tasks" | "timer" | "settings"
type Phase = "focus" | "break" | "longbreak"
type Theme = "system" | "light" | "dark"

export interface SessionRecord {
  taskId:    string
  taskTitle: string
  focusMins: number
  at:        number
}

function uid() { return Math.random().toString(36).slice(2) }

const LONG_BREAK_INTERVAL = 4
const LONG_BREAK_MINS     = 15
const FREEZE_COST         = 250   // points for one Streak Freeze (~1.5 days of focus — generous safety net)
const POINTS_STREAK_CAP   = 14    // streak days at which the points bonus maxes out

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
    id: "quick-mode", title: "", priority: "none", dueDate: "", dueTime: "", dueLabel: "",
    done: false, estimatedSessions: 0, completedSessions: 0, subtasks: [],
  }
}

function localDate(ts: number = Date.now()) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const todayKey = () => localDate()

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
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

function computeStreak(history: SessionRecord[], protectedDates: string[] = []): number {
  const dates = new Set([...history.map(s => localDate(s.at)), ...protectedDates])
  if (!dates.size) return 0
  const days  = [...dates].sort().reverse()
  const ms    = 864e5
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0)
  const key   = (offset: number) => localDate(midnight.getTime() - offset * ms)
  const start = days[0] === key(0) ? 0 : days[0] === key(1) ? 1 : null
  if (start === null) return 0
  let count = 0
  for (const day of days) {
    if (day !== key(start + count)) break
    count++
  }
  return count
}

// Points for a completed focus session: 1 per focused minute + a streak bonus
// that scales to +70% at POINTS_STREAK_CAP days.
function computePoints(focusMins: number, streak: number): number {
  const base = Math.max(1, Math.round(focusMins))
  const mult = 1 + Math.min(streak, POINTS_STREAK_CAP) * 0.05
  return Math.round(base * mult)
}

// If the streak just broke (last active day is 2–4 days ago, i.e. a 1–3 day gap
// before today), return the missed days a Streak Freeze would bridge; else null.
function findStreakRestore(history: SessionRecord[], protectedDates: string[]): string[] | null {
  const active = new Set([...history.map(s => localDate(s.at)), ...protectedDates])
  if (!active.size) return null
  const ms = 864e5
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0)
  const today = localDate(midnight.getTime())
  const yest  = localDate(midnight.getTime() - ms)
  if (active.has(today) || active.has(yest)) return null   // streak isn't broken
  const last = [...active].sort().reverse()[0]
  const gap: string[] = []
  let cur = new Date(last + "T00:00").getTime() + ms
  const yestTime = midnight.getTime() - ms
  while (cur <= yestTime) { gap.push(localDate(cur)); cur += ms }
  if (gap.length === 0 || gap.length > 3) return null      // nothing to bridge, or too stale
  return gap
}

// Spawn the next instance of a recurring task, advancing its due date
function nextOccurrence(task: Task): Task {
  const base = task.dueDate ? new Date(task.dueDate + "T00:00") : new Date()
  base.setDate(base.getDate() + (task.repeat === "weekly" ? 7 : 1))
  const dueDate = localDate(base.getTime())
  return {
    ...task,
    id: uid(),
    done: false,
    completedSessions: 0,
    dueDate,
    dueLabel: formatDueLabel(dueDate, task.dueTime ?? ""),
    subtasks: task.subtasks.map(s => ({ ...s, id: uid(), done: false })),
  }
}

// Level from total points — each level costs a little more than the last
function levelFromPoints(points: number): { level: number; into: number; span: number } {
  let level = 1
  while (50 * level * (level + 1) <= points) level++
  const base = 50 * (level - 1) * level
  const next = 50 * level * (level + 1)
  return { level, into: points - base, span: next - base }
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  const [tab,       setTab]       = useState<Tab>("home")
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
  const [totalPoints, setTotalPoints] = useState(() => load("todoro:points", 0))
  const [streakFreezes,  setStreakFreezes]  = useState<number>(()   => load("todoro:freezes", 0))
  const [protectedDates, setProtectedDates] = useState<string[]>(() => load("todoro:protectedDates", []))
  const [showShop,    setShowShop]    = useState(false)
  // One toast channel for the whole app shell: session complete, focus started.
  const [toast, setToast] = useState<{ title: string; sub?: string } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashToast = useCallback((title: string, sub?: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ title, sub })
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }, [])

  const [allHistory, setAllHistory] = useState<SessionRecord[]>(
    () => load("todoro:history", [])
  )

  const [focusedView, setFocusedView] = useState(false)

  const todayHistory = allHistory.filter(s => localDate(s.at) === todayKey())
  const sessions = todayHistory.length
  const streak   = computeStreak(allHistory, protectedDates)
  const restoreGap = findStreakRestore(allHistory, protectedDates)
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

  useEffect(() => { save("todoro:projects", projects) }, [projects])
  // ─────────────────────────────────────────────────────────────────

  const audioCtxRef = useRef<AudioContext | null>(null)

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

  useEffect(() => { save("todoro:userName",    userName)    }, [userName])
  useEffect(() => { save("todoro:theme",       theme)       }, [theme])
  useEffect(() => { save("todoro:sound",       sound)       }, [sound])
  useEffect(() => { save("todoro:dailyGoal",   dailyGoal)   }, [dailyGoal])
  useEffect(() => { save("todoro:avatarUrl",   avatarUrl)   }, [avatarUrl])
  useEffect(() => { save("todoro:quickMode",   quickMode)   }, [quickMode])
  useEffect(() => { save("todoro:reverseMode", reverseMode) }, [reverseMode])
  useEffect(() => { save("todoro:mode",        mode)        }, [mode])
  useEffect(() => { save("todoro:focusMins",   focusMins)   }, [focusMins])
  useEffect(() => { save("todoro:breakMins",   breakMins)   }, [breakMins])
  useEffect(() => { save("todoro:tasks",       tasks)       }, [tasks])
  useEffect(() => { save("todoro:points",      totalPoints) }, [totalPoints])
  useEffect(() => { save("todoro:freezes",        streakFreezes)  }, [streakFreezes])
  useEffect(() => { save("todoro:protectedDates", protectedDates) }, [protectedDates])
  useEffect(() => { save("todoro:history",     allHistory)  }, [allHistory])
  useEffect(() => { save("todoro:accentTheme", accentTheme) }, [accentTheme])
  useEffect(() => { save("todoro:accentCustom", accentCustom) }, [accentCustom])
  useEffect(() => { save("todoro:notifications", notifications) }, [notifications])
  useEffect(() => { save("todoro:autoStart",     autoStart)     }, [autoStart])
  useEffect(() => { save("todoro:onboarded",     onboarded)     }, [onboarded])

  // Snapshot the timer so a reload restores the remaining time (paused)
  useEffect(() => { save("todoro:timer", { phase, time }) }, [phase, time])

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
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx   = audioCtxRef.current
      const freqs = isFocus ? [784, 659, 523] : [523, 659, 784]
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.15
        gain.gain.setValueAtTime(0.15, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
        osc.start(t); osc.stop(t + 0.4)
      })
    } catch {}
  }, [sound])

  const advancePhase = useCallback((completed: boolean) => {
    setRunning(false)
    if (phase === "focus") {
      if (completed) {
        const nextCycle = cycleCount + 1
        setCycleCount(nextCycle)
        setAllHistory(h => {
          const next = [...h, { taskId: activeTask.id, taskTitle: activeTask.title, focusMins, at: Date.now() }]
          const newStreak = computeStreak(next, protectedDates)
          const earned    = computePoints(focusMins, newStreak)
          setTimeout(() => {
            setTotalPoints(p => p + earned)
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
        setTotalPoints(p => p + earned)
        flashToast("Session complete", `+${earned} pts · ${newStreak} day streak`)
      }, 300)
      return next
    })
    setTasks(ts => ts.map(t => t.id === activeTask.id
      ? { ...t, completedSessions: t.completedSessions + 1 }
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

  const handleBuyFreeze = () => {
    if (totalPoints < FREEZE_COST) return
    setTotalPoints(p => p - FREEZE_COST)
    setStreakFreezes(f => f + 1)
  }
  const handleRestoreStreak = () => {
    if (streakFreezes < 1 || !restoreGap) return
    setProtectedDates(p => [...p, ...restoreGap])
    setStreakFreezes(f => f - 1)
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
          onOpenTask={handleOpenTask} onStartFocus={handleStartFocus}
          onSaveProject={handleSaveProject} onRestoreProject={handleRestoreProject}
          allHistory={allHistory} />
      )}

      {tab === "settings" && (
        <SettingsPage
          userName={userName}     onUserName={setUserName}
          theme={theme}           onTheme={setTheme}
          sound={sound}           onSound={setSound}
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
          autoStart={autoStart} onAutoStart={setAutoStart} />
      )}

      {/* Global quick-add task modal (mobile FAB + Home) */}
      {showAdd && (
        <TaskModal
          dark={dark}
          projects={projects}
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

    </AppShell>
  )
}
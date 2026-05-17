"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import AppShell     from "../components/AppShell"
import HomePage     from "../components/HomePage"
import TimerPage    from "../components/TimerPage"
import TasksPage    from "../components/TasksPage"
import SettingsPage from "../components/SettingsPage"
import CalendarPage from "../components/CalendarPage"
import { type Mode } from "../components/timer/ModeSelector"
import { type Task } from "../components/tasks/TaskCard"
import { type Project } from "../components/tasks/TaskModal"
import { useWakeLock } from "../hooks/useWakeLock"
import { useDocumentTitle } from "../hooks/useDocumentTitle"

type Tab   = "home" | "tasks" | "timer" | "settings" | "calendar"
type Phase = "focus" | "break" | "longbreak"

export interface SessionRecord {
  taskId:    string
  taskTitle: string
  focusMins: number
  at:        number
}

function uid() { return Math.random().toString(36).slice(2) }

const LONG_BREAK_INTERVAL = 4
const LONG_BREAK_MINS     = 15

const INITIAL_TASKS: Task[] = [
  {
    id: "1", title: "Try your first focus session", priority: "high",
    dueDate: new Date().toISOString().slice(0, 10), dueTime: "", dueLabel: "Due today",
    done: false, estimatedSessions: 2, completedSessions: 0,
    subtasks: [
      { id: uid(), title: "Pick a task to work on",    done: false },
      { id: uid(), title: "Hit Start and stay focused", done: false },
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

function computeStreak(history: SessionRecord[]): number {
  if (!history.length) return 0
  const days  = [...new Set(history.map(s => localDate(s.at)))].sort().reverse()
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

export default function Home() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  const [tab,       setTab]       = useState<Tab>("home")
  const [userName,  setUserName]  = useState(() => load("todoro:userName",  "Bossing"))
  const [dark,      setDark]      = useState(() => load("todoro:dark",      true))
  const [sound,     setSound]     = useState(() => load("todoro:sound",     true))
  const [dailyGoal, setDailyGoal] = useState(() => load("todoro:dailyGoal", 5))
  const [avatarUrl, setAvatarUrl] = useState(() => load("todoro:avatarUrl", ""))
  const [quickMode, setQuickMode] = useState(() => load("todoro:quickMode", false))

  const [mode,      setMode]      = useState<Mode>(()   => load("todoro:mode",      "25/5"))
  const [focusMins, setFocusMins] = useState<number>(() => load("todoro:focusMins", 25))
  const [breakMins, setBreakMins] = useState<number>(() => load("todoro:breakMins", 5))

  const [phase,   setPhase]   = useState<Phase>("focus")
  const [time,    setTime]    = useState(focusMins * 60)
  const [running, setRunning] = useState(false)

  const [cycleCount,  setCycleCount]  = useState(0)
  const [totalPoints, setTotalPoints] = useState(() => load("todoro:points", 0))
  const [toast,       setToast]       = useState<{ points: number; streak: number } | null>(null)

  const [allHistory, setAllHistory] = useState<SessionRecord[]>(
    () => load("todoro:history", [])
  )

  const [focusedView, setFocusedView] = useState(false)

  const todayHistory = allHistory.filter(s => localDate(s.at) === todayKey())
  const sessions = todayHistory.length
  const streak   = computeStreak(allHistory)

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
  const progress = maxTime > 0 ? (maxTime - time) / maxTime : 0

  useEffect(() => {
    const updated = tasks.find(t => t.id === activeTask.id)
    if (updated && !updated.done) setActiveTask(updated)
    else if (updated?.done) {
      const nextPending = tasks.find(t => !t.done)
      if (nextPending) setActiveTask(nextPending)
    }
  }, [tasks])

  useEffect(() => {
    if (quickMode && activeTask.title !== "") {
      setActiveTask(createQuickModeTask())
    } else if (!quickMode && activeTask.id === "quick-mode") {
      const nextPending = tasks.find(t => !t.done)
      if (nextPending) setActiveTask(nextPending)
      else setActiveTask(tasks[0] ?? INITIAL_TASKS[0])
    }
  }, [quickMode, tasks])

  useEffect(() => { save("todoro:userName",  userName)    }, [userName])
  useEffect(() => { save("todoro:dark",      dark)        }, [dark])
  useEffect(() => { save("todoro:sound",     sound)       }, [sound])
  useEffect(() => { save("todoro:dailyGoal", dailyGoal)   }, [dailyGoal])
  useEffect(() => { save("todoro:avatarUrl", avatarUrl)   }, [avatarUrl])
  useEffect(() => { save("todoro:quickMode", quickMode)   }, [quickMode])
  useEffect(() => { save("todoro:mode",      mode)        }, [mode])
  useEffect(() => { save("todoro:focusMins", focusMins)   }, [focusMins])
  useEffect(() => { save("todoro:breakMins", breakMins)   }, [breakMins])
  useEffect(() => { save("todoro:tasks",     tasks)       }, [tasks])
  useEffect(() => { save("todoro:points",    totalPoints) }, [totalPoints])
  useEffect(() => { save("todoro:history",   allHistory)  }, [allHistory])

  useWakeLock(running)
  useDocumentTitle(time, phase, running)

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
        setTotalPoints(p => p + 5)
        setAllHistory(h => {
          const next = [...h, { taskId: activeTask.id, taskTitle: activeTask.title, focusMins, at: Date.now() }]
          const newStreak = computeStreak(next)
          setTimeout(() => { setToast({ points: 5, streak: newStreak }); setTimeout(() => setToast(null), 3500) }, 300)
          return next
        })
        setTasks(ts => ts.map(t => t.id === activeTask.id
          ? { ...t, completedSessions: t.completedSessions + 1 }
          : t))
        playChime(false)
        if (nextCycle % LONG_BREAK_INTERVAL === 0) {
          setPhase("longbreak"); setTime(LONG_BREAK_MINS * 60)
        } else {
          setPhase("break"); setTime(breakMins * 60)
        }
      } else {
        setPhase("break"); setTime(breakMins * 60)
      }
    } else {
      if (completed) playChime(true)
      setPhase("focus"); setTime(focusMins * 60)
    }
  }, [phase, cycleCount, focusMins, breakMins, activeTask, playChime])

  const advanceRef  = useRef(advancePhase)
  const hasAdvanced = useRef(false)
  useEffect(() => { advanceRef.current = advancePhase }, [advancePhase])

  useEffect(() => {
    if (!running) return
    hasAdvanced.current = false
    const id = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          if (!hasAdvanced.current) { hasAdvanced.current = true; advanceRef.current(true) }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const handleModeChange = (m: Mode, fm: number, bm: number) => {
    setMode(m); setFocusMins(fm); setBreakMins(bm)
    setRunning(false); setPhase("focus"); setTime(fm * 60)
  }

  const handleReset  = () => { setRunning(false); setTime(phase === "focus" ? focusMins * 60 : currentBreakMins * 60) }
  const handleSkip   = () => advanceRef.current(false)
  const handleToggle = () => setRunning(r => !r)

  const handleToggleTask = (id: string) =>
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t))

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
      const remaining    = tasks.filter(t => t.id !== id)
      const nextPending  = remaining.find(t => !t.done)
      setActiveTask(nextPending ?? remaining[0] ?? INITIAL_TASKS[0])
    }
  }

  const timerProps = {
    time, phase, mode, focusMins, breakMins, longBreakMins: LONG_BREAK_MINS,
    running, progress, sessions, totalSessions: dailyGoal, cycleCount,
  }

  if (!hydrated) {
    return (
      <AppShell activeTab={tab} onTabChange={setTab} dark={dark} userName={userName} streak={streak} running={running} phase={phase} hideNavbar={focusedView} avatarUrl={avatarUrl} onAddTask={handleSaveTask} projects={projects} onSaveProject={handleSaveProject}>
        <div className="flex items-center justify-center h-96 text-sub">
          <p>Loading...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell activeTab={tab} onTabChange={setTab} dark={dark} userName={userName} streak={streak} running={running} phase={phase} hideNavbar={focusedView} avatarUrl={avatarUrl} onAddTask={handleSaveTask} projects={projects} onSaveProject={handleSaveProject}>

      {/* Session complete toast */}
      <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-300 pointer-events-none transition-all duration-300
        ${toast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}`}>
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-surface border border-border whitespace-nowrap">
          <span className="text-base">🎉</span>
          <div className="flex flex-col">
            <span className="text-sm font-black text-tx">Session complete!</span>
            <span className="text-xs text-sub">+{toast?.points} pts · {toast?.streak} day streak</span>
          </div>
        </div>
      </div>

      {tab === "home" && (
        <HomePage {...timerProps}
          onTimerToggle={handleToggle} onNavToTimer={() => setTab("timer")}
          tasks={tasks} activeTask={activeTask} onNavToCalendar={() => setTab("calendar")}
          onToggleTask={handleToggleTask} onToggleSub={handleToggleSub}
          onNavToTasks={() => setTab("tasks")} onSetActive={setActiveTask}
          streak={streak} totalPoints={totalPoints} allHistory={allHistory}
          avatarUrl={avatarUrl} onNavToSettings={() => setTab("settings")}
          greeting={getGreeting()} userName={userName} quickMode={quickMode} onQuickMode={setQuickMode} />
      )}

      {tab === "timer" && (
        <TimerPage {...timerProps}
          tasks={tasks} activeTask={activeTask} quickMode={quickMode}
          onToggle={handleToggle} onReset={handleReset} onSkip={handleSkip}
          onModeChange={handleModeChange} onTaskChange={setActiveTask} onQuickMode={setQuickMode}
          onToggleSub={handleToggleSub} onFocusedChange={setFocusedView} allHistory={allHistory} />
      )}

      {tab === "tasks" && (
        <TasksPage
          dark={dark} tasks={tasks} activeTask={activeTask} running={running}
          projects={projects}
          onSave={handleSaveTask} onDelete={handleDeleteTask}
          onToggle={handleToggleTask} onToggleSub={handleToggleSub}
          onSetActive={setActiveTask} onNavToTimer={() => setTab("timer")}
          onSaveProject={handleSaveProject} />
      )}

      {tab === "settings" && (
        <SettingsPage
          userName={userName}   onUserName={setUserName}
          dark={dark}           onDark={setDark}
          sound={sound}         onSound={setSound}
          dailyGoal={dailyGoal} onDailyGoal={setDailyGoal}
          avatarUrl={avatarUrl} onAvatarUrl={setAvatarUrl}
          quickMode={quickMode} onQuickMode={setQuickMode} />
      )}

      {tab === "calendar" && (
        <CalendarPage tasks={tasks} allHistory={allHistory} />
      )}

    </AppShell>
  )
}
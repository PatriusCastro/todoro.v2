"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import AppShell     from "../components/AppShell"
import HomePage     from "../components/HomePage"
import TimerPage    from "../components/TimerPage"
import TasksPage    from "../components/TasksPage"
import SettingsPage from "../components/SettingsPage"
import { type Mode } from "../components/timer/ModeSelector"
import { type Task } from "../components/tasks/TaskCard"
import { useWakeLock } from "../hooks/useWakeLock"
import { useDocumentTitle } from "../hooks/useDocumentTitle"

type Tab   = "home" | "tasks" | "timer" | "settings"
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

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

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
  if (history.length === 0) return 0
  const days = new Set(history.map(s => new Date(s.at).toISOString().slice(0, 10)))
  let streak = 0
  const d = new Date()
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export default function Home() {
  const [tab,       setTab]       = useState<Tab>("home")
  const [userName,  setUserName]  = useState(() => load("todoro:userName",  "Kath"))
  const [dark,      setDark]      = useState(() => load("todoro:dark",      true))
  const [sound,     setSound]     = useState(() => load("todoro:sound",     true))
  const [dailyGoal, setDailyGoal] = useState(() => load("todoro:dailyGoal", 5))

  const [mode,      setMode]      = useState<Mode>(()   => load("todoro:mode",      "25/5"))
  const [focusMins, setFocusMins] = useState<number>(() => load("todoro:focusMins", 25))
  const [breakMins, setBreakMins] = useState<number>(() => load("todoro:breakMins", 5))

  const [phase,   setPhase]   = useState<Phase>("focus")
  const [time,    setTime]    = useState(focusMins * 60)
  const [running, setRunning] = useState(false)

  const [sessions,    setSessions]    = useState(0)
  const [cycleCount,  setCycleCount]  = useState(0)
  const [totalPoints, setTotalPoints] = useState(() => load("todoro:points", 0))

  const [allHistory, setAllHistory] = useState<SessionRecord[]>(
    () => load("todoro:history", [])
  )

  const todayHistory = allHistory.filter(
    s => new Date(s.at).toISOString().slice(0, 10) === todayKey()
  )
  const streak = computeStreak(allHistory)

  const [tasks,      setTasks]      = useState<Task[]>(() => load("todoro:tasks", INITIAL_TASKS))
  const [activeTask, setActiveTask] = useState<Task>(() => {
    const saved = load<Task[]>("todoro:tasks", INITIAL_TASKS)
    return saved[0] ?? INITIAL_TASKS[0]
  })

  const audioCtxRef = useRef<AudioContext | null>(null)

  const currentBreakMins = phase === "longbreak" ? LONG_BREAK_MINS : breakMins
  const maxTime  = phase === "focus" ? focusMins * 60 : currentBreakMins * 60
  const progress = maxTime > 0 ? (maxTime - time) / maxTime : 0

  /* Keep activeTask in sync with tasks state */
  useEffect(() => {
    const updated = tasks.find(t => t.id === activeTask.id)
    if (updated) setActiveTask(updated)
  }, [tasks])

  /* Persist settings & data */
  useEffect(() => { save("todoro:userName",  userName)    }, [userName])
  useEffect(() => { save("todoro:dark",      dark)        }, [dark])
  useEffect(() => { save("todoro:sound",     sound)       }, [sound])
  useEffect(() => { save("todoro:dailyGoal", dailyGoal)   }, [dailyGoal])
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
        setSessions(s => s + 1)
        setCycleCount(nextCycle)
        setTotalPoints(p => p + 5)
        setAllHistory(h => [...h, {
          taskId:    activeTask.id,
          taskTitle: activeTask.title,
          focusMins,
          at:        Date.now(),
        }])
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
    const remaining = tasks.filter(t => t.id !== id)
    if (activeTask.id === id) setActiveTask(remaining[0] ?? INITIAL_TASKS[0])
  }

  const timerProps = {
    time, phase, mode, focusMins, breakMins, longBreakMins: LONG_BREAK_MINS,
    running, progress, sessions, totalSessions: dailyGoal, cycleCount,
  }

  return (
    <AppShell activeTab={tab} onTabChange={setTab} dark={dark} userName={userName} streak={streak} running={running}>

      {tab === "home" && (
        <HomePage {...timerProps}
          onTimerToggle={handleToggle} onNavToTimer={() => setTab("timer")}
          tasks={tasks} activeTask={activeTask}
          onToggleTask={handleToggleTask} onToggleSub={handleToggleSub}
          onNavToTasks={() => setTab("tasks")} onSetActive={setActiveTask}
          streak={streak} totalPoints={totalPoints} todayHistory={todayHistory}
          greeting={getGreeting()} userName={userName} />
      )}

      {tab === "timer" && (
        <TimerPage {...timerProps}
          tasks={tasks} activeTask={activeTask}
          onToggle={handleToggle} onReset={handleReset} onSkip={handleSkip}
          onModeChange={handleModeChange} onTaskChange={setActiveTask}
          onToggleSub={handleToggleSub} />
      )}

      {tab === "tasks" && (
        <TasksPage tasks={tasks} activeTask={activeTask}
          onSave={handleSaveTask} onDelete={handleDeleteTask}
          onToggle={handleToggleTask} onToggleSub={handleToggleSub}
          onSetActive={setActiveTask} onNavToTimer={() => setTab("timer")} />
      )}

      {tab === "settings" && (
        <SettingsPage
          userName={userName}   onUserName={setUserName}
          dark={dark}           onDark={setDark}
          sound={sound}         onSound={setSound}
          dailyGoal={dailyGoal} onDailyGoal={setDailyGoal} />
      )}

    </AppShell>
  )
}
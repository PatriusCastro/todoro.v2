"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import AppShell     from "../components/AppShell"
import HomePage     from "../components/HomePage"
import TimerPage    from "../components/TimerPage"
import TasksPage    from "../components/TasksPage"
import SettingsPage from "../components/SettingsPage"
import { type Mode, PRESET_MODES } from "../components/timer/ModeSelector"
import { type Task } from "../components/tasks/TaskCard"
import { useWakeLock } from "../hooks/useWakeLock"

type Tab   = "home" | "tasks" | "timer" | "settings"
type Phase = "focus" | "break"

function uid() { return Math.random().toString(36).slice(2) }

const INITIAL_TASKS: Task[] = [
  { id: "1", title: "Capstone-ng-VetSync", priority: "high", dueDate: new Date().toISOString().slice(0,10), dueTime: "", dueLabel: "Due today",     done: false, subtasks: [{ id: uid(), title: "Research phase", done: true }, { id: uid(), title: "Write report", done: false }] },
  { id: "2", title: "Todoro Figma UI",     priority: "low",  dueDate: "",                                    dueTime: "", dueLabel: "No due date",   done: false, subtasks: [{ id: uid(), title: "Wireframes",     done: false }] },
  { id: "3", title: "Business Plan",       priority: "mid",  dueDate: "",                                    dueTime: "", dueLabel: "Due next week", done: false, subtasks: [] },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

export default function Home() {
  const [tab,         setTab]         = useState<Tab>("home")
  const [userName,    setUserName]    = useState("Kath")
  const [dark,        setDark]        = useState(true)
  const [sound,       setSound]       = useState(true)
  const [dailyGoal,   setDailyGoal]   = useState(5)

  /* Timer mode & custom durations */
  const [mode,        setMode]        = useState<Mode>("25/5")
  const [focusMins,   setFocusMins]   = useState(25)
  const [breakMins,   setBreakMins]   = useState(5)

  /* Timer state */
  const [phase,       setPhase]       = useState<Phase>("focus")
  const [time,        setTime]        = useState(focusMins * 60)
  const [running,     setRunning]     = useState(false)

  /* Stats */
  const [sessions,    setSessions]    = useState(0)   // completed focus sessions today
  const [totalPoints, setTotalPoints] = useState(23)
  const [streak]                      = useState(3)

  /* Tasks */
  const [tasks,       setTasks]       = useState<Task[]>(INITIAL_TASKS)
  const [activeTask,  setActiveTask]  = useState<Task>(INITIAL_TASKS[0])

  const audioCtxRef = useRef<AudioContext | null>(null)

  const maxTime  = phase === "focus" ? focusMins * 60 : breakMins * 60
  const progress = maxTime > 0 ? (maxTime - time) / maxTime : 0

  /* Keep activeTask in sync when tasks array updates */
  useEffect(() => {
    const updated = tasks.find(t => t.id === activeTask.id)
    if (updated) setActiveTask(updated)
  }, [tasks])

  useWakeLock(running)

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

  /* Advance to next phase — called on natural completion OR skip */
  const advancePhase = useCallback((completed: boolean) => {
    setRunning(false)
    if (phase === "focus") {
      /* Focus ended → go to break */
      if (completed) {
        setSessions(s => s + 1)
        setTotalPoints(p => p + 5)
        playChime(false) /* descending = break time */
      }
      setPhase("break")
      setTime(breakMins * 60)
    } else {
      /* Break ended → go back to focus */
      if (completed) playChime(true) /* ascending = focus time */
      setPhase("focus")
      setTime(focusMins * 60)
    }
  }, [phase, focusMins, breakMins, playChime])

  /* Countdown */
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setTime(t => {
        if (t <= 1) { advancePhase(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, advancePhase])

  /* Reset time when mode/duration changes */
  const handleModeChange = (m: Mode, fm: number, bm: number) => {
    setMode(m); setFocusMins(fm); setBreakMins(bm)
    setRunning(false); setPhase("focus"); setTime(fm * 60)
  }

  const handleReset  = () => { setRunning(false); setTime(phase === "focus" ? focusMins * 60 : breakMins * 60) }
  const handleSkip   = () => advancePhase(false)
  const handleToggle = () => setRunning(r => !r)

  const handleToggleTask = (id: string) =>
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const handleToggleSub = (taskId: string, subId: string) =>
    setTasks(ts => ts.map(t => t.id !== taskId ? t : {
      ...t, subtasks: t.subtasks.map(s => s.id === subId ? { ...s, done: !s.done } : s)
    }))

  const handleSaveTask = (task: Task) =>
    setTasks(ts => ts.some(t => t.id === task.id) ? ts.map(t => t.id === task.id ? task : t) : [...ts, task])

  const handleDeleteTask = (id: string) => {
    setTasks(ts => ts.filter(t => t.id !== id))
    const remaining = tasks.filter(t => t.id !== id)
    if (activeTask.id === id) setActiveTask(remaining[0] ?? INITIAL_TASKS[0])
  }

  const timerProps = { time, phase, mode, focusMins, breakMins, running, progress, sessions, totalSessions: dailyGoal }

  return (
    <AppShell activeTab={tab} onTabChange={setTab} dark={dark} userName={userName} streak={streak} running={running}>

      {tab === "home" && (
        <HomePage {...timerProps}
          onTimerToggle={handleToggle} onNavToTimer={() => setTab("timer")}
          tasks={tasks} activeTask={activeTask}
          onToggleTask={handleToggleTask} onToggleSub={handleToggleSub}
          onNavToTasks={() => setTab("tasks")} onSetActive={setActiveTask}
          streak={streak} totalPoints={totalPoints}
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
"use client"

import TaskCard, { type Task } from "../components/tasks/TaskCard"
import { type Mode } from "../components/timer/ModeSelector"
import { colors } from "../lib/theme"

type Phase = "focus" | "break" | "longbreak"

interface HomePageProps {
  time: number; phase: Phase; mode: Mode
  focusMins: number; breakMins: number; longBreakMins: number
  running: boolean; progress: number
  sessions: number; totalSessions: number; cycleCount: number
  onTimerToggle: () => void; onNavToTimer: () => void
  tasks: Task[]; activeTask: Task
  onToggleTask: (id: string) => void; onToggleSub: (tId: string, sId: string) => void
  onNavToTasks: () => void; onSetActive: (t: Task) => void
  streak: number; totalPoints: number; greeting: string; userName: string
}

function phaseLabel(phase: Phase) {
  if (phase === "focus")     return "Focus"
  if (phase === "longbreak") return "Long Break"
  return "Break"
}

function phaseColor(phase: Phase) {
  return phase === "focus" ? colors.accent : "#51CF66"
}

export default function HomePage({
  time, phase, mode, focusMins, breakMins, longBreakMins, running, progress,
  sessions, totalSessions, cycleCount, onTimerToggle, onNavToTimer,
  tasks, activeTask, onToggleTask, onToggleSub,
  onNavToTasks, onSetActive, streak, totalPoints, greeting, userName,
}: HomePageProps) {
  const minutes  = Math.floor(time / 60)
  const seconds  = time % 60
  const currentBreakMins = phase === "longbreak" ? longBreakMins : breakMins
  const maxTime  = phase === "focus" ? focusMins * 60 : currentBreakMins * 60
  const firstName = userName.split(" ")[0] || "there"
  const ringColor = phaseColor(phase)
  const label     = phaseLabel(phase)

  const size = 200; const cx = size / 2; const r = cx - 16; const C = 2 * Math.PI * r

  const pendingTasks = tasks.filter(t => !t.done)

  return (
    <div className="flex flex-col gap-6">

      {/* Greeting */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-sub uppercase tracking-widest mb-1">{greeting}</p>
          <h1 className="text-2xl font-black text-tx">
            {firstName}
            {running && <span className="ml-2 text-sm font-semibold text-priority-low align-middle">· focusing</span>}
          </h1>
          <p className="text-sm text-sub mt-0.5">Ready to focus?</p>
        </div>
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent font-black text-sm border border-accent/20">
            {firstName.slice(0, 2).toUpperCase()}
          </div>
          {running && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-priority-low border-2 border-bg" />
          )}
        </div>
      </div>

      {/* Today's Goal */}
      <div className="rounded-2xl border border-border bg-surface px-5 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-sub uppercase tracking-widest">Today's Goal</span>
          <span className="text-xs text-sub">{sessions} / {totalSessions} sessions</span>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSessions }).map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-300
              ${i < sessions ? "bg-accent" : "bg-ring"}`} />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <svg width="13" height="13" fill="none" stroke="#FFBA00" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            <span className="text-xs font-semibold text-tx">{streak} day streak</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg width="13" height="13" fill="none" stroke="#FFBA00" strokeWidth="2" viewBox="0 0 24 24">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span className="text-xs font-semibold text-tx">{totalPoints} pts</span>
          </div>
        </div>
      </div>

      {/* Current Task */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-sub uppercase tracking-widest">Current Task</span>
          <button onClick={onNavToTasks}
            className="text-xs text-sub hover:text-accent transition-colors flex items-center gap-0.5">
            All tasks
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        <TaskCard task={activeTask} onToggle={onToggleTask} onToggleSub={onToggleSub} compact isActive />
        {activeTask.estimatedSessions > 0 && (
          <div className="flex items-center gap-2 px-1">
            <div className="flex items-center gap-1 flex-1">
              {Array.from({ length: activeTask.estimatedSessions }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                  ${i < activeTask.completedSessions ? "bg-accent" : "bg-ring"}`} />
              ))}
            </div>
            <span className="text-[11px] text-sub shrink-0">
              {activeTask.completedSessions}/{activeTask.estimatedSessions} sessions
            </span>
          </div>
        )}
      </div>

      {/* Timer card */}
      <div className="rounded-2xl border border-border bg-surface px-5 py-5 flex flex-col items-center gap-4">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
          ${phase === "focus" ? "bg-accent/10 text-accent" : "bg-priority-low/10 text-priority-low"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${running ? "animate-pulse" : ""}`}
            style={{ background: ringColor }} />
          {label} · {phase === "focus" ? focusMins : currentBreakMins} min
        </div>

        <div className="relative cursor-pointer" style={{ width: size, height: size }} onClick={onNavToTimer}>
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--ring)" strokeWidth={11} />
            <circle cx={cx} cy={cx} r={r} fill="none" stroke={ringColor} strokeWidth={8}
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span className="text-4xl font-black text-tx tabular-nums leading-none tracking-tight">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
            <span className="text-[11px] text-sub">
              {phase === "focus" ? `session ${sessions + 1}` : "take a break"}
            </span>
          </div>
        </div>

        <button onClick={onTimerToggle}
          className={`w-full py-3 rounded-xl text-white text-sm font-black active:scale-95 transition-all duration-150
            ${phase === "focus" ? "bg-accent hover:bg-accent-hover" : "bg-priority-low hover:bg-[#42c956]"}`}>
          <span className="flex items-center justify-center gap-2">
            {running
              ? <><svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause</>
              : <><svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  {phase === "focus" ? "Start Focus" : phase === "longbreak" ? "Start Long Break" : "Start Break"}</>
            }
          </span>
        </button>
      </div>

      {/* Today's session log */}
      {sessions > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-sub uppercase tracking-widest px-1">Today's Sessions</span>
          <div className="rounded-2xl border border-border bg-surface px-5 py-3 flex flex-col gap-2">
            {Array.from({ length: sessions }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <svg width="12" height="12" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-xs text-sub">Focus {focusMins}m</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Up next */}
      {pendingTasks.filter(t => t.id !== activeTask.id).length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-sub uppercase tracking-widest px-1">Up Next</span>
          {pendingTasks.filter(t => t.id !== activeTask.id).slice(0, 2).map(t => (
            <TaskCard key={t.id} task={t} onToggle={onToggleTask} onClick={() => onSetActive(t)} compact />
          ))}
        </div>
      )}

    </div>
  )
}
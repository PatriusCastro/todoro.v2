"use client"

import { HiBolt, HiStar, HiPlayCircle, HiPauseCircle, HiChevronRight, HiCheckCircle } from "react-icons/hi2"
import TaskCard, { type Task } from "../components/tasks/TaskCard"
import { type Mode } from "../components/timer/ModeSelector"
import { colors, getPriority } from "../lib/theme"

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
  avatarUrl: string; onNavToSettings: () => void
  todayHistory: { taskId: string; taskTitle: string; focusMins: number; at: number }[]
}

function phaseLabel(phase: Phase) {
  if (phase === "focus")     return "Focus"
  if (phase === "longbreak") return "Long Break"
  return "Break"
}

function phaseColor(phase: Phase) {
  return phase === "focus" ? colors.accent : "#51CF66"
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function getSubtitle(running: boolean, phase: Phase, sessions: number, totalSessions: number) {
  if (sessions >= totalSessions)      return "Goal reached today!"
  if (running && phase === "focus")   return "Stay focused."
  if (running && phase !== "focus")   return "Take it easy."
  return "Ready to focus?"
}

export default function HomePage({
  time, phase, mode, focusMins, breakMins, longBreakMins, running, progress,
  sessions, totalSessions, cycleCount, onTimerToggle, onNavToTimer,
  tasks, activeTask, onToggleTask, onToggleSub,
  onNavToTasks, onSetActive, streak, totalPoints, greeting, userName,
  avatarUrl, onNavToSettings, todayHistory,
}: HomePageProps) {
  const minutes  = Math.floor(time / 60)
  const seconds  = time % 60
  const currentBreakMins = phase === "longbreak" ? longBreakMins : breakMins
  const maxTime  = phase === "focus" ? focusMins * 60 : currentBreakMins * 60
  const firstName  = userName.split(" ")[0] || "there"
  const ringColor  = phaseColor(phase)
  const label      = phaseLabel(phase)
  const goalHit    = sessions >= totalSessions
  const subtitle   = getSubtitle(running, phase, sessions, totalSessions)

  const size = 200; const cx = size / 2; const r = cx - 16; const C = 2 * Math.PI * r

  const pendingTasks = tasks.filter(t => !t.done && t.id !== activeTask.id)
  const allDone = tasks.every(t => t.done)

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
          <p className={`text-sm mt-1 transition-colors duration-300
            ${goalHit ? "text-priority-low font-semibold" : "text-sub"}`}>
            {subtitle}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={onNavToSettings} className="relative shrink-0">
            <div className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-colors
              ${running ? "border-priority-low" : "border-accent/20"}`}>
              {avatarUrl
                ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-accent/15 flex items-center justify-center text-accent font-black text-sm">
                    {firstName.slice(0, 2).toUpperCase()}
                  </div>
              }
            </div>
            {running && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-priority-low border-2 border-bg" />
            )}
          </button>
          <div className="flex items-center gap-4 border border-border rounded-xl px-3 py-1">
            <div className="flex items-center gap-1.5">
              <HiBolt size={12} color="#FFBA00" />
              <span className="text-xs font-semibold text-tx">{streak} day streak</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HiStar size={12} color="#FFBA00" />
              <span className="text-xs font-semibold text-tx">{totalPoints} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Goal */}
      <div className={`rounded-2xl border bg-surface px-5 py-4 flex flex-col gap-3 transition-colors duration-300
        ${goalHit ? "border-priority-low/40 bg-priority-low/5" : "border-border"}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-sub uppercase tracking-widest">Today's Goal</span>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSessions }).map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500
              ${i < sessions
                ? goalHit ? "bg-priority-low" : "bg-accent"
                : "bg-ring"}`} />
          ))}
        </div>
        <span className={`text-xs font-semibold ${goalHit ? "text-priority-low" : "text-sub"}`}>
          {sessions} / {totalSessions} sessions
        </span>
      </div>

      {/* Timer card */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">

        {/* Active task header */}
        <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-sub uppercase tracking-widest shrink-0">Now</span>
            {allDone
              ? <span className="text-sm text-sub italic">All tasks completed</span>
              : <>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getPriority(activeTask.priority) }} />
                  <span className="text-sm font-semibold text-tx truncate">{activeTask.title}</span>
                </>
            }
          </div>
          <button onClick={onNavToTasks}
            className="text-xs text-sub hover:text-accent transition-colors flex items-center gap-0.5 shrink-0 ml-3">
            Tasks <HiChevronRight size={12} />
          </button>
        </div>

        {/* Session bar inside card */}
        {!allDone && activeTask.estimatedSessions > 0 && (
          <div className="px-5 pt-3 flex items-center gap-2">
            <div className="flex gap-1 flex-1">
              {Array.from({ length: activeTask.estimatedSessions }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                  ${i < activeTask.completedSessions ? "bg-accent" : "bg-ring"}`} />
              ))}
            </div>
            <span className="text-[11px] text-sub shrink-0">
              {activeTask.completedSessions}/{activeTask.estimatedSessions}
            </span>
          </div>
        )}

        <div className="px-5 py-4 flex flex-col items-center gap-4">

          {/* Phase badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
            ${phase === "focus" ? "bg-accent/10 text-accent" : "bg-priority-low/10 text-priority-low"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${running ? "animate-pulse" : ""}`}
              style={{ background: ringColor }} />
            {label} · {phase === "focus" ? focusMins : currentBreakMins} min
          </div>

          {/* Ring */}
          <div className="relative cursor-pointer group" style={{ width: size, height: size }}
            onClick={onNavToTimer} title="Open timer">
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
              <span className="text-[10px] text-sub/50 group-hover:text-sub transition-colors mt-0.5">
                tap to expand
              </span>
            </div>
          </div>

          {/* Start button */}
          <button onClick={onTimerToggle}
            className={`w-full py-3 rounded-xl text-white text-sm font-black active:scale-95 transition-all duration-150
              ${phase === "focus" ? "bg-accent hover:bg-accent-hover" : "bg-priority-low hover:bg-[#42c956]"}`}>
            <span className="flex items-center justify-center gap-2">
              {running
                ? <><HiPauseCircle size={16} /> Pause</>
                : <><HiPlayCircle size={16} /> {phase === "focus" ? "Start Focus" : phase === "longbreak" ? "Start Long Break" : "Start Break"}</>
              }
            </span>
          </button>

        </div>
      </div>

      {/* Up next */}
      {pendingTasks.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-sub uppercase tracking-widest px-1">Up Next</span>
          {pendingTasks.slice(0, 2).map(t => (
            <TaskCard key={t.id} task={t} onToggle={onToggleTask}
              onClick={running && phase === "focus" ? undefined : () => onSetActive(t)} compact />
          ))}
        </div>
      )}

      {/* Today's session log */}
      {todayHistory.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-sub uppercase tracking-widest px-1">Today's Sessions</span>
          <div className="rounded-2xl border border-border bg-surface px-5 py-3 flex flex-col gap-2.5">
            {todayHistory.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <HiCheckCircle size={14} className="text-accent shrink-0" />
                <span className="text-xs text-tx font-medium truncate flex-1">{s.taskTitle}</span>
                <span className="text-[11px] text-sub shrink-0">{s.focusMins}m · {formatTime(s.at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
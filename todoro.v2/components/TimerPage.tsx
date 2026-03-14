"use client"

import { useState } from "react"
import TimerRing from "../components/timer/TimerRing"
import ModeSelector, { type Mode } from "../components/timer/ModeSelector"
import TimerControls from "../components/timer/TimerControls"
import TaskSelector from "../components/timer/TaskSelector"
import { useTimerKeys } from "../hooks/useTimerKeys"
import { useIsDesktop } from "../hooks/useMediaQuery"
import { type Task } from "../components/tasks/TaskCard"

type Phase = "focus" | "break" | "longbreak"

interface TimerPageProps {
  time: number; phase: Phase; mode: Mode
  focusMins: number; breakMins: number; longBreakMins: number
  running: boolean; progress: number
  sessions: number; totalSessions: number; cycleCount: number
  tasks: Task[]; activeTask: Task
  onToggle: () => void; onReset: () => void; onSkip: () => void
  onModeChange: (mode: Mode, fm: number, bm: number) => void
  onTaskChange: (task: Task) => void
  onToggleSub: (taskId: string, subId: string) => void
}

function getPhaseLabel(phase: Phase) {
  if (phase === "focus")     return "Focus"
  if (phase === "longbreak") return "Long Break"
  return "Break"
}

function getPhaseColor(phase: Phase) {
  return phase === "focus" ? undefined : "#51CF66"
}

export default function TimerPage({
  time, phase, mode, focusMins, breakMins, longBreakMins, running, progress,
  sessions, totalSessions, cycleCount, tasks, activeTask,
  onToggle, onReset, onSkip, onModeChange, onTaskChange, onToggleSub,
}: TimerPageProps) {
  const isDesktop = useIsDesktop()
  const [focused, setFocused] = useState(false)
  useTimerKeys({ onToggle, onReset, onSkip })

  const minutes  = Math.floor(time / 60)
  const seconds  = time % 60
  const currentBreakMins = phase === "longbreak" ? longBreakMins : breakMins
  const maxTime  = phase === "focus" ? focusMins * 60 : currentBreakMins * 60
  const spentSecs  = maxTime - time
  const spentLabel = `${Math.floor(spentSecs / 60)}:${(spentSecs % 60).toString().padStart(2, "0")} elapsed`
  const phaseLabel = getPhaseLabel(phase)
  const ringColor  = getPhaseColor(phase)

  const phaseBg  = phase === "focus" ? "bg-accent/10 text-accent border-accent/20" : "bg-priority-low/10 text-priority-low border-priority-low/20"
  const phaseDot = phase === "focus" ? "bg-accent" : "bg-priority-low"

  const nextLongBreakIn = 4 - (cycleCount % 4)

  if (focused) return (
    <div className="flex flex-col items-center justify-center min-h-[75dvh] gap-8">
      <div className="text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3 border ${phaseBg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${phaseDot} ${running ? "animate-pulse" : ""}`} />
          {phaseLabel}
        </div>
        <p className="text-sm font-semibold text-tx">{activeTask.title}</p>
        {phase === "focus" && activeTask.estimatedSessions > 0 && (
          <p className="text-xs text-sub mt-1">
            {activeTask.completedSessions}/{activeTask.estimatedSessions} sessions for this task
          </p>
        )}
      </div>

      <TimerRing minutes={minutes} seconds={seconds} progress={progress}
        label={phaseLabel} spentLabel={spentLabel}
        size={isDesktop ? 320 : 260} color={ringColor} />

      {phase === "focus" && activeTask.subtasks.length > 0 && (
        <div className="w-full max-w-xs flex flex-col gap-2">
          <p className="text-xs font-semibold text-sub text-center">Subtasks</p>
          {activeTask.subtasks.map(sub => (
            <div key={sub.id} className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3 border border-border">
              <button onMouseDown={() => onToggleSub(activeTask.id, sub.id)}
                className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all
                  ${sub.done ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
                {sub.done && <svg width="8" height="8" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
              <span className={`text-sm flex-1 ${sub.done ? "line-through text-sub" : "text-tx"}`}>{sub.title}</span>
            </div>
          ))}
        </div>
      )}

      <TimerControls running={running} onToggle={onToggle} onReset={onReset} onSkip={onSkip} phase={phase} />

      <button onClick={() => setFocused(false)}
        className="flex items-center gap-1.5 text-xs text-sub hover:text-tx transition-colors">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
        Exit focus view
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-tx">Timer</h1>
          <p className="text-sm text-sub mt-0.5">
            {phase === "focus"
              ? `Session ${sessions + 1} of ${totalSessions} · long break in ${nextLongBreakIn}`
              : phase === "longbreak"
                ? "Long break — great work on 4 sessions!"
                : "Short break — you earned it"}
          </p>
        </div>
        <button onClick={() => setFocused(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface2 border border-border text-sm font-semibold text-sub hover:text-accent hover:border-accent/40 transition-all">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
          Focus view
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border ${phaseBg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${phaseDot} ${running ? "animate-pulse" : ""}`} />
            {phaseLabel}
            <span className="text-sub font-normal">·</span>
            <span className="font-normal text-sub">
              {phase === "focus" ? focusMins : phase === "longbreak" ? longBreakMins : breakMins} min
            </span>
          </div>
          <TimerRing minutes={minutes} seconds={seconds} progress={progress}
            label={phaseLabel} spentLabel={spentLabel}
            size={isDesktop ? 280 : 220} color={ringColor} />
        </div>

        <div className="flex flex-col gap-5 flex-1">
          <TaskSelector tasks={tasks} active={activeTask} onChange={onTaskChange} />
          <ModeSelector active={mode} customFocus={focusMins} customBreak={breakMins} onChange={onModeChange} />
          <TimerControls running={running} onToggle={onToggle} onReset={onReset} onSkip={onSkip} phase={phase} />

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {Array.from({ length: totalSessions }).map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300
                ${i < sessions
                  ? "w-3 h-3 bg-accent"
                  : i === sessions && phase === "focus"
                    ? "w-3 h-3 border-2 border-accent"
                    : "w-2 h-2 bg-border"}`} />
            ))}
            <span className="text-xs text-sub ml-1">{sessions} / {totalSessions} sessions</span>
          </div>

          {isDesktop && (
            <div className="flex items-center justify-center gap-4">
              {[["Space", "Play / Pause"], ["R", "Reset"], ["S", "Skip"]].map(([k, a]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <kbd className="px-2 py-0.5 rounded-lg border border-border bg-surface text-sub text-[11px] font-mono">{k}</kbd>
                  <span className="text-[11px] text-sub">{a}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress card */}
      <div className="rounded-2xl border border-border bg-surface px-5 py-4 flex flex-col gap-3">
        <div className="flex justify-between text-xs font-semibold text-sub">
          <span>
            {phase === "focus"
              ? `Focus — ${focusMins} min`
              : phase === "longbreak"
                ? `Long Break — ${longBreakMins} min`
                : `Break — ${breakMins} min`}
          </span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-ring overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ease-linear
            ${phase === "focus" ? "bg-accent" : "bg-priority-low"}`}
            style={{ width: `${progress * 100}%` }} />
        </div>

        {phase === "focus" && activeTask.estimatedSessions > 0 && (
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-sub">{activeTask.title}</p>
              <span className="text-xs text-sub">{activeTask.completedSessions}/{activeTask.estimatedSessions} sessions</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: activeTask.estimatedSessions }).map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300
                  ${i < activeTask.completedSessions ? "bg-accent" : "bg-ring"}`} />
              ))}
            </div>
          </div>
        )}

        {phase === "focus" && activeTask.subtasks.length > 0 && (
          <div className="border-t border-border pt-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-sub">{activeTask.title} — subtasks</p>
            {activeTask.subtasks.map(sub => (
              <div key={sub.id} className="flex items-center gap-3">
                <button onMouseDown={() => onToggleSub(activeTask.id, sub.id)}
                  className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all
                    ${sub.done ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
                  {sub.done && <svg width="8" height="8" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
                <span className={`text-xs ${sub.done ? "line-through text-sub" : "text-tx"}`}>{sub.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
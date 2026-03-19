"use client"

import { useState, useEffect } from "react"
import { HiArrowsPointingOut, HiChevronLeft } from "react-icons/hi2"
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

function phaseLabel(phase: Phase) {
  if (phase === "focus")     return "Focus"
  if (phase === "longbreak") return "Long Break"
  return "Break"
}

function phaseColor(phase: Phase) {
  return phase === "focus" ? undefined : "#51CF66"
}

function phaseBadge(phase: Phase) {
  return phase === "focus"
    ? "bg-accent/10 text-accent border-accent/20"
    : "bg-priority-low/10 text-priority-low border-priority-low/20"
}

function phaseDot(phase: Phase) {
  return phase === "focus" ? "bg-accent" : "bg-priority-low"
}

export default function TimerPage({
  time, phase, mode, focusMins, breakMins, longBreakMins, running, progress,
  sessions, totalSessions, cycleCount, tasks, activeTask,
  onToggle, onReset, onSkip, onModeChange, onTaskChange, onToggleSub,
}: TimerPageProps) {
  const isDesktop = useIsDesktop()
  const [focused, setFocused] = useState(false)
  useTimerKeys({ onToggle, onReset, onSkip })

  /* Auto-enter focus view when timer starts, exit when it stops */
  useEffect(() => {
    if (running) setFocused(true)
  }, [running])

  const minutes  = Math.floor(time / 60)
  const seconds  = time % 60
  const currentBreakMins = phase === "longbreak" ? longBreakMins : breakMins
  const maxTime    = phase === "focus" ? focusMins * 60 : currentBreakMins * 60
  const spentSecs  = maxTime - time
  const spentLabel = `${Math.floor(spentSecs / 60)}:${(spentSecs % 60).toString().padStart(2, "0")} elapsed`
  const label      = phaseLabel(phase)
  const ringColor  = phaseColor(phase)
  const badge      = phaseBadge(phase)
  const dot        = phaseDot(phase)

  const sessionsInCycle  = cycleCount % 4 === 0 && cycleCount > 0 ? 4 : cycleCount % 4
  const nextLongBreakIn  = 4 - sessionsInCycle
  const allDone = tasks.every(t => t.done)

  /* Shared subtask list used in both views */
  const SubtaskList = () => (
    <>
      {activeTask.subtasks.map(sub => (
        <div key={sub.id} className="flex items-center gap-3">
          <button onMouseDown={() => onToggleSub(activeTask.id, sub.id)}
            className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all
              ${sub.done ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
            {sub.done &&<span className="text-white text-[8px] font-black leading-none">✓</span>}
          </button>
          <span title={sub.title} className={`text-xs truncate flex-1 min-w-0 ${sub.done ? "line-through text-sub" : "text-tx"}`}>{sub.title}</span>
        </div>
      ))}
    </>
  )

  /* Shared session progress bar used in both views */
  const SessionBar = () => (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {Array.from({ length: activeTask.estimatedSessions }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300
            ${i < activeTask.completedSessions ? "bg-accent" : "bg-ring"}`} />
        ))}
      </div>
      <span className="text-[11px] text-sub shrink-0">
        {activeTask.completedSessions}/{activeTask.estimatedSessions} sessions
      </span>
    </div>
  )

  if (focused) return (
    <div className="flex flex-col items-center justify-center min-h-[75dvh] gap-8">

      <div className="text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3 border ${badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dot} ${running ? "animate-pulse" : ""}`} />
          {label}
        </div>
        <p className="text-sm font-semibold text-tx">{allDone ? "All tasks completed" : activeTask.title}</p>
        {!allDone && phase === "focus" && activeTask.estimatedSessions > 0 && (
          <p className="text-xs text-sub mt-1">
            {activeTask.completedSessions}/{activeTask.estimatedSessions} sessions
          </p>
        )}
      </div>

      <TimerRing minutes={minutes} seconds={seconds} progress={progress}
        label={label} spentLabel={spentLabel}
        size={isDesktop ? 320 : 260} color={ringColor} />

      {!allDone && phase === "focus" && (activeTask.estimatedSessions > 0 || activeTask.subtasks.length > 0) && (
        <div className="w-full max-w-xs flex flex-col gap-3">
          {activeTask.estimatedSessions > 0 && <SessionBar />}
          {activeTask.subtasks.length > 0 && (
            <div className="flex flex-col gap-2 bg-surface rounded-2xl border border-border px-4 py-3">
              <SubtaskList />
            </div>
          )}
        </div>
      )}

      <TimerControls running={running} onToggle={onToggle} onReset={onReset} onSkip={onSkip} phase={phase} />

      <button onClick={() => setFocused(false)}
        className="flex items-center gap-1.5 text-xs text-sub hover:text-tx transition-colors">
        <HiChevronLeft size={14} /> Exit focus view
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-tx">Timer</h1>
          <p className="text-sm text-sub mt-0.5">
            {allDone ? "All tasks completed" : phase === "focus"
              ? `Session ${sessions + 1} of ${totalSessions} · long break in ${nextLongBreakIn}`
              : phase === "longbreak"
                ? "Long break — great work on 4 sessions!"
                : "Short break — you earned it"}
          </p>
        </div>
        <button onClick={() => setFocused(true)}
          className="flex items-center gap-2 p-3 rounded-xl bg-surface2 border border-border text-sm font-semibold text-sub hover:text-accent hover:border-accent/40 transition-all">
          <HiArrowsPointingOut size={16} />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border ${badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot} ${running ? "animate-pulse" : ""}`} />
            {label}
            <span className="text-sub font-normal">·</span>
            <span className="font-normal text-sub">
              {!allDone && phase === "focus" ? focusMins : phase === "longbreak" ? longBreakMins : breakMins} min
            </span>
          </div>
          <TimerRing minutes={minutes} seconds={seconds} progress={progress}
            label={label} spentLabel={spentLabel}
            size={isDesktop ? 280 : 220} color={ringColor} />
        </div>

        <div className="flex flex-col gap-5 flex-1">
          <TaskSelector tasks={tasks} active={activeTask} running={running} onChange={onTaskChange} onStop={onReset} />
          <ModeSelector active={mode} customFocus={focusMins} customBreak={breakMins} onChange={onModeChange} />
          <TimerControls running={running} onToggle={onToggle} onReset={onReset} onSkip={onSkip} phase={phase} />

          {/* Session dots */}
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: totalSessions }).map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300
                ${i < sessions
                  ? "w-2.5 h-2.5 bg-accent"
                  : i === sessions && phase === "focus"
                    ? "w-2.5 h-2.5 border-2 border-accent"
                    : "w-2 h-2 bg-border"}`} />
            ))}
            <span className="text-xs text-sub ml-1">{sessions} / {totalSessions}</span>
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
            {!allDone && phase === "focus"
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

        {!allDone && phase === "focus" && (activeTask.estimatedSessions > 0 || activeTask.subtasks.length > 0) && (
          <div className="border-t border-border pt-3 flex flex-col gap-3">
            <p className="text-xs font-semibold text-sub">{activeTask.title}</p>
            {activeTask.estimatedSessions > 0 && <SessionBar />}
            {activeTask.subtasks.length > 0 && (
              <div className="flex flex-col gap-2">
                <SubtaskList />
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
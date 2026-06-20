"use client"

import { useState, useEffect } from "react"
import { HiArrowsPointingOut, HiChevronLeft, HiArrowTopRightOnSquare } from "react-icons/hi2"
import TimerRing from "../components/timer/TimerRing"
import ModeSelector, { type Mode } from "../components/timer/ModeSelector"
import TimerControls from "../components/timer/TimerControls"
import TaskSelector from "../components/timer/TaskSelector"
import { useTimerKeys } from "../hooks/useTimerKeys"
import { useIsDesktop } from "../hooks/useMediaQuery"
import { usePiP } from "../hooks/usePiP"
import { type Task } from "../components/tasks/TaskCard"
import { type SessionRecord } from "../app/page"

type Phase = "focus" | "break" | "longbreak"

interface TimerPageProps {
  time: number; phase: Phase; mode: Mode
  focusMins: number; breakMins: number; longBreakMins: number
  running: boolean; progress: number
  sessions: number; totalSessions: number; cycleCount: number
  tasks: Task[]; activeTask: Task; quickMode: boolean; allHistory: SessionRecord[]
  reverseMode: boolean; dark: boolean;
  onToggle: () => void; onReset: () => void; onSkip: () => void
  onModeChange: (mode: Mode, fm: number, bm: number) => void
  onTaskChange: (task: Task) => void
  onToggleSub: (taskId: string, subId: string) => void
  onFocusedChange?: (focused: boolean) => void
  onQuickMode: (v: boolean) => void
  onStopAndRest: () => void
  onReverseMode: (v: boolean) => void
}

const PHASE = {
  focus:     { label: "Focus",      color: undefined,  badge: "bg-accent/10 text-accent border-accent/20",                   dot: "bg-accent"       },
  break:     { label: "Break",      color: "#51CF66",  badge: "bg-priority-low/10 text-priority-low border-priority-low/20", dot: "bg-priority-low" },
  longbreak: { label: "Long Break", color: "#51CF66",  badge: "bg-priority-low/10 text-priority-low border-priority-low/20", dot: "bg-priority-low" },
}

export default function TimerPage({
  time, phase, mode, focusMins, breakMins, longBreakMins, running, progress,
  sessions, totalSessions, cycleCount, tasks, activeTask, quickMode, allHistory,
  reverseMode, dark,
  onToggle, onReset, onSkip, onModeChange, onTaskChange, onToggleSub,
  onFocusedChange, onQuickMode, onStopAndRest, onReverseMode,
}: TimerPageProps) {
  const [focused, setFocused] = useState(false)
  const [pipActive,  setPipActive]  = useState(false)
  const isDesktop = useIsDesktop()
  useTimerKeys({ onToggle, onReset, onSkip })

  useEffect(() => { if (running) setFocused(true) }, [running])
  useEffect(() => { onFocusedChange?.(focused) }, [focused, onFocusedChange])

  const minutes = Math.floor(time / 60), seconds = time % 60
  const currentBreakMins = phase === "longbreak" ? longBreakMins : breakMins
  const maxTime = phase === "focus" ? focusMins * 60 : currentBreakMins * 60
  const spentSecs = maxTime - time
  const spentLabel = `${Math.floor(spentSecs / 60)}:${(spentSecs % 60).toString().padStart(2, "0")} elapsed`
  const allDone = tasks.every(t => t.done)
  const { label, color, badge, dot } = PHASE[phase]

  // Badge label shows "↑ Focus" in reverse mode focus phase
  const badgeLabel = reverseMode && phase === "focus" ? "↑ Focus" : label

  const localDate = (ts: number = Date.now()) => {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }
  const todayKey = localDate()
  const todaySessionsForTask = allHistory.filter(s => s.taskId === activeTask.id && localDate(s.at) === todayKey).length

  const taskTitle = quickMode && !activeTask.title ? "" : activeTask.title

  // ── PiP state (kept stable so we can sync into PiP window) ──────
  const pipState = {
    time, phase, running, progress,
    taskTitle: taskTitle ?? "",
    dark,
  }
  const pip = usePiP(pipState, { onToggle, onSkip })

  const handlePiP = async () => {
    if (pipActive) { pip.close(); setPipActive(false); return }
    if (pip.supportsPiP) {
      const ok = await pip.open()
      if (ok) { setPipActive(true); return }
    }
    alert("Picture-in-Picture is not supported in this browser.")
  }

  // Rolling 25-min cycle progress for the progress bar in reverse mode
  const REVERSE_CYCLE = 25 * 60
  const reverseBarProgress = reverseMode && phase === "focus"
    ? ((time % REVERSE_CYCLE) / REVERSE_CYCLE) * 100
    : progress * 100

  const SubtaskList = () => <>{activeTask.subtasks.map(s => (
    <div key={s.id} className="flex items-center gap-3">
      <button onMouseDown={() => onToggleSub(activeTask.id, s.id)}
        className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${s.done ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
        {s.done && <span className="text-white text-[8px] font-black">✓</span>}
      </button>
      <span className={`text-xs truncate flex-1 ${s.done ? "line-through text-sub" : "text-tx"}`}>{s.title}</span>
    </div>
  ))}</>

  const SessionBar = () => (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {Array.from({ length: activeTask.estimatedSessions }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < activeTask.completedSessions ? "bg-accent" : "bg-ring"}`} />
        ))}
      </div>
      <span className="text-[11px] text-sub">{activeTask.completedSessions}/{activeTask.estimatedSessions}</span>
    </div>
  )

  if (focused) return (
    <div className="flex flex-col items-center justify-center min-h-[75dvh] max-h-screen gap-8">
      <div className="text-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3 border ${badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dot} ${running ? "animate-pulse" : ""}`} />
          {badgeLabel}
        </div>
        {quickMode && !activeTask.title ? (
          <p className="text-sm font-semibold text-tx">Quick Mode</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-tx">{allDone ? "All tasks completed 🎉" : activeTask.title}</p>
            {!allDone && phase === "focus" && todaySessionsForTask > 0 && (
              <p className="text-xs text-sub mt-1">{todaySessionsForTask} {todaySessionsForTask === 1 ? "Pomodoro" : "Pomodoros"} today</p>
            )}
          </>
        )}
      </div>
      <TimerRing
        minutes={minutes} seconds={seconds} progress={progress}
        label={badgeLabel} spentLabel={spentLabel}
        size={isDesktop ? 320 : 260} color={color}
        reverseMode={reverseMode && phase === "focus"} />
      <TimerControls
        running={running} onToggle={onToggle} onReset={onReset} onSkip={onSkip}
        phase={phase} reverseMode={reverseMode} onStopAndRest={onStopAndRest} />
      <button onClick={() => setFocused(false)} className="flex items-center gap-1.5 text-xs text-sub hover:text-tx">
        <HiChevronLeft size={14} /> Exit focus view
      </button>
      <button onClick={handlePiP}
        className={`flex items-center gap-1.5 text-xs transition-colors
          ${pipActive ? "text-accent" : "text-sub hover:text-tx"}`}>
        <HiArrowTopRightOnSquare size={14} />
        {pip.supportsPiP
          ? (pipActive ? "Close PiP" : "Picture-in-Picture")
          : ("PiP not supported")}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-tx">Timer</h1>
          <p className="text-sm text-sub mt-0.5">
            {allDone ? "All tasks completed 🎉" : `Session ${sessions + 1}/${totalSessions}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* PiP / Float button */}
          <button onClick={handlePiP}
            title={pip.supportsPiP ? "Picture-in-Picture" : "Float window (not supported)"}
            className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all
              ${pipActive
                ? "bg-accent/10 border-accent/40 text-accent"
                : "bg-surface border-border text-sub hover:text-accent hover:border-accent/40"}`}>
            <HiArrowTopRightOnSquare size={16} />
          </button>
          {/* Focus view */}
          <button onClick={() => setFocused(true)}
            className="flex items-center gap-2 p-3 rounded-xl bg-surface2 border border-border text-sm font-semibold text-sub hover:text-accent hover:border-accent/40">
            <HiArrowsPointingOut size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col-reverse lg:flex-row gap-4">
        <div className="flex flex-col items-center gap-3 sm:min-w-2xl shrink-0 bg-surface border border-border rounded-2xl py-6">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border ${badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot} ${running ? "animate-pulse" : ""}`} />
            {badgeLabel}
            <span className="text-sub">·</span>
            <span className="text-sub">
              {reverseMode && phase === "focus"
                ? "open-ended"
                : `${!allDone && phase === "focus" ? focusMins : phase === "longbreak" ? longBreakMins : breakMins} min`}
            </span>
          </div>
          <TimerRing
            minutes={minutes} seconds={seconds} progress={progress}
            label={badgeLabel} spentLabel={spentLabel}
            size={isDesktop ? 280 : 220} color={color}
            reverseMode={reverseMode && phase === "focus"} />
          <TimerControls
            running={running} onToggle={onToggle} onReset={onReset} onSkip={onSkip}
            phase={phase} reverseMode={reverseMode} onStopAndRest={onStopAndRest} />
        </div>

        <div className="flex flex-col-reverse lg:flex-col flex-1 gap-5">
          <div className="flex flex-col gap-3 bg-surface border border-border rounded-2xl px-5 py-4">
            <TaskSelector tasks={tasks} active={activeTask} running={running} onChange={onTaskChange} onStop={onReset} quickMode={quickMode} />
            <ModeSelector
              active={mode} customFocus={focusMins} customBreak={breakMins}
              onChange={onModeChange}
              reverseMode={reverseMode}
              onReverseMode={onReverseMode}
              quickMode={quickMode}
              onQuickMode={onQuickMode} />
            {isDesktop && (
              <div className="flex items-center justify-center gap-4">
                {[["Space", "Play/Pause"], ["R", "Reset"], ["S", "Skip"]].map(([k, a]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <kbd className="px-2 py-0.5 rounded-lg border border-border bg-surface text-[11px] font-mono">{k}</kbd>
                    <span className="text-[11px] text-sub">{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface px-5 py-4 flex flex-col gap-3">
            <div className="flex justify-between text-xs font-semibold text-sub">
              <span>
                {reverseMode && phase === "focus"
                  ? "↑ Counting up"
                  : !allDone && phase === "focus" ? `Focus — ${focusMins} min`
                  : phase === "longbreak" ? `Long Break — ${longBreakMins} min`
                  : `Break — ${currentBreakMins} min`}
              </span>
              <span>
                {reverseMode && phase === "focus"
                  ? `${minutes}m elapsed`
                  : `${Math.round(progress * 100)}%`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-ring overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${phase === "focus" ? "bg-accent" : "bg-priority-low"}`}
                style={{ width: `${reverseBarProgress}%` }} />
            </div>
            {!allDone && phase === "focus" && (
              <div className="border-t border-border pt-3 flex flex-col gap-3">
                {!quickMode || activeTask.title ? (
                  <>
                    <p className="text-xs font-semibold text-sub">{activeTask.title}</p>
                    {todaySessionsForTask > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-sub">{todaySessionsForTask} {todaySessionsForTask === 1 ? "Pomodoro" : "Pomodoros"} today</span>
                        <div className="flex gap-1 flex-1">
                          {Array.from({ length: Math.min(todaySessionsForTask, 5) }).map((_, i) => (
                            <div key={i} className="h-1.5 flex-1 rounded-full bg-accent" />
                          ))}
                        </div>
                      </div>
                    )}
                    {activeTask.estimatedSessions > 0 && (
                      <>
                        <p className="text-xs font-semibold text-sub mt-2">Session Goal</p>
                        <SessionBar />
                      </>
                    )}
                    {activeTask.subtasks.length > 0 && <SubtaskList />}
                  </>
                ) : (
                  <p className="text-xs text-sub italic">No task selected — Quick Mode active</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
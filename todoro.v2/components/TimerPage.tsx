"use client"

import { useState, useEffect } from "react"
import { HiArrowsPointingOut, HiChevronLeft, HiChevronRight, HiArrowTopRightOnSquare, HiCheck } from "react-icons/hi2"
import TimerRing from "../components/timer/TimerRing"
import SessionSheet, { type Mode } from "../components/timer/SessionSheet"
import TimerControls from "../components/timer/TimerControls"
import TaskSelector from "../components/timer/TaskSelector"
import Panel from "../components/shared/Panel"
import { useTimerKeys } from "../hooks/useTimerKeys"
import { useIsDesktop, useIsNarrow } from "../hooks/useMediaQuery"
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
  autoStart: boolean
  onAutoStart: (v: boolean) => void
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
  autoStart, onAutoStart,
}: TimerPageProps) {
  const [focused, setFocused] = useState(false)
  const [sheetOpen,  setSheetOpen]  = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const isDesktop = useIsDesktop()
  // The one fixed-pixel element here: 260px clears a 300px screen by a single
  // pixel and overflows anything narrower.
  const isNarrow  = useIsNarrow()
  const ringSize  = isDesktop ? 300 : isNarrow ? 216 : 260
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
  const sessionCaption = allDone
    ? "All tasks completed"
    : phase === "focus"
      ? `Session ${Math.min(sessions + 1, totalSessions)} of ${totalSessions}`
      : "Take a break"

  const localDate = (ts: number = Date.now()) => {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  }
  const todayKey = localDate()
  const todayLog = allHistory.filter(s => localDate(s.at) === todayKey).slice().reverse()
  const todaySessionsForTask = allHistory.filter(s => s.taskId === activeTask.id && localDate(s.at) === todayKey).length

  const taskTitle = quickMode && !activeTask.title ? "" : activeTask.title

  // ── PiP state (kept stable so we can sync into PiP window) ──────
  const pipState = {
    time, phase, running, progress,
    taskTitle: taskTitle ?? "",
    dark,
  }
  // `auto` lets the window follow the user out of the app and close on their
  // return; open state lives in the hook now, since it is no longer only this
  // button that opens it.
  const pip = usePiP(pipState, { onToggle, onSkip, auto: true })

  const handlePiP = async () => {
    if (pip.isOpen) { pip.close(); return }
    if (pip.supportsPiP) {
      if (await pip.open()) return
      return   // the request was refused or dismissed — nothing to announce
    }
    alert("Picture-in-Picture is not supported in this browser.")
  }

  const SubtaskList = () => <>{activeTask.subtasks.map(s => (
    <div key={s.id} className="flex items-center gap-2">
      <button onClick={() => onToggleSub(activeTask.id, s.id)}
        aria-pressed={s.done}
        aria-label={s.done ? `Mark "${s.title}" as not done` : `Complete "${s.title}"`}
        className="w-11 h-11 -ml-3.5 -my-2 shrink-0 grid place-items-center">
        <span className={`w-4.5 h-4.5 rounded border-2 grid place-items-center transition-colors
          ${s.done ? "bg-accent border-accent" : "border-border"}`}>
          {s.done && <HiCheck size={9} className="text-white" />}
        </span>
      </button>
      <span className={`text-meta truncate flex-1 ${s.done ? "line-through text-sub" : "text-tx"}`}>{s.title}</span>
    </div>
  ))}</>

  const SessionBar = () => (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-1">
        {Array.from({ length: activeTask.estimatedSessions }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-chip ${i < activeTask.completedSessions ? "bg-accent" : "bg-border"}`} />
        ))}
      </div>
      <span className="text-caption text-sub">{activeTask.completedSessions}/{activeTask.estimatedSessions}</span>
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
            <p className="text-sm font-semibold text-tx">{allDone ? "All tasks completed" : activeTask.title}</p>
            {!allDone && phase === "focus" && todaySessionsForTask > 0 && (
              <p className="text-xs text-sub mt-1">{todaySessionsForTask} {todaySessionsForTask === 1 ? "Pomodoro" : "Pomodoros"} today</p>
            )}
          </>
        )}
      </div>
      <TimerRing
        minutes={minutes} seconds={seconds} progress={progress}
        caption={reverseMode && phase === "focus" ? spentLabel : sessionCaption}
        size={isDesktop ? 340 : isNarrow ? 236 : 280} color={color}
        reverseMode={reverseMode && phase === "focus"} />
      <TimerControls minimal
        running={running} onToggle={onToggle} onReset={onReset} onSkip={onSkip}
        phase={phase} reverseMode={reverseMode} onStopAndRest={onStopAndRest} />
      <button onClick={() => setFocused(false)} className="flex items-center gap-1.5 text-xs text-sub hover:text-tx">
        <HiChevronLeft size={14} /> Exit focus view
      </button>
      <button onClick={handlePiP}
        className={`flex items-center gap-1.5 text-xs transition-colors
          ${pip.isOpen ? "text-accent" : "text-sub hover:text-tx"}`}>
        <HiArrowTopRightOnSquare size={14} />
        {pip.supportsPiP
          ? (pip.isOpen ? "Close PiP" : "Picture-in-Picture")
          : ("PiP not supported")}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-gutter">

      {/* Header — phone only; the top bar carries it on large screens */}
      <div className="flex items-center gap-2">
        <div className="md:hidden min-w-0">
          <h1 className="text-title font-extrabold text-tx leading-tight">Timer</h1>
          <p className="text-meta text-sub">
            {allDone ? "All tasks completed" : `Session ${Math.min(sessions + 1, totalSessions)} of ${totalSessions}`}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handlePiP}
            aria-label="Picture-in-Picture"
            aria-pressed={pip.isOpen}
            title={pip.supportsPiP ? "Picture-in-Picture" : "Float window (not supported)"}
            className={`w-11 h-11 grid place-items-center rounded-control border transition-all
              ${pip.isOpen
                ? "bg-accent/10 border-accent/40 text-accent"
                : "bg-surface border-border text-sub hover:text-accent hover:border-accent/40"}`}>
            <HiArrowTopRightOnSquare size={17} />
          </button>
          <button onClick={() => setFocused(true)}
            aria-label="Enter focus view"
            className="w-11 h-11 grid place-items-center rounded-control bg-surface border border-border
              text-sub hover:text-accent hover:border-accent/40 transition-all">
            <HiArrowsPointingOut size={17} />
          </button>
        </div>
      </div>

      {/* ── The timer. One ring, one button. ─────────────────────────────── */}
      <Panel className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          {/* Filled chip — the phase is the loudest fact on this screen */}
          <span className="inline-flex items-center gap-2 min-h-9 px-4 rounded-pill bg-accent text-white
            text-caption font-extrabold uppercase tracking-wider">
            {running && <span className="w-2 h-2 rounded-pill bg-white animate-pulse" />}
            {badgeLabel} · {reverseMode && phase === "focus"
              ? "open"
              : `${phase === "focus" ? focusMins : currentBreakMins} min`}
          </span>
          <span className="ml-auto text-caption font-extrabold uppercase tracking-wider text-tx tabular-nums">
            {reverseMode && phase === "focus"
              ? `${minutes}m elapsed`
              : `${Math.round(progress * 100)}% through`}
          </span>
        </div>

        <div className="self-center py-2">
          <TimerRing
            minutes={minutes} seconds={seconds} progress={progress}
            caption={reverseMode && phase === "focus" ? spentLabel : sessionCaption}
            size={ringSize} color={color}
            reverseMode={reverseMode && phase === "focus"} />
        </div>

        {/* Working on — one line. The switcher hides behind "Change" so the row
            doesn't become a second control competing with Start. */}
        <div className="flex items-center gap-3 border-y border-border py-3">
          <span className="text-caption font-extrabold uppercase tracking-wider text-sub shrink-0">
            Working on
          </span>
          <span className="flex-1 min-w-0 text-meta font-extrabold text-tx truncate">
            {quickMode && !activeTask.title ? "Quick focus" : allDone ? "All tasks done" : activeTask.title}
          </span>
          <button onClick={() => setPickerOpen(v => !v)} aria-expanded={pickerOpen}
            className="shrink-0 min-h-11 px-1 text-meta font-extrabold text-accent hover:underline">
            Change
          </button>
        </div>

        {pickerOpen && (
          <TaskSelector tasks={tasks} active={activeTask} quickMode={quickMode}
            onChange={t => { onTaskChange(t); setPickerOpen(false) }} />
        )}

        {!allDone && phase === "focus" && activeTask.estimatedSessions > 0 && <SessionBar />}
        {!allDone && phase === "focus" && activeTask.subtasks.length > 0 && (
          <div className="flex flex-col gap-2"><SubtaskList /></div>
        )}

        <TimerControls
          running={running} onToggle={onToggle} onReset={onReset} onSkip={onSkip}
          phase={phase} reverseMode={reverseMode} onStopAndRest={onStopAndRest} />

        {isDesktop && (
          <div className="flex items-center justify-center gap-4 border-t border-border pt-4">
            {[["Space", "Play/Pause"], ["R", "Reset"], ["S", "Skip"]].map(([k, a]) => (
              <div key={k} className="flex items-center gap-1.5">
                <kbd className="px-2 py-0.5 rounded-chip border border-border bg-surface text-caption font-mono">{k}</kbd>
                <span className="text-caption text-sub">{a}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">

        {/* ── Today's sessions ──────────────────────────────────────────── */}
        <Panel className="flex flex-col">
          <h3 className="text-caption font-extrabold uppercase tracking-wider text-tx mb-1">Today&apos;s sessions</h3>
          {todayLog.length === 0 ? (
            <p className="text-meta text-sub py-3">Nothing logged yet — the first one starts above.</p>
          ) : todayLog.map((s, i) => (
            <div key={`${s.at}-${i}`} className="flex items-center gap-3 py-3 border-t border-border">
              <span className="w-2.5 h-2.5 rounded-pill bg-accent shrink-0" />
              <span className="flex-1 min-w-0 text-meta text-tx truncate">
                {s.taskTitle || "Quick focus"}
              </span>
              <span className="text-caption text-sub tabular-nums shrink-0">
                {new Date(s.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </Panel>

        {/* ── Session settings ──────────────────────────────────────────── */}
        <Panel className="flex flex-col">
          <h3 className="text-caption font-extrabold uppercase tracking-wider text-tx mb-1">Session settings</h3>
          <button onClick={() => setSheetOpen(true)}
            className="flex items-center gap-3 py-4 border-t border-border text-left">
            <span className="flex-1 min-w-0">
              <span className="block text-lead font-extrabold text-tx">Length &amp; modes</span>
              <span className="block text-meta text-sub">
                {reverseMode ? "Counting up" : `${focusMins} + ${breakMins} min`}
                {" · "}{autoStart ? "auto-start on" : "manual start"}
                {quickMode ? " · quick focus" : ""}
              </span>
            </span>
            <HiChevronRight size={17} className="text-sub shrink-0" />
          </button>
          <div className="flex items-center gap-3 py-4 border-t border-border">
            <span className="flex-1 min-w-0">
              <span className="block text-lead font-extrabold text-tx">Daily goal</span>
              <span className="block text-meta text-sub">{totalSessions} sessions a day · set in Settings</span>
            </span>
          </div>
        </Panel>
      </div>

      {sheetOpen && (
        <SessionSheet
          mode={mode} focusMins={focusMins} breakMins={breakMins}
          onModeChange={onModeChange}
          quickMode={quickMode} onQuickMode={onQuickMode}
          reverseMode={reverseMode} onReverseMode={onReverseMode}
          autoStart={autoStart} onAutoStart={onAutoStart}
          onClose={() => setSheetOpen(false)} />
      )}
    </div>
  )
}
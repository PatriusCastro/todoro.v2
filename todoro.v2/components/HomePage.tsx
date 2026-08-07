"use client"

import { HiStar, HiPlay, HiPause, HiChevronRight, HiArrowRight, HiFire, HiCheckCircle, HiBolt } from "react-icons/hi2"
import TaskCard, { type Task } from "../components/tasks/TaskCard"
import { type Project } from "../components/tasks/TaskModal"
import { sortTasks } from "../lib/taskOrder"
import { usePinnedTasks } from "../hooks/usePinnedTasks"
import StatTile from "./shared/StatTile"
import Panel from "./shared/Panel"
import SectionHeader from "./shared/SectionHeader"

type Phase = "focus" | "break" | "longbreak"

interface HomePageProps {
  time: number; phase: Phase
  breakMins: number; longBreakMins: number
  running: boolean; progress: number
  sessions: number; totalSessions: number
  onTimerToggle: () => void; onNavToTimer: () => void
  tasks: Task[]; activeTask: Task; projects: Project[]
  onToggleTask: (id: string) => void
  onNavToTasks: () => void; onOpenTask: (t: Task) => void
  onStartFocus: (t: Task) => void
  streak: number; totalPoints: number; greeting: string; userName: string
  avatarUrl: string; onNavToSettings: () => void
  allHistory: { taskId: string; taskTitle: string; focusMins: number; at: number }[]
  quickMode: boolean
  onOpenShop: () => void; canRestore: boolean; level: number
}

function localDate(ts: number = Date.now()) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]

export default function HomePage({
  time, phase, breakMins, longBreakMins, running, progress,
  sessions, totalSessions, onTimerToggle, onNavToTimer,
  tasks, activeTask, projects, onToggleTask, allHistory,
  onNavToTasks, onOpenTask, onStartFocus, streak, totalPoints, greeting, userName,
  avatarUrl, onNavToSettings, quickMode, onOpenShop, canRestore, level,
}: HomePageProps) {
  const minutes = Math.floor(time / 60)
  const seconds = time % 60
  const timeLabel = `${minutes}:${String(seconds).padStart(2, "0")}`
  const firstName = userName.split(" ")[0] || "there"
  const currentBreakMins = phase === "longbreak" ? longBreakMins : breakMins

  const { pinned } = usePinnedTasks()
  const pendingTasks = sortTasks(tasks.filter(t => !t.done && t.id !== activeTask.id), undefined, pinned)
  const doneTasks    = tasks.filter(t => t.done)
  const allDone      = tasks.length > 0 && tasks.every(t => t.done)

  // ── This week ────────────────────────────────────────────────────────────
  const todayStr = localDate()
  const sessionsByDate = allHistory.reduce<Record<string, number>>((acc, s) => {
    const d = localDate(s.at); acc[d] = (acc[d] ?? 0) + 1; return acc
  }, {})
  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())   // back to Sunday
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)
    const ds = localDate(d.getTime())
    return { ds, label: DAY_LABELS[i], count: sessionsByDate[ds] ?? 0, isToday: ds === todayStr }
  })
  const weekPeak  = Math.max(1, ...week.map(d => d.count))
  const weekTotal = week.reduce((n, d) => n + d.count, 0)
  const weekMins  = allHistory
    .filter(s => week.some(d => d.ds === localDate(s.at)))
    .reduce((n, s) => n + s.focusMins, 0)

  // ── Projects ─────────────────────────────────────────────────────────────
  const projectRows = projects.map(p => {
    const owned = tasks.filter(t => t.projectId === p.id)
    const done  = owned.filter(t => t.done).length
    return { ...p, total: owned.length, done, progress: owned.length ? done / owned.length : 0 }
  })

  // ── Focus poster ─────────────────────────────────────────────────────────
  const kicker = running
    ? (phase === "focus" ? "Focusing now" : "On a break")
    : phase === "focus" ? "Next up · focus" : "Next up · break"
  const posterTitle = quickMode && !activeTask.title
    ? "Quick focus"
    : allDone ? "Everything's done" : (activeTask.title || "Nothing queued yet")
  const posterMeta = [
    activeTask.estimatedSessions > 0
      ? `${activeTask.completedSessions} of ${activeTask.estimatedSessions} sessions`
      : null,
    activeTask.dueLabel && activeTask.dueLabel !== "No due date" ? activeTask.dueLabel.toLowerCase() : null,
  ].filter(Boolean).join(" · ")
  const runLabel = running
    ? "Pause"
    : phase === "focus" ? "Start focus" : phase === "longbreak" ? "Long break" : "Start break"

  return (
    <div className="flex flex-col gap-gutter">

      {/* Greeting — phone only; large screens carry it in the top bar */}
      <div className="flex items-center gap-3">
        <button onClick={onNavToSettings} aria-label="Open settings" className="relative shrink-0 md:hidden">
          <span className={`block w-12 h-12 rounded-control overflow-hidden border-2 transition-colors
            ${running ? "border-accent" : "border-border"}`}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className="w-full h-full bg-surface2 flex items-center justify-center text-tx font-extrabold text-meta">
                  {firstName.slice(0, 2).toUpperCase()}
                </span>
            }
          </span>
        </button>
        <div className="md:hidden min-w-0">
          <p className="text-meta text-sub">{greeting}</p>
          <h1 className="text-title font-extrabold text-tx leading-tight truncate">{firstName}</h1>
        </div>
        <button onClick={onOpenShop}
          className="ml-auto shrink-0 flex items-center gap-2 min-h-11 px-3.5 rounded-control border border-border
            bg-surface hover:border-accent/40 active:scale-95 transition-all">
          <span className="text-caption font-extrabold uppercase tracking-wider text-tx">Lv {level}</span>
          <HiStar size={14} className="text-sub" />
          <span className="text-lead font-extrabold text-tx tabular-nums">{totalPoints}</span>
        </button>
      </div>

      {/* Streak restore nudge */}
      {canRestore && (
        <button onClick={onOpenShop}
          className="flex items-center gap-3 rounded-panel border border-priority-low/40 bg-priority-low/5 px-4 py-3.5 text-left hover:border-priority-low/60 transition-colors">
          <HiFire size={18} className="text-priority-low shrink-0" />
          <p className="text-meta font-semibold text-tx flex-1">
            Your streak broke — tap to restore it with a Streak Freeze.
          </p>
          <HiChevronRight size={16} className="text-sub shrink-0" />
        </button>
      )}

      {/* ── Focus poster — the only glowing thing on the page ──────────────── */}
      <div className="rounded-panel bg-accent text-bg shadow-glow px-4 xs:px-5 py-5 flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-caption font-extrabold uppercase tracking-widest">
          <span className={`w-2 h-2 rounded-pill bg-bg shrink-0 ${running ? "animate-pulse" : ""}`} />
          <span>{kicker}</span>
          <span className="ml-auto opacity-85 tracking-wider">
            {phase === "focus" ? `Session ${Math.min(sessions + 1, totalSessions)} of ${totalSessions}` : `${currentBreakMins} min break`}
          </span>
        </div>

        {/* 32px on a 300px screen is four or five characters a line — the
            poster stops being a headline and becomes a wall. */}
        <h2 className="text-title xs:text-display font-extrabold leading-none wrap-break-words line-clamp-2">
          {posterTitle}
        </h2>

        {posterMeta && <p className="text-meta opacity-90 -mt-1">{posterMeta}</p>}

        <div className="h-1.5 rounded-chip bg-bg/30 overflow-hidden">
          <div className="h-full rounded-chip bg-bg transition-[width] duration-1000 ease-linear"
            style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>

        {/* Label and clock share one button, so this is the tightest row on the
            page. Below 380px the type, padding and gaps step down rather than
            letting "Start focus" break across two lines. */}
        <div className="flex gap-2">
          <button onClick={onTimerToggle}
            className="flex-1 min-w-0 min-h-14 flex items-center gap-2 xs:gap-3 px-3.5 xs:px-5 rounded-control bg-bg text-tx
              text-lead xs:text-heading font-extrabold whitespace-nowrap hover:brightness-95 active:scale-[0.98] transition-all">
            {running
              ? <HiPause size={18} className="shrink-0" />
              : <HiPlay size={18} className="shrink-0" />}
            <span className="truncate">{runLabel}</span>
            <span className="ml-auto shrink-0 tabular-nums tracking-tight">{timeLabel}</span>
          </button>
          <button onClick={onNavToTimer} aria-label="Open the timer"
            className="w-12 xs:w-14 min-h-14 shrink-0 grid place-items-center rounded-control bg-bg/20 text-bg
              hover:bg-bg/30 active:scale-95 transition-all">
            <HiChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* ── Today at a glance ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-gutter">
        <StatTile label="Sessions" value={sessions} suffix={`of ${totalSessions}`}
          footnote={
            <div className="flex gap-1 mt-0.5">
              {Array.from({ length: totalSessions }).map((_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-chip transition-colors duration-500
                  ${i < sessions ? "bg-accent" : "bg-border"}`} />
              ))}
            </div>
          } />
        <StatTile icon={<HiFire size={14} />} label="Streak" value={`${streak}d`}
          footnote={streak > 0 ? "Keep going" : "Start today"} />
        <StatTile icon={<HiCheckCircle size={14} />} label="Done" value={doneTasks.length}
          footnote={`${tasks.length - doneTasks.length} open`} />
      </div>

      {/* ── Up next ────────────────────────────────────────────────────────── */}
      <Panel className="flex flex-col">
        <SectionHeader
          action={
            <button onClick={onNavToTasks}
              className="flex items-center gap-1 min-h-11 text-meta font-extrabold text-accent hover:underline">
              All tasks <HiArrowRight size={14} />
            </button>
          }>
          Up next
        </SectionHeader>

        {pendingTasks.length === 0 ? (
          <p className="text-meta text-sub py-3 border-t border-border">
            {allDone ? "Everything's done. Enjoy the quiet." : "Nothing queued — add what's on your mind."}
          </p>
        ) : (
          <>
            {pendingTasks.slice(0, 3).map(t => (
              <TaskCard key={t.id} task={t} onToggle={onToggleTask}
                onClick={() => onOpenTask(t)} onQuickStart={onStartFocus}
                isPinned={pinned.has(t.id)} compact />
            ))}
            {pendingTasks.length > 3 && (
              <button onClick={onNavToTasks}
                className="min-h-11 text-meta text-sub hover:text-accent transition-colors text-left border-t border-border">
                +{pendingTasks.length - 3} more
              </button>
            )}
          </>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">

        {/* ── This week ────────────────────────────────────────────────────── */}
        <Panel className="flex flex-col gap-3">
          <SectionHeader meta={`${weekTotal} session${weekTotal === 1 ? "" : "s"}`}>This week</SectionHeader>
          <div className="grid grid-cols-7 gap-1.5 items-end h-24">
            {week.map(d => (
              <div key={d.ds} className="h-full flex items-end">
                <span aria-hidden="true"
                  className={`block w-full rounded-chip transition-colors ${d.isToday ? "bg-accent" : "bg-surface2"}`}
                  style={{ height: `${Math.max(6, (d.count / weekPeak) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5 border-t border-border pt-2">
            {week.map(d => (
              <span key={d.ds}
                className={`text-center text-caption font-semibold ${d.isToday ? "text-accent" : "text-sub"}`}>
                {d.label}
              </span>
            ))}
          </div>
          <p className="text-caption text-sub">
            {weekMins >= 60 ? `${Math.floor(weekMins / 60)}h ${weekMins % 60}m` : `${weekMins}m`} focused
          </p>
        </Panel>

        {/* ── Projects ─────────────────────────────────────────────────────── */}
        <Panel className="flex flex-col gap-1">
          <SectionHeader meta={projectRows.length ? `${projectRows.length} active` : "none yet"}>Projects</SectionHeader>
          {projectRows.length === 0 ? (
            <button onClick={onNavToTasks}
              className="min-h-11 text-meta text-sub hover:text-accent transition-colors text-left">
              Group related tasks into a project →
            </button>
          ) : projectRows.map(p => (
            <button key={p.id} onClick={onNavToTasks}
              className="flex flex-col gap-2 py-2.5 border-t border-border text-left first:border-t-0 hover:opacity-80 transition-opacity">
              <span className="flex items-baseline gap-2">
                <span className="text-meta font-extrabold text-tx truncate">{p.name}</span>
                <span className="ml-auto text-caption text-sub tabular-nums shrink-0">
                  {p.total === 0 ? "empty" : `${p.done}/${p.total}`}
                </span>
              </span>
              <span className="block h-1.5 rounded-chip bg-surface2 overflow-hidden">
                <span className="block h-full rounded-chip transition-[width] duration-500"
                  style={{ width: `${p.progress * 100}%`, backgroundColor: p.color }} />
              </span>
            </button>
          ))}
        </Panel>
      </div>

      {quickMode && (
        <p className="flex items-center gap-1.5 text-caption text-sub">
          <HiBolt size={12} className="text-accent" /> Quick Mode — sessions aren&apos;t tied to a task
        </p>
      )}
    </div>
  )
}

"use client"

import TaskCard, { type Task } from "../components/tasks/TaskCard"
import { type Mode } from "../components/timer/ModeSelector"
import { colors } from "../lib/theme"

type Phase = "focus" | "break"

interface HomePageProps {
  time: number; phase: Phase; mode: Mode
  focusMins: number; breakMins: number
  running: boolean; progress: number
  sessions: number; totalSessions: number
  onTimerToggle: () => void; onNavToTimer: () => void
  tasks: Task[]; activeTask: Task
  onToggleTask: (id: string) => void; onToggleSub: (tId: string, sId: string) => void
  onNavToTasks: () => void; onSetActive: (t: Task) => void
  streak: number; totalPoints: number; greeting: string; userName: string
}

export default function HomePage({
  time, phase, mode, focusMins, breakMins, running, progress,
  sessions, totalSessions, onTimerToggle, onNavToTimer,
  tasks, activeTask, onToggleTask, onToggleSub,
  onNavToTasks, onSetActive, streak, totalPoints, greeting, userName,
}: HomePageProps) {
  const minutes   = Math.floor(time / 60)
  const seconds   = time % 60
  const maxTime   = phase === "focus" ? focusMins * 60 : breakMins * 60
  const spent     = maxTime - time
  const spentFmt  = `${Math.floor(spent / 60)}:${(spent % 60).toString().padStart(2, "0")}`
  const firstName = userName.split(" ")[0]
  const ringColor = phase === "focus" ? colors.accent : "#51CF66"
  const ringGlow  = phase === "focus" ? colors.accentGlow : "rgba(81,207,102,0.35)"

  // Mini ring geometry
  const size = 148; const cx = size / 2; const r = cx - 14; const C = 2 * Math.PI * r

  const stats = [
    {
      label: "Streak", value: streak, unit: "days",
      icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
      color: "#FF9500",
    },
    {
      label: "Today's Goal", value: `${sessions}/${totalSessions}`, unit: "sessions",
      icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>,
      color: colors.accent, accent: true,
    },
    {
      label: "Points", value: totalPoints, unit: "pts",
      icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
      color: "#FFB347",
    },
    {
      label: "Mode", value: mode === "custom" ? "Custom" : mode, unit: `${focusMins}/${breakMins} min`,
      icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>,
      color: "#8888AA",
    },
  ]

  return (
    <div className="flex flex-col gap-5">

      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-sub uppercase tracking-widest mb-1">{greeting}</p>
          <h1 className="text-2xl md:text-3xl font-black text-tx">Hello, {firstName}</h1>
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

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, unit, icon, color, accent }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface px-4 py-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-sub uppercase tracking-wide">{label}</span>
              <span style={{ color }} className="opacity-70">{icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-black ${accent ? "text-accent" : "text-tx"}`}>{value}</span>
              <span className="text-[11px] text-sub">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Timer + Task — 2-col on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Timer card */}
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col items-center gap-4 cursor-pointer hover:border-accent/30 transition-all duration-200 group"
          onClick={onNavToTimer}>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-bold text-tx">Timer</span>
            <div className="flex items-center gap-2">
              {running && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
                  ${phase === "focus" ? "bg-accent/10 text-accent" : "bg-priority-low/10 text-priority-low"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${phase === "focus" ? "bg-accent" : "bg-priority-low"} animate-pulse`} />
                  {phase === "focus" ? "Focusing" : "Break"}
                </div>
              )}
              <span className="text-xs text-sub group-hover:text-accent transition-colors flex items-center gap-0.5">
                Open
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
              </span>
            </div>
          </div>

          {/* Mini ring */}
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--ring)" strokeWidth={10} />
              <circle cx={cx} cy={cx} r={r} fill="none" stroke={ringColor} strokeWidth={10} strokeOpacity={0.12}
                strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} />
              <circle cx={cx} cy={cx} r={r} fill="none" stroke={ringColor} strokeWidth={7}
                strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
                style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 6px ${ringGlow})` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-sub">{phase}</span>
              <span className="text-2xl font-black text-tx tabular-nums leading-none">{minutes}:{seconds.toString().padStart(2, "0")}</span>
              <span className="text-[10px] text-sub">{spentFmt}</span>
            </div>
          </div>

          <button onClick={e => { e.stopPropagation(); onTimerToggle() }}
            className={`w-full py-2.5 rounded-xl text-white text-sm font-black active:scale-95 transition-all duration-150
              ${phase === "focus"
                ? "bg-accent shadow-[0_4px_16px_rgba(108,99,255,0.35)] hover:bg-accent-hover"
                : "bg-priority-low shadow-[0_4px_16px_rgba(81,207,102,0.3)] hover:bg-[#42c956]"}`}>
            {running
              ? <span className="flex items-center justify-center gap-2">
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  Pause
                </span>
              : <span className="flex items-center justify-center gap-2">
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  {phase === "focus" ? "Start Focus" : "Start Break"}
                </span>
            }
          </button>

          {/* Session dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSessions }).map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300
                ${i < sessions
                  ? "w-2.5 h-2.5 bg-accent shadow-[0_0_4px_rgba(108,99,255,0.5)]"
                  : i === sessions && phase === "focus"
                    ? "w-2.5 h-2.5 border-2 border-accent"
                    : "w-2 h-2 bg-border"}`} />
            ))}
            <span className="text-[11px] text-sub ml-1">{sessions}/{totalSessions}</span>
          </div>
        </div>

        {/* Current task card */}
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-tx">Current Task</span>
            <button onClick={onNavToTasks}
              className="text-xs text-sub hover:text-accent transition-colors flex items-center gap-0.5">
              All tasks
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>

          <TaskCard task={activeTask} onToggle={onToggleTask} onToggleSub={onToggleSub} compact isActive />

          {/* Session progress bar */}
          <div>
            <div className="flex justify-between text-[11px] text-sub mb-1.5">
              <span>Session progress</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-ring overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ease-linear
                ${phase === "focus" ? "bg-accent" : "bg-priority-low"}`}
                style={{ width: `${progress * 100}%` }} />
            </div>
          </div>

          {/* Up next */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-sub">Up next</span>
            {tasks.filter(t => !t.done && t.id !== activeTask.id).slice(0, 2).map(t => (
              <TaskCard key={t.id} task={t} onToggle={onToggleTask} onClick={() => onSetActive(t)} compact />
            ))}
            {tasks.filter(t => !t.done && t.id !== activeTask.id).length === 0 && (
              <p className="text-xs text-sub py-2 text-center">All caught up</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
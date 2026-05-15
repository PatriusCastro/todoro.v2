"use client"

import { useState } from "react"
import { HiBolt, HiStar, HiPlayCircle, HiPauseCircle, HiChevronRight, HiChevronLeft, HiFire, HiClock, HiCheckCircle, HiListBullet } from "react-icons/hi2"
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
  allHistory: { taskId: string; taskTitle: string; focusMins: number; at: number }[]
  onNavToCalendar: () => void,   quickMode: boolean; onQuickMode: (v: boolean) => void
}

function phaseLabel(phase: Phase) {
  if (phase === "focus")     return "Focus"
  if (phase === "longbreak") return "Long Break"
  return "Break"
}

function phaseColor(phase: Phase) {
  return phase === "focus" ? colors.accent : "#51CF66"
}

function localDate(ts: number = Date.now()) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const DAY_LABELS   = ["S","M","T","W","T","F","S"]

function MiniCalendar({
  allHistory, onNavToCalendar,
}: { allHistory: HomePageProps["allHistory"]; onNavToCalendar: () => void }) {
  const today   = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay  = new Date(year, month, 1).getDay()
  const daysCount = new Date(year, month + 1, 0).getDate()
  const cells     = Array.from({ length: firstDay + daysCount }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  )

  const sessionsByDate = allHistory.reduce<Record<string, number>>((acc, s) => {
    const d = localDate(s.at); acc[d] = (acc[d] ?? 0) + 1; return acc
  }, {})

  const todayStr = localDate()

  function dotColor(count: number) {
    if (count === 0) return null
    if (count === 1) return "bg-accent/40"
    if (count <= 3)  return "bg-accent/70"
    return "bg-accent"
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 rounded-lg text-sub hover:text-tx hover:bg-surface2 transition-colors">
          <HiChevronLeft size={15} />
        </button>
        <span className="text-sm font-black text-tx">{MONTHS_SHORT[month]} {year}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg text-sub hover:text-tx hover:bg-surface2 transition-colors">
          <HiChevronRight size={15} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1.5">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-bold text-sub/50">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const ds      = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const isToday = ds === todayStr
          const count   = sessionsByDate[ds] ?? 0
          const dot     = dotColor(count)

          return (
            <button key={i}
              className={`relative flex flex-col items-center justify-center rounded-lg h-8
                ${isToday ? "bg-accent/15" : "hover:bg-surface2"}
                transition-colors duration-100`}>
              <span className={`text-xs font-semibold leading-none ${isToday ? "text-accent font-black" : "text-tx"}`}>
                {day}
              </span>
              {dot && <span className={`w-1 h-1 rounded-full mt-0.5 ${dot}`} />}
            </button>
          )
        })}
      </div>

      <button onClick={onNavToCalendar} className="mt-auto flex items-center justify-center gap-2 text-xs text-sub hover:text-accent transition-colors self-center">
        View Calendar <HiChevronRight size={11} />
      </button>
    </div>
  )
}

function StatTile({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sub">{icon}</span>
        <span className="text-xs font-bold text-sub uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-3xl font-black leading-none" style={accent ? { color: accent } : undefined}>
        {value} {sub && <span className="font-semibold text-xs text-sub">{sub}</span>}
      </span>
    </div>
  )
}

export default function HomePage({
  time, phase, mode, focusMins, breakMins, longBreakMins, running, progress,
  sessions, totalSessions, onTimerToggle, onNavToTimer, onNavToCalendar,
  tasks, activeTask, onToggleTask, allHistory, onToggleSub,
  onNavToTasks, onSetActive, streak, totalPoints, greeting, userName,
  avatarUrl, onNavToSettings, quickMode, onQuickMode
}: HomePageProps) {
  const minutes  = Math.floor(time / 60)
  const seconds  = time % 60
  const currentBreakMins = phase === "longbreak" ? longBreakMins : breakMins
  const firstName  = userName.split(" ")[0] || "there"
  const ringColor  = phaseColor(phase)
  const label      = phaseLabel(phase)
  const goalHit    = sessions >= totalSessions

  const size = 220; const cx = size / 2; const r = cx - 16; const C = 2 * Math.PI * r

  const pendingTasks = tasks.filter(t => !t.done && t.id !== activeTask.id)
  const doneTasks    = tasks.filter(t => t.done)
  const allDone      = tasks.every(t => t.done)

  return (
    <div className="flex flex-col gap-4">

      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onNavToSettings} className="relative shrink-0">
            <div className={`w-11 h-11 rounded-xl overflow-hidden border-2 transition-colors
              ${running ? "border-priority-low" : "border-accent/20"}`}>
              {avatarUrl
                ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-accent/15 flex items-center justify-center text-accent font-black text-sm">
                    {firstName.slice(0, 2).toUpperCase()}
                  </div>
              }
            </div>
            {running && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-priority-low border-2 border-bg" />}
          </button>
          <div>
            <p className="text-xs font-semibold text-sub uppercase tracking-widest">{greeting}</p>
            <h1 className="text-xl font-black text-tx leading-tight">
              {firstName}
              {running && <span className="ml-2 text-sm font-semibold text-priority-low">· focusing</span>}
            </h1>
          </div>
        </div>
        {/* Points only — streak has its own tile below */}
        <div className="flex items-center gap-2 border border-border rounded-xl px-3.5 py-2 bg-surface">
          <HiStar size={13} color="#FFBA00" />
          <span className="text-sm font-bold text-tx">{totalPoints} pts</span>
        </div>
      </div>

      {/* Bento */}
      <div className="grid grid-cols-12 gap-3">
        
          {/* Today's goal */}
          <div className={`sm:hidden col-span-12 rounded-2xl border bg-surface px-5 py-4 transition-colors duration-300
            ${goalHit ? "border-priority-low/40 bg-priority-low/5" : "border-border"}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-sub uppercase tracking-widest">Today's Goal</span>
              <span className={`text-sm font-bold ${goalHit ? "text-priority-low" : "text-sub"}`}>
                {sessions} / {totalSessions} sessions {goalHit && "✓"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSessions }).map((_, i) => (
                <div key={i} className={`h-2.5 flex-1 rounded-full transition-all duration-500
                  ${i < sessions ? goalHit ? "bg-priority-low" : "bg-accent" : "bg-ring"}`} />
              ))}
            </div>
          </div>

        {/* Timer */}
        <div className="col-span-12 max-h-fit lg:max-h-full md:col-span-6 lg:col-span-5 rounded-2xl border border-border bg-surface overflow-hidden">

          <div className="px-5 pt-4 pb-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-bold text-sub uppercase tracking-widest shrink-0">Now</span>
              {allDone
                ? <span className="text-sm text-sub italic">All tasks done 🎉</span>
                : <>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getPriority(activeTask.priority) }} />
                    <span className="text-sm font-semibold text-tx truncate">{activeTask.title}</span>
                  </>
              }
              {quickMode && (
                <span className="ml-auto text-xs font-bold text-[#FFBA00] uppercase tracking-widest">
                  Quick Mode
                </span>
              )}
            </div>
            <button onClick={onNavToTasks}
              className="text-xs text-sub hover:text-accent transition-colors flex items-center gap-0.5 shrink-0 ml-3">
              Tasks <HiChevronRight size={12} />
            </button>
          </div>

          {!allDone && activeTask.estimatedSessions > 0 && (
            <div className="px-5 pt-3 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {Array.from({ length: activeTask.estimatedSessions }).map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300
                    ${i < activeTask.completedSessions ? "bg-accent" : "bg-ring"}`} />
                ))}
              </div>
              <span className="text-xs text-sub shrink-0">
                {activeTask.completedSessions}/{activeTask.estimatedSessions}
              </span>
            </div>
          )}

          <div className="flex flex-col items-center gap-4 px-5 py-4">
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold
              ${phase === "focus" ? "bg-accent/10 text-accent" : "bg-priority-low/10 text-priority-low"}`}>
              <span className={`w-2 h-2 rounded-full ${running ? "animate-pulse" : ""}`}
                style={{ background: ringColor }} />
              {label} · {phase === "focus" ? focusMins : currentBreakMins} min
            </div>

            <div className="my-4 relative cursor-pointer group" style={{ width: size, height: size }}
              onClick={onNavToTimer}>
              <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--ring)" strokeWidth={13} />
                <circle cx={cx} cy={cx} r={r} fill="none" stroke={ringColor} strokeWidth={9}
                  strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
                  style={{ transition: "stroke-dashoffset 1s linear" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                <span className="text-5xl font-black text-tx tabular-nums leading-none tracking-tight">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </span>
                <span className="text-sm text-sub">
                  {phase === "focus" ? `session ${sessions + 1} of ${totalSessions}` : "take a break"}
                </span>
                <span className="text-[11px] text-sub/40 group-hover:text-sub/60 transition-colors">
                  tap to expand
                </span>
              </div>
            </div>
            <button onClick={onTimerToggle}
              className={`w-full py-3.5 rounded-xl text-white text-sm font-black active:scale-95 transition-all duration-150
                ${phase === "focus" ? "bg-accent hover:bg-accent-hover" : "bg-priority-low hover:bg-[#42c956]"}`}>
              <span className="flex items-center justify-center gap-2">
                {running
                  ? <><HiPauseCircle size={18} /> Pause</>
                  : <><HiPlayCircle size={18} /> {phase === "focus" ? "Start Focus" : phase === "longbreak" ? "Long Break" : "Start Break"}</>
                }
              </span>
            </button>
                        
            <button onClick={() => onQuickMode(!quickMode)}
              className="w-full py-3.5 rounded-xl text-sub text-sm font-black active:scale-95 transition-all duration-150">
              <span className={`flex items-center justify-center gap-2 ${quickMode ? "text-[#FFBA00] hover:text-[#FFBA00]/80" : "text-sub hover:text-[#FFBA00]/80"}`}>
                <HiBolt size={18} /><span className="text-xs font-semibold uppercase tracking-widest">Quick Mode</span>
              </span>
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-12 md:col-span-6 lg:col-span-7 flex flex-col gap-3">

          {/* Today's goal */}
          <div className={`hidden sm:grid rounded-2xl border bg-surface px-5 py-4 transition-colors duration-300
            ${goalHit ? "border-priority-low/40 bg-priority-low/5" : "border-border"}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-sub uppercase tracking-widest">Today's Goal</span>
              <span className={`text-sm font-bold ${goalHit ? "text-priority-low" : "text-sub"}`}>
                {sessions} / {totalSessions} sessions {goalHit && "✓"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSessions }).map((_, i) => (
                <div key={i} className={`h-2.5 flex-1 rounded-full transition-all duration-500
                  ${i < sessions ? goalHit ? "bg-priority-low" : "bg-accent" : "bg-ring"}`} />
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatTile icon={<HiFire size={14} />}        label="Streak" value={`${streak}d`}      sub="streak"           accent="#FFBA00" />
            <StatTile icon={<HiCheckCircle size={14} />} label="Done"   value={doneTasks.length}  sub={`of ${tasks.length} tasks`} accent="#51CF66" />
          </div>

          {/* Up Next and Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

            {/* Up Next */}
            <div className="rounded-2xl border border-border bg-surface px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HiListBullet size={14} className="text-sub" />
                  <span className="text-xs font-bold text-sub uppercase tracking-widest">Up Next</span>
                </div>
                <button onClick={onNavToTasks}
                  className="text-xs text-accent hover:underline flex items-center gap-0.5">
                  All <HiChevronRight size={11} />
                </button>
              </div>

              {pendingTasks.length === 0
                ? <p className="text-sm text-sub italic text-center py-3">
                    {allDone ? "All tasks completed! 🎉" : "No pending tasks"}
                  </p>
                : <div className="flex flex-col gap-2">
                    {pendingTasks.slice(0, 3).map(t => (
                      <TaskCard key={t.id} task={t} onToggle={onToggleTask}
                        onClick={running && phase === "focus" ? undefined : () => onSetActive(t)} compact />
                    ))}
                    {pendingTasks.length > 3 && (
                      <button onClick={onNavToTasks}
                        className="text-xs text-sub hover:text-accent transition-colors text-center pt-1">
                        +{pendingTasks.length - 3} more
                      </button>
                    )}
                  </div>
              }
            </div>

            {/* Calendar */}
            <div className="rounded-2xl border border-border bg-surface px-5 py-4 flex flex-col">
              <MiniCalendar allHistory={allHistory} onNavToCalendar={onNavToCalendar} />
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
"use client"

import { useState } from "react"
import { HiChevronLeft, HiChevronRight, HiCalendarDays } from "react-icons/hi2"
import { type Task } from "../components/tasks/TaskCard"
import { type SessionRecord } from "../app/page"
import { getPriority } from "../lib/theme"

interface CalendarPageProps {
  tasks:      Task[]
  allHistory: SessionRecord[]
}

function localDate(ts: number = Date.now()) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

export default function CalendarPage({ tasks, allHistory }: CalendarPageProps) {
  const today    = new Date()
  const [year,   setYear]  = useState(today.getFullYear())
  const [month,  setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay  = new Date(year, month, 1).getDay()
  const daysCount = new Date(year, month + 1, 0).getDate()
  const cells     = Array.from({ length: firstDay + daysCount }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  )

  // Map date string → tasks due that day
  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!t.dueDate) return acc
    acc[t.dueDate] = [...(acc[t.dueDate] ?? []), t]
    return acc
  }, {})

  // Map date string → session count
  const sessionsByDate = allHistory.reduce<Record<string, number>>((acc, s) => {
    const d = localDate(s.at)
    acc[d] = (acc[d] ?? 0) + 1
    return acc
  }, {})

  const todayStr    = localDate()
  const selectedStr = selected
  const selectedTasks = selectedStr ? (tasksByDate[selectedStr] ?? []) : []

  // Heatmap — last 365 days
  const heatmapCells: { date: string; count: number }[] = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
    const ds = localDate(d.getTime())
    heatmapCells.push({ date: ds, count: sessionsByDate[ds] ?? 0 })
  }

  const maxCount = Math.max(...heatmapCells.map(c => c.count), 1)

  function heatColor(count: number) {
    if (count === 0) return "bg-ring"
    const intensity = count / maxCount
    if (intensity < 0.25) return "bg-accent/25"
    if (intensity < 0.5)  return "bg-accent/50"
    if (intensity < 0.75) return "bg-accent/75"
    return "bg-accent"
  }

  // Group heatmap into weeks
  const weeks: { date: string; count: number }[][] = []
  for (let i = 0; i < heatmapCells.length; i += 7) {
    weeks.push(heatmapCells.slice(i, i + 7))
  }

  return (
    <div className="flex flex-col gap-6">

      <div>
        <h1 className="text-2xl md:text-3xl font-black text-tx">Calendar</h1>
        <p className="text-sm text-sub mt-0.5">Tasks & focus history</p>
      </div>

      {/* Month calendar */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <button onClick={prevMonth}
            className="p-1.5 rounded-lg text-sub hover:text-tx hover:bg-surface2 transition-colors">
            <HiChevronLeft size={18} />
          </button>
          <span className="text-sm font-black text-tx">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth}
            className="p-1.5 rounded-lg text-sub hover:text-tx hover:bg-surface2 transition-colors">
            <HiChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-3 pt-3 pb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-sub py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1 px-3 pb-3">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const ds       = isoDate(year, month, day)
            const isToday  = ds === todayStr
            const isSel    = ds === selectedStr
            const dayTasks = tasksByDate[ds] ?? []
            const sessions = sessionsByDate[ds] ?? 0
            const hasTasks = dayTasks.length > 0

            return (
              <button key={i} onClick={() => setSelected(s => s === ds ? null : ds)}
                className={`relative flex flex-col items-center pt-2 pb-1.5 rounded-xl transition-all duration-150 min-h-13
                  ${isSel    ? "bg-accent/15 border border-accent/40"
                  : isToday  ? "border border-accent/40"
                  : "hover:bg-surface2 border border-transparent"}`}>

                <span className={`text-xs font-bold leading-none
                  ${isSel ? "text-accent" : isToday ? "text-accent" : "text-tx"}`}>
                  {day}
                </span>

                {/* Session dot */}
                {sessions > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: Math.min(sessions, 3) }).map((_, j) => (
                      <span key={j} className="w-1 h-1 rounded-full bg-accent" />
                    ))}
                  </div>
                )}

                {/* Task priority dots */}
                {hasTasks && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-1">
                    {dayTasks.slice(0, 3).map((t, j) => (
                      <span key={j} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: getPriority(t.priority) }} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedStr && (
        <div className="rounded-2xl border border-border bg-surface px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <HiCalendarDays size={15} className="text-sub" />
            <span className="text-xs font-bold text-sub uppercase tracking-wider">
              {new Date(selectedStr + "T00:00").toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
            </span>
          </div>

          {sessionsByDate[selectedStr] > 0 && (
            <p className="text-xs text-accent font-semibold">
              {sessionsByDate[selectedStr]} focus session{sessionsByDate[selectedStr] > 1 ? "s" : ""} completed
            </p>
          )}

          {selectedTasks.length > 0
            ? <div className="flex flex-col gap-2">
                {selectedTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getPriority(t.priority) }} />
                    <span className={`text-sm font-medium flex-1 ${t.done ? "line-through text-sub" : "text-tx"}`}>
                      {t.title}
                    </span>
                    {t.done && <span className="text-[10px] text-priority-low font-semibold">Done</span>}
                  </div>
                ))}
              </div>
            : <p className="text-xs text-sub">No tasks due this day.</p>
          }
        </div>
      )}

      {/* Contribution heatmap */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-sub uppercase tracking-wider">Focus History</span>
          <div className="flex items-center gap-1.5 text-[10px] text-sub">
            <span>Less</span>
            {["bg-ring", "bg-accent/25", "bg-accent/50", "bg-accent/75", "bg-accent"].map(c => (
              <span key={c} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface px-4 py-4 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map(({ date, count }) => (
                  <div key={date} title={`${date}: ${count} session${count !== 1 ? "s" : ""}`}
                    className={`w-3 h-3 rounded-sm transition-colors duration-150 ${heatColor(count)}`} />
                ))}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-sub">
            <span>{new Date(heatmapCells[0].date + "T00:00").toLocaleDateString([], { month: "short", year: "numeric" })}</span>
            <span>{new Date(heatmapCells[heatmapCells.length - 1].date + "T00:00").toLocaleDateString([], { month: "short", year: "numeric" })}</span>
          </div>
        </div>
      </div>

    </div>
  )
}
"use client"

import { useState } from "react"
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2"
import { type Task } from "./TaskCard"
import { type SessionRecord } from "../../app/page"
import { getPriority } from "../../lib/theme"

function localDate(ts: number = Date.now()) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

// Month grid with due-dots (priority colors) + session dots (neutral). Selecting
// a day is controlled by the parent so it can filter the task list below.
export default function TasksCalendar({ tasks, allHistory, selected, onSelect }: {
  tasks:      Task[]
  allHistory: SessionRecord[]
  selected:   string | null
  onSelect:   (d: string | null) => void
}) {
  const today = new Date()
  const focus = selected ? new Date(selected + "T00:00") : today
  const [year,  setYear]  = useState(focus.getFullYear())
  const [month, setMonth] = useState(focus.getMonth())

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay  = new Date(year, month, 1).getDay()
  const daysCount = new Date(year, month + 1, 0).getDate()
  const cells     = Array.from({ length: firstDay + daysCount }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  )

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!t.dueDate) return acc
    acc[t.dueDate] = [...(acc[t.dueDate] ?? []), t]
    return acc
  }, {})

  const sessionsByDate = allHistory.reduce<Record<string, number>>((acc, s) => {
    const d = localDate(s.at); acc[d] = (acc[d] ?? 0) + 1; return acc
  }, {})

  const todayStr = localDate()

  return (
    <div className="glass rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
        <button onClick={prevMonth} aria-label="Previous month"
          className="p-1.5 rounded-lg text-sub hover:text-tx hover:bg-surface2 transition-colors">
          <HiChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-tx">{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} aria-label="Next month"
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
          const isSel    = ds === selected
          const dayTasks = tasksByDate[ds] ?? []
          const sessions = sessionsByDate[ds] ?? 0

          return (
            <button key={i} onClick={() => onSelect(isSel ? null : ds)}
              aria-label={`${MONTHS[month]} ${day}`} aria-pressed={isSel}
              className={`relative flex flex-col items-center pt-2 pb-1.5 rounded-xl transition-all duration-150 min-h-13
                ${isSel   ? "bg-accent/15 border border-accent/50"
                : isToday ? "border border-accent/40"
                : "hover:bg-surface2 border border-transparent"}`}>

              <span className={`text-xs font-semibold leading-none ${isSel || isToday ? "text-accent" : "text-tx"}`}>
                {day}
              </span>

              {/* Session dots — neutral, accent reserved for selection/today */}
              {sessions > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: Math.min(sessions, 3) }).map((_, j) => (
                    <span key={j} className="w-1 h-1 rounded-full bg-tx/55" />
                  ))}
                </div>
              )}

              {/* Task due dots — priority colors carry meaning */}
              {dayTasks.length > 0 && (
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
  )
}

// 365-day focus-session heatmap. Neutral intensity scale to keep accent restrained.
export function FocusHistory({ allHistory }: { allHistory: SessionRecord[] }) {
  const sessionsByDate = allHistory.reduce<Record<string, number>>((acc, s) => {
    const d = localDate(s.at); acc[d] = (acc[d] ?? 0) + 1; return acc
  }, {})

  const heatmapCells: { date: string; count: number }[] = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i)
    const ds = localDate(d.getTime())
    heatmapCells.push({ date: ds, count: sessionsByDate[ds] ?? 0 })
  }

  const maxCount = Math.max(...heatmapCells.map(c => c.count), 1)
  const SCALE = ["bg-ring", "bg-tx/15", "bg-tx/35", "bg-tx/60", "bg-tx/85"]

  function heatColor(count: number) {
    if (count === 0) return SCALE[0]
    const intensity = count / maxCount
    if (intensity < 0.25) return SCALE[1]
    if (intensity < 0.5)  return SCALE[2]
    if (intensity < 0.75) return SCALE[3]
    return SCALE[4]
  }

  const weeks: { date: string; count: number }[][] = []
  for (let i = 0; i < heatmapCells.length; i += 7) weeks.push(heatmapCells.slice(i, i + 7))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-sub">Focus History</span>
        <div className="flex items-center gap-1.5 text-[10px] text-sub">
          <span>Less</span>
          {SCALE.map(c => <span key={c} className={`w-3 h-3 rounded-sm ${c}`} />)}
          <span>More</span>
        </div>
      </div>

      <div className="glass rounded-2xl px-4 py-4 overflow-x-auto">
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
  )
}

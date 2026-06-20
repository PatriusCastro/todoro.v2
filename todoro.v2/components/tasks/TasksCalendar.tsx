"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { HiChevronLeft, HiChevronRight, HiCalendarDays } from "react-icons/hi2"
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

// Sun–Sat dates for the week containing `anchor`. Built with real Date math so it
// rolls correctly across month boundaries and avoids timezone drift.
function weekDates(anchor: Date) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  start.setDate(start.getDate() - start.getDay())   // back up to Sunday (getDay: 0 = Sun)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    return { ds: isoDate(d.getFullYear(), d.getMonth(), d.getDate()), dayNum: d.getDate(), month: d.getMonth() }
  })
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

interface DayMaps {
  tasksByDate:    Record<string, Task[]>
  sessionsByDate: Record<string, number>
}

// One calendar day — shared by the week strip and the month sheet so they stay
// identical. Toggling an already-selected day clears the selection (onSelect null).
function DayCell({ ds, dayNum, isToday, isSel, dayTasks, sessions, ariaLabel, onSelect }: {
  ds:        string
  dayNum:    number
  isToday:   boolean
  isSel:     boolean
  dayTasks:  Task[]
  sessions:  number
  ariaLabel: string
  onSelect:  (d: string | null) => void
}) {
  return (
    <button onClick={() => onSelect(isSel ? null : ds)}
      aria-label={ariaLabel} aria-pressed={isSel}
      className={`relative flex flex-col items-center pt-2 pb-1.5 rounded-xl transition-all duration-150 min-h-13
        ${isSel   ? "bg-accent/15 border border-accent/50"
        : isToday ? "border border-accent/40"
        : "hover:bg-surface2 border border-transparent"}`}>

      <span className={`text-xs font-semibold leading-none ${isSel || isToday ? "text-accent" : "text-tx"}`}>
        {dayNum}
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
}

// Full-month calendar in a bottom sheet. Picking a day selects it and closes.
function MonthSheet({ anchor, maps, todayStr, selected, dark, onSelect, onClose }: {
  anchor:   Date
  maps:     DayMaps
  todayStr: string
  selected: string | null
  dark:     boolean
  onSelect: (d: string | null) => void
  onClose:  () => void
}) {
  const [year,  setYear]  = useState(anchor.getFullYear())
  const [month, setMonth] = useState(anchor.getMonth())
  const panelRef = useRef<HTMLDivElement>(null)

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  // Close on Escape; move focus into the dialog on open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const firstDay  = new Date(year, month, 1).getDay()
  const daysCount = new Date(year, month + 1, 0).getDate()
  const cells     = Array.from({ length: firstDay + daysCount }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  )

  return createPortal(
    <div className={dark ? "dark" : ""}>
      <div className="fixed inset-0 z-9999 flex items-end justify-center bg-black/70"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Month calendar" tabIndex={-1}
          className="w-full max-w-md glass-strong rounded-t-3xl flex flex-col px-3 pb-7 pt-2 outline-none
            max-h-[85dvh] overflow-y-auto motion-safe:animate-[sheetup_0.28s_ease-out]">

          {/* Grab handle */}
          <div className="mx-auto mt-1 mb-2 h-1.5 w-10 rounded-full bg-tx/20" />

          {/* Month nav */}
          <div className="flex items-center justify-between px-2 py-1">
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
          <div className="grid grid-cols-7 pt-2 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-sub py-1">{d}</div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 gap-1 pb-2">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const ds = isoDate(year, month, day)
              return (
                <DayCell key={i} ds={ds} dayNum={day}
                  isToday={ds === todayStr} isSel={ds === selected}
                  dayTasks={maps.tasksByDate[ds] ?? []} sessions={maps.sessionsByDate[ds] ?? 0}
                  ariaLabel={`${MONTHS[month]} ${day}, ${year}`}
                  onSelect={d => { onSelect(d); onClose() }} />
              )
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// On-page calendar: shows only the current week (or the selected day's week);
// the "Month" button opens the full month in a bottom sheet. Selection is
// controlled by the parent so it can filter the task list below.
export default function TasksCalendar({ tasks, allHistory, selected, onSelect, dark }: {
  tasks:      Task[]
  allHistory: SessionRecord[]
  selected:   string | null
  onSelect:   (d: string | null) => void
  dark:       boolean
}) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const tasksByDate = useMemo(() => tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!t.dueDate) return acc
    acc[t.dueDate] = [...(acc[t.dueDate] ?? []), t]
    return acc
  }, {}), [tasks])

  const sessionsByDate = useMemo(() => allHistory.reduce<Record<string, number>>((acc, s) => {
    const d = localDate(s.at); acc[d] = (acc[d] ?? 0) + 1; return acc
  }, {}), [allHistory])

  const maps: DayMaps = { tasksByDate, sessionsByDate }
  const todayStr = localDate()
  const anchor   = selected ? new Date(selected + "T00:00") : new Date()
  const week     = weekDates(anchor)

  // "This week" when today is in view, otherwise the month(s) the week spans
  const months = [...new Set(week.map(d => d.month))]
  const label  = week.some(d => d.ds === todayStr)
    ? "This week"
    : months.length === 1 ? MONTHS[months[0]] : `${MONTHS[months[0]]} – ${MONTHS[months[1]]}`

  return (
    <>
      <div className="glass rounded-2xl overflow-hidden">

        {/* Header — week label + expand to month */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
          <span className="text-sm font-semibold text-tx">{label}</span>
          <button onClick={() => setSheetOpen(true)}
            aria-label="Open month view" aria-haspopup="dialog" aria-expanded={sheetOpen}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-sub
              hover:text-tx hover:bg-surface2 transition-colors">
            <HiCalendarDays size={15} /> Month
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 px-3 pt-3 pb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-sub py-1">{d}</div>
          ))}
        </div>

        {/* Current week */}
        <div className="grid grid-cols-7 gap-1 px-3 pb-3">
          {week.map(({ ds, dayNum, month }) => (
            <DayCell key={ds} ds={ds} dayNum={dayNum}
              isToday={ds === todayStr} isSel={ds === selected}
              dayTasks={tasksByDate[ds] ?? []} sessions={sessionsByDate[ds] ?? 0}
              ariaLabel={`${MONTHS[month]} ${dayNum}`}
              onSelect={onSelect} />
          ))}
        </div>
      </div>

      {sheetOpen && (
        <MonthSheet anchor={anchor} maps={maps} todayStr={todayStr} selected={selected}
          dark={dark} onSelect={onSelect} onClose={() => setSheetOpen(false)} />
      )}
    </>
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

"use client"

import { useMemo, useState, useRef, useEffect } from "react"
import { HiChevronLeft, HiChevronRight, HiCalendarDays } from "react-icons/hi2"
import { type Task } from "./TaskCard"
import { type SessionRecord } from "../../app/page"
import Sheet from "../shared/Sheet"
import Panel from "../shared/Panel"
import SectionHeader from "../shared/SectionHeader"

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
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

// ISO-8601 week number: week 1 is the one containing the first Thursday.
function isoWeek(d: Date) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7))
  const firstThursday = new Date(t.getFullYear(), 0, 4)
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7))
  return 1 + Math.round((t.getTime() - firstThursday.getTime()) / (7 * 864e5))
}

interface DayMaps {
  tasksByDate:    Record<string, Task[]>
  sessionsByDate: Record<string, number>
}

// One calendar day — shared by the week strip and the month sheet so they stay
// identical. Toggling an already-selected day clears the selection (onSelect null).
function DayCell({ ds, dayNum, dayLabel, isToday, isSel, dayTasks, sessions, ariaLabel, onSelect }: {
  ds:        string
  dayNum:    number
  dayLabel?: string
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
      className={`relative flex flex-col items-center justify-center gap-1 py-2.5 rounded-control
        transition-colors duration-150 min-h-17
        ${isSel ? "bg-accent" : "bg-surface hover:bg-surface2"}`}>

      {dayLabel && (
        <span className={`text-caption font-extrabold uppercase tracking-wider leading-none
          ${isSel ? "text-white" : isToday ? "text-accent" : "text-sub"}`}>
          {dayLabel}
        </span>
      )}
      <span className={`text-heading font-extrabold leading-none tabular-nums
        ${isSel ? "text-white" : isToday ? "text-accent" : "text-tx"}`}>
        {dayNum}
      </span>

      {/* One bar, not two dot systems: it says "there's something on this day".
          Accent when the day owes work, muted when it only holds finished
          sessions. Colour alone never had to carry priority here. */}
      <span className={`w-4.5 h-1 rounded-chip transition-colors
        ${isSel ? "bg-white/70"
        : dayTasks.length > 0 ? "bg-accent"
        : sessions > 0 ? "bg-tx/30"
        : "bg-transparent"}`} />
    </button>
  )
}

// Full-month calendar in a bottom sheet. Picking a day selects it and closes.
function MonthSheet({ anchor, maps, todayStr, selected, onSelect, onClose }: {
  anchor:   Date
  maps:     DayMaps
  todayStr: string
  selected: string | null
  onSelect: (d: string | null) => void
  onClose:  () => void
}) {
  const [year,  setYear]  = useState(anchor.getFullYear())
  const [month, setMonth] = useState(anchor.getMonth())

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay  = new Date(year, month, 1).getDay()
  const daysCount = new Date(year, month + 1, 0).getDate()
  const cells     = Array.from({ length: firstDay + daysCount }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  )

  return (
    <Sheet label="Month calendar" onClose={onClose} className="px-3 pb-7">
      {/* Month nav */}
      <div className="flex items-center justify-between px-2 py-1">
        <button onClick={prevMonth} aria-label="Previous month"
          className="w-11 h-11 grid place-items-center rounded-lg text-sub hover:text-tx hover:bg-surface2 transition-colors">
          <HiChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-tx">{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} aria-label="Next month"
          className="w-11 h-11 grid place-items-center rounded-lg text-sub hover:text-tx hover:bg-surface2 transition-colors">
          <HiChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 pt-2 pb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-caption font-semibold text-sub py-1">{d}</div>
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
    </Sheet>
  )
}

// On-page calendar: shows only the current week (or the selected day's week);
// the "Month" button opens the full month in a bottom sheet. Selection is
// controlled by the parent so it can filter the task list below.
export default function TasksCalendar({ tasks, allHistory, selected, onSelect }: {
  tasks:      Task[]
  allHistory: SessionRecord[]
  selected:   string | null
  onSelect:   (d: string | null) => void
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

  // "AUGUST 2026 / Week 32" — the month says where you are, the week number
  // says it precisely. A bare "This week" said neither.
  const midWeek   = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  const monthLabel = `${MONTHS[midWeek.getMonth()]} ${midWeek.getFullYear()}`
  const weekNumber = isoWeek(midWeek)

  return (
    <>
      <div className="panel overflow-hidden">

        {/* Header — month + week number, and the month-view escape hatch */}
        <div className="flex items-center gap-2 xs:gap-3 px-3 xs:px-4 py-3 border-b border-border">
          <h3 className="text-caption font-extrabold uppercase tracking-wider text-tx truncate">{monthLabel}</h3>
          <button onClick={() => setSheetOpen(true)}
            aria-label="Open month view" aria-haspopup="dialog" aria-expanded={sheetOpen}
            className="ml-auto shrink-0 flex items-center gap-1.5 min-h-9 px-2 rounded-chip text-caption text-sub
              whitespace-nowrap hover:text-accent transition-colors">
            Week {weekNumber} <HiCalendarDays size={14} />
          </button>
        </div>

        {/* Current week — the day name lives inside the cell, so there is no
            separate header row to keep aligned with it. */}
        {/* Seven cells always share the width, so below 380px the gutters give
            way first — a 26px cell cannot hold "Wed" over a two-digit date. */}
        <div className="grid grid-cols-7 gap-1 xs:gap-1.5 p-2 xs:p-3">
          {week.map(({ ds, dayNum, month }, i) => (
            <DayCell key={ds} ds={ds} dayNum={dayNum} dayLabel={DAYS_SHORT[i]}
              isToday={ds === todayStr} isSel={ds === selected}
              dayTasks={tasksByDate[ds] ?? []} sessions={sessionsByDate[ds] ?? 0}
              ariaLabel={`${MONTHS[month]} ${dayNum}`}
              onSelect={onSelect} />
          ))}
        </div>
      </div>

      {sheetOpen && (
        <MonthSheet anchor={anchor} maps={maps} todayStr={todayStr} selected={selected}
          onSelect={onSelect} onClose={() => setSheetOpen(false)} />
      )}
    </>
  )
}

const WEEKS_SHOWN = 53
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
// Sunday-first rows. Labelling every row is noise at 14px; three is enough to
// orient the reader, which is the convention every contribution graph uses.
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]

// Fixed pixels, not fractions. A fraction-sized grid fills whatever it is given,
// which on a desktop panel meant 68px squares; a heatmap only reads as one when
// the cell stays small and the year stays dense.
const CELL = 14
const GAP  = 3
const DAY_COL = 26   // room for "Mon" at caption size

/**
 * Focus-session heatmap over the last 53 weeks, ending on the week containing
 * today: fixed small cells, month labels along the top, weekday labels down the
 * side, and a horizontal scroller parked at today. A shorter fixed-width range
 * fit a phone without scrolling, but it could not show a year, and stretching
 * 14 weeks across a desktop panel turned each day into a tile.
 */
export function FocusHistory({ allHistory }: { allHistory: SessionRecord[] }) {
  const scroller = useRef<HTMLDivElement>(null)

  // A year does not fit a phone, so the graph opens on the most recent weeks
  // rather than on last spring.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  const sessionsByDate = allHistory.reduce<Record<string, number>>((acc, s) => {
    const d = localDate(s.at); acc[d] = (acc[d] ?? 0) + 1; return acc
  }, {})

  // Start on the Sunday of the week WEEKS_SHOWN-1 weeks back, so the last
  // column is the current week and rows line up Sun–Sat.
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - start.getDay() - (WEEKS_SHOWN - 1) * 7)

  const heatmapCells: { date: string; count: number; month: number }[] = []
  for (let i = 0; i < WEEKS_SHOWN * 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const ds = localDate(d.getTime())
    heatmapCells.push({ date: ds, count: sessionsByDate[ds] ?? 0, month: d.getMonth() })
  }

  const maxCount = Math.max(...heatmapCells.map(c => c.count), 1)

  // Five steps on the accent, so the heatmap reads as part of the theme rather
  // than a neutral chart parked inside it. Step 0 is a faint ink tint — an
  // empty day should read as "nothing here", not as the lightest accent.
  const STEP_MIX = [null, 24, 48, 72, 96] as const
  function heatStyle(count: number): React.CSSProperties {
    if (count === 0) return { background: "color-mix(in srgb, var(--tx) 11%, transparent)" }
    const intensity = count / maxCount
    const step = intensity < 0.25 ? 1 : intensity < 0.5 ? 2 : intensity < 0.75 ? 3 : 4
    return { background: `color-mix(in srgb, var(--accent) ${STEP_MIX[step]}%, transparent)` }
  }

  const weeks: { date: string; count: number; month: number }[][] = []
  for (let i = 0; i < heatmapCells.length; i += 7) weeks.push(heatmapCells.slice(i, i + 7))

  // A month is labelled above the first column that belongs to it. The opening
  // column is skipped — it is a partial month whose label would sit over weeks
  // that aren't there — and so are the last two, where a 3-letter label would
  // run off the end of the graph.
  const monthLabels = weeks.map((week, wi) => {
    if (wi === 0 || wi >= weeks.length - 2) return null
    return week[0].month !== weeks[wi - 1][0].month ? MONTHS_SHORT[week[0].month] : null
  })

  const today = localDate()

  return (
    <Panel className="flex flex-col gap-3">
      <SectionHeader meta="Last 12 months">Focus history</SectionHeader>

      {/* 53 columns of 7 days at a fixed 14px. A year is wider than a phone by
          design, so the graph scrolls rather than shrinking its cells to fit. */}
      <div ref={scroller}
        className="overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
        <div className="flex flex-col gap-1 w-max">

          {/* Month labels — offset by the weekday column so they sit over the
              right week. Each label overflows its own 14px column on purpose. */}
          <div className="flex" style={{ gap: GAP, marginLeft: DAY_COL + GAP }}>
            {weeks.map((_, wi) => (
              <div key={wi} className="relative shrink-0" style={{ width: CELL, height: 12 }}>
                {monthLabels[wi] && (
                  <span className="absolute left-0 top-0 text-caption text-sub leading-none whitespace-nowrap">
                    {monthLabels[wi]}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex" style={{ gap: GAP }}>
            <div className="flex flex-col shrink-0" style={{ gap: GAP, width: DAY_COL }}>
              {WEEKDAY_LABELS.map((l, i) => (
                <span key={i} className="flex items-center text-caption text-sub leading-none"
                  style={{ height: CELL }}>
                  {l}
                </span>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col shrink-0" style={{ gap: GAP }}>
                {week.map(({ date, count }) => (
                  <div key={date}
                    title={`${date} — ${count} session${count !== 1 ? "s" : ""}`}
                    style={{
                      ...heatStyle(count),
                      width: CELL, height: CELL,
                      // Inset, so marking today never bleeds into the 3px gap
                      // or gets clipped by the scroller at the right edge.
                      boxShadow: date === today ? "inset 0 0 0 2px var(--accent)" : undefined,
                    }}
                    className="rounded-chip transition-colors duration-150" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <span className="text-caption text-sub">Less</span>
        {[0, 1, 2, 3, 4].map(step => (
          <span key={step} className="rounded-chip" style={{
            width: CELL, height: CELL,
            background: step === 0
              ? "color-mix(in srgb, var(--tx) 11%, transparent)"
              : `color-mix(in srgb, var(--accent) ${STEP_MIX[step]}%, transparent)`,
          }} />
        ))}
        <span className="text-caption text-sub">More</span>
      </div>
    </Panel>
  )
}

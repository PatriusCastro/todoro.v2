"use client"

import { useState, useEffect } from "react"
import { type Task, type Subtask } from "../tasks/TaskCard"
import { type Priority, getPriority } from "../../lib/theme"

interface TaskModalProps {
  task?: Task; onSave: (task: Task) => void
  onDelete?: (id: string) => void; onClose: () => void
}

const PRIORITIES: Priority[] = ["high", "mid", "low", "none"]
const LABELS: Record<Priority, string> = { high: "High", mid: "Mid", low: "Low", none: "None" }
function uid() { return Math.random().toString(36).slice(2) }

function MiniCalendar({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const today = new Date()
  const [viewYear,  setViewYear]  = useState(selected ? new Date(selected).getFullYear()  : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected ? new Date(selected).getMonth()      : today.getMonth())

  const firstDay  = new Date(viewYear, viewMonth, 1).getDay()
  const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate()
  const monthName = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long", year: "numeric" })
  const cells     = Array.from({ length: firstDay + daysCount }, (_, i) => i < firstDay ? null : i - firstDay + 1)

  const fmt = (d: number) => {
    const m = String(viewMonth + 1).padStart(2, "0")
    const dd = String(d).padStart(2, "0")
    return `${viewYear}-${m}-${dd}`
  }

  const prev = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }
  const next = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }

  return (
    <div className="bg-surface2 rounded-2xl p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} className="p-1 rounded-lg hover:bg-border text-sub hover:text-tx transition-colors">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span className="text-sm font-bold text-tx">{monthName}</span>
        <button onClick={next} className="p-1 rounded-lg hover:bg-border text-sub hover:text-tx transition-colors">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <span key={d} className="text-center text-[10px] font-semibold text-sub">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = fmt(day)
          const isSelected = dateStr === selected
          const isToday = dateStr === today.toISOString().slice(0, 10)
          return (
            <button key={i} onClick={() => onSelect(dateStr)}
              className={`aspect-square rounded-xl text-xs font-semibold transition-all duration-150
                ${isSelected ? "bg-accent text-white" : isToday ? "border border-accent text-accent" : "text-tx hover:bg-border"}`}>
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatDueLabel(date: string, time: string) {
  if (!date) return "No due date"
  const d   = new Date(date + (time ? `T${time}` : "T00:00"))
  const now  = new Date()
  const diff = Math.floor((d.getTime() - now.setHours(0,0,0,0)) / 86400000)
  const timeStr = time ? ` at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""
  if (diff === 0)  return `Due today${timeStr}`
  if (diff === 1)  return `Due tomorrow${timeStr}`
  if (diff === -1) return `Due yesterday${timeStr}`
  if (diff < 0)    return `Overdue ${Math.abs(diff)}d${timeStr}`
  if (diff < 7)    return `Due in ${diff} days${timeStr}`
  return `Due ${d.toLocaleDateString([], { month: "short", day: "numeric" })}${timeStr}`
}

export default function TaskModal({ task, onSave, onDelete, onClose }: TaskModalProps) {
  const [title,    setTitle]    = useState(task?.title    ?? "")
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "none")
  const [dueDate,  setDueDate]  = useState(task?.dueDate  ?? "")
  const [dueTime,  setDueTime]  = useState(task?.dueTime  ?? "")
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks ?? [])
  const [subInput, setSubInput] = useState("")
  const [showCal,  setShowCal]  = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  const addSub    = () => { if (!subInput.trim()) return; setSubtasks(s => [...s, { id: uid(), title: subInput.trim(), done: false }]); setSubInput("") }
  const removeSub = (id: string) => setSubtasks(s => s.filter(x => x.id !== id))

  const handleSave = () => {
    if (!title.trim()) return
    onSave({ id: task?.id ?? uid(), title: title.trim(), priority, dueDate, dueTime, dueLabel: formatDueLabel(dueDate, dueTime), done: task?.done ?? false, subtasks })
    onClose()
  }

  const dateDisplay = dueDate ? new Date(dueDate + "T00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : "Pick a date"

  return (
    <div className="fixed inset-0 z-200 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md bg-surface border border-border rounded-3xl flex flex-col gap-4 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] max-h-[90dvh] overflow-y-auto">

        <div className="flex items-center justify-between">
          <h2 className="font-black text-lg text-tx">{task ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-surface2 text-sub hover:text-tx flex items-center justify-center transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Title */}
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" autoFocus
          className="w-full bg-surface2 border border-border rounded-2xl px-4 py-3 text-sm font-semibold text-tx placeholder:text-sub outline-none focus:border-accent transition-colors" />

        {/* Priority */}
        <div className="flex gap-2">
          {PRIORITIES.map(p => (
            <button key={p} onClick={() => setPriority(p)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200
                ${priority === p ? "text-white shadow-[0_4px_12px_rgba(108,99,255,0.3)]" : "bg-transparent text-sub border-border hover:border-accent/40"}`}
              style={priority === p ? { background: getPriority(p), borderColor: getPriority(p) } : {}}>
              {LABELS[p]}
            </button>
          ))}
        </div>

        {/* Date picker */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-sub uppercase tracking-wider">Due Date</span>
          <button onClick={() => setShowCal(v => !v)}
            className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors
              ${dueDate ? "border-accent/40 bg-accent/5" : "border-border bg-surface2"}`}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className={dueDate ? "text-accent" : "text-sub"}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className={`text-sm font-semibold ${dueDate ? "text-tx" : "text-sub"}`}>{dateDisplay}</span>
            {dueDate && (
              <button onMouseDown={e => { e.stopPropagation(); setDueDate(""); setDueTime("") }}
                className="ml-auto text-sub hover:text-tx">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </button>
          {showCal && <MiniCalendar selected={dueDate} onSelect={d => { setDueDate(d); setShowCal(false) }} />}

          {/* Time (optional) */}
          {dueDate && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface2 px-4 py-3">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-sub shrink-0">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-tx" />
              <span className="text-xs text-sub">optional</span>
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-sub uppercase tracking-wider">Subtasks</span>
          {subtasks.map(sub => (
            <div key={sub.id} className="flex items-center gap-3 bg-surface2 rounded-xl px-3 py-2.5 border border-border">
              <span className="flex-1 text-sm text-tx">{sub.title}</span>
              <button onMouseDown={() => removeSub(sub.id)} className="text-sub hover:text-priority-high transition-colors">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={subInput} onChange={e => setSubInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSub() } }}
              placeholder="Add subtask…"
              className="flex-1 bg-surface2 border border-border rounded-xl px-3 py-2.5 text-sm text-tx placeholder:text-sub outline-none focus:border-accent transition-colors" />
            <button onClick={addSub} className="px-4 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 text-sm font-bold transition-all">+</button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {onDelete && task && (
            <button onMouseDown={() => { onDelete(task.id); onClose() }}
              className="px-4 py-2.5 rounded-xl border border-priority-high/40 text-priority-high text-sm font-bold hover:bg-priority-high/10 transition-all">
              Delete
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sub text-sm font-semibold hover:text-tx transition-all">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-black shadow-[0_4px_16px_rgba(108,99,255,0.4)] hover:bg-accent-hover disabled:opacity-40 transition-all">
            {task ? "Save" : "Create"}
          </button>
        </div>

      </div>
    </div>
  )
}
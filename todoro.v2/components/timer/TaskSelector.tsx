"use client"

import { useState } from "react"
import { type Task } from "../tasks/TaskCard"
import { getPriority } from "../../lib/theme"

interface TaskSelectorProps { tasks: Task[]; active: Task; onChange: (task: Task) => void }

export default function TaskSelector({ tasks, active, onChange }: TaskSelectorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:border-accent/40 transition-colors duration-200">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getPriority(active.priority) }} />
          <span className="text-sm font-semibold text-tx truncate">{active.title}</span>
        </div>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          className={`text-sub shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden">
          {tasks.map(task => (
            <button key={task.id} onClick={() => { onChange(task); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors duration-150 hover:bg-border/60
                ${task.id === active.id ? "bg-accent/10" : ""}`}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getPriority(task.priority) }} />
              <span className="text-sm font-medium text-tx truncate flex-1">{task.title}</span>
              {task.id === active.id && (
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="text-accent shrink-0">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
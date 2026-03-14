"use client"

import { useState } from "react"
import { type Task } from "../tasks/TaskCard"
import { getPriority } from "../../lib/theme"

interface TaskSelectorProps {
  tasks:    Task[]
  active:   Task
  running:  boolean
  onChange: (task: Task) => void
  onStop:   () => void
}

export default function TaskSelector({ tasks, active, running, onChange, onStop }: TaskSelectorProps) {
  const [open,    setOpen]    = useState(false)
  const [pending, setPending] = useState<Task | null>(null)

  const pendingTasks = tasks.filter(t => !t.done)

  const handleSelect = (task: Task) => {
    setOpen(false)
    if (task.id === active.id) return
    if (running) { setPending(task); return }
    onChange(task)
  }

  const confirmSwitch = () => {
    if (pending) { onStop(); onChange(pending); setPending(null) }
  }

  return (
    <>
      <div className="relative">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:border-accent/40 transition-colors duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getPriority(active.priority) }} />
            <span title={active.title} className="text-sm font-semibold text-tx truncate">{active.title}</span>
          </div>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            className={`text-sub shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden">
            {pendingTasks.map(task => (
              <button key={task.id} onClick={() => handleSelect(task)}
                className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface2
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

      {/* Switch confirmation modal */}
      {pending && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          onClick={() => setPending(null)}>
          <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}>

            <div>
              <h3 className="text-sm font-black text-tx">Switch task?</h3>
              <p className="text-xs text-sub mt-1">Your current focus session will end.</p>
            </div>

            <div className="rounded-xl bg-surface2 border border-border px-4 py-3 flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-sub uppercase tracking-wide">Switching to</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getPriority(pending.priority) }} />
                <span className="text-sm font-semibold text-tx truncate">{pending.title}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setPending(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-sub hover:text-tx transition-all">
                Cancel
              </button>
              <button onClick={confirmSwitch}
                className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-black hover:bg-accent-hover transition-all">
                Switch Task
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  )
}
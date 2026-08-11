"use client"

import { useState } from "react"
import { HiChevronDown, HiCheck, HiMapPin } from "react-icons/hi2"
import { type Task } from "../tasks/TaskCard"
import PriorityChip from "../shared/PriorityChip"
import { sortTasks } from "../../lib/taskOrder"
import { usePinnedTasks } from "../../hooks/usePinnedTasks"

interface TaskSelectorProps {
  tasks:    Task[]
  active:   Task
  onChange: (task: Task) => void
  quickMode?: boolean
}

export default function TaskSelector({ tasks, active, onChange, quickMode = false }: TaskSelectorProps) {
  const [open, setOpen] = useState(false)

  const { pinned }   = usePinnedTasks()
  const pendingTasks = sortTasks(tasks.filter(t => !t.done), active.id, pinned)
  const allDone      = pendingTasks.length === 0

  // Switching pauses the running session (handled by the parent) and never
  // resets — elapsed time is preserved, so no confirmation is needed.
  const handleSelect = (task: Task) => {
    setOpen(false)
    if (task.id === active.id) return
    onChange(task)
  }

  const isQuickModeActive = quickMode && active.title === ""

  return (
    <>
      <div className="relative">
        <button
          onClick={() => { if (!allDone || quickMode) setOpen(o => !o) }}
          className={`w-full flex items-center justify-between gap-3 rounded-xl border bg-surface px-4 py-3 transition-colors duration-200
            ${allDone && !quickMode ? "border-border opacity-50 cursor-not-allowed" : "border-border hover:border-accent/40"}`}>
          <div className="flex items-center gap-2 min-w-0">
            {isQuickModeActive
              ? <span className="text-sm text-sub italic">Quick Mode — no task selected</span>
              : allDone
              ? <span className="text-sm text-sub italic">All tasks completed</span>
              : <>
                  <PriorityChip priority={active.priority} />
                  <span title={active.title} className="text-sm font-semibold text-tx truncate">{active.title}</span>
                </>
            }
          </div>
          {(!allDone || (quickMode && isQuickModeActive)) && (
            <HiChevronDown size={14} className={`text-sub shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          )}
        </button>

        {open && (!allDone || quickMode) && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden">
            {quickMode && isQuickModeActive && (
              <button onClick={() => { setOpen(false) }}
                className="w-full flex items-center gap-2 px-4 py-3 text-left text-accent transition-colors duration-150 hover:bg-surface2">
                <span className="text-sm font-semibold">Continue in Quick Mode</span>
              </button>
            )}
            {pendingTasks.map(task => (
              <button key={task.id} onClick={() => handleSelect(task)}
                className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface2
                  ${task.id === active.id ? "bg-accent/10" : ""}`}>
                {pinned.has(task.id) && <HiMapPin size={11} className="text-accent shrink-0" />}
                <PriorityChip priority={task.priority} />
                <span className="text-sm font-medium text-tx truncate flex-1">{task.title}</span>
                {task.id === active.id && <HiCheck size={12} className="text-accent shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
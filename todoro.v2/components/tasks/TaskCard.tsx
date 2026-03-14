"use client"

import { useState } from "react"
import { getPriority, type Priority } from "@/lib/theme"

export interface Subtask { id: string; title: string; done: boolean }
export interface Task {
  id: string; title: string; priority: Priority
  dueDate?: string; dueTime?: string; dueLabel: string
  done: boolean; subtasks: Subtask[]
  estimatedSessions: number
  completedSessions: number
}

interface TaskCardProps {
  task: Task; onToggle?: (id: string) => void
  onToggleSub?: (taskId: string, subId: string) => void
  onClick?: (task: Task) => void; onEdit?: (task: Task) => void
  compact?: boolean; isActive?: boolean
}

export default function TaskCard({
  task, onToggle, onToggleSub, onClick, onEdit,
  compact = false, isActive = false,
}: TaskCardProps) {
  const [expanded,      setExpanded]      = useState(false)
  const [titleExpanded, setTitleExpanded] = useState(false)

  const dot        = getPriority(task.priority)
  const doneCount  = task.subtasks.filter(s => s.done).length
  const hasDetails = task.subtasks.length > 0 || task.estimatedSessions > 0
  const expandable = !compact && hasDetails

  const handleRowClick = () => {
    if (onClick) onClick(task)
    else if (expandable) setExpanded(v => !v)
  }

  return (
    <div className={`rounded-2xl border transition-all duration-200
      ${isActive ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-accent/40"}
      ${task.done ? "opacity-60" : ""}`}>

      <div className={`flex items-center gap-3 select-none ${compact ? "px-3 py-3" : "px-4 py-4"}`}>

        {/* Checkbox */}
        <button
          onClick={e => { e.stopPropagation(); onToggle?.(task.id) }}
          className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all duration-200
            ${task.done ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
          {task.done && <svg width="10" height="10" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
        </button>

        {/* Body */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleRowClick}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
            <span
              onClick={e => { e.stopPropagation(); setTitleExpanded(v => !v) }}
              className={`text-sm font-semibold ${task.done ? "line-through text-sub" : "text-tx"}
                ${titleExpanded ? "wrap-break-word whitespace-normal" : "truncate"}`}>
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-sub">{task.dueLabel}</span>
            {task.subtasks.length > 0 && (
              <span className="text-[11px] text-sub">· {doneCount}/{task.subtasks.length} subtasks</span>
            )}
            {task.estimatedSessions > 0 && (
              <span className="text-[11px] text-sub">
                · {task.completedSessions}/{task.estimatedSessions} sessions
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit(task) }}
              className="p-1.5 rounded-lg text-sub hover:text-accent hover:bg-accent/10 transition-all duration-150">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          )}
          {expandable && (
            <button onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
              className="p-1.5 rounded-lg text-sub hover:text-tx hover:bg-surface2 transition-all duration-150">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expandable && expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border pt-3 ml-12">

          {task.estimatedSessions > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 flex-1">
                {Array.from({ length: task.estimatedSessions }).map((_, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                    ${i < task.completedSessions ? "bg-accent" : "bg-ring"}`} />
                ))}
              </div>
              <span className="text-[11px] text-sub shrink-0">
                {task.completedSessions}/{task.estimatedSessions} sessions
              </span>
            </div>
          )}

          {task.subtasks.map(sub => (
            <SubtaskRow key={sub.id} sub={sub} taskId={task.id} onToggleSub={onToggleSub} />
          ))}

        </div>
      )}
    </div>
  )
}

function SubtaskRow({ sub, taskId, onToggleSub }: {
  sub: { id: string; title: string; done: boolean }
  taskId: string
  onToggleSub?: (taskId: string, subId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="flex items-center gap-3">
      <button onClick={e => { e.stopPropagation(); onToggleSub?.(taskId, sub.id) }}
        className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all duration-200
          ${sub.done ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
        {sub.done && <svg width="8" height="8" fill="none" stroke="white" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
      </button>
      <span
        onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
        className={`text-xs flex-1 min-w-0 cursor-pointer ${sub.done ? "line-through text-sub" : "text-tx"}
          ${expanded ? "wrap-break-word whitespace-normal" : "truncate"}`}>
        {sub.title}
      </span>
    </div>
  )
}
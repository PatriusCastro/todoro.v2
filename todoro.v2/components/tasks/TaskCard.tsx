"use client"

import { useState } from "react"
import { HiPencil, HiChevronDown, HiCheck, HiPlay, HiMapPin, HiTrash } from "react-icons/hi2"
import { getPriority, type Priority } from "../../lib/theme"
import { useSwipe } from "../../hooks/useSwipe"

export interface Subtask { id: string; title: string; done: boolean }
export interface Task {
  id: string; title: string; priority: Priority
  dueDate?: string; dueTime?: string; dueLabel: string
  done: boolean; subtasks: Subtask[]
  estimatedSessions: number; completedSessions: number
}

interface TaskCardProps {
  task: Task
  onToggle?: (id: string) => void
  onToggleSub?: (taskId: string, subId: string) => void
  onClick?: (task: Task) => void
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
  onPin?: (id: string) => void
  onQuickStart?: (task: Task) => void
  compact?: boolean
  isActive?: boolean
  isPinned?: boolean
}

export default function TaskCard({
  task, onToggle, onToggleSub, onClick, onEdit,
  onDelete, onPin, onQuickStart,
  compact = false, isActive = false, isPinned = false,
}: TaskCardProps) {
  const [expanded,      setExpanded]      = useState(false)
  const [titleExpanded, setTitleExpanded] = useState(false)

  const { ref, swipeHandlers } = useSwipe({
    onSwipeRight: onPin    ? () => onPin(task.id)  : undefined,
    onSwipeLeft:  onDelete ? () => onDelete(task)  : undefined,
  })

  const dot        = getPriority(task.priority)
  const doneCount  = task.subtasks.filter(s => s.done).length
  const hasDetails = task.subtasks.length > 0 || task.estimatedSessions > 0
  const expandable = !compact && hasDetails

  return (
    <div className="relative rounded-2xl overflow-hidden">

      <div className="absolute inset-0 flex pointer-events-none select-none">
        <div className="flex flex-col items-center justify-center gap-1 w-24 rounded-l-2xl bg-accent/15">
          <HiMapPin size={15} className="text-accent" />
          <span className="text-[10px] font-bold text-accent">{isPinned ? "Unpin" : "Pin"}</span>
        </div>
        <div className="flex-1" />
        <div className="flex flex-col items-center justify-center gap-1 w-24 rounded-r-2xl bg-red-500/15">
          <HiTrash size={15} className="text-red-500" />
          <span className="text-[10px] font-bold text-red-500">Delete</span>
        </div>
      </div>

      <div
        ref={ref}
        {...swipeHandlers}
        style={{ touchAction: "pan-y", willChange: "transform" }}
        className={`relative rounded-2xl border transition-colors duration-200
          ${isActive  ? "border-accent bg-surface" : "border-border bg-surface hover:border-accent/40"}
          ${task.done ? "opacity-60" : ""}`}>

        <div className={`flex items-center gap-3 ${compact ? "px-3 py-3" : "px-4 py-4"}`}>

          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onToggle?.(task.id) }}
            className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all duration-200
              ${task.done ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
            {task.done && <HiCheck size={10} color="white" />}
          </button>

          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => onClick ? onClick(task) : expandable && setExpanded(v => !v)}>
            <div className="flex items-center gap-2">
              {isPinned  && <HiMapPin size={10} className="text-accent shrink-0" />}
              {isActive  && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 animate-pulse" />}
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
              <span
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setTitleExpanded(v => !v) }}
                className={`text-sm font-semibold select-none
                  ${task.done ? "line-through text-sub" : "text-tx"}
                  ${titleExpanded ? "wrap-break-words whitespace-normal" : "truncate"}`}>
                {task.title}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[11px] text-sub">{task.dueLabel}</span>
              {task.subtasks.length > 0 && (
                <span className="text-[11px] text-sub">· {doneCount}/{task.subtasks.length} subtasks</span>
              )}
              {task.estimatedSessions > 0 && (
                <span className="text-[11px] text-sub">· {task.completedSessions}/{task.estimatedSessions} sessions</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onQuickStart && !task.done && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onQuickStart(task) }}
                className="p-1.5 rounded-lg text-sub hover:text-accent hover:bg-accent/10 transition-all duration-150">
                <HiPlay size={13} />
              </button>
            )}
            {onEdit && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onEdit(task) }}
                className="p-1.5 rounded-lg text-sub hover:text-accent hover:bg-accent/10 transition-all duration-150">
                <HiPencil size={13} />
              </button>
            )}
            {expandable && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
                className="p-1.5 rounded-lg text-sub hover:text-tx hover:bg-surface2 transition-all duration-150">
                <HiChevronDown size={13} className="transition-transform duration-200"
                  style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
              </button>
            )}
          </div>
        </div>

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
                  {task.completedSessions}/{task.estimatedSessions}
                </span>
              </div>
            )}
            {task.subtasks.map(sub => (
              <SubtaskRow key={sub.id} sub={sub} taskId={task.id} onToggleSub={onToggleSub} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SubtaskRow({ sub, taskId, onToggleSub }: {
  sub: Subtask; taskId: string
  onToggleSub?: (taskId: string, subId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={e => { e.stopPropagation(); onToggleSub?.(taskId, sub.id) }}
        className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all duration-200
          ${sub.done ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
        {sub.done && <HiCheck size={8} color="white" />}
      </button>
      <span
        onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
        className={`text-xs flex-1 min-w-0 cursor-pointer
          ${sub.done ? "line-through text-sub" : "text-tx"}
          ${expanded ? "wrap-break-words whitespace-normal" : "truncate"}`}>
        {sub.title}
      </span>
    </div>
  )
}
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
  projectId?: string
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
  const [expanded, setExpanded] = useState(false)
  const [titleExpanded, setTitleExpanded] = useState(false)

  const { ref, swipeHandlers } = useSwipe({
    onSwipeRight: onPin    ? () => onPin(task.id) : undefined,
    onSwipeLeft:  onDelete ? () => onDelete(task) : undefined,
  })

  const dot        = getPriority(task.priority)
  const doneCount  = task.subtasks.filter(s => s.done).length
  const hasDetails = task.subtasks.length > 0 || task.estimatedSessions > 0
  const expandable = !compact && hasDetails

  function isSwiped() {
    if (!ref.current) return false
    const style  = window.getComputedStyle(ref.current)
    const matrix = new DOMMatrixReadOnly(style.transform)
    return matrix.m41 !== 0
  }

  return (
    <div className="relative rounded-xl overflow-hidden">

      {/* Swipe hint */}
      <div
        className="absolute inset-0 flex pointer-events-none select-none transition-opacity duration-150"
        style={{ opacity: isSwiped() ? 1 : 0 }}>
        <div className="flex flex-col items-center justify-center gap-1 w-20 bg-accent/10 rounded-l-xl">
          <HiMapPin size={14} className="text-accent" />
          <span className="text-[10px] font-semibold text-accent">{isPinned ? "Unpin" : "Pin"}</span>
        </div>
        <div className="flex-1" />
        <div className="flex flex-col items-center justify-center gap-1 w-20 bg-red-500/10 rounded-r-xl">
          <HiTrash size={14} className="text-red-500" />
          <span className="text-[10px] font-semibold text-red-500">Delete</span>
        </div>
      </div>

      {/* Card */}
      <div
        ref={ref}
        {...swipeHandlers}
        style={{ touchAction: "pan-y", willChange: "transform" }}
        className={`relative rounded-xl transition-colors duration-150
          bg-surface2 border border-border my-1
          ${isActive ? "border-accent/50" : "hover:border-border/80"}
          ${task.done ? "opacity-50" : ""}`}>

        <div className={`flex items-center gap-3 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>

          {/* Checkbox */}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onToggle?.(task.id) }}
            className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center
              transition-colors duration-150
              ${task.done ? "bg-accent border-accent" : "border-border"}`}>
            {task.done && <HiCheck size={10} color="white" />}
          </button>

          {/* Text */}
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => onClick ? onClick(task) : expandable && setExpanded(v => !v)}>

            <div className="flex items-center gap-2 min-w-0">
              {isPinned && <HiMapPin size={10} className="text-accent shrink-0" />}
              {isActive  && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 animate-pulse" />}
              {task.priority !== "none" && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
              )}
              <span
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setTitleExpanded(v => !v) }}
                className={`text-[13px] font-medium select-none leading-snug
                  ${task.done ? "line-through text-sub" : "text-tx"}
                  ${titleExpanded ? "wrap-break-words whitespace-normal" : "truncate"}`}>
                {task.title}
              </span>
            </div>

            {/* Meta */}
            {(task.dueLabel !== "No due date" || task.subtasks.length > 0 || task.estimatedSessions > 0) && (
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {task.dueLabel && task.dueLabel !== "No due date" && (
                  <span className={`text-[11px] ${task.dueLabel.startsWith("Overdue") ? "text-red-400" : "text-sub"}`}>
                    {task.dueLabel}
                  </span>
                )}
                {task.subtasks.length > 0 && (
                  <span className="text-[11px] text-sub">
                    {task.dueLabel && task.dueLabel !== "No due date" ? "·" : ""} {doneCount}/{task.subtasks.length} subtasks
                  </span>
                )}
                {task.estimatedSessions > 0 && (
                  <span className="text-[11px] text-sub">
                    · {task.completedSessions}/{task.estimatedSessions} sessions
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            {onQuickStart && !task.done && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onQuickStart(task) }}
                className="p-1.5 rounded-lg text-sub hover:text-accent hover:bg-accent/10 transition-colors duration-150">
                <HiPlay size={13} />
              </button>
            )}
            {onEdit && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onEdit(task) }}
                className="p-1.5 rounded-lg text-sub hover:text-accent hover:bg-accent/10 transition-colors duration-150">
                <HiPencil size={13} />
              </button>
            )}
            {expandable && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
                className="p-1.5 rounded-lg text-sub hover:text-tx transition-colors duration-150">
                <HiChevronDown size={13}
                  className="transition-transform duration-200"
                  style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
              </button>
            )}
          </div>
        </div>

        {/* Expanded panel */}
        {expandable && expanded && (
          <div className="px-4 pb-3.5 pt-2.5 flex flex-col gap-2.5 border-t border-border ml-11">
            {task.estimatedSessions > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 flex-1">
                  {Array.from({ length: task.estimatedSessions }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                      style={{ backgroundColor: i < task.completedSessions ? dot : undefined }}
                      {...(i >= task.completedSessions ? { className: "h-1.5 flex-1 rounded-full bg-border" } : {})}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-sub tabular-nums shrink-0">
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
        className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors duration-150
          ${sub.done ? "bg-accent border-accent" : "border-border hover:border-accent"}`}>
        {sub.done && <HiCheck size={8} color="white" />}
      </button>
      <span
        onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
        className={`text-xs flex-1 min-w-0 cursor-pointer leading-snug
          ${sub.done ? "line-through text-sub" : "text-tx"}
          ${expanded ? "wrap-break-words whitespace-normal" : "truncate"}`}>
        {sub.title}
      </span>
    </div>
  )
}
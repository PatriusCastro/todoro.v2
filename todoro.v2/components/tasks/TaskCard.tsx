"use client"

import { useState, useRef } from "react"
import { HiChevronDown, HiCheck, HiPlay, HiMapPin, HiTrash, HiArrowPath, HiFolder, HiPencil } from "react-icons/hi2"
import { type Priority } from "../../lib/theme"
import { useSwipe } from "../../hooks/useSwipe"
import PriorityChip from "../shared/PriorityChip"

export type Repeat = "none" | "daily" | "weekly"
export interface Subtask { id: string; title: string; done: boolean }
export interface Task {
  id: string; title: string; priority: Priority
  dueDate?: string; dueTime?: string; dueLabel: string
  done: boolean; subtasks: Subtask[]
  estimatedSessions: number; completedSessions: number
  projectId?: string
  repeat?: Repeat
  /** Board lane for an open task. `done` still decides completion — see lib/board. */
  stage?: "todo" | "doing"
}

interface TaskCardProps {
  task: Task
  onToggle?: (id: string) => void
  onToggleSub?: (taskId: string, subId: string) => void
  onClick?: (task: Task) => void
  onDelete?: (task: Task) => void
  onPin?: (id: string) => void
  onQuickStart?: (task: Task) => void
  compact?: boolean
  isActive?: boolean
  isPinned?: boolean
  /** Shown as a tappable chip so a flat list still says where a task lives */
  projectName?: string
  projectColor?: string
  onProjectClick?: () => void
}

export default function TaskCard({
  task, onToggle, onToggleSub, onClick,
  onDelete, onPin, onQuickStart,
  compact = false, isActive = false, isPinned = false,
  projectName, projectColor, onProjectClick,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)

  const { ref, swipeHandlers } = useSwipe({
    onSwipeRight: onPin    ? () => onPin(task.id) : undefined,
    onSwipeLeft:  onDelete ? () => onDelete(task) : undefined,
  })

  const doneCount  = task.subtasks.filter(s => s.done).length
  const hasDetails = task.subtasks.length > 0 || task.estimatedSessions > 0
  const expandable = !compact && hasDetails

  function isSwiped() {
    if (!ref.current) return false
    const style  = window.getComputedStyle(ref.current)
    const matrix = new DOMMatrixReadOnly(style.transform)
    return matrix.m41 !== 0
  }

  // The row is also the swipe surface, so a drag ending on it isn't a tap.
  const downAt = useRef<{ x: number; y: number } | null>(null)
  const openTask = (e: React.MouseEvent) => {
    const d = downAt.current
    if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) return
    if (onClick) onClick(task)
    else if (expandable) setExpanded(v => !v)
  }

  return (
    // One row treatment everywhere: a divider-separated list, not a stack of
    // bordered cards. Cards inside a card was the "nothing outranks anything"
    // problem in miniature.
    <div className="relative overflow-hidden border-t border-border first:border-t-0">

      {/* Swipe hint */}
      <div
        className="absolute inset-0 flex pointer-events-none select-none transition-opacity duration-150"
        style={{ opacity: isSwiped() ? 1 : 0 }}>
        <div className="flex flex-col items-center justify-center gap-1 w-20 bg-accent/10">
          <HiMapPin size={14} className="text-accent" />
          <span className="text-caption font-semibold text-accent">{isPinned ? "Unpin" : "Pin"}</span>
        </div>
        <div className="flex-1" />
        <div className="flex flex-col items-center justify-center gap-1 w-20 bg-red-500/10">
          <HiTrash size={14} className="text-red-500" />
          <span className="text-caption font-semibold text-red-500">Delete</span>
        </div>
      </div>

      {/* Row */}
      <div
        ref={ref}
        {...swipeHandlers}
        style={{ touchAction: "pan-y", willChange: "transform" }}
        className={`relative transition-colors duration-150
          ${isActive && !task.done ? "bg-accent/8" : "bg-transparent"}
          ${task.done ? "opacity-50" : ""}`}>

        {/* Padding steps down below 380px — the title is the only part of the
            row that cannot shrink to an icon. */}
        <div
          onPointerDown={e => { downAt.current = { x: e.clientX, y: e.clientY } }}
          onClick={openTask}
          className={`flex items-center gap-2 xs:gap-3 py-3.5 ${compact ? "px-1" : "px-1 xs:px-2"}
            ${onClick || expandable ? "cursor-pointer" : ""}`}>

          {/* Checkbox — 22px circle inside a 44px target. Completing a task is
              the single most-tapped control here and the easiest to fat-finger. */}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onToggle?.(task.id) }}
            aria-pressed={task.done}
            aria-label={task.done ? `Mark "${task.title}" as not done` : `Complete "${task.title}"`}
            className="w-11 h-11 -ml-2.5 shrink-0 grid place-items-center rounded-pill">
            <span className={`w-5.5 h-5.5 rounded-full border-2 grid place-items-center
              transition-colors duration-150
              ${task.done ? "bg-accent border-accent" : "border-border"}`}>
              {task.done && <HiCheck size={11} color="white" />}
            </span>
          </button>

          {/* Text */}
          <div className="flex-1 min-w-0">

            <div className="flex items-center gap-2 min-w-0">
              {/* Carries pinned state wherever the pin button isn't. */}
              {isPinned && (
                <HiMapPin size={12}
                  className={`text-accent shrink-0 ${onPin && !compact ? "sm:hidden" : ""}`} />
              )}
              <PriorityChip priority={task.priority} />
              {/* Wraps to two lines instead of hiding behind a tap-to-expand
                  that sat pixels away from "open task" and fired by mistake. */}
              <span
                title={task.title}
                className={`${compact ? "text-lead" : "text-lead"} font-extrabold leading-snug wrap-break-words line-clamp-2 min-w-0
                  ${task.done ? "line-through text-sub" : "text-tx"}`}>
                {task.title}
              </span>
            </div>

            {/* Meta */}
            {(projectName || task.dueLabel !== "No due date" || task.subtasks.length > 0 || task.estimatedSessions > 0 || (task.repeat && task.repeat !== "none")) && (
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {projectName && (
                  <span
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { if (onProjectClick) { e.stopPropagation(); onProjectClick() } }}
                    className={`inline-flex items-center gap-1 max-w-36 rounded-md px-1.5 py-0.5 text-caption font-semibold
                      ${onProjectClick ? "cursor-pointer hover:brightness-110" : ""}`}
                    style={{ backgroundColor: `${projectColor ?? "#888"}22`, color: projectColor ?? "#888" }}>
                    <HiFolder size={10} className="shrink-0" />
                    <span className="truncate">{projectName}</span>
                  </span>
                )}
                {task.repeat && task.repeat !== "none" && (
                  <span className="text-meta text-accent flex items-center gap-0.5">
                    <HiArrowPath size={11} /> <span className="capitalize">{task.repeat}</span>
                  </span>
                )}
                {task.dueLabel && task.dueLabel !== "No due date" && (
                  <span className={`text-meta ${task.dueLabel.startsWith("Overdue") ? "text-red-400" : "text-sub"}`}>
                    {task.dueLabel}
                  </span>
                )}
                {task.subtasks.length > 0 && (
                  <span className="text-meta text-sub">
                    {task.dueLabel && task.dueLabel !== "No due date" ? "·" : ""} {doneCount}/{task.subtasks.length} subtasks
                  </span>
                )}
                {task.estimatedSessions > 0 && (
                  <span className="text-meta text-sub">
                    · {task.completedSessions}/{task.estimatedSessions} sessions
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 xs:gap-1.5 shrink-0">
            {/* A word beats a pulsing dot: "Now" says which task the timer is on
                without the reader having to learn what the dot meant. */}
            {isActive && !task.done && (
              <span className="mr-1 shrink-0 px-2 py-1 rounded-chip bg-accent text-white
                text-caption font-extrabold uppercase tracking-wider leading-none">
                Now
              </span>
            )}
            {/* Two 44px buttons is all a phone row can spare, so pin steps back
                to sm+; on a phone it stays swipe-right. Delete is swipe-left. */}
            {onPin && !task.done && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onPin(task.id) }}
                aria-pressed={isPinned}
                aria-label={isPinned ? `Unpin "${task.title}"` : `Pin "${task.title}" to work on next`}
                className={`w-11 h-11 shrink-0 hidden sm:grid place-items-center rounded-control border
                  transition-colors duration-150
                  ${isPinned
                    ? "border-accent bg-accent text-white"
                    : "border-border text-tx hover:border-accent hover:text-accent"}`}>
                <HiMapPin size={16} />
              </button>
            )}
            {onClick && !task.done && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onClick(task) }}
                aria-label={`Edit "${task.title}"`}
                title="Edit task"
                className="w-11 h-11 shrink-0 grid place-items-center rounded-control border border-border
                  text-tx hover:border-accent hover:text-accent transition-colors duration-150">
                <HiPencil size={15} />
              </button>
            )}
            {onQuickStart && !task.done && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onQuickStart(task) }}
                aria-label={`Start a focus session on "${task.title}"`}
                className="w-11 h-11 shrink-0 grid place-items-center rounded-control border border-border
                  text-tx hover:border-accent hover:text-accent transition-colors duration-150">
                <HiPlay size={16} />
              </button>
            )}
            {expandable && !onClick && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
                aria-expanded={expanded}
                aria-label={expanded ? "Hide details" : "Show details"}
                className="w-9 h-9 grid place-items-center rounded-lg text-sub hover:text-tx transition-colors duration-150">
                <HiChevronDown size={15}
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
                      className={`h-1.5 flex-1 rounded-chip transition-colors duration-300
                        ${i < task.completedSessions ? "bg-accent" : "bg-border"}`}
                    />
                  ))}
                </div>
                <span className="text-meta text-sub tabular-nums shrink-0">
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
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onToggleSub?.(taskId, sub.id) }}
        aria-pressed={sub.done}
        aria-label={sub.done ? `Mark "${sub.title}" as not done` : `Complete "${sub.title}"`}
        className="w-11 h-11 -ml-3.5 -my-2 shrink-0 grid place-items-center">
        <span className={`w-4.5 h-4.5 rounded border-2 grid place-items-center transition-colors duration-150
          ${sub.done ? "bg-accent border-accent" : "border-border"}`}>
          {sub.done && <HiCheck size={9} color="white" />}
        </span>
      </button>
      <span
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
        className={`text-meta flex-1 min-w-0 cursor-pointer leading-snug
          ${sub.done ? "line-through text-sub" : "text-tx"}
          ${expanded ? "wrap-break-words whitespace-normal" : "truncate"}`}>
        {sub.title}
      </span>
    </div>
  )
}
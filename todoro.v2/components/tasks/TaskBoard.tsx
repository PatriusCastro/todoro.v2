"use client"

import { useState, useRef } from "react"
import {
  HiChevronLeft, HiChevronRight, HiPlay, HiMapPin, HiFolder,
  HiCheck, HiArrowPath,
} from "react-icons/hi2"
import { type Task } from "./TaskCard"
import { type Project } from "./TaskModal"
import { STAGES, stageOf, stageStep, type Stage } from "../../lib/board"
import PriorityChip from "../shared/PriorityChip"
import Panel from "../shared/Panel"

interface TaskBoardProps {
  /** Every task the board should show, open and done alike. */
  tasks:     Task[]
  projects:  Project[]
  activeTaskId: string
  pinnedIds: ReadonlySet<string>
  onMove:    (task: Task, to: Stage) => void
  onOpen:    (task: Task) => void
  onQuickStart?: (task: Task) => void
  onOpenProject?: (p: Project) => void
  /** Header slot — the view switch lives here so it sits in the same place as the list's. */
  action?:   React.ReactNode
}

/**
 * To do · In progress · Done.
 *
 * Drag works on pointer devices; the ◀ ▶ buttons on every card are the touch
 * and keyboard path, because HTML5 drag-and-drop does not fire for touch at all
 * and a board you can only rearrange with a mouse is not a board on a phone.
 */
export default function TaskBoard({
  tasks, projects, activeTaskId, pinnedIds,
  onMove, onOpen, onQuickStart, onOpenProject, action,
}: TaskBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<Stage | null>(null)

  const projectOf = (t: Task) =>
    t.projectId ? projects.find(p => p.id === t.projectId) : undefined

  const drop = (to: Stage) => {
    const task = tasks.find(t => t.id === dragId)
    setDragId(null); setOverStage(null)
    if (task && stageOf(task) !== to) onMove(task, to)
  }

  return (
    <Panel bare className="px-2 xs:px-3 py-2">
      <div className="flex items-center gap-3 px-1 pt-1 pb-2">
        <span className="text-caption font-extrabold uppercase tracking-wider text-tx">
          Board — {tasks.length}
        </span>
        {action && <div className="ml-auto">{action}</div>}
      </div>

      {/* One column per stage. Phones scroll the columns horizontally with snap
          so a lane always lands square in the viewport instead of half-cut. */}
      <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto snap-x snap-mandatory
        pb-2 -mx-1 px-1 [scrollbar-width:thin]">
        {STAGES.map(({ key, label }) => {
          const column = tasks.filter(t => stageOf(t) === key)
          return (
            <section
              key={key}
              onDragOver={e => { e.preventDefault(); setOverStage(key) }}
              onDragLeave={() => setOverStage(s => s === key ? null : s)}
              onDrop={e => { e.preventDefault(); drop(key) }}
              className={`shrink-0 snap-start w-[82%] xs:w-[70%] sm:w-64 md:w-auto flex flex-col gap-2
                max-h-[70dvh] rounded-panel border p-2 transition-colors duration-150
                ${overStage === key && dragId
                  ? "border-accent bg-accent/8"
                  : "border-border bg-surface2/40"}`}>

              {/* Header stays put while the lane scrolls — the count is how you
                  know there is more below the fold. */}
              <div className="shrink-0 flex items-center gap-2 px-1.5 pt-1">
                <span className={`text-caption font-extrabold uppercase tracking-wider
                  ${key === "done" ? "text-sub" : "text-tx"}`}>
                  {label}
                </span>
                <span className="ml-auto text-caption font-extrabold tabular-nums text-sub">
                  {column.length}
                </span>
              </div>

              {/* A lane is capped rather than growing without limit: thirty
                  tasks in "To do" would otherwise push Done off the page and
                  make the board taller than the thing it is summarising. */}
              <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto overscroll-contain
                -mr-1 pr-1 [scrollbar-width:thin]">
                {column.length === 0 ? (
                  <p className="px-1.5 py-6 text-caption text-sub text-center">
                    {key === "done" ? "Nothing finished yet" : "Drop a task here"}
                  </p>
                ) : (
                  column.map(task => (
                    <BoardCard
                      key={task.id}
                      task={task}
                      stage={key}
                      project={projectOf(task)}
                      isActive={task.id === activeTaskId}
                      isPinned={pinnedIds.has(task.id)}
                      dragging={dragId === task.id}
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => { setDragId(null); setOverStage(null) }}
                      onMove={onMove}
                      onOpen={onOpen}
                      onQuickStart={onQuickStart}
                      onOpenProject={onOpenProject} />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </Panel>
  )
}

function BoardCard({
  task, stage, project, isActive, isPinned, dragging,
  onDragStart, onDragEnd, onMove, onOpen, onQuickStart, onOpenProject,
}: {
  task: Task; stage: Stage; project?: Project
  isActive: boolean; isPinned: boolean; dragging: boolean
  onDragStart: () => void; onDragEnd: () => void
  onMove: (t: Task, to: Stage) => void
  onOpen: (t: Task) => void
  onQuickStart?: (t: Task) => void
  onOpenProject?: (p: Project) => void
}) {
  const prev = stageStep(stage, -1)
  const next = stageStep(stage, 1)
  const doneSubs = task.subtasks.filter(s => s.done).length

  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  // A card is both draggable and tappable. Browsers differ on whether a drop
  // is followed by a click, and "I moved it" must never also mean "open it".
  const dragged = useRef(false)

  return (
    <article
      title="Open task"
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; dragged.current = true; onDragStart() }}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (dragged.current) { dragged.current = false; return }
        onOpen(task)
      }}
      className={`shrink-0 flex flex-col gap-2 rounded-control border p-2.5 cursor-pointer
        transition-[opacity,border-color] duration-150
        ${dragging ? "opacity-40" : "opacity-100"}
        ${isActive && !task.done
          ? "border-accent bg-accent/8"
          : "border-border bg-panel hover:border-accent/40"}
        ${task.done ? "opacity-60" : ""}`}>

      <div className="flex items-start gap-2 min-w-0">
        {isPinned && !task.done && <HiMapPin size={12} className="text-accent shrink-0 mt-1" />}
        {task.done
          ? <HiCheck size={13} className="text-accent shrink-0 mt-0.5" />
          : <span className="mt-1 shrink-0"><PriorityChip priority={task.priority} /></span>}
        <span className={`text-meta font-extrabold leading-snug wrap-break-words line-clamp-3 min-w-0
          ${task.done ? "line-through text-sub" : "text-tx"}`}>
          {task.title}
        </span>
      </div>

      {(project || task.dueLabel !== "No due date" || task.subtasks.length > 0
        || task.estimatedSessions > 0 || (task.repeat && task.repeat !== "none")) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {project && (
            <span
              onPointerDown={stop}
              onClick={e => { if (onOpenProject) { e.stopPropagation(); onOpenProject(project) } }}
              className={`inline-flex items-center gap-1 max-w-full rounded-md px-1.5 py-0.5 text-caption font-semibold
                ${onOpenProject ? "hover:brightness-110" : ""}`}
              style={{ backgroundColor: `${project.color}22`, color: project.color }}>
              <HiFolder size={10} className="shrink-0" />
              <span className="truncate">{project.name}</span>
            </span>
          )}
          {task.repeat && task.repeat !== "none" && (
            <span className="text-caption text-accent flex items-center gap-0.5">
              <HiArrowPath size={10} /> <span className="capitalize">{task.repeat}</span>
            </span>
          )}
          {task.dueLabel && task.dueLabel !== "No due date" && (
            <span className={`text-caption ${task.dueLabel.startsWith("Overdue") ? "text-red-400" : "text-sub"}`}>
              {task.dueLabel}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span className="text-caption text-sub">{doneSubs}/{task.subtasks.length} subtasks</span>
          )}
        </div>
      )}

      {task.estimatedSessions > 0 && (
        <div className="flex items-center gap-1">
          {Array.from({ length: task.estimatedSessions }).map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-chip
              ${i < task.completedSessions ? "bg-accent" : "bg-border"}`} />
          ))}
        </div>
      )}

      {/* Move · move · start. These are the touch path for what dragging does
          on a mouse, so they are on every card rather than behind a hover. */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <button
          onPointerDown={stop}
          onClick={e => { stop(e); if (prev) onMove(task, prev) }}
          disabled={!prev}
          aria-label={prev ? `Move "${task.title}" to ${STAGES.find(s => s.key === prev)!.label}` : "Already in the first column"}
          className="w-10 h-10 shrink-0 grid place-items-center rounded-control border border-border text-tx
            enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-30 transition-colors duration-150">
          <HiChevronLeft size={15} />
        </button>
        <button
          onPointerDown={stop}
          onClick={e => { stop(e); if (next) onMove(task, next) }}
          disabled={!next}
          aria-label={next ? `Move "${task.title}" to ${STAGES.find(s => s.key === next)!.label}` : "Already in the last column"}
          className="w-10 h-10 shrink-0 grid place-items-center rounded-control border border-border text-tx
            enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-30 transition-colors duration-150">
          <HiChevronRight size={15} />
        </button>
        {/* No edit button here: a column is ~200px on a 320px phone, which is
            three 40px buttons wide, and the whole card already opens the task.
            The list rows are the crowded ones that needed an explicit pencil. */}
        {onQuickStart && !task.done && (
          <button
            onPointerDown={stop}
            onClick={e => { stop(e); onQuickStart(task) }}
            aria-label={`Start a focus session on "${task.title}"`}
            className="ml-auto w-10 h-10 shrink-0 grid place-items-center rounded-control border border-border text-tx
              hover:border-accent hover:text-accent transition-colors duration-150">
            <HiPlay size={14} />
          </button>
        )}
      </div>
    </article>
  )
}

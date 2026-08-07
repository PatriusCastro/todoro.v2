"use client"

import { HiMapPin, HiFolder } from "react-icons/hi2"
import { type Task } from "./TaskCard"
import { type Project } from "./TaskModal"
import { type TaskView } from "../../lib/board"
import Panel from "../shared/Panel"

interface TaskListProps {
  /** Already filtered and sorted by the caller — this component only groups. */
  pending:   Task[]
  projects:  Project[]
  pinnedIds: ReadonlySet<string>
  /** Non-null when a calendar day is selected; switches to the single-day view. */
  selectedDate: string | null
  view:      TaskView
  /** The view switch, rendered by the caller so the board can show the same one. */
  action?:   React.ReactNode
  onOpenProject: (p: Project) => void
  renderTask: (t: Task) => React.ReactNode
  /** Distinguishes "no tasks at all" from "nothing matches this filter". */
  hasAnyPending: boolean
}

function SectionLabel({ children, tone = "sub", icon }: {
  children: React.ReactNode; tone?: "sub" | "accent"; icon?: React.ReactNode
}) {
  return (
    <div className={`flex items-center gap-1.5 px-1 pt-1 pb-2 text-caption font-extrabold uppercase tracking-wider
      ${tone === "accent" ? "text-accent" : "text-tx"}`}>
      {icon}
      {children}
    </div>
  )
}

/**
 * The pending region of the Tasks page. Split out of TasksPage, which was doing
 * filtering, project CRUD, modals and three list layouts in one 480-line file.
 */
export default function TaskList({
  pending, projects, pinnedIds, selectedDate, view, action,
  onOpenProject, renderTask, hasAnyPending,
}: TaskListProps) {

  // Single-day view — the calendar already says which day, so no view switch.
  if (selectedDate) {
    if (pending.length === 0) return null
    return (
      <Panel bare className="px-2 xs:px-3 py-2">
        <SectionLabel>Due this day — {pending.length}</SectionLabel>
        {pending.map(renderTask)}
      </Panel>
    )
  }

  const pinned     = pending.filter(t => pinnedIds.has(t.id))
  const unpinned   = pending.filter(t => !pinnedIds.has(t.id))
  const assigned   = new Set(projects.map(p => p.id))
  const unassigned = pending.filter(t => !t.projectId || !assigned.has(t.projectId))

  return (
    <Panel bare className="px-2 xs:px-3 py-2">
      <div className="flex items-center gap-3 px-1 pt-1 pb-2">
        <span className="text-caption font-extrabold uppercase tracking-wider text-tx">
          Open — {pending.length}
        </span>
        {action && <div className="ml-auto">{action}</div>}
      </div>

      {pending.length === 0 ? (
        <p className="text-meta text-sub px-1 py-6">
          {hasAnyPending
            ? "No tasks match this filter."
            : "Nothing pending — you're all caught up."}
        </p>
      ) : view === "all" || projects.length === 0 ? (
        <>
          {pinned.length > 0 && (
            <>
              <SectionLabel tone="accent" icon={<HiMapPin size={12} />}>
                Pinned — {pinned.length}
              </SectionLabel>
              {pinned.map(renderTask)}
              <div className="h-px bg-border my-2" />
            </>
          )}
          {unpinned.map(renderTask)}
        </>
      ) : (
        <>
          {projects.map(proj => {
            const group = pending.filter(t => t.projectId === proj.id)
            if (group.length === 0) return null
            return (
              <div key={proj.id}>
                <button onClick={() => onOpenProject(proj)}
                  className="flex items-center gap-1.5 min-h-11 px-1 group/h">
                  <HiFolder size={12} style={{ color: proj.color }} />
                  <span className="text-caption font-extrabold uppercase tracking-wider text-tx group-hover/h:text-accent transition-colors">
                    {proj.name} — {group.length}
                  </span>
                </button>
                {group.map(renderTask)}
              </div>
            )
          })}
          {unassigned.length > 0 && (
            <div>
              <SectionLabel>No project — {unassigned.length}</SectionLabel>
              {unassigned.map(renderTask)}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

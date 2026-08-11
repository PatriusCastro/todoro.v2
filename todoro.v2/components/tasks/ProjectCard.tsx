"use client"

import { HiFolder } from "react-icons/hi2"
import { type Task } from "./TaskCard"
import { type Project } from "./TaskModal"

interface ProjectCardProps {
  project: Project
  tasks: Task[]
  onClick: () => void
}

/**
 * Compact by design: this is a rail you scan sideways, so every pixel of card
 * is a project you can't see. The previous version stacked a 48px icon, a
 * centred name, a bar, a count and an "Open ›" row into a 176px-wide block —
 * roughly two and a half projects on a phone.
 *
 * What went: the "Open" row, which restated that a button is clickable, and the
 * oversized icon, which carried no information the colour didn't. What stayed
 * is the only part that helps you choose — the name and how much is left.
 */
export default function ProjectCard({ project, tasks, onClick }: ProjectCardProps) {
  const total    = tasks.length
  const done     = tasks.filter(t => t.done).length
  const pending  = total - done
  const progress = total > 0 ? done / total : 0

  return (
    <button
      onClick={onClick}
      aria-label={`Open ${project.name}`}
      className="flex flex-col gap-2 px-3 py-2.5 w-36 xs:w-40 rounded-control border
        bg-surface2 border-border hover:border-accent/40
        active:scale-[0.985] transition-all duration-150 text-left">

      <span className="flex items-center gap-2 min-w-0">
        <span className="w-6 h-6 shrink-0 rounded-md grid place-items-center"
          style={{ backgroundColor: `${project.color}22` }}>
          <HiFolder size={13} style={{ color: project.color }} />
        </span>
        <span className="flex-1 min-w-0 text-meta font-extrabold text-tx truncate">
          {project.name}
        </span>
      </span>

      {/* The only real information scent here: how much is left. */}
      <span className="flex flex-col gap-1.5">
        <span className="h-1 w-full rounded-pill bg-border overflow-hidden">
          <span className="block h-full rounded-pill transition-all duration-500"
            style={{ width: `${progress * 100}%`, backgroundColor: project.color }} />
        </span>
        <span className="text-caption text-sub tabular-nums truncate">
          {total === 0
            ? "Empty"
            : pending === 0 ? `All ${total} done` : `${pending} left · ${done}/${total}`}
        </span>
      </span>
    </button>
  )
}

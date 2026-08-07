"use client"

import { HiFolder, HiChevronRight } from "react-icons/hi2"
import { type Task } from "./TaskCard"
import { type Project } from "./TaskModal"

interface ProjectCardProps {
  project: Project
  tasks: Task[]
  onClick: () => void
}

export default function ProjectCard({ project, tasks, onClick }: ProjectCardProps) {
  const total    = tasks.length
  const done     = tasks.filter(t => t.done).length
  const pending  = total - done
  const progress = total > 0 ? done / total : 0

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3.5 px-4 py-3.5 rounded-xl border w-44 group-hover/proj:bg-surface2 group-hover/proj:border-accent/40
        bg-surface2 border-border hover:border-accent/40
        active:scale-[0.985] transition-all duration-150 text-left group">
      {/* Folder icon block */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${project.color}22` }}>
        <HiFolder size={24} style={{ color: project.color }} />
      </div>
      
      <span className="w-full text-[13px] font-semibold text-tx truncate leading-none text-center">
        {project.name}
      </span>

      {/* Information scent — a folder with no counts gives the user no reason
          to open it, and no way to compare projects at a glance. */}
      <div className="w-full flex flex-col gap-1.5">
        <div className="h-1 w-full rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%`, backgroundColor: project.color }} />
        </div>
        <span className="text-caption text-sub tabular-nums text-center">
          {total === 0
            ? "No tasks yet"
            : pending === 0 ? `All ${total} done` : `${pending} left · ${done}/${total}`}
        </span>
      </div>

      <span className="flex items-center gap-0.5 text-caption font-semibold text-sub group-hover:text-accent transition-colors">
        Open <HiChevronRight size={11} />
      </span>
    </button>
  )
}
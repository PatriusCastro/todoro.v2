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
  const total   = tasks.length
  const done    = tasks.filter(t => t.done).length
  const pending = total - done
  const progress = total > 0 ? done / total : 0

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border
        bg-surface2 border-border hover:border-accent/40
        transition-colors duration-150 text-left group">

      {/* Folder icon with project color */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${project.color}20` }}>
        <HiFolder size={18} style={{ color: project.color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-tx truncate leading-none">
          {project.name}
        </span>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress * 100}%`,
                backgroundColor: project.color,
              }} />
          </div>
          <span className="text-[11px] text-sub tabular-nums shrink-0">
            {total === 0
              ? "No tasks"
              : pending > 0
              ? `${pending} pending`
              : "All done ✓"}
          </span>
        </div>
      </div>

      <HiChevronRight
        size={14}
        className="text-sub shrink-0 group-hover:text-accent transition-colors duration-150" />
    </button>
  )
}
"use client"

import { HiListBullet, HiFolder, HiViewColumns } from "react-icons/hi2"
import { type TaskView } from "../../lib/board"

interface ViewSwitchProps {
  value: TaskView
  onChange: (v: TaskView) => void
  /** "By project" is meaningless with no folders, so it is dropped, not disabled. */
  showProject: boolean
  className?: string
}

const ICONS: Record<TaskView, React.ReactNode> = {
  all:     <HiListBullet size={14} />,
  project: <HiFolder size={14} />,
  board:   <HiViewColumns size={14} />,
}

const LABELS: Record<TaskView, string> = {
  all: "All", project: "By project", board: "Board",
}

/**
 * List · by project · board. Icon-first because "By project" wrapped and shoved
 * the section count around on a phone; the label rejoins once there is width.
 */
export default function ViewSwitch({ value, onChange, showProject, className = "" }: ViewSwitchProps) {
  const views: TaskView[] = showProject ? ["all", "project", "board"] : ["all", "board"]
  return (
    <div role="group" aria-label="Task layout"
      className={`shrink-0 flex items-center rounded-control border border-border overflow-hidden ${className}`}>
      {views.map((v, i) => (
        <button key={v} onClick={() => onChange(v)}
          aria-pressed={value === v}
          aria-label={LABELS[v]}
          title={LABELS[v]}
          className={`flex items-center gap-1.5 min-h-11 px-3 text-meta font-extrabold whitespace-nowrap transition-colors
            ${i > 0 ? "border-l border-border" : ""}
            ${value === v ? "bg-accent text-white" : "text-tx hover:bg-surface2"}`}>
          {ICONS[v]}
          <span className="hidden sm:inline">{LABELS[v]}</span>
        </button>
      ))}
    </div>
  )
}

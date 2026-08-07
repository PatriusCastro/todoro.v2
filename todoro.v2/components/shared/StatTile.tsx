"use client"

import Panel from "./Panel"

interface StatTileProps {
  label:     string
  value:     React.ReactNode
  /** Trails the value at caption size, e.g. "of 12 tasks". */
  suffix?:   string
  /** A line under the value — a comparison, or a row of goal pips. */
  footnote?: React.ReactNode
  icon?:     React.ReactNode
}

export default function StatTile({ label, value, suffix, footnote, icon }: StatTileProps) {
  return (
    <Panel className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {icon && <span className="text-sub shrink-0">{icon}</span>}
        <span className="text-caption font-extrabold uppercase tracking-wider text-tx">{label}</span>
      </div>
      <span className="text-title font-extrabold leading-none tabular-nums">
        {value}
        {suffix && <span className="ml-1 text-caption font-semibold text-sub">{suffix}</span>}
      </span>
      {footnote && <div className="text-caption text-sub">{footnote}</div>}
    </Panel>
  )
}

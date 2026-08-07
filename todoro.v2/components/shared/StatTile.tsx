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
  // Three of these share the width of a phone, so this is the tile that runs
  // out of room first: the icon and the gaps go before the label truncates, and
  // the number steps down a rung rather than crowding its own tile.
  return (
    <Panel className="flex flex-col gap-1.5 xs:gap-2 min-w-0">
      <div className="flex items-center gap-1 xs:gap-2 min-w-0">
        {icon && <span className="text-sub shrink-0 hidden xs:block">{icon}</span>}
        <span className="text-caption font-extrabold uppercase tracking-wider text-tx truncate">{label}</span>
      </div>
      <span className="text-heading xs:text-title font-extrabold leading-none tabular-nums">
        {value}
        {suffix && <span className="ml-1 text-caption font-semibold text-sub">{suffix}</span>}
      </span>
      {footnote && <div className="text-caption text-sub">{footnote}</div>}
    </Panel>
  )
}

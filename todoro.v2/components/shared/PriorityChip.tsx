"use client"

import { type Priority } from "../../lib/theme"

const MEANING: Record<Priority, string> = {
  high: "High priority",
  mid:  "Medium priority",
  low:  "Low priority",
  none: "",
}

const LETTER: Record<Priority, string> = { high: "H", mid: "M", low: "L", none: "" }

/**
 * Priority as a letter, not a bare dot. The old dot carried its meaning in hue
 * alone, which is invisible to a colour-blind user and ambiguous to everyone
 * else. Weight does the ranking here: high is filled, mid is outlined in the
 * accent, low is a quiet outline.
 *
 * `none` renders nothing — an unranked task shouldn't spend a slot saying so.
 */
export default function PriorityChip({ priority, className = "" }: {
  priority: Priority
  className?: string
}) {
  if (priority === "none") return null

  const tone =
    priority === "high" ? "bg-accent border-accent text-bg"
    : priority === "mid" ? "border-accent text-accent"
    : "border-border text-sub"

  return (
    <span
      title={MEANING[priority]}
      className={`shrink-0 w-6.5 h-6.5 grid place-items-center rounded-pill border
        text-caption font-extrabold leading-none select-none ${tone} ${className}`}>
      <span aria-hidden="true">{LETTER[priority]}</span>
      <span className="sr-only">{MEANING[priority]}</span>
    </span>
  )
}

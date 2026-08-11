"use client"

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  /** null selects nothing — for when none of the choices is currently in effect. */
  value: T | null
  onChange: (v: T) => void
  /** Names the group for screen readers, e.g. "Theme". */
  label: string
  className?: string
}

/**
 * One-of-N switch: equal segments, hairline between, accent fill on the active
 * one. Segments are 48px tall — these carry primary choices (theme, priority,
 * timer preset), not incidental ones.
 */
export default function Segmented<T extends string>({
  options, value, onChange, label, className = "",
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex rounded-control border border-border overflow-hidden ${className}`}>
      {options.map((opt, i) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`flex-1 min-h-12 flex items-center justify-center gap-1.5 px-2
              text-meta font-extrabold transition-colors duration-150
              ${i > 0 ? "border-l border-border" : ""}
              ${active ? "bg-accent text-bg" : "text-tx hover:bg-surface2"}`}>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

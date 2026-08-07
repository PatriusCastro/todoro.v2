"use client"

interface SectionHeaderProps {
  children: React.ReactNode
  /** Right-aligned secondary text — a count, a range, a unit. */
  meta?: React.ReactNode
  /** Right-aligned control, e.g. a "See all" link or a view switch. */
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

/**
 * The one section header in the app. Before this the codebase had three
 * treatments in roughly equal use — `text-xs font-bold text-sub`,
 * `text-caption font-extrabold uppercase tracking-wider text-sub`, and a
 * `font-bold` variant — so panels sitting next to each other disagreed.
 *
 * Title is full-strength text; anything trailing it is muted. That keeps the
 * label readable at 11px, where a muted grey starts to disappear.
 */
export default function SectionHeader({
  children, meta, action, icon, className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center gap-2 min-h-8 ${className}`}>
      {icon && <span className="text-sub shrink-0">{icon}</span>}
      <h3 className="text-caption font-extrabold uppercase tracking-wider text-tx">
        {children}
      </h3>
      {meta && <span className="ml-auto text-caption text-sub shrink-0">{meta}</span>}
      {action && <span className={meta ? "shrink-0" : "ml-auto shrink-0"}>{action}</span>}
    </div>
  )
}

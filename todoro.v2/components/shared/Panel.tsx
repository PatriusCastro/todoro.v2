"use client"

interface PanelProps {
  children: React.ReactNode
  className?: string
  /** Drop the default padding when the children own their own row rhythm. */
  bare?: boolean
}

/**
 * The one surface in the system: single ground, hairline edge, no blur and no
 * shadow. Emphasis comes from the accent, not from stacking translucent cards.
 * Things that genuinely float — modals, sheets, toasts — add their own shadow.
 */
export default function Panel({ children, className = "", bare = false }: PanelProps) {
  return (
    <div className={`panel ${bare ? "" : "px-5 py-4"} ${className}`}>
      {children}
    </div>
  )
}

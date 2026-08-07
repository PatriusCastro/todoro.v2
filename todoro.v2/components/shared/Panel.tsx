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
// 40px of horizontal padding is a third of a stat tile on a 320px screen, so
// the inset steps down below 380px before the content has to.
export default function Panel({ children, className = "", bare = false }: PanelProps) {
  return (
    <div className={`panel ${bare ? "" : "px-3.5 xs:px-5 py-3.5 xs:py-4"} ${className}`}>
      {children}
    </div>
  )
}

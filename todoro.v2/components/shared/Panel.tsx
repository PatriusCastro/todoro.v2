"use client"

interface PanelProps {
  children: React.ReactNode
  className?: string
  /** Drop the default padding when the children own their own row rhythm. */
  bare?: boolean
}

/**
 * The flat replacement for `.glass` — one ground, one hairline, no blur and no
 * shadow. Depth in this system comes from the accent, not from stacking.
 */
export default function Panel({ children, className = "", bare = false }: PanelProps) {
  return (
    <div className={`panel ${bare ? "" : "px-5 py-4"} ${className}`}>
      {children}
    </div>
  )
}

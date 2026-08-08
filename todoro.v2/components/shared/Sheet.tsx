"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface SheetProps {
  /** Names the dialog for screen readers. */
  label: string
  onClose: () => void
  children: React.ReactNode
  className?: string
  /**
   * "center" lifts the sheet off the bottom edge on tablet and desktop, where a
   * panel welded to the bottom of a 1400px window reads as a phone control that
   * escaped. Stays a bottom sheet on phones, where thumb reach is the point.
   */
  align?: "bottom" | "center"
}

/**
 * Bottom sheet. Rendered only while mounted — the caller decides when it exists.
 *
 * Portals to <body> for the same reason Toast does: AppShell's page wrapper runs
 * `animation: tabenter … both`, and the transform that fill-mode leaves behind
 * makes it the containing block for `position: fixed`. A sheet rendered inside
 * page content would anchor to the content and scroll with it.
 */
export default function Sheet({
  label, onClose, children, className = "", align = "bottom",
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape; move focus into the dialog on open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  // Everything that opens a sheet sits behind the page's hydration gate, so this
  // never runs on the server.
  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className={`fixed inset-0 z-9999 flex justify-center bg-black/70
        ${align === "center" ? "items-end md:items-center md:p-4" : "items-end"}`}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        // focus-no-ring: the panel is focused programmatically so screen readers
        // land inside it, but it is a container rather than a control. Without
        // this, verifying with the keyboard trips Chrome's focus-visible
        // heuristic and paints the global accent ring around the whole sheet.
        className={`focus-no-ring w-full max-w-md flex flex-col outline-none overflow-y-auto
          bg-panel border-t border-border rounded-t-panel max-h-[85dvh]
          motion-safe:animate-[sheetup_0.28s_ease-out]
          ${align === "center" ? "md:rounded-panel md:border" : ""} ${className}`}>
        {/* Grab handle — the affordance for dragging a bottom sheet away, so it
            goes when the sheet stops being one. */}
        <div className={`mx-auto mt-2 mb-1 h-1.5 w-10 rounded-pill bg-tx/20 shrink-0
          ${align === "center" ? "md:hidden" : ""}`} />
        {children}
      </div>
    </div>,
    document.body,
  )
}

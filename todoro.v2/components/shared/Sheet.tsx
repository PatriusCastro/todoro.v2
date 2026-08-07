"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface SheetProps {
  /** Names the dialog for screen readers. */
  label: string
  onClose: () => void
  children: React.ReactNode
  className?: string
}

/**
 * Bottom sheet. Rendered only while mounted — the caller decides when it exists.
 *
 * Portals to <body> for the same reason Toast does: AppShell's page wrapper runs
 * `animation: tabenter … both`, and the transform that fill-mode leaves behind
 * makes it the containing block for `position: fixed`. A sheet rendered inside
 * page content would anchor to the content and scroll with it.
 */
export default function Sheet({ label, onClose, children, className = "" }: SheetProps) {
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
      className="fixed inset-0 z-9999 flex items-end justify-center bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`w-full max-w-md flex flex-col outline-none overflow-y-auto
          bg-panel border-t border-border rounded-t-panel max-h-[85dvh]
          motion-safe:animate-[sheetup_0.28s_ease-out] ${className}`}>
        {/* Grab handle */}
        <div className="mx-auto mt-2 mb-1 h-1.5 w-10 rounded-pill bg-tx/20 shrink-0" />
        {children}
      </div>
    </div>,
    document.body,
  )
}

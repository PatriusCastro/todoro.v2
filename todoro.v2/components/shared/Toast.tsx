"use client"

import { createPortal } from "react-dom"

interface ToastProps {
  open: boolean
  title?: string
  sub?: string
  actionLabel?: string
  onAction?: () => void
}

/**
 * Screen-anchored toast.
 *
 * Rendered through a portal to <body> rather than in place: AppShell's page
 * wrapper carries `animation: tabenter ... both`, and because that keyframe
 * animates `transform`, the fill-mode leaves a transform on the element for
 * good. A transformed ancestor becomes the containing block for `position:
 * fixed`, so a toast rendered inside the page pins itself to the top of the
 * *content* and scrolls away with it. The portal escapes that entirely.
 */
export default function Toast({ open, title, sub, actionLabel = "Undo", onAction }: ToastProps) {
  // No mount guard needed: everything that renders a toast sits behind the
  // page's hydration gate, so this never runs on the server.
  if (typeof document === "undefined") return null

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      style={{ top: "max(1.25rem, env(safe-area-inset-top))" }}
      className={`fixed left-1/2 -translate-x-1/2 z-10000 max-w-[calc(100vw-2rem)]
        transition-all duration-300
        ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-3 pointer-events-none"}`}>
      <div className="glass flex items-center gap-3 px-5 py-3 rounded-2xl">
        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-tx truncate">{title}</span>
          {sub && <span className="text-xs text-sub truncate">{sub}</span>}
        </div>
        {onAction && (
          <button onClick={onAction} className="ml-2 text-sm font-semibold text-accent hover:underline shrink-0">
            {actionLabel}
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}

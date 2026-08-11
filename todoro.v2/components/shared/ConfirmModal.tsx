"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface ConfirmModalProps {
  title: string
  /** What will actually happen. The whole reason this isn't `confirm()`. */
  body: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** Paints the confirm button as destructive. */
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * A yes/no question with room to explain itself.
 *
 * `confirm()` can only render one line of unstyled text, which is why the
 * dialogs it produced here said "Are you sure?" and never what would happen to
 * your data. Portals to <body> for the same reason Sheet does: AppShell's page
 * wrapper leaves a transform behind after its enter animation, which makes it
 * the containing block for `position: fixed`.
 */
export default function ConfirmModal({
  title, body, confirmLabel, cancelLabel = "Cancel",
  destructive = false, onConfirm, onClose,
}: ConfirmModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-end md:items-center justify-center p-3 xs:p-4 bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="w-full max-w-sm panel bg-panel shadow-lg outline-none flex flex-col gap-4 p-5">

        <div className="flex flex-col gap-1.5">
          <h2 className="text-lead font-extrabold text-tx">{title}</h2>
          <div className="text-meta text-sub leading-relaxed">{body}</div>
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 min-h-12 rounded-control border border-border text-body font-extrabold text-tx
              hover:border-accent/40 transition-colors">
            {cancelLabel}
          </button>
          <button onClick={onConfirm}
            className={`flex-1 min-h-12 rounded-control text-body font-extrabold transition-all
              ${destructive
                ? "bg-priority-high text-white hover:brightness-110"
                : "bg-accent text-bg hover:bg-accent-hover"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

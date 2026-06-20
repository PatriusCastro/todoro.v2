"use client"

import { createPortal } from "react-dom"
import { HiBell, HiXMark } from "react-icons/hi2"

interface NotifPromptProps {
  dark: boolean
  onEnable: () => void
  onDismiss: () => void
}

export default function NotifPrompt({ dark, onEnable, onDismiss }: NotifPromptProps) {
  return createPortal(
    <div className={dark ? "dark" : ""}>
      <div
        className="fixed inset-0 z-9999 flex items-end md:items-center justify-center p-4 bg-black/70"
        onClick={e => { if (e.target === e.currentTarget) onDismiss() }}>
        <div className="w-full max-w-sm glass-strong rounded-3xl flex flex-col gap-4 p-6">

          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <HiBell size={20} className="text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-tx">Nice work — first session done</h3>
              <p className="text-xs text-sub mt-1">Want a heads-up when your focus and break timers end? Turn on notifications so you never miss a switch.</p>
            </div>
            <button onClick={onDismiss} aria-label="Dismiss"
              className="w-7 h-7 rounded-lg bg-surface2 text-sub hover:text-tx flex items-center justify-center transition-colors shrink-0">
              <HiXMark size={14} />
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={onDismiss}
              className="flex-1 py-2.5 rounded-xl border border-border text-sub text-sm font-semibold hover:text-tx transition-all">
              Not now
            </button>
            <button onClick={onEnable}
              className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all">
              Enable
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

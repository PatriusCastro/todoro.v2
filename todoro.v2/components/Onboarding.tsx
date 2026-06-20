"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { HiArrowRight } from "react-icons/hi2"

interface OnboardingProps {
  dark: boolean
  initialName: string
  onComplete: (name: string) => void
}

export default function Onboarding({ dark, initialName, onComplete }: OnboardingProps) {
  // "Bossing" is the playful default — start blank so the field invites a real name
  const [name, setName] = useState(initialName === "Bossing" ? "" : initialName)

  const submit = () => onComplete(name.trim())

  return createPortal(
    <div className={dark ? "dark" : ""}>
      <div className="fixed inset-0 z-9999 flex items-end md:items-center justify-center p-4 bg-black/70">
        <div className="w-full max-w-md glass-strong rounded-3xl flex flex-col gap-5 p-6">

          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface2 border border-border flex items-center justify-center">
              <img src="/icons/todoro-light.png" alt="Todoro" className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-tx">Welcome to Todoro</h2>
              <p className="text-sm text-sub mt-1">A focus timer and task manager to help you get things done — let&apos;s make it yours.</p>
            </div>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-sub">What should we call you?</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submit() }}
              placeholder="Your name"
              autoFocus
              className="w-full bg-surface2 border border-border rounded-2xl px-4 py-3 text-sm font-semibold text-tx placeholder:text-sub outline-none focus:border-accent transition-colors" />
          </div>

          {/* Continue */}
          <button
            onClick={submit}
            className="w-full py-3.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover active:scale-95 transition-all flex items-center justify-center gap-2">
            Get started <HiArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

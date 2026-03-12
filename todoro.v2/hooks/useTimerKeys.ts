"use client"

import { useEffect } from "react"

interface TimerKeys {
  onToggle: () => void
  onReset:  () => void
  onSkip:   () => void
}

export function useTimerKeys({ onToggle, onReset, onSkip }: TimerKeys) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.code === "Space")  { e.preventDefault(); onToggle() }
      if (e.key  === "r" || e.key === "R") onReset()
      if (e.key  === "s" || e.key === "S") onSkip()
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onToggle, onReset, onSkip])
}
"use client"

import { useEffect } from "react"

type Phase = "focus" | "break" | "longbreak"

export function useDocumentTitle(time: number, phase: Phase, running: boolean) {
  useEffect(() => {
    if (!running) {
      document.title = "Todoro"
      return
    }

    const minutes = Math.floor(time / 60)
    const seconds = time % 60
    const clock   = `${minutes}:${seconds.toString().padStart(2, "0")}`

    if (phase === "focus")     document.title = `${clock} — Focus`
    if (phase === "break")     document.title = `${clock} — Break`
    if (phase === "longbreak") document.title = `${clock} — Long Break`
  }, [time, phase, running])
}
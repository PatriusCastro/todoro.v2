"use client"

import { useState, useRef, useCallback } from "react"

export type ToastType = "created" | "saved" | "deleted"

export interface Toast {
  id: number
  type: ToastType
  title: string
  sub?: string
  undoFn?: () => void
}

const DURATION: Record<ToastType, number> = {
  created: 3000,
  saved:   3000,
  deleted: 4000,
}

const EMOJI: Record<ToastType, string> = {
  created: "✅",
  saved:   "✏️",
  deleted: "🗑️",
}

let _id = 0

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback((
    type: ToastType,
    title: string,
    sub?: string,
    undoFn?: () => void,
  ) => {
    if (timer.current) clearTimeout(timer.current)
    const next: Toast = { id: ++_id, type, title, sub, undoFn }
    setToast(next)
    timer.current = setTimeout(() => setToast(null), DURATION[type])
  }, [])

  return { toast, show, dismiss, EMOJI }
}
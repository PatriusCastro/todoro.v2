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

const CONFIGS: Record<ToastType, { emoji: string; duration: number }> = {
  created: { emoji: "✅", duration: 3000 },
  saved:   { emoji: "✏️", duration: 3000 },
  deleted: { emoji: "🗑️", duration: 4000 },
}

let _id = 0

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback((type: ToastType, title: string, sub?: string, undoFn?: () => void) => {
    if (timer.current) clearTimeout(timer.current)
    const { duration } = CONFIGS[type]
    const next: Toast = { id: ++_id, type, title, sub, undoFn }
    setToast(next)
    timer.current = setTimeout(() => setToast(null), duration)
  }, [])

  return { toast, show, dismiss }
}
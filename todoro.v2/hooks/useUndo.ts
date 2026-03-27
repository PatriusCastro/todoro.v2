import { useState, useRef, useCallback } from "react"
import { type Task } from "../components/tasks/TaskCard"

export function useUndo(onConfirm: (id: string) => void) {
  const [pending, setPending] = useState<Task | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const stage = useCallback((task: Task) => {
    clear()
    if (pending) onConfirm(pending.id)
    setPending(task)
    timer.current = setTimeout(() => {
      onConfirm(task.id)
      setPending(null)
    }, 4000)
  }, [pending, onConfirm])

  const undo = useCallback(() => {
    clear()
    setPending(null)
  }, [])

  return { pending, stage, undo }
}
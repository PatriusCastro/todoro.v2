import { useState, useRef, useCallback, useEffect } from "react"
import { type Task } from "../components/tasks/TaskCard"

interface UndoEntry { task: Task; timeout: ReturnType<typeof setTimeout> }

export function useUndo(onConfirmDelete: (id: string) => void) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const entry = useRef<UndoEntry | null>(null)

  const onConfirmDeleteRef = useRef(onConfirmDelete)
  useEffect(() => { onConfirmDeleteRef.current = onConfirmDelete }, [onConfirmDelete])

  const stage = useCallback((task: Task) => {
    if (entry.current) {
      clearTimeout(entry.current.timeout)
      if (entry.current.task.id !== task.id) {
        onConfirmDeleteRef.current(entry.current.task.id)
      }
      entry.current = null
    }

    setPendingId(task.id)
    entry.current = {
      task,
      timeout: setTimeout(() => {
        onConfirmDeleteRef.current(task.id)
        setPendingId(null)
        entry.current = null
      }, 4000),
    }
  }, [])

  const undo = useCallback(() => {
    if (!entry.current) return
    clearTimeout(entry.current.timeout)
    setPendingId(null)
    entry.current = null
  }, [])

  useEffect(() => {
    return () => {
      if (entry.current) {
        clearTimeout(entry.current.timeout)
      }
    }
  }, [])

  return { pendingId, stage, undo }
}
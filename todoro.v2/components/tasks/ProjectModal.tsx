"use client"

import { useState, useEffect } from "react"
import { HiXMark, HiFolder, HiTrash } from "react-icons/hi2"
import { type Project } from "./TaskModal"

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#06b6d4", "#a16207", "#be123c",
]

interface ProjectModalProps {
  project?: Project        // undefined = create mode
  onSave: (p: Project) => void
  onDelete?: (id: string) => void
  onClose: () => void
}

export default function ProjectModal({
  project, onSave, onDelete, onClose,
}: ProjectModalProps) {
  const isEdit = !!project

  const [name,  setName]  = useState(project?.name  ?? "")
  const [color, setColor] = useState(project?.color ?? PRESET_COLORS[5])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [nameError, setNameError] = useState(false)

  // Trap focus / close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const handleSave = () => {
    if (!name.trim()) { setNameError(true); return }
    onSave({
      id:    project?.id    ?? `proj-${Date.now()}`,
      name:  name.trim(),
      color,
    })
    onClose()
  }

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDelete?.(project!.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-9999 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-lg" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl
        shadow-[0_24px_64px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden z-10">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}22` }}>
              <HiFolder size={16} style={{ color }} />
            </div>
            <h2 className="text-[15px] font-black text-tx">
              {isEdit ? "Edit Project" : "New Project"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sub hover:text-tx hover:bg-surface2 transition-colors">
            <HiXMark size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 px-5 py-5">

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-sub uppercase tracking-wider">
              Project name
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => { setName(e.target.value); setNameError(false) }}
              onKeyDown={e => { if (e.key === "Enter") handleSave() }}
              placeholder="e.g. Work, Personal, Side project…"
              className={`w-full px-4 py-2.5 rounded-xl border bg-surface2 text-sm text-tx
                placeholder:text-sub outline-none transition-colors
                ${nameError
                  ? "border-red-500/70 focus:border-red-500"
                  : "border-border focus:border-accent/60"}`} />
            {nameError && (
              <p className="text-[11px] text-red-400">Name is required</p>
            )}
          </div>

          {/* Color */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-sub uppercase tracking-wider">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-transform duration-100 active:scale-90"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${c}` : "none",
                    outlineOffset: "2px",
                    transform: color === c ? "scale(1.15)" : "scale(1)",
                  }} />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}22` }}>
              <HiFolder size={18} style={{ color }} />
            </div>
            <span className="text-[13px] font-semibold text-tx truncate flex-1">
              {name.trim() || "Project name"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 pb-5">
          {isEdit && onDelete && (
            <button
              onClick={handleDelete}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border
                transition-all duration-150
                ${confirmDelete
                  ? "bg-red-500 border-red-500 text-white"
                  : "border-border text-sub bg-surface2 hover:border-red-400 hover:text-red-400"}`}>
              <HiTrash size={13} />
              {confirmDelete ? "Sure? Tap again" : "Delete"}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold border border-border text-sub
              bg-surface2 hover:text-tx transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-accent text-white
              hover:bg-accent-hover active:scale-95 transition-all">
            {isEdit ? "Save changes" : "Create project"}
          </button>
        </div>
      </div>
    </div>
  )
}
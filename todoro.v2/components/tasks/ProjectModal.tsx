"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { HiXMark, HiFolder, HiTrash } from "react-icons/hi2"
import { type Project } from "./TaskModal"

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#06b6d4", "#a16207", "#be123c",
]

interface ProjectModalProps {
  project?: Project
  onSave: (p: Project) => void
  onDelete?: (id: string) => void
  onClose: () => void
  dark?: boolean
}

export default function ProjectModal({ project, onSave, onDelete, onClose, dark }: ProjectModalProps) {
  const isEdit = !!project

  const [name,          setName]          = useState(project?.name  ?? "")
  const [color,         setColor]         = useState(project?.color ?? PRESET_COLORS[5])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [nameError,     setNameError]     = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  const handleSave = () => {
    if (!name.trim()) { setNameError(true); return }
    onSave({ id: project?.id ?? `proj-${Date.now()}`, name: name.trim(), color })
  }

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    onDelete?.(project!.id)
    onClose()
  }

  return createPortal(
    <div className={dark ? "dark" : ""}>
      <div
        className="fixed inset-0 z-9999 flex items-end md:items-center justify-center p-4 bg-black/70"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="w-full max-w-md bg-surface border border-border rounded-3xl flex flex-col gap-4 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] max-h-[90dvh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg text-tx">{isEdit ? "Edit Project" : "New Project"}</h2>
            <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-xl bg-surface2 text-sub hover:text-tx flex items-center justify-center transition-colors">
              <HiXMark size={16} />
            </button>
          </div>

          {/* Name */}
          <input
            autoFocus
            value={name}
            onChange={e => { setName(e.target.value); setNameError(false) }}
            onKeyDown={e => { if (e.key === "Enter") handleSave() }}
            placeholder="e.g. Work, Personal, Side project…"
            className={`w-full bg-surface2 border rounded-2xl px-4 py-3 text-sm font-semibold text-tx
              placeholder:text-sub outline-none transition-colors
              ${nameError ? "border-red-500/70 focus:border-red-500" : "border-border focus:border-accent"}`} />
          {nameError && <p className="text-[11px] text-red-400 -mt-2">Name is required</p>}

          {/* Color */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-sub">Color</span>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all duration-100 active:scale-90"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${c}` : "none",
                    outlineOffset: "2px",
                    transform: color === c ? "scale(1.18)" : "scale(1)",
                  }} />
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-surface2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}22` }}>
              <HiFolder size={18} style={{ color }} />
            </div>
            <span className="text-[13px] font-semibold text-tx truncate flex-1">
              {name.trim() || "Project name"}
            </span>
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-1">
            {isEdit && onDelete && (
              <button
                onClick={handleDelete}
                className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-all
                  ${confirmDelete
                    ? "bg-priority-high border-priority-high text-white"
                    : "border-priority-high/40 text-priority-high hover:bg-priority-high/10"}`}>
                <HiTrash size={14} className="inline mr-1.5 -mt-0.5" />
                {confirmDelete ? "Sure?" : "Delete"}
              </button>
            )}
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-sub text-sm font-semibold hover:text-tx transition-all">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover disabled:opacity-40 transition-all">
              {isEdit ? "Save" : "Create"}
            </button>
          </div>

        </div>
      </div>
    </div>,
    document.body
  )
}
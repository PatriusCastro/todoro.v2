"use client"

import { useState, useCallback } from "react"
import { HiArrowLeft, HiPlus, HiChevronDown, HiFolder, HiPencil } from "react-icons/hi2"
import TaskCard, { type Task } from "./TaskCard"
import TaskModal, { type Project } from "./TaskModal"
import ProjectModal from "./ProjectModal"
import { usePinnedTasks } from "../../hooks/usePinnedTasks"
import { useSortedTasks } from "../../hooks/useTaskSort"
import { useUndo } from "../../hooks/useUndo"
import { useToast } from "../../hooks/useToast"

interface ProjectPageProps {
  project: Project
  allTasks: Task[]
  activeTask: Task
  dark: boolean
  projects: Project[]
  onBack: () => void
  onSave: (t: Task) => void
  onDelete: (id: string) => void
  onToggle: (id: string) => void
  onToggleSub: (tId: string, sId: string) => void
  onOpenTask: (t: Task) => void
  onStartFocus: (t: Task) => void
  onSaveProject: (p: Project) => void
  onDeleteProject: (id: string) => void
  onEditProject?: (p: Project) => void   // opens ProjectModal in parent
}

export default function ProjectPage({
  project, allTasks, activeTask, dark, projects,
  onBack, onSave, onDelete, onToggle, onToggleSub,
  onOpenTask, onStartFocus, onSaveProject, onDeleteProject, onEditProject,
}: ProjectPageProps) {
  const tasks    = allTasks.filter(t => t.projectId === project.id)
  const pending  = tasks.filter(t => !t.done)
  const done     = tasks.filter(t => t.done)
  const progress = tasks.length > 0 ? done.length / tasks.length : 0

  const [modalTask,  setModalTask]  = useState<Task | undefined>()
  const [showModal,  setShowModal]  = useState(false)
  const [showDone,   setShowDone]   = useState(false)
  const [projectModal, setProjectModal] = useState(false)

  const { toast, show: showToast, dismiss: dismissToast, EMOJI } = useToast()
  const { pinned, togglePin } = usePinnedTasks()
  const { pending: deletePending, stage: stageDelete, undo } = useUndo(onDelete)

  const handleDelete = useCallback((task: Task) => {
    stageDelete(task)
    showToast("deleted", `"${task.title}" deleted`, "Tap undo to restore",
      () => { undo(); dismissToast() })
  }, [stageDelete, showToast, undo, dismissToast])

  const handleSave = useCallback((task: Task) => {
    const isNew = !allTasks.find(t => t.id === task.id)
    onSave({ ...task, projectId: project.id })
    showToast(isNew ? "created" : "saved", isNew ? "Task created" : "Changes saved", task.title)
    setShowModal(false)
  }, [allTasks, onSave, showToast, project.id])

  const handleQuickStart = useCallback((task: Task) => {
    onStartFocus(task)
  }, [onStartFocus])

  const handleTaskClick = useCallback((task: Task) => {
    onOpenTask(task)
  }, [onOpenTask])

  const sorted = useSortedTasks(
    pending.filter(t => t.id !== deletePending?.id),
    activeTask.id, pinned
  )

  const renderTask = (task: Task) => (
    <TaskCard key={task.id} task={task}
      onToggle={onToggle} onToggleSub={onToggleSub}
      onEdit={t => { setModalTask(t); setShowModal(true) }}
      onDelete={handleDelete}
      onPin={togglePin}
      onQuickStart={handleQuickStart}
      isActive={task.id === activeTask.id}
      isPinned={pinned.has(task.id)}
      onClick={handleTaskClick} />
  )

  return (
    <div className="flex flex-col gap-4">

      {/* Task toast */}
      <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-300 transition-all duration-300
        ${toast ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-3 pointer-events-none"}`}>
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-surface border border-border whitespace-nowrap shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <span className="text-base">{toast ? EMOJI[toast.type] : "✅"}</span>
          <div className="flex flex-col">
            <span className="text-sm font-black text-tx">{toast?.title}</span>
            {toast?.sub && <span className="text-xs text-sub">{toast.sub}</span>}
          </div>
          {toast?.undoFn && (
            <button onClick={toast.undoFn} className="ml-2 text-sm font-black text-accent hover:underline">Undo</button>
          )}
        </div>
      </div>

      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl border border-border bg-surface2 text-sub hover:text-tx hover:border-accent/40 transition-colors">
          <HiArrowLeft size={15} />
        </button>

        {/* Folder icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${project.color}22` }}>
          <HiFolder size={17} style={{ color: project.color }} />
        </div>

        {/* Name + counts */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-tx truncate">{project.name}</h1>
          <p className="text-xs text-sub">{pending.length} pending · {done.length} done</p>
        </div>

        {/* Edit project button */}
        <button
          onClick={() => setProjectModal(true)}
          className="p-2 rounded-xl border border-border bg-surface2 text-sub
            hover:text-accent hover:border-accent/40 transition-colors"
          title="Edit project">
          <HiPencil size={14} />
        </button>

        {/* New task */}
        <button
          onClick={() => { setModalTask(undefined); setShowModal(true) }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-white text-xs font-black hover:bg-accent-hover transition-all">
          <HiPlus size={13} /> New
        </button>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface2">
          <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%`, backgroundColor: project.color }} />
          </div>
          <span className="text-[11px] text-sub tabular-nums shrink-0">
            {done.length}/{tasks.length} done
          </span>
        </div>
      )}

      {/* Pending tasks */}
      {sorted.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {sorted.map(task => renderTask(task))}
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setShowDone(v => !v)}
            className="flex items-center justify-between py-1.5 w-full">
            <span className="text-xs font-bold text-sub uppercase tracking-wider">
              Completed — {done.length}
            </span>
            <HiChevronDown size={12} className="text-sub transition-transform duration-200"
              style={{ transform: showDone ? "rotate(180deg)" : "none" }} />
          </button>
          <div className="h-px bg-border" style={{ opacity: 0.5 }} />
          {showDone && (
            <div className="flex flex-col gap-1.5">
              {done.filter(t => t.id !== deletePending?.id).map(task => (
                <TaskCard key={task.id} task={task}
                  onToggle={onToggle} onToggleSub={onToggleSub}
                  onEdit={t => { setModalTask(t); setShowModal(true) }}
                  onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface2 px-5 py-12 text-center">
          <HiFolder size={28} className="text-sub mx-auto mb-3" style={{ color: project.color }} />
          <p className="text-sub text-sm">No tasks in this project yet</p>
          <button
            onClick={() => { setModalTask(undefined); setShowModal(true) }}
            className="mt-3 text-sm text-accent font-semibold hover:underline">
            Add one →
          </button>
        </div>
      )}

      {/* Task modal — pre-assigned to this project */}
      {showModal && (
        <TaskModal
          task={modalTask}
          projects={projects}
          onSave={handleSave}
          onDelete={id => { const t = allTasks.find(x => x.id === id); if (t) handleDelete(t) }}
          onClose={() => setShowModal(false)}
          onCreateProject={onSaveProject}
          dark={dark} />
      )}

      {/* Project modal */}
      {projectModal && (
        <ProjectModal
          project={project}
          onSave={p => { onSaveProject(p); setProjectModal(false) }}
          onDelete={id => { onDeleteProject(id); onBack() }}
          onClose={() => setProjectModal(false)}
          dark={dark} />
      )}
    </div>
  )
}
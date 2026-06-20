"use client"

import { useState, useCallback } from "react"
import { HiPlus, HiMagnifyingGlass, HiXMark, HiChevronDown, HiFolderOpen, HiFolder } from "react-icons/hi2"
import TaskCard, { type Task } from "../components/tasks/TaskCard"
import TaskModal from "../components/tasks/TaskModal"
import ProjectCard from "../components/tasks/ProjectCard"
import ProjectModal from "../components/tasks/ProjectModal"
import ProjectPage from "../components/tasks/ProjectPage"
import { type Project } from "../components/tasks/TaskModal"
import { type Priority, getPriority } from "../lib/theme"
import { useUndo } from "../hooks/useUndo"
import { usePinnedTasks } from "../hooks/usePinnedTasks"
import { useSortedTasks } from "../hooks/useTaskSort"
import { useToast } from "../hooks/useToast"

interface TasksPageProps {
  tasks: Task[]; activeTask: Task; running: boolean
  projects: Project[]
  onSave: (t: Task) => void; onDelete: (id: string) => void
  onToggle: (id: string) => void; onToggleSub: (tId: string, sId: string) => void
  onSetActive: (t: Task) => void; onNavToTimer: () => void
  onStartFocus: (t: Task) => void
  onSaveProject: (p: Project) => void
  onDeleteProject: (id: string) => void
  dark: boolean
}

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "high", label: "High" }, { key: "mid", label: "Mid" },
  { key: "low",  label: "Low"  }, { key: "none", label: "None" },
]

type Filter = Priority | "all" | "done"

export default function TasksPage({
  tasks, activeTask, running, projects,
  onSave, onDelete, onToggle, onToggleSub,
  onSetActive, onNavToTimer, onStartFocus, onSaveProject, onDeleteProject, dark,
}: TasksPageProps) {
  const [search,    setSearch]    = useState("")
  const [filter,    setFilter]    = useState<Filter>("all")
  const [modalTask, setModalTask] = useState<Task | undefined>()
  const [showModal, setShowModal] = useState(false)
  const [showDone,  setShowDone]  = useState(false)
  const [showSessionToast, setShowSessionToast] = useState(false)

  // Project modal state
  const [projectModal, setProjectModal] = useState<{ open: boolean; project?: Project }>({ open: false })

  const { toast, show: showToast, dismiss: dismissToast, EMOJI } = useToast()
  const { pinned, togglePin } = usePinnedTasks()
  const { pending: deletePending, stage: stageDelete, undo } = useUndo(onDelete)
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  const handleDelete = useCallback((task: Task) => {
    stageDelete(task)
    showToast("deleted", `"${task.title}" deleted`, "Tap undo to restore",
      () => { undo(); dismissToast() })
  }, [stageDelete, showToast, undo, dismissToast])

  const handleSave = useCallback((task: Task) => {
    const isNew = !tasks.find(t => t.id === task.id)
    onSave(task)
    showToast(isNew ? "created" : "saved", isNew ? "Task created" : "Changes saved", task.title)
    setShowModal(false)
  }, [tasks, onSave, showToast])

  const handleQuickStart = useCallback((task: Task) => {
    if (running) { setShowSessionToast(true); setTimeout(() => setShowSessionToast(false), 3000); return }
    onStartFocus(task)
  }, [running, onStartFocus])

  const handleTaskClick = useCallback((task: Task) => {
    if (running) { setShowSessionToast(true); setTimeout(() => setShowSessionToast(false), 3000); return }
    onSetActive(task); onNavToTimer()
  }, [running, onSetActive, onNavToTimer])

  // Project handlers
  const handleSaveProject = useCallback((p: Project) => {
    const isNew = !projects.find(x => x.id === p.id)
    onSaveProject(p)
    showToast(isNew ? "created" : "saved",
      isNew ? "Project created" : "Project updated", p.name)
    setProjectModal({ open: false })
  }, [projects, onSaveProject, showToast])

  const handleDeleteProject = useCallback((id: string) => {
    const proj = projects.find(p => p.id === id)
    onDeleteProject(id)
    showToast("deleted", `"${proj?.name ?? "Project"}" deleted`, "Project removed")
    setProjectModal({ open: false })
  }, [projects, onDeleteProject, showToast])

  // Base filtered set
  const visible = tasks.filter(t => {
    if (t.id === deletePending?.id) return false
    if (!t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === "done") return t.done
    if (filter === "all")  return true
    return t.priority === filter && !t.done
  })

  const allPending = useSortedTasks(visible.filter(t => !t.done), activeTask.id, pinned)
  const done       = visible.filter(t => t.done)

  // Group unassigned tasks
  const assignedIds = new Set(projects.map(p => p.id))
  const unassigned  = allPending.filter(t => !t.projectId || !assignedIds.has(t.projectId))

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

  const pendingCount = tasks.filter(t => !t.done).length
  const doneCount    = tasks.filter(t => t.done).length

  // ── Project detail page ──────────────────────────────────────────────────
  if (activeProject) {
    // keep activeProject in sync if it was just edited
    const liveProject = projects.find(p => p.id === activeProject.id) ?? activeProject
    return (
      <ProjectPage
        project={liveProject}
        allTasks={tasks}
        activeTask={activeTask}
        running={running}
        dark={dark}
        projects={projects}
        onBack={() => setActiveProject(null)}
        onSave={onSave}
        onDelete={onDelete}
        onToggle={onToggle}
        onToggleSub={onToggleSub}
        onSetActive={onSetActive}
        onNavToTimer={onNavToTimer}
        onStartFocus={onStartFocus}
        onSaveProject={onSaveProject}
        onDeleteProject={id => { handleDeleteProject(id); setActiveProject(null) }}
        onEditProject={p => setProjectModal({ open: true, project: p })}
      />
    )
  }

  // ── Main tasks page ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">

      {/* Task action toast */}
      <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-300 transition-all duration-300
        ${toast ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-3 pointer-events-none"}`}>
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-surface border border-border whitespace-nowrap shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
          <span className="text-base">{toast ? EMOJI[toast.type] : "✅"}</span>
          <div className="flex flex-col">
            <span className="text-sm font-black text-tx">{toast?.title}</span>
            {toast?.sub && <span className="text-xs text-sub">{toast.sub}</span>}
          </div>
          {toast?.undoFn && (
            <button onClick={toast.undoFn} className="ml-2 text-sm font-black text-accent hover:underline">
              Undo
            </button>
          )}
        </div>
      </div>

      {/* Session-in-progress toast */}
      <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-200 transition-all duration-300
        ${showSessionToast ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-3 pointer-events-none"}`}>
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-surface border border-border shadow-[0_8px_32px_rgba(0,0,0,0.3)] whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-priority-low animate-pulse shrink-0" />
          <span className="text-sm font-semibold text-tx">Focus session in progress</span>
          <span className="text-sm text-sub">— finish or pause first</span>
        </div>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-tx">Tasks</h1>
          <p className="text-sm text-sub mt-0.5">{pendingCount} pending · {doneCount} done</p>
        </div>
        <button
          onClick={() => { setModalTask(undefined); setShowModal(true) }}
          className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-black hover:bg-accent-hover active:scale-95 transition-all">
          <HiPlus size={14} /> New task
        </button>
      </div>

      {/* Running banner */}
      {running && (
        <div className="flex items-center gap-3 rounded-xl bg-priority-low/5 border border-priority-low/20 px-4 py-3">
          <span className="w-2 h-2 rounded-full bg-priority-low animate-pulse shrink-0" />
          <p className="text-xs font-semibold text-tx flex-1">
            Focus session active — task switching is disabled until you pause or finish.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5">
        <HiMagnifyingGlass size={14} className="text-sub shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
          className="bg-transparent outline-none text-sm text-tx placeholder:text-sub flex-1" />
        {search && (
          <button onClick={() => setSearch("")} className="text-sub hover:text-tx">
            <HiXMark size={13} />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
        <button onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0
            ${filter === "all" ? "bg-accent text-white border-accent" : "border-border text-sub bg-surface"}`}>
          All ({tasks.length})
        </button>
        {PRIORITIES.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(f => f === key ? "all" : key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0
              ${filter === key ? "text-white border-transparent" : "border-border text-sub bg-surface"}`}
            style={filter === key ? { background: getPriority(key), borderColor: getPriority(key) } : {}}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: filter === key ? "rgba(255,255,255,0.8)" : getPriority(key) }} />
            {label}
          </button>
        ))}
        <button onClick={() => setFilter(f => f === "done" ? "all" : "done")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0
            ${filter === "done" ? "bg-accent text-white border-accent" : "border-border text-sub bg-surface"}`}>
          Done ({doneCount})
        </button>
      </div>

      {/* ── Projects section ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiFolder size={13} className="text-sub" />
            <span className="text-xs font-bold text-sub uppercase tracking-wider">
              Projects · {projects.length}
            </span>
          </div>
          <button
            onClick={() => setProjectModal({ open: true, project: undefined })}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-surface2
              text-xs font-bold text-sub hover:text-accent hover:border-accent/40 transition-colors">
            <HiPlus size={12} /> New
          </button>
        </div>

        {/* Project cards */}
        {projects.length > 0 ? (
          <div className="flex gap-4 pb-1 -mx-1 px-1 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {projects.map(proj => (
              <div key={proj.id} className="relative group/proj shrink-0 snap-start">
                <ProjectCard
                  project={proj}
                  tasks={tasks.filter(t => t.projectId === proj.id)}
                  onClick={() => setActiveProject(proj)} />
              </div>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setProjectModal({ open: true, project: undefined })}
            className="flex flex-col items-center gap-1.5 py-6 rounded-xl border border-dashed
              border-border text-sub hover:border-accent/40 hover:text-accent/70 transition-colors">
            <HiFolderOpen size={22} />
            <span className="text-xs font-semibold">No projects yet — create one</span>
          </button>
        )}
      </div>

      {/* ── Pending tasks ─────────────────────────────────────────────────── */}
      {allPending.length > 0 && (
        <div className="flex flex-col gap-2">

          {/* Unassigned tasks */}
          {unassigned.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-bold text-sub uppercase tracking-wider">
                  {projects.length > 0 ? "No project" : `Pending — ${allPending.length}`}
                </span>
              </div>
              <div className="h-px bg-border mb-1" style={{ opacity: 0.5 }} />
              {unassigned.map(task => renderTask(task))}
            </div>
          )}
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <div className="flex flex-col">
          <button onClick={() => setShowDone(v => !v)}
            className="flex items-center justify-between py-1.5 w-full">
            <span className="text-xs font-bold text-sub uppercase tracking-wider">
              Completed — {done.length}
            </span>
            <HiChevronDown size={12} className="text-sub transition-transform duration-200"
              style={{ transform: showDone ? "rotate(180deg)" : "none" }} />
          </button>
          <div className="h-px bg-border mb-2" style={{ opacity: 0.5 }} />
          {showDone && (
            <div className="flex flex-col gap-2">
              {done.map(task => (
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
      {visible.length === 0 && !deletePending && (
        <div className="rounded-2xl border border-border bg-surface px-5 py-12 text-center">
          <HiFolderOpen size={28} className="text-sub mx-auto mb-3" />
          <p className="text-sub text-sm">No tasks found</p>
          <button onClick={() => { setModalTask(undefined); setShowModal(true) }}
            className="mt-3 text-sm text-accent font-semibold hover:underline">
            Create one →
          </button>
        </div>
      )}

      {/* Task modal */}
      {showModal && (
        <TaskModal
          task={modalTask}
          projects={projects}
          onSave={handleSave}
          onDelete={id => { onDelete(id); setShowModal(false) }}
          onClose={() => setShowModal(false)}
          onCreateProject={onSaveProject}
          dark={dark} />
      )}

      {/* Project modal */}
      {projectModal.open && (
        <ProjectModal
          project={projectModal.project}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
          onClose={() => setProjectModal({ open: false })}
          dark={dark} />
      )}
    </div>
  )
}
"use client"

import { useState, useCallback } from "react"
import { HiPlus, HiMagnifyingGlass, HiXMark, HiChevronDown, HiFolderOpen, HiFolder, HiArrowsRightLeft, HiCalendarDays } from "react-icons/hi2"
import TaskCard, { type Task } from "../components/tasks/TaskCard"
import TasksCalendar, { FocusHistory } from "../components/tasks/TasksCalendar"
import { type SessionRecord } from "../app/page"
import TaskModal from "../components/tasks/TaskModal"
import ProjectCard from "../components/tasks/ProjectCard"
import ProjectModal from "../components/tasks/ProjectModal"
import ProjectPage from "../components/tasks/ProjectPage"
import TaskList from "../components/tasks/TaskList"
import { type Project } from "../components/tasks/TaskModal"
import { type Priority } from "../lib/theme"
import PriorityChip from "../components/shared/PriorityChip"
import Toast from "../components/shared/Toast"
import { useUndo } from "../hooks/useUndo"
import { usePinnedTasks } from "../hooks/usePinnedTasks"
import { useSortedTasks } from "../hooks/useTaskSort"
import { useToast } from "../hooks/useToast"

interface TasksPageProps {
  tasks: Task[]; activeTask: Task
  projects: Project[]
  onSave: (t: Task) => void; onDelete: (id: string) => void
  onToggle: (id: string) => void; onToggleSub: (tId: string, sId: string) => void
  onStartFocus: (t: Task) => void
  onSaveProject: (p: Project) => void
  onDeleteProject: (id: string) => void
  onRestoreProject: (p: Project, taskIds: string[]) => void
  allHistory: SessionRecord[]
  dark: boolean
}

function localDate(ts: number = Date.now()) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "high", label: "High" }, { key: "mid", label: "Mid" },
  { key: "low",  label: "Low"  }, { key: "none", label: "None" },
]

type Filter = Priority | "all" | "done"

export default function TasksPage({
  tasks, activeTask, projects,
  onSave, onDelete, onToggle, onToggleSub,
  onStartFocus, onSaveProject, onDeleteProject, onRestoreProject,
  allHistory, dark,
}: TasksPageProps) {
  const [search,    setSearch]    = useState("")
  const [filter,    setFilter]    = useState<Filter>("all")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [modalTask, setModalTask] = useState<Task | undefined>()
  const [showModal, setShowModal] = useState(false)
  const [showDone,  setShowDone]  = useState(false)
  // "all" is the default: a task filed under a project must still be reachable
  // from the main list, otherwise the only way to see it is to open its folder.
  const [view,      setView]      = useState<"all" | "project">("all")

  // Project modal state
  const [projectModal, setProjectModal] = useState<{ open: boolean; project?: Project }>({ open: false })

  const { toast, show: showToast, dismiss: dismissToast } = useToast()
  const { pinned, togglePin } = usePinnedTasks()
  const { pending: deletePending, stage: stageDelete, undo } = useUndo(onDelete)
  const [activeProject, setActiveProject] = useState<Project | null>(null)

  // One-time coaching for the swipe gestures (pin / delete) — read once on mount
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    try { return !localStorage.getItem("todoro:swipeHintSeen") } catch { return false }
  })
  const dismissSwipeHint = useCallback(() => {
    setShowSwipeHint(false)
    try { localStorage.setItem("todoro:swipeHintSeen", "1") } catch {}
  }, [])

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
    onStartFocus(task)
  }, [onStartFocus])

  // Tapping a row opens it for editing — the pencil button came off the row so
  // it could fit a 44px play target. Starting a session is the play button, and
  // "make active without starting" still lives behind the Timer's Change picker.
  const handleTaskClick = useCallback((task: Task) => {
    setModalTask(task); setShowModal(true)
  }, [])

  // Project handlers
  const handleSaveProject = useCallback((p: Project) => {
    const isNew = !projects.find(x => x.id === p.id)
    onSaveProject(p)
    showToast(isNew ? "created" : "saved",
      isNew ? "Project created" : "Project updated", p.name)
    setProjectModal({ open: false })
  }, [projects, onSaveProject, showToast])

  const handleDeleteProject = useCallback((id: string) => {
    const proj    = projects.find(p => p.id === id)
    // Snapshot before the delete — these are the tasks that lose their folder
    const orphans = tasks.filter(t => t.projectId === id).map(t => t.id)
    onDeleteProject(id)
    showToast("deleted", `"${proj?.name ?? "Project"}" deleted`,
      orphans.length > 0
        ? `${orphans.length} task${orphans.length > 1 ? "s" : ""} moved to No project`
        : "Project removed",
      proj ? () => { onRestoreProject(proj, orphans); dismissToast() } : undefined)
    setProjectModal({ open: false })
  }, [projects, tasks, onDeleteProject, onRestoreProject, showToast, dismissToast])

  // Base filtered set — a selected calendar day narrows to tasks due that day.
  // Search reaches into subtasks and the project name so a task can be found by
  // anything the user can actually see on its card.
  const q = search.trim().toLowerCase()
  const matchesSearch = (t: Task) => {
    if (!q) return true
    if (t.title.toLowerCase().includes(q)) return true
    if (t.subtasks.some(s => s.title.toLowerCase().includes(q))) return true
    const proj = t.projectId ? projects.find(p => p.id === t.projectId) : undefined
    return !!proj?.name.toLowerCase().includes(q)
  }

  const visible = tasks.filter(t => {
    if (t.id === deletePending?.id) return false
    if (!matchesSearch(t)) return false
    if (selectedDate) return t.dueDate === selectedDate
    if (filter === "done") return t.done
    if (filter === "all")  return true
    return t.priority === filter && !t.done
  })

  const daySessions = selectedDate
    ? allHistory.filter(s => localDate(s.at) === selectedDate).length
    : 0

  const allPending = useSortedTasks(visible.filter(t => !t.done), activeTask.id, pinned)
  const done       = visible.filter(t => t.done)

  const projectOf = (t: Task) => t.projectId ? projects.find(p => p.id === t.projectId) : undefined

  const renderTask = (task: Task) => {
    const proj = projectOf(task)
    return (
      <TaskCard key={task.id} task={task}
        onToggle={onToggle} onToggleSub={onToggleSub}
        onDelete={handleDelete}
        onPin={togglePin}
        onQuickStart={handleQuickStart}
        isActive={task.id === activeTask.id}
        isPinned={pinned.has(task.id)}
        projectName={proj?.name}
        projectColor={proj?.color}
        onProjectClick={proj ? () => setActiveProject(proj) : undefined}
        onClick={handleTaskClick} />
    )
  }

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
        dark={dark}
        projects={projects}
        onBack={() => setActiveProject(null)}
        onSave={onSave}
        onDelete={onDelete}
        onToggle={onToggle}
        onToggleSub={onToggleSub}
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
      <Toast open={!!toast} title={toast?.title} sub={toast?.sub} onAction={toast?.undoFn} />

      {/* Page header — phone only; the top bar carries it on large screens */}
      <div className="md:hidden">
        <h1 className="text-title font-extrabold text-tx leading-tight">Tasks</h1>
        <p className="text-meta text-sub">{pendingCount} open · {doneCount} done</p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 min-h-13 px-4 rounded-control border border-border bg-panel">
        <HiMagnifyingGlass size={17} className="text-sub shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          aria-label="Search tasks"
          placeholder="Search tasks, subtasks, projects…"
          className="flex-1 min-w-0 bg-transparent outline-none text-body text-tx placeholder:text-sub py-3" />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Clear search"
            className="w-11 h-11 -mr-2 shrink-0 grid place-items-center text-sub hover:text-tx transition-colors">
            <HiXMark size={16} />
          </button>
        )}
      </div>

      {/* Calendar — tap a day to filter the list below */}
      <TasksCalendar tasks={tasks} allHistory={allHistory} selected={selectedDate} onSelect={setSelectedDate} />

      {selectedDate ? (
        <div className="flex items-center gap-3 min-h-13 px-4 rounded-control border border-border bg-panel">
          <HiCalendarDays size={15} className="text-accent shrink-0" />
          <span className="flex-1 text-sm font-semibold text-tx truncate">
            {new Date(selectedDate + "T00:00").toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </span>
          {daySessions > 0 && (
            <span className="text-xs text-sub shrink-0">{daySessions} session{daySessions > 1 ? "s" : ""}</span>
          )}
          <button onClick={() => setSelectedDate(null)}
            className="text-xs font-semibold text-accent hover:underline shrink-0">Show all</button>
        </div>
      ) : (
        <>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
        <button onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={`min-h-11 px-4 rounded-pill text-meta font-bold border transition-all shrink-0
            ${filter === "all" ? "bg-accent text-white border-accent" : "border-border text-tx bg-surface"}`}>
          All ({tasks.length})
        </button>
        {PRIORITIES.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(f => f === key ? "all" : key)}
            aria-pressed={filter === key}
            className={`flex items-center gap-2 min-h-11 px-4 rounded-pill text-meta font-bold border transition-all shrink-0
              ${filter === key ? "bg-accent text-white border-accent" : "border-border text-tx bg-surface"}`}>
            {/* The chip is the unselected pill's only ranking cue; once the pill
                is filled the label carries it, and an accent chip on an accent
                pill would vanish. */}
            {filter !== key && <PriorityChip priority={key} />}
            {label}
          </button>
        ))}
        <button onClick={() => setFilter(f => f === "done" ? "all" : "done")}
          aria-pressed={filter === "done"}
          className={`min-h-11 px-4 rounded-pill text-meta font-bold border transition-all shrink-0
            ${filter === "done" ? "bg-accent text-white border-accent" : "border-border text-tx bg-surface"}`}>
          Done ({doneCount})
        </button>
      </div>

      {/* Swipe coaching (first visit) */}
      {showSwipeHint && tasks.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5">
          <HiArrowsRightLeft size={15} className="text-accent shrink-0" />
          <p className="text-xs text-tx flex-1">
            <span className="font-bold">Tip:</span> tap a task to edit it — priority, due date, subtasks.
            Pin 📍 to jump it to the top and make it your next focus, ▶ to start now, or swipe left to delete.
          </p>
          <button onClick={dismissSwipeHint} aria-label="Dismiss tip"
            className="w-11 h-11 -my-2 -mr-2 shrink-0 grid place-items-center text-sub hover:text-tx transition-colors">
            <HiXMark size={14} />
          </button>
        </div>
      )}

      {/* ── Projects section ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiFolder size={13} className="text-sub" />
            <span className="text-caption font-extrabold uppercase tracking-wider text-tx">
              Projects · {projects.length}
            </span>
          </div>
          <button
            onClick={() => setProjectModal({ open: true, project: undefined })}
            className="flex items-center gap-1.5 min-h-11 px-3.5 rounded-control border border-border bg-surface
              text-meta font-extrabold text-tx hover:text-accent hover:border-accent/40 transition-colors">
            <HiPlus size={14} /> New
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
        </>
      )}

      {/* ── Pending tasks ─────────────────────────────────────────────────── */}
      {(selectedDate || visible.length > 0) && (
        <TaskList
          pending={allPending}
          projects={projects}
          pinnedIds={pinned}
          selectedDate={selectedDate}
          view={view}
          onViewChange={setView}
          onOpenProject={setActiveProject}
          renderTask={renderTask}
          hasAnyPending={tasks.some(t => !t.done)} />
      )}

      {/* Completed */}
      {done.length > 0 && (
        <div className="flex flex-col">
          <button onClick={() => setShowDone(v => !v)}
            className="flex items-center justify-between py-1.5 w-full">
            <span className="text-caption font-extrabold uppercase tracking-wider text-tx">
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
                  onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {visible.length === 0 && !deletePending && (
        <div className="panel px-5 py-12 text-center">
          <HiFolderOpen size={28} className="text-sub mx-auto mb-3" />
          <p className="text-sub text-sm">{selectedDate ? "No tasks due this day" : "No tasks found"}</p>
          <button onClick={() => { setModalTask(undefined); setShowModal(true) }}
            className="mt-3 text-sm text-accent font-semibold hover:underline">
            Create one →
          </button>
        </div>
      )}

      {/* Focus-session heatmap */}
      <FocusHistory allHistory={allHistory} />

      {/* Task modal */}
      {showModal && (
        <TaskModal
          task={modalTask}
          projects={projects}
          onSave={handleSave}
          onDelete={id => { const t = tasks.find(x => x.id === id); if (t) handleDelete(t) }}
          onClose={() => setShowModal(false)}
          onCreateProject={onSaveProject}
          dark={dark} />
      )}

      {/* Project modal */}
      {projectModal.open && (
        <ProjectModal
          project={projectModal.project}
          taskCount={projectModal.project
            ? tasks.filter(t => t.projectId === projectModal.project!.id).length
            : 0}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
          onClose={() => setProjectModal({ open: false })}
          dark={dark} />
      )}
    </div>
  )
}
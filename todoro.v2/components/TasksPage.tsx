"use client"

import { useState, useCallback } from "react"
import { HiPlus, HiMagnifyingGlass, HiXMark, HiChevronDown, HiFolderOpen, HiFolder, HiArrowsRightLeft, HiCalendarDays, HiMapPin } from "react-icons/hi2"
import TaskCard, { type Task } from "../components/tasks/TaskCard"
import TasksCalendar, { FocusHistory } from "../components/tasks/TasksCalendar"
import { type SessionRecord } from "../app/page"
import TaskModal from "../components/tasks/TaskModal"
import ProjectCard from "../components/tasks/ProjectCard"
import ProjectModal from "../components/tasks/ProjectModal"
import ProjectPage from "../components/tasks/ProjectPage"
import { type Project } from "../components/tasks/TaskModal"
import { type Priority, getPriority } from "../lib/theme"
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
  onOpenTask: (t: Task) => void; onStartFocus: (t: Task) => void
  onSaveProject: (p: Project) => void
  onDeleteProject: (id: string) => void
  onRestoreProject: (p: Project, taskIds: string[]) => void
  allHistory: SessionRecord[]
  initialDate?: string | null
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
  onOpenTask, onStartFocus, onSaveProject, onDeleteProject, onRestoreProject,
  allHistory, initialDate, dark,
}: TasksPageProps) {
  const [search,    setSearch]    = useState("")
  const [filter,    setFilter]    = useState<Filter>("all")
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate ?? null)
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

  const handleTaskClick = useCallback((task: Task) => {
    onOpenTask(task)
  }, [onOpenTask])

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

  // Group unassigned tasks
  const assignedIds = new Set(projects.map(p => p.id))
  const unassigned  = allPending.filter(t => !t.projectId || !assignedIds.has(t.projectId))
  const projectOf   = (t: Task) => t.projectId ? projects.find(p => p.id === t.projectId) : undefined

  const pinnedPending = allPending.filter(t => pinned.has(t.id))

  const renderTask = (task: Task) => {
    const proj = projectOf(task)
    return (
      <TaskCard key={task.id} task={task}
        onToggle={onToggle} onToggleSub={onToggleSub}
        onEdit={t => { setModalTask(t); setShowModal(true) }}
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
        onOpenTask={onOpenTask}
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

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-tx">Tasks</h1>
          <p className="text-sm text-sub mt-0.5">{pendingCount} pending · {doneCount} done</p>
        </div>
        <button
          onClick={() => { setModalTask(undefined); setShowModal(true) }}
          className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover active:scale-95 transition-all">
          <HiPlus size={14} /> New task
        </button>
      </div>

      {/* Search */}
      <div className="glass flex items-center gap-3 rounded-xl px-4 py-2.5">
        <HiMagnifyingGlass size={14} className="text-sub shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks, subtasks, projects…"
          className="bg-transparent outline-none text-sm text-tx placeholder:text-sub flex-1" />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Clear search" className="text-sub hover:text-tx">
            <HiXMark size={13} />
          </button>
        )}
      </div>

      {/* Calendar — tap a day to filter the list below */}
      <TasksCalendar tasks={tasks} allHistory={allHistory} selected={selectedDate} onSelect={setSelectedDate} />

      {selectedDate ? (
        <div className="flex items-center gap-3 glass rounded-xl px-4 py-2.5">
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

      {/* Swipe coaching (first visit) */}
      {showSwipeHint && tasks.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5">
          <HiArrowsRightLeft size={15} className="text-accent shrink-0" />
          <p className="text-xs text-tx flex-1">
            <span className="font-bold">Tip:</span> tap 📍 (or swipe right) to pin a task — it jumps to the top and becomes your next focus. Swipe left to delete.
          </p>
          <button onClick={dismissSwipeHint} className="text-sub hover:text-tx transition-colors shrink-0">
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
            <span className="text-xs font-bold text-sub">
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
        </>
      )}

      {/* ── Pending tasks ─────────────────────────────────────────────────── */}
      {selectedDate ? (
        allPending.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-bold text-sub">Due this day — {allPending.length}</span>
            </div>
            <div className="h-px bg-border mb-1" style={{ opacity: 0.5 }} />
            {allPending.map(task => renderTask(task))}
          </div>
        )
      ) : visible.length > 0 ? (
        <div className="flex flex-col gap-1.5">

          {/* Section header + view switch */}
          <div className="flex items-center justify-between py-1 gap-3">
            <span className="text-xs font-bold text-sub">
              Pending — {allPending.length}
            </span>
            {projects.length > 0 && (
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface2 p-0.5 shrink-0">
                {([["all", "All tasks"], ["project", "By project"]] as const).map(([key, label]) => (
                  <button key={key} onClick={() => setView(key)}
                    aria-pressed={view === key}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors
                      ${view === key ? "bg-accent text-white" : "text-sub hover:text-tx"}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="h-px bg-border mb-1" style={{ opacity: 0.5 }} />

          {allPending.length === 0 ? (
            <p className="text-sm text-sub italic py-4 text-center">
              {tasks.some(t => !t.done) ? "No pending tasks match this filter" : "Nothing pending — you're all caught up"}
            </p>
          ) : view === "all" || projects.length === 0 ? (
            <>
              {pinnedPending.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <HiMapPin size={11} className="text-accent" />
                    <span className="text-[11px] font-bold text-accent">Pinned — {pinnedPending.length}</span>
                  </div>
                  {pinnedPending.map(task => renderTask(task))}
                  <div className="h-px bg-border my-1.5" style={{ opacity: 0.5 }} />
                </>
              )}
              {allPending.filter(t => !pinned.has(t.id)).map(task => renderTask(task))}
            </>
          ) : (
            <>
              {projects.map(proj => {
                const group = allPending.filter(t => t.projectId === proj.id)
                if (group.length === 0) return null
                return (
                  <div key={proj.id} className="flex flex-col gap-1.5">
                    <button onClick={() => setActiveProject(proj)}
                      className="flex items-center gap-1.5 pt-1 self-start group/h">
                      <HiFolder size={11} style={{ color: proj.color }} />
                      <span className="text-[11px] font-bold text-sub group-hover/h:text-accent transition-colors">
                        {proj.name} — {group.length}
                      </span>
                    </button>
                    {group.map(task => renderTask(task))}
                  </div>
                )
              })}
              {unassigned.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-sub pt-1">No project — {unassigned.length}</span>
                  {unassigned.map(task => renderTask(task))}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* Completed */}
      {done.length > 0 && (
        <div className="flex flex-col">
          <button onClick={() => setShowDone(v => !v)}
            className="flex items-center justify-between py-1.5 w-full">
            <span className="text-xs font-bold text-sub">
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
        <div className="glass rounded-2xl px-5 py-12 text-center">
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
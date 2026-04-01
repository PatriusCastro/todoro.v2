"use client"

import { useState, useCallback } from "react"
import { HiPlus, HiMagnifyingGlass, HiXMark, HiChevronDown } from "react-icons/hi2"
import TaskCard, { type Task } from "../components/tasks/TaskCard"
import TaskModal from "../components/tasks/TaskModal"
import { type Priority, getPriority } from "../lib/theme"
import { useUndo } from "../hooks/useUndo"
import { usePinnedTasks } from "../hooks/usePinnedTasks"
import { useSortedTasks } from "../hooks/useTaskSort"

interface TasksPageProps {
  tasks: Task[]; activeTask: Task; running: boolean
  onSave: (t: Task) => void; onDelete: (id: string) => void
  onToggle: (id: string) => void; onToggleSub: (tId: string, sId: string) => void
  onSetActive: (t: Task) => void; onNavToTimer: () => void
  dark: boolean
}

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "high", label: "High" }, { key: "mid", label: "Mid" },
  { key: "low",  label: "Low"  }, { key: "none", label: "None" },
]

export default function TasksPage({
  tasks, activeTask, running, onSave, onDelete,
  onToggle, onToggleSub, onSetActive, onNavToTimer, dark,
}: TasksPageProps) {
  const [search,    setSearch]    = useState("")
  const [filter,    setFilter]    = useState<Priority | "all" | "done">("all")
  const [modalTask, setModalTask] = useState<Task | undefined>()
  const [showModal, setShowModal] = useState(false)
  const [showDone,  setShowDone]  = useState(false)
  const [showToast, setShowToast] = useState(false)

  const { pinned, togglePin } = usePinnedTasks()
  const { pending: deletePending, stage: stageDelete, undo } = useUndo(onDelete)

  const handleDelete = useCallback((task: Task) => stageDelete(task), [stageDelete])

  const handleQuickStart = useCallback((task: Task) => {
    if (running) { setShowToast(true); setTimeout(() => setShowToast(false), 3000); return }
    onSetActive(task)
    onNavToTimer()
  }, [running, onSetActive, onNavToTimer])

  const handleTaskClick = useCallback((task: Task) => {
    if (running) { setShowToast(true); setTimeout(() => setShowToast(false), 3000); return }
    onSetActive(task)
    onNavToTimer()
  }, [running, onSetActive, onNavToTimer])

  const visible = tasks.filter(t => {
    if (t.id === deletePending?.id) return false
    if (!t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === "done") return t.done
    if (filter === "all")  return true
    return t.priority === filter && !t.done
  })

  const pending = useSortedTasks(visible.filter(t => !t.done), activeTask.id, pinned)
  const done    = visible.filter(t => t.done)

  return (
    <div className="flex flex-col gap-5">

      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-200 transition-all duration-300
        ${showToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-surface border border-border shadow-[0_8px_32px_rgba(0,0,0,0.3)] whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-priority-low animate-pulse shrink-0" />
          <span className="text-sm font-semibold text-tx">Focus session in progress</span>
          <span className="text-sm text-sub">— finish or pause first</span>
        </div>
      </div>

      {deletePending && (
        <div className="min-w-75 absolute top-4 left-1/2 -translate-x-1/2 flex items-center justify-between z-100 gap-3 rounded-xl bg-surface border border-border px-4 py-3">
          <div className= "flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <p className="text-sm font-semibold text-tx">Task "{deletePending.title}" deleted</p>
          </div>
          <button onClick={undo} className="text-sm text-accent font-semibold justify-end hover:underline">
            Undo
          </button>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-tx">Tasks</h1>
          <p className="text-sm text-sub mt-0.5">
            {tasks.filter(t => !t.done).length} pending · {tasks.filter(t => t.done).length} done
          </p>
        </div>
        {/* Appears only on wider screens */}
        <button
          onClick={() => { setModalTask(undefined); setShowModal(true) }}
          className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-black hover:bg-accent-hover active:scale-95 transition-all">
          <HiPlus size={14} /> New
        </button>
      </div>

      {running && (
        <div className="flex items-center gap-3 rounded-xl bg-priority-low/5 border border-priority-low/20 px-4 py-3">
          <span className="w-2 h-2 rounded-full bg-priority-low animate-pulse shrink-0" />
          <p className="text-xs font-semibold text-tx flex-1">
            Focus session active — task switching is disabled until you pause or finish.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <HiMagnifyingGlass size={15} className="text-sub shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
          className="bg-transparent outline-none text-sm text-tx placeholder:text-sub flex-1" />
        {search && (
          <button onClick={() => setSearch("")} className="text-sub hover:text-tx">
            <HiXMark size={14} />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all shrink-0
            ${filter === "all" ? "bg-accent text-white border-accent" : "border-border text-sub hover:border-accent/40 bg-surface"}`}>
          All ({tasks.length})
        </button>
        {PRIORITIES.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(f => f === key ? "all" : key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all shrink-0
              ${filter === key ? "text-white border-transparent" : "border-border text-sub hover:border-accent/40 bg-surface"}`}
            style={filter === key ? { background: getPriority(key), borderColor: getPriority(key) } : {}}>
            <span className="w-2 h-2 rounded-full"
              style={{ background: filter === key ? "rgba(255,255,255,0.7)" : getPriority(key) }} />
            {label} ({tasks.filter(t => t.priority === key && !t.done).length})
          </button>
        ))}
        <button onClick={() => setFilter(f => f === "done" ? "all" : "done")}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all shrink-0
            ${filter === "done" ? "bg-accent text-white border-accent" : "border-border text-sub hover:border-accent/40 bg-surface"}`}>
          Done ({tasks.filter(t => t.done).length})
        </button>
      </div>

      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-sub uppercase tracking-wider px-1">
            Pending — {pending.length}
          </span>
          <div className={`flex flex-col gap-2 overflow-y-auto ${pending.length > 5 ? "max-h-105 pr-1" : ""}`}>
            {pending.map(task => (
              <TaskCard key={task.id} task={task}
                onToggle={onToggle} onToggleSub={onToggleSub}
                onEdit={t => { setModalTask(t); setShowModal(true) }}
                onDelete={handleDelete}
                onPin={togglePin}
                onQuickStart={handleQuickStart}
                isActive={task.id === activeTask.id}
                isPinned={pinned.has(task.id)}
                onClick={handleTaskClick} />
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div className="flex flex-col gap-2">
          <button onClick={() => setShowDone(v => !v)}
            className="flex items-center justify-between px-1 w-full">
            <span className="text-xs font-bold text-sub uppercase tracking-wider">
              Completed — {done.length}
            </span>
            <HiChevronDown size={13} className="text-sub transition-transform duration-200"
              style={{ transform: showDone ? "rotate(180deg)" : "none" }} />
          </button>
          {showDone && (
            <div className={`flex flex-col gap-2 overflow-y-auto ${done.length > 5 ? "max-h-105 pr-1" : ""}`}>
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

      {visible.length === 0 && !deletePending && (
        <div className="rounded-2xl border border-border bg-surface px-5 py-12 text-center">
          <p className="text-sub text-sm">No tasks found</p>
          <button onClick={() => { setModalTask(undefined); setShowModal(true) }}
            className="mt-3 text-sm text-accent font-semibold hover:underline">
            Create one →
          </button>
        </div>
      )}

      {showModal && (
        <TaskModal task={modalTask} onSave={onSave}
          onDelete={id => { onDelete(id); setShowModal(false) }}
          onClose={() => setShowModal(false)} dark={dark} />
      )}
    </div>
  )
}
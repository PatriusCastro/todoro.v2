"use client"

import { useState } from "react"
import TaskCard, { type Task } from "../components/tasks/TaskCard"
import TaskModal from "../components/tasks/TaskModal"
import { type Priority, getPriority } from "../lib/theme"

interface TasksPageProps {
  tasks: Task[]; activeTask: Task
  onSave: (t: Task) => void; onDelete: (id: string) => void
  onToggle: (id: string) => void; onToggleSub: (tId: string, sId: string) => void
  onSetActive: (t: Task) => void; onNavToTimer: () => void
}

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "high", label: "High" }, { key: "mid", label: "Mid" },
  { key: "low",  label: "Low"  }, { key: "none", label: "None" },
]

export default function TasksPage({ tasks, activeTask, onSave, onDelete, onToggle, onToggleSub, onSetActive, onNavToTimer }: TasksPageProps) {
  const [search,    setSearch]    = useState("")
  const [filter,    setFilter]    = useState<Priority | "all">("all")
  const [modalTask, setModalTask] = useState<Task | undefined>()
  const [showModal, setShowModal] = useState(false)

  const filtered = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) &&
    (filter === "all" || t.priority === filter)
  )

  const done    = filtered.filter(t =>  t.done)
  const pending = filtered.filter(t => !t.done)

  return (
    <div className="flex flex-col gap-5">

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-tx">Tasks</h1>
          <p className="text-sm text-sub mt-0.5">{tasks.filter(t => !t.done).length} pending · {tasks.filter(t => t.done).length} done</p>
        </div>
        <button onClick={() => { setModalTask(undefined); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-black hover:bg-accent-hover active:scale-95 transition-all">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-sub shrink-0">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
          className="bg-transparent outline-none text-sm text-tx placeholder:text-sub flex-1" />
        {search && <button onClick={() => setSearch("")} className="text-sub hover:text-tx">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>}
      </div>

      {/* Priority filter */}
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
            <span className="w-2 h-2 rounded-full" style={{ background: filter === key ? "rgba(255,255,255,0.7)" : getPriority(key) }} />
            {label} ({tasks.filter(t => t.priority === key).length})
          </button>
        ))}
      </div>

      {/* Pending tasks */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-sub uppercase tracking-wider px-1">Pending — {pending.length}</span>
          {pending.map(task => (
            <TaskCard key={task.id} task={task}
              onToggle={onToggle} onToggleSub={onToggleSub}
              onEdit={t => { setModalTask(t); setShowModal(true) }}
              isActive={task.id === activeTask.id}
              onClick={t => { onSetActive(t); onNavToTimer() }} />
          ))}
        </div>
      )}

      {/* Done tasks */}
      {done.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-sub uppercase tracking-wider px-1">Completed — {done.length}</span>
          {done.map(task => (
            <TaskCard key={task.id} task={task}
              onToggle={onToggle} onToggleSub={onToggleSub}
              onEdit={t => { setModalTask(t); setShowModal(true) }} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-border bg-surface px-5 py-12 text-center">
          <p className="text-sub text-sm">No tasks found</p>
          <button onClick={() => { setModalTask(undefined); setShowModal(true) }}
            className="mt-3 text-sm text-accent font-semibold hover:underline">Create one →</button>
        </div>
      )}

      {showModal && (
        <TaskModal task={modalTask} onSave={onSave} onDelete={onDelete} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
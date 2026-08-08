"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  HiXMark, HiClock, HiTrash, HiChevronLeft, HiChevronRight,
  HiChevronDown, HiArrowRight, HiPlus,
} from "react-icons/hi2"
import { type Task, type Subtask, type Repeat } from "../tasks/TaskCard"
import { type Priority } from "../../lib/theme"
import { formatDueLabel } from "../../lib/dueDate"
import { uid } from "../../lib/id"
import Segmented from "../shared/Segmented"
import Stepper from "../shared/Stepper"

export interface Project { id: string; name: string; color: string }

interface TaskModalProps {
  task?: Task
  projects: Project[]
  onSave: (task: Task) => void
  onDelete?: (id: string) => void
  onClose: () => void
  onCreateProject: (p: Project) => void
  /** Session length, so the estimate can be stated in minutes rather than units. */
  focusMins?: number
  dark?: boolean
}

// "None" is not a rank, so it has no segment. A task still stores none — tapping
// the active priority clears it.
const PRIORITIES: Priority[] = ["high", "mid", "low"]
const LABELS: Record<Priority, string> = { high: "High", mid: "Mid", low: "Low", none: "None" }

const REPEAT_LABELS: Record<Repeat, string> = { none: "Never", daily: "Daily", weekly: "Weekly" }

const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#f97316", "#14b8a6",
]


function dayStr(offset: number) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function MiniCalendar({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const today = new Date()
  const [viewYear,  setViewYear]  = useState(selected ? new Date(selected).getFullYear()  : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected ? new Date(selected).getMonth()      : today.getMonth())

  const firstDay  = new Date(viewYear, viewMonth, 1).getDay()
  const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate()
  const monthName = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long", year: "numeric" })
  const cells     = Array.from({ length: firstDay + daysCount }, (_, i) => i < firstDay ? null : i - firstDay + 1)

  const fmt = (d: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`

  const prev = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }
  const next = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }

  return (
    <div className="rounded-control border border-border bg-surface2 p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prev} aria-label="Previous month"
          className="w-11 h-11 grid place-items-center rounded-control text-sub hover:text-tx transition-colors">
          <HiChevronLeft size={16} />
        </button>
        <span className="text-meta font-extrabold text-tx">{monthName}</span>
        <button onClick={next} aria-label="Next month"
          className="w-11 h-11 grid place-items-center rounded-control text-sub hover:text-tx transition-colors">
          <HiChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <span key={d} className="text-center text-caption font-semibold text-sub">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const ds = fmt(day)
          return (
            <button key={i} onClick={() => onSelect(ds)}
              className={`aspect-square rounded-control text-meta font-extrabold transition-colors duration-150
                ${ds === selected ? "bg-accent text-bg"
                  : ds === dayStr(0) ? "border border-accent text-accent"
                  : "text-tx hover:bg-surface"}`}>
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Lives in lib/dueDate now so lib/recurrence can use it without importing a
// component. Re-exported because several modules import it from here.
export { formatDueLabel }

/** One row of the "Project, repeat & subtasks" drawer: label, current value, chevron. */
function DetailRow({ label, value, open, onToggle, children }: {
  label: string; value: string; open: boolean; onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-border first:border-t-0">
      <button onClick={onToggle} aria-expanded={open}
        className="flex items-center gap-3 w-full min-h-13 text-left">
        <span className="flex-1 text-body text-tx">{label}</span>
        <span className="text-body font-extrabold text-tx truncate max-w-40">{value}</span>
        <HiChevronRight size={15} className="shrink-0 text-sub transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "none" }} />
      </button>
      {open && <div className="pb-3 flex flex-col gap-2">{children}</div>}
    </div>
  )
}

export default function TaskModal({
  task, projects, onSave, onDelete, onClose, onCreateProject, focusMins = 25, dark,
}: TaskModalProps) {
  const [title,             setTitle]             = useState(task?.title    ?? "")
  const [priority,          setPriority]          = useState<Priority>(task?.priority ?? "none")
  const [dueDate,           setDueDate]           = useState(task?.dueDate  ?? "")
  const [dueTime,           setDueTime]           = useState(task?.dueTime  ?? "")
  const [subtasks,          setSubtasks]          = useState<Subtask[]>(task?.subtasks ?? [])
  const [subInput,          setSubInput]          = useState("")
  const [showCal,           setShowCal]           = useState(false)
  const [estimatedSessions, setEstimatedSessions] = useState(task?.estimatedSessions ?? 0)
  const [projectId,         setProjectId]         = useState<string | undefined>(task?.projectId)
  const [repeat,            setRepeat]            = useState<Repeat>(task?.repeat ?? "none")

  const [newProjectName,  setNewProjectName]  = useState("")
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0])

  // Read once: a modal left open across midnight re-labelling its own buttons
  // would be stranger than one showing yesterday's "Today".
  const [{ today, tomorrow }] = useState(() => ({ today: dayStr(0), tomorrow: dayStr(1) }))

  // The drawer opens itself when a task already has something inside it.
  const [detailsOpen, setDetailsOpen] = useState(() =>
    !!task?.projectId || (!!task?.repeat && task.repeat !== "none") || (task?.subtasks.length ?? 0) > 0)
  const [openRow, setOpenRow] = useState<"project" | "repeat" | "subtasks" | null>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onClose])

  const addSub    = () => {
    if (!subInput.trim()) return
    setSubtasks(s => [...s, { id: uid(), title: subInput.trim(), done: false }])
    setSubInput("")
  }
  const removeSub = (id: string) => setSubtasks(s => s.filter(x => x.id !== id))

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return
    const p: Project = { id: uid(), name: newProjectName.trim(), color: newProjectColor }
    onCreateProject(p)
    setProjectId(p.id)
    setNewProjectName("")
  }

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      id: task?.id ?? uid(),
      title: title.trim(), priority, dueDate, dueTime,
      dueLabel: formatDueLabel(dueDate, dueTime),
      done: task?.done ?? false, subtasks,
      estimatedSessions, completedSessions: task?.completedSessions ?? 0,
      projectId, repeat, stage: task?.stage,
    })
  }

  const dueChoice = !dueDate ? (showCal ? "pick" : "")
    : dueDate === today ? "today"
    : dueDate === tomorrow ? "tomorrow"
    : "pick"

  const chooseDue = (v: string) => {
    if (v === "pick") { setShowCal(o => !o); return }
    const target = v === "today" ? today : tomorrow
    setShowCal(false)
    setDueDate(d => d === target ? "" : target)
    if (dueDate === target) setDueTime("")
  }

  const selectedProject = projects.find(p => p.id === projectId)

  return createPortal(
    <div className={dark ? "dark" : ""}>
      <div
        className="fixed inset-0 z-9999 flex items-end md:items-center justify-center p-3 xs:p-4 bg-black/70"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="w-full max-w-md panel bg-panel shadow-lg flex flex-col max-h-[92dvh] overflow-hidden">

          <header className="shrink-0 flex items-center gap-3 px-4 xs:px-5 py-3.5 border-b border-border">
            <h2 className="flex-1 text-title font-extrabold text-tx truncate">
              {task ? "Edit task" : "New task"}
            </h2>
            <button onClick={onClose} aria-label="Close"
              className="w-11 h-11 shrink-0 grid place-items-center rounded-control border border-border
                text-sub hover:text-tx hover:border-accent/40 transition-colors">
              <HiXMark size={17} />
            </button>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 xs:px-5 py-4 flex flex-col gap-5">

            {/* Headline type on an underline, not a boxed field: the underline
                turning accent is this input's focus indicator. */}
            <input value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSave() } }}
              placeholder="What needs doing?" autoFocus aria-label="Task title"
              className="focus-no-ring w-full bg-transparent border-b-2 border-border focus:border-accent
                pb-2 text-title font-extrabold text-tx placeholder:text-sub transition-colors" />

            <div className="flex flex-col gap-2">
              <span className="text-caption font-extrabold uppercase tracking-wider text-sub">Priority</span>
              <Segmented label="Priority" value={priority}
                onChange={p => setPriority(cur => cur === p ? "none" : p)}
                options={PRIORITIES.map(p => ({ value: p, label: LABELS[p] }))} />
            </div>

            <div className="flex items-center gap-3">
              <span className="flex-1 min-w-0">
                <span className="block text-caption font-extrabold uppercase tracking-wider text-sub">Sessions</span>
                <span className="block text-meta text-sub">
                  {estimatedSessions > 0
                    ? `≈ ${estimatedSessions * focusMins} min of focus`
                    : "No estimate"}
                </span>
              </span>
              <Stepper value={estimatedSessions} onChange={setEstimatedSessions}
                min={0} max={20} unit="sessions" />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-caption font-extrabold uppercase tracking-wider text-sub">Due</span>
              <Segmented label="Due date" value={dueChoice} onChange={chooseDue}
                options={[
                  { value: "today",    label: "Today"    },
                  { value: "tomorrow", label: "Tomorrow" },
                  { value: "pick",     label: "Pick a date" },
                ]} />
              {showCal && (
                <MiniCalendar selected={dueDate} onSelect={d => { setDueDate(d); setShowCal(false) }} />
              )}
              {dueDate && (
                <div className="flex items-center gap-3 min-h-13 px-4 rounded-control border border-border bg-surface2">
                  <HiClock size={15} className="text-sub shrink-0" />
                  <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                    aria-label="Due time"
                    className="flex-1 min-w-0 bg-transparent outline-none text-body text-tx" />
                  <button onClick={() => { setDueDate(""); setDueTime(""); setShowCal(false) }}
                    aria-label="Clear due date"
                    className="w-11 h-11 -mr-2 shrink-0 grid place-items-center text-sub hover:text-tx transition-colors">
                    <HiXMark size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Everything most tasks never touch, behind one disclosure. */}
            <div className="rounded-control border border-border px-4 pt-1 pb-1">
              <button onClick={() => setDetailsOpen(o => !o)} aria-expanded={detailsOpen}
                className="flex items-center gap-3 w-full min-h-13 text-left">
                <span className="flex-1 text-body font-extrabold text-tx">Project, repeat &amp; subtasks</span>
                <HiChevronDown size={15} className="shrink-0 text-sub transition-transform duration-200"
                  style={{ transform: detailsOpen ? "rotate(180deg)" : "none" }} />
              </button>

              {detailsOpen && (
                <div className="border-t border-border">
                  <DetailRow label="Project" value={selectedProject?.name ?? "None"}
                    open={openRow === "project"}
                    onToggle={() => setOpenRow(r => r === "project" ? null : "project")}>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setProjectId(undefined)}
                        className={`min-h-11 px-3 rounded-control text-meta font-extrabold border transition-colors
                          ${!projectId ? "border-accent text-accent bg-accent/10" : "border-border text-sub hover:border-accent/40"}`}>
                        None
                      </button>
                      {projects.map(p => (
                        <button key={p.id}
                          onClick={() => setProjectId(pid => pid === p.id ? undefined : p.id)}
                          className={`flex items-center gap-1.5 min-h-11 px-3 rounded-control text-meta font-extrabold border transition-colors
                            ${projectId === p.id ? "border-transparent text-white" : "border-border text-sub hover:border-accent/40"}`}
                          style={projectId === p.id ? { background: p.color, borderColor: p.color } : {}}>
                          <span className="w-2 h-2 rounded-pill shrink-0" style={{ background: p.color }} />
                          {p.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleCreateProject() } }}
                        placeholder="New project…" aria-label="New project name"
                        className="flex-1 min-w-0 min-h-11 px-3 rounded-control border border-border bg-surface2
                          text-body text-tx placeholder:text-sub outline-none focus:border-accent transition-colors" />
                      <button onClick={handleCreateProject} disabled={!newProjectName.trim()}
                        aria-label="Create project"
                        className="w-11 h-11 shrink-0 grid place-items-center rounded-control bg-accent text-bg
                          disabled:opacity-30 transition-opacity">
                        <HiPlus size={16} />
                      </button>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {PROJECT_COLORS.map(c => (
                        <button key={c} onClick={() => setNewProjectColor(c)}
                          aria-label={`Colour ${c}`}
                          className="w-6 h-6 rounded-pill transition-transform hover:scale-110"
                          style={{
                            background: c,
                            outline: newProjectColor === c ? `2px solid ${c}` : "none",
                            outlineOffset: "2px",
                          }} />
                      ))}
                    </div>
                  </DetailRow>

                  <DetailRow label="Repeat" value={REPEAT_LABELS[repeat]}
                    open={openRow === "repeat"}
                    onToggle={() => setOpenRow(r => r === "repeat" ? null : "repeat")}>
                    <Segmented label="Repeat" value={repeat} onChange={setRepeat}
                      options={(["none", "daily", "weekly"] as Repeat[])
                        .map(r => ({ value: r, label: REPEAT_LABELS[r] }))} />
                  </DetailRow>

                  <DetailRow label="Subtasks"
                    value={subtasks.length > 0 ? String(subtasks.length) : "Add"}
                    open={openRow === "subtasks"}
                    onToggle={() => setOpenRow(r => r === "subtasks" ? null : "subtasks")}>
                    {subtasks.map(sub => (
                      <div key={sub.id} className="flex items-center gap-2 min-h-11 px-3 rounded-control border border-border bg-surface2">
                        <span className="flex-1 min-w-0 text-body text-tx truncate">{sub.title}</span>
                        <button onClick={() => removeSub(sub.id)}
                          aria-label={`Remove subtask "${sub.title}"`}
                          className="w-11 h-11 -mr-2 shrink-0 grid place-items-center text-sub hover:text-priority-high transition-colors">
                          <HiXMark size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input value={subInput} onChange={e => setSubInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSub() } }}
                        placeholder="Add a subtask…" aria-label="New subtask"
                        className="flex-1 min-w-0 min-h-11 px-3 rounded-control border border-border bg-surface2
                          text-body text-tx placeholder:text-sub outline-none focus:border-accent transition-colors" />
                      <button onClick={addSub} disabled={!subInput.trim()} aria-label="Add subtask"
                        className="w-11 h-11 shrink-0 grid place-items-center rounded-control bg-accent text-bg
                          disabled:opacity-30 transition-opacity">
                        <HiPlus size={16} />
                      </button>
                    </div>
                  </DetailRow>
                </div>
              )}
            </div>
          </div>

          <footer className="shrink-0 flex items-center gap-2 px-4 xs:px-5 py-3.5 border-t border-border">
            {onDelete && task && (
              <button onClick={e => { e.stopPropagation(); onDelete(task.id); onClose() }}
                aria-label="Delete task"
                className="w-13 h-13 shrink-0 grid place-items-center rounded-control border border-priority-high/40
                  text-priority-high hover:bg-priority-high/10 transition-colors">
                <HiTrash size={16} />
              </button>
            )}
            <button onClick={onClose}
              className="min-h-13 px-4 xs:px-5 shrink-0 rounded-control border border-border
                text-body font-extrabold text-tx hover:border-accent/40 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!title.trim()}
              className="flex-1 min-w-0 min-h-13 flex items-center justify-center gap-2 px-3 rounded-control
                bg-accent text-bg text-body font-extrabold whitespace-nowrap
                hover:bg-accent-hover disabled:opacity-40 transition-all">
              {task ? "Save task" : "Add task"}
              <HiArrowRight size={16} className="shrink-0" />
            </button>
          </footer>

        </div>
      </div>
    </div>,
    document.body
  )
}

"use client"

import { useState, useEffect } from "react"
import { useIsTablet } from "../hooks/useMediaQuery"
import TaskModal from "./tasks/TaskModal"
import { type Task } from "./tasks/TaskCard"
import { HiHome, HiOutlineHome, HiClipboardList, HiOutlineClipboardList, HiClock, HiOutlineClock, HiCog, HiOutlineCog } from "react-icons/hi"
import { HiPlus } from "react-icons/hi2"

type Tab   = "home" | "tasks" | "timer" | "settings"
type Phase = "focus" | "break" | "longbreak"

interface AppShellProps {
  children:    React.ReactNode
  activeTab:   Tab
  onTabChange: (tab: Tab) => void
  dark:        boolean
  userName:    string
  streak:      number
  running:     boolean
  phase:       Phase
  avatarUrl?:  string
  onAddTask:   (task: Task) => void
}

const NAV: { id: Tab; label: string }[] = [
  { id: "home",     label: "Home"     },
  { id: "tasks",    label: "Tasks"    },
  { id: "timer",    label: "Timer"    },
  { id: "settings", label: "Settings" },
]

function NavIcon({ id, active }: { id: Tab; active: boolean }) {
  const sz = 20
  switch (id) {
    case "home":     return active ? <HiHome size={sz} />          : <HiOutlineHome size={sz} />
    case "tasks":    return active ? <HiClipboardList size={sz} /> : <HiOutlineClipboardList size={sz} />
    case "timer":    return active ? <HiClock size={sz} />         : <HiOutlineClock size={sz} />
    case "settings": return active ? <HiCog size={sz} />           : <HiOutlineCog size={sz} />
  }
}

export default function AppShell({
  children, activeTab, onTabChange, dark,
  userName, streak, running, phase, avatarUrl, onAddTask,
}: AppShellProps) {
  const isTablet = useIsTablet()
  const initials = userName ? userName.slice(0, 2).toUpperCase() : "–"
  const [mounted, setMounted] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  useEffect(() => { setTimeout(() => setMounted(true), 50) }, [])

  const dotColor   = phase === "focus" ? "bg-accent" : "bg-priority-low"
  const statusText = phase === "focus" ? "Focusing" : "Resting"
  const statusCls  = phase === "focus" ? "bg-accent/10 text-accent border-accent/20" : "bg-priority-low/10 text-priority-low border-priority-low/20"

  const AvatarEl = ({ size = 32 }: { size?: number }) => (
    <div style={{ width: size, height: size }}
      className={`rounded-xl overflow-hidden shrink-0 border-2 transition-colors duration-300
        ${running ? (phase === "focus" ? "border-accent" : "border-priority-low") : "border-border"}`}>
      {avatarUrl
        ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
        : <div className="w-full h-full bg-surface2 flex items-center justify-center text-sub font-black"
            style={{ fontSize: size * 0.3 }}>
            {initials}
          </div>
      }
    </div>
  )

  const MobileNavBtn = ({ id, label }: { id: Tab; label: string }) => {
    const active  = activeTab === id
    const isMe    = id === "settings"
    return (
      <button onClick={() => onTabChange(id)}
        className={`relative flex flex-col items-center justify-center rounded-2xl gap-0.5 select-none
          transition-all duration-200
          ${active ? "bg-surface2 text-white px-5 py-2" : "text-sub hover:text-tx px-5 py-2"}`}>
        {isMe
          ? <div className={`w-5 h-5 rounded-lg overflow-hidden border transition-colors
              ${active ? "border-white/30" : "border-border"}`}>
              {avatarUrl
                ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                : <div className={`w-full h-full flex items-center justify-center font-black text-[8px]
                    ${active ? "bg-white/20 text-white" : "bg-surface2 text-sub"}`}>
                    {initials}
                  </div>
              }
            </div>
          : <NavIcon id={id} active={active} />
        }
        <span className="font-semibold leading-none text-[9px]">{isMe ? "Me" : label}</span>
        {id === "timer" && running && (
          <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${dotColor}`} />
        )}
      </button>
    )
  }

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-dvh bg-bg text-tx flex flex-col">

        {isTablet && (
          <header className={`fixed top-0 inset-x-0 z-50 h-14 bg-surface/90 backdrop-blur-xl border-b border-border
            flex items-center px-6 gap-6 transition-all duration-500
            ${mounted ? "opacity-100" : "opacity-0"}`}>

            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                <HiClock size={14} color="white" />
              </div>
              <span className="font-black text-sm tracking-tight text-tx">Todoro</span>
            </div>

            <nav className="flex-1 flex justify-center">
              <div className="flex items-center gap-1 rounded-2xl p-2">
                {NAV.map(({ id, label }) => {
                  const active = activeTab === id
                  return (
                    <button key={id} onClick={() => onTabChange(id)}
                      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                        transition-all duration-200 select-none
                        ${active ? "bg-surface2 text-white" : "text-sub hover:text-tx hover:bg-surface"}`}>
                      <NavIcon id={id} active={active} />
                      {label}
                      {id === "timer" && running && (
                        <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-surface2 ${dotColor}`} />
                      )}
                    </button>
                  )
                })}
              </div>
            </nav>

            <div className="flex items-center gap-3 shrink-0">
              {running && (
                <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${statusCls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
                  {statusText}
                </div>
              )}
              <button onClick={() => onTabChange("settings")}
                className="flex items-center gap-2.5 transition-opacity hover:opacity-75">
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-xs font-bold text-tx leading-none">{userName}</span>
                  <span className="text-[10px] text-sub">{streak} day streak</span>
                </div>
                <AvatarEl size={32} />
              </button>
            </div>
          </header>
        )}

        <main className={`flex-1 overflow-y-auto ${isTablet ? "pt-14" : "pb-32"}`}>
          <div className="w-full max-w-4xl mx-auto px-4 md:px-8 py-6">
            {children}
          </div>
        </main>

        {!isTablet && (
          <div className={`fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none
            transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="pointer-events-auto flex items-center bg-surface/95 backdrop-blur-xl border border-border rounded-3xl p-2">

              <nav className="flex items-center">
                {NAV.slice(0, 2).map(({ id, label }) => <MobileNavBtn key={id} id={id} label={label} />)}
              </nav>

              <button onClick={() => setShowAdd(true)}
                className="w-10 h-10 mx-2 rounded-2xl border-2 border-accent text-white flex items-center justify-center
                  active:scale-95 transition-all duration-150 hover:border-accent-hover">
                <HiPlus size={24} />
              </button>

              <nav className="flex items-center">
                {NAV.slice(2).map(({ id, label }) => <MobileNavBtn key={id} id={id} label={label} />)}
              </nav>

            </div>
          </div>
        )}

        {showAdd && (
          <TaskModal
            onSave={task => { onAddTask(task); setShowAdd(false) }}
            onClose={() => setShowAdd(false)} />
        )}

      </div>
    </div>
  )
}